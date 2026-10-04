import assert from 'node:assert/strict'

import {
  BoxGeometry,
  Group,
  ImageLoader,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector4,
} from 'three'

import {
  beginGpuWarmupDiscovery,
  cancelGpuWarmupRoot,
  createGeometryWarmupClone,
  createGpuWarmupScanState,
  disposeGpuWarmup,
  GPU_WARMUP_SCAN_INTERVAL_SECONDS,
  isGpuWarmupReady,
  markGpuWarmupDiscoveryComplete,
  queueGpuWarmup,
  scanGpuWarmupResources,
  scanNeedsShaderCompile,
  subscribeGpuWarmupReady,
} from '../src/engine/gpuWarmup.ts'
import { MediaTextureLoader } from '../src/engine/mediaTexture.ts'
import {
  advanceRoomDetailWait,
  ROOM_DETAIL_MAX_STEP_SECONDS,
  ROOM_DETAIL_TIMEOUT_SECONDS,
  ROOM_DETAIL_WAIT_IDLE,
  roomDetailWarmable,
  type RoomDetailWait,
} from '../src/engine/roomReadiness.ts'
import {
  createTransitionDoorState,
  inspectTransitionDoor,
  transitionDoor,
} from '../src/engine/transitionDoorState.ts'
import type { Object3D, WebGLRenderer } from 'three'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

type FakeRendererMetrics = {
  compiles: number
  draws: number
  uploads: number
}

type WarmupFailureStage = 'compile' | 'draw' | 'texture'

function createFakeRenderer(
  firstCompile?: Promise<Object3D>,
  failure?: WarmupFailureStage,
) {
  const metrics: FakeRendererMetrics = { compiles: 0, draws: 0, uploads: 0 }
  const renderInfo = { calls: 7, frame: 3, lines: 2, points: 1, triangles: 11 }
  let useFirstCompile = Boolean(firstCompile)
  const renderer = {
    compileAsync: (compileRoot: Object3D) => {
      metrics.compiles += 1
      if (useFirstCompile) {
        useFirstCompile = false
        return firstCompile!
      }
      if (failure === 'compile') return Promise.reject(new Error('compile failed'))
      return Promise.resolve(compileRoot)
    },
    getActiveCubeFace: () => 0,
    getActiveMipmapLevel: () => 0,
    getRenderTarget: () => null,
    getScissor: (target: Vector4) => target.set(0, 0, 640, 360),
    getScissorTest: () => false,
    getViewport: (target: Vector4) => target.set(0, 0, 640, 360),
    initTexture: () => {
      metrics.uploads += 1
      if (failure === 'texture') throw new Error('texture upload failed')
    },
    info: { render: renderInfo },
    render: () => {
      metrics.draws += 1
      renderInfo.calls += 1
      renderInfo.triangles += 12
      if (failure === 'draw') throw new Error('geometry warm-up draw failed')
    },
    setRenderTarget: () => undefined,
    setScissor: () => undefined,
    setScissorTest: () => undefined,
    setViewport: () => undefined,
  } as unknown as WebGLRenderer
  return { metrics, renderer, renderInfo }
}

async function waitUntil(predicate: () => boolean, message: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  assert.fail(message)
}

const root = new Group()
root.visible = false

const poster = new Texture()
const standard = new MeshStandardMaterial({ map: poster })
const shaderTexture = new Texture()
const shader = new ShaderMaterial({
  uniforms: {
    galleryPrint: { value: shaderTexture },
  },
})

root.add(new Mesh(new BoxGeometry(), standard))
root.add(new Mesh(new BoxGeometry(), [standard, shader]))

const state = createGpuWarmupScanState()
const first = scanGpuWarmupResources(root, state)
assert.equal(first.renderablesAdded, 2, 'inventories hidden renderables')
assert.equal(first.materialsAdded, 2, 'deduplicates shared material identities')
assert.deepEqual(
  new Set(first.textures),
  new Set([poster, shaderTexture]),
  'finds built-in maps and shader uniform textures',
)
assert.equal(scanNeedsShaderCompile(first), true)

