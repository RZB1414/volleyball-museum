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
  // A shut lock is not the whole of it: with the key in the hand the same
  // press opens it, and the prompt went on saying «precisa de chave». Whether
  // it still bars is the lock rule's answer to the press (`lockBars`), and
  // the wording is told when a shut lock gives.
  if (!source('ui/Hud.tsx').includes('lockBars(lock, MUSEUM.facts, { locksOpened, credentials })')) {
    problems.push(
      'ui/Hud.tsx no longer asks lockBars whether a shut lock gives to the press: a safe says it needs the key the player is holding',
    )
  }
  if (!source('ui/Hud.tsx').includes('containerPrompt(container, lock, barred, shut && !barred)')) {
    problems.push(
      'ui/Hud.tsx no longer tells containerPrompt when a shut lock gives to the press: the prompt says «Ler» over an E that turns a key',
    )
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
 * What the fit of the director's letter is counted with.
 *
 * The page is counted in lines, and a line in glyphs: the one figure here
 * that comes from a browser, and that only a browser can give again.
 */
export const LETTER_PAGE = {
  /** The height the lots measure at, in CSS px: the shortest desktop window the game is checked in. */
  viewportHeight: 720,
  remPx: 16,
  /**
   * Glyphs of the director's hand on one line of the sheet, rounded down to
   * the shortest full line the browser set (2026-10-05: «A tempestade desta
   * tarde derrubou a energia do»). A line of narrow letters holds 52, so a
   * letter this count passes has room to spare on the screen.
   */
  charsPerLine: 46,
  /** What that count was made for: the sheet's width, its side margins, the hand and the postscript's. */
  sheetWidthRem: 30,
  sideMarginRem: 2.2,
  fontRem: 1.04,
  postscriptFontRem: 0.94,
  /** The row of buttons under the page, in CSS px (59 measured). */
  actionsPx: 60,
} as const

export type LetterText = {
  readonly locale: string
  readonly paragraphs: readonly string[]
  readonly signature: string | null
  readonly postscript: string | null
}

/** How many lines a paragraph takes at so many glyphs to a line, wrapped by the word. */
function wrappedLines(text: string, glyphs: number) {
  let lines = 0
  let used = 0
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const needed = used === 0 ? word.length : used + 1 + word.length
    if (used > 0 && needed > glyphs) {
      lines += 1
      used = word.length
    } else used = needed
  }
  return lines + (used > 0 ? 1 : 0)
}

/**
 * The director's letter on its page (`styles/museum.css`).
 *
 * A letter is written to fit a page: the reader turns pages and never
 * scrolls one. L3 added a paragraph to the letter (the insurer, and the
 * ledger left in the vault), and at 1280 × 720 the page became 662 px of
 * letter in 589 of sheet, with the postscript under the fold; and the
 * postscript is the one lesson about locks the game gives. Nothing was
 * red: no suite knew the letter had a page.
 *
 * So the page is added up, as the journal's panel is. The sheet may take
 * what its backdrop leaves of the window. The writing sits on its rules:
 * the line, the ruling and the gap between paragraphs are one measure. And
 * the letter, counted in lines of that measure, fits the sheet at the
 * height the lots measure at, in every language it is written in. The
 * count of glyphs to a line is `LETTER_PAGE`'s, made in the browser for
 * one sheet and one hand; change either and this asks for the count again
 * rather than pass on a figure that no longer means anything.
 */
