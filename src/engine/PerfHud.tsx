/**
 * Performance HUD and probe.
 *
 * `renderer.info` is the ground truth for every budget in the plan, and it is
 * cheap to read. Without it, the draw-call and triangle ceilings are decoration.
 *
 * Two jobs:
 *   - `?perf` renders a small overlay while playing.
 *   - `window.__museumPerf()` returns the same numbers on demand, so the build
 *     can be measured from outside the page. That matters here specifically:
 *     the agent working on this project cannot see the screen, so a machine-
 *     readable snapshot is the only way it perceives its own frame cost.
 *
 * It also exposes a one-shot `render()` because a browser tab that is not
 * compositing never fires requestAnimationFrame, so R3F's loop is stopped and
 * `info` would otherwise read all zeros.
 */

import { advance, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, Mesh, type Object3D } from 'three'

import { useMuseum } from '../state/store'

export type PerfSnapshot = {
  drawCalls: number
  triangles: number
  programs: number
  geometries: number
  textures: number
  meshesTotal: number
  meshesVisible: number
  fps: number
  currentRoom: string
  visibleRooms: string[]
  cameraPosition: [number, number, number]
}

declare global {
  interface Window {
    __museumPerf?: () => PerfSnapshot
    __museumRender?: () => void
    __museumTeleport?: (x: number, y: number, z: number, yaw?: number, pitch?: number) => void
    __museumScene?: () => {
      name: string
      visible: boolean
      position: number[]
      bounds: string
      material: string
      maps: string
      shading: string
    }[]
    __museumStep?: (frames?: number) => void
    __museumCollision?: (probeAt?: [number, number, number]) => Record<string, unknown>
  }
}

