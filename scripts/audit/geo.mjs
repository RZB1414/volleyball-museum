/**
 * Measures where every placed part of the atrium and Holyoke really sits:
 * what floats, what sinks into its support, what cuts through its neighbour
 * and how far each wall piece stands from the plaster.
 *
 * It rebuilds the geometry from the generators themselves (pure functions),
 * never through `bake.mjs`, and applies each placement the way the runtime
 * does. Most of the measured model defects of plan section 4 (AS-A1 to
 * AS-A20, AS-H1 to AS-H16) are lines of this output, and the bake gate
 * "support and clearance within a recipe" (plan 4.4b) is to be promoted from
 * it. Read-only.
 *
 *   npm run audit:geo
 */

import { load } from './lib/repo.mjs'

const kit = await load('scripts/bake/kit.mjs')
const atriumDecor = await load('scripts/bake/parts/atriumDecor.mjs')
const atriumFurn = await load('scripts/bake/parts/atriumFurnishings.mjs')
const holyoke = await load('scripts/bake/parts/holyokeDecor.mjs')
const fixtures = await load('scripts/bake/parts/fixtures.mjs')
const interp = await load('scripts/bake/parts/interpretive.mjs')
const balls = await load('scripts/bake/parts/historicalVolleyballs.mjs')
const { MUSEUM } = await load('src/content/museum.ts')

const f = (v, d = 3) => (typeof v === 'number' ? v.toFixed(d) : String(v))
const P = (g) => g.attributes.position
function bounds(g, pred = null) {
  const p = P(g)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  let n = 0
  for (let i = 0; i < p.count; i += 1) {
    const v = [p.getX(i), p.getY(i), p.getZ(i)]
    if (pred && !pred(v)) continue
    n += 1
    for (let a = 0; a < 3; a += 1) { min[a] = Math.min(min[a], v[a]); max[a] = Math.max(max[a], v[a]) }
  }
  return { min, max, n }
}
const tri = (g) => (g.index ? g.index.count / 3 : P(g).count / 3)
const show = (b) => `x[${f(b.min[0])},${f(b.max[0])}] y[${f(b.min[1])},${f(b.max[1])}] z[${f(b.min[2])},${f(b.max[2])}]`
// placement: world = pos + Ry(rot) * (scale * local);  Ry: x' = x cos + z sin ; z' = -x sin + z cos
function toWorld(v, pl, origin = [0, 0, 0]) {
  const s = pl.scale ?? 1
  const r = pl.rotationY ?? 0
  const c = Math.cos(r), sn = Math.sin(r)
  const x = v[0] * s, y = v[1] * s, z = v[2] * s
  return [origin[0] + pl.position[0] + x * c + z * sn, origin[1] + pl.position[1] + y, origin[2] + pl.position[2] - x * sn + z * c]
}
function toLocal(w, pl) {
  const s = pl.scale ?? 1
  const r = pl.rotationY ?? 0
  const c = Math.cos(r), sn = Math.sin(r)
  const dx = w[0] - pl.position[0], dy = w[1] - pl.position[1], dz = w[2] - pl.position[2]
  return [(dx * c - dz * sn) / s, dy / s, (dx * sn + dz * c) / s]
}
function worldBounds(g, pl, origin, pred = null) {
  const p = P(g)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < p.count; i += 1) {
    const l = [p.getX(i), p.getY(i), p.getZ(i)]
    if (pred && !pred(l)) continue
    const w = toWorld(l, pl, origin)
    for (let a = 0; a < 3; a += 1) { min[a] = Math.min(min[a], w[a]); max[a] = Math.max(max[a], w[a]) }
  }
  return { min, max }
}
/** Share of the surface area whose three vertex normals equal the face normal (flat shaded). */
function flatShare(g) {
  const p = P(g), n = g.attributes.normal
  const idx = g.index
  const count = idx ? idx.count : p.count
  let flat = 0, total = 0
  const get = (k) => (idx ? idx.getX(k) : k)
  for (let i = 0; i < count; i += 3) {
    const a = get(i), b = get(i + 1), c = get(i + 2)
    const ax = p.getX(a), ay = p.getY(a), az = p.getZ(a)
    const e1 = [p.getX(b) - ax, p.getY(b) - ay, p.getZ(b) - az]
    const e2 = [p.getX(c) - ax, p.getY(c) - ay, p.getZ(c) - az]
    const fn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const len = Math.hypot(...fn)
    if (len < 1e-12) continue
    const area = len / 2
    fn[0] /= len; fn[1] /= len; fn[2] /= len
    let isFlat = true
    for (const k of [a, b, c]) {
      const d = n.getX(k) * fn[0] + n.getY(k) * fn[1] + n.getZ(k) * fn[2]
      if (d < 0.9994) isFlat = false // 2 degrees
    }
    total += area
    if (isFlat) flat += area
  }
  return flat / total
}

const rooms = Object.fromEntries(MUSEUM.rooms.map((r) => [r.id, r]))
const section = (t) => console.log(`\n=== ${t} ===`)

