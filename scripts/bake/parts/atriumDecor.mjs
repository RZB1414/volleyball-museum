/**
 * Signature fittings for the central atrium concept.
 *
 * The room is eighteen metres square and more than eight metres high, so the
 * ordinary gallery kit needs two scales of detail here: broad gestures that
 * survive from the doorway (the radial floor and suspended net sculpture),
 * and joinery that rewards walking closer (slatted timber, brass reveals and
 * the illuminated reception fascia). None of the parts contains text or an
 * image. Those remain content and may be mounted on the flat fields documented
 * below.
 *
 * Floor parts have min Y = 0 and face +Z. `atrium-wall-bay` follows the wall
 * fitting convention: its back is z = 0, bottom is y = 0 and +Z projects into
 * the room. `atrium-aerial-installation` is authored hanging: its cable tops
 * define max Y = 0, so its placement is the ceiling datum.
 *
 * Return keys are material families, not independent placeables. The bake must
 * emit each result as `recipe` plus `recipe__key`; every key shares the origin
 * and orientation of its recipe.
 */

import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  RingGeometry,
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
  sweepProfile,
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

/**
 * Cylindrically bends a subdivided panel in plan while preserving its normals.
 *
 * `frontZ` is the unbent public face and `radius` is measured behind it. X is
 * interpreted as arc length. This is the same construction used by the common
 * reception counter, restated here because the atrium counter separates its
 * fascia, timber ribs, brass and light into different material nodes.
 */
function bow(geometry, radius, frontZ) {
  const position = geometry.attributes.position
  const normal = geometry.attributes.normal
  const centreZ = frontZ - radius

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = position.getZ(index)
    const angle = x / radius
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)
    const rho = radius + z - frontZ

    position.setX(index, rho * sin)
    position.setZ(index, centreZ + rho * cos)

    if (normal) {
      const nx = normal.getX(index)
      const nz = normal.getZ(index)
      normal.setX(index, nx * cos + nz * sin)
      normal.setZ(index, -nx * sin + nz * cos)
    }
  }

  return geometry
}

function tube(points, radius, tubularSegments, radialSegments = 5) {
  return new TubeGeometry(
    new CatmullRomCurve3(points.map((point) => new Vector3(...point))),
    tubularSegments,
    radius,
    radialSegments,
    false,
  )
}

function verticalCable(x, z, bottomY, radius = 0.004) {
  const cable = new CylinderGeometry(radius, radius, -bottomY, 6)
  cable.translate(x, bottomY / 2, z)
  return cable
}

// ---------------------------------------------------------------------------
// 1. Radial maple, stone and brass floor inlay
// Recipe id: atrium-floor-inlay
// ---------------------------------------------------------------------------

/**
 * A 16.4 m timber disc crossed by twelve brass meridians and two stone rings.
 *
 * The existing room slab remains the structural floor. This assembly starts at
 * y = 0 and is only 13 mm high: enough to avoid coplanar flicker, far below the
 * player's 220 mm auto-step and visually indistinguishable from a flush inlay.
 * The outer timber edge stops 800 mm short of an 18 m room, leaving a quiet
 * perimeter around doors and wall furniture.
 */
export function buildAtriumFloorInlay({ radius = 8.2 } = {}) {
  const timber = []
  const dark = []
  const brass = []

  const timberHeight = 0.004
  const field = new CylinderGeometry(radius, radius, timberHeight, 96, 1, false)
  field.translate(0, timberHeight / 2, 0)
  timber.push(field)

  const ringSurface = (inner, outer, y) => {
    const ring = new RingGeometry(inner, outer, 96, 1)
    ring.rotateX(-Math.PI / 2)
    ring.translate(0, y, 0)
    return ring
  }

  // The broad graphite band fixes the centre in a room otherwise made of one
  // continuous timber value. The smaller ring belongs to the interactive
  // podium and makes its rope enclosure feel designed rather than parked.
  dark.push(ringSurface(radius * 0.62, radius * 0.69, timberHeight + 0.001))
  dark.push(ringSurface(1.05, 1.48, timberHeight + 0.0015))

  const spokeStart = 1.34
  const spokeEnd = radius - 0.08
  const spokeLength = spokeEnd - spokeStart
  for (let index = 0; index < 12; index += 1) {
    const spoke = new BoxGeometry(0.022, 0.005, spokeLength)
    spoke.translate(0, timberHeight + 0.0025, spokeStart + spokeLength / 2)
    spoke.rotateY((index / 12) * Math.PI * 2)
    brass.push(spoke)
  }

  // Three fine circular rules reproduce the nested lathed-brass detail in the
  // concept without merging enough torus segments to breach the per-node gate.
  for (const ringRadius of [1.02, 1.50, radius - 0.13]) {
    const rule = new TorusGeometry(ringRadius, 0.012, 5, 64)
    rule.rotateX(Math.PI / 2)
    rule.translate(0, timberHeight + 0.012, 0)
    brass.push(rule)
  }

  return {
    timber: finishMixed(timber, 1.15),
    dark: finishBoxes(dark, 0.75),
    brass: finishMixed(brass, 0.32),
  }
}

// ---------------------------------------------------------------------------
// 2. Bow-fronted reception counter
// Recipe id: atrium-reception-desk
// ---------------------------------------------------------------------------

/**
 * A broad concierge counter with a 360 mm bow, ribbed timber face and light.
 *
 * Everything stands on y = 0 and the visitor approaches from +Z. The counter
 * is deliberately 4.8 m wide: at the atrium scale the old 2.4 m counter read as
 * a kiosk. Its rear remains open enough for a seated staff silhouette, while
 * the public front is one continuous architectural curve.
 *
 * A wordmark may be placed on the front, centred at local
 * (0, 0.735, 0.612), following the bow over no more than 1.2 m of arc.
 */
