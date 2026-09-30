import type {
  KitPartId,
  Portal,
  RoomData,
  WallSign,
  WayfindingPlaqueStyle,
} from '../content/schema'
import type { KitInstancePlacement } from './kitPart'

export const WAYFINDING_PLAQUE_WIDTH = 2.64
export const WAYFINDING_PLAQUE_HEIGHT = 0.66
export const WAYFINDING_TEXT_FACE_Z = 0.078
export const DEDICATION_TEXT_FACE_Z = 0.088

const PLAQUE_PART: Record<WayfindingPlaqueStyle, KitPartId> = {
  navy: 'wayfinding-plaque-navy',
  green: 'wayfinding-plaque-green',
  walnut: 'wayfinding-plaque-walnut',
}

export type DoorwaySignLayout = {
  readonly id: string
  readonly eyebrowKey?: string
  readonly titleKey: string
  readonly subtitleKey?: string
  readonly plaquePart: KitPartId
  readonly position: readonly [number, number, number]
  readonly rotationY: number
}

export type RoomSignageLayout = {
  readonly doorways: readonly DoorwaySignLayout[]
  readonly walls: readonly WallSign[]
  readonly placements: readonly KitInstancePlacement[]
}

function defaultPlaqueStyle(room: RoomData): WayfindingPlaqueStyle {
  if (room.palette === 'holyoke-gaslight') return 'navy'
  if (room.palette === 'office-tungsten') return 'green'
  return 'walnut'
}

/**
 * Places a panel against the nearest interior plaster face.
 *
 * Portal rotation is authored for traversal, while this is a wall-mount datum;
 * deriving the normal from the shell edge keeps signs correct if a future
 * opening reverses traversal or uses a differently-handed door.
 */
export function doorwaySignLayout(
  room: RoomData,
  portal: Portal,
  target: RoomData,
): DoorwaySignLayout | null {
  if (portal.sign === false) return null

  const override = portal.sign || undefined
  const wayfinding = target.wayfinding
  const [x, , z] = portal.position
  const gapToXWall = Math.abs(Math.abs(x) - room.shell.width / 2)
  const gapToZWall = Math.abs(Math.abs(z) - room.shell.depth / 2)
  const onXWall = gapToXWall <= gapToZWall
  const surfaceNudge = 0.136

  let position: readonly [number, number, number]
  let rotationY: number
  const centreY = Math.min(
    portal.height + 0.38,
    room.shell.height - 0.08 - WAYFINDING_PLAQUE_HEIGHT / 2,
  )

  if (onXWall) {
    const inward = x < 0 ? 1 : -1
    position = [x + inward * surfaceNudge, centreY, z]
    rotationY = inward > 0 ? Math.PI / 2 : -Math.PI / 2
  } else {
    const inward = z < 0 ? 1 : -1
    position = [x, centreY, z + inward * surfaceNudge]
    rotationY = inward > 0 ? 0 : Math.PI
  }

  const style =
    override?.plaqueStyle ?? wayfinding?.plaqueStyle ?? defaultPlaqueStyle(target)

  return {
    id: `${room.id}:${portal.id}`,
    eyebrowKey: override?.eyebrowKey ?? wayfinding?.eyebrowKey,
    titleKey: override?.titleKey ?? wayfinding?.titleKey ?? target.titleKey,
    subtitleKey: override?.subtitleKey ?? wayfinding?.subtitleKey,
    plaquePart: PLAQUE_PART[style],
    position,
    rotationY,
  }
}

/** Fits long localised names without shrinking short titles into timid copy. */
export function doorwayTitleFontSize(title: string): number {
  // Plex Sans Condensed still needs its tracking included in the fit. A more
  // optimistic width estimate let the Portuguese office name wrap into the
  // eyebrow even though the character-count test said it fitted.
  const estimatedWidthAtOneMetre = Math.max(1, title.length * 0.64)
  return Math.max(0.155, Math.min(0.285, 2.12 / estimatedWidthAtOneMetre))
}

export function buildRoomSignageLayout(
  room: RoomData,
  roomsById: ReadonlyMap<string, RoomData>,
): RoomSignageLayout {
  const doorways = room.portals.flatMap((portal) => {
    const target = roomsById.get(portal.toRoom)
    if (!target) return []
    const layout = doorwaySignLayout(room, portal, target)
    return layout ? [layout] : []
  })
  const walls = room.signage ?? []
  const placements: KitInstancePlacement[] = doorways.map((sign) => ({
    part: sign.plaquePart,
    position: sign.position,
    rotationY: sign.rotationY,
  }))

  for (const sign of walls) {
    if (sign.presentation !== 'dedication-plaque') continue
    placements.push({
      part: 'dedication-plaque',
      position: sign.position,
      rotationY: sign.rotationY,
    })
  }

  return { doorways, walls, placements }
}
