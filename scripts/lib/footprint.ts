/**
 * Footprints on a horizontal surface: oriented rectangles in the XZ plane,
 * with the rotation convention of three's `rotateY` (a recipe-local (x, z)
 * turns to (x cos θ + z sin θ, -x sin θ + z cos θ)).
 *
 * Pure and dependency-free, for the headless tests that prove objects rest on
 * what they stand on and keep out of each other. Axis-aligned boxes are not
 * enough for that: the ledgers, the telephone and the lamp are all turned on
 * the desk, and the AABB of a turned object overlaps neighbours it never
 * touches.
 */

export type Footprint = {
  readonly id: string
  /** Centre in the surface's XZ frame. */
  readonly centre: readonly [number, number]
  /** Half extents along the footprint's own axes, before rotation. */
  readonly halfSize: readonly [number, number]
  /** rotateY angle, radians. */
  readonly rotation: number
}

/** A rigid placement on the surface: position in XZ and a rotateY angle. */
export type SurfaceTransform = {
  readonly position: readonly [number, number]
  readonly rotation: number
}

export function rotateXZ([x, z]: readonly [number, number], rotation: number): [number, number] {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return [x * cos + z * sin, -x * sin + z * cos]
}

/** Carries a footprint authored in a recipe's frame into its parent's. */
export function placeFootprint(footprint: Footprint, transform: SurfaceTransform): Footprint {
  const [x, z] = rotateXZ(footprint.centre, transform.rotation)
  return {
    ...footprint,
    centre: [transform.position[0] + x, transform.position[1] + z],
    rotation: footprint.rotation + transform.rotation,
  }
}

/** The footprint of an axis-aligned local box (a manifest's bounds). */
export function footprintFromBounds(
  id: string,
  bounds: { readonly min: readonly number[]; readonly max: readonly number[] },
): Footprint {
  return {
    id,
    centre: [(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[2] + bounds.max[2]) / 2],
    halfSize: [(bounds.max[0] - bounds.min[0]) / 2, (bounds.max[2] - bounds.min[2]) / 2],
    rotation: 0,
  }
}

export function corners(footprint: Footprint): [number, number][] {
  const [hx, hz] = footprint.halfSize
  return (
    [
      [-hx, -hz],
      [hx, -hz],
      [hx, hz],
      [-hx, hz],
    ] as const
  ).map((corner) => {
    const [x, z] = rotateXZ(corner, footprint.rotation)
    return [footprint.centre[0] + x, footprint.centre[1] + z] as [number, number]
  })
}

/** The two edge normals of a rectangle, which are all SAT needs from it. */
function axes(footprint: Footprint): [number, number][] {
  return [rotateXZ([1, 0], footprint.rotation), rotateXZ([0, 1], footprint.rotation)]
}

/**
 * Separating-axis test: true unless some axis separates the two by at least
 * `clearance`. Touching is apart at the default of zero; a negative clearance
 * tolerates that much overlap.
 */
export function footprintsOverlap(a: Footprint, b: Footprint, clearance = 0): boolean {
  return footprintGap(a, b) < clearance
}

/** The widest separation along any SAT axis; negative when they overlap. */
export function footprintGap(a: Footprint, b: Footprint): number {
  const cornersA = corners(a)
  const cornersB = corners(b)
  let widest = -Infinity
  for (const axis of [...axes(a), ...axes(b)]) {
    const project = (points: [number, number][]) => points.map(([x, z]) => x * axis[0] + z * axis[1])
    const pa = project(cornersA)
    const pb = project(cornersB)
    widest = Math.max(widest, Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb))
  }
  return widest
}

/** True when every corner of `inner` lies inside `outer`, less a margin. */
export function footprintInside(inner: Footprint, outer: Footprint, margin = 0): boolean {
  const [hx, hz] = outer.halfSize
  return corners(inner).every(([x, z]) => {
    const [lx, lz] = rotateXZ([x - outer.centre[0], z - outer.centre[1]], -outer.rotation)
    return Math.abs(lx) <= hx - margin && Math.abs(lz) <= hz - margin
  })
}
