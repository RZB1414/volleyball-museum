/**
 * Reusable historical volleyball geometry.
 *
 * All four recipes are centred at the origin and keep their complete diameter
 * near the regulation 210 mm display scale. Return keys are material families,
 * not independent placeables; an eventual bake registration must emit them as
 * `recipe` plus `recipe__key`, with every sibling sharing one transform.
 *
 * The classical balls use eighteen slightly proud spherical patches over a
 * recessed core. That extra millimetre is cheaper and more reliable than a
 * normal-map-only seam: it survives the atrium's long viewing distance and
 * still reads under the pin lights. The 2008 recipe uses eight twisted gores.
 * Its dimples deliberately remain a material-normal concern, because even a
 * sparse geometric dimple field would spend the whole prop budget without
 * changing the silhouette.
 *
 * The bake assigns one material to each returned geometry. The coloured balls
 * deliberately keep three and two siblings respectively: tinting the exact
 * panel groups avoids interpolating categorical colours across a spherical UV
 * seam, while all siblings still share one neutral texture set.
 */

import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'

import { finalize, merge } from '../lib/geometry.mjs'

const TAU = Math.PI * 2
const DEFAULT_RADIUS = 0.105
const CORE_RECESS = 0.0012
const CLASSIC_FACE_GAP = 0.018

const CUBE_FACES = [
  {
    normal: new Vector3(1, 0, 0),
    axisU: new Vector3(0, 0, -1),
    axisV: new Vector3(0, 1, 0),
    splitAxis: 'v',
  },
  {
    normal: new Vector3(-1, 0, 0),
    axisU: new Vector3(0, 0, 1),
    axisV: new Vector3(0, 1, 0),
    splitAxis: 'u',
  },
  {
    normal: new Vector3(0, 1, 0),
    axisU: new Vector3(1, 0, 0),
    axisV: new Vector3(0, 0, -1),
    splitAxis: 'u',
  },
  {
    normal: new Vector3(0, -1, 0),
    axisU: new Vector3(1, 0, 0),
    axisV: new Vector3(0, 0, 1),
    splitAxis: 'v',
  },
  {
    normal: new Vector3(0, 0, 1),
    axisU: new Vector3(1, 0, 0),
    axisV: new Vector3(0, 1, 0),
    splitAxis: 'v',
  },
  {
    normal: new Vector3(0, 0, -1),
    axisU: new Vector3(-1, 0, 0),
    axisV: new Vector3(0, 1, 0),
    splitAxis: 'u',
  },
]

function lerp(start, end, amount) {
  return start + (end - start) * amount
}

function smoothstep(edge0, edge1, value) {
  const amount = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return amount * amount * (3 - 2 * amount)
}

function innerCore(radius) {
  return new SphereGeometry(radius - CORE_RECESS, 24, 16)
}

/**
 * Finalising with the generators' radial normals avoids the crease helper's
 * one-centimetre position buckets smoothing across the deliberately recessed
 * panel gaps.
 */
function finishSpherical(parts) {
  return finalize(merge(parts), { crease: null, uv: 'sphere' })
}

function appendVertex(positions, normals, point) {
  positions.push(point.x, point.y, point.z)
  const inverseLength = 1 / (point.length() || 1)
  normals.push(
    point.x * inverseLength,
    point.y * inverseLength,
    point.z * inverseLength,
  )
}

/** Corrects winding after arbitrary parametric projection onto the sphere. */
function appendTriangle(positions, normals, first, second, third) {
  const ab = new Vector3().subVectors(second, first)
  const ac = new Vector3().subVectors(third, first)
  const outward = new Vector3().crossVectors(ab, ac).dot(first) >= 0
  const middle = outward ? second : third
  const last = outward ? third : second

  appendVertex(positions, normals, first)
  appendVertex(positions, normals, middle)
  appendVertex(positions, normals, last)
}

