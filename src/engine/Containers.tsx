/**
 * Archive cabinets — the physical home of the reading layer.
 *
 * Documents are the museum's optional depth. Keeping them in furniture rather
 * than on the wall is what lets a four-minute visitor skip them entirely while
 * a curious one is rewarded for opening things, which is the whole point of
 * having an archive layer at all.
 *
 * Reading one is a single press: no drawer animation, no inventory. The reward
 * for exploring should be the text, not a ceremony in front of it. What it
 * holds is read one paper at a time, and E turns to the next
 * (`readingQueue.ts`).
 *
 * The one thing that moves is a door a container declares (`door`): it
 * stands open once the container's lock is, and what was behind it
 * (`contents`) is drawn from then on. It is what the lock did, shown; the
 * press that opened the lock has already read everything. Open, the door is
 * solid where it stands (`containerDoorSolid.ts`).
 */

import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Box3, Mesh, Raycaster, Vector2, type Group, type Object3D } from 'three'

import type { BakedBundle } from '../content/bake.generated'
import { MUSEUM } from '../content/museum'
import type { ContainerData, RoomData, Vec3 } from '../content/schema'
import { museumAudio } from './audio'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import type { CollisionWorld } from './collision'
import { openDoorSolid } from './containerDoorSolid'
import {
  doorAngleAfter,
  prepareContainerContents,
  prepareContainerDoor,
  showContainerContents,
  swingContainerDoor,
} from './containerNodes'
import { cloneKitPart, disposeKitPart, registerKitColliders } from './kitPart'
import { attemptLock, containerOpen } from './lockRules'
import type { MaterialLibrary } from './materials'
import { containerById, isContainerTaken, isNotebook } from './notebook'
import { DRAWER_PROXY, PROXY_MATERIAL_PROPS, paddedProxy } from './interactionProxy'
import { INTERACTION_REACH, interactionWinnerOf, PROXY_MINIMUM } from './interactionTarget'
import { isUnclaimedInteractKey, subscribePrimaryAction } from './primaryAction'
import { containerGrant } from './progressGrants'
import { readerAdvance } from './readingQueue'
import { isModalOpen, useMuseum } from '../state/store'
import './bvhSetup'

const CENTRE = new Vector2(0, 0)
/**
 * Layer used by interaction-only geometry.
 *
 * The camera never enables this layer, so the proxy box is never drawn — but it
 * is still a legitimate raycast target. Setting `visible = false` would not
 * work: three's Raycaster skips invisible objects, so hiding it that way hides
 * it from the ray as well as from the screen.
 */
const INTERACTION_LAYER = 7
const REACH = INTERACTION_REACH.container

