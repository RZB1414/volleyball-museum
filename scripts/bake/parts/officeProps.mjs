/**
 * The working props of the opening scene: the curator's notebook, the
 * porter's radio, the stopped electric clock, the door's access panel, the
 * desk telephone and the answering machine beside it.
 *
 * They follow the office conventions. Desk props stand on y = 0, their support
 * datum. Wall props sit on the wall plane z = 0, project into the room along
 * +Z and stand up from y = 0, like the breaker panel in fixtures.mjs. Every key
 * in a returned object is a material family of ONE recipe.
 *
 * Two families are addressed by the runtime through their node names: the
 * clock's `__hand-*` nodes, which turn about the dial centre, and the `__led`
 * lenses, which swap to a lit material when the room has power. The content
 * validator checks those names, so a renamed node fails the gate instead of
 * shipping a clock that never moves.
 */

import {
  BoxGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three'

import {
  bevelledBox,
  finalize,
  lathe,
  merge,
  profileShape,
  roundedSlab,
} from '../lib/geometry.mjs'

function plainBox(width, height, depth, x, y, z) {
  const geometry = new BoxGeometry(width, height, depth)
  geometry.translate(x, y, z)
  return geometry
}

/** Slides a finished geometry onto a datum along one axis, measured not asserted. */
function seat(geometry, axis, edge, value = 0) {
  geometry.computeBoundingBox()
  const offset = value - geometry.boundingBox[edge][axis]
  geometry.translate(
    axis === 'x' ? offset : 0,
    axis === 'y' ? offset : 0,
    axis === 'z' ? offset : 0,
  )
  return geometry
}

// ---------------------------------------------------------------------------
// 1. The curator's notebook
// Recipe id: curator-notebook
// ---------------------------------------------------------------------------

/**
 * A closed, cloth-bound A5 notebook with an elastic band and a brass pen.
 *
 * It is the first object the player is asked to read, found by torchlight on a
 * green leather blotter, so the cover is crimson: the complementary colour is
 * what makes it readable in a single cone of light. The cream fore-edge is the
 * second cue — a pale stripe is the brightest thing on a dark desk.
 *
 * Lying flat, spine on -X, fore-edge on +X. The pen lies beside it on the
 * blotter rather than on the cover, so the object reads as closed and put down.
 */
export function buildCuratorNotebook({ width = 0.15, depth = 0.212, thickness = 0.026 } = {}) {
  const cover = []
  const coverBoards = []
  const pages = []
  const band = []
  const bandRound = []
  const pen = []

  const board = 0.0035
  const blockHeight = thickness - board * 2

  // Boards with 4 mm rounded corners: a cloth case is turned over its board
  // and never has a square corner, and a chamfered box always does.
  for (const y of [board / 2, thickness - board / 2]) {
    const plate = roundedSlab(width, depth, board, 0.004, 3)
    plate.translate(0, y, 0)
    coverBoards.push(plate)
  }

  // The rounded spine wraps both boards, so the boards never show a raw edge
  // on the side the player is most likely to see first.
  const spine = bevelledBox(0.009, thickness, depth, 0.004, 1)
  spine.translate(-width / 2 + 0.0045, thickness / 2, 0)
  cover.push(spine)

  // Inset 3 mm on three sides: the overhang of the boards is what tells a
  // bound book from a block of wood.
  const block = bevelledBox(width - 0.01, blockHeight, depth - 0.006, 0.0015, 1)
  block.translate(-0.002, board + blockHeight / 2, 0)
  pages.push(block)

  // Headbands at both ends of the block, against the spine.
  for (const side of [-1, 1]) {
    band.push(plainBox(0.006, blockHeight - 0.001, 0.0015, -width / 2 + 0.012, board + blockHeight / 2, side * (depth / 2 - 0.0035)))
  }

  // The elastic closure runs over the top board and down both ends. Its run
  // under the lower board is never visible and would break the y = 0 datum.
  const bandX = width / 2 - 0.024
  band.push(plainBox(0.006, 0.0012, depth + 0.002, bandX, thickness + 0.0006, 0))
  for (const side of [-1, 1]) {
    band.push(
      plainBox(
        0.006,
        thickness + 0.0012,
        0.0012,
        bandX,
        (thickness + 0.0012) / 2,
        side * (depth / 2 + 0.0006),
      ),
    )
  }
  // A ribbon marker escapes the page block at the tail.
  const ribbon = plainBox(0.006, 0.0007, 0.055, -0.03, board + blockHeight * 0.6, depth / 2 + 0.024)
  ribbon.rotateY(0.08)
  band.push(ribbon)

  // A gilt-stamped title panel on the front board.
  pen.push(plainBox(0.05, 0.0004, 0.018, -0.004, thickness + 0.0002, -0.052))

  /**
   * A black fountain pen with gold furniture, lying on the blotter along the
   * fore-edge. It used to be brass from end to end, which read as a rod. The
   * barrel and cap join the elastic's black family, so the change costs no
   * draw call; nib, clip and cap band stay brass.
   */
  const penPieces = []
  const barrel = new CylinderGeometry(0.0058, 0.0058, 0.096, 12)
  barrel.rotateX(Math.PI / 2)
  barrel.translate(0, 0.0058, -0.012)
  penPieces.push([barrel, bandRound])
  const capPiece = new CylinderGeometry(0.0062, 0.0062, 0.05, 12)
  capPiece.rotateX(Math.PI / 2)
  capPiece.translate(0, 0.0062, 0.06)
  penPieces.push([capPiece, bandRound])
  const capBand = new CylinderGeometry(0.0065, 0.0065, 0.003, 12, 1, true)
  capBand.rotateX(Math.PI / 2)
  // Its centre lifted with its radius, so the ring stands on the blotter
  // rather than 0.3 mm into it.
  capBand.translate(0, 0.0065, 0.0375)
  penPieces.push([capBand, pen])
  const nib = new CylinderGeometry(0.0058, 0.0012, 0.022, 10)
  nib.rotateX(-Math.PI / 2)
  nib.translate(0, 0.0058, -0.071)
  penPieces.push([nib, pen])
  penPieces.push([plainBox(0.0022, 0.0028, 0.04, 0.0058, 0.0092, 0.058), pen])
  const penX = width / 2 + 0.026
  for (const [geometry, family] of penPieces) {
    geometry.rotateY(0.1)
    geometry.translate(penX, 0, 0)
    family.push(geometry)
  }

  // Round and flat pieces keep different normals: the crease pass rounds the
  // cylinders and the boards' corners and must not touch a bevelled box.
  const blend = (creased, exact, metresPerTile) =>
    finalize(
      merge([
        creased.length > 0 ? finalize(merge(creased), { crease: Math.PI / 5, metresPerTile }) : null,
        exact.length > 0 ? finalize(merge(exact), { crease: null, metresPerTile }) : null,
      ]),
      { uv: 'none', crease: null },
    )

  return {
    // Book cloth: the canvas weave at about a millimetre a thread.
    cover: blend(coverBoards, cover, 0.05),
    // Paper striation on the fore-edge, 0.6 mm a page.
    pages: finalize(merge(pages), { crease: null, metresPerTile: 0.02 }),
    band: blend(bandRound, band, 0.1),
    pen: finalize(merge(pen), { crease: Math.PI / 5, metresPerTile: 0.08 }),
  }
}

// ---------------------------------------------------------------------------
// 2. The porter's radio
// Recipe id: desk-radio
// ---------------------------------------------------------------------------

/**
 * A handheld two-way radio standing in its desk charger.
 *
 * The museum is contemporary even where its collection is not, so this is a
 * modern handheld rather than a period set: it is how a night porter actually
 * reaches the building's one other person. Front is +Z. The charger's lamp
 * (`led`) and the handset's display and lens (`handset-led`) are lenses the
 * runtime lights when the charger has power: a dark radio and a live one read
 * differently from across the room without any extra light source.
 *
 * The handset is its own three families (`handset`, `handset-metal`,
 * `handset-led`) rather than sharing the cradle's: the player takes it on the
 * first use, and the runtime hides those nodes while the charger stays on the
 * desk with its lamp still lit. Same triangles either way; two more draw calls
 * while it stands on the desk, three fewer once it has gone.
 */
export function buildDeskRadio() {
  const body = []
  const led = []

  // The charger: a low cradle with a front lip the radio leans against.
  const cradle = bevelledBox(0.09, 0.026, 0.072, 0.007, 1)
  cradle.translate(0, 0.013, 0)
  body.push(cradle)
  const lip = bevelledBox(0.08, 0.016, 0.01, 0.003, 1)
  lip.translate(0, 0.034, 0.031)
  body.push(lip)
  // Side cheeks and a low back rail make a pocket the handset drops into.
  // Once it has gone with the player, the empty well is what says that
  // something lives here, instead of a plain black brick on the desk.
  for (const side of [-1, 1]) {
    const cheek = bevelledBox(0.008, 0.01, 0.062, 0.002, 1)
    cheek.translate(side * 0.0405, 0.031, -0.004)
    body.push(cheek)
  }
  const rail = bevelledBox(0.073, 0.008, 0.006, 0.002, 1)
  rail.translate(0, 0.03, -0.033)
  body.push(rail)
  led.push(plainBox(0.009, 0.004, 0.002, 0.031, 0.015, 0.0365))

  // The handset, authored upright at its own origin and then leaned back into
  // the cradle as one rigid body.
  const radioBody = []
  const radioMetal = []
  const radioLed = []

  const housing = bevelledBox(0.062, 0.128, 0.034, 0.008, 1)
  housing.translate(0, 0.064, 0)
  radioBody.push(housing)
  const shoulder = bevelledBox(0.054, 0.012, 0.028, 0.004, 1)
  shoulder.translate(0, 0.133, 0)
  radioBody.push(shoulder)

  const antenna = lathe(
    [
      [0, 0],
      [0.0078, 0],
      [0.0074, 0.012],
      [0.0056, 0.022],
      [0.0052, 0.074],
      [0.0036, 0.081],
      [0, 0.083],
    ],
    10,
  )
  antenna.translate(-0.016, 0.138, 0)
  radioBody.push(antenna)

  const knob = new CylinderGeometry(0.0085, 0.0085, 0.014, 12)
  knob.translate(0.014, 0.146, 0)
  radioBody.push(knob)
  // Push-to-talk bar on the left flank: the one control a porter uses.
  radioBody.push(plainBox(0.004, 0.028, 0.012, -0.0325, 0.09, 0))

  // Speaker slots stand a millimetre proud of the face so they catch light.
  for (let index = 0; index < 6; index += 1) {
    radioMetal.push(plainBox(0.04, 0.0028, 0.002, 0, 0.026 + index * 0.0085, 0.0175))
  }
  radioMetal.push(plainBox(0.05, 0.002, 0.002, 0, 0.118, 0.0175))

  radioLed.push(plainBox(0.034, 0.014, 0.002, 0, 0.101, 0.0178))
  const lens = new CylinderGeometry(0.0032, 0.0032, 0.004, 10)
  lens.translate(0.001, 0.1405, 0.006)
  radioLed.push(lens)

  for (const geometry of [...radioBody, ...radioMetal, ...radioLed]) {
    geometry.rotateX(-0.1)
    geometry.translate(0, 0.022, -0.004)
  }

  return {
    // Bevelled boxes only, so `crease: null` keeps their authored normals.
    body: finalize(merge(body), { crease: null, metresPerTile: 0.12 }),
    led: finalize(merge(led), { crease: null, metresPerTile: 0.05 }),
    handset: finalize(merge(radioBody), { crease: Math.PI / 5, metresPerTile: 0.12 }),
    'handset-metal': finalize(merge(radioMetal), { crease: null, metresPerTile: 0.08 }),
    'handset-led': finalize(merge(radioLed), { crease: null, metresPerTile: 0.05 }),
  }
}

// ---------------------------------------------------------------------------
// 3. The electric wall clock
// Recipe id: office-wall-clock
// ---------------------------------------------------------------------------

/**
 * A synchronous-motor office clock: walnut drum, brass bezel, cream dial.
 *
 * Authored on the wall plane and standing up from y = 0, so the dial centre
 * sits at y = outer radius. The three hands point at twelve and turn about the
 * dial centre at runtime; they are separate nodes for that reason alone. A
 * synchronous clock does not catch up after a power cut — it resumes from where
 * it stopped — which is why the stopped time is a story the room can tell.
 *
 * The markers share the brass family with the bezel. A dark marker family
 * would be one more draw call in a room the player is standing in from the
 * first frame, for detail that reads just as well in brass.
 */
export function buildWallClock({ radius = 0.165 } = {}) {
  const casing = []
  const bezel = []
  const dial = []
  const hourHand = []
  const minuteHand = []
  const secondHand = []

  const outer = radius + 0.024
  const centreY = outer

  // The drum, turned about Z: lathe about Y, then stand the axis on +Z.
  const drum = lathe(
    [
      [0, 0],
      [outer - 0.004, 0],
      [outer, 0.006],
      [outer, 0.03],
      [outer - 0.006, 0.04],
      [radius + 0.004, 0.042],
      [radius, 0.036],
      [0, 0.036],
    ],
    40,
  )
  drum.rotateX(Math.PI / 2)
  drum.translate(0, centreY, 0)
  casing.push(drum)

  const ring = new TorusGeometry(radius + 0.006, 0.0055, 6, 48)
  ring.translate(0, centreY, 0.043)
  bezel.push(ring)

  const face = new CylinderGeometry(radius, radius, 0.003, 48)
  face.rotateX(Math.PI / 2)
  face.translate(0, centreY, 0.0375)
  dial.push(face)

  // Twelve hour markers, doubled at the quarters so the time reads at a glance.
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2
    const quarter = index % 3 === 0
    const length = quarter ? 0.028 : 0.018
    const offsets = quarter ? [-0.0042, 0.0042] : [0]
    for (const offset of offsets) {
      const marker = new BoxGeometry(0.0045, length, 0.0016)
      marker.translate(offset, radius - 0.016 - length / 2, 0)
      marker.rotateZ(-angle)
      marker.translate(0, centreY, 0.0398)
      bezel.push(marker)
    }
  }

  const centreCap = new CylinderGeometry(0.0068, 0.0068, 0.006, 14)
  centreCap.rotateX(Math.PI / 2)
  centreCap.translate(0, centreY, 0.0468)
  bezel.push(centreCap)

  // Each hand is authored at twelve with a short tail through the pivot.
  const hand = (target, { width, length, tail, z, depth = 0.0018 }) => {
    const bar = new BoxGeometry(width, length + tail, depth)
    bar.translate(0, centreY + (length - tail) / 2, z)
    target.push(bar)
  }
  hand(hourHand, { width: 0.0105, length: 0.088, tail: 0.016, z: 0.0405 })
  const spade = new CylinderGeometry(0.0115, 0.0115, 0.0018, 4)
  spade.rotateX(Math.PI / 2)
  spade.rotateZ(Math.PI / 4)
  spade.scale(0.8, 1.15, 1)
  spade.translate(0, centreY + 0.064, 0.0405)
  hourHand.push(spade)
  hand(minuteHand, { width: 0.0072, length: 0.132, tail: 0.02, z: 0.0425 })
  hand(secondHand, { width: 0.0026, length: 0.142, tail: 0.034, z: 0.0445, depth: 0.0014 })
  const counterweight = new CylinderGeometry(0.0055, 0.0055, 0.0014, 12)
  counterweight.rotateX(Math.PI / 2)
  counterweight.translate(0, centreY - 0.028, 0.0445)
  secondHand.push(counterweight)

  return {
    casing: finalize(seat(merge(casing), 'z', 'min', 0), { crease: Math.PI / 5, metresPerTile: 0.4 }),
    bezel: finalize(merge(bezel), { crease: Math.PI / 5, metresPerTile: 0.12 }),
    dial: finalize(merge(dial), { crease: Math.PI / 4, metresPerTile: 0.34 }),
    'hand-hour': finalize(merge(hourHand), { crease: null, metresPerTile: 0.1 }),
    'hand-minute': finalize(merge(minuteHand), { crease: null, metresPerTile: 0.1 }),
    'hand-second': finalize(merge(secondHand), { crease: null, metresPerTile: 0.1 }),
  }
}

