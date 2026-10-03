import { pathToFileURL } from 'node:url'
const repo = 'C:/Users/rzbui/OneDrive/Documentos/Portfolio/Volleyball Museum'
const u = (p) => pathToFileURL(repo + p).href
const { BAKED_BUNDLES } = await import(u('/src/content/bake.generated.ts'))
const { MUSEUM } = await import(u('/src/content/museum.ts'))
const kit = BAKED_BUNDLES.find((b) => b.name === 'kit')
const used = new Set()
for (const r of MUSEUM.rooms) {
  for (const k of r.kit) used.add(k.part)
  for (const c of r.containers ?? []) used.add(c.part)
  for (const d of r.devices ?? []) used.add(d.part)
  if (r.powerControl) used.add(r.powerControl.part)
}
;['door-leaf','door-leaf-right','threshold','wayfinding-plaque-navy','wayfinding-plaque-green','wayfinding-plaque-walnut','dedication-plaque'].forEach((p) => used.add(p))
const roots = new Map()
for (const p of kit.parts) { const root = p.name.split('__')[0]; roots.set(root, (roots.get(root) ?? 0) + p.triangles) }
let waste = 0
for (const [root, tris] of roots) if (!used.has(root)) { console.log('UNUSED', root.padEnd(28), tris); waste += tris }
console.log('unused triangles', waste, 'of', [...roots.values()].reduce((a,b)=>a+b,0))
// counts of atrium placements
const atrium = MUSEUM.rooms.find((r) => r.id === 'atrium')
const counts = {}
for (const k of atrium.kit) counts[k.part] = (counts[k.part] ?? 0) + 1
console.log(counts)
