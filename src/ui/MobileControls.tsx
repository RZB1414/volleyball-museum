import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { MUSEUM } from '../content/museum'
import { readHoldMark } from '../engine/holdAction'
import { interactionHeldOf, interactionWinnerKey, parseInteractionWinnerKey } from '../engine/interactionTarget'
import {
  actionClick,
  actionPointerDown,
  actionPointerUp,
  beginDirectionalPadSession,
  createDirectionalPadSession,
  NO_ACTION_POINTER,
  ownsDirectionalPadPointer,
  pointerLeaveReleases,
  resetDirectionalPadSession,
  sampleDirectionalDrag,
} from '../engine/mobileControls'
import {
  cancelPrimaryHold,
  pressPrimaryAction,
  primaryHoldMark,
  releasePrimaryAction,
  subscribePrimaryHold,
  triggerPrimaryAction,
} from '../engine/primaryAction'
import { useTranslate } from '../i18n'
import { useMuseum, type DirectionalInput } from '../state/store'
import { doorActionAvailable } from './hudRules'

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
  // The press that is held (a term being signed): a ring on the button while
  // it is down, and the two answers in its place after a tap.
  const hold = readHoldMark(useSyncExternalStore(subscribePrimaryHold, primaryHoldMark, () => 'idle'))
  const t = useTranslate()
  const [resetEpoch, setResetEpoch] = useState(0)
  /**
   * Whether the press the button would make has to be held: a desk with a
   * term ready. Asked of the same arbitration the handlers ask, so the
   * button and the key cannot disagree about what is under the crosshair.
   */
  const held = useMuseum((state) => interactionHeldOf(state, MUSEUM))
  /**
   * What the action buttons remember of the pointer between its events:
   * whether it was itself a press, and when it last did something. The three
   * rules that read and write it are `engine/mobileControls.ts`'s, where a
   * suite runs them; the three buttons below share this one memory, because
   * the tap that asks the question lands its click on the button that
   * answers it.
   */
  const pointerRef = useRef(NO_ACTION_POINTER)
  /** Whether the button holds the pointer that pressed it; true until a capture is refused. */
  const capturedRef = useRef(true)

  /**
   * A pointer went down on an action button. `press` is what it does if it
   * is itself the press (something held, or one of the two answers), and
   * null where the click is still the press. The pointer that presses is
   * captured, so that its release reaches the button even if the thumb
   * slides off it: that is how a held press knows it was let go.
   */
  const pointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, press: (() => void) | null) => {
    event.preventDefault()
    event.stopPropagation()
    pointerRef.current = actionPointerDown(press !== null, event.timeStamp)
    if (press === null) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
      capturedRef.current = true
    } catch {
      // Without capture a release outside the button is lost: leaving the
      // button is taken as the release instead (`pointerLeft`, below).
      capturedRef.current = false
    }
    press()
  }, [])
  /** The pointer came up, or was taken away: for one that pressed, the release of a held press. */
  const pointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const up = actionPointerUp(pointerRef.current, event.timeStamp)
    pointerRef.current = up.pointer
    if (up.release) releasePrimaryAction()
  }, [])
  /** The pointer slid off the button: a release only for one the button could not capture. */
  const pointerLeft = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (pointerLeaveReleases(capturedRef.current)) pointerUp(event)
    },
    [pointerUp],
  )
  /**
   * A click is the press unless a pointer already was: the click a tap
   * leaves behind would act a second time, and lands on whatever the tap put
   * under the finger.
   */
  const clicked = useCallback((event: ReactMouseEvent<HTMLButtonElement>, act: () => void) => {
    const click = actionClick(pointerRef.current, event.detail, event.timeStamp)
    pointerRef.current = click.pointer
    if (click.press) act()
  }, [])

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

  // A door that will not open still answers a press, with its buzz, on touch
  // as well; the rule is the HUD's, where a suite can ask it.
  const doorCanAct = doorActionAvailable(focusedDoor)
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

      {actionVisible && hold.phase === 'confirming' ? (
        // A tap on something that has to be held asks first. «Cancelar» takes
        // the place the Action button had, under the thumb that tapped: a
        // second tap by reflex must not be the signature.
        <div className="hold-confirm-buttons" data-mobile-control="confirm">
          <button
            className="mobile-action-button is-confirm"
            type="button"
            onClick={(event) => clicked(event, triggerPrimaryAction)}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={(event) => pointerDown(event, pressPrimaryAction)}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            onPointerLeave={pointerLeft}
          >
            {t('desk.sign')}
          </button>
          <button
            className="mobile-action-button is-cancel"
            type="button"
            onClick={(event) => clicked(event, cancelPrimaryHold)}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={(event) => pointerDown(event, cancelPrimaryHold)}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
          >
            {t('desk.cancel')}
          </button>
        </div>
      ) : actionVisible ? (
        <button
          className={hold.phase === 'holding' ? 'mobile-action-button is-holding' : 'mobile-action-button'}
          style={hold.phase === 'holding' ? ({ '--hold-seconds': `${hold.seconds}s` } as CSSProperties) : undefined}
          data-mobile-control="action"
          type="button"
          aria-label={t('mobile.action')}
          // Everything but a signature acts on the click, as it always did:
          // acting as the finger lands would open a panel under it, and the
          // click of that same tap would then press whatever the panel put
          // there. A press that has to be held cannot wait for a click, which
          // says neither when it began nor when it ended: that one, and only
          // that one, is taken as the pointer goes down.
          onClick={(event) => clicked(event, triggerPrimaryAction)}
          // A long press must not bring up the browser's menu and cancel the pointer.
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => pointerDown(event, held ? pressPrimaryAction : null)}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onLostPointerCapture={pointerUp}
          onPointerLeave={pointerLeft}
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
