import { useGLTF } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Object3D, type RectAreaLight } from 'three'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { GroundedModel } from './GroundedModel'

RectAreaLightUniformsLib.init()

const OFFICE_LAMP_MODEL_PATH = '/models/escritorio/luminaria.glb'
const OFFICE_LAMP_HEIGHT = 0.62
const LAMP_LIGHT_LOCAL_OFFSET: Vector3Tuple = [0.096, 0.43, 0.242]

type Vector3Tuple = [number, number, number]

type OfficeLampProps = {
  position: Vector3Tuple
  lightTarget: Vector3Tuple
  rotation?: Vector3Tuple
}

function addVector3(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function rotateVectorY(vector: Vector3Tuple, rotationY: number): Vector3Tuple {
  const cos = Math.cos(rotationY)
  const sin = Math.sin(rotationY)

  return [
    vector[0] * cos + vector[2] * sin,
    vector[1],
    -vector[0] * sin + vector[2] * cos,
  ]
}

export function OfficeLamp({ position, lightTarget, rotation = [0, 0, 0] }: OfficeLampProps) {
  const spotTarget = useMemo(() => new Object3D(), [])
  const areaLightRef = useRef<RectAreaLight>(null)
  const rotationY = rotation[1]
  const lightOffset = useMemo(
    () => rotateVectorY(LAMP_LIGHT_LOCAL_OFFSET, rotationY),
    [rotationY],
  )
  const lightPosition = addVector3(position, lightOffset)

  useLayoutEffect(() => {
    areaLightRef.current?.lookAt(...lightTarget)
  }, [lightTarget])

  return (
    <>
      <GroundedModel
        modelPath={OFFICE_LAMP_MODEL_PATH}
        position={position}
        rotation={rotation}
        targetHeight={OFFICE_LAMP_HEIGHT}
      />
      <primitive object={spotTarget} position={lightTarget} />
      <pointLight
        color="#ffe2b5"
        decay={2}
        distance={2.1}
        intensity={2.45}
        position={lightPosition}
      />
      <rectAreaLight
        ref={areaLightRef}
        color="#ffe8c9"
        height={0.26}
        intensity={20}
        position={lightPosition}
        width={0.64}
      />
      <spotLight
        angle={0.4}
        color="#ffe2b5"
        decay={2}
        distance={2.5}
        intensity={7}
        penumbra={0.62}
        position={lightPosition}
        target={spotTarget}
      />
    </>
  )
}

useGLTF.preload(OFFICE_LAMP_MODEL_PATH)