export function ContainerLayer({
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
  const containers = room.containers ?? []

  if (containers.length === 0) return null

  return (
    <>
      {containers.map((container) => (
        <Container
          key={container.id}
          container={container}
          kit={scene as Group}
          kitBundle={kitBundle}
          materials={materials}
          collision={collision}
          roomOrigin={room.origin}
        />
      ))}
    </>
  )
}

function Container({
  container,
  kit,
  kitBundle,
  materials,
  collision,
  roomOrigin,
}: {
  container: ContainerData
  kit: Group
  kitBundle: BakedBundle
  materials: MaterialLibrary
  collision: CollisionWorld | null
  roomOrigin: Vec3
}) {
  const instance = useMemo(() => {
    const clone = cloneKitPart(kit, container.part, materials)
    // Containers are the only kit parts the interaction ray hits directly, so
    // they need a BVH the shared clone does not build.
    clone?.traverse((object: Object3D) => {
      if (object instanceof Mesh && !object.geometry.boundsTree) object.geometry.computeBoundsTree()
    })
    return clone
  }, [kit, container.part, materials])

  useEffect(() => () => disposeKitPart(instance), [instance])
  useEffect(
    () =>
      registerKitColliders(kit, container.part, kitBundle, collision, {
        roomOrigin,
        position: container.position,
        rotationY: container.rotationY,
        scale: 1,
      }),
    [collision, container.part, container.position, container.rotationY, kit, kitBundle, roomOrigin],
  )

  const notebook = isNotebook(container)
  // A notebook is aimed at by its own bounds, padded to a forgiving minimum:
  // the cabinet's chest-high box around a book on a desk would also swallow
  // the lamp, the radio and the ledgers beside it.
  const proxy = useMemo(() => {
    if (!instance) return null
    if (!notebook) return DRAWER_PROXY
    instance.updateMatrixWorld(true)
    return paddedProxy(new Box3().setFromObject(instance), PROXY_MINIMUM.notebook)
  }, [instance, notebook])

  // Reading the notebook is picking it up: it leaves the desk with the player.
  // Selected as the stable array and derived here, so the store's per-frame
  // touch writes do not rerun the lookup.
  const documentsRead = useMuseum((state) => state.progress.documentsRead)
  const taken = useMemo(
    () => isContainerTaken(MUSEUM, container, documentsRead),
    [container, documentsRead],
  )

  // A door on a hinge, and what stands behind it. Whether the container
  // stands open is its lock's to say (`containerOpen`): one boolean out of
  // the selector, so the component hears of it only when it changes.
  const open = useMuseum((state) => containerOpen(container, state.progress))
  // Open, the door is a leaf standing across the floor in front of the
  // container for the rest of the night, and it is as solid there as the
  // box it hangs on. The collider above is the box with its door shut, and
  // was all there was: the player walked through the iron door of the safe
  // in both directions. Solid from the moment the lock opens, at the door's
  // place of rest (`containerDoorSolid.ts`, which the suites' world places
  // too), and gone with the container.
  useEffect(() => {
    const solid = open ? openDoorSolid(container, kitBundle, roomOrigin) : null
    if (!solid || !collision) return undefined
    const remove = collision.add(solid.geometry, solid.matrix)
    // The world keeps its own copy, baked into world space.
    solid.geometry.dispose()
    return remove
  }, [collision, container, kitBundle, open, roomOrigin])
  const door = useMemo(
    () => (instance && container.door ? prepareContainerDoor(instance, container.part, container.door) : null),
    [container.door, container.part, instance],
  )
  const contents = useMemo(
    () => (instance && container.contents ? prepareContainerContents(instance, container.part, container.contents) : null),
    [container.contents, container.part, instance],
  )
  // Before paint, so what is behind a shut door is never drawn for a frame.
  useLayoutEffect(() => showContainerContents(contents, open), [contents, open])
  const angleRef = useRef<number | null>(null)
  useFrame((_, delta) => {
    if (!door || !container.door) return
    const target = open ? container.door.openAngle : 0
    // On the first frame the door is where the save has it: a safe opened on
    // another night is found open, and only one opened now is seen to swing.
    const angle =
      angleRef.current === null ? target : doorAngleAfter(angleRef.current, target, container.door.openAngle, delta)
    if (angle === angleRef.current) return
    angleRef.current = angle
    swingContainerDoor(door, angle)
  })

  if (!instance || !proxy) return null

  return (
    <group
      name={`container:${container.id}`}
      position={container.position as unknown as [number, number, number]}
      rotation={[0, container.rotationY ?? 0, 0]}
    >
      {/* The named root stays visible, as the door reveal requires; only its
          contents go when the object is taken, and every targeting pass
          rejects hits under a hidden ancestor. */}
      <group visible={!taken}>
      <primitive object={instance} />

      {/*
        Invisible interaction volume.

        A 1.28 m cabinet against a wall means the player has to look distinctly
        DOWN to put a crosshair on it, and sweeping twelve camera angles at it
        only registered on one. Requiring near-pixel-perfect aim to read a
        document turns the optional layer into a dexterity test.

        The proxy is chest-high and a little wider than the carcass, so "looking
        at the cabinet" is enough. It is invisible and casts nothing; the ray
        hits it, everything else ignores it. A notebook takes its own padded
        bounds instead; both come from `interactionProxy.ts`, with the
        material that lets a ray starting inside the box still find it.
      */}
      <mesh position={proxy.centre} visible={false}>
        <boxGeometry args={proxy.size} />
        <meshBasicMaterial {...PROXY_MATERIAL_PROPS} />
      </mesh>
      </group>
    </group>
  )
}

/** Walks up looking for the `container:<id>` group a mesh belongs to. */
function containerIdFor(object: Object3D | null): string | null {
  let node = object
  while (node) {
    if (node.name.startsWith('container:')) return node.name.slice('container:'.length)
    node = node.parent
  }
  return null
}

/** Raycaster does not inherit the renderer's ancestor visibility check. */
function isEffectivelyVisible(object: Object3D | null): boolean {
  let node = object
  while (node) {
    if (!node.visible) return false
    node = node.parent
  }
  return true
}

/**
 * Targets containers from the crosshair and opens them on E.
 *
 * Separate from the exhibit raycast because the two answer different questions
 * and have different reach: you reach into a drawer, you stand back from a
 * case. Sharing one cast would mean one set of rules for both.
 */
export function ContainerTargeting() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const raycaster = useMemo(() => {
    const instance = new Raycaster()
    instance.far = REACH
    // Without this the ray only tests layer 0 and never sees the proxy volume.
    instance.layers.enable(INTERACTION_LAYER)
    return instance
  }, [])

  const targetsRef = useRef<Object3D[]>([])
  const hitsRef = useRef<ReturnType<Raycaster['intersectObjects']>>([])
  const scanRef = useRef({ initialised: false, remaining: 0 })
  const lastRef = useRef<string | null>(null)

  useEffect(() => {
    const interact = () => {
      const state = useMuseum.getState()

      // Pressing E again while reading turns to the next page, and from the
      // last one closes the panel, matching the exhibit examine view: one
      // key in, the same key out. The rule was the notebook's alone, and a
      // cabinet poured every paper it held into one column; it is every
      // reader's now (`readerAdvance`).
      if (state.openedContainer) {
        const next = readerAdvance(MUSEUM, state.openedContainer, state.notebookPage)
        if (next !== 'close') {
          state.setNotebookPage(next)
          return true
        }
        state.setOpenedContainer(null)
        return true
      }
      if (state.activeLock) {
        state.setActiveLock(null)
        return true
      }
      // The journal is a modal too: E behind it used to open a keypad hidden
      // under the journal, which then swallowed every digit and Tab.
      if (isModalOpen(state)) return false
      // An exhibit wins outright — you reach for the object, not the
      // furniture behind it — and otherwise the nearest desk target does.
      const winner = interactionWinnerOf(state, MUSEUM)
      if (winner?.kind !== 'container') return false
      const containerId = winner.id

      /**
       * A locked cabinet answers with its lock instead of its contents, and
       * what the lock answers is `attemptLock`'s to say, not this handler's.
       *
       * Only `ask` opens a panel. This used to open the keypad for any shut
       * lock, and the keypad draws nothing for a lock that is not a code: a
       * modal with nothing in it and the world deaf to E. A lock that refuses
       * says so with a sound and keeps the press.
       *
       * Once the lock is open it behaves like any other cabinet, so the drawer
       * stays readable afterwards rather than becoming a one-shot cutscene.
       */
      const lockId = containerById(MUSEUM, containerId)?.lockId
      if (lockId) {
        const lock = MUSEUM.locks.find((candidate) => candidate.id === lockId)
        // A lock the content does not have cannot be opened by anything.
        if (!lock) {
          museumAudio.lockDenied()
          return true
        }
        const attempt = attemptLock(lock, MUSEUM.facts, state.progress, { kind: 'touch' })
        // Touched: that is what puts the lock on the plan.
        if (attempt.outcome !== 'open') state.grant(attempt.grant)
        if (attempt.outcome === 'ask') {
          if (document.pointerLockElement) document.exitPointerLock()
          state.setActiveLock(lock.id)
          return true
        }
        if (attempt.outcome === 'refused') {
          museumAudio.lockDenied()
          return true
        }
      }

      // What reading it records is the same grant the keypad uses when it
      // opens this container itself (`LockPanel.tsx`).
      state.grant(containerGrant(MUSEUM, containerId))
      // Every reader is used with the mouse as well as with E — a notebook's
      // page buttons, a document's "Close" — and nothing is clickable under
      // pointer lock. The look hint tells the player how to take it back.
      if (document.pointerLockElement) document.exitPointerLock()
      state.setOpenedContainer(containerId)
      return true
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return

      if (event.code === 'Escape') {
        const state = useMuseum.getState()
        if (state.activeLock) state.setActiveLock(null)
        else if (state.openedContainer) state.setOpenedContainer(null)
        return
      }

      if (!isUnclaimedInteractKey(event)) return
      if (interact()) event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    const unsubscribePrimaryAction = subscribePrimaryAction(interact, 200)
    return () => {
      unsubscribePrimaryAction()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useFrame((_, delta) => {
    const state = useMuseum.getState()
    // No focus survives under a modal: a focus frozen behind the journal is
    // how E reached through it, and how a prompt stayed over the keypad.
    if (isModalOpen(state)) {
      if (lastRef.current !== null || state.focusedContainer !== null) {
        lastRef.current = null
        state.setFocusedContainer(null)
      }
      return
    }

    const scan = scanRef.current
    scan.remaining -= delta
    if (!scan.initialised || scan.remaining <= 0) {
      scan.initialised = true
      scan.remaining = 0.5

      // Reuse the list and visit only effectively visible branches. Warmed
      // rooms remain mounted below `visible = false`, so checking only the
      // container group's own flag would make hidden cabinets targetable.
      const targets = targetsRef.current
      targets.length = 0
      scene.traverseVisible((object) => {
        if (object.name.startsWith('container:')) targets.push(object)
      })

      // three's Raycaster skips objects with `visible: false`, which would
      // also skip the interaction proxy. Force it back on for the ray while
      // keeping it out of the render by clearing its layers instead.
      for (const target of targets) {
        target.traverse((object) => {
          if (object instanceof Mesh && object.material && !object.visible) {
            object.visible = true
            object.layers.set(INTERACTION_LAYER)
          }
        })
      }
    }

    const targets = targetsRef.current
    if (targets.length === 0) {
      if (lastRef.current !== null) {
        lastRef.current = null
        state.setFocusedContainer(null)
      }
      return
    }

    raycaster.setFromCamera(CENTRE, camera)
    const hits = hitsRef.current
    hits.length = 0
    raycaster.intersectObjects(targets, true, hits)
    let hitIndex = 0
    while (hitIndex < hits.length && !isEffectivelyVisible(hits[hitIndex].object)) {
      hitIndex += 1
    }
    const hit = hits[hitIndex]
    const found = hit ? containerIdFor(hit.object) : null
    const distance = hit?.distance
    hits.length = 0

    // Every frame while something is focused, not only on a change of id:
    // the distance is what lets a nearer lamp take the key from a notebook
    // further along the same ray. The store skips writes that change nothing.
    if (found !== lastRef.current || found !== null) {
      lastRef.current = found
      state.setFocusedContainer(found, distance)
    }
  })

  return null
}
