/**
 * Working the porter's radio: taking it off the desk and calling him.
 *
 * Imperative and React-free on purpose. Three things reach for it — E on the
 * desk radio, the R key and the HUD's radio icon — and the HUD is a lazy
 * chunk that must not drag three and drei in through `Devices.tsx`. It also
 * runs in Node, where the opening tests place real calls against the real
 * store and content (audio without a context is a silent no-op there).
 */

import { MUSEUM } from '../content/museum.ts'
import { FRESH_RADIO_MEMORY, useMuseum } from '../state/store.ts'
import { museumAudio } from './audio.ts'
import { nextRadioCall, radioDevices, radioIsLive } from './deviceRules.ts'
import { deadAirFor, porterAnswer, radioCallBlocked } from './radioPatience.ts'

const RADIOS_BY_ID = new Map(radioDevices(MUSEUM).map((entry) => [entry.device.id, entry.device]))

/** Static is not a joke, but it still should not repeat itself in a row. */
let lastDeadAirId: string | null = null

/**
 * The first use of a carried radio: the handset leaves its cradle with the
 * player. Only a live radio is worth taking — a dead one has nobody on the
 * other end — and a transmission already playing carries on regardless. The
 * porter's reaction is a content call (`carried`), delivered by the director.
 */
export function takeDeskRadio(deviceId: string) {
  const device = RADIOS_BY_ID.get(deviceId)
  const state = useMuseum.getState()
  if (!device?.carriedOnUse || radioCallBlocked(state)) return false
  if (state.progress.devicesCarried.includes(deviceId)) return false
  if (!radioIsLive(MUSEUM, deviceId, state.progress.roomsPowered)) return false
  state.carryDevice(deviceId)
  return true
}

/**
 * One press of the call button, from wherever the player stands.
 *
 * In order: while he is talking the press moves him on a line (and is not a
 * call); a content call that is due is said first, always, so pressing in the
 * seconds after the lamp can never put a hint before his introduction; while
 * he has hung up only static answers; otherwise his answer, as his patience
 * allows. Neither a skip, a content call nor static counts against him.
 */
export function placeRadioCall(deviceId: string, now = Date.now(), random: () => number = Math.random) {
  const device = RADIOS_BY_ID.get(deviceId)
  const state = useMuseum.getState()
  if (!device || radioCallBlocked(state)) return false
  if (device.carriedOnUse && !state.progress.devicesCarried.includes(deviceId)) return false
  if (!radioIsLive(MUSEUM, deviceId, state.progress.roomsPowered)) return false

  if (state.radio) {
    state.advanceRadio()
    return true
  }

  const due = nextRadioCall(device, state.progress, MUSEUM)
  if (due) {
    museumAudio.radioSquelch()
    state.startRadio({
      deviceId,
      speakerKey: device.speakerKey,
      lineKeys: due.lineKeys,
      callId: due.id,
    })
    return true
  }

  const patience = device.patience
  if (patience && state.radioHungUpUntil !== null && now < state.radioHungUpUntil) {
    const air = deadAirFor(patience, random, lastDeadAirId)
    if (air) {
      lastDeadAirId = air.id
      museumAudio.radioStatic()
      state.startRadio({ deviceId, speakerKey: patience.deadAirSpeakerKey, lineKeys: air.lineKeys })
      return true
    }
  }

  const memory = state.progress.radioMemory[deviceId] ?? FRESH_RADIO_MEMORY
  const answer = porterAnswer(device, state.progress, memory, now, random, MUSEUM)
  if (answer.lineKeys.length === 0) return false
  state.rememberRadioCall(deviceId, answer.memory)
  museumAudio.radioSquelch()
  state.startRadio({
    deviceId,
    speakerKey: device.speakerKey,
    lineKeys: answer.lineKeys,
    ...(answer.hangUpSeconds > 0 ? { hangsUpFor: answer.hangUpSeconds } : {}),
  })
  return true
}
