/**
 * The plan of the museum, as data.
 *
 * The component used to decide what to draw while it drew, and what it drew
 * was the building: every room in outline whether walked or not, every
 * doorway, and the service shortcut before the player had found it. A plan
 * that shows what the player has not seen is a spoiler; one that hides what
 * they have seen sends them to take notes on paper. So what is on the plan is
 * decided here, by a function of the content, the save and where the player
 * stands, and `MuseumMap.tsx` only draws what comes back.
 *
 * The rules (docs/PLANO-ATE-O-FINAL.md, 8.7), each held by `npm run test:map`:
 *
 *   - a room is on the plan once visited, and never before;
 *   - a doorway is on the plan once one of its two rooms is, once per
 *     opening; where the room beyond has not been visited there is a short
 *     stub and a "?", which is all the plan says about it;
 *   - a door that opens from one side only is not on the plan, from either
 *     side, until it has been opened; after that it is a door like the rest.
 *     There is no state of a door "seen", and it is not worth one;
 *   - a lock is listed once touched and until opened (`pendingLocks`);
 *   - the marker faces the way the camera does, and north is up;
 *   - a room is dark, lit with something left to do, or complete, and the
 *     three differ by pattern AND by colour: colour alone is no difference to
 *     a colour-blind player, nor to anybody on a phone in the sun.
 *
 * Pure: no React, no store, and the museum is a parameter. That is what lets
 * the suite ask about houses and saves no session has been in.
 */

import type { TranslationKey } from '../content/i18n/pt-BR'
import type { MuseumContent, Portal, RoomData } from '../content/schema'
import { pendingLocks } from '../engine/lockRules.ts'
import { isRoomPowered } from '../engine/power.ts'
import type { Progress } from '../state/progressFields.ts'
import { portalOpening, type MapSegment } from './mapGeometry.ts'

/** Metres to SVG units. The whole museum is ~40 m across. */
const SCALE = 10
const PADDING = 24
/** How far the stub of a door runs into the room nobody has visited, in metres. */
const STUB_METRES = 1.2
/** From the end of the stub to the middle of its "?", in SVG units. */
const STUB_MARK_GAP = 7
/**
 * Two portals are the two faces of one opening when they stand this close:
 * back-to-back rooms put them a wall's thickness apart. The figure is the one
 * `buildTransitionDoorSpecs` pairs a door with its reciprocal by.
 */
const SAME_OPENING_METRES = 0.35

export type MapRoomState = 'unpowered' | 'partial' | 'complete'
export type MapPattern = 'dashed' | 'hatched' | 'solid'

/**
 * Pattern AND colour: no two states share either.
 *
 * Grey dashes for a room with no light, amber hatching for one that is lit
 * and has something left, solid blue for one that is done. Amber is the
 * state that sends the player back, so it is the one with the busiest
 * pattern.
 */
export const MAP_STATE_STYLE: Record<MapRoomState, { readonly pattern: MapPattern; readonly colour: string }> = {
  unpowered: { pattern: 'dashed', colour: '#8b8d94' },
  partial: { pattern: 'hatched', colour: '#c39a4e' },
  complete: { pattern: 'solid', colour: '#5d87a8' },
}

/** What the legend calls each state. */
export const MAP_STATE_LABEL: Record<MapRoomState, TranslationKey> = {
  unpowered: 'map.state.unlit',
  partial: 'map.state.partial',
  complete: 'map.state.complete',
}

/** The states in the order the legend lists them: the order a room goes through them. */
export const MAP_STATES: readonly MapRoomState[] = ['unpowered', 'partial', 'complete']

export type MapModel = {
  readonly width: number
  readonly height: number
  /** Visited rooms only, in the order of the content. */
  readonly rooms: readonly {
    readonly id: string
    readonly titleKey: string
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
    readonly state: MapRoomState
    readonly current: boolean
    /** Pieces of this room not yet catalogued, where they stand. */
    readonly pips: readonly { readonly id: string; readonly x: number; readonly y: number }[]
  }[]
  /** One per physical opening with a visited side; a one-way door only once released. */
  readonly doors: readonly {
    /**
     * For React, and nothing else. Not a portal's id: `atrium-to-holyoke`
     * would name the wing on the plan of a player who has not been there.
     */
    readonly key: string
    readonly gap: MapSegment
    /** How deep the gap is painted: through one wall line, or through both rooms'. */
    readonly depth: number
    readonly jambs: readonly [MapSegment, MapSegment]
    /** The room beyond has not been visited: a short line outwards, and where its "?" stands. */
    readonly stub: { readonly line: MapSegment; readonly x: number; readonly y: number } | null
  }[]
  /** Touched and still shut. */
  readonly locks: readonly { readonly id: string; readonly labelKey: string }[]
  /** Degrees clockwise from north, for an SVG `rotate`. */
  readonly player: { readonly x: number; readonly y: number; readonly headingDegrees: number }
  /** Where the rose is drawn: north is up the page. */
  readonly north: { readonly x: number; readonly y: number }
}

