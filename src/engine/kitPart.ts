/**
 * The one place a part is lifted out of the shared kit GLB.
 *
 * There used to be three copies of this — one for exhibit mounts, one for
 * containers, one for room furniture — and all three carried the same bug:
 *
 *   clone.position.set(0, 0, 0)
 *
 * That line looks like harmless hygiene. It is not. `quantize()` in the bake
 * stores positions as normalised integers and compensates with a translation
 * and scale ON THE NODE, so a part authored standing on y = 0 arrives as
 * geometry centred on its own origin plus a node that lifts it back up.
 * Zeroing the node keeps the centring and throws away the lift, which sinks
 * every part exactly half its own height into the floor.
 *
 * It was invisible because it is uniform: every vitrine, plinth and cabinet in
 * the building was half-buried together, so nothing looked out of place next to
 * anything else. It only became obvious on a 1 m plinth with a brass plate
 * placed at its authored top, which then floated a clear half-metre above it.
 *
 * The bake authors every part at the origin, so the node transform a loaded
 * part carries is dequantisation and nothing else. It must be preserved.
 *
 * The same rule binds callers: put a kit part's placement on a WRAPPER GROUP,
 * never as a `position`/`scale`/`rotation` prop on the `<primitive>` itself.
 * A transform prop overwrites the node's own transform and reintroduces the
 * bug through JSX.
 */

import { Mesh, PropertyBinding, type Group, type Object3D } from 'three'

import type { MaterialLibrary } from './materials'

/**
 * Clones a named part and swaps its placeholder material for the real one.
 *
 * Returns null when the part is absent, which is a content/bake mismatch the
 * `kit-part-not-baked` validator rule catches before it can reach a player.
 */
export function cloneKitPart(
  source: Group | null | undefined,
  partName: string | undefined,
  materials: MaterialLibrary,
): Object3D | null {
  if (!source || !partName) return null

  // Recipe ids are namespaced with a slash (`ball/spalding-laced-1900`) and the
  // bake writes them straight into the GLB — but GLTFLoader runs every node
  // name through `sanitizeNodeName`, which DELETES the characters reserved by
  // the animation-binding syntax: `[ ] . : /`. The node that arrives is
  // `ballspalding-laced-1900`, so matching on the raw id finds nothing,
  // silently: the room renders, the GLB downloads, every plinth is just empty.
  // Running both sides through three's own function means they cannot disagree.
  const wanted = PropertyBinding.sanitizeNodeName(partName)
  const found = source.children.find((child) => child.name === wanted)
  if (!found) return null

  const clone = found.clone(true)
  clone.traverse((object: Object3D) => {
    if (!(object instanceof Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    const key = Array.isArray(object.material) ? object.material[0]?.name : object.material?.name
    const replacement = key ? materials.get(key) : undefined
    if (replacement) object.material = replacement
  })
  return clone
}

/**
 * Clones every part belonging to one recipe into a single group.
 *
 * A recipe is either a lone part or a set of `recipe__suffix` siblings — the
 * 1897 net is `__structure` plus `__cords` because they take different
 * materials and a glTF primitive takes one. The suffix match is on the
 * sanitised name, since that is what survives the loader.
 */
export function cloneRecipe(
  source: Group | null | undefined,
  recipe: string,
  materials: MaterialLibrary,
): Object3D[] {
  if (!source) return []
  const wanted = PropertyBinding.sanitizeNodeName(recipe)
  return source.children
    .filter((child) => child.name === wanted || child.name.startsWith(`${wanted}__`))
    .map((child) => {
      const clone = child.clone(true)
      clone.traverse((object: Object3D) => {
        if (!(object instanceof Mesh)) return
        // Exhibits are what the examine ray hits, so they carry a BVH.
        if (!object.geometry.boundsTree) object.geometry.computeBoundsTree()
        object.castShadow = true
        object.receiveShadow = true
        const key = Array.isArray(object.material)
          ? object.material[0]?.name
          : object.material?.name
        const replacement = key ? materials.get(key) : undefined
        if (replacement) object.material = replacement
      })
      return clone
    })
}

/** Frees the geometry a `cloneKitPart` result owns. Materials are shared. */
export function disposeKitPart(part: Object3D | null | undefined) {
  part?.traverse((object: Object3D) => {
    if (object instanceof Mesh) object.geometry.dispose()
  })
}
