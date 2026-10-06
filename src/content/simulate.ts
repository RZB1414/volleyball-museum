/**
 * The exhaustive player: proof that the museum can be played to its end.
 *
 * The check this replaces walked the lock graph with rules of its own. It
 * treated the one-way shortcut as an ordinary door, took every piece for
 * cataloguable, opened a ritual by arriving in its room and never asked where
 * a code is learnt unless the lock stood on a doorway. It proved a museum,
 * but not the one the runtime plays: of three pieces it counted, two cannot
 * be catalogued by anybody and the third only inside a cone of 1.5°.
 *
 * Here the player is moved by the game's own functions and nothing else: the
 * door rule with the save's released doors (`transitionDoorTopology.ts`), the
 * lock rule (`lockRules.ts`), the verbs (`progressGrants.ts`), the ruler of
 * the examine view (`examineReach.ts`), the conditions and the triggers. From
 * every room she can stand in she takes every action the rules allow, pass
 * after pass, until a pass adds nothing. What is outside that fixed point
 * cannot be reached by any order of play, because the save only grows.
 *
 * One thing she leaves alone on purpose: a detail whose cone is open and
 * narrower than a hand finds (`examineReach`: it shows, and is not
 * reachable). The view would record it, so a save may hold it; a play that
 * needed it would be a play for somebody who already knew where to look.
 *
 * Two readers besides the gate. The playthrough robot asks `availableActions`
 * what the real store may be made to do, and is held to this player's final
 * state (`npm run test:playthrough`). The graph snapshot (`additive.ts`)
 * writes down every action she met, with what it asked and gave, so that the
 * next lot can be shown to have taken nothing away.
 *
 * Gate-only, like `validate.ts`: nothing the game ships imports it
 * (`test:facts` checks).
 */

import {
  deskRadioIntent,
  deviceInputOf,
  deviceIntent,
  deviceLive,
  deviceSetFlag,
  radioDevices,
  radioHintIndex,
  radioIsLive,
  voiceUtterance,
  type VoiceDevice,
} from '../engine/deviceRules.ts'
import { EXAMINE_MIN_CONE_DEGREES, examineReach } from '../engine/examineReach.ts'
import { attemptLock, lockCredentialKeys } from '../engine/lockRules.ts'
import { isContainerTaken } from '../engine/notebook.ts'
import { isRoomPowered } from '../engine/power.ts'
import { conditionClass, credentialKey, progressConditionMet } from '../engine/progressCondition.ts'
import { clockGrant, containerGrant, doorGrant, hotspotGrant, recordingGrant } from '../engine/progressGrants.ts'
import { dueSequence } from '../engine/sequenceRules.ts'
import { termGrant, type SigningDesk } from '../engine/termRules.ts'
import {
  buildTransitionDoorSpecs,
  transitionDoorBlock,
  transitionDoorEndpointMap,
  type TransitionDoorSpec,
} from '../engine/transitionDoorTopology.ts'
import { compileTriggers, effectGrant, settleTriggers } from '../engine/triggers.ts'
import {
  emptyProgress,
  grantProgress,
  type ListField,
  type Progress,
  type ProgressGrant,
} from '../state/progressFields.ts'
import { PRE_POSSE_SAVE } from './legacySave.ts'
import type {
  ContainerData,
  DeviceData,
  ExhibitData,
  Lock,
  MuseumContent,
  ProgressCondition,
  RoomData,
  Trigger,
} from './schema'
import type { ValidationIssue } from './validate.ts'

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

/**
 * How each list of the save is spelt as an atom of the plan's graph (§2.4):
 * `power:office`, `doc:doc-welcome`, `cat:ball-spalding`. Null for a list no
 * verb of this player writes.
 *
 * Typed by the save's own lists, so a lot that adds one has to say here how
 * it is spelt, or that it is not played, before the build goes on. In the
 * order a level of the script is read in: where she got to, what came on,
 * what opened, what she read and learnt, what she catalogued.
 */
export const ATOM_PREFIX = {
  roomsVisited: 'room',
  roomsPowered: 'power',
  doorsReleased: 'door',
  locksOpened: 'lock',
  locksSeen: 'seen',
  documentsRead: 'doc',
  factsKnown: 'fact',
  catalogued: 'cat',
  hotspots: 'detail',
  credentials: 'cred',
  flags: 'flag',
  triggersFired: 'fired',
  devicesCarried: 'carried',
  termsSigned: 'term',
  // What the porter said and which lessons the HUD gave are told to the
  // player, not done by her: no rule of progress reads either.
  radioCalls: null,
  hintsShown: null,
  // Nor is what the game showed her by itself: a sequence is watched, and
  // nothing waits on its having been.
  sequencesSeen: null,
} as const satisfies Record<ListField, string | null>

const ATOM_FIELDS = (Object.entries(ATOM_PREFIX) as [ListField, string | null][]).flatMap(([field, prefix]) =>
  prefix === null ? [] : [[field, prefix] as const],
)

/** Everything a save holds that the graph speaks of, as atoms. */
export function atomsOf(progress: Readonly<Partial<Record<ListField, readonly string[]>>>): string[] {
  return ATOM_FIELDS.flatMap(([field, prefix]) => {
    const list = progress[field]
    // A later build's save may hold something that is not a list here.
    return Array.isArray(list) ? list.map((id: string) => `${prefix}:${id}`) : []
  })
}

const sortedUnique = (items: readonly string[]) => [...new Set(items)].sort()

// ---------------------------------------------------------------------------
// The actions of a player
// ---------------------------------------------------------------------------

/** One press of E, or one walk through a doorway, with what it is aimed at. */
export type PlayerAction =
  | { readonly kind: 'power'; readonly roomId: string }
  | { readonly kind: 'door'; readonly doorId: string; readonly from: string; readonly to: string }
  | { readonly kind: 'hotspot'; readonly exhibitId: string; readonly hotspotId: string }
  | { readonly kind: 'container'; readonly containerId: string }
  | { readonly kind: 'code'; readonly lockId: string; readonly entry: string }
  | { readonly kind: 'take'; readonly deviceId: string }
  /** A stopped clock put right: E on it, with its mains on. */
  | { readonly kind: 'set-clock'; readonly deviceId: string }
  /** A thing that speaks, worked and heard to its last line: a dead line, a recording. */
  | { readonly kind: 'voice'; readonly deviceId: string }
  /** A term signed at its desk: E held on it for the desk's whole time. */
  | { readonly kind: 'sign'; readonly deviceId: string; readonly termId: string }

/** What an action asks of the save and gives to it, as atoms. */
export type ActionRecord = {
  readonly id: string
  readonly requires: readonly string[]
  readonly grants: readonly string[]
}

type LockHost = {
  readonly lockId: string
  readonly roomId: string
  /** The container or the power control that carries the lock. */
  readonly hostId: string
}

/** What the rules read of a content, looked up once. */
type Topology = {
  readonly rooms: ReadonlyMap<string, RoomData>
  readonly exhibits: ReadonlyMap<string, ExhibitData>
  readonly locks: ReadonlyMap<string, Lock>
  readonly doors: readonly TransitionDoorSpec[]
  /** `room:portal` to the door that stands in that opening, from either side. */
  readonly doorAt: ReadonlyMap<string, TransitionDoorSpec>
  /** Why the doors could not be built, when they could not. */
  readonly doorProblem: string | null
  readonly hosts: readonly LockHost[]
  readonly triggers: readonly Trigger[]
}

const TOPOLOGIES = new WeakMap<MuseumContent, Topology>()

