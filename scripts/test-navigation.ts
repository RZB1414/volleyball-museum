/**
 * Headless proof that a player can actually walk the museum.
 *
 *   npm run test:navigation
 *
 * Written after the owner reported "só estou podendo andar por essa sala
 * inicial" — and was right. The museum had three rooms and no working doorway
 * between any of them, for two independent reasons that had been there since
 * the shells were first baked:
 *
 *   1. `buildWall` lays its segments along +X and the caller rotates the wall
 *      into place. `rotateY(PI)` and `rotateY(PI/2)` reverse that axis, so
 *      every south and east opening came out mirrored about the wall's
 *      midpoint. Each room's hole was real; it just never met its neighbour's.
 *   2. The floor slab was exactly `shell.width` across, which stops at the
 *      centre line of its own walls. Two rooms back to back therefore had a
 *      strip of nothing directly under the doorway.
 *
 * Neither was visible in a screenshot. Both were obvious the moment anything
 * tried to walk through, which nothing ever did.
 *
 * So this test walks. It builds the real shells with the real generator, wires
 * them into the real `CollisionWorld`, and drives the real `movePlayer` with a
 * capsule the size of the real player, from the middle of one room to the
 * middle of the next. It asserts arrival, and it asserts the floor was under
 * the player the whole way — a doorway you can pass through by falling into
 * the void is not a doorway.
 */

import { Mesh, MeshBasicMaterial, Vector3 } from 'three'

import { MUSEUM } from '../src/content/museum.ts'
import { CollisionWorld, movePlayer, worldFromMeshes } from '../src/engine/collision.ts'
// @ts-expect-error - the bake is plain JS with no type declarations.
import { buildRoomShell } from './bake/kit.mjs'

const CAPSULE = { radius: 0.3, height: 1.75 }
const STEP = 1 / 60
const SPEED = 2.6
/** Give up after this many simulated seconds; a real crossing takes about six. */
const TIME_LIMIT = 30
/** The player's feet must never drop this far below the floor plane. */
const FALL_LIMIT = -0.35

let failures = 0
let checks = 0

