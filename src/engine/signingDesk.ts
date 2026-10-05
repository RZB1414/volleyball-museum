/**
 * Working a signing desk: the press, and the signature a held press makes.
 *
 * Imperative and React-free, like `radioCall.ts` and `voiceDevice.ts` and for
 * their reasons: E on the desk reaches for it from the canvas, and it runs
 * in Node, where the suites and the playthrough robot make these very
 * presses against a store and a content of their own (audio without a
 * context is a silent no-op there).
 *
 * Two moments, kept apart because the gesture stands between them
 * (`holdAction.ts`): the press, which a desk with a term ready answers by
 * asking to be HELD; and the hold coming to its end, which is when the term
 * is signed. What is signed is asked again at that second moment, of the
 * save as it then is: a room that went dark in another tab, or a card that
 * came up meanwhile, and the hold signs nothing.
 */

import { MUSEUM } from '../content/museum.ts'
import type { MuseumContent } from '../content/schema'
import { useMuseum } from '../state/store.ts'
import { museumAudio } from './audio.ts'
import { deviceInputOf, deviceIntent } from './deviceRules.ts'
import type { HoldRequest } from './holdAction.ts'
import { termGrant, type SigningDesk, type SigningDeskState } from './termRules.ts'

/** What a press on a desk reads of a content: its desks, their terms, and what the conditions name. */
type DeskContent = Pick<MuseumContent, 'rooms' | 'exhibits' | 'terms' | 'sequences'>
/** The store a press is made against: the game's own, or one tab's in a suite. */
type DeskStore = Pick<typeof useMuseum, 'getState'>

const desksByContent = new WeakMap<DeskContent, ReadonlyMap<string, SigningDesk>>()

/** A content's signing desks by id. The walk happens once per content set. */
function desksOf(content: DeskContent) {
  let desks = desksByContent.get(content)
  if (!desks) {
    desks = new Map(
      content.rooms.flatMap((room) =>
        (room.devices ?? []).flatMap((device) => (device.kind === 'signing-desk' ? [[device.id, device] as const] : [])),
      ),
    )
    desksByContent.set(content, desks)
  }
  return desks
}

/** What a desk stands at in this store, by the one rule its prompt is worded by; null for no desk. */
function deskStateOn(store: DeskStore, content: DeskContent, deviceId: string): { desk: SigningDesk; state: SigningDeskState } | null {
  const desk = desksOf(content).get(deviceId)
  if (!desk) return null
  const intent = deviceIntent(desk, deviceInputOf(desk, store.getState(), content))
  return intent.kind === 'desk' ? { desk, state: intent.state } : null
}

/** E going down on a signing desk of the game. */
export function pressSigningDesk(deviceId: string) {
  return pressSigningDeskOn(useMuseum, MUSEUM, deviceId)
}

/**
 * The same press, against a store and a content handed in.
 *
 * What it answers is what the desk's intent says, which is what its prompt
 * says: a term ready to be signed asks for the press to be held, for the
 * desk's own time; a term that still waits for something takes the press
 * and answers it with the buzz of a thing that will not open; a desk with
 * nothing on it, or nothing left, declines, and the key goes to whatever
 * else is waiting for it. Nothing is written by a press.
 */
export function pressSigningDeskOn(store: DeskStore, content: DeskContent, deviceId: string): boolean | HoldRequest {
  const found = deskStateOn(store, content, deviceId)
  if (!found) return false
  if (found.state.state === 'ready') return { id: deviceId, seconds: found.desk.holdSeconds }
  if (found.state.state !== 'blocked') return false
  museumAudio.lockDenied()
  return true
}

/** The hold on a desk of the game came to its end. */
export function signAtDesk(deviceId: string) {
  return signAtDeskOn(useMuseum, MUSEUM, deviceId)
}

/**
 * The same end of a hold, against a store and a content handed in: the term
 * the desk offers is signed, if it can still be. True when it was.
 *
 * It records the signature and no more (`termGrant`); the flag the term
 * sets is settled by the store in the same write, as a trigger.
 */
export function signAtDeskOn(store: DeskStore, content: DeskContent, deviceId: string): boolean {
  const state = deskStateOn(store, content, deviceId)?.state
  if (state?.state !== 'ready') return false
  store.getState().grant(termGrant(state.term))
  museumAudio.chime()
  return true
}
