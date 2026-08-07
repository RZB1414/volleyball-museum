/**
 * CI gate for the content set.
 *
 *   npm run validate:content
 *
 * Exits non-zero on any error-severity issue. Warnings print but do not fail —
 * they flag design smells (a passive exhibit, a wing with no shortcut back)
 * that are judgement calls rather than bugs.
 */

import { BAKED_BUNDLES, BAKE_TOTALS } from '../src/content/bake.generated.ts'
import { ptBR } from '../src/content/i18n/pt-BR.ts'
import { MUSEUM } from '../src/content/museum.ts'
import { formatIssues, validateContent } from '../src/content/validate.ts'

// Imported from the dictionary module rather than `src/i18n.ts`: that one pulls
// in the zustand store, and the gate must run in bare Node with no DOM.
const issues = validateContent(MUSEUM, BAKED_BUNDLES, new Set(Object.keys(ptBR)))
const errors = issues.filter((issue) => issue.severity === 'error')
const warnings = issues.filter((issue) => issue.severity === 'warning')

console.log(
  `content: ${MUSEUM.rooms.length} rooms · ${MUSEUM.exhibits.length} exhibits · ` +
    `${MUSEUM.documents.length} documents · ${MUSEUM.locks.length} locks · ` +
    `${MUSEUM.facts.length} facts · ${MUSEUM.media.length} media`,
)
console.log(
  `bake:    ${BAKED_BUNDLES.length} bundles · ${(BAKE_TOTALS.bytes / 1024).toFixed(0)} KB · ` +
    `${BAKE_TOTALS.triangles.toLocaleString('en-US')} triangles`,
)

if (issues.length === 0) {
  console.log('\nAll checks passed.')
} else {
  console.log('')
  console.log(formatIssues(issues))
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
}

if (errors.length > 0) process.exitCode = 1
