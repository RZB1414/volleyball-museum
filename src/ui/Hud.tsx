/**
 * The 2D layer: interaction prompt, examine panel, catalogue.
 *
 * Deliberately outside the Canvas. Museum label text has to be crisp, wrap
 * properly, resize with the viewport and be selectable by a screen reader —
 * all things the DOM does for free and an SDF quad in 3D space does badly.
 * Text that belongs to the WORLD (the credit under a photograph, a wall label)
 * lives in 3D; text that belongs to the PLAYER lives here.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { formatCreditLine } from '../content/credit'
import { PRE_OPENING_SAVE } from '../content/legacySave'
import { MUSEUM } from '../content/museum'
import type { ExhibitData } from '../content/schema'
import type { TranslationKey } from '../content/i18n/pt-BR'
import { museumAudio } from '../engine/audio'
import { deskRadioIntent, radioDevices, radioLineSeconds } from '../engine/deviceRules'
import {
  interactionWinnerKey,
  parseInteractionWinnerKey,
  type InteractionKind,
} from '../engine/interactionTarget'
import { lockStatus } from '../engine/lockRules'
import { containerById, isNotebook, journalUnlocked } from '../engine/notebook'
import { isRoomPowered } from '../engine/power'
import { placeRadioCall, releaseHeldRadio } from '../engine/radioCall'
import { heldRadioId } from '../engine/radioPatience'
import { useTranslate } from '../i18n'
import {
  archiveFiledKey,
  closeLabel,
  listGrew,
  lookHintVisible,
  radioHeld,
  radioLineDelayMs,
  radioLineMark,
  radioToolState,
  shouldAnnounceTaken,
  shouldCrackle,
} from './hudRules'
import { LockPanel } from './LockPanel'
import { MobileControls } from './MobileControls'
import { NotebookPanel } from './Notebook'
import { useCoarsePointer } from './useCoarsePointer'
import { useDocumentHidden } from './useDocumentHidden'
import { isModalOpen, useMuseum } from '../state/store'

const radiosById = new Map(radioDevices(MUSEUM).map((entry) => [entry.device.id, entry.device]))
/**
 * The room each one-way door opens from, by the door's id (the portal that
 * declares the leaf): the room its toast names. Read off the content rather
 * than off `buildTransitionDoorSpecs`, which the canvas chunk owns: importing
 * it here made the topology a chunk of its own for one lookup.
 */
const doorSides = new Map(
  MUSEUM.rooms.flatMap((room) =>
    room.portals.flatMap((portal) =>
      portal.transitionDoor?.opensFrom ? [[portal.id, portal.transitionDoor.opensFrom] as const] : [],
    ),
  ),
)

/**
 * The id the E key would act on right now, if it is of this kind.
 *
 * Every prompt asks the same arbitration the key handlers ask, so a prompt
 * can never name the notebook while E switches on the lamp. Selected as a
 * string so the per-frame distance writes re-render nothing until the winner
 * itself changes.
 */
function useWinner(kind: InteractionKind) {
  const key = useMuseum((state) => interactionWinnerKey(state, MUSEUM))
  const winner = parseInteractionWinnerKey(key)
  return winner?.kind === kind ? winner : null
}

const exhibitsById = new Map<string, ExhibitData>(
  MUSEUM.exhibits.map((exhibit) => [exhibit.id, exhibit]),
)

function InteractionPrompt() {
  const focused = useWinner('exhibit')?.id ?? null
  const catalogued = useMuseum((state) => state.progress.catalogued)
  const t = useTranslate()

  if (!focused) return null
  const exhibit = exhibitsById.get(focused)
  if (!exhibit) return null

  const isCatalogued = catalogued.includes(focused)

  return (
    <div className="prompt" role="status">
      <span className="prompt-key">E</span>
      <span className="prompt-label">{t('prompt.examine')}</span>
      <span className="prompt-title">{t(exhibit.titleKey as never)}</span>
      {isCatalogued ? <span className="prompt-done">✓</span> : null}
    </div>
  )
}

