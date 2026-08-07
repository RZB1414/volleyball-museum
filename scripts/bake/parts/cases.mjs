/**
 * Display cases and room-dividing walls.
 *
 * The kit could furnish a floor and not a wall: one table vitrine, a plinth and
 * a bench, all of them islands in the middle of the room. A gallery is mostly
 * its perimeter — a visitor walks the walls and reads them — so a wing built
 * only from islands reads as an empty box with furniture in it.
 *
 * Four parts here, and they are all about the vertical surfaces: a glazed case
 * that hangs on a wall, a tower case that MAKES a wall face out of a corner of
 * the floor, a freestanding partition that cuts a hall in half, and an empty
 * frame for the walls where there is no licensed photograph to hang.
 */

import { CylinderGeometry } from 'three'

import { EDGE, bevelledBox, finalize, merge, sweepProfile } from '../lib/geometry.mjs'

/**
 * Every moulding in this file is swept with `bevel: 0`, and that is a
 * correctness decision rather than a saving.
 *
 * ExtrudeGeometry's bevel expands the section OUTWARD by its own size on every
 * axis, the two end caps included. Two consequences, both of which bit:
 *
 *   - a skirting whose profile starts at y = 0 actually dips 2 mm below the
 *     floor, so the part fails the grounding rule by exactly the bevel size;
 *   - a run cut to length to meet its neighbour at an external corner comes up
 *     2 mm short at both ends, leaving a notch at precisely the corner the
 *     return exists to articulate.
 *
 * Nothing is lost. Every profile below carries its own chamfers — that is what
 * a profile is for — so the extrude bevel was only ever rounding the ends, and
 * the ends here are either buried in the next run or deliberately square.
 */
const SQUARE_ENDS = { bevel: 0 }

/**
 * A swept section run along X, its depth projecting toward +Z (`facing` 1) or
 * -Z (`facing` -1).
 *
 * `sweepProfile` authors the section with +X as depth and extrudes along Z, so
 * the sign of the quarter turn is what chooses which face the moulding lands
 * on — `-PI/2` for +Z, `+PI/2` for -Z. It is the trap `buildWall` documents at
 * length: get it wrong and the moulding is extruded into the back of the thing
 * it was meant to decorate, invisible and still costing its triangles. Made
 * explicit here because this file genuinely needs both directions — a partition
 * is seen from both sides.
 */
function lateralRun(profile, length, facing = 1) {
  const bar = sweepProfile(profile, length, SQUARE_ENDS)
  bar.rotateY(facing > 0 ? -Math.PI / 2 : Math.PI / 2)
  return bar
}

/** A swept section run along Z, its depth projecting toward +X or -X. */
function longitudinalRun(profile, length, facing = 1) {
  const bar = sweepProfile(profile, length, SQUARE_ENDS)
  if (facing < 0) bar.rotateY(Math.PI)
  return bar
}

/**
 * One member of a four-sided frame lying in the XY plane, section projecting +Z.
 *
 * The section is authored with +Y pointing OUT of the sight opening, so the
 * same profile serves all four members and `side` only decides which way out
 * is. Order matters: bring the run onto X first, then stand it up. Rotating
 * about Z before Y leaves the run on Z and the stiles shoot out of the wall —
 * the failure `buildFrame` documents.
 */
function frameRun(profile, length, side) {
  const bar = sweepProfile(profile, length, SQUARE_ENDS)
  bar.rotateY(-Math.PI / 2)
  if (side === 'bottom') bar.rotateZ(Math.PI)
  else if (side === 'left') bar.rotateZ(Math.PI / 2)
  else if (side === 'right') bar.rotateZ(-Math.PI / 2)
  return bar
}

// ---------------------------------------------------------------------------
// 1 · Wall vitrine
// ---------------------------------------------------------------------------

/** Sill: a bold nosing with a drip, the boldest projection on the case. */
const sillSection = (depth, height) => [
  [0, 0],
  [depth - 0.010, 0],
  [depth, 0.012],
  [depth - 0.004, 0.026],
  [depth - 0.016, height],
  [0, height],
]

/** Head: the same idea held 6 mm shy of the sill, so the case reads bottom-heavy. */
const headSection = (depth, height) => [
  [0, 0],
  [depth - 0.020, 0],
  [depth - 0.006, 0.012],
  [depth - 0.010, 0.028],
  [depth - 0.026, height],
  [0, height],
]

