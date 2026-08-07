/**
 * Fetches the curated media set from Wikimedia Commons, normalises it for
 * real-time use, and emits a typed attribution module.
 *
 * The point of this script is that ATTRIBUTION IS DERIVED, NEVER TYPED. The
 * title, author, date and licence URL all come from the Commons API response
 * for the exact file being downloaded, so the credit rendered under the
 * artwork in-world is by construction the credit the source asks for.
 *
 *   npm run media:fetch
 *
 * Output:
 *   public/textures/media/<id>.webp
 *   src/content/media.generated.ts
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

import { LICENSE_MAP, MEDIA_SOURCES } from './media-sources.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const OUT_IMAGES = resolve(ROOT, 'public/textures/media')
const OUT_MODULE = resolve(ROOT, 'src/content/media.generated.ts')

// Commons requires a descriptive User-Agent identifying the project. Requests
// without one are throttled or refused.
const USER_AGENT =
  'VolleyballMuseum/0.1 (portfolio project; https://github.com/RZB1414) node-fetch'

const API = 'https://commons.wikimedia.org/w/api.php'

/** Strips the HTML Commons embeds in extmetadata values. */
function plain(value) {
  if (value == null) return ''
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Commons renders "Unknown author" twice (once as a link, once as text), and
 * date fields carry a trailing Wikidata QS blob. Both are cosmetic noise that
 * would otherwise end up printed under the artwork.
 */
function cleanAuthor(value) {
  const text = plain(value)
  const deduped = text.replace(/^(Unknown author)\s*\1$/i, '$1')
  return deduped || 'Unknown author'
}

function cleanDate(value) {
  return plain(value).replace(/\s*date QS:.*$/i, '').trim()
}

async function fetchMetadata(titles) {
  const url = new URL(API)
  url.searchParams.set('action', 'query')
  url.searchParams.set('titles', titles.join('|'))
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|size|mime|extmetadata')
  url.searchParams.set('iiurlwidth', '2048')
  url.searchParams.set('format', 'json')

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) {
    throw new Error(`Commons API returned ${response.status} ${response.statusText}`)
  }

  const body = await response.json()
  const pages = Object.values(body?.query?.pages ?? {})
  const byTitle = new Map()

  for (const page of pages) {
    if (page.missing !== undefined) {
      throw new Error(`Commons has no file named "${page.title}".`)
    }
    const info = page.imageinfo?.[0]
    if (!info) throw new Error(`Commons returned no imageinfo for "${page.title}".`)
    byTitle.set(page.title, { page, info })
  }

  return byTitle
}

function buildCredit(source, meta) {
  const extra = meta.info.extmetadata ?? {}
  const shortName = plain(extra.LicenseShortName?.value)
  const code = String(extra.License?.value ?? '').toLowerCase()
  const license = LICENSE_MAP[code]

  if (!license) {
    throw new Error(
      `"${source.commonsTitle}" carries licence "${code || shortName || 'unknown'}", which is not in LICENSE_MAP. ` +
        'Add it deliberately or drop the image — an unrecognised licence is a legal question, not a build warning.',
    )
  }

  const title = plain(extra.ObjectName?.value) || source.commonsTitle.replace(/^File:/, '')
  const author = cleanAuthor(extra.Artist?.value)
  const year = cleanDate(extra.DateTimeOriginal?.value)
  const sourceUrl = meta.info.descriptionurl

  if (license === 'public-domain') {
    if (!source.pdReason) {
      throw new Error(
        `"${source.commonsTitle}" is public domain but media-sources.mjs gives no pdReason. ` +
          'State why it is PD — the credits wall prints it.',
      )
    }
    return {
      license,
      title,
      author: author === 'Unknown author' ? undefined : author,
      year,
      sourceUrl,
      reason: source.pdReason,
    }
  }

  const licenseUrl = plain(extra.LicenseUrl?.value)
  if (!licenseUrl) {
    throw new Error(`"${source.commonsTitle}" is ${license} but Commons returned no LicenseUrl.`)
  }

  return {
    license,
    title,
    author,
    sourceUrl,
    licenseUrl,
    modifications: source.modifications,
  }
}

