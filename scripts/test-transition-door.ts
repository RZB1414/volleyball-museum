import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PerspectiveCamera, Vector3 } from 'three'

import { MUSEUM } from '../src/content/museum.ts'
import { fixtureLot, SAVE_FIXTURES } from '../src/content/saveFixtures.ts'
import { doorGrant } from '../src/engine/progressGrants.ts'
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
  transitionDoorBlock,
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
import { doorReleaseWiringProblems, type SourceReader } from './lib/runtimeWiring.ts'
// Puts a storage on `globalThis`; the store itself is only loaded by
// `openGame`, one fresh evaluation per page, as a browser would.
import { openGame } from './lib/storePage.ts'

let passed = 0

function test(name: string, run: () => void) {
  run()
  passed += 1
  console.log(`  pass  ${name}`)
}

/** A check that loads the real store and so has to wait for it. */
async function testWithStore(name: string, run: () => Promise<void>) {
  await run()
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
  assert.equal(shortcut ? canOpenTransitionDoor(shortcut, 'atrium', []) : true, false)
  assert.equal(shortcut ? canOpenTransitionDoor(shortcut, 'holyoke', []) : false, true)
  assert.equal(shortcut ? transitionDoorSwingSign(shortcut, 'holyoke') : 1, -1)
  assert.equal(doors.filter((door) => door.opensFrom === null).length, 2)
})

// ---------------------------------------------------------------------------
// The shortcut that stays open (ÁT-G1, H-29)
// ---------------------------------------------------------------------------

const DOORS = buildTransitionDoorSpecs(MUSEUM.rooms)
const SHORTCUT_ID = 'atrium-from-holyoke-shortcut'
const SHORTCUT = DOORS.find((door) => door.id === SHORTCUT_ID)
assert.ok(SHORTCUT, 'the museum has its service shortcut')
/** The save of a player who has left the wing by it once. */
const RELEASED: readonly string[] = [SHORTCUT_ID]
const everythingLit = (_roomId: string) => true
const nothingLit = (_roomId: string) => false

test('before it is released, the shortcut opens from the wing and answers "other side" in the atrium', () => {
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'atrium', []), false)
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'holyoke', []), true)
  assert.equal(transitionDoorBlock(SHORTCUT, 'atrium', everythingLit, []), 'other-side')
  assert.equal(transitionDoorBlock(SHORTCUT, 'holyoke', everythingLit, []), null)

  // Another door's release is not this one's, and neither is the id of the
  // portal facing it across the opening: the save names the physical door.
  const others = [...DOORS.filter((door) => door.id !== SHORTCUT_ID).map((door) => door.id), SHORTCUT.reciprocalPortalId]
  assert.ok(others.includes('holyoke-shortcut'))
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'atrium', others), false)
  assert.equal(transitionDoorBlock(SHORTCUT, 'atrium', everythingLit, others), 'other-side')
})

test('once released, the atrium side opens it too', () => {
  // The defect: who may operate a door was a question of topology alone, so
  // a player who left by the shortcut and turned round read "opens from the
  // other side" for ever.
  assert.equal(
    transitionDoorBlock(SHORTCUT, 'atrium', everythingLit, RELEASED),
    null,
    'the rule ignores what the save says was released',
  )
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'atrium', RELEASED), true)
  // Its own side goes on working, and a room the door does not touch never does.
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'holyoke', RELEASED), true)
  assert.equal(transitionDoorBlock(SHORTCUT, 'holyoke', everythingLit, RELEASED), null)
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'office', RELEASED), false)
  // The two answers agree on every side and in both states.
  for (const room of ['atrium', 'holyoke']) {
    for (const released of [[], RELEASED]) {
      assert.equal(
        canOpenTransitionDoor(SHORTCUT, room, released),
        transitionDoorBlock(SHORTCUT, room, everythingLit, released) !== 'other-side',
        `${room}, ${released.length ? 'released' : 'latched'}`,
      )
    }
  }
})

test('a release unlatches the bar and nothing else: an electric lock still wants its power', () => {
  const officeDoor = DOORS.find((door) => door.requiresPower !== null)
  assert.ok(officeDoor)
  for (const room of [officeDoor.ownerRoomId, officeDoor.otherRoomId]) {
    assert.equal(transitionDoorBlock(officeDoor, room, nothingLit, [officeDoor.id, SHORTCUT_ID]), 'unpowered')
    assert.equal(transitionDoorBlock(officeDoor, room, everythingLit, []), null)
    // A door with no side of its own was never latched: it opens with nothing released.
    assert.equal(canOpenTransitionDoor(officeDoor, room, []), true)
  }
  // The side comes first: a dark wing does not turn "other side" into "no power".
  const both = { ...SHORTCUT, requiresPower: 'holyoke' as const }
  assert.equal(transitionDoorBlock(both, 'atrium', nothingLit, []), 'other-side')
  assert.equal(transitionDoorBlock(both, 'atrium', nothingLit, RELEASED), 'unpowered')
  assert.equal(transitionDoorBlock(both, 'atrium', everythingLit, RELEASED), null)
})

