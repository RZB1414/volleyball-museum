/**
 * Consequences: what follows from the save, once.
 *
 * "This piece is catalogued, so the player gets the key" used to be a loop in
 * a `useFrame`: it ran when the last required detail of the piece showed, and
 * ran again at every detail found after that. Harmless while every effect was
 * a list that only grows; wrong the day an effect is a key that gets spent,
 * a toast or a call from the porter.
 *
 * A trigger is a condition and a list of effects, and the save remembers by
 * id that it fired. It fires when its condition holds, whoever made it hold:
 * a verb of the player, another trigger, or a lot that added the trigger to a
 * save that already met it (the drawer opened last week starts giving its key
 * on the next load).
 *
 * Pure, and it only adds to the save, so the order things happen in decides
 * when a trigger fires and never whether (`npm run test:triggers` shuffles
 * it). The store runs this through `state/progressRules.ts`, which is how it
 * gets here without importing the content.
 */

import type { MuseumContent, Trigger, UnlockEffect } from '../content/schema'
import { grantProgress, type Progress, type ProgressGrant } from '../state/progressFields.ts'
import { credentialKey, progressConditionMet } from './progressCondition.ts'

/** What the triggers of a content are made of, and what their conditions and effects read. */
export type TriggerContent = Pick<MuseumContent, 'rooms' | 'exhibits' | 'documents' | 'locks' | 'triggers' | 'terms'>

/**
 * Passes of the fixed point one settle may run.
 *
 * A trigger fires once, so the loop ends by itself after as many passes as
 * there are triggers. The limit is for the write a player is waiting on: a
 * chain longer than this finishes at the next write instead of holding this
 * one, and says so (`exhausted`).
 */
export const TRIGGER_PASS_LIMIT = 64

/**
 * Every trigger of the content: the authored ones, then `exhibit:<id>:catalogued`
 * for each piece with `unlocks`, then `lock:<id>:opened` for each lock with
 * `onOpen`, then `term:<id>:signed` for each term.
 *
 * The derived kinds are why an exhibit's effects, a lock's and a term's are
 * not applied by the verb that catalogues, opens or signs: as triggers they
 * fire once, and reach a save that catalogued, opened or signed before the
 * effect existed. A term's trigger asks for the signature alone; what the
 * desk asked before letting it be made is the desk's business.
 */
export function compileTriggers(content: TriggerContent): readonly Trigger[] {
  return [
    ...(content.triggers ?? []),
    ...content.exhibits.flatMap((exhibit): Trigger[] =>
      exhibit.unlocks?.length
        ? [{ id: `exhibit:${exhibit.id}:catalogued`, when: { catalogued: [exhibit.id] }, effects: exhibit.unlocks }]
        : [],
    ),
    ...content.locks.flatMap((lock): Trigger[] =>
      lock.onOpen?.length
        ? [{ id: `lock:${lock.id}:opened`, when: { locksOpened: [lock.id] }, effects: lock.onOpen }]
        : [],
    ),
    ...(content.terms ?? []).map(
      (term): Trigger => ({
        id: `term:${term.id}:signed`,
        when: { termsSigned: [term.id] },
        effects: [{ kind: 'set-flag', flag: term.grants }],
      }),
    ),
  ]
}

/** The triggers that have not fired and whose condition holds, in the order written. */
export function dueTriggers(
  triggers: readonly Trigger[],
  progress: Progress,
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
): readonly Trigger[] {
  return triggers.filter(
    (trigger) => !progress.triggersFired.includes(trigger.id) && progressConditionMet(trigger.when, progress, content),
  )
}

/**
 * One effect, as what it adds to the save.
 *
 * The only implementation of an effect there is. Every one of them grows a
 * list, so applying it twice is applying it once.
 */
export function effectGrant(effect: UnlockEffect, content: Pick<MuseumContent, 'documents'>): ProgressGrant {
  switch (effect.kind) {
    case 'grant-credential':
      return { credentials: [credentialKey(effect.credential)] }
    case 'open-lock':
      // Open is seen: a lock a consequence opened is never listed on the plan
      // as something the player has yet to find.
      return { locksOpened: [effect.lockId], locksSeen: [effect.lockId] }
    case 'power-room':
      return { roomsPowered: [effect.roomId] }
    case 'reveal-document': {
      // The paper arrives read, with what reading it would have told.
      const fact = content.documents.find((doc) => doc.id === effect.documentId)?.revealsFactId
      return { documentsRead: [effect.documentId], ...(fact ? { factsKnown: [fact] } : {}) }
    }
    case 'set-flag':
      return { flags: [effect.flag] }
  }
}

/**
 * Fires every due trigger, and every trigger those make due, until nothing is
 * owed or the limit is reached.
 *
 * Hands back the save it was given when nothing fired: that identity is how
 * the store knows there is nothing to write and nobody to tell.
 */
export function settleTriggers(
  progress: Progress,
  triggers: readonly Trigger[],
  content: TriggerContent,
  limit: number = TRIGGER_PASS_LIMIT,
): { readonly progress: Progress; readonly fired: readonly string[]; readonly exhausted: boolean } {
  let settled = progress
  const fired: string[] = []
  for (let pass = 0; pass < limit; pass += 1) {
    const due = dueTriggers(triggers, settled, content)
    if (due.length === 0) return { progress: settled, fired, exhausted: false }
    for (const trigger of due) {
      // Two triggers under one id are one trigger to the save: the first
      // fired, and the gate accuses the second (`trigger-duplicate`).
      if (settled.triggersFired.includes(trigger.id)) continue
      settled = grantProgress(settled, { triggersFired: [trigger.id] })
      for (const effect of trigger.effects) settled = grantProgress(settled, effectGrant(effect, content))
      fired.push(trigger.id)
    }
  }
  return { progress: settled, fired, exhausted: dueTriggers(triggers, settled, content).length > 0 }
}
