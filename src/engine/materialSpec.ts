/**
 * One baked material spec → one three material.
 *
 * Pure (three only, no React or loaders) so `test:materials` can prove what
 * each spec turns into without a GPU. `materials.ts` owns the loading and the
 * texture configuration and hands the finished maps in here.
 */

import {
  FrontSide,
  LinearSRGBColorSpace,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Texture,
} from 'three'

import type { BakedMaterial } from '../content/bake.generated'

export type MaterialMaps = {
  readonly albedo?: Texture
  readonly normal?: Texture
  readonly orm?: Texture
}

/**
 * Clearcoat and sheen both live on MeshPhysicalMaterial. Anything else stays
 * standard: the physical shader is the heavier program, and a key that does
 * not use either lobe must not pay for it or add a program variant.
 */
export function needsPhysicalMaterial(spec: BakedMaterial) {
  return typeof spec.clearcoat === 'number' || (typeof spec.sheen === 'number' && spec.sheen > 0)
}

export function createLibraryMaterial(
  key: string,
  spec: BakedMaterial,
  maps: MaterialMaps = {},
): MeshStandardMaterial {
  // No `color` key at all. Passing `color: undefined` makes three log
  // "parameter 'color' has value of undefined" for every material it
  // builds — twelve of them, twice under StrictMode.
  const common = {
    name: key,
    roughness: spec.roughness,
    metalness: spec.metalness,
  }

  const material = needsPhysicalMaterial(spec)
    ? new MeshPhysicalMaterial(common)
    : new MeshStandardMaterial(common)

  material.color.setRGB(spec.baseColor[0], spec.baseColor[1], spec.baseColor[2], LinearSRGBColorSpace)

  if (spec.emissive) {
    material.emissive.setRGB(spec.emissive[0], spec.emissive[1], spec.emissive[2], LinearSRGBColorSpace)
    material.emissiveIntensity = spec.emissiveIntensity ?? 1
  }

  if (spec.alphaMode === 'BLEND') {
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

  if (material instanceof MeshPhysicalMaterial) {
    if (typeof spec.clearcoat === 'number') {
      material.clearcoat = spec.clearcoat
      material.clearcoatRoughness = spec.clearcoatRoughness ?? 0.1
    }
    if (typeof spec.sheen === 'number' && spec.sheen > 0) {
      // Setting `sheen` above zero is what turns the USE_SHEEN define on.
      material.sheen = spec.sheen
      const tint = spec.sheenColor ?? [1, 1, 1]
      material.sheenColor.setRGB(tint[0], tint[1], tint[2], LinearSRGBColorSpace)
      material.sheenRoughness = spec.sheenRoughness ?? 0.5
    }
  }

  if (maps.albedo) material.map = maps.albedo
  if (maps.normal) {
    material.normalMap = maps.normal
    // A uniform, not a define: a skived desk leather and a chair leather can
    // share one set of maps and one program.
    material.normalScale.setScalar(spec.normalScale ?? 1)
  }
  if (maps.orm) {
    // One packed texture serves three slots: three reads occlusion from .r,
    // roughness from .g and metalness from .b.
    material.aoMap = maps.orm
    material.roughnessMap = maps.orm
    material.metalnessMap = maps.orm
    // The map multiplies the scalar, so the scalars have to be 1 or the
    // texture is scaled down by them — unless the spec asks for exactly that.
    // A spec's own `roughness` is only the GLB placeholder's.
    material.roughness = spec.roughnessScale ?? 1
    material.metalness = spec.metalness > 0 ? 1 : 0
  }

  return material
}
