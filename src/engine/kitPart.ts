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

import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  PropertyBinding,
  Quaternion,
  Vector3,
  type Material,
  type Object3D,
} from 'three'

import type { BakedBundle, BakedCollider } from '../content/bake.generated'
import type { CollisionWorld } from './collision'
import type { MaterialLibrary } from './materials'

const Y_AXIS = new Vector3(0, 1, 0)

/** Matches both an exact part and its `part__surface` assembly members. */
function belongsToRecipe(name: string, recipe: string) {
  const candidate = PropertyBinding.sanitizeNodeName(name)
  const wanted = PropertyBinding.sanitizeNodeName(recipe)
  return candidate === wanted || candidate.startsWith(`${wanted}__`)
}

/** The source nodes that together form one exact-or-prefixed assembly. */
export function kitRecipeNodes(
  source: Group | null | undefined,
  recipe: string | undefined,
): Object3D[] {
  if (!source || !recipe) return []
  return source.children.filter((child) => belongsToRecipe(child.name, recipe))
}

export type KitInstancePlacement = {
  readonly part: string
  readonly position: readonly [number, number, number]
  readonly rotationY?: number
  readonly scale?: number
}

function placementMatrix(placement: KitInstancePlacement) {
  return new Matrix4().compose(
    new Vector3(...placement.position),
    new Quaternion().setFromAxisAngle(Y_AXIS, placement.rotationY ?? 0),
    new Vector3().setScalar(placement.scale ?? 1),
  )
}

function rematerialisedMaterial(
  material: Material | Material[],
  materials: MaterialLibrary,
): Material | Material[] {
  const replace = (candidate: Material) => materials.get(candidate.name) ?? candidate
  return Array.isArray(material) ? material.map(replace) : replace(material)
}

/**
 * Batches room-local kit placements by their loaded source mesh.
 *
 * The instance matrix is `placement x mesh-relative-to-kit`. The second term
 * is not optional: glTF quantisation restores an authored mesh's size and
 * centre on its node, so instancing only the placement matrix would recreate
 * the old half-buried-prop bug at a larger scale. Using the mesh's matrix
 * relative to the kit scene also keeps this correct if a future recipe gains
 * a nested node instead of today's one-node/one-mesh layout.
 *
 * Geometry and materials remain owned by the useGLTF cache. Only the
 * InstancedMesh objects and their per-instance matrix buffers belong to the
 * returned group.
 */
export function createKitInstanceGroup(
  source: Group | null | undefined,
  placements: readonly KitInstancePlacement[],
  materials: MaterialLibrary,
) {
  const result = new Group()
  result.name = 'kit-instances'
  if (!source || placements.length === 0) return result

  source.updateMatrixWorld(true)
  const sourceInverse = source.matrixWorld.clone().invert()
  const batches = new Map<Mesh, Matrix4[]>()

  for (const placement of placements) {
    const wrapper = placementMatrix(placement)

    for (const node of kitRecipeNodes(source, placement.part)) {
      node.traverse((object: Object3D) => {
        if (!(object instanceof Mesh)) return

        const relativeToKit = new Matrix4().multiplyMatrices(
          sourceInverse,
          object.matrixWorld,
        )
        const instance = new Matrix4().multiplyMatrices(wrapper, relativeToKit)
        const matrices = batches.get(object)
        if (matrices) matrices.push(instance)
        else batches.set(object, [instance])
      })
    }
  }

  for (const [sourceMesh, matrices] of batches) {
    const batch = new InstancedMesh(
      sourceMesh.geometry,
      rematerialisedMaterial(sourceMesh.material, materials),
      matrices.length,
    )
    batch.name = `instances:${sourceMesh.name}`
    batch.castShadow = true
    batch.receiveShadow = true
    batch.renderOrder = sourceMesh.renderOrder

    matrices.forEach((matrix, index) => batch.setMatrixAt(index, matrix))
    batch.instanceMatrix.needsUpdate = true
    batch.computeBoundingBox()
    batch.computeBoundingSphere()
    result.add(batch)
  }

  return result
}

/** Releases only buffers owned by createKitInstanceGroup. */
export function disposeKitInstanceGroup(group: Group | null | undefined) {
  group?.traverse((object: Object3D) => {
    if (object instanceof InstancedMesh) object.dispose()
  })
}

function rematerialise(
  root: Object3D,
  materials: MaterialLibrary,
  buildBoundsTree: boolean,
) {
  root.traverse((object: Object3D) => {
    if (!(object instanceof Mesh)) return
    if (buildBoundsTree && !object.geometry.boundsTree) object.geometry.computeBoundsTree()
    object.castShadow = true
    object.receiveShadow = true
    const key = Array.isArray(object.material) ? object.material[0]?.name : object.material?.name
    const replacement = key ? materials.get(key) : undefined
    if (replacement) object.material = replacement
  })
}

