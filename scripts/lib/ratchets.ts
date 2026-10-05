/**
 * Ratchets: numbers that may come down and may not go up.
 *
 * The plan budgets the museum on paper (docs/PLANO-ATE-O-FINAL.md, 4.8), and
 * the first measurement against that paper found the game well over it in
 * four places: one kit file of 2.2 MB against 800 KB, 35 shader programs
 * against 25, 107 MiB of resident texture against 45, 128 draws with a door
 * open against 100. Those are paid by named lots (L5 to L7, L17). Until
 * then the danger is the opposite of a budget: with the ceiling already
 * broken, nothing stops the next lot from adding to it.
 *
 * So each number that is OVER its budget is held at what was MEASURED. A
 * ratchet has two figures:
 *
 *   - `budget`, what the plan says the number should be;
 *   - `ceiling`, what the gate fails above. For a number over its budget
 *     that is what it was the last time a lot measured it, and it is a dated
 *     debt: it has to have a line in `KNOWN_DEBT` (`ratchet-over-budget`)
 *     saying which lot brings it down.
 *
 * Three ceilings are NOT the measurement, and say so in their `origin`:
 * `roomDraws` and `frameTriangles` are under their budgets (81 and 100,428
 * measured) and are held at the plan's hard ceiling, 100 and 150,000, so they
 * do not ratchet until the budget estimator arrives (L5); and `atriumDraws`
 * is held at the temporary ceiling the plan declared (ÁT-K1, 102), one above
 * what was measured.
 *
 * What only a browser can count (draw calls, triangles, programs) is not
 * measured by the gate: it compares the last written record with these
 * ceilings and checks the record's age in lots. The age is counted from
 * `CONTENT_LOT`, which `test:docs` holds to the plan, so a lot that closes
 * without measuring again turns the gate red at the next one.
 *
 * HOW TO MOVE ONE. Down: lower `ceiling` to the new measurement in the commit
 * that earned it, and when it reaches the budget delete its debt line (the
 * gate asks for that). Up: only in the same commit as the change that needs
 * the room, with the reason written in `origin`, and never past a temporary
 * limit the plan declared (ÁT-K1). A ceiling raised to make a gate pass is
 * the thing this file exists to prevent.
 *
 * Read by `npm run test:ratchets` (kit, texture, the browser record) and
 * `npm run test:bundle` (bytes per path of the built site).
 */

const KIB = 1024
const MIB = 1024 * 1024

export type Ratchet = {
  readonly id: string
  readonly what: string
  /** How a figure is printed: bytes as KiB or MiB, or a plain count. */
  readonly unit: 'KiB' | 'MiB' | 'count'
  /** The plan's figure (4.8). */
  readonly budget: number
  /** Not above this. */
  readonly ceiling: number
  /** Where the ceiling came from, and what would move it. */
  readonly origin: string
}

export const RATCHETS = {
  /**
   * The one file every session downloads before the first room.
   * Baseline 2,241,880 bytes (P0); L1 took 324 triangles of dressing out of
   * the Holyoke wall case.
   */
  kitGlb: {
    id: 'kit-glb',
    what: 'kit.glb, bytes in the bake manifest',
    unit: 'KiB',
    budget: 800 * KIB,
    ceiling: 2_234_252,
    origin: 'the bake of L1 (was 2,241,880 at the P0 baseline). L5 removes the unused recipes; L6 splits the kit by room.',
  },
  /**
   * Every texture the three resident rooms keep on the GPU: material maps,
   * wall media and the text atlas, as RGBA8 with mips where there are mips.
   * Recomputed in Node from the files, and it reproduces the 107.08 MiB read
   * in the browser at the P0 baseline.
   */
  residentTexture: {
    id: 'resident-texture',
    what: 'resident texture: materials, wall media and the text atlas',
    unit: 'MiB',
    budget: 45 * MIB,
    ceiling: 112_284_380,
    origin: 'the P0 baseline: 107.08 MiB (43.88 of materials, 62.21 of wall media, 1.00 of text). No image is added before KTX2 (L7).',
  },
  /** Shader programs with the three rooms resident, after a clean reload. Browser only. */
  programs: {
    id: 'programs',
    what: 'shader programs, three rooms resident',
    unit: 'count',
    budget: 25,
    ceiling: 35,
    origin: 'the P0 baseline. L1 repaints the breaker lens with materials the office door reader already draws.',
  },
  /** Draw calls of a frame inside the atrium, doors closed. Browser only. */
  atriumDraws: {
    id: 'atrium-draws',
    what: 'draw calls per frame in the atrium',
    unit: 'count',
    budget: 100,
    ceiling: 102,
    origin: 'the temporary ceiling of ÁT-K1 (101 measured on the south-east diagonal, R04). Ends with the kit merge in L6.',
  },
  /** Draw calls of a frame in the office or the wing, doors closed. Browser only. */
  roomDraws: {
    id: 'room-draws',
    what: 'draw calls per frame in the office or the Holyoke wing',
    unit: 'count',
    budget: 100,
    ceiling: 100,
    origin: 'the hard mobile ceiling. The highest reference point is 81 (R09).',
  },
  /** Draw calls with a door open and both rooms in the camera. Browser only. */
  pairDraws: {
    id: 'pair-draws',
    what: 'draw calls per frame with a door open between two rooms',
    unit: 'count',
    budget: 100,
    ceiling: 125,
    origin: 'R10 in L1 (128 at the P0 baseline; the Holyoke breaker left the wall behind the open door). L6 merges the kit; L17 draws the neighbour without its collection.',
  },
  /** Triangles of any single frame. Browser only. */
  frameTriangles: {
    id: 'frame-triangles',
    what: 'triangles per frame',
    unit: 'count',
    budget: 150_000,
    ceiling: 150_000,
    origin: 'the hard mobile ceiling. The highest reference point is 100,428 (R10).',
  },
} as const satisfies Record<string, Ratchet>

