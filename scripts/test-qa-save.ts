/**
 * Headless proof of the save fixtures and of `?qaSave`.
 *
 *   npm run test:qa-save
 *
 * Two promises, and each one fails silently when it breaks.
 *
 * The fixtures are production saves written down by hand (`saveFixtures.ts`).
 * A save the store does not like is not rejected with an error: it is
 * replaced by an empty one, and a hand-written fixture with a typo would turn
 * every later "the corpus still loads" check into a test of a new game. So
 * each fixture is loaded the way a browser loads it — written under the save
 * key before the store is first evaluated — and has to come out with
 * everything it went in with, naming only things the content still has.
 *
 * `?qaSave` must exist on the dev server and nowhere else. A harness that can
 * be told by a URL to overwrite the save is a defect the day it ships, and
 * nothing in a browser session would show that it had.
 */

import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// A browser's storage, in place before anything imports the store
// ---------------------------------------------------------------------------

const storage = new Map<string, string>()
const browserStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value)
  },
  removeItem: (key: string) => {
    storage.delete(key)
  },
}
Object.assign(globalThis, { localStorage: browserStorage })

const { PRE_OPENING_SAVE } = await import('../src/content/legacySave.ts')
const { MUSEUM } = await import('../src/content/museum.ts')
const { SAVE_FIXTURES } = await import('../src/content/saveFixtures.ts')
const { applyQaSave, QA_SAVE_PARAM, QA_SAVE_STORAGE_KEY, qaSaveRequest } = await import(
  '../src/dev/qaSave.ts'
)
const { dueRadioCalls, radioDevices } = await import('../src/engine/deviceRules.ts')
const { journalUnlocked } = await import('../src/engine/notebook.ts')
const { progressConditionMet } = await import('../src/engine/progressCondition.ts')
const { QA_SAVE_BOOT_MODULE, qaSavePlugin } = await import('./vite-plugin-qa-save.mjs')

type StoreModule = typeof import('../src/state/store.ts')
type Progress = ReturnType<StoreModule['migrateProgress']>
type FixtureId = keyof typeof SAVE_FIXTURES
type RawProgress = Readonly<Record<string, unknown>>

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixtureIds = Object.keys(SAVE_FIXTURES) as FixtureId[]
const rawProgress = (id: FixtureId): RawProgress => SAVE_FIXTURES[id].save.progress

/**
 * A browser opening the game at this URL: the harness runs, then the store is
 * evaluated for the first time and reads whatever the storage holds.
 *
 * The query string gives Node a fresh module each time, which is the only way
 * to run the store's load more than once in one process.
 */
let pageLoads = 0
async function openGameAt(search: string) {
  storage.clear()
  const outcome = applyQaSave(search, browserStorage)
  pageLoads += 1
  const store = (await import(`../src/state/store.ts?pageLoad=${pageLoads}`)) as StoreModule
  return { outcome, store, state: store.useMuseum.getState() }
}

const loaded = new Map<FixtureId, Awaited<ReturnType<typeof openGameAt>>>()
for (const id of fixtureIds) loaded.set(id, await openGameAt(`?${QA_SAVE_PARAM}=${id}`))
const progressOf = (id: FixtureId): Progress => loaded.get(id)!.state.progress

let passed = 0
function test(name: string, run: () => void) {
  run()
  passed += 1
  console.log(`  pass  ${name}`)
}

console.log('\nSave fixtures and ?qaSave')

// ---------------------------------------------------------------------------
// The harness
// ---------------------------------------------------------------------------

test('the URL names a fixture, or asks for nothing', () => {
  assert.equal(qaSaveRequest('?qaSave=production-drawer-open'), 'production-drawer-open')
  assert.equal(qaSaveRequest('?qaCamera=1,0,2,0,0&qaSave=production-drawer-open&qaPower=atrium'), 'production-drawer-open')
  assert.equal(qaSaveRequest(''), null)
  assert.equal(qaSaveRequest('?qaPower=atrium'), null)
  assert.equal(qaSaveRequest('?qaSave='), null, 'an empty name is no request')
  assert.equal(qaSaveRequest('?qaSave=%20'), null)
})

test('without the parameter the save is not touched', () => {
  const writes: string[] = []
  const outcome = applyQaSave('?qaPower=atrium', { setItem: (key) => writes.push(key) })
  assert.deepEqual(outcome, { status: 'absent' })
  assert.deepEqual(writes, [])
})

