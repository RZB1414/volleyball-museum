/**
 * Named-node surgery on a cloned container: the door that swings and what
 * stands behind it. Kept apart from the React layer, like `deviceNodes.ts`,
 * so a suite can run it on plain three objects in Node.
 *
 * The bake names the families a container's runtime addresses
 * (`<part>__door*`, `<part>__papers`); the content validator checks that
 * those names exist (`container-node-missing`), and these helpers are the
 * only code that knows how to find them.
 */

import { Group, type Object3D } from 'three'

import type { ContainerData } from '../content/schema'

export type ContainerDoor = NonNullable<ContainerData['door']>
type ContainerContents = NonNullable<ContainerData['contents']>

const DOOR_GROUP = 'container-door'
const CONTENTS_GROUP = 'container-contents'

/** Whether a node of a recipe belongs to its door: any family that begins with the prefix. */
export function isDoorNode(name: string, part: string, door: Pick<ContainerDoor, 'nodePrefix'>) {
  return name.startsWith(`${part}__${door.nodePrefix}`)
}

/** The node a `contents` entry names. */
export function contentsNodeName(part: string, entry: ContainerContents[number]) {
  return `${part}__${entry.node}`
}

/**
 * Gathers a container's door under a pivot on its hinge, and hands back the
 * pivot: turning it about +Y swings the door.
 *
 * Rotating a door node directly would turn it about its quantisation origin,
 * which the bake puts wherever meshopt needs it and never on the hinge. The
 * pivot sits on the hinge and each node keeps its own transform relative to
 * it, so with the pivot unturned nothing is anywhere but where the bake put
 * it. Idempotent, because StrictMode runs memos twice. Null for a recipe
 * with no such node.
 */
export function prepareContainerDoor(instance: Object3D, part: string, door: ContainerDoor): Group | null {
  const existing = instance.getObjectByName(DOOR_GROUP)
  if (existing instanceof Group) return existing

  const nodes = instance.children.filter((child) => isDoorNode(child.name, part, door))
  if (nodes.length === 0) return null
  const [x, z] = door.hingeAt
  const pivot = new Group()
  pivot.name = DOOR_GROUP
  pivot.position.set(x, 0, z)
  instance.add(pivot)
  for (const node of nodes) {
    node.position.x -= x
    node.position.z -= z
    pivot.add(node)
  }
  return pivot
}

/**
 * Gathers what stands behind the door under one group the runtime shows only
 * while the container is open.
 *
 * A group, not the meshes themselves: the targeting scan switches invisible
 * meshes back on for its ray layer, which would undo a mesh-level hide, and
 * rejects a hit under a hidden ancestor instead. The group sits at the
 * assembly's identity, so nothing moves. Idempotent; null when the recipe
 * has none of the nodes.
 */
export function prepareContainerContents(instance: Object3D, part: string, contents: ContainerContents): Group | null {
  const existing = instance.getObjectByName(CONTENTS_GROUP)
  if (existing instanceof Group) return existing

  const names = new Set(contents.map((entry) => contentsNodeName(part, entry)))
  const nodes = instance.children.filter((child) => names.has(child.name))
  if (nodes.length === 0) return null
  const group = new Group()
  group.name = CONTENTS_GROUP
  instance.add(group)
  for (const node of nodes) group.add(node)
  return group
}

/** Turns the door to an angle about its hinge, in radians about +Y; zero is shut. */
export function swingContainerDoor(pivot: Object3D | null, angle: number) {
  if (pivot) pivot.rotation.y = angle
}

/** What is behind the door is there to be seen with the container open, and not otherwise. */
export function showContainerContents(contents: Object3D | null, open: boolean) {
  if (contents) contents.visible = open
}

/** How long a door takes from shut to open. A safe's door is iron: it does not fly. */
export const CONTAINER_DOOR_SECONDS = 0.7

/**
 * Where a door is one frame later on its way to `target`: at a steady turn
 * that covers the whole `openAngle` in `CONTAINER_DOOR_SECONDS`, and never
 * past the target, however long the frame was (a tab that was hidden comes
 * back to a door that has arrived).
 */
export function doorAngleAfter(angle: number, target: number, openAngle: number, deltaSeconds: number) {
  const step = (Math.abs(openAngle) / CONTAINER_DOOR_SECONDS) * Math.max(0, deltaSeconds)
  const left = target - angle
  // A door with no swing to make is where it is told to be.
  if (openAngle === 0 || Math.abs(left) <= step) return target
  return angle + Math.sign(left) * step
}
