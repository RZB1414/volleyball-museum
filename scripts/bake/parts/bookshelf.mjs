/**
 * The curator's bookcases: four cases, two arrangements of books.
 *
 * Three of the four stand side by side on the east wall, and they are the
 * back of the first picture of the game: from the spawn the torch finds them
 * at about 4.5 m, where a pixel is 6 mm. At that distance leather grain is
 * gone and a shelf reads by three things only: the VALUE of each spine
 * against its neighbours, its silhouette, and metal catching the light. So
 * the gilt (head and tail fillets, title bars) is what carries a binding from
 * across the room, a light calf against a dark morocco is what separates two
 * volumes, and the heights, the lean and the books lying flat are what make
 * the row a collection rather than a fence of identical boxes. At the reading
 * distance (1.4 m, 2 mm a pixel) the raised bands, the labels and the page
 * heads seen from above take over.
 *
 * Each case is instanced, one draw per material family for all of its
 * placements, so detail costs triangles and never draw calls. A second
 * arrangement (`variant: 'b'`) does cost a draw per family: it is what stops
 * the three cases on the east wall from repeating each other, which the eye
 * finds at once.
 *
 * Books are authored as LAYOUT DATA, row by row (`LAYOUTS` below), and laid
 * out by a small engine: tight varied gaps, sets that share one height, a
 * real lean about the bottom edge onto whatever the book rests against, and
 * stacks that rest on the shelf or on the book below. Everything it places is
 * recorded in `layout`, which `npm run test:bookshelf` holds to the case:
 * inside it, resting on its support, clear of its neighbours.
 */

import { CylinderGeometry, Matrix4 } from 'three'

import { bevelledBox, boxProjectUVs, finalize, flatPolygon, merge, sweepProfile } from '../lib/geometry.mjs'
import { mulberry32 } from '../lib/texture.mjs'

const WIDTH = 1.18
const DEPTH = 0.34
const HEIGHT = 2.72
const SIDE = 0.055
const SHELF = 0.038
const BACK = 0.022
const PLINTH = 0.09
const CAP = 0.075
const SHELF_LEVELS = [PLINTH, 0.6, 1.11, 1.62, 2.13]

/** The clear volume books stand in, in the recipe's frame (+Z out of the case). */
export const BOOKSHELF_INTERIOR = {
  left: -WIDTH / 2 + SIDE,
  right: WIDTH / 2 - SIDE,
  /** The shelf boards' front edge. */
  front: DEPTH / 2,
  /** The back panel's face. */
  back: -DEPTH / 2 + BACK,
  rows: SHELF_LEVELS.map((level, row) => ({
    floor: level + SHELF,
    ceiling: row < SHELF_LEVELS.length - 1 ? SHELF_LEVELS[row + 1] : HEIGHT - CAP,
  })),
}

/** Where ordinary spines stand: pushed home, 2 cm short of the shelf edge. */
const SPINE_LINE = 0.15
/** A book in use, pulled out to the edge and not pushed back. */
const PULLED_LINE = 0.166
/** Between lying books, as between the ledgers: any closer and boards z-fight. */
const AIR = 0.0005
/**
 * Quads laid over a spine. The positions are quantised to about 0.16 mm on a
 * 2.7 m part and the depth buffer resolves about 0.015 mm at 4.5 m, so 0.6 mm
 * survives both; a label's gilt sits one more step out.
 */
const LIFT = 0.0006
/**
 * The player's eye (`PlayerController`): a head above it is never seen, so it
 * gets no face. The head bob is a few centimetres; the first row that loses
 * its heads stands at 1.66 m, well clear of both.
 */
const EYE_HEIGHT = 1.62
/** A raised band: the cord a book is sewn on, under the leather. */
const BAND_RADIUS = 0.0022
/** Gilt narrower than this shimmers at 4.5 m even with MSAA. */
const FILLET = 0.005

/**
 * Material families, and the scale their maps are laid at. Calf and morocco
 * are fine-grained: at the 0.24 m a tile the shelves used to share, the tan
 * leather's pebble came out 9 mm across, which is a sofa, not a book. Book
 * cloth is a close weave; at 0.06 m it is a buckram, not a sack.
 */
const FAMILIES = {
  brown: { part: 'books', metresPerTile: 0.08 },
  calf: { part: 'booksCalf', metresPerTile: 0.08 },
  green: { part: 'booksGreen', metresPerTile: 0.1 },
  cloth: { part: 'booksRed', metresPerTile: 0.06 },
  /** Page heads at 0.02 m a tile: the paper's rules become page edges. */
  pages: { part: 'pages', metresPerTile: 0.02 },
}

/** Labels laid on a spine, at a scale where paper reads as a ruled card. */
const LABEL_TILE = { brown: 0.08, calf: 0.08, green: 0.1, cloth: 0.06, pages: 0.4 }

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/**
 * A quad facing +Z (a spine, a label, a fillet) spanning x0..x1, y0..y1 at
 * depth z, with UVs taken from its own position: (x, y) per tile, shifted by
 * the book's offset so no two volumes share a patch of hide.
 */
function frontQuad(x0, x1, y0, y1, z, tile, offset) {
  const corners = [
    [x0, y0, z],
    [x1, y0, z],
    [x1, y1, z],
    [x0, y1, z],
  ]
  return flatPolygon(
    corners,
    [0, 0, 1],
    corners.map(([x, y]) => [x / tile + offset[0], y / tile + offset[1]]),
  )
}

/** A quad facing ±X at x, spanning y and z; UVs (z, y). */
function sideQuad(x, sign, y0, y1, z0, z1, tile, offset) {
  const corners = [
    [x, y0, z0],
    [x, y0, z1],
    [x, y1, z1],
    [x, y1, z0],
  ]
  return flatPolygon(
    corners,
    [sign, 0, 0],
    corners.map(([, y, z]) => [z / tile + offset[0], y / tile + offset[1]]),
  )
}

/**
 * A quad facing ±Y at y. The paper's rules repeat in V, so `rulesAlongZ`
 * lays V across X and they run front to back: the page edges of an upright
 * book's head, whose leaves stand in YZ planes. A board needs nothing in
 * particular.
 */