/** Glazing bar: a bead at the glass, a flat face, a chamfer back to the carcass. */
const GLAZING_SECTION = [
  [0, 0],
  [0.020, 0.004],
  [0.028, 0.014],
  [0.028, 0.032],
  [0.018, 0.042],
  [0.006, 0.044],
  [0, 0.044],
]

/**
 * A glazed wall case: sill, lined carcass, mitred glazing frame, head.
 *
 * Authored centred on x = 0 with the WALL PLANE at z = 0, projecting into the
 * room along +Z, and the underside of the sill at y = 0 so the caller lifts the
 * whole thing to a sill height of 0.75 with no per-part offset to remember.
 *
 * `depth` is the TOTAL projection into the room, not the depth of the case
 * interior: the sill nosing is what reaches z = depth and the glazing frame
 * face sits 20 mm behind it. Sizing the interior to `depth` instead put the
 * sill 22 mm proud of the declared footprint, which is exactly the kind of
 * quiet disagreement between a collider and a mesh that lets a player's hand
 * pass through a case.
 */
export function buildWallVitrine({ width = 1.6, height = 1.1, depth = 0.42 } = {}) {
  const SILL_HEIGHT = 0.038
  const SHADOW_GAP = 0.018
  const HEAD_HEIGHT = 0.046
  const PANEL = 0.022
  const FRAME_WIDTH = 0.044
  const FRAME_DEPTH = 0.028
  /** How far the sill and head oversail the glazing frame, in plan and on end. */
  const NOSE = 0.020
  const OVERSAIL = 0.030

  const carcassW = width - OVERSAIL
  const bodyLow = SILL_HEIGHT + SHADOW_GAP
  const bodyHigh = height - HEAD_HEIGHT
  const bodyH = bodyHigh - bodyLow
  const frameFace = depth - NOSE
  const caseFront = frameFace - FRAME_DEPTH

  const carcass = []
  const glass = []

  const sill = lateralRun(sillSection(depth, SILL_HEIGHT), width)
  carcass.push(sill)

  // The shadow gap: a recessed band between the sill and the carcass. It is the
  // difference between a case that was made and a box that was extruded, and it
  // costs one bevelled box.
  const gap = bevelledBox(carcassW - 0.044, SHADOW_GAP, caseFront - 0.044, 0.004, 1)
  gap.translate(0, SILL_HEIGHT + SHADOW_GAP / 2, (caseFront - 0.044) / 2)
  carcass.push(gap)

  const back = bevelledBox(carcassW, bodyH, 0.018, EDGE, 1)
  back.translate(0, bodyLow + bodyH / 2, 0.009)
  carcass.push(back)

  const sideDepth = caseFront - 0.018
  for (const side of [-1, 1]) {
    const jamb = bevelledBox(PANEL, bodyH, sideDepth, EDGE, 1)
    jamb.translate(side * (carcassW / 2 - PANEL / 2), bodyLow + bodyH / 2, 0.018 + sideDepth / 2)
    carcass.push(jamb)
  }

  const top = bevelledBox(carcassW, PANEL, sideDepth, EDGE, 1)
  top.translate(0, bodyHigh - PANEL / 2, 0.018 + sideDepth / 2)
  carcass.push(top)

  // The deck: the display surface objects actually stand on, set on the sill
  // between the two jambs.
  const deckDepth = caseFront - 0.036
  const deck = bevelledBox(carcassW - PANEL * 2, 0.026, deckDepth, 0.004, 1)
  deck.translate(0, bodyLow + 0.013, 0.018 + deckDepth / 2)
  carcass.push(deck)

  /**
   * Two risers of different heights and different lengths, at the back of the
   * deck.
   *
   * This is how a case is actually dressed — objects at the back are stepped up
   * so they clear the ones in front — and it is the one place in this part
   * where the symmetry can be broken without the case looking broken. A
   * perfectly mirrored fit-out is the tell that nobody ever laid anything out
   * in it.
   *
   * Spans are fractions of the interior rather than metres, so a caller who
   * narrows the case gets narrower risers instead of two blocks driven through
   * the jambs.
   */
  const innerHalf = carcassW / 2 - PANEL
  for (const [from, to, riseHeight] of [
    [-0.92, 0.13, 0.058],
    [0.24, 0.97, 0.086],
  ]) {
    const riser = bevelledBox((to - from) * innerHalf, riseHeight, 0.11, 0.005, 1)
    riser.translate(
      ((from + to) / 2) * innerHalf,
      bodyLow + 0.026 + riseHeight / 2,
      0.018 + 0.055,
    )
    carcass.push(riser)
  }

  const head = lateralRun(headSection(depth, HEAD_HEIGHT), width)
  head.translate(0, bodyHigh, 0)
  carcass.push(head)

  // The glazing frame. Rails run the full carcass width and the stiles run the
  // full body height, so the two overlap at every corner: a butt joint that has
  // no gap to show is worth more than a mitre this kit cannot cut.
  const sightLow = bodyLow + FRAME_WIDTH
  const sightHigh = bodyHigh - FRAME_WIDTH
  const sightHalf = carcassW / 2 - FRAME_WIDTH

  const bottomRail = frameRun(GLAZING_SECTION, carcassW, 'bottom')
  bottomRail.translate(0, sightLow, caseFront)
  carcass.push(bottomRail)

  const topRail = frameRun(GLAZING_SECTION, carcassW, 'top')
  topRail.translate(0, sightHigh, caseFront)
  carcass.push(topRail)

  for (const side of [-1, 1]) {
    const stile = frameRun(GLAZING_SECTION, bodyH, side > 0 ? 'right' : 'left')
    stile.translate(side * sightHalf, (sightLow + sightHigh) / 2, caseFront)
    carcass.push(stile)
  }

  // Face pane, 6 mm larger than the sight opening on every edge so it is
  // captured by the glazing bead rather than floating inside it.
  const pane = bevelledBox(sightHalf * 2 + 0.012, sightHigh - sightLow + 0.012, 0.008, 0.002, 1)
  pane.translate(0, (sightLow + sightHigh) / 2, caseFront + 0.006)
  glass.push(pane)

  /**
   * Shelves at unequal spacing: the lowest bay is the tallest, because that is
   * where the big objects go and because three equal bays read as a bookcase.
   *
   * The rises are FRACTIONS of the clear bay, not metres. Hard-coded at 0.36 and
   * 0.68 they were correct at the default 1.1 m and wrong below about 0.84: the
   * clear bay shrinks with the case but the shelves did not, so the upper one
   * climbed through the top panel, through the head moulding and out of the
   * case — 67 mm clear of the roof on a 0.7 m vitrine, 167 mm on a 0.6.
   *
   * Nothing would have caught it downstream. The shelves live in the `glass`
   * geometry, so the carcass keeps reporting honest bounds while the glass part
   * quietly grows past the height the caller asked for, and the placement test
   * only checks a part against its OWN recorded bounds.
   */
  const deckTop = bodyLow + 0.026
  const clearHeight = bodyHigh - PANEL - deckTop
  const shelfDepth = caseFront - 0.070
  for (const fraction of [0.387, 0.72]) {
    const shelf = bevelledBox(carcassW - PANEL * 2 - 0.008, 0.010, shelfDepth, 0.003, 1)
    shelf.translate(0, deckTop + clearHeight * fraction, 0.018 + shelfDepth / 2)
    glass.push(shelf)
  }

  return {
    carcass: finalize(merge(carcass), { crease: Math.PI / 4, metresPerTile: 0.6 }),
    // Only bevelled boxes, so no crease pass: RoundedBoxGeometry's normals are
    // already exact and re-deriving them off a 1 cm hash would tilt the corner
    // of every pane.
    glass: finalize(merge(glass), { crease: null, metresPerTile: 0.5 }),
  }
}

