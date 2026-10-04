/**
 * Headless proof that the collection in the Holyoke wall case is IN the case:
 * each piece in the middle of a bay made for it, resting on a real shelf top
 * or hanging on the lining, clear of every upright, board, brass rail and
 * piece of baked dressing, with nothing between it and the glass.
 *
 *   npm run test:kit   (second half)
 *
 * The run was dressed first and the collection hung in it afterwards, by eye.
 * All four interactive pieces ended up across an upright and a shelf; the
 * 1916 guide was wholly inside a board; the Morgan portrait, the one object
 * the player has to read to open the office drawer, had a shelf and a brass
 * rail through the face and its caption cut mid-sentence. `supportY: 1.32`
 * looked like a shelf height and was the CENTRE of the board. None of it
 * failed a gate, because the gate measured each piece against a number typed
 * beside it and never against the joinery.
 *
 * The generator now returns `layout`, written from the variables that build
 * the geometry, and this suite holds the content to it. The pieces are found
 * by where they are (inside the glazed part of the run), not by a list of
 * ids, so the next piece placed in the case is checked without being named.
 */

import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'

import { BAKED_BUNDLES } from '../src/content/bake.generated.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { ExhibitData } from '../src/content/schema.ts'
import { framedMediaBlock, PRINT_NUDGE } from '../src/engine/framedMediaLayout.ts'
// @ts-expect-error - the bake is plain JS with no type declarations.
import { buildHistoryCaseRun } from './bake/parts/holyokeDecor.mjs'

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

const RECIPE = 'history-case-run'
const FAMILIES = ['carcass', 'accent', 'lining', 'trim', 'glass', 'paper', 'artefacts'] as const
const PROP_TRIANGLE_BUDGET = 2500

/** A piece sits on the bay's centre line to within this. */
const CENTRE_TOLERANCE = 0.001
/** Clear air between a piece (or its caption) and an upright. */
const STILE_CLEARANCE = 0.03
/** How far a base may stand off its support, and what counts as touching. */
const REST_TOLERANCE = 0.0005
/** A frame's back is on the lining or within this of it. */
const FRAME_BACK_MAX = 0.005
/** Air kept over an open book, so that its pages can be read from above. */
const BOOK_HEADROOM = 0.25
/** Air between a caption's last line and the shelf below it. */
const CAPTION_CLEARANCE = 0.01
/**
 * Lines the credit under a frame is measured at. The Morgan portrait's wraps
 * to four in both languages at the mount's width; the panorama's fits in
 * fewer and is given the same allowance.
 */
const CAPTION_LINES = 4

type Box = { readonly min: readonly number[]; readonly max: readonly number[] }
type Shelf = { id: string; top: number; bottom: number; back: number; front: number; halfWidth: number }
type Bay = {
  index: number
  centreX: number
  hosts: 'frame' | 'book' | null
  shelves: Shelf[]
  rails: (Box & { id: string })[]
  ledge: Box
}
type Layout = {
  width: number
  height: number
  depth: number
  deckTop: number
  liningFront: number
  glassBack: number
  headBottom: number
  stiles: { x: number; halfWidth: number }[]
  bays: Bay[]
  filler: (Box & { id: string; bay: number })[]
}
type Geometry = {
  computeBoundingBox(): void
  boundingBox: { min: { toArray(): number[] }; max: { toArray(): number[] } }
}

const generated = buildHistoryCaseRun() as Record<(typeof FAMILIES)[number], Geometry> & { layout: Layout }
const layout = generated.layout

const kit = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit')
assert.ok(kit, 'the baked kit bundle exists')
const holyoke = MUSEUM.rooms.find((room) => room.id === 'holyoke')
assert.ok(holyoke, 'the Holyoke wing exists')
const placements = holyoke.kit.filter((placement) => placement.part === RECIPE)
assert.equal(placements.length, 1, 'the wing places exactly one run of wall cases')
const [placement] = placements
const exhibitBundle = BAKED_BUNDLES.find((bundle) => bundle.name === 'exhibits-holyoke')
assert.ok(exhibitBundle, 'the wing has a baked exhibit bundle')

// ---------------------------------------------------------------------------
// Frames of reference
// ---------------------------------------------------------------------------

