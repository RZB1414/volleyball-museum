/**
 * Idle GPU warm-up for room detail that is already mounted but still hidden.
 *
 * Network/decode preloading gets assets into JavaScript memory; it does not
 * create WebGL textures or the shader variants used by the real museum light
 * rig. This queue performs those two GPU-only steps without drawing the parked
 * room. Work is shared per renderer so several portal rooms cannot all upload a
 * large photograph in the same idle slice.
 */

import {
  Group,
  InstancedMesh,
  Scene,
  Vector4,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from 'three'

/** At most two subtree inventories per second, even after a room is warm. */
export const GPU_WARMUP_SCAN_INTERVAL_SECONDS = 0.5

type Renderable = Object3D & {
  readonly isLine?: boolean
  readonly isMesh?: boolean
  readonly isPoints?: boolean
  readonly isSprite?: boolean
  material?: Material | Material[]
}

export type GpuWarmupScanState = {
  readonly materials: WeakSet<Material>
  readonly renderables: WeakSet<Object3D>
  readonly textures: WeakMap<Texture, number>
}

export type GpuWarmupScan = {
  readonly materialsAdded: number
  readonly renderablesAdded: number
  readonly textures: readonly Texture[]
}

export function createGpuWarmupScanState(): GpuWarmupScanState {
  return {
    materials: new WeakSet(),
    renderables: new WeakSet(),
    textures: new WeakMap(),
  }
}

function isRenderable(object: Object3D): object is Renderable {
  const candidate = object as Renderable
  return Boolean(
    candidate.isMesh || candidate.isPoints || candidate.isLine || candidate.isSprite,
  )
}

function isTexture(value: unknown): value is Texture {
  return Boolean(value && typeof value === 'object' && (value as Texture).isTexture)
}

function collectUniformTextures(value: unknown, textures: Set<Texture>) {
  if (isTexture(value)) {
    textures.add(value)
    return
  }
  if (!Array.isArray(value)) return
  for (const entry of value) {
    if (isTexture(entry)) textures.add(entry)
  }
}

/** Finds built-in material maps plus Texture-valued ShaderMaterial uniforms. */
function collectMaterialTextures(material: Material, textures: Set<Texture>) {
  for (const value of Object.values(material)) {
    if (isTexture(value)) textures.add(value)
  }

  const uniforms = (material as Material & {
    readonly uniforms?: Readonly<Record<string, { readonly value?: unknown }>>
  }).uniforms
  if (!uniforms) return
  for (const uniform of Object.values(uniforms)) {
    collectUniformTextures(uniform.value, textures)
  }
}

/**
 * Incrementally inventories a subtree.
 *
 * Object identity is intentional: a late Suspense commit using an already-seen
 * shared material still adds a renderable and therefore requests compilation
 * for that object's defines (instancing, skinning, morph targets, and so on).
 */
export function scanGpuWarmupResources(
  root: Object3D,
  state: GpuWarmupScanState,
): GpuWarmupScan {
  let materialsAdded = 0
  let renderablesAdded = 0
  const discoveredTextures = new Set<Texture>()

  root.traverse((object) => {
    if (!isRenderable(object) || !object.material) return

    if (!state.renderables.has(object)) {
      state.renderables.add(object)
      renderablesAdded += 1
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!state.materials.has(material)) {
        state.materials.add(material)
        materialsAdded += 1
      }
      collectMaterialTextures(material, discoveredTextures)
    }

    // Troika creates its glyph atlas during Text.sync(), before its
    // onBeforeRender hook exposes that atlas through the derived material's
    // uniforms. Reading textRenderInfo closes that otherwise invisible gap.
    const textRenderInfo = (object as Object3D & {
      readonly textRenderInfo?: { readonly sdfTexture?: Texture } | null
    }).textRenderInfo
    if (textRenderInfo?.sdfTexture) discoveredTextures.add(textRenderInfo.sdfTexture)
  })

  const textures: Texture[] = []
  for (const texture of discoveredTextures) {
    const scannedVersion = state.textures.get(texture)
    if (scannedVersion !== undefined && scannedVersion >= texture.version) continue
    state.textures.set(texture, texture.version)
    textures.push(texture)
  }

  return { materialsAdded, renderablesAdded, textures }
}

