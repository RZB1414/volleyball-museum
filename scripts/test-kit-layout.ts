/**
 * Headless proof that what the Posse baked is where the content and the
 * runtime take it to be: the iron safe that opens, the lectern with the Book
 * of Deeds on it, and the answering machine.
 *
 *   npm run test:kit   (third part)
 *
 * Each of the three is worked by code that never sees the geometry. The
 * safe's door is turned about a hinge written as two numbers in `museum.ts`;
 * the proof is drawn "on the shelf" because a node is switched on; the Book
 * is "on the lectern" for the same reason. A hinge typed a few centimetres
 * off swings the door through its own frame, and a Book baked a centimetre
 * above the reading surface floats, and neither fails anything: the gate
 * knows the nodes exist, not where they are.
 *
 * So the generators return `layout`, written from the variables that build
 * the geometry (as the wall case of the wing does, `test-case-run.ts`), and
 * this suite holds three things to each other: that layout, the vertices
 * the bake put in the kit file, and the content that points at them.
 */

import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'

import { BAKED_BUNDLES } from '../src/content/bake.generated.ts'
import { MUSEUM } from '../src/content/museum.ts'
// @ts-expect-error - the bake is plain JS with no type declarations.
import { bevelledBox, withoutFlatFace } from './bake/lib/geometry.mjs'
// @ts-expect-error - the bake is plain JS with no type declarations.
import { buildAtriumLectern } from './bake/parts/atriumDecor.mjs'
// @ts-expect-error - the bake is plain JS with no type declarations.
import { buildOfficeSafe } from './bake/parts/officeDecor.mjs'
// @ts-expect-error - the bake is plain JS with no type declarations.
import { buildAnsweringMachine } from './bake/parts/officeProps.mjs'

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

/** What counts as touching, and as the same place: a millimetre. The bake quantises positions to less. */
const TOUCH = 0.001

type Point = readonly [number, number, number]
type Range = { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number }
type SafeLayout = {
  front: number
  hinge: { x: number; z: number; centres: number[]; radius: number; length: number }
  door: Range & { minZ: number; maxZ: number }
  opening: Range
  cavity: Range & { minZ: number; maxZ: number }
  shelf: { top: number; thickness: number; minX: number; maxX: number; minZ: number; maxZ: number }
  papers: { bottom: number; top: number }
}
type LecternLayout = {
  tilt: number
  plane: { centre: number[]; up: number[]; down: number[] }
  rest: { along: number; proud: number }
  book: { width: number; depth: number; thickness: number; along: number }
}
type MachineLayout = { width: number; depth: number; height: number; front: number }

const kit = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit')
assert.ok(kit, 'the baked kit bundle exists')
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
})
const kitDocument = await io.read(fileURLToPath(new URL(`../public${kit.url}`, import.meta.url)))

/** The vertices of one node of the kit file, in the recipe's own space. */
function bakedVertices(name: string): Point[] {
  const node = kitDocument.getRoot().listNodes().find((candidate) => candidate.getName() === name)
  assert.ok(node, `${name} is a node of the kit file`)
  const translation = node.getTranslation()
  const scale = node.getScale()
  const vertices: Point[] = []
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

/** The triangles of one node of the kit file, corner by corner, in the recipe's own space. */
function bakedTriangles(name: string): Point[][] {
  const node = kitDocument.getRoot().listNodes().find((candidate) => candidate.getName() === name)
  assert.ok(node, `${name} is a node of the kit file`)
  const translation = node.getTranslation()
  const scale = node.getScale()
  const found: Point[][] = []
  for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
    const position = primitive.getAttribute('POSITION')
    if (!position) continue
    const indices = primitive.getIndices()
    const corner = (index: number): Point => {
      const element: number[] = []
      position.getElement(index, element)
      return [element[0] * scale[0] + translation[0], element[1] * scale[1] + translation[1], element[2] * scale[2] + translation[2]]
    }
    const count = indices ? indices.getCount() : position.getCount()
    for (let index = 0; index + 2 < count; index += 3) {
      found.push([0, 1, 2].map((offset) => corner(indices ? indices.getScalar(index + offset) : index + offset)))
    }
  }
  return found
}

