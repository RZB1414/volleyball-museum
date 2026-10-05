import type { EraId, RoomData, Vec3 } from '../content/schema'

/** The baked `door-leaf` recipe is one half of a standard 1.6 m opening. */
export const TRANSITION_DOOR_LEAF_WIDTH = 0.8
/** Flush against the planted stop at the -Z face of the shared 0.5 m reveal. */
export const TRANSITION_DOOR_PLANE_Z = -0.3525
/** The shared brass threshold stands 14 mm proud of the adjoining floors. */
export const TRANSITION_DOOR_SILL_Y = 0.014
/**
 * How deep the box is that the centre-of-screen ray hits to find a door: the
 * whole opening, on the plane of the leaves. Here, and not in the component
 * that mounts it, because the navigation suite builds the same box to prove
 * a player can stand in front of every door and aim at it.
 */
export const TRANSITION_DOOR_TARGET_DEPTH = 0.1

export type TransitionDoorSpec = {
  readonly id: string
  readonly ownerRoomId: EraId
  readonly otherRoomId: EraId
  readonly position: Vec3
  readonly rotationY: number
  readonly width: number
  readonly height: number
  readonly openDuration: number
  readonly closeDuration: number
  readonly closeDistance: number
  readonly warmDistance: number
  readonly opensFrom: EraId | null
  /** The room whose electricity releases this door's electric lock, if any. */
  readonly requiresPower: EraId | null
  readonly reciprocalPortalId: string
}

export type TransitionDoorLeafPlacement = {
  readonly side: 'left' | 'right'
  readonly position: Vec3
  readonly rotationY: number
}

/**
 * Extracts physical doors from portal data.
 *
 * Only the declaration carrying `transitionDoor` owns the model. Its reciprocal
 * still sees and uses the same world-space object, avoiding two coplanar leaves
 * in the shared opening.
 */
export function buildTransitionDoorSpecs(
  rooms: readonly RoomData[],
): TransitionDoorSpec[] {
  const roomsById = new Map(rooms.map((room) => [room.id, room] as const))
  const seen = new Set<string>()
  const doors: TransitionDoorSpec[] = []

  for (const room of rooms) {
    for (const portal of room.portals) {
      const authored = portal.transitionDoor
      if (!authored) continue
      const destination = roomsById.get(portal.toRoom)
      if (!destination) {
        throw new Error(`Transition door "${portal.id}" targets a missing room.`)
      }
      if (seen.has(portal.id)) {
        throw new Error(`Transition door id "${portal.id}" is not unique.`)
      }
      if (authored.style !== 'double-panel' || Math.abs(portal.width - 1.6) > 1e-6) {
        throw new Error(
          `Transition door "${portal.id}" needs the baked 1.6 m double-panel recipe.`,
        )
      }
      if (
        !Number.isFinite(authored.openDuration) ||
        authored.openDuration <= 0 ||
        !Number.isFinite(authored.closeDuration) ||
        authored.closeDuration <= 0 ||
        !Number.isFinite(authored.closeDistance) ||
        authored.closeDistance <= TRANSITION_DOOR_LEAF_WIDTH ||
        !Number.isFinite(authored.warmDistance) ||
        authored.warmDistance <= 0
      ) {
        throw new Error(`Transition door "${portal.id}" has invalid timing or warm distance.`)
      }
      if (
        authored.opensFrom &&
        authored.opensFrom !== room.id &&
        authored.opensFrom !== portal.toRoom
      ) {
        throw new Error(
          `Transition door "${portal.id}" can only open from one of its two rooms.`,
        )
      }
      if (portal.oneWay && authored.opensFrom !== portal.toRoom) {
        throw new Error(
          `One-way transition door "${portal.id}" must open from its destination.`,
        )
      }
      if (
        authored.requiresPower &&
        authored.requiresPower !== room.id &&
        authored.requiresPower !== portal.toRoom
      ) {
        throw new Error(
          `Transition door "${portal.id}" can only be powered by one of its two rooms.`,
        )
      }

      const worldPosition: Vec3 = [
        room.origin[0] + portal.position[0],
        room.origin[1] + portal.position[1],
        room.origin[2] + portal.position[2],
      ]
      const reciprocal = destination.portals
        .filter(
          (candidate) =>
            candidate.toRoom === room.id &&
            Math.abs(candidate.width - portal.width) < 1e-6 &&
            Math.abs(candidate.height - portal.height) < 1e-6,
        )
        .map((candidate) => ({
          portal: candidate,
          distance: Math.hypot(
            destination.origin[0] + candidate.position[0] - worldPosition[0],
            destination.origin[1] + candidate.position[1] - worldPosition[1],
            destination.origin[2] + candidate.position[2] - worldPosition[2],
          ),
        }))
        .filter((candidate) => candidate.distance < 0.35)
        .sort((first, second) => first.distance - second.distance)[0]?.portal
      if (!reciprocal) {
        throw new Error(`Transition door "${portal.id}" has no aligned reciprocal portal.`)
      }
      if (reciprocal.transitionDoor) {
        throw new Error(
          `Transition door "${portal.id}" is authored on both sides of one opening.`,
        )
      }
      if (Math.abs(Math.cos(portal.rotationY - reciprocal.rotationY) + 1) > 1e-6) {
        throw new Error(`Transition door "${portal.id}" has misaligned portal rotations.`)
      }
      seen.add(portal.id)
      doors.push({
        id: portal.id,
        ownerRoomId: room.id,
        otherRoomId: portal.toRoom,
        position: worldPosition,
        rotationY: portal.rotationY,
        width: portal.width,
        height: portal.height,
        openDuration: authored.openDuration,
        closeDuration: authored.closeDuration,
        closeDistance: authored.closeDistance,
        warmDistance: authored.warmDistance,
        opensFrom: authored.opensFrom ?? null,
        requiresPower: authored.requiresPower ?? null,
        reciprocalPortalId: reciprocal.id,
      })
    }
  }

  return doors
}

