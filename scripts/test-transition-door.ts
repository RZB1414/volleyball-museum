import assert from 'node:assert/strict'
import { PerspectiveCamera, Vector3 } from 'three'

import { MUSEUM } from '../src/content/museum.ts'
import {
  DEFAULT_TRANSITION_DOOR_CONFIG,
  createTransitionDoorConfig,
  createTransitionDoorState,
  inspectTransitionDoor,
  transitionDoor,
  type TransitionDoorConfig,
  type TransitionDoorState,
} from '../src/engine/transitionDoorState.ts'
import { advanceDoorRevealBarrier } from '../src/engine/transitionDoorReveal.ts'
import {
  buildTransitionDoorSpecs,
  canOpenTransitionDoor,
  transitionDoorEndpointMap,
  transitionDoorLeafPlacements,
  transitionDoorTarget,
  transitionDoorSwingSign,
  TRANSITION_DOOR_PLANE_Z,
  TRANSITION_DOOR_SILL_Y,
} from '../src/engine/transitionDoorTopology.ts'
import {
  isInsideTransitionDoorEnvelope,
  segmentCrossesTransitionDoor,
  transitionDoorCrossingSide,
  transitionDoorLocalPoint,
  transitionDoorSide,
} from '../src/engine/transitionDoorPassage.ts'
import { CollisionWorld } from '../src/engine/collision.ts'
import { registerTransitionDoorGate } from '../src/engine/transitionDoorCollision.ts'
import { buildCells, computeVisibleRooms } from '../src/engine/portals.ts'

let passed = 0

function test(name: string, run: () => void) {
  run()
  passed += 1
  console.log(`  pass  ${name}`)
}

function closeTo(actual: number, expected: number, epsilon = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  )
}

function coldArmedDoor(): TransitionDoorState {
  let door = createTransitionDoorState()
  door = transitionDoor(door, { type: 'proximity' })
  door = transitionDoor(door, { type: 'interact' })
  return door
}

function fullyOpenDoor(
  config: TransitionDoorConfig = DEFAULT_TRANSITION_DOOR_CONFIG,
): TransitionDoorState {
  let door = transitionDoor(coldArmedDoor(), { type: 'preload-ready' }, config)
  door = transitionDoor(
    door,
    { type: 'advance', deltaSeconds: config.durationSeconds },
    config,
  )
  assert.equal(door.phase, 'open')
  return door
}

function startClosing(
  door: TransitionDoorState,
  config: TransitionDoorConfig = DEFAULT_TRANSITION_DOOR_CONFIG,
) {
  const occupied = transitionDoor(door, { type: 'passage-enter' }, config)
  return transitionDoor(occupied, { type: 'passage-clear', crossed: true }, config)
}

console.log('\nTransition door state machine')

test('renders a complete furnished frame before the first hinge movement', () => {
  let observed = false
  let reveal = advanceDoorRevealBarrier(observed, false, false)
  assert.equal(reveal.advance, false, 'cold room stays closed')
  observed = reveal.frameObserved

  reveal = advanceDoorRevealBarrier(observed, true, false)
  assert.equal(reveal.advance, false, 'React visibility must commit first')
  observed = reveal.frameObserved

  reveal = advanceDoorRevealBarrier(observed, true, true)
  assert.equal(reveal.advance, false, 'first ready+visible frame remains closed')
  assert.equal(reveal.frameObserved, true)

  reveal = advanceDoorRevealBarrier(reveal.frameObserved, true, true)
  assert.equal(reveal.advance, true, 'only the following frame may rotate the leaf')

  reveal = advanceDoorRevealBarrier(reveal.frameObserved, false, true)
  assert.deepEqual(
    reveal,
    { advance: false, frameObserved: false },
    'readiness invalidation resets the reveal acknowledgement',
  )
})

test('revoking readiness before movement returns the armed door to preload', () => {
  const opening = transitionDoor(coldArmedDoor(), { type: 'preload-ready' })
  assert.equal(opening.phase, 'opening')
  const invalidated = transitionDoor(opening, { type: 'preload-invalidated' })
  assert.equal(invalidated.phase, 'preloading')
  assert.equal(invalidated.interactionArmed, true)
  assert.equal(inspectTransitionDoor(invalidated).angleRadians, 0)

  const moving = transitionDoor(opening, { type: 'advance', deltaSeconds: 0.1 })
  assert.equal(
    transitionDoor(moving, { type: 'preload-invalidated' }),
    moving,
    'a completed reveal generation is immutable after the hinge actually moves',
  )
})

