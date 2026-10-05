/**
 * What a save written by an earlier build needs from the content: the ids of
 * the migration that brought the opening scene, and the ids a lot renamed.
 *
 * Saves from before the opening share the current key and version, so they
 * load as they are: a player who already lit the atrium would hear the
 * porter's first call send them to its breaker, and a player with a full
 * catalogue would find the journal locked until they read a notebook they
 * never saw. Bumping the save version would fix both by deleting the
 * playthrough, which is worse.
 *
 * Its own module with no runtime imports, like `spawn.ts`, so the store can
 * read it without dragging the content set into the title screen's bundle.
 * The validator checks every id here against the real content.
 */

import type { ListField } from '../state/progressFields.ts'

export const PRE_OPENING_SAVE = {
  /** The notebook every returning player is treated as already holding. */
  journalDocumentId: 'doc-welcome',
  /** The porter's first call, which is old news once this room has power. */
  firstCallId: 'porter-first-call',
  firstCallOverOncePowered: 'atrium',
  /**
   * The lesson the journal-taken toast teaches, already learnt by anyone the
   * migration hands the notebook to — or who took it in a build that kept no
   * record of the lesson. The toast reads the same id, so the two cannot drift.
   */
  journalHintId: 'journal-taken',
} as const

/**
 * An id a lot renamed, in the list of the save that holds it.
 *
 * The content can rename a document or a lock; a save cannot be asked to.
 * Without this, a player who read the letter under its old id would find it
 * unread, and a drawer they opened shut again.
 */
export type SaveAlias = {
  /** The lot that renamed it: a record of when, not a condition. */
  readonly sinceLot: number
  readonly field: ListField
  readonly from: string
  readonly to: string
}

/**
 * Where a save holds `from`, it also holds `to`, on every load.
 *
 * The old id stays. Dropping it would be tidier and would break the build
 * from before the rename, which may still be running in another tab on the
 * same save: it knows the old id and nothing of the new one.
 *
 * Empty: nothing has been renamed yet.
 */
export const SAVE_ALIASES: readonly SaveAlias[] = []
