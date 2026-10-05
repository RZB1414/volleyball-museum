/**
 * Headless proof that a save is never lost.
 *
 *   npm run test:save
 *
 * Every lot from here on adds to what a save holds, and the store used to
 * rebuild the save from the fields it knew: whatever another build had written
 * beside them was gone at the first write, without an error anywhere. A field
 * was also declared in five places, and forgetting one of them erased it on
 * load just as quietly. So the save is now one table (`progressFields.ts`)
 * read by one pipeline (`saveMigrations.ts`), and this suite holds both to
 * four rules:
 *
 *   1. a field this build does not know stays in the save;
 *   2. a field never changes type, so the build before this one can still
 *      read what this one writes (the code of L1 is kept, frozen, to ask);
 *   3. nothing shrinks: loading, migrating and playing only add;
 *   4. `contentLot` never goes down, and `SAVE_VERSION` never goes up.
 *
 * The store is loaded the way a browser loads it, as in `test-qa-save.ts`:
 * the save is under the key before the module is first evaluated, and what
 * comes back is read from the storage after the page is left.
 *
 * Those pages have a timer that never fires. What two tabs do to each other
 * once they are left alone is asked of tabs that are alive (`lib/liveTabs.ts`,
 * from "Tabs that are alive" on): the writes the store schedules are made and
 * every write is told to the other tabs, until silence and under a ceiling.
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

import { openBrowser, type LiveBrowser, type LiveTab } from './lib/liveTabs.ts'
import { clockWiringProblems, type SourceReader } from './lib/runtimeWiring.ts'
import { dynamicSpecifiers, staticImportGraph, staticSpecifiers } from './lib/staticImports.ts'
import { STORE_ACTIONS as ACTIONS, STORE_ACTIONS_LEAVE as ACTED } from './lib/storeActions.ts'
// For its dice alone. The module also puts a storage of its own on the global
// object as it is imported; the one this suite uses is put there below, after
// every import has run, and is the one that stays.
import { seeded } from './lib/storePage.ts'
import { readText } from './lib/readText.ts'

// ---------------------------------------------------------------------------
// A browser's storage, in place before anything imports the store
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'volleyball-museum:v1'
const storage = new Map<string, string>()
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
  },
})

const { CONTENT_LOT } = await import('../src/content/contentLot.ts')
const { PRE_OPENING_SAVE, SAVE_ALIASES } = await import('../src/content/legacySave.ts')
const { MUSEUM } = await import('../src/content/museum.ts')
const { fixtureLot, SAVE_FIXTURES } = await import('../src/content/saveFixtures.ts')
const { SPAWN } = await import('../src/content/spawn.ts')
const { validateOpening, validateSaveAliases } = await import('../src/content/validate.ts')
const { clockCount } = await import('../src/engine/clockCount.ts')
const { CLOCK_MAX_STEP_SECONDS, CLOCK_SAVE_INTERVAL_SECONDS } = await import('../src/engine/deviceRules.ts')
const { isRoomPowered } = await import('../src/engine/power.ts')
const {
  emptyProgress,
  EMPTY_PROGRESS,
  grantProgress,
  hasSavedProgress,
  joinProgress,
  PROGRESS_FIELDS,
  sanitiseProgress,
  sanitiseRadioMemory,
  SAVE_VERSION,
  stringList,
} = await import('../src/state/progressFields.ts')
const { migrateProgress, migrateProgressWith, SAVE_MIGRATIONS } = await import('../src/state/saveMigrations.ts')
const frozenL1 = await import('./lib/frozen/sanitiseProgress.L1.ts')

type StoreModule = typeof import('../src/state/store.ts')
type Progress = ReturnType<typeof emptyProgress>
type Field = keyof typeof PROGRESS_FIELDS
type Raw = Record<string, unknown>
type SaveAlias = (typeof SAVE_ALIASES)[number]
type SaveMigration = (typeof SAVE_MIGRATIONS)[number]

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path: string) => readText(resolve(ROOT, path))
const fields = Object.keys(PROGRESS_FIELDS) as Field[]
const fixtureIds = Object.keys(SAVE_FIXTURES) as (keyof typeof SAVE_FIXTURES)[]
const rawFixture = (id: keyof typeof SAVE_FIXTURES): Raw => SAVE_FIXTURES[id].save.progress
/** What the storage would hand back: a copy with nothing shared and nothing but JSON in it. */
const throughJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/**
 * A browser opening the game with this under the save key (a string is
 * stored as it is, so a test can write JSON no object literal can spell).
 *
 * Each load gets a page of its own. The store binds its exit flush to the
 * `window` it finds, and a store left over from the load before must not
 * answer this page's `pagehide` with its own, older, progress. The page's
 * timer never fires: the only write is the one `leave` or `hide` forces,
 * which is the write a closing or a backgrounded tab makes.
 */
let pageLoads = 0
async function openGame(save?: unknown) {
  storage.clear()
  if (save !== undefined) storage.set(STORAGE_KEY, typeof save === 'string' ? save : JSON.stringify(save))
  return openTab()
}

/**
 * One more tab of the same browser: the storage is left as it is, and
 * whatever tabs were opened before are still there, with what they hold.
 */
async function openTab() {
  const page = Object.assign(new EventTarget(), { setTimeout: () => 1, clearTimeout: () => undefined })
  const tab = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  Object.assign(globalThis, { window: page, document: tab })
  pageLoads += 1
  const store = (await import(`../src/state/store.ts?pageLoad=${pageLoads}`)) as StoreModule
  return {
    store,
    state: () => store.useMuseum.getState(),
    progress: () => store.useMuseum.getState().progress as Progress & Raw,
    /** The tab goes away, and the store writes whatever it has not written yet. */
    leave: () => {
      page.dispatchEvent(new Event('pagehide'))
    },
    /** The player switches to another tab: the last thing a phone reliably tells a page. */
    hide: () => {
      tab.visibilityState = 'hidden'
      tab.dispatchEvent(new Event('visibilitychange'))
    },
    /** The browser tells this tab that another one wrote the save. */
    toldOfAWrite: (key: string | null = STORAGE_KEY) => {
      page.dispatchEvent(Object.assign(new Event('storage'), { key }))
    },
    /** The text under the save key, and the progress in it. */
    savedText: () => storage.get(STORAGE_KEY) ?? null,
    savedProgress: () => (JSON.parse(storage.get(STORAGE_KEY) ?? '{}') as { progress?: Raw }).progress ?? null,
  }
}
/** What is under the save key, whole: the settings beside the progress, and whatever else was written there. */
const savedWhole = () => JSON.parse(storage.get(STORAGE_KEY) ?? '{}') as { settings?: Raw; progress?: Raw } & Raw
/** Another tab writes the save: one of a later build, which this suite cannot run, so its write is put there. */
const anotherTabWrites = (save: unknown) => storage.set(STORAGE_KEY, typeof save === 'string' ? save : JSON.stringify(save))
const saveOf = (progress: Raw) => ({ settings: {}, progress })

/** Frozen all the way down: code that writes into what it was handed throws. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) deepFreeze(inner)
    Object.freeze(value)
  }
  return value
}

// Every check runs even after one fails: a change to the table usually breaks
// several rules at once, and the list of them is the diagnosis.
let passed = 0
let failed = 0
async function test(name: string, run: () => void | Promise<void>) {
  try {
    await run()
  } catch (error) {
    failed += 1
    console.log(`  FAIL  ${name}`)
    const message = error instanceof Error ? error.message : String(error)
    for (const line of message.split('\n')) console.log(`        ${line}`)
    return
  }
  passed += 1
  console.log(`  pass  ${name}`)
}

console.log('\nThe save')

// ---------------------------------------------------------------------------
// The table of fields (T1)
// ---------------------------------------------------------------------------

/**
 * One value per field, of the kind the game writes. A field of the table with
 * no sample here fails the first check below: scripts are not type-checked,
 * so `satisfies` only helps the editor.
 *
 * `contentLot` is ahead of this build on purpose, and every list has two
 * entries where order could be lost.
 */
const SAMPLES = {
  contentLot: CONTENT_LOT + 3,
  catalogued: ['ball-spalding', 'portrait-morgan'],
  hotspots: ['ball-spalding:maker', 'portrait-morgan:date'],
  documentsRead: ['doc-welcome', 'doc-halstead'],
  factsKnown: ['springfield-renaming', 'filipino-spike'],
  credentials: ['badge:curator', 'medallion:holyoke'],
  roomsVisited: ['office', 'atrium'],
  roomsPowered: ['office', 'atrium'],
  locksOpened: ['office-drawer', 'holyoke-hero-seal'],
  locksSeen: ['office-drawer', 'holyoke-hero-seal', 'atrium-plinth'],
  doorsReleased: ['atrium-from-holyoke-shortcut', 'vault-hatch'],
  flags: ['posse-signed', 'reopening-declared'],
  triggersFired: ['exhibit:ball-spalding:catalogued', 'lock:office-drawer:opened'],
  radioCalls: ['porter-first-call', 'porter-radio-taken'],
  clockSeconds: { 'office-clock': 612, 'atrium-clock': 0.5 },
  hintsShown: ['journal-taken', 'radio-taken'],
  devicesCarried: ['office-radio', 'pocket-torch'],
  radioMemory: {
    'office-radio': {
      calls: 4,
      temper: 1,
      lastCallAt: 1791075900000,
      lastHint: 2,
      lastReplyId: 'porter-praise-knack',
      lastOutburstId: null,
    },
  },
  lastRoom: 'atrium',
} satisfies Record<Field, unknown>
const sampleOf = (field: Field): unknown => (SAMPLES as Raw)[field]
const SAMPLE_SAVE: Raw = { version: 1, ...SAMPLES }

/** Fields another build wrote: this one has no line for them in its table. */
const UNKNOWN = {
  termsSigned: ['termo-posse'],
  socketsFilled: ['curator'],
  wiresJoined: { 'holyoke-hero': { from: 'net-1897', to: 'handbook-1897' } },
  nightsWorked: 3,
}

/** What none of the lists and records may lose between two moments. */
function shrunk(before: Raw, after: Raw): string[] {
  const lost: string[] = []
  for (const [field, value] of Object.entries(before)) {
    const now = after[field]
    if (Array.isArray(value)) {
      for (const item of value) if (!Array.isArray(now) || !now.includes(item)) lost.push(`${field} lost ${JSON.stringify(item)}`)
    } else if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        if (!now || typeof now !== 'object' || !Object.hasOwn(now, key)) lost.push(`${field} lost its "${key}"`)
      }
    } else if (!Object.hasOwn(after, field)) {
      lost.push(`${field} is gone`)
    }
  }
  return lost
}

await test('every field of the table goes to the storage and comes back', async () => {
  assert.deepEqual(Object.keys(SAMPLES).sort(), [...fields].sort(), 'a field of the table has no sample in this suite')
  assert.ok(!fields.includes('version' as Field), 'the version is the gate, not a field: it is read first and written as 1')

  const page = await openGame(saveOf(SAMPLE_SAVE))
  assert.deepEqual(page.progress(), SAMPLE_SAVE, 'loading changed a valid save')
  // A setting changes, so the tab has something to write; the progress goes with it.
  page.state().setSetting('brightness', 1.1)
  page.leave()
  assert.deepEqual(page.savedProgress(), SAMPLE_SAVE, 'what was written is not what was loaded')
  const again = await openGame(page.savedText()!)
  assert.deepEqual(again.progress(), SAMPLE_SAVE, 'a second load changed it')
  assert.deepEqual(migrateProgress(throughJson(SAMPLE_SAVE)), SAMPLE_SAVE)

  // And the save nobody played.
  const fresh = await openGame()
  assert.deepEqual(fresh.progress(), emptyProgress())
  fresh.state().setSetting('brightness', 1.1)
  fresh.leave()
  assert.deepEqual(fresh.savedProgress(), emptyProgress())
  assert.deepEqual((await openGame(fresh.savedText()!)).progress(), emptyProgress())
})

await test('a new game is the table\'s defaults, and no two saves share a list', () => {
  const fresh = emptyProgress()
  assert.deepEqual(Object.keys(fresh).sort(), ['version', ...fields].sort())
  assert.equal(fresh.version, 1)
  assert.equal(fresh.contentLot, CONTENT_LOT, 'a new game is stamped with the lot of the build that started it')
  assert.equal(fresh.lastRoom, SPAWN.room)
  for (const field of fields) {
    const spec = PROGRESS_FIELDS[field]
    assert.deepEqual(fresh[field], spec.fresh(), field)
    if (typeof spec.fresh() === 'object') {
      assert.notEqual(spec.fresh(), spec.fresh(), `${field}: two saves would share one default`)
      assert.notEqual(fresh[field], EMPTY_PROGRESS[field], `${field}: a new game shares its list with the constant`)
      assert.equal(Object.keys(spec.fresh() as object).length, 0, `${field} does not start empty`)
    }
  }
  assert.deepEqual(EMPTY_PROGRESS, fresh)
})

/** Whatever a corrupted or hand-edited save might hold in a field. */
const JUNK: readonly unknown[] = [
  null,
  undefined,
  true,
  0,
  7,
  -3,
  2.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  '',
  'x',
  [],
  [1, null, {}, ['nested']],
  {},
  { nested: { deep: [1] } },
]

await test('every sanitiser gives the default for junk and never throws', () => {
  for (const field of fields) {
    const sample = sampleOf(field)
    // What is junk depends on the field: any string is a room name, and a
    // whole number from 1 up is a lot.
    const junk = JUNK.filter((value) =>
      typeof sample === 'string'
        ? typeof value !== 'string'
        : typeof sample === 'number'
          ? !(Number.isInteger(value) && (value as number) >= 1)
          : true,
    )
    assert.ok(junk.length >= 10, `${field}: the junk list no longer tries this field`)
    // A save that does not say its lot is production's, which is lot 1, whatever lot this build is.
    const expected = field === 'contentLot' ? 1 : PROGRESS_FIELDS[field].fresh()
    for (const value of junk) {
      const label = `${field} = ${typeof value === 'number' ? String(value) : JSON.stringify(value)}`
      assert.deepEqual(sanitiseProgress({ version: 1, [field]: value })[field], expected, label)
      assert.deepEqual(PROGRESS_FIELDS[field].read(value) ?? PROGRESS_FIELDS[field].fresh(), expected, label)
    }
    assert.deepEqual(sanitiseProgress({ version: 1, [field]: throughJson(sample) })[field], sample, `${field}: a valid value was changed`)
  }
  assert.deepEqual(sanitiseProgress({ version: 1 }), { ...emptyProgress(), contentLot: 1 })
  // Not through the store's exports either: this is what a tab with a broken save boots into.
  assert.deepEqual(migrateProgress({ version: 1 }), emptyProgress())
})

await test('what is valid inside a damaged field is kept, in order', () => {
  assert.deepEqual(stringList(['ok', 3, null, 'two', ['three'], 'ok']), ['ok', 'two', 'ok'])
  assert.equal(stringList('ok'), null, 'a string is not a list')
  assert.equal(stringList({ 0: 'ok', length: 1 }), null)
  for (const field of fields.filter((name) => Array.isArray(sampleOf(name)))) {
    assert.deepEqual(sanitiseProgress({ version: 1, [field]: ['ok', 3, null, 'two'] })[field], ['ok', 'two'], field)
  }

  // A clock keeps the fraction it was saved with; anything that is not time is dropped alone.
  assert.deepEqual(
    sanitiseProgress({
      version: 1,
      clockSeconds: { 'office-clock': 42, zero: 0, part: 1.5, broken: Number.NaN, negative: -4, text: '9', nothing: null },
    }).clockSeconds,
    { 'office-clock': 42, zero: 0, part: 1.5 },
  )

  // One radio's broken number costs that radio's memory and nobody else's.
  const memory = sanitiseRadioMemory({
    'office-radio': { calls: 3.7, temper: 2, lastCallAt: 5, lastHint: -1, lastReplyId: 4 },
    broken: { calls: Number.NaN, temper: 1, lastCallAt: 0, lastHint: 0 },
    negative: { calls: 1, temper: -2, lastCallAt: 0, lastHint: 0 },
    text: 'porter',
    empty: null,
  })
  assert.deepEqual(memory, {
    'office-radio': { calls: 3, temper: 2, lastCallAt: 5, lastHint: -1, lastReplyId: null, lastOutburstId: null },
  })
})

await test('a grant only adds, in order, and hands back the same save when it adds nothing', () => {
  const before = deepFreeze(migrateProgress({ version: 1, radioCalls: [], documentsRead: ['doc-welcome'], termsSigned: ['termo-posse'] }))
  assert.equal(grantProgress(before, {}), before)
  assert.equal(grantProgress(before, { documentsRead: ['doc-welcome'], catalogued: [] }), before, 'nothing new is no new save')

  const after = grantProgress(before, { documentsRead: ['doc-halstead', 'doc-welcome', 'doc-halstead'], catalogued: ['ball-spalding'] })
  assert.deepEqual(after.documentsRead, ['doc-welcome', 'doc-halstead'])
  assert.deepEqual(after.catalogued, ['ball-spalding'])
  assert.equal(after.hotspots, before.hotspots, 'a list the grant does not name is the same list')
  assert.deepEqual((after as Progress & Raw).termsSigned, ['termo-posse'], 'a grant dropped a field it does not know')
  assert.deepEqual(before.documentsRead, ['doc-welcome'], 'the save it was given was written to')
})

await test('a radio memory keeps what a later build wrote inside a valid entry', () => {
  const later = {
    'office-radio': {
      calls: 4,
      temper: 1,
      lastCallAt: 9,
      lastHint: 0,
      lastReplyId: 'porter-t1-listening',
      lastOutburstId: null,
      mood: 'sour',
      streak: { best: 3 },
    },
  }
  assert.deepEqual(sanitiseRadioMemory(throughJson(later)), later)
  assert.deepEqual(migrateProgress({ version: 1, radioCalls: [], radioMemory: throughJson(later) }).radioMemory, later)
  // A broken entry still leaves whole, with whatever else it carried.
  assert.deepEqual(sanitiseRadioMemory({ 'office-radio': { ...later['office-radio'], calls: 'many' } }), {})
})

