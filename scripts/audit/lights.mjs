import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
const REPO = 'C:/Users/rzbui/OneDrive/Documentos/Portfolio/Volleyball Museum'
const load = (rel) => import(pathToFileURL(resolve(REPO, rel)).href)
const { MUSEUM } = await load('src/content/museum.ts')
const { buildGalleryLightRig } = await load('src/engine/galleryLightRig.ts')
for (const room of MUSEUM.rooms) {
  const slots = buildGalleryLightRig(room)
  const fixtures = room.kit.filter((k) => k.part === 'ceiling-spot' || k.part === 'atrium-pin-pendant')
  console.log(`\n${room.id}: ${fixtures.length} visible fixtures (${fixtures.filter((k) => k.part === 'ceiling-spot' || k.lightTarget).length} able to emit)`)
  for (const s of slots) console.log(`  ${s.kind.padEnd(5)} pos [${s.position.map((v) => v.toFixed(2))}] -> target [${s.target.map((v) => v.toFixed(2))}] dist ${s.distance.toFixed(1)} angle ${s.angle}`)
  const used = new Set(slots.filter((s) => s.kind === 'key').map((s) => s.target.map((v) => v.toFixed(2)).join(',')))
  for (const k of fixtures) {
    if (!k.lightTarget && k.part !== 'ceiling-spot') { console.log(`  DARK fixture (no lightTarget): [${k.position}]`); continue }
    const t = (k.lightTarget ?? [0,0,0]).map((v, i) => (v + room.origin[i]).toFixed(2)).join(',')
    if (!used.has(t)) console.log(`  DROPPED by sampleEvenly: fixture at [${k.position}] aimed at [${k.lightTarget}]`)
  }
}
