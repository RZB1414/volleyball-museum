/**
 * First-person player controller.
 *
 * NO AVATAR. Nothing in the three.js ecosystem generates a credible human from
 * code, the most discoverable "procedural human" library is GPL-3.0, and an
 * empty museum after hours is a stronger image than one with low-poly visitors
 * standing in the corner. Embodiment is sold entirely through motion and a
 * held object instead — which is also the cheap option, and removes an entire
 * class of arm-IK and wall-clipping bugs.
 *
 * The pointer-lock handling here is carried over from the previous build
 * because it was already right: `unadjustedMovement` bypasses the OS mouse
 * acceleration path, which is the documented cause of pointer-lock stutter with
 * high-polling-rate mice ("the mouse stutters but the trackpad is fine"), and
 * the pointermove/mousemove fallback covers browsers that do not deliver the
 * former under lock.
 */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'

import { useMuseum } from '../state/store'
import type { CollisionWorld } from './collision'
import { movePlayer } from './collision'
import { playerPosition } from './playerPosition'

const CAPSULE = { radius: 0.3, height: 1.75 }
const EYE_HEIGHT = 1.62
const BASE_SPEED = 3.4
const ACCELERATION = 14
const DECELERATION = 18
const MOUSE_LOOK_SPEED = 0.0016
const TOUCH_LOOK_SPEED = 1.9
const TOUCH_LOOK_SMOOTHING = 8
const TOUCH_DEAD_ZONE = 0.02
/** Never let one long frame teleport the player through a wall. */
const MAX_FRAME_DELTA = 1 / 30
/** Below this the player has left the building; respawn rather than fall forever. */
const FALL_LIMIT = -8

const PITCH_MIN = -Math.PI * 0.48
const PITCH_MAX = Math.PI * 0.48

// Head bob. Off by default; these are the values used when it is switched on.
const BOB_FREQUENCY = 2.0
const BOB_VERTICAL = 0.03
const BOB_ROLL = MathUtils.degToRad(0.8)
const FOV_BASE = 68
const FOV_PUSH = 4

export type PlayerControllerProps = {
  world: CollisionWorld | null
  spawn?: [number, number, number]
  /** Initial heading, radians. Without it the player faces -Z, whatever is there. */
  spawnYaw?: number
  /** Fired when the player crosses into a different room's bounds. */
  onFootstep?: (surface: string, intensity: number) => void
}

const keys = new Set<string>()

const forward = new Vector3()
const right = new Vector3()
const wish = new Vector3()
const displacement = new Vector3()
const touchWish = new Vector3()

