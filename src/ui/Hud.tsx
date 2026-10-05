/**
 * The 2D layer: interaction prompt, examine panel, catalogue.
 *
 * Deliberately outside the Canvas. Museum label text has to be crisp, wrap
 * properly, resize with the viewport and be selectable by a screen reader —
 * all things the DOM does for free and an SDF quad in 3D space does badly.
 * Text that belongs to the WORLD (the credit under a photograph, a wall label)
 * lives in 3D; text that belongs to the PLAYER lives here.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'

// The content's rules reach the store as this module is evaluated, before
// anything here renders. The HUD is a chunk of its own and may arrive ahead
// of the canvas, which registers them too: without this line a toast could
// first see a save the content has not settled yet, and announce as taken
// now a key that an open drawer was owed since another night.
import '../engine/contentRegistry'

import { formatCreditLine } from '../content/credit'
import { PRE_OPENING_SAVE } from '../content/legacySave'
import { MUSEUM } from '../content/museum'
import type { ExhibitData } from '../content/schema'
import type { TranslationKey } from '../content/i18n/pt-BR'
import { museumAudio } from '../engine/audio'
import { aimableDevices, deviceInputOf, deviceIntent, deviceSetFlag, radioLineSeconds } from '../engine/deviceRules'
import { readHoldMark } from '../engine/holdAction'
import {
  interactionWinnerKey,
  parseInteractionWinnerKey,
  type InteractionKind,
} from '../engine/interactionTarget'
import { lockBars, lockStatus } from '../engine/lockRules'
import { fillHour } from '../engine/nightClock'
import { checklistPageOf, containerById, isNotebook, journalUnlocked } from '../engine/notebook'
import { isRoomPowered } from '../engine/power'
import { primaryHoldMark, subscribePrimaryHold } from '../engine/primaryAction'
import { credentialKey } from '../engine/progressCondition'
import { placeRadioCall, releaseHeldRadio } from '../engine/radioCall'
import { heldRadioId } from '../engine/radioPatience'
import { containerReadQueue, transcriptText, type ReadingPage } from '../engine/readingQueue'
import { useTranslate } from '../i18n'
import {
  archiveFiledKey,
  closeLabel,
  JOURNAL_HOME_TAB,
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
import { NotebookPageView, NotebookPanel } from './Notebook'
import {
  checklistToastStep,
  clockJustSet,
  containerPrompt,
  credentialsTaken,
  deskMissingText,
  devicePrompt,
} from './promptRules'
import { SequenceOverlay } from './SequenceOverlay'
import { useCoarsePointer } from './useCoarsePointer'
import { useDocumentHidden } from './useDocumentHidden'
import { useNightPhraseKey } from './useNightPhraseKey'
import { useReaderKeys } from './useReaderKeys'
import { isModalOpen, useMuseum } from '../state/store'

/** Every device the crosshair may rest on, by id: the ones a prompt is drawn for. */
const devicesById = new Map(aimableDevices(MUSEUM).map((entry) => [entry.device.id, entry.device]))
/** The flag each clock that can be set leaves in the save: what the clock's toast waits for. */
const clockFlags: ReadonlySet<string> = new Set(
  MUSEUM.rooms.flatMap((room) =>
    (room.devices ?? []).flatMap((device) => {
      const flag = deviceSetFlag(device)
      return flag === null ? [] : [flag]
    }),
  ),
)
/** The name each credential the house declares is announced by, by its key in the save. */
const credentialTitles: ReadonlyMap<string, string> = new Map(
  (MUSEUM.credentials ?? []).map((entry) => [credentialKey(entry.credential), entry.titleKey]),
)
/** The lines of the notebook's list: what the toast of a line just noted watches. */
const checklistItems = checklistPageOf(MUSEUM)?.items ?? []
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
 *
 * While its lock bars the way the prompt leads with the name and lets the
 * lock say the rest («Gaveta do Otávio — trancada (um ano)»); how it is
 * worded is `containerPrompt`'s to decide, where a suite can ask it. A shut
 * lock that this press opens (the key is in the hand) is not said to need
 * what the player holds: whether it bars is `lockBars`'s to say, by the
 * answer the press itself acts on.
 */