// ---------------------------------------------------------------- shells
section('SHELL: what prepareRoomShells hands to buildRoomShell')
const prepared = kit.prepareRoomShells(MUSEUM.rooms)
for (const room of prepared) {
  const parts = kit.buildRoomShell(room)
  console.log(`${room.id}: keys=${Object.keys(room).join(',')} palette=${room.palette} -> ` + parts.map((p) => `${p.name.split('__')[1]}:${p.material}:${tri(p.geometry)}`).join(' '))
}
for (const room of MUSEUM.rooms) {
  const withPalette = kit.buildRoomShell({ ...kit.prepareRoomShells(MUSEUM.rooms).find((r) => r.id === room.id), palette: room.palette })
  console.log(`  if palette were passed (${room.palette}): ` + withPalette.map((p) => `${p.name.split('__')[1]}:${p.material}`).join(' '))
}
{
  const a = kit.buildRoomShell(prepared.find((r) => r.id === 'atrium'))
  for (const p of a) console.log(`  atrium ${p.name}: ${show(bounds(p.geometry))}`)
  const h = kit.buildRoomShell(prepared.find((r) => r.id === 'holyoke'))
  for (const p of h) console.log(`  holyoke ${p.name}: ${show(bounds(p.geometry))}`)
  // trim projection from the wall face on the atrium north wall (z=-9): measure trim z range per height band
  const trim = a.find((p) => p.name.endsWith('__trim')).geometry
  for (const [label, y0, y1] of [['skirting', 0, 0.16], ['chair rail', 1.02, 1.085], ['picture rail', 2.62, 2.665], ['cornice', 8.18, 8.4]]) {
    const b = bounds(trim, (v) => v[1] >= y0 - 1e-4 && v[1] <= y1 + 1e-4 && Math.abs(v[0]) < 6 && v[2] < -8)
    console.log(`  atrium north-wall ${label}: z[${f(b.min[2])},${f(b.max[2])}] => proud of the face (z=-8.875) by ${f(b.max[2] + 8.875)} m`)
  }
  const pan = a.find((p) => p.name.endsWith('__panelling')).geometry
  const pb = bounds(pan, (v) => Math.abs(v[0]) < 6 && v[2] < -8)
  console.log(`  atrium north-wall dado panel: y[${f(pb.min[1])},${f(pb.max[1])}] z max ${f(pb.max[2])} => proud ${f(pb.max[2] + 8.875)} m`)
}

// ---------------------------------------------------------------- atrium
section('ATRIUM: breaker panel against the west wall')
{
  const room = rooms.atrium
  const pc = room.powerControl
  const bp = fixtures.buildBreakerPanel()
  for (const [k, g] of Object.entries(bp)) {
    const wb = worldBounds(g, pc, room.origin)
    console.log(`  breaker ${k}: local ${show(bounds(g))} | world x[${f(wb.min[0])},${f(wb.max[0])}] y[${f(wb.min[1])},${f(wb.max[1])}] z[${f(wb.min[2])},${f(wb.max[2])}]`)
  }
  console.log('  west wall face x=-8.875; wall-bay slat face x=-8.760; bay cap face x=-8.725 (cap y 1.425..1.480)')
}

section('ATRIUM: banner hardware vs the flat prints')
{
  const room = rooms.atrium
  const b = interp.buildBanner()
  const g = b.battens
  const top = bounds(g, (v) => v[1] > -0.5)
  const bottom = bounds(g, (v) => v[1] < -3.5)
  console.log(`  battens local: top ${show(top)} | bottom ${show(bottom)} (bottom bar yawed by the cloth twist)`)
  for (const pl of room.kit.filter((k) => k.part === 'atrium-banner-hardware')) {
    const art = room.wallArt.find((a) => a.presentation === 'flush' && Math.abs(a.position[2] - pl.position[2]) < 0.01)
    const wbTop = worldBounds(g, pl, room.origin, (v) => v[1] > -0.5)
    const wbBot = worldBounds(g, pl, room.origin, (v) => v[1] < -3.5)
    const printX = art.position[0] + 0.003
    console.log(
      `  banner z=${pl.position[2]}: print plane x=${f(printX)}, y[${f(art.position[1] - art.height / 2)},${f(art.position[1] + art.height / 2)}], z[${f(art.position[2] - art.width / 2)},${f(art.position[2] + art.width / 2)}]` +
        ` | top bar x[${f(wbTop.min[0])},${f(wbTop.max[0])}] y[${f(wbTop.min[1])},${f(wbTop.max[1])}]` +
        ` | bottom bar x[${f(wbBot.min[0])},${f(wbBot.max[0])}] y[${f(wbBot.min[1])},${f(wbBot.max[1])}] z[${f(wbBot.min[2])},${f(wbBot.max[2])}]` +
        ` => bottom bar crosses the print plane: ${wbBot.min[0] < printX && wbBot.max[0] > printX}, pokes ${f(wbBot.max[0] - printX)} m in front, ${f(printX - wbBot.min[0])} behind (wall face -8.875: ${wbBot.min[0] < -8.875 ? 'INSIDE WALL by ' + f(-8.875 - wbBot.min[0]) : 'clear'})`,
    )
  }
}

