/**
 * Renders one baked room bundle.
 *
 * Generic on purpose: it knows nothing about Holyoke or volleyball. It loads a
 * GLB the bake produced, swaps in the real textured materials by name, and
 * registers the collision geometry. Adding a wing is authoring content — not
 * writing another one of these.
 */

import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { Mesh, type Group, type Object3D } from 'three'

import './bvhSetup'

import type { BakedBundle } from '../content/bake.generated'
import type { CollisionWorld } from './collision'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import type { MaterialLibrary } from './materials'
import { registerRoomColliders } from './roomCollision'

export type BakedRoomProps = {
  bundle: BakedBundle
  materials: MaterialLibrary
  origin?: readonly [number, number, number]
  visible?: boolean
  /** When given, the room's meshes are added as static colliders. */
  collision?: CollisionWorld | null
  /** Parts whose names match are skipped by collision (exhibits, glass). */
  noCollide?: (name: string) => boolean
}

export function BakedRoom({
  bundle,
  materials,
  origin = [0, 0, 0],
  visible = true,
  collision = null,
  noCollide,
}: BakedRoomProps) {
  const { scene } = useGLTF(bundle.url, USE_DRACO, USE_MESHOPT)

  /**
   * The loaded scene is shared across every component using the same URL, so it
   * must be cloned before its materials are touched. Mutating the cached scene
   * would leak into any other room that shares the bundle.
   */
  const instance = useMemo(() => {
    const clone = scene.clone(true) as Group

    clone.traverse((object: Object3D) => {
      if (!(object instanceof Mesh)) return

      // Build the BVH the accelerated raycast needs. Installing
      // `acceleratedRaycast` on Mesh.prototype without this does nothing: the
      // patched method looks for `geometry.boundsTree` and silently falls back
      // to three's linear triangle scan when it is missing, so you pay for the
      // library and get none of it.
      if (!object.geometry.boundsTree) object.geometry.computeBoundsTree()

      object.castShadow = true
      object.receiveShadow = true

      // The bake names each glTF material after its library key, so the swap is
      // a lookup rather than a guess.
      const key = Array.isArray(object.material)
        ? object.material[0]?.name
        : object.material?.name
      const replacement = key ? materials.get(key) : undefined
      if (replacement) object.material = replacement
    })

    return clone
  }, [scene, materials])

  // --- collision ------------------------------------------------------------
  useEffect(() => {
    if (!collision) return undefined

    /**
     * The complete node transform is essential and easy to skip.
     *
     * The bake quantizes positions to normalized int16, and gltf-transform puts
     * the scale and offset that undo it on the NODE. So a wall's `geometry` is
     * in roughly -1..1 space and only becomes an 18 m wall once the node
     * transform is applied. Feeding the raw geometry to the collider produced a
     * room that rendered perfectly and dropped the player straight through the
     * floor — the failure is invisible in a screenshot and invisible in
     * `renderer.info`.
     *
     * The helper first makes each node relative to the loaded scene root. The
     * primitive is already attached to the positioned JSX wrapper when this
     * effect runs, so its `matrixWorld` already contains `origin`; multiplying
     * that world matrix by a second room translation put Holyoke and the office
     * colliders at twice their authored coordinates while the atrium appeared
     * healthy because its origin is zero.
     */
    return registerRoomColliders(instance, origin, collision, noCollide)
    // The manifest predicate is recreated by the parent on ordinary renders,
    // but its answer only changes with `instance`; including it would rebuild
    // every room collider whenever portal visibility changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collision, instance])

  /**
   * `Object3D.clone(true)` owns the cloned node hierarchy but deliberately
   * shares BufferGeometry with drei's useGLTF cache. The hierarchy is ordinary
   * garbage-collected JavaScript; disposing a descendant geometry here would
   * invalidate the cache and force every warm room using it to upload again.
   * The replacement materials are likewise owned by the shared library.
   */

  return (
    <group position={origin as unknown as [number, number, number]} visible={visible}>
      <primitive object={instance} />
    </group>
  )
}
