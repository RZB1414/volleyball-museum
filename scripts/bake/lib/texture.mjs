/**
 * Procedural texture generation.
 *
 * Textures are where "agent-made" most obviously reads as programmer art, and
 * the fix is not more geometry — it is a height function with three or four
 * octaves and a normal map derived from it. Everything here is authored as a
 * scalar height field h(u,v); albedo, normal and roughness all fall out of it,
 * which is what makes the result cohere instead of looking like three unrelated
 * images stacked on one surface.
 *
 * All noise is TILEABLE. A texture that seams is worse than no texture at all
 * on a museum floor, and the fix is cheap: sample 4D simplex on the surface of
 * a torus, so u and v wrap by construction.
 *
 * Everything runs at build time. Runtime canvas generation would cost CPU on
 * every page load, cannot be compressed, and cannot be cached by the CDN.
 */

import { createNoise4D } from 'simplex-noise'
import sharp from 'sharp'

/**
 * Deterministic PRNG so a re-bake produces byte-identical output. Exported
 * for the generators that jitter a layout (the bookcases), which need the
 * same guarantee: a constant seed per variant, never `Math.random`.
 */
export function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Tileable 2D noise, built by walking a torus in 4D. Sampling plain 2D noise
 * and hoping the edges match is the single most common way procedural textures
 * seam.
 */
export function tileableNoise(seed) {
  const noise4D = createNoise4D(mulberry32(seed))

  /**
   * `aspect` stretches the pattern along V while keeping it periodic.
   *
   * The obvious way to stretch noise is to scale the coordinate — `noise(u, v *
   * 0.35)` — and that is exactly what breaks the tile, because the V circle is
   * then walked over 35% of a turn and its two ends are unrelated samples. The
   * plaster did this, and the resulting hard step at v = 0 was the single
   * strongest edge in the map: 8/255 on a texture whose entire range is 19/255,
   * stamped across every wall in the building on a 3 m grid. Scaling the
   * torus RADIUS instead stretches the same closed loop.
   */
  return (u, v, frequency, aspect = 1) => {
    const radiusU = frequency / (2 * Math.PI)
    const radiusV = (frequency * aspect) / (2 * Math.PI)
    return noise4D(
      Math.cos(u * 2 * Math.PI) * radiusU,
      Math.sin(u * 2 * Math.PI) * radiusU,
      Math.cos(v * 2 * Math.PI) * radiusV,
      Math.sin(v * 2 * Math.PI) * radiusV,
    )
  }
}

/** Fractal Brownian motion over a tileable noise source. */
export function fbm(
  noise,
  u,
  v,
  { octaves = 4, frequency = 4, lacunarity = 2.03, gain = 0.5, aspect = 1 } = {},
) {
  let total = 0
  let amplitude = 1
  let normalisation = 0
  let currentFrequency = frequency

  for (let octave = 0; octave < octaves; octave += 1) {
    total += amplitude * noise(u, v, currentFrequency, aspect)
    normalisation += amplitude
    amplitude *= gain
    currentFrequency *= lacunarity
  }

  return total / normalisation
}

/**
 * Tileable Worley / cellular noise. Returns the distance to the nearest feature
 * point, normalised. This is what makes leather, concrete, grout and pitted
 * iron read as a material rather than as noise.
 */
