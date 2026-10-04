/**
 * Measures the gaps between the atrium's colliders, and from each to the
 * wainscot, against the 0.60 m the capsule needs.
 *
 * A gap that looks open and does not let the player through is the worst
 * kind of invisible wall. The script lists every pair closer than 1.2 m, so
 * a new floor plan (plan 4.7b) can be checked before anything is baked.
 * Read-only.
 *
 *   npm run audit:atrium-gaps
 */

import { load } from './lib/repo.mjs'

const { BAKED_BUNDLES } = await load('src/content/bake.generated.ts')
const { MUSEUM } = await load('src/content/museum.ts')
const kit = BAKED_BUNDLES.find((b) => b.name === 'kit')
const atrium = MUSEUM.rooms.find((r) => r.id === 'atrium')
const obbs = []
atrium.kit.forEach((pl, i) => {
  for (const part of kit.parts.filter((p) => p.collider && (p.name === pl.part || p.name.startsWith(pl.part + '__')))) {
    const s = pl.scale ?? 1, r = pl.rotationY ?? 0, c = Math.cos(r), sn = Math.sin(r)
    const [cx, cy, cz] = part.collider.centre, [hx, hy, hz] = part.collider.halfExtents
    const wx = pl.position[0] + (cx * c + cz * sn) * s, wz = pl.position[2] + (-cx * sn + cz * c) * s
    const corners = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b]) => [wx + (a*hx*c + b*hz*sn)*s, wz + (-a*hx*sn + b*hz*c)*s])
    obbs.push({ id: `${i}:${part.name}`, corners, top: pl.position[1] + (cy + hy) * s, bottom: pl.position[1] + (cy - hy) * s })
  }
})
const segDist = (p, a, b) => { const abx=b[0]-a[0], abz=b[1]-a[1]; const t=Math.max(0,Math.min(1,((p[0]-a[0])*abx+(p[1]-a[1])*abz)/(abx*abx+abz*abz))); return Math.hypot(p[0]-a[0]-t*abx, p[1]-a[1]-t*abz) }
const polyDist = (A, B) => { let d = Infinity; for (let i=0;i<4;i++) for (let j=0;j<4;j++){ d=Math.min(d, segDist(A[i],B[j],B[(j+1)%4]), segDist(B[j],A[i],A[(i+1)%4])) } return d }
console.log('colliders:', obbs.length)
for (const o of obbs) console.log(o.id.padEnd(42), 'x', Math.min(...o.corners.map(c=>c[0])).toFixed(2), Math.max(...o.corners.map(c=>c[0])).toFixed(2), ' z', Math.min(...o.corners.map(c=>c[1])).toFixed(2), Math.max(...o.corners.map(c=>c[1])).toFixed(2), ' y', o.bottom.toFixed(2), o.top.toFixed(2))
console.log('\npairwise gaps < 1.2 m (capsule needs 0.60):')
for (let i=0;i<obbs.length;i++) for (let j=i+1;j<obbs.length;j++){
  if (obbs[i].id.includes('barrier') && obbs[j].id.includes('barrier')) continue
  const d = polyDist(obbs[i].corners, obbs[j].corners)
  if (d < 1.2) console.log(`  ${d.toFixed(2)} m  ${obbs[i].id} <-> ${obbs[j].id}`)
}
const W = 8.839
console.log('\ngaps to wainscot face (±8.839) < 1.2 m:')
for (const o of obbs){
  const xs=o.corners.map(c=>c[0]), zs=o.corners.map(c=>c[1])
  const g = { west: Math.min(...xs)+W, east: W-Math.max(...xs), north: Math.min(...zs)+W, south: W-Math.max(...zs) }
  for (const [k,v] of Object.entries(g)) if (v < 1.2 && v > 0.02) console.log(`  ${v.toFixed(2)} m  ${o.id} -> ${k} wall`)
}