function topologyOf(content: MuseumContent): Topology {
  const cached = TOPOLOGIES.get(content)
  if (cached) return cached

  let doors: TransitionDoorSpec[] = []
  let doorProblem: string | null = null
  try {
    doors = buildTransitionDoorSpecs(content.rooms)
  } catch (error) {
    // The runtime builds the same list as it starts, and would stop there.
    doorProblem = error instanceof Error ? error.message : String(error)
  }
  const endpoints = transitionDoorEndpointMap(doors)
  const doorsById = new Map(doors.map((door) => [door.id, door]))
  const doorAt = new Map<string, TransitionDoorSpec>()
  for (const [endpoint, doorId] of endpoints) {
    const door = doorsById.get(doorId)
    if (door) doorAt.set(endpoint, door)
  }

  const topology: Topology = {
    rooms: new Map(content.rooms.map((room) => [room.id as string, room])),
    exhibits: new Map(content.exhibits.map((exhibit) => [exhibit.id, exhibit])),
    locks: new Map(content.locks.map((lock) => [lock.id, lock])),
    doors,
    doorAt,
    doorProblem,
    hosts: content.rooms.flatMap((room): LockHost[] => [
      ...(room.powerControl && room.powerLockId
        ? [{ lockId: room.powerLockId, roomId: room.id, hostId: room.powerControl.id }]
        : []),
      ...(room.containers ?? []).flatMap((container) =>
        container.lockId ? [{ lockId: container.lockId, roomId: room.id, hostId: container.id }] : [],
      ),
    ]),
    triggers: compileTriggers(content),
  }
  TOPOLOGIES.set(content, topology)
  return topology
}

const poweredIn = (topology: Topology, progress: Pick<Progress, 'roomsPowered'>) => (roomId: string) => {
  const room = topology.rooms.get(roomId)
  return room ? isRoomPowered(room, progress.roomsPowered) : false
}

function merged(...grants: readonly ProgressGrant[]): ProgressGrant {
  const sum: { [K in ListField]?: string[] } = {}
  for (const grant of grants) {
    for (const [field, ids] of Object.entries(grant) as [ListField, readonly string[]][]) {
      sum[field] = [...(sum[field] ?? []), ...ids]
    }
  }
  return sum
}

/**
 * What a press on something that carries a lock writes: the lock's answer,
 * and what is behind it once the lock is, or has just become, open.
 *
 * The same three lines stand in `Containers.tsx` and `PowerControls.tsx`: a
 * touch is always recorded, and only an open lock lets the press through.
 */
function hostPress(
  topology: Topology,
  content: MuseumContent,
  progress: Progress,
  lockId: string | undefined,
  behind: ProgressGrant,
): ProgressGrant {
  if (!lockId) return behind
  const lock = topology.locks.get(lockId)
  // A lock the content does not have: the component refuses and writes nothing.
  if (!lock) return {}
  const attempt = attemptLock(lock, content.facts, progress, { kind: 'touch' })
  if (attempt.outcome === 'open') return behind
  return attempt.outcome === 'opened' ? merged(attempt.grant, behind) : attempt.grant
}

/** Whether a press on the carrier of this lock gets through to what is behind it. */
function hostOpens(topology: Topology, content: MuseumContent, progress: Progress, lockId: string | undefined) {
  if (!lockId) return true
  const lock = topology.locks.get(lockId)
  if (!lock) return false
  const outcome = attemptLock(lock, content.facts, progress, { kind: 'touch' }).outcome
  return outcome === 'open' || outcome === 'opened'
}

/** The container the keypad opens when its lock gives: the first that carries it, as `LockPanel.tsx` finds it. */
function containerBehind(content: MuseumContent, lockId: string): ContainerData | undefined {
  return content.rooms.flatMap((room) => room.containers ?? []).find((container) => container.lockId === lockId)
}

/**
 * What a player standing in `room` with this save can do that the rules
 * answer.
 *
 * A press on a shut drawer is in the list: the rules answer it (the keypad
 * comes up, or the lock buzzes) and record that the lock was touched. A press
 * the rules ignore is not: a door barred from this side, a switch whose room
 * already has power, a detail already seen, a detail no hand can turn to the
 * camera, a notebook that has left its desk, a radio without charge, a clock
 * with no mains or already put right, a machine with no mains, a desk with
 * no term on it or with one that still waits for something. A thing that
 * speaks is in the list whenever it would answer, whether or not what it
 * says leaves anything in the save: a dead line is answered, and gives
 * nothing.
 *
 * A code is in the list only for a player who has had the keypad in front of
 * her and knows the fact it asks for. The keypad itself compares digits and
 * would take the year from anybody; an honest proof does not guess.
 */
export function availableActions(content: MuseumContent, progress: Progress, room: string): readonly PlayerAction[] {
  const topology = topologyOf(content)
  const here = topology.rooms.get(room)
  if (!here) return []
  const actions: PlayerAction[] = []

  if (here.powerControl && !isRoomPowered(here, progress.roomsPowered)) {
    actions.push({ kind: 'power', roomId: here.id })
  }

  const powered = poweredIn(topology, progress)
  for (const portal of here.portals) {
    const door = topology.doorAt.get(`${here.id}:${portal.id}`)
    if (door && transitionDoorBlock(door, here.id, powered, progress.doorsReleased) !== null) continue
    // An opening with no leaf in it is walked through.
    actions.push({ kind: 'door', doorId: door?.id ?? portal.id, from: here.id, to: portal.toRoom })
  }

  for (const exhibitId of here.exhibitIds) {
    const exhibit = topology.exhibits.get(exhibitId)
    for (const hotspot of exhibit?.hotspots ?? []) {
      // The view skips a detail the save already holds, and a hand cannot
      // show one whose cone is narrower than the ruler allows.
      if (progress.hotspots.includes(`${exhibitId}:${hotspot.id}`)) continue
      if (!exhibit || !examineReach(exhibit, hotspot).reachable) continue
      actions.push({ kind: 'hotspot', exhibitId, hotspotId: hotspot.id })
    }
  }

  for (const container of here.containers ?? []) {
    // A notebook that was read left the desk with the player.
    if (isContainerTaken(content, container, progress.documentsRead)) continue
    actions.push({ kind: 'container', containerId: container.id })
  }

  for (const lockId of new Set(topology.hosts.filter((host) => host.roomId === here.id).map((host) => host.lockId))) {
    const lock = topology.locks.get(lockId)
    // `ask` is the rule saying this lock is shut and has a panel to type at.
    if (!lock || attemptLock(lock, content.facts, progress, { kind: 'touch' }).outcome !== 'ask') continue
    const fact = lock.kind === 'knowledge' ? content.facts.find((candidate) => candidate.id === lock.factId) : undefined
    if (!fact || !progress.locksSeen.includes(lock.id) || !progress.factsKnown.includes(fact.id)) continue
    actions.push({ kind: 'code', lockId: lock.id, entry: fact.value })
  }

  for (const device of here.devices ?? []) {
    if (device.kind === 'clock') {
      // Asked of the device's own rule, as the prompt and the key ask it.
      const intent = deviceIntent(device, deviceInputOf(device, { progress, radio: null }, content))
      if (intent.kind === 'clock' && intent.intent === 'set') actions.push({ kind: 'set-clock', deviceId: device.id })
      continue
    }
    if (device.kind === 'voice') {
      // The same question, with nothing on air: it plays, or plays again.
      if (deviceLive(deviceIntent(device, deviceInputOf(device, { progress, radio: null }, content)))) {
        actions.push({ kind: 'voice', deviceId: device.id })
      }
      continue
    }
    if (device.kind === 'signing-desk') {
      // The term the desk offers, when a held press would sign it. A desk
      // that buzzes is answered too, and writes nothing: it is not a move.
      const term = readyTerm(content, device, progress)
      if (term) actions.push({ kind: 'sign', deviceId: device.id, termId: term.id })
      continue
    }
    if (device.kind !== 'radio') continue
    const intent = deskRadioIntent(device, {
      live: radioIsLive(content, device.id, progress.roomsPowered),
      carried: progress.devicesCarried.includes(device.id),
      speaking: false,
    })
    if (intent === 'take') actions.push({ kind: 'take', deviceId: device.id })
  }

  return actions
}

