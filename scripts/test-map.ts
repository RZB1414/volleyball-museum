/**
 * Headless proof of what the plan shows.
 *
 *   npm run test:map
 *
 * The plan in the notebook used to be drawn by a component that decided what
 * to draw while drawing it, and what it drew was the building: every room in
 * outline, walked or not; every doorway, the service shortcut included, before
 * the player had found it; a round marker that pointed nowhere; and a legend
 * of three colours with no title, which said "pieces to catalogue" of an
 * office that has no pieces.
 *
 * The plan is now a model, `mapModel(content, progress, player)`, and the
 * component draws it. The rules (docs/PLANO-ATE-O-FINAL.md, 8.7):
 *
 *   - a room is on the plan once it has been visited;
 *   - a doorway is on the plan once one of its two rooms is, one per opening;
 *     where the room beyond it has not been visited, a short stub and a "?";
 *   - a door that opens from one side only is not on the plan, from either
 *     side, until it has been opened; from then on it is a door like the rest;
 *   - a lock is listed once touched, until opened;
 *   - the marker points the way the player faces, and north is up;
 *   - the three states of a room differ by pattern AND by colour.
 *
 * Everything here asks the pure model. The last check holds the component to
 * drawing the model and nothing else.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { journalLayoutProblems, planWiringProblems, type SourceReader } from './lib/runtimeWiring.ts'
import { openGame, suite } from './lib/storePage.ts'

const { en } = await import('../src/content/i18n/en.ts')
const { ptBR } = await import('../src/content/i18n/pt-BR.ts')
const { MUSEUM } = await import('../src/content/museum.ts')
const { fixtureLot, SAVE_FIXTURES } = await import('../src/content/saveFixtures.ts')
const { attemptLock } = await import('../src/engine/lockRules.ts')
const { doorGrant } = await import('../src/engine/progressGrants.ts')
const { buildTransitionDoorSpecs } = await import('../src/engine/transitionDoorTopology.ts')
const { emptyProgress, grantProgress } = await import('../src/state/progressFields.ts')
const { migrateProgress } = await import('../src/state/saveMigrations.ts')
const { headingDegrees, MAP_STATE_LABEL, MAP_STATE_STYLE, MAP_STATES, mapFrame, mapModel } = await import('../src/ui/mapModel.ts')

type Progress = ReturnType<typeof emptyProgress>
type Model = ReturnType<typeof mapModel>
type Door = Model['doors'][number]
type Player = Parameters<typeof mapModel>[2]

const { test, done } = suite('The plan')

// ---------------------------------------------------------------------------
// The museum, as the suite needs to ask about it
// ---------------------------------------------------------------------------

const ROOM_IDS = MUSEUM.rooms.map((room) => room.id as string)
const roomOf = (id: string) => {
  const room = MUSEUM.rooms.find((candidate) => candidate.id === id)
  assert.ok(room, `room "${id}" exists`)
  return room
}
const FRAME = mapFrame(MUSEUM.rooms)
const DOORS = buildTransitionDoorSpecs(MUSEUM.rooms)
const SHORTCUT = DOORS.find((door) => door.opensFrom !== null)
assert.ok(SHORTCUT, 'the museum has a door that opens from one side')
const SHORTCUT_ID = 'atrium-from-holyoke-shortcut'
assert.equal(SHORTCUT.id, SHORTCUT_ID)

/** A portal's opening, in the plan's own units. */
const portalPoint = (roomId: string, portalId: string) => {
  const room = roomOf(roomId)
  const portal = room.portals.find((candidate) => candidate.id === portalId)
  assert.ok(portal, `${roomId} has a portal "${portalId}"`)
  return { x: FRAME.toX(room.origin[0] + portal.position[0]), y: FRAME.toY(room.origin[2] + portal.position[2]) }
}
const midway = (first: { x: number; y: number }, second: { x: number; y: number }) => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
})

/** The three openings of the house, each by the wall line of either of its rooms. */
const OPENINGS = {
  office: { atrium: portalPoint('atrium', 'atrium-to-office'), office: portalPoint('office', 'office-to-atrium') },
  wing: { atrium: portalPoint('atrium', 'atrium-to-holyoke'), holyoke: portalPoint('holyoke', 'holyoke-to-atrium') },
  shortcut: { atrium: portalPoint('atrium', SHORTCUT_ID), holyoke: portalPoint('holyoke', 'holyoke-shortcut') },
} as const

const near = (first: number, second: number, epsilon = 1e-6) => Math.abs(first - second) <= epsilon
const centreOf = (door: Door) => ({ x: (door.gap.x1 + door.gap.x2) / 2, y: (door.gap.y1 + door.gap.y2) / 2 })
const lengthOf = (segment: Door['gap']) => Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1)
/** The door of the model whose gap is centred here, if it drew one. */
const doorAt = (model: Model, point: { x: number; y: number }) =>
  model.doors.find((door) => near(centreOf(door).x, point.x) && near(centreOf(door).y, point.y))
