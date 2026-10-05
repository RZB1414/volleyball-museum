/**
 * Which lots the plan says are done.
 *
 * The plan (`docs/PLANO-ATE-O-FINAL.md`) writes a dated «Feito em» into the
 * section of a lot as it is published. Two suites read that: `test:docs`
 * holds `CONTENT_LOT` to it, and `test:playthrough` decides by it whether a
 * graph snapshot is still being written (and so has to be the content's own)
 * or is the record of a published lot (and so must never change again).
 */

/**
 * The highest lot whose section of the plan carries a dated «Feito em», or 0.
 *
 * A heading may cover a range (`### L18 a L22 —`); the range counts as done,
 * up to its last lot, when its section says so.
 */
export function lastLotDone(planText: string): number {
  const headings = [...planText.matchAll(/^### L(\d+)(?: a L(\d+))? — /gm)]
  let done = 0
  headings.forEach((heading, index) => {
    const start = heading.index ?? 0
    const next = planText.indexOf('\n### ', start + 1)
    const end = index + 1 < headings.length ? (headings[index + 1].index ?? planText.length) : planText.length
    const section = planText.slice(start, next < 0 ? end : Math.min(end, next))
    if (/Feito em \d{4}-\d{2}-\d{2}/.test(section)) done = Math.max(done, Number(heading[2] ?? heading[1]))
  })
  return done
}