export function scanNeedsShaderCompile(scan: GpuWarmupScan) {
  return (
    scan.renderablesAdded > 0 || scan.materialsAdded > 0 || scan.textures.length > 0
  )
}

export type GeometryWarmupClone = {
  readonly renderables: readonly Object3D[]
  readonly wrapper: Group
}

type LightObject = Object3D & {
  castShadow: boolean
  readonly isDirectionalLight?: boolean
  readonly isLight?: boolean
  readonly isSpotLight?: boolean
  target?: Object3D
}

function createGeometryWarmupScene(target: Scene, wrapper: Group) {
  const scene = new Scene()
  scene.fog = target.fog
  scene.environment = target.environment
  scene.environmentIntensity = target.environmentIntensity
  scene.environmentRotation.copy(target.environmentRotation)

  // Actual materials are required here: a basic override only binds `position`
  // and would leave normals, UVs and tangents cold. Shallow light clones keep
  // the renderer on the variants compileAsync prepared from the live scene,
  // without drawing the live museum into the 1x1 target.
  target.traverseVisible((object) => {
    const light = object as LightObject
    if (!light.isLight) return
    const clone = object.clone(false) as LightObject
    clone.castShadow = false
    clone.matrixAutoUpdate = false
    clone.matrix.copy(object.matrixWorld)
    clone.layers.mask = object.layers.mask
    scene.add(clone)

    if (
      (light.isSpotLight || light.isDirectionalLight) &&
      light.target &&
      clone.target
    ) {
      clone.target.matrixAutoUpdate = false
      clone.target.matrix.copy(light.target.matrixWorld)
      scene.add(clone.target)
    }
  })

  scene.add(wrapper)
  return scene
}

/**
 * Builds draw proxies without taking live museum objects out of their parents.
 * Geometry, material and per-instance attributes deliberately retain their
 * original identities, so WebGL buffers created for a proxy are the buffers the
 * real room consumes at the doorway. The proxies themselves are disposable by
 * garbage collection; shared GPU resources must never be disposed here.
 */
export function createGeometryWarmupClone(root: Object3D): GeometryWarmupClone {
  root.updateWorldMatrix(true, true)
  const wrapper = new Group()
  const renderables: Object3D[] = []

  root.traverse((object) => {
    if (!isRenderable(object) || !object.material) return
    const proxy = object.clone(false) as Renderable
    const sourceWithGeometry = object as Renderable & { geometry?: unknown }
    const proxyWithGeometry = proxy as Renderable & { geometry?: unknown }
    if (sourceWithGeometry.geometry) {
      // Custom Mesh subclasses are allowed to allocate a new geometry in
      // clone(). Troika Text does exactly that, so explicitly share the live
      // buffer which the doorway frame will consume.
      proxyWithGeometry.geometry = sourceWithGeometry.geometry
    }
    proxy.material = object.material
    proxy.onBeforeRender = object.onBeforeRender.bind(object)
    proxy.visible = false
    proxy.frustumCulled = false
    proxy.layers.enableAll()
    proxy.matrixAutoUpdate = false
    proxy.matrix.copy(object.matrixWorld)

    // InstancedMesh.clone() allocates a different instance attribute. Sharing
    // it explicitly is what warms the buffer used by the live batched kit.
    if (object instanceof InstancedMesh && proxy instanceof InstancedMesh) {
      proxy.instanceMatrix = object.instanceMatrix
      proxy.instanceColor = object.instanceColor
      proxy.morphTexture = object.morphTexture
    }

    wrapper.add(proxy)
    renderables.push(proxy)
  })

  return { renderables, wrapper }
}

type CompileRequest = {
  readonly camera: Camera
  readonly root: Object3D
  readonly targetScene: Scene
}

export type GpuWarmupRequest = CompileRequest & {
  readonly compileShaders: boolean
  readonly uploadGeometry: boolean
}

type ActiveGeometryWarmup = {
  readonly camera: Camera
  readonly lifecycleGeneration: number
  readonly renderables: readonly Object3D[]
  readonly root: Object3D
  readonly scene: Scene
  index: number
}

export type GpuWarmupReadyListener = (ready: boolean) => void

