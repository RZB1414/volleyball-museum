/**
 * Named-node surgery on a cloned device, kept apart from the React layer so
 * the opening tests can run it on plain three objects in Node.
 *
 * The bake names the families a device's runtime addresses (`__led`,
 * `__handset`); the content validator checks those names exist, and these
 * helpers are the only code that knows how to find them.
 */

import { Group, type Object3D } from 'three'

/**
 * Whether a node is one of a device's lenses: the `<part>__led` family, or
 * any `<part>__*-led` family such as the handset's display. Every lens of a
 * device shows the same thing, so the runtime paints them all at once.
 */
export function isLensNode(name: string, part: string) {
  return name === `${part}__led` || (name.startsWith(`${part}__`) && name.endsWith('-led'))
}

const HANDSET_GROUP = 'radio-handset'

/**
 * Gathers a radio's `<part>__handset*` nodes under one group the runtime can
 * hide when the player takes the handset, leaving the cradle on the desk.
 *
 * A group, not the meshes themselves: device targeting switches invisible
 * meshes back on for its ray layer, which would undo a mesh-level hide. The
 * group sits at the assembly's identity and each node keeps its own
 * transform — the compensation that undoes quantisation — so nothing moves.
 * Idempotent, because StrictMode runs memos twice.
 */
export function prepareHandset(instance: Object3D, part: string): Group | null {
  const existing = instance.getObjectByName(HANDSET_GROUP)
  if (existing instanceof Group) return existing

  const nodes = instance.children.filter((child) => child.name.startsWith(`${part}__handset`))
  if (nodes.length === 0) return null
  const handset = new Group()
  handset.name = HANDSET_GROUP
  instance.add(handset)
  for (const node of nodes) handset.add(node)
  return handset
}
