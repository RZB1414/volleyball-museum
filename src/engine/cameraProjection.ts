/**
 * Perspective policy for the first-person camera.
 *
 * Three.js expresses FOV vertically. Keeping the old 68° vertical value on a
 * 20:9 phone produced more than 112° horizontally, which stretched objects at
 * the edge of the screen into the fish-eye look reported on real devices.
 * The normal view now stays at a restrained 60° vertically and ultrawide
 * landscape screens are additionally capped at 100° horizontally.
 */
export const CAMERA_BASE_VERTICAL_FOV_DEGREES = 62
export const CAMERA_MAX_HORIZONTAL_FOV_DEGREES = 100
export const CAMERA_FOV_PUSH_DEGREES = 2

const FALLBACK_ASPECT = 16 / 9
const TO_RADIANS = Math.PI / 180
const TO_DEGREES = 180 / Math.PI

function safeAspect(aspect: number) {
  return Number.isFinite(aspect) && aspect > 0 ? aspect : FALLBACK_ASPECT
}

export function horizontalFovDegrees(verticalFovDegrees: number, aspect: number): number {
  const verticalRadians = verticalFovDegrees * TO_RADIANS
  return (
    2 * Math.atan(Math.tan(verticalRadians / 2) * safeAspect(aspect)) * TO_DEGREES
  )
}

/**
 * Returns the vertical FOV Three.js needs for the current viewport.
 *
 * The optional push remains available for players who enabled it, but expands
 * the horizontal cap by the same small amount instead of reintroducing the
 * ultrawide edge distortion while running.
 */
export function cameraVerticalFovDegrees(aspect: number, pushDegrees = 0): number {
  const normalisedPush = Number.isFinite(pushDegrees) ? Math.max(0, pushDegrees) : 0
  const requestedVertical = CAMERA_BASE_VERTICAL_FOV_DEGREES + normalisedPush
  const maximumHorizontal = CAMERA_MAX_HORIZONTAL_FOV_DEGREES + normalisedPush
  const maximumHorizontalRadians = maximumHorizontal * TO_RADIANS
  const cappedVertical =
    2 *
    Math.atan(Math.tan(maximumHorizontalRadians / 2) / safeAspect(aspect)) *
    TO_DEGREES

  return Number(Math.min(requestedVertical, cappedVertical).toFixed(3))
}
