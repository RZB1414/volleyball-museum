/**
 * The working props of the opening scene: the curator's notebook, the
 * porter's radio, the stopped electric clock and the door's access panel.
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

import { BoxGeometry, CylinderGeometry, TorusGeometry } from 'three'

import { bevelledBox, finalize, lathe, merge } from '../lib/geometry.mjs'

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
  const pages = []
  const band = []
  const pen = []

  const board = 0.0035
  const blockHeight = thickness - board * 2

  for (const y of [board / 2, thickness - board / 2]) {
    const plate = bevelledBox(width, board, depth, 0.0012, 1)
    plate.translate(0, y, 0)
    cover.push(plate)
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

  // A brass fountain pen, lying on the blotter along the fore-edge.
  const penX = width / 2 + 0.026
  const barrel = new CylinderGeometry(0.0058, 0.0058, 0.096, 12)
  barrel.rotateX(Math.PI / 2)
  barrel.translate(0, 0.0058, -0.012)
  pen.push(barrel)
  const capPiece = new CylinderGeometry(0.0062, 0.0062, 0.05, 12)
  capPiece.rotateX(Math.PI / 2)
  capPiece.translate(0, 0.0062, 0.06)
  pen.push(capPiece)
  const nib = new CylinderGeometry(0.0058, 0.0012, 0.022, 10)
  nib.rotateX(-Math.PI / 2)
  nib.translate(0, 0.0058, -0.071)
  pen.push(nib)
  pen.push(plainBox(0.0022, 0.0028, 0.04, 0.0058, 0.0092, 0.058))
  for (const geometry of pen) {
    geometry.rotateY(0.1)
    geometry.translate(penX, 0, 0)
  }

  return {
    cover: finalize(merge(cover), { crease: null, metresPerTile: 0.16 }),
    pages: finalize(merge(pages), { crease: null, metresPerTile: 0.12 }),
    band: finalize(merge(band), { crease: null, metresPerTile: 0.1 }),
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
 * reaches the building's one other person. Front is +Z. The display window and
 * both indicator lenses belong to the `led` family, which the runtime lights
 * when the charger has power: a dark radio and a live one read differently
 * from across the room without any extra light source.
 */
export function buildDeskRadio() {
  const body = []
  const metal = []
  const led = []

  // The charger: a low cradle with a front lip the radio leans against.
  const cradle = bevelledBox(0.09, 0.026, 0.072, 0.007, 1)
  cradle.translate(0, 0.013, 0)
  body.push(cradle)
  const lip = bevelledBox(0.08, 0.016, 0.01, 0.003, 1)
  lip.translate(0, 0.034, 0.031)
  body.push(lip)
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
  body.push(...radioBody)
  metal.push(...radioMetal)
  led.push(...radioLed)

  return {
    body: finalize(merge(body), { crease: Math.PI / 5, metresPerTile: 0.12 }),
    metal: finalize(merge(metal), { crease: null, metresPerTile: 0.08 }),
    led: finalize(merge(led), { crease: null, metresPerTile: 0.05 }),
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
