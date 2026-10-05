/**
 * The working objects of a room: clocks, door readers, the porter's radio,
 * a thing that only has something to say, a thing that speaks when worked,
 * the desk a term is signed at — and, once it leaves the desk, the radio in
 * the player's hand.
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

import type { BakedBundle } from '../content/bake.generated'
import { MUSEUM } from '../content/museum'
import type { DeviceData, RoomData } from '../content/schema'
import { contributeToSave, gameInPlay, isModalOpen, useMuseum } from '../state/store'
import { museumAudio } from './audio'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import { clockCount, type ClockStore } from './clockCount'
import type { CollisionWorld } from './collision'
import {
  aimableDevices,
  airTaken,
  clockFaceAngles,
  deviceInputOf,
  deviceIntent,
  deviceLive,
  messageLampLit,
  nextRadioCall,
  radioCallReady,
  radioDeliveryStep,
  radioDevices,
  radioWithinEarshot,
  type RadioDevice,
  type VoiceDevice,
} from './deviceRules'
import {
  aimableDeviceId,
  deviceIdFor,
  hiddenInScene,
  paintLenses,
  placeHandset,
  prepareDeskNodes,
  prepareHandset,
  showDeskNodes,
} from './deviceNodes'
import { isHoldRequest, type HoldRequest } from './holdAction'
import { PROXY_MATERIAL_PROPS, paddedProxy } from './interactionProxy'
import { deviceProxyMinimum, INTERACTION_REACH, interactionHeldIdOf, interactionWinnerOf } from './interactionTarget'
import { cloneKitPart, disposeKitPart, registerKitColliders } from './kitPart'
import type { MaterialLibrary } from './materials'
import { setClockMinutes } from './nightClock'
import { isRoomPowered } from './power'
import { playerPosition } from './playerPosition'
import {
  beginPrimaryHold,
  cancelPrimaryHold,
  isHoldCancelKey,
  isInteractKey,
  isUnclaimedInteractKey,
  onPrimaryHoldFired,
  primaryHold,
  releasePrimaryAction,
  subscribePrimaryAction,
  tickPrimaryHold,
} from './primaryAction'
import { clockGrant } from './progressGrants'
import { placeRadioCall, takeDeskRadio } from './radioCall'
import { hangUpDelayMs, hangUpStarted, heldRadioId, isRadioCallKey } from './radioPatience'
import { skipSequenceStep } from './sequenceDirector'
import { pressSigningDesk, signAtDesk } from './signingDesk'
import { deskShows, type SigningDesk } from './termRules'
import { operateVoice } from './voiceDevice'

const CENTRE = new Vector2(0, 0)
const INTERACTION_LAYER = 7
const REACH = INTERACTION_REACH.device
/** Beyond this the reader's latch is out of earshot. */
const LATCH_AUDIBLE_DISTANCE = 10

