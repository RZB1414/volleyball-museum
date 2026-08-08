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
 */

import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three'

import { BAKED_BUNDLES, type BakedBundle } from '../src/content/bake.generated.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { ExhibitMount, RoomData, Vec3 } from '../src/content/schema.ts'
import { CollisionWorld, movePlayer, worldFromMeshes } from '../src/engine/collision.ts'
// @ts-expect-error - the bake is plain JS with no type declarations.
import { buildRoomShell, prepareRoomShells } from './bake/kit.mjs'

const CAPSULE = { radius: 0.3, height: 1.75 }
const STEP = 1 / 60
const SPEED = 2.6
/** Give up after this many simulated seconds; a real crossing takes about six. */
const TIME_LIMIT = 30
/** The player's feet must never drop this far below the floor plane. */
const FALL_LIMIT = -0.35

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
const preparedRoomById = new Map(ROOM_SHELLS.map((room) => [room.id, room]))

type Placement = {
  readonly part: string
  readonly position: Vec3
  readonly rotationY?: number
  readonly scale?: number
}

function colliderPartsFor(placement: Placement) {
  if (!kitBundle) return []
  return kitBundle.parts.filter(
    (part) =>
      part.collider &&
      (part.name === placement.part || part.name.startsWith(`${placement.part}__`)),
  )
}

function addFurnitureColliders(
  meshes: Mesh[],
  room: RoomData,
  placement: Placement,
) {
  for (const part of colliderPartsFor(placement)) {
    if (!part.collider) continue
    const [hx, hy, hz] = part.collider.halfExtents
    const geometry = new BoxGeometry(hx * 2, hy * 2, hz * 2)
    geometry.translate(...part.collider.centre)

    const mesh = new Mesh(geometry, new MeshBasicMaterial())
    mesh.name = `${room.id}__${part.name}__collider`
    mesh.position.set(
      room.origin[0] + placement.position[0],
      room.origin[1] + placement.position[1],
      room.origin[2] + placement.position[2],
    )
    mesh.rotation.y = placement.rotationY ?? 0
    mesh.scale.setScalar(placement.scale ?? 1)
    meshes.push(mesh)
  }
}

function buildWorld(): CollisionWorld {
  const meshes: Mesh[] = []
  for (const room of MUSEUM.rooms) {
    const preparedRoom = preparedRoomById.get(room.id)
    if (!preparedRoom) throw new Error(`no prepared shell for room "${room.id}"`)

    for (const part of buildRoomShell(preparedRoom) as { name: string; geometry: never }[]) {
      const mesh = new Mesh(part.geometry, new MeshBasicMaterial())
      mesh.name = part.name
      mesh.position.set(room.origin[0], room.origin[1], room.origin[2])
      meshes.push(mesh)
    }

    // Furniture collision is data-driven too. Recipes may be a root node or a
    // set of `root__material` siblings; only components carrying a collider in
    // the bake manifest participate. In particular, a partition collides by
    // its wider foot rather than by its decorative face.
    for (const placement of room.kit) {
      addFurnitureColliders(meshes, room, placement)
    }
    for (const container of room.containers ?? []) {
      addFurnitureColliders(meshes, room, { ...container, scale: 1 })
    }
  }
  return worldFromMeshes(meshes)
}

const world = buildWorld()

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

const MOUNT_PART: Record<ExhibitMount, string | null> = {
  plinth: 'plinth-block',
  'vitrine-table': 'vitrine-table',
  'vitrine-tower': 'vitrine-tower',
  wall: null,
  floor: null,
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

    for (const exhibitId of room.exhibitIds) {
      const exhibit = MUSEUM.exhibits.find((candidate) => candidate.id === exhibitId)
      if (!exhibit) continue
      const part = MOUNT_PART[exhibit.mount]
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

function roomPoint(roomId: string, x: number, z: number) {
  const room = MUSEUM.rooms.find((candidate) => candidate.id === roomId)
  if (!room) throw new Error(`no room "${roomId}"`)
  return new Vector3(room.origin[0] + x, room.origin[1], room.origin[2] + z)
}

/** Safe gathering points, deliberately outside every furniture footprint. */
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

const solidFootprints = collectSolidFootprints()
const forbiddenOverlaps: string[] = []
for (let left = 0; left < solidFootprints.length; left += 1) {
  for (let right = left + 1; right < solidFootprints.length; right += 1) {
    const a = solidFootprints[left]
    const b = solidFootprints[right]
    if (a.owner === b.owner || INTENTIONAL_SOLID_OVERLAPS.has(overlapKey(a, b))) continue
    if (footprintsOverlap(a, b)) forbiddenOverlaps.push(`${a.owner} × ${b.owner}`)
  }
}
check(
  'distinct solid furniture and exhibit mounts do not interpenetrate',
  forbiddenOverlaps.length === 0,
  forbiddenOverlaps.join('; '),
)

const holyoke = MUSEUM.rooms.find((room) => room.id === 'holyoke')
const partition = holyoke?.kit.find((placement) => placement.part === 'partition')
if (!holyoke || !partition) throw new Error('Holyoke needs a partition for its collision proof.')

const partitionPoint = (x: number, z: number) => {
  const point = new Vector3(x, 0, z).applyAxisAngle(
    new Vector3(0, 1, 0),
    partition.rotationY ?? 0,
  )
  point.add(
    roomPoint(
      holyoke.id,
      partition.position[0],
      partition.position[2],
    ),
  )
  return point
}

// Cross the broad face near its centre, well clear of the L return. A collider
// matching only the 0.16 m timber foot lets the real 0.22 m autostep climb it;
// the full-height collider must consume the move and leave the finish unreached.
const partitionCrossing = walk([partitionPoint(0, -1.1), partitionPoint(0, 1.35)])
check(
  'a frontal walk cannot autostep through the 2.4 m partition',
  !partitionCrossing.arrived,
  `crossed to ${partitionCrossing.position.toArray().map((n) => n.toFixed(2)).join(',')}`,
)

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
const reachable = new Set<string>(['atrium'])
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
