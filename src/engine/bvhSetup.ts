/**
 * Installs three-mesh-bvh's prototype extensions.
 *
 * Its own module, imported for its side effect, so the patch is guaranteed to
 * be in place before any component that calls `geometry.computeBoundsTree()`.
 * Hanging it off whichever component happened to need it first is a load-order
 * bug waiting to happen.
 *
 * The split matters and is easy to get backwards:
 *   - `computeBoundsTree` / `disposeBoundsTree` belong to BufferGeometry.
 *   - `raycast` belongs to Mesh.
 *
 * Putting the first pair on Mesh.prototype makes `geometry.computeBoundsTree`
 * undefined, and the resulting TypeError takes the whole scene down — the
 * canvas never mounts and nothing is rendered at all.
 */

import { BufferGeometry, Mesh } from 'three'
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh'

/**
 * Assigned through a cast because two copies of three-mesh-bvh's module
 * augmentation are in scope — the package itself, and the one bundled inside
 * three-stdlib, which drei depends on. They declare the same methods with
 * different return types (`GeometryBVH` against `MeshBVH`), so the merged
 * interface cannot be satisfied by either implementation even though there is
 * only one at runtime. Reading `geometry.computeBoundsTree()` elsewhere still
 * type-checks against the merged declaration; only the install needs the cast.
 */
const geometryPrototype = BufferGeometry.prototype as unknown as Record<string, unknown>
geometryPrototype.computeBoundsTree = computeBoundsTree
geometryPrototype.disposeBoundsTree = disposeBoundsTree

Mesh.prototype.raycast = acceleratedRaycast

/** Imported by modules that only need the side effect, to keep it explicit. */
export const BVH_INSTALLED = true