export function makeWorley(seed, cells) {
  const random = mulberry32(seed)
  // Flat arrays indexed by cell, not an array of pairs: the inner loop below is
  // the hottest code in the whole bake and pair allocation shows up in it.
  const pointX = new Float64Array(cells * cells)
  const pointY = new Float64Array(cells * cells)
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      pointX[y * cells + x] = (x + random()) / cells
      pointY[y * cells + x] = (y + random()) / cells
    }
  }

  /**
   * Search the 5x5 cell neighbourhood, not all of them.
   *
   * There is exactly one point per cell, so the nearest is always inside the
   * 3x3 neighbourhood and the second nearest inside 5x5 — the extra ring is
   * cheap insurance against a jitter that pushes both candidates to the far
   * corner of their cells.
   *
   * This used to scan every point for every pixel. At 52 cells and a 1024px
   * map that is 2,704 distance tests per texel, 2.8 billion for one channel,
   * and it made the leather the whole cost of the bake: fifteen minutes per
   * iteration, every iteration, no matter what had actually changed. Twenty-five
   * tests give the same answer about a hundred times faster.
   */
  const RADIUS = 2

  return (u, v) => {
    let nearest = Infinity
    let second = Infinity

    const baseX = Math.floor(u * cells)
    const baseY = Math.floor(v * cells)

    for (let oy = -RADIUS; oy <= RADIUS; oy += 1) {
      // Wrap the cell index, so the field still tiles.
      const cy = (((baseY + oy) % cells) + cells) % cells
      for (let ox = -RADIUS; ox <= RADIUS; ox += 1) {
        const cx = (((baseX + ox) % cells) + cells) % cells
        const index = cy * cells + cx

        // Wrap on both axes so the field tiles.
        let dx = Math.abs(u - pointX[index])
        let dy = Math.abs(v - pointY[index])
        if (dx > 0.5) dx = 1 - dx
        if (dy > 0.5) dy = 1 - dy
        const distance = Math.hypot(dx, dy)

        if (distance < nearest) {
          second = nearest
          nearest = distance
        } else if (distance < second) {
          second = distance
        }
      }
    }

    return { nearest: nearest * cells, second: second * cells }
  }
}

export function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