/** three's rotateY: a local (x, z) turns to (x cos + z sin, -x sin + z cos). */
function turn(x: number, z: number, angle: number): [number, number] {
  return [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)]
}

/** A room-local point in the frame of the case run. */
function toCase(point: readonly number[]): [number, number, number] {
  const [x, z] = turn(point[0] - placement.position[0], point[2] - placement.position[2], -(placement.rotationY ?? 0))
  return [x, point[1] - placement.position[1], z]
}

/** The box of an exhibit's whole recipe, as placed, in the frame of the case run. */
function pieceBox(exhibit: ExhibitData): Box {
  const parts = exhibitBundle!.parts.filter(
    (part) => part.name === exhibit.recipe || part.name.startsWith(`${exhibit.recipe}__`),
  )
  assert.ok(parts.length > 0, `recipe "${exhibit.recipe}" is baked`)
  const scale = exhibit.scale ?? 1
  const corners: [number, number, number][] = []
  for (const part of parts) {
    for (const x of [part.bounds.min[0], part.bounds.max[0]]) {
      for (const y of [part.bounds.min[1], part.bounds.max[1]]) {
        for (const z of [part.bounds.min[2], part.bounds.max[2]]) {
          const [rx, rz] = turn(x * scale, z * scale, exhibit.rotationY ?? 0)
          corners.push(toCase([exhibit.position[0] + rx, exhibit.position[1] + y * scale, exhibit.position[2] + rz]))
        }
      }
    }
  }
  return {
    min: [0, 1, 2].map((axis) => Math.min(...corners.map((corner) => corner[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...corners.map((corner) => corner[axis]))),
  }
}

const bayWidth = layout.width / layout.bays.length
const bayAt = (x: number) => layout.bays.find((bay) => Math.abs(x - bay.centreX) <= bayWidth / 2) ?? null

type Piece = {
  readonly exhibit: ExhibitData
  readonly kind: 'frame' | 'book'
  readonly box: Box
  /** The exhibit's own origin, in the frame of the case run. */
  readonly origin: readonly [number, number, number]
  readonly bay: Bay | null
}

/** Every exhibit of the wing whose origin lies in the glazed part of the run. */
const pieces: Piece[] = MUSEUM.exhibits
  .filter((exhibit) => holyoke.exhibitIds.includes(exhibit.id))
  .flatMap((exhibit) => {
    const origin = toCase(exhibit.position)
    const inside =
      Math.abs(origin[0]) <= layout.width / 2 &&
      origin[1] >= layout.deckTop &&
      origin[1] <= layout.headBottom &&
      origin[2] >= 0 &&
      origin[2] <= layout.depth
    if (!inside) return []
    return [
      {
        exhibit,
        // What hangs is a frame; what the content rests on a declared support is a book.
        kind: exhibit.mount === 'case-wall' ? ('frame' as const) : ('book' as const),
        box: pieceBox(exhibit),
        origin,
        bay: bayAt(origin[0]),
      },
    ]
  })

// ---------------------------------------------------------------------------
// Solids of the case, as boxes in its own frame
// ---------------------------------------------------------------------------

type Solid = Box & { readonly name: string }

const solids: Solid[] = [
  ...layout.stiles.map((stile, index) => ({
    name: `upright ${index}`,
    min: [stile.x - stile.halfWidth, layout.deckTop, 0],
    max: [stile.x + stile.halfWidth, layout.headBottom, layout.depth],
  })),
  ...layout.bays.flatMap((bay) => [
    ...bay.shelves.map((shelf) => ({
      name: `${shelf.id} shelf of bay ${bay.index}`,
      min: [bay.centreX - shelf.halfWidth, shelf.bottom, shelf.back],
      max: [bay.centreX + shelf.halfWidth, shelf.top, shelf.front],
    })),
    ...bay.rails.map((rail) => ({ name: `${rail.id} brass rail of bay ${bay.index}`, min: rail.min, max: rail.max })),
    { name: `reading ledge of bay ${bay.index}`, min: bay.ledge.min, max: bay.ledge.max },
  ]),
  ...layout.filler.map((item) => ({ name: `dressing "${item.id}" in bay ${item.bay}`, min: item.min, max: item.max })),
]

/** The solids a box shares volume with: more than `REST_TOLERANCE` on every axis. */
function intersecting(box: Box): string[] {
  return solids
    .filter((solid) =>
      [0, 1, 2].every(
        (axis) => Math.min(box.max[axis], solid.max[axis]) - Math.max(box.min[axis], solid.min[axis]) > REST_TOLERANCE,
      ),
    )
    .map((solid) => solid.name)
}

const mm = (metres: number) => `${(metres * 1000).toFixed(1)} mm`
const lowerShelf = (bay: Bay) => bay.shelves.find((shelf) => shelf.id === 'lower')

// ---------------------------------------------------------------------------
// The baked file itself
// ---------------------------------------------------------------------------

/**
 * Positions are stored as 14-bit integers across each part's own box, so a
 * vertex of the ten-metre carcass lands within 0.6 mm of where it was made.
 */
const BAKE_TOLERANCE = 0.0015

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
})
const kitDocument = await io.read(fileURLToPath(new URL(`../public${kit.url}`, import.meta.url)))

