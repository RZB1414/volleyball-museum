/**
 * Texture contact sheet.
 *
 *   npm run contact-sheet
 *
 * The bake is authored by an agent that cannot see its own output, so the only
 * honest feedback loop is to render the result and look at it. This composites
 * every generated material into one image: albedo, normal and ORM side by side,
 * plus a 2x2 tile of the albedo so seams show up immediately.
 *
 * A seam in a tileable texture is invisible in the source image and glaring on
 * a museum floor. The tiled column is the whole point of this script.
 */

import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const TEXTURE_DIR = resolve(ROOT, 'public/textures/materials')
const OUT_DIR = resolve(ROOT, 'docs/contact-sheets')

const CELL = 256
const LABEL_HEIGHT = 26
const COLUMNS = ['albedo', 'normal', 'orm', 'tiled']

function labelSvg(text, width, height, size = 15) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return Buffer.from(
    `<svg width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#16181c"/>
      <text x="8" y="${height / 2 + size / 3}" font-family="monospace" font-size="${size}"
            fill="#c8ccd4">${escaped}</text>
    </svg>`,
  )
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const files = await readdir(TEXTURE_DIR)
  const byMaterial = new Map()

  for (const file of files) {
    const match = file.match(/^(.+)-(albedo|normal|orm)\.[0-9a-f]{8}\.webp$/)
    if (!match) continue
    const [, id, map] = match
    if (!byMaterial.has(id)) byMaterial.set(id, {})
    byMaterial.get(id)[map] = resolve(TEXTURE_DIR, file)
  }

  const materials = [...byMaterial.entries()].sort(([a], [b]) => a.localeCompare(b))
  if (materials.length === 0) {
    console.error('No generated textures found — run `npm run bake` first.')
    process.exitCode = 1
    return
  }

  const width = CELL * COLUMNS.length
  const rowHeight = CELL + LABEL_HEIGHT
  const height = rowHeight * materials.length + LABEL_HEIGHT

  const composites = [
    {
      input: labelSvg(
        `procedural materials — ${materials.length} sets · albedo / normal / orm / albedo tiled 2x2`,
        width,
        LABEL_HEIGHT,
      ),
      top: 0,
      left: 0,
    },
  ]

  for (const [index, [id, maps]] of materials.entries()) {
    const top = LABEL_HEIGHT + index * rowHeight

    composites.push({ input: labelSvg(id, width, LABEL_HEIGHT, 14), top, left: 0 })

    for (const [column, name] of COLUMNS.entries()) {
      const left = column * CELL
      const cellTop = top + LABEL_HEIGHT

      if (name === 'tiled') {
        // 2x2 of the albedo at half scale: any seam lands dead centre.
        const quarter = await sharp(maps.albedo).resize(CELL / 2, CELL / 2).toBuffer()
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          composites.push({
            input: quarter,
            top: cellTop + dy * (CELL / 2),
            left: left + dx * (CELL / 2),
          })
        }
        continue
      }

      if (!maps[name]) continue
      composites.push({
        input: await sharp(maps[name]).resize(CELL, CELL).toBuffer(),
        top: cellTop,
        left,
      })
    }
  }

  const sheet = await sharp({
    create: { width, height, channels: 3, background: { r: 22, g: 24, b: 28 } },
  })
    .composite(composites)
    .png()
    .toBuffer()

  const outPath = resolve(OUT_DIR, 'materials.png')
  await writeFile(outPath, sheet)
  console.log(`Wrote docs/contact-sheets/materials.png (${width}x${height}, ${Math.round(sheet.length / 1024)} KB)`)
}

main().catch((error) => {
  console.error(`contact-sheet failed — ${error.message}`)
  process.exitCode = 1
})
