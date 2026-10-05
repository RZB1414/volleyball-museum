/**
 * `migrateProgress` as L1 shipped it, frozen.
 *
 * From L2 on a save has to stay readable by the build before it: a player
 * with two tabs open, or a rollback, hands today's save to yesterday's code.
 * The only honest way to prove "the code of L1 loses nothing it knows" is to
 * run the code of L1, so here it is, and `npm run test:save` feeds it what
 * this build writes.
 *
 * A literal copy of `src/state/store.ts` at f0fb5a3 (the build Cloudflare
 * serves as 1d3a4554), cut from `git show f0fb5a3:src/state/store.ts`:
 * lines 57-107 (the types), 118-149 (the radio memory), 164-200 (the empty
 * save), 204-281 (the lists and `migrateProgress`) and 481-484
 * (`withValue`). Left out of that span: the settings and the `Persisted`
 * type, which no line here reads. The three things those lines imported are
 * written in below, with the values they had in that commit.
 *
 * Never edited. Its hash is pinned in `scripts/test-save.ts`; a later lot
 * adds its own frozen file beside this one instead of touching it.
 */

// `SPAWN.room` (src/content/spawn.ts), `PRE_OPENING_SAVE`
// (src/content/legacySave.ts) and `SAVE_VERSION` (store.ts:33), at f0fb5a3.
const SPAWN = { room: 'office' } as const
const PRE_OPENING_SAVE = {
  journalDocumentId: 'doc-welcome',
  firstCallId: 'porter-first-call',
  firstCallOverOncePowered: 'atrium',
  journalHintId: 'journal-taken',
} as const
const SAVE_VERSION = 1

// --- store.ts:57-107 --------------------------------------------------------
export type Progress = {
  version: number
  /** Exhibit ids fully catalogued — every required hotspot examined. */
  catalogued: string[]
  /** Hotspot keys seen, as `${exhibitId}:${hotspotId}`. */
  hotspots: string[]
  documentsRead: string[]
  factsKnown: string[]
  credentials: string[]
  roomsVisited: string[]
  roomsPowered: string[]
  locksOpened: string[]
  /** Radio calls heard to their last line; each one plays exactly once. */
  radioCalls: string[]
  /**
   * Seconds each mains clock has run since its power came back, by device id.
   * Elapsed play time rather than a wall-clock instant: a clock that caught
   * up on the two days a player was away would break "it resumes from where
   * it stopped".
   */
  clockSeconds: Record<string, number>
  /** One-off teaching toasts already shown, so a reload never repeats one. */
  hintsShown: string[]
  /** Devices that left their furniture with the player (the porter's radio). */
  devicesCarried: string[]
  /** How each radio's voice feels about being called, by device id. */
  radioMemory: Record<string, RadioMemory>
  lastRoom: string
}

/**
 * What a radio's voice remembers of the player's calls.
 *
 * Persisted on purpose: a porter who forgot every insult on reload would make
 * F5 the cure for his temper. Times are wall-clock epoch milliseconds because
 * calming down is something real minutes do, not frames of play.
 */
export type RadioMemory = {
  /** Every call he answered, ever; dead air and content calls not included. */
  readonly calls: number
  /** Calls since he last calmed down, which picks his tier. */
  readonly temper: number
  /** Epoch ms of the last answered call; 0 is never. */
  readonly lastCallAt: number
  /** The hint he gave last time, -1 for none: a different one is progress. */
  readonly lastHint: number
  /** The last opener or outburst, so no joke is told twice in a row. */
  readonly lastReplyId: string | null
  /** The last outburst, so the next one is a different tantrum. */
  readonly lastOutburstId: string | null
}

