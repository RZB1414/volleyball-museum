/**
 * What a save written by an earlier build needs from the content: the ids of
 * the migrations that brought the opening scene and the porter's calls for
 * each milestone, and the ids a lot renamed.
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
 * What a save from before the Posse (L3) needs: the porter's old news.
 *
 * L3 gave the porter a call for each milestone of the night: the hall lit,
 * Wing 1 lit, the first piece checked, the shortcut pushed open. A player
 * who had done those before he had a line for them would be told all four,
 * one after the other, on the next Continue, about things done last week.
 *
 * Which saves are those is read off the save, not off its stamp: the lot
 * ships in slices, and a save written by an earlier slice carries the same
 * lot as one written by this. The evidence is `helloCallId`, the call every
 * save is owed and hears first. Whoever has not heard it has not met the
 * porter of this lot, and whatever milestone they have passed was passed
 * before he had anything to say about it. The cost, taken on purpose: a new
 * player who leaves the office without the radio, passes a milestone and
 * reloads before hearing him loses the call for that milestone. The hint the
 * radio gives when called says the same thing.
 */
export const PRE_POSSE_SAVE = {
  /** Whoever has not heard this has not met the porter of this lot. */
  helloCallId: 'porter-hello',
  /**
   * A milestone passed before he had a line for it is not news: with `id` in
   * `field` (anything at all in it, for `null`), `callId` counts as heard.
   */
  oldNews: [
    { callId: 'porter-atrium-service', field: 'roomsPowered', id: 'atrium' },
    { callId: 'porter-holyoke-lit', field: 'roomsPowered', id: 'holyoke' },
    { callId: 'porter-shortcut', field: 'doorsReleased', id: 'atrium-from-holyoke-shortcut' },
    { callId: 'porter-first-catalogued', field: 'catalogued', id: null },
  ],
} as const satisfies {
  readonly helloCallId: string
  readonly oldNews: readonly { readonly callId: string; readonly field: ListField; readonly id: string | null }[]
}

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