/** A door drawn anywhere across this opening: on either wall line, or between them. */
const doorAcross = (model: Model, opening: Record<string, { x: number; y: number }>) => {
  const [first, second] = Object.values(opening)
  return doorAt(model, first) ?? doorAt(model, second) ?? doorAt(model, midway(first, second))
}

/** Standing in the middle of a room, looking north. */
const standingIn = (roomId: string, yaw = 0): Player => {
  const room = roomOf(roomId)
  return { x: room.origin[0], z: room.origin[2], yaw, room: roomId }
}
const holding = (patch: Partial<Progress> = {}): Progress => ({ ...emptyProgress(), ...patch })
const plan = (patch: Partial<Progress>, player: Player = standingIn((patch.roomsVisited ?? ['office'])[0] ?? 'office')) =>
  mapModel(MUSEUM, holding(patch), player)
const roomIds = (model: Model) => model.rooms.map((room) => room.id)

/** Everything the save can hold about a house it has walked end to end, with no door released. */
const EVERYTHING_BUT_ROOMS: Partial<Progress> = {
  roomsPowered: ROOM_IDS,
  catalogued: MUSEUM.exhibits.map((exhibit) => exhibit.id),
  documentsRead: MUSEUM.documents.map((doc) => doc.id),
  locksSeen: MUSEUM.locks.map((lock) => lock.id),
}

// ---------------------------------------------------------------------------
// What a player has seen is what the plan shows
// ---------------------------------------------------------------------------

await test('a new game: one room, and one stub where its door leads', async () => {
  // Through the store, so that "a new game" is what the title button makes
  // and not what this suite supposes it makes.
  const page = await openGame()
  page.state().start()
  const { spawn } = MUSEUM
  const origin = roomOf(spawn.room).origin
  const model = mapModel(MUSEUM, page.progress(), {
    x: origin[0] + spawn.position[0],
    z: origin[2] + spawn.position[2],
    yaw: spawn.yaw,
    room: spawn.room,
  })

  assert.deepEqual(roomIds(model), ['office'], 'the plan shows rooms nobody has walked into')
  assert.equal(model.rooms[0].current, true)
  assert.equal(model.rooms[0].state, 'unpowered', 'the night begins in the dark')
  assert.equal(model.doors.length, 1, 'the office has one door')
  const [door] = model.doors
  assert.ok(doorAt(model, OPENINGS.office.office), 'the door is cut in the office\'s own wall')
  assert.ok(door.stub, 'the room beyond the door has not been visited: a stub, and a "?"')
  // Out of the office, which is west: 1.2 m of line and the mark beyond its end.
  const centre = centreOf(door)
  assert.ok(near(door.stub.line.x1, centre.x) && near(door.stub.line.y1, centre.y), 'the stub leaves the doorway')
  assert.ok(near(door.stub.line.x2, centre.x - 12) && near(door.stub.line.y2, centre.y), 'and runs 1.2 m out of the room')
  assert.ok(door.stub.x < door.stub.line.x2 && near(door.stub.y, centre.y), 'the "?" stands past its end')
  assert.deepEqual(model.locks, [])
  assert.deepEqual(model.rooms[0].pips, [], 'the office has no piece to catalogue')
})

await test('the atrium walked into: two rooms, the office door plain, the wing\'s with a stub, no shortcut', () => {
  const model = plan({ roomsVisited: ['office', 'atrium'] }, standingIn('atrium'))
  // In the order of the content, whatever the order they were walked in.
  assert.deepEqual(roomIds(model), ['atrium', 'office'])
  assert.deepEqual(model.rooms.map((room) => room.current), [true, false])
  assert.equal(model.doors.length, 2, 'the shortcut is drawn before the player has opened it')

  const office = doorAt(model, midway(OPENINGS.office.atrium, OPENINGS.office.office))
  assert.ok(office, 'the office door is one opening through both walls')
  assert.equal(office.stub, null, 'both of its rooms are on the plan')

  const wing = doorAt(model, OPENINGS.wing.atrium)
  assert.ok(wing, 'the wing\'s door is cut in the atrium\'s wall')
  assert.ok(wing.stub)
  assert.ok(wing.stub.line.x2 < wing.stub.line.x1 && near(wing.stub.line.y1, wing.stub.line.y2), 'it points west, out of the atrium')

  assert.equal(doorAcross(model, OPENINGS.shortcut), undefined, 'the shortcut is on the plan')
  // The four balls of the hall, where they stand, and none of the wing's pieces.
  const atrium = roomOf('atrium')
  assert.deepEqual(model.rooms[0].pips.map((pip) => pip.id), atrium.exhibitIds)
  for (const pip of model.rooms[0].pips) {
    const exhibit = MUSEUM.exhibits.find((candidate) => candidate.id === pip.id)!
    assert.ok(near(pip.x, FRAME.toX(atrium.origin[0] + exhibit.position[0])), pip.id)
    assert.ok(near(pip.y, FRAME.toY(atrium.origin[2] + exhibit.position[2])), pip.id)
  }
})

