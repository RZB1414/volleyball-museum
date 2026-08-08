/**
 * The curator's office.
 *
 * The plan's one safe room, and the only room in the building specified down to
 * a named object — "the room with the green lamp". Everything here is furniture
 * rather than architecture, which changes what the geometry has to do: a wall is
 * read at four metres and a desk is read at sixty centimetres, so the detail
 * that earns its triangles is the moulded edge, the graduated drawer, the turned
 * knob — the two centimetres of profile you only ever see close up.
 *
 * A NOTE ON `segments: 1` EVERYWHERE BELOW. Every part in this file mixes
 * bevelled boxes with lathes or sweeps, so every part has to run a crease pass,
 * and `toCreasedNormals` groups vertices on a 1 cm hash. At `segments: 2` a
 * bevelled box's inner bevel facet sits 22.5 degrees off the flat face — inside
 * a Math.PI/5 crease — so the flat face's corner normals get averaged with the
 * bevel and the face renders pillowed. At `segments: 1` the single chamfer facet
 * is 45 degrees off, outside the crease, so the flat face keeps its true normal
 * and the chamfer stays a crisp arris. It is also 108 triangles instead of 300.
 * Cheaper AND more correct is rare; take it every time.
 */

import {
  CatmullRomCurve3,
  CylinderGeometry,
  TubeGeometry,
  Vector3,
} from 'three'

import {
  bevelledBox,
  finalize,
  lathe,
  merge,
  sweepProfile,
} from '../lib/geometry.mjs'

/**
 * A turned mushroom knob, authored about +Y and stood up to face +Z.
 *
 * Wood, not brass: a brass drop handle would be a second material on a part
 * that is otherwise one lump of mahogany, and splitting a desk into two draw
 * calls to gild nine knobs is a bad trade. Four profile points is enough — the
 * knob is 38 mm across and the silhouette is all anyone resolves.
 */
function turnedKnob() {
  const knob = lathe(
    [
      [0, 0],
      [0.011, 0.003],
      [0.019, 0.013],
      [0.012, 0.027],
      [0, 0.030],
    ],
    8,
  )
  knob.rotateX(Math.PI / 2)
  return knob
}

// ---------------------------------------------------------------------------
// 1. The desk
// ---------------------------------------------------------------------------

const TOP_THICKNESS = 0.038
/** How far the moulded edge stands proud of the top's core slab. */
const TOP_PROUD = 0.022

/**
 * The top's edge moulding: an ovolo with a quirk under it.
 *
 * Authored in XY with +X pointing OUT from the core slab's face and Y running
 * from the underside of the top. Swept, not stacked: four runs of this profile
 * cost 320 triangles all in, where the same silhouette built from three
 * stacked bevelled boxes would cost 324 per side.
 */
const TOP_EDGE_PROFILE = [
  [0, 0],
  [0.016, 0.001],
  [0.022, 0.009],
  [0.019, 0.020],
  [0.022, 0.027],
  [0.012, 0.038],
  [0, 0.038],
]

/**
 * A pedestal desk: drawers down one side, legs down the other.
 *
 * The asymmetry is the whole point and it is not decoration — it is what a real
 * pedestal desk is. Generated furniture reads as generated because a generator
 * mirrors everything it can, so the give-away is a desk with a matching bank of
 * drawers at each end. This one has a single pedestal on the left, two turned
 * legs on the right, and two frieze drawers over the knee hole that are
 * deliberately unequal in width.
 */