async function downloadAndEncode(source, meta) {
  // Prefer the API-rendered thumbnail: it is already downscaled server-side, so
  // we are not pulling a 10 MB original to throw 95% of it away.
  const remote = meta.info.thumburl ?? meta.info.url
  const response = await fetch(remote, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) {
    throw new Error(`Download failed for ${remote}: ${response.status}`)
  }

  const original = Buffer.from(await response.arrayBuffer())
  const pipeline = sharp(original).resize({
    width: source.targetWidth,
    withoutEnlargement: true,
    fit: 'inside',
  })

  // WebP rather than KTX2 for the vertical slice: the Basis transcoder is a
  // fixed ~260 KB gzip cost that only amortises past roughly four textures, and
  // period photographs are framed flat on a wall where GPU-side compression
  // buys little. Revisit when the wall count grows.
  const encoded = await pipeline.webp({ quality: 82, effort: 5 }).toBuffer()
  const { width, height } = await sharp(encoded).metadata()

  return { encoded, width, height }
}

function tsLiteral(value) {
  if (value === undefined) return undefined
  return JSON.stringify(value)
}

function renderCreditLiteral(credit) {
  const lines = [`      license: ${tsLiteral(credit.license)},`]

  if (credit.license === 'public-domain') {
    lines.push(`      title: ${tsLiteral(credit.title)},`)
    if (credit.author) lines.push(`      author: ${tsLiteral(credit.author)},`)
    lines.push(`      year: ${tsLiteral(credit.year)},`)
    lines.push(`      sourceUrl: ${tsLiteral(credit.sourceUrl)},`)
    lines.push(`      reason: ${tsLiteral(credit.reason)},`)
  } else {
    lines.push(`      title: ${tsLiteral(credit.title)},`)
    lines.push(`      author: ${tsLiteral(credit.author)},`)
    lines.push(`      sourceUrl: ${tsLiteral(credit.sourceUrl)},`)
    lines.push(`      licenseUrl: ${tsLiteral(credit.licenseUrl)},`)
    if (credit.modifications) {
      lines.push(`      modifications: ${tsLiteral(credit.modifications)},`)
    }
  }

  return lines.join('\n')
}

async function main() {
  await mkdir(OUT_IMAGES, { recursive: true })

  console.log(`Fetching metadata for ${MEDIA_SOURCES.length} file(s) from Commons...`)
  const metaByTitle = await fetchMetadata(MEDIA_SOURCES.map((source) => source.commonsTitle))

  const assets = []

  for (const source of MEDIA_SOURCES) {
    const meta = metaByTitle.get(source.commonsTitle)
    if (!meta) throw new Error(`No metadata returned for "${source.commonsTitle}".`)

    const credit = buildCredit(source, meta)
    const { encoded, width, height } = await downloadAndEncode(source, meta)

    // Content hash in the filename so `_headers` can mark it immutable.
    const hash = createHash('sha256').update(encoded).digest('hex').slice(0, 8)
    const filename = `${source.id}.${hash}.webp`
    const outPath = resolve(OUT_IMAGES, filename)

    // Skip the write when the bytes are identical, so a re-run does not churn
    // the working tree and make CI diffs noisy.
    let unchanged = false
    try {
      const existing = await readFile(outPath)
      unchanged = existing.equals(encoded)
    } catch {
      unchanged = false
    }
    if (!unchanged) await writeFile(outPath, encoded)

    assets.push({
      id: source.id,
      kind: source.kind,
      src: `/textures/media/${filename}`,
      aspect: Number((width / height).toFixed(4)),
      credit,
    })

    console.log(
      `  ${unchanged ? '=' : '+'} ${source.id.padEnd(30)} ${String(width).padStart(4)}x${String(height).padEnd(4)} ` +
        `${String(Math.round(encoded.length / 1024)).padStart(4)} KB  ${credit.license}`,
    )
  }

  const module = `/**
 * GENERATED FILE — do not edit.
 *
 * Produced by \`npm run media:fetch\` from the curated list in
 * scripts/media-sources.mjs. Every field below is what the Wikimedia Commons
 * API returned for that exact file, so the credit rendered beneath the artwork
 * is the credit the source asks for.
 *
 * Regenerate rather than patch.
 */

import type { MediaAsset } from './schema'

export const GENERATED_MEDIA = [
${assets
  .map(
    (asset) => `  {
    id: ${tsLiteral(asset.id)},
    kind: ${tsLiteral(asset.kind)},
    src: ${tsLiteral(asset.src)},
    aspect: ${asset.aspect},
    credit: {
${renderCreditLiteral(asset.credit)}
    },
  },`,
  )
  .join('\n')}
] as const satisfies readonly MediaAsset[]
`

  await writeFile(OUT_MODULE, module, 'utf8')
  console.log(`\nWrote ${assets.length} asset(s) to src/content/media.generated.ts`)
}

main().catch((error) => {
  console.error(`\nmedia:fetch failed — ${error.message}`)
  process.exitCode = 1
})
