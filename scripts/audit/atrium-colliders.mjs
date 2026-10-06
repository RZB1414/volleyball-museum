/**
 * Measures the baked bounds and colliders of every kit recipe placed in the
 * atrium, family by family.
 *
 * The collision the player feels comes from the manifest, not from what is
 * drawn. Printing both side by side is how the atrium audit found colliders
 * smaller than their upholstery and furniture with none at all (ÁT-H2).
 * Read-only: it reads the baked manifest and the content, and writes nothing.
 *
 *   npm run audit:atrium-colliders
 */

import { load } from './lib/repo.mjs'

const { BAKED_BUNDLES } = await load('src/content/bake.generated.ts')
const { MUSEUM } = await load('src/content/museum.ts')
const kit = BAKED_BUNDLES.find((b) => b.name === 'kit')
const atrium = MUSEUM.rooms.find((r) => r.id === 'atrium')
const seen = new Set()
const fmt = (a) => a.map((n) => n.toFixed(3)).join(', ')
// By whichever list places it: the plinth and the lectern are devices since
// L3, and were missing from a report that read the kit alone.
for (const p of [...atrium.kit, ...(atrium.containers ?? []), ...(atrium.devices ?? []), ...(atrium.powerControl ? [atrium.powerControl] : [])]) {
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
