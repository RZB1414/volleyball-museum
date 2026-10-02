/**
 * The HUD's decisions, as plain functions.
 *
 * There is no component test runner in this project, so every rule a panel or
 * toast follows lives here, where `test-opening-flow.ts` can prove it without
 * a DOM, and the components only feed it the store.
 */

import type { TranslationKey } from '../content/i18n/pt-BR'

/**
 * Where a document just read is said to be kept.
 *
 * Before the notebook is picked up there is no journal to re-read it in — and
 * "Tab para reler" with a dead Tab key is how a player who skipped the desk
 * learns that the interface lies. Touch has no Tab key at all.
 */
export function archiveFiledKey(journalUnlocked: boolean, coarse: boolean): TranslationKey {
  if (!journalUnlocked) return 'archive.filed.noJournal'
  return coarse ? 'archive.filed.touch' : 'archive.filed'
}

/**
 * "Click to look": the mouse only turns the head under pointer lock, and the
 * lock is released on purpose whenever a panel needs the cursor. Without a
 * word on screen, a closed notebook leaves a desktop player with a camera
 * that no longer moves and no idea why. Touch players look with a stick.
 */
export function lookHintVisible(input: {
  readonly sceneReady: boolean
  readonly pointerLocked: boolean
  readonly modal: boolean
  readonly coarse: boolean
}) {
  return input.sceneReady && !input.pointerLocked && !input.modal && !input.coarse
}

/**
 * Whether a persisted list grew since the HUD last looked.
 *
 * A toast announces something happening now. The save arrives whole on the
 * first render, so announcing "the last entry" on mount greeted every
 * Continue with a chime for a piece catalogued in a previous session.
 */
export function listGrew(seenLength: number, length: number) {
  return length > seenLength
}

/** The journal-taken toast: once ever, and only after the notebook closes. */
export function shouldAnnounceJournal(input: {
  readonly unlocked: boolean
  readonly reading: boolean
  readonly alreadyShown: boolean
}) {
  return input.unlocked && !input.reading && !input.alreadyShown
}

export type LockKeyIntent =
  | { readonly kind: 'digit'; readonly digit: string }
  | { readonly kind: 'erase' }
  | { readonly kind: 'submit' }
  | { readonly kind: 'close' }

/** What a key does on the combination keypad, by physical key. */
export function lockKeyIntent(event: {
  readonly code: string
  readonly repeat: boolean
}): LockKeyIntent | null {
  if (event.code === 'Escape') return { kind: 'close' }
  if (/^(Digit|Numpad)\d$/.test(event.code)) return { kind: 'digit', digit: event.code.slice(-1) }
  if (event.code === 'Backspace') return { kind: 'erase' }
  // A held Enter must not submit the same wrong code twenty times a second.
  if ((event.code === 'Enter' || event.code === 'NumpadEnter') && !event.repeat) {
    return { kind: 'submit' }
  }
  return null
}

/** The keypad submits only a full code, whether by button or by Enter. */
export function canSubmitCode(entry: string, digits: number) {
  return entry.length >= digits
}

/**
 * A close button's text: "Fechar · Esc" at a keyboard, plain "Fechar" on
 * touch, where naming a key the device does not have reads as a broken hint.
 */
export function closeLabel(close: string, key: 'Esc' | 'Tab', coarse: boolean) {
  return coarse ? close : `${close} · ${key}`
}

/**
 * How long "Novo jogo" stays armed after its first click. Long enough to read
 * the warning and click again, short enough that a click minutes later is a
 * new decision rather than the second half of an old one.
 */
export const NEW_GAME_CONFIRM_MS = 5000

/**
 * The title screen's "New game": the first click only arms it, the second
 * erases. No `window.confirm`, which phone browsers and fullscreen requests
 * both handle badly, and which would spend the gesture that unlocks audio.
 */
export function newGameClick(armed: boolean): 'arm' | 'erase' {
  return armed ? 'erase' : 'arm'
}
