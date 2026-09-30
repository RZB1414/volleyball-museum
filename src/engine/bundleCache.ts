/**
 * Bundle cache control.
 *
 * Kept apart from BakedRoom so that file exports only a component and fast
 * refresh keeps working on it — which matters, because it is the file being
 * iterated on while tuning a room.
 */

import { useGLTF } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'

/**
 * Draco is deliberately off everywhere in this project.
 *
 * drei's `useGLTF` defaults `useDraco` to true, which instantiates a
 * DRACOLoader pointed at `https://www.gstatic.com/draco/...`. Everything here
 * is meshopt-compressed, so that decoder is never used — but the default still
 * adds a third-party origin to the request graph that a strict CSP blocks.
 * Meshopt itself is bundled by drei through three-stdlib, no CDN involved.
 */
export const USE_DRACO = false
export const USE_MESHOPT = true

/** Frees drei's cache entry for a bundle so its GPU memory can be reclaimed. */
export function unloadBundle(url: string) {
  useGLTF.clear(url)
}

export function preloadBundle(url: string) {
  useGLTF.preload(url, USE_DRACO, USE_MESHOPT)
}

/** Starts network fetch and image decode without creating a second cache. */
export function preloadTexture(url: string) {
  useLoader.preload(TextureLoader, url)
}