export function buildCuratorDesk({ width = 1.5, depth = 0.78, height = 0.74 } = {}) {
  const parts = []

  const coreWidth = width - TOP_PROUD * 2
  const coreDepth = depth - TOP_PROUD * 2
  const underside = height - TOP_THICKNESS

  // ---- top ---------------------------------------------------------------
  const core = bevelledBox(coreWidth, TOP_THICKNESS, coreDepth, 0.004, 1)
  core.translate(0, underside + TOP_THICKNESS / 2, 0)
  parts.push(core)

  /**
   * `bevel: 0` on every moulding in this file, and it is not a shortcut.
   *
   * ExtrudeGeometry's bevel only touches the two ENDS of a run — it inflates
   * the section outwards by `bevelSize` and adds `bevelThickness` past each
   * end, then rounds them off. Two things follow. First, the bounds lie: a run
   * asked for at 1.5 m with a 22 mm section measures 1.504 by 24.3 mm, so a
   * desk declared 1.5 wide bakes out at 1.504 and the collider derived from
   * the manifest is wrong. Second, every moulding here dies in a mitre, so the
   * rounded ends are not only invisible, they pull each run 2 mm short of the
   * corner and leave a notch where the two profiles should meet. Turning the
   * bevel off fixes the mitre, makes the dimensions exact, and drops the run
   * from 80 triangles to 24.
   */
  const layEdge = (runLength, rotationY, x, z) => {
    const bar = sweepProfile(TOP_EDGE_PROFILE, runLength, { bevel: 0 })
    if (rotationY) bar.rotateY(rotationY)
    bar.translate(x, underside, z)
    return bar
  }

  // rotateY(-PI/2) sends the profile's +X (its "out" direction) to +Z and puts
  // the run on X — the same convention the wall mouldings in kit.mjs use.
  parts.push(layEdge(width, -Math.PI / 2, 0, coreDepth / 2))
  parts.push(layEdge(width, Math.PI / 2, 0, -coreDepth / 2))
  parts.push(layEdge(depth, 0, coreWidth / 2, 0))
  parts.push(layEdge(depth, Math.PI, -coreWidth / 2, 0))

  // ---- the pedestal, on the left ------------------------------------------
  /**
   * The top overhangs the pedestal by 50 mm on every side, which is not a
   * styling choice: the drawer knobs stand 30 mm proud of a front that is
   * already 16 mm proud of the carcass, and with a flush pedestal the knobs
   * would poke out past the desk's own bounding box. Furniture is dimensioned
   * by its widest point and a collider derived from the manifest would then be
   * wrong by the length of a knob.
   */
  const OVERHANG = 0.05
  const pedestalWidth = 0.46
  const pedestalDepth = depth - OVERHANG * 2
  const pedestalX = -(width / 2 - OVERHANG - pedestalWidth / 2)
  const pedestalFront = pedestalDepth / 2
  const plinthHeight = 0.06

  const plinth = bevelledBox(
    pedestalWidth - 0.03,
    plinthHeight,
    pedestalDepth - 0.03,
    0.004,
    1,
  )
  plinth.translate(pedestalX, plinthHeight / 2, 0)
  parts.push(plinth)

  const carcassHeight = underside - plinthHeight
  const carcass = bevelledBox(pedestalWidth, carcassHeight, pedestalDepth, 0.005, 1)
  carcass.translate(pedestalX, plinthHeight + carcassHeight / 2, 0)
  parts.push(carcass)

  /**
   * Graduated drawers — shallow at the top, deep at the bottom.
   *
   * Free asymmetry, and it is how every case piece has been made since the
   * eighteenth century, because the eye reads equal divisions as top-heavy.
   * Three equal fronts is the single loudest tell that a cabinet came out of a
   * for-loop.
   */
  const drawerHeights = [0.228, 0.200, 0.170]
  const REVEAL = 0.010
  let drawerY = plinthHeight + 0.012
  for (const drawerHeight of drawerHeights) {
    const centre = drawerY + drawerHeight / 2

    const face = bevelledBox(
      pedestalWidth - 0.024,
      drawerHeight - 0.008,
      0.020,
      0.005,
      1,
    )
    face.translate(pedestalX, centre, pedestalFront + 0.006)
    parts.push(face)

    for (const side of [-1, 1]) {
      const knob = turnedKnob()
      knob.translate(pedestalX + side * 0.11, centre, pedestalFront + 0.016)
      parts.push(knob)
    }

    drawerY += drawerHeight + REVEAL
  }

  // ---- the leg side, on the right -----------------------------------------
  const legX = width / 2 - 0.062
  const legZ = depth / 2 - 0.062

  for (const side of [-1, 1]) {
    /**
     * A turned leg, not a square taper. The office is the one room the player
     * is invited to stand still in, so it is the one place a lathe silhouette
     * gets looked at; the collar at 55 mm and the swell at the foot are what
     * separate a turned leg from a dowel.
     */
    const leg = lathe(
      [
        [0, 0],
        [0.031, 0],
        [0.029, 0.014],
        [0.022, 0.034],
        [0.027, 0.055],
        [0.019, 0.120],
        [0.016, 0.580],
        [0.031, 0.620],
        [0.031, underside],
        [0, underside],
      ],
      12,
    )
    leg.translate(legX, 0, side * legZ)
    parts.push(leg)
  }

  const apron = bevelledBox(0.020, 0.085, legZ * 2 - 0.062, 0.004, 1)
  apron.translate(legX, underside - 0.0425, 0)
  parts.push(apron)

  // ---- the frieze, over the knee hole -------------------------------------
  /**
   * Two drawers of unequal width, not one long one and not two matching ones.
   *
   * The knee hole here is 890 mm because the pedestal only eats a third of the
   * desk, and a single drawer that wide reads as a flap. Splitting it 520/320
   * gives the front three vertical divisions at three different spacings, which
   * is what stops the eye finding the grid.
   */
  const friezeLeft = pedestalX + pedestalWidth / 2
  const friezeRight = legX - 0.031
  const friezeHeight = 0.088
  const friezeY = underside - 0.006 - friezeHeight / 2

  let cursor = friezeLeft + 0.018
  for (const friezeWidth of [0.520, 0.320]) {
    const centre = cursor + friezeWidth / 2

    const face = bevelledBox(friezeWidth, friezeHeight, 0.020, 0.005, 1)
    face.translate(centre, friezeY, pedestalFront + 0.006)
    parts.push(face)

    // One knob on the narrow drawer, two on the wide one. A single knob on a
    // 520 mm front would look like a cupboard door.
    const knobOffsets = friezeWidth > 0.4 ? [-0.15, 0.15] : [0]
    for (const offset of knobOffsets) {
      const knob = turnedKnob()
      knob.translate(centre + offset, friezeY, pedestalFront + 0.016)
      parts.push(knob)
    }

    cursor += friezeWidth + 0.014
  }
  void friezeRight

  // ---- the modesty panel ---------------------------------------------------
  // Set 90 mm forward of the back edge, so the desk still reads as open from
  // behind rather than as a box with a hole in the front.
  const modesty = bevelledBox(friezeRight - friezeLeft - 0.02, 0.40, 0.016, 0.003, 1)
  modesty.translate((friezeLeft + friezeRight) / 2, 0.30 + 0.20, -depth / 2 + 0.09)
  parts.push(modesty)

  return finalize(merge(parts), { crease: Math.PI / 5, metresPerTile: 0.7 })
}