export function notebookLetterLayoutProblems(read: SourceReader, letters: readonly LetterText[]): string[] {
  const css = read('styles/museum.css').replace(/\/\*[\s\S]*?\*\//g, ' ')
  // The rule written for the selector at the top level; what a media query
  // adds is indented, and `within` reads it there.
  const body = (selector: string, within = css, indent = '') =>
    new RegExp(`(?:^|\\n)${indent}${selector.replace(/[.>]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(within)?.[1] ?? ''
  const cannot = (what: string) => [
    `styles/museum.css no longer ${what}: the check that the letter fits its page cannot count the lines`,
  ]
  const rem = (declaration: string, rules: string) => {
    const found = new RegExp(`\\b${declaration}:\\s*([\\d.]+)rem\\s*;`).exec(rules)
    return found ? Number(found[1]) : null
  }
  const ruling = (rules: string) => {
    const found =
      /repeating-linear-gradient\(\s*to bottom,\s*transparent 0 ([\d.]+)rem,\s*rgb\([^)]*\) ([\d.]+)rem ([\d.]+)rem\s*\)/.exec(rules)
    return found && found[1] === found[2] ? Number(found[3]) : null
  }

  const hand = body('.notebook-page.is-handwritten')
  const line = rem('line-height', hand)
  const font = rem('font-size', hand)
  const ruled = ruling(hand)
  if (line === null || font === null) return cannot('gives `.notebook-page.is-handwritten` a `line-height` and a `font-size` in rem')
  if (ruled === null) return cannot('rules the handwritten page with a repeating gradient of one line')
  const gap = /\bmargin:\s*0 0 ([\d.]+)rem\s*;/.exec(body('.notebook-page.is-handwritten p'))?.[1]
  if (gap === undefined) return cannot('sets the paragraphs of the handwritten page apart as `margin: 0 0 <n>rem`')
  const sheet = body('.notebook-sheet')
  const sheetHeight = /\bmax-height:\s*([\d.]+)vh\s*;/.exec(sheet)?.[1]
  const sheetWidth = /\bwidth:\s*min\(\s*([\d.]+)rem\s*,/.exec(sheet)?.[1]
  if (sheetHeight === undefined || sheetWidth === undefined) {
    return cannot('sizes `.notebook-sheet` as `min(<n>rem, …)` wide and `<n>vh` high at most')
  }
  const backdrop = /\bpadding:\s*([\d.]+)vh\s+[\d.]+vw\s*;/.exec(body('.notebook'))?.[1]
  if (backdrop === undefined) return cannot('pads `.notebook` as `<n>vh <n>vw`')
  const margins = /\bpadding:\s*([\d.]+)rem\s+([\d.]+)rem\s+([\d.]+)rem\s*;/.exec(body('.notebook-body'))
  if (!margins) return cannot('pads `.notebook-body` as three figures in rem')
  const postscriptFont = rem('font-size', body('.notebook-page .notebook-postscript'))
  if (postscriptFont === null) return cannot('gives the postscript a `font-size` in rem')

  const problems: string[] = []

  // --- the writing on its rules, on the desk and on a phone ------------------
  const onItsRules = (where: string, lineRem: number, ruledRem: number | null, gapRem: number | null) => {
    if (ruledRem !== lineRem) {
      problems.push(
        `the letter's page${where} is ruled every ${ruledRem ?? '?'}rem under lines of ${lineRem}rem: the writing walks off its rules`,
      )
    }
    if (gapRem !== lineRem) {
      problems.push(
        `the letter's page${where} sets its paragraphs ${gapRem ?? '?'}rem apart on lines of ${lineRem}rem: the paragraph after sits between two rules`,
      )
    }
  }
  onItsRules('', line, ruled, Number(gap))
  // Every block written for a phone held sideways, together.
  const phone = [...css.matchAll(/@media \(max-height: 420px\) \{([\s\S]*?)\n\}/g)].map((block) => block[1]).join('\n')
  const phoneHand = body('.notebook-page.is-handwritten', phone, ' {2}')
  const phoneLine = rem('line-height', phoneHand)
  if (phoneLine !== null) {
    onItsRules(
      ' on a phone held sideways',
      phoneLine,
      ruling(phoneHand),
      rem('margin-bottom', body('.notebook-page.is-handwritten p', phone, ' {2}')),
    )
  }

  // --- the sheet inside its backdrop ------------------------------------------
  const down = Number(sheetHeight) + 2 * Number(backdrop)
  if (down > 100) {
    problems.push(
      `the notebook's sheet asks for ${sheetHeight}vh between two margins of ${backdrop}vh, ${down} in all: ` +
        `on a short window its buttons are under the bottom edge`,
    )
  }

  // --- the letter, counted in lines -------------------------------------------
  const made = LETTER_PAGE
  if (
    Number(sheetWidth) !== made.sheetWidthRem ||
    Number(margins[2]) !== made.sideMarginRem ||
    font !== made.fontRem ||
    postscriptFont !== made.postscriptFontRem
  ) {
    problems.push(
      `the notebook's sheet is ${sheetWidth}rem wide with margins of ${margins[2]}rem, in a hand of ${font}rem (postscript ${postscriptFont}rem); ` +
        `the ${made.charsPerLine} glyphs to a line were counted for ${made.sheetWidthRem}rem, ${made.sideMarginRem}rem, ${made.fontRem}rem and ${made.postscriptFontRem}rem: ` +
        `count what a line of it holds again, in the browser, and write it in LETTER_PAGE (scripts/lib/runtimeWiring.ts)`,
    )
    return problems
  }
  const room = (Number(sheetHeight) / 100) * made.viewportHeight - made.actionsPx
  for (const letter of letters) {
    const lines =
      letter.paragraphs.reduce((sum, paragraph) => sum + wrappedLines(paragraph, made.charsPerLine), 0) +
      (letter.signature ? 1 : 0) +
      // The postscript is in a smaller hand: more glyphs to the same line.
      (letter.postscript ? wrappedLines(letter.postscript, Math.floor((made.charsPerLine * font) / postscriptFont)) : 0)
    // A line's worth of gap under every paragraph and under the signature;
    // the postscript, which closes the page, has none.
    const gaps = letter.paragraphs.length + (letter.signature ? 1 : 0)
    const needed = (lines + gaps) * line * made.remPx + (Number(margins[1]) + Number(margins[3])) * made.remPx
    if (needed > room) {
      problems.push(
        `the letter (${letter.locale}) needs ${Math.round(needed)} px of a page of ${Math.round(room)} at ${made.viewportHeight} px of window ` +
          `(${lines} lines and ${gaps} gaps of ${line}rem): its last lines, the postscript among them, are under the fold of a page nobody scrolls`,
      )
    }
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
  // The leaf of a door that stands open: the suites put it in their world by
  // `openDoorSolid`, and the game has to register that very box, for as long
  // as the door is open and no longer.
  const containerSource = squeezed(read('engine/Containers.tsx'))
  need(
    'engine/Containers.tsx',
    containerSource,
    'const solid = open ? openDoorSolid(container, kitBundle, roomOrigin) : null',
    'the door of an open container is not solid, or is solid while shut: the capsule walks through the leaf the suites stopped at',
  )
  need(
    'engine/Containers.tsx',
    containerSource,
    'const remove = collision.add(solid.geometry, solid.matrix)',
    'the open leaf is worked out and never put in the collision world',
  )
  need(
    'engine/Containers.tsx',
    containerSource,
    'const open = useMuseum((state) => containerOpen(container, state.progress))',
    'whether the leaf is solid is asked of something other than the rule that swings it open',
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
  need('engine/Devices.tsx', devices, 'const REACH = INTERACTION_REACH.device', 'a device is reached by a number the flood does not read')
  need('engine/Devices.tsx', devices, 'instance.far = REACH', 'the ray at a device no longer stops at its reach')
  // One box for every device that answers, padded by the minimum of its kind:
  // the flood builds each with the same function.
  need(
    'engine/Devices.tsx',
    devices,
    'return paddedProxy(new Box3().setFromObject(instance), deviceProxyMinimum(device))',
    'a device is aimed at by a box other than its own bounds padded to the minimum of its kind',
  )
  need(
    'engine/interactionTarget.ts',
    squeezed(read('engine/interactionTarget.ts')),
    "return device.kind === 'radio' ? PROXY_MINIMUM.radio : PROXY_MINIMUM.device",
    "a device's minimum is no longer the radio's own for a radio and the shared one for every other",
  )
  need(
    'engine/Devices.tsx',
    devices,
    'name={`device:${device.id}`} position={device.position as unknown as [number, number, number]} rotation={[0, device.rotationY ?? 0, 0]}',
    'a device is placed by something other than its position and turn',
  )
  // A device is solid where the suites place it (`buildMuseumWorld`): the
  // plinth of the hall left the furniture, whose layer registered it.
  need(
    'engine/Devices.tsx',
    devices,
    'registerKitColliders(kit, device.part, kitBundle, collision, { roomOrigin: room.origin, position: device.position, rotationY: device.rotationY, scale: 1, })',
    'a device is no longer solid where the suites place it, and the capsule walks through the plinth of the hall',
  )
  if (!/<DeviceLayer\b(?:(?!\/>).)*\bcollision=\{collision\}/.test(scene)) {
    problems.push('scenes/MuseumScene.tsx no longer hands the collision world to DeviceLayer: no device is solid')
  }

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

/**
 * A device answers the crosshair by one rule (L3): what the prompt says, what
 * E does and whether the touch button shows are `deviceIntent` and
 * `deviceLive`, proved in `test:opening-flow`. A thing that only says
 * something (the plinth of the hall) holds the prompt and never the key;
 * that is only true in the game if each of the five places that used to ask
 * the radio's own rule now asks the shared one.
 */
export function deviceWiringProblems(read: SourceReader): string[] {
  const problems: string[] = []
  const need = (path: string, fragment: string, without: string) => {
    if (!squeezed(read(path)).includes(fragment)) problems.push(`${path} no longer has \`${fragment}\`: ${without}`)
  }

  // The scan and the box: every device the content says answers, not the radios alone.
  need(
    'engine/Devices.tsx',
    'const AIMABLE_BY_ID = new Map(aimableDevices(MUSEUM).map((entry) => [entry.device.id, entry] as const))',
    'what the crosshair may rest on is a list of the component\'s own',
  )
  need(
    'engine/Devices.tsx',
    'if (aimableDeviceId(object.name, AIMABLE_BY_ID, carried)) targets.push(object)',
    'the scan no longer aims at every device that answers: a notice is never under the crosshair',
  )
  need(
    'engine/Devices.tsx',
    '{AIMABLE_BY_ID.has(device.id) ? ( <DeviceProxy device={device} instance={instance} hidden={carried} /> ) : null}',
    'a device that answers hangs no box to aim at',
  )

  // E: the shared arbitration decides whose the key is, the device's intent what it does.
  need(
    'engine/Devices.tsx',
    "if (winner?.kind !== 'device' || !winner.live) return false return operateDevice(winner.id)",
    'E works a device the arbitration did not give the key to: a notice would take it from the lamp',
  )
  need(
    'engine/Devices.tsx',
    'const intent = deviceIntent(entry.device, deviceInputOf(entry.device, useMuseum.getState(), MUSEUM)) if (!deviceLive(intent)) return false',
    'E no longer acts on the intent the prompt is worded by',
  )
  need(
    'engine/interactionTarget.ts',
    'live: focused !== undefined && deviceLive(deviceIntent(focused, deviceInputOf(focused, state, content))),',
    'whether a device takes the key is no longer its own rule: a notice, or a radio without charge, would',
  )

  // The prompt is worded by the same intent, and a notice is drawn with no key.
  need(
    'ui/Hud.tsx',
    'const view = devicePrompt(device, deviceIntent(device, deviceInputOf(device, { progress, radio, sequence }, MUSEUM)))',
    'the prompt of a device is worded by the component, apart from what E does',
  )
  need(
    'ui/Hud.tsx',
    "{view.form === 'notice' ? ( <> <span className=\"prompt-title\">{t(view.titleKey as never)}</span> <span className=\"prompt-label\">— {t(view.noticeKey as never)}</span> </> ) : (",
    'a notice is no longer drawn as its name and what it says, with no key',
  )
  need(
    'ui/Hud.tsx',
    '{view.key ? <span className="prompt-key">E</span> : null}',
    'the key is drawn for a device whether or not E does anything',
  )

  // Touch: the Action button shows for a live winner and for nothing else.
  need(
    'ui/MobileControls.tsx',
    "(winner.kind === 'door' ? doorCanAct : winner.live)",
    'the touch button shows for a thing E does nothing to',
  )

  // A clock put right (L3). The robot's hand that sets it is a copy of these
  // lines, and proves the copy: here the component is held to recording the
  // verb's own grant on E, to showing the hour the rule gives, and to
  // announcing it by the rule that knows a clock's flag from any other.
  need(
    'engine/Devices.tsx',
    "case 'clock': if (entry.device.kind !== 'clock') return false useMuseum.getState().grant(clockGrant(entry.device)) return true",
    'E on a clock no longer records what the verb says: the press is taken and the clock stays wrong',
  )
  need(
    'engine/Devices.tsx',
    'const nightMinutes = useMuseum((state) => setClockMinutes(MUSEUM.nightClock, device.setFlag, state.progress, MUSEUM))',
    'a clock that was set no longer reads the hour of the night off the save',
  )
  need(
    'engine/Devices.tsx',
    'const angles = clockFaceAngles(device.stoppedAt, count.advance(delta), night)',
    'the hands are no longer turned to the hour of the night once the clock is set',
  )
  need(
    'ui/Hud.tsx',
    'const set = clockJustSet(seenLength.current, flags, clockFlags)',
    'the toast of the clock is no longer decided by the rule: it would greet a Continue, or any flag at all',
  )
  need(
    'ui/useNightPhraseKey.ts',
    'MUSEUM.nightClock ? nightPhraseKey(MUSEUM.nightClock, nightPoints(MUSEUM.nightClock, state.progress, MUSEUM)) : null',
    'the hour the HUD says is no longer the one the night stands at',
  )
  need(
    'ui/Hud.tsx',
    "{phraseKey ? ` — ${t(phraseKey as never)}` : ''}",
    'the toast of the clock no longer says the hour it was set to',
  )
  // The gate lets a spoken line carry `{hora}` (`speech-token-unknown` spares
  // it wherever there is a night clock), so the subtitle has to fill it.
  need(
    'ui/Hud.tsx',
    'fillHour(t(radio.lineKeys[radio.index] as never), hourKey ? t(hourKey as never) : null)',
    'a line of the radio that says the hour would show the token as it was typed',
  )
  return problems
}

/**
 * The office answers (L3, F3): a thing that speaks, a cabinet read one paper
 * at a time, a door on a hinge, a credential announced by name.
 *
 * Each of the four is a pure module a suite proves (`voiceDevice.ts` and the
 * voice's intent, `readingQueue.ts`, `containerNodes.ts`, `credentialsTaken`)
 * and a line in a component that calls it. The robot's hand for the voice is
 * the very function the component calls, so the hand proves the function and
 * not the `case` that reaches it; nothing in Node draws a reader, swings a
 * door or mounts a toast. These hold each component to the call.
 *
 * A fifth joined them with the Posse: the toast of a line the curator has
 * just noted on the list (`checklistToastStep`).
 */
export function officeAnswersWiringProblems(read: SourceReader): string[] {
  const problems: string[] = []
  const need = (path: string, fragment: string, without: string) => {
    if (!squeezed(read(path)).includes(fragment)) problems.push(`${path} no longer has \`${fragment}\`: ${without}`)
  }

  // --- a thing that speaks ------------------------------------------------------
  need(
    'engine/Devices.tsx',
    "case 'voice': return operateVoice(deviceId)",
    'E on a telephone or a machine is taken and nothing is said: the prompt offers what the key does not do',
  )
  need(
    'engine/voiceDevice.ts',
    'const intent = deviceIntent(device, deviceInputOf(device, state, content))',
    'what a voice does on E is decided apart from the intent its prompt is worded by',
  )
  need(
    'engine/voiceDevice.ts',
    "if (intent.intent === 'skip') { state.advanceRadio() return true }",
    'E on a voice that is speaking starts it over instead of moving it on a line',
  )
  need(
    'engine/voiceDevice.ts',
    '...(utterance.documentId === undefined ? {} : { grantOnEnd: recordingGrant(content, utterance.documentId) }),',
    'a recording is played and never filed: the archive stays empty however many times it is heard',
  )
  // Filed with the last line and with nothing less; one write for the end
  // and what it means.
  need(
    'state/store.ts',
    'const filed: ProgressGrant = heardOut && radio.grantOnEnd ? radio.grantOnEnd : {}',
    'what a transmission files is written whether or not it was heard to its end, or not at all',
  )
  need(
    'state/store.ts',
    'commitProgress((progress) => grantProgress(grantProgress(progress, heard), filed), {',
    'the end of a transmission and what it files are no longer one write',
  )
  need(
    'engine/Devices.tsx',
    'const lit = messageLampLit(device, deviceInputOf(device, useMuseum.getState(), MUSEUM), clock.elapsedTime)',
    'the message lamp is lit by something other than the rule: it blinks with no message, or after it was heard',
  )
  need(
    'engine/Devices.tsx',
    "const material = materials.get(lit ? 'led-red' : 'led-off')",
    'the message lamp no longer shows red for a message and dark for none',
  )
  need(
    'engine/Devices.tsx',
    "{device.kind === 'voice' && device.messageLamp ? ( <VoiceDeviceView device={device} instance={instance} materials={materials} /> ) : null}",
    'a voice with a message lamp never has it painted',
  )
  // A voice takes the air from whatever was on it. A call of the porter's
  // cut off that way was not heard and wrote nothing, so the director has to
  // ask again when the air falls silent: the save will not tell it to.
  need(
    'engine/Devices.tsx',
    'const onAir = useMuseum(airTaken)',
    'the director no longer watches the air: a call cut off by a telephone dialled over it waits for some other change of the save to come back',
  )
  need(
    'engine/Devices.tsx',
    '}, [onAir, progress])',
    'the director schedules what is owed only when the save changes: a call that was cut off is not delivered again',
  )
  need(
    'engine/Devices.tsx',
    'if (!call || timers.has(call.id) || useMuseum.getState().radio?.callId === call.id) continue',
    'the call being said is scheduled again while it is on air',
  )

  // --- one paper at a time ----------------------------------------------------------
  need(
    'engine/Containers.tsx',
    "const next = readerAdvance(MUSEUM, state.openedContainer, state.notebookPage) if (next !== 'close') { state.setNotebookPage(next) return true } state.setOpenedContainer(null) return true",
    'E in an open cabinet closes it from its first paper: the second is never read',
  )
  need(
    'ui/Hud.tsx',
    'containerReadQueue(MUSEUM, openedContainer)',
    'the reader lists the papers of a cabinet by a rule of its own',
  )
  need('ui/Hud.tsx', 'const current = queue[shown]', 'the reader draws every paper of the cabinet at once again')
  need(
    'ui/Hud.tsx',
    'useReaderKeys(queue.length > 0, lastPage)',
    'the arrow keys turn the pages of the notebook and not of a cabinet',
  )
  need(
    'ui/Notebook.tsx',
    'useReaderKeys(Boolean(openedContainer) && pages.length > 0, lastPage)',
    'the notebook no longer turns its pages by the keys every reader shares',
  )
  need(
    'ui/useReaderKeys.ts',
    'const page = readerKeyPage(event.code, state.notebookPage, lastPage)',
    'the keys that turn a page are decided in the component, apart from the rule a suite asks',
  )
  need(
    'ui/Hud.tsx',
    "{shown < lastPage ? ( <button type=\"button\" onClick={() => setPage(shown + 1)}> {t('reader.next')} → </button> ) : (",
    'the reader has no way on to the next paper for a mouse or a finger',
  )
  // A recording is printed as what was said, wherever it is read again.
  for (const path of ['ui/Hud.tsx', 'ui/Journal.tsx']) {
    need(path, 'transcriptText(', 'a recording is filed and shows its one-line summary where its words should be')
  }

  // --- a door on a hinge ------------------------------------------------------------
  need(
    'engine/Containers.tsx',
    'const open = useMuseum((state) => containerOpen(container, state.progress))',
    'whether a cabinet stands open is no longer its lock\'s to say',
  )
  need(
    'engine/Containers.tsx',
    'prepareContainerDoor(instance, container.part, container.door)',
    'a door declared in the content is never put on its hinge',
  )
  need(
    'engine/Containers.tsx',
    'const target = open ? container.door.openAngle : 0',
    'the door of an open safe stays shut, or the door of a shut one swings',
  )
  need('engine/Containers.tsx', 'swingContainerDoor(door, angle)', 'the hinge is never turned')
  need(
    'engine/Containers.tsx',
    'useLayoutEffect(() => showContainerContents(contents, open), [contents, open])',
    'what a safe holds is drawn through its shut door, or never drawn at all',
  )

  // --- a credential announced by name ------------------------------------------------
  need(
    'ui/Hud.tsx',
    'const taken = credentialsTaken(seenLength.current, credentials, credentialTitles)',
    'the toast of a credential is no longer decided by the rule: it would greet a Continue',
  )
  need(
    'ui/Hud.tsx',
    'new Map( (MUSEUM.credentials ?? []).map((entry) => [credentialKey(entry.credential), entry.titleKey]), )',
    'a credential is announced by a name the component made up, not by the content\'s',
  )
  if (!/<div className="toast-stack">(?:(?!<\/div>).)*<CredentialToast \/>/.test(squeezed(read('ui/Hud.tsx')))) {
    problems.push('ui/Hud.tsx no longer mounts CredentialToast in the stack of toasts: a key is handed over without a word')
  }
  // The HUD is a chunk of its own and may be evaluated before the canvas:
  // without this import its first render can see the save before the content
  // has settled it, and a key an open drawer was owed since another night is
  // announced as taken now.
  if (!/import '\.\.\/engine\/contentRegistry(?:\.ts)?'/.test(squeezed(read('ui/Hud.tsx')))) {
    problems.push(
      'ui/Hud.tsx no longer imports engine/contentRegistry: its toasts may first see a save the content has not settled, and announce what a trigger gives at load',
    )
  }

  // --- a line just noted in the notebook (L3, the Posse) -------------------------------
  // «Anotado no caderno» is decided by a rule over two saves, the one the HUD
  // last saw and the one it sees now (`checklistToastStep`). The component's
  // part is to hand it those two, and the list the notebook itself draws.
  need(
    'ui/Hud.tsx',
    'const step = checklistToastStep(checklistItems, seen.current, progress, MUSEUM, unlocked)',
    'the toast of a line just noted is no longer decided by the rule: it would greet a Continue, or a player who has no notebook to look in',
  )
  need(
    'ui/Hud.tsx',
    'const checklistItems = checklistPageOf(MUSEUM)?.items ?? []',
    'the toast watches a list of its own, and not the one the notebook draws',
  )
  need(
    'ui/Hud.tsx',
    'const seen = useRef(progress)',
    'the toast has no save to compare with: its first render would announce every line a save arrives with',
  )
  need(
    'ui/Hud.tsx',
    'seen.current = progress',
    'the toast never moves on from the save it first saw: every later write would announce the same line again',
  )
  if (!/<div className="toast-stack">(?:(?!<\/div>).)*<ChecklistToast \/>/.test(squeezed(read('ui/Hud.tsx')))) {
    problems.push('ui/Hud.tsx no longer mounts ChecklistToast in the stack of toasts: a line is added to a page the player is not looking at, without a word')
  }
  return problems
}

/**
 * The reader of a cabinet, on a screen of any height (`styles/museum.css`).
 *
 * The panel scrolled whole, and the button that closed it was the last thing
 * in the scroll. With a paper to a page, the button that turns to the next
 * one would be there too: on a phone held sideways the panel was 179 px
 * tall, and «Próximo» sat 100 px under its fold, on every page.
 *
 * The cure is a form, as for the plan's page: the reader is a column that
 * does not scroll, its paper is the one item that does, and its buttons
 * never shrink. On a short screen it may also be taller than the examine
 * view (nothing is held up behind a paper), and that height is added to the
 * backdrop's margin here, since no layout engine runs in Node.
 */
export function readerLayoutProblems(read: SourceReader): string[] {
  const css = read('styles/museum.css').replace(/\/\*[\s\S]*?\*\//g, ' ')
  const body = (selector: string, within = css, indent = '') =>
    new RegExp(`(?:^|\\n)${indent}${selector.replace(/[.>]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(within)?.[1] ?? ''
  const problems: string[] = []

  const panel = body('.examine-panel.is-reader')
  if (!/\bdisplay:\s*flex\s*;/.test(panel) || !/\bflex-direction:\s*column\s*;/.test(panel) || !/\boverflow-y:\s*hidden\s*;/.test(panel)) {
    problems.push(
      'styles/museum.css: `.examine-panel.is-reader` is no longer a column that does not scroll: the buttons of the reader go under the fold with a long paper',
    )
  }
  const paper = body('.examine-panel.is-reader .document')
  if (!/\bflex:\s*1 1 auto\s*;/.test(paper) || !/\bmin-height:\s*0\s*;/.test(paper) || !/\boverflow-y:\s*auto\s*;/.test(paper)) {
    problems.push(
      'styles/museum.css: the paper of the reader no longer shrinks and scrolls (`.document` wants `flex: 1 1 auto`, `min-height: 0` and `overflow-y: auto`): a long paper is cut off, or pushes the buttons out',
    )
  }
  if (!/\bflex:\s*none\s*;/.test(body('.examine-panel.is-reader .examine-actions'))) {
    problems.push('styles/museum.css: the buttons of the reader may be squeezed instead of the paper (they want `flex: none`)')
  }

  // On a phone held sideways: the reader's height and the margin under it.
  const phone = [...css.matchAll(/@media \(max-height: 420px\) \{([\s\S]*?)\n\}/g)].map((block) => block[1]).join('\n')
  const tall = /\bmax-height:\s*([\d.]+)vh\s*;/.exec(body('.examine-panel.is-reader', phone, ' {2}'))?.[1]
  const under = /\bpadding:\s*0\s+[\d.]+vw\s+([\d.]+)vh\s*;/.exec(body('.examine'))?.[1]
  const usual = /\bmax-height:\s*([\d.]+)vh\s*;/.exec(body('.examine-panel'))?.[1]
  if (tall === undefined || under === undefined || usual === undefined) {
    problems.push(
      'styles/museum.css no longer sizes the reader as `max-height: <n>vh` (and on a short screen, again) over a backdrop padded `0 <n>vw <n>vh`: the check that it fits a phone cannot add it up',
    )
  } else {
    if (Number(tall) + Number(under) > 100) {
      problems.push(
        `the reader asks for ${tall}vh over a margin of ${under}vh on a short screen, ${Number(tall) + Number(under)} in all: its first lines are above the top edge`,
      )
    }
    if (Number(tall) <= Number(usual)) {
      problems.push(
        `the reader is ${tall}vh tall on a short screen, no more than the ${usual}vh of the examine view: on a phone held sideways that is a title and its buttons, with no room for the paper`,
      )
    }
  }

  if (!squeezed(read('ui/Hud.tsx')).includes('<div className="examine-panel is-reader">')) {
    problems.push('ui/Hud.tsx no longer gives the reader of a cabinet the class `is-reader`: it scrolls whole again, buttons and all')
  }
  return problems
}

/**
 * The clock on the wall: what it has counted, and when that goes to the
 * save, is `engine/clockCount.ts`, which `test:save` runs against the real
 * store in two tabs. A game started over in another tab must not begin with
 * the time a clock ran in the erased one, and the count is where that is
 * kept from happening.
 *
 * In that suite React is two lines written by hand: the effect that runs the
 * count while the room has power, and the frame that advances it. This holds
 * the component to those two lines, to handing the count the whole store
 * (the game in play among it), and to recording nothing by itself: a
 * `recordClockSeconds` left in the component writes whatever it has counted
 * into whatever game the store holds.
 */
export function clockWiringProblems(read: SourceReader): string[] {
  const problems: string[] = []
  const devices = squeezed(read('engine/Devices.tsx'))
  const need = (fragment: string, without: string) => {
    if (!devices.includes(fragment)) problems.push(`engine/Devices.tsx no longer has \`${fragment}\`: ${without}`)
  }

  need(
    'const CLOCK_STORE: ClockStore = { useMuseum, contributeToSave, gameInPlay }',
    'the count is not handed the store as it is, and cannot tell the game it was made in from the one in play',
  )
  need(
    'const count = useMemo(() => clockCount(device.id, CLOCK_STORE), [device.id])',
    'the clock no longer keeps its count in clockCount, where the suites can run it',
  )
  need('const powered = usePowered(device.runsWithPowerOf)', 'the clock no longer asks whether its own room has power')
  need(
    'useEffect(() => { if (powered) return count.run() count.stop() return undefined }, [count, powered])',
    'the count is not run while the room has power and stopped when it has none, as the suites run it',
  )
  need(
    'useFrame((_, delta) => { const angles = clockFaceAngles(device.stoppedAt, count.advance(delta), night)',
    'the hands are not turned by the count, advanced once a frame',
  )
  if (/\brecordClockSeconds\b/.test(devices) || /\bcontributeToSave\(/.test(devices)) {
    problems.push(
      'engine/Devices.tsx records a clock by itself: a count goes to the save by clockCount, which knows the game it was made in',
    )
  }

  // Handed the store and importing none: a count that reached for the module
  // would be the same one in every tab a suite opens. Not squeezed: the
  // reader of imports works on the source as written.
  const count = read('engine/clockCount.ts')
  for (const specifier of [...staticSpecifiers(count), ...dynamicSpecifiers(count)]) {
    if (/state\/store|^react|^zustand/.test(specifier)) {
      problems.push(`engine/clockCount.ts imports "${specifier}": the count is handed its store, or no suite can give it a tab's own`)
    }
  }
  return problems
}

/**
 * The ending (L3, F4): a desk a term is signed at, and the sequence that
 * follows a signature.
 *
 * The rules are pure modules the suite of the ending proves on a house made
 * for it (`termRules.ts`, `sequenceRules.ts`), and two React-free modules
 * make the presses (`signingDesk.ts`, `sequenceDirector.ts`): the suite and
 * the robot call those very functions. What nothing in Node reaches is the
 * line in each component that calls them: the `case` that hands E to the
 * desk, the listener that signs when a hold fires, the lamp and the Book,
 * the words of the prompt, the overlay that starts and plays a sequence,
 * the radio that waits under it. These hold each component to the call.
 */
export function endingWiringProblems(read: SourceReader): string[] {
  const problems: string[] = []
  const need = (path: string, fragment: string, without: string) => {
    if (!squeezed(read(path)).includes(fragment)) problems.push(`${path} no longer has \`${fragment}\`: ${without}`)
  }

  // --- the desk: the press, and the signature a held press makes -----------------
  need(
    'engine/Devices.tsx',
    "case 'desk': return pressSigningDesk(deviceId)",
    'E on a signing desk is taken and asks for no hold: the prompt says to hold a key that does nothing',
  )
  need(
    'engine/signingDesk.ts',
    'const intent = deviceIntent(desk, deviceInputOf(desk, store.getState(), content))',
    'what a desk does on E is decided apart from the intent its prompt is worded by',
  )
  need(
    'engine/signingDesk.ts',
    "if (found.state.state === 'ready') return { id: deviceId, seconds: found.desk.holdSeconds }",
    'a term ready to be signed no longer asks for the press to be held, for the time its own desk gives',
  )
  need(
    'engine/signingDesk.ts',
    "if (found.state.state !== 'blocked') return false museumAudio.lockDenied() return true",
    'a desk whose term still waits takes the press in silence, or leaves it to whatever stands behind',
  )
  need(
    'engine/signingDesk.ts',
    "if (state?.state !== 'ready') return false store.getState().grant(termGrant(state.term))",
    'a hold that fires signs nothing, or signs a term the desk is not offering',
  )
  need(
    'engine/termRules.ts',
    'return { termsSigned: [term.id] }',
    'a signature records something other than itself: the flag it sets is the trigger\'s to give, once',
  )
  need(
    'engine/triggers.ts',
    "(term): Trigger => ({ id: `term:${term.id}:signed`, when: { termsSigned: [term.id] }, effects: [{ kind: 'set-flag', flag: term.grants }], }),",
    'a term no longer compiles the trigger that sets its flag: a signed term changes nothing in the night',
  )
  need(
    'engine/Devices.tsx',
    'const stopSigning = onPrimaryHoldFired(signAtDesk)',
    'nobody listens for a hold that fires: the ring closes and no term is signed',
  )
  // The next term is not offered under the card of the one just signed.
  need(
    'engine/deviceRules.ts',
    'const sequenceOwed = (world.sequence ?? null) !== null || dueSequence(content.sequences ?? [], progress, content) !== null',
    'a desk no longer knows that a sequence is on screen or owed',
  )
  need(
    'engine/deviceRules.ts',
    'signingDeskState(content.terms ?? [], device, progress, content, sequenceOwed)',
    'a desk offers its next term while the card of the last one is still up',
  )

  // --- its lamp and its Book --------------------------------------------------------
  need(
    'engine/Devices.tsx',
    'const nodes = useMemo(() => prepareDeskNodes(instance, device.part), [device.part, instance])',
    'the lamp and the Book of a desk are never gathered: both are drawn always',
  )
  need(
    'engine/Devices.tsx',
    'const intent = deviceIntent(device, deviceInputOf(device, { progress, radio: null, sequence }, MUSEUM))',
    'what a desk draws is asked of something other than what its prompt says it stands at',
  )
  need(
    'engine/Devices.tsx',
    'const { lamp, book } = state ? deskShows(state, device, progress) : { lamp: false, book: false }',
    'the lamp and the Book are drawn by a rule of the component\'s own',
  )
  need(
    'engine/Devices.tsx',
    'useLayoutEffect(() => showDeskNodes(nodes, lamp, book), [book, lamp, nodes])',
    'the lamp and the Book are never hidden or shown',
  )
  need(
    'engine/Devices.tsx',
    "{device.kind === 'signing-desk' ? ( <SigningDeskView device={device} instance={instance} materials={materials} /> ) : null}",
    'a signing desk is never given its lamp and its Book to work',
  )

  // --- the words ---------------------------------------------------------------------
  need(
    'ui/Hud.tsx',
    'const view = devicePrompt(device, deviceIntent(device, deviceInputOf(device, { progress, radio, sequence }, MUSEUM)))',
    'the prompt of a desk does not know of the card on screen, and offers what E will not take',
  )
  need(
    'ui/Hud.tsx',
    "if (view.form === 'hold') return <HoldPrompt holdId={view.holdId} termKey={view.termKey} />",
    'a term ready to be signed is drawn as an ordinary prompt: nothing says the key has to be held',
  )
  need('ui/Hud.tsx', 'const missing = deskMissingText(', 'what a term still waits for is worded by the component, apart from the rule a suite asks')
  need(
    'ui/Journal.tsx',
    'const signed = signedTerms(MUSEUM.terms ?? [], progress)',
    'the notebook no longer lists the terms the save says were signed',
  )
  need(
    'ui/Notebook.tsx',
    'const isSigned = signedTerms(MUSEUM.terms ?? [], progress).some((term) => term.id === page.termId)',
    'the signature line of a term in the book is filled, or left empty, whatever the save says',
  )
  // The body of a term opens with its own title, in capitals, as the page
  // of the handover before it does. A heading over that is the title twice.
  if (squeezed(read('ui/Notebook.tsx')).includes('<h3>{text(shown.titleKey)}</h3>')) {
    problems.push('ui/Notebook.tsx prints the title of a term over a body that opens with it: the page reads the title twice')
  }

  // --- the sequence: started, played, recorded ------------------------------------------
  need(
    'ui/SequenceOverlay.tsx',
    'const owed = useMuseum((state) => dueSequence(MUSEUM.sequences ?? [], state.progress, MUSEUM)?.id ?? null)',
    'the overlay no longer watches the save for a sequence that is owed',
  )
  need(
    'ui/SequenceOverlay.tsx',
    'const held = radioHeld({ modal, hidden }) || !sceneReady',
    'a sequence starts and counts under a modal, in a hidden tab or before the scene is there: it plays to nobody and is recorded as seen',
  )
  need(
    'ui/SequenceOverlay.tsx',
    'if (owed !== null && playing === null) startDueSequence(held)',
    'nothing starts the sequence a signature is followed by',
  )
  need(
    'engine/sequenceDirector.ts',
    'if (held || !state.started || state.sequence !== null) return false const due = dueSequence(content.sequences ?? [], state.progress, content) if (!due) return false state.startSequence(due.id, due.steps.length) return true',
    'the director starts a sequence by a rule of its own: over another, on the title screen, or one the save is not owed',
  )
  need(
    'ui/SequenceOverlay.tsx',
    'if (current?.serial === playing.serial && current.index === playing.index) advance()',
    'a step of a sequence is moved on by a timer that belongs to another step',
  )
  need('ui/SequenceOverlay.tsx', 'sequenceStepSeconds(step, text) * 1000', 'a step of a sequence stays up for a time of the component\'s own')
  need(
    'ui/SequenceOverlay.tsx',
    'fillHour(t(step.lineKey as never), hourKey ? t(hourKey as never) : null)',
    'a line of a sequence that says the hour would show the token as it was typed',
  )
  if (!/\n\s*<SequenceOverlay \/>/.test(read('ui/Hud.tsx'))) {
    problems.push('ui/Hud.tsx no longer mounts SequenceOverlay: a term is signed and nothing follows')
  }
  need(
    'state/store.ts',
    'set({ sequence: { id, index: 0, steps, serial: sequenceSerial }, radio: null })',
    'a sequence starts under the porter\'s voice: the two speak on the same line of the screen',
  )
  need(
    'state/store.ts',
    'if (sequence.index + 1 < sequence.steps) { set({ sequence: { ...sequence, index: sequence.index + 1 } }) return }',
    'a sequence is over, and on record, before its last step was shown',
  )
  need(
    'state/store.ts',
    'commitProgress((progress) => grantProgress(progress, { sequencesSeen: [sequence.id] }), { sequence: null })',
    'a sequence seen to its end is not recorded, or is recorded in another write than the one that ends it: it plays again at every load',
  )
  need(
    'state/store.ts',
    'if (anotherGame && mine.sequence) taken.sequence = null',
    'a card of the erased game stays up in a tab that took the new one, and is recorded as seen in it',
  )
  // One window shows one tab at a time. What a tab was showing when the
  // player left it is held there, and may be seen or heard to its end in the
  // tab they went to: the store takes it down when it hears so.
  need(
    'state/store.ts',
    'if (mine.sequence && progress.sequencesSeen.includes(mine.sequence.id)) taken.sequence = null',
    'a card held in a hidden tab stays up after another tab has shown it to its end: the closing of the night is shown twice',
  )
  need(
    'state/store.ts',
    'if (mine.radio?.callId !== undefined && progress.radioCalls.includes(mine.radio.callId)) taken.radio = null',
    'a call held in a hidden tab stays in the air after another tab has heard it out: the porter says it twice',
  )

  // --- the radio under it ----------------------------------------------------------------
  need(
    'engine/Devices.tsx',
    'const onAir = useMuseum(airTaken)',
    'the director of the radio does not hear a sequence end: a call it cut off waits for some other change of the save',
  )
  need('engine/Devices.tsx', 'onAir: airTaken(state),', 'a call of the porter\'s is delivered over a sequence that is playing')
  need(
    'engine/deviceRules.ts',
    'return state.radio !== null || (state.sequence ?? null) !== null',
    'the air is the radio\'s alone again: a sequence on screen is not something a call waits for',
  )
  need('engine/radioCall.ts', 'if (skipSequenceStepOn(store)) return true', 'the call button places a call over a sequence instead of moving it on')
  // And the button says what its press does: «Pular» while anything has the
  // air, the sequence included, never «Chamar a portaria» over a card.
  need(
    'ui/Hud.tsx',
    'const onAir = useMuseum(airTaken)',
    'the radio button of the HUD reads «call the porter» while a sequence is on screen, and its press skips a step of it',
  )
  need(
    'engine/Devices.tsx',
    'if (skipSequenceStep()) { event.preventDefault() return }',
    'R skips a step of a sequence only for a player who carries the radio',
  )
  need(
    'engine/sequenceDirector.ts',
    'if (state.sequence === null || isModalOpen(state)) return false state.advanceSequence() return true',
    'a key moves a sequence on while a modal holds it hidden',
  )
  return problems
}

/**
 * The press that is held (L3, F4), on its two paths: the E key and the touch
 * button.
 *
 * The gesture is one reducer (`holdAction.ts`) kept in one place
 * (`primaryAction.ts`), and `test:mobile-controls` runs both. What it cannot
 * run is the wiring that feeds the reducer its four events from a keyboard
 * and from a pointer: the key going down and coming up, Escape, the window
 * losing focus, the frame that counts, the pointer on the button. With any
 * of those lines gone the hold never begins, never ends, or signs by itself.
 *
 * And one thing it must leave alone: every other press in the museum. On
 * the touch button only a press that has to be held is taken as the pointer
 * goes down; everything else still acts on the click, once.
 */
export function holdWiringProblems(read: SourceReader): string[] {
  const problems: string[] = []
  const need = (path: string, fragment: string, without: string) => {
    if (!squeezed(read(path)).includes(fragment)) problems.push(`${path} no longer has \`${fragment}\`: ${without}`)
  }

  // --- the reducer, and where it is kept ----------------------------------------------
  need('engine/primaryAction.ts', 'const next = holdStep(gesture, event)', 'the shared gesture is stepped by a rule other than the one the suite runs')
  need(
    'engine/primaryAction.ts',
    "return isHoldRequest(answer) ? beginPrimaryHold(answer) : 'acted'",
    'a handler that asks for a hold is taken to have acted: nothing is held, and nothing ever signs',
  )
  need(
    'engine/primaryAction.ts',
    'if (answer === false) continue',
    'a handler that declines stops the press, or one that asks for a hold lets it go on to the handlers below',
  )
  need(
    'engine/primaryAction.ts',
    'if (holdMark(gesture) !== before) for (const listener of [...holdListeners]) listener()',
    'the HUD is told of a hold frame by frame, or not at all',
  )
  need(
    'engine/primaryAction.ts',
    'if (next.fired !== null) for (const listener of [...firedListeners]) listener(next.fired)',
    'a hold that fires tells nobody',
  )

  // --- the keyboard ----------------------------------------------------------------------
  need(
    'engine/Devices.tsx',
    'const answer = interact() if (answer === false) return event.preventDefault()',
    'E on a device no longer claims the press it took, or claims one it declined',
  )
  need(
    'engine/Devices.tsx',
    'if (isHoldRequest(answer)) beginPrimaryHold(answer)',
    'E on a desk with a term ready begins no hold',
  )
  need('engine/Devices.tsx', 'if (isInteractKey(event)) releasePrimaryAction()', 'E coming up is not the release: a tap never asks, and letting go never cancels')
  need("engine/Devices.tsx", "window.addEventListener('keyup', onKeyUp)", 'nobody hears E come up')
  need('engine/Devices.tsx', 'if (isHoldCancelKey(event)) cancelPrimaryHold()', 'Escape no longer drops a hold, or the question after a tap')
  need(
    'engine/Devices.tsx',
    "window.addEventListener('blur', dropHold)",
    'a window that loses focus with E down goes on holding: the key that comes up elsewhere never says so',
  )
  need(
    'engine/Devices.tsx',
    "if (document.visibilityState === 'hidden') cancelPrimaryHold()",
    'a tab hidden with E down goes on holding',
  )
  need("engine/Devices.tsx", "document.addEventListener('visibilitychange', dropHoldWhenHidden)", 'nobody hears the tab being hidden')
  // With the pointer captured, which is how a mouse aims at the desk, the
  // browser takes Escape for itself to let the pointer go: the page hears no
  // key, only that the capture ended. That is the Escape the prompt promises.
  need(
    'engine/Devices.tsx',
    'if (document.pointerLockElement === null) cancelPrimaryHold()',
    'Escape with the mouse captured drops neither the hold nor the question: the browser keeps that key, and the next E signs',
  )
  need(
    'engine/Devices.tsx',
    "document.addEventListener('pointerlockchange', dropHoldWhenReleased)",
    'nobody hears the pointer being let go',
  )
  need(
    'engine/Devices.tsx',
    "document.removeEventListener('pointerlockchange', dropHoldWhenReleased)",
    'the listener for the pointer being let go outlives the scene',
  )
  need(
    'engine/Devices.tsx',
    "if (primaryHold().phase !== 'idle') tickPrimaryHold(delta, interactionHeldIdOf(state, MUSEUM))",
    'no frame counts the hold, or it goes on for something other than the thing a press is held on: the ring closes and nothing fires, or fires with the aim elsewhere',
  )
  need(
    'engine/interactionTarget.ts',
    "if (winner?.kind !== 'device' || !winner.live) return null",
    'a hold goes on for whatever is under the crosshair, or under a modal',
  )

  // --- the touch button --------------------------------------------------------------------
  need(
    'ui/MobileControls.tsx',
    'const held = useMuseum((state) => interactionHeldOf(state, MUSEUM))',
    'the touch button no longer asks whether the press has to be held',
  )
  need(
    'engine/interactionTarget.ts',
    'return device !== undefined && deviceHeld(deviceIntent(device, deviceInputOf(device, state, content))) ? winner.id : null',
    'whether a press has to be held is asked of something other than the intent E acts on',
  )
  need(
    'engine/interactionTarget.ts',
    'return interactionHeldIdOf(state, content) !== null',
    'the touch button and the frame that counts a hold no longer ask one question about what is held',
  )
  need(
    'ui/MobileControls.tsx',
    'onPointerDown={(event) => pointerDown(event, held ? pressPrimaryAction : null)}',
    'the touch button presses as the pointer goes down for everything (a panel opens under the finger and takes the click), or for nothing (a term cannot be signed on glass)',
  )
  // What the buttons remember of a pointer is three rules of `mobileControls.ts`,
  // which `test:mobile-controls` runs event by event; the component keeps
  // what they hand back and decides nothing.
  need(
    'ui/MobileControls.tsx',
    'pointerRef.current = actionPointerDown(press !== null, event.timeStamp)',
    'a pointer going down does not start over: a hold that signed, and took its button away before the finger lifted, makes the next tap on anything its own echo',
  )
  need(
    'engine/mobileControls.ts',
    'return press ? { pressed: true, at } : NO_ACTION_POINTER',
    'a pointer that pressed nothing leaves a time behind: the click of an ordinary tap is taken for its echo, and the button stops acting',
  )
  need(
    'ui/MobileControls.tsx',
    'onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={pointerUp}',
    'a finger lifted from the Action button does not release the hold',
  )
  need(
    'ui/MobileControls.tsx',
    'const up = actionPointerUp(pointerRef.current, event.timeStamp) pointerRef.current = up.pointer if (up.release) releasePrimaryAction()',
    'a finger lifted is no release, or the lifting of one that never pressed is taken for one',
  )
  need(
    'ui/MobileControls.tsx',
    'const click = actionClick(pointerRef.current, event.detail, event.timeStamp) pointerRef.current = click.pointer if (click.press) act()',
    'a click on an action button is judged by something other than the rule, or acts whatever it says: an ordinary action acts twice, or a tap signs',
  )
  need(
    'engine/mobileControls.ts',
    'return { pointer: NO_ACTION_POINTER, press: clickIsThePress(detail, at - pointer.at) }',
    'a click is no longer asked whether a pointer made it',
  )
  // Three buttons, each acting on the click through the rule: Action, «Assinar», «Cancelar».
  const controls = squeezed(read('ui/MobileControls.tsx'))
  const throughTheRule = controls.split('onClick={(event) => clicked(event,').length - 1
  if (throughTheRule !== 3 || /onClick=\{(?!\(event\) => clicked\(event,)/.test(controls)) {
    problems.push(
      `ui/MobileControls.tsx has ${throughTheRule} button(s) whose click goes through \`clicked\`, of the three there are: one of them acts on a click whoever made it`,
    )
  }
  need(
    'ui/MobileControls.tsx',
    "{actionVisible && hold.phase === 'confirming' ? (",
    'a tap on something held leaves the Action button where it was: the question has no answers on glass',
  )
  need('ui/MobileControls.tsx', 'pointerDown(event, cancelPrimaryHold)', '«Cancelar» does not cancel')
  need(
    'ui/MobileControls.tsx',
    "className={hold.phase === 'holding' ? 'mobile-action-button is-holding' : 'mobile-action-button'}",
    'the Action button shows nothing while it is held',
  )
  need(
    'ui/MobileControls.tsx',
    'onContextMenu={(event) => event.preventDefault()}',
    'a long press on the Action button brings up the browser\'s menu, which cancels the pointer half way through a signature',
  )

  // --- what the player sees of it ------------------------------------------------------------
  need(
    'ui/Hud.tsx',
    "const hold = readHoldMark(useSyncExternalStore(subscribePrimaryHold, primaryHoldMark, () => 'idle'))",
    'the prompt of a held press does not follow the gesture',
  )
  need('ui/Hud.tsx', "className={mine ? 'prompt-key is-holding' : 'prompt-key'}", 'the key shows nothing while it is held')
  need('ui/Hud.tsx', "if (mine?.phase === 'confirming') {", 'a tap on a desk shows no question')
  const css = read('styles/museum.css').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ')
  for (const [fragment, without] of [
    ['.prompt-key.is-holding::after, .mobile-action-button.is-holding::after {', 'no ring is drawn round the key or the button while it is held'],
    ['animation: hold-ring var(--hold-seconds, 1.2s) linear forwards;', 'the ring does not close in the time the hold takes'],
    ['.hold-confirm-buttons {', 'the two answers have no place on a touch screen'],
  ] as const) {
    if (!css.includes(fragment)) problems.push(`styles/museum.css no longer has \`${fragment}\`: ${without}`)
  }

  // --- and every other E in the museum is still a tap -----------------------------------------
  for (const path of ['engine/Containers.tsx', 'engine/PowerControls.tsx', 'engine/Interaction.tsx', 'engine/TransitionDoors.tsx']) {
    const code = squeezed(read(path))
    // In whichever of its two shapes: the guard and then the act, or both in one condition.
    if (!/isUnclaimedInteractKey\(event\)(?:\) return if \(| && )interact\(\)\) event\.preventDefault\(\)/.test(code)) {
      problems.push(`${path} no longer acts on E going down, once, and claims the press: an ordinary interaction waits for a hold nobody asked for`)
    }
    if (/\b(?:beginPrimaryHold|releasePrimaryAction|tickPrimaryHold)\b/.test(code)) {
      problems.push(`${path} drives the held press: the gesture has one keyboard path, in engine/Devices.tsx`)
    }
  }
  return problems
}
