/**
 * Furnishing kit for the Holyoke historical gallery.
 *
 * These six assemblies turn the room into a dense late-nineteenth-century
 * museum display without adding one-off runtime components. Every floor piece
 * stands on y = 0 and faces +Z. The wall-case bay instead follows the standard
 * wall-fitting datum: its back is on z = 0 and the complete case projects +Z
 * into the room. Return keys are material families and therefore share one
 * placement origin; the bake must emit them as `recipe` plus `recipe__part`.
 */

import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three'

import {
  bevelledBox,
  finalize,
  lathe,
  merge,
} from '../lib/geometry.mjs'

function finishBoxes(parts, metresPerTile) {
  return finalize(merge(parts), { crease: null, metresPerTile })
}

function finishMixed(parts, metresPerTile, uv = 'box') {
  return finalize(merge(parts), {
    crease: Math.PI / 5,
    metresPerTile,
    uv,
  })
}

/** Seats a rotated or curved component on the common floor datum. */
function floorSeat(geometry) {
  geometry.computeBoundingBox()
  geometry.translate(0, -geometry.boundingBox.min.y, 0)
  return geometry
}

function thinPanel(width, height, depth = 0.006) {
  return new BoxGeometry(width, height, depth)
}

// ---------------------------------------------------------------------------
// 1. Entry image screen
// Recipe id: holyoke-entry-screen
// ---------------------------------------------------------------------------

/**
 * A tall navy monolith for the gallery's opening image and short object inset.
 *
 * It stands on y = 0, centred on x = z = 0, with its public face toward +Z.
 * The runtime image plane may sit 1 mm ahead of the `art` face, whose usable
 * field is 2.32 x 2.55 m centred at (0, 2.08, 0.257). The little glass niche is
 * deliberately separate: its exhibit datum is exactly (0.18, 0.335, 0.39), with
 * clear room for a ball of radius 0.113 m resting on the timber shelf.
 */
export function buildHolyokeEntryScreen({
  width = 2.70,
  height = 3.48,
  depth = 0.46,
} = {}) {
  const body = []
  const art = []
  const trim = []
  const glass = []

  const plinthHeight = 0.085
  const plinth = bevelledBox(width + 0.10, plinthHeight, depth + 0.12, 0.012, 1)
  plinth.translate(0, plinthHeight / 2, 0.015)
  body.push(plinth)

  const monolith = bevelledBox(width, height - plinthHeight, depth, 0.018, 2)
  monolith.translate(0, plinthHeight + (height - plinthHeight) / 2, 0)
  body.push(monolith)

  // The asymmetrical side fin gives the panel the thick architectural edge
  // visible in the reference instead of the silhouette of a tradeshow banner.
  const fin = bevelledBox(0.105, height - 0.22, depth + 0.085, 0.012, 1)
  fin.translate(-width / 2 + 0.075, height / 2 + 0.035, 0.025)
  body.push(fin)

  const artWidth = width - 0.38
  const artHeight = 2.55
  const artCentreY = 2.08
  const artFaceZ = depth / 2 + 0.017
  const imageField = thinPanel(artWidth, artHeight, 0.008)
  imageField.translate(0.055, artCentreY, artFaceZ)
  art.push(imageField)

  // The historical ball-and-hands print is a project-authored texture mounted
  // by RoomWallArt. Keeping only the navy substrate here lets the bitmap carry
  // real halftone detail instead of spending two thousand triangles on a flat
  // icon, while the baked brass frame still masks its edges.

  const border = 0.025
  for (const side of [-1, 1]) {
    const vertical = bevelledBox(border, artHeight + border * 2, 0.018, 0.004, 1)
    vertical.translate(
      0.055 + side * (artWidth / 2 + border / 2),
      artCentreY,
      artFaceZ + 0.008,
    )
    trim.push(vertical)

    const horizontal = bevelledBox(artWidth + border * 2, border, 0.018, 0.004, 1)
    horizontal.translate(
      0.055,
      artCentreY + side * (artHeight / 2 + border / 2),
      artFaceZ + 0.008,
    )
    trim.push(horizontal)
  }

  const insetWidth = 1.00
  const insetCentreX = 0.18
  const shelfTop = 0.227
  const nicheTop = 0.515
  const insetHeight = nicheTop - shelfTop
  const insetY = (shelfTop + nicheTop) / 2
  const nicheDepth = 0.32
  const nicheCentreZ = depth / 2 + nicheDepth / 2

  // The pane closes the FRONT of the projecting niche. Keeping it beyond the
  // timber arris makes the glass readable at grazing angles and leaves the
  // interactive ball entirely between the navy back and glazing.
  const insetPane = bevelledBox(insetWidth, insetHeight, 0.012, 0.003, 1)
  insetPane.translate(insetCentreX, insetY, 0.514)
  glass.push(insetPane)

  const insetShelf = bevelledBox(insetWidth + 0.12, 0.035, nicheDepth, 0.006, 1)
  insetShelf.translate(insetCentreX, shelfTop - 0.0175, nicheCentreZ)
  trim.push(insetShelf)

  const insetTop = bevelledBox(insetWidth + 0.12, 0.035, nicheDepth, 0.006, 1)
  insetTop.translate(insetCentreX, nicheTop + 0.0175, nicheCentreZ)
  trim.push(insetTop)

  for (const side of [-1, 1]) {
    const insetSide = bevelledBox(0.035, insetHeight, nicheDepth, 0.006, 1)
    insetSide.translate(
      insetCentreX + side * (insetWidth / 2 + 0.0175),
      insetY,
      nicheCentreZ,
    )
    trim.push(insetSide)
  }

  return {
    body: finishBoxes(body, 0.72),
    art: finishBoxes(art, 0.72),
    trim: finishBoxes(trim, 0.20),
    glass: finishBoxes(glass, 0.28),
  }
}

