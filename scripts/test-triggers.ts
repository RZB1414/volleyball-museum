/**
 * Headless proof that progress has one door.
 *
 *   npm run test:triggers
 *
 * A consequence used to live in a `useFrame`: when the last required detail
 * of an exhibit showed, the component wrote the catalogue and applied the
 * exhibit's effects, and it applied them again at every detail found after
 * that. Nothing in Node reached it, and the store wrote the save by five
 * different paths. From this lot on:
 *
 *   - what a verb of the player records is a pure function that hands back a
 *     grant (`progressGrants.ts`), and the store has one action for it;
 *   - what follows from the save is a trigger (`triggers.ts`): it fires when
 *     its condition holds, once, and the save remembers that it did;
 *   - every write of the save goes through one function of the store, which
 *     settles the triggers before anybody is told.
 *
 * The content is made for the test: the real museum compiles no trigger in
 * this lot, and a suite that proved the machinery on nothing would prove
 * nothing. The store is the real one, loaded the way a browser loads it.
 */

import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { progressWiringProblems, type SourceReader } from './lib/runtimeWiring.ts'
import { STORE_ACTIONS } from './lib/storeActions.ts'
import { deepFreeze, openGame, saveOf, seeded, shrunk, shuffled, suite, throughJson } from './lib/storePage.ts'
import { readText } from './lib/readText.ts'

const { PRE_POSSE_SAVE } = await import('../src/content/legacySave.ts')
const { MUSEUM } = await import('../src/content/museum.ts')
const { SAVE_FIXTURES } = await import('../src/content/saveFixtures.ts')
const { CONDITION_FIELD_CLASS, conditionClass, progressConditionMet } = await import('../src/engine/progressCondition.ts')
const { containerGrant, hotspotGrant } = await import('../src/engine/progressGrants.ts')
const { compileTriggers, dueTriggers, effectGrant, settleTriggers, TRIGGER_PASS_LIMIT } = await import(
  '../src/engine/triggers.ts'
)
const { emptyProgress, grantProgress, PROGRESS_FIELDS } = await import('../src/state/progressFields.ts')
const { onProgressRulesRegistered, progressRules, registerProgressRules } = await import('../src/state/progressRules.ts')
const { migrateProgress } = await import('../src/state/saveMigrations.ts')

type Progress = ReturnType<typeof emptyProgress>
type Raw = Record<string, unknown>
type Condition = Parameters<typeof progressConditionMet>[0]
type Content = Parameters<typeof compileTriggers>[0]
type Effect = Parameters<typeof effectGrant>[0]
type StoreState = Parameters<(typeof STORE_ACTIONS)[string]>[0]

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { test, done } = suite('Triggers, and the one door for progress')

// ---------------------------------------------------------------------------
// A house made for the test
// ---------------------------------------------------------------------------

/**
 * Three rooms, a key on a hook and a hatch it opens.
 *
 * The chain is the one L3 builds with the real drawer: a catalogued piece
 * gives a credential, the credential opens a lock, the open lock sets a flag,
 * the flag lights a room and hands over a paper. Beside it stand two triggers
 * that need two things each, so that the order a player does them in decides
 * WHEN they fire and must not decide whether.
 */
const KEY = { kind: 'tool', id: 'service-key' } as const
const HOUSE = {
  rooms: [
    { id: 'hall', startsPowered: true },
    { id: 'cellar', startsPowered: false },
    { id: 'attic', startsPowered: false },
  ],
  exhibits: [
    {
      id: 'key-hook',
      hotspots: [
        { id: 'front', requiredForCatalogue: true },
        { id: 'tag', requiredForCatalogue: true, revealsFactId: 'fact-tag' },
        // Not needed for the catalogue: the detail a curious player finds later.
        { id: 'scratch', requiredForCatalogue: false, revealsFactId: 'fact-scratch' },
      ],
      unlocks: [{ kind: 'grant-credential', credential: KEY }],
    },
    { id: 'plain-vase', hotspots: [{ id: 'base', requiredForCatalogue: true }], unlocks: [] },
    { id: 'loose-button', hotspots: [{ id: 'thread', requiredForCatalogue: false }] },
  ],
  documents: [
    { id: 'doc-cellar', containerId: 'cellar-box', revealsFactId: 'fact-cellar' },
    { id: 'doc-loose', containerId: 'hall-tray' },
    { id: 'doc-ledger', containerId: 'hall-tray', revealsFactId: 'fact-ledger' },
  ],
  locks: [
    {
      kind: 'tool',
      id: 'hatch',
      requires: 'service-key',
      consumesTool: false,
      mapLabelKey: 'lock.hatch',
      onOpen: [{ kind: 'set-flag', flag: 'hatch-open' }],
    },
    { kind: 'badge', id: 'plain-door', requires: 'indoor', mapLabelKey: 'lock.plain-door' },
  ],
  triggers: [
    { id: 'key-opens-hatch', when: { credentials: [KEY] }, effects: [{ kind: 'open-lock', lockId: 'hatch' }] },
    {
      id: 'hatch-lights-cellar',
      when: { flags: ['hatch-open'] },
      effects: [
        { kind: 'power-room', roomId: 'cellar' },
        { kind: 'reveal-document', documentId: 'doc-cellar' },
      ],
    },
    { id: 'attic-found', when: { roomsVisited: ['attic'], documentsRead: ['doc-loose'] }, effects: [{ kind: 'set-flag', flag: 'attic-found' }] },
    {
      id: 'either-way',
      when: { anyOf: [{ hotspotsSeen: ['plain-vase:base'] }, { powered: ['attic'] }] },
      effects: [{ kind: 'set-flag', flag: 'either-way' }],
    },
    {
      id: 'both-flags',
      when: { flags: ['attic-found', 'either-way'], catalogued: ['key-hook'] },
      effects: [{ kind: 'power-room', roomId: 'attic' }],
    },
  ],
} as unknown as Content & typeof MUSEUM

const [keyHook, plainVase, looseButton] = HOUSE.exhibits
const HOUSE_TRIGGERS = compileTriggers(HOUSE)
const CHAIN = ['exhibit:key-hook:catalogued', 'key-opens-hatch', 'lock:hatch:opened', 'hatch-lights-cellar']

const lists = (Object.keys(PROGRESS_FIELDS) as (keyof typeof PROGRESS_FIELDS)[]).filter((field) =>
  Array.isArray(PROGRESS_FIELDS[field].fresh()),
)
/** Everything the save holds in a list, as sets: what was reached, whatever the order. */
const atomsOf = (progress: Raw) =>
  Object.fromEntries(lists.map((field) => [field, [...(progress[field] as string[])].sort()]))
const count = (list: readonly string[], id: string) => list.filter((item) => item === id).length

// ---------------------------------------------------------------------------
// The title screen: a store, and no content yet
// ---------------------------------------------------------------------------

await test('with no rules registered nothing breaks, and nothing is taken to have happened', async () => {
  // The store is on the title screen and the content is behind the button:
  // until the canvas chunk arrives, the store has nobody to ask.
  assert.equal(progressRules(), null, 'something registered rules before the content was asked for')
  const page = await openGame(SAVE_FIXTURES['production-drawer-open'].save)
  const loaded = throughJson(page.progress())
  for (const [name, act] of Object.entries(STORE_ACTIONS)) {
    const before = throughJson(page.progress())
    assert.doesNotThrow(() => act(page.state()), name)
    assert.deepEqual(shrunk(before, page.progress()), [], `${name} took something out of the save`)
  }
  assert.deepEqual(page.progress().triggersFired, [], 'a trigger fired with no content to say so')
  assert.deepEqual(shrunk(loaded, page.progress()), [])
  page.state().resetProgress()
  assert.deepEqual(page.progress(), emptyProgress())
})

// ---------------------------------------------------------------------------
// Conditions (T4)
// ---------------------------------------------------------------------------

const EMPTY = emptyProgress()
const ask = (condition: Condition, progress: Raw = EMPTY, content: Content = HOUSE) =>
  progressConditionMet(condition, progress as Progress, content)

/**
 * Every question a condition can ask: one that an empty save answers as
 * `empty`, and what has to be in the save for the answer to turn.
 */
