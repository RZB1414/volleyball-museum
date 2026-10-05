/**
 * Headless proof of the opening scene.
 *
 *   npm run test:opening
 *
 * The first minutes are a chain in which every link is silent when it breaks:
 * the player wakes in the dark office facing the desk, reads the notebook and
 * takes it, switches on the lamp, hears the latch and the porter's call, and
 * only then can open the door into the dark atrium — where the torch must not
 * reach the ceiling the plan saves for the end. Each link is checked here
 * against the real content and the real rules, with no browser.
 */

import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import { Box3, Vector3 } from 'three'

import { BAKED_BUNDLES, BAKED_MATERIALS } from '../src/content/bake.generated.ts'
import { en } from '../src/content/i18n/en.ts'
import { ptBR } from '../src/content/i18n/pt-BR.ts'
import {
  CONTENT_LOT,
  debtOf,
  KNOWN_DEBT,
  settleKnownDebt,
  type KnownDebt,
} from '../src/content/knownDebt.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { ExhibitMount, MuseumContent, RoomData } from '../src/content/schema.ts'
import { simulateProgress } from '../src/content/simulate.ts'
import {
  datedPromises,
  formatKnownDebt,
  validateContent,
  validateDeferred,
  validateOpening,
  type ValidationIssue,
} from '../src/content/validate.ts'
import { checklistNews, checklistRows, conditionTally, counterText } from '../src/engine/checklist.ts'
import {
  clockFaceAngles,
  clockHandAngles,
  clockTimeAfter,
  deviceInputOf,
  deviceIntent,
  deviceLive,
  dueRadioCalls,
  radioDevices,
  radioHintFor,
  radioIsLive,
  radioLineSeconds,
} from '../src/engine/deviceRules.ts'
import {
  FLASHLIGHT,
  FLASHLIGHT_SPOT_SLOTS,
  flashlightIntensity,
  flashlightReaches,
  isTextEntryTarget,
  torchIrradiance,
} from '../src/engine/flashlightRig.ts'
import { GALLERY_SPOT_SLOTS } from '../src/engine/galleryLightRig.ts'
import { fillHour, nightPhraseKey, nightPoints, nightTime, setClockMinutes } from '../src/engine/nightClock.ts'
import {
  containerById,
  isContainerTaken,
  journalUnlocked,
  notebookAdvance,
  notebookPagesFor,
} from '../src/engine/notebook.ts'
import { isRoomPowered } from '../src/engine/power.ts'
import { buildPowerControlLightRig } from '../src/engine/powerControlLightRig.ts'
import { progressConditionMet } from '../src/engine/progressCondition.ts'
import { clockGrant } from '../src/engine/progressGrants.ts'
import { MOUNT_PARTS, mountPartNames, transitionDoorPartNames } from '../src/engine/runtimePlacedParts.ts'
import {
  buildTransitionDoorSpecs,
  transitionDoorBlock,
} from '../src/engine/transitionDoorTopology.ts'
import { useMuseum } from '../src/state/store.ts'
import { clockJustSet, devicePrompt } from '../src/ui/promptRules.ts'
import { ARRIVAL_DEPTH, arrivalOf, recipeParts } from './lib/museumWorld.ts'
import { squeezed } from './lib/runtimeWiring.ts'
import { bearingDegrees, projectedSize, roomObstacles, sightlineBlockers } from './lib/sightline.ts'
import { KEY_NAMED_NOT_USED, keysCitedIn, readSourceTree } from './lib/translationUsage.ts'
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

const roomById = (id: string) => {
  const room = MUSEUM.rooms.find((candidate) => candidate.id === id)
  assert.ok(room, `room "${id}" exists`)
  return room
}

const office = roomById('office')
const atrium = roomById('atrium')
const EYE_HEIGHT = 1.62

type Save = {
  roomsPowered: string[]
  locksOpened: string[]
  documentsRead: string[]
  catalogued: string[]
  radioCalls: string[]
}
const freshSave = (): Save => ({
  roomsPowered: [],
  locksOpened: [],
  documentsRead: [],
  catalogued: [],
  radioCalls: [],
})
const poweredBy = (save: Save) => (roomId: string) =>
  isRoomPowered(roomById(roomId), save.roomsPowered)

console.log('\nOpening scene')

// ---------------------------------------------------------------------------
// Spawn
// ---------------------------------------------------------------------------

test('the night begins in the dark curator office', () => {
  assert.equal(MUSEUM.spawn.room, 'office')
  assert.equal(office.startsPowered, false)
  assert.equal(atrium.startsPowered, false)
})

test('the spawn faces the desk with its back to the door', () => {
  const [x, , z] = MUSEUM.spawn.position
  // three's camera looks down -Z; a yaw turns that to (-sin, 0, -cos).
  const facing = [-Math.sin(MUSEUM.spawn.yaw), -Math.cos(MUSEUM.spawn.yaw)]
  const toward = (target: readonly number[]) => {
    const dx = target[0] - x
    const dz = target[2] - z
    const length = Math.hypot(dx, dz)
    return (facing[0] * dx + facing[1] * dz) / length
  }

  const desk = office.kit.find((placement) => placement.part === 'curator-desk')
  const door = office.portals.find((portal) => portal.toRoom === 'atrium')
  assert.ok(desk && door)
  assert.ok(toward(desk.position) > 0.95, 'the desk is straight ahead')
  assert.ok(toward(door.position) < -0.95, 'the door is directly behind')
})

test('the notebook is within reach one step from the spawn', () => {
  const notebook = containerById(MUSEUM, 'office-notebook')
  assert.ok(notebook)
  // One 0.75 m step forward, to the lane before the visitor chairs.
  const standing = [MUSEUM.spawn.position[0] + 0.75, EYE_HEIGHT, MUSEUM.spawn.position[2]]
  const reach = Math.hypot(
    notebook.position[0] - standing[0],
    notebook.position[1] - standing[1],
    notebook.position[2] - standing[2],
  )
  assert.ok(reach < 2.2, `${reach.toFixed(2)} m is inside the 2.4 m container reach`)
})

test('the store starts every session in the spawn room', () => {
  assert.equal(useMuseum.getState().currentRoom, MUSEUM.spawn.room)
  useMuseum.setState({ currentRoom: 'atrium' })
  useMuseum.getState().resetProgress()
  assert.equal(useMuseum.getState().currentRoom, MUSEUM.spawn.room)
  assert.equal(useMuseum.getState().progress.lastRoom, MUSEUM.spawn.room)
})

// ---------------------------------------------------------------------------
// The notebook
// ---------------------------------------------------------------------------

test('the notebook turns three pages and closes from the last', () => {
  const pages = notebookPagesFor(MUSEUM, 'office-notebook')
  assert.deepEqual(
    pages.map((page) => page.style),
    ['printed', 'handwritten', 'checklist'],
  )
  assert.equal(notebookAdvance(pages.length, 0), 1)
  assert.equal(notebookAdvance(pages.length, 1), 2)
  assert.equal(notebookAdvance(pages.length, 2), 'close')
})

test('reading the notebook takes it from the desk and opens the journal', () => {
  const notebook = containerById(MUSEUM, 'office-notebook')
  assert.ok(notebook)
  assert.equal(journalUnlocked(MUSEUM, []), false, 'no journal before the notebook')
  assert.equal(isContainerTaken(MUSEUM, notebook, []), false)
  assert.equal(journalUnlocked(MUSEUM, ['doc-welcome']), true)
  assert.equal(isContainerTaken(MUSEUM, notebook, ['doc-welcome']), true)

  const drawer = containerById(MUSEUM, 'office-cabinet')
  assert.ok(drawer)
  assert.equal(
    isContainerTaken(MUSEUM, drawer, ['doc-predecessor']),
    false,
    'an ordinary drawer stays where it is',
  )
})

test('a content set without a notebook keeps the journal available', () => {
  const withoutCarrier: Pick<MuseumContent, 'rooms' | 'documents'> = {
    documents: MUSEUM.documents,
    rooms: MUSEUM.rooms.map((room) => ({
      ...room,
      containers: (room.containers ?? []).filter((container) => !container.carriesJournal),
    })),
  }
  assert.equal(journalUnlocked(withoutCarrier, []), true)
})

/**
 * The list as the notebook draws it, in one language: what each line says of
 * itself, whether it has a box and whether the box is ticked, the pencil note
 * beside it and its counts as they are printed.
 */
function listAsRead(
  items: Parameters<typeof checklistRows>[0],
  save: Save,
  content: Pick<MuseumContent, 'rooms' | 'exhibits'> = MUSEUM,
  dictionary: Record<string, string> = ptBR,
) {
  return checklistRows(items, save, content).map((row) => ({
    line: row.labelKey,
    done: row.done,
    note: row.noteKey,
    counts: row.counters.map((counter) =>
      [
        ...(counter.titleKey ? [dictionary[counter.titleKey]] : []),
        counterText(dictionary['notebook.counter'], counter.done, counter.of),
      ].join(' '),
    ),
  }))
}

test('the list is data: every line has a box or a date, and counts what is done (L3)', () => {
  const [, , checklist] = notebookPagesFor(MUSEUM, 'office-notebook')
  const items = checklist.items ?? []
  assert.deepEqual(
    items.map((item) => item.labelKey),
    ['notebook.todo.power', 'notebook.todo.catalogue', 'notebook.todo.vault'],
  )
  for (const item of items) {
    // A line with neither is a box nothing ever ticks; one with both is a
    // promise that pretends to be a task.
    assert.ok(
      (item.doneWhen === undefined) !== (item.deferredUntilLot === undefined),
      `${item.labelKey} has a box to tick or the lot that gives it one, and not both`,
    )
    assert.equal(item.author, 'helena', `${item.labelKey} is in the director's ink`)
  }
  const [power, catalogue, vault] = items
  assert.ok(power.doneWhen && catalogue.doneWhen)

  // The night begins: three boxes' worth of nothing, counted room by room.
  const save = freshSave()
  assert.deepEqual(listAsRead(items, save), [
    { line: 'notebook.todo.power', done: false, note: null, counts: ['0 de 3'] },
    {
      line: 'notebook.todo.catalogue',
      done: false,
      note: null,
      counts: ['Átrio 0 de 4', 'Ala 1 · Holyoke 0 de 8'],
    },
    { line: 'notebook.todo.vault', done: null, note: 'notebook.todo.vault.note', counts: [] },
  ])
  assert.deepEqual(
    listAsRead(items, save, MUSEUM, en).map((row) => row.counts),
    [['0 of 3'], ['Atrium 0 of 4', 'Wing 1 · Holyoke 0 of 8'], []],
  )

  // Line 1 counts up and ticks with the three rooms of the house.
  save.roomsPowered = ['office', 'atrium']
  assert.deepEqual(listAsRead(items, save)[0], {
    line: 'notebook.todo.power',
    done: false,
    note: null,
    counts: ['2 de 3'],
  })
  save.roomsPowered = ['office', 'atrium', 'holyoke']
  assert.deepEqual(listAsRead(items, save)[0].counts, ['3 de 3'])
  assert.equal(listAsRead(items, save)[0].done, true)

  // Frozen: the line names the rooms it means. A wing a later lot opens, dark,
  // does not untick what the player lit, and is not counted either (D1).
  const grown: MuseumContent = {
    ...MUSEUM,
    rooms: [
      ...MUSEUM.rooms,
      { ...atrium, id: 'paris', portals: [], exhibitIds: [], containers: [], devices: [], powerControl: undefined },
    ],
    exhibits: [...MUSEUM.exhibits, { ...MUSEUM.exhibits[0], id: 'a-thirteenth-piece' }],
  }
  assert.equal(progressConditionMet(power.doneWhen, save, grown), true, 'a fourth room does not untick line 1')
  assert.deepEqual(listAsRead(items, save, grown)[0], {
    line: 'notebook.todo.power',
    done: true,
    note: null,
    counts: ['3 de 3'],
  })

  // Line 2 counts each room's pieces apart, and ticks with the twelve of the house.
  const inTheHall = atrium.exhibitIds
  const inTheWing = roomById('holyoke').exhibitIds
  assert.deepEqual([inTheHall.length, inTheWing.length], [4, 8])
  save.catalogued = [...inTheHall, inTheWing[0]]
  assert.deepEqual(listAsRead(items, save)[1], {
    line: 'notebook.todo.catalogue',
    done: false,
    note: null,
    counts: ['Átrio 4 de 4', 'Ala 1 · Holyoke 1 de 8'],
  })
  save.catalogued = MUSEUM.exhibits.map((exhibit) => exhibit.id)
  assert.deepEqual(listAsRead(items, save)[1].counts, ['Átrio 4 de 4', 'Ala 1 · Holyoke 8 de 8'])
  assert.equal(listAsRead(items, save)[1].done, true)
  assert.equal(listAsRead(items, save, grown)[1].done, true, 'a thirteenth piece does not untick line 2')

  // Line 3 is a promise with a date: no box whatever the save holds, and the
  // pencil note that says why. Nothing the player does tonight ticks it.
  assert.equal(vault.deferredUntilLot, 12)
  assert.equal(vault.noteKey, 'notebook.todo.vault.note')
  const everything = { ...save, locksOpened: MUSEUM.locks.map((lock) => lock.id), documentsRead: MUSEUM.documents.map((doc) => doc.id) }
  assert.deepEqual(listAsRead(items, everything)[2], {
    line: 'notebook.todo.vault',
    done: null,
    note: 'notebook.todo.vault.note',
    counts: [],
  })
  for (const [locale, dictionary] of [['pt-BR', ptBR], ['en', en]] as const) {
    assert.ok(dictionary['notebook.todo.vault.note'].length > 0, `${locale}: the note is written`)
  }

  // What a line counts is what ticks it: the counts of a line, together,
  // name exactly the ids its box waits for.
  for (const item of items) {
    if (!item.doneWhen || !item.counters) continue
    const waited = [...(item.doneWhen.powered ?? []), ...(item.doneWhen.catalogued ?? [])].sort()
    const counted = item.counters.flatMap((counter) => [...(counter.of.powered ?? []), ...(counter.of.catalogued ?? [])]).sort()
    assert.deepEqual(counted, waited, `${item.labelKey} counts what ticks it`)
  }

  // And the page draws those rows, deciding nothing of its own: a tick or a
  // box worked out in the component is a list no suite reads.
  const page = squeezed(readText(new URL('../src/ui/Notebook.tsx', import.meta.url)))
  assert.ok(page.includes('const rows = checklistRows(page.items ?? [], progress, MUSEUM)'), 'the page asks checklistRows for its lines')
  assert.ok(!page.includes('progressConditionMet('), 'the page decides a tick by itself')
  assert.ok(page.includes("{row.done === null ? '' : row.done ? '☑' : '☐'}"), 'a line with no box is drawn with none')
  assert.ok(page.includes("counterText(t('notebook.counter'), counter.done, counter.of)"), 'a count is printed in the dictionary\'s own sentence')
  assert.ok(page.includes('{row.noteKey ? <span className="notebook-note">{text(row.noteKey)}</span> : null}'), 'the note is drawn beside its line')
})