await test('a call to the porter keeps what a later build wrote inside his memory', async () => {
  // The load keeps it (the test above). The first press of R used to drop it:
  // the answer was built from the six numbers this build knows, and the store
  // put it in place of the entry.
  const later = {
    calls: 4,
    temper: 1,
    lastCallAt: 1791075900000,
    lastHint: 4,
    lastReplyId: 'porter-praise-knack',
    lastOutburstId: null,
    mood: 'sour',
    streak: { best: 3 },
  }
  const kept = (memory: Raw | undefined, when: string) => {
    assert.equal(memory?.mood, 'sour', `${when}: a field inside the porter's memory is gone`)
    assert.deepEqual(memory?.streak, { best: 3 }, when)
  }

  // By the store's own action, as every caller reaches it.
  const page = await openGame(saveOf({ ...SAMPLE_SAVE, radioMemory: { 'office-radio': later } }))
  ACTIONS.rememberRadioCall(page.state())
  assert.equal(page.progress().radioMemory['office-radio'].calls, 5, 'the call was not remembered')
  kept(page.progress().radioMemory['office-radio'], 'after the store remembered a call')
  page.leave()
  kept((page.savedProgress()!.radioMemory as Record<string, Raw>)['office-radio'], 'in the storage')
  // A radio with no entry yet gets one, and nothing is invented for it.
  page.state().rememberRadioCall('vault-radio', { ...later, calls: 1 } as never)
  assert.equal(page.progress().radioMemory['vault-radio'].calls, 1)

  // And by a real press: the porter's own answer, through `placeRadioCall`.
  // That module holds the store under its plain name, so the save has to be
  // under the key before either is first evaluated.
  const night = SAVE_FIXTURES['production-drawer-open'].save
  storage.clear()
  storage.set(STORAGE_KEY, JSON.stringify({ ...night, progress: { ...night.progress, radioMemory: { 'office-radio': later } } }))
  const window = Object.assign(new EventTarget(), { setTimeout: () => 1, clearTimeout: () => undefined })
  Object.assign(globalThis, { window, document: Object.assign(new EventTarget(), { visibilityState: 'visible' }) })
  const { placeRadioCall } = await import('../src/engine/radioCall.ts')
  const { useMuseum } = await import('../src/state/store.ts')
  const remembered = () => useMuseum.getState().progress.radioMemory['office-radio'] as unknown as Raw
  kept(remembered(), 'on load (was the store evaluated before this test put the save there?)')
  // "Continue": nobody answers a radio from the title screen.
  useMuseum.getState().start()

  // An hour after his last call, with a dice that never loses its temper.
  // The press that reaches him may come after a call he still owed.
  const now = later.lastCallAt + 3_600_000
  for (let presses = 0; presses < 40 && remembered().calls === later.calls; presses += 1) {
    assert.ok(placeRadioCall('office-radio', now, () => 0.99), 'the radio did not answer')
  }
  assert.equal(remembered().calls, later.calls + 1, 'the porter never answered a call of the player\'s')
  assert.equal(remembered().lastCallAt, now)
  kept(remembered(), 'after a real call')
  window.dispatchEvent(new Event('pagehide'))
  kept(((savedWhole().progress ?? {}).radioMemory as Record<string, Raw>)['office-radio'], 'in the storage, after a real call')
})

// ---------------------------------------------------------------------------
// Rule 1: a field this build does not know stays
// ---------------------------------------------------------------------------

// Every function of the store, with arguments that make it do its work, is the
// table in `lib/storeActions.ts`: this suite runs each one against a save from
// a later build, and `test:triggers` against a save with a consequence owed.

await test('a field this build does not know survives the load, every action and the write', async () => {
  const page = await openGame(saveOf({ ...SAMPLE_SAVE, ...UNKNOWN }))
  const unknownOf = (progress: Raw) => Object.fromEntries(Object.keys(UNKNOWN).map((field) => [field, progress[field]]))
  assert.deepEqual(unknownOf(page.progress()), UNKNOWN, 'the load dropped what it did not know')
  assert.deepEqual(page.progress(), { ...SAMPLE_SAVE, ...UNKNOWN }, 'the load changed what it did know')

  const functions = Object.entries(page.state())
    .filter(([, value]) => typeof value === 'function')
    .map(([name]) => name)
  assert.deepEqual(
    [...functions].sort(),
    [...Object.keys(ACTIONS), 'resetProgress'].sort(),
    'the store and this suite disagree about what the store can do: every action runs here against a save from a later build',
  )

  for (const [name, act] of Object.entries(ACTIONS)) {
    const before = throughJson(page.progress())
    act(page.state())
    assert.deepEqual(unknownOf(page.progress()), UNKNOWN, `${name} dropped a field it does not know`)
    assert.deepEqual(shrunk(before, page.progress()), [], `${name} took something out of the save`)
    assert.equal(page.progress().contentLot, SAMPLES.contentLot, `${name} moved contentLot`)
  }
  // The actions did act: a table of no-ops would have passed everything above.
  const played = page.progress()
  for (const [field, expected] of Object.entries(ACTED)) {
    if (typeof expected === 'string') assert.equal(played[field], expected, field)
    else for (const item of expected) assert.ok((played[field] as string[]).includes(item), `${field} never got "${item}"`)
  }
  assert.deepEqual(played.clockSeconds, { ...SAMPLES.clockSeconds, 'office-clock': 700 })
  assert.equal(played.radioMemory['office-radio'].calls, 5)

  page.leave()
  assert.deepEqual(page.savedProgress(), throughJson(played), 'the write is not the state')
  const back = await openGame(page.savedText()!)
  assert.deepEqual(back.progress(), throughJson(played), 'the next load lost something')

  // "New game" is the one thing that erases, and it erases these too.
  back.state().resetProgress()
  assert.deepEqual(back.progress(), emptyProgress())
  assert.deepEqual(back.savedProgress(), emptyProgress(), 'a reload would bring the old save back')
})

await test('a `__proto__` key in the save is data, not a prototype', async () => {
  // Written as text: an object literal cannot spell an own `__proto__` key,
  // and JSON.parse makes exactly that out of a tampered save.
  const tampered =
    '{"settings":{},"progress":{"version":1,"radioCalls":[],"catalogued":["ball-spalding"],' +
    '"__proto__":{"polluted":true,"catalogued":["stolen"]},' +
    '"clockSeconds":{"__proto__":5,"office-clock":3},' +
    '"radioMemory":{"__proto__":{"calls":1,"temper":0,"lastCallAt":0,"lastHint":-1}}}}'
  const page = await openGame(tampered)

  const check = (progress: Progress & Raw, when: string) => {
    assert.equal(Object.getPrototypeOf(progress), Object.prototype, `${when}: the save became somebody's prototype chain`)
    assert.ok(Object.hasOwn(progress, '__proto__'), `${when}: the key is gone`)
    assert.deepEqual(Object.getOwnPropertyDescriptor(progress, '__proto__')?.value, { polluted: true, catalogued: ['stolen'] })
    assert.equal((progress as Raw).polluted, undefined, when)
    assert.equal(({} as Raw).polluted, undefined, `${when}: Object.prototype was written to`)
    assert.ok(progress.catalogued.includes('ball-spalding') && !progress.catalogued.includes('stolen'), when)
    for (const field of ['clockSeconds', 'radioMemory'] as const) {
      assert.equal(Object.getPrototypeOf(progress[field]), Object.prototype, `${when}: ${field}`)
      assert.ok(Object.hasOwn(progress[field], '__proto__'), `${when}: ${field} lost the key`)
    }
    assert.equal(Object.getOwnPropertyDescriptor(progress.clockSeconds, '__proto__')?.value, 5)
    assert.equal(Object.getOwnPropertyDescriptor(progress.radioMemory, '__proto__')?.value.calls, 1)
  }
  check(page.progress(), 'on load')
  assert.deepEqual(page.progress().catalogued, ['ball-spalding'])
  assert.equal(page.progress().clockSeconds['office-clock'], 3)
  for (const act of Object.values(ACTIONS)) act(page.state())
  check(page.progress(), 'after every action')
  page.leave()
  assert.ok(page.savedText()!.includes('"__proto__":{"polluted":true,"catalogued":["stolen"]}'), 'the write dropped the key')
  check((await openGame(page.savedText()!)).progress(), 'on the next load')
})

// ---------------------------------------------------------------------------
// What "New game" would erase
// ---------------------------------------------------------------------------

await test('"New game" is offered by the table: every field that counts is enough alone', () => {
  const fresh = emptyProgress()
  assert.equal(hasSavedProgress(fresh), false)
  // The truth table `test-opening-flow.ts` holds, kept as it was.
  assert.equal(hasSavedProgress({ ...fresh, roomsVisited: [SPAWN.room] }), false, 'clicking Enter once is not a save worth erasing')
  assert.equal(hasSavedProgress({ ...fresh, roomsVisited: ['atrium'] }), true)
  assert.equal(hasSavedProgress({ ...fresh, roomsVisited: [SPAWN.room, 'atrium'] }), true)
  assert.equal(hasSavedProgress({ ...fresh, documentsRead: ['doc-welcome'] }), true)
  assert.equal(hasSavedProgress({ ...fresh, radioCalls: ['porter-first-call'] }), true)

  // The visited rooms have that rule of their own; every other field answers by its column.
  assert.equal(PROGRESS_FIELDS.roomsVisited.counts, false, 'the spawn room would count as progress')
  for (const field of fields.filter((name) => name !== 'roomsVisited')) {
    assert.equal(
      hasSavedProgress({ ...fresh, [field]: sampleOf(field) }),
      PROGRESS_FIELDS[field].counts,
      `${field} alone: the title and the table disagree`,
    )
  }
  // By name, so that a column flipped in the table is a decision and not a slip.
  assert.deepEqual(
    fields.filter((field) => PROGRESS_FIELDS[field].counts).sort(),
    [
      'catalogued',
      'credentials',
      'devicesCarried',
      'documentsRead',
      'doorsReleased',
      'factsKnown',
      'flags',
      'hotspots',
      'locksOpened',
      'locksSeen',
      'radioCalls',
      'roomsPowered',
    ],
  )
  // A field from a later build is not this build's to judge.
  assert.equal(hasSavedProgress({ ...fresh, ...UNKNOWN } as Progress), false)
})

// ---------------------------------------------------------------------------
// The version that never moves (DL2-5)
// ---------------------------------------------------------------------------

await test('SAVE_VERSION is 1, and a save of another version is a new game', async () => {
  assert.equal(
    SAVE_VERSION,
    1,
    'SAVE_VERSION moved. A save of another version is not read (saveMigrations.ts): raising it starts every player over. ' +
      'What changes from lot to lot is contentLot, with a migration.',
  )
  assert.ok(STORAGE_KEY.endsWith(':v1'))
  // No build ever wrote another version, so there is no format to read: guessing at one would be inventing a save.
  for (const other of [
    { version: 99, catalogued: ['x'] },
    { version: 2, catalogued: ['x'] },
    { version: 0, catalogued: ['x'] },
    { version: '1', catalogued: ['x'] },
    { catalogued: ['x'] },
    null,
    undefined,
    'texto',
    7,
    ['x'],
  ]) {
    assert.deepEqual(migrateProgress(other), emptyProgress(), JSON.stringify(other))
  }
  const page = await openGame(saveOf({ version: 99, catalogued: ['ball-spalding'], termsSigned: ['termo-posse'] }))
  assert.deepEqual(page.progress(), emptyProgress())
  assert.equal(page.store.hasSavedProgress(page.progress()), false)
  assert.equal(page.store.SAVE_VERSION, 1)
})

// ---------------------------------------------------------------------------
// The title screen imports the store, and the store imports no content
// ---------------------------------------------------------------------------

await test('the reader of imports tells a type import from one that runs', () => {
  const source = [
    "import type { A } from './type-only'",
    "import { type B } from './inline-type'",
    "import c, { d } from './value'",
    " * import x from './in-a-block-comment'",
    "// import y from './commented-out'",
    "export { e } from './re-exported'",
    "export type { F } from './type-re-export'",
    "export * from './star'",
    "export * as g from './namespace'",
    "import './side-effect'",
    '  import.meta.hot?.dispose(() => {})',
    'export function h() {}',
    "import type { I } from './type-after-a-function'",
    'import {',
    '  j,',
    '  k,',
    "} from './many-lines'",
    "const later = () => import('./lazy')",
  ].join('\n')
  assert.deepEqual(
    staticSpecifiers(source).sort(),
    ['./inline-type', './many-lines', './namespace', './re-exported', './side-effect', './star', './value'],
  )
  assert.deepEqual(dynamicSpecifiers(source), ['./lazy'])
})

await test('the store and what it imports statically never reach the content', () => {
  const graph = staticImportGraph(ROOT, 'src/state/store.ts')
  assert.deepEqual(graph.unresolved, [], 'an import points at no file')
  assert.deepEqual(graph.packages, ['zustand'])
  // Each of these says in its own header that it imports nothing of the
  // content. A module added here is added on purpose: it ships with the title.
  assert.deepEqual(graph.modules, [
    'src/content/contentLot.ts',
    'src/content/legacySave.ts',
    'src/content/spawn.ts',
    'src/state/progressFields.ts',
    'src/state/progressRules.ts',
    'src/state/saveMigrations.ts',
    'src/state/store.ts',
  ])
  // Nor later: a store that fetched content on its own would do it on the title screen.
  for (const module of graph.modules) {
    assert.deepEqual(dynamicSpecifiers(read(module)), [], `${module} asks for a module with import()`)
  }
  // The walk has teeth: a module that does import the museum is seen to.
  assert.ok(staticImportGraph(ROOT, 'src/engine/Interaction.tsx').modules.includes('src/content/museum.ts'))
})

// ---------------------------------------------------------------------------
// Rule 2: the build before this one can read what this one writes
// ---------------------------------------------------------------------------

const L1_FIELDS = Object.keys(frozenL1.migrateProgress(null))

/** The fields L1 knows that come out of L1's own loader different from what was written. */
function lostReadingAsL1(written: Raw): string[] {
  const readByL1 = frozenL1.migrateProgress(throughJson(written)) as unknown as Raw
  return L1_FIELDS.filter((field) => !isDeepStrictEqual(readByL1[field], written[field]))
}

await test('the frozen code of L1 is the code of L1', () => {
  const text = read('scripts/lib/frozen/sanitiseProgress.L1.ts').replaceAll('\r\n', '\n')
  assert.equal(
    createHash('sha256').update(text).digest('hex'),
    'bc78cdfbb082a1fb827071f17c6a93f20146bd044eef4753454e1a3e4b644709',
    'scripts/lib/frozen/sanitiseProgress.L1.ts was edited. It is the loader L1 shipped: a later lot freezes its own beside it.',
  )
  // The fields production's saves have, and nothing this lot added.
  assert.deepEqual([...L1_FIELDS].sort(), Object.keys(rawFixture('production-drawer-open')).sort())
  assert.ok(!L1_FIELDS.includes('contentLot'))
})

await test('this build reads a save of production exactly as L1 read it', () => {
  // The loader moved to another file and into a table; for a save production
  // could have written, that must not show. Every field L1 knows comes out of
  // this build's load as it came out of L1's, the opening migration included.
  const saves: [string, Raw][] = [
    ...fixtureIds.map((id): [string, Raw] => [id, rawFixture(id)]),
    ['a save with only a version', { version: 1 }],
    ['a pre-opening save that only walked', { version: 1, roomsVisited: ['atrium'] }],
    ['a pre-opening save that only lit the office', { version: 1, roomsPowered: ['office'] }],
    ['a pre-opening save that lit everything', { version: 1, roomsPowered: ['atrium', 'holyoke', 'office'], catalogued: ['ball-spalding'] }],
    ['a save from the opening on, with the notebook', { version: 1, radioCalls: [], documentsRead: ['doc-welcome'] }],
    ['the same with the lessons already listed', { version: 1, radioCalls: [], documentsRead: ['doc-welcome'], hintsShown: [] }],
    ['the same with junk for lessons', { version: 1, radioCalls: [], documentsRead: ['doc-welcome'], hintsShown: 'x' }],
    ['a list that is a string', { version: 1, radioCalls: 'porter-first-call', catalogued: ['ok', 3, null] }],
    ['a save of another version', { version: 99, catalogued: ['x'] }],
  ]
  for (const [name, raw] of saves) {
    const then = frozenL1.migrateProgress(throughJson(raw)) as unknown as Raw
    const now = migrateProgress(throughJson(raw)) as Progress & Raw
    for (const field of L1_FIELDS) assert.deepEqual(now[field], then[field], `${name}: ${field}`)
  }
})

await test('a save of this lot read by the code of L1 loses nothing L1 knows', async () => {
  // Every field with its sample, written by the store itself.
  const page = await openGame(saveOf({ ...SAMPLE_SAVE, ...UNKNOWN }))
  page.state().recordHint('torch-used')
  page.leave()
  const written = page.savedProgress()!
  for (const field of L1_FIELDS.filter((name) => name !== 'version')) {
    assert.ok(Object.hasOwn(SAMPLES, field), `${field}: L1 knows a field this build has no line for`)
    assert.ok(Object.keys(written[field] as object).length > 0, `${field} was written empty: the comparison below would prove nothing`)
  }
  assert.deepEqual(lostReadingAsL1(written), [])

  // And every save of the corpus, after this build has loaded and rewritten it.
  for (const id of fixtureIds) {
    const corpus = await openGame(SAVE_FIXTURES[id].save)
    corpus.state().setSetting('brightness', 1.1)
    corpus.leave()
    assert.deepEqual(lostReadingAsL1(corpus.savedProgress()!), [], id)
  }

  // The check has teeth: a field whose type changed is a field L1 loses.
  assert.deepEqual(lostReadingAsL1({ ...written, clockSeconds: [['office-clock', 612]] }), ['clockSeconds'])
  assert.deepEqual(lostReadingAsL1({ ...written, catalogued: { 'ball-spalding': true }, lastRoom: 3 }), ['catalogued', 'lastRoom'])
})