test('starts closed with its collider blocking the doorway', () => {
  const door = createTransitionDoorState()
  const snapshot = inspectTransitionDoor(door)
  assert.equal(snapshot.phase, 'closed')
  assert.equal(snapshot.linearProgress, 0)
  assert.equal(snapshot.progress, 0)
  assert.equal(snapshot.angleRadians, 0)
  assert.equal(snapshot.colliderBlocked, true)
  assert.equal(snapshot.needsPreload, false)
  assert.equal(snapshot.passageOccupied, false)
})

test('proximity starts preload without mutating the previous state', () => {
  const closed = createTransitionDoorState()
  const preloading = transitionDoor(closed, { type: 'proximity' })
  assert.equal(closed.phase, 'closed')
  assert.equal(preloading.phase, 'preloading')
  assert.equal(inspectTransitionDoor(preloading).needsPreload, true)
})

test('an early interaction arms the door and ready opens it automatically', () => {
  const armed = coldArmedDoor()
  assert.equal(armed.phase, 'preloading')
  assert.equal(armed.interactionArmed, true)

  const opening = transitionDoor(armed, { type: 'preload-ready' })
  assert.equal(opening.phase, 'opening')
  assert.equal(opening.interactionArmed, false)
})

test('a warm door waits in ready until interaction', () => {
  let door = createTransitionDoorState()
  door = transitionDoor(door, { type: 'proximity' })
  door = transitionDoor(door, { type: 'preload-ready' })
  assert.equal(door.phase, 'ready')
  assert.equal(inspectTransitionDoor(door).colliderBlocked, true)

  door = transitionDoor(door, { type: 'interact' })
  assert.equal(door.phase, 'opening')
})

test('interaction from closed is robustly armed and requests preload', () => {
  const door = transitionDoor(createTransitionDoorState(), { type: 'interact' })
  const snapshot = inspectTransitionDoor(door)
  assert.equal(snapshot.phase, 'preloading')
  assert.equal(snapshot.interactionArmed, true)
  assert.equal(snapshot.needsPreload, true)
})

test('background preload may mark a closed door ready before proximity', () => {
  const ready = transitionDoor(createTransitionDoorState(), { type: 'preload-ready' })
  assert.equal(ready.phase, 'ready')
  assert.equal(transitionDoor(ready, { type: 'proximity' }), ready)
})

test('the default 0.8 second animation uses eased angle progress', () => {
  const opening = transitionDoor(coldArmedDoor(), { type: 'preload-ready' })
  const quarter = transitionDoor(opening, { type: 'advance', deltaSeconds: 0.2 })
  const snapshot = inspectTransitionDoor(quarter)
  closeTo(snapshot.linearProgress, 0.25)
  closeTo(snapshot.progress, 0.0625)
  closeTo(snapshot.angleRadians, (Math.PI / 2) * 0.0625)
  assert.equal(snapshot.colliderBlocked, true)

  const occupied = transitionDoor(quarter, { type: 'passage-enter' })
  assert.equal(inspectTransitionDoor(occupied).passageOccupied, true)
  assert.equal(inspectTransitionDoor(occupied).colliderBlocked, true)
})

test('completion clamps at the open pose and unblocks collision', () => {
  let door = transitionDoor(coldArmedDoor(), { type: 'preload-ready' })
  door = transitionDoor(door, { type: 'advance', deltaSeconds: 2 })
  const snapshot = inspectTransitionDoor(door)
  assert.equal(snapshot.phase, 'open')
  assert.equal(snapshot.linearProgress, 1)
  assert.equal(snapshot.progress, 1)
  closeTo(snapshot.angleRadians, Math.PI / 2)
  assert.equal(snapshot.colliderBlocked, false)
})

test('an open door remains open until the capsule actually enters the passage', () => {
  const open = createTransitionDoorState(true)
  assert.equal(transitionDoor(open, { type: 'proximity' }), open)
  assert.equal(transitionDoor(open, { type: 'interact' }), open)
  assert.equal(transitionDoor(open, { type: 'preload-ready' }), open)
  assert.equal(transitionDoor(open, { type: 'advance', deltaSeconds: 1 }), open)
  assert.equal(
    transitionDoor(open, { type: 'passage-clear', crossed: true }),
    open,
  )
  assert.equal(inspectTransitionDoor(open).colliderBlocked, false)
})

