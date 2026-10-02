/**
 * Runtime state.
 *
 * The Rapier prototype used a separate store. It was removed in 5e51e24; this
 * is now the only persisted runtime state.
 *
 * Three slices, deliberately kept apart:
 *   - settings   what the player chose. Persisted, and the accessibility
 *                defaults matter more than the graphics ones.
 *   - session    transient per-frame input and UI state. Never persisted.
 *   - progress   what the player has found. Persisted, versioned, and able to
 *                survive content ids being renamed or deleted.
 */

import { create } from 'zustand'

import type { UnlockEffect } from '../content/schema'
// The spawn and legacy-save modules have no runtime imports, so naming the
// start room and the migration ids here does not pull the content set into
// the title screen's bundle.
import { PRE_OPENING_SAVE } from '../content/legacySave.ts'
import { SPAWN } from '../content/spawn.ts'

export type Locale = 'pt-BR' | 'en'
export type QualityTier = 'low' | 'medium' | 'high'

const STORAGE_KEY = 'volleyball-museum:v1'
/**
 * Bumped whenever the persisted shape changes incompatibly. A save that
 * references a deleted exhibit must degrade, not crash — content ids WILL
 * change while six wings are being built.
 */
const SAVE_VERSION = 1

export type Settings = {
  locale: Locale
  quality: QualityTier
  /** 0.5 to 1.8. The whole progression language is "unlit", which is
   *  unreadable on a phone in daylight without this. */
  brightness: number
  /**
   * Head bob and the field-of-view push are the two biggest vestibular
   * triggers in a first-person walking game, and they are exactly what the
   * embodiment advice recommends. Both default OFF: a player who wants the
   * extra presence can switch it on, a player who gets motion sick from it
   * should never have to discover that the hard way.
   */
  headBob: boolean
  fovPush: boolean
  moveSpeed: number
  lookSensitivity: number
  touchLookSensitivity: number
  touchMoveSensitivity: number
  subtitles: boolean
}

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

export const FRESH_RADIO_MEMORY: RadioMemory = {
  calls: 0,
  temper: 0,
  lastCallAt: 0,
  lastHint: -1,
  lastReplyId: null,
  lastOutburstId: null,
}

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

const DEFAULT_SETTINGS: Settings = {
  locale: 'pt-BR',
  quality: 'medium',
  brightness: 1,
  headBob: false,
  fovPush: false,
  moveSpeed: 1,
  lookSensitivity: 1,
  touchLookSensitivity: 1,
  touchMoveSensitivity: 1,
  subtitles: true,
}

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

type Persisted = { settings: Settings; progress: Progress }

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
  return progress
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
    progress.catalogued.length > 0 ||
    progress.hotspots.length > 0 ||
    progress.documentsRead.length > 0 ||
    progress.factsKnown.length > 0 ||
    progress.credentials.length > 0 ||
    progress.roomsPowered.length > 0 ||
    progress.locksOpened.length > 0 ||
    progress.radioCalls.length > 0 ||
    progress.devicesCarried.length > 0
  )
}

function loadPersisted(): Persisted {
  if (typeof localStorage === 'undefined') {
    return { settings: DEFAULT_SETTINGS, progress: emptyProgress() }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { settings: DEFAULT_SETTINGS, progress: emptyProgress() }

    const parsed = JSON.parse(raw) as Partial<Persisted>
    const progress = migrateProgress(parsed.progress)

    return {
      // Settings survive a version bump: they are the player's preferences,
      // not game state, and losing "I turned head-bob off" is user-hostile.
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      progress,
    }
  } catch {
    return { settings: DEFAULT_SETTINGS, progress: emptyProgress() }
  }
}

const initial = loadPersisted()

