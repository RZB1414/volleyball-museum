/**
 * Headless proof of what a lock does when the player touches it.
 *
 *   npm run test:locks
 *
 * The rule used to be written three times, in three components, and they did
 * not agree. A cabinet with a shut lock opened the keypad whatever kind of
 * lock it was, and the keypad draws nothing for a lock that is not a code: a
 * modal with nothing in it, the pointer loose and the world deaf to E. The
 * keypad recorded the documents of the drawer it opened and not the facts
 * they reveal; the drawer opened by hand recorded both. And the plan listed
 * every shut lock in the building, touched or not.
 *
 * Now there is one function, `attemptLock`, and it hands back an outcome and
 * a grant. Only one outcome may open a modal. The plan lists what the save
 * says was touched. The kinds of lock that have a panel are the knowledge
 * lock alone; a ritual arrives with its own lot, and until then it refuses,
 * out loud.
 *
 * A key that is spent (L3) opens its lock by touch like any tool, and is
 * never taken out of the save: it is spent because its one lock is open
 * (`toolSpent`). That is asked here of two tabs that are alive
 * (`lib/liveTabs.ts`), because a key removed from a list is exactly what the
 * join of two tabs would bring back.
 */

import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { openBrowser } from './lib/liveTabs.ts'
import { progressWiringProblems, type SourceReader } from './lib/runtimeWiring.ts'
import { openGame, saveOf, seeded, suite, throughJson } from './lib/storePage.ts'
import { readText } from './lib/readText.ts'

const { MUSEUM } = await import('../src/content/museum.ts')
const { fixtureLot, SAVE_FIXTURES } = await import('../src/content/saveFixtures.ts')
const { progressRulesFor } = await import('../src/engine/contentRegistry.ts')
const { attemptLock, containerOpen, lockBars, lockPanel, lockStatus, pendingLocks, toolSpent } = await import('../src/engine/lockRules.ts')
const { containerGrant } = await import('../src/engine/progressGrants.ts')
const { credentialsTaken } = await import('../src/ui/promptRules.ts')
const { effectGrant } = await import('../src/engine/triggers.ts')
const { emptyProgress } = await import('../src/state/progressFields.ts')
const { registerProgressRules } = await import('../src/state/progressRules.ts')

type Lock = Parameters<typeof attemptLock>[0]
type Attempt = Parameters<typeof attemptLock>[3]
type Progress = ReturnType<typeof emptyProgress>
type Raw = Record<string, unknown>
type Content = Parameters<typeof progressRulesFor>[0]

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { test, done } = suite('Locks')

// ---------------------------------------------------------------------------
// One lock of every kind
// ---------------------------------------------------------------------------

const HINTS = { highlightAfterMs: 45_000, audioAfterMs: 90_000, revealAfterAttempts: 3 }
const FACTS = [
  { id: 'the-year', claimKey: 'fact.the-year', value: '1896', sources: [], confidence: 'high', verifiedAt: '2026-10-04', usedAsCode: true },
] as unknown as Parameters<typeof attemptLock>[1]

const LOCKS = {
  drawer: { kind: 'knowledge', id: 'drawer', factId: 'the-year', digits: 4, mapLabelKey: 'lock.drawer', hints: HINTS, sourceExhibitId: 'portrait' },
  'staff-door': { kind: 'badge', id: 'staff-door', requires: 'indoor', mapLabelKey: 'lock.staff-door' },
  plinth: { kind: 'medallion-plinth', id: 'plinth', requires: ['founding', 'lineage'], mapLabelKey: 'lock.plinth' },
  hatch: { kind: 'tool', id: 'hatch', requires: 'service-key', consumesTool: false, mapLabelKey: 'lock.hatch' },
  safe: { kind: 'tool', id: 'safe', requires: 'service-key', consumesTool: true, mapLabelKey: 'lock.safe' },
  shelf: { kind: 'ritual', id: 'shelf', puzzle: 'chronological-order', mapLabelKey: 'lock.shelf', hints: HINTS },
} as unknown as Record<string, Lock>
const ALL_LOCKS = Object.values(LOCKS)

/** Every credential any of them asks for, in the save's spelling. */
const KEYRING = ['badge:indoor', 'medallion:founding', 'medallion:lineage', 'tool:service-key']
/** The one key that is spent on its lock. */
const KEY = 'tool:service-key'
const TOUCH: Attempt = { kind: 'touch' }
const code = (entry: string): Attempt => ({ kind: 'code', entry })
const ATTEMPTS: readonly Attempt[] = [TOUCH, code('1896'), code('1895'), code('')]

const holding = (patch: Partial<Progress> = {}): Progress => ({ ...emptyProgress(), ...patch })
const attempt = (lock: Lock, progress: Progress, what: Attempt, facts = FACTS) => attemptLock(lock, facts, progress, what)
const seen = (lock: Lock) => ({ locksSeen: [lock.id] })
const opened = (lock: Lock) => ({ outcome: 'opened', grant: { locksSeen: [lock.id], locksOpened: [lock.id] } })

/** The kinds of lock the schema declares, read off it: scripts are not type-checked. */
const schemaLockKinds = (() => {
  const schema = readText(resolve(ROOT, 'src/content/schema.ts'))
  const declared = schema.slice(schema.indexOf('export type Lock ='), schema.indexOf('export type UnlockEffect ='))
  return [...declared.matchAll(/readonly kind: '([a-z-]+)'/g)].map((match) => match[1]).sort()
})()

await test('the suite has a lock of every kind the schema declares', () => {
  assert.deepEqual(schemaLockKinds, ['badge', 'knowledge', 'medallion-plinth', 'ritual', 'tool'])
  assert.deepEqual([...new Set(ALL_LOCKS.map((lock) => lock.kind))].sort(), schemaLockKinds)
})

