import { Suspense } from 'react'
import { Physics } from '@react-three/rapier'
import { FirstPersonController } from '../player/FirstPersonController'
import { HandTorch } from '../player/HandTorch'
import { useGameStore } from '../store/gameStore'
import { MuseumRoom } from '../world/MuseumRoom'

export function MuseumRoomScene() {
  const ambientLightEnabled = useGameStore((state) => state.ambientLightEnabled)

  return (
    <>
      <color attach="background" args={['#202226']} />
      {ambientLightEnabled && (
        <>
          <ambientLight intensity={0.75} />
          <directionalLight castShadow intensity={1.2} position={[3, 6, 4]} />
          <pointLight intensity={1.4} position={[0, 3.2, 0]} distance={12} />
        </>
      )}

      <Physics gravity={[0, -9.81, 0]}>
        <MuseumRoom />
        <FirstPersonController />

        <Suspense fallback={null}>
          <HandTorch />
        </Suspense>
      </Physics>
    </>
  )
}