// ---------------------------------------------------------------------------
// 2. Continuous built-in historical display run
// Recipe id: history-case-run
// ---------------------------------------------------------------------------

/**
 * What each bay of the run is for, by the generator's own index.
 *
 * Bay 0 is at local -X. The room places the run turned by PI against its
 * south wall, so bay 0 ends up at the room's +X end and the content reads the
 * bays right to left.
 *
 * The run was dressed first and the collection was hung in it afterwards, by
 * eye: all four interactive pieces ended up across an upright and a shelf,
 * the guide wholly inside a board, the portrait that carries the drawer's
 * code cut through the face. A bay that hosts a piece is now cleared for it
 * here, where the joinery is made:
 *
 *   - `frame`: a picture hangs on the lining, so the bay keeps only its lower
 *     shelf and loses the upper one and its brass rail, and nothing baked
 *     stands above that shelf;
 *   - `book`: an open book lies on the lower shelf, so nothing baked stands
 *     on the middle of that shelf or hangs over it.
 *
 * `test:kit` (`scripts/test-case-run.ts`) holds the content to the `layout`
 * this function returns.
 */
export const HISTORY_CASE_BAYS = [
  { hosts: 'frame' },
  { hosts: 'frame' },
  { hosts: 'book' },
  { hosts: 'book' },
  { hosts: null },
]

/**
 * One complete five-bay dark-timber, brass and glass wall case.
 *
 * The earlier implementation instanced one identically dressed bay five times.
 * It was efficient, but the copied balls, books and shirt made the centrepiece
 * look like shop shelving. This single recipe keeps the same draw-call cost and
 * gives every bay its own silhouette. The wall plane is z = 0, minY is zero and
 * +Z is the viewing side.
 *
 * Besides the material families it returns `layout`: where the uprights,
 * shelves, rails and baked dressing are, in the recipe's frame, written from
 * the same variables that build them. Whatever the content places inside is
 * checked against it.
 */
