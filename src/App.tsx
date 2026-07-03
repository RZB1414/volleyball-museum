import { GameCanvas } from './game/GameCanvas'
import { GameMenu } from './game/GameMenu'
import { MobileControls } from './game/MobileControls'
import { SitPrompt } from './game/SitPrompt'
import { useGameStore } from './store/gameStore'

const MOBILE_MEDIA_QUERY = '(hover: none) and (pointer: coarse)'

async function enterLandscapeModeOnPhone() {
  if (!window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
    return
  }

  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    }
  } catch {
    // Some mobile browsers do not allow fullscreen from web pages.
  }

  try {
    await screen.orientation?.lock?.('landscape')
  } catch {
    // Orientation lock is best-effort and depends on the mobile browser.
  }
}

function App() {
  const gameStarted = useGameStore((state) => state.gameStarted)
  const startGame = useGameStore((state) => state.startGame)

  const handleStartTour = async () => {
    await enterLandscapeModeOnPhone()
    startGame()
  }

  if (!gameStarted) {
    return (
      <main className="app start-screen">
        <section className="start-panel" aria-label="Players On Volleyball Museum">
          <h1>Volleyball Museum</h1>
          <p>Primeira sala 3D para o futuro tour do Players On.</p>
          <button className="start-button" type="button" onClick={handleStartTour}>
            Iniciar Tour
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app game-screen">
      <GameCanvas />
      <MobileControls />
      <GameMenu />
      <SitPrompt />
      <div className="controls-hint">
        WASD / Setas para mover - Mouse para olhar - T liga/desliga tocha - Q senta/levanta - ESC libera o mouse
      </div>
    </main>
  )
}

export default App
