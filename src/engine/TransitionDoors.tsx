import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Group,
  Mesh,
  Raycaster,
  Vector2,
  type Intersection,
  type Object3D,
} from 'three'

import type { BakedBundle } from '../content/bake.generated'
import { MUSEUM } from '../content/museum'
import { useMuseum } from '../state/store'
import { museumAudio } from './audio'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import type { CollisionWorld } from './collision'
import { cloneKitPart } from './kitPart'
import type { MaterialLibrary } from './materials'
import { subscribePrimaryAction } from './primaryAction'
import { registerTransitionDoorGate } from './transitionDoorCollision'
import {
  isInsideTransitionDoorEnvelope,
  transitionDoorCrossingSide,
  transitionDoorLocalPoint,
  type DoorLocalPoint,
  type DoorPassageSide,
} from './transitionDoorPassage'
import { advanceDoorRevealBarrier } from './transitionDoorReveal'
import {
  createTransitionDoorConfig,
  createTransitionDoorState,
  inspectTransitionDoor,
  transitionDoor,
  type TransitionDoorPhase,
  type TransitionDoorState,
} from './transitionDoorState'
import {
  buildTransitionDoorSpecs,
  canOpenTransitionDoor,
  transitionDoorTarget,
  transitionDoorSwingSign,
  TRANSITION_DOOR_PLANE_Z,
  TRANSITION_DOOR_SILL_Y,
  type TransitionDoorSpec,
} from './transitionDoorTopology'
import { PLAYER_CAPSULE, playerPosition } from './playerPosition'

const CENTRE = new Vector2(0, 0)
const INTERACTION_LAYER = 7
const INTERACTION_DISTANCE = 2.6
const OPEN_ANGLE = Math.PI * 0.53
const ABANDON_DISTANCE_PADDING = 0.5
const DOORS = buildTransitionDoorSpecs(MUSEUM.rooms)

type DoorRuntime = {
  readonly config: ReturnType<typeof createTransitionDoorConfig>
  readonly spec: TransitionDoorSpec
  state: TransitionDoorState
  swingSign: 1 | -1
  openedFromSide: DoorPassageSide | null
  previousLocalPoint: DoorLocalPoint | null
  crossed: boolean
  revealFrameObserved: boolean
}

type DoorViewState = Readonly<{
  phase: TransitionDoorPhase
  colliderBlocked: boolean
}>

function canTargetDoor(phase: TransitionDoorPhase) {
  return phase !== 'open' && phase !== 'closing'
}

function FallbackDoorLeaf({
  spec,
  side,
  materials,
}: {
  spec: TransitionDoorSpec
  side: 'left' | 'right'
  materials: MaterialLibrary
}) {
  return (
    <mesh
      position={[side === 'left' ? spec.width / 4 : -spec.width / 4, 1.17, 0]}
      material={materials.get('oak-varnished')}
    >
      <boxGeometry args={[spec.width / 2, 2.34, 0.045]} />
    </mesh>
  )
}

function DoorLeafModel({
  spec,
  side,
  kitBundle,
  materials,
}: {
  spec: TransitionDoorSpec
  side: 'left' | 'right'
  kitBundle: BakedBundle
  materials: MaterialLibrary
}) {
  const { scene } = useGLTF(kitBundle.url, USE_DRACO, USE_MESHOPT)
  const kit = scene as Group
  const recipe = side === 'left' ? 'door-leaf' : 'door-leaf-right'
  const leaf = useMemo(() => cloneKitPart(kit, recipe, materials), [kit, materials, recipe])

  return leaf ? (
    <primitive object={leaf} dispose={null} />
  ) : (
    <FallbackDoorLeaf spec={spec} side={side} materials={materials} />
  )
}

