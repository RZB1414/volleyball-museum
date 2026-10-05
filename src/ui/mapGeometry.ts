/**
 * Map geometry kept out of the component, so it can be proved headless.
 */

export type MapSegment = {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

/** Half the drawn wall thickness either side of a doorway's jamb. */
const JAMB_HALF = 2.5
/** How deep the gap is painted across one wall line: enough to cut the current room's 2-unit outline. */
const GAP_DEPTH = 4

/**
 * A doorway drawn as an opening in its wall: a gap the length of the door
 * along the wall, closed by a short jamb across the wall at each end.
 *
 * The map is the XZ plane seen from above (SVG y = world z), and three's
 * rotationY turns a portal's local +X — the width of the opening — to
 * (cos θ, −sin θ) there. Ignoring the rotation drew every east or west door
 * as a stub crossing its wall at right angles.
 *
 * `between` is for an opening drawn once through two rooms' wall lines: the
 * distance between the lines, with the centre given midway. The gap comes
 * back that much deeper and the jambs that much longer, so one doorway cuts
 * both outlines exactly as the two it replaces did.
 */
export function portalOpening(
  centreX: number,
  centreY: number,
  length: number,
  rotationY: number,
  between = 0,
): { readonly gap: MapSegment; readonly jambs: readonly [MapSegment, MapSegment]; readonly depth: number } {
  const half = length / 2
  const alongX = Math.cos(rotationY)
  const alongY = -Math.sin(rotationY)
  // Perpendicular to the wall, across its thickness.
  const acrossX = -alongY
  const acrossY = alongX
  const jambHalf = JAMB_HALF + between / 2

  const end = (sign: 1 | -1) => ({ x: centreX + sign * alongX * half, y: centreY + sign * alongY * half })
  const jamb = (sign: 1 | -1): MapSegment => {
    const point = end(sign)
    return {
      x1: point.x - acrossX * jambHalf,
      y1: point.y - acrossY * jambHalf,
      x2: point.x + acrossX * jambHalf,
      y2: point.y + acrossY * jambHalf,
    }
  }

  const start = end(-1)
  const finish = end(1)
  return {
    gap: { x1: start.x, y1: start.y, x2: finish.x, y2: finish.y },
    jambs: [jamb(-1), jamb(1)],
    depth: GAP_DEPTH + between,
  }
}
