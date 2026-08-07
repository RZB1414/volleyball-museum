/**
 * Interpretation: how the museum talks to its visitors.
 *
 * Everything in here is a SUBSTRATE. Not one of these parts carries a texture
 * that says anything — the words are drawn at runtime with troika, on top of
 * the surfaces authored below. So the job of the geometry is to be a credible
 * piece of museum fitting-out AND to put a flat, unambiguous, correctly-sized
 * plane where the text can land. Each generator's comment records that plane in
 * the part's own local frame, because the runtime has no other way to find it.
 *
 * Three of the five parts curve or hang, and neither of those is a thing the
 * base helpers do. `bow()` below is the whole trick: a cylindrical bend applied
 * to finished geometry, normals included, so a bevelled box can be curved in
 * plan without losing the bevel normals that `crease: null` exists to protect.
 */

import { BoxGeometry, CylinderGeometry } from 'three'

import { bevelledBox, finalize, lathe, merge, sweepProfile } from '../lib/geometry.mjs'

/**
 * Bends geometry around a vertical axis, so a flat panel becomes a bow in plan.
 *
 * The map sends the plane z = `frontZ` onto a cylinder of radius `radius` whose
 * axis is that far behind it, and parameterises by ARC LENGTH — a vertex at
 * x = 1.2 lands 1.2 m along the curve, not 1.2 m across the chord. That is what
 * makes a 2.4 m authored panel come out as a 2.4 m run of counter rather than
 * something mysteriously short.
 *
 * Normals are rotated by the same per-vertex angle instead of being recomputed.
 * `computeVertexNormals` would have been one line, but it averages across every
 * face group it can reach and would flatten the rounded arris of every
 * `bevelledBox` fed through here — which is precisely the geometry the bend
 * exists to preserve, and precisely what `crease: null` cannot repair later.
 * The bend is a rotation plus a radial stretch of at most 6% over the depth of
 * a counter, so treating it as a pure rotation for normal purposes is wrong by
 * about a degree, on the two end faces, both of which are buried.
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
    // Behind the front plane means CLOSER to the axis, so a back panel comes
    // out narrower than the fascia. Getting this sign backwards splays the
    // carcass outward behind the counter and it is not obvious in plan view.
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

// ---------------------------------------------------------------------------
// 1. The reading rail
// ---------------------------------------------------------------------------

/**
 * A reading rail: the low angled desk that stands in front of a case and takes
 * the object label.
 *
 * The kit already has `label-plaque`, which is a flat plate on a tall stem —
 * the kind that stands beside a plinth. This is the other kind, and museums use
 * both for different reasons: a plaque reads from standing height at two metres
 * away, a rail reads from a metre away by someone leaning in, which is why its
 * surface rakes back rather than facing you.
 *
 * The wedge is a swept profile rather than a rotated slab. A slab has to be
 * closed off at the front by a second box and the join is always visible; a
 * sweep gives the whole section in one go for 80 triangles, including the 24 mm
 * nose lip that stops a leaflet sliding onto the floor.
 *
 * TEXT: on the raked face. Centred at (0, 0.813, 0.002) in local metres, the
 * plane tilted by rotateX(-0.951) — 35.5 degrees off horizontal. Usable field
 * 0.36 x 0.25 m.
 */
