/**
 * The playthrough robot: a player for the real store.
 *
 * The content gate proves the museum can be finished with pure functions
 * (`content/simulate.ts`). What it cannot see is the distance between those
 * functions and the thing that is played: the store that commits every write
 * and settles the triggers, the save that goes to disk and comes back through
 * the migrations, a tab that is closed in the middle of the night. This robot
 * covers that distance. It plays the store itself, in an order drawn from a
 * seed, wastes presses the way a player does, closes the tab at moments it
 * does not choose, and has to arrive where the simulation says play ends.
 *
 * It is two things kept apart on purpose:
 *
 *   - a MIND, which asks the simulation what may be done (`availableActions`)
 *     and picks among it;
 *   - HANDS (`press`), which do to the store what each component does when E
 *     is pressed, line for line, with the pure rules the component calls. The
 *     hands never ask the simulation anything.
 *
 * After every press the two are held against each other (`pressProblem`): a
 * press the simulation offered has to have written exactly what the
 * simulation said it would, and a press it did not offer has to have written
 * nothing. A detail the simulation offers and no hand can turn to the camera
 * shows up here as a press that changed nothing.
 *
 * Two presses are allowed to beat the simulation, and are named: the right
 * code typed by somebody who never read it, and a detail whose cone is too
 * narrow to plan on and wide enough for the view to record (`luckyDetail`).
 * Both are still held to what the rules give for them.
 *
 * Importing this module puts a storage on `globalThis` (through
 * `storePage.ts`): import it before anything that reaches the store.
 */

import { openGame, shrunk, type GamePage } from './storePage.ts'

import type { MuseumContent } from '../../src/content/schema.ts'
import {
  actionGrant,
  actionRecord,
  atomsOf,
  availableActions,
  type PlayerAction,
} from '../../src/content/simulate.ts'
import { deskRadioIntent, radioIsLive } from '../../src/engine/deviceRules.ts'
import { examineReach } from '../../src/engine/examineReach.ts'
import { attemptLock } from '../../src/engine/lockRules.ts'
import { isContainerTaken } from '../../src/engine/notebook.ts'
import { isRoomPowered } from '../../src/engine/power.ts'
import { containerGrant, doorGrant, hotspotGrant } from '../../src/engine/progressGrants.ts'
import {
  buildTransitionDoorSpecs,
  canOpenTransitionDoor,
  transitionDoorBlock,
  transitionDoorEndpointMap,
  type TransitionDoorSpec,
} from '../../src/engine/transitionDoorTopology.ts'
import { grantProgress, type Progress } from '../../src/state/progressFields.ts'
import { progressRules } from '../../src/state/progressRules.ts'

type Raw = Record<string, unknown>

/** The same press, whichever object describes it. */
export const sameAction = (first: PlayerAction, second: PlayerAction) =>
  JSON.stringify(Object.entries(first).sort()) === JSON.stringify(Object.entries(second).sort())

/** A press as a line of the robot's log. */
export function describe(action: PlayerAction): string {
  switch (action.kind) {
    case 'power':
      return `power ${action.roomId}`
    case 'door':
      return `door ${action.doorId} ${action.from}>${action.to}`
    case 'hotspot':
      return `detail ${action.exhibitId}:${action.hotspotId}`
    case 'container':
      return `open ${action.containerId}`
    case 'code':
      return `type ${action.entry} at ${action.lockId}`
    case 'take':
      return `take ${action.deviceId}`
  }
}

// ---------------------------------------------------------------------------
// The hands
// ---------------------------------------------------------------------------

const doorsByContent = new WeakMap<MuseumContent, ReadonlyMap<string, TransitionDoorSpec>>()

/** `room:portal` to the door in that opening, as the runtime pairs the two portals of one doorway. */
function doorsOf(world: MuseumContent) {
  const cached = doorsByContent.get(world)
  if (cached) return cached
  const doors = buildTransitionDoorSpecs(world.rooms)
  const byId = new Map(doors.map((door) => [door.id, door]))
  const byEndpoint = new Map(
    [...transitionDoorEndpointMap(doors)].flatMap(([endpoint, doorId]) => {
      const door = byId.get(doorId)
      return door ? [[endpoint, door] as const] : []
    }),
  )
  doorsByContent.set(world, byEndpoint)
  return byEndpoint
}

/**
 * E on something that carries a lock: `Containers.tsx` and `PowerControls.tsx`.
 * True when the press goes through to what is behind.
 */