test('an unknown name writes nothing and says which names exist', () => {
  const writes: string[] = []
  const outcome = applyQaSave('?qaSave=production-drawer-opne', { setItem: (key) => writes.push(key) })
  assert.equal(outcome.status, 'unknown')
  assert.deepEqual(writes, [], 'a typo must not start a new game')
  assert.deepEqual(outcome.status === 'unknown' && outcome.known, fixtureIds)
  // A name that only exists on Object.prototype is not a fixture either.
  assert.equal(applyQaSave('?qaSave=toString', { setItem: (key) => writes.push(key) }).status, 'unknown')
  assert.deepEqual(writes, [])
})

test('a fixture is written whole, under the key the store reads', () => {
  const written = new Map<string, string>()
  const outcome = applyQaSave('?qaSave=production-drawer-closed', {
    setItem: (key, value) => written.set(key, value),
  })
  assert.deepEqual(outcome, {
    status: 'loaded',
    name: 'production-drawer-closed',
    summary: SAVE_FIXTURES['production-drawer-closed'].summary,
  })
  const { store } = loaded.get('production-drawer-closed')!
  assert.equal(QA_SAVE_STORAGE_KEY, store.STORAGE_KEY, 'the harness and the store disagree about the save key')
  assert.deepEqual([...written.keys()], [store.STORAGE_KEY])
  assert.deepEqual(JSON.parse(written.get(store.STORAGE_KEY)!), SAVE_FIXTURES['production-drawer-closed'].save)
})

// ---------------------------------------------------------------------------
// Every fixture, through the real load
// ---------------------------------------------------------------------------

test('the corpus holds the production saves the plan lists, and the save each lot left behind', () => {
  // P0, item 4: drawer open and closed; two pieces catalogued without a turn;
  // no `radioCalls`; the radio on the desk with the player in Holyoke. Later
  // lots add their own saves beside these; these five never leave.
  const production = [
    'production-drawer-open',
    'production-drawer-closed',
    'production-catalogued-unturned',
    'production-pre-opening',
    'production-radio-on-desk',
  ]
  for (const id of production) {
    assert.ok(Object.hasOwn(SAVE_FIXTURES, id), `${id} is gone from the corpus`)
    assert.ok(SAVE_FIXTURES[id as FixtureId].from.startsWith('production-'), `${id} is a production save`)
  }
  // One per closed lot, taken from the browser at the end of the lot's route
  // and named after the build that wrote it (plan §9.1, step 12). They never
  // leave either: the lot after starts its own route from the one before.
  const lots: Record<string, string> = {
    'l1-route-end': 'l1-f0fb5a3',
  }
  for (const [id, from] of Object.entries(lots)) {
    assert.ok(Object.hasOwn(SAVE_FIXTURES, id), `${id} is gone from the corpus`)
    assert.equal(SAVE_FIXTURES[id as FixtureId].from, from, `${id} names the build that wrote it`)
  }
  for (const id of fixtureIds) {
    assert.ok(SAVE_FIXTURES[id].summary.length > 0, `${id} says what it is`)
    assert.ok(SAVE_FIXTURES[id].from.length > 0, `${id} says which build wrote it`)
  }
})

for (const id of fixtureIds) {
  test(`${id} loads through the store with nothing lost`, () => {
    const { outcome, store, state } = loaded.get(id)!
    const raw = rawProgress(id)
    const progress = state.progress
    assert.equal(outcome.status, 'loaded')

    // The failure this guards against is silent: a save the store rejects
    // becomes an empty one, and the game starts over without a word.
    assert.equal(progress.version, store.SAVE_VERSION)
    assert.equal(store.hasSavedProgress(progress), true, 'the title offers nothing to continue')

    // Everything the record holds is still there. Loading may add (a notebook
    // granted, a field that did not exist yet); it may not take away. A lot
    // that renames an id carries the record's id through its alias here.
    for (const [field, value] of Object.entries(raw)) {
      const kept = (progress as Record<string, unknown>)[field]
      if (Array.isArray(value)) {
        assert.ok(Array.isArray(kept), `${field} is gone`)
        for (const item of value) assert.ok(kept.includes(item), `${field} lost "${item}"`)
      } else {
        assert.deepEqual(kept, value, `${field} changed`)
      }
    }
    assert.deepEqual(
      state.settings,
      { ...store.DEFAULT_SETTINGS, ...SAVE_FIXTURES[id].save.settings },
      'the settings are the player\'s own',
    )

    // What the store would write back loads to the same thing again.
    const reloaded = store.migrateProgress(JSON.parse(JSON.stringify(progress)))
    assert.deepEqual(reloaded, progress, 'a second load changes the save')

    // Where the player stopped is a fact of the save; where they wake is not.
    assert.equal(state.currentRoom, MUSEUM.spawn.room)
  })
}

