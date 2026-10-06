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
import { deviceInputOf } from '../src/engine/deviceRules.ts'
import { deskShows } from '../src/engine/termRules.ts'
import { emptyProgress } from '../src/state/progressFields.ts'
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
if (!kitBundle) throw new Error('The baked kit bundle is required for runtime budgets.')

let naiveMuseumDraws = 0
let batchedMuseumDraws = 0
const roomMetrics = new Map<string, {
  uniqueBatches: number
  instantiatedTriangles: number
}>()

for (const room of MUSEUM.rooms) {
  const placedRecipes = room.kit.map((placement) => ({
    part: placement.part,
    nodes: kitBundle.parts.filter(
      (part) =>
        part.name === placement.part ||
        part.name.startsWith(`${placement.part}__`),
    ),
  }))
  const unresolved = placedRecipes.filter((recipe) => recipe.nodes.length === 0)
  const naiveParts = placedRecipes.flatMap((recipe) => recipe.nodes)
  const batchedParts = new Set(naiveParts.map((part) => part.name))
  const instantiatedTriangles = naiveParts.reduce(
    (total, part) => total + part.triangles,
    0,
  )

  check(
    `${room.id} kit placements resolve against the baked bundle`,
    unresolved.length === 0,
    unresolved.map((recipe) => recipe.part).join(', '),
  )

  naiveMuseumDraws += naiveParts.length
  batchedMuseumDraws += batchedParts.size
  roomMetrics.set(room.id, {
    uniqueBatches: batchedParts.size,
    instantiatedTriangles,
  })

  console.log(
    `  PERF  ${room.id.padEnd(8)} kit draws ` +
      `${String(naiveParts.length).padStart(3)} → ` +
      `${String(batchedParts.size).padStart(2)}, ` +
      `${String(instantiatedTriangles).padStart(6)} instantiated triangles`,
  )
}

check(
  'museum placements reduce kit draw batches',
  batchedMuseumDraws < naiveMuseumDraws,
  `${naiveMuseumDraws} → ${batchedMuseumDraws}`,
)

const atriumMetrics = roomMetrics.get('atrium')
check(
  'atrium kit uses at most 56 unique draw batches',
  Boolean(atriumMetrics && atriumMetrics.uniqueBatches <= 56),
  atriumMetrics
    ? `${atriumMetrics.uniqueBatches} unique batches`
    : 'atrium metrics missing',
)
check(
  'atrium kit stays within 50,000 instantiated triangles',
  Boolean(atriumMetrics && atriumMetrics.instantiatedTriangles <= 50_000),
  atriumMetrics
    ? `${atriumMetrics.instantiatedTriangles} instantiated triangles`
    : 'atrium metrics missing',
)

/**
 * The office is the first room anyone sees, and its frame is the one furthest
 * from the mobile draw target (HANDOFF §2). The second bookcase arrangement
 * and the shelves' calf and page heads took its kit from 43 to 53 batches;
 * these ceilings make the next addition a decision rather than drift.
 */
const officeMetrics = roomMetrics.get('office')
check(
  'office kit uses at most 53 unique draw batches',
  Boolean(officeMetrics && officeMetrics.uniqueBatches <= 53),
  officeMetrics
    ? `${officeMetrics.uniqueBatches} unique batches`
    : 'office metrics missing',
)
check(
  'office kit stays within 36,000 instantiated triangles',
  Boolean(officeMetrics && officeMetrics.instantiatedTriangles <= 36_000),
  officeMetrics
    ? `${officeMetrics.instantiatedTriangles} instantiated triangles`
    : 'office metrics missing',
)

/**
 * What each room draws by data: the kit, and beside it everything a room
 * places one by one.
 *
 * The ceilings above count the kit alone, and a thing leaves the kit the day
 * it has something to say: the plinth of the hall became a device in L3 (and
 * the lectern, the telephone and the safe follow it). Furniture is instanced,
 * one draw for every copy of a node; a container, a device and a power
 * control are cloned, one draw for each node of each one. So a room that
 * moves a piece from one list to the other draws the same, and a room that
 * keeps it in both draws it twice, with every kit ceiling still green.
 * These hold the sum to what was measured before the first piece moved.
 *
 * The count is of what a room can draw AT ONCE, which is every node but for
 * one case. A signing desk that signs a single term draws its lamp while
 * the term waits and its Book once the term is signed, and never the two
 * together (`deskShows`; the case below asks it of the lectern itself): the
 * larger of the two groups counts. A desk with a second term can show the
 * Book of the first under the lamp of the next, and counts both. A
 * container counts whole, its door and what stands behind it: that is the
 * safe standing open.
 */
