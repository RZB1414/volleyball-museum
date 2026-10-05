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
 * The lot every line below is judged at. It lives in `contentLot.ts` because
 * the store stamps saves with it and may not import this table; the gates
 * keep reading it from here.
 */
export { CONTENT_LOT } from './contentLot.ts'

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

  // The exhaustive player that replaced the solvability walk (L2) is moved by
  // the game's own rules, the ruler of the examine view among them, and found
  // what the walk took for granted. The view holds a piece by its origin, and
  // the required detail of each of these three is at the hold distance or
  // beyond it, or shows inside a cone a hand does not find: no save has them.
  // The examine lot gives large pieces a view of their own.
  ...(
    [
      ['net-1897', 'H-01: the tape is 1.98 m from the origin the view holds at 0.42 m, so it is always behind the camera'],
      ['gym-suit', 'H-01: the knit is 1.21 m from the origin the view holds at 0.42 m, so it is always behind the camera'],
      ['photo-gym', 'H-01: the apparatus shows inside a cone of 1.5°, against the 5° a hand finds'],
    ] as const
  ).map(
    ([id, note]): KnownDebt => ({ gate: 'validate:content', code: 'exhibit-uncataloguable', id, untilLot: 4, note }),
  ),
  // The fourth detail out of reach is one nothing waits for, so no piece's
  // accusation names it: it has a line of its own, or the day the net
  // catalogues nothing would say the socket is still content nobody can see.
  {
    gate: 'validate:content',
    code: 'hotspot-unreachable',
    id: 'net-1897:socket',
    untilLot: 4,
    note: 'H-01: the post socket is 2.4 m from the origin the view holds at 0.42 m; the view for large pieces brings it in, or it becomes a detail of the model',
  },
  // And with three pieces out of reach, the notebook's "catalogue everything"
  // can never be ticked. (The line about the vault never could either, and
  // is not a debt any more: it is a promise with a date and no box, held to
  // its lot by `validateDeferred`.)
  {
    gate: 'validate:content',
    code: 'checklist-item-untickable',
    id: 'notebook.todo.catalogue',
    untilLot: 4,
    note: 'asks for all twelve pieces, and three cannot be catalogued (H-01)',
  },

  // The text lint (L2) reads what the museum prints, and found two things
  // written before there was a rule. The predecessor's note counts the
  // museum's age from today; it is a document, so it is held to the rule for
  // collection text, and it leaves with the lot that replaces it by the
  // handover sheet. (The other was three answers of the porter's that spoke
  // of the dark, the blackout and the rain whatever the night was doing: an
  // answer has a `when` since L3, and they look first.)
  {
    gate: 'validate:content',
    code: 'text-ages',
    id: 'document.predecessor.body',
    untilLot: 3,
    note: 'H-23: «existe há cento e trinta anos»; the note gives way to `doc-otavio-handover`',
  },
  // The rain in the dead air is said while it rains, which is until the pump
  // has dried the basement (`flagsUnset: ['basement-drained']`). The pump is
  // the vault's lot. Until then nothing sets the flag and it rains all
  // night, which is the truth of this build; the condition is already the
  // one L12 needs, and a `when` that asked something else would be there
  // only to quieten the lint.
  {
    gate: 'validate:content',
    code: 'flag-never-set',
    id: 'basement-drained',
    untilLot: 12,
    note: 'DL3-14: «(Nada. Só a chuva.)» waits for the absence of a flag the pump sets (L12); until then it rains all night',
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
  // The flood (L2) walks the capsule up to every interactive, and no piece
  // has a collider. Eleven of the twelve stand on or in furniture that
  // stops it short. The net stands on the floor by itself: the capsule
  // walks through the cords and the eye, at 1.62 m, ends inside the box the
  // ray is cast at. The wing's lot gives the net a blade of collision.
  {
    gate: 'test:navigation',
    code: 'standing-point-inside-target',
    id: 'net-1897',
    untilLot: 14,
    note: 'H-31: no collider, so the place nearest the net has the eye inside its own box',
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
