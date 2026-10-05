/**
 * What a container hands over to be read, one page at a time.
 *
 * A cabinet used to pour every paper it held into one column: two letters
 * read as one long one, and a third would have scrolled. The reader shows a
 * page, and E (or a button, or an arrow key) turns to the next; on the last,
 * E closes. That is the rule the notebook always had (`notebookAdvance`),
 * asked now of every container.
 *
 * What is RECORDED is not paged: opening a container reads everything in it
 * at once (`containerGrant`), as it always did. The reader is only how it is
 * shown.
 *
 * Pure, so the suites ask it without a DOM.
 */

import type { DocumentData, MuseumContent, NotebookPage } from '../content/schema'
import { containerById, isNotebook, notebookAdvance, notebookPagesFor } from './notebook.ts'

/** One screen of the reader, with the paper it belongs to. */
export type ReadingPage =
  /** A plain paper: its title and its body. */
  | { readonly documentId: string; readonly kind: 'body'; readonly titleKey: string; readonly bodyKey: string }
  /** One page of a bound document, in its own typography. */
  | { readonly documentId: string; readonly kind: 'page'; readonly titleKey: string; readonly page: NotebookPage }
  /** A recording, as what was said. */
  | { readonly documentId: string; readonly kind: 'transcript'; readonly titleKey: string; readonly lineKeys: readonly string[] }

/** The pages one document is read as: its own pages, its transcript, or its body. */
export function documentReadPages(
  doc: Pick<DocumentData, 'id' | 'titleKey' | 'bodyKey' | 'pages' | 'lineKeys'>,
): readonly ReadingPage[] {
  const from = { documentId: doc.id, titleKey: doc.titleKey }
  if (doc.pages) return doc.pages.map((page) => ({ ...from, kind: 'page', page }))
  if (doc.lineKeys) return [{ ...from, kind: 'transcript', lineKeys: doc.lineKeys }]
  return [{ ...from, kind: 'body', bodyKey: doc.bodyKey }]
}

/** Every page a container hands over: one document after another, in content order, each in its own page order. */
export function containerReadQueue(
  content: Pick<MuseumContent, 'documents'>,
  containerId: string | null,
): readonly ReadingPage[] {
  if (!containerId) return []
  return content.documents.filter((doc) => doc.containerId === containerId).flatMap(documentReadPages)
}

type ReaderContent = Pick<MuseumContent, 'rooms' | 'documents'>

/**
 * How many pages the reader of a container turns. A notebook turns the pages
 * of what is bound in it, as its own panel draws them; anything else, the
 * queue above.
 */
export function readerPageCount(content: ReaderContent, containerId: string | null): number {
  return isNotebook(containerById(content, containerId))
    ? notebookPagesFor(content, containerId).length
    : containerReadQueue(content, containerId).length
}

/** E on an open reader: the next page, or `close` from the last. */
export function readerAdvance(content: ReaderContent, containerId: string | null, page: number): number | 'close' {
  return notebookAdvance(readerPageCount(content, containerId), page)
}

/**
 * The page a key turns to, or null for a key that turns none. The arrows and
 * the page keys stop at each end: closing is E's, Esc's and the button's.
 */
export function readerKeyPage(code: string, page: number, lastPage: number): number | null {
  if (code === 'ArrowRight' || code === 'PageDown') return Math.min(lastPage, page + 1)
  if (code === 'ArrowLeft' || code === 'PageUp') return Math.max(0, page - 1)
  return null
}

/** A transcript as it is printed: what was said, line after line, as one paragraph. */
export function transcriptText(lines: readonly string[]): string {
  return lines.join(' ')
}
