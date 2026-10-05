/**
 * Terms, and the desk they are signed at, as rules over the content and the
 * save.
 *
 * The night ends with a signature. A term is data: when the desk names it,
 * what signing asks, the flag the signature sets. These functions answer the
 * four things asked of it, for the prompt, the key, the touch button, the
 * lamp on the desk, the notebook and the content gate alike:
 *
 *   - which term the desk offers now: the oldest brought to it and not yet
 *     signed, one at a time (`pendingTerm`);
 *   - what that term still waits for, in words a desk can say: rooms with no
 *     light, papers not read (`termBlockers`);
 *   - what the desk stands at (`signingDeskState`);
 *   - what a signature records (`termGrant`): the signature, and nothing
 *     else. The flag follows from it as a trigger (`engine/triggers.ts`).
 *
 * Pure: `npm run test:ending` asks these of a house made for the purpose.
 */

import type { DeviceData, MuseumContent, Term } from '../content/schema'
import type { ProgressGrant } from '../state/progressFields.ts'
import { isRoomPowered } from './power.ts'
import { progressConditionMet, type ConditionProgress } from './progressCondition.ts'

export type SigningDesk = Extract<DeviceData, { readonly kind: 'signing-desk' }>

type TermContent = Pick<MuseumContent, 'rooms' | 'exhibits'>

/**
 * A term, signed: what the verb records.
 *
 * The signature alone. The flag the term sets is not here on purpose: a
 * verb records what the player DID, and what follows is a trigger, which
 * fires once and reaches a save that was signed by a build without it.
 */
export function termGrant(term: Pick<Term, 'id'>): ProgressGrant {
  return { termsSigned: [term.id] }
}

const signed = (progress: Pick<ConditionProgress, 'termsSigned'>, termId: string) =>
  Array.isArray(progress.termsSigned) && progress.termsSigned.includes(termId)

/** The terms a desk signs, in the order the content lists them: oldest first. */
export function deskTerms(terms: readonly Term[], desk: Pick<SigningDesk, 'termIds'>): readonly Term[] {
  return terms.filter((term) => desk.termIds.includes(term.id))
}

/** The terms the save holds a signature for, in the content's order. One a later build signed is not this build's to list. */
export function signedTerms(terms: readonly Term[], progress: Pick<ConditionProgress, 'termsSigned'>): readonly Term[] {
  return terms.filter((term) => signed(progress, term.id))
}

/**
 * The term the desk offers: the oldest of its terms that has been brought to
 * it and is not signed, or null. One term to a gesture, and a later one
 * waits behind an earlier one for as long as that one waits.
 */
export function pendingTerm(
  terms: readonly Term[],
  desk: Pick<SigningDesk, 'termIds'>,
  progress: ConditionProgress,
  content: TermContent,
): Term | null {
  return (
    deskTerms(terms, desk).find(
      (term) => !signed(progress, term.id) && progressConditionMet(term.presentedWhen, progress, content),
    ) ?? null
  )
}

export type TermBlockers = {
  /** Rooms the term asks to be lit and that are dark, in the order written. */
  readonly rooms: readonly string[]
  /** Papers it asks to have been read and that have not been. */
  readonly documents: readonly string[]
  /** Anything else it asks and the save lacks: something a desk has no words for. */
  readonly other: boolean
}

/** What signing a term still waits for. With nothing in it, the term can be signed. */
export function termBlockers(term: Pick<Term, 'when'>, progress: ConditionProgress, content: TermContent): TermBlockers {
  const dark = (roomId: string) => {
    const room = content.rooms.find((candidate) => candidate.id === roomId)
    return !room || !isRoomPowered(room, progress.roomsPowered)
  }
  const { powered, documentsRead, ...rest } = term.when
  return {
    rooms: (powered ?? []).filter(dark),
    documents: (documentsRead ?? []).filter((documentId) => !progress.documentsRead.includes(documentId)),
    other: !progressConditionMet(rest, progress, content),
  }
}

export type SigningDeskState =
  /** Nothing has been brought to it, and nothing was ever signed here. */
  | { readonly state: 'empty' }
  /** A term is on it that cannot be signed yet. */
  | { readonly state: 'blocked'; readonly term: Term; readonly blockers: TermBlockers }
  /** A term is on it, and a held press signs it. */
  | { readonly state: 'ready'; readonly term: Term }
  /** Every term brought to it is signed; `term` is the last of them. */
  | { readonly state: 'signed'; readonly term: Term }

/**
 * What a desk stands at.
 *
 * `held` is the sequence that follows a signature (the card, the lines)
 * still owed or on screen: until it has closed, the desk offers nothing
 * further. The next term is not signed under the card of the one before.
 */
export function signingDeskState(
  terms: readonly Term[],
  desk: Pick<SigningDesk, 'termIds'>,
  progress: ConditionProgress,
  content: TermContent,
  held = false,
): SigningDeskState {
  const here = deskTerms(terms, desk)
  const last = signedTerms(here, progress).at(-1)
  const pending = held ? null : pendingTerm(terms, desk, progress, content)
  if (!pending) return last ? { state: 'signed', term: last } : { state: 'empty' }
  const blockers = termBlockers(pending, progress, content)
  return blockers.rooms.length + blockers.documents.length > 0 || blockers.other
    ? { state: 'blocked', term: pending, blockers }
    : { state: 'ready', term: pending }
}

/**
 * What of a desk is drawn (DL3-7): its lamp while a term waits on it, signed
 * or not yet signable; the Book once one of its own terms has been signed.
 */
export function deskShows(
  state: SigningDeskState,
  desk: Pick<SigningDesk, 'termIds'>,
  progress: Pick<ConditionProgress, 'termsSigned'>,
): { readonly lamp: boolean; readonly book: boolean } {
  return {
    lamp: state.state === 'blocked' || state.state === 'ready',
    book: desk.termIds.some((termId) => signed(progress, termId)),
  }
}