export function buildAtriumReceptionDesk({
  width = 4.8,
  depth = 1.18,
  height = 1.08,
} = {}) {
  const carcass = []
  const slats = []
  const top = []
  const brass = []
  const light = []
  const props = []
  const storage = []

  const sagitta = 0.36
  const radius = (width * width) / (8 * sagitta) + sagitta / 2
  const frontZ = depth / 2
  const halfAngle = width / 2 / radius
  const kickHeight = 0.11
  const worktopThickness = 0.065
  // A tiny overlap survives independent mesh quantisation without reopening a
  // light leak between the counter supports and the worktop.
  const joinOverlap = 0.002
  const fasciaTop = height - worktopThickness + joinOverlap

  const kick = new BoxGeometry(width - 0.22, kickHeight, 0.72, 24, 1, 1)
  kick.translate(0, kickHeight / 2, frontZ - 0.08 - 0.36)
  bow(kick, radius, frontZ)
  carcass.push(kick)

  const fascia = new BoxGeometry(width, fasciaTop - kickHeight, 0.055, 32, 1, 1)
  fascia.translate(0, kickHeight + (fasciaTop - kickHeight) / 2, frontZ - 0.0275)
  bow(fascia, radius, frontZ)
  carcass.push(fascia)

  // Keep both staff knee bays open. The former full-width rear panel crossed
  // the chair seats and made the workstations physically impossible to use.

  // Straight cheek panels close the curved carcass exactly at its tangents.
  // Their 80 mm overlap hides any millimetric chord error from the bend. They
  // meet the worktop underside exactly; a recessed shadow line here read as a
  // floating top from the staff side.
  const endX = radius * Math.sin(halfAngle)
  const endZ = frontZ - radius + radius * Math.cos(halfAngle)
  for (const side of [-1, 1]) {
    const cheek = bevelledBox(0.06, fasciaTop, depth - 0.13, 0.009, 1)
    cheek.rotateY(side * halfAngle)
    cheek.translate(side * endX, fasciaTop / 2, endZ - (depth - 0.13) / 2 + 0.05)
    carcass.push(cheek)
  }

  // Ribs are individually tangent to the arc. Plain boxes are intentional:
  // the alternating highlights and 22 mm gaps provide the edge definition, so
  // bevel triangles would add cost without changing the silhouette.
  const ribCount = 34
  const ribHeight = 0.59
  const ribY = 0.42
  for (let index = 0; index < ribCount; index += 1) {
    const x = -width / 2 + 0.10 + (index / (ribCount - 1)) * (width - 0.20)
    const angle = x / radius
    const rho = radius + 0.009
    const rib = new BoxGeometry(0.048, ribHeight, 0.026)
    rib.rotateY(angle)
    rib.translate(
      rho * Math.sin(angle),
      ribY,
      frontZ - radius + rho * Math.cos(angle),
    )
    slats.push(rib)
  }

  const worktop = new BoxGeometry(width + 0.16, worktopThickness, depth + 0.08, 36, 1, 1)
  worktop.translate(
    0,
    height - worktopThickness / 2,
    frontZ - (depth + 0.08) / 2 + 0.04,
  )
  bow(worktop, radius, frontZ + 0.04)
  top.push(worktop)

  for (const spec of [
    { y: 0.655, h: 0.022, proud: 0.022 },
    { y: fasciaTop - 0.018, h: 0.028, proud: 0.017 },
  ]) {
    const trim = new BoxGeometry(width - 0.10, spec.h, 0.018, 30, 1, 1)
    trim.translate(0, spec.y, frontZ + spec.proud - 0.009)
    bow(trim, radius, frontZ + spec.proud)
    brass.push(trim)
  }

  const luminousReveal = new BoxGeometry(width - 0.18, 0.030, 0.020, 30, 1, 1)
  luminousReveal.translate(0, 0.695, frontZ + 0.024)
  bow(luminousReveal, radius, frontZ + 0.034)
  light.push(luminousReveal)

  // Two compact workstations make the counter read as an actual staffed
  // reception instead of a decorative kiosk. They remain behind the public
  // edge, with the screens deliberately low enough not to mask wayfinding.
  for (const x of [-0.72, 0.72]) {
    const monitor = bevelledBox(0.46, 0.275, 0.036, 0.012, 1)
    monitor.rotateX(-0.055)
    monitor.translate(x, height + 0.205, -0.28)
    props.push(monitor)

    const monitorStem = bevelledBox(0.055, 0.155, 0.045, 0.006, 1)
    monitorStem.translate(x, height + 0.075, -0.265)
    props.push(monitorStem)

    const monitorFoot = bevelledBox(0.26, 0.022, 0.20, 0.008, 1)
    monitorFoot.translate(x, height + 0.011, -0.245)
    props.push(monitorFoot)

    // The chairs are intentionally economical silhouettes. At gameplay
    // distance the lumbar opening, five-star base and upholstered back carry
    // the reading; tiny casters would only shimmer on mobile.
    const seat = bevelledBox(0.48, 0.095, 0.46, 0.025, 1)
    seat.translate(x, 0.49, -0.61)
    props.push(seat)

    const chairBack = bevelledBox(0.50, 0.48, 0.085, 0.025, 1)
    chairBack.rotateX(-0.09)
    chairBack.translate(x, 0.79, -0.82)
    props.push(chairBack)

    const chairStem = new CylinderGeometry(0.026, 0.032, 0.39, 8)
    chairStem.translate(x, 0.245, -0.61)
    props.push(chairStem)

    for (let spoke = 0; spoke < 5; spoke += 1) {
      const foot = new BoxGeometry(0.34, 0.025, 0.035)
      foot.translate(0.17, 0.055, 0)
      foot.rotateY((spoke / 5) * Math.PI * 2)
      foot.translate(x, 0, -0.61)
      props.push(foot)
    }
  }

  const lampBase = new CylinderGeometry(0.095, 0.105, 0.025, 14)
  lampBase.translate(-1.48, height + 0.0125, -0.20)
  props.push(lampBase)

  const lampStem = new CylinderGeometry(0.010, 0.010, 0.265, 8)
  lampStem.translate(-1.48, height + 0.150, -0.20)
  props.push(lampStem)

  const lampShade = new CylinderGeometry(0.075, 0.045, 0.072, 14, 1, true)
  lampShade.translate(-1.48, height + 0.292, -0.20)
  props.push(lampShade)

  for (let index = 0; index < 3; index += 1) {
    const leaflet = new BoxGeometry(0.24, 0.008, 0.15)
    leaflet.rotateY(-0.10 + index * 0.035)
    leaflet.translate(-0.18 + index * 0.018, height + 0.006 + index * 0.008, 0.05)
    props.push(leaflet)
  }

  // A genuinely usable low return is attached to the public-right end. Its
  // 820 mm top admits a seated visitor without cutting an artificial notch
  // through the expensive bowed fascia, and turns the counter into the L-shape
  // shown in the approved concept.
  const accessibleX = width / 2 + 0.34
  const accessibleHeight = 0.82
  const accessibleTopThickness = 0.055
  const accessibleTopUnderside = accessibleHeight - accessibleTopThickness / 2
  const accessibleTop = new BoxGeometry(0.86, accessibleTopThickness, 1.12)
  accessibleTop.translate(accessibleX, accessibleHeight, 0.19)
  top.push(accessibleTop)

  const accessibleCheekHeight = accessibleTopUnderside + joinOverlap
  const accessibleCheek = new BoxGeometry(0.075, accessibleCheekHeight, 1.02)
  accessibleCheek.translate(accessibleX + 0.39, accessibleCheekHeight / 2, 0.16)
  carcass.push(accessibleCheek)

  const accessibleApronHeight = 0.12
  const accessibleApron = new BoxGeometry(0.76, accessibleApronHeight, 0.055)
  accessibleApron.translate(
    accessibleX,
    accessibleTopUnderside - accessibleApronHeight / 2 + joinOverlap,
    0.69,
  )
  carcass.push(accessibleApron)

  const accessibleTrim = new BoxGeometry(0.82, 0.022, 0.020)
  accessibleTrim.translate(accessibleX, accessibleHeight - 0.055, 0.724)
  brass.push(accessibleTrim)

  const accessibleReveal = new BoxGeometry(0.72, 0.022, 0.018)
  accessibleReveal.translate(accessibleX, accessibleHeight - 0.115, 0.727)
  light.push(accessibleReveal)

  // Lockers make the strip behind the counter function as a real cloak and bag
  // store. Keep their case separate from the counter carcass: one combined AABB
  // would turn the staff aisle into an invisible wall even though the geometry
  // clearly leaves it open. Their fronts face +Z, towards staff, while the bank
  // itself remains against the south-wall service zone when the counter moves.
  const lockerWidth = 2.28
  const lockerHeight = 1.50
  const lockerDepth = 0.28
  const lockerCentreX = -1.05
  const lockerCentreZ = -2.22
  const lockerCase = bevelledBox(lockerWidth, lockerHeight, lockerDepth, 0.018, 1)
  lockerCase.translate(lockerCentreX, lockerHeight / 2, lockerCentreZ)
  storage.push(lockerCase)

  const cellWidth = 0.50
  const cellHeight = 0.39
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const x = lockerCentreX + (column - 1.5) * 0.54
      const y = 0.25 + row * 0.45
      // Twelve touching door fronts read from their reveals and brass pulls;
      // individual bevel loops disappear at this scale and cost over a
      // thousand triangles in the shared download.
      const door = new BoxGeometry(cellWidth, cellHeight, 0.028)
      door.translate(x, y + cellHeight / 2, lockerCentreZ + lockerDepth / 2 + 0.016)
      slats.push(door)

      const pull = new BoxGeometry(0.055, 0.018, 0.018)
      pull.translate(x + 0.16, y + cellHeight / 2, lockerCentreZ + lockerDepth / 2 + 0.041)
      brass.push(pull)
    }
  }

  for (const x of [-1.86, -1.32, -0.78, -0.24]) {
    const downlight = new CylinderGeometry(0.035, 0.045, 0.055, 10)
    downlight.rotateX(Math.PI / 2)
    downlight.translate(x, 1.43, lockerCentreZ + lockerDepth / 2 + 0.045)
    light.push(downlight)
  }

  // The brochure rack belongs to the reception assembly, so it cannot become
  // another orphaned prop. Angled pockets are abstract on purpose: actual
  // covers and language remain runtime data rather than baked pseudo-text.
  const rackX = -width / 2 - 0.43
  const rackBack = new BoxGeometry(0.72, 1.12, 0.075)
  rackBack.rotateX(-0.16)
  rackBack.translate(rackX, 0.78, 0.20)
  carcass.push(rackBack)

  for (const x of [-0.18, 0.18]) {
    for (let row = 0; row < 3; row += 1) {
      const pocket = new BoxGeometry(0.30, 0.22, 0.045)
      pocket.rotateX(-0.16)
      pocket.translate(rackX + x, 0.49 + row * 0.30, 0.28 + row * 0.048)
      top.push(pocket)

      const lip = new BoxGeometry(0.30, 0.025, 0.030)
      lip.translate(rackX + x, 0.39 + row * 0.30, 0.327 + row * 0.048)
      brass.push(lip)
    }
  }

  for (const x of [-0.25, 0.25]) {
    const foot = bevelledBox(0.055, 0.48, 0.055, 0.009, 1)
    foot.rotateX(0.10)
    foot.translate(rackX + x, 0.245, 0.06)
    carcass.push(foot)
  }

  return {
    carcass: finishBoxes(carcass, 0.82),
    // Slats and tops already share one material. Finalise them independently
    // to preserve their different texel densities, then merge the finished
    // attributes so the honest storage collider does not cost another draw.
    timber: merge([
      finishBoxes(slats, 0.34),
      finishBoxes(top, 0.95),
    ]),
    brass: finishBoxes(brass, 0.28),
    light: finishBoxes(light, 0.25),
    props: finishMixed(props, 0.26),
    storage: finishBoxes(storage, 0.82),
  }
}

