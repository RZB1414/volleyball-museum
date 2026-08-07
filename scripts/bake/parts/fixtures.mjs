/**
 * Light fittings and building services.
 *
 * Every light source in this building is currently invisible. The runtime hangs
 * bare point lights 0.6 m under the ceiling with no geometry attached, so the
 * galleries are lit by nothing the visitor can see, and the ceiling — the one
 * surface a first-person camera spends its whole time under — is an unbroken
 * plane of plaster. That, plus the total absence of services, is most of why the
 * rooms read as a render rather than a building. Nobody consciously notices a
 * vent grille; everybody notices a room that has never had one.
 *
 * MOUNTING CONVENTIONS, which the whole file obeys:
 *
 *   - Hanging parts (`buildCeilingSpot`, `buildPendant`) are authored downward
 *     from a ceiling plane at y = 0, so a caller places them at the room's
 *     ceiling height with no per-part offset to remember.
 *   - Wall parts (`buildWallSconce`, `buildVentGrille`) are centred on x = 0,
 *     stand up from y = 0, and sit on a wall plane at z = 0 with everything
 *     projecting into the room along +Z. Nothing pokes through the plaster.
 *
 * Where a fitting returns two geometries they are ONE assembly authored about
 * ONE origin — place both at the same point. Only the geometry containing the
 * ceiling face carries max Y = 0; a pendant's shade is a metre lower and saying
 * otherwise would put the shade on the ceiling.
 */

import { CylinderGeometry } from 'three'

import { bevelledBox, finalize, lathe, merge, sweepProfile } from '../lib/geometry.mjs'

/**
 * Slides a finished assembly onto its mounting datum along one axis.
 *
 * The datum has to be MEASURED rather than asserted. `bevelledBox` clamps its
 * own corner radius, `sweepProfile` overruns its nominal length by the bevel at
 * both ends, and a lathe's extreme is wherever the profile happens to land it —
 * so an assembly hand-authored "to y = 0" arrives a millimetre or two off. On a
 * floor-standing prop a millimetre is nothing; on a ceiling fitting it is a lit
 * slot running all the way round the canopy, because the room's point lights sit
 * BELOW the fitting and shine straight up into the gap.
 */
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
// 1. Track spot
// ---------------------------------------------------------------------------

/**
 * The track extrusion, in section: 54 mm across, 46 mm deep, ceiling face at
 * y = 0.
 *
 * Two things in here are doing all the work. The 34 mm neck between y = 0 and
 * y = -0.008 is a shadow gap — the track stands off the plaster on a narrower
 * spine, so a dark line runs the whole 2.4 m instead of the extrusion dying into
 * the ceiling with no edge. And the channel recessed up into the underside is
 * where the conductors live; it is also, conveniently, deep enough to swallow a
 * head's stem, so the head reads as clipped into the track rather than glued
 * under it.
 */
const TRACK_SECTION = [
  [-0.017, 0],
  [0.017, 0],
  [0.017, -0.008],
  [0.027, -0.014],
  [0.027, -0.036],
  [0.021, -0.046],
  [0.011, -0.046],
  [0.011, -0.030],
  [-0.011, -0.030],
  [-0.011, -0.046],
  [-0.021, -0.046],
  [-0.027, -0.036],
  [-0.027, -0.014],
  [-0.017, -0.008],
]

/**
 * The spot barrel, as a turned silhouette from rear cap to aperture.
 *
 * The shoulder at 38 mm is the pivot line: it is where the yoke grips, so the
 * barrel swings about a point a third of the way along itself, which is what a
 * real gimbal does and what stops the thing looking bolted rigid. The groove at
 * 82 mm is 8 mm wide and 6 mm deep because anything shallower disappears into
 * the mip chain by the second LOD and is pure cost.
 */
const SPOT_BARREL = [
  [0.000, 0.000],
  [0.022, 0.004],
  [0.028, 0.014],
  [0.028, 0.030],
  [0.035, 0.038],
  [0.035, 0.074],
  [0.029, 0.082],
  [0.035, 0.090],
  [0.035, 0.112],
  [0.039, 0.120],
  [0.039, 0.132],
  [0.033, 0.132],
  [0.033, 0.118],
  [0.000, 0.110],
]

