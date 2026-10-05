/**
 * Headless proof that the curator's desk is a working surface.
 *
 *   npm run test:desk-top
 *
 * Desk-top items rest on their support and do not interpenetrate. Written
 * after the audit found three of them wrong at once, all invisible from a
 * distance and obvious at the reading point: the lamp's foot and the ledger
 * stack were placed on the walnut (0.74) and so sank 7 mm into the leather,
 * and the ledgers stood straight through the telephone — half its vertices
 * inside the books.
 *
 * Every object standing on the desk is found from the content, whatever kind
 * of placement it is (kit, container, device or power control), and the
 * desk's own built-in objects come from the generator's recorded layout. Each
 * must lie wholly on the blotter (and stand on its top) or wholly off it on
 * the walnut (and stand on that), or declare what else it rests on; and no
 * two may share any floor space.
 */

import assert from 'node:assert/strict'

import { BAKED_BUNDLES } from '../src/content/bake.generated.ts'
import { MUSEUM } from '../src/content/museum.ts'
import { buildCuratorDesk, buildLedgerStack, buildOfficeChair } from './bake/parts/office.mjs'
import {
  corners,
  footprintFromBounds,
  footprintGap,
  footprintInside,
  footprintsOverlap,
  placeFootprint,
  type Footprint,
} from './lib/footprint.ts'

let passed = 0
function test(name: string, run: () => void) {
  run()
  passed += 1
  console.log(`  pass  ${name}`)
}

/** How far an object may stand off (or into) its support: under a millimetre. */
const REST_TOLERANCE = 0.0005
/** Neighbours keep at least this much air between their footprints. */
const CLEARANCE = 0.002

type Bounds = { min: readonly number[]; max: readonly number[] }

const kit = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit')
assert.ok(kit, 'the baked kit bundle exists')
const parts = kit.parts as readonly { name: string; bounds: Bounds }[]

