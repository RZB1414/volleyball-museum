/**
 * The museum as the player's capsule meets it, for the headless suites.
 *
 * `test:navigation` built this world for itself: the real shells from the
 * real generator, the kit and container colliders from the bake manifest,
 * the real `movePlayer`. Two things were missing from it, and both let a
 * defect through. The power controls were not in it, so nothing ever walked
 * up to a breaker; and every atrium route began at a point in the middle of
 * the room where no session starts. The world lives here now so that the
 * power suite and the navigation suite walk the same building, from the
 * doors a player really arrives by.
 *
 * Nothing here is a second source of truth: positions come from `museum.ts`,
 * colliders from `bake.generated.ts`, the interaction volume from
 * `interactionProxy.ts`, the capsule and the eye from `playerPosition.ts`.
 */

import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from 'three'

import { BAKED_BUNDLES, type BakedBundle, type BakedPart } from '../../src/content/bake.generated.ts'
import { MUSEUM } from '../../src/content/museum.ts'
import type { MuseumContent, PowerControlData, RoomData, Vec3 } from '../../src/content/schema.ts'
import { nearestWallFace } from '../../src/content/validate.ts'
import { CollisionWorld, movePlayer, worldFromMeshes } from '../../src/engine/collision.ts'
import { INTERACTION_REACH, PROXY_MINIMUM } from '../../src/engine/interactionTarget.ts'
import { PROXY_MATERIAL_PROPS, paddedProxy } from '../../src/engine/interactionProxy.ts'
import { PLAYER_CAPSULE, PLAYER_EYE_HEIGHT } from '../../src/engine/playerPosition.ts'
import { buildTransitionDoorSpecs } from '../../src/engine/transitionDoorTopology.ts'
// @ts-expect-error - the bake is plain JS with no type declarations.
import { buildRoomShell, prepareRoomShells } from '../bake/kit.mjs'

export const CAPSULE = PLAYER_CAPSULE
export const EYE_HEIGHT = PLAYER_EYE_HEIGHT
export const STEP = 1 / 60
/** A walking pace, below the controller's top speed: the suites never sprint. */
export const WALK_SPEED = 2.6
/** How far inside the doorway a player stands once the door has let them in. */
export const ARRIVAL_DEPTH = 0.95
/** Within this of the plaster, a control is on that wall (the validator's reach). */
const WALL_REACH = 0.35

export type Placement = {
  readonly part: string
  readonly position: Vec3
  readonly rotationY?: number
  readonly scale?: number
}

type Bounds = { readonly min: readonly number[]; readonly max: readonly number[] }

const kitOf = (bundles: readonly BakedBundle[]) => bundles.find((bundle) => bundle.name === 'kit')

/** Every baked node of a recipe: the root and its `recipe__family` siblings. */
export function recipeParts(recipe: string, bundle: BakedBundle | undefined): readonly BakedPart[] {
  return (bundle?.parts ?? []).filter(
    (part) => part.name === recipe || part.name.startsWith(`${recipe}__`),
  )
}