function throughLock(page: GamePage, world: MuseumContent, lockId: string | undefined): boolean {
  if (!lockId) return true
  const lock = world.locks.find((candidate) => candidate.id === lockId)
  // A lock the content does not have cannot be opened by anything.
  if (!lock) return false
  const state = page.state()
  const attempt = attemptLock(lock, world.facts, state.progress, { kind: 'touch' })
  if (attempt.outcome !== 'open') state.grant(attempt.grant)
  if (attempt.outcome === 'ask') {
    // The keypad comes up; the robot looks at it and puts it away.
    state.setActiveLock(lock.id)
    page.state().setActiveLock(null)
    return false
  }
  return attempt.outcome !== 'refused'
}

/**
 * Does to the store what the game does when the player, standing where the
 * store says they stand, makes this press. `world` is the museum the hands
 * are in; nothing here asks the simulation whether the press is allowed.
 *
 * Each case follows the handler it names. Where the component would answer
 * with a sound, or with nothing, so does this.
 */
export function press(page: GamePage, world: MuseumContent, action: PlayerAction): void {
  const state = page.state()
  const progress = state.progress
  const room = world.rooms.find((candidate) => candidate.id === state.currentRoom)
  if (!room) return

  switch (action.kind) {
    // `PowerControls.tsx`: a switch whose room has power has nothing left to do.
    case 'power': {
      if (action.roomId !== room.id || !room.powerControl || isRoomPowered(room, progress.roomsPowered)) return
      if (!throughLock(page, world, room.powerLockId)) return
      page.state().powerRoom(room.id)
      return
    }

    // `Containers.tsx`: a notebook that was read is no longer on the desk.
    case 'container': {
      const container = (room.containers ?? []).find((candidate) => candidate.id === action.containerId)
      if (!container || isContainerTaken(world, container, progress.documentsRead)) return
      if (!throughLock(page, world, container.lockId)) return
      page.state().grant(containerGrant(world, container.id))
      page.state().setOpenedContainer(container.id)
      page.state().setOpenedContainer(null)
      return
    }

    // `LockPanel.tsx`, `submit`. The panel is only ever up for a lock whose
    // carrier answered `ask`, so the press begins by getting it up again.
    case 'code': {
      const carried =
        room.powerLockId === action.lockId || (room.containers ?? []).some((container) => container.lockId === action.lockId)
      const lock = world.locks.find((candidate) => candidate.id === action.lockId)
      if (!carried || !lock) return
      const touch = attemptLock(lock, world.facts, progress, { kind: 'touch' })
      if (touch.outcome !== 'ask') return
      state.grant(touch.grant)
      page.state().setActiveLock(lock.id)

      const attempt = attemptLock(lock, world.facts, page.state().progress, { kind: 'code', entry: action.entry })
      if (attempt.outcome !== 'open') page.state().grant(attempt.grant)
      page.state().setActiveLock(null)
      if (attempt.outcome !== 'open' && attempt.outcome !== 'opened') return
      // Opening it shows what was inside at once.
      const container = world.rooms
        .flatMap((candidate) => candidate.containers ?? [])
        .find((candidate) => candidate.lockId === lock.id)
      if (container) {
        page.state().grant(containerGrant(world, container.id))
        page.state().setOpenedContainer(container.id)
        page.state().setOpenedContainer(null)
      }
      return
    }

    // `TransitionDoors.tsx`, `interact`, and then the walk through the opening.
    case 'door': {
      if (action.from !== room.id) return
      const doors = doorsOf(world)
      const portal = room.portals.find(
        (candidate) =>
          candidate.toRoom === action.to && (doors.get(`${room.id}:${candidate.id}`)?.id ?? candidate.id) === action.doorId,
      )
      if (!portal) return
      const door = doors.get(`${room.id}:${portal.id}`)
      if (door) {
        const powered = (roomId: string) => {
          const asked = world.rooms.find((candidate) => candidate.id === roomId)
          return asked ? isRoomPowered(asked, progress.roomsPowered) : false
        }
        if (
          !canOpenTransitionDoor(door, room.id, progress.doorsReleased) ||
          transitionDoorBlock(door, room.id, powered, progress.doorsReleased) !== null
        ) {
          return
        }
        // Pushed is released, before the leaf moves.
        const release = doorGrant(door, room.id, progress.doorsReleased)
        if (release) state.grant(release)
      }
      page.state().setCurrentRoom(action.to)
      return
    }

    // `Interaction.tsx`: the piece is picked up and turned, and each detail
    // that comes to face the camera is recorded, unless the save has it.
    case 'hotspot': {
      const exhibit = world.exhibits.find((candidate) => candidate.id === action.exhibitId)
      const hotspot = exhibit?.hotspots.find((candidate) => candidate.id === action.hotspotId)
      if (!exhibit || !hotspot || !room.exhibitIds.includes(exhibit.id)) return
      state.setExamining(exhibit.id)
      // The hand turns the piece until the detail faces the camera, and the
      // view records it there: its one test is the cone, however narrow
      // (`outward.dot(toCamera) > EXAMINE_HOTSPOT_DOT`). Whether a player
      // ever turns it that far is the mind's question, not the hand's: this
      // used to ask the simulation's own 5°, and the two were then compared
      // with each other. A detail that never shows is turned for ever.
      const found = examineReach(exhibit, hotspot).shows
      if (found && !progress.hotspots.includes(`${exhibit.id}:${hotspot.id}`)) {
        page.state().grant(hotspotGrant(exhibit, hotspot.id, page.state().progress.hotspots))
      }
      page.state().setExamining(null)
      return
    }

    // `Devices.tsx`, `operateRadio`: only a live radio still on its charger is taken.
    case 'take': {
      const device = (room.devices ?? []).find((candidate) => candidate.id === action.deviceId)
      if (!device || device.kind !== 'radio') return
      const intent = deskRadioIntent(device, {
        live: radioIsLive(world, device.id, progress.roomsPowered),
        carried: progress.devicesCarried.includes(device.id),
        speaking: state.radio !== null,
      })
      if (intent === 'take') state.carryDevice(device.id)
      return
    }
  }
}

