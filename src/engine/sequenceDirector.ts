/**
 * Starting a directed sequence, and moving one on.
 *
 * Imperative and React-free, like `radioCall.ts`: the HUD's overlay asks it
 * to start whatever is owed, R and the radio's icon ask it to skip a step,
 * and the suites and the playthrough robot make the same two calls against a
 * store and a content of their own.
 *
 * What is owed is the rule's to say (`sequenceRules.ts`), asked of the save.
 * What is on screen is the store's (`sequence`), and belongs to the session:
 * a sequence is recorded as seen at its last step and not before, so one
 * that a closed tab cut off is found owed again and starts from its card.
 */

import { MUSEUM } from '../content/museum.ts'
import type { MuseumContent, SequenceStep } from '../content/schema'
import { isModalOpen, useMuseum } from '../state/store.ts'
import { radioLineSeconds } from './deviceRules.ts'
import { dueSequence } from './sequenceRules.ts'

/** What the director reads of a content: its sequences, and what their conditions name. */
type SequenceContent = Pick<MuseumContent, 'rooms' | 'exhibits' | 'sequences'>
/** The store it works: the game's own, or one tab's in a suite. */
type SequenceStore = Pick<typeof useMuseum, 'getState'>

/** The sequence owed to the game's own save is put on screen, unless something holds it. */
export function startDueSequence(held: boolean) {
  return startDueSequenceOn(useMuseum, MUSEUM, held)
}

/**
 * The same, against a store and a content handed in. True when one started.
 *
 * Nothing starts on the title screen, over a sequence already playing, or
 * while `held`: under a modal, in a hidden tab, before the scene is there to
 * be looked at. Those are the holds a call of the porter's waits for, and
 * for the same reason: what plays to nobody is recorded as seen all the same.
 * Starting one takes the air from the radio (the store's `startSequence`).
 */
export function startDueSequenceOn(store: SequenceStore, content: SequenceContent, held: boolean): boolean {
  const state = store.getState()
  if (held || !state.started || state.sequence !== null) return false
  const due = dueSequence(content.sequences ?? [], state.progress, content)
  if (!due) return false
  state.startSequence(due.id, due.steps.length)
  return true
}

/** R, or the radio's icon, during a sequence of the game. */
export function skipSequenceStep() {
  return skipSequenceStepOn(useMuseum)
}

/**
 * A sequence on screen is moved on a step; from its last, it is over and on
 * record. True when the press was taken. Not under a modal: the sequence is
 * held there, hidden, and a key must not turn a page nobody can see.
 */
export function skipSequenceStepOn(store: SequenceStore): boolean {
  const state = store.getState()
  if (state.sequence === null || isModalOpen(state)) return false
  state.advanceSequence()
  return true
}

/** The sequence of a content the store says is playing, if the content has it. */
export function sequencePlaying(content: Pick<MuseumContent, 'sequences'>, playing: { readonly id: string } | null) {
  return playing === null ? undefined : (content.sequences ?? []).find((sequence) => sequence.id === playing.id)
}

/**
 * How long a step stays up, in seconds: a card for the time the content
 * gives it, a line for a reading pace over its words (`radioLineSeconds`,
 * the measure of every subtitle).
 */
export function sequenceStepSeconds(step: SequenceStep, text: string): number {
  return step.kind === 'card' ? step.seconds : radioLineSeconds(text)
}
