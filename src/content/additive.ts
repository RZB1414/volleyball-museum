/**
 * A lot only adds: the content of each lot, held against the graph of the
 * lot before it.
 *
 * A player's save is a list of ids and a set of things done. Rename a
 * document and the letter they read is unread; give an old door a new
 * condition and a player standing behind it is shut in; take a paper out of a
 * drawer and the fact it taught is gone from a game that still asks for it.
 * None of that is a type error, and none of it shows in a new game, which is
 * the only game a developer plays.
 *
 * So each lot that closes writes its graph down (`npm run graph:snapshot`,
 * `docs/releases/L<n>.graph.json`): every action the exhaustive player met,
 * with what it asked and gave; what each line of the notebook's list waits
 * for, or the lot it is promised for; every id a save can hold; every field
 * of the save. And the content of
 * the next lot is compared with it on every run of the gate
 * (`validateAdditive`). Adding is free. Anything else is an accusation, and
 * the way past it is the one a save needs: an alias (`legacySave.ts`), a
 * migration, or leaving the thing as it was.
 *
 * Gate-only, like `validate.ts`: nothing the game ships imports it
 * (`test:facts` checks).
 */

import { deviceSetFlag } from '../engine/deviceRules.ts'
import { lockCredentialKeys } from '../engine/lockRules.ts'
import { credentialKey } from '../engine/progressCondition.ts'
import { compileTriggers } from '../engine/triggers.ts'
import { PROGRESS_FIELDS, type ListField } from '../state/progressFields.ts'
import { SAVE_ALIASES, type SaveAlias } from './legacySave.ts'
import type { MuseumContent } from './schema'
import { ATOM_PREFIX, conditionAtoms, contentActions, simulateProgress, type ActionRecord } from './simulate.ts'
import type { ValidationIssue } from './validate.ts'

// ---------------------------------------------------------------------------
// The ids a save can hold
// ---------------------------------------------------------------------------

/**
 * The ids of the physical doors: a door is the portal that declares the leaf.
 * The portal facing it across the same opening has an id too, and is not a
 * door: no condition may ask for it and the save never holds it.
 */
export function doorIdsOf(content: Pick<MuseumContent, 'rooms'>): ReadonlySet<string> {
  return new Set(
    content.rooms.flatMap((room) => room.portals.flatMap((portal) => (portal.transitionDoor ? [portal.id] : []))),
  )
}

/**
 * The ids each list of the save holds, as the content defines them; null for
 * a list whose ids the content does not define.
 *
 * Typed by the save's own lists: a lot that adds one has to say here what its
 * ids are, or the build stops. Read by the rule that a renamed id leads
 * somewhere (`validateSaveAliases`) and by the rule that an id does not
 * simply vanish (`validateAdditive`): the two halves of one promise.
 */
export function saveIdsByField(content: MuseumContent): Record<ListField, ReadonlySet<string> | null> {
  const rooms = new Set<string>(content.rooms.map((room) => room.id))
  const devices = content.rooms.flatMap((room) => room.devices ?? [])
  const locks = new Set(content.locks.map((lock) => lock.id))
  const triggers = compileTriggers(content)
  const effects = triggers.flatMap((trigger) => trigger.effects)
  return {
    catalogued: new Set(content.exhibits.map((exhibit) => exhibit.id)),
    hotspots: new Set(
      content.exhibits.flatMap((exhibit) => exhibit.hotspots.map((hotspot) => `${exhibit.id}:${hotspot.id}`)),
    ),
    documentsRead: new Set(content.documents.map((doc) => doc.id)),
    factsKnown: new Set(content.facts.map((fact) => fact.id)),
    // What a lock asks for and what an effect hands out, in the store's own spelling.
    credentials: new Set([
      ...content.locks.flatMap(lockCredentialKeys),
      ...effects.flatMap((effect) => (effect.kind === 'grant-credential' ? [credentialKey(effect.credential)] : [])),
    ]),
    roomsVisited: rooms,
    roomsPowered: rooms,
    locksOpened: locks,
    locksSeen: locks,
    doorsReleased: doorIdsOf(content),
    // A flag exists by being set: there is no list of them but the effects,
    // and the verbs of the devices that set one (a clock put right).
    flags: new Set([
      ...effects.flatMap((effect) => (effect.kind === 'set-flag' ? [effect.flag] : [])),
      ...devices.flatMap((device) => {
        const flag = deviceSetFlag(device)
        return flag === null ? [] : [flag]
      }),
    ]),
    triggersFired: new Set(triggers.map((trigger) => trigger.id)),
    radioCalls: new Set(
      devices.flatMap((device) => (device.kind === 'radio' ? device.calls.map((call) => call.id) : [])),
    ),
    // The lessons are named by the HUD, not by the content.
    hintsShown: null,
    devicesCarried: new Set(
      devices.flatMap((device) => (device.kind === 'radio' && device.carriedOnUse ? [device.id] : [])),
    ),
    termsSigned: new Set((content.terms ?? []).map((term) => term.id)),
    sequencesSeen: new Set((content.sequences ?? []).map((sequence) => sequence.id)),
  }
}

