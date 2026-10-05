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
import { readFileSync } from 'node:fs'
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
import { validateContent, validateOpening, type ValidationIssue } from '../src/content/validate.ts'
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
  torchIrradiance,
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
import { buildPowerControlLightRig } from '../src/engine/powerControlLightRig.ts'
import { progressConditionMet } from '../src/engine/progressCondition.ts'
import { MOUNT_PARTS, mountPartNames, transitionDoorPartNames } from '../src/engine/runtimePlacedParts.ts'
import {
  buildTransitionDoorSpecs,
  transitionDoorBlock,
} from '../src/engine/transitionDoorTopology.ts'
import { useMuseum } from '../src/state/store.ts'
import { arrivalOf, recipeParts } from './lib/museumWorld.ts'
import { squeezed } from './lib/runtimeWiring.ts'
import { bearingDegrees, projectedSize, roomObstacles, sightlineBlockers } from './lib/sightline.ts'
import { KEY_NAMED_NOT_USED, keysCitedIn, readSourceTree } from './lib/translationUsage.ts'

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
  // (three pieces no hand can catalogue, and the two list items that follow
  // from them): every room is reached and every lock opens.
  const authored = simulateProgress(MUSEUM)
  const owed = debtOf('validate:content').filter((line) =>
    ['exhibit-uncataloguable', 'checklist-item-untickable'].includes(line.code),
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
  assert.deepEqual(radioHintFor(radio, save, MUSEUM), ['radio.hint.notebook'])
  save.documentsRead = ['doc-welcome']
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
  // Mounted unconditionally at the scene root and never hidden: either would
  // change the light count and recompile every material at the first press.
  const component = readFileSync(new URL('../src/engine/Flashlight.tsx', import.meta.url), 'utf8')
  const scene = readFileSync(new URL('../src/scenes/MuseumScene.tsx', import.meta.url), 'utf8')
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
    readFileSync(new URL('../src/engine/Flashlight.tsx', import.meta.url), 'utf8').includes('decay={FLASHLIGHT.decay}'),
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

  // The keypad is the only panel the runtime has: a tool lock on a cabinet
  // opens an empty modal, and a lock on a doorway is never asked for at all.
  const toolLock = {
    kind: 'tool',
    id: 'service-hatch',
    requires: 'service-key',
    consumesTool: false,
    mapLabelKey: 'lock.office-drawer.mapLabel',
  } as const
  proves(
    'lock-host-kind-unsupported',
    'holyoke-cabinet-a',
    gate({
      ...withRoom('holyoke', (room) => ({
        containers: (room.containers ?? []).map((container) =>
          container.id === 'holyoke-cabinet-a' ? { ...container, lockId: toolLock.id } : container,
        ),
      })),
      locks: [...MUSEUM.locks, toolLock],
    }),
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
  for (const key of ['ui.title', 'exhibit.ball-spalding.title', 'radio.hint.vault.curt', 'prompt.examine']) {
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
  const source = (path: string) => squeezed(readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'))
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
