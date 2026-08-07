/**
 * three.js BufferGeometry -> glTF Document -> optimised GLB.
 *
 * Deliberately NOT using three's GLTFExporter: it reaches for
 * `document.createElement('canvas')` on the texture path and expects a DOM.
 * Building the glTF Document directly with @gltf-transform/core keeps the bake
 * headless, gives full control over accessors and materials, and produces the
 * manifest as a by-product.
 *
 * Compression is EXT_meshopt_compression, not Draco. Measured decoder payloads
 * on this three version: meshopt 7,719 B gzip against Draco's ~75,098 B gzip
 * (wasm + wrapper). Ten times the decoder weight for a modestly better ratio
 * and slower decode is a bad trade for a museum whose geometry is mostly flat
 * architectural planes.
 */

import { Document, NodeIO } from '@gltf-transform/core'
import {
  EXTMeshoptCompression,
  KHRMaterialsClearcoat,
  KHRMeshQuantization,
} from '@gltf-transform/extensions'
import { dedup, prune, quantize, reorder, weld } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'

import { boundsOf, triangleCount } from './geometry.mjs'

/**
 * @typedef {object} BakePart
 * @property {string} name
 * @property {import('three').BufferGeometry} geometry
 * @property {string} material   Key into the material library.
 * @property {object} [collider] Optional collider primitive for the manifest.
 */

/**
 * The shared material library. Thirteen materials for the whole building —
 * every extra one is another shader program, and the budget is 25 total.
 *
 * Clearcoat is the cheapest "expensive" look available and is used sparingly on
 * varnished wood and brass. Transmission is deliberately absent: three renders
 * a separate transmission pass per transmissive batch, so vitrine glass is
 * faked with a low-opacity, low-roughness, high-IOR surface instead — visually
 * indistinguishable at the near-normal incidence a visitor actually sees.
 */
/**
 * `baseColor` is the glTF placeholder factor — what the material looks like in
 * a viewer that has never seen the separate texture files.
 *
 * `tint` is what the RUNTIME multiplies onto the albedo map, and it defaults to
 * white on purpose. Reusing `baseColor` for both tinted the surface twice: a
 * mid-brown oak texture scaled by a mid-brown factor lands at roughly a quarter
 * of the intended reflectance, which is why the atrium plinth rendered as a
 * black slab while its material log looked perfectly healthy. A tint is only
 * spelled out where two materials share one texture and must not look alike.
 */
export const MATERIALS = {
  'plaster': { baseColor: [0.847, 0.827, 0.776, 1], roughness: 0.92, metallic: 0 },
  'plaster-dark': { baseColor: [0.42, 0.40, 0.38, 1], roughness: 0.94, metallic: 0, tint: [0.50, 0.49, 0.48] },
  'oak-varnished': { baseColor: [0.478, 0.322, 0.176, 1], roughness: 0.42, metallic: 0, clearcoat: 0.55, clearcoatRoughness: 0.12 },
  'oak-matte': { baseColor: [0.376, 0.259, 0.153, 1], roughness: 0.78, metallic: 0, tint: [0.86, 0.84, 0.82] },
  'maple-floor': { baseColor: [0.710, 0.475, 0.235, 1], roughness: 0.55, metallic: 0, clearcoat: 0.35, clearcoatRoughness: 0.2 },
  'brass': { baseColor: [0.788, 0.635, 0.153, 1], roughness: 0.28, metallic: 0.92, clearcoat: 0.4, clearcoatRoughness: 0.08 },
  'iron-cast': { baseColor: [0.157, 0.149, 0.141, 1], roughness: 0.62, metallic: 0.75 },
  'leather-tan': { baseColor: [0.788, 0.627, 0.416, 1], roughness: 0.58, metallic: 0 },
  'leather-worn': { baseColor: [0.545, 0.353, 0.173, 1], roughness: 0.68, metallic: 0, tint: [0.62, 0.55, 0.44] },
  'canvas': { baseColor: [0.851, 0.796, 0.678, 1], roughness: 0.88, metallic: 0 },
  'cord-hemp': { baseColor: [0.741, 0.678, 0.541, 1], roughness: 0.9, metallic: 0, tint: [0.84, 0.80, 0.70] },
  // Barrier rope. Deep crimson because it is the only saturated colour in a
  // building of plaster, oak and brass, and the eye goes straight to it —
  // which is exactly where the hub's landmark is.
  'rope-velvet': { baseColor: [0.34, 0.055, 0.075, 1], roughness: 0.86, metallic: 0, tint: [0.46, 0.075, 0.10] },
  'glass-vitrine': { baseColor: [0.86, 0.90, 0.90, 0.14], roughness: 0.03, metallic: 0, alphaMode: 'BLEND' },
}

