/**
 * Pure transition-door state machine.
 *
 * Asset loading, passage geometry, authorisation, React, animation playback
 * and collision registration stay in their respective runtimes. This module
 * only decides what a door means at a given instant, which keeps portal
 * behaviour deterministic and headless-testable.
 */

export type TransitionDoorPhase =
  | 'closed'
  | 'preloading'
  | 'ready'
  | 'opening'
  | 'open'
  | 'closing'

export type TransitionDoorState = Readonly<{
  phase: TransitionDoorPhase
  /** True only while an early interaction is waiting for preload completion. */
  interactionArmed: boolean
  /** Elapsed time in the current opening or closing movement. */
  movementElapsedSeconds: number
  /** True from entering the passage until clearing its outer safety margin. */
  passageOccupied: boolean
  /** Once released, the gate stays off until the leaves reach the closed latch. */
  collisionReleased: boolean
}>

export type TransitionDoorEvent =
  | Readonly<{ type: 'proximity' }>
  | Readonly<{ type: 'interact' }>
  | Readonly<{ type: 'preload-ready' }>
  | Readonly<{ type: 'preload-invalidated' }>
  | Readonly<{ type: 'idle-close' }>
  | Readonly<{ type: 'passage-enter' }>
  | Readonly<{
      type: 'passage-clear'
      /** True only after leaving the safety margin on the opposite side. */
      crossed: boolean
    }>
  | Readonly<{ type: 'advance'; deltaSeconds: number }>

export type TransitionDoorConfig = Readonly<{
  /** Duration of the authored opening movement. */
  durationSeconds: number
  /** Faster return movement after the visitor has cleared the passage. */
  closeDurationSeconds: number
  /** Closed and open rotations in radians; either direction is supported. */
  closedAngle: number
  openAngle: number
  easing: (linearProgress: number) => number
}>

export type TransitionDoorSnapshot = Readonly<{
  phase: TransitionDoorPhase
  /** Linear pose in the inclusive range 0..1: zero closed, one open. */
  linearProgress: number
  /** Eased 0..1 progress used by the authored pose. */
  progress: number
  angleRadians: number
  /** The gate stays disabled during closing and returns only when fully closed. */
  colliderBlocked: boolean
  interactionArmed: boolean
  /** The host should start or retain its asynchronous preload while true. */
  needsPreload: boolean
  /** True while the capsule occupies the passage or its outer safety margin. */
  passageOccupied: boolean
}>

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

