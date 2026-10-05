/**
 * The curator's notebook, as rules over content and the save.
 *
 * Kept pure and separate from the React panel because three systems ask the
 * same questions — the container targeting (does E turn a page or close?),
 * the scene (is the notebook still on the desk?) and the journal (has the
 * player picked it up?) — and they must never disagree.
 */

import type { ContainerData, MuseumContent, NotebookPage } from '../content/schema'

type NotebookContent = Pick<MuseumContent, 'rooms' | 'documents'>

export function containerById(content: NotebookContent, containerId: string | null) {
  if (!containerId) return undefined
  return content.rooms
    .flatMap((room) => room.containers ?? [])
    .find((candidate) => candidate.id === containerId)
}

/** Every page held by a container, in document order. */
export function notebookPagesFor(
  content: NotebookContent,
  containerId: string | null,
): readonly NotebookPage[] {
  if (!containerId) return []
  return content.documents
    .filter((doc) => doc.containerId === containerId)
    .flatMap((doc) => doc.pages ?? [])
}

export function isNotebook(container: ContainerData | undefined) {
  return container?.presentation === 'notebook'
}

/**
 * The list the journal opens on: the first checklist page of the content, or
 * null for a content that has none. One list for the whole museum; where the
 * player first read it is the notebook on the desk, and the journal carries
 * the same page, alive.
 */
export function checklistPageOf(content: Pick<MuseumContent, 'documents'>): NotebookPage | null {
  for (const doc of content.documents) {
    const page = (doc.pages ?? []).find((candidate) => candidate.style === 'checklist')
    if (page) return page
  }
  return null
}

/**
 * Whether the container's object has left its furniture with the player.
 *
 * Only a journal-carrying container is ever taken, and only once everything
 * in it has been read — reading is the act of picking it up.
 */
export function isContainerTaken(
  content: NotebookContent,
  container: ContainerData,
  documentsRead: readonly string[],
) {
  if (!container.carriesJournal) return false
  const inside = content.documents.filter((doc) => doc.containerId === container.id)
  return inside.length > 0 && inside.every((doc) => documentsRead.includes(doc.id))
}

/**
 * The journal exists once the player holds the notebook.
 *
 * A content set without a journal-carrying container keeps the original
 * behaviour — the journal is simply available — so a wing authored for
 * testing never has to stage the opening scene first.
 */
export function journalUnlocked(content: NotebookContent, documentsRead: readonly string[]) {
  const carriers = content.rooms
    .flatMap((room) => room.containers ?? [])
    .filter((container) => container.carriesJournal)
  if (carriers.length === 0) return true
  return carriers.some((container) => isContainerTaken(content, container, documentsRead))
}

/** E on an open notebook turns the page; on its last page it closes. */
export function notebookAdvance(pageCount: number, page: number): number | 'close' {
  return page + 1 < pageCount ? page + 1 : 'close'
}
