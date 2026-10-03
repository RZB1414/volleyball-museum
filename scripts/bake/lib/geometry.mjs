/**
 * Procedural geometry helpers.
 *
 * Everything the museum is built from is a surface of revolution, a swept
 * profile, a bevelled box or a grid — exactly what Lathe / Extrude / Loft /
 * RoundedBox produce with correct topology. Nothing organic is attempted; the
 * building is designed so the only organic things in it are photographs on
 * flat planes.
 *
 * THE BEVEL IS THE WHOLE GAME. A sharp 90-degree edge is the number-one tell of
 * agent-authored geometry. Every exposed edge in this kit gets 2-3 bevel
 * segments at 4-10 mm so a specular highlight runs along it.
 */

import {
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import {
  mergeGeometries,
  mergeVertices,
  toCreasedNormals,
} from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/** Default edge radius, in metres. Small enough to read as a crisp arris. */
export const EDGE = 0.006

/**
 * Project UVs, weld, re-split by crease angle, recompute bounds.
 *
 * Order is load-bearing in both directions:
 *
 *   - UVs first, because both projectors call toNonIndexed() and would undo the
 *     welding if run afterwards — a welded room shell went from ~4,700 to
 *     ~11,400 vertices when this was the other way round.
 *   - Weld before toCreasedNormals, because welding collapses the duplicated
 *     corner vertices every primitive emits, and only then does the crease pass
 *     have a coherent surface to decide smooth-vs-flat on. Reversed, you get
 *     faceted curves and smeared corners.
 *
 * mergeVertices compares every attribute, so vertices whose UVs differ at a
 * projection seam stay split, which is exactly what you want.
 *
 * `uv`: 'box' projects at `metresPerTile`, 'sphere' wraps a ball, and 'keep'
 * (or the older spelling 'none') leaves the UVs the pieces already carry. Use
 * 'keep' when every piece was laid out on its own before the merge: paper
 * squared to its own edges, or a book's leather offset so it is not one hide
 * running across the whole shelf. Projecting after the merge would throw that
 * layout away.
 */
export function finalize(geometry, { crease = Math.PI / 3, uv = 'box', metresPerTile = 2 } = {}) {
  let working = geometry
  if (uv === 'box') working = boxProjectUVs(working, metresPerTile)
  else if (uv === 'sphere') working = sphereProjectUVs(working)
  // Any other value would silently mean "keep", and a part whose pieces
  // carried no UVs would ship with the zeros merge() synthesises: one flat
  // texel of leather.
  else if (uv !== 'keep' && uv !== 'none') throw new Error(`finalize: unknown uv mode "${uv}"`)

  const welded = mergeVertices(working, 1e-4)

  /**
   * `crease: null` keeps the generator's own normals.
   *
   * `toCreasedNormals` re-derives every normal from scratch, and it groups
   * vertices by truncating their position onto a 1 cm grid. EDGE is 6 mm, so
   * a bevelled box's entire corner — the bevel ring plus the flat face's own
   * corner vertex — collapses into a single group, and the flat face ends up
   * with the AVERAGE of the bevel facets: a normal tilted about 36 degrees off
   * true. A wall panel is two triangles, so an 18 m plaster wall was Gouraud-
   * interpolated between four wildly wrong corner normals, giving a bright
   * pillow in the middle, dark corners, and a shading discontinuity along the
   * quad's diagonal that crossed the wall at half height. That diagonal was
   * the horizontal band.
   *
   * RoundedBoxGeometry already emits exact normals, so for anything built from
   * bevelledBox the correct crease pass is no crease pass. Lathes and sweeps
   * still need one: their generators emit fully smooth normals and the crease
   * angle is what puts a hard edge back on a plinth's arris.
   */
  if (crease === null) {
    welded.computeBoundingBox()
    welded.computeBoundingSphere()
    return welded
  }

  const creased = toCreasedNormals(welded, crease)
  creased.computeBoundingBox()
  creased.computeBoundingSphere()
  return creased
}

/** A box with rounded edges. The default building block for anything square. */
export function bevelledBox(width, height, depth, radius = EDGE, segments = 2) {
  // RoundedBoxGeometry clamps the radius itself, but a radius larger than half
  // the smallest side produces a pill rather than a box, which is never what a
  // plinth or a wall segment wants.
  const safeRadius = Math.min(radius, Math.min(width, height, depth) / 2 - 1e-4)
  return new RoundedBoxGeometry(width, height, depth, segments, Math.max(safeRadius, 1e-4))
}

/**
 * Builds a Shape from a 2D outline given as [x, y] pairs, closed automatically.
 * Used for moulding profiles: skirting, cornice, picture rail, frame sections.
 */
export function profileShape(points) {
  const shape = new Shape()
  shape.moveTo(points[0][0], points[0][1])
  for (let index = 1; index < points.length; index += 1) {
    shape.lineTo(points[index][0], points[index][1])
  }
  shape.closePath()
  return shape
}

/**
 * Sweeps a moulding profile along a straight run of `length` metres.
 *
 * The profile is authored in the XY plane (X = depth away from the wall,
 * Y = height) and extruded along Z, which is the run direction.
 */
export function sweepProfile(points, length, { bevel = 0.002 } = {}) {
  const geometry = new ExtrudeGeometry(profileShape(points), {
    depth: length,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelSegments: 2,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    curveSegments: 8,
  })
  // ExtrudeGeometry runs the extrusion along +Z from the origin; centre it so
  // callers can position by the middle of the run like every other part.
  geometry.translate(0, 0, -length / 2)
  return geometry
}

/**
 * A surface of revolution from a 2D silhouette. Trophies, cups, stanchion
 * bases, table legs, inkwells, lamp bodies.
 */
export function lathe(points, segments = 48) {
  return new LatheGeometry(
    points.map(([x, y]) => new Vector2(x, y)),
    segments,
  )
}

export { BoxGeometry, CylinderGeometry, SphereGeometry, Vector2, Vector3 }

/**
 * The outline of a rounded rectangle centred on the origin, as [x, y] pairs
 * running anticlockwise. `steps` segments per quarter-circle corner.
 */
export function roundedRectPoints(width, height, radius, steps = 3) {
  const r = Math.min(radius, width / 2 - 1e-4, height / 2 - 1e-4)
  const corners = [
    [width / 2 - r, height / 2 - r, 0],
    [-width / 2 + r, height / 2 - r, Math.PI / 2],
    [-width / 2 + r, -height / 2 + r, Math.PI],
    [width / 2 - r, -height / 2 + r, (3 * Math.PI) / 2],
  ]
  const points = []
  for (const [cx, cy, start] of corners) {
    for (let index = 0; index <= steps; index += 1) {
      const angle = start + (index / steps) * (Math.PI / 2)
      points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r])
    }
  }
  return points
}