type RootWarmupState = {
  discoveryComplete: boolean
  readonly lifecycleGeneration: number
  readonly listeners: Set<GpuWarmupReadyListener>
  pendingCompiles: number
  pendingGeometries: number
  readonly pendingTextures: Set<Texture>
  ready: boolean
  workGeneration: number
}

type TextureJob = {
  readonly owners: Map<Object3D, number>
  readonly texture: Texture
  unowned: boolean
}

type QueuedRootRequest = {
  readonly lifecycleGeneration: number
  readonly request: CompileRequest
}

function renderOnePixel(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  target: WebGLRenderTarget,
) {
  const previousTarget = renderer.getRenderTarget()
  const previousCubeFace = renderer.getActiveCubeFace()
  const previousMipmapLevel = renderer.getActiveMipmapLevel()
  const previousViewport = renderer.getViewport(new Vector4())
  const previousScissor = renderer.getScissor(new Vector4())
  const previousScissorTest = renderer.getScissorTest()
  const previousRenderInfo = { ...renderer.info.render }

  try {
    renderer.setRenderTarget(target)
    renderer.setViewport(0, 0, 1, 1)
    renderer.setScissor(0, 0, 1, 1)
    renderer.setScissorTest(true)
    renderer.render(scene, camera)
  } finally {
    renderer.setRenderTarget(previousTarget, previousCubeFace, previousMipmapLevel)
    renderer.setViewport(previousViewport)
    renderer.setScissor(previousScissor)
    renderer.setScissorTest(previousScissorTest)
    // The one-pixel upload is not the museum frame. Leaving its counters in
    // renderer.info made the performance HUD report 1 draw while loading and
    // hid the real transition cost we were trying to diagnose.
    Object.assign(renderer.info.render, previousRenderInfo)
  }
}

type ScheduledIdleSlice = {
  readonly handle: number
  readonly usesIdleCallback: boolean
}

function scheduleIdleSlice(
  callback: (deadline?: IdleDeadline) => void,
): ScheduledIdleSlice {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    return {
      handle: window.requestIdleCallback(callback, { timeout: 280 }),
      usesIdleCallback: true,
    }
  }
  if (typeof window === 'undefined') {
    return {
      handle: globalThis.setTimeout(() => callback(), 0) as unknown as number,
      usesIdleCallback: false,
    }
  }
  // Safari currently lacks requestIdleCallback. One upload per delayed callback
  // still bounds the fallback instead of flushing every texture in one frame.
  return {
    handle: globalThis.setTimeout(() => callback(), 80) as unknown as number,
    usesIdleCallback: false,
  }
}

