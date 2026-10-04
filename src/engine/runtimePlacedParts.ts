/**
 * The kit recipes the runtime places by itself, with no line of content
 * naming them: what stands under a mounted exhibit, and the leaves hung in a
 * transition doorway.
 *
 * The content declares `mount: 'plinth'` and a doorway's `transitionDoor`;
 * which baked recipes those words become was written twice, once in the
 * component that draws them and once in the validator that counts a recipe
 * as used, with a comment on each side asking the other to keep up. A recipe
 * renamed on one side would then be drawn and reported as dead weight, or
 * reported as used and never drawn. Both now read these tables.
 *
 * Pure: no three, no React. Imported by the scene, by the doors, by the
 * content gate and by the navigation suite.
 */

import type { ExhibitMount, KitPartId, Portal } from '../content/schema'

/**
 * What a mount type puts UNDER an exhibit: `part` on the floor at the
 * exhibit's position, and `extra` (a glass hood) riding on it.
 *
 * Until this table existed nothing joined the content's mount to the bake's
 * plinth: every object sat at its authored height with nothing beneath it,
 * and read as an artefact floating in an empty room. The heights come from
 * the bake and have to agree with the `position.y` values in the content,
 * since the exhibit sits ON the mount (`exhibit-not-on-mount`).
 */
export const MOUNT_PARTS: Readonly<
  Record<ExhibitMount, { readonly part: KitPartId; readonly extra?: KitPartId } | null>
> = {
  plinth: { part: 'plinth-block' },
  'vitrine-table': { part: 'vitrine-table', extra: 'vitrine-glass' },
  // The tower is one authored assembly: carcass plus its namespaced glass.
  'vitrine-tower': { part: 'vitrine-tower' },
  wall: null,
  'case-wall': null,
  floor: null,
}

/** Every recipe a mount type draws, base first. */
export function mountPartNames(mount: ExhibitMount): readonly KitPartId[] {
  const parts = MOUNT_PARTS[mount]
  if (!parts) return []
  return parts.extra ? [parts.part, parts.extra] : [parts.part]
}

type TransitionDoorStyle = NonNullable<Portal['transitionDoor']>['style']

/** The leaf hung on each side of a doorway, by door style. */
export const TRANSITION_DOOR_LEAVES: Readonly<
  Record<TransitionDoorStyle, { readonly left: KitPartId; readonly right: KitPartId }>
> = {
  'double-panel': { left: 'door-leaf', right: 'door-leaf-right' },
}

/** Every recipe a door style draws. */
export function transitionDoorPartNames(style: TransitionDoorStyle): readonly KitPartId[] {
  const leaves = TRANSITION_DOOR_LEAVES[style]
  return [leaves.left, leaves.right]
}
