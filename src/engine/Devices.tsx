/**
 * The working objects of a room: clocks, door readers, the porter's radio —
 * and, once it leaves the desk, the radio in the player's hand.
 *
 * Each device is a kit recipe cloned per placement — never instanced, because
 * every one carries its own state: a clock turns its own hands, a reader
 * lights its own lens. The behaviour of each kind hangs off node names the
 * content validator checks (`__hand-*`, `__dial`, `__led`), so nothing here
 * knows which room or prop it is animating.
 */

import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
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
import { contributeToSave, gameInPlay, isModalOpen, useMuseum } from '../state/store'
import { museumAudio } from './audio'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import { clockCount, type ClockStore } from './clockCount'
import {
  clockHandAngles,
  clockTimeAfter,
  deskRadioIntent,
  nextRadioCall,
  radioCallReady,
  radioDeliveryStep,
  radioDevices,
  radioWithinEarshot,
  type RadioDevice,
} from './deviceRules'
import {
  aimableDeviceId,
  deviceIdFor,
  hiddenInScene,
  paintLenses,
  placeHandset,
  prepareHandset,
} from './deviceNodes'
import { PROXY_MATERIAL_PROPS, paddedProxy } from './interactionProxy'
import { INTERACTION_REACH, interactionWinnerOf, PROXY_MINIMUM } from './interactionTarget'
import { cloneKitPart, disposeKitPart } from './kitPart'
import type { MaterialLibrary } from './materials'
import { isRoomPowered } from './power'
import { playerPosition } from './playerPosition'
import { isUnclaimedInteractKey, subscribePrimaryAction } from './primaryAction'
import { placeRadioCall, takeDeskRadio } from './radioCall'
import { hangUpDelayMs, hangUpStarted, heldRadioId, isRadioCallKey } from './radioPatience'

const CENTRE = new Vector2(0, 0)
const INTERACTION_LAYER = 7
const REACH = INTERACTION_REACH.device
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

/**
 * Points every lens of a device at one library material: the `__led` family
 * and any `__*-led` one, such as a radio handset's display, which reads the
 * same charger.
 */
function useLensMaterial(
  instance: Object3D | null,
  part: string,
  materials: MaterialLibrary,
  materialKey: string,
) {
  useEffect(() => {
    const material = materials.get(materialKey)
    if (instance && material) paintLenses(instance, part, material)
  }, [instance, materialKey, materials, part])
}