/** Whether a point of the XY plane is inside a triangle, seen along Z. */
const covers = ([px, py]: readonly number[], [a, b, c]: readonly Point[]) => {
  const side = (p: Point, q: Point) => (q[0] - p[0]) * (py - p[1]) - (q[1] - p[1]) * (px - p[0])
  const sides = [side(a, b), side(b, c), side(c, a)]
  return !(sides.some((value) => value < 0) && sides.some((value) => value > 0))
}
/** Whether a triangle lies flat on the plane z. */
const flatAt = (z: number) => (triangle: readonly Point[]) => triangle.every((corner) => Math.abs(corner[2] - z) < TOUCH)

const span = (vertices: readonly Point[], axis: 0 | 1 | 2) => {
  const values = vertices.map((vertex) => vertex[axis])
  return { min: Math.min(...values), max: Math.max(...values) }
}
const near = (actual: number, expected: number, what: string, tolerance = TOUCH) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${what}: ${actual.toFixed(4)} against ${expected.toFixed(4)}`)
const triangles = (name: string) => kit.parts.find((part) => part.name === name)?.triangles ?? 0
const nodesOf = (recipe: string) => kit.parts.filter((part) => part.name === recipe || part.name.startsWith(`${recipe}__`)).map((part) => part.name)

console.log('\nWhat the Posse baked, against its layout')

// ---------------------------------------------------------------------------
// The iron safe
// ---------------------------------------------------------------------------

const safeLayout = (buildOfficeSafe() as { layout: SafeLayout }).layout
const safe = MUSEUM.rooms.flatMap((room) => room.containers ?? []).find((container) => container.id === 'office-safe')

test('the safe is four nodes: a body, a door of two families, and the papers', () => {
  assert.deepEqual(nodesOf('office-safe'), ['office-safe', 'office-safe__door', 'office-safe__door-hardware', 'office-safe__papers'])
  // It was 1,084 triangles as a solid box; the plan allowed the opening 350 more.
  const total = nodesOf('office-safe').reduce((sum, name) => sum + triangles(name), 0)
  assert.ok(total <= 1_434, `${total} triangles`)
  assert.ok(safe, 'the office has the safe among its containers')
  assert.equal(safe.part, 'office-safe')
  assert.deepEqual(safe.contents, [{ node: 'papers' }])
  assert.equal(safe.door?.nodePrefix, 'door')
})

test('the hinge the content declares is the axis of the two knuckles the bake drew', () => {
  assert.ok(safe?.door)
  const { hinge } = safeLayout
  // The two numbers in `museum.ts` are the generator's own, to a tenth of a
  // millimetre (the generator works them out; the content writes them down).
  near(safe.door.hingeAt[0], hinge.x, 'the pivot of the door, across', 0.0001)
  near(safe.door.hingeAt[1], hinge.z, 'the pivot of the door, in depth', 0.0001)
  // A pivot a few centimetres off would pass every other gate: the door
  // would swing, through its own frame. The check has to see that.
  assert.throws(() => near(safe.door!.hingeAt[0] + 0.03, hinge.x, 'a hinge three centimetres off', 0.0001))
  // And the bake has a knuckle at each height, round that very axis: a ring
  // of vertices at the knuckle's radius, top and bottom.
  const hardware = bakedVertices('office-safe__door-hardware')
  for (const centre of hinge.centres) {
    const ring = hardware.filter(
      ([x, y, z]) =>
        Math.abs(y - centre) <= hinge.length / 2 + TOUCH && Math.abs(Math.hypot(x - hinge.x, z - hinge.z) - hinge.radius) <= TOUCH,
    )
    assert.ok(ring.length >= 20, `only ${ring.length} vertices of a knuckle at height ${centre}`)
    near(span(ring, 1).min, centre - hinge.length / 2, `the foot of the knuckle at ${centre}`)
    near(span(ring, 1).max, centre + hinge.length / 2, `the head of the knuckle at ${centre}`)
  }
  // The knuckles are the door's, and turn in place: nothing of the body
  // stands inside one. (What carries each on the frame is a lug behind it.)
  const body = bakedVertices('office-safe')
  for (const centre of hinge.centres) {
    const inside = body.filter(
      ([x, y, z]) => Math.abs(y - centre) < hinge.length / 2 && Math.hypot(x - hinge.x, z - hinge.z) < hinge.radius - 0.008,
    )
    assert.deepEqual(inside, [], `the body reaches into the knuckle at ${centre}`)
  }
  // The leaf hangs off that axis, and opens away from the frame: turned by
  // the angle the content gives, no corner of it ends up behind the front of
  // the safe.
  const leaf = bakedVertices('office-safe__door')
  near(span(leaf, 0).min, safeLayout.door.minX, 'the hinge side of the leaf')
  near(span(leaf, 0).max, safeLayout.door.maxX, 'the lock side of the leaf')
  assert.ok(span(leaf, 0).min > hinge.x, 'the leaf is on the far side of its own hinge')
  const frontOfTheSafe = safeLayout.front
  const angle = safe.door.openAngle
  /** The door as it stands open, turned about a vertical pivot: three's rotation about +Y. */
  const turnedAbout = (pivotX: number, pivotZ: number, vertices: readonly Point[]) =>
    vertices.map(([x, y, z]): Point => {
      const dx = x - pivotX
      const dz = z - pivotZ
      return [pivotX + dx * Math.cos(angle) + dz * Math.sin(angle), y, pivotZ - dx * Math.sin(angle) + dz * Math.cos(angle)]
    })
  const swung = turnedAbout(safe.door.hingeAt[0], safe.door.hingeAt[1], [...leaf, ...hardware])
  assert.ok(angle < -Math.PI / 2 && angle > -Math.PI, `the door opens ${((-angle * 180) / Math.PI).toFixed(0)} degrees`)
  assert.ok(span(swung, 2).min > frontOfTheSafe, `the open door stands ${(span(swung, 2).min - frontOfTheSafe).toFixed(3)} m from the front of the safe: it went through it`)
  // The same turn about a pivot ten centimetres into the leaf, or one set
  // back in the frame, sends the door through the front of the safe: what a
  // hinge placed by eye does, and what this would then say.
  assert.ok(span(turnedAbout(hinge.x + 0.1, hinge.z, leaf), 2).min < frontOfTheSafe, 'a pivot inside the leaf is not seen')
  assert.ok(span(turnedAbout(hinge.x, hinge.z - 0.08, leaf), 2).min < frontOfTheSafe, 'a pivot set back in the frame is not seen')
  // And the other way round it would open into the safe.
  assert.ok(span(turnedAbout(hinge.x, hinge.z, leaf), 2).max > 0.9, 'the door opens out into the room')
  // And shut it covers the opening, lapping it on every side.
  for (const [side, lap] of [
    ['left', safeLayout.opening.minX - safeLayout.door.minX],
    ['right', safeLayout.door.maxX - safeLayout.opening.maxX],
    ['below', safeLayout.opening.minY - safeLayout.door.minY],
    ['above', safeLayout.door.maxY - safeLayout.opening.maxY],
  ] as const) {
    assert.ok(lap >= 0.04, `the door laps the opening by ${(lap * 1000).toFixed(0)} mm on the ${side}`)
  }
})

test('the safe is hollow where it opens, and the proof lies on its shelf', () => {
  const { opening, cavity, shelf } = safeLayout
  const body = bakedVertices('office-safe')
  const front = safeLayout.front
  // The face is open: no vertex of the body stands inside the opening, at
  // the front or anywhere through the thickness of the wall.
  const plugging = body.filter(
    ([x, y, z]) =>
      x > opening.minX + TOUCH && x < opening.maxX - TOUCH && y > opening.minY + TOUCH && y < opening.maxY - TOUCH && z > cavity.maxZ + TOUCH,
  )
  assert.deepEqual(plugging, [], 'something of the body stands in the opening')
  // The frame meets the opening at the front, and the lining stands at the walls of the cavity.
  for (const [x, y] of [
    [opening.minX, opening.minY],
    [opening.maxX, opening.minY],
    [opening.minX, opening.maxY],
    [opening.maxX, opening.maxY],
  ]) {
    assert.ok(
      body.some((vertex) => Math.abs(vertex[0] - x) <= TOUCH && Math.abs(vertex[1] - y) <= TOUCH && Math.abs(vertex[2] - front) <= TOUCH),
      `the frame has no corner at (${x}, ${y})`,
    )
  }
  assert.ok(body.some(([x, , z]) => Math.abs(x - cavity.minX) <= TOUCH && Math.abs(z - cavity.minZ) <= TOUCH), 'the lining has no back corner')
  assert.ok(cavity.minX < opening.minX && cavity.maxX > opening.maxX && cavity.minY < opening.minY && cavity.maxY > opening.maxY, 'the cavity is wider than the way into it')
  // The shelf is a board of the body, wall to wall.
  const board = body.filter(([, y]) => Math.abs(y - shelf.top) <= TOUCH)
  assert.ok(board.length >= 4, 'the body has no shelf at the height the layout gives')
  near(span(board, 0).min, shelf.minX, 'the shelf, at one wall')
  near(span(board, 0).max, shelf.maxX, 'the shelf, at the other')
  // The papers rest on it: their underside is the shelf's top, and no
  // corner of them hangs past it or into a wall.
  const papers = bakedVertices('office-safe__papers')
  near(span(papers, 1).min, shelf.top, 'the underside of the proof')
  assert.ok(span(papers, 1).max - shelf.top <= 0.01, 'the papers stand a centimetre tall')
  assert.ok(span(papers, 0).min >= shelf.minX && span(papers, 0).max <= shelf.maxX, 'the proof is wider than the shelf')
  assert.ok(span(papers, 2).min >= shelf.minZ && span(papers, 2).max <= shelf.maxZ, 'the proof hangs off the shelf')
  // And they are in the sight of whoever stands at the open door.
  assert.ok(span(papers, 0).min >= opening.minX && span(papers, 0).max <= opening.maxX, 'the proof lies behind the frame, where it cannot be seen')
  assert.ok(shelf.top > opening.minY && shelf.top < opening.maxY)
})

// ---------------------------------------------------------------------------
// The lectern and the Book of Deeds
// ---------------------------------------------------------------------------

const lecternLayout = (buildAtriumLectern() as { layout: LecternLayout }).layout
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
/** A vertex in the reading surface's own terms: across it, down it, and above it. */
const onThePlane = ([x, y, z]: Point) => {
  const from = [x - lecternLayout.plane.centre[0], y - lecternLayout.plane.centre[1], z - lecternLayout.plane.centre[2]]
  return { across: x, along: dot(from, lecternLayout.plane.down), above: dot(from, lecternLayout.plane.up) }
}

test('the lectern is five nodes, and the Book one material within its triangles', () => {
  assert.deepEqual(nodesOf('atrium-lectern'), ['atrium-lectern', 'atrium-lectern__top', 'atrium-lectern__brass', 'atrium-lectern__led', 'atrium-lectern__book'])
  assert.ok(triangles('atrium-lectern__book') > 0 && triangles('atrium-lectern__book') <= 250, `${triangles('atrium-lectern__book')} triangles`)
  assert.ok(nodesOf('atrium-lectern').reduce((sum, name) => sum + triangles(name), 0) <= 1_170)
  assert.equal(kit.parts.find((part) => part.name === 'atrium-lectern__book')?.material, 'paper-aged')
  const desk = MUSEUM.rooms.flatMap((room) => room.devices ?? []).find((device) => device.id === 'atrium-lectern')
  assert.ok(desk?.kind === 'signing-desk' && desk.part === 'atrium-lectern')
})

test('the Book lies flat on the reading surface, its foot against the brass rule', () => {
  const { rest, book } = lecternLayout
  // The reading surface is where the layout says: the top of the baked wedge.
  const surface = bakedVertices('atrium-lectern__top').map(onThePlane)
  near(Math.max(...surface.map((vertex) => vertex.above)), 0, 'the reading surface, against the plane of the layout')
  // The Book: nothing of it under the surface, its boards on it, its pages a
  // little over two centimetres thick at the most.
  const pages = bakedVertices('atrium-lectern__book').map(onThePlane)
  const above = pages.map((vertex) => vertex.above)
  near(Math.min(...above), 0, 'the underside of the Book')
  near(Math.max(...above), book.thickness, 'the swell of its pages')
  // Open to forty centimetres across and twenty-eight from head to foot, centred.
  const across = pages.map((vertex) => vertex.across)
  near(Math.min(...across), -book.width / 2, 'one fore-edge')
  near(Math.max(...across), book.width / 2, 'the other fore-edge')
  const along = pages.map((vertex) => vertex.along)
  near(Math.max(...along) - Math.min(...along), book.depth, 'from head to foot')
  // Its foot is against the rule's upper face: the two touch.
  near(Math.max(...along), rest.along, 'the foot of the Book, against the rule')
  // And the rule is there in the bake, standing proud of the surface, to
  // rest against: brass at that line, rising above the surface and under the
  // swell of the pages.
  const brass = bakedVertices('atrium-lectern__brass').map(onThePlane)
  const rule = brass.filter((vertex) => vertex.along > rest.along - TOUCH && vertex.above > -0.005)
  assert.ok(rule.length >= 8, 'the brass has no rule at the foot of the reading surface')
  near(Math.max(...rule.map((vertex) => vertex.above)), rest.proud, 'how far the rule stands above the surface')
  // The face of the rule the Book meets is flat between its two arrises.
  const face = rule.filter((vertex) => Math.abs(vertex.along - rest.along) <= TOUCH)
  assert.ok(face.length >= 4, 'the rule has no face where the Book rests')
  assert.ok(rest.proud > 0.01 && rest.proud < book.thickness, `the rule stands ${(rest.proud * 1000).toFixed(1)} mm proud: enough to stop a book, and under its pages`)
  // The rule is wider than the Book it stops.
  assert.ok(Math.min(...rule.map((vertex) => vertex.across)) < -book.width / 2 && Math.max(...rule.map((vertex) => vertex.across)) > book.width / 2)
  // The lamp is the reveal under the front of the deck: below the reading
  // surface, on the side the visitor stands, and clear of the Book.
  const lamp = bakedVertices('atrium-lectern__led').map(onThePlane)
  assert.ok(lamp.every((vertex) => vertex.above < -0.1), 'the lamp is not under the deck')
  assert.equal(triangles('atrium-lectern__led'), 12)
})

// ---------------------------------------------------------------------------
// The answering machine
// ---------------------------------------------------------------------------

const machineLayout = (buildAnsweringMachine() as { layout: MachineLayout }).layout

test('the answering machine stands on its datum, within its size and its triangles, with the lamp on top', () => {
  assert.deepEqual(nodesOf('office-answering-machine'), ['office-answering-machine', 'office-answering-machine__led', 'office-answering-machine__play'])
  const total = nodesOf('office-answering-machine').reduce((sum, name) => sum + triangles(name), 0)
  assert.ok(total <= 400, `${total} triangles`)
  const body = bakedVertices('office-answering-machine')
  near(span(body, 1).min, 0, 'the foot of the machine')
  near(span(body, 0).max - span(body, 0).min, machineLayout.width, 'its width')
  near(span(body, 2).max - span(body, 2).min, machineLayout.depth, 'its depth')
  assert.deepEqual([machineLayout.width, machineLayout.depth], [0.15, 0.21], 'the footprint the desk has room for')
  const all = nodesOf('office-answering-machine').flatMap(bakedVertices)
  assert.ok(span(all, 1).max <= 0.06, `it is ${(span(all, 1).max * 1000).toFixed(0)} mm high`)
  // The lamp is on the lid, where it shows from every side of the desk.
  const lamp = bakedVertices('office-answering-machine__led')
  assert.ok(span(lamp, 1).min >= span(body, 1).max - 0.012 && span(lamp, 1).max > 0.046, 'the lamp is not on top')
  // The keys run along the front edge (+Z), which the placement turns to the door.
  const keys = bakedVertices('office-answering-machine__play')
  assert.ok(span(keys, 2).min > machineLayout.front - 0.04, 'the keys are not at the front')
  assert.ok(span(keys, 0).max - span(keys, 0).min > 0.1, 'the keys do not run across the machine')
  const device = MUSEUM.rooms.flatMap((room) => room.devices ?? []).find((entry) => entry.id === 'office-answering-machine')
  assert.ok(device?.kind === 'voice' && device.messageLamp === true, 'the content lights the lamp the bake drew')
})

// ---------------------------------------------------------------------------
// The cut the safe is opened by
// ---------------------------------------------------------------------------

type Cut = {
  index: unknown
  attributes: Record<string, { count: number; itemSize: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number }>
}

test('a face is taken out of a box whole and alone, and a plane that misses or takes more is refused', () => {
  // The safe's front is the carcass's own face left out (`withoutFlatFace`),
  // and a frame built round the hole. The helper takes triangles by where
  // they lie, so it is held to taking the flat of one face and no arris: a
  // plane a hair off would bake a solid safe behind an open door, and one
  // that took a bevel with it a safe with a slit down its corner.
  const [width, height, depth] = [0.6, 1.2, 0.5]
  const box = bevelledBox(width, height, depth, 0.01, 1) as Cut
  const count = (geometry: Cut) => geometry.attributes.position.count / 3
  const onPlane = (geometry: Cut, z: number) => {
    const position = geometry.attributes.position
    let flat = 0
    for (let triangle = 0; triangle < count(geometry); triangle += 1) {
      if ([0, 1, 2].every((corner) => Math.abs(position.getZ(triangle * 3 + corner) - z) < 1e-6)) flat += 1
    }
    return flat
  }
  const bounds = (geometry: Cut) => {
    const position = geometry.attributes.position
    const points: Point[] = []
    for (let index = 0; index < position.count; index += 1) points.push([position.getX(index), position.getY(index), position.getZ(index)])
    return ([0, 1, 2] as const).map((axis) => [span(points, axis).min, span(points, axis).max].map((value) => Number(value.toFixed(6))))
  }
  const before = count(box)
  assert.equal(onPlane(box, depth / 2), 2, 'the flat of a face is two triangles, apart from its bevels')

  const open = withoutFlatFace(box, 'z', depth / 2) as Cut
  assert.equal(count(open), before - 2, 'two triangles were taken')
  assert.equal(onPlane(open, depth / 2), 0, 'and none is left lying on the plane')
  assert.equal(onPlane(open, -depth / 2), 2, 'the face opposite is whole')
  assert.deepEqual(bounds(open), bounds(box), 'every arris is where it was: the box is no smaller')
  assert.equal(open.index, null)
  // What is kept keeps its normals and its texture coordinates, corner for corner.
  for (const [name, attribute] of Object.entries(box.attributes)) {
    assert.equal(open.attributes[name]?.count, attribute.count - 6, `${name} was not cut with the positions`)
    assert.equal(open.attributes[name]?.itemSize, attribute.itemSize)
  }
  // The box handed in is the caller's, and is not cut.
  assert.equal(count(box), before)
  assert.equal(onPlane(box, depth / 2), 2)

  // A plane that misses takes nothing, and that is an error, not an open box.
  assert.throws(() => withoutFlatFace(box, 'z', depth / 2 - 0.004), /0 triangle\(s\) lie on z = 0\.246, and 2 were meant/)
  // One that is asked for more than a face has is refused the same way.
  assert.throws(() => withoutFlatFace(box, 'z', depth / 2, { expected: 4 }), /2 triangle\(s\) lie on z = 0\.25, and 4 were meant/)
  assert.throws(() => withoutFlatFace(box, 'w', 0), /unknown axis "w"/)
  // A looser tolerance is the caller's to ask for, and takes the bevel with the face: said, not hidden.
  assert.throws(() => withoutFlatFace(box, 'z', depth / 2, { epsilon: 0.02 }), /triangle\(s\) lie on z = 0\.25, and 2 were meant/)

  // What a face left in looks like to the check below: the two triangles of
  // the flat cover the middle of the box, and cut out they cover nothing.
  // (No vertex of that face stands inside the opening, so a check by
  // vertices sees an open safe either way.)
  const cornersOf = (geometry: Cut): Point[][] => {
    const position = geometry.attributes.position
    const found: Point[][] = []
    for (let triangle = 0; triangle < count(geometry); triangle += 1) {
      found.push([0, 1, 2].map((corner) => [position.getX(triangle * 3 + corner), position.getY(triangle * 3 + corner), position.getZ(triangle * 3 + corner)]))
    }
    return found
  }
  const closes = (triangles: readonly Point[][], z: number, point: readonly number[]) => triangles.filter(flatAt(z)).some((triangle) => covers(point, triangle))
  assert.equal(closes(cornersOf(box), depth / 2, [0, 0]), true, 'a whole box is shut at the middle of its face')
  assert.equal(closes(cornersOf(open), depth / 2, [0, 0]), false, 'and the cut one is open there')

  // The safe in the kit file is cut by it. On the plane of its front, no
  // triangle of the carcass covers any point of the opening; and the frame
  // round the opening is there, so the check is looking at the right plane.
  const carcass = bakedTriangles('office-safe')
  const { opening, front } = safeLayout
  const shut: string[] = []
  for (let column = 1; column < 8; column += 1) {
    for (let row = 1; row < 8; row += 1) {
      const point = [opening.minX + ((opening.maxX - opening.minX) * column) / 8, opening.minY + ((opening.maxY - opening.minY) * row) / 8]
      if (closes(carcass, front, point)) shut.push(point.map((value) => value.toFixed(3)).join(', '))
    }
  }
  assert.deepEqual(shut, [], 'a face of the carcass still closes the opening')
  const outer = span(carcass.flat(), 0)
  const middle = (opening.minY + opening.maxY) / 2
  assert.equal(closes(carcass, front, [(opening.maxX + outer.max) / 2, middle]), true, 'no frame beside the opening, on the plane of the front')
  assert.equal(closes(carcass, front, [(opening.minX + outer.min) / 2, middle]), true, 'no frame on the hinge side of the opening')
})

console.log(`\n${passed}/${passed + failed} kit layout checks passed.\n`)
if (failed > 0) process.exitCode = 1
