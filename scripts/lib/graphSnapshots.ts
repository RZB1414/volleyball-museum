/**
 * The graph snapshots on disk: where they are, which one the content is held
 * to, and which of them nothing may touch any more.
 *
 * `docs/releases/L<n>.graph.json` is written by `npm run graph:snapshot`, and
 * by nothing else: it is a record of what that lot's players could do. A
 * snapshot goes through three states, and the gate reads each differently.
 *
 *   - The DRAFT of a lot still being written. It has to be the content's own
 *     graph, byte for byte (`test:playthrough`), so it holds the content to
 *     nothing: a lot is never its own judge.
 *   - The snapshot of a lot the plan gives as DONE («Feito em»). Its SHA-256
 *     is pinned below, and the script refuses to write it again unless told
 *     to reopen it. Until the plan also says the lot is PUBLISHED, it still
 *     has to be the content's own: a lot is closed before it is reviewed and
 *     goes out, and what the review adds must be in the record that goes out.
 *   - The RECORD: the snapshot of any lot the content has moved past, or of
 *     its own lot once that is published. The content gate holds the content
 *     to the newest of these on every run (`validateAdditive`), and refuses
 *     to run without one, or with one so old that a whole lot went by
 *     unrecorded: a rule that quietly stops being applied reads exactly like
 *     a rule that passes.
 *
 * Shared by the gate, the script that writes and the suite that proves both.
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { parseGraphSnapshot, type GraphSnapshot } from '../../src/content/additive.ts'
import type { ValidationIssue } from '../../src/content/validate.ts'
import { readText } from './readText.ts'

/** From the repository root. */
export const RELEASES_DIRECTORY = 'docs/releases'

export const snapshotFileName = (lot: number) => `L${lot}.graph.json`

/** The first lot to write a snapshot: L1 closed before there was one, and owes none. */
export const FIRST_SNAPSHOT_LOT = 2

/**
 * The SHA-256 of the snapshot each closed lot left, over the text with Unix
 * line ends.
 *
 * A line is added as the plan gives the lot as done, and changes only if the
 * lot itself is fixed before it is published: `npm run graph:snapshot --
 * --reopen` prints the new one. It is the second key. The first is the file,
 * which a script can rewrite in a second; with the digest beside it, turning
 * a record into something else takes an edit here that says what it is doing.
 */
export const FROZEN_SNAPSHOTS: Readonly<Record<number, string>> = {
  2: '0eae15c3eaba5a4dc2fca5df72d708c0e7b0a73011616c4fb1be2cb8c310a5b1',
}

export type SnapshotOnDisk = {
  /** The lot its file name says. */
  readonly lot: number
  readonly path: string
  readonly text: string
}

export const snapshotDigest = (text: string) => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex')

/** Every snapshot in a directory, lowest lot first; none when the directory is not there. */
export function snapshotsIn(directory: string): SnapshotOnDisk[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory)
    .map((name) => /^L(\d+)\.graph\.json$/.exec(name))
    .flatMap((match) => (match ? [Number(match[1])] : []))
    .sort((first, second) => first - second)
    .map((lot) => {
      const path = join(directory, snapshotFileName(lot))
      // A checkout may hand the file over with the machine's line ends; the
      // script that writes it never does, and it is that text the gate compares.
      return { lot, path, text: readText(path) }
    })
}

/** The snapshot of the highest lot in a directory, or null when it holds none. */
export function newestSnapshot(directory: string): SnapshotOnDisk | null {
  return snapshotsIn(directory).at(-1) ?? null
}

/**
 * The snapshot the content is held to: the newest record, or null.
 *
 * The snapshot of the content's own lot is not a record until that lot is
 * published. It is written before the lot is done (in a middle slice, or as
 * the lot closes) and kept equal to the content from then on, so comparing
 * the content with it accuses nothing, ever. Taking the newest file, as this
 * used to, switched the rule off for a whole lot the day its draft appeared.
 *
 * With no record at all, the content's own snapshot is all there is: that is
 * the first lot to write one, and `snapshotForGate` refuses it of any other.
 */
export function baselineSnapshot(
  snapshots: readonly SnapshotOnDisk[],
  contentLot: number,
  lastPublished: number,
): SnapshotOnDisk | null {
  const isRecord = (snapshot: SnapshotOnDisk) =>
    snapshot.lot < contentLot || (snapshot.lot === contentLot && snapshot.lot <= lastPublished)
  return snapshots.findLast(isRecord) ?? snapshots.find((snapshot) => snapshot.lot === contentLot) ?? null
}

/**
 * The graph the gate holds the content to, or why it may not run.
 *
 * The age rule is the browser record's (`scripts/lib/ratchets.ts`): the lot
 * in progress and the one before it. A record two lots old means a lot closed
 * without writing its own, and everything that lot added could be taken away
 * again with nothing to compare against.
 */