// ---------------------------------------------------------------------------
// 4. The door's access panel
// Recipe id: door-access-panel
// ---------------------------------------------------------------------------

/**
 * The electric lock's reader beside the office door: card slot, keypad, lamp.
 *
 * Its whole job is to explain, without a word of UI, why the door will not
 * open: the lamp burns red while the room has no power and green once it does.
 * It is the only red light in the office besides the desk lamp's locator, so
 * the player who turns round from the desk finds the door by it.
 */
export function buildDoorAccessPanel({ width = 0.086, height = 0.142, depth = 0.022 } = {}) {
  const plate = []
  const trim = []
  const led = []

  const housing = bevelledBox(width, height, depth, 0.006, 1)
  housing.translate(0, height / 2, depth / 2)
  plate.push(housing)

  // Card slot: a pair of brass rails framing a dark groove.
  const slotY = height * 0.6
  for (const side of [-1, 1]) {
    trim.push(plainBox(width - 0.026, 0.0028, 0.004, 0, slotY + side * 0.0048, depth + 0.002))
  }

  // A three-by-four keypad, proud of the plate so each key catches the torch.
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      trim.push(
        plainBox(0.0115, 0.0085, 0.003, (column - 1) * 0.0175, 0.022 + row * 0.0135, depth + 0.0015),
      )
    }
  }

  const lens = new CylinderGeometry(0.0068, 0.0068, 0.004, 14)
  lens.rotateX(Math.PI / 2)
  lens.translate(0, height - 0.021, depth + 0.002)
  led.push(lens)

  return {
    plate: finalize(seat(merge(plate), 'z', 'min', 0), { crease: null, metresPerTile: 0.12 }),
    trim: finalize(merge(trim), { crease: null, metresPerTile: 0.06 }),
    led: finalize(merge(led), { crease: Math.PI / 5, metresPerTile: 0.04 }),
  }
}

