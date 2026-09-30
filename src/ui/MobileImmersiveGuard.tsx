import { useCallback, useEffect, useState } from 'react'

import {
  mobileLandscapeIsBlocked,
  readMobileImmersiveState,
  requestMobileImmersiveMode,
} from '../engine/mobileImmersive'
import { useTranslate } from '../i18n'
import { useMuseum } from '../state/store'

export function MobileImmersiveGuard() {
  const [state, setState] = useState(readMobileImmersiveState)
  const [installHintDismissed, setInstallHintDismissed] = useState(false)
  const resetTouch = useMuseum((museum) => museum.resetTouch)
  const t = useTranslate()
  const refresh = useCallback(() => setState(readMobileImmersiveState()), [])

  useEffect(() => {
    const orientationQuery = window.matchMedia('(orientation: landscape)')
    const touchQuery = window.matchMedia('(any-pointer: coarse)')
    const displayFullscreenQuery = window.matchMedia('(display-mode: fullscreen)')
    const displayStandaloneQuery = window.matchMedia('(display-mode: standalone)')
    const orientation = window.screen.orientation

    window.addEventListener('orientationchange', refresh)
    window.addEventListener('resize', refresh)
    document.addEventListener('fullscreenchange', refresh)
    orientation?.addEventListener('change', refresh)
    orientationQuery.addEventListener('change', refresh)
    touchQuery.addEventListener('change', refresh)
    displayFullscreenQuery.addEventListener('change', refresh)
    displayStandaloneQuery.addEventListener('change', refresh)
    return () => {
      window.removeEventListener('orientationchange', refresh)
      window.removeEventListener('resize', refresh)
      document.removeEventListener('fullscreenchange', refresh)
      orientation?.removeEventListener('change', refresh)
      orientationQuery.removeEventListener('change', refresh)
      touchQuery.removeEventListener('change', refresh)
      displayFullscreenQuery.removeEventListener('change', refresh)
      displayStandaloneQuery.removeEventListener('change', refresh)
    }
  }, [refresh])

  const blocked = mobileLandscapeIsBlocked(state)
  useEffect(() => {
    if (blocked) resetTouch()
  }, [blocked, resetTouch])

  const retryFullscreen = () => {
    void requestMobileImmersiveMode().then(setState)
  }

  if (!state.touchCapable) return null

  if (blocked) {
    return (
      <section className="mobile-orientation-gate" role="dialog" aria-modal="true">
        <div className="mobile-orientation-card">
          <span className="mobile-rotate-icon" aria-hidden="true" />
          <h2>{t('mobile.landscape.title')}</h2>
          <p>{t('mobile.landscape.body')}</p>
          {state.fullscreenAvailable ? (
            <button className="mobile-orientation-action" type="button" onClick={retryFullscreen}>
              {t('mobile.landscape.activate')}
            </button>
          ) : null}
          {!state.fullscreenAvailable && !state.standalone ? (
            <p className="mobile-install-hint">{t('mobile.fullscreen.install')}</p>
          ) : null}
        </div>
      </section>
    )
  }

  if (state.fullscreenAvailable && !state.fullscreen) {
    return (
      <button className="mobile-fullscreen-resume" type="button" onClick={retryFullscreen}>
        {t('mobile.fullscreen.resume')}
      </button>
    )
  }

  if (!state.fullscreenAvailable && !state.standalone && !installHintDismissed) {
    return (
      <aside className="mobile-install-banner" role="status">
        <span>{t('mobile.fullscreen.install')}</span>
        <button type="button" onClick={() => setInstallHintDismissed(true)}>
          {t('mobile.fullscreen.dismiss')}
        </button>
      </aside>
    )
  }

  return null
}
