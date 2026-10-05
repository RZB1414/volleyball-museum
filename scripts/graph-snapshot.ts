/**
 * Writes the graph of the content as it stands, for the lot it stands at.
 *
 *   npm run graph:snapshot
 *   npm run graph:snapshot -- --reopen     the file of a lot the plan already gives as done
 *   npm run graph:snapshot -- --dry-run    says what it would do, and writes nothing
 *
 * Run as a lot closes (step 12 of the plan's §9.1) and again, with
 * `--reopen`, if the lot is fixed between its closing and its publication, so
 * that the file is the graph of the tree that goes out. That file,
 * `docs/releases/L<n>.graph.json`, is what the next lot's content is compared
 * with on every run of the gate (`validateAdditive`): every action a player
 * of this lot could take, what each asked and gave, every id a save of this
 * lot can hold.
 *
 * It only ever writes the file of the lot the content is at, and `CONTENT_LOT`
 * stays at a lot through the first slices of the next one. So once the plan
 * gives the lot as done the script refuses: the file is a record, and writing
 * it again would put the next lot's content into it. `--reopen` is the way
 * past, for a fix to the lot itself, and the gate then asks for the second
 * key: the SHA-256 printed here, pinned in `scripts/lib/graphSnapshots.ts`.
 * Writing again with nothing changed changes no byte.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { graphSnapshot, serialiseGraphSnapshot } from '../src/content/additive.ts'
import { CONTENT_LOT } from '../src/content/contentLot.ts'
import { MUSEUM } from '../src/content/museum.ts'
import { RELEASES_DIRECTORY, snapshotDigest, snapshotFileName, snapshotWriteRefusal } from './lib/graphSnapshots.ts'
import { lastLotDone } from './lib/planLots.ts'
import { readText } from './lib/readText.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const path = join(ROOT, RELEASES_DIRECTORY, snapshotFileName(CONTENT_LOT))
const flags = process.argv.slice(2)
const unknown = flags.filter((flag) => flag !== '--reopen' && flag !== '--dry-run')
if (unknown.length > 0) {
  console.error(`graph:snapshot does not know ${unknown.join(', ')}. It takes --reopen and --dry-run.`)
  process.exit(1)
}
const dryRun = flags.includes('--dry-run')

const refusal = snapshotWriteRefusal(CONTENT_LOT, lastLotDone(readText(join(ROOT, 'docs/PLANO-ATE-O-FINAL.md'))), flags.includes('--reopen'))
if (refusal) {
  console.error(refusal)
  process.exit(1)
}

const snapshot = graphSnapshot(MUSEUM, CONTENT_LOT)
const text = serialiseGraphSnapshot(snapshot)
const before = existsSync(path) ? readText(path) : null

if (!dryRun) {
  mkdirSync(dirname(path), { recursive: true })
  // No byte-order mark and Unix line ends, whatever the machine: the gate
  // compares this file with what it would write itself, byte for byte.
  writeFileSync(path, text, 'utf8')
}

const where = `${RELEASES_DIRECTORY}/${snapshotFileName(CONTENT_LOT)}`
console.log(
  `${where}: ${snapshot.actions.length} actions · ${snapshot.checklist.length} checklist items · ` +
    `${Object.values(snapshot.ids).reduce((sum, ids) => sum + ids.length, 0)} ids · ` +
    `${Object.keys(snapshot.saveFields).length} save fields`,
)
console.log(`SHA-256 ${snapshotDigest(text)}`)
const outcome = before === null ? 'written for the first time.' : before === text ? 'unchanged.' : 'rewritten: the content has grown since it was last written.'
console.log(dryRun ? `dry run, nothing was written; it would have been ${outcome}` : outcome)
