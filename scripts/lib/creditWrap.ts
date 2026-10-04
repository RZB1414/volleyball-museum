/**
 * How many lines a credit takes under a frame, measured with the font the
 * game draws it in.
 *
 * The placement proof of the wall case needs the height of the caption under
 * each frame, and that height is a number of lines. It was typed into the
 * test ("four"), measured once by hand. The clearance under the Morgan
 * portrait is smaller than one line: a credit that grew by a word (a title
 * fetched again from the source, a licence label translated differently)
 * would run into the shelf below with the proof still green, which is the
 * very defect that proof was written for.
 *
 * So the lines are counted here, from the text the runtime formats and the
 * advance widths in the font file it ships. No font library: a WOFF is a
 * table directory over zlib streams, and the three tables needed (`head`,
 * `hhea` with `hmtx`, `cmap`) are a few fixed-offset reads each.
 *
 * The break rule is the text renderer's: a line is filled greedily, and when
 * a visible glyph would pass the width, the line breaks after the last
 * character that allows it (a space, a hyphen, a dash). What is NOT
 * reproduced is kerning, which the renderer applies and which only ever
 * tightens this face. The measure therefore errs towards more lines, and a
 * line that ends within `SAFETY` of the width is counted as full, so that
 * the proof fails on a caption that fits by a hair rather than passing on
 * one that does not.
 */

import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

/** The share of the width kept in hand for what this measure cannot see. */
const SAFETY = 0.02

export type FontMetrics = {
  readonly unitsPerEm: number
  /** Advance width of a character in font units; 0 for one the font lacks. */
  readonly advance: (character: string) => number
  /** Whether the font has a glyph for the character. */
  readonly has: (character: string) => boolean
}

/** The tables of a WOFF 1.0 file, inflated, by tag. */
function woffTables(file: Buffer): Map<string, Buffer> {
  if (file.toString('latin1', 0, 4) !== 'wOFF') throw new Error('not a WOFF 1.0 file')
  const tables = new Map<string, Buffer>()
  const count = file.readUInt16BE(12)
  for (let index = 0; index < count; index += 1) {
    const entry = 44 + index * 20
    const offset = file.readUInt32BE(entry + 4)
    const compressed = file.readUInt32BE(entry + 8)
    const original = file.readUInt32BE(entry + 12)
    const bytes = file.subarray(offset, offset + compressed)
    // A table that did not shrink is stored as it is.
    tables.set(file.toString('latin1', entry, entry + 4), compressed < original ? inflateSync(bytes) : bytes)
  }
  return tables
}

/** Character code to glyph index, from the font's Unicode BMP subtable (format 4). */
function characterMap(cmap: Buffer): (code: number) => number {
  const subtables = cmap.readUInt16BE(2)
  let start = -1
  for (let index = 0; index < subtables; index += 1) {
    const record = 4 + index * 8
    const platform = cmap.readUInt16BE(record)
    const encoding = cmap.readUInt16BE(record + 2)
    const offset = cmap.readUInt32BE(record + 4)
    const unicodeBmp = (platform === 3 && encoding === 1) || platform === 0
    if (unicodeBmp && cmap.readUInt16BE(offset) === 4) start = offset
  }
  if (start < 0) throw new Error('the font has no format 4 character map')

  const segments = cmap.readUInt16BE(start + 6) / 2
  const ends = start + 14
  const starts = ends + segments * 2 + 2
  const deltas = starts + segments * 2
  const ranges = deltas + segments * 2
  return (code) => {
    for (let segment = 0; segment < segments; segment += 1) {
      if (code > cmap.readUInt16BE(ends + segment * 2)) continue
      const first = cmap.readUInt16BE(starts + segment * 2)
      if (code < first) return 0
      const delta = cmap.readUInt16BE(deltas + segment * 2)
      const rangeAt = ranges + segment * 2
      const range = cmap.readUInt16BE(rangeAt)
      if (range === 0) return (code + delta) & 0xffff
      const glyph = cmap.readUInt16BE(rangeAt + range + (code - first) * 2)
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff
    }
    return 0
  }
}

/** The metrics a line measure needs, from a WOFF 1.0 file on disk. */
export function readFontMetrics(path: string): FontMetrics {
  const tables = woffTables(readFileSync(path))
  const table = (tag: string) => {
    const bytes = tables.get(tag)
    if (!bytes) throw new Error(`the font has no "${tag}" table`)
    return bytes
  }
  const unitsPerEm = table('head').readUInt16BE(18)
  const measured = table('hhea').readUInt16BE(34)
  const hmtx = table('hmtx')
  const glyphOf = characterMap(table('cmap'))
  // Glyphs past the last measured one share its advance.
  const advanceOf = (glyph: number) => hmtx.readUInt16BE(Math.min(glyph, measured - 1) * 4)
  return {
    unitsPerEm,
    has: (character) => glyphOf(character.codePointAt(0) ?? 0) !== 0,
    advance: (character) => advanceOf(glyphOf(character.codePointAt(0) ?? 0)),
  }
}

/** A line may end after one of these: white space, a hyphen, a dash, a bar. */
const BREAK_AFTER = /[\s\-‐‒-—|]/

/**
 * The lines a text is set in at `fontSize`, in a column `maxWidth` wide, both
 * in metres. Throws on a character the font cannot draw: the game would show
 * a blank there, and the measure would be of another text.
 */
export function wrapLines(text: string, metrics: FontMetrics, fontSize: number, maxWidth: number): string[] {
  const scale = fontSize / metrics.unitsPerEm
  const limit = maxWidth * (1 - SAFETY)
  const lines: string[] = []
  let line: { character: string; x: number }[] = []
  let pen = 0
  for (const character of text) {
    const space = /\s/.test(character)
    if (!space && !metrics.has(character)) throw new Error(`the font has no glyph for "${character}"`)
    const width = metrics.advance(character) * scale
    if (!space && pen + width > limit && line.length > 0) {
      let breakAt = -1
      for (let index = line.length - 1; index >= 0 && breakAt < 0; index -= 1) {
        if (BREAK_AFTER.test(line[index].character)) breakAt = index
      }
      // With nowhere to break, the word overflows where it stands, as drawn.
      if (breakAt >= 0) {
        const carried = line.splice(breakAt + 1)
        lines.push(line.map((glyph) => glyph.character).join(''))
        const shift = carried.length > 0 ? carried[0].x : pen
        for (const glyph of carried) glyph.x -= shift
        line = carried
        pen -= shift
      }
    }
    line.push({ character, x: pen })
    pen += width
  }
  lines.push(line.map((glyph) => glyph.character).join(''))
  return lines.map((set) => set.trimEnd())
}
