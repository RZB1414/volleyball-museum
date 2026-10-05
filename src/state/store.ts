/**
 * Runtime state.
 *
 * The Rapier prototype used a separate store. It was removed in 5e51e24; this
 * is now the only persisted runtime state.
 *
 * Three slices, deliberately kept apart:
 *   - settings   what the player chose. Persisted, and the accessibility
 *                defaults matter more than the graphics ones. Read from the
 *                disk with the care the progress is read with: a value this
 *                build cannot run on is not used, and is not written over
 *                either (`usableSettings`).
 *   - session    transient per-frame input and UI state. Never persisted.
 *   - progress   what the player has found. Persisted, and able to survive
 *                content ids being renamed, a lot that adds fields and a tab
 *                still running the lot before. Its shape is the table in
 *                `progressFields.ts`; reading a save is `saveMigrations.ts`.
 *                Every write of it goes through `commitProgress`, below,
 *                which settles what follows from the save before anybody is
 *                told (`progressRules.ts`).
 */

import { create } from 'zustand'

import type { ProgressCondition } from '../content/schema'
// None of these imports anything of the content (the spawn, the lot and the
// ids of old saves are modules of their own for that reason), so naming the
// start room and migrating a save here does not pull the content set into
// the title screen's bundle. `npm run test:save` walks these imports.
import { SPAWN } from '../content/spawn.ts'
import {
  emptyProgress,
  grantProgress,
  isRecord,
  joinProgress,
  withTabsOwn,
  type Progress,
  type ProgressGrant,
  type RadioMemory,
} from './progressFields.ts'
// The content's rules reach the store through this slot and no import: the
// triggers and the museum they are compiled from stay behind the button.
import { onProgressRulesRegistered, progressRules } from './progressRules.ts'
import { migrateProgress } from './saveMigrations.ts'

// The save's shape moved out of this file; whoever imported it from here still can.
export {
  EMPTY_PROGRESS,
  FRESH_RADIO_MEMORY,
  hasSavedProgress,
  sanitiseRadioMemory,
  SAVE_VERSION,
  type Progress,
  type ProgressGrant,
  type RadioMemory,
} from './progressFields.ts'
export { migrateProgress } from './saveMigrations.ts'

// As lists, because a setting read from the disk is checked against them.
const LOCALES = ['pt-BR', 'en'] as const
const QUALITY_TIERS = ['low', 'medium', 'high'] as const
export type Locale = (typeof LOCALES)[number]
export type QualityTier = (typeof QUALITY_TIERS)[number]

const STORAGE_KEY = 'volleyball-museum:v1'

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

/** Something read from the disk and not yet judged: a record, and no more is known of it. */
type Saved = Readonly<Record<string, unknown>>

const oneOf = (allowed: readonly unknown[]) => (value: unknown) => allowed.includes(value)
const between = (least: number, most: number) => (value: unknown) =>
  typeof value === 'number' && value >= least && value <= most
const isSwitch = (value: unknown) => typeof value === 'boolean'
/**
 * No screen sets these four yet, so the range is the engine's and nobody's
 * taste: wide, and clear of the zero that stops the player and divides the
 * footsteps by nothing, and of the negative that turns the look around.
 */
const isMultiplier = between(0.25, 4)

/**
 * Which values of each setting this build can run on.
 *
 * A setting comes off the disk like a field of the save, and what is there
 * is not always this build's doing: a tab of a later build may have a
 * language or a quality tier this one has not, and so may a save read after
 * a rollback, or one edited by hand. A locale with no dictionary throws in
 * the first component that translates, and nothing catches it: a blank page,
 * in the middle of a game, the moment the other tab's write is heard.
 *
 * Typed by `Settings`, so a setting added without a line here does not
 * compile.
 */
const USABLE_SETTING: { readonly [K in keyof Settings]: (value: unknown) => boolean } = {
  locale: oneOf(LOCALES),
  quality: oneOf(QUALITY_TIERS),
  brightness: between(0.5, 1.8),
  headBob: isSwitch,
  fovPush: isSwitch,
  moveSpeed: isMultiplier,
  lookSensitivity: isMultiplier,
  touchLookSensitivity: isMultiplier,
  touchMoveSensitivity: isMultiplier,
  subtitles: isSwitch,
}