// ---------------------------------------------------------------------------
// 5. The desk telephone
// Recipe id: desk-telephone
// ---------------------------------------------------------------------------

/**
 * A 1930s bakelite desk set: moulded base, rotary dial, cradle horns, the
 * handset lying across them and its cord. Front (the dial) is +Z, the handset
 * runs along X, and it stands on y = 0 like every desk prop.
 *
 * It used to be four primitives in the desk's cast-iron family: a matte grey
 * metal block, half of it buried in the ledgers. Phenolic resin is near black
 * and glossy, so the object reads by its highlights, and highlights need real
 * curvature: a moulded profile, a dial ring, rounded cups. The finger wheel is
 * the one detail worth its triangles, since ten pale holes in a black wheel is
 * the shape everybody knows as a telephone. Holes cannot be cut without CSG,
 * so the wheel is drawn the other way round: black webs over the cream card.
 */
export function buildDeskTelephone() {
  const bakelite = []
  const bakeliteSmooth = []
  const card = []

  // ---- the base: one side profile extruded across the width ---------------
  // Profile in (depth, height) with the dial slope at -x; convex, so the
  // extrusion's bevel can inflate it without folding. The bevel rounds both
  // side ends and the crease pass rounds the profile's own turns.
  const PROFILE = [
    [0.085, 0],
    [0.088, 0.01],
    [0.08, 0.038],
    [0.068, 0.048],
    [0.035, 0.053],
    [0, 0.0525],
    [-0.026, 0.05],
    [-0.082, 0.01],
    [-0.088, 0.004],
    [-0.085, 0],
  ]
  const BEVEL = 0.012
  const body = new ExtrudeGeometry(profileShape(PROFILE), {
    depth: 0.12,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelOffset: 0,
    curveSegments: 4,
  })
  body.translate(0, 0, -0.06)
  // Width onto X and the slope towards +Z: rotateY maps profile -x to +z.
  body.rotateY(Math.PI / 2)
  body.computeBoundingBox()
  // The bevel inflates the outline, its foot included, by BEVEL.
  const lift = -body.boundingBox.min.y
  body.translate(0, lift, 0)
  bakelite.push(body)
  const toObject = ([x, y]) => [-x, y + lift] // profile → object (z, y)
  const baseTop = PROFILE[4][1] + BEVEL + lift

  // ---- cradle: two horns, and the plungers between them -------------------
  const hornZ = -0.035
  const hornHeight = 0.036
  for (const side of [-1, 1]) {
    const horn = lathe(
      [
        [0, 0],
        [0.011, 0],
        [0.01, 0.022],
        [0.0075, 0.034],
        [0, hornHeight],
      ],
      8,
    )
    horn.translate(side * 0.055, baseTop - 0.004, hornZ)
    bakelite.push(horn)
    bakelite.push(plainBox(0.016, 0.008, 0.012, side * 0.022, baseTop + 0.002, hornZ))
  }

  // ---- the dial, square to the middle of the front slope ------------------
  const [ax, ay] = PROFILE[6]
  const [bx, by] = PROFILE[7]
  const slopeLength = Math.hypot(bx - ax, by - ay)
  // The outline runs anticlockwise, so (dy, -dx) is its outward normal.
  const normal = [(by - ay) / slopeLength, -(bx - ax) / slopeLength]
  const [dialZ, dialY] = toObject([(ax + bx) / 2 + normal[0] * BEVEL, (ay + by) / 2 + normal[1] * BEVEL])
  // Turns the dial's +Z onto the slope's outward normal, (0, ny, -nx).
  const tilt = -Math.atan2(normal[1], -normal[0])

  const RADIUS = { ring: 0.034, card: 0.0272, rim: 0.0245, hub: 0.011, holes: 0.018 }
  const dialPieces = []
  const ring = lathe(
    [
      [RADIUS.card - 0.0002, 0],
      [RADIUS.ring - 0.001, 0],
      [RADIUS.ring, 0.0035],
      [RADIUS.ring - 0.005, 0.006],
      [RADIUS.card - 0.0005, 0.0042],
    ],
    20,
  )
  ring.rotateX(Math.PI / 2)
  dialPieces.push([ring, bakelite])
  // The number card, recessed inside the ring.
  const numberCard = new CircleGeometry(RADIUS.card, 20)
  numberCard.translate(0, 0, 0.0012)
  dialPieces.push([numberCard, card])

  // The finger wheel above it: hub, rim, nine webs between ten holes, and the
  // solid sector at the finger stop. "1" is at two o'clock, the holes run
  // anticlockwise to "0" at five, and the stop sits at four.
  const WHEEL_Z = 0.0042
  const hub = new CylinderGeometry(RADIUS.hub, RADIUS.hub, 0.003, 12)
  hub.rotateX(Math.PI / 2)
  hub.translate(0, 0, WHEEL_Z)
  dialPieces.push([hub, bakelite])
  const rim = lathe(
    [
      [RADIUS.rim, WHEEL_Z - 0.0015],
      [RADIUS.card, WHEEL_Z - 0.0015],
      [RADIUS.card, WHEEL_Z + 0.0015],
      [RADIUS.rim, WHEEL_Z + 0.0015],
      [RADIUS.rim, WHEEL_Z - 0.0015],
    ],
    20,
  )
  rim.rotateX(Math.PI / 2)
  dialPieces.push([rim, bakelite])
  const HOLE_STEP = Math.PI / 6
  const FIRST_HOLE = Math.PI / 6
  const webLength = RADIUS.rim - RADIUS.hub + 0.001
  for (let index = 0; index < 9; index += 1) {
    const web = new BoxGeometry(webLength, 0.0028, 0.003)
    web.translate((RADIUS.rim + RADIUS.hub) / 2, 0, WHEEL_Z)
    web.rotateZ(FIRST_HOLE + (index + 0.5) * HOLE_STEP)
    dialPieces.push([web, bakelite])
  }
  // A cylinder's theta runs from +Z towards +X; laid on +Z by rotateX(PI/2)
  // it starts at -Y, so a polar angle phi is theta = phi + PI/2.
  const sectorStart = FIRST_HOLE + 9.5 * HOLE_STEP
  const sector = new CylinderGeometry(
    RADIUS.rim + 0.0005,
    RADIUS.rim + 0.0005,
    0.003,
    4,
    1,
    false,
    sectorStart + Math.PI / 2,
    Math.PI * 2 - 10 * HOLE_STEP,
  )
  sector.rotateX(Math.PI / 2)
  sector.translate(0, 0, WHEEL_Z)
  dialPieces.push([sector, bakelite])
  const fingerStop = new BoxGeometry(0.0035, 0.01, 0.005)
  fingerStop.translate(RADIUS.card + 0.002, 0, 0.0058)
  fingerStop.rotateZ(-Math.PI / 6)
  dialPieces.push([fingerStop, bakelite])
  const label = new CircleGeometry(0.0075, 12)
  label.translate(0, 0, WHEEL_Z + 0.0018)
  dialPieces.push([label, card])
  for (const [geometry, family] of dialPieces) {
    geometry.rotateX(tilt)
    geometry.translate(0, dialY, dialZ)
    family.push(geometry)
  }

  // ---- handset, resting across the horns ----------------------------------
  const hornTip = baseTop - 0.004 + hornHeight
  const GRIP = 0.012
  const handsetBow = [
    [-0.1, -0.012],
    [-0.06, 0.004],
    [0, 0.01],
    [0.06, 0.004],
    [0.1, -0.012],
  ]
  // The bow is 4.5 mm up at the horns (x = ±0.055): sit the grip on the tips.
  const handsetY = hornTip + GRIP - 0.0045 - 0.001
  bakeliteSmooth.push(
    new TubeGeometry(
      new CatmullRomCurve3(handsetBow.map(([x, y]) => new Vector3(x, handsetY + y, hornZ))),
      16,
      GRIP,
      8,
      false,
    ),
  )
  // Ear and mouth cups, open side down as they hang on the cradle, their tops
  // sunk into the ends of the grip.
  const cupBase = handsetY - 0.012 - 0.026
  for (const side of [-1, 1]) {
    const cup = lathe(
      [
        [0, 0.004],
        [0.02, 0.002],
        [0.029, 0],
        [0.03, 0.006],
        [0.026, 0.018],
        [0.016, 0.028],
        [0, 0.03],
      ],
      12,
    )
    cup.translate(side * 0.1, cupBase, hornZ)
    bakelite.push(cup)
  }

  // ---- the cord, from the mouthpiece down to the desk and into the back ---
  // A uniform Catmull-Rom with soft tension: the default centripetal spline
  // swung 2.4 mm below the two points that lay the cord on the desk, and put
  // the whole telephone through the leather.
  const CORD = 0.0035
  bakeliteSmooth.push(
    new TubeGeometry(
      new CatmullRomCurve3(
        [
          new Vector3(0.1, cupBase + 0.012, hornZ - 0.018),
          new Vector3(0.113, cupBase - 0.02, hornZ - 0.045),
          new Vector3(0.108, CORD + 0.0015, -0.085),
          new Vector3(0.07, CORD + 0.0015, -0.122),
          new Vector3(0.035, 0.012, -0.094),
        ],
        false,
        'catmullrom',
        0.3,
      ),
      20,
      CORD,
      4,
      false,
    ),
  )

  // Lathes and the extrusion need a crease: 52 degrees rounds the eight-sided
  // horns and keeps the base's square foot. The tubes bring exact normals.
  const moulding = finalize(
    merge([
      finalize(merge(bakelite), { crease: 0.9, metresPerTile: 0.2 }),
      finalize(merge(bakeliteSmooth), { crease: null, metresPerTile: 0.2 }),
    ]),
    { uv: 'none', crease: null },
  )
  const numbers = finalize(merge(card), { crease: null, metresPerTile: 0.1 })
  // Both families stand on the lowest point of either, measured: a datum
  // asserted from the profile is exactly what the cord broke.
  const floor = Math.min(moulding.boundingBox.min.y, numbers.boundingBox.min.y)
  for (const family of [moulding, numbers]) {
    family.translate(0, -floor, 0)
    family.computeBoundingBox()
  }
  return { body: moulding, card: numbers }
}