/**
 * The prompt for an archive cabinet.
 *
 * Deliberately worded "Ler" rather than "Abrir": the reward is the document,
 * and telling the player they are about to read something is what makes the
 * optional layer legible as optional depth rather than as another lock.
 */
function ContainerPrompt() {
  const focusedContainer = useWinner('container')?.id ?? null
  const read = useMuseum((state) => state.progress.documentsRead)
  const locksOpened = useMuseum((state) => state.progress.locksOpened)
  const t = useTranslate()

  if (!focusedContainer) return null

  const container = MUSEUM.rooms
    .flatMap((room) => room.containers ?? [])
    .find((candidate) => candidate.id === focusedContainer)
  if (!container) return null

  const inside = MUSEUM.documents.filter((doc) => doc.containerId === focusedContainer)
  const allRead = inside.length > 0 && inside.every((doc) => read.includes(doc.id))
  const isLocked = container.lockId !== undefined && lockStatus(container.lockId, { locksOpened }) === 'closed'

  return (
    <div className="prompt" role="status">
      <span className="prompt-key">E</span>
      <span className="prompt-label">{isLocked ? t('prompt.locked') : t('prompt.read')}</span>
      <span className="prompt-title">{t(container.titleKey as never)}</span>
      {allRead ? <span className="prompt-done">✓</span> : null}
    </div>
  )
}

function PowerPrompt() {
  const focused = useWinner('power-control')?.id ?? null
  const restored = useMuseum((state) => state.progress.roomsPowered)
  const t = useTranslate()

  if (!focused) return null
  const room = MUSEUM.rooms.find((candidate) => candidate.powerControl?.id === focused)
  if (!room?.powerControl || isRoomPowered(room, restored)) return null

  return (
    <div className="prompt" role="status">
      <span className="prompt-key">E</span>
      <span className="prompt-label">{t('prompt.power')}</span>
      <span className="prompt-title">{t(room.powerControl.titleKey as never)}</span>
    </div>
  )
}

function TransitionDoorPrompt() {
  const focused = useMuseum((state) => state.focusedTransitionDoor)
  const t = useTranslate()

  // The Hud mounts no prompt under a modal, so this needs no modal check.
  if (!focused) return null
  const target = MUSEUM.rooms.find((room) => room.id === focused.targetRoom)
  if (!target) return null

  const label =
    focused.status === 'blocked'
      ? focused.blockedBy === 'unpowered'
        ? t('prompt.door.unpowered')
        : t('prompt.door.otherSide')
      : focused.status === 'ready'
      ? t('prompt.door.open')
      : focused.status === 'opening'
        ? t('prompt.door.opening')
        : t('prompt.door.loading')

  return (
    <div className="prompt" role="status">
      {focused.status !== 'blocked' && focused.status !== 'opening' && !focused.armed ? (
        <span className="prompt-key">E</span>
      ) : null}
      <span className="prompt-label">{label}</span>
      <span className="prompt-title">{t(target.titleKey as never)}</span>
    </div>
  )
}

const DESK_RADIO_LABEL = {
  dead: 'prompt.radio.dead',
  take: 'prompt.radio.take',
  skip: 'radio.skip',
  call: 'prompt.radio.call',
} as const satisfies Record<ReturnType<typeof deskRadioIntent>, TranslationKey>

/**
 * The porter's radio on its desk: live once its charger has power, and taken
 * on the first press. The label is the same intent E acts on.
 */
function DevicePrompt() {
  const winner = useWinner('device')
  const focused = winner?.id ?? null
  const speaking = useMuseum((state) => state.radio !== null)
  const carried = useMuseum(
    (state) => focused !== null && state.progress.devicesCarried.includes(focused),
  )
  const t = useTranslate()

  if (!focused) return null
  const radio = radiosById.get(focused)
  if (!radio) return null
  const live = winner?.live ?? false
  const intent = deskRadioIntent(radio, { live, carried, speaking })

  return (
    <div className="prompt" role="status">
      {intent !== 'dead' ? <span className="prompt-key">E</span> : null}
      <span className="prompt-label">{t(DESK_RADIO_LABEL[intent])}</span>
      <span className="prompt-title">{t(radio.titleKey as never)}</span>
    </div>
  )
}

