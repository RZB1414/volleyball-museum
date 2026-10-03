/**
 * Headless proof that the office bookcases hold real books, laid out the way
 * books stand.
 *
 *   npm run test:bookshelf
 *
 * The shelves are the background of the game's first picture, and the old
 * ones failed in ways nobody sees in a log: every "leaning" book was turned
 * about its centre, so one corner sank 1.5 mm into the shelf while the other
 * floated, touching nothing; every pair of spines stood exactly 13 mm apart,
 * a fence with dark slots; the top row held the tallest books; one sheet of
 * leather ran across neighbouring spines; and all four cases were the same
 * case. Every item the generator places is recorded in its `layout`, and this
 * holds each to the case: inside it, resting on what it stands on, touching
 * what it leans on, and clear of its neighbours (separating axes on the
 * front-view outline, since the lean is a turn about Z).
 */

import assert from 'node:assert/strict'

import { BAKED_BUNDLES } from '../src/content/bake.generated.ts'
import { MUSEUM } from '../src/content/museum.ts'
import { BOOKSHELF_INTERIOR, buildBookshelf } from './bake/parts/bookshelf.mjs'
import { triangleCount } from './bake/lib/geometry.mjs'
import { corners, footprintGap, type Footprint } from './lib/footprint.ts'

let passed = 0
function test(name: string, run: () => void) {
  run()
  passed += 1
  console.log(`  pass  ${name}`)
}

/** How far an item may stand off (or into) its support. */
const REST_TOLERANCE = 0.0005
/** Lying books and stacked boxes keep half a millimetre of air. */
const AIR = 0.0005
/** Neighbours may touch (a lean rests on its support) but never overlap. */
const OVERLAP_TOLERANCE = 0.0001
/** Books stop a centimetre under the shelf above, or they cannot come out. */
const HEADROOM = 0.01

type Item = {
  id: string
  kind: 'upright' | 'lean' | 'lying' | 'bookend' | 'box'
  row: number
  family?: string
  centre: [number, number]
  halfSize: [number, number]
  rotation: number
  front: number
  back: number
  crown?: number
  leansOn?: string
  restsOn?: string
}
type Shelf = ReturnType<typeof buildBookshelf> & {
  layout: { variant: string; items: Item[] }
}

const VARIANTS = ['a', 'b'] as const
const shelves = Object.fromEntries(VARIANTS.map((variant) => [variant, buildBookshelf({ variant }) as Shelf])) as Record<
  (typeof VARIANTS)[number],
  Shelf
>
const recipeName = (variant: string) => (variant === 'a' ? 'bookshelf' : `bookshelf-${variant}`)
const FAMILY_PARTS = ['carcass', 'books', 'booksGreen', 'booksCalf', 'booksRed', 'pages', 'boxes', 'brass'] as const

const outline = (item: Item): Footprint => ({
  id: item.id,
  centre: item.centre,
  halfSize: item.halfSize,
  rotation: item.rotation,
})
const bottomOf = (item: Item) => Math.min(...corners(outline(item)).map(([, y]) => y))
const topOf = (item: Item) => Math.max(...corners(outline(item)).map(([, y]) => y))
const isBook = (item: Item) => item.kind === 'upright' || item.kind === 'lean' || item.kind === 'lying'

/** Every way an item fails to stand where it is. */
function restProblems(items: readonly Item[]) {
  const byId = new Map(items.map((item) => [item.id, item]))
  const problems: string[] = []
  for (const item of items) {
    const { floor } = BOOKSHELF_INTERIOR.rows[item.row]
    const support = item.restsOn && item.restsOn !== 'shelf' ? byId.get(item.restsOn) : undefined
    if (item.restsOn && item.restsOn !== 'shelf' && !support) problems.push(`${item.id} rests on a missing ${item.restsOn}`)
    const expected = support ? topOf(support) + AIR : floor
    const error = bottomOf(item) - expected
    if (Math.abs(error) > REST_TOLERANCE) {
      problems.push(
        `${item.id} ${error < 0 ? 'sinks' : 'floats'} ${(Math.abs(error) * 1000).toFixed(1)} mm ` +
          `${error < 0 ? 'into' : 'above'} ${support ? support.id : 'the shelf'}`,
      )
    }
  }
  return problems
}

