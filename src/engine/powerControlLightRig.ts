import type { RoomData, Vec3 } from '../content/schema'

export const POWER_CONTROL_POINT_SLOTS = 2

export type PowerControlPointPose = Readonly<{
  position: Vec3
  color: string
  baseIntensity: number
  distance: number
}>

export type PowerControlPointSlot = Readonly<{
  roomId: string
  powered: PowerControlPointPose
  unpowered: PowerControlPointPose
}>

function worldPosition(room: RoomData, local: Vec3): Vec3 {
  const control = room.powerControl
  if (!control) return room.origin
  const rotation = control.rotationY ?? 0
  const scale = control.scale ?? 1
  const cosine = Math.cos(rotation)
  const sine = Math.sin(rotation)
  const x = local[0] * scale
  const y = local[1] * scale
  const z = local[2] * scale
  return [
    room.origin[0] + control.position[0] + x * cosine + z * sine,
    room.origin[1] + control.position[1] + y,
    room.origin[2] + control.position[2] - x * sine + z * cosine,
  ]
}

function idlePose(room: RoomData): PowerControlPointPose {
  return {
    position: room.origin,
    color: '#ffffff',
    baseIntensity: 0,
    distance: 0.01,
  }
}

function pointFor(room: RoomData): PowerControlPointSlot {
  const control = room.powerControl
  if (!control) {
    const idle = idlePose(room)
    return { roomId: room.id, powered: idle, unpowered: idle }
  }
  const powered: PowerControlPointPose = control.light
    ? {
        position: worldPosition(room, control.light.position),
        color: control.light.color,
        baseIntensity: control.light.intensity,
        distance: control.light.distance,
      }
    : idlePose(room)
  return {
    roomId: room.id,
    powered,
    unpowered: {
      position: worldPosition(room, control.pilotPosition),
      color: '#d65a3a',
      baseIntensity: 3.2,
      distance: 2.4,
    },
  }
}

/** Two permanent slots prevent point-light shader variants at every latch. */
export function buildPowerControlLightRig(
  currentRoom: RoomData,
  retainedRoom: RoomData | null = null,
): PowerControlPointSlot[] {
  const points = [pointFor(currentRoom)]
  if (retainedRoom && retainedRoom.id !== currentRoom.id) {
    points.push(pointFor(retainedRoom))
  }
  while (points.length < POWER_CONTROL_POINT_SLOTS) {
    const idle = idlePose(currentRoom)
    points.push({ roomId: currentRoom.id, powered: idle, unpowered: idle })
  }
  return points.slice(0, POWER_CONTROL_POINT_SLOTS)
}
