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
// The spawn module has no runtime imports, so naming the start room here does
// not pull the content set into the title screen's bundle.
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
  /** Radio calls already received; each one is heard exactly once. */
  radioCalls: string[]
  lastRoom: string
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
  lastRoom: SPAWN.room,
}

type Persisted = { settings: Settings; progress: Progress }

/**
 * Reads the save, discarding anything from an older schema rather than trying
 * to migrate it. Losing a partial playthrough of a portfolio museum is a far
 * smaller cost than shipping a crash on load.
 */
function loadPersisted(): Persisted {
  if (typeof localStorage === 'undefined') {
    return { settings: DEFAULT_SETTINGS, progress: EMPTY_PROGRESS }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { settings: DEFAULT_SETTINGS, progress: EMPTY_PROGRESS }

    const parsed = JSON.parse(raw) as Partial<Persisted>
    const progress =
      parsed.progress && parsed.progress.version === SAVE_VERSION
        ? { ...EMPTY_PROGRESS, ...parsed.progress }
        : EMPTY_PROGRESS

    return {
      // Settings survive a version bump: they are the player's preferences,
      // not game state, and losing "I turned head-bob off" is user-hostile.
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      progress,
    }
  } catch {
    return { settings: DEFAULT_SETTINGS, progress: EMPTY_PROGRESS }
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
  /** The exhibit currently under the crosshair, if any. */
  focusedExhibit: string | null
  /** The archive cabinet currently under the crosshair, if any. */
  focusedContainer: string | null
  /** The room power control currently under the crosshair, if any. */
  focusedPowerControl: string | null
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
  /** The hand torch. Session state: every visit starts in the dark. */
  flashlightOn: boolean
  /** Whether the torch has been switched on yet, which ends its hint pulse. */
  flashlightUsed: boolean
  /** The page an open notebook shows. Reset whenever a container opens. */
  notebookPage: number
  /** The journal's open tab, or null while it is closed. */
  journalTab: JournalTab | null
  radio: RadioTransmission | null

  start: () => void
  setPointerLocked: (locked: boolean) => void
  setCurrentRoom: (room: string) => void
  setVisibleRooms: (rooms: string[]) => void
  setTouchMove: (x: number, y: number) => void
  setTouchLook: (x: number, y: number) => void
  resetTouch: () => void
  setFocusedExhibit: (id: string | null) => void
  setFocusedContainer: (id: string | null) => void
  setFocusedPowerControl: (id: string | null) => void
  setFocusedTransitionDoor: (door: TransitionDoorPrompt | null) => void
  setOpenedContainer: (id: string | null) => void
  setActiveLock: (id: string | null) => void
  setExamining: (id: string | null) => void
  setFocusedDevice: (id: string | null) => void
  toggleFlashlight: () => void
  setNotebookPage: (page: number) => void
  setJournalTab: (tab: JournalTab | null) => void
  startRadio: (transmission: Omit<RadioTransmission, 'serial' | 'index'>) => void
  advanceRadio: () => void
  stopRadio: () => void

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
  applyUnlockEffect: (effect: UnlockEffect) => void
  resetProgress: () => void
}

/** Appends to a string array only when the value is new. */
function withValue(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value]
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

  // An idle callback may not run before a tab is discarded. Pagehide is the
  // last reliable opportunity to flush the latest coalesced snapshot.
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushPersisted)
    // Vite replaces this module in place during local tuning. Leaving the old
    // listener alive lets a stale store overwrite the new snapshot on exit.
    import.meta.hot?.dispose(() => {
      window.removeEventListener('pagehide', flushPersisted)
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
    // Every session starts at the one authored, navigation-tested spawn.
    // Starting the render tier at a persisted lastRoom mounted that room's
    // detail only to tear it down on the first frame, when the player was
    // detected back in the spawn room.
    currentRoom: SPAWN.room,
    previousRoom: null,
    visibleRooms: [SPAWN.room],
    touchMove: { x: 0, y: 0 },
    touchLook: { x: 0, y: 0 },
    focusedExhibit: null,
    focusedContainer: null,
    focusedPowerControl: null,
    focusedTransitionDoor: null,
    openedContainer: null,
    activeLock: null,
    examining: null,
    focusedDevice: null,
    flashlightOn: false,
    flashlightUsed: false,
    notebookPage: 0,
    journalTab: null,
    radio: null,

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
    setFocusedContainer: (focusedContainer) => set({ focusedContainer }),
    setFocusedPowerControl: (focusedPowerControl) => set({ focusedPowerControl }),
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
    // A notebook always opens on its first page, however it was left.
    setOpenedContainer: (openedContainer) => set({ openedContainer, notebookPage: 0 }),
    setActiveLock: (activeLock) => set({ activeLock }),
    setExamining: (examining) => set({ examining }),
    setFocusedDevice: (focusedDevice) => {
      if (get().focusedDevice === focusedDevice) return
      set({ focusedDevice })
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
      set({
        radio: radio.index + 1 < radio.lineKeys.length ? { ...radio, index: radio.index + 1 } : null,
      })
    },
    stopRadio: () => set({ radio: null }),

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
      set({
        progress: EMPTY_PROGRESS,
        currentRoom: SPAWN.room,
        previousRoom: null,
        radio: null,
        journalTab: null,
      })
      persist()
    },
  }
})

export { DEFAULT_SETTINGS, EMPTY_PROGRESS, SAVE_VERSION, STORAGE_KEY }
