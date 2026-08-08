import type { RoomData } from '../content/schema'

type PowerableRoom = Pick<RoomData, 'id' | 'startsPowered'>

/**
 * The authored default and the saved restoration are intentionally combined
 * at read time. Persisting every `startsPowered` room would duplicate content
 * in the save and make a content edit look like player progress.
 */
export function isRoomPowered(
  room: PowerableRoom,
  restoredRooms: readonly string[],
): boolean {
  return room.startsPowered || restoredRooms.includes(room.id)
}
