import { useEffect, useState } from 'react'

/**
 * The same query as the touch layout in `museum.css`, so a hint worded for
 * touch appears exactly when the keyboard glyphs are hidden. iPads with a
 * trackpad report a coarse pointer too, and narrow landscape covers the
 * WebViews that advertise none.
 */
export const COARSE_POINTER_QUERY =
  '(any-pointer: coarse), (max-width: 900px) and (orientation: landscape)'

/** Touch layouts hide the keyboard glyphs, so hints are worded per input. */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(COARSE_POINTER_QUERY).matches,
  )
  useEffect(() => {
    const media = window.matchMedia(COARSE_POINTER_QUERY)
    const update = () => setCoarse(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return coarse
}
