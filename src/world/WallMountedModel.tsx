import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { Box3, Mesh, Vector3 } from 'three'

type Vector3Tuple = [number, number, number]

type WallMountedModelProps = {
  modelPath: string
  targetWidth: number
  position: Vector3Tuple
  rotation?: Vector3Tuple
}

export function WallMountedModel({
  modelPath,
  targetWidth,
  position,
  rotation = [0, 0, 0],
}: WallMountedModelProps) {
  const { scene } = useGLTF(modelPath)

  const { modelScene, scale, meshOffset } = useMemo(() => {
    const clone = scene.clone(true)

    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })

    const bounds = new Box3().setFromObject(clone)
    const rawSize = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const scaleFactor = targetWidth / rawSize.x

    return {
      modelScene: clone,
      scale: scaleFactor,
      meshOffset: new Vector3(-center.x, -center.y, -bounds.min.z).multiplyScalar(scaleFactor),
    }
  }, [scene, targetWidth])

  return (
    <group position={position} rotation={rotation}>
      <group position={meshOffset} scale={scale}>
        <primitive object={modelScene} />
      </group>
    </group>
  )
}