// ---------------------------------------------------------------------------
// 2. The chair
// ---------------------------------------------------------------------------

/**
 * A horizontal bow — the arm rail or the crest rail — as an elliptical arc.
 *
 * `phiLimit` is how far round from the back the bow runs, in radians: PI would
 * close it into a ring. `zOffset` slides the whole arc backwards, which is what
 * lets a raked back meet a bow that is still centred on the seat.
 */
function bowCurve({ halfWidth, halfDepth, y, phiLimit, samples, zOffset = 0, rise = 0 }) {
  const points = []
  for (let index = 0; index < samples; index += 1) {
    const t = index / (samples - 1)
    const phi = -phiLimit + t * 2 * phiLimit
    points.push(
      new Vector3(
        halfWidth * Math.sin(phi),
        y + rise * Math.cos(phi),
        -halfDepth * Math.cos(phi) + zOffset,
      ),
    )
  }
  return new CatmullRomCurve3(points, false, 'catmullrom', 0.5)
}

/** How far the back leans off vertical, in radians. About eleven degrees. */
const BACK_RAKE = 0.19
/** Where the sticks stand on the seat, as a radius from the swivel centre. */
const STICK_RADIUS = 0.178

/**
 * A wooden swivel captain's chair: saddle seat, bentwood arm bow, comb back,
 * cast four-star base on castors.
 *
 * Returns TWO geometries because the object is genuinely two materials — a
 * turned and steam-bent timber chair bolted to a cast-iron swivel base. Doing
 * it as one lump would either gild the seat or paint the castors, and the split
 * also gives each half its own triangle budget, which this part needs.
 *
 * THE RAKE IS THE PART THAT MATTERS. A back built straight up off the seat
 * reads as a garden fence; eleven degrees of lean is the difference between a
 * chair someone sat in for thirty years and a chair someone extruded. Every
 * stick is rotated about its own base, and the crest rail is slid back by
 * exactly the distance the stick tops travel, so the joint still lands.
 */