/** The clock an action is aimed at, wherever it hangs. */
function clockOf(content: MuseumContent, deviceId: string) {
  for (const room of content.rooms) {
    for (const device of room.devices ?? []) {
      if (device.id === deviceId && device.kind === 'clock') return device
    }
  }
  return undefined
}

/** The voice an action is aimed at, wherever it stands. */
function voiceOf(content: MuseumContent, deviceId: string): VoiceDevice | undefined {
  for (const room of content.rooms) {
    for (const device of room.devices ?? []) {
      if (device.id === deviceId && device.kind === 'voice') return device
    }
  }
  return undefined
}

/** The desk an action is aimed at, wherever it stands. */
function deskOf(content: MuseumContent, deviceId: string): SigningDesk | undefined {
  for (const room of content.rooms) {
    for (const device of room.devices ?? []) {
      if (device.id === deviceId && device.kind === 'signing-desk') return device
    }
  }
  return undefined
}

/**
 * The term a held press on this desk would sign in this save, by the desk's
 * own rule (the one its prompt is worded by), or null. With nothing on
 * screen: this player watches what she is owed as it comes (`play`).
 */
function readyTerm(content: MuseumContent, desk: SigningDesk, progress: Progress) {
  const intent = deviceIntent(desk, deviceInputOf(desk, { progress, radio: null, sequence: null }, content))
  return intent.kind === 'desk' && intent.state.state === 'ready' ? intent.state.term : null
}

/** The recording a voice would play to this save, if what it would say is one. */
function recordingOf(content: MuseumContent, device: VoiceDevice, progress: Progress): string | undefined {
  return voiceUtterance(device, progress, content)?.documentId
}

/** The action, as the grant the runtime's own verbs give it in this save. */
export function actionGrant(content: MuseumContent, progress: Progress, action: PlayerAction): ProgressGrant {
  const topology = topologyOf(content)
  switch (action.kind) {
    case 'power': {
      const room = topology.rooms.get(action.roomId)
      return room ? hostPress(topology, content, progress, room.powerLockId, { roomsPowered: [room.id] }) : {}
    }
    case 'door': {
      const door = topology.doors.find((candidate) => candidate.id === action.doorId)
      const release = door ? doorGrant(door, action.from, progress.doorsReleased) : null
      return merged(release ?? {}, { roomsVisited: [action.to] })
    }
    case 'hotspot': {
      const exhibit = topology.exhibits.get(action.exhibitId)
      return exhibit ? hotspotGrant(exhibit, action.hotspotId, progress.hotspots) : {}
    }
    case 'container': {
      const container = content.rooms
        .flatMap((room) => room.containers ?? [])
        .find((candidate) => candidate.id === action.containerId)
      return container
        ? hostPress(topology, content, progress, container.lockId, containerGrant(content, container.id))
        : {}
    }
    case 'code': {
      const lock = topology.locks.get(action.lockId)
      if (!lock) return {}
      const attempt = attemptLock(lock, content.facts, progress, { kind: 'code', entry: action.entry })
      if (attempt.outcome === 'open') return {}
      if (attempt.outcome !== 'opened') return attempt.grant
      // The keypad shows what was inside at once (`LockPanel.tsx`).
      const container = containerBehind(content, lock.id)
      return container ? merged(attempt.grant, containerGrant(content, container.id)) : attempt.grant
    }
    case 'take':
      return { devicesCarried: [action.deviceId] }
    case 'set-clock': {
      const clock = clockOf(content, action.deviceId)
      return clock ? clockGrant(clock) : {}
    }
    case 'voice': {
      // Heard to its last line, which is what files a recording; a line of
      // the device's own leaves nothing.
      const voice = voiceOf(content, action.deviceId)
      const recording = voice ? recordingOf(content, voice, progress) : undefined
      return recording === undefined ? {} : recordingGrant(content, recording)
    }
    case 'sign': {
      // The signature, and only of the term the desk offers now: the flag it
      // sets is the trigger's to give.
      const desk = deskOf(content, action.deviceId)
      const term = desk ? readyTerm(content, desk, progress) : null
      return term && term.id === action.termId ? termGrant(term) : {}
    }
  }
}

// ---------------------------------------------------------------------------
// The same actions, written down
// ---------------------------------------------------------------------------

const atom = (field: Exclude<keyof typeof ATOM_PREFIX, 'radioCalls' | 'hintsShown' | 'sequencesSeen'>, id: string) =>
  `${ATOM_PREFIX[field]}:${id}`

const grantAtoms = (grant: ProgressGrant) => atomsOf(grant)

/** A room's power as a requirement: none for a room that never lost it. */
function powerRequired(topology: Topology, roomId: string): string[] {
  return topology.rooms.get(roomId)?.startsPowered ? [] : [atom('roomsPowered', roomId)]
}

/**
 * What each field of a condition asks, as atoms.
 *
 * A field for every field of the schema, by type: a condition a later lot
 * adds cannot be left out of the snapshot without the build saying so.
 * "All rooms" and "all catalogued" are written as the ids they mean in this
 * content (the plan's DL2-17): a lot that adds a room changes what they ask,
 * and that has to show. A negative asks for an absence, and a choice between
 * branches is one atom that spells the branches out.
 */
const CONDITION_ATOMS: {
  readonly [K in keyof Required<ProgressCondition>]: (
    asked: NonNullable<ProgressCondition[K]>,
    content: MuseumContent,
  ) => readonly string[]
} = {
  powered: (rooms, content) => rooms.flatMap((id) => powerRequired(topologyOf(content), id)),
  unpowered: (rooms) => rooms.map((id) => `not(${atom('roomsPowered', id)})`),
  locksOpened: (locks) => locks.map((id) => atom('locksOpened', id)),
  locksClosed: (locks) => locks.map((id) => `not(${atom('locksOpened', id)})`),
  locksSeen: (locks) => locks.map((id) => atom('locksSeen', id)),
  documentsRead: (documents) => documents.map((id) => atom('documentsRead', id)),
  documentsUnread: (documents) => documents.map((id) => `not(${atom('documentsRead', id)})`),
  carried: (devices) => devices.map((id) => atom('devicesCarried', id)),
  allRoomsPowered: (asked, content) =>
    asked ? content.rooms.flatMap((room) => powerRequired(topologyOf(content), room.id)) : [],
  allCatalogued: (asked, content) => (asked ? content.exhibits.map((exhibit) => atom('catalogued', exhibit.id)) : []),
  catalogued: (exhibits) => exhibits.map((id) => atom('catalogued', id)),
  hotspotsSeen: (details) => details.map((key) => atom('hotspots', key)),
  credentials: (credentials) => credentials.map((credential) => atom('credentials', credentialKey(credential))),
  flags: (flags) => flags.map((id) => atom('flags', id)),
  flagsUnset: (flags) => flags.map((id) => `not(${atom('flags', id)})`),
  roomsVisited: (rooms) => rooms.map((id) => atom('roomsVisited', id)),
  roomsUnvisited: (rooms) => rooms.map((id) => `not(${atom('roomsVisited', id)})`),
  doorsReleased: (doors) => doors.map((id) => atom('doorsReleased', id)),
  termsSigned: (terms) => terms.map((id) => atom('termsSigned', id)),
  anyOf: (branches, content) => [
    `any(${branches
      .map((branch) => conditionAtoms(branch, content).join('+'))
      .sort()
      .join('|')})`,
  ],
}

/** A condition as the atoms it asks for, sorted. */
export function conditionAtoms(condition: ProgressCondition, content: MuseumContent): string[] {
  const atoms: string[] = []
  for (const field of Object.keys(CONDITION_ATOMS) as (keyof ProgressCondition)[]) {
    const asked = condition[field]
    if (asked === undefined) continue
    const spell = CONDITION_ATOMS[field] as (asked: unknown, content: MuseumContent) => readonly string[]
    atoms.push(...spell(asked, content))
  }
  return sortedUnique(atoms)
}