// ---------------------------------------------------------------------------
// The ids a loaded fixture names
// ---------------------------------------------------------------------------

const exhibitById = new Map(MUSEUM.exhibits.map((exhibit) => [exhibit.id as string, exhibit]))
const documentById = new Map(MUSEUM.documents.map((doc) => [doc.id as string, doc]))
const roomIds = new Set<string>(MUSEUM.rooms.map((room) => room.id))
const factIds = new Set<string>(MUSEUM.facts.map((fact) => fact.id))
const lockIds = new Set<string>(MUSEUM.locks.map((lock) => lock.id))
const devices = MUSEUM.rooms.flatMap((room) => room.devices ?? [])
const containers = MUSEUM.rooms.flatMap((room) => room.containers ?? [])
const radios = radioDevices(MUSEUM).map((entry) => entry.device)
const callIds = new Set<string>(radios.flatMap((radio) => radio.calls.map((call) => call.id)))
const hudSource = readFileSync(resolve(ROOT, 'src/ui/Hud.tsx'), 'utf8')

/** The one-off lessons the HUD records: one by a shared id, the rest inline. */
const hintIds = new Set<string>([
  PRE_OPENING_SAVE.journalHintId,
  ...[...hudSource.matchAll(/hintId="([a-z-]+)"/g)].map((match) => match[1]),
])

/** Every reply id a radio can remember having said. */
function replyIds(radio: (typeof radios)[number]) {
  const patience = radio.patience
  if (!patience) return new Set<string>()
  return new Set<string>(
    Object.values(patience).flatMap((value) => {
      if (!Array.isArray(value)) return []
      return value.flatMap((entry: { id?: string; replies?: { id: string }[]; outbursts?: { id: string }[] }) => [
        ...(entry.id ? [entry.id] : []),
        ...(entry.replies ?? []).map((reply) => reply.id),
        ...(entry.outbursts ?? []).map((reply) => reply.id),
      ])
    }),
  )
}

test('after loading, every id a fixture names is one the content still has', () => {
  // Checked on the loaded save, not on the record: a lot that renames an id
  // keeps the record as it was written and has to carry it in the migration.
  for (const id of fixtureIds) {
    const progress = progressOf(id)
    const missing: string[] = []
    const want = (known: boolean, what: string) => {
      if (!known) missing.push(what)
    }

    for (const exhibit of progress.catalogued) want(exhibitById.has(exhibit), `exhibit ${exhibit}`)
    for (const key of progress.hotspots) {
      const [exhibitId, hotspotId] = key.split(':')
      const exhibit = exhibitById.get(exhibitId)
      want(Boolean(exhibit?.hotspots.some((hotspot) => hotspot.id === hotspotId)), `hotspot ${key}`)
    }
    for (const doc of progress.documentsRead) want(documentById.has(doc), `document ${doc}`)
    for (const fact of progress.factsKnown) want(factIds.has(fact), `fact ${fact}`)
    for (const room of [...progress.roomsVisited, ...progress.roomsPowered, progress.lastRoom]) {
      want(roomIds.has(room), `room ${room}`)
    }
    for (const lock of progress.locksOpened) want(lockIds.has(lock), `lock ${lock}`)
    for (const call of progress.radioCalls) want(callIds.has(call), `radio call ${call}`)
    for (const hint of progress.hintsShown) want(hintIds.has(hint), `hint ${hint}`)
    for (const clock of Object.keys(progress.clockSeconds)) {
      want(devices.some((device) => device.id === clock && device.kind === 'clock'), `clock ${clock}`)
    }
    for (const carried of progress.devicesCarried) {
      want(radios.some((radio) => radio.id === carried && radio.carriedOnUse), `carried device ${carried}`)
    }
    for (const [radioId, memory] of Object.entries(progress.radioMemory)) {
      const radio = radios.find((candidate) => candidate.id === radioId)
      want(Boolean(radio), `radio ${radioId}`)
      if (!radio) continue
      const known = replyIds(radio)
      for (const reply of [memory.lastReplyId, memory.lastOutburstId]) {
        if (reply !== null) want(known.has(reply), `reply ${reply}`)
      }
      want(memory.lastHint < radio.hints.length, `hint index ${memory.lastHint}`)
    }
    assert.deepEqual(missing, [], `${id} names things the content does not have`)
  }
})

