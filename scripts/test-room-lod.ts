/** Focused guards for the generic portal detail policy. */

import assert from 'node:assert/strict'
import { Group, Mesh, MeshBasicMaterial, BoxGeometry, Raycaster } from 'three'

import {
  openDoorNeighbourRooms,
  roomRenderTier,
  shouldMountRoomDetail,
  shouldRenderRoomDetail,
} from '../src/engine/roomLod.ts'
import { syncRoomDetailTargets } from '../src/engine/roomDetailTargets.ts'

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}`)
    passed += 1
  } else {
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
    failed += 1
  }
}

console.log('Room portal LOD:')

check(
  'the current room renders full detail',
  roomRenderTier('room-a', 'room-a', true) === 'detail',
)
check(
  'current room detail wins over a stale visibility set',
  roomRenderTier('room-a', 'room-a', false) === 'detail',
)
check(
  'a visible adjacent room renders only its shell',
  roomRenderTier('room-b', 'room-a', true) === 'shell',
)
check(
  'a non-visible room remains hidden',
  roomRenderTier('room-c', 'room-a', false) === 'hidden',
)
check(
  'crossing rooms promotes the destination without id-specific rules',
  roomRenderTier('future-wing', 'future-wing', true) === 'detail' &&
    roomRenderTier('room-a', 'future-wing', true) === 'shell',
)
check(
  'the current room mounts detail even before the warm cache records it',
  shouldMountRoomDetail('room-a', 'room-a', new Set()) === true,
)
check(
  'a warmed room keeps detail mounted for a hitch-free return trip',
  shouldMountRoomDetail('room-a', 'room-b', new Set(['room-a'])) === true,
)
check(
  'a cold room does not spend the detail budget merely because its shell is visible',
  shouldMountRoomDetail('room-c', 'room-a', new Set(['room-a'])) === false,
)
check(
  'a ready door destination is furnished before the hinge reveals it',
  shouldRenderRoomDetail('shell', true, true) === true,
)
check(
  'an ordinary portal shell keeps warmed detail parked',
  shouldRenderRoomDetail('shell', true, false) === false,
)
check(
  'a door cannot reveal detail before GPU readiness',
  shouldRenderRoomDetail('shell', false, true) === false,
)
check(
  'the current room always draws its detail',
  shouldRenderRoomDetail('detail', false, false) === true,
)

const doorConnections = [
  { id: 'atrium-holyoke', firstRoom: 'atrium', secondRoom: 'holyoke' },
  { id: 'atrium-office', firstRoom: 'atrium', secondRoom: 'office' },
] as const
const fromHolyoke = openDoorNeighbourRooms(
  'holyoke',
  new Set(['atrium-holyoke', 'atrium-office']),
  doorConnections,
)
check(
  'leaving Holyoke keeps the directly connected atrium visible through its open door',
  fromHolyoke.size === 1 && fromHolyoke.has('atrium'),
)
check(
  'open-door visibility never walks transitively into the office',
  !fromHolyoke.has('office'),
)
check(
  'a closed cached neighbour remains parked instead of drawing',
  openDoorNeighbourRooms('holyoke', new Set(), doorConnections).size === 0,
)
const fromAtrium = openDoorNeighbourRooms(
  'atrium',
  new Set(['atrium-holyoke', 'atrium-office']),
  doorConnections,
)
check(
  'open-door adjacency works in both authored directions',
  fromAtrium.size === 2 && fromAtrium.has('holyoke') && fromAtrium.has('office'),
)
check(
  'an open connection never overrides a hidden portal tier',
  shouldRenderRoomDetail('hidden', true, true) === false,
)

const parkedRoot = new Group()
const parkedTarget = new Group()
parkedTarget.name = 'exhibit:parked-test'
const parkedMesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial())
parkedTarget.add(parkedMesh)
parkedRoot.add(parkedTarget)
const originalRaycast = parkedTarget.raycast
const originalLayerMask = parkedTarget.layers.mask
syncRoomDetailTargets(parkedRoot, false)
check(
  'parking interaction never hides destination assets behind an opening door',
  parkedTarget.visible && parkedMesh.visible,
)
const parkedHits: ReturnType<Raycaster['intersectObjects']> = []
new Raycaster().intersectObject(parkedTarget, true, parkedHits)
check(
  'a parked target blocks recursive interaction without changing render visibility',
  parkedHits.length === 0,
)
syncRoomDetailTargets(parkedRoot, true)
check(
  'entering the room restores the exact target layer and raycast',
  parkedTarget.raycast === originalRaycast && parkedTarget.layers.mask === originalLayerMask,
)
assert.equal(parkedTarget.visible, true)
parkedMesh.geometry.dispose()
parkedMesh.material.dispose()

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