// ---------------------------------------------------------------------------
// 2 · Vitrine tower
// ---------------------------------------------------------------------------

/**
 * Corner post: an L in section, 34 mm on each arm, 15 mm thick, with the
 * outside arris chamfered.
 *
 * An L is what a real vitrine corner is, because the two panes have to land in
 * a rebate and something has to hold them at ninety degrees. It also costs the
 * same as a square post — a sweep is priced by its profile, not its length —
 * and it gives the tower a visible thickness at every corner instead of four
 * suspicious sticks.
 */
const POST_SECTION = [
  [0.006, 0],
  [0.034, 0],
  [0.034, 0.015],
  [0.015, 0.015],
  [0.015, 0.034],
  [0, 0.034],
  [0, 0.006],
]

/**
 * A four-sided freestanding tower case for a single object at eye level.
 *
 * This replaces the `vitrine-tower` mount, which was a fudge: it dropped the
 * table vitrine's glass hood onto the tapered atrium plinth, so a 1.06 m hood
 * overhung a 0.66 m plinth top by 200 mm on every side and the glass had
 * nothing under it. A tower is not a plinth with a hood on it — it is one piece
 * of joinery whose glazing is set INSIDE the plinth's footprint.
 *
 * Standing on y = 0. Deck at 1.02 m, which is the same hand height the shell
 * puts its chair rail at, so the object sits just below the eye and the visitor
 * looks slightly down into the case rather than up at its underside.
 */
