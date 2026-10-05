/**
 * Headless proof that a baked part lands where it was authored.
 *
 *   npm run test:kit
 *
 * Written after every mount in the building — vitrines, plinths, cabinets —
 * spent the whole project half-buried in the floor without anyone noticing.
 * `quantize()` recentres geometry and compensates with a node translation, and
 * three separate copies of the clone code threw that translation away. The
 * defect was invisible precisely because it was uniform: everything sank by
 * half its own height together, so nothing looked wrong next to anything else.
 *
 * The test parses the GLB directly rather than going through three, so it
 * checks the FILE — the same bytes the browser gets — and it compares against
 * the manifest bounds, which are recorded before quantisation. If the node
 * transform is applied, the two agree; if a caller drops it, they do not.
 *
 * The rule it enforces is the one a museum obeys without being told: parts sit
 * on the floor. Anything whose authored minimum Y is zero must still be zero
 * after the file round-trips.
 */

import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

let failures = 0
let checks = 0

function check(name, condition, detail = '') {
  checks += 1
  if (condition) console.log(`  pass  ${name}`)
  else {
    failures += 1
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/**
 * Undoes integer normalisation.
 *
 * `KHR_mesh_quantization` stores positions as normalised int16, so a raw
 * accessor min of -32767 means -1.0, not minus thirty-two thousand metres.
 * The node's scale and translation then map that unit cube back onto the part.
 */
const NORMALISERS = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }

function denormalise(value, accessor) {
  if (!accessor.getNormalized()) return value
  const divisor = NORMALISERS[accessor.getComponentType()]
  if (!divisor) return value
  return Math.max(value / divisor, -1)
}

/** World-space AABB of a node's mesh, with the node's own transform applied. */
function nodeBounds(node) {
  const mesh = node.getMesh()
  if (!mesh) return null

  const [tx, ty, tz] = node.getTranslation()
  const [sx, sy, sz] = node.getScale()

  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]

  for (const primitive of mesh.listPrimitives()) {
    const position = primitive.getAttribute('POSITION')
    if (!position) continue
    // Accessor min/max are authoritative and already account for meshopt
    // decoding; reading every vertex would be slower and no more correct.
    const lo = position.getMin([])
    const hi = position.getMax([])
    const scale = [sx, sy, sz]
    const offset = [tx, ty, tz]
    for (let axis = 0; axis < 3; axis += 1) {
      // A negative scale would flip the interval, so take both corners.
      const a = denormalise(lo[axis], position) * scale[axis] + offset[axis]
      const b = denormalise(hi[axis], position) * scale[axis] + offset[axis]
      min[axis] = Math.min(min[axis], a, b)
      max[axis] = Math.max(max[axis], a, b)
    }
  }

  return Number.isFinite(min[0]) ? { min, max } : null
}

const manifestSource = await readFile(resolve(ROOT, 'src/content/bake.generated.ts'), 'utf8')
const start = manifestSource.indexOf('export const BAKED_BUNDLES')
const bundles = JSON.parse(
  manifestSource.slice(
    manifestSource.indexOf('[', start),
    manifestSource.lastIndexOf('] as const satisfies readonly BakedBundle[]') + 1,
  ),
)

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
})

/**
 * Tolerance scales with the part, because quantisation error does.
 *
 * 14 bits spread across a part's own bounding box means one quantum is
 * `extent / 2^14` — a tenth of a millimetre on a plinth, but a full millimetre
 * on an eighteen-metre room shell. A fixed epsilon either fails the shells or
 * stops being able to see anything smaller than a millimetre.
 *
 * The failure this exists to catch is half a part's height, so even on the
 * smallest part there are four orders of magnitude of headroom.
 */
const QUANTISATION_BITS = 14
const FLOOR_EPSILON = 1e-4

function toleranceFor(bounds) {
  const extent = Math.max(...[0, 1, 2].map((axis) => bounds.max[axis] - bounds.min[axis]))
  return Math.max(FLOOR_EPSILON, extent / 2 ** QUANTISATION_BITS)
}

console.log('Kit placement:')

