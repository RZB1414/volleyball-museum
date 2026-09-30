/**
 * Furniture assemblies that turn the atrium's broad architectural gestures
 * into usable gallery zones.
 *
 * Every recipe stands on min Y = 0 and faces +Z. Return keys are material
 * families rather than independent placeables; the shared bake emits the
 * primary key at the recipe id and the others as `recipe__key` siblings.
 * Thin bars are real opaque geometry. A literal alpha mesh would add sorting
 * artefacts and a shader variant to the busiest room for no useful silhouette.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three'

import {
  bevelledBox,
  finalize,
  lathe,
  merge,
} from '../lib/geometry.mjs'

function finishBoxes(parts, metresPerTile) {
  return finalize(merge(parts), { crease: null, metresPerTile })
}

function finishMixed(parts, metresPerTile) {
  return finalize(merge(parts), {
    crease: Math.PI / 5,
    metresPerTile,
  })
}

function placeInPlan(geometry, x, z, yaw = 0) {
  if (yaw !== 0) geometry.rotateY(yaw)
  geometry.translate(x, 0, z)
  return geometry
}

// ---------------------------------------------------------------------------
// 1. Freestanding open divider
// Recipe id: atrium-divider-screen
// ---------------------------------------------------------------------------

/**
 * A 1.55 m-wide screen with a solid navy datum and an open brass lattice.
 *
 * The structural uprights run invisibly through the low cabinet to the floor.
 * This gives the primary frame node a full-height collision bound without an
 * artificial collider wider than the visible object. The open upper field
 * keeps long views and pin lights legible while still making separate zones.
 */
export function buildAtriumDividerScreen({
  width = 1.55,
  height = 2.40,
  depth = 0.30,
} = {}) {
  const base = []
  const frame = []
  const mesh = []

  const baseHeight = 0.48
  const postWidth = 0.058
  const frameDepth = 0.060

  const toe = bevelledBox(width + 0.06, 0.040, depth + 0.04, 0.009, 1)
  toe.translate(0, 0.020, 0)
  base.push(toe)

  const cabinet = bevelledBox(width, baseHeight, depth, 0.012, 1)
  cabinet.translate(0, baseHeight / 2, 0)
  base.push(cabinet)

  // One proud field stops the opaque base reading as a featureless block. It
  // shares the same material so the screen still costs only three batches.
  const inset = new BoxGeometry(width - 0.16, 0.26, 0.018)
  inset.translate(0, 0.285, depth / 2 + 0.009)
  base.push(inset)

  for (const side of [-1, 1]) {
    const post = new BoxGeometry(postWidth, height, frameDepth)
    post.translate(side * (width / 2 - postWidth / 2), height / 2, 0)
    frame.push(post)
  }

  const lowerRail = new BoxGeometry(width - postWidth * 2, 0.060, frameDepth)
  lowerRail.translate(0, baseHeight + 0.030, 0)
  frame.push(lowerRail)

  const crown = new BoxGeometry(width, 0.070, frameDepth + 0.012)
  crown.translate(0, height - 0.035, 0)
  frame.push(crown)

  const openingBottom = baseHeight + 0.085
  const openingTop = height - 0.095
  const openingHeight = openingTop - openingBottom
  const openingWidth = width - postWidth * 2 - 0.050
  const latticeDepth = 0.018

  // Unequal counts avoid a square office-grid look and echo the tall rhythm
  // of the atrium's walnut wall slats.
  const verticalCount = 7
  for (let index = 1; index <= verticalCount; index += 1) {
    const x = -openingWidth / 2 + (index / (verticalCount + 1)) * openingWidth
    const bar = new BoxGeometry(0.016, openingHeight, latticeDepth)
    bar.translate(x, openingBottom + openingHeight / 2, 0.018)
    mesh.push(bar)
  }

  const horizontalCount = 9
  for (let index = 1; index <= horizontalCount; index += 1) {
    const y = openingBottom + (index / (horizontalCount + 1)) * openingHeight
    const bar = new BoxGeometry(openingWidth, 0.016, latticeDepth)
    bar.translate(0, y, 0.018)
    mesh.push(bar)
  }

  return {
    base: finishBoxes(base, 0.52),
    frame: finishBoxes(frame, 0.34),
    mesh: finishBoxes(mesh, 0.22),
  }
}

