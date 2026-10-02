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
import { readFileSync } from 'node:fs'

import { Box3, Matrix4, Ray, Vector3 } from 'three'

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
const { validateOpening, validateTranslations } = await import('../src/content/validate.ts')
const { PRE_OPENING_SAVE } = await import('../src/content/legacySave.ts')
const { MuseumAudio } = await import('../src/engine/audio.ts')
const {
  advanceClockSeconds,
  CLOCK_MAX_STEP_SECONDS,
  clockTimeAfter,
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
const { journalUnlocked } = await import('../src/engine/notebook.ts')
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
  listGrew,
  lockKeyIntent,
  lookHintVisible,
  newGameClick,
  shouldAnnounceJournal,
} = await import('../src/ui/hudRules.ts')
const { portalOpening } = await import('../src/ui/mapGeometry.ts')

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

const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

console.log('\nOpening flow')

// ---------------------------------------------------------------------------
// Saves from before the opening (#16)
// ---------------------------------------------------------------------------

test('a pre-opening save keeps its journal and hears no stale first call', () => {
  const progress = useMuseum.getState().progress
  assert.ok(progress.documentsRead.includes(PRE_OPENING_SAVE.journalDocumentId), 'notebook granted')
  assert.ok(progress.radioCalls.includes(PRE_OPENING_SAVE.firstCallId), 'first call is history')
  assert.equal(journalUnlocked(MUSEUM, progress.documentsRead), true)
  assert.deepEqual(dueRadioCalls(radio, progress, MUSEUM), [], 'no call sends them to a lit breaker')
  assert.deepEqual(progress.catalogued, ['ball-spalding'], 'nothing of the playthrough is lost')
  assert.equal(useMuseum.getState().settings.locale, 'en', 'settings survive')
  assert.equal(progress.version, SAVE_VERSION, 'the version was not bumped to get here')
})

test('the migration only touches saves that predate the opening', () => {
  // A save from the opening onwards has `radioCalls`: it is trusted as it is.
  const modern = migrateProgress({ version: SAVE_VERSION, radioCalls: [], roomsPowered: ['atrium'] })
  assert.deepEqual(modern.documentsRead, [])
  assert.deepEqual(modern.radioCalls, [])

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
    ['porter-first-call'],
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
  assert.deepEqual(junk.radioCalls, [], 'a string is not a list')
  assert.deepEqual(junk.catalogued, ['ok'])
  assert.deepEqual(junk.clockSeconds, { 'office-clock': 42 })
  assert.deepEqual(junk.hintsShown, ['journal-taken'])
})

test('the first call only plays while the atrium is still dark', () => {
  const lit = progressWith({ roomsPowered: ['office', 'atrium'], documentsRead: ['doc-welcome'] })
  assert.deepEqual(dueRadioCalls(radio, lit, MUSEUM), [])
  const dark = progressWith({ roomsPowered: ['office'], documentsRead: ['doc-welcome'] })
  assert.deepEqual(dueRadioCalls(radio, dark, MUSEUM).map((call) => call.id), ['porter-first-call'])
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
          ? { ...device, hints: [{ when: { documentsUnread: ['doc-nope'] }, lineKeys: ['radio.hint.vault'] }, ...device.hints] }
          : device,
      ),
    })),
  }
  assert.ok(validateOpening(broken).some((issue) => issue.code === 'condition-document-missing'))
})

test('a player who skipped the notebook is sent back for it first', () => {
  const skipped = progressWith({ roomsPowered: ['office'] })
  assert.deepEqual(radioHintFor(radio, skipped, MUSEUM), ['radio.hint.notebook'])
  const read = progressWith({ roomsPowered: ['office'], documentsRead: ['doc-welcome'] })
  assert.deepEqual(radioHintFor(radio, read, MUSEUM), ['radio.hint.atrium'])
})

test('the notebook reminder follows the first call and lapses once taken', () => {
  const skipped = progressWith({ roomsPowered: ['office'] })
  assert.deepEqual(
    dueRadioCalls(radio, skipped, MUSEUM).map((call) => call.id),
    ['porter-first-call', 'porter-notebook-reminder'],
  )
  // However the retries fall, the reminder waits for the introduction.
  assert.equal(radioCallReady(radio, 'porter-notebook-reminder', skipped, MUSEUM), 'queued')
  assert.equal(radioCallReady(radio, 'porter-first-call', skipped, MUSEUM), 'ready')
  const heard = { ...skipped, radioCalls: ['porter-first-call'] }
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
})

test('the journal lesson is shown once ever, after the notebook closes', () => {
  assert.equal(shouldAnnounceJournal({ unlocked: true, reading: false, alreadyShown: false }), true)
  assert.equal(shouldAnnounceJournal({ unlocked: true, reading: true, alreadyShown: false }), false)
  assert.equal(shouldAnnounceJournal({ unlocked: false, reading: false, alreadyShown: false }), false)
  assert.equal(shouldAnnounceJournal({ unlocked: true, reading: false, alreadyShown: true }), false)

  // The flag lives in the save: a reload with the notebook open still owes
  // the lesson, and one after it never repeats it.
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
  assert.equal(resumes, 4, 'disposed audio stops listening')
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

test('the office drawer code is printed where the hint and the lock point', () => {
  for (const lock of MUSEUM.locks) {
    if (lock.kind !== 'knowledge') continue
    const fact = MUSEUM.facts.find((candidate) => candidate.id === lock.factId)
    const exhibit = MUSEUM.exhibits.find((candidate) => candidate.id === lock.sourceExhibitId)
    assert.ok(fact && exhibit)
    // The hotspot that teaches the fact is the text the player is reading at
    // the moment they learn it; the catalogue entry it unlocks repeats it.
    const teaching = exhibit.hotspots.find((hotspot) => hotspot.revealsFactId === fact.id)
    assert.ok(teaching, `${exhibit.id} has a hotspot that reveals ${fact.id}`)
    for (const [locale, dictionary] of [
      ['pt-BR', ptBR],
      ['en', en],
    ] as const) {
      const lookup = (key: string) => (dictionary as Record<string, string>)[key] ?? ''
      assert.ok(lookup(teaching.labelKey).includes(fact.value), `${locale}: the plaque shows ${fact.value}`)
      assert.ok(lookup(exhibit.catalogueKey).includes(fact.value), `${locale}: the catalogue shows it`)
    }
  }
  // The porter's drawer hint names the same exhibit.
  assert.ok(ptBR['radio.hint.drawer'].includes('Morgan') && en['radio.hint.drawer'].includes('Morgan'))
})

test('the renaming is dated where history dates it', () => {
  // Morgan devised Mintonette at Holyoke in 1895; the Springfield YMCA
  // conference demonstration of July 1896 gave it the name Volley Ball.
  for (const dictionary of [ptBR, en]) {
    assert.ok(dictionary['exhibit.portrait-morgan.label'].includes('1895'))
    assert.ok(dictionary['exhibit.portrait-morgan.catalogue'].includes('Springfield'))
    assert.ok(dictionary['hotspot.portrait-morgan.date.label'].includes('Springfield'))
    assert.ok(!dictionary['hotspot.portrait-morgan.date.label'].includes('1895'))
  }
})

console.log(`\n${passed}/${passed} opening-flow checks passed.\n`)