await test('the keys the schema names are the ones the story has, and this suite asks for no other (D2)', () => {
  // The suites are run by Node with their types stripped, so a retired id
  // here would go on passing: the unions are read off the schema itself.
  const schema = readText(resolve(ROOT, 'src/content/schema.ts'))
  const union = (name: string) => {
    const declared = new RegExp(`export type ${name} =([^\\n]+)`).exec(schema)?.[1] ?? ''
    return [...declared.matchAll(/'([a-z-]+)'/g)].map((match) => match[1])
  }
  // Three medals for the three parts of the house: the curator's own, the
  // founding wing, the lineage of the ball in the hall.
  assert.deepEqual(union('MedallionId'), ['curator', 'founding', 'lineage'])
  // No handle for the breakers: the panels have their own lever, and a tool
  // nothing asks for is a key to nothing.
  assert.deepEqual(union('ToolId'), ['service-key', 'crate-dolly', 'step-ladder'])
  assert.deepEqual(union('BadgeId'), ['indoor', 'beach', 'sitting', 'snow'])
  const named = new Set([
    ...union('BadgeId').map((id) => `badge:${id}`),
    ...union('MedallionId').map((id) => `medallion:${id}`),
    ...union('ToolId').map((id) => `tool:${id}`),
  ])
  assert.deepEqual(KEYRING.filter((key) => !named.has(key)), [], 'a key of this suite that the schema does not name')
})

// ---------------------------------------------------------------------------
// The table of outcomes (lot plan, §3.5), row by row
// ---------------------------------------------------------------------------

await test('a lock that is already open answers "open", whatever is tried and whoever tries', () => {
  for (const lock of ALL_LOCKS) {
    for (const keyring of [[], KEYRING]) {
      const progress = holding({ locksOpened: [lock.id], locksSeen: [lock.id], credentials: keyring })
      for (const what of ATTEMPTS) assert.deepEqual(attempt(lock, progress, what), { outcome: 'open' }, `${lock.id}, ${JSON.stringify(what)}`)
    }
    assert.equal(lockStatus(lock.id, holding({ locksOpened: [lock.id] })), 'open')
    assert.equal(lockStatus(lock.id, holding({ locksOpened: ['another'], locksSeen: [lock.id] })), 'closed')
  }
})

await test('a knowledge lock asks for its keypad, and opens with the fact and with nothing else', () => {
  const { drawer } = LOCKS
  assert.deepEqual(attempt(drawer, holding(), TOUCH), { outcome: 'ask', panel: 'keypad', grant: seen(drawer) })
  assert.deepEqual(attempt(drawer, holding(), code('1896')), opened(drawer))
  for (const wrong of ['1895', '189', '18960', '', ' 1896', '1896 ', '0000']) {
    assert.deepEqual(
      attempt(drawer, holding(), code(wrong)),
      { outcome: 'refused', reason: 'wrong-code', grant: seen(drawer) },
      JSON.stringify(wrong),
    )
  }
  // A keyring opens no keypad.
  assert.equal(attempt(drawer, holding({ credentials: KEYRING }), TOUCH).outcome, 'ask')
  assert.equal(attempt(drawer, holding({ credentials: KEYRING }), code('1895')).outcome, 'refused')

  // The real drawer, with the real fact.
  const real = MUSEUM.locks.find((lock) => lock.id === 'office-drawer')!
  assert.deepEqual(attemptLock(real, MUSEUM.facts, holding(), TOUCH), { outcome: 'ask', panel: 'keypad', grant: { locksSeen: ['office-drawer'] } })
  assert.equal(attemptLock(real, MUSEUM.facts, holding(), code('1896')).outcome, 'opened')
  assert.equal(attemptLock(real, MUSEUM.facts, holding(), code('1897')).outcome, 'refused')
})

await test('a lock that takes a credential opens to whoever holds all of it, by touch', () => {
  const cases: [Lock, string[]][] = [
    [LOCKS['staff-door'], ['badge:indoor']],
    [LOCKS.plinth, ['medallion:founding', 'medallion:lineage']],
    [LOCKS.hatch, ['tool:service-key']],
    // The key that is spent on its lock (L3): the same row as the tool that
    // is not. It refused as unsupported until the safe arrived.
    [LOCKS.safe, ['tool:service-key']],
  ]
  for (const [lock, needs] of cases) {
    // There is no panel to type at: a code tried on it is a touch.
    for (const what of ATTEMPTS) {
      assert.deepEqual(
        attempt(lock, holding(), what),
        { outcome: 'refused', reason: 'missing-credential', missing: needs, grant: seen(lock) },
        `${lock.id}, empty-handed`,
      )
      assert.deepEqual(attempt(lock, holding({ credentials: needs }), what), opened(lock), `${lock.id}, with what it asks`)
      assert.deepEqual(attempt(lock, holding({ credentials: KEYRING }), what), opened(lock))
    }
  }
  // All of it: one medallion of two says which is missing.
  assert.deepEqual(attempt(LOCKS.plinth, holding({ credentials: ['medallion:founding', 'badge:indoor'] }), TOUCH), {
    outcome: 'refused',
    reason: 'missing-credential',
    missing: ['medallion:lineage'],
    grant: seen(LOCKS.plinth),
  })
  // The kind is part of the key: a badge called "service-key" is not the tool.
  assert.equal(attempt(LOCKS.hatch, holding({ credentials: ['badge:service-key', 'service-key'] }), TOUCH).outcome, 'refused')
})

