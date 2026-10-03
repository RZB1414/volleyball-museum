/**
 * Supporting furniture for the curator's office concept.
 *
 * These props deliberately carry more small-scale silhouette than the gallery
 * kit. The office is six metres across and the player can stand within arm's
 * reach of everything, so drawer reveals, chair rake and a safe's wheel earn
 * their triangles here. Every floor prop is authored with min Y at zero. The
 * corkboard is authored from y = 0 on the wall plane z = 0, with +Z pointing
 * into the room, matching the wall-fitting convention in fixtures.mjs.
 *
 * Return-object keys are material families, not independent placeables. They
 * share one origin and must be emitted as `recipe` plus `recipe__key`, exactly
 * like the existing office chair, bookshelf and desk lamp assemblies.
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
  domeStud,
  finalize,
  lathe,
  merge,
  piping,
  quiltedPanel,
} from '../lib/geometry.mjs'

function finishBoxes(parts, metresPerTile) {
  return finalize(merge(parts), { crease: null, metresPerTile })
}

function finishMixed(parts, metresPerTile) {
  return finalize(merge(parts), { crease: Math.PI / 5, metresPerTile })
}

/** Seats a merged floor component on the shared y=0 placement datum. */
function floorSeat(geometry) {
  geometry.computeBoundingBox()
  geometry.translate(0, -geometry.boundingBox.min.y, 0)
  return geometry
}

/** A thin rectangular inlay, kept un-bevelled so patterns remain inexpensive. */
function flatPanel(width, depth, y, height = 0.002) {
  const panel = new BoxGeometry(width, height, depth)
  panel.translate(0, y + height / 2, 0)
  return panel
}

// ---------------------------------------------------------------------------
// 1. Persian-style office rug
// Recipe id: office-rug
// ---------------------------------------------------------------------------

/**
 * A dense rug with nested guard borders, a broken centre row and loose fringe.
 *
 * The pattern is geometry rather than a bespoke texture so it remains readable
 * with the current shared material set. It is intentionally broad and sparse:
 * eighty tiny woven motifs would disappear under texture filtering, while the
 * long borders and five medallions survive at the office doorway.
 */
export function buildOfficeRug({ width = 3.25, depth = 4.15 } = {}) {
  const field = []
  const border = []
  const fringe = []

  const pileHeight = 0.012
  const body = bevelledBox(width, pileHeight, depth, 0.018, 1)
  body.translate(0, pileHeight / 2, 0)
  field.push(body)

  const addBorder = (inset, band) => {
    const longLength = depth - inset * 2
    const shortLength = width - inset * 2 - band * 2
    const y = pileHeight

    for (const side of [-1, 1]) {
      const long = flatPanel(band, longLength, y)
      long.translate(side * (width / 2 - inset - band / 2), 0, 0)
      border.push(long)

      const short = flatPanel(shortLength, band, y)
      short.translate(0, 0, side * (depth / 2 - inset - band / 2))
      border.push(short)
    }
  }

  // Three unequal bands are more convincing than a mathematically repeated
  // stripe and leave a broad red field beneath the desk.
  addBorder(0.055, 0.085)
  addBorder(0.19, 0.032)
  addBorder(0.275, 0.055)

  // Five offset lozenges make a broken central axis. Each consists of a large
  // pale diamond and a smaller field-coloured diamond laid over it.
  const medallionZ = [-1.32, -0.68, 0.04, 0.72, 1.36]
  for (const [index, z] of medallionZ.entries()) {
    const outer = flatPanel(index === 2 ? 0.62 : 0.48, index === 2 ? 0.62 : 0.48, pileHeight + 0.002)
    outer.rotateY(Math.PI / 4)
    outer.translate(index % 2 === 0 ? -0.04 : 0.055, 0, z)
    border.push(outer)

    const inner = flatPanel(index === 2 ? 0.34 : 0.25, index === 2 ? 0.34 : 0.25, pileHeight + 0.004)
    inner.rotateY(Math.PI / 4)
    inner.translate(index % 2 === 0 ? -0.04 : 0.055, 0, z)
    field.push(inner)
  }

  // Separate tabs avoid the rigid solid comb produced by a single fringe box.
  const strandWidth = 0.032
  const strandDepth = 0.095
  const count = Math.floor((width - 0.16) / 0.075)
  for (const side of [-1, 1]) {
    for (let index = 0; index <= count; index += 1) {
      const t = count === 0 ? 0.5 : index / count
      const x = -width / 2 + 0.08 + t * (width - 0.16)
      const strand = new BoxGeometry(strandWidth, 0.002, strandDepth)
      strand.rotateY(((index % 3) - 1) * 0.035)
      strand.translate(x, 0.002, side * (depth / 2 + strandDepth / 2 - 0.012))
      fringe.push(strand)
    }
  }

  // Pile on the velvet maps at 0.4 m a tile: knots of about 4 mm, tufts of
  // under two centimetres and crushed patches 15 cm across, the scale of the
  // tonal bands a hand-knotted rug shows from across a room. On the canvas at
  // the old 0.52 m every thread was 12 mm and the rug read as sacking. The
  // fringe stays cotton canvas, at a millimetre a thread.
  return {
    field: finishBoxes(field, 0.4),
    border: finishBoxes(border, 0.4),
    fringe: finishBoxes(fringe, 0.05),
  }
}

