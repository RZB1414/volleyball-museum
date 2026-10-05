/**
 * Headless proof that the museum can be played, and that a lot takes nothing
 * away from the players of the lot before.
 *
 *   npm run test:playthrough
 *   npm run test:playthrough -- --seed <n>     the same, after printing night <n> press by press
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
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Vector3 } from 'three'

import {
  describe,
  endOf,
  everyPress,
  luckyDetail,
  ORDINARY,
  playToEnd,
  press,
  pressProblem,
  reload,
  sameAction,
  seedAsked,
  type RobotProfile,
} from './lib/playthrough.ts'
import {
  baselineSnapshot,
  FIRST_SNAPSHOT_LOT,
  FROZEN_SNAPSHOTS,
  frozenSnapshotProblems,
  newestSnapshot,
  RELEASES_DIRECTORY,
  snapshotDigest,
  snapshotFileName,
  snapshotForGate,
  snapshotsIn,
  snapshotWriteRefusal,
} from './lib/graphSnapshots.ts'
import { lastLotDone, lastLotPublished } from './lib/planLots.ts'
import { examineWiringProblems, squeezed, type SourceReader } from './lib/runtimeWiring.ts'
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
import { validateContent, validateEnding, type ValidationIssue } from '../src/content/validate.ts'
import { checklistRows } from '../src/engine/checklist.ts'
import {
  EXAMINE_HOLD_DISTANCE,
  EXAMINE_HOTSPOT_DOT,
  EXAMINE_MIN_CONE_DEGREES,
  examineConeDegrees,
  examineReach,
} from '../src/engine/examineReach.ts'
import { toolSpent } from '../src/engine/lockRules.ts'
import { startDueSequenceOn } from '../src/engine/sequenceDirector.ts'
import { emptyProgress, grantProgress, PROGRESS_FIELDS, type Progress, type ProgressGrant } from '../src/state/progressFields.ts'
import { migrateProgress } from '../src/state/saveMigrations.ts'
import { readText } from './lib/readText.ts'

// The museum hands the store its rules as the canvas chunk arrives. Here, now:
// every store this suite opens is created with them in place. (Imported for
// that alone: no case registers a house of its own any more, since the chain
// of the Posse is the museum's.)
await import('../src/engine/contentRegistry.ts')

type Room = MuseumContent['rooms'][number]
type Exhibit = MuseumContent['exhibits'][number]
type Document = MuseumContent['documents'][number]
type Raw = Record<string, unknown>

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource: SourceReader = (path) => readText(new URL(`../src/${path}`, import.meta.url))
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

  // Two questions, and the ruler answers both. Whether the view WOULD record
  // a detail, were the camera ever inside its cone (`shows`): that is the
  // component's whole test. And whether a hand gets there (`reachable`):
  // that is what the play is planned on. The photograph is where they part.
  assert.deepEqual(
    [cone('photo-gym', 'apparatus'), cone('gym-suit', 'knit'), cone('net-1897', 'tape')].map((reach) => [reach.shows, reach.reachable]),
    [[true, false], [false, false], [false, false]],
  )
  for (const exhibit of MUSEUM.exhibits) {
    for (const hotspot of exhibit.hotspots) {
      const reach = examineReach(exhibit, hotspot)
      assert.equal(reach.shows, reach.coneDegrees > 0, `${exhibit.id}:${hotspot.id}`)
      assert.ok(reach.shows || !reach.reachable, `${exhibit.id}:${hotspot.id} is reachable and never shows`)
    }
  }
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

/**
 * The furthest the game of this lot goes, list by list: the lot plan's
 * acceptance. Since L3 that is the Posse: the drawer hands over the key of
 * the iron safe, the safe holds the Book of Deeds and the label proof, and
 * the deed of office is signed at the lectern of the hall.
 */
const MAXIMUM = {
  roomsVisited: ['office', 'atrium', 'holyoke'],
  roomsPowered: ['office', 'atrium', 'holyoke'],
  doorsReleased: ['atrium-from-holyoke-shortcut'],
  locksOpened: ['office-drawer', 'office-safe'],
  locksSeen: ['office-drawer', 'office-safe'],
  documentsRead: [
    'doc-welcome',
    'doc-invention-date',
    'doc-halstead',
    'doc-rule-changes',
    // The handover sheet, where the predecessor's note was; the Book and the
    // proof out of the safe; Otávio's message, heard to its last line.
    'doc-otavio-handover',
    'doc-termos',
    'doc-label-proof-office',
    'doc-otavio-tape',
  ],
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
  // Spent on the safe by the end, and still in the save: the save only grows.
  credentials: ['tool:service-key'],
  // The clock on the office wall, put right (a verb of the device), and the
  // deed of office, signed (the term's own trigger). A new game never holds
  // the third flag the house knows, `legacy-pre-L3-drawer`: a migration sets
  // that one, on a save whose drawer was opened before it held a key.
  flags: ['clock-set', 'posse-signed'],
  triggersFired: ['lock:office-drawer:opened', 'term:termo-posse:signed'],
  devicesCarried: ['office-radio'],
  termsSigned: ['termo-posse'],
} as const satisfies ProgressGrant
const MAXIMUM_END = endOf(MAXIMUM)

/**
 * What luck adds to that.
 *
 * The view records a detail the moment its cone holds the camera, however
 * narrow the cone, and the apparatus of the gymnasium photograph has one of
 * 1.5°: three pixels of drag either way. The simulation does not offer it (a
 * player who does not know where to look does not find it), the store takes
 * it, and some nights one of the robot's wasted presses lands there. So a
 * night ends at the maximum, or at the maximum and this. The robot's hand
 * used to refuse the detail by the simulation's own 5°, and the two were
 * then compared with each other: a save the real game can write was outside
 * everything the suite called possible.
 */
const LUCK = sorted(
  MUSEUM.exhibits.flatMap((exhibit) => {
    const narrow = exhibit.hotspots.filter((hotspot) => examineReach(exhibit, hotspot).shows && !examineReach(exhibit, hotspot).reachable)
    if (narrow.length === 0) return []
    // The piece too, when luck is all it was waiting for.
    const never = exhibit.hotspots.some((hotspot) => hotspot.requiredForCatalogue && !examineReach(exhibit, hotspot).shows)
    return [...narrow.map((hotspot) => `detail:${exhibit.id}:${hotspot.id}`), ...(never ? [] : [`cat:${exhibit.id}`])]
  }),
)
const withoutLuck = (end: readonly string[]) => end.filter((entry) => !LUCK.includes(entry))

await test('the furthest the game goes today, atom by atom', () => {
  for (const [field, ids] of Object.entries(MAXIMUM) as [keyof typeof MAXIMUM, readonly string[]][]) {
    assert.deepEqual(sorted(played.final[field]), sorted(ids), field)
  }
  assert.deepEqual(endOf(played.final), MAXIMUM_END)
  // In the plan's words: three rooms lit and visited, eight documents, four
  // facts, nine of twelve pieces, the drawer and the iron safe open and
  // seen, the shortcut released, the office clock set, the key of the safe
  // in the save and spent, and the deed of office signed.
  assert.equal(played.final.catalogued.length, 9)
  assert.deepEqual(played.final.flags, ['clock-set', 'posse-signed'])
  assert.deepEqual(played.final.termsSigned, ['termo-posse'])
  assert.deepEqual(toolSpent(MUSEUM.locks, played.final), ['tool:service-key'])
  // What the game shows by itself she watched as it came: nothing is owed.
  assert.deepEqual(played.final.sequencesSeen, ['seq-posse'])
  assert.equal(MUSEUM.exhibits.length, 12)
  assert.deepEqual(
    sorted(MUSEUM.exhibits.map((exhibit) => exhibit.id).filter((id) => !played.final.catalogued.includes(id))),
    ['gym-suit', 'net-1897', 'photo-gym'],
  )
  // And one piece more for a lucky hand, which no script counts on.
  assert.deepEqual(LUCK, ['cat:photo-gym', 'detail:photo-gym:apparatus'])
  assert.deepEqual(LUCK.filter((entry) => MAXIMUM_END.includes(entry)), [])
  // What the play does not write stays as it was handed over.
  assert.deepEqual(played.final.radioCalls, [])
  assert.equal(played.final.lastRoom, emptyProgress().lastRoom)
})

await test('the script in seven levels: the lamp, the atrium, its light and Wing 1, the wing, the drawer and its key, the iron safe, the Posse', () => {
  // Without the details and the locks touched, which the printed script counts.
  const told = played.levels.map((level) => sorted(level.filter((entry) => !/^(?:detail|seen):/.test(entry))))
  assert.deepEqual(told, [
    sorted(['room:office', 'power:office', 'doc:doc-welcome']),
    // What the lamp makes possible, a level after the lamp: the door, the
    // radio off its charger, the clock put right, and Otávio's message on
    // the answering machine, which is on the mains. (The lot plan filed the
    // clock under the lamp's own level. A level is what could be done with
    // what the level before left, and before the lamp the clock has no mains.)
    sorted(['room:atrium', 'carried:office-radio', 'flag:clock-set', 'doc:doc-otavio-tape']),
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
    // The drawer gives way to the year, and hands over what was pinned to
    // the sheet inside it: the key, by the drawer's own trigger.
    sorted(['lock:office-drawer', 'doc:doc-otavio-handover', 'cred:tool:service-key', 'fired:lock:office-drawer:opened']),
    // The key in the hand a level after the drawer gave it: the iron safe,
    // and the two papers it kept.
    sorted(['lock:office-safe', 'doc:doc-termos', 'doc:doc-label-proof-office']),
    // The Book brings the deed to the lectern, and the house is lit: signed.
    sorted(['term:termo-posse', 'flag:posse-signed', 'fired:term:termo-posse:signed']),
  ])
  assert.deepEqual(
    played.levels.map((level) => level.filter((entry) => entry.startsWith('detail:')).length),
    [0, 0, 8, 9, 0, 0, 0],
  )
  // The drawer is touched the first time she is in the office, and opened
  // four levels later: the year is in the wing. The safe beside it is
  // touched then too, and refuses: it waits for the key.
  assert.ok(played.levels[0].includes('seen:office-drawer') && played.levels[0].includes('seen:office-safe'))
  // The Posse is the last thing in the script, and nothing comes after it.
  assert.deepEqual(played.levels.findIndex((level) => level.includes('flag:posse-signed')), played.levels.length - 1)
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
  assert.equal(printed.length, 7)
  assert.match(printed[0], /^ {2}N0 +room:office · power:office · doc:doc-welcome · \(2 locks touched\)$/)
  assert.match(printed[1], /^ {2}N1 +room:atrium · doc:doc-otavio-tape · flag:clock-set · carried:office-radio$/)
  assert.match(printed[3], /^ {2}N3 .*fact:springfield-renaming.*\(9 details\)$/)
  assert.match(printed[4], /^ {2}N4 +lock:office-drawer · doc:doc-otavio-handover · cred:tool:service-key · \(1 triggers\)$/)
  assert.match(printed[5], /^ {2}N5 +lock:office-safe · doc:doc-termos · doc:doc-label-proof-office$/)
  assert.match(printed[6], /^ {2}N6 +flag:posse-signed · term:termo-posse · \(1 triggers\)$/)
})

