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
import { readdirSync } from 'node:fs'

import { Group, Mesh, Vector3 } from 'three'

import { BAKED_BUNDLES } from '../src/content/bake.generated.ts'
import { en } from '../src/content/i18n/en.ts'
import { ptBR } from '../src/content/i18n/pt-BR.ts'
import { PRE_OPENING_SAVE, PRE_POSSE_SAVE } from '../src/content/legacySave.ts'
import { MUSEUM } from '../src/content/museum.ts'
import { fixtureLot, SAVE_FIXTURES } from '../src/content/saveFixtures.ts'
import type { MuseumContent, ProgressCondition, RadioPatience } from '../src/content/schema.ts'
import { validateBake, validateOpening } from '../src/content/validate.ts'
import {
  aimableDevices,
  deskRadioIntent,
  deviceInputOf,
  deviceIntent,
  deviceLive,
  dueRadioCalls,
  MESSAGE_LAMP_PERIOD_SECONDS,
  messageLampLit,
  nextRadioCall,
  radioCallReady,
  radioDeliveryStep,
  radioDevices,
  radioHintFor,
  radioHintIndex,
  radioLineSeconds,
  radioWithinEarshot,
  transmissionLapsed,
  voiceUtterance,
} from '../src/engine/deviceRules.ts'
import {
  aimableDeviceId,
  deviceIdFor,
  hiddenInScene,
  isLensNode,
  placeHandset,
  prepareHandset,
} from '../src/engine/deviceNodes.ts'
import { conditionClass, progressConditionMet } from '../src/engine/progressCondition.ts'
import { recordingGrant } from '../src/engine/progressGrants.ts'
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
import { devicePrompt } from '../src/ui/promptRules.ts'
import { operateVoice, operateVoiceOn } from '../src/engine/voiceDevice.ts'
import { readText } from './lib/readText.ts'

