import { useGLTF } from '@react-three/drei'
import { GroundedModel } from './GroundedModel'
import { InteractiveDeskDrawer } from './InteractiveDeskDrawer'

const DESK_MODEL_PATH = '/models/escritorio/Meshy_AI_Antique_Mahogany_Leat_0703054738_texture.glb'
// Slightly oversized so it still reads as a grand showpiece in the 4m-tall room.
const DESK_HEIGHT = 1.05

type Vector3Tuple = [number, number, number]

type DeskProps = {
  position: Vector3Tuple
  rotation?: Vector3Tuple
}

export function Desk({ position, rotation = [0, 0, 0] }: DeskProps) {
  return (
    <>
      <GroundedModel
        modelPath={DESK_MODEL_PATH}
        position={position}
        rotation={rotation}
        targetHeight={DESK_HEIGHT}
      />
      <InteractiveDeskDrawer position={position} rotation={rotation} />
    </>
  )
}

useGLTF.preload(DESK_MODEL_PATH)
