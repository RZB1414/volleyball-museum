export type DoorRevealBarrier = Readonly<{
  advance: boolean
  frameObserved: boolean
}>

/**
 * Requires one complete ready+visible frame before the first hinge movement.
 * React publishes room visibility asynchronously from the R3F frame that
 * consumes GPU readiness, so advancing immediately can expose an empty shell.
 */
export function advanceDoorRevealBarrier(
  frameObserved: boolean,
  roomReady: boolean,
  roomVisible: boolean,
): DoorRevealBarrier {
  if (!roomReady || !roomVisible) {
    return { advance: false, frameObserved: false }
  }
  if (!frameObserved) {
    return { advance: false, frameObserved: true }
  }
  return { advance: true, frameObserved: true }
}