await test('she accuses the museum of six things, and they are the six that are dated', () => {
  const errors = played.issues.map((issue) => `${issue.severity} ${issue.code} ${issue.id}`)
  // Five the old walk let through, and one of L3's own. (There were six of
  // the first kind. The line about the vault was a box nothing ever ticks;
  // since L3 it is a promise with a date and no box, which is no accusation:
  // `validateDeferred` holds it to its lot instead.)
  assert.deepEqual(sorted(errors), [
    'error checklist-item-untickable notebook.todo.catalogue',
    'error exhibit-uncataloguable gym-suit',
    'error exhibit-uncataloguable net-1897',
    'error exhibit-uncataloguable photo-gym',
    // The rain in the dead air waits for the absence of a flag the pump
    // sets, and the pump is the vault's lot: until then it rains all night.
    'error flag-never-set basement-drained',
    // The detail nothing waits for. It is offered to nobody, so it is in no
    // action and in no snapshot, and the day the net catalogues its debt
    // goes with nothing left to say that the socket is still dead content.
    'error hotspot-unreachable net-1897:socket',
  ])
  // With the table applied, nothing is left, and nothing in the table is paid.
  const owed = debtOf('validate:content').filter((line) =>
    ['exhibit-uncataloguable', 'checklist-item-untickable', 'hotspot-unreachable', 'flag-never-set'].includes(line.code),
  )
  assert.equal(owed.length, 6)
  const settled = settleKnownDebt(played.issues, owed, CONTENT_LOT)
  assert.deepEqual(settled.filter((issue) => issue.severity === 'error'), [])
  assert.deepEqual(sorted(owed.map((line) => `${line.id} L${line.untilLot}`)), [
    'basement-drained L12',
    'gym-suit L4',
    'net-1897 L4',
    'net-1897:socket L4',
    'notebook.todo.catalogue L4',
    'photo-gym L4',
  ])
  // Four details are out of a hand's reach, and each is named by exactly one
  // accusation: the required ones by their piece, the optional one by itself.
  const out = MUSEUM.exhibits.flatMap((exhibit) =>
    exhibit.hotspots.filter((hotspot) => !examineReach(exhibit, hotspot).reachable).map((hotspot) => `${exhibit.id}:${hotspot.id}`),
  )
  assert.deepEqual(sorted(out), ['gym-suit:knit', 'net-1897:socket', 'net-1897:tape', 'photo-gym:apparatus'])
  assert.deepEqual(accused(played.issues, 'hotspot-unreachable'), ['net-1897:socket'])
})