/** Pairs that share space in a row's front view and in depth. */
function overlapProblems(items: readonly Item[]) {
  const problems: string[] = []
  for (let a = 0; a < items.length; a += 1) {
    for (let b = a + 1; b < items.length; b += 1) {
      const first = items[a]
      const second = items[b]
      if (first.row !== second.row) continue
      const depthApart = first.back >= second.front || second.back >= first.front
      if (depthApart) continue
      const gap = footprintGap(outline(first), outline(second))
      if (gap < -OVERLAP_TOLERANCE) {
        problems.push(`${first.id} and ${second.id} overlap by ${(-gap * 1000).toFixed(1)} mm`)
      }
    }
  }
  return problems
}

/**
 * Standing neighbours are 0.6-3 mm apart, as books are pushed together on a
 * working shelf. The few wider spaces are deliberate (a volume out, room
 * before a stack) and never the old regular slot between every pair.
 */
function packingProblems(items: readonly Item[]) {
  const gaps: number[] = []
  for (let row = 0; row < BOOKSHELF_INTERIOR.rows.length; row += 1) {
    const uprights = items
      .filter((item) => item.row === row && item.kind === 'upright')
      .sort((left, right) => left.centre[0] - right.centre[0])
    for (let index = 1; index < uprights.length; index += 1) {
      const left = uprights[index - 1]
      const right = uprights[index]
      gaps.push(right.centre[0] - right.halfSize[0] - (left.centre[0] + left.halfSize[0]))
    }
  }
  const problems: string[] = []
  const tight = gaps.filter((gap) => gap >= 0.0005 && gap <= 0.0031)
  if (tight.length / gaps.length < 0.85) problems.push(`only ${tight.length} of ${gaps.length} neighbours within 0.5-3.1 mm`)
  const odd = gaps.filter((gap) => gap < 0.0005 || (gap > 0.0031 && gap < 0.01))
  if (odd.length > 0) problems.push(`gaps that are neither tight nor deliberate: ${odd.map((gap) => gap.toFixed(4)).join(' ')}`)
  return problems
}

console.log('Bookcases:')

test('every bookcase recipe is baked from this generator and fits the prop budget', () => {
  const kit = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit')
  assert.ok(kit, 'the baked kit bundle exists')
  for (const variant of VARIANTS) {
    const name = recipeName(variant)
    let total = 0
    for (const part of FAMILY_PARTS) {
      const node = kit.parts.find((entry) => entry.name === (part === 'carcass' ? name : `${name}__${part}`))
      assert.ok(node, `${name} has its ${part} family`)
      const fresh = triangleCount(shelves[variant][part])
      // A stale bake would ship an older arrangement than the one tested.
      assert.equal(node.triangles, fresh, `${node.name}: baked ${node.triangles}, generator ${fresh}`)
      total += fresh
    }
    assert.ok(total <= 2500, `${name}: ${total} triangles`)
  }
})

test('the east wall reads A, B, A and the north case is a B: no two neighbours repeat', () => {
  const office = MUSEUM.rooms.find((room) => room.id === 'office')
  assert.ok(office)
  const cases = office.kit.filter((placement) => placement.part.startsWith('bookshelf'))
  assert.equal(cases.length, 4)
  const east = cases
    .filter((placement) => placement.position[0] > 2)
    .sort((left, right) => left.position[2] - right.position[2])
    .map((placement) => placement.part)
  assert.deepEqual(east, ['bookshelf', 'bookshelf-b', 'bookshelf'])
  const north = cases.find((placement) => placement.position[0] < 2)
  assert.equal(north?.part, 'bookshelf-b')
})

