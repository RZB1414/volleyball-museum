/**
 * Measures the baked bounds and colliders of the atrium's shell, its exhibits
 * and the wall-mounted kit recipes (plaques, door leaves, thresholds).
 *
 * The reference for "how far from the wall is this": the atrium audit used it
 * to show the breaker panel and the wall art standing clear of the plaster
 * (ÁT-A2). Read-only.
 *
 *   npm run audit:atrium-shell
 */

import { load } from './lib/repo.mjs'

const { BAKED_BUNDLES } = await load('src/content/bake.generated.ts')
const fmt = (a) => a.map((n) => n.toFixed(3)).join(', ')
for (const name of ['room-atrium', 'exhibits-atrium']) {
  const b = BAKED_BUNDLES.find((x) => x.name === name)
  console.log('\n' + name, Object.keys(b))
  for (const q of b.parts) {
    const bb = q.bounds ? ` bounds min[${fmt(q.bounds.min)}] max[${fmt(q.bounds.max)}]` : ''
    const c = q.collider ? ` COLLIDER ${JSON.stringify(q.collider)}` : ''
    console.log(`  ${q.name} mat=${q.material} tris=${q.triangles}${bb}${c}`)
  }
}
const kit = BAKED_BUNDLES.find((b) => b.name === 'kit')
for (const n of ['wayfinding-plaque-navy','wayfinding-plaque-green','wayfinding-plaque-walnut','dedication-plaque','door-leaf','threshold','medallion-socket','plinth-block','label-angled','label-plaque']) {
  for (const q of kit.parts.filter((x) => x.name === n || x.name.startsWith(n + '__'))) {
    const bb = q.bounds ? ` bounds min[${fmt(q.bounds.min)}] max[${fmt(q.bounds.max)}]` : ''
    const c = q.collider ? ` COLLIDER ${JSON.stringify(q.collider)}` : ''
    console.log(`  ${q.name} mat=${q.material} tris=${q.triangles}${bb}${c}`)
  }
}
