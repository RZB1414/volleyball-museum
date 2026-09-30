import assert from 'node:assert/strict'

import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
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
