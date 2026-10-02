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

/**
 * The longest single frame a mains clock counts.
 *
 * The clock runs on play time, summed frame by frame: the first frame after a
 * hidden tab carries the whole absence, and a clock that swallowed it would
 * catch up on time nobody played.
 */
export const CLOCK_MAX_STEP_SECONDS = 0.25
/** How often a running clock writes its elapsed time into the save. */
export const CLOCK_SAVE_INTERVAL_SECONDS = 15

export function advanceClockSeconds(elapsedSeconds: number, deltaSeconds: number) {
  const step = Number.isFinite(deltaSeconds) ? Math.min(Math.max(deltaSeconds, 0), CLOCK_MAX_STEP_SECONDS) : 0
  return elapsedSeconds + step
}

/** The elapsed seconds a save holds for a clock, or zero if it holds none. */
export function savedClockSeconds(
  progress: { readonly clockSeconds?: Readonly<Record<string, number>> },
  clockId: string,
) {
  const seconds = progress.clockSeconds?.[clockId]
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? seconds : 0
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

/**
 * Whether a scheduled call may play now.
 *
 * Calls are scheduled with their own delays but must be heard in content
 * order: 'queued' while an earlier due call has not been heard, 'gone' once
 * the call has been heard or its condition stopped holding while it waited —
 * a reminder to take the notebook, queued behind the first call, must not
 * play to a player who took the notebook in the meantime.
 */
export function radioCallReady(
  device: RadioDevice,
  callId: string,
  progress: ConditionProgress & { readonly radioCalls: readonly string[] },
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
): 'ready' | 'queued' | 'gone' {
  const index = dueRadioCalls(device, progress, content).findIndex((call) => call.id === callId)
  if (index < 0) return 'gone'
  return index === 0 ? 'ready' : 'queued'
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