await test('what the rules answer is offered, and what they ignore is not', () => {
  const offered = (atoms: readonly string[], room: string) =>
    availableActions(MUSEUM, saveHolding([`room:${room}`, ...atoms]), room).map(describe)
  const office = (...atoms: string[]) => offered(atoms, 'office')

  // The first minute, in the dark: the lamp, the notebook, the drawer and
  // the iron safe to touch, and the telephone, whose dead line needs no
  // mains (L3). The door waits for the lamp, the radio for its charger and
  // the answering machine for the mains it is plugged into.
  assert.deepEqual(office(), ['power office', 'open office-cabinet', 'open office-notebook', 'open office-safe', 'hear office-telephone'])
  // With the lamp on: its switch has nothing left to do, the door opens,
  // the radio can be taken, the clock, which has its mains back, set, and
  // the machine played.
  assert.deepEqual(office('power:office'), [
    'door atrium-to-office office>atrium',
    'open office-cabinet',
    'open office-notebook',
    'open office-safe',
    'set office-clock',
    'take office-radio',
    'hear office-telephone',
    'hear office-answering-machine',
  ])
  // The notebook that was read left the desk with her, a radio in the hand
  // is not on its charger, and a clock that was put right is not set again.
  assert.deepEqual(office('power:office', 'doc:doc-welcome', 'carried:office-radio'), [
    'door atrium-to-office office>atrium',
    'open office-cabinet',
    'open office-safe',
    'set office-clock',
    'hear office-telephone',
    'hear office-answering-machine',
  ])
  // The machine plays again for whoever has heard it out: it is offered, and gives nothing new.
  assert.deepEqual(office('power:office', 'doc:doc-welcome', 'carried:office-radio', 'flag:clock-set', 'doc:doc-otavio-tape'), [
    'door atrium-to-office office>atrium',
    'open office-cabinet',
    'open office-safe',
    'hear office-telephone',
    'hear office-answering-machine',
  ])
  // The telephone is answered, and gives nothing: no press of it is ever
  // worth making, and it is in no record. The one voice written down is the
  // recording, by the paper it files.
  const dial: PlayerAction = { kind: 'voice', deviceId: 'office-telephone' }
  assert.deepEqual(actionGrant(MUSEUM, saveHolding(['room:office']), dial), {})
  assert.equal(actionRecord(MUSEUM, saveHolding(['room:office']), 'office', dial), null)
  assert.deepEqual(
    contentActions(MUSEUM).filter((entry) => entry.id.startsWith('voice:')),
    [{ id: 'voice:office-answering-machine:doc-otavio-tape', requires: ['power:office', 'room:office'], grants: ['doc:doc-otavio-tape'] }],
    'a dead line is written down as an action that gives something, or the recording is not',
  )
  // The safe, touched with no key, refuses and is on the plan; with the
  // key, the touch opens it and hands over what it kept. The key is asked
  // for by the press, never taken out of the save.
  const safe: PlayerAction = { kind: 'container', containerId: 'office-safe' }
  assert.deepEqual(actionGrant(MUSEUM, saveHolding(['room:office']), safe), { locksSeen: ['office-safe'] })
  assert.deepEqual(actionRecord(MUSEUM, saveHolding(['room:office']), 'office', safe), { id: 'touch:office-safe', requires: ['room:office'], grants: ['seen:office-safe'] })
  assert.deepEqual(actionRecord(MUSEUM, saveHolding(['room:office', 'cred:tool:service-key']), 'office', safe), {
    id: 'container:office-safe',
    requires: ['cred:tool:service-key', 'room:office'],
    grants: ['doc:doc-label-proof-office', 'doc:doc-termos', 'lock:office-safe', 'seen:office-safe'],
  })
  // The lectern offers the deed once the Book is read and the house is lit, and not before.
  const signs = (...atoms: string[]) => offered(atoms, 'atrium').filter((line) => line.startsWith('sign '))
  assert.deepEqual(signs('power:office', 'power:atrium', 'power:holyoke'), [])
  assert.deepEqual(signs('doc:doc-termos', 'power:office', 'power:atrium'), [])
  assert.deepEqual(signs('doc:doc-termos', 'power:office', 'power:atrium', 'power:holyoke'), ['sign termo-posse at atrium-lectern'])
  assert.deepEqual(signs('doc:doc-termos', 'power:office', 'power:atrium', 'power:holyoke', 'term:termo-posse'), [])
  // A flag is not mains: set on another night's save, it still is not offered in the dark.
  assert.ok(!office().includes('set office-clock') && !office('flag:clock-set').includes('set office-clock'))

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
  proves('document-unreadable', 'doc-otavio-handover', yearOnlyIn((doc) => doc))
  // And everything the drawer leads to goes with it: the key, the safe it
  // opens, the Book in the safe and the deed the Book brings to the lectern.
  for (const [code, id] of [
    ['credential-unobtainable', 'tool:service-key'],
    ['lock-unopenable', 'office-safe'],
    ['document-unreadable', 'doc-termos'],
    ['term-unsignable', 'termo-posse'],
    ['sequence-never-plays', 'seq-posse'],
  ] as const) {
    if (!accused(untaught, code).includes(id)) quiet.push(`with the year taught nowhere, ${code} does not accuse "${id}"`)
  }
  if (accused(untaught, 'lock-evidence-behind-lock').length > 0) noisy.push('lock-evidence-behind-lock accuses a lock whose answer is taught nowhere')

  // The year taught only by the letter inside the drawer it opens.
  proves(
    'lock-evidence-behind-lock',
    'office-drawer',
    yearOnlyIn((doc) => (doc.id === 'doc-otavio-handover' ? { ...doc, revealsFactId: 'springfield-renaming' } : doc)),
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

  // A detail nothing waits for, put where no hand turns it: a piece that
  // catalogues all the same, with something on it that is never found.
  const hidden = withExhibits((exhibit) =>
    exhibit.id === 'ball-improvised'
      ? { ...exhibit, hotspots: [...exhibit.hotspots, { ...exhibit.hotspots[0], id: 'underside', localPosition: [0, -0.9, 0], requiredForCatalogue: false }] }
      : exhibit,
  )
  const withHidden = proves('hotspot-unreachable', 'ball-improvised:underside', hidden)
  if (accused(withHidden, 'exhibit-uncataloguable').includes('ball-improvised')) noisy.push('a piece is called uncataloguable for a detail it does not need')
  assert.ok(simulateProgress(hidden).final.catalogued.includes('ball-improvised'))
  // The net with its tape brought within reach and its socket left where it
  // is: the piece catalogues, its own accusation goes, and the socket's stays.
  const tapePaid = simulateProgress(
    withExhibits((exhibit) =>
      exhibit.id === 'net-1897'
        ? { ...exhibit, hotspots: exhibit.hotspots.map((hotspot) => (hotspot.id === 'tape' ? { ...hotspot, localPosition: [0, 0.05, 0.1] } : hotspot)) }
        : exhibit,
    ),
  )
  assert.ok(tapePaid.final.catalogued.includes('net-1897'))
  if (accused(tapePaid.issues, 'exhibit-uncataloguable').includes('net-1897')) noisy.push('exhibit-uncataloguable accuses the net with its tape in reach')
  if (!accused(tapePaid.issues, 'hotspot-unreachable').includes('net-1897:socket')) quiet.push('with the tape paid, nothing says the socket is still out of reach')
  // A required detail out of reach is its piece's accusation, and is not said twice.
  for (const required of ['net-1897:tape', 'gym-suit:knit', 'photo-gym:apparatus']) {
    if (accused(played.issues, 'hotspot-unreachable').includes(required)) noisy.push(`hotspot-unreachable repeats ${required}, which exhibit-uncataloguable already names`)
  }

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
  // (The museum these are added to already waits for one flag nothing
  // sets, the pump's, which is dated; that one is not the test's.)
  const besidesThePump = (ids: readonly string[]) => ids.filter((id) => id !== 'basement-drained')
  for (const code of ['flag-never-set', 'flag-never-read', 'trigger-never-fires']) {
    if (besidesThePump(accused(wired.issues, code)).length > 0) noisy.push(`${code} accuses a flag that is set and read`)
  }
  // A flag waited for by its absence is as loose, when nothing sets it: a
  // hint that holds «until the pump is on» with no pump holds for good.
  assert.deepEqual(accused(played.issues, 'flag-never-set'), ['basement-drained'])
  // And one a device sets by a verb of its own (the clock) is set, and read
  // by the device: neither end is loose.
  assert.deepEqual(accused(played.issues, 'flag-never-read'), [])
  // The two the test added, among the museum's own: the drawer's, which
  // hands over the key, and the deed's, which sets its flag.
  assert.deepEqual(sorted(wired.final.triggersFired), ['hears-it', 'lock:office-drawer:opened', 'says-it', 'term:termo-posse:signed'])

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
  const line = { labelKey: 'made.for.the.test', author: 'helena' } as const
  proves('checklist-item-untickable', 'made.for.the.test', listed(line))
  proves('checklist-item-untickable', 'made.for.the.test', listed({ ...line, doneWhen: { catalogued: ['net-1897'] } }))
  if (accused(simulateProgress(listed({ ...line, doneWhen: { locksOpened: ['office-drawer'] } })).issues, 'checklist-item-untickable').length > 0) {
    noisy.push('checklist-item-untickable accuses an item the play ticks')
  }
  // A line that waits to appear for what no play reaches is never on the
  // list, whatever would tick it; one that waits for what the play does
  // reach is like any other.
  const pencil = { ...line, author: 'curator', doneWhen: { locksOpened: ['office-drawer'] } } as const
  proves('checklist-item-untickable', 'made.for.the.test', listed({ ...pencil, appearsWhen: { catalogued: ['net-1897'] } }))
  if (accused(simulateProgress(listed({ ...pencil, appearsWhen: { documentsRead: ['doc-halstead'] } })).issues, 'checklist-item-untickable').length > 0) {
    noisy.push('checklist-item-untickable accuses a line that appears and is ticked')
  }
  // A promise with a date is a line with no box: nothing ticks it, by
  // design, and the play has no accusation to make of it. With a box as
  // well it is neither one thing nor the other.
  const promise = { ...line, deferredUntilLot: 12, noteKey: 'made.for.the.test.note' } as const
  if (accused(simulateProgress(listed(promise)).issues, 'checklist-item-untickable').length > 0) {
    noisy.push('checklist-item-untickable accuses a dated promise of having no box')
  }
  proves('checklist-deferred-with-box', 'made.for.the.test', listed({ ...promise, doneWhen: { locksOpened: ['office-drawer'] } }))
  // What a line waits to appear for is a condition the content asks: a flag
  // only it reads is read.
  const flagged = simulateProgress({
    ...listed({ ...pencil, appearsWhen: { flags: ['made-for-the-test'] } }),
    triggers: [{ id: 'made-for-the-test', when: { roomsVisited: ['atrium'] }, effects: FLAG }],
  })
  if (accused(flagged.issues, 'flag-never-read').length > 0) noisy.push('flag-never-read accuses a flag a line of the list waits for')

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
      'hotspot-unreachable',
      'credential-unobtainable',
      'credential-orphan',
      'trigger-never-fires',
      'flag-never-set',
      'flag-never-read',
      'no-return-path',
      'one-way-trap',
      'lock-evidence-behind-lock',
      'checklist-item-untickable',
      'checklist-deferred-with-box',
      'simulation-no-fixpoint',
      'transition-door-invalid',
      'no-start-room',
    ]),
  )
  // And the authored museum of none of them but the ones that are dated.
  for (const code of raised) {
    if (!['exhibit-uncataloguable', 'checklist-item-untickable', 'hotspot-unreachable', 'flag-never-set'].includes(code) && accused(played.issues, code).length > 0) {
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
  // a hand's reach. The line about the vault used to be given something to
  // wait for here as well; it owes nothing now, being a promise with a date
  // and no box (L3), which the play has no accusation to make of.
  //
  // And what the vault's lot owes: the pump that dries the basement, here a
  // trigger that sets its flag once the house is lit, so that the rain in
  // the dead air waits for something that does happen.
  const paid: MuseumContent = {
    ...MUSEUM,
    exhibits: MUSEUM.exhibits.map((exhibit) =>
      ['net-1897', 'gym-suit', 'photo-gym'].includes(exhibit.id)
        ? { ...exhibit, scale: 1, hotspots: exhibit.hotspots.map((hotspot) => ({ ...hotspot, localPosition: [0, 0.05, 0.1] })) }
        : exhibit,
    ),
    triggers: [
      { id: 'the-pump', when: { powered: ['office', 'atrium', 'holyoke'] }, effects: [{ kind: 'set-flag', flag: 'basement-drained' }] },
    ],
  }
  const result = simulateProgress(paid)
  assert.deepEqual(result.issues, [])
  assert.deepEqual(sorted(result.final.flags), ['basement-drained', 'clock-set', 'posse-signed'])
  // Every line of the list that has a box is ticked at that end, the
  // curator's own pencil lines among them, and the two that have none are
  // still the promises they were.
  const list = MUSEUM.documents.flatMap((doc) => doc.pages ?? []).find((page) => page.style === 'checklist')
  assert.deepEqual(
    checklistRows(list?.items ?? [], result.final, paid).map((row) => `${row.labelKey}: ${row.done}`),
    [
      'notebook.todo.power: true',
      'notebook.todo.catalogue: true',
      'notebook.todo.vault: null',
      'notebook.todo.drawer: true',
      'notebook.todo.safe-key: true',
      'notebook.todo.posse: true',
      'notebook.todo.proof: null',
    ],
  )
  assert.equal(result.final.catalogued.length, 12)
  assert.equal(result.levels.length, 7, 'and it takes no longer')
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
const isPress = (entry: ActionRecord) => /^(?:power|door|hotspot|container|touch|code|take|set-clock|voice|sign):/.test(entry.id)
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
  // containers, the drawer's touch and its code, the radio, the clock.
  assert.ok(presses.length >= 34, `only ${presses.length} presses were met`)
  assert.deepEqual(
    presses.find((entry) => entry.id === 'set-clock:office-clock'),
    { id: 'set-clock:office-clock', requires: ['power:office', 'room:office'], grants: ['flag:clock-set'] },
  )
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

await test('the chain of the Posse, on the museum itself: the key from the drawer, the safe it is spent on, a recording heard out', async () => {
  // What the lot was built towards, and what two cases proved on a museum
  // with it added before the museum had it: a drawer that hands over a key
  // as it opens, a safe that key is spent on, and a machine on the desk that
  // plays a recording once the lamp is on. Played by the exhaustive player
  // and then by the robot's hands, on the real store, to the same end.
  const levelOf = (entry: string) => played.levels.findIndex((level) => level.includes(entry))
  assert.deepEqual(
    ['seen:office-safe', 'doc:doc-otavio-tape', 'cred:tool:service-key', 'fired:lock:office-drawer:opened', 'lock:office-safe', 'doc:doc-termos', 'doc:doc-label-proof-office'].map(
      (entry) => `${entry} N${levelOf(entry)}`,
    ),
    [
      'seen:office-safe N0',
      'doc:doc-otavio-tape N1',
      'cred:tool:service-key N4',
      'fired:lock:office-drawer:opened N4',
      'lock:office-safe N5',
      'doc:doc-termos N5',
      'doc:doc-label-proof-office N5',
    ],
  )
  // The key is spent by the end, and is still in the save.
  assert.deepEqual(toolSpent(MUSEUM.locks, played.final), ['tool:service-key'])
  assert.deepEqual(played.final.credentials, ['tool:service-key'])
  assert.deepEqual(toolSpent(MUSEUM.locks, saveHolding(['cred:tool:service-key'])), [], 'a key in the hand is spent before its lock is open')

  // Written down: the drawer's trigger gives the key, the safe is opened by
  // the press of whoever holds it, the recording by a press with the lamp on.
  const records = Object.fromEntries(played.actions.map((entry) => [entry.id, entry]))
  assert.deepEqual(records['trigger:lock:office-drawer:opened'], {
    id: 'trigger:lock:office-drawer:opened',
    requires: ['lock:office-drawer'],
    grants: ['cred:tool:service-key', 'fired:lock:office-drawer:opened'],
  })
  assert.deepEqual(records['container:office-safe'], {
    id: 'container:office-safe',
    requires: ['cred:tool:service-key', 'room:office'],
    grants: ['doc:doc-label-proof-office', 'doc:doc-termos', 'lock:office-safe', 'seen:office-safe'],
  })
  assert.deepEqual(records['touch:office-safe'], { id: 'touch:office-safe', requires: ['room:office'], grants: ['seen:office-safe'] })
  assert.deepEqual(records['voice:office-answering-machine:doc-otavio-tape'], {
    id: 'voice:office-answering-machine:doc-otavio-tape',
    requires: ['power:office', 'room:office'],
    grants: ['doc:doc-otavio-tape'],
  })
  // In the dark the machine is dead and is not offered; the telephone beside it is.
  const inTheDark = availableActions(MUSEUM, saveHolding(['room:office']), 'office').map(describe)
  assert.ok(!inTheDark.includes('hear office-answering-machine') && inTheDark.includes('hear office-telephone'))

  // The robot: every hand of it is the handler's (the safe by `attemptLock`,
  // the machine by the function E calls), and every night ends where the
  // simulation ends.
  for (const seed of [3, 30, 47, 300, 1896]) {
    const night = await playToEnd(await openGame(), MUSEUM, seeded(seed))
    assert.deepEqual(withoutLuck(endOf(night.page.progress())), MAXIMUM_END, `seed ${seed}`)
    assert.deepEqual(toolSpent(MUSEUM.locks, night.page.progress()), ['tool:service-key'], `seed ${seed}`)
    assert.equal(night.page.state().radio, null, `seed ${seed}: the machine was left talking`)
    // The key survives the disk, spent as it is.
    assert.deepEqual((await reload(night.page)).progress().credentials, ['tool:service-key'], `seed ${seed}`)
  }
  // The player who never works a voice loses the recording and nothing else:
  // the message says where the year is, and so does the wing.
  const deaf: RobotProfile = { ...ORDINARY, skips: (action) => action.kind === 'voice' }
  const night = await playToEnd(await openGame(), MUSEUM, seeded(11), deaf)
  assert.deepEqual(withoutLuck(endOf(night.page.progress())), MAXIMUM_END.filter((entry) => entry !== 'doc:doc-otavio-tape'))
})

await test('the night has an end: the Book brings the deed to the lectern, a held press signs it with the house lit, and the sequence follows', async () => {
  // What ÁT-D1 asks of the museum, as accusations it must not raise. Until
  // this lot the game stopped at a note in a drawer: there was no term to
  // sign, and so nothing to accuse of being out of reach.
  assert.deepEqual((MUSEUM.terms ?? []).map((term) => term.id), ['termo-posse'], 'the museum has one term to sign in this lot')
  assert.deepEqual((MUSEUM.sequences ?? []).map((sequence) => sequence.id), ['seq-posse'])
  for (const code of ['term-unsignable', 'ending-unreachable', 'term-presented-late', 'term-blocker-unnamed', 'post-ending-disables-action', 'sequence-never-plays', 'radio-hint-coverage']) {
    assert.deepEqual(accused(played.issues, code), [], code)
  }
  assert.deepEqual(codesOf(validateEnding(MUSEUM)), [])

  // Signed at the lectern of the hall, on what the term asks: the Book read
  // and light in the three rooms of the house.
  const records = Object.fromEntries(played.actions.map((entry) => [entry.id, entry]))
  const signing = records['sign:atrium-lectern:termo-posse']
  assert.deepEqual(signing, {
    id: 'sign:atrium-lectern:termo-posse',
    requires: ['doc:doc-termos', 'power:atrium', 'power:holyoke', 'power:office', 'room:atrium'],
    grants: ['term:termo-posse'],
  })
  assert.deepEqual(records['trigger:term:termo-posse:signed'], {
    id: 'trigger:term:termo-posse:signed',
    requires: ['term:termo-posse'],
    grants: ['fired:term:termo-posse:signed', 'flag:posse-signed'],
  })
  assert.ok(pressFor(MUSEUM, signing, signing.requires), 'not offered to a player who holds what it asks')
  // Not without light in each of the three, whichever one is dark; not without the Book.
  for (const guard of signing.requires.filter((asked) => !asked.startsWith('room:'))) {
    assert.equal(pressFor(MUSEUM, signing, signing.requires.filter((asked) => asked !== guard)), null, `still offered without ${guard}`)
  }
  // Not from another room, and not twice.
  assert.ok(!availableActions(MUSEUM, saveHolding([...signing.requires, 'room:office']), 'office').some((action) => action.kind === 'sign'))
  assert.ok(!availableActions(MUSEUM, saveHolding([...signing.requires, 'term:termo-posse']), 'atrium').some((action) => action.kind === 'sign'))
  // And the museum L2 left is the one the gate would call unfinished, were it
  // given a term: with the deed and no desk to sign it at, the ending is out
  // of reach.
  const noDesk = withRooms((room) => ({ ...room, devices: (room.devices ?? []).filter((device) => device.kind !== 'signing-desk') }))
  assert.deepEqual(accused(simulateProgress(noDesk).issues, 'ending-unreachable'), ['termo-posse'])

  // The robot. Its hand for the desk is the handler the key calls, the
  // gesture's own reducer and the listener's function; and what the game then
  // shows by itself it watches.
  for (const seed of [3, 30, 47, 300, 1896]) {
    const night = await playToEnd(await openGame(), MUSEUM, seeded(seed))
    assert.deepEqual(withoutLuck(endOf(night.page.progress())), MAXIMUM_END, `seed ${seed}`)
    assert.deepEqual(night.page.progress().termsSigned, ['termo-posse'], `seed ${seed}`)
    assert.deepEqual(night.page.progress().sequencesSeen, ['seq-posse'], `seed ${seed}: the sequence was never seen to its end`)
    assert.equal(night.page.state().sequence, null, `seed ${seed}: a card was left on screen`)
    assert.ok(night.log.some((line) => line.includes('sign termo-posse at atrium-lectern') && !line.endsWith('(nothing)')), `seed ${seed}: the term was never signed by the hand`)
    // Through the disk: signed, shown, and nothing owed.
    const back = await reload(night.page)
    assert.deepEqual([back.progress().termsSigned, back.progress().sequencesSeen, back.progress().flags.includes('posse-signed')], [['termo-posse'], ['seq-posse'], true], `seed ${seed}`)
    assert.equal(startDueSequenceOn(back.store.useMuseum, MUSEUM, false), false, `seed ${seed}: the sequence played again after a reload`)
  }
  // The player who never signs ends a level short, and is owed nothing.
  const unsigned: RobotProfile = { ...ORDINARY, skips: (action) => action.kind === 'sign' }
  const night = await playToEnd(await openGame(), MUSEUM, seeded(11), unsigned)
  assert.deepEqual(
    withoutLuck(endOf(night.page.progress())),
    MAXIMUM_END.filter((entry) => !['term:termo-posse', 'flag:posse-signed', 'fired:term:termo-posse:signed'].includes(entry)),
  )
  assert.deepEqual(night.page.progress().sequencesSeen, [])
  // And the one who signs the moment she can (before the pieces, before the
  // shortcut) ends where everybody ends: signing took nothing away.
  const eager: RobotProfile = { ...ORDINARY, prefers: (action) => action.kind === 'sign' }
  for (const seed of [5, 50]) {
    const hasty = await playToEnd(await openGame(), MUSEUM, seeded(seed), eager)
    assert.deepEqual(withoutLuck(endOf(hasty.page.progress())), MAXIMUM_END, `seed ${seed}, signing first`)
  }
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
    // The same six accusations: a save does not make a piece cataloguable, nor set the pump's flag.
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

await test('the canonical route is playable in its order and ends with the Posse signed, and play goes on from there to the end', async () => {
  // The route of the plan's §2.4: I-01, I-07, I-08, I-09, I-10, I-11a, I-15,
  // I-12, and from L3 the rest of Act I: the key in the drawer (I-12), the
  // iron safe (I-13) and the deed of office at the lectern (I-14).
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
    { kind: 'code', lockId: 'office-drawer', entry: '1896' }, // I-12: the sheet, and the key pinned to it
    { kind: 'container', containerId: 'office-safe' }, // I-13: the key is spent, the Book and the proof are read
    door('atrium-to-office', 'office', 'atrium'),
    { kind: 'sign', deviceId: 'atrium-lectern', termId: 'termo-posse' }, // I-14: the Posse
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
    'doc:doc-otavio-handover',
    'cred:tool:service-key',
    'fired:lock:office-drawer:opened',
    'seen:office-safe',
    'lock:office-safe',
    'doc:doc-termos',
    'doc:doc-label-proof-office',
    'term:termo-posse',
    'flag:posse-signed',
    'fired:term:termo-posse:signed',
  ])
  assert.deepEqual(endOf(page.progress()), critical)
  // The night has its end: the flag the seals of a later lot will ask for.
  assert.ok(page.progress().flags.includes('posse-signed'), 'the canonical route does not end with the deed of office signed')
  assert.deepEqual(page.progress().termsSigned, ['termo-posse'])
  // What follows the signature is owed, and plays to its last step.
  assert.equal(startDueSequenceOn(page.store.useMuseum, MUSEUM, false), true, 'no sequence follows the signature')
  assert.equal(page.state().sequence?.id, 'seq-posse')
  for (let guard = 0; guard < 8 && page.state().sequence; guard += 1) page.state().advanceSequence()
  assert.deepEqual(page.progress().sequencesSeen, ['seq-posse'])
  // The route skips the notebook, the radio, the message and eight pieces: it
  // is the shortest way to the Posse, not the end of the game. From its last
  // step the robot reaches the end like anybody else.
  assert.deepEqual(critical.filter((entry) => !MAXIMUM_END.includes(entry)), [])
  const night = await playToEnd(page, MUSEUM, seeded(1896))
  assert.deepEqual(withoutLuck(endOf(night.page.progress())), MAXIMUM_END)
})

const NIGHTS = 500
/**
 * `-- --seed <n>`: one of the five hundred nights, printed press by press,
 * BEFORE the five hundred are played as always.
 *
 * An argument, and one that only adds. This used to be `SEED` in the
 * environment and to replace the run: with the variable left in a shell
 * (which is how PowerShell sets one), or exported by anything else, `npm run
 * check` played one night, skipped every assertion about the five hundred
 * and printed `pass` under their name.
 */
const ONE_SEED = seedAsked(process.argv.slice(2), NIGHTS)

await test('the one night to replay is asked for by an argument, and never stands in for the five hundred', () => {
  assert.equal(seedAsked([], NIGHTS), null)
  assert.equal(seedAsked(['--seed', '7'], NIGHTS), 7)
  assert.equal(seedAsked(['--seed', '1'], NIGHTS), 1)
  assert.equal(seedAsked(['--seed', '500'], NIGHTS), 500)
  // Nothing, junk, a night that is not one of them, a flag it does not know: said, not guessed at.
  for (const bad of [['--seed'], ['--seed', ''], ['--seed', 'abc'], ['--seed', '7.5'], ['--seed', '-3'], ['--seed', '0'], ['--seed', '501'], ['--sede', '7'], ['7']]) {
    assert.throws(() => seedAsked(bad, NIGHTS), /--seed <n>, a whole number from 1 to 500/, JSON.stringify(bad))
  }
  // The environment is not asked, here or in the robot.
  for (const path of ['scripts/test-playthrough.ts', 'scripts/lib/playthrough.ts']) {
    assert.ok(!/process\.env\b/.test(squeezed(readText(resolve(ROOT, path)))), `${path} reads the environment`)
  }
})

await test('five hundred shuffled orders, with wasted presses and closed tabs, all end where the simulation ends', async () => {
  if (ONE_SEED !== null) {
    // The night that was asked for, with its log, whether or not it ends well.
    console.log(`        night ${ONE_SEED}:`)
    try {
      const night = await playToEnd(await openGame(), MUSEUM, seeded(ONE_SEED))
      console.log(night.log.map((line) => `          ${line}`).join('\n'))
    } catch (error) {
      console.log(((error as { log?: readonly string[] }).log ?? []).map((line) => `          ${line}`).join('\n'))
      console.log(`          it stopped there: ${error instanceof Error ? error.message.split('\n')[0] : error}`)
    }
  }
  const seeds = Array.from({ length: NIGHTS }, (_, index) => index + 1)
  const failed: string[] = []
  const openings = new Set<string>()
  let presses = 0
  let wasted = 0
  let reloads = 0
  let lucky = 0
  const began = performance.now()
  for (const seed of seeds) {
    try {
      const night = await playToEnd(await openGame(), MUSEUM, seeded(seed))
      presses += night.presses
      wasted += night.wasted
      reloads += night.reloads
      openings.add(night.log.filter((line) => line.startsWith('do:')).slice(0, 6).join('|'))
      const end = endOf(night.page.progress())
      assert.deepEqual(withoutLuck(end), MAXIMUM_END, 'the night ended somewhere else')
      if (end.length > MAXIMUM_END.length) lucky += 1
      // And the end is still the end after one more trip through the disk.
      assert.deepEqual(endOf((await reload(night.page)).progress()), end, 'the end did not survive the disk')
    } catch (error) {
      failed.push(`seed ${seed}: ${error instanceof Error ? error.message.split('\n')[0] : error}`)
    }
  }
  const seconds = (performance.now() - began) / 1000
  console.log(
    `        ${seeds.length} nights · ${presses} presses, ${wasted} of them for nothing · ${reloads} tabs closed · ` +
      `${lucky} found the detail only luck finds · ${seconds.toFixed(1)} s`,
  )
  assert.deepEqual(failed.slice(0, 5), [], `${failed.length} night(s) failed. \`npm run test:playthrough -- --seed <n>\` plays one again and prints it.`)
  // The robot is not five hundred copies of one night.
  assert.ok(openings.size > 200, `only ${openings.size} different openings in 500 nights: the order is not being shuffled`)
  assert.ok(reloads > 500, `only ${reloads} reloads in 500 nights`)
  assert.ok(wasted > 2000, `only ${wasted} wasted presses in 500 nights`)
  // Some nights a wasted press finds the photograph's detail, and most do
  // not: both ends are ends the real game reaches.
  assert.ok(lucky > 10 && lucky < seeds.length - 10, `${lucky} of ${seeds.length} nights found the detail only luck finds`)
  // About eight seconds on the machine that wrote it. The bound is loose on
  // purpose: it is there for a robot that has started walking in circles,
  // not for a slow disk.
  assert.ok(seconds < 120, `the five hundred nights took ${seconds.toFixed(1)} s`)
})

await test('the player who skips everything optional still signs, and sees the night closed: the same end, less the steps skipped (V7)', async () => {
  // Never reads the notebook, never takes the radio, never lights the
  // torch, never hears the message, never sets the clock. The Posse asks for
  // none of them: the year is in the wing, the key in the drawer, and what
  // closes the night is a sequence, which needs no radio to be heard.
  const journal = new Set(MUSEUM.rooms.flatMap((room) => (room.containers ?? []).filter((container) => container.carriesJournal).map((container) => container.id)))
  const skipper: RobotProfile = {
    ...ORDINARY,
    noTorch: true,
    skips: (action) =>
      action.kind === 'take' || action.kind === 'set-clock' || action.kind === 'voice' || (action.kind === 'container' && journal.has(action.containerId)),
  }
  assert.deepEqual([...journal], ['office-notebook'])
  const skipped = ['doc:doc-welcome', 'carried:office-radio', 'flag:clock-set', 'doc:doc-otavio-tape']
  for (const seed of [1, 2, 3, 5, 8, 13, 21, 34]) {
    const night = await playToEnd(await openGame(), MUSEUM, seeded(seed), skipper)
    const progress = night.page.progress()
    assert.deepEqual(withoutLuck(endOf(progress)), MAXIMUM_END.filter((entry) => !skipped.includes(entry)), `seed ${seed}`)
    assert.equal(night.page.state().flashlightUsed, false, 'the torch was lit')
    assert.ok(!night.log.some((line) => /office-notebook|office-radio|office-clock|office-answering-machine|office-telephone/.test(line)), `seed ${seed} touched what it skips`)
    // Signed, and the card and the two lines were seen to the last of them.
    assert.deepEqual(progress.termsSigned, ['termo-posse'], `seed ${seed}: the player who skips everything never signs`)
    assert.ok(progress.flags.includes('posse-signed'), `seed ${seed}`)
    assert.deepEqual(progress.sequencesSeen, ['seq-posse'], `seed ${seed}: the night was signed and never closed`)
    assert.deepEqual(progress.devicesCarried, [], `seed ${seed}`)
  }
})

await test('the player who types the year without having read it only gets the key early: the Posse still waits for the three rooms', async () => {
  // The shortcut the plan names in 1.4: the keypad compares digits, and takes
  // the year from somebody who never saw the portrait. Since L3 the drawer
  // hands over a key, so the guess brings the key forward, and with it the
  // safe: what it cannot bring forward is the light the deed asks for.
  const page = await openGame()
  page.state().start()
  step(page, { kind: 'container', containerId: 'office-cabinet' })
  assert.deepEqual(endOf(page.progress()), ['room:office', 'seen:office-drawer'])
  const guess: PlayerAction = { kind: 'code', lockId: 'office-drawer', entry: '1896' }
  const before = page.progress()
  assert.ok(!availableActions(MUSEUM, before, 'office').some((candidate) => candidate.kind === 'code'), 'the simulation types a code it has not learnt')
  press(page, MUSEUM, guess)
  assert.deepEqual(
    endOf(page.progress()),
    sorted(['room:office', 'seen:office-drawer', 'lock:office-drawer', 'doc:doc-otavio-handover', 'cred:tool:service-key', 'fired:lock:office-drawer:opened']),
  )
  // Which the check between store and simulation calls by its name.
  assert.match(pressProblem(MUSEUM, 'office', guess, before, page.progress()) ?? '', /the store accepted "type 1896 at office-drawer" in office, which the simulation does not offer there/)
  // The safe opens in the dark, with the key just taken: the Book is read
  // before any room but the office was ever seen.
  step(page, { kind: 'container', containerId: 'office-safe' })
  assert.ok(page.progress().documentsRead.includes('doc-termos') && page.progress().locksOpened.includes('office-safe'))
  assert.deepEqual(page.progress().roomsPowered, [])
  // And the lectern, once she gets to it, names the deed and what it waits for: nothing is signed.
  step(page, { kind: 'power', roomId: 'office' })
  step(page, door('atrium-to-office', 'office', 'atrium'))
  const early: PlayerAction = { kind: 'sign', deviceId: 'atrium-lectern', termId: 'termo-posse' }
  assert.ok(!availableActions(MUSEUM, page.progress(), 'atrium').some((candidate) => candidate.kind === 'sign'), 'the deed is offered with two rooms dark')
  const dark = page.progress()
  press(page, MUSEUM, early)
  assert.equal(page.progress(), dark, 'a press on the lectern with the house dark wrote to the save')
  assert.deepEqual(page.progress().termsSigned, [])
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
    assert.deepEqual(withoutLuck(endOf(night.page.progress())), MAXIMUM_END, `seed ${seed}`)
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
      assert.deepEqual(withoutLuck(endOf(end)), endOf(simulateProgress(MUSEUM, migrateProgress(throughJson(fixture.save.progress))).final), `${name}, seed ${seed}`)
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
  const inHolyoke = async () => {
    const page = await openGame()
    page.state().start()
    for (const action of [{ kind: 'power', roomId: 'office' } as const, door('atrium-to-office', 'office', 'atrium'), door('atrium-to-holyoke', 'atrium', 'holyoke')]) {
      step(page, action)
    }
    return page
  }
  const offeredIn = (content: MuseumContent, action: PlayerAction) =>
    availableActions(content, saveHolding(['room:holyoke']), 'holyoke').some((candidate) => sameAction(candidate, action))

  // The simulation offers a detail and no hand finds it: the state the lot
  // was in while the three large pieces were still offered. Here the mind is
  // told of a net a tenth of its size, with the tape within reach; in the
  // wing the hands are in, the tape is two metres from what the view holds
  // and never faces the camera.
  const smallNet = withExhibits((exhibit) => (exhibit.id === 'net-1897' ? { ...exhibit, scale: 0.1 } : exhibit))
  const tape: PlayerAction = { kind: 'hotspot', exhibitId: 'net-1897', hotspotId: 'tape' }
  assert.ok(offeredIn(smallNet, tape) && !offeredIn(MUSEUM, tape))
  const offeredOnly = await inHolyoke()
  const before = offeredOnly.progress()
  press(offeredOnly, MUSEUM, tape)
  assert.equal(offeredOnly.progress(), before, 'the hand found a detail that never faces the camera')
  assert.match(
    pressProblem(smallNet, 'holyoke', tape, before, offeredOnly.progress()) ?? '',
    /the simulation offers "detail net-1897:tape" in holyoke \(hotspot:net-1897:tape\) and the store did something else: it did not write .*detail:net-1897:tape/,
  )
  // And a night played with that simulation does not end: it stops at the press.
  await assert.rejects(
    playToEnd(await openGame(), smallNet, seeded(3), { reloadChance: 0, uselessChance: 0 }, MUSEUM),
    /the simulation offers "detail net-1897:(?:tape|socket)" in holyoke .* it did not write/,
  )

  // The store takes a press the simulation never offered, and this one is the
  // museum as built: the photograph's detail shows inside 1.5°, the view
  // records it there, and the simulation, which plans on a hand that needs
  // 5°, does not count on it.
  const photo: PlayerAction = { kind: 'hotspot', exhibitId: 'photo-gym', hotspotId: 'apparatus' }
  assert.ok(!offeredIn(MUSEUM, photo))
  const tookMore = await inHolyoke()
  const earlier = tookMore.progress()
  press(tookMore, MUSEUM, photo)
  assert.ok(tookMore.progress().catalogued.includes('photo-gym'), 'the hand refuses a detail the view records')
  assert.match(pressProblem(MUSEUM, 'holyoke', photo, earlier, tookMore.progress()) ?? '', /the store accepted "detail photo-gym:apparatus" in holyoke, which the simulation does not offer there: it wrote .*cat:photo-gym/)
  // Named for what it is, the press is not let off: it is held to what the
  // rules give for it, no more and no less.
  assert.equal(luckyDetail(MUSEUM, photo), true)
  assert.equal(pressProblem(MUSEUM, 'holyoke', photo, earlier, tookMore.progress(), true), null)
  assert.match(pressProblem(MUSEUM, 'holyoke', photo, earlier, earlier, true) ?? '', /it did not write cat:photo-gym, detail:photo-gym:apparatus/)
  assert.match(
    pressProblem(MUSEUM, 'holyoke', photo, earlier, grantProgress(tookMore.progress(), { credentials: ['badge:curator'] }), true) ?? '',
    /it also wrote .*badge:curator/,
  )
  // Only that kind of press is luck: a detail that never shows, one a hand finds, a door.
  assert.equal(luckyDetail(MUSEUM, tape), false)
  assert.equal(luckyDetail(MUSEUM, { kind: 'hotspot', exhibitId: 'portrait-morgan', hotspotId: 'date' }), false)
  assert.equal(luckyDetail(MUSEUM, door('atrium-to-holyoke', 'holyoke', 'atrium')), false)
  assert.equal(luckyDetail(MUSEUM, { kind: 'hotspot', exhibitId: 'no-such-piece', hotspotId: 'apparatus' }), false)

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
        assert.equal(pressProblem(MUSEUM, room, action, save, page.progress(), luckyDetail(MUSEUM, action)), null)
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
  // Every press, the photograph's detail among them: this player is the lucky one, by construction.
  assert.deepEqual(endOf(page.progress()), sorted([...MAXIMUM_END, ...LUCK]), 'pressing everything everywhere did not reach the end')
  assert.ok(tried > 200 && refused > 100, `${tried} presses tried, ${refused} for nothing`)
})

// ---------------------------------------------------------------------------
// A lot only adds (M39)
// ---------------------------------------------------------------------------

const NOW = graphSnapshot(MUSEUM, CONTENT_LOT)
const additive = (previous: GraphSnapshot, content: MuseumContent, aliases: readonly SaveAlias[] = []) =>
  validateAdditive(previous, content, aliases).map((issue) => `${issue.code} ${issue.id}`)

type ListItem = NonNullable<NonNullable<Document['pages']>[number]['items']>[number]
/** The museum with one line of the notebook's list rewritten. */
const withListItem = (labelKey: string, patch: (item: ListItem) => ListItem, content: MuseumContent = MUSEUM): MuseumContent => ({
  ...content,
  documents: content.documents.map((doc) => ({
    ...doc,
    pages: doc.pages?.map((page) => ({
      ...page,
      items: page.items?.map((item) => (item.labelKey === labelKey ? patch(item) : item)),
    })),
  })),
})

/**
 * The museum with the notebook's two lists said the way they were until L3:
 * "every room" and "every piece", which mean whatever the build holds. The
 * authored list names its ids now (DL2-17, DL3-4); this is the list that
 * moves when the museum grows, kept to show that it does.
 */
const ALL_OF_THEM = withListItem(
  'notebook.todo.catalogue',
  (item) => ({ ...item, doneWhen: { allCatalogued: true } }),
  withListItem('notebook.todo.power', (item) => ({ ...item, doneWhen: { allRoomsPowered: true } })),
)

await test('the content against its own snapshot is accused of nothing', () => {
  assert.deepEqual(validateAdditive(NOW, MUSEUM), [])
  assert.equal(NOW.lot, CONTENT_LOT)
  assert.equal(NOW.actions.length, played.actions.length)
  assert.deepEqual(NOW.actions.map((entry) => entry.id), sorted(played.actions.map((entry) => entry.id)))
  // The list names its ids, and they are the atoms L2 wrote down when the
  // two lines still said "all of them". The line of the vault has no box,
  // and the lot that gives it one; the four in the curator's pencil came
  // with the Posse, the last of them a promise too.
  assert.deepEqual(NOW.checklist, [
    { id: 'notebook.todo.catalogue', doneWhen: sorted(MUSEUM.exhibits.map((exhibit) => `cat:${exhibit.id}`)) },
    { id: 'notebook.todo.drawer', doneWhen: ['lock:office-drawer'] },
    { id: 'notebook.todo.posse', doneWhen: ['flag:posse-signed'] },
    { id: 'notebook.todo.power', doneWhen: ['power:atrium', 'power:holyoke', 'power:office'] },
    { id: 'notebook.todo.proof', doneWhen: null, deferredUntilLot: 12 },
    { id: 'notebook.todo.safe-key', doneWhen: ['lock:office-safe'] },
    { id: 'notebook.todo.vault', doneWhen: null, deferredUntilLot: 12 },
  ])
  assert.deepEqual(graphSnapshot(ALL_OF_THEM, CONTENT_LOT).checklist, NOW.checklist, '"all of them" is written as the ids it means today')
  // The first term a snapshot holds, with what signing it asks, and the
  // sequence that follows it.
  assert.deepEqual(NOW.terms, [{ id: 'termo-posse', when: ['doc:doc-termos', 'power:atrium', 'power:holyoke', 'power:office'] }])
  assert.deepEqual([NOW.ids.terms, NOW.ids.sequences], [['termo-posse'], ['seq-posse']])
  assert.deepEqual([NOW.saveFields.termsSigned, NOW.saveFields.sequencesSeen], ['list', 'list'])
  assert.deepEqual(NOW.ids.rooms, ['atrium', 'holyoke', 'office'])
  assert.deepEqual(NOW.ids.doors, [SHORTCUT, 'atrium-to-holyoke', 'atrium-to-office'])
  assert.deepEqual(NOW.ids.locks, ['office-drawer', 'office-safe'])
  assert.deepEqual(NOW.ids.devices, ['office-clock', 'office-radio'])
  assert.deepEqual(NOW.ids.documents, ['doc-halstead', 'doc-invention-date', 'doc-label-proof-office', 'doc-otavio-handover', 'doc-otavio-tape', 'doc-rule-changes', 'doc-termos', 'doc-welcome'])
  assert.equal(NOW.ids.exhibits.length, 12)
  assert.equal(NOW.ids.hotspots.length, 21)
  assert.deepEqual(NOW.ids.triggers, ['lock:office-drawer:opened', 'term:termo-posse:signed'])
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
    // The notebook's list names its ids (frozen in L3), so a piece more is free.
    documents: [...MUSEUM.documents, { ...MUSEUM.documents[0], id: 'doc-new', containerId: 'holyoke-cabinet-b' }],
    // Beside what a lock already gives as it opens (the drawer hands over a
    // key since L3): in its place would be taking the key away.
    locks: MUSEUM.locks.map((lock) => ({ ...lock, onOpen: [...(lock.onOpen ?? []), { kind: 'set-flag' as const, flag: 'drawer-open' }] })),
    triggers: [{ id: 'new-trigger', when: { flags: ['drawer-open'] }, effects: [{ kind: 'reveal-document', documentId: 'doc-new' }] }],
  }
  assert.deepEqual(additive(NOW, grown), [])
  // The one thing that was not free while the list still said "all of them":
  // a thirteenth piece changes what "catalogue everything" waits for. Which
  // is why the lists had their ids named before the museum grew (the plan's
  // DL2-17). The new room came with its lights on, so "light everything"
  // waits for what it did; a dark one is in the test after next.
  assert.deepEqual(additive(NOW, { ...grown, documents: [...ALL_OF_THEM.documents, grown.documents[grown.documents.length - 1]] }), [
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
  // (It was `termsSigned` until L3 gave that field a line in the table.)
  assert.deepEqual(additive({ ...NOW, saveFields: { ...NOW.saveFields, ribbonsCut: 'list' } }, MUSEUM), ['save-field-changed ribbonsCut'])
  assert.deepEqual(additive({ ...NOW, saveFields: { ...NOW.saveFields, termsSigned: 'record' } }, MUSEUM), ['save-field-changed termsSigned'])
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
  assert.match(validateAdditive(NOW, locked)[0].message, new RegExp(`asks for more since L${NOW.lot}: power:holyoke\\.`))
  // The simulation says what that does to a new game; the snapshot says what
  // it does to an old one. Both are needed.
  assert.ok(accused(simulateProgress(locked).issues, 'room-unreachable').includes('holyoke'))

  // A drawer that stops holding its sheet.
  assert.deepEqual(additive(NOW, { ...MUSEUM, documents: MUSEUM.documents.filter((doc) => doc.id !== 'doc-otavio-handover') }), [
    'grant-removed code:office-drawer',
    'grant-removed container:office-cabinet',
    'id-renamed-without-alias documents:doc-otavio-handover',
  ])

  // A room arrives. The list names the three rooms it means, so nothing moves...
  const fourth: MuseumContent = {
    ...MUSEUM,
    rooms: [...MUSEUM.rooms, { ...MUSEUM.rooms[0], id: 'paris', portals: [], exhibitIds: [], containers: [], devices: [], powerControl: undefined }],
  }
  assert.deepEqual(additive(NOW, fourth), [], 'a list with its ids named does not move when a room arrives')
  // ...where the list that said "every room has power" would now mean four.
  assert.deepEqual(additive(NOW, ALL_OF_THEM), [])
  assert.deepEqual(additive(NOW, { ...ALL_OF_THEM, rooms: fourth.rooms }), ['checklist-condition-changed notebook.todo.power'])

  // And the gate applies it when it is handed a snapshot, and only then.
  const gate = (previousGraph?: GraphSnapshot) => validateContent(locked, undefined, undefined, undefined, previousGraph ? { previousGraph } : {})
  assert.equal(accused(gate(NOW), 'guard-strengthened').length, 2)
  assert.equal(accused(gate(), 'guard-strengthened').length, 0)
})

await test('a renamed id with its aliases takes nothing away, in what is given and in what an action is called', () => {
  // The sheet in the drawer under a new id: what L3 did to the predecessor's
  // note, done once more to the sheet that replaced it.
  const letter = withDocuments((doc) => (doc.id === 'doc-otavio-handover' ? { ...doc, id: 'doc-handover-sheet-1' } : doc))
  assert.deepEqual(additive(NOW, letter), [
    'grant-removed code:office-drawer',
    'grant-removed container:office-cabinet',
    'id-renamed-without-alias documents:doc-otavio-handover',
  ])
  assert.deepEqual(additive(NOW, letter, [{ sinceLot: 4, field: 'documentsRead', from: 'doc-otavio-handover', to: 'doc-handover-sheet-1' }]), [])

  // And the rename this lot made, against the record of the lot before it.
  // L2's players read `doc-predecessor`; the museum has `doc-otavio-handover`
  // in its place, and the alias in `SAVE_ALIASES` is all that stands between
  // that and three accusations.
  const l2 = snapshotsIn(resolve(ROOT, RELEASES_DIRECTORY)).find((snapshot) => snapshot.lot === 2)
  assert.ok(l2, 'the record of L2 is on disk')
  const before = parseGraphSnapshot(l2.text)
  assert.ok(before.ids.documents.includes('doc-predecessor') && !NOW.ids.documents.includes('doc-predecessor'))
  assert.deepEqual(additive(before, MUSEUM), [
    'grant-removed code:office-drawer',
    'grant-removed container:office-cabinet',
    'id-renamed-without-alias documents:doc-predecessor',
  ])
  assert.deepEqual(validateAdditive(before, MUSEUM), [], 'the content takes something from a player of L2')
  // A rename of a rename: the save of L2 is carried through both.
  assert.deepEqual(
    additive(before, letter, [
      { sinceLot: 3, field: 'documentsRead', from: 'doc-predecessor', to: 'doc-otavio-handover' },
      { sinceLot: 4, field: 'documentsRead', from: 'doc-otavio-handover', to: 'doc-handover-sheet-1' },
    ]),
    [],
  )

  // A piece under a new id: its details, its entry and the actions named after it.
  const piece = withRooms((room) => ({ ...room, exhibitIds: room.exhibitIds.map((id) => (id === 'ball-improvised' ? 'ball-bladder' : id)) }))
  const bladder = (ids: readonly string[] | undefined) => ids?.map((id) => (id === 'ball-improvised' ? 'ball-bladder' : id))
  // A rename goes through every place the id is written, and the notebook's
  // list names its pieces: in what ticks the line and in what it counts.
  const renamedPiece: MuseumContent = withListItem(
    'notebook.todo.catalogue',
    (item) => ({
      ...item,
      doneWhen: { ...item.doneWhen, catalogued: bladder(item.doneWhen?.catalogued) },
      counters: item.counters?.map((counter) => ({ ...counter, of: { ...counter.of, catalogued: bladder(counter.of.catalogued) } })),
    }),
    { ...piece, exhibits: MUSEUM.exhibits.map((exhibit) => (exhibit.id === 'ball-improvised' ? { ...exhibit, id: 'ball-bladder' } : exhibit)) },
  )
  assert.deepEqual(additive(NOW, renamedPiece), [
    'node-removed catalogue:ball-improvised',
    'node-removed hotspot:ball-improvised:valve',
    'id-renamed-without-alias exhibits:ball-improvised',
    'id-renamed-without-alias hotspots:ball-improvised:valve',
    // "Catalogue everything" names the piece too, by the id it had.
    'checklist-condition-changed notebook.todo.catalogue',
  ])
  // Renamed in the museum and left under its old name in the list, the line
  // would wait for a piece nobody can catalogue: the aliases carry the save
  // forward, and the line has to come with it.
  const forgotten: MuseumContent = { ...renamedPiece, documents: MUSEUM.documents }
  assert.deepEqual(
    additive(NOW, forgotten, [
      { sinceLot: 3, field: 'catalogued', from: 'ball-improvised', to: 'ball-bladder' },
      { sinceLot: 3, field: 'hotspots', from: 'ball-improvised:valve', to: 'ball-bladder:valve' },
    ]),
    ['checklist-condition-changed notebook.todo.catalogue'],
  )
  assert.deepEqual(
    additive(NOW, renamedPiece, [
      { sinceLot: 3, field: 'catalogued', from: 'ball-improvised', to: 'ball-bladder' },
      { sinceLot: 3, field: 'hotspots', from: 'ball-improvised:valve', to: 'ball-bladder:valve' },
    ]),
    [],
  )
})

await test('a line with no box gains one only where the record gave it a date (DL3-5)', () => {
  // The promise being paid: in the lot that builds the vault, its line gets
  // a box to tick.
  const paid = withListItem('notebook.todo.vault', ({ deferredUntilLot: _, noteKey: __, ...item }) => ({
    ...item,
    doneWhen: { locksOpened: ['office-drawer'] },
  }))
  // A record made for the test, without the date: the line had no box and
  // nothing said it would ever have one. Giving it one changes its meaning.
  const undated: GraphSnapshot = { ...NOW, checklist: NOW.checklist.map(({ deferredUntilLot: _, ...item }) => item) }
  assert.deepEqual(additive(undated, paid), ['checklist-condition-changed notebook.todo.vault'])
  assert.match(validateAdditive(undated, paid)[0].message, /it was a line with no box, and is now lock:office-drawer/)
  // With the date on record, the same change is the promise kept.
  assert.equal(NOW.checklist.find((item) => item.id === 'notebook.todo.vault')?.deferredUntilLot, 12)
  assert.deepEqual(additive(NOW, paid), [])
  // The other way is never free: a line a player may have ticked that turns
  // into a promise unticks itself.
  const unboxed = withListItem('notebook.todo.power', ({ doneWhen: _, counters: __, ...item }) => ({
    ...item,
    deferredUntilLot: 12,
    noteKey: 'notebook.todo.vault.note',
  }))
  assert.deepEqual(additive(NOW, unboxed), ['checklist-condition-changed notebook.todo.power'])
  // And dating a line that had no box takes nothing from anybody: it is
  // what this lot does to the record of the lot before.
  assert.deepEqual(additive(undated, MUSEUM), [])

  // The date is written only where there is one, so a record from before
  // dates reads and writes as itself, byte for byte.
  const text = serialiseGraphSnapshot(NOW)
  assert.ok(text.includes('{"id":"notebook.todo.vault","doneWhen":null,"deferredUntilLot":12}'))
  assert.ok(text.includes('{"id":"notebook.todo.proof","doneWhen":null,"deferredUntilLot":12}'))
  assert.equal(text.split('deferredUntilLot').length - 1, 2, 'two dated lines, two dates')
  assert.equal(serialiseGraphSnapshot(parseGraphSnapshot(text)), text)
  const undatedText = serialiseGraphSnapshot(undated)
  assert.ok(!undatedText.includes('deferredUntilLot'))
  assert.equal(serialiseGraphSnapshot(parseGraphSnapshot(undatedText)), undatedText)
  // L2's own file is such a record: read, not rewritten, and the content
  // with its dated line takes nothing from it.
  const l2 = snapshotsIn(resolve(ROOT, RELEASES_DIRECTORY)).find((snapshot) => snapshot.lot === 2)
  assert.ok(l2, 'the record of L2 is on disk')
  assert.ok(!l2.text.includes('deferredUntilLot'))
  assert.equal(serialiseGraphSnapshot(parseGraphSnapshot(l2.text)), l2.text)
  assert.deepEqual(validateAdditive(parseGraphSnapshot(l2.text), MUSEUM), [])
})

await test('the four balls of the hall are a touch table, outside the thread of the ball (D13)', () => {
  const hall = MUSEUM.rooms.find((room) => room.id === 'atrium')
  assert.ok(hall)
  const onTheTable = MUSEUM.exhibits.filter((exhibit) => hall.exhibitIds.includes(exhibit.id))
  assert.equal(onTheTable.length, 4)
  assert.deepEqual(
    onTheTable.map((exhibit) => `${exhibit.id}: ${exhibit.threads.join(',') || 'no thread'}`),
    onTheTable.map((exhibit) => `${exhibit.id}: no thread`),
  )
  // The thread itself is still there, where its originals are: in the wing.
  const onTheThread = MUSEUM.exhibits.filter((exhibit) => exhibit.threads.includes('ball'))
  assert.ok(onTheThread.length > 0 && onTheThread.every((exhibit) => exhibit.era === 'holyoke' && !hall.exhibitIds.includes(exhibit.id)))
})

const PLAN = readText(resolve(ROOT, 'docs/PLANO-ATE-O-FINAL.md'))
const LOT_DONE = lastLotDone(PLAN)
const LOT_PUBLISHED = lastLotPublished(PLAN)

await test("the snapshots on disk: written by the script, the content's own until its lot is published, a pinned record once the lot is closed", () => {
  const onDisk = snapshotsIn(resolve(ROOT, RELEASES_DIRECTORY))
  assert.ok(onDisk.length > 0, `${RELEASES_DIRECTORY} holds no snapshot: run \`npm run graph:snapshot\``)
  assert.ok(LOT_PUBLISHED <= LOT_DONE, 'the plan gives a lot as published that it does not give as done')

  // In the shape the script writes: one action to a line, everything sorted.
  // A file edited by hand, or by a formatter, does not read back as itself.
  for (const snapshot of onDisk) {
    const graph = parseGraphSnapshot(snapshot.text)
    assert.equal(serialiseGraphSnapshot(graph), snapshot.text, `${snapshot.path} was not written by \`npm run graph:snapshot\``)
    assert.equal(graph.lot, snapshot.lot, `${snapshot.path} says it is the graph of another lot`)
    for (const list of [graph.actions.map((entry) => entry.id), graph.checklist.map((item) => item.id), ...Object.values(graph.ids), Object.keys(graph.saveFields)]) {
      assert.deepEqual(list, sorted(list))
    }
    for (const entry of graph.actions) {
      assert.deepEqual([entry.requires, entry.grants], [sorted(entry.requires), sorted(entry.grants)], entry.id)
    }
  }
  // Writing twice changes no byte.
  assert.equal(serialiseGraphSnapshot(graphSnapshot(MUSEUM, CONTENT_LOT)), serialiseGraphSnapshot(NOW))
  assert.ok(!serialiseGraphSnapshot(NOW).includes('\r') && serialiseGraphSnapshot(NOW).endsWith('}\n'))
  // No lot has written down what it gave before the content got there.
  assert.deepEqual(onDisk.filter((snapshot) => snapshot.lot > CONTENT_LOT).map((snapshot) => snapshot.path), [])

  // What the gate holds the content to, and the content takes nothing from it.
  const gate = snapshotForGate(onDisk, CONTENT_LOT, LOT_PUBLISHED)
  assert.deepEqual(gate.issues, [])
  assert.ok(gate.graph)
  assert.deepEqual(validateAdditive(gate.graph, MUSEUM), [])

  // Every lot the plan gives as done has its file, and the file is the one
  // whose SHA-256 is pinned: nothing rewrites the record of a closed lot
  // without a second, deliberate, edit beside it.
  assert.deepEqual(frozenSnapshotProblems(onDisk, LOT_DONE), [])

  // Until the plan records that the content's lot is PUBLISHED, its snapshot
  // has to be the content's own, byte for byte. «Feito em» alone does not end
  // that: a lot is closed before it is reviewed and published, and whatever
  // the review adds has to be in the record that goes out. (It used to end
  // there, and a fix made between the closing and the push would have been
  // given to players and written down nowhere: the next lot could take it
  // away again unaccused.)
  const own = onDisk.find((snapshot) => snapshot.lot === CONTENT_LOT)
  if (own && CONTENT_LOT > LOT_PUBLISHED) {
    assert.equal(
      own.text,
      serialiseGraphSnapshot(NOW),
      `${own.path} is not the graph of the content as it stands, and L${CONTENT_LOT} is not published yet. ` +
        (CONTENT_LOT <= LOT_DONE
          ? `If this is a fix to L${CONTENT_LOT} made before it goes out, run \`npm run graph:snapshot -- --reopen\` and pin the new SHA-256 ` +
            `in scripts/lib/graphSnapshots.ts. If it is the next lot's work, the file is L${CONTENT_LOT}'s record: leave it, and move CONTENT_LOT first.`
          : 'Run `npm run graph:snapshot` and commit the file.'),
    )
  }
})

await test('the content is held to the record of the lot before, never to the draft of its own', () => {
  // A lot writes its snapshot before it is done (in a middle slice, or as it
  // closes, before the plan says so). The gate used to take the newest file:
  // from that moment the content was compared with itself, the record of the
  // lot before went unread, and anything could be taken out.
  const directory = mkdtempSync(join(tmpdir(), 'museum-baseline-'))
  try {
    const write = (lot: number, content: MuseumContent) => writeFileSync(join(directory, snapshotFileName(lot)), serialiseGraphSnapshot(graphSnapshot(content, lot)), 'utf8')
    const heldTo = (contentLot: number, published: number) => baselineSnapshot(snapshotsIn(directory), contentLot, published)?.lot ?? null
    // A wing that lost the date on Morgan's portrait: what L3 must not do.
    const dateless = withExhibits((exhibit) => (exhibit.id === 'portrait-morgan' ? { ...exhibit, hotspots: [] } : exhibit))

    // The first lot to write one has only its own: there is no record before it.
    write(2, MUSEUM)
    assert.equal(heldTo(2, 1), 2)
    assert.deepEqual(snapshotForGate(snapshotsIn(directory), 2, 1).issues, [])
    // Published, its own file is the record, for the slices of the next lot that still run at lot 2.
    assert.equal(heldTo(2, 2), 2)
    // The next lot, before it has written anything.
    assert.equal(heldTo(3, 2), 2)

    // L3 writes its draft, with the date already gone.
    write(3, dateless)
    assert.deepEqual(snapshotsIn(directory).map((snapshot) => snapshot.lot), [2, 3])
    assert.equal(newestSnapshot(directory)?.lot, 3)
    assert.equal(heldTo(3, 2), 2, 'the content of L3 is held to its own draft')
    // Whether or not anybody wrote «e publicado» for L2: the content moved on, so L2's file is a record.
    assert.equal(heldTo(3, 1), 2)
    const open = snapshotForGate(snapshotsIn(directory), 3, 2)
    assert.equal(open.graph?.lot, 2)
    assert.deepEqual(
      validateAdditive(open.graph!, dateless).map((issue) => issue.code).sort(),
      ['id-renamed-without-alias', 'node-removed', 'node-removed'],
      'what L3 took away is not accused',
    )
    // Against the draft, which is what the gate used to read, nothing is wrong: the content is itself.
    assert.deepEqual(validateAdditive(parseGraphSnapshot(newestSnapshot(directory)!.text), dateless), [])
    // Closed and under review, L3 is still not its own judge; published, it is the record L4 is held to.
    assert.equal(heldTo(3, 2), 2)
    assert.equal(heldTo(3, 3), 3)
    assert.equal(heldTo(4, 3), 3)

    // A lot that closed without writing its own leaves the next one held to nothing recent.
    rmSync(join(directory, snapshotFileName(2)))
    assert.deepEqual(
      snapshotForGate(snapshotsIn(directory), 3, 2).issues.map((issue) => issue.code),
      ['graph-snapshot-stale'],
      'the only snapshot is the draft of the lot being written, and the gate took it for a record',
    )
    assert.equal(snapshotForGate(snapshotsIn(directory), 3, 2).graph, null)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

await test('the snapshot of a closed lot cannot be rewritten or edited without the gate saying so', () => {
  const text = serialiseGraphSnapshot(NOW)
  const at = (lot: number, body: string) => ({ lot, path: `${RELEASES_DIRECTORY}/${snapshotFileName(lot)}`, text: body })
  const pinned = { 2: snapshotDigest(text) }
  assert.match(snapshotDigest(text), /^[0-9a-f]{64}$/)

  assert.deepEqual(frozenSnapshotProblems([at(2, text)], 2, pinned), [])
  // Lots before the first snapshot owe none, and an open lot's draft is not judged here.
  assert.deepEqual(frozenSnapshotProblems([at(2, text), at(3, text)], 2, pinned), [])
  assert.deepEqual(frozenSnapshotProblems([], 1, {}), [])
  assert.equal(FIRST_SNAPSHOT_LOT, 2)

  // Rewritten by the script after the content grew (what `graph:snapshot` did without asking).
  const grown = serialiseGraphSnapshot({ ...NOW, actions: [...NOW.actions, { id: 'container:added-since', requires: ['room:atrium'], grants: [] }] })
  assert.match(frozenSnapshotProblems([at(2, grown)], 2, pinned).join('\n'), /L2\.graph\.json is not the file L2 closed with/)
  // A line deleted by hand: still a well-formed snapshot, and not the record.
  const shorter = serialiseGraphSnapshot({ ...NOW, actions: NOW.actions.slice(1) })
  assert.equal(frozenSnapshotProblems([at(2, shorter)], 2, pinned).length, 1)
  // A closed lot with no file, and one whose digest nobody wrote down.
  assert.match(frozenSnapshotProblems([], 2, pinned).join('\n'), /L2\.graph\.json is missing/)
  const unpinned = frozenSnapshotProblems([at(2, text)], 2, {}).join('\n')
  assert.match(unpinned, /pinned nowhere/)
  assert.ok(unpinned.includes(snapshotDigest(text)), 'the message does not give the digest to pin')
  // Every closed lot, not only the newest: L2's record still counts when L3 is done.
  assert.match(frozenSnapshotProblems([at(3, text)], 3, { 3: snapshotDigest(text) }).join('\n'), /L2\.graph\.json is missing/)
  // A digest pinned for a lot the plan does not give as done is a record of nothing.
  assert.match(frozenSnapshotProblems([at(2, text)], 2, { ...pinned, 3: pinned[2] }).join('\n'), /L3 is pinned/)

  // The real table names every lot the plan gives as done, and no other.
  assert.deepEqual(
    Object.keys(FROZEN_SNAPSHOTS).map(Number).sort((first, second) => first - second),
    Array.from({ length: Math.max(0, LOT_DONE - FIRST_SNAPSHOT_LOT + 1) }, (_, index) => index + FIRST_SNAPSHOT_LOT),
  )
})

await test('`npm run graph:snapshot` refuses to write the file of a lot the plan gives as done', () => {
  // An open lot is written freely; a closed one only when asked to reopen it.
  assert.equal(snapshotWriteRefusal(3, 2, false), null)
  assert.equal(snapshotWriteRefusal(3, 2, true), null)
  assert.match(snapshotWriteRefusal(2, 2, false) ?? '', /L2\.graph\.json is the record of a lot the plan gives as done/)
  assert.match(snapshotWriteRefusal(2, 2, false) ?? '', /--reopen/)
  assert.match(snapshotWriteRefusal(2, 3, false) ?? '', /record/)
  assert.equal(snapshotWriteRefusal(2, 2, true), null)

  // The script itself, on this tree, told to write nothing: it has to answer
  // as the rule says for the lot the content stands at today.
  const path = resolve(ROOT, RELEASES_DIRECTORY, snapshotFileName(CONTENT_LOT))
  const before = existsSync(path) ? readText(path) : null
  const run = (...flags: string[]) =>
    spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/graph-snapshot.ts', '--dry-run', ...flags], { cwd: ROOT, encoding: 'utf8' })
  const plain = run()
  const refusal = snapshotWriteRefusal(CONTENT_LOT, LOT_DONE, false)
  if (refusal) {
    assert.equal(plain.status, 1, `the script would write the record of L${CONTENT_LOT}: ${plain.stdout}`)
    assert.ok(plain.stderr.includes(refusal), plain.stderr)
  } else {
    assert.equal(plain.status, 0, plain.stderr)
  }
  const reopened = run('--reopen')
  assert.equal(reopened.status, 0, reopened.stderr)
  assert.match(reopened.stdout, /SHA-256 [0-9a-f]{64}/)
  assert.match(reopened.stdout, /nothing was written/)
  assert.equal(existsSync(path) ? readText(path) : null, before, 'a dry run wrote the file')
})

await test('the gate refuses to run without a snapshot, with one a lot too old, or with one nobody wrote', () => {
  const directory = mkdtempSync(join(tmpdir(), 'museum-releases-'))
  try {
    const write = (name: string, text: string) => writeFileSync(join(directory, name), text, 'utf8')
    const gate = (lot: number) => snapshotForGate(snapshotsIn(directory), lot, lot - 1)
    const codes = (lot: number) => gate(lot).issues.map((issue) => `${issue.severity} ${issue.code}`)

    // Nothing there, or no directory at all: this is the state before the first snapshot.
    assert.deepEqual(codes(2), ['error graph-snapshot-missing'])
    assert.equal(newestSnapshot(join(directory, 'not-there')), null)
    assert.deepEqual(snapshotsIn(join(directory, 'not-there')), [])
    assert.deepEqual(snapshotForGate([], 2, 1).issues.map((issue) => issue.code), ['graph-snapshot-missing'])
    assert.equal(snapshotForGate([], 2, 1).graph, null)
    write('notes.md', 'not a snapshot')
    assert.deepEqual(codes(2), ['error graph-snapshot-missing'])

    // The lot in progress and the one before it are recent enough.
    write(snapshotFileName(2), serialiseGraphSnapshot(graphSnapshot(MUSEUM, 2)))
    assert.deepEqual(codes(2), [])
    assert.deepEqual(codes(3), [])
    assert.equal(gate(3).graph?.lot, 2)
    // A whole lot closed without writing its own.
    assert.deepEqual(codes(4), ['error graph-snapshot-stale'])

    // The newest is the highest lot, not the last name in the directory.
    write(snapshotFileName(10), serialiseGraphSnapshot(graphSnapshot(MUSEUM, 10)))
    assert.equal(newestSnapshot(directory)?.lot, 10)
    assert.deepEqual(snapshotsIn(directory).map((snapshot) => snapshot.lot), [2, 10])
    assert.deepEqual(codes(11), [])

    // A file renamed by hand, and one that is not a snapshot.
    write(snapshotFileName(11), serialiseGraphSnapshot(graphSnapshot(MUSEUM, 10)))
    assert.deepEqual(codes(12), ['error graph-snapshot-invalid'])
    write(snapshotFileName(11), '{ "lot": 11 }')
    assert.deepEqual(codes(12), ['error graph-snapshot-invalid'])
    write(snapshotFileName(11), 'not json')
    assert.deepEqual(codes(12), ['error graph-snapshot-invalid'])

    // A checkout that turned the line ends is the same file, and has the same digest.
    mkdirSync(join(directory, 'crlf'))
    writeFileSync(join(directory, 'crlf', snapshotFileName(2)), serialiseGraphSnapshot(NOW).replaceAll('\n', '\r\n'), 'utf8')
    assert.equal(newestSnapshot(join(directory, 'crlf'))?.text, serialiseGraphSnapshot(NOW))
    assert.deepEqual(frozenSnapshotProblems(snapshotsIn(join(directory, 'crlf')), 2, { 2: snapshotDigest(serialiseGraphSnapshot(NOW)) }), [])
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
  // And the gate script asks: it reads what is on disk and what the plan says
  // is published, and hands the record to the gate.
  const script = readText(resolve(ROOT, 'scripts/validate-content.ts'))
  assert.match(script, /snapshotForGate\(snapshotsIn\([^)]*\), CONTENT_LOT, lastLotPublished\(plan\)\)/)
  assert.match(script, /previousGraph: previous\.graph/)
  assert.match(script, /\.\.\.previous\.issues,/)
  assert.match(script, /formatScript\(simulateProgress\(MUSEUM\)\.levels\)/)
  // And the script that writes asks before it writes.
  const writer = squeezed(readText(resolve(ROOT, 'scripts/graph-snapshot.ts')))
  assert.ok(
    writer.indexOf('snapshotWriteRefusal(CONTENT_LOT, lastLotDone(') > 0 && writer.indexOf('snapshotWriteRefusal(') < writer.indexOf('writeFileSync('),
    'scripts/graph-snapshot.ts writes before it asks whether the lot is closed',
  )
})

done('playthrough checks')