export function buildOfficeChair({ seatHeight = 0.45 } = {}) {
  const frame = []
  const base = []

  // ---- base: hub, four arms, four castors ---------------------------------
  const WHEEL_RADIUS = 0.024

  for (let index = 0; index < 4; index += 1) {
    // Arms on the diagonals, not on the axes. A four-star with an arm pointing
    // straight forward is a chair that tips when you lean over the desk, and
    // every real one is rotated 45 degrees for exactly that reason.
    const angle = Math.PI / 4 + (index * Math.PI) / 2

    const arm = bevelledBox(0.056, 0.034, 0.25, 0.005, 1)
    arm.translate(0, 0.067, 0.135)
    arm.rotateY(angle)
    base.push(arm)

    const stem = new CylinderGeometry(0.009, 0.011, 0.034, 8)
    stem.translate(0, 0.041, 0.250)
    stem.rotateY(angle)
    base.push(stem)

    /**
     * Twelve radial segments, not ten, and the count is load-bearing.
     *
     * The whole chair has to bottom out at exactly y = 0 or the placement test
     * fails the build. A cylinder's lowest vertex sits at `-r * cos` of
     * whichever generated angle is nearest the bottom, so an even divisor of
     * 360 that includes 270 is required: at 10 segments the nearest vertex is
     * 18 degrees off and the chair floats 1.2 mm above the floor.
     */
    const wheel = new CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.017, 12)
    wheel.rotateZ(Math.PI / 2)
    // The wheel trails 12 mm behind its swivel pin, as a real castor does.
    wheel.translate(0, WHEEL_RADIUS, 0.262)
    wheel.rotateY(angle)
    base.push(wheel)
  }

  const column = lathe(
    [
      [0, 0],
      [0.078, 0],
      [0.076, 0.014],
      [0.052, 0.030],
      [0.030, 0.042],
      [0.026, 0.160],
      [0.030, 0.220],
      [0.024, 0.300],
      [0.026, 0.345],
      [0, 0.350],
    ],
    12,
  )
  column.translate(0, 0.050, 0)
  base.push(column)

  const seatBase = seatHeight - 0.042
  const swivel = lathe(
    [[0, 0], [0.070, 0], [0.068, 0.008], [0.032, 0.016], [0.028, 0.022], [0, 0.024]],
    12,
  )
  swivel.translate(0, seatBase - 0.022, 0)
  base.push(swivel)

  // ---- seat ----------------------------------------------------------------
  /**
   * The saddle. A lathe gives a round seat; the scale afterwards makes it
   * 424 mm across and 384 deep, which is the proportion of a real captain's
   * chair and the cheapest asymmetry in the whole part — one line, no extra
   * triangles. The profile dishes 17 mm from rim to centre, which is what makes
   * it a saddle rather than a disc with a bevel.
   */
  const seat = lathe(
    [
      [0, 0],
      [0.110, 0],
      [0.176, 0.005],
      [0.196, 0.017],
      [0.198, 0.030],
      [0.188, 0.041],
      [0.115, 0.034],
      [0.055, 0.026],
      [0, 0.024],
    ],
    18,
  )
  seat.scale(1.07, 1, 0.97)
  // Shifted forward, because a swivel seat is not centred on its column — the
  // sitter's weight is in front of the post.
  seat.translate(0, seatBase, 0.012)
  frame.push(seat)

  // ---- back: sticks, arm bow, crest ---------------------------------------
  const stickBase = seatHeight - 0.025
  const stickLength = 0.495
  const stickRun = stickLength * Math.sin(BACK_RAKE)

  const STICKS = 7
  for (let index = 0; index < STICKS; index += 1) {
    const phi = -1.05 + (index / (STICKS - 1)) * 2.1
    const stick = lathe(
      [
        [0, 0],
        [0.0155, 0.020],
        [0.0165, 0.060],
        [0.0085, 0.300],
        [0.0105, 0.460],
        [0, stickLength],
      ],
      8,
    )
    // rotateX with a NEGATIVE angle tips the stick towards -Z. Positive leans
    // it forward into the sitter, which is a chair nobody would keep.
    stick.rotateX(-BACK_RAKE)
    stick.translate(
      STICK_RADIUS * Math.sin(phi),
      stickBase,
      -STICK_RADIUS * Math.cos(phi),
    )
    frame.push(stick)
  }

  // The arm bow catches the sticks half way up, so it is offset back by the
  // distance they have travelled at that height, not by the full run.
  const armY = seatHeight + 0.215
  const armOffset = -((armY - stickBase) * Math.tan(BACK_RAKE))
  const armBow = new TubeGeometry(
    bowCurve({
      halfWidth: 0.20,
      halfDepth: 0.185,
      y: armY,
      phiLimit: 2.30,
      samples: 11,
      zOffset: armOffset,
      rise: 0.018,
    }),
    20,
    0.019,
    6,
    false,
  )
  frame.push(armBow)

  const crest = new TubeGeometry(
    bowCurve({
      halfWidth: 0.182,
      halfDepth: 0.182,
      y: stickBase + stickLength * Math.cos(BACK_RAKE) - 0.006,
      phiLimit: 1.16,
      samples: 7,
      zOffset: -stickRun,
      rise: 0.022,
    }),
    12,
    0.021,
    6,
    false,
  )
  frame.push(crest)

  // The two arm posts, under the forward ends of the bow. Vertical: on a
  // captain's chair these are short and stout and the splay is in the bow.
  for (const side of [-1, 1]) {
    const post = lathe(
      [
        [0, 0],
        [0.0175, 0.020],
        [0.0190, 0.055],
        [0.0105, 0.160],
        [0.0140, 0.215],
        [0, 0.235],
      ],
      8,
    )
    post.translate(
      side * 0.20 * Math.sin(2.30),
      stickBase,
      -0.185 * Math.cos(2.30) + armOffset,
    )
    frame.push(post)
  }

  return {
    frame: finalize(merge(frame), { crease: Math.PI / 5, metresPerTile: 0.5 }),
    base: finalize(merge(base), { crease: Math.PI / 5, metresPerTile: 0.35 }),
  }
}

