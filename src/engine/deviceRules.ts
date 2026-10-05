/**
 * Device rules: what the clock shows, what the radio says.
 *
 * Pure so the opening scene can be proved headless. The React layer in
 * `Devices.tsx` only feeds these the save, the clock and the elapsed time.
 */

import type { DeviceData, EraId, MuseumContent, ProgressCondition, RadioCall, RoomData } from '../content/schema'
import { isRoomPowered } from './power.ts'
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

export type RadioDelivery = 'drop' | 'wait' | 'play'

/**
 * What the director does with a scheduled call when its timer fires.
 *
 * Dropped once it is gone. Otherwise it waits — and retries — while an
 * earlier call is still owed, while another transmission is on air, under
 * any modal (the notebook covers the subtitle), and while the tab is hidden:
 * background tabs still run timers, and a first call that played to nobody
 * used to be recorded as heard, its directions to the breaker lost for good.
 * It also waits while the player is `away` from a radio left on its desk.
 */
export function radioDeliveryStep(
  readiness: ReturnType<typeof radioCallReady>,
  busy: {
    readonly onAir: boolean
    readonly modal: boolean
    readonly hidden: boolean
    readonly away?: boolean
  },
): RadioDelivery {
  if (readiness === 'gone') return 'drop'
  if (readiness === 'queued' || busy.onAir || busy.modal || busy.hidden || busy.away) return 'wait'
  return 'play'
}

/**
 * Whether the player can hear this radio speak.
 *
 * A radio that is never carried, or one in the player's hand, is heard
 * anywhere. One still on its charger is heard only in its own room: a reminder
 * to take the notebook played to a player who already left the office would
 * come from a radio they cannot hear.
 */
export function radioWithinEarshot(
  device: Pick<RadioDevice, 'id' | 'carriedOnUse'>,
  radioRoomId: string,
  devicesCarried: readonly string[],
  currentRoom: string,
) {
  if (!device.carriedOnUse || devicesCarried.includes(device.id)) return true
  return currentRoom === radioRoomId
}

/**
 * Whether a held transmission — under a modal, or in a hidden tab — has
 * outlived its moment.
 *
 * A held line starts its full time again when the hold ends. That is right
 * for a call the player simply had not read yet and wrong for one the modal
 * answered: the porter asks for the notebook, the player opens it mid-line,
 * and on closing it the same line tells them to take what they now hold. A
 * content call lapses when its own `when` stops holding — its own, not
 * `radioCallReady`, which also counts content order — and an answer when
 * the hint it carries does. Static and calls no longer in the content never
 * lapse: there is nothing left to ask them.
 */
export function transmissionLapsed(
  transmission: {
    readonly deviceId: string
    readonly callId?: string
    readonly validWhile?: ProgressCondition
  } | null,
  progress: ConditionProgress,
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
): boolean {
  if (!transmission) return false
  const condition = transmission.callId
    ? radioDevices(content)
        .find((entry) => entry.device.id === transmission.deviceId)
        ?.device.calls.find((call) => call.id === transmission.callId)?.when
    : transmission.validWhile
  return condition ? !progressConditionMet(condition, progress, content) : false
}

/**
 * Which hint the porter would give, by position, or -1 for none.
 *
 * An index rather than the lines because the patience rules remember it: a
 * different hint from last time means the player got somewhere.
 */
export function radioHintIndex(
  device: Pick<RadioDevice, 'hints'>,
  progress: ConditionProgress,
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
) {
  return device.hints.findIndex((hint) => progressConditionMet(hint.when, progress, content))
}

/** The porter answers with the first thing the player still needs. */
export function radioHintFor(
  device: Pick<RadioDevice, 'hints'>,
  progress: ConditionProgress,
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
): readonly string[] {
  return device.hints[radioHintIndex(device, progress, content)]?.lineKeys ?? []
}

/** The first call due, if any: calls are heard in content order, one at a time. */
export function nextRadioCall(
  device: RadioDevice,
  progress: ConditionProgress & { readonly radioCalls: readonly string[] },
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
): RadioCall | null {
  return dueRadioCalls(device, progress, content)[0] ?? null
}

export type DeskRadioIntent = 'dead' | 'take' | 'skip' | 'call'

/**
 * What E does to a radio on its desk — and so what its prompt says.
 *
 * A carried radio is picked up first, even mid-transmission: taking it never
 * skips a line the porter is saying. Only once it is in hand (or for a radio
 * that stays put) does E move a transmission on or place a call.
 */