/**
 * What the radio is saying, one line at a time.
 *
 * There is no recorded voice, so the subtitle IS the transmission and is shown
 * regardless of the subtitle setting. Each line stays up for a reading pace
 * derived from its length; the skip control, R and E on the radio move it on.
 * Under any modal, and while the tab is hidden, the line is held and hidden —
 * the same holds the director waits for — and starts its full time again when
 * the hold ends, unless what it says has lapsed meanwhile.
 */
function RadioSubtitles() {
  const radio = useMuseum((state) => state.radio)
  const modal = useMuseum(isModalOpen)
  const hidden = useDocumentHidden()
  const held = radioHeld({ modal, hidden })
  const advance = useMuseum((state) => state.advanceRadio)
  const t = useTranslate()
  const line = radio ? t(radio.lineKeys[radio.index] as never) : ''
  const crackledRef = useRef<string | null>(null)
  const heldRef = useRef(held)

  // Before paint, so a lapsed line never shows for a frame as the notebook
  // that answered it closes.
  useLayoutEffect(() => {
    const released = heldRef.current && !held
    heldRef.current = held
    if (released) releaseHeldRadio()
  }, [held])

  // Its own effect, keyed on the line itself: a modal opening and closing
  // re-arms the timer below, and must not crackle the same line again.
  useEffect(() => {
    if (!shouldCrackle(crackledRef.current, radio)) return
    crackledRef.current = radioLineMark(radio)
    museumAudio.radioCrackle()
  }, [radio])

  useEffect(() => {
    const delay = radioLineDelayMs(radio, held, radioLineSeconds(line))
    if (radio === null || delay === null) return undefined
    const timer = window.setTimeout(() => {
      const current = useMuseum.getState().radio
      if (current?.serial === radio.serial && current.index === radio.index) advance()
    }, delay)
    return () => window.clearTimeout(timer)
  }, [advance, held, line, radio])

  if (!radio || held) return null

  return (
    <div className="radio-subtitle" role="status" aria-live="polite">
      <span className="radio-speaker">{t(radio.speakerKey as never)}</span>
      <span className="radio-line">{line}</span>
      {/* A wrapper, not the action itself: handed to onClick directly, the
          click event would become an argument of a store action. */}
      <button type="button" className="radio-skip" onClick={() => advance()}>
        {t('radio.skip')} ›
      </button>
    </div>
  )
}

/** The documents found in a cabinet the player just opened. */
function DocumentPanel() {
  const openedContainer = useMuseum((state) => state.openedContainer)
  const setOpenedContainer = useMuseum((state) => state.setOpenedContainer)
  const unlocked = useJournalUnlocked()
  const coarse = useCoarsePointer()
  const t = useTranslate()

  if (!openedContainer) return null
  // Notebooks have their own page-turning reader.
  if (isNotebook(containerById(MUSEUM, openedContainer))) return <NotebookPanel />

  const documents = MUSEUM.documents.filter((doc) => doc.containerId === openedContainer)
  if (documents.length === 0) return null

  return (
    <div className="examine" role="dialog" aria-label={t('archive.title')}>
      <div className="examine-panel">
        {documents.map((doc) => (
          <article key={doc.id} className="document">
            <h2>{t(doc.titleKey as never)}</h2>
            <p className="examine-label">{t(doc.bodyKey as never)}</p>
          </article>
        ))}

        <div className="examine-actions">
          <span className="examine-drag">{t(archiveFiledKey(unlocked, coarse))}</span>
          <button type="button" onClick={() => setOpenedContainer(null)}>
            {closeLabel(t('prompt.close'), 'Esc', coarse)}
          </button>
        </div>
      </div>
    </div>
  )
}