await test('a ritual refuses as unsupported until its lot, and so does a keypad with no answer behind it (DL2-11)', () => {
  for (const keyring of [[], KEYRING]) {
    for (const what of ATTEMPTS) {
      assert.deepEqual(
        attempt(LOCKS.shelf, holding({ credentials: keyring }), what),
        { outcome: 'refused', reason: 'unsupported', grant: seen(LOCKS.shelf) },
        `${LOCKS.shelf.id}, ${JSON.stringify(what)}`,
      )
    }
  }
  // A keypad with no answer behind it could never be closed by the right code.
  for (const what of ATTEMPTS) {
    assert.deepEqual(attempt(LOCKS.drawer, holding(), what, []), { outcome: 'refused', reason: 'unsupported', grant: seen(LOCKS.drawer) })
  }
  // The one kind left without a way in: every other lock of the suite opens
  // to somebody.
  const neverOpens = ALL_LOCKS.filter(
    (lock) => ![TOUCH, code('1896')].some((what) => attempt(lock, holding({ credentials: KEYRING }), what).outcome === 'opened'),
  )
  assert.deepEqual(neverOpens.map((lock) => lock.kind), ['ritual'])
})

await test('a key that is spent opens its lock by touch, stays in the save, and is spent by the lock being open (DL3-1)', () => {
  const { safe, hatch } = LOCKS
  // The table, row by row: no key, the key, the lock already open.
  assert.deepEqual(attempt(safe, holding(), TOUCH), { outcome: 'refused', reason: 'missing-credential', missing: [KEY], grant: seen(safe) })
  assert.deepEqual(attempt(safe, holding({ credentials: [KEY] }), TOUCH), opened(safe))
  assert.deepEqual(attempt(safe, holding({ credentials: [KEY], locksOpened: [safe.id], locksSeen: [safe.id] }), TOUCH), { outcome: 'open' })
  // What opening it writes is about the lock and nothing else: the key is
  // not taken out of anything. There is no grant that could take it.
  const opening = attempt(safe, holding({ credentials: [KEY] }), TOUCH)
  assert.deepEqual(Object.keys(opening.outcome === 'opened' ? opening.grant : {}).sort(), ['locksOpened', 'locksSeen'])

  // Spent is read off the save, never written to it: the key of a consumed
  // tool whose lock is open.
  const before = holding({ credentials: [KEY] })
  const after = holding({ credentials: [KEY], locksOpened: [safe.id], locksSeen: [safe.id] })
  assert.deepEqual(toolSpent(ALL_LOCKS, before), [], 'a key in the hand and a safe still shut')
  assert.deepEqual(toolSpent(ALL_LOCKS, after), [KEY], 'the safe is open: its key is spent')
  assert.deepEqual(after.credentials, [KEY], 'and still in the save')
  // A tool that is not consumed is never spent, however many locks it opened.
  assert.deepEqual(toolSpent([hatch], holding({ credentials: [KEY], locksOpened: [hatch.id] })), [])
  assert.deepEqual(toolSpent(ALL_LOCKS, holding({ locksOpened: ALL_LOCKS.map((lock) => lock.id) })), [KEY], 'once, whatever else is open')
  // A lock opened by a consequence spent its key too: spent is what is true of the lock.
  assert.deepEqual(toolSpent([safe], holding({ locksOpened: [safe.id] })), [KEY])
  assert.deepEqual(toolSpent([], after), [])

  // What a lock holds shut stands open with its lock open, and at once with none.
  assert.equal(containerOpen({ lockId: safe.id }, before), false)
  assert.equal(containerOpen({ lockId: safe.id }, after), true)
  assert.equal(containerOpen({}, before), true, 'a cabinet with no lock is open from the start')
})

await test('a shut lock bars the way until the very press opens it: a prompt is never worded against what E does', () => {
  // The defect: «Cofre de ferro — precisa de chave» was said to a player
  // holding the key, over an E that opened the safe. Whether a lock still
  // stands in the way is asked of the rule the press is answered by.
  const bars = (lock: Lock, patch: Partial<Progress> = {}, facts = FACTS) => lockBars(lock, facts, holding(patch))
  const table = Object.fromEntries(
    ALL_LOCKS.map((lock) => [
      lock.id,
      [bars(lock), bars(lock, { credentials: KEYRING }), bars(lock, { credentials: KEYRING, locksOpened: [lock.id] })],
    ]),
  )
  assert.deepEqual(table, {
    // A keypad bars whatever is carried: E brings the panel up, and the year opens it.
    drawer: [true, true, false],
    'staff-door': [true, false, false],
    plinth: [true, false, false],
    hatch: [true, false, false],
    safe: [true, false, false],
    // A ritual has no way in until its lot, and says so for as long.
    shelf: [true, true, false],
  })
  // All of what it asks for: one medallion of two is still an empty hand.
  assert.equal(bars(LOCKS.plinth, { credentials: ['medallion:founding'] }), true)
  assert.equal(bars(LOCKS.safe, { credentials: ['badge:service-key'] }), true, 'the kind is part of the key')
  // It is the answer of the press and of nothing else: for every lock, every
  // keyring and every state, it bars exactly when a touch neither finds it
  // open nor opens it.
  for (const lock of ALL_LOCKS) {
    for (const credentials of [[], [KEY], KEYRING]) {
      for (const locksOpened of [[], [lock.id]]) {
        const progress = holding({ credentials, locksOpened })
        const { outcome } = attempt(lock, progress, TOUCH)
        assert.equal(lockBars(lock, FACTS, progress), outcome === 'ask' || outcome === 'refused', `${lock.id}: ${outcome}`)
      }
    }
  }
  // The real safe and the real drawer, by the real facts.
  const realSafe = MUSEUM.locks.find((lock) => lock.id === 'office-safe')!
  const realDrawer = MUSEUM.locks.find((lock) => lock.id === 'office-drawer')!
  assert.equal(lockBars(realSafe, MUSEUM.facts, holding()), true)
  assert.equal(lockBars(realSafe, MUSEUM.facts, holding({ credentials: [KEY] })), false)
  assert.equal(lockBars(realSafe, MUSEUM.facts, holding({ locksOpened: ['office-safe'] })), false)
  assert.equal(lockBars(realDrawer, MUSEUM.facts, holding({ credentials: [KEY] })), true)
})