function cloneRecipeParts(
  source: Group | null | undefined,
  recipe: string | undefined,
  materials: MaterialLibrary,
  buildBoundsTree: boolean,
) {
  return kitRecipeNodes(source, recipe).map((part) => {
    const clone = part.clone(true)
    rematerialise(clone, materials, buildBoundsTree)
    return clone
  })
}

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
  const parts = cloneRecipeParts(source, partName, materials, false)
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]

  // This wrapper owns only assembly structure. Child node transforms remain
  // untouched, including the offset and scale that undo quantisation.
  const assembly = new Group()
  assembly.name = `assembly:${partName}`
  for (const part of parts) assembly.add(part)
  return assembly
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
  return cloneRecipeParts(source, recipe, materials, true)
}

/** Whether a loaded node is explicitly collidable in its bake manifest. */
export function bakedPartHasCollider(bundle: BakedBundle, nodeName: string) {
  const wanted = PropertyBinding.sanitizeNodeName(nodeName)
  return bundle.parts.some(
    (part) => PropertyBinding.sanitizeNodeName(part.name) === wanted && Boolean(part.collider),
  )
}

export type KitColliderTransform = {
  readonly roomOrigin: readonly [number, number, number]
  readonly position: readonly [number, number, number]
  readonly rotationY?: number
  readonly scale?: number
}

/** Builds the manifest primitive in the quantised GLB node's local space. */
function colliderGeometry(collider: BakedCollider, nodeMatrix: Matrix4) {
  const [hx, hy, hz] = collider.halfExtents
  const geometry = new BoxGeometry(hx * 2, hy * 2, hz * 2)
  geometry.translate(...collider.centre)

  /**
   * Manifest coordinates are authored before quantisation, whereas
   * `CollisionWorld.add` receives geometry plus a node-to-world matrix. Moving
   * the box back to node-local space lets the normal GLB node matrix restore
   * it, preserving the same transform contract as the rendered assembly.
   */
  geometry.applyMatrix4(nodeMatrix.clone().invert())
  return geometry
}

/**
 * Registers every collidable member of an assembly and returns one disposer.
 *
 * The manifest is authoritative: glass, ceiling fittings and decorative faces
 * have no collider entry. The full matrix is room origin x placement wrapper x
 * GLB node, so room-local authoring and dequantisation both survive.
 */
export function registerKitColliders(
  source: Group | null | undefined,
  recipe: string | undefined,
  bundle: BakedBundle | null | undefined,
  collision: CollisionWorld | null | undefined,
  transform: KitColliderTransform,
) {
  if (!source || !recipe || !bundle || !collision) return () => undefined

  source.updateMatrixWorld(true)
  const sourceInverse = source.matrixWorld.clone().invert()

  const roomMatrix = new Matrix4().makeTranslation(...transform.roomOrigin)
  const placementMatrix = new Matrix4().compose(
    new Vector3(...transform.position),
    new Quaternion().setFromAxisAngle(Y_AXIS, transform.rotationY ?? 0),
    new Vector3().setScalar(transform.scale ?? 1),
  )
  const wrapperMatrix = new Matrix4().multiplyMatrices(roomMatrix, placementMatrix)
  const disposers: (() => void)[] = []

  for (const part of bundle.parts) {
    if (!part.collider || !belongsToRecipe(part.name, recipe)) continue

    const wanted = PropertyBinding.sanitizeNodeName(part.name)
    const node = source.children.find((child) => child.name === wanted)
    if (!node) continue

    // Match createKitInstanceGroup exactly: placement matrices are relative to
    // the kit root, not to the GLTF root's parent or current world placement.
    // The root is identity today, but making that an assumption here would let
    // rendered instances and their colliders diverge after a nested/root edit.
    const relativeToKit = new Matrix4().multiplyMatrices(
      sourceInverse,
      node.matrixWorld,
    )
    const geometry = colliderGeometry(part.collider, relativeToKit)
    const worldMatrix = new Matrix4().multiplyMatrices(wrapperMatrix, relativeToKit)
    disposers.push(collision.add(geometry, worldMatrix))
    geometry.dispose()
  }

  return () => {
    for (const dispose of disposers) dispose()
  }
}

/**
 * Releases a cloned scene graph without disposing cache-owned resources.
 *
 * `Object3D.clone(true)` clones nodes, not BufferGeometry or Material. Calling
 * `geometry.dispose()` here therefore invalidated the same GPU buffer still
 * used by every sibling instance and by drei's cached GLTF scene. The nodes
 * themselves need no explicit disposal and become collectible once React drops
 * the final reference. This must also stay non-destructive because StrictMode
 * runs an effect cleanup/setup rehearsal without rebuilding the memoised clone;
 * clearing it in that rehearsal makes the part disappear in development.
 */
export function disposeKitPart(_part: Object3D | null | undefined) {}