/** Every vertex of one baked node, in the recipe's frame: the bytes the player downloads. */
function bakedVertices(name: string): [number, number, number][] {
  const node = kitDocument.getRoot().listNodes().find((candidate) => candidate.getName() === name)
  assert.ok(node, `${name} is a node of the kit file`)
  const translation = node.getTranslation()
  const scale = node.getScale()
  const vertices: [number, number, number][] = []
  for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
    const position = primitive.getAttribute('POSITION')
    if (!position) continue
    const element: number[] = []
    for (let index = 0; index < position.getCount(); index += 1) {
      // `getElement` undoes the integer normalisation; the node undoes the rest.
      position.getElement(index, element)
      vertices.push([
        element[0] * scale[0] + translation[0],
        element[1] * scale[1] + translation[1],
        element[2] * scale[2] + translation[2],
      ])
    }
  }
  return vertices
}

const nodeOf = (family: (typeof FAMILIES)[number]) => (family === 'carcass' ? RECIPE : `${RECIPE}__${family}`)
const baked = Object.fromEntries(FAMILIES.map((family) => [family, bakedVertices(nodeOf(family))])) as Record<
  (typeof FAMILIES)[number],
  [number, number, number][]
>

/** How far out from the lining the runtime draws a frame's print: along the frame's own normal. */
function printPlane(piece: Piece) {
  const facing = piece.exhibit.rotationY ?? 0
  return toCase([
    piece.exhibit.position[0] + Math.sin(facing) * PRINT_NUDGE,
    piece.exhibit.position[1],
    piece.exhibit.position[2] + Math.cos(facing) * PRINT_NUDGE,
  ])[2]
}

/** What `FramedMedia` adds round a frame: the mount board and the credit lines. */
function captionBlock(piece: Piece): Box {
  const asset = MUSEUM.media.find((candidate) => candidate.id === piece.exhibit.mediaId)
  assert.ok(asset, `${piece.exhibit.id} names its photograph`)
  const block = framedMediaBlock(asset.aspect, CAPTION_LINES)
  return {
    min: [piece.origin[0] - block.halfWidth, piece.origin[1] + block.bottom, piece.box.min[2]],
    max: [piece.origin[0] + block.halfWidth, piece.origin[1] + block.top, Math.max(piece.box.max[2], printPlane(piece))],
  }
}

console.log('History case run:')

// ---------------------------------------------------------------------------
// 1. The baked run is the generator's
// ---------------------------------------------------------------------------

