/**
 * Headless proof of the opening's flow: what E, the prompts, the pointer and
 * the save do around the first room.
 *
 *   npm run test:opening-flow
 *
 * `test-opening` proves the opening's content and rules; this proves the
 * defects an audit of the first minutes found stay fixed. Every one of them
 * was a disagreement between two systems that each looked right alone — E
 * reaching through the journal, a prompt naming the notebook while E lit the
 * lamp, a reload that rewound the clock or replayed a toast — so each check
 * pins the one shared rule both sides now ask.
 *
 * The store reads the save when it is first imported, so the browser storage
 * is stubbed with a pre-opening save before anything imports it: the
 * migration is proved through the real load path, not a copy of it.
 */

import assert from 'node:assert/strict'

import { Box3, Group, Matrix4, Mesh, Ray, Vector3 } from 'three'
import { readText } from './lib/readText.ts'

// ---------------------------------------------------------------------------
// A browser save from before the opening scene existed
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'volleyball-museum:v1'
const storage = new Map<string, string>()
const writes: string[] = []
const LEGACY_SAVE = {
  settings: { locale: 'en', quality: 'high' },
  progress: {
    version: 1,
    catalogued: ['ball-spalding'],
    hotspots: ['ball-spalding:seam'],
    documentsRead: ['doc-invention-date'],
    factsKnown: [],
    credentials: [],
    roomsVisited: ['atrium', 'holyoke', 'office'],
    roomsPowered: ['atrium', 'holyoke', 'office'],
    locksOpened: [],
    lastRoom: 'atrium',
    // No `radioCalls`, `clockSeconds` or `hintsShown`: they did not exist.
  },
}
storage.set(STORAGE_KEY, JSON.stringify(LEGACY_SAVE))
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes.push(key)
      storage.set(key, value)
    },
    removeItem: (key: string) => storage.delete(key),
  },
})

const { MUSEUM } = await import('../src/content/museum.ts')
const { en } = await import('../src/content/i18n/en.ts')
const { ptBR } = await import('../src/content/i18n/pt-BR.ts')
const { BAKED_BUNDLES } = await import('../src/content/bake.generated.ts')
const { validateOpening, validateSpeech, validateTranslations } = await import('../src/content/validate.ts')
const { PRE_OPENING_SAVE } = await import('../src/content/legacySave.ts')
const { MuseumAudio } = await import('../src/engine/audio.ts')
const {
  advanceClockSeconds,
  aimableDevices,
  CLOCK_MAX_STEP_SECONDS,
  clockTimeAfter,
  deskRadioIntent,
  deviceInputOf,
  deviceIntent,
  deviceLive,
  dueRadioCalls,
  radioCallReady,
  radioDevices,
  radioHintFor,
  savedClockSeconds,
} = await import('../src/engine/deviceRules.ts')
const {
  focusSnapshotOf,
  INTERACTION_REACH,
  interactionWinner,
  interactionWinnerKey,
  interactionWinnerOf,
  NEAREST_TIE_METRES,
  parseInteractionWinnerKey,
  PROXY_MINIMUM,
  shouldCapturePointer,
} = await import('../src/engine/interactionTarget.ts')
const {
  CONTAINER_DOOR_SECONDS,
  doorAngleAfter,
  prepareContainerContents,
  prepareContainerDoor,
  showContainerContents,
  swingContainerDoor,
} = await import('../src/engine/containerNodes.ts')
const { hiddenInScene } = await import('../src/engine/deviceNodes.ts')
const { checklistPageOf, containerById, journalUnlocked, notebookPagesFor } = await import('../src/engine/notebook.ts')
const { containerGrant } = await import('../src/engine/progressGrants.ts')
const { containerReadQueue, readerAdvance, readerKeyPage, readerPageCount, transcriptText } = await import('../src/engine/readingQueue.ts')
const { contentActions } = await import('../src/content/simulate.ts')
const { isUnclaimedInteractKey } = await import('../src/engine/primaryAction.ts')
const { progressConditionMet } = await import('../src/engine/progressCondition.ts')
const {
  bindSaveFlush,
  contributeToSave,
  EMPTY_PROGRESS,
  hasSavedProgress,
  isModalOpen,
  migrateProgress,
  SAVE_VERSION,
  useMuseum,
} = await import('../src/state/store.ts')
const {
  archiveFiledKey,
  canSubmitCode,
  closeLabel,
  JOURNAL_HOME_TAB,
  listGrew,
  lockKeyIntent,
  lookHintVisible,
  newGameClick,
  shouldAnnounceJournal,
} = await import('../src/ui/hudRules.ts')
const { portalOpening } = await import('../src/ui/mapGeometry.ts')
const { containerPrompt, credentialsTaken, devicePrompt } = await import('../src/ui/promptRules.ts')
const { deviceWiringProblems, officeAnswersWiringProblems } = await import('./lib/runtimeWiring.ts')

type Progress = ReturnType<typeof migrateProgress>
type StoreState = ReturnType<typeof useMuseum.getState>

let passed = 0
function test(name: string, run: () => void) {
  run()
  passed += 1
  console.log(`  pass  ${name}`)
}

const [radioEntry] = radioDevices(MUSEUM)
assert.ok(radioEntry, 'the office has a radio')
const radio = radioEntry.device

/** A store snapshot with nothing open and nothing focused, then `patch`. */
function focusState(patch: Partial<StoreState> = {}): StoreState {
  return {
    ...useMuseum.getState(),
    examining: null,
    openedContainer: null,
    activeLock: null,
    journalTab: null,
    focusedTransitionDoor: null,
    focusedExhibit: null,
    focusedContainer: null,
    focusedContainerDistance: Number.POSITIVE_INFINITY,
    focusedDevice: null,
    focusedDeviceDistance: Number.POSITIVE_INFINITY,
    focusedPowerControl: null,
    focusedPowerControlDistance: Number.POSITIVE_INFINITY,
    ...patch,
  }
}

function progressWith(patch: Partial<Progress> = {}): Progress {
  return { ...migrateProgress({ version: SAVE_VERSION, radioCalls: [] }), ...patch }
}

const source = (path: string) => readText(new URL(`../src/${path}`, import.meta.url))

console.log('\nOpening flow')

// ---------------------------------------------------------------------------
// Saves from before the opening (#16)
// ---------------------------------------------------------------------------

test('a pre-opening save keeps its journal and hears no stale first call', () => {
  const progress = useMuseum.getState().progress
  assert.ok(progress.documentsRead.includes(PRE_OPENING_SAVE.journalDocumentId), 'notebook granted')
  assert.ok(progress.radioCalls.includes(PRE_OPENING_SAVE.firstCallId), 'first call is history')
  assert.equal(journalUnlocked(MUSEUM, progress.documentsRead), true)
  // No call sends them to a lit breaker, and none tells them what they did
  // on another night: the calls for the hall, for Wing 1 and for the first
  // piece checked count as heard (L3). What is owed is the porter's
  // introduction, which every save hears once.
  assert.deepEqual(dueRadioCalls(radio, progress, MUSEUM).map((call) => call.id), ['porter-hello'])
  for (const id of ['porter-atrium-service', 'porter-holyoke-lit', 'porter-first-catalogued']) {
    assert.ok(progress.radioCalls.includes(id), `"${id}" would be told as news`)
  }
  assert.deepEqual(progress.catalogued, ['ball-spalding'], 'nothing of the playthrough is lost')
  assert.equal(useMuseum.getState().settings.locale, 'en', 'settings survive')
  assert.equal(progress.version, SAVE_VERSION, 'the version was not bumped to get here')
  // Granted a notebook they never picked up: no toast says they just did.
  assert.deepEqual(progress.hintsShown, [PRE_OPENING_SAVE.journalHintId])
  assert.equal(
    shouldAnnounceJournal({
      unlocked: true,
      reading: false,
      alreadyShown: progress.hintsShown.includes(PRE_OPENING_SAVE.journalHintId),
    }),
    false,
  )
})

test('a notebook taken before the lesson was recorded is not announced on Continue', () => {
  // A save from the first opening build: calls, a read notebook, no flag list.
  const early = migrateProgress({ version: SAVE_VERSION, radioCalls: [], documentsRead: ['doc-welcome'] })
  assert.deepEqual(early.hintsShown, [PRE_OPENING_SAVE.journalHintId])
  // A save that keeps the flag list is trusted: one with the notebook still
  // open at reload has the lesson still owed, and gets it.
  const owed = migrateProgress({ version: SAVE_VERSION, radioCalls: [], documentsRead: ['doc-welcome'], hintsShown: [] })
  assert.deepEqual(owed.hintsShown, [])
  const unread = migrateProgress({ version: SAVE_VERSION, radioCalls: [] })
  assert.deepEqual(unread.hintsShown, [], 'no notebook, nothing learnt')
  const junk = migrateProgress({ version: SAVE_VERSION, radioCalls: [], documentsRead: ['doc-welcome'], hintsShown: 'x' })
  assert.deepEqual(junk.hintsShown, [PRE_OPENING_SAVE.journalHintId], 'junk is no list either')
  assert.ok(
    source('ui/Hud.tsx').includes('hintId={PRE_OPENING_SAVE.journalHintId}'),
    'the toast reads the id the migration writes',
  )
})

test('the migration only touches saves that predate the opening', () => {
  // A save from the opening onwards has `radioCalls`: the opening's
  // migration leaves it alone (no notebook granted, no first call taken as
  // heard). The Posse's then takes the hall's call for old news, the hall
  // being lit in a save that never heard the porter's introduction.
  const modern = migrateProgress({ version: SAVE_VERSION, radioCalls: [], roomsPowered: ['atrium'] })
  assert.deepEqual(modern.documentsRead, [])
  assert.deepEqual(modern.radioCalls, ['porter-atrium-service'])
  assert.ok(!modern.radioCalls.includes(PRE_OPENING_SAVE.firstCallId))
  // Heard, the introduction ends that: from then on a milestone is news.
  const met = migrateProgress({ version: SAVE_VERSION, radioCalls: ['porter-hello'], roomsPowered: ['atrium'] })
  assert.deepEqual(met.radioCalls, ['porter-hello'])

  // A pre-opening save that never did anything is a new game.
  const untouched = migrateProgress({ version: SAVE_VERSION, roomsVisited: ['atrium'] })
  assert.deepEqual(untouched.documentsRead, [])
  assert.deepEqual(untouched.radioCalls, [])

  // Lit office but dark atrium: the first call still has something to say.
  const officeOnly = migrateProgress({ version: SAVE_VERSION, roomsPowered: ['office'] })
  assert.deepEqual(officeOnly.radioCalls, [])
  assert.deepEqual(officeOnly.documentsRead, ['doc-welcome'])
  assert.deepEqual(
    dueRadioCalls(radio, officeOnly, MUSEUM).map((call) => call.id),
    ['porter-hello', 'porter-first-call'],
  )
})

test('a save from another version or full of junk degrades to a valid one', () => {
  assert.deepEqual(migrateProgress({ version: 99, catalogued: ['x'] }), { ...EMPTY_PROGRESS })
  assert.deepEqual(migrateProgress(null), { ...EMPTY_PROGRESS })
  const junk = migrateProgress({
    version: SAVE_VERSION,
    radioCalls: 'porter-first-call',
    catalogued: ['ok', 3, null],
    clockSeconds: { 'office-clock': 42, broken: Number.NaN, negative: -4, text: '9' },
    hintsShown: ['journal-taken'],
  })
  // A string is not a list: the call it names was not heard. What the list
  // holds is what the load itself puts there, for the piece this save has
  // catalogued and the porter never spoke of (the Posse's old news).
  assert.ok(!junk.radioCalls.includes('porter-first-call'), 'a string is not a list')
  assert.deepEqual(junk.radioCalls, ['porter-first-catalogued'])
  assert.deepEqual(junk.catalogued, ['ok'])
  assert.deepEqual(junk.clockSeconds, { 'office-clock': 42 })
  assert.deepEqual(junk.hintsShown, ['journal-taken'])
})

test('the first call only plays while the atrium is still dark', () => {
  // With the hall lit the instruction for its breaker is gone, for good; the
  // porter's introduction and his word about the hall are what is owed.
  const lit = progressWith({ roomsPowered: ['office', 'atrium'], documentsRead: ['doc-welcome'] })
  assert.deepEqual(dueRadioCalls(radio, lit, MUSEUM).map((call) => call.id), ['porter-hello', 'porter-atrium-service'])
  const dark = progressWith({ roomsPowered: ['office'], documentsRead: ['doc-welcome'] })
  assert.deepEqual(dueRadioCalls(radio, dark, MUSEUM).map((call) => call.id), ['porter-hello', 'porter-first-call'])
})

test('the validator holds the migration to ids that exist', () => {
  assert.ok(!validateOpening(MUSEUM).some((issue) => issue.code.startsWith('legacy-save')))
  const renamed = {
    ...MUSEUM,
    documents: MUSEUM.documents.map((doc) =>
      doc.id === 'doc-welcome' ? { ...doc, id: 'doc-welcome-v2' } : doc,
    ),
  }
  assert.ok(validateOpening(renamed).some((issue) => issue.code === 'legacy-save-journal'))
})

// ---------------------------------------------------------------------------
// One modal at a time (#1, #15, #9, #25)
// ---------------------------------------------------------------------------

test('any of the four modals counts as one open', () => {
  assert.equal(isModalOpen(focusState()), false)
  for (const patch of [
    { examining: 'ball-spalding' },
    { openedContainer: 'office-notebook' },
    { activeLock: 'office-drawer' },
    { journalTab: 'map' as const },
  ]) {
    assert.equal(isModalOpen(focusState(patch)), true, JSON.stringify(patch))
  }
})

