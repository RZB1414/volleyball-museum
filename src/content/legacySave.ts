/**
 * What a save written before the opening scene existed needs from the content.
 *
 * Those saves share the current key and version, so they load as they are: a
 * player who already lit the atrium would hear the porter's first call send
 * them to its breaker, and a player with a full catalogue would find the
 * journal locked until they read a notebook they never saw. Bumping the save
 * version would fix both by deleting the playthrough, which is worse.
 *
 * Its own module with no runtime imports, like `spawn.ts`, so the store can
 * read it without dragging the content set into the title screen's bundle.
 * The validator checks every id here against the real content.
 */

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