// ---------------------------------------------------------------------------
// 3. Modular slatted wainscot and information bay
// Recipe id: atrium-wall-bay
// ---------------------------------------------------------------------------

/**
 * One wall bay of walnut slats, brass trims and an optional information plate.
 *
 * The back is exactly z = 0 and the complete bay projects 142 mm toward +Z.
 * Repeating this recipe makes the low continuous datum in the concept; passing
 * `plaqueWidth: 0` makes a plain slatted module for runs beside doors. With the
 * default plate, the usable runtime text field is 0.94 x 0.56 m, centred at
 * (0, 0.79, 0.134) on the +Z face.
 */
export function buildAtriumWallBay({
  width = 3.2,
  height = 1.48,
  plaqueWidth = 1.08,
} = {}) {
  const backing = []
  const slats = []
  const trim = []
  const plaque = []
  const graphics = []
  const light = []

  const backingDepth = 0.07
  const isPlainRun = plaqueWidth <= 0
  // Eighteen copies form the atrium's continuous wainscot. On that repeated
  // plain run, bevels land edge-to-edge and cannot affect the silhouette, so a
  // low-poly backing and wider slat rhythm preserve the image while saving
  // thousands of instantiated triangles. Feature bays retain the close-up
  // joinery used around interpretive plaques.
  const field = isPlainRun
    ? new BoxGeometry(width, height, backingDepth)
    : bevelledBox(width, height, backingDepth, 0.008, 1)
  field.translate(0, height / 2, backingDepth / 2)
  backing.push(field)

  const pitch = isPlainRun ? 0.16 : 0.105
  const slatWidth = isPlainRun ? 0.065 : 0.054
  const slatDepth = 0.045
  const slatCount = Math.floor((width - 0.10) / pitch)
  for (let index = 0; index <= slatCount; index += 1) {
    const x = -width / 2 + 0.05 + (index / slatCount) * (width - 0.10)
    if (plaqueWidth > 0 && Math.abs(x) < plaqueWidth / 2 + 0.055) continue

    const rib = new BoxGeometry(slatWidth, height - 0.17, slatDepth)
    rib.translate(x, (height - 0.17) / 2 + 0.085, backingDepth + slatDepth / 2)
    slats.push(rib)
  }

  const bottom = isPlainRun
    ? new BoxGeometry(width + 0.02, 0.095, 0.125)
    : bevelledBox(width + 0.02, 0.095, 0.125, 0.008, 1)
  bottom.translate(0, 0.0475, 0.0625)
  trim.push(bottom)

  const cap = isPlainRun
    ? new BoxGeometry(width + 0.04, 0.055, 0.15)
    : bevelledBox(width + 0.04, 0.055, 0.15, 0.008, 1)
  cap.translate(0, height - 0.0275, 0.075)
  trim.push(cap)

  if (plaqueWidth > 0) {
    const plaqueHeight = 0.70
    const centreY = 0.79
    const board = bevelledBox(plaqueWidth, plaqueHeight, 0.028, 0.006, 1)
    board.translate(0, centreY, 0.128)
    plaque.push(board)

    // Restrained abstract rules stand in for typography at bake time and stop
    // an unloaded content panel looking like an accidental black rectangle.
    const ruleWidths = [0.54, 0.78, 0.69, 0.75, 0.48]
    for (const [index, ruleWidth] of ruleWidths.entries()) {
      const rule = new BoxGeometry(ruleWidth, index === 0 ? 0.020 : 0.010, 0.006)
      rule.translate(-0.07, centreY + 0.22 - index * 0.095, 0.145)
      graphics.push(rule)
    }

    const sconce = bevelledBox(0.34, 0.055, 0.11, 0.008, 1)
    sconce.translate(0, centreY + plaqueHeight / 2 + 0.13, 0.105)
    trim.push(sconce)

    const emitter = bevelledBox(0.26, 0.018, 0.078, 0.005, 1)
    emitter.translate(0, centreY + plaqueHeight / 2 + 0.105, 0.131)
    light.push(emitter)
  }

  const result = {
    backing: finishBoxes(backing, 0.72),
    slats: finishBoxes(slats, 0.34),
    trim: finishBoxes(trim, 0.26),
  }
  if (plaque.length > 0) result.plaque = finishBoxes(plaque, 0.52)
  if (graphics.length > 0) result.graphics = finishBoxes(graphics, 0.20)
  if (light.length > 0) result.light = finishBoxes(light, 0.20)
  return result
}