/**
 * Every press the furniture of a room offers, whatever the save says: the
 * list a player who does not know the rules chooses from.
 *
 * A code is typed only at a keypad the player has had up (the lock was
 * touched), and the right one only by a player who knows the fact, unless
 * they are guessing. That is the player's honesty, not a rule of the game.
 */
export function everyPress(
  world: MuseumContent,
  progress: Pick<Progress, 'locksSeen' | 'factsKnown'>,
  roomId: string,
  guessing = false,
): PlayerAction[] {
  const room = world.rooms.find((candidate) => candidate.id === roomId)
  if (!room) return []
  const doors = doorsOf(world)
  const presses: PlayerAction[] = []
  if (room.powerControl) presses.push({ kind: 'power', roomId: room.id })
  for (const portal of room.portals) {
    presses.push({
      kind: 'door',
      doorId: doors.get(`${room.id}:${portal.id}`)?.id ?? portal.id,
      from: room.id,
      to: portal.toRoom,
    })
  }
  for (const exhibitId of room.exhibitIds) {
    for (const hotspot of world.exhibits.find((candidate) => candidate.id === exhibitId)?.hotspots ?? []) {
      presses.push({ kind: 'hotspot', exhibitId, hotspotId: hotspot.id })
    }
  }
  for (const container of room.containers ?? []) presses.push({ kind: 'container', containerId: container.id })
  const carried = [room.powerControl ? room.powerLockId : undefined, ...(room.containers ?? []).map((container) => container.lockId)]
  for (const lockId of new Set(carried.filter((id): id is string => id !== undefined))) {
    const lock = world.locks.find((candidate) => candidate.id === lockId)
    if (lock?.kind !== 'knowledge' || !progress.locksSeen.includes(lock.id)) continue
    const answer = world.facts.find((fact) => fact.id === lock.factId)?.value
    if (answer === undefined) continue
    // A wrong code of the right length: the year before.
    presses.push({ kind: 'code', lockId: lock.id, entry: String(Number(answer) - 1).padStart(answer.length, '0') })
    if (guessing || progress.factsKnown.includes(lock.factId)) presses.push({ kind: 'code', lockId: lock.id, entry: answer })
  }
  for (const device of room.devices ?? []) {
    if (device.kind === 'radio' && device.carriedOnUse) presses.push({ kind: 'take', deviceId: device.id })
  }
  return presses
}

// ---------------------------------------------------------------------------
// The mind held against the hands
// ---------------------------------------------------------------------------

const sorted = (progress: Raw) => atomsOf(progress as never).sort()
const settled = (progress: Progress) => progressRules()?.settle(progress) ?? progress

/**
 * A detail the view records and no play is planned on: its cone is open, and
 * narrower than the hand the simulation plays with. The store takes the
 * press; the simulation never offers it.
 */
export function luckyDetail(content: MuseumContent, action: PlayerAction): boolean {
  if (action.kind !== 'hotspot') return false
  const exhibit = content.exhibits.find((candidate) => candidate.id === action.exhibitId)
  const hotspot = exhibit?.hotspots.find((candidate) => candidate.id === action.hotspotId)
  if (!exhibit || !hotspot) return false
  const reach = examineReach(exhibit, hotspot)
  return reach.shows && !reach.reachable
}