// ---------------------------------------------------------------------------
// The lot of a save (T2)
// ---------------------------------------------------------------------------

await test('a save with no contentLot is production\'s: it loads as lot 1 and leaves stamped', async () => {
  // Production never wrote the field, and neither did L1, which changed nothing in what a save holds.
  // From L2 on a record carries the lot of the build that wrote it.
  for (const id of fixtureIds) {
    const lot = fixtureLot(SAVE_FIXTURES[id])
    if (lot < 2) assert.ok(!('contentLot' in rawFixture(id)), `${id} is a record of a build that had no contentLot`)
    else assert.equal(rawFixture(id).contentLot, lot, `${id} is stamped with another lot than the one that wrote it`)
  }
  assert.ok(fixtureIds.some((id) => fixtureLot(SAVE_FIXTURES[id]) >= 2), 'the corpus holds no save that carries its lot')
  const raw = rawFixture('production-drawer-open')
  assert.equal(sanitiseProgress(raw).contentLot, 1)
  assert.equal(migrateProgress(throughJson(raw)).contentLot, CONTENT_LOT)

  const page = await openGame(SAVE_FIXTURES['production-drawer-open'].save)
  assert.equal(page.progress().contentLot, CONTENT_LOT)
  page.state().recordHint('torch-used')
  page.leave()
  assert.equal(page.savedProgress()!.contentLot, CONTENT_LOT)

  // In a build three lots on, the same save is still lot 1 to the migrations and leaves as lot 4.
  const seen: number[] = []
  const later = migrateProgressWith(throughJson(raw), {
    migrations: [{ lot: 1, migrate: (progress, save) => (seen.push(save.savedLot), progress) }],
    aliases: [],
    contentLot: 4,
  })
  assert.deepEqual(seen, [1])
  assert.equal(later.contentLot, 4)
})

await test('an old tab does not lower contentLot', async () => {
  // Two tabs: the newer build wrote lot 7, and this one loads it, plays and writes.
  const page = await openGame(saveOf({ version: 1, radioCalls: [], contentLot: 7, catalogued: ['ball-spalding'] }))
  assert.equal(page.progress().contentLot, 7, 'the load lowered it')
  for (const act of Object.values(ACTIONS)) act(page.state())
  assert.equal(page.progress().contentLot, 7, 'playing lowered it')
  page.leave()
  assert.equal(page.savedProgress()!.contentLot, 7, 'the write lowered it')
  assert.equal((await openGame(page.savedText()!)).progress().contentLot, 7)
  assert.ok(7 > CONTENT_LOT, 'the content caught up with this test: raise the lot it uses')
})

await test('a contentLot that is junk counts as absent', () => {
  for (const junk of ['x', '7', -3, 0, 2.5, null, Number.NaN, Number.POSITIVE_INFINITY, [7], { lot: 7 }, true]) {
    assert.equal(PROGRESS_FIELDS.contentLot.read(junk), 1, `read ${JSON.stringify(junk)}`)
    assert.equal(sanitiseProgress({ version: 1, contentLot: junk }).contentLot, 1)
    assert.equal(migrateProgress({ version: 1, contentLot: junk }).contentLot, CONTENT_LOT)
  }
  // Absent is lot 1 and not this build's lot: the day CONTENT_LOT is 2, a
  // production save must still be older than every migration of lot 1.
  assert.equal(PROGRESS_FIELDS.contentLot.read(undefined), 1)
  assert.equal(PROGRESS_FIELDS.contentLot.read(7), 7)
})

/** Migrations made for the test: each one signs the save and says what it was told. */
function signingMigrations(lots: readonly number[]) {
  const ran: string[] = []
  const migrations: SaveMigration[] = lots.map((lot) => ({
    lot,
    migrate: (progress, save) => {
      ran.push(`L${lot} on a save of L${save.savedLot}`)
      return grantProgress(progress, { hintsShown: [`migrated-${lot}`] })
    },
  }))
  return { ran, migrations }
}

await test('the migration of lot N runs for a save stamped N or earlier, and not for a later one', () => {
  const run = (contentLot: unknown) => {
    const { ran, migrations } = signingMigrations([1, 2, 3])
    const progress = migrateProgressWith(
      { version: 1, radioCalls: [], ...(contentLot === undefined ? {} : { contentLot }) },
      { migrations, aliases: [], contentLot: 3 },
    )
    return { ran, progress }
  }
  assert.deepEqual(run(undefined).ran, ['L1 on a save of L1', 'L2 on a save of L1', 'L3 on a save of L1'])
  assert.deepEqual(run(2).ran, ['L2 on a save of L2', 'L3 on a save of L2'])
  // The lot's own stamp: a lot ships in slices, and the slice that brings a
  // repair has to reach the save the slice before it already stamped (DL2-6).
  assert.deepEqual(run(3).ran, ['L3 on a save of L3'])
  assert.deepEqual(run(4).ran, [])

  assert.deepEqual(run(undefined).progress.hintsShown, ['migrated-1', 'migrated-2', 'migrated-3'])
  assert.equal(run(undefined).progress.contentLot, 3)
  assert.equal(run(2).progress.contentLot, 3)
  assert.equal(run(4).progress.contentLot, 4, 'a save from a later lot was stamped down')

  // A migration is handed the save as it was read from the storage, before the table filled it in.
  let handed: unknown = null
  const raw = { version: 1, hotspots: 'junk' }
  migrateProgressWith(raw, {
    migrations: [{ lot: 1, migrate: (progress, save) => ((handed = save.raw), progress) }],
    aliases: [],
    contentLot: 1,
  })
  assert.equal(handed, raw)
})

await test('every real migration is pure, idempotent and only adds', () => {
  assert.deepEqual(
    SAVE_MIGRATIONS.map((migration) => migration.lot),
    [...SAVE_MIGRATIONS.map((migration) => migration.lot)].sort((first, second) => first - second),
    'migrations run in the order written, which has to be the order of the lots',
  )
  for (const migration of SAVE_MIGRATIONS) {
    assert.ok(Number.isInteger(migration.lot) && migration.lot >= 1 && migration.lot <= CONTENT_LOT + 1, `lot ${migration.lot}`)
  }
  assert.ok(SAVE_MIGRATIONS.some((migration) => migration.lot === 1), 'the opening migration is gone')

  const saves: [string, Raw][] = [
    ...fixtureIds.map((id): [string, Raw] => [id, rawFixture(id)]),
    ['the sample save', { ...SAMPLE_SAVE, ...UNKNOWN }],
    ['a save with only a version', { version: 1 }],
    ['a pre-opening save that only lit the office', { version: 1, roomsPowered: ['office'] }],
  ]
  for (const [name, raw] of saves) {
    const table = sanitiseProgress(raw)
    const save = deepFreeze({ raw: throughJson(raw), savedLot: table.contentLot })
    for (const migration of SAVE_MIGRATIONS) {
      // Frozen: a migration that wrote into what it was given would throw here.
      const once = migration.migrate(deepFreeze(throughJson(table)), save)
      const twice = migration.migrate(deepFreeze(throughJson(once)), save)
      assert.deepEqual(twice, once, `${name}: lot ${migration.lot} is not idempotent`)
      assert.deepEqual(shrunk(table, once), [], `${name}: lot ${migration.lot} took something out`)
    }
    // And the whole load: a second one is the first, and nothing the record holds is gone.
    const loaded = migrateProgress(throughJson(raw))
    assert.deepEqual(migrateProgress(throughJson(loaded)), loaded, `${name}: a second load changes the save`)
    assert.deepEqual(shrunk(table, loaded), [], `${name}: the load took something out`)
    assert.ok(loaded.contentLot >= table.contentLot, name)
  }
})

// ---------------------------------------------------------------------------
// Renamed ids (DL2-8)
// ---------------------------------------------------------------------------

await test('an alias adds the new id and keeps the old one', () => {
  const aliases: SaveAlias[] = [
    { sinceLot: 3, field: 'documentsRead', from: 'doc-predecessor', to: 'doc-otavio-handover' },
    { sinceLot: 4, field: 'locksOpened', from: 'office-drawer', to: 'office-desk-drawer' },
  ]
  const load = (raw: Raw, list = aliases) => migrateProgressWith(raw, { migrations: [], aliases: list, contentLot: 4 })

  const renamed = load({ version: 1, radioCalls: [], documentsRead: ['doc-welcome', 'doc-predecessor'], locksOpened: [] })
  // The old id stays: it is what lets the build before the rename still read this save.
  assert.deepEqual(renamed.documentsRead, ['doc-welcome', 'doc-predecessor', 'doc-otavio-handover'])
  assert.deepEqual(renamed.locksOpened, [], 'an alias gave a player something they never had')
  assert.deepEqual(load(throughJson(renamed)), renamed, 'a second load is the first')

  // Only in the field it names.
  assert.deepEqual(load({ version: 1, radioCalls: [], catalogued: ['doc-predecessor'] }).documentsRead, [])
  // On every load, whatever the lot of the save: a tab of the old build may write the old id tomorrow.
  assert.deepEqual(load({ version: 1, contentLot: 9, radioCalls: [], documentsRead: ['doc-predecessor'] }).documentsRead, [
    'doc-predecessor',
    'doc-otavio-handover',
  ])
  // A rename of a rename settles in one load, whichever was written first.
  const chain: SaveAlias[] = [
    { sinceLot: 6, field: 'catalogued', from: 'ball-b', to: 'ball-c' },
    { sinceLot: 5, field: 'catalogued', from: 'ball-a', to: 'ball-b' },
  ]
  assert.deepEqual(load({ version: 1, radioCalls: [], catalogued: ['ball-a'] }, chain).catalogued, ['ball-a', 'ball-b', 'ball-c'])
  // A migration sees the save before its ids are carried, and the alias sees what the migration granted.
  const granted = migrateProgressWith(
    { version: 1, radioCalls: [] },
    {
      migrations: [{ lot: 1, migrate: (progress) => grantProgress(progress, { documentsRead: ['doc-predecessor'] }) }],
      aliases,
      contentLot: 1,
    },
  )
  assert.deepEqual(granted.documentsRead, ['doc-predecessor', 'doc-otavio-handover'])
})

await test('an alias that points at an id the content does not have fails the content gate', () => {
  assert.deepEqual(validateSaveAliases(MUSEUM, SAVE_ALIASES), [], 'a real alias is broken')
  assert.ok(!validateOpening(MUSEUM).some((issue) => issue.code === 'legacy-save-alias'))

  const codes = (aliases: readonly SaveAlias[]) => validateSaveAliases(MUSEUM, aliases).map((issue) => `${issue.code} ${issue.id}`)
  // One good alias per kind of id the save holds today.
  const good: SaveAlias[] = [
    { sinceLot: 3, field: 'catalogued', from: 'old', to: 'ball-spalding' },
    { sinceLot: 3, field: 'hotspots', from: 'old', to: 'portrait-morgan:date' },
    { sinceLot: 3, field: 'documentsRead', from: 'old', to: 'doc-predecessor' },
    { sinceLot: 3, field: 'factsKnown', from: 'old', to: 'springfield-renaming' },
    { sinceLot: 3, field: 'roomsVisited', from: 'old', to: 'holyoke' },
    { sinceLot: 3, field: 'roomsPowered', from: 'old', to: 'atrium' },
    { sinceLot: 3, field: 'locksOpened', from: 'old', to: 'office-drawer' },
    { sinceLot: 3, field: 'locksSeen', from: 'old', to: 'office-drawer' },
    { sinceLot: 3, field: 'doorsReleased', from: 'old', to: 'atrium-from-holyoke-shortcut' },
    { sinceLot: 3, field: 'radioCalls', from: 'old', to: 'porter-first-call' },
    { sinceLot: 3, field: 'devicesCarried', from: 'old', to: 'office-radio' },
  ]
  assert.deepEqual(codes(good), [])
  // The same ids, each in a field that holds another kind: the right id in the wrong list carries nothing.
  const misplaced = good.map((alias, index) => ({ ...alias, to: good[(index + 1) % good.length].to }))
  // Two pairs of neighbours share a kind (the two lists of rooms, the two of
  // locks), so two of the eleven are still right.
  const sameKindAsNext = ['roomsVisited', 'locksOpened']
  assert.deepEqual(
    codes(misplaced),
    misplaced.filter((alias) => !sameKindAsNext.includes(alias.field)).map((alias) => `legacy-save-alias ${alias.field}:${alias.from}`),
  )
  // Every list of the save has a line in the gate's table of ids, or says it
  // has none. The museum sets no flag and compiles no trigger in this lot, so
  // an alias into either list leads nowhere yet.
  const listFields = fields.filter((field) => Array.isArray(PROGRESS_FIELDS[field].fresh()))
  const unchecked = listFields.filter((field) => !good.some((alias) => alias.field === field))
  assert.deepEqual(unchecked.sort(), ['credentials', 'flags', 'hintsShown', 'triggersFired'])
  assert.deepEqual(codes([{ sinceLot: 3, field: 'flags', from: 'old', to: 'posse-signed' }]), ['legacy-save-alias flags:old'])
  assert.deepEqual(codes([{ sinceLot: 3, field: 'triggersFired', from: 'old', to: 'lock:office-drawer:opened' }]), [
    'legacy-save-alias triggersFired:old',
  ])
  // With a museum that does set the flag and open the drawer onto something, both lead somewhere.
  const withConsequences = {
    ...MUSEUM,
    locks: MUSEUM.locks.map((lock) => ({ ...lock, onOpen: [{ kind: 'set-flag' as const, flag: 'posse-signed' }] })),
  }
  assert.deepEqual(
    validateSaveAliases(withConsequences, [
      { sinceLot: 3, field: 'flags', from: 'old', to: 'posse-signed' },
      { sinceLot: 3, field: 'triggersFired', from: 'old', to: 'lock:office-drawer:opened' },
    ]),
    [],
  )
  // A credential nothing in the content grants or asks for, and a list whose
  // ids the content does not define at all (the lessons are the HUD's): an
  // alias the gate cannot check is an alias the gate refuses.
  assert.deepEqual(codes([{ sinceLot: 3, field: 'credentials', from: 'old', to: 'badge:nobody' }]), ['legacy-save-alias credentials:old'])
  assert.deepEqual(codes([{ sinceLot: 3, field: 'hintsShown', from: 'old', to: PRE_OPENING_SAVE.journalHintId }]), [
    'legacy-save-alias hintsShown:old',
  ])
  assert.deepEqual(codes([{ sinceLot: 3, field: 'documentsRead', from: 'doc-predecessor', to: 'doc-otavio-handover' }]), [
    'legacy-save-alias documentsRead:doc-predecessor',
  ])
  assert.deepEqual(codes([{ sinceLot: 3, field: 'hotspots', from: 'old', to: 'portrait-morgan:nothing' }]), [
    'legacy-save-alias hotspots:old',
  ])
  // A door is the portal that declares the leaf. The portal facing it across
  // the same opening has an id too, and the save never holds that one.
  assert.deepEqual(codes([{ sinceLot: 3, field: 'doorsReleased', from: 'old', to: 'holyoke-shortcut' }]), [
    'legacy-save-alias doorsReleased:old',
  ])
  for (const issue of validateSaveAliases(MUSEUM, misplaced)) assert.equal(issue.severity, 'error')
})

// ---------------------------------------------------------------------------
// Two tabs on one save
// ---------------------------------------------------------------------------

// The store reads the save once, as the page loads, and used to write back
// everything it held whenever it had something new: a tab that had been open
// since before another tab's write put its own, older, save over it. In
// production that is the only way an old build ever meets a newer save (the
// page is served fresh, so a build from before a deploy is a tab from before
// it), and it was the one case nothing protected. Now a tab reads the disk
// before it writes, and what it finds there that it did not write is joined
// with what it holds.

const OLD_TAB = SAVE_FIXTURES['l2-new-game-drawer-touched'].save
const OLD_TAB_PROGRESS: Raw = OLD_TAB.progress

/**
 * What a tab of a later build wrote over the save the old tab had loaded: a
 * later lot's stamp, a field and a trigger this build has no name for, and
 * the progress made there.
 */
const laterWrite = (settings: Raw = {}, more: Raw = {}) => ({
  settings: { ...OLD_TAB.settings, ...settings },
  progress: {
    ...OLD_TAB_PROGRESS,
    contentLot: CONTENT_LOT + 1,
    catalogued: ['portrait-morgan'],
    hotspots: ['portrait-morgan:date'],
    factsKnown: ['springfield-renaming'],
    locksOpened: ['office-drawer'],
    documentsRead: [...(OLD_TAB_PROGRESS.documentsRead as string[]), 'doc-predecessor'],
    roomsVisited: ['office', 'atrium', 'holyoke'],
    triggersFired: ['lock:office-drawer:opened'],
    termsSigned: ['termo-posse'],
    lastRoom: 'holyoke',
    ...more,
  } as Raw,
})

await test('a tab that was open before another tab wrote does not put its older save over it', async () => {
  const old = await openGame(OLD_TAB)
  const later = laterWrite()
  anotherTabWrites(later)

  // The old tab plays on: a door is crossed, which is a write of its own.
  old.state().setCurrentRoom('atrium')
  old.state().powerRoom('holyoke')
  old.leave()

  const disk = old.savedProgress()!
  assert.equal(disk.contentLot, CONTENT_LOT + 1, 'the old tab stamped the save down: the later lot would migrate it a second time')
  assert.deepEqual(disk.termsSigned, ['termo-posse'], 'a field the old tab does not know was written over')
  assert.deepEqual(disk.triggersFired, ['lock:office-drawer:opened'], 'a trigger that fired in the other tab would fire again')
  assert.deepEqual(shrunk(later.progress, disk), [], 'what the other tab did is gone from the disk')
  // And what the old tab did is there with it.
  assert.ok((disk.roomsPowered as string[]).includes('holyoke'), 'the old tab lost its own write')
  assert.equal(disk.lastRoom, 'atrium', "where a tab stopped is that tab's to say")
  // The tab now holds what it wrote: its own plan and catalogue show the other tab's night too.
  assert.deepEqual(throughJson(old.progress()), disk)
  // The next load is that save, whole.
  assert.deepEqual(throughJson((await openGame(old.savedText()!)).progress()), disk)
})

