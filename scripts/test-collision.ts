/**
 * Headless proof for the Rapier replacement.
 *
 *   npm run test:collision
 *
 * The plan committed to dropping @react-three/rapier — 803 KB of the 1,274 KB
 * gzip payload — only IF a three-mesh-bvh capsule could carry walls, slopes,
 * step-up and gravity. "It's about 150 lines" was an assertion, not a result.
 * This turns it into a result.
 *
 * Every case below is a scenario the museum actually needs. If any of them
 * fails, the honest move is to put Rapier back in a lazy chunk rather than ship
 * a player who walks through a wall.
 */

import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three'

import {
  CollisionWorld,
  MAX_STEP_HEIGHT,
  movePlayer,
  worldFromMeshes,
} from '../src/engine/collision.ts'

const CAPSULE = { radius: 0.3, height: 1.75 }
const STEP = 1 / 60

let failures = 0
let checks = 0

function check(name: string, condition: boolean, detail = '') {
  checks += 1
  if (condition) {
    console.log(`  pass  ${name}`)
  } else {
    failures += 1
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function box(width: number, height: number, depth: number, x: number, y: number, z: number) {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), new MeshBasicMaterial())
  mesh.position.set(x, y, z)
  return mesh
}

/**
 * A small test room:
 *   - floor at y = 0, 20 x 20
 *   - solid wall at x = +4
 *   - a 0.18 m threshold at z = -3 (should be walkable)
 *   - a 0.45 m block at z = +3 (should NOT be walkable)
 *   - a ramp at x = -4
 */
function buildTestWorld(): CollisionWorld {
  const floor = box(20, 0.4, 20, 0, -0.2, 0)
  const wall = box(0.4, 3, 20, 4, 1.5, 0)
  const threshold = box(6, 0.18, 0.5, 0, 0.09, -3)
  const tallBlock = box(6, 0.45, 0.5, 0, 0.225, 3)

  const ramp = box(2.4, 0.3, 4, -4, 0.15, 0)
  ramp.rotation.z = -0.35
  ramp.updateMatrixWorld(true)

  return worldFromMeshes([floor, wall, threshold, tallBlock, ramp])
}

/**
 * Runs `frames` steps of movement with a constant horizontal velocity, and
 * reports the whole trajectory rather than just where it stopped.
 *
 * The first version of this only returned the final state, and two cases
 * "failed" purely because of it: the player stepped onto the threshold and
 * carried on over the far side, and walked up the ramp and off its end. Both
 * were correct behaviour that a final-frame assertion cannot see. Anything
 * about traversal has to be asserted over the path.
 */
function simulate(
  world: CollisionWorld,
  start: Vector3,
  velocity: Vector3,
  frames: number,
): {
  position: Vector3
  grounded: boolean
  stepped: boolean
  maxY: number
  groundedFrames: number
} {
  let position = start.clone()
  let verticalVelocity = 0
  let grounded = false
  let stepped = false
  let maxY = start.y
  let groundedFrames = 0

  const displacement = new Vector3()
  for (let frame = 0; frame < frames; frame += 1) {
    displacement.copy(velocity).multiplyScalar(STEP)
    const result = movePlayer(world, position, displacement, verticalVelocity, STEP, CAPSULE)
    position = result.position
    verticalVelocity = result.verticalVelocity
    grounded = result.grounded
    if (result.stepped) stepped = true
    if (result.grounded) groundedFrames += 1
    if (position.y > maxY) maxY = position.y
  }

  return { position, grounded, stepped, maxY, groundedFrames }
}

console.log('collision — capsule vs static BVH\n')

const world = buildTestWorld()
check('world builds', world.size === 5, `${world.size} colliders`)

// --- 1. Gravity and resting on the floor ----------------------------------
{
  const result = simulate(world, new Vector3(0, 2, 0), new Vector3(0, 0, 0), 120)
  check(
    'falls and settles on the floor',
    Math.abs(result.position.y) < 0.02,
    `y = ${result.position.y.toFixed(4)}`,
  )
  check('reports grounded after landing', result.grounded)
}

// --- 2. Standing still does not sink or drift ------------------------------
{
  const result = simulate(world, new Vector3(0, 0, 0), new Vector3(0, 0, 0), 300)
  check(
    'does not sink through the floor over 5 seconds',
    Math.abs(result.position.y) < 0.02,
    `y = ${result.position.y.toFixed(4)}`,
  )
  check(
    'does not drift horizontally while idle',
    Math.hypot(result.position.x, result.position.z) < 0.01,
    `xz = ${result.position.x.toFixed(4)}, ${result.position.z.toFixed(4)}`,
  )
}

// --- 3. Walls stop the player ----------------------------------------------
{
  // Walk east into the wall at x = 4 for two seconds at 4 m/s.
  const result = simulate(world, new Vector3(0, 0, 0), new Vector3(4, 0, 0), 120)
  check(
    'does not pass through a wall',
    result.position.x < 3.8,
    `x = ${result.position.x.toFixed(3)} (wall face at 3.8)`,
  )
  check(
    'gets close to the wall rather than stopping short',
    result.position.x > 3.3,
    `x = ${result.position.x.toFixed(3)}`,
  )
}

// --- 4. Sliding along a wall ------------------------------------------------
{
  // Push diagonally into the wall: should slide north along it, not stick.
  const result = simulate(world, new Vector3(0, 0, 0), new Vector3(4, 0, -4), 120)
  check(
    'slides along a wall instead of sticking',
    result.position.z < -4,
    `z = ${result.position.z.toFixed(3)}`,
  )
}

