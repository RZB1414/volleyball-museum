/**
 * Archive cabinets — the physical home of the reading layer.
 *
 * Documents are the museum's optional depth. Keeping them in furniture rather
 * than on the wall is what lets a four-minute visitor skip them entirely while
 * a curious one is rewarded for opening things, which is the whole point of
 * having an archive layer at all.
 *
 * Reading one is a single press: no drawer animation, no inventory. The reward
 * for exploring should be the text, not a ceremony in front of it.
 */

import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Box3, Mesh, Raycaster, Vector2, Vector3, type Group, type Object3D } from 'three'

import type { BakedBundle } from '../content/bake.generated'
import { MUSEUM } from '../content/museum'
import type { ContainerData, RoomData, Vec3 } from '../content/schema'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import type { CollisionWorld } from './collision'
import { cloneKitPart, disposeKitPart, registerKitColliders } from './kitPart'
import type { MaterialLibrary } from './materials'
import {
  containerById,
  isContainerTaken,
  isNotebook,
  notebookAdvance,
  notebookPagesFor,
} from './notebook'
import { subscribePrimaryAction } from './primaryAction'
import { useMuseum } from '../state/store'
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
const REACH = 2.4

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
    if (!instance || !notebook) return null
    instance.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(instance)
    const centre = bounds.getCenter(new Vector3())
    const size = bounds.getSize(new Vector3())
    size.set(Math.max(size.x, 0.3), Math.max(size.y, 0.14), Math.max(size.z, 0.32))
    return {
      centre: centre.toArray() as [number, number, number],
      size: size.toArray() as [number, number, number],
    }
  }, [instance, notebook])

  // Reading the notebook is picking it up: it leaves the desk with the player.
  // Selected as the stable array and derived here, so the store's per-frame
  // touch writes do not rerun the lookup.
  const documentsRead = useMuseum((state) => state.progress.documentsRead)
  const taken = useMemo(
    () => isContainerTaken(MUSEUM, container, documentsRead),
    [container, documentsRead],
  )

  if (!instance) return null

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
        hits it, everything else ignores it.
      */}
      {proxy ? (
        <mesh position={proxy.centre} visible={false}>
          <boxGeometry args={proxy.size} />
          <meshBasicMaterial />
        </mesh>
      ) : (
        <mesh position={[0, 0.85, 0.12]} visible={false}>
          <boxGeometry args={[0.78, 1.7, 0.8]} />
          <meshBasicMaterial />
        </mesh>
      )}
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

      // Pressing E again while reading closes the panel, matching the exhibit
      // examine view — one key in, the same key out. A notebook turns its
      // pages first and closes from the last one.
      if (state.openedContainer) {
        const opened = containerById(MUSEUM, state.openedContainer)
        if (isNotebook(opened)) {
          const next = notebookAdvance(
            notebookPagesFor(MUSEUM, state.openedContainer).length,
            state.notebookPage,
          )
          if (next !== 'close') {
            state.setNotebookPage(next)
            return true
          }
        }
        state.setOpenedContainer(null)
        return true
      }
      if (state.activeLock) {
        state.setActiveLock(null)
        return true
      }
      // Exhibits win the key when both are under the crosshair — you are
      // reaching for the object, not the furniture behind it.
      if (
        state.examining ||
        state.focusedTransitionDoor ||
        state.focusedExhibit ||
        !state.focusedContainer
      ) {
        return false
      }

      /**
       * A locked cabinet opens its keypad instead of its contents.
       *
       * Once the lock is open it behaves like any other cabinet, so the drawer
       * stays readable afterwards rather than becoming a one-shot cutscene.
       */
      const container = MUSEUM.rooms
        .flatMap((room) => room.containers ?? [])
        .find((candidate) => candidate.id === state.focusedContainer)

      if (container?.lockId && !state.progress.locksOpened.includes(container.lockId)) {
        if (document.pointerLockElement) document.exitPointerLock()
        state.setActiveLock(container.lockId)
        return true
      }

      const documents = MUSEUM.documents.filter(
        (doc) => doc.containerId === state.focusedContainer,
      )
      for (const doc of documents) {
        state.recordDocument(doc.id)
        if (doc.revealsFactId) state.recordFact(doc.revealsFactId)
      }
      // A notebook is read with the mouse as well as with E: its page buttons
      // must be clickable, which they are not under pointer lock.
      if (isNotebook(container) && document.pointerLockElement) document.exitPointerLock()
      state.setOpenedContainer(state.focusedContainer)
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

      if (event.code !== 'KeyE') return
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
    if (state.examining || state.activeLock) return

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
    hits.length = 0

    if (found !== lastRef.current) {
      lastRef.current = found
      state.setFocusedContainer(found)
    }
  })

  return null
}
