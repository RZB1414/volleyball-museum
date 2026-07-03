import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { useGameStore } from '../store/gameStore'
import type { DirectionalInput } from '../types/game'

const DEAD_ZONE = 0.08
const DRAG_START_DISTANCE = 8
const ZERO_INPUT: DirectionalInput = { x: 0, y: 0 }

type DirectionalPadProps = {
  label: string
  className: string
  activationMode?: 'drag' | 'immediate'
  invertY?: boolean
  onChange: (x: number, y: number) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getStickInput(
  target: HTMLDivElement,
  clientX: number,
  clientY: number,
): { input: DirectionalInput; visual: DirectionalInput } {
  const rect = target.getBoundingClientRect()
  const radius = Math.min(rect.width, rect.height) * 0.34
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const dx = clientX - centerX
  const dy = clientY - centerY
  const distance = Math.hypot(dx, dy)
  const limitedDistance = Math.min(distance, radius)
  const directionX = distance > 0 ? dx / distance : 0
  const directionY = distance > 0 ? dy / distance : 0
  const magnitude = clamp((limitedDistance / radius - DEAD_ZONE) / (1 - DEAD_ZONE), 0, 1)

  return {
    input: {
      x: directionX * magnitude,
      y: directionY * magnitude,
    },
    visual: {
      x: directionX * (limitedDistance / radius),
      y: directionY * (limitedDistance / radius),
    },
  }
}

function DirectionalPad({
  label,
  className,
  activationMode = 'immediate',
  invertY = false,
  onChange,
}: DirectionalPadProps) {
  const activePointerId = useRef<number | null>(null)
  const dragStartRef = useRef<DirectionalInput>(ZERO_INPUT)
  const inputActiveRef = useRef(false)
  const [visualInput, setVisualInput] = useState<DirectionalInput>(ZERO_INPUT)

  const reset = useCallback(() => {
    activePointerId.current = null
    inputActiveRef.current = false
    setVisualInput(ZERO_INPUT)
    onChange(0, 0)
  }, [onChange])

  const updateInput = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const { input, visual } = getStickInput(
        event.currentTarget,
        event.clientX,
        event.clientY,
      )

      setVisualInput(visual)
      onChange(input.x, invertY ? -input.y : input.y)
    },
    [invertY, onChange],
  )

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      activePointerId.current = event.pointerId
      dragStartRef.current = { x: event.clientX, y: event.clientY }
      inputActiveRef.current = activationMode === 'immediate'
      event.currentTarget.setPointerCapture(event.pointerId)

      if (inputActiveRef.current) {
        updateInput(event)
      }
    },
    [activationMode, updateInput],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== event.pointerId) {
        return
      }

      event.preventDefault()

      if (!inputActiveRef.current) {
        const dragDistance = Math.hypot(
          event.clientX - dragStartRef.current.x,
          event.clientY - dragStartRef.current.y,
        )

        if (dragDistance < DRAG_START_DISTANCE) {
          return
        }

        inputActiveRef.current = true
      }

      updateInput(event)
    },
    [updateInput],
  )

  const handlePointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== event.pointerId) {
        return
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      reset()
    },
    [reset],
  )

  return (
    <div
      className={`mobile-control-stick ${className}`}
      aria-label={label}
      role="group"
      onContextMenu={(event) => event.preventDefault()}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
    >
      <span className="mobile-stick-ring" aria-hidden="true" />
      <span
        className="mobile-stick-thumb"
        style={{
          transform: `translate(${visualInput.x * 30}px, ${visualInput.y * 30}px)`,
        }}
        aria-hidden="true"
      />
    </div>
  )
}

function TorchIcon() {
  return (
    <svg
      className="mobile-torch-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12.4 2.4c2 1.7 3.2 3.5 3.2 5.4 0 2.2-1.6 4-3.6 4s-3.6-1.6-3.6-3.8c0-1.4.7-2.8 2-4.1.1 1.3.7 2.2 1.6 2.7.7-.9.8-2.3.4-4.2Z" />
      <path d="M7.6 11.5h8.8l-.9 3.2h-7l-.9-3.2Z" />
      <path d="M8.8 15.5h6.4l1.7 6H7.1l1.7-6Z" />
    </svg>
  )
}

export function MobileControls() {
  const torchEnabled = useGameStore((state) => state.torchEnabled)
  const canSit = useGameStore((state) => state.canSit)
  const sitting = useGameStore((state) => state.sitting)
  const setMobileMove = useGameStore((state) => state.setMobileMove)
  const setMobileLook = useGameStore((state) => state.setMobileLook)
  const resetMobileControls = useGameStore((state) => state.resetMobileControls)
  const toggleTorch = useGameStore((state) => state.toggleTorch)
  const toggleSit = useGameStore((state) => state.toggleSit)

  useEffect(() => resetMobileControls, [resetMobileControls])

  return (
    <div className="mobile-controls" aria-label="Controles mobile">
      <DirectionalPad
        label="Direcional de camera"
        className="mobile-control-stick--look"
        activationMode="drag"
        onChange={setMobileLook}
      />

      <button
        className={`mobile-torch-toggle${torchEnabled ? ' is-on' : ''}`}
        type="button"
        aria-label={torchEnabled ? 'Apagar tocha' : 'Acender tocha'}
        aria-pressed={torchEnabled}
        onClick={toggleTorch}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <TorchIcon />
      </button>

      {(canSit || sitting) && (
        <button
          className="mobile-sit-toggle"
          type="button"
          aria-label={sitting ? 'Levantar' : 'Sentar'}
          onClick={toggleSit}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {sitting ? 'Levantar' : 'Sentar'}
        </button>
      )}

      <DirectionalPad
        label="Direcional de movimento"
        className="mobile-control-stick--move"
        invertY
        onChange={setMobileMove}
      />
    </div>
  )
}
