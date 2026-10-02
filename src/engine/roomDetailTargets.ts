import type { Object3D } from 'three'

const INTERACTION_TARGET_PREFIXES = [
  'exhibit:',
  'container:',
  'power-control:',
  'device:',
] as const
const INTERACTION_LAYER = 7
const BLOCK_DESCENDANT_RAYCAST: Object3D['raycast'] = () => false

type CachedTargetState = {
  readonly layerMask: number
  readonly raycast: Object3D['raycast']
}

/**
 * The parked state lives beside the object, not in its `userData`.
 *
 * R3F replaces `userData` wholesale whenever a component passes it as a prop
 * and re-renders, which a room's detail tree does on every portal or door
 * change. A cache kept there was wiped while the room was parked, so on the
 * way back nothing restored the raycast and the target stayed blind for good.
 */
const PARKED = new WeakMap<Object3D, CachedTargetState>()

function isInteractionTarget(object: Object3D) {
  return INTERACTION_TARGET_PREFIXES.some((prefix) => object.name.startsWith(prefix))
}

/**
 * Parks interaction without parking the thing the visitor is looking at.
 *
 * Raycaster r185 stops recursive traversal when an object's `raycast` returns
 * false. Keeping the named target on layer 7 therefore blocks every descendant
 * for the targeting systems while its ordinary meshes remain visible to the
 * camera. Tying render visibility to `currentRoom` made the destination's
 * exhibits, cabinets and power control appear only after crossing the doorway.
 */
export function syncRoomDetailTargets(root: Object3D, enabled: boolean) {
  let targets = 0
  root.traverse((object) => {
    if (!isInteractionTarget(object)) return
    targets += 1

    const cached = PARKED.get(object)
    if (enabled) {
      if (!cached) return
      object.layers.mask = cached.layerMask
      object.raycast = cached.raycast
      PARKED.delete(object)
      return
    }

    if (!cached) {
      PARKED.set(object, {
        layerMask: object.layers.mask,
        raycast: object.raycast,
      })
    }
    object.layers.enable(INTERACTION_LAYER)
    object.raycast = BLOCK_DESCENDANT_RAYCAST
  })
  return targets
}