// ---------------------------------------------------------------------------
// 2. Research corkboard
// Recipe id: office-corkboard
// ---------------------------------------------------------------------------

/**
 * A wall-mounted evidence board with an oak frame, cork field and pinned notes.
 *
 * The papers overlap by only a few millimetres in Z. More depth would expose
 * their mathematically perfect edges at grazing angles and make them read as
 * tiles rather than pinned sheets. The frame's back is exactly on z = 0.
 */
export function buildOfficeCorkboard({ width = 2.25, height = 1.32 } = {}) {
  const frame = []
  const cork = []
  const papers = []
  const pins = []

  const rail = 0.075
  const frameDepth = 0.052
  const horizontal = () => bevelledBox(width, rail, frameDepth, 0.008, 1)
  const vertical = () => bevelledBox(rail, height - rail * 2, frameDepth, 0.008, 1)

  const lower = horizontal()
  lower.translate(0, rail / 2, frameDepth / 2)
  frame.push(lower)

  const upper = horizontal()
  upper.translate(0, height - rail / 2, frameDepth / 2)
  frame.push(upper)

  for (const side of [-1, 1]) {
    const stile = vertical()
    stile.translate(side * (width / 2 - rail / 2), height / 2, frameDepth / 2)
    frame.push(stile)
  }

  const board = new BoxGeometry(width - rail * 2, height - rail * 2, 0.018)
  board.translate(0, height / 2, 0.018)
  cork.push(board)

  const notes = [
    { x: -0.79, y: 0.91, w: 0.34, h: 0.25, r: -0.045 },
    { x: -0.43, y: 0.48, w: 0.31, h: 0.42, r: 0.035 },
    { x: -0.12, y: 0.90, w: 0.54, h: 0.35, r: -0.018 },
    { x: 0.40, y: 0.84, w: 0.29, h: 0.40, r: 0.052 },
    { x: 0.77, y: 0.94, w: 0.31, h: 0.22, r: -0.034 },
    { x: 0.02, y: 0.44, w: 0.48, h: 0.34, r: 0.026 },
    { x: 0.61, y: 0.42, w: 0.45, h: 0.27, r: -0.025 },
  ]

  for (const note of notes) {
    // UVs in the sheet's own frame, before it is tilted, so the paper's feint
    // rules run parallel to its edges instead of across them.
    const paper = finalize(new BoxGeometry(note.w, note.h, 0.003), { crease: null, metresPerTile: 0.25 })
    paper.rotateZ(note.r)
    paper.translate(note.x, note.y, 0.031)
    papers.push(paper)

    // Cylinder axis faces +Z after rotation; the head stands proud enough to
    // catch the sconce without becoming a brass disc from across the room.
    const pin = new CylinderGeometry(0.009, 0.009, 0.009, 8)
    pin.rotateX(Math.PI / 2)
    pin.translate(note.x, note.y + note.h * 0.36, 0.038)
    pins.push(pin)
  }

  return {
    frame: finishBoxes(frame, 0.44),
    cork: finishBoxes(cork, 0.55),
    papers: finalize(merge(papers), { uv: 'none', crease: null }),
    pins: finishMixed(pins, 0.12),
  }
}

