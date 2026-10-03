import { pathToFileURL } from 'node:url'
const repo = 'C:/Users/rzbui/OneDrive/Documentos/Portfolio/Volleyball Museum'
const { BAKED_BUNDLES } = await import(pathToFileURL(repo + '/src/content/bake.generated.ts').href)
const { MUSEUM } = await import(pathToFileURL(repo + '/src/content/museum.ts').href)
const kit = BAKED_BUNDLES.find((b) => b.name === 'kit')
const atrium = MUSEUM.rooms.find((r) => r.id === 'atrium')
const seen = new Set()
const fmt = (a) => a.map((n) => n.toFixed(3)).join(', ')
for (const p of [...atrium.kit, atrium.powerControl]) {
  if (seen.has(p.part)) continue
  seen.add(p.part)
  const parts = kit.parts.filter((q) => q.name === p.part || q.name.startsWith(p.part + '__'))
  console.log('\n' + p.part)
  for (const q of parts) {
    const b = q.bounds ? ` bounds min[${fmt(q.bounds.min)}] max[${fmt(q.bounds.max)}]` : ''
    const c = q.collider ? ` COLLIDER centre[${fmt(q.collider.centre)}] half[${fmt(q.collider.halfExtents)}]` : ''
    console.log(`  ${q.name} mat=${q.material} tris=${q.triangles}${b}${c}`)
  }
}
console.log('\nkeys of a part:', Object.keys(kit.parts[0]))
for (const b of BAKED_BUNDLES) console.log(b.name, b.url, b.parts.length)