await test('three rooms and the shortcut still latched: two doors, from whichever side one looks', () => {
  const model = plan({ roomsVisited: ROOM_IDS })
  assert.deepEqual(roomIds(model), ROOM_IDS)
  assert.equal(model.doors.length, 2)
  assert.ok(model.doors.every((door) => door.stub === null))
  assert.equal(doorAcross(model, OPENINGS.shortcut), undefined, 'the latched shortcut is on the plan')
  // Not from the wing's side either, where the bar is: a door is on the plan
  // once it has been opened, and there is no such thing as a door "seen".
  const fromTheWing = plan({ roomsVisited: ['holyoke'] })
  assert.equal(fromTheWing.doors.length, 1)
  assert.ok(doorAt(fromTheWing, OPENINGS.wing.holyoke)?.stub)
  assert.equal(doorAcross(fromTheWing, OPENINGS.shortcut), undefined)
  // The id of the portal facing the door across the opening releases nothing.
  const wrongId = plan({ roomsVisited: ROOM_IDS, doorsReleased: ['holyoke-shortcut', 'atrium-to-holyoke'] })
  assert.equal(wrongId.doors.length, 2)
})

await test('the shortcut released: three doors, and none unlike the others', () => {
  // By the verb the game uses, from the side the bar is on.
  const release = doorGrant(SHORTCUT, 'holyoke', [])
  assert.ok(release)
  const model = mapModel(MUSEUM, grantProgress(holding({ roomsVisited: ROOM_IDS }), release), standingIn('atrium'))
  assert.equal(model.doors.length, 3)
  const shortcut = doorAt(model, midway(OPENINGS.shortcut.atrium, OPENINGS.shortcut.holyoke))
  assert.ok(shortcut, 'the released shortcut is not where its opening is')

  // A door like any other: nothing in the model says which of the three it is.
  const shape = (door: Door) => ({
    fields: Object.keys(door).sort(),
    width: Math.round(lengthOf(door.gap) * 1e6),
    depth: Math.round(door.depth * 1e6),
    jambs: door.jambs.map((jamb) => Math.round(lengthOf(jamb) * 1e6)),
    stub: door.stub,
  })
  const [first, ...rest] = model.doors.map(shape)
  for (const other of rest) assert.deepEqual(other, first)
  assert.equal(new Set(model.doors.map((door) => door.key)).size, 3, 'two doors share a key')

  // With only the atrium on the plan it is still a door like the rest: a stub.
  const fromTheAtrium = plan({ roomsVisited: ['atrium'], doorsReleased: [SHORTCUT_ID] })
  assert.ok(doorAt(fromTheAtrium, OPENINGS.shortcut.atrium)?.stub)
})

await test('an opening is drawn once, through every wall line it crosses', () => {
  const model = plan({ roomsVisited: ROOM_IDS, doorsReleased: [SHORTCUT_ID] })
  const portals = MUSEUM.rooms.flatMap((room) => room.portals)
  assert.equal(portals.length, 6)
  assert.equal(model.doors.length, 3, 'six portals are three openings: each is declared on both of its walls')
  for (const opening of Object.values(OPENINGS)) {
    const [first, second] = Object.values(opening)
    const door = doorAt(model, midway(first, second))
    assert.ok(door)
    const between = Math.hypot(first.x - second.x, first.y - second.y)
    assert.ok(between > 1, 'the two rooms\' wall lines are apart on the plan')
    // As wide as the door, and deep enough to cut both lines and their strokes.
    assert.ok(near(lengthOf(door.gap), 16), 'a 1.6 m opening')
    assert.ok(door.depth >= between + 3, `the gap is ${door.depth} deep and the wall lines ${between} apart`)
    for (const jamb of door.jambs) assert.ok(lengthOf(jamb) >= between + 4, 'a jamb stops short of one of the walls')
  }
  // One side only: the opening is in that room's wall, as deep as one line.
  const alone = plan({ roomsVisited: ['atrium'] })
  const wing = doorAt(alone, OPENINGS.wing.atrium)
  assert.ok(wing)
  assert.ok(wing.depth < doorAt(model, midway(OPENINGS.wing.atrium, OPENINGS.wing.holyoke))!.depth)
})

