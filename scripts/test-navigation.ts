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


import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three'

import { BAKED_BUNDLES, type BakedBundle } from '../src/content/bake.generated.ts'
import { CONTENT_LOT, debtOf, settleKnownDebt } from '../src/content/knownDebt.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { MuseumContent, RoomData } from '../src/content/schema.ts'
import type { ValidationIssue } from '../src/content/validate.ts'
import { movePlayer, worldFromMeshes } from '../src/engine/collision.ts'
import { aimableDevices, radioDevices } from '../src/engine/deviceRules.ts'
import { deviceProxyMinimum, INTERACTION_REACH, PROXY_MINIMUM } from '../src/engine/interactionTarget.ts'
import { isNotebook } from '../src/engine/notebook.ts'
import { MOUNT_PARTS } from '../src/engine/runtimePlacedParts.ts'
import { TRANSITION_DOOR_GATE_DEPTH } from '../src/engine/transitionDoorCollision.ts'
import {
  buildTransitionDoorSpecs,
  TRANSITION_DOOR_PLANE_Z,
  TRANSITION_DOOR_TARGET_DEPTH,
} from '../src/engine/transitionDoorTopology.ts'
// @ts-expect-error - the bake is plain JS with no type declarations.
import { prepareRoomShells } from './bake/kit.mjs'
import { FLOOD_ARRIVAL, FLOOD_CELL, floodFrom, nearestPlace, surveyStanding, walkBack } from './lib/flood.ts'
import {
  arrivalPoint,
  buildMuseumWorld,
  CAPSULE,
  colliderPartsFor as colliderPartsOf,
  controlNormal,
  controlPoint,
  distanceToVolume,
  EYE_HEIGHT,
  interactionVolumes,
  isWallControl,
  reachFromWhereTheCapsuleStops,
  recipeBounds,
  roomContaining,
  roomPoint,
  STEP,
  WALK_SPEED as SPEED,
  walkUntilStopped,
  type Placement,
} from './lib/museumWorld.ts'
import { interactionVolumeWiringProblems, type SourceReader } from './lib/runtimeWiring.ts'
import { readText } from './lib/readText.ts'

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

/**
 * Everything this gate accuses the museum of, by code and id: the lighthouse
 * walk and the flood. Collected as the suite runs and settled against the
 * debt table once, at the end. Settling each block by itself would hand the
 * table lines the block could never raise, and those come back as "paid".
 */
