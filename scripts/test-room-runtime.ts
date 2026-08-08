/**
 * Runtime baked-room collision guards.
 *
 * The navigation suite builds fresh procedural shells. This suite deliberately
 * attaches a loaded room below the same positioned parent used by BakedRoom,
 * because that is where a node's matrixWorld already contains the room origin.
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PropertyBinding,
  Vector3,
  type Object3D,
} from 'three'

import { BAKED_BUNDLES, type BakedBundle } from '../src/content/bake.generated.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { RoomData } from '../src/content/schema.ts'
import { CollisionWorld, movePlayer } from '../src/engine/collision.ts'
import { registerRoomColliders } from '../src/engine/roomCollision.ts'

const ROOT = resolve(import.meta.dirname, '..')
const CAPSULE = { radius: 0.3, height: 1.75 }
const STEP = 1 / 60
const SPEED = 2.6

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

const round = (value: number) => Number(value.toFixed(2))

function describeBox(box: Box3) {
  return {
    min: box.min.toArray().map(round),
    max: box.max.toArray().map(round),
  }
}

function boundsClose(
  actual: { min: number[]; max: number[] },
  expected: { min: number[]; max: number[] },
  tolerance = 0.02,
) {
  return (['min', 'max'] as const).every((edge) =>
    actual[edge].every(
      (value, axis) => Math.abs(value - (expected[edge][axis] ?? Infinity)) <= tolerance,
    ),
  )
}

console.log('Baked room runtime:')

// A non-identity loaded root prevents a superficially correct fix that merely
// drops the GLTF scene transform along with the duplicated parent transform.
const syntheticOrigin = [10, 0.5, 20] as const
const syntheticParent = new Group()
syntheticParent.position.set(...syntheticOrigin)
const syntheticRoot = new Group()
syntheticRoot.position.set(0.4, 0.2, -0.3)
syntheticRoot.rotation.y = 0.35
syntheticRoot.scale.set(1.4, 0.8, 0.6)
const syntheticMesh = new Mesh(new BoxGeometry(1, 2, 3), new MeshBasicMaterial())
syntheticMesh.position.set(0.7, 1.1, -0.2)
syntheticRoot.add(syntheticMesh)
syntheticParent.add(syntheticRoot)
syntheticParent.updateMatrixWorld(true)

syntheticMesh.geometry.computeBoundingBox()
const renderedBounds = describeBox(
  (syntheticMesh.geometry.boundingBox ?? new Box3()).clone().applyMatrix4(syntheticMesh.matrixWorld),
)
const syntheticCollision = new CollisionWorld()
const disposeSynthetic = registerRoomColliders(
  syntheticRoot,
  syntheticOrigin,
  syntheticCollision,
)
const registeredBounds = syntheticCollision.describe()[0]
check(
  'non-zero parent origin is applied exactly once',
  Boolean(registeredBounds && boundsClose(registeredBounds, renderedBounds, 0.001)),
  `rendered ${JSON.stringify(renderedBounds)}, collider ${JSON.stringify(registeredBounds)}`,
)
check(
  'non-identity GLTF root transform is preserved',
  Boolean(registeredBounds && registeredBounds.max[1] > syntheticOrigin[1] + 1),
  JSON.stringify(registeredBounds),
)
disposeSynthetic()
check('room collider cleanup removes the registered geometry', syntheticCollision.size === 0)

function bundleFor(room: RoomData) {
  const bundle = BAKED_BUNDLES.find((candidate) => candidate.name === `room-${room.id}`)
  if (!bundle) throw new Error(`Missing baked bundle for ${room.id}.`)
  return bundle as BakedBundle
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
const sceneCache = new Map<string, Object3D>()

async function loadScene(bundle: BakedBundle) {
  let source = sceneCache.get(bundle.url)
  if (!source) {
    const bytes = await readFile(resolve(ROOT, 'public', bundle.url.replace(/^\//, '')))
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer
    const gltf = await new Promise<{ scene: Object3D }>((accept, reject) => {
      loader.parse(buffer, '', accept, reject)
    })
    source = gltf.scene
    sceneCache.set(bundle.url, source)
  }
  return source.clone(true)
}

async function registerFloor(room: RoomData, collision: CollisionWorld) {
  const bundle = bundleFor(room)
  const floorPart = bundle.parts.find((part) => part.name === `${room.id}__floor`)
  if (!floorPart?.collider) throw new Error(`Missing floor collider for ${room.id}.`)

  const wrapper = new Group()
  wrapper.position.set(...room.origin)
  const scene = await loadScene(bundle)
  wrapper.add(scene)
  wrapper.updateMatrixWorld(true)

  const wanted = PropertyBinding.sanitizeNodeName(floorPart.name)
  const dispose = registerRoomColliders(
    scene,
    room.origin,
    collision,
    (name) => PropertyBinding.sanitizeNodeName(name) !== wanted,
  )

  return { dispose, floorPart, scene, wrapper }
}

function expectedFloorBounds(room: RoomData, floor: BakedBundle['parts'][number]) {
  return {
    min: [
      floor.bounds.min[0] + room.origin[0],
      floor.bounds.min[1] + room.origin[1],
      floor.bounds.min[2] + room.origin[2],
    ].map(round),
    max: [
      floor.bounds.max[0] + room.origin[0],
      floor.bounds.max[1] + room.origin[1],
      floor.bounds.max[2] + room.origin[2],
    ].map(round),
  }
}

function walkAcross(collision: CollisionWorld, start: Vector3, finish: Vector3) {
  const position = start.clone()
  let verticalVelocity = 0
  let lowest = position.y

  for (let frame = 0; frame < 240 && position.distanceToSquared(finish) > 0.04; frame += 1) {
    const displacement = finish.clone().sub(position).setY(0)
    if (displacement.lengthSq() > 0) displacement.normalize().multiplyScalar(SPEED * STEP)
    const result = movePlayer(
      collision,
      position,
      displacement,
      verticalVelocity,
      STEP,
      CAPSULE,
    )
    position.copy(result.position)
    verticalVelocity = result.verticalVelocity
    lowest = Math.min(lowest, position.y)
  }

  return { position, lowest }
}

const atrium = MUSEUM.rooms.find((room) => room.id === 'atrium')
const holyoke = MUSEUM.rooms.find((room) => room.id === 'holyoke')
const office = MUSEUM.rooms.find((room) => room.id === 'office')
if (!atrium || !holyoke || !office) throw new Error('The runtime test requires all three rooms.')

for (const room of [holyoke, office]) {
  const collision = new CollisionWorld()
  const registered = await registerFloor(room, collision)
  const actual = collision.describe()[0]
  const expected = expectedFloorBounds(room, registered.floorPart)

  check(`${room.id} registers exactly one isolated baked floor`, collision.size === 1)
  check(
    `${room.id} baked floor receives its origin exactly once`,
    Boolean(actual && boundsClose(actual, expected)),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  )

  registered.dispose()
  check(`${room.id} baked floor cleanup is idempotent`, collision.size === 0)
  registered.dispose()
  check(`${room.id} repeated cleanup stays empty`, collision.size === 0)
}

for (const [room, start, finish] of [
  [holyoke, new Vector3(-8, 0, -2), new Vector3(-10.5, 0, -2)],
  [office, new Vector3(8, 0, 3), new Vector3(10.5, 0, 3)],
] as const) {
  const collision = new CollisionWorld()
  const atriumFloor = await registerFloor(atrium, collision)
  const destinationFloor = await registerFloor(room, collision)
  const result = walkAcross(collision, start, finish)

  check(
    `atrium → ${room.id} crosses onto the baked destination floor`,
    result.position.distanceTo(finish) < 0.25,
    `stopped at ${result.position.toArray().map((value) => value.toFixed(2)).join(', ')}`,
  )
  check(
    `atrium → ${room.id} remains supported through the seam`,
    result.lowest > -0.02,
    `lowest foot y=${result.lowest.toFixed(3)}`,
  )

  atriumFloor.dispose()
  destinationFloor.dispose()
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
