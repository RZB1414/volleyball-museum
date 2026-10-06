/**
 * A container's door, standing open, as something the player cannot walk
 * through.
 *
 * A container is solid by the collider of its recipe, registered once, and
 * that collider is the box with its door shut. The iron safe opens on a
 * hinge: its leaf, 72 cm of iron as tall as a chest, comes to rest across
 * the floor in front of it, between the last bookcase and the safe, and
 * stays there for the rest of the night. Nothing had made it solid. The
 * player walked through it in both directions, with the eye a hand above
 * its top edge, in the one room every session starts in.
 *
 * So an open door is given a box where it stands. The box is the leaf's own
 * node, by the bounds the bake wrote down for it, turned about the hinge by
 * the door's open angle: the very turn the component gives the pivot
 * (`containerNodes.ts`). Only the leaf: the brass on it stands proud of both
 * faces by less than a hand, and a collider that included it would reach
 * the places a player opens the safe from.
 *
 * It is there from the moment the lock opens, at the door's place of rest,
 * and not swept along with the 0.7 s of the swing. A capsule that stands
 * where the leaf comes to rest is pushed out of it like out of anything
 * else (`movePlayer`), which `npm run test:navigation` asks of every place
 * of the office.
 *
 * React-free, so the suites' world (`scripts/lib/museumWorld.ts`) places
 * the same box the game does.
 */

import { BoxGeometry, Matrix4, Quaternion, Vector3 } from 'three'

import type { BakedBundle } from '../content/bake.generated'
import type { ContainerData, Vec3 } from '../content/schema'
import { isDoorNode } from './containerNodes.ts'

const Y_AXIS = new Vector3(0, 1, 0)

type DoorContainer = Pick<ContainerData, 'part' | 'door' | 'position' | 'rotationY'>

/**
 * The leaf's box in the recipe's own space, door shut: the node the door's
 * prefix names, or, in a recipe that has no node of exactly that name, every
 * node of the door together. Null for a container with no door, or a recipe
 * with none of its nodes.
 */
export function containerDoorBox(
  container: Pick<ContainerData, 'part' | 'door'>,
  bundle: Pick<BakedBundle, 'parts'> | null | undefined,
): { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] } | null {
  const door = container.door
  if (!door || !bundle) return null
  const nodes = bundle.parts.filter((part) => isDoorNode(part.name, container.part, door))
  const leaf = nodes.filter((part) => part.name === `${container.part}__${door.nodePrefix}`)
  const parts = leaf.length > 0 ? leaf : nodes
  if (parts.length === 0) return null
  const along = (axis: 0 | 1 | 2, pick: (...values: number[]) => number, end: 'min' | 'max') =>
    pick(...parts.map((part) => part.bounds[end][axis]))
  return {
    min: [along(0, Math.min, 'min'), along(1, Math.min, 'min'), along(2, Math.min, 'min')],
    max: [along(0, Math.max, 'max'), along(1, Math.max, 'max'), along(2, Math.max, 'max')],
  }
}

/**
 * The open leaf as collision geometry and the matrix that puts it in the
 * world: the room, the container's placement, and the door's turn about its
 * hinge. Null when there is no door to stand open.
 */
export function openDoorSolid(
  container: DoorContainer,
  bundle: Pick<BakedBundle, 'parts'> | null | undefined,
  roomOrigin: Vec3,
): { readonly geometry: BoxGeometry; readonly matrix: Matrix4 } | null {
  const door = container.door
  const box = containerDoorBox(container, bundle)
  if (!door || !box) return null

  const geometry = new BoxGeometry(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2])
  geometry.translate((box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2)

  const [hingeX, hingeZ] = door.hingeAt
  // About the hinge: there, turned, and back. What `prepareContainerDoor`
  // does with a pivot group, as one matrix.
  const turn = new Matrix4()
    .makeTranslation(hingeX, 0, hingeZ)
    .multiply(new Matrix4().makeRotationY(door.openAngle))
    .multiply(new Matrix4().makeTranslation(-hingeX, 0, -hingeZ))
  const placement = new Matrix4().compose(
    new Vector3(...container.position),
    new Quaternion().setFromAxisAngle(Y_AXIS, container.rotationY ?? 0),
    new Vector3(1, 1, 1),
  )
  const matrix = new Matrix4().makeTranslation(...roomOrigin).multiply(placement).multiply(turn)
  return { geometry, matrix }
}