export function deskRadioIntent(
  device: Pick<RadioDevice, 'carriedOnUse'>,
  input: { readonly live: boolean; readonly carried: boolean; readonly speaking: boolean },
): DeskRadioIntent {
  if (!input.live) return 'dead'
  if (device.carriedOnUse && !input.carried) return 'take'
  return input.speaking ? 'skip' : 'call'
}

// ---------------------------------------------------------------------------
// One answer for every device: the prompt, the key and the touch button
// ---------------------------------------------------------------------------

/**
 * The room a device takes its electricity from, or null for one that takes
 * none. A switch over every kind, so a kind added to the schema has to say
 * here what feeds it before the build goes on.
 */
export function devicePowerRoom(device: DeviceData): EraId | null {
  switch (device.kind) {
    case 'clock':
      return device.runsWithPowerOf
    case 'power-indicator':
      return device.showsPowerOf
    case 'radio':
      return device.poweredBy
    case 'notice':
      return null
  }
}

/** What a device's intent is asked with. */
export type DeviceInput = {
  /** The room that feeds it has power; always true of a device fed by none. */
  readonly powered: boolean
  /** The player has taken it along. */
  readonly carried: boolean
  /** A transmission is on air. */
  readonly speaking: boolean
}

/** The store, as far as a device's intent reads it. */
export type DeviceWorld = {
  readonly progress: {
    readonly roomsPowered: readonly string[]
    readonly devicesCarried?: readonly string[]
  }
  readonly radio: object | null
}

/** A device's input, read off the save and the air as they are now. */
export function deviceInputOf(
  device: DeviceData,
  world: DeviceWorld,
  roomById: (roomId: string) => Pick<RoomData, 'id' | 'startsPowered'> | undefined,
): DeviceInput {
  const supply = devicePowerRoom(device)
  const room = supply === null ? undefined : roomById(supply)
  return {
    // A supply the content does not have feeds nothing.
    powered: supply === null ? true : room !== undefined && isRoomPowered(room, world.progress.roomsPowered),
    carried: world.progress.devicesCarried?.includes(device.id) ?? false,
    speaking: world.radio !== null,
  }
}

/**
 * What a device answers the crosshair with, and so what its prompt says and
 * what E does to it.
 *
 * Each system used to ask a radio's own rule and nothing else was a device
 * anybody could aim at. With the plinth of the hall (a thing that only says
 * something) there are two kinds, and more come with the lot: one question,
 * asked by the targeting, the HUD and the touch button, so that a prompt can
 * never name what the key does not work.
 */
export type DeviceIntent =
  /** Nothing to aim at: a clock that only shows the time, a door reader. */
  | { readonly kind: 'none' }
  /** It says its notice, and never takes the key. */
  | { readonly kind: 'notice' }
  | { readonly kind: 'radio'; readonly intent: DeskRadioIntent }

export function deviceIntent(device: DeviceData, input: DeviceInput): DeviceIntent {
  switch (device.kind) {
    case 'clock':
    case 'power-indicator':
      return { kind: 'none' }
    case 'notice':
      return { kind: 'notice' }
    case 'radio':
      return {
        kind: 'radio',
        intent: deskRadioIntent(device, { live: input.powered, carried: input.carried, speaking: input.speaking }),
      }
  }
}

/**
 * Whether E does anything to it. False for whatever only answers: a notice,
 * a radio with no charge. Those may hold the prompt and never the key, and
 * the touch button does not show for them.
 */
export function deviceLive(intent: DeviceIntent): boolean {
  switch (intent.kind) {
    case 'none':
    case 'notice':
      return false
    case 'radio':
      return intent.intent !== 'dead'
  }
}

/**
 * Every device the crosshair may rest on, with its room: the ones whose
 * intent is ever anything but `none`. Read by the targeting scan, by the
 * arbitration, by the HUD and by the flood that walks up to each of them.
 */
export function aimableDevices(
  content: Pick<MuseumContent, 'rooms'>,
): readonly { readonly room: RoomData; readonly device: DeviceData }[] {
  return content.rooms.flatMap((room) =>
    (room.devices ?? []).flatMap((device) =>
      // Asked of the rule itself, with the house lit: what a kind answers
      // may change with power, but whether it answers at all does not.
      deviceIntent(device, { powered: true, carried: false, speaking: false }).kind === 'none'
        ? []
        : [{ room, device }],
    ),
  )
}

/**
 * How long a subtitle line stays up: a reading pace of roughly 18 characters
 * a second on top of a floor, clamped so a one-word line is not a flicker and
 * a long one never parks over the scene.
 */
export function radioLineSeconds(text: string) {
  return Math.min(9, Math.max(3.2, 1.6 + text.length / 18))
}
