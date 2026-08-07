import { Canvas } from '@react-three/fiber'
import { MuseumRoomScene } from '../scenes/MuseumRoomScene'

export function GameCanvas() {
  return (
    <Canvas
      id="museum-game"
      dpr={[0.75, 1.5]}
      performance={{ min: 0.5, debounce: 250 }}
      camera={{ fov: 50, near: 0.1, far: 100, position: [0, 1.65, 4] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <MuseumRoomScene />
    </Canvas>
  )
}