// ---------------------------------------------------------------------------
// 3. Map flat file
// Recipe id: office-flatfile
// ---------------------------------------------------------------------------

/**
 * A low steel plan chest with ten shallow drawers and an active map on top.
 *
 * Front is +Z. The carcass is a solid volume because this is a collision prop;
 * drawer depth is conveyed by proud faces and shadow reveals rather than ten
 * inaccessible internal boxes.
 */
export function buildOfficeFlatfile({ width = 1.12, depth = 0.62, height = 1.03 } = {}) {
  const body = []
  const hardware = []
  const map = []

  const plinthHeight = 0.075
  const carcass = bevelledBox(width, height - plinthHeight, depth, 0.012, 1)
  carcass.translate(0, plinthHeight + (height - plinthHeight) / 2, 0)
  body.push(carcass)

  const plinth = bevelledBox(width - 0.08, plinthHeight, depth - 0.07, 0.008, 1)
  plinth.translate(0, plinthHeight / 2, -0.01)
  body.push(plinth)

  const top = bevelledBox(width + 0.035, 0.035, depth + 0.035, 0.007, 1)
  top.translate(0, height - 0.0175, 0)
  body.push(top)

  const drawerCount = 10
  const available = height - plinthHeight - 0.055
  const pitch = available / drawerCount
  for (let index = 0; index < drawerCount; index += 1) {
    const y = plinthHeight + pitch * (index + 0.5)
    const face = bevelledBox(width - 0.055, pitch - 0.010, 0.018, 0.003, 1)
    face.translate(0, y, depth / 2 + 0.006)
    body.push(face)

    const label = new BoxGeometry(0.16, 0.032, 0.006)
    label.translate(0, y + pitch * 0.21, depth / 2 + 0.019)
    hardware.push(label)

    const pull = new TorusGeometry(0.043, 0.005, 4, 10, Math.PI)
    pull.rotateZ(Math.PI)
    pull.translate(0, y - pitch * 0.12, depth / 2 + 0.026)
    hardware.push(pull)
  }

  // A single unfolded survey plan gives the cabinet a reason to be here. Its
  // offset and slight rotation keep it from reading as another top laminate.
  const plan = new BoxGeometry(width * 0.78, 0.004, depth * 0.72)
  plan.rotateY(-0.045)
  plan.translate(-0.035, height + 0.002, 0.012)
  map.push(plan)

  return {
    body: finishBoxes(body, 0.46),
    hardware: finishMixed(hardware, 0.16),
    map: finishBoxes(map, 0.42),
  }
}

// ---------------------------------------------------------------------------
// 4. Archive trolley
// Recipe id: archive-trolley
// ---------------------------------------------------------------------------

