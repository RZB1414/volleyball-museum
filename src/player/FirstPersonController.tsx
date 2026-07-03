import { PointerLockControls } from '@react-three/drei'
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat'
import { useGameStore } from '../store/gameStore'
import { CHAIR_POSITION, SIT_APPROACH_RADIUS } from '../world/MuseumRoom'

const MOVE_SPEED = 4.0
const MOBILE_LOOK_SPEED = 0.62
const MOBILE_LOOK_SMOOTHING = 7
const MOBILE_LOOK_MAX_PITCH = Math.PI * 0.4
const MOBILE_LOOK_DEAD_ZONE = 0.02
const EYE_HEIGHT = 0.75
const ACCELERATION = 16
const DECELERATION = 20
const MAX_FRAME_DELTA = 1 / 30

// Sitting is a two-stage scripted move: first walk to the spot in front of the
// chair (facing the desk), then lower down into the seat. Standing up reverses
// the same two stages.
const SIT_EYE_HEIGHT = 0.42
const SIT_WALK_RATE = 2.2
const SIT_SETTLE_RATE = 4
const SIT_APPROACH_DISTANCE = 0.75
const SIT_WALK_ARRIVED = 0.97
const SIT_SETTLE_START = 0.85
const SIT_WALK_RETREAT = 0.15
// Camera yaw that matches the chair's own facing direction (+X, toward the desk).
const SIT_LOOK_ROTATION_Y = -Math.PI / 2
const SIT_LOOK_PITCH = 0
// While seated, vision is limited so the player can't look straight down (no legs
// to see) or turn all the way around to look behind the chair.
const SIT_MAX_YAW_OFFSET = Math.PI * 0.56
const SIT_POLAR_MIN = Math.PI * 0.25
const SIT_POLAR_MAX = Math.PI * 0.6
const SIT_MOBILE_LOOK_MAX_PITCH = Math.PI * 0.22
const STANDING_POLAR_MIN = Math.PI * 0.1
const STANDING_POLAR_MAX = Math.PI * 0.9

const SIT_APPROACH_POSITION: [number, number] = [
  CHAIR_POSITION[0] + SIT_APPROACH_DISTANCE,
  CHAIR_POSITION[2],
]

const keys = new Set<string>()

const forward = new Vector3()
const right = new Vector3()
const movement = new Vector3()
const desiredVelocity = new Vector3()
const desiredTranslation = new Vector3()
const nextPosition = new Vector3()
const mobileLookTarget = new Vector3()
const sitEntryPosition = new Vector3()

function smoothstep(value: number) {
  return value * value * (3 - 2 * value)
}

function wrapAngle(angle: number) {
  return MathUtils.euclideanModulo(angle + Math.PI, Math.PI * 2) - Math.PI
}

function lerpAngle(from: number, to: number, t: number) {
  return from + wrapAngle(to - from) * t
}

function clampAngleAround(angle: number, center: number, maxOffset: number) {
  return center + MathUtils.clamp(wrapAngle(angle - center), -maxOffset, maxOffset)
}

