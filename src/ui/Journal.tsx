/**
 * The curator's journal: the director's list, map, catalogue, archive and
 * credits.
 *
 * One screen with five tabs rather than five separate menus, because the
 * diegetic container is a single thing the curator carries — a gallery guide
 * with the floorplan on the front and the accession notes in the back. It also
 * means one keybinding to learn.
 *
 * Opening it releases pointer lock, which is what the player expects: they are
 * looking at a book, not at the room.
 *
 * It is the notebook found on the curator's desk, so it does not exist until
 * the player has picked that up: before then Tab does nothing, and afterwards
 * the HUD shows its icon for touch players, who have no Tab key.
 */

import { useEffect, useState } from 'react'

import { formatCreditEntry } from '../content/credit'
import { MUSEUM } from '../content/museum'
import { checklistPageOf, journalUnlocked } from '../engine/notebook'
import { transcriptText } from '../engine/readingQueue'
import { useTranslate } from '../i18n'
import { useMuseum, type JournalTab } from '../state/store'
import { closeLabel, JOURNAL_HOME_TAB } from './hudRules'
import { MuseumMap } from './MuseumMap'
import { NotebookPageView } from './Notebook'
import { useCoarsePointer } from './useCoarsePointer'

type Tab = JournalTab

/**
 * The director's list, as it stands now: the page the player read on the
 * desk, drawn by the same component, so it ticks and counts here as it does
 * there. It is the notebook's first tab because it is what the player comes
 * back for between rooms: what is left to do before nine.
 */
function NotebookTab() {
  const page = checklistPageOf(MUSEUM)
  if (!page) return null

  return (
    <div className="notebook-sheet is-inline">
      <NotebookPageView page={page} />
    </div>
  )
}