const unchanged = scanGpuWarmupResources(root, state)
assert.equal(unchanged.renderablesAdded, 0, 'does not recompile an unchanged tree')
assert.equal(unchanged.materialsAdded, 0)
assert.equal(unchanged.textures.length, 0, 'does not enqueue the same upload twice')
assert.equal(scanNeedsShaderCompile(unchanged), false)

poster.needsUpdate = true
const revisedTexture = scanGpuWarmupResources(root, state)
assert.deepEqual(
  revisedTexture.textures,
  [poster],
  're-inventories a shared texture when its GPU version changes',
)

// Suspense may attach a mesh that reuses an existing material. Object identity
// still has to request compile because its shader defines can differ.
root.add(new Mesh(new BoxGeometry(), standard))
const lateMesh = scanGpuWarmupResources(root, state)
assert.equal(lateMesh.renderablesAdded, 1)
assert.equal(lateMesh.materialsAdded, 0)
assert.equal(scanNeedsShaderCompile(lateMesh), true)

// A decoded map can also appear on a material that was already inventoried.
const lateTexture = new Texture()
standard.normalMap = lateTexture
const lateMap = scanGpuWarmupResources(root, state)
assert.deepEqual(lateMap.textures, [lateTexture])
assert.equal(scanNeedsShaderCompile(lateMap), true)

const instanced = new InstancedMesh(new BoxGeometry(), standard, 1)
instanced.setMatrixAt(0, new Matrix4().makeTranslation(2, 0, 0))
root.add(instanced)
const geometryWarmup = createGeometryWarmupClone(root)
assert.equal(
  geometryWarmup.renderables.length,
  4,
  'creates one shallow proxy per renderable instead of moving the live tree',
)
const firstProxy = geometryWarmup.renderables[0] as Mesh
const firstSource = root.children[0] as Mesh
assert.equal(firstProxy.geometry, firstSource.geometry, 'shares live BufferGeometry identity')
assert.equal(firstProxy.material, firstSource.material, 'shares live material identity')
const instancedProxy = geometryWarmup.renderables[3]
assert.ok(instancedProxy instanceof InstancedMesh)
assert.equal(
  instancedProxy.instanceMatrix,
  instanced.instanceMatrix,
  'shares the live per-instance buffer instead of warming a clone-only buffer',
)
assert.ok(
  geometryWarmup.renderables.every(
    (renderable) => !renderable.visible && !renderable.frustumCulled,
  ),
  'proxies stay hidden until their individual one-pixel idle draw',
)

const reallocatingSource = new Mesh(new BoxGeometry(), standard)
const sourceGeometry = reallocatingSource.geometry
reallocatingSource.clone = () => new Mesh(new BoxGeometry(), standard)
const warmupReceivers: Object3D[] = []
reallocatingSource.onBeforeRender = function () {
  warmupReceivers.push(this)
}
const reallocatingRoot = new Group()
reallocatingRoot.add(reallocatingSource)
const reallocatingWarmup = createGeometryWarmupClone(reallocatingRoot)
const reallocatingProxy = reallocatingWarmup.renderables[0] as Mesh
assert.equal(
  reallocatingProxy.geometry,
  sourceGeometry,
  'custom clone implementations still warm the live geometry buffer',
)
reallocatingProxy.onBeforeRender(
  {} as WebGLRenderer,
  new Scene(),
  new PerspectiveCamera(),
  reallocatingProxy.geometry,
  standard,
  null,
)
assert.equal(
  warmupReceivers[0],
  reallocatingSource,
  'proxy render preparation executes against the live custom mesh',
)
reallocatingProxy.geometry = new BoxGeometry()
reallocatingProxy.geometry.dispose()
sourceGeometry.dispose()

assert.ok(
  GPU_WARMUP_SCAN_INTERVAL_SECONDS >= 0.5,
  'subtree inventory must stay at or below 2 Hz',
)

