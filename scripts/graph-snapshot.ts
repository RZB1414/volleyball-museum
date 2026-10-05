/**
 * Writes the graph of the content as it stands, for the lot it stands at.
 *
 *   npm run graph:snapshot
 *
 * Run as a lot closes (step 12 of the plan's §9.1), on the tree that is
 * published. The file, `docs/releases/L<n>.graph.json`, is what the next lot's
 * content is compared with on every run of the gate (`validateAdditive`):
 * every action a player of this lot could take, what each asked and gave,
 * every id a save of this lot can hold.
 *
 * It only ever writes the file of the lot the content is at. The snapshot of
 * a lot that has been published is a record, and nothing here can touch it.
 * Writing again with nothing changed changes no byte.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { graphSnapshot, serialiseGraphSnapshot } from '../src/content/additive.ts'
import { CONTENT_LOT } from '../src/content/contentLot.ts'
import { MUSEUM } from '../src/content/museum.ts'
import { RELEASES_DIRECTORY, snapshotFileName } from './lib/graphSnapshots.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const path = join(ROOT, RELEASES_DIRECTORY, snapshotFileName(CONTENT_LOT))

const snapshot = graphSnapshot(MUSEUM, CONTENT_LOT)
const text = serialiseGraphSnapshot(snapshot)
const before = existsSync(path) ? readFileSync(path, 'utf8') : null

mkdirSync(dirname(path), { recursive: true })
// No byte-order mark and Unix line ends, whatever the machine: the gate
// compares this file with what it would write itself, byte for byte.
writeFileSync(path, text, 'utf8')

const where = `${RELEASES_DIRECTORY}/${snapshotFileName(CONTENT_LOT)}`
console.log(
  `${where}: ${snapshot.actions.length} actions · ${snapshot.checklist.length} checklist items · ` +
    `${Object.values(snapshot.ids).reduce((sum, ids) => sum + ids.length, 0)} ids · ` +
    `${Object.keys(snapshot.saveFields).length} save fields`,
)
console.log(before === null ? 'written for the first time.' : before === text ? 'unchanged.' : 'rewritten: the content has grown since it was last written.')
