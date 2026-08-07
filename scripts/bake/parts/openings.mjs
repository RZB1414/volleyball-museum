/**
 * Doorways.
 *
 * `wallSegments` cuts every opening by segmentation, which is the right call —
 * but it leaves a rectangular hole through a wall and absolutely nothing else.
 * A hole reads as a missing polygon. A doorway reads as a building, and the
 * difference is four objects: the lining that clads the hole, the architrave
 * that frames it, the strip that closes the floor joint, and a leaf standing
 * open in it.
 *
 * The four are separate parts because they belong to different frames of
 * reference. The reveal belongs to the 0.5 m sandwich two rooms make where
 * their 0.25 m walls meet back to back; the architrave belongs to ONE room's
 * wall face and is placed twice, once per side; the threshold belongs to the
 * floor; the leaf belongs to its own hinge and is rotated about it.
 *
 * Nothing here is animated. The leaf is authored to be stood open at an angle
 * and left there, which is the single cheapest way to make a corridor look
 * lived in — an ajar door is a story, a closed one is a wall.
 */

import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three'

import { EDGE, bevelledBox, finalize, lathe, merge, sweepProfile } from '../lib/geometry.mjs'

/**
 * Leaf thickness, 45 mm. A modern internal door is 35 mm; this building's are
 * the heavier 1¾" pattern, which is what lets the leaf carry four panels and a
 * mortice lock without looking like hardboard.
 *
 * The reveal needs the same number to know where to plant its door stop, so it
 * lives up here rather than inside either generator.
 */
const LEAF_THICKNESS = 0.045

// ---------------------------------------------------------------------------
// 1 · The reveal
// ---------------------------------------------------------------------------

/**
 * The lining: two jambs and a soffit cladding the inside of an opening.
 *
 * Authored centred on x = 0 with the wall sandwich centred on z = 0 and the
 * boards standing on y = 0, so the whole U drops straight onto a portal
 * position with no offset.
 *
 * The boards sit flush with the opening's cut faces rather than inside them.
 * That puts the lining's back face exactly coplanar with the wall segment's end
 * face — which is fine, because the two face opposite ways and each is culled
 * from wherever the other is visible. What it does NOT hide is the 6 mm bevel
 * the wall segment carries on its own arris, which leaves a hairline notch
 * where lining meets plaster. Covering exactly that notch is what an architrave
 * has been for since the Georgians, so `buildArchitrave` is not optional
 * decoration: it is the second half of this part.
 */
export function buildDoorReveal({ width = 1.6, height = 2.4, thickness = 0.5 } = {}) {
  const board = 0.025
  const parts = []

  for (const side of [-1, 1]) {
    const jamb = bevelledBox(board, height, thickness, EDGE)
    jamb.translate(side * (width / 2 - board / 2), height / 2, 0)
    parts.push(jamb)
  }

  /**
   * The soffit runs the FULL width and the jambs run the full height, so the
   * two interpenetrate at the corners.
   *
   * Housing the head between the jambs is the correct joinery and it is the
   * wrong geometry: butted, the head's end face and the jamb's inner face meet
   * as two bevelled arrises and open a 6 mm notch at the top of each reveal,
   * 2.4 m up where a player's torch beam sits. Interpenetration is invisible —
   * the jamb's front face occludes everything of the soffit beyond it — and it
   * renders exactly like a housed joint.
   */
  const head = bevelledBox(width, board, thickness, EDGE)
  head.translate(0, height - board / 2, 0)
  parts.push(head)

  /**
   * The planted door stop.
   *
   * Three boards on their own are a U-channel; the stop is the one member that
   * says a door closes here, and it draws a shadow line the full depth of the
   * reveal. Set one leaf thickness in from the -Z face, so the leaf hangs flush
   * with that wall face and swings towards -Z. Mirror the assembly in Z for a
   * doorway handed the other way.
   */
  const stopProud = 0.012
  const stopDepth = 0.040
  const stopZ = -thickness / 2 + LEAF_THICKNESS + stopDepth / 2
  const stopTop = height - board

  for (const side of [-1, 1]) {
    const stop = bevelledBox(stopProud, stopTop, stopDepth, 0.003, 1)
    stop.translate(side * (width / 2 - board - stopProud / 2), stopTop / 2, stopZ)
    parts.push(stop)
  }

  // Cut BETWEEN the jamb stops, not across them: two 12 mm beads crossing would
  // put coplanar front faces in the same 12 mm square at each top corner, and
  // that patch would z-fight. Butted, the end faces cull each other.
  const headStop = bevelledBox(width - 2 * board - 2 * stopProud, stopProud, stopDepth, 0.003, 1)
  headStop.translate(0, stopTop - stopProud / 2, stopZ)
  parts.push(headStop)

  // Every member is a bevelledBox, so `crease: null` — RoundedBoxGeometry's
  // normals are already exact and re-deriving them off a 1 cm hash would tilt
  // the corners of a 0.5 x 2.4 m board by tens of degrees.
  return { lining: finalize(merge(parts), { crease: null, metresPerTile: 0.45 }) }
}