// Readiness is a per-root barrier, not merely "the queue was started". Hold
// compileAsync open while texture upload proceeds, then verify geometry and the
// explicit Suspense-discovery seal are both required.
const compileGate = deferred<Object3D>()
const readinessRenderer = createFakeRenderer(compileGate.promise)
const readinessRoot = new Group()
const readinessTexture = new Texture()
readinessRoot.add(
  new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: readinessTexture })),
  new Mesh(new BoxGeometry(), new MeshStandardMaterial()),
)
const readinessState = createGpuWarmupScanState()
const readinessScan = scanGpuWarmupResources(readinessRoot, readinessState)
const readinessTransitions: boolean[] = []
const unsubscribeReadiness = subscribeGpuWarmupReady(
  readinessRenderer.renderer,
  readinessRoot,
  (ready) => readinessTransitions.push(ready),
)
queueGpuWarmup(
  readinessRenderer.renderer,
  {
    camera: new PerspectiveCamera(),
    compileShaders: true,
    root: readinessRoot,
    targetScene: new Scene(),
    uploadGeometry: true,
  },
  readinessScan.textures,
)

await waitUntil(
  () => readinessRenderer.metrics.uploads === 1,
  'texture upload should run while parallel shader compilation is pending',
)
assert.equal(readinessRenderer.metrics.draws, 0, 'geometry waits for compileAsync')
assert.equal(isGpuWarmupReady(readinessRenderer.renderer, readinessRoot), false)

compileGate.resolve(readinessRoot)
await waitUntil(
  () => readinessRenderer.metrics.draws === 2,
  'every discovered renderable should receive its one-pixel draw',
)
assert.deepEqual(
  readinessRenderer.renderInfo,
  { calls: 7, frame: 3, lines: 2, points: 1, triangles: 11 },
  'private one-pixel draws restore the museum frame counters',
)
assert.equal(
  isGpuWarmupReady(readinessRenderer.renderer, readinessRoot),
  false,
  'zero pending GPU work is not ready before every Suspense boundary commits',
)
markGpuWarmupDiscoveryComplete(readinessRenderer.renderer, readinessRoot)
assert.equal(isGpuWarmupReady(readinessRenderer.renderer, readinessRoot), true)
assert.deepEqual(readinessTransitions, [false, true])

beginGpuWarmupDiscovery(readinessRenderer.renderer, readinessRoot)
assert.equal(
  isGpuWarmupReady(readinessRenderer.renderer, readinessRoot),
  false,
  'a new text/asset generation revokes previously published readiness',
)
markGpuWarmupDiscoveryComplete(readinessRenderer.renderer, readinessRoot)
assert.equal(isGpuWarmupReady(readinessRenderer.renderer, readinessRoot), true)
assert.deepEqual(readinessTransitions, [false, true, false, true])

// A late Suspense commit starts a new generation synchronously. The root may
// become ready again only after the new texture, compile and expanded geometry
// pass have all completed.
const lateReadinessTexture = new Texture()
readinessRoot.add(
  new Mesh(
    new BoxGeometry(),
    new MeshStandardMaterial({ map: lateReadinessTexture }),
  ),
)
const lateReadinessScan = scanGpuWarmupResources(readinessRoot, readinessState)
queueGpuWarmup(
  readinessRenderer.renderer,
  {
    camera: new PerspectiveCamera(),
    compileShaders: true,
    root: readinessRoot,
    targetScene: new Scene(),
    uploadGeometry: true,
  },
  lateReadinessScan.textures,
)
assert.equal(
  isGpuWarmupReady(readinessRenderer.renderer, readinessRoot),
  false,
  'late resources invalidate the published generation immediately',
)
await waitUntil(
  () => isGpuWarmupReady(readinessRenderer.renderer, readinessRoot),
  'late generation should publish ready after all of its work completes',
)
assert.equal(readinessRenderer.metrics.uploads, 2)
assert.equal(readinessRenderer.metrics.draws, 5)
assert.deepEqual(readinessTransitions, [false, true, false, true, false, true])
unsubscribeReadiness()
disposeGpuWarmup(readinessRenderer.renderer)

