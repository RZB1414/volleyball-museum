import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

const hiddenNow = () => document.visibilityState === 'hidden'

/**
 * Whether the page is hidden: another tab, a minimised window, a locked
 * phone. An external store rather than state set in an effect, so the first
 * render already has the answer and no line is counted on a wrong guess.
 */
export function useDocumentHidden() {
  return useSyncExternalStore(subscribe, hiddenNow, () => false)
}