// ---------------------------------------------------------------------------
// 2 · The architrave
// ---------------------------------------------------------------------------

/**
 * The moulded surround, authored on the plane z = 0 and standing on y = 0, so
 * the caller pushes it out to whichever wall face it belongs to.
 *
 * The section is 90 mm across the wall face and 55 mm proud of the plaster: a
 * built-up surround rather than a planted 18 mm architrave, because 55 mm of
 * projection is what throws a shadow you can read from across a gallery. It is
 * also deeper than the 28 mm skirting, so the skirting dies cleanly into its
 * side instead of fighting it.
 *
 * Profile x is depth out from the wall, y is the distance out from the opening
 * edge. Thickest at the opening and stepping back to a 19 mm fascia at the
 * plaster, which is the way round every real architrave is cut: the eye reads
 * the fat inner arris as the frame and the thin outer one as the wall.
 */
const ARCHITRAVE_SECTION = [
  [0, 0],
  /**
   * The bold inner nose, hard against the lining, with its arris turned in
   * three chords rather than one.
   *
   * A single chamfer here would have been cheaper and wrong twice over. The
   * crease pass splits any edge that turns more than 45 degrees, so a two-chord
   * round comes back faceted; three chords turn 30 degrees each, stay welded,
   * and the arris reads as a rounded edge with a highlight running down it —
   * which is what 55 mm of projection is for.
   */
  [0.049, 0],
  [0.052, 0.0008],
  [0.0542, 0.003],
  [0.055, 0.006],
  [0.055, 0.012],
  // The quirk: a square 9 mm step back, and the only true shadow line in the
  // section. Left square on purpose — both its corners turn 90 degrees, so both
  // stay crisp, and a crisp quirk is what separates the fasciae.
  [0.046, 0.012],
  [0.046, 0.024],
  [0.048, 0.03], // the ovolo swells out again
  [0.05, 0.038],
  [0.047, 0.046],
  [0.04, 0.054], // and rolls over into the cyma
  [0.03, 0.06],
  [0.024, 0.066],
  [0.022, 0.072],
  [0.019, 0.078],
  [0.019, 0.086], // outer fascia
  [0.014, 0.09], // eased onto the plaster rather than left as a raw arris
  [0, 0.09],
]

/** The over-door cap: a slim cornice that oversails the head run. */
const ARCHITRAVE_CAP_SECTION = [
  [0, 0],
  [0.062, 0],
  [0.069, 0.009],
  [0.069, 0.017],
  [0.058, 0.026],
  [0, 0.026],
]

