/**
 * CI gate for the content set.
 *
 *   npm run validate:content
 *
 * Exits non-zero on any error-severity issue. Warnings print but do not fail —
 * they flag design smells (a passive exhibit, a wing with no shortcut back)
 * that are judgement calls rather than bugs. Dated debts (`knownDebt.ts`)
 * print on every run and do not fail until the lot that pays them arrives;
 * so do the dated promises of the content itself (a line of the list with no
 * box, a thing that only says why not), which fail when their lot comes.
 *
 * The content is also held to the graph the last lot wrote down as it closed
 * (`docs/releases`): with no snapshot to compare against, or one a whole lot
 * out of date, the gate fails rather than pass a rule it did not apply. The
 * snapshot of the lot being written is not that record: it follows the
 * content, and would accuse it of nothing (`scripts/lib/graphSnapshots.ts`).
 */

import { fileURLToPath } from 'node:url'

import { BAKED_BUNDLES, BAKE_TOTALS } from '../src/content/bake.generated.ts'
import { goodCaptures } from '../src/content/factCapture.ts'
import { FACT_BANK } from '../src/content/facts.bank.ts'
import { CAPTURED_SOURCES } from '../src/content/facts.generated.ts'
import { MANUAL_CAPTURES } from '../src/content/facts.manual.ts'
import { en } from '../src/content/i18n/en.ts'
import { ptBR } from '../src/content/i18n/pt-BR.ts'
import { CONTENT_LOT, debtOf } from '../src/content/knownDebt.ts'
import { MUSEUM } from '../src/content/museum.ts'
import { formatScript, simulateProgress } from '../src/content/simulate.ts'
import { datedPromises, formatIssues, formatKnownDebt, validateContent } from '../src/content/validate.ts'
import { RELEASES_DIRECTORY, snapshotForGate, snapshotsIn } from './lib/graphSnapshots.ts'
import { readMediaTexts } from './lib/mediaTexts.ts'
import { lastLotPublished } from './lib/planLots.ts'
import { KEY_NAMED_NOT_USED, keysCitedIn, readSourceTree } from './lib/translationUsage.ts'
import { readText } from './lib/readText.ts'

// The committed record of what each source held, never the network: the gate
// has to give the same verdict offline (`npm run facts:capture` is the
// writing side, outside the gate).
const captures = { bank: FACT_BANK, captured: CAPTURED_SOURCES, manual: MANUAL_CAPTURES }

// Imported from the dictionary modules rather than `src/i18n.ts`: that one pulls
// in the zustand store, and the gate must run in bare Node with no DOM.
const translationKeys = new Set(Object.keys(ptBR))

// What the code itself asks the dictionary for.
const keysCitedByCode = keysCitedIn(
  translationKeys,
  readSourceTree(fileURLToPath(new URL('../src', import.meta.url)), KEY_NAMED_NOT_USED),
)

// What is lettered on the authored images: text the museum prints outside
// any dictionary, read by the numeral lint with everything else.
const mediaTexts = readMediaTexts(MUSEUM.media, fileURLToPath(new URL('../public', import.meta.url)))

// What the lot before this one gave its players, as it wrote it down. The
// plan says whether the content's own lot has gone out, which is when its
// own snapshot becomes a record too.
const plan = readText(new URL('../docs/PLANO-ATE-O-FINAL.md', import.meta.url))
const releases = fileURLToPath(new URL(`../${RELEASES_DIRECTORY}`, import.meta.url))
const previous = snapshotForGate(snapshotsIn(releases), CONTENT_LOT, lastLotPublished(plan))

const issues = [
  ...validateContent(MUSEUM, BAKED_BUNDLES, translationKeys, captures, {
    dictionaries: { 'pt-BR': ptBR, en },
    mediaTexts,
    keysCitedByCode,
    knownDebt: { lines: debtOf('validate:content'), lot: CONTENT_LOT },
    ...(previous.graph ? { previousGraph: previous.graph } : {}),
  }),
  ...previous.issues,
]
const errors = issues.filter((issue) => issue.severity === 'error')
const warnings = issues.filter((issue) => issue.severity === 'warning')
const debts = issues.filter((issue) => issue.severity === 'debt')

console.log(
  `content: ${MUSEUM.rooms.length} rooms · ${MUSEUM.exhibits.length} exhibits · ` +
    `${MUSEUM.documents.length} documents · ${MUSEUM.locks.length} locks · ` +
    `${MUSEUM.facts.length} facts · ${MUSEUM.media.length} media`,
)
const sourcesRead = FACT_BANK.reduce((sum, entry) => sum + goodCaptures(entry, captures).length, 0)
const sourcesNamed = FACT_BANK.reduce((sum, entry) => sum + entry.sources.length, 0)
console.log(
  `sources: ${FACT_BANK.length} facts in the bank · ${sourcesRead} of ${sourcesNamed} sources read and holding the value · ` +
    `${MANUAL_CAPTURES.filter((entry) => !entry.check).length} awaiting a person`,
)
console.log(
  `bake:    ${BAKED_BUNDLES.length} bundles · ${(BAKE_TOTALS.bytes / 1024).toFixed(0)} KB · ` +
    `${BAKE_TOTALS.triangles.toLocaleString('en-US')} triangles`,
)
console.log(
  previous.graph
    ? `graph:   held to L${previous.graph.lot}'s snapshot · ${previous.graph.actions.length} actions it gave`
    : 'graph:   no snapshot to hold the content to',
)

// The script: what a player who does everything in reach has done, round by
// round. Printed on every run so that a level that moved is seen to move.
console.log('\nscript, by the exhaustive player:')
console.log(formatScript(simulateProgress(MUSEUM).levels))

// Before the verdict, so a green run still shows what it is letting through.
const promises = datedPromises(MUSEUM)
if (debts.length + promises.length > 0) {
  console.log(`\nknown debt, content at L${CONTENT_LOT}: ${debts.length} dated line(s)`)
  console.log(formatKnownDebt(issues, promises))
}

if (errors.length + warnings.length === 0) {
  console.log('\nAll checks passed.')
} else {
  console.log('')
  console.log(formatIssues(issues))
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
}

if (errors.length > 0) process.exitCode = 1
