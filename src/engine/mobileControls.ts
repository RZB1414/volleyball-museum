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
