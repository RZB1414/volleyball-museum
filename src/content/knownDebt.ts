/**
 * Dated debt: what a gate accuses today and a named lot will pay.
 *
 * A validator that arrives late finds the museum already guilty. There were
 * two bad ways out: write the rule as a warning nobody reads, or leave it out
 * until the content is clean, which is the lot it was needed in. A debt line
 * is the third way. The rule is an error from its first day; the accusations
 * that already existed are written here, each with the lot that pays it, and
 * the gate prints the table on every run.
 *
 * The table is held to three rules, and each one fails the gate:
 *
 *   - an accusation with no line is an error like any other;
 *   - a line whose lot has arrived, with the accusation still there, is
 *     `known-debt-overdue`: the date was a promise;
 *   - a line nobody is accused of any more is `known-debt-stale`: it was
 *     paid, so it leaves, or the table stops meaning anything.
 *
 * A line covers one thing (a code and the id it is raised about), never a
 * whole rule.
 *
 * Gate-only, like `validate.ts`: nothing the game ships imports it
 * (`test:facts` checks).
 */

import type { ValidationIssue } from './validate.ts'

/**
 * The npm script that raises a code. Each gate settles its own lines and
 * only those: to the content gate, a debt of the power suite would look paid.
 */
export type DebtGate = 'validate:content' | 'test:power' | 'test:ratchets' | 'test:navigation'

export type KnownDebt = {
  readonly gate: DebtGate
  readonly code: string
  /** What the accusation is about: the `id` of the issue it covers. */
  readonly id: string
  /** The lot that pays it. From that lot on, still owing is an error. */
  readonly untilLot: number
  /** Why it waits, and for what. */
  readonly note: string
}

/**
 * The lot the content stands at: the last one whose work is in this tree.
 * The lot that closes moves it, in the same commit that pays what fell due.
 */
export const CONTENT_LOT = 1

const kitUnused = (id: string): KnownDebt => ({
  gate: 'validate:content',
  code: 'kit-part-unused',
  id,
  untilLot: 5,
  note: 'AS-L6: leaves the GLB or gains a use',
})

const keyUnused = (id: string, untilLot: number, note: string): KnownDebt => ({
  gate: 'validate:content',
  code: 'i18n-key-unused',
  id,
  untilLot,
  note,
})

export const KNOWN_DEBT: readonly KnownDebt[] = [
  // Sixteen recipes, 17,156 triangles in the first download, placed nowhere.
  ...[
    'plinth-block',
    'plinth-tapered',
    'medallion-socket',
    'vitrine-table',
    'vitrine-glass',
    'label-plaque',
    'vitrine-wall',
    'vitrine-tower',
    'partition',
    'frame-empty',
    'interp-panel',
    'banner',
    'reception-desk',
    'threshold',
    'pendant',
    'atrium-wall-bay',
  ].map(kitUnused),

  // Copy for screens that have a lot waiting for them.
  ...['ui.settings', 'ui.brightness', 'ui.motion', 'ui.motion.headbob', 'ui.motion.fov', 'ui.quality'].map(
    (key) => keyUnused(key, 16, 'the settings screen (M27)'),
  ),
  keyUnused('ui.readingMode', 24, 'reading mode (M29)'),
  keyUnused('map.legend', 2, 'the plan (mapModel)'),
  ...['lock.opened', 'lock.hint.highlight', 'lock.hint.audio', 'lock.hint.reveal'].map((key) =>
    keyUnused(key, 4, 'the hint ladder (H-19): shown, or deleted'),
  ),

  // The atrium breaker hangs over the wainscot, a hand's width from the
  // plaster, and its pilot is lit from 2.4 m. The Holyoke one paid both in
  // L1 by moving; this one waits for the lot that redraws the panels as
  // devices and sets the pilots' reach.
  {
    gate: 'validate:content',
    code: 'wall-fixture-off-the-wall',
    id: 'atrium-breaker',
    untilLot: 10,
    note: 'ÁT-A2: 25.5 cm out from the plaster, over the wainscot',
  },
  {
    gate: 'test:power',
    code: 'pilot-reaches-neighbour',
    id: 'atrium-breaker',
    untilLot: 10,
    note: 'ÁT-B4: a 2.4 m pilot 1.06 m from the Holyoke wing (the reach comes down to 0.8 m)',
  },

  // Moving the Holyoke breaker to the far wall made it a lighthouse, and put
  // the interpretation kiosk square across the straight line to it: a player
  // who walks at the red light comes to rest against the kiosk's long face,
  // seven metres short. Getting there is proven by a route that goes round.
  // Clearing the line turns or moves the piece the wing's first view is
  // composed round (about 20 degrees, or 1.7 m), so it waits for the lot
  // that recomposes the wing with the owner looking.
  {
    gate: 'test:navigation',
    code: 'lighthouse-walk-blocked',
    id: 'holyoke-breaker',
    untilLot: 14,
    note: 'the kiosk stands across the straight line from the door to the breaker: re-sited with the wing (L14)',
  },

  // Ratchets held at what was measured, above what the plan budgets. Both
  // figures, and where each ceiling came from, are in `scripts/lib/ratchets.ts`.
  ...(
    [
      ['kit-glb', 6, 'one kit of 2,182 KiB against 800: unused recipes leave in L5, one kit per room in L6'],
      ['programs', 6, '35 shader programs against 25: measured again after the kit merge'],
      ['atrium-draws', 6, 'ÁT-K1: 101 draws on the south-east diagonal against 100, under a ceiling of 102'],
      ['pair-draws', 6, '125 draws with the Holyoke door open against 100 (L17 takes what L6 leaves)'],
      ['resident-texture', 7, '107.08 MiB against 45: KTX2, and wall media inside the budget (D23, D24)'],
    ] as const
  ).map(
    ([id, untilLot, note]): KnownDebt => ({ gate: 'test:ratchets', code: 'ratchet-over-budget', id, untilLot, note }),
  ),
]

