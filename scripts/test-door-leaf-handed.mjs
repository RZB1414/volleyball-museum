/** Geometry-level smoke test for handed door leaves; does not require a bake. */

import assert from 'node:assert/strict'

import { Vector3 } from 'three'

import { buildDoorLeaf } from './bake/parts/openings.mjs'

const EPSILON = 1e-6

function closeTo(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `${message}: expected ${expected}, got ${actual}`,
  )
}

function triangleCount(geometry) {
  return geometry.index ? geometry.index.count / 3 : geometry.getAttribute('position').count / 3
}

/**
 * A negative determinant with unchanged indices makes these dots negative.
 * Checking every face against its authored vertex normals catches exactly the
 * mirrored-winding failure that a runtime `scale.x = -1` would introduce.
 */
function assertWindingMatchesNormals(name, geometry) {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  assert.ok(position && normal, `${name} must contain positions and normals`)

  const index = geometry.index
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const edgeA = new Vector3()
  const edgeB = new Vector3()
  const faceNormal = new Vector3()
  const vertexNormal = new Vector3()
  let triangles = 0

  const vertexAt = (corner) => (index ? index.getX(corner) : corner)
  const corners = index ? index.count : position.count

  for (let corner = 0; corner < corners; corner += 3) {
    const ai = vertexAt(corner)
    const bi = vertexAt(corner + 1)
    const ci = vertexAt(corner + 2)
    a.fromBufferAttribute(position, ai)
    b.fromBufferAttribute(position, bi)
    c.fromBufferAttribute(position, ci)
    edgeA.subVectors(b, a)
    edgeB.subVectors(c, a)
    faceNormal.crossVectors(edgeA, edgeB)
    if (faceNormal.lengthSq() <= 1e-16) continue
    faceNormal.normalize()

    vertexNormal
      .fromBufferAttribute(normal, ai)
      .add(new Vector3().fromBufferAttribute(normal, bi))
      .add(new Vector3().fromBufferAttribute(normal, ci))
    if (vertexNormal.lengthSq() <= 1e-16) continue
    vertexNormal.normalize()

    assert.ok(
      faceNormal.dot(vertexNormal) > 0,
      `${name} triangle ${corner / 3} has winding opposite to its normal`,
    )
    triangles += 1
  }

  assert.ok(triangles > 0, `${name} must contain non-degenerate triangles`)
}

const left = buildDoorLeaf()
const right = buildDoorLeaf({ handed: 'right' })

for (const geometry of [left.leaf, left.furniture, right.leaf, right.furniture]) {
  geometry.computeBoundingBox()
}

closeTo(left.leaf.boundingBox.min.x, 0, 'left hinge datum')
closeTo(left.leaf.boundingBox.max.x, 0.8, 'left lock edge')
closeTo(right.leaf.boundingBox.max.x, 0, 'right hinge datum')
closeTo(right.leaf.boundingBox.min.x, -0.8, 'right lock edge')

for (const part of ['leaf', 'furniture']) {
  assert.equal(
    triangleCount(right[part]),
    triangleCount(left[part]),
    `${part} variants must retain the same triangle budget`,
  )
  closeTo(
    right[part].boundingBox.min.x,
    -left[part].boundingBox.max.x,
    `${part} mirrored minimum`,
  )
  closeTo(
    right[part].boundingBox.max.x,
    -left[part].boundingBox.min.x,
    `${part} mirrored maximum`,
  )
  assertWindingMatchesNormals(`door-leaf ${part}`, left[part])
  assertWindingMatchesNormals(`door-leaf-right ${part}`, right[part])
}

assert.throws(() => buildDoorLeaf({ handed: 'up' }), RangeError)

console.log(
  'Door leaf handed smoke passed:',
  `left [${left.leaf.boundingBox.min.x.toFixed(3)}, ${left.leaf.boundingBox.max.x.toFixed(3)}]`,
  `right [${right.leaf.boundingBox.min.x.toFixed(3)}, ${right.leaf.boundingBox.max.x.toFixed(3)}]`,
)
