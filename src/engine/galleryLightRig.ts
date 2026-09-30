import type { KitPlacement, RoomData } from '../content/schema'

export const GALLERY_SPOT_SLOTS = 8
export const CURRENT_ROOM_SPOT_SLOTS = 6
export const RETAINED_ROOM_SPOT_SLOTS = 2

export type LightingRoom = Pick<RoomData, 'id' | 'kit' | 'origin' | 'palette' | 'shell'>

export type GalleryLightSlot = {
  readonly kind: 'key' | 'wash' | 'idle'
  readonly role: 'detail' | 'retained' | 'idle'
  readonly roomId: string
  readonly palette: string
  readonly position: [number, number, number]
  readonly target: [number, number, number]
  readonly distance: number
  readonly angle: number
  readonly penumbra: number
  readonly decay: number
}

function fixturePosition(
  room: LightingRoom,
  placement: KitPlacement,
  role: 'detail' | 'retained',
): GalleryLightSlot {
  const [ox, oy, oz] = room.origin
  const sourceDrop =
    placement.part === 'atrium-pin-pendant' ? 1.2985 * (placement.scale ?? 1) : 0.14
  const target = placement.lightTarget ?? [
    placement.position[0] * 0.48,
    0.72,
    placement.position[2] * 0.92,
  ]

  return {
    kind: 'key',
    role,
    roomId: room.id,
    palette: room.palette,
    position: [
      ox + placement.position[0],
      oy + placement.position[1] - sourceDrop,
      oz + placement.position[2],
    ],
    target: [ox + target[0], oy + target[1], oz + target[2]],
    distance: Math.max(room.shell.width, room.shell.depth) * 0.95,
    angle: 0.52,
    penumbra: 0.72,
    decay: 2,
  }
}

function fixturesFor(
  room: LightingRoom,
  role: 'detail' | 'retained',
): GalleryLightSlot[] {
  return room.kit
    .filter(
      (placement) =>
        placement.part === 'ceiling-spot' ||
        (placement.part === 'atrium-pin-pendant' && placement.lightTarget !== undefined),
    )
    .map((placement) => fixturePosition(room, placement, role))
}

function sampleEvenly<T>(values: readonly T[], count: number): T[] {
  if (values.length <= count) return [...values]
  if (count === 1) return [values[Math.floor(values.length / 2)] as T]
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = Math.round((index * (values.length - 1)) / (count - 1))
    return values[sourceIndex] as T
  })
}

function washFor(room: LightingRoom, role: 'detail' | 'retained'): GalleryLightSlot {
  const [ox, oy, oz] = room.origin
  const { width, depth, height } = room.shell
  return {
    kind: 'wash',
    role,
    roomId: room.id,
    palette: room.palette,
    position: [ox, oy + height - 0.4, oz - depth * 0.18],
    target: [ox, oy, oz + depth * 0.1],
    distance: Math.max(width, depth) * 1.6,
    angle: 0.95,
    penumbra: 0.9,
    decay: 1.4,
  }
}

function slotsFor(
  room: LightingRoom,
  role: 'detail' | 'retained',
  count: number,
): GalleryLightSlot[] {
  const fixtures = sampleEvenly(fixturesFor(room, role), count - 1)
  const slots = [...fixtures, washFor(room, role)]
  while (slots.length < count) slots.push(idleFor(room))
  return slots
}

function idleFor(room: LightingRoom): GalleryLightSlot {
  const [ox, oy, oz] = room.origin
  return {
    kind: 'idle',
    role: 'idle',
    roomId: room.id,
    palette: room.palette,
    position: [ox, oy + room.shell.height - 0.2, oz],
    target: [ox, oy, oz],
    distance: 0.01,
    angle: 0.1,
    penumbra: 1,
    decay: 2,
  }
}

/**
 * Builds one fixed-size pool for the current room and the room being retained
 * through the moving doorway. The current gallery keeps its full six-slot
 * signature; one key plus one wash preserve the short portal view. Once the
 * opaque leaves latch, those two retained slots idle and the warmed room stops
 * consuming fragments without being evicted from cache.
 */
export function buildGalleryLightRig(
  currentRoom: LightingRoom,
  retainedRoom: LightingRoom | null = null,
): GalleryLightSlot[] {
  const slots: GalleryLightSlot[] = [
    ...slotsFor(currentRoom, 'detail', CURRENT_ROOM_SPOT_SLOTS),
  ]
  if (retainedRoom && retainedRoom.id !== currentRoom.id) {
    slots.push(...slotsFor(retainedRoom, 'retained', RETAINED_ROOM_SPOT_SLOTS))
  }

  const bounded = slots.slice(0, GALLERY_SPOT_SLOTS)
  while (bounded.length < GALLERY_SPOT_SLOTS) bounded.push(idleFor(currentRoom))
  return bounded
}
