/**
 * The kit.
 *
 * One kit for the whole building. Each era varies ONLY palette, light
 * temperature, floor material and hero prop — a contemporary museum ABOUT each
 * decade rather than a pastiche OF it. Period pastiche across six wings would
 * cost roughly four times the art and drift into a patchwork.
 *
 * Module width 3.0 m · door 1.6 x 2.4 m · gallery ceiling 4.2 m.
 */

import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three'

import {
  EDGE,
  bevelledBox,
  finalize,
  lathe,
  merge,
  sweepProfile,
  wallSegments,
} from './lib/geometry.mjs'

const WALL_THICKNESS = 0.25
const FLOOR_THICKNESS = 0.18
const BASEBOARD_HEIGHT = 0.16
const CORNICE_HEIGHT = 0.22
/** Chair-rail height. Hand height, which is why every building uses it. */
const DADO_HEIGHT = 1.02
/** How far the dado field stands off the plaster. */
const DADO_PROUD = 0.014
/** Picture rail. Above the door head, below the cornice. */
const PICTURE_RAIL_HEIGHT = 2.62

/**
 * Skirting profile, authored in the XY plane: X is depth out from the wall,
 * Y is height. The little ogee step at the top is what stops it reading as a
 * plain rectangle when a raking light crosses it.
 */
const BASEBOARD_PROFILE = [
  [0, 0],
  [0.028, 0],
  [0.028, BASEBOARD_HEIGHT - 0.045],
  [0.020, BASEBOARD_HEIGHT - 0.030],
  [0.022, BASEBOARD_HEIGHT - 0.014],
  [0.012, BASEBOARD_HEIGHT],
  [0, BASEBOARD_HEIGHT],
]

/** Chair rail: an ogee cap that terminates the dado panelling. */
const DADO_PROFILE = [
  [0, 0],
  [DADO_PROUD + 0.016, 0],
  [DADO_PROUD + 0.020, 0.016],
  [DADO_PROUD + 0.011, 0.030],
  [DADO_PROUD + 0.013, 0.046],
  [0.010, 0.062],
  [0, 0.062],
]

/** Picture rail: a slim hook moulding, its lip proud enough to take a hook. */
const PICTURE_RAIL_PROFILE = [
  [0, 0],
  [0.014, 0.004],
  [0.024, 0.018],
  [0.028, 0.032],
  [0.013, 0.042],
  [0, 0.042],
]

/** Cornice profile — a cove sprung between wall and ceiling. */
const CORNICE_PROFILE = [
  [0, 0],
  [0.038, 0],
  [0.030, 0.060],
  [0.020, 0.105],
  [0.020, 0.150],
  [0.010, CORNICE_HEIGHT],
  [0, CORNICE_HEIGHT],
]

/**
 * Maps a portal, authored in room-local coordinates, onto the wall it pierces.
 * Returns null when the portal does not sit on any wall plane, which is a
 * content bug worth surfacing rather than silently ignoring.
 */
function portalToWall(portal, shell) {
  const halfWidth = shell.width / 2
  const halfDepth = shell.depth / 2
  const [x, , z] = portal.position
  const tolerance = 0.35

  /**
   * `centre` is in the WALL's own axis, which is not always the room's.
   *
   * `buildWall` lays its segments out along +X and the caller rotates the
   * finished wall into place (see WALLS below, which fixes the convention:
   * local +X runs along the wall, local +Z points into the room). Half of
   * those rotations reverse the along-wall axis, so an opening whose centre is
   * copied straight from the room coordinate comes out mirrored about the
   * wall's midpoint.
   *
   * This sealed the museum. Every doorway existed and every doorway was on the
   * wrong side of centre, so no opening ever met its neighbour's: the atrium's
   * west hole was at z = -2 and Holyoke's east hole at z = +2, with solid
   * plaster facing each other. The player could walk into a doorway, stop, and
   * never leave the first room — which is exactly what happened.
   */
  if (Math.abs(x + halfWidth) < tolerance) return { side: 'west', centre: -z }
  if (Math.abs(x - halfWidth) < tolerance) return { side: 'east', centre: z }
  if (Math.abs(z + halfDepth) < tolerance) return { side: 'north', centre: x }
  if (Math.abs(z - halfDepth) < tolerance) return { side: 'south', centre: -x }
  return null
}

/**
 * Builds one wall, split around its openings, with skirting and cornice.
 *
 * `runs` along the local X axis, is `thickness` deep in Z, and is positioned by
 * the caller. Openings are cut by segmentation rather than CSG: identical
 * result for axis-aligned rectangles, no manifold risk.
 */