// Every eager path is opportunistic. Once an attempted operation settles, a
// failure must release the door barrier because Three's live render is the
// correctness fallback; keeping false forever would soft-lock navigation.
for (const failure of ['compile', 'texture'] as const) {
  const failedRenderer = createFakeRenderer(undefined, failure)
  const failedRoot = new Group()
  const failedTexture = new Texture()
  failedRoot.add(
    new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: failedTexture })),
  )
  const failedScan = scanGpuWarmupResources(
    failedRoot,
    createGpuWarmupScanState(),
  )
  const failedTransitions: boolean[] = []
  const unsubscribeFailed = subscribeGpuWarmupReady(
    failedRenderer.renderer,
    failedRoot,
    (ready) => failedTransitions.push(ready),
  )
  queueGpuWarmup(
    failedRenderer.renderer,
    {
      camera: new PerspectiveCamera(),
      compileShaders: true,
      root: failedRoot,
      targetScene: new Scene(),
      uploadGeometry: true,
    },
    failedScan.textures,
  )
  markGpuWarmupDiscoveryComplete(failedRenderer.renderer, failedRoot)
  await waitUntil(
    () => isGpuWarmupReady(failedRenderer.renderer, failedRoot),
    `${failure} failure should settle instead of soft-locking the root`,
  )
  assert.deepEqual(failedTransitions, [false, true], `${failure} settles ready`)
  assert.equal(failedRenderer.metrics.compiles, 1)
  assert.equal(failedRenderer.metrics.uploads, 1)
  assert.equal(failedRenderer.metrics.draws, 1)
  unsubscribeFailed()
  disposeGpuWarmup(failedRenderer.renderer)
}

const failedDrawRenderer = createFakeRenderer(undefined, 'draw')
const failedDrawRoot = new Group()
failedDrawRoot.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()))
const failedDrawScan = scanGpuWarmupResources(
  failedDrawRoot,
  createGpuWarmupScanState(),
)
queueGpuWarmup(
  failedDrawRenderer.renderer,
  {
    camera: new PerspectiveCamera(),
    compileShaders: true,
    root: failedDrawRoot,
    targetScene: new Scene(),
    uploadGeometry: true,
  },
  failedDrawScan.textures,
)
markGpuWarmupDiscoveryComplete(failedDrawRenderer.renderer, failedDrawRoot)
await waitUntil(
  () => failedDrawRenderer.metrics.draws > 0,
  'failed private draw should have been attempted',
)
assert.equal(
  isGpuWarmupReady(failedDrawRenderer.renderer, failedDrawRoot),
  false,
  'a failed geometry draw must keep the opaque door closed',
)
disposeGpuWarmup(failedDrawRenderer.renderer)

// Unmount cancellation wins over an in-flight compile promise. Its eventual
// resolution must not recreate state or notify a stale React subscriber.
const cancelledCompile = deferred<Object3D>()
const cancelledRenderer = createFakeRenderer(cancelledCompile.promise)
const cancelledRoot = new Group()
cancelledRoot.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()))
const cancelledTransitions: boolean[] = []
const unsubscribeCancelled = subscribeGpuWarmupReady(
  cancelledRenderer.renderer,
  cancelledRoot,
  (ready) => cancelledTransitions.push(ready),
)
queueGpuWarmup(
  cancelledRenderer.renderer,
  {
    camera: new PerspectiveCamera(),
    compileShaders: true,
    root: cancelledRoot,
    targetScene: new Scene(),
    uploadGeometry: true,
  },
  [],
)
markGpuWarmupDiscoveryComplete(cancelledRenderer.renderer, cancelledRoot)
await waitUntil(
  () => cancelledRenderer.metrics.compiles === 1,
  'controlled compile should have started before cancellation',
)
cancelGpuWarmupRoot(cancelledRenderer.renderer, cancelledRoot)
unsubscribeCancelled()
assert.deepEqual(cancelledTransitions, [false], 'cancelled roots never publish ready')
assert.equal(isGpuWarmupReady(cancelledRenderer.renderer, cancelledRoot), false)
assert.equal(cancelledRenderer.metrics.draws, 0, 'cancel removes queued geometry')