test('with the journal open, E reaches nothing behind it', () => {
  // The lamp only answers in the dark, the radio only once the lamp is on.
  const dark = progressWith()
  const lit = progressWith({ roomsPowered: ['office'] })
  for (const [focus, progress] of [
    [{ focusedContainer: 'office-cabinet', focusedContainerDistance: 1 }, dark],
    [{ focusedPowerControl: 'office-lamp-switch', focusedPowerControlDistance: 1 }, dark],
    [{ focusedDevice: 'office-radio', focusedDeviceDistance: 1 }, lit],
    [
      {
        focusedTransitionDoor: {
          id: 'office-to-atrium',
          targetRoom: 'atrium',
          status: 'ready' as const,
          armed: false,
        },
      },
      lit,
    ],
    [{ focusedExhibit: 'ball-spalding' }, dark],
  ] as const) {
    const open = focusState({ ...focus, journalTab: 'map', progress })
    assert.equal(interactionWinnerOf(open, MUSEUM), null, JSON.stringify(focus))
    assert.equal(interactionWinnerKey(open, MUSEUM), null, 'so no prompt shows either')
    const closed = focusState({ ...focus, progress })
    assert.ok(interactionWinnerOf(closed, MUSEUM)?.live, `without it ${JSON.stringify(focus)} answers`)
  }
})

test('opening a reader, a keypad or an exhibit closes the journal', () => {
  const store = useMuseum.getState()
  store.setJournalTab('map')
  store.setActiveLock('office-drawer')
  assert.equal(useMuseum.getState().journalTab, null, 'a keypad never hides under the journal')
  store.setActiveLock(null)
  store.setJournalTab('archive')
  store.setOpenedContainer('office-cabinet')
  assert.equal(useMuseum.getState().journalTab, null)
  store.setOpenedContainer(null)
  store.setJournalTab('catalogue')
  store.setExamining('ball-spalding')
  assert.equal(useMuseum.getState().journalTab, null)
  store.setExamining(null)
  // Closing one modal leaves the journal alone.
  store.setJournalTab('map')
  store.setActiveLock(null)
  assert.equal(useMuseum.getState().journalTab, 'map')
  store.setJournalTab(null)
})

