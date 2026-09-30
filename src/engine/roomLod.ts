/**
 * Portal-driven render tiers for a room.
 *
 * Visibility answers which architectural cells can be seen through a portal;
 * it does not mean that every visible cell needs its museum contents. Keeping
 * that distinction here makes the policy independent of today's room ids and
 * gives the room being crossed into priority over a one-frame visibility lag.
 */
export type RoomRenderTier = 'hidden' | 'shell' | 'detail'

export type TransitionDoorConnection = Readonly<{
  id: string
  firstRoom: string
  secondRoom: string
}>

export function roomRenderTier(
  roomId: string,
  currentRoom: string,
  visible: boolean,
): RoomRenderTier {
  if (roomId === currentRoom) return 'detail'
  return visible ? 'shell' : 'hidden'
}

/**
 * Detail is expensive to construct but cheap to hide once its GPU resources
 * and static colliders exist. Keep every room that has been entered or warmed
 * from an adjacent portal mounted for the rest of the session, while
 * `roomRenderTier` still decides what may actually draw. This turns a doorway
 * crossing or return trip into a visibility flip instead of a synchronous
 * rebuild of instances, BVHs and media materials.
 */
export function shouldMountRoomDetail(
  roomId: string,
  currentRoom: string,
  warmedRooms: ReadonlySet<string>,
) {
  return roomId === currentRoom || warmedRooms.has(roomId)
}

/**
 * Keeps only direct neighbours behind doors that have actually finished
 * opening. The cache may contain every visited room, but drawing the full
 * connected graph would undo portal LOD after two or three doors were used.
 */
export function openDoorNeighbourRooms(
  currentRoom: string,
  openDoorIds: ReadonlySet<string>,
  connections: readonly TransitionDoorConnection[],
) {
  const neighbours = new Set<string>()
  for (const connection of connections) {
    if (!openDoorIds.has(connection.id)) continue
    if (connection.firstRoom === currentRoom) neighbours.add(connection.secondRoom)
    else if (connection.secondRoom === currentRoom) neighbours.add(connection.firstRoom)
  }
  return neighbours
}

/**
 * A warm destination may draw before the hinge moves and remain drawn whenever
 * it is the direct neighbour behind an open door. The mounted cache therefore
 * never visually collapses through a doorway, while ordinary portal shells and
 * non-adjacent warm rooms still keep their expensive detail parked.
 */
export function shouldRenderRoomDetail(
  tier: RoomRenderTier,
  gpuReady: boolean,
  transitionDoorVisible: boolean,
) {
  return tier === 'detail' ||
    (tier === 'shell' && gpuReady && transitionDoorVisible)
}