function buildWall(length, height, openings) {
  const solids = []
  const trim = []
  const panelling = []

  /**
   * `-PI/2`, not `+PI/2`.
   *
   * `sweepProfile` authors the section in XY with +X as depth and extrudes
   * along Z. `rotateY(-PI/2)` puts the run on X and the depth on +Z, which is
   * the room side under the wall convention above. With `+PI/2` the depth went
   * to -Z and every moulding was buried in the wall.
   */
  const layMoulding = (profile, runLength, centre, atHeight, flip = false) => {
    const bar = sweepProfile(profile, runLength)
    bar.rotateY(-Math.PI / 2)
    if (flip) bar.rotateZ(Math.PI)
    bar.translate(centre, atHeight, WALL_THICKNESS / 2)
    return bar
  }

  for (const segment of wallSegments(length, openings)) {
    if (segment.full) {
      const panel = bevelledBox(segment.length, height, WALL_THICKNESS, EDGE)
      panel.translate(segment.centre, height / 2, 0)
      solids.push(panel)

      // Skirting, dado and picture rail only run along solid segments — they
      // stop at the doorway reveal, exactly as joinery does.
      trim.push(layMoulding(BASEBOARD_PROFILE, segment.length, segment.centre, 0))

      /**
       * The dado: oak panelling from the skirting to a chair rail at 1.02 m.
       *
       * This is the cheapest thing in the building. A plaster wall with a
       * skirting and nothing else has one horizontal line in it and reads as a
       * slab whatever texture you put on it; a wall with a dado has three
       * lines, two materials and a plane change at hand height, which is what
       * the eye uses to judge the size of a room. About 380 triangles per
       * segment against a 30,000 shell budget currently spending 4,500.
       */
      const field = bevelledBox(
        segment.length,
        DADO_HEIGHT - BASEBOARD_HEIGHT,
        DADO_PROUD * 2,
        0.003,
        1,
      )
      field.translate(
        segment.centre,
        (DADO_HEIGHT + BASEBOARD_HEIGHT) / 2,
        WALL_THICKNESS / 2,
      )
      panelling.push(field)

      trim.push(layMoulding(DADO_PROFILE, segment.length, segment.centre, DADO_HEIGHT))

      // A picture rail only makes sense where there is wall above it to hang
      // from; the curator's office at 3.2 m gets one, a corridor would not.
      if (height > PICTURE_RAIL_HEIGHT + 0.5) {
        trim.push(
          layMoulding(PICTURE_RAIL_PROFILE, segment.length, segment.centre, PICTURE_RAIL_HEIGHT),
        )
      }
    } else {
      // The header above a doorway: solid wall from the opening's top to the
      // ceiling.
      const headerHeight = height - segment.openingHeight
      if (headerHeight > 0.01) {
        const header = bevelledBox(segment.length, headerHeight, WALL_THICKNESS, EDGE)
        header.translate(segment.centre, segment.openingHeight + headerHeight / 2, 0)
        solids.push(header)
      }
    }
  }

  // The cornice runs the full length regardless of openings — it is above the
  // door head.
  trim.push(layMoulding(CORNICE_PROFILE, length, 0, height, true))

  return { solids, trim, panelling }
}

/**
 * The complete shell for one room: floor, ceiling, four walls, skirting and
 * cornice, merged down to one geometry per material.
 *
 * Merging at bake time is the cheapest possible draw-call win and it beats
 * every runtime trick. The previous build spent roughly 140 draw calls per room
 * on wall decoration alone, stacked as coplanar textured planes with 12 mm
 * offsets to dodge z-fighting; at six wings that is unshippable.
 */