function flatQuad(y, sign, x0, x1, z0, z1, tile, offset, { rulesAlongZ = false } = {}) {
  const corners = [
    [x0, y, z0],
    [x1, y, z0],
    [x1, y, z1],
    [x0, y, z1],
  ]
  return flatPolygon(
    corners,
    [0, sign, 0],
    corners.map(([x, , z]) =>
      rulesAlongZ
        ? [z / tile + offset[0], x / tile + offset[1]]
        : [x / tile + offset[0], z / tile + offset[1]],
    ),
  )
}

/**
 * A raised band across a spine: half a cylinder, two segments, four
 * triangles. As a silhouette it is a 2 mm roof nobody resolves; its smooth
 * normals (up, out, down) are what draw a cord under the leather, catching
 * the light on its upper side and dropping it on the lower.
 */
function raisedBand(x0, x1, y, z, tile, offset) {
  const band = new CylinderGeometry(BAND_RADIUS, BAND_RADIUS, x1 - x0, 2, 1, true, -Math.PI / 2, Math.PI)
  band.rotateZ(Math.PI / 2)
  band.translate((x0 + x1) / 2, y, z)
  const projected = boxProjectUVs(band, tile)
  const uv = projected.attributes.uv
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, uv.getX(index) + offset[0], uv.getY(index) + offset[1])
  }
  return projected
}

/**
 * A low-discrepancy UV offset per book (the R2 sequence). Box-projected after
 * the merge, neighbouring spines shared one sheet of leather: a patina stain
 * ran straight across three volumes.
 */
function uvOffset(index) {
  return [(0.5 + index * 0.7548776662) % 1, (0.5 + index * 0.5698402910) % 1]
}

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

/**
 * The faces and spine work of one upright book, in its own frame: x from 0
 * to w (left board to right board), y from 0 to h, the spine at z = 0 and
 * the fore-edge at z = -d.
 *
 * Only the faces anyone can see. The fore-edge faces the back panel and the
 * tail stands on the shelf; a head above the eye is never seen from below.
 * That is 6 to 8 triangles a book instead of 12, which across a case pays
 * for most of its gilt.
 */
function uprightPieces(book, offset) {
  const { w, h, d, family, style } = book
  const tile = FAMILIES[family].metresPerTile
  const pieces = []
  const add = (geometry, part) => pieces.push([geometry, part])

  add(frontQuad(0, w, 0, h, 0, tile, offset), family)
  add(sideQuad(0, -1, 0, h, -d, 0, tile, offset), family)
  add(sideQuad(w, 1, 0, h, -d, 0, tile, offset), family)
  if (book.showHead) {
    // The head shows the text block between the boards, unless the set was
    // gilt on top, which is what kept the dust off it.
    const head = book.head ?? 'pages'
    const headTile = head === 'pages' ? FAMILIES.pages.metresPerTile : tile
    add(flatQuad(h, 1, 0, w, -d, 0, headTile, offset, { rulesAlongZ: head === 'pages' }), head === 'gilt' ? 'brass' : head)
  }
  if (book.showTail) add(flatQuad(0, -1, 0, w, -d, 0, tile, offset), family)

  spineWork(pieces, { w, h, family, style, label: book.label, bands: book.bands, giltBands: book.giltBands, offset })
  if (book.slip) {
    // A paper slip left in the book, standing out of the head. Turned to the
    // room: slips between pages stand edge-on to a viewer in front, and this
    // one has been bent over by the volume beside it.
    const { across = 0.5, rise = 0.035 } = book.slip
    const turn = Math.SQRT1_2
    // As wide as fits between the boards once turned.
    const reach = Math.min(0.03, (w - 0.006) / turn) / 2
    const centreX = w * across
    const z0 = -d * 0.35
    const corners = [
      [centreX - reach * turn, h - 0.012, z0 - reach * turn],
      [centreX + reach * turn, h - 0.012, z0 + reach * turn],
      [centreX + reach * turn, h + rise, z0 + reach * turn],
      [centreX - reach * turn, h + rise, z0 - reach * turn],
    ]
    add(
      flatPolygon(
        corners,
        [-turn, 0, turn],
        corners.map(([, y, z]) => [z / LABEL_TILE.pages + offset[0], (y + 0.006) / LABEL_TILE.pages]),
      ),
      'pages',
    )
  }
  return pieces
}

/**
 * Gilt, labels and bands on a spine running from y = 0 to h across x = 0..w.
 *
 * - 'banded' (leather): raised bands with the panels between them, gilt
 *   fillets at head and tail, and a contrasting label in the second panel
 *   with a gilt title bar on it, the classic library binding;
 * - 'cloth': no bands (cloth bindings have none), double fillets at head
 *   and tail and the title stamped straight onto the cloth;
 * - 'plain': a thin volume or pamphlet, at most a paper label.
 */
function spineWork(pieces, { w, h, family, style, label, bands, giltBands, offset }) {
  const add = (geometry, part) => pieces.push([geometry, part])
  const inset = Math.min(0.002, w * 0.08)
  const fillet = (y) => add(frontQuad(inset, w - inset, y - FILLET / 2, y + FILLET / 2, LIFT, 1, [0, 0]), 'brass')

  if (style === 'banded') {
    const count = bands ?? (h > 0.36 ? 5 : h > 0.26 ? 4 : 3)
    const top = h * 0.9
    const bottom = h * 0.15
    const levels = Array.from({ length: count }, (_, index) => bottom + (index * (top - bottom)) / (count - 1))
    // A fine set has its bands tooled in gold: the same four triangles in
    // the brass family, and from across the room the set that glitters.
    for (const y of levels) add(raisedBand(0, w, y, 0, FAMILIES[family].metresPerTile, offset), giltBands ? 'brass' : family)
    fillet(h - 0.011)
    fillet(0.011)
    // The title goes in the second panel from the head.
    if (label && count >= 3) {
      const y0 = levels[count - 2] + BAND_RADIUS + 0.004
      const y1 = levels[count - 1] - BAND_RADIUS - 0.004
      titleLabel(add, { w, y0, y1, label, offset, gilt: label !== 'pages' })
    }
    return
  }

  if (style === 'cloth') {
    for (const y of [h - 0.01, h - 0.017, 0.017, 0.01]) fillet(y)
    if (label) {
      titleLabel(add, { w, y0: h * 0.72, y1: h * 0.84, label, offset, gilt: label !== 'pages' })
    } else {
      // Title and author stamped in gold straight onto the cloth.
      add(frontQuad(inset * 2, w - inset * 2, h * 0.78 - 0.005, h * 0.78 + 0.005, LIFT, 1, [0, 0]), 'brass')
      add(frontQuad(inset * 3, w - inset * 3, h * 0.7 - 0.0025, h * 0.7 + 0.0025, LIFT, 1, [0, 0]), 'brass')
    }
    return
  }

  if (label === 'pages') titleLabel(add, { w, y0: h * 0.62, y1: h * 0.78, label, offset, gilt: false })
}

