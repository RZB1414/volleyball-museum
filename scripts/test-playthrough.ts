/**
 * Headless proof that the museum can be played, and that a lot takes nothing
 * away from the players of the lot before.
 *
 *   npm run test:playthrough
 *   SEED=<n> npm run test:playthrough     one night of the five hundred, with its log
 *
 * Four things, each of which used to be taken on trust:
 *
 *   - the ruler of the examine view (`engine/examineReach.ts`): which details
 *     a hand can turn to the camera, as arithmetic, held to the vectors the
 *     view computes and to what production saves have catalogued;
 *   - the exhaustive player (`content/simulate.ts`), which replaced a walk of
 *     the lock graph that shared no rule with the runtime: what she reaches
 *     with the game's own functions, level by level, and every accusation she
 *     makes on a museum broken for the purpose;
 *   - the robot (`lib/playthrough.ts`), which plays the REAL store in five
 *     hundred shuffled orders, wasting presses and closing the tab, and has
 *     to end every night where the simulation says play ends;
 *   - the graph snapshot (`content/additive.ts`, `docs/releases`): the next
 *     lot's content against what this lot's players could do.
 *
 * The store is the real one, loaded the way a browser loads it, with the
 * museum's rules registered the way the canvas registers them.
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Vector3 } from 'three'

import {
  describe,
  endOf,
  everyPress,
  ORDINARY,
  playToEnd,
  press,
  pressProblem,
  reload,
  sameAction,
  type RobotProfile,
} from './lib/playthrough.ts'
import { newestSnapshot, RELEASES_DIRECTORY, snapshotFileName, snapshotForGate } from './lib/graphSnapshots.ts'
import { lastLotDone } from './lib/planLots.ts'
import { examineWiringProblems, type SourceReader } from './lib/runtimeWiring.ts'
import { staticImportGraph } from './lib/staticImports.ts'
import { openGame, seeded, shrunk, suite, throughJson } from './lib/storePage.ts'

import {
  graphSnapshot,
  parseGraphSnapshot,
  serialiseGraphSnapshot,
  validateAdditive,
  type GraphSnapshot,
} from '../src/content/additive.ts'
import { CONTENT_LOT, debtOf, settleKnownDebt } from '../src/content/knownDebt.ts'
import type { SaveAlias } from '../src/content/legacySave.ts'
import { MUSEUM } from '../src/content/museum.ts'
import { SAVE_FIXTURES } from '../src/content/saveFixtures.ts'
import type { MuseumContent, Trigger } from '../src/content/schema.ts'
import {
  actionGrant,
  actionRecord,
  ATOM_PREFIX,
  atomsOf,
  availableActions,
  contentActions,
  formatScript,
  SIMULATION_PASS_LIMIT,
  simulateProgress,
  type ActionRecord,
  type PlayerAction,
} from '../src/content/simulate.ts'
import { validateContent, type ValidationIssue } from '../src/content/validate.ts'
import {
  EXAMINE_HOLD_DISTANCE,
  EXAMINE_HOTSPOT_DOT,
  EXAMINE_MIN_CONE_DEGREES,
  examineConeDegrees,
  examineReach,
} from '../src/engine/examineReach.ts'
import { emptyProgress, grantProgress, PROGRESS_FIELDS, type Progress, type ProgressGrant } from '../src/state/progressFields.ts'
import { migrateProgress } from '../src/state/saveMigrations.ts'

// The museum hands the store its rules as the canvas chunk arrives. Here, now:
// every store this suite opens is created with them in place.
await import('../src/engine/contentRegistry.ts')

type Room = MuseumContent['rooms'][number]
type Exhibit = MuseumContent['exhibits'][number]
type Document = MuseumContent['documents'][number]
type Raw = Record<string, unknown>

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource: SourceReader = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const { test, done } = suite('The playthrough: a ruler, an exhaustive player, a robot and a snapshot')

/** The ids a code accuses, among errors. */
const accused = (issues: readonly ValidationIssue[], code: string) =>
  issues.filter((issue) => issue.code === code && issue.severity === 'error').map((issue) => issue.id ?? '')
const codesOf = (issues: readonly ValidationIssue[]) => [...new Set(issues.map((issue) => issue.code))].sort()
const sorted = (items: readonly string[]) => [...items].sort()
/** The one door of the house that opens from one side: the wing's way out. */
const SHORTCUT = 'atrium-from-holyoke-shortcut'

// --- museums changed for the purpose -----------------------------------------
const withRooms = (patch: (room: Room) => Room): MuseumContent => ({ ...MUSEUM, rooms: MUSEUM.rooms.map(patch) })
const withPortals = (
  roomId: string,
  patch: (portal: Room['portals'][number]) => Room['portals'][number],
): MuseumContent => withRooms((room) => (room.id === roomId ? { ...room, portals: room.portals.map(patch) } : room))
const withExhibits = (patch: (exhibit: Exhibit) => Exhibit): MuseumContent => ({
  ...MUSEUM,
  exhibits: MUSEUM.exhibits.map(patch),
})
const withDocuments = (patch: (doc: Document) => Document): MuseumContent => ({
  ...MUSEUM,
  documents: MUSEUM.documents.map(patch),
})
const withTriggers = (...triggers: Trigger[]): MuseumContent => ({ ...MUSEUM, triggers })

// ---------------------------------------------------------------------------
// The ruler of the examine view (M4a)
// ---------------------------------------------------------------------------

const cone = (exhibitId: string, hotspotId: string) => {
  const exhibit = MUSEUM.exhibits.find((candidate) => candidate.id === exhibitId)
  const hotspot = exhibit?.hotspots.find((candidate) => candidate.id === hotspotId)
  assert.ok(exhibit && hotspot, `${exhibitId}:${hotspotId} is a detail of the museum`)
  return examineReach(exhibit, hotspot)
}

await test('the cone of every detail the lot plan measured, to a tenth of a degree', () => {
  // The table of the lot plan, T9. A number here that moves means a piece
  // was resized or a detail moved: look at it in the view before changing it.
  const measured: readonly (readonly [string, string, number])[] = [
    ['ball-improvised', 'valve', 45.3],
    ['ball-spalding', 'lacing', 8.5],
    ['ball-spalding', 'maker', 21.2],
    ['handbook-1897', 'innings', 49.3],
    ['guide-1916', 'credit', 51.9],
    ['portrait-morgan', 'date', 22.6],
    ['photo-gym', 'apparatus', 1.5],
    ['gym-suit', 'knit', 0],
    ['net-1897', 'tape', 0],
  ]
  const off = measured
    .map(([exhibitId, hotspotId, degrees]) => ({ key: `${exhibitId}:${hotspotId}`, degrees, got: cone(exhibitId, hotspotId).coneDegrees }))
    .filter(({ degrees, got }) => Math.abs(got - degrees) > 0.1)
    .map(({ key, degrees, got }) => `${key}: ${got.toFixed(2)}°, measured ${degrees}°`)
  assert.deepEqual(off, [])

  // The four balls of the atrium: all eight details between 44.4° and 44.8°.
  const atrium = MUSEUM.rooms.find((room) => room.id === 'atrium')
  const balls = MUSEUM.exhibits.filter((exhibit) => atrium?.exhibitIds.includes(exhibit.id))
  const cones = balls.flatMap((exhibit) => exhibit.hotspots.map((hotspot) => examineReach(exhibit, hotspot).coneDegrees))
  assert.equal(cones.length, 8)
  assert.ok(Math.min(...cones) >= 44.3 && Math.max(...cones) <= 44.9, `the atrium's cones run ${Math.min(...cones)}° to ${Math.max(...cones)}°`)
})

await test('the three pieces no honest save has are the three the ruler refuses', () => {
  const refused = MUSEUM.exhibits
    .filter((exhibit) => exhibit.hotspots.some((hotspot) => hotspot.requiredForCatalogue && !examineReach(exhibit, hotspot).reachable))
    .map((exhibit) => exhibit.id)
  assert.deepEqual(sorted(refused), ['gym-suit', 'net-1897', 'photo-gym'])
  // Two of them are out of reach altogether; the third is a matter of the
  // hand, and is what the minimum cone exists to say.
  assert.equal(cone('photo-gym', 'apparatus').coneDegrees > 0, true)
  assert.equal(cone('photo-gym', 'apparatus').reachable, false)
  assert.equal(cone('ball-spalding', 'lacing').reachable, true, 'the narrowest cone a production save holds')
  assert.ok(cone('ball-spalding', 'lacing').coneDegrees > EXAMINE_MIN_CONE_DEGREES)
  assert.ok(cone('photo-gym', 'apparatus').coneDegrees < EXAMINE_MIN_CONE_DEGREES)
})

await test('every piece and every detail a save of the corpus holds is within reach of the ruler', () => {
  // The corpus against the rule: if the ruler called unreachable something a
  // real player catalogued, the ruler would be wrong, not the player.
  const out: string[] = []
  for (const [name, fixture] of Object.entries(SAVE_FIXTURES)) {
    const progress = fixture.save.progress as { readonly catalogued: readonly string[]; readonly hotspots: readonly string[] }
    for (const key of progress.hotspots) {
      const [exhibitId, hotspotId] = key.split(':')
      if (!cone(exhibitId, hotspotId).reachable) out.push(`${name} holds ${key}, which the ruler calls out of reach`)
    }
    for (const exhibitId of progress.catalogued) {
      const exhibit = MUSEUM.exhibits.find((candidate) => candidate.id === exhibitId)
      assert.ok(exhibit, `${name}: ${exhibitId}`)
      for (const hotspot of exhibit.hotspots) {
        if (hotspot.requiredForCatalogue && !examineReach(exhibit, hotspot).reachable) {
          out.push(`${name} catalogued ${exhibitId}, whose "${hotspot.id}" the ruler calls out of reach`)
        }
      }
    }
  }
  assert.deepEqual(out, [])
})

await test('the limits: at the origin the cone is the threshold itself, at the hold distance it closes', () => {
  assert.ok(Math.abs(examineConeDegrees(0) - 56.6) < 0.05, `${examineConeDegrees(0)}`)
  assert.ok(Math.abs(examineConeDegrees(0) - (Math.acos(EXAMINE_HOTSPOT_DOT) * 180) / Math.PI) < 1e-9)
  for (const rho of [EXAMINE_HOLD_DISTANCE, EXAMINE_HOLD_DISTANCE + 1e-9, 0.5, 1.2, 2, 1000, Number.NaN, -0.1]) {
    assert.equal(examineConeDegrees(rho), 0, `a detail ${rho} m out`)
  }
  // Further out is never easier.
  let previous = Number.POSITIVE_INFINITY
  for (let rho = 0; rho < EXAMINE_HOLD_DISTANCE; rho += 0.001) {
    const degrees = examineConeDegrees(rho)
    assert.ok(degrees <= previous && degrees >= 0, `the cone widened between ${rho - 0.001} and ${rho} m`)
    previous = degrees
  }
  assert.deepEqual(examineReach({ scale: 2 }, { localPosition: [0, 0.1, 0] }).coneDegrees, examineConeDegrees(0.2), 'a scaled piece carries its details out')
})