function check(name: string, condition: boolean, detail = '') {
  checks += 1
  if (condition) console.log(`  pass  ${name}`)
  else {
    failures += 1
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ---------------------------------------------------------------------------
// Build the museum, once, exactly as the bake does.
// ---------------------------------------------------------------------------

function buildWorld(): CollisionWorld {
  const meshes: Mesh[] = []
  for (const room of MUSEUM.rooms) {
    for (const part of buildRoomShell(room) as { name: string; geometry: never }[]) {
      const mesh = new Mesh(part.geometry, new MeshBasicMaterial())
      mesh.name = part.name
      mesh.position.set(room.origin[0], room.origin[1], room.origin[2])
      meshes.push(mesh)
    }
  }
  return worldFromMeshes(meshes)
}

const world = buildWorld()

/** Where a room's centre is in world space, at floor level. */
function centreOf(roomId: string) {
  const room = MUSEUM.rooms.find((candidate) => candidate.id === roomId)
  if (!room) throw new Error(`no room "${roomId}"`)
  return new Vector3(room.origin[0], 0, room.origin[2])
}

/** A portal's opening in world space. */
function portalWorld(roomId: string, portalId: string) {
  const room = MUSEUM.rooms.find((candidate) => candidate.id === roomId)
  const portal = room?.portals.find((candidate) => candidate.id === portalId)
  if (!room || !portal) throw new Error(`no portal "${portalId}" in "${roomId}"`)
  return new Vector3(
    room.origin[0] + portal.position[0],
    0,
    room.origin[2] + portal.position[2],
  )
}

/**
 * Walks from `from` to `to` by steering straight at a sequence of waypoints.
 *
 * Deliberately dumb: no pathfinding, no wall following. A doorway a straight
 * line cannot get through is a doorway a player will fight with.
 */
function walk(waypoints: Vector3[]) {
  const position = waypoints[0].clone()
  let verticalVelocity = 0
  let lowest = 0
  let elapsed = 0
  let target = 1

  while (target < waypoints.length && elapsed < TIME_LIMIT) {
    const goal = waypoints[target]
    const toGoal = new Vector3(goal.x - position.x, 0, goal.z - position.z)

    if (toGoal.length() < 0.25) {
      target += 1
      continue
    }

    toGoal.normalize().multiplyScalar(SPEED * STEP)
    const result = movePlayer(world, position, toGoal, verticalVelocity, STEP, CAPSULE)
    position.copy(result.position)
    verticalVelocity = result.verticalVelocity
    lowest = Math.min(lowest, position.y)
    elapsed += STEP
  }

  return { position, lowest, elapsed, arrived: target >= waypoints.length }
}

// ---------------------------------------------------------------------------
// Every doorway, in both directions.
// ---------------------------------------------------------------------------

/**
 * Each crossing is three waypoints: start in the middle of the room, aim at
 * the doorway, then aim at the middle of the next room. The doorway waypoint
 * matters — without it the straight line from centre to centre clips the wall
 * and the test would pass or fail on room proportions rather than on the door.
 */
const CROSSINGS = [
  { name: 'atrium → Holyoke', from: 'atrium', via: ['atrium', 'atrium-to-holyoke'], to: 'holyoke' },
  { name: 'Holyoke → atrium', from: 'holyoke', via: ['holyoke', 'holyoke-to-atrium'], to: 'atrium' },
  { name: 'atrium → office', from: 'atrium', via: ['atrium', 'atrium-to-office'], to: 'office' },
  { name: 'office → atrium', from: 'office', via: ['office', 'office-to-atrium'], to: 'atrium' },
  {
    name: 'Holyoke → atrium (shortcut)',
    from: 'holyoke',
    via: ['holyoke', 'holyoke-shortcut'],
    to: 'atrium',
  },
] as const

console.log('Navigation:')

for (const crossing of CROSSINGS) {
  const doorway = portalWorld(crossing.via[0], crossing.via[1])
  const start = centreOf(crossing.from)
  const finish = centreOf(crossing.to)

  // Step through the opening rather than stopping in it: the far waypoint is
  // a metre past the threshold, on the neighbour's side.
  const beyond = doorway.clone().add(
    finish.clone().sub(doorway).setY(0).normalize().multiplyScalar(1.2),
  )

  const result = walk([start, doorway.clone(), beyond, finish])

  check(
    `${crossing.name} — the player gets there`,
    result.arrived,
    `stopped at ${result.position.toArray().map((n) => n.toFixed(2)).join(',')} ` +
      `after ${result.elapsed.toFixed(1)}s (target ${finish.toArray().map((n) => n.toFixed(1)).join(',')})`,
  )

  check(
    `${crossing.name} — there is floor the whole way`,
    result.lowest > FALL_LIMIT,
    `dropped to y=${result.lowest.toFixed(2)}, which means a gap in the slabs under the doorway`,
  )
}

// ---------------------------------------------------------------------------
// Every room is reachable from the spawn.
// ---------------------------------------------------------------------------

/**
 * A doorway that works in isolation is not the same as a museum you can tour.
 * This is the property that actually matters, and the one the owner tested by
 * pressing W.
 */
const reachable = new Set<string>(['atrium'])
let grew = true
while (grew) {
  grew = false
  for (const crossing of CROSSINGS) {
    if (reachable.has(crossing.from) && !reachable.has(crossing.to)) {
      reachable.add(crossing.to)
      grew = true
    }
  }
}

for (const room of MUSEUM.rooms) {
  check(`${room.id} is reachable on foot from the spawn`, reachable.has(room.id))
}

console.log(`${checks - failures}/${checks} checks passed`)
if (failures > 0) process.exitCode = 1