/** A label of another leather (or paper) in a panel, and its gilt title. */
function titleLabel(add, { w, y0, y1, label, offset, gilt }) {
  if (label === 'pages') {
    // The institution's own paper label is a card pasted on, smaller than
    // the panel: filling it, five of them read as lit windows.
    const height = Math.min(y1 - y0, 0.034)
    const middle = (y0 + y1) / 2
    const inset = Math.min(0.006, w * 0.16)
    add(frontQuad(inset, w - inset, middle - height / 2, middle + height / 2, LIFT, LABEL_TILE.pages, [offset[1], offset[0]]), label)
    return
  }
  const inset = Math.min(0.003, w * 0.1)
  add(frontQuad(inset, w - inset, y0, y1, LIFT, LABEL_TILE[label], [offset[1], offset[0]]), label)
  if (!gilt) return
  const height = Math.min(0.01, (y1 - y0) - 0.008)
  if (height < FILLET) return
  const middle = (y0 + y1) / 2
  add(frontQuad(inset + 0.003, w - inset - 0.003, middle - height / 2, middle + height / 2, LIFT * 2, 1, [0, 0]), 'brass')
}

/**
 * A book lying flat, spine to the room: x from 0 to its length (head to
 * tail), y from 0 to its thickness, the spine at z = 0. Its ends show the
 * page block, its upper board is the binding.
 */
function lyingPieces(book, offset) {
  const { length, thickness, d, family } = book
  const tile = FAMILIES[family].metresPerTile
  const pages = FAMILIES.pages.metresPerTile
  const pieces = []
  const add = (geometry, part) => pieces.push([geometry, part])
  add(frontQuad(0, length, 0, thickness, 0, tile, offset), family)
  add(flatQuad(thickness, 1, 0, length, -d, 0, tile, offset), family)
  // The ends are page edges: pages lie in XZ planes, so the rules run along
  // Z and stack in Y, which is what a side projection (z, y) gives.
  add(sideQuad(0, -1, 0, thickness, -d, 0, pages, offset), 'pages')
  add(sideQuad(length, 1, 0, thickness, -d, 0, pages, offset), 'pages')
  // Fillets run across the spine, so on a book lying down they stand up.
  for (const x of [0.012, length - 0.012]) {
    add(frontQuad(x - FILLET / 2, x + FILLET / 2, 0.002, thickness - 0.002, LIFT, 1, [0, 0]), 'brass')
  }
  if (book.label) {
    const x0 = length * 0.66
    const x1 = Math.min(length * 0.84, x0 + 0.06)
    const y0 = Math.min(0.004, thickness * 0.15)
    add(frontQuad(x0, x1, y0, thickness - y0, LIFT, LABEL_TILE[book.label], [offset[1], offset[0]]), book.label)
    if (book.label !== 'pages' && thickness >= 0.03) {
      const middle = thickness / 2
      add(frontQuad(x0 + 0.005, x1 - 0.005, middle - 0.004, middle + 0.004, LIFT * 2, 1, [0, 0]), 'brass')
    }
  }
  return pieces
}

// ---------------------------------------------------------------------------
// The arrangements
// ---------------------------------------------------------------------------

/**
 * Row by row, left to right as the room sees the case.
 *
 * Heights follow how a working library is shelved: folios on the two low
 * rows (0.38-0.44 m), quartos in the middle (0.26-0.34), octavos and thin
 * volumes at the top (0.19-0.25). The old shelves had it backwards, with the
 * tallest and most numerous books on the top row.
 *
 * - `set`: `count` volumes of one binding and one height (`missing` leaves a
 *   volume's gap after that many);
 * - `lean`: one book leaning about its bottom edge, `toward: -1` onto the
 *   item before it, `toward: 1` against the case's right side;
 * - `stack`: books lying flat, largest first, each on the one below;
 * - `over`: books laid flat across the heads of the set just before, which
 *   must carry their whole length;
 * - `boxes` (`stacked` for one on another) / `bookend` / `gap`;
 * - `at: 'end'` puts a stack or boxes against the case's right side.
 *
 * `pulled` marks a book standing out at the shelf edge. Labels name the
 * label's family: red cloth on leather, green on red cloth, `pages` for the
 * institution's own paper-labelled minute books.
 */