/** A compact three-tier trolley carrying mismatched archival document boxes. */
export function buildArchiveTrolley({ width = 0.84, depth = 0.43, height = 1.17 } = {}) {
  const frame = []
  const boxes = []
  const labels = []

  const wheelRadius = 0.055
  const postInset = 0.045
  const postY = wheelRadius + 0.075
  const postHeight = height - postY

  for (const x of [-width / 2 + postInset, width / 2 - postInset]) {
    for (const z of [-depth / 2 + postInset, depth / 2 - postInset]) {
      const post = bevelledBox(0.035, postHeight, 0.035, 0.005, 1)
      post.translate(x, postY + postHeight / 2, z)
      frame.push(post)

      const fork = new CylinderGeometry(0.011, 0.011, 0.045, 8)
      fork.translate(x, wheelRadius + 0.030, z)
      frame.push(fork)

      const wheel = new CylinderGeometry(wheelRadius, wheelRadius, 0.024, 12)
      wheel.rotateZ(Math.PI / 2)
      wheel.translate(x, wheelRadius, z + 0.012)
      frame.push(wheel)
    }
  }

  const shelfLevels = [0.17, 0.52, 0.87]
  for (const y of shelfLevels) {
    const shelf = bevelledBox(width, 0.035, depth, 0.006, 1)
    shelf.translate(0, y, 0)
    frame.push(shelf)

    // The 55 mm rear lip is why loose boxes stay on a moving trolley and gives
    // every tier a readable horizontal line behind its contents.
    const lip = bevelledBox(width, 0.055, 0.025, 0.004, 1)
    lip.translate(0, y + 0.035, -depth / 2 + 0.0125)
    frame.push(lip)
  }

  const boxSpecs = [
    { level: 0, x: -0.20, w: 0.31, h: 0.27, d: 0.32, z: -0.015 },
    { level: 0, x: 0.18, w: 0.32, h: 0.23, d: 0.34, z: 0.005 },
    { level: 1, x: -0.22, w: 0.28, h: 0.25, d: 0.31, z: 0.015 },
    { level: 1, x: 0.15, w: 0.37, h: 0.29, d: 0.33, z: -0.005 },
    { level: 2, x: -0.18, w: 0.34, h: 0.16, d: 0.30, z: -0.015 },
    { level: 2, x: 0.20, w: 0.29, h: 0.20, d: 0.32, z: 0.008 },
  ]

  for (const spec of boxSpecs) {
    const floor = shelfLevels[spec.level] + 0.0175
    const carton = bevelledBox(spec.w, spec.h, spec.d, 0.009, 1)
    carton.translate(spec.x, floor + spec.h / 2, spec.z)
    boxes.push(carton)

    // Carton lids are folded board, not moulded timber. A crisp box is both
    // materially correct and saves 576 triangles across the trolley.
    const lid = new BoxGeometry(spec.w + 0.015, 0.025, spec.d + 0.015)
    lid.translate(spec.x, floor + spec.h - 0.0125, spec.z)
    boxes.push(lid)

    const label = new BoxGeometry(spec.w * 0.46, 0.045, 0.004)
    label.translate(spec.x, floor + spec.h * 0.58, spec.z + spec.d / 2 + 0.005)
    labels.push(label)
  }

  return {
    frame: finishMixed(frame, 0.34),
    boxes: finishBoxes(boxes, 0.34),
    labels: finishBoxes(labels, 0.16),
  }
}

// ---------------------------------------------------------------------------
// 5. Curator's safe
// Recipe id: office-safe
// ---------------------------------------------------------------------------

/** A tall iron safe with a proud door, external hinges and four-spoke wheel. */
export function buildOfficeSafe({ width = 0.88, depth = 0.65, height = 1.62 } = {}) {
  const body = []
  const hardware = []

  const plinthHeight = 0.12
  const shell = bevelledBox(width, height - plinthHeight, depth, 0.028, 1)
  shell.translate(0, plinthHeight + (height - plinthHeight) / 2, 0)
  body.push(shell)

  const plinth = bevelledBox(width - 0.13, plinthHeight, depth - 0.11, 0.012, 1)
  plinth.translate(0, plinthHeight / 2, -0.012)
  body.push(plinth)

  const cap = bevelledBox(width + 0.025, 0.055, depth + 0.025, 0.012, 1)
  cap.translate(0, height - 0.0275, 0)
  body.push(cap)

  const doorWidth = width - 0.16
  const doorHeight = height - 0.32
  const doorZ = depth / 2 + 0.032
  const door = bevelledBox(doorWidth, doorHeight, 0.075, 0.018, 1)
  door.translate(-0.012, plinthHeight + doorHeight / 2 + 0.065, doorZ)
  body.push(door)

  // A narrow brass arris around the door survives the nearly black iron and
  // outlines its thickness without adding another full metal material.
  const trim = 0.018
  for (const side of [-1, 1]) {
    const stile = new BoxGeometry(trim, doorHeight - 0.055, 0.008)
    stile.translate(side * (doorWidth / 2 - 0.028) - 0.012, plinthHeight + doorHeight / 2 + 0.065, doorZ + 0.041)
    hardware.push(stile)

    const rail = new BoxGeometry(doorWidth - 0.055, trim, 0.008)
    rail.translate(-0.012, plinthHeight + 0.065 + doorHeight / 2 + side * (doorHeight / 2 - 0.028), doorZ + 0.041)
    hardware.push(rail)
  }

  for (const y of [0.52, 1.23]) {
    const hinge = new CylinderGeometry(0.025, 0.025, 0.18, 10)
    hinge.translate(-doorWidth / 2 - 0.045, y, doorZ + 0.016)
    hardware.push(hinge)
  }

  const wheelY = 0.87
  const wheelX = 0.11
  const wheelZ = doorZ + 0.075
  const ring = new TorusGeometry(0.16, 0.013, 6, 20)
  ring.translate(wheelX, wheelY, wheelZ)
  hardware.push(ring)

  for (let index = 0; index < 4; index += 1) {
    const angle = (index * Math.PI) / 2
    const spoke = new CylinderGeometry(0.009, 0.011, 0.145, 8)
    spoke.rotateZ(Math.PI / 2 - angle)
    spoke.translate(
      wheelX + Math.cos(angle) * 0.072,
      wheelY + Math.sin(angle) * 0.072,
      wheelZ,
    )
    hardware.push(spoke)
  }

  const hub = new CylinderGeometry(0.036, 0.036, 0.055, 12)
  hub.rotateX(Math.PI / 2)
  hub.translate(wheelX, wheelY, wheelZ + 0.008)
  hardware.push(hub)

  const keyPlate = bevelledBox(0.055, 0.105, 0.010, 0.009, 1)
  keyPlate.translate(0.27, 0.59, wheelZ - 0.012)
  hardware.push(keyPlate)

  return {
    body: finishBoxes(body, 0.52),
    hardware: finishMixed(hardware, 0.18),
  }
}

