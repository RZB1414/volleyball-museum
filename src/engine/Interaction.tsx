/**
 * Looking at things, and picking them up.
 *
 * Examine-to-rotate is the core verb of the whole museum, and the rule is
 * copied straight from Resident Evil: the game does not count an object as
 * catalogued unless the player actually TURNED IT OVER. The maker's mark, the
 * date stamp, the handwriting on the back of the photograph — the information
 * is on the reverse. That is what converts passive looking into active reading,
 * and it is the non-violent equivalent of an encounter.
 */

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Mesh,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
  type Object3D,
} from 'three'


import { MUSEUM } from '../content/museum'
import './bvhSetup'
import type { ExhibitData } from '../content/schema'
import { isModalOpen, useMuseum } from '../state/store'
import { INTERACTION_REACH, interactionWinnerOf } from './interactionTarget'
import { isUnclaimedInteractKey, subscribePrimaryAction } from './primaryAction'
import { hotspotGrant } from './progressGrants'

const CENTRE = new Vector2(0, 0)
/** How far the player can reach to examine something. */
const REACH = INTERACTION_REACH.exhibit

const exhibitsById = new Map<string, ExhibitData>(
  MUSEUM.exhibits.map((exhibit) => [exhibit.id, exhibit]),
)

/** Walks up the graph looking for the `exhibit:<id>` group a mesh belongs to. */
function exhibitIdFor(object: Object3D | null): string | null {
  let node = object
  while (node) {
    if (node.name.startsWith('exhibit:')) return node.name.slice('exhibit:'.length)
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
 * Casts from the centre of the screen every frame and publishes what the
 * crosshair is over.
 */
export function InteractionTargeting() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const raycaster = useMemo(() => {
    const instance = new Raycaster()
    instance.far = REACH
    // Ignore the vitrine glass — you should be able to target the object
    // inside a case, not the pane in front of it.
    instance.layers.enableAll()
    return instance
  }, [])

  const lastRef = useRef<string | null>(null)
  const targetsRef = useRef<Object3D[]>([])
  const hitsRef = useRef<ReturnType<Raycaster['intersectObjects']>>([])
  const scanRef = useRef({ initialised: false, remaining: 0 })

  useFrame((_, delta) => {
    const state = useMuseum.getState()
    // Every modal clears the focus, so nothing behind a reader or the
    // journal keeps a prompt on screen or answers the next E.
    if (isModalOpen(state)) {
      if (lastRef.current !== null || state.focusedExhibit !== null) {
        lastRef.current = null
        state.setFocusedExhibit(null)
      }
      return
    }

    /**
     * Cast against the EXHIBITS, not the scene.
     *
     * `intersectObjects(scene.children, true)` walks every room, every wall and
     * every floor — tens of thousands of triangles — on every frame, and the
     * only thing that can ever be a target is an object under an `exhibit:*`
     * group. Rebuilding that shortlist a few times a second and casting against
     * it is orders of magnitude cheaper and cannot be confused by architecture
     * standing between the player and a case.
     *
     * The list is rebuilt periodically rather than once, because rooms stream
     * in and out and the set changes.
     */
    const scan = scanRef.current
    scan.remaining -= delta
    if (!scan.initialised || scan.remaining <= 0) {
      scan.initialised = true
      scan.remaining = 0.5

      // Reuse the same array so an exhibit-free room has no per-frame garbage.
      // `traverseVisible` is important now that warmed adjacent rooms remain in
      // the graph below an invisible ancestor: those objects must not be
      // targetable through a portal or a hidden room shell.
      const targets = targetsRef.current
      targets.length = 0
      scene.traverseVisible((object) => {
        if (object.name.startsWith('exhibit:')) targets.push(object)
      })
    }

    const targets = targetsRef.current
    if (targets.length === 0) {
      if (lastRef.current !== null) {
        lastRef.current = null
        state.setFocusedExhibit(null)
      }
      return
    }

    raycaster.setFromCamera(CENTRE, camera)
    const hits = hitsRef.current
    hits.length = 0
    raycaster.intersectObjects(targets, true, hits)

    let found: string | null = null
    for (const hit of hits) {
      // A room may have become hidden since the most recent half-second scan.
      if (!isEffectivelyVisible(hit.object)) continue

      // Glass is see-through for the purposes of pointing at things.
      const material = (hit.object as Mesh).material
      const name = Array.isArray(material) ? material[0]?.name : material?.name
      if (name === 'glass-vitrine') continue

      found = exhibitIdFor(hit.object)
      break
    }
    // Do not keep the hit objects alive until the next frame. The array itself
    // is retained, but its references are not.
    hits.length = 0

    if (found !== lastRef.current) {
      lastRef.current = found
      state.setFocusedExhibit(found)
    }
  })

  return null
}

// ---------------------------------------------------------------------------
// Examine view
// ---------------------------------------------------------------------------

const HOLD_DISTANCE = 0.42
const ROTATE_SPEED = 0.008
/** How close to a hotspot's facing the camera must be to count as "seen". */
const HOTSPOT_DOT = 0.55

// Scratch vectors, reused every frame. Each one has a single meaning — an
// earlier version shared one between the camera and the object and had to
// re-read it mid-loop to undo the clobber, which is the kind of thing that
// works until someone adds a line between the two reads.
const cameraWorld = new Vector3()
const objectWorld = new Vector3()
const hotspotWorld = new Vector3()
const toCamera = new Vector3()
const outward = new Vector3()
const holdOffset = new Vector3()
const spin = new Quaternion()
const axis = new Vector3()

/**
 * Lifts the focused exhibit in front of the camera and lets the player turn it.
 *
 * The object is re-parented to a holder in front of the camera rather than the
 * camera flying to it: a museum visitor picks an object up, and moving the
 * camera into a display case looks like clipping through it.
 */
export function ExamineView() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)

  const holderRef = useRef<Object3D | null>(null)
  const originalParentRef = useRef<Object3D | null>(null)
  const originalTransformRef = useRef<{ position: Vector3; quaternion: Quaternion } | null>(null)
  const dragPointerRef = useRef<number | null>(null)
  const lastDragPointRef = useRef({ x: 0, y: 0 })
  const dragDeltaRef = useRef({ x: 0, y: 0 })
  const seenRef = useRef<Set<string>>(new Set())

  // --- input ----------------------------------------------------------------
  useEffect(() => {
    const interact = () => {
      const state = useMuseum.getState()
      if (state.examining) {
        state.setExamining(null)
        return true
      }
      if (isModalOpen(state)) return false
      const winner = interactionWinnerOf(state, MUSEUM)
      if (winner?.kind !== 'exhibit') return false

      // Examining takes the mouse back so the player can turn the object.
      if (document.pointerLockElement) document.exitPointerLock()
      state.setExamining(winner.id)
      return true
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      const state = useMuseum.getState()

      if (isUnclaimedInteractKey(event) && interact()) event.preventDefault()

      if (event.code === 'Escape' && state.examining) {
        state.setExamining(null)
      }
    }

    const resetDrag = () => {
      dragPointerRef.current = null
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!useMuseum.getState().examining || dragPointerRef.current !== null) return
      dragPointerRef.current = event.pointerId
      lastDragPointRef.current.x = event.clientX
      lastDragPointRef.current.y = event.clientY
    }
    const onPointerEnd = (event: PointerEvent) => {
      if (dragPointerRef.current === event.pointerId) resetDrag()
    }
    const onPointerMove = (event: PointerEvent) => {
      if (dragPointerRef.current !== event.pointerId) return
      // Safari historically reported zero or inconsistent movementX/Y for
      // touch pointers. Client-coordinate deltas work for mouse, Android and
      // iOS alike and keep a second finger from hijacking the held object.
      dragDeltaRef.current.x += event.clientX - lastDragPointRef.current.x
      dragDeltaRef.current.y += event.clientY - lastDragPointRef.current.y
      lastDragPointRef.current.x = event.clientX
      lastDragPointRef.current.y = event.clientY
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('blur', resetDrag)
    window.addEventListener('pagehide', resetDrag)
    const unsubscribePrimaryAction = subscribePrimaryAction(interact, 300)

    return () => {
      unsubscribePrimaryAction()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('blur', resetDrag)
      window.removeEventListener('pagehide', resetDrag)
    }
  }, [])

  useFrame(() => {
    const state = useMuseum.getState()
    const examining = state.examining

    // --- leaving the examine view ------------------------------------------
    if (!examining) {
      const held = holderRef.current
      if (held && originalParentRef.current && originalTransformRef.current) {
        originalParentRef.current.add(held)
        held.position.copy(originalTransformRef.current.position)
        held.quaternion.copy(originalTransformRef.current.quaternion)
        holderRef.current = null
        originalParentRef.current = null
        originalTransformRef.current = null
        seenRef.current = new Set()
      }
      return
    }

    const exhibit = exhibitsById.get(examining)
    if (!exhibit) return

    // --- entering the examine view ------------------------------------------
    if (!holderRef.current) {
      const group = scene.getObjectByName(`exhibit:${examining}`)
      if (!group) return

      originalParentRef.current = group.parent
      originalTransformRef.current = {
        position: group.position.clone(),
        quaternion: group.quaternion.clone(),
      }
      /**
       * Move the object to the SCENE root and drive it from the camera each
       * frame, rather than parenting it to the camera.
       *
       * R3F's default camera is not part of the scene graph, so anything added
       * as its child is never reached by the render traversal: the exhibit
       * vanished from its plinth (correctly) and then failed to appear in the
       * player's hands (not correctly), leaving an empty room and no object.
       */
      scene.add(group)
      holderRef.current = group
      seenRef.current = new Set(
        // Hotspots already discovered in a previous session stay discovered.
        useMuseum
          .getState()
          .progress.hotspots.filter((key) => key.startsWith(`${examining}:`))
          .map((key) => key.split(':')[1]),
      )
    }

    const held = holderRef.current
    if (!held) return

    // Hold it in front of the camera, in world space.
    camera.getWorldPosition(cameraWorld)
    camera.getWorldDirection(holdOffset)
    held.position.copy(cameraWorld).addScaledVector(holdOffset, HOLD_DISTANCE)

    // --- rotation -----------------------------------------------------------
    const drag = dragDeltaRef.current
    if (drag.x !== 0 || drag.y !== 0) {
      // Yaw about world up, pitch about the camera's right — this is what makes
      // dragging feel like turning something in your hands rather than
      // operating a turntable.
      axis.set(0, 1, 0)
      spin.setFromAxisAngle(axis, -drag.x * ROTATE_SPEED)
      held.quaternion.premultiply(spin)

      axis.set(1, 0, 0)
      spin.setFromAxisAngle(axis, -drag.y * ROTATE_SPEED)
      held.quaternion.premultiply(spin)

      drag.x = 0
      drag.y = 0
    }

    // --- hotspot discovery ---------------------------------------------------
    //
    // A hotspot counts as seen when its outward direction faces the camera.
    // Because the object is held in front of the camera, that means the player
    // physically rotated that face towards themselves.
    held.updateMatrixWorld(true)
    camera.getWorldPosition(cameraWorld)
    held.getWorldPosition(objectWorld)

    for (const hotspot of exhibit.hotspots) {
      if (seenRef.current.has(hotspot.id)) continue

      hotspotWorld.set(...hotspot.localPosition).applyMatrix4(held.matrixWorld)
      toCamera.copy(cameraWorld).sub(hotspotWorld).normalize()

      // The hotspot's outward normal, approximated by its offset from the
      // object's centre — good enough for objects that are roughly convex,
      // which every artefact in this museum is.
      outward.copy(hotspotWorld).sub(objectWorld).normalize()

      if (outward.dot(toCamera) > HOTSPOT_DOT) {
        seenRef.current.add(hotspot.id)
        // The detail, the fact it reveals and, with every required detail
        // seen, the catalogue entry: one write, decided by a pure function.
        // What the piece unlocks is not applied here. It is a trigger, which
        // fires once; this loop used to apply it again at every detail found
        // after the required ones.
        //
        // Read again for each detail, not taken from the top of the frame:
        // two details can show in one frame, and the second has to count the
        // first as seen.
        const museum = useMuseum.getState()
        museum.grant(hotspotGrant(exhibit, hotspot.id, museum.progress.hotspots))
      }
    }
  })

  return null
}
