import type { Vector3 } from 'three'

import {
  TRANSITION_DOOR_PLANE_Z,
  type TransitionDoorSpec,
} from './transitionDoorTopology.ts'

export type DoorLocalPoint = Readonly<{ x: number; z: number }>
export type DoorPassageSide = 1 | -1

/** Converts a world-space player point into the authored door's local wall axes. */
export function transitionDoorLocalPoint(
  door: TransitionDoorSpec,
  point: Pick<Vector3, 'x' | 'z'>,
): DoorLocalPoint {
  const dx = point.x - door.position[0]
  const dz = point.z - door.position[2]
  const cosine = Math.cos(door.rotationY)
  const sine = Math.sin(door.rotationY)
  return {
    x: dx * cosine - dz * sine,
    z: dx * sine + dz * cosine,
  }
}

/** +1 is the owning room side; -1 is the reciprocal room side. */
export function transitionDoorSide(
  door: TransitionDoorSpec,
  point: Pick<Vector3, 'x' | 'z'>,
  deadZone = 0.02,
): DoorPassageSide | 0 {
  const distance = transitionDoorLocalPoint(door, point).z - TRANSITION_DOOR_PLANE_Z
  if (Math.abs(distance) <= deadZone) return 0
  return distance > 0 ? 1 : -1
}

/**
 * Detects a real capsule-centre crossing through this opening.
 *
 * Segment intersection catches a low-FPS movement step that jumps across the
 * plane. The lateral inset prevents walking beside the wall from being
 * mistaken for using one of the two Atrium/Holyoke doors.
 */
export function segmentCrossesTransitionDoor(
  door: TransitionDoorSpec,
  previous: DoorLocalPoint,
  current: DoorLocalPoint,
  capsuleRadius: number,
) {
  const previousZ = previous.z - TRANSITION_DOOR_PLANE_Z
  const currentZ = current.z - TRANSITION_DOOR_PLANE_Z
  if (previousZ === currentZ || previousZ * currentZ > 0) return false

  const progress = previousZ / (previousZ - currentZ)
  if (progress < 0 || progress > 1) return false
  const crossingX = previous.x + (current.x - previous.x) * progress
  const clearHalfWidth = Math.max(0, door.width / 2 - capsuleRadius + 0.02)
  return Math.abs(crossingX) <= clearHalfWidth
}

/** Which side a valid segment crossing finishes on, including tiny dead-zone steps. */
export function transitionDoorCrossingSide(
  door: TransitionDoorSpec,
  previous: DoorLocalPoint,
  current: DoorLocalPoint,
  capsuleRadius: number,
): DoorPassageSide | null {
  if (!segmentCrossesTransitionDoor(door, previous, current, capsuleRadius)) {
    return null
  }
  const currentDistance = current.z - TRANSITION_DOOR_PLANE_Z
  if (currentDistance !== 0) return currentDistance > 0 ? 1 : -1
  const direction = current.z - previous.z
  return direction > 0 ? 1 : -1
}

/**
 * The open leaves occupy an asymmetric swept volume on the destination side.
 * Closing waits until the entire capsule has left this envelope. If the player
 * returns while the leaves move, the same test reverses them before contact.
 */
export function isInsideTransitionDoorEnvelope(
  door: TransitionDoorSpec,
  point: Pick<Vector3, 'x' | 'z'>,
  openedFromSide: DoorPassageSide,
  capsuleRadius: number,
) {
  const local = transitionDoorLocalPoint(door, point)
  if (Math.abs(local.x) > door.width / 2 + capsuleRadius) return false

  const distanceFromPlane = local.z - TRANSITION_DOOR_PLANE_Z
  const distanceTowardsOrigin = distanceFromPlane * openedFromSide
  const originMargin = capsuleRadius + 0.12
  return (
    distanceTowardsOrigin <= originMargin &&
    distanceTowardsOrigin >= -door.closeDistance
  )
}