export function buildHistoryCaseRun({
  width = 10.20,
  height = 2.64,
  depth = 0.64,
  bays = 5,
} = {}) {
  if (bays !== HISTORY_CASE_BAYS.length) {
    throw new Error(`The history case run declares ${HISTORY_CASE_BAYS.length} bays and was asked for ${bays}.`)
  }

  const carcass = []
  const accent = []
  const lining = []
  const trim = []
  const glass = []
  const paper = []
  const artefacts = []

  const boxOf = (geometry) => {
    geometry.computeBoundingBox()
    return {
      min: geometry.boundingBox.min.toArray(),
      max: geometry.boundingBox.max.toArray(),
    }
  }
  const layoutBays = HISTORY_CASE_BAYS.map((bay, index) => ({
    index,
    centreX: -width / 2 + (width / bays) * (index + 0.5),
    hosts: bay.hosts,
    shelves: [],
    rails: [],
  }))
  const layoutStiles = []
  const layoutFiller = []
  /** Baked dressing: joins its family and is written down as a box. */
  const fill = (family, geometry, id, bay) => {
    family.push(geometry)
    layoutFiller.push({ id, bay, ...boxOf(geometry) })
  }

  const baseHeight = 0.76
  const stile = 0.065
  const faceZ = depth - 0.018
  const bayWidth = width / bays

  const plinth = bevelledBox(width + 0.04, 0.075, depth, 0.010, 1)
  plinth.translate(0, 0.0375, depth / 2)
  carcass.push(plinth)

  const cabinet = bevelledBox(width, baseHeight - 0.055, depth - 0.025, 0.014, 1)
  cabinet.translate(0, 0.075 + (baseHeight - 0.055) / 2, (depth - 0.025) / 2)
  carcass.push(cabinet)

  // Two doors per bay keep the long base at furniture scale instead of reading
  // as one ten-metre block. The hidden cabinet stays collider-friendly.
  for (let bay = 0; bay < bays; bay += 1) {
    const centreX = -width / 2 + bayWidth * (bay + 0.5)
    for (const side of [-1, 1]) {
      const door = new BoxGeometry(bayWidth / 2 - 0.075, baseHeight - 0.17, 0.025)
      door.translate(centreX + side * bayWidth * 0.245, baseHeight / 2 + 0.02, faceZ)
      carcass.push(door)

      const pull = new CylinderGeometry(0.010, 0.010, 0.12, 6)
      pull.translate(centreX + side * 0.10, 0.43, depth + 0.015)
      trim.push(pull)
    }
  }

  const deck = bevelledBox(width + 0.035, 0.055, depth + 0.025, 0.009, 1)
  deck.translate(0, baseHeight - 0.0275, (depth + 0.025) / 2)
  carcass.push(deck)

  const upperLow = baseHeight
  const upperHigh = height - 0.105
  const upperHeight = upperHigh - upperLow

  const back = new BoxGeometry(width - 0.08, upperHeight, 0.025)
  back.translate(0, upperLow + upperHeight / 2, 0.0125)
  carcass.push(back)

  // A single Prussian-navy lining sits proud of the timber back. The dark
  // field gives pale paper and leather the contrast seen in a real archive
  // case; without it every layer collapsed into the same brown material.
  const liningThickness = 0.012
  const liningCentreZ = 0.032
  const darkBack = new BoxGeometry(width - 0.12, upperHeight - 0.05, liningThickness)
  darkBack.translate(0, upperLow + upperHeight / 2, liningCentreZ)
  lining.push(darkBack)

  for (let index = 0; index <= bays; index += 1) {
    const x = -width / 2 + bayWidth * index
    const sideStile = new BoxGeometry(stile, upperHeight, depth)
    sideStile.translate(x, upperLow + upperHeight / 2, depth / 2)
    carcass.push(sideStile)
    layoutStiles.push({ x, halfWidth: stile / 2 })
  }

  const head = bevelledBox(width + 0.045, 0.105, depth + 0.025, 0.012, 1)
  head.translate(0, height - 0.0525, (depth + 0.025) / 2)
  carcass.push(head)

  // One uninterrupted oxblood datum ties the archival photographs above to
  // the joinery below, as in the concept image.
  const oxbloodBand = new BoxGeometry(width, 0.045, 0.018)
  oxbloodBand.translate(0, height - 0.145, depth + 0.012)
  accent.push(oxbloodBand)

  // Shelf heights alternate subtly from bay to bay. The run remains aligned,
  // but the contents do not fall into a copied spreadsheet grid. A bay that
  // hosts a frame keeps the lower level only: the picture hangs where the
  // upper shelf and its rail would cross it.
  const shelfThickness = 0.027
  const shelfBack = 0.055
  const levelsOf = (bay) => [
    { id: 'lower', y: 1.32 + (bay % 2) * 0.05 },
    ...(HISTORY_CASE_BAYS[bay].hosts === 'frame' ? [] : [{ id: 'upper', y: 1.91 - (bay % 3) * 0.04 }]),
  ]
  for (let bay = 0; bay < bays; bay += 1) {
    const centreX = -width / 2 + bayWidth * (bay + 0.5)
    for (const level of levelsOf(bay)) {
      const shelfDepth = depth - 0.14 - (bay % 2) * 0.035
      const shelf = new BoxGeometry(bayWidth - 0.15, shelfThickness, shelfDepth)
      shelf.translate(centreX, level.y, shelfBack + shelfDepth / 2)
      carcass.push(shelf)
      layoutBays[bay].shelves.push({
        id: level.id,
        top: level.y + shelfThickness / 2,
        bottom: level.y - shelfThickness / 2,
        back: shelfBack,
        front: shelfBack + shelfDepth,
        halfWidth: (bayWidth - 0.15) / 2,
      })
    }
  }

  // Brass glazing grid. Each bay receives its own unequal pair of horizontal
  // rails, while the full-height uprights keep the run architectural.
  for (let bay = 0; bay < bays; bay += 1) {
    const centreX = -width / 2 + bayWidth * (bay + 0.5)
    for (const level of levelsOf(bay)) {
      const rail = new BoxGeometry(bayWidth - 0.09, 0.026, 0.025)
      rail.translate(centreX, level.y, faceZ + 0.010)
      trim.push(rail)
      layoutBays[bay].rails.push({ id: level.id, ...boxOf(rail) })
    }

    // Integrated reading ledges create the reference's rhythm of sloped
    // interpretation panels without five extra runtime placements.
    const consoleRake = -0.30
    const console = new BoxGeometry(bayWidth - 0.20, 0.085, 0.43)
    console.rotateX(consoleRake)
    console.translate(centreX, 0.82, depth + 0.17)
    carcass.push(console)
    // Its raked back edge tucks under the glass, a few centimetres into the
    // case just above the deck: declared, so that the layout accounts for
    // everything the bake puts inside the glazing.
    layoutBays[bay].ledge = boxOf(console)

    const graphic = new BoxGeometry(bayWidth - 0.34, 0.012, 0.31)
    graphic.rotateX(consoleRake)
    graphic.translate(centreX, 0.865, depth + 0.17)
    paper.push(graphic)

    const consoleRail = new BoxGeometry(bayWidth - 0.22, 0.025, 0.025)
    consoleRail.translate(centreX, 0.755, depth + 0.39)
    trim.push(consoleRail)
  }
  for (let index = 0; index <= bays; index += 1) {
    const x = -width / 2 + bayWidth * index
    const glazingBar = new BoxGeometry(0.026, upperHeight - 0.07, 0.025)
    glazingBar.translate(x, upperLow + upperHeight / 2, faceZ + 0.010)
    trim.push(glazingBar)
  }

  for (let bay = 0; bay < bays; bay += 1) {
    const centreX = -width / 2 + bayWidth * (bay + 0.5)
    const pane = thinPanel(bayWidth - 0.085, upperHeight - 0.09, 0.008)
    pane.translate(centreX, upperLow + upperHeight / 2, depth + 0.004)
    glass.push(pane)
  }

  const bayCentre = (index) => layoutBays[index].centreX
  const addDocument = (id, bay, offsetX, y, z, documentWidth, documentHeight, angle = 0) => {
    const document = thinPanel(documentWidth, documentHeight, 0.008)
    document.rotateX(-0.28)
    document.rotateZ(angle)
    document.translate(bayCentre(bay) + offsetX, y, z)
    fill(paper, document, id, bay)
  }

  // The dressing is what is left once each hosting bay has made room for its
  // piece. Above the lower shelf, a frame bay is empty and a book bay keeps
  // only what stands clear of the middle of the board. The jersey, the tunic,
  // the two propped documents and the second leather ball stood exactly where
  // the collection now is, and are gone. The rest waits for the lot that
  // turns the dressing into data (D21).

  // Bay 0 (frame): a row of slim catalogues under the shelf.
  for (let index = 0; index < 5; index += 1) {
    const volume = new BoxGeometry(0.12, 0.34 + (index % 2) * 0.06, 0.22)
    volume.rotateZ((index - 2) * 0.025)
    volume.translate(bayCentre(0) - 0.70 + index * 0.21, 0.95, 0.30)
    fill(artefacts, volume, `catalogue-${index}`, 0)
  }

  // Bay 1 (frame): rolled court diagrams under the shelf.
  for (let index = 0; index < 3; index += 1) {
    const roll = new CylinderGeometry(0.038, 0.038, 0.58 - index * 0.07, 8)
    roll.rotateZ(Math.PI / 2)
    roll.translate(bayCentre(1) - 0.38 + index * 0.34, 0.91 + index * 0.055, 0.31)
    fill(paper, roll, `court-roll-${index}`, 1)
  }

  // Bay 2 (book): rule cards to either side of the book, boxes under the shelf.
  addDocument('rule-card-left', 2, -0.58, 1.48, 0.35, 0.42, 0.46, -0.06)
  addDocument('rule-card-right', 2, 0.58, 1.48, 0.35, 0.42, 0.46, 0.06)
  for (let index = 0; index < 4; index += 1) {
    const box = new BoxGeometry(0.27 + index * 0.02, 0.055, 0.31)
    box.translate(bayCentre(2) - 0.43 + index * 0.27, 0.82 + index * 0.07, 0.30)
    fill(paper, box, `archive-box-${index}`, 2)
  }

  // Bay 3 (book): small brass medals under the shelf.
  for (let index = 0; index < 4; index += 1) {
    const medal = new CylinderGeometry(0.052, 0.052, 0.012, 10)
    medal.rotateX(Math.PI / 2)
    medal.translate(bayCentre(3) - 0.55 + index * 0.30, 1.08 + (index % 2) * 0.10, 0.39)
    fill(trim, medal, `medal-${index}`, 3)
  }

  // Bay 4 (hosts nothing): large archival leaves, a ledger stack and a laced
  // training ball.
  addDocument('leaf-left', 4, -0.42, 1.52, 0.37, 0.50, 0.62, -0.04)
  addDocument('leaf-right', 4, 0.30, 1.48, 0.37, 0.58, 0.48, 0.05)
  for (let index = 0; index < 4; index += 1) {
    const ledger = new BoxGeometry(0.44 - index * 0.035, 0.065, 0.31)
    ledger.rotateY(index * 0.035)
    ledger.translate(bayCentre(4) - 0.42 + index * 0.16, 0.81 + index * 0.07, 0.30)
    fill(artefacts, ledger, `ledger-${index}`, 4)
  }
  const finalBall = new SphereGeometry(0.13, 10, 7)
  finalBall.translate(bayCentre(4) + 0.62, 0.91, 0.31)
  fill(artefacts, finalBall, 'training-ball', 4)

  return {
    carcass: finishBoxes(carcass, 0.54),
    accent: finishBoxes(accent, 0.34),
    lining: finishBoxes(lining, 0.72),
    trim: finishMixed(trim, 0.18),
    glass: finishBoxes(glass, 0.60),
    paper: finishBoxes(paper, 0.34),
    artefacts: finishMixed(artefacts, 0.28),
    layout: {
      width,
      height,
      depth,
      /** Top of the base cabinet: the floor of the glazed part. */
      deckTop: baseHeight,
      /** The face of the navy lining: where a frame's back goes. */
      liningFront: liningCentreZ + liningThickness / 2,
      /** The inner face of the glazing. */
      glassBack: depth,
      /** The underside of the head: the ceiling of the glazed part. */
      headBottom: upperHigh,
      stiles: layoutStiles,
      bays: layoutBays,
      filler: layoutFiller,
    },
  }
}