export function buildLabelAngled({ width = 0.42, height = 0.3 } = {}) {
  const parts = []

  /** Rake off horizontal. Shallower than a lectern; this is read from above. */
  const RAKE = 0.62
  /** Top of the reading face. Standing eye looks down onto it comfortably. */
  const READING_TOP = 0.9
  const NOSE = 0.024

  const run = height * Math.cos(RAKE)
  const rise = height * Math.sin(RAKE)
  const backLip = 0.018
  const depth = run + backLip

  // Profile in XY: X is depth out from the back, Y is height. Read bottom-back,
  // round the nose, up the reading face, and back down the rear lip.
  const wedge = sweepProfile(
    [
      [0, 0],
      [depth + 0.010, 0],
      [depth + 0.014, 0.010],
      [depth, NOSE],
      [backLip, NOSE + rise],
      [0.004, NOSE + rise],
      [0, NOSE + rise - 0.014],
    ],
    width,
  )
  // Run onto X, depth onto +Z: the same convention every moulding in the kit
  // uses, so the part faces the room when it is dropped in unrotated.
  wedge.rotateY(-Math.PI / 2)
  wedge.translate(0, READING_TOP - (NOSE + rise), -(depth + 0.014) / 2)
  parts.push(wedge)

  const footHeight = 0.016
  const legTop = READING_TOP - (NOSE + rise)

  for (const side of [-1, 1]) {
    // Blade legs, set BACK of the footprint centre. The wedge cantilevers
    // forward, so a real rail puts its legs under the heavy end; centring them
    // is the arrangement that would tip over, and it looks it.
    const leg = bevelledBox(0.028, legTop - footHeight + 0.012, 0.16, 0.007, 1)
    leg.translate(side * (width / 2 - 0.045), footHeight + (legTop - footHeight + 0.012) / 2, -0.02)
    parts.push(leg)

    const foot = bevelledBox(0.052, footHeight, 0.22, 0.006, 1)
    foot.translate(side * (width / 2 - 0.045), footHeight / 2, -0.015)
    parts.push(foot)
  }

  const stretcher = bevelledBox(width - 0.14, 0.026, 0.016, 0.005, 1)
  stretcher.translate(0, 0.2, -0.02)
  parts.push(stretcher)

  return finalize(merge(parts), { crease: Math.PI / 5, metresPerTile: 0.35 })
}

// ---------------------------------------------------------------------------
// 2. The interpretive panel
// ---------------------------------------------------------------------------

/**
 * A freestanding interpretive graphic panel — the board that carries a wing's
 * introductory text before the visitor reaches the first object.
 *
 * The rake is the entire design. A vertical board on two feet is a road sign;
 * eight degrees off vertical is a thing that was set up by someone, and it also
 * turns the top of a two-metre panel towards the reader's eye instead of away
 * from it. The board and its posts are built upright, tilted about the origin
 * as one rigid frame, and then lifted so the post ends bury themselves in cast
 * shoes that stay flat on the floor — which is how an easel actually works and
 * how you avoid a foot hovering at one end.
 *
 * Deliberately no swept or turned part anywhere in it, so `finalize` can run
 * with `crease: null`. The panel's whole reason to exist is one big flat face
 * 1.2 m across, and `toCreasedNormals` re-derives normals off a 1 cm position
 * hash: on a face this size that is the pillow-shading failure the geometry
 * library's own comment was written about. Cast shoes made of bevelled boxes
 * instead of a swept moulding is a cheap price for exact normals.
 *
 * TEXT: on the board's front face. The face centre is (0, 1.186, -0.092) local
 * and the plane is tilted by rotateX(-0.12). The usable field is 1.10 x 1.50 m
 * centred at (0, 1.202, -0.094) — 16 mm above the face centre, because the
 * fixing batten eats the bottom of the board and nothing else does.
 */