/** Where the barrel's shoulder sits along its own axis. */
const SPOT_SHOULDER = 0.038
/**
 * Gimbal centre, below the ceiling plane. Chosen so the barrel's midpoint lands
 * ~0.14 m under the track's 46 mm soffit, which is the drop the brief asks for
 * measured where the eye actually reads it — off the mass of the head, not off
 * the top of a stem it can barely see.
 */
const SPOT_PIVOT_Y = -0.16
/** Positive swings the aperture toward +Z. Not zero: a level spot lights nothing. */
const SPOT_TILT = 0.3

/**
 * A track head: an iron track and a brass barrel on a yoke and knuckle.
 *
 * Returned as two geometries because they are two materials, and as two parts
 * because they are two placements — a track carries three or four heads at
 * whatever spacing the room wants, and instancing one head many times against
 * one track is the entire point of track lighting.
 *
 * BOTH are authored with max Y at exactly 0, so both are placed at the ceiling
 * height directly. The head's canopy is deliberately 30 mm across the track and
 * 10 mm deep, which is narrower and shallower than the track's own shadow-gap
 * neck: co-locate the two and the canopy vanishes inside the track and the head
 * appears to sprout from its soffit, but place a head on bare plaster and it
 * still has a proper mounting plate. One part, both jobs.
 */
export function buildCeilingSpot({ trackLength = 2.4 } = {}) {
  // `bevel: 0` on the extrusion. ExtrudeGeometry's bevel is an END treatment —
  // it rounds the two cut faces, not the long arrises — and both ends here are
  // buried under a cap. It would also overrun the nominal length by 2 mm at
  // each end, and the track's length is the one dimension a caller lays out to.
  const extrusion = sweepProfile(TRACK_SECTION, trackLength, { bevel: 0 })
  // `-PI/2`, matching the shell's moulding convention: the run lands on X and
  // the section's own X axis becomes the across-track Z.
  extrusion.rotateY(-Math.PI / 2)

  // Live end and dead end, and they are not the same size. A track has a feed
  // box at one end where the supply comes in and a plain blank at the other,
  // and that asymmetry is free — it is two numbers — while a symmetrical track
  // reads as an extruded placeholder.
  const feed = bevelledBox(0.074, 0.052, 0.06, 0.005, 1)
  feed.translate(-trackLength / 2 + 0.037, -0.026, 0)

  const blank = bevelledBox(0.03, 0.048, 0.056, 0.004, 1)
  blank.translate(trackLength / 2 - 0.015, -0.024, 0)

  const track = seat(merge([extrusion, feed, blank]), 'y', 'max', 0)

  // ---- the head -----------------------------------------------------------
  const head = []

  const canopy = bevelledBox(0.048, 0.01, 0.03, 0.004, 1)
  canopy.translate(0, -0.005, 0)
  head.push(canopy)

  // Tapered, wider at the ceiling — a parallel rod reads as plumbing. 11 mm at
  // the top is exactly the track channel's half-width, so the stem fills the
  // slot it is nominally clipped into instead of rattling around in it.
  const stem = new CylinderGeometry(0.011, 0.009, 0.12, 12)
  stem.translate(0, -0.068, 0)
  head.push(stem)

  // The yoke: a crown strap across the stem, two arms down past the pivot.
  const crown = bevelledBox(0.104, 0.012, 0.032, 0.003, 1)
  crown.translate(0, -0.13, 0)
  head.push(crown)

  for (const side of [-1, 1]) {
    // Inner faces at +/-0.041, clearing the barrel's 39 mm snoot by 2 mm. Any
    // tighter and the tilt clips the arm; any wider and the yoke looks slack.
    const arm = bevelledBox(0.01, 0.062, 0.032, 0.003, 1)
    arm.translate(side * 0.046, SPOT_PIVOT_Y, 0)
    head.push(arm)
  }

  // The knuckle bolt, proud of both arms by 5 mm so it reads as a fixing you
  // could actually slacken.
  const pin = new CylinderGeometry(0.009, 0.009, 0.112, 12)
  pin.rotateZ(Math.PI / 2)
  pin.translate(0, SPOT_PIVOT_Y, 0)
  head.push(pin)

  const barrel = lathe(SPOT_BARREL, 18)
  // `rotateX(PI)` and not a negative Y scale: a rotation is a proper transform
  // and leaves the lathe's outward normals outward, where a mirror would turn
  // the barrel inside out and only show it under a raking light.
  barrel.rotateX(Math.PI)
  // Bring the shoulder onto the origin so the tilt pivots about the yoke.
  barrel.translate(0, SPOT_SHOULDER, 0)
  barrel.rotateX(-SPOT_TILT)
  barrel.translate(0, SPOT_PIVOT_Y, 0)
  head.push(barrel)

  return {
    track: finalize(track, { crease: Math.PI / 4, metresPerTile: 0.4 }),
    head: finalize(seat(merge(head), 'y', 'max', 0), {
      crease: Math.PI / 5,
      metresPerTile: 0.25,
    }),
  }
}

