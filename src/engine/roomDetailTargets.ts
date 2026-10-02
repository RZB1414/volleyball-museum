import type { Object3D } from 'three'

const INTERACTION_TARGET_PREFIXES = [
  'exhibit:',
  'container:',
  'power-control:',
  'device:',
] as const
const TARGET_CACHE_KEY = '__museumWarmDetailTarget'
const INTERACTION_LAYER = 7
const BLOCK_DESCENDANT_RAYCAST: Object3D['raycast'] = () => false

type CachedTargetState = {
  readonly layerMask: number
  readonly raycast: Object3D['raycast']
}

function isInteractionTarget(object: Object3D) {
  return INTERACTION_TARGET_PREFIXES.some((prefix) => object.name.startsWith(prefix))
}

/**
 * Parks interaction without parking the thing the visitor is looking at.
 *
 * Raycaster r185 stops recursive traversal when an object's `raycast` returns
 * false. Keeping the named target on layer 7 therefore blocks every descendant
 * for the three targeting systems while its ordinary meshes remain visible to
 * the camera. Tying render visibility to `currentRoom` made the destination's
 * exhibits, cabinets and power control appear only after crossing the doorway.
 */
export function syncRoomDetailTargets(root: Object3D, enabled: boolean) {
  let targets = 0
  root.traverse((object) => {
    if (!isInteractionTarget(object)) return
    targets += 1

    const cached = object.userData[TARGET_CACHE_KEY] as CachedTargetState | undefined
    if (enabled) {
      if (!cached) return
      object.layers.mask = cached.layerMask
      object.raycast = cached.raycast
      delete object.userData[TARGET_CACHE_KEY]
      return
    }

    if (!cached) {
      object.userData[TARGET_CACHE_KEY] = {
        layerMask: object.layers.mask,
        raycast: object.raycast,
      } satisfies CachedTargetState
    }
    object.layers.enable(INTERACTION_LAYER)
    object.raycast = BLOCK_DESCENDANT_RAYCAST
  })
  return targets
}