function CatalogueTab() {
  const catalogued = useMuseum((state) => state.progress.catalogued)
  const t = useTranslate()

  const entries = MUSEUM.exhibits.filter((exhibit) => catalogued.includes(exhibit.id))

  if (entries.length === 0) {
    return <p className="journal-empty">{t('catalogue.empty')}</p>
  }

  return (
    <>
      <p className="journal-count">
        {entries.length} / {MUSEUM.exhibits.length}
      </p>
      <dl className="journal-entries">
        {entries.map((exhibit) => (
          <div key={exhibit.id}>
            <dt>{t(exhibit.titleKey as never)}</dt>
            <dd>{t(exhibit.catalogueKey as never)}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

function ArchiveTab() {
  const read = useMuseum((state) => state.progress.documentsRead)
  const t = useTranslate()
  const [open, setOpen] = useState<string | null>(null)

  const found = MUSEUM.documents.filter((doc) => read.includes(doc.id))

  if (found.length === 0) {
    return <p className="journal-empty">{t('archive.empty')}</p>
  }

  return (
    <div className="journal-archive">
      <ul className="journal-doclist">
        {found.map((doc) => (
          <li key={doc.id}>
            <button
              type="button"
              className={open === doc.id ? 'is-open' : ''}
              onClick={() => setOpen(open === doc.id ? null : doc.id)}
            >
              {t(doc.titleKey as never)}
            </button>
          </li>
        ))}
      </ul>

      {open ? <ArchiveDocument documentId={open} /> : null}
    </div>
  )
}

/**
 * A filed document; a paged notebook is re-read as its pages, in order, and
 * a recording as what was said, in one paragraph.
 */
function ArchiveDocument({ documentId }: { documentId: string }) {
  const t = useTranslate()
  const doc = MUSEUM.documents.find((candidate) => candidate.id === documentId)
  if (!doc) return null

  return (
    <article className="journal-doc">
      <h3>{t(doc.titleKey as never)}</h3>
      {doc.pages ? (
        <div className="journal-pages">
          {doc.pages.map((page, index) => (
            <div key={index} className="notebook-sheet is-inline">
              <NotebookPageView page={page} />
            </div>
          ))}
        </div>
      ) : (
        <p>{doc.lineKeys ? transcriptText(doc.lineKeys.map((key) => t(key as never))) : t(doc.bodyKey as never)}</p>
      )}
    </article>
  )
}

/**
 * The credits wall.
 *
 * Every CC licence requires attribution at the point of use, and a museum
 * credits its lenders. The compact line already appears under each artwork in
 * the gallery; this is the full record with working links, which is what makes
 * the attribution genuinely complete rather than decorative.
 */
function CreditsTab() {
  const locale = useMuseum((state) => state.settings.locale)
  const t = useTranslate()

  return (
    <>
      <p className="journal-note">{t('credits.note')}</p>
      <ul className="journal-credits">
        {MUSEUM.media.map((asset) => {
          const entry = formatCreditEntry(asset.credit, locale)
          return (
            <li key={asset.id}>
              <span className="credit-title">{entry.title}</span>
              {entry.author ? <span className="credit-author">{entry.author}</span> : null}
              <span className="credit-licence">{entry.licenseLabel}</span>
              {entry.detail ? <span className="credit-detail">{entry.detail}</span> : null}
              <span className="credit-links">
                {entry.sourceUrl ? (
                  <a href={entry.sourceUrl} target="_blank" rel="noreferrer noopener">
                    {t('credits.source')}
                  </a>
                ) : null}
                {entry.licenseUrl ? (
                  <a href={entry.licenseUrl} target="_blank" rel="noreferrer noopener">
                    {t('credits.licence')}
                  </a>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function Journal() {
  const openTab = useMuseum((state) => state.journalTab)
  const setOpenTab = useMuseum((state) => state.setJournalTab)
  const examining = useMuseum((state) => state.examining)
  const coarse = useCoarsePointer()
  const t = useTranslate()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return

      if (event.code === 'Tab') {
        // Tab moves focus by default, which would walk the player out of the
        // canvas entirely.
        event.preventDefault()
        const state = useMuseum.getState()
        // Never open over the examine view or a document — one modal at a
        // time — and never before the notebook has been picked up.
        if (state.examining || state.openedContainer || state.activeLock) return
        if (!journalUnlocked(MUSEUM, state.progress.documentsRead)) return
        state.setJournalTab(state.journalTab ? null : JOURNAL_HOME_TAB)
        if (document.pointerLockElement) document.exitPointerLock()
      }

      if (event.code === 'Escape') useMuseum.getState().setJournalTab(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (examining) setOpenTab(null)
  }, [examining, setOpenTab])

  if (!openTab) return null

  const tabs: { id: Tab; labelKey: string }[] = [
    { id: 'notebook', labelKey: 'journal.tab.notebook' },
    { id: 'map', labelKey: 'map.title' },
    { id: 'catalogue', labelKey: 'catalogue.title' },
    { id: 'archive', labelKey: 'archive.title' },
    { id: 'credits', labelKey: 'ui.credits' },
  ]

  return (
    <div className="journal" role="dialog" aria-label={t('journal.title')}>
      <div className="journal-panel">
        <nav className="journal-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={tab.id === openTab ? 'is-active' : ''}
              aria-pressed={tab.id === openTab}
              onClick={() => setOpenTab(tab.id)}
            >
              {t(tab.labelKey as never)}
            </button>
          ))}
          <button type="button" className="journal-close" onClick={() => setOpenTab(null)}>
            {closeLabel(t('prompt.close'), 'Tab', coarse)}
          </button>
        </nav>

        <div className="journal-body">
          {openTab === 'notebook' ? <NotebookTab /> : null}
          {openTab === 'map' ? <MuseumMap /> : null}
          {openTab === 'catalogue' ? <CatalogueTab /> : null}
          {openTab === 'archive' ? <ArchiveTab /> : null}
          {openTab === 'credits' ? <CreditsTab /> : null}
        </div>
      </div>
    </div>
  )
}
