/**
 * Material recipes for the Holyoke wing.
 *
 * Palette taken from the era research: gaslit amber and tanned leather. Honey
 * maple #B5793C, russet harness leather #C9A06A ageing to walnut #8B5A2B, ecru
 * hemp and canvas #D9CBA8, Prussian navy #1F2A44, oxidised iron #4A4640. Almost
 * no saturated blue or green, and absolutely no white plastic — every colour is
 * a pigment, a dye or an oxide.
 *
 * Texture budget. WebP is only the wire format; the GPU holds RGBA8 either way,
 * so what matters is resolution. Uncompressed VRAM with mips, at these sizes:
 *
 *   maple-floor    1024 + 512 + 512  =  8.0 MB
 *   plaster        1024 + 512 + 512  =  8.0 MB
 *   oak-matte       512 + 512 + 512  =  4.0 MB
 *   leather-tan    1024 + 1024 + 512 = 12.0 MB
 *   canvas          512 + 512 + 512  =  4.0 MB
 *                                     -------
 *                                      36.0 MB   (mobile ceiling: 45 MB)
 *
 * That fits, but with little headroom for five more wings. KTX2/ETC1S would cut
 * it roughly 8x; it is deferred because the Basis transcoder is a fixed ~260 KB
 * gzip and needs the KTX-Software binary in the build environment.
 */

import { clamp01, fbm, makeWorley, mix, mixColor, smoothstep, tileableNoise } from './lib/texture.mjs'

const hex = (value) => [
  ((value >> 16) & 255) / 255,
  ((value >> 8) & 255) / 255,
  (value & 255) / 255,
]

// Era palette.
const MAPLE_LIGHT = hex(0xc08a4a)
const MAPLE_DARK = hex(0x8a5a28)
const PLASTER_LIGHT = hex(0xd8d2c4)
const PLASTER_SHADE = hex(0xb9b2a2)
const OAK_LIGHT = hex(0x7a5228)
const OAK_DARK = hex(0x452b13)
const LEATHER_LIGHT = hex(0xd6a874)
const LEATHER_DARK = hex(0x8b5a2b)
const CANVAS_LIGHT = hex(0xd9cba8)
const CANVAS_SHADE = hex(0xb5a683)

/**
 * Plain-sawn wood grain.
 *
 * The first version of this produced straight vertical stripes, because it band
 * ed on the raw coordinate: `(u * rings) % 1`. Real boards do not look like
 * that. Growth rings are concentric around the pith, and a board cut off-centre
 * from the log slices through those cones at a shallow angle, which is what
 * produces the cathedral arches you actually recognise as wood.
 *
 * So: place a virtual pith OUTSIDE the board, ring on the distance to it, and
 * domain-warp that distance with low-frequency noise so the arches wander
 * instead of nesting perfectly. Then add fine fibre noise stretched hard along
 * the grain direction.
 *
 * `along` runs down the length of the board, `across` its width. Callers must
 * pass them the right way round — grain running across a floorboard is the
 * single most obvious tell that a wood texture was generated rather than
 * photographed.
 */
function woodGrain(noise, along, across, { rings = 9, wobble = 0.35, pithOffset = 1.6 } = {}) {
  /**
   * Everything here has to close the loop in BOTH axes.
   *
   * Scaling a coordinate (`along * 0.35`, `across * 9`) is the intuitive way to
   * stretch a pattern and it is exactly what stops it tiling — the torus is
   * then walked over a fraction of a turn. `frequency` plus `aspect` gets the
   * same anisotropy out of a closed loop. Measured on the shipped maps before
   * this change: oak's U seam was 13.83/255 on the normal against a 1.35
   * interior control, which is the blotchy break you could see running down
   * every piece of joinery in the building.
   */
  const warp =
    fbm(noise, along, across, { octaves: 3, frequency: 0.77, aspect: 2.86 }) * wobble

  /**
   * Pith sits off the edge of the board, so the rings arrive as long shallow
   * arcs rather than as circles.
   *
   * `dy` must be PERIODIC in `along`. It used to be `(along - 0.5) * 0.42`, a
   * straight ramp: at along = 0 it is -0.21 and at along = 1 it is +0.21, so
   * the ring radius jumped at the tile edge and split the grain. A sine of the
   * same amplitude draws the same arcs and returns to where it started.
   */
  const dx = across + pithOffset + warp
  const dy = Math.sin(along * Math.PI * 2) * 0.21
  const distance = Math.hypot(dx, dy)

  const ringValue = ((distance * rings) % 1 + 1) % 1
  // Hard early wood into soft late wood — an asymmetric ramp, not a sine.
  const band = smoothstep(0.0, 0.28, ringValue) * (1 - smoothstep(0.42, 0.92, ringValue))

  // Fibre: heavily anisotropic, this is the fine streaking within each ring.
  const fibre = fbm(noise, along, across, { octaves: 4, frequency: 14, aspect: 9 }) * 0.5 + 0.5

  // Occasional knot. Sparse enough to be a surprise, not a pattern.
  const knotField = fbm(noise, along, across, { octaves: 2, frequency: 2.1 })
  const knot = smoothstep(0.62, 0.86, knotField)

  return clamp01(band * 0.62 + fibre * 0.28 + knot * 0.35)
}

