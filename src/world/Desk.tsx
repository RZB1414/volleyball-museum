import { useGLTF } from '@react-three/drei'
import { GroundedModel } from './GroundedModel'

const DESK_MODEL_PATH = '/models/escritorio/Meshy_AI_Antique_Mahogany_Leat_0703054738_texture.glb'
// Sized well above a real desk's ~0.75m so it reads as a grand showpiece in the oversized room.
const DESK_HEIGHT = 1.2

type Vector3Tuple = [number, number, number]

type DeskProps = {
  position: Vector3Tuple
  rotation?: Vector3Tuple
}

export function Desk(props: DeskProps) {
  return <GroundedModel modelPath={DESK_MODEL_PATH} targetHeight={DESK_HEIGHT} {...props} />
}

useGLTF.preload(DESK_MODEL_PATH)