// ---------------------------------------------------------------------------
// Nothing of a room the player has not visited
// ---------------------------------------------------------------------------

/** Every point the model would have something drawn at. */
function pointsOf(model: Model): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  const ends = (segment: Door['gap']) => points.push({ x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 })
  for (const room of model.rooms) {
    for (const dx of [0, room.width]) for (const dy of [0, room.height]) points.push({ x: room.x + dx, y: room.y + dy })
    points.push(...room.pips)
  }
  for (const door of model.doors) {
    ends(door.gap)
    door.jambs.forEach(ends)
    if (door.stub) {
      ends(door.stub.line)
      points.push({ x: door.stub.x, y: door.stub.y })
    }
  }
  points.push(model.player, model.north)
  return points
}

const cornersOf = (roomId: string) => {
  const room = roomOf(roomId)
  const xs = [room.origin[0] - room.shell.width / 2, room.origin[0] + room.shell.width / 2].map(FRAME.toX)
  const ys = [room.origin[2] - room.shell.depth / 2, room.origin[2] + room.shell.depth / 2].map(FRAME.toY)
  return xs.flatMap((x) => ys.map((y) => ({ x, y })))
}

await test('nothing of a room that was not visited is in the model, for every set of visited rooms', () => {
  assert.equal(ROOM_IDS.length, 3)
  let subsets = 0
  for (let mask = 0; mask < 1 << ROOM_IDS.length; mask += 1) {
    subsets += 1
    const visited = ROOM_IDS.filter((_, index) => mask & (1 << index))
    const hidden = ROOM_IDS.filter((id) => !visited.includes(id))
    // With nothing else in the save, with everything else in it, and with
    // every door of the house released on top of that.
    for (const rest of [{}, EVERYTHING_BUT_ROOMS, { ...EVERYTHING_BUT_ROOMS, doorsReleased: DOORS.map((door) => door.id) }]) {
      const model = plan({ ...rest, roomsVisited: visited }, standingIn(visited[0] ?? MUSEUM.spawn.room))
      const where = `visited [${visited.join(', ')}]${Object.keys(rest).length ? ', the rest of the save full' : ''}`
      assert.deepEqual(roomIds(model), visited, where)

      // The locks are the player's own list, not a room's: touched is known.
      const drawn = JSON.stringify({ ...model, locks: [] })
      for (const id of hidden) {
        const room = roomOf(id)
        const names = [id, room.titleKey, room.nicknameKey, ...room.exhibitIds, ...room.documentIds, ...room.portals.map((portal) => portal.id)]
        for (const name of names) {
          assert.ok(!drawn.includes(name), `${where}: the model says "${name}", of a room that is not on the plan`)
        }
        const corners = cornersOf(id)
        for (const point of pointsOf(model)) {
          assert.ok(
            !corners.some((corner) => near(corner.x, point.x) && near(corner.y, point.y)),
            `${where}: something is drawn at a corner of ${id} (${point.x}, ${point.y})`,
          )
        }
      }
      // No room, no door: an opening is drawn when one of its rooms is.
      if (visited.length === 0) assert.deepEqual(model.doors, [], where)
      // A stub is the only thing that leaves the visited rooms, and only by its own length.
      for (const door of model.doors) {
        if (!door.stub) continue
        assert.ok(near(lengthOf(door.stub.line), 12), `${where}: a stub is 1.2 m`)
      }
    }
  }
  assert.equal(subsets, 8)
})

await test('the frame is the whole building\'s, whatever has been visited (DL2-14)', () => {
  const sizes = new Set<string>()
  for (const visited of [[], ['office'], ['office', 'atrium'], ROOM_IDS]) {
    const model = plan({ roomsVisited: visited })
    sizes.add(`${model.width} x ${model.height}`)
  }
  assert.deepEqual([...sizes], [`${FRAME.width} x ${FRAME.height}`])
  // 36.5 m by 18 m of building at ten units a metre, and a margin all round.
  assert.equal(FRAME.width, 365 + 48)
  assert.equal(FRAME.height, 180 + 48)
  // A room the save names and this build does not have is simply not drawn.
  assert.deepEqual(roomIds(plan({ roomsVisited: ['office', 'ala-4'] })), ['office'])
})

// ---------------------------------------------------------------------------
// The three states of a room
// ---------------------------------------------------------------------------

