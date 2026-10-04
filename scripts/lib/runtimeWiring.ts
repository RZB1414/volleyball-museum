/**
 * The glue between the pure modules the suites prove and the components that
 * are supposed to call them.
 *
 * There is no component test runner here, so the lots extract what matters
 * into pure modules and the suites exercise those: the padded proxy and its
 * material, the breaker's collider in a world built for the test, the lens
 * material by state, the room's wait, the loader that never rejects. That
 * leaves one thing unproven, and it is the thing a refactor removes: the line
 * in the component that CALLS the module. With the registration of the
 * breaker's collider deleted from `PowerControls.tsx`, the wait's `useFrame`
 * deleted from `MuseumScene.tsx` or one of three callers put back on the
 * plain `TextureLoader`, the player gets the prompt that goes out at the
 * wall, the office door held shut for good and the blank page back, and
 * every suite stays green, because the test world registers the collider
 * itself and the door test runs a copy of the component's logic.
 *
 * These are assertions on the source, as `test:radio` and `test:opening`
 * already make where React is the only place a rule lives. They are blunt on
 * purpose: each names the call a player's session depends on. Whitespace is
 * squeezed and comments are dropped first, so a formatter does not trip them
 * and a comment that mentions a call does not satisfy them.
 */

/** Reads a file of `src/`, by its path from there. */
export type SourceReader = (path: string) => string

/** Source with comments removed and every run of whitespace made one space. */
export function squeezed(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1 ')
    .replace(/\s+/g, ' ')
}

/** The interaction volumes and the breaker: ÁT-A1 and the lens of ÁT-A3. */
export function powerControlWiringProblems(read: SourceReader): string[] {
  const problems: string[] = []
  const controls = squeezed(read('engine/PowerControls.tsx'))
  const scene = squeezed(read('scenes/MuseumScene.tsx'))

  if (!controls.includes('registerKitColliders(kit, control.part, kitBundle, collision,')) {
    problems.push(
      'engine/PowerControls.tsx no longer registers the control\'s collider: the capsule walks into the breaker and the eye ends inside its interaction volume (ÁT-A1)',
    )
  }
  if (!/<PowerControlLayer\b(?:(?!\/>).)*\bcollision=\{collision\}/.test(scene)) {
    problems.push('scenes/MuseumScene.tsx no longer hands the collision world to PowerControlLayer: no breaker is solid')
  }
  if (!controls.includes('powerControlLensMaterial(') || !controls.includes('paintLenses(instance, control.part, material)')) {
    problems.push(
      'engine/PowerControls.tsx no longer repaints the lens by the room\'s power: a restored breaker looks like a dead one (ÁT-A3)',
    )
  }

  // One material for every invisible target: double-sided, so a ray cast
  // from inside the volume still finds it.
  for (const path of ['engine/PowerControls.tsx', 'engine/Containers.tsx', 'engine/Devices.tsx']) {
    const component = squeezed(read(path))
    if (!component.includes('<meshBasicMaterial {...PROXY_MATERIAL_PROPS} />')) {
      problems.push(`${path}: its interaction proxy does not take PROXY_MATERIAL_PROPS`)
    }
    if (/<meshBasicMaterial\s*\/>/.test(component)) {
      problems.push(`${path}: a bare <meshBasicMaterial /> is single-sided and invisible from within`)
    }
  }
  return problems
}

/** The door that is never held shut, and the image that never breaks the page: ÁT-G2. */
export function roomReadinessWiringProblems(read: SourceReader): string[] {
  const problems: string[] = []
  const scene = squeezed(read('scenes/MuseumScene.tsx'))

  // The wait is counted on the frame clock, by the pure reducer.
  if (!/useFrame\(\(_, delta\) => \{ const next = advanceRoomDetailWait\(detailWaitRef\.current,/.test(scene)) {
    problems.push(
      'scenes/MuseumScene.tsx no longer advances the room\'s wait every frame: a room one of whose images never arrives keeps its door shut for good (ÁT-G2)',
    )
  }
  if (!scene.includes('roomDetailWarmable({ mounted: detailMounted, boundaryMask, textReady, degraded })')) {
    problems.push(
      'scenes/MuseumScene.tsx no longer asks roomDetailWarmable whether the room may warm up: a degraded room is never queued',
    )
  }

  // `useLoader` caches by loader class and URL: the three callers have to
  // name the same class, and it has to be the one that never rejects.
  const callers: readonly (readonly [string, string])[] = [
    ['engine/RoomWallArt.tsx', 'useLoader(MediaTextureLoader,'],
    ['engine/FramedMedia.tsx', 'useLoader(MediaTextureLoader,'],
    ['engine/bundleCache.ts', 'useLoader.preload(MediaTextureLoader,'],
  ]
  for (const [path, call] of callers) {
    const module = squeezed(read(path))
    if (!module.includes(call)) problems.push(`${path} no longer loads its image with \`${call}\``)
    if (/(?<!Media)\bTextureLoader\b/.test(module)) {
      problems.push(`${path} names the plain TextureLoader: an image that fails to load takes the page down`)
    }
  }
  return problems
}
