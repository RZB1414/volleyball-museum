/**
 * Headless proof of the radio in the player's hand and the porter's patience.
 *
 *   npm run test:radio
 *
 * The radio leaves the desk on its first use, like the notebook, and from
 * then on R (or the HUD icon) calls the porter from any room. He always
 * helps — the hint is never left out except when he loses his temper — but
 * the more he is called the drier, the more teasing and finally the more
 * short-tempered he gets, now and then hanging up for a few seconds of dead
 * air. Every rule is checked against the real content, the real store and
 * the real call path, with a fixed clock and a fixed dice; audio has no
 * context in Node and is a silent no-op.
 *
 * Also pinned here, because they are the same feature: a content call is only
 * heard once its last line ends, subtitles hold under modals and crackle once
 * per line, a due call always plays before a hint, the director waits for
 * every modal and schedules one call at a time, and the touch tool column
 * keeps the torch nearest the thumb.
 */

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'

import { Group, Mesh, Vector3 } from 'three'

import { BAKED_BUNDLES } from '../src/content/bake.generated.ts'
import { en } from '../src/content/i18n/en.ts'
import { ptBR } from '../src/content/i18n/pt-BR.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { MuseumContent, RadioPatience } from '../src/content/schema.ts'
import { validateBake, validateOpening } from '../src/content/validate.ts'
import {
  deskRadioIntent,
  dueRadioCalls,
  nextRadioCall,
  radioCallReady,
  radioDeliveryStep,
  radioDevices,
  radioLineSeconds,
  transmissionLapsed,
} from '../src/engine/deviceRules.ts'
import {
  aimableDeviceId,
  deviceIdFor,
  hiddenInScene,
  isLensNode,
  placeHandset,
  prepareHandset,
} from '../src/engine/deviceNodes.ts'
import { progressConditionMet } from '../src/engine/progressCondition.ts'
import { placeRadioCall, releaseHeldRadio, takeDeskRadio } from '../src/engine/radioCall.ts'
import {
  calmedTemper,
  deadAirFor,
  hangUpDelayMs,
  hangUpStarted,
  heldRadioId,
  isRadioCallKey,
  patienceTierFor,
  porterAnswer,
  radioCallBlocked,
} from '../src/engine/radioPatience.ts'
import {
  FRESH_RADIO_MEMORY,
  hasSavedProgress,
  isModalOpen,
  migrateProgress,
  SAVE_VERSION,
  useMuseum,
  type Progress,
  type RadioMemory,
} from '../src/state/store.ts'
import {
  radioHeld,
  radioLineDelayMs,
  radioLineMark,
  radioToolState,
  shouldAnnounceTaken,
  shouldCrackle,
} from '../src/ui/hudRules.ts'

let passed = 0
function test(name: string, run: () => void) {
  run()
  passed += 1
  console.log(`  pass  ${name}`)
}

const [radioEntry] = radioDevices(MUSEUM)
assert.ok(radioEntry, 'the office has a radio')
const radio = radioEntry.device
const RADIO = radio.id
assert.ok(radio.patience, 'the porter has a temper')
const patience = radio.patience as RadioPatience

/** A fixed instant, so every calming and every hang-up is reproducible. */
const START = 1_800_000_000_000
const SECOND = 1000
const fixed = (value: number) => () => value

/** A seeded dice (mulberry32): a long random run that is the same every time. */
function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const ALL_CALLS = radio.calls.map((call) => call.id)
const HINT_LINES = new Set(radio.hints.flatMap((hint) => [...hint.lineKeys, ...(hint.curtLineKeys ?? [])]))

/** A save as the porter sees it: office lit, notebook read, unless patched. */
function progressWith(patch: Partial<Progress> = {}): Progress {
  return {
    ...migrateProgress({ version: SAVE_VERSION, radioCalls: [] }),
    roomsPowered: ['office'],
    documentsRead: ['doc-welcome'],
    ...patch,
  }
}

/** A new game in progress: started, with the save patched in. */
function newGame(patch: Partial<Progress> = {}) {
  useMuseum.getState().resetProgress()
  useMuseum.setState((state) => ({ started: true, progress: { ...state.progress, ...patch } }))
}

/** Lets the radio say every remaining line, as the subtitle timer would. */
function finishTransmission() {
  for (let guard = 0; guard < 20 && useMuseum.getState().radio; guard += 1) {
    useMuseum.getState().advanceRadio()
  }
  assert.equal(useMuseum.getState().radio, null)
}

const memoryOf = () => useMuseum.getState().progress.radioMemory[RADIO] ?? FRESH_RADIO_MEMORY
const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

console.log('\nThe carried radio')

// ---------------------------------------------------------------------------
// 1. Taking it
// ---------------------------------------------------------------------------

test('using the desk radio takes it, like the notebook', () => {
  newGame({ roomsPowered: [], documentsRead: ['doc-welcome'] })
  assert.equal(takeDeskRadio(RADIO), false, 'a dead radio has nobody on the other end')
  assert.deepEqual(useMuseum.getState().progress.devicesCarried, [])

  useMuseum.setState((state) => ({ progress: { ...state.progress, roomsPowered: ['office'] } }))
  useMuseum.setState({ journalTab: 'map' })
  assert.equal(takeDeskRadio(RADIO), false, 'not through the journal')
  useMuseum.setState({ journalTab: null })

  // Taking it mid-call never skips the line he is saying.
  useMuseum.getState().startRadio({
    deviceId: RADIO,
    speakerKey: radio.speakerKey,
    lineKeys: ['radio.call.first.1', 'radio.call.first.2'],
    callId: 'porter-first-call',
  })
  assert.equal(takeDeskRadio(RADIO), true)
  assert.equal(useMuseum.getState().radio?.index, 0, 'the transmission carries on')
  assert.deepEqual(useMuseum.getState().progress.devicesCarried, [RADIO])
  assert.equal(takeDeskRadio(RADIO), false, 'idempotent')
  assert.deepEqual(useMuseum.getState().progress.devicesCarried, [RADIO])
  assert.equal(heldRadioId(useMuseum.getState().progress.devicesCarried, MUSEUM), RADIO)
  assert.equal(hasSavedProgress(useMuseum.getState().progress), true)

  // "You took the radio" is a content call, heard after his introduction.
  const progress = useMuseum.getState().progress
  assert.deepEqual(
    dueRadioCalls(radio, progress, MUSEUM).map((call) => call.id),
    ['porter-first-call', 'porter-radio-taken'],
  )
  assert.equal(radioCallReady(radio, 'porter-radio-taken', progress, MUSEUM), 'queued')
  assert.equal(
    radioCallReady(radio, 'porter-radio-taken', { ...progress, radioCalls: ['porter-first-call'] }, MUSEUM),
    'ready',
  )
  assert.equal(
    dueRadioCalls(radio, { ...progress, devicesCarried: [] }, MUSEUM).some(
      (call) => call.id === 'porter-radio-taken',
    ),
    false,
    'never before the radio leaves the desk',
  )

  useMuseum.getState().resetProgress()
  assert.deepEqual(useMuseum.getState().progress.devicesCarried, [], 'a new game puts it back')
  assert.equal(useMuseum.getState().radio, null)
})