await test('the closed form is the arithmetic of the view, whichever way the piece is turned', () => {
  // The three vectors of `Interaction.tsx`: the camera, the origin of the
  // piece held in front of it, and the detail somewhere on a sphere round
  // that origin. The view says "seen" by a dot product; the ruler says inside
  // which angle that is true. Every detail, every degree, several ways round.
  const camera = new Vector3(3.1, 1.62, -2.4)
  const forward = new Vector3(0.3, -0.12, -1).normalize()
  const held = camera.clone().addScaledVector(forward, EXAMINE_HOLD_DISTANCE)
  const toCameraFromOrigin = camera.clone().sub(held).normalize()
  const perpendicular = new Vector3(0, 1, 0).cross(toCameraFromOrigin).normalize()
  const wrong: string[] = []
  let seenSomewhere = 0
  for (const exhibit of MUSEUM.exhibits) {
    for (const hotspot of exhibit.hotspots) {
      const rho = Math.hypot(...hotspot.localPosition) * (exhibit.scale ?? 1)
      const { coneDegrees } = examineReach(exhibit, hotspot)
      for (let tenths = 0; tenths <= 1800; tenths += 1) {
        const theta = tenths / 10
        // On the edge the two may differ by rounding: not a disagreement.
        if (Math.abs(theta - coneDegrees) < 0.05) continue
        for (const round of [0, 1.3, 2.9, 4.4]) {
          const axis = perpendicular.clone().applyAxisAngle(toCameraFromOrigin, round)
          const outwardDirection = toCameraFromOrigin.clone().applyAxisAngle(axis, (theta * Math.PI) / 180)
          const hotspotWorld = held.clone().addScaledVector(outwardDirection, rho)
          // From here on, the lines of the view.
          const toCamera = camera.clone().sub(hotspotWorld).normalize()
          const outward = hotspotWorld.clone().sub(held).normalize()
          const seen = outward.dot(toCamera) > EXAMINE_HOTSPOT_DOT
          if (seen) seenSomewhere += 1
          if (seen !== theta < coneDegrees) wrong.push(`${exhibit.id}:${hotspot.id} at ${theta}°: the view says ${seen}, the ruler ${coneDegrees.toFixed(2)}°`)
        }
      }
    }
  }
  assert.deepEqual(wrong.slice(0, 5), [])
  assert.ok(seenSomewhere > 1000, 'the view never said "seen": the test is not turning anything')
})

await test('the view measures with the ruler, and not with numbers of its own', () => {
  assert.deepEqual(examineWiringProblems(readSource), [])
  const changed =
    (path: string, from: string | RegExp, to: string): SourceReader =>
    (asked) => {
      if (asked !== path) return readSource(asked)
      const source = readSource(asked)
      const next = source.replace(from, to)
      assert.notEqual(next, source, `the refactor of ${path} found nothing to change`)
      return next
    }
  const view = 'engine/Interaction.tsx'
  const refactors: readonly (readonly [string, SourceReader])[] = [
    ['the view with a hold distance of its own', changed(view, 'addScaledVector(holdOffset, EXAMINE_HOLD_DISTANCE)', 'addScaledVector(holdOffset, 0.6)')],
    ['the view with a threshold of its own', changed(view, 'outward.dot(toCamera) > EXAMINE_HOTSPOT_DOT', 'outward.dot(toCamera) > 0.4')],
    [
      'the two numbers typed in the view again',
      changed(view, /import \{ EXAMINE_HOLD_DISTANCE, EXAMINE_HOTSPOT_DOT \} from '\.\/examineReach'\n/, 'const EXAMINE_HOLD_DISTANCE = 0.42\nconst EXAMINE_HOTSPOT_DOT = 0.55\n'),
    ],
    ['the old names back beside the new', changed(view, /$/, '\nconst HOLD_DISTANCE = 0.5\n')],
    ['one of the two imported, the other not', changed(view, 'import { EXAMINE_HOLD_DISTANCE, EXAMINE_HOTSPOT_DOT }', 'import { EXAMINE_HOLD_DISTANCE }')],
    ['the ruler reaching for the museum', changed('engine/examineReach.ts', /^import type /m, "import { MUSEUM } from '../content/museum.ts'\nimport type ")],
  ]
  const uncaught = refactors.filter(([, reader]) => examineWiringProblems(reader).length === 0).map(([name]) => name)
  assert.deepEqual(uncaught, [], 'a refactor this check exists to catch went through')
})

// ---------------------------------------------------------------------------
// The exhaustive player (M10)
// ---------------------------------------------------------------------------

const played = simulateProgress(MUSEUM)

/** The furthest the game of this lot goes, list by list: the lot plan's acceptance. */
const MAXIMUM = {
  roomsVisited: ['office', 'atrium', 'holyoke'],
  roomsPowered: ['office', 'atrium', 'holyoke'],
  doorsReleased: ['atrium-from-holyoke-shortcut'],
  locksOpened: ['office-drawer'],
  locksSeen: ['office-drawer'],
  documentsRead: ['doc-welcome', 'doc-invention-date', 'doc-halstead', 'doc-rule-changes', 'doc-predecessor'],
  factsKnown: ['springfield-renaming', 'first-rulebook', 'filipino-spike', 'six-a-side'],
  catalogued: [
    'atrium-ball-laced',
    'atrium-ball-tokyo-1964',
    'atrium-ball-colour-1998',
    'atrium-ball-eight-panel-2008',
    'ball-improvised',
    'ball-spalding',
    'handbook-1897',
    'guide-1916',
    'portrait-morgan',
  ],
  hotspots: [
    'atrium-ball-laced:lacing',
    'atrium-ball-laced:raised-seam',
    'atrium-ball-tokyo-1964:panel-trio',
    'atrium-ball-tokyo-1964:recessed-seam',
    'atrium-ball-colour-1998:colour-sequence',
    'atrium-ball-colour-1998:hand-stitched-channel',
    'atrium-ball-eight-panel-2008:spiral-panels',
    'atrium-ball-eight-panel-2008:dimpled-surface',
    'ball-improvised:valve',
    'ball-spalding:lacing',
    'ball-spalding:maker',
    'ball-spalding:seam',
    'handbook-1897:innings',
    'handbook-1897:ball-spec',
    'guide-1916:credit',
    'guide-1916:census',
    'portrait-morgan:date',
  ],
  credentials: [],
  flags: [],
  triggersFired: [],
  devicesCarried: ['office-radio'],
} as const satisfies ProgressGrant
const MAXIMUM_END = endOf(MAXIMUM)

await test('the furthest the game goes today, atom by atom', () => {
  for (const [field, ids] of Object.entries(MAXIMUM) as [keyof typeof MAXIMUM, readonly string[]][]) {
    assert.deepEqual(sorted(played.final[field]), sorted(ids), field)
  }
  assert.deepEqual(endOf(played.final), MAXIMUM_END)
  // In the plan's words: three rooms lit and visited, five documents, four
  // facts, nine of twelve pieces, the drawer open and seen, the shortcut
  // released, no credential.
  assert.equal(played.final.catalogued.length, 9)
  assert.equal(MUSEUM.exhibits.length, 12)
  assert.deepEqual(
    sorted(MUSEUM.exhibits.map((exhibit) => exhibit.id).filter((id) => !played.final.catalogued.includes(id))),
    ['gym-suit', 'net-1897', 'photo-gym'],
  )
  // What the play does not write stays as it was handed over.
  assert.deepEqual(played.final.radioCalls, [])
  assert.equal(played.final.lastRoom, emptyProgress().lastRoom)
})

await test('the script in levels: the lamp, the atrium, its light and Wing 1, the wing, the drawer', () => {
  // Without the details and the lock touched, which the printed script counts.
  const told = played.levels.map((level) => sorted(level.filter((entry) => !/^(?:detail|seen):/.test(entry))))
  assert.deepEqual(told, [
    sorted(['room:office', 'power:office', 'doc:doc-welcome']),
    sorted(['room:atrium', 'carried:office-radio']),
    sorted([
      'power:atrium',
      'room:holyoke',
      'cat:atrium-ball-laced',
      'cat:atrium-ball-tokyo-1964',
      'cat:atrium-ball-colour-1998',
      'cat:atrium-ball-eight-panel-2008',
    ]),
    sorted([
      'power:holyoke',
      'door:atrium-from-holyoke-shortcut',
      'fact:springfield-renaming',
      'fact:first-rulebook',
      'fact:filipino-spike',
      'fact:six-a-side',
      'doc:doc-invention-date',
      'doc:doc-halstead',
      'doc:doc-rule-changes',
      'cat:ball-improvised',
      'cat:ball-spalding',
      'cat:handbook-1897',
      'cat:guide-1916',
      'cat:portrait-morgan',
    ]),
    sorted(['lock:office-drawer', 'doc:doc-predecessor']),
  ])
  assert.deepEqual(
    played.levels.map((level) => level.filter((entry) => entry.startsWith('detail:')).length),
    [0, 0, 8, 9, 0],
  )
  // The drawer is touched the first time she is in the office, and opened
  // four levels later: the year is in the wing.
  assert.ok(played.levels[0].includes('seen:office-drawer'))
  // Every atom of the end is on exactly one level.
  assert.deepEqual(sorted(played.levels.flat()), MAXIMUM_END)

  // A level is what could be done with what the level before left, whatever
  // order the rooms are written in. With the wing written first, a pass that
  // read its own writes would learn the year there and open the drawer in the
  // office on the same level.
  const reordered = simulateProgress({ ...MUSEUM, rooms: [...MUSEUM.rooms].reverse() })
  assert.deepEqual(MUSEUM.rooms.map((room) => room.id), ['atrium', 'holyoke', 'office'])
  assert.deepEqual(reordered.levels.map((level) => sorted(level)), played.levels.map((level) => sorted(level)))
  assert.deepEqual(endOf(reordered.final), MAXIMUM_END)

  const printed = formatScript(played.levels).split('\n')
  assert.equal(printed.length, 5)
  assert.match(printed[0], /^ {2}N0 +room:office · power:office · doc:doc-welcome · \(1 locks touched\)$/)
  assert.match(printed[3], /^ {2}N3 .*fact:springfield-renaming.*\(9 details\)$/)
  assert.match(printed[4], /^ {2}N4 +lock:office-drawer · doc:doc-predecessor$/)
})