/**
 * What the carrier of a lock asks of whoever presses it, and what the press
 * gives besides what is behind.
 *
 * Asked of the lock rule itself: a lock a touch opens for whoever holds what
 * it asks for is opened by the press, so the press asks for the credentials.
 * Every other lock has to be open already, by its keypad or by a trigger.
 */
function lockGuard(topology: Topology, content: MuseumContent, lockId: string | undefined) {
  if (!lockId) return { requires: [] as string[], grants: [] as string[] }
  const lock = topology.locks.get(lockId)
  const keys = lock ? lockCredentialKeys(lock) : []
  const opensByTouch =
    lock !== undefined &&
    keys.length > 0 &&
    attemptLock(lock, content.facts, { locksOpened: [], credentials: [...keys] }, { kind: 'touch' }).outcome === 'opened'
  return opensByTouch
    ? {
        requires: keys.map((key) => atom('credentials', key)),
        grants: [atom('locksSeen', lockId), atom('locksOpened', lockId)],
      }
    : { requires: [atom('locksOpened', lockId)], grants: [] as string[] }
}

const record = (id: string, requires: readonly string[], grants: readonly string[]): ActionRecord => ({
  id,
  requires: sortedUnique(requires),
  grants: sortedUnique(grants),
})

const doorRecordId = (doorId: string, from: string, to: string) => `door:${doorId}:${from}>${to}`

function powerRecord(topology: Topology, content: MuseumContent, room: RoomData): ActionRecord {
  const guard = lockGuard(topology, content, room.powerLockId)
  return record(
    `power:${room.id}`,
    [atom('roomsVisited', room.id), ...guard.requires],
    [atom('roomsPowered', room.id), ...guard.grants],
  )
}

function containerRecord(topology: Topology, content: MuseumContent, room: RoomData, container: ContainerData) {
  const guard = lockGuard(topology, content, container.lockId)
  return record(
    `container:${container.id}`,
    [atom('roomsVisited', room.id), ...guard.requires],
    [...grantAtoms(containerGrant(content, container.id)), ...guard.grants],
  )
}

/** A press on the carrier of a shut lock: all it gives is that the lock was touched. */
const touchRecord = (host: LockHost) =>
  record(`touch:${host.hostId}`, [atom('roomsVisited', host.roomId)], [atom('locksSeen', host.lockId)])

function codeRecord(content: MuseumContent, host: LockHost, factId: string): ActionRecord {
  const container = containerBehind(content, host.lockId)
  return record(
    `code:${host.lockId}`,
    [atom('roomsVisited', host.roomId), atom('locksSeen', host.lockId), atom('factsKnown', factId)],
    [atom('locksOpened', host.lockId), ...(container ? grantAtoms(containerGrant(content, container.id)) : [])],
  )
}

function doorRecord(topology: Topology, room: RoomData, portal: RoomData['portals'][number]): ActionRecord {
  const door = topology.doorAt.get(`${room.id}:${portal.id}`)
  const id = doorRecordId(door?.id ?? portal.id, room.id, portal.toRoom)
  const here = atom('roomsVisited', room.id)
  const there = atom('roomsVisited', portal.toRoom)
  if (!door) return record(id, [here], [there])
  const ownSide = door.opensFrom === room.id
  const barred = door.opensFrom !== null && !ownSide
  return record(
    id,
    [
      here,
      ...(door.requiresPower ? powerRequired(topology, door.requiresPower) : []),
      // From the side the bar is on, it has to have been lifted already.
      ...(barred ? [atom('doorsReleased', door.id)] : []),
    ],
    [there, ...(ownSide ? [atom('doorsReleased', door.id)] : [])],
  )
}

function hotspotRecord(room: RoomData, exhibit: ExhibitData, hotspot: ExhibitData['hotspots'][number]): ActionRecord {
  return record(
    `hotspot:${exhibit.id}:${hotspot.id}`,
    [atom('roomsVisited', room.id)],
    [
      atom('hotspots', `${exhibit.id}:${hotspot.id}`),
      ...(hotspot.revealsFactId ? [atom('factsKnown', hotspot.revealsFactId)] : []),
    ],
  )
}

/**
 * The catalogue entry, as what follows from the details: every required one,
 * or any one at all for a piece that requires none (`hotspotGrant`).
 *
 * Written apart from the details because which detail completes a piece
 * depends on the order they were found in, and a record must not.
 */
function catalogueRecord(exhibit: ExhibitData): ActionRecord | null {
  const detail = (id: string) => atom('hotspots', `${exhibit.id}:${id}`)
  const required = exhibit.hotspots.filter((hotspot) => hotspot.requiredForCatalogue)
  const every = exhibit.hotspots.map((hotspot) => detail(hotspot.id))
  if (every.length === 0) return null
  const requires =
    required.length > 0
      ? required.map((hotspot) => detail(hotspot.id))
      : every.length === 1
        ? every
        : [`any(${[...every].sort().join('|')})`]
  return record(`catalogue:${exhibit.id}`, requires, [atom('catalogued', exhibit.id)])
}

/** A radio taken off its charger, which has to have power for the handset to answer. */
function takeRecord(topology: Topology, room: RoomData, device: Extract<DeviceData, { readonly kind: 'radio' }>) {
  return record(
    `take:${device.id}`,
    [atom('roomsVisited', room.id), ...powerRequired(topology, device.poweredBy)],
    [atom('devicesCarried', device.id)],
  )
}

/** A clock put right, which its mains have to be on for; what it gives is the flag it sets. */
function setClockRecord(topology: Topology, room: RoomData, device: Extract<DeviceData, { readonly kind: 'clock' }>) {
  return record(
    `set-clock:${device.id}`,
    [atom('roomsVisited', room.id), ...powerRequired(topology, device.runsWithPowerOf)],
    grantAtoms(clockGrant(device)),
  )
}

/**
 * A recording heard out: its device's mains, whatever its utterance waits
 * for, and the document it files. One record to a recording, named by it, so
 * that a device given a second tape keeps the record of the first.
 *
 * An utterance that is a line of the device's own has no record: it gives
 * nothing, so nothing is taken from anybody by its going.
 */
function voiceRecord(
  topology: Topology,
  content: MuseumContent,
  room: RoomData,
  device: VoiceDevice,
  utterance: VoiceDevice['utterances'][number] & { readonly documentId: string },
) {
  return record(
    `voice:${device.id}:${utterance.documentId}`,
    [
      atom('roomsVisited', room.id),
      ...(device.poweredBy ? powerRequired(topology, device.poweredBy) : []),
      ...conditionAtoms(utterance.when, content),
    ],
    grantAtoms(recordingGrant(content, utterance.documentId)),
  )
}

/**
 * A term signed at a desk: the room the desk stands in, what the term asks,
 * and the signature it leaves. One record to each term of each desk.
 *
 * What brings the term to the desk (`presentedWhen`) is not written: the
 * gate holds it to asking nothing the signature does not (`term-presented-
 * late`), so it is in what the term asks already.
 */
function signRecord(content: MuseumContent, room: RoomData, desk: SigningDesk, term: NonNullable<MuseumContent['terms']>[number]) {
  return record(
    `sign:${desk.id}:${term.id}`,
    [atom('roomsVisited', room.id), ...conditionAtoms(term.when, content)],
    grantAtoms(termGrant(term)),
  )
}

function triggerRecord(content: MuseumContent, trigger: Trigger): ActionRecord {
  return record(`trigger:${trigger.id}`, conditionAtoms(trigger.when, content), [
    atom('triggersFired', trigger.id),
    ...trigger.effects.flatMap((effect) => grantAtoms(effectGrant(effect, content))),
  ])
}