export function buildRoomShell(room) {
  const { shell, portals } = room
  const halfWidth = shell.width / 2
  const halfDepth = shell.depth / 2

  const openingsBySide = { north: [], south: [], east: [], west: [] }
  for (const portal of portals) {
    const wall = portalToWall(portal, shell)
    if (!wall) {
      throw new Error(
        `Room "${room.id}" portal "${portal.id}" at [${portal.position}] does not lie on any wall of a ${shell.width}x${shell.depth} shell.`,
      )
    }
    openingsBySide[wall.side].push({
      centre: wall.centre,
      width: portal.width,
      height: portal.height,
    })
  }

  const structure = []
  const trim = []
  const panelling = []

  /**
   * Floor and ceiling overhang the shell by half a wall on every side.
   *
   * `shell.width` measures the INSIDE of the room, so a slab of exactly that
   * size stops at the centre line of its own walls and leaves the outer half
   * of every wall standing on nothing. Where two rooms meet back to back that
   * is a hole in the floor precisely under the doorway — the one place a
   * player is guaranteed to walk. Overhanging by WALL_THICKNESS makes each
   * slab run out to its neighbour's face, so adjacent rooms meet edge to edge:
   * no gap to fall through and no overlap to z-fight.
   *
   * Top face sits exactly at y = 0, so every content position is a height
   * above the walking surface with no offset to remember.
   */
  const floor = bevelledBox(
    shell.width + WALL_THICKNESS,
    FLOOR_THICKNESS,
    shell.depth + WALL_THICKNESS,
    EDGE,
  )
  floor.translate(0, -FLOOR_THICKNESS / 2, 0)

  const ceiling = bevelledBox(
    shell.width + WALL_THICKNESS,
    0.14,
    shell.depth + WALL_THICKNESS,
    EDGE,
  )
  ceiling.translate(0, shell.height + 0.07, 0)
  structure.push(ceiling)

  /**
   * One convention for all four walls: local +X runs along the wall, local +Z
   * points INTO the room.
   *
   * West and east used to carry -PI/2 and +PI/2, which is the wrong way round:
   * with those, local +Z pointed out of the building on both side walls, and
   * every moulding `buildWall` produced was extruded into the far face of the
   * wall where no player could ever see it. The skirting and the cornice have
   * been in the geometry, and invisible, since the first bake — which is most
   * of why a gallery wall reads as a bare slab.
   */
  const walls = [
    { side: 'north', length: shell.width, rotationY: 0, x: 0, z: -halfDepth },
    { side: 'south', length: shell.width, rotationY: Math.PI, x: 0, z: halfDepth },
    { side: 'west', length: shell.depth, rotationY: Math.PI / 2, x: -halfWidth, z: 0 },
    { side: 'east', length: shell.depth, rotationY: -Math.PI / 2, x: halfWidth, z: 0 },
  ]

  for (const wall of walls) {
    const built = buildWall(wall.length, shell.height, openingsBySide[wall.side])

    for (const geometry of built.solids) {
      geometry.rotateY(wall.rotationY)
      geometry.translate(wall.x, 0, wall.z)
      structure.push(geometry)
    }
    for (const geometry of built.trim) {
      geometry.rotateY(wall.rotationY)
      geometry.translate(wall.x, 0, wall.z)
      trim.push(geometry)
    }
    for (const geometry of built.panelling) {
      geometry.rotateY(wall.rotationY)
      geometry.translate(wall.x, 0, wall.z)
      panelling.push(geometry)
    }
  }

  /**
   * `metresPerTile` sets the world size of one texture repeat, so texel density
   * stays uniform whether the surface is an 18 m atrium wall or a 60 mm cornice.
   *
   * The plaster was on 3.0 — the exact wall module from the plan — so every
   * texture repeat landed on the same grid as the architecture and the tile
   * boundaries read as construction joints. 1.7 is deliberately coprime with
   * the module, the door width and the room dimensions, so no repeat ever lines
   * up with an edge, and it nearly doubles texel density into the bargain.
   *
   * `crease: null` on the slabs: they are all bevelledBox, whose normals are
   * already exact, and re-deriving them on a 1 cm hash is what put a shading
   * seam across the middle of every wall. The mouldings are swept profiles and
   * genuinely need the crease pass.
   */
  return [
    {
      name: `${room.id}__floor`,
      geometry: finalize(floor, { crease: null, metresPerTile: 2.1 }),
      material: 'maple-floor',
    },
    {
      name: `${room.id}__structure`,
      geometry: finalize(merge(structure), { crease: null, metresPerTile: 1.7 }),
      material: 'plaster',
    },
    {
      name: `${room.id}__panelling`,
      // 0.42 m, so one repeat is about one board. At 0.9 the grain was wider
      // than a plank and the dado read as swirled stone rather than as oak.
      geometry: finalize(merge(panelling), { crease: null, metresPerTile: 0.42 }),
      material: 'oak-matte',
    },
    {
      name: `${room.id}__trim`,
      geometry: finalize(merge(trim), { crease: Math.PI / 4, metresPerTile: 0.6 }),
      material: 'oak-varnished',
    },
  ]
}

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

/** A display plinth: tapered shaft, bevelled cap, recessed base shadow gap. */
export function buildPlinth({ height = 1.0, top = 0.42, bottom = 0.48 } = {}) {
  const base = bevelledBox(bottom, 0.05, bottom, 0.004)
  base.translate(0, 0.025, 0)

  // The shadow gap: a slightly narrower band just above the base. It is two
  // centimetres of geometry that makes the whole object read as fabricated
  // rather than extruded.
  const gap = bevelledBox(bottom - 0.05, 0.03, bottom - 0.05, 0.003)
  gap.translate(0, 0.065, 0)

  const shaft = lathe(
    [
      [bottom / 2, 0],
      [bottom / 2, 0.02],
      [top / 2, 0.12],
      [top / 2, height - 0.06],
      [top / 2 + 0.015, height - 0.045],
      [top / 2 + 0.015, height - 0.01],
      [0, height],
    ],
    4,
  )
  shaft.rotateY(Math.PI / 4)
  shaft.translate(0, 0.08, 0)

  return finalize(merge([base, gap, shaft]), { crease: Math.PI / 5, metresPerTile: 0.6 })
}

