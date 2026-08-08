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

/** Warm gallery tungsten, cool daylight fill. */
const PALETTES: Record<string, { key: string; wash: string }> = {
  'holyoke-gaslight': { key: '#ffdfae', wash: '#ffcf94' },
  'atrium-neutral': { key: '#fff0d8', wash: '#ffe6c2' },
  'office-tungsten': { key: '#ffd79a', wash: '#ffc477' },
}

const DEFAULT_PALETTE = PALETTES['atrium-neutral']

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
    .filter(({ placement }) => placement.part === 'ceiling-spot')
    .map(({ placement, index }) => ({
      key: `ceiling-spot-${index}`,
      position: [
        ox + placement.position[0],
        oy + placement.position[1] - 0.14,
        oz + placement.position[2],
      ] as [number, number, number],
    }))

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
  const intensity = powered ? 36 * brightness : 0

  return (
    <group>
      {/*
        Shadowless fill. Shadows here would be six render passes each and would
        fight the wall-washers for no visual gain — the geometry that needs to
        cast is the exhibits, and that is the accent spot's job.
      */}
      {ceilingLights.map((light) => (
        <pointLight
          key={light.key}
          position={light.position}
          color={palette.key}
          intensity={intensity}
          distance={reach}
          decay={2}
          castShadow={false}
        />
      ))}

      {/*
        A broad directional wash aimed down the room. It stays shadowless: the
        mobile path cannot afford a second traversal of almost every visible
        room, and baked bevels plus ambient occlusion retain contact cues.
      */}
      <spotLight
        castShadow={false}
        position={[ox, oy + height - 0.4, oz - depth * 0.18]}
        target-position={[ox, oy, oz + depth * 0.1]}
        color={palette.wash}
        intensity={powered ? 38 * brightness : 0}
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