export type DirectionalInput = { x: number; y: number }
export type TransitionDoorBlock = 'other-side' | 'unpowered'
export type TransitionDoorPrompt = {
  readonly id: string
  readonly targetRoom: string
  readonly status: 'blocked' | 'loading' | 'ready' | 'opening'
  readonly armed: boolean
  /** Why a blocked door will not open, so the prompt can say so. */
  readonly blockedBy?: TransitionDoorBlock
}
export type JournalTab = 'map' | 'catalogue' | 'archive' | 'credits'
/** What the radio is saying right now: one line at a time, in order. */
export type RadioTransmission = {
  /** Unique per transmission, so a repeated hint restarts its own timing. */
  readonly serial: number
  readonly deviceId: string
  readonly speakerKey: string
  readonly lineKeys: readonly string[]
  readonly index: number
  /**
   * The content call this is, if it is one. It is recorded as heard when its
   * last line ends, not when the first appears: a reload mid-call, or a call
   * half spoken under the notebook, must not lose the rest for good.
   */
  readonly callId?: string
  /** Seconds of dead air once this ends: he hung up on the player. */
  readonly hangsUpFor?: number
}

export type MuseumStore = {
  // --- settings -----------------------------------------------------------
  settings: Settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void

  // --- session ------------------------------------------------------------
  started: boolean
  pointerLocked: boolean
  currentRoom: string
  /** The room most recently left, used to preserve its visible lighting rig. */
  previousRoom: string | null
  /** Ids of the rooms the portal walk says are visible this frame. */
  visibleRooms: string[]
  touchMove: DirectionalInput
  touchLook: DirectionalInput
  /** Whether the scene has mounted, so a hint about looking can mean it. */
  sceneReady: boolean
  /** The exhibit currently under the crosshair, if any. */
  focusedExhibit: string | null
  /** The archive cabinet currently under the crosshair, if any. */
  focusedContainer: string | null
  /**
   * Metres from the eye to each desk-scale focus, Infinity when unfocused.
   * Each system casts its own ray, so these are what lets the nearest target
   * win when several are under the crosshair at once (`interactionTarget.ts`).
   */
  focusedContainerDistance: number
  /** The room power control currently under the crosshair, if any. */
  focusedPowerControl: string | null
  focusedPowerControlDistance: number
  /** A closed transition door under the crosshair and its streaming state. */
  focusedTransitionDoor: TransitionDoorPrompt | null
  /** The cabinet whose contents are being read, if any. */
  openedContainer: string | null
  /** The lock whose keypad is open, if any. */
  activeLock: string | null
  /** The exhibit being examined in the rotate view, if any. */
  examining: string | null
  /** A device under the crosshair that can be operated (the radio), if any. */
  focusedDevice: string | null
  focusedDeviceDistance: number
  /** The hand torch. Session state: every visit starts in the dark. */
  flashlightOn: boolean
  /** Whether the torch has been switched on yet, which ends its hint pulse. */
  flashlightUsed: boolean
  /** The page an open notebook shows. Reset whenever a container opens. */
  notebookPage: number
  /** The journal's open tab, or null while it is closed. */
  journalTab: JournalTab | null
  radio: RadioTransmission | null
  /**
   * Epoch ms until which the porter has hung up and only static answers.
   * Session state: a reload is a fresh night, and a fresh mood is cheap.
   */
  radioHungUpUntil: number | null

  start: () => void
  setPointerLocked: (locked: boolean) => void
  setSceneReady: (ready: boolean) => void
  setCurrentRoom: (room: string) => void
  setVisibleRooms: (rooms: string[]) => void
  setTouchMove: (x: number, y: number) => void
  setTouchLook: (x: number, y: number) => void
  resetTouch: () => void
  setFocusedExhibit: (id: string | null) => void
  /** `distance` is the ray's hit distance; omitted, the focus counts as touching. */
  setFocusedContainer: (id: string | null, distance?: number) => void
  setFocusedPowerControl: (id: string | null, distance?: number) => void
  setFocusedTransitionDoor: (door: TransitionDoorPrompt | null) => void
  setOpenedContainer: (id: string | null) => void
  setActiveLock: (id: string | null) => void
  setExamining: (id: string | null) => void
  setFocusedDevice: (id: string | null, distance?: number) => void
  toggleFlashlight: () => void
  setNotebookPage: (page: number) => void
  setJournalTab: (tab: JournalTab | null) => void
  startRadio: (transmission: Omit<RadioTransmission, 'serial' | 'index'>) => void
  /**
   * The next line, or the end. Ending a content call records it as heard;
   * ending a hang-up starts the dead air. Takes no argument on purpose, so
   * it can never be handed a click event by an `onClick={advanceRadio}`.
   */
  advanceRadio: () => void
  stopRadio: () => void
  clearRadioHangUp: () => void

  // --- progress -----------------------------------------------------------
  progress: Progress
  recordHotspot: (exhibitId: string, hotspotId: string) => void
  recordCatalogued: (exhibitId: string) => void
  recordDocument: (documentId: string) => void
  recordFact: (factId: string) => void
  grantCredential: (key: string) => void
  powerRoom: (roomId: string) => void
  openLock: (lockId: string) => void
  recordRadioCall: (callId: string) => void
  /** The player takes a `carriedOnUse` device with them. */
  carryDevice: (deviceId: string) => void
  rememberRadioCall: (deviceId: string, memory: RadioMemory) => void
  /** Whole seconds a mains clock has run; see `Progress.clockSeconds`. */
  recordClockSeconds: (clockId: string, seconds: number) => void
  recordHint: (hintId: string) => void
  applyUnlockEffect: (effect: UnlockEffect) => void
  /**
   * A new game: empty progress AND every session field back to its default,
   * written to the save at once. Settings are the player's, and survive.
   */
  resetProgress: () => void
}