test('the desk prompt and E agree: take first, then skip or call', () => {
  const carriable = { carriedOnUse: true }
  assert.equal(deskRadioIntent(carriable, { live: false, carried: false, speaking: false }), 'dead')
  assert.equal(deskRadioIntent(carriable, { live: true, carried: false, speaking: true }), 'take')
  assert.equal(deskRadioIntent(carriable, { live: true, carried: true, speaking: true }), 'skip')
  assert.equal(deskRadioIntent(carriable, { live: true, carried: true, speaking: false }), 'call')
  assert.equal(deskRadioIntent({}, { live: true, carried: false, speaking: false }), 'call')
  assert.ok(ptBR['prompt.radio.take'] === 'Pegar o rádio' && en['prompt.radio.take'] === 'Take the radio')
  for (const file of ['ui/Hud.tsx', 'engine/Devices.tsx']) {
    assert.ok(source(file).includes('deskRadioIntent('), `${file} asks the same intent`)
  }
})

test('the handset leaves its cradle without moving a node', () => {
  const desk = new Group()
  desk.position.set(0.36, 0.74, 0.64)
  desk.rotation.y = -Math.PI / 2
  const assembly = new Group()
  desk.add(assembly)
  const names = [
    'desk-radio',
    'desk-radio__led',
    'desk-radio__handset',
    'desk-radio__handset-metal',
    'desk-radio__handset-led',
  ]
  for (const [index, name] of names.entries()) {
    const node = new Mesh()
    node.name = name
    // A quantisation compensation of its own, as every baked node has.
    node.position.set(0.001 * index, 0.02 + 0.03 * index, -0.002 * index)
    node.scale.setScalar(0.5 + index * 0.1)
    assembly.add(node)
  }
  desk.updateMatrixWorld(true)
  const before = names.map((name) => assembly.getObjectByName(name)?.getWorldPosition(new Vector3()))

  const handset = prepareHandset(assembly, 'desk-radio')
  assert.ok(handset)
  assert.deepEqual(
    handset.children.map((child) => child.name),
    ['desk-radio__handset', 'desk-radio__handset-metal', 'desk-radio__handset-led'],
  )
  assert.deepEqual(
    assembly.children.map((child) => child.name),
    ['desk-radio', 'desk-radio__led', 'radio-handset'],
    'the cradle and its lamp stay',
  )
  assert.equal(prepareHandset(assembly, 'desk-radio'), handset, 'idempotent under StrictMode')
  assert.equal(handset.children.length, 3)

  desk.updateMatrixWorld(true)
  for (const [index, name] of names.entries()) {
    const after = assembly.getObjectByName(name)?.getWorldPosition(new Vector3())
    assert.ok(after && before[index] && after.distanceTo(before[index]) < 1e-12, `${name} did not move`)
  }
  assert.equal(prepareHandset(new Group(), 'desk-radio'), null, 'no handset, nothing to hide')

  // Taken: the group hides, and a ray that hits a handset mesh the scan
  // switched back on is still rejected by its hidden ancestor.
  placeHandset(handset, true)
  assert.equal(handset.visible, false)
  const grip = assembly.getObjectByName('desk-radio__handset') as Mesh
  grip.visible = true
  assert.equal(hiddenInScene(grip), true, 'a taken handset is never aimed at')
  assert.equal(hiddenInScene(assembly.getObjectByName('desk-radio') ?? null), false, 'the cradle stays')
  placeHandset(handset, false)
  assert.equal(hiddenInScene(grip), false)
  placeHandset(null, true)
  assert.equal(hiddenInScene(null), false)

  // Both lenses read the same charger.
  assert.equal(isLensNode('desk-radio__led', 'desk-radio'), true)
  assert.equal(isLensNode('desk-radio__handset-led', 'desk-radio'), true)
  assert.equal(isLensNode('desk-radio__handset', 'desk-radio'), false)
  assert.equal(isLensNode('door-access-panel__led', 'desk-radio'), false)
})

test('the scan aims at desk radios only, never at one in hand', () => {
  const radios = new Set([RADIO])
  assert.equal(aimableDeviceId(`device:${RADIO}`, radios, []), RADIO)
  assert.equal(aimableDeviceId(`device:${RADIO}`, radios, [RADIO]), null, 'its proxy stays off the ray layer')
  assert.equal(aimableDeviceId('device:office-clock', radios, []), null, 'a clock is not operated')
  assert.equal(aimableDeviceId(RADIO, radios, []), null, 'only the wrapper names a device')

  const wrapper = new Group()
  wrapper.name = `device:${RADIO}`
  const proxy = new Mesh()
  const hidden = new Group()
  hidden.add(proxy)
  wrapper.add(hidden)
  assert.equal(deviceIdFor(proxy), RADIO)
  assert.equal(deviceIdFor(new Mesh()), null)
  hidden.visible = false
  assert.equal(hiddenInScene(proxy), true, 'a carried radio\'s proxy is rejected even if hit')

  const devices = source('engine/Devices.tsx')
  for (const helper of ['aimableDeviceId(object.name, RADIOS_BY_ID, carried)', 'hiddenInScene(hit.object)', 'placeHandset(handset, carried)']) {
    assert.ok(devices.includes(helper), `Devices.tsx asks ${helper}`)
  }
})

test('the handset clicks once as he hangs up, and the dead air runs out on time', () => {
  assert.equal(hangUpStarted(null, START), true)
  assert.equal(hangUpStarted(START, START + SECOND), false, 'a later write is not a second hang-up')
  assert.equal(hangUpStarted(START, null), false, 'the line coming back is not a click')
  assert.equal(hangUpStarted(null, null), false)
  assert.equal(hangUpDelayMs(START + 12 * SECOND, START), 12 * SECOND)
  assert.equal(hangUpDelayMs(START, START + SECOND), 0, 'an end already past runs out at once')
  const devices = source('engine/Devices.tsx')
  assert.ok(devices.includes('hangUpStarted(previous.radioHungUpUntil, state.radioHungUpUntil)'))
  assert.ok(devices.includes('hangUpDelayMs(hungUpUntil, Date.now())'))
})