/** A table vitrine: four legs, a rail, and a glass box. Glass is a separate part. */
export function buildVitrineTable({ width = 1.1, depth = 0.7, height = 0.9 } = {}) {
  const parts = []
  const legInset = 0.06
  const legSize = 0.045

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = bevelledBox(legSize, height, legSize, 0.003)
      leg.translate(
        sx * (width / 2 - legInset),
        height / 2,
        sz * (depth / 2 - legInset),
      )
      parts.push(leg)
    }
  }

  const deck = bevelledBox(width, 0.04, depth, 0.004)
  deck.translate(0, height + 0.02, 0)
  parts.push(deck)

  const apron = bevelledBox(width - 0.08, 0.06, depth - 0.08, 0.003)
  apron.translate(0, height - 0.06, 0)
  parts.push(apron)

  return finalize(merge(parts), { crease: Math.PI / 5 })
}

/** The glass hood that sits on a table vitrine. Faked, not transmissive. */
export function buildVitrineGlass({ width = 1.06, depth = 0.66, height = 0.5 } = {}) {
  const t = 0.008
  const parts = []

  for (const [w, d, x, z] of [
    [width, t, 0, -depth / 2],
    [width, t, 0, depth / 2],
    [t, depth, -width / 2, 0],
    [t, depth, width / 2, 0],
  ]) {
    const pane = bevelledBox(w, height, d, 0.002)
    pane.translate(x, height / 2, z)
    parts.push(pane)
  }

  const top = bevelledBox(width, t, depth, 0.002)
  top.translate(0, height, 0)
  parts.push(top)

  return finalize(merge(parts), { crease: Math.PI / 8 })
}

/** An angled reading plaque on a short stem. */
export function buildLabelPlaque({ width = 0.34, height = 0.24 } = {}) {
  const plate = bevelledBox(width, height, 0.012, 0.003)
  plate.rotateX(-Math.PI / 3.2)
  plate.translate(0, 0.98, 0)

  const stem = new CylinderGeometry(0.014, 0.018, 0.9, 12)
  stem.translate(0, 0.45, 0.02)

  const foot = lathe([[0, 0], [0.09, 0], [0.085, 0.012], [0.02, 0.02], [0.018, 0.03], [0, 0.03]], 24)

  return finalize(merge([plate, stem, foot]), { crease: Math.PI / 5, metresPerTile: 0.4 })
}

// ---------------------------------------------------------------------------
// Exhibits
// ---------------------------------------------------------------------------

/**
 * The hero object of the Holyoke wing: the laced Spalding leather volleyball,
 * c. 1900-1920.
 *
 * Built to the 1897 specification — 25 to 27 inches circumference, so a radius
 * of about 101 to 109 mm. Longitudinal panels with RAISED outseams, because the
 * period ball was stitched from the outside; the lace closes the inflation
 * opening. The lace and the maker's mark are the two examine hotspots, and the
 * mark is deliberately on the far side: the museum's whole lesson is that
 * objects have backs.
 */
export function buildSpaldingBall({ radius = 0.103, panels = 12 } = {}) {
  const parts = []

  const body = new SphereGeometry(radius, 48, 32)
  parts.push(body)

  // Raised outseams along the panel meridians. A torus of small minor radius
  // laid on the sphere reads exactly like a hand-stitched welt.
  const seamRadius = 0.0028
  for (let index = 0; index < panels / 2; index += 1) {
    const seam = new TorusGeometry(radius + seamRadius * 0.35, seamRadius, 6, 96)
    seam.rotateY((index * Math.PI) / (panels / 2))
    parts.push(seam)
  }

  // The lacing: short rungs bridging a slit on one panel.
  const laceCount = 5
  for (let index = 0; index < laceCount; index += 1) {
    const t = (index - (laceCount - 1) / 2) * 0.021
    const rung = new CylinderGeometry(0.0022, 0.0022, 0.030, 6)
    rung.rotateZ(Math.PI / 2)
    rung.translate(0, t, radius - 0.002)
    parts.push(rung)
  }

  // The valve boss, opposite the lace.
  const boss = lathe([[0, 0], [0.008, 0], [0.008, 0.004], [0.005, 0.006], [0, 0.006]], 16)
  boss.rotateX(-Math.PI / 2)
  boss.translate(0, 0, -radius + 0.001)
  parts.push(boss)

  return finalize(merge(parts), { crease: Math.PI / 4, uv: 'sphere' })
}

/** The rejected first ball: a bare basketball bladder, slack and lopsided. */
export function buildBladder({ radius = 0.108 } = {}) {
  const body = new SphereGeometry(radius, 32, 24)
  // Deflate it slightly and asymmetrically — the whole point of the object is
  // that it was "too soft".
  const position = body.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index)
    const slump = 1 - 0.14 * Math.max(0, y / radius) - 0.05 * Math.max(0, -y / radius)
    position.setX(index, position.getX(index) * (1 + 0.04))
    position.setY(index, y * slump)
    position.setZ(index, position.getZ(index) * (1 + 0.03))
  }
  body.computeVertexNormals()

  const nozzle = new CylinderGeometry(0.006, 0.008, 0.028, 10)
  nozzle.translate(0, radius * 0.86, 0)

  return finalize(merge([body, nozzle]), { crease: Math.PI / 3, uv: 'sphere' })
}