test('a count is asked of the same rule that ticks, and a pencil line is news once', () => {
  const save = freshSave()
  // A room that never lost its power counts as lit, as it does for the tick.
  const lit: Pick<MuseumContent, 'rooms' | 'exhibits'> = {
    exhibits: MUSEUM.exhibits,
    rooms: MUSEUM.rooms.map((room) => (room.id === 'holyoke' ? { ...room, startsPowered: true } : room)),
  }
  const rooms = { powered: ['office', 'atrium', 'holyoke'] } as const
  assert.deepEqual(conditionTally(rooms, save, MUSEUM), { done: 0, of: 3 })
  assert.deepEqual(conditionTally(rooms, save, lit), { done: 1, of: 3 })
  assert.equal(progressConditionMet({ powered: ['holyoke'] }, save, lit), true)
  // Every list a counter may hold is added up, each id once.
  save.documentsRead = ['doc-welcome']
  save.locksOpened = ['office-drawer']
  assert.deepEqual(
    conditionTally(
      { documentsRead: ['doc-welcome', 'doc-halstead'], locksOpened: ['office-drawer'], catalogued: ['ball-spalding'] },
      save,
      MUSEUM,
    ),
    { done: 2, of: 4 },
  )
  assert.equal(counterText('{done} de {total}', 2, 4), '2 de 4')
  assert.equal(counterText('{total}: {done}', 2, 4), '4: 2', 'a language may put them the other way round')

  // A line that waits to appear is not on the list until its moment, and the
  // curator's own are announced the first time they are: never the director's.
  const items = [
    { labelKey: 'ink', author: 'helena', doneWhen: { powered: ['office'] } },
    { labelKey: 'ink.later', author: 'helena', appearsWhen: { locksOpened: ['office-drawer'] }, doneWhen: { powered: ['atrium'] } },
    { labelKey: 'pencil', author: 'curator', appearsWhen: { locksOpened: ['office-drawer'] }, doneWhen: { powered: ['atrium'] } },
    { labelKey: 'pencil.always', author: 'curator', doneWhen: { powered: ['atrium'] } },
  ] as const
  const before = freshSave()
  const after = { ...freshSave(), locksOpened: ['office-drawer'] }
  assert.deepEqual(checklistRows(items, before, MUSEUM).map((row) => row.labelKey), ['ink', 'pencil.always'])
  assert.deepEqual(checklistRows(items, after, MUSEUM).map((row) => row.labelKey), ['ink', 'ink.later', 'pencil', 'pencil.always'])
  assert.deepEqual(checklistRows(items, after, MUSEUM).map((row) => row.author), ['helena', 'helena', 'curator', 'curator'])
  assert.deepEqual(checklistNews(items, before, after, MUSEUM), ['pencil'])
  assert.deepEqual(checklistNews(items, after, after, MUSEUM), [], 'a line already on the list is not news')
  assert.deepEqual(checklistNews(items, after, before, MUSEUM), [], 'and a save that shrank announces nothing')
})

test('opening a container always starts a notebook on its first page', () => {
  useMuseum.getState().setNotebookPage(2)
  useMuseum.getState().setOpenedContainer('office-notebook')
  assert.equal(useMuseum.getState().notebookPage, 0)
  useMuseum.getState().setOpenedContainer(null)
})

// ---------------------------------------------------------------------------
// The door's electric lock
// ---------------------------------------------------------------------------

const officeDoor = buildTransitionDoorSpecs(MUSEUM.rooms).find(
  (door) => door.requiresPower !== null,
)

test('the office door is held by the office power', () => {
  assert.ok(officeDoor)
  assert.equal(officeDoor.requiresPower, 'office')
  const save = freshSave()
  // A released shortcut is no key to an electric lock: with every door of
  // the house released, this one still waits for the lamp.
  const everyDoor = buildTransitionDoorSpecs(MUSEUM.rooms).map((door) => door.id)
  for (const released of [[], everyDoor]) {
    assert.equal(transitionDoorBlock(officeDoor, 'office', poweredBy(save), released), 'unpowered')
    assert.equal(transitionDoorBlock(officeDoor, 'atrium', poweredBy(save), released), 'unpowered')
  }
  save.roomsPowered = ['office']
  for (const released of [[], everyDoor]) {
    assert.equal(transitionDoorBlock(officeDoor, 'office', poweredBy(save), released), null)
    assert.equal(transitionDoorBlock(officeDoor, 'atrium', poweredBy(save), released), null)
  }
})

test('the one-way shortcut keeps its own rule, latched and released', () => {
  const shortcut = buildTransitionDoorSpecs(MUSEUM.rooms).find((door) => door.opensFrom !== null)
  assert.ok(shortcut)
  const everything = (_roomId: string) => true
  // Latched, as every night begins: the wing's side only.
  assert.equal(transitionDoorBlock(shortcut, 'atrium', everything, []), 'other-side')
  assert.equal(transitionDoorBlock(shortcut, 'holyoke', everything, []), null)
  // Released by the first exit, as the save records it: both sides, for good.
  assert.equal(transitionDoorBlock(shortcut, 'atrium', everything, [shortcut.id]), null)
  assert.equal(transitionDoorBlock(shortcut, 'holyoke', everything, [shortcut.id]), null)
  // The opening night never needs it: the office door is not a shortcut.
  assert.equal(officeDoor?.opensFrom, null)
})

test('a door powered from beyond itself is a soft-lock the gate catches', () => {
  const broken: MuseumContent = {
    ...MUSEUM,
    rooms: MUSEUM.rooms.map((room) =>
      room.id !== 'atrium'
        ? room
        : {
            ...room,
            portals: room.portals.map((portal) =>
              portal.transitionDoor && portal.toRoom === 'office'
                ? { ...portal, transitionDoor: { ...portal.transitionDoor, requiresPower: 'atrium' as const } }
                : portal,
            ),
          },
    ),
  }
  // Asked of the exhaustive player (`simulate.ts`), who is stopped by the
  // door's own rule: the atrium, and the wing beyond it, are never reached.
  const unreachable = simulateProgress(broken)
    .issues.filter((issue) => issue.code === 'room-unreachable')
    .map((issue) => issue.id)
  assert.deepEqual(unreachable.sort(), ['atrium', 'holyoke'], 'the atrium is unreachable from the office')
  // The authored museum is accused of nothing the debt table has not dated
  // (three pieces a hand cannot be counted on to catalogue, the list item
  // that follows from them, one optional detail out of reach, and the flag
  // of the pump, which the dead air waits for and L12 sets):
  // every room is reached and every lock opens.
  const authored = simulateProgress(MUSEUM)
  const owed = debtOf('validate:content').filter((line) =>
    ['exhibit-uncataloguable', 'checklist-item-untickable', 'hotspot-unreachable', 'flag-never-set'].includes(line.code),
  )
  assert.deepEqual(
    settleKnownDebt(authored.issues, owed, CONTENT_LOT)
      .filter((issue) => issue.severity === 'error')
      .map((issue) => `${issue.code} ${issue.id ?? ''}`),
    [],
    'the authored museum is playable',
  )
  assert.deepEqual([...authored.final.roomsVisited].sort(), ['atrium', 'holyoke', 'office'])
  assert.deepEqual(authored.final.locksOpened, ['office-drawer'])
})

// ---------------------------------------------------------------------------
// The porter's radio
// ---------------------------------------------------------------------------

const [radioEntry] = radioDevices(MUSEUM)

test('the radio is dead until the office has power, then calls exactly once', () => {
  assert.ok(radioEntry)
  const radio = radioEntry.device
  // The designed order: the notebook is read before the lamp, so the
  // porter has no reminder to add (test-opening-flow covers the skip).
  const save = freshSave()
  save.documentsRead = ['doc-welcome']
  assert.equal(radioIsLive(MUSEUM, radio.id, save.roomsPowered), false)
  assert.equal(dueRadioCalls(radio, save, MUSEUM).length, 0)

  save.roomsPowered = ['office']
  assert.equal(radioIsLive(MUSEUM, radio.id, save.roomsPowered), true)
  // Two calls, in this order: who he is and what happened to the building,
  // and then where the hall's breaker is (L3 split the one call in two, so
  // that a player who lights the hall first still meets him).
  const due = dueRadioCalls(radio, save, MUSEUM)
  assert.deepEqual(due.map((call) => call.id), ['porter-hello', 'porter-first-call'])
  assert.equal(due[0].lineKeys.length, 5, 'his introduction carries the night')
  assert.equal(due[1].lineKeys.length, 2, 'the second carries the objective')

  save.radioCalls = due.map((call) => call.id)
  assert.equal(dueRadioCalls(radio, save, MUSEUM).length, 0, 'heard once, never again')
})

test('the porter always answers with the next thing the player needs', () => {
  const radio = radioEntry.device
  const save = freshSave()
  save.roomsPowered = ['office']
  // Each at its first height: where the thing is.
  assert.deepEqual(radioHintFor(radio, save, MUSEUM), ['radio.hint.notebook.where'])
  save.documentsRead = ['doc-welcome']
  assert.deepEqual(radioHintFor(radio, save, MUSEUM), ['radio.hint.atrium.where'])
  save.roomsPowered = ['office', 'atrium']
  assert.deepEqual(radioHintFor(radio, save, MUSEUM), ['radio.hint.holyoke.where'])
  save.roomsPowered = ['office', 'atrium', 'holyoke']
  assert.deepEqual(radioHintFor(radio, save, MUSEUM), ['radio.hint.drawer.where'])
  save.locksOpened = ['office-drawer']
  assert.deepEqual(radioHintFor(radio, save, MUSEUM), ['radio.hint.rest'])
  // And the heights of one of them, for a player who asks again.
  save.locksOpened = []
  assert.deepEqual(
    [0, 1, 2, 3].map((height) => radioHintFor(radio, save, MUSEUM, height)[0]),
    ['radio.hint.drawer.where', 'radio.hint.drawer.what', 'radio.hint.drawer.how', 'radio.hint.drawer.how'],
  )
  // The drawer's hint says where the year is and how it shows. It never
  // says the year: the one numeral in it is the wing's own.
  for (const key of ['radio.hint.drawer.where', 'radio.hint.drawer.what', 'radio.hint.drawer.how', 'radio.hint.drawer.curt'] as const) {
    assert.doesNotMatch(ptBR[key], /\d{2}/, key)
    assert.doesNotMatch(en[key], /\d{2}/, key)
  }
})

test('a transmission plays its lines in order and then falls silent', () => {
  const store = useMuseum.getState()
  store.startRadio({ deviceId: 'office-radio', speakerKey: 'radio.speaker.porter', lineKeys: ['a', 'b'] })
  const first = useMuseum.getState().radio
  assert.equal(first?.index, 0)
  useMuseum.getState().advanceRadio()
  assert.equal(useMuseum.getState().radio?.index, 1)
  assert.equal(useMuseum.getState().radio?.serial, first?.serial)
  useMuseum.getState().advanceRadio()
  assert.equal(useMuseum.getState().radio, null)

  store.recordRadioCall('porter-first-call')
  store.recordRadioCall('porter-first-call')
  assert.equal(
    useMuseum.getState().progress.radioCalls.filter((id) => id === 'porter-first-call').length,
    1,
  )
  useMuseum.getState().resetProgress()
})

test('subtitle lines stay up for a reading pace, within bounds', () => {
  assert.equal(radioLineSeconds('Câmbio.'), 3.2)
  assert.ok(radioLineSeconds('x'.repeat(120)) > 5)
  assert.equal(radioLineSeconds('x'.repeat(600)), 9)
})

// ---------------------------------------------------------------------------
// The stopped clock
// ---------------------------------------------------------------------------

test('the clock shows the minute the storm cut the power', () => {
  const clock = office.devices?.find((device) => device.kind === 'clock')
  assert.ok(clock && clock.kind === 'clock')
  assert.deepEqual(clockTimeAfter(clock.stoppedAt, 0), { hours: 16, minutes: 47, seconds: 0 })
  const angles = clockHandAngles(clockTimeAfter(clock.stoppedAt, 0))
  const degrees = (radians: number) => Math.round((radians * 180) / Math.PI * 10) / 10
  assert.equal(degrees(angles.hour), 143.5)
  assert.equal(degrees(angles.minute), 282)
  assert.equal(degrees(angles.second), 0)
})

test('a mains clock resumes from where it stopped and wraps at midnight', () => {
  assert.deepEqual(clockTimeAfter({ hours: 16, minutes: 47 }, 90), {
    hours: 16,
    minutes: 48,
    seconds: 30,
  })
  assert.deepEqual(clockTimeAfter({ hours: 23, minutes: 59 }, 120), {
    hours: 0,
    minutes: 1,
    seconds: 0,
  })
  assert.deepEqual(clockTimeAfter({ hours: 9, minutes: 0 }, -5), {
    hours: 9,
    minutes: 0,
    seconds: 0,
  })
})