// --- store.ts:118-149 -------------------------------------------------------
const wholeAtLeast = (value: unknown, minimum: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum ? Math.floor(value) : null
const idOrNull = (value: unknown) => (typeof value === 'string' ? value : null)

/**
 * A radio memory from the save, or nothing for a radio whose entry is junk.
 *
 * Dropping only the broken entry rather than the whole record: a corrupted
 * number must cost the player at most one porter's good mood.
 */
export function sanitiseRadioMemory(raw: unknown): Record<string, RadioMemory> {
  const memory: Record<string, RadioMemory> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return memory
  for (const [deviceId, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue
    const saved = entry as Partial<Record<keyof RadioMemory, unknown>>
    const calls = wholeAtLeast(saved.calls, 0)
    const temper = wholeAtLeast(saved.temper, 0)
    const lastCallAt = wholeAtLeast(saved.lastCallAt, 0)
    const lastHint = wholeAtLeast(saved.lastHint, -1)
    if (calls === null || temper === null || lastCallAt === null || lastHint === null) continue
    memory[deviceId] = {
      calls,
      temper,
      lastCallAt,
      lastHint,
      lastReplyId: idOrNull(saved.lastReplyId),
      lastOutburstId: idOrNull(saved.lastOutburstId),
    }
  }
  return memory
}

// --- store.ts:164-200 -------------------------------------------------------
const EMPTY_PROGRESS: Progress = {
  version: SAVE_VERSION,
  catalogued: [],
  hotspots: [],
  documentsRead: [],
  factsKnown: [],
  credentials: [],
  roomsVisited: [],
  roomsPowered: [],
  locksOpened: [],
  radioCalls: [],
  clockSeconds: {},
  hintsShown: [],
  devicesCarried: [],
  radioMemory: {},
  lastRoom: SPAWN.room,
}

/** A fresh copy, so a new game never shares a list with the constant. */
function emptyProgress(): Progress {
  return {
    ...EMPTY_PROGRESS,
    catalogued: [],
    hotspots: [],
    documentsRead: [],
    factsKnown: [],
    credentials: [],
    roomsVisited: [],
    roomsPowered: [],
    locksOpened: [],
    radioCalls: [],
    clockSeconds: {},
    hintsShown: [],
    devicesCarried: [],
    radioMemory: {},
  }
}

// --- store.ts:204-281 -------------------------------------------------------
const LIST_FIELDS = [
  'catalogued',
  'hotspots',
  'documentsRead',
  'factsKnown',
  'credentials',
  'roomsVisited',
  'roomsPowered',
  'locksOpened',
  'radioCalls',
  'hintsShown',
  'devicesCarried',
] as const satisfies readonly (keyof Progress)[]

function stringList(value: unknown): string[] | null {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null
}

/**
 * Turns whatever the save holds into a valid Progress.
 *
 * A save from another version is discarded rather than migrated: losing a
 * partial playthrough of a portfolio museum is a far smaller cost than a crash
 * on load. Within the version, every field is checked rather than trusted,
 * and a save written before the opening scene existed (it has no `radioCalls`)
 * is brought forward instead of being replayed against a story it predates.
 */
export function migrateProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object') return emptyProgress()
  const saved = raw as Partial<Record<keyof Progress, unknown>>
  if (saved.version !== SAVE_VERSION) return emptyProgress()

  const progress = emptyProgress()
  for (const field of LIST_FIELDS) progress[field] = stringList(saved[field]) ?? progress[field]
  if (typeof saved.lastRoom === 'string') progress.lastRoom = saved.lastRoom
  if (saved.clockSeconds && typeof saved.clockSeconds === 'object') {
    for (const [clockId, seconds] of Object.entries(saved.clockSeconds)) {
      if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0) {
        progress.clockSeconds[clockId] = seconds
      }
    }
  }
  // A save from before the radio could be carried has no memory and holds
  // nothing: its radio waits on the desk for the next E, like a new game's.
  progress.radioMemory = sanitiseRadioMemory(saved.radioMemory)

  if (!('radioCalls' in saved)) {
    // The porter's first call names the atrium's breaker as the next step;
    // with the atrium already lit, that call is history, not news.
    if (progress.roomsPowered.includes(PRE_OPENING_SAVE.firstCallOverOncePowered)) {
      progress.radioCalls = withValue(progress.radioCalls, PRE_OPENING_SAVE.firstCallId)
    }
    // A returning player already used the journal: keep it, rather than lock
    // their catalogue away behind a notebook they never saw on the desk.
    const played =
      progress.catalogued.length > 0 ||
      progress.hotspots.length > 0 ||
      progress.documentsRead.length > 0 ||
      progress.factsKnown.length > 0 ||
      progress.credentials.length > 0 ||
      progress.roomsPowered.length > 0 ||
      progress.locksOpened.length > 0
    if (played) {
      progress.documentsRead = withValue(progress.documentsRead, PRE_OPENING_SAVE.journalDocumentId)
    }
  }
  // A save without the flag list predates it, so its notebook — taken in an
  // earlier session, or just granted above — was never announced through it.
  // Announcing it on this Continue would tell the player they took something
  // just now, before they have touched anything.
  if (
    stringList(saved.hintsShown) === null &&
    progress.documentsRead.includes(PRE_OPENING_SAVE.journalDocumentId)
  ) {
    progress.hintsShown = withValue(progress.hintsShown, PRE_OPENING_SAVE.journalHintId)
  }
  return progress
}

// --- store.ts:481-484 -------------------------------------------------------
/** Appends to a string array only when the value is new. */
function withValue(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value]
}
