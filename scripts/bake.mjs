/**
 * The bake.
 *
 *   npm run bake
 *
 * Generates every piece of museum geometry procedurally in Node, writes it as
 * meshopt-compressed GLB, and emits a typed manifest describing what came out.
 *
 * WHY BUILD TIME AND NOT RUNTIME — the question the design brief forces a side
 * on. Generating in the browser would mean: hundreds of milliseconds of
 * main-thread jank per room with no way to yield; no meshopt, no quantisation,
 * no texture compression, so strictly more bytes over the wire past trivial
 * complexity; no CDN or browser caching between sessions; and nothing that can
 * be inspected, diffed, screenshotted or regression-tested.
 *
 * The generator source stays in the repository — it IS the asset. The GLB is
 * the compiled artefact, exactly like a bundled .js.
 */

import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { MUSEUM } from '../src/content/museum.ts'
import { MATERIALS, writeGLB } from './bake/lib/glb.mjs'
import { renderMaterial, vramBytes } from './bake/lib/texture.mjs'
import { buildMaterialRecipes } from './bake/materials.mjs'
import {
  buildPartition,
  buildPictureFrameEmpty,
  buildVitrineTower,
  buildWallVitrine,
} from './bake/parts/cases.mjs'
import {
  buildBreakerPanel,
  buildCeilingSpot,
  buildPendant,
  buildVentGrille,
  buildWallSconce,
} from './bake/parts/fixtures.mjs'
import {
  buildBanner,
  buildDedicationPlaque,
  buildDonationBox,
  buildInterpPanel,
  buildLabelAngled,
  buildReceptionDesk,
  buildWayfindingPlaque,
} from './bake/parts/interpretive.mjs'
import { buildDoorLeaf, buildThreshold } from './bake/parts/openings.mjs'
import {
  buildBookshelf,
  buildCuratorDesk,
  buildDeskLamp,
  buildLedgerStack,
  buildOfficeChair,
} from './bake/parts/office.mjs'
import {
  buildArchiveTrolley,
  buildCoatStand,
  buildOfficeCorkboard,
  buildOfficeFlatfile,
  buildOfficeRug,
  buildOfficeSafe,
  buildVisitorChair,
} from './bake/parts/officeDecor.mjs'
import {
  buildCuratorNotebook,
  buildDeskRadio,
  buildDoorAccessPanel,
  buildWallClock,
} from './bake/parts/officeProps.mjs'
import {
  buildGymCourtLines,
  buildGymTrainingSet,
  buildHistoryCaseRun,
  buildHistoryHeroCase,
  buildHistoryInfoKiosk,
  buildHolyokeEntryScreen,
} from './bake/parts/holyokeDecor.mjs'
import {
  buildAtriumAerialInstallation,
  buildAtriumCeilingCoffer,
  buildAtriumCentralPodium,
  buildAtriumDisplayTower,
  buildAtriumFloorInlay,
  buildAtriumPinPendant,
  buildAtriumReceptionDesk,
  buildAtriumSofa,
  buildAtriumLectern,
  buildAtriumWallBay,
} from './bake/parts/atriumDecor.mjs'
import {
  buildAtriumBarrierSegment,
  buildAtriumDisplayConsole,
  buildAtriumDividerScreen,
  buildAtriumLoungeSet,
} from './bake/parts/atriumFurnishings.mjs'
import {
  buildClassicWhiteVolleyball,
  buildEightPanelVolleyball2008,
  buildLacedLeatherVolleyball,
  buildTricolourVolleyball1998,
} from './bake/parts/historicalVolleyballs.mjs'
import {
  buildArchiveCabinet,
  buildBench,
  buildBladder,
  buildBooklet,
  buildDressForm,
  buildFrame,
  buildLabelPlaque,
  buildNet1897,
  buildOpenBook,
  buildPlinth,
  buildRoomShell,
  buildSpaldingBall,
  buildMedallionSocket,
  buildRopeSpan,
  buildStanchion,
  buildVitrineGlass,
  buildVitrineTable,
  prepareRoomShells,
} from './bake/kit.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const OUT_MODELS = resolve(ROOT, 'public/models')
const OUT_TEXTURES = resolve(ROOT, 'public/textures/materials')
const OUT_MANIFEST = resolve(ROOT, 'src/content/bake.generated.ts')

/**
 * Which generated texture set each GLB material uses, and whether it is a
 * plain colour. Textures are shipped as separate files rather than embedded in
 * the GLBs: the same oak appears in three bundles, and embedding would ship
 * three copies and defeat per-file caching.
 */
const MATERIAL_TEXTURES = {
  'maple-floor': 'maple-floor',
  'plaster': 'plaster',
  'plaster-dark': 'plaster',
  'oak-matte': 'oak-matte',
  'oak-varnished': 'oak-matte',
  'walnut-polished': 'oak-matte',
  'walnut-matte': 'oak-matte',
  'holyoke-floor': 'maple-floor',
  'leather-tan': 'leather-tan',
  'leather-worn': 'leather-tan',
  'leather-green': 'leather-tan',
  'rawhide-lace': null,
  'ball-leather-aged': 'ball-1964',
  'ball-1964': 'ball-1964',
  'ball-1998-white': 'ball-1998',
  'ball-1998-yellow': 'ball-1998',
  'ball-1998-blue': 'ball-1998',
  'ball-2008-yellow': 'ball-2008',
  'ball-2008-blue': 'ball-2008',
  'canvas': 'canvas',
  'paper-aged': 'canvas',
  'cork': 'canvas',
  'rug-burgundy': 'canvas',
  'cord-hemp': 'canvas',
  'rope-velvet': 'canvas',
  // Brass, cast iron and both kinds of glass stay untextured: they are small,
  // specular and read primarily off the environment, so a texture would cost
  // VRAM for detail nobody perceives.
  'brass': null,
  'atrium-glow': null,
  'iron-cast': null,
  'archive-green': null,
  'holyoke-navy': 'canvas',
  'glass-vitrine': null,
  'glass-green': null,
  'plastic-black': null,
  'led-off': null,
  'led-red': null,
  'led-green': null,
}

