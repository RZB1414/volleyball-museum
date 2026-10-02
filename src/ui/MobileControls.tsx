import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { MUSEUM } from '../content/museum'
import { interactionWinnerKey, parseInteractionWinnerKey } from '../engine/interactionTarget'
import {
  beginDirectionalPadSession,
  createDirectionalPadSession,
  ownsDirectionalPadPointer,
  resetDirectionalPadSession,
  sampleDirectionalDrag,
} from '../engine/mobileControls'
import { triggerPrimaryAction } from '../engine/primaryAction'
import { useTranslate } from '../i18n'
import { useMuseum, type DirectionalInput } from '../state/store'

const ZERO_INPUT: DirectionalInput = Object.freeze({ x: 0, y: 0 })
const THUMB_TRAVEL_PX = 30

type DirectionalPadProps = Readonly<{
  label: string
  control: 'move' | 'look'
  invertY?: boolean
  onChange: (x: number, y: number) => void
  resetEpoch: number
}>

function DirectionalPad({
  label,
  control,
  invertY = false,
  onChange,
  resetEpoch,
}: DirectionalPadProps) {
  const controlRef = useRef<HTMLDivElement | null>(null)
  const sessionRef = useRef(createDirectionalPadSession())
  const capturedRef = useRef(false)
  const [visualInput, setVisualInput] = useState<DirectionalInput>(ZERO_INPUT)

  const reset = useCallback(() => {
    const pointerId = resetDirectionalPadSession(sessionRef.current)
    capturedRef.current = false
    const controlElement = controlRef.current
    if (pointerId !== null && controlElement) {
      try {
        if (controlElement.hasPointerCapture(pointerId)) {
          controlElement.releasePointerCapture(pointerId)
        }
      } catch {
        // Safari may discard capture before orientation/fullscreen events arrive.
      }
    }
    setVisualInput(ZERO_INPUT)
    onChange(0, 0)
  }, [onChange])

  const updateAt = useCallback(
    (clientX: number, clientY: number) => {
      const controlElement = controlRef.current
      if (!controlElement) return
      // A fullscreen/orientation transition can resize the visual viewport
      // between two pointer events, so bounds are deliberately read each time.
      const sample = sampleDirectionalDrag(
        controlElement.getBoundingClientRect(),
        sessionRef.current,
        clientX,
        clientY,
        invertY,
      )
      setVisualInput(sample.visual)
      onChange(sample.input.x, sample.input.y)
    },
    [invertY, onChange],
  )

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        !beginDirectionalPadSession(
          sessionRef.current,
          event.pointerId,
          event.clientX,
          event.clientY,
        )
      ) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      // Pointer capture keeps the stick responsive when a thumb leaves the
      // ring, and lets two different pointers drive move and look together.
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
        capturedRef.current = event.currentTarget.hasPointerCapture(event.pointerId)
      } catch {
        // Window listeners below keep older/embedded Safari builds functional.
        capturedRef.current = false
      }
      updateAt(event.clientX, event.clientY)
    },
    [updateAt],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!ownsDirectionalPadPointer(sessionRef.current, event.pointerId)) return
      event.preventDefault()
      event.stopPropagation()
      updateAt(event.clientX, event.clientY)
    },
    [updateAt],
  )

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!ownsDirectionalPadPointer(sessionRef.current, event.pointerId)) return
      event.preventDefault()
      event.stopPropagation()
      reset()
    },
    [reset],
  )

  const handleLostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // A delayed loss event from pointer 1 must not cancel a new pointer 2.
      if (ownsDirectionalPadPointer(sessionRef.current, event.pointerId)) reset()
    },
    [reset],
  )

  useEffect(() => {
    const handleWindowMove = (event: PointerEvent) => {
      if (!ownsDirectionalPadPointer(sessionRef.current, event.pointerId)) return
      if (capturedRef.current) {
        try {
          if (controlRef.current?.hasPointerCapture(event.pointerId)) return
        } catch {
          // Fall through to window delivery when Safari loses capture silently.
        }
        capturedRef.current = false
      }
      event.preventDefault()
      updateAt(event.clientX, event.clientY)
    }
    const handleWindowEnd = (event: PointerEvent) => {
      if (!ownsDirectionalPadPointer(sessionRef.current, event.pointerId)) return
      event.preventDefault()
      reset()
    }
    window.addEventListener('pointermove', handleWindowMove, { passive: false })
    window.addEventListener('pointerup', handleWindowEnd, { passive: false })
    window.addEventListener('pointercancel', handleWindowEnd, { passive: false })
    return () => {
      window.removeEventListener('pointermove', handleWindowMove)
      window.removeEventListener('pointerup', handleWindowEnd)
      window.removeEventListener('pointercancel', handleWindowEnd)
    }
  }, [reset, updateAt])

  useEffect(() => {
    reset()
  }, [reset, resetEpoch])

  return (
    <div
      ref={controlRef}
      className={`mobile-control-stick mobile-control-stick--${control}`}
      data-mobile-control={control}
      aria-label={label}
      role="group"
      onContextMenu={(event) => event.preventDefault()}
      onLostPointerCapture={handleLostPointerCapture}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
    >
      <span className="mobile-stick-ring" aria-hidden="true" />
      <span
        className="mobile-stick-thumb"
        style={{
          transform: `translate(${visualInput.x * THUMB_TRAVEL_PX}px, ${visualInput.y * THUMB_TRAVEL_PX}px)`,
        }}
        aria-hidden="true"
      />
    </div>
  )
}