test('the bake splits the handset and the gate requires it', () => {
  const parts = new Set(BAKED_BUNDLES.flatMap((bundle) => bundle.parts.map((part) => part.name)))
  for (const name of ['desk-radio', 'desk-radio__led', 'desk-radio__handset', 'desk-radio__handset-led']) {
    assert.ok(parts.has(name), `${name} is baked`)
  }
  assert.ok(!validateBake(MUSEUM, BAKED_BUNDLES).some((issue) => issue.code === 'device-node-missing'))
  const withoutHandset = BAKED_BUNDLES.map((bundle) => ({
    ...bundle,
    parts: bundle.parts.filter((part) => !part.name.startsWith('desk-radio__handset')),
  }))
  assert.ok(
    validateBake(MUSEUM, withoutHandset).some(
      (issue) => issue.code === 'device-node-missing' && issue.message.includes('__handset'),
    ),
  )
})

// ---------------------------------------------------------------------------
// 2. Calling from anywhere, never under a modal
// ---------------------------------------------------------------------------

test('a carried radio calls from any room, never under a modal, never before it is taken', () => {
  newGame({ roomsPowered: ['office'], documentsRead: ['doc-welcome'], radioCalls: ALL_CALLS })
  useMuseum.setState({ currentRoom: 'atrium' })
  assert.equal(placeRadioCall(RADIO, START, fixed(0.5)), false, 'still on the desk')
  assert.equal(useMuseum.getState().radio, null)

  useMuseum.getState().carryDevice(RADIO)
  for (const modal of [
    { examining: 'ball-spalding' },
    { openedContainer: 'office-cabinet' },
    { activeLock: 'office-drawer' },
    { journalTab: 'map' as const },
  ]) {
    useMuseum.setState(modal)
    assert.equal(radioCallBlocked(useMuseum.getState()), true)
    assert.equal(placeRadioCall(RADIO, START, fixed(0.5)), false, `blocked by ${Object.keys(modal)[0]}`)
    useMuseum.setState({ examining: null, openedContainer: null, activeLock: null, journalTab: null })
  }
  useMuseum.setState({ started: false })
  assert.equal(placeRadioCall(RADIO, START, fixed(0.5)), false, 'not from the title screen')
  useMuseum.setState({ started: true })

  assert.equal(placeRadioCall(RADIO, START, fixed(0.5)), true, 'from the atrium')
  const on = useMuseum.getState().radio
  assert.equal(on?.speakerKey, 'radio.speaker.porter')
  assert.ok(on?.lineKeys.includes('radio.hint.atrium'))
  assert.equal(memoryOf().calls, 1)

  // A second press while he talks moves him on and is not a call.
  assert.equal(placeRadioCall(RADIO, START + SECOND, fixed(0.5)), true)
  assert.equal(useMuseum.getState().radio?.index, 1)
  assert.equal(memoryOf().calls, 1)
  finishTransmission()
})

