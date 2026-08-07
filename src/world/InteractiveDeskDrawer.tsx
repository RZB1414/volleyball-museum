import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  MathUtils,
  Mesh,
  Raycaster,
  SRGBColorSpace,
  Vector2,
  type Group,
} from 'three'
import { useGameStore } from '../store/gameStore'

type Vector3Tuple = [number, number, number]

type InteractiveDeskDrawerProps = {
  position: Vector3Tuple
  rotation: Vector3Tuple
}

const DRAWER_POSITION: Vector3Tuple = [0.75, 0.34, 0.28]
const DRAWER_OPEN_DISTANCE = 0.42
const DRAWER_ANIMATION_SPEED = 8
const DRAWER_INTERACTION_DISTANCE = 2
const CAMERA_CENTER = new Vector2(0, 0)

function createPaperTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Unable to create the drawer paper texture')
  }

  context.fillStyle = '#f5eedc'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#c9bda2'
  context.lineWidth = 18
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44)
  context.fillStyle = '#29251f'
  context.font = '700 104px Georgia, serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('123456789', canvas.width / 2, canvas.height / 2)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.needsUpdate = true

  return texture
}

export function InteractiveDeskDrawer({ position, rotation }: InteractiveDeskDrawerProps) {
  const drawerRef = useRef<Group>(null)
  const recessRef = useRef<Mesh>(null)
  const hitboxRef = useRef<Mesh>(null)
  const paperRef = useRef<Mesh>(null)
  const focusedRef = useRef(false)
  const camera = useThree((state) => state.camera)
  const raycaster = useMemo(() => new Raycaster(), [])
  const paperTexture = useMemo(createPaperTexture, [])
  const setDeskDrawerFocused = useGameStore((state) => state.setDeskDrawerFocused)

  useEffect(() => () => paperTexture.dispose(), [paperTexture])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' || event.repeat) {
        return
      }

      const { deskDrawerFocused, deskDrawerOpen, sitting, toggleDeskDrawer } =
        useGameStore.getState()

      if (!sitting || (!deskDrawerFocused && !deskDrawerOpen)) {
        return
      }

      event.preventDefault()
      toggleDeskDrawer()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(
    () => () => {
      setDeskDrawerFocused(false)
    },
    [setDeskDrawerFocused],
  )

  useFrame((_, delta) => {
    const drawer = drawerRef.current
    const recess = recessRef.current
    const hitbox = hitboxRef.current
    const paper = paperRef.current
    const { deskDrawerOpen, sitting } = useGameStore.getState()

    if (drawer) {
      drawer.position.z = MathUtils.damp(
        drawer.position.z,
        DRAWER_POSITION[2] + (deskDrawerOpen ? DRAWER_OPEN_DISTANCE : 0),
        DRAWER_ANIMATION_SPEED,
        Math.min(delta, 1 / 30),
      )
      drawer.updateMatrixWorld(true)

      if (paper) {
        const openProgress = MathUtils.clamp(
          (drawer.position.z - DRAWER_POSITION[2]) / DRAWER_OPEN_DISTANCE,
          0,
          1,
        )
        paper.visible = openProgress > 0.08
      }
    }

    let nextFocused = false

    if (sitting && hitbox && recess) {
      raycaster.setFromCamera(CAMERA_CENTER, camera)
      const hit = raycaster.intersectObjects([hitbox, recess], false)[0]
      nextFocused = Boolean(hit && hit.distance <= DRAWER_INTERACTION_DISTANCE)
    }

    if (nextFocused !== focusedRef.current) {
      focusedRef.current = nextFocused
      setDeskDrawerFocused(nextFocused)
    }
  })

  return (
    <group position={position} rotation={rotation}>
      <mesh
        ref={recessRef}
        position={[DRAWER_POSITION[0], DRAWER_POSITION[1], DRAWER_POSITION[2] - 0.005]}
      >
        <planeGeometry args={[0.44, 0.17]} />
        <meshStandardMaterial color="#160b08" roughness={0.94} />
      </mesh>

      <group ref={drawerRef} position={DRAWER_POSITION}>
        <mesh position={[0, 0, -0.16]} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.12, 0.32]} />
          <meshStandardMaterial color="#2f1711" roughness={0.82} />
        </mesh>

        <mesh position={[0, 0, 0.025]} castShadow receiveShadow>
          <boxGeometry args={[0.42, 0.15, 0.05]} />
          <meshStandardMaterial color="#572a1d" roughness={0.68} />
        </mesh>

        <mesh position={[0, 0, 0.054]} castShadow>
          <boxGeometry args={[0.34, 0.09, 0.014]} />
          <meshStandardMaterial color="#6b3322" roughness={0.72} />
        </mesh>

        <mesh position={[0, -0.005, 0.074]} rotation={[0, 0, Math.PI]} castShadow>
          <torusGeometry args={[0.065, 0.009, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#2b201a" metalness={0.72} roughness={0.28} />
        </mesh>
        <mesh position={[-0.065, -0.005, 0.074]} castShadow>
          <sphereGeometry args={[0.013, 12, 8]} />
          <meshStandardMaterial color="#2b201a" metalness={0.72} roughness={0.28} />
        </mesh>
        <mesh position={[0.065, -0.005, 0.074]} castShadow>
          <sphereGeometry args={[0.013, 12, 8]} />
          <meshStandardMaterial color="#2b201a" metalness={0.72} roughness={0.28} />
        </mesh>

        <mesh
          ref={paperRef}
          visible={false}
          position={[0, 0.066, -0.13]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.34, 0.2]} />
          <meshStandardMaterial map={paperTexture} roughness={0.9} side={DoubleSide} />
        </mesh>

        <mesh ref={hitboxRef} position={[0, 0, 0.06]}>
          <boxGeometry args={[0.46, 0.19, 0.14]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}