// --- 5. Step-up over a threshold -------------------------------------------
{
  // Approach the 0.18 m threshold at z = -3 from the south. It is only 0.5 m
  // deep, so a walking player crosses it and comes down the other side — the
  // assertion has to be on the peak of the path, not its end.
  const result = simulate(world, new Vector3(0, 0, -1.5), new Vector3(0, 0, -3), 90)
  check(
    'crosses a 0.18 m threshold',
    result.position.z < -3.4,
    `z = ${result.position.z.toFixed(3)} (threshold at -3)`,
  )
  check(
    'rises onto the threshold instead of clipping through it',
    result.maxY > 0.15,
    `peak y = ${result.maxY.toFixed(3)}, expected > 0.15 (threshold top at 0.18)`,
  )
  check('the step-up path was actually taken', result.stepped)
  check(
    'comes back down to floor level on the far side',
    Math.abs(result.position.y) < 0.02,
    `y = ${result.position.y.toFixed(3)}`,
  )
}

// --- 6. A block taller than the step limit blocks --------------------------
{
  const result = simulate(world, new Vector3(0, 0, 1.5), new Vector3(0, 0, 3), 90)
  check(
    `is blocked by a 0.45 m block (step limit ${MAX_STEP_HEIGHT} m)`,
    result.position.z < 2.75,
    `z = ${result.position.z.toFixed(3)} (block face at 2.75)`,
  )
}

// --- 7. Walking up a ramp ---------------------------------------------------
{
  // The ramp spans roughly x = -5.2 to -2.8 and rises to the west. Walk only
  // 1 second at 1.2 m/s so the player is still ON it at the end — the earlier
  // version walked 3.75 m, straight off the far edge, and then complained that
  // a falling player was not grounded.
  const result = simulate(world, new Vector3(-3.2, 0.3, 0), new Vector3(-1.2, 0, 0), 60)
  check(
    'climbs a 20-degree ramp rather than being stopped by it',
    result.position.x < -3.8,
    `x = ${result.position.x.toFixed(3)} from -3.2`,
  )
  check(
    'gains height on the way up',
    result.maxY > 0.2,
    `peak y = ${result.maxY.toFixed(3)}`,
  )
  check(
    'stays grounded for most of the climb',
    result.groundedFrames > 45,
    `grounded on ${result.groundedFrames}/60 frames`,
  )
}

// --- 8. No NaN under degenerate input --------------------------------------
{
  const result = simulate(world, new Vector3(0, 0.05, 0), new Vector3(0, 0, 0), 30)
  check(
    'produces no NaN when spawned overlapping the floor',
    Number.isFinite(result.position.x) &&
      Number.isFinite(result.position.y) &&
      Number.isFinite(result.position.z),
    `${result.position.toArray().join(', ')}`,
  )
}

// --- 9. Uneven frame times --------------------------------------------------
//
// Every test above uses a perfect 1/60 step, and that is exactly why they all
// passed while a player still fell through the floor a second after entering
// the museum. Real frame times are erratic right after a scene loads: a long
// frame while a GLB is decoded, then a burst of very short ones. Any term in
// the integrator that divides by delta explodes on the short frames.
{
  const jitter = [1 / 60, 0.0001, 1 / 60, 0.00005, 1 / 30, 0.0002, 1 / 60, 0.25, 1 / 60]
  let position = new Vector3(0, 0, 0)
  let verticalVelocity = 0
  let lowest = 0
  const displacement = new Vector3()

  for (let round = 0; round < 40; round += 1) {
    for (const delta of jitter) {
      displacement.set(0, 0, 0)
      const result = movePlayer(world, position, displacement, verticalVelocity, delta, CAPSULE)
      position = result.position
      verticalVelocity = result.verticalVelocity
      if (position.y < lowest) lowest = position.y
    }
  }

  check(
    'survives wildly uneven frame times without sinking',
    lowest > -0.05,
    `lowest y = ${lowest.toFixed(4)}`,
  )
  check(
    'ends standing on the floor after the jitter storm',
    Math.abs(position.y) < 0.02,
    `y = ${position.y.toFixed(4)}`,
  )
}

// --- 10. A single enormous frame does not tunnel ----------------------------
{
  // Tab restored from the background, or a long GC pause.
  const result = movePlayer(world, new Vector3(0, 0.05, 0), new Vector3(0, 0, 0), 0, 2.0, CAPSULE)
  check(
    'a two-second frame does not push the player through the floor',
    result.position.y > -0.05,
    `y = ${result.position.y.toFixed(4)}`,
  )
}

// --- 11. Cost per frame ------------------------------------------------------
{
  const position = new Vector3(0, 0, 0)
  const displacement = new Vector3(0.05, 0, 0.05)
  const iterations = 2000
  const started = process.hrtime.bigint()
  for (let index = 0; index < iterations; index += 1) {
    movePlayer(world, position, displacement, 0, STEP, CAPSULE)
  }
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6
  const perFrame = elapsedMs / iterations
  // The frame budget is 16.6 ms on desktop and 22 ms on mid-range Android.
  // Collision has no business taking more than a small fraction of it.
  check(
    `costs under 0.5 ms per frame (${perFrame.toFixed(3)} ms)`,
    perFrame < 0.5,
    `${perFrame.toFixed(3)} ms`,
  )
}

console.log(`\n${checks - failures}/${checks} checks passed`)
if (failures > 0) {
  console.log('\nThe Rapier replacement is NOT proven. Keep @react-three/rapier in a lazy chunk.')
  process.exitCode = 1
}