for (const bundle of bundles) {
  const document = await io.read(resolve(ROOT, 'public', bundle.url.replace(/^\//, '')))
  const nodes = new Map(document.getRoot().listNodes().map((node) => [node.getName(), node]))

  for (const part of bundle.parts) {
    const node = nodes.get(part.name)
    if (!node) {
      check(`${bundle.name} · ${part.name} is in the file`, false, 'node missing')
      continue
    }

    const actual = nodeBounds(node)
    if (!actual) {
      check(`${bundle.name} · ${part.name} has geometry`, false, 'no POSITION accessor')
      continue
    }

    const drift = Math.max(
      ...[0, 1, 2].map((axis) =>
        Math.max(
          Math.abs(actual.min[axis] - part.bounds.min[axis]),
          Math.abs(actual.max[axis] - part.bounds.max[axis]),
        ),
      ),
    )

    check(
      `${bundle.name} · ${part.name} survives quantisation in place`,
      drift < toleranceFor(part.bounds),
      `off by ${drift.toFixed(4)} m — authored ` +
        `${part.bounds.min.map((n) => n.toFixed(3)).join(',')} → ` +
        `${part.bounds.max.map((n) => n.toFixed(3)).join(',')}, file ` +
        `${actual.min.map((n) => n.toFixed(3)).join(',')} → ` +
        `${actual.max.map((n) => n.toFixed(3)).join(',')}`,
    )
  }
}

const kit = bundles.find((bundle) => bundle.name === 'kit')

/** A recipe may be one node or a set of `<recipe>__<material>` siblings. */
function recipeParts(recipe) {
  return kit?.parts.filter(
    (candidate) => candidate.name === recipe || candidate.name.startsWith(`${recipe}__`),
  ) ?? []
}

function recipeBounds(recipe) {
  const parts = recipeParts(recipe)
  if (parts.length === 0) return null
  return {
    min: [0, 1, 2].map((axis) => Math.min(...parts.map((part) => part.bounds.min[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...parts.map((part) => part.bounds.max[axis]))),
  }
}

/**
 * Floor-standing recipes stand.
 *
 * The datum belongs to the complete recipe, not necessarily every material
 * component: the donation box's glass begins above its pedestal, for example.
 */
const FLOOR_STANDING = [
  'plinth-block',
  'plinth-tapered',
  'vitrine-table',
  'archive-cabinet',
  'rope-stanchion',
  'bench',
  'label-plaque',
  'vitrine-tower',
  'partition',
  'label-angled',
  'interp-panel',
  'reception-desk',
  'donation-box',
  'curator-desk',
  'office-chair',
  'bookshelf',
  'bookshelf-b',
  'office-rug',
  'office-flatfile',
  'archive-trolley',
  'office-safe',
  'visitor-chair',
  'coat-stand',
  'holyoke-entry-screen',
  'history-case-run',
  'history-hero-case',
  'history-info-kiosk',
  'gym-court-lines',
  'gym-training-set',
  'atrium-reception-desk',
  'atrium-central-podium',
  'atrium-display-tower',
  'atrium-sofa',
  'atrium-lectern',
  'atrium-divider-screen',
  'atrium-barrier-segment',
  'atrium-lounge-set',
  'atrium-display-console',
]

for (const recipe of FLOOR_STANDING) {
  const bounds = recipeBounds(recipe)
  check(
    `${recipe} is authored standing on the floor`,
    bounds != null && Math.abs(bounds.min[1]) < FLOOR_EPSILON,
    bounds ? `min Y is ${bounds.min[1]}` : 'recipe not baked',
  )
}

/** Small objects placed on a sill, desk or threshold also start at local y=0. */
for (const recipe of [
  'vitrine-wall',
  'medallion-socket',
  'desk-lamp',
  'ledger-stack',
  'curator-notebook',
  'desk-radio',
  'desk-telephone',
  'office-answering-machine',
  'door-leaf',
  'door-leaf-right',
  'threshold',
]) {
  const bounds = recipeBounds(recipe)
  check(
    `${recipe} is authored from its horizontal support datum`,
    bounds != null && Math.abs(bounds.min[1]) < FLOOR_EPSILON,
    bounds ? `min Y is ${bounds.min[1]}` : 'recipe not baked',
  )
}

/** Hanging recipes meet the ceiling at local y=0 and grow downwards. */
for (const recipe of ['banner', 'ceiling-spot', 'pendant']) {
  const bounds = recipeBounds(recipe)
  check(
    `${recipe} is authored hanging from the ceiling datum`,
    bounds != null && Math.abs(bounds.max[1]) < FLOOR_EPSILON,
    bounds ? `max Y is ${bounds.max[1]}` : 'recipe not baked',
  )
}

/** Wall recipes start on the wall plane and project into the room along +Z. */
for (const recipe of [
  'vitrine-wall',
  'frame-empty',
  'wall-sconce',
  'vent-grille',
  'breaker-panel',
  'office-corkboard',
  'office-wall-clock',
  'door-access-panel',
  'history-case-run',
  'wayfinding-plaque-navy',
  'wayfinding-plaque-green',
  'wayfinding-plaque-walnut',
  'dedication-plaque',
]) {
  const bounds = recipeBounds(recipe)
  check(
    `${recipe} is authored from the wall datum`,
    bounds != null && Math.abs(bounds.min[2]) < FLOOR_EPSILON,
    bounds ? `min Z is ${bounds.min[2]}` : 'recipe not baked',
  )
}

/**
 * Assemblies must keep every material component under one recipe root. A
 * missing glass pane or lamp shade is otherwise a valid GLB and an incomplete
 * object, which the per-node round-trip checks above cannot distinguish.
 */
for (const recipe of [
  'vitrine-wall',
  'vitrine-tower',
  'partition',
  'banner',
  'donation-box',
  'door-leaf',
  'door-leaf-right',
  'ceiling-spot',
  'pendant',
  'office-chair',
  'desk-lamp',
  'bookshelf',
  'bookshelf-b',
  'ledger-stack',
  'breaker-panel',
  'office-rug',
  'office-corkboard',
  'office-flatfile',
  'archive-trolley',
  'office-safe',
  'visitor-chair',
  'coat-stand',
  'holyoke-entry-screen',
  'history-case-run',
  'history-hero-case',
  'history-info-kiosk',
  'gym-training-set',
  'atrium-reception-desk',
  'atrium-central-podium',
  'atrium-display-tower',
  'atrium-sofa',
  'atrium-lectern',
  'atrium-divider-screen',
  'atrium-lounge-set',
  'atrium-display-console',
  'curator-notebook',
  'desk-radio',
  'desk-telephone',
  'office-answering-machine',
  'office-wall-clock',
  'door-access-panel',
]) {
  const parts = recipeParts(recipe)
  check(
    `${recipe} assembly has all material components`,
    parts.length >= 2,
    `found ${parts.length} component(s)`,
  )
}

/**
 * The porter's radio leaves the desk while its charger stays: the handset is
 * its own families, it sits on the cradle (not inside it, not floating), and
 * the cradle alone still stands on the desk datum.
 */
{
  const byName = new Map(recipeParts('desk-radio').map((part) => [part.name, part]))
  const handset = ['desk-radio__handset', 'desk-radio__handset-metal', 'desk-radio__handset-led']
  check(
    'desk-radio splits the handset from the cradle',
    byName.has('desk-radio') && byName.has('desk-radio__led') && handset.every((name) => byName.has(name)),
    `found ${[...byName.keys()].join(', ')}`,
  )
  const cradle = byName.get('desk-radio')
  const body = byName.get('desk-radio__handset')
  check(
    'desk-radio cradle stands on the desk datum',
    cradle != null && Math.abs(cradle.bounds.min[1]) < FLOOR_EPSILON,
    cradle ? `min Y is ${cradle.bounds.min[1]}` : 'cradle not baked',
  )
  check(
    'desk-radio handset rests in its cradle',
    cradle != null &&
      body != null &&
      body.bounds.min[1] > 0.005 &&
      body.bounds.min[1] < cradle.bounds.max[1] &&
      body.bounds.max[1] > cradle.bounds.max[1] + 0.1,
    body && cradle ? `handset ${body.bounds.min[1]}–${body.bounds.max[1]}, cradle top ${cradle.bounds.max[1]}` : 'not baked',
  )
}

/**
 * Upholstery detail is only worth its triangles where it is seen. The player
 * wakes up behind the two visitor chairs, so their nail heads belong on the
 * back of the backrest, proud of it; the first ones sat on the front face,
 * hidden from the spawn by the chairs themselves.
 */
{
  const parts = new Map(recipeParts('visitor-chair').map((part) => [part.name, part]))
  const upholstery = parts.get('visitor-chair__upholstery')
  const studs = parts.get('visitor-chair__studs')
  check(
    'visitor-chair nail heads stand proud of the back face of the backrest',
    upholstery != null &&
      studs != null &&
      studs.bounds.max[2] < -0.26 &&
      studs.bounds.min[2] < upholstery.bounds.min[2],
    studs && upholstery
      ? `studs z ${studs.bounds.min[2]}–${studs.bounds.max[2]}, cushion back ${upholstery.bounds.min[2]}`
      : 'not baked',
  )
}

/**
 * The telephone left the desk for its own bakelite recipe: a desk family with
 * the old name would be a second telephone in the same place.
 */
check(
  'curator-desk carries no telephone family of its own',
  !kit?.parts.some((part) => part.name === 'curator-desk__phone'),
)
{
  const phone = recipeParts('desk-telephone')
  check(
    'desk-telephone is bakelite with an enamel number card',
    phone.some((part) => part.name === 'desk-telephone' && part.material === 'bakelite-black') &&
      phone.some((part) => part.name === 'desk-telephone__card' && part.material === 'enamel-cream'),
    phone.map((part) => `${part.name}:${part.material}`).join(', '),
  )
}

console.log(`${checks - failures}/${checks} checks passed`)
if (failures > 0) process.exitCode = 1
