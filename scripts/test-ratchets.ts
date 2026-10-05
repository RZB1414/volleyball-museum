/**
 * The ratchets: what was measured may come down and may not go up.
 *
 *   npm run test:ratchets
 *
 * Three kinds of number are held here (`scripts/lib/ratchets.ts` says why and
 * how to move one):
 *
 *   - what Node can measure itself: the size of the kit file, and the texture
 *     the three resident rooms keep on the GPU, recomputed from the files;
 *   - what only a browser can count (draw calls, triangles, shader programs):
 *     the gate checks the latest written record, that it is recent and within
 *     its ceilings;
 *   - the debts: a ceiling above the plan's budget has a dated line in
 *     `KNOWN_DEBT`, and a ceiling that came down to its budget has none.
 *
 * The bytes of the built site are the fourth ratchet and have a gate of
 * their own, because they need a build: `npm run test:bundle`.
 */

import assert from 'node:assert/strict'
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

import { BAKED_BUNDLES, BAKE_TOTALS } from '../src/content/bake.generated.ts'
import { CONTENT_LOT, debtOf, settleKnownDebt } from '../src/content/knownDebt.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { ValidationIssue } from '../src/content/validate.ts'
import {
  BROWSER_RECORD,
  mippedRgbaBytes,
  RATCHETS,
  TEXT_ATLAS_BYTES,
  type Ratchet,
} from './lib/ratchets.ts'
import { readText } from './lib/readText.ts'

let passed = 0
let failed = 0
async function test(name: string, run: () => void | Promise<void>) {
  try {
    await run()
  } catch (error) {
    failed += 1
    console.log(`  FAIL  ${name}`)
    console.log(String(error instanceof Error ? error.message : error).replace(/^/gm, '        '))
    return
  }
  passed += 1
  console.log(`  pass  ${name}`)
}

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url))

const show = (value: number, unit: Ratchet['unit']) =>
  unit === 'MiB'
    ? `${(value / 1024 / 1024).toFixed(2)} MiB`
    : unit === 'KiB'
      ? `${(value / 1024).toFixed(1)} KiB`
      : value.toLocaleString('en-US')

/** One line per ratchet, printed on every run: measured, ceiling, budget. */
function report(ratchet: Ratchet, measured: number) {
  const over = ratchet.ceiling > ratchet.budget ? '  (over budget: dated in KNOWN_DEBT)' : ''
  console.log(
    `  ${ratchet.id.padEnd(17)} measured ${show(measured, ratchet.unit).padStart(12)}   ` +
      `ceiling ${show(ratchet.ceiling, ratchet.unit).padStart(12)}   ` +
      `budget ${show(ratchet.budget, ratchet.unit).padStart(11)}${over}`,
  )
}

function within(ratchet: Ratchet, measured: number, what = ratchet.what) {
  assert.ok(
    measured <= ratchet.ceiling,
    `${what}: ${show(measured, ratchet.unit)} is over the ceiling of ${show(ratchet.ceiling, ratchet.unit)} ` +
      `(${ratchet.origin}). Bring it down, or raise the ceiling in scripts/lib/ratchets.ts in this commit and say why.`,
  )
}

// ---------------------------------------------------------------------------
// Measured here
// ---------------------------------------------------------------------------

const kit = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit')
assert.ok(kit, 'the baked kit bundle exists')

/** Width and height of a wall image, as the browser decodes it. */
async function imageSize(src: string): Promise<{ width: number; height: number }> {
  const path = `${PUBLIC}${src}`
  if (src.endsWith('.svg')) {
    // An SVG becomes a texture at the size its root element declares.
    const root = /<svg\b[^>]*>/.exec(readText(path))?.[0] ?? ''
    const attribute = (name: string) => Number(new RegExp(`\\b${name}="([\\d.]+)(?:px)?"`).exec(root)?.[1])
    const [, , boxWidth, boxHeight] = (/\bviewBox="([^"]+)"/.exec(root)?.[1] ?? '').split(/[\s,]+/).map(Number)
    const width = attribute('width') || boxWidth
    const height = attribute('height') || boxHeight
    assert.ok(width > 0 && height > 0, `${src} declares its size`)
    return { width, height }
  }
  const { width, height } = await sharp(path).metadata()
  assert.ok(width && height, `${src} can be read`)
  return { width, height }
}

