/**
 * Measures the baked manifest against the content's placements: triangles,
 * families, size and use of every recipe.
 *
 * One mode per question, as the first argument:
 *   recipes    every recipe, its families and the rooms that place it (default)
 *   totals     bytes, triangles and nodes per bundle
 *   materials  every material key as baked: maps, factors, finish
 *   rooms      what each room places, in batches and instanced triangles
 *
 * `recipes.txt`, next to this file, is the `recipes` output at the commit the
 * plan was written from (82756c4), kept as the figures its recipe tables
 * start from. Read-only.
 *
 *   npm run audit:inv
 *   npm run audit:inv -- totals
 */

import { load } from './lib/repo.mjs'

const { BAKED_BUNDLES, BAKED_MATERIALS, BAKE_TOTALS } = await load('src/content/bake.generated.ts')
const { MUSEUM } = await load('src/content/museum.ts')

const mode = process.argv[2] ?? 'recipes'

const recipeOf = (name) => name.split('__', 1)[0]

if (mode === 'totals') {
  console.log(JSON.stringify(BAKE_TOTALS))
  for (const bundle of BAKED_BUNDLES) {
    const tris = bundle.parts.reduce((t, p) => t + p.triangles, 0)
    console.log(`${bundle.name.padEnd(20)} ${String(bundle.bytes).padStart(9)} B  ${String(tris).padStart(7)} tris  ${bundle.parts.length} nodes  ${bundle.url}`)
  }
}

if (mode === 'recipes') {
  for (const bundle of BAKED_BUNDLES) {
    console.log(`\n## ${bundle.name}`)
    const byRecipe = new Map()
    for (const part of bundle.parts) {
      const key = recipeOf(part.name)
      if (!byRecipe.has(key)) byRecipe.set(key, [])
      byRecipe.get(key).push(part)
    }
    const rows = [...byRecipe.entries()].map(([recipe, parts]) => {
      const tris = parts.reduce((t, p) => t + p.triangles, 0)
      const min = [Infinity, Infinity, Infinity]
      const max = [-Infinity, -Infinity, -Infinity]
      for (const p of parts) for (let a = 0; a < 3; a += 1) {
        min[a] = Math.min(min[a], p.bounds.min[a]); max[a] = Math.max(max[a], p.bounds.max[a])
      }
      return { recipe, tris, parts, min, max }
    })
    for (const row of rows) {
      const usage = []
      for (const room of MUSEUM.rooms) {
        const n = room.kit.filter((k) => k.part === row.recipe).length
        const c = (room.containers ?? []).filter((k) => k.part === row.recipe).length
        const d = (room.devices ?? []).filter((k) => k.part === row.recipe).length
        const pc = room.powerControl?.part === row.recipe ? 1 : 0
        const ex = MUSEUM.exhibits.filter((e) => room.exhibitIds.includes(e.id) && e.recipe === row.recipe).length
        const total = n + c + d + pc + ex
        if (total) usage.push(`${room.id}:${n ? 'kit' + n : ''}${c ? ' cont' + c : ''}${d ? ' dev' + d : ''}${pc ? ' power' + pc : ''}${ex ? ' exh' + ex : ''}`)
      }
      console.log(
        `${row.recipe.padEnd(30)} ${String(row.tris).padStart(6)} tris  ${row.parts.length} fam  ` +
          `size ${row.max.map((v, i) => (v - row.min[i]).toFixed(3)).join('x')}  ` +
          `y[${row.min[1].toFixed(3)},${row.max[1].toFixed(3)}]  ` +
          `| ${usage.join('; ') || 'UNPLACED'}`,
      )
      for (const p of row.parts) {
        console.log(
          `    ${p.name.padEnd(40)} ${p.material.padEnd(18)} ${String(p.triangles).padStart(5)}  ` +
            `min ${p.bounds.min.map((v) => v.toFixed(3)).join(',')} max ${p.bounds.max.map((v) => v.toFixed(3)).join(',')}` +
            `${p.collider ? '  [collider]' : ''}`,
        )
      }
    }
  }
}

if (mode === 'materials') {
  for (const [key, m] of Object.entries(BAKED_MATERIALS)) {
    const tex = m.textures ? m.textures.albedo.split('/').pop().replace(/-albedo.*/, '') : '-'
    console.log(
      `${key.padEnd(20)} tex ${tex.padEnd(20)} factor [${m.baseColor.map((v) => v.toFixed(4)).join(', ')}] r ${m.roughness} m ${m.metalness}` +
        `${m.clearcoat ? ` cc ${m.clearcoat}/${m.clearcoatRoughness}` : ''}` +
        `${m.sheen ? ` sheen ${m.sheen}` : ''}${m.emissive ? ` emis ${m.emissive}x${m.emissiveIntensity}` : ''}` +
        `${m.alphaMode ? ` ${m.alphaMode}` : ''}${m.normalScale != null ? ` nS ${m.normalScale}` : ''}${m.roughnessScale != null ? ` rS ${m.roughnessScale}` : ''}`,
    )
  }
}

if (mode === 'rooms') {
  const kit = BAKED_BUNDLES.find((b) => b.name === 'kit')
  for (const room of MUSEUM.rooms) {
    const placed = room.kit.flatMap((k) => kit.parts.filter((p) => p.name === k.part || p.name.startsWith(`${k.part}__`)).map((p) => ({ k, p })))
    const unique = new Set(placed.map((x) => x.p.name))
    const tris = placed.reduce((t, x) => t + x.p.triangles, 0)
    const mats = new Map()
    for (const { p } of placed) mats.set(p.material, (mats.get(p.material) ?? 0) + 1)
    const uniqueByMat = new Map()
    for (const name of unique) {
      const p = kit.parts.find((q) => q.name === name)
      uniqueByMat.set(p.material, (uniqueByMat.get(p.material) ?? 0) + 1)
    }
    console.log(`\n## ${room.id}: ${room.kit.length} placements, naive nodes ${placed.length}, unique batches ${unique.size}, instantiated tris ${tris}`)
    console.log('  batches by material:', [...uniqueByMat.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m}=${n}`).join(' '))
    const perRecipe = new Map()
    for (const k of room.kit) perRecipe.set(k.part, (perRecipe.get(k.part) ?? 0) + 1)
    for (const [part, n] of perRecipe) {
      const fam = kit.parts.filter((p) => p.name === part || p.name.startsWith(`${part}__`))
      const t = fam.reduce((s, p) => s + p.triangles, 0)
      console.log(`  ${part.padEnd(30)} x${String(n).padStart(2)}  ${fam.length} fam  ${String(t).padStart(5)} tris each  ${String(t * n).padStart(6)} total`)
    }
    const shell = BAKED_BUNDLES.find((b) => b.name === `room-${room.id}`)
    console.log(`  shell: ${shell.parts.map((p) => `${p.name.split('__')[1]}(${p.material},${p.triangles})`).join(' ')}  = ${shell.parts.reduce((t, p) => t + p.triangles, 0)} tris, ${shell.bytes} B`)
    const exb = BAKED_BUNDLES.find((b) => b.name === `exhibits-${room.id}`)
    if (exb) console.log(`  exhibits: ${exb.parts.length} nodes ${exb.parts.reduce((t, p) => t + p.triangles, 0)} tris ${exb.bytes} B`)
    console.log(`  wallArt ${room.wallArt?.length ?? 0}, signage ${room.signage?.length ?? 0}, containers ${room.containers?.length ?? 0}, devices ${room.devices?.length ?? 0}, exhibits ${room.exhibitIds.length}`)
  }
}