export function PlayerController({
  world,
  spawn = [0, 0, 4],
  spawnYaw = 0,
  onFootstep,
}: PlayerControllerProps) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const regress = useThree((state) => state.performance.regress)

  const positionRef = useRef(new Vector3(...spawn))
  const velocityRef = useRef(new Vector3())
  const verticalVelocityRef = useRef(0)
  const pendingLookRef = useRef({ x: 0, y: 0 })
  const smoothedTouchLookRef = useRef({ x: 0, y: 0 })
  const bobPhaseRef = useRef(0)
  const lastFootstepPhaseRef = useRef(0)

  const setPointerLocked = useMuseum((state) => state.setPointerLocked)

  useEffect(() => {
    camera.rotation.order = 'YXZ'
    camera.rotation.y = spawnYaw
    camera.fov = FOV_BASE
    camera.updateProjectionMatrix()
    // Only on mount: re-running this on every spawnYaw change would snap the
    // camera out of the player's hands mid-look.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera])

  // --- pointer lock ---------------------------------------------------------
  useEffect(() => {
    const canvas =
      (document.getElementById('museum-canvas') as HTMLCanvasElement | null) ??
      document.querySelector('canvas')
    if (!canvas) return undefined

    let pointerMoveSeen = false
    let useMouseMoveFallback = !('PointerEvent' in window)
    let fallbackAttached = false
    let fallbackTimer = 0

    const accumulate = (movementX: number, movementY: number) => {
      pendingLookRef.current.x += movementX
      pendingLookRef.current.y += movementY
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas || !useMouseMoveFallback) return
      accumulate(event.movementX, event.movementY)
    }

    const attachFallback = () => {
      if (fallbackAttached) return
      canvas.addEventListener('mousemove', handleMouseMove, { passive: true })
      fallbackAttached = true
    }

    const detachFallback = () => {
      if (!fallbackAttached) return
      canvas.removeEventListener('mousemove', handleMouseMove)
      fallbackAttached = false
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (document.pointerLockElement !== canvas) return
      pointerMoveSeen = true
      useMouseMoveFallback = false
      detachFallback()
      accumulate(event.movementX, event.movementY)
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || document.pointerLockElement === canvas) return
      if (useMuseum.getState().examining) return
      // unadjustedMovement skips the OS acceleration curve. Without it, a
      // high-polling-rate mouse produces visible stutter under pointer lock
      // while a trackpad feels fine — the classic misleading symptom.
      canvas.requestPointerLock({ unadjustedMovement: true }).catch(() => {
        canvas.requestPointerLock()
      })
    }

    const handleLockChange = () => {
      const locked = document.pointerLockElement === canvas
      setPointerLocked(locked)
      window.clearTimeout(fallbackTimer)
      pendingLookRef.current.x = 0
      pendingLookRef.current.y = 0

      if (!locked) {
        pointerMoveSeen = false
        useMouseMoveFallback = !('PointerEvent' in window)
        detachFallback()
        return
      }

      pointerMoveSeen = false
      useMouseMoveFallback = !('PointerEvent' in window)

      if (useMouseMoveFallback) {
        attachFallback()
      } else {
        // Some browsers accept the lock but never deliver pointermove under it.
        // Give them a moment, then switch.
        fallbackTimer = window.setTimeout(() => {
          if (!pointerMoveSeen && document.pointerLockElement === canvas) {
            useMouseMoveFallback = true
            attachFallback()
          }
        }, 250)
      }
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('pointerlockchange', handleLockChange)
    if ('PointerEvent' in window) {
      canvas.addEventListener('pointermove', handlePointerMove, { passive: true })
    } else {
      attachFallback()
    }

    return () => {
      window.clearTimeout(fallbackTimer)
      canvas.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('pointerlockchange', handleLockChange)
      canvas.removeEventListener('pointermove', handlePointerMove)
      detachFallback()
      setPointerLocked(false)
    }
  }, [setPointerLocked])

  // --- keyboard -------------------------------------------------------------
  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.add(event.code)
    const up = (event: KeyboardEvent) => keys.delete(event.code)
    const blur = () => keys.clear()

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    // Without this, alt-tabbing mid-stride leaves the player walking forever.
    window.addEventListener('blur', blur)

    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      keys.clear()
    }
  }, [])

  const spawnKey = useMemo(() => spawn.join(','), [spawn])
  useEffect(() => {
    positionRef.current.set(...spawn)
    velocityRef.current.set(0, 0, 0)
    verticalVelocityRef.current = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spawnKey])

  /**
   * Dev-only teleport.
   *
   * This is the harness the project needs more than most: the agent building it
   * cannot walk the museum, so the only way to check that a gallery is lit,
   * populated and correctly culled is to put the camera there from outside the
   * page and read the counters back. It is also the seam a scripted headless
   * playthrough will hang off later.
   */
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined

    window.__museumTeleport = (x: number, y: number, z: number, yaw?: number, pitch?: number) => {
      positionRef.current.set(x, y, z)
      velocityRef.current.set(0, 0, 0)
      verticalVelocityRef.current = 0
      if (typeof yaw === 'number') camera.rotation.y = yaw
      camera.rotation.x = typeof pitch === 'number' ? pitch : 0
      camera.position.set(x, y + EYE_HEIGHT, z)
      playerPosition.copy(positionRef.current)
    }

    return () => {
      delete window.__museumTeleport
    }
  }, [camera])

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA)
    const {
      settings,
      touchMove,
      touchLook,
      examining,
    } = useMuseum.getState()

    // Examining an object freezes locomotion: the player is holding something
    // up to their face, not walking.
    const frozen = examining !== null

    // --- look ---------------------------------------------------------------
    const pending = pendingLookRef.current
    if (!frozen && (pending.x !== 0 || pending.y !== 0)) {
      regress()
      camera.rotation.y -= pending.x * MOUSE_LOOK_SPEED * settings.lookSensitivity
      camera.rotation.x = MathUtils.clamp(
        camera.rotation.x - pending.y * MOUSE_LOOK_SPEED * settings.lookSensitivity,
        PITCH_MIN,
        PITCH_MAX,
      )
    }
    pending.x = 0
    pending.y = 0

    const smoothedTouch = smoothedTouchLookRef.current
    const touchLerp = 1 - Math.exp(-TOUCH_LOOK_SMOOTHING * delta)
    smoothedTouch.x += (touchLook.x - smoothedTouch.x) * touchLerp
    smoothedTouch.y += (touchLook.y - smoothedTouch.y) * touchLerp

    if (
      !frozen &&
      (Math.abs(smoothedTouch.x) > TOUCH_DEAD_ZONE || Math.abs(smoothedTouch.y) > TOUCH_DEAD_ZONE)
    ) {
      const speed = TOUCH_LOOK_SPEED * settings.touchLookSensitivity * delta
      camera.rotation.y -= smoothedTouch.x * speed
      camera.rotation.x = MathUtils.clamp(
        camera.rotation.x - smoothedTouch.y * speed,
        PITCH_MIN,
        PITCH_MAX,
      )
    }

    // --- movement -----------------------------------------------------------
    const velocity = velocityRef.current

    if (frozen || !world) {
      velocity.set(0, 0, 0)
    } else {
      camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()
      right.crossVectors(forward, camera.up).normalize()

      wish.set(0, 0, 0)
      if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(forward)
      if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(forward)
      if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(right)
      if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(right)
      if (wish.lengthSq() > 1) wish.normalize()

      touchWish.set(0, 0, 0)
      if (touchMove.y !== 0) touchWish.addScaledVector(forward, touchMove.y)
      if (touchMove.x !== 0) touchWish.addScaledVector(right, touchMove.x)
      if (touchWish.lengthSq() > 1) touchWish.normalize()
      wish.addScaledVector(touchWish, settings.touchMoveSensitivity)
      if (wish.lengthSq() > 1) wish.normalize()

      const targetSpeed = BASE_SPEED * settings.moveSpeed
      const moving = wish.lengthSq() > 1e-6
      const rate = moving ? ACCELERATION : DECELERATION
      const blend = 1 - Math.exp(-rate * delta)

      velocity.x += (wish.x * targetSpeed - velocity.x) * blend
      velocity.z += (wish.z * targetSpeed - velocity.z) * blend
      if (velocity.lengthSq() < 1e-6) velocity.set(0, 0, 0)
    }

    /**
     * Do not simulate against an empty world.
     *
     * The controller starts running the moment the Canvas mounts, but colliders
     * are only registered once each room's GLB has come back through Suspense.
     * Integrating gravity in that gap means the player free-falls for the whole
     * load — by the time the floor exists they are metres beneath it, and the
     * floor then pushes them further DOWN because that is the nearest way out.
     *
     * The symptom is a flat, featureless screen a second after entering: the
     * camera is under the building looking at nothing. It is also invisible to
     * every teleport-based test, because by then loading has finished.
     */
    if (world && world.size > 0) {
      displacement.set(velocity.x * delta, 0, velocity.z * delta)
      const result = movePlayer(
        world,
        positionRef.current,
        displacement,
        verticalVelocityRef.current,
        delta,
        CAPSULE,
      )
      positionRef.current.copy(result.position)
      verticalVelocityRef.current = result.verticalVelocity

      // Last-resort guard. Any hole in the collision mesh, any content edit
      // that leaves a gap, and the player is gone with no way back — a fall
      // through the floor must never be an unrecoverable state.
      if (positionRef.current.y < FALL_LIMIT) {
        positionRef.current.set(...spawn)
        velocityRef.current.set(0, 0, 0)
        verticalVelocityRef.current = 0
      }
    } else {
      // Hold still, and keep the fall from accumulating while we wait.
      verticalVelocityRef.current = 0
    }

    // --- head bob and footsteps ---------------------------------------------
    const speed = Math.hypot(velocity.x, velocity.z)
    const speedRatio = MathUtils.clamp(speed / (BASE_SPEED * settings.moveSpeed), 0, 1)

    // The bob phase drives footsteps whether or not the visual bob is enabled.
    // Locking audio to the same phase is what makes the walk read as walking
    // rather than floating, and it means turning bob off does not desynchronise
    // the sound.
    bobPhaseRef.current += delta * BOB_FREQUENCY * Math.PI * 2 * speedRatio

    if (speedRatio > 0.15) {
      const cycle = Math.floor(bobPhaseRef.current / Math.PI)
      if (cycle !== lastFootstepPhaseRef.current) {
        lastFootstepPhaseRef.current = cycle
        onFootstep?.('wood', speedRatio)
      }
    }

    let bobOffset = 0
    let bobRoll = 0
    if (settings.headBob) {
      bobOffset = Math.sin(bobPhaseRef.current) * BOB_VERTICAL * speedRatio
      bobRoll = Math.cos(bobPhaseRef.current * 0.5) * BOB_ROLL * speedRatio
    }

    const targetFov = settings.fovPush ? FOV_BASE + FOV_PUSH * speedRatio : FOV_BASE
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov = MathUtils.damp(camera.fov, targetFov, 6, delta)
      camera.updateProjectionMatrix()
    }

    camera.position.set(
      positionRef.current.x,
      positionRef.current.y + EYE_HEIGHT + bobOffset,
      positionRef.current.z,
    )
    camera.rotation.z = bobRoll

    // Published for portal culling, audio and the interaction raycast, all of
    // which run inside useFrame and can read it directly.
    playerPosition.copy(positionRef.current)
  })

  return null
}
