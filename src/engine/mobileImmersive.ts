export type MobileImmersiveState = Readonly<{
  touchCapable: boolean
  landscape: boolean
  standalone: boolean
  fullscreen: boolean
  fullscreenAvailable: boolean
}>

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>
}

type AppleNavigator = Navigator & { standalone?: boolean }

export type MobileImmersivePlatform = Readonly<{
  read: () => MobileImmersiveState
  requestFullscreen: () => Promise<void>
  lockLandscape: () => Promise<void>
}>

export function readMobileImmersiveState(): MobileImmersiveState {
  const touchCapable =
    window.matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0
  const standalone =
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as AppleNavigator).standalone === true
  const fullscreenAvailable =
    document.fullscreenEnabled !== false &&
    typeof document.documentElement.requestFullscreen === 'function'

  return {
    touchCapable,
    landscape:
      window.matchMedia('(orientation: landscape)').matches ||
      window.innerWidth > window.innerHeight,
    standalone,
    fullscreen: standalone || Boolean(document.fullscreenElement),
    fullscreenAvailable,
  }
}

/**
 * Must be called directly from the title button's user gesture. Android can
 * enter fullscreen and then lock landscape; iPhone Safari cannot fullscreen an
 * ordinary element, so the manifest and portrait guard provide the honest
 * installed-app/manual-rotation fallback instead.
 */
function browserImmersivePlatform(): MobileImmersivePlatform {
  return {
    read: readMobileImmersiveState,
    requestFullscreen: () => document.documentElement.requestFullscreen(),
    lockLandscape: () => {
      const orientation = window.screen.orientation as LockableScreenOrientation | undefined
      return typeof orientation?.lock === 'function'
        ? orientation.lock('landscape')
        : Promise.resolve()
    },
  }
}

export async function requestMobileImmersiveMode(
  platform: MobileImmersivePlatform = browserImmersivePlatform(),
) {
  const initial = platform.read()
  if (!initial.touchCapable) return initial

  if (!initial.fullscreen && initial.fullscreenAvailable) {
    let fullscreenRequest: Promise<void> | null = null
    let earlyOrientationLock: Promise<void> | null = null
    try {
      // No options: this is also the most interoperable form on iPadOS.
      fullscreenRequest = platform.requestFullscreen().catch(() => undefined)
    } catch {
      // Permission policy, user preference and iPhone Safari may deny this.
    }
    try {
      // Some Android WebViews require activation for this call while Chromium
      // requires fullscreen. Try in the gesture now, then retry once fullscreen
      // has actually settled below.
      earlyOrientationLock = platform.lockLandscape().catch(() => undefined)
    } catch {
      // The post-fullscreen attempt remains available.
    }
    await fullscreenRequest
    await earlyOrientationLock
  }

  try {
    // Chromium requires fullscreen before it honours an orientation lock.
    await platform.lockLandscape()
  } catch {
    // iPadOS, Split View and some Android browser shells legitimately refuse.
  }

  return platform.read()
}

export function mobileLandscapeIsBlocked(state: MobileImmersiveState) {
  return state.touchCapable && !state.landscape
}