function recipeBounds(recipe: string): Bounds {
  const members = parts.filter((part) => part.name === recipe || part.name.startsWith(`${recipe}__`))
  assert.ok(members.length > 0, `recipe "${recipe}" is baked`)
  return {
    min: [0, 1, 2].map((axis) => Math.min(...members.map((part) => part.bounds.min[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...members.map((part) => part.bounds.max[axis]))),
  }
}

function nodeBounds(name: string): Bounds {
  const node = parts.find((part) => part.name === name)
  assert.ok(node, `node "${name}" is baked`)
  return node.bounds
}

const office = MUSEUM.rooms.find((room) => room.id === 'office')
assert.ok(office, 'the office exists')
const deskPlacement = office.kit.find((placement) => placement.part === 'curator-desk')
assert.ok(deskPlacement, 'the office has its desk')
const deskTransform = {
  position: [deskPlacement.position[0], deskPlacement.position[2]] as [number, number],
  rotation: deskPlacement.rotationY ?? 0,
}
const layout = buildCuratorDesk().layout as {
  top: number
  blotter: { centre: [number, number]; halfSize: [number, number]; top: number }
  items: {
    id: string
    centre: [number, number]
    halfSize: [number, number]
    rotation: number
    bottom: number
    top: number
    restsOn?: string
  }[]
  pad: {
    halfSize: [number, number]
    cornerLeg: number
    cornerHeight: number
    sheets: { centre: [number, number]; halfSize: [number, number]; rotation: number }[]
  }
}

const deskTop = placeFootprint(footprintFromBounds('desk-top', nodeBounds('curator-desk')), deskTransform)
const blotter = placeFootprint(
  { id: 'blotter', centre: layout.blotter.centre, halfSize: layout.blotter.halfSize, rotation: 0 },
  deskTransform,
)

type DeskItem = { footprint: Footprint; bottom: number; top: number; restsOn?: string }

/** A placement of any kind, carried onto the desk by its recipe's bounds. */
function placedItem(
  id: string,
  part: string,
  position: readonly number[],
  rotationY = 0,
): DeskItem {
  const bounds = recipeBounds(part)
  return {
    footprint: placeFootprint(footprintFromBounds(id, bounds), {
      position: [position[0], position[2]],
      rotation: rotationY,
    }),
    bottom: position[1] + bounds.min[1],
    top: position[1] + bounds.max[1],
  }
}

function deskTopItems(): DeskItem[] {
  const placements = [
    ...office!.kit.map((entry) => ({ id: `kit:${entry.part}`, ...entry })),
    ...(office!.containers ?? []).map((entry) => ({ ...entry, id: `container:${entry.id}` })),
    ...(office!.devices ?? []).map((entry) => ({ ...entry, id: `device:${entry.id}` })),
    ...(office!.powerControl ? [{ ...office!.powerControl, id: `power:${office!.powerControl.id}` }] : []),
  ]
  const onDesk = placements.filter(
    (entry) =>
      entry.part !== 'curator-desk' &&
      Math.abs(entry.position[1] - layout.top) < 0.05 &&
      footprintInside(
        { id: entry.id, centre: [entry.position[0], entry.position[2]], halfSize: [0, 0], rotation: 0 },
        deskTop,
      ),
  )
  const builtIn = layout.items.map((item) => ({
    footprint: placeFootprint(
      { id: `desk:${item.id}`, centre: item.centre, halfSize: item.halfSize, rotation: item.rotation },
      deskTransform,
    ),
    bottom: item.bottom,
    top: item.top,
    ...(item.restsOn ? { restsOn: `desk:${item.restsOn}` } : {}),
  }))
  return [
    ...onDesk.map((entry) => placedItem(entry.id, entry.part, entry.position, entry.rotationY ?? 0)),
    ...builtIn,
  ]
}

/** What an item stands on, or why it cannot be standing at all. */
function supportOf(item: DeskItem, items: readonly DeskItem[]): { height: number } | { problem: string } {
  if (item.restsOn) {
    const under = items.find((candidate) => candidate.footprint.id === item.restsOn)
    if (!under) return { problem: `rests on "${item.restsOn}", which is not on the desk` }
    if (!footprintsOverlap(item.footprint, under.footprint)) {
      return { problem: `does not overlap "${item.restsOn}", which it claims to rest on` }
    }
    return { height: under.top }
  }
  if (footprintInside(item.footprint, blotter)) return { height: layout.blotter.top }
  if (!footprintsOverlap(item.footprint, blotter) && footprintInside(item.footprint, deskTop)) {
    return { height: layout.top }
  }
  if (!footprintInside(item.footprint, deskTop)) return { problem: 'overhangs the desk' }
  return { problem: 'straddles the edge of the blotter, half on leather and half on walnut' }
}

function restProblems(items: readonly DeskItem[]) {
  const problems: string[] = []
  for (const item of items) {
    const support = supportOf(item, items)
    if ('problem' in support) {
      problems.push(`${item.footprint.id} ${support.problem}`)
      continue
    }
    const offset = item.bottom - support.height
    if (Math.abs(offset) > REST_TOLERANCE) {
      problems.push(
        `${item.footprint.id} ${offset < 0 ? 'sinks' : 'floats'} ${(Math.abs(offset) * 1000).toFixed(1)} mm ` +
          `${offset < 0 ? 'into' : 'over'} its support (bottom ${item.bottom.toFixed(4)}, support ${support.height.toFixed(4)})`,
      )
    }
  }
  return problems
}

function overlapProblems(items: readonly DeskItem[]) {
  const problems: string[] = []
  for (let a = 0; a < items.length; a += 1) {
    for (let b = a + 1; b < items.length; b += 1) {
      const first = items[a]
      const second = items[b]
      if (first.restsOn === second.footprint.id || second.restsOn === first.footprint.id) continue
      const gap = footprintGap(first.footprint, second.footprint)
      if (gap < CLEARANCE) {
        problems.push(
          `${first.footprint.id} and ${second.footprint.id} ${gap < 0 ? `overlap by ${(-gap * 1000).toFixed(1)} mm` : `are only ${(gap * 1000).toFixed(1)} mm apart`}`,
        )
      }
    }
  }
  return problems
}

console.log('Desk top:')

test('the footprint helpers turn, contain and separate like three does', () => {
  const box: Footprint = { id: 'box', centre: [0, 0], halfSize: [0.2, 0.05], rotation: 0 }
  const turned = placeFootprint(box, { position: [1, 2], rotation: Math.PI / 2 })
  // rotateY(PI/2) sends +X to -Z: the long side now runs along Z.
  const zs = corners(turned).map(([, z]) => z)
  assert.ok(Math.abs(Math.max(...zs) - Math.min(...zs) - 0.4) < 1e-9)
  assert.equal(footprintsOverlap(box, { ...box, id: 'beside', centre: [0.41, 0] }), false)
  assert.equal(footprintsOverlap(box, { ...box, id: 'into', centre: [0.39, 0] }), true)
  // A turned neighbour whose AABB overlaps but whose rectangle does not.
  const diagonal: Footprint = { id: 'diagonal', centre: [0.27, 0.12], halfSize: [0.05, 0.05], rotation: Math.PI / 4 }
  assert.equal(footprintsOverlap(box, diagonal), false)
  assert.ok(footprintInside({ ...box, halfSize: [0.1, 0.02] }, box))
  assert.ok(!footprintInside({ ...box, centre: [0.15, 0] }, box))
})

test('the generator layout matches the baked desk', () => {
  const timber = nodeBounds('curator-desk')
  const leather = nodeBounds('curator-desk__leather')
  assert.ok(Math.abs(timber.max[1] - layout.top) < 1e-4, `desk top ${timber.max[1]} vs layout ${layout.top}`)
  assert.ok(Math.abs(leather.min[1] - layout.top) < 1e-4, 'the leather inset is laid on the walnut')
  const [cx, cz] = layout.blotter.centre
  const [hx, hz] = layout.blotter.halfSize
  for (const [actual, expected] of [
    [leather.min[0], cx - hx],
    [leather.max[0], cx + hx],
    [leather.min[2], cz - hz],
    [leather.max[2], cz + hz],
  ]) {
    assert.ok(Math.abs(actual - expected) < 5e-4, `blotter edge ${actual} vs layout ${expected}`)
  }
  // The paper family holds exactly the pad and the sheets.
  const paper = nodeBounds('curator-desk__paper')
  const recorded = layout.items
    .filter((item) => item.id === 'blotting-pad' || item.id === 'loose-sheets')
    .flatMap((item) => corners({ id: item.id, centre: item.centre, halfSize: item.halfSize, rotation: item.rotation }))
  const xs = recorded.map(([x]) => x)
  const zs = recorded.map(([, z]) => z)
  for (const [actual, expected] of [
    [paper.min[0], Math.min(...xs)],
    [paper.max[0], Math.max(...xs)],
    [paper.min[2], Math.min(...zs)],
    [paper.max[2], Math.max(...zs)],
  ]) {
    assert.ok(Math.abs(actual - expected) < 1e-3, `paper bounds ${actual} vs recorded ${expected}`)
  }
})

const items = deskTopItems()

test('every object on the desk is found', () => {
  const ids = items.map((item) => item.footprint.id)
  for (const expected of [
    'kit:ledger-stack',
    // The telephone left the furniture in L3: it answers (a dead line), so
    // it is a device, on the same leather at the same height.
    'device:office-telephone',
    // The answering machine came with the Posse, on the strip of walnut the
    // radio's charger stands on.
    'device:office-answering-machine',
    'container:office-notebook',
    'device:office-radio',
    'power:office-lamp-switch',
    'desk:blotting-pad',
    'desk:loose-sheets',
    'desk:card-file',
    'desk:inkstand',
    'desk:letter-opener',
  ]) {
    assert.ok(ids.includes(expected), `${expected} is on the desk (found ${ids.join(', ')})`)
  }
})

test('desk-top items rest on their support', () => {
  const problems = restProblems(items)
  assert.deepEqual(problems, [], problems.join('\n'))
})

test('desk-top items do not interpenetrate', () => {
  const problems = overlapProblems(items)
  assert.deepEqual(problems, [], problems.join('\n'))
})

test('the answering machine stands on the walnut beside the radio, clear of the leather, of the edge and of its neighbours (L3)', () => {
  const find = (id: string) => {
    const item = items.find((candidate) => candidate.footprint.id === id)
    assert.ok(item, `${id} is on the desk`)
    return item
  }
  const machine = find('device:office-answering-machine')
  // Wholly off the blotter and wholly on the desk: it stands on the timber's own height.
  assert.ok(!footprintsOverlap(machine.footprint, blotter) && footprintInside(machine.footprint, deskTop))
  assert.ok(Math.abs(machine.bottom - layout.top) < REST_TOLERANCE, `bottom at ${machine.bottom}`)
  assert.ok(machine.top - machine.bottom <= 0.06, `it is ${((machine.top - machine.bottom) * 1000).toFixed(0)} mm high`)
  // The strip is 170 mm of walnut between the leather and the desk's edge,
  // and the machine is 150 mm across it: twelve millimetres from the leather
  // and eight from the edge, as the lot plan drew it.
  const reach = (footprint: Footprint, axis: 0 | 1) => corners(footprint).map((corner) => corner[axis])
  const toLeather = footprintGap(machine.footprint, blotter)
  const toEdge = Math.max(...reach(deskTop, 1)) - Math.max(...reach(machine.footprint, 1))
  assert.ok(Math.abs(toLeather - 0.012) < 0.0005, `${(toLeather * 1000).toFixed(1)} mm from the blotter`)
  assert.ok(Math.abs(toEdge - 0.008) < 0.0005, `${(toEdge * 1000).toFixed(1)} mm from the edge of the desk`)
  // A hand's width from the radio's charger, further along the same strip,
  // and well clear of the telephone on the leather.
  assert.ok(footprintGap(machine.footprint, find('device:office-radio').footprint) > 0.1)
  assert.ok(footprintGap(machine.footprint, find('device:office-telephone').footprint) > 0.05)
  // Its long side runs along the strip, and its keys face whoever walks in:
  // the front of the recipe (+Z) is turned to the door's side of the room.
  const placed = (office.devices ?? []).find((device) => device.id === 'office-answering-machine')
  assert.equal(placed?.rotationY, -Math.PI / 2)
  const along = Math.max(...reach(machine.footprint, 0)) - Math.min(...reach(machine.footprint, 0))
  const across = Math.max(...reach(machine.footprint, 1)) - Math.min(...reach(machine.footprint, 1))
  assert.ok(Math.abs(along - 0.21) < 0.001 && Math.abs(across - 0.15) < 0.001, `${along.toFixed(3)} by ${across.toFixed(3)}`)

  // The rules bite. At the place the plan kept in reserve (on the leather,
  // between the notebook and the telephone) but at the walnut's height, it
  // sinks; and a centimetre and a half nearer the leather it straddles its edge.
  const reserve = placedItem('device:machine (on the leather)', 'office-answering-machine', [0.42, layout.top, 0.07], -Math.PI / 2)
  assert.ok(restProblems([reserve]).some((problem) => problem.includes('sinks 7.0 mm')), restProblems([reserve]).join('; '))
  const astride = placedItem('device:machine (astride)', 'office-answering-machine', [0.615, layout.top, 0.627], -Math.PI / 2)
  assert.ok(restProblems([astride]).some((problem) => problem.includes('straddles the edge of the blotter')), restProblems([astride]).join('; '))
  const crowding = placedItem('device:machine (against the radio)', 'office-answering-machine', [0.502, layout.top, 0.642], -Math.PI / 2)
  assert.ok(
    overlapProblems([crowding, find('device:office-radio')]).some((problem) => problem.includes('are only')),
    'a machine a millimetre from the charger is reported',
  )
})

test('the rules catch the old ledger stack: sunk into the leather and through the telephone', () => {
  const old = placedItem('kit:ledger-stack (old)', 'ledger-stack', [0.48, 0.74, 0.18], -1.67)
  const withOld = [...items.filter((item) => item.footprint.id !== 'kit:ledger-stack'), old]
  assert.ok(
    restProblems(withOld).some((problem) => problem.startsWith('kit:ledger-stack (old) sinks 7.0 mm')),
    'the 7 mm sink is reported',
  )
  assert.ok(
    overlapProblems(withOld).some(
      (problem) => problem.includes('device:office-telephone') && problem.includes('kit:ledger-stack (old)'),
    ),
    'the ledgers standing in the telephone are reported',
  )
  const oldLamp = placedItem('power:lamp (old)', 'desk-lamp', [0.46, 0.74, -0.62], -Math.PI / 2)
  assert.ok(
    restProblems([oldLamp]).some((problem) => problem.startsWith('power:lamp (old) sinks 7.0 mm')),
    'the lamp at the walnut height is reported',
  )
})

test('the ledgers wear brass corners proud of their boards, and paper in signatures', () => {
  const covers = nodeBounds('ledger-stack')
  const brass = nodeBounds('ledger-stack__brass')
  const pages = nodeBounds('ledger-stack__pages')
  // The corners wrap the fore-edge of each upper board, so they reach past
  // the leather on that side and stand on the top board of the stack.
  assert.ok(brass.max[0] > covers.max[0], `brass ${brass.max[0]} against leather ${covers.max[0]}`)
  assert.ok(brass.max[1] > covers.max[1], 'the corners rise above the top board')
  // The cover label lies on the top board, just clear of the leather.
  assert.ok(pages.max[1] > covers.max[1] && pages.max[1] - covers.max[1] < 0.001, `label at ${pages.max[1]}`)

  // Each text block is three signatures out of true with each other: the
  // bottom volume's fore-edge stands in three planes, where one bevelled
  // brick of paper had one.
  type Attribute = { count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number }
  const { pages: block } = buildLedgerStack() as unknown as { pages: { attributes: Record<string, Attribute> } }
  const { position, normal } = block.attributes
  const planes = new Set<string>()
  for (let index = 0; index < position.count; index += 1) {
    if (normal.getX(index) < 0.99 || position.getX(index) < 0 || position.getY(index) > 0.046) continue
    const offset =
      normal.getX(index) * position.getX(index) +
      normal.getY(index) * position.getY(index) +
      normal.getZ(index) * position.getZ(index)
    planes.add(offset.toFixed(4))
  }
  assert.equal(planes.size, 3, `fore-edge planes ${[...planes]}`)
})

test('the blotting pad shows its corners, and its loose sheets lie apart', () => {
  // The corners are not the inset's leather, which they vanished into: the
  // leather family stays one flat plane, and the corners stand over the paper.
  const leather = nodeBounds('curator-desk__leather')
  assert.ok(leather.max[1] <= layout.blotter.top + 1e-4, `leather rises to ${leather.max[1]}`)
  const pad = layout.items.find((item) => item.id === 'blotting-pad')
  assert.ok(pad && pad.top - pad.bottom >= layout.pad.cornerHeight - 1e-6, 'the corners stand over the paper')
  assert.ok(layout.pad.cornerHeight >= 0.0035 - 1e-6)

  const { halfSize: [halfWidth, halfDepth], cornerLeg, sheets } = layout.pad
  for (const [index, sheet] of sheets.entries()) {
    for (const [x, z] of corners({ id: `sheet ${index}`, ...sheet })) {
      assert.ok(Math.abs(x) < halfWidth && Math.abs(z) < halfDepth, `sheet ${index} stays on the pad`)
      // Outside every corner cap's triangle, with two millimetres of air.
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const fromEdges = halfWidth - sx * x + (halfDepth - sz * z)
        assert.ok(fromEdges > cornerLeg + 0.002, `sheet ${index} slides under the ${sx},${sz} corner cap`)
      }
    }
  }
  // Squared up, white on white, four sheets read as one.
  for (let a = 0; a < sheets.length; a += 1) {
    for (let b = a + 1; b < sheets.length; b += 1) {
      const turn = Math.abs(sheets[a].rotation - sheets[b].rotation)
      const slide = Math.hypot(
        sheets[a].centre[0] - sheets[b].centre[0],
        sheets[a].centre[1] - sheets[b].centre[1],
      )
      assert.ok(turn >= 0.02 && slide >= 0.005, `sheets ${a} and ${b} lie too true (${turn.toFixed(3)} rad, ${slide.toFixed(4)} m)`)
    }
  }
})

test('the curator chair\'s tufting is the outermost layer of its back', () => {
  type Back = { slabFront: number; faceEdge: number; faceLowest: number; buttonTops: number[]; boxingFront: number }
  const { back } = (buildOfficeChair() as unknown as { layout: { back: Back } }).layout
  // Every pit bottom in front of the slab behind it: with the slab flush
  // under the face, six of the eight buttons and their dimples sank into it.
  assert.ok(back.faceLowest > back.slabFront + 0.0005, `deepest dimple ${back.faceLowest} against slab ${back.slabFront}`)
  assert.equal(back.buttonTops.length, 8)
  for (const [index, top] of back.buttonTops.entries()) {
    assert.ok(top > back.slabFront + 0.002, `button ${index} shows: top ${top.toFixed(4)}, slab ${back.slabFront}`)
  }
  // And the boxing closes the step between the slab and the face's edge.
  assert.ok(back.boxingFront >= back.faceEdge, 'no open seam round the face')
})

console.log(`${passed} desk-top checks passed`)