// ---------------------------------------------------------------------------
// 4. Central interactive podium
// Recipe id: atrium-central-podium
// ---------------------------------------------------------------------------

/**
 * A dark timber pedestal with a raked four-button interpretation surface.
 *
 * The square foot has min Y = 0, +Z is the visitor side, and the four circular
 * controls are centred across the raked face. The broad face intentionally has
 * no baked text; a runtime panel may use the 0.72 x 0.34 m top field centred at
 * (0, 0.995, 0.015), tilted +0.194 rad about X.
 */
export function buildAtriumCentralPodium({
  width = 0.88,
  depth = 0.72,
  height = 1.08,
} = {}) {
  const body = []
  const top = []
  const brass = []
  const controls = []
  const light = []

  const footHeight = 0.075
  const shadowHeight = 0.035
  const deckBottom = 0.84

  const foot = bevelledBox(width + 0.16, footHeight, depth + 0.16, 0.012, 1)
  foot.translate(0, footHeight / 2, 0)
  body.push(foot)

  const shadow = bevelledBox(width + 0.02, shadowHeight, depth + 0.02, 0.006, 1)
  shadow.translate(0, footHeight + shadowHeight / 2, 0)
  body.push(shadow)

  const shaftHeight = deckBottom - footHeight - shadowHeight
  const shaft = bevelledBox(width - 0.08, shaftHeight, depth - 0.08, 0.014, 2)
  shaft.translate(0, footHeight + shadowHeight + shaftHeight / 2, 0)
  body.push(shaft)

  // sweepProfile authors depth in its X coordinate and width along Z. Turning
  // it -90 degrees around Y puts the public low edge toward +Z.
  const rearY = height
  const frontY = height - 0.14
  const wedge = sweepProfile(
    [
      [-depth / 2, deckBottom],
      [-depth / 2, rearY],
      [depth / 2, frontY],
      [depth / 2, deckBottom],
    ],
    width,
    { bevel: 0.004 },
  )
  wedge.rotateY(-Math.PI / 2)
  top.push(wedge)

  const baseBand = bevelledBox(width + 0.20, 0.025, depth + 0.20, 0.006, 1)
  baseBand.translate(0, footHeight + 0.0125, 0)
  brass.push(baseBand)

  for (const side of [-1, 1]) {
    const arris = bevelledBox(0.022, shaftHeight - 0.10, depth - 0.02, 0.004, 1)
    arris.translate(
      side * (width / 2 - 0.052),
      footHeight + shadowHeight + shaftHeight / 2,
      0,
    )
    brass.push(arris)
  }

  const tilt = Math.atan2(rearY - frontY, depth)
  const controlZ = 0.035
  const surfaceY = rearY + (frontY - rearY) * ((controlZ + depth / 2) / depth)
  for (const x of [-0.285, -0.095, 0.095, 0.285]) {
    const button = new CylinderGeometry(0.073, 0.073, 0.014, 20)
    button.rotateX(tilt)
    button.translate(x, surfaceY + 0.018, controlZ)
    controls.push(button)

    const bezel = new TorusGeometry(0.078, 0.007, 5, 20)
    bezel.rotateX(Math.PI / 2 + tilt)
    bezel.translate(x, surfaceY + 0.021, controlZ)
    brass.push(bezel)
  }

  // Four separate bars put a warm halo around the foot without introducing a
  // transparent plane or a point light into the baked prop.
  for (const side of [-1, 1]) {
    const long = new BoxGeometry(width + 0.04, 0.012, 0.020)
    long.translate(0, 0.010, side * (depth / 2 + 0.082))
    light.push(long)

    const short = new BoxGeometry(0.020, 0.012, depth + 0.04)
    short.translate(side * (width / 2 + 0.082), 0.010, 0)
    light.push(short)
  }

  return {
    body: finishBoxes(body, 0.62),
    top: finishMixed(top, 0.52),
    brass: finishMixed(brass, 0.24),
    controls: finishMixed(controls, 0.18),
    light: finishBoxes(light, 0.20),
  }
}