// React StrictMode rehearses cleanup/setup with the same Three Object3D. A new
// subscription deliberately opens another lifecycle generation; the old
// compile resolution below must not decrement or publish the new generation.
const rehearsedTransitions: boolean[] = []
const unsubscribeRehearsed = subscribeGpuWarmupReady(
  cancelledRenderer.renderer,
  cancelledRoot,
  (ready) => rehearsedTransitions.push(ready),
)
queueGpuWarmup(
  cancelledRenderer.renderer,
  {
    camera: new PerspectiveCamera(),
    compileShaders: true,
    root: cancelledRoot,
    targetScene: new Scene(),
    uploadGeometry: true,
  },
  [],
)
markGpuWarmupDiscoveryComplete(cancelledRenderer.renderer, cancelledRoot)
cancelledCompile.resolve(cancelledRoot)
await waitUntil(
  () => isGpuWarmupReady(cancelledRenderer.renderer, cancelledRoot),
  'StrictMode setup after cancellation should warm a fresh generation',
)
assert.deepEqual(cancelledTransitions, [false], 'old generation remains cancelled')
assert.deepEqual(rehearsedTransitions, [false, true])
assert.equal(cancelledRenderer.metrics.compiles, 2)
assert.equal(cancelledRenderer.metrics.draws, 1)
unsubscribeRehearsed()
disposeGpuWarmup(cancelledRenderer.renderer)

let uploadsAfterDispose = 0
const disposableRenderer = {
  initTexture: () => {
    uploadsAfterDispose += 1
  },
} as unknown as WebGLRenderer
queueGpuWarmup(disposableRenderer, null, [new Texture()])
disposeGpuWarmup(disposableRenderer)
await new Promise((resolve) => setTimeout(resolve, 100))
assert.equal(
  uploadsAfterDispose,
  0,
  'renderer cleanup cancels pending idle uploads instead of using a stale context',
)

console.log('GPU warm-up: shader, texture, geometry and readiness passed')

// ---------------------------------------------------------------------------
// The door that must not stay shut (ÁT-G2)
// ---------------------------------------------------------------------------

/**
 * A room goes to the warm-up queue when its three Suspense boundaries have
 * committed and its text has synchronised, and a door opens only on a room
 * that is ready. One wall image that never arrives therefore held the office
 * door on "Preparing the next room…" for good: the only door of the only
 * room the session starts in. And an image that FAILED, instead of stalling,
 * threw out of the loader with no boundary to catch it, and the page went
 * blank.
 *
 * So the wait has a limit, counted in game time while the room is mounted
 * and incomplete, and a wall image that cannot be loaded becomes a grey card
 * instead of an exception.
 */
let doorChecks = 0
let doorFailures = 0
async function doorTest(name: string, run: () => void | Promise<void>) {
  doorChecks += 1
  try {
    await run()
    console.log(`  pass  ${name}`)
  } catch (error) {
    doorFailures += 1
    console.log(`  FAIL  ${name}`)
    console.log(String(error instanceof Error ? error.message : error).replace(/^/gm, '        '))
  }
}

console.log('Room readiness:')

const FRAME = 1 / 60
const waiting = { mounted: true, complete: false, deltaSeconds: FRAME }
const run = (from: RoomDetailWait, frames: number, step: Parameters<typeof advanceRoomDetailWait>[1]) => {
  let wait = from
  for (let frame = 0; frame < frames; frame += 1) wait = advanceRoomDetailWait(wait, step)
  return wait
}

await doorTest('the wait counts only while the room is mounted and incomplete', () => {
  const unmounted = run(ROOM_DETAIL_WAIT_IDLE, 60 * 120, { ...waiting, mounted: false })
  assert.deepEqual(unmounted, { elapsedSeconds: 0, degraded: false }, 'a room nobody mounted waits for nothing')

  const tenSeconds = run(ROOM_DETAIL_WAIT_IDLE, 600, waiting)
  assert.ok(Math.abs(tenSeconds.elapsedSeconds - 10) < 1e-6, `ten seconds counted (${tenSeconds.elapsedSeconds})`)
  assert.equal(tenSeconds.degraded, false)

  // The image arrived: the room is whole, and the next wait starts from zero.
  const completed = advanceRoomDetailWait(tenSeconds, { ...waiting, complete: true })
  assert.deepEqual(completed, { elapsedSeconds: 0, degraded: false }, 'completing in time resets the wait')
  const forever = run(completed, 60 * 600, { ...waiting, complete: true })
  assert.equal(forever.degraded, false, 'a complete room never degrades, however long it stands')

  // Parked and mounted again, the room is given the whole limit again.
  const remounted = advanceRoomDetailWait(run(ROOM_DETAIL_WAIT_IDLE, 600, waiting), { ...waiting, mounted: false })
  assert.deepEqual(remounted, { elapsedSeconds: 0, degraded: false })
})