export function FirstPersonController() {
  const bodyRef = useRef<RapierRigidBody>(null)
  const colliderRef = useRef<RapierCollider>(null)
  const characterControllerRef = useRef<KinematicCharacterController | null>(null)
  const currentVelocityRef = useRef(new Vector3())
  const currentMobileLookRef = useRef(new Vector3())
  const walkProgressRef = useRef(0)
  const settleProgressRef = useRef(0)
  const wasSittingRef = useRef(false)
  const canSitRef = useRef(false)
  const sitEntryYawRef = useRef(0)
  const sitEntryPitchRef = useRef(0)
  const camera = useThree((state) => state.camera)
  const { world } = useRapier()
  const playerStartPosition = useGameStore((state) => state.playerStartPosition)
  const setPointerLocked = useGameStore((state) => state.setPointerLocked)
  const toggleTorch = useGameStore((state) => state.toggleTorch)
  const toggleSit = useGameStore((state) => state.toggleSit)
  const sitting = useGameStore((state) => state.sitting)
  const initialPosition = useMemo(() => playerStartPosition, [playerStartPosition])

  useEffect(() => {
    camera.rotation.order = 'YXZ'
  }, [camera])

  useEffect(() => {
    const characterController = world.createCharacterController(0.04)
    characterController.setSlideEnabled(true)
    characterController.enableSnapToGround(0.12)
    characterController.enableAutostep(0.18, 0.2, false)
    characterControllerRef.current = characterController

    return () => {
      world.removeCharacterController(characterController)
      characterControllerRef.current = null
    }
  }, [world])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyT' && !event.repeat) {
        toggleTorch()
        return
      }

      if (event.code === 'KeyQ' && !event.repeat) {
        toggleSit()
        return
      }

      keys.add(event.code)
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      keys.clear()
    }
  }, [toggleTorch, toggleSit])

  useFrame((_, delta) => {
    const body = bodyRef.current
    const collider = colliderRef.current
    const characterController = characterControllerRef.current

    if (!body || !collider || !characterController) {
      return
    }

    const frameDelta = Math.min(delta, MAX_FRAME_DELTA)
    const translation = body.translation()
    const currentVelocity = currentVelocityRef.current
    const currentMobileLook = currentMobileLookRef.current
    const { mobileLook, mobileMove, sitting: isSitting, setCanSit } = useGameStore.getState()

    const distanceToChair = Math.hypot(
      translation.x - CHAIR_POSITION[0],
      translation.z - CHAIR_POSITION[2],
    )
    const nextCanSit = distanceToChair <= SIT_APPROACH_RADIUS

    if (nextCanSit !== canSitRef.current) {
      canSitRef.current = nextCanSit
      setCanSit(nextCanSit)
    }

    if (isSitting && !wasSittingRef.current) {
      sitEntryPosition.set(translation.x, 0, translation.z)
      sitEntryYawRef.current = camera.rotation.y
      sitEntryPitchRef.current = camera.rotation.x
    }

    wasSittingRef.current = isSitting

    // Sequenced targets: walking finishes before settling starts, and on the way
    // back up settling reverses before walking away starts.
    const walkTarget = isSitting ? 1 : settleProgressRef.current > SIT_WALK_RETREAT ? 1 : 0
    const settleTarget = isSitting && walkProgressRef.current > SIT_SETTLE_START ? 1 : 0

    walkProgressRef.current = MathUtils.damp(walkProgressRef.current, walkTarget, SIT_WALK_RATE, frameDelta)
    settleProgressRef.current = MathUtils.damp(
      settleProgressRef.current,
      settleTarget,
      SIT_SETTLE_RATE,
      frameDelta,
    )

    const walkProgress = walkProgressRef.current
    const settleProgress = settleProgressRef.current
    const walkEased = smoothstep(walkProgress)
    const settleEased = smoothstep(settleProgress)
    const isApproaching = isSitting && walkProgress < SIT_WALK_ARRIVED
    const isSitLocked = isSitting || walkProgress > 0.02 || settleProgress > 0.02

    if (isApproaching) {
      // Scripted turn to face the desk while walking in — mouse/touch look is ignored
      // for this brief moment, same as any other short contextual animation.
      camera.rotation.y = lerpAngle(sitEntryYawRef.current, SIT_LOOK_ROTATION_Y, walkEased)
      camera.rotation.x = MathUtils.lerp(sitEntryPitchRef.current, SIT_LOOK_PITCH, walkEased)
    } else {
      mobileLookTarget.set(mobileLook.x, mobileLook.y, 0)
      currentMobileLook.lerp(mobileLookTarget, 1 - Math.exp(-MOBILE_LOOK_SMOOTHING * frameDelta))

      const mobilePitchLimit = isSitLocked ? SIT_MOBILE_LOOK_MAX_PITCH : MOBILE_LOOK_MAX_PITCH

      if (
        Math.abs(currentMobileLook.x) > MOBILE_LOOK_DEAD_ZONE ||
        Math.abs(currentMobileLook.y) > MOBILE_LOOK_DEAD_ZONE
      ) {
        camera.rotation.y -= currentMobileLook.x * MOBILE_LOOK_SPEED * frameDelta
        camera.rotation.x = MathUtils.clamp(
          camera.rotation.x - currentMobileLook.y * MOBILE_LOOK_SPEED * frameDelta,
          -mobilePitchLimit,
          mobilePitchLimit,
        )
      }

      if (isSitLocked) {
        camera.rotation.y = clampAngleAround(camera.rotation.y, SIT_LOOK_ROTATION_Y, SIT_MAX_YAW_OFFSET)
      }
    }

    if (isSitLocked) {
      currentVelocity.set(0, 0, 0)

      const walkX = MathUtils.lerp(sitEntryPosition.x, SIT_APPROACH_POSITION[0], walkEased)
      const walkZ = MathUtils.lerp(sitEntryPosition.z, SIT_APPROACH_POSITION[1], walkEased)

      nextPosition.set(
        MathUtils.lerp(walkX, CHAIR_POSITION[0], settleEased),
        translation.y,
        MathUtils.lerp(walkZ, CHAIR_POSITION[2], settleEased),
      )
    } else {
      camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()

      right.crossVectors(forward, camera.up).normalize()

      movement.set(0, 0, 0)

      if (keys.has('KeyW') || keys.has('ArrowUp')) {
        movement.add(forward)
      }

      if (keys.has('KeyS') || keys.has('ArrowDown')) {
        movement.sub(forward)
      }

      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        movement.sub(right)
      }

      if (keys.has('KeyD') || keys.has('ArrowRight')) {
        movement.add(right)
      }

      if (mobileMove.y !== 0) {
        movement.addScaledVector(forward, mobileMove.y)
      }

      if (mobileMove.x !== 0) {
        movement.addScaledVector(right, mobileMove.x)
      }

      if (movement.lengthSq() > 1) {
        movement.normalize()
      }

      desiredVelocity.copy(movement).multiplyScalar(MOVE_SPEED)
      currentVelocity.lerp(
        desiredVelocity,
        1 - Math.exp(-(movement.lengthSq() > 0 ? ACCELERATION : DECELERATION) * frameDelta),
      )

      if (currentVelocity.lengthSq() < 0.0001) {
        currentVelocity.set(0, 0, 0)
      }

      desiredTranslation.copy(currentVelocity).multiplyScalar(frameDelta)
      characterController.computeColliderMovement(collider, {
        x: desiredTranslation.x,
        y: 0,
        z: desiredTranslation.z,
      })

      const correctedMovement = characterController.computedMovement()

      nextPosition.set(
        translation.x + correctedMovement.x,
        translation.y + correctedMovement.y,
        translation.z + correctedMovement.z,
      )
    }

    body.setNextKinematicTranslation(nextPosition)

    const eyeOffset = MathUtils.lerp(EYE_HEIGHT, SIT_EYE_HEIGHT, settleEased)
    camera.position.set(nextPosition.x, nextPosition.y + eyeOffset, nextPosition.z)
  })

  return (
    <>
      <PointerLockControls
        selector="#museum-game"
        makeDefault
        minPolarAngle={sitting ? SIT_POLAR_MIN : STANDING_POLAR_MIN}
        maxPolarAngle={sitting ? SIT_POLAR_MAX : STANDING_POLAR_MAX}
        pointerSpeed={0.8}
        onLock={() => setPointerLocked(true)}
        onUnlock={() => setPointerLocked(false)}
      />

      <RigidBody
        ref={bodyRef}
        colliders={false}
        enabledRotations={[false, false, false]}
        type="kinematicPosition"
        position={initialPosition}
      >
        <CapsuleCollider ref={colliderRef} args={[0.55, 0.35]} />
      </RigidBody>
    </>
  )
}
