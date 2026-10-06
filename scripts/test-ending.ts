/**
 * Headless proof that a night can be signed off.
 *
 *   npm run test:ending
 *
 * Until this lot the game had no end: the last thing a player could do was
 * read a drawer. The end it gets is a term signed at a desk, and three things
 * are built for it that no suite reached before:
 *
 *   - a TERM is data: when the desk names it (`presentedWhen`), what signing
 *     asks (`when`), the flag the signature sets. The verb records only the
 *     signature (`termsSigned`); the flag follows from it as a trigger, so a
 *     save that arrives with the term and without the flag is given the flag;
 *   - the signature is a press that is HELD, at a keyboard and on glass
 *     (`holdAction.ts`; the table of the gesture is in `test:mobile-controls`);
 *   - what follows a signature is a DIRECTED SEQUENCE: a card and a few lines
 *     that need no radio, play once, and start over if the tab was closed in
 *     the middle of them.
 *
 * The house is made for the test: three rooms, one desk, three terms. The
 * real museum had none of this until the slice that brought the Book, and a
 * suite that proved the machinery on nothing would prove nothing. The store
 * is the real one, and every press here is the function the game's own
 * handler calls (`signingDesk.ts`, `sequenceDirector.ts`), not a copy of it.
 *
 * The museum has its one term since then, and its own cases at the end: the
 * deed of office at the lectern of the hall, and the save that had opened
 * the drawer before the drawer held a key.
 */

import assert from 'node:assert/strict'

import { Group, Mesh, MeshBasicMaterial, Vector3 } from 'three'

import { openBrowser } from './lib/liveTabs.ts'
import { endingWiringProblems, type SourceReader } from './lib/runtimeWiring.ts'
import { openGame, saveOf, seeded, shrunk, suite, throughJson } from './lib/storePage.ts'
import { ORDINARY, playToEnd, press, radioEar, reload } from './lib/playthrough.ts'
import { readText } from './lib/readText.ts'

const { graphSnapshot, parseGraphSnapshot, serialiseGraphSnapshot, validateAdditive } = await import('../src/content/additive.ts')
const { CONTENT_LOT } = await import('../src/content/contentLot.ts')
const { PRE_POSSE_SAVE } = await import('../src/content/legacySave.ts')
const { SAVE_FIXTURES } = await import('../src/content/saveFixtures.ts')
const { en } = await import('../src/content/i18n/en.ts')
const { ptBR } = await import('../src/content/i18n/pt-BR.ts')
const { actionGrant, availableActions, contentActions, simulateProgress } = await import('../src/content/simulate.ts')
const { validateEnding } = await import('../src/content/validate.ts')
const { progressRulesFor } = await import('../src/engine/contentRegistry.ts')
const { checklistNews, checklistRows } = await import('../src/engine/checklist.ts')
const { aimableDevices, airTaken, deviceHeld, deviceInputOf, deviceIntent, deviceLive, nextRadioCall, radioCallReady, radioDeliveryStep, radioDevices, radioWithinEarshot, transmissionLapsed } =
  await import('../src/engine/deviceRules.ts')
const { hiddenInScene, paintLenses, prepareDeskNodes, showDeskNodes } = await import('../src/engine/deviceNodes.ts')
const { HOLD_IDLE, holdStep } = await import('../src/engine/holdAction.ts')
const { interactionHeldIdOf, interactionHeldOf, interactionWinnerOf } = await import('../src/engine/interactionTarget.ts')
const { MUSEUM } = await import('../src/content/museum.ts')
const { toolSpent } = await import('../src/engine/lockRules.ts')
const { fillHour, nightPhraseKey, nightPoints } = await import('../src/engine/nightClock.ts')
const { checklistPageOf } = await import('../src/engine/notebook.ts')
const { credentialKey } = await import('../src/engine/progressCondition.ts')
const { placeRadioCallOn } = await import('../src/engine/radioCall.ts')
const { sequenceStepSeconds, skipSequenceStepOn, startDueSequenceOn } = await import('../src/engine/sequenceDirector.ts')
const { dueSequence } = await import('../src/engine/sequenceRules.ts')
const { pressSigningDeskOn, signAtDeskOn } = await import('../src/engine/signingDesk.ts')
const { deskShows, pendingTerm, signedTerms, signingDeskState, termBlockers, termGrant } = await import('../src/engine/termRules.ts')
const { compileTriggers } = await import('../src/engine/triggers.ts')
const { emptyProgress, grantProgress } = await import('../src/state/progressFields.ts')
const { credentialsTaken, deskMissingText, devicePrompt } = await import('../src/ui/promptRules.ts')

type Content = Parameters<typeof simulateProgress>[0]
type Progress = ReturnType<typeof emptyProgress>
type Raw = Record<string, unknown>
type Issue = ReturnType<typeof validateEnding>[number]
type Page = Awaited<ReturnType<typeof openGame>>

const source: SourceReader = (path) => readText(new URL(`../src/${path}`, import.meta.url))
const { test, done } = suite('The ending: terms, the hold and the directed sequence')

// ---------------------------------------------------------------------------
// A house made for the test
// ---------------------------------------------------------------------------

/**
 * Three rooms, one desk, three terms, oldest first.
 *
 *   - the KEYS are handed over at the door: signable from the first minute;
 *   - the HOUSE is brought to the desk by reading the book in the tray, and
 *     asks for the book and for light in the two dark rooms;
 *   - the NIGHT is on the desk from the first minute too, and asks nothing.
 *
 * So a new game has two terms waiting, a player who has read the book has
 * three, and the desk has to offer them one at a time, the oldest first.
 * The first two are followed by a sequence; the third by nothing.
 */
const DESK = {
  kind: 'signing-desk',
  id: 'hall-desk',
  part: 'atrium-lectern',
  position: [0, 0, 1],
  titleKey: 'house.desk.title',
  emptyNoticeKey: 'house.desk.empty',
  termIds: ['term-keys', 'term-house', 'term-night'],
  holdSeconds: 1.2,
} as const

const RADIO = {
  kind: 'radio',
  id: 'hall-radio',
  part: 'desk-radio',
  position: [1, 0.8, 1],
  titleKey: 'house.radio.title',
  speakerKey: 'house.speaker.porter',
  poweredBy: 'hall',
  calls: [{ id: 'call-rounds', when: {}, delaySeconds: 0, lineKeys: ['house.call.1', 'house.call.2'], mentions: [] }],
  hints: [
    // While the last term is unsigned he has the desk to point at.
    { when: { flagsUnset: ['night-signed'] }, targetId: 'hall-desk', heightKeys: ['house.hint.desk'], mentions: ['hall-desk'] },
    { when: {}, heightKeys: ['house.hint.rest'], mentions: [] },
  ],
} as const

const TERMS = [
  { id: 'term-keys', titleKey: 'house.term.keys', bodyKey: 'house.term.keys.body', presentedWhen: {}, when: {}, grants: 'keys-signed', mentions: ['hall-desk'] },
  {
    id: 'term-house',
    titleKey: 'house.term.house',
    bodyKey: 'house.term.house.body',
    presentedWhen: { documentsRead: ['doc-book'] },
    when: { documentsRead: ['doc-book'], powered: ['cellar', 'attic'] },
    grants: 'house-signed',
    mentions: ['hall-desk'],
  },
  { id: 'term-night', titleKey: 'house.term.night', bodyKey: 'house.term.night.body', presentedWhen: {}, when: {}, grants: 'night-signed', mentions: ['hall-desk'] },
] as const

const SEQUENCES = [
  {
    id: 'seq-keys',
    when: { flags: ['keys-signed'] },
    steps: [
      { kind: 'card', titleKey: 'house.seq.keys.card', seconds: 4 },
      { kind: 'line', speakerKey: 'house.speaker.loud', lineKey: 'house.seq.keys.1' },
    ],
    mentions: [],
  },
  {
    id: 'seq-house',
    when: { flags: ['house-signed'] },
    steps: [
      { kind: 'card', titleKey: 'house.seq.house.card', seconds: 4 },
      { kind: 'line', speakerKey: 'house.speaker.loud', lineKey: 'house.seq.house.1' },
      { kind: 'line', speakerKey: 'house.speaker.loud', lineKey: 'house.seq.house.2' },
    ],
    mentions: ['hall-desk'],
  },
] as const

const opening = (id: string, toRoom: string) => ({ id, toRoom, position: [0, 0, 0], width: 1.6, height: 2.2, rotationY: 0 })
const room = (id: string, patch: Raw) => ({
  id,
  titleKey: `house.room.${id}`,
  nicknameKey: `house.room.${id}`,
  shell: { width: 8, depth: 8, height: 3 },
  origin: [0, 0, 0],
  palette: 'atrium-neutral',
  kit: [],
  exhibitIds: [],
  documentIds: [],
  audio: [],
  portals: [opening(`${id}-to-hall`, 'hall')],
  startsPowered: false,
  powerControl: { id: `${id}-switch`, part: 'breaker-panel', position: [0, 1, 0], titleKey: `house.switch.${id}`, pilotPosition: [0, 1, 0] },
  ...patch,
})

const HOUSE = {
  spawn: { room: 'hall', position: [0, 0, 0], yaw: 0 },
  rooms: [
    room('hall', {
      startsPowered: true,
      powerControl: undefined,
      portals: [opening('hall-to-cellar', 'cellar'), opening('hall-to-attic', 'attic')],
      containers: [{ id: 'hall-tray', part: 'archive-cabinet', position: [2, 0, 0], titleKey: 'house.tray.title' }],
      devices: [DESK, RADIO],
    }),
    room('cellar', {}),
    room('attic', {}),
  ],
  exhibits: [],
  documents: [{ id: 'doc-book', era: 'hall', kind: 'letter', titleKey: 'house.book.title', bodyKey: 'house.book.body', containerId: 'hall-tray' }],
  locks: [],
  facts: [],
  media: [],
  terms: TERMS,
  sequences: SEQUENCES,
} as unknown as Content

const RULES = progressRulesFor(HOUSE)
const [KEYS, HOUSE_TERM, NIGHT] = HOUSE.terms!
const save = (patch: Partial<Progress> = {}): Progress => ({ ...emptyProgress(), ...patch })
/** The save of a player who has done everything the house term asks. */
const READY_FOR_THE_HOUSE = { documentsRead: ['doc-book'], roomsPowered: ['cellar', 'attic'] }
const deskOf = (content: Content = HOUSE) => content.rooms.flatMap((entry) => entry.devices ?? []).find((device) => device.kind === 'signing-desk')!
const stateOf = (progress: Progress, held = false, content: Content = HOUSE) =>
  signingDeskState(content.terms ?? [], deskOf(content), progress, content, held)
const codes = (issues: readonly Issue[]) => issues.filter((issue) => issue.severity === 'error').map((issue) => `${issue.code} ${issue.id ?? ''}`).sort()

/** A page of the real store, in the game, with the house's rules in its slot. */
async function inTheHouse(saved?: unknown): Promise<Page> {
  const { registerProgressRules } = await import('../src/state/progressRules.ts')
  registerProgressRules(RULES)
  const page = await openGame(saved)
  page.state().start()
  return page
}

/** E held on the desk until the gesture fires: the reducer's own steps, a quarter of a second at a time. */
function held(request: { id: string; seconds: number }, aimed: string | null = request.id) {
  let step = holdStep(HOLD_IDLE, { kind: 'press', request })
  for (let frame = 0; frame < 40 && step.fired === null && step.gesture.phase === 'holding'; frame += 1) {
    step = holdStep(step.gesture, { kind: 'tick', seconds: 0.25, aimed })
  }
  return step.fired
}

/** The player holds E on the desk of the page: the press, the hold, and what the game does when it fires. */
function sign(page: Page, content: Content = HOUSE): boolean {
  const answer = pressSigningDeskOn(page.store.useMuseum, content, DESK.id)
  if (typeof answer === 'boolean') return false
  assert.deepEqual(answer, { id: DESK.id, seconds: DESK.holdSeconds }, 'the desk asks for its own hold')
  if (held(answer) !== DESK.id) return false
  return signAtDeskOn(page.store.useMuseum, content, DESK.id)
}

/** The sequence owed is started and watched to its last step; its id, or null when none started. */
function watch(page: Page, content: Content = HOUSE): string | null {
  if (!startDueSequenceOn(page.store.useMuseum, content, false)) return null
  const id = page.state().sequence!.id
  for (let step = 0; step < 32 && page.state().sequence; step += 1) page.state().advanceSequence()
  return id
}

// ---------------------------------------------------------------------------
// Terms (T14)
// ---------------------------------------------------------------------------

await test('a signature records the term and nothing else; the flag follows from it, once', () => {
  assert.deepEqual(termGrant(KEYS), { termsSigned: ['term-keys'] })
  // The flag is a trigger compiled from the term, beside the authored ones.
  const compiled = compileTriggers(HOUSE)
  assert.deepEqual(
    compiled.map((trigger) => trigger.id),
    ['term:term-keys:signed', 'term:term-house:signed', 'term:term-night:signed'],
  )
  assert.deepEqual(compiled[0], { id: 'term:term-keys:signed', when: { termsSigned: ['term-keys'] }, effects: [{ kind: 'set-flag', flag: 'keys-signed' }] })

  const signed = RULES.settle(grantProgress(save(), termGrant(KEYS)))
  assert.deepEqual(signed.termsSigned, ['term-keys'])
  assert.deepEqual(signed.flags, ['keys-signed'])
  assert.deepEqual(signed.triggersFired, ['term:term-keys:signed'])
  // Twice is once: the same object back, nothing to write.
  assert.equal(RULES.settle(grantProgress(signed, termGrant(KEYS))), signed)
  // A save that arrives with the term and without the flag is given the flag.
  const owed = RULES.settle(save({ termsSigned: ['term-night'] }))
  assert.deepEqual(owed.flags, ['night-signed'])
  assert.deepEqual(owed.triggersFired, ['term:term-night:signed'])
  // And the terms a save has signed are listed in the house's order, whatever order they were signed in.
  assert.deepEqual(signedTerms(HOUSE.terms!, save({ termsSigned: ['term-night', 'another-builds-term', 'term-keys'] })).map((term) => term.id), ['term-keys', 'term-night'])
  assert.deepEqual(signedTerms(HOUSE.terms!, save()), [])
})