/** The box that holds a whole recipe, in its own frame. */
export function recipeBounds(recipe: string, bundle: BakedBundle | undefined): Bounds | null {
  const parts = recipeParts(recipe, bundle)
  if (parts.length === 0) return null
  return {
    min: [0, 1, 2].map((axis) => Math.min(...parts.map((part) => part.bounds.min[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...parts.map((part) => part.bounds.max[axis]))),
  }
}

export function colliderPartsFor(part: string, bundles: readonly BakedBundle[] = BAKED_BUNDLES) {
  return recipeParts(part, kitOf(bundles)).filter((candidate) => candidate.collider)
}

function addColliders(meshes: Mesh[], room: RoomData, placement: Placement, bundles: readonly BakedBundle[]) {
  for (const part of colliderPartsFor(placement.part, bundles)) {
    if (!part.collider) continue
    const [hx, hy, hz] = part.collider.halfExtents
    const geometry = new BoxGeometry(hx * 2, hy * 2, hz * 2)
    geometry.translate(...part.collider.centre)

    const mesh = new Mesh(geometry, new MeshBasicMaterial())
    mesh.name = `${room.id}__${part.name}__collider`
    mesh.position.set(
      room.origin[0] + placement.position[0],
      room.origin[1] + placement.position[1],
      room.origin[2] + placement.position[2],
    )
    mesh.rotation.y = placement.rotationY ?? 0
    mesh.scale.setScalar(placement.scale ?? 1)
    meshes.push(mesh)
  }
}

/**
 * Everything solid, placed as the runtime places it: the shells, then every
 * kit placement, container and power control that the manifest gives a
 * collider. A recipe with no collider (a desk lamp, a ceiling spot) adds
 * nothing, exactly as in the game.
 */
export function buildMuseumWorld(
  content: MuseumContent = MUSEUM,
  bundles: readonly BakedBundle[] = BAKED_BUNDLES,
): CollisionWorld {
  const prepared = prepareRoomShells(content.rooms) as (Pick<RoomData, 'id'> & object)[]
  const preparedById = new Map(prepared.map((room) => [room.id, room]))
  const meshes: Mesh[] = []

  for (const room of content.rooms) {
    const shell = preparedById.get(room.id)
    if (!shell) throw new Error(`no prepared shell for room "${room.id}"`)
    for (const part of buildRoomShell(shell) as { name: string; geometry: never }[]) {
      const mesh = new Mesh(part.geometry, new MeshBasicMaterial())
      mesh.name = part.name
      mesh.position.set(room.origin[0], room.origin[1], room.origin[2])
      meshes.push(mesh)
    }

    for (const placement of room.kit) addColliders(meshes, room, placement, bundles)
    for (const container of room.containers ?? []) addColliders(meshes, room, { ...container, scale: 1 }, bundles)
    if (room.powerControl) addColliders(meshes, room, room.powerControl, bundles)
  }
  return worldFromMeshes(meshes)
}

export function roomOf(roomId: string, content: MuseumContent = MUSEUM): RoomData {
  const room = content.rooms.find((candidate) => candidate.id === roomId)
  if (!room) throw new Error(`no room "${roomId}"`)
  return room
}

/** A room-local floor point, in world space. */
export function roomPoint(roomId: string, x: number, z: number, content: MuseumContent = MUSEUM) {
  const room = roomOf(roomId, content)
  return new Vector3(room.origin[0] + x, room.origin[1], room.origin[2] + z)
}

// ---------------------------------------------------------------------------
// Where the player arrives
// ---------------------------------------------------------------------------

export type Arrival = {
  /** The portal of THIS room the player walks in through; null in the spawn room. */
  readonly portalId: string | null
  /** Room-local floor point: `ARRIVAL_DEPTH` inside the doorway, or the spawn. */
  readonly local: readonly [number, number]
  /** Unit heading into the room, [x, z]. */
  readonly heading: readonly [number, number]
}

/**
 * The door each room is first reached by, walking from the spawn.
 *
 * Breadth first over the portals in authored order, and a door that only
 * opens from the far side is not walked through: the atrium is reached from
 * the office, the Holyoke wing by its main door and never by its shortcut.
 */
export function arrivals(content: MuseumContent = MUSEUM): ReadonlyMap<string, Arrival> {
  const doors = buildTransitionDoorSpecs(content.rooms)
  const result = new Map<string, Arrival>()
  const spawnYaw = content.spawn.yaw
  result.set(content.spawn.room, {
    portalId: null,
    local: [content.spawn.position[0], content.spawn.position[2]],
    // three's camera looks down -Z; a yaw turns that to (-sin, 0, -cos).
    heading: [-Math.sin(spawnYaw), -Math.cos(spawnYaw)],
  })

  const queue = [content.spawn.room as string]
  while (queue.length > 0) {
    const room = roomOf(queue.shift() as string, content)
    for (const portal of room.portals) {
      if (result.has(portal.toRoom)) continue
      const door = doors.find(
        (candidate) =>
          candidate.id === portal.id ||
          (candidate.reciprocalPortalId === portal.id && candidate.otherRoomId === room.id),
      )
      if (door?.opensFrom && door.opensFrom !== room.id) continue

      const target = roomOf(portal.toRoom, content)
      const here = [room.origin[0] + portal.position[0], room.origin[2] + portal.position[2]]
      const facing = target.portals.find(
        (candidate) =>
          candidate.toRoom === room.id &&
          Math.hypot(
            target.origin[0] + candidate.position[0] - here[0],
            target.origin[2] + candidate.position[2] - here[1],
          ) < 0.5,
      )
      if (!facing) continue
      // A portal's own +Z points into its room.
      const heading: [number, number] = [Math.sin(facing.rotationY), Math.cos(facing.rotationY)]
      result.set(target.id, {
        portalId: facing.id,
        local: [
          facing.position[0] + heading[0] * ARRIVAL_DEPTH,
          facing.position[2] + heading[1] * ARRIVAL_DEPTH,
        ],
        heading,
      })
      queue.push(target.id)
    }
  }
  return result
}

export function arrivalOf(roomId: string, content: MuseumContent = MUSEUM): Arrival {
  const arrival = arrivals(content).get(roomId)
  if (!arrival) throw new Error(`room "${roomId}" is not reached from the spawn`)
  return arrival
}

/** Where the capsule stands, in world space, on arriving in a room. */
export function arrivalPoint(roomId: string, content: MuseumContent = MUSEUM) {
  const arrival = arrivalOf(roomId, content)
  return roomPoint(roomId, arrival.local[0], arrival.local[1], content)
}

// ---------------------------------------------------------------------------
// Walking
// ---------------------------------------------------------------------------

/**
 * Holds forward for `seconds`, as a player leaning on W does, and returns
 * where the capsule ended: against whatever stopped it. `direction` is a
 * fixed heading, or a function of where the capsule is for a player who
 * keeps something in the middle of the screen while walking.
 */
export function walkUntilStopped(
  world: CollisionWorld,
  from: Vector3,
  direction: Vector3 | ((position: Vector3) => Vector3),
  seconds = 4,
) {
  const position = from.clone()
  const stride = new Vector3()
  let verticalVelocity = 0
  for (let elapsed = 0; elapsed < seconds; elapsed += STEP) {
    stride
      .copy(typeof direction === 'function' ? direction(position) : direction)
      .setY(0)
      .normalize()
      .multiplyScalar(WALK_SPEED * STEP)
    const result = movePlayer(world, position, stride, verticalVelocity, STEP, CAPSULE)
    position.copy(result.position)
    verticalVelocity = result.verticalVelocity
  }
  return position
}

// ---------------------------------------------------------------------------
// Power controls: where they are, and whether E reaches them
// ---------------------------------------------------------------------------

/** Whether a control is fixed to a wall rather than standing on furniture. */
export function isWallControl(room: RoomData, control: PowerControlData) {
  return nearestWallFace(room, control.position).gap <= WALL_REACH
}

/** A point given in the control's own frame, in world space. */
export function controlPoint(room: RoomData, control: PowerControlData, local: readonly number[]) {
  const rotation = control.rotationY ?? 0
  const scale = control.scale ?? 1
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return new Vector3(
    room.origin[0] + control.position[0] + scale * (local[0] * cos + local[2] * sin),
    room.origin[1] + control.position[1] + scale * local[1],
    room.origin[2] + control.position[2] + scale * (-local[0] * sin + local[2] * cos),
  )
}

/** The way a wall control faces: its own +Z, in world space. */
export function controlNormal(control: PowerControlData) {
  const rotation = control.rotationY ?? 0
  return new Vector3(Math.sin(rotation), 0, Math.cos(rotation))
}

/**
 * The interaction volume of a control, as `PowerControls.tsx` mounts it: the
 * recipe's box padded to the minimum, under the wrapper group that carries
 * the placement, with the material every proxy shares.
 */
export function powerControlProxy(
  room: RoomData,
  control: PowerControlData,
  bundles: readonly BakedBundle[] = BAKED_BUNDLES,
) {
  const bounds = recipeBounds(control.part, kitOf(bundles))
  if (!bounds) throw new Error(`recipe "${control.part}" is not baked`)
  const proxy = paddedProxy(
    new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max)),
    PROXY_MINIMUM.powerControl,
  )
  const wrapper = new Group()
  wrapper.position.set(
    room.origin[0] + control.position[0],
    room.origin[1] + control.position[1],
    room.origin[2] + control.position[2],
  )
  wrapper.rotation.y = control.rotationY ?? 0
  wrapper.scale.setScalar(control.scale ?? 1)
  const mesh = new Mesh(new BoxGeometry(...proxy.size), new MeshBasicMaterial(PROXY_MATERIAL_PROPS))
  mesh.position.set(...proxy.centre)
  wrapper.add(mesh)
  wrapper.updateMatrixWorld(true)
  return { wrapper, mesh, proxy }
}