const LAYOUTS = {
  a: [
    // Row 0: an atlas in green morocco, gilt on top, then odd folios and a
    // stack of three too tall to stand.
    [
      { set: 'green', count: 4, h: 0.428, w: 0.066, d: 0.29, style: 'banded', bands: 5, label: 'cloth', head: 'gilt', giltBands: true },
      { set: 'brown', h: 0.404, w: 0.08, d: 0.28, style: 'banded', label: 'cloth', slip: { across: 0.4 } },
      { set: 'calf', h: 0.39, w: 0.058, d: 0.27, style: 'banded', label: 'cloth', pulled: true },
      { set: 'cloth', h: 0.416, w: 0.07, d: 0.285, style: 'cloth' },
      { set: 'brown', h: 0.384, w: 0.052, d: 0.27, style: 'banded', bands: 4, label: 'green' },
      { set: 'calf', h: 0.398, w: 0.044, d: 0.27, style: 'banded', label: 'cloth' },
      {
        stack: [
          { family: 'brown', length: 0.41, thickness: 0.062, d: 0.285, label: 'cloth' },
          { family: 'calf', length: 0.375, thickness: 0.05, d: 0.262, yaw: 0.02, dx: 0.008, label: 'cloth' },
          { family: 'cloth', length: 0.34, thickness: 0.038, d: 0.245, yaw: -0.018, dx: -0.004 },
        ],
        at: 'end',
      },
    ],
    // Row 1: the museum's minute books, a run of bound journals and a brass
    // bookend holding them off the archive boxes.
    [
      { set: 'calf', count: 4, h: 0.362, w: 0.056, d: 0.255, style: 'banded', bands: 4, label: 'pages' },
      { set: 'brown', h: 0.402, w: 0.072, d: 0.28, style: 'banded', label: 'cloth' },
      { set: 'cloth', count: 2, h: 0.338, w: 0.046, d: 0.24, style: 'cloth', label: 'green' },
      { set: 'green', h: 0.384, w: 0.06, d: 0.27, style: 'banded', label: 'cloth', pulled: true },
      { set: 'brown', h: 0.352, w: 0.04, d: 0.25, style: 'banded', bands: 4, label: 'green', slip: { across: 0.55, rise: 0.03 } },
      { set: 'calf', h: 0.33, w: 0.024, d: 0.24, style: 'plain', label: 'pages' },
      { bookend: true },
      { boxes: 2, at: 'end' },
    ],
    // Row 2: a periodical in bound volumes with one taken out, odd quartos,
    // one leaning into the gap and four quartos stacked against the side.
    [
      { set: 'brown', count: 6, h: 0.305, w: 0.047, d: 0.235, style: 'banded', bands: 4, label: 'cloth', missing: 4 },
      { set: 'calf', h: 0.292, w: 0.062, d: 0.24, style: 'banded', label: 'cloth' },
      { set: 'green', count: 2, h: 0.322, w: 0.05, d: 0.245, style: 'banded', label: 'cloth' },
      { set: 'cloth', h: 0.284, w: 0.04, d: 0.225, style: 'cloth' },
      { lean: 'brown', h: 0.31, w: 0.045, d: 0.235, style: 'banded', label: 'cloth', angle: 0.2, toward: -1 },
      {
        stack: [
          { family: 'calf', length: 0.305, thickness: 0.046, d: 0.245, label: 'cloth' },
          { family: 'green', length: 0.29, thickness: 0.04, d: 0.232, yaw: -0.016, dx: 0.006, label: 'cloth' },
          { family: 'brown', length: 0.272, thickness: 0.036, d: 0.22, yaw: 0.022, dx: -0.003, label: 'cloth' },
          { family: 'cloth', length: 0.25, thickness: 0.03, d: 0.2, yaw: -0.01, dx: 0.004 },
        ],
        at: 'end',
      },
    ],
    // Row 3: quartos and octavos up to a bookend and the second pair of boxes.
    [
      { set: 'cloth', count: 3, h: 0.272, w: 0.04, d: 0.215, style: 'cloth' },
      { set: 'calf', h: 0.256, w: 0.05, d: 0.21, style: 'banded', label: 'cloth' },
      { set: 'brown', h: 0.284, w: 0.065, d: 0.225, style: 'banded', label: 'green' },
      { set: 'green', h: 0.25, w: 0.036, d: 0.2, style: 'banded', label: 'cloth' },
      { set: 'brown', h: 0.238, w: 0.021, d: 0.19, style: 'plain' },
      { set: 'calf', h: 0.262, w: 0.045, d: 0.205, style: 'banded', label: 'cloth' },
      { set: 'brown', count: 2, h: 0.29, w: 0.05, d: 0.23, style: 'banded', label: 'cloth' },
      { set: 'cloth', h: 0.24, w: 0.03, d: 0.19, style: 'cloth', label: 'green' },
      { bookend: true },
      { boxes: 2, at: 'end' },
    ],
    // Row 4: octavos, thin volumes and pamphlets, a stack, and one leaning on
    // the case side where the row runs out.
    [
      { set: 'brown', count: 7, h: 0.222, w: 0.036, d: 0.165, style: 'banded', bands: 3, label: 'cloth' },
      {
        over: [
          { family: 'cloth', length: 0.236, thickness: 0.03, d: 0.16, label: 'green' },
          { family: 'calf', length: 0.2, thickness: 0.022, d: 0.148, yaw: 0.03, dx: 0.012 },
        ],
      },
      { set: 'cloth', count: 2, h: 0.2, w: 0.028, d: 0.15, style: 'cloth' },
      { set: 'calf', count: 3, h: 0.236, w: 0.041, d: 0.17, style: 'banded', bands: 3, label: 'cloth' },
      { set: 'calf', count: 3, h: 0.212, w: 0.014, d: 0.16, style: 'plain' },
      { gap: 0.012 },
      {
        stack: [
          { family: 'green', length: 0.245, thickness: 0.042, d: 0.175, label: 'cloth' },
          { family: 'brown', length: 0.222, thickness: 0.036, d: 0.16, yaw: 0.02, dx: 0.006, label: 'cloth' },
          { family: 'calf', length: 0.2, thickness: 0.028, d: 0.15, yaw: -0.024, dx: -0.002 },
        ],
      },
      { gap: 0.01 },
      { set: 'green', count: 2, h: 0.244, w: 0.046, d: 0.175, style: 'banded', bands: 4, label: 'cloth' },
      { lean: 'brown', h: 0.232, w: 0.04, d: 0.17, style: 'banded', bands: 3, label: 'cloth', angle: 0.16, toward: 1 },
    ],
  ],
  b: [
    // Row 0: two archive boxes stacked at the left, then folios.
    [
      { boxes: 2, stacked: true },
      { gap: 0.006 },
      { set: 'calf', count: 3, h: 0.412, w: 0.072, d: 0.28, style: 'banded', bands: 5, label: 'green' },
      { set: 'brown', h: 0.436, w: 0.086, d: 0.29, style: 'banded', label: 'cloth', pulled: true },
      { set: 'cloth', count: 2, h: 0.392, w: 0.05, d: 0.27, style: 'cloth' },
      { set: 'green', h: 0.402, w: 0.062, d: 0.28, style: 'banded', label: 'cloth', slip: { across: 0.5, rise: 0.04 } },
      { set: 'brown', h: 0.38, w: 0.046, d: 0.26, style: 'banded', bands: 4, label: 'green' },
      { lean: 'brown', h: 0.42, w: 0.058, d: 0.28, style: 'banded', label: 'cloth', angle: 0.11, toward: 1 },
    ],
    // Row 1: a green set, a stack in the middle and a book leaning into the
    // space where its neighbours were taken down.
    [
      { set: 'green', count: 4, h: 0.396, w: 0.058, d: 0.275, style: 'banded', bands: 5, label: 'cloth', giltBands: true },
      { set: 'calf', h: 0.362, w: 0.076, d: 0.26, style: 'banded', label: 'pages', pulled: true },
      { gap: 0.004 },
      {
        stack: [
          { family: 'brown', length: 0.4, thickness: 0.058, d: 0.28, label: 'cloth' },
          { family: 'cloth', length: 0.362, thickness: 0.044, d: 0.255, yaw: -0.02, dx: 0.004 },
        ],
      },
      { gap: 0.004 },
      { set: 'brown', count: 3, h: 0.378, w: 0.05, d: 0.265, style: 'banded', label: 'cloth' },
      { lean: 'cloth', h: 0.4, w: 0.05, d: 0.27, style: 'cloth', label: 'green', angle: 0.19, toward: -1 },
    ],
    // Row 2: minute books with paper labels, odd quartos, a bookend, and two
    // quartos lying at the end.
    [
      { set: 'calf', count: 5, h: 0.3, w: 0.05, d: 0.23, style: 'banded', bands: 4, label: 'pages' },
      { over: [{ family: 'brown', length: 0.244, thickness: 0.044, d: 0.215, yaw: -0.02, label: 'cloth' }] },
      { set: 'cloth', h: 0.312, w: 0.045, d: 0.235, style: 'cloth' },
      { set: 'brown', count: 2, h: 0.322, w: 0.06, d: 0.245, style: 'banded', label: 'green', slip: { across: 0.45 } },
      { set: 'green', h: 0.28, w: 0.04, d: 0.22, style: 'banded', bands: 3, label: 'cloth' },
      { set: 'brown', count: 2, h: 0.27, w: 0.02, d: 0.21, style: 'plain' },
      { set: 'cloth', count: 3, h: 0.29, w: 0.034, d: 0.225, style: 'cloth' },
      { bookend: true },
      {
        stack: [
          { family: 'green', length: 0.31, thickness: 0.048, d: 0.245, label: 'cloth' },
          { family: 'calf', length: 0.284, thickness: 0.04, d: 0.23, yaw: 0.018, dx: -0.005, label: 'cloth' },
        ],
        at: 'end',
      },
    ],
    // Row 3: a stack at the left, a long brown run with a volume missing and
    // one archive box at the right.
    [
      {
        stack: [
          { family: 'cloth', length: 0.28, thickness: 0.04, d: 0.21 },
          { family: 'brown', length: 0.262, thickness: 0.044, d: 0.2, yaw: -0.02, dx: 0.004, label: 'cloth' },
          { family: 'calf', length: 0.24, thickness: 0.032, d: 0.19, yaw: 0.016, dx: -0.003, label: 'cloth' },
        ],
      },
      { gap: 0.006 },
      { set: 'brown', count: 6, h: 0.262, w: 0.042, d: 0.205, style: 'banded', bands: 4, label: 'cloth', missing: 2 },
      { set: 'green', h: 0.272, w: 0.052, d: 0.215, style: 'banded', label: 'cloth' },
      { set: 'calf', h: 0.248, w: 0.03, d: 0.2, style: 'plain', label: 'pages' },
      { boxes: 1, at: 'end' },
    ],
    // Row 4: a red-cloth series, calf octavos, a lean and odd small volumes.
    [
      { set: 'cloth', count: 6, h: 0.21, w: 0.032, d: 0.155, style: 'cloth' },
      { over: [{ family: 'green', length: 0.19, thickness: 0.028, d: 0.14, yaw: 0.025, label: 'cloth' }] },
      { set: 'calf', count: 4, h: 0.236, w: 0.04, d: 0.17, style: 'banded', bands: 3, label: 'cloth' },
      { lean: 'brown', h: 0.222, w: 0.036, d: 0.165, style: 'banded', bands: 3, label: 'cloth', angle: 0.22, toward: -1 },
      { gap: 0.03 },
      { set: 'brown', count: 4, h: 0.2, w: 0.031, d: 0.15, style: 'banded', bands: 3, label: 'green' },
      { set: 'green', count: 2, h: 0.242, w: 0.045, d: 0.175, style: 'banded', bands: 4, label: 'cloth' },
      { set: 'calf', count: 2, h: 0.19, w: 0.016, d: 0.14, style: 'plain' },
      { set: 'cloth', h: 0.225, w: 0.034, d: 0.16, style: 'cloth', label: 'green' },
      {
        stack: [
          { family: 'brown', length: 0.236, thickness: 0.04, d: 0.17, label: 'cloth' },
          { family: 'green', length: 0.214, thickness: 0.034, d: 0.155, yaw: 0.022, dx: 0.005, label: 'cloth' },
          { family: 'cloth', length: 0.198, thickness: 0.026, d: 0.145, yaw: -0.014, dx: -0.004 },
        ],
        at: 'end',
      },
    ],
  ],
}