/**
 * A flat board with rounded corners, `thickness` along Y and centred on the
 * origin: a book board, a tray, a plaque. Sixty triangles at three steps a
 * corner, against 108 for a chamfered bevelled box that still has square
 * corners in plan. Needs a real crease angle (the arcs smooth, the faces stay
 * flat).
 */
export function roundedSlab(width, depth, thickness, radius, steps = 3) {
  const slab = sweepProfile(roundedRectPoints(width, depth, radius, steps), thickness, { bevel: 0 })
  // The outline was drawn in XY and extruded along Z; lay it flat.
  slab.rotateX(-Math.PI / 2)
  return slab
}

/**
 * A crowned, optionally buttoned upholstery face in the XY plane, facing +Z,
 * with its edges at z = 0 and the crown rising to `crown` at the centre.
 *
 * A slab with a bevel reads as a slab however it is shaded; a cushion is a
 * surface that bulges between its seams and is pulled in at every button.
 * Buttons dimple the face with a Gaussian of radius `spread`; put them on grid
 * vertices (see `quiltedGridPoint`) or the dimple falls between vertices and
 * vanishes. Normals are computed here, smooth, so finish the panel with
 * `crease: null`. Triangles: columns × rows × 2.
 */
export function quiltedPanel(width, height, options = {}) {
  const { columns = 6, rows = 6 } = options
  const panel = new PlaneGeometry(width, height, columns, rows)
  const position = panel.attributes.position
  for (let index = 0; index < position.count; index += 1) {
    position.setZ(index, quiltedHeight(width, height, position.getX(index), position.getY(index), options))
  }
  panel.computeVertexNormals()
  return panel
}

