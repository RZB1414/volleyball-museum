/**
 * Capsule-versus-world collision, built on three-mesh-bvh.
 *
 * WHY NOT RAPIER. The previous build used @react-three/rapier, and measuring
 * the bundle showed its base64-inlined WebAssembly was 803 KB of a 1,274 KB
 * gzip payload — 63% of everything the player downloads, inlined into the entry
 * chunk so it blocks first paint and cannot stream-compile. A museum needs a
 * capsule sliding against static walls and stepping over thresholds. That is
 * this file, and it costs ~7 KB.
 *
 * The approach is the standard three-mesh-bvh character pattern: push the
 * capsule out of every triangle it overlaps, then read the accumulated push to
 * decide whether we are standing on something. Deliberately no rigid bodies, no
 * solver, no fixed timestep — nothing in a museum needs them.
 *
 * Pure module, no React and no three.js scene graph, so it can be exercised
 * headlessly in tests. Given the agent building this cannot watch the player
 * walk, that is the only way the claim above gets verified.
 */

import { Box3, BufferAttribute, Line3, MathUtils, Matrix4, Mesh, Vector3 } from 'three'
import type { BufferGeometry } from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import type { ExtendedTriangle, ShapecastCallbacks } from 'three-mesh-bvh'

export type CapsuleSpec = {
  /** Distance from the capsule axis to the surface. */
  readonly radius: number
  /** Total standing height, floor to crown. */
  readonly height: number
}

export type MoveResult = {
  /** Where the capsule's foot ended up. */
  readonly position: Vector3
  /** Vertical velocity after the step, for the caller to carry forward. */
  readonly verticalVelocity: number
  readonly grounded: boolean
  /** True when the horizontal move was blocked and the step-up retry saved it. */
  readonly stepped: boolean
}

/** Reusable output for callers that run several physics substeps per frame. */
export type MoveResultBuffer = {
  position: Vector3
  verticalVelocity: number
  grounded: boolean
  stepped: boolean
}

type ResolveResult = {
  push: Vector3
  groundNormalY: number
  contacts: number
}

const GRAVITY = -22
/** Anything steeper than this is a wall, not a ramp. ~48 degrees. */
const MIN_GROUND_NORMAL_Y = 0.67
/** Thresholds and the odd shallow step. Matches the old Rapier autostep. */
const MAX_STEP_HEIGHT = 0.22
/**
 * Downward speed applied while grounded, in metres per second, to keep the
 * capsule pressed into the floor so `grounded` stays true between frames.
 *
 * It must be a SPEED, not a per-frame distance. The first version of this
 * returned `-SKIN / delta` — "move two millimetres this frame" — which as a
 * velocity blows up as the frame time shrinks: at a delta of 1e-4 it is 20 m/s
 * downward, and the next normal-length frame carries the player straight
 * through the floor. That is a units error, and it only bites when frame times
 * are uneven, which is exactly what happens in the first second after a scene
 * loads. The player would stand up fine, then drop out of the building.
 */
const GROUND_STICK_SPEED = 1

/** No single step may integrate more time than this, however long the frame was. */
const MAX_STEP_DELTA = 1 / 30
/** Caps how fast a fall can get, so a long drop cannot outrun the resolve pass. */
const TERMINAL_VELOCITY = 25

/**
 * Rewrites a quantized POSITION attribute as plain float32, in place.
 *
 * This is not an optimisation — without it the collision geometry is silently
 * wrong. Baked geometry stores positions as NORMALIZED int16 (KHR_mesh_-
 * quantization), and `BufferGeometry.applyMatrix4` writes its results straight
 * back into that attribute's typed array. A normalized int16 can only hold
 * -1..1, so scaling an 18 m room by its node scale of 9 clamps every coordinate
 * that leaves the range.
 *
 * The failure is beautifully misleading: the atrium floor came back with x and
 * z clamped to ±1 while y — whose values were small enough to survive — was
 * perfectly correct, which looks impossible for a uniform scale and sends you
 * hunting for a bug in the matrix instead.
 *
 * `getX/Y/Z` denormalize on read, so this is also the correct way to read them.
 */
function dequantizePositions(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.attributes.position
  if (position.array instanceof Float32Array && !position.normalized) return geometry

  const floats = new Float32Array(position.count * 3)
  for (let index = 0; index < position.count; index += 1) {
    floats[index * 3] = position.getX(index)
    floats[index * 3 + 1] = position.getY(index)
    floats[index * 3 + 2] = position.getZ(index)
  }

  geometry.setAttribute('position', new BufferAttribute(floats, 3))
  // Normals are quantized too and the BVH never reads them.
  geometry.deleteAttribute('normal')
  geometry.deleteAttribute('uv')
  return geometry
}

