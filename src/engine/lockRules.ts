/**
 * What a lock does when the player touches it.
 *
 * The rule was written in three components and they disagreed. A cabinet with
 * a shut lock opened the keypad whatever kind of lock it was, and the keypad
 * draws nothing for a lock that is not a code: a modal with nothing in it,
 * the pointer loose and the world deaf to E. This is the one place the rule
 * lives now, and the one function a component may ask (`attemptLock`).
 *
 * The answer is an outcome and a grant. Exactly one outcome, `ask`, may open
 * a modal, and it names the panel; a lock with no panel can never produce it.
 * Every other shut lock opens here and now or refuses, and the component
 * answers a refusal with a sound.
 *
 * A key that is spent on its lock opens it by touch like any other tool.
 * What "spent" changes is nothing in the save: the key stays in
 * `credentials`, because the save only grows and two tabs join their lists
 * (a key taken out of one would come back with the other's). It is spent
 * because the one lock that takes it is open, and `toolSpent` reads that.
 *
 * Pure, so the content gate and the playthrough robot open locks with the
 * function the game opens them with.
 */

import type { ContainerData, Fact, Lock } from '../content/schema'
import type { Progress, ProgressGrant } from '../state/progressFields.ts'

/** The panels this lot has. A kind of lock gets one in the lot that draws it. */
export type LockPanelKind = 'keypad'

export type LockAttempt =
  /** E on whatever carries the lock. */
  | { readonly kind: 'touch' }
  /** A full code submitted at the keypad. */
  | { readonly kind: 'code'; readonly entry: string }

export type LockOutcome =
  /** It was open already: go on to what is behind it. */
  | { readonly outcome: 'open' }
  /** Show this panel. The only outcome that may open a modal. */
  | { readonly outcome: 'ask'; readonly panel: LockPanelKind; readonly grant: ProgressGrant }
  /** This attempt opened it. */
  | { readonly outcome: 'opened'; readonly grant: ProgressGrant }
  | {
      readonly outcome: 'refused'
      readonly reason: 'wrong-code' | 'missing-credential' | 'unsupported'
      /** Credential keys still missing, `kind:id`. */
      readonly missing?: readonly string[]
      readonly grant: ProgressGrant
    }

/**
 * A lock's requirements as the credential keys that satisfy it. Knowledge and
 * ritual locks are satisfied by information, not inventory, and have none.
 */
export function lockCredentialKeys(lock: Lock): readonly string[] {
  switch (lock.kind) {
    case 'badge':
      return [`badge:${lock.requires}`]
    case 'medallion-plinth':
      return lock.requires.map((id) => `medallion:${id}`)
    case 'tool':
      return [`tool:${lock.requires}`]
    case 'knowledge':
    case 'ritual':
      return []
  }
}

export function lockStatus(lockId: string, progress: Pick<Progress, 'locksOpened'>): 'open' | 'closed' {
  return progress.locksOpened.includes(lockId) ? 'open' : 'closed'
}

/** The panel this lot has for a kind of lock; null is "no modal, ever". */
export function lockPanel(lock: Lock): LockPanelKind | null {
  return lock.kind === 'knowledge' ? 'keypad' : null
}

/**
 * One attempt at one lock.
 *
 * Every outcome but `open` grants `locksSeen`: the lock was touched, which is
 * what puts it on the plan. `opened` grants `locksOpened` beside it. Nothing
 * else is ever written, and a wrong code costs nothing: there is no count of
 * attempts to run out of.
 */
export function attemptLock(
  lock: Lock,
  facts: readonly Fact[],
  progress: Pick<Progress, 'locksOpened' | 'credentials'>,
  attempt: LockAttempt,
): LockOutcome {
  if (lockStatus(lock.id, progress) === 'open') return { outcome: 'open' }

  const seen: ProgressGrant = { locksSeen: [lock.id] }
  const opened: LockOutcome = { outcome: 'opened', grant: { locksSeen: [lock.id], locksOpened: [lock.id] } }
  // A ritual arrives with its panel (L17). Until then the lock stays shut
  // and says so: opening it for free, or opening a modal that draws nothing,
  // would both be wrong.
  const unsupported: LockOutcome = { outcome: 'refused', reason: 'unsupported', grant: seen }

  switch (lock.kind) {
    case 'knowledge': {
      const answer = facts.find((fact) => fact.id === lock.factId)?.value
      // A keypad with no answer behind it could never be closed by the right
      // code: the player would be shut in a modal by a typo in the content.
      if (answer === undefined) return unsupported
      if (attempt.kind === 'touch') return { outcome: 'ask', panel: 'keypad', grant: seen }
      return attempt.entry === answer ? opened : { outcome: 'refused', reason: 'wrong-code', grant: seen }
    }
    case 'ritual':
      return unsupported
    case 'tool':
    case 'badge':
    case 'medallion-plinth': {
      // There is no panel to type at, so a code tried here is a touch. A
      // tool the lock keeps (`consumesTool`) opens it like one it does not:
      // what is spent is read off the open lock, never written.
      const missing = lockCredentialKeys(lock).filter((key) => !progress.credentials.includes(key))
      return missing.length === 0 ? opened : { outcome: 'refused', reason: 'missing-credential', missing, grant: seen }
    }
  }
}

/** Touched and still shut, in content order: what the plan lists. */
export function pendingLocks(
  locks: readonly Lock[],
  progress: Pick<Progress, 'locksOpened' | 'locksSeen'>,
): readonly Lock[] {
  return locks.filter((lock) => progress.locksSeen.includes(lock.id) && !progress.locksOpened.includes(lock.id))
}

/**
 * The credential keys that are spent: each tool a lock consumes, once that
 * lock is open, by whatever opened it.
 *
 * Derived, never stored. The gate holds a consumed tool to one lock
 * (`consumable-multi-consumer`), which is what makes "its lock is open" the
 * whole of the question.
 */
export function toolSpent(locks: readonly Lock[], progress: Pick<Progress, 'locksOpened'>): readonly string[] {
  const spent = locks.flatMap((lock) =>
    lock.kind === 'tool' && lock.consumesTool && lockStatus(lock.id, progress) === 'open' ? lockCredentialKeys(lock) : [],
  )
  return [...new Set(spent)]
}

/**
 * Whether a container stands open: its lock is open, or it has none. What a
 * door on a hinge and the things behind it are drawn by.
 */
export function containerOpen(container: Pick<ContainerData, 'lockId'>, progress: Pick<Progress, 'locksOpened'>): boolean {
  return container.lockId === undefined || lockStatus(container.lockId, progress) === 'open'
}