const FIELD_CASES: Record<string, { ask: Condition; empty: boolean; turnedBy: Raw }> = {
  powered: { ask: { powered: ['cellar'] }, empty: false, turnedBy: { roomsPowered: ['cellar'] } },
  unpowered: { ask: { unpowered: ['cellar'] }, empty: true, turnedBy: { roomsPowered: ['cellar'] } },
  locksOpened: { ask: { locksOpened: ['hatch'] }, empty: false, turnedBy: { locksOpened: ['hatch'] } },
  locksClosed: { ask: { locksClosed: ['hatch'] }, empty: true, turnedBy: { locksOpened: ['hatch'] } },
  locksSeen: { ask: { locksSeen: ['hatch'] }, empty: false, turnedBy: { locksSeen: ['hatch'] } },
  documentsRead: { ask: { documentsRead: ['doc-loose'] }, empty: false, turnedBy: { documentsRead: ['doc-loose'] } },
  documentsUnread: { ask: { documentsUnread: ['doc-loose'] }, empty: true, turnedBy: { documentsRead: ['doc-loose'] } },
  carried: { ask: { carried: ['office-radio'] }, empty: false, turnedBy: { devicesCarried: ['office-radio'] } },
  allRoomsPowered: { ask: { allRoomsPowered: true }, empty: false, turnedBy: { roomsPowered: ['cellar', 'attic'] } },
  allCatalogued: {
    ask: { allCatalogued: true },
    empty: false,
    turnedBy: { catalogued: ['key-hook', 'plain-vase', 'loose-button'] },
  },
  catalogued: { ask: { catalogued: ['key-hook'] }, empty: false, turnedBy: { catalogued: ['key-hook'] } },
  hotspotsSeen: { ask: { hotspotsSeen: ['key-hook:tag'] }, empty: false, turnedBy: { hotspots: ['key-hook:tag'] } },
  credentials: { ask: { credentials: [KEY] }, empty: false, turnedBy: { credentials: ['tool:service-key'] } },
  flags: { ask: { flags: ['hatch-open'] }, empty: false, turnedBy: { flags: ['hatch-open'] } },
  flagsUnset: { ask: { flagsUnset: ['hatch-open'] }, empty: true, turnedBy: { flags: ['hatch-open'] } },
  roomsVisited: { ask: { roomsVisited: ['attic'] }, empty: false, turnedBy: { roomsVisited: ['attic'] } },
  roomsUnvisited: { ask: { roomsUnvisited: ['attic'] }, empty: true, turnedBy: { roomsVisited: ['attic'] } },
  doorsReleased: { ask: { doorsReleased: ['hall-to-cellar'] }, empty: false, turnedBy: { doorsReleased: ['hall-to-cellar'] } },
  termsSigned: { ask: { termsSigned: ['term-keys'] }, empty: false, turnedBy: { termsSigned: ['term-keys'] } },
  anyOf: { ask: { anyOf: [{ flags: ['a'] }, { flags: ['b'] }] }, empty: false, turnedBy: { flags: ['b'] } },
}

/** The fields of `ProgressCondition`, read off the schema: scripts are not type-checked. */
const schemaConditionFields = (() => {
  const schema = readText(resolve(ROOT, 'src/content/schema.ts'))
  const body = schema.slice(schema.indexOf('export type ProgressCondition = {'))
  return [...body.slice(0, body.indexOf('\n}\n')).matchAll(/^ {2}readonly (\w+)\?:/gm)].map((match) => match[1])
})()

await test('a condition about a list of the save asks that list', () => {
  // The defect this replaces: the evaluator ignored any field it did not
  // know, so a question it could not answer was answered "yes".
  assert.equal(
    ask({ catalogued: ['ball-spalding'] }, EMPTY, MUSEUM),
    false,
    'an empty save has "ball-spalding" catalogued: the evaluator ignores the field',
  )
  assert.deepEqual(
    Object.keys(FIELD_CASES).sort(),
    [...schemaConditionFields].sort(),
    'a field of ProgressCondition has no case in this suite: nothing proves the evaluator reads it',
  )
  for (const [field, example] of Object.entries(FIELD_CASES)) {
    assert.equal(ask(example.ask), example.empty, `${field}, asked of an empty save`)
    assert.equal(ask(example.ask, { ...EMPTY, ...example.turnedBy }), !example.empty, `${field}, once the save holds it`)
  }
  // An empty condition always holds, and an empty list asks for nothing.
  assert.equal(ask({}), true)
  assert.equal(ask({ catalogued: [], hotspotsSeen: [], credentials: [], flags: [], roomsVisited: [], doorsReleased: [] }), true)
})

await test('every requirement listed must hold, and every id in a list', () => {
  const all: Condition = {
    catalogued: ['key-hook', 'plain-vase'],
    hotspotsSeen: ['key-hook:tag'],
    credentials: [KEY, { kind: 'badge', id: 'indoor' }],
    flags: ['hatch-open'],
    roomsVisited: ['attic', 'cellar'],
    doorsReleased: ['hall-to-cellar'],
  }
  const holding: Raw = {
    ...EMPTY,
    catalogued: ['plain-vase', 'key-hook'],
    hotspots: ['key-hook:tag', 'key-hook:front'],
    credentials: ['badge:indoor', 'tool:service-key'],
    flags: ['hatch-open', 'another'],
    roomsVisited: ['cellar', 'hall', 'attic'],
    doorsReleased: ['hall-to-cellar'],
  }
  assert.equal(ask(all, holding), true)
  // One id short in any one list is "no": each list loses its first, which the condition asks for.
  for (const field of ['catalogued', 'hotspots', 'credentials', 'flags', 'roomsVisited', 'doorsReleased']) {
    const short = { ...holding, [field]: (holding[field] as string[]).slice(1) }
    assert.equal(ask(all, short), false, `one ${field} short`)
  }
  // A credential is asked for in the save's own spelling, kind and id.
  assert.equal(ask({ credentials: [KEY] }, { ...EMPTY, credentials: ['badge:service-key', 'service-key'] }), false)
  // A detail is the piece and the detail: the same name on another piece is not it.
  assert.equal(ask({ hotspotsSeen: ['key-hook:tag'] }, { ...EMPTY, hotspots: ['plain-vase:tag', 'tag'] }), false)
})

await test('a list the asker does not hold answers no, and never throws', () => {
  // The checklist and the radio ask with whatever they were handed: a save
  // without the list is a save in which none of it happened.
  const bare = { roomsPowered: [], locksOpened: [], documentsRead: [], catalogued: [] }
  for (const field of ['hotspotsSeen', 'credentials', 'flags', 'roomsVisited', 'doorsReleased', 'carried', 'termsSigned']) {
    assert.equal(ask(FIELD_CASES[field].ask, bare), false, field)
  }
  // And a list of another shape, which is what a save written by a later
  // build holds in a field this one does not sanitise.
  for (const junk of ['hatch-open', 5, { 0: 'hatch-open' }, null]) {
    assert.equal(ask({ flags: ['hatch-open'] }, { ...bare, flags: junk }), false, JSON.stringify(junk))
    assert.equal(ask({ doorsReleased: ['hall-to-cellar'] }, { ...bare, doorsReleased: junk }), false, JSON.stringify(junk))
  }
  // The same save, asked whether none of it happened, answers yes: a list
  // that is not there, or is not a list, holds nothing. One of several is enough to say no.
  for (const field of ['flagsUnset', 'roomsUnvisited']) assert.equal(ask(FIELD_CASES[field].ask, bare), true, field)
  for (const junk of ['hatch-open', 5, { 0: 'hatch-open' }, null]) {
    assert.equal(ask({ flagsUnset: ['hatch-open'] }, { ...bare, flags: junk }), true, JSON.stringify(junk))
  }
  assert.equal(ask({ flagsUnset: ['a', 'hatch-open'] }, { ...bare, flags: ['hatch-open'] }), false)
  assert.equal(ask({ roomsUnvisited: ['attic', 'cellar'] }, { ...bare, roomsVisited: ['hall', 'cellar'] }), false)
  assert.equal(ask({ roomsUnvisited: ['attic', 'cellar'] }, { ...bare, roomsVisited: ['hall'] }), true)
})

await test('anyOf holds with one of its branches, never with none, and beside the rest', () => {
  const lit = { ...EMPTY, roomsPowered: ['attic'] }
  const seen = { ...EMPTY, hotspots: ['plain-vase:base'] }
  const either: Condition = { anyOf: [{ hotspotsSeen: ['plain-vase:base'] }, { powered: ['attic'] }] }
  assert.equal(ask(either), false)
  assert.equal(ask(either, lit), true)
  assert.equal(ask(either, seen), true)
  assert.equal(ask({ anyOf: [] }), false, '"one of nothing" held')
  assert.equal(ask({ anyOf: [] }, { ...lit, ...seen }), false)
  assert.equal(ask({ anyOf: [{}] }), true, 'an empty branch always holds')
  // Every other requirement still must.
  assert.equal(ask({ ...either, flags: ['hatch-open'] }, lit), false)
  assert.equal(ask({ ...either, flags: ['hatch-open'] }, { ...lit, flags: ['hatch-open'] }), true)
  // Branches nest.
  const nested: Condition = { anyOf: [{ anyOf: [{ flags: ['a'] }, { flags: ['b'] }], catalogued: ['key-hook'] }, { flags: ['c'] }] }
  assert.equal(ask(nested, { ...EMPTY, flags: ['b'] }), false)
  assert.equal(ask(nested, { ...EMPTY, flags: ['b'], catalogued: ['key-hook'] }), true)
  assert.equal(ask(nested, { ...EMPTY, flags: ['c'] }), true)
})