export function buildInterpPanel({ width = 1.2, height = 2.0 } = {}) {
  const raked = []
  const grounded = []

  /** About 7 degrees. Beyond ten it stops reading as a panel and starts
   *  reading as a drawing board. */
  const RAKE = 0.12
  const BOARD_THICKNESS = 0.026
  /** How far the post ends sink into the shoes once the frame is tilted. */
  const SHOE_TOP = 0.05
  const LIFT = 0.03

  const cos = Math.cos(RAKE)
  const sin = Math.sin(RAKE)
  const boardZ = 0.034
  const faceZ = boardZ + BOARD_THICKNESS / 2

  // Solve the board's height in the UNTILTED frame so that, once tilted and
  // lifted, its highest corner lands exactly on `height`. Doing this the other
  // way round — tilting and then measuring — leaves every panel a centimetre or
  // two short of its declared size, which shows up as soon as two of them stand
  // side by side.
  const boardHeight = height - 0.36
  const boardTop = (height - LIFT - faceZ * sin) / cos
  const boardCentre = boardTop - boardHeight / 2

  // 10 mm arris. Larger than the kit's usual 6 mm on purpose: this is a sign
  // panel, its edge is the only modelling it has, and a bullnose that reads
  // from three metres is worth more here than a crisp one that does not.
  const board = bevelledBox(width, boardHeight, BOARD_THICKNESS, 0.01, 2)
  board.translate(0, boardCentre, boardZ)
  raked.push(board)

  const postHeight = 1.32
  for (const side of [-1, 1]) {
    const post = bevelledBox(0.05, postHeight, 0.045, 0.006, 1)
    post.translate(side * (width / 2 - 0.2), postHeight / 2, 0)
    raked.push(post)
  }

  // Stretcher between the posts, low enough to be seen under the board — the
  // one piece of the frame the visitor ever looks at directly.
  const stretcher = bevelledBox(width - 0.34, 0.05, 0.028, 0.005, 1)
  stretcher.translate(0, 0.24, 0)
  raked.push(stretcher)

  // Fixing batten across the foot of the graphic. It is what a real panel is
  // clamped by, and it gives the text field a hard bottom edge to sit above
  // rather than fading out into board.
  const batten = bevelledBox(width - 0.04, 0.034, 0.014, 0.004, 1)
  batten.translate(0, boardTop - boardHeight + 0.045, faceZ + 0.007)
  raked.push(batten)

  for (const geometry of raked) {
    geometry.rotateX(-RAKE)
    geometry.translate(0, LIFT, 0)
  }

  // Shoes are set BACK of the posts, not centred on them. The board leans back,
  // so its mass is behind the posts and that is the side that needs the lever
  // arm; a centred sled puts half its length out in front where it does nothing
  // but catch the toe of anyone reading the panel.
  const SHOE_BIAS = -0.06

  for (const side of [-1, 1]) {
    // Two-step cast shoe: a wide pad on the floor and a smaller block above it.
    // A single slab reads as an offcut of the board laid flat; the step is what
    // makes it a casting.
    const pad = bevelledBox(0.09, 0.028, 0.44, 0.006, 1)
    pad.translate(side * (width / 2 - 0.2), 0.014, SHOE_BIAS)
    grounded.push(pad)

    const block = bevelledBox(0.07, SHOE_TOP - 0.028, 0.36, 0.005, 1)
    block.translate(side * (width / 2 - 0.2), (SHOE_TOP + 0.028) / 2, SHOE_BIAS)
    grounded.push(block)
  }

  return finalize(merge([...raked, ...grounded]), { crease: null, metresPerTile: 0.7 })
}

// ---------------------------------------------------------------------------
// 3. The atrium banner
// ---------------------------------------------------------------------------