await test('she accuses the museum of five things the old walk let through, and they are the five that are dated', () => {
  const errors = played.issues.map((issue) => `${issue.severity} ${issue.code} ${issue.id}`)
  assert.deepEqual(sorted(errors), [
    'error checklist-item-untickable notebook.todo.catalogue',
    'error checklist-item-untickable notebook.todo.vault',
    'error exhibit-uncataloguable gym-suit',
    'error exhibit-uncataloguable net-1897',
    'error exhibit-uncataloguable photo-gym',
  ])
  // With the table applied, nothing is left, and nothing in the table is paid.
  const owed = debtOf('validate:content').filter((line) => ['exhibit-uncataloguable', 'checklist-item-untickable'].includes(line.code))
  assert.equal(owed.length, 5)
  const settled = settleKnownDebt(played.issues, owed, CONTENT_LOT)
  assert.deepEqual(settled.filter((issue) => issue.severity === 'error'), [])
  assert.deepEqual(sorted(owed.map((line) => `${line.id} L${line.untilLot}`)), [
    'gym-suit L4',
    'net-1897 L4',
    'notebook.todo.catalogue L4',
    'notebook.todo.vault L3',
    'photo-gym L4',
  ])
})

await test('what the rules answer is offered, and what they ignore is not', () => {
  const offered = (atoms: readonly string[], room: string) =>
    availableActions(MUSEUM, saveHolding([`room:${room}`, ...atoms]), room).map(describe)
  const office = (...atoms: string[]) => offered(atoms, 'office')

  // The first minute, in the dark: the lamp, the notebook, the drawer to
  // touch. The door waits for the lamp and the radio for its charger.
  assert.deepEqual(office(), ['power office', 'open office-cabinet', 'open office-notebook'])
  // With the lamp on: its switch has nothing left to do, the door opens and
  // the radio can be taken.
  assert.deepEqual(office('power:office'), ['door atrium-to-office office>atrium', 'open office-cabinet', 'open office-notebook', 'take office-radio'])
  // The notebook that was read left the desk with her, and a radio in the
  // hand is not on its charger.
  assert.deepEqual(office('power:office', 'doc:doc-welcome', 'carried:office-radio'), ['door atrium-to-office office>atrium', 'open office-cabinet'])

  // A code is typed at a keypad she has had up, by somebody who knows the
  // fact: neither one without the other, and never once the drawer is open.
  const types = (...atoms: string[]) => office(...atoms).filter((line) => line.startsWith('type '))
  assert.deepEqual(types('fact:springfield-renaming'), [])
  assert.deepEqual(types('seen:office-drawer'), [])
  assert.deepEqual(types('seen:office-drawer', 'fact:springfield-renaming'), ['type 1896 at office-drawer'])
  assert.deepEqual(types('seen:office-drawer', 'fact:springfield-renaming', 'lock:office-drawer'), [])
  // The year is in two places in the wing and in none elsewhere.
  assert.deepEqual(types('seen:office-drawer', 'fact:first-rulebook', 'fact:filipino-spike', 'fact:six-a-side'), [])

  // The atrium: the shortcut is not a way in until it has been a way out.
  const ways = (room: string, ...atoms: string[]) => offered(atoms, room).filter((line) => line.startsWith('door '))
  assert.deepEqual(ways('atrium', 'power:office'), ['door atrium-to-holyoke atrium>holyoke', 'door atrium-to-office atrium>office'])
  assert.deepEqual(ways('atrium', 'power:office', `door:${SHORTCUT}`), [
    'door atrium-to-holyoke atrium>holyoke',
    'door atrium-to-office atrium>office',
    `door ${SHORTCUT} atrium>holyoke`,
  ])
  // A release lifts the bar and is no key to the office's electric lock.
  assert.deepEqual(ways('atrium', `door:${SHORTCUT}`), ['door atrium-to-holyoke atrium>holyoke', `door ${SHORTCUT} atrium>holyoke`])
  assert.deepEqual(ways('holyoke'), ['door atrium-to-holyoke holyoke>atrium', `door ${SHORTCUT} holyoke>atrium`])

  // The wing: seventeen details in the museum can be found, and of the wing's
  // thirteen the four of the three large pieces are never offered. A detail
  // the save holds is not offered again.
  const details = (...atoms: string[]) => offered(atoms, 'holyoke').filter((line) => line.startsWith('detail '))
  assert.equal(details().length, 9)
  assert.deepEqual(details().filter((line) => /net-1897|gym-suit|photo-gym/.test(line)), [])
  assert.equal(details('detail:portrait-morgan:date').length, 8)
  assert.ok(!details('detail:portrait-morgan:date').includes('detail portrait-morgan:date'))
  // A room the content does not have offers nothing, and does not throw.
  assert.deepEqual(availableActions(MUSEUM, emptyProgress(), 'cellar'), [])
})

/** A museum of rooms joined by openings with no leaf in them: only what the play reads. */
const house = (rooms: readonly { readonly id: string; readonly to?: readonly string[] }[]): MuseumContent =>
  ({
    spawn: { room: rooms[0].id, position: [0, 0, 0], yaw: 0 },
    rooms: rooms.map((room) => ({
      id: room.id,
      startsPowered: true,
      portals: (room.to ?? []).map((toRoom) => ({ id: `${room.id}-to-${toRoom}`, toRoom })),
      exhibitIds: [],
      documentIds: [],
    })),
    exhibits: [],
    documents: [],
    locks: [],
    facts: [],
    media: [],
  }) as unknown as MuseumContent

const FLAG = [{ kind: 'set-flag', flag: 'made-for-the-test' }] as const
/** The year taught nowhere but where `teach` puts it. */
const yearOnlyIn = (teach: (doc: Document) => Document): MuseumContent => ({
  ...MUSEUM,
  exhibits: MUSEUM.exhibits.map((exhibit) => ({
    ...exhibit,
    hotspots: exhibit.hotspots.map((hotspot) =>
      hotspot.revealsFactId === 'springfield-renaming' ? { ...hotspot, revealsFactId: undefined } : hotspot,
    ),
  })),
  documents: MUSEUM.documents.map((doc) =>
    teach(doc.revealsFactId === 'springfield-renaming' ? { ...doc, revealsFactId: undefined } : doc),
  ),
})