// ---------------------------------------------------------------------------
// 3. Hero display case
// Recipe id: history-hero-case
// ---------------------------------------------------------------------------

/**
 * A broad, low-waisted glass case for the laced Spalding hero ball.
 *
 * The generic tower used before was narrow enough to read as an empty chimney.
 * This case gives the object a square pool of glass and a pale inner pedestal,
 * while keeping collision on the solid cabinet below the player's autostep.
 * The exhibit support surface is at y = 1.02 m.
 */
export function buildHistoryHeroCase({
  width = 1.42,
  depth = 1.22,
  height = 2.12,
} = {}) {
  const body = []
  const trim = []
  const glass = []
  const display = []

  const baseHeight = 0.78
  const plinth = bevelledBox(width, 0.08, depth, 0.012, 1)
  plinth.translate(0, 0.04, 0)
  body.push(plinth)

  const cabinet = bevelledBox(width - 0.10, baseHeight - 0.08, depth - 0.10, 0.018, 2)
  cabinet.translate(0, 0.08 + (baseHeight - 0.08) / 2, 0)
  body.push(cabinet)

  for (const side of [-1, 1]) {
    const door = new BoxGeometry(width / 2 - 0.11, baseHeight - 0.20, 0.025)
    door.translate(side * width * 0.235, baseHeight / 2 + 0.025, depth / 2 - 0.035)
    body.push(door)
  }

  const deck = bevelledBox(width + 0.035, 0.065, depth + 0.035, 0.010, 1)
  deck.translate(0, baseHeight - 0.0325, 0)
  body.push(deck)

  const innerBase = bevelledBox(0.62, 0.18, 0.62, 0.016, 1)
  innerBase.translate(0, 0.87, 0)
  display.push(innerBase)
  const innerTop = bevelledBox(0.50, 0.06, 0.50, 0.010, 1)
  innerTop.translate(0, 0.99, 0)
  display.push(innerTop)

  const glassLow = baseHeight + 0.02
  const glassHeight = height - glassLow
  const paneWidth = width - 0.13
  const paneDepth = depth - 0.13
  for (const z of [-1, 1]) {
    const pane = thinPanel(paneWidth, glassHeight - 0.10, 0.010)
    pane.translate(0, glassLow + glassHeight / 2, z * paneDepth / 2)
    glass.push(pane)
  }
  for (const x of [-1, 1]) {
    const pane = new BoxGeometry(0.010, glassHeight - 0.10, paneDepth)
    pane.translate(x * paneWidth / 2, glassLow + glassHeight / 2, 0)
    glass.push(pane)
  }
  const glassTop = new BoxGeometry(paneWidth, 0.010, paneDepth)
  glassTop.translate(0, height, 0)
  glass.push(glassTop)

  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const upright = new BoxGeometry(0.025, glassHeight, 0.025)
      upright.translate(x * paneWidth / 2, glassLow + glassHeight / 2, z * paneDepth / 2)
      trim.push(upright)
    }
  }
  for (const y of [glassLow, height]) {
    for (const z of [-1, 1]) {
      const rail = new BoxGeometry(paneWidth + 0.05, 0.025, 0.025)
      rail.translate(0, y, z * paneDepth / 2)
      trim.push(rail)
    }
    for (const x of [-1, 1]) {
      const rail = new BoxGeometry(0.025, 0.025, paneDepth)
      rail.translate(x * paneWidth / 2, y, 0)
      trim.push(rail)
    }
  }

  return {
    body: finishBoxes(body, 0.58),
    trim: finishBoxes(trim, 0.18),
    glass: finishBoxes(glass, 0.60),
    display: finishBoxes(display, 0.34),
  }
}