await test('a room is dark, lit with something left, or complete', () => {
  const stateOf = (roomId: string, patch: Partial<Progress>) => {
    const model = plan({ roomsVisited: ROOM_IDS, ...patch })
    return model.rooms.find((room) => room.id === roomId)!.state
  }
  // The office: no piece at all, one paper on the desk and one behind the drawer.
  const office = roomOf('office')
  assert.deepEqual(office.exhibitIds, [])
  assert.deepEqual([...office.documentIds].sort(), ['doc-predecessor', 'doc-welcome'])
  assert.equal(stateOf('office', {}), 'unpowered')
  assert.equal(stateOf('office', { documentsRead: ['doc-welcome', 'doc-predecessor'] }), 'unpowered', 'read in the dark is still dark')
  assert.equal(stateOf('office', { roomsPowered: ['office'] }), 'partial')
  assert.equal(stateOf('office', { roomsPowered: ['office'], documentsRead: ['doc-welcome'] }), 'partial', 'the note in the drawer is unread')
  assert.equal(stateOf('office', { roomsPowered: ['office'], documentsRead: ['doc-welcome', 'doc-predecessor'] }), 'complete')
  // Another room's light is not this one's.
  assert.equal(stateOf('office', { roomsPowered: ['atrium', 'holyoke'] }), 'unpowered')

  // The wing: eight pieces and three papers.
  const wing = roomOf('holyoke')
  const lit = { roomsPowered: ['holyoke'] }
  assert.equal(stateOf('holyoke', lit), 'partial')
  assert.equal(stateOf('holyoke', { ...lit, catalogued: wing.exhibitIds }), 'partial', 'the papers are unread')
  assert.equal(stateOf('holyoke', { ...lit, documentsRead: wing.documentIds }), 'partial', 'the pieces are uncatalogued')
  assert.equal(stateOf('holyoke', { ...lit, catalogued: wing.exhibitIds.slice(1), documentsRead: wing.documentIds }), 'partial')
  assert.equal(stateOf('holyoke', { ...lit, catalogued: wing.exhibitIds, documentsRead: wing.documentIds }), 'complete')
  // Catalogued by torchlight (D17) is catalogued, and the room still has no light.
  assert.equal(stateOf('holyoke', { catalogued: wing.exhibitIds, documentsRead: wing.documentIds }), 'unpowered')

  // A pip for every piece still to catalogue, and only for those.
  const oneLeft = plan({ roomsVisited: ROOM_IDS, ...lit, catalogued: wing.exhibitIds.slice(1) })
  assert.deepEqual(oneLeft.rooms.find((room) => room.id === 'holyoke')!.pips.map((pip) => pip.id), [wing.exhibitIds[0]])
})