/**
 * Static collision world. Build once per room set; the BVH is the expensive
 * part and is entirely reusable across frames.
 */
export class CollisionWorld {
  private readonly bvhs: { bvh: MeshBVH; geometry: BufferGeometry; bounds: Box3 }[] = []

  /**
   * @param geometry Collision geometry in its own local space.
   * @param matrix   Local-to-world transform for that geometry.
   * @returns A disposer that removes this collider again.
   *
   * The geometry is BAKED INTO WORLD SPACE here rather than the capsule being
   * transformed into each collider's local space per frame. That is deliberate,
   * and it removes a whole class of bug rather than fixing one instance of it.
   *
   * Baked room geometry is quantized: KHR_mesh_quantization stores positions as
   * normalized int16 and restores the real size through a NODE SCALE — the
   * atrium floor arrives as a 2-unit square with `scale: [9,9,9]` on its node.
   * Transforming the capsule into that space instead scales the segment down by
   * nine while the capsule RADIUS stays in metres, so a 0.3 m radius silently
   * becomes a 2.7 m one and the player gets shoved into the air by triangles
   * metres away. Every collider having its own scale means there is no single
   * radius that is correct for all of them.
   *
   * Pre-transforming costs one geometry clone per collider at load time, on
   * static rooms that never move, and makes the per-frame path both simpler and
   * faster: no matrix work at all inside the loop.
   */
  add(geometry: BufferGeometry, matrix = new Matrix4()) {
    const world = dequantizePositions(geometry.clone()).applyMatrix4(matrix)
    world.computeBoundingBox()

    const entry = {
      bvh: new MeshBVH(world),
      geometry: world,
      // `computeBoundingBox` above guarantees this. Keeping the reference on
      // the entry makes it the cheap broadphase before entering a BVH at all.
      bounds: world.boundingBox as Box3,
    }
    this.bvhs.push(entry)

    return () => {
      const index = this.bvhs.indexOf(entry)
      if (index >= 0) this.bvhs.splice(index, 1)
      entry.geometry.dispose()
    }
  }

  get size() {
    return this.bvhs.length
  }

  /**
   * Per-collider contact report at a given capsule position. Diagnostic only —
   * this is how "the player is stuck but I cannot see why" gets answered
   * without a debugger.
   */
  probe(position: Vector3, capsule: CapsuleSpec) {
    return this.bvhs.map((entry, index) => {
      const single = new CollisionWorld()
      single.bvhs.push(entry)
      const result = single.resolve(position, capsule, new Vector3())
      const box = entry.bounds
      return {
        index,
        contacts: result.contacts,
        push: result.push.toArray().map((n) => Number(n.toFixed(3))),
        groundNormalY: Number(result.groundNormalY.toFixed(3)),
        bounds: `[${box.min.toArray().map((n) => n.toFixed(1))}]..[${box.max.toArray().map((n) => n.toFixed(1))}]`,
      }
    })
  }

  /** World-space bounds of every collider. Diagnostic only. */
  describe() {
    return this.bvhs.map((entry) => {
      const box = entry.bounds
      const round = (value: number) => Number(value.toFixed(2))
      return {
        min: [round(box.min.x), round(box.min.y), round(box.min.z)],
        max: [round(box.max.x), round(box.max.y), round(box.max.z)],
      }
    })
  }

  /** Scratch objects, reused every frame — this runs 60+ times a second. */
  private readonly tempBox = new Box3()
  private readonly tempSegment = new Line3()
  private readonly tempVector = new Vector3()
  private readonly triPoint = new Vector3()
  private readonly capsulePoint = new Vector3()
  private readonly pushTotal = new Vector3()
  private readonly overlapPush = new Vector3()
  private readonly overlapResult: ResolveResult = {
    push: this.overlapPush,
    groundNormalY: 0,
    contacts: 0,
  }
  private activeRadius = 0
  private activeGroundNormalY = 0
  private activeContacts = 0

  /**
   * One callback object for the lifetime of the world. `resolve` used to
   * allocate this object and both closures once per collider, per resolve â€” a
   * particularly expensive pattern when autostep probes several positions in
   * one visual frame.
   */
  private readonly shapecastCallbacks: ShapecastCallbacks = {
    intersectsBounds: (box) => box.intersectsBox(this.tempBox),
    intersectsTriangle: (tri: ExtendedTriangle) => {
      const distance = tri.closestPointToSegment(
        this.tempSegment,
        this.triPoint,
        this.capsulePoint,
      )

      if (distance >= this.activeRadius) return false

      const depth = this.activeRadius - distance
      const direction = this.tempVector.copy(this.capsulePoint).sub(this.triPoint)

      // A capsule centre exactly on the triangle plane gives a zero-length
      // direction. Fall back to the face normal rather than producing NaN.
      if (direction.lengthSq() < 1e-12) {
        tri.getNormal(direction)
      } else {
        direction.normalize()
      }

      // Move the working segment so subsequent triangles see the correction.
      this.tempSegment.start.addScaledVector(direction, depth)
      this.tempSegment.end.addScaledVector(direction, depth)
      this.pushTotal.addScaledVector(direction, depth)

      if (direction.y > this.activeGroundNormalY) {
        this.activeGroundNormalY = direction.y
      }
      this.activeContacts += 1
      return false
    },
  }

