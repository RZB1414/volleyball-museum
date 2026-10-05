import { useEffect } from 'react'

import { readerKeyPage } from '../engine/readingQueue'
import { useMuseum } from '../state/store'

/**
 * The arrows and the page keys turn the pages of whichever reader is open:
 * the notebook, and a cabinet read one paper at a time. They were the
 * notebook's alone while it was the only reader with pages.
 *
 * Which key turns to which page is `readerKeyPage`'s to say; the page itself
 * is the store's, the same one E advances.
 */
export function useReaderKeys(open: boolean, lastPage: number) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      const state = useMuseum.getState()
      const page = readerKeyPage(event.code, state.notebookPage, lastPage)
      if (page === null) return
      event.preventDefault()
      state.setNotebookPage(page)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lastPage, open])
}