export function buildMaterialRecipes() {
  const recipes = []

  // -------------------------------------------------------------------------
  // Maple parquet floor. The most-looked-at surface in the building.
  // -------------------------------------------------------------------------
  {
    const noise = tileableNoise(1001)

    // Board proportions, at metresPerTile = 2.4 (set in kit.mjs):
    //   width  2.4 / 20 = 120 mm   (a normal strip floor board)
    //   length 2.4 / 2  = 1.2 m
    //
    // The first attempt used 6 rows of 3, which is a 0.8 x 0.4 m board — that
    // is a paving slab, and the contact sheet duly rendered a brick wall.
    const boardsAcross = 20
    const boardsAlong = 2
    const boardLength = 1 / boardsAlong

    // Which board a point belongs to. Every board gets its own grain phase and
    // its own tone; a floor where all the boards match reads as wallpaper.
    const plankAt = (u, v) => {
      const row = Math.floor(v * boardsAcross)
      // Running bond: alternate rows shift by half a board so the butt joints
      // never line up into a visible grid.
      const offset = (row % 2) * boardLength * 0.5
      const along = (((u + offset) % 1) + 1) % 1
      const index = Math.floor(along / boardLength)
      const localAlong = (along % boardLength) / boardLength
      const localAcross = v * boardsAcross - row
      return {
        row,
        index,
        localAlong,
        localAcross,
        seedPhase: ((row * 7 + index * 13) % 17) / 17,
      }
    }

    const gap = (localAlong, localAcross) => {
      const edgeAlong = Math.min(localAlong, 1 - localAlong)
      const edgeAcross = Math.min(localAcross, 1 - localAcross)
      // ~1.5 mm shadow gap. In local board space that is 1.5/1200 along the
      // length and 1.5/120 across the width — very different numbers, which is
      // why the two axes get different smoothstep widths. Using one value for
      // both is what made the joints read as mortar.
      return Math.min(
        smoothstep(0, 0.0022, edgeAlong),
        smoothstep(0, 0.022, edgeAcross),
      )
    }

    const heightAt = (u, v) => {
      const plank = plankAt(u, v)
      // Grain runs ALONG the board: localAlong is the length axis.
      const grain = woodGrain(noise, plank.localAlong + plank.seedPhase * 3, plank.localAcross, {
        rings: 7,
        wobble: 0.3,
        pithOffset: 1.1 + plank.seedPhase,
      })
      const seam = gap(plank.localAlong, plank.localAcross)
      // Slight cupping across the width, as boards dry.
      const cup = 1 - Math.abs(plank.localAcross - 0.5) * 0.22
      return (0.55 + grain * 0.45) * cup * mix(0.4, 1, seam)
    }

    recipes.push({
      id: 'maple-floor',
      albedoSize: 1024,
      normalSize: 512,
      ormSize: 512,
      normalStrength: 3.4,
      height: heightAt,
      albedo: (u, v, h) => {
        const plank = plankAt(u, v)
        // Per-board tonal variation, deterministic from the board index.
        const boardTone = ((plank.seedPhase * 2654435761) % 1000) / 1000
        const base = mixColor(MAPLE_DARK, MAPLE_LIGHT, 0.35 + boardTone * 0.5)
        const grained = mixColor(base, MAPLE_LIGHT, h * 0.55)
        const seam = gap(plank.localAlong, plank.localAcross)
        // The gap is a shadow, not a colour: nearly black, and very narrow.
        return mixColor([0.05, 0.035, 0.02], grained, mix(0.15, 1, seam))
      },
      roughness: (u, v, h) => {
        const plank = plankAt(u, v)
        const seam = gap(plank.localAlong, plank.localAcross)
        // Varnished, so fairly smooth, but worn along the traffic axis.
        const wear = fbm(noise, u, v, { octaves: 3, frequency: 2.5 }) * 0.5 + 0.5
        return mix(0.92, mix(0.34, 0.52, wear) - h * 0.08, seam)
      },
      ao: (u, v, h) => {
        const plank = plankAt(u, v)
        return mix(0.25, 0.6 + h * 0.4, gap(plank.localAlong, plank.localAcross))
      },
    })
  }

  // -------------------------------------------------------------------------
  // Painted plaster wall. Almost flat on purpose: the interest is in the
  // lighting, not the wall.
  // -------------------------------------------------------------------------
  {
    const noise = tileableNoise(2002)
    const heightAt = (u, v) => {
      const broad = fbm(noise, u, v, { octaves: 3, frequency: 3 }) * 0.5 + 0.5
      const tooth = fbm(noise, u, v, { octaves: 3, frequency: 42 }) * 0.5 + 0.5
      // Faint trowel sweeps, long and shallow.
      //
      // The coefficients must be WHOLE NUMBERS. At 2.3 and 0.7 the sine is
      // periodic in neither axis, so it left a 0.3-turn phase jump at the tile
      // edge — and because this feeds the height field it seamed the normal,
      // the roughness and the occlusion at the same time.
      const trowel = Math.sin((u * 2 + v * 1) * Math.PI * 2 + broad * 3) * 0.5 + 0.5
      return broad * 0.45 + tooth * 0.35 + trowel * 0.2
    }

    recipes.push({
      id: 'plaster',
      albedoSize: 1024,
      normalSize: 512,
      ormSize: 512,
      normalStrength: 1.1,
      height: heightAt,
      albedo: (u, v, h) => {
        // Stretched, but still a closed loop — see `aspect` in tileableNoise.
        // This used to be `v * 0.35`, which is the same look and does not tile.
        const soil = fbm(noise, u, v, { octaves: 3, frequency: 2, aspect: 0.35 }) * 0.5 + 0.5

        /**
         * Patchy soiling, not a height gradient.
         *
         * The old term was `smoothstep(0.55, 1, 1 - v)`: a ramp in V, which
         * cannot tile by construction — it is 0.14 at one edge of the texture
         * and 0 at the other, so every repeat had a hard line across it. Wear
         * that depends on how high up a WALL you are is a property of the room,
         * not of the material, and belongs to lighting rather than to albedo.
         */
        const dirt = smoothstep(0.42, 0.86, soil) * 0.20

        // Widen the tonal range. The old ramp spanned 0.35..1.0 of a shade pair
        // only 19/255 apart, so the whole material was one flat grey and every
        // bit of the trowel and tooth detail was invisible.
        const value = smoothstep(0.05, 0.95, h)
        return mixColor(
          mixColor(PLASTER_SHADE, PLASTER_LIGHT, 0.08 + value * 0.92),
          [0.35, 0.30, 0.24],
          dirt,
        )
      },
      roughness: (_u, _v, h) => 0.82 + h * 0.16,
      ao: (_u, _v, h) => 0.58 + h * 0.42,
    })
  }

  // -------------------------------------------------------------------------
  // Oak joinery — skirting, cornice, plinths, frames.
  // -------------------------------------------------------------------------
  {
    const noise = tileableNoise(3003)
    const heightAt = (u, v) => woodGrain(noise, u, v, { rings: 11, wobble: 0.5, pithOffset: 0.9 })

    recipes.push({
      id: 'oak-matte',
      albedoSize: 512,
      normalSize: 512,
      ormSize: 512,
      normalStrength: 2.6,
      height: heightAt,
      albedo: (_u, _v, h) => mixColor(OAK_DARK, OAK_LIGHT, 0.25 + h * 0.75),
      roughness: (u, v, h) => {
        const polish = fbm(noise, u, v, { octaves: 2, frequency: 1.7 }) * 0.5 + 0.5
        return mix(0.44, 0.72, polish) - h * 0.1
      },
      ao: (_u, _v, h) => 0.6 + h * 0.4,
    })
  }

  // -------------------------------------------------------------------------
  // Tanned leather — the hero ball. Worley cells give the pebble grain that
  // makes leather read as leather.
  // -------------------------------------------------------------------------
  {
    const noise = tileableNoise(4004)
    // Cell counts are a compression decision as much as an art one. The ball
    // uses spherical UVs, so one tile wraps the whole 0.65 m circumference:
    // 26 coarse cells is roughly 40 pebbles per metre, which reads correctly at
    // the arm's length the examine view puts you at. Pushing to 78 fine cells
    // produced near-Nyquist detail that nobody could resolve and inflated the
    // material from ~150 KB to 540 KB, more than all the geometry combined.
    const worleyCoarse = makeWorley(4004, 26)
    const worleyFine = makeWorley(4104, 52)

    const heightAt = (u, v) => {
      const coarse = worleyCoarse(u, v)
      const fine = worleyFine(u, v)
      // The ridge between cells is what you actually see on grained leather.
      const pebble = smoothstep(0.05, 0.55, coarse.second - coarse.nearest)
      const micro = smoothstep(0.0, 0.7, fine.second - fine.nearest)
      const creases = fbm(noise, u, v, { octaves: 4, frequency: 7 }) * 0.5 + 0.5
      return pebble * 0.55 + micro * 0.2 + creases * 0.25
    }

    recipes.push({
      id: 'leather-tan',
      albedoSize: 1024,
      normalSize: 1024,
      ormSize: 512,
      normalStrength: 2.9,
      height: heightAt,
      albedo: (u, v, h) => {
        // Handling darkens the high points; a century in a case fades the rest.
        const patina = fbm(noise, u * 0.7, v * 0.7, { octaves: 3, frequency: 2.2 }) * 0.5 + 0.5
        const base = mixColor(LEATHER_DARK, LEATHER_LIGHT, 0.3 + patina * 0.55)
        return mixColor(base, LEATHER_DARK, (1 - h) * 0.45)
      },
      roughness: (_u, _v, h) => 0.72 - h * 0.22,
      ao: (_u, _v, h) => 0.45 + h * 0.55,
    })
  }

  // -------------------------------------------------------------------------
  // Cotton duck canvas — net tape, gym suit, book cloth.
  // -------------------------------------------------------------------------
  {
    const noise = tileableNoise(5005)
    // 96 threads across a 512 px tile put a full weave cycle in ~5 px, which is
    // right at the limit of what the encoder can represent and cost 284 KB.
    // 44 threads at 0.35 m per tile is ~126 threads/m — coarse for real cotton
    // duck, but it is what actually resolves on screen, and it compresses.
    const threads = 44

    const heightAt = (u, v) => {
      // Plain weave: warp and weft alternate over and under.
      const warp = Math.abs(Math.sin(u * threads * Math.PI))
      const weft = Math.abs(Math.sin(v * threads * Math.PI))
      const over = ((Math.floor(u * threads) + Math.floor(v * threads)) % 2) === 0
      const weave = over ? warp : weft
      const slub = fbm(noise, u, v, { octaves: 3, frequency: 26 }) * 0.5 + 0.5
      return weave * 0.7 + slub * 0.3
    }

    recipes.push({
      id: 'canvas',
      albedoSize: 512,
      normalSize: 512,
      ormSize: 512,
      normalStrength: 2.0,
      height: heightAt,
      albedo: (u, v, h) => {
        const foxing = fbm(noise, u * 0.5, v * 0.5, { octaves: 3, frequency: 1.6 }) * 0.5 + 0.5
        const base = mixColor(CANVAS_SHADE, CANVAS_LIGHT, 0.4 + h * 0.6)
        // Age spotting, sparse and warm.
        return mixColor(base, [0.55, 0.44, 0.30], smoothstep(0.72, 1.0, foxing) * 0.35)
      },
      roughness: (_u, _v, h) => 0.9 - h * 0.06,
      ao: (_u, _v, h) => 0.55 + h * 0.45,
    })
  }

  return recipes
}