await test('the desk offers one term at a time, the oldest that has been brought to it', () => {
  // A new game: the keys and the night are on the desk, the house is not yet.
  assert.equal(pendingTerm(HOUSE.terms!, DESK, save(), HOUSE)?.id, 'term-keys')
  assert.deepEqual(stateOf(save()), { state: 'ready', term: KEYS })
  // The keys signed: the night is next, the house still not brought.
  assert.equal(pendingTerm(HOUSE.terms!, DESK, save({ termsSigned: ['term-keys'] }), HOUSE)?.id, 'term-night')
  // With the book read there are three, and the oldest unsigned is the house: the night waits behind it.
  const read = save({ documentsRead: ['doc-book'] })
  assert.equal(pendingTerm(HOUSE.terms!, DESK, read, HOUSE)?.id, 'term-keys')
  assert.equal(pendingTerm(HOUSE.terms!, DESK, { ...read, termsSigned: ['term-keys'] }, HOUSE)?.id, 'term-house')
  assert.equal(pendingTerm(HOUSE.terms!, DESK, { ...read, termsSigned: ['term-keys', 'term-house'] }, HOUSE)?.id, 'term-night')
  assert.equal(pendingTerm(HOUSE.terms!, DESK, { ...read, termsSigned: ['term-night', 'term-keys', 'term-house'] }, HOUSE), null)
  // A desk signs its own terms and no other's.
  assert.equal(pendingTerm(HOUSE.terms!, { ...DESK, termIds: ['term-night'] }, save(), HOUSE)?.id, 'term-night')
  assert.equal(pendingTerm(HOUSE.terms!, { ...DESK, termIds: [] }, save(), HOUSE), null)
  // A list the asker did not hand over is the save in which nothing was signed.
  const { termsSigned: _, ...older } = save()
  assert.equal(pendingTerm(HOUSE.terms!, DESK, older as Progress, HOUSE)?.id, 'term-keys')

  // The four things a desk can be.
  const nothingBrought = { ...HOUSE, terms: [HOUSE_TERM] } as Content
  assert.deepEqual(stateOf(save(), false, nothingBrought), { state: 'empty' })
  assert.deepEqual(stateOf({ ...read, termsSigned: ['term-keys'] }), {
    state: 'blocked',
    term: HOUSE_TERM,
    blockers: { rooms: ['cellar', 'attic'], documents: [], other: false },
  })
  assert.deepEqual(stateOf(save({ ...READY_FOR_THE_HOUSE, termsSigned: ['term-keys'] })), { state: 'ready', term: HOUSE_TERM })
  // Every term brought is signed: the desk says so of the last of them.
  assert.deepEqual(stateOf(save({ termsSigned: ['term-keys', 'term-night'] })), { state: 'signed', term: NIGHT })
  assert.deepEqual(stateOf(save({ ...READY_FOR_THE_HOUSE, termsSigned: ['term-keys', 'term-house', 'term-night'] })), { state: 'signed', term: NIGHT })
})

await test('a term is not signed with a room dark, and the desk names each thing that is missing', () => {
  const blockers = (progress: Progress) => termBlockers(HOUSE_TERM, progress, HOUSE)
  assert.deepEqual(blockers(save()), { rooms: ['cellar', 'attic'], documents: ['doc-book'], other: false })
  assert.deepEqual(blockers(save({ documentsRead: ['doc-book'] })), { rooms: ['cellar', 'attic'], documents: [], other: false })
  assert.deepEqual(blockers(save({ documentsRead: ['doc-book'], roomsPowered: ['attic'] })), { rooms: ['cellar'], documents: [], other: false })
  assert.deepEqual(blockers(save(READY_FOR_THE_HOUSE)), { rooms: [], documents: [], other: false })
  // A room that never lost its power is never missing.
  assert.deepEqual(termBlockers({ ...HOUSE_TERM, when: { powered: ['hall', 'attic'] } }, save(), HOUSE).rooms, ['attic'])
  // What a term asks beyond rooms and papers has no name here, and is said to be there.
  const more = { ...HOUSE_TERM, when: { ...HOUSE_TERM.when, flags: ['keys-signed'] } }
  assert.deepEqual(termBlockers(more, save(READY_FOR_THE_HOUSE), HOUSE), { rooms: [], documents: [], other: true })
  assert.deepEqual(termBlockers(more, save({ ...READY_FOR_THE_HOUSE, flags: ['keys-signed'] }), HOUSE), { rooms: [], documents: [], other: false })

  // The words, in both languages: the rooms, then the papers.
  const say = (dictionary: Record<string, string>) => ({ power: dictionary['desk.missing.power'], document: dictionary['desk.missing.document'] })
  assert.equal(deskMissingText({ rooms: ['Porão', 'Sótão'], documents: ['Livro'] }, say(ptBR)), 'falta luz em: Porão, Sótão · falta: Livro')
  assert.equal(deskMissingText({ rooms: ['Cellar'], documents: [] }, say(en)), 'no light yet in: Cellar')
  assert.equal(deskMissingText({ rooms: [], documents: ['Book'] }, say(en)), 'missing: Book')
  assert.equal(deskMissingText({ rooms: [], documents: [] }, say(en)), '')
})

await test('one answer for the prompt, the key and the touch button: what the desk stands at', () => {
  const intentOf = (progress: Progress, sequence: object | null = null) =>
    deviceIntent(DESK, deviceInputOf(DESK, { progress, radio: null, sequence }, HOUSE))
  // The crosshair rests on a desk whatever the night: it always has something to say.
  assert.deepEqual(aimableDevices(HOUSE).map((entry) => entry.device.id), ['hall-desk', 'hall-radio'])

  const ready = intentOf(save())
  assert.deepEqual(ready, { kind: 'desk', state: { state: 'ready', term: KEYS } })
  assert.equal(deviceLive(ready), true)
  assert.deepEqual(devicePrompt(DESK, ready), { form: 'hold', holdId: 'hall-desk', seconds: 1.2, termKey: 'house.term.keys' })

  const blocked = intentOf(save({ documentsRead: ['doc-book'], termsSigned: ['term-keys'], sequencesSeen: ['seq-keys'] }))
  assert.equal(blocked.kind === 'desk' && blocked.state.state, 'blocked')
  // It answers the press, with a buzz: like a door that will not open.
  assert.equal(deviceLive(blocked), true)
  assert.deepEqual(devicePrompt(DESK, blocked), {
    form: 'desk',
    titleKey: 'house.desk.title',
    termKey: 'house.term.house',
    missing: { rooms: ['cellar', 'attic'], documents: [], other: false },
  })

  const empty = deviceIntent(DESK, deviceInputOf(DESK, { progress: save(), radio: null, sequence: null }, { ...HOUSE, terms: [HOUSE_TERM] } as Content))
  assert.deepEqual(empty, { kind: 'desk', state: { state: 'empty' } })
  assert.equal(deviceLive(empty), false, 'an empty desk holds the prompt and never the key')
  assert.deepEqual(devicePrompt(DESK, empty), { form: 'notice', titleKey: 'house.desk.title', noticeKey: 'house.desk.empty' })

  const signed = intentOf(save({ termsSigned: ['term-keys', 'term-night'], sequencesSeen: ['seq-keys'] }))
  assert.deepEqual(signed, { kind: 'desk', state: { state: 'signed', term: NIGHT } })
  assert.equal(deviceLive(signed), false)
  assert.deepEqual(devicePrompt(DESK, signed), { form: 'signed', titleKey: 'house.desk.title', termKey: 'house.term.night' })

  // A device of another kind handed a desk's intent draws nothing, and a desk nothing for another's.
  assert.equal(devicePrompt(RADIO, ready), null)
  assert.equal(devicePrompt(DESK, { kind: 'notice' }), null)
  // Asked with nothing but power, as the scan asks: a desk answers, with nothing brought.
  assert.deepEqual(deviceIntent(DESK, { powered: true, carried: false, speaking: false }), { kind: 'desk', state: { state: 'empty' } })

  // The lamp is drawn while a term waits; the Book once one has been signed (DL3-7).
  assert.deepEqual(deskShows(stateOf(save()), DESK, save()), { lamp: true, book: false })
  assert.deepEqual(deskShows(stateOf(save({ documentsRead: ['doc-book'], termsSigned: ['term-keys'] })), DESK, save({ termsSigned: ['term-keys'] })), { lamp: true, book: true })
  const all = save({ termsSigned: ['term-keys', 'term-night'] })
  assert.deepEqual(deskShows(stateOf(all), DESK, all), { lamp: false, book: true })
  assert.deepEqual(deskShows({ state: 'empty' }, DESK, save()), { lamp: false, book: false })
  // Another desk's term on record is not this desk's Book.
  assert.deepEqual(deskShows({ state: 'empty' }, { ...DESK, termIds: ['term-house'] }, all), { lamp: false, book: false })

  // The words of the lot plan, §6.4.
  const words = ['desk.sign', 'desk.hold.keyboard', 'desk.hold.touch', 'desk.cancel', 'desk.missing.power', 'desk.missing.document', 'desk.signed', 'term.signed', 'journal.terms.heading']
  assert.deepEqual(
    words.map((key) => ptBR[key as keyof typeof ptBR]),
    ['Assinar', 'Segure E', 'Segure Ação', 'Cancelar', 'falta luz em', 'falta', 'assinado', 'Assinado pelo curador.', 'Termos assinados'],
  )
  assert.deepEqual(
    words.map((key) => en[key as keyof typeof en]),
    ['Sign', 'Hold E', 'Hold Action', 'Cancel', 'no light yet in', 'missing', 'signed', 'Signed by the curator.', 'Deeds signed'],
  )
})

await test('the lamp and the Book of a desk are gathered without moving a node, drawn only when told, and painted with the lenses', () => {
  // A desk as the kit would clone it: the stand, a lamp of two nodes, the
  // Book and its marker, each with a transform of its own (the one that
  // undoes quantisation), on a wrapper that places the whole.
  const wrapper = new Group()
  wrapper.position.set(-7.15, 0, 2.2)
  wrapper.rotation.y = Math.PI / 2
  const assembly = new Group()
  wrapper.add(assembly)
  const names = ['atrium-lectern', 'atrium-lectern__led', 'atrium-lectern__led-ring', 'atrium-lectern__book', 'atrium-lectern__book-marker']
  for (const [index, name] of names.entries()) {
    const node = new Mesh()
    node.name = name
    node.position.set(index * 0.1, 0.9 + index * 0.01, -index * 0.07)
    node.scale.setScalar(0.5 + index * 0.1)
    assembly.add(node)
  }
  wrapper.updateMatrixWorld(true)
  const before = names.map((name) => assembly.getObjectByName(name)!.getWorldPosition(new Vector3()))

  const nodes = prepareDeskNodes(assembly, 'atrium-lectern')
  assert.deepEqual(nodes.lamp?.children.map((child) => child.name), ['atrium-lectern__led', 'atrium-lectern__led-ring'])
  assert.deepEqual(nodes.book?.children.map((child) => child.name), ['atrium-lectern__book', 'atrium-lectern__book-marker'])
  assert.deepEqual(assembly.children.map((child) => child.name), ['atrium-lectern', 'desk-lamp', 'desk-book'], 'the stand stays where it was')
  // Idempotent, because StrictMode runs memos twice.
  const again = prepareDeskNodes(assembly, 'atrium-lectern')
  assert.equal(again.lamp, nodes.lamp)
  assert.equal(again.book, nodes.book)
  wrapper.updateMatrixWorld(true)
  for (const [index, name] of names.entries()) {
    assert.ok(assembly.getObjectByName(name)!.getWorldPosition(new Vector3()).distanceTo(before[index]) < 1e-12, `${name} moved`)
  }

  const drawn = () => [nodes.lamp!.visible, nodes.book!.visible]
  showDeskNodes(nodes, false, false)
  assert.deepEqual(drawn(), [false, false], 'a desk with nothing on it draws neither')
  showDeskNodes(nodes, true, false)
  assert.deepEqual(drawn(), [true, false])
  showDeskNodes(nodes, false, true)
  assert.deepEqual(drawn(), [false, true])
  // A lamp that is not drawn hides its lenses from whatever aims at it.
  assert.equal(hiddenInScene(assembly.getObjectByName('atrium-lectern__led-ring')!), true)
  assert.equal(hiddenInScene(assembly.getObjectByName('atrium-lectern__book')!), false)
  assert.equal(hiddenInScene(assembly.getObjectByName('atrium-lectern')!), false)
  // And it is painted like any lens, through the group.
  const green = new MeshBasicMaterial()
  paintLenses(assembly, 'atrium-lectern', green)
  assert.equal((assembly.getObjectByName('atrium-lectern__led') as InstanceType<typeof Mesh>).material, green)
  assert.notEqual((assembly.getObjectByName('atrium-lectern__book') as InstanceType<typeof Mesh>).material, green)

  // The lectern as it is baked today has neither: nothing to gather, nothing to show, nothing thrown.
  const bare = new Group()
  bare.add(Object.assign(new Mesh(), { name: 'atrium-lectern' }))
  const none = prepareDeskNodes(bare, 'atrium-lectern')
  assert.deepEqual(none, { lamp: null, book: null })
  assert.doesNotThrow(() => showDeskNodes(none, true, true))
  assert.equal(bare.children.length, 1)
})

