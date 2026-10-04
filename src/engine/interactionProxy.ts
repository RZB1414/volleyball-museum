/**
 * The invisible volumes the interaction rays hit.
 *
 * A notebook, a radio and a breaker are each aimed at through a box a little
 * more forgiving than the object: "looking at the lamp", not threading the
 * crosshair through a ten-millimetre switch. The padding sum lived in three
 * components and the material in three more places, and the three copies
 * shared one defect: a box drawn with front faces only cannot be hit by a ray
 * that starts inside it. The atrium breaker's box reaches 29.5 cm into the
 * room and the capsule could stand 8 cm from that wall, so the last step
 * towards the red light put the eye inside the target and the prompt went
 * out exactly when the player arrived.
 *
 * Two rules come out of that, and both are checked headless (`test:power`,
 * `test:navigation`):
 *
 *   - a proxy is hit from either side of its faces;
 *   - no proxy contains the nearest point the capsule can reach, which is
 *     the job of the object's collider, not of the material.
 *
 * Pure, three only: the suites build the same box the components do.
 */

import { DoubleSide, Vector3, type Box3 } from 'three'

/** Spread on the `<meshBasicMaterial />` of every interaction proxy. */
export const PROXY_MATERIAL_PROPS = { side: DoubleSide } as const

export type InteractionProxy = {
  readonly centre: [number, number, number]
  readonly size: [number, number, number]
}

/** An object's own bounds, grown about their centre to at least `minimum`. */
export function paddedProxy(
  bounds: Box3,
  minimum: readonly [number, number, number],
): InteractionProxy {
  const centre = bounds.getCenter(new Vector3())
  const size = bounds.getSize(new Vector3())
  size.set(
    Math.max(size.x, minimum[0]),
    Math.max(size.y, minimum[1]),
    Math.max(size.z, minimum[2]),
  )
  return {
    centre: centre.toArray() as [number, number, number],
    size: size.toArray() as [number, number, number],
  }
}

/**
 * The chest-high box in front of an archive cabinet.
 *
 * A 1.28 m cabinet against a wall makes the player look distinctly down to
 * put a crosshair on it; this is "looking at the cabinet". Local to the
 * container's wrapper group.
 */
export const DRAWER_PROXY: InteractionProxy = {
  centre: [0, 0.85, 0.12],
  size: [0.78, 1.7, 0.8],
}
