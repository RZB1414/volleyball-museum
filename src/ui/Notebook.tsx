/**
 * The curator's notebook, read page by page.
 *
 * A notebook is not a document panel with a scrollbar: the welcome is printed
 * on the flyleaf, the director's letter is handwritten on ruled paper and the
 * to-do list ticks itself as the night goes on. Each page keeps its own
 * typography, and E, the arrow keys or the buttons turn them — the same E that
 * opened it closes it from the last page.
 */

import { useEffect } from 'react'

import { MUSEUM } from '../content/museum'
import type { NotebookPage } from '../content/schema'
import { containerById, notebookPagesFor } from '../engine/notebook'
import { progressConditionMet } from '../engine/progressCondition'
import { useTranslate } from '../i18n'
import { useMuseum } from '../state/store'

function paragraphs(text: string) {
  return text.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)
}

/** One page, as it is printed or written. Shared with the journal's archive. */
export function NotebookPageView({ page }: { page: NotebookPage }) {
  const progress = useMuseum((state) => state.progress)
  const t = useTranslate()
  const text = (key: string | undefined) => (key ? t(key as never) : '')

  if (page.style === 'checklist') {
    return (
      <div className="notebook-page is-checklist">
        {page.headingKey ? <h3>{text(page.headingKey)}</h3> : null}
        <ul className="notebook-checklist">
          {(page.items ?? []).map((item) => {
            const done = item.doneWhen
              ? progressConditionMet(item.doneWhen, progress, MUSEUM)
              : false
            return (
              <li key={item.labelKey} className={done ? 'is-done' : ''}>
                <span className="notebook-box" aria-hidden="true">
                  {done ? '☑' : '☐'}
                </span>
                <span>{text(item.labelKey)}</span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className={`notebook-page is-${page.style}`}>
      {page.headingKey ? <h3>{text(page.headingKey)}</h3> : null}
      {page.bodyKey ? paragraphs(text(page.bodyKey)) : null}
      {page.signatureKey ? <p className="notebook-signature">{text(page.signatureKey)}</p> : null}
      {page.postscriptKey ? <p className="notebook-postscript">{text(page.postscriptKey)}</p> : null}
    </div>
  )
}

export function NotebookPanel() {
  const openedContainer = useMuseum((state) => state.openedContainer)
  const page = useMuseum((state) => state.notebookPage)
  const setPage = useMuseum((state) => state.setNotebookPage)
  const close = useMuseum((state) => state.setOpenedContainer)
  const t = useTranslate()

  const container = containerById(MUSEUM, openedContainer)
  const pages = notebookPagesFor(MUSEUM, openedContainer)
  const lastPage = pages.length - 1

  useEffect(() => {
    if (!openedContainer || pages.length === 0) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      const state = useMuseum.getState()
      if (event.code === 'ArrowRight' || event.code === 'PageDown') {
        event.preventDefault()
        state.setNotebookPage(Math.min(lastPage, state.notebookPage + 1))
      }
      if (event.code === 'ArrowLeft' || event.code === 'PageUp') {
        event.preventDefault()
        state.setNotebookPage(Math.max(0, state.notebookPage - 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lastPage, openedContainer, pages.length])

  if (!container || pages.length === 0) return null
  const current = pages[Math.min(page, lastPage)]

  return (
    <div className="notebook" role="dialog" aria-label={t(container.titleKey as never)}>
      <div className="notebook-sheet">
        <div className="notebook-body" aria-live="polite">
          <NotebookPageView page={current} />
        </div>
        <div className="notebook-actions">
          <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0}>
            ← {t('notebook.previous')}
          </button>
          <span className="notebook-folio">
            {Math.min(page, lastPage) + 1} / {pages.length}
          </span>
          {page < lastPage ? (
            <button type="button" className="is-primary" onClick={() => setPage(page + 1)}>
              {t('notebook.next')} →
            </button>
          ) : (
            <button type="button" className="is-primary" onClick={() => close(null)}>
              {t('prompt.close')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
