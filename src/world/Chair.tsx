import { useGLTF } from '@react-three/drei'
import { GroundedModel } from './GroundedModel'

const CHAIR_MODEL_PATH = '/models/escritorio/Meshy_AI_Regal_Carved_Leather__0703163248_texture.glb'
// Kept close to a real armchair's scale (vs. the desk's oversized 1.2m) so sitting reads naturally.
const CHAIR_HEIGHT = 1.35

type Vector3Tuple = [number, number, number]

type ChairProps = {
  position: Vector3Tuple
  rotation?: Vector3Tuple
}

export function Chair(props: ChairProps) {
  return <GroundedModel modelPath={CHAIR_MODEL_PATH} targetHeight={CHAIR_HEIGHT} {...props} />
}

useGLTF.preload(CHAIR_MODEL_PATH)