/**
 * Every action the content offers, with what it asks and gives, whether or
 * not this player ever gets to it: the table the next lot's content is
 * compared against (`additive.ts`).
 *
 * A detail no hand can turn to the camera is not offered, so it is not here.
 * A consequence (a catalogue entry, a trigger) is here beside the presses,
 * because taking one away takes something from the player just the same.
 */
export function contentActions(content: MuseumContent): readonly ActionRecord[] {
  const topology = topologyOf(content)
  const records: ActionRecord[] = []
  for (const room of content.rooms) {
    if (room.powerControl) records.push(powerRecord(topology, content, room))
    for (const portal of room.portals) records.push(doorRecord(topology, room, portal))
    for (const exhibitId of room.exhibitIds) {
      const exhibit = topology.exhibits.get(exhibitId)
      for (const hotspot of exhibit?.hotspots ?? []) {
        if (exhibit && examineReach(exhibit, hotspot).reachable) records.push(hotspotRecord(room, exhibit, hotspot))
      }
    }
    for (const container of room.containers ?? []) records.push(containerRecord(topology, content, room, container))
    for (const device of room.devices ?? []) {
      if (device.kind === 'radio' && device.carriedOnUse) records.push(takeRecord(topology, room, device))
      if (device.kind === 'clock' && device.setFlag !== undefined) records.push(setClockRecord(topology, room, device))
      if (device.kind === 'voice') {
        for (const utterance of device.utterances) {
          if (utterance.documentId !== undefined) records.push(voiceRecord(topology, content, room, device, utterance))
        }
      }
      if (device.kind === 'signing-desk') {
        for (const term of content.terms ?? []) {
          if (device.termIds.includes(term.id)) records.push(signRecord(content, room, device, term))
        }
      }
    }
  }
  for (const host of topology.hosts) {
    records.push(touchRecord(host))
    const lock = topology.locks.get(host.lockId)
    if (lock?.kind === 'knowledge') records.push(codeRecord(content, host, lock.factId))
  }
  for (const exhibit of content.exhibits) {
    const catalogue = catalogueRecord(exhibit)
    if (catalogue) records.push(catalogue)
  }
  for (const trigger of topology.triggers) records.push(triggerRecord(content, trigger))
  return records
}

/**
 * The record a press realises, made in `room` with this save. The carrier of
 * a shut lock answers with the lock, so its press is the touch and not what
 * is behind. Null for a press aimed at nothing the room has.
 */
export function actionRecord(
  content: MuseumContent,
  progress: Progress,
  roomId: string,
  action: PlayerAction,
): ActionRecord | null {
  const topology = topologyOf(content)
  const room = topology.rooms.get(roomId)
  if (!room) return null
  switch (action.kind) {
    case 'power': {
      const host = topology.hosts.find((candidate) => candidate.hostId === room.powerControl?.id)
      return host && !hostOpens(topology, content, progress, room.powerLockId)
        ? touchRecord(host)
        : powerRecord(topology, content, room)
    }
    case 'door': {
      const portal = room.portals.find(
        (candidate) =>
          candidate.toRoom === action.to &&
          (topology.doorAt.get(`${room.id}:${candidate.id}`)?.id ?? candidate.id) === action.doorId,
      )
      return portal ? doorRecord(topology, room, portal) : null
    }
    case 'hotspot': {
      const exhibit = topology.exhibits.get(action.exhibitId)
      const hotspot = exhibit?.hotspots.find((candidate) => candidate.id === action.hotspotId)
      return exhibit && hotspot ? hotspotRecord(room, exhibit, hotspot) : null
    }
    case 'container': {
      const container = (room.containers ?? []).find((candidate) => candidate.id === action.containerId)
      if (!container) return null
      const host = topology.hosts.find((candidate) => candidate.hostId === container.id)
      return host && !hostOpens(topology, content, progress, container.lockId)
        ? touchRecord(host)
        : containerRecord(topology, content, room, container)
    }
    case 'code': {
      const host = topology.hosts.find((candidate) => candidate.lockId === action.lockId && candidate.roomId === room.id)
      const lock = topology.locks.get(action.lockId)
      return host && lock?.kind === 'knowledge' ? codeRecord(content, host, lock.factId) : null
    }
    case 'take': {
      const device = (room.devices ?? []).find((candidate) => candidate.id === action.deviceId)
      return device?.kind === 'radio' ? takeRecord(topology, room, device) : null
    }
    case 'set-clock': {
      const device = (room.devices ?? []).find((candidate) => candidate.id === action.deviceId)
      return device?.kind === 'clock' && device.setFlag !== undefined ? setClockRecord(topology, room, device) : null
    }
    case 'voice': {
      const device = (room.devices ?? []).find((candidate) => candidate.id === action.deviceId)
      if (device?.kind !== 'voice') return null
      const utterance = voiceUtterance(device, progress, content)
      // What it says to this save: a recording has a record, a line of its own has none.
      return utterance?.documentId !== undefined ? voiceRecord(topology, content, room, device, utterance) : null
    }
    case 'sign': {
      const device = (room.devices ?? []).find((candidate) => candidate.id === action.deviceId)
      const term = (content.terms ?? []).find((candidate) => candidate.id === action.termId)
      return device?.kind === 'signing-desk' && term && device.termIds.includes(term.id)
        ? signRecord(content, room, device, term)
        : null
    }
  }
}

// ---------------------------------------------------------------------------
// The play
// ---------------------------------------------------------------------------

/**
 * Passes the play may take. Each one is a level of the script, and the whole
 * game is planned at twenty; a content that needs more than this is not
 * deeper, it is a chain that feeds itself.
 */
export const SIMULATION_PASS_LIMIT = 64

type ReturnProblem = { readonly roomId: string; readonly code: 'no-return-path' | 'one-way-trap' }

/** An action that was offered until a term was signed, and what it would have given that the save did not hold. */
type Disabled = { readonly termId: string; readonly recordId: string; readonly lost: readonly string[] }

type Play = {
  readonly progress: Progress
  /** The save after every action she took, in order, from the one she began with. */
  readonly steps: readonly Progress[]
  readonly reachable: ReadonlySet<string>
  readonly levels: readonly (readonly string[])[]
  readonly met: readonly ActionRecord[]
  readonly returnProblems: readonly ReturnProblem[]
  readonly converged: boolean
  /** Only of a play that signs eagerly: what each signature took off the table. */
  readonly disabled: readonly Disabled[]
}

/**
 * Whether the player who has just walked into `roomId` can walk back to where
 * the night begins, with the doors as they stand in that save (V5).
 *
 * `no-return-path` when nothing leads back. `one-way-trap` when something
 * does, but only through a door that opens from one side: a one-way door is
 * always one way more, never the only one.
 */
function returnProblem(topology: Topology, progress: Progress, roomId: string, home: string): ReturnProblem['code'] | null {
  const powered = poweredIn(topology, progress)
  const leadsHome = (twoWayOnly: boolean) => {
    const seen = new Set([roomId])
    const queue = [roomId]
    while (queue.length > 0) {
      const room = topology.rooms.get(queue.shift() as string)
      if (!room) continue
      for (const portal of room.portals) {
        const door = topology.doorAt.get(`${room.id}:${portal.id}`)
        if (door) {
          if (twoWayOnly && door.opensFrom !== null) continue
          if (transitionDoorBlock(door, room.id, powered, progress.doorsReleased) !== null) continue
        }
        if (seen.has(portal.toRoom)) continue
        seen.add(portal.toRoom)
        queue.push(portal.toRoom)
      }
    }
    return seen.has(home)
  }
  if (!leadsHome(false)) return 'no-return-path'
  return leadsHome(true) ? null : 'one-way-trap'
}