test('each fixture is a state the game could really have reached', () => {
  // Hand-written saves drift into the impossible one field at a time. These
  // are the relations the published runtime guarantees when it writes a save.
  //
  // They are today's rules. A lot that changes one on purpose (a new required
  // detail, a cabinet read one sheet at a time) makes the old saves break it
  // for real, and this test failing is the corpus saying so: decide what the
  // migration does with such a save, then hold the changed relation only for
  // fixtures written from that lot on (`from`). Never edit a record to fit.
  for (const id of fixtureIds) {
    const progress = progressOf(id)
    const say = (what: string) => `${id}: ${what}`

    for (const exhibitId of progress.catalogued) {
      const exhibit = exhibitById.get(exhibitId)!
      for (const hotspot of exhibit.hotspots.filter((candidate) => candidate.requiredForCatalogue)) {
        assert.ok(
          progress.hotspots.includes(`${exhibitId}:${hotspot.id}`),
          say(`${exhibitId} is catalogued without its required detail "${hotspot.id}"`),
        )
      }
    }

    // A fact is known because something seen or read revealed it, and only so.
    const revealed = new Set<string>()
    for (const key of progress.hotspots) {
      const [exhibitId, hotspotId] = key.split(':')
      const hotspot = exhibitById.get(exhibitId)!.hotspots.find((candidate) => candidate.id === hotspotId)!
      if ('revealsFactId' in hotspot && hotspot.revealsFactId) revealed.add(hotspot.revealsFactId)
    }
    for (const docId of progress.documentsRead) {
      const doc = documentById.get(docId)!
      if ('revealsFactId' in doc && doc.revealsFactId) revealed.add(doc.revealsFactId)
    }
    assert.deepEqual([...progress.factsKnown].sort(), [...revealed].sort(), say('facts known and facts revealed differ'))

    // Opening a cabinet reads everything in it; a locked one opens with its lock.
    for (const container of containers) {
      const inside = MUSEUM.documents.filter((doc) => doc.containerId === container.id).map((doc) => doc.id as string)
      const read = inside.filter((docId) => progress.documentsRead.includes(docId))
      assert.ok(read.length === 0 || read.length === inside.length, say(`${container.id} is half read`))
      if ('lockId' in container && container.lockId) {
        const open = progress.locksOpened.includes(container.lockId)
        assert.equal(read.length > 0, open, say(`${container.id} and its lock disagree`))
      }
    }

    assert.ok(progress.roomsVisited.includes(progress.lastRoom), say('the player stopped in a room never entered'))
    for (const room of progress.roomsPowered) {
      // Every control is inside the room it powers.
      assert.ok(progress.roomsVisited.includes(room), say(`${room} was lit without being entered`))
    }
    for (const clock of Object.keys(progress.clockSeconds)) {
      const device = devices.find((candidate) => candidate.id === clock)!
      assert.ok(
        device.kind === 'clock' && progress.roomsPowered.includes(device.runsWithPowerOf),
        say(`${clock} ran without power`),
      )
    }
    // The porter is called from the handset, and notices when it leaves.
    for (const radioId of Object.keys(progress.radioMemory)) {
      assert.ok(progress.devicesCarried.includes(radioId), say(`${radioId} was called without being taken`))
    }
    if (progress.radioCalls.includes('porter-radio-taken') || progress.hintsShown.includes('radio-taken')) {
      assert.ok(progress.devicesCarried.length > 0, say('the radio was announced as taken but is on the desk'))
    }
  }
})

// ---------------------------------------------------------------------------
// What each fixture is for
// ---------------------------------------------------------------------------

// What follows reads the RECORD wherever it says what a save "is": the record
// never changes, while the content it is compared with grows every lot. A
// check of "all the documents" against tomorrow's content would fail for no
// fault of the save.

const DRAWER = 'office-drawer'
const list = (id: FixtureId, field: string) => rawProgress(id)[field] as readonly string[]