  /**
   * Resolves a capsule at `position` (foot) out of the world.
   *
   * Returns the accumulated push vector and the steepest upward-facing normal
   * encountered, which is what tells the caller whether it is standing on a
   * floor, a ramp, or nothing.
   */
  resolve(
    position: Vector3,
    capsule: CapsuleSpec,
    out = new Vector3(),
    result?: ResolveResult,
  ): ResolveResult {
    const { radius, height } = capsule
    this.pushTotal.set(0, 0, 0)
    this.activeRadius = radius
    this.activeGroundNormalY = 0
    this.activeContacts = 0

    // The capsule's inner segment: from the centre of the bottom sphere to the
    // centre of the top sphere.
    this.tempSegment.start.set(position.x, position.y + radius, position.z)
    this.tempSegment.end.set(position.x, position.y + height - radius, position.z)

    // Colliders are stored in world space, so the capsule needs no transform
    // and the box can be built once outside the loop.
    this.tempBox.makeEmpty()
    this.tempBox.expandByPoint(this.tempSegment.start)
    this.tempBox.expandByPoint(this.tempSegment.end)
    this.tempBox.min.addScalar(-radius)
    this.tempBox.max.addScalar(radius)

    for (const entry of this.bvhs) {
      // Most museum colliders are furniture or architecture in another part
      // of the room. Reject their world AABB before entering the BVH.
      if (!entry.bounds.intersectsBox(this.tempBox)) continue
      entry.bvh.shapecast(this.shapecastCallbacks)
    }

    out.copy(this.pushTotal)
    const resolved = result ?? { push: out, groundNormalY: 0, contacts: 0 }
    resolved.push = out
    resolved.groundNormalY = this.activeGroundNormalY
    resolved.contacts = this.activeContacts
    return resolved
  }

  /** True when a capsule at this position overlaps anything. */
  intersects(position: Vector3, capsule: CapsuleSpec): boolean {
    return this.resolve(position, capsule, this.overlapPush, this.overlapResult).contacts > 0
  }

  /** True only when the capsule touches a walkable upward-facing surface. */
  hasWalkableSupport(position: Vector3, capsule: CapsuleSpec): boolean {
    return (
      this.resolve(position, capsule, this.overlapPush, this.overlapResult).groundNormalY >=
      MIN_GROUND_NORMAL_Y
    )
  }
}

const scratchPush = new Vector3()
const scratchTarget = new Vector3()
const scratchStepped = new Vector3()
const scratchSettle = new Vector3()
const scratchRaisedPush = new Vector3()
const scratchSettlePush = new Vector3()
const scratchResolved: ResolveResult = { push: scratchPush, groundNormalY: 0, contacts: 0 }
const scratchRaisedResolved: ResolveResult = {
  push: scratchRaisedPush,
  groundNormalY: 0,
  contacts: 0,
}
const scratchSettleResolved: ResolveResult = {
  push: scratchSettlePush,
  groundNormalY: 0,
  contacts: 0,
}

// These buffers make `movePlayer` intentionally non-reentrant, as it already
// was before the optimisation. The runtime has one player and calls substeps
// sequentially. The default return still owns its cloned position; a hot-loop
// caller may supply a MoveResultBuffer and must consume/copy it before reusing
// that same buffer.

/**
 * Advances the player one frame.
 *
 * Order of operations matters:
 *   1. Apply gravity to vertical velocity and build the desired displacement.
 *   2. Move, then resolve out of geometry.
 *   3. If the horizontal move was substantially eaten by the resolve — i.e. we
 *      walked into something — retry the same move from MAX_STEP_HEIGHT higher
 *      and drop back down. That is the entire step-up mechanic, and it is what
 *      carries thresholds and the odd shallow stair without a physics engine.
 */