/**
 * Plays from a save to the fixed point.
 *
 * What a pass may do is decided against the save as the pass began, from the
 * rooms she could stand in then; what each action gives is asked of the save
 * as it stands, with the triggers settled after every one, as the store
 * settles them after every write. So a pass is a level of the script: what
 * could be done with what the level before left.
 *
 * A session always begins at the spawn, whatever the save says of where the
 * player stopped.
 *
 * What the game shows her by itself she watches as it comes: a directed
 * sequence owed is seen, at the settling of every write, as the HUD plays it
 * to a player who waits. So a desk is never held from her by a card.
 *
 * `eager` is another player: one who signs every term at the first moment
 * its desk offers it, before anything else in reach. She is how the gate
 * learns what a signature takes off the table (`post-ending-disables-
 * action`): the first player does everything else first, and would never
 * notice.
 */
function play(content: MuseumContent, topology: Topology, from: Progress, eager = false): Play {
  const home: string = content.spawn.room
  const sequences = content.sequences ?? []
  const watched = (progress: Progress): Progress => {
    let seen = progress
    // One at a time, as the director starts them; each one owed is seen once.
    for (let turn = 0; turn < sequences.length; turn += 1) {
      const due = dueSequence(sequences, seen, content)
      if (!due) break
      seen = grantProgress(seen, { sequencesSeen: [due.id] })
    }
    return seen
  }
  const settle = (progress: Progress) => watched(settleTriggers(progress, topology.triggers, content).progress)
  const records = new Map(contentActions(content).map((entry) => [entry.id, entry]))

  const met = new Map<string, ActionRecord>()
  /** The consequences that came with the last step: catalogue entries and triggers. */
  const meetConsequences = (before: Progress, after: Progress) => {
    for (const exhibitId of after.catalogued) {
      const entry = records.get(`catalogue:${exhibitId}`)
      if (entry && !before.catalogued.includes(exhibitId)) met.set(entry.id, entry)
    }
    for (const triggerId of after.triggersFired) {
      const entry = records.get(`trigger:${triggerId}`)
      if (entry && !before.triggersFired.includes(triggerId)) met.set(entry.id, entry)
    }
  }

  // Entering is the store's `start`, and a save may be owed something as it loads.
  let progress = settle(grantProgress(from, { roomsVisited: [home] }))
  meetConsequences(from, progress)
  const steps: Progress[] = [progress]

  const reachable = new Set([home])
  const returnProblems: ReturnProblem[] = []
  const levels: string[][] = []
  let known = new Set(atomsOf(from))
  let converged = false

  /** Every record a press would realise now, from any room she can stand in. */
  const offered = () => {
    const now = new Map<string, ActionRecord>()
    for (const roomId of reachable) {
      for (const action of availableActions(content, progress, roomId)) {
        const entry = actionRecord(content, progress, roomId, action)
        if (entry) now.set(entry.id, entry)
      }
    }
    return now
  }
  const disabled: Disabled[] = []
  /** The eager player signs whatever a desk in reach offers, until none offers anything. */
  const signEagerly = () => {
    if (!eager) return
    for (let turn = 0; turn < SIMULATION_PASS_LIMIT; turn += 1) {
      const sign = [...reachable]
        .flatMap((roomId) => availableActions(content, progress, roomId).map((action) => ({ roomId, action })))
        .find((candidate) => candidate.action.kind === 'sign')
      if (!sign || sign.action.kind !== 'sign') return
      const own = actionRecord(content, progress, sign.roomId, sign.action)
      const before = progress
      const offeredBefore = offered()
      progress = settle(grantProgress(progress, actionGrant(content, progress, sign.action)))
      if (progress === before) return
      if (own) met.set(own.id, own)
      meetConsequences(before, progress)
      steps.push(progress)
      // What was on the table a moment ago and is not now, other than the
      // signature itself, with what it would have given that she lacks.
      const offeredAfter = offered()
      const held = atomsOf(progress)
      for (const [id, entry] of offeredBefore) {
        if (id === own?.id || offeredAfter.has(id)) continue
        const lost = entry.grants.filter((granted) => !held.includes(granted))
        if (lost.length > 0) disabled.push({ termId: sign.action.termId, recordId: id, lost })
      }
    }
  }

  for (let pass = 0; pass < SIMULATION_PASS_LIMIT; pass += 1) {
    signEagerly()
    const began = progress
    const entered: string[] = []

    for (const roomId of [...reachable]) {
      const room = topology.rooms.get(roomId)
      if (!room) continue
      for (const action of availableActions(content, began, roomId)) {
        signEagerly()
        const entry = actionRecord(content, progress, roomId, action)
        if (entry) met.set(entry.id, entry)

        const before = progress
        progress = settle(grantProgress(progress, actionGrant(content, progress, action)))
        meetConsequences(before, progress)
        if (progress !== before) steps.push(progress)

        if (action.kind !== 'door' || reachable.has(action.to) || entered.includes(action.to)) continue
        entered.push(action.to)
        // With the save the pass began with and nothing this pass did: doors
        // only open further, so the way back is asked at its narrowest.
        const arrival = grantProgress(began, actionGrant(content, began, action))
        const problem = returnProblem(topology, arrival, action.to, home)
        if (problem) returnProblems.push({ roomId: action.to, code: problem })
      }
    }
    for (const roomId of entered) reachable.add(roomId)

    const gained = atomsOf(progress).filter((entry) => !known.has(entry))
    if (gained.length === 0 && entered.length === 0) {
      converged = true
      break
    }
    known = new Set([...known, ...gained])
    levels.push(gained)
  }

  // Lost for good is what the rest of her night never gave her another way.
  const end = atomsOf(progress)
  const lostForGood = disabled
    .map((entry) => ({ ...entry, lost: entry.lost.filter((granted) => !end.includes(granted)) }))
    .filter((entry) => entry.lost.length > 0)
  return { progress, steps, reachable, levels, met: [...met.values()], returnProblems, converged, disabled: lostForGood }
}

// ---------------------------------------------------------------------------
// What the play proves
// ---------------------------------------------------------------------------

/** Every condition the content asks, wherever it is written, each branch of a choice counted as one. */
function conditionsOf(content: MuseumContent, topology: Topology): readonly ProgressCondition[] {
  const conditions: ProgressCondition[] = topology.triggers.map((trigger) => trigger.when)
  for (const doc of content.documents) {
    for (const page of doc.pages ?? []) {
      for (const item of page.items ?? []) {
        if (item.doneWhen) conditions.push(item.doneWhen)
        // What puts a line on the page is asked of the save like what ticks
        // it, and so is what puts a note beside it.
        if (item.appearsWhen) conditions.push(item.appearsWhen)
        if (item.noteWhen) conditions.push(item.noteWhen)
      }
    }
  }
  for (const room of content.rooms) {
    for (const device of room.devices ?? []) {
      // What a voice waits for before it says each thing.
      if (device.kind === 'voice') conditions.push(...device.utterances.map((utterance) => utterance.when))
      if (device.kind !== 'radio') continue
      conditions.push(...device.calls.map((call) => call.when), ...device.hints.map((hint) => hint.when))
      // What ends a call's moment, and what an answer looks at before it is said.
      conditions.push(...device.calls.flatMap((call) => (call.lapsesWhen ? [call.lapsesWhen] : [])))
      const patience = device.patience
      if (!patience) continue
      const answers = [
        ...patience.tiers.flatMap((tier) => [...tier.replies, ...(tier.outbursts ?? [])]),
        ...(patience.praise ?? []),
        ...patience.deadAir,
      ]
      conditions.push(...answers.flatMap((answer) => (answer.when ? [answer.when] : [])))
    }
  }
  for (const milestone of content.nightClock?.milestones ?? []) {
    if ('when' in milestone) conditions.push(milestone.when)
  }
  for (const term of content.terms ?? []) conditions.push(term.presentedWhen, term.when)
  // What makes a sequence owed reads the save like anything else: usually the
  // flag a term's signature sets.
  for (const sequence of content.sequences ?? []) conditions.push(sequence.when)
  // A branch asks like any other condition.
  const withBranches = (condition: ProgressCondition): ProgressCondition[] => [
    condition,
    ...(condition.anyOf ?? []).flatMap(withBranches),
  ]
  return conditions.flatMap(withBranches)
}