await test('each accusation, on a museum broken for the purpose', () => {
  const quiet: string[] = []
  const noisy: string[] = []
  const raised = new Set<string>()
  /** `code` is raised about `id` on the broken museum. */
  const proves = (code: string, id: string, broken: MuseumContent) => {
    raised.add(code)
    const issues = simulateProgress(broken).issues
    if (!accused(issues, code).includes(id)) quiet.push(`${code} does not accuse "${id}" (it raised: ${codesOf(issues).join(', ') || 'nothing'})`)
    return issues
  }

  // The office door fed by the room behind it: the night never leaves the office.
  const stuck = proves(
    'room-unreachable',
    'atrium',
    withPortals('atrium', (portal) =>
      portal.transitionDoor && portal.toRoom === 'office'
        ? { ...portal, transitionDoor: { ...portal.transitionDoor, requiresPower: 'atrium' } }
        : portal,
    ),
  )
  assert.deepEqual(sorted(accused(stuck, 'room-unreachable')), ['atrium', 'holyoke'])

  // The year taught nowhere at all: the drawer is shut for good, and nothing
  // is behind it that would have taught it.
  const untaught = proves('lock-unopenable', 'office-drawer', yearOnlyIn((doc) => doc))
  proves('document-unreadable', 'doc-predecessor', yearOnlyIn((doc) => doc))
  if (accused(untaught, 'lock-evidence-behind-lock').length > 0) noisy.push('lock-evidence-behind-lock accuses a lock whose answer is taught nowhere')

  // The year taught only by the letter inside the drawer it opens.
  proves(
    'lock-evidence-behind-lock',
    'office-drawer',
    yearOnlyIn((doc) => (doc.id === 'doc-predecessor' ? { ...doc, revealsFactId: 'springfield-renaming' } : doc)),
  )

  // A paper filed in a cabinet no room has, and a piece shown in no room.
  proves('document-unreadable', 'doc-nowhere', {
    ...MUSEUM,
    documents: [...MUSEUM.documents, { ...MUSEUM.documents[0], id: 'doc-nowhere', containerId: 'no-such-cabinet' }],
  })
  proves('exhibit-uncataloguable', 'stored-away', {
    ...MUSEUM,
    exhibits: [...MUSEUM.exhibits, { ...MUSEUM.exhibits[0], id: 'stored-away' }],
  })

  // A cabinet behind a badge nobody hands out.
  const badged: MuseumContent = {
    ...withRooms((room) => ({
      ...room,
      containers: (room.containers ?? []).map((container) =>
        container.id === 'holyoke-cabinet-b' ? { ...container, lockId: 'staff-cabinet' } : container,
      ),
    })),
    locks: [...MUSEUM.locks, { kind: 'badge', id: 'staff-cabinet', requires: 'indoor', mapLabelKey: 'lock.office-drawer.mapLabel' }],
  }
  proves('credential-unobtainable', 'badge:indoor', badged)
  proves('lock-unopenable', 'staff-cabinet', badged)
  // The same cabinet, and a piece that hands the badge over: nothing to say.
  const handed = simulateProgress({
    ...badged,
    exhibits: badged.exhibits.map((exhibit) =>
      exhibit.id === 'ball-spalding'
        ? { ...exhibit, unlocks: [{ kind: 'grant-credential', credential: { kind: 'badge', id: 'indoor' } }] }
        : exhibit,
    ),
  })
  for (const code of ['credential-unobtainable', 'credential-orphan', 'lock-unopenable', 'document-unreadable', 'trigger-never-fires']) {
    if (accused(handed.issues, code).length > 0) noisy.push(`${code} accuses a badge that is handed out and asked for`)
  }
  assert.ok(handed.final.credentials.includes('badge:indoor') && handed.final.locksOpened.includes('staff-cabinet'))
  assert.ok(handed.final.triggersFired.includes('exhibit:ball-spalding:catalogued'))

  // A badge handed out that nothing asks for.
  const beach = withExhibits((exhibit) =>
    exhibit.id === 'ball-spalding'
      ? { ...exhibit, unlocks: [{ kind: 'grant-credential', credential: { kind: 'badge', id: 'beach' } }] }
      : exhibit,
  )
  proves('credential-orphan', 'badge:beach', beach)
  // Asked for by a condition, in a branch of a choice: that is a use, with no lock in sight.
  const beachAsked = simulateProgress({
    ...beach,
    triggers: [
      {
        id: 'badge-lights-the-wing',
        when: { anyOf: [{ credentials: [{ kind: 'badge', id: 'beach' }] }] },
        effects: [{ kind: 'power-room', roomId: 'holyoke' }],
      },
    ],
  })
  if (accused(beachAsked.issues, 'credential-orphan').length > 0) noisy.push('credential-orphan accuses a badge a condition asks for')
  assert.ok(beachAsked.final.triggersFired.includes('badge-lights-the-wing'))

  // A trigger waiting for the net, which nobody can catalogue; one waiting
  // for a flag nothing sets; one setting a flag nothing reads.
  proves('trigger-never-fires', 'waits-for-the-net', withTriggers({ id: 'waits-for-the-net', when: { catalogued: ['net-1897'] }, effects: FLAG }))
  const ghost = withTriggers({ id: 'waits-for-a-ghost', when: { anyOf: [{ flags: ['ghost'] }] }, effects: FLAG })
  proves('flag-never-set', 'ghost', ghost)
  proves('trigger-never-fires', 'waits-for-a-ghost', ghost)
  const unheard = proves('flag-never-read', 'made-for-the-test', withTriggers({ id: 'says-it-to-nobody', when: { roomsVisited: ['atrium'] }, effects: FLAG }))
  if (accused(unheard, 'trigger-never-fires').length > 0) noisy.push('trigger-never-fires accuses a trigger that fires')
  // Set by one trigger and read by another: wired.
  const wired = simulateProgress(
    withTriggers(
      { id: 'says-it', when: { roomsVisited: ['atrium'] }, effects: FLAG },
      { id: 'hears-it', when: { flags: ['made-for-the-test'] }, effects: [{ kind: 'power-room', roomId: 'holyoke' }] },
    ),
  )
  for (const code of ['flag-never-set', 'flag-never-read', 'trigger-never-fires']) {
    if (accused(wired.issues, code).length > 0) noisy.push(`${code} accuses a flag that is set and read`)
  }
  assert.deepEqual(sorted(wired.final.triggersFired), ['hears-it', 'says-it'])

  // A wing whose main door has a side of its own too: both ways back are
  // doors that open from one side. It can be left (the first push lifts the
  // bar), and it is still a wing hanging by its shortcuts.
  const hanging = proves(
    'one-way-trap',
    'holyoke',
    withPortals('atrium', (portal) =>
      portal.id === 'atrium-to-holyoke' && portal.transitionDoor
        ? { ...portal, transitionDoor: { ...portal.transitionDoor, opensFrom: 'atrium' } }
        : portal,
    ),
  )
  if (accused(hanging, 'room-unreachable').length > 0) noisy.push('the wing hanging by its shortcuts is reachable, and is accused of not being')
  if (accused(hanging, 'no-return-path').length > 0) noisy.push('no-return-path accuses a wing that can be left')

  // A doorway on one face of the wall and plaster on the other.
  proves('no-return-path', 'cellar', house([{ id: 'hall', to: ['cellar'] }, { id: 'cellar' }]))
  if (accused(simulateProgress(house([{ id: 'hall', to: ['cellar'] }, { id: 'cellar', to: ['hall'] }])).issues, 'no-return-path').length > 0) {
    noisy.push('no-return-path accuses a room with a way back')
  }

  // Doors the runtime could not build: said once, and the rooms behind them
  // are not then accused one by one of being unreachable.
  const unbuilt = proves(
    'transition-door-invalid',
    'doors',
    withRooms((room) => (room.id === 'holyoke' ? { ...room, portals: [] } : room)),
  )
  if (accused(unbuilt, 'room-unreachable').length > 0) noisy.push('one unbuildable door accuses every room of being unreachable')
  proves('no-return-path', 'holyoke', withRooms((room) => (room.id === 'holyoke' ? { ...room, portals: [] } : room)))

  // A list item with nothing to tick it, and one waiting for what no play reaches.
  const listed = (doneWhen: NonNullable<Document['pages']>[number]['items'] extends readonly (infer Item)[] | undefined ? Item : never) =>
    withDocuments((doc) => ({ ...doc, pages: doc.pages?.map((page) => ({ ...page, items: page.items ? [doneWhen] : undefined })) }))
  proves('checklist-item-untickable', 'made.for.the.test', listed({ labelKey: 'made.for.the.test' }))
  proves('checklist-item-untickable', 'made.for.the.test', listed({ labelKey: 'made.for.the.test', doneWhen: { catalogued: ['net-1897'] } }))
  if (accused(simulateProgress(listed({ labelKey: 'made.for.the.test', doneWhen: { locksOpened: ['office-drawer'] } })).issues, 'checklist-item-untickable').length > 0) {
    noisy.push('checklist-item-untickable accuses an item the play ticks')
  }

  // A corridor longer than any script.
  const corridor = house(
    Array.from({ length: SIMULATION_PASS_LIMIT + 3 }, (_, index) => ({
      id: `room-${index}`,
      to: [`room-${index + 1}`, ...(index > 0 ? [`room-${index - 1}`] : [])],
    })).map((room, index, all) => (index === all.length - 1 ? { ...room, to: [`room-${index - 1}`] } : room)),
  )
  proves('simulation-no-fixpoint', 'play', corridor)

  // Nowhere to begin.
  proves('no-start-room', 'cellar', { ...MUSEUM, spawn: { ...MUSEUM.spawn, room: 'cellar' as never } })

  // Every code of the lot plan's table was raised above, on purpose.
  assert.deepEqual(
    sorted([...raised]),
    sorted([
      'room-unreachable',
      'lock-unopenable',
      'document-unreadable',
      'exhibit-uncataloguable',
      'credential-unobtainable',
      'credential-orphan',
      'trigger-never-fires',
      'flag-never-set',
      'flag-never-read',
      'no-return-path',
      'one-way-trap',
      'lock-evidence-behind-lock',
      'checklist-item-untickable',
      'simulation-no-fixpoint',
      'transition-door-invalid',
      'no-start-room',
    ]),
  )
  // And the authored museum of none of them but the two that are dated.
  for (const code of raised) {
    if (!['exhibit-uncataloguable', 'checklist-item-untickable'].includes(code) && accused(played.issues, code).length > 0) {
      noisy.push(`${code} accuses the authored museum: ${accused(played.issues, code).join(', ')}`)
    }
  }
  assert.deepEqual(quiet, [], 'every broken museum is caught')
  assert.deepEqual(noisy, [], 'and a sound one is not accused of what it does not do')
})

await test('a switch behind a keypad and a radio in the next room: a pass does not see what it has just done', () => {
  // What the real museum has none of: a power control that carries a lock,
  // and something in a second room that waits for the first room's power.
  // The hall's switch is touched and its year read on the first level, the
  // code typed on the second, the switch thrown on the third, and only then,
  // on a fourth, is the lodge's radio live enough to take. A pass that read
  // its own writes would take the radio on the level the light came on.
  const chain = {
    spawn: { room: 'hall', position: [0, 0, 0], yaw: 0 },
    rooms: [
      {
        id: 'hall',
        startsPowered: false,
        powerControl: { id: 'hall-switch' },
        powerLockId: 'switch-lock',
        portals: [{ id: 'hall-to-lodge', toRoom: 'lodge' }],
        containers: [{ id: 'hall-cabinet' }],
        exhibitIds: [],
        documentIds: [],
      },
      {
        id: 'lodge',
        startsPowered: true,
        portals: [{ id: 'lodge-to-hall', toRoom: 'hall' }],
        devices: [{ kind: 'radio', id: 'lodge-radio', poweredBy: 'hall', carriedOnUse: true, calls: [], hints: [] }],
        exhibitIds: [],
        documentIds: [],
      },
    ],
    exhibits: [],
    documents: [{ id: 'doc-year', containerId: 'hall-cabinet', revealsFactId: 'year' }],
    locks: [{ kind: 'knowledge', id: 'switch-lock', factId: 'year', digits: 4 }],
    facts: [{ id: 'year', value: '1896' }],
    media: [],
  } as unknown as MuseumContent
  const result = simulateProgress(chain)
  assert.deepEqual(result.issues, [])
  assert.deepEqual(
    result.levels.map((level) => sorted(level)),
    [
      sorted(['room:hall', 'room:lodge', 'seen:switch-lock', 'doc:doc-year', 'fact:year']),
      ['lock:switch-lock'],
      ['power:hall'],
      ['carried:lodge-radio'],
    ],
  )
  // Written down as it was played: the touch, the code with no drawer behind
  // it, the switch that waits for its lock, the radio that waits for the hall.
  const records = Object.fromEntries(result.actions.map((entry) => [entry.id, entry]))
  assert.deepEqual(records['touch:hall-switch'], { id: 'touch:hall-switch', requires: ['room:hall'], grants: ['seen:switch-lock'] })
  assert.deepEqual(records['code:switch-lock'], {
    id: 'code:switch-lock',
    requires: ['fact:year', 'room:hall', 'seen:switch-lock'],
    grants: ['lock:switch-lock'],
  })
  assert.deepEqual(records['power:hall'], { id: 'power:hall', requires: ['lock:switch-lock', 'room:hall'], grants: ['power:hall'] })
  assert.deepEqual(records['take:lodge-radio'], { id: 'take:lodge-radio', requires: ['power:hall', 'room:lodge'], grants: ['carried:lodge-radio'] })
})

await test('a museum with its debts paid is accused of nothing, and all twelve pieces are catalogued', () => {
  // What the examine lot owes, done by hand: the three details brought within
  // a hand's reach, and the line about the vault given something to wait for.
  const paid: MuseumContent = {
    ...MUSEUM,
    exhibits: MUSEUM.exhibits.map((exhibit) =>
      ['net-1897', 'gym-suit', 'photo-gym'].includes(exhibit.id)
        ? { ...exhibit, scale: 1, hotspots: exhibit.hotspots.map((hotspot) => ({ ...hotspot, localPosition: [0, 0.05, 0.1] })) }
        : exhibit,
    ),
    documents: MUSEUM.documents.map((doc) => ({
      ...doc,
      pages: doc.pages?.map((page) => ({
        ...page,
        items: page.items?.map((item) => (item.doneWhen ? item : { ...item, doneWhen: { locksOpened: ['office-drawer'] } })),
      })),
    })),
  }
  const result = simulateProgress(paid)
  assert.deepEqual(result.issues, [])
  assert.equal(result.final.catalogued.length, 12)
  assert.equal(result.levels.length, 5, 'and it takes no longer')
})

/** A save that holds exactly these atoms. */
function saveHolding(atoms: readonly string[]): Progress {
  const grant: Record<string, string[]> = {}
  for (const entry of atoms) {
    const field = (Object.entries(ATOM_PREFIX) as [string, string | null][]).find(
      ([, prefix]) => prefix !== null && entry.startsWith(`${prefix}:`),
    )
    assert.ok(field, `"${entry}" is an atom of some list of the save`)
    grant[field[0]] = [...(grant[field[0]] ?? []), entry.slice((field[1] as string).length + 1)]
  }
  return grantProgress(emptyProgress(), grant as ProgressGrant)
}
const isPress = (entry: ActionRecord) => /^(?:power|door|hotspot|container|touch|code|take):/.test(entry.id)
const standingIn = (entry: ActionRecord) => (entry.requires.find((asked) => asked.startsWith('room:')) ?? '').slice('room:'.length)
/** The press that realises this record for a player who holds `atoms`, if the rules offer one. */
const pressFor = (content: MuseumContent, entry: ActionRecord, atoms: readonly string[]) => {
  const save = saveHolding(atoms)
  const room = standingIn(entry)
  const action = availableActions(content, save, room).find((candidate) => actionRecord(content, save, room, candidate)?.id === entry.id)
  return action ? { action, save, room } : null
}