// ---------------------------------------------------------------------------
// The snapshot
// ---------------------------------------------------------------------------

/**
 * The collections of ids a snapshot keeps, and the lists of the save each one
 * is held in: an id that leaves the content needs an alias in every one of
 * them.
 *
 * Credentials and flags are not here. Nothing renames them from outside:
 * they are what actions give, and a grant that goes missing is accused as one.
 */
const ID_COLLECTIONS = {
  rooms: ['roomsVisited', 'roomsPowered'],
  exhibits: ['catalogued'],
  hotspots: ['hotspots'],
  documents: ['documentsRead'],
  locks: ['locksOpened', 'locksSeen'],
  doors: ['doorsReleased'],
  facts: ['factsKnown'],
  radioCalls: ['radioCalls'],
  devices: ['devicesCarried'],
  triggers: ['triggersFired'],
  // A term renamed is a signature lost; a sequence renamed plays again to
  // everybody who has seen it.
  terms: ['termsSigned'],
  sequences: ['sequencesSeen'],
} as const satisfies Record<string, readonly ListField[]>

type IdCollection = keyof typeof ID_COLLECTIONS
type SaveFieldKind = 'list' | 'number' | 'record' | 'string'

export type GraphSnapshot = {
  readonly lot: number
  /** Every action the exhaustive player met: what it asks and what it gives, as atoms of plan §2.4. */
  readonly actions: readonly ActionRecord[]
  /**
   * Checklist items, with "all rooms" and "all catalogued" resolved to this
   * lot's ids. Null for a line with no box to tick; such a line carries the
   * lot it is promised for when it has one, and only then, so the record of
   * a lot from before dated promises reads and writes as itself.
   */
  readonly checklist: readonly {
    readonly id: string
    readonly doneWhen: readonly string[] | null
    readonly deferredUntilLot?: number
  }[]
  /** The terms the player signs, each with what signing it asks, as atoms. None until a desk signs one (L3). */
  readonly terms: readonly { readonly id: string; readonly when: readonly string[] }[]
  /**
   * Every id a save can hold, by collection. A record written before a
   * collection existed does not have it, and is read as holding none of it.
   */
  readonly ids: Readonly<Record<IdCollection, readonly string[]>>
  /** The save's field table: the name and kind of every field this lot knows. */
  readonly saveFields: Readonly<Record<string, SaveFieldKind>>
}

const byId = <T extends { readonly id: string }>(first: T, second: T) => (first.id < second.id ? -1 : first.id > second.id ? 1 : 0)