/**
 * Why a press and the simulation disagree, or null when they do not.
 *
 * `content` is the museum the simulation was asked about. An offered press
 * has to have written what `actionGrant` said, with the triggers settled, and
 * no more; a press that was not offered has to have written nothing.
 *
 * `beyond` names a press the rules take although the simulation does not
 * offer it (a guessed code, a lucky detail). It is held like an offered one:
 * to exactly what the rules give for it.
 */
export function pressProblem(
  content: MuseumContent,
  room: string,
  action: PlayerAction,
  before: Progress,
  after: Progress,
  beyond = false,
): string | null {
  const offered = availableActions(content, before, room).some((candidate) => sameAction(candidate, action))
  const wrote = sorted(after as Raw).filter((entry) => !atomsOf(before).includes(entry))
  if (!offered && !beyond) {
    return wrote.length === 0
      ? null
      : `the store accepted "${describe(action)}" in ${room}, which the simulation does not offer there: it wrote ${wrote.join(', ')}`
  }
  const expected = sorted(settled(grantProgress(before, actionGrant(content, before, action))) as Raw)
  const got = sorted(after as Raw)
  if (JSON.stringify(expected) === JSON.stringify(got)) return null
  const missing = expected.filter((entry) => !got.includes(entry))
  const extra = got.filter((entry) => !expected.includes(entry))
  return (
    (offered
      ? `the simulation offers "${describe(action)}" in ${room} (${actionRecord(content, before, room, action)?.id ?? 'no record'}) `
      : `the rules take "${describe(action)}" in ${room}, beyond what the simulation offers, `) +
    `and the store did something else: ` +
    [missing.length > 0 ? `it did not write ${missing.join(', ')}` : '', extra.length > 0 ? `it also wrote ${extra.join(', ')}` : '']
      .filter(Boolean)
      .join('; ')
  )
}

// ---------------------------------------------------------------------------
// The player
// ---------------------------------------------------------------------------

export type RobotProfile = {
  /** Chance, at each step, of closing the tab and coming back through the save. */
  readonly reloadChance: number
  /** Chance, at each step, of a press that gets nowhere. */
  readonly uselessChance: number
  /** Presses this player never makes: the notebook nobody reads, the radio left on the desk. */
  readonly skips?: (action: PlayerAction) => boolean
  /** Types the answer at every keypad without having learnt it. */
  readonly guessesCodes?: boolean
  /** Never switches the torch on. */
  readonly noTorch?: boolean
}

export const ORDINARY: RobotProfile = { reloadChance: 0.05, uselessChance: 0.25 }

export type Playthrough = {
  /** The page the night ended on: the last of however many tabs it took. */
  readonly page: GamePage
  readonly log: readonly string[]
  readonly presses: number
  readonly reloads: number
  /** Presses that changed nothing. */
  readonly wasted: number
}

/** More steps than any honest night takes: a robot still going is going round in circles. */
const STEP_LIMIT = 4000

/** The tab is closed and the game opened again: the store writes, and a new one reads. */
export async function reload(page: GamePage): Promise<GamePage> {
  const before = JSON.parse(JSON.stringify(page.progress())) as Raw
  page.leave()
  const next = await openGame(page.savedText() ?? undefined)
  const lost = shrunk(before, next.progress() as Raw)
  if (lost.length > 0) throw new Error(`the save lost something on its way through the disk: ${lost.join('; ')}`)
  // Continue, from the title screen.
  next.state().start()
  return next
}

/**
 * Plays from wherever the page stands until nothing the simulation offers
 * anywhere within walking distance would add to the save.
 *
 * `random` decides everything: which useful press comes next, when a press is
 * wasted, when the tab closes. The same seed is the same night.
 *
 * `world` is the museum the hands are in. It is the one the mind was told
 * about, except in the one test that shows what happens when it is not.
 */
