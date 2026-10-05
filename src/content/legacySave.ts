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
 * What a save from before the Posse (L3) needs: the porter's old news, and a
 * word about the drawer that held a key.
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
 *
 * The drawer is the other half, and does not wait for the first. L3 pinned a
 * key to what is in it, handed over as the drawer opens: a trigger of the
 * lock (`triggerId`, as the content compiles it). A save in which the drawer
 * is open and that trigger never fired opened it before there was a key: the
 * player read a note that mentioned none. The content hands such a save its
 * key as it loads, like any trigger owed; what the load adds is `flag`, the
 * mark that says so, for the porter to ask by: «olha de novo a gaveta» for
 * that player, and «tinha o quê?» for the one whose drawer opens tonight.
 * The evidence is the save's own, for the reason above, so it is also read
 * off what a tab of the build before leaves on the disk while this one is
 * open. A rollback to a build that keeps no record of triggers is read the
 * same way on the way back, and is given the same key once more: a key is a
 * thing it is safe to hand over twice.
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
  /** Open, with the trigger that hands over its key not on record: it was opened before it held one. */
  drawer: { lockId: 'office-drawer', triggerId: 'lock:office-drawer:opened', flag: 'legacy-pre-L3-drawer' },
} as const satisfies {
  readonly helloCallId: string
  readonly oldNews: readonly { readonly callId: string; readonly field: ListField; readonly id: string | null }[]
  readonly drawer: { readonly lockId: string; readonly triggerId: string; readonly flag: string }
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
 */
export const SAVE_ALIASES: readonly SaveAlias[] = [
  // The predecessor's note in the drawer gave way to the first sheet of his
  // handover (L3). A player who read the one has read what is in the drawer,
  // and finds the sheet in the archive instead of a paper marked unread in a
  // drawer already open.
  { sinceLot: 3, field: 'documentsRead', from: 'doc-predecessor', to: 'doc-otavio-handover' },
]