await test('what is written down of each action is what the rules do: every guard holds, and no guard is missing', () => {
  // The snapshot is made of these records, and a later lot is judged by them.
  // So each one is put to the rules: a player who holds exactly what the
  // record asks for is offered the action; take any one thing away and she is
  // not; and what the action gives her is what the record says it gives.
  const wrong: string[] = []
  const presses = played.actions.filter(isPress)
  // Three switches, six ways through three doorways, seventeen details, four
  // containers, the drawer's touch and its code, the radio.
  assert.ok(presses.length >= 33, `only ${presses.length} presses were met`)
  for (const entry of presses) {
    const offered = pressFor(MUSEUM, entry, entry.requires)
    if (!offered) {
      wrong.push(`${entry.id}: not offered to a player who holds ${entry.requires.join(', ')}`)
      continue
    }
    for (const guard of entry.requires) {
      if (guard.startsWith('room:')) continue
      if (pressFor(MUSEUM, entry, entry.requires.filter((asked) => asked !== guard))) {
        wrong.push(`${entry.id}: still offered without ${guard}`)
      }
    }
    const before = atomsOf(offered.save)
    const gave = atomsOf(grantProgress(offered.save, actionGrant(MUSEUM, offered.save, offered.action))).filter(
      // A piece's catalogue entry is a record of its own (`catalogue:<id>`).
      (gained) => !before.includes(gained) && !gained.startsWith('cat:'),
    )
    if (JSON.stringify(sorted(gave)) !== JSON.stringify(sorted(entry.grants.filter((given) => !before.includes(given))))) {
      wrong.push(`${entry.id}: the record says it gives ${entry.grants.join(', ')}, and the rules gave ${gave.join(', ')}`)
    }
  }

  // A catalogue entry: with every required detail but one, seeing that one gives it.
  const catalogues = played.actions.filter((entry) => entry.id.startsWith('catalogue:'))
  assert.equal(catalogues.length, 9)
  for (const entry of catalogues) {
    const exhibitId = entry.id.slice('catalogue:'.length)
    const room = MUSEUM.rooms.find((candidate) => candidate.exhibitIds.includes(exhibitId))
    assert.ok(room)
    for (const last of entry.requires) {
      const action: PlayerAction = { kind: 'hotspot', exhibitId, hotspotId: last.split(':')[2] }
      const seeing = (held: readonly string[]) => {
        const save = saveHolding([`room:${room.id}`, ...held])
        return grantProgress(save, actionGrant(MUSEUM, save, action)).catalogued.includes(exhibitId)
      }
      if (!seeing(entry.requires.filter((asked) => asked !== last))) wrong.push(`${entry.id}: not given by its last detail, ${last}`)
      // And not before: one required detail of two is not the piece turned over.
      if (entry.requires.length > 1 && seeing([])) wrong.push(`${entry.id}: given by ${last} alone`)
    }
  }
  assert.deepEqual(wrong, [])
  assert.deepEqual(
    catalogues.filter((entry) => entry.requires.length > 1).map((entry) => entry.id),
    ['catalogue:ball-spalding'],
    'the one piece with two required details, which is what the "not before" above is asked of',
  )

  // Every atom of the end is given by some record whose guards were all met
  // no later than the level it appears on: nothing in the script is unexplained.
  const level = new Map(played.levels.flatMap((atoms, index) => atoms.map((entry) => [entry, index] as const)))
  const unexplained = MAXIMUM_END.filter(
    (entry) =>
      !played.actions.some(
        (candidate) =>
          candidate.grants.includes(entry) &&
          candidate.requires.every((asked) => (level.get(asked) ?? Number.POSITIVE_INFINITY) <= (level.get(entry) as number)),
      ),
  )
  assert.deepEqual(unexplained, ['room:office'], 'only where the night begins is given by nothing')
  // And no record met gives something the play never had.
  assert.deepEqual(played.actions.flatMap((entry) => entry.grants).filter((given) => !MAXIMUM_END.includes(given)), [])
  // Every record she met is one the content offers, word for word.
  const offered = new Map(contentActions(MUSEUM).map((entry) => [entry.id, entry]))
  assert.deepEqual(played.actions.filter((entry) => JSON.stringify(offered.get(entry.id)) !== JSON.stringify(entry)), [])
})

await test('from a save, she keeps what it holds and reaches the same end', () => {
  for (const [name, fixture] of Object.entries(SAVE_FIXTURES)) {
    const loaded = migrateProgress(throughJson(fixture.save.progress))
    const result = simulateProgress(MUSEUM, loaded)
    const end = endOf(result.final)
    assert.deepEqual(atomsOf(loaded).filter((entry) => !end.includes(entry)), [], `${name}: something of the save is gone`)
    assert.deepEqual(MAXIMUM_END.filter((entry) => !end.includes(entry)), [], `${name}: short of the end`)
    assert.deepEqual(shrunk(loaded as Raw, result.final as Raw), [], name)
    // What the play does not write is exactly as it was loaded.
    assert.deepEqual(result.final.radioMemory, loaded.radioMemory, name)
    assert.deepEqual(result.final.clockSeconds, loaded.clockSeconds, name)
    // The same five accusations: a save does not make a piece cataloguable.
    assert.deepEqual(sorted(result.issues.map((issue) => `${issue.code} ${issue.id}`)), sorted(played.issues.map((issue) => `${issue.code} ${issue.id}`)), name)
  }
  // And she does not write into what she was handed.
  const frozen = Object.freeze(emptyProgress())
  for (const list of Object.values(frozen)) if (Array.isArray(list)) Object.freeze(list)
  assert.doesNotThrow(() => simulateProgress(MUSEUM, frozen))
})

await test('the simulation and the snapshot stay out of everything the game ships', () => {
  // `test:facts` proves no shipped module imports them. This is the other
  // side: neither reaches for the store, a component or a package, so the
  // gate runs them in bare Node and they prove rules, not a page.
  for (const entry of ['content/simulate.ts', 'content/additive.ts']) {
    const graph = staticImportGraph(resolve(ROOT, 'src'), entry)
    assert.deepEqual(graph.unresolved, [], entry)
    assert.deepEqual(graph.packages, [], `${entry} imports a package`)
    assert.deepEqual(
      graph.modules.filter((path) => /^(?:ui|scenes|dev)\//.test(path) || path === 'state/store.ts' || path === 'content/museum.ts'),
      [],
      `${entry} reaches a module that is the game's, not the rules'`,
    )
  }
  const scripts = (JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts
  assert.match(scripts.check, /npm run test:navigation && npm run test:playthrough && /, 'the suite is not in `npm run check`, after the navigation')
  assert.equal(scripts['graph:snapshot'], 'node --experimental-strip-types scripts/graph-snapshot.ts')
  assert.ok(!scripts.check.includes('graph:snapshot'), 'the gate writes the snapshot it is supposed to be held to')
})

// ---------------------------------------------------------------------------
// The robot, on the real store (M10)
// ---------------------------------------------------------------------------

/** Makes a press the simulation offers, and holds the store to what the simulation said. */
function step(page: Awaited<ReturnType<typeof openGame>>, action: PlayerAction) {
  const room = page.state().currentRoom
  const before = page.progress()
  assert.ok(
    availableActions(MUSEUM, before, room).some((candidate) => sameAction(candidate, action)),
    `"${describe(action)}" is not offered in ${room}`,
  )
  press(page, MUSEUM, action)
  assert.equal(pressProblem(MUSEUM, room, action, before, page.progress()), null)
}
const door = (doorId: string, from: string, to: string): PlayerAction => ({ kind: 'door', doorId, from, to })

await test('the canonical route is playable in its order, ends on the critical path, and play goes on from there to the end', async () => {
  // The route of the plan's §2.4: I-01, I-07, I-08, I-09, I-10, I-11a, I-15, I-12.
  const page = await openGame()
  page.state().start()
  const route: readonly PlayerAction[] = [
    { kind: 'power', roomId: 'office' }, // I-01, the lamp
    door('atrium-to-office', 'office', 'atrium'), // I-07
    { kind: 'power', roomId: 'atrium' }, // I-08
    door('atrium-to-holyoke', 'atrium', 'holyoke'), // I-09
    { kind: 'power', roomId: 'holyoke' }, // I-10
    { kind: 'hotspot', exhibitId: 'portrait-morgan', hotspotId: 'date' }, // I-11a, the year
    door(SHORTCUT, 'holyoke', 'atrium'), // I-15, out by the shortcut
    door('atrium-to-office', 'atrium', 'office'),
    { kind: 'container', containerId: 'office-cabinet' }, // the touch that brings the keypad up
    { kind: 'code', lockId: 'office-drawer', entry: '1896' }, // I-12
  ]
  for (const action of route) step(page, action)

  const critical = sorted([
    'room:office',
    'room:atrium',
    'room:holyoke',
    'power:office',
    'power:atrium',
    'power:holyoke',
    `door:${SHORTCUT}`,
    'detail:portrait-morgan:date',
    'fact:springfield-renaming',
    'cat:portrait-morgan',
    'seen:office-drawer',
    'lock:office-drawer',
    'doc:doc-predecessor',
  ])
  assert.deepEqual(endOf(page.progress()), critical)
  // The route skips the notebook, the radio and eight pieces: it is the
  // shortest way to the drawer, not the end of the game. From its last step
  // the robot reaches the end like anybody else.
  assert.deepEqual(critical.filter((entry) => !MAXIMUM_END.includes(entry)), [])
  const night = await playToEnd(page, MUSEUM, seeded(1896))
  assert.deepEqual(endOf(night.page.progress()), MAXIMUM_END)
})

const ONE_SEED = process.env.SEED === undefined ? null : Number(process.env.SEED)

await test('five hundred shuffled orders, with wasted presses and closed tabs, all end where the simulation ends', async () => {
  const seeds = ONE_SEED === null ? Array.from({ length: 500 }, (_, index) => index + 1) : [ONE_SEED]
  const failed: string[] = []
  const openings = new Set<string>()
  let presses = 0
  let wasted = 0
  let reloads = 0
  const began = performance.now()
  for (const seed of seeds) {
    try {
      const night = await playToEnd(await openGame(), MUSEUM, seeded(seed))
      if (ONE_SEED !== null) console.log(night.log.map((line) => `        ${line}`).join('\n'))
      presses += night.presses
      wasted += night.wasted
      reloads += night.reloads
      openings.add(night.log.filter((line) => line.startsWith('do:')).slice(0, 6).join('|'))
      assert.deepEqual(endOf(night.page.progress()), MAXIMUM_END, 'the night ended somewhere else')
      // And the end is still the end after one more trip through the disk.
      assert.deepEqual(endOf((await reload(night.page)).progress()), MAXIMUM_END, 'the end did not survive the disk')
    } catch (error) {
      failed.push(`seed ${seed}: ${error instanceof Error ? error.message.split('\n')[0] : error}`)
    }
  }
  const seconds = (performance.now() - began) / 1000
  console.log(
    `        ${seeds.length} night(s) · ${presses} presses, ${wasted} of them for nothing · ${reloads} tabs closed · ${seconds.toFixed(1)} s`,
  )
  assert.deepEqual(failed.slice(0, 5), [], `${failed.length} night(s) failed. \`SEED=<n> npm run test:playthrough\` plays one again and prints it.`)
  if (ONE_SEED !== null) return
  // The robot is not five hundred copies of one night.
  assert.ok(openings.size > 200, `only ${openings.size} different openings in 500 nights: the order is not being shuffled`)
  assert.ok(reloads > 500, `only ${reloads} reloads in 500 nights`)
  assert.ok(wasted > 2000, `only ${wasted} wasted presses in 500 nights`)
  // About eight seconds on the machine that wrote it. The bound is loose on
  // purpose: it is there for a robot that has started walking in circles,
  // not for a slow disk.
  assert.ok(seconds < 120, `the five hundred nights took ${seconds.toFixed(1)} s`)
})

await test('the player who skips everything optional ends in the same place, less the steps skipped (V7)', async () => {
  // Never reads the notebook, never takes the radio, never lights the torch.
  const journal = new Set(MUSEUM.rooms.flatMap((room) => (room.containers ?? []).filter((container) => container.carriesJournal).map((container) => container.id)))
  const skipper: RobotProfile = {
    ...ORDINARY,
    noTorch: true,
    skips: (action) => action.kind === 'take' || (action.kind === 'container' && journal.has(action.containerId)),
  }
  assert.deepEqual([...journal], ['office-notebook'])
  const skipped = ['doc:doc-welcome', 'carried:office-radio']
  for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
    const night = await playToEnd(await openGame(), MUSEUM, seeded(seed), skipper)
    assert.deepEqual(endOf(night.page.progress()), MAXIMUM_END.filter((entry) => !skipped.includes(entry)), `seed ${seed}`)
    assert.equal(night.page.state().flashlightUsed, false, 'the torch was lit')
    assert.ok(!night.log.some((line) => /office-notebook|office-radio/.test(line)), `seed ${seed} touched what it skips`)
  }
})

await test('the player who types the year without having read it only gets the drawer early: the end is the same', async () => {
  // The shortcut the plan names in 1.4: the keypad compares digits, and takes
  // the year from somebody who never saw the portrait.
  const page = await openGame()
  page.state().start()
  step(page, { kind: 'container', containerId: 'office-cabinet' })
  assert.deepEqual(endOf(page.progress()), ['room:office', 'seen:office-drawer'])
  const guess: PlayerAction = { kind: 'code', lockId: 'office-drawer', entry: '1896' }
  const before = page.progress()
  assert.ok(!availableActions(MUSEUM, before, 'office').some((candidate) => candidate.kind === 'code'), 'the simulation types a code it has not learnt')
  press(page, MUSEUM, guess)
  assert.deepEqual(endOf(page.progress()), sorted(['room:office', 'seen:office-drawer', 'lock:office-drawer', 'doc:doc-predecessor']))
  // Which the check between store and simulation calls by its name.
  assert.match(pressProblem(MUSEUM, 'office', guess, before, page.progress()) ?? '', /the store accepted "type 1896 at office-drawer" in office, which the simulation does not offer there/)
  // A wrong year costs nothing and writes nothing.
  const fresh = await openGame()
  fresh.state().start()
  step(fresh, { kind: 'container', containerId: 'office-cabinet' })
  const shut = fresh.progress()
  press(fresh, MUSEUM, { kind: 'code', lockId: 'office-drawer', entry: '1895' })
  assert.equal(fresh.progress(), shut, 'a wrong code wrote to the save')

  const guesser: RobotProfile = { ...ORDINARY, guessesCodes: true }
  for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
    const night = await playToEnd(await openGame(), MUSEUM, seeded(seed), guesser)
    assert.deepEqual(endOf(night.page.progress()), MAXIMUM_END, `seed ${seed}`)
  }
})

