/** Runtime placement of the room kit declared by content data. */

import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import type { Group } from 'three'

import type { BakedBundle } from '../content/bake.generated'
import type { RoomData } from '../content/schema'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import type { CollisionWorld } from './collision'
import {
  createKitInstanceGroup,
  disposeKitInstanceGroup,
  registerKitColliders,
} from './kitPart'
import type { MaterialLibrary } from './materials'

/** Places every `kit` entry a room declares. */
export function KitLayer({
  room,
  kitBundle,
  materials,
  collision,
}: {
  room: RoomData
  kitBundle: BakedBundle
  materials: MaterialLibrary
  collision: CollisionWorld | null
}) {
  const { scene } = useGLTF(kitBundle.url, USE_DRACO, USE_MESHOPT)
  const placements = room.kit
  const kit = scene as Group
  const instances = useMemo(
    () => createKitInstanceGroup(kit, placements, materials),
    [kit, materials, placements],
  )

  useEffect(() => () => disposeKitInstanceGroup(instances), [instances])
  useEffect(() => {
    const disposers = placements.map((placement) =>
      registerKitColliders(kit, placement.part, kitBundle, collision, {
        roomOrigin: room.origin,
        position: placement.position,
        rotationY: placement.rotationY,
        scale: placement.scale,
      }),
    )

    return () => {
      for (const dispose of disposers) dispose()
    }
  }, [collision, kit, kitBundle, placements, room.origin])

  if (placements.length === 0) return null

  return (
    // The GLB owns geometry and materials; this primitive owns only instance
    // matrices, released explicitly above. `dispose={null}` prevents the R3F
    // reconciler from recursively invalidating cache-owned buffers on unmount.
    <primitive object={instances} dispose={null} />
  )
}