test('R calls the porter; Ctrl/Cmd/Alt+R, a held key and typing do not', () => {
  const key = (patch: Partial<KeyboardEvent> = {}) =>
    ({ code: 'KeyR', repeat: false, ctrlKey: false, metaKey: false, altKey: false, target: null, ...patch }) as KeyboardEvent
  assert.equal(isRadioCallKey(key()), true)
  assert.equal(isRadioCallKey(key({ ctrlKey: true })), false, 'Ctrl+R reloads the page')
  assert.equal(isRadioCallKey(key({ metaKey: true })), false, 'Cmd+R reloads the page')
  assert.equal(isRadioCallKey(key({ altKey: true })), false)
  assert.equal(isRadioCallKey(key({ repeat: true })), false)
  assert.equal(isRadioCallKey(key({ code: 'KeyE' })), false)
  assert.equal(isRadioCallKey(key({ target: { tagName: 'INPUT' } as unknown as EventTarget })), false)

  // One definition of the key, so it can never drift between handlers.
  const sources = readdirSync(new URL('../src/', import.meta.url), { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.generated.ts'))
    .filter((file) => source(file.replaceAll('\\', '/')).includes("'KeyR'"))
    .map((file) => file.replaceAll('\\', '/'))
  assert.deepEqual(sources, ['engine/radioPatience.ts'])

  const devices = source('engine/Devices.tsx')
  assert.ok(/isRadioCallKey\(event\)/.test(devices) && /heldRadioId\(/.test(devices), 'the handset listens')
  assert.ok(/\n\s*<RadioHandset \/>\n/.test(source('scenes/MuseumScene.tsx')), 'mounted at the scene root')
})

// ---------------------------------------------------------------------------
// 3. A due call before any hint (#19), heard only to its last line (#14)
// ---------------------------------------------------------------------------

test('a due call always plays before a hint, and does not count as a call', () => {
  // The lamp has just come on; the director's 2.4 s have not run out yet.
  newGame({ roomsPowered: ['office'], documentsRead: ['doc-welcome'], devicesCarried: [RADIO] })
  assert.equal(placeRadioCall(RADIO, START, fixed(0)), true)
  const first = useMuseum.getState().radio
  assert.equal(first?.callId, 'porter-first-call')
  assert.deepEqual(first?.lineKeys, radio.calls[0].lineKeys)
  assert.equal(memoryOf().calls, 0, 'his introduction is not the player pestering him')

  // Recorded only when the last line ends: a reload mid-call hears it again.
  for (let line = 1; line < radio.calls[0].lineKeys.length; line += 1) {
    useMuseum.getState().advanceRadio()
    assert.ok(!useMuseum.getState().progress.radioCalls.includes('porter-first-call'))
  }
  const reloaded = migrateProgress(JSON.parse(JSON.stringify(useMuseum.getState().progress)))
  assert.equal(nextRadioCall(radio, reloaded, MUSEUM)?.id, 'porter-first-call', 'still due after a reload')
  useMuseum.getState().advanceRadio()
  assert.equal(useMuseum.getState().radio, null)
  assert.deepEqual(useMuseum.getState().progress.radioCalls, ['porter-first-call'])

  // Then the next one in content order, then — and only then — a hint.
  assert.equal(placeRadioCall(RADIO, START + SECOND, fixed(0)), true)
  assert.equal(useMuseum.getState().radio?.callId, 'porter-radio-taken')
  finishTransmission()
  assert.deepEqual(useMuseum.getState().progress.radioCalls, ['porter-first-call', 'porter-radio-taken'])
  assert.equal(placeRadioCall(RADIO, START + 2 * SECOND, fixed(0)), true)
  assert.equal(useMuseum.getState().radio?.callId, undefined)
  assert.ok(useMuseum.getState().radio?.lineKeys.includes('radio.hint.atrium'))
  assert.equal(memoryOf().calls, 1)
  finishTransmission()
})

test('the director schedules only the first due call and waits for every modal', () => {
  const skipped = progressWith({ documentsRead: [], devicesCarried: [RADIO] })
  assert.equal(nextRadioCall(radio, skipped, MUSEUM)?.id, 'porter-first-call')
  assert.equal(
    nextRadioCall(radio, { ...skipped, radioCalls: ['porter-first-call'] }, MUSEUM)?.id,
    'porter-notebook-reminder',
  )
  assert.equal(nextRadioCall(radio, { ...skipped, radioCalls: ALL_CALLS }, MUSEUM), null)

  // What the director does when a call's timer fires, from real store states.
  const idle = { ...useMuseum.getState(), radio: null, examining: null, openedContainer: null, activeLock: null, journalTab: null }
  const busyOf = (state: typeof idle, hidden = false) => ({
    onAir: state.radio !== null,
    modal: isModalOpen(state),
    hidden,
  })
  assert.equal(radioDeliveryStep('ready', busyOf(idle)), 'play')
  assert.equal(radioDeliveryStep('gone', busyOf(idle)), 'drop', 'heard meanwhile, or its moment passed')
  assert.equal(radioDeliveryStep('gone', busyOf({ ...idle, journalTab: 'map' }, true)), 'drop', 'gone wins over busy')
  assert.equal(radioDeliveryStep('queued', busyOf(idle)), 'wait', 'an earlier call is still owed')
  for (const modal of [
    { examining: 'ball-spalding' },
    { openedContainer: 'office-notebook' },
    { activeLock: 'office-drawer' },
    { journalTab: 'catalogue' as const },
  ]) {
    assert.equal(radioDeliveryStep('ready', busyOf({ ...idle, ...modal })), 'wait', `waits for ${Object.keys(modal)[0]}`)
  }
  const onAir = {
    ...idle,
    radio: { serial: 1, index: 0, deviceId: RADIO, speakerKey: radio.speakerKey, lineKeys: ['radio.hint.vault'] },
  }
  assert.equal(radioDeliveryStep('ready', busyOf(onAir as unknown as typeof idle)), 'wait', 'never over another transmission')
  assert.equal(radioDeliveryStep('ready', busyOf(idle, true)), 'wait', 'never to a hidden tab')

  // The director asks those rules; nothing else decides or records a call.
  const devices = source('engine/Devices.tsx')
  const director = devices.slice(devices.indexOf('export function RadioDirector'), devices.indexOf('export function RadioHandset'))
  assert.ok(director.includes('nextRadioCall(device, progress, MUSEUM)'), 'one call at a time')
  assert.ok(!/dueRadioCalls\(/.test(director), 'never every due call at once')
  assert.ok(director.includes('radioDeliveryStep(radioCallReady(device, call.id, state.progress, MUSEUM)'))
  assert.ok(director.includes("hidden: document.visibilityState === 'hidden'"))
  assert.ok(director.includes('callId: call.id'), 'the call travels with its transmission')
  assert.ok(!devices.includes('recordRadioCall('), 'nothing records a call before its end')
})

test('a held call the player answered under the modal is dropped, not replayed', () => {
  // The lamp first, the notebook skipped: after his introduction the porter
  // asks for the notebook, and the player does as told, mid-line.
  newGame({ roomsPowered: ['office'], documentsRead: [], radioCalls: ['porter-first-call'] })
  assert.equal(nextRadioCall(radio, useMuseum.getState().progress, MUSEUM)?.id, 'porter-notebook-reminder')
  useMuseum.getState().startRadio({
    deviceId: RADIO,
    speakerKey: radio.speakerKey,
    lineKeys: ['radio.call.notebook.1'],
    callId: 'porter-notebook-reminder',
  })
  assert.equal(releaseHeldRadio(), false, 'nothing has changed yet')
  useMuseum.getState().recordDocument('doc-welcome')
  useMuseum.getState().setOpenedContainer('office-notebook')
  assert.equal(transmissionLapsed(useMuseum.getState().radio, useMuseum.getState().progress, MUSEUM), true)
  useMuseum.getState().setOpenedContainer(null)
  assert.equal(releaseHeldRadio(), true)
  assert.equal(useMuseum.getState().radio, null, 'not the same line again for its full time')
  assert.ok(useMuseum.getState().progress.radioCalls.includes('porter-notebook-reminder'), 'heard, never rescheduled')
  assert.equal(useMuseum.getState().radioHungUpUntil, null)

  // A call that still holds resumes in full: the introduction under the journal.
  newGame({ roomsPowered: ['office'], documentsRead: ['doc-welcome'] })
  useMuseum.getState().startRadio({
    deviceId: RADIO,
    speakerKey: radio.speakerKey,
    lineKeys: radio.calls[0].lineKeys,
    callId: 'porter-first-call',
  })
  useMuseum.getState().advanceRadio()
  useMuseum.getState().setJournalTab('map')
  useMuseum.getState().setJournalTab(null)
  assert.equal(releaseHeldRadio(), false)
  assert.equal(useMuseum.getState().radio?.index, 1, 'the held line carries on')
  assert.deepEqual(useMuseum.getState().progress.radioCalls, [])
  finishTransmission()
  useMuseum.getState().resetProgress()
})

test('a held hint the player answered under the modal is dropped too, recording nothing', () => {
  newGame({ roomsPowered: ['office'], documentsRead: [], radioCalls: ALL_CALLS, devicesCarried: [RADIO] })
  assert.equal(placeRadioCall(RADIO, START, fixed(0)), true)
  const answer = useMuseum.getState().radio
  assert.equal(answer?.lineKeys.at(-1), 'radio.hint.notebook')
  assert.deepEqual(answer?.validWhile, { documentsUnread: ['doc-welcome'] }, 'the hint travels with its condition')
  useMuseum.getState().recordDocument('doc-welcome')
  useMuseum.getState().setOpenedContainer('office-notebook')
  useMuseum.getState().setOpenedContainer(null)
  assert.equal(releaseHeldRadio(), true)
  assert.equal(useMuseum.getState().radio, null)
  assert.deepEqual(useMuseum.getState().progress.radioCalls, ALL_CALLS, 'a hint records nothing')
  assert.equal(memoryOf().calls, 1, 'and it still counted as the one call it was')

  // Taking the notebook moves the next answer on to the atrium.
  assert.equal(placeRadioCall(RADIO, START + SECOND, fixed(0)), true)
  assert.deepEqual(useMuseum.getState().radio?.validWhile, { unpowered: ['atrium'] })
  assert.equal(releaseHeldRadio(), false, 'still true: the atrium is still dark')
  finishTransmission()
  useMuseum.getState().resetProgress()

  // A tantrum carries no hint, and the last hint holds whatever happens.
  const tantrum = porterAnswer(
    radio,
    progressWith(),
    { ...FRESH_RADIO_MEMORY, temper: 6, lastHint: 1, lastCallAt: START },
    START,
    fixed(0),
    MUSEUM,
  )
  assert.equal(tantrum.outburst, true)
  assert.equal(tantrum.hintWhen, null)
  const done = progressWith({ roomsPowered: ['office', 'atrium', 'holyoke'], locksOpened: ['office-drawer'] })
  assert.deepEqual(porterAnswer(radio, done, FRESH_RADIO_MEMORY, START, fixed(0), MUSEUM).hintWhen, {})

  const lapsed = (transmission: Parameters<typeof transmissionLapsed>[0]) =>
    transmissionLapsed(transmission, progressWith(), MUSEUM)
  assert.equal(lapsed(null), false)
  assert.equal(lapsed({ deviceId: RADIO }), false, 'static never lapses')
  assert.equal(lapsed({ deviceId: RADIO, validWhile: {} }), false)
  assert.equal(lapsed({ deviceId: RADIO, callId: 'porter-renamed' }), false, 'nor a call no longer in the content')
  assert.equal(lapsed({ deviceId: RADIO, validWhile: { documentsUnread: ['doc-welcome'] } }), true)
  assert.equal(lapsed({ deviceId: RADIO, callId: 'porter-notebook-reminder' }), true)
  assert.equal(lapsed({ deviceId: RADIO, callId: 'porter-first-call' }), false, 'its own when, not content order')

  // Dropping is not hanging up: the line that would have ended in it was never said.
  newGame({ roomsPowered: ['office'] })
  useMuseum.getState().startRadio({ deviceId: RADIO, speakerKey: radio.speakerKey, lineKeys: ['radio.hint.vault'], hangsUpFor: 12 })
  useMuseum.getState().dropRadio()
  assert.equal(useMuseum.getState().radio, null)
  assert.equal(useMuseum.getState().radioHungUpUntil, null)
  useMuseum.getState().resetProgress()

  const hud = source('ui/Hud.tsx')
  const subtitles = hud.slice(hud.indexOf('function RadioSubtitles'), hud.indexOf('function DocumentPanel'))
  assert.ok(subtitles.includes('if (released) releaseHeldRadio()'), 'asked as the hold ends')
  assert.ok(subtitles.includes('useLayoutEffect('), 'before the lapsed line can paint')
})

test('a skipped call is still heard; a hint ends without recording anything', () => {
  newGame({ roomsPowered: ['office'], documentsRead: ['doc-welcome'] })
  useMuseum.getState().startRadio({
    deviceId: RADIO,
    speakerKey: radio.speakerKey,
    lineKeys: ['radio.call.first.1', 'radio.call.first.2'],
    callId: 'porter-first-call',
  })
  assert.deepEqual(useMuseum.getState().progress.radioCalls, [])
  finishTransmission()
  assert.deepEqual(useMuseum.getState().progress.radioCalls, ['porter-first-call'], 'exactly once')

  useMuseum.getState().startRadio({ deviceId: RADIO, speakerKey: radio.speakerKey, lineKeys: ['radio.hint.atrium'] })
  finishTransmission()
  assert.deepEqual(useMuseum.getState().progress.radioCalls, ['porter-first-call'])
  assert.equal(useMuseum.getState().radioHungUpUntil, null, 'a plain answer never hangs up')
})

// ---------------------------------------------------------------------------
// 4–8. The porter's patience
// ---------------------------------------------------------------------------

test('the first calls are pure help, whatever the dice says', () => {
  const progress = progressWith()
  let memory: RadioMemory = FRESH_RADIO_MEMORY
  for (const call of [1, 2]) {
    const answer = porterAnswer(radio, progress, memory, START + call * 5 * SECOND, fixed(0), MUSEUM)
    assert.equal(answer.tier, 0, `call ${call} is helpful`)
    assert.equal(answer.outburst, false)
    assert.equal(answer.hangUpSeconds, 0)
    assert.equal(answer.lineKeys.at(-1), 'radio.hint.atrium', 'the hint, in full')
    assert.ok(patience.tiers[0].replies.some((reply) => reply.id === answer.replyId))
    memory = answer.memory
  }
  assert.equal(memory.calls, 2)
})

test('insisting wears his patience down, and the hint turns curt', () => {
  const progress = progressWith()
  let memory: RadioMemory = FRESH_RADIO_MEMORY
  const tiers: number[] = []
  for (let call = 0; call < 12; call += 1) {
    const answer = porterAnswer(radio, progress, memory, START + call * 5 * SECOND, fixed(0.99), MUSEUM)
    tiers.push(answer.tier)
    assert.equal(answer.outburst, false, '0.99 never rolls a tantrum')
    const curt = patience.tiers[answer.tier].hint === 'curt'
    assert.ok(answer.lineKeys.includes(curt ? 'radio.hint.atrium.curt' : 'radio.hint.atrium'))
    memory = answer.memory
  }
  assert.deepEqual(tiers, [0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4])
  assert.equal(patience.tiers[3].hint, 'curt', 'curt from the impatient tier on')
  assert.equal(patienceTierFor(patience, 1), 0)
  assert.equal(patienceTierFor(patience, 99), patience.tiers.length - 1)
})

test('he never hangs up twice running, and the call after a tantrum helps', () => {
  const progress = progressWith()
  let memory: RadioMemory = { ...FRESH_RADIO_MEMORY, temper: 6, lastHint: 1, lastCallAt: START }
  const outbursts: boolean[] = []
  const seen: string[] = []
  for (let call = 0; call < 8; call += 1) {
    const answer = porterAnswer(radio, progress, memory, START + call * 5 * SECOND, fixed(0), MUSEUM)
    outbursts.push(answer.outburst)
    if (answer.outburst) {
      assert.ok(!answer.lineKeys.some((key) => HINT_LINES.has(key)), 'a tantrum has no hint')
      assert.ok(answer.replyId && !seen.includes(answer.replyId), 'a different tantrum each time')
      seen.push(answer.replyId)
    } else {
      assert.ok(answer.lineKeys.includes('radio.hint.atrium.curt'), 'the next call helps')
    }
    memory = answer.memory
  }
  assert.deepEqual(outbursts, [true, false, true, false, true, false, true, false])
  const hangUps = seen.map((id) => patience.tiers.flatMap((tier) => tier.outbursts ?? []).find((o) => o.id === id))
  assert.equal(hangUps[0]?.hangsUp, true)
})

test('no joke is told twice in a row, and the hint is never left out but in a tantrum', () => {
  const dice = seeded(1895)
  const pace = seeded(1896)
  let memory: RadioMemory = FRESH_RADIO_MEMORY
  let previous: string | null = null
  let now = START
  let tantrums = 0
  const told = new Set<string>()
  const tiers = new Set<number>()
  for (let call = 0; call < 400; call += 1) {
    // Anything from a mashed key to a twelve-minute silence between calls.
    now += 5 * SECOND + Math.floor(pace() * 12 * 60 * SECOND)
    const progress = progressWith({ documentsRead: call < 200 ? [] : ['doc-welcome'] })
    const answer = porterAnswer(radio, progress, memory, now, dice, MUSEUM)
    assert.notEqual(answer.replyId, previous, `call ${call} repeats "${previous}"`)
    assert.ok(answer.outburst || answer.lineKeys.some((key) => HINT_LINES.has(key)), `call ${call} helps`)
    assert.ok(answer.memory.temper <= patience.tiers[patience.tiers.length - 1].fromCall, 'a ceiling on his temper')
    if (answer.outburst) tantrums += 1
    if (answer.replyId) told.add(answer.replyId)
    tiers.add(answer.tier)
    previous = answer.replyId
    memory = answer.memory
  }
  assert.equal(tiers.size, patience.tiers.length, 'every tier answers at some point')
  assert.ok(tantrums > 10, 'he does lose it now and then')
  assert.ok(told.size > 25, `and has plenty to say (${told.size})`)
})

test('the notebook hint stays inside his patience, curt or not', () => {
  const unread = progressWith({ documentsRead: [] })
  const polite = porterAnswer(radio, unread, FRESH_RADIO_MEMORY, START, fixed(0), MUSEUM)
  assert.equal(polite.lineKeys.at(-1), 'radio.hint.notebook')
  const tired = { ...FRESH_RADIO_MEMORY, temper: 9, lastHint: 0, lastCallAt: START }
  const curt = porterAnswer(radio, unread, tired, START + SECOND, fixed(0.99), MUSEUM)
  assert.equal(curt.tier, 4)
  assert.ok(curt.lineKeys.includes('radio.hint.notebook.curt'))
})

test('silence calms him, and progress forgives and earns praise', () => {
  const progress = progressWith()
  const tired: RadioMemory = { ...FRESH_RADIO_MEMORY, calls: 9, temper: 9, lastHint: 1, lastCallAt: START }
  const later = START + 4 * patience.calmSecondsPerCall * SECOND
  assert.equal(calmedTemper(patience, tired, later, 1), 5)
  assert.equal(porterAnswer(radio, progress, tired, later, fixed(0.99), MUSEUM).tier, 2)
  assert.equal(calmedTemper(patience, tired, START - 60 * SECOND, 1), 9, 'a clock going back calms nobody')

  // The atrium is lit since he last spoke: the hint moved on.
  const furious: RadioMemory = { ...tired, temper: 10 }
  const lit = progressWith({ roomsPowered: ['office', 'atrium'] })
  assert.equal(calmedTemper(patience, furious, START + SECOND, 2), 9)
  const praised = porterAnswer(radio, lit, furious, START + SECOND, fixed(0), MUSEUM)
  assert.equal(praised.outburst, false, 'no tantrum on the call after progress')
  assert.ok(praised.replyId?.startsWith('porter-praise-'), 'praise instead of a dig')
  assert.ok(praised.lineKeys.includes('radio.hint.holyoke.curt'))
  assert.equal(praised.memory.lastHint, 2)
})

// ---------------------------------------------------------------------------
// 9. Hanging up
// ---------------------------------------------------------------------------

test('a hang-up leaves only dead air for a while, then he answers again', () => {
  const before = Date.now()
  newGame({
    devicesCarried: [RADIO],
    radioCalls: ALL_CALLS,
    roomsPowered: ['office'],
    documentsRead: ['doc-welcome'],
    radioMemory: { [RADIO]: { ...FRESH_RADIO_MEMORY, calls: 6, temper: 6, lastHint: 1, lastCallAt: before } },
  })
  assert.equal(placeRadioCall(RADIO, before, fixed(0)), true)
  const tantrum = useMuseum.getState().radio
  assert.equal(tantrum?.hangsUpFor, patience.hangUpSeconds)
  assert.equal(memoryOf().calls, 7)
  assert.equal(useMuseum.getState().radioHungUpUntil, null, 'he hangs up when he has finished')
  finishTransmission()
  const until = useMuseum.getState().radioHungUpUntil
  assert.ok(until !== null && until >= before + patience.hangUpSeconds * SECOND)

  assert.equal(placeRadioCall(RADIO, Date.now(), fixed(0)), true)
  const air = useMuseum.getState().radio
  assert.equal(air?.speakerKey, patience.deadAirSpeakerKey)
  assert.equal(ptBR[air?.speakerKey as keyof typeof ptBR], 'Rádio')
  assert.ok(air?.lineKeys.every((key) => key.startsWith('radio.deadAir.')))
  assert.equal(memoryOf().calls, 7, 'static is not a call')
  finishTransmission()
  assert.equal(placeRadioCall(RADIO, Date.now(), fixed(0)), true)
  assert.notDeepEqual(useMuseum.getState().radio?.lineKeys, air?.lineKeys, 'the static changes too')
  finishTransmission()

  assert.equal(placeRadioCall(RADIO, (until ?? 0) + SECOND, fixed(0)), true)
  const back = useMuseum.getState().radio
  assert.equal(back?.speakerKey, 'radio.speaker.porter')
  assert.ok(back?.lineKeys.includes('radio.hint.atrium.curt'), 'and the first answer back helps')
  assert.equal(memoryOf().calls, 8)
  finishTransmission()

  useMuseum.getState().clearRadioHangUp()
  assert.equal(useMuseum.getState().radioHungUpUntil, null)
  useMuseum.setState({ radioHungUpUntil: Date.now() + 5000 })
  useMuseum.getState().resetProgress()
  assert.equal(useMuseum.getState().radioHungUpUntil, null, 'a new game, a new mood')
  assert.equal(deadAirFor({ deadAir: [] }, fixed(0), null), null)
})

// ---------------------------------------------------------------------------
// 10. Saves
// ---------------------------------------------------------------------------

test('old saves gain the radio fields without losing progress', () => {
  const old = migrateProgress({
    version: SAVE_VERSION,
    radioCalls: ['porter-first-call'],
    roomsPowered: ['office'],
    documentsRead: ['doc-welcome'],
    catalogued: ['ball-spalding'],
  })
  assert.deepEqual(old.devicesCarried, [], 'its radio waits on the desk')
  assert.deepEqual(old.radioMemory, {})
  assert.deepEqual(old.catalogued, ['ball-spalding'])
  assert.deepEqual(old.radioCalls, ['porter-first-call'])
  assert.equal(nextRadioCall(radio, old, MUSEUM), null, 'nothing replays at them')

  const junk = migrateProgress({
    version: SAVE_VERSION,
    radioCalls: [],
    devicesCarried: 'office-radio',
    radioMemory: [1, 2],
  })
  assert.deepEqual(junk.devicesCarried, [])
  assert.deepEqual(junk.radioMemory, {})

  const mixed = migrateProgress({
    version: SAVE_VERSION,
    radioCalls: [],
    devicesCarried: [RADIO, 7],
    radioMemory: {
      [RADIO]: { calls: 3.7, temper: 2, lastCallAt: START, lastHint: -1, lastReplyId: 4 },
      broken: { calls: Number.NaN, temper: 1, lastCallAt: 0, lastHint: 0 },
      negative: { calls: 1, temper: -2, lastCallAt: 0, lastHint: 0 },
      hint: { calls: 1, temper: 1, lastCallAt: 0, lastHint: -5 },
    },
  })
  assert.deepEqual(mixed.devicesCarried, [RADIO])
  assert.deepEqual(mixed.radioMemory, {
    [RADIO]: { calls: 3, temper: 2, lastCallAt: START, lastHint: -1, lastReplyId: null, lastOutburstId: null },
  })

  assert.deepEqual(migrateProgress({ version: SAVE_VERSION + 1, devicesCarried: [RADIO] }).devicesCarried, [])

  // What the store writes, it reads back.
  newGame({ devicesCarried: [RADIO], radioCalls: ALL_CALLS })
  placeRadioCall(RADIO, START, fixed(0.3))
  finishTransmission()
  const saved = JSON.parse(JSON.stringify(useMuseum.getState().progress))
  assert.deepEqual(migrateProgress(saved).radioMemory, useMuseum.getState().progress.radioMemory)
  useMuseum.getState().resetProgress()
})

// ---------------------------------------------------------------------------
// 12. The gate
// ---------------------------------------------------------------------------

/** The content with the office radio replaced by `patch(radio)`. */
function withRadio(patch: (device: typeof radio) => object): MuseumContent {
  return {
    ...MUSEUM,
    rooms: MUSEUM.rooms.map((room) => ({
      ...room,
      devices: (room.devices ?? []).map((device) =>
        device.kind === 'radio' ? { ...device, ...patch(device as typeof radio) } : device,
      ),
    })),
  } as MuseumContent
}
const codesOf = (content: MuseumContent) => validateOpening(content).map((issue) => issue.code)

test('the validator catches a broken temper', () => {
  const real = validateOpening(MUSEUM).filter((issue) => issue.code.startsWith('radio-') || issue.code.startsWith('condition-'))
  assert.deepEqual(real, [], 'the authored porter is clean, warnings included')

  const tiers = patience.tiers
  const broken = (patch: Partial<RadioPatience>) => withRadio(() => ({ patience: { ...patience, ...patch } }))
  assert.ok(codesOf(broken({ tiers: [{ ...tiers[0], fromCall: 3 }, ...tiers.slice(1)] })).includes('radio-patience-first-tier'))
  assert.ok(codesOf(broken({ tiers: [tiers[0], tiers[2], tiers[1]] })).includes('radio-patience-order'))
  assert.ok(
    codesOf(broken({ tiers: [{ ...tiers[0], replies: [...tiers[0].replies, tiers[0].replies[0]] }, ...tiers.slice(1)] })).includes(
      'radio-reply-duplicate',
    ),
  )
  assert.ok(codesOf(broken({ tiers: [{ ...tiers[0], replies: [] }, ...tiers.slice(1)] })).includes('radio-patience-silent'))
  assert.ok(codesOf(broken({ hangUpSeconds: 120 })).includes('radio-hang-up-time'))
  assert.ok(codesOf(broken({ calmSecondsPerCall: 0 })).includes('radio-patience-calm'))
  assert.ok(codesOf(broken({ progressForgives: 0.5 })).includes('radio-patience-forgive'))
  assert.ok(codesOf(broken({ deadAir: [] })).includes('radio-dead-air-missing'))
  assert.ok(
    codesOf(broken({ tiers: [...tiers.slice(0, 3), { ...tiers[3], outburstChance: 1 }, tiers[4]] })).includes(
      'radio-outburst-chance',
    ),
  )
  assert.ok(
    codesOf(
      withRadio((device) => ({
        calls: [...device.calls, { id: 'porter-nope', when: { carried: ['nope'] }, delaySeconds: 1, lineKeys: ['radio.call.taken.1'] }],
      })),
    ).includes('condition-device-missing'),
  )
  const politeOnly = validateOpening(withRadio((device) => ({ hints: device.hints.map(({ curtLineKeys: _, ...hint }) => hint) })))
  assert.ok(politeOnly.some((issue) => issue.code === 'radio-curt-missing' && issue.severity === 'warning'))
})

// ---------------------------------------------------------------------------
// 13. Every line exists and fits
// ---------------------------------------------------------------------------

test('every line of his exists in both languages and fits a subtitle', () => {
  const answers = [
    ...patience.tiers.flatMap((tier) => [...tier.replies, ...(tier.outbursts ?? [])]),
    ...(patience.praise ?? []),
    ...patience.deadAir,
  ]
  const patienceLines = [
    ...answers.flatMap((answer) => [...answer.lineKeys, ...('closingKeys' in answer ? (answer.closingKeys ?? []) : [])]),
    ...radio.hints.flatMap((hint) => hint.curtLineKeys ?? []),
    ...(radio.calls.find((call) => call.id === 'porter-radio-taken')?.lineKeys ?? []),
  ]
  assert.ok(patienceLines.length >= 50, `${patienceLines.length} lines`)
  for (const key of patienceLines) {
    for (const [language, dictionary] of [['pt-BR', ptBR], ['en', en]] as const) {
      const text = (dictionary as Record<string, string>)[key]
      assert.ok(text, `${key} exists in ${language}`)
      assert.ok(text.length <= 110, `${key} (${language}) is ${text.length} characters`)
    }
  }
  // Every radio line, old ones included, gets its full reading time.
  for (const key of [...radio.calls.flatMap((call) => call.lineKeys), ...HINT_LINES, ...patienceLines]) {
    for (const dictionary of [ptBR, en]) {
      const text = (dictionary as Record<string, string>)[key]
      assert.ok(radioLineSeconds(text) < 9, `${key} is cut short: ${text.length} characters`)
    }
  }
  for (const key of ['radio.taken', 'radio.taken.keyboard', 'radio.taken.touch', 'ui.radio.hungUp', 'radio.speaker.static'] as const) {
    assert.ok(ptBR[key] && en[key], key)
  }
  assert.ok(ptBR['radio.call.first.4'].includes('pega o rádio aí na mesa'), 'the first call says to take it')
  assert.ok(/portaria/.test(ptBR['radio.patience.t2.reception']) && /átrio/.test(ptBR['radio.patience.t2.reception']))
  // In English he calls his post the front desk, which IS reception: the
  // joke that he is not reception cannot be told there.
  assert.ok(/front desk/.test(en['radio.call.first.1']))
  assert.ok(!/reception/i.test(en['radio.patience.t2.reception']), 'no "not reception" from the front desk')
  // Helena signs the notebook these lines are about, so they say who she is.
  for (const key of ['radio.call.notebook.1', 'radio.hint.notebook'] as const) {
    assert.ok(/Helena/.test(ptBR[key]) && /diretora/.test(ptBR[key]), `${key} (pt-BR) introduces her`)
    assert.ok(/Helena/.test(en[key]) && /director/.test(en[key]), `${key} (en) introduces her`)
  }
  assert.ok(!/humming/.test(en['radio.patience.t5.song.1']), 'nobody hums words')
  assert.ok(!/Only not/.test(en['radio.call.taken.2']))
})

// ---------------------------------------------------------------------------
// The subtitles and the HUD (#5, #13, the skip button, the touch column)
// ---------------------------------------------------------------------------

test('a line holds, hidden, under any modal and crackles once', () => {
  const line = { serial: 4, index: 1 }
  assert.equal(radioHeld({ modal: false, hidden: false }), false)
  assert.equal(radioHeld({ modal: true, hidden: false }), true)
  assert.equal(radioHeld({ modal: false, hidden: true }), true, 'a hidden tab holds it too')
  assert.equal(radioLineDelayMs(line, radioHeld({ modal: false, hidden: true }), 4), null)
  assert.equal(radioLineDelayMs(null, false, 4), null)
  assert.equal(radioLineDelayMs(line, true, radioLineSeconds('Câmbio.')), null, 'held under a modal')
  assert.equal(radioLineDelayMs(line, false, radioLineSeconds('Câmbio.')), radioLineSeconds('Câmbio.') * 1000)

  assert.equal(shouldCrackle(null, { serial: 4, index: 0 }), false, 'the squelch opened the channel')
  assert.equal(shouldCrackle(radioLineMark({ serial: 4, index: 0 }), line), true)
  assert.equal(shouldCrackle(radioLineMark(line), line), false, 'released from a modal: no second crackle')
  assert.equal(shouldCrackle(radioLineMark(line), { serial: 5, index: 0 }), false)
  assert.equal(shouldCrackle(radioLineMark(line), null), false)

  const hud = source('ui/Hud.tsx')
  const subtitles = hud.slice(hud.indexOf('function RadioSubtitles'), hud.indexOf('function DocumentPanel'))
  assert.ok(subtitles.includes('useMuseum(isModalOpen)'), 'the same modals the director waits for')
  assert.ok(subtitles.includes('radioHeld({ modal, hidden })') && subtitles.includes('useDocumentHidden()'))
  assert.ok(subtitles.includes('radioLineDelayMs(radio, held, radioLineSeconds(line))'))
  // The title screen imports hudRules: it must stay free of runtime imports.
  assert.ok(!/^import (?!type )/m.test(source('ui/hudRules.ts')), 'hudRules has type imports only')
  assert.ok(subtitles.includes('if (!radio || held) return null'), 'hidden, not left under the veil')
  assert.ok(!/onClick=\{advance\}/.test(hud), 'the click event never reaches advanceRadio')
  assert.ok(subtitles.includes('onClick={() => advance()}'))
})

test('the radio tool shows who is talking, a hang-up, and its first lesson', () => {
  assert.deepEqual(radioToolState({ onAir: true, hungUp: true, calls: 0 }), {
    modifiers: ['is-on-air'],
    labelKey: 'radio.skip',
  })
  assert.deepEqual(radioToolState({ onAir: false, hungUp: true, calls: 3 }), {
    modifiers: ['is-hung-up'],
    labelKey: 'ui.radio.hungUp',
  })
  assert.deepEqual(radioToolState({ onAir: false, hungUp: false, calls: 0 }).modifiers, ['is-hinting'])
  assert.deepEqual(radioToolState({ onAir: false, hungUp: false, calls: 2 }), {
    modifiers: [],
    labelKey: 'prompt.radio.call',
  })
  assert.equal(shouldAnnounceTaken({ taken: true, waiting: false, alreadyShown: false }), true)
  assert.equal(shouldAnnounceTaken({ taken: true, waiting: false, alreadyShown: true }), false)
  assert.equal(shouldAnnounceTaken({ taken: false, waiting: false, alreadyShown: false }), false)
  assert.equal(progressConditionMet({ carried: [RADIO] }, progressWith(), MUSEUM), false)
  assert.equal(progressConditionMet({ carried: [RADIO] }, progressWith({ devicesCarried: [RADIO] }), MUSEUM), true)
})

test('the touch column keeps the torch nearest the thumb', () => {
  const hud = source('ui/Hud.tsx')
  const tools = hud.slice(hud.indexOf('function HudTools'), hud.indexOf('function LookHint'))
  const order = ['<RadioTool', 'is-journal', 'is-torch'].map((marker) => tools.indexOf(marker))
  assert.ok(order.every((index) => index > 0), 'all three tools are there')
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'radio, notebook, torch — torch last')

  const css = readFileSync(new URL('../src/styles/museum.css', import.meta.url), 'utf8')
  const coarse = css.slice(css.indexOf('/* A column directly above the right-hand stick'))
  const rule = coarse.slice(coarse.indexOf('.hud-tools {'), coarse.indexOf('}'))
  assert.ok(/flex-direction:\s*column;/.test(rule), 'a plain column: the last child is the bottom one')
  assert.ok(!/flex-direction:\s*column-reverse/.test(css), 'nothing flips the tools back')
  assert.ok(/\.hud-tool\.is-radio\.is-on-air/.test(css) && /\.hud-tool\.is-radio\.is-hung-up/.test(css))
})

console.log(`\n${passed}/${passed} radio checks passed.\n`)