// ---------------------------------------------------------------------------
// 4. Central interpretation kiosk
// Recipe id: history-info-kiosk
// ---------------------------------------------------------------------------

/**
 * A broad central oak kiosk with three raked graphic leaves facing +Z.
 *
 * The player reads the 2.28 x 0.62 m combined graphic field from the entrance.
 * Each leaf tilts 24 degrees down toward +Z and is separated by a dark reveal,
 * giving the runtime one low-cost assembly instead of three independent stands.
 */
export function buildHistoryInfoKiosk({
  width = 2.48,
  depth = 1.10,
  height = 1.12,
} = {}) {
  const body = []
  const lining = []
  const graphics = []
  const trim = []

  const plinthHeight = 0.075
  const base = bevelledBox(width, plinthHeight, depth, 0.012, 1)
  base.translate(0, plinthHeight / 2, 0)
  body.push(base)

  const cabinet = bevelledBox(width - 0.15, 0.70, depth - 0.18, 0.020, 2)
  cabinet.translate(0, plinthHeight + 0.35, 0.035)
  body.push(cabinet)

  // A raised rear spine supports the high edge of the graphic leaves. It is
  // visible at the ends, so it gets the same rounded joinery as the cabinet.
  const spine = bevelledBox(width - 0.10, 0.33, 0.095, 0.012, 1)
  spine.translate(0, 0.80, -depth / 2 + 0.14)
  body.push(spine)

  for (const side of [-1, 1]) {
    const cheek = bevelledBox(0.07, 0.28, depth - 0.18, 0.010, 1)
    cheek.translate(side * (width / 2 - 0.08), 0.78, 0.035)
    body.push(cheek)
  }

  const rake = 0.42
  const fieldWidth = width - 0.20
  const gap = 0.028
  const leafWidth = (fieldWidth - gap * 2) / 3
  const leafDepth = 0.67
  const fieldY = height - 0.14
  const fieldZ = 0.04

  for (let index = 0; index < 3; index += 1) {
    const leafX = (index - 1) * (leafWidth + gap)
    const leaf = bevelledBox(leafWidth, 0.022, leafDepth, 0.006, 1)
    leaf.rotateX(rake)
    leaf.translate(leafX, fieldY, fieldZ)
    lining.push(leaf)

    // Unequal inset leaves break the old row of three blank beige tablets.
    // They reuse the same paper material, so the richer top costs geometry but
    // no new shader program.
    const insetWidth = leafWidth - 0.09 - index * 0.025
    const insetDepth = leafDepth - 0.11 + index * 0.025
    const inset = new BoxGeometry(insetWidth, 0.010, insetDepth)
    inset.rotateX(rake)
    inset.translate(leafX + (index - 1) * 0.015, fieldY + 0.018, fieldZ + 0.002)
    graphics.push(inset)
  }

  const frontBand = bevelledBox(width - 0.14, 0.028, 0.035, 0.005, 1)
  frontBand.translate(0, 0.78, depth / 2 - 0.065)
  trim.push(frontBand)

  for (const side of [-1, 1]) {
    const arris = bevelledBox(0.024, 0.61, 0.026, 0.004, 1)
    arris.translate(side * (width / 2 - 0.11), 0.42, depth / 2 - 0.072)
    trim.push(arris)
  }

  return {
    body: finishBoxes(body, 0.58),
    lining: finishBoxes(lining, 0.72),
    graphics: finishBoxes(graphics, 0.52),
    trim: finishBoxes(trim, 0.18),
  }
}