/**
 * The text atlas the runtime keeps: one SDF texture of 2048 x 128, RGBA, no
 * mips. Declared, because Troika allocates it at run time; the browser
 * record of P0 is where the size was read.
 */
export const TEXT_ATLAS_BYTES = 2048 * 128 * 4

/** RGBA8 with a full mip chain: what a decoded image costs on the GPU. */
export function mippedRgbaBytes(width: number, height: number) {
  return Math.round((width * height * 4 * 4) / 3)
}

// ---------------------------------------------------------------------------
// What only a browser can count
// ---------------------------------------------------------------------------

export type ReferencePoint = {
  readonly id: string
  readonly ratchet: 'roomDraws' | 'atriumDraws' | 'pairDraws'
  /** `?qaCamera=` of the point: x,y,z,yaw,pitch in world space. */
  readonly camera: string
  readonly draws: number
  readonly triangles: number
}

/**
 * The latest measurement of the ten reference points, taken as the baseline
 * record describes (docs/lotes/P0-linha-de-base.md, section 0): clean reload,
 * 1280 x 720 at DPR 1.2, quality medium, three rooms lit, doors closed except
 * in R10. Draw calls and programs cannot be counted in Node, so the gate
 * checks the record instead: that it is from this lot or the one before, and
 * that every figure is within its ratchet. A lot that changes what a room
 * draws measures again and replaces this record in the same commit.
 */
export const BROWSER_RECORD = {
  lot: 1,
  date: '2026-10-04',
  source: 'docs/HANDOFF.md, §10.3 (the baseline it is compared with: docs/lotes/P0-linha-de-base.md, 2.1)',
  programs: 35,
  points: [
    { id: 'R01', ratchet: 'roomDraws', camera: '11.05,0,2.95,-1.5708,-0.45', draws: 58, triangles: 36_086 },
    { id: 'R02', ratchet: 'roomDraws', camera: '10.3,0,2.95,-1.5708,-0.05', draws: 66, triangles: 37_906 },
    { id: 'R03', ratchet: 'atriumDraws', camera: '8.2,0,3,1.5708,0', draws: 80, triangles: 63_940 },
    { id: 'R04', ratchet: 'atriumDraws', camera: '7.8,0,7.8,0.7854,0', draws: 101, triangles: 77_334 },
    { id: 'R05', ratchet: 'atriumDraws', camera: '-7.8,0,-7.8,-2.3562,0', draws: 85, triangles: 67_820 },
    { id: 'R06', ratchet: 'atriumDraws', camera: '-8.2,0,-2,-1.5708,0', draws: 79, triangles: 70_774 },
    // The Holyoke breaker is now in the frame of whoever stands at the door:
    // three draws more here, which is what the lot set out to do.
    { id: 'R07', ratchet: 'roomDraws', camera: '-10.2,0,-2,1.5708,0', draws: 39, triangles: 37_676 },
    { id: 'R08', ratchet: 'roomDraws', camera: '-10.2,0,-2,2.3562,0', draws: 70, triangles: 52_036 },
    { id: 'R09', ratchet: 'roomDraws', camera: '-20.45,0,-7.2,-2.3562,0', draws: 81, triangles: 62_374 },
    { id: 'R10', ratchet: 'pairDraws', camera: '-13.5,0,-2,-1.5708,0', draws: 125, triangles: 100_428 },
  ],
} as const satisfies {
  lot: number
  date: string
  source: string
  programs: number
  points: readonly ReferencePoint[]
}

// ---------------------------------------------------------------------------
// The built site, by the moment each part is downloaded
// ---------------------------------------------------------------------------

/**
 * The plan's budgets (M16), in bytes of gzip: everything before the click on
 * the title button, and everything a session has downloaded once in the
 * game. Models, textures and fonts are counted elsewhere.
 */
export const BUNDLE_BUDGETS = {
  beforeClick: 250_000,
  total: 600_000,
} as const

