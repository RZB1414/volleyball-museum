/**
 * Measures the wall media: pixel size, file size and resident texture memory
 * of every image, and how much of each the frame it hangs in really shows
 * (the `cover` crop) at how many pixels per metre.
 *
 * Media is outside the 45 MiB texture gate today (EN-A13), and a frame of
 * another aspect crops its picture without telling anyone (AS-H9): both
 * numbers come from here. Read-only.
 *
 *   npm run audit:media
 */

import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import sharp from 'sharp'

import { load, REPO } from './lib/repo.mjs'

const { MUSEUM } = await load('src/content/museum.ts')
const dir = resolve(REPO, 'public/textures/media')
let total = 0
const dims = new Map()
for (const name of readdirSync(dir)) {
  const file = resolve(dir, name)
  const meta = await sharp(file).metadata()
  const vram = meta.width * meta.height * 4 * (4 / 3)
  // three does not generate mips for non-power-of-two? WebGL2 does; count mips.
  total += name.endsWith('.svg') ? 0 : vram
  dims.set(name, meta)
  console.log(`${name.padEnd(52)} ${String(meta.width).padStart(5)}x${String(meta.height).padEnd(5)} ${String(statSync(file).size).padStart(7)} B  ${(vram / 1048576).toFixed(2)} MiB RGBA8+mips${name.endsWith('.svg') ? ' (SVG: rasterised by the browser at its intrinsic size)' : ''}`)
}
console.log(`media VRAM if every raster is resident: ${(total / 1048576).toFixed(2)} MiB (not counted by the 45 MiB gate)`)
const media = new Map(MUSEUM.media.map((m) => [m.id, m]))
for (const room of MUSEUM.rooms) for (const art of room.wallArt ?? []) {
  const m = media.get(art.mediaId)
  const frameAspect = art.width / art.height
  const repeatX = m.aspect > frameAspect ? frameAspect / m.aspect : 1
  const repeatY = m.aspect < frameAspect ? m.aspect / frameAspect : 1
  const file = m.src.split('/').pop()
  const d = dims.get(file)
  const pxPerM = d ? (d.width * repeatX) / art.width : 0
  console.log(`${room.id}/${art.id}: ${art.width}x${art.height} m, source aspect ${m.aspect} -> shows ${(repeatX * 100).toFixed(0)}% of the width and ${(repeatY * 100).toFixed(0)}% of the height; ${pxPerM.toFixed(0)} px/m`)
}