// ---------------------------------------------------------------------------
// 2. Pendant
// ---------------------------------------------------------------------------

/**
 * The ceiling rose, authored upward and then turned over.
 *
 * Every lathe in this file is authored with increasing Y and rotated into place
 * afterwards. LatheGeometry derives its winding from the order of the profile
 * points, so a profile written top-down comes out with its normals facing into
 * the solid — invisible in a wireframe, invisible in the manifest, and visible
 * in the browser as a fitting you can see the inside of.
 */
const ROSE_PROFILE = [
  [0.0, 0.0],
  [0.064, 0.0],
  [0.064, 0.008],
  [0.056, 0.016],
  [0.052, 0.026],
  [0.03, 0.032],
  [0.024, 0.04],
  [0.0, 0.044],
]

/**
 * The shade, as a shell rather than a surface.
 *
 * The profile runs out along the underside to the rim and back along the inside,
 * closing on itself, so the shade has a real 8 mm edge and two distinct faces.
 * A single-sided cone is half the triangles and looks like paper from below,
 * which is the one angle anybody sees it from. The rim rolls out and back — the
 * bead is what catches the room's fill light and draws the shade's outline.
 */
const SHADE_PROFILE = [
  [0.02, 0.0],
  [0.078, 0.008],
  [0.14, 0.038],
  [0.172, 0.07],
  [0.177, 0.084],
  [0.17, 0.092],
  [0.162, 0.076],
  [0.13, 0.04],
  [0.07, 0.016],
  [0.02, 0.009],
  [0.02, 0.0],
]

/**
 * A pendant on a stem: ceiling rose, drop, shallow enamelled shade, lampholder.
 *
 * `fitting` (brass) carries the ceiling face and is the part authored to
 * max Y = 0. `shade` (plaster, reading as vitreous enamel) hangs `dropLength`
 * below it and shares the same origin — place both at the ceiling height and
 * they assemble. They are split because they are two materials, and because the
 * shade is the only large pale surface in the fitting: brass on brass at this
 * size loses the whole thing against a dim ceiling.
 */