// ---------------------------------------------------------------------------
// 5. Tall illuminated display tower
// Recipe id: atrium-display-tower
// ---------------------------------------------------------------------------

/**
 * A 2.34 m blackened-timber and brass vitrine with three display levels.
 *
 * It stands on y = 0 and the keyed door faces +Z. Shelf support datums are
 * y = 1.08, 1.47 and 1.84 m at local x = z = 0. The clear internal footprint
 * is 0.62 x 0.62 m; the runtime may place one small object per level without
 * intersecting the frame or glazing.
 */
export function buildAtriumDisplayTower({
  width = 0.82,
  depth = 0.82,
  height = 2.34,
} = {}) {
  const carcass = []
  const glass = []
  const brass = []
  const shelves = []
  const light = []
  const artefacts = []

  const footHeight = 0.075
  const plinthTop = 0.88
  const crownHeight = 0.085
  const frameTop = height - crownHeight
  const postSize = 0.042

  const foot = bevelledBox(width, footHeight, depth, 0.009, 1)
  foot.translate(0, footHeight / 2, 0)
  carcass.push(foot)

  const shaft = bevelledBox(width - 0.08, plinthTop - footHeight, depth - 0.08, 0.012, 2)
  shaft.translate(0, footHeight + (plinthTop - footHeight) / 2, 0)
  carcass.push(shaft)

  const deck = bevelledBox(width - 0.015, 0.055, depth - 0.015, 0.008, 1)
  deck.translate(0, plinthTop - 0.0275, 0)
  carcass.push(deck)

  const glazedHeight = frameTop - plinthTop
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const post = bevelledBox(postSize, glazedHeight, postSize, 0.006, 1)
      post.translate(
        x * (width / 2 - postSize / 2 - 0.025),
        plinthTop + glazedHeight / 2,
        z * (depth / 2 - postSize / 2 - 0.025),
      )
      carcass.push(post)
    }
  }

  const crown = bevelledBox(width - 0.01, crownHeight, depth - 0.01, 0.010, 2)
  crown.translate(0, height - crownHeight / 2, 0)
  carcass.push(crown)

  const paneHeight = glazedHeight - 0.055
  for (const side of [-1, 1]) {
    const face = bevelledBox(width - 0.14, paneHeight, 0.008, 0.002, 1)
    face.translate(0, plinthTop + 0.025 + paneHeight / 2, side * (depth / 2 - 0.051))
    glass.push(face)

    const flank = bevelledBox(0.008, paneHeight, depth - 0.14, 0.002, 1)
    flank.translate(side * (width / 2 - 0.051), plinthTop + 0.025 + paneHeight / 2, 0)
    glass.push(flank)
  }

  for (const shelfY of [1.08, 1.47, 1.84]) {
    const shelf = bevelledBox(width - 0.16, 0.026, depth - 0.16, 0.004, 1)
    shelf.translate(0, shelfY - 0.013, 0)
    shelves.push(shelf)

    const luminousPad = new CylinderGeometry(0.075, 0.075, 0.010, 16)
    luminousPad.translate(0, shelfY + 0.006, 0)
    light.push(luminousPad)

    for (const side of [-1, 1]) {
      const shelfRail = bevelledBox(width - 0.12, 0.016, 0.016, 0.003, 1)
      shelfRail.translate(0, shelfY + 0.002, side * (depth / 2 - 0.068))
      brass.push(shelfRail)
    }
  }

  for (const y of [plinthTop + 0.025, frameTop - 0.025]) {
    for (const side of [-1, 1]) {
      const faceRail = bevelledBox(width - 0.11, 0.018, 0.018, 0.003, 1)
      faceRail.translate(0, y, side * (depth / 2 - 0.043))
      brass.push(faceRail)
    }
  }

  const lock = new CylinderGeometry(0.019, 0.019, 0.018, 12)
  lock.rotateX(Math.PI / 2)
  lock.translate(width / 2 - 0.10, 1.56, depth / 2 - 0.037)
  brass.push(lock)

  // Hero volleyball on the middle shelf. Three raised great-circle seams are
  // deliberately geometric: under a pin light they draw the panel pattern by
  // shadow and specular edge even when no bespoke ball texture is assigned.
  const ballRadius = 0.112
  const ballCentre = new Vector3(0, 1.47 + ballRadius, 0)
  const ball = new SphereGeometry(ballRadius, 18, 12)
  ball.translate(ballCentre.x, ballCentre.y, ballCentre.z)
  artefacts.push(ball)

  for (const rotation of [
    [0, 0, 0],
    [0, Math.PI / 2, 0],
    [Math.PI / 3, Math.PI / 5, 0],
  ]) {
    const seam = new TorusGeometry(ballRadius + 0.002, 0.0045, 4, 24)
    seam.rotateX(rotation[0])
    seam.rotateY(rotation[1])
    seam.rotateZ(rotation[2])
    seam.translate(ballCentre.x, ballCentre.y, ballCentre.z)
    artefacts.push(seam)
  }

  // A standing medal occupies the lower level. The two ribbon strips overlap
  // behind the disk, so it reads as one object from +Z instead of loose bars.
  const medal = new CylinderGeometry(0.070, 0.070, 0.014, 18)
  medal.rotateX(Math.PI / 2)
  medal.translate(-0.18, 1.19, 0.025)
  artefacts.push(medal)

  for (const side of [-1, 1]) {
    const ribbon = bevelledBox(0.050, 0.14, 0.008, 0.004, 1)
    ribbon.rotateZ(side * 0.17)
    ribbon.translate(-0.18 + side * 0.026, 1.29, 0.018)
    artefacts.push(ribbon)
  }

  const medalStand = new CylinderGeometry(0.085, 0.095, 0.018, 14)
  medalStand.translate(-0.18, 1.089, 0)
  artefacts.push(medalStand)

  // A small handled cup fills the upper shelf without competing with the ball.
  const cupX = 0.17
  const cupBaseY = 1.84
  const cup = lathe(
    [
      [0, 0],
      [0.055, 0],
      [0.060, 0.014],
      [0.027, 0.030],
      [0.023, 0.070],
      [0.058, 0.090],
      [0.082, 0.145],
      [0.078, 0.180],
      [0.058, 0.198],
      [0, 0.203],
    ],
    16,
  )
  cup.translate(cupX, cupBaseY, 0)
  artefacts.push(cup)

  for (const side of [-1, 1]) {
    const handle = new TorusGeometry(0.046, 0.008, 4, 16)
    handle.scale(0.72, 1, 1)
    handle.translate(cupX + side * 0.070, cupBaseY + 0.137, 0)
    artefacts.push(handle)
  }

  return {
    carcass: finishBoxes(carcass, 0.52),
    glass: finishBoxes(glass, 0.44),
    brass: finishMixed(brass, 0.20),
    shelves: finishBoxes(shelves, 0.42),
    light: finishMixed(light, 0.18),
    artefacts: finishMixed(artefacts, 0.16),
  }
}

