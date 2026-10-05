/**
 * Working a thing that speaks: the telephone on the desk, a machine with a
 * recorded message.
 *
 * Imperative and React-free, like `radioCall.ts` and for its reasons: E on
 * the device reaches for it from the canvas, and it runs in Node, where the
 * suites and the playthrough robot make this very press against a store and
 * a content of their own (audio without a context is a silent no-op there).
 *
 * What it says goes out on the radio's subtitle, one line at a time, under
 * the device's own name. A recording says the lines of a document, and
 * hearing it to the last one files that document (`grantOnEnd`): the store
 * records it with the end of the transmission, in the same write.
 */

import { MUSEUM } from '../content/museum.ts'
import type { MuseumContent, VoiceUtterance } from '../content/schema'
import { useMuseum } from '../state/store.ts'
import { museumAudio } from './audio.ts'
import { deviceInputOf, deviceIntent, voiceUtterance, type VoiceDevice } from './deviceRules.ts'
import { recordingGrant } from './progressGrants.ts'

/** What a press reads of a content: its voices, what their conditions name, and the recordings they play. */
type VoiceContent = Pick<MuseumContent, 'rooms' | 'exhibits' | 'documents'>
/** The store a press is made against: the game's own, or one tab's in a suite. */
type VoiceStore = Pick<typeof useMuseum, 'getState'>

const voicesByContent = new WeakMap<VoiceContent, ReadonlyMap<string, VoiceDevice>>()

/** A content's voice devices by id. The walk happens once per content set. */
function voicesOf(content: VoiceContent) {
  let voices = voicesByContent.get(content)
  if (!voices) {
    voices = new Map(
      content.rooms.flatMap((room) =>
        (room.devices ?? []).flatMap((device) => (device.kind === 'voice' ? [[device.id, device] as const] : [])),
      ),
    )
    voicesByContent.set(content, voices)
  }
  return voices
}

/**
 * The lines an utterance says: its own, or the transcript of the document
 * it is the recording of. None for a recording the content does not have.
 */
export function voiceLineKeys(content: Pick<MuseumContent, 'documents'>, utterance: VoiceUtterance): readonly string[] {
  if (utterance.documentId === undefined) return utterance.lineKeys
  return content.documents.find((doc) => doc.id === utterance.documentId)?.lineKeys ?? []
}

/** E on a voice device of the game. True when the press did something. */
export function operateVoice(deviceId: string) {
  return operateVoiceOn(useMuseum, MUSEUM, deviceId)
}

/**
 * The same press, against a store and a content handed in.
 *
 * What it does is what the device's intent says, which is what its prompt
 * says: nothing with its mains off; one line on while it is itself speaking;
 * otherwise it says what this night makes it say, from the first line.
 * Starting it takes the air from whatever was on it. A call of the porter's
 * cut off this way was not heard to its end, so it is not recorded as heard
 * and is delivered again.
 */
export function operateVoiceOn(store: VoiceStore, content: VoiceContent, deviceId: string) {
  const device = voicesOf(content).get(deviceId)
  if (!device) return false
  const state = store.getState()
  const intent = deviceIntent(device, deviceInputOf(device, state, content))
  if (intent.kind !== 'voice' || intent.intent === 'dead') return false
  if (intent.intent === 'skip') {
    state.advanceRadio()
    return true
  }

  const utterance = voiceUtterance(device, state.progress, content)
  const lineKeys = utterance ? voiceLineKeys(content, utterance) : []
  if (!utterance || lineKeys.length === 0) return false
  // A line with nobody behind it: the hiss of a dead line, or of a tape
  // before the voice on it.
  museumAudio.radioStatic()
  state.startRadio({
    deviceId,
    speakerKey: device.speakerKey,
    lineKeys,
    ...(utterance.documentId === undefined ? {} : { grantOnEnd: recordingGrant(content, utterance.documentId) }),
  })
  return true
}