// ---------------------------------------------------------------------------
// 6. Visitor armchair
// Recipe id: visitor-chair
// ---------------------------------------------------------------------------

function chairArmCurve(side) {
  return new CatmullRomCurve3(
    [
      new Vector3(side * 0.285, 0.66, 0.245),
      new Vector3(side * 0.295, 0.69, 0.10),
      new Vector3(side * 0.285, 0.715, -0.10),
      new Vector3(side * 0.27, 0.735, -0.255),
    ],
    false,
    'catmullrom',
    0.5,
  )
}

/**
 * A non-swivelling velvet visitor chair with raked back and bowed arm rails.
 * It is deliberately distinct from the captain's desk chair already in office:
 * lower arms, four timber legs and a broad upholstered back read immediately as
 * the pair intended for guests in the concept image. Velvet rather than the
 * desk chair's leather is the other half of that distinction: the curator sits
 * in hide, his visitors in cloth.
 */
export function buildVisitorChair({ seatHeight = 0.44 } = {}) {
  const frame = []
  const upholstery = []
  const studs = []

  const legX = 0.255
  const frontZ = 0.235
  const backZ = -0.235
  const legHeight = seatHeight - 0.055

  for (const x of [-legX, legX]) {
    for (const z of [frontZ, backZ]) {
      const rake = z > 0 ? 0.025 : -0.02
      const leg = lathe(
        [
          [0, 0],
          [0.026, 0],
          [0.030, 0.035],
          [0.022, 0.11],
          [0.020, legHeight - 0.045],
          [0.028, legHeight],
          [0, legHeight],
        ],
        8,
      )
      leg.rotateZ(x > 0 ? -rake : rake)
      // A raked cylinder swings the outer edge of its bottom rim just below
      // its rotation pivot. Lift by that exact projection so the contact ring,
      // rather than the mathematical axis, remains on the floor datum.
      leg.translate(x, Math.abs(Math.sin(rake)) * 0.030, z)
      frame.push(leg)
    }
  }

  const frontRail = bevelledBox(legX * 2 + 0.04, 0.085, 0.045, 0.008, 1)
  frontRail.translate(0, seatHeight - 0.08, frontZ)
  frame.push(frontRail)

  for (const side of [-1, 1]) {
    const sideRail = bevelledBox(0.045, 0.075, frontZ - backZ, 0.007, 1)
    sideRail.translate(side * legX, seatHeight - 0.085, 0)
    frame.push(sideRail)

    const frontPost = lathe(
      [[0, 0], [0.026, 0], [0.029, 0.04], [0.022, 0.18], [0.026, 0.27], [0, 0.29]],
      8,
    )
    frontPost.translate(side * 0.285, seatHeight - 0.02, frontZ)
    frame.push(frontPost)

    const arm = new TubeGeometry(chairArmCurve(side), 10, 0.022, 6, false)
    frame.push(arm)

    const backPost = bevelledBox(0.052, 0.55, 0.052, 0.009, 1)
    backPost.rotateX(-0.10)
    backPost.translate(side * 0.27, 0.68, backZ - 0.025)
    frame.push(backPost)
  }

  /**
   * The cushions. A bevelled slab is a slab however well it is textured, so
   * each upholstered face carries a crowned panel that bulges 12 to 14 mm
   * between its seams, and the seat has piping along the three seams the
   * player can see, which is also what hides the step where the panel meets
   * the slab's rounded border.
   */
  const SEAT = { width: 0.55, height: 0.095, depth: 0.49, radius: 0.032, z: 0.012 }
  const seat = bevelledBox(SEAT.width, SEAT.height, SEAT.depth, SEAT.radius, 2)
  seat.translate(0, seatHeight, SEAT.z)
  upholstery.push(seat)

  const seatTop = seatHeight + SEAT.height / 2
  const seatFlatX = SEAT.width / 2 - SEAT.radius
  const seatFlatZ = SEAT.depth / 2 - SEAT.radius
  const seatCrown = quiltedPanel(seatFlatX * 2, seatFlatZ * 2, { columns: 6, rows: 5, crown: 0.014 })
  // Face up, a hair above the slab's top so the two never z-fight.
  seatCrown.rotateX(-Math.PI / 2)
  seatCrown.translate(0, seatTop + 0.0008, SEAT.z)
  upholstery.push(seatCrown)

  // Front and both sides; the back seam runs under the backrest.
  const pipeY = seatTop + 0.0012
  const pipeBack = SEAT.z - seatFlatZ + 0.05
  const pipeFront = SEAT.z + seatFlatZ
  upholstery.push(
    piping(
      [
        new Vector3(-seatFlatX, pipeY, pipeBack),
        new Vector3(-seatFlatX, pipeY, pipeFront - 0.03),
        new Vector3(-seatFlatX + 0.012, pipeY, pipeFront - 0.006),
        new Vector3(-seatFlatX + 0.04, pipeY, pipeFront),
        new Vector3(seatFlatX - 0.04, pipeY, pipeFront),
        new Vector3(seatFlatX - 0.012, pipeY, pipeFront - 0.006),
        new Vector3(seatFlatX, pipeY, pipeFront - 0.03),
        new Vector3(seatFlatX, pipeY, pipeBack),
      ],
      0.0045,
      { segments: 18, radial: 3 },
    ),
  )

  /**
   * The back, authored upright at its own centre and leaned as one body, so
   * the crown, the nail heads and the slab can never drift apart.
   */
  const BACK = { width: 0.52, height: 0.48, depth: 0.075, radius: 0.032 }
  const placeBack = (geometry) => {
    geometry.rotateX(-0.10)
    geometry.translate(0, 0.73, -0.255)
    return geometry
  }
  upholstery.push(placeBack(bevelledBox(BACK.width, BACK.height, BACK.depth, BACK.radius, 2)))

  const backFlatX = BACK.width / 2 - BACK.radius
  const backFlatY = BACK.height / 2 - BACK.radius
  const backCrown = quiltedPanel(backFlatX * 2, backFlatY * 2, { columns: 5, rows: 5, crown: 0.012 })
  backCrown.translate(0, 0, BACK.depth / 2 + 0.0008)
  upholstery.push(placeBack(backCrown))

  /**
   * Nail heads on the BACK face. The player wakes up behind these two chairs,
   * so the back is the side of them seen first and longest; the old studs on
   * the front face were hidden from the spawn by the chairs themselves. A
   * border of sixteen domes reads as close nailing without spending a stud
   * every centimetre.
   */
  const nailAt = (x, y) => {
    const stud = domeStud(0.0085, 0.0052)
    // Dome along +Y → along -Z, out of the rear face.
    stud.rotateX(-Math.PI / 2)
    stud.translate(x, y, -BACK.depth / 2 + 0.0004)
    studs.push(placeBack(stud))
  }
  const nailX = backFlatX - 0.014
  for (const side of [-1, 1]) {
    for (let index = 0; index < 6; index += 1) {
      nailAt(side * nailX, -backFlatY + 0.018 + index * ((backFlatY * 2 - 0.036) / 5))
    }
  }
  for (const x of [-0.129, -0.043, 0.043, 0.129]) nailAt(x, backFlatY - 0.012)

  return {
    frame: finalize(floorSeat(merge(frame)), {
      crease: Math.PI / 5,
      metresPerTile: 0.36,
    }),
    // Bevelled slabs, crowned panels and piping all carry their own exact
    // normals, so no crease pass.
    upholstery: finishBoxes(upholstery, 0.18),
    studs: finalize(merge(studs), { crease: Math.PI / 2.2, metresPerTile: 0.1 }),
  }
}

