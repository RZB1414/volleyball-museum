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
import { Mesh, Raycaster, Vector2, type Group, type Object3D } from 'three'

import { MUSEUM } from '../content/museum'
import type { ContainerData, RoomData } from '../content/schema'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import { cloneKitPart, disposeKitPart } from './kitPart'
import type { MaterialLibrary } from './materials'
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
  kitUrl,
  materials,
}: {
  room: RoomData
  kitUrl: string
  materials: MaterialLibrary
}) {
  const { scene } = useGLTF(kitUrl, USE_DRACO, USE_MESHOPT)
  const containers = room.containers ?? []

  if (containers.length === 0) return null

  return (
    <>
      {containers.map((container) => (
        <Container
          key={container.id}
          container={container}
          kit={scene as Group}
          materials={materials}
        />
      ))}
    </>
  )
}

function Container({
  container,
  kit,
  materials,
}: {
  container: ContainerData
  kit: Group
  materials: MaterialLibrary
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

  if (!instance) return null

  return (
    <group
      name={`container:${container.id}`}
      position={container.position as unknown as [number, number, number]}
      rotation={[0, container.rotationY ?? 0, 0]}
    >
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
      <mesh position={[0, 0.85, 0.12]} visible={false}>
        <boxGeometry args={[0.78, 1.7, 0.8]} />
        <meshBasicMaterial />
      </mesh>
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
  const rescanRef = useRef(0)
  const lastRef = useRef<string | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return

      if (event.code === 'Escape') {
        const state = useMuseum.getState()
        if (state.activeLock) state.setActiveLock(null)
        else if (state.openedContainer) state.setOpenedContainer(null)
        return
      }

      if (event.code !== 'KeyE') return
      const state = useMuseum.getState()

      // Pressing E again while reading closes the panel, matching the exhibit
      // examine view — one key in, the same key out.
      if (state.openedContainer) {
        state.setOpenedContainer(null)
        return
      }
      if (state.activeLock) {
        state.setActiveLock(null)
        return
      }
      // Exhibits win the key when both are under the crosshair — you are
      // reaching for the object, not the furniture behind it.
      if (state.examining || state.focusedExhibit || !state.focusedContainer) return

      event.preventDefault()

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
        return
      }

      const documents = MUSEUM.documents.filter(
        (doc) => doc.containerId === state.focusedContainer,
      )
      for (const doc of documents) {
        state.recordDocument(doc.id)
        if (doc.revealsFactId) state.recordFact(doc.revealsFactId)
      }
      state.setOpenedContainer(state.focusedContainer)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useFrame((_, delta) => {
    const state = useMuseum.getState()
    if (state.examining || state.activeLock) return

    rescanRef.current -= delta
    if (rescanRef.current <= 0 || targetsRef.current.length === 0) {
      rescanRef.current = 0.5
      const targets: Object3D[] = []
      scene.traverse((object) => {
        if (object.name.startsWith('container:') && object.visible) targets.push(object)
      })
      targetsRef.current = targets

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

    raycaster.setFromCamera(CENTRE, camera)
    const hit = raycaster.intersectObjects(targetsRef.current, true)[0]
    const found = hit ? containerIdFor(hit.object) : null

    if (found !== lastRef.current) {
      lastRef.current = found
      state.setFocusedContainer(found)
    }
  })

  return null
}