await test('a condition has a class: what stays true, what can stop being true, what a new room changes', () => {
  assert.deepEqual(
    Object.keys(CONDITION_FIELD_CLASS).sort(),
    [...schemaConditionFields].sort(),
    'a field of ProgressCondition has no class: the gate cannot say whether a trigger may ask it',
  )
  // The table agrees with what the evaluator does: a requirement that an
  // empty save meets and a fuller one does not is the kind that can stop
  // holding.
  for (const [field, example] of Object.entries(FIELD_CASES)) {
    const expected = example.empty ? 'negative' : field.startsWith('all') ? 'all' : 'positive'
    assert.equal(CONDITION_FIELD_CLASS[field as keyof typeof CONDITION_FIELD_CLASS], expected, field)
    assert.equal(conditionClass(example.ask), expected, field)
  }
  assert.equal(conditionClass({}), 'positive')
  // A requirement that asks for nothing is not a requirement.
  assert.equal(conditionClass({ unpowered: [], locksClosed: [], documentsUnread: [] }), 'positive')
  assert.equal(conditionClass({ allRoomsPowered: false, allCatalogued: false }), 'positive')
  // The worst class anywhere in it, branches included.
  assert.equal(conditionClass({ flags: ['a'], allCatalogued: true }), 'all')
  assert.equal(conditionClass({ flags: ['a'], allCatalogued: true, locksClosed: ['hatch'] }), 'negative')
  assert.equal(conditionClass({ anyOf: [{ flags: ['a'] }, { documentsUnread: ['doc-loose'] }] }), 'negative')
  assert.equal(conditionClass({ anyOf: [{ flags: ['a'] }, { anyOf: [{ allRoomsPowered: true }] }] }), 'all')
  assert.equal(conditionClass({ anyOf: [{ flags: ['a'] }, { catalogued: ['key-hook'] }] }), 'positive')
  // Every trigger of the test house may be a trigger.
  for (const trigger of HOUSE_TRIGGERS) assert.equal(conditionClass(trigger.when), 'positive', trigger.id)
})

// ---------------------------------------------------------------------------
// What a verb records (T5)
// ---------------------------------------------------------------------------

/** The fields a detail may write. An effect of the piece is none of its business. */
const DETAIL_WRITES = ['catalogued', 'factsKnown', 'hotspots']

await test('a detail records itself, the fact it reveals and, with every required one seen, the piece', () => {
  assert.deepEqual(hotspotGrant(keyHook, 'front', []), { hotspots: ['key-hook:front'] })
  assert.deepEqual(hotspotGrant(keyHook, 'tag', []), { hotspots: ['key-hook:tag'], factsKnown: ['fact-tag'] })
  assert.deepEqual(hotspotGrant(keyHook, 'tag', ['key-hook:front']), {
    hotspots: ['key-hook:tag'],
    factsKnown: ['fact-tag'],
    catalogued: ['key-hook'],
  })
  // In either order, and never by a detail of the same name on another piece.
  assert.deepEqual(hotspotGrant(keyHook, 'front', ['key-hook:tag']).catalogued, ['key-hook'])
  assert.equal(hotspotGrant(keyHook, 'tag', ['plain-vase:front', 'front']).catalogued, undefined)
  // The optional detail does not catalogue the piece by itself.
  assert.deepEqual(hotspotGrant(keyHook, 'scratch', ['key-hook:front']), {
    hotspots: ['key-hook:scratch'],
    factsKnown: ['fact-scratch'],
  })
  // A piece with nothing required is catalogued by the first detail, as it always was.
  assert.deepEqual(hotspotGrant(looseButton, 'thread', []), { hotspots: ['loose-button:thread'], catalogued: ['loose-button'] })
  assert.deepEqual(hotspotGrant(keyHook, 'no-such-detail', []), {})
  // It reads what it was given and writes nothing into it.
  assert.doesNotThrow(() => hotspotGrant(deepFreeze(throughJson(keyHook)), 'tag', Object.freeze(['key-hook:front'])))
})

await test('replaying the details of each save of the corpus catalogues what that save catalogued', () => {
  // The rule moved out of a `useFrame`; for a save production wrote, that
  // must not show. Each fixture's details, in the order it saw them.
  const exhibits = new Map(MUSEUM.exhibits.map((exhibit) => [exhibit.id as string, exhibit]))
  for (const [id, fixture] of Object.entries(SAVE_FIXTURES)) {
    const record = fixture.save.progress as Raw
    let replayed = emptyProgress()
    for (const key of record.hotspots as string[]) {
      const [exhibitId, hotspotId] = key.split(':')
      replayed = grantProgress(replayed, hotspotGrant(exhibits.get(exhibitId)!, hotspotId, replayed.hotspots))
    }
    assert.deepEqual(replayed.hotspots, record.hotspots, id)
    assert.deepEqual([...replayed.catalogued].sort(), [...(record.catalogued as string[])].sort(), `${id}: catalogued`)
    for (const fact of replayed.factsKnown) assert.ok((record.factsKnown as string[]).includes(fact), `${id}: ${fact}`)
  }
})

await test('a container records every document in it and the facts they reveal', () => {
  assert.deepEqual(containerGrant(HOUSE, 'hall-tray'), { documentsRead: ['doc-loose', 'doc-ledger'], factsKnown: ['fact-ledger'] })
  assert.deepEqual(containerGrant(HOUSE, 'cellar-box'), { documentsRead: ['doc-cellar'], factsKnown: ['fact-cellar'] })
  assert.deepEqual(containerGrant(HOUSE, 'empty-shelf'), { documentsRead: [], factsKnown: [] })
  // The real cabinets: the one whose title prints the year gives the year.
  assert.deepEqual(containerGrant(MUSEUM, 'office-cabinet'), { documentsRead: ['doc-otavio-handover'], factsKnown: [] })
  // The iron safe: the Book and the proof, in the order they are read.
  assert.deepEqual(containerGrant(MUSEUM, 'office-safe'), { documentsRead: ['doc-termos', 'doc-label-proof-office'], factsKnown: [] })
  const cabinet = containerGrant(MUSEUM, 'holyoke-cabinet-a')
  assert.equal(cabinet.documentsRead?.length, 2)
  assert.deepEqual(cabinet.factsKnown, ['springfield-renaming'])
})

// ---------------------------------------------------------------------------
// Triggers, as pure functions
// ---------------------------------------------------------------------------

const EFFECTS: Record<string, { effect: Effect; grant: Raw }> = {
  'grant-credential': { effect: { kind: 'grant-credential', credential: KEY }, grant: { credentials: ['tool:service-key'] } },
  // An opened lock was touched: the plan never lists it, and never has to ask.
  'open-lock': { effect: { kind: 'open-lock', lockId: 'hatch' }, grant: { locksOpened: ['hatch'], locksSeen: ['hatch'] } },
  'power-room': { effect: { kind: 'power-room', roomId: 'cellar' }, grant: { roomsPowered: ['cellar'] } },
  'reveal-document': {
    effect: { kind: 'reveal-document', documentId: 'doc-cellar' },
    grant: { documentsRead: ['doc-cellar'], factsKnown: ['fact-cellar'] },
  },
  'set-flag': { effect: { kind: 'set-flag', flag: 'hatch-open' }, grant: { flags: ['hatch-open'] } },
}

await test('each effect is a grant, in the spelling the save and the lock graph use', () => {
  const schema = readText(resolve(ROOT, 'src/content/schema.ts'))
  const declared = schema.slice(schema.indexOf('export type UnlockEffect ='), schema.indexOf('export type Trigger ='))
  assert.deepEqual(
    Object.keys(EFFECTS).sort(),
    [...declared.matchAll(/readonly kind: '([a-z-]+)'/g)].map((match) => match[1]).sort(),
    'a kind of effect has no case in this suite',
  )
  for (const [kind, example] of Object.entries(EFFECTS)) assert.deepEqual(effectGrant(example.effect, HOUSE), example.grant, kind)
  // A paper with no fact reveals none, and one the content does not have is still recorded as read.
  assert.deepEqual(effectGrant({ kind: 'reveal-document', documentId: 'doc-loose' }, HOUSE), { documentsRead: ['doc-loose'] })
  assert.deepEqual(effectGrant({ kind: 'reveal-document', documentId: 'doc-nowhere' }, HOUSE), { documentsRead: ['doc-nowhere'] })
})