await doorTest('a boundary that never commits degrades the room at the limit, and a long frame counts as a short one', () => {
  assert.equal(ROOM_DETAIL_TIMEOUT_SECONDS, 30)
  const step = { ...waiting, deltaSeconds: ROOM_DETAIL_MAX_STEP_SECONDS }
  const steps = Math.round(ROOM_DETAIL_TIMEOUT_SECONDS / ROOM_DETAIL_MAX_STEP_SECONDS)
  const justBefore = run(ROOM_DETAIL_WAIT_IDLE, steps - 1, step)
  assert.equal(justBefore.degraded, false, `not yet at ${justBefore.elapsedSeconds.toFixed(2)} s`)
  const atTheLimit = advanceRoomDetailWait(justBefore, step)
  assert.equal(atTheLimit.degraded, true, `degraded at ${atTheLimit.elapsedSeconds.toFixed(2)} s`)

  // A tab that comes back from the background delivers one enormous frame.
  // It must not spend the whole limit: the room had no chance to load in it.
  const oneLongFrame = advanceRoomDetailWait(ROOM_DETAIL_WAIT_IDLE, { ...waiting, deltaSeconds: 60 })
  assert.ok(
    Math.abs(oneLongFrame.elapsedSeconds - ROOM_DETAIL_MAX_STEP_SECONDS) < 1e-9 && !oneLongFrame.degraded,
    `a 60 s frame counted ${oneLongFrame.elapsedSeconds} s`,
  )
  for (const junk of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
    const stepped = advanceRoomDetailWait(ROOM_DETAIL_WAIT_IDLE, { ...waiting, deltaSeconds: junk })
    assert.ok(Number.isFinite(stepped.elapsedSeconds) && stepped.elapsedSeconds <= ROOM_DETAIL_MAX_STEP_SECONDS)
  }

  // Degraded stays degraded while the room is mounted: what arrives late is
  // shown without a warm-up, and must not close a door that already opened.
  const late = advanceRoomDetailWait(atTheLimit, { ...waiting, complete: true })
  assert.equal(late.degraded, true, 'a late arrival does not take the room back')
  assert.equal(advanceRoomDetailWait(atTheLimit, { ...waiting, mounted: false }).degraded, false)
})

await doorTest('a room may warm up when it is complete, or when the wait for the rest has run out', () => {
  const state = { mounted: true, boundaryMask: 0b011, textReady: false, degraded: false }
  assert.equal(roomDetailWarmable(state), false, 'still waiting for the third boundary')
  assert.equal(roomDetailWarmable({ ...state, boundaryMask: 0b111 }), false, 'boundaries in, text not yet')
  assert.equal(roomDetailWarmable({ ...state, boundaryMask: 0b111, textReady: true }), true, 'complete')
  assert.equal(roomDetailWarmable({ ...state, degraded: true }), true, 'degraded, with a boundary missing')
  assert.equal(roomDetailWarmable({ ...state, mounted: false, degraded: true }), false, 'never without the room')
})