/** Gentle acceleration and braking without a dependency on an animation library. */
export function easeInOutCubic(progress: number) {
  const t = clamp01(progress)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export const DEFAULT_TRANSITION_DOOR_CONFIG: TransitionDoorConfig = Object.freeze({
  durationSeconds: 0.8,
  closeDurationSeconds: 0.55,
  closedAngle: 0,
  openAngle: Math.PI / 2,
  easing: easeInOutCubic,
})

/** Validates author-facing overrides once rather than inside every animation tick. */
export function createTransitionDoorConfig(
  overrides: Partial<TransitionDoorConfig> = {},
): TransitionDoorConfig {
  const config = { ...DEFAULT_TRANSITION_DOOR_CONFIG, ...overrides }
  if (!Number.isFinite(config.durationSeconds) || config.durationSeconds <= 0) {
    throw new RangeError('A transition door duration must be a positive finite number.')
  }
  if (!Number.isFinite(config.closeDurationSeconds) || config.closeDurationSeconds <= 0) {
    throw new RangeError(
      'A transition door closing duration must be a positive finite number.',
    )
  }
  if (!Number.isFinite(config.closedAngle) || !Number.isFinite(config.openAngle)) {
    throw new RangeError('Transition door angles must be finite numbers.')
  }
  if (typeof config.easing !== 'function') {
    throw new TypeError('A transition door easing function is required.')
  }
  return Object.freeze(config)
}

function state(
  phase: TransitionDoorPhase,
  interactionArmed = false,
  movementElapsedSeconds = 0,
  passageOccupied = false,
  collisionReleased = false,
): TransitionDoorState {
  return Object.freeze({
    phase,
    interactionArmed,
    movementElapsedSeconds,
    passageOccupied,
    collisionReleased,
  })
}

export function createTransitionDoorState(initiallyOpen = false): TransitionDoorState {
  return initiallyOpen
    ? state('open', false, DEFAULT_TRANSITION_DOOR_CONFIG.durationSeconds, false, true)
    : state('closed')
}

/**
 * Tracks one complete traversal without interpreting geometry or room ids.
 *
 * The host emits `passage-clear` only after the capsule has left the authored
 * safety margin. Telling the machine whether that exit was on the opposite
 * side keeps threshold maths and per-side authorisation out of this module.
 */
function observePassage(
  current: TransitionDoorState,
  event: Extract<
    TransitionDoorEvent,
    { type: 'passage-enter' } | { type: 'passage-clear' }
  >,
  config: TransitionDoorConfig,
) {
  if (event.type === 'passage-enter') {
    if (current.phase === 'closing') {
      // Reversing from the current pose avoids a leaf pop. More importantly,
      // collision remains released: recreating the gate here would put a solid
      // box around the capsule that caused the safety reversal.
      const closingProgress = clamp01(
        current.movementElapsedSeconds / config.closeDurationSeconds,
      )
      return state(
        'opening',
        false,
        (1 - closingProgress) * config.durationSeconds,
        true,
        true,
      )
    }
    if (current.phase !== 'opening' && current.phase !== 'open') return current
    return current.passageOccupied
      ? current
      : state(
          current.phase,
          false,
          current.movementElapsedSeconds,
          true,
          current.collisionReleased,
        )
  }

  if (current.phase !== 'opening' && current.phase !== 'open') return current
  if (!current.passageOccupied) return current
  return current.phase === 'open' && event.crossed
    ? state('closing', false, 0, false, true)
    : state(
        current.phase,
        false,
        current.movementElapsedSeconds,
        false,
        current.collisionReleased,
      )
}

/**
 * Applies one event without mutating the previous state.
 *
 * Preload completion and interaction are deliberately order-independent: an
 * early interaction arms the door, while an already-warm door starts opening
 * immediately. Opening and closing are separate movements: passage collision
 * stays disabled for the whole return movement and is restored only once the
 * fully closed state has been reached.
 */
export function transitionDoor(
  current: TransitionDoorState,
  event: TransitionDoorEvent,
  config: TransitionDoorConfig = DEFAULT_TRANSITION_DOOR_CONFIG,
): TransitionDoorState {
  switch (event.type) {
    case 'proximity':
      return current.phase === 'closed' ? state('preloading') : current

    case 'interact':
      if (current.phase === 'closed') return state('preloading', true)
      if (current.phase === 'preloading') {
        return current.interactionArmed ? current : state('preloading', true)
      }
      if (current.phase === 'ready') return state('opening')
      return current

    case 'preload-ready':
      if (current.phase === 'closed') return state('ready')
      if (current.phase !== 'preloading') return current
      return current.interactionArmed ? state('opening') : state('ready')

    case 'preload-invalidated':
      if (current.phase === 'ready') return state('preloading')
      if (current.phase === 'opening' && current.movementElapsedSeconds === 0) {
        return state('preloading', true)
      }
      return current

    case 'idle-close':
      // A visitor may open a door and walk away without ever entering its
      // passage. Closing only after the host reports that the proximity area
      // is clear prevents multiple furnished neighbours from staying live,
      // while an occupied doorway keeps the stronger passage safety contract.
      return current.phase === 'open' && !current.passageOccupied
        ? state('closing', false, 0, false, true)
        : current

    case 'passage-enter':
    case 'passage-clear':
      return observePassage(current, event, config)

    case 'advance': {
      if (
        (current.phase !== 'opening' && current.phase !== 'closing') ||
        !Number.isFinite(event.deltaSeconds) ||
        event.deltaSeconds <= 0
      ) {
        return current
      }

      const duration =
        current.phase === 'opening'
          ? config.durationSeconds
          : config.closeDurationSeconds
      const elapsed = Math.min(duration, current.movementElapsedSeconds + event.deltaSeconds)
      if (elapsed < duration) {
        return state(
          current.phase,
          false,
          elapsed,
          current.passageOccupied,
          current.collisionReleased,
        )
      }
      return current.phase === 'opening'
        ? state('open', false, config.durationSeconds, current.passageOccupied, true)
        : state('closed')
    }
  }
}

/** Derives the render and collision pose without storing redundant state. */
export function inspectTransitionDoor(
  current: TransitionDoorState,
  config: TransitionDoorConfig = DEFAULT_TRANSITION_DOOR_CONFIG,
): TransitionDoorSnapshot {
  const linearProgress =
    current.phase === 'open'
      ? 1
      : current.phase === 'opening'
        ? clamp01(current.movementElapsedSeconds / config.durationSeconds)
        : current.phase === 'closing'
          ? 1 - clamp01(current.movementElapsedSeconds / config.closeDurationSeconds)
          : 0
  const eased = config.easing(linearProgress)
  // A malformed custom easing must not rotate a collider to NaN or beyond its
  // authored stops. Falling back to linear still leaves the doorway usable.
  const progress = Number.isFinite(eased) ? clamp01(eased) : linearProgress

  return Object.freeze({
    phase: current.phase,
    linearProgress,
    progress,
    angleRadians: config.closedAngle + (config.openAngle - config.closedAngle) * progress,
    colliderBlocked: !current.collisionReleased,
    interactionArmed: current.interactionArmed,
    needsPreload: current.phase === 'preloading',
    passageOccupied: current.passageOccupied,
  })
}
