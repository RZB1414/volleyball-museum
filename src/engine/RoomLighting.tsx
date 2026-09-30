/**
 * Per-room lighting.
 *
 * The first version lit the whole museum with one directional light outside the
 * building. That does nothing: the rooms are closed boxes with ceilings, so the
 * ceiling simply shadows everything and the only illumination reaching the
 * floor was ambient plus the environment map — which is why every gallery read
 * flat and dim. An interior needs sources INSIDE it.
 *
 * The budget, from the performance plan:
 *   - 0 shadow-casting point lights, anywhere, ever. three renders SIX shadow
 *     passes per frame for each one, because a cube shadow map has six faces.
 *   - 0 shadow-casting local lights on the shared desktop/mobile path. The
 *     authored slice already approaches the mobile triangle target before a
 *     shadow pass, so even one broad spot would render most of a room twice.
 *   - <= 6 shadowless fill lights per retained room.
 *
 * The renderer sees one permanent eight-spot pool: six slots for the current
 * room and two for the short view through a moving doorway. Unused slots stay
 * mounted at intensity zero. The fixed count matters more than saving light
 * objects: changing it compiles shader variants during a doorway crossing.
 */

import { useEffect, useMemo, useRef } from 'react'
import type { Object3D, SpotLight } from 'three'

import { MUSEUM } from '../content/museum'
import type { RoomData } from '../content/schema'
import { useMuseum } from '../state/store'
import { buildGalleryLightRig } from './galleryLightRig'
import { isRoomPowered } from './power'

/** Warm gallery tungsten, cool daylight fill. */
const PALETTES: Record<
  string,
  { key: string; wash: string; pointIntensity?: number; washIntensity?: number }
> = {
  // Six perimeter tracks overlap over a dark-stained floor. Lower output keeps
  // the pools distinct and leaves the reconstructed gym in intentional shade,
  // like the reference, instead of bleaching every sepia print to cream.
  'holyoke-gaslight': {
    key: '#ffd49a',
    wash: '#e9a65f',
    pointIntensity: 60,
    washIntensity: 14,
  },
  'atrium-neutral': {
    key: '#ffd39b',
    wash: '#e6a35f',
    // The furnished perimeter needs enough vertical fill to read navy seating,
    // mesh dividers and dark walnut as separate materials. This remains below
    // the flat white-lobby look because the single wash is still much weaker
    // than the five focused keys and leaves the upper corners unresolved.
    pointIntensity: 60,
    washIntensity: 54,
  },
  // The green desk lamp is the office's practical key. House lighting only
  // supplies a dim tungsten envelope so the room keeps the reference's deep
  // corners instead of becoming another evenly washed gallery.
  'office-tungsten': {
    key: '#ffd093',
    wash: '#ffb96c',
    pointIntensity: 5,
    washIntensity: 16,
  },
}

const DEFAULT_PALETTE = PALETTES['atrium-neutral']
const ROOMS_BY_ID: ReadonlyMap<string, RoomData> = new Map(
  MUSEUM.rooms.map((room) => [room.id, room] as const),
)

type GallerySpotProps = {
  readonly position: [number, number, number]
  readonly target: [number, number, number]
  readonly color: string
  readonly intensity: number
  readonly distance: number
  readonly angle: number
  readonly penumbra: number
  readonly decay: number
}

/**
 * A spot target must belong to the scene graph.
 *
 * Mutating `light.target.position` alone leaves its matrix at the origin when
 * the target is not traversed by three. That made every authored gallery spot
 * silently aim at room centre. The explicit object also follows normal R3F
 * lifecycle and disappears with its room.
 */
function GallerySpot({ target, ...light }: GallerySpotProps) {
  const lightRef = useRef<SpotLight>(null)
  const targetRef = useRef<Object3D>(null)

  useEffect(() => {
    if (!lightRef.current || !targetRef.current) return
    lightRef.current.target = targetRef.current
    targetRef.current.updateMatrixWorld()
  }, [target])

  return (
    <>
      <object3D ref={targetRef} position={target} />
      <spotLight ref={lightRef} {...light} castShadow={false} />
    </>
  )
}

export function RoomLighting({
  primaryRoomId,
  retainedRoomId,
}: {
  primaryRoomId: string
  retainedRoomId: string | null
}) {
  const brightness = useMuseum((state) => state.settings.brightness)
  const poweredRoomIds = useMuseum((state) => state.progress.roomsPowered)
  const currentRoom = ROOMS_BY_ID.get(primaryRoomId) ?? MUSEUM.rooms[0]
  const retainedRoom = retainedRoomId ? ROOMS_BY_ID.get(retainedRoomId) ?? null : null
  const slots = useMemo(
    () => currentRoom
      ? buildGalleryLightRig(currentRoom, retainedRoom)
      : [],
    [currentRoom, retainedRoom],
  )

  return (
    <group>
      {slots.map((slot, index) => {
        const litRoom = ROOMS_BY_ID.get(slot.roomId)
        const powered = litRoom ? isRoomPowered(litRoom, poweredRoomIds) : false
        const palette = PALETTES[slot.palette] ?? DEFAULT_PALETTE
        const intensity =
          powered && slot.kind === 'key'
            ? (palette.pointIntensity ?? 36) * brightness * 1.25
            : powered && slot.kind === 'wash'
              ? (palette.washIntensity ?? 38) * brightness
              : 0

        return (
          <GallerySpot
            key={`gallery-light-slot-${index}`}
            position={slot.position}
            target={slot.target}
            color={slot.kind === 'wash' ? palette.wash : palette.key}
            intensity={intensity}
            distance={slot.distance}
            angle={slot.angle}
            penumbra={slot.penumbra}
            decay={slot.decay}
          />
        )
      })}

      {/* Environment and the single museum ambient provide navigation fill.
          A HemisphereLight is global even when nested under a room group, so
          one per visible room leaked palettes and changed exposure at doors. */}
    </group>
  )
}
