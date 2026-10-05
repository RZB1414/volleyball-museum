/**
 * What a save holds, as one table.
 *
 * A field of the save used to be written in five places (the type, the empty
 * save, its fresh copy, the list the loader walked and the question "is there
 * anything to erase"), and leaving one out erased the field on load without
 * an error anywhere. Here a field is a line of the type and a row of
 * `PROGRESS_FIELDS`, and the compiler refuses one without the other.
 *
 * Four rules, each held by `npm run test:save`:
 *
 *   1. A field this build does not know stays in the save. Another tab may be
 *      running a later lot, and what it wrote is not this build's to drop.
 *   2. A field never changes type. A new meaning is a new field: that is what
 *      lets the build before this one read a save written by this one.
 *   3. Nothing shrinks. Loading, migrating and playing only add; "New game"
 *      is the one thing that erases.
 *   4. `contentLot` never goes down.
 *
 * The same four hold between two tabs. A tab that finds on the disk a save it
 * did not write joins it with its own (`joinProgress`), field by field, by
 * the rule each field carries in the table. Every rule but one brings two
 * tabs to the same value; the one that does not (`lastRoom`) is named in
 * `withTabsOwn`, which is what lets them stop writing.
 *
 * Imports the spawn and the lot and nothing else: the store is on the title
 * screen, and the content set must not follow it there.
 */

import { CONTENT_LOT } from '../content/contentLot.ts'
import { SPAWN } from '../content/spawn.ts'

/**
 * Never raised. A save of another version is not read at all
 * (`saveMigrations.ts`), so raising this starts every player over, which is
 * the one thing a save exists to prevent. No build has written another
 * version, and none will: what changes from lot to lot is `contentLot`, and a
 * lot that needs to repair old saves writes a migration.
 */
export const SAVE_VERSION = 1

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
  /**
   * How far up that hint he has gone: 0 where it is, 1 what it looks like,
   * 2 how it is worked. Asked again about the same thing he says the next
   * height, and a different hint starts from where.
   */
  readonly hintHeight: number
  /** The last opener or outburst, so no joke is told twice in a row. */
  readonly lastReplyId: string | null
  /** The last outburst, so the next one is a different tantrum. */
  readonly lastOutburstId: string | null
}

export const FRESH_RADIO_MEMORY: RadioMemory = {
  calls: 0,
  temper: 0,
  lastCallAt: 0,
  lastHint: -1,
  hintHeight: 0,
  lastReplyId: null,
  lastOutburstId: null,
}

export type Progress = {
  version: number
  /**
   * The lot of the build that last wrote this save, which only grows. A save
   * without it was written before the field existed: that is lot 1.
   */
  contentLot: number
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
  /**
   * Locks the player has touched, open or not: what the plan may name. Every
   * opened lock is in here too.
   */
  locksSeen: string[]
  /**
   * Doors that opened from one side only and have been opened from it: from
   * then on they open from both. The id is the physical door's, which is the
   * portal that declares the leaf, not the portal facing it.
   */
  doorsReleased: string[]
  /** Story flags, set by triggers and by migrations. */
  flags: string[]
  /**
   * Triggers that have fired; each fires once. An id the content no longer
   * has, or does not have yet, stays: it is another build's record.
   */
  triggersFired: string[]
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

/** The fields of the save that are lists of ids: the ones play adds to. */
export type ListField = {
  [K in keyof Progress]: Progress[K] extends string[] ? K : never
}[keyof Progress]

/** What a verb of the player adds to the save. Lists only: progress grows. */
export type ProgressGrant = { readonly [K in ListField]?: readonly string[] }

type FieldSpec<T> = {
  /** A fresh default, so no two saves share a list. */
  readonly fresh: () => T
  /** A valid value out of whatever the save holds; null when it holds none. */
  readonly read: (raw: unknown) => T | null
  /** Whether a non-empty value is something "New game" would erase. */
  readonly counts: boolean
  /**
   * One value out of two copies of the same save: what another tab left on
   * the disk, with what this tab holds added to it. Never less than either,
   * and it writes into neither.
   */
  readonly join: (disk: T, tab: T) => T
}

const wholeAtLeast = (value: unknown, minimum: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum ? Math.floor(value) : null
const idOrNull = (value: unknown) => (typeof value === 'string' ? value : null)
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** The strings of a list, in order; null for anything that is not a list. */
export function stringList(value: unknown): string[] | null {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null
}

/** Appends to a string array only when the value is new. */
export function withValue(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value]
}

/**
 * A radio memory from the save, or nothing for a radio whose entry is junk.
 *
 * Dropping only the broken entry rather than the whole record: a corrupted
 * number must cost the player at most one porter's good mood. What a valid
 * entry carries beyond the fields this build knows is kept, as in the save
 * itself.
 *
 * Built with `fromEntries` and never by assignment: the ids come out of the
 * save, and assigning to a key called `__proto__` would change what the
 * record inherits from instead of adding to it.
 */
export function sanitiseRadioMemory(raw: unknown): Record<string, RadioMemory> {
  if (!isRecord(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw).flatMap(([deviceId, entry]): [string, RadioMemory][] => {
      if (!entry || typeof entry !== 'object') return []
      const saved = entry as Partial<Record<keyof RadioMemory, unknown>>
      const calls = wholeAtLeast(saved.calls, 0)
      const temper = wholeAtLeast(saved.temper, 0)
      const lastCallAt = wholeAtLeast(saved.lastCallAt, 0)
      const lastHint = wholeAtLeast(saved.lastHint, -1)
      if (calls === null || temper === null || lastCallAt === null || lastHint === null) return []
      const memory = {
        ...saved,
        calls,
        temper,
        lastCallAt,
        lastHint,
        // Absent in every save from before the hint had heights, and junk in
        // a damaged one: either way he starts the hint from where. Not one
        // of the numbers that cost the entry, or a porter three lots old
        // would forget his temper the day this field arrived.
        hintHeight: wholeAtLeast(saved.hintHeight, 0) ?? 0,
        lastReplyId: idOrNull(saved.lastReplyId),
        lastOutburstId: idOrNull(saved.lastOutburstId),
      }
      return [[deviceId, memory]]
    }),
  )
}

/** Each clock's finite, non-negative seconds; anything else is dropped alone. */
function clockSeconds(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0,
    ),
  )
}