const ROOMS_BY_ID = new Map(MUSEUM.rooms.map((room) => [room.id as string, room] as const))
const RADIOS = radioDevices(MUSEUM)
/** Every device the crosshair may rest on: the radio, and whatever only answers. */
const AIMABLE_BY_ID = new Map(aimableDevices(MUSEUM).map((entry) => [entry.device.id, entry] as const))

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
  // Put right, it shows the hour of the night, which moves when something is
  // done and not as the minutes pass. One number out of the selector, so the
  // component is told only when a hand has to move.
  const nightMinutes = useMuseum((state) => setClockMinutes(MUSEUM.nightClock, device.setFlag, state.progress, MUSEUM))
  const night = useMemo(
    () => (nightMinutes === null ? null : { hours: Math.floor(nightMinutes / 60), minutes: nightMinutes % 60 }),
    [nightMinutes],
  )

  useEffect(() => {
    if (powered) return count.run()
    count.stop()
    return undefined
  }, [count, powered])

  useFrame((_, delta) => {
    const angles = clockFaceAngles(device.stoppedAt, count.advance(delta), night)
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

  return null
}

// ---------------------------------------------------------------------------
// A voice with a message lamp
// ---------------------------------------------------------------------------

/**
 * The lamp of a thing that holds a recorded message: it blinks red while the
 * message waits unheard and the mains are on, and is dark otherwise.
 *
 * Whether it shows is the rule's to say (`messageLampLit`), asked every
 * frame of the save as it stands; the lens is repainted only when the answer
 * changes, with the library's own material, so a blink costs no program.
 */
function VoiceDeviceView({
  device,
  instance,
  materials,
}: {
  device: VoiceDevice
  instance: Object3D
  materials: MaterialLibrary
}) {
  const shownRef = useRef<boolean | null>(null)

  useFrame(({ clock }) => {
    const lit = messageLampLit(device, deviceInputOf(device, useMuseum.getState(), MUSEUM), clock.elapsedTime)
    if (lit === shownRef.current) return
    const material = materials.get(lit ? 'led-red' : 'led-off')
    if (!material) return
    shownRef.current = lit
    paintLenses(instance, device.part, material)
  })

  return null
}

// ---------------------------------------------------------------------------
// A desk where terms are signed
// ---------------------------------------------------------------------------

/**
 * The lamp of a signing desk and the Book on it (DL3-7).
 *
 * The lamp is drawn only while a term waits on the desk: red while the term
 * still waits for something, green once a held press would sign it. The Book
 * is drawn only once a term of this desk has been signed. What is drawn is
 * the rule's to say (`deskShows`), asked of what the desk stands at, which
 * is the very thing its prompt is worded by; this only hides and shows the
 * two groups of nodes. Neither costs a draw while it has nothing to say,
 * which in the hall is the difference between fitting its ceiling and not.
 */
function SigningDeskView({
  device,
  instance,
  materials,
}: {
  device: SigningDesk
  instance: Object3D
  materials: MaterialLibrary
}) {
  const nodes = useMemo(() => prepareDeskNodes(instance, device.part), [device.part, instance])
  const progress = useMuseum((state) => state.progress)
  const sequence = useMuseum((state) => state.sequence)
  const intent = deviceIntent(device, deviceInputOf(device, { progress, radio: null, sequence }, MUSEUM))
  const state = intent.kind === 'desk' ? intent.state : null
  const { lamp, book } = state ? deskShows(state, device, progress) : { lamp: false, book: false }
  useLensMaterial(instance, device.part, materials, state?.state === 'ready' ? 'led-green' : 'led-red')

  // Before paint, so neither flashes for a frame on a desk with nothing on it.
  useLayoutEffect(() => showDeskNodes(nodes, lamp, book), [book, lamp, nodes])

  return null
}

// ---------------------------------------------------------------------------
// The volume the crosshair finds
// ---------------------------------------------------------------------------

/**
 * The invisible box of a device that answers the crosshair: its own bounds,
 * padded to the minimum of its kind.
 *
 * One component for every such device. It was the radio's alone while the
 * radio was the only device anybody could aim at; the plinth of the hall
 * hangs the same box, and so will whatever answers next.
 */
function DeviceProxy({
  device,
  instance,
  hidden,
}: {
  device: DeviceData
  instance: Object3D
  /** The device has left with the player: nothing is left here to aim at. */
  hidden: boolean
}) {
  const proxy = useMemo(() => {
    instance.updateMatrixWorld(true)
    // "Looking at the radio", not threading the crosshair through an antenna.
    return paddedProxy(new Box3().setFromObject(instance), deviceProxyMinimum(device))
  }, [device, instance])

  return (
    // A group, not the mesh: targeting switches invisible meshes back on for
    // its ray layer, and rejects any hit under a hidden ancestor instead.
    <group visible={!hidden}>
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
  kitBundle,
  materials,
  collision,
}: {
  room: RoomData
  device: DeviceData
  kit: Group
  kitBundle: BakedBundle
  materials: MaterialLibrary
  collision: CollisionWorld | null
}) {
  const instance = useDeviceInstance(kit, device.part, materials)
  const carried = useCarried(device.id)

  // A device is solid by whatever collider its recipe carries in the bake
  // manifest; a recipe with none (the clock, the radio) registers nothing.
  // The plinth of the hall was furniture until it had something to say, and
  // `KitLayer` registered its collider: as a device it has to be solid here,
  // or the capsule walks through the one landmark the hall is built round.
  useEffect(
    () =>
      registerKitColliders(kit, device.part, kitBundle, collision, {
        roomOrigin: room.origin,
        position: device.position,
        rotationY: device.rotationY,
        scale: 1,
      }),
    [collision, device.part, device.position, device.rotationY, kit, kitBundle, room.origin],
  )

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
      {device.kind === 'voice' && device.messageLamp ? (
        <VoiceDeviceView device={device} instance={instance} materials={materials} />
      ) : null}
      {device.kind === 'signing-desk' ? (
        <SigningDeskView device={device} instance={instance} materials={materials} />
      ) : null}
      {AIMABLE_BY_ID.has(device.id) ? (
        <DeviceProxy device={device} instance={instance} hidden={carried} />
      ) : null}
    </group>
  )
}