function idsOf(content: MuseumContent): GraphSnapshot['ids'] {
  const byField = saveIdsByField(content)
  const devices = content.rooms.flatMap((room) => room.devices ?? [])
  const collected = (collection: IdCollection) => ID_COLLECTIONS[collection].flatMap((field) => [...(byField[field] ?? [])])
  return {
    rooms: [...new Set(collected('rooms'))].sort(),
    exhibits: collected('exhibits').sort(),
    hotspots: collected('hotspots').sort(),
    documents: collected('documents').sort(),
    locks: [...new Set(collected('locks'))].sort(),
    doors: collected('doors').sort(),
    facts: collected('facts').sort(),
    radioCalls: collected('radioCalls').sort(),
    // Beside the radio that can be carried, every device the save keeps
    // something under: a clock's seconds, a radio's memory of the player.
    devices: [
      ...new Set([
        ...collected('devices'),
        ...devices.flatMap((device) => (device.kind === 'clock' || device.kind === 'radio' ? [device.id] : [])),
      ]),
    ].sort(),
    triggers: collected('triggers').sort(),
    terms: collected('terms').sort(),
    sequences: collected('sequences').sort(),
  }
}

function saveFieldsOf(): GraphSnapshot['saveFields'] {
  const kind = (value: unknown): SaveFieldKind =>
    Array.isArray(value) ? 'list' : typeof value === 'number' ? 'number' : typeof value === 'string' ? 'string' : 'record'
  return Object.fromEntries(
    Object.entries(PROGRESS_FIELDS)
      .map(([field, spec]): [string, SaveFieldKind] => [field, kind(spec.fresh())])
      .sort(([first], [second]) => (first < second ? -1 : 1)),
  )
}

function checklistOf(content: MuseumContent): GraphSnapshot['checklist'] {
  return content.documents
    .flatMap((doc) => (doc.pages ?? []).flatMap((page) => page.items ?? []))
    .map((item) => ({
      id: item.labelKey,
      doneWhen: item.doneWhen ? conditionAtoms(item.doneWhen, content) : null,
      ...(item.deferredUntilLot === undefined ? {} : { deferredUntilLot: item.deferredUntilLot }),
    }))
    .sort(byId)
}

/** Each term, with what signing it asks: what a signature a save holds was given for. */
function termsOf(content: MuseumContent): GraphSnapshot['terms'] {
  return (content.terms ?? []).map((term) => ({ id: term.id, when: conditionAtoms(term.when, content) })).sort(byId)
}

/**
 * The graph of a content, as the lot that closes writes it down.
 *
 * Everything in it is sorted, so writing it again with nothing changed
 * changes no byte, and a diff of two lots shows what moved and nothing else.
 */
export function graphSnapshot(content: MuseumContent, lot: number): GraphSnapshot {
  return {
    lot,
    actions: [...simulateProgress(content).actions].sort(byId),
    checklist: checklistOf(content),
    terms: termsOf(content),
    ids: idsOf(content),
    saveFields: saveFieldsOf(),
  }
}

/**
 * The snapshot as the text of its file: JSON, one action to a line.
 *
 * Written by hand rather than by `JSON.stringify` with an indent, which puts
 * every atom on a line of its own: two thousand lines in which a guard that
 * grew by one atom is a needle. Here a changed action is one changed line.
 */
export function serialiseGraphSnapshot(snapshot: GraphSnapshot): string {
  const rows = (items: readonly unknown[]) =>
    items.length === 0 ? '[]' : `[\n${items.map((item) => `    ${JSON.stringify(item)}`).join(',\n')}\n  ]`
  const table = (entries: Readonly<Record<string, unknown>>) =>
    `{\n${Object.entries(entries)
      .map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
      .join(',\n')}\n  }`
  return (
    [
      '{',
      `  "lot": ${JSON.stringify(snapshot.lot)},`,
      `  "actions": ${rows(snapshot.actions.map(({ id, requires, grants }) => ({ id, requires, grants })))},`,
      `  "checklist": ${rows(
        snapshot.checklist.map(({ id, doneWhen, deferredUntilLot }) => ({
          id,
          doneWhen,
          // Written only where there is one: see `GraphSnapshot.checklist`.
          ...(deferredUntilLot === undefined ? {} : { deferredUntilLot }),
        })),
      )},`,
      `  "terms": ${rows(snapshot.terms.map(({ id, when }) => ({ id, when })))},`,
      `  "ids": ${table(snapshot.ids)},`,
      `  "saveFields": ${table(snapshot.saveFields)}`,
      '}',
    ].join('\n') + '\n'
  )
}