/** The panel-space position of grid vertex (column, row), for buttons. */
export function quiltedGridPoint(width, height, columns, rows, column, row) {
  return [-width / 2 + (column / columns) * width, -height / 2 + (row / rows) * height]
}

/** Height of a `quiltedPanel` surface at (x, y), for seating buttons in it. */
export function quiltedHeight(
  width,
  height,
  x,
  y,
  { crown = 0.01, buttons = [], dimple = 0.012, spread = 0.03 } = {},
) {
  const across = (2 * x) / width
  const up = (2 * y) / height
  let z = crown * (1 - across * across) * (1 - up * up)
  for (const [bx, by] of buttons) {
    z -= dimple * Math.exp(-((x - bx) ** 2 + (y - by) ** 2) / (spread * spread))
  }
  return z
}

/**
 * Piping: the corded welt sewn into an upholstery seam. It is what hides the
 * line where a crowned panel meets the cushion's border, and the highlight
 * running along it is most of what tells a stitched cushion from a moulded
 * one. Smooth generator normals: finish with `crease: null`.
 * Triangles: segments × radial × 2.
 */
export function piping(points, radius, { segments = 24, radial = 3, closed = false } = {}) {
  return new TubeGeometry(
    new CatmullRomCurve3(points, closed, 'catmullrom', 0.5),
    segments,
    radius,
    radial,
    closed,
  )
}

/**
 * A domed upholstery nail head rising along +Y from y = 0: a 6 × 2
 * hemisphere, 18 triangles, against 36 for a full low sphere whose lower half
 * is buried in the leather anyway. `height` flattens the dome; real nail
 * heads stand proud by about a third of their diameter. Finish with a crease
 * wide enough to keep it round (Math.PI / 2.2), or it renders as a faceted
 * gem.
 */
export function domeStud(radius, height = radius) {
  const dome = new SphereGeometry(radius, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2)
  if (height !== radius) dome.scale(1, height / radius, 1)
  return dome
}

/**
 * One flat convex face from its corners ([x, y, z], in order round the
 * face), fan-triangulated: a quad is two triangles, a triangle one. The
 * winding follows `normal`, so corners may run either way round. `uvs`, one
 * [u, v] per corner, is optional (zeros otherwise).
 *
 * For geometry that is only ever seen from one side: a book's spine, a label,
 * a corner piece's top. A BoxGeometry spends half its twelve triangles on
 * faces against a shelf or a back panel; built face by face, nothing is drawn
 * that nobody can see.
 */
