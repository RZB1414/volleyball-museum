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

/**
 * What a power control's lens shows: red while its room waits, green once
 * restored. The office door reader taught the pair first, and a lens that
 * stayed red after the lights came up would be a state the room contradicts.
 */
export function powerControlLensMaterial(powered: boolean): 'led-green' | 'led-red' {
  return powered ? 'led-green' : 'led-red'
}