section('ATRIUM: wall bays (3.2 m modules, cap 3.24) along each wall')
{
  const room = rooms.atrium
  const half = 9 - 0.125
  const bays = room.kit.filter((k) => k.part === 'atrium-wall-bay-plain')
  const walls = { west: [], east: [], north: [], south: [] }
  for (const b of bays) {
    const [x, , z] = b.position
    if (Math.abs(x + half) < 0.01) walls.west.push(z)
    else if (Math.abs(x - half) < 0.01) walls.east.push(z)
    else if (Math.abs(z + half) < 0.01) walls.north.push(x)
    else if (Math.abs(z - half) < 0.01) walls.south.push(x)
    else console.log('  bay off the wall plane', b.position)
  }
  const portalsBySide = { west: [], east: [], north: [], south: [] }
  for (const p of room.portals) {
    const [x, , z] = p.position
    if (Math.abs(x + 9) < 0.4) portalsBySide.west.push([z - p.width / 2 - 0.098, z + p.width / 2 + 0.098, p.id])
    if (Math.abs(x - 9) < 0.4) portalsBySide.east.push([z - p.width / 2 - 0.098, z + p.width / 2 + 0.098, p.id])
  }
  for (const [side, centres] of Object.entries(walls)) {
    centres.sort((a, b) => a - b)
    const iv = centres.map((c) => [c - 1.6, c + 1.6])
    const notes = []
    if (iv[0][0] < -half) notes.push(`first bay runs ${f(-half - iv[0][0])} m past the corner (into the adjacent wall)`)
    if (iv.at(-1)[1] > half) notes.push(`last bay runs ${f(iv.at(-1)[1] - half)} m past the corner`)
    for (let i = 1; i < iv.length; i += 1) {
      const gap = iv[i][0] - iv[i - 1][1]
      if (gap < -0.001) notes.push(`bays ${i - 1}/${i} OVERLAP by ${f(-gap)} m (coplanar backing + doubled slats)`)
      else if (gap > 0.001) notes.push(`gap ${f(gap)} m between bays ${i - 1}/${i} at ${f(iv[i - 1][1])}..${f(iv[i][0])}`)
      else notes.push(`bays ${i - 1}/${i} butt: caps (3.24) and bottoms (3.22) overlap 0.04/0.02 m coplanar`)
    }
    notes.push(`bare ends: ${f(iv[0][0] + half)} m and ${f(half - iv.at(-1)[1])} m`)
    for (const [p0, p1, id] of portalsBySide[side]) {
      for (const [b0, b1] of iv) {
        const o = Math.min(p1, b1 + 0.02) - Math.max(p0, b0 - 0.02)
        if (o > 0) notes.push(`bay [${f(b0)},${f(b1)}] bites ${f(o)} m into the architrave of ${id} [${f(p0)},${f(p1)}]`)
      }
    }
    console.log(`  ${side}: ${iv.map((i) => `[${f(i[0], 2)},${f(i[1], 2)}]`).join(' ')}\n     ${notes.join('\n     ')}`)
  }
  const bay = atriumDecor.buildAtriumWallBay({ plaqueWidth: 0 })
  console.log(`  plain bay: slats ${show(bounds(bay.slats))} | trim(cap+bottom) ${show(bounds(bay.trim))} | backing ${show(bounds(bay.backing))}`)
  const capBottom = bounds(bay.trim, (v) => v[1] > 1).min[1]
  console.log(`  slat tops at y=${f(bounds(bay.slats).max[1])}, cap underside y=${f(capBottom)} => ${f(capBottom - bounds(bay.slats).max[1])} m open slot under the cap`)
}

section('ATRIUM: reception desk internals')
{
  const d = atriumDecor.buildAtriumReceptionDesk()
  for (const [k, g] of Object.entries(d)) console.log(`  ${k}: ${tri(g)} tris ${show(bounds(g))}`)
  const props = d.props
  const chairFeet = bounds(props, (v) => v[1] < 0.2 && v[2] < -0.2)
  console.log(`  staff chairs: lowest vertex y=${f(chairFeet.min[1], 4)} => five-star bases hover ${f(chairFeet.min[1] * 1000, 1)} mm above the floor`)
  const onTop = bounds(props, (v) => v[1] > 1.0 && v[1] < 1.2)
  console.log(`  objects on the worktop: lowest y=${f(onTop.min[1], 4)} (worktop top 1.080)`)
  const top = bounds(d.timber, (v) => v[1] > 1.0)
  console.log(`  worktop slab top y=${f(top.max[1], 4)}`)
}

section('ATRIUM: display tower artefacts')
{
  const t = atriumDecor.buildAtriumDisplayTower()
  for (const [k, g] of Object.entries(t)) console.log(`  ${k}: ${tri(g)} tris ${show(bounds(g))}`)
  const a = t.artefacts
  const stand = bounds(a, (v) => Math.abs(v[0] + 0.18) < 0.1 && v[1] < 1.1)
  const medal = bounds(a, (v) => Math.abs(v[0] + 0.18) < 0.075 && v[1] > 1.1 && v[1] < 1.262 && Math.abs(v[2] - 0.025) < 0.009)
  const ribbons = bounds(a, (v) => Math.abs(v[0] + 0.18) < 0.07 && v[1] > 1.2 && v[2] < 0.024)
  console.log(`  medal stand y[${f(stand.min[1])},${f(stand.max[1])}] | medal disc y[${f(medal.min[1])},${f(medal.max[1])}] => floats ${f((medal.min[1] - stand.max[1]) * 1000, 1)} mm above its stand | ribbons y[${f(ribbons.min[1])},${f(ribbons.max[1])}] (hang from nothing)`)
  const ball = bounds(a, (v) => Math.hypot(v[0], v[2]) < 0.13 && v[1] > 1.4 && v[1] < 1.75)
  const pads = bounds(t.light, (v) => v[1] > 1.4 && v[1] < 1.6)
  console.log(`  ball y[${f(ball.min[1])},${f(ball.max[1])}] vs luminous pad y[${f(pads.min[1])},${f(pads.max[1])}] => ball sunk ${f((pads.max[1] - ball.min[1]) * 1000, 1)} mm into the pad`)
}

