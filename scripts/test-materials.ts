/**
 * Headless proof that the office's fabrics and leathers are the colour they
 * claim to be, and that the runtime builds what each spec asks for.
 *
 *   npm run test:materials
 *
 * A tint only scales channels. On the tan leather maps the "green" leather
 * averaged sRGB (81, 80, 37), olive by daylight and brown under the tungsten
 * desk lamp, and every log said leather-green. So this decodes the baked
 * albedo maps the browser downloads, multiplies their mean by each key's
 * tint, and checks the hue both as authored and under the office's own lamp.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { MeshPhysicalMaterial, MeshStandardMaterial, Texture } from 'three'

import { BAKE_TOTALS, BAKED_MATERIALS, type BakedMaterial } from '../src/content/bake.generated.ts'
import { MUSEUM } from '../src/content/museum.ts'
import { FLASHLIGHT } from '../src/engine/flashlightRig.ts'
import { createLibraryMaterial, needsPhysicalMaterial } from '../src/engine/materialSpec.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TEXTURE_VRAM_BUDGET = 45 * 1024 * 1024

let passed = 0
async function test(name: string, run: () => void | Promise<void>) {
  await run()
  passed += 1
  console.log(`  pass  ${name}`)
}

const materials = BAKED_MATERIALS as unknown as Record<string, BakedMaterial>
const spec = (key: string) => {
  const entry = materials[key]
  assert.ok(entry, `material "${key}" is baked`)
  return entry
}

const toLinear = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)

/** Mean linear RGB of a baked albedo map, decoded exactly as the GPU will. */
const meanCache = new Map<string, Promise<[number, number, number]>>()
function meanAlbedo(url: string) {
  let pending = meanCache.get(url)
  if (!pending) {
    pending = (async () => {
      const { data, info } = await sharp(readFileSync(resolve(ROOT, 'public', url.replace(/^\//, ''))))
        .raw()
        .toBuffer({ resolveWithObject: true })
      const sum = [0, 0, 0]
      const pixels = info.width * info.height
      for (let index = 0; index < pixels; index += 1) {
        for (let channel = 0; channel < 3; channel += 1) {
          sum[channel] += toLinear(data[index * info.channels + channel] / 255)
        }
      }
      return sum.map((value) => value / pixels) as [number, number, number]
    })()
    meanCache.set(url, pending)
  }
  return pending
}

/** The mean colour a key renders at under white light: albedo times tint. */
async function runtimeColour(key: string) {
  const entry = spec(key)
  assert.ok(entry.textures, `"${key}" is textured`)
  const mean = await meanAlbedo(entry.textures.albedo)
  return mean.map((value, channel) => value * entry.baseColor[channel]) as [number, number, number]
}

const hexToLinear = (hex: string) =>
  [1, 3, 5].map((offset) => toLinear(Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)) as [
    number,
    number,
    number,
  ]

const office = MUSEUM.rooms.find((room) => room.id === 'office')
assert.ok(office?.powerControl?.light, 'the office lamp declares its light')
const LAMP = hexToLinear(office.powerControl.light.color)
const TORCH = hexToLinear(FLASHLIGHT.color)

console.log('Materials:')

await test('texture VRAM stays inside the 45 MiB mobile ceiling', () => {
  assert.ok(
    BAKE_TOTALS.textureVramBytes <= TEXTURE_VRAM_BUDGET,
    `${(BAKE_TOTALS.textureVramBytes / 1024 / 1024).toFixed(3)} MiB`,
  )
})

await test('the office recipes are neutral grey, so their tints alone choose the hue', async () => {
  for (const recipe of ['leather-upholstery', 'upholstery-velvet', 'paper']) {
    const url = Object.values(materials)
      .map((entry) => entry.textures?.albedo)
      .find((candidate) => candidate?.includes(`/${recipe}-albedo.`))
    assert.ok(url, `a material uses the ${recipe} maps`)
    const [r, g, b] = await meanAlbedo(url)
    const mean = (r + g + b) / 3
    for (const channel of [r, g, b]) {
      assert.ok(Math.abs(channel - mean) / mean < 0.02, `${recipe} mean ${[r, g, b].map((v) => v.toFixed(3))}`)
    }
  }
})

await test('bottle green is green under the tungsten desk lamp and under the cool torch', async () => {
  for (const key of ['leather-green', 'leather-desk', 'velvet-green', 'book-green']) {
    const [r, g, b] = await runtimeColour(key)
    assert.ok(g > r * 2.5 && g > b * 1.4, `${key} renders ${[r, g, b].map((v) => v.toFixed(4))}`)
    // Under the lamp the red channel is boosted against green roughly 2:1;
    // the old olive came out at G/R 0.48 there, that is, brown.
    const lit = [r * LAMP[0], g * LAMP[1], b * LAMP[2]]
    assert.ok(lit[1] / lit[0] > 1.3, `${key} under the lamp: G/R ${(lit[1] / lit[0]).toFixed(2)}`)
    // The opening is played by torchlight, a cool LED: too much blue in the
    // green and every chair in its beam turned teal.
    const torch = [r * TORCH[0], g * TORCH[1], b * TORCH[2]]
    assert.ok(torch[2] / torch[1] < 0.55, `${key} under the torch: B/G ${(torch[2] / torch[1]).toFixed(2)}`)
    // Bottle green is a dark colour: never the brightness of a billiard cloth.
    assert.ok(g < 0.12, `${key} is dark enough (G ${g.toFixed(3)})`)
  }
})

await test('the rug is burgundy and ivory, the hat brown felt, the paper cream', async () => {
  const [rugR, rugG, rugB] = await runtimeColour('rug-burgundy')
  assert.ok(rugR > rugG * 4 && rugB >= rugG, 'burgundy leans red-violet, not orange')
  const [ivoryR, ivoryG, ivoryB] = await runtimeColour('rug-ivory')
  assert.ok(ivoryR > ivoryG && ivoryG > ivoryB && ivoryB > 0.15, 'ivory is a light warm neutral')
  const [hatR, hatG, hatB] = await runtimeColour('felt-brown')
  assert.ok(hatR > hatG && hatG > hatB && hatR < 0.1, 'the felt is a dark brown')
  const [paperR, paperG, paperB] = await runtimeColour('paper-writing')
  assert.ok(paperR > 0.5 && paperR >= paperG && paperG > paperB, 'writing paper is cream')
})

/** CIE L*a*b* (D65) of a linear sRGB colour, for "do these two read apart". */
function lab([r, g, b]: readonly number[]) {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.9505
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.089
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}
const luminance = ([r, g, b]: readonly number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b

await test('the shelf bindings read apart under white light, the lamp and the torch', async () => {
  // Brown, calf, green and the crimson cloth: four families a shelf in the
  // dark has to tell apart. A colour difference (CIE76) of 15 is plain to
  // anyone; the closest pair, calf and cloth under the tungsten lamp, is 18.
  const keys = ['book-brown', 'book-calf', 'book-green', 'book-cloth']
  const colours = await Promise.all(keys.map(runtimeColour))
  for (const [name, light] of [['white', [1, 1, 1]], ['lamp', LAMP], ['torch', TORCH]] as const) {
    for (let a = 0; a < keys.length; a += 1) {
      for (let b = a + 1; b < keys.length; b += 1) {
        const first = lab(colours[a].map((value, channel) => value * light[channel]))
        const second = lab(colours[b].map((value, channel) => value * light[channel]))
        const difference = Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2])
        assert.ok(difference >= 15, `${keys[a]} / ${keys[b]} under the ${name}: ΔE ${difference.toFixed(1)}`)
      }
    }
  }
  // Value carries a shelf at 4.5 m, where hue fades: the light calf stands
  // at least twice as bright as every dark binding.
  const [brown, calf, green, cloth] = colours
  for (const dark of [brown, green, cloth]) assert.ok(luminance(calf) >= 2 * luminance(dark), 'calf reads light')
  assert.ok(brown[0] > brown[1] && brown[1] > brown[2] && luminance(brown) < 0.1, 'a dark brown morocco')
  assert.ok(cloth[0] > cloth[1] * 5 && cloth[0] > cloth[2] * 5, 'a crimson cloth')
  // The page heads are dusty paper: warm, greyer than any binding, lighter
  // than all the dark ones (they mark the tops of the dark rows).
  const pages = await runtimeColour('book-pages')
  const [pageR, pageG, pageB] = pages
  const saturation = (colour: readonly number[]) => 1 - Math.min(...colour) / Math.max(...colour)
  assert.ok(pageR > pageG && pageG > pageB, 'page heads are warm')
  for (const binding of colours) assert.ok(saturation(pages) < saturation(binding), 'page heads are greyer than the bindings')
  for (const dark of [brown, green, cloth]) assert.ok(luminance(pages) > 1.5 * luminance(dark), 'page heads read over a dark row')
  // The archive boxes went mint under the cool torch as green enamel.
  const [boxR, boxG, boxB] = await runtimeColour('archive-buckram')
  assert.ok(boxG > boxR && (boxB * TORCH[2]) / (boxG * TORCH[1]) < 0.55, 'the boxes stay green in the torch')
})

await test('a tint on a neutral recipe never exceeds one', () => {
  for (const [key, entry] of Object.entries(materials)) {
    if (!entry.textures || !/(leather-upholstery|upholstery-velvet|paper)-albedo/.test(entry.textures.albedo)) continue
    assert.ok(entry.baseColor.slice(0, 3).every((value) => value <= 1), `${key} tint ${entry.baseColor}`)
  }
})

await test('every sheen key is textured without a clearcoat: one program for all of them', () => {
  const sheened = Object.entries(materials).filter(([, entry]) => (entry.sheen ?? 0) > 0)
  assert.ok(sheened.length >= 4, `sheen on ${sheened.map(([key]) => key).join(', ')}`)
  const signatures = new Set(
    sheened.map(([, entry]) => `${Boolean(entry.textures)}:${entry.clearcoat ?? 0}:${entry.alphaMode ?? ''}`),
  )
  assert.deepEqual([...signatures], ['true:0:'], 'one feature combination')
})

await test('the runtime builds sheen, normal and roughness scales from the spec', () => {
  const albedo = new Texture()
  const normal = new Texture()
  const orm = new Texture()

  const velvet = createLibraryMaterial('velvet-green', spec('velvet-green'), { albedo, normal, orm })
  assert.ok(velvet instanceof MeshPhysicalMaterial, 'sheen needs the physical material')
  assert.equal(velvet.sheen, spec('velvet-green').sheen)
  assert.ok(Math.abs(velvet.sheenRoughness - (spec('velvet-green').sheenRoughness ?? 0)) < 1e-9)
  const sheenColour = spec('velvet-green').sheenColor
  assert.ok(sheenColour)
  // Set in linear: three keeps colours linear internally.
  assert.ok(Math.abs(velvet.sheenColor.g - sheenColour[1]) < 1e-6, 'sheen colour is linear')
  assert.equal(velvet.clearcoat, 0)
  assert.equal(velvet.map, albedo)

  const desk = createLibraryMaterial('leather-desk', spec('leather-desk'), { albedo, normal, orm })
  assert.ok(desk instanceof MeshPhysicalMaterial)
  assert.equal(desk.normalScale.x, spec('leather-desk').normalScale)
  assert.equal(desk.normalScale.y, spec('leather-desk').normalScale)
  assert.equal(desk.roughness, spec('leather-desk').roughnessScale, 'the ORM roughness is scaled')
  assert.equal(desk.sheen, 0, 'no sheen lobe on leather')

  const plain = createLibraryMaterial('leather-worn', spec('leather-worn'), { albedo, normal, orm })
  assert.ok(!(plain instanceof MeshPhysicalMaterial) && plain instanceof MeshStandardMaterial)
  assert.equal(plain.roughness, 1, 'unscaled ORM roughness multiplies one')
  assert.equal(plain.normalScale.x, 1)

  const bakelite = createLibraryMaterial('bakelite-black', spec('bakelite-black'))
  assert.ok(bakelite instanceof MeshPhysicalMaterial && bakelite.clearcoat > 0.5)
  assert.equal(bakelite.roughness, spec('bakelite-black').roughness, 'untextured keeps its own roughness')

  assert.equal(needsPhysicalMaterial(spec('plastic-black')), false)
  assert.equal(needsPhysicalMaterial(spec('rug-burgundy')), true)
})

console.log(`${passed} material checks passed`)