// ---------------------------------------------------------------------------
// 5. Reconstructed gymnasium court markings
// Recipe id: gym-court-lines
// ---------------------------------------------------------------------------

/**
 * A compact 1890s demonstration court painted onto the floor.
 *
 * The marks occupy 4.8 x 7.0 m, stand only 6 mm high and have minY = 0. +Z is
 * the long direction toward the far-wall mural. This is intentionally geometry
 * rather than a room texture so the vignette can move without rebaking a shell.
 */
export function buildGymCourtLines({
  width = 4.8,
  depth = 7.0,
  lineWidth = 0.038,
} = {}) {
  const lines = []
  const height = 0.006

  for (const side of [-1, 1]) {
    const sideline = new BoxGeometry(lineWidth, height, depth)
    sideline.translate(side * (width / 2 - lineWidth / 2), height / 2, 0)
    lines.push(sideline)

    const endline = new BoxGeometry(width - lineWidth * 2, height, lineWidth)
    endline.translate(0, height / 2, side * (depth / 2 - lineWidth / 2))
    lines.push(endline)
  }

  for (const z of [-1.72, 0, 1.72]) {
    const transverse = new BoxGeometry(width - lineWidth * 2, height, lineWidth)
    transverse.translate(0, height / 2 + 0.0005, z)
    lines.push(transverse)
  }

  // Short service ticks distinguish this from a decorative rectangle and are
  // set inward so their outer corners stay inside the declared footprint.
  for (const z of [-depth / 2 + 0.34, depth / 2 - 0.34]) {
    for (const x of [-width / 4, width / 4]) {
      const tick = new BoxGeometry(0.34, height, lineWidth)
      tick.translate(x, height / 2 + 0.0005, z)
      lines.push(tick)
    }
  }

  return {
    lines: finishBoxes(lines, 0.65),
  }
}