export function buildArchitrave({ width = 1.6, height = 2.4 } = {}) {
  /** The strip of lining left showing inside the architrave. Joiners call it the margin. */
  const margin = 0.008
  const band = 0.09
  const parts = []

  /**
   * `bevel: 0` on every run, and it is not a saving.
   *
   * ExtrudeGeometry puts its bevel on the extrusion CAPS, so the run comes out
   * `length + 2 * bevelThickness` long. On a vertical jamb that is 2 mm of
   * moulding below the floor, which fails the placement test; and the 2 mm
   * outline inset closes up the 9 mm quirk in the section, which can fold the
   * cap triangulation back on itself. Every run end here is either cut square
   * on the floor or housed under the head, exactly as a joiner cuts them, so
   * there is nothing for a cap bevel to do.
   */
  /**
   * The head is 0.6 mm prouder than the jambs.
   *
   * Both runs carry the same section, so where they lap at the corner the two
   * noses arrive at z = 0.055 along a diagonal and coincide there. Coincident
   * surfaces shimmer. Six tenths of a millimetre is invisible as a step, is a
   * hundred times the depth precision at the range this is seen from, and it
   * settles the question of which run laps which — the head does, which is how
   * a joiner would do it when the head is the piece that runs through.
   */
  const headRun = width + 2 * (margin + band)
  const head = sweepProfile(ARCHITRAVE_SECTION, headRun, { bevel: 0 })
  head.rotateY(-Math.PI / 2)
  head.translate(0, height + margin, 0.0006)
  parts.push(head)

  // The jambs run 6 mm up INTO the head. The head laps them — it has to be long
  // enough to cover both jambs' full 90 mm band or the corner opens up — and an
  // overlap is the only way to avoid two coplanar faces meeting at the lap.
  const jambRun = height + margin + 0.006
  for (const side of [-1, 1]) {
    const jamb = sweepProfile(ARCHITRAVE_SECTION, jambRun, { bevel: 0 })
    // rotateY first, exactly as buildFrame does: the sweep runs along Z, and
    // standing it up with rotateZ alone would leave the run pointing out of the
    // wall instead of up it.
    jamb.rotateY(-Math.PI / 2)
    jamb.rotateZ((side * Math.PI) / 2)
    jamb.translate(side * (width / 2 + margin), jambRun / 2, 0)
    parts.push(jamb)
  }

  /**
   * The cap earns its 20 triangles.
   *
   * Three identical runs meeting in two butt laps read as a picture frame
   * screwed to a wall. A crowning band that oversails the head by 16 mm at each
   * end turns the same three runs into an over-door, and it hides the top of
   * both laps into the bargain. It sits 4 mm down into the head so no two faces
   * are ever coplanar.
   */
  const cap = sweepProfile(ARCHITRAVE_CAP_SECTION, headRun + 0.032, { bevel: 0 })
  cap.rotateY(-Math.PI / 2)
  cap.translate(0, height + margin + band - 0.004, 0)
  parts.push(cap)

  return finalize(merge(parts), { crease: Math.PI / 4, metresPerTile: 0.6 })
}

// ---------------------------------------------------------------------------
// 3 · The leaf
// ---------------------------------------------------------------------------

/**
 * A four-panel stile-and-rail door, hinge edge on x = 0 and the leaf running to
 * +X, so a caller stands it open with nothing but `rotation-y` on the node.
 *
 * Built as real members rather than as a slab with decoration stuck to it: two
 * stiles, three rails, two muntins, and four panels set in grooves behind them.
 * That is not pedantry, it is the cheapest way to get the sunk panels — with no
 * CSG in the pipeline the only way to sink a panel is to make it out of a
 * thinner board than the frame around it, and once the frame is separate
 * members the joint lines come free.
 *
 * The members BUTT. They do not overlap. Two members of the same thickness
 * lapping each other would put two coplanar faces in the plane of the door and
 * z-fight across the whole joint; butted, their end faces cull each other and
 * their bevels leave the shadow groove a real door has along every joint.
 *
 * Returns { leaf, furniture } — the leaf in oak, the ironmongery in brass.
 */
