/**
 * The built site, by the moment each part of it is downloaded.
 *
 *   npm run test:bundle     (runs `vite build` first: a stale dist/ proves nothing)
 *
 * The title screen is 92 kB because of one rule nobody had written down: the
 * entry and the title import no content. The dictionary is there (the title
 * is translated); the museum, the bake manifest, three.js and the engine
 * arrive when the player presses the button. One careless import in
 * `MuseumApp.tsx` moves a megabyte in front of the first paint and no test
 * failed for it.
 *
 * So the gate reads `dist/` itself: which file arrives at which moment
 * (`scripts/lib/bundlePaths.mjs`), what each moment weighs gzipped against
 * the plan's budgets and against what the last lot left
 * (`scripts/lib/ratchets.ts`), and that nothing before the click carries the
 * content set or the bake manifest.
 */

import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// @ts-expect-error - a plain .mjs library with no type declarations.
import { BUNDLE_PATH_NAMES, classifyBundle, measurePaths, pathNameOf } from './lib/bundlePaths.mjs'
import { BUNDLE_BUDGETS, BUNDLE_PATH_CEILINGS, CONTENT_SENTINELS } from './lib/ratchets.ts'

let passed = 0
let failed = 0
function test(name: string, run: () => void) {
  try {
    run()
  } catch (error) {
    failed += 1
    console.log(`  FAIL  ${name}`)
    console.log(String(error instanceof Error ? error.message : error).replace(/^/gm, '        '))
    return
  }
  passed += 1
  console.log(`  pass  ${name}`)
}

type PathName = keyof typeof BUNDLE_PATH_CEILINGS
type Measured = Record<PathName, { bytes: number; gzip: number; files: string[] }>
const classify = classifyBundle as (bundle: { html: string; files: ReadonlyMap<string, string> }) => Map<string, number>
const measure = measurePaths as (depths: ReadonlyMap<string, number>, buffers: ReadonlyMap<string, Buffer>) => Measured
const nameOf = pathNameOf as (depth: number) => PathName

console.log('Bundle paths:')

// ---------------------------------------------------------------------------
// The classifier, on a bundle made up for the purpose
// ---------------------------------------------------------------------------

test('a file belongs to the earliest moment that reaches it, and static imports cost nothing', () => {
  const preload = (files: string[], calls: number[][]) =>
    `const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=[${files.map((file) => `"${file}"`).join(',')}])))=>i.map(i=>d[i]);` +
    calls.map((call) => `load(()=>import("./x.js"),__vite__mapDeps([${call.join(',')}]));`).join('')
  const files = new Map<string, string>([
    ['assets/entry.js', `import{r}from"./runtime.js";${preload(['assets/title.js', 'assets/shared.js', 'assets/title.css'], [[0, 1, 2]])}`],
    ['assets/runtime.js', 'export const r=1'],
    ['assets/entry.css', 'body{}'],
    ['assets/title.js', `import"./shared.js";import{r}from"./runtime.js";${preload(['assets/game.js', 'assets/shared.js', 'assets/deep.js'], [[0, 1], [2]])}`],
    ['assets/title.css', 'h1{}'],
    ['assets/shared.js', 'export const s=1'],
    ['assets/game.js', 'import{d}from"./engine.js";import("./late.js")'],
    ['assets/engine.js', 'export const d=1'],
    ['assets/deep.js', 'export const z=1'],
    ['assets/late.js', 'export const l=1'],
    ['assets/orphan.js', 'export const o=1'],
  ])
  const html =
    '<script type="module" crossorigin src="/assets/entry.js"></script>' +
    '<link rel="modulepreload" crossorigin href="/assets/runtime.js">' +
    '<link rel="stylesheet" crossorigin href="/assets/entry.css">' +
    '<link rel="manifest" href="/manifest.webmanifest">' +
    '<link rel="stylesheet" href="https://example.org/elsewhere.css">'
  const depths = classify({ html, files })
  assert.deepEqual(
    Object.fromEntries([...depths].sort(([a], [b]) => a.localeCompare(b))),
    {
      'assets/deep.js': 2,
      'assets/engine.js': 2,
      'assets/entry.css': 0,
      'assets/entry.js': 0,
      'assets/game.js': 2,
      'assets/late.js': 3,
      'assets/runtime.js': 0,
      // Listed by the game's import too, but the title already needed it.
      'assets/shared.js': 1,
      'assets/title.css': 1,
      'assets/title.js': 1,
      'index.html': 0,
    },
  )
  assert.ok(!depths.has('assets/orphan.js'), 'a file nothing reaches is in no path')
  assert.deepEqual([0, 1, 2, 3].map(nameOf), ['document', 'title', 'game', 'game'], 'everything past the click is the game')
  assert.deepEqual(BUNDLE_PATH_NAMES, Object.keys(BUNDLE_PATH_CEILINGS), 'one ceiling per moment')
})