const media = await Promise.all(
  MUSEUM.media.map(async (asset) => {
    const size = await imageSize(asset.src)
    return { id: asset.id, ...size, bytes: mippedRgbaBytes(size.width, size.height) }
  }),
)
const mediaBytes = media.reduce((sum, image) => sum + image.bytes, 0)
const residentTexture = BAKE_TOTALS.textureVramBytes + mediaBytes + TEXT_ATLAS_BYTES

const points = BROWSER_RECORD.points
const drawsOf = (ratchet: 'roomDraws' | 'atriumDraws' | 'pairDraws') =>
  Math.max(...points.filter((point) => point.ratchet === ratchet).map((point) => point.draws))

console.log('Ratchets:')
report(RATCHETS.kitGlb, kit.bytes)
report(RATCHETS.residentTexture, residentTexture)
report(RATCHETS.programs, BROWSER_RECORD.programs)
report(RATCHETS.roomDraws, drawsOf('roomDraws'))
report(RATCHETS.atriumDraws, drawsOf('atriumDraws'))
report(RATCHETS.pairDraws, drawsOf('pairDraws'))
report(RATCHETS.frameTriangles, Math.max(...points.map((point) => point.triangles)))
console.log(
  `  (texture: ${show(BAKE_TOTALS.textureVramBytes, 'MiB')} of materials, ${show(mediaBytes, 'MiB')} in ` +
    `${media.length} wall images, ${show(TEXT_ATLAS_BYTES, 'MiB')} of text; browser figures from the record of ` +
    `L${BROWSER_RECORD.lot}, ${BROWSER_RECORD.date})`,
)

// ---------------------------------------------------------------------------

await test('the kit file is no larger than the last lot left it', () => {
  within(RATCHETS.kitGlb, kit.bytes)
  // The manifest is what the gate reads; the file is what the player gets.
  assert.equal(statSync(`${PUBLIC}${kit.url}`).size, kit.bytes, `${kit.url} is the file the manifest describes`)
})

await test('the rooms keep no more texture on the GPU than the last lot left', () => {
  within(RATCHETS.residentTexture, residentTexture)
  // Every image the content names is counted: a new one cannot hide.
  assert.equal(media.length, MUSEUM.media.length)
  assert.ok(media.every((image) => image.bytes > 0))
})

await test('the browser record is recent, complete and within its ceilings', () => {
  assert.ok(
    BROWSER_RECORD.lot >= CONTENT_LOT - 1 && BROWSER_RECORD.lot <= CONTENT_LOT,
    `the reference points were last measured in L${BROWSER_RECORD.lot} and the content is at L${CONTENT_LOT}: ` +
      `measure again (docs/lotes/P0-linha-de-base.md, section 0) and replace BROWSER_RECORD`,
  )
  assert.deepEqual(
    points.map((point) => point.id),
    ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10'],
    'the ten reference points, in order',
  )
  for (const point of points) {
    assert.match(point.camera, /^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?){4}$/, `${point.id} records its camera`)
    within(RATCHETS[point.ratchet], point.draws, `${point.id} draw calls`)
    within(RATCHETS.frameTriangles, point.triangles, `${point.id} triangles`)
  }
  within(RATCHETS.programs, BROWSER_RECORD.programs)
})

await test('every ceiling above its budget is a dated debt, and no debt outlives its ceiling', () => {
  const accusations: ValidationIssue[] = Object.values(RATCHETS)
    .filter((ratchet: Ratchet) => ratchet.ceiling > ratchet.budget)
    .map((ratchet: Ratchet) => ({
      severity: 'error' as const,
      code: 'ratchet-over-budget',
      id: ratchet.id,
      message:
        `Ratchet "${ratchet.id}" is held at ${show(ratchet.ceiling, ratchet.unit)}, over the plan's ` +
        `${show(ratchet.budget, ratchet.unit)}, and no line of KNOWN_DEBT says which lot brings it down.`,
    }))
  const unsettled = settleKnownDebt(accusations, debtOf('test:ratchets'), CONTENT_LOT)
    .filter((issue) => issue.severity === 'error')
    .map((issue) => `[${issue.code}] ${issue.message}`)
  assert.deepEqual(unsettled, [])
  for (const ratchet of Object.values(RATCHETS) as Ratchet[]) {
    assert.ok(ratchet.origin.trim().length > 0, `${ratchet.id} says where its ceiling came from`)
    assert.ok(ratchet.budget > 0 && ratchet.ceiling > 0)
  }
})

console.log(`${passed}/${passed + failed} ratchet checks passed`)
if (failed > 0) process.exitCode = 1
