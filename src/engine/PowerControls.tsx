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
import {
  Box3,
  Mesh,
  Raycaster,
  Vector2,
  Vector3,
  type Group,
  type Intersection,
  type Object3D,
} from 'three'

import { MUSEUM } from '../content/museum'
import type { PowerControlData, RoomData } from '../content/schema'
import { isModalOpen, useMuseum } from '../state/store'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import { INTERACTION_REACH, interactionWinnerOf, PROXY_MINIMUM } from './interactionTarget'
import { cloneKitPart, disposeKitPart } from './kitPart'
import type { MaterialLibrary } from './materials'
import { isRoomPowered } from './power'
import { isUnclaimedInteractKey, subscribePrimaryAction } from './primaryAction'
import { buildPowerControlLightRig } from './powerControlLightRig'

const CENTRE = new Vector2(0, 0)
const INTERACTION_LAYER = 7
const REACH = INTERACTION_REACH.powerControl

const controlsById = new Map(
  MUSEUM.rooms.flatMap((room) =>
    room.powerControl ? [[room.powerControl.id, { room, control: room.powerControl }] as const] : [],
  ),
)
const roomsById: ReadonlyMap<string, RoomData> = new Map(
  MUSEUM.rooms.map((room) => [room.id, room] as const),
)

/**
 * One point-light slot per visible side of the transition.
 *
 * Pilot and practical are mutually exclusive, so changing their parameters on
 * a stable object preserves the authored look without compiling 0/2/4-light
 * shader variants every time a cached room appears behind a door.
 */
export function PowerControlLights({
  primaryRoomId,
  retainedRoomId,
}: {
  primaryRoomId: string
  retainedRoomId: string | null
}) {
  const poweredRoomIds = useMuseum((state) => state.progress.roomsPowered)
  const brightness = useMuseum((state) => state.settings.brightness)
  const currentRoom = roomsById.get(primaryRoomId) ?? MUSEUM.rooms[0]
  const retainedRoom = retainedRoomId ? roomsById.get(retainedRoomId) ?? null : null
  const slots = useMemo(
    () => currentRoom ? buildPowerControlLightRig(currentRoom, retainedRoom) : [],
    [currentRoom, retainedRoom],
  )

  return (
    <group>
      {slots.map((slot, index) => {
        const room = roomsById.get(slot.roomId)
        const powered = room ? isRoomPowered(room, poweredRoomIds) : false
        const pose = powered ? slot.powered : slot.unpowered
        return (
          <pointLight
            key={`power-control-light-${index}`}
            position={pose.position as unknown as [number, number, number]}
            color={pose.color}
            intensity={pose.baseIntensity * brightness}
            distance={pose.distance}
            decay={2}
            castShadow={false}
          />
        )
      })}
    </group>
  )
}

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
      control={room.powerControl}
      kit={scene as Group}
      materials={materials}
    />
  )
}

function PowerControl({
  control,
  kit,
  materials,
}: {
  control: PowerControlData
  kit: Group
  materials: MaterialLibrary
}) {
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
    const [minX, minY, minZ] = PROXY_MINIMUM.powerControl
    size.set(Math.max(size.x, minX), Math.max(size.y, minY), Math.max(size.z, minZ))
    return {
      centre: centre.toArray() as [number, number, number],
      size: size.toArray() as [number, number, number],
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
  const targetsInitialisedRef = useRef(false)
  const intersectionsRef = useRef<Intersection<Object3D>[]>([])
  const rescanRef = useRef(0)
  const lastRef = useRef<string | null>(null)

  useEffect(() => {
    const interact = () => {
      const state = useMuseum.getState()
      // The nearest live target on the desk owns the key, whatever system it
      // belongs to; a dead radio in front of the lamp never swallows it.
      const winner = interactionWinnerOf(state, MUSEUM)
      if (winner?.kind !== 'power-control') return false

      const record = controlsById.get(winner.id)
      if (!record || isRoomPowered(record.room, state.progress.roomsPowered)) return false

      // A future locked breaker uses the existing lock graph. The current
      // slice leaves these controls open, so power restoration remains a
      // discovery beat rather than another keypad.
      if (
        record.room.powerLockId &&
        !state.progress.locksOpened.includes(record.room.powerLockId)
      ) {
        state.setActiveLock(record.room.powerLockId)
        return true
      }

      state.powerRoom(record.room.id)
      state.setFocusedPowerControl(null)
      lastRef.current = null
      return true
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !isUnclaimedInteractKey(event)) return
      if (interact()) event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    const unsubscribePrimaryAction = subscribePrimaryAction(interact, 100)
    return () => {
      unsubscribePrimaryAction()
      window.removeEventListener('keydown', onKeyDown)
    }
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
    if (isModalOpen(state)) {
      if (lastRef.current || state.focusedPowerControl) {
        lastRef.current = null
        state.setFocusedPowerControl(null)
      }
      return
    }

    rescanRef.current -= delta
    if (rescanRef.current <= 0 || !targetsInitialisedRef.current) {
      rescanRef.current = 0.5
      targetsInitialisedRef.current = true
      const targets: Object3D[] = []
      scene.traverseVisible((object) => {
        if (object.name.startsWith('power-control:')) targets.push(object)
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

    if (targetsRef.current.length === 0) {
      if (lastRef.current !== null || state.focusedPowerControl !== null) {
        lastRef.current = null
        state.setFocusedPowerControl(null)
      }
      return
    }

    raycaster.setFromCamera(CENTRE, camera)
    const intersections = intersectionsRef.current
    intersections.length = 0
    raycaster.intersectObjects(targetsRef.current, true, intersections)
    const hit = intersections[0]
    let found = hit ? powerControlIdFor(hit.object) : null
    const distance = hit?.distance
    // The visibility cache updates twice a second. An ancestor can be hidden
    // between scans during a portal crossing, and direct raycasts do not honour
    // ancestor visibility, so reject that stale target immediately.
    let hitNode: Object3D | null = hit?.object ?? null
    while (found && hitNode) {
      if (!hitNode.visible) found = null
      hitNode = hitNode.parent
    }
    if (found) {
      const record = controlsById.get(found)
      if (!record || isRoomPowered(record.room, state.progress.roomsPowered)) found = null
    }

    // Republished every frame while focused, with the hit distance the
    // nearest-target arbitration needs; the store skips writes that change
    // nothing.
    if (found !== lastRef.current || found !== null) {
      lastRef.current = found
      state.setFocusedPowerControl(found, distance)
    }
    intersections.length = 0
  })

  return null
}