export function buildPendant({ dropLength = 0.9 } = {}) {
  const fitting = []

  const rose = lathe(ROSE_PROFILE, 24)
  rose.rotateX(Math.PI)
  fitting.push(rose)

  // The stem runs from inside the rose to inside the gallery cup, so neither
  // joint can open up a gap when the drop length changes.
  const stemLength = dropLength - 0.056
  const stem = new CylinderGeometry(0.011, 0.011, stemLength, 12)
  stem.translate(0, -0.036 - stemLength / 2, 0)
  fitting.push(stem)

  // A swivel bead a sixth of the way down, not halfway. Halfway is where an
  // agent puts it and nowhere a fitter would: the swivel goes near the rose so
  // the drop can hang plumb off an out-of-level ceiling.
  const bead = lathe(
    [[0.011, 0.0], [0.019, 0.004], [0.021, 0.016], [0.019, 0.026], [0.011, 0.03]],
    14,
  )
  bead.translate(0, -0.155, 0)
  fitting.push(bead)

  // The gallery: the turned cup that clamps the shade's centre hole.
  const cup = lathe(
    [[0.0, 0.0], [0.034, 0.004], [0.034, 0.016], [0.026, 0.03], [0.014, 0.038], [0.0, 0.042]],
    20,
  )
  cup.translate(0, -dropLength - 0.008, 0)
  fitting.push(cup)

  // The lampholder, hanging inside the shade. It is 14 mm clear of the rim, so
  // it is genuinely visible from anywhere on the floor — a shallow shade hides
  // nothing, which is exactly why a real one always has something to look at
  // underneath it.
  const holder = lathe(
    [
      [0.0, 0.0],
      [0.021, 0.003],
      [0.023, 0.012],
      [0.023, 0.046],
      [0.019, 0.052],
      [0.019, 0.062],
      [0.0, 0.066],
    ],
    16,
  )
  holder.rotateX(Math.PI)
  holder.translate(0, -dropLength - 0.012, 0)
  fitting.push(holder)

  const shade = lathe(SHADE_PROFILE, 32)
  shade.rotateX(Math.PI)

  return {
    fitting: finalize(seat(merge(fitting), 'y', 'max', 0), {
      crease: Math.PI / 5,
      metresPerTile: 0.3,
    }),
    // Seated to the drop rather than to zero: this is the one part in the file
    // whose top is not a ceiling. Its origin is still the ceiling plane.
    shade: finalize(seat(shade, 'y', 'max', -dropLength), {
      crease: Math.PI / 5,
      metresPerTile: 0.4,
    }),
  }
}

// ---------------------------------------------------------------------------
// 3. Wall sconce
// ---------------------------------------------------------------------------

/**
 * The uplighter bowl, out along the underside and back along the inside.
 *
 * Open at the top on purpose. An uplighter that reads as a closed dish reads as
 * a bowl of soup; the visitor has to be able to see down into it and find
 * nothing there but the wash on the wall above.
 */
const BOWL_PROFILE = [
  [0.0, 0.0],
  [0.04, 0.004],
  [0.084, 0.026],
  [0.112, 0.062],
  [0.12, 0.092],
  [0.122, 0.104],
  [0.116, 0.108],
  [0.111, 0.098],
  [0.101, 0.066],
  [0.072, 0.03],
  [0.034, 0.012],
  [0.0, 0.008],
]

/**
 * A wall bracket with an uplighter bowl.
 *
 * Every wall in this building is currently a pure top-to-bottom falloff ramp,
 * because the only sources are point lights on the ceiling centreline and
 * nothing lights a wall from the side. A pair of these on a long gallery wall
 * puts two bright pools up near the cornice with real horizontal structure
 * between them, which is the difference between a wall and a gradient.
 *
 * Authored on the wall plane z = 0, centred on x = 0, standing up from y = 0
 * so the caller places it by a single mounting height. See the report for the
 * height this is proportioned for.
 */