/** Mobile VRAM ceiling for all material textures, uncompressed with mips. */
const TEXTURE_VRAM_BUDGET = 45 * 1024 * 1024

/**
 * The shells come from the content set, because there is only one of them.
 *
 * They used to be redeclared here, with a comment promising that "the validator
 * cross-checks the two sets so they cannot drift". No such validator was ever
 * written, and they drifted immediately: Holyoke's one-way shortcut existed in
 * this list and not in the content, and then a doorway added to the content
 * never reached the geometry at all. A wall is only ever open where the bake
 * says it is, so a second source of truth for portals is a second source of
 * truth for whether the player can leave the room.
 *
 * Node strips the types on import, which is the same mechanism the content
 * validator already runs on.
 */
const ROOM_SHELLS = prepareRoomShells(MUSEUM.rooms)

/** Per-asset triangle budgets from the performance plan. Exceeding one fails the bake. */
const TRIANGLE_BUDGET = {
  shell: 30_000,
  hero: 15_000,
  prop: 2_500,
  filler: 300,
}

/** A compound asset spends one budget across its root and every material sibling. */
function checkRecipeBudget(manifest, recipe, budget) {
  const members = manifest.filter(
    (item) => item.name === recipe || item.name.startsWith(`${recipe}__`),
  )
  const triangles = members.reduce((total, member) => total + member.triangles, 0)
  if (triangles > budget) {
    return `${recipe}: ${triangles} triangles across ${members.length} part(s) exceeds the ${budget} budget`
  }
  return null
}

function recipeNames(manifest) {
  return new Set(manifest.map((part) => part.name.split('__', 1)[0]))
}

/**
 * A box collider derived from the geometry bounds. Good enough for walls,
 * plinths and vitrines; the old build used the full AABB of every prop, which
 * is why you could walk into thin air next to the desk. Exhibits get no
 * collider at all — you should be able to lean into a display case.
 */
function boxColliderFrom(bounds) {
  return {
    kind: 'box',
    halfExtents: bounds.size.map((value) => Number((value / 2).toFixed(4))),
    centre: bounds.centre,
  }
}

/**
 * Expands a multi-material generator into the node naming convention consumed
 * by cloneRecipe: one optional primary node at the recipe id, plus `__suffix`
 * nodes for the remaining materials. Recipes such as `banner` deliberately
 * have no primary node; prefix matching still assembles the complete object.
 */
function compoundKitParts(name, geometries, materialByPart, primaryPart = null) {
  return Object.entries(materialByPart).map(([part, material]) => {
    const geometry = geometries[part]
    if (!geometry) throw new Error(`Recipe "${name}" is missing geometry "${part}".`)
    return {
      name: part === primaryPart ? name : `${name}__${part}`,
      geometry,
      material,
    }
  })
}

/**
 * Exhibit geometry is registered once, then rooms select recipes through
 * museum.ts. This is deliberately separate from the shared kit registry: a
 * room downloads only its own collection bundle, while furniture stays shared.
 */
const EXHIBIT_RECIPES = new Map([
  [
    'ball/spalding-laced-1900',
    {
      budget: 'hero',
      build: () => [
        { geometry: buildSpaldingBall(), material: 'leather-tan' },
      ],
    },
  ],
  [
    'ball/basketball-bladder-1895',
    {
      budget: 'hero',
      build: () => [
        { geometry: buildBladder(), material: 'leather-worn' },
      ],
    },
  ],
  [
    'net/ymca-1897',
    {
      budget: 'prop',
      build: () => {
        const net = buildNet1897()
        return [
          { suffix: 'structure', geometry: net.structure, material: 'oak-matte' },
          { suffix: 'cords', geometry: net.cords, material: 'cord-hemp' },
        ]
      },
    },
  ],
  [
    'paper/handbook-1897',
    {
      budget: 'prop',
      build: () => [{ geometry: buildOpenBook(), material: 'canvas' }],
    },
  ],
  [
    'paper/spalding-guide-1916',
    {
      budget: 'prop',
      build: () => [{ geometry: buildBooklet(), material: 'canvas' }],
    },
  ],
  [
    'apparel/gym-suit-1900',
    {
      budget: 'prop',
      build: () => {
        const dressForm = buildDressForm()
        return [
          { suffix: 'form', geometry: dressForm.structure, material: 'plaster-dark' },
          { suffix: 'garment', geometry: dressForm.garment, material: 'leather-worn' },
        ]
      },
    },
  ],
  [
    'frame/portrait-small',
    {
      budget: 'prop',
      build: () => [
        { geometry: buildFrame({ width: 0.34, aspect: 0.6611 }), material: 'oak-varnished' },
      ],
    },
  ],
  [
    'frame/panorama-wide',
    {
      budget: 'prop',
      build: () => [
        { geometry: buildFrame({ width: 1.4, aspect: 2.5751 }), material: 'oak-varnished' },
      ],
    },
  ],
  [
    'ball/leather-laced-1900',
    {
      budget: 'hero',
      build: () => {
        const ball = buildLacedLeatherVolleyball()
        return [
          { suffix: 'leather', geometry: ball.leather, material: 'ball-leather-aged' },
          { suffix: 'fastenings', geometry: ball.fastenings, material: 'rawhide-lace' },
        ]
      },
    },
  ],
  [
    'ball/classic-white-18-panel',
    {
      budget: 'hero',
      build: () => {
        const ball = buildClassicWhiteVolleyball()
        return [{ geometry: ball.cover, material: 'ball-1964' }]
      },
    },
  ],
  [
    'ball/tricolour-1998',
    {
      budget: 'hero',
      build: () => {
        const ball = buildTricolourVolleyball1998()
        return [
          { geometry: ball.white, material: 'ball-1998-white' },
          { suffix: 'blue', geometry: ball.blue, material: 'ball-1998-blue' },
          { suffix: 'yellow', geometry: ball.yellow, material: 'ball-1998-yellow' },
        ]
      },
    },
  ],
  [
    'ball/eight-panel-2008',
    {
      budget: 'hero',
      build: () => {
        const ball = buildEightPanelVolleyball2008()
        return [
          { geometry: ball.blue, material: 'ball-2008-blue' },
          { suffix: 'yellow', geometry: ball.yellow, material: 'ball-2008-yellow' },
        ]
      },
    },
  ],
])

