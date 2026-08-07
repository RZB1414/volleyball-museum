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

/**
 * Standing parts stand.
 *
 * A part meant to rest on the floor is authored with min Y at zero. Placing it
 * at a room position then puts it on the floor with no per-part offset — which
 * is what makes `kit` a flat list of positions instead of a table of magic
 * numbers, and what broke when the node transform was dropped.
 */
const FLOOR_STANDING = [
  'plinth-block',
  'plinth-tapered',
  'vitrine-table',
  'archive-cabinet',
  'rope-stanchion',
  'bench',
  'label-plaque',
]

const kit = bundles.find((bundle) => bundle.name === 'kit')
for (const name of FLOOR_STANDING) {
  const part = kit?.parts.find((candidate) => candidate.name === name)
  check(
    `${name} is authored standing on the floor`,
    part != null && Math.abs(part.bounds.min[1]) < FLOOR_EPSILON,
    part ? `min Y is ${part.bounds.min[1]}` : 'part not baked',
  )
}

console.log(`${checks - failures}/${checks} checks passed`)
if (failures > 0) process.exitCode = 1
