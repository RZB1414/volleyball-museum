/**
 * Which part of the built site a player downloads when.
 *
 * The build has three moments, and the budget is different for each:
 *
 *   0. the document: `index.html`, the entry script and what it imports
 *      statically. Paid before anything is drawn;
 *   1. the title screen: what the entry asks for with its first `import()`.
 *      Paid before the player can press the button;
 *   2. the game: what the title screen asks for when the button is pressed.
 *
 * A file's moment is the number of dynamic imports between the entry and it,
 * taking the shortest way. Static imports cost nothing: a chunk and everything
 * it imports statically arrive together. This is read off the built files
 * themselves (Vite writes each dynamic import's preload list into the chunk
 * that makes it), so it is the truth about what is served, not about what
 * the source intends.
 *
 * Pure: `classifyBundle` takes the text of the files, and the gate
 * (`npm run test:bundle`) runs it on `dist/` and on a made-up bundle.
 */

import { gzipSync } from 'node:zlib'

export const BUNDLE_PATH_NAMES = ['document', 'title', 'game']

const ATTRIBUTE = (name) => new RegExp(`\\b${name}=["']([^"']+)["']`)

/** Script, modulepreload and stylesheet references of the page, as dist-relative paths. */
export function htmlReferences(html) {
  const references = []
  for (const tag of html.match(/<(?:script|link)\b[^>]*>/g) ?? []) {
    const isScript = tag.startsWith('<script')
    const rel = ATTRIBUTE('rel').exec(tag)?.[1]
    if (!isScript && rel !== 'modulepreload' && rel !== 'stylesheet') continue
    const target = ATTRIBUTE(isScript ? 'src' : 'href').exec(tag)?.[1]
    if (target && !/^[a-z]+:/i.test(target)) references.push(target.replace(/^\//, ''))
  }
  return references
}

const directoryOf = (path) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '')

/** `./x.js` as written in `from`, resolved against the importing chunk. */
function resolveSibling(from, specifier) {
  return directoryOf(from) + specifier.replace(/^\.\//, '')
}

/** What a chunk imports statically: `from"./x.js"` and bare `import"./x.js"`. */
export function staticImports(path, text) {
  const found = new Set()
  for (const match of text.matchAll(/(?:\bfrom|\bimport)\s*["'](\.\/[\w.@-]+\.js)["']/g)) {
    found.add(resolveSibling(path, match[1]))
  }
  return [...found]
}

/**
 * What a chunk asks for later. Vite compiles `import('./x')` to a preload
 * helper called with indices into one table per chunk; each call lists the
 * dynamic chunk, its static imports and its style sheets. A plain
 * `import("./x.js")` the helper did not wrap is read too.
 */
export function dynamicImports(path, text) {
  const groups = []
  const table = /__vite__mapDeps\s*=[^[]*\[((?:\s*"[^"]*"\s*,?)*)\]/.exec(text)
  const files = table ? [...table[1].matchAll(/"([^"]*)"/g)].map((match) => match[1]) : []
  for (const call of text.matchAll(/__vite__mapDeps\(\[([\d,\s]*)\]\)/g)) {
    const group = call[1]
      .split(',')
      .map((index) => files[Number(index.trim())])
      .filter((file) => typeof file === 'string')
    if (group.length > 0) groups.push(group)
  }
  for (const match of text.matchAll(/\bimport\(\s*["'`](\.\/[\w.@-]+\.js)["'`]\s*\)/g)) {
    groups.push([resolveSibling(path, match[1])])
  }
  return groups
}

/**
 * The moment of every script and style sheet reachable from the page.
 *
 * @param {{ html: string, files: ReadonlyMap<string, string> }} bundle
 *   `files` maps a dist-relative path to its text.
 * @returns {Map<string, number>} path to depth; `index.html` is 0.
 */
export function classifyBundle({ html, files }) {
  const depth = new Map([['index.html', 0]])
  const queue = []
  const reach = (path, at) => {
    if (!files.has(path)) return
    const known = depth.get(path)
    if (known !== undefined && known <= at) return
    depth.set(path, at)
    queue.push(path)
  }

  for (const reference of htmlReferences(html)) reach(reference, 0)
  while (queue.length > 0) {
    const path = queue.shift()
    if (!path.endsWith('.js')) continue
    const at = depth.get(path)
    const text = files.get(path)
    for (const imported of staticImports(path, text)) reach(imported, at)
    for (const group of dynamicImports(path, text)) {
      for (const member of group) reach(member, at + 1)
    }
  }
  return depth
}

/** The name of a depth: everything past the first click is the game. */
export function pathNameOf(depth) {
  return BUNDLE_PATH_NAMES[Math.min(depth, BUNDLE_PATH_NAMES.length - 1)]
}

/**
 * Bytes on disk and gzipped, per moment.
 *
 * gzip at level 9, each file by itself: what a static host serves. The
 * figure Vite prints is a little larger (it does not compress at 9); the
 * ratchet compares like with like, measured here both times.
 *
 * @param {ReadonlyMap<string, number>} depths from `classifyBundle`
 * @param {ReadonlyMap<string, Buffer>} buffers dist-relative path to bytes
 */
export function measurePaths(depths, buffers) {
  const paths = Object.fromEntries(BUNDLE_PATH_NAMES.map((name) => [name, { bytes: 0, gzip: 0, files: [] }]))
  for (const [path, depth] of depths) {
    const buffer = buffers.get(path)
    if (!buffer) continue
    const entry = paths[pathNameOf(depth)]
    entry.bytes += buffer.byteLength
    entry.gzip += gzipSync(buffer, { level: 9 }).byteLength
    entry.files.push(path)
  }
  for (const entry of Object.values(paths)) entry.files.sort()
  return paths
}
