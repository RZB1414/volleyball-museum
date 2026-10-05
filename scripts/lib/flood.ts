/**
 * Where a player can stand: the floor of the museum, flooded on foot.
 *
 * `test:navigation` proved routes: a list of waypoints somebody chose, from a
 * door to a breaker. A route proves the thing at its end can be reached and
 * says nothing of the twenty-odd things no route was written for. L1 walked
 * to the two breakers; the twelve pieces, the cabinets, the notebook, the
 * radio and the doors themselves were reachable because nobody had yet put
 * anything in front of them.
 *
 * So the question is asked the other way round. Starting where the night
 * starts, the real capsule is walked by the real `movePlayer` from the centre
 * of one 25 cm cell to the centre of each of its four neighbours, and a cell
 * is entered when the capsule comes to rest within five centimetres of its
 * centre with the floor still under it. What comes out is every place a
 * player can be standing. Every interactive is then held to two things:
 *
 *   (a) one of those places, in its own room, has the eye within the reach
 *       of its ray and outside its interaction volume;
 *   (b) so does the place NEAREST to it, which is where a player who walks
 *       at a thing ends up. A volume the capsule can walk into fails here:
 *       the prompt goes out exactly on arrival (ÁT-A1 was this).
 *
 * Whether a cell is free is never asked of `world.intersects`: a capsule
 * standing on a floor touches it, so at floor level everything "intersects".
 * The capsule is walked, and where it stops is the answer.
 *
 * Reach is distance, as it is in the game: each targeting ray is cast only
 * at its own kind of target, so E on a cabinet passes through a chair. What
 * (a) catches is a thing no walkable place is near, and that takes more
 * than one piece of furniture in the way: a partition across the office
 * lane leaves the locked cabinet a way round the desk, and a wall a metre
 * in front of it leaves it within arm's reach of the far side. (b) catches
 * the rest of what a player meets.
 */

import { Vector3 } from 'three'

import { BAKED_BUNDLES, type BakedBundle } from '../../src/content/bake.generated.ts'
import { MUSEUM } from '../../src/content/museum.ts'
import type { MuseumContent } from '../../src/content/schema.ts'
import type { ValidationIssue } from '../../src/content/validate.ts'
import { MAX_STEP_HEIGHT, movePlayer, type CollisionWorld } from '../../src/engine/collision.ts'
import {
  buildMuseumWorld,
  CAPSULE,
  distanceToVolume,
  EYE_HEIGHT,
  interactionVolumes,
  roomContaining,
  roomPoint,
  STEP,
  WALK_SPEED,
  type InteractionVolume,
} from './museumWorld.ts'

/** The grid of M15: a quarter of a metre, under the capsule's own radius. */
export const FLOOD_CELL = 0.25
/** A cell is entered when the capsule's axis rests this close to its centre. */
export const FLOOD_ARRIVAL = 0.05
/**
 * A walk that ends this much lower than it began was a fall: more than the
 * step the engine climbs, with two centimetres for the press into the floor.
 * Measured walk by walk, not from where the flood began, so a ramp is
 * walked and a ledge is not jumped off: a place reached by dropping is one
 * with no way back.
 */
const FALL_LIMIT = MAX_STEP_HEIGHT + 0.02
/**
 * How many times the steps of a clear walk a blocked one may take. A capsule
 * that slides round the corner of a plinth and still arrives has walked
 * there; one that leans on a wall for a second has not. The museum floods
 * to the same cells with 1 and with 6: this is what a failed walk costs.
 */
const PATIENCE = 2

export type Flood = {
  readonly cell: number
  /** Where the capsule's foot came to rest in each cell it entered; the start is first. */
  readonly points: readonly Vector3[]
  /** For each point, the index of the one it was walked to from; -1 for the start. */
  readonly parents: readonly number[]
  /** How many walks from a cell to a neighbour were tried. */
  readonly walks: number
}

const scratchHeading = new Vector3()

/**
 * One walk: from `from`, steering at `goal` every step as a player holding
 * forward does, until the capsule rests within `FLOOD_ARRIVAL` of it with
 * the floor under it. Null when it does not get there in `budget` steps, or
 * drops off what it was standing on.
 */
