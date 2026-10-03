/**
 * Runtime material library.
 *
 * The baked GLBs carry plain colour placeholders; the real textured materials
 * are assembled here from `bake.generated.ts` and swapped in by name after a
 * room loads. Textures live as separate files rather than embedded in the GLBs
 * because the same oak appears in three bundles — embedding would ship three
 * copies and defeat per-file caching.
 */

import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  LinearSRGBColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Material,
  type Texture,
} from 'three'
import { useLoader } from '@react-three/fiber'

import { BAKED_MATERIALS, type BakedMaterial } from '../content/bake.generated'
import { createLibraryMaterial } from './materialSpec'

type MaterialKey = keyof typeof BAKED_MATERIALS

/**
 * Collects every distinct texture URL across the library, so a texture shared
 * by several materials is fetched and uploaded to the GPU exactly once.
 */
function collectTextureUrls() {
  const urls = new Set<string>()
  for (const spec of Object.values(BAKED_MATERIALS)) {
    if (!('textures' in spec) || !spec.textures) continue
    urls.add(spec.textures.albedo)
    urls.add(spec.textures.normal)
    urls.add(spec.textures.orm)
  }
  return [...urls].sort()
}

const TEXTURE_URLS = collectTextureUrls()

export type MaterialLibrary = Map<string, Material>

/**
 * Loads the texture set and builds one material per library key.
 *
 * Suspends until every texture is decoded, which is what we want: a room that
 * pops in untextured and then re-materialises a frame later looks broken.
 */
export function useMaterialLibrary(): MaterialLibrary {
  const gl = useThree((state) => state.gl)
  const textures = useLoader(TextureLoader, TEXTURE_URLS) as Texture[]

  const library = useMemo(() => {
    const byUrl = new Map<string, Texture>()
    TEXTURE_URLS.forEach((url, index) => byUrl.set(url, textures[index]))

    const maxAnisotropy = gl.capabilities.getMaxAnisotropy()

    /**
     * Colour space is the classic silent bug here. Albedo is a colour and must
     * be decoded as sRGB; normal and ORM are DATA and must stay linear. Tagging
     * an ORM map as sRGB gamma-shifts every roughness value and produces
     * lighting that is subtly wrong in a way that is very hard to trace back to
     * its cause.
     */
    const configure = (texture: Texture, kind: 'colour' | 'data') => {
      texture.colorSpace = kind === 'colour' ? SRGBColorSpace : LinearSRGBColorSpace
      // Box projection puts UVs well outside 0..1 so surfaces tile; without
      // RepeatWrapping every wall would show one stretched texel band.
      texture.wrapS = RepeatWrapping
      texture.wrapT = RepeatWrapping
      // The floor is the surface most often seen at a grazing angle, which is
      // exactly where anisotropy earns its keep.
      texture.anisotropy = Math.min(8, maxAnisotropy)
      // Every generated map is authored against UV set 0. three's aoMap
      // historically defaulted to the second UV set, and geometry with only one
      // would silently render unoccluded.
      texture.channel = 0
      texture.needsUpdate = true
      return texture
    }

    const materials: MaterialLibrary = new Map()

    for (const [key, entry] of Object.entries(BAKED_MATERIALS)) {
      const spec: BakedMaterial = entry
      const albedo = spec.textures ? byUrl.get(spec.textures.albedo) : undefined
      const normal = spec.textures ? byUrl.get(spec.textures.normal) : undefined
      const orm = spec.textures ? byUrl.get(spec.textures.orm) : undefined
      materials.set(
        key,
        createLibraryMaterial(key, spec, {
          albedo: albedo ? configure(albedo, 'colour') : undefined,
          normal: normal ? configure(normal, 'data') : undefined,
          orm: orm ? configure(orm, 'data') : undefined,
        }),
      )
    }

    return materials
  }, [gl, textures])

  // R3F only auto-disposes what it created through JSX props. These materials
  // are built imperatively, so nothing else will ever free them.
  useEffect(() => {
    return () => {
      for (const material of library.values()) material.dispose()
    }
  }, [library])

  return library
}

export function preloadMaterialTextures() {
  useLoader.preload(TextureLoader, TEXTURE_URLS)
}

export type { MaterialKey }