/** The lines one gate collects. */
export function debtOf(gate: DebtGate, lines: readonly KnownDebt[] = KNOWN_DEBT): readonly KnownDebt[] {
  return lines.filter((line) => line.gate === gate)
}

/**
 * Applies the table to what a gate raised.
 *
 * An error covered by a line in good standing comes back with severity
 * `debt`, carrying the date and the reason, so that it stops failing the
 * gate and stays on the printed table. Everything else comes back as it
 * was, followed by one error for each line that is overdue or stale.
 *
 * Pass only the lines of the gate that raised `issues` (`debtOf`): a line
 * this gate could never be accused of would be read as paid.
 */
export function settleKnownDebt(
  issues: readonly ValidationIssue[],
  lines: readonly KnownDebt[],
  lot: number,
): ValidationIssue[] {
  const handle = (code: string, id: string) => `${code} ${id}`
  const byHandle = new Map(lines.map((line) => [handle(line.code, line.id), line]))
  const stillRaised = new Set<string>()

  const settled: ValidationIssue[] = issues.map((issue) => {
    if (issue.severity !== 'error' || issue.id === undefined) return issue
    const line = byHandle.get(handle(issue.code, issue.id))
    if (!line) return issue
    stillRaised.add(handle(line.code, line.id))
    // Past its date the accusation is a plain error again.
    if (line.untilLot <= lot) return issue
    return { ...issue, severity: 'debt', debt: { untilLot: line.untilLot, note: line.note } }
  })

  for (const line of lines) {
    const id = `${line.code}:${line.id}`
    if (!stillRaised.has(handle(line.code, line.id))) {
      settled.push({
        severity: 'error',
        code: 'known-debt-stale',
        id,
        message:
          `Debt "${line.code}" on "${line.id}" (until L${line.untilLot}) is no longer raised by ` +
          `${line.gate}: it was paid. Remove the line from KNOWN_DEBT.`,
      })
    } else if (line.untilLot <= lot) {
      settled.push({
        severity: 'error',
        code: 'known-debt-overdue',
        id,
        message:
          `Debt "${line.code}" on "${line.id}" was due in L${line.untilLot} and the content is at ` +
          `L${lot}: pay it (${line.note}). A date is not moved to make the gate pass.`,
      })
    }
  }

  return settled
}
