import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

export function GameMenu() {
  const [menuOpen, setMenuOpen] = useState(false)
  const ambientLightEnabled = useGameStore((state) => state.ambientLightEnabled)
  const toggleAmbientLight = useGameStore((state) => state.toggleAmbientLight)

  return (
    <div className="game-menu">
      <button
        className="menu-button"
        type="button"
        aria-label="Abrir menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      {menuOpen && (
        <div className="menu-panel">
          <label className="menu-toggle">
            <span>Luz ambiente</span>
            <input
              type="checkbox"
              checked={ambientLightEnabled}
              onChange={toggleAmbientLight}
            />
          </label>
        </div>
      )}
    </div>
  )
}
