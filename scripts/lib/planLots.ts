/**
 * Which lots the plan says are done, and which it says are published.
 *
 * The plan (`docs/PLANO-ATE-O-FINAL.md`) writes a dated «Feito em» into the
 * section of a lot as the lot CLOSES: the work is done, its record is
 * written, and review, push and deploy are still to come. When the lot goes
 * out the line becomes «Feito em AAAA-MM-DD e publicado». The two are not the
 * same moment, and reading the first as the second switched a gate off for
 * the days in between.
 *
 *   - `lastLotDone`: `test:docs` holds `CONTENT_LOT` to it, `test:qa-save`
 *     asks a save of every closed lot, and the graph snapshot of a closed lot
 *     is pinned by its digest and not written again without `--reopen`.
 *   - `lastLotPublished`: until the content's own lot is published, its graph
 *     snapshot has to follow the content byte for byte (`test:playthrough`),
 *     so that a fix made between the closing and the push is in the record.
 */

/** The highest lot whose section of the plan matches `said`, or 0. */
function lastLotSaying(planText: string, said: RegExp): number {
  const headings = [...planText.matchAll(/^### L(\d+)(?: a L(\d+))? — /gm)]
  let last = 0
  headings.forEach((heading, index) => {
    const start = heading.index ?? 0
    const next = planText.indexOf('\n### ', start + 1)
    const end = index + 1 < headings.length ? (headings[index + 1].index ?? planText.length) : planText.length
    const section = planText.slice(start, next < 0 ? end : Math.min(end, next))
    if (said.test(section)) last = Math.max(last, Number(heading[2] ?? heading[1]))
  })
  return last
}

/**
 * The highest lot whose section of the plan carries a dated «Feito em», or 0.
 *
 * A heading may cover a range (`### L18 a L22 —`); the range counts as done,
 * up to its last lot, when its section says so.
 */
export function lastLotDone(planText: string): number {
  return lastLotSaying(planText, /Feito em \d{4}-\d{2}-\d{2}/)
}

/**
 * The highest lot whose section says «Feito em AAAA-MM-DD e publicado», or 0.
 *
 * The whole phrase and not the word: «Feito em 2026-10-04, ainda não
 * publicado» is how a closed lot is written up, and holds the word too.
 */
export function lastLotPublished(planText: string): number {
  return lastLotSaying(planText, /Feito em \d{4}-\d{2}-\d{2} e publicado/)
}