await test('nor when all it changed is a setting, and the setting the other tab chose stays chosen', async () => {
  const old = await openGame(OLD_TAB)
  const later = laterWrite({ brightness: 1.4, locale: 'en' })
  anotherTabWrites(later)

  old.state().setSetting('subtitles', false)
  old.leave()

  // The progress is the other tab's, to the last field: this one had nothing
  // to add but where it stands.
  assert.deepEqual(old.savedProgress(), { ...later.progress, lastRoom: OLD_TAB_PROGRESS.lastRoom })
  // The one setting this tab changed, over the ones it did not.
  assert.deepEqual(savedWhole().settings, { ...later.settings, subtitles: false })
  assert.equal(old.state().settings.brightness, 1.4, 'the tab still shows the brightness it loaded with')
  assert.equal(old.state().settings.locale, 'en')
})

await test("nor when all it has is a clock's time to add as it is hidden", async () => {
  // The clock on the office wall contributes its time to every forced write
  // (`contributeToSave`): a backgrounded tab always has something new.
  const old = await openGame(OLD_TAB)
  assert.deepEqual(OLD_TAB_PROGRESS.clockSeconds, { 'office-clock': 225 })
  old.store.contributeToSave(() => {
    old.state().recordClockSeconds('office-clock', 240)
    old.state().recordClockSeconds('atrium-clock', 12)
  })
  const later = laterWrite({}, { clockSeconds: { 'office-clock': 900 } })
  anotherTabWrites(later)

  old.hide()

  const disk = old.savedProgress()!
  assert.equal(disk.contentLot, CONTENT_LOT + 1)
  assert.deepEqual(disk.termsSigned, ['termo-posse'])
  assert.deepEqual(shrunk(later.progress, disk), [])
  // A clock never runs backwards: the longer of the two times, clock by clock.
  assert.deepEqual(disk.clockSeconds, { 'office-clock': 900, 'atrium-clock': 12 })
  // Nor on the next frame: the tab's own count is behind the save now, and stays out of it.
  old.state().recordClockSeconds('office-clock', 255)
  assert.equal(old.progress().clockSeconds['office-clock'], 900)
  old.state().recordClockSeconds('office-clock', 901)
  assert.equal(old.progress().clockSeconds['office-clock'], 901)
})

await test('two tabs of this build: what each one did reaches the disk, and a tab told of a write shows it', async () => {
  const first = await openGame(OLD_TAB)
  const second = await openTab()
  assert.deepEqual(second.progress(), first.progress())

  first.state().recordCatalogued('ball-spalding')
  first.leave()
  const afterFirst = first.savedText()

  // The browser tells the other tab, which takes it in without waiting to write.
  second.toldOfAWrite()
  assert.ok(second.progress().catalogued.includes('ball-spalding'), 'the tab went on showing the save as it was')
  // It has nothing of its own to add, so it writes nothing: told again, hidden, closed.
  second.toldOfAWrite()
  second.hide()
  second.leave()
  assert.equal(second.savedText(), afterFirst, 'a tab with nothing new wrote')
  // A change to some other key of the origin is not a change to the save.
  second.toldOfAWrite('somebody-else')

  second.state().recordDocument('doc-halstead')
  second.state().setSetting('brightness', 0.8)
  second.leave()
  first.state().setSetting('headBob', true)
  first.state().recordFact('first-rulebook')
  first.leave()

  const disk = first.savedProgress()!
  assert.ok((disk.catalogued as string[]).includes('ball-spalding'))
  assert.ok((disk.documentsRead as string[]).includes('doc-halstead'), 'the first tab wrote over the second')
  assert.ok((disk.factsKnown as string[]).includes('first-rulebook'))
  assert.equal(savedWhole().settings?.brightness, 0.8, 'the first tab put the brightness back')
  assert.equal(savedWhole().settings?.headBob, true)
  // Both hold the same save now and stand in the same room: made to write
  // (hidden, then closed), neither does. That is all these two pages can
  // say. Their timer never fires, so the write a tab schedules as it hears of
  // another tab's is never made here, and whether two tabs fall silent when
  // left alone is asked further down, of tabs that are alive.
  second.toldOfAWrite()
  const settled = first.savedText()
  for (const tab of [first, second]) {
    tab.hide()
    tab.leave()
  }
  assert.equal(first.savedText(), settled, 'a tab holding the very save that is on the disk wrote it again when it was hidden or closed')
  assert.deepEqual(throughJson(second.progress()), disk)

  // The whole storage wiped (the browser's "clear site data" names no key):
  // nothing to take in, and no reason to throw.
  storage.clear()
  assert.doesNotThrow(() => first.toldOfAWrite(null))
  assert.ok(first.progress().catalogued.includes('ball-spalding'))
})

await test("a porter's memory is the later call's, radio by radio, with what a later build keeps inside it", async () => {
  const memory = (calls: number, lastCallAt: number, more: Raw = {}) => ({
    calls,
    temper: 1,
    lastCallAt,
    lastHint: 2,
    lastReplyId: null,
    lastOutburstId: null,
    ...more,
  })
  const withMemory = (entry: Raw) => saveOf({ ...OLD_TAB_PROGRESS, radioMemory: { 'office-radio': entry } })

  // The other tab called him later than this one did: its entry stands.
  const earlier = await openGame(withMemory(memory(4, 100)))
  anotherTabWrites(withMemory(memory(6, 300, { mood: 'sour' })))
  earlier.state().rememberRadioCall('office-radio', memory(5, 200))
  earlier.leave()
  assert.deepEqual(earlier.savedProgress()!.radioMemory, { 'office-radio': memory(6, 300, { mood: 'sour' }) })

  // This tab called him last: its call, and still what it never knew about.
  const latest = await openGame(withMemory(memory(4, 100)))
  anotherTabWrites(
    saveOf({ ...OLD_TAB_PROGRESS, radioMemory: { 'office-radio': memory(6, 300, { mood: 'sour' }), 'vault-radio': memory(1, 50) } }),
  )
  latest.state().rememberRadioCall('office-radio', memory(5, 400))
  latest.leave()
  assert.deepEqual(latest.savedProgress()!.radioMemory, {
    'office-radio': memory(5, 400, { mood: 'sour' }),
    'vault-radio': memory(1, 50),
  })
})

await test('"New game" still erases everything, and a tab holding the erased game does not bring it back', async () => {
  // The tab that asks for a new game gets one, whatever another tab wrote in
  // the meantime; the settings chosen there are the player's, and stay.
  const fresh = await openGame(OLD_TAB)
  anotherTabWrites(laterWrite({ brightness: 1.4 }))
  fresh.state().resetProgress()
  assert.deepEqual(fresh.savedProgress(), emptyProgress(), '"New game" kept something of the other tab\'s game')
  assert.deepEqual(fresh.progress(), emptyProgress())
  assert.equal(savedWhole().settings?.brightness, 1.4, '"New game" put a setting back')

  // The other way round, which joining alone would get wrong: the union of an
  // erased game and a new one is the erased game. A new game is marked, and a
  // tab that finds another game's mark on the disk takes that game as it is.
  const stale = await openGame(SAVE_FIXTURES['production-drawer-open'].save)
  const restarted = await openTab()
  stale.store.contributeToSave(() => stale.state().recordHint('torch-used'))
  restarted.state().resetProgress()
  const mark = savedWhole().game
  assert.ok(typeof mark === 'string' && mark.length > 0, 'a new game is not marked as one')
  // Each store says which game it holds, to whoever in its scene keeps a
  // count of its own (the clock on the wall, further down): the tab that
  // started over is in the new one, and the other has not heard yet.
  assert.equal(restarted.store.gameInPlay(), mark)
  assert.equal(stale.store.gameInPlay(), undefined, 'a save that never started over has a mark')

  stale.state().recordDocument('doc-rule-changes')
  stale.hide()
  assert.deepEqual(shrunk(rawFixture('production-drawer-open'), stale.savedProgress()!).length > 0, true, 'the tab that still held the erased game wrote it back')
  assert.deepEqual(stale.savedProgress()!.catalogued, [])
  assert.deepEqual(stale.savedProgress()!.documentsRead, [], 'what the stale tab did in the erased game went into the new one')
  assert.equal(savedWhole().game, mark)
  assert.deepEqual(stale.progress().catalogued, [], 'the stale tab goes on showing a game that no longer exists')
  assert.equal(stale.store.gameInPlay(), mark, 'the tab that took the new game does not say it is in it')

  // From there the stale tab plays the new game, and the tab that started it is not handed the old one.
  stale.state().recordCatalogued('ball-spalding')
  stale.leave()
  assert.deepEqual(stale.savedProgress()!.catalogued, ['ball-spalding'])
  restarted.toldOfAWrite()
  assert.deepEqual(restarted.progress().catalogued, ['ball-spalding'])
  restarted.state().recordHint('journal-taken')
  restarted.leave()
  assert.deepEqual(restarted.savedProgress()!.catalogued, ['ball-spalding'])
  assert.deepEqual(restarted.savedProgress()!.documentsRead, [], 'the erased game came back into the tab that erased it')

  // The mark is the game's: it survives a reload, and the next "New game" is another one.
  const reloaded = await openGame(restarted.savedText()!)
  reloaded.state().setSetting('brightness', 1.1)
  reloaded.leave()
  assert.equal(savedWhole().game, mark, 'a reload dropped the mark of the game')
  reloaded.state().resetProgress()
  assert.notEqual(savedWhole().game, mark, 'two games share a mark')
  assert.equal(typeof savedWhole().game, 'string')

  // A save that was never started over carries no mark, and is written as it always was.
  const never = await openGame(OLD_TAB)
  never.state().recordHint('torch-used')
  never.leave()
  assert.deepEqual(Object.keys(savedWhole()), ['settings', 'progress'])

  // On record, the limit: a build from before the mark cannot say it started
  // over. Its empty save reads exactly like the save of a tab that had not
  // played yet, so it is joined, and the game this tab holds stays. Dropping
  // a player's night on that evidence would be the worse mistake.
  const holder = await openGame(SAVE_FIXTURES['production-drawer-open'].save)
  anotherTabWrites(saveOf(throughJson(frozenL1.migrateProgress(null)) as unknown as Raw))
  holder.state().recordHint('torch-used')
  holder.leave()
  assert.deepEqual(shrunk(rawFixture('production-drawer-open'), holder.savedProgress()!), [])
})

await test('what another build wrote beside the settings and the progress stays in the save', async () => {
  const beside = { profile: { name: 'curadora' }, seen: ['changelog-l3'] }
  // There when the tab loaded, and written by another tab afterwards: both are carried.
  const page = await openGame({ ...saveOf(SAMPLE_SAVE), ...beside })
  page.state().setSetting('brightness', 1.1)
  page.leave()
  assert.deepEqual(savedWhole().profile, beside.profile, 'the write dropped what it did not know, one level up')
  assert.deepEqual(savedWhole().seen, beside.seen)
  assert.deepEqual(page.savedProgress(), SAMPLE_SAVE)

  anotherTabWrites({ ...saveOf(SAMPLE_SAVE), ...beside, seen: ['changelog-l3', 'changelog-l4'] })
  page.state().setSetting('brightness', 1.2)
  page.leave()
  assert.deepEqual(savedWhole().seen, ['changelog-l3', 'changelog-l4'], 'this tab never changes it, so its copy is never the newer one')
  assert.equal(savedWhole().settings?.brightness, 1.2)

  // Something under the key that is no save at all is nothing to join with.
  for (const junk of ['not json', '7', '[]', 'null', '"texto"']) {
    const tab = await openGame(saveOf(SAMPLE_SAVE))
    anotherTabWrites(junk)
    assert.doesNotThrow(() => tab.toldOfAWrite(), junk)
    tab.state().recordHint('torch-used')
    tab.leave()
    assert.deepEqual(shrunk(SAMPLE_SAVE, tab.savedProgress()!), [], junk)
  }
})

await test('joining two copies of a save only adds, field by field, and joining twice is joining once', () => {
  const ours = migrateProgress({ ...throughJson(SAMPLE_SAVE), ...UNKNOWN, onlyOurs: ['kept'] })
  const theirs = migrateProgress({
    version: 1,
    contentLot: CONTENT_LOT + 5,
    catalogued: ['portrait-morgan', 'ball-spalding'],
    radioCalls: ['porter-first-call', 'porter-late-call'],
    clockSeconds: { 'office-clock': 20, 'vault-clock': 77 },
    radioMemory: { 'office-radio': { calls: 9, temper: 0, lastCallAt: 5, lastHint: 0, lastReplyId: null, lastOutburstId: null } },
    lastRoom: 'holyoke',
    nightsWorked: 4,
    wiresJoined: { 'paris-hero': { from: 'a', to: 'b' } },
  })
  const joined = joinProgress(deepFreeze(throughJson(theirs)), deepFreeze(throughJson(ours))) as Progress & Raw

  // Every field of the table has its rule, and none takes anything away.
  for (const field of fields) assert.equal(typeof PROGRESS_FIELDS[field].join, 'function', `${field} has no rule for two copies`)
  // Of what the table knows, nothing of either copy is gone; of the rest, nothing of the disk's.
  const knownOf = (save: Raw): Raw => Object.fromEntries(fields.map((field) => [field, save[field]]))
  assert.deepEqual(shrunk(knownOf(ours as Raw), joined), [], "the tab's copy lost something")
  assert.deepEqual(shrunk(theirs as Raw, joined), [], "the disk's copy lost something")
  assert.equal(joined.version, 1)
  assert.equal(joined.contentLot, CONTENT_LOT + 5, 'the lot of a save is the highest any copy says')
  // A list is the disk's, then what the tab has that it lacks: nothing twice.
  assert.deepEqual(joined.catalogued, ['portrait-morgan', 'ball-spalding'])
  assert.deepEqual(joined.radioCalls, ['porter-first-call', 'porter-late-call', 'porter-radio-taken'])
  assert.deepEqual(joined.clockSeconds, { 'office-clock': 612, 'vault-clock': 77, 'atrium-clock': 0.5 })
  assert.equal(joined.radioMemory['office-radio'].calls, 4, 'the later call is the one remembered')
  assert.equal(joined.lastRoom, 'atrium', "where the tab stopped is the tab's to say")
  // What this build does not know: the disk's copy, and the tab's only where the disk has none.
  assert.equal(joined.nightsWorked, 4)
  assert.deepEqual(joined.wiresJoined, { 'paris-hero': { from: 'a', to: 'b' } })
  assert.deepEqual(joined.termsSigned, UNKNOWN.termsSigned)
  assert.deepEqual(joined.onlyOurs, ['kept'])

  assert.deepEqual(joinProgress(joined, ours), joined, 'a second join added something')
  assert.deepEqual(joinProgress(joined, theirs), { ...joined, lastRoom: theirs.lastRoom })
  for (const [name, save] of [['ours', ours], ['theirs', theirs], ['a new game', emptyProgress()]] as const) {
    assert.deepEqual(joinProgress(save, save), save, `${name} joined with itself changed`)
    assert.deepEqual(joinProgress(save, emptyProgress()), { ...save, lastRoom: SPAWN.room }, `${name} joined with a new game changed`)
  }
  // Each field alone, against a new game on either side: the sample comes out whole.
  for (const field of fields.filter((name) => name !== 'lastRoom')) {
    const one = { ...emptyProgress(), [field]: throughJson(sampleOf(field)) } as Progress
    assert.deepEqual(joinProgress(one, emptyProgress())[field], sampleOf(field), `${field}: the disk's value was lost`)
    assert.deepEqual(joinProgress(emptyProgress(), one)[field], sampleOf(field), `${field}: the tab's value was lost`)
  }

  // A `__proto__` key stays a piece of data on its way through.
  const tampered = migrateProgress(JSON.parse('{"version":1,"radioCalls":[],"__proto__":{"polluted":true}}'))
  for (const result of [joinProgress(tampered, emptyProgress()), joinProgress(emptyProgress(), tampered)]) {
    assert.equal(Object.getPrototypeOf(result), Object.prototype)
    assert.deepEqual(Object.getOwnPropertyDescriptor(result, '__proto__')?.value, { polluted: true })
    assert.equal(({} as Raw).polluted, undefined)
  }
})

// ---------------------------------------------------------------------------
// Tabs that are alive
// ---------------------------------------------------------------------------

// Every tab above has a timer that never fires, and hears of another tab's
// write only when its case says so. Nothing there could see what two tabs do
// to each other once they are left alone, and what they did was write the
// save at each other for as long as both were open. Where a tab's player
// stands is that tab's to say (`lastRoom`), so two tabs in two rooms never
// hold the same save: each took the other's room on the disk for something
// it had not written yet, wrote its own, and woke the other to do the same.
// From here on the tabs are the ones of `lib/liveTabs.ts`: a timer the store
// asked for fires, and a write is told to every other tab, round after round
// until nobody has anything left to do.

type StoreState = ReturnType<StoreModule['useMuseum']['getState']>

/**
 * How many rounds "until silence" may take before a case gives up. The
 * longest any of them needs is measured in the seeded run below, and held
 * there to a ceiling of its own.
 */
const ROUNDS = 12

/**
 * What a tab says of itself, and no other tab has to agree with. By name: a
 * second field like it is a decision somebody makes, and the store has to be
 * told of it (`withTabsOwn`, in `progressFields.ts`), or two tabs holding
 * different values of it never fall silent.
 */
const EACH_TABS_OWN: readonly Field[] = ['lastRoom']
const butEachTabsOwn = (progress: Raw): Raw => ({ ...progress, ...Object.fromEntries(EACH_TABS_OWN.map((field) => [field, null])) })