// ---------------------------------------------------------------------------
// The real store: signing, and what follows
// ---------------------------------------------------------------------------

await test('signing is idempotent: twice is once, the trigger fires once, the sequence plays once', async () => {
  const page = await inTheHouse()
  assert.equal(page.notifications(() => assert.equal(sign(page), true)), 1, 'the signature and the flag it sets are one write')
  assert.deepEqual(page.progress().termsSigned, ['term-keys'])
  assert.deepEqual(page.progress().flags, ['keys-signed'])
  assert.deepEqual(page.progress().triggersFired, ['term:term-keys:signed'])

  // The card is owed: until it has closed the desk offers nothing, and a press on it is not taken.
  assert.equal(pressSigningDeskOn(page.store.useMuseum, HOUSE, DESK.id), false)
  assert.equal(signAtDeskOn(page.store.useMuseum, HOUSE, DESK.id), false, 'a hold that fired late signed the next term under the card')
  const before = page.progress()
  page.state().grant(termGrant(KEYS))
  assert.equal(page.progress(), before, 'the same signature again wrote to the save')

  assert.equal(watch(page), 'seq-keys')
  assert.deepEqual(page.progress().sequencesSeen, ['seq-keys'])
  assert.equal(startDueSequenceOn(page.store.useMuseum, HOUSE, false), false, 'a sequence seen to its end played again')
  assert.equal(page.state().sequence, null)
  assert.deepEqual(page.progress().termsSigned, ['term-keys'])
  assert.deepEqual(page.progress().triggersFired, ['term:term-keys:signed'])
})

await test('a reload before and after: the term stays, a sequence cut off starts over, one seen out never plays again', async () => {
  const page = await inTheHouse()
  assert.equal(sign(page), true)
  // The card is up, and the tab is closed on its first step.
  assert.equal(startDueSequenceOn(page.store.useMuseum, HOUSE, false), true)
  assert.deepEqual({ ...page.state().sequence, serial: 0 }, { id: 'seq-keys', index: 0, steps: 2, serial: 0 })
  page.state().advanceSequence()
  assert.equal(page.state().sequence?.index, 1)
  assert.deepEqual(page.progress().sequencesSeen, [], 'a sequence is seen at its last step, not at its first')
  page.leave()

  const back = await inTheHouse(page.savedText()!)
  assert.deepEqual(back.progress().termsSigned, ['term-keys'], 'the signature did not survive the disk')
  assert.deepEqual(back.progress().flags, ['keys-signed'])
  assert.equal(back.state().sequence, null, 'what is on screen is the session\'s, never the save\'s')
  assert.equal(startDueSequenceOn(back.store.useMuseum, HOUSE, false), true)
  assert.equal(back.state().sequence?.index, 0, 'a sequence cut off by a reload starts from its first step')
  // Stopped (the scene went away under it): nothing is recorded, and it is still owed.
  back.state().stopSequence()
  assert.deepEqual(back.progress().sequencesSeen, [])
  assert.equal(watch(back), 'seq-keys')
  back.leave()

  const again = await inTheHouse(back.savedText()!)
  assert.deepEqual(again.progress().sequencesSeen, ['seq-keys'])
  assert.equal(startDueSequenceOn(again.store.useMuseum, HOUSE, false), false, 'a sequence seen to its end played again after a reload')
  assert.deepEqual(again.progress().termsSigned, ['term-keys'])
  // And the trigger did not fire a second time on the way through the disk.
  assert.deepEqual(again.progress().triggersFired, ['term:term-keys:signed'])
})

await test('two and three terms waiting: the oldest first, named in the prompt, the next only once the card has closed (S26)', async () => {
  const named = (page: Page) => {
    const state = page.state()
    const view = devicePrompt(DESK, deviceIntent(DESK, deviceInputOf(DESK, state, HOUSE)))
    return view && 'termKey' in view ? `${view.form} ${view.termKey}` : (view?.form ?? null)
  }
  // Three: the book is read and both rooms are lit before anything is signed.
  const page = await inTheHouse()
  page.state().grant(READY_FOR_THE_HOUSE)
  assert.equal(named(page), 'hold house.term.keys')
  assert.equal(sign(page), true)
  assert.deepEqual(page.progress().termsSigned, ['term-keys'])
  // The card of the first is owed and then on screen: the desk says what was signed, and offers nothing.
  assert.equal(named(page), 'signed house.term.keys')
  assert.equal(sign(page), false)
  assert.equal(startDueSequenceOn(page.store.useMuseum, HOUSE, false), true)
  assert.equal(named(page), 'signed house.term.keys')
  assert.equal(sign(page), false, 'the next term was signed under the card of the one before')
  page.state().advanceSequence()
  assert.equal(named(page), 'signed house.term.keys')
  page.state().advanceSequence()
  assert.equal(page.state().sequence, null)
  // Closed: the second.
  assert.equal(named(page), 'hold house.term.house')
  assert.equal(sign(page), true)
  assert.equal(named(page), 'signed house.term.house')
  assert.equal(watch(page), 'seq-house')
  // The third has no sequence after it: the desk is done the moment it is signed.
  assert.equal(named(page), 'hold house.term.night')
  assert.equal(sign(page), true)
  assert.equal(named(page), 'signed house.term.night')
  assert.equal(watch(page), null)
  assert.deepEqual(page.progress().termsSigned, ['term-keys', 'term-house', 'term-night'])
  assert.deepEqual(page.progress().flags, ['keys-signed', 'house-signed', 'night-signed'])
  assert.deepEqual(page.progress().sequencesSeen, ['seq-keys', 'seq-house'])

  // Two: a new game, with the house term not brought yet. The night is signed before it.
  const fresh = await inTheHouse()
  assert.equal(sign(fresh), true)
  assert.equal(watch(fresh), 'seq-keys')
  assert.equal(named(fresh), 'hold house.term.night')
  assert.equal(sign(fresh), true)
  assert.equal(named(fresh), 'signed house.term.night')
  // The book is read afterwards: the house comes to the desk, and is the one left.
  fresh.state().grant({ documentsRead: ['doc-book'] })
  assert.equal(named(fresh), 'desk house.term.house')
  assert.deepEqual(fresh.progress().termsSigned, ['term-keys', 'term-night'])
})

await test('a dark room keeps the term unsigned in the store too: the press is answered and nothing is written', async () => {
  const page = await inTheHouse()
  assert.equal(sign(page), true)
  assert.equal(watch(page), 'seq-keys')
  page.state().grant({ documentsRead: ['doc-book'] })
  const before = page.progress()
  // E gets the buzz: taken, with no hold asked for.
  assert.equal(pressSigningDeskOn(page.store.useMuseum, HOUSE, DESK.id), true)
  // And a hold that fired anyway (the room went dark in another tab meanwhile) signs nothing.
  assert.equal(signAtDeskOn(page.store.useMuseum, HOUSE, DESK.id), false)
  assert.equal(page.progress(), before)
  page.state().powerRoom('cellar')
  assert.equal(sign(page), false, 'signed with the attic still dark')
  page.state().powerRoom('attic')
  assert.equal(sign(page), true)
  assert.deepEqual(page.progress().termsSigned, ['term-keys', 'term-house'])
  // A desk the house does not have answers nothing.
  assert.equal(pressSigningDeskOn(page.store.useMuseum, HOUSE, 'no-such-desk'), false)
  assert.equal(signAtDeskOn(page.store.useMuseum, HOUSE, 'hall-radio'), false)
})

await test('a press is held only at a desk with a term ready: what the touch button and the frame that counts both ask', () => {
  // The focuses of a store with nothing open, the desk under the crosshair.
  const focus = (patch: Raw = {}) =>
    ({
      examining: null,
      openedContainer: null,
      activeLock: null,
      journalTab: null,
      focusedTransitionDoor: null,
      focusedExhibit: null,
      focusedContainer: null,
      focusedContainerDistance: Number.POSITIVE_INFINITY,
      focusedDevice: DESK.id,
      focusedDeviceDistance: 1.2,
      focusedPowerControl: null,
      focusedPowerControlDistance: Number.POSITIVE_INFINITY,
      radio: null,
      sequence: null,
      progress: save(),
      ...patch,
    }) as unknown as Parameters<typeof interactionHeldIdOf>[0]
  const heldOn = (patch: Raw = {}, content: Content = HOUSE) => interactionHeldIdOf(focus(patch), content)

  assert.equal(heldOn(), DESK.id)
  assert.equal(interactionHeldOf(focus(), HOUSE), true)
  // A term that still waits: the desk is live (it buzzes), and nothing is held on it.
  const waiting = { progress: save({ documentsRead: ['doc-book'], termsSigned: ['term-keys'] }) }
  assert.deepEqual(interactionWinnerOf(focus(waiting), HOUSE), { kind: 'device', id: DESK.id, live: true })
  assert.equal(heldOn(waiting), null)
  assert.equal(interactionHeldOf(focus(waiting), HOUSE), false)
  // Everything signed; the card of a signature still up; a modal open; the
  // aim on the radio beside it; a door in the sights (a door owns the press).
  assert.equal(heldOn({ progress: save({ termsSigned: ['term-keys', 'term-night'] }) }), null)
  assert.equal(heldOn({ sequence: { id: 'seq-keys', index: 0, steps: 2, serial: 1 } }), null)
  assert.equal(heldOn({ progress: save({ termsSigned: ['term-keys'], flags: ['keys-signed'] }) }), null, 'a sequence owed and not yet started holds the desk too')
  assert.equal(heldOn({ journalTab: 'notebook' }), null)
  assert.equal(heldOn({ focusedDevice: RADIO.id }), null)
  assert.equal(heldOn({ focusedTransitionDoor: { id: 'hall-to-cellar', targetRoom: 'cellar', status: 'ready', armed: false } }), null)
  assert.equal(heldOn({ focusedDevice: null }), null)

  // The museum has one thing a press is held on: the lectern of the hall,
  // and only with the deed ready on it (the Book read, the three rooms lit,
  // not yet signed). Its touch button acts on the click for every other
  // thing in it, as it did before this lot.
  const lit = save({ roomsPowered: ['office', 'atrium', 'holyoke'], devicesCarried: ['office-radio'], flags: ['clock-set'] })
  const ready = { ...lit, documentsRead: ['doc-termos'] }
  const nights = [
    save(),
    lit,
    ready,
    save({ documentsRead: ['doc-termos'], roomsPowered: ['office', 'atrium'] }),
    { ...ready, termsSigned: ['termo-posse'], flags: ['clock-set', 'posse-signed'], sequencesSeen: ['seq-posse'] },
  ]
  for (const { device } of aimableDevices(MUSEUM)) {
    for (const progress of nights) {
      assert.equal(
        interactionHeldOf(focus({ focusedDevice: device.id, progress }), MUSEUM),
        device.id === 'atrium-lectern' && progress === ready,
        `${device.id}: whether its press is held, on night ${nights.indexOf(progress) + 1} of ${nights.length}`,
      )
    }
  }
  assert.deepEqual(
    MUSEUM.rooms.flatMap((entry) => (entry.devices ?? []).flatMap((device) => (device.kind === 'signing-desk' ? [device.id] : []))),
    ['atrium-lectern'],
    'the lectern of the hall is the one signing desk of the museum',
  )
})

await test('a hold that loses the desk does not sign: looked away, let go, or cut by Escape', () => {
  const request = { id: DESK.id, seconds: DESK.holdSeconds }
  assert.equal(held(request), DESK.id)
  assert.equal(held(request, null), null, 'the crosshair left the desk and the term was signed')
  assert.equal(held(request, 'hall-radio'), null)
  let step = holdStep(HOLD_IDLE, { kind: 'press', request })
  step = holdStep(step.gesture, { kind: 'tick', seconds: 0.25, aimed: DESK.id })
  step = holdStep(step.gesture, { kind: 'tick', seconds: 0.25, aimed: DESK.id })
  assert.deepEqual(holdStep(step.gesture, { kind: 'release' }), { gesture: HOLD_IDLE, fired: null })
  assert.deepEqual(holdStep(step.gesture, { kind: 'cancel' }), { gesture: HOLD_IDLE, fired: null })
})

// ---------------------------------------------------------------------------
// The directed sequence (T16)
// ---------------------------------------------------------------------------

await test('a sequence is owed from the moment its condition holds until it has been seen, one at a time, in the order written', () => {
  const due = (progress: Progress) => dueSequence(HOUSE.sequences!, progress, HOUSE)?.id ?? null
  assert.equal(due(save()), null)
  assert.equal(due(save({ flags: ['keys-signed'] })), 'seq-keys')
  assert.equal(due(save({ flags: ['house-signed', 'keys-signed'] })), 'seq-keys', 'two owed: the first written')
  assert.equal(due(save({ flags: ['house-signed', 'keys-signed'], sequencesSeen: ['seq-keys'] })), 'seq-house')
  assert.equal(due(save({ flags: ['house-signed', 'keys-signed'], sequencesSeen: ['seq-keys', 'seq-house'] })), null)
  // A list the asker did not hand over is the save in which nothing was shown.
  const { sequencesSeen: _, ...older } = save({ flags: ['keys-signed'] })
  assert.equal(due(older as Progress), 'seq-keys')
  // How long each step stays: a card its own seconds, a line a reading pace.
  assert.equal(sequenceStepSeconds({ kind: 'card', titleKey: 'x', seconds: 4 }, ''), 4)
  assert.equal(sequenceStepSeconds({ kind: 'line', speakerKey: 'x', lineKey: 'y' }, 'Curto.'), 3.2)
  assert.ok(sequenceStepSeconds({ kind: 'line', speakerKey: 'x', lineKey: 'y' }, 'x'.repeat(120)) > 8)
  // And a line of one may say the hour, like a line of the radio.
  assert.equal(fillHour('Curador, {hora}. Vai pra casa.', 'passa das nove'), 'Curador, passa das nove. Vai pra casa.')
})