const SEEDS = { a: 0x0b00c5a1, b: 0x0b00c5b2 }

/** The archive box: body, lid, brass holder and the card in it. */
const BOX = { width: 0.205, heights: [0.145, 0.157], depth: DEPTH - 0.078, lid: 0.018, lidOverhang: 0.006 }

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

/**
 * Lays out one row and returns what it placed.
 *
 * A leaning book's angle is authored and its distance from its support is
 * solved for, so it always touches: a book leaning on a shorter neighbour
 * rests its board on that neighbour's top corner (tan θ = gap / h_n); one
 * leaning on a taller support rests its own top corner on the support's
 * face (sin θ = gap / h). The old shelves turned their "leaning" books about
 * the centre instead, which sank one corner 1.5 mm into the shelf and left
 * the other floating, touching nothing.
 */
function layRow(rowIndex, items, random, sink) {
  const { floor } = BOOKSHELF_INTERIOR.rows[rowIndex]
  const left = BOOKSHELF_INTERIOR.left + 0.002
  const right = BOOKSHELF_INTERIOR.right - 0.002
  const gap = () => 0.0006 + random() * 0.0024
  const spineFront = (pulled) =>
    pulled ? PULLED_LINE + random() * 0.002 : SPINE_LINE + (random() - 0.5) * 0.004
  let cursor = left
  /** The thing a book leaning left would rest on: its right edge and top. */
  let previous = null
  /** The last set placed, for books laid across its heads. */
  let lastSet = null

  const requireRoom = (start, what) => {
    if (start < cursor - 1e-9) {
      throw new Error(`bookshelf row ${rowIndex}: ${what} at ${start.toFixed(4)} overlaps ${cursor.toFixed(4)}`)
    }
  }

  for (const item of items) {
    // Books are only ever laid across the set shelved just before them.
    if (!item.set && !item.over) lastSet = null
    if (item.gap) {
      cursor += item.gap
      previous = null
      continue
    }

    if (item.set) {
      const count = item.count ?? 1
      const setLeft = cursor
      let setLast = null
      for (let volume = 0; volume < count; volume += 1) {
        // Volumes of a set are bound alike, but never to the millimetre.
        const w = item.w + (count > 1 ? (random() - 0.5) * 0.004 : 0)
        const book = sink.upright({
          ...item,
          family: item.set,
          w,
          row: rowIndex,
          x: cursor,
          floor,
          front: spineFront(item.pulled),
          slip: volume === 0 ? item.slip : undefined,
        })
        cursor += w + gap()
        previous = { id: book.id, right: book.x + w, top: floor + item.h }
        setLast = book.id
        if (item.missing === volume + 1) {
          // One volume of the series is out: on the curator's desk, perhaps.
          cursor += item.w + gap()
          previous = null
        }
      }
      lastSet = item.missing ? null : { id: setLast, left: setLeft, right: previous?.right ?? cursor, top: floor + item.h }
      continue
    }

    if (item.over) {
      // Books laid across the heads of the set just shelved, the way a full
      // shelf takes its overflow. They rest on the heads, so they need a set
      // of one height under their whole length.
      if (!lastSet) throw new Error(`bookshelf row ${rowIndex}: books laid over nothing`)
      let y = lastSet.top + AIR
      let below = lastSet.id
      for (const lying of item.over) {
        const centreX = (lastSet.left + lastSet.right) / 2 + (lying.dx ?? 0)
        const half = lying.length / 2 + (lying.d * Math.abs(Math.sin(lying.yaw ?? 0))) / 2
        if (centreX - half < lastSet.left - 1e-9 || centreX + half > lastSet.right + 1e-9) {
          throw new Error(`bookshelf row ${rowIndex}: a book laid over the set overhangs it`)
        }
        const book = sink.lying({ ...lying, row: rowIndex, centreX, y, restsOn: below })
        below = book.id
        y += lying.thickness + AIR
      }
      lastSet = null
      continue
    }

    if (item.lean) {
      const theta = item.angle
      if (item.toward === -1) {
        if (!previous) throw new Error(`bookshelf row ${rowIndex}: a book leans left on nothing`)
        const supportHeight = previous.top - floor
        // Its board meets the support's top corner if it is long enough to
        // reach past it; otherwise its own top corner meets the support's face.
        const offset =
          item.h * Math.cos(theta) >= supportHeight
            ? supportHeight * Math.tan(theta)
            : item.h * Math.sin(theta)
        const pivot = previous.right + offset
        sink.lean({ ...item, family: item.lean, row: rowIndex, pivot, floor, front: spineFront(false), angle: theta, leansOn: previous.id })
        cursor = pivot + item.w * Math.cos(theta) + gap()
      } else {
        // Against the case's right side, which is taller than any book.
        const pivot = BOOKSHELF_INTERIOR.right - item.h * Math.sin(theta)
        requireRoom(pivot - item.w * Math.cos(theta), 'a leaning book')
        sink.lean({ ...item, family: item.lean, row: rowIndex, pivot, floor, front: spineFront(false), angle: -theta, leansOn: 'case-side' })
        cursor = BOOKSHELF_INTERIOR.right
      }
      previous = null
      continue
    }

    if (item.stack) {
      const span = Math.max(...item.stack.map((book) => book.length / 2 + Math.abs(book.dx ?? 0) + (book.d * Math.abs(Math.sin(book.yaw ?? 0))) / 2))
      const centre = item.at === 'end' ? right - span : cursor + span
      requireRoom(centre - span, 'a stack')
      let y = floor
      let below = 'shelf'
      for (const lying of item.stack) {
        const book = sink.lying({ ...lying, row: rowIndex, centreX: centre + (lying.dx ?? 0), y, restsOn: below })
        below = book.id
        y += lying.thickness + AIR
      }
      cursor = item.at === 'end' ? BOOKSHELF_INTERIOR.right : centre + span + gap()
      previous = { id: below, right: centre + span, top: y - AIR }
      continue
    }

    if (item.bookend) {
      const plate = 0.004
      const x = cursor + 0.0005
      const bookend = sink.bookend({ row: rowIndex, x, floor, width: plate })
      cursor = x + plate + gap()
      previous = { id: bookend.id, right: x + plate, top: floor + bookend.height }
      continue
    }

    if (item.boxes) {
      const pitch = BOX.width + BOX.lidOverhang * 2 + 0.004
      const footprint = item.stacked ? pitch - 0.004 : item.boxes * pitch - 0.004
      const start = item.at === 'end' ? right - footprint : cursor
      requireRoom(start, 'archive boxes')
      let y = floor
      let below = 'shelf'
      for (let index = 0; index < item.boxes; index += 1) {
        const x = item.stacked ? start + BOX.lidOverhang : start + BOX.lidOverhang + index * pitch
        const box = sink.box({ row: rowIndex, x, floor: y, height: BOX.heights[index % 2], restsOn: below })
        if (item.stacked) {
          y += box.height + AIR
          below = box.id
        }
      }
      cursor = item.at === 'end' ? BOOKSHELF_INTERIOR.right : start + footprint + gap()
      previous = null
      continue
    }

    throw new Error(`bookshelf row ${rowIndex}: unknown item ${JSON.stringify(item)}`)
  }

  if (cursor > BOOKSHELF_INTERIOR.right + 1e-9) {
    throw new Error(`bookshelf row ${rowIndex} overflows the case by ${(cursor - BOOKSHELF_INTERIOR.right).toFixed(4)} m`)
  }
}