class RendererWarmupQueue {
  private readonly compileRequests = new Map<Object3D, QueuedRootRequest>()
  private readonly geometryRequests = new Map<Object3D, QueuedRootRequest>()
  private readonly geometryTarget = new WebGLRenderTarget(1, 1, {
    depthBuffer: false,
    stencilBuffer: false,
  })
  private readonly renderer: WebGLRenderer
  private readonly rootLifecycleGenerations = new WeakMap<Object3D, number>()
  private readonly rootStates = new Map<Object3D, RootWarmupState>()
  private readonly textureJobs = new WeakMap<Texture, TextureJob>()
  private readonly textureQueue: TextureJob[] = []
  private readonly uploadedTextureVersions = new WeakMap<Texture, number>()
  private compileActive = false
  private disposed = false
  private geometryActive: ActiveGeometryWarmup | null = null
  private idleHandle: number | null = null
  private idleUsesCallback = false
  private scheduled = false

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer
  }

  private stateFor(root: Object3D) {
    let state = this.rootStates.get(root)
    if (!state) {
      state = {
        discoveryComplete: false,
        lifecycleGeneration: this.rootLifecycleGenerations.get(root) ?? 0,
        listeners: new Set(),
        pendingCompiles: 0,
        pendingGeometries: 0,
        pendingTextures: new Set(),
        ready: false,
        workGeneration: 0,
      }
      this.rootStates.set(root, state)
    }
    return state
  }

  private publish(state: RootWarmupState, ready: boolean) {
    if (state.ready === ready) return
    state.ready = ready
    for (const listener of state.listeners) listener(ready)
  }

  private invalidate(state: RootWarmupState) {
    state.workGeneration += 1
    this.publish(state, false)
  }

  private tryPublishReady(root: Object3D) {
    const state = this.rootStates.get(root)
    if (
      !state ||
      !state.discoveryComplete ||
      state.pendingCompiles > 0 ||
      state.pendingGeometries > 0 ||
      state.pendingTextures.size > 0
    ) {
      return
    }
    this.publish(state, true)
  }

  subscribe(root: Object3D, listener: GpuWarmupReadyListener) {
    const state = this.stateFor(root)
    state.listeners.add(listener)
    listener(state.ready)
    return () => state.listeners.delete(listener)
  }

  isReady(root: Object3D) {
    return this.rootStates.get(root)?.ready ?? false
  }

  beginDiscovery(root: Object3D) {
    if (this.disposed) return
    const state = this.stateFor(root)
    state.discoveryComplete = false
    this.invalidate(state)
  }

  markDiscoveryComplete(root: Object3D) {
    if (this.disposed) return
    // Unlike subscribe/enqueue, a passive boundary callback cannot resurrect a
    // cancelled lifecycle after unmount.
    const state = this.rootStates.get(root)
    if (!state) return
    state.discoveryComplete = true
    this.tryPublishReady(root)
  }

  enqueue(request: GpuWarmupRequest | null, textures: readonly Texture[]) {
    if (this.disposed) return
    const state = request ? this.stateFor(request.root) : null
    let addedWork = false

    if (request?.compileShaders) {
      if (!this.compileRequests.has(request.root)) {
        state!.pendingCompiles += 1
        addedWork = true
      }
      this.compileRequests.set(request.root, {
        lifecycleGeneration: state!.lifecycleGeneration,
        request,
      })
    }
    if (request?.uploadGeometry) {
      if (!this.geometryRequests.has(request.root)) {
        state!.pendingGeometries += 1
        addedWork = true
      }
      this.geometryRequests.set(request.root, {
        lifecycleGeneration: state!.lifecycleGeneration,
        request,
      })
    }

    for (const texture of textures) {
      const uploadedVersion = this.uploadedTextureVersions.get(texture)
      if (uploadedVersion !== undefined && uploadedVersion >= texture.version) continue
      let job = this.textureJobs.get(texture)
      if (!job) {
        job = { owners: new Map(), texture, unowned: false }
        this.textureJobs.set(texture, job)
        this.textureQueue.push(job)
      }
      if (!request) {
        job.unowned = true
      } else if (job.owners.get(request.root) !== state!.lifecycleGeneration) {
        job.owners.set(request.root, state!.lifecycleGeneration)
        state!.pendingTextures.add(texture)
        addedWork = true
      }
    }

    if (state && addedWork) this.invalidate(state)
    this.schedule()
  }

  cancelRoot(root: Object3D) {
    const state = this.rootStates.get(root)
    const nextLifecycleGeneration =
      (state?.lifecycleGeneration ?? this.rootLifecycleGenerations.get(root) ?? 0) + 1
    this.rootLifecycleGenerations.set(root, nextLifecycleGeneration)
    if (state) {
      state.ready = false
      state.listeners.clear()
      this.rootStates.delete(root)
    }
    this.compileRequests.delete(root)
    this.geometryRequests.delete(root)
    if (this.geometryActive?.root === root) this.geometryActive = null
    for (const job of this.textureQueue) job.owners.delete(root)
    this.schedule()
  }

  private completeCompile(root: Object3D, lifecycleGeneration: number) {
    const state = this.rootStates.get(root)
    if (!state || state.lifecycleGeneration !== lifecycleGeneration) return
    state.pendingCompiles = Math.max(0, state.pendingCompiles - 1)
    // Warm-up is opportunistic. A rejected driver precompile is settled work;
    // the first live frame remains Three's normal compilation fallback.
    this.tryPublishReady(root)
  }

  private completeTexture(job: TextureJob, succeeded: boolean) {
    this.textureJobs.delete(job.texture)
    if (succeeded) this.uploadedTextureVersions.set(job.texture, job.texture.version)
    for (const [root, lifecycleGeneration] of job.owners) {
      const state = this.rootStates.get(root)
      if (!state || state.lifecycleGeneration !== lifecycleGeneration) continue
      state.pendingTextures.delete(job.texture)
      this.tryPublishReady(root)
    }
    job.owners.clear()
  }

  private completeGeometry(root: Object3D, lifecycleGeneration: number) {
    const state = this.rootStates.get(root)
    if (!state || state.lifecycleGeneration !== lifecycleGeneration) return
    state.pendingGeometries = Math.max(0, state.pendingGeometries - 1)
    this.tryPublishReady(root)
  }

  private hasRunnableWork() {
    if (this.disposed) return false
    if (!this.compileActive && this.compileRequests.size > 0) return true
    if (this.textureQueue.length > 0) return true
    if (this.compileActive || this.compileRequests.size > 0) return false
    return this.geometryActive !== null || this.geometryRequests.size > 0
  }

  private schedule() {
    if (this.scheduled || !this.hasRunnableWork()) return
    this.scheduled = true
    const scheduled = scheduleIdleSlice((deadline) => {
      this.idleHandle = null
      if (this.disposed) return
      this.scheduled = false
      this.flushOne(deadline)
    })
    this.idleHandle = scheduled.handle
    this.idleUsesCallback = scheduled.usesIdleCallback
  }

  private flushOne(deadline?: IdleDeadline) {
    if (this.disposed) return
    // A non-expired idle callback with almost no budget should yield. The
    // timeout remains the eventual-progress escape hatch, while ordinary
    // movement no longer forces a shader traversal or texture upload into the
    // final sliver of an already busy frame.
    if (deadline && !deadline.didTimeout && deadline.timeRemaining() < 4) {
      this.schedule()
      return
    }
    if (!this.compileActive) {
      const first = this.compileRequests.entries().next()
      if (!first.done) {
        const [root, queued] = first.value
        const { lifecycleGeneration, request } = queued
        this.compileRequests.delete(root)
        this.compileActive = true

        // compileAsync traverses the supplied root even when it is invisible,
        // while targetScene supplies the actual fog, environment and visible
        // light rig. It creates programs but never submits a draw call.
        let compilation: Promise<Object3D>
        try {
          compilation = this.renderer.compileAsync(
            request.root,
            request.camera,
            request.targetScene,
          )
        } catch {
          this.compileActive = false
          this.completeCompile(root, lifecycleGeneration)
          this.schedule()
          return
        }
        void compilation.then(
          () => {
            this.compileActive = false
            this.completeCompile(root, lifecycleGeneration)
            this.schedule()
          },
          () => {
            this.compileActive = false
            this.completeCompile(root, lifecycleGeneration)
            this.schedule()
          },
        )
        this.schedule()
        return
      }
    }

    const textureJob = this.textureQueue.shift()
    if (textureJob) {
      if (textureJob.owners.size === 0 && !textureJob.unowned) {
        this.textureJobs.delete(textureJob.texture)
        this.schedule()
        return
      }
      let succeeded = true
      try {
        this.renderer.initTexture(textureJob.texture)
      } catch {
        succeeded = false
        // Rendering remains the safe fallback if a platform rejects an eager
        // upload (for example after a WebGL context loss).
      }
      this.completeTexture(textureJob, succeeded)
      this.schedule()
      return
    }

    // Geometry begins only after the correct shader variants are ready and all
    // known images have reached WebGL. Constructing the proxy wrapper and each
    // one-pixel draw receive separate idle slices.
    if (!this.geometryActive) {
      const first = this.geometryRequests.entries().next()
      if (!first.done) {
        const [root, queued] = first.value
        const { lifecycleGeneration, request } = queued
        this.geometryRequests.delete(root)
        let clone: GeometryWarmupClone
        let scene: Scene
        try {
          clone = createGeometryWarmupClone(root)
          scene = createGeometryWarmupScene(request.targetScene, clone.wrapper)
        } catch {
          // A room is not ready when its live buffers could not be prepared.
          // Keep the same generation queued: a transient context/driver error
          // may recover, while a persistent failure correctly leaves the
          // opaque door closed instead of revealing a first-frame upload.
          this.geometryRequests.set(root, queued)
          this.schedule()
          return
        }
        this.geometryActive = {
          camera: request.camera,
          index: 0,
          lifecycleGeneration,
          renderables: clone.renderables,
          root,
          scene,
        }
        if (clone.renderables.length === 0) {
          this.geometryActive = null
          this.completeGeometry(root, lifecycleGeneration)
        }
        this.schedule()
        return
      }
    }

    const active = this.geometryActive
    if (active) {
      const renderable = active.renderables[active.index]
      if (renderable) {
        renderable.visible = true
        let succeeded = true
        try {
          renderOnePixel(
            this.renderer,
            active.scene,
            active.camera,
            this.geometryTarget,
          )
        } catch {
          succeeded = false
          // The live render remains the fallback after context loss or a driver
          // rejection. Renderer state is restored inside renderOnePixel.
        } finally {
          renderable.visible = false
        }
        if (!succeeded) {
          // Retry the same live renderable in a later idle slice. Treating a
          // failed draw as settled used to publish ready without having warmed
          // the room at all.
          this.schedule()
          return
        }
        active.index += 1
      }
      if (active.index >= active.renderables.length) {
        this.geometryActive = null
        this.completeGeometry(active.root, active.lifecycleGeneration)
      }
    }
    this.schedule()
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    if (this.idleHandle !== null) {
      if (
        this.idleUsesCallback &&
        typeof window !== 'undefined' &&
        typeof window.cancelIdleCallback === 'function'
      ) {
        window.cancelIdleCallback(this.idleHandle)
      } else {
        globalThis.clearTimeout(this.idleHandle)
      }
    }
    this.idleHandle = null
    this.scheduled = false
    this.compileRequests.clear()
    this.geometryRequests.clear()
    this.textureQueue.length = 0
    this.geometryActive = null
    for (const state of this.rootStates.values()) {
      state.ready = false
      state.listeners.clear()
    }
    this.rootStates.clear()
    this.geometryTarget.dispose()
  }
}

