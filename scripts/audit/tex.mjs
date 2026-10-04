/**
 * Measures the colour every material key really renders at: it decodes the
 * shipped albedo and ORM maps and multiplies their mean linear albedo by the
 * runtime factor, next to the colour the key declares.
 *
 * A tint only scales channels, so a key's name says nothing about what it
 * looks like on a map with a hue of its own (AS-S4): the table is how the
 * plan knows which woods, leathers and brasses are off their palette, and
 * which keys no baked part uses. Read-only.
 *
 *   npm run audit:tex
 */

import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import sharp from 'sharp'

import { load, REPO } from './lib/repo.mjs'

const { BAKED_MATERIALS, BAKED_BUNDLES } = await load('src/content/bake.generated.ts')
const { MATERIALS } = await load('scripts/bake/lib/glb.mjs')

const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const toSrgb = (v) => Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055))

const cache = new Map()
async function stats(url) {
  if (cache.has(url)) return cache.get(url)
  const file = resolve(REPO, 'public', url.replace(/^\//, ''))
  const { data, info } = await sharp(readFileSync(file)).raw().toBuffer({ resolveWithObject: true })
  const n = info.width * info.height
  const sum = [0, 0, 0]
  const sumSq = [0, 0, 0]
  const raw = [0, 0, 0]
  for (let i = 0; i < n; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      const v = data[i * info.channels + c] / 255
      const lin = toLinear(v)
      sum[c] += lin
      sumSq[c] += lin * lin
      raw[c] += v
    }
  }
  const mean = sum.map((v) => v / n)
  const sd = sumSq.map((v, c) => Math.sqrt(Math.max(0, v / n - mean[c] ** 2)))
  const out = { mean, sd, rawMean: raw.map((v) => v / n), width: info.width, bytes: statSync(file).size }
  cache.set(url, out)
  return out
}

const used = new Map()
for (const bundle of BAKED_BUNDLES) for (const part of bundle.parts) {
  const e = used.get(part.material) ?? { nodes: 0, tris: 0, bundles: new Set() }
  e.nodes += 1; e.tris += part.triangles; e.bundles.add(bundle.name.replace('exhibits-', 'ex-').replace('room-', 'r-'))
  used.set(part.material, e)
}

console.log('## texture sets (mean linear albedo, sRGB of mean, linear sd, mean ORM)')
const sets = new Map()
for (const m of Object.values(BAKED_MATERIALS)) if (m.textures) sets.set(m.textures.albedo, m.textures)
for (const [albedoUrl, t] of sets) {
  const a = await stats(albedoUrl)
  const o = await stats(t.orm)
  const nrm = await stats(t.normal)
  const id = albedoUrl.split('/').pop().replace(/-albedo.*/, '')
  console.log(
    `${id.padEnd(20)} albedo ${a.width}px lin [${a.mean.map((v) => v.toFixed(3)).join(', ')}] sRGB(${a.mean.map(toSrgb).join(',')}) sd [${a.sd.map((v) => v.toFixed(3)).join(', ')}]` +
      ` | orm ${o.width}px AO ${o.rawMean[0].toFixed(2)} rough ${o.rawMean[1].toFixed(2)} | normal ${nrm.width}px | wire ${Math.round((a.bytes + o.bytes + nrm.bytes) / 1024)} KB`,
  )
}

console.log('\n## material keys: effective colour (linear, sRGB) vs declared baseColor, luminance, usage')
for (const [key, m] of Object.entries(BAKED_MATERIALS)) {
  const declared = MATERIALS[key].baseColor
  let eff
  if (m.textures) {
    const a = await stats(m.textures.albedo)
    eff = a.mean.map((v, c) => v * m.baseColor[c])
  } else eff = m.baseColor.slice(0, 3)
  const lum = 0.2126 * eff[0] + 0.7152 * eff[1] + 0.0722 * eff[2]
  const dl = 0.2126 * declared[0] + 0.7152 * declared[1] + 0.0722 * declared[2]
  const u = used.get(key)
  const tex = m.textures ? m.textures.albedo.split('/').pop().replace(/-albedo.*/, '') : '(plain)'
  console.log(
    `${key.padEnd(18)} ${tex.padEnd(19)} eff [${eff.map((v) => v.toFixed(3)).join(', ')}] sRGB(${eff.map(toSrgb).join(',')}) Y ${lum.toFixed(3)}` +
      ` | declared sRGB(${declared.slice(0, 3).map(toSrgb).join(',')}) Y ${dl.toFixed(3)} ratio ${(lum / dl).toFixed(2)}` +
      ` | R:G:B ${(eff[0] / eff[1]).toFixed(2)}:1:${(eff[2] / eff[1]).toFixed(2)} vs ${(declared[0] / declared[1]).toFixed(2)}:1:${(declared[2] / declared[1]).toFixed(2)}` +
      ` | ${u ? `${u.nodes} nodes ${u.tris} tris ${[...u.bundles].join('/')}` : 'UNUSED by any baked part'}`,
  )
}
