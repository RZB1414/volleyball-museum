import {
  HOLD_IDLE,
  holdMark,
  holdStep,
  isHoldRequest,
  type HoldEvent,
  type HoldGesture,
  type HoldRequest,
} from './holdAction.ts'

/**
 * What a consumer of the shared "interact" intent answers a press with: it
 * acted (true), it declines (false), or the press has to be HELD for it to
 * act (a `HoldRequest`: the desk a term is signed at). A request claims the
 * press like a plain yes: one press, one action.
 */
export type PrimaryActionHandler = () => boolean | HoldRequest

type RegisteredHandler = Readonly<{
  handler: PrimaryActionHandler
  priority: number
  order: number
}>

const handlers: RegisteredHandler[] = []
let nextOrder = 0

/**
 * Registers one consumer of the shared “interact” intent.
 *
 * Keyboard and touch must enter the same gameplay path. Priorities mirror the
 * HUD targeting rules: a transition door wins over an exhibit, which wins over
 * furniture, which wins over a power control behind it.
 */
export function subscribePrimaryAction(
  handler: PrimaryActionHandler,
  priority = 0,
) {
  const record = { handler, priority, order: nextOrder } satisfies RegisteredHandler
  nextOrder += 1
  handlers.push(record)
  handlers.sort((first, second) => second.priority - first.priority || first.order - second.order)

  return () => {
    const index = handlers.indexOf(record)
    if (index >= 0) handlers.splice(index, 1)
  }
}

// ---------------------------------------------------------------------------
// The press that is held
// ---------------------------------------------------------------------------

// One gesture for the whole game: there is one E key and one Action button,
// and both drive it (`holdAction.ts` is the rule; this is where it is kept).
let gesture: HoldGesture = HOLD_IDLE
const holdListeners = new Set<() => void>()
const firedListeners = new Set<(id: string) => void>()

/**
 * One event of the gesture. Whoever draws the hold is told only when what
 * they draw changes (the phase, or its target), never frame by frame; and
 * whoever acts on it is told when it fires, after the gesture is back to
 * idle, so that what they do may start another.
 */
function step(event: HoldEvent): string | null {
  const before = holdMark(gesture)
  const next = holdStep(gesture, event)
  gesture = next.gesture
  // A copy of each set: a listener may leave while it is being told.
  if (holdMark(gesture) !== before) for (const listener of [...holdListeners]) listener()
  if (next.fired !== null) for (const listener of [...firedListeners]) listener(next.fired)
  return next.fired
}

/**
 * A press that has to be held, begun: by the touch button through
 * `pressPrimaryAction`, and by the keyboard, whose handler already has the
 * request in hand. `acted` when the press was the answer to a question
 * already on screen («Assinar»), `holding` otherwise.
 */
export function beginPrimaryHold(request: HoldRequest): 'acted' | 'holding' {
  return step({ kind: 'press', request }) === null ? 'holding' : 'acted'
}

/**
 * The input went down: at most one handler answers. `acted` when one did
 * something, `holding` when one asked for the press to be held, `none` when
 * nothing in the world took it.
 */
export function pressPrimaryAction(): 'none' | 'acted' | 'holding' {
  // A handler may synchronously unmount its owner, so iterate over a snapshot.
  for (const { handler } of [...handlers]) {
    const answer = handler()
    if (answer === false) continue
    return isHoldRequest(answer) ? beginPrimaryHold(answer) : 'acted'
  }
  return 'none'
}

/** The input came up. */
export function releasePrimaryAction(): void {
  step({ kind: 'release' })
}

/** Escape, a lost focus, a hidden tab, «Cancelar»: whatever was held or asked is dropped. */
export function cancelPrimaryHold(): void {
  step({ kind: 'cancel' })
}

/** One frame, with what is under the crosshair now: the id a hold may go on for, or null. */
export function tickPrimaryHold(seconds: number, aimed: string | null): void {
  // Nothing held is the usual frame: no event, no comparison.
  if (gesture.phase !== 'idle') step({ kind: 'tick', seconds, aimed })
}

/** The gesture as it stands. */
export function primaryHold(): HoldGesture {
  return gesture
}

/** The gesture as one string (`holdMark`): what a component selects. */
export function primaryHoldMark(): string {
  return holdMark(gesture)
}

/** Tells `listener` whenever the mark changes; the result stops it. */
export function subscribePrimaryHold(listener: () => void): () => void {
  holdListeners.add(listener)
  return () => {
    holdListeners.delete(listener)
  }
}

/** Tells `listener` the id of every hold that fires; the result stops it. */
export function onPrimaryHoldFired(listener: (id: string) => void): () => void {
  firedListeners.add(listener)
  return () => {
    firedListeners.delete(listener)
  }
}

/**
 * A press and its release at once: what a click is. Kept for whatever cannot
 * tell down from up (a button worked from a keyboard). On something that has
 * to be held that is a tap, and a tap asks first.
 */
export function triggerPrimaryAction() {
  const answer = pressPrimaryAction()
  releasePrimaryAction()
  return answer !== 'none'
}

/**
 * True for an E press that no other system has already acted on.
 *
 * Every system listens to E on `window`, and every listener runs for the same
 * event, each re-reading the store the previous one may just have changed. One
 * press could light the lamp and then — the radio now live — let the radio take
 * the same press and leave the desk. The first system that acts calls
 * `preventDefault`; the rest stand down, which is what `triggerPrimaryAction`
 * already guarantees on touch.
 */
export function isUnclaimedInteractKey(event: Pick<KeyboardEvent, 'code' | 'defaultPrevented'>) {
  return isInteractKey(event) && !event.defaultPrevented
}

/** E, going down or coming up: the one place the key is named. */
export function isInteractKey(event: Pick<KeyboardEvent, 'code'>) {
  return event.code === 'KeyE'
}

/** The key that drops a hold, or a question about one. */
export function isHoldCancelKey(event: Pick<KeyboardEvent, 'code'>) {
  return event.code === 'Escape'
}
