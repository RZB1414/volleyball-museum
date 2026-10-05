/**
 * A press that is held: the gesture a term is signed with.
 *
 * Every other thing in the museum answers a tap of E. A signature must not:
 * it is the one act that cannot be taken back, and the key that makes it is
 * the key the player has been pressing all night. So the desk asks for the
 * press to be held, and this is the whole of that gesture, as a reducer
 * with four events, so that the keyboard and the touch button cannot come
 * to mean two different things:
 *
 *   press    the input went down, on something that asked to be held
 *   tick     a frame went by, with what is under the crosshair now
 *   release  the input came up
 *   cancel   Escape, the window lost focus, the tab was hidden
 *
 * Held for its whole time, it fires, once. Let go before that, it is
 * cancelled; let go at once (a tap, under `HOLD_TAP_SECONDS`), it asks
 * instead: «Assinar / Cancelar». That is the way for whoever cannot hold a
 * key down, and for a finger that slipped. Looking away at any point ends
 * it without a word.
 *
 * Time is counted frame by frame and a frame counts a quarter of a second
 * at the most, the limit the clock on the wall has: the first frame after a
 * frozen tab carries the whole absence, and must not sign by itself.
 *
 * Pure: `npm run test:mobile-controls` runs the table, cell by cell.
 */

/** Let go sooner than this and the press was a tap: it asks to confirm. */
export const HOLD_TAP_SECONDS = 0.3
/** The longest single frame a hold counts. */
export const HOLD_MAX_STEP_SECONDS = 0.25

/** What a handler answers a press with when the press has to be held. */
export type HoldRequest = {
  /** What is being held on: the id the crosshair has to stay on. */
  readonly id: string
  /** How long, in seconds. */
  readonly seconds: number
}

export type HoldGesture =
  | { readonly phase: 'idle' }
  | { readonly phase: 'holding'; readonly id: string; readonly seconds: number; readonly held: number }
  | { readonly phase: 'confirming'; readonly id: string }

export type HoldEvent =
  | { readonly kind: 'press'; readonly request: HoldRequest }
  | { readonly kind: 'tick'; readonly seconds: number; readonly aimed: string | null }
  | { readonly kind: 'release' }
  | { readonly kind: 'cancel' }

/** Nothing held. One object, so that "nothing changed" can be asked by identity. */
export const HOLD_IDLE: HoldGesture = { phase: 'idle' }

type HoldStep = { readonly gesture: HoldGesture; readonly fired: string | null }

const stay = (gesture: HoldGesture): HoldStep => ({ gesture, fired: null })
const OVER: HoldStep = { gesture: HOLD_IDLE, fired: null }

/**
 * The gesture after an event, and the id it fired on, if it fired.
 *
 *              press                tick                          release            cancel
 *   idle       holding, from zero   stays                         stays              stays
 *   holding    ignored              aim lost: idle; time up:      a tap: confirming; idle
 *                                   idle, FIRES; else counts      else idle
 *   confirming same id: idle,       aim lost: idle                stays              idle
 *              FIRES; another:
 *              holding on it
 */
export function holdStep(gesture: HoldGesture, event: HoldEvent): HoldStep {
  switch (gesture.phase) {
    case 'idle':
      return event.kind === 'press' ? stay(heldFromZero(event.request)) : stay(gesture)
    case 'holding':
      return whileHolding(gesture, event)
    case 'confirming':
      return whileConfirming(gesture, event)
  }
}

const heldFromZero = (request: HoldRequest): HoldGesture => ({ phase: 'holding', id: request.id, seconds: request.seconds, held: 0 })

function whileHolding(gesture: Extract<HoldGesture, { readonly phase: 'holding' }>, event: HoldEvent): HoldStep {
  switch (event.kind) {
    // The same input does not go down twice: a key held and the button
    // touched with it are one press.
    case 'press':
      return stay(gesture)
    case 'tick': {
      if (event.aimed !== gesture.id) return OVER
      const step = Number.isFinite(event.seconds) ? Math.min(Math.max(event.seconds, 0), HOLD_MAX_STEP_SECONDS) : 0
      // A frame that counts nothing changes nothing: the same gesture back.
      if (step === 0) return stay(gesture)
      const held = gesture.held + step
      // The frame that completes the time is the one that fires.
      return held >= gesture.seconds ? { gesture: HOLD_IDLE, fired: gesture.id } : stay({ ...gesture, held })
    }
    case 'release':
      return gesture.held < HOLD_TAP_SECONDS ? stay({ phase: 'confirming', id: gesture.id }) : OVER
    case 'cancel':
      return OVER
  }
}

function whileConfirming(gesture: Extract<HoldGesture, { readonly phase: 'confirming' }>, event: HoldEvent): HoldStep {
  switch (event.kind) {
    case 'press':
      return event.request.id === gesture.id ? { gesture: HOLD_IDLE, fired: gesture.id } : stay(heldFromZero(event.request))
    case 'tick':
      return event.aimed === gesture.id ? stay(gesture) : OVER
    case 'release':
      return stay(gesture)
    case 'cancel':
      return OVER
  }
}

/** Whether a handler's answer is a request to hold, and not a plain yes or no. */
export function isHoldRequest(answer: boolean | HoldRequest): answer is HoldRequest {
  return typeof answer === 'object'
}

/**
 * A gesture as one string, for a React selector: what the HUD draws of a
 * hold (a ring, a question) changes when the phase or its target does, and
 * never with the frames that count the time. The ring is a CSS animation of
 * the request's own length.
 */
export function holdMark(gesture: HoldGesture): string {
  switch (gesture.phase) {
    case 'idle':
      return 'idle'
    case 'holding':
      return `holding:${gesture.seconds}:${gesture.id}`
    case 'confirming':
      return `confirming:${gesture.id}`
  }
}

/** What a mark says, back as data. Anything that is not a mark is nothing held. */
export type HoldView =
  | { readonly phase: 'idle' }
  | { readonly phase: 'holding'; readonly id: string; readonly seconds: number }
  | { readonly phase: 'confirming'; readonly id: string }

export function readHoldMark(mark: string): HoldView {
  if (mark.startsWith('confirming:')) return { phase: 'confirming', id: mark.slice('confirming:'.length) }
  if (mark.startsWith('holding:')) {
    // Ids may contain colons themselves: everything after the second is id.
    const rest = mark.slice('holding:'.length)
    const cut = rest.indexOf(':')
    const seconds = Number(rest.slice(0, cut))
    if (cut > 0 && Number.isFinite(seconds)) return { phase: 'holding', id: rest.slice(cut + 1), seconds }
  }
  return { phase: 'idle' }
}