/**
 * The 1897-specification net assembly: posts in cast-iron floor sockets, a
 * cotton cord mesh, canvas tape along the top edge. Top of net at 1.98 m —
 * 6 feet 6 inches, roughly half a foot above the average man of the period.
 */
export function buildNet1897({ span = 4.8, netHeight = 0.62, topHeight = 1.98 } = {}) {
  const structure = []
  const cords = []

  for (const side of [-1, 1]) {
    const post = lathe(
      [
        [0, 0],
        [0.055, 0],
        [0.05, 0.05],
        [0.04, 0.4],
        [0.038, topHeight + 0.12],
        [0.03, topHeight + 0.18],
        [0, topHeight + 0.2],
      ],
      20,
    )
    post.translate(side * (span / 2), 0, 0)
    structure.push(post)

    const socket = lathe([[0, 0], [0.09, 0], [0.088, 0.016], [0.06, 0.022], [0.058, 0.03], [0, 0.03]], 20)
    socket.translate(side * (span / 2), 0.001, 0)
    structure.push(socket)
  }

  // Canvas tape, top and bottom.
  for (const y of [topHeight, topHeight - netHeight]) {
    const tape = bevelledBox(span, 0.05, 0.006, 0.002)
    tape.translate(0, y, 0)
    structure.push(tape)
  }

  // The mesh itself: thin boxes rather than lines, so it catches light and
  // casts a shadow.
  //
  // Deliberately UNBEVELLED. The bevel rule earns its keep on anything the
  // player can get close to and read a silhouette on; a 3.5 mm cord seen from a
  // metre away resolves to about two pixels, and a rounded box at two segments
  // costs ~294 triangles against a plain box's 12. Bevelling the whole mesh
  // came to 15,300 triangles — six times the standard-prop budget — for
  // detail nobody can see.
  const spacing = 0.1
  const cordThickness = 0.0035
  const columns = Math.floor(span / spacing)
  for (let index = 1; index < columns; index += 1) {
    const x = -span / 2 + index * spacing
    const cord = new BoxGeometry(cordThickness, netHeight, cordThickness)
    cord.translate(x, topHeight - netHeight / 2, 0)
    cords.push(cord)
  }
  const rows = Math.floor(netHeight / spacing)
  for (let index = 1; index < rows; index += 1) {
    const y = topHeight - netHeight + index * spacing
    const cord = new BoxGeometry(span, cordThickness, cordThickness)
    cord.translate(0, y, 0)
    cords.push(cord)
  }

  return {
    structure: finalize(merge(structure), { crease: Math.PI / 5, metresPerTile: 0.6 }),
    cords: finalize(merge(cords), { crease: Math.PI / 3, metresPerTile: 0.3 }),
  }
}

/**
 * An open bound volume, splayed on a vitrine cradle — the 1897 Handbook.
 *
 * Two page blocks tilted up from a central valley, on hard cover boards. The
 * tilt is what sells it: a book lying perfectly flat reads as a box, and the
 * 4-degree rise puts a gradient across each page that a flat surface cannot.
 */
export function buildOpenBook({ pageWidth = 0.14, pageDepth = 0.21, blockHeight = 0.022 } = {}) {
  const parts = []
  const tilt = 0.07
  const boardOverhang = 0.006

  for (const side of [-1, 1]) {
    // Page block: many thin leaves read as one solid, so the striation is
    // implied by the bevel catching light along the fore-edge.
    const block = bevelledBox(pageWidth, blockHeight, pageDepth, 0.0015)
    block.rotateZ(side * -tilt)
    block.translate(side * (pageWidth / 2 + 0.002), 0.028 + Math.abs(side) * 0.004, 0)
    parts.push(block)

    const board = bevelledBox(
      pageWidth + boardOverhang,
      0.005,
      pageDepth + boardOverhang * 2,
      0.0015,
    )
    board.rotateZ(side * -tilt)
    board.translate(side * (pageWidth / 2 + 0.002), 0.014, 0)
    parts.push(board)
  }

  // The spine valley, sunk between the two halves.
  const spine = new CylinderGeometry(0.014, 0.014, pageDepth, 12, 1, false, 0, Math.PI)
  spine.rotateZ(Math.PI / 2)
  spine.rotateY(Math.PI / 2)
  spine.rotateX(Math.PI)
  spine.translate(0, 0.02, 0)
  parts.push(spine)

  // A shallow cradle, as any conservator would use.
  for (const side of [-1, 1]) {
    const cradle = bevelledBox(pageWidth * 0.9, 0.012, pageDepth + 0.02, 0.002)
    cradle.rotateZ(side * -tilt)
    cradle.translate(side * (pageWidth / 2 + 0.002), 0.006, 0)
    parts.push(cradle)
  }

  return finalize(merge(parts), { crease: Math.PI / 5, metresPerTile: 0.35 })
}