/** The tabs are left alone until nobody has anything to do. Hands back the writes of each round. */
function leftAlone(browser: LiveBrowser, when: string): number[] {
  const { quiet, rounds } = browser.settle(ROUNDS)
  const lastWriters = browser.writes.slice(-4).map((write) => write.by).join(', ')
  assert.ok(
    quiet,
    `${when}: the tabs were still writing the save at each other after ${ROUNDS} rounds ` +
      `(writes per round: ${rounds.join(', ')}; the last by ${lastWriters})`,
  )
  return rounds
}

/**
 * The tabs have fallen silent: they and the disk hold one save, but for
 * where each of them stands, and none has anything left to write.
 */
function agreed(browser: LiveBrowser, when: string) {
  const disk = browser.disk()
  assert.ok(disk?.progress && disk.settings, `${when}: there is no save on the disk`)
  for (const tab of browser.tabs) {
    assert.deepEqual(
      butEachTabsOwn(throughJson(tab.progress())),
      butEachTabsOwn(disk.progress),
      `${when}: "${tab.name}" and the disk hold different saves`,
    )
    assert.deepEqual(throughJson(tab.state().settings), disk.settings, `${when}: "${tab.name}" and the disk hold different settings`)
  }
  // "A tab with nothing new writes nothing", asked the hard way: every one of
  // them is made to write, which is what switching between tabs does.
  const written = browser.writes.length
  for (const tab of browser.tabs) {
    tab.hide()
    tab.show()
  }
  assert.equal(browser.writes.length, written, `${when}: a tab with nothing new wrote as it was hidden`)
  assert.deepEqual(browser.settle(ROUNDS), { quiet: true, rounds: [] }, `${when}: hiding the tabs gave one of them something to do`)
}

await test('two tabs on the title screen and "Continue" in one: one write, and the other has nothing to answer', async () => {
  // "Continue" starts every session in the office, and this player stopped
  // in the atrium: from the first click the two tabs stand in different
  // rooms, without anybody having walked anywhere.
  const save = SAVE_FIXTURES['l2-shortcut-released'].save
  assert.notEqual(save.progress.lastRoom, SPAWN.room, 'the case needs a save whose player stopped outside the room every session starts in')
  for (const kind of ['timeout', 'idle'] as const) {
    const browser = openBrowser(save)
    try {
      const playing = await browser.open('playing', kind)
      const waiting = await browser.open('waiting', kind)
      assert.deepEqual(leftAlone(browser, 'two tabs that only loaded the save'), [], 'a tab that only loaded the save wrote it')

      playing.act((state) => state.start())
      leftAlone(browser, `"Continue" in one of two tabs (a page with ${kind})`)
      assert.deepEqual(
        browser.writes.map((write) => write.by),
        ['playing'],
        'the tab left on the title screen answered a write that brought it nothing',
      )
      assert.equal(playing.progress().lastRoom, SPAWN.room)
      assert.equal(waiting.progress().lastRoom, save.progress.lastRoom, "where a tab stands is still that tab's to say")
      agreed(browser, 'after "Continue"')
    } finally {
      browser.close()
    }
  }
})

await test('two tabs, and three, each in a room of its own: a door crossed is one write, and nobody answers it', async () => {
  const ROOMS = ['office', 'atrium', 'holyoke']
  // A player who has been in all three rooms: crossing a door adds no room
  // to the save, it only moves `lastRoom`.
  const save = SAVE_FIXTURES['l2-shortcut-released'].save
  assert.deepEqual([...save.progress.roomsVisited].sort(), [...ROOMS].sort(), 'the case needs a save that has been everywhere')

  for (const count of [2, 3]) {
    const browser = openBrowser(save)
    try {
      const tabs: LiveTab[] = []
      for (let index = 0; index < count; index += 1) {
        tabs.push(await browser.open(`the tab in the ${ROOMS[index]}`, index % 2 === 0 ? 'timeout' : 'idle'))
      }
      const standing = ROOMS.slice(0, count)
      tabs.forEach((tab, index) => {
        tab.act((state) => state.start())
        tab.act((state) => state.setCurrentRoom(ROOMS[index]))
      })
      const check = (when: string) => {
        tabs.forEach((tab, index) => assert.equal(tab.progress().lastRoom, standing[index], `${when}: "${tab.name}" was moved by another tab`))
        agreed(browser, when)
      }
      leftAlone(browser, `${count} tabs, each walked to a room of its own`)
      assert.ok(browser.writes.length <= count, `${count} tabs took ${browser.writes.length} writes to stand in their rooms: more than one each`)
      check(`${count} tabs in ${count} rooms`)

      // Each walks on in turn, one door at a time, twice round the building.
      for (let step = 0; step < count * 6; step += 1) {
        const index = step % count
        const next = ROOMS[(ROOMS.indexOf(standing[index]) + 1) % ROOMS.length]
        const written = browser.writes.length
        tabs[index].act((state) => state.setCurrentRoom(next))
        standing[index] = next
        leftAlone(browser, `${count} tabs, and "${tabs[index].name}" walked into the ${next}`)
        assert.deepEqual(
          browser.writes.slice(written).map((write) => write.by),
          [tabs[index].name],
          `${count} tabs: a door crossed is one write, by the tab that crossed it`,
        )
        assert.equal(browser.disk()?.progress?.lastRoom, next)
      }
      check(`${count} tabs, twice round the building`)

      // On record, what this costs. A tab that finds another tab's write on
      // the disk in the same breath as it has a door to report has, by the
      // rule that keeps the tabs silent, nothing new: its room goes to the
      // disk with the next thing it does, not by itself. Nothing reads
      // `lastRoom` back (every session starts at the spawn), and the other
      // choice is the two tabs writing for ever.
      const [reader, walker] = tabs
      const written = browser.writes.length
      reader.act((state) => state.recordHint('a-lesson-read-in-one-tab'))
      reader.runTimers()
      const next = ROOMS[(ROOMS.indexOf(standing[1]) + 1) % ROOMS.length]
      walker.act((state) => state.setCurrentRoom(next))
      standing[1] = next
      // The walker's write comes due before the browser has told it of the reader's.
      walker.runTimers()
      assert.deepEqual(browser.writes.slice(written).map((write) => write.by), [reader.name])
      assert.equal(browser.disk()?.progress?.lastRoom, standing[0])
      assert.ok(walker.progress().hintsShown.includes('a-lesson-read-in-one-tab'), 'the walker did not take in what it found on the disk')
      walker.act((state) => state.recordHint('a-lesson-read-in-the-other'))
      leftAlone(browser, 'the walker did something else')
      assert.equal(browser.disk()?.progress?.lastRoom, next, "the walker's room did not go with its next write")
      check(`${count} tabs, after a door and a write crossed`)
    } finally {
      browser.close()
    }
  }
})

/**
 * Another valid value for every field of the table, by the kind of its
 * sample: what a tab that played somewhere else would hold. A field of a new
 * kind has no rule here, and the case below says so before it proves
 * anything.
 */
function elsewhere(tab: number): Raw {
  const other = (field: Field): unknown => {
    const sample = sampleOf(field)
    if (Array.isArray(sample)) return [`${field}-of-tab-${tab}`, sample[0]]
    if (typeof sample === 'number') return sample + tab
    if (typeof sample === 'string') return `room-of-tab-${tab}`
    // A record. Every entry of the sample has moved on a little (a clock that
    // ran longer, a porter called later), and one more is this tab's alone.
    const moved = Object.entries(sample as Record<string, unknown>).map(([key, value]): [string, unknown] => [
      key,
      typeof value === 'number' ? value + tab : { ...(value as Raw), calls: 9 + tab, lastCallAt: (value as { lastCallAt: number }).lastCallAt + tab },
    ])
    return Object.fromEntries([...moved, [`${field}-of-tab-${tab}`, moved[0][1]]])
  }
  return { version: 1, ...Object.fromEntries(fields.map((field) => [field, other(field)])), nightsWorked: 3 + tab }
}

await test('every field of the table, different in each of three tabs: they fall silent holding all of it, and differ only in where each stands', async () => {
  // The two cases above are the field that bit. This one is every field the
  // table has, and will have: one whose rule for two copies does not bring
  // two tabs to the same value, and which the store does not know to be each
  // tab's own, keeps them writing here.
  const held = [{ ...SAMPLE_SAVE, ...UNKNOWN }, elsewhere(1), elsewhere(2)]
  const browser = openBrowser(saveOf(held[0]))
  try {
    // Each tab loads what a later moment left on the disk, and the ones
    // already open have not been told yet: a tab in the background hears late.
    const tabs = [await browser.open('first')]
    browser.anotherBuildWrites(saveOf(held[1]))
    tabs.push(await browser.open('second', 'idle'))
    browser.anotherBuildWrites(saveOf(held[2]))
    tabs.push(await browser.open('third'))
    const valuesOf = (field: Field) => new Set(tabs.map((tab) => JSON.stringify(tab.progress()[field])))
    for (const field of fields) {
      assert.equal(valuesOf(field).size, 3, `${field}: the three tabs do not start with three values: give "elsewhere" a value for a field of this kind`)
    }

    const rounds = leftAlone(browser, 'three tabs holding three saves')
    assert.ok(browser.writes.length <= tabs.length, `three tabs took ${browser.writes.length} writes to hold one save (per round: ${rounds.join(', ')})`)
    agreed(browser, 'three tabs holding three saves')

    const disk = browser.disk()!.progress!
    const knownOf = (save: Raw): Raw => Object.fromEntries(fields.map((field) => [field, save[field]]))
    held.forEach((save, index) => assert.deepEqual(shrunk(knownOf(save), disk), [], `what "${tabs[index].name}" held is not all on the disk`))
    assert.equal(disk.contentLot, SAMPLES.contentLot + 2, 'the lot of a save is the highest any tab says')
    assert.deepEqual(disk.clockSeconds, { 'office-clock': 614, 'atrium-clock': 2.5, 'clockSeconds-of-tab-1': 613, 'clockSeconds-of-tab-2': 614 })
    assert.equal((disk.radioMemory as Record<string, Raw>)['office-radio'].calls, 11, 'the porter remembers the call that came last')
    // What this build does not know is the disk's, and the first tab's where
    // the disk had none: rule 1 holds with three tabs alive as with one.
    for (const field of ['termsSigned', 'socketsFilled', 'wiresJoined'] as const) {
      assert.deepEqual(disk[field], UNKNOWN[field], `${field}: a field no tab knows went missing between them`)
    }
    assert.equal(disk.nightsWorked, 5, 'a field this build does not know is as the last tab to load found it')

    // What the tabs still differ in, by name; and each kept its own.
    assert.deepEqual(fields.filter((field) => valuesOf(field).size > 1), [...EACH_TABS_OWN])
    for (const field of EACH_TABS_OWN) {
      tabs.forEach((tab, index) => assert.deepEqual(tab.progress()[field], held[index][field], `"${tab.name}" lost its own ${field}`))
    }
  } finally {
    browser.close()
  }
})

await test('rules that only one tab has: what follows from another tab\'s write is settled there, in one write more, and nobody answers it', async () => {
  // The content's rules reach a store from behind the title button, so of two
  // tabs the one in the game has them and the one on the title screen has
  // not; and a tab of this build has a trigger that a tab of the build before
  // it, still open after a deploy, has never heard of. This lot compiles no
  // trigger, so nothing in production runs this yet; L3 does. The tabs of
  // this suite shared one slot of rules, the process's, and could not ask:
  // each has its own now (`lib/liveTabs.ts`).
  //
  // A rule of the kind a trigger is: it only adds, once, and hands back the
  // save it was given when it has nothing to add.
  const follows = (piece: string) => ({ credentials: [`key:${piece}`], triggersFired: [`exhibit:${piece}:catalogued`] })
  const rules = {
    settle: (progress: Progress) => progress.catalogued.reduce((settled, piece) => grantProgress(settled, follows(piece)), progress),
  }
  const night = SAVE_FIXTURES['production-drawer-open'].save
  const owed = night.progress.catalogued.map((piece) => `key:${piece}`)
  assert.ok(owed.length > 0 && night.progress.credentials.every((key) => !owed.includes(key)), 'the case needs a save the rules owe something to')

  for (const count of [2, 3]) {
    const browser = openBrowser(night)
    try {
      const inTheGame = await browser.open('this build, in the game')
      const older = await browser.open('the build before the rule, in the game', 'idle')
      if (count === 3) await browser.open('this build, on the title screen')
      const writers = (since: number) => browser.writes.slice(since).map((write) => write.by)
      const holds = (when: string, ...keys: string[]) => {
        for (const tab of browser.tabs) {
          for (const key of keys) assert.ok(tab.progress().credentials.includes(key), `${count} tabs, ${when}: "${tab.name}" never got "${key}"`)
        }
        agreed(browser, `${count} tabs, ${when}`)
      }
      assert.deepEqual(leftAlone(browser, `${count} tabs that only loaded the save`), [])

      // "Continue" in one tab: the canvas arrives, and the rules with it. The
      // save was owed a key for every piece catalogued before the rule
      // existed, and that is one write, by the tab that knows the rule.
      inTheGame.act((state) => state.start())
      inTheGame.registerRules(rules)
      assert.deepEqual(older.progress().credentials, night.progress.credentials, 'the rules of one tab reached the store of another')
      leftAlone(browser, `${count} tabs, and the rules arrived in one`)
      assert.deepEqual(writers(0), [inTheGame.name], `${count} tabs: what the save was owed is one write, by the tab that has the rules`)
      holds('after the rules arrived', ...owed)

      // The tab that has no such rule catalogues a piece: its own write, and
      // then the one write of the tab that knows what follows from it. The
      // first tab takes that in and has nothing to add.
      let written = browser.writes.length
      older.act((state) => state.start())
      older.act((state) => state.recordCatalogued('net-1897'))
      assert.ok(!older.progress().credentials.includes('key:net-1897'), 'a tab with no rules settled by itself')
      leftAlone(browser, `${count} tabs, and the one without the rule catalogued a piece`)
      assert.deepEqual(writers(written), [older.name, inTheGame.name], `${count} tabs: a write, and one more for what follows from it`)
      holds('after a piece catalogued where the rule is not known', 'key:net-1897')
      assert.deepEqual(browser.disk()!.progress!.triggersFired, [...night.progress.catalogued, 'net-1897'].map((piece) => `exhibit:${piece}:catalogued`))

      // Where the rule is known, a piece and what follows from it are one write.
      written = browser.writes.length
      inTheGame.act((state) => state.recordCatalogued('gym-suit'))
      leftAlone(browser, `${count} tabs, and the one with the rule catalogued a piece`)
      assert.deepEqual(writers(written), [inTheGame.name])
      holds('after a piece catalogued where the rule is known', 'key:gym-suit')

      // And the rules arriving in a tab whose save is already settled are no write at all.
      written = browser.writes.length
      older.registerRules(rules)
      assert.deepEqual(leftAlone(browser, `${count} tabs, and the rule reached a second one`), [])
      assert.equal(browser.writes.length, written)
    } finally {
      browser.close()
    }
  }
})

await test('"New game" in one live tab: the other takes the new game and falls silent, and what that leaves is on record', async () => {
  const night = SAVE_FIXTURES['production-drawer-open'].save
  const browser = openBrowser(night)
  try {
    const restarting = await browser.open('restarting')
    const playing = await browser.open('playing', 'idle')
    playing.act((state) => state.start())
    playing.act((state) => state.setCurrentRoom('atrium'))
    leftAlone(browser, 'one tab on the title screen and one in the atrium')

    const written = browser.writes.length
    restarting.act((state) => state.resetProgress())
    leftAlone(browser, '"New game" in the tab on the title screen')
    assert.deepEqual(
      browser.writes.slice(written).map((write) => write.by),
      ['restarting'],
      'the tab that takes the new game as it is has nothing to answer, not even where it stands',
    )
    assert.deepEqual(playing.progress(), emptyProgress(), 'the tab that was playing still holds some of the erased game')
    agreed(browser, 'after "New game"')
    const mark = browser.disk()!.game
    assert.ok(typeof mark === 'string' && mark.length > 0)

    // On record: the tab that took the new game is still standing where it
    // stood in the old one, in an atrium the new game has never entered and
    // behind an office door that game has no power to open. Its save is
    // right and its scene is not, until the page is loaded again. Taking it
    // back to the title screen is interface work (L16).
    assert.equal(playing.state().started, true)
    assert.equal(playing.state().currentRoom, 'atrium')
    assert.deepEqual(playing.progress().roomsVisited, [])
    assert.deepEqual(playing.progress().roomsPowered, [])
    // What it does next goes into the new game, and the old one stays erased.
    playing.act((state) => state.recordHint('torch-used'))
    leftAlone(browser, 'the tab that took the new game plays on')
    assert.deepEqual(browser.disk()!.progress!.hintsShown, ['torch-used'])
    assert.deepEqual(browser.disk()!.progress!.catalogued, [])
    assert.equal(browser.disk()!.game, mark)
    agreed(browser, 'the new game, played on')

    // On record too, the mirror of the limit held further up: a tab of the
    // build before the mark is still open. It has no ear for other tabs and
    // writes what it holds, the erased game, with no mark on it; to the tabs
    // of this build that reads like a tab that had not played yet, and they
    // join it. "New game" with such a tab open is undone. It ends when that
    // tab is closed: every page loaded from now on is of this build.
    const erased = throughJson(frozenL1.migrateProgress(throughJson(rawFixture('production-drawer-open')))) as unknown as Raw
    browser.anotherBuildWrites({ settings: night.settings, progress: erased })
    leftAlone(browser, 'a tab of the build before the mark wrote the erased game')
    assert.deepEqual(shrunk(rawFixture('production-drawer-open'), browser.disk()!.progress!), [])
    assert.equal(browser.disk()!.game, mark)
    agreed(browser, 'the erased game, joined back')
  } finally {
    browser.close()
  }
})

// The case above ends on what a tab that took a new game leaves wrong: its
// scene. Everything the suite could say of it was about the store, and one
// thing in that scene writes to the save with no player to press anything:
// the clock on the office wall, which counts the seconds it has run and
// hands them over when its room goes dark, when the tab is hidden and every
// fifteen seconds. Its count was the erased game's.