/**
 * A hanging fabric banner, on a top and bottom batten.
 *
 * The atrium is 18 x 18 x 8.4 m and has nothing whatsoever in its upper five
 * metres, which is the single largest hole in the building: a room reads as
 * tall only if something occupies the height, and a ceiling does not count
 * because nobody looks up at a ceiling.
 *
 * Three deformations, and all three are load-bearing. A catenary SAG along the
 * top edge, because cloth hung between two points does not hang straight and
 * the eye knows it. A gentle TWIST down the drop, eased at both ends because
 * both ends are clamped to rigid battens — this is the one that stops a banner
 * reading as a printed card, since a flat quad seen from the side disappears
 * and a twisted one catches light along its length. And a shallow BILLOW, so
 * the middle of the cloth is not coplanar with its own edges.
 *
 * The bottom batten is rotated by the FULL twist angle. It is a rigid bar: it
 * cannot follow a twisting edge, it can only sit at the angle the cloth ends
 * up at, and matching it is the difference between hanging fabric and a mesh
 * with a bar clipping through it.
 *
 * Authored HANGING: bounding box maximum Y is exactly 0, so the placement is
 * the ceiling height with no per-part offset.
 *
 * TEXT: on the cloth's +Z face, and it has to live in the UPPER THIRD, because
 * the twist is cumulative — measured on the baked cloth, the local yaw is
 * 0.012 rad at y = -0.5, 0.05 at y = -1.15, 0.11 at y = -2.0 and the full
 * 0.22 at the bottom batten. Below about y = -1.9 a flat quad of text stops
 * being able to lie on the surface at all.
 *
 * For one block: centre (0, -1.15, 0.038) local, yawed rotateY(0.05) to match
 * the cloth there, 0.86 x 1.30 m. The cloth's own billow puts its front face at
 * z = 0.025 on the centreline and z = 0.010 out at the edges of that block, so
 * the quad stands 13-28 mm proud — invisible from the floor, eight metres down.
 * For anything longer, give each LINE its own quad at its own height: the
 * surface is at z = 0.012 at y = -0.5, 0.025 at y = -1.15 and 0.031 at y = -1.8
 * on the centreline, with the yaws above.
 */
export function buildBanner({ width = 1.1, dropLength = 4.0 } = {}) {
  const cloth = []
  const battens = []

  const TOP_BATTEN_RADIUS = 0.018
  const BOTTOM_BATTEN_RADIUS = 0.014
  /** Half the finial's widest turning. Sets how far the battens are inset from
   *  y = 0 and y = -dropLength so the finials, not the bars, define the ends. */
  const FINIAL_RADIUS = 0.026
  const TWIST = 0.22
  const SAG = 0.038
  const BILLOW = 0.03

  const clothTop = -0.03
  const clothLength = dropLength - 0.06

  /** Eased so the twist rate is zero at both battens, which is where a clamped
   *  sheet cannot twist. Linear here looks like a corkscrew. */
  const twistAt = (t) => TWIST * t * t * (3 - 2 * t)

  const sheet = new BoxGeometry(width, clothLength, 0.004, 10, 18, 1)
  sheet.translate(0, clothTop - clothLength / 2, 0)

  const position = sheet.attributes.position
  const CATENARY = 1.7
  const coshEnd = Math.cosh(CATENARY)

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)

    const u = (x + width / 2) / width
    // Clamped, and not defensively. The bottom row of the sheet lands on t = 1
    // to within float error, `(1 - t)` goes very slightly negative, and the
    // fractional power below returns NaN — which propagates through the merge
    // into a geometry whose bounding box is NaN and whose GLB accessor min/max
    // are NaN, so the whole banner silently fails to draw.
    const t = Math.min(1, Math.max(0, (clothTop - y) / clothLength))

    // A real catenary, not a parabola or a sine. It is a two-line difference
    // and it is the shape the eye has been trained on by every rope, cable and
    // hung cloth it has ever seen.
    const sag = (coshEnd - Math.cosh(CATENARY * (2 * u - 1))) / (coshEnd - 1)
    // The sag dies away down the drop: the bottom batten's weight pulls the
    // cloth straight, so only the hung edge dips.
    const dropped = y - SAG * sag * (1 - t) ** 1.6

    const billow =
      z +
      BILLOW * Math.sin(Math.PI * u) * Math.sin(Math.PI * t) +
      0.01 * Math.sin(2 * Math.PI * u) * Math.sin(0.9 * Math.PI * t)

    const angle = twistAt(t)
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)

    position.setX(index, x * cos + billow * sin)
    position.setY(index, dropped)
    position.setZ(index, -x * sin + billow * cos)
  }

  // The sheet has one vertex grid per face, so this smooths along the cloth and
  // still leaves a hard edge where the face wraps round the selvedge.
  sheet.computeVertexNormals()
  cloth.push(sheet)

  const battenLengths = [width + 0.16, width + 0.1]
  const battenY = [-FINIAL_RADIUS, -dropLength + FINIAL_RADIUS]
  const battenRadius = [TOP_BATTEN_RADIUS, BOTTOM_BATTEN_RADIUS]

  for (let end = 0; end < 2; end += 1) {
    const length = battenLengths[end]
    const bar = new CylinderGeometry(battenRadius[end], battenRadius[end], length, 12)
    bar.rotateZ(Math.PI / 2)
    bar.translate(0, battenY[end], 0)

    const ends = []
    for (const side of [-1, 1]) {
      // Turned finial. Without it the batten is a length of pipe, and a length
      // of pipe is what tells you nobody made this.
      const finial = lathe(
        [
          [0, 0],
          [0.02, 0.004],
          [FINIAL_RADIUS, 0.018],
          [0.015, 0.03],
          [0.017, 0.038],
          [0, 0.046],
        ],
        12,
      )
      finial.rotateZ(side * -Math.PI / 2)
      finial.translate(side * (length / 2 - 0.004), battenY[end], 0)
      ends.push(finial)
    }

    const assembly = merge([bar, ...ends])
    // The bottom bar hangs at whatever angle the cloth has twisted to by the
    // time it reaches it. The top one is the datum and stays square.
    if (end === 1) assembly.rotateY(twistAt(1))
    battens.push(assembly)
  }

  return {
    cloth: finalize(merge(cloth), { crease: null, metresPerTile: 0.6 }),
    battens: finalize(merge(battens), { crease: Math.PI / 5, metresPerTile: 0.3 }),
  }
}