/** A thin saddle-stitched booklet — the Spalding Athletic Library guide. */
export function buildBooklet({ width = 0.125, depth = 0.19, thickness = 0.009 } = {}) {
  const parts = []

  const block = bevelledBox(width, thickness, depth, 0.0012)
  block.translate(0, thickness / 2, 0)
  parts.push(block)

  // The cover sits a hair proud of the text block on three edges.
  const cover = bevelledBox(width + 0.003, 0.0012, depth + 0.003, 0.0008)
  cover.translate(0, thickness + 0.0006, 0)
  parts.push(cover)

  // Two staples along the spine.
  for (const z of [-depth * 0.22, depth * 0.22]) {
    const staple = new CylinderGeometry(0.0006, 0.0006, 0.008, 6)
    staple.rotateX(Math.PI / 2)
    staple.translate(-width / 2 + 0.004, thickness + 0.0016, z)
    parts.push(staple)
  }

  return finalize(merge(parts), { crease: Math.PI / 5, metresPerTile: 0.3 })
}

/**
 * A tailor's dress form wearing the period gymnasium suit.
 *
 * This is the closest the museum gets to a human figure, and it stays firmly on
 * the safe side of the line: a dressmaker's dummy is a surface of revolution,
 * which Lathe produces with correct topology, and it is genuinely how a museum
 * displays historical clothing. No attempt is made at anatomy — the moment you
 * try to hand-author a body the result is uncanny rather than stylised.
 */
export function buildDressForm() {
  const structure = []
  const garment = []

  // Cast-iron tripod base and column.
  const base = lathe(
    [[0, 0], [0.19, 0], [0.185, 0.014], [0.05, 0.03], [0.035, 0.05], [0.028, 0.06], [0, 0.06]],
    28,
  )
  structure.push(base)

  const column = new CylinderGeometry(0.018, 0.024, 0.52, 16)
  column.translate(0, 0.06 + 0.26, 0)
  structure.push(column)

  // The torso form. A single silhouette from waist to shoulder — the profile is
  // doing all the work, so it is worth the extra control points.
  const torsoBase = 0.58
  const torso = lathe(
    [
      [0, 0],
      [0.105, 0.005],
      [0.128, 0.06],
      [0.140, 0.16],
      [0.132, 0.26],
      [0.126, 0.34],
      [0.138, 0.42],
      [0.150, 0.50],
      [0.148, 0.58],
      [0.128, 0.66],
      [0.092, 0.71],
      [0.055, 0.735],
      [0, 0.742],
    ],
    36,
  )
  torso.translate(0, torsoBase, 0)
  structure.push(torso)

  // The garment: the same silhouette scaled a few millimetres proud, so it
  // reads as cloth over a form rather than as painted-on colour. Ribbed
  // worsted wool, knee-length trousers.
  const jersey = lathe(
    [
      [0.112, 0.0],
      [0.135, 0.06],
      [0.147, 0.16],
      [0.139, 0.26],
      [0.133, 0.34],
      [0.145, 0.42],
      [0.157, 0.50],
      [0.154, 0.575],
      [0.132, 0.655],
      [0.096, 0.706],
    ],
    36,
  )
  jersey.translate(0, torsoBase + 0.02, 0)
  garment.push(jersey)

  for (const side of [-1, 1]) {
    const trouser = lathe(
      [[0.062, 0], [0.070, 0.06], [0.066, 0.22], [0.060, 0.34], [0.058, 0.36]],
      20,
    )
    trouser.translate(side * 0.062, torsoBase - 0.34, 0)
    garment.push(trouser)
  }

  return {
    structure: finalize(merge(structure), { crease: Math.PI / 4, metresPerTile: 0.5 }),
    garment: finalize(merge(garment), { crease: Math.PI / 3, metresPerTile: 0.35 }),
  }
}

/**
 * A rope stanchion. Four of them around the atrium plinth turn a lone object
 * into a thing the museum is protecting, which is most of what makes a
 * centrepiece read as a centrepiece.
 */
export function buildStanchion({ height = 0.96 } = {}) {
  const parts = []

  const base = lathe(
    [[0, 0], [0.17, 0], [0.165, 0.016], [0.06, 0.028], [0.045, 0.04], [0, 0.045]],
    24,
  )
  parts.push(base)

  const post = new CylinderGeometry(0.021, 0.026, height - 0.09, 14)
  post.translate(0, 0.045 + (height - 0.09) / 2, 0)
  parts.push(post)

  // The finial. A plain capped tube reads as scaffolding; the turned top is
  // what makes it furniture.
  const finial = lathe(
    [[0, 0], [0.032, 0.004], [0.036, 0.024], [0.026, 0.04], [0.03, 0.052], [0.018, 0.066], [0, 0.07]],
    18,
  )
  finial.translate(0, height - 0.045, 0)
  parts.push(finial)

  return finalize(merge(parts), { crease: Math.PI / 5, metresPerTile: 0.4 })
}