/**
 * A compact open bookcase for the safe room.
 *
 * The office is deliberately the smallest room in the slice, so a full-height
 * Victorian library would turn it into a corridor. This one is only 1.18 m
 * wide and 0.34 m deep: enough vertical mass to make the walls feel used,
 * while leaving the archive cabinet and its interaction approach unobstructed.
 *
 * Returns the carcass, four binding families (brown morocco, light calf,
 * bottle-green morocco, red cloth), page heads, archive boxes and the gilt,
 * all sharing one origin, plus the `layout` the tests read.
 */
export function buildBookshelf({ variant = 'a' } = {}) {
  const rows = LAYOUTS[variant]
  if (!rows) throw new Error(`bookshelf: unknown variant "${variant}"`)
  const random = mulberry32(SEEDS[variant])

  const parts = { carcass: [], books: [], booksGreen: [], booksCalf: [], booksRed: [], pages: [], boxes: [], brass: [] }
  const partOf = (family) => (family === 'brass' ? 'brass' : FAMILIES[family].part)
  const items = []
  let bookIndex = variant === 'b' ? 97 : 0

  const place = (pieces, matrix) => {
    for (const [geometry, family] of pieces) {
      geometry.applyMatrix4(matrix)
      parts[partOf(family)].push(geometry)
    }
  }

  const sink = {
    upright(book) {
      const id = `r${book.row}-${items.length}`
      const top = book.floor + book.h
      const record = {
        ...book,
        showHead: top < EYE_HEIGHT + 0.1,
        showTail: false,
      }
      place(uprightPieces(record, uvOffset(bookIndex++)), new Matrix4().makeTranslation(book.x, book.floor, book.front))
      items.push({
        id,
        kind: 'upright',
        row: book.row,
        family: book.family,
        centre: [book.x + book.w / 2, book.floor + book.h / 2],
        halfSize: [book.w / 2, book.h / 2],
        rotation: 0,
        front: book.front,
        back: book.front - book.d,
        // The highest thing it carries: a slip left in it stands proud.
        crown: top + (book.slip ? book.slip.rise ?? 0.035 : 0),
      })
      return { id, x: book.x }
    },

    lean(book) {
      const id = `r${book.row}-${items.length}`
      // Pivot on the bottom edge on the side it leans towards.
      const pivotLocal = book.angle > 0 ? 0 : book.w
      const matrix = new Matrix4()
        .makeTranslation(book.pivot, book.floor, book.front)
        .multiply(new Matrix4().makeRotationZ(book.angle))
        .multiply(new Matrix4().makeTranslation(-pivotLocal, 0, 0))
      const highest = book.floor + book.h * Math.cos(book.angle) + book.w * Math.abs(Math.sin(book.angle))
      // Lifted off the shelf on one side, so above the eye its tail shows.
      const record = { ...book, showHead: highest < EYE_HEIGHT + 0.1, showTail: book.floor > EYE_HEIGHT - 0.2 }
      place(uprightPieces(record, uvOffset(bookIndex++)), matrix)
      // The centre, carried through the same transform.
      const cos = Math.cos(book.angle)
      const sin = Math.sin(book.angle)
      const localX = book.w / 2 - pivotLocal
      const localY = book.h / 2
      items.push({
        id,
        kind: 'lean',
        row: book.row,
        family: book.family,
        centre: [book.pivot + localX * cos - localY * sin, book.floor + localX * sin + localY * cos],
        halfSize: [book.w / 2, book.h / 2],
        // The footprint convention turns by -θ for a rotateZ of θ.
        rotation: -book.angle,
        front: book.front,
        back: book.front - book.d,
        leansOn: book.leansOn,
        crown: highest,
      })
      return { id }
    },

    lying(book) {
      const id = `r${book.row}-${items.length}`
      const yaw = book.yaw ?? 0
      const front = SPINE_LINE + 0.004 - (book.length * Math.abs(Math.sin(yaw))) / 2
      // Turned about its own centre, so a stack is casual but stays square on.
      const centreZ = front - (book.d * Math.cos(yaw)) / 2
      const matrix = new Matrix4()
        .makeTranslation(book.centreX, book.y, centreZ)
        .multiply(new Matrix4().makeRotationY(yaw))
        .multiply(new Matrix4().makeTranslation(-book.length / 2, 0, book.d / 2))
      place(lyingPieces(book, uvOffset(bookIndex++)), matrix)
      const halfX = (book.length * Math.cos(yaw) + book.d * Math.abs(Math.sin(yaw))) / 2
      const halfZ = (book.length * Math.abs(Math.sin(yaw)) + book.d * Math.cos(yaw)) / 2
      items.push({
        id,
        kind: 'lying',
        row: book.row,
        family: book.family,
        centre: [book.centreX, book.y + book.thickness / 2],
        halfSize: [halfX, book.thickness / 2],
        rotation: 0,
        front: centreZ + halfZ,
        back: centreZ - halfZ,
        restsOn: book.restsOn,
      })
      return { id }
    },

    bookend({ row, x, floor, width }) {
      const id = `r${row}-${items.length}`
      // Only the upright plate: its foot is under the books it holds. From
      // the front it is a gold line, so it stands a little proud of the spines.
      const height = 0.17
      const depth = 0.13
      const front = SPINE_LINE + 0.003
      parts.brass.push(boxFaces(width, height, depth, x + width / 2, floor + height / 2, front - depth / 2))
      items.push({
        id,
        kind: 'bookend',
        row,
        centre: [x + width / 2, floor + height / 2],
        halfSize: [width / 2, height / 2],
        rotation: 0,
        front,
        back: front - depth,
      })
      return { id, height }
    },

    box({ row, x, floor, height, restsOn }) {
      const id = `r${row}-${items.length}`
      const centreX = x + BOX.width / 2
      const centreZ = 0.025
      parts.boxes.push(
        boxFaces(BOX.width, height, BOX.depth, centreX, floor + height / 2, centreZ, { top: false }),
        boxFaces(
          BOX.width + BOX.lidOverhang * 2,
          BOX.lid,
          BOX.depth + 0.01,
          centreX,
          floor + height + BOX.lid / 2,
          centreZ,
        ),
      )
      // A brass card holder, and the typed card in it.
      const holderFront = centreZ + BOX.depth / 2 + 0.007
      const holderY = floor + height * 0.62
      const holder = boxFaces(0.074, 0.032, 0.007, centreX, holderY, holderFront - 0.0035)
      parts.brass.push(holder)
      parts.pages.push(
        frontQuad(centreX - 0.031, centreX + 0.031, holderY - 0.0115, holderY + 0.0115, holderFront + LIFT, LABEL_TILE.pages, uvOffset(bookIndex++)),
      )
      const total = height + BOX.lid
      items.push({
        id,
        kind: 'box',
        row,
        centre: [centreX, floor + total / 2],
        halfSize: [BOX.width / 2 + BOX.lidOverhang, total / 2],
        rotation: 0,
        front: holderFront,
        back: centreZ - BOX.depth / 2 - 0.005,
        restsOn,
      })
      return { id, height: total }
    },
  }

  rows.forEach((row, index) => layRow(index, row, random, sink))
  buildCarcass(parts.carcass)

  return {
    carcass: finalize(merge(parts.carcass), { crease: null, metresPerTile: 0.42 }),
    books: finalize(merge(parts.books), { crease: null, uv: 'keep' }),
    booksGreen: finalize(merge(parts.booksGreen), { crease: null, uv: 'keep' }),
    booksCalf: finalize(merge(parts.booksCalf), { crease: null, uv: 'keep' }),
    booksRed: finalize(merge(parts.booksRed), { crease: null, uv: 'keep' }),
    pages: finalize(merge(parts.pages), { crease: null, uv: 'keep' }),
    // Buckram over board: a coarse weave, 1.8 mm a thread at this scale.
    boxes: finalize(merge(parts.boxes), { crease: null, metresPerTile: 0.08 }),
    brass: finalize(merge(parts.brass), { crease: null, metresPerTile: 0.16 }),
    layout: { variant, interior: BOOKSHELF_INTERIOR, items },
  }
}