function sphericalPatch(pointAt, segmentsU, segmentsV) {
  const grid = []
  for (let row = 0; row <= segmentsV; row += 1) {
    for (let column = 0; column <= segmentsU; column += 1) {
      grid.push(pointAt(column / segmentsU, row / segmentsV))
    }
  }

  const positions = []
  const normals = []
  const stride = segmentsU + 1
  for (let row = 0; row < segmentsV; row += 1) {
    for (let column = 0; column < segmentsU; column += 1) {
      const lowerLeft = grid[row * stride + column]
      const lowerRight = grid[row * stride + column + 1]
      const upperLeft = grid[(row + 1) * stride + column]
      const upperRight = grid[(row + 1) * stride + column + 1]

      appendTriangle(positions, normals, lowerLeft, lowerRight, upperRight)
      appendTriangle(positions, normals, lowerLeft, upperRight, upperLeft)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  return geometry
}

function cubeSpherePoint(face, localU, localV, radius) {
  return face.normal
    .clone()
    .addScaledVector(face.axisU, localU)
    .addScaledVector(face.axisV, localV)
    .normalize()
    .multiplyScalar(radius)
}

function addToGroup(groups, key, geometry) {
  const group = groups.get(key)
  if (group) group.push(geometry)
  else groups.set(key, [geometry])
}

/**
 * Six projected cube faces give the classic six groups of three panels. The
 * alternating strip direction is what stops the result reading as a beach
 * ball with eighteen identical longitudinal gores.
 */
function classicPanelGroups(radius, colourForPanel) {
  const groups = new Map()
  const stripSpan = 2 / 3

  for (let faceIndex = 0; faceIndex < CUBE_FACES.length; faceIndex += 1) {
    const face = CUBE_FACES[faceIndex]
    for (let stripIndex = 0; stripIndex < 3; stripIndex += 1) {
      const shortStart = -1 + stripIndex * stripSpan + CLASSIC_FACE_GAP
      const shortEnd = -1 + (stripIndex + 1) * stripSpan - CLASSIC_FACE_GAP
      const shortCentre = (shortStart + shortEnd) / 2
      const longStart = -1 + CLASSIC_FACE_GAP
      const longEnd = 1 - CLASSIC_FACE_GAP

      const panel = sphericalPatch(
        (along, across) => {
          const long = lerp(longStart, longEnd, along)

          // Pulling the short edge inward only near each end approximates the
          // rounded leather-panel corners without introducing bevel geometry.
          const endDistance = Math.min(along, 1 - along)
          const cornerScale = 0.78 + 0.22 * smoothstep(0, 0.16, endDistance)
          const rawShort = lerp(shortStart, shortEnd, across)
          const short = shortCentre + (rawShort - shortCentre) * cornerScale

          const localU = face.splitAxis === 'v' ? long : short
          const localV = face.splitAxis === 'v' ? short : long
          return cubeSpherePoint(face, localU, localV, radius)
        },
        6,
        2,
      )

      addToGroup(groups, colourForPanel(faceIndex, stripIndex), panel)
    }
  }

  return groups
}

function spiralPanelGroups(radius) {
  const groups = new Map()
  const sector = TAU / 8
  const angularGap = 0.020
  const palette = ['yellow', 'blue', 'yellow', 'blue', 'yellow', 'blue', 'yellow', 'blue']

  for (let panelIndex = 0; panelIndex < 8; panelIndex += 1) {
    const panel = sphericalPatch(
      (across, along) => {
        // Keeping a minute polar cap on the recessed core avoids eight
        // coincident, zero-area triangles after quantisation.
        const latitude = lerp(-Math.PI / 2 + 0.018, Math.PI / 2 - 0.018, along)
        const twist = 0.38 * Math.sin(latitude * 2)
        const widthScale = 0.86 + 0.14 * Math.cos(latitude)
        const centre = panelIndex * sector + twist
        const longitude = centre + (across - 0.5) * (sector - angularGap) * widthScale
        const latitudeRadius = Math.cos(latitude)

        return new Vector3(
          latitudeRadius * Math.cos(longitude),
          Math.sin(latitude),
          latitudeRadius * Math.sin(longitude),
        ).multiplyScalar(radius)
      },
      3,
      12,
    )

    addToGroup(groups, palette[panelIndex], panel)
  }

  return groups
}

/**
 * Twelve longitudinal leather sections with proud outseams and a crossed lace
 * closure facing +Z. Branding belongs in the material, not in geometry, so the
 * same recipe can represent a sourced original or a clearly labelled replica.
 */
export function buildLacedLeatherVolleyball({ radius = 0.103 } = {}) {
  const leather = [new SphereGeometry(radius, 24, 16)]
  const fastenings = []
  const seamRadius = 0.0017

  for (let seamIndex = 0; seamIndex < 6; seamIndex += 1) {
    const seam = new TorusGeometry(radius + 0.0005, seamRadius, 3, 24)
    seam.rotateY((seamIndex * Math.PI) / 6)
    leather.push(seam)
  }

  const eyeletX = 0.0115
  const eyeletRows = 5
  const eyeletStep = 0.014
  const eyeletYs = []
  for (let row = 0; row < eyeletRows; row += 1) {
    const y = (row - (eyeletRows - 1) / 2) * eyeletStep
    eyeletYs.push(y)
    for (const side of [-1, 1]) {
      const x = side * eyeletX
      const surfaceZ = Math.sqrt(Math.max(0, radius ** 2 - x ** 2 - y ** 2))
      const eyelet = new TorusGeometry(0.0032, 0.0010, 3, 8)
      eyelet.translate(x, y, surfaceZ + 0.0011)
      fastenings.push(eyelet)
    }
  }

  for (let row = 0; row < eyeletYs.length - 1; row += 1) {
    for (const direction of [-1, 1]) {
      const startX = direction * eyeletX
      const endX = -direction * eyeletX
      const startY = eyeletYs[row]
      const endY = eyeletYs[row + 1]
      const deltaX = endX - startX
      const deltaY = endY - startY
      const length = Math.hypot(deltaX, deltaY)
      // Surviving rawhide closures are broad enough to remain legible against
      // the panel seams; a thread-thin cord would be both visually and
      // historically wrong.
      const lace = new CylinderGeometry(0.0020, 0.0020, length, 5)
      lace.rotateZ(-Math.atan2(deltaX, deltaY))

      const centreY = (startY + endY) / 2
      const surfaceZ = Math.sqrt(Math.max(0, radius ** 2 - centreY ** 2))
      lace.translate(0, centreY, surfaceZ + 0.003)
      fastenings.push(lace)
    }
  }

  // Surviving leather covers are never billiard-ball perfect: the bladder
  // relaxes, the laced opening stiffens one face and gravity softens the poles.
  // Apply one restrained shared deformation so seams and fastenings cannot
  // drift away from the cover.
  for (const geometry of [...leather, ...fastenings]) geometry.scale(1.015, 0.97, 1.0)

  return {
    leather: finishSpherical(leather),
    fastenings: finishSpherical(fastenings),
  }
}

/**
 * The ivory eighteen-panel ball used for the 1964 display. Its recessed core
 * supplies the seam valleys; logos remain absent so factual attribution and
 * reproduction rights cannot accidentally be baked into reusable geometry.
 */
export function buildClassicWhiteVolleyball({ radius = DEFAULT_RADIUS } = {}) {
  const panels = classicPanelGroups(radius, () => 'cover')
  return {
    cover: finishSpherical([innerCore(radius), ...panels.get('cover')]),
  }
}

/** Eighteen classical panels split evenly across white, blue and yellow. */
export function buildTricolourVolleyball1998({ radius = DEFAULT_RADIUS } = {}) {
  const facePatterns = [
    ['white', 'yellow', 'white'],
    ['blue', 'yellow', 'blue'],
  ]
  const panels = classicPanelGroups(
    radius,
    (faceIndex, stripIndex) => facePatterns[faceIndex % facePatterns.length][stripIndex],
  )

  return {
    white: finishSpherical([innerCore(radius), ...panels.get('white')]),
    blue: finishSpherical(panels.get('blue')),
    yellow: finishSpherical(panels.get('yellow')),
  }
}

/**
 * Eight S-curved panels for the dimpled 2008-era ball. The colour grouping is
 * intentionally geometry-backed so the silhouette remains legible before any
 * bespoke albedo or normal texture has loaded.
 */
export function buildEightPanelVolleyball2008({ radius = DEFAULT_RADIUS } = {}) {
  const panels = spiralPanelGroups(radius)
  return {
    // The recessed core shares the cobalt material, so seams stay visible
    // without introducing a third, historically incorrect white draw.
    blue: finishSpherical([innerCore(radius), ...panels.get('blue')]),
    yellow: finishSpherical(panels.get('yellow')),
  }
}

/** Recipe ids for an eventual explicit bake registration. */
export const HISTORICAL_VOLLEYBALL_RECIPES = Object.freeze([
  Object.freeze({ id: 'ball/leather-laced-1900', build: buildLacedLeatherVolleyball }),
  Object.freeze({ id: 'ball/classic-white-18-panel', build: buildClassicWhiteVolleyball }),
  Object.freeze({ id: 'ball/tricolour-1998', build: buildTricolourVolleyball1998 }),
  Object.freeze({ id: 'ball/eight-panel-2008', build: buildEightPanelVolleyball2008 }),
])
