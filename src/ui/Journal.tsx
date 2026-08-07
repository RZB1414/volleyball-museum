/**
 * The curator's journal: map, catalogue, archive and credits.
 *
 * One screen with four tabs rather than four separate menus, because the
 * diegetic container is a single thing the curator carries — a gallery guide
 * with the floorplan on the front and the accession notes in the back. It also
 * means one keybinding to learn.
 *
 * Opening it releases pointer lock, which is what the player expects: they are
 * looking at a book, not at the room.
 */

import { useEffect, useState } from 'react'

import { formatCreditEntry } from '../content/credit'
import { MUSEUM } from '../content/museum'
import { useTranslate } from '../i18n'
import { useMuseum } from '../state/store'
import { MuseumMap } from './MuseumMap'

type Tab = 'map' | 'catalogue' | 'archive' | 'credits'

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

      {open ? (
        <article className="journal-doc">
          <h3>{t(MUSEUM.documents.find((d) => d.id === open)!.titleKey as never)}</h3>
          <p>{t(MUSEUM.documents.find((d) => d.id === open)!.bodyKey as never)}</p>
        </article>
      ) : null}
    </div>
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
  const [openTab, setOpenTab] = useState<Tab | null>(null)
  const examining = useMuseum((state) => state.examining)
  const t = useTranslate()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return

      if (event.code === 'Tab') {
        // Tab moves focus by default, which would walk the player out of the
        // canvas entirely.
        event.preventDefault()
        // Never open over the examine view — one modal at a time.
        if (useMuseum.getState().examining) return
        setOpenTab((current) => (current ? null : 'map'))
        if (document.pointerLockElement) document.exitPointerLock()
      }

      if (event.code === 'Escape') setOpenTab(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (examining) setOpenTab(null)
  }, [examining])

  if (!openTab) return null

  const tabs: { id: Tab; labelKey: string }[] = [
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
            {t('prompt.close')} · Tab
          </button>
        </nav>

        <div className="journal-body">
          {openTab === 'map' ? <MuseumMap /> : null}
          {openTab === 'catalogue' ? <CatalogueTab /> : null}
          {openTab === 'archive' ? <ArchiveTab /> : null}
          {openTab === 'credits' ? <CreditsTab /> : null}
        </div>
      </div>
    </div>
  )
}