export type SimulationResult = {
  readonly issues: readonly ValidationIssue[]
  /** Everything reachable, at the fixed point. */
  readonly final: Progress
  /** Atoms by the pass on which they first appear: the script in levels. */
  readonly levels: readonly (readonly string[])[]
  /** Every action met on the way, with what it asked and gave (the snapshot's source). */
  readonly actions: readonly ActionRecord[]
}

/**
 * Plays the content from a save (a new game when none is given) and says what
 * the play could not reach.
 *
 * Every accusation carries the id it is about, so a lot that cannot pay one
 * yet can date it (`knownDebt.ts`).
 */
export function simulateProgress(content: MuseumContent, from: Progress = emptyProgress()): SimulationResult {
  const issues: ValidationIssue[] = []
  const error = (code: string, id: string, message: string) => issues.push({ severity: 'error', code, id, message })
  const topology = topologyOf(content)
  const home: string = content.spawn.room

  if (!topology.rooms.has(home)) {
    error('no-start-room', home, `The museum has no "${home}" room to start from.`)
    return { issues, final: from, levels: [], actions: [] }
  }
  if (topology.doorProblem) {
    // Every opening is then walked as if it had no leaf, so that one bad door
    // does not also accuse every room behind it.
    error(
      'transition-door-invalid',
      'doors',
      `The doors cannot be built, and the runtime builds them as it starts: ${topology.doorProblem}`,
    )
  }

  const { progress: final, steps, reachable, levels, met, returnProblems, converged } = play(content, topology, from)

  if (!converged) {
    error(
      'simulation-no-fixpoint',
      'play',
      `The play was still finding something new after ${SIMULATION_PASS_LIMIT} passes: a chain that feeds itself, or a museum deeper than any script.`,
    )
  }

  // --- content outside the fixed point ---------------------------------------
  for (const room of content.rooms) {
    if (!reachable.has(room.id)) {
      error('room-unreachable', room.id, `Room "${room.id}" is never reachable, even by a player who does everything.`)
    }
  }
  for (const lock of content.locks) {
    if (final.locksOpened.includes(lock.id)) continue
    error(
      'lock-unopenable',
      lock.id,
      `Lock "${lock.id}" can never be opened: what it asks for is out of reach, or nothing the player can press carries it.`,
    )
    // Is what it asks for behind it? Opened by force, the play goes on, and
    // if the fact turns up then, the only place it is taught is past the lock.
    if (lock.kind !== 'knowledge' || final.factsKnown.includes(lock.factId)) continue
    const forced = play(content, topology, grantProgress(final, { locksOpened: [lock.id], locksSeen: [lock.id] }))
    if (forced.progress.factsKnown.includes(lock.factId)) {
      error(
        'lock-evidence-behind-lock',
        lock.id,
        `Lock "${lock.id}" opens with fact "${lock.factId}", and the only places that teach it are reached with the lock already open.`,
      )
    }
  }
  for (const doc of content.documents) {
    if (!final.documentsRead.includes(doc.id)) {
      error('document-unreadable', doc.id, `Document "${doc.id}" can never be read: nothing the player reaches holds it open.`)
    }
  }
  for (const exhibit of content.exhibits) {
    // A detail nothing waits for, where no hand finds it. It is offered to
    // nobody, so it is in no action and in no snapshot, and the piece's own
    // accusation (below) only names the details the piece needs: without
    // this one, content a player can never see would pass in silence.
    for (const hotspot of exhibit.hotspots) {
      const reach = examineReach(exhibit, hotspot)
      if (hotspot.requiredForCatalogue || reach.reachable) continue
      error(
        'hotspot-unreachable',
        `${exhibit.id}:${hotspot.id}`,
        `Detail "${hotspot.id}" of "${exhibit.id}" is never found: ` +
          (reach.shows
            ? `it shows only inside a cone of ${reach.coneDegrees.toFixed(1)}°, under the ${EXAMINE_MIN_CONE_DEGREES}° a hand finds.`
            : 'it can never be turned to the camera.'),
      )
    }
    if (final.catalogued.includes(exhibit.id)) continue
    const out = exhibit.hotspots
      .filter((hotspot) => hotspot.requiredForCatalogue && !examineReach(exhibit, hotspot).reachable)
      .map((hotspot) => {
        const reach = examineReach(exhibit, hotspot)
        return reach.shows
          ? `"${hotspot.id}" shows only inside a cone of ${reach.coneDegrees.toFixed(1)}°, under the ${EXAMINE_MIN_CONE_DEGREES}° a hand finds`
          : `"${hotspot.id}" can never be turned to the camera`
      })
    error(
      'exhibit-uncataloguable',
      exhibit.id,
      `Exhibit "${exhibit.id}" cannot be catalogued by a player who does not already know where to look: ` +
        (out.length > 0 ? `its required detail ${out.join('; ')}.` : 'no required detail of it is ever seen.'),
    )
  }

  // --- keys ------------------------------------------------------------------
  const conditions = conditionsOf(content, topology)
  const effects = topology.triggers.flatMap((trigger) => trigger.effects)
  const asked = new Set([
    ...content.locks.flatMap(lockCredentialKeys),
    ...conditions.flatMap((condition) => (condition.credentials ?? []).map(credentialKey)),
  ])
  for (const key of new Set(content.locks.flatMap(lockCredentialKeys))) {
    if (!final.credentials.includes(key)) {
      error('credential-unobtainable', key, `A lock asks for "${key}", and no play ever holds it.`)
    }
  }
  const handedOut = new Set(
    effects.flatMap((effect) => (effect.kind === 'grant-credential' ? [credentialKey(effect.credential)] : [])),
  )
  for (const key of handedOut) {
    if (!asked.has(key)) {
      error('credential-orphan', key, `The content hands out "${key}", and no lock or condition ever asks for it.`)
    }
  }

  // --- loose wiring ----------------------------------------------------------
  for (const trigger of topology.triggers) {
    if (!final.triggersFired.includes(trigger.id)) {
      error('trigger-never-fires', trigger.id, `Trigger "${trigger.id}" never fires: no play ever meets its condition.`)
    }
  }
  // A flag is set by an effect, or by a verb of a device (a clock put right).
  // The device that sets one reads it too: a set clock shows another hour.
  const deviceFlags = content.rooms.flatMap((room) =>
    (room.devices ?? []).flatMap((device) => {
      const flag = deviceSetFlag(device)
      return flag === null ? [] : [flag]
    }),
  )
  const flagsSet = new Set([
    ...effects.flatMap((effect) => (effect.kind === 'set-flag' ? [effect.flag] : [])),
    ...deviceFlags,
  ])
  // Waiting for a flag and waiting for its absence are both waiting on
  // something to set it: one that nothing sets is loose wiring either way
  // («while it rains» with nothing that ever stops the rain).
  const flagsRead = new Set([
    ...conditions.flatMap((condition) => [...(condition.flags ?? []), ...(condition.flagsUnset ?? [])]),
    ...deviceFlags,
  ])
  // One more hand sets a flag: a migration, on a save from before this lot
  // (`PRE_POSSE_SAVE.drawer`: a drawer opened before it held a key). No play
  // of this build sets it, which is the point of it, so it is not in the
  // list above: a call that waits for it is not loose wiring, and nothing is
  // accused of setting a flag for it.
  const flagsOfOlderSaves: ReadonlySet<string> = new Set([PRE_POSSE_SAVE.drawer.flag])
  for (const flag of flagsRead) {
    if (!flagsSet.has(flag) && !flagsOfOlderSaves.has(flag)) {
      error('flag-never-set', flag, `A condition waits for flag "${flag}" (or for its absence), and nothing sets it.`)
    }
  }
  for (const flag of flagsSet) {
    if (!flagsRead.has(flag)) error('flag-never-read', flag, `An effect sets flag "${flag}", and no condition ever asks for it.`)
  }

  // --- the ending --------------------------------------------------------------
  // A term is signable when what it asks is met at the fixed point, and
  // signed when the play signed it: she holds E on every desk that offers one.
  const terms = content.terms ?? []
  const signable = terms.filter((term) => progressConditionMet(term.when, final, content))
  for (const term of terms) {
    if (!signable.includes(term)) {
      error(
        'term-unsignable',
        term.id,
        `Term "${term.id}" can never be signed: what it asks (${conditionAtoms(term.when, content).join(', ') || 'nothing'}) is never all true in any play.`,
      )
    } else if (!final.termsSigned.includes(term.id)) {
      error(
        'ending-unreachable',
        term.id,
        `Term "${term.id}" could be signed and no play signs it: no desk a player reaches offers it, or an older term on its desk waits for ever in front of it.`,
      )
    }
    // The desk names a term from `presentedWhen` on, and says what it still
    // waits for. So what brings it to the desk is part of what signing asks,
    // and whatever signing asks beyond that is a room or a paper: the two
    // things a desk has words for.
    const asked = conditionAtoms(term.when, content)
    const brought = conditionAtoms(term.presentedWhen, content)
    const late = brought.filter((entry) => !asked.includes(entry))
    if (late.length > 0) {
      error(
        'term-presented-late',
        term.id,
        `Term "${term.id}" is brought to the desk by ${late.join(', ')}, which signing it does not ask for: \`when\` asks everything \`presentedWhen\` asks.`,
      )
    }
    const unnamed = asked.filter((entry) => !brought.includes(entry) && !/^(?:power|doc):/.test(entry))
    if (unnamed.length > 0) {
      error(
        'term-blocker-unnamed',
        term.id,
        `Term "${term.id}" waits on the desk for ${unnamed.join(', ')}, and a desk can only say which room is dark and which paper is unread: ` +
          `the player would be refused with no reason given. Ask for it in \`presentedWhen\` too, so the term comes to the desk with it done.`,
      )
    }
  }
  // Signing takes nothing away. Asked of the player who signs each term the
  // moment its desk offers it: every action on the table before a signature
  // is still there after it, or what it gave is in the save, or the rest of
  // her night gives it another way.
  if (terms.length > 0) {
    for (const entry of play(content, topology, from, true).disabled) {
      error(
        'post-ending-disables-action',
        entry.termId,
        `Signing "${entry.termId}" takes "${entry.recordId}" away: a player who signs first never gets ${entry.lost.join(', ')}.`,
      )
    }
  }
  for (const sequence of content.sequences ?? []) {
    if (!final.sequencesSeen.includes(sequence.id)) {
      error(
        'sequence-never-plays',
        sequence.id,
        `Sequence "${sequence.id}" never plays: no play ever meets what it waits for (${conditionAtoms(sequence.when, content).join(', ') || 'nothing'}).`,
      )
    }
  }

  // --- the porter still has something to point at ------------------------------
  // While a term can be signed and has not been, the night is not over, and
  // the last hint («nothing left but checking») would be a lie: at every
  // step of the play, some hint above it has to hold.
  if (signable.length > 0) {
    for (const { device } of radioDevices(content)) {
      if (device.hints.length === 0) continue
      const uncovered = steps.find((step) => {
        const owed = signable.some((term) => !step.termsSigned.includes(term.id))
        const index = radioHintIndex(device, step, content)
        return owed && (index < 0 || index === device.hints.length - 1)
      })
      if (!uncovered) continue
      const owed = signable.filter((term) => !uncovered.termsSigned.includes(term.id)).map((term) => `"${term.id}"`)
      error(
        'radio-hint-coverage',
        device.id,
        `Radio "${device.id}" runs out of hints with ${owed.join(' and ')} still to sign: in a save with ` +
          `${atomsOf(uncovered).filter((entry) => /^(?:power|lock|doc|cred|flag):/.test(entry)).join(', ') || 'nothing done'} ` +
          `the hint in force is the last, which is for a night with nothing left to do.`,
      )
    }
  }

  // --- the way back (V5) -----------------------------------------------------
  for (const problem of returnProblems) {
    error(
      problem.code,
      problem.roomId,
      problem.code === 'no-return-path'
        ? `Room "${problem.roomId}" can be walked into and not out of: nothing leads back to "${home}" with the doors as they stand on arrival.`
        : `Room "${problem.roomId}" leads back to "${home}" only through a door that opens from one side. A one-way door is one way more, never the only one.`,
    )
  }

  // --- the notebook's list ---------------------------------------------------
  for (const doc of content.documents) {
    for (const page of doc.pages ?? []) {
      for (const item of page.items ?? []) {
        // A line that waits for something to be on the page, and no play
        // gets there: nobody ever reads it. Asked only of what stays true
        // once it is: a line may wait for an absence, and the end of the
        // play says nothing of what was absent on the way.
        if (
          item.appearsWhen &&
          conditionClass(item.appearsWhen) === 'positive' &&
          !progressConditionMet(item.appearsWhen, final, content)
        ) {
          error(
            'checklist-item-untickable',
            item.labelKey,
            `Checklist item "${item.labelKey}" waits to appear for something no play reaches: it is never on the list.`,
          )
          continue
        }
        // The note beside a line is how a promise says «not tonight». One
        // that waits for something no play reaches is never read, and the
        // line is then a promise the game does not say. Only the play knows
        // what is reached, so it is asked here and not with
        // `deferred-without-notice`, which reads the content alone.
        if (
          item.noteWhen &&
          conditionClass(item.noteWhen) === 'positive' &&
          !progressConditionMet(item.noteWhen, final, content)
        ) {
          error(
            'checklist-note-unreachable',
            item.labelKey,
            `Checklist item "${item.labelKey}" keeps its note for something no play reaches: nobody ever reads it.`,
          )
        }
        // A promise with a date has no box, on purpose: there is nothing in
        // this build to tick it, and it says so (`validateDeferred` holds it
        // to its lot). With a box as well it is neither.
        if (item.deferredUntilLot !== undefined) {
          if (item.doneWhen) {
            error(
              'checklist-deferred-with-box',
              item.labelKey,
              `Checklist item "${item.labelKey}" is a promise dated for L${item.deferredUntilLot} and has a \`doneWhen\`: ` +
                `a line is a task with a box or a promise without one. Drop the date when the lot pays it.`,
            )
          }
          continue
        }
        if (!item.doneWhen) {
          error(
            'checklist-item-untickable',
            item.labelKey,
            `Checklist item "${item.labelKey}" has no \`doneWhen\` and no date: it is a box nothing ever ticks.`,
          )
        } else if (!progressConditionMet(item.doneWhen, final, content)) {
          error(
            'checklist-item-untickable',
            item.labelKey,
            `Checklist item "${item.labelKey}" asks for something no play reaches: it stays unticked for good.`,
          )
        }
      }
    }
  }

  return { issues, final, levels, actions: met }
}

/** Atoms that fill a level without telling its story: counted, not listed. */
const SCRIPT_COUNTED: Readonly<Record<string, string>> = { detail: 'details', seen: 'locks touched', fired: 'triggers' }

/**
 * The script, one level to a line, for the gate to print: what a player can
 * have done after so many rounds of doing everything in reach.
 */
export function formatScript(levels: readonly (readonly string[])[]): string {
  return levels
    .map((level, index) => {
      const told = level.filter((entry) => !Object.hasOwn(SCRIPT_COUNTED, entry.slice(0, entry.indexOf(':'))))
      const counted = Object.entries(SCRIPT_COUNTED).flatMap(([prefix, name]) => {
        const count = level.filter((entry) => entry.startsWith(`${prefix}:`)).length
        return count > 0 ? [`(${count} ${name})`] : []
      })
      return `  N${String(index).padEnd(2)} ${[...told, ...counted].join(' · ')}`
    })
    .join('\n')
}