export function buildDoorLeaf({ width = 0.8, height = 2.34 } = {}) {
  const half = LEAF_THICKNESS / 2

  /**
   * Real proportions, and deliberately not symmetric.
   *
   * The lock stile is 16 mm wider than the hinge stile because it has to take a
   * mortice lock; the bottom rail is twice the top rail; the lock rail sits
   * well below mid-height. A door with equal members reads as a bookcase back.
   */
  const hingeStile = 0.112
  const lockStile = 0.128
  const bottomRail = 0.232
  const topRail = 0.118
  const muntin = 0.098
  const lockRailBottom = 0.928
  const lockRailTop = 1.108

  const frameLeft = hingeStile
  const frameRight = width - lockStile
  const muntinCentre = (frameLeft + frameRight) / 2
  const topRailBottom = height - topRail

  const timber = []

  /** A frame member from its own bounding rectangle in the plane of the leaf. */
  const member = (x0, y0, x1, y1, segments) => {
    const box = bevelledBox(x1 - x0, y1 - y0, LEAF_THICKNESS, 0.004, segments)
    box.translate((x0 + x1) / 2, (y0 + y1) / 2, 0)
    return box
  }

  // Stiles at two bevel segments: they are the members a player walks past at
  // arm's length and the highlight running down a 4 mm fillet is the whole
  // reason the leaf does not look extruded. Everything else is one segment,
  // which is a flat chamfer and indistinguishable at this radius.
  timber.push(member(0, 0, hingeStile, height, 2))
  timber.push(member(frameRight, 0, width, height, 2))

  timber.push(member(frameLeft, 0, frameRight, bottomRail, 1))
  timber.push(member(frameLeft, lockRailBottom, frameRight, lockRailTop, 1))
  timber.push(member(frameLeft, topRailBottom, frameRight, height, 1))

  const columns = [
    [frameLeft, muntinCentre - muntin / 2],
    [muntinCentre + muntin / 2, frameRight],
  ]
  const rows = [
    [bottomRail, lockRailBottom],
    [lockRailTop, topRailBottom],
  ]

  for (const [y0, y1] of rows) {
    timber.push(member(muntinCentre - muntin / 2, y0, muntinCentre + muntin / 2, y1, 1))
  }

  /**
   * The panels. 20 mm boards on the leaf's centre line, so each face of the
   * panel sits 12.5 mm behind its frame — a genuine sunk panel with a genuine
   * contact shadow, from both sides, for 108 triangles.
   *
   * `groove` runs the panel 14 mm under the surrounding members. A panel cut to
   * the exact opening would show a slot straight through the door wherever the
   * two bevels met.
   */
  const groove = 0.014
  const panelThickness = 0.02
  /** How far the raised field stands in from the opening. */
  const fielding = 0.03

  for (const [x0, x1] of columns) {
    for (const [y0, y1] of rows) {
      const panel = bevelledBox(
        x1 - x0 + groove * 2,
        y1 - y0 + groove * 2,
        panelThickness,
        0.003,
        1,
      )
      panel.translate((x0 + x1) / 2, (y0 + y1) / 2, 0)
      timber.push(panel)

      /**
       * The fielded centre. A 10 mm bevel radius at one segment IS the fielding
       * chamfer — the flat splay a joiner planes around a raised panel — so the
       * detail costs nothing beyond the box it is already on. Under about 8 mm
       * it would vanish into the mip chain; 10 mm survives.
       */
      const field = bevelledBox(
        x1 - x0 - fielding * 2,
        y1 - y0 - fielding * 2,
        panelThickness + 0.012,
        0.01,
        1,
      )
      field.translate((x0 + x1) / 2, (y0 + y1) / 2, 0)
      timber.push(field)
    }
  }

  // ---- ironmongery -------------------------------------------------------

  const brass = []

  /**
   * Two butt hinges, 300 mm from each end.
   *
   * The knuckle stands proud of the -Z FACE, not of the hinge edge, because
   * that is where the pin of a butt hinge actually sits — on the face the door
   * swings towards. Getting this wrong is the tell that reads as "the door is
   * floating in the hole": a knuckle centred in the leaf's thickness looks like
   * a pivot, and pivots belong on shop fronts.
   *
   * -Z, specifically, so the leaf agrees with the reveal it hangs in without
   * anybody having to think. `buildDoorReveal` plants its stop one leaf
   * thickness in from -Z, which means the door closes into that end and opens
   * away from it; and rotateY takes +X towards -Z, so hanging the leaf on the
   * jamb at -width/2 and winding rotation-y positive swings it open. Any other
   * combination needs the part mirrored, and a mirrored part needs its winding
   * order flipped, which nothing downstream does.
   */
  const knuckleZ = -0.02
  for (const y of [0.3, height - 0.3]) {
    const barrel = lathe(
      [
        [0, 0],
        [0.0075, 0.002],
        [0.009, 0.008],
        [0.009, 0.09],
        [0.0075, 0.096],
        [0, 0.098],
      ],
      12,
    )
    barrel.translate(0.002, y - 0.049, knuckleZ)
    brass.push(barrel)

    /**
     * The flap, let into the edge of the leaf.
     *
     * It has to start ON the -Z face and run 28 mm back across the 45 mm edge,
     * which is where a real one is chopped in. Left centred on the knuckle it
     * hung 8 mm off the front of the door — brass floating in mid-air beside a
     * door that had, from the front, no hinge at all.
     *
     * Unbevelled and 4 mm thick: it is a flat plate, and nothing catches an
     * edge that thin except triangles.
     */
    const flap = new BoxGeometry(0.004, 0.098, 0.028)
    flap.translate(-0.0005, y, -half + 0.014)
    brass.push(flap)
  }

  /**
   * Lever, rose and escutcheon, on both faces.
   *
   * 70 mm backset from the lock edge, on the centre line of the lock rail. The
   * lever points back towards the hinge and returns towards the door at its
   * tip, which is not styling — a lever that does not return catches sleeves,
   * so every lever ever made has one.
   */
  const backset = 0.072
  const leverX = width - backset
  const leverY = (lockRailBottom + lockRailTop) / 2

  for (const face of [1, -1]) {
    const rose = lathe(
      [
        [0, 0],
        [0.028, 0],
        [0.028, 0.004],
        [0.025, 0.009],
        [0.012, 0.012],
        [0, 0.012],
      ],
      16,
    )
    rose.rotateX((face * Math.PI) / 2)
    rose.translate(leverX, leverY, face * half)
    brass.push(rose)

    const neck = new CylinderGeometry(0.013, 0.017, 0.03, 12)
    neck.rotateX(Math.PI / 2)
    neck.translate(leverX, leverY, face * (half + 0.014))
    brass.push(neck)

    const curve = new CatmullRomCurve3(
      [
        [0, 0, 0.026],
        [-0.035, 0, 0.03],
        [-0.072, -0.004, 0.028],
        [-0.098, -0.013, 0.021],
        [-0.108, -0.026, 0.012],
      ].map(([x, y, z]) => new Vector3(leverX + x, leverY + y, face * (half + z))),
      false,
      'catmullrom',
      0.5,
    )
    brass.push(new TubeGeometry(curve, 10, 0.0105, 8, false))

    // A tube is open at both ends; the tail is buried in the neck, the tip is
    // not, and an open tip reads as a hole punched in the handle.
    const tip = new SphereGeometry(0.0105, 8, 6)
    tip.translate(leverX - 0.108, leverY - 0.026, face * (half + 0.012))
    brass.push(tip)

    // Keyhole escutcheon. A mortice lock needs a key, and the little disc under
    // the lever is what tells the player this door was locked by somebody.
    const escutcheon = lathe(
      [[0, 0], [0.018, 0], [0.018, 0.003], [0.014, 0.006], [0, 0.006]],
      14,
    )
    escutcheon.rotateX((face * Math.PI) / 2)
    escutcheon.translate(leverX, lockRailBottom + 0.04, face * half)
    brass.push(escutcheon)
  }

  return {
    // Pure bevelledBox, so no crease pass — see finalize's note. The panels
    // would be the first casualty: a 3 mm fillet re-derived off a 1 cm hash
    // comes back as a smear.
    leaf: finalize(merge(timber), { crease: null, metresPerTile: 0.5 }),
    furniture: finalize(merge(brass), { crease: Math.PI / 5, metresPerTile: 0.25 }),
  }
}

