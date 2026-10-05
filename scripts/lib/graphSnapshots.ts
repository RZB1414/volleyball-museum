/**
 * The graph snapshots on disk: where they are, which one is the newest, and
 * whether it is recent enough to hold the content to.
 *
 * `docs/releases/L<n>.graph.json` is written by `npm run graph:snapshot` as a
 * lot closes, and by nothing else: it is a record of what that lot's players
 * could do. The content gate compares the content with the newest one on
 * every run (`validateAdditive`), and so has to refuse to run without one, or
 * with one so old that a whole lot went by unrecorded: a rule that quietly
 * stops being applied reads exactly like a rule that passes.
 *
 * Shared by the gate, the script that writes and the suite that proves both.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parseGraphSnapshot, type GraphSnapshot } from '../../src/content/additive.ts'
import type { ValidationIssue } from '../../src/content/validate.ts'

/** From the repository root. */
export const RELEASES_DIRECTORY = 'docs/releases'

export const snapshotFileName = (lot: number) => `L${lot}.graph.json`

export type SnapshotOnDisk = {
  /** The lot its file name says. */
  readonly lot: number
  readonly path: string
  readonly text: string
}

/** The snapshot of the highest lot in a directory, or null when it holds none. */
export function newestSnapshot(directory: string): SnapshotOnDisk | null {
  if (!existsSync(directory)) return null
  const lots = readdirSync(directory)
    .map((name) => /^L(\d+)\.graph\.json$/.exec(name))
    .flatMap((match) => (match ? [Number(match[1])] : []))
  if (lots.length === 0) return null
  const lot = Math.max(...lots)
  const path = join(directory, snapshotFileName(lot))
  // A checkout may hand the file over with the machine's line ends; the
  // script that writes it never does, and it is that text the gate compares.
  return { lot, path, text: readFileSync(path, 'utf8').replaceAll('\r\n', '\n') }
}

/**
 * The newest snapshot as the gate may use it, or why it may not.
 *
 * The age rule is the browser record's (`scripts/lib/ratchets.ts`): the lot
 * in progress and the one before it. A snapshot two lots old means a lot
 * closed without writing its own, and everything that lot added could be
 * taken away again with nothing to compare against.
 */
export function snapshotForGate(
  newest: SnapshotOnDisk | null,
  contentLot: number,
): { readonly graph: GraphSnapshot | null; readonly issues: readonly ValidationIssue[] } {
  const refuse = (code: string, message: string) => ({
    graph: null,
    issues: [{ severity: 'error' as const, code, id: RELEASES_DIRECTORY, message }],
  })
  if (!newest) {
    return refuse(
      'graph-snapshot-missing',
      `There is no graph snapshot in ${RELEASES_DIRECTORY}: nothing holds this content to what the lot before it gave. ` +
        `Run \`npm run graph:snapshot\` and commit the file.`,
    )
  }
  let graph: GraphSnapshot
  try {
    graph = parseGraphSnapshot(newest.text)
  } catch (error) {
    return refuse('graph-snapshot-invalid', `${newest.path} cannot be read: ${error instanceof Error ? error.message : error}`)
  }
  if (graph.lot !== newest.lot) {
    return refuse('graph-snapshot-invalid', `${newest.path} says it is the graph of L${graph.lot}: a snapshot is written by the script, never renamed.`)
  }
  if (graph.lot < contentLot - 1) {
    return refuse(
      'graph-snapshot-stale',
      `The newest graph snapshot is L${graph.lot}'s and the content is at L${contentLot}: L${contentLot - 1} closed without ` +
        `writing its own, so what it added is held to nothing. Run \`npm run graph:snapshot\` on the tree L${contentLot - 1} published.`,
    )
  }
  return { graph, issues: [] }
}