await test('no kind of lock without a panel ever answers "ask" (S1)', () => {
  // The defect: every shut lock opened the keypad, and the keypad draws
  // nothing for a lock that is not a code.
  const asked = new Set<string>()
  const panels: string[] = []
  for (const lock of ALL_LOCKS) {
    for (const keyring of [[], KEYRING]) {
      for (const what of ATTEMPTS) {
        const outcome = attempt(lock, holding({ credentials: keyring }), what)
        if (outcome.outcome !== 'ask') continue
        asked.add(lock.kind)
        if (outcome.panel !== lockPanel(lock)) panels.push(`${lock.id} asks for "${outcome.panel}" and has ${lockPanel(lock)}`)
      }
    }
  }
  // Every kind that asked, so that a failure names all of them at once.
  assert.deepEqual([...asked].sort(), ['knowledge'], 'a kind of lock with no panel opened a modal')
  assert.deepEqual(panels, [], 'a lock asked for a panel that is not its own')
  assert.deepEqual(
    Object.fromEntries(ALL_LOCKS.map((lock) => [lock.id, lockPanel(lock)])),
    { drawer: 'keypad', 'staff-door': null, plinth: null, hatch: null, safe: null, shelf: null },
  )
  // Whatever the panel of a lock is, a touch asks for it or the lock has none.
  for (const lock of ALL_LOCKS) {
    assert.equal(attempt(lock, holding(), TOUCH).outcome === 'ask', lockPanel(lock) !== null, lock.id)
  }
})

await test('every outcome but "open" records the lock as seen, and opening records both lists', () => {
  for (const lock of ALL_LOCKS) {
    for (const keyring of [[], KEYRING]) {
      for (const what of ATTEMPTS) {
        const outcome = attempt(lock, holding({ credentials: keyring }), what)
        assert.notEqual(outcome.outcome, 'open')
        if (outcome.outcome === 'open') continue
        assert.deepEqual(outcome.grant.locksSeen, [lock.id])
        assert.deepEqual(outcome.grant.locksOpened, outcome.outcome === 'opened' ? [lock.id] : undefined)
        assert.deepEqual(
          Object.keys(outcome.grant).filter((field) => field !== 'locksSeen' && field !== 'locksOpened'),
          [],
          'an attempt wrote something that is not about the lock',
        )
      }
    }
  }
})

// ---------------------------------------------------------------------------
// The plan lists what was touched
// ---------------------------------------------------------------------------

await test('the plan lists a lock that was touched and is still shut, and only that', () => {
  const ids = (progress: Progress) => pendingLocks(ALL_LOCKS, progress).map((lock) => lock.id)
  assert.deepEqual(ids(holding()), [], 'a lock nobody touched is on the plan')
  // In the order of the content, whatever the order they were touched in.
  assert.deepEqual(ids(holding({ locksSeen: ['shelf', 'drawer'] })), ['drawer', 'shelf'])
  assert.deepEqual(ids(holding({ locksSeen: ['shelf', 'drawer'], locksOpened: ['drawer'] })), ['shelf'])
  assert.deepEqual(ids(holding({ locksSeen: ['shelf', 'drawer'], locksOpened: ['drawer', 'shelf'] })), [])
  // A lock another build's content has, and this one's does not, is not listed.
  assert.deepEqual(ids(holding({ locksSeen: ['holyoke-hero-seal'] })), [])

  // The real plan: the drawer appears when touched and leaves when opened.
  const real = MUSEUM.locks.find((lock) => lock.id === 'office-drawer')!
  const pending = (progress: Progress) => pendingLocks(MUSEUM.locks, progress).map((lock) => lock.id)
  assert.deepEqual(pending(holding()), [])
  const touched = attemptLock(real, MUSEUM.facts, holding(), TOUCH)
  assert.equal(touched.outcome, 'ask')
  assert.deepEqual(pending(holding(touched.outcome === 'ask' ? touched.grant : {})), ['office-drawer'])
  assert.deepEqual(pending(holding({ locksSeen: ['office-drawer'], locksOpened: ['office-drawer'] })), [])
})

// ---------------------------------------------------------------------------
// Through the store
// ---------------------------------------------------------------------------

/** A house with every lock, a paper behind the drawer, and consequences that open locks. */
const LOCK_HOUSE = {
  rooms: [{ id: 'hall', startsPowered: true }],
  exhibits: [],
  documents: [
    { id: 'doc-note', containerId: 'bureau', lockId: 'drawer', revealsFactId: 'fact-note' },
    { id: 'doc-receipt', containerId: 'bureau', lockId: 'drawer' },
  ],
  locks: [
    { ...LOCKS.drawer, onOpen: [{ kind: 'set-flag', flag: 'drawer-open' }] },
    LOCKS['staff-door'],
    LOCKS.plinth,
    LOCKS.hatch,
    LOCKS.safe,
    LOCKS.shelf,
  ],
  triggers: [
    // A consequence opens a lock the player may never have stood in front of.
    { id: 'flag-opens-shelf', when: { flags: ['drawer-open'] }, effects: [{ kind: 'open-lock', lockId: 'shelf' }] },
  ],
} as unknown as Content
const registerLockHouse = () => registerProgressRules(progressRulesFor(LOCK_HOUSE))