test('the baked run is what the generator makes, within the prop budget', () => {
  const problems: string[] = []
  for (const family of FAMILIES) {
    const name = family === 'carcass' ? RECIPE : `${RECIPE}__${family}`
    const baked = kit.parts.find((part) => part.name === name)
    if (!baked) {
      problems.push(`${name} is not in the bake`)
      continue
    }
    const geometry = generated[family]
    geometry.computeBoundingBox()
    const min = geometry.boundingBox.min.toArray()
    const max = geometry.boundingBox.max.toArray()
    for (const axis of [0, 1, 2]) {
      if (Math.abs(min[axis] - baked.bounds.min[axis]) > 1e-3 || Math.abs(max[axis] - baked.bounds.max[axis]) > 1e-3) {
        problems.push(
          `${name}: generator ${min.map((n) => n.toFixed(4))} → ${max.map((n) => n.toFixed(4))}, ` +
            `bake ${baked.bounds.min.join(',')} → ${baked.bounds.max.join(',')} (run \`npm run bake\`)`,
        )
        break
      }
    }
  }
  const triangles = kit.parts
    .filter((part) => part.name === RECIPE || part.name.startsWith(`${RECIPE}__`))
    .reduce((sum, part) => sum + part.triangles, 0)
  if (triangles > PROP_TRIANGLE_BUDGET) problems.push(`${triangles} triangles, over the ${PROP_TRIANGLE_BUDGET} of a prop`)
  assert.deepEqual(problems, [])
})

/**
 * Bounds cannot tell a shelf from the same shelf a centimetre higher: both sit
 * inside the box of the carcass. A generator edited without a bake would then
 * hold the content to joinery the player does not get. So the layout is laid
 * against the baked vertices themselves, both ways.
 */
test('every upright, shelf and brass rail of the layout is in the baked file, corner for corner', () => {
  const problems: string[] = []
  // The reading ledges are raked, so their box has no corner of its own in
  // the mesh, and the dressing is rolls and spheres; both are held by the
  // check below instead.
  const declared: { solid: Solid; family: (typeof FAMILIES)[number] }[] = solids
    .filter((solid) => !solid.name.startsWith('dressing') && !solid.name.startsWith('reading ledge'))
    .map((solid) => ({ solid, family: solid.name.includes('brass rail') ? 'trim' : 'carcass' }))
  for (const { solid, family } of declared) {
    let missing = 0
    for (const x of [solid.min[0], solid.max[0]]) {
      for (const y of [solid.min[1], solid.max[1]]) {
        for (const z of [solid.min[2], solid.max[2]]) {
          const found = baked[family].some(
            (vertex) =>
              Math.abs(vertex[0] - x) < BAKE_TOLERANCE &&
              Math.abs(vertex[1] - y) < BAKE_TOLERANCE &&
              Math.abs(vertex[2] - z) < BAKE_TOLERANCE,
          )
          if (!found) missing += 1
        }
      }
    }
    if (missing > 0) problems.push(`the ${solid.name}: ${missing} of its 8 corners are not in the bake (run \`npm run bake\`)`)
  }
  assert.ok(declared.length >= layout.stiles.length + layout.bays.length * 2, 'the layout declares the joinery')
  assert.deepEqual(problems, [])
})

test('nothing is baked inside the glazing that the layout does not declare', () => {
  // The open inside of the case: in front of the lining, behind the glass,
  // above the deck and under the head. A stale bake still has the shelf, the
  // jersey or the ball the generator no longer makes, and it shows up here.
  const SKIN = 0.004
  const strays: string[] = []
  for (const family of ['carcass', 'trim', 'paper', 'artefacts', 'lining'] as const) {
    let count = 0
    let example: number[] | null = null
    for (const vertex of baked[family]) {
      const inside =
        vertex[1] > layout.deckTop + SKIN &&
        vertex[1] < layout.headBottom - SKIN &&
        vertex[2] > layout.liningFront + SKIN &&
        vertex[2] < layout.glassBack - SKIN
      if (!inside) continue
      const accounted = solids.some((solid) =>
        [0, 1, 2].every(
          (axis) => vertex[axis] > solid.min[axis] - BAKE_TOLERANCE && vertex[axis] < solid.max[axis] + BAKE_TOLERANCE,
        ),
      )
      if (!accounted) {
        count += 1
        example ??= vertex
      }
    }
    if (count > 0 && example) {
      strays.push(
        `${nodeOf(family)}: ${count} vertices in the open case that the layout does not account for, ` +
          `e.g. at ${example.map((n) => n.toFixed(3)).join(', ')} (run \`npm run bake\`)`,
      )
    }
  }
  assert.deepEqual(strays, [])
})