test('the notebook opens on the list, from the key and from the icon (L3)', () => {
  assert.equal(JOURNAL_HOME_TAB, 'notebook')
  const journal = source('ui/Journal.tsx').replace(/\s+/g, ' ')
  const hud = source('ui/Hud.tsx').replace(/\s+/g, ' ')
  assert.ok(
    journal.includes('state.setJournalTab(state.journalTab ? null : JOURNAL_HOME_TAB)'),
    'Tab opens the notebook on its home tab',
  )
  assert.ok(hud.includes('setJournalTab(journalTab ? null : JOURNAL_HOME_TAB)'), 'and so does the icon')
  for (const [file, code] of [['ui/Journal.tsx', journal], ['ui/Hud.tsx', hud]] as const) {
    assert.ok(!/setJournalTab\([^)]*'(?:map|catalogue|archive|credits|notebook)'\)/.test(code), `${file} opens the notebook on a tab of its own choosing`)
  }
  // The tab is the first of five and draws the list.
  assert.ok(
    /const tabs: [^=]*= \[ \{ id: 'notebook', labelKey: 'journal\.tab\.notebook' \}, \{ id: 'map', /.test(journal),
    'the list is the first tab',
  )
  assert.ok(journal.includes("{openTab === 'notebook' ? <NotebookTab /> : null}"))
  assert.equal(ptBR['journal.tab.notebook'], 'Caderno')
  assert.equal(en['journal.tab.notebook'], 'Notebook')

  // What it shows is the list as the content has it: the first page that is one.
  const page = checklistPageOf(MUSEUM)
  assert.equal(page?.style, 'checklist')
  assert.equal(page?.headingKey, 'notebook.todo.heading')
  assert.deepEqual(page?.items?.map((item) => item.labelKey), ['notebook.todo.power', 'notebook.todo.catalogue', 'notebook.todo.vault'])
  assert.equal(checklistPageOf({ documents: MUSEUM.documents.filter((doc) => !doc.pages) }), null, 'a content with no list has none to show')
  assert.ok(journal.includes('const page = checklistPageOf(MUSEUM)'), 'the tab asks the rule for its page')
  assert.ok(journal.includes('<NotebookPageView page={page} />'), 'and draws it as the notebook does: alive')

  // The store takes the tab, and it is a modal like the other four.
  useMuseum.getState().setJournalTab(JOURNAL_HOME_TAB)
  assert.equal(useMuseum.getState().journalTab, 'notebook')
  assert.equal(isModalOpen(useMuseum.getState()), true)
  useMuseum.getState().setJournalTab(null)
})

test('one E press lights the lamp without also taking the radio', () => {
  // The E listeners all run for the same event, each re-reading a store the
  // previous one may just have changed: the lamp's switch makes the radio live
  // mid-event. The first listener that acts claims the press.
  const page = new EventTarget()
  const acted: string[] = []
  let radioLive = false
  page.addEventListener('keydown', (event) => {
    if (!isUnclaimedInteractKey(event as KeyboardEvent)) return
    radioLive = true // the lamp restores power...
    acted.push('lamp')
    event.preventDefault()
  })
  page.addEventListener('keydown', (event) => {
    if (!isUnclaimedInteractKey(event as KeyboardEvent)) return
    if (radioLive) acted.push('take radio') // ...and the radio would now answer
  })
  const press = Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyE' })
  page.dispatchEvent(press)
  assert.deepEqual(acted, ['lamp'])
  assert.equal(isUnclaimedInteractKey({ code: 'KeyE', defaultPrevented: false }), true)
  assert.equal(isUnclaimedInteractKey({ code: 'KeyE', defaultPrevented: true }), false)
  assert.equal(isUnclaimedInteractKey({ code: 'KeyR', defaultPrevented: false }), false)
})

test('every E handler asks the shared guard and the shared arbitration', () => {
  for (const file of [
    'engine/Containers.tsx',
    'engine/PowerControls.tsx',
    'engine/Devices.tsx',
    'engine/Interaction.tsx',
  ]) {
    const code = source(file)
    assert.ok(code.includes('interactionWinnerOf(state, MUSEUM)'), `${file} asks who owns E`)
    assert.ok(code.includes('isModalOpen(state)'), `${file} clears its focus under a modal`)
  }
  const doors = source('engine/TransitionDoors.tsx')
  assert.equal((doors.match(/isModalOpen\(museum\)/g) ?? []).length, 2, 'door press and door focus')
  // One press, one action: each E listener stands down once another acted.
  for (const file of [
    'engine/Containers.tsx',
    'engine/PowerControls.tsx',
    'engine/Devices.tsx',
    'engine/Interaction.tsx',
    'engine/TransitionDoors.tsx',
  ]) {
    const code = source(file)
    assert.ok(code.includes('isUnclaimedInteractKey(event)'), `${file} leaves a claimed E alone`)
    assert.ok(!code.includes("event.code !== 'KeyE'") && !code.includes("event.code === 'KeyE'"), `${file} has no raw E test`)
  }
  const hud = source('ui/Hud.tsx')
  assert.ok(/\{modal \? null : \(\s*<>\s*<div className="crosshair"/.test(hud), 'no crosshair or prompt under a modal')
  for (const prompt of ['exhibit', 'container', 'power-control', 'device']) {
    assert.ok(hud.includes(`useWinner('${prompt}')`), `the ${prompt} prompt asks the arbitration`)
  }
})

// ---------------------------------------------------------------------------
// The nearest target owns E and the prompt (#4)
// ---------------------------------------------------------------------------

test('the nearest desk target wins, a near tie keeps the old order', () => {
  const lampFirst = interactionWinner({
    door: null,
    exhibit: null,
    container: { id: 'office-notebook', distance: 1.5 },
    device: null,
    powerControl: { id: 'office-lamp-switch', distance: 0.9, live: true },
  })
  assert.deepEqual(lampFirst, { kind: 'power-control', id: 'office-lamp-switch', live: true })

  const tie = interactionWinner({
    door: null,
    exhibit: null,
    container: { id: 'office-notebook', distance: 1 + NEAREST_TIE_METRES * 0.9 },
    device: { id: 'office-radio', distance: 1, live: true },
    powerControl: { id: 'office-lamp-switch', distance: 1, live: true },
  })
  assert.equal(tie?.kind, 'container', 'within the tie the furniture still comes first')
})

test('a dead radio never takes the key from the lamp, but still says why', () => {
  const both = interactionWinner({
    door: null,
    exhibit: null,
    container: null,
    device: { id: 'office-radio', distance: 0.4, live: false },
    powerControl: { id: 'office-lamp-switch', distance: 1.2, live: true },
  })
  assert.equal(both?.kind, 'power-control')
  const alone = interactionWinner({
    door: null,
    exhibit: null,
    container: null,
    device: { id: 'office-radio', distance: 0.4, live: false },
    powerControl: null,
  })
  assert.deepEqual(alone, { kind: 'device', id: 'office-radio', live: false })
})

test('a thing that only says something holds the prompt and never the key (L3)', () => {
  const podium = aimableDevices(MUSEUM).find((entry) => entry.device.id === 'atrium-podium')
  assert.ok(podium, "the hall's plinth is something the crosshair rests on")
  assert.equal(podium.room.id, 'atrium')
  assert.equal(podium.device.kind, 'notice')
  // The crosshair rests on what answers it: the radio, the plinth, the clock
  // on the office wall (it can be put right) and the telephone on the desk
  // (it has a dead line to say). A door reader says nothing to E, and is not
  // in the list.
  assert.deepEqual(
    aimableDevices(MUSEUM).map((entry) => `${entry.room.id}/${entry.device.id}`).sort(),
    ['atrium/atrium-podium', 'office/office-clock', 'office/office-radio', 'office/office-telephone'],
  )

  // Alone under the crosshair it owns the prompt, and E has nothing to do:
  // dark or lit, with the radio in the pocket or not.
  for (const progress of [
    progressWith(),
    progressWith({ roomsPowered: ['office', 'atrium', 'holyoke'], devicesCarried: ['office-radio'] }),
  ]) {
    const alone = focusState({ focusedDevice: 'atrium-podium', focusedDeviceDistance: 1.7, progress })
    assert.deepEqual(interactionWinnerOf(alone, MUSEUM), { kind: 'device', id: 'atrium-podium', live: false })
    assert.equal(interactionWinnerKey(alone, MUSEUM), 'device:dead:atrium-podium')
  }
  // With the hall's breaker along the same ray, however far behind, the key
  // and the prompt are the breaker's: a notice never takes them from a thing
  // that works. Once the hall is lit the breaker has nothing left to do.
  const both = (progress: Progress) =>
    interactionWinnerOf(
      focusState({
        focusedDevice: 'atrium-podium',
        focusedDeviceDistance: 1.2,
        focusedPowerControl: 'atrium-breaker',
        focusedPowerControlDistance: 2.6,
        progress,
      }),
      MUSEUM,
    )
  assert.deepEqual(both(progressWith({ roomsPowered: ['office'] })), { kind: 'power-control', id: 'atrium-breaker', live: true })
  assert.deepEqual(both(progressWith({ roomsPowered: ['office', 'atrium'] })), { kind: 'device', id: 'atrium-podium', live: false })

  // One answer for the prompt, the key and the touch button.
  const notice = deviceIntent(podium.device, { powered: true, carried: false, speaking: false })
  assert.deepEqual(notice, { kind: 'notice' })
  assert.equal(deviceLive(notice), false)
  assert.deepEqual(devicePrompt(podium.device, notice), {
    form: 'notice',
    titleKey: 'device.atrium-podium.title',
    noticeKey: 'device.atrium-podium.notice',
  })
  assert.equal(`${ptBR['device.atrium-podium.title']} — ${ptBR['device.atrium-podium.notice']}`, 'Plinto do Fundador — Interditado: obra do piso.')
  assert.equal(`${en['device.atrium-podium.title']} — ${en['device.atrium-podium.notice']}`, "The Founder's plinth — Closed off: the floor is being relaid.")
  // A device of another kind handed a notice's intent draws nothing.
  assert.equal(devicePrompt(radio, notice), null)
  assert.equal(devicePrompt(podium.device, { kind: 'none' }), null)

  // The radio goes through the same door and answers as it always did.
  for (const powered of [false, true]) {
    for (const carried of [false, true]) {
      for (const speaking of [false, true]) {
        const desk = deskRadioIntent(radio, { live: powered, carried, speaking })
        const intent = deviceIntent(radio, { powered, carried, speaking })
        assert.deepEqual(intent, { kind: 'radio', intent: desk })
        assert.equal(deviceLive(intent), desk !== 'dead')
        const view = devicePrompt(radio, intent)
        assert.ok(view?.form === 'action')
        assert.equal(view.key, deviceLive(intent), 'the key is drawn exactly when E does something')
        assert.equal(view.titleKey, radio.titleKey)
      }
    }
  }
  assert.deepEqual(
    (['dead', 'take', 'skip', 'call'] as const).map((intent) => devicePrompt(radio, { kind: 'radio', intent })),
    [
      { form: 'action', key: false, labelKey: 'prompt.radio.dead', titleKey: radio.titleKey },
      { form: 'action', key: true, labelKey: 'prompt.radio.take', titleKey: radio.titleKey },
      { form: 'action', key: true, labelKey: 'radio.skip', titleKey: radio.titleKey },
      { form: 'action', key: true, labelKey: 'prompt.radio.call', titleKey: radio.titleKey },
    ],
  )
  for (const device of MUSEUM.rooms.flatMap((room) => room.devices ?? [])) {
    if (device.kind !== 'clock' && device.kind !== 'power-indicator') continue
    // A door reader never answers; a clock answers until it has been set.
    const silent = deviceIntent(device, { powered: true, carried: false, speaking: false, set: true })
    assert.deepEqual(silent, { kind: 'none' }, `${device.id} answers nothing`)
    assert.equal(deviceLive(silent), false)
  }
  // The clock, alone under the crosshair: with the lamp on E sets it, and the
  // prompt says so with the key; in the dark, and once set, it is only a
  // clock on a wall and holds neither.
  const clockFocus = (progress: Progress) =>
    interactionWinnerOf(focusState({ focusedDevice: 'office-clock', focusedDeviceDistance: 2, progress }), MUSEUM)
  assert.deepEqual(clockFocus(progressWith({ roomsPowered: ['office'] })), { kind: 'device', id: 'office-clock', live: true })
  assert.deepEqual(clockFocus(progressWith()), { kind: 'device', id: 'office-clock', live: false })
  assert.deepEqual(clockFocus(progressWith({ roomsPowered: ['office'], flags: ['clock-set'] })), { kind: 'device', id: 'office-clock', live: false })
  const officeClock = aimableDevices(MUSEUM).find((entry) => entry.device.id === 'office-clock')!.device
  const clockView = (progress: Progress) =>
    devicePrompt(officeClock, deviceIntent(officeClock, deviceInputOf(officeClock, { progress, radio: null }, MUSEUM)))
  assert.deepEqual(clockView(progressWith({ roomsPowered: ['office'] })), {
    form: 'action',
    key: true,
    labelKey: 'prompt.clock.set',
    titleKey: 'device.office-clock.title',
  })
  assert.equal(clockView(progressWith()), null, 'nothing is drawn for a clock that cannot be set')
  assert.equal(clockView(progressWith({ roomsPowered: ['office'], flags: ['clock-set'] })), null)

  // And the components ask those rules: the scan, the proxy, E, the prompt
  // and the touch button.
  assert.deepEqual(deviceWiringProblems(source), [])
  const changed = (path: string, from: string, to: string) => (asked: string) => {
    if (asked !== path) return source(asked)
    const next = source(asked).replace(from, to)
    assert.notEqual(next, source(asked), `the refactor of ${path} found nothing to change`)
    return next
  }
  const refactors: readonly (readonly [string, (path: string) => string])[] = [
    ['a scan that aims at radios only', changed('engine/Devices.tsx', 'aimableDeviceId(object.name, AIMABLE_BY_ID, carried)', 'aimableDeviceId(object.name, RADIOS_BY_ID, carried)')],
    ['a box to aim at for the radio alone', changed('engine/Devices.tsx', '{AIMABLE_BY_ID.has(device.id) ? (', "{device.kind === 'radio' ? (")],
    ['E working a device whatever its intent', changed('engine/Devices.tsx', 'if (!deviceLive(intent)) return false', '')],
    ['E deciding without the shared arbitration', changed('engine/Devices.tsx', "if (winner?.kind !== 'device' || !winner.live) return false", "if (winner?.kind !== 'device') return false")],
    ['a device live by being in the sights', changed('engine/interactionTarget.ts', 'deviceLive(deviceIntent(focused,', 'Boolean(deviceIntent(focused,')],
    ['a prompt the component words by itself', changed('ui/Hud.tsx', 'const view = devicePrompt(', 'const view = wordedHere(')],
    ['a notice drawn with a key', changed('ui/Hud.tsx', "view.form === 'notice' ? (", "view.form === 'none' ? (")],
    ['a touch button for whatever is in the sights', changed('ui/MobileControls.tsx', "(winner.kind === 'door' ? doorCanAct : winner.live)", "(winner.kind === 'door' ? doorCanAct : true)")],
    // The clock (L3): the press, the hands and the toast.
    ['E on a clock that takes the key and records nothing', changed('engine/Devices.tsx', 'useMuseum.getState().grant(clockGrant(entry.device))', 'museumAudio.chime()')],
    ['a set clock that goes on showing the storm\'s minute', changed('engine/Devices.tsx', 'clockFaceAngles(device.stoppedAt, count.advance(delta), night)', 'clockFaceAngles(device.stoppedAt, count.advance(delta), null)')],
    ['a clock that reads the hour from somewhere of its own', changed('engine/Devices.tsx', 'setClockMinutes(MUSEUM.nightClock, device.setFlag, state.progress, MUSEUM)', 'setClockMinutes(MUSEUM.nightClock, device.setFlag, EMPTY_PROGRESS, MUSEUM)')],
    ['a toast for any flag at all', changed('ui/Hud.tsx', 'const set = clockJustSet(seenLength.current, flags, clockFlags)', 'const set = flags.length > seenLength.current')],
    ['an hour of the HUD\'s own', changed('ui/Hud.tsx', 'nightPhraseKey(MUSEUM.nightClock, nightPoints(MUSEUM.nightClock, state.progress, MUSEUM))', "'night.hour.1'")],
    ['a toast that says the clock was set and not to what', changed('ui/Hud.tsx', "{phraseKey ? ` — ${t(phraseKey as never)}` : ''}", '')],
    ['a subtitle that prints the token of the hour', changed('ui/Hud.tsx', 'fillHour(t(radio.lineKeys[radio.index] as never), hourKey ? t(hourKey as never) : null)', 't(radio.lineKeys[radio.index] as never)')],
  ]
  const uncaught = refactors.filter(([, reader]) => deviceWiringProblems(reader).length === 0).map(([name]) => name)
  assert.deepEqual(uncaught, [], 'a refactor this check exists to catch went through')
})

test('doors and exhibits keep their precedence over desk targets', () => {
  const desk = {
    container: { id: 'office-notebook', distance: 0.3 },
    device: null,
    powerControl: null,
  }
  assert.equal(interactionWinner({ door: 'office-to-atrium', exhibit: 'x', ...desk })?.kind, 'door')
  assert.equal(interactionWinner({ door: null, exhibit: 'x', ...desk })?.kind, 'exhibit')
})

test('liveness comes from the save: radio charge, lamp still to switch on', () => {
  const dark = focusSnapshotOf(
    focusState({
      focusedDevice: 'office-radio',
      focusedDeviceDistance: 1,
      focusedPowerControl: 'office-lamp-switch',
      focusedPowerControlDistance: 2,
      progress: progressWith(),
    }),
    MUSEUM,
  )
  assert.equal(dark.device?.live, false)
  assert.equal(dark.powerControl?.live, true)
  const lit = focusSnapshotOf(
    focusState({
      focusedDevice: 'office-radio',
      focusedDeviceDistance: 1,
      focusedPowerControl: 'office-lamp-switch',
      focusedPowerControlDistance: 2,
      progress: progressWith({ roomsPowered: ['office'] }),
    }),
    MUSEUM,
  )
  assert.equal(lit.device?.live, true)
  assert.equal(lit.powerControl?.live, false, 'a lit room has nothing left to switch')
})

test('the prompt key round-trips the winner, colons in ids included', () => {
  const winner = { kind: 'container' as const, id: 'odd:id:here', live: true }
  const key = interactionWinnerKey(
    focusState({ focusedContainer: winner.id, focusedContainerDistance: 1 }),
    MUSEUM,
  )
  assert.deepEqual(parseInteractionWinnerKey(key), winner)
  assert.equal(parseInteractionWinnerKey(null), null)
  assert.equal(parseInteractionWinnerKey('nonsense'), null)
})

test('the store publishes hit distances and skips sub-centimetre jitter', () => {
  const store = useMuseum.getState()
  store.setFocusedContainer('office-notebook', 1.4)
  assert.equal(useMuseum.getState().focusedContainerDistance, 1.4)
  let notified = 0
  const unsubscribe = useMuseum.subscribe(() => {
    notified += 1
  })
  store.setFocusedContainer('office-notebook', 1.402)
  assert.equal(notified, 0, 'two millimetres is not worth a store write')
  store.setFocusedContainer('office-notebook', 1.2)
  assert.equal(notified, 1)
  store.setFocusedContainer(null)
  unsubscribe()
  assert.equal(useMuseum.getState().focusedContainerDistance, Number.POSITIVE_INFINITY)
})

/**
 * The audit's case, rebuilt from the baked bounds and the runtime's padding:
 * coming from the north drawer towards the desk and looking at the lamp, the
 * ray crosses the lamp's volume and carries on into the notebook's.
 */
test('looking at the lamp past the notebook names the lamp', () => {
  const office = MUSEUM.rooms.find((room) => room.id === 'office')
  const notebook = office?.containers?.find((container) => container.id === 'office-notebook')
  const lamp = office?.powerControl
  assert.ok(office && notebook && lamp)

  const parts = BAKED_BUNDLES.flatMap((bundle) => bundle.parts)
  /** The proxy each component builds: recipe bounds padded to a minimum. */
  const proxy = (
    part: string,
    minimum: readonly [number, number, number],
    position: readonly number[],
    rotationY: number,
  ) => {
    const box = new Box3()
    for (const entry of parts) {
      if (entry.name !== part && !entry.name.startsWith(`${part}__`)) continue
      box.expandByPoint(new Vector3(...entry.bounds.min))
      box.expandByPoint(new Vector3(...entry.bounds.max))
    }
    assert.ok(!box.isEmpty(), `"${part}" is in the bake`)
    const centre = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    size.set(Math.max(size.x, minimum[0]), Math.max(size.y, minimum[1]), Math.max(size.z, minimum[2]))
    const local = new Box3().setFromCenterAndSize(centre, size)
    const toRoom = new Matrix4()
      .makeTranslation(position[0], position[1], position[2])
      .multiply(new Matrix4().makeRotationY(rotationY))
    return { local, toRoom, fromRoom: toRoom.clone().invert(), centre: centre.applyMatrix4(toRoom) }
  }
  const hit = (target: ReturnType<typeof proxy>, ray: Ray, reach: number) => {
    const point = ray.clone().applyMatrix4(target.fromRoom).intersectBox(target.local, new Vector3())
    if (!point) return null
    const distance = point.applyMatrix4(target.toRoom).distanceTo(ray.origin)
    return distance <= reach ? distance : null
  }

  const lampProxy = proxy(lamp.part, PROXY_MINIMUM.powerControl, lamp.position, lamp.rotationY ?? 0)
  const notebookProxy = proxy(
    notebook.part,
    PROXY_MINIMUM.notebook,
    notebook.position,
    notebook.rotationY ?? 0,
  )

  let overlapping = 0
  for (let z = -1.4; z >= -1.8001; z -= 0.05) {
    const eye = new Vector3(lamp.position[0], 1.62, z)
    const ray = new Ray(eye, lampProxy.centre.clone().sub(eye).normalize())
    const lampDistance = hit(lampProxy, ray, INTERACTION_REACH.powerControl)
    const notebookDistance = hit(notebookProxy, ray, INTERACTION_REACH.container)
    assert.ok(lampDistance !== null, `the lamp is in reach from z ${z.toFixed(2)}`)
    if (notebookDistance === null) continue
    overlapping += 1
    assert.ok(notebookDistance > lampDistance, 'the notebook lies beyond the lamp')
    const winner = interactionWinnerOf(
      focusState({
        focusedContainer: notebook.id,
        focusedContainerDistance: notebookDistance,
        focusedPowerControl: lamp.id,
        focusedPowerControlDistance: lampDistance,
        progress: progressWith(),
      }),
      MUSEUM,
    )
    assert.equal(winner?.id, lamp.id, `from z ${z.toFixed(2)} E and the prompt are the lamp's`)
  }
  assert.ok(overlapping > 0, 'the ray really does reach both volumes somewhere on that path')
})

// ---------------------------------------------------------------------------
// The notebook can be skipped, and the porter notices (#2)
// ---------------------------------------------------------------------------

test('documentsUnread holds only until the document is read', () => {
  const condition = { documentsUnread: ['doc-welcome'] }
  assert.equal(progressConditionMet(condition, progressWith(), MUSEUM), true)
  assert.equal(
    progressConditionMet(condition, progressWith({ documentsRead: ['doc-welcome'] }), MUSEUM),
    false,
  )
  const broken = {
    ...MUSEUM,
    rooms: MUSEUM.rooms.map((room) => ({
      ...room,
      devices: (room.devices ?? []).map((device) =>
        device.kind === 'radio'
          ? { ...device, hints: [{ when: { documentsUnread: ['doc-nope'] }, heightKeys: ['radio.hint.rest'], mentions: [] }, ...device.hints] }
          : device,
      ),
    })),
  }
  assert.ok(validateOpening(broken).some((issue) => issue.code === 'condition-document-missing'))
})

test('a player who skipped the notebook is sent back for it first, while still in the office', () => {
  const skipped = progressWith({ roomsPowered: ['office'], roomsVisited: ['office'] })
  assert.deepEqual(radioHintFor(radio, skipped, MUSEUM), ['radio.hint.notebook.where'])
  const read = progressWith({ roomsPowered: ['office'], documentsRead: ['doc-welcome'] })
  assert.deepEqual(radioHintFor(radio, read, MUSEUM), ['radio.hint.atrium.where'])
  // Out of the office without it, the notebook no longer stands in front of
  // what the player needs: it is optional, and the hall is dark (S25).
  const out = progressWith({ roomsPowered: ['office'], roomsVisited: ['office', 'atrium'] })
  assert.deepEqual(radioHintFor(radio, out, MUSEUM), ['radio.hint.atrium.where'])
})

test('the notebook reminder follows the first call and lapses once taken', () => {
  const skipped = progressWith({ roomsPowered: ['office'] })
  assert.deepEqual(
    dueRadioCalls(radio, skipped, MUSEUM).map((call) => call.id),
    ['porter-hello', 'porter-first-call', 'porter-notebook-reminder'],
  )
  // However the retries fall, the reminder waits for the introduction and
  // for the breaker's instruction, in that order.
  assert.equal(radioCallReady(radio, 'porter-notebook-reminder', skipped, MUSEUM), 'queued')
  assert.equal(radioCallReady(radio, 'porter-first-call', skipped, MUSEUM), 'queued')
  assert.equal(radioCallReady(radio, 'porter-hello', skipped, MUSEUM), 'ready')
  const heard = { ...skipped, radioCalls: ['porter-hello', 'porter-first-call'] }
  assert.equal(radioCallReady(radio, 'porter-notebook-reminder', heard, MUSEUM), 'ready')
  // Picked up while it waited: it is dropped, not played late.
  const taken = { ...heard, documentsRead: ['doc-welcome'] }
  assert.equal(radioCallReady(radio, 'porter-notebook-reminder', taken, MUSEUM), 'gone')
  assert.equal(radioCallReady(radio, 'porter-first-call', heard, MUSEUM), 'gone', 'heard once')
})

test('a document says "Tab to re-read" only when there is a journal and a Tab', () => {
  assert.equal(archiveFiledKey(false, false), 'archive.filed.noJournal')
  assert.equal(archiveFiledKey(false, true), 'archive.filed.noJournal')
  assert.equal(archiveFiledKey(true, false), 'archive.filed')
  assert.equal(archiveFiledKey(true, true), 'archive.filed.touch')
  assert.ok(!/Tab/.test(ptBR['archive.filed.touch']) && !/Tab/.test(en['archive.filed.touch']))
  assert.ok(!/Tab/.test(ptBR['archive.filed.noJournal']))
})

// ---------------------------------------------------------------------------
// The pointer, the keypad and the look hint (#3, #6, #26)
// ---------------------------------------------------------------------------

test('a click beside a panel never captures the pointer', () => {
  assert.equal(shouldCapturePointer({ button: 0, locked: false, modal: false }), true)
  assert.equal(shouldCapturePointer({ button: 0, locked: false, modal: true }), false)
  assert.equal(shouldCapturePointer({ button: 0, locked: true, modal: false }), false)
  assert.equal(shouldCapturePointer({ button: 2, locked: false, modal: false }), false)
  const controller = source('engine/PlayerController.tsx')
  assert.ok(controller.includes('modal: isModalOpen(useMuseum.getState())'))
})

test('Enter submits the keypad, once, and only a full code', () => {
  assert.deepEqual(lockKeyIntent({ code: 'Enter', repeat: false }), { kind: 'submit' })
  assert.deepEqual(lockKeyIntent({ code: 'NumpadEnter', repeat: false }), { kind: 'submit' })
  assert.equal(lockKeyIntent({ code: 'Enter', repeat: true }), null, 'a held Enter is one press')
  assert.deepEqual(lockKeyIntent({ code: 'Digit1', repeat: false }), { kind: 'digit', digit: '1' })
  assert.deepEqual(lockKeyIntent({ code: 'Numpad9', repeat: true }), { kind: 'digit', digit: '9' })
  assert.deepEqual(lockKeyIntent({ code: 'Backspace', repeat: false }), { kind: 'erase' })
  assert.deepEqual(lockKeyIntent({ code: 'Escape', repeat: false }), { kind: 'close' })
  assert.equal(lockKeyIntent({ code: 'KeyE', repeat: false }), null)
  assert.equal(canSubmitCode('189', 4), false)
  assert.equal(canSubmitCode('1896', 4), true)
})

test('every reader releases the pointer, not only the notebook', () => {
  const containers = source('engine/Containers.tsx')
  assert.ok(!/isNotebook\(container\) && document\.pointerLockElement/.test(containers))
})

test('"Click to look" shows at a free desktop mouse and nowhere else', () => {
  const free = { sceneReady: true, pointerLocked: false, modal: false, coarse: false }
  assert.equal(lookHintVisible(free), true)
  assert.equal(lookHintVisible({ ...free, pointerLocked: true }), false)
  assert.equal(lookHintVisible({ ...free, modal: true }), false)
  assert.equal(lookHintVisible({ ...free, coarse: true }), false)
  assert.equal(lookHintVisible({ ...free, sceneReady: false }), false, 'not over the loading screen')
  assert.equal(ptBR['ui.lookHint'], 'Clique para olhar')
})

test('close buttons name a key only where there is one', () => {
  assert.equal(closeLabel('Fechar', 'Esc', false), 'Fechar · Esc')
  assert.equal(closeLabel('Fechar', 'Tab', false), 'Fechar · Tab')
  assert.equal(closeLabel('Fechar', 'Tab', true), 'Fechar')
  for (const file of ['ui/Hud.tsx', 'ui/Journal.tsx', 'ui/LockPanel.tsx']) {
    assert.ok(!/\{t\('prompt\.close'\)\} · (Esc|Tab)/.test(source(file)), `${file} has no fixed key suffix`)
  }
})

// ---------------------------------------------------------------------------
// Toasts that announce the present, not the save (#7, #18, #23)
// ---------------------------------------------------------------------------

test('a list from the save is never announced, only its growth', () => {
  assert.equal(listGrew(3, 3), false, 'the save, on mount')
  assert.equal(listGrew(3, 4), true)
  assert.equal(listGrew(4, 0), false, 'a new game empties it')
  // The toast of a released door asks this rule of the save's own list: a
  // shortcut opened on another night is not announced again on Continue.
  // (`test:transition-door` holds the rest of that toast's wiring.)
  const hud = source('ui/Hud.tsx')
  assert.ok(hud.includes('useMuseum((state) => state.progress.doorsReleased)'), 'the door toast reads doorsReleased')
  assert.ok(hud.includes('listGrew(seenLength.current, released.length)'), 'and announces only its growth')
})

test('a credential is announced by its name when it is taken, and never because it came with the save (L3)', () => {
  const titles = new Map([
    ['tool:service-key', 'credential.service-key.title'],
    ['medallion:curator', 'credential.curator.title'],
  ])
  const KEY = 'tool:service-key'
  // On mount the save is whole: a key taken on another night is not news.
  assert.deepEqual(credentialsTaken(1, [KEY], titles), [])
  assert.deepEqual(credentialsTaken(0, [], titles), [])
  // Taken now: announced by the name the content gives it.
  assert.deepEqual(credentialsTaken(0, [KEY], titles), ['credential.service-key.title'])
  // Only what is new, in the order it came; two at once are two names.
  assert.deepEqual(credentialsTaken(1, [KEY, 'medallion:curator'], titles), ['credential.curator.title'])
  assert.deepEqual(credentialsTaken(0, [KEY, 'medallion:curator'], titles), ['credential.service-key.title', 'credential.curator.title'])
  // A new game empties the list: nothing is announced by a list that shrank.
  assert.deepEqual(credentialsTaken(2, [], titles), [])
  assert.deepEqual(credentialsTaken(2, [KEY], titles), [])
  // A credential this content does not declare (another build's) has no name to be announced by.
  assert.deepEqual(credentialsTaken(0, ['badge:beach'], titles), [])
  assert.deepEqual(credentialsTaken(0, ['badge:beach', KEY], titles), ['credential.service-key.title'])
  assert.deepEqual(credentialsTaken(0, [KEY], new Map()), [], 'with no credential declared, as in this slice, nothing can be announced')
  // The words: «Você pegou — {nome}».
  assert.equal(ptBR['credential.taken'], 'Você pegou')
  assert.equal(en['credential.taken'], 'You took')
  // What a trigger hands over as the content arrives (the key an open drawer
  // was owed) is in the save before the HUD first looks: `test:locks` plays
  // that load against the store, and the wiring further down holds the HUD
  // to importing the registry that makes it so.
  assert.deepEqual(MUSEUM.credentials ?? [], [])
})

// ---------------------------------------------------------------------------
// A cabinet read one paper at a time (H-35), and a door on a hinge (L3)
// ---------------------------------------------------------------------------

test('a cabinet hands over its papers one at a time, in the order of the content, and E on the last closes it', () => {
  // Archive A of Wing 1: two papers, each a page of its own.
  const archiveA = containerReadQueue(MUSEUM, 'holyoke-cabinet-a')
  assert.deepEqual(archiveA, [
    { documentId: 'doc-invention-date', kind: 'body', titleKey: 'document.invention-date.title', bodyKey: 'document.invention-date.body' },
    { documentId: 'doc-halstead', kind: 'body', titleKey: 'document.halstead.title', bodyKey: 'document.halstead.body' },
  ])
  assert.deepEqual(
    archiveA.map((page) => page.documentId),
    MUSEUM.documents.filter((doc) => doc.containerId === 'holyoke-cabinet-a').map((doc) => doc.id),
    'in the order the content lists them',
  )
  assert.equal(containerReadQueue(MUSEUM, 'holyoke-cabinet-b').length, 1)
  assert.equal(containerReadQueue(MUSEUM, 'office-cabinet').length, 1)
  // A cabinet that holds nothing, one the house does not have, and no cabinet at all.
  assert.deepEqual(containerReadQueue({ documents: [] }, 'holyoke-cabinet-a'), [])
  assert.deepEqual(containerReadQueue(MUSEUM, 'no-such-cabinet'), [])
  assert.deepEqual(containerReadQueue(MUSEUM, null), [])

  // A paper of two pages is two pages, in its own order; a recording is one,
  // and carries its lines; a plain paper after them is one more.
  const [flyleaf, letter] = notebookPagesFor(MUSEUM, 'office-notebook')
  const box = {
    rooms: [{ id: 'hall', containers: [{ id: 'box', part: 'archive-cabinet', position: [0, 0, 0], titleKey: 'container.office.title' }] }],
    documents: [
      { id: 'doc-book', containerId: 'box', titleKey: 'document.welcome.title', bodyKey: 'document.welcome.summary', pages: [flyleaf, letter] },
      { id: 'doc-tape', containerId: 'box', titleKey: 'document.halstead.title', bodyKey: 'document.halstead.body', lineKeys: ['radio.call.hello.1', 'radio.call.hello.2'] },
      { id: 'doc-note', containerId: 'box', titleKey: 'document.predecessor.title', bodyKey: 'document.predecessor.body' },
      { id: 'doc-elsewhere', containerId: 'another', titleKey: 'document.halstead.title', bodyKey: 'document.halstead.body' },
    ],
  } as unknown as Parameters<typeof readerPageCount>[0]
  assert.deepEqual(containerReadQueue(box, 'box'), [
    { documentId: 'doc-book', kind: 'page', titleKey: 'document.welcome.title', page: flyleaf },
    { documentId: 'doc-book', kind: 'page', titleKey: 'document.welcome.title', page: letter },
    { documentId: 'doc-tape', kind: 'transcript', titleKey: 'document.halstead.title', lineKeys: ['radio.call.hello.1', 'radio.call.hello.2'] },
    { documentId: 'doc-note', kind: 'body', titleKey: 'document.predecessor.title', bodyKey: 'document.predecessor.body' },
  ])
  // A transcript is printed as one paragraph: what was said, line after line.
  assert.equal(transcriptText(['Aqui é o Otávio.', 'O último ônibus é o das cinco.']), 'Aqui é o Otávio. O último ônibus é o das cinco.')
  assert.equal(transcriptText([]), '')

  // E turns to the next and, on the last, closes: the rule of the notebook, for every reader.
  assert.equal(readerPageCount(MUSEUM, 'holyoke-cabinet-a'), 2)
  assert.equal(readerAdvance(MUSEUM, 'holyoke-cabinet-a', 0), 1)
  assert.equal(readerAdvance(MUSEUM, 'holyoke-cabinet-a', 1), 'close', 'E on the last paper closes the cabinet')
  assert.equal(readerAdvance(MUSEUM, 'holyoke-cabinet-b', 0), 'close', 'a cabinet with one paper closes at once, as it did')
  assert.deepEqual([0, 1, 2, 3].map((page) => readerAdvance(box, 'box', page)), [1, 2, 3, 'close'])
  // The notebook turns its own pages, as before.
  assert.equal(readerPageCount(MUSEUM, 'office-notebook'), notebookPagesFor(MUSEUM, 'office-notebook').length)
  assert.deepEqual([0, 1, 2].map((page) => readerAdvance(MUSEUM, 'office-notebook', page)), [1, 2, 'close'])
  // A page past the end (a save of nothing: the page is session state) still closes.
  assert.equal(readerAdvance(MUSEUM, 'holyoke-cabinet-a', 7), 'close')
  assert.equal(readerAdvance(MUSEUM, null, 0), 'close')

  // The arrows and the page keys turn without closing, and stop at each end.
  assert.equal(readerKeyPage('ArrowRight', 0, 1), 1)
  assert.equal(readerKeyPage('PageDown', 0, 1), 1)
  assert.equal(readerKeyPage('ArrowRight', 1, 1), 1, 'the last page stays: only E and the button close')
  assert.equal(readerKeyPage('ArrowLeft', 1, 1), 0)
  assert.equal(readerKeyPage('PageUp', 0, 1), 0)
  assert.equal(readerKeyPage('KeyE', 0, 1), null)
  assert.equal(readerKeyPage('Escape', 0, 1), null)

  // Opening the cabinet reads everything in it at once, as it always did:
  // the reader shows one paper at a time, the save does not wait for the
  // second (DL3-9). The record of L2 has this action giving both papers and
  // the fact, and a grant by page would have taken one away.
  assert.deepEqual(containerGrant(MUSEUM, 'holyoke-cabinet-a'), {
    documentsRead: ['doc-invention-date', 'doc-halstead'],
    factsKnown: ['springfield-renaming'],
  })
  const recorded = (JSON.parse(readText(new URL('../docs/releases/L2.graph.json', import.meta.url))) as {
    actions: { id: string; requires: string[]; grants: string[] }[]
  }).actions.find((action) => action.id === 'container:holyoke-cabinet-a')
  assert.deepEqual(recorded?.grants, ['doc:doc-halstead', 'doc:doc-invention-date', 'fact:springfield-renaming'])
  assert.deepEqual(contentActions(MUSEUM).find((action) => action.id === 'container:holyoke-cabinet-a'), recorded, 'word for word what L2 wrote down')
  // And the store starts every cabinet on its first paper.
  useMuseum.getState().setOpenedContainer('holyoke-cabinet-a')
  useMuseum.getState().setNotebookPage(1)
  useMuseum.getState().setOpenedContainer(null)
  useMuseum.getState().setOpenedContainer('holyoke-cabinet-a')
  assert.equal(useMuseum.getState().notebookPage, 0)
  useMuseum.getState().setOpenedContainer(null)
})

test('a door swings on its hinge without moving a node, and what stands behind it shows only while it is open', () => {
  // A safe made for the test, placed and turned as a container is: a body,
  // a door of two families, a paper on the shelf, hardware that stays put.
  const placed = new Group()
  placed.position.set(2.55, 0, 2.45)
  placed.rotation.y = -Math.PI / 2
  const assembly = new Group()
  placed.add(assembly)
  const names = ['test-safe', 'test-safe__hardware', 'test-safe__door', 'test-safe__door-hardware', 'test-safe__papers']
  for (const [index, name] of names.entries()) {
    const node = new Mesh()
    node.name = name
    // A quantisation compensation of its own, as every baked node has.
    node.position.set(0.11 + 0.013 * index, 0.2 + 0.07 * index, -0.05 + 0.021 * index)
    node.scale.setScalar(0.6 + index * 0.05)
    assembly.add(node)
  }
  const world = () => {
    placed.updateMatrixWorld(true)
    return names.map((name) => assembly.getObjectByName(name)!.getWorldPosition(new Vector3()))
  }
  const before = world()
  const sum = (points: readonly Vector3[]) => points.reduce((total, point) => total.add(point), new Vector3())
  const hinge = { nodePrefix: 'door', hingeAt: [0.31, 0.27] as [number, number], openAngle: -1.75 }

  const door = prepareContainerDoor(assembly, 'test-safe', hinge)
  assert.ok(door)
  assert.deepEqual(door.children.map((child) => child.name), ['test-safe__door', 'test-safe__door-hardware'], 'every family that begins with the prefix')
  assert.equal(prepareContainerDoor(assembly, 'test-safe', hinge), door, 'idempotent under StrictMode')
  assert.equal(door.children.length, 2)
  const contents = prepareContainerContents(assembly, 'test-safe', [{ node: 'papers' }])
  assert.ok(contents)
  assert.deepEqual(contents.children.map((child) => child.name), ['test-safe__papers'])
  assert.equal(prepareContainerContents(assembly, 'test-safe', [{ node: 'papers' }]), contents, 'idempotent too')
  assert.deepEqual(
    assembly.children.map((child) => child.name),
    ['test-safe', 'test-safe__hardware', door.name, contents.name],
    'the body and its hardware stay where they were',
  )
  // Gathered, and shut: no node is anywhere but where the bake put it.
  swingContainerDoor(door, 0)
  const gathered = world()
  for (const [index, name] of names.entries()) {
    assert.ok(gathered[index].distanceTo(before[index]) < 1e-12, `${name} moved when the door was put on its hinge`)
  }
  assert.ok(sum(gathered).distanceTo(sum(before)) < 1e-12)

  // Open: the door's nodes turn about the hinge, each at the distance from
  // it that it had, at the height it had; nothing else moves.
  swingContainerDoor(door, hinge.openAngle)
  const open = world()
  placed.updateMatrixWorld(true)
  const hingeWorld = assembly.localToWorld(new Vector3(hinge.hingeAt[0], 0, hinge.hingeAt[1]))
  const fromHinge = (point: Vector3) => Math.hypot(point.x - hingeWorld.x, point.z - hingeWorld.z)
  for (const [index, name] of names.entries()) {
    const swung = name.startsWith('test-safe__door')
    assert.equal(open[index].distanceTo(before[index]) > 0.05, swung, `${name} ${swung ? 'did not swing' : 'moved with the door'}`)
    assert.ok(Math.abs(open[index].y - before[index].y) < 1e-12, `${name} kept its height`)
    assert.ok(Math.abs(fromHinge(open[index]) - fromHinge(before[index])) < 1e-12, `${name} turned about the hinge`)
  }
  // And shut again it is back to the bake, to the last digit that matters.
  swingContainerDoor(door, 0)
  const shut = world()
  for (const [index, name] of names.entries()) assert.ok(shut[index].distanceTo(before[index]) < 1e-12, `${name} came back`)
  swingContainerDoor(null, 1)

  // What is behind the door shows with the container open and is hidden with
  // it shut: by a group, so the ray that finds a hidden mesh still rejects it.
  const papers = assembly.getObjectByName('test-safe__papers') as Mesh
  showContainerContents(contents, false)
  papers.visible = true
  assert.equal(hiddenInScene(papers), true, 'behind a shut door the paper is not aimed at')
  assert.equal(hiddenInScene(assembly.getObjectByName('test-safe') ?? null), false)
  showContainerContents(contents, true)
  assert.equal(hiddenInScene(papers), false)
  showContainerContents(null, true)

  // A recipe with no such nodes has no door and no contents to prepare.
  assert.equal(prepareContainerDoor(new Group(), 'test-safe', hinge), null)
  assert.equal(prepareContainerContents(new Group(), 'test-safe', [{ node: 'papers' }]), null)
  // Nor one whose nodes are not the ones named: a content names its node whole.
  const other = new Group()
  for (const name of ['test-safe', 'test-safe__papers-clip']) {
    const node = new Mesh()
    node.name = name
    other.add(node)
  }
  assert.equal(prepareContainerContents(other, 'test-safe', [{ node: 'papers' }]), null, 'a content is one node, not every family that begins like it')
  assert.equal(prepareContainerContents(other, 'test-safe', []), null)
  assert.equal(prepareContainerDoor(other, 'test-safe', hinge), null)

  // The swing: from shut to open in the time it takes, never past either
  // end, whichever way the hinge turns and however long the frame was.
  for (const openAngle of [-1.75, 1.2]) {
    let angle = 0
    const steps: number[] = []
    for (let frame = 0; frame < 200 && angle !== openAngle; frame += 1) {
      angle = doorAngleAfter(angle, openAngle, openAngle, 1 / 60)
      steps.push(angle)
    }
    assert.equal(angle, openAngle, 'it arrives exactly')
    assert.ok(Math.abs(steps.length / 60 - CONTAINER_DOOR_SECONDS) < 0.05, `open in ${(steps.length / 60).toFixed(2)} s`)
    assert.ok(steps.every((step) => Math.abs(step) <= Math.abs(openAngle) && Math.sign(step) === Math.sign(openAngle)), 'never past the stop')
    assert.ok(steps.every((step, index) => index === 0 || Math.abs(step) > Math.abs(steps[index - 1])), 'and always on')
    assert.equal(doorAngleAfter(0, openAngle, openAngle, 5), openAngle, 'a frozen tab comes back to a door that is open, not past it')
    assert.equal(doorAngleAfter(openAngle, 0, openAngle, 5), 0)
    assert.equal(doorAngleAfter(openAngle / 2, openAngle, openAngle, 0), openAngle / 2, 'no time, no movement')
    assert.equal(doorAngleAfter(openAngle, openAngle, openAngle, 1), openAngle)
  }
  assert.equal(doorAngleAfter(0.3, 0, 0, 1), 0, 'a door that opens by nothing is where it is told to be')
})

test('the components ask those rules: the voice, the reader, the hinge and the toast of a credential (L3)', () => {
  assert.deepEqual(officeAnswersWiringProblems(source), [])
  const changed = (path: string, from: string | RegExp, to: string) => (asked: string) => {
    if (asked !== path) return source(asked)
    const next = source(asked).replace(from, to)
    assert.notEqual(next, source(asked), `the refactor of ${path} found nothing to change`)
    return next
  }
  const refactors: readonly (readonly [string, (path: string) => string])[] = [
    // The voice: the press, what a recording files, the lamp.
    ['E on a voice that is taken and says nothing', changed('engine/Devices.tsx', 'return operateVoice(deviceId)', 'return true')],
    ['a voice that decides what E does apart from its prompt', changed('engine/voiceDevice.ts', 'deviceIntent(device, deviceInputOf(device, state, content))', "({ kind: 'voice', intent: 'play' } as const)")],
    ['a voice that starts over when asked to move on', changed('engine/voiceDevice.ts', "if (intent.intent === 'skip') {", "if (intent.intent === 'never') {")],
    ['a recording played and never filed', changed('engine/voiceDevice.ts', '{ grantOnEnd: recordingGrant(content, utterance.documentId) }', '{}')],
    ['a recording filed whether or not it was heard out', changed('state/store.ts', 'heardOut && radio.grantOnEnd ? radio.grantOnEnd : {}', 'radio.grantOnEnd ?? {}')],
    ['the end of a transmission that files nothing', changed('state/store.ts', 'grantProgress(grantProgress(progress, heard), filed)', 'grantProgress(progress, heard)')],
    ['a lamp that blinks by a rule of its own', changed('engine/Devices.tsx', 'messageLampLit(device, deviceInputOf(device, useMuseum.getState(), MUSEUM), clock.elapsedTime)', 'clock.elapsedTime % 1 < 0.5')],
    ['a lamp that is green for a message', changed('engine/Devices.tsx', "lit ? 'led-red' : 'led-off'", "lit ? 'led-green' : 'led-off'")],
    ['a voice whose lamp nobody paints', changed('engine/Devices.tsx', "{device.kind === 'voice' && device.messageLamp ? (", "{device.kind === 'voice' && false ? (")],
    // The porter, cut off by a voice that took the air: owed, and delivered again.
    ['a director that asks only when the save changes', changed('engine/Devices.tsx', '}, [onAir, progress])', '}, [progress])')],
    ['a director that does not watch the air', changed('engine/Devices.tsx', 'const onAir = useMuseum((state) => state.radio !== null)', 'const onAir = false')],
    ['a call scheduled again while it is being said', changed('engine/Devices.tsx', ' || useMuseum.getState().radio?.callId === call.id) continue', ') continue')],
    // The reader.
    ['E that closes a cabinet from its first paper', changed('engine/Containers.tsx', 'const next = readerAdvance(MUSEUM, state.openedContainer, state.notebookPage)', "const next = 'close' as number | 'close'")],
    ['a reader that lists the papers by itself', changed('ui/Hud.tsx', 'containerReadQueue(MUSEUM, openedContainer)', 'MUSEUM.documents.filter((doc) => doc.containerId === openedContainer)')],
    ['a reader that draws every paper at once', changed('ui/Hud.tsx', 'const current = queue[shown]', 'const current = queue[0]')],
    ['arrow keys that turn only the notebook', changed('ui/Hud.tsx', 'useReaderKeys(queue.length > 0, lastPage)', 'void lastPage')],
    ['keys decided in the hook', changed('ui/useReaderKeys.ts', 'readerKeyPage(event.code, state.notebookPage, lastPage)', "event.code === 'ArrowRight' ? state.notebookPage + 1 : null")],
    ['a notebook with keys of its own again', changed('ui/Notebook.tsx', 'useReaderKeys(Boolean(openedContainer) && pages.length > 0, lastPage)', 'void lastPage')],
    ['a reader with no button for the next paper', changed('ui/Hud.tsx', "{t('reader.next')} →", "{t('prompt.close')}")],
    ['a recording filed and shown as its summary, in the reader', changed('ui/Hud.tsx', 'transcriptText(', 'String(')],
    ['a recording filed and shown as its summary, in the archive', changed('ui/Journal.tsx', 'transcriptText(', 'String(')],
    // The hinge.
    ['a cabinet open by a rule of its own', changed('engine/Containers.tsx', 'containerOpen(container, state.progress)', 'container.lockId === undefined')],
    ['a door never put on its hinge', changed('engine/Containers.tsx', 'prepareContainerDoor(instance, container.part, container.door)', 'null')],
    ['a door that swings while its lock is shut', changed('engine/Containers.tsx', 'const target = open ? container.door.openAngle : 0', 'const target = container.door.openAngle')],
    ['a hinge that is never turned', changed('engine/Containers.tsx', 'swingContainerDoor(door, angle)', 'void angle')],
    ['what a safe holds, drawn through its shut door', changed('engine/Containers.tsx', 'showContainerContents(contents, open)', 'showContainerContents(contents, true)')],
    // The toast.
    ['a toast for a credential that came with the save', changed('ui/Hud.tsx', 'credentialsTaken(seenLength.current, credentials, credentialTitles)', 'credentialsTaken(0, credentials, credentialTitles)')],
    ['a credential named by the component', changed('ui/Hud.tsx', '[credentialKey(entry.credential), entry.titleKey]', "[credentialKey(entry.credential), 'credential.taken']")],
    ['a toast nobody mounts', changed('ui/Hud.tsx', /\n\s*<CredentialToast \/>/, '')],
    ['a HUD that may see the save before the content settled it', changed('ui/Hud.tsx', /import '\.\.\/engine\/contentRegistry'\n/, '')],
  ]
  const uncaught = refactors.filter(([, reader]) => officeAnswersWiringProblems(reader).length === 0).map(([name]) => name)
  assert.deepEqual(uncaught, [], 'a refactor this check exists to catch went through')
})

test('the journal lesson is shown once ever, after the notebook closes', () => {
  assert.equal(shouldAnnounceJournal({ unlocked: true, reading: false, alreadyShown: false }), true)
  assert.equal(shouldAnnounceJournal({ unlocked: true, reading: true, alreadyShown: false }), false)
  assert.equal(shouldAnnounceJournal({ unlocked: false, reading: false, alreadyShown: false }), false)
  assert.equal(shouldAnnounceJournal({ unlocked: true, reading: false, alreadyShown: true }), false)

  // The flag lives in the save: a reload with the notebook open still owes
  // the lesson, and one after it never repeats it. (The legacy save loaded
  // above was handed the lesson already; this is a current one owing it.)
  useMuseum.setState((state) => ({ progress: { ...state.progress, hintsShown: [] } }))
  const owing = migrateProgress(JSON.parse(JSON.stringify(useMuseum.getState().progress)))
  assert.deepEqual(owing.hintsShown, [], 'still owed after a reload with the notebook open')
  useMuseum.getState().recordHint('journal-taken')
  useMuseum.getState().recordHint('journal-taken')
  assert.deepEqual(useMuseum.getState().progress.hintsShown, ['journal-taken'])
  const reloaded = migrateProgress(JSON.parse(JSON.stringify(useMuseum.getState().progress)))
  assert.deepEqual(reloaded.hintsShown, ['journal-taken'])
})

// ---------------------------------------------------------------------------
// The clock keeps the night's time (#10, #20)
// ---------------------------------------------------------------------------

test('the clock resumes from the elapsed time in the save', () => {
  const clock = MUSEUM.rooms.flatMap((room) => room.devices ?? []).find((d) => d.kind === 'clock')
  assert.ok(clock && clock.kind === 'clock')
  const saved = progressWith({ clockSeconds: { [clock.id]: 600 } })
  assert.equal(savedClockSeconds(saved, clock.id), 600)
  assert.deepEqual(clockTimeAfter(clock.stoppedAt, savedClockSeconds(saved, clock.id)), {
    hours: 16,
    minutes: 57,
    seconds: 0,
  })
  assert.equal(savedClockSeconds(progressWith(), clock.id), 0, 'no save: the storm minute')
})

test('the clock counts play time and never catches up on an absence', () => {
  assert.equal(advanceClockSeconds(10, 0.016), 10.016)
  assert.equal(advanceClockSeconds(10, 3600), 10 + CLOCK_MAX_STEP_SECONDS, 'a hidden hour is one frame')
  assert.equal(advanceClockSeconds(10, -1), 10)
  assert.equal(advanceClockSeconds(10, Number.NaN), 10)
})

test('the clock writes whole seconds, and only when they change', () => {
  const store = useMuseum.getState()
  store.recordClockSeconds('office-clock', 61.9)
  const first = useMuseum.getState().progress
  assert.equal(first.clockSeconds['office-clock'], 61)
  useMuseum.getState().recordClockSeconds('office-clock', 61.2)
  assert.equal(useMuseum.getState().progress, first, 'the same second is not a new save')
})

// ---------------------------------------------------------------------------
// Saves that survive a phone (#22) and a new game (#12, #17)
// ---------------------------------------------------------------------------

test('the save is forced to disk when the page is hidden, not only on pagehide', () => {
  const page = new EventTarget()
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState })
  let flushed = 0
  const unbind = bindSaveFlush({ window: page, document: doc }, () => {
    flushed += 1
  })
  doc.dispatchEvent(new Event('visibilitychange'))
  assert.equal(flushed, 0, 'becoming visible writes nothing')
  doc.visibilityState = 'hidden'
  doc.dispatchEvent(new Event('visibilitychange'))
  assert.equal(flushed, 1)
  page.dispatchEvent(new Event('pagehide'))
  assert.equal(flushed, 2)
  unbind()
  doc.dispatchEvent(new Event('visibilitychange'))
  page.dispatchEvent(new Event('pagehide'))
  assert.equal(flushed, 2, 'unbound with the module on hot reload')
})

test('"New game" appears only with real progress and needs two clicks', () => {
  assert.equal(hasSavedProgress(progressWith()), false)
  assert.equal(
    hasSavedProgress(progressWith({ roomsVisited: [MUSEUM.spawn.room] })),
    false,
    'clicking Enter once is not a save worth erasing',
  )
  assert.equal(hasSavedProgress(progressWith({ roomsVisited: ['atrium'] })), true)
  assert.equal(hasSavedProgress(progressWith({ documentsRead: ['doc-welcome'] })), true)
  assert.equal(hasSavedProgress(progressWith({ radioCalls: ['porter-first-call'] })), true)
  assert.equal(newGameClick(false), 'arm')
  assert.equal(newGameClick(true), 'erase')
  const app = source('MuseumApp.tsx')
  assert.ok(!app.includes('window.confirm'), 'no blocking dialog in the entering gesture')
})

test('a new game empties progress and every session field, and writes at once', () => {
  let contributed = 0
  const stopContributing = contributeToSave(() => {
    contributed += 1
  })
  useMuseum.setState({
    currentRoom: 'atrium',
    previousRoom: 'office',
    visibleRooms: ['atrium', 'holyoke'],
    flashlightOn: true,
    flashlightUsed: true,
    openedContainer: 'office-notebook',
    activeLock: 'office-drawer',
    examining: 'ball-spalding',
    focusedExhibit: 'ball-spalding',
    focusedContainer: 'office-notebook',
    focusedContainerDistance: 1,
    focusedPowerControl: 'office-lamp-switch',
    focusedDevice: 'office-radio',
    notebookPage: 2,
    journalTab: 'map',
    touchMove: { x: 1, y: 0 },
    radio: { serial: 9, deviceId: 'office-radio', speakerKey: 'radio.speaker.porter', lineKeys: ['a'], index: 0 },
    radioHungUpUntil: Date.now() + 9000,
  })
  const settings = useMuseum.getState().settings
  writes.length = 0
  useMuseum.getState().resetProgress()
  stopContributing()

  const state = useMuseum.getState()
  assert.deepEqual(state.progress, { ...EMPTY_PROGRESS })
  assert.notEqual(state.progress.catalogued, EMPTY_PROGRESS.catalogued, 'a fresh list, not the constant')
  assert.equal(state.settings, settings, 'settings are the player’s and survive')
  assert.equal(state.currentRoom, MUSEUM.spawn.room)
  assert.equal(state.previousRoom, null)
  assert.deepEqual(state.visibleRooms, [MUSEUM.spawn.room])
  assert.equal(state.flashlightOn, false)
  assert.equal(state.flashlightUsed, false)
  for (const field of [
    'openedContainer',
    'activeLock',
    'examining',
    'focusedExhibit',
    'focusedContainer',
    'focusedPowerControl',
    'focusedDevice',
    'journalTab',
    'radio',
    'radioHungUpUntil',
  ] as const) {
    assert.equal(state[field], null, field)
  }
  assert.equal(state.focusedContainerDistance, Number.POSITIVE_INFINITY)
  assert.equal(state.notebookPage, 0)
  assert.deepEqual(state.touchMove, { x: 0, y: 0 })
  assert.deepEqual(writes, [STORAGE_KEY], 'flushed now, not on the next idle callback')
  assert.equal(contributed, 1, 'running systems put their state in first')
  const disk = JSON.parse(storage.get(STORAGE_KEY) ?? '{}')
  assert.deepEqual(disk.progress.catalogued, [], 'a reload cannot bring the old save back')
})

test('"New game" is the one write that goes over a newer save, and it marks the game as another', () => {
  // Another tab has played on since this one last wrote. This case used to
  // ask that a tab with nothing new wrote nothing, and used "New game" to
  // force the flush, there being no page to hide in this suite: it passed
  // because an empty save reset to empty had nothing to write. That rule now
  // lives where a tab can be hidden (`test:save`, the two tabs), with the
  // one beside it: a tab reads the disk before it writes, and joins what it
  // finds. "New game" is the exception, and is held here: it erases what the
  // other tab wrote, on purpose, and leaves a mark, so that a tab still
  // holding the erased game does not join it back in.
  const newer = JSON.stringify({ settings: { brightness: 1.3 }, progress: { ...EMPTY_PROGRESS, catalogued: ['ball-spalding'] } })
  storage.set(STORAGE_KEY, newer)
  writes.length = 0
  useMuseum.getState().resetProgress()
  assert.deepEqual(writes, [STORAGE_KEY], 'a new game waited for something else to write it')
  const disk = JSON.parse(storage.get(STORAGE_KEY) ?? '{}')
  assert.deepEqual(disk.progress, { ...EMPTY_PROGRESS }, 'the game the other tab was playing is still on the disk')
  assert.deepEqual(useMuseum.getState().progress, { ...EMPTY_PROGRESS })
  assert.ok(typeof disk.game === 'string' && disk.game.length > 0, 'a new game is not marked as one')
  // The settings the other tab chose are the player's, not the game's.
  assert.equal(disk.settings.brightness, 1.3)
  assert.equal(useMuseum.getState().settings.brightness, 1.3)
})

// ---------------------------------------------------------------------------
// Audio after an interruption (#21)
// ---------------------------------------------------------------------------

test('a suspended or interrupted context resumes on the next gesture', () => {
  let resumes = 0
  let oscillators = 0
  const node = () => ({
    gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
    frequency: { value: 0 },
    connect() {},
    start() {},
    stop() {},
  })
  const context = {
    state: 'running' as string,
    sampleRate: 8,
    currentTime: 0,
    destination: {},
    onstatechange: null as (() => void) | null,
    resume() {
      resumes += 1
      return Promise.resolve()
    },
    close() {
      return Promise.resolve()
    },
    createGain: node,
    createConvolver: () => ({ buffer: null, connect() {} }),
    createOscillator: () => {
      oscillators += 1
      return node()
    },
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
  }
  const gestures = new EventTarget()
  const visibility = Object.assign(new EventTarget(), {
    visibilityState: 'visible' as DocumentVisibilityState,
  })
  const audio = new MuseumAudio(() => ({
    createContext: () => context as unknown as AudioContext,
    gestures,
    visibility,
  }))
  audio.unlock()

  audio.chime()
  assert.equal(oscillators, 2, 'a running context plays')
  context.state = 'interrupted'
  audio.chime()
  assert.equal(oscillators, 2, 'nothing is queued on an interrupted context')

  gestures.dispatchEvent(new Event('touchend'))
  assert.equal(resumes, 1, 'the next tap resumes it')
  gestures.dispatchEvent(new Event('keydown'))
  assert.equal(resumes, 2, 'every gesture tries, not only the first')

  visibility.visibilityState = 'hidden'
  visibility.dispatchEvent(new Event('visibilitychange'))
  assert.equal(resumes, 2, 'a hidden page does not try')
  visibility.visibilityState = 'visible'
  visibility.dispatchEvent(new Event('visibilitychange'))
  assert.equal(resumes, 3, 'coming back to the page tries')
  context.onstatechange?.()
  assert.equal(resumes, 4, 'an interruption ending while visible tries')

  context.state = 'running'
  gestures.dispatchEvent(new Event('click'))
  assert.equal(resumes, 4, 'a running context is left alone')

  audio.dispose()
  context.state = 'suspended'
  gestures.dispatchEvent(new Event('pointerup'))
  visibility.dispatchEvent(new Event('visibilitychange'))
  assert.equal(resumes, 4, 'disposed audio stops listening')
  assert.equal(context.onstatechange, null, 'and lets go of its context')

  // A module replaced in place during development must not leave its
  // listeners behind, nor a silent game that nothing can unlock again.
  const audioSource = source('engine/audio.ts')
  const hot = audioSource.slice(audioSource.indexOf('import.meta.hot?.dispose('))
  assert.ok(hot.includes('museumAudio.dispose()') && hot.includes('location.reload()'))
})

// ---------------------------------------------------------------------------
// The journal's map (#11)
// ---------------------------------------------------------------------------

test('a doorway is drawn along its wall, as wide as the door', () => {
  const eastWest = portalOpening(100, 50, 16, Math.PI / 2)
  assert.ok(Math.abs(eastWest.gap.x1 - eastWest.gap.x2) < 1e-9, 'an east or west door runs north-south')
  assert.ok(Math.abs(Math.abs(eastWest.gap.y2 - eastWest.gap.y1) - 16) < 1e-9, 'its full width')
  for (const jamb of eastWest.jambs) {
    assert.ok(Math.abs(jamb.y1 - jamb.y2) < 1e-9, 'the jambs cross the wall')
  }
  const northSouth = portalOpening(100, 50, 12, 0)
  assert.ok(Math.abs(northSouth.gap.y1 - northSouth.gap.y2) < 1e-9)
  assert.ok(Math.abs(Math.abs(northSouth.gap.x2 - northSouth.gap.x1) - 12) < 1e-9)

  for (const room of MUSEUM.rooms) {
    for (const portal of room.portals) {
      const opening = portalOpening(0, 0, portal.width, portal.rotationY)
      const length = Math.hypot(opening.gap.x2 - opening.gap.x1, opening.gap.y2 - opening.gap.y1)
      assert.ok(Math.abs(length - portal.width) < 1e-9, `${portal.id} is as wide as its door`)
    }
  }
})

// ---------------------------------------------------------------------------
// Content the gate now reads (#24) and the drawer's code
// ---------------------------------------------------------------------------

test('a broken key in any content collection fails the translation gate', () => {
  const keys = new Set(Object.keys(ptBR))
  assert.deepEqual(validateTranslations(MUSEUM, keys), [])
  const broken = {
    ...MUSEUM,
    facts: MUSEUM.facts.map((fact) =>
      fact.id === 'springfield-renaming' ? { ...fact, claimKey: 'fact.springfield-renamng.claim' } : fact,
    ),
  }
  const issues = validateTranslations(broken, keys)
  assert.ok(
    issues.some((issue) => issue.code === 'missing-translation' && issue.message.startsWith('facts[')),
    'the keypad question is checked',
  )
})

const LOCALES = [
  ['pt-BR', ptBR as Record<string, string>],
  ['en', en as Record<string, string>],
] as const

test('the office drawer code is printed where the lock points, and nowhere else', () => {
  for (const lock of MUSEUM.locks) {
    if (lock.kind !== 'knowledge') continue
    const fact = MUSEUM.facts.find((candidate) => candidate.id === lock.factId)
    const exhibit = MUSEUM.exhibits.find((candidate) => candidate.id === lock.sourceExhibitId)
    assert.ok(fact && exhibit)
    // The hotspot that teaches the fact is the text the player is reading at
    // the moment they learn it.
    const teaching = exhibit.hotspots.find((hotspot) => hotspot.revealsFactId === fact.id)
    assert.ok(teaching, `${exhibit.id} has a hotspot that reveals ${fact.id}`)
    // A code the player can pick up from any label in the wing is not a code
    // they found. The year stays on the plaque and on the title of the one
    // document that reveals the same fact; the catalogue entry used to repeat
    // it, and so did two other cards.
    //
    // The fact says so itself now (`printedIn`), and the numeral lint holds
    // every code to what its fact says (`test:lints`). What stays here is
    // what the lint cannot know: that the two keys the fact names are the
    // ones the lock points at, the plaque the player is reading as they learn
    // the year and the title of the document that reveals it.
    const allowed = [...(fact.printedIn ?? [])].sort()
    assert.deepEqual(
      allowed,
      [
        teaching.labelKey,
        ...MUSEUM.documents.filter((doc) => doc.revealsFactId === fact.id).map((doc) => doc.titleKey),
      ].sort(),
      `${fact.id}: printedIn names the plaque and the document title, and nothing else`,
    )
    assert.equal(allowed.length, 2, 'the plaque and one document title')
    assert.equal(fact.exception, 'tutorial', 'two keys are the tutorial exception')
    for (const [locale, dictionary] of LOCALES) {
      assert.ok(dictionary[teaching.labelKey].includes(fact.value), `${locale}: the plaque shows ${fact.value}`)
      const printedOn = Object.keys(dictionary)
        .filter((key) => dictionary[key].includes(fact.value))
        .sort()
      assert.deepEqual(printedOn, allowed, `${locale}: ${fact.value} is printed on exactly these keys`)
    }
  }
  // The porter's drawer hint names the same exhibit.
  // (At its second height, and curt: where the year is is what the hint is for.)
  for (const key of ['radio.hint.drawer.what', 'radio.hint.drawer.curt'] as const) {
    assert.ok(ptBR[key].includes('Morgan') && en[key].includes('Morgan'), key)
  }
  assert.equal(radio.hints.find((hint) => hint.heightKeys[0] === 'radio.hint.drawer.where')?.targetId, 'portrait-morgan')
})

// ---------------------------------------------------------------------------
// The history the wing prints (front 12 of the plan)
// ---------------------------------------------------------------------------

type Wording = string | RegExp
type TextRule = {
  readonly keys: readonly (keyof typeof ptBR)[]
  /** Each pair is [pt-BR, en]; a string is a case-sensitive fragment. */
  readonly has?: readonly (readonly [Wording, Wording])[]
  readonly lacks?: readonly (readonly [Wording, Wording])[]
}
const both = (wording: Wording) => [wording, wording] as const
const says = (text: string, wording: Wording) =>
  typeof wording === 'string' ? text.includes(wording) : wording.test(text)

/**
 * One line per correction the fact check asked for. Each of them was a claim
 * the game made on a wall with no source behind it, or with the source saying
 * something else; the rule pins the corrected wording in both languages so a
 * later rewrite cannot bring the old one back.
 */
const HISTORY_RULES: readonly TextRule[] = [
  {
    // He left the YMCA in 1897, not 1900; the day of his death and the
    // occasion of the renaming are where the sources part, so neither is given.
    keys: ['exhibit.portrait-morgan.catalogue'],
    has: [both('1897'), both('Springfield')],
    lacks: [both('1900'), both('1896'), ['julho', 'July'], ['27 de dezembro', '27 December']],
  },
  { keys: ['exhibit.portrait-morgan.label'], has: [both('1895')], lacks: [both('1891')] },
  {
    // The plaque states the year and the town, never the contested occasion.
    keys: ['hotspot.portrait-morgan.date.label'],
    has: [both('1896'), both('Springfield')],
    lacks: [['demonstra', 'demonstration'], both('1895')],
  },
  {
    keys: ['exhibit.net-1897.label'],
    has: [['logo acima da cabeça', 'just above the head']],
    lacks: [['meio pé', 'half a foot']],
  },
  { keys: ['exhibit.guide-1916.title'], has: [both('Morgan')], lacks: [[/bomba/i, /bomb/i]] },
  {
    keys: ['exhibit.guide-1916.label', 'exhibit.guide-1916.catalogue', 'hotspot.guide-1916.credit.label'],
    has: [both('Woods')],
    lacks: [both(/\bWood\b/), both(/bomberino/i), ['forçou', 'forced']],
  },
  {
    // A wall label carries what two publishers say: that Woods and Lynch
    // helped with the first rules (the federation and the Hall of Fame). That
    // Morgan wrote it up in the guide rests on the Hall of Fame alone, so it
    // is said in the catalogue entry and on the detail, not here.
    keys: ['exhibit.guide-1916.label'],
    has: [['ajudaram Morgan', 'helped Morgan']],
    lacks: [[/contou|creditou|deu crédito/i, /\btold\b|credited/i]],
  },
  {
    keys: ['hotspot.guide-1916.census.label'],
    has: [[/estimativa/i, /estimate/i]],
    lacks: [[/censo/i, /census/i]],
  },
  {
    keys: ['exhibit.handbook-1897.title', 'fact.first-rulebook.claim'],
    has: [['manual oficial', 'official handbook']],
    lacks: [[/regulamento/i, /rulebook/i]],
  },
  {
    keys: ['exhibit.handbook-1897.catalogue'],
    has: [both('1952'), ['associação americana', 'American association']],
    lacks: [both('1896')],
  },
  {
    // The label lists what the photograph shows. The horse in it has no
    // pommels: the first rewrite named an apparatus that is not in the frame.
    keys: ['exhibit.photo-gym.label'],
    has: [['publicada em 1897', 'published in 1897'], ['cavalo de salto', 'vaulting horse']],
    lacks: [
      ['treliças', 'trusses'],
      both('High'),
      both('Appleton'),
      ['fotografado', 'photographed'],
      ['com alças', 'pommel'],
    ],
  },
  { keys: ['exhibit.photo-gym.catalogue'], has: [both('1943')], lacks: [both('1886'), both('1896')] },
  {
    // No catalogue has been opened and captured, so the suit carries no date
    // on either card (7.7 holds the date until one is).
    keys: ['exhibit.gym-suit.label', 'exhibit.gym-suit.catalogue'],
    lacks: [
      both('1901'),
      [/\bsolas?\b/i, /\bsoles?\b/i],
      [/óxido/i, /oxide/i],
      [/vitoriano/i, /victorian/i],
      ['suor', 'sweat'],
    ],
  },
  {
    // What the members of 1895 wore is an inference of the research, with no
    // photograph behind it: the label says the museum does not know.
    keys: ['exhibit.gym-suit.label'],
    has: [['não sabe', 'does not know']],
    lacks: [['jogavam', 'played in'], ['pelo que se sabe', 'as far as is known']],
  },
  {
    // "The wind of his members" was a calque of «fôlego».
    keys: ['exhibit.gym-suit.catalogue'],
    has: [['fôlego', 'stamina']],
    lacks: [both(/\bwind\b/)],
  },
  {
    keys: ['exhibit.ball-improvised.label', 'exhibit.ball-improvised.catalogue'],
    has: [[/leve e lenta demais/i, /too light and too slow/i]],
    lacks: [['boiava', 'floated'], [/mole demais/i, /too soft/i], [/primeiro objeto/i, /first object/i]],
  },
  {
    keys: ['exhibit.ball-spalding.label'],
    has: [['25 a 27', '25 to 27']],
    lacks: [['Cerca de 25', 'Roughly 25']],
  },
  {
    keys: ['exhibit.ball-spalding.catalogue'],
    has: [['anos 1920', '1920s']],
    lacks: [['anos 1930', '1930s'], both('c. 1900–1920')],
  },
  {
    keys: ['document.rule-changes.body'],
    has: [both('1922')],
    lacks: [both(/\b21\b/), both(/\b15\b/), ['até hoje', 'to this day'], ['As três', 'All three']],
  },
  {
    // The Hall of Fame infers the month; it does not state it.
    keys: ['document.invention-date.body'],
    has: [['Hall da Fama', "Hall of Fame's reckoning"]],
    lacks: [['situa', 'places the invention']],
  },
  {
    // Both sources have Gulick INVITE Morgan to demonstrate; neither says who
    // called the conference.
    keys: ['document.halstead.body'],
    has: [['divergem', 'disagree'], ['a convite de', 'at the invitation of']],
    lacks: [both('1896'), ['convocada', 'convened']],
  },
  { keys: ['sign.atrium.eyebrow'], has: [['O JOGO DESDE 1895', 'THE GAME SINCE 1895']] },
  {
    keys: ['exhibit.atrium-ball-colour-1998.label', 'hotspot.atrium-ball-colour-1998.seam.label'],
    lacks: [[/costurados à mão/i, /hand-stitched/i]],
  },
  {
    keys: ['exhibit.atrium-ball-eight-panel-2008.title'],
    has: [['covinhas', 'dimpled']],
    lacks: [['milhares', 'thousands']],
  },
  {
    keys: ['hotspot.atrium-ball-tokyo-1964.seam.label'],
    has: [[/canal/i, /channel/i]],
    lacks: [[/costura/i, /seam/i]],
  },
  {
    // Whether the 1964 and 1998 balls were stitched or glued is an open
    // source question (7.7): none of their cards may presume a seam. The
    // catalogue entry of the Tokyo ball was left saying «costuras amareladas»
    // when its label and its detail were corrected.
    keys: [
      'exhibit.atrium-ball-tokyo-1964.label',
      'exhibit.atrium-ball-tokyo-1964.catalogue',
      'exhibit.atrium-ball-colour-1998.catalogue',
    ],
    lacks: [[/costura/i, /\bseams?\b/i]],
  },
  { keys: ['exhibit.atrium-ball-laced.label'], lacks: [both('1918'), both('1925')] },
  {
    // The same clue in both languages: English had shortened it to four.
    keys: ['radio.patience.t3.crossword'],
    has: [['cinco letras', 'five letters']],
    lacks: [both('four letters')],
  },
]

test('every correction of the fact check is on the wall, in both languages', () => {
  const wrong: string[] = []
  for (const rule of HISTORY_RULES) {
    for (const key of rule.keys) {
      LOCALES.forEach(([locale, dictionary], column) => {
        const text = dictionary[key]
        for (const pair of rule.has ?? []) {
          if (!says(text, pair[column])) wrong.push(`${key} (${locale}) should say ${pair[column]}`)
        }
        for (const pair of rule.lacks ?? []) {
          if (says(text, pair[column])) wrong.push(`${key} (${locale}) still says ${pair[column]}`)
        }
      })
    }
  }
  for (const [locale, dictionary] of LOCALES) {
    if (dictionary['document.halstead.title'] !== 'Springfield, 1896') {
      wrong.push(`document.halstead.title (${locale}) is "${dictionary['document.halstead.title']}"`)
    }
  }
  // Portuguese has a word for them.
  for (const [key, text] of Object.entries(ptBR)) {
    if (/dimples/i.test(text)) wrong.push(`${key} (pt-BR) still says dimples`)
  }
  // The generator of the net explained its height by the claim the label
  // dropped; whoever remodels the net reads that comment first.
  const netGenerator = readText(new URL('../scripts/bake/kit.mjs', import.meta.url))
  if (/half a foot/i.test(netGenerator)) wrong.push('scripts/bake/kit.mjs still explains the net by "half a foot"')
  assert.deepEqual(wrong, [])
})

test('the museum has one name, everywhere it names itself', () => {
  const root = (path: string) => readText(new URL(`../${path}`, import.meta.url))
  const wrong: string[] = []
  for (const [key, text] of Object.entries(ptBR)) {
    if (/Museu do V[ôo]lei\b/i.test(text)) wrong.push(`${key} (pt-BR): ${text}`)
  }
  for (const [key, text] of Object.entries(en)) {
    if (/Museum of Volleyball/i.test(text)) wrong.push(`${key} (en): ${text}`)
  }
  for (const file of ['index.html', 'public/manifest.webmanifest']) {
    if (/Museu do V[ôo]lei\b/i.test(root(file))) wrong.push(`${file} still carries the short name`)
  }
  assert.deepEqual(wrong, [])
  assert.equal(ptBR['ui.title'], 'Museu do Voleibol')
  assert.equal(en['ui.title'], 'Volleyball Museum')
  assert.equal(ptBR['sign.atrium.heading'], 'MUSEU DO VOLEIBOL')
  assert.equal(en['sign.atrium.heading'], 'VOLLEYBALL MUSEUM')
  // What the phone prints under the icon is the museum's own name too.
  assert.ok(root('index.html').includes('name="apple-mobile-web-app-title" content="Museu do Voleibol"'))
  assert.equal(JSON.parse(root('public/manifest.webmanifest')).short_name, 'Museu do Voleibol')
})

test('two safes, two names: the iron safe in the office, the vault under the hall (D34)', () => {
  // The line of the list and the third line of the title speak of the vault,
  // in the word each language keeps for it and for nothing else.
  for (const key of ['notebook.todo.vault', 'intro.line3'] as const) {
    assert.match(ptBR[key], /caixa-forte/i, `${key} (pt-BR) names the vault`)
    assert.match(en[key], /\bvault\b/i, `${key} (en) names the vault`)
  }
  assert.equal(ptBR['notebook.todo.vault'], 'Caixa-forte — só o Otávio sabia abrir')
  assert.equal(ptBR['intro.line3'], 'Seu antecessor deixou alguma coisa na caixa-forte.')
  // The director's letter says why the inventory matters, and where the
  // ledger it is checked against was left.
  assert.match(ptBR['notebook.welcome.letter'], /seguradora[^\n]*livro de tombo do Otávio[^\n]*caixa-forte/)
  assert.match(en['notebook.welcome.letter'], /insurer[^\n]*accession ledger of Otávio[^\n]*vault/)

  // A bare «cofre», or a bare "safe", is a word for two different things:
  // ticking it off the list on opening the wrong one would be false.
  const BARE: Record<string, RegExp> = {
    'pt-BR': /(?<![\p{L}-])cofres?(?![\p{L}-])(?!\s+de\s+ferro)/iu,
    en: /(?<![\p{L}-])(?<!\biron\s)safes?(?![\p{L}-])/iu,
  }
  // One text is let off, by key: the predecessor's note, which the handover
  // sheet replaces at the end of this lot. From then on the list is empty.
  const LET_OFF = new Set(['document.predecessor.body'])
  const bare: string[] = []
  const needed = new Set<string>()
  for (const [locale, dictionary] of LOCALES) {
    for (const [key, text] of Object.entries(dictionary)) {
      if (!BARE[locale].test(text)) continue
      if (LET_OFF.has(key)) needed.add(key)
      else bare.push(`${key} (${locale}): ${text}`)
    }
  }
  assert.deepEqual(bare, [])
  assert.deepEqual([...needed].sort(), [...LET_OFF].sort(), 'a text let off that no longer says it: take it off the list')
  // The rule reads a compound as the name it is.
  assert.ok(!BARE['pt-BR'].test('A chave do cofre de ferro.') && BARE['pt-BR'].test('Está no cofre, sob o átrio.'))
  assert.ok(!BARE.en.test('The key to the iron safe.') && BARE.en.test('It is in the safe.') && !BARE.en.test('Keep it safely.'))
})

test('an open drawer is not called locked: the lock says it is shut, the name does not (L3)', () => {
  const containers = MUSEUM.rooms.flatMap((room) => room.containers ?? [])
  for (const container of containers) {
    for (const [locale, dictionary] of LOCALES) {
      assert.doesNotMatch(dictionary[container.titleKey], /trancad|locked/i, `${container.id} (${locale})`)
    }
  }
  const drawer = containerById(MUSEUM, 'office-cabinet')
  const lock = MUSEUM.locks.find((candidate) => candidate.id === drawer?.lockId)
  assert.ok(drawer && lock)
  assert.equal(ptBR['container.office.title'], 'Gaveta do Otávio')
  assert.equal(en['container.office.title'], "Otávio's drawer")

  // Shut: «title — what the lock says», and E still brings the keypad up.
  assert.deepEqual(containerPrompt(drawer, lock, true), {
    form: 'locked',
    titleKey: 'container.office.title',
    sayingKey: 'lock.office-drawer.prompt',
  })
  assert.equal(`${ptBR['container.office.title']} — ${ptBR['lock.office-drawer.prompt']}`, 'Gaveta do Otávio — trancada (um ano)')
  assert.equal(`${en['container.office.title']} — ${en['lock.office-drawer.prompt']}`, "Otávio's drawer — locked (a year)")
  // Open: «Ler — title», like any other drawer.
  assert.deepEqual(containerPrompt(drawer, lock, false), {
    form: 'read',
    labelKey: 'prompt.read',
    titleKey: 'container.office.title',
  })
  // A lock with nothing of its own to say keeps the plain word, and a
  // container with no lock is read.
  const { promptKey: _, ...mute } = lock
  assert.deepEqual(containerPrompt(drawer, mute, true), { form: 'read', labelKey: 'prompt.locked', titleKey: 'container.office.title' })
  const open = containerById(MUSEUM, 'holyoke-cabinet-a')
  assert.ok(open)
  assert.deepEqual(containerPrompt(open, undefined, false), { form: 'read', labelKey: 'prompt.read', titleKey: open.titleKey })

  // The component draws what the rule says, and asks the lock rule whether it is shut.
  const hud = source('ui/Hud.tsx').replace(/\s+/g, ' ')
  assert.ok(hud.includes("lockStatus(container.lockId, { locksOpened }) === 'closed'"))
  assert.ok(hud.includes('const view = containerPrompt(container, lock, isLocked)'), 'the prompt is worded by the rule')
  assert.ok(hud.includes("view.form === 'locked' ? ("), 'and a shut lock is drawn in its own form')
})

test('every wall label fits in forty words, in both languages', () => {
  // A word is what stands between spaces and has a letter or a digit in it.
  const words = (text: string) => text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length
  const over: string[] = []
  for (const exhibit of MUSEUM.exhibits) {
    for (const [locale, dictionary] of LOCALES) {
      const count = words(dictionary[exhibit.labelKey])
      if (count > 40) over.push(`${exhibit.labelKey} (${locale}): ${count} words`)
    }
  }
  assert.equal(MUSEUM.exhibits.length, 12, 'the twelve labels of the house')
  assert.deepEqual(over, [])
})

test('the porter sends nobody to what is not there, in lines short enough to read', () => {
  const patience = radio.patience
  assert.ok(patience)
  const answers = [
    ...patience.tiers.flatMap((tier) => [...tier.replies, ...(tier.outbursts ?? [])]),
    ...(patience.praise ?? []),
    ...patience.deadAir,
  ]
  const spoken = new Set<string>([
    ...radio.calls.flatMap((call) => call.lineKeys),
    ...radio.hints.flatMap((hint) => [...hint.heightKeys, ...(hint.curtLineKeys ?? [])]),
    ...answers.flatMap((answer) => [
      ...answer.lineKeys,
      ...('closingKeys' in answer ? (answer.closingKeys ?? []) : []),
    ]),
  ])
  const wrong: string[] = []
  // That a line fits the time a subtitle stays up is the content gate's to
  // say now, line by line and by who says it (`speech-line-too-long`: 130
  // for a call or a height of a hint, 110 for an answer of his patience and
  // a curt hint). Here, only that the gate does say it of this museum.
  assert.deepEqual(
    validateSpeech(MUSEUM, { 'pt-BR': ptBR, en }).map((issue) => `${issue.code} ${issue.id}`),
    [],
    'the gate accuses a line of the porter',
  )

  // The porter sends nobody to what the house does not have yet. Until the
  // slice that brings each of them, no line of his says a word of: the
  // medals, the seals, the house lights' master switch, the pump and the
  // platform (L11 and L12); nor the answering machine, the key, the iron
  // safe, the Book, the lectern and the deed of office, which are this
  // lot's own and come with the chain they belong to. The slice that builds
  // one takes its word off the list, in the same commit.
  const notYet: Record<string, readonly RegExp[]> = {
    'pt-BR': [/medalha/i, /lacre/i, /chave/i, /bomba/i, /plataforma/i, /secretária/i, /cofre/i, /caixa-forte/i, /\blivro\b/i, /púlpito/i, /\bposse\b/i, /\btermo\b/i],
    en: [/medal/i, /\bseals?\b/i, /\bkeys?\b/i, /\bpump\b/i, /platform/i, /answering machine/i, /\bsafe\b/i, /vault/i, /\bbook\b/i, /ledger/i, /lectern/i, /\bdeed\b/i],
  }
  for (const key of spoken) {
    for (const [locale, dictionary] of LOCALES) {
      for (const word of notYet[locale]) {
        if (word.test(dictionary[key])) wrong.push(`${key} (${locale}) says ${word}, of something the house does not have yet`)
      }
    }
  }
  // The rule reads a word as a word: a notebook is not a book.
  assert.ok(!notYet.en.some((word) => word.test(en['radio.hint.notebook.where'])) && /\bbook\b/i.test('the Book of Deeds'))

  // The call that gives the hall's breaker is the instruction and no more:
  // two lines. Who he is, and that nobody goes down tonight, is his
  // introduction, which forbids nothing that could be done: there is no way
  // down to forbid.
  const lastHint = radio.hints[radio.hints.length - 1]
  const firstCall = radio.calls.find((call) => call.id === 'porter-first-call')
  assert.ok(firstCall && firstCall.lineKeys.length === 2, 'the first call is the instruction for the breaker, in two lines')
  const hello = radio.calls.find((call) => call.id === 'porter-hello')
  assert.ok(hello && /subsolo alagou/.test(ptBR[hello.lineKeys[4] as 'radio.call.hello.5']), 'his introduction ends on the flooded basement')
  const honest = [...lastHint.heightKeys, ...(lastHint.curtLineKeys ?? []), hello.lineKeys[4]]
  const promises: Record<string, readonly RegExp[]> = {
    'pt-BR': [/não desce/i],
    en: [/don't go down/i],
  }
  for (const key of honest) {
    for (const [locale, dictionary] of LOCALES) {
      for (const promise of promises[locale]) {
        if (promise.test(dictionary[key])) wrong.push(`${key} (${locale}) still says ${promise}`)
      }
    }
  }

  // The fallback is heard only when no hint above it applies, and every room
  // that starts dark has one of those (the office is the radio's own supply):
  // by the time the porter says it, the lights are all back. So it may not
  // offer «luz» as something still to do; it says the light is done.
  assert.deepEqual(lastHint.when, {}, 'the last hint is the fallback')
  const litByThen = new Set<string>([
    radio.poweredBy,
    ...radio.hints.slice(0, -1).flatMap((hint) => ('unpowered' in hint.when ? hint.when.unpowered : [])),
  ])
  for (const room of MUSEUM.rooms) {
    if (!room.startsPowered && !litByThen.has(room.id)) {
      wrong.push(`the fallback hint can be heard with "${room.id}" still dark`)
    }
  }
  const lightIsDone: Record<string, RegExp> = { 'pt-BR': /luz (tá )?feita/i, en: /lights are done/i }
  const lightStillOffered: Record<string, RegExp> = { 'pt-BR': /luz e confer/i, en: /lights and (the )?checking/i }
  for (const key of [...lastHint.heightKeys, ...(lastHint.curtLineKeys ?? [])]) {
    for (const [locale, dictionary] of LOCALES) {
      const text = dictionary[key]
      if (!lightIsDone[locale].test(text)) wrong.push(`${key} (${locale}) does not say the light is done`)
      if (lightStillOffered[locale].test(text)) wrong.push(`${key} (${locale}) still offers the light as work to do`)
    }
  }

  // The curt drawer hint sends the player to the portrait for a date. Nothing
  // on the modelled frame is a plaque, and the one text at its foot is the
  // photograph's credit, which carries another year. The hint gives the
  // gesture that shows the right one.
  const drawerCurt = radio.hints
    .flatMap((hint) => hint.curtLineKeys ?? [])
    .find((key) => key === 'radio.hint.drawer.curt')
  assert.ok(drawerCurt, 'the drawer hint has a curt form')
  const gesture: Record<string, RegExp> = { 'pt-BR': /inclina/i, en: /tilt/i }
  const notModelled: Record<string, RegExp> = { 'pt-BR': /plaqueta/i, en: /plaque/i }
  for (const [locale, dictionary] of LOCALES) {
    const text = dictionary[drawerCurt]
    if (!gesture[locale].test(text)) wrong.push(`${drawerCurt} (${locale}) does not say to tilt the frame`)
    if (notModelled[locale].test(text)) wrong.push(`${drawerCurt} (${locale}) points at a plaque the frame does not have`)
  }
  assert.deepEqual(wrong, [])
})

console.log(`\n${passed}/${passed} opening-flow checks passed.\n`)