test('an abandoned open door can close without leaving another room rendered', () => {
  const open = fullyOpenDoor()
  const closing = transitionDoor(open, { type: 'idle-close' })
  assert.equal(closing.phase, 'closing')
  assert.equal(inspectTransitionDoor(closing).colliderBlocked, false)

  const occupied = transitionDoor(open, { type: 'passage-enter' })
  assert.equal(
    transitionDoor(occupied, { type: 'idle-close' }),
    occupied,
    'proximity loss cannot close leaves around a capsule in the passage',
  )
})

test('the door stays fully open while the capsule occupies the passage margin', () => {
  const open = fullyOpenDoor()
  const occupied = transitionDoor(open, { type: 'passage-enter' })
  const snapshot = inspectTransitionDoor(occupied)
  assert.equal(snapshot.phase, 'open')
  assert.equal(snapshot.linearProgress, 1)
  assert.equal(snapshot.passageOccupied, true)
  assert.equal(snapshot.colliderBlocked, false)
  assert.equal(transitionDoor(occupied, { type: 'passage-enter' }), occupied)
})

test('retreating through the arrival threshold cannot trigger auto-close', () => {
  let door = fullyOpenDoor()
  door = transitionDoor(door, { type: 'passage-enter' })

  // Crossing the geometric threshold is not enough: the runtime reports a
  // clear only after the outer safety margin, and tells the machine that this
  // was a retreat to the original side.
  door = transitionDoor(door, { type: 'passage-clear', crossed: false })
  assert.equal(door.phase, 'open')
  assert.equal(inspectTransitionDoor(door).passageOccupied, false)

  // Oscillating through the envelope any number of times remains harmless.
  for (let index = 0; index < 3; index += 1) {
    door = transitionDoor(door, { type: 'passage-enter' })
    door = transitionDoor(door, { type: 'passage-clear', crossed: false })
  }
  assert.equal(door.phase, 'open')
})

test('a complete traversal starts closing only after the outer margin clears', () => {
  const open = fullyOpenDoor()
  const occupied = transitionDoor(open, { type: 'passage-enter' })
  assert.equal(occupied.phase, 'open')

  const closing = transitionDoor(occupied, { type: 'passage-clear', crossed: true })
  const snapshot = inspectTransitionDoor(closing)
  assert.equal(snapshot.phase, 'closing')
  assert.equal(snapshot.linearProgress, 1)
  assert.equal(snapshot.progress, 1)
  assert.equal(snapshot.passageOccupied, false)
  assert.equal(snapshot.colliderBlocked, false)
})

test('the fast closing pose reverses smoothly and keeps the gate disabled', () => {
  const closing = startClosing(fullyOpenDoor())
  const halfway = transitionDoor(closing, {
    type: 'advance',
    deltaSeconds: DEFAULT_TRANSITION_DOOR_CONFIG.closeDurationSeconds / 2,
  })
  const snapshot = inspectTransitionDoor(halfway)
  closeTo(snapshot.linearProgress, 0.5)
  closeTo(snapshot.progress, 0.5)
  closeTo(snapshot.angleRadians, Math.PI / 4)
  assert.equal(snapshot.colliderBlocked, false)
})

test('re-entering during close reverses from the current pose without spawning a gate', () => {
  let door = startClosing(fullyOpenDoor())
  door = transitionDoor(door, {
    type: 'advance',
    deltaSeconds: DEFAULT_TRANSITION_DOOR_CONFIG.closeDurationSeconds / 2,
  })
  const before = inspectTransitionDoor(door)
  assert.equal(before.phase, 'closing')
  closeTo(before.linearProgress, 0.5)

  door = transitionDoor(door, { type: 'passage-enter' })
  const reversed = inspectTransitionDoor(door)
  assert.equal(reversed.phase, 'opening')
  closeTo(reversed.linearProgress, before.linearProgress)
  closeTo(reversed.angleRadians, before.angleRadians)
  assert.equal(reversed.passageOccupied, true)
  assert.equal(reversed.colliderBlocked, false)

  door = transitionDoor(door, {
    type: 'advance',
    deltaSeconds: DEFAULT_TRANSITION_DOOR_CONFIG.durationSeconds / 2,
  })
  assert.equal(door.phase, 'open')
  assert.equal(inspectTransitionDoor(door).colliderBlocked, false)
})