/** A snapshot out of the text of its file; throws on anything that is not one. */
export function parseGraphSnapshot(text: string): GraphSnapshot {
  const parsed = JSON.parse(text) as Partial<GraphSnapshot> | null
  const lists = [parsed?.actions, parsed?.checklist, parsed?.terms]
  if (
    !parsed ||
    !Number.isInteger(parsed.lot) ||
    !lists.every(Array.isArray) ||
    typeof parsed.ids !== 'object' ||
    parsed.ids === null ||
    typeof parsed.saveFields !== 'object' ||
    parsed.saveFields === null
  ) {
    throw new Error('not a graph snapshot: it lacks a lot, its actions, its checklist, its terms, its ids or its save fields')
  }
  return parsed as GraphSnapshot
}

// ---------------------------------------------------------------------------
// The comparison
// ---------------------------------------------------------------------------

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The snapshot's spelling of things, brought forward through the aliases.
 *
 * A save that holds a renamed id holds its new name too, on every load
 * (`saveMigrations.ts`). So an action that used to give `doc:old` and now
 * gives `doc:new` took nothing from anybody, and one that used to be
 * `hotspot:old-piece:back` is still there under the piece's new name.
 */
function renaming(aliases: readonly SaveAlias[]) {
  const follow = (field: ListField, id: string) => {
    let current = id
    // A rename of a rename: as many steps as there are aliases, at most.
    for (let step = 0; step < aliases.length; step += 1) {
      const next = aliases.find((alias) => alias.field === field && alias.from === current)
      if (!next) break
      current = next.to
    }
    return current
  }
  return {
    atom: (entry: string) => {
      for (const [field, prefix] of Object.entries(ATOM_PREFIX) as [ListField, string | null][]) {
        if (prefix !== null && entry.startsWith(`${prefix}:`)) {
          return `${prefix}:${follow(field, entry.slice(prefix.length + 1))}`
        }
      }
      return entry
    },
    // An action's id is built from the ids of what it acts on, each between
    // two separators.
    action: (id: string) =>
      aliases.reduce(
        (renamed, alias) => renamed.replace(new RegExp(`(?<=[:>])${escaped(alias.from)}(?=$|[:>])`, 'g'), alias.to),
        id,
      ),
  }
}

const sameList = (first: readonly string[] | null, second: readonly string[] | null) =>
  first === null || second === null
    ? first === second
    : first.length === second.length && first.every((entry) => second.includes(entry))

/**
 * What the content takes away from, or asks more of, a player of the lot the
 * snapshot was written by.
 *
 * Compared against every action the content OFFERS, not only the ones its own
 * exhaustive player still reaches: an old action behind a new requirement is
 * still offered, and is exactly what has to be seen.
 */