export function mix(a, b, t) {
  return a + (b - a) * t
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Mixes two [r,g,b] triples given in 0..1. */
export function mixColor(a, b, t) {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
}

/**
 * Derives a tangent-space normal map from a height field by central
 * differences, wrapping at the edges so the normal map tiles exactly as the
 * height does.
 *
 * n = normalize(-dh/du * strength, -dh/dv * strength, 1), remapped to 0..255.
 */
function heightToNormal(height, size, strength) {
  const out = Buffer.alloc(size * size * 3)

  for (let y = 0; y < size; y += 1) {
    const yUp = ((y - 1) + size) % size
    const yDown = (y + 1) % size

    for (let x = 0; x < size; x += 1) {
      const xLeft = ((x - 1) + size) % size
      const xRight = (x + 1) % size

      const dx = height[y * size + xRight] - height[y * size + xLeft]
      const dy = height[yDown * size + x] - height[yUp * size + x]

      let nx = -dx * strength
      let ny = -dy * strength
      const nz = 1
      const length = Math.hypot(nx, ny, nz)
      nx /= length
      ny /= length
      const nzn = nz / length

      const index = (y * size + x) * 3
      out[index] = Math.round((nx * 0.5 + 0.5) * 255)
      // glTF expects OpenGL-convention normal maps (+Y up).
      out[index + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      out[index + 2] = Math.round((nzn * 0.5 + 0.5) * 255)
    }
  }

  return out
}

/**
 * @typedef {object} MaterialRecipe
 * @property {string} id
 * @property {number} albedoSize
 * @property {number} [normalSize]   Defaults to albedoSize / 2.
 * @property {number} [ormSize]      Defaults to 512.
 * @property {number} [normalStrength]
 * @property {(u:number, v:number) => number} height      Returns 0..1.
 * @property {(u:number, v:number, h:number) => number[]} albedo  Returns [r,g,b] in 0..1.
 * @property {(u:number, v:number, h:number) => number} roughness Returns 0..1.
 * @property {number} [metalness]
 * @property {(u:number, v:number, h:number) => number} [ao]
 */

/** Samples a scalar field into a Float32Array at the given resolution. */
function sampleField(size, fn) {
  const field = new Float32Array(size * size)
  for (let y = 0; y < size; y += 1) {
    const v = y / size
    for (let x = 0; x < size; x += 1) {
      field[y * size + x] = fn(x / size, v)
    }
  }
  return field
}

/**
 * Renders one material to three WebP files and returns their metadata.
 *
 * Colour-space discipline matters and is easy to get wrong: albedo is sRGB,
 * while normal and ORM are DATA and must stay linear. Encoding an ORM map as
 * sRGB gamma-shifts every roughness value and produces lighting that is subtly
 * wrong in a way that is very hard to trace back.
 */
export async function renderMaterial(recipe, outDir, writeFile) {
  const {
    id,
    albedoSize,
    normalSize = Math.max(256, albedoSize / 2),
    ormSize = 512,
    normalStrength = 2.2,
    height,
    albedo,
    roughness,
    metalness = 0,
    ao,
  } = recipe

  // --- albedo -------------------------------------------------------------
  const albedoHeight = sampleField(albedoSize, height)
  const albedoBuffer = Buffer.alloc(albedoSize * albedoSize * 3)
  for (let y = 0; y < albedoSize; y += 1) {
    const v = y / albedoSize
    for (let x = 0; x < albedoSize; x += 1) {
      const u = x / albedoSize
      const h = albedoHeight[y * albedoSize + x]
      const [r, g, b] = albedo(u, v, h)
      const index = (y * albedoSize + x) * 3
      albedoBuffer[index] = Math.round(clamp01(r) * 255)
      albedoBuffer[index + 1] = Math.round(clamp01(g) * 255)
      albedoBuffer[index + 2] = Math.round(clamp01(b) * 255)
    }
  }

  // --- normal, from an independently sampled height field ------------------
  const normalHeight = sampleField(normalSize, height)
  const normalBuffer = heightToNormal(normalHeight, normalSize, normalStrength * (normalSize / 512))

  // --- ORM: occlusion in R, roughness in G, metalness in B -----------------
  const ormHeight = sampleField(ormSize, height)
  const ormBuffer = Buffer.alloc(ormSize * ormSize * 3)
  for (let y = 0; y < ormSize; y += 1) {
    const v = y / ormSize
    for (let x = 0; x < ormSize; x += 1) {
      const u = x / ormSize
      const h = ormHeight[y * ormSize + x]
      const index = (y * ormSize + x) * 3
      // Cheap cavity AO: low points in the height field are occluded.
      ormBuffer[index] = Math.round(clamp01(ao ? ao(u, v, h) : 0.55 + h * 0.45) * 255)
      ormBuffer[index + 1] = Math.round(clamp01(roughness(u, v, h)) * 255)
      ormBuffer[index + 2] = Math.round(clamp01(metalness) * 255)
    }
  }

  const encode = (buffer, size, quality) =>
    sharp(buffer, { raw: { width: size, height: size, channels: 3 } })
      .webp({ quality, effort: 5 })
      .toBuffer()

  const [albedoWebp, normalWebp, ormWebp] = await Promise.all([
    encode(albedoBuffer, albedoSize, 88),
    // Normal maps carry geometry, not colour — lossy artefacts here read as
    // shimmering across a whole surface, so they get a higher quality budget.
    encode(normalBuffer, normalSize, 94),
    encode(ormBuffer, ormSize, 88),
  ])

  const written = await Promise.all([
    writeFile(outDir, `${id}-albedo`, albedoWebp),
    writeFile(outDir, `${id}-normal`, normalWebp),
    writeFile(outDir, `${id}-orm`, ormWebp),
  ])

  return {
    id,
    albedo: { src: written[0].src, size: albedoSize, bytes: albedoWebp.byteLength },
    normal: { src: written[1].src, size: normalSize, bytes: normalWebp.byteLength },
    orm: { src: written[2].src, size: ormSize, bytes: ormWebp.byteLength },
  }
}

/**
 * Uncompressed VRAM cost of a texture including the full mip chain (x4/3).
 * WebP is a wire format — the GPU stores RGBA8 either way, so the download size
 * says nothing about whether a phone can hold it.
 */
export function vramBytes(size) {
  return size * size * 4 * (4 / 3)
}