// ---------------------------------------------------------------------------
// 2. Repeating curved podium barrier
// Recipe id: atrium-barrier-segment
// ---------------------------------------------------------------------------

/**
 * One 45-degree rail segment centred on the +X side of a 1.70 m-radius ring.
 *
 * Eight placements at the same origin, each rotated by PI / 4, form a complete
 * enclosure. Each segment owns only its leading post, so the closed ring has
 * eight posts rather than duplicated pairs at every seam.
 */
export function buildAtriumBarrierSegment({ radius = 1.70 } = {}) {
  const brass = []
  const arc = Math.PI / 4
  const halfArc = arc / 2
  const railY = 0.72

  const rail = new TorusGeometry(radius, 0.025, 5, 8, arc)
  rail.rotateX(Math.PI / 2)
  // TorusGeometry begins at angle zero. This recentres its finite arc on +X,
  // which makes rotations of the whole recipe tile without angular offsets.
  rail.rotateY(halfArc)
  rail.translate(0, railY, 0)
  brass.push(rail)

  const postX = radius * Math.cos(-halfArc)
  const postZ = radius * Math.sin(-halfArc)

  const baseHeight = 0.035
  const base = new CylinderGeometry(0.095, 0.110, baseHeight, 10)
  base.translate(postX, baseHeight / 2, postZ)
  brass.push(base)

  const stemBottom = baseHeight
  const stemTop = railY + 0.055
  const stem = new CylinderGeometry(0.021, 0.024, stemTop - stemBottom, 8)
  stem.translate(postX, stemBottom + (stemTop - stemBottom) / 2, postZ)
  brass.push(stem)

  const collar = new CylinderGeometry(0.040, 0.040, 0.026, 8)
  collar.translate(postX, railY, postZ)
  brass.push(collar)

  const finial = new SphereGeometry(0.034, 6, 4)
  finial.translate(postX, stemTop + 0.025, postZ)
  brass.push(finial)

  return {
    brass: finishMixed(brass, 0.20),
  }
}

// ---------------------------------------------------------------------------
// 3. Complete conversational lounge group
// Recipe id: atrium-lounge-set
// ---------------------------------------------------------------------------

function addArmchair(targets, x, z, yaw) {
  const { timber, upholstery } = targets
  const seatHeight = 0.43
  const legHeight = 0.34
  const legX = 0.30
  const frontZ = 0.25
  const backZ = -0.27

  const addFrame = (geometry) => {
    timber.push(placeInPlan(geometry, x, z, yaw))
  }
  const addCushion = (geometry) => {
    upholstery.push(placeInPlan(geometry, x, z, yaw))
  }

  for (const localX of [-legX, legX]) {
    for (const localZ of [frontZ, backZ]) {
      const leg = new BoxGeometry(0.052, legHeight, 0.052)
      leg.translate(localX, legHeight / 2, localZ)
      addFrame(leg)
    }
  }

  const frontRail = new BoxGeometry(legX * 2 + 0.05, 0.085, 0.055)
  frontRail.translate(0, legHeight + 0.025, frontZ)
  addFrame(frontRail)

  for (const side of [-1, 1]) {
    const sideRail = new BoxGeometry(0.055, 0.080, frontZ - backZ, 1, 1, 1)
    sideRail.translate(side * legX, legHeight + 0.020, 0)
    addFrame(sideRail)

    const rearPost = new BoxGeometry(0.060, 0.64, 0.060)
    rearPost.translate(side * legX, 0.65, backZ)
    addFrame(rearPost)

    const frontPost = new BoxGeometry(0.055, 0.31, 0.055)
    frontPost.translate(side * legX, 0.565, frontZ)
    addFrame(frontPost)

    const arm = new BoxGeometry(0.070, 0.060, frontZ - backZ + 0.10)
    arm.translate(side * (legX + 0.010), 0.72, -0.005)
    addFrame(arm)
  }

  const seat = bevelledBox(0.62, 0.15, 0.56, 0.040, 1)
  seat.translate(0, seatHeight, 0.015)
  addCushion(seat)

  const back = bevelledBox(0.60, 0.48, 0.135, 0.038, 1)
  back.rotateX(-0.10)
  back.translate(0, 0.75, -0.30)
  addCushion(back)
}