await test('an effect applied twice is an effect applied once, and no list ever shrinks', () => {
  // V1, over sequences the dice chose.
  const pool = Object.values(EFFECTS).map((example) => example.effect)
  const random = seeded(20261004)
  for (let run = 0; run < 100; run += 1) {
    let once = emptyProgress()
    let twice = emptyProgress()
    for (let step = 0; step < 12; step += 1) {
      const effect = pool[Math.floor(random() * pool.length)]
      const before = once
      once = grantProgress(once, effectGrant(effect, HOUSE))
      twice = grantProgress(grantProgress(twice, effectGrant(effect, HOUSE)), effectGrant(effect, HOUSE))
      assert.deepEqual(shrunk(before, once), [])
      assert.equal(grantProgress(once, effectGrant(effect, HOUSE)), once, 'a second application made a new save')
    }
    assert.deepEqual(twice, once)
  }
})

await test('an exhibit\'s `unlocks` and a lock\'s `onOpen` are triggers, beside the authored ones', () => {
  assert.deepEqual(
    HOUSE_TRIGGERS.map((trigger) => trigger.id),
    ['key-opens-hatch', 'hatch-lights-cellar', 'attic-found', 'either-way', 'both-flags', 'exhibit:key-hook:catalogued', 'lock:hatch:opened'],
  )
  const derived = Object.fromEntries(HOUSE_TRIGGERS.map((trigger) => [trigger.id, trigger]))
  assert.deepEqual(derived['exhibit:key-hook:catalogued'].when, { catalogued: ['key-hook'] })
  assert.deepEqual(derived['exhibit:key-hook:catalogued'].effects, keyHook.unlocks)
  assert.deepEqual(derived['lock:hatch:opened'].when, { locksOpened: ['hatch'] })
  assert.deepEqual(derived['lock:hatch:opened'].effects, [{ kind: 'set-flag', flag: 'hatch-open' }])
  // A piece with no effect, or an empty list of them, compiles nothing.
  assert.ok(!HOUSE_TRIGGERS.some((trigger) => /plain-vase|loose-button|plain-door/.test(trigger.id)))
  assert.deepEqual(compileTriggers({ ...HOUSE, triggers: undefined, exhibits: [], locks: [] }), [])
})

await test('a trigger is due when its condition holds and it has not fired, in the order written', () => {
  const due = (progress: Raw) => dueTriggers(HOUSE_TRIGGERS, progress as Progress, HOUSE).map((trigger) => trigger.id)
  assert.deepEqual(due(EMPTY), [])
  const holding = { ...EMPTY, credentials: ['tool:service-key'], flags: ['hatch-open'], catalogued: ['key-hook'] }
  assert.deepEqual(due(holding), ['key-opens-hatch', 'hatch-lights-cellar', 'exhibit:key-hook:catalogued'])
  assert.deepEqual(due({ ...holding, triggersFired: ['hatch-lights-cellar', 'not-of-this-content'] }), [
    'key-opens-hatch',
    'exhibit:key-hook:catalogued',
  ])
})

await test('settling runs every due trigger to the fixed point, and writes nothing into what it was given', () => {
  const nothing = settleTriggers(EMPTY, HOUSE_TRIGGERS, HOUSE)
  assert.equal(nothing.progress, EMPTY, 'nothing fired, and the save is a new object')
  assert.deepEqual(nothing.fired, [])
  assert.equal(nothing.exhausted, false)

  const catalogued = deepFreeze({ ...emptyProgress(), catalogued: ['key-hook'] })
  const settled = settleTriggers(catalogued, HOUSE_TRIGGERS, HOUSE)
  assert.deepEqual(settled.fired, CHAIN)
  assert.equal(settled.exhausted, false)
  assert.deepEqual(settled.progress.triggersFired, CHAIN)
  assert.deepEqual(settled.progress.credentials, ['tool:service-key'])
  assert.deepEqual(settled.progress.locksOpened, ['hatch'])
  assert.deepEqual(settled.progress.locksSeen, ['hatch'])
  assert.deepEqual(settled.progress.flags, ['hatch-open'])
  assert.deepEqual(settled.progress.roomsPowered, ['cellar'])
  assert.deepEqual(settled.progress.documentsRead, ['doc-cellar'])
  assert.deepEqual(settled.progress.factsKnown, ['fact-cellar'])
  assert.deepEqual(catalogued.triggersFired, [], 'the save it was given was written to')
  // Settled is settled.
  const again = settleTriggers(settled.progress, HOUSE_TRIGGERS, HOUSE)
  assert.equal(again.progress, settled.progress)
  assert.deepEqual(again.fired, [])
})

await test('a trigger fires once: the save remembers that it did, not what it gave', () => {
  // The memory is `triggersFired`. A later lot consumes keys (L3): a save in
  // which the key is gone and the trigger is on record must not get the key
  // again, or the lock it was spent on could be opened twice.
  const spent = { ...emptyProgress(), catalogued: ['key-hook'], triggersFired: ['exhibit:key-hook:catalogued'] }
  const settled = settleTriggers(spent, HOUSE_TRIGGERS, HOUSE)
  assert.equal(settled.progress, spent)
  assert.deepEqual(settled.progress.credentials, [])
  // Two triggers with one id are one trigger to the save: the second never fires.
  const twins = compileTriggers({
    ...HOUSE,
    exhibits: [],
    locks: [],
    triggers: [
      { id: 'twin', when: {}, effects: [{ kind: 'set-flag', flag: 'first' }] },
      { id: 'twin', when: {}, effects: [{ kind: 'set-flag', flag: 'second' }] },
    ],
  })
  const once = settleTriggers(emptyProgress(), twins, HOUSE)
  assert.deepEqual(once.progress.triggersFired, ['twin'])
  assert.deepEqual(once.progress.flags, ['first'])
})

/** A chain of `length` triggers, each waiting for the flag the one before it sets. */
function chainOf(length: number): Content {
  return {
    ...HOUSE,
    exhibits: [],
    locks: [],
    triggers: Array.from({ length }, (_, index) => ({
      id: `link-${index}`,
      when: index === 0 ? {} : { flags: [`flag-${index - 1}`] },
      effects: [{ kind: 'set-flag' as const, flag: `flag-${index}` }],
    })),
  } as Content
}

await test('the fixed point has a limit: what is left over fires at the next settle', () => {
  assert.equal(TRIGGER_PASS_LIMIT, 64)
  const long = chainOf(TRIGGER_PASS_LIMIT + 6)
  const first = settleTriggers(emptyProgress(), compileTriggers(long), long)
  assert.equal(first.exhausted, true)
  assert.equal(first.fired.length, TRIGGER_PASS_LIMIT)
  assert.equal(first.progress.flags.length, TRIGGER_PASS_LIMIT)
  const second = settleTriggers(first.progress, compileTriggers(long), long)
  assert.equal(second.exhausted, false)
  assert.equal(second.fired.length, 6)
  assert.equal(second.progress.flags.length, TRIGGER_PASS_LIMIT + 6)

  // Exactly as long as the limit is not exhausted, and the limit is a parameter.
  const exact = chainOf(TRIGGER_PASS_LIMIT)
  assert.equal(settleTriggers(emptyProgress(), compileTriggers(exact), exact).exhausted, false)
  const short = settleTriggers(emptyProgress(), compileTriggers(long), long, 3)
  assert.deepEqual(short.fired, ['link-0', 'link-1', 'link-2'])
  assert.equal(short.exhausted, true)
  // Triggers that feed each other still stop: each one fires once.
  const loop = {
    ...HOUSE,
    exhibits: [],
    locks: [],
    triggers: [
      { id: 'ping', when: { anyOf: [{}, { flags: ['pong'] }] }, effects: [{ kind: 'set-flag', flag: 'ping' }] },
      { id: 'pong', when: { flags: ['ping'] }, effects: [{ kind: 'set-flag', flag: 'pong' }] },
    ],
  } as Content
  const looped = settleTriggers(emptyProgress(), compileTriggers(loop), loop)
  assert.deepEqual(looped.fired, ['ping', 'pong'])
  assert.equal(looped.exhausted, false)
})