// ---------------------------------------------------------------------------
// 3. The green lamp
// ---------------------------------------------------------------------------

/**
 * The shade's section: a shallow arched shell with a flared lip at each rim.
 *
 * A banker's shade is the one object in this file that is NOT a surface of
 * revolution and NOT a box, and the temptation is to fake it with a half
 * cylinder. Don't: an open half cylinder is a single-sided surface and you look
 * straight through it into the bulb from any seated angle, and a solid one has
 * a flat underside that kills the glow. It is, however, exactly a closed 2D
 * outline swept along a straight run — which is what `sweepProfile` is for. The
 * outline traces the inner surface left to right, turns at the rim and comes
 * back along the outer, so the extrusion's own end caps become the 5 mm
 * crescent of glass thickness you would actually see at the ends of the shade.
 */
function shadeProfile() {
  const CENTRE_Y = 0.010
  const OUTER_A = 0.086
  const OUTER_B = 0.058
  const GLASS = 0.005
  // Fourteen steps across a 172 mm arc puts a facet every 12 mm. Smooth normals
  // cannot save a silhouette, and the shade's silhouette is the one line in the
  // room the player will actually look at.
  const STEPS = 14

  const points = [[-0.086, 0.006]]
  for (let index = 0; index <= STEPS; index += 1) {
    const u = Math.PI * (1 - index / STEPS)
    points.push([
      (OUTER_A - GLASS) * Math.cos(u),
      CENTRE_Y + (OUTER_B - GLASS) * Math.sin(u),
    ])
  }
  // The lip turns out and down 10 mm past the shell. Cased glass is spun, and
  // the rolled rim is the thing that catches the tungsten and outlines the
  // whole shade as a bright line in a dark room.
  points.push([0.086, 0.006], [0.092, 0])
  for (let index = STEPS; index >= 0; index -= 1) {
    const u = Math.PI * (1 - index / STEPS)
    points.push([OUTER_A * Math.cos(u), CENTRE_Y + OUTER_B * Math.sin(u)])
  }
  points.push([-0.092, 0])
  return points
}

/**
 * The banker's lamp. Returns { base, shade } so the shade can be green glass.
 *
 * This object carries the room's identity — the office's nickname in the
 * content set is the room with the green lamp, and the plan's sensory contract
 * for the safe room hangs on it: you find the room dark, you turn the switch on
 * the base, and the calm music starts on the click. So the switch is modelled
 * as a real knob on the casting rather than implied, because it is the thing
 * the player is meant to walk up to and press.
 *
 * Authored standing on y = 0 like everything else, even though it will be
 * placed on the desk at 0.74 — the convention is the convention.
 */