test('the clock is put right once, with the lamp on, and from then on shows the hour of the night (L3)', () => {
  const clock = office.devices?.find((device) => device.kind === 'clock')
  assert.ok(clock && clock.kind === 'clock')
  const night = MUSEUM.nightClock
  assert.ok(night, 'the museum has a night clock')
  assert.equal(clock.setFlag, 'clock-set')
  assert.equal(ptBR['device.office-clock.title'], 'Relógio do escritório')
  assert.equal(en['device.office-clock.title'], 'Office clock')

  // Until it is set it is the clock it always was: stopped at the storm's
  // minute, and running from there with the room's power.
  for (const elapsed of [0, 90, 4000]) {
    assert.deepEqual(clockFaceAngles(clock.stoppedAt, elapsed, null), clockHandAngles(clockTimeAfter(clock.stoppedAt, elapsed)), `${elapsed} s`)
  }

  // What E does to it: nothing without its mains, set it with them, nothing once set.
  const input = (powered: boolean, set: boolean) => ({ powered, carried: false, speaking: false, set })
  assert.deepEqual(deviceIntent(clock, input(false, false)), { kind: 'none' }, 'a mains clock is not put right in the dark')
  assert.deepEqual(deviceIntent(clock, input(true, false)), { kind: 'clock', intent: 'set' })
  assert.deepEqual(deviceIntent(clock, input(true, true)), { kind: 'none' }, 'it is set once')
  assert.equal(deviceLive({ kind: 'clock', intent: 'set' }), true)
  const { setFlag: _, ...plain } = clock
  assert.deepEqual(deviceIntent(plain, input(true, false)), { kind: 'none' }, 'a clock with no flag to set only runs')
  assert.deepEqual(clockGrant(plain), {})
  // Read off the save as the game reads it.
  const asked = (roomsPowered: string[], flags?: unknown) =>
    deviceIntent(clock, deviceInputOf(clock, { progress: { roomsPowered, flags: flags as string[] }, radio: null }, MUSEUM)).kind
  assert.equal(asked([]), 'none')
  assert.equal(asked(['office']), 'clock')
  assert.equal(asked(['office'], []), 'clock')
  assert.equal(asked(['office'], ['clock-set']), 'none')
  assert.equal(asked(['atrium'], []), 'none', 'its own room, not any room')
  assert.equal(asked(['office'], 'clock-set'), 'clock', 'a list that is not one holds nothing')
  // What setting it records, and how its prompt reads.
  assert.deepEqual(clockGrant(clock), { flags: ['clock-set'] })
  assert.deepEqual(devicePrompt(clock, { kind: 'clock', intent: 'set' }), {
    form: 'action',
    key: true,
    labelKey: 'prompt.clock.set',
    titleKey: 'device.office-clock.title',
  })
  assert.equal(devicePrompt(clock, { kind: 'none' }), null)
  assert.equal(ptBR['prompt.clock.set'], 'Acertar o relógio')
  assert.equal(en['prompt.clock.set'], 'Set the clock')

  // The hour of the night: ten past seven at the first point, half an hour a point.
  assert.equal(nightTime(night, 0), null, 'nothing has happened yet')
  assert.deepEqual(nightTime(night, 1), { hours: 19, minutes: 10 })
  assert.deepEqual(nightTime(night, 2), { hours: 19, minutes: 40 })
  assert.deepEqual(nightTime(night, 3), { hours: 20, minutes: 10 })
  assert.deepEqual(nightTime(night, night.milestones.length), { hours: 22, minutes: 40 })
  assert.deepEqual(nightTime({ ...night, startsAt: { hours: 23, minutes: 50 } }, 2), { hours: 0, minutes: 20 }, 'past midnight it wraps')

  // A point for each milestone met, in whatever order they were met.
  const points = (patch: Partial<Save> & { flags?: string[] }) => nightPoints(night, { ...freshSave(), ...patch }, MUSEUM)
  const pieces = MUSEUM.exhibits.map((exhibit) => exhibit.id)
  assert.equal(night.milestones.length, 8)
  assert.equal(points({}), 0)
  assert.equal(points({ roomsPowered: ['office'] }), 1)
  assert.equal(points({ roomsPowered: ['holyoke', 'office'] }), 2, 'Wing 1 before the hall is two points all the same')
  assert.equal(points({ roomsPowered: ['office', 'atrium', 'holyoke'] }), 3)
  assert.equal(points({ roomsPowered: ['office'], locksOpened: ['office-drawer'] }), 2)
  assert.deepEqual(
    [0, 2, 3, 5, 6, 8, 9, 11, 12].map((count) => points({ catalogued: pieces.slice(0, count) })),
    [0, 0, 1, 1, 2, 2, 3, 3, 4],
    'the collection, by threes',
  )
  assert.equal(points({ catalogued: ['a-piece-of-another-wing', 'and-another', 'and-a-third'] }), 0, 'three pieces that are not of the house')
  assert.equal(points({ roomsPowered: ['office', 'atrium', 'holyoke'], locksOpened: ['office-drawer'], catalogued: pieces }), 8)
  // Setting the clock is not a milestone: it shows the night, it does not move it.
  assert.equal(points({ roomsPowered: ['office'], flags: ['clock-set'] }), 1)

  // The clock on the wall. Unset, it shows no hour of the night at all.
  const shows = (patch: Partial<Save> & { flags?: string[] }) => setClockMinutes(night, clock.setFlag, { ...freshSave(), ...patch }, MUSEUM)
  assert.equal(shows({ roomsPowered: ['office', 'atrium'] }), null)
  assert.equal(shows({ roomsPowered: ['office'], flags: ['clock-set'] }), 19 * 60 + 10, 'set with one point, it shows 19h10')
  assert.equal(shows({ roomsPowered: ['office', 'atrium'], flags: ['clock-set'] }), 19 * 60 + 40)
  assert.equal(shows({ roomsPowered: ['office', 'atrium', 'holyoke'], flags: ['clock-set'] }), 20 * 60 + 10)
  assert.equal(setClockMinutes(undefined, clock.setFlag, { ...freshSave(), roomsPowered: ['office'], flags: ['clock-set'] }, MUSEUM), null)
  assert.equal(setClockMinutes(night, undefined, { ...freshSave(), roomsPowered: ['office'], flags: ['clock-set'] }, MUSEUM), null)
  // Its hands: the hour and the minute of the night, and the seconds of the count.
  const degrees = (radians: number) => Math.round(((radians * 180) / Math.PI) * 10) / 10
  const face = clockFaceAngles(clock.stoppedAt, 75, { hours: 19, minutes: 10 })
  assert.deepEqual([degrees(face.hour), degrees(face.minute), degrees(face.second)], [215, 60, 90])
  // The night does not creep: the minute hand stands still until the night moves.
  assert.equal(clockFaceAngles(clock.stoppedAt, 20, { hours: 19, minutes: 10 }).minute, face.minute)
  assert.notEqual(clockFaceAngles(clock.stoppedAt, 20, null).minute, clockFaceAngles(clock.stoppedAt, 75, null).minute)

  // What the porter would say of each hour, and that it is that hour.
  assert.equal(nightPhraseKey(night, 0), null)
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7, 8].map((count) => ptBR[nightPhraseKey(night, count) as 'night.hour.1']),
    ['Passa das sete', 'Quase oito', 'Passa das oito', 'Quase nove', 'Passa das nove', 'Quase dez', 'Passa das dez', 'Quase onze'],
  )
  assert.equal(nightPhraseKey(night, 99), 'night.hour.8', 'past the last milestone it is the last hour')
  const HOURS: Record<number, readonly [string, string]> = { 19: ['sete', 'seven'], 20: ['oito', 'eight'], 21: ['nove', 'nine'], 22: ['dez', 'ten'], 23: ['onze', 'eleven'] }
  for (let count = 1; count <= night.milestones.length; count += 1) {
    const time = nightTime(night, count)
    const key = nightPhraseKey(night, count) as 'night.hour.1'
    assert.ok(time && key)
    // Rounded as a person rounds: just past the hour, or nearly the next.
    const [past, nearly] = time.minutes < 30 ? [HOURS[time.hours], null] : [null, HOURS[time.hours + 1]]
    assert.equal(ptBR[key], past ? `Passa das ${past[0]}` : `Quase ${nearly?.[0]}`, `${key} at ${time.hours}h${time.minutes}`)
    assert.equal(en[key], past ? `Gone ${past[1]}` : `Nearly ${nearly?.[1]}`, key)
    assert.doesNotMatch(ptBR[key] + en[key], /\d/, 'an hour said aloud is spelt out')
  }
  // The token a spoken line carries, filled; a line without it is left alone.
  assert.equal(fillHour('O acervo é seu, curador. {hora}.', 'Passa das nove'), 'O acervo é seu, curador. Passa das nove.')
  assert.equal(fillHour('Câmbio.', 'Passa das nove'), 'Câmbio.')
  assert.equal(fillHour('O acervo é seu, curador. {hora}.', null), 'O acervo é seu, curador.', 'with no hour to say, the token never reaches the screen')

  // The toast: when a clock's own flag arrives, and not on the load that brings it.
  const flags = new Set(['clock-set'])
  assert.equal(clockJustSet(0, ['clock-set'], flags), true)
  assert.equal(clockJustSet(1, ['clock-set'], flags), false, 'a clock set on another night is not announced on Continue')
  assert.equal(clockJustSet(0, ['some-other-flag'], flags), false, 'another flag is not about the hour')
  assert.equal(clockJustSet(1, ['some-other-flag', 'clock-set'], flags), true)
  assert.equal(clockJustSet(2, [], flags), false, 'a new game empties the list')
  assert.equal(`${ptBR['clock.set']} — ${ptBR['night.hour.1']}`, 'Relógio acertado — Passa das sete')
  assert.equal(`${en['clock.set']} — ${en['night.hour.1']}`, 'Clock set — Gone seven')

  // On the store: the grant is the flag, once, and the clock then answers nothing.
  useMuseum.getState().resetProgress()
  useMuseum.getState().powerRoom('office')
  useMuseum.getState().grant(clockGrant(clock))
  assert.deepEqual(useMuseum.getState().progress.flags, ['clock-set'])
  const once = useMuseum.getState().progress
  useMuseum.getState().grant(clockGrant(clock))
  assert.equal(useMuseum.getState().progress, once, 'set twice wrote twice')
  assert.equal(deviceIntent(clock, deviceInputOf(clock, useMuseum.getState(), MUSEUM)).kind, 'none')
  useMuseum.getState().resetProgress()
})

// ---------------------------------------------------------------------------
// The torch
// ---------------------------------------------------------------------------

test('the torch never reaches the atrium ceiling the plan saves for last', () => {
  assert.equal(flashlightReaches(atrium.shell.height, EYE_HEIGHT), false)
  assert.equal(flashlightReaches(office.shell.height, EYE_HEIGHT), true, 'but lights the office')
})

