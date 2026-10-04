/**
 * Headless proof of the room-power progression contract, and of the controls
 * that restore it: that the player can find them, walk up to them and still
 * be able to press E when the capsule has gone as far as it goes.
 *
 *   npm run test:power
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'

import { BAKED_BUNDLES, BAKED_MATERIALS } from '../src/content/bake.generated.ts'
import { CONTENT_LOT, debtOf, settleKnownDebt } from '../src/content/knownDebt.ts'
import { MUSEUM } from '../src/content/museum.ts'
import { validatePower, type ValidationIssue } from '../src/content/validate.ts'
import { paintLenses } from '../src/engine/deviceNodes.ts'
import { INTERACTION_REACH } from '../src/engine/interactionTarget.ts'
import { PROXY_MATERIAL_PROPS } from '../src/engine/interactionProxy.ts'
import { isRoomPowered, powerControlLensMaterial } from '../src/engine/power.ts'
import { buildPowerControlLightRig } from '../src/engine/powerControlLightRig.ts'
import { useMuseum } from '../src/state/store.ts'
import {
  buildMuseumWorld,
  CAPSULE,
  colliderPartsFor,
  isWallControl,
  powerControlProxy,
  reachFromWhereTheCapsuleStops,
  recipeParts,
} from './lib/museumWorld.ts'
import { powerControlWiringProblems, type SourceReader } from './lib/runtimeWiring.ts'

let checks = 0
let failed = 0
/** Records and goes on: a suite that stops at its first failure hides the rest. */
const check = (message: string, condition: boolean, detail = '') => {
  checks += 1
  if (condition) console.log(`  pass  ${message}`)
  else {
    failed += 1
    console.log(`  FAIL  ${message}${detail ? ` — ${detail}` : ''}`)
  }
}
const errorsOf = (issues: readonly ValidationIssue[]) =>
  issues.filter((issue) => issue.severity === 'error').map((issue) => `${issue.code} ${issue.id ?? ''}`.trim())

console.log('Room power:')

// What the content gate would say of the power controls alone, with the
// dated debts of that rule set applied as the gate applies them.
const POWER_CODES = new Set(['wall-fixture-off-the-wall'])
const powerErrors = errorsOf(
  settleKnownDebt(
    validatePower(MUSEUM),
    debtOf('validate:content').filter((line) => POWER_CODES.has(line.code)),
    CONTENT_LOT,
  ),
)
check('content has no invalid or missing power controls', powerErrors.length === 0, powerErrors.join('; '))

const controlIds = MUSEUM.rooms.flatMap((room) =>
  room.powerControl ? [room.powerControl.id] : [],
)
check('power control ids are unique', new Set(controlIds).size === controlIds.length)

check(
  'an authored powered default is on without save progress',
  isRoomPowered({ id: 'authored-on', startsPowered: true }, []),
)
check(
  'an authored unpowered default stays off without save progress',
  !isRoomPowered({ id: 'authored-off', startsPowered: false }, []),
)
check(
  'saved restoration overrides an unpowered authored default',
  isRoomPowered({ id: 'authored-off', startsPowered: false }, ['authored-off']),
)

const store = useMuseum.getState()
store.resetProgress()
for (const room of MUSEUM.rooms) {
  check(
    `${room.id} initial runtime power matches startsPowered`,
    isRoomPowered(room, useMuseum.getState().progress.roomsPowered) === room.startsPowered,
  )
}

const unpoweredRoom = MUSEUM.rooms.find((room) => !room.startsPowered)
assert.ok(unpoweredRoom, 'the vertical slice needs one initially unpowered room')
useMuseum.getState().powerRoom(unpoweredRoom.id)
useMuseum.getState().powerRoom(unpoweredRoom.id)
check(
  'powerRoom restores once and remains idempotent',
  useMuseum.getState().progress.roomsPowered.filter((id) => id === unpoweredRoom.id).length === 1,
)

useMuseum.getState().applyUnlockEffect({ kind: 'power-room', roomId: 'effect-room' })
useMuseum.getState().applyUnlockEffect({ kind: 'open-lock', lockId: 'effect-lock' })
useMuseum.getState().applyUnlockEffect({
  kind: 'grant-credential',
  credential: { kind: 'tool', id: 'breaker-handle' },
})
useMuseum.getState().applyUnlockEffect({
  kind: 'reveal-document',
  documentId: 'effect-document',
})
const progress = useMuseum.getState().progress
check('power-room unlock effects are applied', progress.roomsPowered.includes('effect-room'))
check('open-lock unlock effects are applied', progress.locksOpened.includes('effect-lock'))
check(
  'grant-credential unlock effects use the lock graph key format',
  progress.credentials.includes('tool:breaker-handle'),
)
check(
  'reveal-document unlock effects enter the archive progress',
  progress.documentsRead.includes('effect-document'),
)

