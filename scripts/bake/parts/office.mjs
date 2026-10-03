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
  Box3,
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  TubeGeometry,
  Vector3,
} from 'three'

import {
  bevelledBox,
  domeStud,
  finalize,
  flatPolygon,
  lathe,
  merge,
  piping,
  quiltedGridPoint,
  quiltedHeight,
  quiltedPanel,
  roundedRectPoints,
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
    // Six sides, smoothed by the brass crease: a round rosette for 24
    // triangles instead of 32, across fourteen of them on the desk.
    const plate = new CylinderGeometry(0.014, 0.014, 0.006, 6)
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
 * paper, a card file, an inkstand and a letter opener break the top plane.
 */
export function buildCuratorDesk({ width = 1.75, depth = 0.90, height = 0.74 } = {}) {
  const timber = []
  const brass = []
  // Turned brass small enough for the crease pass's centimetre hash to fold
  // both sides of it into one cell: it keeps the lathe's own smooth normals.
  const brassTurned = []
  const leather = []
  const paper = []
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
  const blotterWidth = width - 0.34
  const blotterDepth = depth - 0.22
  const blotterThickness = 0.007
  const blotterZ = 0.015
  const blotterTop = height + blotterThickness
  const blotter = bevelledBox(blotterWidth, blotterThickness, blotterDepth, 0.006, 1)
  blotter.translate(0, height + blotterThickness / 2, blotterZ)
  leather.push(blotter)

  /**
   * Gilt tooling: a broad fillet and a hairline inside it, the border every
   * leather desk inset is finished with. Gold leaf is pressed INTO the
   * leather, so these stand only 0.4 mm proud: enough to catch the lamp as a
   * line, nothing a ledger would rock on.
   */
  for (const [inset, line] of [[0.022, 0.003], [0.030, 0.0012]]) {
    const runX = blotterWidth - inset * 2
    const runZ = blotterDepth - inset * 2
    for (const side of [-1, 1]) {
      brass.push(plainBox(runX + line, 0.0006, line, 0, blotterTop + 0.0001, blotterZ + (side * runZ) / 2))
      brass.push(plainBox(line, 0.0006, runZ - line, (side * runX) / 2, blotterTop + 0.0001, blotterZ))
    }
  }

  /**
   * Every object standing on the desk is authored about its own footprint,
   * from y = 0, and set down by `placeItem`, which records the footprint it
   * actually occupies. `layout` hands those to the desk-top test, which proves
   * that nothing sinks into the leather, floats over it or stands inside its
   * neighbour — all three of which the old desk did.
   */
  const items = []
  const placeItem = (id, pieces, { x, z, rotation = 0, on = blotterTop, restsOn } = {}) => {
    const box = new Box3()
    for (const [geometry] of pieces) {
      geometry.computeBoundingBox()
      box.union(geometry.boundingBox)
    }
    for (const [geometry, family] of pieces) {
      geometry.rotateY(rotation)
      geometry.translate(x, on, z)
      family.push(geometry)
    }
    const centreX = (box.min.x + box.max.x) / 2
    const centreZ = (box.min.z + box.max.z) / 2
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    items.push({
      id,
      // rotateY maps (x, z) to (x cos + z sin, -x sin + z cos).
      centre: [x + centreX * cos + centreZ * sin, z - centreX * sin + centreZ * cos],
      halfSize: [(box.max.x - box.min.x) / 2, (box.max.z - box.min.z) / 2],
      rotation,
      bottom: on + box.min.y,
      top: on + box.max.y,
      ...(restsOn ? { restsOn } : {}),
    })
    return on + box.max.y
  }

  /**
   * Paper pieces carry their own UVs, laid out before the piece is turned, so
   * the paper's grain and feint rules stay square to its edges. The rules fall
   * on v = 0, so a sheet projected about its own mid-thickness wore a rule on
   * every edge, a grey line round each sheet; half a rule up, the edges land
   * between two rules and stay paper-white.
   */
  const paperPiece = (geometry, metresPerTile) => {
    const halfRule = metresPerTile / 64
    geometry.translate(0, halfRule, 0)
    const finished = finalize(geometry, { crease: null, metresPerTile })
    finished.translate(0, -halfRule, 0)
    return finished
  }
  // A blotting pad with leather corners, on the curator's side. At 0.02 m a
  // tile the rules shrink below a pixel: blotting paper is not ruled.
  const PAD = { width: 0.26, depth: 0.32, thickness: 0.002, x: -0.1, z: -0.12, rotation: 0.035 }
  const padPieces = [[paperPiece(plainBox(PAD.width, PAD.thickness, PAD.depth, 0, PAD.thickness / 2, 0), 0.02), paper]]
  for (const [cx, cz, turn] of [[-1, -1, 0], [1, -1, -Math.PI / 2], [1, 1, Math.PI], [-1, 1, Math.PI / 2]]) {
    // A right-angled leather pocket folded over each corner of the pad.
    const size = 0.045
    const corner = sweepProfile(
      [
        [0, 0],
        [size, 0],
        [0, size],
      ],
      0.0012,
      { bevel: 0 },
    )
    corner.rotateX(Math.PI / 2)
    corner.rotateY(turn)
    corner.translate((cx * PAD.width) / 2, PAD.thickness + 0.0006, (cz * PAD.depth) / 2)
    padPieces.push([corner, leather])
  }
  const padTop = placeItem('blotting-pad', padPieces, { x: PAD.x, z: PAD.z, rotation: PAD.rotation })

  // Four loose sheets on the pad, portrait to the curator so the paper's
  // feint rules run across them. A millimetre each: three-millimetre slabs
  // stacked into a 12 mm brick is what they used to be.
  const sheetPieces = []
  for (let index = 0; index < 4; index += 1) {
    const sheet = paperPiece(new BoxGeometry(0.172 - index * 0.005, 0.001, 0.232 - index * 0.007), 0.25)
    sheet.rotateY(-0.03 + index * 0.02)
    sheet.translate(index * 0.002, 0.0005 + index * 0.0011, index * 0.003)
    sheetPieces.push([sheet, paper])
  }
  placeItem('loose-sheets', sheetPieces, { x: PAD.x, z: PAD.z, rotation: PAD.rotation, on: padTop, restsOn: 'blotting-pad' })

  // A compact three-drawer card file. It occupies the back-left corner, clear
  // of both the interactive lamp and the separately placed ledger stack.
  const fileWidth = 0.275
  const fileDepth = 0.205
  const fileHeight = 0.165
  const filePieces = []
  const fileCase = bevelledBox(fileWidth, fileHeight, fileDepth, 0.005, 1)
  fileCase.translate(0, fileHeight / 2, 0)
  filePieces.push([fileCase, props])
  for (let index = 0; index < 3; index += 1) {
    const drawerY = 0.034 + index * 0.05
    filePieces.push(
      [plainBox(fileWidth - 0.025, 0.04, 0.012, 0, drawerY, fileDepth / 2 + 0.004), props],
      [plainBox(0.052, 0.018, 0.008, 0, drawerY + 0.006, fileDepth / 2 + 0.015), brass],
    )
    // A small turned knob under each label holder: a drawer nobody can pull
    // is a block of wood with lines on it.
    const knob = new CylinderGeometry(0.0055, 0.0065, 0.009, 6)
    knob.rotateX(Math.PI / 2)
    knob.translate(0, drawerY - 0.009, fileDepth / 2 + 0.0145)
    filePieces.push([knob, brass])
  }
  placeItem('card-file', filePieces, { x: -0.42, z: -0.13 })

  /**
   * The inkstand: a walnut tray with a pen groove and two brass-capped wells,
   * between the blotting pad and the ledgers, within the curator's reach. It
   * and the letter opener are what say somebody wrote at this desk, by hand.
   */
  const inkPieces = []
  const tray = bevelledBox(0.2, 0.016, 0.105, 0.004, 1)
  tray.translate(0, 0.008, 0)
  inkPieces.push([tray, props])
  for (const side of [-1, 1]) {
    const well = lathe(
      [
        [0, 0],
        [0.022, 0],
        [0.023, 0.026],
        [0.015, 0.032],
        [0, 0.033],
      ],
      8,
    )
    well.translate(side * 0.048, 0.016, 0.014)
    inkPieces.push([well, brassTurned])
    const cap = lathe(
      [
        [0, 0],
        [0.0135, 0],
        [0.0135, 0.007],
        [0, 0.012],
      ],
      8,
    )
    cap.translate(side * 0.048, 0.016 + 0.032, 0.014)
    inkPieces.push([cap, brassTurned])
  }
  const dipPen = new CylinderGeometry(0.0038, 0.0032, 0.16, 8)
  dipPen.rotateZ(Math.PI / 2)
  dipPen.translate(0, 0.016 + 0.0038, -0.034)
  inkPieces.push([dipPen, brassTurned])
  placeItem('inkstand', inkPieces, { x: 0.16, z: -0.21, rotation: 0.06 })

  // A brass letter opener left beside the post, blade and turned handle.
  const blade = plainBox(0.13, 0.0016, 0.016, 0.0575, 0.0008, 0)
  const handle = new CylinderGeometry(0.0052, 0.0056, 0.075, 6)
  handle.rotateZ(Math.PI / 2)
  handle.translate(-0.045, 0.0056, 0)
  placeItem('letter-opener', [[blade, brass], [handle, brass]], { x: 0.09, z: 0.075, rotation: 0.15 })

  // The telephone is its own recipe now (`desk-telephone`), placed beside
  // the blotter like the ledgers: it needs bakelite, not this desk's metal.
  return {
    timber: finalize(merge(timber), { crease: Math.PI / 5, metresPerTile: 0.7 }),
    // 63 degrees: hexagonal rosettes and the opener's handle turn smooth,
    // while every box edge (90 degrees) stays a crisp arris.
    brass: finalize(
      merge([
        finalize(merge(brass), { crease: 1.1, metresPerTile: 0.22 }),
        finalize(merge(brassTurned), { crease: null, metresPerTile: 0.22 }),
      ]),
      { uv: 'none', crease: null },
    ),
    leather: finalize(merge(leather), { crease: null, metresPerTile: 0.12 }),
    // Every paper piece carries its own UVs, laid out before it was turned.
    paper: finalize(merge(paper), { uv: 'none', crease: null }),
    props: finalize(merge(props), { crease: null, metresPerTile: 0.35 }),
    layout: {
      top: height,
      blotter: {
        centre: [0, blotterZ],
        halfSize: [blotterWidth / 2, blotterDepth / 2],
        top: blotterTop,
      },
      items,
    },
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
  const leatherSmooth = []
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
   * The cushion. A lathe gives a round seat; the scale afterwards makes it
   * 424 mm across and 384 deep, which is the proportion of a real captain's
   * chair and the cheapest asymmetry in the whole part — one line, no extra
   * triangles. It used to dish 17 mm from rim to centre like a timber saddle;
   * a stuffed leather seat does the opposite and crowns 18 mm above its
   * welt, with the same nine profile points.
   */
  const SEAT_SCALE = [1.07, 0.97]
  const SEAT_FORWARD = 0.012
  const seat = lathe(
    [
      [0, 0],
      [0.110, 0],
      [0.176, 0.005],
      [0.196, 0.017],
      [0.198, 0.030],
      [0.190, 0.041],
      [0.150, 0.050],
      [0.080, 0.055],
      [0, 0.056],
    ],
    18,
  )
  seat.scale(SEAT_SCALE[0], 1, SEAT_SCALE[1])
  // Shifted forward, because a swivel seat is not centred on its column — the
  // sitter's weight is in front of the post.
  seat.translate(0, seatBase, SEAT_FORWARD)
  leather.push(seat)

  // The welt where the crown meets the drum of the cushion.
  const seatWelt = []
  for (let index = 0; index < 24; index += 1) {
    const phi = (index / 24) * Math.PI * 2
    seatWelt.push(
      new Vector3(
        0.195 * SEAT_SCALE[0] * Math.sin(phi),
        seatBase + 0.038,
        0.195 * SEAT_SCALE[1] * Math.cos(phi) + SEAT_FORWARD,
      ),
    )
  }
  leatherSmooth.push(piping(seatWelt, 0.004, { segments: 24, radial: 3, closed: true }))

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
  //
  // Authored upright about its own centre and leaned as one body, so the
  // slab, the tufted face, its buttons, the welt and the nail heads can never
  // drift apart.
  const backCentreY = stickBase + 0.275
  const backCentreZ = -0.195
  const BACK = { width: 0.365, height: 0.405, depth: 0.065, radius: 0.014 }
  const placeBack = (geometry) => {
    geometry.rotateX(-BACK_RAKE)
    geometry.translate(0, backCentreY, backCentreZ)
    return geometry
  }
  leather.push(placeBack(bevelledBox(BACK.width, BACK.height, BACK.depth, BACK.radius, 1)))

  /**
   * Deep diamond tufting on the face the sitter leans on: eight buttons on
   * grid vertices, each pulling the crowned face 18 mm in. A flat slab with
   * buttons glued on was the old back, and it read as a pin board; shallower
   * dimples read as stains.
   */
  const panelWidth = BACK.width - BACK.radius * 2
  const panelHeight = BACK.height - BACK.radius * 2
  const TUFT = { columns: 8, rows: 10, crown: 0.016, dimple: 0.018, spread: 0.022 }
  const buttons = [
    [2, 2], [4, 2], [6, 2],
    [3, 5], [5, 5],
    [2, 8], [4, 8], [6, 8],
  ].map(([column, row]) =>
    quiltedGridPoint(panelWidth, panelHeight, TUFT.columns, TUFT.rows, column, row),
  )
  const tuft = { ...TUFT, buttons }
  const faceZ = BACK.depth / 2 + 0.0008
  const tufted = quiltedPanel(panelWidth, panelHeight, tuft)
  tufted.translate(0, 0, faceZ)
  leatherSmooth.push(placeBack(tufted))
  for (const [x, y] of buttons) {
    const button = domeStud(0.0105, 0.0065)
    // Dome along +Y → along +Z, out of the face, sunk 2 mm into its dimple.
    button.rotateX(Math.PI / 2)
    button.translate(x, y, faceZ + quiltedHeight(panelWidth, panelHeight, x, y, tuft) - 0.002)
    leatherSmooth.push(placeBack(button))
  }
  const backWelt = roundedRectPoints(panelWidth, panelHeight, 0.02, 2).map(
    ([x, y]) => new Vector3(x, y, BACK.depth / 2 + 0.0012),
  )
  leatherSmooth.push(placeBack(piping(backWelt, 0.004, { segments: 28, radial: 3, closed: true })))

  // Sparse brass nail heads close the leather along the back's two long
  // sides, where the lamp grazes them, without turning the chair into a
  // dotted outline.
  for (const side of [-1, 1]) {
    for (let index = 0; index < 6; index += 1) {
      const stud = domeStud(0.0055, 0.0032)
      // Dome along +Y → along ±X, out of the side face.
      stud.rotateZ((-side * Math.PI) / 2)
      stud.translate(side * (BACK.width / 2 - 0.0004), -0.155 + index * 0.062, 0)
      brass.push(placeBack(stud))
    }
  }

  // The lathe and the slab need a crease to keep their arrises; the tufted
  // face, the welts and the buttons carry exact normals of their own, which
  // the crease pass's centimetre hash would smear across the dimples.
  const leatherUv = { metresPerTile: 0.13 }
  return {
    frame: finalize(merge(frame), { crease: Math.PI / 5, metresPerTile: 0.5 }),
    base: finalize(merge(base), { crease: null, metresPerTile: 0.35 }),
    leather: finalize(
      merge([
        finalize(merge(leather), { crease: Math.PI / 5, ...leatherUv }),
        finalize(merge(leatherSmooth), { crease: null, ...leatherUv }),
      ]),
      { uv: 'none', crease: null },
    ),
    // Wide enough to round the eight-sided shoes and six-sided domes, still
    // short of the shoes' 90-degree rims.
    brass: finalize(merge(brass), { crease: Math.PI / 2.2, metresPerTile: 0.18 }),
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

// The bookcases have a module of their own: `bookshelf.mjs`.

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
 *
 * Each ledger is built in its own frame, flat and square to the axes, and then
 * turned and set down on the one below as a rigid body. The spine and its
 * title plate used to be turned about the stack's centre instead of the
 * book's, which slid them up to 8 mm off the boards they belong to, and every
 * volume floated 6 mm above the next.
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
    const spineX = -localWidth / 2
    const book = []

    const lower = bevelledBox(localWidth, coverThickness, localDepth, 0.003, 1)
    lower.translate(0, coverThickness / 2, 0)
    book.push([lower, covers])

    // The text block as three gathered signatures, a millimetre and a half
    // out of true with each other: one bevelled block was a perfect brick of
    // paper, and 72 triangles dearer than the three plain ones.
    const signature = pageHeight / 3
    for (const [part, [dx, dz]] of [[0, 0], [-0.0015, 0.0015], [0.001, -0.001]].entries()) {
      book.push([
        plainBox(
          localWidth - 0.018,
          signature,
          localDepth - 0.016,
          0.006 + dx,
          coverThickness + signature * (part + 0.5),
          dz,
        ),
        pages,
      ])
    }

    const upper = bevelledBox(localWidth, coverThickness, localDepth, 0.003, 1)
    upper.translate(0, layer.thickness - coverThickness / 2, 0)
    book.push([upper, covers])

    // Brass corners on the upper board's fore-edge, where a ledger dragged
    // across a desk for decades wears through first. Half a millimetre proud
    // of the board all round; no underside, nobody sees under a board.
    for (const side of [-1, 1]) {
      const e = 0.0005
      const leg = 0.028
      const x = localWidth / 2 + e
      const z = side * (localDepth / 2 + e)
      const y0 = layer.thickness - coverThickness - e
      const y1 = layer.thickness + e
      const tip = [x, y1, z]
      const alongX = [x - leg, y1, z]
      const alongZ = [x, y1, z - side * leg]
      book.push([flatPolygon([tip, alongX, alongZ], [0, 1, 0]), brass])
      book.push([flatPolygon([[x, y0, z], [x - leg, y0, z], alongX, tip], [0, 0, side]), brass])
      book.push([flatPolygon([[x, y0, z], [x, y0, z - side * leg], alongZ, tip], [1, 0, 0]), brass])
    }

    // The volume in use, on top, carries the archive's paper label.
    if (index === layers.length - 1) {
      const top = layer.thickness + 0.0006
      book.push([
        flatPolygon(
          [
            [0.02, top, -0.034],
            [0.11, top, -0.034],
            [0.11, top, 0.034],
            [0.02, top, 0.034],
          ],
          [0, 1, 0],
        ),
        pages,
      ])
    }

    // A proud spine hides the mathematically perfect page/case seam and gives
    // the stack a readable direction from across the office.
    const spine = bevelledBox(0.018, layer.thickness, localDepth, 0.004, 1)
    spine.translate(spineX + 0.009, layer.thickness / 2, 0)
    book.push([spine, covers])

    // Two raised bands across the spine, the cords a ledger is sewn on. They
    // break its one long highlight into panels, which is what reads as bound.
    for (const z of [-localDepth * 0.24, localDepth * 0.24]) {
      book.push([plainBox(0.003, layer.thickness - 0.01, 0.006, spineX - 0.001, layer.thickness / 2, z), covers])
    }

    // A recessed title holder gives every anonymous volume an archival role,
    // and the card slipped into it carries the hand-written year.
    const holderY = layer.thickness * 0.55
    book.push([plainBox(0.004, 0.019, 0.082, spineX - 0.0015, holderY, 0), brass])
    book.push([plainBox(0.0008, 0.013, 0.07, spineX - 0.0039, holderY, 0), pages])

    for (const [geometry, family] of book) {
      geometry.rotateY(layer.rotation)
      geometry.translate(layer.x, y, layer.z)
      family.push(geometry)
    }

    // Half a millimetre of air: closer and the boards would z-fight.
    y += layer.thickness + 0.0005
  }

  return {
    // 3.5 mm grain on calf, and on the page blocks the paper's rules become
    // the fine striation of stacked page edges.
    covers: finalize(merge(covers), { crease: null, metresPerTile: 0.09 }),
    pages: finalize(merge(pages), { crease: null, metresPerTile: 0.02 }),
    brass: finalize(merge(brass), { crease: null, metresPerTile: 0.14 }),
  }
}
