import { useGLTF } from '@react-three/drei'
import { WallMountedModel } from './WallMountedModel'

const OFFICE_WALL_ART_MODEL_PATH = '/models/escritorio/quadro.glb'
const OFFICE_WALL_ART_WIDTH = 1.35

type Vector3Tuple = [number, number, number]

type OfficeWallArtProps = {
  position: Vector3Tuple
  rotation?: Vector3Tuple
}

export function OfficeWallArt(props: OfficeWallArtProps) {
  return (
    <WallMountedModel
      modelPath={OFFICE_WALL_ART_MODEL_PATH}
      targetWidth={OFFICE_WALL_ART_WIDTH}
      {...props}
    />
  )
}

useGLTF.preload(OFFICE_WALL_ART_MODEL_PATH)