const CLOCK = MUSEUM.rooms.flatMap((room) => room.devices ?? []).find((device) => device.kind === 'clock')!
const CLOCK_ROOM = MUSEUM.rooms.find((room) => room.id === (CLOCK as { runsWithPowerOf: string }).runsWithPowerOf)!

/**
 * The clock on the wall as `engine/Devices.tsx` keeps it, in a live tab.
 *
 * The count is the component's own (`engine/clockCount.ts`). What stands in
 * for React is its two lines, which the wiring check further down holds the
 * component to: the effect that runs the count while the room has power, and
 * the frame that advances it.
 *
 * React renders a change of the store at once and runs the effects of that
 * render before the page's next task, in a hidden tab as in a visible one. So
 * every task of this tab (something the player does, a write it hears of, a
 * timer, a forced save) is followed here by that commit.
 */
function clockOnTheWall(tab: LiveTab) {
  const count = clockCount(CLOCK.id, tab.store)
  const act = tab.act
  let mounted = true
  let powered: boolean | null = null
  let cleanUp: (() => void) | undefined
  const commit = () => {
    if (!mounted) return
    act((state) => {
      const now = isRoomPowered(CLOCK_ROOM, state.progress.roomsPowered)
      if (now === powered) return
      powered = now
      cleanUp?.()
      cleanUp = undefined
      if (now) cleanUp = count.run()
      else count.stop()
    })
  }
  for (const task of ['act', 'hear', 'runTimers', 'hide', 'show'] as const) {
    const run = tab[task] as (...given: unknown[]) => unknown
    Object.assign(tab, {
      [task]: (...given: unknown[]) => {
        const result = run(...given)
        commit()
        return result
      },
    })
  }
  commit()
  return {
    /** Seconds of frames, each the longest step a clock counts; what the hands show at the end. */
    run: (seconds: number) =>
      act(() => {
        let shown = 0
        for (let frame = 0; frame < seconds / CLOCK_MAX_STEP_SECONDS; frame += 1) shown = count.advance(CLOCK_MAX_STEP_SECONDS)
        return shown
      }),
    /** The room streams out, and the component with it. */
    unmount: () => {
      act(() => cleanUp?.())
      mounted = false
    },
  }
}

const CLOCK_NIGHT = SAVE_FIXTURES['production-drawer-open'].save
/** The seconds the clock had run when the night was saved. */
const RAN = CLOCK_NIGHT.progress.clockSeconds[CLOCK.id]
const clockOnDisk = (browser: LiveBrowser) => browser.disk()!.progress!.clockSeconds as Record<string, number>
const writersSince = (browser: LiveBrowser, since: number) => browser.writes.slice(since).map((write) => write.by)

/** A tab in the game, its clock a minute further on than the save found it, and that minute on the disk. */
async function aMinuteIn(browser: LiveBrowser, name: string) {
  const tab = await browser.open(name, 'idle')
  tab.act((state) => state.start())
  const clock = clockOnTheWall(tab)
  assert.equal(clock.run(60), RAN + 60)
  leftAlone(browser, `"${name}" played for a minute`)
  assert.deepEqual(clockOnDisk(browser), { [CLOCK.id]: RAN + 60 }, 'a running clock saves its time every fifteen seconds')
  return { tab, clock }
}

await test('within one game the clock hands over what it counted: every fifteen seconds, as the tab is hidden, as its room streams out', async () => {
  assert.ok(RAN > 0 && CLOCK_NIGHT.progress.roomsPowered.includes(CLOCK_ROOM.id), 'the cases below need a save whose clock has run')
  const browser = openBrowser(CLOCK_NIGHT)
  try {
    const { tab, clock } = await aMinuteIn(browser, 'playing')
    const other = await browser.open('the other tab')
    // The player looks at the other tab: a forced save, the clock's count in it.
    assert.equal(clock.run(7), RAN + 67)
    tab.hide()
    leftAlone(browser, 'the tab in the game was hidden')
    assert.deepEqual(clockOnDisk(browser), { [CLOCK.id]: RAN + 67 }, 'a hidden tab did not save what its clock had counted')
    // A write of the same game is no reason to drop a count: a setting changed on the title screen.
    other.act((state) => state.setSetting('brightness', 1.2))
    leftAlone(browser, 'a setting changed in the other tab')
    tab.show()
    assert.equal(clock.run(15), RAN + 82)
    tab.hide()
    leftAlone(browser, 'the clock ran on, and the tab was hidden again')
    assert.deepEqual(clockOnDisk(browser), { [CLOCK.id]: RAN + 82 }, 'the clock stopped saving after another tab of the same game wrote')
    agreed(browser, 'one game, a clock running in one tab')

    // The room streams out with seconds not yet saved: they go with it.
    tab.show()
    assert.equal(clock.run(9.5), RAN + 91.5)
    clock.unmount()
    leftAlone(browser, 'the office streamed out')
    assert.deepEqual(clockOnDisk(browser), { [CLOCK.id]: RAN + 91 }, 'a clock unmounted with its room lost the seconds since its last save')
    // And streams back in: the hands start from the save.
    assert.equal(clockOnTheWall(tab).run(1), RAN + 92)
  } finally {
    browser.close()
  }
})

await test('a clock that ran in the erased game adds nothing to the new one, as its room goes dark in the tab that takes the new game', async () => {
  const browser = openBrowser(CLOCK_NIGHT)
  try {
    const { tab: playing, clock } = await aMinuteIn(browser, 'playing')
    const title = await browser.open('title')
    assert.equal(clock.run(7), RAN + 67)
    playing.hide()
    leftAlone(browser, 'the player looked at the other tab')

    const written = browser.writes.length
    title.act((state) => state.resetProgress())
    // The tab in the game hears of it and takes the new game: the office has
    // no power in it, and React stops the clock.
    leftAlone(browser, '"New game" on the title screen')
    assert.deepEqual(clockOnDisk(browser), {}, 'the game that was started over begins with the time the clock ran in the erased one')
    assert.deepEqual(writersSince(browser, written), ['title'], 'the tab that took the new game wrote something of the old one into it')
    assert.deepEqual(playing.progress().clockSeconds, {})
    agreed(browser, 'after "New game"')
    assert.deepEqual((await browser.open('loaded afterwards')).progress().clockSeconds, {})

    // Looked at again, in an office with no power: the hands stand still.
    playing.show()
    assert.equal(clock.run(3), 0, 'the clock of a room with no power is running')
    // The office is lit again, in the new game: the clock starts from the
    // minute the storm stopped it at, and what it counts now is saved.
    playing.act((state) => state.powerRoom(CLOCK_ROOM.id))
    assert.equal(clock.run(20), 20, 'the hands went on from the time of the erased game')
    leftAlone(browser, 'the clock runs in the new game')
    assert.deepEqual(clockOnDisk(browser), { [CLOCK.id]: CLOCK_SAVE_INTERVAL_SECONDS }, 'fifteen seconds are counted from the moment the clock starts')
    playing.hide()
    leftAlone(browser, 'hidden, in the new game')
    assert.deepEqual(clockOnDisk(browser), { [CLOCK.id]: 20 }, 'a clock that changed games no longer saves its time')
    agreed(browser, 'the new game, its clock running')
  } finally {
    browser.close()
  }
})

await test("nor when the new game arrives with the office already lit: not as the tab is hidden, not at its next save, and the hands are the new game's", async () => {
  // A tab a phone froze in the background hears late, and all at once: the
  // save it finds is another game, played on, with the office lit. Its room
  // never went dark, so React has nothing to commit, and the count the clock
  // holds is still the one it would hand over.
  const browser = openBrowser(CLOCK_NIGHT)
  try {
    const { tab: frozen, clock } = await aMinuteIn(browser, 'frozen')
    const other = await browser.open('the other tab')
    frozen.hide()
    leftAlone(browser, 'the tab in the game was hidden')

    other.act((state) => state.resetProgress())
    other.act((state) => state.start())
    other.act((state) => state.powerRoom(CLOCK_ROOM.id))
    const theirs = clockOnTheWall(other)
    assert.equal(theirs.run(40), 40)
    other.runTimers()
    assert.deepEqual(clockOnDisk(browser), { [CLOCK.id]: 30 })

    // Thawed. It hears, and is hidden again before a single frame is drawn:
    // the forced save asks the clock for its count.
    let written = browser.writes.length
    frozen.show()
    frozen.hear()
    assert.deepEqual(frozen.progress().roomsPowered, [CLOCK_ROOM.id])
    frozen.hide()
    assert.deepEqual(clockOnDisk(browser), { [CLOCK.id]: 30 }, "the erased game's time went into the new game as the tab was hidden")
    assert.equal(browser.writes.length, written, 'a tab that took the new game as it is had something to write')
    // And when it is looked at: the hands are the new game's, and so is what it saves.
    frozen.show()
    assert.equal(clock.run(20), 50, 'the hands went on from the time of the erased game')
    written = browser.writes.length
    leftAlone(browser, 'the thawed tab ran its clock')
    assert.deepEqual(clockOnDisk(browser), { [CLOCK.id]: 45 })
    assert.deepEqual(writersSince(browser, written), ['frozen'])
    frozen.hide()
    other.hide()
    leftAlone(browser, 'both hidden')
    assert.deepEqual(clockOnDisk(browser), { [CLOCK.id]: 50 }, 'the longer of the two counts, both of them made in this game')
    agreed(browser, 'the new game, a clock running in each tab')
  } finally {
    browser.close()
  }
})

await test('nor in the tab that starts over itself with its clock running', async () => {
  // No screen does this yet (the title screen has no canvas under it). The
  // tab that is one day taken back to it (L16) will have a clock running, and
  // "New game" forces a save, which asks the clock.
  const browser = openBrowser(CLOCK_NIGHT)
  try {
    const { tab, clock } = await aMinuteIn(browser, 'the only tab')
    assert.equal(clock.run(5), RAN + 65)
    tab.act((state) => state.resetProgress())
    assert.deepEqual(clockOnDisk(browser), {}, '"New game" kept the time of the clock that was running')
    leftAlone(browser, '"New game" with a clock running')
    assert.deepEqual(clockOnDisk(browser), {})
    assert.deepEqual(tab.progress(), emptyProgress())
  } finally {
    browser.close()
  }
})

await test('the clock in the scene is the count these cases run, and records nothing by itself', () => {
  // `clockOnTheWall` is this suite's hand, written after the component and
  // not by it. What it copies is held here, line by line, on the source.
  const readSource: SourceReader = (path) => read(`src/${path}`)
  assert.deepEqual(clockWiringProblems(readSource), [])

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
    [
      'the component recording the clock at a moment of its own',
      changed('engine/Devices.tsx', 'const angles = clockHandAngles(', 'useMuseum.getState().recordClockSeconds(device.id, 0)\n    const angles = clockHandAngles('),
    ],
    [
      'the component contributing to the forced save by itself',
      changed('engine/Devices.tsx', /( *)(if \(powered\) return count\.run\(\))/, '$1contributeToSave(() => undefined)\n$1$2'),
    ],
    [
      'the count run whether the room has power or not',
      changed('engine/Devices.tsx', /if \(powered\) return count\.run\(\)\n *count\.stop\(\)\n *return undefined/, 'return count.run()'),
    ],
    ['the count never stopped when the room goes dark', changed('engine/Devices.tsx', /\n *count\.stop\(\)\n/, '\n')],
    ['the effect not run again when the power changes', changed('engine/Devices.tsx', '}, [count, powered])', '}, [count])')],
    ['the hands turned by a count that is never advanced', changed('engine/Devices.tsx', 'count.advance(delta)', 'count.advance(0)')],
    [
      'a count made anew at every render',
      changed('engine/Devices.tsx', 'useMemo(() => clockCount(device.id, CLOCK_STORE), [device.id])', 'clockCount(device.id, CLOCK_STORE)'),
    ],
    [
      'a count never told which game is in play',
      changed('engine/Devices.tsx', '{ useMuseum, contributeToSave, gameInPlay }', '{ useMuseum, contributeToSave, gameInPlay: () => undefined }'),
    ],
    [
      'the clock asking after the power of another room',
      changed('engine/Devices.tsx', 'const powered = usePowered(device.runsWithPowerOf)', "const powered = usePowered('atrium')"),
    ],
    [
      'the count reaching for the store by itself',
      changed('engine/clockCount.ts', 'import { advanceClockSeconds', "import { useMuseum } from '../state/store.ts'\nimport { advanceClockSeconds"),
    ],
  ]
  const uncaught = refactors.filter(([, reader]) => clockWiringProblems(reader).length === 0).map(([name]) => name)
  assert.deepEqual(uncaught, [], 'a refactor this check exists to catch went through')
})

await test('nor does a call that was in the air in the erased game count as heard in the new one', async () => {
  // The other thing a scene finishes by itself. A call is recorded as heard
  // when its last line ends, and the lines move on by a timer; held under a
  // hidden tab, it is dropped as heard the moment the tab is looked at, if
  // what it says no longer holds. Either way the tab that took the new game
  // wrote the old game's call into it, and the new game never placed that
  // call: the porter's first one, with the way to the breaker in it.
  const CALL = { deviceId: 'office-radio', speakerKey: 'radio.speaker.porter', lineKeys: ['a', 'b'] }
  const night = SAVE_FIXTURES['production-drawer-open'].save
  const browser = openBrowser(night)
  try {
    const playing = await browser.open('playing', 'idle')
    const other = await browser.open('the other tab')
    playing.act((state) => state.start())
    leftAlone(browser, 'one tab in the game')

    // Within one game, another tab's write leaves a call in the air alone,
    // and it is heard out.
    playing.act((state) => state.startRadio({ ...CALL, callId: 'a-call-heard-out' }))
    other.act((state) => state.setSetting('brightness', 1.2))
    leftAlone(browser, 'a setting changed in the other tab, mid-call')
    assert.equal(playing.state().radio?.callId, 'a-call-heard-out', 'a write of the same game cut the porter off')
    playing.act((state) => state.advanceRadio())
    playing.act((state) => state.advanceRadio())
    leftAlone(browser, 'the call ended')
    assert.ok((browser.disk()!.progress!.radioCalls as string[]).includes('a-call-heard-out'))

    playing.act((state) => state.startRadio({ ...CALL, callId: 'porter-first-call' }))
    const written = browser.writes.length
    other.act((state) => state.resetProgress())
    leftAlone(browser, '"New game" in the other tab, mid-call')
    // What the subtitle's timer does when a line has had its time, twice,
    // and what the end of a hold does: none of them has a call to end.
    playing.act((state) => state.advanceRadio())
    playing.act((state) => state.advanceRadio())
    playing.act((state) => state.dropRadio())
    leftAlone(browser, 'the call would have ended')
    assert.deepEqual(browser.disk()!.progress!.radioCalls, [], 'a call placed in the erased game was recorded as heard in the new one')
    assert.deepEqual(writersSince(browser, written), [other.name])
    assert.equal(playing.state().radio, null, 'the call of the erased game is still in the air')
    agreed(browser, 'after "New game", mid-call')

    // Started over once more, with nothing else to tell the two games apart:
    // both are empty, and this tab has changed no setting. The call in the
    // air is the only thing the tab has to let go of.
    playing.act((state) => state.startRadio({ ...CALL, callId: 'porter-first-call' }))
    other.act((state) => state.resetProgress())
    leftAlone(browser, '"New game" again, mid-call')
    assert.equal(playing.state().radio, null, 'a call was kept in the air because the two games looked alike')
  } finally {
    browser.close()
  }
})