section('ATRIUM: lounge set')
{
  const l = atriumFurn.buildAtriumLoungeSet()
  for (const [k, g] of Object.entries(l)) console.log(`  ${k}: ${tri(g)} tris ${show(bounds(g))}`)
  const sideX = 1.66, sideZ = -0.18
  const near = (v, r) => Math.hypot(v[0] - sideX, v[2] - sideZ) < r
  const top = bounds(l.timber, (v) => near(v, 0.33))
  const stem = bounds(l.brass, (v) => near(v, 0.035) && v[1] < 0.48)
  console.log(`  side table: stem top y=${f(stem.max[1], 4)}, tabletop underside y=${f(top.min[1], 4)} => ${f((top.min[1] - stem.max[1]) * 1000, 1)} mm of air between them`)
  // large-table leg vs small-table top
  const leg = bounds(l.brass, (v) => Math.abs(v[0] - 0.125) < 0.02 && Math.abs(v[2] - 0.815) < 0.02)
  const smallTop = bounds(l.timber, (v) => v[1] > 0.29 && v[1] < 0.35 && Math.abs(v[0] - 0.48) < 0.37 && Math.abs(v[2] - 0.78) < 0.23)
  console.log(`  large-table leg ${show(leg)} passes through small tabletop ${show(smallTop)}`)
  const rug = bounds(l.upholstery, (v) => v[1] < 0.02)
  console.log(`  rug ${show(rug)}; chair/table legs start at y=${f(bounds(l.timber).min[1], 4)} / ${f(bounds(l.brass).min[1], 4)} (through the 12 mm rug)`)
  // armchair post vs cushion
  const seat = bounds(l.upholstery, (v) => v[1] > 0.3 && v[1] < 0.52 && Math.hypot(v[0] + 1.08, v[2] + 0.38) < 0.5)
  console.log(`  armchair A seat cushion ${show(seat)} (0.62 wide between arm posts whose inner faces are 0.545 apart => posts pierce the cushion ~37 mm each side)`)
}

section('ATRIUM: sofa, console, podium, lectern, barrier, divider, inlay, coffer, pendant, aerial')
{
  const parts = {
    sofa: atriumDecor.buildAtriumSofa(), console: atriumFurn.buildAtriumDisplayConsole(), podium: atriumDecor.buildAtriumCentralPodium(),
    lectern: atriumDecor.buildAtriumLectern(), barrier: atriumFurn.buildAtriumBarrierSegment(), divider: atriumFurn.buildAtriumDividerScreen(),
    inlay: atriumDecor.buildAtriumFloorInlay(), coffer: atriumDecor.buildAtriumCeilingCoffer(), pendant: atriumDecor.buildAtriumPinPendant(),
    aerial: atriumDecor.buildAtriumAerialInstallation(),
  }
  for (const [name, fams] of Object.entries(parts)) for (const [k, g] of Object.entries(fams)) {
    console.log(`  ${name}.${k}: ${tri(g)} tris, flat-shaded area ${(flatShare(g) * 100).toFixed(0)}%, ${show(bounds(g))}`)
  }
  const room = rooms.atrium
  const coffer = room.kit.find((k) => k.part === 'atrium-ceiling-coffer')
  const cb = worldBounds(parts.coffer.trim, coffer, room.origin)
  console.log(`  coffer placed y=${coffer.position[1]} => top at y=${f(cb.max[1], 4)} vs ceiling underside 8.400 (${f((8.4 - cb.max[1]) * 1000, 1)} mm gap)`)
  for (const pl of room.kit.filter((k) => k.part === 'atrium-pin-pendant')) {
    const wb = worldBounds(parts.pendant.fitting, pl, room.origin)
    console.log(`  pendant at [${pl.position}] scale ${pl.scale ?? 1}: rose top y=${f(wb.max[1], 4)} (ceiling 8.400, coffer soffit ${f(cb.min[1], 3)} inside x[${f(cb.min[0], 2)},${f(cb.max[0], 2)}] z[${f(cb.min[2], 2)},${f(cb.max[2], 2)}])`)
  }
  const aer = room.kit.find((k) => k.part === 'atrium-aerial-installation')
  const ab = worldBounds(parts.aerial.cables, aer, room.origin)
  console.log(`  aerial cables top y=${f(ab.max[1], 4)} at placement y=${aer.position[1]} scale ${aer.scale}`)
  const inl = parts.inlay
  console.log(`  inlay: timber top y=${f(bounds(inl.timber).max[1], 4)}, dark rings y[${f(bounds(inl.dark).min[1], 4)},${f(bounds(inl.dark).max[1], 4)}], brass y[${f(bounds(inl.brass).min[1], 4)},${f(bounds(inl.brass).max[1], 4)}]`)
}

