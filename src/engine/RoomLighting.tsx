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
 *   - <= 2 shadow-casting spot lights per visible room.
 *   - <= 8 shadowless fill lights per visible room.
 *
 * Lights are only mounted for rooms the portal walk says are visible, so the
 * per-frame light count tracks what is actually on screen rather than the size
 * of the building.
 */

import { useMemo } from 'react'

import type { RoomData } from '../content/schema'
import { useMuseum } from '../state/store'

/** Warm gallery tungsten, cool daylight fill. */
const PALETTES: Record<string, { key: string; fill: string; wash: string }> = {
  'holyoke-gaslight': { key: '#ffdfae', fill: '#8fa4c4', wash: '#ffcf94' },
  'atrium-neutral': { key: '#fff0d8', fill: '#9fb4d6', wash: '#ffe6c2' },
  'office-tungsten': { key: '#ffd79a', fill: '#7f93b4', wash: '#ffc477' },
}

const DEFAULT_PALETTE = PALETTES['atrium-neutral']

export function RoomLighting({ room }: { room: RoomData }) {
  const brightness = useMuseum((state) => state.settings.brightness)
  const palette = PALETTES[room.palette] ?? DEFAULT_PALETTE

  const { width, depth, height } = room.shell
  const [ox, oy, oz] = room.origin

  /**
   * A grid of ceiling fittings, spaced so a gallery gets an even wash rather
   * than one hot spot in the middle. Count scales with floor area and is capped
   * at six so the eight-light budget still leaves room for accents.
   */
  const ceilingLights = useMemo(() => {
    const columns = Math.min(3, Math.max(1, Math.round(width / 6)))
    const rows = Math.min(3, Math.max(1, Math.round(depth / 6)))
    const lights: { key: string; position: [number, number, number] }[] = []

    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const x = ox + (width * (column + 0.5)) / columns - width / 2
        const z = oz + (depth * (row + 0.5)) / rows - depth / 2
        lights.push({
          key: `${column}-${row}`,
          // Hung below the ceiling so the fitting itself is lit from above too.
          position: [x, oy + height - 0.6, z],
        })
      }
    }

    return lights.slice(0, 6)
  }, [width, depth, height, ox, oy, oz])

  // Enough reach to cover the gap to the next fitting, with falloff that still
  // leaves the corners darker than the centre.
  const spacing = Math.max(width, depth) / 2
  const reach = spacing * 1.9
  const intensity = 14 * brightness * (spacing / 6)

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
          decay={1.6}
        />
      ))}

      {/*
        One shadow-casting spot aimed down the room. This is what gives the
        exhibits contact shadows and stops everything looking like it is
        floating a centimetre off the floor.
      */}
      <spotLight
        castShadow
        position={[ox, oy + height - 0.4, oz - depth * 0.18]}
        target-position={[ox, oy, oz + depth * 0.1]}
        color={palette.wash}
        intensity={38 * brightness}
        distance={Math.max(width, depth) * 1.6}
        angle={0.95}
        penumbra={0.9}
        decay={1.4}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0008}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={height * 2.2}
      />

      {/* Cool bounce from below, so shadowed faces are not dead black. */}
      <hemisphereLight
        position={[ox, oy + height * 0.5, oz]}
        color={palette.fill}
        groundColor="#3a3026"
        intensity={0.55 * brightness}
      />
    </group>
  )
}
