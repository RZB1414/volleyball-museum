import { Text } from '@react-three/drei'
import plexRegularUrl from '@ibm/plex-sans-condensed/fonts/complete/woff/IBMPlexSansCondensed-Regular.woff?url'
import plexSemiBoldUrl from '@ibm/plex-sans-condensed/fonts/complete/woff/IBMPlexSansCondensed-SemiBold.woff?url'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'

type TextRegistry = {
  markReady: (key: string) => void
  register: (key: string) => () => void
}

const TextReadinessContext = createContext<TextRegistry | null>(null)

/**
 * One local museum face replaces Troika's remote fallback font. Keeping both
 * weights in the same family makes credits, wall copy and wayfinding feel like
 * one institution while still giving large signs a real typographic hierarchy.
 */
export const MUSEUM_FONT_REGULAR = plexRegularUrl
export const MUSEUM_FONT_SEMIBOLD = plexSemiBoldUrl

const MUSEUM_TEXT_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
  'ÁÀÂÃÄÉÊËÍÏÓÔÕÖÚÜÇáàâãäéêëíïóôõöúüç' +
  '0123456789 ·–—.,:;!?\'’"()/%+&'

export function RoomTextReadinessProvider({
  children,
  enabled,
  onReadyChange,
}: {
  children: ReactNode
  enabled: boolean
  onReadyChange: (ready: boolean) => void
}) {
  const expectedRef = useRef(new Set<string>())
  const readyRef = useRef(new Set<string>())
  const [revision, setRevision] = useState(0)

  const registry = useMemo<TextRegistry>(() => ({
    markReady: (key) => {
      if (readyRef.current.has(key)) return
      readyRef.current.add(key)
      setRevision((current) => current + 1)
    },
    register: (key) => {
      if (!expectedRef.current.has(key)) {
        expectedRef.current.add(key)
        setRevision((current) => current + 1)
      }
      return () => {
        if (!expectedRef.current.delete(key)) return
        // Keep the completed signature cached through StrictMode's effect
        // rehearsal. Different copy creates a different key below, so a locale
        // change still has to synchronise the new glyph set.
        setRevision((current) => current + 1)
      }
    },
  }), [])

  useEffect(() => {
    const ready =
      enabled &&
      [...expectedRef.current].every((key) => readyRef.current.has(key))
    onReadyChange(ready)
  }, [enabled, onReadyChange, revision])

  return (
    <TextReadinessContext.Provider value={registry}>
      {children}
    </TextReadinessContext.Provider>
  )
}

type RoomTextProps = ComponentProps<typeof Text> & {
  readinessId: string
}

function textSignature(children: ReactNode): string {
  if (Array.isArray(children)) return children.map(textSignature).join('')
  return typeof children === 'string' || typeof children === 'number'
    ? String(children)
    : ''
}

/** A Drei/Troika text whose real geometry and SDF atlas join room readiness. */
export function RoomText({
  readinessId,
  children,
  onSync,
  font = MUSEUM_FONT_REGULAR,
  characters = MUSEUM_TEXT_CHARACTERS,
  ...props
}: RoomTextProps) {
  const registry = useContext(TextReadinessContext)
  // Font and preload set are part of the generation. A locale/style change
  // must not reuse readiness earned by geometry from another font atlas.
  const key =
    `${readinessId}\u0000${font ?? ''}\u0000${characters ?? ''}` +
    `\u0000${textSignature(children)}`

  useLayoutEffect(() => registry?.register(key), [key, registry])

  const handleSync = useCallback<NonNullable<RoomTextProps['onSync']>>(
    (troika) => {
      registry?.markReady(key)
      onSync?.(troika)
    },
    [key, onSync, registry],
  )

  return (
    <Text
      {...props}
      font={font}
      characters={characters}
      sdfGlyphSize={64}
      onSync={handleSync}
    >
      {children}
    </Text>
  )
}
