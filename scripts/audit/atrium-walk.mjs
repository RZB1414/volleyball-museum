/**
 * Walks the real player capsule (`movePlayer`) along 25 routes of the atrium
 * and reports where it arrives, where it stops and how low it sinks.
 *
 * The same collision code and the same world as the game and as the gate,
 * with no browser. It is how the audit proved the capsule ended up inside
 * the breaker panel (ÁT-A1) and walks through the queue ropes (ÁT-H1). The
 * first of those was closed in L1: the breaker is solid now, and the first
 * route shows the capsule stopping short of it. Read-only.
 *
 * The world is `buildMuseumWorld`, the one `test:navigation` and
 * `test:power` walk: shells, kit, containers and the power controls. This
 * script used to build its own, which is how it went on reporting a breaker
 * the capsule could walk into after the game had made it solid.
 *
 *   npm run audit:walk
 */

import { load } from './lib/repo.mjs'

const { Vector3 } = await import('three')
const { movePlayer } = await load('src/engine/collision.ts')
const { buildMuseumWorld, CAPSULE } = await load('scripts/lib/museumWorld.ts')

const world = buildMuseumWorld()
const STEP = 1 / 60
function walk(points, speed = 3.4, limit = 40) {
  const pos = new Vector3(points[0][0], 0, points[0][1])
  let vv = 0, elapsed = 0, t = 1, lowest = 0
  const trace = []
  while (t < points.length && elapsed < limit) {
    const goal = points[t]
    const d = new Vector3(goal[0] - pos.x, 0, goal[1] - pos.z)
    if (d.length() < 0.12) { t += 1; continue }
    d.normalize().multiplyScalar(speed * STEP)
    const r = movePlayer(world, pos, d, vv, STEP, CAPSULE)
    pos.copy(r.position); vv = r.verticalVelocity
    lowest = Math.min(lowest, pos.y)
    elapsed += STEP
    if (Math.round(elapsed / STEP) % 30 === 0) trace.push([pos.x.toFixed(2), pos.z.toFixed(2)].join(','))
  }
  return { arrived: t >= points.length, pos: [pos.x.toFixed(3), pos.y.toFixed(3), pos.z.toFixed(3)].join(', '), elapsed: elapsed.toFixed(1), lowest: lowest.toFixed(3), trace: trace.slice(-6).join(' | ') }
}
const cases = {
  'push into breaker wall (from 1m)': [[-7.55, -4.4], [-9.5, -4.4]],
  'push into west wall plain plaster north of bays? z=-8.6': [[-7.5, -8.4], [-9.5, -8.4]],
  'push into north wall bay x=5': [[5, -7.5], [5, -9.5]],
  'office door straight to breaker (dumb line)': [[8.3, 3], [-8.3, -4.4]],
  'office door -> around ring north -> breaker': [[8.3, 3], [2.4, -2.6], [-2.4, -3.2], [-8.0, -4.4]],
  'walk through rope queue (4.9 row)': [[-3.7, 3.9], [-3.7, 6.0]],
  'walk through stanchion post at (-4.55,4.9)': [[-4.55, 3.9], [-4.55, 5.6]],
  'ring: try to step over barrier toward podium from east': [[3.0, 0], [0.8, 0]],
  'ring: diagonal gap attempt NE': [[2.2, -2.2], [0.5, -0.5]],
  'between console east end and wall? stand at (0.9,-8.28)': [[1.5, -7.2], [0.9, -8.28]],
  'console front approach to laced ball': [[-2.4, -6.5], [-2.4, -8.2]],
  'gap divider1(-1.95,-6.25) to console': [[-4.5, -7.2], [0.5, -7.2]],
  'lounge: walk into the set centre from south': [[4.1, -3.9], [4.1, -6.15]],
  'lounge: between lounge set and sofa': [[1.8, -7.3], [7.2, -7.3]],
  'tower: pass between tower and east wall': [[8.3, -3.5], [8.3, -7.5]],
  'tower: pass between tower and divider3': [[7.3, -2.6], [7.3, -4.9]],
  'reception: public right end into aisle': [[-0.2, 6.0], [-0.2, 7.9], [-3.5, 7.9]],
  'reception: west end into aisle (x=-7.6)': [[-7.6, 5.0], [-7.8, 7.6], [-4.0, 7.9]],
  'donation box gap to desk end': [[0.0, 5.5], [0.0, 8.4]],
  'lectern: between lectern and west wall': [[-8.2, 0.6], [-8.2, 3.8]],
  'shortcut door approach from atrium': [[-6.5, 6.4], [-8.5, 6.4]],
  'holyoke door push (closed gate?)': [[-7.5, -2], [-9.6, -2]],
  'office door push from atrium': [[7.5, 3], [9.6, 3]],
  'SE corner pocket (behind donation box)': [[2.5, 6.5], [8.2, 8.2]],
  'NW corner': [[-6, -6], [-8.3, -8.3]],
}
for (const [name, pts] of Object.entries(cases)) {
  const r = walk(pts)
  console.log(`${r.arrived ? 'ARRIVED' : 'STOPPED'}  ${name}\n    end ${r.pos}  t=${r.elapsed}s lowest=${r.lowest}\n    trace ${r.trace}`)
}