function addFourTableLegs(target, spec) {
  const { x, z, width, depth, height, inset = 0.075 } = spec
  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      const leg = new BoxGeometry(0.026, height, 0.026)
      leg.translate(
        x + sideX * (width / 2 - inset),
        height / 2,
        z + sideZ * (depth / 2 - inset),
      )
      target.push(leg)
    }
  }
}

/**
 * Two open-arm chairs, nesting coffee tables and a side table on one navy rug.
 *
 * The chairs toe inward by a few degrees rather than forming a waiting-room
 * row. Timber frames and table tops share one node; cushions and rug share the
 * navy node; all shoes, table legs and small objects share the brass node.
 */
export function buildAtriumLoungeSet({
  width = 4.10,
  depth = 2.60,
} = {}) {
  const timber = []
  const upholstery = []
  const brass = []

  const rug = new BoxGeometry(width, 0.012, depth)
  rug.translate(0, 0.006, 0)
  upholstery.push(rug)

  addArmchair({ timber, upholstery }, -1.08, -0.38, 0.14)
  addArmchair({ timber, upholstery }, 0.92, -0.44, -0.12)

  const largeTable = { x: -0.34, z: 0.60, width: 1.08, depth: 0.58, height: 0.37 }
  const largeTop = bevelledBox(largeTable.width, 0.055, largeTable.depth, 0.012, 1)
  largeTop.translate(largeTable.x, largeTable.height + 0.0275, largeTable.z)
  timber.push(largeTop)
  addFourTableLegs(brass, largeTable)

  const smallTable = { x: 0.48, z: 0.78, width: 0.72, depth: 0.44, height: 0.30 }
  const smallTop = bevelledBox(smallTable.width, 0.045, smallTable.depth, 0.010, 1)
  smallTop.translate(smallTable.x, smallTable.height + 0.0225, smallTable.z)
  timber.push(smallTop)
  addFourTableLegs(brass, smallTable)

  const sideX = 1.66
  const sideZ = -0.18
  const sideTopY = 0.49
  const sideTop = new CylinderGeometry(0.31, 0.31, 0.035, 16)
  sideTop.translate(sideX, sideTopY, sideZ)
  timber.push(sideTop)

  const sideFoot = new CylinderGeometry(0.20, 0.22, 0.025, 12)
  sideFoot.translate(sideX, 0.0125, sideZ)
  brass.push(sideFoot)

  const sideStem = new CylinderGeometry(0.025, 0.029, sideTopY - 0.045, 10)
  sideStem.translate(sideX, (sideTopY - 0.020) / 2, sideZ)
  brass.push(sideStem)

  // A restrained vessel and two overlapping coasters make the group feel in
  // use without turning generic lobby furniture into a literal exhibit.
  const vessel = lathe(
    [
      [0, 0],
      [0.055, 0],
      [0.062, 0.025],
      [0.050, 0.090],
      [0.035, 0.145],
      [0.030, 0.175],
      [0, 0.175],
    ],
    10,
  )
  vessel.translate(sideX, sideTopY + 0.0175, sideZ)
  brass.push(vessel)

  for (const [offsetX, offsetZ] of [[-0.08, 0], [0.02, 0.035]]) {
    const coaster = new CylinderGeometry(0.075, 0.075, 0.008, 12)
    coaster.translate(
      smallTable.x + offsetX,
      smallTable.height + 0.049,
      smallTable.z + offsetZ,
    )
    brass.push(coaster)
  }

  return {
    timber: finishBoxes(timber, 0.48),
    upholstery: finishBoxes(upholstery, 0.62),
    brass: finishMixed(brass, 0.22),
  }
}

// ---------------------------------------------------------------------------
// 4. Long low display console
// Recipe id: atrium-display-console
// ---------------------------------------------------------------------------

/**
 * A 3.2 m museum console with enclosed storage and a shallow glazed hood.
 *
 * The case is intentionally low enough to preserve sightlines through the
 * atrium. Four evenly spaced risers make the ball timeline readable as one
 * sequence, while the full-height carcass frame supplies one honest collider
 * for the whole piece.
 */
