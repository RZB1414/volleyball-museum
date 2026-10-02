/**
 * The hand torch: one spot, held low and to the right, aimed where you look.
 *
 * It lives at the scene root and copies the camera each frame rather than
 * being parented to it: R3F's default camera is not in the scene graph, so a
 * child of the camera is never reached by the render traversal (the same
 * reason the examine view drives its held object from the scene root).
 *
 * The aim follows the view with a short exponential lag. That is not a delay
 * for its own sake: a beam welded to the crosshair reads as a cone painted on
 * the screen, and the slight trail on a quick turn is what makes it a thing in
 * a hand. Position does not lag, so the lamp never swings out of the body.
 */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Object3D, Vector3, type SpotLight } from 'three'

import { useMuseum } from '../state/store'
import { FLASHLIGHT, flashlightIntensity, isTextEntryTarget } from './flashlightRig'

const lampOffset = new Vector3()
const aimDirection = new Vector3()

export function Flashlight() {
  const camera = useThree((state) => state.camera)
  const lightRef = useRef<SpotLight>(null)
  const target = useMemo(() => new Object3D(), [])
  const directionRef = useRef<Vector3 | null>(null)
  const on = useMuseum((state) => state.flashlightOn)
  const brightness = useMuseum((state) => state.settings.brightness)
  const examining = useMuseum((state) => state.examining)

  useEffect(() => {
    if (lightRef.current) lightRef.current.target = target
  }, [target])

  // F switches the torch anywhere in the museum, except while typing.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.code !== 'KeyF' || isTextEntryTarget(event.target)) return
      // Ctrl/Cmd+F is the browser's find, not the torch.
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (!useMuseum.getState().started) return
      useMuseum.getState().toggleFlashlight()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useFrame((_, delta) => {
    const light = lightRef.current
    if (!light) return

    lampOffset.set(...FLASHLIGHT.offset).applyQuaternion(camera.quaternion)
    light.position.copy(camera.position).add(lampOffset)

    camera.getWorldDirection(aimDirection)
    const direction = directionRef.current
    if (!direction) {
      directionRef.current = aimDirection.clone()
    } else {
      const blend = 1 - Math.exp(-Math.min(delta, 0.1) / FLASHLIGHT.follow)
      direction.lerp(aimDirection, blend).normalize()
    }
    target.position
      .copy(light.position)
      .addScaledVector(directionRef.current ?? aimDirection, FLASHLIGHT.aim)
    target.updateMatrixWorld()
  })

  return (
    <>
      <primitive object={target} />
      {/* Always mounted, never `visible = false`: both would change the
          scene's light count and recompile every material at the switch. */}
      <spotLight
        ref={lightRef}
        color={FLASHLIGHT.color}
        intensity={flashlightIntensity(on, brightness, examining !== null)}
        distance={FLASHLIGHT.distance}
        angle={FLASHLIGHT.angle}
        penumbra={FLASHLIGHT.penumbra}
        decay={FLASHLIGHT.decay}
        castShadow={false}
      />
    </>
  )
}
