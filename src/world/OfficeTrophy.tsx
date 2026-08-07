import { useGLTF } from '@react-three/drei'
import { GroundedModel } from './GroundedModel'

const OFFICE_TROPHY_MODEL_PATH = '/models/escritorio/trofeu.glb'
const OFFICE_TROPHY_HEIGHT = 0.55

type Vector3Tuple = [number, number, number]

type OfficeTrophyProps = {
  position: Vector3Tuple
  rotation?: Vector3Tuple
}

export function OfficeTrophy(props: OfficeTrophyProps) {
  return <GroundedModel modelPath={OFFICE_TROPHY_MODEL_PATH} targetHeight={OFFICE_TROPHY_HEIGHT} {...props} />
}

useGLTF.preload(OFFICE_TROPHY_MODEL_PATH)