await test('every save of the corpus, loaded and played to the end, loses nothing and gets there', async () => {
  for (const [name, fixture] of Object.entries(SAVE_FIXTURES)) {
    for (const seed of [7, 77, 777]) {
      const page = await openGame(fixture.save)
      const loaded = throughJson(page.progress()) as Raw
      const held = endOf(loaded)
      const night = await playToEnd(page, MUSEUM, seeded(seed))
      const end = night.page.progress() as Raw
      assert.deepEqual(shrunk(loaded, end), [], `${name}, seed ${seed}`)
      assert.deepEqual(held.filter((entry) => !endOf(end).includes(entry)), [], `${name}, seed ${seed}: an atom of the save is gone`)
      assert.deepEqual(MAXIMUM_END.filter((entry) => !endOf(end).includes(entry)), [], `${name}, seed ${seed}: short of the end`)
      // The robot on the store and the simulation in Node agree from a save too.
      assert.deepEqual(endOf(end), endOf(simulateProgress(MUSEUM, migrateProgress(throughJson(fixture.save.progress))).final), `${name}, seed ${seed}`)
      // The settings of whoever played it are theirs.
      assert.deepEqual(night.page.state().settings, { ...page.state().settings }, name)
    }
  }
})

await test('the shortcut opens from the atrium after the first way out, and is still open after a reload', async () => {
  let page = await openGame()
  page.state().start()
  for (const action of [{ kind: 'power', roomId: 'office' } as const, door('atrium-to-office', 'office', 'atrium')]) step(page, action)

  // From the atrium, on the first night: barred. The press is answered and writes nothing.
  const fromAtrium = door(SHORTCUT, 'atrium', 'holyoke')
  const offeredInAtrium = () => availableActions(MUSEUM, page.progress(), 'atrium').some((candidate) => sameAction(candidate, fromAtrium))
  assert.equal(offeredInAtrium(), false)
  const barred = page.progress()
  press(page, MUSEUM, fromAtrium)
  assert.equal(page.progress(), barred)
  assert.equal(page.state().currentRoom, 'atrium')

  // Round by the main door, and out by the shortcut.
  step(page, door('atrium-to-holyoke', 'atrium', 'holyoke'))
  assert.deepEqual(page.progress().doorsReleased, [])
  step(page, door(SHORTCUT, 'holyoke', 'atrium'))
  assert.deepEqual(page.progress().doorsReleased, [SHORTCUT])
  assert.equal(page.state().currentRoom, 'atrium')
  assert.equal(offeredInAtrium(), true)
  step(page, fromAtrium)
  assert.equal(page.state().currentRoom, 'holyoke')

  // The tab is closed. A new night begins in the office, and the door has no wrong side.
  page = await reload(page)
  assert.equal(page.state().currentRoom, 'office')
  assert.deepEqual(page.savedProgress()?.doorsReleased, [SHORTCUT])
  step(page, door('atrium-to-office', 'office', 'atrium'))
  assert.equal(offeredInAtrium(), true)
  step(page, fromAtrium)
  assert.equal(page.state().currentRoom, 'holyoke')
  assert.deepEqual(page.progress().doorsReleased, [SHORTCUT], 'released twice')

  // A save that came back short is caught at the reload. Left to the end of
  // the night it would not be: the robot would walk round and push the door
  // again, and end where it should, having lost what a player would miss.
  page.leave()
  const written = JSON.parse(page.savedText() ?? '{}') as { progress: Raw }
  assert.deepEqual(written.progress.doorsReleased, [SHORTCUT])
  // The same tab, with a disk that forgot the door.
  const forgetful = {
    ...page,
    leave: () => {},
    savedText: () => JSON.stringify({ ...written, progress: { ...written.progress, doorsReleased: [] } }),
  }
  await assert.rejects(reload(forgetful), /the save lost something on its way through the disk: doorsReleased lost "atrium-from-holyoke-shortcut"/)
})

await test('the store and the simulation are held against each other, press by press, and the check bites', async () => {
  // Two museums that differ in one thing: in `shrunk`, the gymnasium
  // photograph is small enough for its detail to be found.
  const shrunkPhoto = withExhibits((exhibit) => (exhibit.id === 'photo-gym' ? { ...exhibit, scale: 0.5 } : exhibit))
  const photo: PlayerAction = { kind: 'hotspot', exhibitId: 'photo-gym', hotspotId: 'apparatus' }
  const inHolyoke = async () => {
    const page = await openGame()
    page.state().start()
    for (const action of [{ kind: 'power', roomId: 'office' } as const, door('atrium-to-office', 'office', 'atrium'), door('atrium-to-holyoke', 'atrium', 'holyoke')]) {
      step(page, action)
    }
    return page
  }
  assert.ok(availableActions(shrunkPhoto, saveHolding(['room:holyoke']), 'holyoke').some((candidate) => sameAction(candidate, photo)))
  assert.ok(!availableActions(MUSEUM, saveHolding(['room:holyoke']), 'holyoke').some((candidate) => sameAction(candidate, photo)))

  // The simulation offers a detail and no hand finds it: this is the state
  // the lot was in while the three pieces were still offered.
  const offeredOnly = await inHolyoke()
  const before = offeredOnly.progress()
  press(offeredOnly, MUSEUM, photo)
  assert.equal(offeredOnly.progress(), before, 'the hand found a detail the ruler puts out of reach')
  assert.match(
    pressProblem(shrunkPhoto, 'holyoke', photo, before, offeredOnly.progress()) ?? '',
    /the simulation offers "detail photo-gym:apparatus" in holyoke \(hotspot:photo-gym:apparatus\) and the store did something else: it did not write .*detail:photo-gym:apparatus/,
  )
  // And a night played with that simulation does not end: it stops at the press.
  await assert.rejects(
    playToEnd(await openGame(), shrunkPhoto, seeded(3), { reloadChance: 0, uselessChance: 0 }, MUSEUM),
    /the simulation offers "detail photo-gym:apparatus" in holyoke .* it did not write/,
  )

  // The store takes a press the simulation never offered.
  const tookMore = await inHolyoke()
  const earlier = tookMore.progress()
  press(tookMore, shrunkPhoto, photo)
  assert.ok(tookMore.progress().catalogued.includes('photo-gym'))
  assert.match(pressProblem(MUSEUM, 'holyoke', photo, earlier, tookMore.progress()) ?? '', /the store accepted "detail photo-gym:apparatus" in holyoke, which the simulation does not offer there: it wrote .*cat:photo-gym/)

  // Every press a room's furniture offers is one or the other, on a night in
  // which all of them are tried: offered and written as said, or not offered
  // and not written.
  const page = await openGame()
  page.state().start()
  let tried = 0
  let refused = 0
  for (let round = 0; round < 6; round += 1) {
    for (const room of ['office', 'atrium', 'holyoke', 'atrium', 'office']) {
      if (page.state().currentRoom !== room) {
        const way = availableActions(MUSEUM, page.progress(), page.state().currentRoom).find((candidate) => candidate.kind === 'door' && candidate.to === room)
        if (!way) continue
        step(page, way)
      }
      for (const action of everyPress(MUSEUM, page.progress(), room)) {
        const save = page.progress()
        press(page, MUSEUM, action)
        assert.equal(pressProblem(MUSEUM, room, action, save, page.progress()), null)
        tried += 1
        if (page.progress() === save) refused += 1
        // A door that opened took her through it: back, for the rest of the room.
        if (page.state().currentRoom === room) continue
        const back = availableActions(MUSEUM, page.progress(), page.state().currentRoom).find((candidate) => candidate.kind === 'door' && candidate.to === room)
        assert.ok(back, `no way back to ${room}`)
        step(page, back)
      }
    }
  }
  assert.deepEqual(endOf(page.progress()), MAXIMUM_END, 'pressing everything everywhere did not reach the end')
  assert.ok(tried > 200 && refused > 100, `${tried} presses tried, ${refused} for nothing`)
})