type FramedRoom = Pick<RoomData, 'origin' | 'shell'>

/**
 * The sheet the plan is drawn on, and where a point of the world falls on it.
 *
 * Fixed over every room of the build, visited or not: a frame that grew with
 * the visit would rescale the plan under the player at every new door. What
 * the empty margin gives away is that there is more building, and the "?" at
 * a door already says that.
 *
 * World +X is right and world +Z is down, so north (-Z, `museum.ts`) is up.
 */
export function mapFrame(rooms: readonly FramedRoom[]) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const room of rooms) {
    const [x, , z] = room.origin
    minX = Math.min(minX, x - room.shell.width / 2)
    maxX = Math.max(maxX, x + room.shell.width / 2)
    minZ = Math.min(minZ, z - room.shell.depth / 2)
    maxZ = Math.max(maxZ, z + room.shell.depth / 2)
  }
  // A museum with no rooms is a sheet with its margins and nothing on it.
  if (rooms.length === 0) minX = maxX = minZ = maxZ = 0
  return {
    width: (maxX - minX) * SCALE + PADDING * 2,
    height: (maxZ - minZ) * SCALE + PADDING * 2,
    toX: (worldX: number) => (worldX - minX) * SCALE + PADDING,
    toY: (worldZ: number) => (worldZ - minZ) * SCALE + PADDING,
  }
}

/**
 * A camera yaw as degrees clockwise from north.
 *
 * Yaw 0 looks down -Z, which is up the page, and a positive yaw turns the
 * camera to its left, which on the page is anticlockwise: hence the sign.
 * Brought into [-180, 180] because the camera's yaw is never wrapped: a
 * player who has turned round forty times is still facing somewhere.
 */
export function headingDegrees(yaw: number): number {
  if (!Number.isFinite(yaw)) return 0
  const degrees = (-yaw * 180) / Math.PI
  return degrees - 360 * Math.round(degrees / 360)
}

type Side = { readonly room: RoomData; readonly portal: Portal }

const worldOf = ({ room, portal }: Side) => ({ x: room.origin[0] + portal.position[0], z: room.origin[2] + portal.position[2] })

/**
 * Every physical opening once, with the one or two portals that declare it.
 *
 * A portal is what punches the hole in a wall, so an opening between two
 * rooms is declared by both, each on its own wall line. Drawn portal by
 * portal, the plan had six doorways for three doors, and each one named the
 * room on its far side.
 */
function openingsOf(rooms: readonly RoomData[]): readonly (readonly Side[])[] {
  const claimed = new Set<Portal>()
  const openings: Side[][] = []
  for (const room of rooms) {
    for (const portal of room.portals) {
      if (claimed.has(portal)) continue
      claimed.add(portal)
      const here = worldOf({ room, portal })
      const beyond = rooms.find((candidate) => candidate.id === portal.toRoom)
      const facing = beyond?.portals
        .filter((candidate) => candidate.toRoom === room.id && !claimed.has(candidate))
        .map((candidate) => {
          const there = worldOf({ room: beyond, portal: candidate })
          return { portal: candidate, distance: Math.hypot(there.x - here.x, there.z - here.z) }
        })
        .filter((candidate) => candidate.distance < SAME_OPENING_METRES)
        .sort((first, second) => first.distance - second.distance)[0]?.portal
      if (beyond && facing) {
        claimed.add(facing)
        openings.push([{ room, portal }, { room: beyond, portal: facing }])
      } else {
        openings.push([{ room, portal }])
      }
    }
  }
  return openings
}

/**
 * Out of the room, across the wall, as a unit vector on the page.
 *
 * A portal's own +Z points into its room by convention, and nothing checks
 * the convention; where the portal stands from the middle of its room says
 * which way is out without trusting it.
 */
function outwardOf({ portal }: Side): readonly [number, number] {
  const normal = [Math.sin(portal.rotationY), Math.cos(portal.rotationY)] as const
  const pointsOut = normal[0] * portal.position[0] + normal[1] * portal.position[2] > 0
  return pointsOut ? normal : [-normal[0], -normal[1]]
}