test('the drawer is open in one save and shut in the other, on the same night', () => {
  const open = progressOf('production-drawer-open')
  const closed = progressOf('production-drawer-closed')
  assert.equal(progressConditionMet({ locksOpened: [DRAWER] }, open, MUSEUM), true)
  assert.equal(progressConditionMet({ locksClosed: [DRAWER] }, closed, MUSEUM), true)

  // The letter in the drawer, by the id the published build gave it.
  assert.ok(list('production-drawer-open', 'documentsRead').includes('doc-predecessor'))
  assert.ok(!list('production-drawer-closed', 'documentsRead').includes('doc-predecessor'))
  // Both stand at the same point otherwise: the building lit, the year known.
  for (const id of ['production-drawer-open', 'production-drawer-closed'] as const) {
    assert.deepEqual(list(id, 'roomsPowered'), ['office', 'atrium', 'holyoke'])
    assert.ok(list(id, 'factsKnown').includes('springfield-renaming'), 'the code was learnt in the museum')
  }
})

test('the open-drawer save is as far as the published game went', () => {
  // Nine of the twelve pieces and all five documents of that build (checked
  // against its content when the record was written). The three missing
  // cannot be catalogued there (plan, Anexo C: `exhibit-uncataloguable`), so
  // no honest save has them.
  const catalogued = list('production-drawer-open', 'catalogued')
  assert.equal(catalogued.length, 9)
  for (const exhibit of ['net-1897', 'gym-suit', 'photo-gym']) assert.ok(!catalogued.includes(exhibit), exhibit)
  assert.equal(list('production-drawer-open', 'documentsRead').length, 5)
  assert.deepEqual(list('production-drawer-open', 'locksOpened'), [DRAWER])
})

test('two pieces are catalogued by a detail seen before any turn', () => {
  assert.deepEqual(list('production-catalogued-unturned', 'catalogued'), ['atrium-ball-laced', 'guide-1916'])
  // One detail each, the one that faces the camera as the piece is picked up
  // (`npm run audit:examine-sim`, `npm run audit:laced-sweep`).
  assert.deepEqual(list('production-catalogued-unturned', 'hotspots'), [
    'atrium-ball-laced:lacing',
    'guide-1916:credit',
  ])
  // Never turned: each piece has another face, and nothing on it was seen.
  for (const exhibitId of list('production-catalogued-unturned', 'catalogued')) {
    assert.ok(exhibitById.get(exhibitId)!.hotspots.length > 1, `${exhibitId} has a face the player never saw`)
  }
  assert.deepEqual(
    [...progressOf('production-catalogued-unturned').catalogued].sort(),
    ['atrium-ball-laced', 'guide-1916'],
    'a piece the published build catalogued stays catalogued',
  )
})

test('a save from before the opening is brought forward, not replayed', () => {
  const raw = rawProgress('production-pre-opening')
  for (const field of ['radioCalls', 'clockSeconds', 'hintsShown', 'devicesCarried', 'radioMemory']) {
    assert.ok(!(field in raw), `${field} did not exist when this save was written`)
  }
  const { state } = loaded.get('production-pre-opening')!
  const progress = state.progress
  assert.ok(progress.documentsRead.includes(PRE_OPENING_SAVE.journalDocumentId), 'the notebook is granted')
  assert.equal(journalUnlocked(MUSEUM, progress.documentsRead), true)
  assert.ok(progress.radioCalls.includes(PRE_OPENING_SAVE.firstCallId), 'the first call is history')
  assert.ok(
    progress.hintsShown.includes(PRE_OPENING_SAVE.journalHintId),
    'a toast would announce a notebook never picked up',
  )
  assert.deepEqual(progress.devicesCarried, [])
  // The office was never lit: the player wakes in the dark with a lamp to find,
  // and once it is on the porter does not send them to a breaker already thrown.
  assert.ok(!progress.roomsPowered.includes(MUSEUM.spawn.room))
  for (const radio of radios) {
    const lit = { ...progress, roomsPowered: [...progress.roomsPowered, MUSEUM.spawn.room] }
    const due = dueRadioCalls(radio, lit, MUSEUM).map((call) => call.id as string)
    assert.ok(!due.includes(PRE_OPENING_SAVE.firstCallId), 'the first call would play again')
  }
  assert.equal(state.settings.locale, 'en', 'the language survives')
})

test('the radio is on the desk and the player stopped in a dark Holyoke', () => {
  const progress = progressOf('production-radio-on-desk')
  assert.deepEqual(progress.devicesCarried, [])
  assert.deepEqual(progress.radioMemory, {})
  assert.equal(progress.lastRoom, 'holyoke')
  assert.ok(progress.roomsVisited.includes('holyoke') && !progress.roomsPowered.includes('holyoke'))
  assert.equal(progressConditionMet({ carried: ['office-radio'] }, progress, MUSEUM), false)
  // He was heard out before the player left: nothing is still owed in the office.
  assert.ok(progress.radioCalls.includes(PRE_OPENING_SAVE.firstCallId))
})