const nodesOf = (recipe: string) =>
  kitBundle!.parts.filter((part) => part.name === recipe || part.name.startsWith(`${recipe}__`)).map((part) => part.name)

function drawnAtOnce(device: NonNullable<(typeof MUSEUM.rooms)[number]['devices']>[number]) {
  const nodes = nodesOf(device.part)
  if (device.kind !== 'signing-desk' || device.termIds.length !== 1) return nodes.length
  const lamp = nodes.filter((name) => name.startsWith(`${device.part}__led`)).length
  const book = nodes.filter((name) => name.startsWith(`${device.part}__book`)).length
  return nodes.length - Math.min(lamp, book)
}

function drawnByData(room: (typeof MUSEUM.rooms)[number]) {
  const kit = new Set(room.kit.flatMap((placement) => nodesOf(placement.part))).size
  const containers = (room.containers ?? []).reduce((sum, container) => sum + nodesOf(container.part).length, 0)
  const devices = (room.devices ?? []).reduce((sum, device) => sum + drawnAtOnce(device), 0)
  const control = room.powerControl ? nodesOf(room.powerControl.part).length : 0
  return { kit, containers, devices, control, total: kit + containers + devices + control }
}

/**
 * The hall and the wing draw what they drew before a piece of theirs left
 * the kit. The office draws five nodes more since the Posse, by the lot
 * plan's own count (L3, §7): the answering machine is three that were not
 * there, and the safe that opens is four where it was two (its door, the
 * brass on the door, and the proof on its shelf).
 */
const DRAWN_BY_DATA_CEILING: Readonly<Record<string, number>> = { atrium: 59, holyoke: 33, office: 79 }
for (const room of MUSEUM.rooms) {
  const drawn = drawnByData(room)
  const ceiling = DRAWN_BY_DATA_CEILING[room.id]
  console.log(
    `  PERF  ${room.id.padEnd(8)} drawn by data ${String(drawn.total).padStart(2)} ` +
      `(kit ${drawn.kit}, containers ${drawn.containers}, devices ${drawn.devices}, control ${drawn.control})`,
  )
  check(
    `${room.id} draws at most ${ceiling} nodes by data: kit, containers, devices and its power control`,
    ceiling !== undefined && drawn.total <= ceiling,
    ceiling === undefined ? 'a room with no ceiling' : `${drawn.total} nodes`,
  )
}