await doorTest('a door armed in front of a room that never completes opens once the wait runs out', async () => {
  const neverReady = createFakeRenderer()
  const stalledRoom = new Group()
  stalledRoom.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: new Texture() })))
  const published: boolean[] = []
  const unsubscribe = subscribeGpuWarmupReady(neverReady.renderer, stalledRoom, (ready) => published.push(ready))

  // The player walks up to the door and presses E while the room loads.
  let door = transitionDoor(createTransitionDoorState(), { type: 'proximity' })
  door = transitionDoor(door, { type: 'interact' })
  assert.equal(inspectTransitionDoor(door).phase, 'preloading')
  assert.equal(inspectTransitionDoor(door).interactionArmed, true)

  // Two of three boundaries commit; the third (a wall image) never does.
  let wait = ROOM_DETAIL_WAIT_IDLE
  let queued = false
  let openedAt: number | null = null
  const phasesBeforeLimit = new Set<string>()
  const seconds = 40
  for (let frame = 1; frame <= seconds * 60 && openedAt === null; frame += 1) {
    wait = advanceRoomDetailWait(wait, waiting)
    const warmable = roomDetailWarmable({ mounted: true, boundaryMask: 0b011, textReady: false, degraded: wait.degraded })
    // What Room's effect does with that answer.
    if (!warmable) beginGpuWarmupDiscovery(neverReady.renderer, stalledRoom)
    else if (!queued) {
      queued = true
      beginGpuWarmupDiscovery(neverReady.renderer, stalledRoom)
      const scan = scanGpuWarmupResources(stalledRoom, createGpuWarmupScanState())
      queueGpuWarmup(
        neverReady.renderer,
        {
          camera: new PerspectiveCamera(),
          compileShaders: scanNeedsShaderCompile(scan),
          root: stalledRoom,
          targetScene: new Scene(),
          uploadGeometry: scan.renderablesAdded > 0,
        },
        scan.textures,
      )
      markGpuWarmupDiscoveryComplete(neverReady.renderer, stalledRoom)
      await waitUntil(
        () => isGpuWarmupReady(neverReady.renderer, stalledRoom),
        'the degraded room should settle its warm-up',
      )
    }
    // What the door layer does every frame.
    if (isGpuWarmupReady(neverReady.renderer, stalledRoom)) door = transitionDoor(door, { type: 'preload-ready' })
    const phase = inspectTransitionDoor(door).phase
    if (frame * FRAME < ROOM_DETAIL_TIMEOUT_SECONDS - 0.05) phasesBeforeLimit.add(phase)
    if (phase === 'opening') openedAt = frame * FRAME
  }
  unsubscribe()
  disposeGpuWarmup(neverReady.renderer)

  assert.deepEqual([...phasesBeforeLimit], ['preloading'], 'the door waits, and only waits, until the limit')
  assert.ok(openedAt !== null, `the door never opened in ${seconds} s of play`)
  assert.ok(
    Math.abs((openedAt as number) - ROOM_DETAIL_TIMEOUT_SECONDS) < 0.1,
    `opened ${(openedAt as number).toFixed(2)} s after the room was mounted`,
  )
  assert.deepEqual(published, [false, true], 'readiness reached the door by the usual path')
})

await doorTest('a wall image that fails to load becomes a grey card, and one that loads is itself', async () => {
  const realLoad = ImageLoader.prototype.load
  const realWarn = console.warn
  const warnings: string[] = []
  console.warn = (...args: unknown[]) => void warnings.push(args.map(String).join(' '))
  const loadWith = (url: string) =>
    new Promise<Texture>((resolve, reject) => new MediaTextureLoader().load(url, resolve, undefined, reject))
  try {
    ImageLoader.prototype.load = function (_url, _onLoad, _onProgress, onError) {
      queueMicrotask(() => onError?.(new Error('404')))
      return {} as HTMLImageElement
    }
    let surfaced: unknown = null
    const missing = await loadWith('/textures/media/gone.webp').catch((error) => {
      surfaced = error
      return null
    })
    assert.equal(surfaced, null, `the failure surfaced to the caller: ${String(surfaced)}`)
    assert.ok(missing, 'the caller received a texture')
    assert.equal(missing.userData.mediaMissing, true, 'and can tell it is the stand-in')
    assert.equal(missing.image.width, 1)
    assert.equal(missing.image.height, 1)
    assert.equal(missing.colorSpace, SRGBColorSpace)

    // Twice the same URL (a mural and its exhibit print), once another.
    await loadWith('/textures/media/gone.webp')
    await loadWith('/textures/media/also-gone.webp')
    assert.equal(warnings.length, 2, `one warning per missing image (${warnings.length})`)
    assert.ok(warnings[0].includes('/textures/media/gone.webp'))

    const picture = { width: 640, height: 480 }
    ImageLoader.prototype.load = function (_url, onLoad) {
      queueMicrotask(() => onLoad?.(picture as HTMLImageElement))
      return picture as HTMLImageElement
    }
    const loaded = await loadWith('/textures/media/here.webp')
    assert.equal(loaded.image, picture)
    assert.notEqual(loaded.userData.mediaMissing, true)
  } finally {
    ImageLoader.prototype.load = realLoad
    console.warn = realWarn
  }
})

console.log(`${doorChecks - doorFailures}/${doorChecks} room readiness checks passed`)
if (doorFailures > 0) process.exitCode = 1
