/**
 * Runtime kit guards.
 *
 * The bake placement suite verifies authored bounds after quantisation. This
 * one protects the browser-side half of the contract: an InstancedMesh must
 * retain the loaded node matrix that reverses quantisation, and releasing a
 * room must not dispose geometry or materials owned by the GLTF cache.
 */

import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'

import {
  createKitInstanceGroup,
  disposeKitInstanceGroup,
  disposeKitPart,
  registerKitColliders,
} from '../src/engine/kitPart.ts'
import { BAKED_BUNDLES } from '../src/content/bake.generated.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { BakedBundle } from '../src/content/bake.generated.ts'
import { CollisionWorld } from '../src/engine/collision.ts'
import type { MaterialLibrary } from '../src/engine/materials.ts'

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

function matricesAgree(actual: Matrix4, expected: Matrix4, epsilon = 1e-6) {
  return actual.elements.every(
    (value, index) => Math.abs(value - expected.elements[index]) <= epsilon,
  )
}

function wrapper(
  position: readonly [number, number, number],
  rotationY: number,
  scale: number,
) {
  return new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotationY),
    new Vector3().setScalar(scale),
  )
}

console.log('Kit runtime:')

const source = new Group()
// A non-identity kit root proves the batch matrix is relative to the loaded
// scene, rather than accidentally baking a cache object's world placement in.
source.position.set(7, 1, -3)

const timberGeometry = new BoxGeometry(1, 1, 1)
const glassGeometry = new BoxGeometry(0.8, 0.8, 0.8)
const timberPlaceholder = new MeshStandardMaterial({ name: 'oak-varnished' })
const glassPlaceholder = new MeshStandardMaterial({ name: 'glass-vitrine' })

const timber = new Mesh(timberGeometry, timberPlaceholder)
timber.name = 'fixture'
timber.position.set(0.15, 0.8, -0.2)
timber.scale.set(1.7, 0.9, 1.2)
source.add(timber)

const glass = new Mesh(glassGeometry, glassPlaceholder)
glass.name = 'fixture__glass'
glass.position.set(-0.1, 1.4, 0.25)
glass.scale.set(0.7, 1.6, 0.8)
source.add(glass)
source.updateMatrixWorld(true)

const timberMaterial = new MeshStandardMaterial({ name: 'oak-varnished' })
const glassMaterial = new MeshStandardMaterial({ name: 'glass-vitrine' })
const materials: MaterialLibrary = new Map([
  ['oak-varnished', timberMaterial],
  ['glass-vitrine', glassMaterial],
])

const placements = [
  { part: 'fixture', position: [1, 0, 3] as const, rotationY: Math.PI / 2, scale: 2 },
  { part: 'fixture', position: [-2, 0.5, 0] as const, rotationY: -0.3, scale: 0.5 },
]

const instances = createKitInstanceGroup(source, placements, materials)
const batches = instances.children.filter(
  (child): child is InstancedMesh => child instanceof InstancedMesh,
)
check('one draw batch per recipe node', batches.length === 2, `found ${batches.length}`)
check('both placements share each batch', batches.every((batch) => batch.count === 2))

const timberBatch = batches.find((batch) => batch.name === 'instances:fixture')
const glassBatch = batches.find((batch) => batch.name === 'instances:fixture__glass')
check('timber keeps the cache geometry', timberBatch?.geometry === timberGeometry)
check('glass keeps the cache geometry', glassBatch?.geometry === glassGeometry)
check('timber is re-materialised once per batch', timberBatch?.material === timberMaterial)
check('glass is re-materialised once per batch', glassBatch?.material === glassMaterial)

const sourceInverse = source.matrixWorld.clone().invert()
const timberRelative = new Matrix4().multiplyMatrices(sourceInverse, timber.matrixWorld)
const glassRelative = new Matrix4().multiplyMatrices(sourceInverse, glass.matrixWorld)