// The plinth and the lectern are in the atrium's count once each, as
// devices: the five nodes of the one and the four of the other left the kit,
// which stands at 47 batches under its ceiling of 56. The lectern has a
// fifth node since it is a signing desk, and draws four of the five at the
// most: the temporary ceiling the plan allowed the hall for the Book
// (ÁT-K1) is not spent.
const atriumRoom = MUSEUM.rooms.find((room) => room.id === 'atrium')
if (!atriumRoom) throw new Error('The atrium is required for the draw budgets.')
const atriumDrawn = drawnByData(atriumRoom)
check(
  'the plinth and the lectern of the hall are drawn once each, as devices, and no longer by the kit',
  atriumDrawn.kit === 47 &&
    atriumDrawn.devices === 9 &&
    atriumRoom.kit.every((placement) => placement.part !== 'atrium-central-podium' && placement.part !== 'atrium-lectern'),
  `kit ${atriumDrawn.kit}, devices ${atriumDrawn.devices}`,
)
// The lamp or the Book, asked of the rule that draws them, on every night
// the lectern can stand at: nothing brought to it, the deed waiting on a dark
// house, the deed ready, signed with the card still owed, signed and seen.
const lectern = (atriumRoom.devices ?? []).find((device) => device.kind === 'signing-desk')
if (!lectern || lectern.kind !== 'signing-desk') throw new Error('The lectern is required for the draw budgets.')
const lit = { roomsPowered: ['office', 'atrium', 'holyoke'] }
const lecternNights = [
  emptyProgress(),
  { ...emptyProgress(), documentsRead: ['doc-termos'] },
  { ...emptyProgress(), ...lit, documentsRead: ['doc-termos'] },
  { ...emptyProgress(), ...lit, documentsRead: ['doc-termos'], termsSigned: ['termo-posse'], flags: ['posse-signed'] },
  { ...emptyProgress(), ...lit, documentsRead: ['doc-termos'], termsSigned: ['termo-posse'], flags: ['posse-signed'], sequencesSeen: ['seq-posse'] },
]
const lecternShows = lecternNights.map((progress) => {
  const input = deviceInputOf(lectern, { progress, radio: null, sequence: null }, MUSEUM)
  return deskShows(input.desk, lectern, progress)
})
check(
  'the lectern draws its lamp or its Book, never both: five nodes baked, four drawn at the most',
  nodesOf('atrium-lectern').length === 5 &&
    drawnAtOnce(lectern) === 4 &&
    lecternShows.every((shows) => !(shows.lamp && shows.book)) &&
    JSON.stringify(lecternShows.map((shows) => `${shows.lamp ? 'lamp' : ''}${shows.book ? 'book' : ''}`)) === JSON.stringify(['', 'lamp', 'lamp', 'book', 'book']),
  lecternShows.map((shows) => `${shows.lamp ? 'lamp' : ''}${shows.book ? 'book' : ''}` || 'neither').join(', '),
)
// A desk with a second term would draw both, and is counted so.
check(
  'a desk that signs two terms is counted with its lamp and its Book together',
  drawnAtOnce({ ...lectern, termIds: ['termo-posse', 'termo-reabertura'] }) === 5,
  `${drawnAtOnce({ ...lectern, termIds: ['termo-posse', 'termo-reabertura'] })} nodes`,
)
// And the ceiling bites the mistake it exists for: the plinth left in the
// furniture as well as in the devices is five draws more, under every kit
// ceiling above.
const twice = drawnByData({
  ...atriumRoom,
  kit: [...atriumRoom.kit, { part: 'atrium-central-podium', position: [0, 0, 0] }],
})
check(
  'a piece kept in the kit and in the devices breaks the ceiling by data, and not the kit\'s',
  twice.total > DRAWN_BY_DATA_CEILING.atrium && twice.kit <= 56,
  `${twice.total} nodes by data, ${twice.kit} kit batches`,
)

// The telephone on the desk left the furniture the same way (L3, F3): it has
// a dead line to say, so it is a device. Its two nodes are out of the office
// kit and in the count of devices. The safe followed it with the Posse, as a
// container: the kit stands at 49 batches under its ceiling of 53, and the
// room draws 79 nodes by data, the five more that the machine and the
// opening safe are.
const officeRoom = MUSEUM.rooms.find((room) => room.id === 'office')
if (!officeRoom) throw new Error('The office is required for the draw budgets.')
const officeDrawn = drawnByData(officeRoom)
const telephoneDevices = (officeRoom.devices ?? []).filter((device) => device.part === 'desk-telephone')
check(
  'the telephone is drawn once, as a device, and the safe once, as a container: the office kit is at 49 batches and the room draws 79 nodes by data',
  officeDrawn.kit === 49 &&
    officeDrawn.total === 79 &&
    telephoneDevices.length === 1 &&
    (officeRoom.containers ?? []).filter((container) => container.part === 'office-safe').length === 1 &&
    officeRoom.kit.every((placement) => placement.part !== 'desk-telephone' && placement.part !== 'office-safe'),
  `kit ${officeDrawn.kit}, by data ${officeDrawn.total}, ${telephoneDevices.length} telephone(s) among the devices`,
)
check(
  'the safe is four nodes, the answering machine three: what the office gained by data',
  nodesOf('office-safe').length === 4 && nodesOf('office-answering-machine').length === 3,
  `safe ${nodesOf('office-safe').join(', ')}; machine ${nodesOf('office-answering-machine').join(', ')}`,
)