await test('no two states share a pattern or a colour', () => {
  const states = Object.keys(MAP_STATE_STYLE)
  assert.deepEqual([...states].sort(), ['complete', 'partial', 'unpowered'])
  assert.deepEqual([...MAP_STATES].sort(), [...states].sort(), 'the legend leaves a state out')
  const styles = Object.values(MAP_STATE_STYLE)
  assert.equal(new Set(styles.map((style) => style.pattern)).size, states.length, 'two states are told apart by colour alone')
  assert.equal(new Set(styles.map((style) => style.colour.toLowerCase())).size, states.length, 'two states are told apart by pattern alone')
  // What 8.7 of the plan asks for: dashed, hatched, solid.
  assert.deepEqual(
    Object.fromEntries(Object.entries(MAP_STATE_STYLE).map(([state, style]) => [state, style.pattern])),
    { unpowered: 'dashed', partial: 'hatched', complete: 'solid' },
  )
  for (const style of styles) assert.match(style.colour, /^#[0-9a-f]{6}$/i)
  // Every state the model can give a room has a style and a name in the legend.
  const seen = new Set<string>()
  for (const patch of [{}, { roomsPowered: ROOM_IDS }, { ...EVERYTHING_BUT_ROOMS }]) {
    for (const room of plan({ roomsVisited: ROOM_IDS, ...patch }).rooms) seen.add(room.state)
  }
  assert.deepEqual([...seen].sort(), [...states].sort())
  for (const state of states) assert.ok(MAP_STATE_LABEL[state as keyof typeof MAP_STATE_LABEL] in ptBR, state)
})

// ---------------------------------------------------------------------------
// Locks: touched, by name
// ---------------------------------------------------------------------------

await test('a lock: never touched, absent; touched, by name; opened, gone', () => {
  const drawer = MUSEUM.locks.find((lock) => lock.id === 'office-drawer')!
  let progress = holding({ roomsVisited: ROOM_IDS })
  const locks = () => mapModel(MUSEUM, progress, standingIn('office')).locks
  assert.deepEqual(locks(), [], 'the plan names a lock nobody has touched')

  const touch = attemptLock(drawer, MUSEUM.facts, progress, { kind: 'touch' })
  assert.equal(touch.outcome, 'ask')
  if (touch.outcome === 'ask') progress = grantProgress(progress, touch.grant)
  assert.deepEqual(locks(), [{ id: 'office-drawer', labelKey: 'lock.office-drawer.mapLabel' }])
  assert.equal(ptBR['lock.office-drawer.mapLabel'], 'Gaveta com segredo — 4 dígitos')

  const wrong = attemptLock(drawer, MUSEUM.facts, progress, { kind: 'code', entry: '1895' })
  if (wrong.outcome !== 'open') progress = grantProgress(progress, wrong.grant)
  assert.equal(locks().length, 1, 'a wrong code took the lock off the plan')

  const right = attemptLock(drawer, MUSEUM.facts, progress, { kind: 'code', entry: '1896' })
  assert.equal(right.outcome, 'opened')
  if (right.outcome === 'opened') progress = grantProgress(progress, right.grant)
  assert.deepEqual(locks(), [], 'an open lock is still listed')
})

// ---------------------------------------------------------------------------
// The marker and the north
// ---------------------------------------------------------------------------

await test('the marker stands where the player stands and points where the camera looks', () => {
  // Yaw 0 looks down -Z, which is north and up the page; a positive yaw turns
  // left. The heading is degrees clockwise, for an SVG rotate().
  assert.ok(Object.is(headingDegrees(0), 0), 'looking north is 0, and not -0')
  assert.ok(near(headingDegrees(Math.PI / 2), -90), 'a quarter turn left looks west')
  assert.ok(near(headingDegrees(-Math.PI / 2), 90), 'a quarter turn right looks east')
  assert.ok(near(Math.abs(headingDegrees(Math.PI)), 180), 'about face looks south')
  assert.ok(near(Math.abs(headingDegrees(-Math.PI)), 180))
  // The camera's yaw is never wrapped: after turning round and round, the same answers.
  assert.ok(near(headingDegrees(Math.PI / 2 + 6 * Math.PI), -90))
  assert.ok(near(headingDegrees(-Math.PI / 2 - 4 * Math.PI), 90))
  assert.ok(near(headingDegrees(Math.PI / 4), -45))
  for (const yaw of [-50, -7.3, -Math.PI, 0.001, 3, 12.56, 400]) {
    const degrees = headingDegrees(yaw)
    assert.ok(degrees >= -180 && degrees <= 180, `yaw ${yaw} gives ${degrees}`)
    // The same direction as the yaw it came from.
    assert.ok(near(Math.sin((degrees * Math.PI) / 180), Math.sin(-yaw), 1e-9) && near(Math.cos((degrees * Math.PI) / 180), Math.cos(-yaw), 1e-9))
  }
  for (const junk of [Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(headingDegrees(junk), 0)

  const player = { x: -3.5, z: 4.25, yaw: Math.PI / 2, room: 'atrium' }
  const model = plan({ roomsVisited: ['office', 'atrium'] }, player)
  assert.ok(near(model.player.x, FRAME.toX(-3.5)) && near(model.player.y, FRAME.toY(4.25)))
  assert.ok(near(model.player.headingDegrees, -90), 'the model does not hand on the yaw it was given')
  // East is right and north is up: the plan is the floor seen from above.
  const east = plan({ roomsVisited: ['atrium'] }, { ...player, x: player.x + 1 }).player
  const north = plan({ roomsVisited: ['atrium'] }, { ...player, z: player.z - 1 }).player
  assert.ok(near(east.x - model.player.x, 10) && near(east.y, model.player.y))
  assert.ok(near(north.y - model.player.y, -10) && near(north.x, model.player.x))
  // And the model marks as current the room the player is in.
  assert.deepEqual(model.rooms.filter((room) => room.current).map((room) => room.id), ['atrium'])
})

await test('north is up, and the rose stands clear of every room of the building', () => {
  const model = plan({ roomsVisited: ROOM_IDS })
  assert.ok(model.north.y < model.height / 2, 'the rose is in the lower half')
  assert.ok(model.north.x > model.width / 2, 'the rose is on the left')
  // Every room, visited or not: the frame is fixed, so the corner the rose
  // takes has to be empty of all of them. Fourteen units is what it draws in.
  const reach = 14
  assert.ok(model.north.x - reach >= 0 && model.north.x + reach <= model.width)
  assert.ok(model.north.y - reach >= 0)
  for (const id of ROOM_IDS) {
    const [topLeft, , , bottomRight] = cornersOf(id)
    const clear =
      model.north.x + reach < topLeft.x || model.north.x - reach > bottomRight.x || model.north.y + reach < topLeft.y || model.north.y - reach > bottomRight.y
    assert.ok(clear, `the rose is drawn over ${id}`)
  }
  // The same place whatever is on the plan.
  assert.deepEqual(plan({ roomsVisited: [] }).north, model.north)
})

// ---------------------------------------------------------------------------
// The saves players have
// ---------------------------------------------------------------------------

await test('the corpus: every save shows the rooms it visited, and the shortcut only of who released it', () => {
  const planOf = (id: keyof typeof SAVE_FIXTURES) => {
    const progress = migrateProgress(JSON.parse(JSON.stringify(SAVE_FIXTURES[id].save.progress)))
    return { progress, model: mapModel(MUSEUM, progress, standingIn(progress.lastRoom)) }
  }
  const ids = Object.keys(SAVE_FIXTURES) as (keyof typeof SAVE_FIXTURES)[]
  for (const id of ids) {
    const { progress, model } = planOf(id)
    assert.deepEqual(roomIds(model), ROOM_IDS.filter((room) => progress.roomsVisited.includes(room)), id)
  }
  // A save from before L2 does not prove the player left by the shortcut
  // (DL2-3), so it is off the plan until the next exit; and a drawer left
  // shut waits for the next touch to be named (DL2-4).
  const before = ids.filter((id) => fixtureLot(SAVE_FIXTURES[id]) < 2)
  assert.ok(before.length >= 6, 'the saves from before L2 are gone from the corpus')
  for (const id of before) {
    const { model } = planOf(id)
    assert.equal(doorAcross(model, OPENINGS.shortcut), undefined, id)
    assert.equal(model.doors.length, 2, id)
    assert.deepEqual(model.locks, [], id)
  }
  // The two L2 left say it themselves. One released the shortcut: three
  // doors, none of them a stub, and no lock to name (its drawer is open).
  const released = planOf('l2-shortcut-released').model
  assert.ok(doorAcross(released, OPENINGS.shortcut), 'the shortcut this save released is not on its plan')
  assert.equal(released.doors.length, 3)
  assert.deepEqual(released.doors.filter((door) => door.stub), [])
  assert.deepEqual(released.locks, [])
  // The other stopped in the atrium with the wing unvisited and the drawer
  // touched: two rooms, the wing's door a stub, nothing where the shortcut
  // is, and the drawer by name.
  const touched = planOf('l2-new-game-drawer-touched').model
  assert.deepEqual(roomIds(touched), ['atrium', 'office'])
  assert.equal(touched.doors.length, 2)
  assert.ok(doorAt(touched, OPENINGS.wing.atrium)?.stub, 'the door to the wing nobody walked into has no stub')
  assert.equal(doorAcross(touched, OPENINGS.shortcut), undefined)
  assert.deepEqual(touched.locks.map((lock) => lock.id), ['office-drawer'])
  // The save from before the opening scene walked the atrium and the wing
  // and never the office: its door to the office is a stub.
  const preOpening = migrateProgress(JSON.parse(JSON.stringify(SAVE_FIXTURES['production-pre-opening'].save.progress)))
  const model = mapModel(MUSEUM, preOpening, standingIn('atrium'))
  assert.deepEqual(roomIds(model), ['atrium', 'holyoke'])
  assert.ok(doorAt(model, OPENINGS.office.atrium)?.stub)
  assert.equal(doorAt(model, midway(OPENINGS.wing.atrium, OPENINGS.wing.holyoke))?.stub, null)
})

// ---------------------------------------------------------------------------
// The words (lot plan, section 6)
// ---------------------------------------------------------------------------

await test('the plan\'s words are the ones the lot wrote, in both languages', () => {
  const words: Record<string, readonly [string, string]> = {
    'door.released': ['Atalho destrancado', 'Shortcut unlocked'],
    'map.legend': ['Legenda', 'Legend'],
    'map.state.unlit': ['Sem energia', 'No power'],
    'map.state.partial': ['Acesa, falta conferir', 'Lit, something left to check'],
    'map.state.complete': ['Completa', 'Complete'],
    'map.unknown': ['Sala ainda não visitada', 'A room not visited yet'],
    'map.north': ['Norte', 'North'],
    'map.you': ['Você está aqui', 'You are here'],
  }
  for (const [key, [portuguese, english]] of Object.entries(words)) {
    assert.equal((ptBR as Record<string, string>)[key], portuguese, key)
    assert.equal((en as Record<string, string>)[key], english, key)
  }
  // The legend names the three states by these keys and no others.
  assert.deepEqual(MAP_STATE_LABEL, { unpowered: 'map.state.unlit', partial: 'map.state.partial', complete: 'map.state.complete' })
  // "Lit, something left" must be true of a room with no piece in it: the old
  // words said "pieces to catalogue" of the office.
  assert.ok(!/pe[cç]a|catalog/i.test(ptBR['map.state.partial']))
  assert.ok(!/object|catalog/i.test(en['map.state.partial']))
})

// ---------------------------------------------------------------------------
// The component draws the model
// ---------------------------------------------------------------------------

const readSource: SourceReader = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

await test('the notebook draws the model, and the controller tells it which way the player faces', () => {
  assert.deepEqual(planWiringProblems(readSource), [])

  // Each of these is a refactor the check exists to catch, applied to the
  // real source in memory.
  const changed =
    (path: string, from: string | RegExp, to: string): SourceReader =>
    (asked) => {
      if (asked !== path) return readSource(asked)
      const source = readSource(asked)
      const next = source.replace(from, to)
      assert.notEqual(next, source, `the refactor of ${path} found nothing to change`)
      return next
    }
  const map = 'ui/MuseumMap.tsx'
  const refactors: readonly (readonly [string, SourceReader])[] = [
    ['the component drawing every room of the content', changed(map, 'model.rooms.map(', 'MUSEUM.rooms.map(')],
    [
      'the component listing every shut lock again',
      changed(map, /$/, '\nconst shut = (opened: string[]) => MUSEUM.locks.filter((lock) => !opened.includes(lock.id))\n'),
    ],
    [
      'the component drawing the one-way door by itself',
      changed(map, /$/, '\nconst oneWay = (portal: { oneWay?: boolean }) => (portal.oneWay ? "is-oneway" : "")\n'),
    ],
    ['the component asking the save by itself', changed(map, /$/, '\nconst seen = (progress: { roomsVisited: string[] }) => progress.roomsVisited.length\n')],
    ['the model handed another museum', changed(map, 'mapModel(MUSEUM, progress, {', 'mapModel(EVERYTHING, progress, {')],
    ['the marker with no heading', changed(map, 'yaw: playerHeading.yaw', 'yaw: 0')],
    ['the marker not turned', changed(map, ' rotate(${model.player.headingDegrees})', '')],
    ['the legend with no title', changed(map, "t('map.legend')", "''")],
    // The frame loop's own line; the dev harness's teleport keeps its copy.
    ['the controller keeping the yaw to itself', changed('engine/PlayerController.tsx', /\s*playerHeading\.yaw = camera\.rotation\.y(\s*\}\)\s*return null)/, '$1')],
    ['the model importing the museum', changed('ui/mapModel.ts', /^import /m, "import { MUSEUM } from '../content/museum.ts'\nimport ")],
    ['the model reading the store', changed('ui/mapModel.ts', /^import /m, "import { useMuseum } from '../state/store.ts'\nimport ")],
  ]
  const uncaught = refactors.filter(([, reader]) => planWiringProblems(reader).length === 0).map(([name]) => name)
  assert.deepEqual(uncaught, [], 'a refactor this check exists to catch went through')
})

await test('the notebook\'s panel fits the room its backdrop leaves it, on a phone as on a desk', () => {
  // The plan is the first page of this panel. In the browser, at 844 x 390,
  // the panel stood from x = 34 to x = 844: a margin on the left and none on
  // the right, because it asked for 96vw of a backdrop that keeps 4vw a side.
  assert.deepEqual(journalLayoutProblems(readSource), [])

  const styled =
    (from: RegExp, to: string): SourceReader =>
    (asked) => {
      const source = readSource(asked)
      if (asked !== 'styles/museum.css') return source
      const next = source.replace(from, to)
      assert.notEqual(next, source, 'the change found nothing to change')
      return next
    }
  const problemsWith = (from: RegExp, to: string) => journalLayoutProblems(styled(from, to)).join('\n')
  // Named groups: `$1` followed by a digit of the new value would read as another group.
  const panelWidth = /(?<rule>\n\.journal-panel \{\s*width: )min\(60rem, [\d.]+vw\)/
  const panelHeight = /(?<rule>\n\.journal-panel \{[^}]*height: )min\(42rem, [\d.]+vh\)/
  const backdrop = /(?<rule>\n\.journal \{[^}]*padding: )4vh 4vw/
  // The width the game shipped with since August, by value.
  assert.match(problemsWith(panelWidth, '$<rule>min(60rem, 96vw)'), /96vw between two margins of 4vw, 104 in all/)
  assert.match(problemsWith(backdrop, '$<rule>4vh 6vw'), /between two margins of 6vw/)
  assert.match(problemsWith(panelHeight, '$<rule>min(42rem, 96vh)'), /96vh between two margins of 4vh, 104 in all/)
  // A rule in a form the check cannot add up is not a rule that passes.
  assert.match(problemsWith(panelWidth, '$<rule>60rem'), /cannot add it up/)
  assert.match(problemsWith(backdrop, '$<rule>1.5rem'), /cannot add it up/)
  assert.match(problemsWith(panelHeight, '$<rule>88vh'), /cannot add it up/)
})

done('plan checks')