for (const variant of VARIANTS) {
  const { items } = shelves[variant].layout

  test(`${variant}: everything stands inside the case, under the shelf above`, () => {
    const problems: string[] = []
    for (const item of items) {
      const { ceiling } = BOOKSHELF_INTERIOR.rows[item.row]
      const xs = corners(outline(item)).map(([x]) => x)
      if (Math.min(...xs) < BOOKSHELF_INTERIOR.left - 1e-4) problems.push(`${item.id} into the left side`)
      if (Math.max(...xs) > BOOKSHELF_INTERIOR.right + 1e-4) problems.push(`${item.id} into the right side`)
      if (item.front > BOOKSHELF_INTERIOR.front) problems.push(`${item.id} overhangs the shelf edge`)
      if (item.back < BOOKSHELF_INTERIOR.back) problems.push(`${item.id} into the back panel`)
      const crown = Math.max(topOf(item), item.crown ?? 0)
      if (crown > ceiling - HEADROOM) {
        problems.push(`${item.id} reaches ${((ceiling - crown) * 1000).toFixed(0)} mm under the shelf above`)
      }
    }
    assert.deepEqual(problems, [])
  })

  test(`${variant}: every book, box and bookend rests on the shelf or on what is under it`, () => {
    assert.deepEqual(restProblems(items), [])
  })

  test(`${variant}: nothing interpenetrates`, () => {
    assert.deepEqual(overlapProblems(items), [])
  })

  test(`${variant}: leaning books touch what they lean on, at a believable angle`, () => {
    const leans = items.filter((item) => item.kind === 'lean')
    assert.ok(leans.length >= 2, `${leans.length} leaning book(s)`)
    const byId = new Map(items.map((item) => [item.id, item]))
    for (const lean of leans) {
      const angle = Math.abs(lean.rotation)
      assert.ok(angle >= 0.08 && angle <= 0.3, `${lean.id} leans ${((angle * 180) / Math.PI).toFixed(1)}°`)
      if (lean.leansOn === 'case-side') {
        const reach = Math.max(...corners(outline(lean)).map(([x]) => x))
        assert.ok(Math.abs(reach - BOOKSHELF_INTERIOR.right) < REST_TOLERANCE, `${lean.id} misses the case side`)
      } else {
        const support = byId.get(lean.leansOn ?? '')
        assert.ok(support, `${lean.id} leans on ${lean.leansOn}`)
        const gap = footprintGap(outline(lean), outline(support))
        assert.ok(Math.abs(gap) < REST_TOLERANCE, `${lean.id} stands ${(gap * 1000).toFixed(2)} mm off ${support.id}`)
      }
    }
  })

  test(`${variant}: spines pack tight, not 13 mm apart like a fence`, () => {
    assert.deepEqual(packingProblems(items), [])
  })

  test(`${variant}: folios low, quartos in the middle, octavos at the top`, () => {
    const bands: [number, number][] = [
      [0.37, 0.44],
      [0.32, 0.41],
      [0.26, 0.34],
      [0.23, 0.3],
      [0.18, 0.25],
    ]
    const means: number[] = []
    for (const [row, [low, high]] of bands.entries()) {
      const heights = items
        .filter((item) => item.row === row && (item.kind === 'upright' || item.kind === 'lean'))
        .map((item) => item.halfSize[1] * 2)
      assert.ok(heights.length > 0, `row ${row} has standing books`)
      for (const height of heights) assert.ok(height >= low && height <= high, `row ${row}: a ${height.toFixed(3)} m book`)
      means.push(heights.reduce((sum, height) => sum + height, 0) / heights.length)
    }
    for (let row = 1; row < means.length; row += 1) {
      assert.ok(means[row] < means[row - 1], `row ${row} is not shorter than row ${row - 1}`)
    }
  })

  test(`${variant}: four bindings, mixed, with light calf among the dark`, () => {
    const books = items.filter(isBook)
    const share = (family: string) => books.filter((item) => item.family === family).length / books.length
    for (const family of ['brown', 'calf', 'green', 'cloth']) {
      assert.ok(share(family) >= 0.12, `${family} is ${(share(family) * 100).toFixed(0)}%`)
      assert.ok(share(family) <= 0.45, `${family} is ${(share(family) * 100).toFixed(0)}%`)
    }
    assert.ok(books.filter((item) => item.kind === 'lying').length >= 6, 'books lying in stacks')
    assert.ok(items.some((item) => item.kind === 'bookend'), 'a bookend')
  })

  test(`${variant}: neighbouring spines are cut from different hides`, () => {
    // Projected after the merge, the leather ran on from spine to spine and
    // a stain crossed three volumes. Each spine's V offset is its own.
    const tile = { brown: 0.08, calf: 0.08, green: 0.1, cloth: 0.06 } as Record<string, number>
    const part = { brown: 'books', calf: 'booksCalf', green: 'booksGreen', cloth: 'booksRed' } as Record<string, keyof Shelf>
    const offsetOf = (item: Item) => {
      const geometry = shelves[variant][part[item.family ?? '']] as unknown as {
        attributes: Record<string, { count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number }>
      }
      const { position, normal, uv } = geometry.attributes
      const x0 = item.centre[0] - item.halfSize[0]
      const x1 = item.centre[0] + item.halfSize[0]
      const values: number[] = []
      for (let index = 0; index < position.count; index += 1) {
        if (normal.getZ(index) < 0.999 || Math.abs(position.getZ(index) - item.front) > 5e-5) continue
        const x = position.getX(index)
        const y = position.getY(index)
        const outside =
          x < x0 - 1e-5 ||
          x > x1 + 1e-5 ||
          y < item.centre[1] - item.halfSize[1] - 1e-5 ||
          y > item.centre[1] + item.halfSize[1] + 1e-5
        if (outside) continue
        values.push((((uv.getY(index) - y / tile[item.family ?? '']) % 1) + 1) % 1)
      }
      assert.ok(values.length >= 4, `${item.id}: ${values.length} spine corners found`)
      // One offset across the whole spine (a wrap at 0/1 counts as one).
      assert.ok(
        values.every((value) => Math.min(Math.abs(value - values[0]), 1 - Math.abs(value - values[0])) < 1e-3),
        `${item.id}: spine offsets ${values.map((value) => value.toFixed(3))}`,
      )
      return values[0]
    }
    let compared = 0
    for (let row = 0; row < BOOKSHELF_INTERIOR.rows.length; row += 1) {
      const uprights = items
        .filter((item) => item.row === row && item.kind === 'upright')
        .sort((left, right) => left.centre[0] - right.centre[0])
      for (let index = 1; index < uprights.length; index += 1) {
        if (uprights[index].family !== uprights[index - 1].family) continue
        const difference = Math.abs(offsetOf(uprights[index]) - offsetOf(uprights[index - 1]))
        assert.ok(Math.min(difference, 1 - difference) > 0.05, `${uprights[index].id} shares its neighbour's leather`)
        compared += 1
      }
    }
    assert.ok(compared >= 10, `${compared} neighbouring pairs`)
  })
}

