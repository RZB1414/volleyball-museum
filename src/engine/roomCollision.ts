/**
 * Registers a baked room's meshes in world-space collision.
 *
 * Kept outside the React component so the scene-graph transform contract can
 * be exercised headlessly. At effect time the loaded GLTF root is already a
 * child of the room wrapper, therefore every descendant's `matrixWorld`
 * already contains that wrapper's origin. Applying the origin to that matrix
 * again moves every non-zero room's colliders to a phantom second location.
 */

import { Matrix4, Mesh, type Object3D } from 'three'

import type { CollisionWorld } from './collision'

export function registerRoomColliders(
  root: Object3D,
  origin: readonly [number, number, number],
  collision: CollisionWorld,
  noCollide?: (name: string) => boolean,
) {
  /**
   * Update parents as well as descendants. React Three Fiber has attached the
   * root to its positioned wrapper before effects run, and relying on a render
   * having refreshed every ancestor matrix makes first-load physics timing
   * dependent.
   */
  root.updateWorldMatrix(true, true)

  const rootWorldInverse = root.matrixWorld.clone().invert()
  const authoredRoot = new Matrix4()
    .makeTranslation(origin[0], origin[1], origin[2])
    .multiply(root.matrix)
  const relative = new Matrix4()
  const full = new Matrix4()
  const disposers: (() => void)[] = []

  root.traverse((object: Object3D) => {
    if (!(object instanceof Mesh)) return
    if (noCollide?.(object.name)) return

    // Strip the live wrapper transform, then put the authored room origin back
    // exactly once. Reapplying `root.matrix` preserves a non-identity GLTF root
    // instead of assuming every exporter leaves the scene node untouched.
    relative.multiplyMatrices(rootWorldInverse, object.matrixWorld)
    full.multiplyMatrices(authoredRoot, relative)
    disposers.push(collision.add(object.geometry, full))
  })

  return () => {
    for (const dispose of disposers) dispose()
  }
}
