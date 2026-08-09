/**
 * Portal-driven render tiers for a room.
 *
 * Visibility answers which architectural cells can be seen through a portal;
 * it does not mean that every visible cell needs its museum contents. Keeping
 * that distinction here makes the policy independent of today's room ids and
 * gives the room being crossed into priority over a one-frame visibility lag.
 */
export type RoomRenderTier = 'hidden' | 'shell' | 'detail'

export function roomRenderTier(
  roomId: string,
  currentRoom: string,
  visible: boolean,
): RoomRenderTier {
  if (roomId === currentRoom) return 'detail'
  return visible ? 'shell' : 'hidden'
}