test('the torch is one permanent spot added to the gallery pool', () => {
  assert.equal(FLASHLIGHT_SPOT_SLOTS, 1)
  // Mounted unconditionally at the scene root and never hidden: either would
  // change the light count and recompile every material at the first press.
  const component = readText(new URL('../src/engine/Flashlight.tsx', import.meta.url))
  const scene = readText(new URL('../src/scenes/MuseumScene.tsx', import.meta.url))
  assert.equal((component.match(/<spotLight\b/g) ?? []).length, FLASHLIGHT_SPOT_SLOTS)
  assert.ok(!/visible=\{/.test(component), 'the torch spot is never hidden')
  assert.ok(/\n\s*<Flashlight \/>\n/.test(scene), 'the scene always mounts the torch')
  assert.equal(GALLERY_SPOT_SLOTS, 8, 'the permanent pool the torch joins')
  assert.equal(flashlightIntensity(false, 1, false), 0, 'off is intensity zero, never unmounted')
  assert.equal(flashlightIntensity(true, 1, false), FLASHLIGHT.intensity)
  assert.equal(flashlightIntensity(true, 0.5, false), FLASHLIGHT.intensity * 0.5)
})

test('the beam lights a room as far as it did, without blowing out the near field', () => {
  // The torch as it was: 18 at the inverse square. A wall four metres off
  // keeps its light; a shelf at a metre and a door a step away get under
  // half the hot spot that took a crimson spine to salmon pink.
  const before = (distance: number) => 18 / distance ** 2
  assert.ok(Math.abs(torchIrradiance(4) - before(4)) / before(4) < 0.02, `at 4 m: ${torchIrradiance(4).toFixed(2)}`)
  assert.ok(torchIrradiance(1) < before(1) * 0.5, `at 1 m: ${torchIrradiance(1).toFixed(2)}`)
  assert.ok(torchIrradiance(0.7) < before(0.7) * 0.4, `a step away: ${torchIrradiance(0.7).toFixed(2)}`)
  for (const distance of [0.5, 1, 2, 3, 4, 5]) {
    assert.ok(torchIrradiance(distance) > torchIrradiance(distance + 0.5), 'still falls off with distance')
  }
  // Held up to the face (0.42 m ahead of the eye, the lamp low and to the
  // right of it), an exhibit keeps the light it had, well under the beam's.
  const hold = Math.hypot(FLASHLIGHT.offset[0], FLASHLIGHT.offset[1], 0.42 + FLASHLIGHT.offset[2])
  const held = torchIrradiance(hold, true)
  assert.ok(Math.abs(held - (before(hold) * 0.12)) / (before(hold) * 0.12) < 0.05, `held: ${held.toFixed(2)}`)
  assert.ok(held < torchIrradiance(hold) * 0.5, 'dimmed while an object is held to the face')
  assert.ok(
    readText(new URL('../src/engine/Flashlight.tsx', import.meta.url)).includes('decay={FLASHLIGHT.decay}'),
    'the spot uses the decay these numbers assume',
  )
})

test('switching the torch on ends its hint and typing never switches it', () => {
  useMuseum.setState({ flashlightOn: false, flashlightUsed: false })
  useMuseum.getState().toggleFlashlight()
  assert.equal(useMuseum.getState().flashlightOn, true)
  assert.equal(useMuseum.getState().flashlightUsed, true)
  useMuseum.getState().toggleFlashlight()
  assert.equal(useMuseum.getState().flashlightOn, false)
  assert.equal(useMuseum.getState().flashlightUsed, true)

  assert.equal(isTextEntryTarget({ tagName: 'INPUT' } as unknown as EventTarget), true)
  assert.equal(isTextEntryTarget({ tagName: 'CANVAS' } as unknown as EventTarget), false)
  assert.equal(isTextEntryTarget(null), false)
})

// ---------------------------------------------------------------------------
// The pilot of a dark room, from the door the player comes in by
// ---------------------------------------------------------------------------

/**
 * A room that starts dark shows its power control to whoever walks in.
 *
 * The Holyoke breaker hung on the wall of its own entrance, 2.2 m north of
 * the door: behind the player's shoulder, 103 degrees off the way they were
 * facing, and its pilot changed no pixel of the first frame. The porter's
 * hint said "inside" and nothing else did. So this is measured, from 0.95 m
 * inside the doorway each dark room is first reached by, at eye height,
 * facing in:
 *
 *   - the lens is within 35 degrees of straight ahead;
 *   - the panel covers at least six pixels each way at 1280 x 720;
 *   - the lens glows by itself, and the pilot light falls on its own panel;
 *   - nothing in the room stands between the doorway and the panel, from the
 *     middle of the opening or from half a metre to either side of it.
 *
 * The spawn room is left out: nobody arrives there, they wake beside its lamp.
 */
const LIGHTHOUSE_MAX_BEARING_DEGREES = 35
const LIGHTHOUSE_MIN_PIXELS = 6
const DOORWAY_SIDESTEP = 0.5

/** What is wrong with a dark room's control as a lighthouse, and what was measured. */
function lighthouseOf(room: RoomData): { problems: string[]; note: string } | null {
  const kit = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit')
  const materials = BAKED_MATERIALS as Record<string, { emissive?: readonly number[]; emissiveIntensity?: number }>
  const problems: string[] = []
  {
    const control = room.powerControl
    if (room.startsPowered || !control) return null
    const arrival = arrivalOf(room.id)
    if (arrival.portalId === null) return null

    // Everything below is room-local.
    const rotation = control.rotationY ?? 0
    const place = (local: readonly number[]) =>
      new Vector3(
        control.position[0] + local[0] * Math.cos(rotation) + local[2] * Math.sin(rotation),
        control.position[1] + local[1],
        control.position[2] - local[0] * Math.sin(rotation) + local[2] * Math.cos(rotation),
      )
    const heading = new Vector3(arrival.heading[0], 0, arrival.heading[1])
    const across = new Vector3(-arrival.heading[1], 0, arrival.heading[0])
    const eye = new Vector3(arrival.local[0], EYE_HEIGHT, arrival.local[1])

    const nodes = new Map(recipeParts(control.part, kit).map((node) => [node.name, node]))
    const body = nodes.get(control.part)
    assert.ok(body, `${control.part} has a root node`)
    const { min, max } = body.bounds
    const face = [
      place([(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, max[2]]),
      place([min[0], min[1], max[2]]),
      place([max[0], min[1], max[2]]),
      place([min[0], max[1], max[2]]),
      place([max[0], max[1], max[2]]),
    ]
    const corners = [min[2], max[2]].flatMap((z) =>
      [min[0], max[0]].flatMap((x) => [min[1], max[1]].map((y) => place([x, y, z]))),
    )
    const pilot = place(control.pilotPosition)

    const lensNode = nodes.get(`${control.part}__led`)
    const lens = lensNode
      ? place([
          (lensNode.bounds.min[0] + lensNode.bounds.max[0]) / 2,
          (lensNode.bounds.min[1] + lensNode.bounds.max[1]) / 2,
          lensNode.bounds.max[2],
        ])
      : null
    if (!lensNode) problems.push(`${control.id}: the recipe bakes no lens ("${control.part}__led")`)
    else if (!((materials[lensNode.material]?.emissiveIntensity ?? 0) > 0)) {
      problems.push(`${control.id}: the lens is "${lensNode.material}", which does not glow by itself`)
    }

    // Without a lens the panel's own centre still says where the player
    // would have to look.
    const bearing = bearingDegrees(eye, heading, lens ?? face[0])
    if (bearing > LIGHTHOUSE_MAX_BEARING_DEGREES) {
      problems.push(
        `${control.id}: ${bearing.toFixed(1)}° off the way the player walks in by "${arrival.portalId}" ` +
          `(limit ${LIGHTHOUSE_MAX_BEARING_DEGREES}°)`,
      )
    }

    const size = projectedSize(eye, heading, corners)
    if (!size) problems.push(`${control.id}: the panel is behind the player as they walk in`)
    else if (size.width < LIGHTHOUSE_MIN_PIXELS || size.height < LIGHTHOUSE_MIN_PIXELS) {
      problems.push(
        `${control.id}: the panel is ${size.width.toFixed(1)} x ${size.height.toFixed(1)} px from the door ` +
          `(at least ${LIGHTHOUSE_MIN_PIXELS} each way)`,
      )
    }

    const reach = buildPowerControlLightRig(room)[0].unpowered.distance
    const toFace = new Box3(new Vector3(...min), new Vector3(...max)).distanceToPoint(
      new Vector3(...control.pilotPosition),
    )
    if (toFace >= reach) {
      problems.push(`${control.id}: the pilot is ${toFace.toFixed(2)} m from its own panel and reaches ${reach} m`)
    }

    const obstacles = roomObstacles(room)
    const targets = [...(lens ? [lens] : []), pilot, ...face]
    let free = 0
    for (const sidestep of [0, -DOORWAY_SIDESTEP, DOORWAY_SIDESTEP]) {
      const from = eye.clone().addScaledVector(across, sidestep)
      for (const target of targets) {
        const blockers = sightlineBlockers(from, target, obstacles)
        if (blockers.length === 0) free += 1
        else {
          problems.push(
            `${control.id}: from ${sidestep === 0 ? 'the middle of the doorway' : `${sidestep} m across the doorway`}, ` +
              `${[...new Set(blockers)].join(' and ')} stands in front of the panel`,
          )
        }
      }
    }
    return {
      problems: [...new Set(problems)],
      note:
        `${control.id} from "${arrival.portalId}": ${bearing.toFixed(1)}° off axis, ` +
        `${size ? `${size.width.toFixed(0)} x ${size.height.toFixed(0)} px` : 'behind the player'}, ` +
        `${free} of ${targets.length * 3} sight lines free`,
    }
  }
}

test('from the door each dark room is reached by, its pilot is a lighthouse', () => {
  const measured = MUSEUM.rooms.flatMap((room) => {
    const result = lighthouseOf(room)
    return result ? [result] : []
  })
  for (const { note } of measured) console.log(`  note  ${note}`)
  assert.ok(measured.length >= 2, 'the atrium and the wing are both reached through a door')
  assert.deepEqual(measured.flatMap(({ problems }) => problems), [])
})

test('the lighthouse rule sees what stands in the room, and where the door is', () => {
  const holyoke = roomById('holyoke')
  const control = holyoke.powerControl
  assert.ok(control, 'the wing has a breaker')
  const moved = (position: readonly [number, number, number], rotationY: number) =>
    lighthouseOf({ ...holyoke, powerControl: { ...control, position, rotationY } })?.problems ?? []

  // Three metres further along the same wall, where the plan first put it:
  // every number on paper passed, and the hero case stood in the way.
  const behindTheCase = moved([control.position[0], control.position[1], 5.0], control.rotationY ?? 0)
  assert.ok(
    behindTheCase.some((problem) => problem.includes('history-hero-case')),
    `at z = 5.0 the hero case hides the panel (${behindTheCase.join('; ') || 'nothing reported'})`,
  )
  // Where it hung until this lot: on the wall of the door itself.
  const besideTheDoor = moved([5.875, 1.05, -4.2], -Math.PI / 2)
  assert.ok(
    besideTheDoor.some((problem) => problem.includes('off the way the player walks in')) &&
      besideTheDoor.some((problem) => problem.includes('behind the player')),
    `beside its own door the panel is behind the player (${besideTheDoor.join('; ') || 'nothing reported'})`,
  )
})

// ---------------------------------------------------------------------------
// A hint that says "to your left" is right from every door, or says no side
// ---------------------------------------------------------------------------

/**
 * A hint that sends the player to a dark room's control may name a side only
 * if the control is on that side whichever door they come in by.
 *
 * The porter is asked from wherever the player stands, at any time. His hint
 * for Wing 1 said the breaker was «à esquerda de quem entra», which was true
 * while the wing had one way in. Since the shortcut stays open, a player who
 * crossed the wing in the dark and left by it can come back that way, and
 * from there the breaker is to the right: the one direction the hint gave
 * pointed at the wrong wall.
 *
 * So: for every hint that waits on one room's power, each line in each
 * language is read for a side, and the control is measured from every
 * doorway of that room a player can walk in by while it is dark (any door
 * but one that waits for the room's own power). A line that names no side
 * passes. The first call is not a hint: it is said once, in the office, and
 * names the door it counts from.
 */
const SIDE_WORDS: Record<'pt-BR' | 'en', readonly (readonly [RegExp, 'left' | 'right'])[]> = {
  'pt-BR': [
    [/\besquerd[ao]\b/i, 'left'],
    [/\bdireita\b/i, 'right'],
  ],
  // "Right beside the door" and "left you a notebook" are not directions.
  en: [
    [/\b(?:to|on) (?:your|the|his|her) left\b|\bleft of\b|\bleft-hand\b/i, 'left'],
    [/\b(?:to|on) (?:your|the|his|her) right\b|\bright of\b|\bright-hand\b/i, 'right'],
  ],
}

function sidedHintProblems(
  content: MuseumContent,
  dictionaries: Readonly<Record<'pt-BR' | 'en', Readonly<Record<string, string>>>>,
): string[] {
  const problems: string[] = []
  const doors = buildTransitionDoorSpecs(content.rooms)
  for (const { device } of radioDevices(content)) {
    for (const hint of device.hints) {
      const when = hint.when as { readonly unpowered?: readonly string[] }
      const roomId = when.unpowered?.length === 1 && Object.keys(when).length === 1 ? when.unpowered[0] : null
      const room = content.rooms.find((candidate) => candidate.id === roomId)
      const control = room?.powerControl
      if (!room || !control) continue

      // Each way in, with the side the control is on from 0.95 m inside it.
      const ways = room.portals
        .filter((portal) => {
          const door = doors.find(
            (candidate) => candidate.id === portal.id || (candidate.reciprocalPortalId === portal.id && candidate.otherRoomId === room.id),
          )
          return door?.requiresPower !== room.id
        })
        .map((portal) => {
          // A portal's own +Z points into its room; to the right of that is (-z, x).
          const heading = [Math.sin(portal.rotationY), Math.cos(portal.rotationY)]
          const eye = [portal.position[0] + heading[0] * ARRIVAL_DEPTH, portal.position[2] + heading[1] * ARRIVAL_DEPTH]
          const to = [control.position[0] - eye[0], control.position[2] - eye[1]]
          const across = to[0] * -heading[1] + to[1] * heading[0]
          const degrees = bearingDegrees(
            new Vector3(eye[0], 0, eye[1]),
            new Vector3(heading[0], 0, heading[1]),
            new Vector3(control.position[0], 0, control.position[2]),
          )
          return { portalId: portal.id, side: across > 0 ? ('right' as const) : ('left' as const), degrees }
        })

      for (const locale of ['pt-BR', 'en'] as const) {
        for (const key of [...hint.heightKeys, ...(hint.curtLineKeys ?? [])]) {
          const line = dictionaries[locale][key] ?? ''
          for (const [pattern, said] of SIDE_WORDS[locale]) {
            const word = pattern.exec(line)?.[0]
            if (!word) continue
            for (const way of ways.filter((candidate) => candidate.side !== said)) {
              problems.push(
                `${key} (${locale}) says "${word}", and for a player who walks into ${room.id} by "${way.portalId}" ` +
                  `${control.id} is ${way.degrees.toFixed(1)}° to the ${way.side}`,
              )
            }
          }
        }
      }
    }
  }
  return problems
}

test('a hint to a dark room names a side only if it is that side from every door', () => {
  assert.deepEqual(sidedHintProblems(MUSEUM, { 'pt-BR': ptBR, en }), [])

  // The lines as they were while the wing had one way in: wrong by the shortcut, in both languages.
  // (Then one line; since L3 the hint is said a height at a time, and the
  // side was in what is now its first.)
  const asItWas = {
    'pt-BR': {
      ...ptBR,
      'radio.hint.holyoke.where':
        'A Ala 1 tem quadro próprio, na parede do outro lado da sala, à esquerda de quem entra. Atravessa no escuro: a lanterna dá conta.',
      'radio.hint.holyoke.curt': 'Ala 1. Quadro na parede do fundo, à esquerda. Luzinha vermelha. Vai.',
    },
    en: {
      ...en,
      'radio.hint.holyoke.where': 'Wing 1 has its own breaker, on the far wall, to your left as you walk in. Cross it in the dark — the torch will do.',
      'radio.hint.holyoke.curt': 'Wing 1. Breaker on the far wall, to the left. Little red light. Go.',
    },
  }
  const accusedLines = sidedHintProblems(MUSEUM, asItWas)
  assert.equal(accusedLines.length, 4, accusedLines.join('\n'))
  for (const line of accusedLines) assert.match(line, /by "holyoke-shortcut" holyoke-breaker is 2\d\.\d° to the right/)
  assert.deepEqual(
    accusedLines.map((line) => line.split(' says ')[0]).sort(),
    ['radio.hint.holyoke.curt (en)', 'radio.hint.holyoke.curt (pt-BR)', 'radio.hint.holyoke.where (en)', 'radio.hint.holyoke.where (pt-BR)'],
  )
  // The right side for the main door and the wrong one for the shortcut: said the other way round, it is the main door that is accused.
  // At any height: here, the third.
  const mirrored = { ...asItWas, 'pt-BR': { ...ptBR, 'radio.hint.holyoke.how': 'O quadro fica à direita de quem entra, no escuro.' } }
  assert.ok(sidedHintProblems(MUSEUM, mirrored).some((line) => /radio\.hint\.holyoke\.how \(pt-BR\).*by "holyoke-to-atrium".*to the left/.test(line)))

  // With one way in, the same lines are true, and pass: this is the wing before the shortcut stayed open.
  const oneDoor: MuseumContent = {
    ...MUSEUM,
    rooms: MUSEUM.rooms.map((room) => ({ ...room, portals: room.portals.filter((portal) => !/shortcut/.test(portal.id)) })),
  }
  assert.deepEqual(sidedHintProblems(oneDoor, asItWas), [])

  // What is a direction and what is not, in English.
  const side = (line: string) => SIDE_WORDS.en.flatMap(([pattern, said]) => (pattern.test(line) ? [said] : []))
  assert.deepEqual(side('right beside the door'), [])
  assert.deepEqual(side('Helena left you a notebook. All right?'), [])
  assert.deepEqual(side('a little to your right as you leave'), ['right'])
  assert.deepEqual(side('on the left-hand wall'), ['left'])
  // The call that gives the hall's breaker does name a side, and is not a
  // hint: it is said once, in the office, of the door it counts from.
  assert.deepEqual(side(en['radio.call.first.1']), ['right'])
  assert.match(ptBR['radio.call.first.1'], /à direita de quem sai daí/)
  // No hint of the house names one, at any height or curt.
  for (const hint of radioEntry.device.hints) {
    for (const key of [...hint.heightKeys, ...(hint.curtLineKeys ?? [])]) {
      assert.deepEqual(side((en as Record<string, string>)[key]), [], key)
      assert.doesNotMatch((ptBR as Record<string, string>)[key], /\besquerd[ao]\b|\bdireita\b/i, key)
    }
  }
})

// ---------------------------------------------------------------------------
// Content gate
// ---------------------------------------------------------------------------

test('the opening content passes its own validator', () => {
  const errors = validateOpening(MUSEUM).filter((issue) => issue.severity === 'error')
  assert.deepEqual(errors, [])
})

test('a broken spawn or a silent radio fails the gate', () => {
  const misplaced: MuseumContent = { ...MUSEUM, spawn: { ...MUSEUM.spawn, position: [9, 0, 0] } }
  assert.ok(validateOpening(misplaced).some((issue) => issue.code === 'spawn-outside-room'))

  const silent: MuseumContent = {
    ...MUSEUM,
    rooms: MUSEUM.rooms.map((room) => ({
      ...room,
      devices: (room.devices ?? []).map((device) =>
        device.kind === 'radio'
          ? {
              ...device,
              calls: device.calls.map((call) => ({ ...call, when: { locksOpened: ['no-such-lock'] } })),
            }
          : device,
      ),
    })),
  }
  assert.ok(validateOpening(silent).some((issue) => issue.code === 'condition-lock-missing'))
})

// ---------------------------------------------------------------------------
// The validators that were missing (M0), on museums broken on purpose
// ---------------------------------------------------------------------------

const DICTIONARY_KEYS: ReadonlySet<string> = new Set(Object.keys(ptBR))
const DICTIONARIES = { 'pt-BR': ptBR as Record<string, string>, en: en as Record<string, string> }
const SOURCE_ROOT = fileURLToPath(new URL('../src', import.meta.url))
const KEYS_CITED_BY_CODE = keysCitedIn(DICTIONARY_KEYS, readSourceTree(SOURCE_ROOT, KEY_NAMED_NOT_USED))

type GatePatch = {
  readonly bundles?: Parameters<typeof validateContent>[1]
  readonly keys?: ReadonlySet<string>
  readonly dictionaries?: Record<string, Record<string, string>>
  readonly keysCitedByCode?: ReadonlySet<string>
}
/** The whole content gate, as `npm run validate:content` runs it, minus the debt table. */
const gate = (content: MuseumContent, patch: GatePatch = {}) =>
  validateContent(content, patch.bundles ?? BAKED_BUNDLES, patch.keys ?? DICTIONARY_KEYS, undefined, {
    dictionaries: patch.dictionaries ?? DICTIONARIES,
    keysCitedByCode: patch.keysCitedByCode ?? KEYS_CITED_BY_CODE,
  })
const accused = (issues: readonly ValidationIssue[], code: string) =>
  issues.filter((issue) => issue.code === code && issue.severity === 'error').map((issue) => issue.id)

const withRoom = (id: string, patch: (room: RoomData) => Partial<RoomData>): MuseumContent => ({
  ...MUSEUM,
  rooms: MUSEUM.rooms.map((room) => (room.id === id ? { ...room, ...patch(room) } : room)),
})

test('each validator the gate lacked fails a museum broken on purpose', () => {
  const authored = gate(MUSEUM)
  const quiet: string[] = []
  const noisy: string[] = []
  /** `code` is raised about `id` on the broken museum, and not on the authored one. */
  const proves = (code: string, id: string, broken: readonly ValidationIssue[]) => {
    if (!accused(broken, code).includes(id)) quiet.push(`${code} does not accuse "${id}"`)
    if (accused(authored, code).length > 0) noisy.push(`${code} accuses the authored museum: ${accused(authored, code).join(', ')}`)
  }

  // A lock nothing in the building carries: the player never meets it.
  proves(
    'lock-without-host',
    'office-drawer',
    gate(
      withRoom('office', (room) => ({
        containers: (room.containers ?? []).map(({ lockId: _, ...container }) => container),
      })),
    ),
  )

  // A keypad one digit short of its own answer.
  proves(
    'lock-digits-mismatch',
    'office-drawer',
    gate({
      ...MUSEUM,
      locks: MUSEUM.locks.map((lock) => (lock.kind === 'knowledge' ? { ...lock, digits: 3 } : lock)),
    }),
  )

  // A code resting on a fact nobody certified as one.
  proves(
    'knowledge-lock-fact-not-code',
    'office-drawer',
    gate({
      ...MUSEUM,
      facts: MUSEUM.facts.map((fact) =>
        fact.id === 'springfield-renaming' ? { ...fact, usedAsCode: false } : fact,
      ),
    }),
  )

  // The drawer is locked and the note inside it says it is not: the solver
  // would read the note without ever opening the drawer.
  proves(
    'document-lock-disagrees-with-container',
    'doc-predecessor',
    gate({
      ...MUSEUM,
      documents: MUSEUM.documents.map((doc) => {
        if (doc.id !== 'doc-predecessor') return doc
        const { lockId: _, ...unlocked } = doc
        return unlocked
      }),
    }),
  )

  // A cabinet opens by a code or by a key in the hand (L3), and by nothing
  // else the runtime has: a badge on one would be a touch that opens it with
  // no reader to hold the badge to. A breaker's lock is still a keypad or
  // nothing, and a lock on a doorway is never asked for at all.
  const badgeLock = { kind: 'badge', id: 'staff-reader', requires: 'indoor', mapLabelKey: 'lock.office-drawer.mapLabel' } as const
  const toolLock = {
    kind: 'tool',
    id: 'service-hatch',
    requires: 'service-key',
    consumesTool: false,
    mapLabelKey: 'lock.office-drawer.mapLabel',
  } as const
  const onCabinet = (lock: typeof badgeLock | typeof toolLock): MuseumContent => ({
    ...withRoom('holyoke', (room) => ({
      containers: (room.containers ?? []).map((container) =>
        container.id === 'holyoke-cabinet-a' ? { ...container, lockId: lock.id } : container,
      ),
    })),
    locks: [...MUSEUM.locks, lock],
  })
  proves('lock-host-kind-unsupported', 'holyoke-cabinet-a', gate(onCabinet(badgeLock)))
  // The same cabinet with a tool lock was this accusation until L3: it is a
  // cabinet the key opens now, and what is wrong with it is only that
  // nothing in this museum hands over the key.
  const keyed = gate(onCabinet(toolLock))
  if (accused(keyed, 'lock-host-kind-unsupported').length > 0) noisy.push('lock-host-kind-unsupported accuses a cabinet that takes a key')
  if (!accused(keyed, 'credential-unobtainable').includes('tool:service-key')) quiet.push('credential-unobtainable does not accuse a key nothing gives')
  proves(
    'lock-host-kind-unsupported',
    'holyoke-breaker',
    gate({ ...withRoom('holyoke', () => ({ powerLockId: toolLock.id })), locks: [...MUSEUM.locks, toolLock] }),
  )
  proves(
    'lock-host-kind-unsupported',
    'atrium-to-holyoke',
    gate(
      withRoom('atrium', (room) => ({
        portals: room.portals.map((portal) =>
          portal.id === 'atrium-to-holyoke' ? { ...portal, lockId: 'office-drawer' } : portal,
        ),
      })),
    ),
  )

  // The office pushed a metre into the atrium.
  proves(
    'room-overlap',
    'atrium+office',
    gate(withRoom('office', (room) => ({ origin: [room.origin[0] - 1, room.origin[1], room.origin[2]] }))),
  )

  // A print hung across the doorway to Wing 1; the same print above the door
  // head is a sign, and is left alone.
  const doorway = atrium.portals.find((portal) => portal.id === 'atrium-to-holyoke')
  const print = atrium.wallArt?.[0]
  assert.ok(doorway && print)
  const hung = (id: string, y: number) =>
    withRoom('atrium', (room) => ({
      wallArt: [
        ...(room.wallArt ?? []),
        { ...print, id, position: [print.position[0], y, doorway.position[2]], width: 1.2, height: 0.8 },
      ],
    }))
  proves('wall-item-over-opening', 'over-the-door', gate(hung('over-the-door', 1.5)))
  if (accused(gate(hung('above-the-door', doorway.height + 0.6)), 'wall-item-over-opening').length > 0) {
    noisy.push('wall-item-over-opening accuses a print above the door head')
  }
  // The wainscot panel beside that doorway stops three centimetres short of
  // it. Slid five along the wall, its baked trim is in the opening.
  const wainscot = atrium.kit.find(
    (placement) => placement.part === 'atrium-wall-bay-plain' && placement.position[2] === 0.45,
  )
  assert.ok(wainscot, 'the panel south of the Wing 1 doorway')
  const slid = withRoom('atrium', (room) => ({
    kit: room.kit.map((placement) =>
      placement === wainscot
        ? { ...placement, position: [placement.position[0], placement.position[1], 0.4] as const }
        : placement,
    ),
  }))
  proves('wall-item-over-opening', 'atrium/atrium-wall-bay-plain@-8.875,0,0.4', gate(slid))

  // Geometry that is baked, downloaded and placed nowhere.
  const kit = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit')
  assert.ok(kit)
  const withOrphan = BAKED_BUNDLES.map((bundle) =>
    bundle === kit ? { ...bundle, parts: [...bundle.parts, { ...kit.parts[0], name: 'orphan-crate' }] } : bundle,
  )
  const unusedKit = accused(gate(MUSEUM, { bundles: withOrphan }), 'kit-part-unused')
  if (!unusedKit.includes('orphan-crate')) quiet.push('kit-part-unused does not accuse "orphan-crate"')
  // What the runtime places without a line of content saying so is in use:
  // door leaves, the plaques over the doorways, the dedication panel.
  for (const part of [
    'door-leaf',
    'door-leaf-right',
    'wayfinding-plaque-navy',
    'wayfinding-plaque-green',
    'wayfinding-plaque-walnut',
    'dedication-plaque',
    'breaker-panel',
    'desk-radio',
    'archive-cabinet',
  ]) {
    if (unusedKit.includes(part)) noisy.push(`kit-part-unused accuses "${part}", which a room uses`)
  }

  // A breaker hung a finger's width out from the plaster. The atrium's own,
  // which stands a hand's width out over the wainscot, is the one accusation
  // the authored museum carries, and the debt table dates it.
  const proud = gate(
    withRoom('holyoke', (room) => {
      assert.ok(room.powerControl, 'the wing has a breaker')
      const [x, y, z] = room.powerControl.position
      return { powerControl: { ...room.powerControl, position: [x + 0.015, y, z] } }
    }),
  )
  if (!accused(proud, 'wall-fixture-off-the-wall').includes('holyoke-breaker')) {
    quiet.push('wall-fixture-off-the-wall does not accuse "holyoke-breaker"')
  }
  const offTheWall = accused(authored, 'wall-fixture-off-the-wall')
  if (offTheWall.join() !== 'atrium-breaker') {
    noisy.push(`wall-fixture-off-the-wall accuses the authored museum of: ${offTheWall.join(', ') || 'nothing'}`)
  }
  // The desk lamp is a control too, and stands on a desk in the middle of a room.
  if (accused(proud, 'wall-fixture-off-the-wall').includes('office-lamp-switch')) {
    noisy.push('wall-fixture-off-the-wall accuses a control that is on no wall')
  }

  // A breaker baked without its lens looks the same restored as dead; one
  // with a lens and no lever has nothing for the hand to throw. The lamp
  // shows its state by its own light and needs neither.
  const without = (suffix: string) =>
    BAKED_BUNDLES.map((bundle) =>
      bundle === kit
        ? { ...bundle, parts: bundle.parts.filter((part) => part.name !== `breaker-panel${suffix}`) }
        : bundle,
    )
  const lensless = gate(MUSEUM, { bundles: without('__led') })
  proves('power-control-without-state', 'atrium-breaker', lensless)
  proves('power-control-without-state', 'holyoke-breaker', lensless)
  if (accused(lensless, 'power-control-without-state').includes('office-lamp-switch')) {
    noisy.push('power-control-without-state accuses the lamp, which lights itself')
  }
  proves('power-control-node-missing', 'holyoke-breaker', gate(MUSEUM, { bundles: without('__lever') }))

  // Copy translated twice for a screen that does not exist.
  const unusedKeys = accused(
    gate(MUSEUM, { keys: new Set([...DICTIONARY_KEYS, 'ui.nobody.reads.this']) }),
    'i18n-key-unused',
  )
  if (!unusedKeys.includes('ui.nobody.reads.this')) quiet.push('i18n-key-unused does not accuse "ui.nobody.reads.this"')
  for (const key of ['ui.title', 'exhibit.ball-spalding.title', 'radio.hint.rest.curt', 'night.hour.8', 'prompt.clock.set', 'clock.set', 'prompt.examine']) {
    if (unusedKeys.includes(key)) noisy.push(`i18n-key-unused accuses "${key}", which the game shows`)
  }

  // The porter gives a compass bearing to a player who has no compass.
  const bearing = (locale: 'pt-BR' | 'en', key: string, text: string) => ({
    ...DICTIONARIES,
    [locale]: { ...DICTIONARIES[locale], [key]: text },
  })
  const spoken = 'radio.hint.atrium.curt'
  proves(
    'speech-uses-cardinal',
    spoken,
    gate(MUSEUM, { dictionaries: bearing('pt-BR', spoken, 'Átrio. Parede oeste. Câmbio.') }),
  )
  proves('speech-uses-cardinal', spoken, gate(MUSEUM, { dictionaries: bearing('en', spoken, 'Atrium. West wall. Over.') }))
  // A wall label may say where Springfield is; and "consulta" is not "sul".
  const harmless = gate(MUSEUM, {
    dictionaries: {
      ...bearing('pt-BR', 'exhibit.photo-gym.label', 'A fachada oeste do prédio.'),
      en: { ...DICTIONARIES.en, [spoken]: 'Atrium. The least you could do is look. Over.' },
    },
  })
  if (accused(harmless, 'speech-uses-cardinal').length > 0) {
    noisy.push('speech-uses-cardinal accuses a wall label, or a word that only contains a bearing')
  }

  assert.deepEqual(quiet, [], 'every broken museum is caught')
  assert.deepEqual(noisy, [], 'and the authored one is not accused of what it does not do')
})

test('a dated promise has no box, says so in the game, and falls due with its lot (L3)', () => {
  // What the house shows and does not let the player use yet, each with the
  // lot that pays it and the words the game says meanwhile.
  const promises = datedPromises(MUSEUM)
  assert.deepEqual(
    promises.map((promise) => `${promise.kind} ${promise.id} L${promise.untilLot} ${promise.noticeKey}`),
    [
      'device atrium-podium L11 device.atrium-podium.notice',
      'checklist notebook.todo.vault L12 notebook.todo.vault.note',
    ],
  )
  for (const promise of promises) {
    assert.ok(promise.untilLot > CONTENT_LOT, `${promise.id} is dated ahead`)
    for (const dictionary of [ptBR, en] as readonly Record<string, string>[]) {
      assert.ok(dictionary[promise.noticeKey ?? '']?.length > 0, `${promise.id} says something in every language`)
    }
  }
  assert.deepEqual(validateDeferred(MUSEUM, CONTENT_LOT), [])
  // Asked with no lot, nothing can be overdue; the rest is still asked.
  assert.deepEqual(validateDeferred(MUSEUM), [])

  type Item = NonNullable<NonNullable<MuseumContent['documents'][number]['pages']>[number]['items']>[number]
  const withVault = (patch: (item: Item) => Item): MuseumContent => ({
    ...MUSEUM,
    documents: MUSEUM.documents.map((doc) => ({
      ...doc,
      pages: doc.pages?.map((page) => ({
        ...page,
        items: page.items?.map((item) => (item.labelKey === 'notebook.todo.vault' ? patch(item) : item)),
      })),
    })),
  })
  const withPodium = (patch: Record<string, unknown>): MuseumContent =>
    withRoom('atrium', (room) => ({
      devices: (room.devices ?? []).map((device) => (device.id === 'atrium-podium' ? ({ ...device, ...patch } as typeof device) : device)),
    }))

  // The lot arrives and the thing is still only a promise: the date was one.
  assert.deepEqual(accused(validateDeferred(MUSEUM, 10), 'deferred-overdue'), [])
  assert.deepEqual(accused(validateDeferred(MUSEUM, 11), 'deferred-overdue'), ['atrium-podium'])
  assert.deepEqual(accused(validateDeferred(MUSEUM, 12), 'deferred-overdue').sort(), ['atrium-podium', 'notebook.todo.vault'])
  // And the gate asks it with the lot the debt table is judged at.
  const settledAt = (lot: number) =>
    validateContent(MUSEUM, BAKED_BUNDLES, DICTIONARY_KEYS, undefined, {
      dictionaries: DICTIONARIES,
      keysCitedByCode: KEYS_CITED_BY_CODE,
      knownDebt: { lines: debtOf('validate:content'), lot },
    })
  assert.deepEqual(accused(settledAt(CONTENT_LOT), 'deferred-overdue'), [])
  assert.deepEqual(accused(settledAt(11), 'deferred-overdue'), ['atrium-podium'])

  // A promise the game does not say: the player meets a thing with no answer.
  assert.deepEqual(
    accused(gate(withVault(({ noteKey: _, ...item }) => item)), 'deferred-without-notice'),
    ['notebook.todo.vault'],
  )
  assert.deepEqual(accused(gate(withPodium({ noticeKey: '' })), 'deferred-without-notice'), ['atrium-podium'])
  assert.deepEqual(accused(gate(MUSEUM), 'deferred-without-notice'), [])

  // A promise with a box: it would sit unticked beside its own "not tonight".
  assert.deepEqual(
    accused(gate(withVault((item) => ({ ...item, doneWhen: { powered: ['office'] } }))), 'checklist-deferred-with-box'),
    ['notebook.todo.vault'],
  )
  assert.deepEqual(accused(gate(MUSEUM), 'checklist-deferred-with-box'), [])
  // And a line with neither is what it always was: a box nothing ever ticks.
  assert.deepEqual(
    accused(gate(withVault(({ deferredUntilLot: _, ...item }) => item)), 'checklist-item-untickable').filter(
      (id) => id === 'notebook.todo.vault',
    ),
    ['notebook.todo.vault'],
  )
  // A line that waits to appear for something no play reaches is never read.
  assert.ok(
    accused(
      gate(withVault((item) => ({ ...item, appearsWhen: { catalogued: ['net-1897'] } }))),
      'checklist-item-untickable',
    ).includes('notebook.todo.vault'),
    'a line that never appears is accused',
  )
  // What it waits for is checked like any other condition.
  assert.deepEqual(
    accused(gate(withVault((item) => ({ ...item, appearsWhen: { locksOpened: ['no-such-lock'] } }))), 'condition-lock-missing'),
    ['no-such-lock'],
  )
  assert.deepEqual(
    accused(
      gate(withVault((item) => ({ ...item, counters: [{ of: { catalogued: ['no-such-piece'] } }] }))),
      'condition-exhibit-missing',
    ),
    ['no-such-piece'],
  )

  // The gate prints them on every run, soonest first, beside what is owed.
  const printed = formatKnownDebt([], promises).split('\n').filter((line) => /until L/.test(line))
  assert.equal(printed.length, 2)
  assert.match(printed[0], /until L11 +atrium-podium +device\.atrium-podium\.notice/)
  assert.match(printed[1], /until L12 +notebook\.todo\.vault +notebook\.todo\.vault\.note/)
  assert.equal(formatKnownDebt([]), '', 'with nothing owed and nothing promised, nothing is printed')
})

test('a condition, an effect or a trigger that points at nothing fails the gate (L2)', () => {
  // Each of these compiles, and fails without a word at runtime: a condition
  // naming a piece that was renamed never holds, an effect naming a lock that
  // does not exist opens nothing, and a trigger guarded by "still shut" fires
  // or not by the order the player did things in.
  const authored = gate(MUSEUM)
  const quiet: string[] = []
  const noisy: string[] = []
  const NEW_CODES = [
    'condition-exhibit-missing',
    'condition-hotspot-missing',
    'condition-door-missing',
    'condition-room-missing',
    'condition-credential-missing',
    'trigger-duplicate',
    'effect-target-missing',
    'gate-uses-negative-condition',
    'gate-uses-all-condition',
  ]
  const proves = (code: string, id: string, broken: readonly ValidationIssue[]) => {
    assert.ok(NEW_CODES.includes(code), code)
    if (!accused(broken, code).includes(id)) quiet.push(`${code} does not accuse "${id}"`)
  }
  for (const code of NEW_CODES) {
    if (accused(authored, code).length > 0) noisy.push(`${code} accuses the authored museum: ${accused(authored, code).join(', ')}`)
  }

  type Condition = NonNullable<MuseumContent['triggers']>[number]['when']
  type Effects = NonNullable<MuseumContent['triggers']>[number]['effects']
  const FLAG: Effects = [{ kind: 'set-flag', flag: 'made-for-the-test' }]
  const when = (condition: Condition): MuseumContent => ({
    ...MUSEUM,
    triggers: [{ id: 'made-for-the-test', when: condition, effects: FLAG }],
  })
  const doing = (effects: Effects): MuseumContent => ({
    ...MUSEUM,
    triggers: [{ id: 'made-for-the-test', when: { roomsVisited: ['atrium'] }, effects }],
  })
  const withUnlocks = (effects: Effects): MuseumContent => ({
    ...MUSEUM,
    exhibits: MUSEUM.exhibits.map((exhibit) => (exhibit.id === 'ball-spalding' ? { ...exhibit, unlocks: effects } : exhibit)),
  })
  const withOnOpen = (effects: Effects): MuseumContent => ({
    ...MUSEUM,
    locks: MUSEUM.locks.map((lock) => (lock.id === 'office-drawer' ? { ...lock, onOpen: effects } : lock)),
  })

  // --- what a condition names ----------------------------------------------
  proves('condition-exhibit-missing', 'ball-spaulding', gate(when({ catalogued: ['ball-spaulding'] })))
  proves('condition-hotspot-missing', 'portrait-morgan:signature', gate(when({ hotspotsSeen: ['portrait-morgan:signature'] })))
  // The detail without its piece is not how the save spells it.
  proves('condition-hotspot-missing', 'date', gate(when({ hotspotsSeen: ['date'] })))
  // A door is named by the portal that declares the leaf (DL2-1). The portal
  // facing it across the same opening is not a door, and is the easy mistake.
  proves('condition-door-missing', 'holyoke-shortcut', gate(when({ doorsReleased: ['holyoke-shortcut'] })))
  // A room the type allows and the house does not have yet: the compiler
  // takes `paris`, and the condition would simply never hold.
  proves('condition-room-missing', 'paris', gate(when({ roomsVisited: ['paris'] })))
  // Nothing in the museum hands out a badge: the condition would wait for good.
  proves('condition-credential-missing', 'badge:indoor', gate(when({ credentials: [{ kind: 'badge', id: 'indoor' }] })))
  // Inside a branch, and in every place a condition is asked from.
  proves('condition-exhibit-missing', 'in-a-branch', gate(when({ anyOf: [{ flags: ['a'] }, { anyOf: [{ catalogued: ['in-a-branch'] }] }] })))
  const asked = (condition: Condition) =>
    withRoom('office', (room) => ({
      devices: (room.devices ?? []).map((device) =>
        device.kind === 'radio'
          ? {
              ...device,
              calls: device.calls.map((call, index) => (index === 0 ? { ...call, when: condition } : call)),
              hints: device.hints.map((hint, index) => (index === 0 ? { ...hint, when: { anyOf: [condition] } } : hint)),
            }
          : device,
      ),
    }))
  proves('condition-exhibit-missing', 'asked-by-the-porter', gate(asked({ catalogued: ['asked-by-the-porter'] })))
  // A call and a hint that wait for a room nobody can visit: no other code says so.
  proves('condition-room-missing', 'paris', gate(asked({ roomsVisited: ['paris'] })))
  const listed: MuseumContent = {
    ...MUSEUM,
    documents: MUSEUM.documents.map((doc) => ({
      ...doc,
      pages: doc.pages?.map((page) => ({
        ...page,
        items: page.items?.map((item) => ({ ...item, doneWhen: { doorsReleased: ['asked-by-the-list'] } })),
      })),
    })),
  }
  proves('condition-door-missing', 'asked-by-the-list', gate(listed))

  // --- what an effect names, wherever the effect is written ------------------
  proves('effect-target-missing', 'no-such-lock', gate(doing([{ kind: 'open-lock', lockId: 'no-such-lock' }])))
  proves('effect-target-missing', 'cellar', gate(doing([{ kind: 'power-room', roomId: 'cellar' }])))
  proves('effect-target-missing', 'doc-nowhere', gate(doing([{ kind: 'reveal-document', documentId: 'doc-nowhere' }])))
  proves('effect-target-missing', 'from-a-piece', gate(withUnlocks([{ kind: 'reveal-document', documentId: 'from-a-piece' }])))
  proves('effect-target-missing', 'from-a-lock', gate(withOnOpen([{ kind: 'power-room', roomId: 'from-a-lock' }])))

  // --- triggers --------------------------------------------------------------
  const twice: MuseumContent = {
    ...MUSEUM,
    triggers: [
      { id: 'twice', when: { roomsVisited: ['atrium'] }, effects: FLAG },
      { id: 'twice', when: { roomsVisited: ['holyoke'] }, effects: FLAG },
    ],
  }
  proves('trigger-duplicate', 'twice', gate(twice))
  // An authored trigger under the name the compiler gives a piece's own effects.
  proves(
    'trigger-duplicate',
    'exhibit:ball-spalding:catalogued',
    gate({ ...withUnlocks(FLAG), triggers: [{ id: 'exhibit:ball-spalding:catalogued', when: {}, effects: FLAG }] }),
  )
  proves('gate-uses-negative-condition', 'made-for-the-test', gate(when({ locksClosed: ['office-drawer'] })))
  proves(
    'gate-uses-negative-condition',
    'made-for-the-test',
    gate(when({ anyOf: [{ flags: ['a'] }, { documentsUnread: ['doc-welcome'] }] })),
  )
  proves('gate-uses-all-condition', 'made-for-the-test', gate(when({ allCatalogued: true })))
  // A trigger that does both is told both, not one per run of the gate.
  const both = gate(when({ unpowered: ['atrium'], allRoomsPowered: true }))
  proves('gate-uses-negative-condition', 'made-for-the-test', both)
  proves('gate-uses-all-condition', 'made-for-the-test', both)
  // The same two questions are fine where nothing fires for good: the porter
  // asks "still shut?" and the checklist asks "all of them?" today.
  for (const code of ['gate-uses-negative-condition', 'gate-uses-all-condition']) {
    if (accused(gate(asked({ locksClosed: ['office-drawer'], allRoomsPowered: true })), code).length > 0) {
      noisy.push(`${code} accuses a radio call, which is asked again every time and fires nothing for good`)
    }
  }

  // --- and a museum that uses all of it properly is accused of none of it ----
  const sound = gate({
    ...MUSEUM,
    exhibits: MUSEUM.exhibits.map((exhibit) =>
      exhibit.id === 'ball-spalding'
        ? { ...exhibit, unlocks: [{ kind: 'grant-credential', credential: { kind: 'badge', id: 'indoor' } }] }
        : exhibit,
    ),
    locks: MUSEUM.locks.map((lock) =>
      lock.id === 'office-drawer'
        ? { ...lock, onOpen: [{ kind: 'set-flag', flag: 'drawer-open' }, { kind: 'reveal-document', documentId: 'doc-welcome' }] }
        : lock,
    ),
    triggers: [
      {
        id: 'sound',
        when: {
          catalogued: ['ball-spalding'],
          hotspotsSeen: ['portrait-morgan:date'],
          credentials: [{ kind: 'badge', id: 'indoor' }],
          flags: ['drawer-open'],
          roomsVisited: ['holyoke'],
          doorsReleased: ['atrium-from-holyoke-shortcut'],
          anyOf: [{ powered: ['atrium'] }, { locksOpened: ['office-drawer'], carried: ['office-radio'] }],
        },
        effects: [
          { kind: 'open-lock', lockId: 'office-drawer' },
          { kind: 'power-room', roomId: 'holyoke' },
          { kind: 'set-flag', flag: 'sound' },
        ],
      },
    ],
  })
  for (const code of NEW_CODES) {
    if (accused(sound, code).length > 0) noisy.push(`${code} accuses a sound museum: ${accused(sound, code).join(', ')}`)
  }

  assert.deepEqual(quiet, [], 'every broken museum is caught')
  assert.deepEqual(noisy, [], 'and a sound one is not accused of what it does not do')
})

test('the porter by milestone and the hour of the night: each rule of the gate, on a museum broken for it (L3)', () => {
  // Every one of these compiles and plays, and is wrong in a way nobody
  // sees in a new game: a call renamed under the migration that silences it
  // for old saves, a hint that points at a thing the house does not have, a
  // porter with nothing to say while there is still a term to sign, a night
  // that goes back, a line too long to read, an hour in digits.
  const authored = gate(MUSEUM)
  const quiet: string[] = []
  const noisy: string[] = []
  const CODES = [
    'legacy-save-call',
    'legacy-save-milestone',
    'radio-lapse-not-positive',
    'hint-points-to-nothing',
    'radio-hint-coverage',
    'night-clock-phrases',
    'night-milestone-not-positive',
    'night-milestone-count',
    'night-milestone-duplicate',
    'clock-without-title',
    'speech-line-too-long',
    'speech-hour-in-digits',
    'speech-token-unknown',
    'speech-mentions-missing',
    'speech-director-unintroduced',
  ]
  const proves = (code: string, id: string, broken: readonly ValidationIssue[]) => {
    assert.ok(CODES.includes(code) || code.startsWith('condition-'), code)
    if (!accused(broken, code).includes(id)) quiet.push(`${code} does not accuse "${id}"`)
  }
  const spares = (code: string, what: string, sound: readonly ValidationIssue[]) => {
    if (accused(sound, code).length > 0) noisy.push(`${code} accuses ${what}: ${accused(sound, code).join(', ')}`)
  }
  for (const code of CODES) spares(code, 'the authored museum', authored)

  type Radio = Extract<NonNullable<RoomData['devices']>[number], { readonly kind: 'radio' }>
  const withRadio = (patch: (radio: Radio) => Partial<Radio>): MuseumContent =>
    withRoom('office', (room) => ({
      devices: (room.devices ?? []).map((device) => (device.kind === 'radio' ? { ...device, ...patch(device) } : device)),
    }))
  const withCall = (id: string, patch: (call: Radio['calls'][number]) => Radio['calls'][number]) =>
    withRadio((radio) => ({ calls: radio.calls.map((call) => (call.id === id ? patch(call) : call)) }))
  const withHint = (index: number, patch: (hint: Radio['hints'][number]) => Radio['hints'][number]) =>
    withRadio((radio) => ({ hints: radio.hints.map((hint, position) => (position === index ? patch(hint) : hint)) }))

  // --- saves from before the Posse ---------------------------------------------
  // A call of the migration renamed in the content: old saves would hear it.
  proves('legacy-save-call', 'porter-hello', gate(withCall('porter-hello', (call) => ({ ...call, id: 'porter-greeting' }))))
  proves('legacy-save-call', 'porter-shortcut', gate(withCall('porter-shortcut', (call) => ({ ...call, id: 'porter-service-door' }))))
  // The door of the shortcut renamed: no save would be recognised as having used it.
  const SHORTCUT = 'atrium-from-holyoke-shortcut'
  proves(
    'legacy-save-milestone',
    SHORTCUT,
    gate(withRoom('atrium', (room) => ({ portals: room.portals.map((portal) => (portal.id === SHORTCUT ? { ...portal, id: 'atrium-service-door' } : portal)) }))),
  )

  // --- calls that lapse -----------------------------------------------------------
  proves(
    'radio-lapse-not-positive',
    'porter-atrium-service',
    gate(withCall('porter-atrium-service', (call) => ({ ...call, lapsesWhen: { unpowered: ['office'] } }))),
  )
  proves(
    'radio-lapse-not-positive',
    'porter-holyoke-lit',
    gate(withCall('porter-holyoke-lit', (call) => ({ ...call, lapsesWhen: { allCatalogued: true } }))),
  )
  // What ends a call, what an answer looks at and what a hint is not for are conditions like any other.
  proves('condition-room-missing', 'paris', gate(withCall('porter-atrium-service', (call) => ({ ...call, lapsesWhen: { powered: ['paris'] } }))))
  proves('condition-room-missing', 'vault', gate(withHint(0, (hint) => ({ ...hint, when: { roomsUnvisited: ['vault'] } }))))
  proves(
    'condition-room-missing',
    'tokyo',
    gate(
      withRadio((radio) => ({
        patience: radio.patience && {
          ...radio.patience,
          deadAir: radio.patience.deadAir.map((air) => (air.id === 'porter-air-rain' ? { ...air, when: { unpowered: ['tokyo'] } } : air)),
        },
      })),
    ),
  )

  // --- hints that point -------------------------------------------------------------
  proves('hint-points-to-nothing', 'atrium-braker', gate(withHint(1, (hint) => ({ ...hint, targetId: 'atrium-braker' }))))
  // A room is somewhere to be, not something to walk up to.
  proves('hint-points-to-nothing', 'holyoke', gate(withHint(2, (hint) => ({ ...hint, targetId: 'holyoke' }))))
  proves('hint-points-to-nothing', 'office-radio:hint-2', gate(withHint(1, ({ targetId: _, ...hint }) => hint)))
  // Each kind of thing a hint may point at, in the museum as it is.
  assert.deepEqual(
    radioEntry.device.hints.map((hint) => hint.targetId ?? null),
    ['office-notebook', 'atrium-breaker', 'holyoke-breaker', 'portrait-morgan', null],
  )
  spares('hint-points-to-nothing', 'a hint that points at a device, and one at a door', gate(withHint(0, (hint) => ({ ...hint, targetId: 'atrium-podium' }))))
  spares('hint-points-to-nothing', 'a hint that points at a door', gate(withHint(0, (hint) => ({ ...hint, targetId: SHORTCUT }))))

  // --- a porter with nothing left to say, and a term still to sign ---------------------
  // No term exists in the house until the lectern signs one; the rule is
  // asked of a house given one for the purpose. With the three rooms lit and
  // the drawer open, the porter's last hint is in force.
  const term = {
    id: 'termo-de-teste',
    titleKey: 'notebook.todo.heading',
    bodyKey: 'notebook.todo.heading',
    presentedWhen: {},
    when: { powered: ['office', 'atrium', 'holyoke'] },
    grants: 'teste-assinado',
    mentions: ['atrium-podium'],
  } as const
  const withTerm = (content: MuseumContent, patch: object = {}): MuseumContent => ({ ...content, terms: [{ ...term, ...patch }] })
  const uncovered = gate(withTerm(MUSEUM))
  proves('radio-hint-coverage', 'office-radio', uncovered)
  assert.match(
    uncovered.find((issue) => issue.code === 'radio-hint-coverage')?.message ?? '',
    /runs out of hints with "termo-de-teste" still to sign: in a save with .*power:holyoke.*lock:office-drawer/,
  )
  // A hint that holds until the term is signed, above the last: he has something to point at.
  const covered = withRadio((radio) => ({
    hints: [
      ...radio.hints.slice(0, -1),
      { when: { flagsUnset: ['teste-assinado'] }, targetId: 'atrium-podium', heightKeys: ['radio.hint.rest'], mentions: ['atrium-podium'] },
      ...radio.hints.slice(-1),
    ],
  }))
  spares('radio-hint-coverage', 'a radio with a hint for the term', gate(withTerm(covered)))
  // Signed, the night has nothing left: the last hint is the right one. Signed
  // is the signature in the save (`termsSigned`), made at a desk: the lectern
  // of the hall, here, made one for the purpose. Until this slice the rule
  // read the flag, which a trigger of the test set by itself; a house whose
  // flag is set and whose term nobody signed is still owed the signature.
  const lectern = MUSEUM.rooms.find((room) => room.id === 'atrium')?.kit.find((placement) => placement.part === 'atrium-lectern')
  assert.ok(lectern, 'the hall has a lectern to make a desk of')
  const withDesk = (content: MuseumContent): MuseumContent => ({
    ...content,
    rooms: content.rooms.map((room) =>
      room.id === 'atrium'
        ? {
            ...room,
            kit: room.kit.filter((placement) => placement !== lectern),
            devices: [
              ...(room.devices ?? []),
              {
                kind: 'signing-desk' as const,
                id: 'atrium-lectern',
                part: 'atrium-lectern' as const,
                position: lectern.position,
                rotationY: lectern.rotationY,
                titleKey: 'device.atrium-podium.title',
                emptyNoticeKey: 'device.atrium-podium.notice',
                termIds: [term.id],
                holdSeconds: 1.2,
              },
            ],
          }
        : room,
    ),
  })
  const signed = withDesk(withTerm(covered))
  assert.deepEqual(simulateProgress(signed).final.termsSigned, [term.id], 'the exhaustive player signs at the lectern')
  spares('radio-hint-coverage', 'a house whose term is signed, with a hint for it until then', gate(signed))
  // With the desk and no hint for it, there is a moment the rule is for: the
  // rooms lit, the drawer open, the term on the lectern, and a porter who
  // says there is nothing left to do.
  proves('radio-hint-coverage', 'office-radio', gate(withDesk(withTerm(MUSEUM))))
  // And a flag that sets itself is not a signature.
  const flagOnly: MuseumContent = {
    ...withTerm(MUSEUM),
    triggers: [{ id: 'flag-for-the-test', when: term.when, effects: [{ kind: 'set-flag', flag: 'teste-assinado' }] }],
  }
  proves('radio-hint-coverage', 'office-radio', gate(flagOnly))
  // A term nobody can sign in this build is owed no hint (it is another accusation's to make).
  spares('radio-hint-coverage', 'a term that cannot be signed', gate(withTerm(MUSEUM, { when: { catalogued: ['net-1897'] } })))
  // And what a term asks is checked like any other condition.
  proves('condition-room-missing', 'rewrite', gate(withTerm(MUSEUM, { when: { powered: ['rewrite'] } })))
  proves('speech-mentions-missing', 'atrium-lectern', gate(withTerm(MUSEUM, { mentions: ['atrium-lectern'] })))

  // --- the hour of the night ---------------------------------------------------------
  const night = MUSEUM.nightClock
  assert.ok(night)
  const withNight = (patch: Partial<typeof night>): MuseumContent => ({ ...MUSEUM, nightClock: { ...night, ...patch } })
  const withMilestone = (id: string, milestone: object): MuseumContent =>
    withNight({ milestones: night.milestones.map((candidate) => (candidate.id === id ? ({ id, ...milestone } as typeof candidate) : candidate)) })
  proves('night-clock-phrases', 'nightClock', gate(withNight({ phraseKeys: night.phraseKeys.slice(1) })))
  proves('night-clock-phrases', 'nightClock', gate(withNight({ phraseKeys: [...night.phraseKeys, 'night.hour.8'] })))
  // A milestone that holds until something is done: the night would go back.
  proves('night-milestone-not-positive', 'atrium', gate(withMilestone('atrium', { when: { unpowered: ['atrium'] } })))
  proves('night-milestone-not-positive', 'drawer', gate(withMilestone('drawer', { when: { locksClosed: ['office-drawer'] } })))
  // "Every room": the day a wing opens, a point is taken back.
  proves('night-milestone-not-positive', 'holyoke', gate(withMilestone('holyoke', { when: { allRoomsPowered: true } })))
  proves('night-milestone-count', 'catalogue-12', gate(withMilestone('catalogue-12', { cataloguedAtLeast: 13, of: MUSEUM.exhibits.map((exhibit) => exhibit.id) })))
  proves('night-milestone-count', 'catalogue-3', gate(withMilestone('catalogue-3', { cataloguedAtLeast: 0, of: ['ball-spalding'] })))
  proves('condition-exhibit-missing', 'no-such-piece', gate(withMilestone('catalogue-3', { cataloguedAtLeast: 1, of: ['no-such-piece'] })))
  proves('condition-lock-missing', 'no-such-lock', gate(withMilestone('drawer', { when: { locksOpened: ['no-such-lock'] } })))
  proves('night-milestone-duplicate', 'lamp', gate(withNight({ milestones: [...night.milestones.slice(0, -1), night.milestones[0]] })))
  // A clock that can be set and has no name: its prompt would have nothing to call it.
  proves(
    'clock-without-title',
    'office-clock',
    gate(
      withRoom('office', (room) => ({
        devices: (room.devices ?? []).map((device) => {
          if (device.kind !== 'clock') return device
          const { titleKey: _, ...untitled } = device
          return untitled
        }),
      })),
    ),
  )
  // The flag a clock sets is set, and read by the clock: neither loose end is raised.
  spares('flag-never-read', 'the flag the clock sets', authored)
  // One flag is waited for and set by nothing: the pump's, whose absence the
  // rain in the dead air asks for. Nothing sets it before the vault's lot,
  // and the debt table dates it there.
  assert.deepEqual(accused(authored, 'flag-never-set'), ['basement-drained'])
  assert.deepEqual(
    debtOf('validate:content').filter((line) => line.code === 'flag-never-set').map((line) => `${line.id} L${line.untilLot}`),
    ['basement-drained L12'],
  )
  // The same flag waited for by its presence is the same loose end.
  proves('condition-room-missing', 'iron-sand', gate(withHint(0, (hint) => ({ ...hint, when: { unpowered: ['iron-sand'] } }))))
  assert.ok(
    accused(gate(withHint(0, (hint) => ({ ...hint, when: { flagsUnset: ['never-set-by-anything'] } }))), 'flag-never-set').includes('never-set-by-anything'),
    'a hint that waits for the absence of a flag nothing sets',
  )

  // --- what is said --------------------------------------------------------------------
  const said = (locale: 'pt-BR' | 'en', key: string, text: string) => ({ dictionaries: { ...DICTIONARIES, [locale]: { ...DICTIONARIES[locale], [key]: text } } })
  const long = (length: number) => 'x'.repeat(length)
  // A call and a height of a hint fit in 130; an answer of his patience and a curt hint in 110.
  proves('speech-line-too-long', 'radio.call.hello.2', gate(MUSEUM, said('pt-BR', 'radio.call.hello.2', long(131))))
  proves('speech-line-too-long', 'radio.hint.drawer.how', gate(MUSEUM, said('en', 'radio.hint.drawer.how', long(131))))
  proves('speech-line-too-long', 'radio.patience.t1.ready', gate(MUSEUM, said('pt-BR', 'radio.patience.t1.ready', long(111))))
  proves('speech-line-too-long', 'radio.patience.t3.torch.close', gate(MUSEUM, said('en', 'radio.patience.t3.torch.close', long(111))))
  proves('speech-line-too-long', 'radio.hint.atrium.curt', gate(MUSEUM, said('pt-BR', 'radio.hint.atrium.curt', long(111))))
  proves('speech-line-too-long', 'radio.deadAir.rain', gate(MUSEUM, said('en', 'radio.deadAir.rain', long(111))))
  spares('speech-line-too-long', 'a call of 130 characters', gate(MUSEUM, said('pt-BR', 'radio.call.hello.2', long(130))))
  spares('speech-line-too-long', 'a height of a hint of 130 characters', gate(MUSEUM, said('pt-BR', 'radio.hint.drawer.how', long(130))))
  spares('speech-line-too-long', 'an answer of 110 characters', gate(MUSEUM, said('pt-BR', 'radio.patience.t1.ready', long(110))))
  spares('speech-line-too-long', 'a wall label, which is not said', gate(MUSEUM, said('pt-BR', 'exhibit.photo-gym.label', long(400))))
  // The longest lines of the house, for the record: all under their measure.
  const longest = (keys: readonly string[]) => Math.max(...keys.flatMap((key) => [ptBR, en].map((dictionary) => (dictionary as Record<string, string>)[key].length)))
  assert.ok(longest(radioEntry.device.calls.flatMap((call) => call.lineKeys)) <= 130)
  assert.ok(longest(radioEntry.device.hints.flatMap((hint) => hint.heightKeys)) <= 130)
  assert.ok(longest(radioEntry.device.hints.flatMap((hint) => hint.curtLineKeys ?? [])) <= 110)

  // Nobody says an hour of this night in a fixed line.
  proves('speech-hour-in-digits', 'radio.call.holyoke.1', gate(MUSEUM, said('pt-BR', 'radio.call.holyoke.1', 'Ala 1 acesa. São 21h40. Câmbio.')))
  proves('speech-hour-in-digits', 'radio.call.holyoke.1', gate(MUSEUM, said('en', 'radio.call.holyoke.1', "Wing 1 is lit. It's 9:40 pm. Over.")))
  // The recording says its hours in words, and a wing's number is not an hour.
  spares('speech-hour-in-digits', 'hours said in words', gate(MUSEUM, said('pt-BR', 'radio.call.holyoke.1', 'Ala 1 acesa. Nosso horário é das nove às seis.')))
  // The one token a line may carry is the hour, and only in a content that has a night clock.
  proves('speech-token-unknown', 'radio.call.holyoke.1', gate(MUSEUM, said('pt-BR', 'radio.call.holyoke.1', 'Ala 1 acesa, {nome}. Câmbio.')))
  spares('speech-token-unknown', 'a line that says {hora}', gate(MUSEUM, said('pt-BR', 'radio.call.holyoke.1', 'Ala 1 acesa. {hora}. Câmbio.')))
  const { nightClock: _noClock, ...clockless } = MUSEUM
  proves('speech-token-unknown', 'radio.call.holyoke.1', gate(clockless, said('pt-BR', 'radio.call.holyoke.1', 'Ala 1 acesa. {hora}. Câmbio.')))

  // What a call, a hint or a line of the list sends the player to is in the build.
  proves('speech-mentions-missing', 'atrium-lectern', gate(withCall('porter-holyoke-lit', (call) => ({ ...call, mentions: ['holyoke', 'atrium-lectern'] }))))
  proves('speech-mentions-missing', 'office-safe', gate(withHint(3, (hint) => ({ ...hint, mentions: [...hint.mentions, 'office-safe'] }))))
  // The portal facing a door across its opening is not the door.
  proves('speech-mentions-missing', 'holyoke-shortcut', gate(withCall('porter-shortcut', (call) => ({ ...call, mentions: ['holyoke-shortcut'] }))))
  const listing = (mentions: readonly string[]): MuseumContent => ({
    ...MUSEUM,
    documents: MUSEUM.documents.map((doc) => ({
      ...doc,
      pages: doc.pages?.map((page) => ({ ...page, items: page.items?.map((item) => (item.labelKey === 'notebook.todo.power' ? { ...item, mentions } : item)) })),
    })),
  })
  proves('speech-mentions-missing', 'paris', gate(listing(['office', 'atrium', 'holyoke', 'paris'])))
  // Every kind of thing that can be mentioned, each by one the house has.
  spares(
    'speech-mentions-missing',
    'a room, a piece, a paper, a lock, a container, a device, a breaker and a door',
    gate(listing(['holyoke', 'net-1897', 'doc-halstead', 'office-drawer', 'holyoke-cabinet-b', 'atrium-podium', 'office-lamp-switch', SHORTCUT])),
  )

  // Whoever names Helena says who she is: the line as it was before L3, in each language.
  proves('speech-director-unintroduced', 'radio.patience.t4.dark.close', gate(MUSEUM, said('pt-BR', 'radio.patience.t4.dark.close', '…Só pra Helena, talvez.')))
  proves('speech-director-unintroduced', 'radio.patience.t4.dark.close', gate(MUSEUM, said('en', 'radio.patience.t4.dark.close', '…Except Helena, maybe.')))
  spares('speech-director-unintroduced', 'the notebook, where she signs as the director herself', gate(MUSEUM, said('pt-BR', 'notebook.welcome.postscript', 'Helena mandou um abraço.')))

  assert.deepEqual(quiet, [], 'every broken museum is caught')
  assert.deepEqual(noisy, [], 'and a sound one is not accused of what it does not do')
})

// ---------------------------------------------------------------------------
// The office answers (L3, F3): a key that is spent, credentials as data, a
// door that swings, a thing that speaks
// ---------------------------------------------------------------------------

const SERVICE_KEY = { kind: 'tool', id: 'service-key' } as const
const SAFE_LOCK = {
  kind: 'tool',
  id: 'office-safe',
  requires: 'service-key',
  consumesTool: true,
  mapLabelKey: 'lock.office-drawer.mapLabel',
} as const
/**
 * The chain the Posse will have, on the museum as it is: the drawer hands
 * over a key, the key is declared, and the iron safe leaves the furniture to
 * be a container that key is spent on. None of it is in the real content
 * until the slice that brings the Book it guards.
 */
const withSafe = (patch: { readonly container?: object; readonly content?: Partial<MuseumContent> } = {}): MuseumContent => ({
  ...withRoom('office', (room) => ({
    kit: room.kit.filter((placement) => placement.part !== 'office-safe'),
    containers: [
      ...(room.containers ?? []),
      {
        id: 'office-safe',
        part: 'office-safe',
        position: [2.55, 0, 2.45],
        rotationY: -Math.PI / 2,
        titleKey: 'container.office.title',
        lockId: SAFE_LOCK.id,
        ...patch.container,
      },
    ],
  })),
  locks: [
    ...MUSEUM.locks.map((lock) =>
      lock.id === 'office-drawer' ? { ...lock, onOpen: [{ kind: 'grant-credential', credential: SERVICE_KEY }] } : lock,
    ),
    SAFE_LOCK,
  ],
  credentials: [{ credential: SERVICE_KEY, titleKey: 'container.office.title', icon: 'key' }],
  ...patch.content,
})

test('a key that is spent, a credential that is data and a door on a hinge: each rule of the gate, on a museum broken for it (L3)', () => {
  const authored = gate(MUSEUM)
  const sound = gate(withSafe())
  const quiet: string[] = []
  const noisy: string[] = []
  const CODES = [
    'lock-host-kind-unsupported',
    'consumable-multi-consumer',
    'container-node-missing',
    'credential-undeclared',
    'credential-unused',
    'credential-orphan',
    'credential-unobtainable',
    'lock-unopenable',
  ]
  const proves = (code: string, id: string, broken: readonly ValidationIssue[]) => {
    assert.ok(CODES.includes(code), code)
    if (!accused(broken, code).includes(id)) quiet.push(`${code} does not accuse "${id}"`)
  }
  const spares = (code: string, what: string, issues: readonly ValidationIssue[]) => {
    if (accused(issues, code).length > 0) noisy.push(`${code} accuses ${what}: ${accused(issues, code).join(', ')}`)
  }
  // The museum as it is has no key, no safe and no credential yet (they come
  // with the Book they lead to), and is accused of none of this. Nor is the
  // museum with the whole chain in it: a tool lock on a cabinet, opened by a
  // key that an open drawer gives and the content declares.
  assert.deepEqual(MUSEUM.credentials ?? [], [], 'the list of credentials is data, and empty until a lock asks for one')
  assert.ok(MUSEUM.locks.every((lock) => lock.kind === 'knowledge'), 'no lock of the house takes a key yet')
  for (const code of CODES) {
    spares(code, 'the authored museum', authored)
    spares(code, 'a museum with a drawer that gives a declared key and a safe that takes it', sound)
  }
  // And that museum can be played to the open safe: the key is obtainable
  // and its lock opens.
  const played = simulateProgress(withSafe()).final
  if (played.credentials.join() !== 'tool:service-key') quiet.push('the exhaustive player is not handed the key by the drawer')
  if (!played.locksOpened.includes('office-safe')) quiet.push('the exhaustive player does not open the safe with the key from the drawer')

  // --- credentials are data ----------------------------------------------------
  // Given by the drawer, asked by the safe, and in no list: the HUD would
  // have no name to announce it by.
  proves('credential-undeclared', 'tool:service-key', gate(withSafe({ content: { credentials: [] } })))
  const { credentials: _undeclared, ...listless } = withSafe()
  proves('credential-undeclared', 'tool:service-key', gate(listless))
  // Asked by a lock and given by nothing is undeclared too (and unobtainable, as before).
  proves('credential-undeclared', 'badge:indoor', gate({ ...withSafe(), locks: [...withSafe().locks, { kind: 'badge', id: 'staff-reader', requires: 'indoor', mapLabelKey: 'lock.office-drawer.mapLabel' }] }))
  // Declared, and nothing gives it or asks for it: a name for a thing the house does not have.
  proves('credential-unused', 'tool:service-key', gate({ ...MUSEUM, credentials: [{ credential: SERVICE_KEY, titleKey: 'container.office.title', icon: 'key' }] }))
  proves(
    'credential-unused',
    'medallion:curator',
    gate(withSafe({ content: { credentials: [...(withSafe().credentials ?? []), { credential: { kind: 'medallion', id: 'curator' }, titleKey: 'container.office.title', icon: 'medallion' }] } })),
  )
  // A credential a condition waits for is asked for: declared, it is in use.
  const waited = withSafe()
  spares(
    'credential-unused',
    'a credential only a condition asks for',
    gate({
      ...MUSEUM,
      locks: waited.locks.filter((lock) => lock.id !== SAFE_LOCK.id),
      credentials: waited.credentials,
      triggers: [{ id: 'key-in-hand', when: { credentials: [SERVICE_KEY] }, effects: [{ kind: 'set-flag', flag: 'clock-set' }] }],
    }),
  )

  // --- a key that is spent has one lock (V3) -------------------------------------
  // Spent is "its lock is open": with two locks the key would be spent by
  // the first and still asked for by the second.
  const second = (consumesTool: boolean): MuseumContent => {
    const base = withSafe()
    return {
      ...base,
      rooms: base.rooms.map((room) =>
        room.id === 'holyoke'
          ? { ...room, containers: (room.containers ?? []).map((container) => (container.id === 'holyoke-cabinet-b' ? { ...container, lockId: 'service-hatch' } : container)) }
          : room,
      ),
      documents: base.documents.map((doc) => (doc.containerId === 'holyoke-cabinet-b' ? { ...doc, lockId: 'service-hatch' } : doc)),
      locks: [...base.locks, { kind: 'tool', id: 'service-hatch', requires: 'service-key', consumesTool, mapLabelKey: 'lock.office-drawer.mapLabel' }],
    }
  }
  proves('consumable-multi-consumer', 'tool:service-key', gate(second(false)))
  proves('consumable-multi-consumer', 'tool:service-key', gate(second(true)))
  if (!/"office-safe".*"service-hatch"/.test(gate(second(false)).find((issue) => issue.code === 'consumable-multi-consumer')?.message ?? '')) {
    quiet.push('consumable-multi-consumer does not name every lock that asks for the key')
  }
  // A tool that is not spent may open as many locks as it likes.
  const shared = second(false)
  spares(
    'consumable-multi-consumer',
    'a key that is not spent, on two locks',
    gate({ ...shared, locks: shared.locks.map((lock) => (lock.id === SAFE_LOCK.id ? { ...lock, consumesTool: false } : lock)) }),
  )

  // --- a door on a hinge, and what stands behind it -------------------------------
  // The recipe of the safe bakes a body and its hardware today, and no door:
  // a container that swings one needs the nodes, by name.
  const hinged = { nodePrefix: 'door', hingeAt: [0.3, 0.25], openAngle: -1.75 }
  proves('container-node-missing', 'office-safe', gate(withSafe({ container: { door: hinged } })))
  proves('container-node-missing', 'office-safe', gate(withSafe({ container: { contents: [{ node: 'papers' }] } })))
  const missingNodes = gate(withSafe({ container: { door: hinged, contents: [{ node: 'papers' }] } }))
    .filter((issue) => issue.code === 'container-node-missing')
    .map((issue) => issue.message)
    .join(' | ')
  if (!/office-safe__door.*\|.*office-safe__papers/.test(missingNodes)) quiet.push('container-node-missing does not name each missing node')
  // A family that is baked answers for a door or for contents: the prefix
  // takes every node that begins with it, a content its one node.
  spares('container-node-missing', 'a door made of a baked family', gate(withSafe({ container: { door: { ...hinged, nodePrefix: 'hardware' } } })))
  spares('container-node-missing', 'contents that are a baked node', gate(withSafe({ container: { contents: [{ node: 'hardware' }] } })))
  // With the node there, the same door passes.
  const kit = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit')
  assert.ok(kit)
  const withDoorBaked = BAKED_BUNDLES.map((bundle) =>
    bundle === kit ? { ...bundle, parts: [...bundle.parts, { ...kit.parts[0], name: 'office-safe__door-hardware' }] } : bundle,
  )
  spares('container-node-missing', 'a door whose nodes the bake has', gate(withSafe({ container: { door: hinged } }), { bundles: withDoorBaked }))

  assert.deepEqual(quiet, [], 'every broken museum is caught')
  assert.deepEqual(noisy, [], 'and a sound one is not accused of what it does not do')
})

type Voice = Extract<NonNullable<RoomData['devices']>[number], { readonly kind: 'voice' }>

test('a thing that speaks: the telephone answers with a dead line, and each rule of the gate bites a voice broken for it (L3)', () => {
  // The telephone left the furniture: it is a device now, it answers in the
  // dark (a dead line needs no mains), and what it says is its own line.
  const telephone = (office.devices ?? []).find((device): device is Voice => device.kind === 'voice')
  assert.ok(telephone, 'the office has a telephone that speaks')
  assert.equal(telephone.id, 'office-telephone')
  assert.equal(telephone.part, 'desk-telephone')
  assert.ok(!office.kit.some((placement) => placement.part === 'desk-telephone'), 'and it is not furniture as well')
  assert.equal(telephone.poweredBy, undefined)
  assert.deepEqual(telephone.utterances, [{ when: {}, lineKeys: ['device.office-telephone.dead'] }])
  assert.equal(ptBR[telephone.utterances[0].lineKeys![0] as 'device.office-telephone.dead'], 'Linha muda.')
  assert.equal(en['device.office-telephone.dead'], 'The line is dead.')
  assert.deepEqual([ptBR['device.office-telephone.title'], en['device.office-telephone.title']], ['Telefone', 'Telephone'])
  assert.deepEqual([ptBR['device.office-telephone.prompt'], en['device.office-telephone.prompt']], ['Discar', 'Dial'])
  // No recording exists in the house yet: the one that does arrives with the
  // answering machine.
  assert.ok(MUSEUM.documents.every((doc) => doc.lineKeys === undefined), 'no document of the house is a transcript yet')

  const authored = gate(MUSEUM)
  const quiet: string[] = []
  const noisy: string[] = []
  const CODES = ['voice-silent', 'voice-recording-missing', 'device-node-missing']
  const proves = (code: string, id: string, broken: readonly ValidationIssue[]) => {
    if (!accused(broken, code).includes(id)) quiet.push(`${code} does not accuse "${id}"`)
  }
  const spares = (code: string, what: string, issues: readonly ValidationIssue[]) => {
    if (accused(issues, code).length > 0) noisy.push(`${code} accuses ${what}: ${accused(issues, code).join(', ')}`)
  }
  for (const code of CODES) spares(code, 'the authored museum', authored)

  const withVoice = (patch: Partial<Voice>, content: Partial<MuseumContent> = {}): MuseumContent => ({
    ...withRoom('office', (room) => ({
      devices: (room.devices ?? []).map((device) => (device.kind === 'voice' ? { ...device, ...patch } : device)),
    })),
    ...content,
  })
  /** A recording made for the purpose: a transcript the telephone plays. */
  const tape = (patch: object = {}) => ({
    id: 'doc-test-tape',
    era: 'office',
    kind: 'oral-history',
    titleKey: 'document.welcome.title',
    bodyKey: 'document.welcome.summary',
    containerId: 'office-telephone',
    lineKeys: ['radio.call.hello.1', 'radio.call.hello.3'],
    ...patch,
  })
  const playing = (patch: object = {}, voice: Partial<Voice> = {}) =>
    withVoice({ utterances: [{ when: {}, documentId: 'doc-test-tape' }], ...voice }, { documents: [...MUSEUM.documents, tape(patch)] as MuseumContent['documents'] })

  // --- it always has something to say -----------------------------------------------
  proves('voice-silent', 'office-telephone', gate(withVoice({ utterances: [] })))
  // The last one waits for something: on a night that has not got there, E answers with nothing.
  proves('voice-silent', 'office-telephone', gate(withVoice({ utterances: [{ when: { powered: ['atrium'] }, lineKeys: ['device.office-telephone.dead'] }] })))
  // One that is neither a line nor a recording, in either of the ways to write that.
  proves('voice-silent', 'office-telephone', gate(withVoice({ utterances: [{ when: {} }] as unknown as Voice['utterances'] })))
  proves('voice-silent', 'office-telephone', gate(withVoice({ utterances: [{ when: {}, lineKeys: [] }] })))
  spares('voice-silent', 'a voice that says one thing while the hall is dark and another after', gate(withVoice({ utterances: [{ when: { unpowered: ['atrium'] }, lineKeys: ['device.office-telephone.dead'] }, ...telephone.utterances] })))
  // What an utterance asks is a condition like any other.
  if (!accused(gate(withVoice({ utterances: [{ when: { powered: ['paris'] }, lineKeys: ['device.office-telephone.dead'] }, ...telephone.utterances] })), 'condition-room-missing').includes('paris')) {
    quiet.push('condition-room-missing does not accuse an utterance that waits for a room the house does not have')
  }

  // --- a recording is a document with a transcript, filed under the device ------------
  for (const code of [...CODES, 'document-unreadable', 'speech-line-too-long']) spares(code, 'a telephone that plays a recording of its own', gate(playing()))
  assert.ok(simulateProgress(playing()).final.documentsRead.includes('doc-test-tape'), 'the exhaustive player hears the recording out, and it is filed')
  proves('voice-recording-missing', 'doc-no-such-tape', gate(withVoice({ utterances: [{ when: {}, documentId: 'doc-no-such-tape' }] })))
  // A paper is not a recording: it has no lines to say.
  proves('voice-recording-missing', 'doc-halstead', gate(withVoice({ utterances: [{ when: {}, documentId: 'doc-halstead' }] })))
  proves('voice-recording-missing', 'doc-test-tape', gate(playing({ lineKeys: [] })))
  // A transcript filed under something else is somebody else's to play.
  proves('voice-recording-missing', 'doc-test-tape', gate(playing({ containerId: 'office-cabinet' })))
  // A line of a recording is a subtitle too, and fits like one.
  const said = (locale: 'pt-BR' | 'en', key: string, text: string) => ({ dictionaries: { ...DICTIONARIES, [locale]: { ...DICTIONARIES[locale], [key]: text } } })
  if (!accused(gate(playing({ lineKeys: ['radio.call.hello.1', 'notebook.welcome.letter'] })), 'speech-line-too-long').includes('notebook.welcome.letter')) {
    quiet.push('speech-line-too-long does not accuse a line of a recording that is a whole letter')
  }

  // --- its own lines are spoken lines ---------------------------------------------------
  const own = 'device.office-telephone.dead'
  if (!accused(gate(MUSEUM, said('pt-BR', own, 'x'.repeat(131))), 'speech-line-too-long').includes(own)) quiet.push('speech-line-too-long does not read what a voice says')
  if (!accused(gate(MUSEUM, said('en', own, 'The west line is dead.')), 'speech-uses-cardinal').includes(own)) quiet.push('speech-uses-cardinal does not read what a voice says')
  // «A line is dead because of the storm» is said by something that has not looked at the night.
  if (!accused(gate(MUSEUM, said('pt-BR', own, 'Linha muda. É a tempestade.')), 'speech-night-state-unconditional').includes(own)) {
    quiet.push('speech-night-state-unconditional does not read what a voice says')
  }
  spares('speech-line-too-long', 'the dead line', authored)

  // --- a lamp that blinks needs a lens ------------------------------------------------------
  // The telephone has none, and asks for none; a voice that shows a waiting
  // message does, and the recipe of the telephone bakes no `__led`.
  proves('device-node-missing', 'office-telephone', gate(playing({}, { messageLamp: true })))
  const kit = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit')
  assert.ok(kit)
  const withLens = BAKED_BUNDLES.map((bundle) =>
    bundle === kit ? { ...bundle, parts: [...bundle.parts, { ...kit.parts[0], name: 'desk-telephone__led' }] } : bundle,
  )
  spares('device-node-missing', 'a voice whose lamp the bake has', gate(playing({}, { messageLamp: true }), { bundles: withLens }))
  // Mains that the house does not have feed nothing.
  if (!accused(gate(withVoice({ poweredBy: 'tokyo' })), 'device-room-missing').length) quiet.push('device-room-missing does not accuse a voice fed by a room the house does not have')

  assert.deepEqual(quiet, [], 'every broken museum is caught')
  assert.deepEqual(noisy, [], 'and a sound one is not accused of what it does not do')
})

test('what the runtime places by itself is what the validator counts as used', () => {
  // A mount type and a door style become kit recipes in one table
  // (`runtimePlacedParts.ts`), read by the component that draws them and by
  // the validator that counts them. This used to be four lines of source
  // matched as text, which a formatter could fail and a real change could
  // pass; it is the validator's behaviour now.
  const unused = (content: MuseumContent) => accused(gate(content), 'kit-part-unused')
  const authored = unused(MUSEUM)

  // No exhibit of the house stands on a plinth, a table or a tower today, so
  // those recipes are accused (and dated). One exhibit given the mount is
  // what takes each of them off the list.
  const [first] = MUSEUM.exhibits
  const mounted = (mount: ExhibitMount): MuseumContent => ({
    ...MUSEUM,
    exhibits: MUSEUM.exhibits.map((exhibit) => (exhibit === first ? { ...exhibit, mount } : exhibit)),
  })
  const drawing = (Object.keys(MOUNT_PARTS) as ExhibitMount[]).filter((mount) => mountPartNames(mount).length > 0)
  assert.deepEqual(drawing.sort(), ['plinth', 'vitrine-table', 'vitrine-tower'])
  assert.deepEqual(mountPartNames('vitrine-table'), ['vitrine-table', 'vitrine-glass'], 'the table and its hood')
  for (const mount of drawing) {
    const after = unused(mounted(mount))
    for (const part of mountPartNames(mount)) {
      assert.ok(authored.includes(part), `"${part}" is placed by nothing but a ${mount} mount`)
      assert.ok(!after.includes(part), `an exhibit on a ${mount} puts "${part}" in use`)
    }
  }
  for (const mount of ['wall', 'case-wall', 'floor'] as const) {
    assert.deepEqual(unused(mounted(mount)), authored, `a ${mount} mount draws nothing of the kit`)
  }

  // The leaves are in use because a doorway declares a door; without one
  // they are dead weight.
  const doorless: MuseumContent = {
    ...MUSEUM,
    rooms: MUSEUM.rooms.map((room) => ({
      ...room,
      portals: room.portals.map(({ transitionDoor: _, ...portal }) => portal),
    })),
  }
  const leaves = transitionDoorPartNames('double-panel')
  assert.deepEqual([...leaves], ['door-leaf', 'door-leaf-right'])
  for (const leaf of leaves) {
    assert.ok(!authored.includes(leaf), `"${leaf}" hangs in a doorway`)
    assert.ok(unused(doorless).includes(leaf), `with no door declared, "${leaf}" is accused`)
  }

  // And the components draw from that table rather than from one of their own.
  const source = (path: string) => squeezed(readText(new URL(`../src/${path}`, import.meta.url)))
  assert.ok(source('scenes/MuseumScene.tsx').includes('MOUNT_PARTS[exhibit.mount]'), 'the scene reads MOUNT_PARTS')
  assert.ok(
    source('engine/TransitionDoors.tsx').includes("TRANSITION_DOOR_LEAVES['double-panel'][side]"),
    'the doors read TRANSITION_DOOR_LEAVES',
  )
})

test('a key counts as cited only as one whole quoted literal', () => {
  const keys = new Set(['prompt.read', 'prompt.examine', 'prompt.close', 'ui.title'])
  const cited = keysCitedIn(keys, [
    { path: 'a.tsx', text: "<p>{t('prompt.read')}</p> // prompt.examine is only mentioned" },
    { path: 'b.ts', text: 'const label = closeLabel(t("prompt.close"), `ui.title`)' },
  ])
  assert.deepEqual([...cited].sort(), ['prompt.close', 'prompt.read', 'ui.title'])
  // The dictionaries define keys and the debt table names the unused ones:
  // neither is a use, and neither is read.
  const read = readSourceTree(SOURCE_ROOT, KEY_NAMED_NOT_USED).map((file) => file.path)
  assert.ok(read.includes('content/museum.ts') && read.includes('ui/Hud.tsx'))
  assert.ok(!read.some((path) => path.startsWith('content/i18n') || path === 'content/knownDebt.ts'))
})

// ---------------------------------------------------------------------------
// The debt table
// ---------------------------------------------------------------------------

test('the debt table is honest: paid, overdue and unlisted all fail', () => {
  const accusation = (id: string): ValidationIssue => ({
    severity: 'error',
    code: 'kit-part-unused',
    id,
    message: `Kit recipe "${id}" is placed nowhere.`,
  })
  const owed = (id: string, untilLot: number): KnownDebt => ({
    gate: 'validate:content',
    code: 'kit-part-unused',
    id,
    untilLot,
    note: 'leaves the GLB or gains a use',
  })
  const errorsOf = (issues: readonly ValidationIssue[]) =>
    issues.filter((issue) => issue.severity === 'error').map((issue) => issue.code)

  // In good standing: no longer an error, still on the printed table.
  const standing = settleKnownDebt([accusation('crate')], [owed('crate', 5)], 1)
  assert.deepEqual(errorsOf(standing), [])
  assert.deepEqual(
    standing.map((issue) => [issue.severity, issue.code, issue.id, issue.debt?.untilLot]),
    [['debt', 'kit-part-unused', 'crate', 5]],
  )

  // The lot that was to pay it arrived and the accusation is still there.
  const overdue = settleKnownDebt([accusation('crate')], [owed('crate', 5)], 5)
  assert.deepEqual(errorsOf(overdue).sort(), ['kit-part-unused', 'known-debt-overdue'])

  // Paid: the line has to leave the table, or the table stops meaning anything.
  assert.deepEqual(errorsOf(settleKnownDebt([], [owed('crate', 5)], 1)), ['known-debt-stale'])

  // An accusation nobody wrote down is an error like any other.
  const unlisted = settleKnownDebt([accusation('crate'), accusation('barrel')], [owed('crate', 5)], 1)
  assert.deepEqual(errorsOf(unlisted), ['kit-part-unused'])
  assert.equal(unlisted.find((issue) => issue.severity === 'error')?.id, 'barrel')

  // A debt covers one thing, never a whole code, and never a warning.
  const warning: ValidationIssue = { ...accusation('crate'), severity: 'warning' }
  assert.deepEqual(errorsOf(settleKnownDebt([warning], [owed('crate', 5)], 1)), ['known-debt-stale'])
})

test('the committed table settles the committed museum, and bites when a lot comes due', () => {
  const lines = debtOf('validate:content')
  const settled = (lot: number) =>
    validateContent(MUSEUM, BAKED_BUNDLES, DICTIONARY_KEYS, undefined, {
      dictionaries: DICTIONARIES,
      keysCitedByCode: KEYS_CITED_BY_CODE,
      knownDebt: { lines, lot },
    })
  const now = settled(CONTENT_LOT)
  assert.deepEqual(
    now.filter((issue) => issue.severity === 'error').map((issue) => `${issue.code} ${issue.id ?? ''}`),
    [],
  )
  assert.ok(lines.length > 0, 'the table is not empty')
  assert.equal(now.filter((issue) => issue.severity === 'debt').length, lines.length, 'every line is still owed')
  assert.equal(new Set(KNOWN_DEBT.map((line) => `${line.gate} ${line.code} ${line.id}`)).size, KNOWN_DEBT.length)
  for (const line of KNOWN_DEBT) {
    assert.ok(Number.isInteger(line.untilLot) && line.untilLot > CONTENT_LOT, `${line.code} ${line.id} is dated ahead`)
    assert.ok(line.note.trim().length > 0, `${line.code} ${line.id} says why it waits`)
  }

  // The same museum, one lot on: what was promised for it is now an error.
  const next = Math.min(...lines.map((line) => line.untilLot))
  const due = settled(next).filter((issue) => issue.code === 'known-debt-overdue')
  assert.equal(due.length, lines.filter((line) => line.untilLot === next).length)
})

console.log(`\n${passed}/${passed + failed} opening checks passed.\n`)
if (failed > 0) process.exitCode = 1
