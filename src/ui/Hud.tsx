/**
 * The 2D layer: interaction prompt, examine panel, catalogue.
 *
 * Deliberately outside the Canvas. Museum label text has to be crisp, wrap
 * properly, resize with the viewport and be selectable by a screen reader —
 * all things the DOM does for free and an SDF quad in 3D space does badly.
 * Text that belongs to the WORLD (the credit under a photograph, a wall label)
 * lives in 3D; text that belongs to the PLAYER lives here.
 */

import { useEffect, useMemo, useRef, useState } from 'react'

import { formatCreditLine } from '../content/credit'
import { MUSEUM } from '../content/museum'
import type { ExhibitData } from '../content/schema'
import { museumAudio } from '../engine/audio'
import { isRoomPowered } from '../engine/power'
import { useTranslate } from '../i18n'
import { LockPanel } from './LockPanel'
import { useMuseum } from '../state/store'

const exhibitsById = new Map<string, ExhibitData>(
  MUSEUM.exhibits.map((exhibit) => [exhibit.id, exhibit]),
)

function InteractionPrompt() {
  const focused = useMuseum((state) => state.focusedExhibit)
  const examining = useMuseum((state) => state.examining)
  const catalogued = useMuseum((state) => state.progress.catalogued)
  const t = useTranslate()

  if (!focused || examining) return null
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
  const focusedContainer = useMuseum((state) => state.focusedContainer)
  const focusedExhibit = useMuseum((state) => state.focusedExhibit)
  const examining = useMuseum((state) => state.examining)
  const read = useMuseum((state) => state.progress.documentsRead)
  const locksOpened = useMuseum((state) => state.progress.locksOpened)
  const t = useTranslate()

  // An exhibit under the crosshair wins the key, so it must also win the hint.
  if (!focusedContainer || focusedExhibit || examining) return null

  const container = MUSEUM.rooms
    .flatMap((room) => room.containers ?? [])
    .find((candidate) => candidate.id === focusedContainer)
  if (!container) return null

  const inside = MUSEUM.documents.filter((doc) => doc.containerId === focusedContainer)
  const allRead = inside.length > 0 && inside.every((doc) => read.includes(doc.id))
  const isLocked = Boolean(container.lockId) && !locksOpened.includes(container.lockId as string)

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
  const focused = useMuseum((state) => state.focusedPowerControl)
  const focusedExhibit = useMuseum((state) => state.focusedExhibit)
  const focusedContainer = useMuseum((state) => state.focusedContainer)
  const examining = useMuseum((state) => state.examining)
  const restored = useMuseum((state) => state.progress.roomsPowered)
  const t = useTranslate()

  if (!focused || focusedExhibit || focusedContainer || examining) return null
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

/** The documents found in a cabinet the player just opened. */
function DocumentPanel() {
  const openedContainer = useMuseum((state) => state.openedContainer)
  const setOpenedContainer = useMuseum((state) => state.setOpenedContainer)
  const t = useTranslate()

  if (!openedContainer) return null

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
          <span className="examine-drag">{t('archive.filed')}</span>
          <button type="button" onClick={() => setOpenedContainer(null)}>
            {t('prompt.close')} · Esc
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
            {t('prompt.close')} · Esc
          </button>
        </div>
      </div>
    </div>
  )
}

/** Brief confirmation when something enters the catalogue. */
function CatalogueToast() {
  const catalogued = useMuseum((state) => state.progress.catalogued)
  const [shown, setShown] = useState<string | null>(null)
  const t = useTranslate()

  useEffect(() => {
    const latest = catalogued[catalogued.length - 1]
    if (!latest) return undefined
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

export function Hud() {
  const examining = useMuseum((state) => state.examining)
  const openedContainer = useMuseum((state) => state.openedContainer)

  return (
    <>
      {/* Meaningless while holding an object or reading a document. */}
      {examining || openedContainer ? null : <div className="crosshair" aria-hidden="true" />}
      <InteractionPrompt />
      <ContainerPrompt />
      <PowerPrompt />
      <ExaminePanel />
      <DocumentPanel />
      <LockPanel />
      <CatalogueToast />
      <PowerToast />
    </>
  )
}
