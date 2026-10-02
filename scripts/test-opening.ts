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

import { MUSEUM } from '../src/content/museum.ts'
import type { MuseumContent } from '../src/content/schema.ts'
import { validateOpening, validateSolvability } from '../src/content/validate.ts'
import {
  clockHandAngles,
  clockTimeAfter,
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
} from '../src/engine/flashlightRig.ts'
import { GALLERY_SPOT_SLOTS } from '../src/engine/galleryLightRig.ts'
import {
  containerById,
  isContainerTaken,
  journalUnlocked,
  notebookAdvance,
  notebookPagesFor,
} from '../src/engine/notebook.ts'
import { isRoomPowered } from '../src/engine/power.ts'
import { progressConditionMet } from '../src/engine/progressCondition.ts'
import {
  buildTransitionDoorSpecs,
  transitionDoorBlock,
} from '../src/engine/transitionDoorTopology.ts'
import { useMuseum } from '../src/state/store.ts'

let passed = 0
function test(name: string, run: () => void) {
  run()
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

test('the checklist ticks itself as the night goes on', () => {
  const [, , checklist] = notebookPagesFor(MUSEUM, 'office-notebook')
  const [power, catalogue, vault] = checklist.items ?? []
  assert.ok(power?.doneWhen && catalogue?.doneWhen && vault)

  const save = freshSave()
  assert.equal(progressConditionMet(power.doneWhen, save, MUSEUM), false)
  save.roomsPowered = ['office', 'atrium']
  assert.equal(progressConditionMet(power.doneWhen, save, MUSEUM), false, 'one wing still dark')
  save.roomsPowered = MUSEUM.rooms.map((room) => room.id)
  assert.equal(progressConditionMet(power.doneWhen, save, MUSEUM), true)

  save.catalogued = MUSEUM.exhibits.slice(1).map((exhibit) => exhibit.id)
  assert.equal(progressConditionMet(catalogue.doneWhen, save, MUSEUM), false)
  save.catalogued = MUSEUM.exhibits.map((exhibit) => exhibit.id)
  assert.equal(progressConditionMet(catalogue.doneWhen, save, MUSEUM), true)

  assert.equal(vault.doneWhen, undefined, 'the vault stays open until the vault exists')
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
  assert.equal(transitionDoorBlock(officeDoor, 'office', poweredBy(save)), 'unpowered')
  assert.equal(transitionDoorBlock(officeDoor, 'atrium', poweredBy(save)), 'unpowered')
  save.roomsPowered = ['office']
  assert.equal(transitionDoorBlock(officeDoor, 'office', poweredBy(save)), null)
  assert.equal(transitionDoorBlock(officeDoor, 'atrium', poweredBy(save)), null)
})

test('the one-way shortcut keeps its own rule', () => {
  const shortcut = buildTransitionDoorSpecs(MUSEUM.rooms).find((door) => door.opensFrom !== null)
  assert.ok(shortcut)
  const everything = (_roomId: string) => true
  assert.equal(transitionDoorBlock(shortcut, 'atrium', everything), 'other-side')
  assert.equal(transitionDoorBlock(shortcut, 'holyoke', everything), null)
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
  const codes = validateSolvability(broken).map((issue) => issue.code)
  assert.ok(codes.includes('room-unreachable'), 'the atrium is unreachable from the office')
  assert.ok(
    !validateSolvability(MUSEUM).some((issue) => issue.severity === 'error'),
    'the authored lock is solvable',
  )
})

// ---------------------------------------------------------------------------
// The porter's radio
// ---------------------------------------------------------------------------

const [radioEntry] = radioDevices(MUSEUM)

test('the radio is dead until the office has power, then calls exactly once', () => {
  assert.ok(radioEntry)
  const radio = radioEntry.device
  const save = freshSave()
  assert.equal(radioIsLive(MUSEUM, radio.id, save.roomsPowered), false)
  assert.equal(dueRadioCalls(radio, save, MUSEUM).length, 0)

  save.roomsPowered = ['office']
  assert.equal(radioIsLive(MUSEUM, radio.id, save.roomsPowered), true)
  const due = dueRadioCalls(radio, save, MUSEUM)
  assert.equal(due.length, 1)
  assert.ok(due[0].lineKeys.length >= 3, 'the first call carries the objective')

  save.radioCalls = [due[0].id]
  assert.equal(dueRadioCalls(radio, save, MUSEUM).length, 0, 'heard once, never again')
})

test('the porter always answers with the next thing the player needs', () => {
  const radio = radioEntry.device
  const save = freshSave()
  save.roomsPowered = ['office']
  assert.deepEqual(radioHintFor(radio, save, MUSEUM), ['radio.hint.atrium'])
  save.roomsPowered = ['office', 'atrium']
  assert.deepEqual(radioHintFor(radio, save, MUSEUM), ['radio.hint.holyoke'])
  save.roomsPowered = ['office', 'atrium', 'holyoke']
  assert.deepEqual(radioHintFor(radio, save, MUSEUM), ['radio.hint.drawer'])
  save.locksOpened = ['office-drawer']
  assert.deepEqual(radioHintFor(radio, save, MUSEUM), ['radio.hint.vault'])
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

// ---------------------------------------------------------------------------
// The torch
// ---------------------------------------------------------------------------

test('the torch never reaches the atrium ceiling the plan saves for last', () => {
  assert.equal(flashlightReaches(atrium.shell.height, EYE_HEIGHT), false)
  assert.equal(flashlightReaches(office.shell.height, EYE_HEIGHT), true, 'but lights the office')
})

test('the torch is one permanent spot added to the gallery pool', () => {
  assert.equal(FLASHLIGHT_SPOT_SLOTS, 1)
  assert.equal(GALLERY_SPOT_SLOTS + FLASHLIGHT_SPOT_SLOTS, 9)
  assert.equal(flashlightIntensity(false, 1, false), 0, 'off is intensity zero, never unmounted')
  assert.equal(flashlightIntensity(true, 1, false), FLASHLIGHT.intensity)
  assert.ok(
    flashlightIntensity(true, 1, true) < FLASHLIGHT.intensity * 0.2,
    'dimmed while an object is held to the face',
  )
  assert.equal(flashlightIntensity(true, 0.5, false), FLASHLIGHT.intensity * 0.5)
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

console.log(`\n${passed}/${passed} opening checks passed.\n`)