export function MobileControls() {
  const setTouchMove = useMuseum((state) => state.setTouchMove)
  const setTouchLook = useMuseum((state) => state.setTouchLook)
  const resetTouch = useMuseum((state) => state.resetTouch)
  const focusedDoor = useMuseum((state) => state.focusedTransitionDoor)
  // The button shows exactly when the shared arbitration has a live target,
  // the same answer the key handlers and the prompts use.
  const winner = parseInteractionWinnerKey(
    useMuseum((state) => interactionWinnerKey(state, MUSEUM)),
  )
  const examining = useMuseum((state) => state.examining)
  const openedContainer = useMuseum((state) => state.openedContainer)
  const activeLock = useMuseum((state) => state.activeLock)
  const journalTab = useMuseum((state) => state.journalTab)
  const t = useTranslate()
  const [resetEpoch, setResetEpoch] = useState(0)

  const resetAllPads = useCallback(() => {
    resetTouch()
    setResetEpoch((epoch) => epoch + 1)
  }, [resetTouch])

  useEffect(() => {
    const resetWhenHidden = () => {
      if (document.visibilityState !== 'visible') resetAllPads()
    }
    const orientation = window.screen.orientation
    window.addEventListener('blur', resetAllPads)
    window.addEventListener('pagehide', resetAllPads)
    window.addEventListener('orientationchange', resetAllPads)
    document.addEventListener('fullscreenchange', resetAllPads)
    orientation?.addEventListener('change', resetAllPads)
    document.addEventListener('visibilitychange', resetWhenHidden)
    return () => {
      window.removeEventListener('blur', resetAllPads)
      window.removeEventListener('pagehide', resetAllPads)
      window.removeEventListener('orientationchange', resetAllPads)
      document.removeEventListener('fullscreenchange', resetAllPads)
      orientation?.removeEventListener('change', resetAllPads)
      document.removeEventListener('visibilitychange', resetWhenHidden)
      resetTouch()
    }
  }, [resetAllPads, resetTouch])

  const suspended = Boolean(examining || openedContainer || activeLock || journalTab)
  useEffect(() => {
    if (suspended) resetAllPads()
  }, [resetAllPads, suspended])

  // A powerless lock still answers a press, with its buzz, on touch as well.
  const doorCanAct = Boolean(
    focusedDoor &&
      (focusedDoor.status !== 'blocked' || focusedDoor.blockedBy === 'unpowered') &&
      focusedDoor.status !== 'opening' &&
      !focusedDoor.armed,
  )
  const actionVisible = Boolean(
    !suspended &&
      winner &&
      (winner.kind === 'door' ? doorCanAct : winner.live),
  )

  if (suspended) return null

  return (
    <div className="mobile-controls" aria-label={t('mobile.controls')}>
      <DirectionalPad
        label={t('mobile.look')}
        control="look"
        onChange={setTouchLook}
        resetEpoch={resetEpoch}
      />

      {actionVisible ? (
        <button
          className="mobile-action-button"
          data-mobile-control="action"
          type="button"
          aria-label={t('mobile.action')}
          onClick={triggerPrimaryAction}
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          {t('mobile.action')}
        </button>
      ) : null}

      <DirectionalPad
        label={t('mobile.move')}
        control="move"
        invertY
        onChange={setTouchMove}
        resetEpoch={resetEpoch}
      />
    </div>
  )
}