useMuseum.setState({ currentRoom: 'atrium', previousRoom: null })
useMuseum.getState().powerRoom('atrium')
useMuseum.getState().setCurrentRoom('holyoke')
check(
  'changing rooms records the room whose lighting must be retained',
  useMuseum.getState().previousRoom === 'atrium',
)
check(
  'a restored room remains powered after the visitor leaves it',
  useMuseum.getState().progress.roomsPowered.includes('atrium'),
)
useMuseum.getState().setCurrentRoom('atrium')
const atrium = MUSEUM.rooms.find((room) => room.id === 'atrium')
assert.ok(atrium)
check(
  'returning reads the same authored and restored power state',
  isRoomPowered(atrium, useMuseum.getState().progress.roomsPowered),
)

useMuseum.getState().resetProgress()

// ---------------------------------------------------------------------------
// The controls themselves: reach, state and pilots
// ---------------------------------------------------------------------------

const kit = BAKED_BUNDLES.find((bundle) => bundle.name === 'kit')
assert.ok(kit, 'the baked kit bundle exists')
const world = buildMuseumWorld()
const wallControls = MUSEUM.rooms.flatMap((room) =>
  room.powerControl && isWallControl(room, room.powerControl) ? [{ room, control: room.powerControl }] : [],
)
check('the museum has wall-mounted power controls to prove', wallControls.length >= 2, `${wallControls.length} found`)

/**
 * The player walks at the red light until the wall stops them, and presses E.
 * The atrium breaker failed exactly there: the capsule stopped with the eye
 * inside the interaction box, a ray cast from inside a single-sided box hits
 * nothing, and the prompt went out on arrival.
 */
for (const { room, control } of wallControls) {
  const reach = reachFromWhereTheCapsuleStops(world, room, control)
  check(
    `from where the capsule stops in front of ${control.id}, the centre ray hits it within reach`,
    reach.hitDistance !== null && reach.hitDistance <= INTERACTION_REACH.powerControl,
    `capsule ${reach.standOff.toFixed(3)} m from the wall plane, ` +
      (reach.hitDistance === null ? 'no hit' : `hit at ${reach.hitDistance.toFixed(3)} m`),
  )
  // The rule behind it: no target contains the nearest point the capsule
  // can reach. The collider keeps the player out; the material is the net.
  check(
    `where the capsule stops, the eye is outside ${control.id}'s interaction volume`,
    !reach.eyeInsideProxy,
    `capsule ${reach.standOff.toFixed(3)} m from the wall plane`,
  )
}

/**
 * The same rule without a walk, for every direction at once: the collider
 * keeps the capsule's axis a radius away from its faces, so an interaction
 * volume that stays within the collider grown by that radius can never hold
 * the eye, whichever way the player comes at it.
 */
for (const { room, control } of wallControls) {
  const colliders = colliderPartsFor(control.part)
  const { proxy } = powerControlProxy(room, control)
  const escapes = colliders.length === 0 ? ['the recipe has no collider'] : []
  for (const part of colliders) {
    if (!part.collider) continue
    for (const axis of [0, 2]) {
      const over =
        Math.max(
          part.collider.centre[axis] - part.collider.halfExtents[axis] - (proxy.centre[axis] - proxy.size[axis] / 2),
          proxy.centre[axis] + proxy.size[axis] / 2 - (part.collider.centre[axis] + part.collider.halfExtents[axis]),
        ) - CAPSULE.radius
      if (over >= 0) escapes.push(`${(over * 1000).toFixed(0)} mm past the capsule's reach along ${axis === 0 ? 'x' : 'z'}`)
    }
  }
  check(
    `the interaction volume of ${control.id} stays where the capsule's axis cannot go`,
    escapes.length === 0,
    escapes.join('; '),
  )
}

{
  const box = new Mesh(new BoxGeometry(0.42, 0.48, 0.34), new MeshBasicMaterial(PROXY_MATERIAL_PROPS))
  box.updateMatrixWorld(true)
  const inside = new Raycaster(new Vector3(0, 0, 0), new Vector3(0, 0, -1), 0, INTERACTION_REACH.powerControl)
  check(
    'a ray cast from inside an interaction proxy still hits it',
    inside.intersectObject(box, false).length > 0,
    'a single-sided box is invisible from within',
  )
}

/**
 * A breaker shows the state it controls. The lens is a named node the runtime
 * repaints, the lever a named node L10 will throw; both are in the bake or
 * the validator fails the gate (`power-control-without-state`).
 */
for (const part of new Set(wallControls.map(({ control }) => control.part))) {
  const nodes = new Map(recipeParts(part, kit).map((node) => [node.name, node]))
  check(
    `the baked ${part} has an emissive red lens and a lever`,
    nodes.get(`${part}__led`)?.material === 'led-red' && nodes.has(`${part}__lever`),
    [...nodes].map(([name, node]) => `${name}:${node.material}`).join(', '),
  )
}

{
  const materials = BAKED_MATERIALS as Record<string, { emissive?: readonly number[]; emissiveIntensity?: number }>
  const emits = (key: string) =>
    (materials[key]?.emissiveIntensity ?? 0) > 0 && (materials[key]?.emissive ?? []).some((channel) => channel > 0)
  check(
    'the lens is red without power and green with it, and both emit',
    powerControlLensMaterial(false) === 'led-red' &&
      powerControlLensMaterial(true) === 'led-green' &&
      emits('led-red') &&
      emits('led-green'),
  )
}