section('ATRIUM: exhibits on the console risers')
{
  const room = rooms.atrium
  const builders = {
    'ball/leather-laced-1900': () => Object.values(balls.buildLacedLeatherVolleyball()),
    'ball/classic-white-18-panel': () => Object.values(balls.buildClassicWhiteVolleyball()),
    'ball/tricolour-1998': () => Object.values(balls.buildTricolourVolleyball1998()),
    'ball/eight-panel-2008': () => Object.values(balls.buildEightPanelVolleyball2008()),
  }
  for (const ex of MUSEUM.exhibits.filter((e) => room.exhibitIds.includes(e.id))) {
    const gs = builders[ex.recipe]()
    let minY = Infinity
    for (const g of gs) minY = Math.min(minY, bounds(g).min[1])
    console.log(`  ${ex.id}: lowest point y=${f(ex.position[1] + minY, 4)} vs supportY ${ex.supportY} => ${f((ex.position[1] + minY - ex.supportY) * 1000, 1)} mm ${ex.position[1] + minY > ex.supportY ? 'above (floating)' : 'below (sunk)'}`)
  }
  // core vs panel tessellation
  const radial = (g) => {
    const p = P(g)
    const r = []
    for (let i = 0; i < p.count; i += 1) r.push(Math.hypot(p.getX(i), p.getY(i), p.getZ(i)))
    return r
  }
  const faceMinRadius = (g) => {
    const p = P(g)
    const idx = g.index
    const count = idx ? idx.count : p.count
    const get = (k) => (idx ? idx.getX(k) : k)
    let min = Infinity
    for (let i = 0; i < count; i += 3) {
      const a = get(i), b = get(i + 1), c = get(i + 2)
      const cx = (p.getX(a) + p.getX(b) + p.getX(c)) / 3
      const cy = (p.getY(a) + p.getY(b) + p.getY(c)) / 3
      const cz = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3
      min = Math.min(min, Math.hypot(cx, cy, cz))
      for (const [m, n] of [[a, b], [b, c], [c, a]]) {
        min = Math.min(min, Math.hypot((p.getX(m) + p.getX(n)) / 2, (p.getY(m) + p.getY(n)) / 2, (p.getZ(m) + p.getZ(n)) / 2))
      }
    }
    return min
  }
  const core = new (await import('three')).SphereGeometry(0.105 - 0.0012, 24, 16)
  const coreMax = Math.max(...radial(core))
  const t98 = balls.buildTricolourVolleyball1998()
  const t08 = balls.buildEightPanelVolleyball2008()
  const c64 = balls.buildClassicWhiteVolleyball()
  console.log(`  recessed core: vertex radius ${f(coreMax, 5)} m (panel radius 0.10500, recess 1.2 mm)`)
  console.log(`  1998 blue panels: lowest chord point radius ${f(faceMinRadius(t98.blue), 5)} | yellow ${f(faceMinRadius(t98.yellow), 5)} => core pokes through by up to ${f((coreMax - Math.min(faceMinRadius(t98.blue), faceMinRadius(t98.yellow))) * 1000, 2)} mm`)
  console.log(`  2008 yellow panels: lowest chord point radius ${f(faceMinRadius(t08.yellow), 5)} => core (blue) pokes through by up to ${f((coreMax - faceMinRadius(t08.yellow)) * 1000, 2)} mm`)
  console.log(`  triangles: laced ${Object.values(balls.buildLacedLeatherVolleyball()).map(tri).join('+')} | 1964 ${tri(c64.cover)} | 1998 ${Object.values(t98).map(tri).join('+')} | 2008 ${Object.values(t08).map(tri).join('+')} (hero budget 15,000 each)`)
}