function buildExhibitRecipe(recipe) {
  const registration = EXHIBIT_RECIPES.get(recipe)
  if (!registration) {
    throw new Error(
      `Content references exhibit recipe "${recipe}", but EXHIBIT_RECIPES has no generator.`,
    )
  }

  return {
    budget: TRIANGLE_BUDGET[registration.budget],
    parts: registration.build().map((part) => ({
      name: part.suffix ? `${recipe}__${part.suffix}` : recipe,
      geometry: part.geometry,
      material: part.material,
    })),
  }
}

async function bakeBundle(name, parts) {
  const { glb, manifest } = await writeGLB(parts)
  const hash = createHash('sha256').update(glb).digest('hex').slice(0, 8)
  const filename = `${name}.${hash}.glb`
  const outPath = resolve(OUT_MODELS, filename)

  let unchanged = false
  try {
    unchanged = (await readFile(outPath)).equals(Buffer.from(glb))
  } catch {
    unchanged = false
  }
  if (!unchanged) await writeFile(outPath, glb)

  const triangles = manifest.reduce((total, item) => total + item.triangles, 0)
  console.log(
    `  ${unchanged ? '=' : '+'} ${filename.padEnd(38)} ` +
      `${String(Math.round(glb.byteLength / 1024)).padStart(5)} KB  ` +
      `${String(triangles).padStart(7)} tris  ${manifest.length} part(s)`,
  )

  return { name, url: `/models/${filename}`, bytes: glb.byteLength, manifest }
}

/**
 * Removes superseded builds so public/models does not accumulate garbage.
 *
 * Scoped hard to files this script owns: `<known-bundle-name>.<8 hex>.glb` and
 * nothing else. An earlier version matched every `*.glb` in the directory and
 * deleted a hand-authored model that happened to live there. A bake step must
 * never be able to reach outside its own output.
 */
async function pruneStale(bundleNames, keepFilenames) {
  let entries = []
  try {
    entries = await readdir(OUT_MODELS, { withFileTypes: true })
  } catch {
    return
  }

  const ownedPattern = new RegExp(
    `^(${bundleNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\.[0-9a-f]{8}\\.glb$`,
  )

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!ownedPattern.test(entry.name)) continue
    if (keepFilenames.has(entry.name)) continue
    await unlink(resolve(OUT_MODELS, entry.name))
    console.log(`  - ${entry.name} (superseded)`)
  }
}

/**
 * Same containment rule as the GLB prune: only `<name>-<map>.<8 hex>.webp`
 * under the materials directory, so this can never reach a hand-placed file.
 */
async function pruneStaleTextures(keepFilenames) {
  let entries = []
  try {
    entries = await readdir(OUT_TEXTURES, { withFileTypes: true })
  } catch {
    return
  }

  const ownedPattern = /^[a-z0-9-]+-(albedo|normal|orm)\.[0-9a-f]{8}\.webp$/
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!ownedPattern.test(entry.name)) continue
    if (keepFilenames.has(entry.name)) continue
    await unlink(resolve(OUT_TEXTURES, entry.name))
    console.log(`  - ${entry.name} (superseded)`)
  }
}

/** Writes a texture with a content hash, skipping identical bytes. */
async function writeTexture(dir, name, buffer) {
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 8)
  const filename = `${name}.${hash}.webp`
  const outPath = resolve(dir, filename)

  let unchanged = false
  try {
    unchanged = (await readFile(outPath)).equals(buffer)
  } catch {
    unchanged = false
  }
  if (!unchanged) await writeFile(outPath, buffer)

  return { src: `/textures/materials/${filename}`, filename, unchanged }
}