/**
 * What each moment weighed, gzipped, when a lot last measured it
 * (`scripts/lib/bundlePaths.mjs` says how), plus about half a per cent of
 * slack. The measure is Node's own zlib over the bundler's output, and the
 * repository pins neither: the next hundred bytes (47 of slack on 28 kB) would
 * have turned the gate red on another machine with no code changed. Half a
 * per cent is still a few lines of text, so what a person adds shows.
 *
 * These are the figures of L1: 63,235, 28,353 and 388,248 bytes, which is
 * 91.6 kB before the click and 479.8 kB in all. They are not comparable
 * with the P0 baseline's 92.85 and 484.58 kB, which were read off what Vite
 * prints: Vite compresses a little less than level 9. From this lot on the
 * comparison is like with like, measured here both times.
 * To raise one: in the commit that adds the code, with the reason here.
 *
 * Raised once, by the review of L1 (they were 28,300 and 388,200, on 28,286
 * and 388,176 measured):
 *   - `title` +67 bytes: the dictionaries ship with the title screen, and the
 *     corrected texts are longer than the ones they replace (the curt drawer
 *     hint gives the gesture, the suit's label says what the museum does not
 *     know, the last hint says the light is done);
 *   - `game` +72 bytes: the credit under a frame takes its colour from the
 *     mount it hangs on (`CREDIT_COLOUR`), and the leaves of a door and the
 *     supports of a mount are read from the table the content gate reads
 *     (`runtimePlacedParts.ts`) instead of being typed in each component.
 *
 * Raised by L2, slice by slice (the lot plan, §9, said it would be):
 *   - `title` +300 bytes, on 28,646 measured (it was 28,500 on 28,353): the
 *     store is on the title screen, and loading a save stopped being forty
 *     lines that rebuilt it from the fields they knew. It is now the table of
 *     fields (`progressFields.ts`), which carries over what it does not know,
 *     and the pipeline of migrations, renamed ids and the lot's stamp
 *     (`saveMigrations.ts`). 293 bytes for a save that another tab, a later
 *     lot or a rollback can no longer empty. The other two paths did not
 *     grow (63,230 and 388,227).
 *   - nothing in the second slice: the one door for progress added 1,250
 *     bytes to the game (389,477) and none to the title, inside both ceilings.
 *   - `title` +200 bytes, on 28,863 measured (it was 28,800 on 28,646): the
 *     dictionaries and the style sheet ship with the title screen. The plan
 *     gained three keys in each language and two of its three legend texts
 *     grew («Acesa, falta conferir» has to be true of a room with no piece in
 *     it), the toast of the shortcut one key; and the plan's rules in the
 *     style sheet now draw a stub, an arrowhead, a north and three patterned
 *     samples where there were three coloured squares. 217 bytes.
 *   - `game` +2,500 bytes, on 390,714 measured (it was 390,200 on 389,477):
 *     `mapModel.ts` decides what the plan shows (visited rooms only, one
 *     doorway per opening, the stub, the heading), which the component used
 *     not to decide at all; `doorGrant` and the released doors in the two
 *     door rules; the toast. 1,237 bytes for a plan that keeps the building's
 *     secrets and a shortcut that stays open. The document did not grow
 *     (63,234).
 *   - nothing in the fourth slice (63,235, 28,865 and 390,708): the examine
 *     view imports its two numbers from `examineReach.ts` and the cone's
 *     arithmetic stays out of the game; the exhaustive player, the snapshot
 *     and the robot are the gate's and ship nowhere.
 *
 * Raised by the review of L2:
 *   - `title` +800 bytes, on 29,598 measured (it was 29,000 on 28,859). The
 *     store is on the title screen, and it used to write what it held over
 *     whatever another tab had written since it loaded: a page of the build
 *     before a deploy stamped the save down and dropped the fields of the
 *     build after. It now reads the disk before every write and joins the two
 *     copies field by field (a rule per field in `progressFields.ts`, the
 *     reading in `store.ts`, the mark that tells a new game from the one it
 *     replaced). Most of the 739 bytes are that. The rest are the style
 *     sheet, which ships with the title too: the plan's page as a column
 *     whose drawing gives way to the list of locks, the padlock that replaced
 *     a second question mark, and the title's own column on a phone held
 *     sideways. The game grew 131 bytes (390,892, inside its ceiling) and the
 *     document none (63,235).
 *
 * Raised by the review before the push of L2:
 *   - `title` +250 bytes, on 29,884 measured (it was 29,800 on 29,598). The
 *     store again, all 286 bytes of it, for three things it could not do.
 *     Two tabs standing in two rooms wrote the save at each other for as long
 *     as both were open; they stop because the store now knows what is each
 *     tab's own (`withTabsOwn`). A setting was used as the disk had it, so a
 *     language or a quality tier of a later build, chosen in its tab, was a
 *     blank page in a running tab of this one; each setting is now checked
 *     against what this build can run on (the table of the ten is 128 of the
 *     bytes, the largest single piece), and what it cannot use goes back to
 *     the disk as it was found, which cost 4. And the storage was named
 *     outside any `try`, which a profile that blocks site data answers with
 *     an exception: one accessor names it now, for no bytes at all. The game
 *     and the document did not move (390,891 and 63,235).
 */
export const BUNDLE_PATH_CEILINGS = {
  document: 63_600,
  title: 30_050,
  game: 392_700,
} as const

/** Strings that only the content set and the bake manifest contain. */
export const CONTENT_SENTINELS = ['/models/kit.', 'ball/leather-laced-1900'] as const
