import type { DirectionalInput } from '../state/store'

export const MOBILE_PAD_DEAD_ZONE = 0.08
const MOBILE_PAD_RADIUS_RATIO = 0.34

export type DirectionalPadSession = {
  pointerId: number | null
  originX: number
  originY: number
}

export type DirectionalPadBounds = Readonly<{
  left: number
  top: number
  width: number
  height: number
}>

export type DirectionalPadSample = Readonly<{
  input: DirectionalInput
  visual: DirectionalInput
}>

const ZERO_SAMPLE: DirectionalPadSample = Object.freeze({
  input: Object.freeze({ x: 0, y: 0 }),
  visual: Object.freeze({ x: 0, y: 0 }),
})

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

export function createDirectionalPadSession(): DirectionalPadSession {
  return { pointerId: null, originX: 0, originY: 0 }
}

export function beginDirectionalPadSession(
  session: DirectionalPadSession,
  pointerId: number,
  clientX: number,
  clientY: number,
) {
  if (session.pointerId !== null) return false
  session.pointerId = pointerId
  session.originX = clientX
  session.originY = clientY
  return true
}

export function ownsDirectionalPadPointer(
  session: DirectionalPadSession,
  pointerId: number,
) {
  return session.pointerId === pointerId
}

/** Returns the released pointer so the DOM owner can also release capture. */
export function resetDirectionalPadSession(session: DirectionalPadSession) {
  const pointerId = session.pointerId
  session.pointerId = null
  session.originX = 0
  session.originY = 0
  return pointerId
}

function sampleDirectionalVector(
  radius: number,
  dx: number,
  dy: number,
  invertY: boolean,
): DirectionalPadSample {
  if (!Number.isFinite(radius) || radius <= 0) return ZERO_SAMPLE

  const distance = Math.hypot(dx, dy)
  const limitedDistance = Math.min(distance, radius)
  const directionX = distance > 0 ? dx / distance : 0
  const directionY = distance > 0 ? dy / distance : 0
  const visualMagnitude = limitedDistance / radius
  const magnitude = clamp(
    (visualMagnitude - MOBILE_PAD_DEAD_ZONE) / (1 - MOBILE_PAD_DEAD_ZONE),
    0,
    1,
  )

  return {
    input: {
      x: directionX * magnitude,
      y: magnitude === 0 ? 0 : directionY * magnitude * (invertY ? -1 : 1),
    },
    visual: {
      x: directionX * visualMagnitude,
      y: directionY * visualMagnitude,
    },
  }
}

/**
 * Converts one pointer position into a normalised analogue-stick value.
 *
 * Kept outside React so Android/iOS pointer handling has a deterministic,
 * headless-testable core. The visual vector reaches the ring edge while the
 * input vector applies a small dead zone before accelerating to full speed.
 */
export function sampleDirectionalPad(
  bounds: DirectionalPadBounds,
  clientX: number,
  clientY: number,
  invertY = false,
): DirectionalPadSample {
  const radius = Math.min(bounds.width, bounds.height) * MOBILE_PAD_RADIUS_RATIO
  const centreX = bounds.left + bounds.width / 2
  const centreY = bounds.top + bounds.height / 2
  return sampleDirectionalVector(radius, clientX - centreX, clientY - centreY, invertY)
}

/**
 * A phone thumb does not reliably land on the exact painted centre. Treating
 * the first contact as the origin makes touch-down neutral and the drag
 * intentional, while pointer capture still permits full travel.
 */
export function sampleDirectionalDrag(
  bounds: DirectionalPadBounds,
  session: DirectionalPadSession,
  clientX: number,
  clientY: number,
  invertY = false,
): DirectionalPadSample {
  if (session.pointerId === null) return ZERO_SAMPLE
  const radius = Math.min(bounds.width, bounds.height) * MOBILE_PAD_RADIUS_RATIO
  return sampleDirectionalVector(
    radius,
    clientX - session.originX,
    clientY - session.originY,
    invertY,
  )
}

/** Input ramps in smoothly, but zero must be immediate or the camera drifts. */
export function dampTouchLookAxis(
  current: number,
  target: number,
  delta: number,
  smoothing: number,
) {
  if (target === 0) return 0
  const blend = 1 - Math.exp(-smoothing * Math.max(delta, 0))
  return current + (target - current) * blend
}

/**
 * How long after a pointer worked the Action button a click on it is still
 * that pointer's echo, in milliseconds.
 */
export const POINTER_CLICK_ECHO_MS = 700

/**
 * Whether a click on an action button is itself the press.
 *
 * Everything in the museum is worked by the click, as it always was: acted
 * on as the finger lands, a panel it opens would be under the finger when
 * the click arrives, and take it. One thing cannot wait for the click: a
 * press that is held (a term being signed) has to know when it began and
 * when it ended, and a click says neither, so there the button takes the
 * pointer going DOWN. The browser still sends a click after that pointer,
 * and taken as a press it would act a second time. Worse: a tap on a desk
 * swaps the button under the finger for «Assinar», and the click of that
 * very tap lands on it.
 *
 * So a click is the press unless it is the echo of a pointer that pressed.
 * One a keyboard or a switch produced (`detail` 0) never is; nor is one with
 * no pressing pointer anywhere near it in time: an ordinary tap, whose
 * pointer pressed nothing and is remembered as infinitely long ago.
 */
export function clickIsThePress(detail: number, msSincePointer: number) {
  return detail === 0 || msSincePointer > POINTER_CLICK_ECHO_MS
}

/**
 * What the action buttons remember of the pointer between its events:
 * whether it was itself a press (a hold in progress, one of the two answers),
 * and when it last did something. Infinitely long ago for a pointer that was
 * not a press: the click it makes is nobody's echo.
 */
export type ActionPointer = { readonly pressed: boolean; readonly at: number }

/** No pointer on the buttons, or one that pressed nothing. */
export const NO_ACTION_POINTER: ActionPointer = { pressed: false, at: Number.NEGATIVE_INFINITY }

/**
 * A pointer went down on an action button, at `at`. `press` says whether it
 * is itself the press.
 *
 * It starts over, whatever the last pointer left. A hold that runs its whole
 * time signs, and the desk then offers nothing: the button is gone from
 * under the finger before the finger lifts, and no release and no click are
 * ever heard. Kept, that unfinished press made the next tap on anything (a
 * lamp, a door) look like its own echo, and the tap did nothing.
 */
export function actionPointerDown(press: boolean, at: number): ActionPointer {
  return press ? { pressed: true, at } : NO_ACTION_POINTER
}

/**
 * The pointer came up, or was taken away. For one that pressed it is the
 * release of that press, and the moment its echo is counted from; for any
 * other it is nothing.
 */
export function actionPointerUp(pointer: ActionPointer, at: number): { readonly pointer: ActionPointer; readonly release: boolean } {
  return pointer.pressed ? { pointer: { pressed: false, at }, release: true } : { pointer, release: false }
}

/**
 * A click arrived on an action button. `press` says whether it is a press of
 * its own (`clickIsThePress`). The pointer is forgotten either way: one echo
 * to a pointer, and the next click, however soon, is asked afresh.
 */
export function actionClick(pointer: ActionPointer, detail: number, at: number): { readonly pointer: ActionPointer; readonly press: boolean } {
  return { pointer: NO_ACTION_POINTER, press: clickIsThePress(detail, at - pointer.at) }
}
