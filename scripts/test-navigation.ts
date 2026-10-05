/**
 * Headless proof that a player can actually walk the museum.
 *
 *   npm run test:navigation
 *
 * Written after the owner reported "só estou podendo andar por essa sala
 * inicial" — and was right. The museum had three rooms and no working doorway
 * between any of them, for two independent reasons that had been there since
 * the shells were first baked:
 *
 *   1. `buildWall` lays its segments along +X and the caller rotates the wall
 *      into place. `rotateY(PI)` and `rotateY(PI/2)` reverse that axis, so
 *      every south and east opening came out mirrored about the wall's
 *      midpoint. Each room's hole was real; it just never met its neighbour's.
 *   2. The floor slab was exactly `shell.width` across, which stops at the
 *      centre line of its own walls. Two rooms back to back therefore had a
 *      strip of nothing directly under the doorway.
 *
 * Neither was visible in a screenshot. Both were obvious the moment anything
 * tried to walk through, which nothing ever did.
 *
 * So this test walks. It builds the real shells with the real generator, wires
 * them into the real `CollisionWorld`, and drives the real `movePlayer` with a
 * capsule the size of the real player, from the middle of one room to the
 * middle of the next. It asserts arrival, and it asserts the floor was under
 * the player the whole way — a doorway you can pass through by falling into
 * the void is not a doorway.
 *
 * The world itself lives in `scripts/lib/museumWorld.ts`, shared with the
 * power suite: shells, kit, containers and the power controls. Routes inside
 * a room start where a player really arrives in it (`arrivalPoint`), not at
 * a convenient point in the middle of the floor.
 */

import { Vector3 } from 'three'

import { BAKED_BUNDLES, type BakedBundle } from '../src/content/bake.generated.ts'
import { CONTENT_LOT, debtOf, settleKnownDebt } from '../src/content/knownDebt.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { RoomData } from '../src/content/schema.ts'
import type { ValidationIssue } from '../src/content/validate.ts'
import { movePlayer } from '../src/engine/collision.ts'
import { INTERACTION_REACH } from '../src/engine/interactionTarget.ts'
import { MOUNT_PARTS } from '../src/engine/runtimePlacedParts.ts'
// @ts-expect-error - the bake is plain JS with no type declarations.
import { prepareRoomShells } from './bake/kit.mjs'
import {
  arrivalPoint,
  buildMuseumWorld,
  CAPSULE,
  colliderPartsFor as colliderPartsOf,
  controlNormal,
  controlPoint,
  isWallControl,
  reachFromWhereTheCapsuleStops,
  roomPoint,
  STEP,
  WALK_SPEED as SPEED,
  type Placement,
} from './lib/museumWorld.ts'

/** Give up after this many simulated seconds; a real crossing takes about six. */
const TIME_LIMIT = 30
/** The player's feet must never drop this far below the floor plane. */
const FALL_LIMIT = -0.35
/** Furniture may frame a doorway, but never occupy its first usable approach. */
const PORTAL_CLEARANCE_DEPTH = 1.5

let failures = 0
let checks = 0

