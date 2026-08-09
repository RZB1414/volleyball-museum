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
 *   - <= 8 shadowless fill lights per visible room.
 *
 * Lights are only mounted for rooms the portal walk says are visible, so the
 * per-frame light count tracks what is actually on screen rather than the size
 * of the building.
 */

import type { RoomData } from '../content/schema'
import { useMuseum } from '../state/store'
import { isRoomPowered } from './power'
import { useEffect, useRef } from 'react'
import type { Object3D, SpotLight } from 'three'

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
    pointIntensity: 52,
    washIntensity: 46,
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

export function RoomLighting({ room }: { room: RoomData }) {
  const brightness = useMuseum((state) => state.settings.brightness)
  const powered = useMuseum((state) => isRoomPowered(room, state.progress.roomsPowered))
  const palette = PALETTES[room.palette] ?? DEFAULT_PALETTE

  const { width, depth, height } = room.shell
  const [ox, oy, oz] = room.origin

  /**
   * Light and fitting share one content declaration. The head sits 14 cm below
   * the track; deriving the source here prevents invisible lights drifting away
   * from the geometry when a room is rearranged.
   */
  const ceilingLights = room.kit
    .map((placement, index) => ({ placement, index }))
    .filter(
      ({ placement }) =>
        placement.part === 'ceiling-spot' ||
        (placement.part === 'atrium-pin-pendant' && placement.lightTarget !== undefined),
    )
    .map(({ placement, index }) => {
      const sourceDrop =
        placement.part === 'atrium-pin-pendant'
          ? 1.2985 * (placement.scale ?? 1)
          : 0.14
      const target = placement.lightTarget ?? [
        placement.position[0] * 0.48,
        0.72,
        placement.position[2] * 0.92,
      ]
      return {
        key: `ceiling-spot-${index}`,
        position: [
          ox + placement.position[0],
          oy + placement.position[1] - sourceDrop,
          oz + placement.position[2],
        ] as [number, number, number],
        // Aim each head at its authored display. A point source fired half its
        // energy into the ceiling and made six giant white blobs.
        target: [ox + target[0], oy + target[1], oz + target[2]] as [number, number, number],
      }
    })

  // Inverse-square falloff needs more source intensity than the old synthetic
  // grid, while a finite reach keeps adjacent streamed rooms from being lit.
  const reach = Math.max(width, depth) * 0.95
  // Four fixtures overlap in the atrium. At 64 cd their inverse-square pools
  // merged into broad white reflections on the maple; 36 keeps the fittings
  // readable without pushing the varnish through the tone-mapper's shoulder.
  // Keep the lights mounted while they are off. Adding them only when the
  // breaker changes state recompiles every lit material with a new light-count
  // define at the exact moment the player interacts; zero intensity preserves
  // darkness without that visible shader hitch.
  const intensity = powered ? (palette.pointIntensity ?? 36) * brightness : 0

  return (
    <group>
      {/* Shadowless, focused track pools. */}
      {ceilingLights.map((light) => (
        <GallerySpot
          key={light.key}
          position={light.position}
          target={light.target}
          color={palette.key}
          intensity={intensity}
          distance={reach}
          angle={0.52}
          penumbra={0.72}
          decay={2}
        />
      ))}

      {/*
        A broad directional wash aimed down the room. It stays shadowless: the
        mobile path cannot afford a second traversal of almost every visible
        room, and baked bevels plus ambient occlusion retain contact cues.
      */}
      <GallerySpot
        position={[ox, oy + height - 0.4, oz - depth * 0.18]}
        target={[ox, oy, oz + depth * 0.1]}
        color={palette.wash}
        intensity={powered ? (palette.washIntensity ?? 38) * brightness : 0}
        distance={Math.max(width, depth) * 1.6}
        angle={0.95}
        penumbra={0.9}
        decay={1.4}
      />

      {/* Environment and the single museum ambient provide navigation fill.
          A HemisphereLight is global even when nested under a room group, so
          one per visible room leaked palettes and changed exposure at doors. */}
    </group>
  )
}