export function DeviceLayer({
  room,
  kitBundle,
  materials,
  collision,
}: {
  room: RoomData
  kitBundle: BakedBundle
  materials: MaterialLibrary
  collision: CollisionWorld | null
}) {
  const { scene } = useGLTF(kitBundle.url, USE_DRACO, USE_MESHOPT)
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
          kitBundle={kitBundle}
          materials={materials}
          collision={collision}
        />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Targeting and the radio's voice
// ---------------------------------------------------------------------------

/**
 * E on a device: whatever its intent says, which is what its prompt says.
 *
 * A radio on its desk is picked up if it is one the player carries away,
 * otherwise the same press as the call button — skip a line, or call him. A
 * stopped clock is put right, which records its flag (`clockGrant`) and no
 * more: what it shows from then on follows from the save. A thing that
 * speaks says what this night makes it say (`voiceDevice.ts`). A desk with
 * a term ready asks for the press to be held, and hands that request back
 * (`signingDesk.ts`); the signature is made when the hold ends, not here. A
 * notice has said all it has to say in the prompt: it declines the press,
 * and the key goes to whatever else is waiting for it.
 */
function operateDevice(deviceId: string): boolean | HoldRequest {
  const entry = AIMABLE_BY_ID.get(deviceId)
  if (!entry) return false
  const intent = deviceIntent(entry.device, deviceInputOf(entry.device, useMuseum.getState(), MUSEUM))
  if (!deviceLive(intent)) return false
  switch (intent.kind) {
    case 'radio':
      if (intent.intent === 'take') return takeDeskRadio(deviceId)
      return placeRadioCall(deviceId)
    case 'clock':
      if (entry.device.kind !== 'clock') return false
      useMuseum.getState().grant(clockGrant(entry.device))
      return true
    case 'voice':
      return operateVoice(deviceId)
    case 'desk':
      return pressSigningDesk(deviceId)
    case 'notice':
    case 'none':
      return false
  }
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
      // a device that only answers (a radio without charge, a notice) never
      // takes the key from the lamp.
      const winner = interactionWinnerOf(state, MUSEUM)
      if (winner?.kind !== 'device' || !winner.live) return false
      return operateDevice(winner.id)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isHoldCancelKey(event)) cancelPrimaryHold()
      if (event.repeat || !isUnclaimedInteractKey(event)) return
      const answer = interact()
      if (answer === false) return
      event.preventDefault()
      // A press that has to be held goes on through the one gesture the
      // touch button drives too: the key coming up, below, is its release.
      if (isHoldRequest(answer)) beginPrimaryHold(answer)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (isInteractKey(event)) releasePrimaryAction()
    }
    // A key that comes up while the window is elsewhere never says so: a
    // hold must not go on, and sign, behind the player's back.
    const dropHold = () => cancelPrimaryHold()
    const dropHoldWhenHidden = () => {
      if (document.visibilityState === 'hidden') cancelPrimaryHold()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', dropHold)
    document.addEventListener('visibilitychange', dropHoldWhenHidden)
    // The hold came to its end, by key or by finger: the term is signed.
    const stopSigning = onPrimaryHoldFired(signAtDesk)
    // Between furniture (200) and the room's own power control (100): the
    // radio sits on the same desk as the lamp and must win when aimed at.
    const unsubscribe = subscribePrimaryAction(interact, 150)
    return () => {
      unsubscribe()
      stopSigning()
      cancelPrimaryHold()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', dropHold)
      document.removeEventListener('visibilitychange', dropHoldWhenHidden)
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
    // A hold counts its time here, frame by frame, and only while the thing
    // it is on still owns the crosshair and still asks to be held
    // (`interactionHeldIdOf`). Asked before the modal check: under a modal
    // nothing owns the crosshair, and that is what ends the hold.
    if (primaryHold().phase !== 'idle') tickPrimaryHold(delta, interactionHeldIdOf(state, MUSEUM))
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
        if (aimableDeviceId(object.name, AIMABLE_BY_ID, carried)) targets.push(object)
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
 *
 * What is owed is asked again whenever the air changes hands, and not only
 * when the save changes: a call cut off by something else that took the air
 * (the telephone, dialled over the porter) was not heard and wrote nothing,
 * so no change of the save would ever bring it back. A directed sequence
 * takes the air the same way (`airTaken`): he waits while it plays, and what
 * it cut off is asked for again when it ends.
 */
export function RadioDirector() {
  const progress = useMuseum((state) => state.progress)
  const onAir = useMuseum(airTaken)
  const timersRef = useRef(new Map<string, number>())

  useEffect(() => {
    const timers = timersRef.current
    for (const { device, room } of RADIOS) {
      if (!poweredNow(device.poweredBy)) continue
      const call = nextRadioCall(device, progress, MUSEUM)
      // The call being said is owed until its last line, and is not
      // scheduled again while it is on air.
      if (!call || timers.has(call.id) || useMuseum.getState().radio?.callId === call.id) continue
      const deliver = () => {
        const state = useMuseum.getState()
        // Gone: heard meanwhile (the player called first), or its moment
        // passed while it waited (the notebook was picked up during the
        // first call). Otherwise it waits for its turn, the air, every
        // modal and a visible tab.
        const step = radioDeliveryStep(radioCallReady(device, call.id, state.progress, MUSEUM), {
          onAir: airTaken(state),
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
  }, [onAir, progress])

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
      // A directed sequence is moved on by R whether or not there is a radio
      // in the pocket: it needs none to play, and none to be skipped.
      if (skipSequenceStep()) {
        event.preventDefault()
        return
      }
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
