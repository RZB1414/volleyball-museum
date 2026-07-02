import { GameCanvas } from './game/GameCanvas'
import { GameMenu } from './game/GameMenu'
import { useGameStore } from './store/gameStore'

function App() {
  const gameStarted = useGameStore((state) => state.gameStarted)
  const startGame = useGameStore((state) => state.startGame)

  if (!gameStarted) {
    return (
      <main className="app start-screen">
        <section className="start-panel" aria-label="Players On Volleyball Museum">
          <h1>Volleyball Museum</h1>
          <p>Primeira sala 3D para o futuro tour do Players On.</p>
          <button className="start-button" type="button" onClick={startGame}>
            Iniciar Tour
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app game-screen">
      <GameCanvas />
      <GameMenu />
      <div className="controls-hint">
        WASD / Setas para mover - Mouse para olhar - T liga/desliga tocha - ESC libera o mouse
      </div>
    </main>
  )
}

export default App
