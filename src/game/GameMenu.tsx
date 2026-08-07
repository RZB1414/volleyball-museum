import { useState, type ChangeEvent } from 'react'
import { useGameStore } from '../store/gameStore'

const MIN_JOYSTICK_SENSITIVITY = 0.5
const MAX_JOYSTICK_SENSITIVITY = 1.8
const JOYSTICK_SENSITIVITY_STEP = 0.05

function formatSensitivity(value: number) {
  return `${Math.round(value * 100)}%`
}

function readSensitivity(event: ChangeEvent<HTMLInputElement>) {
  return Number(event.currentTarget.value)
}

export function GameMenu() {
  const [menuOpen, setMenuOpen] = useState(false)
  const ambientLightEnabled = useGameStore((state) => state.ambientLightEnabled)
  const mobileMoveSensitivity = useGameStore((state) => state.mobileMoveSensitivity)
  const mobileLookSensitivity = useGameStore((state) => state.mobileLookSensitivity)
  const toggleAmbientLight = useGameStore((state) => state.toggleAmbientLight)
  const setMobileMoveSensitivity = useGameStore((state) => state.setMobileMoveSensitivity)
  const setMobileLookSensitivity = useGameStore((state) => state.setMobileLookSensitivity)
  const resetMobileControls = useGameStore((state) => state.resetMobileControls)

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
        <div
          className="menu-panel"
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            resetMobileControls()
            event.stopPropagation()
          }}
          onPointerMove={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
        >
          <label className="menu-toggle">
            <span>Luz ambiente</span>
            <input
              type="checkbox"
              checked={ambientLightEnabled}
              onChange={toggleAmbientLight}
            />
          </label>

          <div className="menu-range-group">
            <label className="menu-range">
              <span className="menu-range-label">
                <span>Movimento</span>
                <span className="menu-range-value">{formatSensitivity(mobileMoveSensitivity)}</span>
              </span>
              <input
                type="range"
                min={MIN_JOYSTICK_SENSITIVITY}
                max={MAX_JOYSTICK_SENSITIVITY}
                step={JOYSTICK_SENSITIVITY_STEP}
                value={mobileMoveSensitivity}
                aria-label="Sensibilidade do joystick de movimento"
                onChange={(event) => setMobileMoveSensitivity(readSensitivity(event))}
              />
            </label>

            <label className="menu-range">
              <span className="menu-range-label">
                <span>Visão</span>
                <span className="menu-range-value">{formatSensitivity(mobileLookSensitivity)}</span>
              </span>
              <input
                type="range"
                min={MIN_JOYSTICK_SENSITIVITY}
                max={MAX_JOYSTICK_SENSITIVITY}
                step={JOYSTICK_SENSITIVITY_STEP}
                value={mobileLookSensitivity}
                aria-label="Sensibilidade do joystick de visão"
                onChange={(event) => setMobileLookSensitivity(readSensitivity(event))}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
