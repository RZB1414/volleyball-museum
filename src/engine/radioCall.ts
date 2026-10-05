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
import type { MuseumContent } from '../content/schema'
import { FRESH_RADIO_MEMORY, useMuseum } from '../state/store.ts'
import { museumAudio } from './audio.ts'
import { nextRadioCall, radioDevices, radioIsLive, transmissionLapsed, type RadioDevice } from './deviceRules.ts'
import { deadAirFor, porterAnswer, radioCallBlocked } from './radioPatience.ts'
import { skipSequenceStepOn } from './sequenceDirector.ts'

/** What a press of the call button reads of a content: its radios, and what their conditions name. */
type RadioContent = Pick<MuseumContent, 'rooms' | 'exhibits'>
/** The store a press is made against: the game's own, or one tab's in a suite. */
type RadioStore = Pick<typeof useMuseum, 'getState'>

const radiosByContent = new WeakMap<RadioContent, ReadonlyMap<string, RadioDevice>>()

/** A content's radios by id. The walk happens once per content set. */
function radiosOf(content: RadioContent) {
  let radios = radiosByContent.get(content)
  if (!radios) {
    radios = new Map(radioDevices(content).map((entry) => [entry.device.id, entry.device]))
    radiosByContent.set(content, radios)
  }
  return radios
}

/** Static is not a joke, but it still should not repeat itself in a row. */
let lastDeadAirId: string | null = null

/**
 * The first use of a carried radio: the handset leaves its cradle with the
 * player. Only a live radio is worth taking — a dead one has nobody on the
 * other end — and a transmission already playing carries on regardless. The
 * porter's reaction is a content call (`carried`), delivered by the director.
 */
export function takeDeskRadio(deviceId: string) {
  const device = radiosOf(MUSEUM).get(deviceId)
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
 * In order: while a directed sequence is on screen the press moves that on a
 * step, and calls nobody (it speaks in the radio's own lettering, and the
 * button that skips one skips the other); while he is talking the press
 * moves him on a line (and is not a call); a content call that is due is
 * said first, always, so pressing in the seconds after the lamp can never
 * put a hint before his introduction; while he has hung up only static
 * answers; otherwise his answer, as his patience allows. Neither a skip, a
 * content call nor static counts against him.
 */
export function placeRadioCall(deviceId: string, now = Date.now(), random: () => number = Math.random) {
  return placeRadioCallOn(useMuseum, MUSEUM, deviceId, now, random)
}

/**
 * The same press, against a store and a content handed in.
 *
 * The game has one of each, and `placeRadioCall` names them. A suite has a
 * store per tab and museums changed for the purpose, and has to make this
 * very press on them: a copy of these lines written for a robot would prove
 * the copy.
 */
export function placeRadioCallOn(
  store: RadioStore,
  content: RadioContent,
  deviceId: string,
  now: number,
  random: () => number,
) {
  if (skipSequenceStepOn(store)) return true
  const device = radiosOf(content).get(deviceId)
  const state = store.getState()
  if (!device || radioCallBlocked(state)) return false
  if (device.carriedOnUse && !state.progress.devicesCarried.includes(deviceId)) return false
  if (!radioIsLive(content, deviceId, state.progress.roomsPowered)) return false

  if (state.radio) {
    state.advanceRadio()
    return true
  }

  const due = nextRadioCall(device, state.progress, content)
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
    const air = deadAirFor(patience, state.progress, content, random, lastDeadAirId)
    if (air) {
      lastDeadAirId = air.id
      museumAudio.radioStatic()
      state.startRadio({ deviceId, speakerKey: patience.deadAirSpeakerKey, lineKeys: air.lineKeys })
      return true
    }
  }

  const memory = state.progress.radioMemory[deviceId] ?? FRESH_RADIO_MEMORY
  const answer = porterAnswer(device, state.progress, memory, now, random, content)
  if (answer.lineKeys.length === 0) return false
  state.rememberRadioCall(deviceId, answer.memory)
  museumAudio.radioSquelch()
  state.startRadio({
    deviceId,
    speakerKey: device.speakerKey,
    lineKeys: answer.lineKeys,
    ...(answer.hangUpSeconds > 0 ? { hangsUpFor: answer.hangUpSeconds } : {}),
    ...(answer.hintWhen ? { validWhile: answer.hintWhen } : {}),
  })
  return true
}

/**
 * The hold on a transmission has just ended — a modal closed, the tab came
 * back — and what it still had to say may no longer be true: the notebook
 * the porter was asking for is the modal that just closed. Drops it then, as
 * heard, rather than let the held line start over; otherwise leaves it be.
 */
export function releaseHeldRadio() {
  const state = useMuseum.getState()
  if (!transmissionLapsed(state.radio, state.progress, MUSEUM)) return false
  state.dropRadio()
  return true
}