// ---------------------------------------------------------------------------
// The store, with the house registered as the game registers the museum
// ---------------------------------------------------------------------------

const { progressRulesFor } = await import('../src/engine/contentRegistry.ts')
const register = (content: Content) => registerProgressRules(progressRulesFor(content))
/** A build whose content has no trigger: what yesterday's game was. */
const registerNoTriggers = () => registerProgressRules({ settle: (progress: Progress) => progress })

await test('the real museum registers itself, compiles the two triggers of its ending, and gives each save of the corpus what they owe it, once', async () => {
  // Importing the registry is what the canvas chunk does.
  assert.notEqual(progressRules(), null, 'importing engine/contentRegistry registered nothing')
  // It compiled none until L3 gave the night an end: the drawer hands over a
  // key as it opens, and the deed of office sets its flag as it is signed.
  assert.deepEqual(compileTriggers(MUSEUM), [
    {
      id: 'lock:office-drawer:opened',
      when: { locksOpened: ['office-drawer'] },
      effects: [{ kind: 'grant-credential', credential: { kind: 'tool', id: 'service-key' } }],
    },
    { id: 'term:termo-posse:signed', when: { termsSigned: ['termo-posse'] }, effects: [{ kind: 'set-flag', flag: 'posse-signed' }] },
  ])
  const rules = progressRulesFor(MUSEUM)
  const owed: string[] = []
  for (const [id, fixture] of Object.entries(SAVE_FIXTURES)) {
    const loaded = migrateProgress(throughJson(fixture.save.progress))
    const settled = rules.settle(loaded)
    // A save whose drawer was already open is owed the key; the others are
    // owed nothing, and get back the very save they handed in.
    const open = loaded.locksOpened.includes('office-drawer')
    if (open) {
      owed.push(id)
      assert.deepEqual(
        [settled.credentials, settled.triggersFired],
        [[...loaded.credentials, 'tool:service-key'], [...loaded.triggersFired, 'lock:office-drawer:opened']],
        id,
      )
      assert.deepEqual({ ...settled, credentials: loaded.credentials, triggersFired: loaded.triggersFired }, loaded, `${id}: settling moved something besides the key`)
    } else {
      assert.equal(settled, loaded, id)
    }
    assert.equal(rules.settle(settled), settled, `${id}: a save settled once was given something more`)
    // The store, loading the same record with the museum's rules in its slot, holds exactly that.
    const page = await openGame(fixture.save)
    assert.deepEqual(page.progress(), settled, `${id}: the store loaded something other than the save, settled`)
    for (const act of Object.values(STORE_ACTIONS)) act(page.state())
    // No action of the table opens the drawer or signs the deed: nothing else fires.
    assert.deepEqual(page.progress().triggersFired, settled.triggersFired, `${id}: a trigger fired that nothing done here is the cause of`)
    assert.deepEqual(page.progress().flags, [...settled.flags, 'effect-flag'], `${id}: the flags are the save's own and the one the table of actions grants`)
    assert.ok(!page.progress().flags.includes('posse-signed'), id)
  }
  assert.deepEqual(owed, ['production-drawer-open', 'l1-route-end', 'l2-shortcut-released'])
})

const PLAY: Record<string, (state: StoreState) => void> = {
  'see the front of the hook': (state) => state.grant(hotspotGrant(keyHook, 'front', state.progress.hotspots)),
  'see its tag': (state) => state.grant(hotspotGrant(keyHook, 'tag', state.progress.hotspots)),
  'see the scratch': (state) => state.grant(hotspotGrant(keyHook, 'scratch', state.progress.hotspots)),
  'turn the vase over': (state) => state.grant(hotspotGrant(plainVase, 'base', state.progress.hotspots)),
  'go up to the attic': (state) => state.setCurrentRoom('attic'),
  'go down to the cellar': (state) => state.setCurrentRoom('cellar'),
  'read the tray': (state) => state.grant(containerGrant(HOUSE, 'hall-tray')),
  'light the attic': (state) => state.powerRoom('attic'),
}
const EVERYTHING = {
  catalogued: ['key-hook', 'plain-vase'],
  hotspots: ['key-hook:front', 'key-hook:scratch', 'key-hook:tag', 'plain-vase:base'],
  documentsRead: ['doc-cellar', 'doc-ledger', 'doc-loose'],
  factsKnown: ['fact-cellar', 'fact-ledger', 'fact-scratch', 'fact-tag'],
  credentials: ['tool:service-key'],
  roomsVisited: ['attic', 'cellar'],
  roomsPowered: ['attic', 'cellar'],
  locksOpened: ['hatch'],
  locksSeen: ['hatch'],
  flags: ['attic-found', 'either-way', 'hatch-open'],
  triggersFired: [...HOUSE_TRIGGERS.map((trigger) => trigger.id)].sort(),
}
const atomsReached = (progress: Raw) => {
  const atoms = atomsOf(progress)
  return Object.fromEntries(Object.keys(EVERYTHING).map((field) => [field, atoms[field]]))
}

await test('a trigger fires with the action that makes its condition true, and never again', async () => {
  register(HOUSE)
  const page = await openGame()
  page.state().setCurrentRoom('attic')
  assert.deepEqual(page.progress().triggersFired, [], 'half a condition fired the trigger')
  PLAY['read the tray'](page.state())
  assert.deepEqual(page.progress().triggersFired, ['attic-found'])
  assert.deepEqual(page.progress().flags, ['attic-found'])
  // Everything that made it true, done again.
  page.state().setCurrentRoom('hall')
  page.state().setCurrentRoom('attic')
  PLAY['read the tray'](page.state())
  page.state().recordDocument('doc-loose')
  assert.equal(count(page.progress().triggersFired, 'attic-found'), 1)
  assert.deepEqual(page.progress().flags, ['attic-found'])
})

await test('a chain of consequences closes in one commit: the store speaks once', async () => {
  register(HOUSE)
  const page = await openGame()
  assert.equal(page.timersAsked(), 0, 'a new game with nothing owed asked for a write')
  assert.equal(page.notifications(() => PLAY['see the front of the hook'](page.state())), 1)
  assert.deepEqual(page.progress().triggersFired, [])
  // A change to the save asks the browser for a write, without waiting for the tab to close.
  assert.equal(page.timersAsked(), 1, 'the detail was not scheduled to disk')
  // The last required detail: catalogue → key → hatch → flag → light and paper.
  const told = page.notifications(() => PLAY['see its tag'](page.state()))
  assert.equal(told, 1, 'the consequences reached the subscribers one write at a time')
  assert.equal(page.timersAsked(), 1, 'and the write still pending covers them: one timer, not one per change')
  const progress = page.progress()
  assert.deepEqual(progress.catalogued, ['key-hook'])
  assert.deepEqual(progress.triggersFired, CHAIN)
  assert.deepEqual(progress.credentials, ['tool:service-key'])
  assert.deepEqual(progress.locksOpened, ['hatch'])
  assert.deepEqual(progress.locksSeen, ['hatch'])
  assert.deepEqual(progress.flags, ['hatch-open'])
  assert.deepEqual(progress.roomsPowered, ['cellar'])
  assert.deepEqual(progress.documentsRead, ['doc-cellar'])
  assert.deepEqual(progress.factsKnown, ['fact-tag', 'fact-cellar'])
  // And it is what reaches the disk.
  page.leave()
  assert.deepEqual(page.savedProgress(), throughJson(progress))
})

await test('an optional detail found later does not repeat the piece\'s effect (S11)', async () => {
  register(HOUSE)
  const page = await openGame()
  const grants: Raw[] = []
  const see = (detail: string) => {
    const grant = hotspotGrant(keyHook, detail, page.progress().hotspots)
    grants.push(grant)
    page.state().grant(grant)
  }
  see('front')
  see('tag')
  const afterCatalogue = page.progress()
  assert.equal(count(afterCatalogue.triggersFired, 'exhibit:key-hook:catalogued'), 1, 'the piece\'s effect is not a trigger that fired')
  assert.deepEqual(afterCatalogue.credentials, ['tool:service-key'])

  see('scratch')
  // What the verb hands over is the detail. The effect belongs to the trigger,
  // which fired: the old loop applied `unlocks` at every detail seen with the
  // required ones complete.
  for (const grant of grants) {
    const beyond = Object.keys(grant).filter((field) => !DETAIL_WRITES.includes(field))
    assert.deepEqual(beyond, [], 'a detail wrote what only the piece\'s effect may write')
  }
  const progress = page.progress()
  assert.deepEqual(progress.hotspots, ['key-hook:front', 'key-hook:tag', 'key-hook:scratch'])
  assert.deepEqual(progress.factsKnown, ['fact-tag', 'fact-cellar', 'fact-scratch'])
  assert.equal(count(progress.triggersFired, 'exhibit:key-hook:catalogued'), 1)
  assert.equal(progress.triggersFired, afterCatalogue.triggersFired, 'the detail found later touched the record of what fired')
  assert.equal(progress.credentials, afterCatalogue.credentials, 'the key was handed over again')
  // With the key spent (L3), the later detail does not give it back.
  page.slip({ credentials: [] })
  page.state().grant(hotspotGrant(keyHook, 'scratch', page.progress().hotspots))
  page.state().grant(hotspotGrant(keyHook, 'tag', page.progress().hotspots))
  assert.deepEqual(page.progress().credentials, [])
})