// ---------------------------------------------------------------------------
// 6. Low modular gallery sofa
// Recipe id: atrium-sofa
// ---------------------------------------------------------------------------

/**
 * A three-seat charcoal sofa on a dark timber and brass underframe.
 *
 * The piece is 2.6 x 0.75 x 0.88 m, stands on y = 0 and faces +Z. Separate
 * cushions keep its long silhouette from reading as one upholstered box, while
 * the open 115 mm shadow below the seat makes it light enough for a gallery.
 */
export function buildAtriumSofa({
  width = 2.6,
  depth = 0.75,
  height = 0.88,
} = {}) {
  const frame = []
  const upholstery = []
  const brass = []

  const legHeight = 0.23
  const railHeight = 0.12
  const seatTop = 0.49
  const postInset = 0.13

  const lowerRail = bevelledBox(width - 0.12, railHeight, depth - 0.16, 0.012, 1)
  lowerRail.translate(0, legHeight + railHeight / 2, -0.025)
  frame.push(lowerRail)

  // Eight legs support each cushion division as real modular furniture would;
  // four legs under a 2.6 m upholstered run look implausibly under-engineered.
  for (const x of [
    -width / 2 + postInset,
    -width / 6,
    width / 6,
    width / 2 - postInset,
  ]) {
    for (const z of [-depth / 2 + 0.12, depth / 2 - 0.12]) {
      const leg = bevelledBox(0.055, legHeight + 0.035, 0.055, 0.008, 1)
      leg.translate(x, (legHeight + 0.035) / 2, z)
      frame.push(leg)

      const shoe = new CylinderGeometry(0.040, 0.044, 0.025, 10)
      shoe.translate(x, 0.0125, z)
      brass.push(shoe)
    }
  }

  const moduleGap = 0.028
  const moduleWidth = (width - 0.10 - moduleGap * 2) / 3
  const seatHeight = seatTop - legHeight - railHeight + 0.035
  for (let index = 0; index < 3; index += 1) {
    const x = (index - 1) * (moduleWidth + moduleGap)

    const seat = bevelledBox(moduleWidth, seatHeight, depth - 0.14, 0.045, 1)
    seat.translate(x, seatTop - seatHeight / 2, 0.035)
    upholstery.push(seat)

    const backHeight = height - seatTop
    const back = bevelledBox(moduleWidth, backHeight, 0.18, 0.042, 1)
    back.rotateX(-0.085)
    back.translate(x, seatTop + backHeight / 2 - 0.010, -depth / 2 + 0.11)
    upholstery.push(back)
  }

  // A narrow exposed back rail catches a line of light between the cushions
  // without enclosing the sofa in a visually heavy timber shell.
  const backRail = bevelledBox(width - 0.08, 0.075, 0.075, 0.010, 1)
  backRail.translate(0, seatTop + 0.105, -depth / 2 + 0.075)
  frame.push(backRail)

  for (const side of [-1, 1]) {
    const endCap = bevelledBox(0.030, 0.055, depth - 0.10, 0.006, 1)
    endCap.translate(side * (width / 2 - 0.035), seatTop - 0.055, 0.015)
    brass.push(endCap)
  }

  return {
    frame: finishBoxes(frame, 0.52),
    upholstery: finishBoxes(upholstery, 0.48),
    brass: finishMixed(brass, 0.18),
  }
}

// ---------------------------------------------------------------------------
// 7. Low information lectern
// Recipe id: atrium-lectern
// ---------------------------------------------------------------------------

/**
 * A compact dark-timber kiosk with a shallow raked reading surface.
 *
 * It stands on y = 0, faces +Z and fits a 0.72 x 0.34 m runtime information
 * panel centred near (0, 0.995, 0.015). The top descends toward the visitor,
 * while its brass toe and warm reveal repeat the reception desk's vocabulary.
 */