{
  const iron = new MeshBasicMaterial()
  const brass = new MeshBasicMaterial()
  const red = new MeshBasicMaterial()
  const green = new MeshBasicMaterial()
  const node = (name: string, material: MeshBasicMaterial) => {
    const mesh = new Mesh(new BoxGeometry(), material)
    mesh.name = name
    return mesh
  }
  const assembly = new Group()
  const body = node('breaker-panel', iron)
  const lever = node('breaker-panel__lever', brass)
  const lens = node('breaker-panel__led', red)
  // A recipe named so that a careless prefix match would repaint it too.
  const neighbour = node('breaker-panel-cover__led', red)
  assembly.add(body, lever, lens, neighbour)
  paintLenses(assembly, 'breaker-panel', green)
  check(
    'painting the lenses repaints the lens nodes and nothing else',
    lens.material === green && body.material === iron && lever.material === brass && neighbour.material === red,
  )
}

/**
 * A pilot is a point light: it does not stop at a wall. Two breakers stood
 * back to back across the wall between the atrium and the wing, each one's
 * pilot painting the other room's floor red.
 */
{
  const interiors = MUSEUM.rooms.map((room) => ({
    id: room.id,
    box: new Box3(
      new Vector3(
        room.origin[0] - room.shell.width / 2 + 0.125,
        room.origin[1],
        room.origin[2] - room.shell.depth / 2 + 0.125,
      ),
      new Vector3(
        room.origin[0] + room.shell.width / 2 - 0.125,
        room.origin[1] + room.shell.height,
        room.origin[2] + room.shell.depth / 2 - 0.125,
      ),
    ),
  }))
  const accusations: ValidationIssue[] = []
  const measured: string[] = []
  for (const room of MUSEUM.rooms) {
    if (!room.powerControl) continue
    const pilot = buildPowerControlLightRig(room)[0].unpowered
    for (const other of interiors) {
      if (other.id === room.id) continue
      const distance = other.box.distanceToPoint(new Vector3(...pilot.position))
      if (distance >= pilot.distance) continue
      measured.push(`${room.powerControl.id}: ${distance.toFixed(2)} m from ${other.id}, reach ${pilot.distance} m`)
      accusations.push({
        severity: 'error',
        code: 'pilot-reaches-neighbour',
        id: room.powerControl.id,
        message: `The pilot of "${room.powerControl.id}" is ${distance.toFixed(2)} m from the inside of "${other.id}" and reaches ${pilot.distance} m.`,
      })
    }
  }
  const unsettled = errorsOf(settleKnownDebt(accusations, debtOf('test:power'), CONTENT_LOT))
  check('no pilot reaches into another room, beyond what the debt table dates', unsettled.length === 0, unsettled.join('; '))
  for (const line of measured) console.log(`  note  ${line}`)
}

/**
 * Everything above is proven on modules and on a world this suite builds for
 * itself, colliders included. What the player gets depends on one more thing:
 * that the components still call those modules. A refactor that drops the
 * collider registration or the lens repaint brings the defect back with every
 * check above green, so the calls themselves are pinned
 * (`scripts/lib/runtimeWiring.ts`).
 */
{
  const read: SourceReader = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
  const problems = powerControlWiringProblems(read)
  check(
    'the components call what this suite proves: collider, lens by state, double-sided proxy',
    problems.length === 0,
    problems.join('; '),
  )

  // The check has to bite. Each of these is a refactor it exists to catch,
  // applied to the real source in memory.
  const changed =
    (path: string, from: string | RegExp, to: string): SourceReader =>
    (asked) =>
      asked === path ? read(asked).replace(from, to) : read(asked)
  const refactors: readonly (readonly [string, SourceReader])[] = [
    [
      'the collider registration removed',
      changed('engine/PowerControls.tsx', 'registerKitColliders(kit, control.part, kitBundle, collision,', 'registerNothing('),
    ],
    [
      'the collision world no longer passed down',
      changed('scenes/MuseumScene.tsx', /(<PowerControlLayer[\s\S]*?)collision=\{collision\}/, '$1'),
    ],
    [
      'the lens no longer repainted',
      changed('engine/PowerControls.tsx', 'paintLenses(instance, control.part, material)', 'void material'),
    ],
    [
      'a proxy back on a single-sided material',
      changed('engine/Devices.tsx', '<meshBasicMaterial {...PROXY_MATERIAL_PROPS} />', '<meshBasicMaterial />'),
    ],
  ]
  const uncaught = refactors.filter(([, reader]) => powerControlWiringProblems(reader).length === 0).map(([name]) => name)
  check('and that check fails when a component stops calling them', uncaught.length === 0, `not caught: ${uncaught.join(', ')}`)
}

console.log(`${checks - failed}/${checks} checks passed`)
if (failed > 0) process.exitCode = 1