await test('the order does not matter: 200 shuffled orders of the same actions reach the same atoms', async () => {
  register(HOUSE)
  const page = await openGame()
  const names = Object.keys(PLAY)
  for (const name of names) PLAY[name](page.state())
  assert.deepEqual(atomsReached(page.progress()), EVERYTHING, 'the order as written')

  const random = seeded(1895)
  const seen = new Set<string>()
  for (let run = 0; run < 200; run += 1) {
    const order = shuffled(names, random)
    seen.add(order.join())
    page.state().resetProgress()
    for (const name of order) {
      const before = throughJson(page.progress())
      PLAY[name](page.state())
      assert.deepEqual(shrunk(before, page.progress()), [], `${name} took something out`)
      assert.deepEqual(dueTriggers(HOUSE_TRIGGERS, page.progress(), HOUSE), [], `after "${name}" a trigger was still owed`)
    }
    assert.deepEqual(atomsReached(page.progress()), EVERYTHING, `order ${run}: ${order.join(' → ')}`)
    for (const id of page.progress().triggersFired) assert.equal(count(page.progress().triggersFired, id), 1, id)
  }
  assert.ok(seen.size > 190, 'the dice kept giving the same order')
})

await test('a reload in the middle changes nothing: serialise, load, go on, and the end is the same', async () => {
  register(HOUSE)
  const names = Object.keys(PLAY)
  const random = seeded(1896)
  for (let run = 0; run < 24; run += 1) {
    const order = shuffled(names, random)
    const cut = 1 + Math.floor(random() * (names.length - 1))
    const first = await openGame()
    for (const name of order.slice(0, cut)) PLAY[name](first.state())
    first.leave()
    const written = first.savedProgress()!
    const second = await openGame(first.savedText()!)
    // Everything except where the player stands, which a session always
    // resets; and but for one thing the load itself adds. The loader is the
    // game's own, and takes a save that never heard the porter's
    // introduction (every save of this house: it has no porter) for one
    // from before he had a call for each milestone, so the calls for what
    // it has already done count as heard (`PRE_POSSE_SAVE`). Nothing else moves.
    const loadedLists = atomsOf(second.progress())
    const writtenLists = atomsOf(written)
    const oldNews = loadedLists.radioCalls.filter((id) => !writtenLists.radioCalls.includes(id))
    assert.deepEqual({ ...loadedLists, radioCalls: writtenLists.radioCalls }, writtenLists, 'the load changed what the first session left')
    assert.deepEqual(
      oldNews.filter((id) => !PRE_POSSE_SAVE.oldNews.some((news) => news.callId === id)),
      [],
      'the load added a call that is not old news',
    )
    for (const name of order.slice(cut)) PLAY[name](second.state())
    assert.deepEqual(atomsReached(second.progress()), EVERYTHING, `cut at ${cut} of ${order.join(' → ')}`)
  }
})

await test('a save that already met a condition fires when the content registers (R3)', async () => {
  // The rail of L3's key: the drawer a player opened under yesterday's build
  // starts giving something, and the player must not have to open it again.
  registerNoTriggers()
  const before = saveOf({ version: 1, radioCalls: [], catalogued: ['key-hook'], hotspots: ['key-hook:front', 'key-hook:tag'], locksOpened: ['hatch'] })
  const page = await openGame(before)
  assert.deepEqual(page.progress().triggersFired, [])
  assert.deepEqual(page.progress().flags, [])

  // The canvas chunk arrives: one write, with everything the save was owed.
  const told = page.notifications(() => register(HOUSE))
  assert.equal(told, 1)
  const progress = page.progress()
  assert.deepEqual([...progress.triggersFired].sort(), [...CHAIN].sort())
  assert.deepEqual(progress.flags, ['hatch-open'])
  assert.deepEqual(progress.credentials, ['tool:service-key'])
  assert.deepEqual(progress.roomsPowered, ['cellar'])
  assert.deepEqual(progress.documentsRead, ['doc-cellar'])
  page.leave()
  assert.deepEqual(page.savedProgress(), throughJson(progress), 'what the registration settled never reached the disk')
  // Registering again (a hot reload of the content) owes nothing and says nothing.
  assert.equal(page.notifications(() => register(HOUSE)), 0)

  // A store created after the registration (a hot reload of the store, the
  // playthrough robot) settles what it loaded as it is created.
  const late = await openGame(before)
  assert.deepEqual(atomsOf(late.progress()), atomsOf(progress), 'a store created after the content never settled its save')
  // And asks for the write itself: nothing else may ever change in that tab.
  late.idleAfterBirth()
  assert.deepEqual(atomsOf(late.savedProgress()!), atomsOf(progress), 'what it settled at creation was not scheduled to disk')
  // A store with nothing owed asks for no write as it is created.
  const settled = await openGame(late.savedText()!)
  settled.idleAfterBirth()
  assert.equal(settled.savedText(), late.savedText())
})