const accusations: ValidationIssue[] = []

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

    // A device is solid by whatever collider its recipe carries: the plinth
    // of the hall is one since it left the furniture to answer the crosshair.
    for (const device of room.devices ?? []) {
      footprints.push(...footprintsFor(room, `${room.id}/device:${device.id}`, { ...device, scale: 1 }))
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
  // Judged at the end of the suite, with everything else this gate accuses:
  // the debt table is settled once, or a line of the flood's would be read
  // here as paid.
  accusations.push(...blocked)
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

// ---------------------------------------------------------------------------
// Every interactive, from where a player can stand (M15)
// ---------------------------------------------------------------------------

/**
 * The flood itself, on a floor built for the purpose: a slab six metres by
 * four with a wall across the middle and one gap in the wall. The capsule is
 * sixty centimetres wide, so a gap of fifty is a wall and one of seventy-five
 * is a door, and nothing else about the two worlds differs.
 */
{
  const box = (size: readonly [number, number, number], at: readonly [number, number, number]) => {
    const mesh = new Mesh(new BoxGeometry(...size), new MeshBasicMaterial())
    mesh.position.set(...at)
    return mesh
  }
  // The wall runs half a metre past the slab on each side: nothing goes
  // round its end by hanging over the edge.
  const slab = (gap: number) => {
    const length = 2.5 - gap / 2
    return worldFromMeshes([
      box([6, 0.2, 4], [0, -0.1, 0]),
      box([0.2, 2.4, length], [0, 1.2, -(gap / 2 + length / 2)]),
      box([0.2, 2.4, length], [0, 1.2, gap / 2 + length / 2]),
    ])
  }
  const start = new Vector3(-1.5, 0, 0)
  const shut = floodFrom(slab(0.5), start)
  const open = floodFrom(slab(0.75), start)

  check(
    'flood: a gap narrower than the capsule is a wall',
    shut.points.length > 100 && shut.points.every((point) => point.x < 0),
    `${shut.points.length} place(s), ${shut.points.filter((point) => point.x >= 0).length} beyond the wall`,
  )
  check(
    'flood: a gap wider than the capsule is a way through',
    open.points.some((point) => point.x > 1.5) && open.points.length > shut.points.length * 1.6,
    `${open.points.length} place(s) against ${shut.points.length} with the gap shut`,
  )
  const offCentre = open.points.filter((point) => {
    const column = Math.round((point.x - start.x) / FLOOD_CELL)
    const row = Math.round((point.z - start.z) / FLOOD_CELL)
    return Math.hypot(point.x - (start.x + column * FLOOD_CELL), point.z - (start.z + row * FLOOD_CELL)) > FLOOD_ARRIVAL + 1e-9
  })
  check(
    'flood: every place is within five centimetres of the centre of a cell',
    offCentre.length === 0,
    `${offCentre.length} place(s) off their centres`,
  )
  // The slab ends in the air. The engine holds a capsule whose axis is a
  // little past an edge (the rim of its foot still bears), never one a
  // radius out.
  const overboard = open.points.filter(
    (point) => Math.abs(point.x) > 3 + CAPSULE.radius || Math.abs(point.z) > 2 + CAPSULE.radius || Math.abs(point.y) > 0.05,
  )
  check('flood: nothing stands where there is no floor', overboard.length === 0, `${overboard.length} place(s) off the slab`)
  const strides = open.points.flatMap((point, index) => {
    const parent = open.parents[index]
    return parent < 0 ? [] : [Math.hypot(point.x - open.points[parent].x, point.z - open.points[parent].z)]
  })
  check(
    'flood: every place was walked to from the cell next to it',
    open.parents[0] === -1 && strides.length === open.points.length - 1 && strides.every((stride) => Math.abs(stride - FLOOD_CELL) <= 2 * FLOOD_ARRIVAL),
    `strides from ${Math.min(...strides).toFixed(3)} to ${Math.max(...strides).toFixed(3)} m`,
  )
  const farthest = open.points.reduce((best, point, index) => (point.x > open.points[best].x ? index : best), 0)
  const back = walkBack(slab(0.75), open, farthest)
  check(
    'flood: from the far side of the gap the capsule walks back to the start',
    back.arrived && back.hops >= 12 && back.stopped.distanceTo(open.points[0]) <= FLOOD_ARRIVAL,
    `${back.hops} hop(s), stopped at ${back.stopped.toArray().map((value) => value.toFixed(2)).join(',')}`,
  )
  // The same chain with the gap shut behind the capsule: the walk back is a
  // walk, not a count of parents.
  check('flood: and not with the gap shut behind it', !walkBack(slab(0.5), open, farthest).arrived)
  let refused = false
  try {
    floodFrom(slab(0.75), new Vector3(8, 0, 0))
  } catch {
    refused = true
  }
  check('flood: it refuses to start where there is no floor', refused)

  // A ledge. Two floors side by side, the second 45 cm lower: twice the
  // step the engine climbs, so down is a drop and there is no way back up.
  // Asked with cells of half a metre, which give a walk the time to land:
  // on the default grid the capsule runs out of steps in mid-air and the
  // ledge is refused for the wrong reason.
  const ledge = worldFromMeshes([box([3, 0.2, 4], [-1.5, -0.1, 0]), box([3, 0.2, 4], [1.5, -0.55, 0])])
  const above = floodFrom(ledge, start, 0.5)
  const dropped = above.points.filter((point) => point.y < -0.1)
  check(
    'flood: a ledge is not jumped off, and a place reached by falling is no place',
    above.points.length > 30 && dropped.length === 0 && above.points.every((point) => point.x < 0.5),
    `${above.points.length} place(s), ${dropped.length} on the lower floor`,
  )
  // From below, the lower floor is a floor like any other.
  const below = floodFrom(ledge, new Vector3(1.5, -0.45, 0), 0.5)
  check(
    'flood: and the lower floor is flooded from the lower floor, without climbing the ledge',
    below.points.length > 30 && below.points.every((point) => point.y < -0.3 && point.x > -0.5),
    `${below.points.length} place(s), ${below.points.filter((point) => point.y >= -0.3).length} on the upper floor`,
  )
}

const readSource: SourceReader = (path) => readText(new URL(`../src/${path}`, import.meta.url))

/** The bake with one recipe's collider taken out of the manifest, as it was before the recipe had one. */
function withoutCollider(recipe: string): BakedBundle[] {
  return BAKED_BUNDLES.map((bundle) =>
    bundle.name !== 'kit'
      ? bundle
      : {
          ...bundle,
          parts: bundle.parts.map((part) =>
            part.name === recipe || part.name.startsWith(`${recipe}__`)
              ? { name: part.name, material: part.material, bounds: part.bounds, triangles: part.triangles }
              : part,
          ),
        },
  )
}

/** The museum with more furniture in one room. */
function furnished(roomId: string, kit: RoomData['kit']): MuseumContent {
  return {
    ...MUSEUM,
    rooms: MUSEUM.rooms.map((room) => (room.id === roomId ? { ...room, kit: [...room.kit, ...kit] } : room)),
  }
}

/**
 * The volumes themselves, before anything is asked of them: each is the box
 * its component hangs, where the component hangs it. Points are given in
 * the frame of the thing (its wrapper group) and asked of the world.
 */
{
  const volumes = interactionVolumes()
  const volumeOf = (id: string) => {
    const volume = volumes.find((candidate) => candidate.id === id)
    if (!volume) throw new Error(`the flood has no volume for "${id}"`)
    return volume
  }
  const roomWith = (has: (room: RoomData) => boolean) => {
    const room = MUSEUM.rooms.find(has)
    if (!room) throw new Error('the content no longer has the room this check is about')
    return room
  }
  type Placed = { readonly position: readonly number[]; readonly rotationY?: number; readonly scale?: number }
  /** A point of a placed thing's own frame, in the world: turn, scale, then the room. */
  const from = (origin: readonly number[], placed: Placed, local: readonly [number, number, number]) => {
    const turn = placed.rotationY ?? 0
    const scale = placed.scale ?? 1
    return new Vector3(
      origin[0] + placed.position[0] + scale * (local[0] * Math.cos(turn) + local[2] * Math.sin(turn)),
      origin[1] + placed.position[1] + scale * local[1],
      origin[2] + placed.position[2] + scale * (-local[0] * Math.sin(turn) + local[2] * Math.cos(turn)),
    )
  }
  const inside = (id: string, point: Vector3) => distanceToVolume(volumeOf(id).mesh, point) === 0
  const boundsOf = (recipe: string, bundleName: string) => {
    const bounds = recipeBounds(recipe, BAKED_BUNDLES.find((bundle) => bundle.name === bundleName))
    if (!bounds) throw new Error(`recipe "${recipe}" is not in ${bundleName}`)
    return bounds
  }
  const middle = (bounds: ReturnType<typeof boundsOf>) =>
    [0, 1, 2].map((axis) => (bounds.min[axis] + bounds.max[axis]) / 2) as [number, number, number]

  // A piece: the box of its recipe, at the scale it is shown. The founding
  // ball stands at 2.65, so its box is that many times its recipe's.
  const hero = MUSEUM.exhibits.find((exhibit) => (exhibit.scale ?? 1) > 1.5)
  if (!hero) throw new Error('no enlarged exhibit is left to prove the scale with')
  const heroRoom = roomWith((room) => room.exhibitIds.includes(hero.id))
  const heroReach = boundsOf(hero.recipe, `exhibits-${heroRoom.id}`).max[0]
  const heroAt = (x: number) => from(heroRoom.origin, hero, [x, 0, 0])
  check(
    `${hero.id}: a piece is aimed at through the box of its recipe, at the scale it is shown`,
    inside(hero.id, heroAt(heroReach - 0.004)) &&
      !inside(hero.id, heroAt(heroReach + 0.004)) &&
      // A scaled metre away is a metre away, in the world's metres.
      Math.abs(distanceToVolume(volumeOf(hero.id).mesh, from(heroRoom.origin, { ...hero, scale: 1 }, [heroReach * (hero.scale ?? 1) + 1, 0, 0])) - 1) < 1e-6,
    `its recipe reaches ${heroReach.toFixed(4)} m and it is shown at ${hero.scale}`,
  )

  // A cabinet: the chest-high box, which reaches in front of the carcass and
  // above it, turned with the cabinet. Behind the cabinet there is none.
  const wing = roomWith((room) => (room.containers ?? []).some((container) => !isNotebook(container) && (container.rotationY ?? 0) !== 0))
  const turned = (wing.containers ?? []).find((container) => !isNotebook(container) && (container.rotationY ?? 0) !== 0)
  if (!turned) throw new Error('no turned cabinet is left to prove the turn with')
  const carcass = boundsOf(turned.part, 'kit')
  const chestHigh: readonly [number, number, number] = [0, carcass.max[1] + 0.2, carcass.max[2] + 0.15]
  check(
    `${turned.id}: a cabinet is aimed at through the chest-high box in front of it, turned with it`,
    inside(turned.id, from(wing.origin, turned, chestHigh)) &&
      !inside(turned.id, from(wing.origin, turned, [chestHigh[0], chestHigh[1], -chestHigh[2]])) &&
      !inside(turned.id, from(wing.origin, { position: turned.position }, chestHigh)),
    `the carcass ends at y ${carcass.max[1]}, z ${carcass.max[2]}`,
  )

  // A notebook, a radio: their own bounds, grown to the minimum and no more.
  const office = roomWith((room) => (room.containers ?? []).some(isNotebook))
  const notebook = (office.containers ?? []).find(isNotebook)
  const radio = radioDevices(MUSEUM)[0]
  if (!notebook || !radio) throw new Error('the notebook and the radio are what this check is about')
  for (const [thing, origin, minimum] of [
    [notebook, office.origin, PROXY_MINIMUM.notebook],
    [radio.device, radio.room.origin, PROXY_MINIMUM.radio],
  ] as const) {
    const own = boundsOf(thing.part, 'kit')
    const centre = middle(own)
    // Along the axis the object is thinnest on: the padding is all there is.
    const axis = [0, 1, 2].reduce((thinnest, candidate) =>
      own.max[candidate] - own.min[candidate] < own.max[thinnest] - own.min[thinnest] ? candidate : thinnest,
    )
    const out = (by: number) => centre.map((value, index) => (index === axis ? value + by : value)) as [number, number, number]
    check(
      `${thing.id}: aimed at through its own bounds, padded to the minimum and no further`,
      own.max[axis] - own.min[axis] < minimum[axis] - 0.05 &&
        inside(thing.id, from(origin, thing, out(minimum[axis] / 2 - 0.005))) &&
        !inside(thing.id, from(origin, thing, out(minimum[axis] / 2 + 0.005))),
      `${(own.max[axis] - own.min[axis]).toFixed(3)} m of object in a ${minimum[axis]} m box`,
    )
  }

  // A device that is no radio: the plinth of the hall, larger than the
  // minimum of its kind on every axis, so its box is its own bounds and no
  // more, turned with it.
  const plinth = aimableDevices(MUSEUM).find((entry) => entry.device.kind !== 'radio')
  if (!plinth) throw new Error('no device but the radio is left to prove the other minimum with')
  const plinthOwn = boundsOf(plinth.device.part, 'kit')
  const plinthMinimum = deviceProxyMinimum(plinth.device)
  const onTop = (placed: Placed, x: number, z: number) => from(plinth.room.origin, placed, [x, plinthOwn.max[1] - 0.01, z])
  check(
    `${plinth.device.id}: a device that is no radio is aimed at through its own bounds, by the minimum of its kind`,
    plinthMinimum === PROXY_MINIMUM.device &&
      deviceProxyMinimum(radio.device) === PROXY_MINIMUM.radio &&
      [0, 1, 2].every((axis) => plinthOwn.max[axis] - plinthOwn.min[axis] > plinthMinimum[axis]) &&
      inside(plinth.device.id, onTop(plinth.device, plinthOwn.max[0] - 0.005, 0)) &&
      !inside(plinth.device.id, onTop(plinth.device, plinthOwn.max[0] + 0.005, 0)) &&
      inside(plinth.device.id, onTop(plinth.device, 0, plinthOwn.max[2] - 0.005)) &&
      !inside(plinth.device.id, onTop(plinth.device, 0, plinthOwn.max[2] + 0.005)) &&
      // Longer one way than the other, and placed a quarter turn round: the
      // same point of an unturned box is past its side.
      plinthOwn.max[0] > plinthOwn.max[2] + 0.05 &&
      !inside(plinth.device.id, onTop({ position: plinth.device.position }, plinthOwn.max[0] - 0.005, 0)),
    `its recipe is ${[0, 1, 2].map((axis) => (plinthOwn.max[axis] - plinthOwn.min[axis]).toFixed(2)).join(' × ')} m, the minimum ${plinthMinimum.join(' × ')}`,
  )

  // A door: the whole opening on the plane of the leaves, the same box from
  // either room, and nothing on the line of the wall it was authored on.
  for (const door of buildTransitionDoorSpecs(MUSEUM.rooms)) {
    const local = (z: number) => from([0, 0, 0], door, [0, door.height / 2, z])
    const sides = volumes.filter((volume) => volume.id.startsWith(`${door.id}@`))
    check(
      `${door.id}: a door is aimed at on the plane of its leaves, from each of its two rooms`,
      sides.length === 2 &&
        new Set(sides.map((side) => side.roomId)).size === 2 &&
        sides.every(
          (side) =>
            [door.ownerRoomId, door.otherRoomId].includes(side.roomId as never) &&
            side.id === `${door.id}@${side.roomId}` &&
            distanceToVolume(side.mesh, local(TRANSITION_DOOR_PLANE_Z)) === 0 &&
            distanceToVolume(side.mesh, local(0)) > 0.25 &&
            distanceToVolume(side.mesh, local(TRANSITION_DOOR_PLANE_Z - TRANSITION_DOOR_TARGET_DEPTH / 2 - 0.01)) > 0 &&
            // Shut, it is solid there: a capsule on the plane is in the gate.
            side.gate?.intersects(local(TRANSITION_DOOR_PLANE_Z).setY(0), CAPSULE) === true &&
            side.gate.intersects(local(TRANSITION_DOOR_PLANE_Z + 1).setY(0), CAPSULE) === false,
        ),
      `${sides.length} side(s): ${sides.map((side) => side.roomId).join(', ')}`,
    )
  }
}

/**
 * What stands under a mounted piece is solid. No exhibit of today's museum
 * is on a plinth (the wing's are in built cases), so the proof brings one:
 * a ball on a plinth in the open floor of the atrium, walked at from two
 * metres away. With the base in the world the capsule stops against it;
 * in the world as it was, it walks through the place the plinth stands.
 */
{
  const ball = MUSEUM.exhibits[0]
  const plinth = colliderPartsOf(MOUNT_PARTS.plinth?.part ?? '')[0]?.collider
  if (!plinth) throw new Error('the plinth has no collider in the manifest')
  const mounted: MuseumContent = {
    ...MUSEUM,
    exhibits: [...MUSEUM.exhibits, { ...ball, id: 'ball-on-a-plinth', position: [3, 1.18, 3], rotationY: 0, mount: 'plinth' }],
    rooms: MUSEUM.rooms.map((room) =>
      room.id === 'atrium' ? { ...room, exhibitIds: [...room.exhibitIds, 'ball-on-a-plinth'] } : room,
    ),
  }
  const north = new Vector3(0, 0, -1)
  const stopped = walkUntilStopped(buildMuseumWorld(mounted), roomPoint('atrium', 3, 5), north, 2)
  const through = walkUntilStopped(world, roomPoint('atrium', 3, 5), north, 2)
  const face = roomPoint('atrium', 3, 3).z + plinth.halfExtents[2] + CAPSULE.radius
  check(
    'the base under a mounted piece is solid: the capsule stops against a plinth',
    Math.abs(stopped.z - face) < 0.02 && through.z < roomPoint('atrium', 3, 3).z - 1,
    `stopped at z ${stopped.z.toFixed(2)} (the plinth's face is at ${face.toFixed(2)}); without the base, at ${through.z.toFixed(2)}`,
  )
  check(
    'and the flood is asked about the piece on it like any other',
    interactionVolumes(mounted).some((volume) => volume.id === 'ball-on-a-plinth' && volume.roomId === 'atrium'),
  )
}

/**
 * A device is solid by the collider of its recipe. The plinth of the hall
 * was furniture until it had something to say (L3); as a device it leaves
 * the list `KitLayer` registers colliders from, and a device layer that
 * registered none would let the capsule walk through the one landmark the
 * hall is composed round. Walked at from inside its ring of barriers: with
 * the device in the world the capsule stops at its face, and in a world
 * without it, it carries on through the place the plinth stands.
 */
{
  const entry = aimableDevices(MUSEUM).find(({ device }) => device.id === 'atrium-podium')
  const collider = entry ? colliderPartsOf(entry.device.part)[0]?.collider : undefined
  if (!entry || !collider) throw new Error('the plinth of the hall is a device with a collider, or this check is about nothing')
  const turn = entry.device.rotationY ?? 0
  // Half the collider along the world's x, turned with the device.
  const half = Math.abs(collider.halfExtents[0] * Math.cos(turn)) + Math.abs(collider.halfExtents[2] * Math.sin(turn))
  const centre = roomPoint(entry.room.id, entry.device.position[0], entry.device.position[2])
  const start = centre.clone().add(new Vector3(half + CAPSULE.radius + 0.25, 0, 0))
  const west = new Vector3(-1, 0, 0)
  const without = buildMuseumWorld({
    ...MUSEUM,
    rooms: MUSEUM.rooms.map((room) => ({
      ...room,
      devices: (room.devices ?? []).filter((device) => device.id !== entry.device.id),
    })),
  })
  const stopped = walkUntilStopped(world, start, west, 2)
  const through = walkUntilStopped(without, start, west, 2)
  const face = centre.x + half + CAPSULE.radius
  check(
    'the plinth of the hall is solid as a device: the capsule stops against it',
    Math.abs(collider.centre[0]) < 1e-6 &&
      Math.abs(collider.centre[2]) < 1e-6 &&
      Math.abs(stopped.x - face) < 0.02 &&
      through.x < centre.x - 0.3,
    `stopped at x ${stopped.x.toFixed(2)} (its face is at ${face.toFixed(2)}); with no device in the world, at ${through.x.toFixed(2)}`,
  )
  check(
    'and no piece of furniture stands in for it: the plinth is in the list of devices, once',
    MUSEUM.rooms.every((room) => room.kit.every((placement) => placement.part !== entry.device.part)) &&
      MUSEUM.rooms.flatMap((room) => room.devices ?? []).filter((device) => device.part === entry.device.part).length === 1,
  )
}

/**
 * The two other things that left the furniture with the Posse are solid the
 * same way: the lectern of the hall, as a device, and the iron safe in the
 * office, as a container. Each is walked at from the side a player comes
 * to it by; in a world without it the capsule goes on through where it
 * stood. (The safe's collider is its carcass alone since its door became a
 * node of its own: the capsule stops at the frame, a few centimetres nearer
 * than it did, and an open door is no wall.)
 */
for (const { id, list, side } of [
  { id: 'atrium-lectern', list: 'devices', side: 1 },
  { id: 'office-safe', list: 'containers', side: -1 },
] as const) {
  const room = MUSEUM.rooms.find((candidate) => (candidate[list] ?? []).some((entry) => entry.id === id))
  const placed = room ? (room[list] ?? []).find((entry) => entry.id === id) : undefined
  const collider = placed ? colliderPartsOf(placed.part)[0]?.collider : undefined
  if (!room || !placed || !collider) throw new Error(`${id} is placed among the ${list} with a collider, or this check is about nothing`)
  const turn = placed.rotationY ?? 0
  // The collider's centre and its half along the world's x, turned with the placement.
  const half = Math.abs(collider.halfExtents[0] * Math.cos(turn)) + Math.abs(collider.halfExtents[2] * Math.sin(turn))
  const offsetX = collider.centre[0] * Math.cos(turn) + collider.centre[2] * Math.sin(turn)
  const offsetZ = -collider.centre[0] * Math.sin(turn) + collider.centre[2] * Math.cos(turn)
  const centre = roomPoint(room.id, placed.position[0] + offsetX, placed.position[2] + offsetZ)
  const start = centre.clone().add(new Vector3(side * (half + CAPSULE.radius + 0.25), 0, 0))
  const towards = new Vector3(-side, 0, 0)
  const without = buildMuseumWorld({
    ...MUSEUM,
    rooms: MUSEUM.rooms.map((candidate) => ({ ...candidate, [list]: (candidate[list] ?? []).filter((entry) => entry.id !== id) })),
  })
  const stopped = walkUntilStopped(world, start, towards, 2)
  const through = walkUntilStopped(without, start, towards, 2)
  const face = centre.x + side * (half + CAPSULE.radius)
  check(
    `${id} is solid among the ${list}: the capsule stops against it`,
    Math.abs(stopped.x - face) < 0.02 && side * (face - through.x) > 0.2,
    `stopped at x ${stopped.x.toFixed(2)} (its face is at ${face.toFixed(2)}); with it out of the world, at ${through.x.toFixed(2)}`,
  )
  check(
    `and no piece of furniture stands in for it: ${id} is placed once, among the ${list}`,
    MUSEUM.rooms.every((candidate) => candidate.kit.every((placement) => placement.part !== placed.part)) &&
      MUSEUM.rooms.flatMap((candidate) => [...(candidate.devices ?? []), ...(candidate.containers ?? [])]).filter((entry) => entry.part === placed.part).length === 1,
  )
}

{
  const started = performance.now()
  const survey = surveyStanding()
  const seconds = (performance.now() - started) / 1000
  const between = survey.flood.points.length - [...survey.placesByRoom.values()].reduce((sum, count) => sum + count, 0)
  console.log(
    `  note  flood from the spawn: ${survey.flood.points.length} places in ${seconds.toFixed(2)} s ` +
      `(${[...survey.placesByRoom].map(([room, count]) => `${room} ${count}`).join(', ')}, ${between} in doorways)`,
  )

  // (c) The flood stands in every room, reaches where the player arrives in
  // each, and from there the capsule walks back to where the night began.
  for (const room of MUSEUM.rooms) {
    const places = survey.placesByRoom.get(room.id) ?? 0
    const arrival = nearestPlace(survey.flood, arrivalPoint(room.id))
    const back = walkBack(survey.world, survey.flood, arrival.index)
    check(
      `${room.id}: the flood stands in the room, where the player arrives in it`,
      places > 0 && arrival.distance <= FLOOD_CELL,
      `${places} place(s), the nearest ${arrival.distance.toFixed(2)} m from the arrival point`,
    )
    check(
      `${room.id}: and from there the capsule walks back to the spawn`,
      back.arrived,
      `stopped after ${back.hops} hop(s) at ${back.stopped.toArray().map((value) => value.toFixed(2)).join(',')}`,
    )
  }

  // Everything E works on is judged: no kind and no room is left out because
  // the list was written by hand.
  const expected =
    MUSEUM.rooms.reduce(
      (sum, room) => sum + room.exhibitIds.length + (room.containers?.length ?? 0) + (room.powerControl ? 1 : 0),
      0,
    ) +
    aimableDevices(MUSEUM).length +
    2 * buildTransitionDoorSpecs(MUSEUM.rooms).length
  const judged = new Set(survey.verdicts.map((verdict) => verdict.volume.id))
  const byKind = new Map<string, number>()
  for (const { volume } of survey.verdicts) byKind.set(volume.kind, (byKind.get(volume.kind) ?? 0) + 1)
  check(
    'the flood judges every piece, container, power control and device that answers, and both sides of every door',
    survey.verdicts.length === expected &&
      judged.size === expected &&
      MUSEUM.exhibits.every((exhibit) => judged.has(exhibit.id)),
    `${survey.verdicts.length} judged, ${expected} in the content`,
  )
  // The list of devices is the content's, not this suite's: whatever the
  // crosshair may rest on is walked up to, the radio and every thing that
  // only says something (the plinth of the hall is the first).
  const aimable = aimableDevices(MUSEUM)
  const unjudged = aimable.filter(
    ({ room, device }) =>
      !survey.verdicts.some(
        ({ volume }) => volume.kind === 'device' && volume.id === device.id && volume.roomId === room.id,
      ),
  )
  check(
    'every device the crosshair may rest on is a target the flood judged',
    aimable.length > radioDevices(MUSEUM).length && unjudged.length === 0 && judged.has('atrium-podium'),
    `${aimable.length} device(s) answer, ${radioDevices(MUSEUM).length} of them a radio; not judged: ` +
      `${unjudged.map(({ device }) => device.id).join(', ') || 'none'}`,
  )
  const beforeThePlinth = survey.verdicts.find(({ volume }) => volume.id === 'atrium-podium')
  check(
    "the hall's plinth is read from a place in the hall, within the device ray's reach and outside its box",
    Boolean(
      beforeThePlinth?.usable &&
        beforeThePlinth.usable.distance > 0 &&
        beforeThePlinth.usable.distance <= INTERACTION_REACH.device &&
        roomContaining(beforeThePlinth.usable.point)?.id === 'atrium',
    ),
    beforeThePlinth?.usable
      ? `the eye is ${beforeThePlinth.usable.distance.toFixed(2)} m from it, of ${INTERACTION_REACH.device}`
      : 'no place to read it from',
  )
  // The telephone on the desk answers since L3 (a dead line): it is a device
  // on the far half of the blotter, between the ledgers and the radio, and
  // has to have a place to be dialled from like anything else E works.
  const beforeTheTelephone = survey.verdicts.find(({ volume }) => volume.id === 'office-telephone')
  check(
    'the telephone is dialled from a place in the office, within the device ray\'s reach and outside its box',
    Boolean(
      beforeTheTelephone?.volume.kind === 'device' &&
        beforeTheTelephone.usable &&
        beforeTheTelephone.usable.distance > 0 &&
        beforeTheTelephone.usable.distance <= INTERACTION_REACH.device &&
        roomContaining(beforeTheTelephone.usable.point)?.id === 'office',
    ),
    beforeTheTelephone?.usable
      ? `the eye is ${beforeTheTelephone.usable.distance.toFixed(2)} m from it, of ${INTERACTION_REACH.device}`
      : beforeTheTelephone
        ? 'no place to dial it from'
        : 'the telephone is not a target the flood judged',
  )
  // The three things the Posse is worked through: the answering machine on
  // the strip of walnut behind the radio, the iron safe in the corner past
  // the last bookcase, and the lectern against the wall of Wing 1. Each has
  // a place to stand, in its own room, within the reach of the ray that
  // works it and outside its own box.
  for (const [id, kind, roomId, reach] of [
    ['office-answering-machine', 'device', 'office', INTERACTION_REACH.device],
    ['office-safe', 'container', 'office', INTERACTION_REACH.container],
    ['atrium-lectern', 'device', 'atrium', INTERACTION_REACH.device],
  ] as const) {
    const verdict = survey.verdicts.find(({ volume }) => volume.id === id)
    check(
      `${id} is worked from a place in its own room, within its ray's reach and outside its box`,
      Boolean(
        verdict?.volume.kind === kind &&
          verdict.usable &&
          verdict.usable.distance > 0 &&
          verdict.usable.distance <= reach &&
          roomContaining(verdict.usable.point)?.id === roomId,
      ),
      verdict?.usable
        ? `the eye is ${verdict.usable.distance.toFixed(2)} m from it, of ${reach}`
        : verdict
          ? 'no place to work it from'
          : 'not a target the flood judged',
    )
  }
  console.log(`  note  ${[...byKind].map(([kind, count]) => `${count} ${kind}`).join(', ')}`)
  for (const kind of byKind.keys()) {
    const distances = survey.verdicts.flatMap((verdict) =>
      verdict.volume.kind === kind && verdict.nearest ? [verdict.nearest.distance] : [],
    )
    console.log(
      `  note  ${kind}: from the nearest place, the eye is ${Math.min(...distances).toFixed(2)} to ` +
        `${Math.max(...distances).toFixed(2)} m from the volume`,
    )
  }
  accusations.push(...survey.issues)

  // The eye the flood measures from is the camera's, and the hood of a
  // vitrine table is the one runtime-placed recipe the world leaves out.
  check('the flood looks from the height of the camera', EYE_HEIGHT > CAPSULE.height - CAPSULE.radius && EYE_HEIGHT < CAPSULE.height)
  const solidHoods = Object.values(MOUNT_PARTS).flatMap((mount) =>
    mount?.extra && colliderPartsOf(mount.extra).length > 0 ? [mount.extra] : [],
  )
  check(
    'no hood of a mount is solid: the world places the base under a piece and nothing on it',
    solidHoods.length === 0,
    `${solidHoods.join(', ')} gained a collider: place it in mountPlacements`,
  )

  // What the flood answered with is a place of the target's own room, and
  // the usable one has the eye outside the volume: the wing's cabinets are
  // less than a metre from the atrium, through the wall.
  const misplaced = survey.verdicts.filter(
    ({ volume, usable, nearest }) =>
      !usable ||
      !nearest ||
      usable.distance <= 0 ||
      usable.distance > volume.reach ||
      roomContaining(usable.point)?.id !== volume.roomId ||
      roomContaining(nearest.point)?.id !== volume.roomId,
  )
  check(
    "every place the flood answers with is in the target's own room, the usable one within reach and outside the volume",
    misplaced.length === 0,
    misplaced.map(({ volume }) => volume.id).join(', '),
  )
  // A door is aimed at while it is shut, and shut it stops the capsule: its
  // axis rests a radius from the gate, which is thinner than the box.
  const atTheGate = CAPSULE.radius + TRANSITION_DOOR_GATE_DEPTH / 2 - TRANSITION_DOOR_TARGET_DEPTH / 2
  const doorSides = survey.verdicts.filter(({ volume }) => volume.kind === 'door')
  const pastTheGate = doorSides.filter(({ nearest }) => !nearest || nearest.distance < atTheGate - 1e-6)
  check(
    'in front of a shut door the capsule stops at the gate',
    doorSides.length === 2 * buildTransitionDoorSpecs(MUSEUM.rooms).length && pastTheGate.length === 0,
    pastTheGate.map(({ volume, nearest }) => `${volume.id}: ${nearest?.distance.toFixed(3)} m, under ${atTheGate.toFixed(3)}`).join('; '),
  )

  // Teeth, on the museum itself. The breaker's collider is what L1 paid
  // ÁT-A1 with: out of the manifest, the capsule walks up to the plaster and
  // the place nearest the atrium breaker has the eye inside its box.
  const soft = surveyStanding(MUSEUM, withoutCollider('breaker-panel'))
  check(
    'without the breaker panel\'s collider, the place nearest the atrium breaker puts the eye inside its volume (ÁT-A1)',
    soft.issues.some((issue) => issue.code === 'standing-point-inside-target' && issue.id === 'atrium-breaker') &&
      !survey.issues.some((issue) => issue.id === 'atrium-breaker'),
    soft.issues.map((issue) => `${issue.code} ${issue.id}`).join(', ') || 'nothing accused',
  )

  // And a thing nobody can get near. Reach is distance, so one partition is
  // not enough: across the office lane it leaves the way round the desk, and
  // a metre in front of the cabinet it leaves the cabinet within reach of
  // the far side. Two of them, wall to wall just north of the spawn, shut
  // away every place within 2.4 m of the drawer.
  const walled = surveyStanding(
    furnished('office', [
      { part: 'partition', position: [-1.3, 0, -0.45], rotationY: Math.PI },
      { part: 'partition', position: [1.9, 0, -0.45], rotationY: Math.PI },
    ]),
  )
  const cabinet = walled.verdicts.find((verdict) => verdict.volume.id === 'office-cabinet')
  check(
    'with the office walled across north of the spawn, the locked cabinet has no place to stand',
    walled.issues.some((issue) => issue.code === 'no-standing-point' && issue.id === 'office-cabinet') &&
      !survey.issues.some((issue) => issue.id === 'office-cabinet'),
    `the nearest place is ${cabinet?.nearest?.distance.toFixed(2) ?? 'nowhere'} m from the drawer, ` +
      `${walled.placesByRoom.get('office')} place(s) left in the office`,
  )

  // And a room nobody can enter: a partition across each of the wing's two
  // doorways, on the atrium's side. Reach alone would not notice. The
  // archive cabinets stand against the wall the two rooms share, and a place
  // in the atrium is well inside their 2.4 m; it is "in its own room" that
  // refuses it.
  const sealed = surveyStanding(
    furnished('atrium', [
      { part: 'partition', position: [-8.8, 0, -2], rotationY: Math.PI / 2 },
      { part: 'partition', position: [-8.8, 0, 6.4], rotationY: Math.PI / 2 },
    ]),
  )
  const inTheWing = sealed.verdicts.filter(({ volume }) => volume.roomId === 'holyoke')
  const stillStanding = inTheWing.filter(
    ({ volume }) => !sealed.issues.some((issue) => issue.code === 'no-standing-point' && issue.id === volume.id),
  )
  const throughTheWall = inTheWing.filter(
    ({ volume }) =>
      volume.kind === 'container' &&
      sealed.flood.points.some((point) => {
        const eye = point.clone().setY(point.y + EYE_HEIGHT)
        return distanceToVolume(volume.mesh, eye) <= volume.reach
      }),
  )
  check(
    'with both doorways of the wing walled up, nothing in it has a place to stand, however near the atrium comes through the wall',
    sealed.placesByRoom.get('holyoke') === 0 &&
      (sealed.placesByRoom.get('atrium') ?? 0) > 1000 &&
      inTheWing.length >= 13 &&
      stillStanding.length === 0 &&
      throughTheWall.length === 2,
    `${sealed.placesByRoom.get('holyoke')} place(s) in the wing; still standing: ` +
      `${stillStanding.map(({ volume }) => volume.id).join(', ') || 'none'}; ` +
      `${throughTheWall.length} cabinet(s) within reach of the atrium`,
  )

  // What the flood measured is what each component mounts.
  const problems = interactionVolumeWiringProblems(readSource)
  check('each component mounts the volume the flood measured', problems.length === 0, problems.join('; '))
  const changed =
    (path: string, from: string | RegExp, to: string): SourceReader =>
    (asked) => {
      if (asked !== path) return readSource(asked)
      const source = readSource(asked)
      const next = source.replace(from, to)
      if (next === source) throw new Error(`the refactor of ${path} found nothing to change`)
      return next
    }
  const refactors: readonly (readonly [string, SourceReader])[] = [
    ['a door reached by a number of its own', changed('engine/TransitionDoors.tsx', 'INTERACTION_REACH.door', '3.4')],
    ['a door box of a depth of its own', changed('engine/TransitionDoors.tsx', 'spec.height, TRANSITION_DOOR_TARGET_DEPTH]', 'spec.height, 0.6]')],
    ['a door box off the plane of the leaves', changed('engine/TransitionDoors.tsx', /TRANSITION_DOOR_PLANE_Z,\n        \]\}\n        visible/, '0,\n        ]}\n        visible')],
    ['a shut door that is not solid', changed('engine/TransitionDoors.tsx', 'return registerTransitionDoorGate(collision, spec)', 'return undefined')],
    ['a cabinet aimed at by a box of its own', changed('engine/Containers.tsx', 'if (!notebook) return DRAWER_PROXY', 'if (!notebook) return { centre: [0, 0.6, 0], size: [2, 1.2, 2] }')],
    ['a notebook padded to the radio\'s minimum', changed('engine/Containers.tsx', 'PROXY_MINIMUM.notebook', 'PROXY_MINIMUM.radio')],
    ['a container reached by a number of its own', changed('engine/Containers.tsx', 'INTERACTION_REACH.container', '3')],
    ['a control with no padding', changed('engine/PowerControls.tsx', 'return paddedProxy(new Box3().setFromObject(instance), PROXY_MINIMUM.powerControl)', 'return paddedProxy(new Box3().setFromObject(instance), [0, 0, 0])')],
    ['a control whose ray has no end', changed('engine/PowerControls.tsx', 'instance.far = REACH', 'instance.far = Infinity')],
    ['a device padded by a number of its own', changed('engine/Devices.tsx', 'deviceProxyMinimum(device)', '[0.6, 0.6, 0.6]')],
    ['every device padded to the radio\'s minimum', changed('engine/interactionTarget.ts', "device.kind === 'radio' ? PROXY_MINIMUM.radio : PROXY_MINIMUM.device", 'PROXY_MINIMUM.radio')],
    ['a device whose box is not the padded one', changed('engine/Devices.tsx', '<boxGeometry args={proxy.size} />', '<boxGeometry args={[1, 1, 1]} />')],
    ['a device hung a metre off its placement', changed('engine/Devices.tsx', 'position={device.position as unknown as [number, number, number]}', 'position={[device.position[0] + 1, device.position[1], device.position[2]]}')],
    ['a piece reached by the container\'s number', changed('engine/Interaction.tsx', 'INTERACTION_REACH.exhibit', 'INTERACTION_REACH.container')],
    ['a piece drawn at twice its scale', changed('scenes/MuseumScene.tsx', 'scale={exhibit.scale ?? 1}', 'scale={(exhibit.scale ?? 1) * 2}')],
    // What is solid in the suites' world is put there by the suites (`buildMuseumWorld`).
    // A component that stops registering its collider leaves the game with a
    // base, a cabinet or a bench the capsule walks through, and the flood green.
    ['the base under a mounted piece no longer solid', changed('scenes/MuseumScene.tsx', 'registerKitColliders(kit, spec?.part, KIT_BUNDLE, collision,', 'registerNothing(')],
    ['the base under a mounted piece solid five metres away', changed('scenes/MuseumScene.tsx', 'position: [exhibit.position[0], 0, exhibit.position[2]],\n        rotationY: exhibit.rotationY,', 'position: [exhibit.position[0] + 5, 0, exhibit.position[2]],\n        rotationY: exhibit.rotationY,')],
    ['a cabinet no longer solid', changed('engine/Containers.tsx', 'registerKitColliders(kit, container.part, kitBundle, collision,', 'registerNothing(')],
    ['the furniture of a room no longer solid', changed('engine/RoomFurniture.tsx', 'registerKitColliders(kit, placement.part, kitBundle, collision,', 'registerNothing(')],
    ['a device no longer solid', changed('engine/Devices.tsx', 'registerKitColliders(kit, device.part, kitBundle, collision,', 'registerNothing(')],
    ['the devices of a room handed no collision world', changed('scenes/MuseumScene.tsx', /(<DeviceLayer\b[^>]*?)\s+collision=\{collision\}/, '$1')],
  ]
  const uncaught = refactors
    .filter(([, reader]) => interactionVolumeWiringProblems(reader).length === 0)
    .map(([name]) => name)
  check('and a component that mounts another is caught', uncaught.length === 0, uncaught.join('; '))
}

