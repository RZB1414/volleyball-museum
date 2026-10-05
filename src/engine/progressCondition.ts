/**
 * Evaluates content-authored questions about the save.
 *
 * The radio's calls and hints, the notebook's checklist and the triggers all
 * ask the same kind of thing — has this room got power, is that drawer still
 * shut, is this piece catalogued — so the story stays in `museum.ts` and this
 * one pure function answers for all of them. Pure on purpose: the opening
 * scene is proved headless in `test-opening.ts`, not by walking a browser
 * through it.
 */

import type { Credential, MuseumContent, ProgressCondition, RoomData } from '../content/schema'
import { isRoomPowered } from './power.ts'

/** A credential as the save spells it. The one place the spelling is written. */
export function credentialKey(credential: Credential): string {
  return `${credential.kind}:${credential.id}`
}

export type ConditionProgress = {
  readonly roomsPowered: readonly string[]
  readonly locksOpened: readonly string[]
  readonly documentsRead: readonly string[]
  readonly catalogued: readonly string[]
  /** Optional so a checklist asked before anything can be carried still answers. */
  readonly devicesCarried?: readonly string[]
  // Optional like the one above, and for the same askers. A question about a
  // list the asker does not hold is answered "no": the save in which none of
  // it happened, never the one in which all of it did.
  readonly hotspots?: readonly string[]
  readonly credentials?: readonly string[]
  readonly flags?: readonly string[]
  readonly roomsVisited?: readonly string[]
  readonly doorsReleased?: readonly string[]
  readonly termsSigned?: readonly string[]
  readonly locksSeen?: readonly string[]
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

/**
 * Whether the save's list holds every one of these.
 *
 * `Array.isArray` and not `?? []`: a save written by a later build can carry
 * a list this build has no line for in its table, and so has not sanitised.
 * Whatever is there that is not a list answers "no" instead of throwing in
 * the middle of a frame.
 */
function holdsAll(list: readonly string[] | undefined, ids: readonly string[] | undefined) {
  if (!ids) return true
  return ids.every((id) => Array.isArray(list) && list.includes(id))
}

/**
 * Whether the save's list holds none of these: the same question, turned
 * round. A list the asker does not hold, or one of another shape, holds none
 * of them: the save in which none of it happened.
 */
function holdsNone(list: readonly string[] | undefined, ids: readonly string[] | undefined) {
  if (!ids || !Array.isArray(list)) return true
  return !ids.some((id) => list.includes(id))
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
  if (
    condition.documentsUnread &&
    condition.documentsUnread.some((documentId) => progress.documentsRead.includes(documentId))
  ) {
    return false
  }
  if (!holdsAll(progress.devicesCarried, condition.carried)) return false
  if (condition.allRoomsPowered && !content.rooms.every((room) => powered(room.id))) {
    return false
  }
  if (
    condition.allCatalogued &&
    !content.exhibits.every((exhibit) => progress.catalogued.includes(exhibit.id))
  ) {
    return false
  }
  if (!holdsAll(progress.catalogued, condition.catalogued)) return false
  if (!holdsAll(progress.hotspots, condition.hotspotsSeen)) return false
  if (!holdsAll(progress.credentials, condition.credentials?.map(credentialKey))) return false
  if (!holdsAll(progress.flags, condition.flags)) return false
  if (!holdsNone(progress.flags, condition.flagsUnset)) return false
  if (!holdsAll(progress.roomsVisited, condition.roomsVisited)) return false
  if (!holdsNone(progress.roomsVisited, condition.roomsUnvisited)) return false
  if (!holdsAll(progress.doorsReleased, condition.doorsReleased)) return false
  if (!holdsAll(progress.termsSigned, condition.termsSigned)) return false
  if (!holdsAll(progress.locksSeen, condition.locksSeen)) return false
  // `some` of nothing is false, which is the rule: with no branch to take,
  // there is no way through.
  if (condition.anyOf && !condition.anyOf.some((branch) => progressConditionMet(branch, progress, content))) {
    return false
  }
  return true
}

/**
 * How a requirement behaves as the save grows.
 *
 *   positive  once true, true for good: the save only ever adds.
 *   negative  true until something happens ("still shut", "not read yet").
 *   all       true of every room or piece there is, so a lot that adds one
 *             makes it false again for a player who had finished.
 */
export type ConditionClass = 'positive' | 'negative' | 'all'

/**
 * The class of every field a condition can have. A field added to the schema
 * without a line here does not compile, and the content gate cannot be left
 * guessing whether a trigger may ask it.
 */
export const CONDITION_FIELD_CLASS = {
  powered: 'positive',
  unpowered: 'negative',
  locksOpened: 'positive',
  locksClosed: 'negative',
  // A lock that was touched stays touched: the list only grows.
  locksSeen: 'positive',
  documentsRead: 'positive',
  documentsUnread: 'negative',
  carried: 'positive',
  allRoomsPowered: 'all',
  allCatalogued: 'all',
  catalogued: 'positive',
  hotspotsSeen: 'positive',
  credentials: 'positive',
  flags: 'positive',
  flagsUnset: 'negative',
  roomsVisited: 'positive',
  roomsUnvisited: 'negative',
  doorsReleased: 'positive',
  termsSigned: 'positive',
  // By itself: what it is worth is what its branches are, read below.
  anyOf: 'positive',
} as const satisfies Record<keyof ProgressCondition, ConditionClass>

/** Every class of requirement a condition makes, in its branches too. */
export function conditionClasses(condition: ProgressCondition): ReadonlySet<ConditionClass> {
  const classes = new Set<ConditionClass>()
  for (const field of Object.keys(CONDITION_FIELD_CLASS) as (keyof ProgressCondition)[]) {
    const asked = condition[field]
    // An empty list, or `false`, asks for nothing.
    if (Array.isArray(asked) ? asked.length > 0 : asked === true) classes.add(CONDITION_FIELD_CLASS[field])
  }
  for (const branch of condition.anyOf ?? []) {
    for (const inner of conditionClasses(branch)) classes.add(inner)
  }
  return classes
}

/**
 * The worst class anywhere in a condition.
 *
 * Negative is worse than "all": a guard that can stop holding makes what it
 * guards depend on the order the player did things in, while "all" only
 * changes its mind when the museum grows.
 */
export function conditionClass(condition: ProgressCondition): ConditionClass {
  const classes = conditionClasses(condition)
  return classes.has('negative') ? 'negative' : classes.has('all') ? 'all' : 'positive'
}