// ---------------------------------------------------------------------------
// A lot only adds (M39)
// ---------------------------------------------------------------------------

const NOW = graphSnapshot(MUSEUM, CONTENT_LOT)
const additive = (previous: GraphSnapshot, content: MuseumContent, aliases: readonly SaveAlias[] = []) =>
  validateAdditive(previous, content, aliases).map((issue) => `${issue.code} ${issue.id}`)

/** The museum with the notebook's two "all of them" written as the ids they mean today. */
const NAMED_LISTS = withDocuments((doc) => ({
  ...doc,
  pages: doc.pages?.map((page) => ({
    ...page,
    items: page.items?.map((item) =>
      item.doneWhen?.allRoomsPowered
        ? { ...item, doneWhen: { powered: ['office', 'atrium', 'holyoke'] } }
        : item.doneWhen?.allCatalogued
          ? { ...item, doneWhen: { catalogued: MUSEUM.exhibits.map((exhibit) => exhibit.id) } }
          : item,
    ),
  })),
}))

await test('the content against its own snapshot is accused of nothing', () => {
  assert.deepEqual(validateAdditive(NOW, MUSEUM), [])
  assert.equal(NOW.lot, CONTENT_LOT)
  assert.equal(NOW.actions.length, played.actions.length)
  assert.deepEqual(NOW.actions.map((entry) => entry.id), sorted(played.actions.map((entry) => entry.id)))
  // "All rooms" and "all catalogued" are written as the ids they mean today.
  assert.deepEqual(NOW.checklist, [
    { id: 'notebook.todo.catalogue', doneWhen: sorted(MUSEUM.exhibits.map((exhibit) => `cat:${exhibit.id}`)) },
    { id: 'notebook.todo.power', doneWhen: ['power:atrium', 'power:holyoke', 'power:office'] },
    { id: 'notebook.todo.vault', doneWhen: null },
  ])
  assert.deepEqual(NOW.terms, [])
  assert.deepEqual(NOW.ids.rooms, ['atrium', 'holyoke', 'office'])
  assert.deepEqual(NOW.ids.doors, [SHORTCUT, 'atrium-to-holyoke', 'atrium-to-office'])
  assert.deepEqual(NOW.ids.locks, ['office-drawer'])
  assert.deepEqual(NOW.ids.devices, ['office-clock', 'office-radio'])
  assert.equal(NOW.ids.exhibits.length, 12)
  assert.equal(NOW.ids.hotspots.length, 21)
  assert.deepEqual(NOW.ids.triggers, [])
  // Every field of the save's table, by kind.
  assert.deepEqual(Object.keys(NOW.saveFields), sorted(Object.keys(PROGRESS_FIELDS)))
  assert.equal(NOW.saveFields.doorsReleased, 'list')
  assert.equal(NOW.saveFields.contentLot, 'number')
  assert.equal(NOW.saveFields.clockSeconds, 'record')
  assert.equal(NOW.saveFields.lastRoom, 'string')
})

await test('adding is free: a room, a piece, a paper, a detail, a trigger and a field', () => {
  const grown: MuseumContent = {
    ...MUSEUM,
    rooms: [
      ...MUSEUM.rooms.map((room) =>
        room.id === 'atrium'
          ? { ...room, exhibitIds: [...room.exhibitIds, 'new-piece'], portals: [...room.portals, { ...room.portals[0], id: 'atrium-to-paris', toRoom: 'paris' as const, transitionDoor: undefined }] }
          : room,
      ),
      { ...MUSEUM.rooms[0], id: 'paris', portals: [{ ...MUSEUM.rooms[0].portals[0], id: 'paris-to-atrium', toRoom: 'atrium', transitionDoor: undefined }], exhibitIds: [], containers: [], devices: [], powerControl: undefined, startsPowered: true },
    ],
    exhibits: [
      ...MUSEUM.exhibits.map((exhibit) =>
        exhibit.id === 'ball-improvised'
          ? { ...exhibit, hotspots: [...exhibit.hotspots, { ...exhibit.hotspots[0], id: 'patch', requiredForCatalogue: false }] }
          : exhibit,
      ),
      { ...MUSEUM.exhibits[0], id: 'new-piece' },
    ],
    // The notebook's list with its ids named, as the next lot freezes it.
    documents: [...NAMED_LISTS.documents, { ...MUSEUM.documents[0], id: 'doc-new', containerId: 'holyoke-cabinet-b' }],
    locks: MUSEUM.locks.map((lock) => ({ ...lock, onOpen: [{ kind: 'set-flag', flag: 'drawer-open' }] })),
    triggers: [{ id: 'new-trigger', when: { flags: ['drawer-open'] }, effects: [{ kind: 'reveal-document', documentId: 'doc-new' }] }],
  }
  assert.deepEqual(additive(NOW, grown), [])
  // The one thing that is not free while the list still says "all of them":
  // a thirteenth piece changes what "catalogue everything" waits for. Which
  // is why the lists get their ids named before the museum grows (the plan's
  // DL2-17). The new room came with its lights on, so "light everything"
  // waits for what it did; a dark one is in the test after next.
  assert.deepEqual(additive(NOW, { ...grown, documents: [...MUSEUM.documents, grown.documents[grown.documents.length - 1]] }), [
    'checklist-condition-changed notebook.todo.catalogue',
  ])
  // A snapshot that knew less of the save than the table does now: also fine.
  const { doorsReleased: _, ...fewer } = NOW.saveFields
  assert.deepEqual(additive({ ...NOW, saveFields: fewer }, MUSEUM), [])
})

const patched = (id: string, patch: (entry: ActionRecord) => ActionRecord): GraphSnapshot => {
  assert.ok(NOW.actions.some((entry) => entry.id === id), `${id} is an action of the snapshot`)
  return { ...NOW, actions: NOW.actions.map((entry) => (entry.id === id ? patch(entry) : entry)) }
}

await test('each way of taking something away, on a snapshot made for the purpose', () => {
  // An action the last lot had and this content does not.
  assert.deepEqual(additive({ ...NOW, actions: [...NOW.actions, { id: 'container:atrium-lost-property', requires: ['room:atrium'], grants: ['doc:doc-found'] }] }, MUSEUM), [
    'node-removed container:atrium-lost-property',
  ])
  // An action that asked for less: the office door, when it needed no power.
  assert.deepEqual(additive(patched('door:atrium-to-office:office>atrium', (entry) => ({ ...entry, requires: ['room:office'] })), MUSEUM), [
    'guard-strengthened door:atrium-to-office:office>atrium',
  ])
  // An action that gave more: a cabinet that also taught a fact.
  assert.deepEqual(additive(patched('container:holyoke-cabinet-b', (entry) => ({ ...entry, grants: [...entry.grants, 'fact:lost-fact'] })), MUSEUM), [
    'grant-removed container:holyoke-cabinet-b',
  ])
  // Asking for less, or giving more, than the snapshot says is adding.
  assert.deepEqual(additive(patched('door:atrium-to-office:office>atrium', (entry) => ({ ...entry, requires: [...entry.requires, 'flag:posse-signed'] })), MUSEUM), [])
  assert.deepEqual(additive(patched('container:holyoke-cabinet-b', (entry) => ({ ...entry, grants: [] })), MUSEUM), [])

  // An id a save may hold, gone from every collection in turn.
  for (const collection of Object.keys(NOW.ids) as (keyof GraphSnapshot['ids'])[]) {
    assert.deepEqual(additive({ ...NOW, ids: { ...NOW.ids, [collection]: [...NOW.ids[collection], 'gone-since'] } }, MUSEUM), [
      `id-renamed-without-alias ${collection}:gone-since`,
    ])
  }
  // With a line for it in every list that holds it, the id has a way forward.
  const renamedDocument = { ...NOW, ids: { ...NOW.ids, documents: [...NOW.ids.documents, 'doc-old'] } }
  assert.deepEqual(additive(renamedDocument, MUSEUM, [{ sinceLot: 3, field: 'documentsRead', from: 'doc-old', to: 'doc-welcome' }]), [])
  // A lock is held in two lists, and one line is half an alias.
  const renamedLock = { ...NOW, ids: { ...NOW.ids, locks: [...NOW.ids.locks, 'old-drawer'] } }
  const opened: SaveAlias = { sinceLot: 3, field: 'locksOpened', from: 'old-drawer', to: 'office-drawer' }
  assert.deepEqual(additive(renamedLock, MUSEUM, [opened]), ['id-renamed-without-alias locks:old-drawer'])
  assert.match(validateAdditive(renamedLock, MUSEUM, [opened])[0].message, /`locksSeen`: add a line/)
  assert.deepEqual(additive(renamedLock, MUSEUM, [opened, { ...opened, field: 'locksSeen' }]), [])

  // A line of the list that waits for something else, or is gone.
  assert.deepEqual(additive({ ...NOW, checklist: NOW.checklist.map((item) => (item.id === 'notebook.todo.power' ? { ...item, doneWhen: ['power:atrium', 'power:office'] } : item)) }, MUSEUM), [
    'checklist-condition-changed notebook.todo.power',
  ])
  assert.deepEqual(additive({ ...NOW, checklist: NOW.checklist.map((item) => (item.id === 'notebook.todo.vault' ? { ...item, doneWhen: ['doc:doc-termos'] } : item)) }, MUSEUM), [
    'checklist-condition-changed notebook.todo.vault',
  ])
  assert.deepEqual(additive({ ...NOW, checklist: [...NOW.checklist, { id: 'notebook.todo.gone', doneWhen: null }] }, MUSEUM), [
    'checklist-condition-changed notebook.todo.gone',
  ])
  // A term a player signed.
  assert.deepEqual(additive({ ...NOW, terms: [{ id: 'termo-posse', when: ['doc:doc-termos', 'power:office'] }] }, MUSEUM), ['term-condition-changed termo-posse'])
  // A field of the save that left the table, and one that changed its type.
  assert.deepEqual(additive({ ...NOW, saveFields: { ...NOW.saveFields, termsSigned: 'list' } }, MUSEUM), ['save-field-changed termsSigned'])
  assert.deepEqual(additive({ ...NOW, saveFields: { ...NOW.saveFields, clockSeconds: 'list' } }, MUSEUM), ['save-field-changed clockSeconds'])
})