function ExaminePanel() {
  const examining = useMuseum((state) => state.examining)
  const hotspots = useMuseum((state) => state.progress.hotspots)
  const catalogued = useMuseum((state) => state.progress.catalogued)
  const locale = useMuseum((state) => state.settings.locale)
  const setExamining = useMuseum((state) => state.setExamining)
  const coarse = useCoarsePointer()
  const t = useTranslate()

  const exhibit = examining ? exhibitsById.get(examining) : undefined

  const asset = useMemo(
    () =>
      exhibit?.mediaId
        ? MUSEUM.media.find((candidate) => candidate.id === exhibit.mediaId)
        : undefined,
    [exhibit],
  )

  if (!exhibit) return null

  const seen = new Set(
    hotspots
      .filter((key) => key.startsWith(`${exhibit.id}:`))
      .map((key) => key.split(':')[1]),
  )
  const required = exhibit.hotspots.filter((hotspot) => hotspot.requiredForCatalogue)
  const isCatalogued = catalogued.includes(exhibit.id)

  return (
    <div className="examine" role="dialog" aria-label={t(exhibit.titleKey as never)}>
      <div className="examine-panel">
        <h2>{t(exhibit.titleKey as never)}</h2>
        <p className="examine-label">{t(exhibit.labelKey as never)}</p>

        {/*
          The catalogue entry is the reward for actually turning the object
          over. Showing it up front would remove the only reason to do so.
        */}
        {isCatalogued ? (
          <p className="examine-catalogue">{t(exhibit.catalogueKey as never)}</p>
        ) : (
          <p className="examine-hint">{t('catalogue.incomplete')}</p>
        )}

        <ul className="examine-hotspots">
          {exhibit.hotspots.map((hotspot) => {
            const found = seen.has(hotspot.id)
            return (
              <li key={hotspot.id} className={found ? 'is-found' : ''}>
                <span aria-hidden="true">{found ? '●' : '○'}</span>
                {found ? t(hotspot.labelKey as never) : '— — —'}
                {hotspot.requiredForCatalogue ? <em> *</em> : null}
              </li>
            )
          })}
        </ul>

        {/*
          Count only the REQUIRED hotspots that have been found. Counting every
          seen hotspot against the required total reads "2 / 2" while a required
          one is still missing — the catalogue correctly stays locked and the
          player is told they are finished, which is the worst combination.
        */}
        {required.length > 0 && !isCatalogued ? (
          <p className="examine-progress">
            {required.filter((hotspot) => seen.has(hotspot.id)).length} / {required.length}
          </p>
        ) : null}

        {/* Credit belongs with the artwork wherever the artwork appears. */}
        {asset ? <p className="examine-credit">{formatCreditLine(asset.credit, locale)}</p> : null}

        <div className="examine-actions">
          <span className="examine-drag">{t('prompt.rotate')}</span>
          <button type="button" onClick={() => setExamining(null)}>
            {closeLabel(t('prompt.close'), 'Esc', coarse)}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Brief confirmation when something enters the catalogue. */
function CatalogueToast() {
  const catalogued = useMuseum((state) => state.progress.catalogued)
  // The save arrives whole on the first render: what it holds was announced
  // in the session that catalogued it, not on every Continue.
  const seenLength = useRef(catalogued.length)
  const [shown, setShown] = useState<string | null>(null)
  const t = useTranslate()

  useEffect(() => {
    const grew = listGrew(seenLength.current, catalogued.length)
    seenLength.current = catalogued.length
    if (!grew) {
      // A new game empties the list; a toast still up belongs to the old one.
      setShown(null)
      return undefined
    }
    const latest = catalogued[catalogued.length - 1]
    setShown(latest)
    museumAudio.chime()
    const timer = window.setTimeout(() => setShown(null), 3200)
    return () => window.clearTimeout(timer)
  }, [catalogued])

  if (!shown) return null
  const exhibit = exhibitsById.get(shown)
  if (!exhibit) return null

  return (
    <div className="toast" role="status">
      <span className="toast-mark">✓</span>
      <span>
        {t('catalogue.title')} — {t(exhibit.titleKey as never)}
      </span>
    </div>
  )
}

function PowerToast() {
  const powered = useMuseum((state) => state.progress.roomsPowered)
  const seenLength = useRef(powered.length)
  const [shown, setShown] = useState<string | null>(null)
  const t = useTranslate()

  useEffect(() => {
    if (powered.length <= seenLength.current) {
      seenLength.current = powered.length
      return undefined
    }
    seenLength.current = powered.length
    const latest = powered[powered.length - 1]
    setShown(latest)
    museumAudio.chime()
    const timer = window.setTimeout(() => setShown(null), 3200)
    return () => window.clearTimeout(timer)
  }, [powered])

  if (!shown) return null
  const room = MUSEUM.rooms.find((candidate) => candidate.id === shown)
  if (!room) return null

  return (
    <div className="toast" role="status">
      <span className="toast-mark">✓</span>
      <span>
        {t('power.restored')} — {t(room.titleKey as never)}
      </span>
    </div>
  )
}

/**
 * A one-way door has just been opened from its own side, and from now on it
 * opens from both: said once, when it happens, with the sound of the latch
 * letting go. Without a word the player finds out by accident, or never.
 */
function DoorReleasedToast() {
  const released = useMuseum((state) => state.progress.doorsReleased)
  // The save arrives whole on the first render: a door released on another
  // night was announced then.
  const seenLength = useRef(released.length)
  const [shown, setShown] = useState<string | null>(null)
  const t = useTranslate()

  useEffect(() => {
    const grew = listGrew(seenLength.current, released.length)
    seenLength.current = released.length
    if (!grew) {
      // A new game empties the list; a toast still up belongs to the old one.
      setShown(null)
      return undefined
    }
    setShown(released[released.length - 1])
    museumAudio.lockRelease()
    const timer = window.setTimeout(() => setShown(null), 3200)
    return () => window.clearTimeout(timer)
  }, [released])

  if (!shown) return null
  // Named by the room it opened from: that is the room it now leads into.
  const side = doorSides.get(shown)
  const room = MUSEUM.rooms.find((candidate) => candidate.id === side)
  if (!room) return null

  return (
    <div className="toast" role="status">
      <span className="toast-mark">✓</span>
      <span>
        {t('door.released')} — {t(room.titleKey as never)}
      </span>
    </div>
  )
}

/** Whether the player holds the notebook, derived from the stable read list. */
function useJournalUnlocked() {
  const documentsRead = useMuseum((state) => state.progress.documentsRead)
  return useMemo(() => journalUnlocked(MUSEUM, documentsRead), [documentsRead])
}

/**
 * Shown once, when the player has just picked up one of their tools: what it
 * now does, and how to use it.
 *
 * "Once" is a flag in the save, not the state at mount: opening the notebook
 * already counts as reading it, so a reload with the notebook still open
 * used to skip the only lesson about Tab for good.
 */
function TakenToast({
  taken,
  waiting,
  hintId,
  titleKey,
  keyboardKey,
  touchKey,
  chime,
}: {
  readonly taken: boolean
  /** Hold the lesson until the player is done with the thing itself. */
  readonly waiting: boolean
  readonly hintId: string
  readonly titleKey: TranslationKey
  readonly keyboardKey: TranslationKey
  readonly touchKey: TranslationKey
  readonly chime: boolean
}) {
  const alreadyShown = useMuseum((state) => state.progress.hintsShown.includes(hintId))
  const recordHint = useMuseum((state) => state.recordHint)
  const coarse = useCoarsePointer()
  const t = useTranslate()
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!shouldAnnounceTaken({ taken, waiting, alreadyShown })) return
    recordHint(hintId)
    setShown(true)
    if (chime) museumAudio.chime()
  }, [alreadyShown, chime, hintId, recordHint, taken, waiting])

  // Its own effect, keyed only on `shown`: opening a drawer during these few
  // seconds must not cancel the timer and leave the toast up for good.
  useEffect(() => {
    if (!shown) return undefined
    const timer = window.setTimeout(() => setShown(false), 5200)
    return () => window.clearTimeout(timer)
  }, [shown])

  if (!shown) return null
  return (
    <div className="toast" role="status">
      <span className="toast-mark">✓</span>
      <span>
        {t(titleKey)} — {coarse ? t(touchKey) : t(keyboardKey)}
      </span>
    </div>
  )
}