const queues = new WeakMap<WebGLRenderer, RendererWarmupQueue>()

function queueFor(renderer: WebGLRenderer) {
  let queue = queues.get(renderer)
  if (!queue) {
    queue = new RendererWarmupQueue(renderer)
    queues.set(renderer, queue)
  }
  return queue
}

/** Queues one compile and any new texture uploads for idle execution. */
export function queueGpuWarmup(
  renderer: WebGLRenderer,
  request: GpuWarmupRequest | null,
  textures: readonly Texture[],
) {
  const queue = queueFor(renderer)
  queue.enqueue(request, textures)
}

/**
 * Observes the readiness of one mounted detail root.
 *
 * The listener receives the current value immediately. A later Suspense commit
 * invalidates a ready generation synchronously when its work is queued. Ready
 * means every eager operation settled, not necessarily succeeded: live render
 * remains the correctness fallback when a browser rejects opportunistic work.
 */
export function subscribeGpuWarmupReady(
  renderer: WebGLRenderer,
  root: Object3D,
  listener: GpuWarmupReadyListener,
) {
  return queueFor(renderer).subscribe(root, listener)
}

export function isGpuWarmupReady(renderer: WebGLRenderer, root: Object3D) {
  return queues.get(renderer)?.isReady(root) ?? false
}

/** Invalidates a published room while a new asset/text generation settles. */
export function beginGpuWarmupDiscovery(renderer: WebGLRenderer, root: Object3D) {
  queueFor(renderer).beginDiscovery(root)
}

/** Allows ready only after every local Suspense boundary has committed. */
export function markGpuWarmupDiscoveryComplete(
  renderer: WebGLRenderer,
  root: Object3D,
) {
  queueFor(renderer).markDiscoveryComplete(root)
}

/** Cancels a root generation; unfinished async work can never publish ready. */
export function cancelGpuWarmupRoot(renderer: WebGLRenderer, root: Object3D) {
  queues.get(renderer)?.cancelRoot(root)
}

/** Cancels pending idle work and releases the queue's private 1x1 target. */
export function disposeGpuWarmup(renderer: WebGLRenderer) {
  const queue = queues.get(renderer)
  if (!queue) return
  queue.dispose()
  queues.delete(renderer)
}