// ---------------------------------------------------------------------------
// 6. The answering machine
// Recipe id: office-answering-machine
// ---------------------------------------------------------------------------

/**
 * A desk answering machine of the cassette years: a low black case, the lid
 * of the tape well raised at the back, a slotted speaker, a row of keys along
 * the front and a message lamp on top. Front (the keys) is +Z; it stands on
 * y = 0 like every desk prop, 0.15 m wide and 0.21 m from front to back, so
 * that it fits the strip of walnut between the blotter and the desk's edge.
 *
 * Three families, as few as say what it is. `led` is the lamp, a lens the
 * runtime lights and darkens: it blinks while a message waits unheard, and
 * it is on top, where it shows from every side of the desk. `play` is the
 * row of keys, in brass against the black so that the one thing to press
 * reads from across the room. Everything else is the case.
 */
export function buildAnsweringMachine({ width = 0.15, depth = 0.21, height = 0.046 } = {}) {
  const body = []
  const play = []
  const led = []

  const front = depth / 2

  const housing = bevelledBox(width, height, depth, 0.006, 1)
  housing.translate(0, height / 2, 0)
  body.push(housing)

  // The lid of the tape well, a few millimetres proud at the back.
  const lid = { width: 0.108, depth: 0.092, rise: 0.007, z: -0.046 }
  const well = bevelledBox(lid.width, lid.rise, lid.depth, 0.003, 1)
  well.translate(-0.012, height + lid.rise / 2 - 0.001, lid.z)
  body.push(well)

  // The speaker, as slots standing a millimetre proud so that they catch the
  // lamp: black on black is read by its edges or not at all.
  for (let slot = 0; slot < 4; slot += 1) {
    body.push(plainBox(0.058, 0.0015, 0.004, -0.034, height + 0.00075, 0.018 + slot * 0.0095))
  }

  // Five keys in a row along the front edge.
  const key = { width: 0.02, depth: 0.017, rise: 0.006, pitch: 0.026 }
  for (let index = -2; index <= 2; index += 1) {
    play.push(plainBox(key.width, key.rise, key.depth, index * key.pitch, height + key.rise / 2, front - 0.022))
  }

  // The message lamp: a low lens on top, to the right of the speaker.
  const lens = new CylinderGeometry(0.0065, 0.0075, 0.005, 8)
  lens.translate(0.046, height + 0.0025, 0.034)
  led.push(lens)

  return {
    // Bevelled and plain boxes only, so `crease: null` keeps their normals.
    body: finalize(merge(body), { crease: null, metresPerTile: 0.15 }),
    play: finalize(merge(play), { crease: null, metresPerTile: 0.08 }),
    led: finalize(merge(led), { crease: Math.PI / 5, metresPerTile: 0.05 }),
    layout: { width, depth, height: height + lid.rise - 0.001, front },
  }
}
