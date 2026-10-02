/**
 * Where every session begins: in the curator's office, back to the door and
 * facing the desk, with the notebook a step away.
 *
 * Its own module with no runtime imports, so the store can name the starting
 * room without dragging the whole content set into the title screen's bundle.
 * `museum.ts` re-exports it as `MUSEUM.spawn`, where the validator checks it.
 */

import type { SpawnData } from './schema'

export const SPAWN = {
  room: 'office',
  // Room-local: clear of the door's swept envelope behind and the two visitor
  // chairs ahead, on the open lane the navigation proof already walks.
  position: [-1.95, 0, -0.05],
  // Facing +X, across the visitor chairs to the desk and the stopped clock.
  yaw: -Math.PI / 2,
} as const satisfies SpawnData
