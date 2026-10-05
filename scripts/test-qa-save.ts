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
 * Beside them stand the saves the lots left as they closed, read out of the
 * browser. Those are held to more: a lot the plan calls done has one, a save
 * of the lot the tree stands at loads as itself, and what the runtime of its
 * lot guarantees of a save holds of the record.
 *
 * `?qaSave` must exist on the dev server and nowhere else. A harness that can
 * be told by a URL to overwrite the save is a defect the day it ships, and
 * nothing in a browser session would show that it had.
 */

import assert from 'node:assert/strict'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readText } from './lib/readText.ts'

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

const { saveIdsByField } = await import('../src/content/additive.ts')
const { CONTENT_LOT } = await import('../src/content/contentLot.ts')
const { PRE_OPENING_SAVE, PRE_POSSE_SAVE, SAVE_ALIASES } = await import('../src/content/legacySave.ts')
const { MUSEUM } = await import('../src/content/museum.ts')
const { fixtureLot, SAVE_FIXTURES } = await import('../src/content/saveFixtures.ts')
const { applyQaSave, QA_SAVE_PARAM, QA_SAVE_STORAGE_KEY, qaSaveRequest } = await import(
  '../src/dev/qaSave.ts'
)
const { dueRadioCalls, radioDevices, radioHintIndex } = await import('../src/engine/deviceRules.ts')
const { pendingLocks, toolSpent } = await import('../src/engine/lockRules.ts')
const { nightPoints } = await import('../src/engine/nightClock.ts')
const { journalUnlocked } = await import('../src/engine/notebook.ts')
const { progressConditionMet } = await import('../src/engine/progressCondition.ts')
const { dueSequence } = await import('../src/engine/sequenceRules.ts')
const { signingDeskState } = await import('../src/engine/termRules.ts')
const { buildTransitionDoorSpecs, canOpenTransitionDoor } = await import('../src/engine/transitionDoorTopology.ts')
const { compileTriggers, effectGrant } = await import('../src/engine/triggers.ts')
const { SAVE_MIGRATIONS } = await import('../src/state/saveMigrations.ts')
const { lastLotDone } = await import('./lib/planLots.ts')
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
    // Two of L2: the route begun from L1's save, and a new game of its own.
    'l2-shortcut-released': 'l2-90dd9a6',
    'l2-new-game-drawer-touched': 'l2-90dd9a6',
    // Two of L3, one on each side of the signature: the route begun from L2's
    // save, with the deed signed, and a new game stopped with the safe open.
    'l3-posse-signed': 'l3-4c97f47',
    'l3-new-game-safe-open': 'l3-4c97f47',
  }
  for (const [id, from] of Object.entries(lots)) {
    assert.ok(Object.hasOwn(SAVE_FIXTURES, id), `${id} is gone from the corpus`)
    assert.equal(SAVE_FIXTURES[id as FixtureId].from, from, `${id} names the build that wrote it`)
  }
  for (const id of fixtureIds) {
    assert.ok(SAVE_FIXTURES[id].summary.length > 0, `${id} says what it is`)
    assert.ok(SAVE_FIXTURES[id].from.length > 0, `${id} says which build wrote it`)
    // A save is named after the lot that wrote it, and nothing else names a lot.
    const lot = fixtureLot(SAVE_FIXTURES[id])
    assert.equal(lot > 0, /^l\d+-/.test(id), `${id}: the name and the build disagree about being a lot's save`)
    if (lot > 0) assert.ok(id.startsWith(`l${lot}-`), `${id} was written by L${lot}`)
  }
})