await test("a term's signature sets its flag as a trigger: once, in any order, and for a save that arrives signed and without the flag (L3)", async () => {
  // The verb that signs records the signature and nothing else; the flag the
  // term sets is compiled from the term, like a lock's `onOpen`. So it fires
  // once, whoever signed (this tab, another, a build that knew the verb and
  // not the consequence), and what waits on the flag follows in the same write.
  const SIGNING = {
    ...HOUSE,
    terms: [
      { id: 'term-keys', titleKey: 'term.keys', bodyKey: 'term.keys.body', presentedWhen: {}, when: {}, grants: 'keys-signed', mentions: [] },
      { id: 'term-house', titleKey: 'term.house', bodyKey: 'term.house.body', presentedWhen: {}, when: { powered: ['cellar'] }, grants: 'house-signed', mentions: [] },
    ],
    triggers: [...(HOUSE.triggers ?? []), { id: 'house-opens-the-night', when: { flags: ['house-signed'], termsSigned: ['term-keys'] }, effects: [{ kind: 'set-flag', flag: 'night-open' }] }],
  } as unknown as Content & typeof MUSEUM
  const compiled = compileTriggers(SIGNING)
  assert.deepEqual(
    compiled.map((trigger) => trigger.id),
    [...HOUSE.triggers!.map((trigger) => trigger.id), 'house-opens-the-night', 'exhibit:key-hook:catalogued', 'lock:hatch:opened', 'term:term-keys:signed', 'term:term-house:signed'],
  )
  const derived = Object.fromEntries(compiled.map((trigger) => [trigger.id, trigger]))
  // The trigger asks for the signature, not for what the desk asked before letting it be made.
  assert.deepEqual(derived['term:term-house:signed'], { id: 'term:term-house:signed', when: { termsSigned: ['term-house'] }, effects: [{ kind: 'set-flag', flag: 'house-signed' }] })
  for (const trigger of compiled) assert.equal(conditionClass(trigger.when), 'positive', trigger.id)
  // A house with no term compiles none.
  assert.ok(!HOUSE_TRIGGERS.some((trigger) => trigger.id.startsWith('term:')))

  // Pure: one signature, the flag; both, and what waits on the two of them.
  const one = settleTriggers({ ...emptyProgress(), termsSigned: ['term-house'] }, compiled, SIGNING)
  assert.deepEqual(one.fired, ['term:term-house:signed'])
  assert.deepEqual(one.progress.flags, ['house-signed'])
  const both = settleTriggers({ ...one.progress, termsSigned: ['term-house', 'term-keys'] }, compiled, SIGNING)
  // In the order written: the authored trigger already has what it waited for.
  assert.deepEqual(both.fired, ['house-opens-the-night', 'term:term-keys:signed'])
  assert.deepEqual(both.progress.flags, ['house-signed', 'night-open', 'keys-signed'])
  assert.equal(settleTriggers(both.progress, compiled, SIGNING).progress, both.progress, 'settled is settled')

  // In the store: the signature, the flag and what follows are one write, and a second signature is none.
  register(SIGNING)
  const page = await openGame()
  assert.equal(page.notifications(() => page.state().grant({ termsSigned: ['term-keys'] })), 1)
  assert.deepEqual(page.progress().flags, ['keys-signed'])
  assert.deepEqual(page.progress().triggersFired, ['term:term-keys:signed'])
  assert.equal(page.notifications(() => page.state().grant({ termsSigned: ['term-keys'] })), 0, 'a term signed twice told somebody')
  assert.equal(page.notifications(() => page.state().grant({ termsSigned: ['term-house'] })), 1)
  assert.deepEqual(page.progress().flags, ['keys-signed', 'house-signed', 'night-open'])
  assert.equal(count(page.progress().triggersFired, 'term:term-house:signed'), 1)
  page.leave()
  const back = await openGame(page.savedText()!)
  assert.deepEqual(back.progress().triggersFired, page.progress().triggersFired, 'the trigger fired again on the way through the disk')
  assert.deepEqual(back.progress().flags, ['keys-signed', 'house-signed', 'night-open'])

  // Any order of the two signatures among everything else the house offers: the same end.
  const moves: Record<string, (state: StoreState) => void> = {
    ...PLAY,
    'sign for the keys': (state) => state.grant({ termsSigned: ['term-keys'] }),
    'sign for the house': (state) => state.grant({ termsSigned: ['term-house'] }),
  }
  const random = seeded(1897)
  const ends = new Set<string>()
  for (let run = 0; run < 60; run += 1) {
    back.state().resetProgress()
    for (const name of shuffled(Object.keys(moves), random)) {
      moves[name](back.state())
      assert.deepEqual(dueTriggers(compiled, back.progress(), SIGNING), [], `after "${name}" a trigger was still owed`)
    }
    const end = atomsOf(back.progress())
    assert.deepEqual(end.flags, ['attic-found', 'either-way', 'hatch-open', 'house-signed', 'keys-signed', 'night-open'], `order ${run}`)
    assert.deepEqual(end.termsSigned, ['term-house', 'term-keys'])
    for (const id of back.progress().triggersFired) assert.equal(count(back.progress().triggersFired, id), 1, id)
    ends.add(JSON.stringify(end))
  }
  assert.equal(ends.size, 1, 'the order of the signatures changed where the night ends')

  // A save that arrives signed and without the flag: at the registration, and at the load.
  registerNoTriggers()
  const signedElsewhere = saveOf({ version: 1, radioCalls: [], termsSigned: ['term-keys', 'a-term-this-build-never-had'] })
  const waiting = await openGame(signedElsewhere)
  assert.deepEqual(waiting.progress().flags, [])
  assert.equal(waiting.notifications(() => register(SIGNING)), 1)
  assert.deepEqual(waiting.progress().flags, ['keys-signed'])
  assert.deepEqual(waiting.progress().triggersFired, ['term:term-keys:signed'])
  // A signature of a term this build does not have stays, and sets nothing.
  assert.deepEqual(waiting.progress().termsSigned, ['term-keys', 'a-term-this-build-never-had'])
  const late = await openGame(signedElsewhere)
  assert.deepEqual(late.progress().flags, ['keys-signed'], 'a store created after the content never gave the flag')
  // And the other way round: the flag and the trigger on record with the
  // signature gone (a save that went through a build from before the field).
  // Nothing is taken back, and nothing fires.
  const flagOnly = await openGame(saveOf({ version: 1, radioCalls: [], flags: ['keys-signed'], triggersFired: ['term:term-keys:signed'] }))
  assert.deepEqual([flagOnly.progress().flags, flagOnly.progress().termsSigned, flagOnly.progress().triggersFired], [['keys-signed'], [], ['term:term-keys:signed']])
})

await test('the limit holds in the store too: the rest fires with the next commit', async () => {
  const long = chainOf(TRIGGER_PASS_LIMIT + 6)
  register(long)
  const page = await openGame()
  assert.equal(page.progress().flags.length, TRIGGER_PASS_LIMIT, 'creation settled past the limit, or not at all')
  // Any commit, even one that adds nothing of its own.
  assert.equal(page.notifications(() => page.state().grant({})), 1)
  assert.equal(page.progress().flags.length, TRIGGER_PASS_LIMIT + 6)
  assert.deepEqual(dueTriggers(compileTriggers(long), page.progress(), long), [])
  assert.equal(page.notifications(() => page.state().grant({})), 0)
})

await test('a grant that adds nothing tells nobody, and writes nothing', async () => {
  register(HOUSE)
  const page = await openGame()
  PLAY['read the tray'](page.state())
  page.leave()
  const written = page.savedText()
  const progress = page.progress()
  const quiet: Record<string, () => void> = {
    'an empty grant': () => page.state().grant({}),
    'a grant of what is there': () => page.state().grant({ documentsRead: ['doc-loose'], factsKnown: ['fact-ledger'] }),
    'the same container again': () => PLAY['read the tray'](page.state()),
    'recordDocument of a read document': () => page.state().recordDocument('doc-ledger'),
    'recordFact of a known fact': () => page.state().recordFact('fact-ledger'),
  }
  const asked = page.timersAsked()
  for (const [name, act] of Object.entries(quiet)) {
    assert.equal(page.notifications(act), 0, name)
    assert.equal(page.progress(), progress, `${name} made a new save`)
    assert.equal(page.timersAsked(), asked, `${name} asked the browser for a write`)
  }
  page.leave()
  assert.equal(page.savedText(), written)
})

await test('a trigger id the content does not have stays in the save', async () => {
  // A save a later lot wrote, loaded in this build's tab.
  register(HOUSE)
  const later = saveOf({ version: 1, contentLot: 7, radioCalls: [], triggersFired: ['seq-reopening', 'exhibit:key-hook:catalogued'], catalogued: ['key-hook'] })
  const page = await openGame(later)
  assert.deepEqual(page.progress().triggersFired, ['seq-reopening', 'exhibit:key-hook:catalogued'])
  // And the one it does have is taken at its word: it fired, there.
  assert.deepEqual(page.progress().credentials, [])
  for (const name of Object.keys(PLAY)) PLAY[name](page.state())
  page.leave()
  const written = page.savedProgress()!
  assert.ok((written.triggersFired as string[]).includes('seq-reopening'), 'the write dropped another build\'s trigger')
  assert.equal(written.contentLot, 7)
  const back = await openGame(page.savedText()!)
  assert.ok(back.progress().triggersFired.includes('seq-reopening'))
})

/** A consequence owed from the start, and one a test can make owed behind the store's back. */
const OWING = {
  ...HOUSE,
  exhibits: [],
  locks: [],
  triggers: [
    { id: 'night-begins', when: {}, effects: [{ kind: 'set-flag', flag: 'night-begun' }] },
    { id: 'debt-paid', when: { flags: ['owed'] }, effects: [{ kind: 'set-flag', flag: 'paid' }] },
  ],
} as Content