// ---------------------------------------------------------------------------
// 4 · The threshold
// ---------------------------------------------------------------------------

/**
 * The brass strip across the opening, 14 mm proud and authored with min Y at 0.
 *
 * It is doing a real job as well as a decorative one. Two rooms' floor slabs
 * meet under the doorway, and that seam is the one place in the building where
 * two coplanar surfaces are guaranteed to touch. The raised centre band covers
 * it, and it breaks up half a metre of unrelieved brass into three fields.
 *
 * Profile x runs across the doorway (the wall sandwich) and y is height, so the
 * section is authored straight into world coordinates and the sweep runs the
 * width. Every step is a 45-degree chamfer: at 45 degrees the crease pass keeps
 * the arris hard, and a hard arris is what a machined strip has.
 */
export function buildThreshold({ width = 1.62, depth = 0.5 } = {}) {
  const half = depth / 2
  const plate = 0.01
  const proud = 0.014
  /** Half-width of the raised band that covers the slab joint. */
  const band = 0.03

  /**
   * A scored line in each flat field, 20 mm across.
   *
   * Half a metre of unbroken brass is a mirror, and a mirror shows every flaw
   * in the reflection probe. The two lines break the field into three and read
   * as the lap between the centre cover and the plate under it. They are only
   * 2.8 mm deep because depth is not what makes a scored line legible — width
   * is, and 20 mm survives the mip chain where an 8 mm groove would not.
   */
  const score = (centre) => [
    [centre - 0.01, plate],
    [centre - 0.006, plate - 0.0028],
    [centre + 0.006, plate - 0.0028],
    [centre + 0.01, plate],
  ]

  const section = [
    [-half, 0],
    [-half + plate, plate],
    ...score(-0.14),
    [-band - 0.014, plate],
    [-band - 0.004, proud],
    [band + 0.004, proud],
    [band + 0.014, plate],
    ...score(0.14),
    [half - plate, plate],
    [half, 0],
  ]

  // `bevel: 0` for the same reason as the architrave: the cap bevel would add
  // 4 mm to the width, and both ends of this run are buried under the lining.
  const strip = sweepProfile(section, width, { bevel: 0 })
  strip.rotateY(-Math.PI / 2)

  // Math.PI/6 rather than the usual PI/5: the chamfers are at 45 degrees, and
  // any crease angle above 45 would average the top face's corner normals into
  // them and put a soft gradient down a metallic surface, where it shows.
  return finalize(strip, { crease: Math.PI / 6, metresPerTile: 0.3 })
}