// ---------------------------------------------------------------------------
// 4. The reception desk
// ---------------------------------------------------------------------------

/**
 * The reception counter: a bow-fronted worktop over a curved fascia, with a
 * lower return running back at one end.
 *
 * This is the first object the visitor sees and the only one whose job is to
 * say "you are somewhere staffed". The bow is what does it — every other piece
 * of furniture in the building is orthogonal, so a curve in plan reads as
 * expensive joinery from across the atrium — and the return is what stops the
 * curve reading as a bar.
 *
 * Everything that curves is a plain `BoxGeometry` with width segments, NOT a
 * `bevelledBox`, and that is not a stylistic slip. RoundedBoxGeometry only
 * tessellates its corners: a 2.4 m bevelled box has vertices within 10 mm of
 * each end and nothing whatsoever in between, so bending one produces a flat
 * chord — measured, the counter front came back 62 mm shy of where it was
 * authored, which is the sagitta, to the millimetre. A segmented box bends
 * properly at 0.25 mm chord deviation.
 *
 * The bevel is bought back as PROFILE instead. The worktop is three bent bands
 * — a recessed nosing over a proud slab over a recessed drip — so the front
 * edge has three arrises at three different depths, which is what a moulded
 * solid-surface edge actually is and reads far better at this size than a 6 mm
 * radius would. The end panels and the return are straight joinery and keep
 * real bevelled arrises, and they are the whole silhouette from an angle.
 *
 * Grounded: both kick plates sit their bottom face on y = 0, and `bow()` does
 * not touch Y, so the whole thing stays on the floor.
 *
 * TEXT, if the institution wants its name on the counter: on the proud band,
 * centred at (0, 0.894, 0.415) local with a cap height of 35 mm or less. The
 * band is bowed on a 7.25 m radius about (0, y, -6.85), so lettering wider than
 * about 0.6 m has to be set as separate words following that arc rather than as
 * one flat run.
 */