test('the gate returns only at the fully closed pose', () => {
  let door = startClosing(fullyOpenDoor())
  door = transitionDoor(door, {
    type: 'advance',
    deltaSeconds: DEFAULT_TRANSITION_DOOR_CONFIG.closeDurationSeconds - 0.001,
  })
  assert.equal(door.phase, 'closing')
  assert.equal(inspectTransitionDoor(door).colliderBlocked, false)

  door = transitionDoor(door, { type: 'advance', deltaSeconds: 0.01 })
  const snapshot = inspectTransitionDoor(door)
  assert.equal(snapshot.phase, 'closed')
  assert.equal(snapshot.linearProgress, 0)
  assert.equal(snapshot.progress, 0)
  assert.equal(snapshot.colliderBlocked, true)
  assert.equal(snapshot.interactionArmed, false)
  assert.equal(snapshot.passageOccupied, false)
})

test('a revisit requires E again and supports the reverse traversal', () => {
  let door = startClosing(fullyOpenDoor())
  door = transitionDoor(door, {
    type: 'advance',
    deltaSeconds: DEFAULT_TRANSITION_DOOR_CONFIG.closeDurationSeconds,
  })
  assert.equal(door.phase, 'closed')

  door = transitionDoor(door, { type: 'proximity' })
  door = transitionDoor(door, { type: 'preload-ready' })
  assert.equal(door.phase, 'ready')
  assert.equal(transitionDoor(door, { type: 'advance', deltaSeconds: 2 }), door)

  door = transitionDoor(door, { type: 'interact' })
  door = transitionDoor(door, {
    type: 'advance',
    deltaSeconds: DEFAULT_TRANSITION_DOOR_CONFIG.durationSeconds,
  })
  assert.equal(door.phase, 'open')

  // Sides are deliberately not stored by the pure machine. The host validates
  // the new interaction and reports the return crossing with the same events.
  door = transitionDoor(door, { type: 'passage-enter' })
  door = transitionDoor(door, { type: 'passage-clear', crossed: true })
  assert.equal(door.phase, 'closing')
})

test('invalid or zero deltas cannot rewind or corrupt an opening door', () => {
  const opening = transitionDoor(coldArmedDoor(), { type: 'preload-ready' })
  assert.equal(transitionDoor(opening, { type: 'advance', deltaSeconds: 0 }), opening)
  assert.equal(transitionDoor(opening, { type: 'advance', deltaSeconds: -1 }), opening)
  assert.equal(transitionDoor(opening, { type: 'advance', deltaSeconds: Number.NaN }), opening)

  const closing = startClosing(fullyOpenDoor())
  assert.equal(transitionDoor(closing, { type: 'advance', deltaSeconds: 0 }), closing)
  assert.equal(transitionDoor(closing, { type: 'advance', deltaSeconds: -1 }), closing)
  assert.equal(
    transitionDoor(closing, { type: 'advance', deltaSeconds: Number.NaN }),
    closing,
  )
})

test('custom duration, direction and stops remain generic', () => {
  const config = createTransitionDoorConfig({
    durationSeconds: 1.2,
    closeDurationSeconds: 0.6,
    closedAngle: 0.2,
    openAngle: -1.4,
  })
  let door = transitionDoor(coldArmedDoor(), { type: 'preload-ready' }, config)
  door = transitionDoor(door, { type: 'advance', deltaSeconds: 0.3 }, config)
  const snapshot = inspectTransitionDoor(door, config)
  closeTo(snapshot.linearProgress, 0.25)
  closeTo(snapshot.angleRadians, 0.1)

  door = transitionDoor(door, { type: 'advance', deltaSeconds: 0.9 }, config)
  door = startClosing(door, config)
  door = transitionDoor(door, { type: 'advance', deltaSeconds: 0.3 }, config)
  const closingSnapshot = inspectTransitionDoor(door, config)
  assert.equal(closingSnapshot.phase, 'closing')
  closeTo(closingSnapshot.linearProgress, 0.5)
  closeTo(closingSnapshot.angleRadians, -0.6)
})