export function flatPolygon(corners, normal, uvs = null) {
  const [a, b, c] = corners
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const facing =
    (ab[1] * ac[2] - ab[2] * ac[1]) * normal[0] +
    (ab[2] * ac[0] - ab[0] * ac[2]) * normal[1] +
    (ab[0] * ac[1] - ab[1] * ac[0]) * normal[2]
  const order = []
  for (let index = 1; index < corners.length - 1; index += 1) {
    order.push(...(facing >= 0 ? [0, index, index + 1] : [0, index + 1, index]))
  }
  const position = new Float32Array(order.length * 3)
  const normals = new Float32Array(order.length * 3)
  const uv = new Float32Array(order.length * 2)
  order.forEach((corner, index) => {
    position.set(corners[corner], index * 3)
    normals.set(normal, index * 3)
    if (uvs) uv.set(uvs[corner], index * 2)
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new BufferAttribute(uv, 2))
  return geometry
}

/**
 * Slices a wall run of `length` into the solid segments left over once the
 * openings are removed.
 *
 * Door openings are cut by SEGMENTATION, not by CSG. The result is identical
 * for axis-aligned rectangular holes, costs nothing, and sidesteps the one
 * genuinely dangerous failure mode in the pipeline: three-bvh-csg's own README
 * warns that chained booleans "may not be correctly completely two-manifold",
 * and the resulting holes and shading artefacts are invisible to an agent.
 * CSG is reserved for shapes that are actually boolean.
 */
export function wallSegments(length, openings) {
  if (openings.length === 0) {
    return [{ centre: 0, length, full: true }]
  }

  const half = length / 2
  const sorted = openings
    .map((opening) => ({
      start: Math.max(-half, opening.centre - opening.width / 2),
      end: Math.min(half, opening.centre + opening.width / 2),
      height: opening.height,
    }))
    .filter((opening) => opening.end > opening.start)
    .sort((a, b) => a.start - b.start)

  const segments = []
  let cursor = -half

  for (const opening of sorted) {
    if (opening.start > cursor) {
      const width = opening.start - cursor
      segments.push({ centre: cursor + width / 2, length: width, full: true })
    }
    cursor = Math.max(cursor, opening.end)
  }

  if (cursor < half) {
    const width = half - cursor
    segments.push({ centre: cursor + width / 2, length: width, full: true })
  }

  // The header above each opening: still solid wall, just shorter.
  for (const opening of sorted) {
    segments.push({
      centre: (opening.start + opening.end) / 2,
      length: opening.end - opening.start,
      full: false,
      openingHeight: opening.height,
    })
  }

  return segments
}

/** Merges a list of geometries, tolerating an empty or single-item list. */
export function merge(geometries) {
  const usable = geometries.filter(Boolean)
  if (usable.length === 0) return null
  if (usable.length === 1) return usable[0]

  // mergeGeometries returns null on ANY attribute mismatch, which is a silent
  // failure that would ship an empty room. Normalise every input down to the
  // same three attributes first, synthesising a zero UV set where a primitive
  // did not emit one.
  const normalised = usable.map((geometry) => {
    // toNonIndexed() warns loudly when the geometry already is non-indexed, and
    // most primitives in this kit are. Guard rather than drown the bake log.
    const source = geometry.clone()
    const clone = source.index ? source.toNonIndexed() : source

    for (const name of Object.keys(clone.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') {
        clone.deleteAttribute(name)
      }
    }

    if (!clone.attributes.normal) clone.computeVertexNormals()
    if (!clone.attributes.uv) {
      const count = clone.attributes.position.count
      clone.setAttribute('uv', new BufferAttribute(new Float32Array(count * 2), 2))
    }

    return clone
  })

  const merged = mergeGeometries(normalised, false)
  if (!merged) {
    throw new Error('mergeGeometries returned null — attribute sets do not match.')
  }
  return merged
}

/**
 * Assigns UVs by box projection: for each triangle, pick the dominant axis of
 * its face normal and project the vertex positions onto the other two.
 *
 * This is the right answer for procedural architecture. Hand-authoring a UV
 * layout is exactly the kind of artist work an agent cannot do, and the usual
 * alternative — triplanar mapping in the shader — costs three texture fetches
 * per pixel. Box projection at bake time is free at runtime and produces
 * correct, consistent texel density on every axis-aligned surface, which is
 * what a museum is made of.
 *
 * `metresPerTile` sets the world size of one texture repeat, so texel density
 * is uniform across parts regardless of how big they are.
 */
export function boxProjectUVs(geometry, metresPerTile = 2.0) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry
  const position = source.attributes.position
  const count = position.count
  const uv = new Float32Array(count * 2)
  const scale = 1 / metresPerTile

  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const ab = new Vector3()
  const ac = new Vector3()
  const faceNormal = new Vector3()

  for (let index = 0; index < count; index += 3) {
    a.fromBufferAttribute(position, index)
    b.fromBufferAttribute(position, index + 1)
    c.fromBufferAttribute(position, index + 2)

    ab.subVectors(b, a)
    ac.subVectors(c, a)
    faceNormal.crossVectors(ab, ac)

    const absX = Math.abs(faceNormal.x)
    const absY = Math.abs(faceNormal.y)
    const absZ = Math.abs(faceNormal.z)

    // Project onto the plane the face most faces. Flipping u by the normal's
    // sign keeps the texture from mirroring on opposing faces.
    let axisU
    let axisV
    let flip
    if (absY >= absX && absY >= absZ) {
      axisU = 'x'
      axisV = 'z'
      flip = faceNormal.y < 0 ? -1 : 1
    } else if (absX >= absZ) {
      axisU = 'z'
      axisV = 'y'
      flip = faceNormal.x < 0 ? -1 : 1
    } else {
      axisU = 'x'
      axisV = 'y'
      flip = faceNormal.z < 0 ? -1 : 1
    }

    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = corner === 0 ? a : corner === 1 ? b : c
      uv[(index + corner) * 2] = vertex[axisU] * scale * flip
      uv[(index + corner) * 2 + 1] = vertex[axisV] * scale
    }
  }

  source.setAttribute('uv', new BufferAttribute(uv, 2))
  return source
}

