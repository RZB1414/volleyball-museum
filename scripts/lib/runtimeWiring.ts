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

import { dynamicSpecifiers, staticSpecifiers } from './staticImports.ts'

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

/**
 * The one door for progress (S11, S1): what a verb of the player records, and
 * whether a lock may open a modal, are decided by pure modules. This holds
 * the components to calling them.
 *
 * `components` is every `.tsx` under `src/`, by its path from there: two of
 * the rules are about what NO component may do, and a list typed here would
 * stop being every component at the next file.
 */
export function progressWiringProblems(read: SourceReader, components: readonly string[]): string[] {
  const problems: string[] = []
  const source = (path: string) => squeezed(read(path))

  // --- verbs record through one grant; consequences are triggers ------------
  const interaction = source('engine/Interaction.tsx')
  if (!interaction.includes('.grant(hotspotGrant(exhibit, hotspot.id, ')) {
    problems.push(
      'engine/Interaction.tsx no longer records a detail with `grant(hotspotGrant(…))`: what an examine writes is decided in the component again, where no suite reaches it',
    )
  }
  // The third argument is what makes the second required detail count the
  // first. The suites prove `hotspotGrant` with the save's list; a call that
  // hands it another list (none, or this visit's) is a piece with two
  // required details that never catalogues, and every suite green.
  for (const call of callArguments(interaction, 'hotspotGrant')) {
    if (!/\.progress\.hotspots$/.test(call)) {
      problems.push(
        `engine/Interaction.tsx calls hotspotGrant(${call}) without the save's hotspots: a detail is judged without the ones already seen, and a piece with two required details is never catalogued`,
      )
    }
  }
  for (const call of ['applyUnlockEffect', 'recordHotspot(', 'recordCatalogued(', 'recordFact(']) {
    if (interaction.includes(call)) {
      problems.push(
        `engine/Interaction.tsx calls \`${call.replace('(', '')}\`: an exhibit's effects are a trigger that fires once, and a detail found later must not apply them again (S11)`,
      )
    }
  }
  if (!/import '\.\.\/engine\/contentRegistry(?:\.ts)?'/.test(source('scenes/MuseumCanvas.tsx'))) {
    problems.push(
      'scenes/MuseumCanvas.tsx no longer imports engine/contentRegistry: no rules reach the store, and no trigger ever fires',
    )
  }
  // Node has no hot reload, so no suite can see this one run: a store Vite
  // replaced that stays in the registry answers the next registration by
  // committing, and so writing, its own stale save.
  if (!/import\.meta\.hot\?\.dispose\(\(\) => \{ forgetRules\(\)/.test(source('state/store.ts'))) {
    problems.push('state/store.ts no longer leaves the rules registry when Vite replaces it: the old store goes on writing its save')
  }
  // The store is on the title screen. `test:save` walks everything it reaches;
  // this names the two imports the registry exists to keep out of it. Not
  // squeezed: the reader of imports works on the source as written.
  const store = read('state/store.ts')
  for (const specifier of [...staticSpecifiers(store), ...dynamicSpecifiers(store)]) {
    if (/content\/museum/.test(specifier) || /(?:^|\/)engine\//.test(specifier)) {
      problems.push(`state/store.ts imports "${specifier}": the content and the engine would ship with the title screen`)
    }
  }

  // --- a lock opens by `attemptLock`, and only `ask` opens a modal ----------
  for (const path of ['engine/Containers.tsx', 'engine/PowerControls.tsx', 'ui/LockPanel.tsx']) {
    if (!source(path).includes('attemptLock(')) {
      problems.push(`${path} no longer asks attemptLock: it decides by itself whether its lock opens (S1)`)
    }
  }
  for (const path of ['engine/Containers.tsx', 'engine/PowerControls.tsx']) {
    if (!/outcome === 'refused'\) \{ museumAudio\.lockDenied\(\)/.test(source(path))) {
      problems.push(`${path}: a lock that refuses no longer answers the press with a sound, and E does nothing at all`)
    }
  }
  // Asking the rule is half of it: what the rule decided has to reach the
  // save, and before the panel takes the press. The playthrough robot cannot
  // see this line go, because its hands are written after these handlers and
  // not by them: with it deleted the plan never lists a touched lock, and the
  // right year opens a drawer that asks for it again on the next touch.
  const touched =
    "const attempt = attemptLock(lock, MUSEUM.facts, state.progress, { kind: 'touch' }) " +
    "if (attempt.outcome !== 'open') state.grant(attempt.grant) if (attempt.outcome === 'ask') {"
  for (const path of ['engine/Containers.tsx', 'engine/PowerControls.tsx']) {
    if (!source(path).includes(touched)) {
      problems.push(
        `${path} no longer hands the save what attemptLock decided on a touch, right after asking and before the panel opens: a lock that was touched is never on the plan`,
      )
    }
  }
  if (!source('ui/LockPanel.tsx').includes("{ kind: 'code', entry }) if (attempt.outcome !== 'open') state.grant(attempt.grant)")) {
    problems.push(
      'ui/LockPanel.tsx no longer hands the save what attemptLock decided on a code: the right year closes the panel and the lock is never written as open',
    )
  }
  for (const path of ['engine/Containers.tsx', 'ui/LockPanel.tsx']) {
    if (!source(path).includes('.grant(containerGrant(MUSEUM, ')) {
      problems.push(
        `${path} no longer records what a container holds with \`grant(containerGrant(…))\`: the keypad and the open drawer would write different saves`,
      )
    }
  }
  // The plan is a model now (`planWiringProblems` holds the component to
  // drawing it), and its list of locks is decided where the rest of it is.
  if (!source('ui/mapModel.ts').includes('pendingLocks(content.locks, progress)')) {
    problems.push('ui/mapModel.ts no longer lists pendingLocks: the plan names locks the player never touched')
  }
  if (!source('ui/Hud.tsx').includes('lockStatus(')) {
    problems.push('ui/Hud.tsx no longer asks lockStatus whether a container is locked')
  }
  for (const path of components) {
    const component = source(path)
    if (/\bopenLock\(/.test(component)) {
      problems.push(`${path} calls openLock: a lock opens by the grant attemptLock hands back, which records it as seen too`)
    }
    if (component.includes('locksOpened.includes(')) {
      problems.push(`${path} reads locksOpened by itself: whether a lock is open is lockStatus, and whether it opens is attemptLock`)
    }
    const opened = component.match(/\bsetActiveLock\((?!null\))/g)?.length ?? 0
    const asked = component.match(/outcome === 'ask'\) \{[^{}]*\bsetActiveLock\((?!null\))/g)?.length ?? 0
    if (opened !== asked) {
      problems.push(
        `${path} opens the lock panel outside the \`ask\` outcome: a lock with no panel would open a modal with nothing in it (S1)`,
      )
    }
  }
  return problems
}

/**
 * The text between the parentheses of every call of `name` in a squeezed
 * source. By counting parentheses, so that an argument which is itself a
 * call (`poweredGiven(…)`) does not end the one being read.
 */
export function callArguments(source: string, name: string): string[] {
  const found: string[] = []
  for (const match of source.matchAll(new RegExp(`(?<![\\w.])${name}\\(`, 'g'))) {
    const start = (match.index ?? 0) + match[0].length
    let depth = 1
    let end = start
    while (end < source.length && depth > 0) {
      if (source[end] === '(') depth += 1
      else if (source[end] === ')') depth -= 1
      end += 1
    }
    found.push(source.slice(start, end - 1).trim().replace(/,$/, '').trim())
  }
  return found
}

/**
 * The shortcut that stays open (ÁT-G1, H-29): who may operate a door is a
 * question the save answers too, and the save only learns of a release if
 * the component hands over the grant.
 *
 * The two rules take the released doors as a parameter with no default, so a
 * call that forgot it does not compile. What the compiler cannot see is a
 * call that passes something else (an empty list, another field): a door that
 * opens once and locks behind the player again.
 */
export function doorReleaseWiringProblems(read: SourceReader): string[] {
  const problems: string[] = []
  const doors = squeezed(read('engine/TransitionDoors.tsx'))

  for (const rule of ['canOpenTransitionDoor', 'transitionDoorBlock']) {
    const calls = callArguments(doors, rule)
    if (calls.length === 0) problems.push(`engine/TransitionDoors.tsx no longer asks ${rule}`)
    for (const call of calls) {
      if (!/\.progress\.doorsReleased$/.test(call)) {
        problems.push(
          `engine/TransitionDoors.tsx calls ${rule}(${call}) without the save's doorsReleased: a shortcut opened from its own side locks again behind the player`,
        )
      }
    }
  }

  const grant = 'const release = doorGrant(runtime.spec, museum.currentRoom, museum.progress.doorsReleased)'
  const pressed = "transitionDoor(runtime.state, { type: 'interact' }"
  if (!doors.includes(grant) || !doors.includes('if (release) museum.grant(release)')) {
    problems.push(
      'engine/TransitionDoors.tsx no longer records the release with `grant(doorGrant(…))`: the shortcut is forgotten the moment its leaves close',
    )
  } else if (!doors.includes(pressed) || doors.indexOf(grant) > doors.indexOf(pressed)) {
    // Pushed is released (DL2-2): the grant is written before the leaf moves,
    // so a reload in the middle of the opening does not undo it.
    problems.push('engine/TransitionDoors.tsx records the release after the leaf has started to move, or not on the press at all')
  }
  if (!/if \(focused\.status === 'blocked'\) \{ museumAudio\.lockDenied\(\) return true \}/.test(doors)) {
    problems.push(
      'engine/TransitionDoors.tsx: a door that will not open no longer answers every press with a sound and takes the key: from the wrong side, E does nothing at all',
    )
  }

  const controls = squeezed(read('ui/MobileControls.tsx'))
  if (!controls.includes('doorActionAvailable(focusedDoor)') || controls.includes('blockedBy')) {
    problems.push(
      'ui/MobileControls.tsx no longer asks doorActionAvailable whether the Action button shows before a door: on touch, a blocked door has no button to answer with',
    )
  }

  const hud = squeezed(read('ui/Hud.tsx'))
  const from = hud.indexOf('function DoorReleasedToast(')
  const next = hud.indexOf(' function ', from + 1)
  const toast = from < 0 ? '' : hud.slice(from, next < 0 ? undefined : next)
  if (
    !toast.includes('useMuseum((state) => state.progress.doorsReleased)') ||
    !toast.includes('listGrew(seenLength.current, released.length)') ||
    !toast.includes('museumAudio.lockRelease()')
  ) {
    problems.push(
      "ui/Hud.tsx: the toast of a released door no longer announces the growth of doorsReleased with the latch's sound",
    )
  }
  if (!/<div className="toast-stack">(?:(?!<\/div>).)*<DoorReleasedToast \/>/.test(hud)) {
    problems.push('ui/Hud.tsx no longer mounts DoorReleasedToast in the stack of toasts: the shortcut unlocks without a word')
  }
  return problems
}

/**
 * One ruler for the examine view (M4a): how far a piece is held and how
 * squarely a detail must face the camera are two numbers, and the content
 * gate judges every piece of the museum by them (`engine/examineReach.ts`).
 * If the view kept numbers of its own, the gate would go on proving pieces
 * cataloguable by a ruler the player is not held to.
 */
export function examineWiringProblems(read: SourceReader): string[] {
  const problems: string[] = []
  const view = squeezed(read('engine/Interaction.tsx'))

  // Not squeezed: the reader of imports works on the source as written.
  const imported = /import \{([^}]*)\} from '\.\/examineReach(?:\.ts)?'/.exec(read('engine/Interaction.tsx'))?.[1] ?? ''
  for (const constant of ['EXAMINE_HOLD_DISTANCE', 'EXAMINE_HOTSPOT_DOT']) {
    if (!new RegExp(`\\b${constant}\\b`).test(imported)) {
      problems.push(`engine/Interaction.tsx no longer imports ${constant} from engine/examineReach: the view and the gate measure with two rulers`)
    }
  }
  if (!view.includes('addScaledVector(holdOffset, EXAMINE_HOLD_DISTANCE)')) {
    problems.push('engine/Interaction.tsx no longer holds the piece at EXAMINE_HOLD_DISTANCE')
  }
  if (!view.includes('outward.dot(toCamera) > EXAMINE_HOTSPOT_DOT')) {
    problems.push('engine/Interaction.tsx no longer counts a detail as seen above EXAMINE_HOTSPOT_DOT')
  }
  // A number of its own under either name, old or new, is the second ruler.
  for (const declared of view.match(/\bconst (?:EXAMINE_)?(?:HOLD_DISTANCE|HOTSPOT_DOT) = [^;\n ]+/g) ?? []) {
    problems.push(`engine/Interaction.tsx declares \`${declared}\`: the ruler has one home, engine/examineReach.ts`)
  }

  const ruler = read('engine/examineReach.ts')
  for (const specifier of [...staticSpecifiers(ruler), ...dynamicSpecifiers(ruler)]) {
    problems.push(`engine/examineReach.ts imports "${specifier}": the ruler is arithmetic, or the gate cannot ask it`)
  }
  return problems
}

/**
 * The plan without spoilers (ÁT-I1): what the plan shows is decided by
 * `mapModel`, which `test:map` proves; the component only draws it. A room,
 * a door or a lock the component draws from the content by itself is one the
 * rules never saw.
 */
export function planWiringProblems(read: SourceReader): string[] {
  const problems: string[] = []
  const map = squeezed(read('ui/MuseumMap.tsx'))

  if (!map.includes('mapModel(MUSEUM, progress, {')) {
    problems.push('ui/MuseumMap.tsx no longer draws mapModel(MUSEUM, progress, …): what the plan shows is decided in the component again')
  }
  // The museum goes to the model whole and is read nowhere else; so does the save.
  for (const reading of new Set(map.match(/\bMUSEUM\.\w+(?:\.\w+)?\(?/g) ?? [])) {
    problems.push(
      `ui/MuseumMap.tsx reads \`${reading}\` by itself: a room, a door or a lock drawn outside the model shows what the player has not found`,
    )
  }
  for (const reading of new Set(map.match(/\bprogress\.\w+/g) ?? [])) {
    problems.push(`ui/MuseumMap.tsx reads \`${reading}\` by itself: what the save allows on the plan is the model's to say`)
  }
  if (map.includes('portal.oneWay')) {
    problems.push('ui/MuseumMap.tsx reads `portal.oneWay`: the one-way shortcut is drawn before the player has opened it')
  }
  if (!map.includes('yaw: playerHeading.yaw')) {
    problems.push("ui/MuseumMap.tsx no longer hands the camera's yaw to the model: the marker points north whatever the player faces")
  }
  if (!map.includes('rotate(${model.player.headingDegrees})')) {
    problems.push("ui/MuseumMap.tsx no longer turns the marker by the model's heading")
  }
  if (!map.includes("t('map.legend')")) {
    problems.push('ui/MuseumMap.tsx no longer titles the legend: `map.legend` is copy nobody shows again')
  }
  // One sign, one meaning. A question mark on the plan is the room beyond a
  // door nobody has been through; the list of locks used the same mark, and
  // what the stub's meant was said by a tooltip a finger never sees.
  if (/className="map-lock-mark"[^>]*>\s*\?/.test(map)) {
    problems.push('ui/MuseumMap.tsx marks a listed lock with the question mark the plan uses for a room not visited yet')
  }
  if (!/model\.doors\.some\(\(door\) => door\.stub\) \? \( <li>(?:(?!<\/li>).)*t\('map\.unknown'\)/.test(map)) {
    problems.push(
      'ui/MuseumMap.tsx no longer explains the stub in the legend while the plan draws one: on touch nothing says what the question mark is',
    )
  }

  // In the frame loop, as its last line: the dev harness's teleport publishes
  // the yaw too, and that one alone would leave a player's marker where the
  // spawn pointed it.
  const controller = squeezed(read('engine/PlayerController.tsx'))
  if (!controller.includes('playerHeading.yaw = camera.rotation.y }) return null')) {
    problems.push("engine/PlayerController.tsx no longer publishes the camera's yaw every frame: the marker on the plan never turns")
  }

  // Pure: the content and the save are parameters, so Node can ask it. Not
  // squeezed: the reader of imports works on the source as written.
  const model = read('ui/mapModel.ts')
  for (const specifier of [...staticSpecifiers(model), ...dynamicSpecifiers(model)]) {
    if (/content\/museum|state\/store|^react|^three|^zustand/.test(specifier)) {
      problems.push(`ui/mapModel.ts imports "${specifier}": the model is a function of what it is handed, or no suite can ask it`)
    }
  }
  return problems
}

/**
 * The notebook's panel inside its backdrop (`styles/museum.css`).
 *
 * The backdrop keeps a margin on every side, a share of the viewport, and the
 * panel asks for a share of the viewport too. The two were written apart:
 * 4vw + 96vw + 4vw is 104. On any window narrower than the panel's 60rem the
 * panel was wider than the room left for it, the grid track grew to hold it,
 * and it ran to the right edge of the screen with no margin there at all. A
 * phone held sideways is such a window, and the plan is the first page of
 * that panel.
 *
 * No layout engine runs in Node, so the two rules are read and added up. A
 * rule rewritten in another form is a problem too: better to be asked to
 * teach this check the new form than to have it pass on nothing.
 */
export function journalLayoutProblems(read: SourceReader): string[] {
  const css = read('styles/museum.css').replace(/\/\*[\s\S]*?\*\//g, ' ')
  const body = (selector: string) =>
    new RegExp(`(?:^|\\n)${selector.replaceAll('.', '\\.')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ''
  const cannot = (what: string) => [`styles/museum.css no longer ${what}: the check that the notebook fits the screen cannot add it up`]

  const padding = /\bpadding:\s*([\d.]+)vh\s+([\d.]+)vw\s*;/.exec(body('.journal'))
  if (!padding) return cannot('pads `.journal` as `<n>vh <n>vw`')
  const width = /\bwidth:\s*min\(\s*[\d.]+rem\s*,\s*([\d.]+)vw\s*\)\s*;/.exec(body('.journal-panel'))
  if (!width) return cannot('sizes the width of `.journal-panel` as `min(<n>rem, <n>vw)`')
  const height = /\bheight:\s*min\(\s*[\d.]+rem\s*,\s*([\d.]+)vh\s*\)\s*;/.exec(body('.journal-panel'))
  if (!height) return cannot('sizes the height of `.journal-panel` as `min(<n>rem, <n>vh)`')

  const problems: string[] = []
  const across = Number(width[1]) + 2 * Number(padding[2])
  if (across > 100) {
    problems.push(
      `the notebook's panel asks for ${width[1]}vw between two margins of ${padding[2]}vw, ${across} in all: ` +
        `on a narrow window it runs off the right edge of the screen`,
    )
  }
  const down = Number(height[1]) + 2 * Number(padding[1])
  if (down > 100) {
    problems.push(
      `the notebook's panel asks for ${height[1]}vh between two margins of ${padding[1]}vh, ${down} in all: ` +
        `on a short window its last line is under the bottom edge`,
    )
  }
  return problems
}

/**
 * The plan's page inside the notebook's body, and the title screen's column
 * inside the screen (`styles/museum.css`).
 *
 * Both are a column of things in a box of fixed height, and both went wrong
 * the same way: the height of one thing was worked out for what stood under
 * it on the day it was written. The plan's allowed for the legend, and the
 * list of touched locks came after; the title's column was centred, and with
 * two buttons it is taller than a phone held sideways.
 *
 * The cure is a form, not a figure: the plan's page is a flex column the
 * height of the body, the drawing is the one item that shrinks, and what is
 * under it never does; the title scrolls, and is centred by auto margins,
 * which do not push the top of a tall column off the screen. No layout engine
 * runs in Node, so this holds the rules to that form, and the browser route
 * measures the result.
 */
export function planPageLayoutProblems(read: SourceReader): string[] {
  const css = read('styles/museum.css').replace(/\/\*[\s\S]*?\*\//g, ' ')
  // Every rule written for the selector at the top level, together. What a
  // media query adds is indented, and is not the form.
  const body = (selector: string) =>
    [...css.matchAll(new RegExp(`(?:^|\\n)${selector.replace(/[.>]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'g'))]
      .map((rule) => rule[1])
      .join('\n')
  const has = (selector: string, declaration: RegExp) => declaration.test(body(selector))
  const problems: string[] = []

  if (!has('.journal-body', /\bflex:\s*1\s*;/) || !has('.journal-body', /\boverflow-y:\s*auto\s*;/)) {
    problems.push('styles/museum.css: `.journal-body` no longer takes what the tabs leave of the panel and scrolls inside it: the plan has no page to fit')
  }
  if (
    !has('.map', /\bdisplay:\s*flex\s*;/) ||
    !has('.map', /\bflex-direction:\s*column\s*;/) ||
    !has('.map', /\bheight:\s*100%\s*;/)
  ) {
    problems.push('styles/museum.css: `.map` is no longer a column the height of its page: the plan cannot give way to what is under it')
  }
  if (!has('.map > svg', /\bflex:\s*0 1 auto\s*;/) || !has('.map > svg', /\bmin-height:\s*0\s*;/)) {
    problems.push('styles/museum.css: the plan no longer shrinks (`.map > svg` wants `flex: 0 1 auto` and `min-height: 0`): the legend or the locks end under the fold')
  }
  if (/\bmax-height:[^;]*\b(?:calc|vh)\b/.test(body('.map > svg'))) {
    problems.push(
      'styles/museum.css: `.map > svg` allows for what is under the plan by a figure. It was right for the legend alone, and the first touched lock was listed under the fold',
    )
  }
  for (const under of ['.map-legend', '.map-locks']) {
    if (!has(under, /\bflex:\s*none\s*;/)) {
      problems.push(`styles/museum.css: \`${under}\` may be squeezed instead of the plan (it wants \`flex: none\`)`)
    }
  }

  if (!has('.title', /\boverflow-y:\s*auto\s*;/)) {
    problems.push('styles/museum.css: the title screen no longer scrolls: on a short screen the language buttons are under the bottom edge')
  }
  if (/\b(?:place-items|align-items|align-content|place-content):\s*center\b/.test(body('.title')) || !has('.title-panel', /\bmargin:\s*auto\s*;/)) {
    problems.push(
      'styles/museum.css: the title screen centres its panel in a way that cuts off the top of a column taller than the screen (centre it with `margin: auto` on `.title-panel`)',
    )
  }
  return problems
}

/**
 * The volumes the flood measures (M15). `test:navigation` proves that a
 * player can stand in front of every interactive with the eye within its
 * ray's reach and outside its volume, and it builds each volume itself
 * (`interactionVolumes`, in `museumWorld.ts`) by the rule the component is
 * supposed to follow. A component that pads by a number of its own, reaches
 * by a number of its own or hangs its box somewhere else would be proved
 * reachable by a box the player never aims at.
 */
export function interactionVolumeWiringProblems(read: SourceReader): string[] {
  const problems: string[] = []
  const need = (path: string, source: string, fragment: string, without: string) => {
    if (!source.includes(fragment)) problems.push(`${path} no longer has \`${fragment}\`: ${without}`)
  }

  const scene = squeezed(read('scenes/MuseumScene.tsx'))
  need(
    'scenes/MuseumScene.tsx',
    scene,
    'name={`exhibit:${exhibit.id}`} position={exhibit.position as unknown as [number, number, number]} rotation={[0, exhibit.rotationY ?? 0, 0]} scale={exhibit.scale ?? 1}',
    'a piece is placed by something other than its position, turn and scale, and the flood measured it where the content says',
  )

  // What is solid in the suites' world is put there by `buildMuseumWorld`,
  // which copies each placement by hand. These hold the three components to
  // registering the collider where that copy puts it: the base under a piece
  // (`mountPlacements`), a cabinet and the furniture of a room. The breaker's
  // is held by `powerControlWiringProblems`.
  need(
    'scenes/MuseumScene.tsx',
    scene,
    'registerKitColliders(kit, spec?.part, KIT_BUNDLE, collision, { roomOrigin, position: [exhibit.position[0], 0, exhibit.position[2]], rotationY: exhibit.rotationY, })',
    'the base under a mounted piece is no longer solid where the suites place it, and the capsule walks through a plinth the flood stood beside',
  )
  need(
    'engine/Containers.tsx',
    squeezed(read('engine/Containers.tsx')),
    'registerKitColliders(kit, container.part, kitBundle, collision, { roomOrigin, position: container.position, rotationY: container.rotationY, scale: 1, })',
    'a cabinet is no longer solid where the suites place it',
  )
  need(
    'engine/RoomFurniture.tsx',
    squeezed(read('engine/RoomFurniture.tsx')),
    'registerKitColliders(kit, placement.part, kitBundle, collision, { roomOrigin: room.origin, position: placement.position, rotationY: placement.rotationY, scale: placement.scale, })',
    'the furniture of a room is no longer solid where the suites place it',
  )

  const view = squeezed(read('engine/Interaction.tsx'))
  need('engine/Interaction.tsx', view, 'const REACH = INTERACTION_REACH.exhibit', 'the piece is reached by a number the flood does not read')
  need('engine/Interaction.tsx', view, 'instance.far = REACH', 'the ray at a piece no longer stops at its reach')

  const containers = squeezed(read('engine/Containers.tsx'))
  need('engine/Containers.tsx', containers, 'const REACH = INTERACTION_REACH.container', 'the cabinet is reached by a number the flood does not read')
  need('engine/Containers.tsx', containers, 'instance.far = REACH', 'the ray at a cabinet no longer stops at its reach')
  need('engine/Containers.tsx', containers, 'if (!notebook) return DRAWER_PROXY', 'a cabinet is aimed at by a box other than DRAWER_PROXY')
  need(
    'engine/Containers.tsx',
    containers,
    'return paddedProxy(new Box3().setFromObject(instance), PROXY_MINIMUM.notebook)',
    'the notebook is aimed at by a box other than its own bounds padded to the minimum',
  )
  need(
    'engine/Containers.tsx',
    containers,
    'name={`container:${container.id}`} position={container.position as unknown as [number, number, number]} rotation={[0, container.rotationY ?? 0, 0]}',
    'a container is placed by something other than its position and turn',
  )

  const controls = squeezed(read('engine/PowerControls.tsx'))
  need('engine/PowerControls.tsx', controls, 'const REACH = INTERACTION_REACH.powerControl', 'the control is reached by a number the flood does not read')
  need('engine/PowerControls.tsx', controls, 'instance.far = REACH', 'the ray at a control no longer stops at its reach')
  need(
    'engine/PowerControls.tsx',
    controls,
    'return paddedProxy(new Box3().setFromObject(instance), PROXY_MINIMUM.powerControl)',
    'a power control is aimed at by a box other than its own bounds padded to the minimum',
  )

  const devices = squeezed(read('engine/Devices.tsx'))
  need('engine/Devices.tsx', devices, 'const REACH = INTERACTION_REACH.device', 'the radio is reached by a number the flood does not read')
  need('engine/Devices.tsx', devices, 'instance.far = REACH', 'the ray at a radio no longer stops at its reach')
  need(
    'engine/Devices.tsx',
    devices,
    'return paddedProxy(new Box3().setFromObject(instance), PROXY_MINIMUM.radio)',
    'the radio is aimed at by a box other than its own bounds padded to the minimum',
  )

  // Every padded target hangs its box at the padded centre, at the padded size.
  for (const [path, component] of [
    ['engine/Containers.tsx', containers],
    ['engine/PowerControls.tsx', controls],
    ['engine/Devices.tsx', devices],
  ] as const) {
    need(
      path,
      component,
      '<mesh position={proxy.centre} visible={false}> <boxGeometry args={proxy.size} />',
      'its interaction box is not the one the padding returned',
    )
  }

  const doors = squeezed(read('engine/TransitionDoors.tsx'))
  need('engine/TransitionDoors.tsx', doors, 'const INTERACTION_DISTANCE = INTERACTION_REACH.door', 'the door is reached by a number the flood does not read')
  need(
    'engine/TransitionDoors.tsx',
    doors,
    'hits.find((candidate) => candidate.distance <= INTERACTION_DISTANCE)',
    'a door answers from further than its reach',
  )
  need(
    'engine/TransitionDoors.tsx',
    doors,
    '<boxGeometry args={[spec.width, spec.height, TRANSITION_DOOR_TARGET_DEPTH]} />',
    'the door is aimed at by a box other than its opening, as deep as the topology says',
  )
  need(
    'engine/TransitionDoors.tsx',
    doors,
    'position={[ 0, TRANSITION_DOOR_SILL_Y + spec.height / 2, TRANSITION_DOOR_PLANE_Z, ]} visible={canTargetDoor(phase)}',
    "the door's box no longer hangs on the plane of the leaves",
  )
  // Shut, a door is solid: that gate is what keeps the eye out of the box.
  need(
    'engine/TransitionDoors.tsx',
    doors,
    'return registerTransitionDoorGate(collision, spec)',
    'a shut door no longer stops the capsule, and the eye walks into its box',
  )
  return problems
}