test('releasing is done from the door\'s own side, once: doorGrant', () => {
  assert.deepEqual(doorGrant(SHORTCUT, 'holyoke', []), { doorsReleased: [SHORTCUT_ID] })
  // From the atrium there is nothing to push, before or after.
  assert.equal(doorGrant(SHORTCUT, 'atrium', []), null)
  assert.equal(doorGrant(SHORTCUT, 'atrium', RELEASED), null)
  assert.equal(doorGrant(SHORTCUT, 'office', []), null)
  // Already released: nothing to record, so the store is not even called.
  assert.equal(doorGrant(SHORTCUT, 'holyoke', RELEASED), null)
  assert.deepEqual(doorGrant(SHORTCUT, 'holyoke', ['some-other-door']), { doorsReleased: [SHORTCUT_ID] })
})

test('a door with no side of its own never enters doorsReleased', () => {
  const twoWay = DOORS.filter((door) => door.opensFrom === null)
  assert.equal(twoWay.length, 2)
  for (const door of twoWay) {
    for (const room of [door.ownerRoomId, door.otherRoomId, 'missing-room']) {
      assert.equal(doorGrant(door, room, []), null, `${door.id} pressed from ${room}`)
    }
  }
})

test('the leaf\'s state machine keeps nothing of a cycle; what is kept is in the save', () => {
  // This case used to hold the defect in place: "a completed shortcut cycle
  // does not make its one-way authorisation permanent". The half of it that
  // is still true is about the machine: a full cycle leaves it exactly as new,
  // with no memory of a side or of an unlock.
  let cycle = startClosing(fullyOpenDoor())
  cycle = transitionDoor(cycle, {
    type: 'advance',
    deltaSeconds: DEFAULT_TRANSITION_DOOR_CONFIG.closeDurationSeconds,
  })
  assert.deepEqual(cycle, createTransitionDoorState(), 'a completed cycle left something behind in the leaf')
  // So the machine alone still says no from the atrium…
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'atrium', []), false)
  // …and the press that started that cycle, from the wing, is what the save
  // was handed: with it, the same closed leaf opens from the atrium.
  const release = doorGrant(SHORTCUT, 'holyoke', [])
  assert.ok(release?.doorsReleased)
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'atrium', release.doorsReleased), true)
  assert.equal(transitionDoorBlock(SHORTCUT, 'atrium', everythingLit, release.doorsReleased), null)

  cycle = transitionDoor(cycle, { type: 'preload-ready' })
  assert.equal(cycle.phase, 'ready')
  assert.equal(transitionDoor(cycle, { type: 'advance', deltaSeconds: 1 }), cycle, 'a released door still waits for E')
})

await testWithStore('a save from before the field loads with no door released (DL2-3)', async () => {
  // No migration infers a release. `l1-route-end` is a player who left by the
  // shortcut twice, and the save cannot tell that apart from one who never
  // found it: inventing the atom would be inventing what the player did.
  // Asked of every save of the corpus until the lot closed; the corpus now
  // also holds the saves L2 wrote, which have the field (the next check).
  const before = Object.entries(SAVE_FIXTURES).filter(([, fixture]) => fixtureLot(fixture) < 2)
  assert.ok(before.length >= 6, 'the saves from before the field are gone from the corpus')
  for (const [id, fixture] of before) {
    assert.ok(!('doorsReleased' in fixture.save.progress), `${id} is a record of a build that had no doorsReleased`)
    const page = await openGame(fixture.save)
    assert.deepEqual(page.progress().doorsReleased, [], id)
    assert.equal(canOpenTransitionDoor(SHORTCUT, 'atrium', page.progress().doorsReleased), false, id)
  }
})

await testWithStore('a save of the lot keeps the door as it left it: released for one player, latched for the other', async () => {
  // Read out of the browser as the lot closed. The first pushed the bar from
  // inside the wing; the second only tried the door from the atrium, which
  // the game answers with a buzz and no write.
  const released = await openGame(SAVE_FIXTURES['l2-shortcut-released'].save)
  assert.deepEqual(released.progress().doorsReleased, [SHORTCUT_ID])
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'atrium', released.progress().doorsReleased), true)
  assert.equal(transitionDoorBlock(SHORTCUT, 'atrium', everythingLit, released.progress().doorsReleased), null)
  // Open already: pushing it again releases nothing and writes nothing.
  assert.equal(doorGrant(SHORTCUT, 'holyoke', released.progress().doorsReleased), null)

  const latched = await openGame(SAVE_FIXTURES['l2-new-game-drawer-touched'].save)
  assert.deepEqual(latched.progress().doorsReleased, [])
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'atrium', latched.progress().doorsReleased), false)
  assert.equal(transitionDoorBlock(SHORTCUT, 'atrium', everythingLit, latched.progress().doorsReleased), 'other-side')
})