/** Appends to a string array only when the value is new. */
function withValue(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value]
}

/**
 * One modal at a time owns the screen: holding an exhibit, reading a cabinet,
 * entering a code or the journal. While any is open nothing in the world
 * answers E, no focus is kept, and neither prompts nor the crosshair show.
 */
export function isModalOpen(
  state: Pick<MuseumStore, 'examining' | 'openedContainer' | 'activeLock' | 'journalTab'>,
) {
  return (
    state.examining !== null ||
    state.openedContainer !== null ||
    state.activeLock !== null ||
    state.journalTab !== null
  )
}

/** Half a centimetre: below this a moving hit is not worth a store write. */
const FOCUS_DISTANCE_STEP = 0.005

function sameDistance(first: number, second: number) {
  return first === second || Math.abs(first - second) < FOCUS_DISTANCE_STEP
}

function focusDistance(id: string | null, distance: number | undefined) {
  if (id === null) return Number.POSITIVE_INFINITY
  return distance !== undefined && Number.isFinite(distance) ? Math.max(0, distance) : 0
}

type SaveFlushTargets = {
  readonly window: Pick<Window, 'addEventListener' | 'removeEventListener'>
  readonly document: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>
}

/**
 * Forces the coalesced save to disk when the page may be about to die.
 *
 * Pagehide still covers navigation and the back-forward cache, but on a phone
 * the last event a browser reliably fires before discarding a backgrounded
 * tab is visibilitychange to hidden — and the idle callback that would have
 * written the lamp switch a moment later is frozen with the tab.
 */
export function bindSaveFlush(targets: SaveFlushTargets, flush: () => void) {
  const flushWhenHidden = () => {
    if (targets.document.visibilityState === 'hidden') flush()
  }
  targets.window.addEventListener('pagehide', flush)
  targets.document.addEventListener('visibilitychange', flushWhenHidden)
  return () => {
    targets.window.removeEventListener('pagehide', flush)
    targets.document.removeEventListener('visibilitychange', flushWhenHidden)
  }
}

const saveContributors = new Set<() => void>()

/**
 * Lets a running system put its latest state into the save right before a
 * forced write. A clock's elapsed time changes every frame and is never worth
 * a write of its own, but it must not be lost when the tab is hidden.
 */
export function contributeToSave(contribute: () => void) {
  saveContributors.add(contribute)
  return () => {
    saveContributors.delete(contribute)
  }
}