await test('a wrong code opens nothing and costs nothing, however many times (V4)', async () => {
  registerLockHouse()
  const page = await openGame()
  const tryCode = (entry: string) => {
    const outcome = attemptLock(LOCKS.drawer, FACTS, page.progress(), code(entry))
    if (outcome.outcome !== 'open') page.state().grant(outcome.grant)
    return outcome.outcome
  }
  assert.equal(tryCode('0000'), 'refused')
  const afterFirst = page.progress()
  assert.deepEqual(afterFirst, { ...emptyProgress(), locksSeen: ['drawer'] }, 'a wrong code left more than "this lock was touched"')
  let told = 0
  for (let tries = 0; tries < 50; tries += 1) {
    told += page.notifications(() => {
      assert.equal(tryCode(String(1000 + tries)), 'refused')
      assert.equal(tryCode('189'), 'refused')
    })
  }
  assert.equal(told, 0, 'a wrong code wrote to the save')
  assert.equal(page.progress(), afterFirst, 'the save counts attempts')
  // No limit: the hundred-and-first try opens it like the first would have.
  assert.equal(tryCode('1896'), 'opened')
  assert.deepEqual(page.progress().locksOpened.includes('drawer'), true)
})

await test('opening by the keypad records exactly what opening the unlocked drawer records', async () => {
  registerLockHouse()
  // By the keypad: touch, the right code, and what the drawer holds.
  const keypad = await openGame()
  const touch = attemptLock(LOCKS.drawer, FACTS, keypad.progress(), TOUCH)
  assert.equal(touch.outcome, 'ask')
  if (touch.outcome === 'ask') keypad.state().grant(touch.grant)
  assert.deepEqual(keypad.progress().documentsRead, [], 'a shut drawer was read')
  const typed = attemptLock(LOCKS.drawer, FACTS, keypad.progress(), code('1896'))
  assert.equal(typed.outcome, 'opened')
  if (typed.outcome === 'opened') keypad.state().grant(typed.grant)
  keypad.state().grant(containerGrant(LOCK_HOUSE, 'bureau'))

  // By hand: the same drawer, found already open on another night.
  const byHand = await openGame(saveOf({ version: 1, radioCalls: [], locksOpened: ['drawer'] }))
  assert.deepEqual(attemptLock(LOCKS.drawer, FACTS, byHand.progress(), TOUCH), { outcome: 'open' })
  byHand.state().grant(containerGrant(LOCK_HOUSE, 'bureau'))

  for (const field of ['documentsRead', 'factsKnown', 'locksOpened', 'locksSeen', 'flags'] as const) {
    assert.deepEqual([...keypad.progress()[field]].sort(), [...byHand.progress()[field]].sort(), field)
  }
  // Documents AND the facts they reveal: the keypad used to forget the facts.
  assert.deepEqual(keypad.progress().documentsRead, ['doc-note', 'doc-receipt'])
  assert.deepEqual(keypad.progress().factsKnown, ['fact-note'])
})

await test('a lock\'s `onOpen` fires when it opens, and for a save that already had it open', async () => {
  registerLockHouse()
  const page = await openGame()
  page.state().grant(seen(LOCKS.drawer))
  assert.deepEqual(page.progress().flags, [])
  const typed = attemptLock(LOCKS.drawer, FACTS, page.progress(), code('1896'))
  assert.equal(typed.outcome, 'opened')
  // The opening, its flag and the shelf the flag opens: one write.
  assert.equal(page.notifications(() => typed.outcome === 'opened' && page.state().grant(typed.grant)), 1)
  assert.deepEqual(page.progress().flags, ['drawer-open'])
  assert.deepEqual(page.progress().triggersFired, ['lock:drawer:opened', 'flag-opens-shelf'])
  assert.deepEqual(page.progress().locksOpened, ['drawer', 'shelf'])
  // The shelf was opened by a consequence, and is on record as seen all the same.
  assert.deepEqual(page.progress().locksSeen, ['drawer', 'shelf'])
  assert.deepEqual(pendingLocks(LOCK_HOUSE.locks, page.progress()), [])

  // Opened under a build whose drawer gave nothing: the flag arrives with the content.
  registerProgressRules({ settle: (progress: Progress) => progress })
  const old = await openGame(saveOf({ version: 1, radioCalls: [], locksOpened: ['drawer'] }))
  assert.deepEqual(old.progress().flags, [])
  assert.equal(old.notifications(registerLockHouse), 1)
  assert.deepEqual(old.progress().flags, ['drawer-open'])
  assert.deepEqual(old.progress().locksOpened, ['drawer', 'shelf'])
})

await test('every opened lock is on record as seen, after any sequence of attempts and effects', async () => {
  registerLockHouse()
  const random = seeded(1947)
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]
  const locks = LOCK_HOUSE.locks
  for (let run = 0; run < 60; run += 1) {
    let page = await openGame()
    for (let step = 0; step < 30; step += 1) {
      const lock = pick(locks)
      const move = pick(['touch', 'right code', 'wrong code', 'credential', 'openLock', 'effect', 'reload'])
      if (move === 'touch' || move === 'right code' || move === 'wrong code') {
        const what = move === 'touch' ? TOUCH : code(move === 'right code' ? '1896' : '1066')
        const outcome = attemptLock(lock, FACTS, page.progress(), what)
        if (outcome.outcome !== 'open') page.state().grant(outcome.grant)
      } else if (move === 'credential') page.state().grantCredential(pick(KEYRING))
      else if (move === 'openLock') page.state().openLock(lock.id)
      else if (move === 'effect') page.state().grant(effectGrant({ kind: 'open-lock', lockId: lock.id }, LOCK_HOUSE))
      else {
        page.state().recordHint(`reload-${step}`)
        page.leave()
        page = await openGame(page.savedText()!)
      }
      const { locksOpened, locksSeen } = page.progress()
      const unseen = locksOpened.filter((id) => !locksSeen.includes(id))
      assert.deepEqual(unseen, [], `run ${run}, step ${step} (${move} on ${lock.id}): open and never seen`)
      assert.deepEqual(pendingLocks(locks, page.progress()).filter((pending) => locksOpened.includes(pending.id)), [])
    }
  }
})