export function PerfHud() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  const frameTimesRef = useRef<number[]>([])
  const lastRef = useRef(performance.now())
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const overlayFrameRef = useRef(0)

  useEffect(() => {
    const countMeshes = () => {
      let total = 0
      let visible = 0
      scene.traverse((object: Object3D) => {
        if (!(object instanceof Mesh)) return
        total += 1
        // `visible` on the mesh is not enough — portal culling hides whole
        // room groups, so the ancestors have to be checked too.
        let node: Object3D | null = object
        let shown = true
        while (node) {
          if (!node.visible) {
            shown = false
            break
          }
          node = node.parent
        }
        if (shown) visible += 1
      })
      return { total, visible }
    }

    const read = (): PerfSnapshot => {
      const times = frameTimesRef.current
      const average = times.length
        ? times.reduce((sum, value) => sum + value, 0) / times.length
        : 0
      const { total, visible } = countMeshes()
      const { currentRoom, visibleRooms } = useMuseum.getState()

      return {
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        programs: gl.info.programs?.length ?? 0,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        meshesTotal: total,
        meshesVisible: visible,
        fps: average > 0 ? Math.round(1000 / average) : 0,
        currentRoom,
        visibleRooms,
        cameraPosition: [
          Number(camera.position.x.toFixed(2)),
          Number(camera.position.y.toFixed(2)),
          Number(camera.position.z.toFixed(2)),
        ],
      }
    }

    window.__museumPerf = read
    // A hidden tab produces no frames, so anything reading `info` without this
    // sees a stale or empty frame's worth of counters.
    window.__museumRender = () => gl.render(scene, camera)

    /**
     * Steps R3F's whole loop, not just the draw.
     *
     * `gl.render()` alone paints a frame but never runs any useFrame callback,
     * so the player controller, the portal walk and the interaction raycast all
     * stay frozen — teleporting the camera and then reading the counters
     * reports the visibility of wherever the player was BEFORE. `advance()`
     * drives the real subscription list, which is what makes an out-of-page
     * probe measure the same thing a player would see.
     */
    window.__museumStep = (frames = 1) => {
      let now = performance.now()
      for (let index = 0; index < frames; index += 1) {
        now += 1000 / 60
        advance(now)
      }
    }

    /**
     * Dumps every named mesh with its world position and effective visibility.
     * This is how an exhibit that silently failed to place gets caught — the
     * room still renders and the GLB still downloads, so nothing else in the
     * pipeline notices an empty plinth.
     */
    window.__museumScene = () => {
      const rows: {
        name: string
        visible: boolean
        position: number[]
        bounds: string
        material: string
        maps: string
        shading: string
      }[] = []
      scene.updateMatrixWorld(true)
      scene.traverse((object: Object3D) => {
        if (!(object instanceof Mesh) || !object.name) return
        let node: Object3D | null = object
        let shown = true
        while (node) {
          if (!node.visible) {
            shown = false
            break
          }
          node = node.parent
        }
        // Shading, not just placement. A prop can be in exactly the right spot
        // and still read as a black slab because it kept the raw glTF material
        // instead of the baked one — same failure mode as an unplaced exhibit,
        // but invisible to a position-only dump.
        const material = Array.isArray(object.material) ? object.material[0] : object.material

        // Where the mesh actually IS, not where its origin claims to be. A part
        // whose geometry is offset inside its own node sits somewhere the
        // position never mentions, and a part baked at the wrong scale reports
        // a perfectly correct position too. Both looked identical to a
        // position-only dump; both had already shipped once.
        const box = new Box3().setFromObject(object)
        const round = (n: number) => Number(n.toFixed(2))

        rows.push({
          name: object.name,
          visible: shown,
          position: object.getWorldPosition(object.position.clone()).toArray().map((n) => Number(n.toFixed(2))),
          bounds: box.isEmpty()
            ? 'empty'
            : `${round(box.min.x)},${round(box.min.y)},${round(box.min.z)} → ` +
              `${round(box.max.x)},${round(box.max.y)},${round(box.max.z)}`,
          material: material?.name || '(unnamed)',
          maps: [
            'map' in material && material.map ? 'albedo' : '',
            'normalMap' in material && material.normalMap ? 'normal' : '',
            'roughnessMap' in material && material.roughnessMap ? 'orm' : '',
          ]
            .filter(Boolean)
            .join('+') || 'none',
          shading:
            'metalness' in material
              ? `m${Number(material.metalness).toFixed(2)} r${Number(material.roughness).toFixed(2)} #${material.color.getHexString()}`
              : 'n/a',
        })
      })
      return rows
    }

    if (new URLSearchParams(window.location.search).has('perf')) {
      const overlay = document.createElement('div')
      overlay.id = 'museum-perf'
      overlay.className = 'perf-hud'
      overlay.setAttribute('role', 'status')
      document.body.append(overlay)
      overlayRef.current = overlay
    }

    return () => {
      delete window.__museumPerf
      delete window.__museumRender
      delete window.__museumScene
      delete window.__museumStep
      overlayRef.current?.remove()
      overlayRef.current = null
    }
  }, [gl, scene, camera])

  useFrame(() => {
    const now = performance.now()
    const elapsed = now - lastRef.current
    lastRef.current = now

    const times = frameTimesRef.current
    times.push(elapsed)
    if (times.length > 60) times.shift()

    overlayFrameRef.current += 1
    if (overlayRef.current && overlayFrameRef.current % 30 === 0) {
      const snapshot = window.__museumPerf?.()
      if (!snapshot) return

      const lines = [
        `draw calls ${snapshot.drawCalls} / 120 desktop · 45 mobile`,
        `triangles ${snapshot.triangles.toLocaleString('en-US')} / 350,000 desktop · 90,000 mobile`,
        `programs ${snapshot.programs} / 25`,
        `geometries ${snapshot.geometries} · textures ${snapshot.textures}`,
        `meshes ${snapshot.meshesVisible} / ${snapshot.meshesTotal} visible`,
        `room ${snapshot.currentRoom} · sees ${snapshot.visibleRooms.join(', ')}`,
        `${snapshot.fps} fps`,
      ]
      overlayRef.current.replaceChildren(
        ...lines.map((text, index) => {
          const line = document.createElement('div')
          line.textContent = text
          if (
            (index === 0 && snapshot.drawCalls > 120) ||
            (index === 1 && snapshot.triangles > 350_000)
          ) {
            line.className = 'is-over'
          }
          return line
        }),
      )
    }
  })

  return null
}