test('every lot the plan says is done left a save of its own in the corpus', () => {
  // Step 12 of the plan's §9.1, and the step a closing lot forgets: L1 was
  // written up as done with a corpus that had none of its saves, and the lot
  // after had to play it again on the published tree. The plan's «Feito em»
  // is what says a lot is done, so that line now asks for the save.
  const plan = readText(resolve(ROOT, 'docs/PLANO-ATE-O-FINAL.md'))
  const done = lastLotDone(plan)
  assert.ok(done >= 2, 'the plan no longer marks L2 as done: the pattern has gone stale')
  const written = new Set(fixtureIds.map((id) => fixtureLot(SAVE_FIXTURES[id])))
  for (let lot = 1; lot <= done; lot += 1) {
    assert.ok(written.has(lot), `the plan says L${lot} is done and the corpus holds no save written by L${lot}`)
  }
  // And none from a lot that is not in the tree yet.
  for (const lot of written) assert.ok(lot <= CONTENT_LOT, `a save of L${lot} in a tree that stands at L${CONTENT_LOT}`)

  assert.equal(fixtureLot({ from: 'production-2026-10-03' }), 0)
  assert.equal(fixtureLot({ from: 'production-before-2026-10-02' }), 0)
  assert.equal(fixtureLot({ from: 'l1-f0fb5a3' }), 1)
  assert.equal(fixtureLot({ from: 'l12-0a1b2c3' }), 12)
  assert.equal(fixtureLot({ from: 'l2' }), 0, 'a lot without the commit that wrote the save names no build')
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
    // Inside a record as in the save itself: what the record holds is there
    // as it was, and the load may add beside it (the height of the porter's
    // last hint, in an entry written before a hint had heights).
    const holds = (kept: unknown, value: unknown, where: string) => {
      if (Array.isArray(value)) {
        assert.ok(Array.isArray(kept), `${where} is gone`)
        for (const item of value) assert.ok(kept.includes(item), `${where} lost "${item}"`)
      } else if (value && typeof value === 'object') {
        assert.ok(kept && typeof kept === 'object' && !Array.isArray(kept), `${where} is gone`)
        for (const [key, inner] of Object.entries(value)) holds((kept as Record<string, unknown>)[key], inner, `${where}.${key}`)
      } else {
        assert.deepEqual(kept, value, `${where} changed`)
      }
    }
    for (const [field, value] of Object.entries(raw)) {
      // The stamp is the one plain value a load moves, and only up: a save
      // an earlier lot stamped leaves with this build's lot on it.
      if (field === 'contentLot') {
        assert.equal(progress.contentLot, Math.max(value as number, CONTENT_LOT), 'contentLot went down, or stayed behind')
        continue
      }
      holds((progress as Record<string, unknown>)[field], value, field)
    }
    // And the one thing the load is known to add inside a record, by name.
    for (const [radioId, memory] of Object.entries((raw.radioMemory as Record<string, object> | undefined) ?? {})) {
      assert.deepEqual(progress.radioMemory[radioId], { ...memory, hintHeight: 0 }, `${radioId}: the porter's memory`)
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
const doors = buildTransitionDoorSpecs(MUSEUM.rooms)
const radios = radioDevices(MUSEUM).map((entry) => entry.device)
const callIds = new Set<string>(radios.flatMap((radio) => radio.calls.map((call) => call.id)))
const hudSource = readText(resolve(ROOT, 'src/ui/Hud.tsx'))

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

test('after loading, every id a fixture names is one the content still has, or has under another name', () => {
  // Checked on the loaded save, not on the record: a lot that renames an id
  // keeps the record as it was written and has to carry it in the migration.
  //
  // Carrying it leaves both in the save: the old id stays for the build
  // from before the rename, which may be open in another tab, and the new
  // one stands beside it (`SAVE_ALIASES`). So an id the content no longer
  // has is still accounted for when the same list of the loaded save holds
  // the name it was given, and that name is the content's. It was «every
  // id is one the content has» until L3 renamed the note in the drawer.
  const carried = (field: string, old: string, held: readonly string[], has: (id: string) => boolean) =>
    SAVE_ALIASES.some((alias) => alias.field === field && alias.from === old && held.includes(alias.to) && has(alias.to))
  assert.ok(carried('documentsRead', 'doc-predecessor', ['doc-otavio-handover'], (id) => documentById.has(id)))
  assert.ok(!carried('documentsRead', 'doc-predecessor', [], (id) => documentById.has(id)), 'an old id whose new name the save does not hold is carried nowhere')
  assert.ok(!carried('catalogued', 'doc-predecessor', ['doc-otavio-handover'], () => true), 'an alias answers for its own list only')
  assert.ok(!carried('documentsRead', 'doc-never-was', ['doc-otavio-handover'], (id) => documentById.has(id)))
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
    for (const doc of progress.documentsRead) {
      want(documentById.has(doc) || carried('documentsRead', doc, progress.documentsRead, (to) => documentById.has(to)), `document ${doc}`)
    }
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
      // An id a lot renamed is in the save beside its new name (the case
      // above holds it to that): what it revealed is the new one's to say.
      const doc = documentById.get(docId)
      if (doc && 'revealsFactId' in doc && doc.revealsFactId) revealed.add(doc.revealsFactId)
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

    // What L2's runtime guarantees of a save it wrote, held for the records
    // written from L2 on. An older record says nothing of either list, and
    // what the load makes of that is the migration's business (`test:save`).
    if (fixtureLot(SAVE_FIXTURES[id]) < 2) continue
    const record = rawProgress(id)
    const said = (field: string) => record[field] as readonly string[]
    // A lock is seen by the touch that opens it, at the latest.
    for (const lock of said('locksOpened')) {
      assert.ok(said('locksSeen').includes(lock), say(`${lock} was opened and never touched`))
    }
    for (const lock of said('locksSeen')) assert.ok(lockIds.has(lock), say(`touched a lock the content does not have: ${lock}`))
    // A door is released by pushing it from the room it opens from.
    for (const doorId of said('doorsReleased')) {
      const door = doors.find((candidate) => candidate.id === doorId)
      assert.ok(door?.opensFrom, say(`released ${doorId}, which is not a door that opens from one side`))
      assert.ok(said('roomsVisited').includes(door.opensFrom), say(`${doorId} was pushed from a room never entered`))
    }
    // The museum of L2 sets no flag and compiles no trigger.
    if (fixtureLot(SAVE_FIXTURES[id]) === 2) {
      assert.deepEqual(said('flags'), [], say('a flag nothing in L2 sets'))
      assert.deepEqual(said('triggersFired'), [], say('a trigger L2 does not have'))
    }

    // What L3's runtime guarantees of a save it wrote, held for the records
    // written from L3 on. It is the first lot whose saves hold consequences:
    // a key a drawer hands over, a flag a signature sets. Such a save is
    // written SETTLED, and a record typed with the trigger and without what
    // it gave (or the other way round) is a state no write of the store
    // ever left on a disk.
    if (fixtureLot(SAVE_FIXTURES[id]) < 3) continue
    const written = record as unknown as Progress
    for (const trigger of compileTriggers(MUSEUM)) {
      const owed = progressConditionMet(trigger.when, written, MUSEUM)
      assert.equal(said('triggersFired').includes(trigger.id), owed, say(`${trigger.id} and what it waits for disagree`))
      if (!owed) continue
      for (const effect of trigger.effects) {
        for (const [field, ids] of Object.entries(effectGrant(effect, MUSEUM))) {
          for (const given of ids as readonly string[]) {
            assert.ok(said(field).includes(given), say(`${trigger.id} fired and ${field} lacks "${given}"`))
          }
        }
      }
    }
    for (const fired of said('triggersFired')) {
      assert.ok(compileTriggers(MUSEUM).some((trigger) => trigger.id === fired), say(`a trigger the content does not have: ${fired}`))
    }
    // A flag is one the content sets, or the mark the load leaves on a save
    // whose drawer was opened before it held a key, and that mark only there.
    const flagsOfTheContent = saveIdsByField(MUSEUM).flags ?? new Set<string>()
    for (const flag of said('flags')) {
      assert.ok(flagsOfTheContent.has(flag) || flag === PRE_POSSE_SAVE.drawer.flag, say(`a flag nothing sets: ${flag}`))
    }
    if (said('flags').includes(PRE_POSSE_SAVE.drawer.flag)) {
      assert.ok(said('locksOpened').includes(PRE_POSSE_SAVE.drawer.lockId), say('marked as an old open drawer with the drawer shut'))
      assert.ok(said('triggersFired').includes(PRE_POSSE_SAVE.drawer.triggerId), say('marked as an old open drawer and never handed its key'))
    }
    // A clock is set with its room lit.
    for (const device of devices) {
      if (device.kind !== 'clock' || !device.setFlag || !said('flags').includes(device.setFlag)) continue
      assert.ok(said('roomsPowered').includes(device.runsWithPowerOf), say(`${device.id} was set without power`))
    }
    // A key that was spent is still in the hand: nothing leaves a save (DL3-1).
    for (const spent of toolSpent(MUSEUM.locks, written)) {
      assert.ok(said('credentials').includes(spent), say(`${spent} was spent and is gone from the save`))
    }
    // A signature is never made short of what the desk asked for it, and the
    // card that says so is only shown for a deed that was signed.
    for (const termId of said('termsSigned')) {
      const term = (MUSEUM.terms ?? []).find((candidate) => candidate.id === termId)
      assert.ok(term, say(`signed a term the content does not have: ${termId}`))
      assert.ok(progressConditionMet(term.when, written, MUSEUM), say(`${termId} was signed short of what it asks`))
    }
    for (const sequenceId of said('sequencesSeen')) {
      const sequence = (MUSEUM.sequences ?? []).find((candidate) => candidate.id === sequenceId)
      assert.ok(sequence, say(`saw a sequence the content does not have: ${sequenceId}`))
      assert.ok(progressConditionMet(sequence.when, written, MUSEUM), say(`${sequenceId} was shown before it was owed`))
    }
    // The porter remembers the height of the last hint he gave, inside the heights that hint has.
    for (const [radioId, memory] of Object.entries(record.radioMemory as Record<string, { lastHint: number; hintHeight: number }>)) {
      const hint = radios.find((candidate) => candidate.id === radioId)?.hints[memory.lastHint]
      assert.ok(hint, say(`${radioId} remembers a hint it does not have`))
      assert.ok(
        Number.isInteger(memory.hintHeight) && memory.hintHeight >= 0 && memory.hintHeight < hint.heightKeys.length,
        say(`${radioId} remembers height ${memory.hintHeight} of a hint with ${hint.heightKeys.length}`),
      )
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

// What L2 added to a save, in the order its migration appends it to a save
// that had none of it.
const ADDED_BY_L2 = ['contentLot', 'locksSeen', 'doorsReleased', 'flags', 'triggersFired']
/** The fields L3 gave the save: no record from before it has them, and a load gives them empty, at the end. */
const ADDED_BY_L3 = ['termsSigned', 'sequencesSeen']
const SHORTCUT = 'atrium-from-holyoke-shortcut'

test('the route L2 walked from L1\'s save ends with the shortcut released, and nothing of L1 touched', () => {
  const id = 'l2-shortcut-released'
  const raw = rawProgress(id)
  const before = rawProgress('l1-route-end')
  // The save of L1 carried forward: its own fields first and in its own
  // order, then what the lot adds. Typed in any other order, the record
  // would not be the text that was read out of the browser.
  assert.deepEqual(Object.keys(raw), [...Object.keys(before), ...ADDED_BY_L2])
  // Everything L1 wrote is as L1 wrote it, but for where the player stopped
  // and the minutes the office clock ran meanwhile.
  for (const [field, value] of Object.entries(before)) {
    if (field === 'lastRoom' || field === 'clockSeconds') continue
    assert.deepEqual(raw[field], value, `${field} is not what the save of L1 held`)
  }
  assert.equal(raw.lastRoom, 'atrium', 'out by the shortcut, into the atrium')
  assert.ok((raw.clockSeconds as Record<string, number>)['office-clock'] > (before.clockSeconds as Record<string, number>)['office-clock'])
  // What the lot added: its stamp, the one door, and the drawer as touched
  // (open in the save it began from, which is all the migration needs).
  assert.equal(raw.contentLot, 2)
  assert.deepEqual(raw.doorsReleased, [SHORTCUT])
  assert.deepEqual(raw.locksSeen, [DRAWER])
  // And the point of it: for this player the door opens from the atrium.
  const shortcut = doors.find((door) => door.id === SHORTCUT)
  assert.ok(shortcut, 'the shortcut is gone from the content')
  assert.equal(canOpenTransitionDoor(shortcut, 'atrium', progressOf(id).doorsReleased), true)
  assert.equal(canOpenTransitionDoor(shortcut, 'atrium', progressOf('l1-route-end').doorsReleased), false)
})

test('the new game L2 left has a lock touched and still shut, and a wing not yet walked', () => {
  const id = 'l2-new-game-drawer-touched'
  const raw = rawProgress(id)
  // A new game of L2 was written in the order of L2's own table: the table
  // of this build, less what the lots since have added to it.
  assert.deepEqual(
    Object.keys(raw),
    Object.keys(loaded.get(id)!.store.EMPTY_PROGRESS).filter((field) => !ADDED_BY_L3.includes(field)),
  )
  assert.deepEqual(
    ADDED_BY_L3.map((field) => (loaded.get(id)!.state.progress as RawProgress)[field]),
    [[], []],
    'a save from before the terms loads with nothing signed and nothing shown',
  )
  assert.equal(raw.contentLot, 2)
  // Touched, not opened: the state no save before L2 can hold, and the one
  // the plan exists to name.
  assert.deepEqual(raw.locksSeen, [DRAWER])
  assert.deepEqual(raw.locksOpened, [])
  assert.deepEqual(pendingLocks(MUSEUM.locks, progressOf(id)).map((lock) => lock.id as string), [DRAWER])
  assert.ok(!list(id, 'documentsRead').includes('doc-predecessor'), 'the letter is still in the drawer')
  assert.deepEqual(list(id, 'factsKnown'), [], 'nobody told this player the year')
  // Two rooms lit and walked, the wing behind a door not yet opened; the
  // shortcut tried from its wrong side, which records nothing.
  assert.deepEqual(list(id, 'roomsVisited'), ['office', 'atrium'])
  assert.deepEqual(list(id, 'roomsPowered'), ['office', 'atrium'])
  assert.deepEqual(raw.doorsReleased, [])
  assert.equal(raw.lastRoom, 'atrium')
  // The notebook was taken while the porter was asking for it: the runtime
  // counts a call answered mid-line as heard, and never plays it again.
  assert.deepEqual(list(id, 'radioCalls'), ['porter-first-call', 'porter-notebook-reminder', 'porter-radio-taken'])
  assert.deepEqual(list(id, 'devicesCarried'), ['office-radio'])
  assert.deepEqual(raw.radioMemory, {}, 'carried and never called')
})

// The desk the deed of office is signed at, and what the night counts by.
const LECTERN = devices.find((device) => device.kind === 'signing-desk')
const TERMS = MUSEUM.terms ?? []
const SEQUENCES = MUSEUM.sequences ?? []
const KEY = 'tool:service-key'

test("the route L3 walked from L2's save ends with the deed signed, and holds everything L2's save held", () => {
  const id = 'l3-posse-signed'
  const raw = rawProgress(id)
  const before = rawProgress('l2-shortcut-released')
  // The save of L1 that L2 carried forward, carried forward once more: L1's
  // fields first, then L2's five, then the two this lot gave the save.
  assert.deepEqual(Object.keys(raw), [...Object.keys(before), ...ADDED_BY_L3])
  // A save only grows. Every list L2 left is the head of the same list here,
  // item for item and in L2's order: what the lot did was added after it.
  for (const [field, value] of Object.entries(before)) {
    if (!Array.isArray(value)) continue
    assert.deepEqual((raw[field] as readonly unknown[]).slice(0, value.length), value, `${field} lost or reordered what the save of L2 held`)
  }
  assert.equal(raw.version, before.version)
  assert.equal(raw.lastRoom, 'atrium', 'signed at the lectern, and stopped in front of it')
  assert.ok((raw.clockSeconds as Record<string, number>)['office-clock'] > (before.clockSeconds as Record<string, number>)['office-clock'])
  assert.equal(raw.contentLot, 3)

  // What the load of this lot handed a save whose drawer was open already:
  // the sheet under its new name beside the old one, the mark, the key, and
  // the trigger that gave it. Then what the player did with them.
  assert.deepEqual(list(id, 'documentsRead'), [
    'doc-welcome',
    'doc-predecessor',
    'doc-otavio-handover',
    'doc-otavio-tape',
    'doc-termos',
    'doc-label-proof-office',
  ])
  assert.deepEqual(list(id, 'flags'), [PRE_POSSE_SAVE.drawer.flag, 'clock-set', 'posse-signed'])
  assert.deepEqual(list(id, 'credentials'), [KEY])
  assert.deepEqual(toolSpent(MUSEUM.locks, raw as unknown as Progress), [KEY], 'the key is in the door of the safe, and still in the save')
  assert.deepEqual(list(id, 'triggersFired'), [PRE_POSSE_SAVE.drawer.triggerId, 'term:termo-posse:signed'])
  assert.deepEqual(list(id, 'locksOpened'), [DRAWER, 'office-safe'])
  assert.deepEqual(list(id, 'termsSigned'), ['termo-posse'])
  assert.deepEqual(list(id, 'sequencesSeen'), ['seq-posse'], 'the card and the two lines were seen to the last')

  // The calls: L2's two, the news that was old when the save arrived (in the
  // order the load marks it), and then what the porter did say that night.
  // He told this player to look in the drawer again, and never asked what
  // was in a drawer he had seen open on another night.
  assert.deepEqual(list(id, 'radioCalls'), [
    ...list('l2-shortcut-released', 'radioCalls'),
    'porter-atrium-service',
    'porter-holyoke-lit',
    'porter-shortcut',
    'porter-first-catalogued',
    PRE_POSSE_SAVE.helloCallId,
    'porter-machine-reminder',
    'porter-legacy-drawer',
    'porter-safe-open',
  ])
  assert.ok(!list(id, 'radioCalls').includes('porter-drawer-open'))

  // Loaded: the desk stands signed, nothing is owed, and what the porter
  // answers is the honest close, which is also the last thing he said.
  const progress = progressOf(id)
  assert.ok(LECTERN && LECTERN.kind === 'signing-desk', 'the hall has no desk to sign at')
  assert.equal(signingDeskState(TERMS, LECTERN, progress, MUSEUM).state, 'signed')
  assert.equal(dueSequence(SEQUENCES, progress, MUSEUM), null, 'the card would be shown a second time')
  for (const radio of radios) {
    assert.deepEqual(dueRadioCalls(radio, progress, MUSEUM).map((call) => call.id as string), [], 'a call is still owed after the night closed')
    assert.equal(radioHintIndex(radio, progress, MUSEUM), radio.hints.length - 1)
    assert.equal(progress.radioMemory[radio.id]?.lastHint, radio.hints.length - 1)
    assert.equal(progress.radioMemory[radio.id]?.hintHeight, 0)
  }
  // Six of the ten points: the three rooms, the drawer, the safe, the deed.
  assert.ok(MUSEUM.nightClock)
  assert.equal(nightPoints(MUSEUM.nightClock, progress, MUSEUM), 6)
})

test('the new game L3 left stands one held press short of the deed, with the radio on its desk', () => {
  const id = 'l3-new-game-safe-open'
  const raw = rawProgress(id)
  // A new game of this lot, in the order of this build's own table.
  assert.deepEqual(Object.keys(raw), Object.keys(loaded.get(id)!.store.EMPTY_PROGRESS))
  assert.equal(raw.contentLot, 3)
  // The whole chain but its last link: the message heard, the year read off
  // the portrait, the drawer, its key, the safe, the Book and the proof.
  assert.deepEqual(list(id, 'roomsPowered'), ['office', 'atrium', 'holyoke'])
  assert.deepEqual(list(id, 'factsKnown'), ['springfield-renaming'])
  assert.deepEqual(list(id, 'hotspots'), ['portrait-morgan:date'], 'the year came off the portrait')
  assert.deepEqual(list(id, 'documentsRead'), ['doc-welcome', 'doc-otavio-tape', 'doc-otavio-handover', 'doc-termos', 'doc-label-proof-office'])
  assert.ok(!list(id, 'documentsRead').includes('doc-predecessor'), 'a new game of L3 never saw the note the sheet replaced')
  assert.deepEqual(list(id, 'locksOpened'), [DRAWER, 'office-safe'])
  assert.deepEqual(list(id, 'credentials'), [KEY])
  assert.deepEqual(list(id, 'triggersFired'), [PRE_POSSE_SAVE.drawer.triggerId])
  // No flag at all: the drawer was opened tonight, so the save carries no
  // mark of an older one, and nobody put the clock right.
  assert.deepEqual(list(id, 'flags'), [])
  assert.deepEqual(list(id, 'termsSigned'), [])
  assert.deepEqual(list(id, 'sequencesSeen'), [])
  assert.equal(raw.lastRoom, 'office')

  // The radio never left its charger, so every call here was heard in the
  // office, and he was never called. Two calls are missing because their
  // moment passed before the player was back in earshot: the wing was lit
  // before he could say where its breaker was, and the message had been
  // heard before he could mention its lamp. They are not owed.
  assert.deepEqual(list(id, 'devicesCarried'), [])
  assert.deepEqual(raw.radioMemory, {})
  assert.deepEqual(list(id, 'radioCalls'), [
    PRE_POSSE_SAVE.helloCallId,
    PRE_OPENING_SAVE.firstCallId,
    'porter-notebook-reminder',
    'porter-holyoke-lit',
    'porter-first-catalogued',
    'porter-shortcut',
    'porter-drawer-open',
    'porter-safe-open',
  ])
  for (const never of ['porter-radio-taken', 'porter-atrium-service', 'porter-machine-reminder', 'porter-legacy-drawer']) {
    assert.ok(!list(id, 'radioCalls').includes(never), `${never} was heard by a player it was not said to`)
  }

  // Loaded: the deed is on the desk and nothing stands between the player
  // and the signature; no card is owed for a deed nobody signed; the desk
  // radio has nothing waiting; and asked, the porter points at the lectern.
  const progress = progressOf(id)
  assert.ok(LECTERN && LECTERN.kind === 'signing-desk', 'the hall has no desk to sign at')
  const desk = signingDeskState(TERMS, LECTERN, progress, MUSEUM)
  assert.equal(desk.state, 'ready')
  assert.equal(desk.state === 'ready' && desk.term.id, 'termo-posse')
  assert.equal(dueSequence(SEQUENCES, progress, MUSEUM), null)
  for (const radio of radios) {
    assert.deepEqual(dueRadioCalls(radio, progress, MUSEUM).map((call) => call.id as string), [])
    assert.equal(radio.hints[radioHintIndex(radio, progress, MUSEUM)]?.targetId, LECTERN.id)
  }
  assert.ok(MUSEUM.nightClock)
  assert.equal(nightPoints(MUSEUM.nightClock, progress, MUSEUM), 5)
})

test('a save the lot in the tree wrote loads as itself', () => {
  // The other records are older than the build that loads them, and the load
  // may add to them. A record of the lot the tree stands at is this build's
  // own writing: read back, it has to be the same text, field for field and
  // in the same order. A field mistyped, left out or put in another place
  // while copying the record out of the browser shows here.
  //
  // The same text, with nothing set aside, since the tree's stamp caught up
  // with its lot. While L3 was written in slices the tree ran ahead of its
  // own stamp (`CONTENT_LOT` moves with the last slice): the records that
  // carried the tree's stamp were L2's, and the Posse's migration added to
  // them, which this case said by name. A lot that ships in slices again
  // has to say here what its migration adds, and until it does this fails.
  const ahead = SAVE_MIGRATIONS.filter((migration) => migration.lot > CONTENT_LOT).map((migration) => migration.lot)
  assert.deepEqual(ahead, [], 'a migration of a lot the tree has not reached: say here, by name, what it adds to a record of this lot')
  const own = fixtureIds.filter((id) => fixtureLot(SAVE_FIXTURES[id]) === CONTENT_LOT)
  for (const id of own) {
    const { state } = loaded.get(id)!
    assert.equal(
      JSON.stringify({ settings: state.settings, progress: state.progress }),
      JSON.stringify(SAVE_FIXTURES[id].save),
      `${id}: this build reads its own save as something else`,
    )
  }
  // While a lot is open the corpus has no save of it yet, and this holds of
  // nothing; the lot closes by adding one (the check on the plan, above).
  if (lastLotDone(readText(resolve(ROOT, 'docs/PLANO-ATE-O-FINAL.md'))) === CONTENT_LOT) {
    assert.ok(own.length > 0, `L${CONTENT_LOT} is done and none of its saves is in the corpus`)
  }
  // The records of the lot before are not this build's writing any more:
  // the load adds the porter's old news to them, each by what it had passed.
  const oldNews = (progress: RawProgress): string[] =>
    PRE_POSSE_SAVE.oldNews
      .filter((news) => {
        const list = (progress[news.field] as readonly string[] | undefined) ?? []
        return news.id === null ? list.length > 0 : list.includes(news.id)
      })
      .map((news) => news.callId)
  for (const id of ['l2-shortcut-released', 'l2-new-game-drawer-touched'] as const) {
    const record = rawProgress(id)
    assert.deepEqual(
      loaded.get(id)!.state.progress.radioCalls,
      [...(record.radioCalls as readonly string[]), ...oldNews(record)],
      `${id}: the calls a record of L2 leaves with`,
    )
  }
  assert.deepEqual(oldNews(rawProgress('l2-shortcut-released')), ['porter-atrium-service', 'porter-holyoke-lit', 'porter-shortcut', 'porter-first-catalogued'])
  assert.deepEqual(oldNews(rawProgress('l2-new-game-drawer-touched')), ['porter-atrium-service'])
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

  const config = readText(resolve(ROOT, 'vite.config.ts'))
  assert.ok(config.includes('qaSavePlugin()'), 'vite.config.ts does not load the plugin')

  // The entry sits in <body>: a module script in <head> runs before it.
  const html = readText(resolve(ROOT, 'index.html'))
  assert.ok(html.indexOf('</head>') < html.indexOf('src="/src/main.tsx"'))
})

test('nothing the game ships can reach the harness or the fixtures', () => {
  const html = readText(resolve(ROOT, 'index.html'))
  assert.ok(!/qaSave|\/dev\//.test(html), 'index.html mentions the harness')

  // The production graph starts at index.html and only follows imports, so a
  // module no shipped module imports is a module that is not built.
  const devDirectory = resolve(ROOT, 'src/dev')
  const offenders = sourceFiles(resolve(ROOT, 'src'))
    .filter((path) => !path.startsWith(devDirectory))
    .filter((path) =>
      /(?:from|import)\s*\(?\s*['"][^'"]*(?:\/dev\/|saveFixtures)[^'"]*['"]/.test(readText(path)),
    )
    .map((path) => relative(ROOT, path))
  assert.deepEqual(offenders, [], 'a shipped module imports the dev harness or the save fixtures')

  // And the harness itself stays small: the fixtures and nothing of the game.
  for (const path of sourceFiles(devDirectory)) {
    // Every form an import takes: `from '…'`, a bare `import '…'`, `import('…')`.
    const imports = [...readText(path).matchAll(/(?:from\s+|import\s*\(?\s*)['"]([^'"]+)['"]/g)].map(
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
