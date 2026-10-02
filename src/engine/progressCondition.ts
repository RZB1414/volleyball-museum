/**
 * Evaluates content-authored questions about the save.
 *
 * The radio's calls and hints and the notebook's checklist all ask the same
 * kind of thing — has this room got power, is that drawer still shut — so the
 * story stays in `museum.ts` and this one pure function answers for all of
 * them. Pure on purpose: the opening scene is proved headless in
 * `test-opening.ts`, not by walking a browser through it.
 */

import type { MuseumContent, ProgressCondition, RoomData } from '../content/schema'
import { isRoomPowered } from './power.ts'

export type ConditionProgress = {
  readonly roomsPowered: readonly string[]
  readonly locksOpened: readonly string[]
  readonly documentsRead: readonly string[]
  readonly catalogued: readonly string[]
}

type ConditionContent = Pick<MuseumContent, 'rooms' | 'exhibits'>

function roomPowered(
  rooms: readonly Pick<RoomData, 'id' | 'startsPowered'>[],
  roomId: string,
  restored: readonly string[],
) {
  const room = rooms.find((candidate) => candidate.id === roomId)
  return room ? isRoomPowered(room, restored) : false
}

export function progressConditionMet(
  condition: ProgressCondition,
  progress: ConditionProgress,
  content: ConditionContent,
): boolean {
  const powered = (roomId: string) => roomPowered(content.rooms, roomId, progress.roomsPowered)

  if (condition.powered && !condition.powered.every(powered)) return false
  if (condition.unpowered && condition.unpowered.some(powered)) return false
  if (
    condition.locksOpened &&
    !condition.locksOpened.every((lockId) => progress.locksOpened.includes(lockId))
  ) {
    return false
  }
  if (
    condition.locksClosed &&
    condition.locksClosed.some((lockId) => progress.locksOpened.includes(lockId))
  ) {
    return false
  }
  if (
    condition.documentsRead &&
    !condition.documentsRead.every((documentId) => progress.documentsRead.includes(documentId))
  ) {
    return false
  }
  if (condition.allRoomsPowered && !content.rooms.every((room) => powered(room.id))) {
    return false
  }
  if (
    condition.allCatalogued &&
    !content.exhibits.every((exhibit) => progress.catalogued.includes(exhibit.id))
  ) {
    return false
  }
  return true
}