test('the save L1 left is the end of its route, and holds nothing production\'s does not', () => {
  // Lamp, notebook, radio, both breakers, out by the shortcut, the portrait
  // tilted until its date showed, the drawer opened with the year.
  const id = 'l1-route-end'
  assert.deepEqual(list(id, 'roomsPowered'), ['office', 'atrium', 'holyoke'])
  assert.deepEqual(list(id, 'documentsRead'), ['doc-welcome', 'doc-predecessor'])
  assert.deepEqual(list(id, 'devicesCarried'), ['office-radio'])
  assert.deepEqual(list(id, 'catalogued'), ['portrait-morgan'])
  assert.deepEqual(list(id, 'hotspots'), ['portrait-morgan:date'])
  assert.deepEqual(list(id, 'factsKnown'), ['springfield-renaming'], 'the year came off the portrait, not out of a cabinet')
  assert.deepEqual(list(id, 'locksOpened'), [DRAWER])
  assert.equal(progressConditionMet({ locksOpened: [DRAWER] }, progressOf(id), MUSEUM), true)
  // L1 moved breakers, pieces and words, and nothing in what a save holds:
  // the same fields as the furthest production save, no more and no fewer.
  // Leaving by the shortcut is not among them, which is why no save of this
  // build can prove its player ever went that way.
  assert.deepEqual(Object.keys(rawProgress(id)).sort(), Object.keys(rawProgress('production-drawer-open')).sort())
})

// ---------------------------------------------------------------------------
// Dev server only
// ---------------------------------------------------------------------------

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(?:ts|tsx)$/.test(name) ? [path] : []
  })
}

test('the dev server injects the harness ahead of the entry, and only the dev server', () => {
  const plugin = qaSavePlugin()
  assert.equal(plugin.apply, 'serve', 'the plugin would run in a production build')
  const tags = plugin.transformIndexHtml()
  assert.deepEqual(tags, [
    { tag: 'script', attrs: { type: 'module', src: QA_SAVE_BOOT_MODULE }, injectTo: 'head-prepend' },
  ])
  assert.ok(existsSync(resolve(ROOT, `.${QA_SAVE_BOOT_MODULE}`)), 'the injected module does not exist')

  const config = readFileSync(resolve(ROOT, 'vite.config.ts'), 'utf8')
  assert.ok(config.includes('qaSavePlugin()'), 'vite.config.ts does not load the plugin')

  // The entry sits in <body>: a module script in <head> runs before it.
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8')
  assert.ok(html.indexOf('</head>') < html.indexOf('src="/src/main.tsx"'))
})

test('nothing the game ships can reach the harness or the fixtures', () => {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8')
  assert.ok(!/qaSave|\/dev\//.test(html), 'index.html mentions the harness')

  // The production graph starts at index.html and only follows imports, so a
  // module no shipped module imports is a module that is not built.
  const devDirectory = resolve(ROOT, 'src/dev')
  const offenders = sourceFiles(resolve(ROOT, 'src'))
    .filter((path) => !path.startsWith(devDirectory))
    .filter((path) =>
      /(?:from|import)\s*\(?\s*['"][^'"]*(?:\/dev\/|saveFixtures)[^'"]*['"]/.test(readFileSync(path, 'utf8')),
    )
    .map((path) => relative(ROOT, path))
  assert.deepEqual(offenders, [], 'a shipped module imports the dev harness or the save fixtures')

  // And the harness itself stays small: the fixtures and nothing of the game.
  for (const path of sourceFiles(devDirectory)) {
    // Every form an import takes: `from '…'`, a bare `import '…'`, `import('…')`.
    const imports = [...readFileSync(path, 'utf8').matchAll(/(?:from\s+|import\s*\(?\s*)['"]([^'"]+)['"]/g)].map(
      (match) => match[1],
    )
    assert.ok(imports.length > 0 || path.endsWith('.d.ts'), `${relative(ROOT, path)}: no import was recognised`)
    for (const specifier of imports) {
      assert.ok(
        specifier.startsWith('./') || specifier === '../content/saveFixtures.ts',
        `${relative(ROOT, path)} imports ${specifier}: the store must not be evaluated before the fixture is written`,
      )
    }
  }
})

console.log(`\n${passed}/${passed} save fixture checks passed.\n`)