export function buildWallSconce() {
  const parts = []

  // Backplate, and a second plate standing 8 mm proud of it. The extra plate
  // costs 108 triangles and gives the fitting a stepped silhouette against the
  // plaster even when it is switched off and lit only by the room.
  const plate = bevelledBox(0.096, 0.22, 0.018, 0.006, 2)
  plate.translate(0, 0.14, 0.009)
  parts.push(plate)

  const boss = bevelledBox(0.068, 0.184, 0.01, 0.004, 1)
  boss.translate(0, 0.142, 0.021)
  parts.push(boss)

  /**
   * A turned drop under the plate and a matching cap over it.
   *
   * Both are held to a 9 mm maximum radius on the plate's own centreline, so
   * their widest point lands exactly on the plate's back face at z = 0. A
   * millimetre more and the whole fitting gets shunted forward when it is
   * seated onto the wall plane, opening a lit slot behind the backplate — the
   * one place a wall fitting must not have a gap.
   */
  const drop = lathe(
    [[0.0, 0.0], [0.007, 0.004], [0.009, 0.012], [0.006, 0.022], [0.0, 0.03]],
    14,
  )
  drop.rotateX(Math.PI)
  drop.translate(0, 0.032, 0.009)
  parts.push(drop)

  const cap = lathe(
    [[0.0, 0.0], [0.008, 0.004], [0.009, 0.012], [0.006, 0.02], [0.0, 0.024]],
    14,
  )
  cap.translate(0, 0.25, 0.009)
  parts.push(cap)

  // The rosette the arm springs from. Facing +Z: rotateX(PI/2) takes the
  // lathe's own +Y axis onto +Z.
  const rosette = lathe(
    [[0.0, 0.0], [0.026, 0.002], [0.028, 0.008], [0.02, 0.014], [0.0, 0.018]],
    16,
  )
  rosette.rotateX(Math.PI / 2)
  rosette.translate(0, 0.155, 0.024)
  parts.push(rosette)

  /**
   * The arm, from the rosette up and out to the bowl.
   *
   * A CylinderGeometry runs along +Y, so the swing is `atan2(reach, rise)` and
   * not the angle above horizontal that the geometry reads as. Getting that
   * wrong puts the arm at the complement of the intended angle, which still
   * looks plausible in isolation and only shows up later as a bowl too close to
   * the wall to wash it.
   *
   * It starts at z = 0.028 rather than at the backplate's face, and overruns by
   * 30 mm rather than 32. Both numbers are the fix for the same defect: an arm
   * that overruns into the wall puts its end cap's own RADIUS behind z = 0 as
   * well, and seating the finished fitting onto the wall plane then shunts the
   * whole sconce 6 mm into the room — backplate, gap and all. The buried end has
   * to stop inside the proud boss, not inside the plaster.
   */
  const foot = { y: 0.152, z: 0.028 }
  const neck = { y: 0.255, z: 0.148 }
  const rise = neck.y - foot.y
  const reach = neck.z - foot.z
  const arm = new CylinderGeometry(0.012, 0.018, Math.hypot(rise, reach) + 0.03, 12)
  arm.rotateX(Math.atan2(reach, rise))
  arm.translate(0, (foot.y + neck.y) / 2, (foot.z + neck.z) / 2)
  parts.push(arm)

  // The collar where the arm enters the bowl, so the two do not simply
  // interpenetrate at a hard line.
  const collar = lathe(
    [[0.0, 0.0], [0.03, 0.004], [0.032, 0.012], [0.024, 0.02], [0.014, 0.026], [0.0, 0.028]],
    18,
  )
  collar.translate(0, 0.234, 0.15)
  parts.push(collar)

  const bowl = lathe(BOWL_PROFILE, 24)
  bowl.translate(0, 0.255, 0.15)
  parts.push(bowl)

  const assembly = seat(merge(parts), 'y', 'min', 0)
  seat(assembly, 'z', 'min', 0)

  return finalize(assembly, { crease: Math.PI / 5, metresPerTile: 0.3 })
}

// ---------------------------------------------------------------------------
// 4. Vent grille
// ---------------------------------------------------------------------------

/** Frame border, measured inward from the outer edge. */
const GRILLE_BORDER = 0.026

/**
 * Frame section: X is depth out of the wall, Y is the border width. The step
 * from 30 mm proud down to 18 mm at the inner edge is what makes the louvres
 * look recessed into something rather than stuck onto it.
 */
const GRILLE_FRAME = [
  [0.0, 0.0],
  [0.03, 0.0],
  [0.03, 0.014],
  [0.02, 0.022],
  [0.018, 0.026],
  [0.0, 0.026],
]

/**
 * One louvre blade, in section, centred on its own pitch line.
 *
 * The front edge turns down into a 6 mm drip lip. That lip is the only part of
 * the blade the visitor sees square-on, and without it the whole grille is a
 * stack of parallelograms whose ends catch light identically — the tell that
 * something was generated rather than pressed.
 */