export function buildReceptionDesk({ width = 2.4, depth = 0.8, height = 1.05 } = {}) {
  const bowed = []
  const straight = []

  /** How far the centre of the front bulges past the line of its two ends. */
  const SAGITTA = 0.1
  const radius = (width * width) / 4 / (2 * SAGITTA) + SAGITTA / 2
  const halfAngle = width / 2 / radius
  const frontZ = depth / 2

  const KICK_HEIGHT = 0.11
  const BODY_DEPTH = 0.66
  /** Nosing, slab, drip: the three bands of the worktop edge, top down. */
  const NOSING = 0.012
  const SLAB = 0.018
  const DRIP = 0.016
  const fasciaTop = height - NOSING - SLAB - DRIP
  const backZ = frontZ - BODY_DEPTH

  /** A bent panel needs enough divisions that the arc does not read as flats.
   *  Twenty across 2.4 m is 0.25 mm of chord error; the cost is 8 triangles a
   *  division, so resolution here is close to free and faceting is not. */
  const bentBox = (w, h, d, segments) => new BoxGeometry(w, h, d, segments, 1, 1)

  // Kick recess. The fascia oversails it by 55 mm, so the counter appears to
  // float clear of the floor instead of growing out of it — the oldest trick in
  // shopfitting and still the cheapest.
  const kick = bentBox(width - 0.1, KICK_HEIGHT, 0.55, 14)
  kick.translate(0, KICK_HEIGHT / 2, frontZ - 0.055 - 0.275)
  bowed.push(kick)

  const fasciaHeight = fasciaTop - KICK_HEIGHT
  const fascia = bentBox(width, fasciaHeight, 0.032, 20)
  fascia.translate(0, KICK_HEIGHT + fasciaHeight / 2, frontZ - 0.016)
  bowed.push(fascia)

  // A proud band across the bow at transaction height. It is 55 mm of profile
  // and it does two jobs: it breaks up nine hundred millimetres of blank fascia,
  // and it is the obvious place to letter the institution's name.
  const band = bentBox(width, 0.055, 0.014, 20)
  band.translate(0, fasciaTop - 0.11, frontZ + 0.005)
  bowed.push(band)

  // Only 20 mm narrower than the counter, not 80. The back panel sits 0.65 m
  // closer to the axis than the fascia does, so the bend alone brings its ends
  // 110 mm inboard before any trimming — measured. Author it short as well, the
  // way a straight panel would be, and it never reaches the end panels: what is
  // left is a slot straight through into the carcass, on the staff side, which
  // is the one side nobody checks.
  const back = bentBox(width - 0.02, fasciaTop, 0.028, 12)
  back.translate(0, fasciaTop / 2, backZ + 0.014)
  bowed.push(back)

  // The three-band edge. Widths step in and out with the depths so the same
  // profile runs round the ends of the counter, not just across its front.
  for (const layer of [
    { thickness: NOSING, top: height, proud: 0.022, inset: 0.014, segments: 22 },
    { thickness: SLAB, top: height - NOSING, proud: 0.03, inset: 0, segments: 22 },
    { thickness: DRIP, top: height - NOSING - SLAB, proud: 0.02, inset: 0.018, segments: 22 },
  ]) {
    const front = frontZ + layer.proud
    const slabDepth = depth - (0.03 - layer.proud)
    const slab = bentBox(width + 0.05 - layer.inset, layer.thickness, slabDepth, layer.segments)
    slab.translate(0, layer.top - layer.thickness / 2, front - slabDepth / 2)
    bowed.push(slab)
  }

  for (const geometry of bowed) bow(geometry, radius, frontZ)

  /**
   * The two ends, and the return, are STRAIGHT joinery meeting a curve.
   *
   * They are built square and then swung to the arc's end tangent rather than
   * pushed through `bow()`, because a 30 mm end panel bent about an axis seven
   * metres away is indistinguishable from a rotated one and the rotation is
   * exact — it also keeps their bevels, which the bend cannot. `rotateY` by the
   * half-angle maps local +X onto the tangent at the arc's end,
   * which is the direction the counter is actually running when it gets there.
   */
  const endPoint = [
    radius * Math.sin(halfAngle),
    frontZ - radius + radius * Math.cos(halfAngle),
  ]

  const place = (geometry, side) => {
    geometry.rotateY(side * halfAngle)
    geometry.translate(side * endPoint[0], 0, endPoint[1])
    straight.push(geometry)
  }

  for (const side of [-1, 1]) {
    const endPanel = bevelledBox(0.03, fasciaTop, BODY_DEPTH, 0.008, 1)
    endPanel.translate(side * -0.015, fasciaTop / 2, -BODY_DEPTH / 2)
    place(endPanel, side)
  }

  // The lower return: a desk-height wing running back into the staff side off
  // the right-hand end. Reception counters are 1.05 m because that is a
  // comfortable height to sign something standing up, which makes them useless
  // to work at, so every real one has a 0.74 m wing behind it.
  const RETURN_HEIGHT = 0.74
  const RETURN_TOP = 0.038
  const RETURN_WIDTH = 0.6
  const RETURN_LENGTH = 0.82
  // Runs 60 mm INTO the counter carcass rather than butting onto it. The back
  // of the counter is bowed and the return is not, so an abutting joint opens
  // to daylight the moment the two stop being tangent, and what shows through
  // is the inside of an empty box.
  const returnCentreZ = -BODY_DEPTH + 0.06 - RETURN_LENGTH / 2

  const returnTop = bevelledBox(RETURN_WIDTH, RETURN_TOP, RETURN_LENGTH, 0.01, 1)
  returnTop.translate(-RETURN_WIDTH / 2, RETURN_HEIGHT - RETURN_TOP / 2, returnCentreZ)
  place(returnTop, 1)

  const returnKick = bevelledBox(RETURN_WIDTH - 0.06, 0.1, RETURN_LENGTH - 0.06, 0.006, 1)
  returnKick.translate(-RETURN_WIDTH / 2, 0.05, returnCentreZ)
  place(returnKick, 1)

  const returnSide = bevelledBox(0.026, RETURN_HEIGHT - RETURN_TOP - 0.1, RETURN_LENGTH, 0.008, 1)
  returnSide.translate(-0.013, 0.1 + (RETURN_HEIGHT - RETURN_TOP - 0.1) / 2, returnCentreZ)
  place(returnSide, 1)

  const returnBack = bevelledBox(RETURN_WIDTH, RETURN_HEIGHT - RETURN_TOP - 0.1, 0.026, 0.008, 1)
  returnBack.translate(
    -RETURN_WIDTH / 2,
    0.1 + (RETURN_HEIGHT - RETURN_TOP - 0.1) / 2,
    returnCentreZ - RETURN_LENGTH / 2 + 0.013,
  )
  place(returnBack, 1)

  // `crease: null` even though this part curves. Every normal in it was exact
  // when it was authored and was ROTATED by the bend rather than recomputed, so
  // the bowed panels already shade as cylinders and the arrises are already
  // hard. There is nothing left for a crease pass to fix and a 2.4 m worktop
  // for it to pillow.
  return finalize(merge([...bowed, ...straight]), { crease: null, metresPerTile: 0.8 })
}

