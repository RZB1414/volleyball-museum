/**
 * Measures shading quality and download size: flat faces whose normals the
 * crease pass bent (AS-S2), how round the turned and tubed metal is, how far
 * the shell's trim projects, and what every GLB and chunk weighs on disk, in
 * gzip and in brotli.
 *
 * The size table reads `dist/assets`, so run `npm run build` first; without
 * a build it says so and measures the models alone. That dependency on a
 * build is one reason the gate never reads what these scripts print.
 * Read-only.
 *
 *   npm run audit:geo2
 */

import { resolve } from 'node:path'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync, brotliCompressSync } from 'node:zlib'

import { load, REPO } from './lib/repo.mjs'

const kit = await load('scripts/bake/kit.mjs')
const atriumDecor = await load('scripts/bake/parts/atriumDecor.mjs')
const atriumFurn = await load('scripts/bake/parts/atriumFurnishings.mjs')
const holyoke = await load('scripts/bake/parts/holyokeDecor.mjs')
const fixtures = await load('scripts/bake/parts/fixtures.mjs')
const interp = await load('scripts/bake/parts/interpretive.mjs')
const openings = await load('scripts/bake/parts/openings.mjs')
const cases = await load('scripts/bake/parts/cases.mjs')
const { MUSEUM } = await load('src/content/museum.ts')

const P = (g) => g.attributes.position
const tri = (g) => (g.index ? g.index.count / 3 : P(g).count / 3)
const f = (v, d = 3) => v.toFixed(d)

/**
 * For every triangle: the largest angle between a vertex normal and the face
 * normal. Reported as area shares: exact (<2 deg, flat shaded), bent (2..25:
 * a flat face shaded as a pillow, or a gently curved surface), smooth (>25).
 * `bigFlat` isolates triangles larger than 20 cm2 whose three vertices are
 * coplanar with a large neighbourhood: on those any deviation is an error.
 */
function shading(g) {
  const p = P(g), n = g.attributes.normal, idx = g.index
  const count = idx ? idx.count : p.count
  const get = (k) => (idx ? idx.getX(k) : k)
  let total = 0, exact = 0, bent = 0, smooth = 0
  let bigArea = 0, bigBad = 0, bigWorst = 0
  for (let i = 0; i < count; i += 3) {
    const a = get(i), b = get(i + 1), c = get(i + 2)
    const ax = p.getX(a), ay = p.getY(a), az = p.getZ(a)
    const e1 = [p.getX(b) - ax, p.getY(b) - ay, p.getZ(b) - az]
    const e2 = [p.getX(c) - ax, p.getY(c) - ay, p.getZ(c) - az]
    const fn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const len = Math.hypot(...fn)
    if (len < 1e-12) continue
    const area = len / 2
    let worst = 0
    for (const k of [a, b, c]) {
      const d = (n.getX(k) * fn[0] + n.getY(k) * fn[1] + n.getZ(k) * fn[2]) / len
      worst = Math.max(worst, (Math.acos(Math.min(1, Math.max(-1, d))) * 180) / Math.PI)
    }
    total += area
    if (worst < 2) exact += area
    else if (worst < 25) bent += area
    else smooth += area
    // axis-aligned big triangle = a box face
    const axis = Math.max(Math.abs(fn[0]), Math.abs(fn[1]), Math.abs(fn[2])) / len
    if (area > 0.002 && axis > 0.9999) {
      bigArea += area
      if (worst >= 2) { bigBad += area; bigWorst = Math.max(bigWorst, worst) }
    }
  }
  return { exact: exact / total, bent: bent / total, smooth: smooth / total, bigBadShare: bigArea ? bigBad / bigArea : 0, bigWorst, area: total }
}
const line = (name, g) => {
  const s = shading(g)
  return `${name.padEnd(34)} ${String(tri(g)).padStart(5)} tris  flat ${(s.exact * 100).toFixed(0).padStart(3)}%  bent ${(s.bent * 100).toFixed(0).padStart(3)}%  curved ${(s.smooth * 100).toFixed(0).padStart(3)}%  | axis-aligned box faces with wrong normals: ${(s.bigBadShare * 100).toFixed(0)}% of their area, worst ${s.bigWorst.toFixed(0)} deg`
}