/**
 * Spherical UVs, for the one object that genuinely needs them: box projection
 * on a ball produces three visible seams where the projection axis flips.
 */
export function sphereProjectUVs(geometry) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry
  const position = source.attributes.position
  const count = position.count
  const uv = new Float32Array(count * 2)
  const vertex = new Vector3()

  for (let index = 0; index < count; index += 1) {
    vertex.fromBufferAttribute(position, index)
    const length = vertex.length() || 1
    uv[index * 2] = 0.5 + Math.atan2(vertex.z, vertex.x) / (2 * Math.PI)
    uv[index * 2 + 1] = 0.5 - Math.asin(vertex.y / length) / Math.PI
  }

  // A non-indexed triangle can straddle the 0/1 meridian. Interpolating 0.99
  // to 0.01 walks through the entire map and previously stretched every panel
  // colour and pore into a long wedge across historical balls. Move the high-U
  // corners into the adjacent repeat; RepeatWrapping makes the sampled image
  // identical while interpolation now follows the short path across the seam.
  for (let index = 0; index < count; index += 3) {
    const u0 = uv[index * 2]
    const u1 = uv[(index + 1) * 2]
    const u2 = uv[(index + 2) * 2]
    if (Math.max(u0, u1, u2) - Math.min(u0, u1, u2) <= 0.5) continue

    for (let corner = 0; corner < 3; corner += 1) {
      const offset = (index + corner) * 2
      if (uv[offset] > 0.5) uv[offset] -= 1
    }
  }

  source.setAttribute('uv', new BufferAttribute(uv, 2))
  return source
}

/** World-space bounding box of a geometry, as plain arrays for the manifest. */
export function boundsOf(geometry) {
  const box = new Box3().setFromBufferAttribute(geometry.attributes.position)
  const size = box.getSize(new Vector3())
  const centre = box.getCenter(new Vector3())
  return {
    min: [round(box.min.x), round(box.min.y), round(box.min.z)],
    max: [round(box.max.x), round(box.max.y), round(box.max.z)],
    size: [round(size.x), round(size.y), round(size.z)],
    centre: [round(centre.x), round(centre.y), round(centre.z)],
  }
}

export function triangleCount(geometry) {
  return geometry.index
    ? geometry.index.count / 3
    : geometry.attributes.position.count / 3
}

function round(value) {
  return Number(value.toFixed(4))
}