/** Which side should be warmed when the visitor approaches this physical door. */
export function transitionDoorTarget(
  door: TransitionDoorSpec,
  currentRoom: string,
): EraId | null {
  if (currentRoom === door.ownerRoomId) return door.otherRoomId
  if (currentRoom === door.otherRoomId) return door.ownerRoomId
  return null
}

/** Maps both authored portal endpoints to their one shared physical door id. */
export function transitionDoorEndpointMap(
  doors: readonly TransitionDoorSpec[],
) {
  const endpoints = new Map<string, string>()
  for (const door of doors) {
    endpoints.set(`${door.ownerRoomId}:${door.id}`, door.id)
    endpoints.set(
      `${door.otherRoomId}:${door.reciprocalPortalId}`,
      door.id,
    )
  }
  return endpoints
}

/**
 * Whether the bar of a one-way door still holds it from this side.
 *
 * A door with a side of its own opens from that side only, until it has been
 * opened from there once; the save remembers that (`progress.doorsReleased`),
 * and from then on the door has no wrong side. It used to be a question of
 * topology alone, so a player who left the wing by its shortcut and turned
 * round read "opens from the other side" for the rest of the game.
 */
function latchedAgainst(door: TransitionDoorSpec, currentRoom: string, released: readonly string[]) {
  return door.opensFrom !== null && door.opensFrom !== currentRoom && !released.includes(door.id)
}

/**
 * Whether this side may operate the door: its own side always, the other once
 * released.
 *
 * `released` is the save's list and has no default on purpose, here and in
 * `transitionDoorBlock`: a default would hand the old behaviour back to any
 * caller that forgot it, and the compiler would say nothing.
 */
export function canOpenTransitionDoor(
  door: TransitionDoorSpec,
  currentRoom: string,
  released: readonly string[],
) {
  return Boolean(
    transitionDoorTarget(door, currentRoom) && !latchedAgainst(door, currentRoom, released),
  )
}

/**
 * Why a door will not open for this visitor right now, or null when it will.
 *
 * Kept apart from `canOpenTransitionDoor` on purpose. That answers "may this
 * side ever operate the door", which also decides whether the far room starts
 * warming; an unpowered lock must not stop the warm-up, or the first press
 * after the lamp comes on would wait on a cold gallery instead of opening.
 *
 * A release lifts the bar and nothing else: an electric lock still waits for
 * its room's power.
 */
export function transitionDoorBlock(
  door: TransitionDoorSpec,
  currentRoom: string,
  isPowered: (roomId: string) => boolean,
  released: readonly string[],
): 'other-side' | 'unpowered' | null {
  if (latchedAgainst(door, currentRoom, released)) return 'other-side'
  if (door.requiresPower && !isPowered(door.requiresPower)) return 'unpowered'
  return null
}

/** Positive opens towards local -Z; the reciprocal side reverses away from its visitor. */
export function transitionDoorSwingSign(
  door: TransitionDoorSpec,
  currentRoom: string,
): 1 | -1 {
  return currentRoom === door.otherRoomId ? -1 : 1
}

function transformLocalPoint(
  door: TransitionDoorSpec,
  localX: number,
  localZ: number,
): Vec3 {
  const cosine = Math.cos(door.rotationY)
  const sine = Math.sin(door.rotationY)
  return [
    door.position[0] + localX * cosine + localZ * sine,
    door.position[1],
    door.position[2] - localX * sine + localZ * cosine,
  ]
}

/** Closed-pose hinge transforms shared by rendering and manifest collision. */
export function transitionDoorLeafPlacements(
  door: TransitionDoorSpec,
): readonly [TransitionDoorLeafPlacement, TransitionDoorLeafPlacement] {
  const left = transformLocalPoint(
    door,
    -door.width / 2,
    TRANSITION_DOOR_PLANE_Z,
  )
  const right = transformLocalPoint(
    door,
    door.width / 2,
    TRANSITION_DOOR_PLANE_Z,
  )
  return [
    {
      side: 'left',
      position: [left[0], left[1] + TRANSITION_DOOR_SILL_Y, left[2]],
      rotationY: door.rotationY,
    },
    {
      side: 'right',
      position: [right[0], right[1] + TRANSITION_DOOR_SILL_Y, right[2]],
      rotationY: door.rotationY,
    },
  ]
}
