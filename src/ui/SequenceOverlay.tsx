/**
 * A directed sequence, on screen: the card that says a term was signed, and
 * the lines that follow it.
 *
 * It is the HUD's and not the radio's on purpose: what closes the night has
 * to reach a player who never picked the radio up. The lines borrow the
 * radio's place on the screen and its measure of a line, and nothing else.
 *
 * Two jobs, and the rules of both are elsewhere. The DIRECTOR starts what
 * the save is owed (`sequenceDirector.ts`: one at a time, never under a
 * modal, in a hidden tab or before the scene is there). The SCREEN shows the
 * step the store says is playing and moves it on when its time is up, or
 * when the player skips it. Held (a modal opened, the tab was hidden), the
 * step is hidden and not counted, and starts its full time again afterwards:
 * the same hold a line of the radio has, and for the same reason.
 */

import { useEffect } from 'react'

import { MUSEUM } from '../content/museum'
import { fillHour } from '../engine/nightClock'
import { sequencePlaying, sequenceStepSeconds, startDueSequence } from '../engine/sequenceDirector'
import { dueSequence } from '../engine/sequenceRules'
import { useTranslate } from '../i18n'
import { isModalOpen, useMuseum } from '../state/store'
import { radioHeld } from './hudRules'
import { useDocumentHidden } from './useDocumentHidden'
import { useNightPhraseKey } from './useNightPhraseKey'

export function SequenceOverlay() {
  const playing = useMuseum((state) => state.sequence)
  const modal = useMuseum(isModalOpen)
  const sceneReady = useMuseum((state) => state.sceneReady)
  const hidden = useDocumentHidden()
  const held = radioHeld({ modal, hidden }) || !sceneReady
  // The id and not the sequence: the selector answers every write of the
  // store, and has to hand back something that compares by value.
  const owed = useMuseum((state) => dueSequence(MUSEUM.sequences ?? [], state.progress, MUSEUM)?.id ?? null)
  const advance = useMuseum((state) => state.advanceSequence)
  const stop = useMuseum((state) => state.stopSequence)
  const hourKey = useNightPhraseKey()
  const t = useTranslate()

  // The director. Asked again whenever something is newly owed, the screen
  // falls free, or what held it lets go.
  useEffect(() => {
    if (owed !== null && playing === null) startDueSequence(held)
  }, [held, owed, playing])

  const step = sequencePlaying(MUSEUM, playing)?.steps[playing?.index ?? 0]
  const text = !step
    ? ''
    : step.kind === 'card'
      ? t(step.titleKey as never)
      : fillHour(t(step.lineKey as never), hourKey ? t(hourKey as never) : null)

  // A sequence this content does not have (the content was replaced under a
  // running game): nothing to show, and nothing must be recorded as shown.
  useEffect(() => {
    if (playing !== null && !step) stop()
  }, [playing, step, stop])

  useEffect(() => {
    if (playing === null || !step || held) return undefined
    const timer = window.setTimeout(
      () => {
        const current = useMuseum.getState().sequence
        if (current?.serial === playing.serial && current.index === playing.index) advance()
      },
      sequenceStepSeconds(step, text) * 1000,
    )
    return () => window.clearTimeout(timer)
  }, [advance, held, playing, step, text])

  if (playing === null || !step || held) return null

  // A wrapper, not the action itself: handed to onClick directly, the click
  // event would become an argument of a store action.
  const skip = (
    <button type="button" className="radio-skip" onClick={() => advance()}>
      {t('radio.skip')} ›
    </button>
  )
  return step.kind === 'card' ? (
    <div className="sequence-card" role="status" aria-live="polite">
      <span className="sequence-card-title">{text}</span>
      {skip}
    </div>
  ) : (
    // The radio's own line of the screen, a little above where the radio
    // itself speaks: a telephone dialled meanwhile says its line under it.
    <div className="radio-subtitle is-sequence" role="status" aria-live="polite">
      <span className="radio-speaker">{t(step.speakerKey as never)}</span>
      <span className="radio-line">{text}</span>
      {skip}
    </div>
  )
}