function walkTo(world: CollisionWorld, from: Vector3, goal: Vector3, budget: number) {
  const stride = WALK_SPEED * STEP
  const position = from.clone()
  let vertical = 0
  for (let step = 0; step < budget; step += 1) {
    scratchHeading.set(goal.x - position.x, 0, goal.z - position.z)
    const left = scratchHeading.length()
    // The last step is cut to what is left, so an open floor is entered
    // exactly on its centres; on the centre and not yet at rest, it waits.
    scratchHeading.multiplyScalar(left > 1e-6 ? Math.min(stride, left) / left : 0)
    const result = movePlayer(world, position, scratchHeading, vertical, STEP, CAPSULE)
    position.copy(result.position)
    vertical = result.verticalVelocity
    if (position.y < from.y - FALL_LIMIT) return null
    if (!result.grounded || Math.hypot(goal.x - position.x, goal.z - position.z) > FLOOD_ARRIVAL) continue
    // `grounded` is also what the engine says of a capsule it has just
    // stepped up, and one sinking past the edge of a floor is stepped
    // against the slab's side on its way down. So the floor is asked the
    // question the spawn asks: is there something to stand on under here?
    if (world.hasWalkableSupportBelow(position, CAPSULE)) return position
  }
  return null
}

const stepsFor = (distance: number) => Math.ceil(distance / (WALK_SPEED * STEP)) * PATIENCE

/**
 * Every place the capsule can stand, walking from `start`.
 *
 * Breadth first over a grid anchored on the start itself, so the start is
 * the centre of the first cell and nothing depends on where a room's origin
 * happens to fall. Each cell keeps the point the capsule actually stopped
 * at, and the walk to a neighbour leaves from there: the five centimetres
 * of tolerance do not add up from cell to cell, because every arrival is
 * measured against its own centre.
 */
export function floodFrom(world: CollisionWorld, start: Vector3, cell = FLOOD_CELL): Flood {
  // Let the capsule settle before the first walk: a spawn authored on the
  // floor's datum touches it with no overlap, and the first step would
  // otherwise spend itself on gravity.
  let settled = start.clone()
  let velocity = 0
  const still = new Vector3()
  for (let step = 0; step < 12; step += 1) {
    const result = movePlayer(world, settled, still, velocity, STEP, CAPSULE)
    settled = result.position
    velocity = result.verticalVelocity
  }
  if (!world.hasWalkableSupportBelow(settled, CAPSULE)) {
    throw new Error(
      `the flood starts at ${start.toArray().map((value) => value.toFixed(2)).join(', ')}, where there is no floor`,
    )
  }

  const budget = stepsFor(cell)
  // Two small integers in one number: no string is built per cell.
  const SPAN = 1 << 15
  const key = (column: number, row: number) => (column + SPAN / 2) * SPAN + (row + SPAN / 2)

  const indexOf = new Map<number, number>([[key(0, 0), 0]])
  const cells: (readonly [number, number])[] = [[0, 0]]
  const points: Vector3[] = [settled]
  const parents: number[] = [-1]
  const goal = new Vector3()
  let walks = 0

  for (let head = 0; head < cells.length; head += 1) {
    const [column, row] = cells[head]
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = key(column + dx, row + dz)
      if (indexOf.has(next)) continue
      walks += 1
      // Only where it is on the plan: how high the floor is there is the walk's to find.
      goal.set(start.x + (column + dx) * cell, 0, start.z + (row + dz) * cell)
      const arrived = walkTo(world, points[head], goal, budget)
      if (!arrived) continue
      indexOf.set(next, points.length)
      cells.push([column + dx, row + dz])
      points.push(arrived)
      parents.push(head)
    }
  }

  return { cell, points, parents, walks }
}

/** The place of a flood nearest a floor point, and how far from it. */
export function nearestPlace(flood: Flood, to: Vector3) {
  let index = 0
  let distance = Infinity
  flood.points.forEach((point, candidate) => {
    const away = Math.hypot(point.x - to.x, point.z - to.z)
    if (away < distance) {
      distance = away
      index = candidate
    }
  })
  return { index, distance }
}

/**
 * The way back. The flood walked OUT from the start, and a doorway that lets
 * the capsule through one way is not thereby one that lets it back: this
 * walks the capsule from a place, cell by cell, along the chain it was
 * reached by, to where the flood began.
 */
export function walkBack(world: CollisionWorld, flood: Flood, from: number) {
  let position: Vector3 = flood.points[from]
  let hops = 0
  for (let index = flood.parents[from]; index >= 0; index = flood.parents[index]) {
    const goal = flood.points[index]
    const away = Math.hypot(goal.x - position.x, goal.z - position.z)
    const arrived = walkTo(world, position, goal, stepsFor(Math.max(away, flood.cell)))
    if (!arrived) return { arrived: false, hops, stopped: position }
    position = arrived
    hops += 1
  }
  return { arrived: true, hops, stopped: position }
}