// ---------------------------------------------------------------------------
// 5. The donation box
// ---------------------------------------------------------------------------

/**
 * A glazed collection box on a turned pedestal, at lectern height.
 *
 * The glazing is the point. An opaque box asks for money; a glazed one shows
 * you what other people already gave, which is the whole of why museums build
 * them this way, and it means the object has an inside worth walking up to.
 *
 * The slot is real geometry, not a texture and not a boolean. Two brass plates
 * separated by 20 mm with short fillers closing each end leave a 120 x 20 mm
 * opening, which is exactly what a milled slot is; this kit has no CSG and does
 * not need any to make a hole that is only ever a gap between two solids.
 *
 * Returns { pedestal, glass }. The brass slot plate rides in `pedestal` because
 * the caller asked for two keys, and brass is the right material for the whole
 * of that geometry anyway — a turned brass column is the same family of object
 * as the rope stanchions it will stand among.
 */
export function buildDonationBox({ hopperHeight = 0.27 } = {}) {
  const pedestal = []
  const glass = []

  const BASE_HEIGHT = 0.056
  const SHAFT_TOP = 0.84
  const DECK_TOP = 0.86
  const HOPPER_BOTTOM = 0.24
  const HOPPER_TOP = 0.28
  const PLATE = 0.018

  const base = lathe(
    [
      [0, 0],
      [0.185, 0],
      [0.18, 0.014],
      [0.09, 0.03],
      [0.062, 0.044],
      [0.058, BASE_HEIGHT],
      [0, BASE_HEIGHT],
    ],
    20,
  )
  pedestal.push(base)

  // Turned shaft. The knop two-thirds of the way down is not decoration: a
  // plain tapered column of this height reads as a bollard, and one swelling
  // gives the eye something to measure the taper against.
  const shaft = lathe(
    [
      [0.058, 0],
      [0.056, 0.02],
      [0.04, 0.06],
      [0.038, 0.24],
      [0.052, 0.3],
      [0.056, 0.33],
      [0.048, 0.37],
      [0.036, 0.42],
      [0.035, 0.7],
      [0.046, 0.75],
      [0.052, 0.78],
      [0, SHAFT_TOP - BASE_HEIGHT],
    ],
    16,
  )
  shaft.translate(0, BASE_HEIGHT, 0)
  pedestal.push(shaft)

  const collar = bevelledBox(0.2, 0.014, 0.2, 0.004, 1)
  collar.translate(0, SHAFT_TOP - 0.007, 0)
  pedestal.push(collar)

  const deck = bevelledBox(0.3, DECK_TOP - SHAFT_TOP, 0.3, 0.006, 1)
  deck.translate(0, (DECK_TOP + SHAFT_TOP) / 2, 0)
  pedestal.push(deck)

  // The hopper flares outward going up, so the corner posts and the glazing all
  // lean by the same small angle. Posts first: they are what the panes butt
  // against, and they hide the four mitres that a tapered glazed box would
  // otherwise leave open at the corners.
  const flare = Math.atan2((HOPPER_TOP - HOPPER_BOTTOM) / 2, hopperHeight)
  const hopperCentre = DECK_TOP + hopperHeight / 2
  const cornerRadius = (HOPPER_BOTTOM + HOPPER_TOP) / 4

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = bevelledBox(0.018, hopperHeight, 0.018, 0.004, 1)
      post.rotateZ(-sx * flare)
      post.rotateX(sz * flare)
      post.translate(sx * cornerRadius, hopperCentre, sz * cornerRadius)
      pedestal.push(post)
    }
  }

  const paneWidth = (HOPPER_BOTTOM + HOPPER_TOP) / 2
  for (const side of [-1, 1]) {
    const front = bevelledBox(paneWidth, hopperHeight, 0.007, 0.002, 1)
    front.rotateX(side * flare)
    front.translate(0, hopperCentre, side * cornerRadius)
    glass.push(front)

    const flank = bevelledBox(0.007, hopperHeight, paneWidth, 0.002, 1)
    flank.rotateZ(-side * flare)
    flank.translate(side * cornerRadius, hopperCentre, 0)
    glass.push(flank)
  }

  const plateY = DECK_TOP + hopperHeight + PLATE / 2
  const SLOT_HALF = 0.01
  const SLOT_LENGTH = 0.12

  for (const side of [-1, 1]) {
    const leaf = bevelledBox(0.3, PLATE, 0.14, 0.005, 1)
    leaf.translate(0, plateY, side * (SLOT_HALF + 0.07))
    pedestal.push(leaf)

    const stop = bevelledBox((0.3 - SLOT_LENGTH) / 2, PLATE, SLOT_HALF * 2, 0.004, 1)
    stop.translate(side * (SLOT_LENGTH + (0.3 - SLOT_LENGTH) / 2) / 2, plateY, 0)
    pedestal.push(stop)
  }

  return {
    pedestal: finalize(merge(pedestal), { crease: Math.PI / 5, metresPerTile: 0.4 }),
    glass: finalize(merge(glass), { crease: null, metresPerTile: 0.4 }),
  }
}