/**
 * A house with the chain the Posse will have: a drawer that hands over a key
 * when it opens, and a safe that key is spent on, which says so with a flag.
 */
const KEY_HOUSE = {
  rooms: [{ id: 'hall', startsPowered: true }],
  exhibits: [],
  documents: [],
  locks: [
    { ...LOCKS.drawer, onOpen: [{ kind: 'grant-credential', credential: { kind: 'tool', id: 'service-key' } }] },
    { ...LOCKS.safe, onOpen: [{ kind: 'set-flag', flag: 'safe-open' }] },
  ],
} as unknown as Content
const KEY_RULES = progressRulesFor(KEY_HOUSE)
const SAFE = KEY_HOUSE.locks[1]

await test('two live tabs: one opens the safe, the other only held the key, and both end with the key, the safe open and the key spent', async () => {
  // The night as another night left it: the drawer open, under a build whose
  // drawer gave nothing yet. Both tabs are owed the key as the content arrives.
  const browser = openBrowser(saveOf({ version: 1, radioCalls: [], locksOpened: ['drawer'], locksSeen: ['drawer'] }))
  try {
    const opener = await browser.open('the tab that opens the safe')
    const keeper = await browser.open('the tab that only holds the key', 'idle')
    const titled = await browser.open('a tab left on the title screen')
    const inTheGame = [opener, keeper]
    const leftAlone = (when: string) => {
      const { quiet, rounds } = browser.settle()
      assert.ok(quiet, `${when}: the tabs were still writing the save at each other (writes per round: ${rounds.join(', ')})`)
    }
    for (const tab of inTheGame) {
      tab.act((state) => state.start())
      tab.registerRules(KEY_RULES)
    }
    leftAlone('the content arrived in two tabs')
    for (const tab of browser.tabs) {
      assert.deepEqual(tab.progress().credentials, [KEY], `"${tab.name}" was handed the key the open drawer owed`)
      assert.deepEqual(toolSpent(KEY_HOUSE.locks, tab.progress()), [], `"${tab.name}": a key in the hand is not a key spent`)
    }

    // One tab puts the key in the safe.
    const outcome = opener.act((state) => {
      const attempt = attemptLock(SAFE, FACTS, state.progress, TOUCH)
      if (attempt.outcome !== 'open') state.grant(attempt.grant)
      return attempt.outcome
    })
    assert.equal(outcome, 'opened')
    assert.deepEqual(keeper.progress().locksOpened, ['drawer'], 'the other tab has not heard of it yet')
    leftAlone('one tab opened the safe')

    // The tab on the title screen has no rules and wrote nothing of its own;
    // it holds what it was told, flag and all.
    const disk = browser.disk()?.progress as Raw
    for (const [who, progress] of [...browser.tabs.map((tab) => [tab.name, tab.progress()] as const), ['the disk', disk] as const]) {
      assert.deepEqual(progress.credentials, [KEY], `${who}: the key is still in the save`)
      assert.deepEqual(progress.locksOpened, ['drawer', 'safe'], `${who}: the safe is open`)
      assert.deepEqual(progress.flags, ['safe-open'], `${who}: and what follows from it happened once`)
      assert.deepEqual(toolSpent(KEY_HOUSE.locks, progress as Progress), [KEY], `${who}: the key is spent`)
    }
    // The tab that only held the key finds the safe open, and its touch
    // writes nothing: there is nothing to open twice and no key to take back.
    const written = browser.writes.length
    assert.equal(keeper.act((state) => attemptLock(SAFE, FACTS, state.progress, TOUCH).outcome), 'open')
    // A tab with no rules that writes (the title screen, a setting changed)
    // rewrites the save from what it holds: the key and the flag are in it.
    titled.act((state) => state.setSetting('brightness', 1.2))
    leftAlone('the tab on the title screen changed a setting')
    assert.equal(browser.writes.length, written + 1, 'a setting is one write, and nobody answers it')
    assert.deepEqual(browser.disk()?.progress?.credentials, [KEY])
    assert.deepEqual(browser.disk()?.progress?.flags, ['safe-open'])
    assert.deepEqual(browser.disk()?.progress?.triggersFired, ['lock:drawer:opened', 'lock:safe:opened'])

    // Silence: every tab made to write, as switching between tabs does, writes nothing.
    const quietAt = browser.writes.length
    for (const tab of browser.tabs) {
      tab.hide()
      tab.show()
    }
    leftAlone('every tab was hidden and shown')
    assert.equal(browser.writes.length, quietAt, 'a tab with nothing new wrote as it was hidden')
  } finally {
    browser.close()
  }
})