// ---------------------------------------------------------------------------
// 7. Coat stand
// Recipe id: coat-stand
// ---------------------------------------------------------------------------

function coatHookCurve(angle, y, upper) {
  const radial = upper ? 0.085 : 0.065
  const lift = upper ? 0.16 : 0.11
  const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle))
  return new CatmullRomCurve3(
    [
      direction.clone().multiplyScalar(0.035).setY(y),
      direction.clone().multiplyScalar(radial).setY(y + 0.015),
      direction.clone().multiplyScalar(radial + 0.08).setY(y + lift * 0.52),
      direction.clone().multiplyScalar(radial + 0.055).setY(y + lift),
    ],
    false,
    'catmullrom',
    0.5,
  )
}

/**
 * A turned oak hall stand with four double hooks and brass finials, still
 * holding the previous curator's felt hat and the umbrella from this
 * afternoon's storm.
 *
 * The two belongings are the room's quietest storytelling: somebody worked
 * here for decades and has only just gone, and it rained. They hang on the
 * side away from the wall sconce, whose bowl sits right above the stand.
 */
export function buildCoatStand({ height = 1.86 } = {}) {
  const wood = []
  const hardware = []
  const hat = []
  const umbrella = []

  const base = lathe(
    [
      [0, 0],
      [0.20, 0],
      [0.22, 0.025],
      [0.18, 0.055],
      [0.105, 0.09],
      [0.075, 0.13],
      [0, 0.15],
    ],
    12,
  )
  wood.push(base)

  const stem = lathe(
    [
      [0, 0],
      [0.058, 0],
      [0.061, 0.05],
      [0.042, 0.13],
      [0.034, 0.58],
      [0.040, 1.23],
      [0.055, 1.42],
      [0.047, 1.60],
      [0.065, 1.67],
      [0, 1.69],
    ],
    12,
  )
  stem.translate(0, 0.15, 0)
  wood.push(stem)

  // Four low feet stop the rotationally symmetric base reading as a bollard.
  for (let index = 0; index < 4; index += 1) {
    const angle = Math.PI / 4 + (index * Math.PI) / 2
    const foot = bevelledBox(0.075, 0.045, 0.34, 0.012, 1)
    foot.translate(0, 0.035, 0.13)
    foot.rotateY(angle)
    wood.push(foot)
  }

  const hookBase = height - 0.31
  for (let index = 0; index < 4; index += 1) {
    const angle = (index * Math.PI) / 2
    for (const upper of [false, true]) {
      const curve = coatHookCurve(angle, hookBase + (upper ? 0.03 : 0), upper)
      const hook = new TubeGeometry(curve, 8, 0.015, 5, false)
      wood.push(hook)

      const tip = curve.getPoint(1)
      // Six by four is still round at 25 mm and leaves the triangle budget for
      // the hat and umbrella, which carry far more of the room's character.
      const finial = new SphereGeometry(0.025, 6, 4)
      finial.translate(tip.x, tip.y, tip.z)
      hardware.push(finial)
    }
  }

  const crown = lathe(
    [[0, 0], [0.048, 0], [0.055, 0.025], [0.038, 0.055], [0.025, 0.085], [0, 0.11]],
    12,
  )
  crown.translate(0, height - 0.11, 0)
  wood.push(crown)

  // A brown felt fedora hung by its crown on the +X upper hook: tilted so the
  // opening faces the stem and the hook disappears inside it.
  // Twenty sides: the brim is the hat's whole silhouette and at fourteen its
  // polygon showed against the wall. Three profile points that only restated
  // near-straight lines (crown top, crown wall, brim underside) pay for them;
  // the centre dent shapes the crown top anyway.
  const fedora = lathe(
    [
      [0, 0.114],
      [0.078, 0.107],
      [0.088, 0.09],
      [0.097, 0.018],
      [0.15, 0.012],
      [0.172, 0.019],
      [0.174, 0.012],
      [0.096, 0.008],
      [0, 0.01],
    ],
    20,
  )
  /**
   * The centre dent. A fedora's crown is creased front to back by the hand
   * that puts it on; without it the lathe is a bowler. Dropped along the
   * lathe's x = 0 meridian, which falls on two of its twenty seams.
   */
  const crownPosition = fedora.attributes.position
  for (let index = 0; index < crownPosition.count; index += 1) {
    const y = crownPosition.getY(index)
    if (y <= 0.09) continue
    const x = crownPosition.getX(index)
    crownPosition.setY(index, y - 0.018 * Math.exp(-((x / 0.03) ** 2)) * ((y - 0.09) / 0.026))
  }

  // A grosgrain band round the base of the crown, two millimetres proud of
  // the felt and tapering with it. It is what makes the hat read as a hat
  // from across the room.
  const hatBand = new CylinderGeometry(0.0967, 0.0988, 0.016, 20, 1, true)
  hatBand.translate(0, 0.027, 0)

  for (const piece of [fedora, hatBand]) {
    piece.scale(1, 1, 0.88)
    piece.rotateZ(-1.25)
    piece.translate(0.155, height - 0.19, 0)
  }
  hat.push(fedora)
  umbrella.push(hatBand)

  // A furled umbrella hooked over the -Z lower hook by a walnut crook. The
  // crook belongs to the stand's timber family; the canopy is black nylon.
  const crookZ = -0.15
  const crookY = height - 0.275
  const crook = new TorusGeometry(0.03, 0.0075, 5, 8, Math.PI)
  crook.rotateY(Math.PI / 2)
  crook.translate(0, crookY, crookZ)
  wood.push(crook)
  const tail = new CylinderGeometry(0.0075, 0.0075, 0.035, 6)
  tail.translate(0, crookY - 0.0175, crookZ + 0.03)
  wood.push(tail)

  const shaftZ = crookZ - 0.03
  const shaftTop = crookY
  const shaftBottom = 0.8
  const shaft = new CylinderGeometry(0.0045, 0.0045, shaftTop - shaftBottom, 6)
  shaft.translate(0, (shaftTop + shaftBottom) / 2, shaftZ)
  umbrella.push(shaft)
  const canopy = lathe(
    [
      [0.006, 0],
      [0.016, 0.02],
      [0.034, 0.14],
      [0.04, 0.3],
      [0.034, 0.48],
      [0.016, 0.58],
      [0.006, 0.6],
    ],
    10,
  )
  canopy.translate(0, 0.86, shaftZ)
  umbrella.push(canopy)
  const ferrule = new CylinderGeometry(0.006, 0.002, 0.05, 6)
  ferrule.translate(0, 0.815, shaftZ)
  umbrella.push(ferrule)

  return {
    wood: finishMixed(wood, 0.34),
    // A 6 × 4 sphere has 60 degrees between neighbouring faces, so the old
    // 36-degree crease cut every brass finial into a faceted gem.
    hardware: finalize(merge(hardware), { crease: Math.PI / 2.2, metresPerTile: 0.10 }),
    // Felt: the velvet maps at a fibre under a millimetre.
    hat: finishMixed(hat, 0.06),
    umbrella: finishMixed(umbrella, 0.2),
  }
}