/**
 * The brass plate that caps the atrium plinth: three empty medallion sockets.
 *
 * A bare plinth in the middle of a hub reads as unfinished furniture. The same
 * plinth with three obviously-empty slots reads as a lock you cannot open yet,
 * which is the whole job of the Goddess Statue in the RPD main hall — it makes
 * the room's centre a promise instead of a decoration.
 *
 * Each socket is a shallow dish with a proud rim rather than a hole: this kit
 * has no CSG, and a rim casts the contact shadow that sells a recess anyway.
 */
export function buildMedallionSocket({ radius = 0.3, thickness = 0.032, slots = 3 } = {}) {
  const parts = []

  parts.push(
    lathe(
      [
        [0, 0],
        [radius, 0],
        [radius, thickness - 0.008],
        [radius - 0.014, thickness],
        // An engraved concentric groove. Two millimetres of profile is the
        // difference between a brass plate and a disc of brass-coloured paint.
        [radius - 0.052, thickness],
        [radius - 0.058, thickness - 0.006],
        [radius - 0.072, thickness - 0.006],
        [radius - 0.078, thickness],
        [0, thickness],
      ],
      40,
    ),
  )

  const slotRadius = 0.071
  const ring = radius * 0.48
  for (let index = 0; index < slots; index += 1) {
    const angle = (index / slots) * Math.PI * 2 - Math.PI / 2
    const socket = lathe(
      [
        [0, 0],
        [slotRadius - 0.014, 0],
        [slotRadius - 0.01, 0.005],
        [slotRadius, 0.013],
        [slotRadius + 0.009, 0.015],
        [slotRadius + 0.01, 0.005],
        [slotRadius + 0.01, 0],
      ],
      22,
    )
    socket.translate(Math.cos(angle) * ring, thickness - 0.005, Math.sin(angle) * ring)
    parts.push(socket)
  }

  return finalize(merge(parts), { crease: Math.PI / 6, metresPerTile: 0.3 })
}

/**
 * The rope that hangs between two stanchions, as a separate placeable part.
 *
 * It has to be separate because the kit instances one mesh many times and a
 * rope belongs to a *pair* of posts, not to a post. `span` matches the atrium's
 * 2.6 m stanchion spacing; the sag is a real catenary rather than an arc, which
 * is the difference between rope and a bent pipe.
 */
export function buildRopeSpan({ span = 2.6, height = 0.86, sag = 0.17, radius = 0.017 } = {}) {
  // cosh-based sag normalised so the ends sit at y = 0 and the middle at -sag.
  const a = 2.6
  const curve = new CatmullRomCurve3(
    Array.from({ length: 13 }, (_, i) => {
      const t = i / 12
      const x = (t - 0.5) * span
      const u = (t - 0.5) * 2 * a
      const drop = (Math.cosh(u) - Math.cosh(a)) / (1 - Math.cosh(a))
      return new Vector3(x, height - sag * drop, 0)
    }),
    false,
    'catmullrom',
    0.5,
  )

  const rope = new TubeGeometry(curve, 24, radius, 7, false)

  // The clasps. Without them the rope floats a centimetre off each finial and
  // the eye reads it as clipping rather than as hanging.
  const parts = [rope]
  for (const side of [-1, 1]) {
    const clasp = lathe([[0, 0], [0.026, 0.006], [0.028, 0.03], [0.02, 0.042], [0, 0.046]], 12)
    clasp.rotateZ(side * 0.35)
    clasp.translate(side * (span / 2 - 0.01), height - 0.03, 0)
    parts.push(clasp)
  }

  return finalize(merge(parts), { crease: Math.PI / 4, metresPerTile: 0.25 })
}

/** A gallery bench. Somewhere to stop, which every museum has and few games do. */
export function buildBench({ width = 1.6, depth = 0.42, height = 0.44 } = {}) {
  const parts = []

  const seat = bevelledBox(width, 0.06, depth, 0.005)
  seat.translate(0, height - 0.03, 0)
  parts.push(seat)

  // Slatted, because a solid slab of oak this size looks like a crate.
  for (const offset of [-0.12, 0.12]) {
    const slat = bevelledBox(width - 0.06, 0.03, 0.1, 0.004, 1)
    slat.translate(0, height - 0.075, offset)
    parts.push(slat)
  }

  for (const side of [-1, 1]) {
    const leg = lathe(
      [[0, 0], [0.06, 0], [0.055, 0.02], [0.03, 0.06], [0.028, height - 0.1], [0.05, height - 0.06], [0, height - 0.06]],
      16,
    )
    leg.translate(side * (width / 2 - 0.16), 0, 0)
    parts.push(leg)

    const foot = bevelledBox(0.1, 0.02, depth - 0.06, 0.003, 1)
    foot.translate(side * (width / 2 - 0.16), 0.01, 0)
    parts.push(foot)
  }

  // Stretcher between the legs.
  const stretcher = new CylinderGeometry(0.018, 0.018, width - 0.36, 10)
  stretcher.rotateZ(Math.PI / 2)
  stretcher.translate(0, 0.14, 0)
  parts.push(stretcher)

  return finalize(merge(parts), { crease: Math.PI / 5, metresPerTile: 0.6 })
}