/**
 * A box of quads, centred, without the faces nobody sees: the back is
 * against the back panel, the bottom on a shelf, and a box body's top under
 * its lid. Six or eight triangles against a BoxGeometry's twelve.
 */
function boxFaces(width, height, depth, x, y, z, { top = true } = {}) {
  const hx = width / 2
  const hy = height / 2
  const hz = depth / 2
  const faces = [
    flatPolygon([[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]], [0, 0, 1]),
    flatPolygon([[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]], [-1, 0, 0]),
    flatPolygon([[hx, -hy, -hz], [hx, -hy, hz], [hx, hy, hz], [hx, hy, -hz]], [1, 0, 0]),
  ]
  if (top) faces.push(flatPolygon([[-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz]], [0, 1, 0]))
  const box = merge(faces)
  box.translate(x, y, z)
  return box
}

/**
 * The case itself. Structural members keep their authored normals with
 * `crease: null`.
 *
 * The shelf boards are a swept section with the two front arrises chamfered,
 * not bevelled boxes: a board's ends are buried in the sides and its back in
 * the back panel, so a rounded box spent 88 of its 108 triangles on edges
 * nobody can see. Five boards and a plain back panel return 556 triangles to
 * the books, for the same chamfer where the light catches it.
 */
function buildCarcass(carcass) {
  // A recessed plinth lets the case meet the floor through a shadow line
  // instead of looking like a box extruded straight out of it.
  const plinth = bevelledBox(WIDTH - 0.08, PLINTH, DEPTH - 0.045, 0.006, 1)
  plinth.translate(0, PLINTH / 2, -0.008)
  carcass.push(plinth)

  for (const x of [-WIDTH / 2 + SIDE / 2, WIDTH / 2 - SIDE / 2]) {
    const upright = bevelledBox(SIDE, HEIGHT - PLINTH, DEPTH, 0.006, 1)
    upright.translate(x, PLINTH + (HEIGHT - PLINTH) / 2, 0)
    carcass.push(upright)
  }

  // The back panel is hidden on every side but its face, which is flat: one
  // quad, where a bevelled board spent 108 triangles on buried edges.
  carcass.push(frontQuad(-WIDTH / 2 + SIDE, WIDTH / 2 - SIDE, PLINTH, HEIGHT - CAP, -DEPTH / 2 + BACK, 1, [0, 0]))

  const boardDepth = DEPTH - BACK
  const chamfer = 0.005
  const section = [
    [-boardDepth / 2, 0],
    [boardDepth / 2 - chamfer, 0],
    [boardDepth / 2, chamfer],
    [boardDepth / 2, SHELF - chamfer],
    [boardDepth / 2 - chamfer, SHELF],
    [-boardDepth / 2, SHELF],
  ]
  for (const y of SHELF_LEVELS) {
    const board = sweepProfile(section, WIDTH - SIDE * 2, { bevel: 0 })
    // Profile X is depth and the sweep runs along Z: turn the run onto X.
    board.rotateY(-Math.PI / 2)
    board.translate(0, y, BACK / 2)
    carcass.push(board)
  }

  // The oversailing cap is the only silhouette visible above eye level. A
  // wider, thinner board earns more than another row of tiny carved detail.
  const cap = bevelledBox(WIDTH + 0.08, CAP, DEPTH + 0.035, 0.008, 1)
  cap.translate(0, HEIGHT - CAP / 2, 0.004)
  carcass.push(cap)
}