// ---------------------------------------------------------------------------
// 6. YMCA training vignette
// Recipe id: gym-training-set
// ---------------------------------------------------------------------------

function indianClub(height = 0.82, bulb = 0.10) {
  return lathe(
    [
      [0, 0],
      [0.034, 0],
      [0.043, height * 0.05],
      [bulb * 0.82, height * 0.20],
      [bulb, height * 0.39],
      [bulb * 0.82, height * 0.55],
      [0.042, height * 0.70],
      [0.032, height * 0.87],
      [0.055, height * 0.94],
      [0.036, height],
      [0, height],
    ],
    10,
  )
}

/**
 * Four turned Indian clubs, a continuous coiled rope and an old training ball.
 *
 * The complete floor vignette fits roughly 1.55 x 0.86 m, stands on y = 0 and
 * faces +Z. The rope is one swept spiral rather than stacked toruses: the loose
 * tail therefore joins the coil continuously and catches the light as rope.
 */
export function buildGymTrainingSet() {
  const wood = []
  const rope = []
  const leather = []

  const standingClubs = [
    { x: -0.50, z: -0.20, height: 0.82, bulb: 0.098, rz: 0.035 },
    { x: -0.23, z: -0.27, height: 0.72, bulb: 0.091, rz: -0.045 },
    { x: 0.01, z: -0.14, height: 0.88, bulb: 0.105, rz: 0.055 },
  ]
  for (const spec of standingClubs) {
    const club = indianClub(spec.height, spec.bulb)
    club.rotateZ(spec.rz)
    floorSeat(club)
    club.translate(spec.x, 0, spec.z)
    wood.push(club)
  }

  const fallen = indianClub(0.76, 0.096)
  fallen.rotateZ(Math.PI / 2)
  fallen.rotateY(-0.34)
  floorSeat(fallen)
  fallen.translate(0.19, 0, -0.38)
  wood.push(fallen)

  const coilCentreX = 0.21
  const coilCentreZ = 0.24
  const coilPoints = []
  const turns = 2.72
  const samples = 45
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples
    const angle = t * Math.PI * 2 * turns
    const radius = 0.09 + angle * 0.0195
    coilPoints.push(new Vector3(
      coilCentreX + Math.cos(angle) * radius,
      0.034,
      coilCentreZ + Math.sin(angle) * radius,
    ))
  }

  const tailStart = coilPoints.at(-1)
  coilPoints.push(
    new Vector3(tailStart.x + 0.13, 0.034, tailStart.z - 0.025),
    new Vector3(tailStart.x + 0.31, 0.034, tailStart.z + 0.010),
    new Vector3(tailStart.x + 0.49, 0.034, tailStart.z + 0.095),
  )
  const coilCurve = new CatmullRomCurve3(coilPoints, false, 'centripetal', 0.5)
  const coiledRope = new TubeGeometry(coilCurve, 72, 0.026, 6, false)
  floorSeat(coiledRope)
  rope.push(coiledRope)

  const ballRadius = 0.25
  const ballCentre = new Vector3(0.70, ballRadius + 0.001, -0.19)
  const ball = new SphereGeometry(ballRadius, 12, 8)
  ball.translate(ballCentre.x, ballCentre.y, ballCentre.z)
  leather.push(ball)

  // Raised laced seams are only 4 mm thick but stop the ball reading as a new,
  // seamless toy. They share the rope material with the coil, as period balls
  // were closed with the same pale woven cord.
  for (const axis of ['z', 'x']) {
    const seam = new TorusGeometry(ballRadius - 0.003, 0.004, 4, 16)
    if (axis === 'x') seam.rotateY(Math.PI / 2)
    seam.translate(ballCentre.x, ballCentre.y, ballCentre.z)
    rope.push(seam)
  }

  return {
    wood: finishMixed(wood, 0.30),
    rope: finishMixed(rope, 0.20),
    leather: finishMixed(leather, 0.30, 'sphere'),
  }
}
