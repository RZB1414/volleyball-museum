/**
 * Lines of sight across a room, and how large a thing looks from where the
 * player stands.
 *
 * Written for the "lighthouse" rule: a room that starts dark shows the player
 * its power control from the door they come in by. The plan first put the
 * Holyoke breaker at a spot that satisfied every number on paper, and the
 * browser showed the hero case standing exactly between the door and the
 * panel. So the rule is checked against what is in the room.
 *
 * An obstacle is the whole box of a placed recipe (kit, container or
 * exhibit), turned with its placement. That is stricter than the meshes: a
 * ray through the air above a kiosk's sloped top still counts as blocked. A
 * position that passes here passes in the browser; the reverse is not
 * promised, and a position that fails only by the box is moved rather than
 * argued with.
 */

import { Box3, PerspectiveCamera, Ray, Vector3 } from 'three'

import { BAKED_BUNDLES, type BakedBundle } from '../../src/content/bake.generated.ts'
import { MUSEUM } from '../../src/content/museum.ts'
import type { MuseumContent, RoomData } from '../../src/content/schema.ts'
import { cameraVerticalFovDegrees } from '../../src/engine/cameraProjection.ts'
import { recipeBounds } from './museumWorld.ts'

/** The reference viewport of every measurement in the plan: 1280 x 720 CSS pixels. */
export const REFERENCE_VIEWPORT = { width: 1280, height: 720 } as const

export type Obstacle = {
  readonly owner: string
  /** The recipe's box in its own frame. */
  readonly box: Box3
  /** Room-local placement. */
  readonly position: readonly number[]
  readonly rotationY: number
  readonly scale: number
}

/** Everything standing in a room that a line of sight could run into. */
export function roomObstacles(
  room: RoomData,
  content: MuseumContent = MUSEUM,
  bundles: readonly BakedBundle[] = BAKED_BUNDLES,
): Obstacle[] {
  const kit = bundles.find((bundle) => bundle.name === 'kit')
  const exhibits = bundles.find((bundle) => bundle.name === `exhibits-${room.id}`)
  const obstacles: Obstacle[] = []
  const add = (
    owner: string,
    recipe: string,
    bundle: BakedBundle | undefined,
    position: readonly number[],
    rotationY = 0,
    scale = 1,
  ) => {
    const bounds = recipeBounds(recipe, bundle)
    if (!bounds) return
    obstacles.push({
      owner,
      box: new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max)),
      position,
      rotationY,
      scale,
    })
  }

  room.kit.forEach((placement, index) =>
    add(`kit/${index}:${placement.part}`, placement.part, kit, placement.position, placement.rotationY, placement.scale),
  )
  for (const container of room.containers ?? []) {
    add(`container:${container.id}`, container.part, kit, container.position, container.rotationY)
  }
  for (const exhibitId of room.exhibitIds) {
    const exhibit = content.exhibits.find((candidate) => candidate.id === exhibitId)
    if (!exhibit) continue
    add(`exhibit:${exhibit.id}`, exhibit.recipe, exhibits, exhibit.position, exhibit.rotationY, exhibit.scale)
  }
  return obstacles
}

/** A room-local point in an obstacle's own frame (the inverse of its placement). */
function toObstacleFrame(point: Vector3, obstacle: Obstacle) {
  const cos = Math.cos(obstacle.rotationY)
  const sin = Math.sin(obstacle.rotationY)
  const x = point.x - obstacle.position[0]
  const z = point.z - obstacle.position[2]
  return new Vector3(
    (x * cos - z * sin) / obstacle.scale,
    (point.y - obstacle.position[1]) / obstacle.scale,
    (x * sin + z * cos) / obstacle.scale,
  )
}

/**
 * The obstacles the straight line from `from` to `to` passes through, both
 * room-local. The last centimetre before the target is not counted: a target
 * on the face of a wall fitting is not hidden by the fitting behind it.
 */
export function sightlineBlockers(from: Vector3, to: Vector3, obstacles: readonly Obstacle[]): string[] {
  const blockers: string[] = []
  for (const obstacle of obstacles) {
    const start = toObstacleFrame(from, obstacle)
    const end = toObstacleFrame(to, obstacle)
    const length = start.distanceTo(end)
    if (length < 1e-6) continue
    const ray = new Ray(start, end.clone().sub(start).divideScalar(length))
    const hit = ray.intersectBox(obstacle.box, new Vector3())
    if (!hit) continue
    if (start.distanceTo(hit) < length - 0.01 / obstacle.scale) blockers.push(obstacle.owner)
  }
  return blockers
}

/** Degrees between a heading and the direction from `eye` to `target`, in plan. */
export function bearingDegrees(eye: Vector3, heading: Vector3, target: Vector3) {
  const to = target.clone().sub(eye).setY(0).normalize()
  const ahead = heading.clone().setY(0).normalize()
  return (Math.acos(Math.min(1, Math.max(-1, to.dot(ahead)))) * 180) / Math.PI
}

/**
 * The width and height, in CSS pixels of the reference viewport, of the
 * screen rectangle that holds `points` for a camera at `eye` looking along
 * `heading`. Null when any point is behind the camera.
 */
export function projectedSize(
  eye: Vector3,
  heading: Vector3,
  points: readonly Vector3[],
  viewport: { readonly width: number; readonly height: number } = REFERENCE_VIEWPORT,
) {
  const aspect = viewport.width / viewport.height
  const camera = new PerspectiveCamera(cameraVerticalFovDegrees(aspect), aspect, 0.05, 200)
  camera.position.copy(eye)
  camera.lookAt(eye.clone().add(heading))
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()

  const xs: number[] = []
  const ys: number[] = []
  for (const point of points) {
    if (point.clone().applyMatrix4(camera.matrixWorldInverse).z >= 0) return null
    const ndc = point.clone().project(camera)
    xs.push(((ndc.x + 1) / 2) * viewport.width)
    ys.push(((1 - ndc.y) / 2) * viewport.height)
  }
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}
