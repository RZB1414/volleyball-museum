/**
 * The combination lock.
 *
 * This is the mechanic the whole adaptation rests on: the code is a historical
 * FACT, so the educational payload becomes load-bearing rather than optional.
 * The player cannot progress without having actually learned something.
 *
 * And that is exactly why the hint ladder is not garnish. A knowledge lock with
 * no way out is a quiz that fails the casual visitor — which the design itself
 * names as the fatal anti-pattern, right before building its Tier-4 locks on
 * top of it. So this lock NEVER fails anyone. It waits, and it gets more
 * helpful the longer you stand there:
 *
 *   45 s      it names where you saw the answer
 *   90 s      it states the claim the answer belongs to
 *   3 tries   it fills in the first digit
 *
 * The escalation is on a timer AND on attempts, because the two failure modes
 * are different: one player stares, another mashes. Both should get out.
 */

import { useEffect, useMemo, useRef, useState } from 'react'

import { MUSEUM } from '../content/museum'
import { useTranslate } from '../i18n'
import { useMuseum } from '../state/store'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

export function LockPanel() {
  const lockId = useMuseum((state) => state.activeLock)
  const setActiveLock = useMuseum((state) => state.setActiveLock)
  const openLock = useMuseum((state) => state.openLock)
  const setOpenedContainer = useMuseum((state) => state.setOpenedContainer)
  const t = useTranslate()

  const lock = useMemo(
    () => MUSEUM.locks.find((candidate) => candidate.id === lockId),
    [lockId],
  )
  const fact = useMemo(
    () =>
      lock && lock.kind === 'knowledge'
        ? MUSEUM.facts.find((candidate) => candidate.id === lock.factId)
        : undefined,
    [lock],
  )

  const [entry, setEntry] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [wrong, setWrong] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const openedAtRef = useRef(0)

  // Reset every time the panel opens, so hints do not carry between visits.
  useEffect(() => {
    if (!lockId) return undefined
    setEntry('')
    setAttempts(0)
    setWrong(false)
    setElapsed(0)
    openedAtRef.current = performance.now()

    const timer = window.setInterval(() => {
      setElapsed(performance.now() - openedAtRef.current)
    }, 500)
    return () => window.clearInterval(timer)
  }, [lockId])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!lockId) return
      if (event.code === 'Escape') {
        setActiveLock(null)
        return
      }
      if (/^Digit\d$/.test(event.code) || /^Numpad\d$/.test(event.code)) {
        setEntry((current) => (current.length >= 4 ? current : current + event.code.slice(-1)))
        setWrong(false)
      }
      if (event.code === 'Backspace') setEntry((current) => current.slice(0, -1))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lockId, setActiveLock])

  if (!lock || lock.kind !== 'knowledge' || !fact) return null

  const submit = () => {
    if (entry === fact.value) {
      openLock(lock.id)
      setActiveLock(null)
      // Opening it immediately shows what was inside — the reward should not
      // need a second interaction to collect.
      const container = MUSEUM.rooms
        .flatMap((room) => room.containers ?? [])
        .find((candidate) => candidate.lockId === lock.id)
      if (container) {
        for (const doc of MUSEUM.documents.filter((d) => d.containerId === container.id)) {
          useMuseum.getState().recordDocument(doc.id)
        }
        setOpenedContainer(container.id)
      }
      return
    }

    setAttempts((current) => current + 1)
    setWrong(true)
    setEntry('')
  }

  // --- the ladder -----------------------------------------------------------
  const showSource = elapsed > lock.hints.highlightAfterMs
  const showClaim = elapsed > lock.hints.audioAfterMs
  const showDigit = attempts >= lock.hints.revealAfterAttempts

  return (
    <div className="examine" role="dialog" aria-label={t('lock.title')}>
      <div className="examine-panel lock-panel">
        <h2>{t('lock.title')}</h2>
        <p className="examine-label">{t(fact.claimKey as never)}</p>

        <div className="lock-display" aria-live="polite">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={
                showDigit && index === 0 && entry.length === 0 ? 'lock-digit is-hint' : 'lock-digit'
              }
            >
              {entry[index] ?? (showDigit && index === 0 ? fact.value[0] : '·')}
            </span>
          ))}
        </div>

        {wrong ? <p className="lock-wrong">{t('lock.wrong')}</p> : null}

        <div className="lock-keys">
          {DIGITS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => {
                setEntry((current) => (current.length >= 4 ? current : current + digit))
                setWrong(false)
              }}
            >
              {digit}
            </button>
          ))}
        </div>

        {/*
          The ladder, revealed in place. Deliberately never a "the answer is X"
          — the last rung fills one digit and leaves the player to finish, so
          they still arrive at it themselves.
        */}
        <ul className="lock-hints">
          {showSource ? <li>{t('lock.hint.source')}</li> : null}
          {showClaim ? <li>{t(fact.claimKey as never)}</li> : null}
        </ul>

        <div className="examine-actions">
          <span className="examine-drag">{t('lock.prompt')}</span>
          <span>
            <button type="button" onClick={submit} disabled={entry.length < 4}>
              {t('lock.submit')}
            </button>
            <button type="button" onClick={() => setActiveLock(null)}>
              {t('prompt.close')} · Esc
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