/** Whether the player has taken this device with them, from the stable list. */
function useCarried(deviceId: string) {
  return useMuseum((state) => state.progress.devicesCarried.includes(deviceId))
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

/** The store as a clock's count asks for it; the suites hand it a tab's own. */
const CLOCK_STORE: ClockStore = { useMuseum, contributeToSave, gameInPlay }

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
  // The seconds the clock has run, and when they go to the save, are kept
  // outside React (`clockCount.ts`): this component says when the room has
  // power and turns the hands, and records nothing by itself.
  const count = useMemo(() => clockCount(device.id, CLOCK_STORE), [device.id])

  useEffect(() => {
    if (powered) return count.run()
    count.stop()
    return undefined
  }, [count, powered])

  useFrame((_, delta) => {
    const angles = clockHandAngles(clockTimeAfter(device.stoppedAt, count.advance(delta)))
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
  // The cradle's lamp shows the charger, so it stays green on an empty desk;
  // the handset's display goes with the player.
  useLensMaterial(instance, device.part, materials, powered ? 'led-green' : 'led-off')

  const carried = useCarried(device.id)
  const handset = useMemo(
    () => (device.carriedOnUse ? prepareHandset(instance, device.part) : null),
    [device.carriedOnUse, device.part, instance],
  )
  // Before paint, so the handset never flashes on the desk for a frame.
  useLayoutEffect(() => placeHandset(handset, carried), [carried, handset])

  const proxy = useMemo(() => {
    instance.updateMatrixWorld(true)
    // "Looking at the radio", not threading the crosshair through an antenna.
    return paddedProxy(new Box3().setFromObject(instance), PROXY_MINIMUM.radio)
  }, [instance])

  return (
    // A group, not the mesh: targeting switches invisible meshes back on for
    // its ray layer, and rejects any hit under a hidden ancestor instead.
    <group visible={!carried}>
      <mesh position={proxy.centre} visible={false}>
        <boxGeometry args={proxy.size} />
        <meshBasicMaterial {...PROXY_MATERIAL_PROPS} />
      </mesh>
    </group>
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

/**
 * E on a radio on its desk: pick it up if it is one the player carries away,
 * otherwise the same press as the call button — skip a line, or call him.
 */
function operateRadio(deviceId: string) {
  const entry = RADIOS_BY_ID.get(deviceId)
  const state = useMuseum.getState()
  if (!entry) return false
  const intent = deskRadioIntent(entry.device, {
    live: poweredNow(entry.device.poweredBy),
    carried: state.progress.devicesCarried.includes(deviceId),
    speaking: state.radio !== null,
  })
  if (intent === 'dead') return false
  if (intent === 'take') return takeDeskRadio(deviceId)
  return placeRadioCall(deviceId)
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
      // The same answer the prompt shows: nearest live desk target wins, and
      // a radio without charge never takes the key from the lamp.
      const winner = interactionWinnerOf(state, MUSEUM)
      if (winner?.kind !== 'device' || !winner.live) return false
      return operateRadio(winner.id)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !isUnclaimedInteractKey(event)) return
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
    if (isModalOpen(state)) {
      if (state.focusedDevice) state.setFocusedDevice(null)
      return
    }

    rescanRef.current -= delta
    if (rescanRef.current <= 0 || !scannedRef.current) {
      rescanRef.current = 0.5
      scannedRef.current = true
      const targets: Object3D[] = []
      const carried = state.progress.devicesCarried
      scene.traverseVisible((object) => {
        if (aimableDeviceId(object.name, RADIOS_BY_ID, carried)) targets.push(object)
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
    let distance: number | undefined
    if (targetsRef.current.length > 0) {
      raycaster.setFromCamera(CENTRE, camera)
      const intersections = intersectionsRef.current
      intersections.length = 0
      raycaster.intersectObjects(targetsRef.current, true, intersections)
      const hit = intersections[0]
      found = hit && !hiddenInScene(hit.object) ? deviceIdFor(hit.object) : null
      distance = hit?.distance
      intersections.length = 0
    }
    state.setFocusedDevice(found, distance)
  })

  return null
}

/**
 * Delivers each radio call once, after its delay, when the radio has power.
 *
 * Only the first call due is scheduled: calls are heard in content order, so
 * "you took the radio" can never arrive before the porter introduces himself,
 * and the next one is scheduled with its own delay when this one is heard. A
 * call never interrupts the player holding an exhibit, reading, entering a
 * code or listening to another transmission; it waits politely and retries.
 * It is recorded as heard only when its last line ends (`advanceRadio`).
 */
export function RadioDirector() {
  const progress = useMuseum((state) => state.progress)
  const timersRef = useRef(new Map<string, number>())

  useEffect(() => {
    const timers = timersRef.current
    for (const { device, room } of RADIOS) {
      if (!poweredNow(device.poweredBy)) continue
      const call = nextRadioCall(device, progress, MUSEUM)
      if (!call || timers.has(call.id)) continue
      const deliver = () => {
        const state = useMuseum.getState()
        // Gone: heard meanwhile (the player called first), or its moment
        // passed while it waited (the notebook was picked up during the
        // first call). Otherwise it waits for its turn, the air, every
        // modal and a visible tab.
        const step = radioDeliveryStep(radioCallReady(device, call.id, state.progress, MUSEUM), {
          onAir: state.radio !== null,
          modal: isModalOpen(state),
          hidden: document.visibilityState === 'hidden',
          away: !radioWithinEarshot(device, room.id, state.progress.devicesCarried, state.currentRoom),
        })
        if (step === 'wait') {
          timers.set(call.id, window.setTimeout(deliver, 1200))
          return
        }
        timers.delete(call.id)
        if (step === 'drop') return
        museumAudio.radioSquelch()
        state.startRadio({
          deviceId: device.id,
          speakerKey: device.speakerKey,
          lineKeys: call.lineKeys,
          callId: call.id,
        })
      }
      timers.set(call.id, window.setTimeout(deliver, call.delaySeconds * 1000))
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

/**
 * The radio in the player's hand: R calls the porter from any room, and a
 * hang-up is heard and then runs out on its own.
 *
 * Mounted once at the scene root, not with the office: the handset works in
 * the atrium and the wings, where the office's devices are not mounted.
 */
export function RadioHandset() {
  const hungUpUntil = useMuseum((state) => state.radioHungUpUntil)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isRadioCallKey(event)) return
      const id = heldRadioId(useMuseum.getState().progress.devicesCarried, MUSEUM)
      if (id && placeRadioCall(id)) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // The click of the handset going down, when the line he hung up on ends.
  useEffect(
    () =>
      useMuseum.subscribe((state, previous) => {
        if (hangUpStarted(previous.radioHungUpUntil, state.radioHungUpUntil)) museumAudio.radioHangUp()
      }),
    [],
  )

  useEffect(() => {
    if (hungUpUntil === null) return undefined
    const timer = window.setTimeout(
      () => useMuseum.getState().clearRadioHangUp(),
      hangUpDelayMs(hungUpUntil, Date.now()),
    )
    return () => window.clearTimeout(timer)
  }, [hungUpUntil])

  return null
}
