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
  FrontSide,
  LinearSRGBColorSpace,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Material,
  type Texture,
} from 'three'
import { useLoader } from '@react-three/fiber'

import { BAKED_MATERIALS } from '../content/bake.generated'

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

    for (const [key, spec] of Object.entries(BAKED_MATERIALS)) {
      // No `color` key at all. Passing `color: undefined` makes three log
      // "parameter 'color' has value of undefined" for every material it
      // builds — twelve of them, twice under StrictMode.
      const common = {
        name: key,
        roughness: spec.roughness,
        metalness: spec.metalness,
      }

      const hasClearcoat = 'clearcoat' in spec && typeof spec.clearcoat === 'number'
      const material = hasClearcoat
        ? new MeshPhysicalMaterial(common)
        : new MeshStandardMaterial(common)

      material.color.setRGB(
        spec.baseColor[0],
        spec.baseColor[1],
        spec.baseColor[2],
        LinearSRGBColorSpace,
      )

      if ('emissive' in spec && Array.isArray(spec.emissive)) {
        const emissive = spec.emissive as unknown as readonly [number, number, number]
        material.emissive.setRGB(
          emissive[0],
          emissive[1],
          emissive[2],
          LinearSRGBColorSpace,
        )
        material.emissiveIntensity =
          'emissiveIntensity' in spec && typeof spec.emissiveIntensity === 'number'
            ? spec.emissiveIntensity
            : 1
      }

      if ('alphaMode' in spec && spec.alphaMode === 'BLEND') {
        material.transparent = true
        material.opacity = spec.baseColor[3]
        // Vitrine glass must not write depth or it hides the object inside it.
        material.depthWrite = false

        /**
         * Damp the environment reflection hard.
         *
         * A near-mirror dielectric (roughness 0.03) reflects the ceiling almost
         * perfectly, and the ceiling is the brightest thing in a lit gallery.
         * The result was vitrines rendering as solid white slabs with the
         * exhibit invisible behind them, despite an opacity of 0.14 — the
         * transparency was fine, the reflection was drowning it.
         *
         * Real display glass is anti-reflective for exactly this reason: a
         * museum does not want you looking at a picture of the lights.
         */
        material.envMapIntensity = 0.25
        material.roughness = Math.max(material.roughness, 0.09)
        // Two panes of a case are always in front of each other; sorting them
        // against opaque geometry is what stops the far one punching a hole.
        material.side = FrontSide
        material.polygonOffset = true
        material.polygonOffsetFactor = -1
      }

      if (hasClearcoat && material instanceof MeshPhysicalMaterial) {
        material.clearcoat = spec.clearcoat as number
        material.clearcoatRoughness =
          'clearcoatRoughness' in spec ? (spec.clearcoatRoughness as number) : 0.1
      }

      if ('textures' in spec && spec.textures) {
        const albedo = byUrl.get(spec.textures.albedo)
        const normal = byUrl.get(spec.textures.normal)
        const orm = byUrl.get(spec.textures.orm)

        if (albedo) material.map = configure(albedo, 'colour')
        if (normal) material.normalMap = configure(normal, 'data')
        if (orm) {
          // One packed texture serves three slots: three reads occlusion from
          // .r, roughness from .g and metalness from .b.
          const packed = configure(orm, 'data')
          material.aoMap = packed
          material.roughnessMap = packed
          material.metalnessMap = packed
          // The map multiplies the scalar, so the scalars have to be 1 or the
          // texture is scaled down by them.
          material.roughness = 1
          material.metalness = spec.metalness > 0 ? 1 : 0
        }
      }

      materials.set(key, material)
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