export function buildDeskLamp() {
  const base = []

  /**
   * The weighted foot, spun round and then stretched 28 per cent along X.
   *
   * Real banker's lamps have an oval base for the same reason a real one is
   * heavy: the shade is 260 mm of glass cantilevered off a 260 mm post and a
   * round foot the same size would tip. The stretch costs nothing and it is the
   * only thing stopping the whole lamp being rotationally symmetric.
   */
  const foot = lathe(
    [
      [0, 0],
      [0.085, 0],
      [0.083, 0.008],
      [0.070, 0.016],
      [0.066, 0.022],
      [0.030, 0.028],
      [0.026, 0.034],
      [0, 0.036],
    ],
    20,
  )
  foot.scale(1.28, 1, 1)
  base.push(foot)

  const stem = lathe(
    [
      [0, 0],
      [0.021, 0.004],
      [0.017, 0.014],
      [0.011, 0.034],
      [0.014, 0.056],
      [0.010, 0.226],
      [0.014, 0.252],
      [0, 0.264],
    ],
    12,
  )
  stem.translate(0, 0.030, 0)
  base.push(stem)

  // The yoke runs front-to-back, across the shade's short axis, so its two
  // uprights meet the shade under its long rims. A cross-arm along the shade
  // would have nothing to hold.
  const yoke = bevelledBox(0.016, 0.012, 0.170, 0.003, 1)
  yoke.translate(0, 0.292, 0)
  base.push(yoke)

  for (const side of [-1, 1]) {
    const upstand = new CylinderGeometry(0.007, 0.007, 0.040, 8)
    upstand.translate(0, 0.302, side * 0.078)
    base.push(upstand)
  }

  // The switch, deliberately off-centre on the casting. It is the interactable
  // and it needs to be findable by silhouette in a dark room.
  const switchKnob = lathe(
    [[0, 0], [0.010, 0.002], [0.012, 0.010], [0.007, 0.015], [0, 0.016]],
    10,
  )
  switchKnob.translate(0.058, 0.021, 0.045)
  base.push(switchKnob)

  // rotateY(-PI/2) puts the section's across-axis on +Z and the run on X, so
  // the shade lies broadside to whoever is sitting at the desk.
  const shade = sweepProfile(shadeProfile(), 0.260, { bevel: 0 })
  shade.rotateY(-Math.PI / 2)
  shade.translate(0, 0.298, 0)

  return {
    base: finalize(merge(base), { crease: Math.PI / 5, metresPerTile: 0.25 }),
    shade: finalize(shade, { crease: Math.PI / 4, metresPerTile: 0.3 }),
  }
}

// ---------------------------------------------------------------------------
// 4. The working library
// ---------------------------------------------------------------------------

/**
 * A compact open bookcase for the safe room.
 *
 * The office is deliberately the smallest room in the slice, so a full-height
 * Victorian library would turn it into a corridor. This one is only 1.18 m
 * wide and 0.34 m deep: enough vertical mass to make the north wall feel used,
 * while leaving the archive cabinet and its interaction approach unobstructed.
 *
 * Returns carcass and books separately because timber and worn bindings need
 * different materials. Both halves share one origin. Every member is a
 * bevelled box, so preserving the generator normals with `crease: null` avoids
 * the one-centimetre normal weld pillowing the broad shelf faces.
 */