await test('the director starts what is owed when nothing holds it, and never over one that is playing', async () => {
  const page = await inTheHouse()
  const store = page.store.useMuseum
  assert.equal(startDueSequenceOn(store, HOUSE, false), false, 'nothing is owed in a new game')
  page.state().grant({ termsSigned: ['term-keys'] })
  // Held: a modal is open, or the tab is hidden, or the scene is not there yet.
  assert.equal(startDueSequenceOn(store, HOUSE, true), false)
  assert.equal(page.state().sequence, null)
  assert.equal(startDueSequenceOn(store, HOUSE, false), true)
  const playing = page.state().sequence
  assert.equal(startDueSequenceOn(store, HOUSE, false), false, 'a second one was started over the first')
  assert.equal(page.state().sequence, playing)

  // The skip: one step on, and from the last it is seen. Under a modal it is held, and the key does nothing.
  page.state().setJournalTab('notebook')
  assert.equal(skipSequenceStepOn(store), false, 'a sequence held under the journal was moved on by a key')
  page.state().setJournalTab(null)
  assert.equal(skipSequenceStepOn(store), true)
  assert.equal(page.state().sequence?.index, 1)
  assert.equal(page.notifications(() => assert.equal(skipSequenceStepOn(store), true)), 1, 'the end of a sequence and its record are one write')
  assert.equal(page.state().sequence, null)
  assert.deepEqual(page.progress().sequencesSeen, ['seq-keys'])
  assert.equal(skipSequenceStepOn(store), false, 'with nothing on screen the key is not taken')

  // On the title screen nothing plays: the store of a tab that has not entered.
  const titled = await openGame(saveOf({ version: 1, radioCalls: [], termsSigned: ['term-keys'], flags: ['keys-signed'] }))
  assert.equal(startDueSequenceOn(titled.store.useMuseum, HOUSE, false), false)
})

await test('with the radio on its desk the sequence plays; a call on air is cut, is not heard, and comes back', async () => {
  const page = await inTheHouse()
  const store = page.store.useMuseum
  const radio = RADIO as unknown as Parameters<typeof nextRadioCall>[0]
  // Nobody carries this radio: it stays on the desk, and the house has no other.
  assert.deepEqual(page.progress().devicesCarried, [])
  // The porter is in the middle of a call.
  assert.equal(placeRadioCallOn(store, HOUSE, RADIO.id, 1_000, () => 0.5), true)
  assert.equal(page.state().radio?.callId, 'call-rounds')
  assert.equal(page.state().radio?.index, 0)

  assert.equal(sign(page), true)
  assert.equal(startDueSequenceOn(store, HOUSE, false), true)
  assert.equal(page.state().radio, null, 'the sequence started under the porter\'s voice')
  assert.deepEqual(page.progress().radioCalls, [], 'a call cut off by the sequence was recorded as heard')
  // While it plays the air is taken: the director of the radio waits, and R moves the sequence on.
  assert.equal(airTaken(page.state()), true)
  const delivery = () =>
    radioDeliveryStep(radioCallReady(radio, 'call-rounds', page.progress(), HOUSE), { onAir: airTaken(page.state()), modal: false, hidden: false })
  assert.equal(delivery(), 'wait')
  const memory = page.progress().radioMemory
  assert.equal(placeRadioCallOn(store, HOUSE, RADIO.id, 2_000, () => 0.5), true)
  assert.equal(page.state().sequence?.index, 1, 'R during a sequence did not move it on a step')
  assert.equal(page.state().radio, null, 'R during a sequence placed a call')
  assert.equal(page.progress().radioMemory, memory, 'and it counted against the porter\'s patience')
  assert.equal(placeRadioCallOn(store, HOUSE, RADIO.id, 3_000, () => 0.5), true)
  assert.equal(page.state().sequence, null)
  assert.deepEqual(page.progress().sequencesSeen, ['seq-keys'])

  // Over: the call is still owed, from its first line.
  assert.equal(airTaken(page.state()), false)
  assert.equal(nextRadioCall(radio, page.progress(), HOUSE)?.id, 'call-rounds')
  assert.equal(delivery(), 'play')
  assert.equal(placeRadioCallOn(store, HOUSE, RADIO.id, 4_000, () => 0.5), true)
  assert.equal(page.state().radio?.callId, 'call-rounds')
  assert.equal(page.state().radio?.index, 0)
  page.state().advanceRadio()
  page.state().advanceRadio()
  assert.deepEqual(page.progress().radioCalls, ['call-rounds'])
})