await test('on the real museum: a detail taken out, a door given a lock, a room added to "all rooms"', () => {
  // The date on Morgan's portrait, deleted: the action is gone, the id a save
  // holds is gone, and so is the piece's catalogue entry.
  const dateless = additive(NOW, withExhibits((exhibit) => (exhibit.id === 'portrait-morgan' ? { ...exhibit, hotspots: [] } : exhibit)))
  assert.deepEqual(dateless, ['node-removed catalogue:portrait-morgan', 'node-removed hotspot:portrait-morgan:date', 'id-renamed-without-alias hotspots:portrait-morgan:date'])

  // The main door of Wing 1 given the wing's own power as a lock.
  const locked = withPortals('atrium', (portal) =>
    portal.id === 'atrium-to-holyoke' && portal.transitionDoor
      ? { ...portal, transitionDoor: { ...portal.transitionDoor, requiresPower: 'holyoke' } }
      : portal,
  )
  assert.deepEqual(additive(NOW, locked), [
    'guard-strengthened door:atrium-to-holyoke:atrium>holyoke',
    'guard-strengthened door:atrium-to-holyoke:holyoke>atrium',
  ])
  assert.match(validateAdditive(NOW, locked)[0].message, /asks for more since L2: power:holyoke\./)
  // The simulation says what that does to a new game; the snapshot says what
  // it does to an old one. Both are needed.
  assert.ok(accused(simulateProgress(locked).issues, 'room-unreachable').includes('holyoke'))

  // A drawer that stops holding its letter.
  assert.deepEqual(additive(NOW, { ...MUSEUM, documents: MUSEUM.documents.filter((doc) => doc.id !== 'doc-predecessor') }), [
    'grant-removed code:office-drawer',
    'grant-removed container:office-cabinet',
    'id-renamed-without-alias documents:doc-predecessor',
  ])

  // A room arrives, and "every room has power" now means four.
  const fourth: MuseumContent = {
    ...MUSEUM,
    rooms: [...MUSEUM.rooms, { ...MUSEUM.rooms[0], id: 'paris', portals: [], exhibitIds: [], containers: [], devices: [], powerControl: undefined }],
  }
  assert.deepEqual(additive(NOW, fourth), ['checklist-condition-changed notebook.todo.power'])
  // The same list with the three rooms named, as L3 freezes it: no change at all.
  assert.deepEqual(additive(NOW, NAMED_LISTS), [])
  assert.deepEqual(additive(NOW, { ...NAMED_LISTS, rooms: fourth.rooms }), [], 'a list with its ids named does not move when a room arrives')

  // And the gate applies it when it is handed a snapshot, and only then.
  const gate = (previousGraph?: GraphSnapshot) => validateContent(locked, undefined, undefined, undefined, previousGraph ? { previousGraph } : {})
  assert.equal(accused(gate(NOW), 'guard-strengthened').length, 2)
  assert.equal(accused(gate(), 'guard-strengthened').length, 0)
})

await test('a renamed id with its aliases takes nothing away, in what is given and in what an action is called', () => {
  // The letter in the drawer under a new id (as L3 does with the handover).
  const letter = withDocuments((doc) => (doc.id === 'doc-predecessor' ? { ...doc, id: 'doc-otavio-handover' } : doc))
  assert.deepEqual(additive(NOW, letter), [
    'grant-removed code:office-drawer',
    'grant-removed container:office-cabinet',
    'id-renamed-without-alias documents:doc-predecessor',
  ])
  assert.deepEqual(additive(NOW, letter, [{ sinceLot: 3, field: 'documentsRead', from: 'doc-predecessor', to: 'doc-otavio-handover' }]), [])

  // A piece under a new id: its details, its entry and the actions named after it.
  const piece = withRooms((room) => ({ ...room, exhibitIds: room.exhibitIds.map((id) => (id === 'ball-improvised' ? 'ball-bladder' : id)) }))
  const renamedPiece: MuseumContent = { ...piece, exhibits: MUSEUM.exhibits.map((exhibit) => (exhibit.id === 'ball-improvised' ? { ...exhibit, id: 'ball-bladder' } : exhibit)) }
  assert.deepEqual(additive(NOW, renamedPiece), [
    'node-removed catalogue:ball-improvised',
    'node-removed hotspot:ball-improvised:valve',
    'id-renamed-without-alias exhibits:ball-improvised',
    'id-renamed-without-alias hotspots:ball-improvised:valve',
    // "Catalogue everything" names the piece too, by the id it had.
    'checklist-condition-changed notebook.todo.catalogue',
  ])
  assert.deepEqual(
    additive(NOW, renamedPiece, [
      { sinceLot: 3, field: 'catalogued', from: 'ball-improvised', to: 'ball-bladder' },
      { sinceLot: 3, field: 'hotspots', from: 'ball-improvised:valve', to: 'ball-bladder:valve' },
    ]),
    [],
  )
})

await test('the snapshot on disk: written by the script, the content\'s own while the lot is open, a record once it is published', () => {
  const directory = resolve(ROOT, RELEASES_DIRECTORY)
  const newest = newestSnapshot(directory)
  assert.ok(newest, `${RELEASES_DIRECTORY} holds no snapshot: run \`npm run graph:snapshot\``)
  const gate = snapshotForGate(newest, CONTENT_LOT)
  assert.deepEqual(gate.issues, [])
  assert.ok(gate.graph)

  // In the shape the script writes: one action to a line, everything sorted.
  // A file edited by hand, or by a formatter, does not read back as itself.
  assert.equal(serialiseGraphSnapshot(parseGraphSnapshot(newest.text)), newest.text, `${newest.path} was not written by \`npm run graph:snapshot\``)
  for (const list of [gate.graph.actions.map((entry) => entry.id), gate.graph.checklist.map((item) => item.id), ...Object.values(gate.graph.ids), Object.keys(gate.graph.saveFields)]) {
    assert.deepEqual(list, sorted(list))
  }
  for (const entry of gate.graph.actions) {
    assert.deepEqual([entry.requires, entry.grants], [sorted(entry.requires), sorted(entry.grants)], entry.id)
  }
  // Writing twice changes no byte.
  assert.equal(serialiseGraphSnapshot(graphSnapshot(MUSEUM, CONTENT_LOT)), serialiseGraphSnapshot(NOW))
  assert.ok(!serialiseGraphSnapshot(NOW).includes('\r') && serialiseGraphSnapshot(NOW).endsWith('}\n'))

  // The content takes nothing from what the snapshot recorded, whichever lot wrote it.
  assert.deepEqual(validateAdditive(gate.graph, MUSEUM), [])

  // While the plan does not yet say the snapshot's lot is done, the lot is
  // still being written and the file has to be the content's own, byte for
  // byte: whatever a later slice adds, the snapshot that is published has it.
  // Once the plan says «Feito em», the file is a record. Nothing here asks it
  // to follow the content again, and `graph:snapshot` cannot rewrite it,
  // because by then `CONTENT_LOT` has moved on or soon will.
  const plan = readFileSync(resolve(ROOT, 'docs/PLANO-ATE-O-FINAL.md'), 'utf8')
  if (newest.lot > lastLotDone(plan)) {
    assert.equal(newest.lot, CONTENT_LOT, `${newest.path} is of a lot the content is not at`)
    assert.equal(
      newest.text,
      serialiseGraphSnapshot(NOW),
      `${newest.path} is not the graph of the content as it stands: L${newest.lot} is still open, so run \`npm run graph:snapshot\` and commit the file`,
    )
  }
})

await test('the gate refuses to run without a snapshot, with one a lot too old, or with one nobody wrote', () => {
  const directory = mkdtempSync(join(tmpdir(), 'museum-releases-'))
  try {
    const write = (name: string, text: string) => writeFileSync(join(directory, name), text, 'utf8')
    const codes = (lot: number) => snapshotForGate(newestSnapshot(directory), lot).issues.map((issue) => `${issue.severity} ${issue.code}`)

    // Nothing there, or no directory at all: this is the state before the first snapshot.
    assert.deepEqual(codes(2), ['error graph-snapshot-missing'])
    assert.equal(newestSnapshot(join(directory, 'not-there')), null)
    assert.deepEqual(snapshotForGate(null, 2).issues.map((issue) => issue.code), ['graph-snapshot-missing'])
    assert.equal(snapshotForGate(null, 2).graph, null)
    write('notes.md', 'not a snapshot')
    assert.deepEqual(codes(2), ['error graph-snapshot-missing'])

    // The lot in progress and the one before it are recent enough.
    write(snapshotFileName(2), serialiseGraphSnapshot(graphSnapshot(MUSEUM, 2)))
    assert.deepEqual(codes(2), [])
    assert.deepEqual(codes(3), [])
    assert.equal(snapshotForGate(newestSnapshot(directory), 3).graph?.lot, 2)
    // A whole lot closed without writing its own.
    assert.deepEqual(codes(4), ['error graph-snapshot-stale'])

    // The newest is the highest lot, not the last name in the directory.
    write(snapshotFileName(10), serialiseGraphSnapshot(graphSnapshot(MUSEUM, 10)))
    assert.equal(newestSnapshot(directory)?.lot, 10)
    assert.deepEqual(codes(11), [])

    // A file renamed by hand, and one that is not a snapshot.
    write(snapshotFileName(11), serialiseGraphSnapshot(graphSnapshot(MUSEUM, 10)))
    assert.deepEqual(codes(11), ['error graph-snapshot-invalid'])
    write(snapshotFileName(11), '{ "lot": 11 }')
    assert.deepEqual(codes(11), ['error graph-snapshot-invalid'])
    write(snapshotFileName(11), 'not json')
    assert.deepEqual(codes(11), ['error graph-snapshot-invalid'])

    // A checkout that turned the line ends is the same file.
    mkdirSync(join(directory, 'crlf'))
    writeFileSync(join(directory, 'crlf', snapshotFileName(2)), serialiseGraphSnapshot(NOW).replaceAll('\n', '\r\n'), 'utf8')
    assert.equal(newestSnapshot(join(directory, 'crlf'))?.text, serialiseGraphSnapshot(NOW))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
  // And the gate script asks: it reads the newest, and hands it to the gate.
  const script = readFileSync(resolve(ROOT, 'scripts/validate-content.ts'), 'utf8')
  assert.match(script, /snapshotForGate\(snapshot, CONTENT_LOT\)/)
  assert.match(script, /previousGraph: previous\.graph/)
  assert.match(script, /\.\.\.previous\.issues,/)
  assert.match(script, /formatScript\(simulateProgress\(MUSEUM\)\.levels\)/)
})

done('playthrough checks')
