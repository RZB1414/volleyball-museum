import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import { Box3, Group, MathUtils, Mesh, PointLight, Vector3 } from 'three'
import { TorchFire } from '../effects/TorchFire'
import { useGameStore } from '../store/gameStore'

const TORCH_MODEL_PATH = '/models/Meshy_AI_Blazing_Torch_texture.glb'
const TORCH_SCALE = 0.38
const WALL_MARGIN = 0.5
const MIN_VISIBLE_DISTANCE = 0.15
const MIN_WALL_AVOIDANCE = 0.2
const TORCH_LIGHT_INTENSITY = 10
const TORCH_LIGHT_DISTANCE = 12
const TORCH_LIGHT_DECAY = 1.2

const activePose = {
  position: { x: 0.44, y: -0.48, z: -0.86 },
  rotation: { x: -0.38, y: 0.12, z: -0.16 },
}

const inactivePose = {
  position: { x: 0.56, y: -1.25, z: -0.56 },
  rotation: { x: -1.05, y: 0.2, z: -0.35 },
}

const desiredLocalPosition = new Vector3()
const desiredWorldPosition = new Vector3()
const rayDirection = new Vector3()
const cameraWorldPosition = new Vector3()
const torchTipOffset = new Vector3()

export function HandTorch() {
  const camera = useThree((state) => state.camera)
  const { rapier, world } = useRapier()
  const torchEnabled = useGameStore((state) => state.torchEnabled)
  const { scene } = useGLTF(TORCH_MODEL_PATH)
  const followerRef = useRef<Group>(null)
  const torchRef = useRef<Group>(null)
  const fireRef = useRef<Group>(null)
  const lightRef = useRef<PointLight>(null)
  const progressRef = useRef(0)
  const wallAvoidanceRef = useRef(1)

  const torchScene = useMemo(() => {
    const clone = scene.clone(true)

    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = false
        object.receiveShadow = false
      }
    })

    return clone
  }, [scene])

  // Tip of the torch head in model space, so the fire can track it through the torch's tilt.
  const torchTip = useMemo(() => {
    const bounds = new Box3().setFromObject(torchScene)
    const center = bounds.getCenter(new Vector3())
    return new Vector3(center.x, bounds.max.y, center.z)
  }, [torchScene])

  useFrame((state, delta) => {
    const follower = followerRef.current
    const torch = torchRef.current
    const fire = fireRef.current
    const light = lightRef.current

    if (!follower || !torch || !fire || !light) {
      return
    }

    const progress = MathUtils.damp(progressRef.current, torchEnabled ? 1 : 0, 7.5, delta)
    const easedProgress = progress * progress * (3 - 2 * progress)
    const time = state.clock.elapsedTime
    const flicker =
      0.92 +
      Math.sin(time * 9.4) * 0.05 +
      Math.sin(time * 23.7 + 1.3) * Math.sin(time * 5.3) * 0.035 +
      Math.sin(time * 41.3 + 4.1) * 0.015

    progressRef.current = progress

    follower.visible = progress > 0.015
    follower.position.copy(camera.position)
    follower.quaternion.copy(camera.quaternion)

    desiredLocalPosition.set(
      MathUtils.lerp(inactivePose.position.x, activePose.position.x, easedProgress),
      MathUtils.lerp(inactivePose.position.y, activePose.position.y, easedProgress),
      MathUtils.lerp(inactivePose.position.z, activePose.position.z, easedProgress),
    )

    camera.getWorldPosition(cameraWorldPosition)
    desiredWorldPosition.copy(desiredLocalPosition).applyQuaternion(camera.quaternion).add(cameraWorldPosition)
    rayDirection.subVectors(desiredWorldPosition, cameraWorldPosition)

    const desiredDistance = rayDirection.length()
    let targetAvoidance = 1

    if (desiredDistance > 0.001 && progress > 0.015) {
      rayDirection.normalize()

      const hit = world.castRay(
        new rapier.Ray(cameraWorldPosition, rayDirection),
        desiredDistance + WALL_MARGIN,
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        (collider) => collider.parent()?.isFixed() ?? false,
      )

      if (hit) {
        const allowedDistance = Math.max(MIN_VISIBLE_DISTANCE, hit.timeOfImpact - WALL_MARGIN)
        targetAvoidance = MathUtils.clamp(allowedDistance / desiredDistance, MIN_WALL_AVOIDANCE, 1)
      }
    }

    wallAvoidanceRef.current = MathUtils.damp(wallAvoidanceRef.current, targetAvoidance, 18, delta)

    const wallPressure = MathUtils.clamp(
      (1 - wallAvoidanceRef.current) / (1 - MIN_WALL_AVOIDANCE),
      0,
      1,
    )

    torch.position.set(
      MathUtils.lerp(desiredLocalPosition.x, desiredLocalPosition.x * wallAvoidanceRef.current, 0.8),
      desiredLocalPosition.y - wallPressure * 0.28,
      MathUtils.lerp(desiredLocalPosition.z, desiredLocalPosition.z * wallAvoidanceRef.current, 0.8),
    )

    torch.rotation.set(
      MathUtils.lerp(inactivePose.rotation.x, activePose.rotation.x, easedProgress) - wallPressure * 0.2,
      MathUtils.lerp(inactivePose.rotation.y, activePose.rotation.y, easedProgress),
      MathUtils.lerp(inactivePose.rotation.z, activePose.rotation.z, easedProgress) - wallPressure * 0.08,
    )

    torchTipOffset.copy(torchTip).multiplyScalar(TORCH_SCALE).applyEuler(torch.rotation)
    fire.position.copy(torch.position).add(torchTipOffset)
    fire.scale.setScalar(easedProgress)
    fire.visible = progress > 0.04

    light.position.copy(fire.position)
    light.position.y += 0.12
    light.intensity = TORCH_LIGHT_INTENSITY * easedProgress * flicker
    light.distance = TORCH_LIGHT_DISTANCE * easedProgress
  })

  return (
    <group ref={followerRef} visible={false}>
      <group ref={torchRef} scale={TORCH_SCALE}>
        <primitive object={torchScene} />
      </group>

      <group ref={fireRef}>
        <TorchFire />
      </group>

      <pointLight ref={lightRef} color="#ff9a3c" intensity={0} distance={0} decay={TORCH_LIGHT_DECAY} />
    </group>
  )
}

useGLTF.preload(TORCH_MODEL_PATH)