type PlanProgress = Pick<
  Progress,
  'roomsVisited' | 'roomsPowered' | 'catalogued' | 'documentsRead' | 'locksOpened' | 'locksSeen' | 'doorsReleased'
>

/**
 * COMPLETE is everything in the room dealt with: every piece catalogued and
 * every paper read. Anything less, with the lights on, is the amber that
 * drives the player back. Without light the room is dark whatever was done in
 * it by torch: the plan says what is left, and the breaker is.
 */
function roomState(room: RoomData, progress: PlanProgress): MapRoomState {
  if (!isRoomPowered(room, progress.roomsPowered)) return 'unpowered'
  const exhibitsDone = room.exhibitIds.every((id) => progress.catalogued.includes(id))
  const documentsDone = room.documentIds.every((id) => progress.documentsRead.includes(id))
  return exhibitsDone && documentsDone ? 'complete' : 'partial'
}

export function mapModel(
  content: Pick<MuseumContent, 'rooms' | 'exhibits' | 'locks'>,
  progress: PlanProgress,
  player: { readonly x: number; readonly z: number; readonly yaw: number; readonly room: string },
): MapModel {
  const frame = mapFrame(content.rooms)
  const visited = new Set(progress.roomsVisited)

  const rooms = content.rooms
    .filter((room) => visited.has(room.id))
    .map((room) => {
      const [originX, , originZ] = room.origin
      return {
        id: room.id as string,
        titleKey: room.titleKey,
        x: frame.toX(originX - room.shell.width / 2),
        y: frame.toY(originZ - room.shell.depth / 2),
        width: room.shell.width * SCALE,
        height: room.shell.depth * SCALE,
        state: roomState(room, progress),
        current: room.id === player.room,
        // Where each piece still to catalogue stands: what makes the plan
        // answer "what did I leave behind" without the player remembering.
        pips: room.exhibitIds.flatMap((id) => {
          if (progress.catalogued.includes(id)) return []
          const exhibit = content.exhibits.find((candidate) => candidate.id === id)
          if (!exhibit) return []
          return [{ id, x: frame.toX(originX + exhibit.position[0]), y: frame.toY(originZ + exhibit.position[2]) }]
        }),
      }
    })

  const doors = openingsOf(content.rooms).flatMap((sides, index) => {
    // A door that opens from one side only is the reward of the room behind
    // it. Drawn before the player has opened it, it is a second way in that
    // does not open; drawn from the far side only, it is the plan knowing
    // more in one room than in the next. Released, it is a door.
    const latched = sides.find((side) => side.portal.transitionDoor?.opensFrom)
    if (latched && !progress.doorsReleased.includes(latched.portal.id)) return []

    const [first, second] = sides.filter((side) => visited.has(side.room.id))
    if (!first) return []
    const near = worldOf(first)
    const far = second ? worldOf(second) : near
    // With both rooms on the plan the doorway is drawn once, midway between
    // their wall lines and deep enough to cut both.
    const centre = { x: frame.toX((near.x + far.x) / 2), y: frame.toY((near.z + far.z) / 2) }
    const between = Math.hypot(far.x - near.x, far.z - near.z) * SCALE
    const opening = portalOpening(centre.x, centre.y, first.portal.width * SCALE, first.portal.rotationY, between)

    // The room beyond is not on the plan: a stub out of the doorway and a
    // "?". Not its outline, not its name, not how big it is.
    const [outX, outY] = outwardOf(first)
    const reach = STUB_METRES * SCALE
    const stub =
      second || visited.has(first.portal.toRoom)
        ? null
        : {
            line: { x1: centre.x, y1: centre.y, x2: centre.x + outX * reach, y2: centre.y + outY * reach },
            x: centre.x + outX * (reach + STUB_MARK_GAP),
            y: centre.y + outY * (reach + STUB_MARK_GAP),
          }
    return [{ key: `door:${index}`, ...opening, stub }]
  })

  return {
    width: frame.width,
    height: frame.height,
    rooms,
    doors,
    // Naming a lock the player has stood in front of is what turns a shut
    // drawer from confusion into a mystery; naming one they have not found
    // is telling them where to look.
    locks: pendingLocks(content.locks, progress).map((lock) => ({ id: lock.id, labelKey: lock.mapLabelKey })),
    player: { x: frame.toX(player.x), y: frame.toY(player.z), headingDegrees: headingDegrees(player.yaw) },
    // The north-east corner of the sheet, which no room of this building reaches.
    north: { x: frame.width - PADDING, y: PADDING },
  }
}
