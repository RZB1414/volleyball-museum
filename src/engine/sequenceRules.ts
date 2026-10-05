/**
 * Directed sequences, as a rule over the content and the save.
 *
 * A sequence is something the game shows by itself, once: the card that says
 * a term was signed, the lines that close the night. Whether one is owed is
 * asked of the save alone, so that a reload in the middle of one finds it
 * still owed, and a tab told that another tab watched it to the end finds it
 * seen.
 *
 * Pure. The store plays one (`startSequence`, `advanceSequence`), the
 * director starts it (`sequenceDirector.ts`), the HUD draws it.
 */

import type { DirectedSequence, MuseumContent } from '../content/schema'
import { progressConditionMet, type ConditionProgress } from './progressCondition.ts'

/** The save, as far as a sequence reads it. A list not handed over is the save in which nothing was shown. */
export type SequenceProgress = ConditionProgress & { readonly sequencesSeen?: readonly string[] }

/** The first sequence owed and not seen, in the order written: one at a time. */
export function dueSequence(
  sequences: readonly DirectedSequence[],
  progress: SequenceProgress,
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
): DirectedSequence | null {
  const seen = Array.isArray(progress.sequencesSeen) ? progress.sequencesSeen : []
  return (
    sequences.find((sequence) => !seen.includes(sequence.id) && progressConditionMet(sequence.when, progress, content)) ??
    null
  )
}