/** The journal exists once the notebook closes in the player's hands. */
function JournalTakenToast() {
  const unlocked = useJournalUnlocked()
  const reading = useMuseum((state) => state.openedContainer !== null)
  return (
    <TakenToast
      taken={unlocked}
      waiting={reading}
      hintId={PRE_OPENING_SAVE.journalHintId}
      titleKey="journal.taken"
      keyboardKey="journal.taken.keyboard"
      touchKey="journal.taken.touch"
      chime
    />
  )
}

/**
 * Taking the radio is said at once and without a chime: the porter's squelch
 * a moment later is the sound of it working.
 */
function RadioTakenToast() {
  const held = useMuseum((state) => heldRadioId(state.progress.devicesCarried, MUSEUM) !== null)
  return (
    <TakenToast
      taken={held}
      waiting={false}
      hintId="radio-taken"
      titleKey="radio.taken"
      keyboardKey="radio.taken.keyboard"
      touchKey="radio.taken.touch"
      chime={false}
    />
  )
}

function TorchIcon() {
  return (
    <svg className="hud-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 3h9.6l-1.5 5.3H8.7z" />
      <rect x="8.7" y="9.3" width="6.6" height="11.7" rx="1.4" />
      <rect x="11" y="12.3" width="2" height="3.2" rx="0.6" className="hud-tool-icon-cut" />
    </svg>
  )
}