await test('a key the save was owed arrives with the content and is not announced; a key taken in play is, once', async () => {
  const titles = new Map([[KEY, 'credential.service-key.title']])
  // The title screen: the store has read the save, and the content has not arrived.
  registerProgressRules({ settle: (progress: Progress) => progress })
  const page = await openGame(saveOf({ version: 1, radioCalls: [], locksOpened: ['drawer'], locksSeen: ['drawer'] }))
  assert.deepEqual(page.progress().credentials, [])
  // The content arrives (the HUD's chunk imports the registry, so this is
  // before its first render): the open drawer hands over its key, in one write.
  assert.equal(page.notifications(() => registerProgressRules(KEY_RULES)), 1)
  assert.deepEqual(page.progress().credentials, [KEY])
  // The HUD mounts now, and what it first sees is the save as it stands.
  const atMount = page.progress().credentials.length
  assert.deepEqual(credentialsTaken(atMount, page.progress().credentials, titles), [], 'a key owed since another night was announced on Continue')
  // A HUD that had looked before the content came would have greeted the
  // load with it: that is the order `officeAnswersWiringProblems` holds.
  assert.deepEqual(credentialsTaken(0, page.progress().credentials, titles), ['credential.service-key.title'])
  // Reloaded, the key is in the save from the first read, and is not news either.
  page.leave()
  const back = await openGame(page.savedText()!)
  assert.deepEqual(back.progress().credentials, [KEY])
  assert.deepEqual(credentialsTaken(back.progress().credentials.length, back.progress().credentials, titles), [])

  // A new game, with the content there from the start: the drawer is opened
  // by its code, and the key it gives is taken now.
  const fresh = await openGame()
  const seen = fresh.progress().credentials.length
  const typed = attemptLock(KEY_HOUSE.locks[0], FACTS, fresh.progress(), code('1896'))
  assert.equal(typed.outcome, 'opened')
  if (typed.outcome === 'opened') fresh.state().grant(typed.grant)
  assert.deepEqual(credentialsTaken(seen, fresh.progress().credentials, titles), ['credential.service-key.title'])
  // Announced once: the HUD has seen it, and the next write is about something else.
  const after = fresh.progress().credentials.length
  fresh.state().recordHint('torch-used')
  assert.deepEqual(credentialsTaken(after, fresh.progress().credentials, titles), [])
})

await test('the corpus: a save from before `locksSeen` has seen exactly the locks it opened (DL2-4)', async () => {
  registerProgressRules(progressRulesFor(MUSEUM))
  const seenBy: Record<string, readonly string[]> = {}
  // The saves from before L2. The corpus also holds saves L2 wrote, which say
  // what they touched; those are the next check.
  for (const [id, fixture] of Object.entries(SAVE_FIXTURES).filter(([, candidate]) => fixtureLot(candidate) < 2)) {
    const record = fixture.save.progress as Raw
    assert.ok(!('locksSeen' in record), `${id} is a record of a build that had no locksSeen`)
    const page = await openGame(fixture.save)
    seenBy[id] = page.progress().locksSeen
    assert.deepEqual(page.progress().locksSeen, record.locksOpened, id)
    // The drawer still shut leaves the plan until the player touches it again.
    assert.deepEqual(pendingLocks(MUSEUM.locks, page.progress()), [], id)
  }
  assert.deepEqual(seenBy, {
    'production-drawer-open': ['office-drawer'],
    'production-drawer-closed': [],
    'production-catalogued-unturned': [],
    'production-pre-opening': [],
    'production-radio-on-desk': [],
    'l1-route-end': ['office-drawer'],
  })
  // Touching it puts it back, and the write keeps it there.
  const page = await openGame(SAVE_FIXTURES['production-drawer-closed'].save)
  const real = MUSEUM.locks.find((lock) => lock.id === 'office-drawer')!
  const touch = attemptLock(real, MUSEUM.facts, page.progress(), TOUCH)
  if (touch.outcome !== 'open') page.state().grant(touch.grant)
  assert.deepEqual(pendingLocks(MUSEUM.locks, page.progress()).map((lock) => lock.id), ['office-drawer'])
  page.leave()
  const back = await openGame(page.savedText()!)
  assert.deepEqual(pendingLocks(MUSEUM.locks, back.progress()).map((lock) => lock.id), ['office-drawer'])
  assert.deepEqual(throughJson(back.progress().locksOpened), [])
})

