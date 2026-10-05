/**
 * The words drawn in the museum's authored images.
 *
 * A dictionary is not the only place the game prints something. The plan on
 * the office wall is an SVG with the wings lettered on it, and a year or a
 * count set in that lettering is on the wall like any label: the numeral
 * lint has to read it (`src/content/textLint.ts`). A raster is not read;
 * what a photograph shows is not text the museum wrote.
 *
 * The lint is a pure function of what it is handed, so the reading of files
 * lives here, with the gate script and the suite that call it.
 */

import { resolve } from 'node:path'

import type { MediaAsset } from '../../src/content/schema.ts'
import { readText } from './readText.ts'

const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decoded(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole: string, name: string) => {
    if (name.startsWith('#x') || name.startsWith('#X')) return String.fromCodePoint(Number.parseInt(name.slice(2), 16))
    if (name.startsWith('#')) return String.fromCodePoint(Number.parseInt(name.slice(1), 10))
    return ENTITIES[name.toLowerCase()] ?? whole
  })
}

/**
 * The text of every `<text>` element of an SVG, in document order. The spans
 * of one element are one text, a space apart: they are usually its lines.
 */
export function svgTextNodes(svg: string): string[] {
  return [...svg.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)]
    .map(([, inner]) => decoded(inner.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter((text) => text !== '')
}

/**
 * What each SVG of the media catalogue has lettered on it, by media id.
 * `publicDirectory` is where a media `src` is served from. An asset whose
 * file is gone throws: an image the gate could not read is not an image
 * with nothing written on it.
 */
export function readMediaTexts(media: readonly MediaAsset[], publicDirectory: string): Record<string, string[]> {
  const texts: Record<string, string[]> = {}
  for (const asset of media) {
    if (!/\.svg$/i.test(asset.src)) continue
    texts[asset.id] = svgTextNodes(readText(resolve(publicDirectory, `.${asset.src}`)))
  }
  return texts
}