/**
 * And the triangles, by data, for the reason the nodes are counted that way.
 *
 * The two triangle ceilings above («atrium kit stays within 50,000», «office
 * kit stays within 36,000») sum the kit alone. When the plinth (2,052
 * triangles), the lectern, the safe and the telephone left the kit for the
 * devices and the containers (L3), what those ceilings measure dropped by
 * some 3,000 in each room while the rooms went on drawing every one of those
 * triangles: the hall's apparent slack went from 3,700 to 6,700, the
 * office's from 1,300 to 4,400, and a later lot could have spent the
 * difference on furniture with every gate green. The node count by data
 * does not see it either: it counts draws.
 *
 * So each room is held to what it places in all, by whichever list: every
 * kit placement (instanced, a copy of its triangles each), every container
 * whole, every device at the most it draws at once, and its power control.
 * At what was measured when the review of L3 found the gap, which is where a
 * ratchet starts.
 */
const trianglesOf = (recipe: string) =>
  kitBundle!.parts.filter((part) => part.name === recipe || part.name.startsWith(`${recipe}__`)).reduce((sum, part) => sum + part.triangles, 0)

function trianglesAtOnce(device: NonNullable<(typeof MUSEUM.rooms)[number]['devices']>[number]) {
  const all = trianglesOf(device.part)
  if (device.kind !== 'signing-desk' || device.termIds.length !== 1) return all
  // The lamp or the Book, never both (`drawnAtOnce`): the heavier of the two counts.
  const of = (prefix: string) =>
    kitBundle!.parts.filter((part) => part.name.startsWith(`${device.part}__${prefix}`)).reduce((sum, part) => sum + part.triangles, 0)
  return all - Math.min(of('led'), of('book'))
}

function trianglesByData(room: (typeof MUSEUM.rooms)[number]) {
  const kit = room.kit.reduce((sum, placement) => sum + trianglesOf(placement.part), 0)
  const containers = (room.containers ?? []).reduce((sum, container) => sum + trianglesOf(container.part), 0)
  const devices = (room.devices ?? []).reduce((sum, device) => sum + trianglesAtOnce(device), 0)
  const control = room.powerControl ? trianglesOf(room.powerControl.part) : 0
  return { kit, containers, devices, control, total: kit + containers + devices + control }
}

const TRIANGLES_BY_DATA_CEILING: Readonly<Record<string, number>> = { atrium: 47_224, holyoke: 21_860, office: 41_614 }
for (const room of MUSEUM.rooms) {
  const placed = trianglesByData(room)
  const ceiling = TRIANGLES_BY_DATA_CEILING[room.id]
  console.log(
    `  PERF  ${room.id.padEnd(8)} triangles by data ${String(placed.total).padStart(6)} ` +
      `(kit ${placed.kit}, containers ${placed.containers}, devices ${placed.devices}, control ${placed.control})`,
  )
  check(
    `${room.id} places at most ${ceiling?.toLocaleString('en-US')} triangles by data: kit, containers, devices and its power control`,
    ceiling !== undefined && placed.total <= ceiling,
    ceiling === undefined ? 'a room with no ceiling' : `${placed.total} triangles`,
  )
  // The kit's share is the figure the older ceilings read, placement by placement.
  check(
    `${room.id}: the kit's share of that count is the kit ceiling's own figure`,
    placed.kit === roomMetrics.get(room.id)?.instantiatedTriangles,
    `${placed.kit} against ${roomMetrics.get(room.id)?.instantiatedTriangles}`,
  )
}
// The mistake it exists for: a piece of furniture the weight of the plinth,
// placed as a device, is under both kit ceilings and over this one.
const heavier = trianglesByData({
  ...officeRoom,
  devices: [...(officeRoom.devices ?? []), { ...(atriumRoom.devices ?? []).find((device) => device.part === 'atrium-central-podium')!, id: 'a-second-plinth' }],
})
check(
  'furniture added as a device breaks the triangle ceiling by data, with the kit ceilings untouched',
  heavier.total > TRIANGLES_BY_DATA_CEILING.office && heavier.kit === trianglesByData(officeRoom).kit && heavier.kit <= 36_000,
  `${heavier.total} triangles by data, ${heavier.kit} in the kit`,
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