await test('the corpus: a save that says what it touched is believed, shut drawer and all', async () => {
  registerProgressRules(progressRulesFor(MUSEUM))
  const own = Object.entries(SAVE_FIXTURES).filter(([, fixture]) => fixtureLot(fixture) >= 2)
  const pending: Record<string, readonly string[]> = {}
  for (const [id, fixture] of own) {
    const record = fixture.save.progress as Raw
    assert.ok('locksSeen' in record, `${id} was written by a build that records the locks touched`)
    const page = await openGame(fixture.save)
    // Not rebuilt from what was opened: the record's own list, as it stands.
    assert.deepEqual(throughJson(page.progress().locksSeen), record.locksSeen, id)
    pending[id] = pendingLocks(MUSEUM.locks, page.progress()).map((lock) => lock.id as string)
  }
  // The new game of L2 touched the drawer and left it shut: the plan names it
  // from the first frame of "Continue", with no second touch. The route from
  // L1's save had the drawer open, so there is nothing to name.
  assert.deepEqual(pending, {
    'l2-shortcut-released': [],
    'l2-new-game-drawer-touched': ['office-drawer'],
  })
  // The keypad still asks, and the year still opens it, for the player who
  // had only looked: one path, whoever wrote the save.
  const page = await openGame(SAVE_FIXTURES['l2-new-game-drawer-touched'].save)
  const real = MUSEUM.locks.find((lock) => lock.id === 'office-drawer')!
  const touch = attemptLock(real, MUSEUM.facts, page.progress(), TOUCH)
  assert.equal(touch.outcome, 'ask')
  assert.equal(page.notifications(() => touch.outcome !== 'open' && page.state().grant(touch.grant)), 0, 'a touch already recorded wrote again')
  const year = MUSEUM.facts.find((fact) => fact.id === 'springfield-renaming')!.value
  const code = attemptLock(real, MUSEUM.facts, page.progress(), { kind: 'code', entry: year })
  assert.equal(code.outcome, 'opened')
  if (code.outcome === 'opened') page.state().grant(code.grant)
  assert.deepEqual(pendingLocks(MUSEUM.locks, page.progress()), [])
  assert.deepEqual(throughJson(page.progress().locksOpened), ['office-drawer'])
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

await test('the cabinet, the breaker, the keypad, the plan and the prompt ask the same rule', () => {
  assert.deepEqual(progressWiringProblems(readSource, components), [])

  // Each of these is a refactor the check exists to catch, applied to the
  // real source in memory.
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
    ['the cabinet deciding by itself', changed('engine/Containers.tsx', /attemptLock\(/, 'legacyLockRule(')],
    ['the breaker deciding by itself', changed('engine/PowerControls.tsx', /attemptLock\(/, 'legacyLockRule(')],
    ['the keypad comparing the code by itself', changed('ui/LockPanel.tsx', /attemptLock\(/, 'legacyLockRule(')],
    [
      'the keypad opening the lock by the old action',
      changed('ui/LockPanel.tsx', 'setActiveLock(null)', 'useMuseum.getState().openLock(lock.id)\n      setActiveLock(null)'),
    ],
    [
      'the cabinet opening the panel for whatever is not open',
      changed('engine/Containers.tsx', "attempt.outcome === 'ask'", "attempt.outcome !== 'open'"),
    ],
    [
      'the breaker opening the panel before asking',
      changed('engine/PowerControls.tsx', /(const attempt = attemptLock\()/, 'state.setActiveLock(lock.id)\n        $1'),
    ],
    [
      'a refused cabinet answering with silence',
      changed('engine/Containers.tsx', /(outcome === 'refused'\) \{\s*)museumAudio\.lockDenied\(\)/, '$1void 0'),
    ],
    [
      'a refused breaker answering with silence',
      changed('engine/PowerControls.tsx', /(outcome === 'refused'\) \{\s*)museumAudio\.lockDenied\(\)/, '$1void 0'),
    ],
    [
      'the keypad recording the documents by its own loop',
      changed('ui/LockPanel.tsx', /state\.grant\(containerGrant\(MUSEUM, [^)]*\)\)/, 'for (const doc of inside) state.recordDocument(doc.id)'),
    ],
    [
      'the cabinet recording the documents by its own loop',
      changed('engine/Containers.tsx', /state\.grant\(containerGrant\(MUSEUM, [^)]*\)\)/, 'for (const doc of inside) state.recordDocument(doc.id)'),
    ],
    [
      'the plan listing every shut lock',
      changed('ui/mapModel.ts', 'pendingLocks(content.locks, progress)', 'content.locks.filter((lock) => !progress.locksOpened.includes(lock.id))'),
    ],
    ['the prompt reading the save by itself', changed('ui/Hud.tsx', /lockStatus\([^)]*\) === 'closed'/, '!locksOpened.includes(container.lockId)')],
    // What was in the game: any shut lock was called locked, the key in the
    // hand or not, and a safe went on saying it needed the key E opened it with.
    [
      'the prompt calling every shut lock locked, whatever is in the hand',
      changed('ui/Hud.tsx', /const barred = shut && \(lock === undefined \|\| lockBars\([^)]*\)\)/, 'const barred = shut'),
    ],
    [
      'the prompt deciding by the keys alone whether a lock gives',
      changed('ui/Hud.tsx', /lockBars\(lock, MUSEUM\.facts, \{ locksOpened, credentials \}\)/, "lock.kind !== 'tool'"),
    ],
    [
      'the prompt wording a lock that gives as a drawer to read',
      changed('ui/Hud.tsx', 'containerPrompt(container, lock, barred, shut && !barred)', 'containerPrompt(container, lock, barred)'),
    ],
    // The line that takes what the rule decided to the save. With it gone
    // the rule is still asked, the sound still plays, and the game looks the
    // same for one press: the drawer is never on the plan, and the right
    // year opens a drawer that is shut again on the next touch. The robot
    // does not see it, because its hands are a copy of these handlers.
    [
      'a touched cabinet never written to the save',
      changed('engine/Containers.tsx', /\n *if \(attempt\.outcome !== 'open'\) state\.grant\(attempt\.grant\)\n/, '\n'),
    ],
    [
      'a touched breaker never written to the save',
      changed('engine/PowerControls.tsx', /\n *if \(attempt\.outcome !== 'open'\) state\.grant\(attempt\.grant\)\n/, '\n'),
    ],
    [
      'the right code never written to the save',
      changed('ui/LockPanel.tsx', /\n *if \(attempt\.outcome !== 'open'\) state\.grant\(attempt\.grant\)\n/, '\n'),
    ],
    [
      'the keypad writing only when it asks again, and never when it opens',
      changed('ui/LockPanel.tsx', "if (attempt.outcome !== 'open') state.grant(attempt.grant)", "if (attempt.outcome === 'ask') state.grant(attempt.grant)"),
    ],
    [
      'the cabinet writing the touch after the panel has taken the press',
      changed(
        'engine/Containers.tsx',
        /( *)if \(attempt\.outcome !== 'open'\) state\.grant\(attempt\.grant\)\n((?:.*\n)*?)( *)(if \(attempt\.outcome === 'refused'\))/,
        "$2$3if (attempt.outcome !== 'open') state.grant(attempt.grant)\n$3$4",
      ),
    ],
    [
      'any other component opening a lock',
      changed('ui/Journal.tsx', /$/, '\nexport const cheat = () => useMuseum.getState().openLock("office-drawer")\n'),
    ],
  ]
  const uncaught = refactors
    .filter(([, reader]) => progressWiringProblems(reader, components).length === 0)
    .map(([name]) => name)
  assert.deepEqual(uncaught, [], 'a refactor this check exists to catch went through')
})

done('lock checks')