export function buildAtriumDisplayConsole({
  width = 3.20,
  depth = 0.75,
  height = 1.05,
} = {}) {
  const carcass = []
  const glass = []
  const brass = []

  const footHeight = 0.075
  const cabinetTop = 0.625
  const deckTop = 0.680
  const frameDepth = 0.040

  const foot = bevelledBox(width + 0.04, footHeight, depth - 0.02, 0.010, 1)
  foot.translate(0, footHeight / 2, 0)
  carcass.push(foot)

  const cabinet = bevelledBox(
    width - 0.06,
    cabinetTop - footHeight,
    depth - 0.10,
    0.014,
    1,
  )
  cabinet.translate(0, footHeight + (cabinetTop - footHeight) / 2, -0.015)
  carcass.push(cabinet)

  const doorWidth = (width - 0.30) / 3
  for (let index = 0; index < 3; index += 1) {
    const x = (index - 1) * (doorWidth + 0.035)
    const door = new BoxGeometry(doorWidth, 0.43, 0.026)
    door.translate(x, 0.355, depth / 2 - 0.045)
    carcass.push(door)

    for (const side of [-1, 1]) {
      const pull = new BoxGeometry(0.018, 0.115, 0.024)
      pull.translate(x + side * 0.105, 0.375, depth / 2 - 0.018)
      brass.push(pull)
    }
  }

  const deck = bevelledBox(width, deckTop - cabinetTop, depth, 0.009, 1)
  deck.translate(0, cabinetTop + (deckTop - cabinetTop) / 2, 0)
  carcass.push(deck)

  const frameHeight = height - deckTop
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const post = new BoxGeometry(frameDepth, frameHeight, frameDepth)
      post.translate(
        x * (width / 2 - frameDepth / 2 - 0.025),
        deckTop + frameHeight / 2,
        z * (depth / 2 - frameDepth / 2 - 0.025),
      )
      carcass.push(post)
    }
  }

  // Keep the long crown only at the back. A front rail at this exact height
  // lines up with a standing visitor's eye and cuts every regulation-size ball
  // through its equator. Bonded frameless glass on the viewing face is both a
  // believable contemporary case detail and the only honest clear sightline.
  const backCrown = new BoxGeometry(width - 0.05, 0.050, frameDepth)
  backCrown.translate(0, height - 0.025, -(depth / 2 - 0.045))
  carcass.push(backCrown)

  for (const side of [-1, 1]) {
    const crownShort = new BoxGeometry(frameDepth, 0.050, depth - 0.13)
    crownShort.translate(side * (width / 2 - 0.045), height - 0.025, 0)
    carcass.push(crownShort)
  }

  const paneHeight = frameHeight - 0.085
  for (const side of [-1, 1]) {
    const facePane = new BoxGeometry(width - 0.15, paneHeight, 0.008)
    facePane.translate(
      0,
      deckTop + 0.035 + paneHeight / 2,
      side * (depth / 2 - 0.051),
    )
    glass.push(facePane)

    const sidePane = new BoxGeometry(0.008, paneHeight, depth - 0.15)
    sidePane.translate(
      side * (width / 2 - 0.051),
      deckTop + 0.035 + paneHeight / 2,
      0,
    )
    glass.push(sidePane)
  }

  const topPane = new BoxGeometry(width - 0.14, 0.008, depth - 0.14)
  topPane.translate(0, height - 0.052, 0)
  glass.push(topPane)

  const supportY = deckTop + 0.018
  for (const x of [-1.20, -0.40, 0.40, 1.20]) {
    const riser = new BoxGeometry(0.55, 0.036, 0.38)
    riser.translate(x, supportY, 0)
    brass.push(riser)
  }

  // The case furniture must remain content-agnostic. The former medals, ball
  // and cup were fused into this brass node, so they could neither be examined
  // nor replaced from museum.ts. Four empty risers now receive real exhibit
  // recipes from the room data and can change without rebaking the shared kit.

  // A single narrow rule ties the storage doors to the glazed volume without
  // spending a fourth emissive material on a case lit by room spots.
  const deckRule = new BoxGeometry(width - 0.10, 0.018, 0.024)
  deckRule.translate(0, deckTop - 0.008, depth / 2 + 0.005)
  brass.push(deckRule)

  return {
    carcass: finishBoxes(carcass, 0.58),
    glass: finishBoxes(glass, 0.42),
    brass: finishMixed(brass, 0.20),
  }
}