export function validateAdditive(
  previous: GraphSnapshot,
  content: MuseumContent,
  aliases: readonly SaveAlias[] = SAVE_ALIASES,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const error = (code: string, id: string, message: string) => issues.push({ severity: 'error', code, id, message })
  const since = `since L${previous.lot}`
  const renamed = renaming(aliases)

  // --- actions ---------------------------------------------------------------
  const offered = new Map<string, ActionRecord[]>()
  for (const entry of contentActions(content)) offered.set(entry.id, [...(offered.get(entry.id) ?? []), entry])

  for (const before of previous.actions) {
    const candidates = offered.get(before.id) ?? offered.get(renamed.action(before.id))
    if (!candidates) {
      error('node-removed', before.id, `Action "${before.id}" is gone ${since}: a player could do it, and the content no longer offers it.`)
      continue
    }
    const asked = before.requires.map(renamed.atom)
    const judged = candidates.map((now) => ({
      extra: now.requires.filter((entry) => !asked.includes(entry)),
      lost: before.grants.map(renamed.atom).filter((entry) => !now.grants.includes(entry)),
    }))
    // Two carriers of one lock share an id: one that still fits is enough.
    const best = judged.find((verdict) => verdict.extra.length + verdict.lost.length === 0) ?? judged[0]
    if (best.extra.length > 0) {
      error(
        'guard-strengthened',
        before.id,
        `Action "${before.id}" asks for more ${since}: ${best.extra.join(', ')}. A save that could do it yesterday may not be able to today.`,
      )
    }
    if (best.lost.length > 0) {
      error(
        'grant-removed',
        before.id,
        `Action "${before.id}" no longer gives ${best.lost.join(', ')} (it did in L${previous.lot}): whatever waits for that now waits for good.`,
      )
    }
  }

  // --- ids -------------------------------------------------------------------
  const ids = idsOf(content)
  for (const collection of Object.keys(ID_COLLECTIONS) as IdCollection[]) {
    const now = new Set(ids[collection])
    for (const id of previous.ids[collection] ?? []) {
      if (now.has(id)) continue
      const without = ID_COLLECTIONS[collection].filter(
        (field) => !aliases.some((alias) => alias.field === field && alias.from === id),
      )
      if (without.length === 0) continue
      error(
        'id-renamed-without-alias',
        `${collection}:${id}`,
        `"${id}" was one of the ${collection} in L${previous.lot} and the content no longer has it. A save may hold it in ` +
          `${without.map((field) => `\`${field}\``).join(' and ')}: add a line to SAVE_ALIASES for each, or the player loses it.` +
          (collection === 'devices' ? ' (What a save keeps under a device in a record needs a migration as well.)' : ''),
      )
    }
  }

  // --- the list and the terms ------------------------------------------------
  const checklist = new Map(checklistOf(content).map((item) => [item.id, item.doneWhen]))
  for (const item of previous.checklist) {
    const before = item.doneWhen ? item.doneWhen.map(renamed.atom) : null
    const now = checklist.get(item.id)
    if (now === undefined) {
      error('checklist-condition-changed', item.id, `Checklist item "${item.id}" is gone ${since}: a line a player ticked is no longer on the list.`)
    } else if (before === null && now !== null && item.deferredUntilLot !== undefined) {
      // The promise being paid: the record gave the line as dated, with no
      // box, and the lot that builds the thing gives it one. Nobody had
      // ticked it. A line with no box and no date on record is not that;
      // it falls through, and gaining a box changes what it meant.
    } else if (!sameList(before, now)) {
      error(
        'checklist-condition-changed',
        item.id,
        `Checklist item "${item.id}" waits for something else ${since}: it was ${before ? before.join(', ') : 'a line with no box'}, ` +
          `and is now ${now ? now.join(', ') : 'a line with no box'}. A line a player ticked would untick itself.`,
      )
    }
  }
  // A signature in a save was given for what the term asked then. A term
  // that is gone leaves that signature meaning nothing; one that asks for
  // something else (more, less or other) makes it mean something it did not.
  const terms = new Map(termsOf(content).map((term) => [term.id, term.when]))
  for (const term of previous.terms) {
    const before = term.when.map(renamed.atom)
    const now = terms.get(term.id)
    if (now === undefined) {
      error('term-condition-changed', term.id, `Term "${term.id}" is gone ${since}: a player signed it for ${before.join(', ') || 'nothing'}, and the content no longer has it.`)
    } else if (!sameList(before, now)) {
      error(
        'term-condition-changed',
        term.id,
        `Term "${term.id}" is signed on something else ${since}: it asked for ${before.join(', ') || 'nothing'}, and asks for ${now.join(', ') || 'nothing'} now. ` +
          `A signature a player gave would stand for what they never signed.`,
      )
    }
  }

  // --- the save ---------------------------------------------------------------
  const fields = saveFieldsOf()
  for (const [field, kind] of Object.entries(previous.saveFields)) {
    if (fields[field] === kind) continue
    error(
      'save-field-changed',
      field,
      fields[field] === undefined
        ? `The save's field \`${field}\` (a ${kind} in L${previous.lot}) left the table: every save that holds it now carries it unread.`
        : `The save's field \`${field}\` was a ${kind} in L${previous.lot} and is a ${fields[field]} now. A field never changes type: a new meaning is a new field.`,
    )
  }

  return issues
}