async function main() {
  await mkdir(OUT_MODELS, { recursive: true })
  await mkdir(OUT_TEXTURES, { recursive: true })
  const bundles = []
  const problems = []

  // -------------------------------------------------------------------------
  // Procedural material textures.
  //
  // Each material is one scalar height field; albedo, normal and roughness all
  // derive from it, which is what makes a surface cohere instead of looking
  // like three unrelated images stacked on one mesh.
  // -------------------------------------------------------------------------
  console.log('Materials:')
  const textureSets = {}
  const textureFilenames = new Set()
  let textureBytes = 0
  let textureVram = 0

  for (const recipe of buildMaterialRecipes()) {
    const rendered = await renderMaterial(recipe, OUT_TEXTURES, writeTexture)
    textureSets[recipe.id] = rendered

    const bytes = rendered.albedo.bytes + rendered.normal.bytes + rendered.orm.bytes
    const vram =
      vramBytes(rendered.albedo.size) + vramBytes(rendered.normal.size) + vramBytes(rendered.orm.size)
    textureBytes += bytes
    textureVram += vram

    for (const map of [rendered.albedo, rendered.normal, rendered.orm]) {
      textureFilenames.add(map.src.split('/').pop())
    }

    console.log(
      `  + ${recipe.id.padEnd(16)} ` +
        `albedo ${String(rendered.albedo.size).padStart(4)}  ` +
        `normal ${String(rendered.normal.size).padStart(4)}  ` +
        `orm ${String(rendered.orm.size).padStart(4)}  ` +
        `${String(Math.round(bytes / 1024)).padStart(4)} KB wire  ` +
        `${(vram / 1024 / 1024).toFixed(1)} MB vram`,
    )
  }

  if (textureVram > TEXTURE_VRAM_BUDGET) {
    problems.push(
      `texture VRAM ${(textureVram / 1024 / 1024).toFixed(1)} MB exceeds the ` +
        `${(TEXTURE_VRAM_BUDGET / 1024 / 1024).toFixed(0)} MB mobile budget`,
    )
  }

  await pruneStaleTextures(textureFilenames)
  console.log('')

  // -------------------------------------------------------------------------
  // Room shells — one bundle per room, streamed on demand.
  // -------------------------------------------------------------------------
  console.log('Room shells:')
  for (const room of ROOM_SHELLS) {
    const parts = buildRoomShell(room)
    const bundle = await bakeBundle(`room-${room.id}`, parts)

    for (const part of bundle.manifest) {
      // Walls, floor and trim are what the player collides with.
      part.collider = boxColliderFrom(part.bounds)
    }
    for (const recipe of recipeNames(bundle.manifest)) {
      const problem = checkRecipeBudget(bundle.manifest, recipe, TRIANGLE_BUDGET.shell)
      if (problem) problems.push(problem)
    }

    bundles.push(bundle)
  }

  // -------------------------------------------------------------------------
  // The shared prop kit — loaded once, instanced everywhere.
  // -------------------------------------------------------------------------
  console.log('\nShared kit:')
  const vitrineTable = buildVitrineTable()
  const wallVitrine = buildWallVitrine()
  const vitrineTower = buildVitrineTower()
  const partition = buildPartition()
  const banner = buildBanner()
  const donationBox = buildDonationBox()
  const doorLeaf = buildDoorLeaf()
  const doorLeafRight = buildDoorLeaf({ handed: 'right' })
  const ceilingSpot = buildCeilingSpot()
  const breakerPanel = buildBreakerPanel()
  const pendant = buildPendant()
  const officeChair = buildOfficeChair()
  const deskLamp = buildDeskLamp()
  const bookshelf = buildBookshelf()
  const ledgerStack = buildLedgerStack()
  const officeRug = buildOfficeRug()
  const officeCorkboard = buildOfficeCorkboard()
  const officeFlatfile = buildOfficeFlatfile()
  const archiveTrolley = buildArchiveTrolley()
  const officeSafe = buildOfficeSafe()
  const visitorChair = buildVisitorChair()
  const coatStand = buildCoatStand()
  const holyokeEntryScreen = buildHolyokeEntryScreen()
  const historyCaseRun = buildHistoryCaseRun()
  const historyHeroCase = buildHistoryHeroCase()
  const historyInfoKiosk = buildHistoryInfoKiosk()
  const gymCourtLines = buildGymCourtLines()
  const gymTrainingSet = buildGymTrainingSet()
  const atriumFloorInlay = buildAtriumFloorInlay()
  const atriumReceptionDesk = buildAtriumReceptionDesk()
  const atriumWallBay = buildAtriumWallBay()
  const atriumWallBayPlain = buildAtriumWallBay({ plaqueWidth: 0 })
  const atriumCentralPodium = buildAtriumCentralPodium()
  const atriumDisplayTower = buildAtriumDisplayTower()
  const atriumCeilingCoffer = buildAtriumCeilingCoffer()
  const atriumPinPendant = buildAtriumPinPendant()
  const atriumAerialInstallation = buildAtriumAerialInstallation()
  const atriumSofa = buildAtriumSofa()
  const atriumLectern = buildAtriumLectern()
  const atriumDividerScreen = buildAtriumDividerScreen()
  const atriumBarrierSegment = buildAtriumBarrierSegment()
  const atriumLoungeSet = buildAtriumLoungeSet()
  const atriumDisplayConsole = buildAtriumDisplayConsole()
  const atriumBannerHardware = buildBanner()
  const wayfindingPlaque = buildWayfindingPlaque()
  const dedicationPlaque = buildDedicationPlaque()

  const kitParts = [
    { name: 'plinth-block', geometry: buildPlinth({ height: 1.0 }), material: 'oak-varnished' },
    // The atrium hero plinth. It was 0.44 m square and 1.15 m tall, which in an
    // eighteen-metre room read as a chimney rather than a pedestal; a landmark
    // has to be wider than it is tall to hold the centre of a space this size.
    { name: 'plinth-tapered', geometry: buildPlinth({ height: 0.98, top: 0.66, bottom: 0.9 }), material: 'oak-varnished' },
    { name: 'medallion-socket', geometry: buildMedallionSocket(), material: 'brass' },
    { name: 'vitrine-table', geometry: vitrineTable, material: 'oak-varnished' },
    { name: 'vitrine-glass', geometry: buildVitrineGlass(), material: 'glass-vitrine' },
    { name: 'label-plaque', geometry: buildLabelPlaque(), material: 'brass' },
    // Architectural wayfinding is one material per colourway. The routed
    // border and fixings are part of the same mesh, preserving the seven-draw
    // margin in the heaviest mobile portal view.
    { name: 'wayfinding-plaque-navy', geometry: wayfindingPlaque.clone(), material: 'holyoke-navy' },
    { name: 'wayfinding-plaque-green', geometry: wayfindingPlaque.clone(), material: 'archive-green' },
    { name: 'wayfinding-plaque-walnut', geometry: wayfindingPlaque, material: 'walnut-polished' },
    { name: 'dedication-plaque', geometry: dedicationPlaque, material: 'walnut-polished' },
    { name: 'archive-cabinet', geometry: buildArchiveCabinet(), material: 'oak-varnished' },
    { name: 'rope-stanchion', geometry: buildStanchion(), material: 'brass' },
    // This recipe now belongs to the compact reception queue. Authoring it to
    // the actual 1.65 m post spacing preserves rope height and thickness; a
    // uniform placement scale would shrink those along with its length.
    { name: 'rope-span', geometry: buildRopeSpan({ span: 1.65 }), material: 'rope-velvet' },
    { name: 'bench', geometry: buildBench(), material: 'oak-varnished' },

    // Display cases and spatial dividers.
    ...compoundKitParts(
      'vitrine-wall',
      wallVitrine,
      { carcass: 'oak-varnished', glass: 'glass-vitrine' },
      'carcass',
    ),
    ...compoundKitParts(
      'vitrine-tower',
      vitrineTower,
      { carcass: 'oak-varnished', glass: 'glass-vitrine' },
      'carcass',
    ),
    ...compoundKitParts(
      'partition',
      partition,
      { face: 'plaster', foot: 'oak-varnished' },
      'face',
    ),
    {
      name: 'frame-empty',
      geometry: buildPictureFrameEmpty(),
      material: 'oak-varnished',
    },

    // Interpretive furniture and signage.
    { name: 'label-angled', geometry: buildLabelAngled(), material: 'brass' },
    { name: 'interp-panel', geometry: buildInterpPanel(), material: 'plaster-dark' },
    ...compoundKitParts('banner', banner, { cloth: 'canvas', battens: 'oak-varnished' }),
    { name: 'reception-desk', geometry: buildReceptionDesk(), material: 'oak-varnished' },
    ...compoundKitParts(
      'donation-box',
      donationBox,
      { pedestal: 'brass', glass: 'glass-vitrine' },
      'pedestal',
    ),

    // Door parts remain available as recipes for QA and future animated doors.
    // The static threshold is also fused into the owning room shell above so a
    // reciprocal portal cannot place two copies on the same floor seam.
    ...compoundKitParts(
      'door-leaf',
      doorLeaf,
      { leaf: 'oak-varnished', furniture: 'brass' },
      'leaf',
    ),
    ...compoundKitParts(
      'door-leaf-right',
      doorLeafRight,
      { leaf: 'oak-varnished', furniture: 'brass' },
      'leaf',
    ),
    { name: 'threshold', geometry: buildThreshold(), material: 'brass' },

    // Lighting and services.
    ...compoundKitParts(
      'ceiling-spot',
      ceilingSpot,
      { track: 'iron-cast', head: 'brass' },
    ),
    ...compoundKitParts('pendant', pendant, { fitting: 'brass', shade: 'plaster' }),
    { name: 'wall-sconce', geometry: buildWallSconce(), material: 'brass' },
    { name: 'vent-grille', geometry: buildVentGrille(), material: 'iron-cast' },
    ...compoundKitParts(
      'breaker-panel',
      breakerPanel,
      { case: 'iron-cast', handle: 'brass', indicator: 'glass-green' },
      'case',
    ),

    // Curator's office.
    ...compoundKitParts(
      'curator-desk',
      buildCuratorDesk(),
      {
        timber: 'walnut-polished',
        brass: 'brass',
        leather: 'leather-green',
        paper: 'paper-aged',
        phone: 'iron-cast',
        props: 'walnut-polished',
      },
      'timber',
    ),
    ...compoundKitParts(
      'office-chair',
      officeChair,
      { frame: 'walnut-polished', base: 'walnut-polished', leather: 'leather-green', brass: 'brass' },
    ),
    ...compoundKitParts(
      'desk-lamp',
      deskLamp,
      { base: 'brass', shade: 'glass-green' },
    ),
    ...compoundKitParts(
      'bookshelf',
      bookshelf,
      {
        carcass: 'walnut-polished',
        books: 'leather-worn',
        booksGreen: 'leather-green',
        booksRed: 'rope-velvet',
        boxes: 'archive-green',
        brass: 'brass',
      },
      'carcass',
    ),
    ...compoundKitParts(
      'ledger-stack',
      ledgerStack,
      { covers: 'leather-worn', pages: 'paper-aged', brass: 'brass' },
      'covers',
    ),
    ...compoundKitParts(
      'office-rug',
      officeRug,
      { field: 'rug-burgundy', border: 'paper-aged', fringe: 'canvas' },
      'field',
    ),
    ...compoundKitParts(
      'office-corkboard',
      officeCorkboard,
      { frame: 'walnut-polished', cork: 'cork', papers: 'paper-aged', pins: 'brass' },
      'frame',
    ),
    ...compoundKitParts(
      'office-flatfile',
      officeFlatfile,
      { body: 'archive-green', hardware: 'brass', map: 'paper-aged' },
      'body',
    ),
    ...compoundKitParts(
      'archive-trolley',
      archiveTrolley,
      { frame: 'archive-green', boxes: 'canvas', labels: 'paper-aged' },
      'frame',
    ),
    ...compoundKitParts(
      'office-safe',
      officeSafe,
      { body: 'archive-green', hardware: 'brass' },
      'body',
    ),
    ...compoundKitParts(
      'visitor-chair',
      visitorChair,
      { frame: 'walnut-polished', upholstery: 'leather-green', studs: 'brass' },
      'frame',
    ),
    ...compoundKitParts(
      'coat-stand',
      coatStand,
      { wood: 'walnut-polished', hardware: 'brass', hat: 'leather-worn', umbrella: 'plastic-black' },
      'wood',
    ),

    // The opening scene's working props. The notebook is a container, the
    // other three are devices: none is instanced, so each placement clones
    // its own nodes and the runtime may recolour a lens or turn a hand.
    ...compoundKitParts(
      'curator-notebook',
      buildCuratorNotebook(),
      { cover: 'rope-velvet', pages: 'paper-aged', band: 'plastic-black', pen: 'brass' },
      'cover',
    ),
    ...compoundKitParts(
      'desk-radio',
      buildDeskRadio(),
      { body: 'plastic-black', metal: 'iron-cast', led: 'led-off' },
      'body',
    ),
    ...compoundKitParts(
      'office-wall-clock',
      buildWallClock(),
      {
        casing: 'walnut-polished',
        bezel: 'brass',
        dial: 'paper-aged',
        'hand-hour': 'iron-cast',
        'hand-minute': 'iron-cast',
        'hand-second': 'rope-velvet',
      },
      'casing',
    ),
    ...compoundKitParts(
      'door-access-panel',
      buildDoorAccessPanel(),
      { plate: 'iron-cast', trim: 'brass', led: 'led-red' },
      'plate',
    ),

    // Holyoke historical gallery. The wall case is one authored run so its five
    // displays can carry different objects without five copied prop patterns.
    ...compoundKitParts(
      'holyoke-entry-screen',
      holyokeEntryScreen,
      {
        body: 'holyoke-navy',
        art: 'holyoke-navy',
        trim: 'brass',
        glass: 'glass-vitrine',
      },
      'body',
    ),
    ...compoundKitParts(
      'history-case-run',
      historyCaseRun,
      {
        carcass: 'walnut-polished',
        accent: 'rope-velvet',
        lining: 'holyoke-navy',
        trim: 'brass',
        glass: 'glass-vitrine',
        paper: 'paper-aged',
        artefacts: 'leather-worn',
      },
      'carcass',
    ),
    ...compoundKitParts(
      'history-hero-case',
      historyHeroCase,
      {
        body: 'walnut-polished',
        trim: 'brass',
        glass: 'glass-vitrine',
        display: 'paper-aged',
      },
      'body',
    ),
    ...compoundKitParts(
      'history-info-kiosk',
      historyInfoKiosk,
      {
        body: 'walnut-polished',
        lining: 'holyoke-navy',
        graphics: 'paper-aged',
        trim: 'brass',
      },
      'body',
    ),
    ...compoundKitParts(
      'gym-court-lines',
      gymCourtLines,
      { lines: 'paper-aged' },
      'lines',
    ),
    ...compoundKitParts(
      'gym-training-set',
      gymTrainingSet,
      { wood: 'oak-varnished', rope: 'cord-hemp', leather: 'leather-worn' },
      'wood',
    ),

    // Central atrium. Architectural gestures remain separate recipes so the
    // floor and ceiling never acquire furniture colliders, while all material
    // siblings still instance as one data-driven placement.
    ...compoundKitParts(
      'atrium-floor-inlay',
      atriumFloorInlay,
      { timber: 'maple-floor', dark: 'iron-cast', brass: 'brass' },
      'timber',
    ),
    ...compoundKitParts(
      'atrium-reception-desk',
      atriumReceptionDesk,
      {
        carcass: 'walnut-matte',
        timber: 'walnut-polished',
        brass: 'brass',
        light: 'atrium-glow',
        props: 'iron-cast',
        storage: 'walnut-matte',
      },
      'carcass',
    ),
    ...compoundKitParts(
      'atrium-wall-bay',
      atriumWallBay,
      {
        backing: 'walnut-matte',
        slats: 'walnut-polished',
        trim: 'walnut-polished',
        plaque: 'plaster-dark',
        graphics: 'paper-aged',
        light: 'atrium-glow',
      },
      'backing',
    ),
    ...compoundKitParts(
      'atrium-wall-bay-plain',
      atriumWallBayPlain,
      { backing: 'walnut-matte', slats: 'walnut-polished', trim: 'walnut-polished' },
      'backing',
    ),
    ...compoundKitParts(
      'atrium-central-podium',
      atriumCentralPodium,
      {
        body: 'walnut-polished',
        top: 'plaster-dark',
        brass: 'brass',
        controls: 'paper-aged',
        light: 'atrium-glow',
      },
      'body',
    ),
    ...compoundKitParts(
      'atrium-display-tower',
      atriumDisplayTower,
      {
        carcass: 'walnut-polished',
        glass: 'glass-vitrine',
        brass: 'brass',
        shelves: 'walnut-matte',
        light: 'atrium-glow',
        artefacts: 'brass',
      },
      'carcass',
    ),
    ...compoundKitParts(
      'atrium-ceiling-coffer',
      atriumCeilingCoffer,
      {
        field: 'plaster-dark',
        slats: 'walnut-matte',
        trim: 'walnut-polished',
        light: 'atrium-glow',
      },
      'field',
    ),
    ...compoundKitParts(
      'atrium-pin-pendant',
      atriumPinPendant,
      { fitting: 'iron-cast', head: 'atrium-glow' },
      'fitting',
    ),
    ...compoundKitParts(
      'atrium-aerial-installation',
      atriumAerialInstallation,
      {
        cables: 'iron-cast',
        brassA: 'brass',
        brassB: 'brass',
        finials: 'brass',
        net: 'iron-cast',
      },
      'brassA',
    ),
    {
      name: 'atrium-banner-hardware',
      geometry: atriumBannerHardware.battens,
      material: 'walnut-polished',
    },
    ...compoundKitParts(
      'atrium-sofa',
      atriumSofa,
      { frame: 'walnut-polished', upholstery: 'holyoke-navy', brass: 'brass' },
      'frame',
    ),
    ...compoundKitParts(
      'atrium-lectern',
      atriumLectern,
      { body: 'walnut-polished', top: 'plaster-dark', brass: 'brass', light: 'atrium-glow' },
      'body',
    ),
    ...compoundKitParts(
      'atrium-divider-screen',
      atriumDividerScreen,
      { base: 'holyoke-navy', frame: 'walnut-polished', mesh: 'brass' },
      'base',
    ),
    {
      name: 'atrium-barrier-segment',
      geometry: atriumBarrierSegment.brass,
      material: 'brass',
    },
    ...compoundKitParts(
      'atrium-lounge-set',
      atriumLoungeSet,
      { timber: 'walnut-polished', upholstery: 'holyoke-navy', brass: 'brass' },
      'timber',
    ),
    ...compoundKitParts(
      'atrium-display-console',
      atriumDisplayConsole,
      { carcass: 'walnut-polished', glass: 'glass-vitrine', brass: 'brass' },
      'carcass',
    ),
  ]
  const kitBundle = await bakeBundle('kit', kitParts)

  const kitColliderParts = new Set([
    'plinth-block',
    'plinth-tapered',
    'vitrine-table',
    'archive-cabinet',
    'bench',
    'vitrine-wall',
    'vitrine-tower',
    'partition__foot',
    'interp-panel',
    'reception-desk',
    'donation-box',
    'door-leaf',
    'door-leaf-right',
    'curator-desk',
    'office-chair__base',
    'bookshelf',
    'office-flatfile',
    'archive-trolley',
    'office-safe',
    'visitor-chair',
    'holyoke-entry-screen',
    'history-case-run',
    'history-hero-case',
    'history-info-kiosk',
    'gym-training-set',
    'atrium-reception-desk',
    'atrium-reception-desk__storage',
    'atrium-central-podium',
    'atrium-display-tower',
    'atrium-sofa',
    'atrium-lectern',
    'atrium-divider-screen',
    'atrium-barrier-segment',
    'atrium-lounge-set',
    'atrium-display-console',
  ])

  const partitionFace = kitBundle.manifest.find((part) => part.name === 'partition')
  const dividerFrame = kitBundle.manifest.find(
    (part) => part.name === 'atrium-divider-screen__frame',
  )
  for (const part of kitBundle.manifest) {
    if (kitColliderParts.has(part.name)) {
      part.collider = boxColliderFrom(part.bounds)
    }

    if (part.name === 'partition__foot' && part.collider && partitionFace) {
      // Keep the foot's wider L-shaped X/Z footprint, but make it a wall. The
      // physical foot is only 0.16 m high and the player's 0.22 m autostep can
      // otherwise climb it and walk straight through the 2.4 m plaster face.
      const minY = Math.min(part.bounds.min[1], partitionFace.bounds.min[1])
      const maxY = Math.max(part.bounds.max[1], partitionFace.bounds.max[1])
      part.collider.halfExtents[1] = Number(((maxY - minY) / 2).toFixed(4))
      part.collider.centre[1] = Number(((minY + maxY) / 2).toFixed(4))
    }

    if (part.name === 'atrium-divider-screen' && part.collider && dividerFrame) {
      // The navy cabinet supplies the honest wide footprint; stretching that
      // collider to the timber crown makes the open lattice a wall rather than
      // a 480 mm step the capsule can climb through.
      const minY = Math.min(part.bounds.min[1], dividerFrame.bounds.min[1])
      const maxY = Math.max(part.bounds.max[1], dividerFrame.bounds.max[1])
      part.collider.halfExtents[1] = Number(((maxY - minY) / 2).toFixed(4))
      part.collider.centre[1] = Number(((minY + maxY) / 2).toFixed(4))
    }
  }

  const atriumArchitecturalRecipes = new Set([
    'atrium-floor-inlay',
    'atrium-ceiling-coffer',
  ])
  const atriumHeroRecipes = new Set([
    'atrium-aerial-installation',
    'atrium-display-tower',
    'atrium-reception-desk',
  ])
  for (const recipe of recipeNames(kitBundle.manifest)) {
    const budget = atriumArchitecturalRecipes.has(recipe)
      ? TRIANGLE_BUDGET.shell
      : atriumHeroRecipes.has(recipe)
        ? TRIANGLE_BUDGET.hero
        : TRIANGLE_BUDGET.prop
    const problem = checkRecipeBudget(kitBundle.manifest, recipe, budget)
    if (problem) problems.push(problem)
  }
  bundles.push(kitBundle)

  // -------------------------------------------------------------------------
  // Exhibit bundles — selected by each room's data, generated from one shared
  // recipe registry. Empty rooms emit no download at all.
  // -------------------------------------------------------------------------
  const exhibitById = new Map(MUSEUM.exhibits.map((exhibit) => [exhibit.id, exhibit]))
  for (const room of MUSEUM.rooms) {
    const recipes = [
      ...new Set(
        room.exhibitIds.map((exhibitId) => {
          const exhibit = exhibitById.get(exhibitId)
          if (!exhibit) {
            throw new Error(`Room "${room.id}" references unknown exhibit "${exhibitId}".`)
          }
          return exhibit.recipe
        }),
      ),
    ]
    if (recipes.length === 0) continue

    console.log(`\n${room.id} exhibits:`)
    const exhibitParts = []
    const budgetByRecipe = new Map()
    for (const recipe of recipes) {
      const built = buildExhibitRecipe(recipe)
      exhibitParts.push(...built.parts)
      budgetByRecipe.set(recipe, built.budget)
    }

    const exhibitBundle = await bakeBundle(`exhibits-${room.id}`, exhibitParts)
    for (const recipe of recipeNames(exhibitBundle.manifest)) {
      const problem = checkRecipeBudget(
        exhibitBundle.manifest,
        recipe,
        budgetByRecipe.get(recipe),
      )
      if (problem) problems.push(problem)
    }
    bundles.push(exhibitBundle)
  }

  // -------------------------------------------------------------------------

  await pruneStale(
    [
      ...new Set([
        ...bundles.map((bundle) => bundle.name),
        ...MUSEUM.rooms.map((room) => `exhibits-${room.id}`),
      ]),
    ],
    new Set(bundles.map((bundle) => bundle.url.split('/').pop())),
  )

  const totalBytes = bundles.reduce((total, bundle) => total + bundle.bytes, 0)
  const totalTriangles = bundles.reduce(
    (total, bundle) => total + bundle.manifest.reduce((sum, part) => sum + part.triangles, 0),
    0,
  )

  const module = `/**
 * GENERATED FILE — do not edit.
 *
 * Produced by \`npm run bake\`. Describes what the procedural generators
 * actually emitted: node names, bounds, triangle counts and collider
 * primitives. The runtime reads this instead of guessing at GLB structure,
 * which is why this project does not use gltfjsx — the bake authored the file,
 * so the structure is already known.
 */

export type BakedBounds = {
  readonly min: readonly [number, number, number]
  readonly max: readonly [number, number, number]
  readonly size: readonly [number, number, number]
  readonly centre: readonly [number, number, number]
}

export type BakedCollider = {
  readonly kind: 'box'
  readonly halfExtents: readonly [number, number, number]
  readonly centre: readonly [number, number, number]
}

export type BakedPart = {
  readonly name: string
  readonly material: string
  readonly bounds: BakedBounds
  readonly triangles: number
  readonly collider?: BakedCollider
}

export type BakedBundle = {
  readonly name: string
  readonly url: string
  readonly bytes: number
  readonly parts: readonly BakedPart[]
}

export type BakedTextureSet = {
  /** sRGB. */
  readonly albedo: string
  /** Linear data — must NOT be decoded as sRGB. */
  readonly normal: string
  /** Linear data. Occlusion in R, roughness in G, metalness in B. */
  readonly orm: string
}

/**
 * Runtime material definitions. The GLBs carry plain colour placeholders; the
 * runtime looks a part's material up here and builds the real textured
 * material, so shared textures are downloaded and uploaded to the GPU once.
 */
export type BakedMaterial = {
  readonly baseColor: readonly [number, number, number, number]
  readonly roughness: number
  readonly metalness: number
  readonly clearcoat?: number
  readonly clearcoatRoughness?: number
  readonly emissive?: readonly [number, number, number]
  readonly emissiveIntensity?: number
  readonly alphaMode?: string
  readonly textures?: BakedTextureSet
}

export const BAKED_BUNDLES = ${JSON.stringify(
    bundles.map((bundle) => ({
      name: bundle.name,
      url: bundle.url,
      bytes: bundle.bytes,
      parts: bundle.manifest,
    })),
    null,
    2,
  )} as const satisfies readonly BakedBundle[]

export const BAKED_MATERIALS = ${JSON.stringify(
    Object.fromEntries(
      Object.entries(MATERIALS).map(([key, spec]) => {
        const textureId = MATERIAL_TEXTURES[key]
        const set = textureId ? textureSets[textureId] : null
        // Textured materials get their colour from the albedo map; the factor
        // is a tint on top of it and stays neutral unless declared. Untextured
        // ones have nothing but the factor, so they keep their full colour.
        const factor = set
          ? [...(spec.tint ?? [1, 1, 1]), spec.baseColor[3]]
          : spec.baseColor
        return [
          key,
          {
            baseColor: factor,
            roughness: spec.roughness,
            metalness: spec.metallic,
            ...(spec.clearcoat ? { clearcoat: spec.clearcoat } : {}),
            ...(spec.clearcoatRoughness ? { clearcoatRoughness: spec.clearcoatRoughness } : {}),
            ...(spec.emissive ? { emissive: spec.emissive } : {}),
            ...(spec.emissiveIntensity ? { emissiveIntensity: spec.emissiveIntensity } : {}),
            ...(spec.alphaMode ? { alphaMode: spec.alphaMode } : {}),
            ...(set
              ? {
                  textures: {
                    albedo: set.albedo.src,
                    normal: set.normal.src,
                    orm: set.orm.src,
                  },
                }
              : {}),
          },
        ]
      }),
    ),
    null,
    2,
  )} as const satisfies Record<string, BakedMaterial>

export const BAKE_TOTALS = {
  bytes: ${totalBytes},
  triangles: ${totalTriangles},
  textureBytes: ${textureBytes},
  /** Uncompressed VRAM with mips. The wire size says nothing about this. */
  textureVramBytes: ${Math.round(textureVram)},
} as const
`

  await writeFile(OUT_MANIFEST, module, 'utf8')

  console.log(
    `\nTotal: ${(totalBytes / 1024).toFixed(0)} KB across ${bundles.length} bundle(s), ` +
      `${totalTriangles.toLocaleString('en-US')} triangles`,
  )

  if (problems.length > 0) {
    console.error('\nBudget violations:')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`\nbake failed — ${error.message}`)
  console.error(error.stack)
  process.exitCode = 1
})