/** Whether a world point lies inside a proxy's box. */
export function proxyContains(mesh: Mesh, point: Vector3) {
  const local = mesh.worldToLocal(point.clone())
  mesh.geometry.computeBoundingBox()
  return (mesh.geometry.boundingBox as Box3).containsPoint(local)
}

/** The centre-of-screen ray the power targeting casts, against one proxy. */
export function centreRayHit(mesh: Mesh, eye: Vector3, direction: Vector3) {
  const raycaster = new Raycaster(eye, direction.clone().normalize(), 0, INTERACTION_REACH.powerControl)
  return raycaster.intersectObject(mesh, false)[0] ?? null
}

export type ControlReach = {
  /** Where the capsule's foot stopped, world space. */
  readonly stopped: Vector3
  /** How far the capsule's axis stopped from the control's back plane. */
  readonly standOff: number
  /** Distance of the centre ray's hit on the proxy, or null if it missed. */
  readonly hitDistance: number | null
  readonly eyeInsideProxy: boolean
}

/**
 * A player who has seen the control: from `from` (or from 1.3 m straight in
 * front of it) they keep it in the centre of the screen and hold forward
 * until something stops the capsule, then press E. The answer is the question
 * the game asks every frame: does the ray from the centre of the screen,
 * camera level, hit the control's interaction volume?
 *
 * The heading follows the control, as a player's does. A heading fixed at the
 * start arrives a few degrees oblique, and four seconds of leaning on W then
 * slide the capsule along the face of a 46 cm box and off its far edge: true
 * of any small thing on a wall, and not what is being asked here.
 *
 * `seconds` is how long they hold forward: four from a step away, longer
 * for a walk across a room.
 */
export function reachFromWhereTheCapsuleStops(
  world: CollisionWorld,
  room: RoomData,
  control: PowerControlData,
  from?: Vector3,
  seconds = 4,
): ControlReach {
  const normal = controlNormal(control)
  const { mesh } = powerControlProxy(room, control)
  const target = mesh.getWorldPosition(new Vector3())
  const start =
    from ??
    controlPoint(room, control, [0, 0, 0])
      .addScaledVector(normal, 1.3)
      .setY(room.origin[1])
  const facing = (position: Vector3) => target.clone().sub(position).setY(0).normalize()
  const stopped = walkUntilStopped(world, start, facing, seconds)
  const eye = stopped.clone().setY(stopped.y + EYE_HEIGHT)
  const hit = centreRayHit(mesh, eye, facing(stopped))
  const back = controlPoint(room, control, [0, 0, 0])
  return {
    stopped,
    standOff: stopped.clone().sub(back).dot(normal),
    hitDistance: hit ? hit.distance : null,
    eyeInsideProxy: proxyContains(mesh, eye),
  }
}