export async function playToEnd(
  start: GamePage,
  content: MuseumContent,
  random: () => number,
  profile: RobotProfile = ORDINARY,
  world: MuseumContent = content,
): Promise<Playthrough> {
  let page = start
  if (!page.state().started) page.state().start()
  const log: string[] = []
  let presses = 0
  let reloads = 0
  let wasted = 0
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
  const skipped = (action: PlayerAction) => profile.skips?.(action) ?? false

  /** A press through the hands, held against the simulation. */
  const make = (action: PlayerAction, note: string) => {
    const room = page.state().currentRoom
    const before = page.progress()
    press(page, world, action)
    const after = page.progress()
    presses += 1
    if (after === before) wasted += 1
    log.push(`${note} ${describe(action)}${after === before ? '  (nothing)' : ''}`)
    const guessed =
      profile.guessesCodes === true &&
      action.kind === 'code' &&
      content.locks.some(
        (lock) =>
          lock.id === action.lockId &&
          lock.kind === 'knowledge' &&
          content.facts.some((fact) => fact.id === lock.factId && fact.value === action.entry),
      )
    // The two presses that are allowed to beat the simulation: the right
    // code, typed by somebody who never read it, and the detail only luck
    // finds. Allowed, and held to what the rules give for them.
    const problem = pressProblem(content, room, action, before, after, guessed || luckyDetail(world, action))
    if (problem) throw new Error(problem)
  }

  /** What is worth doing in a room: offered, not skipped, and adding to the save. */
  const worthDoing = (progress: Progress, room: string) => [
    ...availableActions(content, progress, room).filter(
      (action) => !skipped(action) && grantProgress(progress, actionGrant(content, progress, action)) !== progress,
    ),
    ...(profile.guessesCodes
      ? everyPress(content, progress, room, true).filter(
          (action) =>
            action.kind === 'code' &&
            !progress.locksOpened.includes(action.lockId) &&
            content.facts.some((fact) => fact.value === action.entry),
        )
      : []),
  ]

  /** The first door of a walk to some room with work in it, or null when no room has any. */
  const towardsWork = (progress: Progress, from: string): PlayerAction | null => {
    const firstStep = new Map<string, PlayerAction | null>([[from, null]])
    const queue = [from]
    const withWork: string[] = []
    while (queue.length > 0) {
      const room = queue.shift() as string
      if (room !== from && worthDoing(progress, room).length > 0) withWork.push(room)
      for (const action of availableActions(content, progress, room)) {
        if (action.kind !== 'door' || firstStep.has(action.to)) continue
        firstStep.set(action.to, firstStep.get(room) ?? action)
        queue.push(action.to)
      }
    }
    return withWork.length > 0 ? (firstStep.get(pick(withWork)) ?? null) : null
  }

  try {
    for (let step = 0; step < STEP_LIMIT; step += 1) {
      const state = page.state()
      const room = state.currentRoom
      const progress = page.progress()

      if (random() < profile.reloadChance) {
        page = await reload(page)
        reloads += 1
        log.push('— the tab is closed and opened again —')
        continue
      }

      if (random() < profile.uselessChance) {
        const idle = [
          ...everyPress(content, progress, room).filter((action) => !skipped(action)),
          ...(profile.noTorch ? [] : (['torch'] as const)),
          'journal' as const,
        ]
        const chosen = pick(idle)
        if (chosen === 'torch') {
          state.toggleFlashlight()
          log.push('  (torch)')
        } else if (chosen === 'journal') {
          // Opened on the plan and shut: a modal, and never a write.
          state.setJournalTab('map')
          page.state().setJournalTab(null)
          log.push('  (journal)')
        } else {
          make(chosen, '  idle:')
        }
        if (page.progress() !== progress && (chosen === 'torch' || chosen === 'journal')) {
          throw new Error(`"${chosen}" wrote to the save`)
        }
        continue
      }

      const useful = worthDoing(progress, room)
      const next = useful.length > 0 ? pick(useful) : towardsWork(progress, room)
      if (!next) return { page, log, presses, reloads, wasted }
      make(next, useful.length > 0 ? 'do:  ' : 'walk:')
    }
    throw new Error(`the robot was still playing after ${STEP_LIMIT} steps`)
  } catch (error) {
    // The night as far as it went: whoever replays a seed wants the presses
    // that led to the stop, and an error alone does not carry them.
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), { log })
  }
}

/**
 * The one night a run was asked to replay, from the arguments after `--`, or
 * null when it was asked for none.
 *
 * Anything else is said and not guessed at: a seed that is not a whole number
 * of the range would be turned into night 0 by the dice, which is no night
 * of the five hundred, and would be played without a word.
 */
export function seedAsked(args: readonly string[], nights: number): number | null {
  if (args.length === 0) return null
  const value = args.length === 2 && args[0] === '--seed' ? args[1] : ''
  const seed = /^\d+$/.test(value) ? Number(value) : 0
  if (seed < 1 || seed > nights) {
    throw new Error(`this suite takes --seed <n>, a whole number from 1 to ${nights}, and was given: ${args.join(' ') || 'nothing'}`)
  }
  return seed
}

/** Everything a save holds that the graph speaks of, sorted: two nights that ended alike compare equal. */
export const endOf = (progress: unknown) => sorted(progress as Raw)