function NotebookIcon() {
  return (
    <svg className="hud-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="1.6" />
      <rect x="7.6" y="3" width="1.6" height="18" className="hud-tool-icon-cut" />
      <rect x="15.4" y="3" width="1.4" height="18" className="hud-tool-icon-cut" />
    </svg>
  )
}

function RadioIcon() {
  return (
    <svg className="hud-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9.3" y="1.6" width="1.9" height="6.4" rx="0.9" />
      <rect x="7" y="7" width="10" height="15.4" rx="1.8" />
      <rect x="8.8" y="9" width="6.4" height="3.4" rx="0.5" className="hud-tool-icon-cut" />
      <rect x="8.8" y="14.6" width="6.4" height="1.2" rx="0.4" className="hud-tool-icon-cut" />
      <rect x="8.8" y="17.2" width="6.4" height="1.2" rx="0.4" className="hud-tool-icon-cut" />
    </svg>
  )
}

/**
 * The radio button, once the handset is in hand: a press calls the porter
 * from any room (or moves him on a line while he talks). It opens nothing,
 * so it leaves the pointer lock alone.
 */
function RadioTool({ radioId }: { readonly radioId: string }) {
  const onAir = useMuseum((state) => state.radio !== null)
  const hungUp = useMuseum((state) => state.radioHungUpUntil !== null)
  const calls = useMuseum((state) => state.progress.radioMemory[radioId]?.calls ?? 0)
  const t = useTranslate()
  const { modifiers, labelKey } = radioToolState({ onAir, hungUp, calls })

  return (
    <button
      type="button"
      className={['hud-tool', 'is-radio', ...modifiers].join(' ')}
      aria-label={t(labelKey)}
      title={t(labelKey)}
      onClick={() => placeRadioCall(radioId)}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <RadioIcon />
      <span className="hud-tool-key" aria-hidden="true">
        R
      </span>
    </button>
  )
}