// ---------------------------------------------------------------------------
// Each interactive, from where a player can stand
// ---------------------------------------------------------------------------

export type Standing = {
  /** Where the capsule's foot is. */
  readonly point: Vector3
  /** From the eye to the nearest point of the volume; zero with the eye inside it. */
  readonly distance: number
}

export type StandingVerdict = {
  readonly volume: InteractionVolume
  /** Places of its room the capsule can occupy with the target as the player finds it. */
  readonly places: number
  /** (a) The nearest place with the eye outside the volume and within reach, if there is one. */
  readonly usable: Standing | null
  /** (b) The place nearest the target, whatever the eye meets there. */
  readonly nearest: Standing | null
}

const eyeAbove = (point: Vector3) => new Vector3(point.x, point.y + EYE_HEIGHT, point.z)

/** What the flood says of every interactive: the two places the rule asks about. */
export function standingVerdicts(
  flood: Flood,
  volumes: readonly InteractionVolume[],
  content: MuseumContent = MUSEUM,
): StandingVerdict[] {
  const byRoom = new Map<string, Vector3[]>()
  for (const point of flood.points) {
    const room = roomContaining(point, content)
    if (!room) continue
    const list = byRoom.get(room.id) ?? []
    list.push(point)
    byRoom.set(room.id, list)
  }

  return volumes.map((volume) => {
    let places = 0
    let usable: Standing | null = null
    let nearest: Standing | null = null
    for (const point of byRoom.get(volume.roomId) ?? []) {
      // In front of a shut door the capsule stops at the gate.
      if (volume.gate?.intersects(point, CAPSULE)) continue
      places += 1
      const distance = distanceToVolume(volume.mesh, eyeAbove(point))
      if (!nearest || distance < nearest.distance) nearest = { point, distance }
      if (distance > 0 && distance <= volume.reach && (!usable || distance < usable.distance)) {
        usable = { point, distance }
      }
    }
    return { volume, places, usable, nearest }
  })
}

/**
 * The verdicts as accusations, each about one interactive: what a debt line
 * can date. A thing with no usable place is `no-standing-point`; a thing
 * whose nearest place puts the eye inside its volume is
 * `standing-point-inside-target`, even when a step back would do.
 */
export function standingIssues(verdicts: readonly StandingVerdict[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const at = (point: Vector3) => `${point.x.toFixed(2)}, ${point.z.toFixed(2)}`
  for (const { volume, places, usable, nearest } of verdicts) {
    if (!usable) {
      issues.push({
        severity: 'error',
        code: 'no-standing-point',
        id: volume.id,
        message:
          `No place a player can stand in "${volume.roomId}" has the eye within ${volume.reach} m of ` +
          `"${volume.id}" and outside its interaction volume (${places} place(s) in the room` +
          (nearest ? `, the nearest ${nearest.distance.toFixed(2)} m away at ${at(nearest.point)}` : '') +
          `).`,
      })
    }
    if (nearest && nearest.distance === 0) {
      issues.push({
        severity: 'error',
        code: 'standing-point-inside-target',
        id: volume.id,
        message:
          `Walking up to "${volume.id}" in "${volume.roomId}", the capsule stands at ${at(nearest.point)} ` +
          `with the eye inside the interaction volume: nothing solid keeps the player out of it.`,
      })
    }
  }
  return issues
}

export type StandingSurvey = {
  readonly world: CollisionWorld
  readonly flood: Flood
  readonly verdicts: readonly StandingVerdict[]
  readonly issues: readonly ValidationIssue[]
  /** How many of the flood's places fall in each room. */
  readonly placesByRoom: ReadonlyMap<string, number>
}

/** The whole question for one content set and one bake: flood from the spawn, judge every interactive. */
export function surveyStanding(
  content: MuseumContent = MUSEUM,
  bundles: readonly BakedBundle[] = BAKED_BUNDLES,
): StandingSurvey {
  const world = buildMuseumWorld(content, bundles)
  const spawn = roomPoint(content.spawn.room, content.spawn.position[0], content.spawn.position[2], content)
  const flood = floodFrom(world, spawn)
  const verdicts = standingVerdicts(flood, interactionVolumes(content, bundles), content)
  const placesByRoom = new Map<string, number>(content.rooms.map((room) => [room.id, 0]))
  for (const point of flood.points) {
    const room = roomContaining(point, content)
    if (room) placesByRoom.set(room.id, (placesByRoom.get(room.id) ?? 0) + 1)
  }
  return { world, flood, verdicts, issues: standingIssues(verdicts), placesByRoom }
}
