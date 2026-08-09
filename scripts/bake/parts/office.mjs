/**
 * The curator's office.
 *
 * The plan's one safe room, and the only room in the building specified down to
 * a named object — "the room with the green lamp". Everything here is furniture
 * rather than architecture, which changes what the geometry has to do: a wall is
 * read at four metres and a desk is read at sixty centimetres, so the detail
 * that earns its triangles is the moulded edge, the graduated drawer, the brass
 * pull — the two centimetres of profile you only ever see close up.
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
  BoxGeometry,
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

/** A twelve-triangle box for hidden carcasses and details too small to bevel. */
function plainBox(width, height, depth, x, y, z) {
  const geometry = new BoxGeometry(width, height, depth)
  geometry.translate(x, y, z)
  return geometry
}

/** A restrained rectangular campaign-furniture pull in square brass stock. */
function campaignPull(parts, x, y, z, width = 0.14) {
  for (const side of [-1, 1]) {
    const plate = new CylinderGeometry(0.014, 0.014, 0.006, 8)
    plate.rotateX(Math.PI / 2)
    plate.translate(x + side * width / 2, y, z)
    parts.push(plate)
    parts.push(
      plainBox(0.008, 0.032, 0.018, x + side * width / 2, y - 0.014, z + 0.010),
    )
  }
  parts.push(plainBox(width + 0.008, 0.008, 0.010, x, y - 0.029, z + 0.016))
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
 * A working partners desk: twin drawer pedestals, a leather blotter and the
 * tools of a curator's daily work on top.
 *
 * The broad 1.75 by 0.90 metre footprint is what lets the desk anchor the room
 * in the reference instead of reading as a side table. Graduated drawers and a
 * single central frieze keep the symmetry from becoming a featureless grid;
 * paper, a card file and a period phone break the top plane.
 */
export function buildCuratorDesk({ width = 1.75, depth = 0.90, height = 0.74 } = {}) {
  const timber = []
  const brass = []
  const leather = []
  const paper = []
  const phone = []
  const props = []

  const coreWidth = width - TOP_PROUD * 2
  const coreDepth = depth - TOP_PROUD * 2
  const underside = height - TOP_THICKNESS

  // ---- top ---------------------------------------------------------------
  const core = bevelledBox(coreWidth, TOP_THICKNESS, coreDepth, 0.004, 1)
  core.translate(0, underside + TOP_THICKNESS / 2, 0)
  timber.push(core)

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
  timber.push(layEdge(width, -Math.PI / 2, 0, coreDepth / 2))
  timber.push(layEdge(width, Math.PI / 2, 0, -coreDepth / 2))
  timber.push(layEdge(depth, 0, coreWidth / 2, 0))
  timber.push(layEdge(depth, Math.PI, -coreWidth / 2, 0))

  // ---- twin pedestals ------------------------------------------------------
  /**
   * The top overhangs the pedestal by 50 mm on every side, which is not a
   * styling choice: the drawer pulls stand proud of a front that is
   * already 16 mm proud of the carcass, and with a flush pedestal the knobs
   * would poke out past the desk's own bounding box. Furniture is dimensioned
   * by its widest point and a collider derived from the manifest would then be
   * wrong by the length of the hardware.
   */
  const OVERHANG = 0.05
  const pedestalWidth = 0.46
  const pedestalDepth = depth - OVERHANG * 2
  const pedestalOffset = width / 2 - OVERHANG - pedestalWidth / 2
  const pedestalFront = pedestalDepth / 2
  const plinthHeight = 0.06
  const carcassHeight = underside - plinthHeight

  for (const pedestalX of [-pedestalOffset, pedestalOffset]) {
    const plinth = plainBox(
      pedestalWidth - 0.03,
      plinthHeight,
      pedestalDepth - 0.03,
      pedestalX,
      plinthHeight / 2,
      0,
    )
    timber.push(plinth)

    const carcass = plainBox(
      pedestalWidth,
      carcassHeight,
      pedestalDepth,
      pedestalX,
      plinthHeight + carcassHeight / 2,
      0,
    )
    timber.push(carcass)

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
      timber.push(face)
      campaignPull(brass, pedestalX, centre + 0.014, pedestalFront + 0.020, 0.19)

      drawerY += drawerHeight + REVEAL
    }
  }

  // ---- the frieze, over the knee hole -------------------------------------
  const friezeLeft = -pedestalOffset + pedestalWidth / 2
  const friezeRight = pedestalOffset - pedestalWidth / 2
  const kneeWidth = friezeRight - friezeLeft
  const friezeHeight = 0.088
  const friezeY = underside - 0.006 - friezeHeight / 2
  timber.push(
    plainBox(kneeWidth - 0.036, friezeHeight, 0.020, 0, friezeY, pedestalFront + 0.006),
  )
  campaignPull(brass, 0, friezeY + 0.014, pedestalFront + 0.020, 0.19)

  // ---- the modesty panel ---------------------------------------------------
  // Set 90 mm forward of the back edge, so the desk still reads as open from
  // behind rather than as a box with a hole in the front.
  timber.push(
    plainBox(
      friezeRight - friezeLeft - 0.02,
      0.40,
      0.016,
      (friezeLeft + friezeRight) / 2,
      0.50,
      -depth / 2 + 0.09,
    ),
  )

  // ---- the working surface -------------------------------------------------
  // The green leather inset is the large calm plane in the reference. It sits
  // inside the walnut border instead of masking the moulded top edge.
  const blotter = bevelledBox(width - 0.34, 0.007, depth - 0.22, 0.006, 1)
  blotter.translate(0, height + 0.0035, 0.015)
  leather.push(blotter)

  // Broken paper edges sell use more efficiently than embossing or text that
  // would never survive the baked prop's texel density.
  for (let index = 0; index < 4; index += 1) {
    const sheet = plainBox(
      0.245 - index * 0.008,
      0.003,
      0.18,
      -0.10 + index * 0.006,
      height + 0.009 + index * 0.003,
      -0.12 + index * 0.004,
    )
    sheet.rotateY(-0.045 + index * 0.025)
    paper.push(sheet)
  }

  // A compact three-drawer card file. It occupies the back-left corner, clear
  // of both the interactive lamp and the separately placed ledger stack.
  const fileX = -0.42
  const fileZ = -0.13
  const fileWidth = 0.275
  const fileDepth = 0.205
  const fileHeight = 0.165
  const fileCase = bevelledBox(fileWidth, fileHeight, fileDepth, 0.005, 1)
  fileCase.translate(fileX, height + fileHeight / 2 + 0.007, fileZ)
  props.push(fileCase)
  for (let index = 0; index < 3; index += 1) {
    const drawerY = height + 0.041 + index * 0.050
    props.push(
      plainBox(
        fileWidth - 0.025,
        0.040,
        0.012,
        fileX,
        drawerY,
        fileZ + fileDepth / 2 + 0.004,
      ),
    )
    brass.push(
      plainBox(
        0.052,
        0.018,
        0.008,
        fileX,
        drawerY,
        fileZ + fileDepth / 2 + 0.015,
      ),
    )
  }

  // A 1930s desk telephone. The handset's curved silhouette matters much more
  // than rotary-dial holes that would be sub-pixel in play.
  const phoneX = 0.49
  const phoneZ = 0.13
  const phoneBody = bevelledBox(0.215, 0.075, 0.165, 0.012, 1)
  phoneBody.translate(phoneX, height + 0.0445, phoneZ)
  phone.push(phoneBody)

  const dial = new CylinderGeometry(0.043, 0.047, 0.012, 12)
  dial.translate(phoneX, height + 0.088, phoneZ + 0.014)
  phone.push(dial)

  const handsetCurve = new CatmullRomCurve3([
    new Vector3(phoneX - 0.096, height + 0.113, phoneZ),
    new Vector3(phoneX - 0.058, height + 0.132, phoneZ),
    new Vector3(phoneX, height + 0.124, phoneZ),
    new Vector3(phoneX + 0.058, height + 0.132, phoneZ),
    new Vector3(phoneX + 0.096, height + 0.113, phoneZ),
  ])
  phone.push(new TubeGeometry(handsetCurve, 10, 0.014, 6, false))
  for (const side of [-1, 1]) {
    const receiver = new CylinderGeometry(0.025, 0.020, 0.042, 8)
    receiver.rotateZ(Math.PI / 2)
    receiver.translate(phoneX + side * 0.098, height + 0.112, phoneZ)
    phone.push(receiver)
  }

  return {
    timber: finalize(merge(timber), { crease: Math.PI / 5, metresPerTile: 0.7 }),
    brass: finalize(merge(brass), { crease: Math.PI / 5, metresPerTile: 0.22 }),
    leather: finalize(merge(leather), { crease: null, metresPerTile: 0.55 }),
    paper: finalize(merge(paper), { crease: null, metresPerTile: 0.2 }),
    phone: finalize(merge(phone), { crease: Math.PI / 5, metresPerTile: 0.25 }),
    props: finalize(merge(props), { crease: null, metresPerTile: 0.35 }),
  }
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
 * A green-leather library chair: saddle cushion, buttoned raked back, walnut
 * bentwood frame and sparse brass nailheads.
 *
 * Four geometries are intentional. Leather has to catch a wide, soft highlight
 * while polished walnut keeps a tighter one; brass should flash only at the
 * upholstery edge, and `base` stays separate because it is the contractual
 * collider node. A back built straight up still reads as a dining chair, so
 * the eleven-degree rake remains the load-bearing shape decision.
 */
export function buildOfficeChair({ seatHeight = 0.45 } = {}) {
  const frame = []
  const base = []
  const leather = []
  const brass = []

  // ---- base: square walnut frame ------------------------------------------
  // The reference chair is a club-like library chair, not an office caster.
  // Square legs and rails also leave enough budget for the leather upholstery
  // that carries its identity. Every leg lands exactly at y = 0.
  const seatBase = seatHeight - 0.042
  for (const x of [-0.205, 0.205]) {
    for (const z of [-0.175, 0.175]) {
      base.push(plainBox(0.048, seatBase, 0.048, x, seatBase / 2, z))
      const shoe = new CylinderGeometry(0.027, 0.027, 0.010, 8)
      shoe.translate(x, 0.005, z)
      brass.push(shoe)
    }
  }
  base.push(
    plainBox(0.43, 0.060, 0.045, 0, seatBase - 0.030, 0.175),
    plainBox(0.43, 0.060, 0.045, 0, seatBase - 0.030, -0.175),
    plainBox(0.045, 0.060, 0.305, -0.205, seatBase - 0.030, 0),
    plainBox(0.045, 0.060, 0.305, 0.205, seatBase - 0.030, 0),
  )

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
  leather.push(seat)

  // ---- back: sticks, arm bow, crest ---------------------------------------
  const stickBase = seatHeight - 0.025
  const stickLength = 0.495
  const stickRun = stickLength * Math.sin(BACK_RAKE)

  const STICKS = 5
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

  // ---- leather back -------------------------------------------------------
  // One broad, raked cushion changes the chair from a bentwood prop into the
  // green leather curator's chair in the concept. The five remaining sticks
  // are still visible around it and read as a proper supporting frame.
  const backCentreY = stickBase + 0.275
  const backCentreZ = -0.195
  const back = bevelledBox(0.365, 0.405, 0.065, 0.014, 1)
  back.rotateX(-BACK_RAKE)
  back.translate(0, backCentreY, backCentreZ)
  leather.push(back)

  for (const y of [backCentreY - 0.105, backCentreY + 0.015, backCentreY + 0.135]) {
    for (const x of [-0.086, 0.086]) {
      const button = new CylinderGeometry(0.009, 0.009, 0.007, 6)
      button.rotateX(Math.PI / 2 - BACK_RAKE)
      button.translate(
        x,
        y,
        backCentreZ + 0.034 - (y - backCentreY) * Math.tan(BACK_RAKE),
      )
      leather.push(button)
    }
  }

  // Sparse brass nailheads catch the banker's lamp without turning the chair
  // into a dotted outline. They sit only on the two long upholstered edges.
  for (const side of [-1, 1]) {
    for (let index = 0; index < 6; index += 1) {
      const y = backCentreY - 0.155 + index * 0.062
      const stud = new CylinderGeometry(0.005, 0.005, 0.006, 6)
      stud.rotateX(Math.PI / 2 - BACK_RAKE)
      stud.translate(
        side * 0.178,
        y,
        backCentreZ + 0.036 - (y - backCentreY) * Math.tan(BACK_RAKE),
      )
      brass.push(stud)
    }
  }

  return {
    frame: finalize(merge(frame), { crease: Math.PI / 5, metresPerTile: 0.5 }),
    base: finalize(merge(base), { crease: null, metresPerTile: 0.35 }),
    leather: finalize(merge(leather), { crease: Math.PI / 5, metresPerTile: 0.35 }),
    brass: finalize(merge(brass), { crease: Math.PI / 5, metresPerTile: 0.18 }),
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

  // The brass cames around the rolled glass rim are the highlight visible in
  // the dark safe room. They belong to `base`, so the interactive lamp remains
  // one recipe and the power-control placement cannot create a duplicate.
  for (const z of [-0.088, 0.088]) {
    const rim = new CylinderGeometry(0.0035, 0.0035, 0.250, 8)
    rim.rotateZ(Math.PI / 2)
    rim.translate(0, 0.304, z)
    base.push(rim)

    for (const x of [-0.128, 0.128]) {
      const finial = new CylinderGeometry(0.009, 0.009, 0.012, 8)
      finial.rotateZ(Math.PI / 2)
      finial.translate(x, 0.304, z)
      base.push(finial)
    }
  }

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
 * Returns carcass, books, archive boxes and their brass label holders as four
 * materials sharing one origin. Structural members keep authored normals with
 * `crease: null`; the small contents use plain boxes because a bevel there
 * would be below a pixel and would crowd out useful silhouettes.
 */
export function buildBookshelf({ width = 1.18, depth = 0.34, height = 2.72 } = {}) {
  const carcass = []
  const books = []
  const boxes = []
  const brass = []
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

  const shelfLevels = [plinthHeight, 0.60, 1.11, 1.62, 2.13]
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

  // Dense but irregular working shelves. Books are plain boxes because their
  // 4 mm bevel would be sub-pixel; the saved topology buys thirty distinct
  // silhouettes plus archival boxes, which is what makes the wall feel used.
  const bindingWidths = [0.048, 0.062, 0.074, 0.055, 0.082, 0.066, 0.052, 0.071, 0.058, 0.077]
  const rowCounts = [10, 6, 9, 5, 12]
  for (let row = 0; row < 5; row += 1) {
    const floor = shelfLevels[row] + shelf
    let cursor = -width / 2 + side + 0.030 + row * 0.010
    for (let index = 0; index < rowCounts[row]; index += 1) {
      const bookWidth = bindingWidths[(index + row) % bindingWidths.length]
      const bookHeight =
        0.315 + ((row * 3 + index * 2) % 5) * 0.024 + (row === 4 ? 0.045 : 0)
      const bookDepth = depth - 0.095 - ((row + index) % 3) * 0.018
      const book = new BoxGeometry(bookWidth, bookHeight, bookDepth)
      book.rotateZ(index === 2 && row % 2 === 0 ? -0.055 : 0)
      book.translate(cursor + bookWidth / 2, floor + bookHeight / 2, 0.035)
      books.push(book)
      cursor += bookWidth + 0.013
    }
  }

  // Two labelled document boxes fill the deliberate gaps on rows two and
  // four. Separate material families let them read as institutional green
  // fibreboard with brass label holders instead of more brown books.
  for (const row of [1, 3]) {
    const floor = shelfLevels[row] + shelf
    for (let index = 0; index < 2; index += 1) {
      const boxWidth = 0.205
      const boxHeight = 0.145 + index * 0.012
      const boxDepth = depth - 0.078
      const x = 0.20 + index * 0.21
      boxes.push(
        plainBox(boxWidth, boxHeight, boxDepth, x, floor + boxHeight / 2, 0.025),
        plainBox(boxWidth + 0.012, 0.018, boxDepth + 0.010, x, floor + boxHeight + 0.009, 0.025),
      )
      brass.push(
        plainBox(
          0.074,
          0.032,
          0.007,
          x,
          floor + boxHeight * 0.62,
          0.025 + boxDepth / 2 + 0.005,
        ),
      )
    }
  }

  return {
    carcass: finalize(merge(carcass), { crease: null, metresPerTile: 0.42 }),
    books: finalize(merge(books), { crease: null, metresPerTile: 0.24 }),
    boxes: finalize(merge(boxes), { crease: null, metresPerTile: 0.3 }),
    brass: finalize(merge(brass), { crease: null, metresPerTile: 0.16 }),
  }
}

// ---------------------------------------------------------------------------
// 5. The active ledgers
// ---------------------------------------------------------------------------

/**
 * Four working ledgers stacked with their spines deliberately misregistered.
 *
 * Authored from y = 0 so the same recipe can sit on any desk or shelf by
 * moving only its wrapper group. Covers, page blocks and brass title holders
 * are separate material families, but share an origin and must always be cloned
 * as one recipe.
 */
export function buildLedgerStack({ width = 0.34, depth = 0.245 } = {}) {
  const covers = []
  const pages = []
  const brass = []
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

    // A recessed title holder gives every anonymous volume an archival role.
    // It is placed in book-local space before the ledger's small rotation, so
    // the plate remains seated on the spine instead of orbiting around it.
    const titleHolder = new BoxGeometry(0.007, 0.019, 0.082)
    titleHolder.translate(-localWidth / 2 - 0.003, y + layer.thickness * 0.58, 0)
    titleHolder.rotateY(layer.rotation)
    titleHolder.translate(layer.x, 0, layer.z)
    brass.push(titleHolder)

    y += layer.thickness + 0.006
  }

  return {
    covers: finalize(merge(covers), { crease: null, metresPerTile: 0.22 }),
    pages: finalize(merge(pages), { crease: null, metresPerTile: 0.18 }),
    brass: finalize(merge(brass), { crease: null, metresPerTile: 0.14 }),
  }
}