console.log('=== SHADING: box faces whose normals the crease pass tilted (crease != null over bevelledBox/sweep bevels) ===')
const families = {
  'plinth (kit)': kit.buildPlinth({ height: 1.0 }),
  'vitrine-table': kit.buildVitrineTable(),
  'vitrine-glass': kit.buildVitrineGlass(),
  'label-plaque': kit.buildLabelPlaque(),
  'bench': kit.buildBench(),
  'archive-cabinet': kit.buildArchiveCabinet(),
  'frame portrait-small': kit.buildFrame({ width: 0.34, aspect: 0.6611 }),
  'frame panorama-wide': kit.buildFrame({ width: 1.4, aspect: 2.5751 }),
  'open book (handbook)': kit.buildOpenBook(),
  'booklet (guide)': kit.buildBooklet(),
  'net structure': kit.buildNet1897().structure,
  'label-angled': interp.buildLabelAngled(),
  'donation-box pedestal': interp.buildDonationBox().pedestal,
  'wall-sconce': fixtures.buildWallSconce(),
  'vent-grille': fixtures.buildVentGrille(),
  'breaker lever': fixtures.buildBreakerPanel().lever,
  'breaker led': fixtures.buildBreakerPanel().led,
  'breaker case': fixtures.buildBreakerPanel().case,
  'ceiling-spot track': fixtures.buildCeilingSpot().track,
  'ceiling-spot head': fixtures.buildCeilingSpot().head,
  'podium top': atriumDecor.buildAtriumCentralPodium().top,
  'podium brass': atriumDecor.buildAtriumCentralPodium().brass,
  'podium body': atriumDecor.buildAtriumCentralPodium().body,
  'lectern top': atriumDecor.buildAtriumLectern().top,
  'reception props': atriumDecor.buildAtriumReceptionDesk().props,
  'tower brass': atriumDecor.buildAtriumDisplayTower().brass,
  'tower artefacts': atriumDecor.buildAtriumDisplayTower().artefacts,
  'sofa brass': atriumDecor.buildAtriumSofa().brass,
  'door leaf': openings.buildDoorLeaf().leaf,
  'door furniture': openings.buildDoorLeaf().furniture,
  'architrave': openings.buildArchitrave(),
  'threshold': openings.buildThreshold(),
  'wayfinding plaque': interp.buildWayfindingPlaque(),
  'dedication plaque': interp.buildDedicationPlaque(),
  'history-case-run trim': holyoke.buildHistoryCaseRun().trim,
  'history-case-run artefacts': holyoke.buildHistoryCaseRun().artefacts,
  'gym-training wood': holyoke.buildGymTrainingSet().wood,
  'gym-training rope': holyoke.buildGymTrainingSet().rope,
  'barrier segment': atriumFurn.buildAtriumBarrierSegment().brass,
  'rope-stanchion': kit.buildStanchion(),
  'rope-span': kit.buildRopeSpan({ span: 1.65 }),
  'lounge brass': atriumFurn.buildAtriumLoungeSet().brass,
  'inlay brass': atriumDecor.buildAtriumFloorInlay().brass,
  'vitrine-tower carcass (unplaced)': cases.buildVitrineTower().carcass,
}
for (const [name, g] of Object.entries(families)) console.log('  ' + line(name, g))

console.log('\n=== SHELL TRIM: how far each moulding stands off the plaster (atrium north wall, face z=-8.875) ===')
{
  const prepared = kit.prepareRoomShells(MUSEUM.rooms)
  const a = kit.buildRoomShell(prepared.find((r) => r.id === 'atrium'))
  const trim = a.find((p) => p.name.endsWith('__trim')).geometry
  const p = P(trim)
  for (const [label, y0, y1] of [['skirting', -0.01, 0.165], ['chair rail', 1.015, 1.09], ['picture rail', 2.615, 2.67], ['cornice', 8.17, 8.41]]) {
    let zmax = -Infinity, ymin = Infinity, ymax = -Infinity
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
      if (y < y0 || y > y1) continue
      if (z < -8.9 || z > -8.5) continue // north-wall mouldings only (west/east runs end at z=-9.002)
      if (Math.abs(x) > 9.01) continue
      zmax = Math.max(zmax, z); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y)
    }
    console.log(`  ${label.padEnd(13)} y[${f(ymin)},${f(ymax)}] proud ${f((zmax + 8.875) * 1000, 0)} mm`)
  }
  const tb = (() => { let ymin = Infinity, ymax = -Infinity; for (let i = 0; i < p.count; i += 1) { ymin = Math.min(ymin, p.getY(i)); ymax = Math.max(ymax, p.getY(i)) } return [ymin, ymax] })()
  console.log(`  trim y range ${f(tb[0], 4)}..${f(tb[1], 4)}: mouldings swept with the 2 mm extrude bevel overrun the floor and ceiling datums by 2 mm (buried)`)
  for (const room of prepared) {
    const parts = kit.buildRoomShell(room)
    const uvRange = (g) => { const uv = g.attributes.uv; let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity; for (let i = 0; i < uv.count; i += 1) { a0 = Math.min(a0, uv.getX(i)); a1 = Math.max(a1, uv.getX(i)); b0 = Math.min(b0, uv.getY(i)); b1 = Math.max(b1, uv.getY(i)) } return `${f(a1 - a0, 1)} x ${f(b1 - b0, 1)} tiles` }
    console.log(`  ${room.id}: ` + parts.map((q) => `${q.name.split('__')[1]} ${uvRange(q.geometry)}`).join(' | '))
  }
}

console.log('\n=== SIZES on disk and gzip/brotli (what a CDN serves) ===')
for (const dir of ['public/models', 'dist/assets']) {
  if (!existsSync(resolve(REPO, dir))) {
    console.log(`  ${dir} is not there: run \`npm run build\` to measure the chunks`)
    continue
  }
  for (const name of readdirSync(resolve(REPO, dir))) {
    const file = resolve(REPO, dir, name)
    if (!statSync(file).isFile()) continue
    if (!/\.(glb|js|css)$/.test(name)) continue
    const raw = readFileSync(file)
    console.log(`  ${dir}/${name.padEnd(44)} ${String(raw.length).padStart(8)} B  gzip ${String(gzipSync(raw).length).padStart(8)}  br ${String(brotliCompressSync(raw).length).padStart(8)}`)
  }
}
let mediaTotal = 0, matTotal = 0
for (const name of readdirSync(resolve(REPO, 'public/textures/media'))) mediaTotal += statSync(resolve(REPO, 'public/textures/media', name)).size
for (const name of readdirSync(resolve(REPO, 'public/textures/materials'))) matTotal += statSync(resolve(REPO, 'public/textures/materials', name)).size
console.log(`  public/textures/materials total ${matTotal} B; public/textures/media total ${mediaTotal} B`)