export function buildBookshelf({ width = 1.18, depth = 0.34, height = 2.02 } = {}) {
  const carcass = []
  const books = []
  const side = 0.055
  const shelf = 0.038
  const back = 0.022
  const plinthHeight = 0.09

  // A recessed plinth lets the case meet the floor through a shadow line
  // instead of looking like a box extruded straight out of it.
  const plinth = bevelledBox(width - 0.08, plinthHeight, depth - 0.045, 0.006, 1)
  plinth.translate(0, plinthHeight / 2, -0.008)
  carcass.push(plinth)

  for (const x of [-width / 2 + side / 2, width / 2 - side / 2]) {
    const upright = bevelledBox(side, height - plinthHeight, depth, 0.006, 1)
    upright.translate(x, plinthHeight + (height - plinthHeight) / 2, 0)
    carcass.push(upright)
  }

  const backPanel = bevelledBox(width - side * 2, height - plinthHeight, back, 0.004, 1)
  backPanel.translate(0, plinthHeight + (height - plinthHeight) / 2, -depth / 2 + back / 2)
  carcass.push(backPanel)

  const shelfLevels = [plinthHeight, 0.51, 0.94, 1.37, 1.80]
  for (const y of shelfLevels) {
    const board = bevelledBox(width - side * 2, shelf, depth - back, 0.005, 1)
    board.translate(0, y + shelf / 2, back / 2)
    carcass.push(board)
  }

  // The oversailing cap is the only silhouette visible above eye level. A
  // wider, thinner board earns more than another row of tiny carved detail.
  const cap = bevelledBox(width + 0.08, 0.075, depth + 0.035, 0.008, 1)
  cap.translate(0, height - 0.0375, 0.004)
  carcass.push(cap)

  // Three deliberately uneven ledgers per shelf. Twelve readable silhouettes
  // stay beneath the whole-recipe prop budget; the gaps keep each binding more
  // legible than a dense picket fence of tiny books at gallery distance.
  const bindingWidths = [0.072, 0.094, 0.108]
  for (let row = 0; row < 4; row += 1) {
    const floor = shelfLevels[row] + shelf
    let cursor = -width / 2 + side + 0.075 + row * 0.018
    for (let index = 0; index < bindingWidths.length; index += 1) {
      const bookWidth = bindingWidths[(index + row) % bindingWidths.length]
      const bookHeight = 0.255 + ((row * 3 + index * 2) % 5) * 0.022
      const bookDepth = depth - 0.095 - ((row + index) % 3) * 0.018
      const book = bevelledBox(bookWidth, bookHeight, bookDepth, 0.004, 1)
      book.rotateZ(index === 2 && row % 2 === 0 ? -0.055 : 0)
      book.translate(cursor + bookWidth / 2, floor + bookHeight / 2, 0.035)
      books.push(book)
      cursor += bookWidth + 0.018
    }
  }

  return {
    carcass: finalize(merge(carcass), { crease: null, metresPerTile: 0.42 }),
    books: finalize(merge(books), { crease: null, metresPerTile: 0.24 }),
  }
}

// ---------------------------------------------------------------------------
// 5. The active ledgers
// ---------------------------------------------------------------------------

/**
 * Four working ledgers stacked with their spines deliberately misregistered.
 *
 * Authored from y = 0 so the same recipe can sit on any desk or shelf by
 * moving only its wrapper group. Covers and page blocks are separate material
 * families, but share an origin and must always be cloned as one recipe.
 */
export function buildLedgerStack({ width = 0.34, depth = 0.245 } = {}) {
  const covers = []
  const pages = []
  const layers = [
    { x: 0.000, z: 0.000, rotation: -0.025, thickness: 0.046 },
    { x: 0.018, z: -0.012, rotation: 0.038, thickness: 0.052 },
    { x: -0.012, z: 0.016, rotation: -0.052, thickness: 0.043 },
    { x: 0.010, z: 0.004, rotation: 0.018, thickness: 0.049 },
  ]

  let y = 0
  for (const [index, layer] of layers.entries()) {
    const localWidth = width - index * 0.014
    const localDepth = depth - (index % 2) * 0.012
    const coverThickness = 0.006
    const pageHeight = layer.thickness - coverThickness * 2

    const lower = bevelledBox(localWidth, coverThickness, localDepth, 0.003, 1)
    lower.rotateY(layer.rotation)
    lower.translate(layer.x, y + coverThickness / 2, layer.z)
    covers.push(lower)

    const block = bevelledBox(localWidth - 0.018, pageHeight, localDepth - 0.016, 0.003, 1)
    block.rotateY(layer.rotation)
    block.translate(layer.x + 0.006, y + coverThickness + pageHeight / 2, layer.z)
    pages.push(block)

    const upper = bevelledBox(localWidth, coverThickness, localDepth, 0.003, 1)
    upper.rotateY(layer.rotation)
    upper.translate(layer.x, y + layer.thickness - coverThickness / 2, layer.z)
    covers.push(upper)

    // A proud spine hides the mathematically perfect page/case seam and gives
    // the stack a readable direction from across the office.
    const spine = bevelledBox(0.018, layer.thickness, localDepth, 0.004, 1)
    spine.rotateY(layer.rotation)
    spine.translate(layer.x - localWidth / 2 + 0.009, y + layer.thickness / 2, layer.z)
    covers.push(spine)

    y += layer.thickness + 0.006
  }

  return {
    covers: finalize(merge(covers), { crease: null, metresPerTile: 0.22 }),
    pages: finalize(merge(pages), { crease: null, metresPerTile: 0.18 }),
  }
}