export const useMuseum = create<MuseumStore>((set, get) => {
  let radioSerial = 0

  // Autosave on room change and on any progress mutation. No typewriter ritual:
  // for a web museum, silent autosave plus an explicit "Continue" on the title
  // screen is the right shape, and the in-world visitor logbook can be a VIEW
  // of this state rather than the mechanism that drives it.
  let persistHandle: number | null = null
  let persistUsesIdleCallback = false

  const writePersisted = () => {
    if (typeof localStorage === 'undefined') return
    try {
      const { settings, progress } = get()
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, progress }))
    } catch {
      // Private browsing, quota, or a locked-down profile. Losing the save is
      // acceptable; throwing during gameplay is not.
    }
  }

  const cancelScheduledPersist = () => {
    if (persistHandle === null || typeof window === 'undefined') return
    if (persistUsesIdleCallback) window.cancelIdleCallback(persistHandle)
    else window.clearTimeout(persistHandle)
    persistHandle = null
  }

  const flushPersisted = () => {
    // Contributors may schedule a write of their own; the cancel below folds
    // it into this one.
    for (const contribute of saveContributors) contribute()
    cancelScheduledPersist()
    writePersisted()
  }

  const persist = () => {
    if (typeof window === 'undefined' || persistHandle !== null) return
    if (typeof window.requestIdleCallback === 'function') {
      persistUsesIdleCallback = true
      persistHandle = window.requestIdleCallback(
        () => {
          persistHandle = null
          writePersisted()
        },
        { timeout: 750 },
      )
      return
    }

    persistUsesIdleCallback = false
    persistHandle = window.setTimeout(() => {
      persistHandle = null
      writePersisted()
    }, 50)
  }

  // An idle callback may not run before a tab is discarded, so a hidden or
  // departing page flushes the latest coalesced snapshot itself.
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const unbindSaveFlush = bindSaveFlush({ window, document }, flushPersisted)
    // Vite replaces this module in place during local tuning. Leaving the old
    // listeners alive lets a stale store overwrite the new snapshot on exit.
    import.meta.hot?.dispose(() => {
      unbindSaveFlush()
      flushPersisted()
    })
  }

  const mutateProgress = (update: (progress: Progress) => Progress) => {
    set((state) => ({ progress: update(state.progress) }))
    persist()
  }

  return {
    settings: initial.settings,
    setSetting: (key, value) => {
      set((state) => ({ settings: { ...state.settings, [key]: value } }))
      persist()
    },

    started: false,
    pointerLocked: false,
    sceneReady: false,
    ...sessionDefaults(),

    start: () => {
      set({ started: true })
      const room = get().currentRoom
      mutateProgress((progress) => ({
        ...progress,
        lastRoom: room,
        roomsVisited: withValue(progress.roomsVisited, room),
      }))
    },
    setPointerLocked: (pointerLocked) => set({ pointerLocked }),
    setSceneReady: (sceneReady) => {
      if (get().sceneReady !== sceneReady) set({ sceneReady })
    },
    setCurrentRoom: (room) => {
      if (get().currentRoom === room) return
      // One external-store notification avoids reconciling the room tree once
      // for session state and again for progress in the same doorway frame.
      set((state) => ({
        previousRoom: state.currentRoom,
        currentRoom: room,
        progress: {
          ...state.progress,
          lastRoom: room,
          roomsVisited: withValue(state.progress.roomsVisited, room),
        },
      }))
      persist()
    },
    setVisibleRooms: (rooms) => {
      // Called every frame by the portal walk; skip the store write unless the
      // set actually changed or React re-renders the whole tree at 60 Hz.
      const current = get().visibleRooms
      if (current.length === rooms.length && current.every((id, i) => id === rooms[i])) return
      set({ visibleRooms: rooms })
    },
    setTouchMove: (x, y) => set({ touchMove: { x, y } }),
    setTouchLook: (x, y) => set({ touchLook: { x, y } }),
    resetTouch: () => set({ touchMove: { x: 0, y: 0 }, touchLook: { x: 0, y: 0 } }),
    setFocusedExhibit: (focusedExhibit) => set({ focusedExhibit }),
    // Targeting calls these every frame with a moving hit distance; the
    // write is skipped unless the id changes or the hit moves noticeably.
    setFocusedContainer: (focusedContainer, distance) => {
      const focusedContainerDistance = focusDistance(focusedContainer, distance)
      const state = get()
      if (
        state.focusedContainer === focusedContainer &&
        sameDistance(state.focusedContainerDistance, focusedContainerDistance)
      ) {
        return
      }
      set({ focusedContainer, focusedContainerDistance })
    },
    setFocusedPowerControl: (focusedPowerControl, distance) => {
      const focusedPowerControlDistance = focusDistance(focusedPowerControl, distance)
      const state = get()
      if (
        state.focusedPowerControl === focusedPowerControl &&
        sameDistance(state.focusedPowerControlDistance, focusedPowerControlDistance)
      ) {
        return
      }
      set({ focusedPowerControl, focusedPowerControlDistance })
    },
    setFocusedTransitionDoor: (focusedTransitionDoor) => {
      const current = get().focusedTransitionDoor
      if (
        current?.id === focusedTransitionDoor?.id &&
        current?.targetRoom === focusedTransitionDoor?.targetRoom &&
        current?.status === focusedTransitionDoor?.status &&
        current?.armed === focusedTransitionDoor?.armed &&
        current?.blockedBy === focusedTransitionDoor?.blockedBy
      ) {
        return
      }
      set({ focusedTransitionDoor })
    },
    // A notebook always opens on its first page, however it was left. Opening
    // any other modal closes the journal: a keypad hidden under the journal
    // would take the digits typed at it and leave Tab unable to close either.
    setOpenedContainer: (openedContainer) =>
      set(
        openedContainer
          ? { openedContainer, notebookPage: 0, journalTab: null }
          : { openedContainer, notebookPage: 0 },
      ),
    setActiveLock: (activeLock) => set(activeLock ? { activeLock, journalTab: null } : { activeLock }),
    setExamining: (examining) => set(examining ? { examining, journalTab: null } : { examining }),
    setFocusedDevice: (focusedDevice, distance) => {
      const focusedDeviceDistance = focusDistance(focusedDevice, distance)
      const state = get()
      if (
        state.focusedDevice === focusedDevice &&
        sameDistance(state.focusedDeviceDistance, focusedDeviceDistance)
      ) {
        return
      }
      set({ focusedDevice, focusedDeviceDistance })
    },
    toggleFlashlight: () =>
      set((state) => ({ flashlightOn: !state.flashlightOn, flashlightUsed: true })),
    setNotebookPage: (notebookPage) => set({ notebookPage: Math.max(0, notebookPage) }),
    setJournalTab: (journalTab) => set({ journalTab }),
    startRadio: (transmission) => {
      radioSerial += 1
      set({ radio: { ...transmission, serial: radioSerial, index: 0 } })
    },
    advanceRadio: () => {
      const radio = get().radio
      if (!radio) return
      if (radio.index + 1 < radio.lineKeys.length) {
        set({ radio: { ...radio, index: radio.index + 1 } })
        return
      }
      // One write for the end and what it means, so a retry waiting on the
      // radio to fall silent already sees the call as heard.
      const callId = radio.callId
      set((state) => ({
        radio: null,
        ...(radio.hangsUpFor ? { radioHungUpUntil: Date.now() + radio.hangsUpFor * 1000 } : {}),
        ...(callId
          ? { progress: { ...state.progress, radioCalls: withValue(state.progress.radioCalls, callId) } }
          : {}),
      }))
      if (callId) persist()
    },
    stopRadio: () => set({ radio: null }),
    clearRadioHangUp: () => {
      if (get().radioHungUpUntil !== null) set({ radioHungUpUntil: null })
    },

    progress: initial.progress,
    recordHotspot: (exhibitId, hotspotId) =>
      mutateProgress((progress) => ({
        ...progress,
        hotspots: withValue(progress.hotspots, `${exhibitId}:${hotspotId}`),
      })),
    recordCatalogued: (exhibitId) =>
      mutateProgress((progress) => ({
        ...progress,
        catalogued: withValue(progress.catalogued, exhibitId),
      })),
    recordDocument: (documentId) =>
      mutateProgress((progress) => ({
        ...progress,
        documentsRead: withValue(progress.documentsRead, documentId),
      })),
    recordFact: (factId) =>
      mutateProgress((progress) => ({
        ...progress,
        factsKnown: withValue(progress.factsKnown, factId),
      })),
    grantCredential: (key) =>
      mutateProgress((progress) => ({
        ...progress,
        credentials: withValue(progress.credentials, key),
      })),
    powerRoom: (roomId) =>
      mutateProgress((progress) => ({
        ...progress,
        roomsPowered: withValue(progress.roomsPowered, roomId),
      })),
    openLock: (lockId) =>
      mutateProgress((progress) => ({
        ...progress,
        locksOpened: withValue(progress.locksOpened, lockId),
      })),
    recordRadioCall: (callId) =>
      mutateProgress((progress) => ({
        ...progress,
        radioCalls: withValue(progress.radioCalls, callId),
      })),
    carryDevice: (deviceId) => {
      if (get().progress.devicesCarried.includes(deviceId)) return
      mutateProgress((progress) => ({
        ...progress,
        devicesCarried: withValue(progress.devicesCarried, deviceId),
      }))
    },
    rememberRadioCall: (deviceId, memory) =>
      mutateProgress((progress) => ({
        ...progress,
        radioMemory: { ...progress.radioMemory, [deviceId]: memory },
      })),
    recordClockSeconds: (clockId, seconds) => {
      if (!Number.isFinite(seconds)) return
      const whole = Math.max(0, Math.floor(seconds))
      if (get().progress.clockSeconds[clockId] === whole) return
      mutateProgress((progress) => ({
        ...progress,
        clockSeconds: { ...progress.clockSeconds, [clockId]: whole },
      }))
    },
    recordHint: (hintId) =>
      mutateProgress((progress) => ({
        ...progress,
        hintsShown: withValue(progress.hintsShown, hintId),
      })),
    applyUnlockEffect: (effect) => {
      const state = get()
      switch (effect.kind) {
        case 'grant-credential':
          state.grantCredential(`${effect.credential.kind}:${effect.credential.id}`)
          break
        case 'open-lock':
          state.openLock(effect.lockId)
          break
        case 'power-room':
          state.powerRoom(effect.roomId)
          break
        case 'reveal-document':
          state.recordDocument(effect.documentId)
          break
      }
    },
    resetProgress: () => {
      set({ progress: emptyProgress(), ...sessionDefaults() })
      // At once, not on the next idle callback: a reload straight after
      // "New game" must not bring the old save back.
      flushPersisted()
    },
  }
})