/**
 * The settings a game runs on, out of what the disk says.
 *
 * A setting the disk does not have, or has at a value this build cannot use,
 * is `otherwise`'s: the default as a page loads, and what the tab was already
 * running on when the disk is read again. A key this build does not know is
 * carried as it is. Nothing here is thrown away for good: what the disk said
 * stays in `said`, below, and goes back to it.
 *
 * Settings survive a progress that could not be read: they are the player's
 * preferences, not game state, and losing "I turned head-bob off" is
 * user-hostile.
 */
function usableSettings(said: Saved, otherwise: Settings): Settings {
  const known = Object.entries(USABLE_SETTING).map(([key, usable]) => [
    key,
    Object.hasOwn(said, key) && usable(said[key]) ? said[key] : otherwise[key as keyof Settings],
  ])
  // The defaults first for the order alone: it is the order every build has
  // written the settings in.
  return { ...DEFAULT_SETTINGS, ...said, ...Object.fromEntries(known) } as Settings
}

/**
 * What sits under the save key, as this build reads it.
 *
 * `settings` are in the disk's own words, usable here or not; what the game
 * runs on is `usableSettings` of them. `game` tells one playthrough from the
 * next (`newGameMark`); a save that was never started over has none. `beside`
 * is whatever another build wrote next to the settings and the progress:
 * carried along, like a field of the save this build does not know.
 */
type Persisted = {
  readonly settings: Saved
  readonly progress: Progress
  readonly game: string | undefined
  readonly beside: Saved
}

/**
 * The browser's storage, or null where there is none to use.
 *
 * Every use of it starts here, because naming it is already a read that can
 * fail. `typeof` forgives a name that does not exist and nothing else: in a
 * profile that blocks site data (Chrome with every cookie blocked) the name
 * exists and its getter throws a SecurityError. This module is evaluated on
 * the title screen, so asking outside a `try` was a blank page for exactly
 * the players the `catch` beside it was written for.
 */
function saveStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** The text under the save key, or null: no storage, nothing saved, or a profile that refuses the read. */
function storedText(): string | null {
  try {
    return saveStorage()?.getItem(STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

/** The save in a text, or null when the text is not one. */
function readPersisted(text: string | null): Persisted | null {
  if (!text) return null
  try {
    const parsed: unknown = JSON.parse(text)
    if (!isRecord(parsed)) return null
    const { settings, progress, game, ...beside } = parsed
    return {
      settings: isRecord(settings) ? settings : {},
      progress: migrateProgress(progress),
      game: typeof game === 'string' ? game : undefined,
      beside,
    }
  } catch {
    return null
  }
}

/**
 * The save as it is written. With nothing beside it and no mark this is,
 * byte for byte, the text every build before this one wrote.
 */
function serialise({ settings, progress, game, beside }: Persisted): string {
  return JSON.stringify({ ...beside, settings, progress, ...(game === undefined ? {} : { game }) })
}

/**
 * A mark for a game that was started over, written beside the save.
 *
 * Two tabs join what they hold, and the union of an erased game and a new one
 * is the erased game. The mark is how a tab still holding the old game learns
 * that the save on the disk is another one. Only "New game" makes one: a save
 * that never started over has none, and is written as it always was.
 */
const newGameMark = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const initialText = storedText()
const initial: Persisted = readPersisted(initialText) ?? {
  settings: {},
  progress: emptyProgress(),
  game: undefined,
  beside: {},
}
const initialSettings = usableSettings(initial.settings, DEFAULT_SETTINGS)

/**
 * Which playthrough this tab holds: the mark its last "New game" left beside
 * the save (`newGameMark`), or undefined for a save never started over.
 *
 * Not the store's state, and nothing is drawn by it. It is for whoever counts
 * something of its own while the game runs and hands it to the save later
 * (the clock on the office wall, `engine/clockCount.ts`): the game can be
 * replaced under a running scene, by "New game" in another tab, and a count
 * made in the erased one must not be the first thing the new one holds.
 */
let game = initial.game
export const gameInPlay = () => game

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
/** The notebook's tabs. `notebook` is the director's list, and the one it opens on. */
export type JournalTab = 'notebook' | 'map' | 'catalogue' | 'archive' | 'credits'
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
  /**
   * What must still hold for the rest of an answer to make sense: the
   * condition of the hint it carries. A content call needs none here, it
   * is checked against its own `when` (`transmissionLapsed`).
   */
  readonly validWhile?: ProgressCondition
  /**
   * What hearing it to its last line records, beside `callId`: a recorded
   * message is filed in the archive when it has been heard out, and not
   * when it was cut short. Handed in by whoever starts the transmission
   * (the store imports no content to work it out).
   */
  readonly grantOnEnd?: ProgressGrant
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
   * The next line, or the end. Ending a content call records it as heard,
   * and whatever else the transmission files on being heard out
   * (`grantOnEnd`); ending a hang-up starts the dead air. Takes no argument
   * on purpose, so it can never be handed a click event by an
   * `onClick={advanceRadio}`.
   */
  advanceRadio: () => void
  /**
   * Ends a transmission without its remaining lines, because what it says
   * stopped being true while a modal held it. A content call still counts as
   * heard, so nothing schedules it again; a hang-up does not start, since the
   * line it would have ended on was never said, and for the same reason
   * nothing is filed.
   */
  dropRadio: () => void
  stopRadio: () => void
  clearRadioHangUp: () => void

  // --- progress -----------------------------------------------------------
  progress: Progress
  /**
   * What a verb of the player adds to the save, in one write: the door the
   * pure verbs of `engine/progressGrants.ts` and `engine/lockRules.ts` use.
   * A grant that adds nothing writes nothing and tells nobody.
   */
  grant: (grant: ProgressGrant) => void
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
  /**
   * A new game: empty progress AND every session field back to its default,
   * written to the save at once. Settings are the player's, and survive.
   */
  resetProgress: () => void
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
  // What another build keeps beside the save. Like the game this tab is
  // playing (`game`, above), it is not the store's state and goes to the disk
  // with it.
  let beside = initial.beside
  /**
   * The disk as this tab last saw it.
   *
   *   text      what was under the key: another text there now means another
   *             tab has written since;
   *   settings  the settings this tab ran on when it looked: the ones that
   *             differ in it now are the ones this tab changed;
   *   said      the settings in the disk's own words, which is how the ones
   *             this tab did not change go back to it;
   *   snapshot  what this tab would write if it had nothing to add. A tab
   *             whose own snapshot is the same writes nothing: a forced flush
   *             on every tab switch must not let a tab that changed nothing
   *             write at all.
   */
  let disk = {
    text: initialText,
    settings: initialSettings,
    said: initial.settings,
    snapshot: serialise({ ...initial, settings: { ...initialSettings, ...initial.settings } }),
  }
  const differs = (first: unknown, second: unknown) => JSON.stringify(first) !== JSON.stringify(second)
  /**
   * The settings this tab changed since it last looked at the disk.
   *
   * By value. Every read of the disk makes its objects anew, so asking `!==`
   * of a setting that is not a plain value (one of a later build: this one
   * has none) made it "changed here" from the first write the tab heard of,
   * and the tab wrote its old copy over the next change to it.
   */
  const changedHere = (settings: Settings) =>
    Object.fromEntries(Object.entries(settings).filter(([key, value]) => differs(value, (disk.settings as Saved)[key])))
  /**
   * The settings as this tab writes them: what it runs on, in the disk's own
   * words wherever it changed nothing. A value this build cannot use is some
   * other build's choice, and writing this tab's fallback over it would undo
   * that choice in the tab that made it.
   */
  const settingsToWrite = (settings: Settings): Saved => ({ ...settings, ...disk.said, ...changedHere(settings) })
  /** What this tab holds now, in the shape `disk` keeps what it last saw. */
  const heldNow = () => {
    const { settings, progress } = get()
    const said = settingsToWrite(settings)
    return { settings, said, snapshot: serialise({ settings: said, progress, game, beside }) }
  }

  /**
   * Takes in what another tab has written since this one last looked.
   *
   * The store reads the save once, as the page loads. A tab that stayed open
   * while another one played used to answer its next change by writing
   * everything it held: an older save over a newer one, the lot stamped down,
   * the fields of a later build gone. A page of a build from before a deploy
   * is, by definition, such a tab.
   *
   * So the disk is read before every write, and whenever the browser says
   * the key changed. What is there is joined with what this tab holds
   * (`joinProgress`); the settings are the disk's where this build can use
   * them, with the ones this tab changed on top; the triggers settle on the
   * result. One exception: a save marked as another game was started over in
   * another tab, and joining the erased game to it would bring the erased
   * game back. That one is taken as it is, and what this tab still held of
   * the old game goes with the old game, a call in the air among it.
   *
   * What the tab then compares itself with, to know whether it has anything
   * to write, is the disk's save as IT would hold it with nothing to add:
   * standing in its own room (`withTabsOwn`) and with its own fallback for a
   * setting it cannot use. Compared with the disk's save as it is, a tab that
   * differs from it only in those always had something to write, and so had
   * the other tab, in answer, for ever.
   */
  const takeInOtherTabs = () => {
    try {
      const text = storedText()
      if (text === disk.text) return
      disk = { ...disk, text }
      const theirs = readPersisted(text)
      // Wiped, or not a save: nothing to take in. Whether this tab has
      // anything new is still judged by the last save it saw there.
      if (!theirs) return

      const mine = get()
      const anotherGame = theirs.game !== undefined && theirs.game !== game
      const joined = anotherGame ? theirs.progress : joinProgress(theirs.progress, mine.progress)
      const progress = progressRules()?.settle(joined) ?? joined
      // What the disk cannot tell this build, the tab goes on with as it was.
      const seen = usableSettings(theirs.settings, disk.settings)
      const settings = { ...seen, ...changedHere(mine.settings) } as Settings

      game = theirs.game ?? game
      beside = theirs.beside
      disk = {
        text,
        settings: seen,
        said: theirs.settings,
        snapshot: serialise({
          ...theirs,
          settings: { ...seen, ...theirs.settings },
          progress: anotherGame ? theirs.progress : withTabsOwn(theirs.progress, mine.progress),
        }),
      }
      // Only what differs is set: a write that brought this tab nothing new
      // wakes nobody.
      const taken: Partial<MuseumStore> = {}
      if (differs(progress, mine.progress)) taken.progress = progress
      if (differs(settings, mine.settings)) taken.settings = settings
      // A call in the air was placed in the erased game, and a call is
      // recorded as heard when its last line ends: heard out here, it would
      // be one the new game never places. It goes with the game it was of.
      if (anotherGame && mine.radio) taken.radio = null
      if (Object.keys(taken).length > 0) set(taken)
    } catch {
      // A disk that cannot be read is not a reason to stop the game.
    }
  }

  /**
   * `join` is false for exactly one write: "New game", which is meant to
   * erase whatever the disk holds.
   */
  const writePersisted = (join = true) => {
    const storage = saveStorage()
    if (!storage) return
    if (join) takeInOtherTabs()
    try {
      const held = heldNow()
      if (held.snapshot === disk.snapshot) return
      storage.setItem(STORAGE_KEY, held.snapshot)
      disk = { text: held.snapshot, ...held }
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

  const flush = (join: boolean) => {
    // Contributors may schedule a write of their own; the cancel below folds
    // it into this one.
    for (const contribute of saveContributors) contribute()
    cancelScheduledPersist()
    writePersisted(join)
  }
  // Bound to events, which hand a listener their event: it takes no argument.
  const flushPersisted = () => flush(true)

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

  /**
   * The one way the save changes.
   *
   * Applies `update`, then everything that follows from the result (the
   * content's triggers, once the content has arrived), and only then writes:
   * one `set`, so a subscriber never sees a catalogued piece without the key
   * it gives. `session` is what the action changes outside the save, and
   * leaves in that same notification.
   *
   * A save that comes out as the object that went in was not changed: nothing
   * is set for it and nothing is scheduled to disk. An update that adds
   * nothing must therefore hand back what it was given, which is what
   * `grantProgress` does.
   */
  const commitProgress = (update: (progress: Progress) => Progress, session?: Partial<MuseumStore>) => {
    const before = get().progress
    const updated = update(before)
    const progress = progressRules()?.settle(updated) ?? updated
    if (progress === before) {
      if (session) set(session)
      return
    }
    set({ ...session, progress })
    persist()
  }
  const grant = (granted: ProgressGrant) => commitProgress((progress) => grantProgress(progress, granted))
  /** The player is in this room: where they stopped, and one more room seen. */
  const inRoom = (room: string) => (progress: Progress) =>
    grantProgress(progress.lastRoom === room ? progress : { ...progress, lastRoom: room }, { roomsVisited: [room] })

  // The content arrives after the save was loaded (it is behind the title
  // button), and may owe that save something: a lot that makes an open drawer
  // give a key has to reach the player who opened it last week.
  const forgetRules = onProgressRulesRegistered(() => commitProgress((progress) => progress))

  // An idle callback may not run before a tab is discarded, so a hidden or
  // departing page flushes the latest coalesced snapshot itself.
  const unbindSaveFlush =
    typeof window !== 'undefined' && typeof document !== 'undefined'
      ? bindSaveFlush({ window, document }, flushPersisted)
      : null
  // The moment the browser says another tab wrote, so that this tab's plan
  // and catalogue do not go on showing the save as it was. The read before a
  // write is the guard and this is for the screen: a frozen tab hears of it
  // late, and nothing orders it against `visibilitychange`.
  const onStorage = (event: Event) => {
    const key = (event as StorageEvent).key
    // No key at all is the whole storage cleared.
    if (key !== null && key !== STORAGE_KEY) return
    takeInOtherTabs()
    // What this tab holds that the disk now lacks goes back like any other
    // change: a tab of an earlier build rewrites the save from the fields it
    // knows.
    if (heldNow().snapshot !== disk.snapshot) persist()
  }
  const storageTarget = typeof window === 'undefined' ? null : window
  storageTarget?.addEventListener('storage', onStorage)
  // Vite replaces this module in place during local tuning. Leaving the old
  // listeners alive lets a stale store overwrite the new snapshot on exit, or
  // answer the content's next registration with its own, older, save.
  import.meta.hot?.dispose(() => {
    forgetRules()
    unbindSaveFlush?.()
    storageTarget?.removeEventListener('storage', onStorage)
    flushPersisted()
  })

  // One write for the end and what it means, so a retry waiting on the radio
  // to fall silent already sees the call as heard. `heardOut` is false for a
  // transmission dropped with lines unsaid: a call still counts as heard
  // (nothing may schedule it again), while a hang-up does not start and a
  // recording is not filed, since neither was heard to the line that does it.
  const endRadio = (radio: RadioTransmission, heardOut: boolean) => {
    const heard: ProgressGrant = radio.callId ? { radioCalls: [radio.callId] } : {}
    const filed: ProgressGrant = heardOut && radio.grantOnEnd ? radio.grantOnEnd : {}
    commitProgress((progress) => grantProgress(grantProgress(progress, heard), filed), {
      radio: null,
      ...(heardOut && radio.hangsUpFor ? { radioHungUpUntil: Date.now() + radio.hangsUpFor * 1000 } : {}),
    })
  }

  // A store created after the content registered (a hot reload of this
  // module, the playthrough robot) has nobody to wait for: what it loaded is
  // settled here. `disk.snapshot` stays what was loaded, so whatever
  // settling added is something new to write, and is scheduled like any
  // other change.
  const loaded = progressRules()?.settle(initial.progress) ?? initial.progress
  if (loaded !== initial.progress) persist()

  return {
    settings: initialSettings,
    setSetting: (key, value) => {
      set((state) => ({ settings: { ...state.settings, [key]: value } }))
      persist()
    },

    started: false,
    pointerLocked: false,
    sceneReady: false,
    ...sessionDefaults(),

    start: () => {
      commitProgress(inRoom(get().currentRoom), { started: true })
    },
    setPointerLocked: (pointerLocked) => set({ pointerLocked }),
    setSceneReady: (sceneReady) => {
      if (get().sceneReady !== sceneReady) set({ sceneReady })
    },
    setCurrentRoom: (room) => {
      const previousRoom = get().currentRoom
      if (previousRoom === room) return
      // One external-store notification avoids reconciling the room tree once
      // for session state and again for progress in the same doorway frame.
      commitProgress(inRoom(room), { previousRoom, currentRoom: room })
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
      endRadio(radio, true)
    },
    dropRadio: () => {
      const radio = get().radio
      if (radio) endRadio(radio, false)
    },
    stopRadio: () => set({ radio: null }),
    clearRadioHangUp: () => {
      if (get().radioHungUpUntil !== null) set({ radioHungUpUntil: null })
    },

    progress: loaded,
    grant,
    // The verbs below are `grant` with the list named. They stay for the
    // suites and for the systems that record one thing; a verb with rules of
    // its own (a detail, a container, a lock) goes through `grant` with what
    // its pure function hands back.
    recordHotspot: (exhibitId, hotspotId) => grant({ hotspots: [`${exhibitId}:${hotspotId}`] }),
    recordCatalogued: (exhibitId) => grant({ catalogued: [exhibitId] }),
    recordDocument: (documentId) => grant({ documentsRead: [documentId] }),
    recordFact: (factId) => grant({ factsKnown: [factId] }),
    grantCredential: (key) => grant({ credentials: [key] }),
    powerRoom: (roomId) => grant({ roomsPowered: [roomId] }),
    // Open is seen, by whichever door a lock is opened: the plan lists what
    // was touched and is still shut, and must never be asked about this one.
    openLock: (lockId) => grant({ locksOpened: [lockId], locksSeen: [lockId] }),
    recordRadioCall: (callId) => grant({ radioCalls: [callId] }),
    carryDevice: (deviceId) => grant({ devicesCarried: [deviceId] }),
    rememberRadioCall: (deviceId, memory) =>
      commitProgress((progress) => ({
        ...progress,
        radioMemory: {
          ...progress.radioMemory,
          // Over the entry that is there, not in its place: what a later
          // build keeps inside it is not this build's to drop (rule 1 of the
          // save, one level down). `hasOwn`, because the id is a key like
          // any other and must not read what every object inherits.
          [deviceId]: {
            ...(Object.hasOwn(progress.radioMemory, deviceId) ? progress.radioMemory[deviceId] : null),
            ...memory,
          },
        },
      })),
    recordClockSeconds: (clockId, seconds) => {
      if (!Number.isFinite(seconds)) return
      const whole = Math.max(0, Math.floor(seconds))
      // Never back (rule 3 of the save: nothing shrinks). Another tab may
      // have run this clock for longer, and once its time is joined in, this
      // tab's own count is behind the save.
      if ((get().progress.clockSeconds[clockId] ?? -1) >= whole) return
      commitProgress((progress) => ({
        ...progress,
        clockSeconds: { ...progress.clockSeconds, [clockId]: whole },
      }))
    },
    recordHint: (hintId) => grant({ hintsShown: [hintId] }),
    resetProgress: () => {
      // The settings another tab chose since are the player's, and stay. The
      // progress it wrote comes in too, and is erased with the rest.
      takeInOtherTabs()
      // Another game from here on: a tab still holding the old one must not
      // join it to this one.
      game = newGameMark()
      commitProgress(() => emptyProgress(), sessionDefaults())
      // At once, not on the next idle callback: a reload straight after
      // "New game" must not bring the old save back. And without reading
      // the disk first: this is the one write that is meant to erase.
      flush(false)
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

export { DEFAULT_SETTINGS, STORAGE_KEY }
