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
import { Vector3 } from 'three'
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat'
import { useGameStore } from '../store/gameStore'

const MOVE_SPEED = 4.0
const EYE_HEIGHT = 0.75
const ACCELERATION = 16
const DECELERATION = 20
const MAX_FRAME_DELTA = 1 / 30
const keys = new Set<string>()

const forward = new Vector3()
const right = new Vector3()
const movement = new Vector3()
const desiredVelocity = new Vector3()
const desiredTranslation = new Vector3()
const nextPosition = new Vector3()

export function FirstPersonController() {
  const bodyRef = useRef<RapierRigidBody>(null)
  const colliderRef = useRef<RapierCollider>(null)
  const characterControllerRef = useRef<KinematicCharacterController | null>(null)
  const currentVelocityRef = useRef(new Vector3())
  const camera = useThree((state) => state.camera)
  const { world } = useRapier()
  const playerStartPosition = useGameStore((state) => state.playerStartPosition)
  const setPointerLocked = useGameStore((state) => state.setPointerLocked)
  const toggleTorch = useGameStore((state) => state.toggleTorch)
  const initialPosition = useMemo(() => playerStartPosition, [playerStartPosition])

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
  }, [toggleTorch])

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

    camera.position.set(translation.x, translation.y + EYE_HEIGHT, translation.z)

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

    if (movement.lengthSq() > 0) {
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

    body.setNextKinematicTranslation(nextPosition)
    camera.position.set(nextPosition.x, nextPosition.y + EYE_HEIGHT, nextPosition.z)
  })

  return (
    <>
      <PointerLockControls
        selector="#museum-game"
        makeDefault
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.9}
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