function DoorAssembly({
  spec,
  phase,
  colliderBlocked,
  kitBundle,
  materials,
  collision,
  setLeaf,
  setProxy,
}: {
  spec: TransitionDoorSpec
  phase: TransitionDoorPhase
  colliderBlocked: boolean
  kitBundle: BakedBundle
  materials: MaterialLibrary
  collision: CollisionWorld | null
  setLeaf: (side: 'left' | 'right', value: Group | null) => void
  setProxy: (value: Mesh | null) => void
}) {
  useEffect(() => {
    if (!colliderBlocked || !collision) return undefined

    return registerTransitionDoorGate(collision, spec)
  }, [colliderBlocked, collision, spec])

  return (
    <group
      name={`transition-door:${spec.id}`}
      position={spec.position as unknown as [number, number, number]}
      rotation={[0, spec.rotationY, 0]}
    >
      <group
        ref={(value) => setLeaf('left', value)}
        position={[-spec.width / 2, TRANSITION_DOOR_SILL_Y, TRANSITION_DOOR_PLANE_Z]}
      >
        <Suspense
          fallback={<FallbackDoorLeaf spec={spec} side="left" materials={materials} />}
        >
          <DoorLeafModel
            spec={spec}
            side="left"
            kitBundle={kitBundle}
            materials={materials}
          />
        </Suspense>
      </group>
      <group
        ref={(value) => setLeaf('right', value)}
        position={[spec.width / 2, TRANSITION_DOOR_SILL_Y, TRANSITION_DOOR_PLANE_Z]}
      >
        <Suspense
          fallback={<FallbackDoorLeaf spec={spec} side="right" materials={materials} />}
        >
          <DoorLeafModel
            spec={spec}
            side="right"
            kitBundle={kitBundle}
            materials={materials}
          />
        </Suspense>
      </group>

      {/* Camera layer 0 never draws this box; the centre-screen interaction
          ray uses layer 7. Keeping it opaque/non-transparent avoids adding a
          shader variant even though it never reaches the render list. */}
      <mesh
        ref={(value) => {
          if (value) value.layers.set(INTERACTION_LAYER)
          setProxy(value)
        }}
        name={`transition-door-target:${spec.id}`}
        position={[
          0,
          TRANSITION_DOOR_SILL_Y + spec.height / 2,
          TRANSITION_DOOR_PLANE_Z,
        ]}
        visible={canTargetDoor(phase)}
      >
        <boxGeometry args={[spec.width, spec.height, 0.1]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

/**
 * Physical, data-driven doors that hide cold room detail until GPU warm-up.
 *
 * A door is authored once on one portal declaration, but `transitionDoorTarget`
 * makes it usable from either connected room. The warmed destination remains
 * cached after the leaves close, so later cycles animate immediately without
 * revealing another load.
 */
export function TransitionDoorLayer({
  kitBundle,
  materials,
  collision,
  isRoomReady,
  requestWarmRoom,
  onDoorVisibilityChanged,
  visibleDoorIds,
}: {
  kitBundle: BakedBundle
  materials: MaterialLibrary
  collision: CollisionWorld | null
  isRoomReady: (roomId: string) => boolean
  requestWarmRoom: (roomId: string) => void
  onDoorVisibilityChanged: (
    doorId: string,
    visible: boolean,
    destinationRoomId?: string,
  ) => void
  visibleDoorIds: ReadonlySet<string>
}) {
  const camera = useThree((state) => state.camera)
  const runtimes = useMemo(
    () =>
      new Map<string, DoorRuntime>(
        DOORS.map((spec) => [
          spec.id,
          {
            config: createTransitionDoorConfig({
              durationSeconds: spec.openDuration,
              closeDurationSeconds: spec.closeDuration,
              openAngle: OPEN_ANGLE,
            }),
            spec,
            state: createTransitionDoorState(),
            swingSign: 1,
            openedFromSide: null,
            previousLocalPoint: null,
            crossed: false,
            revealFrameObserved: false,
          } satisfies DoorRuntime,
        ]),
      ),
    [],
  )
  const [doorViews, setDoorViews] = useState<Record<string, DoorViewState>>(() =>
    Object.fromEntries(
      DOORS.map((door) => [
        door.id,
        { phase: 'closed', colliderBlocked: true } satisfies DoorViewState,
      ]),
    ),
  )
  const leftLeaves = useRef(new Map<string, Group>())
  const rightLeaves = useRef(new Map<string, Group>())
  const proxies = useRef(new Map<string, Mesh>())
  const raycaster = useMemo(() => {
    const next = new Raycaster()
    next.layers.set(INTERACTION_LAYER)
    return next
  }, [])
  const hitsRef = useRef<Intersection<Object3D>[]>([])
  const candidatesRef = useRef<Object3D[]>([])
  const lastFocusRef = useRef<string | null>(null)

  const commitState = useCallback(
    (runtime: DoorRuntime, previous: TransitionDoorState) => {
      const before = inspectTransitionDoor(previous, runtime.config)
      const after = inspectTransitionDoor(runtime.state, runtime.config)
      const phaseChanged = after.phase !== before.phase
      const collisionChanged = after.colliderBlocked !== before.colliderBlocked
      if (!phaseChanged && !collisionChanged) return

      if (after.phase === 'opening' && before.phase !== 'closing') {
        museumAudio.doorOpen(runtime.config.durationSeconds)
      }
      if (after.phase === 'opening' && before.phase !== 'opening') {
        runtime.revealFrameObserved = false
        const destination = transitionDoorTarget(
          runtime.spec,
          useMuseum.getState().currentRoom,
        )
        onDoorVisibilityChanged(runtime.spec.id, true, destination ?? undefined)
      }
      if (
        after.phase === 'preloading' &&
        before.phase === 'opening' &&
        before.linearProgress === 0
      ) {
        runtime.revealFrameObserved = false
        onDoorVisibilityChanged(runtime.spec.id, false)
      }
      if (after.phase === 'closed' && before.phase !== 'closed') {
        onDoorVisibilityChanged(runtime.spec.id, false)
        runtime.openedFromSide = null
        runtime.previousLocalPoint = null
        runtime.crossed = false
        runtime.revealFrameObserved = false
      }
      setDoorViews((current) => {
        const currentView = current[runtime.spec.id]
        if (
          currentView?.phase === after.phase &&
          currentView.colliderBlocked === after.colliderBlocked
        ) {
          return current
        }
        return {
          ...current,
          [runtime.spec.id]: {
            phase: after.phase,
            colliderBlocked: after.colliderBlocked,
          },
        }
      })
    },
    [onDoorVisibilityChanged],
  )

  const requestFor = useCallback((runtime: DoorRuntime, targetRoom: string) => {
    const previous = runtime.state
    runtime.state = transitionDoor(runtime.state, { type: 'proximity' }, runtime.config)
    requestWarmRoom(targetRoom)
    commitState(runtime, previous)
  }, [commitState, requestWarmRoom])

  useEffect(() => {
    const interact = () => {
      const museum = useMuseum.getState()
      const focused = museum.focusedTransitionDoor
      if (
        !focused ||
        focused.status === 'blocked' ||
        museum.examining ||
        museum.openedContainer ||
        museum.activeLock
      ) {
        return false
      }
      const runtime = runtimes.get(focused.id)
      if (
        !runtime ||
        !canOpenTransitionDoor(runtime.spec, museum.currentRoom) ||
        !canTargetDoor(runtime.state.phase)
      ) {
        return false
      }

      const previous = runtime.state
      if (runtime.state.phase === 'ready' && !isRoomReady(focused.targetRoom)) {
        runtime.state = transitionDoor(
          runtime.state,
          { type: 'preload-invalidated' },
          runtime.config,
        )
      }
      runtime.swingSign = transitionDoorSwingSign(runtime.spec, museum.currentRoom)
      runtime.openedFromSide =
        museum.currentRoom === runtime.spec.ownerRoomId ? 1 : -1
      runtime.previousLocalPoint = transitionDoorLocalPoint(
        runtime.spec,
        playerPosition,
      )
      runtime.crossed = false
      runtime.state = transitionDoor(runtime.state, { type: 'interact' }, runtime.config)
      if (runtime.state.phase === 'preloading') requestWarmRoom(focused.targetRoom)
      commitState(runtime, previous)
      return true
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.code !== 'KeyE') return
      if (interact()) event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    const unsubscribePrimaryAction = subscribePrimaryAction(interact, 400)
    return () => {
      unsubscribePrimaryAction()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [commitState, isRoomReady, requestWarmRoom, runtimes])

  useEffect(
    () => () => {
      const focused = useMuseum.getState().focusedTransitionDoor
      if (focused && runtimes.has(focused.id)) {
        useMuseum.getState().setFocusedTransitionDoor(null)
      }
    },
    [runtimes],
  )

  useFrame((_, delta) => {
    const museum = useMuseum.getState()
    const currentRoom = museum.currentRoom

    for (const runtime of runtimes.values()) {
      const targetRoom = transitionDoorTarget(runtime.spec, currentRoom)
      const canOperate = canOpenTransitionDoor(runtime.spec, currentRoom)
      const dx = playerPosition.x - runtime.spec.position[0]
      const dz = playerPosition.z - runtime.spec.position[2]
      const distanceSquared = dx * dx + dz * dz
      if (targetRoom && canOperate) {
        const targetReady = isRoomReady(targetRoom)
        if (
          !targetReady &&
          (runtime.state.phase === 'ready' ||
            (runtime.state.phase === 'opening' &&
              runtime.state.movementElapsedSeconds === 0))
        ) {
          const previous = runtime.state
          runtime.state = transitionDoor(
            runtime.state,
            { type: 'preload-invalidated' },
            runtime.config,
          )
          commitState(runtime, previous)
        }
        if (
          distanceSquared <= runtime.spec.warmDistance ** 2 &&
          runtime.state.phase === 'closed'
        ) {
          requestFor(runtime, targetRoom)
        }

        if (
          targetReady &&
          (runtime.state.phase === 'closed' || runtime.state.phase === 'preloading')
        ) {
          const previous = runtime.state
          runtime.state = transitionDoor(
            runtime.state,
            { type: 'preload-ready' },
            runtime.config,
          )
          commitState(runtime, previous)
        }
      }

      if (
        targetRoom &&
        runtime.state.phase === 'open' &&
        !runtime.state.passageOccupied &&
        distanceSquared >
          (runtime.spec.warmDistance + ABANDON_DISTANCE_PADDING) ** 2
      ) {
        const previous = runtime.state
        runtime.state = transitionDoor(
          runtime.state,
          { type: 'idle-close' },
          runtime.config,
        )
        commitState(runtime, previous)
      }

      const currentLocalPoint = transitionDoorLocalPoint(runtime.spec, playerPosition)
      if (
        runtime.openedFromSide !== null &&
        runtime.previousLocalPoint &&
        runtime.state.collisionReleased
      ) {
        const crossingSide = transitionDoorCrossingSide(
          runtime.spec,
          runtime.previousLocalPoint,
          currentLocalPoint,
          PLAYER_CAPSULE.radius,
        )
        if (crossingSide !== null) {
          runtime.crossed = crossingSide === -runtime.openedFromSide
        }

        const insideEnvelope = isInsideTransitionDoorEnvelope(
          runtime.spec,
          playerPosition,
          runtime.openedFromSide,
          PLAYER_CAPSULE.radius,
        )
        if (insideEnvelope && !runtime.state.passageOccupied) {
          const previous = runtime.state
          runtime.state = transitionDoor(
            runtime.state,
            { type: 'passage-enter' },
            runtime.config,
          )
          commitState(runtime, previous)
        } else if (!insideEnvelope && runtime.state.passageOccupied) {
          const previous = runtime.state
          runtime.state = transitionDoor(
            runtime.state,
            { type: 'passage-clear', crossed: runtime.crossed },
            runtime.config,
          )
          commitState(runtime, previous)
        }
      }
      if (runtime.openedFromSide !== null) {
        runtime.previousLocalPoint = currentLocalPoint
      }

      let mayAdvanceOpening = true
      if (runtime.state.phase === 'opening' && runtime.state.movementElapsedSeconds === 0) {
        const reveal = advanceDoorRevealBarrier(
          runtime.revealFrameObserved,
          Boolean(targetRoom && isRoomReady(targetRoom)),
          visibleDoorIds.has(runtime.spec.id),
        )
        runtime.revealFrameObserved = reveal.frameObserved
        mayAdvanceOpening = reveal.advance
      }

      if (
        (runtime.state.phase === 'opening' && mayAdvanceOpening) ||
        runtime.state.phase === 'closing'
      ) {
        const previous = runtime.state
        runtime.state = transitionDoor(
          runtime.state,
          { type: 'advance', deltaSeconds: delta },
          runtime.config,
        )
        commitState(runtime, previous)
      }

      const pose = inspectTransitionDoor(runtime.state, runtime.config)
      const left = leftLeaves.current.get(runtime.spec.id)
      const right = rightLeaves.current.get(runtime.spec.id)
      if (left) left.rotation.y = runtime.swingSign * pose.angleRadians
      if (right) right.rotation.y = -runtime.swingSign * pose.angleRadians
    }

    let focusedRuntime: DoorRuntime | undefined
    let focusedTarget: string | null = null
    if (!museum.examining && !museum.openedContainer && !museum.activeLock) {
      raycaster.setFromCamera(CENTRE, camera)
      const candidates = candidatesRef.current
      candidates.length = 0
      for (const [id, proxy] of proxies.current) {
        const phase = runtimes.get(id)?.state.phase
        if (phase && canTargetDoor(phase)) candidates.push(proxy)
      }
      const hits = hitsRef.current
      hits.length = 0
      raycaster.intersectObjects(candidates, false, hits)
      const hit = hits.find((candidate) => candidate.distance <= INTERACTION_DISTANCE)
      if (hit) {
        const id = hit.object.name.slice('transition-door-target:'.length)
        const runtime = runtimes.get(id)
        const target = runtime ? transitionDoorTarget(runtime.spec, currentRoom) : null
        if (runtime && target) {
          focusedRuntime = runtime
          focusedTarget = target
        }
      }
      hits.length = 0
    }

    const focusKey = focusedRuntime
      ? `${focusedRuntime.spec.id}:${focusedRuntime.state.phase}:${focusedRuntime.state.interactionArmed}:${focusedTarget}`
      : null
    if (focusKey === lastFocusRef.current) return
    lastFocusRef.current = focusKey

    if (!focusedRuntime || !focusedTarget || !canTargetDoor(focusedRuntime.state.phase)) {
      museum.setFocusedTransitionDoor(null)
      return
    }
    const status =
      focusedRuntime.spec.opensFrom && focusedRuntime.spec.opensFrom !== currentRoom
        ? 'blocked'
        : focusedRuntime.state.phase === 'opening'
        ? 'opening'
        : focusedRuntime.state.phase === 'ready'
          ? 'ready'
          : 'loading'
    museum.setFocusedTransitionDoor({
      id: focusedRuntime.spec.id,
      targetRoom: focusedTarget,
      status,
      armed: focusedRuntime.state.interactionArmed,
    })
  })

  return (
    <>
      {DOORS.map((door) => (
        <DoorAssembly
          key={door.id}
          spec={door}
          phase={doorViews[door.id]?.phase ?? 'closed'}
          colliderBlocked={doorViews[door.id]?.colliderBlocked ?? true}
          kitBundle={kitBundle}
          materials={materials}
          collision={collision}
          setLeaf={(side, value) => {
            const collection = side === 'left' ? leftLeaves.current : rightLeaves.current
            if (value) collection.set(door.id, value)
            else collection.delete(door.id)
          }}
          setProxy={(value) => {
            if (value) proxies.current.set(door.id, value)
            else proxies.current.delete(door.id)
          }}
        />
      ))}
    </>
  )
}