export function movePlayer(
  world: CollisionWorld,
  position: Vector3,
  displacement: Vector3,
  verticalVelocity: number,
  rawDelta: number,
  capsule: CapsuleSpec,
  out?: MoveResultBuffer,
): MoveResult {
  // Clamped HERE rather than only in the caller. A collision routine that
  // depends on its caller passing a sane timestep is a trap: one long frame
  // from a tab restore, a GC pause or a shader compile and the player is a
  // hundred metres below the building.
  const delta = Math.min(Math.max(rawDelta, 0), MAX_STEP_DELTA)

  const nextVerticalVelocity = Math.max(
    verticalVelocity + GRAVITY * delta,
    -TERMINAL_VELOCITY,
  )

  // Hard cap on how far one step may move, in metres. Nothing may travel more
  // than a fraction of the capsule radius per step, because the resolve pass
  // can only push the capsule out of geometry it actually overlaps — move
  // further than the capsule is wide and it passes clean through.
  const maxStep = capsule.radius * 0.8
  const horizontal = Math.hypot(displacement.x, displacement.z)
  const horizontalScale = horizontal > maxStep ? maxStep / horizontal : 1
  const verticalStep = MathUtils.clamp(nextVerticalVelocity * delta, -maxStep, maxStep)

  scratchTarget.set(
    position.x + displacement.x * horizontalScale,
    position.y + verticalStep,
    position.z + displacement.z * horizontalScale,
  )

  const resolved = world.resolve(scratchTarget, capsule, scratchPush, scratchResolved)
  scratchTarget.add(resolved.push)

  const grounded = resolved.groundNormalY >= MIN_GROUND_NORMAL_Y
  let stepped = false

  // How much of the intended horizontal move actually happened.
  const intendedHorizontal = horizontal * horizontalScale
  const achievedHorizontal = Math.hypot(
    scratchTarget.x - position.x,
    scratchTarget.z - position.z,
  )

  if (
    intendedHorizontal > 1e-4 &&
    achievedHorizontal < intendedHorizontal * 0.7 &&
    (grounded || resolved.contacts > 0)
  ) {
    // Step-up retry: lift, move, then settle straight down onto whatever is
    // there. If the raised attempt also fails, keep the original result.
    scratchStepped.set(
      position.x + displacement.x * horizontalScale,
      position.y + MAX_STEP_HEIGHT,
      position.z + displacement.z * horizontalScale,
    )

    const raised = world.resolve(
      scratchStepped,
      capsule,
      scratchRaisedPush,
      scratchRaisedResolved,
    )
    scratchStepped.add(raised.push)

    const raisedHorizontal = Math.hypot(
      scratchStepped.x - position.x,
      scratchStepped.z - position.z,
    )

    if (raisedHorizontal > achievedHorizontal + 1e-4) {
      /**
       * Settle in one direct probe first. Most successful steps are thresholds
       * whose top or the floor immediately catches this drop, turning the old
       * ten-resolve path into three resolves. A coarse incremental fallback is
       * retained for edges where a deep overlap chooses a side face instead.
       */
      scratchSettle.copy(scratchStepped)
      scratchSettle.y -= MAX_STEP_HEIGHT
      const direct = world.resolve(
        scratchSettle,
        capsule,
        scratchSettlePush,
        scratchSettleResolved,
      )
      scratchSettle.add(direct.push)

      const directHorizontal = Math.hypot(
        scratchSettle.x - position.x,
        scratchSettle.z - position.z,
      )
      const directLanded =
        direct.groundNormalY >= MIN_GROUND_NORMAL_Y &&
        directHorizontal > achievedHorizontal + 1e-4

      if (!directLanded) {
        scratchSettle.copy(scratchStepped)
        const settleSteps = 4
        const settleStep = MAX_STEP_HEIGHT / settleSteps
        for (let index = 0; index < settleSteps; index += 1) {
          scratchSettle.y -= settleStep
          const probe = world.resolve(
            scratchSettle,
            capsule,
            scratchSettlePush,
            scratchSettleResolved,
          )
          if (probe.groundNormalY >= MIN_GROUND_NORMAL_Y) {
            scratchSettle.add(probe.push)
            break
          }
        }
      }

      scratchTarget.copy(scratchSettle)
      stepped = true
    }
  }

  // Standing on something cancels the fall and replaces it with a constant,
  // frame-rate-independent press into the floor.
  const nextResultVelocity =
    grounded || stepped ? -GROUND_STICK_SPEED : nextVerticalVelocity
  const nextGrounded = grounded || stepped

  if (out) {
    out.position.copy(scratchTarget)
    out.verticalVelocity = nextResultVelocity
    out.grounded = nextGrounded
    out.stepped = stepped
    return out
  }

  return {
    position: scratchTarget.clone(),
    verticalVelocity: nextResultVelocity,
    grounded: nextGrounded,
    stepped,
  }
}

/** Convenience for tests and for building a world from a plain mesh list. */
export function worldFromMeshes(meshes: readonly Mesh[]): CollisionWorld {
  const world = new CollisionWorld()
  for (const mesh of meshes) {
    mesh.updateMatrixWorld(true)
    world.add(mesh.geometry, mesh.matrixWorld)
  }
  return world
}

export { GRAVITY, MAX_STEP_HEIGHT, MIN_GROUND_NORMAL_Y }