// ---------------------------------------------------------------- holyoke
section('HOLYOKE: history-case-run internals (recipe-local, wall plane z=0, deck top y=0.76)')
const run = holyoke.buildHistoryCaseRun()
const width = 10.2, bays = 5, bayW = width / bays, depth = 0.64
const shelfYs = (bay) => [1.32 + (bay % 2) * 0.05, 1.91 - (bay % 3) * 0.04]
const shelfDepth = (bay) => depth - 0.14 - (bay % 2) * 0.035
const stiles = Array.from({ length: bays + 1 }, (_, i) => -width / 2 + bayW * i)
{
  for (const [k, g] of Object.entries(run)) console.log(`  ${k}: ${tri(g)} tris, flat-shaded ${(flatShare(g) * 100).toFixed(0)}%, ${show(bounds(g))}`)
  for (let b = 0; b < bays; b += 1) {
    const cx = -width / 2 + bayW * (b + 0.5)
    const ys = shelfYs(b)
    console.log(`  bay ${b} (local x ${f(cx - bayW / 2, 2)}..${f(cx + bayW / 2, 2)}, world x ${f(-(cx + bayW / 2), 2)}..${f(-(cx - bayW / 2), 2)}): shelves span y ${ys.map((y) => `${f(y - 0.0135)}..${f(y + 0.0135)}`).join(' and ')}, x ${f(cx - (bayW - 0.15) / 2, 3)}..${f(cx + (bayW - 0.15) / 2, 3)}, z 0.055..${f(0.055 + shelfDepth(b))}`)
  }
  // decoys: measure by family, per bay, objects sitting between deck and lower shelf
  const DECK = 0.76
  const report = (label, g, pred, support) => {
    const bb = bounds(g, pred)
    if (!bb.n) return
    const d = bb.min[1] - support
    console.log(`    ${label}: y[${f(bb.min[1])},${f(bb.max[1])}] z[${f(bb.min[2])},${f(bb.max[2])}] => ${Math.abs(d) < 0.0006 ? 'seated' : d > 0 ? `floats ${f(d * 1000, 1)} mm above` : `sunk ${f(-d * 1000, 1)} mm into`} support y=${f(support)}`)
  }
  console.log('  decoys in "artefacts" (leather-worn):')
  for (const [i, x] of [-0.70, -0.49, -0.28, -0.07, 0.14].entries()) report(`bay0 catalogue ${i}`, run.artefacts, (v) => Math.abs(v[0] - (-4.08 + x)) < 0.075 && v[2] > 0.15 && v[2] < 0.45 && v[1] < 1.25, DECK)
  report('bay2 leather ball', run.artefacts, (v) => Math.hypot(v[0], v[1] - 1.55, v[2] - 0.34) < 0.19, 1.32 + 0.0135)
  for (let i = 0; i < 4; i += 1) report(`bay4 ledger ${i}`, run.artefacts, (v) => Math.abs(v[1] - (0.81 + i * 0.07)) < 0.034 && v[0] > 3.3 && v[0] < 4.5 && v[2] < 0.5, i === 0 ? DECK : 0.81 + (i - 1) * 0.07 + 0.0325)
  report('bay4 small ball', run.artefacts, (v) => Math.hypot(v[0] - 4.70, v[1] - 0.91, v[2] - 0.31) < 0.14, DECK)
  console.log('  decoys in "paper" (paper-aged):')
  for (let i = 0; i < 3; i += 1) report(`bay1 roll ${i}`, run.paper, (v) => Math.hypot(v[1] - (0.91 + i * 0.055), v[2] - 0.31) < 0.04 && v[0] > -3.0 && v[0] < -1.1, DECK)
  for (let i = 0; i < 4; i += 1) report(`bay2 box ${i}`, run.paper, (v) => Math.abs(v[1] - (0.82 + i * 0.07)) < 0.029 && Math.abs(v[0] - (-0.43 + i * 0.27)) < 0.18 && v[2] > 0.1 && v[2] < 0.5, i === 0 ? DECK : 0.82 + (i - 1) * 0.07 + 0.0275)
  const docs = [[1, -2.04 - 0.38, 1.49, 0.40], [1, -2.04 + 0.28, 1.55, 0.54], [2, -0.58, 1.48, 0.46], [2, 0.58, 1.48, 0.46], [4, 4.08 - 0.42, 1.52, 0.62], [4, 4.08 + 0.30, 1.48, 0.48]]
  for (const [b, x, y, h] of docs) {
    const low = y - (h / 2) * Math.cos(0.28)
    const shelfTop = shelfYs(b)[0] + 0.0135
    console.log(`    bay${b} leaning document at x=${f(x, 2)}: bottom edge y=${f(low)} vs lower shelf top ${f(shelfTop)} => passes ${f((shelfTop - low) * 1000, 0)} mm THROUGH the shelf`)
  }
  for (const [b, , y] of [[0, -4.08 - 0.14, 1.86], [3, 2.04 + 0.10, 1.84]]) {
    const up = shelfYs(b)[1]
    console.log(`    bay${b} box garment centred y=${y} (y ${f(y - 0.35)}..${f(y + 0.35)}, z 0.3025..0.3775): upper shelf at y=${f(up)} (z 0.055..${f(0.055 + shelfDepth(b))}) cuts it at chest height`)
  }
  console.log('    bay3 medals: four discs r=52 mm at z=0.39, 0.35 m in front of the lining, no stand or pin (trim family, brass)')
}

