/**
 * The working objects of a room: clocks, door readers, the porter's radio.
 *
 * Each device is a kit recipe cloned per placement — never instanced, because
 * every one carries its own state: a clock turns its own hands, a reader
 * lights its own lens. The behaviour of each kind hangs off node names the
 * content validator checks (`__hand-*`, `__dial`, `__led`), so nothing here
 * knows which room or prop it is animating.
 */

import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Box3,
  Group,
  Mesh,
  Raycaster,
  Vector2,
  Vector3,
  type Intersection,
  type Object3D,
} from 'three'

import { MUSEUM } from '../content/museum'
import type { DeviceData, RoomData } from '../content/schema'
import { useMuseum } from '../state/store'
import { museumAudio } from './audio'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import {
  clockHandAngles,
  clockTimeAfter,
  dueRadioCalls,
  radioDevices,
  radioHintFor,
  type RadioDevice,
} from './deviceRules'
import { cloneKitPart, disposeKitPart } from './kitPart'
import type { MaterialLibrary } from './materials'
import { isRoomPowered } from './power'
import { playerPosition } from './playerPosition'
import { subscribePrimaryAction } from './primaryAction'

const CENTRE = new Vector2(0, 0)
const INTERACTION_LAYER = 7
const REACH = 2.6
/** Beyond this the reader's latch is out of earshot. */
const LATCH_AUDIBLE_DISTANCE = 10

const ROOMS_BY_ID = new Map(MUSEUM.rooms.map((room) => [room.id as string, room] as const))
const RADIOS = radioDevices(MUSEUM)
const RADIOS_BY_ID = new Map(RADIOS.map((entry) => [entry.device.id, entry] as const))

function usePowered(roomId: string) {
  const restored = useMuseum((state) => state.progress.roomsPowered)
  const room = ROOMS_BY_ID.get(roomId)
  return room ? isRoomPowered(room, restored) : false
}

function poweredNow(roomId: string) {
  const room = ROOMS_BY_ID.get(roomId)
  return room ? isRoomPowered(room, useMuseum.getState().progress.roomsPowered) : false
}

/** Points every lens of a device at one library material. */
function useLensMaterial(
  instance: Object3D | null,
  part: string,
  materials: MaterialLibrary,
  materialKey: string,
) {
  useEffect(() => {
    const lens = instance?.getObjectByName(`${part}__led`)
    const material = materials.get(materialKey)
    if (!lens || !material) return
    lens.traverse((object) => {
      if (object instanceof Mesh) object.material = material
    })
  }, [instance, materialKey, materials, part])
}

function useDeviceInstance(kit: Group, part: string, materials: MaterialLibrary) {
  const instance = useMemo(() => cloneKitPart(kit, part, materials), [kit, materials, part])
  useEffect(() => () => disposeKitPart(instance), [instance])
  return instance
}

function worldPositionOf(room: RoomData, device: DeviceData) {
  return new Vector3(
    room.origin[0] + device.position[0],
    room.origin[1] + device.position[1],
    room.origin[2] + device.position[2],
  )
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

type HandPivots = Partial<Record<'hour' | 'minute' | 'second', Group>>

/**
 * Re-parents each hand under a pivot at the dial centre.
 *
 * Rotating a hand node directly would turn it about its quantisation origin,
 * which the bake places wherever meshopt needs it, not about the arbor. The
 * pivot sits at the measured dial centre and the node keeps its own transform
 * relative to it, so dequantisation survives untouched.
 */
function prepareClockHands(instance: Object3D, part: string): HandPivots {
  const pivots: HandPivots = {}
  // Idempotent: a repeated call (StrictMode runs memos twice) must find the
  // pivots it already made rather than nest a second set inside them.
  for (const hand of ['hour', 'minute', 'second'] as const) {
    const existing = instance.getObjectByName(`clock-pivot:${hand}`)
    if (existing instanceof Group) pivots[hand] = existing
  }
  if (Object.keys(pivots).length > 0) return pivots

  instance.updateMatrixWorld(true)
  const dial = instance.getObjectByName(`${part}__dial`)
  if (!dial) return {}
  // Still detached at its own origin, so world space is the assembly's space.
  const centre = new Box3().setFromObject(dial).getCenter(new Vector3())

  for (const hand of ['hour', 'minute', 'second'] as const) {
    const node = instance.getObjectByName(`${part}__hand-${hand}`)
    if (!node?.parent) continue
    const pivot = new Group()
    pivot.name = `clock-pivot:${hand}`
    pivot.position.set(centre.x, centre.y, 0)
    node.parent.add(pivot)
    node.position.x -= centre.x
    node.position.y -= centre.y
    pivot.add(node)
    pivots[hand] = pivot
  }
  return pivots
}

function ClockDevice({
  device,
  instance,
}: {
  device: Extract<DeviceData, { kind: 'clock' }>
  instance: Object3D
}) {
  const pivots = useMemo(() => prepareClockHands(instance, device.part), [device.part, instance])
  const powered = usePowered(device.runsWithPowerOf)
  const startedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (powered && startedAtRef.current === null) startedAtRef.current = performance.now()
    if (!powered) startedAtRef.current = null
  }, [powered])

  useFrame(() => {
    const elapsed =
      startedAtRef.current === null ? 0 : (performance.now() - startedAtRef.current) / 1000
    const angles = clockHandAngles(clockTimeAfter(device.stoppedAt, elapsed))
    // The dial faces local +Z, so clockwise as the visitor sees it is -Z.
    if (pivots.hour) pivots.hour.rotation.z = -angles.hour
    if (pivots.minute) pivots.minute.rotation.z = -angles.minute
    if (pivots.second) pivots.second.rotation.z = -angles.second
  })

  return null
}

