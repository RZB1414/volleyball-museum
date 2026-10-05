/**
 * What the content knows about progress and the store must not import.
 *
 * The store is on the title screen. The consequences of a save (a catalogued
 * piece that hands over a key, a drawer that sets a flag) are content, and
 * the content is behind the button, in the canvas chunk. So the store holds a
 * slot and the canvas chunk fills it, once (`engine/contentRegistry.ts`).
 *
 * The contract is one function on purpose. Triggers, conditions and the
 * museum stay on the far side of it; all the store learns is "this is the
 * save with everything that follows from it".
 *
 * No runtime import at all: whatever this file imported would ship with the
 * title screen (`npm run test:save` walks the store's imports).
 */

import type { Progress } from './progressFields.ts'

export type ProgressRules = {
  /** Every due trigger, run to the fixed point. Its own argument when nothing fired. */
  readonly settle: (progress: Progress) => Progress
}

let registered: ProgressRules | null = null
const listeners = new Set<() => void>()

/**
 * Hands the store its rules, and tells every store that is listening: a save
 * loaded before the content arrived may already be owed something.
 *
 * Called again when the content module is replaced in development; the last
 * registration is the one that counts.
 */
export function registerProgressRules(rules: ProgressRules): void {
  registered = rules
  // A copy: a listener may leave while it is being told.
  for (const listener of [...listeners]) listener()
}

/** The rules, or null while the content has not been asked for yet. */
export function progressRules(): ProgressRules | null {
  return registered
}

/** Calls `listener` at every registration from now on; the result stops it. */
export function onProgressRulesRegistered(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
