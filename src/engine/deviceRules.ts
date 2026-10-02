/**
 * Device rules: what the clock shows, what the radio says.
 *
 * Pure so the opening scene can be proved headless. The React layer in
 * `Devices.tsx` only feeds these the save, the clock and the elapsed time.
 */

import type { DeviceData, MuseumContent, RadioCall } from '../content/schema'
import { progressConditionMet, type ConditionProgress } from './progressCondition.ts'

export type RadioDevice = Extract<DeviceData, { kind: 'radio' }>

const SECONDS_PER_DAY = 24 * 60 * 60

export type ClockTime = { readonly hours: number; readonly minutes: number; readonly seconds: number }

/** A synchronous clock resumes from where it stopped; it never catches up. */
export function clockTimeAfter(
  stoppedAt: { readonly hours: number; readonly minutes: number },
  elapsedSeconds: number,
): ClockTime {
  const start = stoppedAt.hours * 3600 + stoppedAt.minutes * 60
  const total = (((start + Math.max(0, elapsedSeconds)) % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return { hours, minutes, seconds: total - hours * 3600 - minutes * 60 }
}

/** Hand angles in radians, clockwise from twelve, for a twelve-hour dial. */
export function clockHandAngles(time: ClockTime) {
  const fullTurn = Math.PI * 2
  const seconds = time.seconds
  const minutes = time.minutes + seconds / 60
  const hours = (time.hours % 12) + minutes / 60
  return {
    hour: (hours / 12) * fullTurn,
    minute: (minutes / 60) * fullTurn,
    second: (seconds / 60) * fullTurn,
  }
}

export function radioDevices(content: Pick<MuseumContent, 'rooms'>) {
  return content.rooms.flatMap((room) =>
    (room.devices ?? []).flatMap((device) =>
      device.kind === 'radio' ? [{ room, device: device as RadioDevice }] : [],
    ),
  )
}

/** Whether a radio's charger has power, which is what lets the porter answer. */
export function radioIsLive(
  content: Pick<MuseumContent, 'rooms'>,
  deviceId: string,
  roomsPowered: readonly string[],
) {
  const entry = radioDevices(content).find((candidate) => candidate.device.id === deviceId)
  if (!entry) return false
  const room = content.rooms.find((candidate) => candidate.id === entry.device.poweredBy)
  return room ? room.startsPowered || roomsPowered.includes(room.id) : false
}

/** Calls whose moment has come and which the player has not heard yet. */
export function dueRadioCalls(
  device: RadioDevice,
  progress: ConditionProgress & { readonly radioCalls: readonly string[] },
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
): readonly RadioCall[] {
  return device.calls.filter(
    (call) =>
      !progress.radioCalls.includes(call.id) &&
      progressConditionMet(call.when, progress, content),
  )
}

/** The porter answers with the first thing the player still needs. */
export function radioHintFor(
  device: RadioDevice,
  progress: ConditionProgress,
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
): readonly string[] {
  return device.hints.find((hint) => progressConditionMet(hint.when, progress, content))?.lineKeys ?? []
}

/**
 * How long a subtitle line stays up: a reading pace of roughly 18 characters
 * a second on top of a floor, clamped so a one-word line is not a flicker and
 * a long one never parks over the scene.
 */
export function radioLineSeconds(text: string) {
  return Math.min(9, Math.max(3.2, 1.6 + text.length / 18))
}