export function buildAtriumLectern({
  width = 0.90,
  depth = 0.65,
  height = 1.05,
} = {}) {
  const body = []
  const top = []
  const brass = []
  const light = []

  const footHeight = 0.070
  const shadowHeight = 0.030
  const deckBottom = 0.82

  const foot = bevelledBox(width, footHeight, depth, 0.010, 1)
  foot.translate(0, footHeight / 2, 0)
  body.push(foot)

  const shadow = bevelledBox(width - 0.10, shadowHeight, depth - 0.10, 0.006, 1)
  shadow.translate(0, footHeight + shadowHeight / 2, 0)
  body.push(shadow)

  const pedestalHeight = deckBottom - footHeight - shadowHeight
  const pedestal = bevelledBox(width - 0.16, pedestalHeight, depth - 0.14, 0.014, 2)
  pedestal.translate(0, footHeight + shadowHeight + pedestalHeight / 2, -0.015)
  body.push(pedestal)

  // A shallow inset gives the public face a credible access panel without a
  // texture or a boolean cut. It remains timber, but its proud arris picks up
  // the grazing light from the floor and desk.
  const frontPanel = bevelledBox(width - 0.30, 0.46, 0.025, 0.006, 1)
  frontPanel.translate(0, 0.47, depth / 2 - 0.078)
  body.push(frontPanel)

  const rearY = height
  const frontY = height - 0.13
  const wedge = sweepProfile(
    [
      [-depth / 2, deckBottom],
      [-depth / 2, rearY],
      [depth / 2, frontY],
      [depth / 2, deckBottom],
    ],
    width,
    { bevel: 0.004 },
  )
  wedge.rotateY(-Math.PI / 2)
  top.push(wedge)

  const toe = bevelledBox(width + 0.025, 0.024, depth + 0.025, 0.005, 1)
  toe.translate(0, footHeight + 0.012, 0)
  brass.push(toe)

  // The thin top-edge rule is rotated to the same rake as the reading plane.
  // It masks the sweep's public arris and makes the material transition exact.
  const tilt = Math.atan2(rearY - frontY, depth)
  const topRule = bevelledBox(width - 0.035, 0.018, 0.025, 0.004, 1)
  topRule.rotateX(tilt)
  topRule.translate(0, frontY + 0.014, depth / 2 - 0.012)
  brass.push(topRule)

  const reveal = new BoxGeometry(width - 0.22, 0.022, 0.018)
  reveal.translate(0, deckBottom - 0.035, depth / 2 - 0.058)
  light.push(reveal)

  return {
    body: finishBoxes(body, 0.58),
    top: finishMixed(top, 0.48),
    brass: finishBoxes(brass, 0.20),
    light: finishBoxes(light, 0.18),
  }
}

// ---------------------------------------------------------------------------
// 8. Central slatted ceiling coffer
// Recipe id: atrium-ceiling-coffer
// ---------------------------------------------------------------------------

/**
 * A broad dark acoustic coffer framed by a warm, stepped perimeter reveal.
 *
 * Authored hanging with the outer trim's maximum Y exactly at zero. The field,
 * ribs and cove sit progressively lower, so the whole piece can be laid over a
 * flat procedural ceiling without coplanar flicker. The long ribs run along Z;
 * the room therefore keeps +Z as its principal entrance-to-gallery axis.
 */
export function buildAtriumCeilingCoffer({
  width = 12.4,
  depth = 8.8,
} = {}) {
  const field = []
  const slats = []
  const trim = []
  const light = []

  const frameWidth = 0.22
  const frameHeight = 0.18
  const fieldHeight = 0.095

  const darkField = bevelledBox(
    width - frameWidth * 2,
    fieldHeight,
    depth - frameWidth * 2,
    0.016,
    1,
  )
  darkField.translate(0, -0.045 - fieldHeight / 2, 0)
  field.push(darkField)

  // The outer frame is the mounting datum. Its top faces are exactly coplanar
  // with y = 0 while every exposed underside remains below the room ceiling.
  for (const side of [-1, 1]) {
    const long = bevelledBox(frameWidth, frameHeight, depth, 0.012, 1)
    long.translate(side * (width / 2 - frameWidth / 2), -frameHeight / 2, 0)
    trim.push(long)

    const short = bevelledBox(width - frameWidth * 2, frameHeight, frameWidth, 0.012, 1)
    short.translate(0, -frameHeight / 2, side * (depth / 2 - frameWidth / 2))
    trim.push(short)
  }

  const pitch = 0.21
  const count = Math.floor((width - frameWidth * 2 - 0.20) / pitch)
  for (let index = 0; index <= count; index += 1) {
    const x =
      -width / 2 + frameWidth + 0.10 +
      (index / count) * (width - frameWidth * 2 - 0.20)
    const rib = new BoxGeometry(0.055, 0.050, depth - frameWidth * 2 - 0.08)
    rib.translate(x, -0.167, 0)
    slats.push(rib)
  }

  // Four inset lines make the warm cove visible without adding a luminous
  // ceiling-sized plane. The light material may glow while real illumination
  // remains a data-driven room light aimed at the same perimeter.
  // Sit just below the frame soffit. Above it the strip exists in geometry but
  // is occluded from every standing viewpoint, so the coffer loses the warm
  // perimeter line that defines it in the concept.
  const coveY = -0.196
  const coveInset = frameWidth + 0.055
  for (const side of [-1, 1]) {
    const long = new BoxGeometry(0.035, 0.018, depth - coveInset * 2)
    long.translate(side * (width / 2 - coveInset), coveY, 0)
    light.push(long)

    const short = new BoxGeometry(width - coveInset * 2, 0.018, 0.035)
    short.translate(0, coveY, side * (depth / 2 - coveInset))
    light.push(short)
  }

  return {
    field: finishBoxes(field, 1.2),
    slats: finishBoxes(slats, 0.46),
    trim: finishBoxes(trim, 0.58),
    light: finishBoxes(light, 0.32),
  }
}

// ---------------------------------------------------------------------------
// 9. Fine cylindrical pin pendant
// Recipe id: atrium-pin-pendant
// ---------------------------------------------------------------------------