/**
 * The player's tools, bottom right: the radio and the notebook (once each is
 * carried) and the torch, last in the DOM so it sits in the corner on a
 * desktop and closest to the thumb, directly above the right-hand stick, on
 * touch.
 *
 * The torch pulses while the player stands in a dark room and has never
 * switched it on — the first verb of the game is to light the way.
 */
function HudTools() {
  const on = useMuseum((state) => state.flashlightOn)
  const used = useMuseum((state) => state.flashlightUsed)
  const toggle = useMuseum((state) => state.toggleFlashlight)
  const journalTab = useMuseum((state) => state.journalTab)
  const setJournalTab = useMuseum((state) => state.setJournalTab)
  const currentRoom = useMuseum((state) => state.currentRoom)
  const restored = useMuseum((state) => state.progress.roomsPowered)
  const heldRadio = useMuseum((state) => heldRadioId(state.progress.devicesCarried, MUSEUM))
  const unlocked = useJournalUnlocked()
  const t = useTranslate()

  const room = MUSEUM.rooms.find((candidate) => candidate.id === currentRoom)
  const dark = room ? !isRoomPowered(room, restored) : false
  const hinting = dark && !used && !on

  return (
    <div className="hud-tools">
      {heldRadio ? <RadioTool radioId={heldRadio} /> : null}
      {unlocked ? (
        <button
          type="button"
          className="hud-tool is-journal"
          aria-label={t('ui.journal.open')}
          title={t('ui.journal.open')}
          aria-pressed={journalTab !== null}
          onClick={() => {
            if (document.pointerLockElement) document.exitPointerLock()
            setJournalTab(journalTab ? null : 'map')
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <NotebookIcon />
          <span className="hud-tool-key" aria-hidden="true">
            Tab
          </span>
        </button>
      ) : null}
      <button
        type="button"
        className={`hud-tool is-torch${on ? ' is-on' : ''}${hinting ? ' is-hinting' : ''}`}
        aria-label={on ? t('ui.torch.on') : t('ui.torch.off')}
        title={t('ui.torch')}
        aria-pressed={on}
        onClick={toggle}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <TorchIcon />
        <span className="hud-tool-key" aria-hidden="true">
          F
        </span>
      </button>
    </div>
  )
}

/**
 * "Clique para olhar", bottom left, at a desktop whose mouse is free.
 *
 * Every panel that needs the cursor releases the pointer lock on purpose,
 * and closing it does not take the lock back (Esc cannot, and E is not a
 * click). Without a word on screen the camera simply stops turning.
 */
function LookHint() {
  const sceneReady = useMuseum((state) => state.sceneReady)
  const pointerLocked = useMuseum((state) => state.pointerLocked)
  const modal = useMuseum(isModalOpen)
  const coarse = useCoarsePointer()
  const t = useTranslate()

  if (!lookHintVisible({ sceneReady, pointerLocked, modal, coarse })) return null
  return (
    <div className="look-hint" aria-hidden="true">
      {t('ui.lookHint')}
    </div>
  )
}

export function Hud() {
  const modal = useMuseum(isModalOpen)

  return (
    <>
      <MobileControls />
      {/* Under any modal there is nothing to aim at and nothing for E to do
          in the world: no crosshair, no tools, no prompts. */}
      {modal ? null : (
        <>
          <div className="crosshair" aria-hidden="true" />
          <HudTools />
          <InteractionPrompt />
          <ContainerPrompt />
          <PowerPrompt />
          <DevicePrompt />
          <TransitionDoorPrompt />
        </>
      )}
      <LookHint />
      <RadioSubtitles />
      <ExaminePanel />
      <DocumentPanel />
      <LockPanel />
      {/* One stack, so the notebook, the lamp and a catalogue entry arriving
          seconds apart queue up instead of printing over one another. */}
      <div className="toast-stack">
        <CatalogueToast />
        <PowerToast />
        <DoorReleasedToast />
        <JournalTakenToast />
        <RadioTakenToast />
      </div>
    </>
  )
}
