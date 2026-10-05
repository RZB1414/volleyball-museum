/**
 * The curator's notebook, read page by page.
 *
 * A notebook is not a document panel with a scrollbar: the welcome is printed
 * on the flyleaf, the director's letter is handwritten on ruled paper and the
 * to-do list ticks itself as the night goes on. Each page keeps its own
 * typography, and E, the arrow keys or the buttons turn them — the same E that
 * opened it closes it from the last page.
 */

import { MUSEUM } from '../content/museum'
import type { NotebookPage } from '../content/schema'
import { checklistRows, counterText } from '../engine/checklist'
import { containerById, notebookPagesFor } from '../engine/notebook'
import { signedTerms } from '../engine/termRules'
import { useTranslate } from '../i18n'
import { useMuseum } from '../state/store'
import { useReaderKeys } from './useReaderKeys'

function paragraphs(text: string) {
  return text.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)
}

/** One page, as it is printed or written. Shared with the journal's archive. */
export function NotebookPageView({ page }: { page: NotebookPage }) {
  const progress = useMuseum((state) => state.progress)
  const t = useTranslate()
  const text = (key: string | undefined) => (key ? t(key as never) : '')

  if (page.style === 'checklist') {
    // What the list shows is `checklistRows`' to say: which lines are on the
    // page, which have a box, what each counts. This only draws it.
    const rows = checklistRows(page.items ?? [], progress, MUSEUM)
    return (
      <div className="notebook-page is-checklist">
        {page.headingKey ? <h3>{text(page.headingKey)}</h3> : null}
        <ul className="notebook-checklist">
          {rows.map((row) => (
            // Ink for the director's lines, pencil for the curator's own.
            <li key={row.labelKey} className={`is-${row.author}${row.done ? ' is-done' : ''}`}>
              {/* A promise with a date has no box: an empty one beside «not
                  tonight» would sit there unticked for good. */}
              <span className="notebook-box" aria-hidden="true">
                {row.done === null ? '' : row.done ? '☑' : '☐'}
              </span>
              <span className="notebook-line">
                <span className="notebook-label">{text(row.labelKey)}</span>
                {row.counters.map((counter, index) => (
                  <span key={index} className="notebook-count">
                    {counter.titleKey ? `${text(counter.titleKey)} ` : ''}
                    {counterText(t('notebook.counter'), counter.done, counter.of)}
                  </span>
                ))}
                {row.noteKey ? <span className="notebook-note">{text(row.noteKey)}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (page.style === 'term') {
    // The page is the term as it stands in the book: its own title and
    // body, and a signature line that is filled once the save holds the
    // signature. Nothing here is written twice.
    const shown = (MUSEUM.terms ?? []).find((candidate) => candidate.id === page.termId)
    if (!shown) return null
    const isSigned = signedTerms(MUSEUM.terms ?? [], progress).some((term) => term.id === page.termId)
    return (
      <div className="notebook-page is-term">
        <h3>{text(shown.titleKey)}</h3>
        {paragraphs(text(shown.bodyKey))}
        <p className={isSigned ? 'notebook-term-line is-signed' : 'notebook-term-line'}>{isSigned ? t('term.signed') : ''}</p>
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

  useReaderKeys(Boolean(openedContainer) && pages.length > 0, lastPage)

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
