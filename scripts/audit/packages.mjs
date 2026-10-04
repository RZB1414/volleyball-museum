/**
 * Measures the order of the engine work packages against their dependencies:
 * no package may enter a lot earlier than the packages it depends on.
 *
 * It reads the package table of the master plan itself (section 6.2 of
 * `docs/PLANO-ATE-O-FINAL.md`), so moving a package to another lot, or giving
 * it a new dependency, is checked against the document people actually edit.
 *
 * Three verdicts per dependency:
 *   ok         the package starts in the dependency's first lot or later;
 *   staged     the package is delivered over several lots and starts before
 *              the dependency arrives, so only its later part can need it.
 *              The table cannot say which part that is: a person confirms it;
 *   VIOLATION  the package is finished before the dependency exists.
 *
 * Read-only. Exits non-zero on a violation or on a dependency that is not a
 * package, so it can be run before a lot is re-planned.
 *
 *   npm run audit:packages
 */

import { readFileSync } from 'node:fs'

import { inRepo } from './lib/repo.mjs'

const PLAN = 'docs/PLANO-ATE-O-FINAL.md'
const plan = readFileSync(inRepo(PLAN), 'utf8')

/** Table cells of a markdown row; `\|` inside a cell is text, not a border. */
const cells = (row) =>
  row
    .split(/(?<!\\)\|/)
    .slice(1, -1)
    .map((cell) => cell.trim())

/** Every lot a cell names, as numbers: `P0` is 0, `L18–L22` is 18 and 22. */
const lotsIn = (cell) => [...cell.matchAll(/\b(?:P0|L(\d+))\b/g)].map((match) => Number(match[1] ?? 0))
const lotName = (lot) => (lot === 0 ? 'P0' : `L${lot}`)

const packages = new Map()
for (const line of plan.split('\n')) {
  if (!/^\| \*\*M\d+[a-z]?\*\* \|/.test(line)) continue
  const [id, , depends, , , lot] = cells(line)
  const lots = lotsIn(lot)
  if (lots.length === 0) throw new Error(`${id}: no lot in "${lot}"`)
  packages.set(id.replaceAll('*', ''), {
    depends: depends === '—' ? [] : depends.split(',').map((name) => name.trim()),
    first: Math.min(...lots),
    last: Math.max(...lots),
    lot,
  })
}

/** A dependency named without its slice (`M6`) means the earliest slice. */
function resolveDependency(name) {
  if (packages.has(name)) return packages.get(name)
  const slices = [...packages].filter(([id]) => id.replace(/[a-z]$/, '') === name).map(([, entry]) => entry)
  return slices.length > 0 ? slices.reduce((early, entry) => (entry.first < early.first ? entry : early)) : null
}

const counts = { ok: 0, staged: 0, violation: 0, unknown: 0 }
const notes = []
for (const [id, entry] of packages) {
  for (const name of entry.depends) {
    const dependency = resolveDependency(name)
    if (!dependency) {
      counts.unknown += 1
      notes.push(`UNKNOWN    ${id} depends on ${name}, which is not a package of section 6.2`)
    } else if (entry.first >= dependency.first) {
      counts.ok += 1
    } else if (entry.last >= dependency.first) {
      counts.staged += 1
      notes.push(
        `staged     ${id} starts in ${lotName(entry.first)} (${entry.lot}); ${name} arrives in ${lotName(dependency.first)}`,
      )
    } else {
      counts.violation += 1
      notes.push(
        `VIOLATION  ${id} ends in ${lotName(entry.last)} (${entry.lot}); ${name} only arrives in ${lotName(dependency.first)}`,
      )
    }
  }
}

console.log(`${PLAN}, section 6.2: ${packages.size} packages`)
for (const [id, entry] of packages) {
  const span = entry.first === entry.last ? lotName(entry.first) : `${lotName(entry.first)}..${lotName(entry.last)}`
  console.log(`  ${id.padEnd(5)} ${span.padEnd(9)} ${entry.depends.length > 0 ? `after ${entry.depends.join(', ')}` : ''}`)
}
console.log('')
for (const note of notes) console.log(note)
console.log(
  `\n${counts.ok} ok, ${counts.staged} staged, ${counts.violation} violation(s), ${counts.unknown} unknown dependency(ies)`,
)

if (counts.violation > 0 || counts.unknown > 0) process.exitCode = 1