function createMaterials(doc) {
  const clearcoatExt = doc.createExtension(KHRMaterialsClearcoat)
  const byKey = new Map()

  for (const [key, spec] of Object.entries(MATERIALS)) {
    const material = doc
      .createMaterial(key)
      .setBaseColorFactor(spec.baseColor)
      .setRoughnessFactor(spec.roughness)
      .setMetallicFactor(spec.metallic)

    if (spec.alphaMode) material.setAlphaMode(spec.alphaMode)
    if (spec.doubleSided) material.setDoubleSided(true)

    if (spec.clearcoat) {
      material.setExtension(
        'KHR_materials_clearcoat',
        clearcoatExt
          .createClearcoat()
          .setClearcoatFactor(spec.clearcoat)
          .setClearcoatRoughnessFactor(spec.clearcoatRoughness ?? 0.1),
      )
    }

    byKey.set(key, material)
  }

  return byKey
}

/** Copies a three BufferGeometry into glTF accessors on the given buffer. */
function addPrimitive(doc, buffer, geometry, material) {
  const position = geometry.attributes.position
  const normal = geometry.attributes.normal
  const uv = geometry.attributes.uv

  const primitive = doc.createPrimitive().setMaterial(material)

  primitive.setAttribute(
    'POSITION',
    doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array(position.array))
      .setBuffer(buffer),
  )

  if (normal) {
    primitive.setAttribute(
      'NORMAL',
      doc
        .createAccessor()
        .setType('VEC3')
        .setArray(new Float32Array(normal.array))
        .setBuffer(buffer),
    )
  }

  if (uv) {
    primitive.setAttribute(
      'TEXCOORD_0',
      doc
        .createAccessor()
        .setType('VEC2')
        .setArray(new Float32Array(uv.array))
        .setBuffer(buffer),
    )
  }

  if (geometry.index) {
    // glTF wants unsigned indices; three may hand back either width.
    const count = position.count
    const IndexArray = count > 65_535 ? Uint32Array : Uint16Array
    primitive.setIndices(
      doc
        .createAccessor()
        .setType('SCALAR')
        .setArray(new IndexArray(geometry.index.array))
        .setBuffer(buffer),
    )
  }

  return primitive
}

/**
 * Writes a GLB containing one node per part, and returns the manifest entry
 * for each: node name, bounds, triangle count and any collider primitive.
 *
 * The manifest is why this project does not use gltfjsx. gltfjsx exists to
 * reverse-engineer structure out of an artist's file you did not author; when
 * the bake authored the file, the structure is already known and round-tripping
 * it through a code generator loses information rather than adding it.
 */
export async function writeGLB(parts) {
  await MeshoptEncoder.ready

  const doc = new Document()
  const buffer = doc.createBuffer()
  const scene = doc.createScene('museum')
  const materials = createMaterials(doc)
  const manifest = []

  for (const part of parts) {
    const material = materials.get(part.material)
    if (!material) {
      throw new Error(`Part "${part.name}" asks for unknown material "${part.material}".`)
    }

    const primitive = addPrimitive(doc, buffer, part.geometry, material)
    const mesh = doc.createMesh(part.name).addPrimitive(primitive)
    const node = doc.createNode(part.name).setMesh(mesh)
    scene.addChild(node)

    manifest.push({
      name: part.name,
      material: part.material,
      bounds: boundsOf(part.geometry),
      triangles: triangleCount(part.geometry),
      ...(part.collider ? { collider: part.collider } : {}),
    })
  }

  // Order matters: weld before reorder so the vertex-cache optimiser is working
  // on the final topology; quantize after reorder so it sees the final vertex
  // order; prune last so it sweeps anything the earlier passes orphaned.
  //
  // `quantize()` is the step that is easy to miss. Setting the meshopt encoder
  // method to QUANTIZE only tells the encoder that its input is already
  // quantized — it does not do the quantizing. Without this transform every
  // attribute ships as float32 and the extension buys far less than it should:
  // measured on this kit, a 3,800-triangle room shell came out at 102 KB
  // instead of the 35 KB it should be.
  //
  // Deliberately no `simplify()`: the bake controls tessellation at generation
  // time, and running a decimator over hand-tuned bevels quietly deletes the
  // very edge loops that make the geometry look non-programmatic.
  await doc.transform(
    weld({ tolerance: 1e-4 }),
    reorder({ encoder: MeshoptEncoder, target: 'performance' }),
    quantize({
      quantizePosition: 14,
      quantizeNormal: 10,
      quantizeTexcoord: 12,
    }),
    dedup(),
    // keepAttributes is essential here and the default would silently break the
    // build. This project ships textures as separate files rather than embedded
    // in the GLB (the same oak appears in three bundles, and embedding would
    // triple the bytes and defeat per-file caching), so from glTF's point of
    // view no material references a texture and every TEXCOORD_0 looks like
    // dead weight. prune() duly deletes them, the GLB still loads, and the
    // runtime then applies textures to geometry with no UVs at all.
    prune({ keepAttributes: true }),
  )

  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE })

  // KHR_mesh_quantization must be registered or the writer drops it with only a
  // vague "Some extensions were not registered for I/O" line. quantize() adds
  // the extension to the document because 16-bit attribute types are outside
  // core glTF; a file that uses them without declaring it is malformed, and
  // loaders are entitled to reject or misread it.
  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMaterialsClearcoat, KHRMeshQuantization])
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': null })

  const glb = await io.writeBinary(doc)
  return { glb, manifest }
}
