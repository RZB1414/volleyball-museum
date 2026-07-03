import { useTexture } from '@react-three/drei'
import { SRGBColorSpace } from 'three'

const FRAME_BORDER = 0.06
const FRAME_DEPTH = 0.05
const MAT_BORDER = 0.03
const MAT_DEPTH = 0.015
const MAT_Z = FRAME_DEPTH / 2 + MAT_DEPTH / 2
const PHOTO_Z = MAT_Z + MAT_DEPTH / 2 + 0.002

type FramedPhotoProps = {
  imageUrl: string
  width: number
  position: [number, number, number]
  rotation?: [number, number, number]
  frameColor?: string
  matColor?: string
}

export function FramedPhoto({
  imageUrl,
  width,
  position,
  rotation = [0, 0, 0],
  frameColor = '#2b2420',
  matColor = '#ece7dc',
}: FramedPhotoProps) {
  const texture = useTexture(imageUrl)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8

  const { width: imageWidth, height: imageHeight } = texture.image as {
    width: number
    height: number
  }
  const height = width * (imageHeight / imageWidth)

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[width + FRAME_BORDER * 2, height + FRAME_BORDER * 2, FRAME_DEPTH]} />
        <meshStandardMaterial color={frameColor} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, MAT_Z]}>
        <boxGeometry args={[width + MAT_BORDER * 2, height + MAT_BORDER * 2, MAT_DEPTH]} />
        <meshStandardMaterial color={matColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, PHOTO_Z]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} roughness={0.7} />
      </mesh>
    </group>
  )
}
