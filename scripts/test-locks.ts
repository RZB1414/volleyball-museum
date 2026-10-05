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
 * says was touched. v1: the kinds of lock that have a panel in this lot are
 * the knowledge lock alone; a key that is spent and a ritual arrive with
 * their own lots, and until then they refuse, out loud.
 */

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { progressWiringProblems, type SourceReader } from './lib/runtimeWiring.ts'
import { openGame, saveOf, seeded, suite, throughJson } from './lib/storePage.ts'

const { MUSEUM } = await import('../src/content/museum.ts')
const { fixtureLot, SAVE_FIXTURES } = await import('../src/content/saveFixtures.ts')
const { progressRulesFor } = await import('../src/engine/contentRegistry.ts')
const { attemptLock, lockPanel, lockStatus, pendingLocks } = await import('../src/engine/lockRules.ts')
const { containerGrant } = await import('../src/engine/progressGrants.ts')
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
  plinth: { kind: 'medallion-plinth', id: 'plinth', requires: ['founding', 'olympic'], mapLabelKey: 'lock.plinth' },
  hatch: { kind: 'tool', id: 'hatch', requires: 'service-key', consumesTool: false, mapLabelKey: 'lock.hatch' },
  safe: { kind: 'tool', id: 'safe', requires: 'service-key', consumesTool: true, mapLabelKey: 'lock.safe' },
  shelf: { kind: 'ritual', id: 'shelf', puzzle: 'chronological-order', mapLabelKey: 'lock.shelf', hints: HINTS },
} as unknown as Record<string, Lock>
const ALL_LOCKS = Object.values(LOCKS)

/** Every credential any of them asks for, in the save's spelling. */
const KEYRING = ['badge:indoor', 'medallion:founding', 'medallion:olympic', 'tool:service-key']
const TOUCH: Attempt = { kind: 'touch' }
const code = (entry: string): Attempt => ({ kind: 'code', entry })
const ATTEMPTS: readonly Attempt[] = [TOUCH, code('1896'), code('1895'), code('')]

const holding = (patch: Partial<Progress> = {}): Progress => ({ ...emptyProgress(), ...patch })
const attempt = (lock: Lock, progress: Progress, what: Attempt, facts = FACTS) => attemptLock(lock, facts, progress, what)
const seen = (lock: Lock) => ({ locksSeen: [lock.id] })
const opened = (lock: Lock) => ({ outcome: 'opened', grant: { locksSeen: [lock.id], locksOpened: [lock.id] } })

/** The kinds of lock the schema declares, read off it: scripts are not type-checked. */
const schemaLockKinds = (() => {
  const schema = readFileSync(resolve(ROOT, 'src/content/schema.ts'), 'utf8')
  const declared = schema.slice(schema.indexOf('export type Lock ='), schema.indexOf('export type UnlockEffect ='))
  return [...declared.matchAll(/readonly kind: '([a-z-]+)'/g)].map((match) => match[1]).sort()
})()

await test('the suite has a lock of every kind the schema declares', () => {
  assert.deepEqual(schemaLockKinds, ['badge', 'knowledge', 'medallion-plinth', 'ritual', 'tool'])
  assert.deepEqual([...new Set(ALL_LOCKS.map((lock) => lock.kind))].sort(), schemaLockKinds)
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
    [LOCKS.plinth, ['medallion:founding', 'medallion:olympic']],
    [LOCKS.hatch, ['tool:service-key']],
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
    missing: ['medallion:olympic'],
    grant: seen(LOCKS.plinth),
  })
  // The kind is part of the key: a badge called "service-key" is not the tool.
  assert.equal(attempt(LOCKS.hatch, holding({ credentials: ['badge:service-key', 'service-key'] }), TOUCH).outcome, 'refused')
})

await test('a key that would be spent, and a ritual, refuse as unsupported until their lots (DL2-11)', () => {
  for (const lock of [LOCKS.safe, LOCKS.shelf]) {
    for (const keyring of [[], KEYRING]) {
      for (const what of ATTEMPTS) {
        assert.deepEqual(
          attempt(lock, holding({ credentials: keyring }), what),
          { outcome: 'refused', reason: 'unsupported', grant: seen(lock) },
          `${lock.id}, ${JSON.stringify(what)}`,
        )
      }
    }
  }
  // A keypad with no answer behind it could never be closed by the right code.
  for (const what of ATTEMPTS) {
    assert.deepEqual(attempt(LOCKS.drawer, holding(), what, []), { outcome: 'refused', reason: 'unsupported', grant: seen(LOCKS.drawer) })
  }
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
const readSource: SourceReader = (path) => readFileSync(resolve(SRC, path), 'utf8')
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