// ---------------------------------------------------------------------------
// Door reader
// ---------------------------------------------------------------------------

function IndicatorDevice({
  room,
  device,
  instance,
  materials,
}: {
  room: RoomData
  device: Extract<DeviceData, { kind: 'power-indicator' }>
  instance: Object3D
  materials: MaterialLibrary
}) {
  const powered = usePowered(device.showsPowerOf)
  const previousRef = useRef<boolean | null>(null)
  useLensMaterial(instance, device.part, materials, powered ? 'led-green' : 'led-red')

  // The latch is heard only on the transition the player caused, never on a
  // reload into an already powered room.
  useEffect(() => {
    if (previousRef.current === false && powered) {
      const distance = worldPositionOf(room, device).distanceTo(playerPosition)
      if (distance < LATCH_AUDIBLE_DISTANCE) {
        museumAudio.lockRelease(Math.max(0.2, 1 - distance / LATCH_AUDIBLE_DISTANCE))
      }
    }
    previousRef.current = powered
  }, [device, powered, room])

  return null
}

// ---------------------------------------------------------------------------
// Radio
// ---------------------------------------------------------------------------

function RadioDeviceView({
  device,
  instance,
  materials,
}: {
  device: RadioDevice
  instance: Object3D
  materials: MaterialLibrary
}) {
  const powered = usePowered(device.poweredBy)
  useLensMaterial(instance, device.part, materials, powered ? 'led-green' : 'led-off')

  const proxy = useMemo(() => {
    instance.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(instance)
    const centre = bounds.getCenter(new Vector3())
    const size = bounds.getSize(new Vector3())
    // "Looking at the radio", not threading the crosshair through an antenna.
    size.set(Math.max(size.x, 0.3), Math.max(size.y, 0.32), Math.max(size.z, 0.3))
    return {
      centre: centre.toArray() as [number, number, number],
      size: size.toArray() as [number, number, number],
    }
  }, [instance])

  return (
    <mesh position={proxy.centre} visible={false}>
      <boxGeometry args={proxy.size} />
      <meshBasicMaterial />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Layer
// ---------------------------------------------------------------------------

function Device({
  room,
  device,
  kit,
  materials,
}: {
  room: RoomData
  device: DeviceData
  kit: Group
  materials: MaterialLibrary
}) {
  const instance = useDeviceInstance(kit, device.part, materials)
  if (!instance) return null

  return (
    // No `userData` prop here: R3F would replace the whole object on every
    // re-render. Operability is decided by id in DeviceTargeting instead.
    <group
      name={`device:${device.id}`}
      position={device.position as unknown as [number, number, number]}
      rotation={[0, device.rotationY ?? 0, 0]}
    >
      {/* The placement rides on this wrapper; the primitive keeps the node
          transforms that undo quantisation. */}
      <primitive object={instance} />
      {device.kind === 'clock' ? <ClockDevice device={device} instance={instance} /> : null}
      {device.kind === 'power-indicator' ? (
        <IndicatorDevice room={room} device={device} instance={instance} materials={materials} />
      ) : null}
      {device.kind === 'radio' ? (
        <RadioDeviceView device={device} instance={instance} materials={materials} />
      ) : null}
    </group>
  )
}

export function DeviceLayer({
  room,
  kitUrl,
  materials,
}: {
  room: RoomData
  kitUrl: string
  materials: MaterialLibrary
}) {
  const { scene } = useGLTF(kitUrl, USE_DRACO, USE_MESHOPT)
  const devices = room.devices ?? []
  if (devices.length === 0) return null

  return (
    <>
      {devices.map((device) => (
        <Device
          key={device.id}
          room={room}
          device={device}
          kit={scene as Group}
          materials={materials}
        />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Targeting and the radio's voice
// ---------------------------------------------------------------------------

function deviceIdFor(object: Object3D | null): string | null {
  let node = object
  while (node) {
    if (node.name.startsWith('device:')) return node.name.slice('device:'.length)
    node = node.parent
  }
  return null
}

/** Speaks a radio's hint, or moves its current transmission on a line. */
function operateRadio(deviceId: string) {
  const entry = RADIOS_BY_ID.get(deviceId)
  const state = useMuseum.getState()
  if (!entry || !poweredNow(entry.device.poweredBy)) return false

  if (state.radio?.deviceId === deviceId) {
    state.advanceRadio()
    return true
  }
  const lines = radioHintFor(entry.device, state.progress, MUSEUM)
  if (lines.length === 0) return false
  museumAudio.radioSquelch()
  state.startRadio({ deviceId, speakerKey: entry.device.speakerKey, lineKeys: lines })
  return true
}

/** Targets operable devices from the crosshair and works them on E. */
export function DeviceTargeting() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const raycaster = useMemo(() => {
    const instance = new Raycaster()
    instance.far = REACH
    instance.layers.set(INTERACTION_LAYER)
    return instance
  }, [])

  const targetsRef = useRef<Object3D[]>([])
  const intersectionsRef = useRef<Intersection<Object3D>[]>([])
  const rescanRef = useRef(0)
  const scannedRef = useRef(false)

  useEffect(() => {
    const interact = () => {
      const state = useMuseum.getState()
      if (
        state.examining ||
        state.openedContainer ||
        state.activeLock ||
        state.focusedTransitionDoor ||
        state.focusedExhibit ||
        state.focusedContainer ||
        !state.focusedDevice
      ) {
        return false
      }
      return operateRadio(state.focusedDevice)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.code !== 'KeyE') return
      if (interact()) event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    // Between furniture (200) and the room's own power control (100): the
    // radio sits on the same desk as the lamp and must win when aimed at.
    const unsubscribe = subscribePrimaryAction(interact, 150)
    return () => {
      unsubscribe()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(
    () => () => {
      if (useMuseum.getState().focusedDevice) useMuseum.getState().setFocusedDevice(null)
    },
    [],
  )

  useFrame((_, delta) => {
    const state = useMuseum.getState()
    if (state.examining || state.openedContainer || state.activeLock) {
      if (state.focusedDevice) state.setFocusedDevice(null)
      return
    }

    rescanRef.current -= delta
    if (rescanRef.current <= 0 || !scannedRef.current) {
      rescanRef.current = 0.5
      scannedRef.current = true
      const targets: Object3D[] = []
      scene.traverseVisible((object) => {
        if (
          object.name.startsWith('device:') &&
          RADIOS_BY_ID.has(object.name.slice('device:'.length))
        ) {
          targets.push(object)
        }
      })
      targetsRef.current = targets
      // Same arrangement as the power controls: the proxy stays `visible` for
      // the ray, and layer 7 keeps it out of the camera.
      for (const target of targets) {
        target.traverse((object) => {
          if (object instanceof Mesh && object.material && !object.visible) {
            object.visible = true
            object.layers.set(INTERACTION_LAYER)
          }
        })
      }
    }

    let found: string | null = null
    if (targetsRef.current.length > 0) {
      raycaster.setFromCamera(CENTRE, camera)
      const intersections = intersectionsRef.current
      intersections.length = 0
      raycaster.intersectObjects(targetsRef.current, true, intersections)
      const hit = intersections[0]
      found = hit ? deviceIdFor(hit.object) : null
      let node: Object3D | null = hit?.object ?? null
      while (found && node) {
        if (!node.visible) found = null
        node = node.parent
      }
      intersections.length = 0
    }
    state.setFocusedDevice(found)
  })

  return null
}

/**
 * Delivers each radio call once, after its delay, when the radio has power.
 *
 * A call never interrupts the player reading, entering a code or listening to
 * another transmission; it waits politely and retries.
 */
export function RadioDirector() {
  const progress = useMuseum((state) => state.progress)
  const timersRef = useRef(new Map<string, number>())

  useEffect(() => {
    const timers = timersRef.current
    for (const { device } of RADIOS) {
      if (!poweredNow(device.poweredBy)) continue
      for (const call of dueRadioCalls(device, progress, MUSEUM)) {
        if (timers.has(call.id)) continue
        const deliver = () => {
          const state = useMuseum.getState()
          if (state.progress.radioCalls.includes(call.id)) {
            timers.delete(call.id)
            return
          }
          if (state.radio || state.openedContainer || state.activeLock || state.journalTab) {
            timers.set(call.id, window.setTimeout(deliver, 1200))
            return
          }
          timers.delete(call.id)
          state.recordRadioCall(call.id)
          museumAudio.radioSquelch()
          state.startRadio({
            deviceId: device.id,
            speakerKey: device.speakerKey,
            lineKeys: call.lineKeys,
          })
        }
        timers.set(call.id, window.setTimeout(deliver, call.delaySeconds * 1000))
      }
    }
  }, [progress])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const handle of timers.values()) window.clearTimeout(handle)
      timers.clear()
    }
  }, [])

  return null
}