export function buildVitrineTower({ width = 0.7, depth = 0.7, height = 1.9 } = {}) {
  const FOOT_HEIGHT = 0.076
  const GAP_HEIGHT = 0.022
  const PLINTH_CAP = 0.032
  const DECK_HEIGHT = 1.02
  const TOP_CAP = 0.056
  const FILLET = 0.016
  /** How far the glazed box is held inside the plinth, each side. */
  const INSET = 0.030

  const caseW = width - INSET * 2
  const caseD = depth - INSET * 2
  const glassTop = height - TOP_CAP - FILLET
  const glazedH = glassTop - DECK_HEIGHT

  const carcass = []
  const glass = []

  // The foot is the widest thing on the tower, so it — and nothing else — sets
  // the declared footprint.
  const foot = bevelledBox(width, FOOT_HEIGHT, depth, 0.007, 1)
  foot.translate(0, FOOT_HEIGHT / 2, 0)
  carcass.push(foot)

  const gap = bevelledBox(width - 0.048, GAP_HEIGHT, depth - 0.048, 0.004, 1)
  gap.translate(0, FOOT_HEIGHT + GAP_HEIGHT / 2, 0)
  carcass.push(gap)

  const shaftBottom = FOOT_HEIGHT + GAP_HEIGHT
  const shaftHeight = DECK_HEIGHT - shaftBottom - PLINTH_CAP
  // Two bevel segments here and only here: the shaft is the one large surface
  // on the part, and a rounded arris on it is what a single-facet chamfer
  // cannot fake at a metre's distance.
  const shaft = bevelledBox(width - 0.020, shaftHeight, depth - 0.020, EDGE, 2)
  shaft.translate(0, shaftBottom + shaftHeight / 2, 0)
  carcass.push(shaft)

  const cap = bevelledBox(width - 0.004, PLINTH_CAP, depth - 0.004, 0.006, 2)
  cap.translate(0, DECK_HEIGHT - PLINTH_CAP / 2, 0)
  carcass.push(cap)

  /**
   * Four corner posts. `POST_SECTION` occupies the first quadrant of its own
   * section, so as built the L's arms run toward +X and -Z from a corner at the
   * origin — the front-left corner of the case. The other three are the same
   * post turned about Y, and the angle has to agree with the corner: a quarter
   * turn the wrong way puts the rebate on the outside and the panes have
   * nothing to sit in.
   */
  const corners = [
    { x: -1, z: 1, turn: 0 },
    { x: 1, z: 1, turn: Math.PI / 2 },
    { x: 1, z: -1, turn: Math.PI },
    { x: -1, z: -1, turn: -Math.PI / 2 },
  ]
  for (const corner of corners) {
    const post = sweepProfile(POST_SECTION, glazedH, SQUARE_ENDS)
    // The sweep runs along Z; stand it up so the run is the post's height.
    post.rotateX(-Math.PI / 2)
    post.rotateY(corner.turn)
    post.translate(corner.x * (caseW / 2), DECK_HEIGHT + glazedH / 2, corner.z * (caseD / 2))
    carcass.push(post)
  }

  const fillet = bevelledBox(caseW + 0.014, FILLET, caseD + 0.014, 0.004, 1)
  fillet.translate(0, glassTop + FILLET / 2, 0)
  carcass.push(fillet)

  const crown = bevelledBox(caseW + 0.044, TOP_CAP, caseD + 0.044, 0.006, 2)
  crown.translate(0, height - TOP_CAP / 2, 0)
  carcass.push(crown)

  /**
   * Hardware, and the only asymmetry on an object that is otherwise four-fold
   * symmetric: two hinge knuckles on the front-left post and a lock boss on the
   * front-right one. A case that cannot be opened is a sculpture of a case, and
   * the hinges are what tell the visitor which face is the door.
   *
   * Both knuckles are placed as a FRACTION of the glazed height. Written as
   * `0.16` and `glazedH - 0.16` the pair crossed over on any tower under about
   * 1.52 m: at 1.4 m the glazing is only 308 mm tall, so the two 48 mm knuckles
   * landed 12 mm apart and merged into one barrel, and under 1.32 m the upper
   * one sat BELOW the lower. A hinge pair that is not a pair is worse than no
   * hinge at all — it is the detail that was supposed to say "this opens".
   */
  for (const fraction of [0.2, 0.8]) {
    const knuckle = new CylinderGeometry(0.012, 0.012, 0.048, 10)
    knuckle.translate(-caseW / 2 + 0.016, DECK_HEIGHT + glazedH * fraction, caseD / 2 + 0.010)
    carcass.push(knuckle)
  }

  const lock = new CylinderGeometry(0.018, 0.018, 0.014, 12)
  lock.rotateX(Math.PI / 2)
  lock.translate(caseW / 2 - 0.016, DECK_HEIGHT + glazedH / 2, caseD / 2 + 0.004)
  carcass.push(lock)

  // Panes tucked into the posts' rebates rather than butted at the corners, so
  // the case has no open mitre for the eye to catch.
  const paneH = glazedH - 0.006
  for (const side of [-1, 1]) {
    const facePane = bevelledBox(caseW - 0.026, paneH, 0.008, 0.002, 1)
    facePane.translate(0, DECK_HEIGHT + 0.003 + paneH / 2, side * (caseD / 2 - 0.011))
    glass.push(facePane)

    const sidePane = bevelledBox(0.008, paneH, caseD - 0.026, 0.002, 1)
    sidePane.translate(side * (caseW / 2 - 0.011), DECK_HEIGHT + 0.003 + paneH / 2, 0)
    glass.push(sidePane)
  }

  const lid = bevelledBox(caseW - 0.026, 0.008, caseD - 0.026, 0.002, 1)
  lid.translate(0, glassTop - 0.004, 0)
  glass.push(lid)

  return {
    carcass: finalize(merge(carcass), { crease: Math.PI / 5, metresPerTile: 0.6 }),
    glass: finalize(merge(glass), { crease: null, metresPerTile: 0.5 }),
  }
}