/**
 * Two copies of a record, key by key: the disk's entries in the disk's order,
 * then the ones only the tab has. Spread and `fromEntries`, never assignment,
 * for the reason given at `sanitiseRadioMemory`.
 */
function joinRecords<T>(disk: Record<string, T>, tab: Record<string, T>, both: (disk: T, tab: T) => T): Record<string, T> {
  return {
    ...disk,
    ...Object.fromEntries(
      Object.entries(tab).map(([key, value]) => [key, Object.hasOwn(disk, key) ? both(disk[key], value) : value]),
    ),
  }
}

const RADIO_MEMORY_FIELDS = Object.keys(FRESH_RADIO_MEMORY) as (keyof RadioMemory)[]

/**
 * The porter remembers the call that came last, whichever tab placed it.
 *
 * Whole, and not number by number: his temper after the later call already
 * counts the earlier one, if it was there to count. What a later build keeps
 * inside the entry is the disk's even when the call is this tab's: this tab
 * never writes those, so its copy of them is never the newer one.
 */
function laterCall(disk: RadioMemory, tab: RadioMemory): RadioMemory {
  if (tab.lastCallAt <= disk.lastCallAt) return disk
  return { ...tab, ...disk, ...Object.fromEntries(RADIO_MEMORY_FIELDS.map((field) => [field, tab[field]])) }
}

const idList = {
  fresh: (): string[] => [],
  read: stringList,
  join: (disk: string[], tab: string[]) => tab.reduce(withValue, disk),
}

/**
 * Every field of the save but the version, which is the gate and not a field:
 * read first, written as `SAVE_VERSION`.
 *
 * `counts` is the title screen's question: would "New game" erase something
 * worth asking about? A lesson already shown, a clock's time and a porter's
 * mood are kept for the player's comfort, not earned.
 */
export const PROGRESS_FIELDS = {
  contentLot: {
    // A new game is this build's. A save that does not say, or says junk, is
    // production's from before the field existed: lot 1, whatever lot this is,
    // so that no migration mistakes it for a save already brought forward.
    fresh: () => CONTENT_LOT,
    read: (raw) => (Number.isInteger(raw) && (raw as number) >= 1 ? (raw as number) : 1),
    counts: false,
    // Rule 4, between tabs: a tab of the build before must not stamp down
    // what a tab of the build after wrote.
    join: Math.max,
  },
  catalogued: { ...idList, counts: true },
  hotspots: { ...idList, counts: true },
  documentsRead: { ...idList, counts: true },
  factsKnown: { ...idList, counts: true },
  credentials: { ...idList, counts: true },
  // Its own rule, in `hasSavedProgress`: the room every session starts in is
  // visited by clicking "Enter", which is not progress.
  roomsVisited: { ...idList, counts: false },
  roomsPowered: { ...idList, counts: true },
  locksOpened: { ...idList, counts: true },
  locksSeen: { ...idList, counts: true },
  // No migration fills this in: no save from before it proves the player left
  // by a shortcut, so every one of them loads with the bar still on.
  doorsReleased: { ...idList, counts: true },
  flags: { ...idList, counts: true },
  // The bookkeeping of what already happened, not something that happened.
  triggersFired: { ...idList, counts: false },
  radioCalls: { ...idList, counts: true },
  clockSeconds: {
    fresh: (): Record<string, number> => ({}),
    read: clockSeconds,
    counts: false,
    // A clock does not run backwards: the longer of the two times.
    join: (disk, tab) => joinRecords(disk, tab, Math.max),
  },
  hintsShown: { ...idList, counts: false },
  devicesCarried: { ...idList, counts: true },
  // A save from before the radio could be carried has no memory and holds
  // nothing: its radio waits on the desk for the next E, like a new game's.
  radioMemory: {
    fresh: (): Record<string, RadioMemory> => ({}),
    read: sanitiseRadioMemory,
    counts: false,
    join: (disk, tab) => joinRecords(disk, tab, laterCall),
  },
  lastRoom: {
    fresh: (): string => SPAWN.room,
    read: (raw) => (typeof raw === 'string' ? raw : null),
    counts: false,
    // Where a tab's player stands is that tab's to say. The one rule here
    // that leaves two tabs holding different saves: see `withTabsOwn`.
    join: (_disk, tab) => tab,
  },
} satisfies {
  readonly [K in Exclude<keyof Progress, 'version'>]: FieldSpec<Progress[K]>
}