test('the layout is the joinery: six uprights, five bays, and the dressing written down', () => {
  assert.equal(layout.stiles.length, layout.bays.length + 1)
  for (const bay of layout.bays) {
    assert.ok(lowerShelf(bay), `bay ${bay.index} has a lower shelf`)
    assert.equal(bay.rails.length, bay.shelves.length, `bay ${bay.index} has one brass rail per shelf`)
  }
  assert.ok(layout.filler.length > 0, 'the baked dressing is recorded')
  assert.ok(layout.liningFront > 0 && layout.liningFront < layout.glassBack)
})

// ---------------------------------------------------------------------------
// 2. Each hosting bay has its piece, and only hosting bays have one
// ---------------------------------------------------------------------------

test('every bay that hosts has exactly one piece of its kind, and no other bay has any', () => {
  const problems: string[] = []
  for (const bay of layout.bays) {
    const here = pieces.filter((piece) => piece.bay === bay)
    if (bay.hosts === null) {
      for (const piece of here) problems.push(`${piece.exhibit.id} is in bay ${bay.index}, which hosts nothing`)
      continue
    }
    const right = here.filter((piece) => piece.kind === bay.hosts)
    if (right.length !== 1) {
      problems.push(
        `bay ${bay.index} hosts a ${bay.hosts} and holds ` +
          `${here.map((piece) => `${piece.exhibit.id} (${piece.kind})`).join(', ') || 'nothing'}`,
      )
    }
    for (const piece of here) {
      if (piece.kind !== bay.hosts) problems.push(`${piece.exhibit.id} is a ${piece.kind} in bay ${bay.index}, which hosts a ${bay.hosts}`)
    }
  }
  for (const piece of pieces) {
    if (!piece.bay) problems.push(`${piece.exhibit.id} is in no bay`)
  }
  assert.ok(pieces.length >= 4, `the case holds the wing's four pieces (found ${pieces.length})`)
  assert.deepEqual(problems, [])
})

// ---------------------------------------------------------------------------
// 3. In the middle of the bay, away from the uprights
// ---------------------------------------------------------------------------

test('every piece is on the centre line of its bay and three centimetres clear of the uprights', () => {
  const problems: string[] = []
  for (const piece of pieces) {
    if (!piece.bay) continue
    const off = piece.origin[0] - piece.bay.centreX
    if (Math.abs(off) > CENTRE_TOLERANCE) {
      problems.push(`${piece.exhibit.id} is ${mm(Math.abs(off))} off the centre of bay ${piece.bay.index}`)
    }
    for (const stile of layout.stiles) {
      const gap = Math.max(piece.box.min[0] - (stile.x + stile.halfWidth), stile.x - stile.halfWidth - piece.box.max[0])
      if (gap < STILE_CLEARANCE) {
        problems.push(
          `${piece.exhibit.id} ${gap < 0 ? `runs ${mm(-gap)} into` : `is ${mm(gap)} from`} the upright at x = ${stile.x.toFixed(2)}`,
        )
      }
    }
  }
  assert.deepEqual(problems, [])
})

// ---------------------------------------------------------------------------
// 4. Through nothing
// ---------------------------------------------------------------------------

test('no piece shares volume with an upright, a shelf, a brass rail or the dressing', () => {
  const problems = pieces.flatMap((piece) =>
    intersecting(piece.box).map((solid) => `${piece.exhibit.id} passes through the ${solid}`),
  )
  assert.deepEqual(problems, [])
})

// ---------------------------------------------------------------------------
// 5. Books rest on a real shelf top
// ---------------------------------------------------------------------------