await testWithStore('the release is written on the press and survives the disk', async () => {
  const page = await openGame(SAVE_FIXTURES['l1-route-end'].save)
  const release = doorGrant(SHORTCUT, 'holyoke', page.progress().doorsReleased)
  assert.ok(release)
  // One write, and it is the whole of what the press records.
  const before = page.progress()
  assert.equal(page.notifications(() => page.state().grant(release)), 1)
  assert.deepEqual(page.progress(), { ...before, doorsReleased: [SHORTCUT_ID] })
  // Pressing again, from either side, records nothing and wakes nobody.
  assert.equal(doorGrant(SHORTCUT, 'holyoke', page.progress().doorsReleased), null)
  assert.equal(page.notifications(() => page.state().grant({ doorsReleased: [SHORTCUT_ID] })), 0)

  page.leave()
  assert.deepEqual(page.savedProgress()?.doorsReleased, [SHORTCUT_ID], 'the release never reached the storage')
  const back = await openGame(page.savedText()!)
  assert.deepEqual(back.progress().doorsReleased, [SHORTCUT_ID], 'the release did not survive the load')
  assert.equal(transitionDoorBlock(SHORTCUT, 'atrium', everythingLit, back.progress().doorsReleased), null)
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'atrium', back.progress().doorsReleased), true)

  // "New game" latches it again.
  back.state().resetProgress()
  assert.deepEqual(back.progress().doorsReleased, [])
  assert.equal(canOpenTransitionDoor(SHORTCUT, 'atrium', back.progress().doorsReleased), false)
})

const readSource: SourceReader = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

test('the door, the touch button and the toast ask what this suite proves', () => {
  assert.deepEqual(doorReleaseWiringProblems(readSource), [])

  // Each of these is a refactor the check exists to catch, applied to the
  // real source in memory.
  const changed =
    (path: string, from: string | RegExp, to: string): SourceReader =>
    (asked) => {
      if (asked !== path) return readSource(asked)
      const source = readSource(asked)
      const next = source.replace(from, to)
      assert.notEqual(next, source, `the refactor of ${path} found nothing to change`)
      return next
    }
  const doors = 'engine/TransitionDoors.tsx'
  const refactors: readonly (readonly [string, SourceReader])[] = [
    [
      'the press asking with nothing released',
      changed(doors, /(!canOpenTransitionDoor\(runtime\.spec, museum\.currentRoom, )museum\.progress\.doorsReleased/, '$1[]'),
    ],
    [
      'the warm-up asking with nothing released',
      changed(doors, /(const canOperate = canOpenTransitionDoor\(runtime\.spec, currentRoom, )museum\.progress\.doorsReleased/, '$1[]'),
    ],
    [
      'the prompt asking with another list',
      changed(doors, /(poweredGiven\(museum\.progress\.roomsPowered\),\s*)museum\.progress\.doorsReleased(,?\s*\)\s*: null)/, '$1museum.progress.locksOpened$2'),
    ],
    ['the press recording nothing', changed(doors, 'if (release) museum.grant(release)', 'void release')],
    [
      'the release recorded only once the leaf has moved',
      changed(
        doors,
        /(const release = doorGrant\([^)]*\)\s*if \(release\) museum\.grant\(release\)\s*)([\s\S]*?)(\n\s*if \(runtime\.state\.phase === 'preloading'\) requestWarmRoom)/,
        '$2\n      $1$3',
      ),
    ],
    [
      'the wrong side answering with silence again',
      changed(doors, /(if \(focused\.status === 'blocked'\) \{[\s\S]*?)museumAudio\.lockDenied\(\)\s*return true/, "$1if (focused.blockedBy !== 'unpowered') return false\n        museumAudio.lockDenied()\n        return true"),
    ],
    [
      'the touch button deciding by itself',
      changed('ui/MobileControls.tsx', 'doorActionAvailable(focusedDoor)', "Boolean(focusedDoor && focusedDoor.status !== 'blocked')"),
    ],
    ['the toast watching another list', changed('ui/Hud.tsx', '(state) => state.progress.doorsReleased', '(state) => state.progress.roomsPowered')],
    ['the toast announcing the save on mount', changed('ui/Hud.tsx', 'listGrew(seenLength.current, released.length)', 'released.length > 0')],
    ['the toast without the latch', changed('ui/Hud.tsx', /museumAudio\.lockRelease\(\)/, 'museumAudio.chime()')],
    ['the toast left out of the stack', changed('ui/Hud.tsx', /\s*<DoorReleasedToast \/>/, '')],
  ]
  const uncaught = refactors
    .filter(([, reader]) => doorReleaseWiringProblems(reader).length === 0)
    .map(([name]) => name)
  assert.deepEqual(uncaught, [], 'a refactor this check exists to catch went through')
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