section('HOLYOKE: real exhibits inside the case run and elsewhere')
{
  const room = rooms.holyoke
  const runPl = room.kit.find((k) => k.part === 'history-case-run')
  const three = await import('three')
  const builders = {
    'ball/spalding-laced-1900': () => [kit.buildSpaldingBall()],
    'ball/basketball-bladder-1895': () => [kit.buildBladder()],
    'net/ymca-1897': () => Object.values(kit.buildNet1897()),
    'paper/handbook-1897': () => [kit.buildOpenBook()],
    'paper/spalding-guide-1916': () => [kit.buildBooklet()],
    'apparel/gym-suit-1900': () => Object.values(kit.buildDressForm()),
    'frame/portrait-small': () => [kit.buildFrame({ width: 0.34, aspect: 0.6611 })],
    'frame/panorama-wide': () => [kit.buildFrame({ width: 1.4, aspect: 2.5751 })],
  }
  for (const ex of MUSEUM.exhibits.filter((e) => room.exhibitIds.includes(e.id))) {
    const gs = builders[ex.recipe]()
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
    for (const g of gs) {
      const wb = worldBounds(g, ex, [0, 0, 0])
      for (let a = 0; a < 3; a += 1) { min[a] = Math.min(min[a], wb.min[a]); max[a] = Math.max(max[a], wb.max[a]) }
    }
    let line = `  ${ex.id} (${ex.recipe}, ${gs.map(tri).join('+')} tris, mount ${ex.mount}${ex.scale ? `, scale ${ex.scale}` : ''}): room-local x[${f(min[0])},${f(max[0])}] y[${f(min[1])},${f(max[1])}] z[${f(min[2])},${f(max[2])}]`
    if (ex.supportY != null) line += ` | lowest ${f(min[1], 4)} vs supportY ${ex.supportY}: ${f((min[1] - ex.supportY) * 1000, 1)} mm`
    console.log(line)
    // inside the case run?
    const lc = toLocal([(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], runPl)
    if (lc[2] > 0 && lc[2] < depth && Math.abs(lc[0]) < width / 2 && min[1] > 0.7) {
      const corners = [toLocal([min[0], 0, min[2]], runPl), toLocal([max[0], 0, max[2]], runPl)]
      const lx0 = Math.min(corners[0][0], corners[1][0]), lx1 = Math.max(corners[0][0], corners[1][0])
      const lz0 = Math.min(corners[0][2], corners[1][2]), lz1 = Math.max(corners[0][2], corners[1][2])
      const bay = Math.floor((lc[0] + width / 2) / bayW)
      console.log(`     in case-run bay ${bay}: local x[${f(lx0)},${f(lx1)}] z[${f(lz0)},${f(lz1)}]`)
      for (const sx of stiles) {
        const o = Math.min(lx1, sx + 0.0325) - Math.max(lx0, sx - 0.0325)
        if (o > 0) console.log(`     !! overlaps the bay stile at local x=${f(sx, 2)} (65 mm wide, full depth) by ${f(o * 1000, 0)} mm in x`)
      }
      for (let b = 0; b < bays; b += 1) {
        const cx = -width / 2 + bayW * (b + 0.5)
        const sx0 = cx - (bayW - 0.15) / 2, sx1 = cx + (bayW - 0.15) / 2
        const ox = Math.min(lx1, sx1) - Math.max(lx0, sx0)
        if (ox <= 0) continue
        for (const sy of shelfYs(b)) {
          const oy = Math.min(max[1], sy + 0.0135) - Math.max(min[1], sy - 0.0135)
          const oz = Math.min(lz1, 0.055 + shelfDepth(b)) - Math.max(lz0, 0.055)
          if (oy > 0 && oz > 0) console.log(`     !! intersects the bay-${b} shelf (y ${f(sy - 0.0135)}..${f(sy + 0.0135)}): ${f(ox * 1000, 0)} mm in x, ${f(oy * 1000, 1)} mm in y, ${f(oz * 1000, 0)} mm in z${max[1] <= sy + 0.0135 && min[1] >= sy - 0.0135 ? '  => ENTIRELY INSIDE THE SHELF BOARD in y' : ''}`)
          else if (ox > 0 && oz > 0 && max[1] < sy - 0.0135 && sy - 0.0135 - max[1] < 0.2) console.log(`     under the bay-${b} shelf: ${f((sy - 0.0135 - max[1]) * 1000, 0)} mm below it`)
        }
        if (ex.supportY != null) {
          const tops = [0.76, ...shelfYs(b).map((y) => y + 0.0135)]
          const nearest = tops.reduce((best, t) => (Math.abs(t - ex.supportY) < Math.abs(best - ex.supportY) ? t : best))
          console.log(`     nearest real surface in bay ${b}: y=${f(nearest, 4)} (supportY ${ex.supportY}: off by ${f((ex.supportY - nearest) * 1000, 1)} mm)`)
        }
      }
      // baked decoys in the same space
      for (const [fam, g] of Object.entries({ paper: run.paper, artefacts: run.artefacts, lining: run.lining })) {
        const bb = bounds(g, (v) => v[0] > lx0 && v[0] < lx1 && v[1] > min[1] && v[1] < max[1] && v[2] > lz0 - 0.03 && v[2] < lz1 + 0.03 && !(fam === 'lining' && v[2] < 0.05))
        if (bb.n) console.log(`     !! shares its volume with ${bb.n} vertices of the baked "${fam}" decoys: ${show(bb)}`)
      }
    }
  }
  void three
}

section('HOLYOKE: entry screen niche, hero case, kiosk, labels, training set, court, net')
{
  const room = rooms.holyoke
  const es = holyoke.buildHolyokeEntryScreen()
  for (const [k, g] of Object.entries(es)) console.log(`  entry-screen.${k}: ${tri(g)} tris ${show(bounds(g))}`)
  const hero = holyoke.buildHistoryHeroCase()
  for (const [k, g] of Object.entries(hero)) console.log(`  hero-case.${k}: ${tri(g)} tris, flat ${(flatShare(g) * 100).toFixed(0)}% ${show(bounds(g))}`)
  const kiosk = holyoke.buildHistoryInfoKiosk()
  for (const [k, g] of Object.entries(kiosk)) console.log(`  kiosk.${k}: ${tri(g)} tris ${show(bounds(g))}`)
  const ts = holyoke.buildGymTrainingSet()
  for (const [k, g] of Object.entries(ts)) console.log(`  training-set.${k}: ${tri(g)} tris, flat ${(flatShare(g) * 100).toFixed(0)}% ${show(bounds(g))}`)
  // UV range of the training ball (sphere projection about the recipe origin, not the ball centre)
  const uv = ts.leather.attributes.uv
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity
  for (let i = 0; i < uv.count; i += 1) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)) }
  console.log(`  training ball UVs: u[${f(u0)},${f(u1)}] v[${f(v0)},${f(v1)}] => the whole 0.5 m ball samples ${(100 * (u1 - u0)).toFixed(0)}% x ${(100 * (v1 - v0)).toFixed(0)}% of one leather tile, front and back mirrored (projected from the recipe origin)`)
  const lab = interp.buildLabelAngled()
  console.log(`  label-angled: ${tri(lab)} tris ${show(bounds(lab))}`)
  const tsPl = room.kit.find((k) => k.part === 'gym-training-set')
  for (const pl of room.kit.filter((k) => k.part === 'label-angled')) {
    const wb = worldBounds(lab, pl, [0, 0, 0])
    console.log(`  label at [${pl.position}] rot ${f(pl.rotationY ?? 0, 2)}: room-local x[${f(wb.min[0])},${f(wb.max[0])}] z[${f(wb.min[2])},${f(wb.max[2])}]`)
    for (const [k, g] of Object.entries(ts)) {
      const bb = worldBounds(g, tsPl, [0, 0, 0], (v) => { const w = toWorld(v, tsPl); return w[0] > wb.min[0] - 0.02 && w[0] < wb.max[0] + 0.02 && w[2] > wb.min[2] - 0.02 && w[2] < wb.max[2] + 0.02 })
      if (Number.isFinite(bb.min[0])) console.log(`     training-set.${k} has geometry inside this label's footprint (+20 mm): x[${f(bb.min[0])},${f(bb.max[0])}] y[${f(bb.min[1])},${f(bb.max[1])}] z[${f(bb.min[2])},${f(bb.max[2])}]`)
    }
  }
  const court = room.kit.find((k) => k.part === 'gym-court-lines')
  const net = MUSEUM.exhibits.find((e) => e.id === 'net-1897')
  console.log(`  court: centre z=${court.position[2]}, runs z ${f(court.position[2] - 3.5)}..${f(court.position[2] + 3.5)}; centre line z=${court.position[2]}; net stands at z=${net.position[2]} => ${f(Math.abs(net.position[2] - court.position[2]))} m off the court's centre line`)
  const pc = room.powerControl
  const bp = fixtures.buildBreakerPanel()
  const wb = worldBounds(bp.case, pc, [0, 0, 0])
  console.log(`  holyoke breaker case: room-local x[${f(wb.min[0])},${f(wb.max[0])}] y[${f(wb.min[1])},${f(wb.max[1])}] (east wall face x=5.875; chair rail y 1.02..1.082 proud 34 mm; => back ${f((5.875 - wb.max[0]) * 1000, 0)} mm off the plaster)`)
  const vent = room.kit.find((k) => k.part === 'vent-grille')
  const vb = worldBounds(fixtures.buildVentGrille(), vent, [0, 0, 0])
  console.log(`  vent grille: x[${f(vb.min[0])},${f(vb.max[0])}] => back ${f((5.875 - vb.max[0]) * 1000, 0)} mm off the plaster`)
  for (const c of room.containers) {
    const g = kit.buildArchiveCabinet()
    const cb = worldBounds(g, c, [0, 0, 0])
    console.log(`  ${c.id}: x[${f(cb.min[0])},${f(cb.max[0])}] z[${f(cb.min[2])},${f(cb.max[2])}] => back ${f((5.875 - cb.max[0]) * 1000, 0)} mm off the east wall`)
  }
  for (const pl of room.kit.filter((k) => k.part === 'ceiling-spot')) {
    const cs = fixtures.buildCeilingSpot()
    const tb = worldBounds(cs.track, pl, [0, 0, 0])
    void tb
  }
  const cs = fixtures.buildCeilingSpot()
  console.log(`  ceiling-spot: track ${tri(cs.track)} tris ${show(bounds(cs.track))} | head ${tri(cs.head)} tris ${show(bounds(cs.head))} (placed at y=4.2, ceiling underside 4.2)`)
  const runPl = room.kit.find((k) => k.part === 'history-case-run')
  const rb = worldBounds(run.carcass, runPl, [0, 0, 0])
  console.log(`  case run carcass: room-local z[${f(rb.min[2])},${f(rb.max[2])}] y max ${f(rb.max[1])} (south wall face z=7.875; picture rail 2.62..2.662)`)
}