test('configuration rejects impossible timing and angles', () => {
  assert.throws(() => createTransitionDoorConfig({ durationSeconds: 0 }), RangeError)
  assert.throws(() => createTransitionDoorConfig({ durationSeconds: Number.NaN }), RangeError)
  assert.throws(() => createTransitionDoorConfig({ closeDurationSeconds: 0 }), RangeError)
  assert.throws(
    () => createTransitionDoorConfig({ closeDurationSeconds: Number.NaN }),
    RangeError,
  )
  assert.throws(() => createTransitionDoorConfig({ openAngle: Number.POSITIVE_INFINITY }), RangeError)
  assert.equal(DEFAULT_TRANSITION_DOOR_CONFIG.durationSeconds, 0.8)
  assert.equal(DEFAULT_TRANSITION_DOOR_CONFIG.closeDurationSeconds, 0.55)
})

test('content authors two streaming entrances and the one-way shortcut gate', () => {
  const doors = buildTransitionDoorSpecs(MUSEUM.rooms)
  assert.deepEqual(
    doors.map((door) => door.id).sort(),
    [
      'atrium-from-holyoke-shortcut',
      'atrium-to-holyoke',
      'atrium-to-office',
    ],
  )
  const shortcut = doors.find((door) => door.id === 'atrium-from-holyoke-shortcut')
  assert.equal(shortcut?.opensFrom, 'holyoke')
  assert.equal(shortcut ? canOpenTransitionDoor(shortcut, 'atrium') : true, false)
  assert.equal(shortcut ? canOpenTransitionDoor(shortcut, 'holyoke') : false, true)
  assert.equal(shortcut ? transitionDoorSwingSign(shortcut, 'holyoke') : 1, -1)
  assert.equal(doors.filter((door) => door.opensFrom === null).length, 2)
})

test('a completed shortcut cycle does not make its one-way authorisation permanent', () => {
  const shortcut = buildTransitionDoorSpecs(MUSEUM.rooms).find(
    (door) => door.id === 'atrium-from-holyoke-shortcut',
  )
  assert.ok(shortcut)

  let cycle = startClosing(fullyOpenDoor())
  cycle = transitionDoor(cycle, {
    type: 'advance',
    deltaSeconds: DEFAULT_TRANSITION_DOOR_CONFIG.closeDurationSeconds,
  })
  assert.equal(cycle.phase, 'closed')
  assert.equal(cycle.interactionArmed, false)

  // Authorisation remains a topology decision on every interaction. Nothing
  // in the state machine records a previously successful side or unlock.
  assert.equal(canOpenTransitionDoor(shortcut, 'atrium'), false)
  assert.equal(canOpenTransitionDoor(shortcut, 'holyoke'), true)
  cycle = transitionDoor(cycle, { type: 'preload-ready' })
  assert.equal(cycle.phase, 'ready')
  assert.equal(transitionDoor(cycle, { type: 'advance', deltaSeconds: 1 }), cycle)
})

test('one physical door resolves its destination from either reciprocal room', () => {
  const [door] = buildTransitionDoorSpecs(MUSEUM.rooms)
  assert.ok(door)
  assert.equal(transitionDoorTarget(door, door.ownerRoomId), door.otherRoomId)
  assert.equal(transitionDoorTarget(door, door.otherRoomId), door.ownerRoomId)
  assert.equal(transitionDoorTarget(door, 'missing-room'), null)
})

test('handed double leaves share one opening and the reveal stop datum', () => {
  for (const door of buildTransitionDoorSpecs(MUSEUM.rooms)) {
    const [left, right] = transitionDoorLeafPlacements(door)
    closeTo(
      Math.hypot(
        right.position[0] - left.position[0],
        right.position[2] - left.position[2],
      ),
      door.width,
    )
    closeTo(right.rotationY, left.rotationY)
    closeTo(left.position[1], door.position[1] + TRANSITION_DOOR_SILL_Y)
    closeTo(right.position[1], door.position[1] + TRANSITION_DOOR_SILL_Y)

    const normalX = Math.sin(door.rotationY)
    const normalZ = Math.cos(door.rotationY)
    closeTo(
      (left.position[0] - door.position[0]) * normalX +
        (left.position[2] - door.position[2]) * normalZ,
      TRANSITION_DOOR_PLANE_Z,
    )
  }
})