await test('a seeded run of tabs that play, hide, close and start over in any order ends in silence, with nothing lost', async () => {
  const ROOMS = ['office', 'atrium', 'holyoke']
  const SEEDS = 48
  /**
   * A third as many nights again, in which some of the tabs have rules and
   * the others have not: the tab in the game beside the one on the title
   * screen, or a build that knows a trigger beside one that does not. After
   * the others, so that the dice of the first 48 falls as it always did.
   */
  const RULED = 16
  const STEPS = 120
  // What a trigger is to the store: it only adds, and hands back the save it
  // was given when there is nothing to add. A flag for every piece, so that
  // what it adds says its step like everything else these nights write.
  const RULES = { settle: (progress: Progress) => grantProgress(progress, { flags: progress.catalogued }) }
  /** One verb of the store per list it adds an id to. */
  const LISTS: Record<string, (state: StoreState, id: string) => void> = {
    catalogued: (state, id) => state.recordCatalogued(id),
    hotspots: (state, id) => state.grant({ hotspots: [id] }),
    documentsRead: (state, id) => state.recordDocument(id),
    factsKnown: (state, id) => state.recordFact(id),
    credentials: (state, id) => state.grantCredential(id),
    locksOpened: (state, id) => state.openLock(id),
    locksSeen: (state, id) => state.grant({ locksSeen: [id] }),
    doorsReleased: (state, id) => state.grant({ doorsReleased: [id] }),
    flags: (state, id) => state.grant({ flags: [id] }),
    radioCalls: (state, id) => state.recordRadioCall(id),
    devicesCarried: (state, id) => state.carryDevice(id),
    hintsShown: (state, id) => state.recordHint(id),
  }
  const listFields = Object.keys(LISTS) as Field[]

  let longest = 0
  let mostWrites = 0
  let longestRuled = 0
  let mostWritesRuled = 0
  let nightsStartedOver = 0
  for (let seed = 1; seed <= SEEDS + RULED; seed += 1) {
    const ruled = seed > SEEDS
    const random = seeded(seed)
    const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]
    const say = (what: string) => `night ${seed}: ${what}`
    const fixture = SAVE_FIXTURES[pick(fixtureIds)]
    const browser = openBrowser(fixture.save)
    try {
      let opened = 0
      const knowing = new Set<LiveTab>()
      const open = async () => {
        opened += 1
        const tab = await browser.open(`tab ${opened}`, pick(['timeout', 'idle'] as const))
        // The first tab of a night with rules has them; every other one, and
        // every reload, by the dice.
        if (ruled && (opened === 1 || random() < 0.5)) {
          tab.registerRules(RULES)
          knowing.add(tab)
        }
        return tab
      }
      for (let tab = 0; tab < 3; tab += 1) await open()

      // Every id says the step it was added at: what is on the disk at the
      // end can be asked when it got there.
      let step = 0
      let startedOverAt = -1
      const added: [Field, string][] = []
      const clocks: Record<string, number> = {}
      const calls: Record<string, number> = {}
      let time = 0
      const plays: ((state: StoreState) => void)[] = [
        ...listFields.map((field) => (state: StoreState) => {
          const id = `step-${step}`
          LISTS[field](state, id)
          added.push([field, id])
        }),
        (state) => state.start(),
        (state) => state.setCurrentRoom(pick(ROOMS)),
        (state) => state.setCurrentRoom(pick(ROOMS)),
        (state) => state.powerRoom(pick(ROOMS)),
        (state) => {
          // A clock only ever reports a longer time, and a call is placed at
          // a later instant than the one before, as on a real wall.
          time += 1 + Math.floor(random() * 30)
          const clock = pick(['clock-a', 'clock-b'])
          state.recordClockSeconds(clock, time)
          clocks[clock] = time
        },
        (state) => {
          time += 1 + Math.floor(random() * 30)
          const radio = pick(['radio-a', 'radio-b'])
          state.rememberRadioCall(radio, {
            calls: Math.floor(random() * 9),
            temper: Math.floor(random() * 4),
            lastCallAt: time,
            lastHint: -1,
            lastReplyId: pick([null, 'a-reply', 'another']),
            lastOutburstId: null,
          })
          calls[radio] = time
        },
        (state) => state.setSetting('brightness', pick([0.8, 1, 1.2, 1.4])),
        (state) => state.setSetting('headBob', random() < 0.5),
        (state) => state.setSetting('locale', pick(['pt-BR', 'en'] as const)),
        // Half the nights never start over, so that "nothing is lost" can be
        // asked of everything anybody did.
        (state) => {
          if (seed % 2 === 1 || random() < 0.5) return
          state.resetProgress()
          startedOverAt = step
        },
      ]

      for (step = 0; step < STEPS; step += 1) {
        const tab = pick(browser.tabs)
        const roll = random()
        if (roll < 0.55) tab.act(pick(plays))
        else if (roll < 0.7) tab.hear()
        else if (roll < 0.85) tab.runTimers()
        else if (roll < 0.9) {
          tab.hide()
          tab.show()
        } else if (roll < 0.94) {
          // Closed, and the game opened again in a new tab: a reload.
          tab.close()
          await open()
        } else browser.settle(3)
      }

      const writtenBefore = browser.writes.length
      const rounds = leftAlone(browser, say(`after ${STEPS} steps`))
      if (ruled) {
        longestRuled = Math.max(longestRuled, rounds.length)
        mostWritesRuled = Math.max(mostWritesRuled, browser.writes.length - writtenBefore)
      } else {
        longest = Math.max(longest, rounds.length)
        mostWrites = Math.max(mostWrites, browser.writes.length - writtenBefore)
      }
      agreed(browser, say('at the end'))

      const disk = browser.disk()!.progress!
      // While a tab that has the rules is open, what follows from the save is
      // in it, whichever tab did the thing it follows from.
      if (browser.tabs.some((tab) => knowing.has(tab))) {
        for (const piece of disk.catalogued as string[]) assert.ok((disk.flags as string[]).includes(piece), say(`"${piece}" was catalogued and what follows from it never reached the disk`))
      }
      if (startedOverAt < 0) {
        // Nobody started over: everything anybody did is there, with all the save began with.
        for (const [field, id] of added) assert.ok((disk[field] as string[]).includes(id), say(`${field} lost "${id}"`))
        assert.deepEqual(shrunk(migrateProgress(throughJson(fixture.save.progress)) as Raw, disk), [], say('the save it began with shrank'))
        for (const [clock, seconds] of Object.entries(clocks)) {
          assert.equal((disk.clockSeconds as Record<string, number>)[clock], seconds, say(`${clock} ran backwards`))
        }
        for (const [radio, at] of Object.entries(calls)) {
          assert.equal((disk.radioMemory as Record<string, Raw>)[radio].lastCallAt, at, say(`${radio}: the later call is not the one remembered`))
        }
      } else {
        // Somebody did: nothing from before the last "New game" is back,
        // whichever tab still held it and whatever it was doing.
        nightsStartedOver += 1
        for (const field of listFields) {
          for (const id of disk[field] as string[]) {
            const at = /^step-(\d+)$/.exec(id)
            assert.ok(at && Number(at[1]) > startedOverAt, say(`${field} holds "${id}", from before the game was started over at step ${startedOverAt}`))
          }
        }
        assert.equal(typeof browser.disk()!.game, 'string', say('the game that was started over lost its mark'))
      }
    } finally {
      browser.close()
    }
  }
  assert.ok(nightsStartedOver >= SEEDS / 4, `only ${nightsStartedOver} of ${SEEDS} nights started over: the dice no longer tries "New game"`)
  // The ceiling, which is what was measured (in these 48 nights, and in 800
  // run once by hand) and what three tabs need at the most when all of them
  // have the same rules, or none as here: each writes what it still held,
  // once, and the last of them writes everything; the round after is the
  // others hearing of it. A write more is a tab answering one that brought
  // it nothing, which is how the endless exchange begins.
  assert.ok(longest <= 2, `a night took ${longest} rounds to fall silent`)
  assert.ok(mostWrites <= 3, `a night took ${mostWrites} writes to fall silent: more than one a tab`)
  // With rules in some tabs only, there is one write more to make and it is
  // not an answer: the last tab to write may have none, and what follows from
  // its write is then written by a tab that has them, a round later. Measured
  // too (these 16 nights, and 800 run once by hand): three rounds, four writes.
  assert.ok(longestRuled <= 3, `a night with rules in some tabs took ${longestRuled} rounds to fall silent`)
  assert.ok(mostWritesRuled <= 4, `a night with rules in some tabs took ${mostWritesRuled} writes to fall silent: more than one a tab and one for what follows`)
})

// ---------------------------------------------------------------------------
// The settings beside the save
// ---------------------------------------------------------------------------

// The settings are read by the same door as the progress, and until now with
// none of its care: whatever the disk held was spread over the defaults and
// used. A later build that has a language or a quality tier this one has not
// is one click away from handing it to a running tab of this build, and a
// locale with no dictionary throws in the first component that translates,
// with nothing to catch it: a blank page, mid-game.

/** Every setting away from its default, at a value this build can use. */
const CHOSEN = {
  locale: 'en',
  quality: 'high',
  brightness: 1.4,
  headBob: true,
  fovPush: true,
  moveSpeed: 1.5,
  lookSensitivity: 0.5,
  touchLookSensitivity: 2,
  touchMoveSensitivity: 0.75,
  subtitles: false,
}
const NOT_A_SWITCH = ['true', 1, 0, null, {}]
const NOT_A_MULTIPLIER = [0, -1, 0.2, 4.01, 1e9, '1', null, false, [1]]
/** What a later build, a rollback or a hand might leave in each setting. The first of each is what the cases below write. */
const UNUSABLE: Record<keyof typeof CHOSEN, readonly unknown[]> = {
  locale: ['es', 'pt', 'EN', '', 7, null, ['en'], { code: 'en' }],
  quality: ['ultra', 'Medium', '', 2, null, ['high']],
  brightness: [2.5, 0.49, 1.81, 0, -1, '1.2', null, true, [1]],
  headBob: NOT_A_SWITCH,
  fovPush: NOT_A_SWITCH,
  moveSpeed: NOT_A_MULTIPLIER,
  lookSensitivity: NOT_A_MULTIPLIER,
  touchLookSensitivity: NOT_A_MULTIPLIER,
  touchMoveSensitivity: NOT_A_MULTIPLIER,
  subtitles: NOT_A_SWITCH,
}
/** The ends of every range and every value of every list: all of them usable. */
const USABLE: Record<keyof typeof CHOSEN, readonly unknown[]> = {
  locale: ['pt-BR', 'en'],
  quality: ['low', 'medium', 'high'],
  brightness: [0.5, 1, 1.8],
  headBob: [true, false],
  fovPush: [true, false],
  moveSpeed: [0.25, 1, 4],
  lookSensitivity: [0.25, 1, 4],
  touchLookSensitivity: [0.25, 1, 4],
  touchMoveSensitivity: [0.25, 1, 4],
  subtitles: [true, false],
}
const settingKeys = Object.keys(CHOSEN) as (keyof typeof CHOSEN)[]
/** Settings a later build keeps beside the ones this build knows. */
const LATER_SETTINGS = { keybinds: { interact: 'KeyE', journal: 'Tab' }, colourFilter: 'deutan' }

await test('a setting this build cannot use is not used: the default on load, the rest as chosen, and the disk left as it was found', async () => {
  const defaults = (await openGame()).store.DEFAULT_SETTINGS as Raw
  assert.deepEqual([...settingKeys].sort(), Object.keys(defaults).sort(), 'a setting of the store has no line in this suite')
  for (const key of settingKeys) assert.notEqual(CHOSEN[key], defaults[key], `${key}: the chosen value is the default, and would prove nothing`)

  // What is chosen and usable is what the game runs on.
  assert.deepEqual((await openGame({ settings: CHOSEN, progress: SAMPLE_SAVE })).state().settings, CHOSEN)
  for (const key of settingKeys) {
    for (const value of USABLE[key]) {
      const page = await openGame({ settings: { ...CHOSEN, [key]: value }, progress: SAMPLE_SAVE })
      assert.deepEqual(page.state().settings, { ...CHOSEN, [key]: value }, `${key} = ${JSON.stringify(value)} was refused`)
    }
    for (const value of UNUSABLE[key]) {
      const page = await openGame({ settings: { ...CHOSEN, [key]: value }, progress: SAMPLE_SAVE })
      assert.deepEqual(page.state().settings, { ...CHOSEN, [key]: defaults[key] }, `${key} = ${JSON.stringify(value)}`)
      assert.deepEqual(page.progress(), SAMPLE_SAVE, 'a setting that could not be used cost the save')
    }
  }
  // Settings that are no record at all are no settings, and leave nothing behind.
  for (const junk of ['abc', 7, null, true, [1, 2], ['en']]) {
    const page = await openGame({ settings: junk, progress: SAMPLE_SAVE })
    assert.deepEqual(page.state().settings, defaults, `settings = ${JSON.stringify(junk)}`)
  }
  // Nor is a tampered key somebody's prototype.
  const tampered = await openGame('{"settings":{"__proto__":{"locale":"es","polluted":true},"locale":"en"},"progress":{"version":1,"radioCalls":[]}}')
  assert.equal(tampered.state().settings.locale, 'en')
  assert.equal(Object.getPrototypeOf(tampered.state().settings), Object.prototype)
  assert.equal(({} as Raw).polluted, undefined)

  // Every setting unusable at once, and two this build has never heard of.
  // What it cannot use is another build's choice, not junk of this one's: it
  // goes back to the disk as it was found, and so does what it does not
  // know (rule 1 of the save, for the settings).
  const found = { ...Object.fromEntries(settingKeys.map((key) => [key, UNUSABLE[key][0]])), ...LATER_SETTINGS }
  const page = await openGame({ settings: found, progress: SAMPLE_SAVE })
  assert.deepEqual(page.state().settings, { ...defaults, ...LATER_SETTINGS })
  page.state().recordHint('torch-used')
  page.leave()
  assert.deepEqual(savedWhole().settings, found, 'a write put this build\'s defaults over what another build had chosen')
  // Until the player chooses here: that one is this tab's to write.
  page.state().setSetting('locale', 'en')
  page.state().setSetting('brightness', 1.2)
  page.leave()
  assert.deepEqual(savedWhole().settings, { ...found, locale: 'en', brightness: 1.2 })
  const back = await openGame(page.savedText()!)
  assert.deepEqual(back.state().settings, { ...defaults, ...LATER_SETTINGS, locale: 'en', brightness: 1.2 })
  back.state().recordHint('journal-taken')
  back.leave()
  assert.deepEqual(savedWhole().settings, { ...found, locale: 'en', brightness: 1.2 }, 'a second session lost what the first one kept')
})

await test('nor is it taken from another tab: a running tab goes on as it was, and the other build keeps its choice', async () => {
  const browser = openBrowser({ settings: CHOSEN, progress: OLD_TAB_PROGRESS })
  try {
    const tab = await browser.open('this build')
    tab.act((state) => state.start())
    leftAlone(browser, 'one tab, in the game')
    const written = browser.writes.length

    // The tab of a later build: a language, a tier and a range this build
    // has not, two settings turned to nonsense, one this build can use, and
    // two it has never heard of.
    const theirs = {
      ...CHOSEN,
      locale: 'es',
      quality: 'ultra',
      brightness: 2.5,
      moveSpeed: 0,
      subtitles: 'on-request',
      headBob: false,
      ...LATER_SETTINGS,
    }
    browser.anotherBuildWrites({ settings: theirs, progress: OLD_TAB_PROGRESS })
    leftAlone(browser, 'a later build wrote its settings')
    // As it was, which is not the default: the player of this tab chose English.
    assert.deepEqual(tab.state().settings, { ...CHOSEN, headBob: false, ...LATER_SETTINGS })
    assert.equal(browser.writes.length, written, 'the tab answered with a write of its own')
    assert.deepEqual(browser.disk()!.settings, theirs)

    // Its next write leaves the other build's choices where they are.
    tab.act((state) => state.recordHint('torch-used'))
    leftAlone(browser, 'this build plays on')
    assert.equal(browser.writes.length, written + 1)
    assert.deepEqual(browser.disk()!.settings, theirs, 'this tab put its own settings over the ones it could not use')
    assert.ok((browser.disk()!.progress!.hintsShown as string[]).includes('torch-used'))

    // What the player changes here is this tab's to write, usable there or not.
    tab.act((state) => state.setSetting('locale', 'pt-BR'))
    tab.act((state) => state.setSetting('quality', 'low'))
    leftAlone(browser, 'the player chooses in this tab')
    assert.deepEqual(browser.disk()!.settings, { ...theirs, locale: 'pt-BR', quality: 'low' })

    // And when the other build chooses again, this tab keeps running on its
    // own and takes what it can use.
    const again = { ...theirs, locale: 'es', quality: 'low', brightness: 3, subtitles: true, keybinds: { interact: 'KeyF' } }
    browser.anotherBuildWrites({ settings: again, progress: browser.disk()!.progress })
    leftAlone(browser, 'the later build chose again')
    assert.deepEqual(tab.state().settings, { ...CHOSEN, locale: 'pt-BR', quality: 'low', headBob: false, subtitles: true, colourFilter: 'deutan', keybinds: { interact: 'KeyF' } })
    assert.deepEqual(browser.disk()!.settings, again, 'the tab undid a choice made in the other build')
    assert.equal(browser.writes.length, written + 2)

    // A second tab of this build, opened now, has only the defaults to fall
    // back on. The two run on different settings under a disk that says a
    // third thing, and that is no more a reason to write than standing in
    // different rooms is: what a tab falls back on is never written.
    const second = await browser.open('this build, opened later', 'idle')
    assert.equal(second.state().settings.brightness, 1)
    assert.equal(tab.state().settings.brightness, CHOSEN.brightness)
    assert.equal(second.state().settings.moveSpeed, 1)
    assert.equal(tab.state().settings.moveSpeed, CHOSEN.moveSpeed)
    assert.deepEqual(leftAlone(browser, 'two tabs of this build on different fallbacks'), [])
    second.act((state) => state.recordHint('a-lesson-in-the-second-tab'))
    tab.act((state) => state.recordHint('a-lesson-in-the-first'))
    leftAlone(browser, 'two tabs of this build on different fallbacks, both playing')
    assert.equal(browser.writes.length, written + 4, 'a lesson in each tab is a write in each, and no answer')
    assert.deepEqual(browser.disk()!.settings, again)
    assert.equal(second.state().settings.brightness, 1)
    assert.equal(tab.state().settings.brightness, CHOSEN.brightness)
    for (const hint of ['torch-used', 'a-lesson-in-the-second-tab', 'a-lesson-in-the-first']) {
      for (const each of [tab, second]) assert.ok(each.progress().hintsShown.includes(hint), `"${each.name}" lacks "${hint}"`)
    }
  } finally {
    browser.close()
  }
})

await test('nor does a setting the disk no longer has go back to its default: a running tab keeps what it ran on, and its next write says so', async () => {
  // A build from before a setting existed writes the settings without it,
  // every time it writes anything. Every case above hands the tab all ten
  // keys, so none of them saw what an absent one does; with the default in
  // its place the suite stayed green, and a player's head-bob would have
  // switched itself off in the middle of a game.
  const ABSENT: readonly string[] = ['locale', 'brightness', 'headBob']
  const fewer = Object.fromEntries(Object.entries(CHOSEN).filter(([key]) => !ABSENT.includes(key)))
  const browser = openBrowser({ settings: CHOSEN, progress: OLD_TAB_PROGRESS })
  try {
    const tab = await browser.open('this build')
    tab.act((state) => state.start())
    leftAlone(browser, 'one tab, in the game')
    const defaults = tab.store.DEFAULT_SETTINGS as Raw
    const written = browser.writes.length

    browser.anotherBuildWrites({ settings: fewer, progress: browser.disk()!.progress })
    leftAlone(browser, 'a build that has three settings fewer wrote the ones it has')
    assert.deepEqual(tab.state().settings, CHOSEN, 'a setting the disk does not have was put back to its default in a running tab')
    // What the tab goes on with is a fallback, and a fallback is never a
    // reason to write: two builds would answer each other for ever.
    assert.equal(browser.writes.length, written, 'the tab answered with a write of its own')
    assert.deepEqual(browser.disk()!.settings, fewer)
    // The other half of the rule: a page that loads now has nothing to go on
    // with, and an absent setting is the default.
    const loaded = await browser.open('this build, loaded with the three absent', 'idle')
    assert.deepEqual(loaded.state().settings, { ...CHOSEN, ...Object.fromEntries(ABSENT.map((key) => [key, defaults[key]])) })
    loaded.close()
    assert.equal(browser.writes.length, written, 'a page that only loaded the save wrote it')

    // The first thing the running tab has to write takes the three back to
    // the disk, as it runs on them.
    tab.act((state) => state.recordHint('torch-used'))
    leftAlone(browser, 'this build plays on')
    assert.equal(browser.writes.length, written + 1)
    assert.deepEqual(browser.disk()!.settings, CHOSEN, 'the settings the other build left out did not go back to the disk with the tab\'s next write')
    assert.deepEqual((await browser.open('this build, loaded afterwards')).state().settings, CHOSEN)
  } finally {
    browser.close()
  }
})