/**
 * A four-drawer archive cabinet — the container the reading layer lives in.
 *
 * The documents are the optional depth of the museum: the provenance notes, the
 * disputed date, the rule chronology. Putting them in drawers rather than on
 * the wall is what keeps a four-minute visit from drowning in text while still
 * rewarding the visitor who opens things.
 */
export function buildArchiveCabinet({ width = 0.62, depth = 0.52, height = 1.28, drawers = 4 } = {}) {
  const parts = []

  const carcass = bevelledBox(width, height, depth, 0.005)
  carcass.translate(0, height / 2, 0)
  parts.push(carcass)

  // Plinth base with a shadow gap, so it does not read as a box on the floor.
  const base = bevelledBox(width - 0.04, 0.05, depth - 0.04, 0.003, 1)
  base.translate(0, 0.025, 0)
  parts.push(base)

  const drawerHeight = (height - 0.12) / drawers
  for (let index = 0; index < drawers; index += 1) {
    const y = 0.08 + drawerHeight * (index + 0.5)

    // Drawer face, proud of the carcass so the reveal catches light.
    const face = bevelledBox(width - 0.05, drawerHeight - 0.014, 0.022, 0.003)
    face.translate(0, y, depth / 2 + 0.008)
    parts.push(face)

    // Cup pull. Coarse on purpose: a 45 mm handle resolves to a few pixels
    // from anywhere the player can stand, and four of them at the original
    // tessellation were 960 triangles on their own.
    const pull = new TorusGeometry(0.045, 0.006, 4, 14, Math.PI)
    pull.rotateZ(Math.PI)
    pull.translate(0, y - 0.01, depth / 2 + 0.026)
    parts.push(pull)

    // Card holder — the little brass frame every filing cabinet has. Flat and
    // unbevelled; it is 4 mm deep and nothing catches an edge that small.
    const holder = new BoxGeometry(0.13, 0.032, 0.004)
    holder.translate(0, y + drawerHeight * 0.28, depth / 2 + 0.021)
    parts.push(holder)
  }

  // A modest cornice so it reads as joinery rather than office furniture.
  // One bevel segment: it is a 28 mm band seen from below and the silhouette
  // does all the work.
  const cornice = bevelledBox(width + 0.03, 0.028, depth + 0.03, 0.004, 1)
  cornice.translate(0, height - 0.014, 0)
  parts.push(cornice)

  return finalize(merge(parts), { crease: Math.PI / 5, metresPerTile: 0.6 })
}

/** A framed print with a mount board. Aspect comes from the media manifest. */
export function buildFrame({ width = 0.5, aspect = 0.75, depth = 0.045 } = {}) {
  const height = width / aspect
  const border = 0.045
  const parts = []

  // Mitred frame section, swept as four runs.
  const section = [
    [0, 0],
    [depth, 0],
    [depth, border * 0.55],
    [depth * 0.45, border * 0.7],
    [depth * 0.42, border],
    [0, border],
  ]

  const runs = [
    { length: width + border * 2, rotationY: 0, x: 0, y: -height / 2 - border / 2, rotZ: 0 },
    { length: width + border * 2, rotationY: 0, x: 0, y: height / 2 + border / 2, rotZ: Math.PI },
  ]

  for (const run of runs) {
    const bar = sweepProfile(section, run.length)
    bar.rotateY(Math.PI / 2)
    if (run.rotZ) bar.rotateZ(run.rotZ)
    bar.translate(run.x, run.y, 0)
    parts.push(bar)
  }

  for (const side of [-1, 1]) {
    const bar = sweepProfile(section, height)
    // The `rotateY` is not optional and its absence is not visible in a
    // wireframe. `sweepProfile` extrudes along Z; `rotateZ` alone leaves the
    // run on Z, so the two stiles shot half a metre straight out of the wall
    // while the rails lay flat — the frame read as a wooden cube with a
    // photograph stuck to one face. Bring the run onto X first, exactly as the
    // rails do, and only then stand it up.
    bar.rotateY(Math.PI / 2)
    bar.rotateZ(side > 0 ? -Math.PI / 2 : Math.PI / 2)
    bar.translate(side * (width / 2 + border / 2), 0, 0)
    parts.push(bar)
  }

  // Mount board, recessed behind the frame face.
  const mount = bevelledBox(width + 0.012, height + 0.012, 0.006, 0.001)
  mount.translate(0, 0, depth * 0.3)
  parts.push(mount)

  return finalize(merge(parts), { crease: Math.PI / 5 })
}