/**
 * Every per-visit field at its start-of-session value.
 *
 * Every session starts at the one authored, navigation-tested spawn. Starting
 * the render tier at a persisted lastRoom mounted that room's detail only to
 * tear it down on the first frame, when the player was detected back in the
 * spawn room.
 */
function sessionDefaults() {
  return {
    currentRoom: SPAWN.room as string,
    previousRoom: null,
    visibleRooms: [SPAWN.room as string],
    touchMove: { x: 0, y: 0 },
    touchLook: { x: 0, y: 0 },
    focusedExhibit: null,
    focusedContainer: null,
    focusedContainerDistance: Number.POSITIVE_INFINITY,
    focusedPowerControl: null,
    focusedPowerControlDistance: Number.POSITIVE_INFINITY,
    focusedTransitionDoor: null,
    openedContainer: null,
    activeLock: null,
    examining: null,
    focusedDevice: null,
    focusedDeviceDistance: Number.POSITIVE_INFINITY,
    flashlightOn: false,
    flashlightUsed: false,
    notebookPage: 0,
    journalTab: null,
    radio: null,
    radioHungUpUntil: null,
  } satisfies Partial<MuseumStore>
}

export { DEFAULT_SETTINGS, EMPTY_PROGRESS, SAVE_VERSION, STORAGE_KEY }