export function snapshotForGate(
  snapshots: readonly SnapshotOnDisk[],
  contentLot: number,
  lastPublished: number,
): { readonly graph: GraphSnapshot | null; readonly issues: readonly ValidationIssue[] } {
  const refuse = (code: string, message: string) => ({
    graph: null,
    issues: [{ severity: 'error' as const, code, id: RELEASES_DIRECTORY, message }],
  })
  const baseline = baselineSnapshot(snapshots, contentLot, lastPublished)
  if (!baseline) {
    return refuse(
      'graph-snapshot-missing',
      `There is no graph snapshot in ${RELEASES_DIRECTORY}: nothing holds this content to what the lot before it gave. ` +
        `Run \`npm run graph:snapshot\` and commit the file.`,
    )
  }
  let graph: GraphSnapshot
  try {
    graph = parseGraphSnapshot(baseline.text)
  } catch (error) {
    return refuse('graph-snapshot-invalid', `${baseline.path} cannot be read: ${error instanceof Error ? error.message : error}`)
  }
  if (graph.lot !== baseline.lot) {
    return refuse('graph-snapshot-invalid', `${baseline.path} says it is the graph of L${graph.lot}: a snapshot is written by the script, never renamed.`)
  }
  const ownDraft = baseline.lot === contentLot && baseline.lot > lastPublished
  if (graph.lot < contentLot - 1 || (ownDraft && contentLot > FIRST_SNAPSHOT_LOT)) {
    return refuse(
      'graph-snapshot-stale',
      `The content is at L${contentLot} and ${RELEASES_DIRECTORY} holds no record of L${contentLot - 1}` +
        `${ownDraft ? ` (only L${contentLot}'s own draft, which is the content itself)` : ` (the newest is L${graph.lot}'s)`}: ` +
        `L${contentLot - 1} closed without writing its own, so what it added is held to nothing. ` +
        `Run \`npm run graph:snapshot\` on the tree L${contentLot - 1} published.`,
    )
  }
  return { graph, issues: [] }
}

/**
 * What is wrong between the lots the plan gives as done and the snapshots on
 * disk: a closed lot with no file, with a file whose digest nobody pinned, or
 * with a file that is not the one it closed with.
 *
 * Every closed lot and not only the last: the record of L2 still says what a
 * save of L2 holds when the content is at L9.
 */
export function frozenSnapshotProblems(
  snapshots: readonly SnapshotOnDisk[],
  lastDone: number,
  frozen: Readonly<Record<number, string>> = FROZEN_SNAPSHOTS,
): string[] {
  const problems: string[] = []
  for (let lot = FIRST_SNAPSHOT_LOT; lot <= lastDone; lot += 1) {
    const where = `${RELEASES_DIRECTORY}/${snapshotFileName(lot)}`
    const snapshot = snapshots.find((candidate) => candidate.lot === lot)
    if (!snapshot) {
      problems.push(`${where} is missing: the plan gives L${lot} as done, and a lot that closes writes down what it gave its players.`)
      continue
    }
    const digest = snapshotDigest(snapshot.text)
    if (!frozen[lot]) {
      problems.push(
        `${where} is the record of a closed lot and its SHA-256 is pinned nowhere: anything could rewrite it. ` +
          `Add \`${lot}: '${digest}'\` to FROZEN_SNAPSHOTS in scripts/lib/graphSnapshots.ts.`,
      )
    } else if (frozen[lot] !== digest) {
      problems.push(
        `${where} is not the file L${lot} closed with (SHA-256 ${digest}, pinned ${frozen[lot]}). ` +
          `It is a record: restore it (\`git checkout -- ${where}\`) unless L${lot} itself was fixed before it was published, ` +
          `and in that case pin the new digest in scripts/lib/graphSnapshots.ts, in the same commit.`,
      )
    }
  }
  for (const lot of Object.keys(frozen).map(Number)) {
    if (lot > lastDone) problems.push(`L${lot} is pinned in FROZEN_SNAPSHOTS and the plan does not give it as done: a digest is pinned as the lot closes, not before.`)
  }
  return problems
}

/**
 * Why `npm run graph:snapshot` must not write the file of the lot the content
 * is at, or null when it may.
 *
 * `CONTENT_LOT` only moves in the slice that pays the lot's debts, so the
 * first slices of a lot run with the constant still at the lot before. The
 * script wrote that lot's file all the same: its record, rewritten with the
 * next lot's content in it, and from then on compared with itself.
 */
export function snapshotWriteRefusal(contentLot: number, lastDone: number, reopen: boolean): string | null {
  if (contentLot > lastDone || reopen) return null
  const where = `${RELEASES_DIRECTORY}/${snapshotFileName(contentLot)}`
  return (
    `${where} is the record of a lot the plan gives as done, and is not written again. ` +
    `If this is the next lot's work, the content is compared with that file as it is; its own snapshot is written once CONTENT_LOT moves. ` +
    `If L${contentLot} itself was fixed before going out, run \`npm run graph:snapshot -- --reopen\` ` +
    `and pin the SHA-256 it prints in scripts/lib/graphSnapshots.ts.`
  )
}