test('the two arrangements differ on every row', () => {
  for (let row = 0; row < BOOKSHELF_INTERIOR.rows.length; row += 1) {
    const sequence = (variant: (typeof VARIANTS)[number]) =>
      shelves[variant].layout.items
        .filter((item) => item.row === row)
        .sort((left, right) => left.centre[0] - right.centre[0])
        .map((item) => `${item.kind}:${item.family ?? ''}`)
        .join(' ')
    assert.notEqual(sequence('a'), sequence('b'), `row ${row} repeats`)
  }
  const boxRows = (variant: (typeof VARIANTS)[number]) =>
    [...new Set(shelves[variant].layout.items.filter((item) => item.kind === 'box').map((item) => item.row))].join()
  assert.notEqual(boxRows('a'), boxRows('b'), 'the archive boxes sit on the same rows')
})

test('the rules catch a book turned about its centre and a fence of 13 mm slots', () => {
  const { items } = shelves.a.layout
  const lean = items.find((item) => item.kind === 'lean' && item.leansOn !== 'case-side')
  assert.ok(lean)
  // The old "lean": 0.055 rad about the book's own centre, standing on the shelf.
  const { floor } = BOOKSHELF_INTERIOR.rows[lean.row]
  const old: Item = { ...lean, id: `${lean.id} (old)`, rotation: -0.055, centre: [lean.centre[0], floor + lean.halfSize[1]] }
  const problems = restProblems([...items.filter((item) => item.id !== lean.id), old])
  assert.ok(problems.some((problem) => problem.startsWith(`${old.id} sinks 1.`)), problems.join('; '))

  // The old fence: every spine 13 mm from the next.
  let cursor = BOOKSHELF_INTERIOR.left
  const fence: Item[] = Array.from({ length: 10 }, (_, index) => {
    const book: Item = { ...lean, id: `fence-${index}`, kind: 'upright', rotation: 0, centre: [cursor + 0.03, floor + 0.2], halfSize: [0.03, 0.2] }
    cursor += 0.06 + 0.013
    return book
  })
  assert.ok(packingProblems(fence).some((problem) => problem.startsWith('only 0 of 9')), packingProblems(fence).join('; '))

  // And a book pushed into its neighbour is reported.
  const upright = items.find((item) => item.kind === 'upright' && item.row === 2)
  assert.ok(upright)
  const shoved: Item = { ...upright, id: 'shoved', centre: [upright.centre[0] + upright.halfSize[0], upright.centre[1]] }
  assert.ok(overlapProblems([...items, shoved]).some((problem) => problem.includes('shoved')))
})

console.log(`${passed} bookcase checks passed`)
