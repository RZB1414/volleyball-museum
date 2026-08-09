/**
 * Physical room-power controls.
 *
 * A room declares one control as data. This layer instances its kit recipe,
 * derives a forgiving interaction volume from the baked object itself and
 * turns the owning room on when the visitor presses E. No room id or prop name
 * is special-cased here; a breaker, a desk lamp or a future generator crank all
 * use the same path.
 */

import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Box3, Mesh, Raycaster, Vector2, Vector3, type Group, type Object3D } from 'three'

import { MUSEUM } from '../content/museum'
import type { PowerControlData, RoomData } from '../content/schema'
import { useMuseum } from '../state/store'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import { cloneKitPart, disposeKitPart } from './kitPart'
import type { MaterialLibrary } from './materials'
import { isRoomPowered } from './power'

const CENTRE = new Vector2(0, 0)
const INTERACTION_LAYER = 7
const REACH = 2.7

const controlsById = new Map(
  MUSEUM.rooms.flatMap((room) =>
    room.powerControl ? [[room.powerControl.id, { room, control: room.powerControl }] as const] : [],
  ),
)

export function PowerControlLayer({
  room,
  kitUrl,
  materials,
}: {
  room: RoomData
  kitUrl: string
  materials: MaterialLibrary
}) {
  const { scene } = useGLTF(kitUrl, USE_DRACO, USE_MESHOPT)
  if (!room.powerControl) return null

  return (
    <PowerControl
      room={room}
      control={room.powerControl}
      kit={scene as Group}
      materials={materials}
    />
  )
}

function PowerControl({
  room,
  control,
  kit,
  materials,
}: {
  room: RoomData
  control: PowerControlData
  kit: Group
  materials: MaterialLibrary
}) {
  const powered = useMuseum((state) => isRoomPowered(room, state.progress.roomsPowered))
  const brightness = useMuseum((state) => state.settings.brightness)
  const instance = useMemo(
    () => cloneKitPart(kit, control.part, materials),
    [control.part, kit, materials],
  )

  useEffect(() => () => disposeKitPart(instance), [instance])

  const proxy = useMemo(() => {
    if (!instance) return null
    instance.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(instance)
    const centre = bounds.getCenter(new Vector3())
    const size = bounds.getSize(new Vector3())

    // A lamp switch is physically tiny, but the interaction means "looking at
    // the lamp", not threading a crosshair through a ten-millimetre knob. The
    // minimum volume preserves that intent without content-specific hitboxes.
    size.set(Math.max(size.x, 0.42), Math.max(size.y, 0.48), Math.max(size.z, 0.34))
    return {
      centre: centre.toArray() as [number, number, number],
      size: size.toArray() as [number, number, number],
      beacon: [centre.x, centre.y, Math.max(bounds.max.z + 0.05, 0.18)] as [
        number,
        number,
        number,
      ],
    }
  }, [instance])

  if (!instance || !proxy) return null

  return (
    <group
      name={`power-control:${control.id}`}
      position={control.position as unknown as [number, number, number]}
      rotation={[0, control.rotationY ?? 0, 0]}
      scale={control.scale ?? 1}
    >
      <primitive object={instance} />

      {powered && control.light ? (
        <pointLight
          position={control.light.position as unknown as [number, number, number]}
          color={control.light.color}
          intensity={control.light.intensity * brightness}
          distance={control.light.distance}
          decay={2}
          castShadow={false}
        />
      ) : null}

      {/* A dim pilot makes the way out of darkness readable without lighting
          the room itself. It vanishes when the house lights take over. */}
      {powered ? null : (
        <pointLight
          position={proxy.beacon}
          color="#d65a3a"
          intensity={3.2 * brightness}
          distance={2.4}
          decay={2}
          castShadow={false}
        />
      )}

      {/* The camera never renders layer 7; the interaction ray does. Keeping
          the proxy visible to three is necessary because Raycaster skips
          objects whose `visible` flag remains false. */}
      <mesh position={proxy.centre} visible={false}>
        <boxGeometry args={proxy.size} />
        <meshBasicMaterial />
      </mesh>
    </group>
  )
}

function powerControlIdFor(object: Object3D | null): string | null {
  let node = object
  while (node) {
    if (node.name.startsWith('power-control:')) {
      return node.name.slice('power-control:'.length)
    }
    node = node.parent
  }
  return null
}

/** Targets unpowered controls and applies their data-owned room effect on E. */
export function PowerControlTargeting() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const raycaster = useMemo(() => {
    const instance = new Raycaster()
    instance.far = REACH
    instance.layers.set(INTERACTION_LAYER)
    return instance
  }, [])

  const targetsRef = useRef<Object3D[]>([])
  const rescanRef = useRef(0)
  const lastRef = useRef<string | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.code !== 'KeyE') return
      const state = useMuseum.getState()
      if (
        state.examining ||
        state.openedContainer ||
        state.activeLock ||
        state.focusedExhibit ||
        state.focusedContainer ||
        !state.focusedPowerControl
      ) {
        return
      }

      const record = controlsById.get(state.focusedPowerControl)
      if (!record || isRoomPowered(record.room, state.progress.roomsPowered)) return

      // A future locked breaker uses the existing lock graph. The current
      // slice leaves these controls open, so power restoration remains a
      // discovery beat rather than another keypad.
      if (
        record.room.powerLockId &&
        !state.progress.locksOpened.includes(record.room.powerLockId)
      ) {
        state.setActiveLock(record.room.powerLockId)
        return
      }

      event.preventDefault()
      state.powerRoom(record.room.id)
      state.setFocusedPowerControl(null)
      lastRef.current = null
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(
    () => () => {
      const state = useMuseum.getState()
      if (state.focusedPowerControl) state.setFocusedPowerControl(null)
    },
    [],
  )

  useFrame((_, delta) => {
    const state = useMuseum.getState()
    if (state.examining || state.openedContainer || state.activeLock) {
      if (lastRef.current) {
        lastRef.current = null
        state.setFocusedPowerControl(null)
      }
      return
    }

    rescanRef.current -= delta
    if (rescanRef.current <= 0 || targetsRef.current.length === 0) {
      rescanRef.current = 0.5
      const targets: Object3D[] = []
      scene.traverse((object) => {
        if (object.name.startsWith('power-control:') && object.visible) targets.push(object)
      })
      targetsRef.current = targets

      for (const target of targets) {
        target.traverse((object) => {
          if (object instanceof Mesh && object.material && !object.visible) {
            object.visible = true
            object.layers.set(INTERACTION_LAYER)
          }
        })
      }
    }

    raycaster.setFromCamera(CENTRE, camera)
    const hit = raycaster.intersectObjects(targetsRef.current, true)[0]
    let found = hit ? powerControlIdFor(hit.object) : null
    if (found) {
      const record = controlsById.get(found)
      if (!record || isRoomPowered(record.room, state.progress.roomsPowered)) found = null
    }

    if (found !== lastRef.current) {
      lastRef.current = found
      state.setFocusedPowerControl(found)
    }
  })

  return null
}