await test('on record: a setting chosen here is undone by a tab of the build before this one, while that tab is open', async () => {
  // The mirror, for the settings, of the limit held under '"New game" in one
  // live tab'. A tab of the build before this one has no ear for other tabs:
  // it writes everything it holds, its settings as it loaded them among it
  // (the office clock makes it do so every 15 s while it is visible). To a
  // tab of this build that write is the player choosing in another tab, and
  // nothing on the disk tells the two apart. It ends when the old tab is
  // closed or loaded again: every page loaded from the deploy on is of this
  // build.
  const before = OLD_TAB.settings as Raw
  assert.equal(before.locale, 'pt-BR', 'the case needs a save whose language is not the one chosen below')
  const browser = openBrowser(OLD_TAB)
  try {
    const tab = await browser.open('this build')
    tab.act((state) => state.setSetting('locale', 'en'))
    leftAlone(browser, 'English, chosen on the title screen of this build')
    assert.equal(browser.disk()!.settings!.locale, 'en')

    // The old tab saves its clock, and its settings with it.
    browser.anotherBuildWrites({ settings: before, progress: { ...OLD_TAB_PROGRESS, clockSeconds: { 'office-clock': 240 } } })
    leftAlone(browser, 'a tab of the build before this one saved its clock')
    assert.equal(tab.state().settings.locale, 'pt-BR')
    assert.equal(browser.disk()!.settings!.locale, 'pt-BR')
    assert.equal(browser.writes.length, 1, 'the tab of this build has nothing to answer: its choice went to the disk once, and was written over')
    // Chosen again, it stands until the old tab's next write.
    tab.act((state) => state.setSetting('locale', 'en'))
    leftAlone(browser, 'English, chosen again')
    assert.equal(browser.disk()!.settings!.locale, 'en')
  } finally {
    browser.close()
  }
})

await test('a setting that is not a plain value, changed in another tab, is not put back as this tab loaded it', async () => {
  // The store told "changed in this tab" from "as the disk had it" with
  // `!==`. For a number or a word that is the question; for an object every
  // read of the disk makes a new one, so from the first write it heard of,
  // the tab took every such setting for one it had chosen, and wrote its
  // old copy over the next change to it.
  const hints = OLD_TAB_PROGRESS.hintsShown as string[]
  const laterBuild = (keybinds: Raw, hintsShown: string[]) => ({
    settings: { ...OLD_TAB.settings, keybinds },
    progress: { ...OLD_TAB_PROGRESS, contentLot: CONTENT_LOT + 1, hintsShown },
  })
  const browser = openBrowser(laterBuild({ interact: 'KeyE' }, hints))
  try {
    const tab = await browser.open('this build')
    // The other tab makes progress and changes no setting: an ordinary write.
    browser.anotherBuildWrites(laterBuild({ interact: 'KeyE' }, [...hints, 'a-later-lesson']))
    leftAlone(browser, 'a write that changed no setting')
    // Then the player rebinds a key there.
    const rebound = laterBuild({ interact: 'KeyF', journal: 'KeyJ' }, [...hints, 'a-later-lesson'])
    browser.anotherBuildWrites(rebound)
    leftAlone(browser, 'a key rebound in the other tab')
    assert.deepEqual(browser.writes, [], 'this tab took the keys it had loaded for keys it had chosen, and wrote them over the new ones')
    assert.deepEqual(browser.disk()!.settings!.keybinds, { interact: 'KeyF', journal: 'KeyJ' })
    assert.deepEqual((tab.state().settings as unknown as Raw).keybinds, { interact: 'KeyF', journal: 'KeyJ' })

    // And when this tab does have something to write, the keys go with it as the other tab left them.
    tab.act((state) => state.setSetting('subtitles', false))
    leftAlone(browser, 'a setting changed in this tab')
    assert.deepEqual(browser.disk()!.settings, { ...rebound.settings, subtitles: false })
    assert.equal(browser.disk()!.progress!.contentLot, CONTENT_LOT + 1)
  } finally {
    browser.close()
  }
})

// ---------------------------------------------------------------------------
// A browser that will not hand over its storage
// ---------------------------------------------------------------------------

await test('a profile that will not even let the storage be named still gets a game', async () => {
  // Chrome with every cookie blocked: reading `window.localStorage` throws a
  // SecurityError. `typeof` forgives a name that does not exist, not a getter
  // that throws, and the store asked `typeof localStorage` outside any `try`
  // as its module was evaluated, on the title screen: a blank page.
  const before = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException("Failed to read the 'localStorage' property from 'Window': Access is denied for this document.", 'SecurityError')
    },
  })
  try {
    assert.throws(() => typeof localStorage, { name: 'SecurityError' }, 'the stand-in is not the browser it stands for')
    const page = await openTab().catch((error: unknown) => assert.fail(`the store could not be evaluated, which is a blank page: ${String(error)}`))
    assert.deepEqual(page.progress(), emptyProgress())
    assert.deepEqual(page.state().settings, page.store.DEFAULT_SETTINGS)

    // Everything the game does, and everything the browser tells it: none of
    // it may throw for want of a place to keep the save.
    for (const [name, act] of Object.entries(ACTIONS)) assert.doesNotThrow(() => act(page.state()), name)
    assert.doesNotThrow(() => page.toldOfAWrite(), 'told of a write')
    assert.doesNotThrow(() => page.toldOfAWrite(null), 'told the storage was cleared')
    assert.doesNotThrow(() => page.hide(), 'hidden')
    // The night was played all the same; it is only not kept.
    for (const [field, expected] of Object.entries(ACTED)) {
      if (typeof expected === 'string') assert.equal(page.progress()[field], expected, field)
      else for (const item of expected) assert.ok((page.progress()[field] as string[]).includes(item), `${field} never got "${item}"`)
    }
    assert.doesNotThrow(() => page.state().resetProgress(), '"New game"')
    assert.deepEqual(page.progress(), emptyProgress())
    assert.doesNotThrow(() => page.leave(), 'closed')
  } finally {
    Object.defineProperty(globalThis, 'localStorage', before)
  }
})

// ---------------------------------------------------------------------------
// The migration cases of the lot plan (docs/lotes/L2-plano.md, §5)
// ---------------------------------------------------------------------------

/**
 * What this lot adds to a save that had none of it. Later slices add their
 * fields here.
 *
 * A lock that is open was touched (DL2-4): that is all a save from before
 * `locksSeen` proves. No flag is inferred, no trigger is taken as fired and
 * no door is taken as released (DL2-3): a save cannot tell a player who left
 * by the shortcut from one who never found it.
 */
const addedByTheLot = (raw: Raw) => ({
  contentLot: CONTENT_LOT,
  locksSeen: raw.locksOpened,
  doorsReleased: [],
  flags: [],
  triggersFired: [],
})

await test('case A and B: production saves come out as they went in, plus the lot', async () => {
  for (const id of ['production-drawer-open', 'production-drawer-closed', 'production-catalogued-unturned', 'production-radio-on-desk'] as const) {
    const raw = rawFixture(id)
    const page = await openGame(SAVE_FIXTURES[id].save)
    assert.deepEqual(page.progress(), { ...raw, ...addedByTheLot(raw) }, id)
  }
  // By value, so that the helper above cannot agree with a mistake: the open
  // drawer is on the plan's list of touched locks, the shut one is not yet.
  assert.deepEqual((await openGame(SAVE_FIXTURES['production-drawer-open'].save)).progress().locksSeen, ['office-drawer'])
  assert.deepEqual((await openGame(SAVE_FIXTURES['production-drawer-closed'].save)).progress().locksSeen, [])
  // Nor is a door released for anybody whose save does not say so: not even
  // for the save of L1's own route, whose player left the wing by the
  // shortcut twice. This used to be asked of every save of the corpus; since
  // the lot closed, the corpus holds saves that do say so.
  const before = fixtureIds.filter((id) => fixtureLot(SAVE_FIXTURES[id]) < 2)
  assert.ok(before.includes('l1-route-end') && before.length >= 6, 'the saves from before the field are gone from the corpus')
  for (const id of before) {
    assert.deepEqual((await openGame(SAVE_FIXTURES[id].save)).progress().doorsReleased, [], id)
  }
})

await test('a save this lot wrote comes out with the door it released and the lock it touched', async () => {
  // The other half of cases A to C: what L2 added is inferred for a save that
  // never had it, and is the save's own word for one that has. A load that
  // "repaired" these from `locksOpened` would shut the door again and take
  // the drawer off the plan of the player who touched it.
  const own = fixtureIds.filter((id) => fixtureLot(SAVE_FIXTURES[id]) >= 2)
  assert.ok(own.length >= 2, 'the saves L2 left are gone from the corpus')
  for (const id of own) {
    const raw = rawFixture(id)
    const page = await openGame(SAVE_FIXTURES[id].save)
    for (const field of ['locksSeen', 'doorsReleased', 'flags', 'triggersFired'] as const) {
      assert.deepEqual(page.progress()[field], raw[field], `${id}: ${field}`)
    }
    assert.ok(page.progress().contentLot >= (raw.contentLot as number), id)
  }
  // By value, for the two L2 left: the door stays released, and the drawer
  // touched and still shut stays touched.
  const released = await openGame(SAVE_FIXTURES['l2-shortcut-released'].save)
  assert.deepEqual(released.progress().doorsReleased, ['atrium-from-holyoke-shortcut'])
  const touched = await openGame(SAVE_FIXTURES['l2-new-game-drawer-touched'].save)
  assert.deepEqual(touched.progress().locksSeen, ['office-drawer'])
  assert.deepEqual(touched.progress().locksOpened, [])
  // And they survive a session: played, written and read again.
  for (const page of [released, touched]) {
    page.state().recordHint('torch-used')
    page.leave()
    const back = await openGame(page.savedText()!)
    assert.deepEqual(back.progress().doorsReleased, page.progress().doorsReleased)
    assert.deepEqual(back.progress().locksSeen, page.progress().locksSeen)
  }
})

await test('a save that says what it touched keeps it, and still gains every lock it opened', () => {
  const said = migrateProgress({
    version: 1,
    radioCalls: [],
    locksOpened: ['office-drawer', 'atrium-plinth'],
    locksSeen: ['holyoke-hero-seal', 'office-drawer'],
    doorsReleased: ['atrium-from-holyoke-shortcut', 'vault-hatch'],
    flags: ['posse-signed'],
    triggersFired: ['a-trigger-this-build-never-had'],
  })
  assert.deepEqual(said.locksSeen, ['holyoke-hero-seal', 'office-drawer', 'atrium-plinth'])
  // A door this build has, and one only a later build's content has: both stay.
  assert.deepEqual(said.doorsReleased, ['atrium-from-holyoke-shortcut', 'vault-hatch'])
  assert.deepEqual(said.flags, ['posse-signed'])
  // Another build's record of what already happened: this one has no trigger
  // of that name and no business forgetting that it fired.
  assert.deepEqual(said.triggersFired, ['a-trigger-this-build-never-had'])
  // The repair reaches a save this lot already stamped (DL2-6): a slice of the
  // lot wrote it before the slice that knows about touched locks.
  const stamped = migrateProgress({ version: 1, radioCalls: [], contentLot: 2, locksOpened: ['office-drawer'] })
  assert.deepEqual(stamped.locksSeen, ['office-drawer'])
})

await test('case C: the pre-opening save is brought forward as before, plus the lot', async () => {
  const raw = rawFixture('production-pre-opening')
  const page = await openGame(SAVE_FIXTURES['production-pre-opening'].save)
  assert.deepEqual(page.progress(), {
    ...raw,
    documentsRead: [...(raw.documentsRead as string[]), PRE_OPENING_SAVE.journalDocumentId],
    radioCalls: [PRE_OPENING_SAVE.firstCallId],
    clockSeconds: {},
    hintsShown: [PRE_OPENING_SAVE.journalHintId],
    devicesCarried: [],
    radioMemory: {},
    ...addedByTheLot(raw),
  })
})

await test('case D: a save from a later lot keeps its lot and every field this build does not know', async () => {
  const later = {
    version: 1,
    contentLot: 7,
    radioCalls: ['porter-first-call'],
    locksOpened: ['office-drawer'],
    termsSigned: ['termo-posse'],
    socketsFilled: ['curator'],
    // A lock this build has never heard of, in a list it may or may not know yet.
    locksSeen: ['office-drawer', 'holyoke-hero-seal'],
    // And a door: the shortcut, and one of a wing that is not built yet.
    doorsReleased: ['atrium-from-holyoke-shortcut', 'ala-4-dock'],
  }
  const page = await openGame(saveOf(later))
  const kept = (progress: Raw, when: string) => {
    assert.equal(progress.contentLot, 7, when)
    assert.deepEqual(progress.termsSigned, ['termo-posse'], when)
    assert.deepEqual(progress.socketsFilled, ['curator'], when)
    for (const lock of later.locksSeen) assert.ok((progress.locksSeen as string[]).includes(lock), `${when}: locksSeen lost ${lock}`)
    for (const door of later.doorsReleased) {
      assert.ok((progress.doorsReleased as string[]).includes(door), `${when}: doorsReleased lost ${door}`)
    }
  }
  kept(page.progress(), 'on load')
  for (const act of Object.values(ACTIONS)) act(page.state())
  kept(page.progress(), 'after every action')
  page.leave()
  kept(page.savedProgress()!, 'in the storage')
  kept((await openGame(page.savedText()!)).progress(), 'on the next load')
})

await test('case E: back from L1, the save is production\'s again and nothing L1 knows is gone', async () => {
  // A rollback, or a tab still running L1: its loader rebuilds the save from
  // the fields it knows, and what this lot added is not among them.
  const page = await openGame(saveOf({ ...SAMPLE_SAVE, ...UNKNOWN }))
  page.state().recordHint('torch-used')
  page.leave()
  const written = page.savedProgress()!
  const fromL1 = throughJson(frozenL1.migrateProgress(throughJson(written))) as unknown as Raw
  assert.deepEqual(Object.keys(fromL1).sort(), [...L1_FIELDS].sort(), 'L1 writes its own fields and no others')

  const back = await openGame(saveOf(fromL1))
  // The loss of a rollback, on record: the stamp is gone, so the save is lot 1 again and every migration runs on it.
  assert.equal(back.progress().contentLot, CONTENT_LOT)
  assert.notEqual(back.progress().contentLot, SAMPLES.contentLot)
  for (const field of Object.keys(UNKNOWN)) assert.ok(!(field in back.progress()), `${field} came back from a build that never wrote it`)
  for (const field of L1_FIELDS) assert.deepEqual(back.progress()[field], written[field], `${field} did not survive the round trip`)
  // What the rollback costs, by name. The touched locks are rebuilt from the
  // opened ones, which L1 kept; the released door is in no field L1 knows,
  // and nothing infers it (DL2-3): the shortcut asks for one more exit.
  assert.deepEqual(written.doorsReleased, SAMPLES.doorsReleased, 'the save that went to L1 had no door released: this case would prove nothing')
  assert.deepEqual(back.progress().doorsReleased, [])
  assert.deepEqual(back.progress().locksSeen, SAMPLES.locksOpened)
  assert.deepEqual(back.progress().flags, [])
  assert.deepEqual(back.progress().triggersFired, [])
})

await test('case F: junk in a field is that field\'s default, and the rest of the save stands', () => {
  const junk = migrateProgress({
    version: 1,
    radioCalls: ['porter-first-call'],
    contentLot: 'x',
    catalogued: 'abc',
    locksOpened: [1, 'office-drawer', null],
    locksSeen: [1, 'holyoke-hero-seal', null],
    doorsReleased: 'abc',
    flags: 'abc',
    triggersFired: { 'lock:office-drawer:opened': true },
    clockSeconds: [12],
    lastRoom: 4,
  })
  assert.equal(junk.contentLot, CONTENT_LOT)
  assert.deepEqual(junk.catalogued, [])
  assert.deepEqual(junk.locksOpened, ['office-drawer'])
  // What was valid in the list, then the lock the save proves was touched.
  assert.deepEqual(junk.locksSeen, ['holyoke-hero-seal', 'office-drawer'])
  // A string is not a list: no door is released by it, letter by letter or whole.
  assert.deepEqual(junk.doorsReleased, [])
  assert.deepEqual(junk.flags, [])
  assert.deepEqual(junk.triggersFired, [])
  assert.deepEqual(junk.clockSeconds, {})
  assert.equal(junk.lastRoom, SPAWN.room)
  assert.deepEqual(junk.radioCalls, ['porter-first-call'])
})

await test('case G and H: another version, or nothing at all, is a new game', () => {
  const fresh = { version: 1, ...Object.fromEntries(fields.map((field) => [field, PROGRESS_FIELDS[field].fresh()])) }
  assert.deepEqual(fresh.contentLot, CONTENT_LOT)
  assert.deepEqual(fresh.lastRoom, 'office')
  assert.deepEqual(emptyProgress(), fresh)
  for (const nothing of [{ version: 99, catalogued: ['x'] }, null, 'texto']) {
    assert.deepEqual(migrateProgress(nothing), fresh)
  }
})

console.log(`\n${passed}/${passed + failed} save checks passed.\n`)
if (failed > 0) process.exitCode = 1