let passed = 0
let failed = 0
/** Records a failure and goes on, so one run shows everything that is wrong. */
function test(name: string, run: () => void) {
  try {
    run()
  } catch (error) {
    failed += 1
    console.log(`  FAIL  ${name}`)
    console.log(String(error instanceof Error ? error.message : error).replace(/^/gm, '        '))
    return
  }
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
const HINT_LINES = new Set(radio.hints.flatMap((hint) => [...hint.heightKeys, ...(hint.curtLineKeys ?? [])]))
/** The lines of a hint in an answer: what is left once the opener and its closing line are set aside. */
const hintLinesOf = (answer: { readonly lineKeys: readonly string[] }) => answer.lineKeys.filter((key) => HINT_LINES.has(key))

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
const source = (path: string) => readText(new URL(`../src/${path}`, import.meta.url))

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
    ['porter-hello', 'porter-first-call', 'porter-radio-taken'],
  )
  assert.equal(radioCallReady(radio, 'porter-radio-taken', progress, MUSEUM), 'queued')
  assert.equal(radioCallReady(radio, 'porter-radio-taken', { ...progress, radioCalls: ['porter-hello'] }, MUSEUM), 'queued')
  assert.equal(
    radioCallReady(radio, 'porter-radio-taken', { ...progress, radioCalls: ['porter-hello', 'porter-first-call'] }, MUSEUM),
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
  // Both ask it through the one door every device goes through
  // (`deviceIntent`, which hands a radio to the rule above): the prompt and
  // E cannot word the radio apart, nor a radio apart from any other device.
  for (const file of ['ui/Hud.tsx', 'engine/Devices.tsx']) {
    assert.ok(source(file).includes('deviceIntent('), `${file} asks the same intent`)
    assert.ok(!source(file).includes('deskRadioIntent('), `${file} asks it of the radio's rule directly, past the shared door`)
  }
  assert.deepEqual(deviceIntent(radio, { powered: true, carried: false, speaking: true, set: false }), { kind: 'radio', intent: 'take' })
  assert.deepEqual(deviceIntent(radio, { powered: false, carried: true, speaking: false, set: false }), { kind: 'radio', intent: 'dead' })
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

test('the scan aims at the devices that answer, never at a radio in hand', () => {
  // What the crosshair may rest on is the content's to say (`aimableDevices`):
  // the radio on its desk and, since L3, a thing that only says something
  // and a clock that can be put right. A door reader answers nothing.
  const aimable = new Set(aimableDevices(MUSEUM).map((entry) => entry.device.id))
  assert.ok(aimable.has(RADIO) && aimable.has('atrium-podium') && aimable.has('office-clock') && !aimable.has('office-door-reader'))
  assert.equal(aimableDeviceId(`device:${RADIO}`, aimable, []), RADIO)
  assert.equal(aimableDeviceId(`device:${RADIO}`, aimable, [RADIO]), null, 'its proxy stays off the ray layer')
  assert.equal(aimableDeviceId('device:atrium-podium', aimable, [RADIO]), 'atrium-podium', 'a notice is aimed at like the radio')
  assert.equal(aimableDeviceId('device:office-door-reader', aimable, []), null, 'a door reader is not operated')
  assert.equal(aimableDeviceId(RADIO, aimable, []), null, 'only the wrapper names a device')

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
  for (const helper of ['aimableDeviceId(object.name, AIMABLE_BY_ID, carried)', 'hiddenInScene(hit.object)', 'placeHandset(handset, carried)']) {
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
  assert.ok(on?.lineKeys.includes('radio.hint.atrium.where'))
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
  assert.equal(radio.calls[0].id, 'porter-hello')
  assert.equal(first?.callId, 'porter-hello')
  assert.deepEqual(first?.lineKeys, radio.calls[0].lineKeys)
  assert.equal(memoryOf().calls, 0, 'his introduction is not the player pestering him')

  // Recorded only when the last line ends: a reload mid-call hears it again.
  for (let line = 1; line < radio.calls[0].lineKeys.length; line += 1) {
    useMuseum.getState().advanceRadio()
    assert.ok(!useMuseum.getState().progress.radioCalls.includes('porter-hello'))
  }
  const reloaded = migrateProgress(JSON.parse(JSON.stringify(useMuseum.getState().progress)))
  assert.equal(nextRadioCall(radio, reloaded, MUSEUM)?.id, 'porter-hello', 'still due after a reload')
  useMuseum.getState().advanceRadio()
  assert.equal(useMuseum.getState().radio, null)
  assert.deepEqual(useMuseum.getState().progress.radioCalls, ['porter-hello'])

  // Then the next ones in content order, then — and only then — a hint.
  for (const [press, id] of ['porter-first-call', 'porter-radio-taken'].entries()) {
    assert.equal(placeRadioCall(RADIO, START + (press + 1) * SECOND, fixed(0)), true)
    assert.equal(useMuseum.getState().radio?.callId, id)
    finishTransmission()
  }
  assert.deepEqual(useMuseum.getState().progress.radioCalls, ['porter-hello', 'porter-first-call', 'porter-radio-taken'])
  assert.equal(memoryOf().calls, 0, 'none of the three was a call of the player\'s')
  assert.equal(placeRadioCall(RADIO, START + 3 * SECOND, fixed(0)), true)
  assert.equal(useMuseum.getState().radio?.callId, undefined)
  assert.ok(useMuseum.getState().radio?.lineKeys.includes('radio.hint.atrium.where'))
  assert.equal(memoryOf().calls, 1)
  finishTransmission()
})

test('the director schedules only the first due call and waits for every modal', () => {
  const skipped = progressWith({ documentsRead: [], devicesCarried: [RADIO] })
  assert.equal(nextRadioCall(radio, skipped, MUSEUM)?.id, 'porter-hello')
  assert.equal(nextRadioCall(radio, { ...skipped, radioCalls: ['porter-hello'] }, MUSEUM)?.id, 'porter-first-call')
  assert.equal(
    nextRadioCall(radio, { ...skipped, radioCalls: ['porter-hello', 'porter-first-call'] }, MUSEUM)?.id,
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
    radio: { serial: 1, index: 0, deviceId: RADIO, speakerKey: radio.speakerKey, lineKeys: ['radio.hint.rest'] },
  }
  assert.equal(radioDeliveryStep('ready', busyOf(onAir as unknown as typeof idle)), 'wait', 'never over another transmission')
  assert.equal(radioDeliveryStep('ready', busyOf(idle, true)), 'wait', 'never to a hidden tab')
  assert.equal(radioDeliveryStep('ready', { ...busyOf(idle), away: true }), 'wait', 'never to a radio nobody can hear')

  // A radio left on its charger speaks only to its own room; in the hand it
  // speaks everywhere; one that is never carried was always heard anywhere.
  const office = radioDevices(MUSEUM).find((entry) => entry.device.id === RADIO)!.room.id
  assert.equal(radioWithinEarshot(radio, office, [], office), true, 'on the desk, heard in the office')
  assert.equal(radioWithinEarshot(radio, office, [], 'atrium'), false, 'on the desk, not from the atrium')
  assert.equal(radioWithinEarshot(radio, office, [RADIO], 'atrium'), true, 'in the hand, heard anywhere')
  assert.equal(radioWithinEarshot({ ...radio, carriedOnUse: false }, office, [], 'atrium'), true)

  // The director asks those rules; nothing else decides or records a call.
  const devices = source('engine/Devices.tsx')
  const director = devices.slice(devices.indexOf('export function RadioDirector'), devices.indexOf('export function RadioHandset'))
  assert.ok(director.includes('nextRadioCall(device, progress, MUSEUM)'), 'one call at a time')
  assert.ok(!/dueRadioCalls\(/.test(director), 'never every due call at once')
  assert.ok(director.includes('radioDeliveryStep(radioCallReady(device, call.id, state.progress, MUSEUM)'))
  assert.ok(director.includes("hidden: document.visibilityState === 'hidden'"))
  assert.ok(
    director.includes('away: !radioWithinEarshot(device, room.id, state.progress.devicesCarried, state.currentRoom)'),
    'a call waits for the player to be within earshot',
  )
  assert.ok(director.includes('callId: call.id'), 'the call travels with its transmission')
  assert.ok(!devices.includes('recordRadioCall('), 'nothing records a call before its end')
})

test('a held call the player answered under the modal is dropped, not replayed', () => {
  // The lamp first, the notebook skipped: after his introduction the porter
  // asks for the notebook, and the player does as told, mid-line.
  newGame({ roomsPowered: ['office'], documentsRead: [], radioCalls: ['porter-hello', 'porter-first-call'] })
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
    callId: 'porter-hello',
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
  assert.equal(answer?.lineKeys.at(-1), 'radio.hint.notebook.where')
  assert.deepEqual(
    answer?.validWhile,
    { documentsUnread: ['doc-welcome'], roomsUnvisited: ['atrium'] },
    'the hint travels with its condition',
  )
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
  useMuseum.getState().startRadio({ deviceId: RADIO, speakerKey: radio.speakerKey, lineKeys: ['radio.hint.rest'], hangsUpFor: 12 })
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

  useMuseum.getState().startRadio({ deviceId: RADIO, speakerKey: radio.speakerKey, lineKeys: ['radio.hint.atrium.where'] })
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
    assert.equal(answer.lineKeys.at(-1), ['radio.hint.atrium.where', 'radio.hint.atrium.what'][call - 1], 'the hint, in full, one height to a call')
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
    // In full, one of its heights; curt, the one line that has none.
    assert.deepEqual(hintLinesOf(answer).length, 1)
    assert.match(hintLinesOf(answer)[0], curt ? /^radio\.hint\.atrium\.curt$/ : /^radio\.hint\.atrium\.(?:where|what|how)$/)
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
  assert.equal(polite.lineKeys.at(-1), 'radio.hint.notebook.where')
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
  assert.equal(deadAirFor({ deadAir: [] }, progressWith(), MUSEUM, fixed(0), null), null)
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
  // A piece checked before the porter had a line for it is not news (L3).
  assert.deepEqual(old.radioCalls, ['porter-first-call', 'porter-first-catalogued'])
  // He introduces himself once, and nothing else replays at them.
  assert.equal(nextRadioCall(radio, old, MUSEUM)?.id, 'porter-hello')
  assert.equal(nextRadioCall(radio, { ...old, radioCalls: [...old.radioCalls, 'porter-hello'] }, MUSEUM), null, 'something replays at them')

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
    // A memory from before the hint had heights starts every hint from where.
    [RADIO]: { calls: 3, temper: 2, lastCallAt: START, lastHint: -1, hintHeight: 0, lastReplyId: null, lastOutburstId: null },
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
// 11. L3: a call for every milestone, a hint that climbs, answers that look
// ---------------------------------------------------------------------------

const callOf = (id: string) => {
  const call = radio.calls.find((candidate) => candidate.id === id)
  assert.ok(call, `the porter has a call "${id}"`)
  return call
}
const met = (condition: ProgressCondition, progress: Progress) => progressConditionMet(condition, progress, MUSEUM)
const SHORTCUT = 'atrium-from-holyoke-shortcut'
test('the porter has eight calls, said in this order, and the id every save knows still means the hall breaker (DL3-2)', () => {
  assert.deepEqual(ALL_CALLS, [
    'porter-hello',
    'porter-first-call',
    'porter-notebook-reminder',
    'porter-radio-taken',
    'porter-atrium-service',
    'porter-holyoke-lit',
    'porter-first-catalogued',
    'porter-shortcut',
  ])
  // `porter-first-call` is in every save, in the opening migration and in
  // the record of L2: it keeps its id and its moment, and is the instruction
  // alone. Who he is, and why the building is dark, is a call of its own.
  const first = callOf('porter-first-call')
  assert.deepEqual(first.when, { powered: ['office'], unpowered: ['atrium'] })
  assert.deepEqual(first.lapsesWhen, { powered: ['atrium'] })
  assert.deepEqual(first.lineKeys, ['radio.call.first.1', 'radio.call.first.2'])
  assert.equal(PRE_OPENING_SAVE.firstCallId, 'porter-first-call')
  assert.equal(PRE_OPENING_SAVE.firstCallOverOncePowered, 'atrium')
  const hello = callOf('porter-hello')
  assert.deepEqual(hello.when, { powered: ['office'] })
  assert.equal(hello.lapsesWhen, undefined, 'owed to every save, and for good')
  assert.equal(hello.lineKeys.length, 5)
  assert.equal(PRE_POSSE_SAVE.helloCallId, hello.id)
  for (const call of radio.calls) {
    assert.ok(Array.isArray(call.mentions), `${call.id} declares what it sends the player to`)
    // Gone for good means it cannot come back: a lapse is something that stays true.
    if (call.lapsesWhen) assert.equal(conditionClass(call.lapsesWhen), 'positive', `${call.id} lapses on something that can stop holding`)
  }
  // The door the save records is the one the call waits for (DL2-1), not the portal facing it.
  assert.deepEqual(callOf('porter-shortcut').when, { doorsReleased: [SHORTCUT] })
})

test('each milestone has exactly one call that begins with it (ÁT-A4)', () => {
  const began = (before: Progress, after: Progress) =>
    radio.calls.filter((call) => !met(call.when, before) && met(call.when, after)).map((call) => call.id)
  const office = progressWith()
  const hall = progressWith({ roomsPowered: ['office', 'atrium'] })
  const wing = progressWith({ roomsPowered: ['office', 'atrium', 'holyoke'] })
  assert.deepEqual(began(office, hall), ['porter-atrium-service'], 'the hall lit')
  assert.deepEqual(began(hall, wing), ['porter-holyoke-lit'], 'Wing 1 lit')
  assert.deepEqual(began(wing, { ...wing, doorsReleased: [SHORTCUT] }), ['porter-shortcut'], 'the shortcut pushed from inside')
  // The first piece, whichever of the twelve it is; the second is no news.
  assert.equal(MUSEUM.exhibits.length, 12)
  for (const exhibit of MUSEUM.exhibits) {
    const one = { ...wing, catalogued: [exhibit.id] }
    assert.deepEqual(began(wing, one), ['porter-first-catalogued'], exhibit.id)
    const other = MUSEUM.exhibits.find((candidate) => candidate.id !== exhibit.id)!
    assert.deepEqual(began(one, { ...one, catalogued: [exhibit.id, other.id] }), [], `a second piece after ${exhibit.id}`)
  }
})

test('whoever lights the hall before any call still meets the porter, and is not sent to a breaker already thrown (ÁT-A6 c)', () => {
  // By the real path: the store, and the press R makes. The lamp is on and
  // the player is out of the door before the first call arrives; the radio
  // stays on the desk, where it is heard only in the office.
  newGame({ roomsPowered: ['office'], documentsRead: ['doc-welcome'] })
  useMuseum.getState().setCurrentRoom('atrium')
  useMuseum.getState().powerRoom('atrium')
  useMuseum.getState().setCurrentRoom('office')
  const back = useMuseum.getState().progress
  assert.deepEqual(back.radioCalls, [], 'nothing was heard on the way')
  assert.equal(nextRadioCall(radio, back, MUSEUM)?.id, 'porter-hello', 'he never introduces himself')
  assert.deepEqual(
    dueRadioCalls(radio, back, MUSEUM).map((call) => call.id),
    ['porter-hello', 'porter-atrium-service'],
  )
  assert.equal(radioCallReady(radio, 'porter-first-call', back, MUSEUM), 'gone', 'the instruction for a breaker already thrown')

  // Taken and called: his introduction, his word about the radio, the hall.
  assert.equal(takeDeskRadio(RADIO), true)
  const heard: string[] = []
  for (let press = 0; press < 6; press += 1) {
    assert.equal(placeRadioCall(RADIO, START + press * SECOND, fixed(0)), true)
    const id = useMuseum.getState().radio?.callId
    if (!id) break
    heard.push(id)
    finishTransmission()
  }
  assert.deepEqual(heard, ['porter-hello', 'porter-radio-taken', 'porter-atrium-service'])
  // And the answer that follows is about Wing 1, at the first height.
  assert.deepEqual(hintLinesOf(useMuseum.getState().radio!), ['radio.hint.holyoke.where'])
  finishTransmission()
  useMuseum.getState().resetProgress()
})

test('a call that lapsed is gone for good, heard or not', () => {
  const heardSoFar = ['porter-hello', 'porter-first-call']
  const hall = progressWith({ roomsPowered: ['office', 'atrium'], radioCalls: heardSoFar })
  const wing = progressWith({ roomsPowered: ['office', 'atrium', 'holyoke'], radioCalls: heardSoFar })
  assert.equal(nextRadioCall(radio, hall, MUSEUM)?.id, 'porter-atrium-service')
  assert.equal(radioCallReady(radio, 'porter-atrium-service', hall, MUSEUM), 'ready')
  // Wing 1 is lit: the call that names its breaker has nothing left to say.
  assert.ok(!dueRadioCalls(radio, wing, MUSEUM).some((call) => call.id === 'porter-atrium-service'))
  assert.equal(radioCallReady(radio, 'porter-atrium-service', wing, MUSEUM), 'gone')
  assert.equal(nextRadioCall(radio, wing, MUSEUM)?.id, 'porter-holyoke-lit')
  // One held under a modal while its moment passes is dropped as the modal closes.
  assert.equal(transmissionLapsed({ deviceId: RADIO, callId: 'porter-atrium-service' }, hall, MUSEUM), false)
  assert.equal(transmissionLapsed({ deviceId: RADIO, callId: 'porter-atrium-service' }, wing, MUSEUM), true)
  assert.equal(transmissionLapsed({ deviceId: RADIO, callId: 'porter-hello' }, wing, MUSEUM), false, 'his introduction never lapses')
  // The reminder lapses on the notebook being read, which is also when it stops holding.
  assert.deepEqual(callOf('porter-notebook-reminder').lapsesWhen, { documentsRead: ['doc-welcome'] })
  // Director and press agree: both ask `dueRadioCalls`.
  newGame({ roomsPowered: ['office', 'atrium', 'holyoke'], documentsRead: ['doc-welcome'], devicesCarried: [RADIO], radioCalls: [...heardSoFar, 'porter-radio-taken'] })
  assert.equal(placeRadioCall(RADIO, START, fixed(0)), true)
  assert.equal(useMuseum.getState().radio?.callId, 'porter-holyoke-lit', 'the press said a call that had lapsed')
  finishTransmission()
  useMuseum.getState().resetProgress()
})

test('a call plays once, and never to a save that had already passed its moment (ÁT-A4)', () => {
  type Raw = Record<string, unknown>
  for (const [name, fixture] of Object.entries(SAVE_FIXTURES)) {
    const record: Raw = fixture.save.progress
    let progress = migrateProgress(JSON.parse(JSON.stringify(record)))
    // The lamp, for the save that never lit the office: the radio needs its charger.
    progress = { ...progress, roomsPowered: [...new Set([...progress.roomsPowered, 'office'])] }
    const heard: string[] = []
    for (let guard = 0; guard < 20; guard += 1) {
      const call = nextRadioCall(radio, progress, MUSEUM)
      if (!call) break
      heard.push(call.id)
      progress = { ...progress, radioCalls: [...progress.radioCalls, call.id] }
    }
    // Everybody who has not met the porter of this lot meets him, once; and
    // that is all a save of the corpus hears: each had heard what it was
    // owed, and what it had already done is not news.
    if (fixtureLot(fixture) < 3) assert.deepEqual(heard, ['porter-hello'], name)
    assert.equal(new Set(heard).size, heard.length, `${name}: a call twice`)
    for (const id of (record.radioCalls as string[] | undefined) ?? []) assert.ok(!heard.includes(id), `${name} hears "${id}" again`)
    for (const news of PRE_POSSE_SAVE.oldNews) {
      const list = (record[news.field] as readonly string[] | undefined) ?? []
      const passed = news.id === null ? list.length > 0 : list.includes(news.id)
      if (passed) assert.ok(!heard.includes(news.callId), `${name}: "${news.callId}" for a milestone the save had passed`)
    }
  }
  // A new game hears every one of them, each at its moment and once.
  let night = progressWith({ documentsRead: [] })
  const order: string[] = []
  const hearAll = () => {
    for (let guard = 0; guard < 20; guard += 1) {
      const call = nextRadioCall(radio, night, MUSEUM)
      if (!call) return
      order.push(call.id)
      night = { ...night, radioCalls: [...night.radioCalls, call.id] }
    }
  }
  hearAll()
  night = { ...night, documentsRead: ['doc-welcome'], devicesCarried: [RADIO] }
  hearAll()
  night = { ...night, roomsPowered: ['office', 'atrium'] }
  hearAll()
  night = { ...night, roomsPowered: ['office', 'atrium', 'holyoke'] }
  hearAll()
  night = { ...night, catalogued: ['portrait-morgan'], doorsReleased: [SHORTCUT] }
  hearAll()
  assert.deepEqual(order, ALL_CALLS, 'a new game, played in the order of the house')
})

test('the hint climbs: where, what, how, and the fourth call says how again (DL3-16)', () => {
  for (const hint of radio.hints) {
    assert.ok(hint.heightKeys.length >= 1 && hint.heightKeys.length <= 3, `${hint.heightKeys[0]} has one to three heights`)
    assert.ok(Array.isArray(hint.mentions))
  }
  assert.deepEqual(radio.hints.map((hint) => hint.heightKeys.length), [3, 3, 3, 3, 1])

  const dark = progressWith()
  let memory: RadioMemory = FRESH_RADIO_MEMORY
  assert.equal(memory.hintHeight, 0)
  const said: string[][] = []
  const heights: number[] = []
  for (let call = 0; call < 4; call += 1) {
    const answer = porterAnswer(radio, dark, memory, START + call * 5 * SECOND, fixed(0.99), MUSEUM)
    said.push(hintLinesOf(answer))
    heights.push(answer.memory.hintHeight)
    memory = answer.memory
  }
  assert.deepEqual(said, [['radio.hint.atrium.where'], ['radio.hint.atrium.what'], ['radio.hint.atrium.how'], ['radio.hint.atrium.how']])
  assert.deepEqual(heights, [0, 1, 2, 2])

  // The hint changes, and he starts from where again.
  const hall = progressWith({ roomsPowered: ['office', 'atrium'] })
  const next = porterAnswer(radio, hall, memory, START + 30 * SECOND, fixed(0.99), MUSEUM)
  assert.deepEqual(hintLinesOf(next), ['radio.hint.holyoke.where'])
  assert.equal(next.memory.hintHeight, 0)
  assert.equal(next.memory.lastHint, 2)
  // A hint with one height says it every time.
  const done = progressWith({ roomsPowered: ['office', 'atrium', 'holyoke'], locksOpened: ['office-drawer'] })
  let rest: RadioMemory = FRESH_RADIO_MEMORY
  for (let call = 0; call < 3; call += 1) {
    const answer = porterAnswer(radio, done, rest, START + call * 5 * SECOND, fixed(0.99), MUSEUM)
    assert.deepEqual(hintLinesOf(answer), ['radio.hint.rest'])
    assert.equal(answer.memory.hintHeight, 0)
    rest = answer.memory
  }

  // Curt, the hint has no height to say, and the call still counts: back in
  // his good graces, he does not start the same hint over.
  const tired: RadioMemory = { ...FRESH_RADIO_MEMORY, calls: 8, temper: 8, lastHint: 1, hintHeight: 0, lastCallAt: START }
  const curt = porterAnswer(radio, dark, tired, START + SECOND, fixed(0.99), MUSEUM)
  assert.deepEqual(hintLinesOf(curt), ['radio.hint.atrium.curt'])
  assert.equal(curt.memory.hintHeight, 1)
  // A tantrum gives no hint, and climbs nothing.
  const tantrum = porterAnswer(radio, dark, { ...tired, temper: 6, hintHeight: 1 }, START + SECOND, fixed(0), MUSEUM)
  assert.equal(tantrum.outburst, true)
  assert.equal(tantrum.memory.hintHeight, 1)
  assert.equal(tantrum.memory.lastHint, 1)
  // A radio with no temper climbs the same way.
  const plain = { hints: radio.hints }
  const first = porterAnswer(plain, dark, FRESH_RADIO_MEMORY, START, fixed(0), MUSEUM)
  const second = porterAnswer(plain, dark, first.memory, START + SECOND, fixed(0), MUSEUM)
  assert.deepEqual([first.lineKeys, second.lineKeys], [['radio.hint.atrium.where'], ['radio.hint.atrium.what']])
  // And the rule asked by itself, as the opening suites ask it.
  assert.deepEqual(radioHintFor(radio, dark, MUSEUM), ['radio.hint.atrium.where'])
  assert.deepEqual(radioHintFor(radio, dark, MUSEUM, 1), ['radio.hint.atrium.what'])
  assert.deepEqual(radioHintFor(radio, dark, MUSEUM, 9), ['radio.hint.atrium.how'], 'past the top is the top')
})

test('the notebook hint is for a player who is still in the office (S25)', () => {
  const unread = progressWith({ documentsRead: [], roomsVisited: ['office'] })
  assert.equal(radioHintIndex(radio, unread, MUSEUM), 0)
  assert.deepEqual(radioHintFor(radio, unread, MUSEUM), ['radio.hint.notebook.where'])
  // Out in the dark hall without it: what he needs is the breaker. The
  // notebook is optional, and its hint used to stand in front of every other.
  const out = progressWith({ documentsRead: [], roomsVisited: ['office', 'atrium'] })
  const answer = porterAnswer(radio, out, FRESH_RADIO_MEMORY, START, fixed(0), MUSEUM)
  assert.deepEqual(hintLinesOf(answer), ['radio.hint.atrium.where'], 'in the dark hall he says "notebook first"')
  assert.deepEqual(answer.hintWhen, { unpowered: ['atrium'] })
  // Every hint but the last points at something the player can walk up to.
  assert.deepEqual(
    radio.hints.map((hint) => hint.targetId ?? null),
    ['office-notebook', 'atrium-breaker', 'holyoke-breaker', 'portrait-morgan', null],
  )
})

test('an answer about the dark, the blackout or the rain looks at the night first (falha 66)', () => {
  const lit = progressWith({ roomsPowered: ['office', 'atrium', 'holyoke'] })
  const hallOnly = progressWith({ roomsPowered: ['office', 'atrium'] })
  const dark = progressWith()
  const tiredAt = (progress: Progress, temper: number): RadioMemory => ({
    ...FRESH_RADIO_MEMORY,
    calls: temper,
    temper,
    lastHint: radioHintIndex(radio, progress, MUSEUM),
    lastCallAt: START,
  })
  /** Every opener and tantrum a tier gives in a thousand calls. */
  const drawnAt = (progress: Progress, temper: number) => {
    const dice = seeded(66 + temper)
    const drawn = new Set<string>()
    for (let call = 0; call < 1000; call += 1) {
      const answer = porterAnswer(radio, progress, tiredAt(progress, temper), START, dice, MUSEUM)
      if (answer.replyId) drawn.add(answer.replyId)
    }
    return drawn
  }
  // Impatient: the seventh call in a row. «É medo do escuro, é?»
  assert.ok(drawnAt(dark, 6).has('porter-t4-dark'), 'never said, even in the dark')
  assert.ok(drawnAt(hallOnly, 6).has('porter-t4-dark'), 'Wing 1 is still dark')
  assert.ok(!drawnAt(lit, 6).has('porter-t4-dark'), '"scared of the dark" with every room lit')
  assert.equal(drawnAt(lit, 6).size, 6, 'three openers and three tantrums are left to him')
  // Out of patience: the tenth. «…Que não tem, porque acabou a luz.»
  assert.ok(drawnAt(dark, 9).has('porter-t5-soap'))
  assert.ok(drawnAt(hallOnly, 9).has('porter-t5-soap'))
  assert.ok(!drawnAt(lit, 9).has('porter-t5-soap'), '"the power is out" with every room lit')
  assert.equal(drawnAt(lit, 9).size, 8)

  // With the dice loaded for each: the roll that picks it in the dark picks its neighbour in the light.
  const loaded = (...rolls: number[]) => {
    let turn = 0
    return () => rolls[Math.min(turn++, rolls.length - 1)]
  }
  assert.equal(porterAnswer(radio, dark, tiredAt(dark, 6), START, fixed(0.99), MUSEUM).replyId, 'porter-t4-dark')
  assert.equal(porterAnswer(radio, lit, tiredAt(lit, 6), START, fixed(0.99), MUSEUM).replyId, 'porter-t4-slow')
  assert.equal(porterAnswer(radio, dark, tiredAt(dark, 9), START, loaded(0.1, 0.6), MUSEUM).replyId, 'porter-t5-soap')
  assert.equal(porterAnswer(radio, lit, tiredAt(lit, 9), START, loaded(0.1, 0.6), MUSEUM).replyId, 'porter-t5-recording')

  // Dead air: the rain, until the pump has dried the basement (L12 sets the flag).
  const air = (progress: Progress) => {
    const dice = seeded(12)
    return new Set(Array.from({ length: 300 }, () => deadAirFor(patience, progress, MUSEUM, dice, null)?.id))
  }
  assert.deepEqual([...air(lit)].sort(), ['porter-air-no-answer', 'porter-air-rain', 'porter-air-really-off'])
  assert.deepEqual([...air({ ...lit, flags: ['basement-drained'] })].sort(), ['porter-air-no-answer', 'porter-air-really-off'])
  assert.equal(ptBR['radio.deadAir.rain'], '(Nada. Só a chuva.)')

  // A tier in which nothing that looks can be said still answers: what asks
  // nothing is always there (the gate refuses a tier without one).
  const allLooking = {
    ...radio,
    patience: {
      ...patience,
      tiers: patience.tiers.map((tier) => ({
        ...tier,
        replies: tier.replies.map((reply, index) => (index === 0 ? reply : { ...reply, when: { unpowered: ['atrium'] } })),
      })),
    },
  }
  for (const temper of [0, 2, 4, 6, 9]) {
    const answer = porterAnswer(allLooking, lit, tiredAt(lit, temper), START, fixed(0.99), MUSEUM)
    assert.equal(answer.replyId, patience.tiers[answer.tier].replies[0].id)
  }
})

// ---------------------------------------------------------------------------
// 11b. L3: a thing that speaks when worked (the telephone; a recording)
// ---------------------------------------------------------------------------

type VoiceDevice = Extract<NonNullable<MuseumContent['rooms'][number]['devices']>[number], { readonly kind: 'voice' }>

const TELEPHONE = 'office-telephone'
const telephone = MUSEUM.rooms
  .flatMap((room) => room.devices ?? [])
  .find((device): device is VoiceDevice => device.kind === 'voice' && device.id === TELEPHONE)

/** The intent of a device, as the prompt, the key and the touch button ask it of the store. */
const intentNow = (device: VoiceDevice, content: Pick<MuseumContent, 'rooms' | 'exhibits'> = MUSEUM) =>
  deviceIntent(device, deviceInputOf(device, useMuseum.getState(), content))

test('E on the telephone, in the dark, says the line is dead and records nothing', () => {
  assert.ok(telephone, 'the office has a telephone that answers')
  assert.ok(aimableDevices(MUSEUM).some((entry) => entry.device.id === TELEPHONE && entry.room.id === 'office'), 'the crosshair may rest on it')

  // Nothing is lit, nothing was read: the first second of the night.
  newGame()
  assert.deepEqual(useMuseum.getState().progress.roomsPowered, [])
  assert.deepEqual(intentNow(telephone), { kind: 'voice', intent: 'play' }, 'a dead line needs no mains')
  const before = useMuseum.getState().progress
  assert.equal(operateVoice(TELEPHONE), true, 'the press is taken')
  const on = useMuseum.getState().radio
  assert.ok(on)
  assert.equal(on.deviceId, TELEPHONE)
  assert.deepEqual(on.lineKeys, ['device.office-telephone.dead'])
  assert.equal(ptBR[on.lineKeys[0] as 'device.office-telephone.dead'], 'Linha muda.')
  assert.equal(en[on.lineKeys[0] as 'device.office-telephone.dead'], 'The line is dead.')
  // Who speaks is the telephone, not the porter.
  assert.equal(on.speakerKey, telephone.titleKey)
  assert.notEqual(on.speakerKey, radio.speakerKey)
  assert.equal(on.callId, undefined)
  assert.equal(on.grantOnEnd, undefined, 'a dead line files nothing')
  // While it speaks, the same press moves it on: one line, so it ends.
  assert.deepEqual(intentNow(telephone), { kind: 'voice', intent: 'skip' })
  assert.equal(operateVoice(TELEPHONE), true)
  assert.equal(useMuseum.getState().radio, null)
  assert.equal(useMuseum.getState().progress, before, 'the save is the very object it was: nothing was written')
  // And it can be tried again, for ever: a dead line is never "heard".
  assert.deepEqual(intentNow(telephone), { kind: 'voice', intent: 'play' })
  assert.equal(operateVoice(TELEPHONE), true)
  finishTransmission()
  assert.equal(useMuseum.getState().progress, before)

  // With every room lit it says the same: nothing about it reads the night.
  newGame({ roomsPowered: ['office', 'atrium', 'holyoke'] })
  assert.deepEqual(intentNow(telephone), { kind: 'voice', intent: 'play' })
  assert.equal(operateVoice(TELEPHONE), true)
  assert.deepEqual(useMuseum.getState().radio?.lineKeys, ['device.office-telephone.dead'])
  finishTransmission()

  // A device the house does not have, or one that is no voice, takes no press.
  assert.equal(operateVoice('office-fax'), false)
  assert.equal(operateVoice(RADIO), false)
  assert.equal(useMuseum.getState().radio, null)
})

test('dialling over the porter cuts him off, and what he was saying is still owed', () => {
  assert.ok(telephone)
  newGame({ roomsPowered: ['office'], documentsRead: ['doc-welcome'] })
  const hello = radio.calls.find((call) => call.id === 'porter-hello')!
  useMuseum.getState().startRadio({ deviceId: RADIO, speakerKey: radio.speakerKey, lineKeys: hello.lineKeys, callId: hello.id })
  // His voice on air is not the telephone's own: the press plays, it does not skip his line.
  assert.deepEqual(intentNow(telephone), { kind: 'voice', intent: 'play' })
  assert.equal(operateVoice(TELEPHONE), true)
  assert.equal(useMuseum.getState().radio?.deviceId, TELEPHONE)
  finishTransmission()
  assert.deepEqual(useMuseum.getState().progress.radioCalls, [], 'a call that was cut is not a call that was heard')
  assert.equal(nextRadioCall(radio, useMuseum.getState().progress, MUSEUM)?.id, 'porter-hello', 'and the director delivers it again')
  // The director waits while the telephone speaks, as for any transmission.
  operateVoice(TELEPHONE)
  assert.equal(
    radioDeliveryStep(radioCallReady(radio, 'porter-hello', useMuseum.getState().progress, MUSEUM), {
      onAir: useMuseum.getState().radio !== null,
      modal: false,
      hidden: false,
    }),
    'wait',
  )
  finishTransmission()
  // R while a voice speaks moves it on, like any line on air, and is no call to him.
  useMuseum.getState().carryDevice(RADIO)
  useMuseum.setState((state) => ({ progress: { ...state.progress, radioCalls: ALL_CALLS } }))
  operateVoice(TELEPHONE)
  assert.equal(placeRadioCall(RADIO, START, fixed(0.5)), true)
  assert.equal(useMuseum.getState().radio, null, 'the one line of the telephone was moved on')
  assert.equal(memoryOf().calls, 0)
})

/**
 * A house with a recording: a machine on mains that plays a tape of three
 * lines, and files it (and what it tells) when the last one ends.
 */
const MACHINE = {
  kind: 'voice',
  id: 'machine',
  part: 'desk-telephone',
  position: [0, 0.74, 0],
  titleKey: 'device.office-telephone.title',
  speakerKey: 'radio.speaker.static',
  poweredBy: 'office',
  messageLamp: true,
  utterances: [{ when: {}, documentId: 'doc-tape' }],
} as const satisfies VoiceDevice
const TAPE = ['radio.call.hello.1', 'radio.call.hello.2', 'radio.call.hello.3']
const TAPE_HOUSE = {
  rooms: [{ id: 'office', startsPowered: false, devices: [MACHINE] }],
  exhibits: [],
  documents: [
    { id: 'doc-tape', containerId: 'machine', titleKey: 'document.welcome.title', bodyKey: 'document.welcome.summary', lineKeys: TAPE, revealsFactId: 'fact-on-tape' },
  ],
} as unknown as MuseumContent

test('a recording is filed when its last line ends: skipping counts, cutting it short does not', () => {
  const press = () => operateVoiceOn(useMuseum, TAPE_HOUSE, 'machine')
  const intent = () => intentNow(MACHINE, TAPE_HOUSE)
  const read = () => useMuseum.getState().progress.documentsRead

  // No mains, no tape: the prompt says so and the press is not taken.
  newGame()
  assert.deepEqual(intent(), { kind: 'voice', intent: 'dead' })
  assert.equal(deviceLive(intent()), false)
  assert.equal(press(), false)
  assert.equal(useMuseum.getState().radio, null)

  // With the lamp on it plays the lines of the document, in order.
  newGame({ roomsPowered: ['office'] })
  assert.deepEqual(intent(), { kind: 'voice', intent: 'play' })
  assert.equal(press(), true)
  const on = useMuseum.getState().radio
  assert.deepEqual(on?.lineKeys, TAPE, 'what it says is the transcript, line by line')
  assert.equal(on?.speakerKey, MACHINE.speakerKey)
  assert.deepEqual(on?.grantOnEnd, recordingGrant(TAPE_HOUSE, 'doc-tape'))
  assert.deepEqual(recordingGrant(TAPE_HOUSE, 'doc-tape'), { documentsRead: ['doc-tape'], factsKnown: ['fact-on-tape'] })
  assert.deepEqual(recordingGrant(TAPE_HOUSE, 'doc-no-such-tape'), {}, 'a recording the house does not have files nothing')

  // Heard to the end by the subtitle's own timer: filed with the last line, not before.
  useMuseum.getState().advanceRadio()
  assert.deepEqual(read(), [], 'one line in')
  useMuseum.getState().advanceRadio()
  assert.deepEqual(read(), [], 'two lines in')
  let told = 0
  const stop = useMuseum.subscribe(() => {
    told += 1
  })
  useMuseum.getState().advanceRadio()
  stop()
  assert.equal(useMuseum.getState().radio, null)
  assert.deepEqual(read(), ['doc-tape'], 'the last line ended: it is in the archive')
  assert.deepEqual(useMuseum.getState().progress.factsKnown, ['fact-on-tape'], 'with what it tells')
  assert.equal(told, 1, 'the end and what it files are one write')

  // Heard once, the prompt offers it again, and hearing it again writes nothing.
  assert.deepEqual(intent(), { kind: 'voice', intent: 'again' })
  const filed = useMuseum.getState().progress
  assert.equal(press(), true)
  assert.deepEqual(useMuseum.getState().radio?.lineKeys, TAPE)
  finishTransmission()
  assert.equal(useMuseum.getState().progress, filed)

  // Skipped line by line, by E on the machine itself: that is hearing it out.
  newGame({ roomsPowered: ['office'] })
  assert.equal(press(), true)
  for (let line = 1; line < TAPE.length; line += 1) {
    assert.deepEqual(intent(), { kind: 'voice', intent: 'skip' })
    assert.equal(press(), true)
    assert.equal(useMuseum.getState().radio?.index, line)
    assert.deepEqual(read(), [])
  }
  assert.equal(press(), true)
  assert.equal(useMuseum.getState().radio, null)
  assert.deepEqual(read(), ['doc-tape'], 'skipped to the end is heard')

  // Cut in the middle (the player dials something else, a directed sequence
  // takes the air): not filed, and still there to be heard from the start.
  newGame({ roomsPowered: ['office'] })
  press()
  useMuseum.getState().advanceRadio()
  useMuseum.getState().stopRadio()
  assert.deepEqual(read(), [], 'a recording cut short is not a recording heard')
  assert.deepEqual(intent(), { kind: 'voice', intent: 'play' })
  assert.equal(press(), true)
  assert.equal(useMuseum.getState().radio?.index, 0, 'it starts over')
  finishTransmission()
  assert.deepEqual(read(), ['doc-tape'])

  // Dropped under a modal (`dropRadio`) is not heard out either; a content
  // call dropped the same way still counts as heard, as it always did.
  newGame({ roomsPowered: ['office'] })
  useMuseum.getState().startRadio({
    deviceId: 'machine',
    speakerKey: MACHINE.speakerKey,
    lineKeys: TAPE,
    callId: 'a-call',
    grantOnEnd: recordingGrant(TAPE_HOUSE, 'doc-tape'),
  })
  useMuseum.getState().dropRadio()
  assert.deepEqual(useMuseum.getState().progress.radioCalls, ['a-call'])
  assert.deepEqual(read(), [])
  // Heard to its end, a transmission that is a call and a recording at once records both, in one write.
  useMuseum.getState().startRadio({ deviceId: 'machine', speakerKey: MACHINE.speakerKey, lineKeys: ['radio.call.hello.1'], callId: 'another', grantOnEnd: { documentsRead: ['doc-tape'] } })
  useMuseum.getState().advanceRadio()
  assert.deepEqual(useMuseum.getState().progress.radioCalls, ['a-call', 'another'])
  assert.deepEqual(read(), ['doc-tape'])
  newGame()
})

test('the prompt of a voice says what the key does, in each of its four states', () => {
  assert.ok(telephone)
  const view = (device: VoiceDevice, intent: 'dead' | 'play' | 'again' | 'skip') => devicePrompt(device, { kind: 'voice', intent })
  // A machine with no words of its own for the verb: «Ouvir», «Ouvir de novo».
  assert.deepEqual(view(MACHINE, 'dead'), { form: 'action', key: false, labelKey: 'prompt.voice.dead', titleKey: MACHINE.titleKey })
  assert.deepEqual(view(MACHINE, 'play'), { form: 'action', key: true, labelKey: 'prompt.voice.play', titleKey: MACHINE.titleKey })
  assert.deepEqual(view(MACHINE, 'again'), { form: 'action', key: true, labelKey: 'prompt.voice.again', titleKey: MACHINE.titleKey })
  assert.deepEqual(view(MACHINE, 'skip'), { form: 'action', key: true, labelKey: 'radio.skip', titleKey: MACHINE.titleKey })
  // The telephone has: «Discar — Telefone».
  assert.deepEqual(view(telephone, 'play'), {
    form: 'action',
    key: true,
    labelKey: 'device.office-telephone.prompt',
    titleKey: 'device.office-telephone.title',
  })
  for (const intent of ['dead', 'play', 'again', 'skip'] as const) {
    // The key is drawn exactly when E does something.
    assert.equal(view(MACHINE, intent)?.form === 'action' && view(MACHINE, intent)?.key, deviceLive({ kind: 'voice', intent }), intent)
  }
  assert.deepEqual(
    (['prompt.voice.play', 'prompt.voice.again', 'prompt.voice.dead'] as const).map((key) => [ptBR[key], en[key]]),
    [['Ouvir', 'Listen'], ['Ouvir de novo', 'Listen again'], ['Sem energia', 'No power']],
  )
  // A voice handed another kind's intent, and another kind handed a voice's, draw nothing.
  assert.equal(devicePrompt(telephone, { kind: 'notice' }), null)
  assert.equal(devicePrompt(radio, { kind: 'voice', intent: 'play' }), null)

  // What it would say is the first utterance whose moment it is.
  const twoTapes = {
    ...MACHINE,
    utterances: [
      { when: { powered: ['atrium'] }, documentId: 'doc-second-tape' },
      { when: {}, documentId: 'doc-tape' },
    ],
  } as const satisfies VoiceDevice
  const house = { ...TAPE_HOUSE, rooms: [...TAPE_HOUSE.rooms, { id: 'atrium', startsPowered: false }] } as unknown as MuseumContent
  assert.equal(voiceUtterance(twoTapes, progressWith(), house)?.documentId, 'doc-tape')
  assert.equal(voiceUtterance(twoTapes, progressWith({ roomsPowered: ['office', 'atrium'] }), house)?.documentId, 'doc-second-tape')
  assert.equal(voiceUtterance({ utterances: [] }, progressWith(), house), null)
  // «Again» is asked of the recording in force: the first one heard, the second is new.
  const input = (progress: Progress) => deviceInputOf(twoTapes, { progress, radio: null }, house)
  assert.equal(deviceIntent(twoTapes, input(progressWith({ documentsRead: ['doc-tape'] }))).intent, 'again')
  assert.equal(deviceIntent(twoTapes, input(progressWith({ roomsPowered: ['office', 'atrium'], documentsRead: ['doc-tape'] }))).intent, 'play')
})

test('the message lamp blinks while a recording waits with the mains on, and is dark otherwise', () => {
  const input = (progress: Progress, radioOn: object | null = null) => deviceInputOf(MACHINE, { progress, radio: radioOn as never }, TAPE_HOUSE)
  const waiting = input(progressWith({ roomsPowered: ['office'], documentsRead: [] }))
  const lit = (seconds: number, given = waiting, device: VoiceDevice = MACHINE) => messageLampLit(device, given, seconds)
  // On for the first half of each period, off for the second, for ever.
  assert.equal(lit(0), true)
  assert.equal(lit(MESSAGE_LAMP_PERIOD_SECONDS * 0.25), true)
  assert.equal(lit(MESSAGE_LAMP_PERIOD_SECONDS * 0.75), false)
  assert.equal(lit(MESSAGE_LAMP_PERIOD_SECONDS * 7.25), true)
  assert.equal(lit(MESSAGE_LAMP_PERIOD_SECONDS * 7.75), false)
  const everLit = (given: ReturnType<typeof input>, device: VoiceDevice = MACHINE) =>
    Array.from({ length: 40 }, (_, step) => messageLampLit(device, given, step * 0.1)).some(Boolean)
  // No mains: dark. Heard out: dark. A voice with no lamp: nothing to light.
  assert.equal(everLit(input(progressWith({ roomsPowered: [], documentsRead: [] }))), false, 'no mains')
  assert.equal(everLit(input(progressWith({ roomsPowered: ['office'], documentsRead: ['doc-tape'] }))), false, 'the message was heard')
  assert.equal(everLit(waiting, { ...MACHINE, messageLamp: false }), false)
  assert.ok(telephone)
  assert.equal(everLit(deviceInputOf(telephone, { progress: progressWith(), radio: null }, MUSEUM), telephone), false, 'a dead line is no message')
  // It goes on blinking while the message plays: it is unheard until its last line.
  assert.equal(everLit(input(progressWith({ roomsPowered: ['office'] }), { deviceId: 'machine' })), true)
  // The component paints the lens by this rule and by nothing of its own.
  const devices = source('engine/Devices.tsx')
  assert.ok(devices.includes('messageLampLit(device, deviceInputOf(device, useMuseum.getState(), MUSEUM), clock.elapsedTime)'), 'Devices.tsx asks messageLampLit')
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
  // A tier in which every reply waits for something has, some nights, nothing to say.
  assert.ok(
    codesOf(withRadio(() => ({ patience: { ...patience, tiers: patience.tiers.map((tier) => ({ ...tier, replies: tier.replies.map((reply) => ({ ...reply, when: { unpowered: ['atrium'] } })) })) } }))).includes(
      'radio-patience-silent',
    ),
    'a tier in which every reply waits for something',
  )
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
        calls: [...device.calls, { id: 'porter-nope', when: { carried: ['nope'] }, delaySeconds: 1, lineKeys: ['radio.call.taken.1'], mentions: [] }],
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
  // His introduction is heard with the radio on its charger and with it in
  // the pocket: it says how to reach him, and never to take what the player
  // may already hold. (It used to end «pega o rádio aí na mesa».)
  const lastOfHello = radio.calls[0].lineKeys.at(-1) as 'radio.call.hello.5'
  assert.equal(lastOfHello, 'radio.call.hello.5')
  assert.ok(/me chama no rádio/.test(ptBR[lastOfHello]) && /Call me on the radio/.test(en[lastOfHello]))
  for (const key of radio.calls[0].lineKeys) {
    assert.ok(!/pega o rádio/i.test((ptBR as Record<string, string>)[key]), `${key} (pt-BR) tells the player to take the radio`)
    assert.ok(!/take the radio/i.test((en as Record<string, string>)[key]), `${key} (en) tells the player to take the radio`)
  }
  assert.ok(/portaria/.test(ptBR['radio.patience.t2.reception']) && /átrio/.test(ptBR['radio.patience.t2.reception']))
  // In English he calls his post the front desk, which IS reception: the
  // joke that he is not reception cannot be told there.
  assert.ok(/front desk/.test(en['radio.call.hello.1']))
  assert.ok(!/reception/i.test(en['radio.patience.t2.reception']), 'no "not reception" from the front desk')
  // A line is heard alone: every one that names Helena says who she is. It
  // was held for two keys; it is held for whichever line names her, and the
  // content gate holds the same (`speech-director-unintroduced`).
  const everyLine = [...new Set([...radio.calls.flatMap((call) => call.lineKeys), ...HINT_LINES, ...patienceLines])]
  const naming = everyLine.filter((key) => /Helena/.test((ptBR as Record<string, string>)[key]) || /Helena/.test((en as Record<string, string>)[key]))
  assert.deepEqual(naming.sort(), ['radio.call.notebook.1', 'radio.hint.notebook.where', 'radio.patience.t4.dark.close'])
  for (const key of naming) {
    assert.ok(/Helena/.test((ptBR as Record<string, string>)[key]) && /diretora/.test((ptBR as Record<string, string>)[key]), `${key} (pt-BR) introduces her`)
    assert.ok(/Helena/.test((en as Record<string, string>)[key]) && /director/.test((en as Record<string, string>)[key]), `${key} (en) introduces her`)
  }
  // The porter says «saguão», and says once that it is the atrium of the signs.
  assert.ok(/[Ss]aguão/.test(ptBR['radio.call.first.2']) && /átrio/.test(ptBR['radio.call.first.2']))
  assert.ok(/the hall/i.test(en['radio.call.first.2']) && /atrium/.test(en['radio.call.first.2']))
  assert.ok(!/humming/.test(en['radio.patience.t5.song.1']), 'nobody hums words')
  assert.ok(!/Only not/.test(en['radio.call.taken.2']))
})

/**
 * What each hint sends the player to: the noun that names the thing, keyed
 * by the hint's first height.
 *
 * A curt hint is the same help from a porter out of patience, and the one
 * player who has called often enough to hear it must not be the one it stops
 * helping. The drawer's curt line once said only «a data tá nas placas da
 * Ala 1». With the full hint said a height at a time, the thing is named by
 * the first two of them between them (where it is, what it looks like), and
 * that noun is what the curt line has to keep. The notebook is named at
 * «onde» («Primeiro o caderno») and described at «o quê»; the breakers are
 * the other way round, named by their red light at «o quê».
 */
const HINT_TARGETS: Record<string, { readonly 'pt-BR': readonly string[]; readonly en: readonly string[] }> = {
  'radio.hint.notebook.where': { 'pt-BR': ['caderno', 'mesa'], en: ['notebook', 'desk'] },
  'radio.hint.atrium.where': { 'pt-BR': ['saguão', 'luzinha vermelha', 'porta'], en: ['the hall', 'little red light', 'door'] },
  'radio.hint.holyoke.where': { 'pt-BR': ['Ala 1', 'quadro', 'luzinha vermelha'], en: ['Wing 1', 'breaker', 'little red light'] },
  'radio.hint.drawer.where': { 'pt-BR': ['gaveta do Otávio', 'Ala 1', 'retrato do Morgan'], en: ["Otávio's drawer", 'Wing 1', "Morgan's portrait"] },
  'radio.hint.rest': { 'pt-BR': ['subsolo'], en: ['basement'] },
}

test('every curt hint names what the first two heights of the full one name', () => {
  const missing: string[] = []
  for (const hint of radio.hints) {
    const targets = HINT_TARGETS[hint.heightKeys[0]]
    assert.ok(targets, `hint "${hint.heightKeys[0]}" has its target nouns listed`)
    const curtLineKeys = hint.curtLineKeys ?? []
    assert.ok(curtLineKeys.length > 0, `hint "${hint.heightKeys[0]}" has a curt form`)
    for (const [language, dictionary] of [['pt-BR', ptBR], ['en', en]] as const) {
      const said = (keys: readonly string[]) =>
        keys.map((key) => (dictionary as Record<string, string>)[key]).join(' ').toLowerCase()
      const full = said(hint.heightKeys.slice(0, 2))
      const curt = said(curtLineKeys)
      for (const target of targets[language]) {
        if (!full.includes(target.toLowerCase())) {
          missing.push(`${hint.heightKeys[0]} (${language}) does not say "${target}" by its second height`)
        }
        if (!curt.includes(target.toLowerCase())) {
          missing.push(`${curtLineKeys[0]} (${language}) drops "${target}"`)
        }
      }
    }
    // And the height «o quê» itself is in the curt line by at least one of
    // them: curt is where and what in one breath, never where alone.
    if (hint.heightKeys.length > 1) {
      for (const [language, dictionary] of [['pt-BR', ptBR], ['en', en]] as const) {
        const what = (dictionary as Record<string, string>)[hint.heightKeys[1]].toLowerCase()
        const where = (dictionary as Record<string, string>)[hint.heightKeys[0]].toLowerCase()
        const curt = curtLineKeys.map((key) => (dictionary as Record<string, string>)[key]).join(' ').toLowerCase()
        const shared = targets[language].filter((target) => (what.includes(target.toLowerCase()) || where.includes(target.toLowerCase())) && curt.includes(target.toLowerCase()))
        if (shared.length === 0) missing.push(`${curtLineKeys[0]} (${language}) shares no noun with the heights of its hint`)
      }
    }
  }
  assert.deepEqual(missing, [])
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

  const css = readText(new URL('../src/styles/museum.css', import.meta.url))
  const coarse = css.slice(css.indexOf('/* A column directly above the right-hand stick'))
  const rule = coarse.slice(coarse.indexOf('.hud-tools {'), coarse.indexOf('}'))
  assert.ok(/flex-direction:\s*column;/.test(rule), 'a plain column: the last child is the bottom one')
  assert.ok(!/flex-direction:\s*column-reverse/.test(css), 'nothing flips the tools back')
  assert.ok(/\.hud-tool\.is-radio\.is-on-air/.test(css) && /\.hud-tool\.is-radio\.is-hung-up/.test(css))
})

console.log(`\n${passed}/${passed + failed} radio checks passed.\n`)
if (failed > 0) process.exitCode = 1