// ---------------------------------------------------------------------------
// 3 · Gallery partition
// ---------------------------------------------------------------------------

const SKIRTING_PROUD = 0.026
const SKIRTING_HEIGHT = 0.160

/**
 * The partition's skirting deliberately repeats the shell's own profile — an
 * ogee step near the top, 26 mm proud, 160 mm tall.
 *
 * `buildWall` keeps its version private and this file may not reach into it, so
 * the section is restated rather than shared. That is the right trade anyway:
 * the point of matching is that a freestanding partition should read as part of
 * the building rather than as a screen someone wheeled in, and a copy that is
 * visibly the same profile achieves that whether or not it is literally the
 * same array.
 */
const SKIRTING_SECTION = [
  [0, 0],
  [SKIRTING_PROUD, 0],
  [SKIRTING_PROUD, SKIRTING_HEIGHT - 0.046],
  [0.018, SKIRTING_HEIGHT - 0.031],
  [0.020, SKIRTING_HEIGHT - 0.014],
  [0.010, SKIRTING_HEIGHT],
  [0, SKIRTING_HEIGHT],
]

/**
 * A freestanding gallery partition: a plastered slab on a skirting, with one
 * end returned through ninety degrees.
 *
 * The plan's rule is that no wing may be readable in a single glance, and with
 * nothing in it Holyoke is one open box you can survey from the doorway. A
 * partition is the cheapest instrument for that — it hides half the room and
 * gives back two more wall faces to hang things on.
 *
 * The returned end is not decoration. A slab that simply stops has no thickness
 * from the front and reads as a piece of card standing on the floor; a return
 * shows the visitor the wall's section and makes it a built thing. It is on ONE
 * end on purpose — a symmetric U reads as a booth.
 *
 * Standing on y = 0, centred on x = 0, faces on ±Z, the return projecting +Z
 * off the +X end.
 */