await test('every action of the store either leaves the save alone or leaves it settled', async () => {
  register(OWING)
  const owing = compileTriggers(OWING)
  const settledBy: string[] = []
  const leftAloneBy: string[] = []

  const probe = await openGame()
  const functions = Object.entries(probe.state())
    .filter(([, value]) => typeof value === 'function')
    .map(([name]) => name)
  assert.deepEqual(
    [...functions].sort(),
    [...Object.keys(STORE_ACTIONS), 'resetProgress'].sort(),
    'the store and the table of actions disagree: an action nobody ran could write a save with a consequence owed',
  )

  for (const [name, act] of Object.entries(STORE_ACTIONS)) {
    const page = await openGame()
    assert.deepEqual(page.progress().flags, ['night-begun'], 'creation did not settle')
    // The debt goes in without any action of the store: nothing has settled it.
    page.slip({ flags: ['night-begun', 'owed'] })
    const owed = page.progress()
    assert.deepEqual(dueTriggers(owing, owed, OWING).map((trigger) => trigger.id), ['debt-paid'])
    act(page.state())
    if (page.progress() === owed) {
      leftAloneBy.push(name)
      continue
    }
    assert.deepEqual(dueTriggers(owing, page.progress(), OWING), [], `${name} wrote the save and left a trigger owed`)
    assert.ok(page.progress().flags.includes('paid'), name)
    settledBy.push(name)
  }
  // By name, so that an action moving from one list to the other is a decision.
  assert.deepEqual(settledBy.sort(), [
    'advanceRadio',
    // The last step of a directed sequence records it as seen (L3).
    'advanceSequence',
    'carryDevice',
    'dropRadio',
    'grant',
    'grantCredential',
    'openLock',
    'powerRoom',
    'recordCatalogued',
    'recordClockSeconds',
    'recordDocument',
    'recordFact',
    'recordHint',
    'recordHotspot',
    'recordRadioCall',
    'rememberRadioCall',
    'setCurrentRoom',
    'start',
  ])
  assert.deepEqual(leftAloneBy.sort(), [
    'clearRadioHangUp',
    'resetTouch',
    'setActiveLock',
    'setExamining',
    'setFocusedContainer',
    'setFocusedDevice',
    'setFocusedExhibit',
    'setFocusedPowerControl',
    'setFocusedTransitionDoor',
    'setJournalTab',
    'setNotebookPage',
    'setOpenedContainer',
    'setPointerLocked',
    'setSceneReady',
    'setSetting',
    'setTouchLook',
    'setTouchMove',
    'setVisibleRooms',
    'startRadio',
    // Putting a sequence on screen, and taking it off unseen, are the session's.
    'startSequence',
    'stopRadio',
    'stopSequence',
    'toggleFlashlight',
  ])

  // "New game" erases the debt with everything else, and the new save starts settled.
  const page = await openGame()
  page.slip({ flags: ['night-begun', 'owed'], catalogued: ['key-hook'] })
  page.state().resetProgress()
  assert.deepEqual(page.progress(), { ...emptyProgress(), flags: ['night-begun'], triggersFired: ['night-begins'] })
  assert.deepEqual(page.savedProgress(), throughJson(page.progress()), 'a reload would bring the old save back')
})

await test('one write for what an action means and what follows from it', async () => {
  // The session fields an action changes leave in the same notification as
  // the save, consequences included: a subscriber never sees half of it.
  register(OWING)
  const page = await openGame()
  page.slip({ flags: ['night-begun', 'owed'] })
  const seen: { room: string; previous: string | null; flags: readonly string[] }[] = []
  const stop = page.store.useMuseum.subscribe((state) =>
    seen.push({ room: state.currentRoom, previous: state.previousRoom, flags: state.progress.flags }),
  )
  page.state().setCurrentRoom('attic')
  stop()
  assert.deepEqual(seen, [{ room: 'attic', previous: 'office', flags: ['night-begun', 'owed', 'paid'] }])

  const radio = await openGame()
  radio.slip({ flags: ['night-begun', 'owed'] })
  radio.state().startRadio({ deviceId: 'office-radio', speakerKey: 'radio.speaker.porter', lineKeys: ['a'], callId: 'a-call', hangsUpFor: 5 })
  const heard: { live: boolean; hungUp: boolean; calls: readonly string[]; paid: boolean }[] = []
  const stopRadio = radio.store.useMuseum.subscribe((state) =>
    heard.push({
      live: state.radio !== null,
      hungUp: state.radioHungUpUntil !== null,
      calls: state.progress.radioCalls,
      paid: state.progress.flags.includes('paid'),
    }),
  )
  radio.state().advanceRadio()
  stopRadio()
  assert.deepEqual(heard, [{ live: false, hungUp: true, calls: ['a-call'], paid: true }])
  // A transmission that is not a call still ends, with nothing to write.
  radio.state().startRadio({ deviceId: 'office-radio', speakerKey: 'radio.speaker.porter', lineKeys: ['a'] })
  const settled = radio.progress()
  assert.equal(radio.notifications(() => radio.state().advanceRadio()), 1)
  assert.equal(radio.state().radio, null)
  assert.equal(radio.progress(), settled)

  const title = await openGame()
  assert.equal(title.notifications(() => title.state().start()), 1)
  assert.equal(title.state().started, true)
  assert.deepEqual(title.progress().roomsVisited, ['office'])
  // Entering again from the same room is no news to the save.
  const entered = title.progress()
  const asked = title.timersAsked()
  title.state().start()
  assert.equal(title.progress(), entered, 'entering again made a new save')
  assert.equal(title.timersAsked(), asked, 'and asked for a write of it')
})

await test('a listener of the registry can leave, as the store does when it is replaced', () => {
  let told = 0
  const leave = onProgressRulesRegistered(() => {
    told += 1
  })
  registerNoTriggers()
  assert.equal(told, 1)
  leave()
  registerNoTriggers()
  assert.equal(told, 1, 'a store Vite replaced would go on writing its stale save')
})

// ---------------------------------------------------------------------------
// The components call what this suite proves
// ---------------------------------------------------------------------------

const SRC = resolve(ROOT, 'src')
const readSource: SourceReader = (path) => readText(resolve(SRC, path))
const components = (readdirSync(SRC, { recursive: true }) as string[])
  .map((path) => path.replaceAll('\\', '/'))
  .filter((path) => path.endsWith('.tsx'))
  .sort()

await test('the examine view, the canvas and the store are wired to the one door', () => {
  assert.ok(components.includes('engine/Interaction.tsx') && components.length > 20, 'the list of components is not the source tree')
  assert.deepEqual(progressWiringProblems(readSource, components), [])

  // The check has to bite. Each of these is a refactor it exists to catch,
  // applied to the real source in memory.
  const changed =
    (path: string, from: string | RegExp, to: string): SourceReader =>
    (asked) => {
      if (asked !== path) return readSource(asked)
      const source = readSource(asked)
      const next = source.replace(from, to)
      assert.notEqual(next, source, `the refactor of ${path} found nothing to change`)
      return next
    }
  const refactors: readonly (readonly [string, SourceReader])[] = [
    [
      'the detail written by the component again',
      changed(
        'engine/Interaction.tsx',
        /museum\.grant\(hotspotGrant\(exhibit, hotspot\.id, [^)]*\)\)/,
        'museum.recordHotspot(exhibit.id, hotspot.id)',
      ),
    ],
    [
      'the effects of the piece applied at every detail',
      changed(
        'engine/Interaction.tsx',
        /(museum\.grant\(hotspotGrant\(exhibit, hotspot\.id, [^)]*\)\))/,
        '$1\n        for (const effect of exhibit.unlocks ?? []) museum.applyUnlockEffect(effect)',
      ),
    ],
    [
      'the catalogue written beside the grant',
      changed(
        'engine/Interaction.tsx',
        /(museum\.grant\(hotspotGrant\(exhibit, hotspot\.id, [^)]*\)\))/,
        '$1\n        museum.recordCatalogued(exhibit.id)',
      ),
    ],
    // The piece with two required details is catalogued by the second one
    // counting the first. Handed an empty list instead of the save's, every
    // detail is the only one seen: the Spalding never catalogues.
    [
      'a detail judged without the details the save already holds',
      changed('engine/Interaction.tsx', 'hotspotGrant(exhibit, hotspot.id, museum.progress.hotspots)', 'hotspotGrant(exhibit, hotspot.id, [])'),
    ],
    [
      'a detail judged by the details of this visit only',
      changed('engine/Interaction.tsx', 'hotspotGrant(exhibit, hotspot.id, museum.progress.hotspots)', 'hotspotGrant(exhibit, hotspot.id, [...seenRef.current])'),
    ],
    ['the registry no longer imported by the canvas', changed('scenes/MuseumCanvas.tsx', /import '\.\.\/engine\/contentRegistry'\n/, '')],
    [
      'the store importing the museum',
      changed('state/store.ts', "import { create } from 'zustand'", "import { create } from 'zustand'\nimport { MUSEUM } from '../content/museum'"),
    ],
    [
      'the store importing the triggers',
      changed(
        'state/store.ts',
        "import { create } from 'zustand'",
        "import { create } from 'zustand'\nimport { settleTriggers } from '../engine/triggers.ts'",
      ),
    ],
    ['a replaced store left listening to the registry', changed('state/store.ts', /\n {4}forgetRules\(\)\n/, '\n')],
    [
      'the store fetching the registry by itself',
      changed('state/store.ts', 'const initialText = storedText()', "const initialText = storedText()\nvoid import('../engine/contentRegistry.ts')"),
    ],
  ]
  const uncaught = refactors
    .filter(([, reader]) => progressWiringProblems(reader, components).length === 0)
    .map(([name]) => name)
  assert.deepEqual(uncaught, [], 'a refactor this check exists to catch went through')
  // A type the store borrows from the schema is erased, and is not an import.
  assert.ok(/^import type \{[^}]*\} from '\.\.\/content\/schema'/m.test(readSource('state/store.ts')))
})

done('trigger checks')