// ---------------------------------------------------------------------------
// The real build
// ---------------------------------------------------------------------------

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
assert.ok(existsSync(join(DIST, 'index.html')), 'dist/ is built (npm run test:bundle builds it)')

const buffers = new Map<string, Buffer>()
const walk = (directory: string) => {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.(?:js|css|html)$/.test(name)) buffers.set(relative(DIST, path).split(sep).join('/'), readFileSync(path))
  }
}
walk(DIST)

const texts = new Map([...buffers].map(([path, buffer]) => [path, buffer.toString('utf8')]))
const html = texts.get('index.html') as string
const depths = classify({ html, files: texts })
const measured = measure(depths, buffers)
const kB = (bytes: number) => `${(bytes / 1000).toFixed(2)} kB`

for (const name of Object.keys(BUNDLE_PATH_CEILINGS) as PathName[]) {
  const path = measured[name]
  console.log(
    `  ${name.padEnd(9)} ${String(path.bytes).padStart(9)} bytes  gzip ${kB(path.gzip).padStart(10)}  ` +
      `ceiling ${kB(BUNDLE_PATH_CEILINGS[name]).padStart(10)}  ${path.files.length} file(s)`,
  )
}
const beforeClick = measured.document.gzip + measured.title.gzip
const total = beforeClick + measured.game.gzip
console.log(
  `  before the click ${kB(beforeClick)} of ${kB(BUNDLE_BUDGETS.beforeClick)}; ` +
    `in the game ${kB(total)} of ${kB(BUNDLE_BUDGETS.total)}`,
)

test('every script and style sheet of the build is in a path', () => {
  const unreached = [...buffers.keys()].filter((path) => !depths.has(path))
  assert.deepEqual(unreached, [], 'a built file the page never asks for')
  assert.ok(measured.document.files.includes('index.html'))
  assert.ok(measured.title.files.length > 0 && measured.game.files.length > 0, 'the build still has its two lazy boundaries')
})

test('the build is inside the plan\'s budgets: 250 kB before the click, 600 kB in the game', () => {
  assert.ok(beforeClick <= BUNDLE_BUDGETS.beforeClick, `${kB(beforeClick)} before the click`)
  assert.ok(total <= BUNDLE_BUDGETS.total, `${kB(total)} in the game`)
})

test('no path weighs more than the last lot left it', () => {
  const heavier = (Object.keys(BUNDLE_PATH_CEILINGS) as PathName[])
    .filter((name) => measured[name].gzip > BUNDLE_PATH_CEILINGS[name])
    .map(
      (name) =>
        `${name}: ${kB(measured[name].gzip)} gzipped, ceiling ${kB(BUNDLE_PATH_CEILINGS[name])} ` +
        `(${measured[name].files.join(', ')})`,
    )
  assert.deepEqual(
    heavier,
    [],
    'a path grew: take the bytes out, or raise BUNDLE_PATH_CEILINGS in scripts/lib/ratchets.ts in this commit and say why',
  )
})

test('nothing downloaded before the click carries the content set or the bake manifest', () => {
  const carriers = [...measured.document.files, ...measured.title.files].flatMap((path) =>
    CONTENT_SENTINELS.filter((sentinel) => (texts.get(path) as string).includes(sentinel)).map(
      (sentinel) => `${path} contains "${sentinel}"`,
    ),
  )
  assert.deepEqual(carriers, [], 'the title screen imports the museum: find the import and move it behind the button')
  // The sentinels are still worth looking for: the game does carry them.
  for (const sentinel of CONTENT_SENTINELS) {
    assert.ok(
      measured.game.files.some((path) => (texts.get(path) as string).includes(sentinel)),
      `"${sentinel}" is no longer in the build at all: pick a sentinel the content still has`,
    )
  }
})

console.log(`${passed}/${passed + failed} bundle checks passed`)
if (failed > 0) process.exitCode = 1