export function buildPartition({ width = 3.2, height = 2.4, thickness = 0.12 } = {}) {
  const HEAD_HEIGHT = 0.050
  const HEAD_GAP = 0.024
  const HEAD_SETBACK = 0.010
  /** Projection of the return beyond the main slab's +Z face, skirting included. */
  const RETURN_RUN = 0.62

  /**
   * `width` is the OVERALL footprint, so the plastered slab is two skirting
   * depths narrower and the skirting wraps its ends to land exactly on it. Sized
   * the other way the foot would stand 26 mm proud of the declared bounds at
   * both ends, and the collider the bake derives from those bounds would stop
   * short of the thing the player actually walks into.
   */
  const slabHalf = width / 2 - SKIRTING_PROUD
  const halfT = thickness / 2
  const slabTop = height - HEAD_HEIGHT - HEAD_GAP

  // The return is buried 25 mm into the slab at its back end, so its rear cap
  // sits inside solid material instead of landing coplanar with the slab's back
  // face, where the two rounded arrises would have drawn a rectangle in shadow
  // on an otherwise flat wall.
  const returnZ0 = -halfT + 0.025
  const returnZ1 = halfT + RETURN_RUN - SKIRTING_PROUD
  const returnDepth = returnZ1 - returnZ0
  const returnCentre = (returnZ0 + returnZ1) / 2
  const returnX = slabHalf - thickness / 2

  const face = []
  const foot = []

  const slab = bevelledBox(slabHalf * 2, slabTop, thickness, EDGE, 1)
  slab.translate(0, slabTop / 2, 0)
  face.push(slab)

  const returnSlab = bevelledBox(thickness, slabTop, returnDepth, EDGE, 1)
  returnSlab.translate(returnX, slabTop / 2, returnCentre)
  face.push(returnSlab)

  /**
   * The head: a recessed band under a full-width coping, so the top of the
   * partition ends in a shadow line rather than a cut edge.
   *
   * Each band is set back only on the faces it is seen from — in Z on the main
   * slab, in X on the return — and runs the full length on the other axis. Set
   * back on all four sides it would be short of the wall's ends, and the recess
   * that reads as a shadow line on the face becomes a slot you can see straight
   * through when you walk round to the end of a solid partition.
   */
  const headGap = bevelledBox(slabHalf * 2, HEAD_GAP, thickness - HEAD_SETBACK * 2, 0.004, 1)
  headGap.translate(0, slabTop + HEAD_GAP / 2, 0)
  face.push(headGap)

  const returnHeadGap = bevelledBox(thickness - HEAD_SETBACK * 2, HEAD_GAP, returnDepth, 0.004, 1)
  returnHeadGap.translate(returnX, slabTop + HEAD_GAP / 2, returnCentre)
  face.push(returnHeadGap)

  const coping = bevelledBox(slabHalf * 2, HEAD_HEIGHT, thickness, 0.005, 1)
  coping.translate(0, height - HEAD_HEIGHT / 2, 0)
  face.push(coping)

  const returnCoping = bevelledBox(thickness, HEAD_HEIGHT, returnDepth, 0.005, 1)
  returnCoping.translate(returnX, height - HEAD_HEIGHT / 2, returnCentre)
  face.push(returnCoping)

  /**
   * Six skirting runs, one per exposed face, each given as the two coordinates
   * it runs BETWEEN rather than a length and a centre.
   *
   * Every endpoint below is a face plane plus or minus one skirting depth, and
   * writing it that way is the point: at an EXTERNAL corner the overrun is what
   * fills the corner, and cutting a run to the face it sits on leaves a 26 mm
   * square notch at the arris. At an INTERNAL corner the same overrun simply
   * buries itself in the adjacent slab. Both only work because these sweeps
   * have square ends — with the extrude bevel on, every run stops 2 mm short
   * and the arithmetic is quietly wrong at all six corners of the L.
   */
  const lay = (axis, from, to, offset, facing) => {
    const bar =
      axis === 'x'
        ? lateralRun(SKIRTING_SECTION, to - from, facing)
        : longitudinalRun(SKIRTING_SECTION, to - from, facing)
    const along = (from + to) / 2
    bar.translate(axis === 'x' ? along : offset, 0, axis === 'x' ? offset : along)
    foot.push(bar)
  }

  const west = -slabHalf
  const east = slabHalf
  const returnInner = slabHalf - thickness
  const proud = SKIRTING_PROUD

  // Front of the main slab: stops one skirting depth INTO the return, so the
  // internal corner is solid.
  lay('x', west - proud, returnInner + proud, halfT, 1)
  // Back of the main slab. The return stops short of this face, so the run has
  // the whole wall and wraps both ends.
  lay('x', west - proud, east + proud, -halfT, -1)
  // The west end, returned around a 120 mm reveal.
  lay('z', -halfT - proud, halfT + proud, west, -1)
  // The slab's east end and the return's outer face are one continuous plane,
  // so they take one continuous run.
  lay('z', -halfT - proud, returnZ1 + proud, east, 1)
  // The return's inner face, buried one depth into the main slab at its root.
  lay('z', halfT - proud, returnZ1 + proud, returnInner, -1)
  // The return's free end.
  lay('x', returnInner - proud, east + proud, returnZ1, 1)

  return {
    /**
     * `crease: null`, and this is the part where it matters most.
     *
     * The face is nothing but bevelled boxes, and a 3 m plaster slab is exactly
     * the geometry the crease pass ruins: its faces are a handful of large
     * quads, so four badly averaged corner normals get Gouraud-interpolated
     * across the whole wall and leave a bright pillow in the middle with a
     * shading seam along the diagonal. Splitting the skirting out into its own
     * geometry is therefore not only a material decision — it is what lets the
     * plaster skip a crease pass the mouldings genuinely need.
     */
    face: finalize(merge(face), { crease: null, metresPerTile: 1.7 }),
    foot: finalize(merge(foot), { crease: Math.PI / 4, metresPerTile: 0.6 }),
  }
}