for (const [index, placement] of placements.entries()) {
  const timberActual = new Matrix4()
  const glassActual = new Matrix4()
  timberBatch?.getMatrixAt(index, timberActual)
  glassBatch?.getMatrixAt(index, glassActual)

  const placementWrapper = wrapper(
    placement.position,
    placement.rotationY,
    placement.scale,
  )
  const timberExpected = new Matrix4().multiplyMatrices(placementWrapper, timberRelative)
  const glassExpected = new Matrix4().multiplyMatrices(placementWrapper, glassRelative)

  check(
    `placement ${index + 1} preserves timber node transform`,
    Boolean(timberBatch && matricesAgree(timberActual, timberExpected)),
  )
  check(
    `placement ${index + 1} preserves glass node transform`,
    Boolean(glassBatch && matricesAgree(glassActual, glassExpected)),
  )
}

let geometryDisposals = 0
let materialDisposals = 0
let batchDisposals = 0
for (const geometry of [timberGeometry, glassGeometry]) {
  geometry.addEventListener('dispose', () => { geometryDisposals += 1 })
}
for (const material of [timberPlaceholder, glassPlaceholder, timberMaterial, glassMaterial]) {
  material.addEventListener('dispose', () => { materialDisposals += 1 })
}
for (const batch of batches) {
  batch.addEventListener('dispose', () => { batchDisposals += 1 })
}

disposeKitInstanceGroup(instances)
check('instance buffers are released', batchDisposals === 2, `disposed ${batchDisposals}`)
check('StrictMode cleanup preserves the instance graph', instances.children.length === 2)
check('instance disposal preserves cache geometry', geometryDisposals === 0)
check('instance disposal preserves shared materials', materialDisposals === 0)

const clonedPart = timber.clone(true)
disposeKitPart(clonedPart)
check('clone disposal preserves cache geometry', geometryDisposals === 0)
check('clone disposal preserves shared materials', materialDisposals === 0)

const colliderBundle = {
  name: 'kit-test',
  url: '/kit-test.glb',
  bytes: 0,
  parts: [
    {
      name: 'fixture',
      material: 'oak-varnished',
      triangles: 12,
      bounds: {
        min: [-0.5, 0, -0.25],
        max: [0.5, 1, 0.25],
        size: [1, 1, 0.5],
        centre: [0, 0.5, 0],
      },
      collider: {
        kind: 'box',
        halfExtents: [0.5, 0.5, 0.25],
        centre: [0, 0.5, 0],
      },
    },
  ],
} as const satisfies BakedBundle

const collision = new CollisionWorld()
const disposeCollider = registerKitColliders(
  source,
  'fixture',
  colliderBundle,
  collision,
  {
    roomOrigin: [10, 0, 20],
    position: placements[0].position,
    rotationY: placements[0].rotationY,
    scale: placements[0].scale,
  },
)
const colliderBounds = collision.describe()[0]
check(
  'collider uses the same room × placement transform as the instance',
  JSON.stringify(colliderBounds) === JSON.stringify({ min: [10.5, 0, 22], max: [11.5, 2, 24] }),
  JSON.stringify(colliderBounds),
)
disposeCollider()
check('collider cleanup is idempotent with the room lifecycle', collision.size === 0)

const kitBundle = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit')
let naiveMuseumDraws = 0
let batchedMuseumDraws = 0

for (const room of MUSEUM.rooms) {
  const naiveParts = room.kit.flatMap((placement) =>
    kitBundle?.parts.filter(
      (part) => part.name === placement.part || part.name.startsWith(`${placement.part}__`),
    ) ?? [],
  )
  const batchedParts = new Set(naiveParts.map((part) => part.name))
  naiveMuseumDraws += naiveParts.length
  batchedMuseumDraws += batchedParts.size
  console.log(
    `  PERF  ${room.id.padEnd(8)} kit draws ${String(naiveParts.length).padStart(2)} → ${String(batchedParts.size).padStart(2)}`,
  )
}

check(
  'museum placements reduce kit draw batches',
  batchedMuseumDraws < naiveMuseumDraws,
  `${naiveMuseumDraws} → ${batchedMuseumDraws}`,
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
