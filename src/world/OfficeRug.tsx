import { useGLTF } from '@react-three/drei'
import { FloorModel } from './FloorModel'

const OFFICE_RUG_MODEL_PATH = '/models/escritorio/Meshy_AI_Regal_Red_Oval_Rug_wi_0708124524_texture.glb'
const OFFICE_RUG_WIDTH = 4.2

type Vector3Tuple = [number, number, number]

type OfficeRugProps = {
  position: Vector3Tuple
  rotation?: Vector3Tuple
}

export function OfficeRug(props: OfficeRugProps) {
  return <FloorModel modelPath={OFFICE_RUG_MODEL_PATH} targetWidth={OFFICE_RUG_WIDTH} {...props} />
}

useGLTF.preload(OFFICE_RUG_MODEL_PATH)