test('every book rests on the top of its bay\'s lower shelf, wholly on the board, with clear air above', () => {
  const problems: string[] = []
  for (const piece of pieces) {
    if (piece.kind !== 'book' || !piece.bay) continue
    const shelf = lowerShelf(piece.bay)
    if (!shelf) continue
    const id = piece.exhibit.id
    const offset = piece.box.min[1] - shelf.top
    if (Math.abs(offset) > REST_TOLERANCE) {
      problems.push(`${id} ${offset < 0 ? 'sinks' : 'floats'} ${mm(Math.abs(offset))} ${offset < 0 ? 'into' : 'over'} the shelf top (${shelf.top.toFixed(4)})`)
    }
    const declared = piece.exhibit.supportY
    if (declared === undefined || Math.abs(declared - (placement.position[1] + shelf.top)) > REST_TOLERANCE) {
      problems.push(`${id} declares supportY ${declared}; the top of the board is ${(placement.position[1] + shelf.top).toFixed(4)}`)
    }
    const onBoard =
      piece.box.min[0] >= piece.bay.centreX - shelf.halfWidth &&
      piece.box.max[0] <= piece.bay.centreX + shelf.halfWidth &&
      piece.box.min[2] >= shelf.back &&
      piece.box.max[2] <= shelf.front
    if (!onBoard) problems.push(`${id} overhangs the board it stands on`)
    const above: Box = {
      min: [piece.box.min[0], piece.box.max[1], piece.box.min[2]],
      max: [piece.box.max[0], piece.box.max[1] + BOOK_HEADROOM, piece.box.max[2]],
    }
    for (const solid of intersecting(above)) problems.push(`${id} has the ${solid} within ${BOOK_HEADROOM * 100} cm above it`)
  }
  assert.deepEqual(problems, [])
})

// ---------------------------------------------------------------------------
// 6. Frames hang on the lining, with room for the mount and the caption
// ---------------------------------------------------------------------------

test('every frame hangs on the lining of a bay with no upper shelf, mount and caption inside the opening', () => {
  const problems: string[] = []
  for (const piece of pieces) {
    if (piece.kind !== 'frame' || !piece.bay) continue
    const id = piece.exhibit.id
    const back = piece.box.min[2] - layout.liningFront
    if (back < -REST_TOLERANCE || back > FRAME_BACK_MAX) {
      problems.push(`${id}: its back is ${mm(back)} from the lining (0 to ${mm(FRAME_BACK_MAX)})`)
    }
    if (printPlane(piece) <= piece.origin[2]) problems.push(`${id}: the frame faces the lining, not the glass`)
    if (piece.bay.shelves.some((shelf) => shelf.id === 'upper')) {
      problems.push(`${id}: bay ${piece.bay.index} still has an upper shelf across it`)
    }
    const shelf = lowerShelf(piece.bay)
    const block = captionBlock(piece)
    if (block.max[1] > layout.headBottom) {
      problems.push(`${id}: the mount board rises ${mm(block.max[1] - layout.headBottom)} into the head of the case`)
    }
    if (shelf && block.min[1] < shelf.top + CAPTION_CLEARANCE) {
      problems.push(
        `${id}: the caption's last line ends at ${block.min[1].toFixed(3)}, ` +
          `${mm(shelf.top + CAPTION_CLEARANCE - block.min[1])} short of clearing the shelf (top ${shelf.top.toFixed(4)})`,
      )
    }
    const opening = bayWidth / 2 - layout.stiles[0].halfWidth - STILE_CLEARANCE
    const reach = Math.max(piece.bay.centreX - block.min[0], block.max[0] - piece.bay.centreX)
    if (reach > opening) problems.push(`${id}: mount and caption reach ${mm(reach - opening)} too near an upright`)
  }
  assert.deepEqual(problems, [])
})

// ---------------------------------------------------------------------------
// 7. Nothing between the piece and the glass
// ---------------------------------------------------------------------------

test('every piece stops short of the glass, with nothing between it and the visitor', () => {
  const problems: string[] = []
  for (const piece of pieces) {
    const id = piece.exhibit.id
    const seen = piece.kind === 'frame' ? captionBlock(piece) : piece.box
    const front = Math.max(piece.box.max[2], seen.max[2])
    if (front >= layout.glassBack) problems.push(`${id} reaches ${mm(front - layout.glassBack)} past the inside of the glass`)
    const corridor: Box = {
      min: [seen.min[0], seen.min[1], piece.box.max[2]],
      max: [seen.max[0], seen.max[1], layout.glassBack],
    }
    for (const solid of intersecting(corridor)) problems.push(`${id} is behind the ${solid}`)
  }
  assert.deepEqual(problems, [])
})

console.log(`${passed}/${passed + failed} case-run checks passed`)
if (failed > 0) process.exitCode = 1
