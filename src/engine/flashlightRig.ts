/**
 * The hand torch, as numbers.
 *
 * One permanently mounted spot that follows the camera. Permanent because the
 * light count is part of every shader's program key: switching the torch by
 * mounting and unmounting it would recompile the building on the first press,
 * so "off" is intensity zero, exactly like the room pool's idle slots.
 *
 * Its reach is a design value, not a tuning one. The plan's largest single
 * moment is the atrium's house lights revealing a ceiling the player has never
 * seen, so the beam must never get there: `distance` is a hard cut-off in
 * three's punctual-light falloff, and the opening test proves it stays short
 * of the atrium ceiling from where the torch is held.
 */

export const FLASHLIGHT = {
  /** Cool LED white against the office's tungsten, as the plan asks. */
  color: '#dfe7ff',
  /**
   * A torch at arm's length is far brighter than a gallery spot at five
   * metres, and there is no eye adapting to it: the tone mapper's shoulder
   * took a crimson spine a metre away to salmon pink and the green ones to
   * mint. So the falloff is gentler than the inverse square, a reflector's
   * beam rather than a bare bulb, and the intensity is set to light a wall
   * four metres off exactly as before: what changed is only the near field,
   * now under half its old hot spot from a metre in (`torchIrradiance`).
   */
  intensity: 7.8,
  distance: 6.2,
  angle: 0.42,
  penumbra: 0.7,
  decay: 1.4,
  /** Camera-space offset of the lamp: held low and to the right. */
  offset: [0.14, -0.2, 0.05] as const,
  /** How far ahead of the lamp its target sits, in metres. */
  aim: 4,
  /** Time constant, in seconds, with which the beam follows a turn. */
  follow: 0.055,
  /**
   * Dimmed while an object is held up to the face, or it would bleach it:
   * at the hold distance this gives it the light it had under the old,
   * steeper falloff.
   */
  examineScale: 0.4,
} as const

/** One spot, on top of the eight-slot gallery pool. */
export const FLASHLIGHT_SPOT_SLOTS = 1

/** Whether the beam can touch a surface `height` metres above the floor. */
export function flashlightReaches(height: number, eyeHeight: number) {
  const lampHeight = eyeHeight + FLASHLIGHT.offset[1]
  return FLASHLIGHT.distance >= height - lampHeight
}

export function flashlightIntensity(on: boolean, brightness: number, examining: boolean) {
  if (!on) return 0
  return FLASHLIGHT.intensity * brightness * (examining ? FLASHLIGHT.examineScale : 1)
}

/**
 * The light on the beam's axis `distance` metres from the lamp, inside its
 * range, as three's punctual falloff computes it at brightness one. What the
 * colour checks and the reach checks reason about, rather than the intensity
 * alone, which means nothing without the decay.
 */
export function torchIrradiance(distance: number, examining = false) {
  return flashlightIntensity(true, 1, examining) / Math.max(distance ** FLASHLIGHT.decay, 0.01)
}

/** Keys typed into a field must never switch the torch. */
export function isTextEntryTarget(target: EventTarget | null) {
  if (!target || typeof target !== 'object') return false
  const element = target as { tagName?: string; isContentEditable?: boolean }
  return (
    element.isContentEditable === true ||
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT'
  )
}