/**
 * A near-invisible black stem terminating in one warm cylindrical pin light.
 *
 * The ceiling rose defines max Y = 0 and the light centre sits at
 * y = `-dropLength`. Several placements at unequal drops reproduce the loose
 * field of points around the aerial sculpture without multiplying real lights.
 */
export function buildAtriumPinPendant({ dropLength = 1.25 } = {}) {
  const fitting = []
  const head = []

  const roseHeight = 0.028
  const rose = new CylinderGeometry(0.045, 0.052, roseHeight, 16)
  rose.translate(0, -roseHeight / 2, 0)
  fitting.push(rose)

  const stemTop = -0.018
  const stemBottom = -dropLength + 0.075
  const stem = new CylinderGeometry(0.0055, 0.0055, stemTop - stemBottom, 8)
  stem.translate(0, (stemTop + stemBottom) / 2, 0)
  fitting.push(stem)

  const collar = new CylinderGeometry(0.018, 0.014, 0.052, 12)
  collar.translate(0, -dropLength + 0.052, 0)
  fitting.push(collar)

  const barrel = new CylinderGeometry(0.024, 0.019, 0.070, 14)
  barrel.translate(0, -dropLength - 0.009, 0)
  fitting.push(barrel)

  const lens = new CylinderGeometry(0.017, 0.019, 0.009, 14)
  lens.translate(0, -dropLength - 0.0485, 0)
  head.push(lens)

  return {
    fitting: finishMixed(fitting, 0.16),
    head: finishMixed(head, 0.10),
  }
}

// ---------------------------------------------------------------------------
// 10. Suspended abstract volleyball/net installation
// Recipe id: atrium-aerial-installation
// ---------------------------------------------------------------------------

/**
 * Intersecting brass flight paths carrying a loose, twisted volleyball net.
 *
 * The installation is authored from the ceiling down: cable maximum Y is
 * exactly 0 and the lowest net point is about -2.36 m. At the atrium's 8.4 m
 * ceiling it therefore remains more than six metres above the floor, outside
 * player collision while filling the otherwise empty upper volume. +Z is the
 * view from the entrance, where the crossed arcs read as one asymmetric knot.
 */
export function buildAtriumAerialInstallation({
  width = 7.6,
  depth = 4.4,
} = {}) {
  const cables = []
  const brassA = []
  const brassB = []
  const finials = []
  const net = []

  const halfW = width / 2
  const halfD = depth / 2

  const pathsA = [
    [
      [-halfW, -1.24, -0.68],
      [-2.2, -0.76, -0.20],
      [-0.35, -1.04, 0.24],
      [1.85, -0.58, 0.80],
      [halfW, -1.18, 1.30],
    ],
    [
      [-3.25, -0.92, 1.62],
      [-1.75, -1.48, 0.60],
      [0.15, -1.13, -0.12],
      [1.95, -0.77, -0.95],
      [3.15, -1.36, -1.65],
    ],
    [
      [-2.55, -1.38, -1.55],
      [-1.72, -0.53, -0.55],
      [-0.55, -0.62, 0.72],
      [1.10, -1.31, 1.55],
      [2.62, -0.98, 1.85],
    ],
  ]

  const pathsB = [
    [
      [-halfW + 0.35, -1.02, 0.82],
      [-1.95, -0.74, 1.48],
      [-0.35, -1.28, 1.92],
      [1.50, -1.44, 1.22],
      [halfW - 0.15, -0.82, 0.05],
    ],
    [
      [-2.90, -1.56, 1.05],
      [-1.20, -1.03, 0.22],
      [0.45, -0.66, -0.74],
      [2.10, -0.91, -1.48],
      [3.10, -1.58, -1.82],
    ],
    [
      [-1.45, -1.78, -halfD],
      [-0.86, -1.19, -0.84],
      [-0.18, -0.60, 0.22],
      [0.54, -0.78, 1.21],
      [1.52, -1.45, halfD],
    ],
  ]

  for (const path of pathsA) brassA.push(tube(path, 0.018, 48, 6))
  for (const path of pathsB) brassB.push(tube(path, 0.014, 48, 6))

  const endpoints = [
    [-halfW, -1.24, -0.68],
    [halfW, -1.18, 1.30],
    [-3.25, -0.92, 1.62],
    [3.15, -1.36, -1.65],
    [-1.45, -1.78, -halfD],
    [1.52, -1.45, halfD],
  ]
  for (const [x, y, z] of endpoints) {
    const bead = new SphereGeometry(0.075, 12, 8)
    bead.translate(x, y, z)
    finials.push(bead)
    cables.push(verticalCable(x, z, y - 0.02))
  }

  // Two quieter cables suspend the middle of the knot. They terminate behind
  // the brass paths, avoiding the implausible appearance of rods floating from
  // only their tips while keeping all eight top datums exactly on y = 0.
  cables.push(verticalCable(-0.55, 0.72, -0.62))
  cables.push(verticalCable(0.45, -0.74, -0.66))

  const netPoint = (u, v) => {
    const x = u * 2.58
    const y = -1.20 - v * 0.78 - (1 - u * u) * (0.13 + v * 0.08)
    const z = -0.18 + u * 0.52 + (v - 0.5) * u * 0.42
    return [x, y, z]
  }

  // Seven horizontal cords and thirteen vertical cords are enough to read as
  // a sports net at six metres' distance. A finer literal mesh aliases into a
  // noisy grey sheet and spends triangles where no silhouette changes.
  for (let row = 0; row <= 6; row += 1) {
    const v = row / 6
    const points = []
    for (let segment = 0; segment <= 8; segment += 1) {
      points.push(netPoint(-1 + (segment / 8) * 2, v))
    }
    net.push(tube(points, row === 0 || row === 6 ? 0.010 : 0.006, 24, 3))
  }

  for (let column = 0; column <= 12; column += 1) {
    const u = -1 + (column / 12) * 2
    const points = []
    for (let segment = 0; segment <= 5; segment += 1) {
      points.push(netPoint(u, segment / 5))
    }
    net.push(tube(points, 0.005, 10, 3))
  }

  return {
    cables: finishMixed(cables, 0.32),
    brassA: finishMixed(brassA, 0.44),
    brassB: finishMixed(brassB, 0.44),
    finials: finishMixed(finials, 0.20),
    net: finishMixed(net, 0.24),
  }
}