// ---------------------------------------------------------------------------
// 4 · Empty picture frame
// ---------------------------------------------------------------------------

/** Mount board and backing board thickness. See `mountSection`. */
const BOARD = 0.008

/**
 * Frame section: a rebate at the back, a steep inner rise, a flat face, an ogee
 * shoulder, a fall to the outer arris.
 *
 * The rebate — the last three points — is the only concave part and the only
 * part that matters structurally: it is the notch the mount and backing sit in.
 * A frame swept as a plain rectangle has to float its contents in front of
 * itself, and the gap shows from every oblique angle in the room.
 *
 * Every station is a FRACTION of the member width rather than a millimetre
 * figure. Hard-coded stations were right at the default size and wrong at the
 * small end: the ogee shoulder sat at 50 mm on a 40 mm member, so the section
 * bulged 10 mm past its own outer arris and came back in again. The polygon
 * stayed legal, which is why nothing complained — it just made the moulding
 * lumpy in silhouette and, worse, put the frame's real bounds 10 mm outside the
 * width it reports, so the hanging position the caller computes and the object
 * the player sees stop agreeing.
 */
const frameSection = (memberWidth, depth, rebate, lip) => [
  [rebate, 0],
  [depth, memberWidth * 0.13],
  [depth, memberWidth * 0.42],
  [depth - memberWidth * 0.13, memberWidth * 0.61],
  [depth - memberWidth * 0.1, memberWidth * 0.8],
  [depth - memberWidth * 0.35, memberWidth],
  [0, memberWidth],
  [0, lip],
  [rebate, lip],
]

/**
 * Mount section: an eight-millimetre board with a bevelled window edge.
 *
 * The 45-degree cut showing the white core of the board is the single detail
 * that says "mount" rather than "grey rectangle", and it has to be 8 mm rather
 * than the 1.4 mm of real card or it vanishes into the mip chain. Eight-ply
 * museum board exists and is exactly this thick, so the object is not even a
 * lie.
 */
const mountSection = (margin) => [
  [0, 0],
  [BOARD, BOARD],
  [BOARD, margin],
  [0, margin],
]

/**
 * A hanging frame with a mount board and no image.
 *
 * Every wall in this building that has no licensed photograph currently has
 * nothing at all, and a bare plaster wall is what the owner is looking at when
 * he says there is nothing on the walls. An empty mount is not a placeholder —
 * a gallery hangs frames waiting on a loan, and a museum about a sport whose
 * early photography is mostly unclearable can say so with the frame itself.
 *
 * Authored on the wall plane z = 0, centred on x = 0 and on its own height, and
 * projecting into the room along +Z. This is `buildFrame`'s convention for
 * everything except the projection axis: that one sweeps with `rotateY(+PI/2)`
 * and so hangs backwards, into the wall.
 *
 * `width` and `aspect` are the SIGHT size — the aperture you see through — so
 * they can be fed straight from a media manifest's pixel dimensions the way
 * `buildFrame` takes them, and the moulding is added outside.
 */
