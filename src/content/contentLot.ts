/**
 * The lot the content stands at: the last one whose work is in this tree.
 * The lot that closes moves it, in the same commit that pays what fell due.
 *
 * Two readers, and that is why it has a module to itself. The gate judges
 * every dated debt against it (`knownDebt.ts`, which is gate-only and
 * re-exports it). The store stamps every save with it (`progress.contentLot`),
 * so that a later lot can tell a save written before it from one written
 * after, and the store is on the title screen: no imports here, like
 * `spawn.ts`, or the content set would follow this number into the first
 * download.
 */
export const CONTENT_LOT = 1