function ContainerPrompt() {
  const focusedContainer = useWinner('container')?.id ?? null
  const read = useMuseum((state) => state.progress.documentsRead)
  const locksOpened = useMuseum((state) => state.progress.locksOpened)
  const credentials = useMuseum((state) => state.progress.credentials)
  const t = useTranslate()

  if (!focusedContainer) return null

  const container = MUSEUM.rooms
    .flatMap((room) => room.containers ?? [])
    .find((candidate) => candidate.id === focusedContainer)
  if (!container) return null

  const inside = MUSEUM.documents.filter((doc) => doc.containerId === focusedContainer)
  const allRead = inside.length > 0 && inside.every((doc) => read.includes(doc.id))
  const shut = container.lockId !== undefined && lockStatus(container.lockId, { locksOpened }) === 'closed'
  const lock = MUSEUM.locks.find((candidate) => candidate.id === container.lockId)
  // A lock the content does not have is opened by nothing, and bars for good.
  const barred = shut && (lock === undefined || lockBars(lock, MUSEUM.facts, { locksOpened, credentials }))
  const view = containerPrompt(container, lock, barred, shut && !barred)

  return (
    <div className="prompt" role="status">
      <span className="prompt-key">E</span>
      {view.form === 'locked' ? (
        <>
          <span className="prompt-title">{t(view.titleKey as never)}</span>
          <span className="prompt-label">— {t(view.sayingKey as never)}</span>
        </>
      ) : (
        <>
          <span className="prompt-label">{t(view.labelKey)}</span>
          <span className="prompt-title">{t(view.titleKey as never)}</span>
        </>
      )}
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

/**
 * A device under the crosshair, worded by the intent E acts on.
 *
 * The porter's radio on its desk is live once its charger has power and is
 * taken on the first press. A thing that only says something (the plinth of
 * the hall, until the lot that gives it its use) is drawn as its name and
 * its notice, with no key: there is nothing to press. A thing that speaks
 * (the telephone) is worded by what it would do: dial, listen, listen again.
 * A desk where terms are signed says what it stands at: nothing brought to
 * it, a term that still waits and for what, a term to hold E on, all signed.
 */
function DevicePrompt() {
  const focused = useWinner('device')?.id ?? null
  const progress = useMuseum((state) => state.progress)
  const radio = useMuseum((state) => state.radio)
  const sequence = useMuseum((state) => state.sequence)
  const t = useTranslate()

  const device = focused === null ? undefined : devicesById.get(focused)
  if (!device) return null
  const view = devicePrompt(device, deviceIntent(device, deviceInputOf(device, { progress, radio, sequence }, MUSEUM)))
  if (!view) return null

  if (view.form === 'hold') return <HoldPrompt holdId={view.holdId} termKey={view.termKey} />
  if (view.form === 'desk') {
    // «Púlpito — Assinar: Termo de posse · falta luz em: Átrio». The rule
    // names what is missing by id; the names are the content's own.
    const missing = deskMissingText(
      {
        rooms: view.missing.rooms.map((id) => t((MUSEUM.rooms.find((room) => room.id === id)?.titleKey ?? id) as never)),
        documents: view.missing.documents.map((id) => t((MUSEUM.documents.find((doc) => doc.id === id)?.titleKey ?? id) as never)),
      },
      { power: t('desk.missing.power'), document: t('desk.missing.document') },
    )
    return (
      <div className="prompt is-long" role="status">
        <span className="prompt-title">{t(view.titleKey as never)}</span>
        <span className="prompt-label">
          — {t('desk.sign')}: {t(view.termKey as never)}
          {missing ? ` · ${missing}` : ''}
        </span>
      </div>
    )
  }
  if (view.form === 'signed') {
    return (
      <div className="prompt is-long" role="status">
        <span className="prompt-title">{t(view.titleKey as never)}</span>
        <span className="prompt-label">
          — {t(view.termKey as never)} · {t('desk.signed')}
        </span>
        <span className="prompt-done">✓</span>
      </div>
    )
  }

  return (
    <div className="prompt" role="status">
      {view.form === 'notice' ? (
        <>
          <span className="prompt-title">{t(view.titleKey as never)}</span>
          <span className="prompt-label">— {t(view.noticeKey as never)}</span>
        </>
      ) : (
        <>
          {view.key ? <span className="prompt-key">E</span> : null}
          <span className="prompt-label">{t(view.labelKey)}</span>
          <span className="prompt-title">{t(view.titleKey as never)}</span>
        </>
      )}
    </div>
  )
}

/**
 * The prompt of a press that is held: «Segure E — Assinar: Termo de posse».
 *
 * What it draws of the hold is read off the shared gesture
 * (`primaryAction.ts`), as one string that changes when the phase does and
 * never frame by frame: while the key is down a ring closes round it, by a
 * CSS animation as long as the hold itself; after a tap, the question, «E
 * Assinar · Esc Cancelar». On a touch screen the key glyphs are hidden and
 * the Action button carries the ring and the two answers (`MobileControls`).
 */
function HoldPrompt({ holdId, termKey }: { readonly holdId: string; readonly termKey: string }) {
  const hold = readHoldMark(useSyncExternalStore(subscribePrimaryHold, primaryHoldMark, () => 'idle'))
  const coarse = useCoarsePointer()
  const t = useTranslate()
  const mine = hold.phase !== 'idle' && hold.id === holdId ? hold : null

  if (mine?.phase === 'confirming') {
    return (
      <div className="prompt hold-confirm" role="status">
        <span className="prompt-key">E</span>
        <span className="prompt-label">{t('desk.sign')}:</span>
        <span className="prompt-title">{t(termKey as never)}</span>
        <span className="hold-cancel">
          <span className="prompt-key">Esc</span>
          <span className="prompt-label">{t('desk.cancel')}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="prompt" role="status">
      <span
        className={mine ? 'prompt-key is-holding' : 'prompt-key'}
        style={mine ? ({ '--hold-seconds': `${mine.seconds}s` } as CSSProperties) : undefined}
      >
        E
      </span>
      <span className="prompt-label">
        {t(coarse ? 'desk.hold.touch' : 'desk.hold.keyboard')} — {t('desk.sign')}:
      </span>
      <span className="prompt-title">{t(termKey as never)}</span>
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
 *
 * A line may say the hour (`{hora}`): it is filled here with the phrase the
 * night stands at, so the porter never reads a number somebody typed into a
 * sentence, and the token never reaches the screen.
 */
function RadioSubtitles() {
  const radio = useMuseum((state) => state.radio)
  const modal = useMuseum(isModalOpen)
  const hidden = useDocumentHidden()
  const held = radioHeld({ modal, hidden })
  const advance = useMuseum((state) => state.advanceRadio)
  const hourKey = useNightPhraseKey()
  const t = useTranslate()
  const line = radio ? fillHour(t(radio.lineKeys[radio.index] as never), hourKey ? t(hourKey as never) : null) : ''
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

/** One screen of the reader: a paper's body, a page of a bound one, or what a recording said. */
function ReadingPageBody({ page }: { page: ReadingPage }) {
  const t = useTranslate()
  if (page.kind === 'page') {
    // In its own typography, on its own sheet, as the journal re-reads it.
    return (
      <div className="notebook-sheet is-inline">
        <NotebookPageView page={page.page} />
      </div>
    )
  }
  const text =
    page.kind === 'transcript' ? transcriptText(page.lineKeys.map((key) => t(key as never))) : t(page.bodyKey as never)
  return <p className="examine-label">{text}</p>
}

/**
 * What a cabinet the player just opened holds, one paper at a time.
 *
 * It used to pour every document of the container into one column. Now it
 * shows one page of `containerReadQueue`, and E, the arrow keys or the
 * buttons turn to the next; the page is the store's, the one a notebook
 * turns, and it starts at the first whenever a container opens. Everything
 * in the cabinet was recorded as read by the press that opened it: the
 * reader is how it is shown, not what the save waits for.
 */
function DocumentPanel() {
  const openedContainer = useMuseum((state) => state.openedContainer)
  const page = useMuseum((state) => state.notebookPage)
  const setPage = useMuseum((state) => state.setNotebookPage)
  const setOpenedContainer = useMuseum((state) => state.setOpenedContainer)
  const unlocked = useJournalUnlocked()
  const coarse = useCoarsePointer()
  const t = useTranslate()
  // Notebooks have their own page-turning reader, and their own keys.
  const notebook = isNotebook(containerById(MUSEUM, openedContainer))
  const queue = useMemo(
    () => (notebook ? [] : containerReadQueue(MUSEUM, openedContainer)),
    [notebook, openedContainer],
  )
  const lastPage = queue.length - 1
  useReaderKeys(queue.length > 0, lastPage)

  if (!openedContainer) return null
  if (notebook) return <NotebookPanel />
  if (queue.length === 0) return null

  const shown = Math.min(page, lastPage)
  const current = queue[shown]

  return (
    <div className="examine" role="dialog" aria-label={t('archive.title')}>
      {/* `is-reader`: the paper scrolls and the buttons under it do not, so
          the way on to the next paper is in sight on every page. */}
      <div className="examine-panel is-reader">
        {/* Keyed by the page, so a paper scrolled to its end does not hand
            its scroll position to the next one. */}
        <article key={shown} className="document" aria-live="polite">
          <h2>{t(current.titleKey as never)}</h2>
          <ReadingPageBody page={current} />
        </article>

        <div className="examine-actions">
          <span className="examine-drag">{t(archiveFiledKey(unlocked, coarse))}</span>
          <span className="examine-pager">
            {/* A cabinet with one paper reads as it always did: one button. */}
            {queue.length > 1 ? (
              <>
                <button type="button" onClick={() => setPage(shown - 1)} disabled={shown === 0}>
                  ← {t('notebook.previous')}
                </button>
                <span className="examine-folio">
                  {shown + 1} / {queue.length}
                </span>
              </>
            ) : null}
            {shown < lastPage ? (
              <button type="button" onClick={() => setPage(shown + 1)}>
                {t('reader.next')} →
              </button>
            ) : (
              <button type="button" onClick={() => setOpenedContainer(null)}>
                {closeLabel(t('prompt.close'), 'Esc', coarse)}
              </button>
            )}
          </span>
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

/**
 * A clock has just been put right: said once, with the hour it now shows,
 * in the words the porter would use for it («Relógio acertado — Passa das
 * sete»). The hands are on the far wall and move a quarter turn; without a
 * word the press would seem to have done nothing.
 */
function ClockToast() {
  const flags = useMuseum((state) => state.progress.flags)
  const phraseKey = useNightPhraseKey()
  // The save arrives whole on the first render: a clock set on another night
  // was announced then.
  const seenLength = useRef(flags.length)
  const [shown, setShown] = useState(false)
  const t = useTranslate()

  useEffect(() => {
    const set = clockJustSet(seenLength.current, flags, clockFlags)
    // A new game empties the list; a toast still up belongs to the old one.
    const emptied = flags.length < seenLength.current
    seenLength.current = flags.length
    if (set) {
      setShown(true)
      museumAudio.chime()
    } else if (emptied) setShown(false)
  }, [flags])

  // Its own effect, keyed only on `shown`: another flag set during these
  // few seconds must not cancel the timer and leave the toast up for good.
  useEffect(() => {
    if (!shown) return undefined
    const timer = window.setTimeout(() => setShown(false), 3200)
    return () => window.clearTimeout(timer)
  }, [shown])

  if (!shown) return null
  return (
    <div className="toast" role="status">
      <span className="toast-mark">✓</span>
      <span>
        {t('clock.set')}
        {phraseKey ? ` — ${t(phraseKey as never)}` : ''}
      </span>
    </div>
  )
}

/**
 * A credential has just been taken: said once, by the name the content
 * gives it («Você pegou — Chave do cofre de ferro»). A key is handed over
 * by a consequence (a drawer that opens), not by a press on the key itself,
 * so without a word the player would hold it and not know.
 *
 * Only what is taken now. The save arrives whole on the first render, and
 * settled: what a trigger owed it as the content arrived is in it already
 * (this module imports the registry for that), so a key from another night,
 * or one handed over at load, is not announced.
 */
function CredentialToast() {
  const credentials = useMuseum((state) => state.progress.credentials)
  const seenLength = useRef(credentials.length)
  const [shown, setShown] = useState<readonly string[]>([])
  const t = useTranslate()

  useEffect(() => {
    const taken = credentialsTaken(seenLength.current, credentials, credentialTitles)
    // A new game empties the list; a toast still up belongs to the old one.
    const emptied = credentials.length < seenLength.current
    seenLength.current = credentials.length
    if (taken.length > 0) {
      setShown(taken)
      museumAudio.chime()
    } else if (emptied) setShown([])
  }, [credentials])

  // Its own effect, keyed only on `shown`: another write during these few
  // seconds must not cancel the timer and leave the toast up for good.
  useEffect(() => {
    if (shown.length === 0) return undefined
    const timer = window.setTimeout(() => setShown([]), 3200)
    return () => window.clearTimeout(timer)
  }, [shown])

  if (shown.length === 0) return null
  return (
    <div className="toast" role="status">
      <span className="toast-mark">✓</span>
      <span>
        {t('credential.taken')} — {shown.map((titleKey) => t(titleKey as never)).join(', ')}
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
 * The curator has just noted something on the list: said once («Anotado no
 * caderno»), so that a line added in pencil, on a page the player is not
 * looking at, does not go unseen. Only for whoever holds the notebook; the
 * line is written either way, and is on the page when it is taken.
 *
 * No chime: what puts a line there (a drawer that opens, a paper read) has
 * a sound and often a toast of its own at the same moment.
 */
function ChecklistToast() {
  const progress = useMuseum((state) => state.progress)
  const unlocked = useJournalUnlocked()
  // The save arrives whole on the first render, and settled: a line noted on
  // another night, or owed at load, was on the list before this looked.
  const seen = useRef(progress)
  const [shown, setShown] = useState(false)
  const t = useTranslate()

  useEffect(() => {
    const step = checklistToastStep(checklistItems, seen.current, progress, MUSEUM, unlocked)
    seen.current = progress
    if (step === 'show') setShown(true)
    else if (step === 'hide') setShown(false)
  }, [progress, unlocked])

  // Its own effect, keyed only on `shown`: another write during these few
  // seconds must not cancel the timer and leave the toast up for good.
  useEffect(() => {
    if (!shown) return undefined
    const timer = window.setTimeout(() => setShown(false), 3200)
    return () => window.clearTimeout(timer)
  }, [shown])

  if (!shown) return null
  return (
    <div className="toast" role="status">
      <span className="toast-mark">✓</span>
      <span>{t('checklist.noted')}</span>
    </div>
  )
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
            setJournalTab(journalTab ? null : JOURNAL_HOME_TAB)
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
      <SequenceOverlay />
      <ExaminePanel />
      <DocumentPanel />
      <LockPanel />
      {/* One stack, so the notebook, the lamp and a catalogue entry arriving
          seconds apart queue up instead of printing over one another. */}
      <div className="toast-stack">
        <CatalogueToast />
        <PowerToast />
        <ClockToast />
        <CredentialToast />
        <ChecklistToast />
        <DoorReleasedToast />
        <JournalTakenToast />
        <RadioTakenToast />
      </div>
    </>
  )
}