// ---------------------------------------------------------------------------
// What this gate accuses, against what the debt table dates
// ---------------------------------------------------------------------------

{
  const settled = settleKnownDebt(accusations, debtOf('test:navigation'), CONTENT_LOT)
  for (const issue of settled) {
    if (issue.severity !== 'debt') continue
    console.log(`  debt  ${issue.code} ${issue.id}: until L${issue.debt?.untilLot} — ${issue.debt?.note}`)
  }
  const errors = settled.filter((issue) => issue.severity === 'error')
  // A stale or overdue line is about the code it dates: its id starts with it.
  const about = (code: string) =>
    errors.filter((issue) => issue.code === code || issue.id?.startsWith(`${code}:`))
  const said = (issues: readonly ValidationIssue[]) => issues.map((issue) => `[${issue.code}] ${issue.message}`).join('; ')

  const lighthouse = about('lighthouse-walk-blocked')
  check(
    'walking straight at each breaker from the door gets there, beyond what the debt table dates',
    lighthouse.length === 0,
    said(lighthouse),
  )
  const unreached = about('no-standing-point')
  check(
    'every interactive has a place to stand in its own room, within reach and outside its own volume',
    unreached.length === 0,
    said(unreached),
  )
  const walkedInto = about('standing-point-inside-target')
  check(
    'and from the place nearest to it too, beyond what the debt table dates',
    walkedInto.length === 0,
    said(walkedInto),
  )
  const rest = errors.filter((issue) => ![...lighthouse, ...unreached, ...walkedInto].includes(issue))
  check('this gate owes nothing else', rest.length === 0, said(rest))
}

console.log(`${checks - failures}/${checks} checks passed`)
if (failures > 0) process.exitCode = 1