export function buildPictureFrameEmpty({ width = 0.9, aspect = 0.72 } = {}) {
  const sightH = width / aspect
  // The moulding grows with the picture, as real ones do: a 62 mm section on a
  // 0.9 m frame, held between 42 and 90 so the extremes stay sane.
  const memberWidth = Math.min(0.09, Math.max(0.042, width * 0.069))
  const frameDepth = memberWidth * 0.84
  /**
   * The rebate has to swallow an 8 mm mount, an 8 mm backing and a little air
   * whatever the moulding is doing, so it has a floor in millimetres rather
   * than being a pure fraction of the depth. On the smallest frame the fraction
   * alone left 14 mm of rebate for 20 mm of boards, and the mount pushed
   * through the front of its own frame.
   */
  const rebate = Math.max(0.020, frameDepth * 0.42)
  /** How far the frame's back lip reaches in over the mount. */
  const lip = memberWidth * 0.32

  /**
   * A weighted mount: the bottom margin is wider than the other three.
   *
   * Conservation framing has done this for a century because the optical centre
   * of a rectangle sits above its geometric centre, so an evenly bordered mount
   * looks bottom-light. It is also the only asymmetry available on an object
   * this simple, and without it the frame is four identical sticks around a
   * hole.
   *
   * The margin is driven by the SHORTER side. Driving it off `width` alone put
   * a 116 mm margin top and bottom on a 543 mm panorama, which closed the
   * window to a slot; the upper clamp is a second belt on the same trousers,
   * guaranteeing an aperture whatever aspect ratio arrives.
   */
  const shortSide = Math.min(width, sightH)
  const marginSide = Math.min(shortSide * 0.28, Math.max(0.05, shortSide * 0.083))
  const marginBottom = marginSide * 1.22
  const MOUNT_BASE = 0.001 + BOARD

  const section = frameSection(memberWidth, frameDepth, rebate, lip)
  const parts = []

  const sightHalfW = width / 2
  const sightHalfH = sightH / 2

  // Rails run the full outer width and the stiles fill between them, so every
  // corner is closed by the rail. sweepProfile cannot cut a mitre; an
  // overlapping butt that shows no gap beats a mitre that is not there.
  const bottomRail = frameRun(section, width + memberWidth * 2, 'bottom')
  bottomRail.translate(0, -sightHalfH, 0)
  parts.push(bottomRail)

  const topRail = frameRun(section, width + memberWidth * 2, 'top')
  topRail.translate(0, sightHalfH, 0)
  parts.push(topRail)

  for (const side of [-1, 1]) {
    const stile = frameRun(section, sightH, side > 0 ? 'right' : 'left')
    stile.translate(side * sightHalfW, 0, 0)
    parts.push(stile)
  }

  /**
   * How far the mount and backing reach out past the sight line to be caught by
   * the rebate. It is three quarters of the lip and not a round 15 mm: the lip
   * shrinks with the moulding, and a fixed reach walked the mount's outer edge
   * out from under a small frame's rebate and into open air behind it.
   */
  const reach = lip * 0.75

  const backing = bevelledBox(width + reach * 2, sightH + reach * 2, BOARD, 0.002, 1)
  backing.translate(0, 0, 0.001 + BOARD / 2)
  parts.push(backing)

  // The window, lifted by half the difference in the margins — this is what
  // actually moves when the mount is weighted.
  const windowHalfW = sightHalfW - marginSide
  const windowTop = sightHalfH - marginSide
  const windowBottom = -sightHalfH + marginBottom

  // The margin quoted is measured from the window, so each run has to be that
  // much longer to arrive at the sight line and then reach into the rebate.
  const mountBottom = frameRun(mountSection(marginBottom + reach), width + reach * 2, 'bottom')
  mountBottom.translate(0, windowBottom, MOUNT_BASE)
  parts.push(mountBottom)

  const mountTop = frameRun(mountSection(marginSide + reach), width + reach * 2, 'top')
  mountTop.translate(0, windowTop, MOUNT_BASE)
  parts.push(mountTop)

  for (const side of [-1, 1]) {
    const mountSide = frameRun(
      mountSection(marginSide + reach),
      windowTop - windowBottom,
      side > 0 ? 'right' : 'left',
    )
    mountSide.translate(side * windowHalfW, (windowTop + windowBottom) / 2, MOUNT_BASE)
    parts.push(mountSide)
  }

  return finalize(merge(parts), { crease: Math.PI / 4, metresPerTile: 0.3 })
}