const FIELDS = Object.entries(PROGRESS_FIELDS)
const COUNTED = FIELDS.flatMap(([field, spec]) => (spec.counts ? [field as keyof typeof PROGRESS_FIELDS] : []))

/** A new game. A fresh copy every time, so no two saves share a list. */
export function emptyProgress(): Progress {
  const progress: Record<string, unknown> = { version: SAVE_VERSION }
  for (const [field, spec] of FIELDS) progress[field] = spec.fresh()
  return progress as Progress
}

export const EMPTY_PROGRESS: Progress = /* @__PURE__ */ emptyProgress()

/**
 * A valid save out of whatever the storage held, field by field from the
 * table: what is valid in a field is kept, and a field with nothing valid
 * gets its default.
 *
 * Every key the table does not know is carried over untouched. It is carried
 * by spreading and never by assigning key by key: a tampered save can hold a
 * key called `__proto__`, and that has to stay a piece of data.
 */
export function sanitiseProgress(raw: Readonly<Record<string, unknown>>): Progress {
  const known: Record<string, unknown> = {}
  for (const [field, spec] of FIELDS) known[field] = spec.read(raw[field]) ?? spec.fresh()
  return { ...raw, ...known, version: SAVE_VERSION } as Progress
}

/**
 * One save out of two copies of it: what another tab left on the disk, with
 * what this tab holds added.
 *
 * Each field the table knows is joined by its own rule. A field it does not
 * know is the disk's: this build never writes one, so the copy this tab
 * loaded can only be the older of the two. The tab's copy is kept where the
 * disk has none, which is what a tab of an earlier build leaves behind when
 * it rewrites the save from the fields it knows.
 *
 * In the disk's order, so that a tab with nothing to add ends up holding the
 * very text that is on the disk, and has nothing to write.
 */
export function joinProgress(disk: Progress, tab: Progress): Progress {
  const onlyInTab = Object.fromEntries(Object.entries(tab).filter(([field]) => !Object.hasOwn(disk, field)))
  const known = Object.fromEntries(
    FIELDS.map(([field, spec]) => {
      const name = field as keyof typeof PROGRESS_FIELDS
      return [field, (spec.join as (disk: unknown, tab: unknown) => unknown)(disk[name], tab[name])]
    }),
  )
  return { ...disk, ...onlyInTab, ...known, version: SAVE_VERSION } as Progress
}

/**
 * The disk's copy as a tab with nothing to add to it holds it: the same
 * save, standing where that tab stands.
 *
 * A tab knows it has something to write by holding another save than the one
 * it last saw on the disk. Asked against the disk's copy as it is, two tabs
 * in two rooms always had: each found the other's room there, took its own
 * for something new, wrote it, and woke the other to do the same, for as
 * long as both were open. So at the moment a tab reads another tab's write,
 * where it stands is not news. A door it crosses afterwards is still a write
 * of its own; one crossed in the very breath of that read goes to the disk
 * with the next thing the tab writes, and nothing reads `lastRoom` back in
 * the meantime (every session starts at the spawn).
 *
 * A field whose rule in the table is "the tab's" belongs here, by name. One
 * left out brings the two tabs back to writing at each other, and `npm run
 * test:save` runs three tabs that differ in every field to say so.
 */
export function withTabsOwn(disk: Progress, tab: Progress): Progress {
  return { ...disk, lastRoom: tab.lastRoom }
}

/** The save with the grant added; the same object when it adds nothing. */
export function grantProgress(progress: Progress, grant: ProgressGrant): Progress {
  let next = progress
  for (const [field, values] of Object.entries(grant) as [ListField, readonly string[]][]) {
    const list = values.reduce(withValue, next[field])
    if (list !== next[field]) next = { ...next, [field]: list }
  }
  return next
}

/**
 * Whether the save holds anything a new game would erase.
 *
 * Walking around the spawn room is not progress: offering "New game" to a
 * player who only clicked "Enter" once would be a button that erases nothing.
 */
export function hasSavedProgress(progress: Progress) {
  return (
    progress.roomsVisited.some((room) => room !== SPAWN.room) ||
    COUNTED.some((field) => Object.keys(progress[field]).length > 0)
  )
}
