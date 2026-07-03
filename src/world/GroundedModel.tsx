import { useGLTF } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import { Box3, Mesh, Vector3 } from 'three'

type Vector3Tuple = [number, number, number]

type GroundedModelProps = {
  modelPath: string
  targetHeight: number
  position: Vector3Tuple
  rotation?: Vector3Tuple
}

export function GroundedModel({ modelPath, targetHeight, position, rotation = [0, 0, 0] }: GroundedModelProps) {
  const { scene } = useGLTF(modelPath)

  const { modelScene, scale, size, meshOffset } = useMemo(() => {
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
    const scaleFactor = targetHeight / rawSize.y

    return {
      modelScene: clone,
      scale: scaleFactor,
      size: rawSize.multiplyScalar(scaleFactor),
      // Recenters the model on X/Z and drops it onto the floor on Y, regardless of
      // where the source GLB's own pivot/origin was authored.
      meshOffset: new Vector3(-center.x, -bounds.min.y, -center.z).multiplyScalar(scaleFactor),
    }
  }, [scene, targetHeight])

  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[size.x / 2, size.y / 2, size.z / 2]} position={[0, size.y / 2, 0]} />
      </RigidBody>
      <group position={meshOffset} scale={scale}>
        <primitive object={modelScene} />
      </group>
    </group>
  )
}