test('local passage geometry distinguishes sides, the opening and the swept envelope', () => {
  const door = buildTransitionDoorSpecs(MUSEUM.rooms).find(
    (candidate) => candidate.id === 'atrium-to-holyoke',
  )
  assert.ok(door)
  const worldFromLocal = (x: number, z: number) => {
    const cosine = Math.cos(door.rotationY)
    const sine = Math.sin(door.rotationY)
    return new Vector3(
      door.position[0] + x * cosine + z * sine,
      0,
      door.position[2] - x * sine + z * cosine,
    )
  }
  const owner = worldFromLocal(0, TRANSITION_DOOR_PLANE_Z + 0.5)
  const other = worldFromLocal(0, TRANSITION_DOOR_PLANE_Z - 0.5)
  assert.equal(transitionDoorSide(door, owner), 1)
  assert.equal(transitionDoorSide(door, other), -1)
  assert.equal(
    segmentCrossesTransitionDoor(
      door,
      transitionDoorLocalPoint(door, owner),
      transitionDoorLocalPoint(door, other),
      0.3,
    ),
    true,
  )
  const barelyOther = worldFromLocal(0, TRANSITION_DOOR_PLANE_Z - 0.001)
  assert.equal(
    transitionDoorCrossingSide(
      door,
      transitionDoorLocalPoint(door, owner),
      transitionDoorLocalPoint(door, barelyOther),
      0.3,
    ),
    -1,
  )

  const besideWallOwner = worldFromLocal(0.72, TRANSITION_DOOR_PLANE_Z + 0.5)
  const besideWall = worldFromLocal(0.72, TRANSITION_DOOR_PLANE_Z - 0.5)
  assert.equal(
    segmentCrossesTransitionDoor(
      door,
      transitionDoorLocalPoint(door, besideWallOwner),
      transitionDoorLocalPoint(door, besideWall),
      0.3,
    ),
    false,
  )
  assert.equal(isInsideTransitionDoorEnvelope(door, other, 1, 0.3), true)
  const clear = worldFromLocal(
    0,
    TRANSITION_DOOR_PLANE_Z - door.closeDistance - 0.01,
  )
  assert.equal(isInsideTransitionDoorEnvelope(door, clear, 1, 0.3), false)
})

test('a latched physical door blocks portal visibility from both authored endpoints', () => {
  const doors = buildTransitionDoorSpecs(MUSEUM.rooms)
  const endpoints = transitionDoorEndpointMap(doors)
  const mainDoor = doors.find((door) => door.id === 'atrium-to-holyoke')
  assert.ok(mainDoor)
  assert.equal(
    endpoints.get(`${mainDoor.ownerRoomId}:${mainDoor.id}`),
    mainDoor.id,
  )
  assert.equal(
    endpoints.get(`${mainDoor.otherRoomId}:${mainDoor.reciprocalPortalId}`),
    mainDoor.id,
  )

  const cells = buildCells(MUSEUM.rooms)
  const camera = new PerspectiveCamera(68, 16 / 9, 0.08, 120)
  camera.position.set(-7.6, 1.62, -2)
  camera.lookAt(-10, 1.62, -2)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  const origin = new Vector3(-7.6, 1.02, -2)
  const visibleWith = (open: ReadonlySet<string>) =>
    computeVisibleRooms(
      cells,
      camera,
      origin,
      'atrium',
      2,
      (roomId, portalId) => {
        const doorId = endpoints.get(`${roomId}:${portalId}`)
        return !doorId || open.has(doorId)
      },
    )
  assert.deepEqual(visibleWith(new Set()), ['atrium'])
  assert.ok(visibleWith(new Set([mainDoor.id])).includes('holyoke'))
})

test('the synchronous gate blocks the capsule before streamed models exist', () => {
  const [door] = buildTransitionDoorSpecs(MUSEUM.rooms)
  assert.ok(door)
  const world = new CollisionWorld()
  const dispose = registerTransitionDoorGate(world, door)

  assert.equal(world.size, 1)
  const [bounds] = world.describe()
  assert.ok(bounds)
  const contacts = world.probe(
    new Vector3(
      (bounds.min[0] + bounds.max[0]) / 2,
      0.02,
      (bounds.min[2] + bounds.max[2]) / 2,
    ),
    { radius: 0.3, height: 1.75 },
  )
  assert.ok(contacts.some((contact) => contact.contacts > 0))

  dispose()
  assert.equal(world.size, 0)
})

console.log(`\n${passed}/${passed} transition-door checks passed.\n`)