const GRILLE_BLADE = [
  [0.008, 0.0135],
  [0.027, -0.0045],
  [0.029, -0.0135],
  [0.024, -0.0135],
  [0.024, -0.0085],
  [0.008, 0.0075],
]

/**
 * A louvred wall grille. Buildings have services; the absence of them is one of
 * the reasons a room reads as a render.
 *
 * `width` and `height` are the OUTER dimensions, because that is what someone
 * laying one out on a wall elevation measures. Slats are swept as a profile
 * rather than stacked as boxes: a six-point section costs 20 triangles however
 * long the run, where the same blade as a bevelled box is 108, and eight of
 * them would be most of the prop budget for a thing nobody looks at twice.
 *
 * Authored on the wall plane z = 0, centred on x = 0, standing from y = 0.
 */
export function buildVentGrille({ width = 0.5, height = 0.3 } = {}) {
  const parts = []

  // Rails run the full width and the stiles butt into them. The kit has no
  // mitre and faking one with a diagonal cut would need CSG; a butt joint under
  // a moulded edge is what a pressed steel grille actually has anyway.
  const rail = () => sweepProfile(GRILLE_FRAME, width, { bevel: 0 })

  const bottom = rail()
  bottom.rotateY(-Math.PI / 2)
  parts.push(bottom)

  const top = rail()
  top.rotateY(-Math.PI / 2)
  top.rotateZ(Math.PI)
  top.translate(0, height, 0)
  parts.push(top)

  const fieldHeight = height - GRILLE_BORDER * 2
  const fieldWidth = width - GRILLE_BORDER * 2

  for (const side of [-1, 1]) {
    const stile = sweepProfile(GRILLE_FRAME, fieldHeight, { bevel: 0 })
    stile.rotateY(-Math.PI / 2)
    // +PI/2 sends the border width into -X and so belongs to the right-hand
    // stile; -PI/2 is its mirror. Swap them and both stiles grow outward, off
    // the ends of the rails.
    stile.rotateZ(side > 0 ? Math.PI / 2 : -Math.PI / 2)
    stile.translate(side * (width / 2), height / 2, 0)
    parts.push(stile)
  }

  // The backing pan. There is no CSG here, so the louvres cannot open onto a
  // real hole; a dark iron plate 6 mm off the wall gives them something to cast
  // onto and reads as the duct behind, which is all the eye is asking for.
  const pan = bevelledBox(fieldWidth, fieldHeight, 0.006, 0.002, 1)
  pan.translate(0, height / 2, 0.007)
  parts.push(pan)

  const blades = Math.max(3, Math.round(fieldHeight / 0.03))
  const pitch = fieldHeight / blades
  for (let index = 0; index < blades; index += 1) {
    const blade = sweepProfile(GRILLE_BLADE, fieldWidth, { bevel: 0 })
    blade.rotateY(-Math.PI / 2)
    blade.translate(0, GRILLE_BORDER + pitch * (index + 0.5), 0)
    parts.push(blade)
  }

  // Pan-head screws at the corners, 16 mm across and standing 1.5 mm off the
  // frame face. Below about 8 mm a fixing is not detail, it is noise with a
  // triangle cost — but at 16 mm four of them are what tell the visitor the
  // grille is a separate object screwed to the wall.
  for (const sx of [-1, 1]) {
    for (const sy of [0, 1]) {
      const screw = lathe(
        [[0.0, 0.0], [0.008, 0.0], [0.0085, 0.0012], [0.006, 0.0026], [0.0, 0.003]],
        8,
      )
      screw.rotateX(Math.PI / 2)
      screw.translate(sx * (width / 2 - 0.014), sy ? height - 0.013 : 0.013, 0.0285)
      parts.push(screw)
    }
  }

  const assembly = seat(merge(parts), 'y', 'min', 0)
  seat(assembly, 'z', 'min', 0)

  return finalize(assembly, { crease: Math.PI / 4, metresPerTile: 0.3 })
}
