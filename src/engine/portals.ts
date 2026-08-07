/**
 * Cell-and-portal visibility.
 *
 * A museum is the textbook case for this: rooms are convex-ish boxes joined by
 * small openings, so from anywhere inside one you can see at most a handful of
 * others. three frustum-culls per object by bounding sphere and has no
 * occlusion culling at all, so without this a six-wing museum pays for every
 * wall in the building on every frame. With it, a walk through the atrium
 * touches one to three rooms.
 *
 * The algorithm is a breadth-first walk from the room containing the camera,
 * clipping the view frustum through each portal opening as it goes. Roughly
 * eighty lines, and it beats any general-purpose solution because it exploits
 * the one thing we know for certain about the geometry.
 */

import { Box3, Frustum, Matrix4, Vector3 } from 'three'
import type { Camera } from 'three'

import type { Portal, RoomData } from '../content/schema'

export type RoomCell = {
  readonly id: string
  /** World-space bounds of the room's interior volume. */
  readonly bounds: Box3
  readonly portals: readonly {
    readonly id: string
    readonly toRoom: string
    /** The four world-space corners of the opening. */
    readonly corners: readonly Vector3[]
    readonly centre: Vector3
  }[]
}

/** Builds the cell graph once from the content set. */
export function buildCells(rooms: readonly RoomData[]): Map<string, RoomCell> {
  const cells = new Map<string, RoomCell>()

  for (const room of rooms) {
    const [ox, oy, oz] = room.origin
    const halfWidth = room.shell.width / 2
    const halfDepth = room.shell.depth / 2

    const bounds = new Box3(
      new Vector3(ox - halfWidth, oy - 0.5, oz - halfDepth),
      new Vector3(ox + halfWidth, oy + room.shell.height + 0.5, oz + halfDepth),
    )

    cells.set(room.id, {
      id: room.id,
      bounds,
      portals: room.portals.map((portal) => ({
        id: portal.id,
        toRoom: portal.toRoom,
        corners: portalCorners(portal, room.origin),
        centre: new Vector3(
          ox + portal.position[0],
          oy + portal.height / 2,
          oz + portal.position[2],
        ),
      })),
    })
  }

  return cells
}

/**
 * The four world-space corners of a doorway.
 *
 * A portal lies in a wall plane, so it spans one horizontal axis plus Y. Which
 * horizontal axis follows from the wall it sits in, and that is exactly what
 * `rotationY` encodes: a portal in an east or west wall runs along Z, one in a
 * north or south wall runs along X.
 */
function portalCorners(portal: Portal, origin: readonly [number, number, number]): Vector3[] {
  const [ox, oy, oz] = origin
  const [px, , pz] = portal.position
  const half = portal.width / 2

  // cos(rotationY) near zero means the opening faces along X, so it spans Z.
  const spansZ = Math.abs(Math.cos(portal.rotationY)) < 0.5

  const x = ox + px
  const z = oz + pz
  const bottom = oy + 0.02
  const top = oy + portal.height

  if (spansZ) {
    return [
      new Vector3(x, bottom, z - half),
      new Vector3(x, bottom, z + half),
      new Vector3(x, top, z + half),
      new Vector3(x, top, z - half),
    ]
  }

  return [
    new Vector3(x - half, bottom, z),
    new Vector3(x + half, bottom, z),
    new Vector3(x + half, top, z),
    new Vector3(x - half, top, z),
  ]
}

const projectionView = new Matrix4()
const frustum = new Frustum()

/** Which room contains a point, or null when the player is between rooms. */
export function roomAt(cells: Map<string, RoomCell>, point: Vector3): string | null {
  for (const cell of cells.values()) {
    if (cell.bounds.containsPoint(point)) return cell.id
  }
  return null
}

/**
 * Returns the set of rooms visible from `origin` through `camera`.
 *
 * `maxDepth` bounds how many portals deep the walk goes. Two is enough for a
 * hub-and-spoke museum — you can see into a wing from the atrium, and no
 * further — and it caps the worst case regardless of how the building grows.
 */
export function computeVisibleRooms(
  cells: Map<string, RoomCell>,
  camera: Camera,
  origin: Vector3,
  currentRoom: string | null,
  maxDepth = 2,
): string[] {
  projectionView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  frustum.setFromProjectionMatrix(projectionView)

  const start = currentRoom ?? roomAt(cells, origin)
  if (!start) {
    // Between rooms (a doorway, or a content bug). Falling back to everything
    // is the safe failure: a frame that renders too much is a performance
    // problem, a frame that renders nothing is a black screen.
    return [...cells.keys()]
  }

  const visible = new Set<string>([start])
  const queue: { id: string; depth: number }[] = [{ id: start, depth: 0 }]

  while (queue.length > 0) {
    const { id, depth } = queue.shift() as { id: string; depth: number }
    if (depth >= maxDepth) continue

    const cell = cells.get(id)
    if (!cell) continue

    for (const portal of cell.portals) {
      if (visible.has(portal.toRoom)) continue

      // A portal is a potential doorway into the next cell only if any part of
      // it is on screen. Testing the corners plus the centre is cheap and
      // catches the common case of a doorway partly off the edge of the view.
      const onScreen =
        frustum.containsPoint(portal.centre) ||
        portal.corners.some((corner) => frustum.containsPoint(corner))

      // Stepping through a doorway must not black out the room you are
      // entering, and at that moment the opening is behind the near plane. Any
      // portal within a couple of metres counts as open regardless of frustum.
      const nearby = portal.centre.distanceToSquared(origin) < 9

      if (!onScreen && !nearby) continue

      visible.add(portal.toRoom)
      queue.push({ id: portal.toRoom, depth: depth + 1 })
    }
  }

  return [...visible]
}