await test('two live tabs: one signs and watches, the other hears; neither replays what was seen, and they fall silent', async () => {
  const browser = openBrowser(saveOf({ version: 1, radioCalls: [], documentsRead: ['doc-book'], roomsVisited: ['hall', 'cellar'] }))
  try {
    const signing = await browser.open('the tab at the desk')
    const elsewhere = await browser.open('the tab in the cellar', 'idle')
    const titled = await browser.open('a tab left on the title screen')
    for (const tab of [signing, elsewhere]) {
      tab.act((state) => state.start())
      tab.registerRules(RULES)
    }
    elsewhere.act((state) => state.setCurrentRoom('cellar'))
    const leftAlone = (when: string) => {
      const { quiet, rounds } = browser.settle()
      assert.ok(quiet, `${when}: the tabs were still writing the save at each other (writes per round: ${rounds.join(', ')})`)
    }
    leftAlone('two tabs in the game')
    const written = browser.writes.length

    // One tab signs. The other is told, and has the sequence owed too, but is in the background: held.
    signing.act(() => assert.equal(signAtDeskOn(signing.store.useMuseum, HOUSE, DESK.id), true))
    leftAlone('one tab signed')
    assert.deepEqual(browser.writes.slice(written).map((write) => write.by), [signing.name], 'a signature is one write, and nobody answers it')
    for (const tab of browser.tabs) {
      assert.deepEqual(tab.progress().termsSigned, ['term-keys'], `"${tab.name}" does not have the term`)
      assert.deepEqual(tab.progress().flags, ['keys-signed'], `"${tab.name}" does not have the flag`)
      assert.deepEqual(tab.progress().triggersFired, ['term:term-keys:signed'], `"${tab.name}" does not have the trigger`)
    }
    assert.equal(elsewhere.act(() => startDueSequenceOn(elsewhere.store.useMuseum, HOUSE, true)), false)

    // The signing tab watches it to the end: one more write, and the other has nothing left to show.
    signing.act(() => assert.equal(startDueSequenceOn(signing.store.useMuseum, HOUSE, false), true))
    assert.equal(elsewhere.state().sequence, null, 'what is on screen in one tab went on screen in the other')
    signing.act((state) => {
      state.advanceSequence()
      state.advanceSequence()
    })
    leftAlone('the sequence was watched to its end')
    assert.deepEqual(browser.writes.slice(written).map((write) => write.by), [signing.name, signing.name])
    for (const tab of browser.tabs) assert.deepEqual(tab.progress().sequencesSeen, ['seq-keys'], `"${tab.name}" would play it again`)
    assert.equal(elsewhere.act(() => startDueSequenceOn(elsewhere.store.useMuseum, HOUSE, false)), false)

    // A tab with no rules that writes rewrites the save from what it holds: nothing of the ending is lost.
    titled.act((state) => state.setSetting('brightness', 1.2))
    leftAlone('the tab on the title screen changed a setting')
    const disk = browser.disk()!.progress!
    assert.deepEqual(disk.termsSigned, ['term-keys'])
    assert.deepEqual(disk.flags, ['keys-signed'])
    assert.deepEqual(disk.sequencesSeen, ['seq-keys'])
    assert.deepEqual(disk.triggersFired, ['term:term-keys:signed'])

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

// ---------------------------------------------------------------------------
// The exhaustive player, the gate and the snapshot
// ---------------------------------------------------------------------------

const played = simulateProgress(HOUSE)

await test('the exhaustive player signs all three, in the order the desk offers them, and the house is accused of nothing', () => {
  assert.deepEqual(codes(played.issues), [])
  assert.deepEqual(codes(validateEnding(HOUSE)), [])
  assert.deepEqual(played.final.termsSigned, ['term-keys', 'term-house', 'term-night'])
  assert.deepEqual([...played.final.flags].sort(), ['house-signed', 'keys-signed', 'night-signed'])
  // She watches what she is owed: nothing is left to play at the end.
  assert.deepEqual(played.final.sequencesSeen, ['seq-keys', 'seq-house'])
  const levelOf = (entry: string) => played.levels.findIndex((level) => level.includes(entry))
  assert.deepEqual(
    ['term:term-keys', 'flag:keys-signed', 'doc:doc-book', 'power:cellar', 'term:term-house', 'term:term-night'].map((entry) => `${entry} N${levelOf(entry)}`),
    ['term:term-keys N0', 'flag:keys-signed N0', 'doc:doc-book N0', 'power:cellar N1', 'term:term-house N2', 'term:term-night N3'],
  )

  // What is offered is what the desk's own rule says, and what it gives is the signature.
  const offered = (progress: Progress) => availableActions(HOUSE, progress, 'hall').filter((action) => action.kind === 'sign')
  assert.deepEqual(offered(save()), [{ kind: 'sign', deviceId: 'hall-desk', termId: 'term-keys' }])
  assert.deepEqual(actionGrant(HOUSE, save(), { kind: 'sign', deviceId: 'hall-desk', termId: 'term-keys' }), { termsSigned: ['term-keys'] })
  // Not the term the desk is not offering, and nothing at a blocked desk.
  assert.deepEqual(actionGrant(HOUSE, save(), { kind: 'sign', deviceId: 'hall-desk', termId: 'term-night' }), {})
  const blocked = save({ documentsRead: ['doc-book'], termsSigned: ['term-keys'], sequencesSeen: ['seq-keys'] })
  assert.deepEqual(offered(blocked), [])
  assert.deepEqual(actionGrant(HOUSE, blocked, { kind: 'sign', deviceId: 'hall-desk', termId: 'term-house' }), {})
  assert.deepEqual(availableActions(HOUSE, save(), 'cellar').filter((action) => action.kind === 'sign'), [], 'a desk is signed at in its own room')

  // Written down: a record to each term of each desk, with what the term asks.
  const records = Object.fromEntries(contentActions(HOUSE).map((entry) => [entry.id, entry]))
  assert.deepEqual(records['sign:hall-desk:term-keys'], { id: 'sign:hall-desk:term-keys', requires: ['room:hall'], grants: ['term:term-keys'] })
  assert.deepEqual(records['sign:hall-desk:term-house'], {
    id: 'sign:hall-desk:term-house',
    requires: ['doc:doc-book', 'power:attic', 'power:cellar', 'room:hall'],
    grants: ['term:term-house'],
  })
  assert.deepEqual(records['trigger:term:term-house:signed'], {
    id: 'trigger:term:term-house:signed',
    requires: ['term:term-house'],
    grants: ['fired:term:term-house:signed', 'flag:house-signed'],
  })
  for (const id of ['sign:hall-desk:term-keys', 'sign:hall-desk:term-house', 'sign:hall-desk:term-night']) {
    assert.ok(played.actions.some((entry) => entry.id === id), `${id} was never met by the player`)
  }
})

/** The house with one thing changed. */
const withTerm = (id: string, patch: Raw): Content =>
  ({ ...HOUSE, terms: HOUSE.terms!.map((term) => (term.id === id ? { ...term, ...patch } : term)) }) as Content
const withHall = (patch: (hall: Content['rooms'][number]) => Raw): Content =>
  ({ ...HOUSE, rooms: HOUSE.rooms.map((entry) => (entry.id === 'hall' ? { ...entry, ...patch(entry) } : entry)) }) as Content
const withDesk = (patch: Raw): Content =>
  withHall((hall) => ({ devices: (hall.devices ?? []).map((device) => (device.kind === 'signing-desk' ? { ...device, ...patch } : device)) }))
const withSequence = (id: string, patch: Raw): Content =>
  ({ ...HOUSE, sequences: HOUSE.sequences!.map((sequence) => (sequence.id === id ? { ...sequence, ...patch } : sequence)) }) as Content

await test('each accusation of the ending, on a house broken for it', () => {
  const quiet: string[] = []
  const proves = (code: string, id: string, issues: readonly Issue[]) => {
    if (!codes(issues).includes(`${code} ${id}`)) quiet.push(`${code} does not accuse "${id}" (got: ${codes(issues).join(', ') || 'nothing'})`)
  }
  const play = (content: Content) => simulateProgress(content).issues

  // A term that asks for a room the house cannot light: nobody ever signs it.
  proves('term-unsignable', 'term-house', play(withTerm('term-house', { when: { ...HOUSE_TERM.when, catalogued: ['no-such-piece'] } })))
  // A term anybody could sign, and no desk a player reaches signs it: the
  // desk is in a room with no way in, or an older term on it can never be signed.
  const lockedAway = {
    ...HOUSE,
    rooms: [
      ...withHall((hall) => ({ devices: (hall.devices ?? []).filter((device) => device.kind !== 'signing-desk') })).rooms,
      room('vault', { portals: [], powerControl: undefined, startsPowered: true, devices: [DESK] }),
    ],
  } as Content
  proves('ending-unreachable', 'term-keys', play(lockedAway))
  const behindAnother = play(withTerm('term-keys', { when: { catalogued: ['no-such-piece'] } }))
  proves('term-unsignable', 'term-keys', behindAnother)
  proves('ending-unreachable', 'term-night', behindAnother)
  // A term brought to the desk by something its signature does not ask for:
  // the desk would name it to a player who is then told nothing of that.
  proves('term-presented-late', 'term-house', play(withTerm('term-house', { presentedWhen: { documentsRead: ['doc-book'], roomsVisited: ['attic'] } })))
  // What a term asks beyond what brings it to the desk has to be something the desk can name.
  proves('term-blocker-unnamed', 'term-night', play(withTerm('term-night', { when: { flags: ['house-signed'] } })))
  // Signing must take nothing away: here the tape on the machine is only for a night nobody has signed for.
  const takesAway = {
    ...withHall((hall) => ({
      devices: [
        ...(hall.devices ?? []),
        {
          kind: 'voice',
          id: 'hall-machine',
          part: 'desk-telephone',
          position: [1, 0.8, 0],
          titleKey: 'house.machine.title',
          speakerKey: 'house.speaker.tape',
          utterances: [
            { when: { flagsUnset: ['night-signed'] }, documentId: 'doc-tape' },
            { when: {}, lineKeys: ['house.machine.dead'] },
          ],
        },
      ],
    })),
    // Whoever reads the book has the tape too: the play has it either way.
    documents: [...HOUSE.documents, { id: 'doc-tape', era: 'hall', kind: 'oral-history', titleKey: 'house.tape.title', bodyKey: 'house.tape.body', containerId: 'hall-machine', lineKeys: ['house.tape.1'] }],
  } as Content
  proves('post-ending-disables-action', 'term-night', play(takesAway))
  // A sequence nothing ever makes due.
  proves('sequence-never-plays', 'seq-house', play(withSequence('seq-house', { when: { flags: ['house-signed'], roomsVisited: ['vault'] } })))

  // --- what can be read off the content without playing it ----------------------------
  // A term no desk signs, and a desk that names a term the house does not have.
  proves('term-desk-missing', 'term-night', validateEnding(withDesk({ termIds: ['term-keys', 'term-house'] })))
  proves('term-desk-missing', 'term-lost', validateEnding(withDesk({ termIds: [...DESK.termIds, 'term-lost'] })))
  // A term, or a sequence, waiting on something that can stop being true, or on "all" of something a lot adds to.
  proves('gate-uses-negative-condition', 'term-night', validateEnding(withTerm('term-night', { when: { unpowered: ['cellar'] } })))
  proves('gate-uses-negative-condition', 'term-house', validateEnding(withTerm('term-house', { presentedWhen: { documentsUnread: ['doc-book'] } })))
  proves('gate-uses-all-condition', 'term-house', validateEnding(withTerm('term-house', { when: { allRoomsPowered: true } })))
  proves('sequence-not-positive', 'seq-keys', validateEnding(withSequence('seq-keys', { when: { flagsUnset: ['night-signed'] } })))
  proves('sequence-not-positive', 'seq-house', validateEnding(withSequence('seq-house', { when: { allCatalogued: true } })))
  proves('sequence-empty', 'seq-keys', validateEnding(withSequence('seq-keys', { steps: [] })))
  // A desk nobody could hold a press on, and two sequences under one name.
  proves('desk-hold-seconds', 'hall-desk', validateEnding(withDesk({ holdSeconds: 0 })))
  proves('sequence-duplicate', 'seq-keys', validateEnding({ ...HOUSE, sequences: [...HOUSE.sequences!, HOUSE.sequences![0]] } as Content))
  proves('term-duplicate', 'term-keys', validateEnding({ ...HOUSE, terms: [...HOUSE.terms!, HOUSE.terms![0]] } as Content))

  assert.deepEqual(quiet, [], 'every broken house is caught')
  // And none of it is said of the house as it is, or of a museum with no ending at all.
  for (const code of ['term-unsignable', 'ending-unreachable', 'term-presented-late', 'term-blocker-unnamed', 'post-ending-disables-action', 'sequence-never-plays']) {
    assert.ok(!played.issues.some((issue) => issue.code === code), `${code} accuses the sound house`)
  }
  const bare = { ...HOUSE, terms: undefined, sequences: undefined, rooms: withHall((hall) => ({ devices: (hall.devices ?? []).filter((device) => device.kind === 'radio') })).rooms } as Content
  assert.deepEqual(codes(validateEnding(bare)), [])
})

await test('the snapshot writes the terms down, and a term that asks for something else is an accusation', () => {
  const snapshot = graphSnapshot(HOUSE, 3)
  assert.deepEqual(snapshot.terms, [
    { id: 'term-house', when: ['doc:doc-book', 'power:attic', 'power:cellar'] },
    { id: 'term-keys', when: [] },
    { id: 'term-night', when: [] },
  ])
  assert.deepEqual(snapshot.ids.terms, ['term-house', 'term-keys', 'term-night'])
  assert.deepEqual(snapshot.ids.sequences, ['seq-house', 'seq-keys'])
  assert.equal(snapshot.saveFields.termsSigned, 'list')
  assert.equal(snapshot.saveFields.sequencesSeen, 'list')
  // It goes to its file and comes back as itself.
  assert.deepEqual(parseGraphSnapshot(serialiseGraphSnapshot(snapshot)), snapshot)

  const additive = (content: Content, previous = snapshot) => validateAdditive(previous, content, []).map((issue) => `${issue.code} ${issue.id}`).sort()
  assert.deepEqual(additive(HOUSE), [])
  // A term that asks for more, for less, or for something else; and one that is gone.
  assert.deepEqual(additive(withTerm('term-keys', { when: { powered: ['cellar'] } })), ['guard-strengthened sign:hall-desk:term-keys', 'term-condition-changed term-keys'])
  assert.deepEqual(additive(withTerm('term-house', { presentedWhen: {}, when: { powered: ['cellar', 'attic'] } })), ['term-condition-changed term-house'])
  const without = { ...withDesk({ termIds: ['term-keys', 'term-house'] }), terms: HOUSE.terms!.slice(0, 2) } as Content
  assert.deepEqual(additive(without), [
    'id-renamed-without-alias terms:term-night',
    'id-renamed-without-alias triggers:term:term-night:signed',
    'node-removed sign:hall-desk:term-night',
    'node-removed trigger:term:term-night:signed',
    'term-condition-changed term-night',
  ])
  // What brings a term to the desk may change: it takes no signature from anybody.
  assert.deepEqual(additive(withTerm('term-house', { presentedWhen: {} })), [])
  // A term added is free, and so is a sequence.
  const grown = {
    ...withDesk({ termIds: [...DESK.termIds, 'term-dawn'] }),
    terms: [...HOUSE.terms!, { ...NIGHT, id: 'term-dawn', grants: 'dawn-signed' }],
    sequences: [...HOUSE.sequences!, { ...HOUSE.sequences![0], id: 'seq-dawn', when: { flags: ['dawn-signed'] } }],
  } as Content
  assert.deepEqual(additive(grown), [])
  // A sequence that leaves the content leaves its id in saves that saw it.
  assert.deepEqual(additive({ ...HOUSE, sequences: HOUSE.sequences!.slice(0, 1) } as Content), ['id-renamed-without-alias sequences:seq-house'])
  // A record from before there were terms holds the content to none.
  assert.deepEqual(additive(HOUSE, { ...snapshot, terms: [], ids: { ...snapshot.ids, terms: [], sequences: [] } }), [])
})

// ---------------------------------------------------------------------------
// The Posse, on the museum itself (T19, T20)
// ---------------------------------------------------------------------------

// Everything above is proved on a house made for the purpose, because the
// museum had no term until the slice that brought the Book. It has one now:
// the deed of office, signed at the lectern of the hall. These are the cases
// of the museum's own night, on the real store, by the hands the robot
// plays with (`lib/playthrough.ts`): each of them is the handler the game
// calls, and none is a copy of one.

const MUSEUM_RULES = progressRulesFor(MUSEUM)
const LECTERN = 'atrium-lectern'
const POSSE = 'termo-posse'
const KEY = 'tool:service-key'
const KEY_TRIGGER = 'lock:office-drawer:opened'
/** What marks a drawer that was opened before it held a key (`PRE_POSSE_SAVE.drawer`). */
const LEGACY_DRAWER = 'legacy-pre-L3-drawer'
const SHORTCUT = 'atrium-from-holyoke-shortcut'
const credentialTitles = new Map((MUSEUM.credentials ?? []).map((entry) => [credentialKey(entry.credential), entry.titleKey]))
const listItems = checklistPageOf(MUSEUM)?.items ?? []
const pencilLines = (progress: Progress) =>
  checklistRows(listItems, progress, MUSEUM)
    .filter((row) => row.author === 'curator')
    .map((row) => `${row.labelKey}: ${row.done}`)
const throughDoor = (doorId: string, from: string, to: string) => ({ kind: 'door', doorId, from, to }) as const
/** Somebody who hears every call the moment it is due, and never calls the porter herself. */
const everyCall = () => radioEar(MUSEUM, { random: () => 0, promptness: 1, callChance: 0 })
const callsOf = (ear: ReturnType<typeof everyCall>) => ear.heard.flatMap((entry) => (entry.callId ? [entry.callId] : []))

/** The museum's rules in the slot, and a page of the real store opened on this save: on the title screen still. */
async function atTheMuseum(saved?: unknown): Promise<Page> {
  const { registerProgressRules } = await import('../src/state/progressRules.ts')
  registerProgressRules(MUSEUM_RULES)
  return openGame(saved)
}

await test('on the museum: the lectern names the deed once the Book is read, signs nothing while a room is dark, and with the house lit a held press signs it', async () => {
  assert.deepEqual((MUSEUM.terms ?? []).map((term) => term.id), [POSSE], 'the museum has one term in this lot: the deed of office')
  const desk = deskOf(MUSEUM)
  assert.equal(desk?.id, LECTERN, 'the lectern of the hall is where it is signed')
  const page = await atTheMuseum()
  page.state().start()
  const store = page.store.useMuseum
  const intent = () => deviceIntent(desk, deviceInputOf(desk, page.state(), MUSEUM))
  const stands = () => {
    const now = intent()
    assert.equal(now.kind, 'desk')
    return (now as Extract<typeof now, { kind: 'desk' }>).state
  }
  const shows = () => deskShows(stands(), desk, page.progress())
  const go = (action: Parameters<typeof press>[2]) => press(page, MUSEUM, action)
  const roomTitle = (dictionary: Record<string, string>) => (roomId: string) => dictionary[MUSEUM.rooms.find((entry) => entry.id === roomId)!.titleKey]

  // Nothing brought to it: it says what it is and what it lacks, and neither its lamp nor a Book is drawn.
  assert.deepEqual(devicePrompt(desk, intent()), { form: 'notice', titleKey: 'device.atrium-lectern.title', noticeKey: 'device.atrium-lectern.empty' })
  assert.deepEqual(shows(), { lamp: false, book: false })
  assert.equal(deviceLive(intent()), false, 'an empty lectern takes the key')

  // The year typed by somebody who never saw it: the key, the safe and the
  // Book, with every room of the house dark. The Posse is not brought
  // forward by any of it.
  go({ kind: 'container', containerId: 'office-cabinet' })
  go({ kind: 'code', lockId: 'office-drawer', entry: '1896' })
  assert.deepEqual(page.progress().credentials, [KEY])
  go({ kind: 'container', containerId: 'office-safe' })
  assert.ok(page.progress().documentsRead.includes('doc-termos') && page.progress().documentsRead.includes('doc-label-proof-office'))
  assert.deepEqual(toolSpent(MUSEUM.locks, page.progress()), [KEY], 'the key was not left in the safe it opened')
  assert.deepEqual(page.progress().roomsPowered, [])
  // The deed is on the lectern, the lamp over it lit, and it waits for the three rooms, each by name.
  const waiting = stands()
  assert.equal(waiting.state, 'blocked')
  assert.deepEqual(waiting.state === 'blocked' ? [waiting.term.id, waiting.blockers] : null, [POSSE, { rooms: ['office', 'atrium', 'holyoke'], documents: [], other: false }])
  assert.deepEqual(shows(), { lamp: true, book: false })

  go({ kind: 'power', roomId: 'office' })
  go(throughDoor('atrium-to-office', 'office', 'atrium'))
  assert.equal(page.state().currentRoom, 'atrium')
  const view = devicePrompt(desk, intent())
  assert.deepEqual(view, {
    form: 'desk',
    titleKey: 'device.atrium-lectern.title',
    termKey: 'term.posse.title',
    missing: { rooms: ['atrium', 'holyoke'], documents: [], other: false },
  })
  // In words, in both languages: what the prompt prints after the name of the deed.
  const missing = view?.form === 'desk' ? view.missing : { rooms: [], documents: [] }
  assert.equal(
    deskMissingText({ rooms: missing.rooms.map(roomTitle(ptBR)), documents: [] }, { power: ptBR['desk.missing.power'], document: ptBR['desk.missing.document'] }),
    'falta luz em: Átrio, Ala 1 · Holyoke',
  )
  assert.equal(
    deskMissingText({ rooms: missing.rooms.map(roomTitle(en)), documents: [] }, { power: en['desk.missing.power'], document: en['desk.missing.document'] }),
    'no light yet in: Atrium, Wing 1 · Holyoke',
  )
  // E on it is answered (a buzz) and writes nothing; the robot's whole hand writes nothing either.
  const dark = page.progress()
  assert.equal(pressSigningDeskOn(store, MUSEUM, LECTERN), true)
  go({ kind: 'sign', deviceId: LECTERN, termId: POSSE })
  assert.equal(signAtDeskOn(store, MUSEUM, LECTERN), false, 'a hold that fired on a dark house signed the deed')
  assert.equal(page.progress(), dark, 'a press on the lectern with two rooms dark wrote to the save')

  // One room at a time: the hall, then the wing. It is not signed a room short.
  go({ kind: 'power', roomId: 'atrium' })
  const short = stands()
  assert.deepEqual(short.state === 'blocked' ? short.blockers.rooms : null, ['holyoke'])
  go({ kind: 'sign', deviceId: LECTERN, termId: POSSE })
  assert.deepEqual(page.progress().termsSigned, [])
  go(throughDoor('atrium-to-holyoke', 'atrium', 'holyoke'))
  go({ kind: 'power', roomId: 'holyoke' })
  go(throughDoor(SHORTCUT, 'holyoke', 'atrium'))
  assert.equal(page.state().currentRoom, 'atrium')
  assert.deepEqual(page.progress().roomsPowered, ['office', 'atrium', 'holyoke'])

  // Lit. The prompt asks for the press to be held, for the seconds the lectern declares.
  assert.equal(stands().state, 'ready')
  assert.deepEqual(devicePrompt(desk, intent()), { form: 'hold', holdId: LECTERN, seconds: 1.2, termKey: 'term.posse.title' })
  assert.equal(deviceHeld(intent()), true)
  // Let go half way: nothing. A tap is not a signature (D11).
  const request = pressSigningDeskOn(store, MUSEUM, LECTERN)
  assert.deepEqual(request, { id: LECTERN, seconds: 1.2 })
  const pressed = holdStep(HOLD_IDLE, { kind: 'press', request: request as { id: string; seconds: number } })
  let gesture = pressed
  for (let frame = 0; frame < 3; frame += 1) gesture = holdStep(gesture.gesture, { kind: 'tick', seconds: 0.25, aimed: LECTERN })
  assert.equal(gesture.fired, null, 'three quarters of a second signed a deed that asks for more')
  assert.deepEqual(holdStep(gesture.gesture, { kind: 'release' }), { gesture: HOLD_IDLE, fired: null })
  // A tap asks instead («Assinar / Cancelar»). Cancel, or looking away, leaves the deed unsigned.
  const asked = holdStep(pressed.gesture, { kind: 'release' })
  assert.deepEqual(asked, { gesture: { phase: 'confirming', id: LECTERN, asked: 0 }, fired: null })
  // And a second tap straight after the first is not its answer: the question has not been read.
  assert.deepEqual(holdStep(asked.gesture, { kind: 'press', request: request as { id: string; seconds: number } }), asked, 'two taps in a row signed the deed')
  assert.deepEqual(holdStep(asked.gesture, { kind: 'cancel' }), { gesture: HOLD_IDLE, fired: null })
  assert.deepEqual(holdStep(asked.gesture, { kind: 'tick', seconds: 0.016, aimed: null }), { gesture: HOLD_IDLE, fired: null })
  assert.deepEqual(page.progress().termsSigned, [], 'a press let go, or a tap never confirmed, signed the deed')
  // Held to the end: signed, with the flag and the trigger in the same write.
  const before = page.progress()
  assert.equal(page.notifications(() => go({ kind: 'sign', deviceId: LECTERN, termId: POSSE })), 1, 'the signature and what follows from it are one write')
  const signed = page.progress()
  assert.deepEqual(signed.termsSigned, [POSSE])
  assert.deepEqual(signed.flags, ['posse-signed'])
  assert.deepEqual(signed.triggersFired, [KEY_TRIGGER, 'term:termo-posse:signed'])
  assert.deepEqual(shrunk(before as Raw, signed as Raw), [])

  // What follows needs no radio (this player never took it): a card, and two
  // lines from the loudspeaker, the first with the hour of this night in words.
  assert.deepEqual(signed.devicesCarried, [])
  assert.deepEqual(MUSEUM.sequences?.[0]?.steps, [
    { kind: 'card', titleKey: 'sequence.posse.card', seconds: 3.5 },
    { kind: 'line', speakerKey: 'sequence.speaker.porter', lineKey: 'sequence.posse.1' },
    { kind: 'line', speakerKey: 'sequence.speaker.porter', lineKey: 'sequence.posse.2' },
  ])
  // Owed, and until it has closed the lectern offers nothing more: its lamp is out and the Book lies open on it.
  assert.equal(stands().state, 'signed')
  assert.deepEqual(devicePrompt(desk, intent()), { form: 'signed', titleKey: 'device.atrium-lectern.title', termKey: 'term.posse.title' })
  assert.deepEqual(shows(), { lamp: false, book: true })
  assert.equal(startDueSequenceOn(store, MUSEUM, false), true, 'no sequence follows the signature')
  assert.deepEqual([page.state().sequence?.id, page.state().sequence?.index, page.state().sequence?.steps], ['seq-posse', 0, 3])
  const clock = MUSEUM.nightClock!
  // Six things done on this route: the lamp, the hall, the wing, the drawer, the safe, the deed.
  assert.equal(nightPoints(clock, signed, MUSEUM), 6)
  const hourKey = nightPhraseKey(clock, nightPoints(clock, signed, MUSEUM))
  assert.equal(hourKey, 'night.hour.6')
  for (const dictionary of [ptBR, en] as Record<string, string>[]) {
    const said = fillHour(dictionary['sequence.posse.1'], dictionary[hourKey!])
    assert.ok(!said.includes('{') && said.endsWith(`${dictionary[hourKey!]}.`), `the first line does not say the hour: ${said}`)
  }
  assert.equal(fillHour(ptBR['sequence.posse.1'], ptBR[hourKey!]), 'A lâmpada do púlpito acendeu e apagou: assinou. O acervo é seu, curador. Quase dez.')
  // Seen to its last step, and only then on record.
  page.state().advanceSequence()
  page.state().advanceSequence()
  assert.deepEqual(page.progress().sequencesSeen, [])
  page.state().advanceSequence()
  assert.equal(page.state().sequence, null)
  assert.deepEqual(page.progress().sequencesSeen, ['seq-posse'])
  assert.equal(startDueSequenceOn(store, MUSEUM, false), false)

  // The list: the three lines in pencil that the night added are ticked, and
  // the fourth is a promise with its note, like the vault's above it.
  assert.deepEqual(
    checklistRows(listItems, page.progress(), MUSEUM).map((row) => `${row.labelKey}: ${row.done}${row.noteKey ? ` (${row.noteKey})` : ''}`),
    [
      'notebook.todo.power: true',
      'notebook.todo.catalogue: false',
      'notebook.todo.vault: null (notebook.todo.vault.note)',
      'notebook.todo.drawer: true',
      'notebook.todo.safe-key: true',
      'notebook.todo.posse: true',
      'notebook.todo.proof: null (notebook.todo.proof.note)',
    ],
  )
  // Signing twice is signing once; and through the disk the night stays closed.
  go({ kind: 'sign', deviceId: LECTERN, termId: POSSE })
  assert.deepEqual(page.progress().termsSigned, [POSSE])
  const back = await reload(page)
  assert.deepEqual([back.progress().termsSigned, back.progress().sequencesSeen, back.progress().flags], [[POSSE], ['seq-posse'], ['posse-signed']])
  assert.equal(startDueSequenceOn(back.store.useMuseum, MUSEUM, false), false, 'the card played again after a reload')

  // Closed in the middle of the card instead: it starts over, from the card.
  const cut = await atTheMuseum(saveOf({ ...throughJson(signed as Raw), sequencesSeen: [] }))
  cut.state().start()
  assert.equal(startDueSequenceOn(cut.store.useMuseum, MUSEUM, false), true)
  cut.state().advanceSequence()
  const again = await reload(cut)
  assert.deepEqual(again.progress().sequencesSeen, [])
  assert.equal(startDueSequenceOn(again.store.useMuseum, MUSEUM, false), true)
  assert.equal(again.state().sequence?.index, 0, 'a sequence cut off by a closed tab went on from where it was')
})

await test('a save that opened the drawer before it held a key is owed the key as it loads, is told of it once, by its own call, and reaches the Posse (T20)', async () => {
  assert.deepEqual((PRE_POSSE_SAVE as Raw).drawer, { lockId: 'office-drawer', triggerId: KEY_TRIGGER, flag: LEGACY_DRAWER })
  const { registerProgressRules } = await import('../src/state/progressRules.ts')
  const OPEN = ['production-drawer-open', 'l1-route-end', 'l2-shortcut-released'] as const
  for (const id of OPEN) {
    const fixture = SAVE_FIXTURES[id].save
    const record = fixture.progress as Raw
    assert.ok((record.locksOpened as string[]).includes('office-drawer') && (record.documentsRead as string[]).includes('doc-predecessor'), `${id} is not the save this case is about`)
    assert.deepEqual([record.credentials ?? [], record.triggersFired ?? []], [[], []], `${id} already holds what the load is to give it`)

    // As a browser loads it: the store first, on the title screen, before
    // the content has arrived (a slot that settles nothing is the empty slot).
    registerProgressRules({ settle: (progress) => progress })
    const page = await openGame(fixture)
    // The migration alone marks the drawer, and the alias files the sheet beside the old note. No key yet: that is the content's to give.
    assert.ok(page.progress().flags.includes(LEGACY_DRAWER), `${id}: the load did not mark the drawer as opened before the key`)
    assert.deepEqual(
      page.progress().documentsRead.filter((documentId) => /predecessor|handover/.test(documentId)),
      ['doc-predecessor', 'doc-otavio-handover'],
      `${id}: the sheet that replaced the note`,
    )
    assert.deepEqual(page.progress().credentials, [])
    // The content arrives, behind the button: the trigger of the open drawer fires, once.
    registerProgressRules(MUSEUM_RULES)
    const loaded = page.progress()
    assert.deepEqual(loaded.credentials, [KEY], `${id}: the save, loaded, does not have the key`)
    assert.deepEqual(loaded.triggersFired, [KEY_TRIGGER], id)
    assert.equal(loaded.contentLot, CONTENT_LOT)
    assert.deepEqual(shrunk(record, loaded as Raw), [], `${id}: the load took something out`)
    assert.deepEqual([loaded.termsSigned, loaded.sequencesSeen], [[], []])
    // The other order (the content first, the store after) ends in the same save.
    assert.deepEqual((await atTheMuseum(fixture)).progress(), loaded, `${id}: the order the two arrive in changes what is loaded`)
    registerProgressRules(MUSEUM_RULES)

    // Nothing is announced. The HUD mounts after the content has settled the
    // save (it imports the registry for that), so the key is already there
    // when it first looks, and so are the two lines the open drawer puts on
    // the list.
    assert.deepEqual(credentialsTaken(loaded.credentials.length, loaded.credentials, credentialTitles), [], `${id}: a key owed since another night was announced on Continue`)
    assert.deepEqual(credentialsTaken(0, loaded.credentials, credentialTitles), ['credential.service-key.title'], 'the check has teeth: a HUD mounted before the content would have announced it')
    assert.deepEqual(checklistNews(listItems, loaded, loaded, MUSEUM), [])
    assert.deepEqual(pencilLines(loaded), ['notebook.todo.drawer: true', 'notebook.todo.safe-key: false'])

    // Continue. The porter, in his order: who he is, the light on the
    // machine, and then the key, by the call made for this save. The call
    // for a drawer that opens now is never his to make here.
    page.state().start()
    const ear = everyCall()
    ear.listen(page)
    assert.deepEqual(callsOf(ear), ['porter-hello', 'porter-machine-reminder', 'porter-legacy-drawer'], id)
    assert.deepEqual(ear.heard.at(-1)?.lineKeys, ['radio.call.legacy-drawer.1'])
    ear.listen(page)
    assert.equal(callsOf(ear).length, 3, `${id}: a call was said twice`)

    // The rest of the night, by the robot: the safe with the key it was
    // owed, the Book, the three rooms it already had, the Posse.
    const night = await playToEnd(page, MUSEUM, seeded(7), ORDINARY, MUSEUM, ear.listen)
    const end = night.page.progress()
    assert.deepEqual(end.termsSigned, [POSSE], `${id}: the night was never signed`)
    assert.deepEqual(end.sequencesSeen, ['seq-posse'], id)
    assert.ok(end.flags.includes(LEGACY_DRAWER) && end.flags.includes('posse-signed'), id)
    assert.ok(end.documentsRead.includes('doc-predecessor') && end.documentsRead.includes('doc-otavio-handover'), `${id}: the old note left the save`)
    assert.deepEqual(toolSpent(MUSEUM.locks, end), [KEY], id)
    const said = callsOf(ear)
    assert.ok(!said.includes('porter-drawer-open'), `${id}: asked what was in a drawer opened on another night`)
    assert.equal(said.filter((callId) => callId === 'porter-legacy-drawer').length, 1, id)
    assert.ok(said.includes('porter-safe-open'), `${id}: the safe opened and the porter said nothing`)
  }
})

await test('a drawer that opens now hands its key over in the same write, with no mark of an older night, and the porter asks what was in it', async () => {
  const starts: readonly (readonly [string, unknown])[] = [
    ['a new game', undefined],
    ['production-drawer-closed', SAVE_FIXTURES['production-drawer-closed'].save],
  ]
  for (const [name, saved] of starts) {
    const page = await atTheMuseum(saved)
    assert.deepEqual([page.progress().credentials, page.progress().flags], [[], []], `${name}: a drawer still shut was taken for one opened before the key`)
    page.state().start()
    const ear = everyCall()
    assert.equal(page.state().currentRoom, 'office')
    press(page, MUSEUM, { kind: 'power', roomId: 'office' })
    ear.listen(page)
    assert.equal(callsOf(ear)[0], 'porter-hello', name)

    // No write ever shows the drawer open and the key not handed over.
    const torn: string[] = []
    const stop = page.store.useMuseum.subscribe((state) => {
      const open = state.progress.locksOpened.includes('office-drawer')
      if (open !== state.progress.credentials.includes(KEY) || open !== state.progress.triggersFired.includes(KEY_TRIGGER)) torn.push(JSON.stringify(state.progress.locksOpened))
    })
    const before = page.progress()
    press(page, MUSEUM, { kind: 'container', containerId: 'office-cabinet' })
    press(page, MUSEUM, { kind: 'code', lockId: 'office-drawer', entry: '1896' })
    stop()
    assert.deepEqual(torn, [], `${name}: the drawer was open in a write that did not carry its key`)
    const opened = page.progress()
    assert.deepEqual([opened.credentials, opened.triggersFired, opened.flags], [[KEY], [KEY_TRIGGER], []], name)
    assert.ok(opened.documentsRead.includes('doc-otavio-handover') && !opened.documentsRead.includes('doc-predecessor'), `${name}: the sheet in the drawer`)
    // Taken now: announced now, by its name; and the list gains its line in pencil.
    assert.deepEqual(credentialsTaken(before.credentials.length, opened.credentials, credentialTitles), ['credential.service-key.title'])
    assert.ok(checklistNews(listItems, before, opened, MUSEUM).includes('notebook.todo.safe-key'), name)

    ear.listen(page)
    assert.equal(callsOf(ear).at(-1), 'porter-drawer-open', name)
    assert.deepEqual(ear.heard.at(-1)?.lineKeys, ['radio.call.drawer.1', 'radio.call.drawer.2'])
    // Through the disk the mark does not appear: the trigger is on record as fired.
    const back = await reload(page)
    assert.deepEqual(back.progress().flags, [], `${name}: a reload took this night's drawer for an older one`)
    const night = await playToEnd(back, MUSEUM, seeded(11), ORDINARY, MUSEUM, ear.listen)
    assert.deepEqual([night.page.progress().termsSigned, night.page.progress().sequencesSeen], [[POSSE], ['seq-posse']], name)
    assert.ok(!night.page.progress().flags.includes(LEGACY_DRAWER), name)
    assert.ok(!callsOf(ear).includes('porter-legacy-drawer'), `${name}: told to look again in a drawer opened a minute ago`)
    assert.equal(callsOf(ear).filter((callId) => callId === 'porter-drawer-open').length, 1, name)
  }

  // The two calls about the drawer are news only until the safe is open, and the one about the safe until the deed is signed.
  const radio = radioDevices(MUSEUM)[0].device
  const heardSoFar = radio.calls.map((call) => call.id).filter((callId) => !['porter-drawer-open', 'porter-legacy-drawer', 'porter-safe-open'].includes(callId))
  const late = save({ roomsPowered: ['office', 'atrium', 'holyoke'], radioCalls: heardSoFar, locksOpened: ['office-drawer'], credentials: [KEY], triggersFired: [KEY_TRIGGER] })
  assert.equal(nextRadioCall(radio, late, MUSEUM)?.id, 'porter-drawer-open')
  assert.equal(nextRadioCall(radio, { ...late, flags: [LEGACY_DRAWER] }, MUSEUM)?.id, 'porter-legacy-drawer')
  const safeOpen = { ...late, locksOpened: ['office-drawer', 'office-safe'] }
  assert.equal(nextRadioCall(radio, safeOpen, MUSEUM)?.id, 'porter-safe-open')
  assert.equal(nextRadioCall(radio, { ...safeOpen, flags: [LEGACY_DRAWER] }, MUSEUM)?.id, 'porter-safe-open')
  assert.equal(nextRadioCall(radio, { ...safeOpen, flags: ['posse-signed'] }, MUSEUM), null)
})

await test("the saves the lot left, in live tabs: the deed signed in one tab is in every tab after one write; a night already signed owes nothing and writes nothing", async () => {
  // The two records the lot closed with (`saveFixtures.ts`), each opened as a
  // browser opens it, in more than one tab at once: what the walk through
  // the game did with two real tabs, kept where the gate runs it.
  const desk = deskOf(MUSEUM)
  const radio = radioDevices(MUSEUM)[0].device
  const settled = (browser: ReturnType<typeof openBrowser>, when: string) => {
    const { quiet, rounds } = browser.settle()
    assert.ok(quiet, `${when}: the tabs were still writing the save at each other (writes per round: ${rounds.join(', ')})`)
  }

  // One held press short of the deed: the Book read, the house lit, the radio on its desk.
  const short = openBrowser(SAVE_FIXTURES['l3-new-game-safe-open'].save)
  try {
    const atTheLectern = await short.open('the tab at the lectern')
    const inTheOffice = await short.open('a tab left in the office', 'idle')
    const onTheTitle = await short.open('a tab left on the title screen')
    for (const tab of [atTheLectern, inTheOffice]) {
      tab.act((state) => state.start())
      tab.registerRules(MUSEUM_RULES)
    }
    atTheLectern.act((state) => state.setCurrentRoom('atrium'))
    settled(short, 'two tabs in the game and one on the title')
    for (const tab of short.tabs) {
      // The content arrived and owed this save nothing: it was written settled.
      assert.deepEqual(
        [tab.progress().credentials, tab.progress().triggersFired, tab.progress().flags, tab.progress().termsSigned],
        [[KEY], [KEY_TRIGGER], [], []],
        `"${tab.name}" was handed something as it loaded`,
      )
      assert.equal(signingDeskState(MUSEUM.terms ?? [], desk, tab.progress(), MUSEUM).state, 'ready', `"${tab.name}": the deed is not ready to be signed`)
      assert.equal(nextRadioCall(radio, tab.progress(), MUSEUM), null, `"${tab.name}": a call is owed to a save that had heard them all`)
    }
    const written = short.writes.length

    // The player holds E at the lectern, in one tab: the handler the key calls, and what the fired hold does.
    const request = atTheLectern.act(() => pressSigningDeskOn(atTheLectern.store.useMuseum, MUSEUM, LECTERN))
    assert.deepEqual(request, { id: LECTERN, seconds: 1.2 }, 'the lectern does not ask for its press to be held')
    assert.equal(held(request as { id: string; seconds: number }), LECTERN)
    atTheLectern.act(() => assert.equal(signAtDeskOn(atTheLectern.store.useMuseum, MUSEUM, LECTERN), true))
    settled(short, 'one tab signed the deed')
    assert.deepEqual(short.writes.slice(written).map((write) => write.by), [atTheLectern.name], 'a signature is one write, and no other tab answers it')
    for (const tab of short.tabs) {
      assert.deepEqual(tab.progress().termsSigned, [POSSE], `"${tab.name}" does not have the deed`)
      assert.deepEqual(tab.progress().flags, ['posse-signed'], `"${tab.name}" does not have its flag`)
      assert.deepEqual(tab.progress().triggersFired, [KEY_TRIGGER, 'term:termo-posse:signed'], `"${tab.name}" does not have its trigger`)
      assert.equal(signingDeskState(MUSEUM.terms ?? [], desk, tab.progress(), MUSEUM).state, 'signed')
    }
    // The card is owed in every tab that is in the game, and shown where the player is.
    assert.equal(inTheOffice.act(() => startDueSequenceOn(inTheOffice.store.useMuseum, MUSEUM, true)), false, 'a tab in the background started the card')
    atTheLectern.act(() => assert.equal(startDueSequenceOn(atTheLectern.store.useMuseum, MUSEUM, false), true, 'no card followed the signature'))
    atTheLectern.act((state) => {
      for (let step = 0; step < 3; step += 1) state.advanceSequence()
    })
    settled(short, 'the card and the two lines were seen out')
    assert.deepEqual(short.writes.slice(written).map((write) => write.by), [atTheLectern.name, atTheLectern.name])
    for (const tab of short.tabs) assert.deepEqual(tab.progress().sequencesSeen, ['seq-posse'], `"${tab.name}" would show the card again`)
    assert.equal(inTheOffice.act(() => startDueSequenceOn(inTheOffice.store.useMuseum, MUSEUM, false)), false, 'the other tab showed the card a second time')
    // The tab with no rules writes, and takes nothing of the ending off the disk.
    onTheTitle.act((state) => state.setSetting('brightness', 1.2))
    settled(short, 'the tab on the title screen changed a setting')
    const disk = short.disk()!.progress!
    assert.deepEqual([disk.termsSigned, disk.flags, disk.sequencesSeen, disk.credentials], [[POSSE], ['posse-signed'], ['seq-posse'], [KEY]])
    assert.deepEqual(shrunk(SAVE_FIXTURES['l3-new-game-safe-open'].save.progress as Raw, disk), [], 'the night lost something it had before the signature')
    const quietAt = short.writes.length
    for (const tab of short.tabs) {
      tab.hide()
      tab.show()
    }
    settled(short, 'every tab was hidden and shown')
    assert.equal(short.writes.length, quietAt, 'a tab with nothing new wrote as it was hidden')
  } finally {
    short.close()
  }

  // The night already signed: nothing is owed to it, in the game or on the title.
  const record = SAVE_FIXTURES['l3-posse-signed'].save
  const signed = openBrowser(record)
  try {
    const inTheGame = await signed.open('the tab in the game')
    // Opened and left alone: it is there to be caught writing, by the two loops over every tab.
    await signed.open('a tab left on the title screen', 'idle')
    inTheGame.act((state) => state.start())
    inTheGame.registerRules(MUSEUM_RULES)
    settled(signed, 'the signed save, continued')
    // Where the player wakes is the one thing a Continue changes: the office, not the hall they stopped in.
    for (const tab of signed.tabs) {
      assert.deepEqual({ ...throughJson(tab.progress()), lastRoom: record.progress.lastRoom }, record.progress, `"${tab.name}": the load, or the content arriving, changed the save`)
    }
    assert.ok(signed.writes.every((write) => write.by === inTheGame.name), 'a tab on the title screen wrote the save')
    assert.equal(inTheGame.progress().lastRoom, MUSEUM.spawn.room)
    const before = inTheGame.progress()
    const calm = signed.writes.length
    // No card, no call, and a lectern that declines the press: E at it does nothing, held or not.
    assert.equal(inTheGame.act(() => startDueSequenceOn(inTheGame.store.useMuseum, MUSEUM, false)), false, 'the card was shown again')
    assert.equal(inTheGame.state().sequence, null)
    assert.equal(nextRadioCall(radio, inTheGame.progress(), MUSEUM), null, 'a call is owed after the night closed')
    assert.equal(inTheGame.act(() => pressSigningDeskOn(inTheGame.store.useMuseum, MUSEUM, LECTERN)), false, 'the lectern took a press with nothing left to sign')
    assert.equal(inTheGame.act(() => signAtDeskOn(inTheGame.store.useMuseum, MUSEUM, LECTERN)), false)
    assert.deepEqual(devicePrompt(desk, deviceIntent(desk, deviceInputOf(desk, inTheGame.state(), MUSEUM))), {
      form: 'signed',
      titleKey: 'device.atrium-lectern.title',
      termKey: 'term.posse.title',
    })
    assert.deepEqual(deskShows(signingDeskState(MUSEUM.terms ?? [], desk, inTheGame.progress(), MUSEUM), desk, inTheGame.progress()), { lamp: false, book: true })
    assert.equal(inTheGame.progress(), before, 'a press on a signed lectern wrote to the save')
    for (const tab of signed.tabs) {
      tab.hide()
      tab.show()
    }
    settled(signed, 'every tab was hidden and shown')
    assert.equal(signed.writes.length, calm, 'a tab of a night already signed wrote with nothing new to say')
  } finally {
    signed.close()
  }
})

await test('one window, two tabs, and the player changes tab in the middle: what was seen or heard out in the tab they went to is taken down in the one they left, and is said once', async () => {
  // The case above shows the other tab only once the first has finished.
  // One window shows one tab at a time, and the player changes tab when they
  // like: with the card of the deed still up, with the porter in the middle
  // of a call. The tab they leave holds what it was showing (a hidden tab
  // counts no time); the tab they go to is owed the same thing, since
  // neither is on record before its last step, and shows it to the end. Back
  // in the first, the held card used to start its full time again: the
  // closing of the night, and every call of the porter's, twice.
  const [{ device: radio, room: radioRoom }] = radioDevices(MUSEUM)
  const settled = (browser: ReturnType<typeof openBrowser>, when: string) => {
    const { quiet, rounds } = browser.settle()
    assert.ok(quiet, `${when}: the tabs were still writing the save at each other (writes per round: ${rounds.join(', ')})`)
  }
  type Tab = Awaited<ReturnType<ReturnType<typeof openBrowser>['open']>>
  /** Which tab the window shows. What `useDocumentHidden` tells the overlay and the subtitles of each. */
  const shown = new Map<Tab, boolean>()
  /** The player looks at another tab: the browser tells it what it missed, and what held its line lets go (`releaseHeldRadio`). */
  const lookAt = (to: Tab, from: Tab) => {
    from.hide()
    shown.set(from, false)
    to.hear()
    to.show()
    shown.set(to, true)
    to.act((state) => {
      if (transmissionLapsed(state.radio, state.progress, MUSEUM)) state.dropRadio()
    })
  }

  // --- the card of the deed ---------------------------------------------------
  const deed = openBrowser(SAVE_FIXTURES['l3-new-game-safe-open'].save)
  try {
    const signing = await deed.open('the tab that signs')
    const other = await deed.open('the tab the player looks at next', 'idle')
    shown.set(signing, true).set(other, false)
    other.hide()
    for (const tab of [signing, other]) {
      tab.act((state) => state.start())
      tab.registerRules(MUSEUM_RULES)
    }
    /** `SequenceOverlay`: what is owed starts, unless the tab is hidden. */
    const director = (tab: Tab) => tab.act(() => startDueSequenceOn(tab.store.useMuseum, MUSEUM, !shown.get(tab)))
    settled(deed, 'two tabs in the game')
    const written = deed.writes.length

    signing.act((state) => state.setCurrentRoom('atrium'))
    signing.act(() => {
      assert.deepEqual(pressSigningDeskOn(signing.store.useMuseum, MUSEUM, LECTERN), { id: LECTERN, seconds: 1.2 })
      assert.equal(signAtDeskOn(signing.store.useMuseum, MUSEUM, LECTERN), true)
    })
    assert.equal(director(signing), true, 'no card followed the signature')
    settled(deed, 'the deed was signed and its card is up')
    assert.deepEqual([deed.disk()!.progress!.termsSigned, deed.disk()!.progress!.sequencesSeen], [[POSSE], []])

    // The card is still up. The player looks at the other tab: owed there too, and shown.
    lookAt(other, signing)
    assert.deepEqual(signing.state().sequence && { id: signing.state().sequence!.id, index: signing.state().sequence!.index }, { id: 'seq-posse', index: 0 }, 'the tab left behind is not holding its card')
    assert.equal(director(other), true, 'the tab the player went to did not show the card it is owed')
    const steps = other.state().sequence!.steps
    other.act((state) => {
      for (let step = 0; step < steps; step += 1) state.advanceSequence()
    })
    settled(deed, 'the card and the two lines were seen out in the other tab')
    assert.deepEqual(deed.disk()!.progress!.sequencesSeen, ['seq-posse'])

    // Back. The first tab is told it was seen, and has nothing left on screen to show again.
    lookAt(signing, other)
    assert.deepEqual(signing.progress().sequencesSeen, ['seq-posse'])
    assert.equal(signing.state().sequence, null, 'the tab that signed still has the card up, seen to its end in the other: it shows the closing of the night a second time')
    assert.equal(director(signing), false)
    assert.equal(signing.state().sequence, null)
    settled(deed, 'the player came back to the tab that signed')
    // The room and the signature leave in one write (the save is coalesced), the record of the card in another, by the tab that showed it out.
    assert.deepEqual(deed.writes.slice(written).map((write) => write.by), [signing.name, other.name], 'coming back to a card already seen wrote to the save')
  } finally {
    deed.close()
    shown.clear()
  }

  // --- a call of the porter's ---------------------------------------------------
  // The save that opened the drawer before it held a key hears of the key
  // once (the acceptance of the lot). The same change of tab, with that call
  // in the air.
  const older = openBrowser(SAVE_FIXTURES['production-drawer-open'].save)
  try {
    const first = await older.open('the tab he starts talking in')
    const second = await older.open('the tab the player looks at next', 'idle')
    shown.set(first, true).set(second, false)
    second.hide()
    for (const tab of [first, second]) {
      tab.act((state) => state.start())
      tab.registerRules(MUSEUM_RULES)
    }
    settled(older, 'two tabs on the older save')
    const said: string[] = []
    /** `RadioDirector`: the first call due, when the air is free, the tab is looked at and the radio can be heard. */
    const deliver = (tab: Tab) =>
      tab.act((state) => {
        const call = nextRadioCall(radio, state.progress, MUSEUM)
        if (!call) return null
        const step = radioDeliveryStep(radioCallReady(radio, call.id, state.progress, MUSEUM), {
          onAir: airTaken(state),
          modal: false,
          hidden: !shown.get(tab),
          away: !radioWithinEarshot(radio, radioRoom.id, state.progress.devicesCarried, state.currentRoom),
        })
        if (step !== 'play') return null
        state.startRadio({ deviceId: radio.id, speakerKey: radio.speakerKey, lineKeys: call.lineKeys, callId: call.id })
        return call.id
      })
    /** `RadioSubtitles`: each line of what is on the air has its time, in a tab that is looked at. */
    const hearOut = (tab: Tab) => {
      assert.equal(shown.get(tab), true, 'a hidden tab counts no time')
      while (tab.state().radio) {
        const callId = tab.state().radio!.callId
        if (callId && tab.state().radio!.index === 0) said.push(callId)
        tab.act((state) => state.advanceRadio())
      }
    }

    assert.equal(deliver(first), 'porter-hello')
    hearOut(first)
    assert.equal(deliver(first), 'porter-machine-reminder')
    hearOut(first)
    assert.equal(deliver(first), 'porter-legacy-drawer')
    settled(older, 'the call about the drawer is on the air')

    lookAt(second, first)
    assert.equal(first.state().radio?.callId, 'porter-legacy-drawer', 'the tab left behind is not holding the call')
    assert.equal(deliver(second), 'porter-legacy-drawer', 'not on record before its last line: owed to the other tab too')
    hearOut(second)
    settled(older, 'the call was heard out in the other tab')
    assert.ok((older.disk()!.progress!.radioCalls as string[]).includes('porter-legacy-drawer'))

    lookAt(first, second)
    assert.ok(first.progress().radioCalls.includes('porter-legacy-drawer'))
    assert.equal(first.state().radio, null, 'the call heard to its end in the other tab is still in the air here, and starts over')
    if (first.state().radio) hearOut(first)
    assert.equal(deliver(first), null)
    assert.deepEqual(said, ['porter-hello', 'porter-machine-reminder', 'porter-legacy-drawer'], 'a call was said twice to one player in one game')
    assert.deepEqual(first.progress().credentials, [KEY], 'the key, handed over once')
    settled(older, 'the player came back to the first tab')
  } finally {
    older.close()
  }
})

// ---------------------------------------------------------------------------
// The components call these rules
// ---------------------------------------------------------------------------

await test('the components ask those rules: the desk, its lamp and its Book, the notebook, the sequence on screen and the radio under it', () => {
  assert.deepEqual(endingWiringProblems(source), [])
  const changed = (path: string, from: string | RegExp, to: string) => (asked: string) => {
    if (asked !== path) return source(asked)
    const next = source(asked).replace(from, to)
    assert.notEqual(next, source(asked), `the refactor of ${path} found nothing to change`)
    return next
  }
  const refactors: readonly (readonly [string, (path: string) => string])[] = [
    // The desk: the press, the signature, the lamp and the Book.
    ['E on a desk that is taken and asks for no hold', changed('engine/Devices.tsx', 'return pressSigningDesk(deviceId)', 'return true')],
    ['a desk that decides what E does apart from its prompt', changed('engine/signingDesk.ts', 'deviceIntent(desk, deviceInputOf(desk, store.getState(), content))', "({ kind: 'desk', state: { state: 'empty' } } as const)")],
    ['a blocked desk that takes the press in silence', changed('engine/signingDesk.ts', 'museumAudio.lockDenied()', 'void 0')],
    ['a hold that fires and signs nothing', changed('engine/signingDesk.ts', 'store.getState().grant(termGrant(state.term))', 'void state')],
    ['a signature that also sets the flag by hand', changed('engine/termRules.ts', 'return { termsSigned: [term.id] }', 'return { termsSigned: [term.id], flags: [term.id] }')],
    ['a fired hold nobody listens to', changed('engine/Devices.tsx', 'onPrimaryHoldFired(signAtDesk)', 'onPrimaryHoldFired(() => false)')],
    ['a desk that offers the next term under the card', changed('engine/deviceRules.ts', 'signingDeskState(content.terms ?? [], device, progress, content, sequenceOwed)', 'signingDeskState(content.terms ?? [], device, progress, content, false)')],
    ['a lamp lit by a rule of its own', changed('engine/Devices.tsx', 'deskShows(state, device, progress)', '{ lamp: true, book: true }')],
    ['a lamp and a Book nobody hides', changed('engine/Devices.tsx', 'showDeskNodes(nodes, lamp, book)', 'void lamp')],
    ['a lamp that does not know of the card on screen', changed('engine/Devices.tsx', '{ progress, radio: null, sequence }', '{ progress, radio: null }')],
    ['a hold as long as the component likes', changed('engine/signingDesk.ts', 'seconds: found.desk.holdSeconds', 'seconds: 0.1')],
    ['a term that compiles no trigger', changed('engine/triggers.ts', "effects: [{ kind: 'set-flag', flag: term.grants }]", 'effects: []')],
    ['a prompt that does not know of the card on screen', changed('ui/Hud.tsx', '{ progress, radio, sequence }', '{ progress, radio }')],
    ['a term to hold E on, drawn as a tap', changed('ui/Hud.tsx', "if (view.form === 'hold') return <HoldPrompt", "if (view.form === 'held') return <HoldPrompt")],
    ['a desk whose lamp and Book are never gathered', changed('engine/Devices.tsx', 'prepareDeskNodes(instance, device.part)', '{ lamp: null, book: null }')],
    ['a desk that nobody draws', changed('engine/Devices.tsx', "{device.kind === 'signing-desk' ? (", "{device.kind === 'signing-desk' && false ? (")],
    // The words.
    ['a prompt of the desk worded in the component', changed('ui/Hud.tsx', 'deskMissingText(', 'String(')],
    ['a notebook that lists no signed term', changed('ui/Journal.tsx', 'signedTerms(MUSEUM.terms ?? [], progress)', '[]')],
    ['a term page that is never signed', changed('ui/Notebook.tsx', 'signedTerms(MUSEUM.terms ?? [], progress).some((term) => term.id === page.termId)', 'false')],
    ['a term page headed by the title its body opens with', changed('ui/Notebook.tsx', '{paragraphs(text(shown.bodyKey))}', '<h3>{text(shown.titleKey)}</h3>\n        {paragraphs(text(shown.bodyKey))}')],
    // The sequence.
    ['a director with a rule of its own', changed('ui/SequenceOverlay.tsx', 'startDueSequence(held)', 'void held')],
    ['a director that starts over a modal', changed('ui/SequenceOverlay.tsx', 'radioHeld({ modal, hidden }) || !sceneReady', 'false')],
    ['a sequence that does not silence the radio', changed('state/store.ts', 'set({ sequence: { id, index: 0, steps, serial: sequenceSerial }, radio: null })', 'set({ sequence: { id, index: 0, steps, serial: sequenceSerial } })')],
    ['a sequence seen at its first step', changed('state/store.ts', 'if (sequence.index + 1 < sequence.steps) {', 'if (false) {')],
    ['a sequence that is never recorded', changed('state/store.ts', '{ sequencesSeen: [sequence.id] }', '{}')],
    ['a line of a sequence that prints the token of the hour', changed('ui/SequenceOverlay.tsx', 'fillHour(t(step.lineKey as never), hourKey ? t(hourKey as never) : null)', 't(step.lineKey as never)')],
    ['a step moved on by the timer of another', changed('ui/SequenceOverlay.tsx', 'current?.serial === playing.serial && current.index === playing.index', 'current !== null')],
    ['a step that stays up for a time of its own', changed('ui/SequenceOverlay.tsx', 'sequenceStepSeconds(step, text) * 1000', '4000')],
    ['an overlay that never looks for what is owed', changed('ui/SequenceOverlay.tsx', 'dueSequence(MUSEUM.sequences ?? [], state.progress, MUSEUM)?.id ?? null', 'null')],
    ['a director that starts on the title screen', changed('engine/sequenceDirector.ts', 'if (held || !state.started || state.sequence !== null) return false', 'if (held || state.sequence !== null) return false')],
    ['a key that turns a step under a modal', changed('engine/sequenceDirector.ts', 'if (state.sequence === null || isModalOpen(state)) return false', 'if (state.sequence === null) return false')],
    ['an air that is the radio\'s alone', changed('engine/deviceRules.ts', 'return state.radio !== null || (state.sequence ?? null) !== null', 'return state.radio !== null')],
    ['a sequence nobody mounts', changed('ui/Hud.tsx', /\n\s*<SequenceOverlay \/>/, '')],
    ['a director of the radio that talks over a sequence', changed('engine/Devices.tsx', 'onAir: airTaken(state),', 'onAir: state.radio !== null,')],
    ['a director that does not hear the sequence end', changed('engine/Devices.tsx', 'const onAir = useMuseum(airTaken)', 'const onAir = useMuseum((state) => state.radio !== null)')],
    ['R that calls the porter over a sequence', changed('engine/radioCall.ts', 'if (skipSequenceStepOn(store)) return true', '')],
    ['R that does nothing for a player with no radio', changed('engine/Devices.tsx', 'if (skipSequenceStep()) {', 'if (false) {')],
    ['a game started over with the old game\'s card still up', changed('state/store.ts', 'if (anotherGame && mine.sequence) taken.sequence = null', '')],
    ['a card seen out in another tab that stays up in this one', changed('state/store.ts', 'if (mine.sequence && progress.sequencesSeen.includes(mine.sequence.id)) taken.sequence = null', '')],
    ['a call heard out in another tab that stays in the air in this one', changed('state/store.ts', 'if (mine.radio?.callId !== undefined && progress.radioCalls.includes(mine.radio.callId)) taken.radio = null', '')],
    ['a radio button that offers a call while its press skips a card', changed('ui/Hud.tsx', 'const onAir = useMuseum(airTaken)', 'const onAir = useMuseum((state) => state.radio !== null)')],
  ]
  const uncaught = refactors.filter(([, reader]) => endingWiringProblems(reader).length === 0).map(([name]) => name)
  assert.deepEqual(uncaught, [], 'a refactor this check exists to catch went through')
})

done('ending checks')