section('WALL ART vs shell trim (flush prints sit 3 mm off the plaster; dado is 14 mm proud to y=1.02, chair rail to 1.082 (34 mm), picture rail y 2.62..2.662 (28 mm))')
for (const room of MUSEUM.rooms.filter((r) => r.id !== 'office')) {
  const hw = room.shell.width / 2 - 0.125, hd = room.shell.depth / 2 - 0.125
  for (const art of room.wallArt ?? []) {
    const [x, y, z] = art.position
    const off = Math.min(Math.abs(Math.abs(x) - hw), Math.abs(Math.abs(z) - hd))
    const onWall = off < 0.3
    const framed = art.presentation !== 'flush'
    const border = art.presentation === 'thin-framed' ? 0.042 : framed ? 0.09 : 0
    const y0 = y - art.height / 2 - border, y1 = y + art.height / 2 + border
    const printOff = off + (framed ? 0.027 : 0.003)
    const notes = []
    if (onWall) {
      if (y0 < 1.02 && off < 0.014) notes.push(`lower ${f((1.02 - y0) * 1000, 0)} mm hidden behind the dado`)
      if (y0 < 1.082 && y1 > 1.02 && off < 0.034) notes.push('crossed by the chair rail')
      if (y0 < 2.662 && y1 > 2.62 && room.shell.height > 3.12 && off < 0.028) notes.push('CROSSED BY THE PICTURE RAIL (rail is in front of the print)')
      if (off > 0.05) notes.push(`stands ${f(off * 1000, 0)} mm off the plaster`)
    } else notes.push('mounted on furniture')
    console.log(`  ${room.id}/${art.id} (${art.presentation ?? 'framed'}): y[${f(y0, 2)},${f(y1, 2)}], back ${f(off * 1000, 0)} mm from the wall face, print at ${f(printOff * 1000, 0)} mm; ${notes.join('; ') || 'clear'}`)
  }
}
