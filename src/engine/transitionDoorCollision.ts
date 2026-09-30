import { BoxGeometry, Matrix4, Quaternion, Vector3 } from 'three'

import type { CollisionWorld } from './collision'
import {
  TRANSITION_DOOR_PLANE_Z,
  TRANSITION_DOOR_SILL_Y,
  type TransitionDoorSpec,
} from './transitionDoorTopology.ts'

export const TRANSITION_DOOR_GATE_DEPTH = 0.08

/**
 * Registers one solid gate across the complete opening until animation ends.
 *
 * This collider is deliberately independent of the streamed door model. It is
 * available as soon as the scene mounts, has no meeting-stile seam and costs a
 * single BVH per portal instead of one for each decorative leaf.
 */
export function registerTransitionDoorGate(
  collision: CollisionWorld | null | undefined,
  spec: TransitionDoorSpec,
) {
  if (!collision) return () => undefined

  const geometry = new BoxGeometry(
    spec.width,
    spec.height,
    TRANSITION_DOOR_GATE_DEPTH,
  )
  geometry.translate(
    0,
    TRANSITION_DOOR_SILL_Y + spec.height / 2,
    TRANSITION_DOOR_PLANE_Z,
  )
  const matrix = new Matrix4().compose(
    new Vector3(...spec.position),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), spec.rotationY),
    new Vector3(1, 1, 1),
  )
  const dispose = collision.add(geometry, matrix)
  geometry.dispose()
  return dispose
}
