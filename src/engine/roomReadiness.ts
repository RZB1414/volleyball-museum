/**
 * When a room's detail may go to the GPU warm-up, and how long the museum
 * waits for the part of it that has not arrived.
 *
 * A room is handed to the warm-up queue once, as a whole: its three Suspense
 * boundaries (collection, furniture, wall art) have committed and every text
 * has synchronised. A door opens only on a room whose warm-up has settled.
 * That is what makes a room appear furnished behind an opening leaf, and it
 * had no way out: one wall image that never arrived kept the third boundary
 * suspended, the room never reached the queue, and the office door, the only
 * door of the room every session starts in, stayed on "Preparing the next
 * room…" for good.
 *
 * So the wait has a limit. It is counted in GAME time and only while the
 * room is mounted and incomplete: thirty seconds during which the player is
 * reading the notebook and finding the lamp, long enough that a slow network
 * is not cut short, with each frame worth at most a tenth of a second so
 * that a tab coming back from the background does not spend the limit in
 * one step. When it runs out the room is DEGRADED: it warms up and opens
 * with what it has. Whatever arrives afterwards is drawn without a warm-up
 * (one hitch) and does not send the room back to waiting, because by then a
 * door may already stand open on it.
 *
 * Pure: no React, no three. `MuseumScene` advances it once a frame;
 * `test:gpu-warmup` runs it against the real door state machine.
 */

/** Game seconds a mounted, incomplete room is waited for. */
export const ROOM_DETAIL_TIMEOUT_SECONDS = 30
/** The most one frame may count towards the limit. */
export const ROOM_DETAIL_MAX_STEP_SECONDS = 0.1
/** Collection, furniture and wall art: one bit per Suspense boundary. */
export const ALL_DETAIL_BOUNDARIES_COMMITTED = 0b111

export type RoomDetailWait = Readonly<{
  /** Game seconds waited so far, mounted and incomplete. */
  elapsedSeconds: number
  /** The limit ran out: the room goes on with what it has. */
  degraded: boolean
}>

export const ROOM_DETAIL_WAIT_IDLE: RoomDetailWait = Object.freeze({ elapsedSeconds: 0, degraded: false })

/** Float sums of sixtieths never land on thirty exactly. */
const LIMIT_EPSILON = 1e-6

/** One frame of waiting. Returns the same object when nothing changed. */
export function advanceRoomDetailWait(
  wait: RoomDetailWait,
  step: { readonly mounted: boolean; readonly complete: boolean; readonly deltaSeconds: number },
): RoomDetailWait {
  // A room that is not mounted is not being waited for; mounted again later,
  // it is given the whole limit again.
  if (!step.mounted) return wait === ROOM_DETAIL_WAIT_IDLE ? wait : ROOM_DETAIL_WAIT_IDLE
  // Not taken back while the room stays mounted, even if the rest arrives.
  if (wait.degraded) return wait
  if (step.complete) return wait.elapsedSeconds === 0 ? wait : ROOM_DETAIL_WAIT_IDLE

  const delta = Number.isFinite(step.deltaSeconds)
    ? Math.min(Math.max(step.deltaSeconds, 0), ROOM_DETAIL_MAX_STEP_SECONDS)
    : ROOM_DETAIL_MAX_STEP_SECONDS
  const elapsedSeconds = wait.elapsedSeconds + delta
  return {
    elapsedSeconds,
    degraded: elapsedSeconds >= ROOM_DETAIL_TIMEOUT_SECONDS - LIMIT_EPSILON,
  }
}

/** Every boundary committed and every text synchronised. */
export function roomDetailComplete(state: { readonly boundaryMask: number; readonly textReady: boolean }) {
  return state.boundaryMask === ALL_DETAIL_BOUNDARIES_COMMITTED && state.textReady
}

/** Whether the room may be scanned and queued for its GPU warm-up now. */
export function roomDetailWarmable(state: {
  readonly mounted: boolean
  readonly boundaryMask: number
  readonly textReady: boolean
  readonly degraded: boolean
}) {
  return state.mounted && (roomDetailComplete(state) || state.degraded)
}

const BOUNDARY_NAMES = ['collection', 'furniture', 'wall art'] as const

/** What a degraded room went on without, for the development console. */
export function missingRoomDetail(state: { readonly boundaryMask: number; readonly textReady: boolean }): string[] {
  const missing: string[] = BOUNDARY_NAMES.filter((_, bit) => (state.boundaryMask & (1 << bit)) === 0)
  if (missing.length === 0 && !state.textReady) missing.push('text')
  return missing
}