function check(name: string, condition: boolean, detail = '') {
  checks += 1
  if (condition) console.log(`  pass  ${name}`)
  else {
    failures += 1
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ---------------------------------------------------------------------------
// Build the museum, once, exactly as the bake does.
// ---------------------------------------------------------------------------

const kitBundle = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit') as
  | BakedBundle
  | undefined

type PreparedPortal = RoomData['portals'][number] & {
  readonly hasReciprocal: boolean
  readonly reciprocalPortalId: string | null
  readonly ownsSharedOpening: boolean
}

type PreparedRoomShell = Pick<RoomData, 'id' | 'shell'> & {
  readonly portals: readonly PreparedPortal[]
}

const ROOM_SHELLS = prepareRoomShells(MUSEUM.rooms) as PreparedRoomShell[]

// Furniture collision is data-driven. Recipes may be a root node or a set of
// `root__material` siblings; only components carrying a collider in the bake
// manifest participate. In particular, a partition collides by its wider foot
// rather than by its decorative face.
const colliderPartsFor = (placement: Placement) => colliderPartsOf(placement.part)

const world = buildMuseumWorld()

type Footprint = {
  readonly owner: string
  readonly recipe: string
  readonly centre: readonly [number, number]
  readonly axisX: readonly [number, number]
  readonly axisZ: readonly [number, number]
  readonly halfX: number
  readonly halfZ: number
  readonly minY: number
  readonly maxY: number
}

function footprintsFor(room: RoomData, owner: string, placement: Placement): Footprint[] {
  const rotation = placement.rotationY ?? 0
  const scale = placement.scale ?? 1
  const extentScale = Math.abs(scale)
  const cosine = Math.cos(rotation)
  const sine = Math.sin(rotation)

  return colliderPartsFor(placement).flatMap((part) => {
    if (!part.collider) return []
    const [centreX, centreY, centreZ] = part.collider.centre
    const [halfX, halfY, halfZ] = part.collider.halfExtents
    const localX = centreX * scale
    const localZ = centreZ * scale
    const worldY = room.origin[1] + placement.position[1] + centreY * scale

    return [{
      owner,
      recipe: placement.part,
      centre: [
        room.origin[0] + placement.position[0] + localX * cosine + localZ * sine,
        room.origin[2] + placement.position[2] - localX * sine + localZ * cosine,
      ],
      axisX: [cosine, -sine],
      axisZ: [sine, cosine],
      halfX: halfX * extentScale,
      halfZ: halfZ * extentScale,
      minY: worldY - halfY * extentScale,
      maxY: worldY + halfY * extentScale,
    }]
  })
}

function collectSolidFootprints() {
  const footprints: Footprint[] = []
  for (const room of MUSEUM.rooms) {
    room.kit.forEach((placement, index) => {
      footprints.push(
        ...footprintsFor(room, `${room.id}/kit/${index}:${placement.part}`, placement),
      )
    })

    for (const container of room.containers ?? []) {
      footprints.push(
        ...footprintsFor(room, `${room.id}/container:${container.id}`, {
          ...container,
          scale: 1,
        }),
      )
    }

    if (room.powerControl) {
      footprints.push(
        ...footprintsFor(room, `${room.id}/power:${room.powerControl.id}`, room.powerControl),
      )
    }

    for (const exhibitId of room.exhibitIds) {
      const exhibit = MUSEUM.exhibits.find((candidate) => candidate.id === exhibitId)
      if (!exhibit) continue
      // The base the scene stands under the exhibit, from the table it reads.
      const part = MOUNT_PARTS[exhibit.mount]?.part
      if (!part) continue
      footprints.push(
        ...footprintsFor(room, `${room.id}/mount:${exhibit.id}`, {
          part,
          position: [exhibit.position[0], 0, exhibit.position[2]],
          rotationY: exhibit.rotationY,
          scale: 1,
        }),
      )
    }
  }
  return footprints
}

function dot(a: readonly [number, number], b: readonly [number, number]) {
  return a[0] * b[0] + a[1] * b[1]
}

/** Strict overlap: touching faces and sub-centimetre quantisation noise are safe. */
function footprintsOverlap(a: Footprint, b: Footprint) {
  const tolerance = 0.01
  if (Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) <= tolerance) return false

  const centreDelta: [number, number] = [
    b.centre[0] - a.centre[0],
    b.centre[1] - a.centre[1],
  ]
  for (const axis of [a.axisX, a.axisZ, b.axisX, b.axisZ]) {
    const radiusA = a.halfX * Math.abs(dot(a.axisX, axis)) +
      a.halfZ * Math.abs(dot(a.axisZ, axis))
    const radiusB = b.halfX * Math.abs(dot(b.axisX, axis)) +
      b.halfZ * Math.abs(dot(b.axisZ, axis))
    if (Math.abs(dot(centreDelta, axis)) >= radiusA + radiusB - tolerance) return false
  }
  return true
}

const overlapKey = (a: Footprint, b: Footprint) => [a.owner, b.owner].sort().join('|')
// Assemblies that deliberately meet should be allowlisted by their exact owner
// ids here. Rope spans/posts currently need none because they are non-solid.
const INTENTIONAL_SOLID_OVERLAPS = new Set<string>()

/**
 * Gathering points in the open floor of each room, outside every furniture
 * footprint: where a doorway crossing begins and ends. Nobody STARTS at
 * these. The atrium's was the spawn before the night began in the office,
 * and every atrium route used to leave from it; routes inside a room now
 * leave from `arrivalPoint` and pass here on the way.
 */
const ROOM_ANCHORS = {
  atrium: [2.5, 1],
  holyoke: [-0.5, -2],
  office: [0, 1.5],
} as const

function anchorOf(roomId: keyof typeof ROOM_ANCHORS) {
  const [x, z] = ROOM_ANCHORS[roomId]
  return roomPoint(roomId, x, z)
}

/** A portal's opening in world space. */
function portalWorld(roomId: string, portalId: string) {
  const room = MUSEUM.rooms.find((candidate) => candidate.id === roomId)
  const portal = room?.portals.find((candidate) => candidate.id === portalId)
  if (!room || !portal) throw new Error(`no portal "${portalId}" in "${roomId}"`)
  return new Vector3(
    room.origin[0] + portal.position[0],
    0,
    room.origin[2] + portal.position[2],
  )
}

/** The full doorway width and first 1.5 m inside its owning room. */
function portalClearanceFootprint(
  room: RoomData,
  portal: RoomData['portals'][number],
): Footprint {
  const rotation = portal.rotationY ?? 0
  const axisX: [number, number] = [Math.cos(rotation), -Math.sin(rotation)]
  const axisZ: [number, number] = [Math.sin(rotation), Math.cos(rotation)]
  const portalX = room.origin[0] + portal.position[0]
  const portalZ = room.origin[2] + portal.position[2]
  const floorY = room.origin[1] + portal.position[1]

  return {
    owner: `${room.id}/portal:${portal.id}`,
    recipe: 'portal-clearance',
    centre: [
      portalX + axisZ[0] * PORTAL_CLEARANCE_DEPTH / 2,
      portalZ + axisZ[1] * PORTAL_CLEARANCE_DEPTH / 2,
    ],
    axisX,
    axisZ,
    halfX: portal.width / 2,
    halfZ: PORTAL_CLEARANCE_DEPTH / 2,
    minY: floorY,
    maxY: floorY + Math.min(portal.height, CAPSULE.height),
  }
}

/**
 * Walks from `from` to `to` by steering straight at a sequence of waypoints.
 *
 * Deliberately dumb: no pathfinding, no wall following. A doorway a straight
 * line cannot get through is a doorway a player will fight with.
 */
function walk(waypoints: Vector3[]) {
  const position = waypoints[0].clone()
  let verticalVelocity = 0
  let lowest = 0
  let elapsed = 0
  let target = 1

  while (target < waypoints.length && elapsed < TIME_LIMIT) {
    const goal = waypoints[target]
    const toGoal = new Vector3(goal.x - position.x, 0, goal.z - position.z)

    if (toGoal.length() < 0.25) {
      target += 1
      continue
    }

    toGoal.normalize().multiplyScalar(SPEED * STEP)
    const result = movePlayer(world, position, toGoal, verticalVelocity, STEP, CAPSULE)
    position.copy(result.position)
    verticalVelocity = result.verticalVelocity
    lowest = Math.min(lowest, position.y)
    elapsed += STEP
  }

  return { position, lowest, elapsed, arrived: target >= waypoints.length }
}

// ---------------------------------------------------------------------------
// Every doorway, in both directions.
// ---------------------------------------------------------------------------

/**
 * Each crossing is three waypoints: start in the middle of the room, aim at
 * the doorway, then aim at the middle of the next room. The doorway waypoint
 * matters — without it the straight line from centre to centre clips the wall
 * and the test would pass or fail on room proportions rather than on the door.
 */
const CROSSINGS = [
  {
    name: 'atrium → Holyoke',
    from: 'atrium',
    before: [[2, -2.5], [-7.5, -2.5]],
    via: ['atrium', 'atrium-to-holyoke'],
    to: 'holyoke',
    after: [[4.6, -2.5], [0, -2.5]],
  },
  {
    name: 'Holyoke → atrium',
    from: 'holyoke',
    before: [[0, -2.5], [4.6, -2.5]],
    via: ['holyoke', 'holyoke-to-atrium'],
    to: 'atrium',
    after: [[-7.5, -2.5], [2, -2.5]],
  },
  {
    name: 'atrium → office',
    from: 'atrium',
    before: [[5, 1.5], [7.5, 2.5]],
    via: ['atrium', 'atrium-to-office'],
    to: 'office',
    after: [],
  },
  {
    name: 'office → atrium',
    from: 'office',
    before: [],
    via: ['office', 'office-to-atrium'],
    to: 'atrium',
    after: [[7.5, 2.5], [5, 1.5]],
  },
  {
    name: 'Holyoke → atrium (shortcut)',
    from: 'holyoke',
    before: [[0, -2.5], [4.6, -2.5], [4.6, 5.4]],
    via: ['holyoke', 'holyoke-shortcut'],
    to: 'atrium',
    after: [[-7, 3], [-2, 3]],
  },
  // The same opening the other way: once the shortcut has been opened from
  // the wing it stays unlatched (`doorsReleased`), and the atrium side is a
  // way in. This world has no leaf, so the crossing was always walkable here;
  // what the route holds is that nobody furnishes the arrival, on the wing's
  // side, of a door that used to be an exit only.
  {
    name: 'atrium → Holyoke (shortcut)',
    from: 'atrium',
    before: [[-2, 3], [-7, 3]],
    via: ['atrium', 'atrium-from-holyoke-shortcut'],
    to: 'holyoke',
    after: [[4.6, 5.4], [4.6, -2.5], [0, -2.5]],
  },
] as const

console.log('Navigation:')

const reciprocalPairs = new Map<string, { roomId: string; portal: PreparedPortal }[]>()
for (const room of ROOM_SHELLS) {
  for (const portal of room.portals) {
    if (!portal.hasReciprocal || !portal.reciprocalPortalId) continue
    const endpoints = [
      `${room.id}/${portal.id}`,
      `${portal.toRoom}/${portal.reciprocalPortalId}`,
    ].sort()
    const key = endpoints.join('|')
    const declarations = reciprocalPairs.get(key) ?? []
    declarations.push({ roomId: room.id, portal })
    reciprocalPairs.set(key, declarations)
  }
}

check('reciprocal portal preparation finds three physical openings', reciprocalPairs.size === 3)
for (const [key, declarations] of reciprocalPairs) {
  const owners = declarations.filter(({ portal }) => portal.ownsSharedOpening)
  check(
    `${key} has exactly one shared-geometry owner`,
    declarations.length === 2 && owners.length === 1,
    `${declarations.length} declaration(s), owners: ${owners.map(({ roomId }) => roomId).join(', ') || 'none'}`,
  )
}

const partitionColliders = kitBundle?.parts.filter(
  (part) => (part.name === 'partition' || part.name.startsWith('partition__')) && part.collider,
) ?? []
check(
  'partition collision follows its wider foot',
  partitionColliders.length === 1 && partitionColliders[0]?.name === 'partition__foot',
  `collider parts: ${partitionColliders.map((part) => part.name).join(', ') || 'none'}`,
)

const dividerColliders = kitBundle?.parts.filter(
  (part) =>
    (part.name === 'atrium-divider-screen' ||
      part.name.startsWith('atrium-divider-screen__')) &&
    part.collider,
) ?? []
check(
  'atrium divider collision covers its wide base and full height',
  dividerColliders.length === 1 &&
    dividerColliders[0]?.name === 'atrium-divider-screen' &&
    (dividerColliders[0]?.collider?.halfExtents[1] ?? 0) >= 1.19,
  `collider parts: ${dividerColliders.map((part) => part.name).join(', ') || 'none'}`,
)

const solidFootprints = collectSolidFootprints()
const forbiddenOverlaps: string[] = []
for (let left = 0; left < solidFootprints.length; left += 1) {
  for (let right = left + 1; right < solidFootprints.length; right += 1) {
    const a = solidFootprints[left]
    const b = solidFootprints[right]
    if (a.owner === b.owner || INTENTIONAL_SOLID_OVERLAPS.has(overlapKey(a, b))) continue
    // Adjacent chords in the authored eight-piece circular barrier meet at
    // their posts by design. Its count and angular uniqueness are checked
    // separately below, so this exemption cannot hide a duplicated segment.
    if (
      a.recipe === 'atrium-barrier-segment' &&
      b.recipe === 'atrium-barrier-segment'
    ) continue
    if (footprintsOverlap(a, b)) forbiddenOverlaps.push(`${a.owner} × ${b.owner}`)
  }
}
check(
  'distinct solid furniture and exhibit mounts do not interpenetrate',
  forbiddenOverlaps.length === 0,
  forbiddenOverlaps.join('; '),
)

// A control fixed to a wall is something the player walks into: without a
// collider the capsule passes through the iron box and the eye ends inside
// the interaction volume (ÁT-A1). With one, it joins the proof above.
const wallControls = MUSEUM.rooms.flatMap((room) =>
  room.powerControl && isWallControl(room, room.powerControl) ? [{ room, control: room.powerControl }] : [],
)
const solidControls = new Set(
  solidFootprints.flatMap((footprint) => (footprint.owner.includes('/power:') ? [footprint.owner] : [])),
)
check(
  'every wall-mounted power control is solid',
  wallControls.length >= 2 &&
    wallControls.every(({ room, control }) => solidControls.has(`${room.id}/power:${control.id}`)),
  `solid: ${[...solidControls].join(', ') || 'none'}; on a wall: ${wallControls.map(({ control }) => control.id).join(', ')}`,
)
check(
  'power controls do not interpenetrate furniture',
  !forbiddenOverlaps.some((pair) => pair.includes('/power:')),
  forbiddenOverlaps.filter((pair) => pair.includes('/power:')).join('; '),
)

/**
 * The end of a route that goes to a breaker: the capsule is standing in
 * front of it, and from there, walking on until the wall stops it, the
 * centre of the screen still finds the control with the eye outside its
 * interaction volume. A route that ends in front of bare plaster fails here.
 */
function checkRouteEndsAtControl(name: string, roomId: string, end: Vector3) {
  const room = MUSEUM.rooms.find((candidate) => candidate.id === roomId)
  const control = room?.powerControl
  if (!room || !control) throw new Error(`room "${roomId}" has no power control`)
  const normal = controlNormal(control)
  const offset = end.clone().sub(controlPoint(room, control, [0, 0, 0])).setY(0)
  const ahead = offset.dot(normal)
  const aside = Math.abs(offset.clone().addScaledVector(normal, -ahead).length())
  check(
    `${name} — it ends standing in front of ${control.id}`,
    ahead > 0 && ahead <= 1.5 && aside <= 0.3,
    `ended ${ahead.toFixed(2)} m out from the control's wall and ${aside.toFixed(2)} m to its side`,
  )
  const reach = reachFromWhereTheCapsuleStops(world, room, control, end)
  check(
    `${name} — walking on until stopped, E reaches ${control.id}`,
    reach.hitDistance !== null && reach.hitDistance <= INTERACTION_REACH.powerControl && !reach.eyeInsideProxy,
    `capsule ${reach.standOff.toFixed(3)} m from the wall plane, ` +
      (reach.hitDistance === null ? 'no hit' : `hit at ${reach.hitDistance.toFixed(3)} m`) +
      (reach.eyeInsideProxy ? ', eye inside the interaction volume' : ''),
  )
}

const atriumRoom = MUSEUM.rooms.find((room) => room.id === 'atrium')
if (!atriumRoom) throw new Error('The atrium is required for its navigation proof.')
const barrierSegments = atriumRoom.kit.filter(
  (placement) => placement.part === 'atrium-barrier-segment',
)
const barrierAngles = new Set(
  barrierSegments.map((placement) => {
    const turn = ((placement.rotationY ?? 0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
    return Math.round(turn / (Math.PI / 4)) % 8
  }),
)
check(
  'atrium barrier forms eight unique 45-degree segments',
  barrierSegments.length === 8 && barrierAngles.size === 8,
  `${barrierSegments.length} segment(s), ${barrierAngles.size} unique angle(s)`,
)

for (const portal of atriumRoom.portals) {
  const clearance = portalClearanceFootprint(atriumRoom, portal)
  const intrusions = solidFootprints.filter(
    (footprint) =>
      footprint.owner.startsWith(`${atriumRoom.id}/`) &&
      footprintsOverlap(clearance, footprint),
  )

  check(
    `${atriumRoom.id}/${portal.id} keeps a 1.5 m furniture-free approach`,
    intrusions.length === 0,
    intrusions.map((footprint) => footprint.owner).join(', '),
  )
}

const holyoke = MUSEUM.rooms.find((room) => room.id === 'holyoke')
const entryScreen = holyoke?.kit.find((placement) => placement.part === 'holyoke-entry-screen')
if (!holyoke || !entryScreen) {
  throw new Error('Holyoke needs its entry screen for the collision proof.')
}

const entryScreenPoint = (x: number, z: number) => {
  const point = new Vector3(x, 0, z).applyAxisAngle(
    new Vector3(0, 1, 0),
    entryScreen.rotationY ?? 0,
  )
  point.add(
    roomPoint(
      holyoke.id,
      entryScreen.position[0],
      entryScreen.position[2],
    ),
  )
  return point
}

// Cross the broad navy monolith near its centre. This replaced the old generic
// partitions as the room's reveal, so the collision regression follows the
// furniture the player now actually encounters.
const entryScreenCrossing = walk([
  entryScreenPoint(0, -1.0),
  entryScreenPoint(0, 1.0),
])
check(
  'a frontal walk cannot pass through the Holyoke entry screen',
  !entryScreenCrossing.arrived,
  `crossed to ${entryScreenCrossing.position.toArray().map((n) => n.toFixed(2)).join(',')}`,
)

const atriumScreens = atriumRoom.kit.filter(
  (placement) => placement.part === 'atrium-divider-screen',
)
for (const [index, screen] of atriumScreens.entries()) {
  const screenPoint = (x: number, z: number) => {
    const point = new Vector3(x, 0, z).applyAxisAngle(
      new Vector3(0, 1, 0),
      screen.rotationY ?? 0,
    )
    point.add(roomPoint('atrium', screen.position[0], screen.position[2]))
    return point
  }

  const frontal = walk([screenPoint(0, -0.85), screenPoint(0, 0.85)])
  check(
    `atrium divider ${index + 1} blocks a frontal walk`,
    !frontal.arrived,
    `crossed to ${frontal.position.toArray().map((value) => value.toFixed(2)).join(',')}`,
  )

  for (const [sideName, side] of [['left', -1], ['right', 1]] as const) {
    const bypass = walk([
      screenPoint(0, -0.85),
      screenPoint(side * 1.25, -0.85),
      screenPoint(side * 1.25, 0.85),
      screenPoint(0, 0.85),
    ])
    check(
      `atrium divider ${index + 1} keeps its ${sideName} bypass usable`,
      bypass.arrived,
      `stopped at ${bypass.position.toArray().map((value) => value.toFixed(2)).join(',')}`,
    )
  }
}

// The night starts here. The spawn must stand on real floor with nothing
// around the capsule, step forward to the lane where the notebook, lamp and
// radio are all in reach, and turn round to the door it was facing away from.
const spawnPoint = roomPoint(
  MUSEUM.spawn.room,
  MUSEUM.spawn.position[0],
  MUSEUM.spawn.position[2],
)
// The same question PlayerController asks before it lets gravity and WASD run.
check(
  'the spawn capsule stands on walkable floor',
  world.hasWalkableSupportBelow(spawnPoint, CAPSULE),
)
const spawnToDesk = walk([spawnPoint.clone(), roomPoint('office', -1.2, -0.05)])
check(
  'from the spawn one step reaches the desk lane',
  spawnToDesk.arrived && spawnToDesk.lowest > FALL_LIMIT,
  `stopped at ${spawnToDesk.position.toArray().map((n) => n.toFixed(2)).join(',')}`,
)
const spawnToDoor = walk([spawnPoint.clone(), roomPoint('office', -2.45, 0)])
check(
  'from the spawn the player can turn round and reach the door',
  spawnToDoor.arrived && spawnToDoor.lowest > FALL_LIMIT,
  `stopped at ${spawnToDoor.position.toArray().map((n) => n.toFixed(2)).join(',')}`,
)

// The office is intentionally dense, but its two gameplay targets cannot be
// decoration casualties. Walk the same 1.2 m lane a player uses from the door
// past the lamp and then north to the locked archive cabinet.
const officeWorkingRoute = walk([
  roomPoint('office', -2.6, 0),
  roomPoint('office', -1.6, -0.55),
  roomPoint('office', -1.6, -2.08),
  roomPoint('office', 0.35, -2.08),
])
check(
  'office working route reaches the lamp and locked archive',
  officeWorkingRoute.arrived,
  `stopped at ${officeWorkingRoute.position.toArray().map((n) => n.toFixed(2)).join(',')}`,
)
check(
  'office working route remains supported by the floor',
  officeWorkingRoute.lowest > FALL_LIMIT,
  `dropped to y=${officeWorkingRoute.lowest.toFixed(2)}`,
)

const receptionDesk = atriumRoom.kit.find(
  (placement) => placement.part === 'atrium-reception-desk',
)
if (!receptionDesk) {
  throw new Error('The atrium needs its reception desk for the staff-route proof.')
}

const receptionColliderParts = colliderPartsFor(receptionDesk)
const receptionCounterCollider = receptionColliderParts.find(
  (part) => part.name === 'atrium-reception-desk',
)?.collider
const receptionStorageCollider = receptionColliderParts.find(
  (part) => part.name === 'atrium-reception-desk__storage',
)?.collider
check(
  'atrium reception counter and wall storage have independent colliders',
  receptionColliderParts.length === 2 &&
    Boolean(receptionCounterCollider) &&
    Boolean(receptionStorageCollider),
  `collider parts: ${receptionColliderParts.map((part) => part.name).join(', ') || 'none'}`,
)
if (!receptionCounterCollider || !receptionStorageCollider) {
  throw new Error('The reception staff-route proof requires both physical boundaries.')
}

const counterStaffEdge =
  receptionCounterCollider.centre[2] - receptionCounterCollider.halfExtents[2]
const storageFrontEdge =
  receptionStorageCollider.centre[2] + receptionStorageCollider.halfExtents[2]
const receptionAisleWidth = counterStaffEdge - storageFrontEdge
check(
  'atrium reception staff aisle is at least 1.3 metres wide',
  receptionAisleWidth >= 1.3,
  `width ${receptionAisleWidth.toFixed(2)} m`,
)

const receptionDeskPoint = (x: number, z: number) => {
  const point = new Vector3(x, 0, z).applyAxisAngle(
    new Vector3(0, 1, 0),
    receptionDesk.rotationY ?? 0,
  )
  point.add(
    roomPoint('atrium', receptionDesk.position[0], receptionDesk.position[2]),
  )
  return point
}

const receptionEntryX = Math.max(
  receptionCounterCollider.centre[0] + receptionCounterCollider.halfExtents[0],
  receptionStorageCollider.centre[0] + receptionStorageCollider.halfExtents[0],
) + CAPSULE.radius + 0.25
const receptionPublicZ =
  receptionCounterCollider.centre[2] + receptionCounterCollider.halfExtents[2] +
  CAPSULE.radius + 0.30
const receptionAisleZ = (counterStaffEdge + storageFrontEdge) / 2

// Enter around the public-right end, turn into the staff aisle, then visit the
// standing interaction position behind both screens. The waypoints derive from
// the two real colliders, so a merely visible but physically sealed slit cannot
// satisfy the future computer-access requirement.
const receptionStaffRoute = walk([
  arrivalPoint('atrium'),
  roomPoint('atrium', 2.5, 1),
  roomPoint('atrium', 2.65, 4.5),
  receptionDeskPoint(receptionEntryX, receptionPublicZ),
  receptionDeskPoint(receptionEntryX, receptionAisleZ),
  receptionDeskPoint(0.72, receptionAisleZ),
  receptionDeskPoint(-0.72, receptionAisleZ),
])
check(
  'atrium reception staff route reaches both future computer positions',
  receptionStaffRoute.arrived,
  `stopped at ${receptionStaffRoute.position.toArray().map((value) => value.toFixed(2)).join(',')}`,
)
check(
  'atrium reception staff route remains supported by the floor',
  receptionStaffRoute.lowest > FALL_LIMIT,
  `dropped to y=${receptionStaffRoute.lowest.toFixed(2)}`,
)

/**
 * Every route below leaves from where the office door lets the player into
 * the atrium, with the old starting point as its first stop.
 */
const ATRIUM_WALK_ROUTES = [
  {
    name: 'atrium breaker route',
    points: [[2.5, 1], [2.65, -2.8], [-4.8, -3.55], [-7.55, -4.4]],
    endsAtControl: true,
  },
  {
    // What a player does with a red light in the dark: walks at it. The line
    // crosses the podium's ring; the capsule has to slide round and arrive.
    name: 'office door to the atrium breaker, in a straight line',
    points: [[-7.5, -4.4]],
    endsAtControl: true,
  },
  {
    name: 'atrium east plinth circulation',
    points: [[0, 2.55], [2.6, 2.55], [2.6, -2.55], [0, -2.55]],
  },
  {
    name: 'atrium west plinth circulation',
    points: [[0, -2.55], [-2.6, -2.55], [-2.6, 2.55], [0, 2.55]],
  },
  {
    name: 'atrium reception access',
    points: [[2.5, 1], [2.65, 4.5], [0.6, 5.05], [-2, 5.05]],
  },
  {
    name: 'atrium orientation wall access',
    points: [[2.5, 1], [2.6, 2.55], [-5.8, 2.55], [-6.25, 2.2]],
  },
  {
    name: 'atrium lounge access',
    points: [[2.5, 1], [3.2, -2.6], [4.1, -4.25]],
  },
] as const

for (const route of ATRIUM_WALK_ROUTES) {
  const result = walk([
    arrivalPoint('atrium'),
    ...route.points.map(([x, z]) => roomPoint('atrium', x, z)),
  ])

  check(
    `${route.name} — the player gets there`,
    result.arrived,
    `stopped at ${result.position.toArray().map((value) => value.toFixed(2)).join(',')}`,
  )
  check(
    `${route.name} — the floor remains supported`,
    result.lowest > FALL_LIMIT,
    `dropped to y=${result.lowest.toFixed(2)}`,
  )
  if ('endsAtControl' in route) checkRouteEndsAtControl(route.name, 'atrium', result.position)
}

/**
 * The wing, as it is played: in by the main door, across to the breaker on
 * the far wall in the dark, round the hero case to the run of wall cases,
 * and out by the shortcut that only opens from this side.
 *
 * The way to the breaker here is a DETOUR, by waypoints chosen to go round
 * the kiosk: along the north side of the room and then down the far wall. It
 * proves the breaker can be reached and E pressed, not that the straight
 * line a player takes at the red light is clear. That line is walked further
 * down (the lighthouse walk), and it is not.
 */
{
  const name = 'Holyoke door to the breaker to the shortcut'
  const toBreaker = walk([
    arrivalPoint('holyoke'),
    ...([[0, -2.5], [-4.9, -2.5], [-4.9, 2.2]] as const).map(([x, z]) => roomPoint('holyoke', x, z)),
  ])
  check(
    `${name} — the player gets to the breaker`,
    toBreaker.arrived && toBreaker.lowest > FALL_LIMIT,
    `stopped at ${toBreaker.position.toArray().map((value) => value.toFixed(2)).join(',')}`,
  )
  checkRouteEndsAtControl(name, 'holyoke', toBreaker.position)

  const shortcut = portalWorld('holyoke', 'holyoke-shortcut')
  const toShortcut = walk([
    toBreaker.position.clone(),
    ...([[-3.5, 5.4], [4.6, 5.4]] as const).map(([x, z]) => roomPoint('holyoke', x, z)),
    shortcut.clone(),
    // A step past the threshold, on the atrium's floor.
    shortcut.clone().add(new Vector3(1.2, 0, 0)),
  ])
  check(
    `${name} — and from the breaker out by the shortcut`,
    toShortcut.arrived && toShortcut.lowest > FALL_LIMIT,
    `stopped at ${toShortcut.position.toArray().map((value) => value.toFixed(2)).join(',')}`,
  )
}

/**
 * The lighthouse walk. A breaker's pilot is the one thing lit in a dark room,
 * and what a player does with it is hold forward with the light in the middle
 * of the screen. The routes above get to each breaker by waypoints somebody
 * chose; this one has none. From the door the room is entered by, the capsule
 * steers at the control every step until something stops it, and E has to
 * reach from there.
 *
 * The atrium's podium ring is round and lets the capsule slide past. The
 * Holyoke kiosk is a 2.5 m counter set square across the line from the door
 * to the breaker (the line passes four centimetres from its centre): the
 * capsule comes to rest against its long face, seven metres short. Clearing
 * it means turning or moving the piece the room's first view is composed
 * round, which is a decision for the wing's art lot, so the accusation is a
 * dated debt and the route that IS proven above is a detour.
 */
{
  const LIGHTHOUSE_SECONDS = 20
  const blocked: ValidationIssue[] = []
  for (const room of MUSEUM.rooms) {
    const control = room.powerControl
    if (room.startsPowered || !control || !isWallControl(room, control)) continue
    const reach = reachFromWhereTheCapsuleStops(world, room, control, arrivalPoint(room.id), LIGHTHOUSE_SECONDS)
    const reached =
      reach.hitDistance !== null && reach.hitDistance <= INTERACTION_REACH.powerControl && !reach.eyeInsideProxy
    const short = reach.stopped.clone().sub(controlPoint(room, control, [0, 0, 0])).setY(0).length()
    console.log(
      `  note  ${control.id}: walking straight at it from the door ` +
        (reached
          ? `arrives (${reach.standOff.toFixed(2)} m from the wall plane)`
          : `stops at ${reach.stopped.toArray().map((value) => value.toFixed(2)).join(',')}, ${short.toFixed(2)} m short`),
    )
    if (reached) continue
    blocked.push({
      severity: 'error',
      code: 'lighthouse-walk-blocked',
      id: control.id,
      message:
        `Walking straight at "${control.id}" from the door of "${room.id}", the capsule stops ` +
        `${short.toFixed(2)} m short of it and E does not reach.`,
    })
  }
  const settled = settleKnownDebt(blocked, debtOf('test:navigation'), CONTENT_LOT)
  for (const issue of settled) {
    if (issue.severity !== 'debt') continue
    console.log(`  debt  ${issue.code} ${issue.id}: until L${issue.debt?.untilLot} — ${issue.debt?.note}`)
  }
  const unsettled = settled
    .filter((issue) => issue.severity === 'error')
    .map((issue) => `[${issue.code}] ${issue.message}`)
  check(
    'walking straight at each breaker from the door gets there, beyond what the debt table dates',
    unsettled.length === 0,
    unsettled.join('; '),
  )
}

for (const crossing of CROSSINGS) {
  const doorway = portalWorld(crossing.via[0], crossing.via[1])
  const start = anchorOf(crossing.from)
  const finish = anchorOf(crossing.to)

  // Step through the opening rather than stopping in it: the far waypoint is
  // a metre past the threshold, on the neighbour's side.
  const beyond = doorway.clone().add(
    finish.clone().sub(doorway).setY(0).normalize().multiplyScalar(1.2),
  )

  const result = walk([
    start,
    ...crossing.before.map(([x, z]) => roomPoint(crossing.from, x, z)),
    doorway.clone(),
    beyond,
    ...crossing.after.map(([x, z]) => roomPoint(crossing.to, x, z)),
    finish,
  ])

  check(
    `${crossing.name} — the player gets there`,
    result.arrived,
    `stopped at ${result.position.toArray().map((n) => n.toFixed(2)).join(',')} ` +
      `after ${result.elapsed.toFixed(1)}s (target ${finish.toArray().map((n) => n.toFixed(1)).join(',')})`,
  )

  check(
    `${crossing.name} — there is floor the whole way`,
    result.lowest > FALL_LIMIT,
    `dropped to y=${result.lowest.toFixed(2)}, which means a gap in the slabs under the doorway`,
  )
}

// ---------------------------------------------------------------------------
// Every room is reachable from the spawn.
// ---------------------------------------------------------------------------

/**
 * A doorway that works in isolation is not the same as a museum you can tour.
 * This is the property that actually matters, and the one the owner tested by
 * pressing W.
 */
const reachable = new Set<string>([MUSEUM.spawn.room])
let grew = true
while (grew) {
  grew = false
  for (const crossing of CROSSINGS) {
    if (reachable.has(crossing.from) && !reachable.has(crossing.to)) {
      reachable.add(crossing.to)
      grew = true
    }
  }
}

for (const room of MUSEUM.rooms) {
  check(`${room.id} is reachable on foot from the spawn`, reachable.has(room.id))
}

console.log(`${checks - failures}/${checks} checks passed`)
if (failures > 0) process.exitCode = 1
