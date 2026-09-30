import type { QualityTier } from '../state/store'

type QualityProfile = {
  readonly maximumDpr: number
  readonly minimumDpr: number
  readonly maximumPixels?: number
}

export type RenderSurface = {
  readonly width: number
  readonly height: number
  readonly mobile: boolean
}

export type AdaptiveScaleState = {
  scale: number
  goodSeconds: number
  slowSeconds: number
  adjustmentCooldown: number
}

/**
 * Pixel density is a fill-rate budget, not a cosmetic label.
 *
 * Mid-range phones commonly report DPR 2.5-3, which would make the GPU shade
 * six to nine times as many pixels as a 1x screen. These caps deliberately put
 * a useful ceiling on that cost; R3F's performance normal then lowers the DPR
 * further while the player is moving or the frame budget is being missed.
 */
const DESKTOP_QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  low: { maximumDpr: 0.85, minimumDpr: 0.65 },
  medium: { maximumDpr: 1.2, minimumDpr: 0.75 },
  high: { maximumDpr: 1.6, minimumDpr: 0.9 },
}

/**
 * Touch screens previously inherited the desktop caps, leaving the default
 * medium tier at only 1.2 DPR (and 0.75 under pressure) on 2x-3x panels. The
 * mobile profile spends more fill-rate on clarity, while a physical pixel
 * budget prevents a large tablet from allocating a phone-style 1.6x buffer.
 */
const MOBILE_QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  low: { maximumDpr: 1, minimumDpr: 0.75, maximumPixels: 900_000 },
  medium: { maximumDpr: 1.6, minimumDpr: 1, maximumPixels: 1_500_000 },
  high: { maximumDpr: 2, minimumDpr: 1.1, maximumPixels: 2_400_000 },
}

function pixelBudgetDpr(profile: QualityProfile, surface?: RenderSurface): number {
  if (!profile.maximumPixels || !surface) return Number.POSITIVE_INFINITY
  const width = Number.isFinite(surface.width) && surface.width > 0 ? surface.width : 1
  const height = Number.isFinite(surface.height) && surface.height > 0 ? surface.height : 1
  return Math.sqrt(profile.maximumPixels / (width * height))
}

export function renderDprFor(
  quality: QualityTier,
  deviceDpr: number,
  performanceCurrent: number,
  surface?: RenderSurface,
): number {
  const profile = surface?.mobile
    ? MOBILE_QUALITY_PROFILES[quality]
    : DESKTOP_QUALITY_PROFILES[quality]
  const nativeDpr = Number.isFinite(deviceDpr) && deviceDpr > 0 ? deviceDpr : 1
  const normal = Math.min(1, Math.max(0.5, performanceCurrent))
  const baseDpr = Math.min(nativeDpr, profile.maximumDpr, pixelBudgetDpr(profile, surface))
  // Never raise a sub-1x native display to satisfy our floor.
  const floorDpr = Math.min(baseDpr, profile.minimumDpr)
  return Number(Math.max(floorDpr, baseDpr * normal).toFixed(2))
}

export function isSlowFrame(deltaSeconds: number): boolean {
  return Number.isFinite(deltaSeconds) && deltaSeconds > 1 / 45
}

/**
 * Applies hysteresis to the long-lived DPR ceiling.
 *
 * Isolated uploads, GC pauses and fullscreen resizes are not evidence that the
 * GPU cannot sustain the current resolution. Pressure must persist across a
 * short window before one small, rate-limited reduction; recovery requires a
 * much longer healthy run. This prevents backbuffer resize sawtooth.
 */
export function advanceAdaptiveScale(
  state: AdaptiveScaleState,
  deltaSeconds: number,
  slowFrame: boolean,
): boolean {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return false

  // A foreground upload can legitimately block for hundreds of milliseconds.
  // Count it as pressure, but do not let that one sample consume seconds of
  // recovery/cooldown bookkeeping.
  const elapsed = Math.min(deltaSeconds, 0.25)
  state.adjustmentCooldown = Math.max(0, state.adjustmentCooldown - elapsed)

  if (slowFrame) {
    state.goodSeconds = 0
    // Count frames, not a debugger-sized wall-clock delta. Four slow rendered
    // frames (~90 ms at the 45 fps threshold) reject isolated spikes without
    // waiting a whole second while the player sees genuine sustained jank.
    state.slowSeconds += Math.min(deltaSeconds, 1 / 30)
    if (
      state.slowSeconds < 0.09 ||
      state.adjustmentCooldown > 0 ||
      state.scale <= 0.65
    ) {
      return false
    }
    state.scale = Math.max(0.65, Number((state.scale - 0.08).toFixed(2)))
    state.slowSeconds = 0
    state.adjustmentCooldown = 2
    return true
  }

  state.slowSeconds = Math.max(0, state.slowSeconds - elapsed * 2)
  if (deltaSeconds >= 0.25) return false
  state.goodSeconds += deltaSeconds
  if (state.goodSeconds < 8 || state.adjustmentCooldown > 0 || state.scale >= 1) {
    return false
  }

  state.scale = Math.min(1, Number((state.scale + 0.04).toFixed(2)))
  // Later increments are at least three seconds apart, so resolution rises
  // without a burst of consecutive canvas resizes.
  state.goodSeconds = 5
  state.adjustmentCooldown = 3
  return true
}
