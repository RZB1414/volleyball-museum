/**
 * The museum entry point.
 *
 * The temporary `?v1`/`?v2` split ended in 5e51e24: the data-driven museum is
 * now the only build, and the Rapier-based prototype remains available in git
 * history rather than in the production bundle.
 */

import { Suspense, lazy, useEffect, useState } from 'react'

import { museumAudio } from './engine/audio'
import { requestMobileImmersiveMode } from './engine/mobileImmersive'
import { hasSavedProgress, useMuseum, type Locale } from './state/store'
import { useTranslate } from './i18n'
import { NEW_GAME_CONFIRM_MS, newGameClick } from './ui/hudRules'
import { MobileImmersiveGuard } from './ui/MobileImmersiveGuard'
import './styles/museum.css'

/**
 * The HUD and the journal are lazy for the same reason the canvas is: they can
 * only appear after the player has entered, and importing them eagerly drags
 * the whole content set — every exhibit record, every document, the credit
 * formatter, the baked manifest — into the title screen's bundle. Measured on
 * the served build, that was the difference between 260 KB and comfortably
 * inside the 250 KB budget.
 */
const Hud = lazy(() => import('./ui/Hud').then((module) => ({ default: module.Hud })))
const Journal = lazy(() =>
  import('./ui/Journal').then((module) => ({ default: module.Journal })),
)

/**
 * The 3D canvas, split off behind a lazy import.
 *
 * The title screen is HTML and CSS; three.js, drei, the BVH and the scene are
 * roughly 225 KB gzip that nobody looking at a title screen needs. Splitting
 * here is what keeps the landing page under the 250 KB budget and puts the
 * download in the moment the player has already committed by clicking.
 */
const MuseumCanvas = lazy(() =>
  import('./scenes/MuseumCanvas').then((module) => ({ default: module.MuseumCanvas })),
)

function TitleScreen({ onEnter }: { onEnter: () => void }) {
  const locale = useMuseum((state) => state.settings.locale)
  const setSetting = useMuseum((state) => state.setSetting)
  const progress = useMuseum((state) => state.progress)
  const resetProgress = useMuseum((state) => state.resetProgress)
  const t = useTranslate()
  const [newGameArmed, setNewGameArmed] = useState(false)

  // Real progress, not "clicked Enter once": a save that only ever stood in
  // the spawn room has nothing to continue and nothing to erase.
  const hasSave = hasSavedProgress(progress)

  // An armed "New game" disarms itself, so a click long after the warning is
  // read as a first click again rather than as a confirmation.
  useEffect(() => {
    if (!newGameArmed) return undefined
    const timer = window.setTimeout(() => setNewGameArmed(false), NEW_GAME_CONFIRM_MS)
    return () => window.clearTimeout(timer)
  }, [newGameArmed])

  const handleNewGame = () => {
    if (newGameClick(newGameArmed) === 'arm') {
      setNewGameArmed(true)
      return
    }
    setNewGameArmed(false)
    // Erased and written to disk first, then entered in this same click: the
    // audio unlock and the fullscreen request both need this gesture.
    resetProgress()
    onEnter()
  }

  return (
    <main className="title">
      <div className="title-panel">
        <h1>{t('ui.title')}</h1>
        <p className="title-subtitle">{t('ui.subtitle')}</p>

        <div className="title-intro">
          <p>{t('intro.line1')}</p>
          <p>{t('intro.line2')}</p>
          <p>{t('intro.line3')}</p>
        </div>

        <button className="title-enter" type="button" onClick={onEnter}>
          {hasSave ? t('ui.continue') : t('ui.enter')}
        </button>

        {hasSave ? (
          <button
            className={newGameArmed ? 'title-new-game is-armed' : 'title-new-game'}
            type="button"
            onClick={handleNewGame}
            onBlur={() => setNewGameArmed(false)}
          >
            {newGameArmed ? t('ui.newGame.confirm') : t('ui.newGame')}
          </button>
        ) : null}

        <div className="title-locale" role="group" aria-label={t('ui.language')}>
          {(['pt-BR', 'en'] as Locale[]).map((option) => (
            <button
              key={option}
              type="button"
              className={option === locale ? 'is-active' : ''}
              aria-pressed={option === locale}
              onClick={() => setSetting('locale', option)}
            >
              {option === 'pt-BR' ? 'Português' : 'English'}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

function LoadingOverlay() {
  const t = useTranslate()
  return <div className="loading">{t('ui.loading')}</div>
}

export function MuseumApp() {
  const started = useMuseum((state) => state.started)
  const start = useMuseum((state) => state.start)
  const [entered, setEntered] = useState(false)

  const handleEnter = () => {
    // The AudioContext has to be unlocked on the same user gesture that starts
    // the experience. Doing it later is the classic "works on desktop, silent
    // on iOS" bug.
    museumAudio.unlock()
    // Fullscreen must be requested in this exact user gesture. Orientation is
    // locked after fullscreen resolves where the platform supports it.
    void requestMobileImmersiveMode()
    setEntered(true)
    start()
  }

  if (!started || !entered) {
    return <TitleScreen onEnter={handleEnter} />
  }

  return (
    <main className="museum">
      <MobileImmersiveGuard />
      <Suspense fallback={<LoadingOverlay />}>
        <MuseumCanvas />
      </Suspense>

      <Suspense fallback={null}>
        <Hud />
        <Journal />
      </Suspense>
    </main>
  )
}
