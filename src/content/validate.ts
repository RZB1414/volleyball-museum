/**
 * Content validators — the CI gate that a coding agent actually needs.
 *
 * This project is built by an agent that cannot see the screen, so the feedback
 * loop has to be mechanical. These checks catch the class of bug that silently
 * ruins the whole experience: an unreachable exhibit, a lock whose answer is
 * only discoverable behind that same lock, a CC-BY image shipped without
 * attribution, a knowledge code resting on a single-sourced claim.
 *
 * Run by `npm run validate:content`; also imported by the dev build so a
 * broken content edit fails loudly instead of at runtime.
 */

import { conditionClasses, credentialKey } from '../engine/progressCondition.ts'
import { MOUNT_PARTS, mountPartNames, transitionDoorPartNames } from '../engine/runtimePlacedParts.ts'
import { buildRoomSignageLayout } from '../engine/signageLayout.ts'
import { compileTriggers } from '../engine/triggers.ts'
import { doorIdsOf, saveIdsByField, validateAdditive, type GraphSnapshot } from './additive.ts'
import { validateFactCaptures, type FactCaptureSet } from './factCapture.ts'
import { settleKnownDebt, type KnownDebt } from './knownDebt.ts'
import { PRE_OPENING_SAVE, SAVE_ALIASES, type SaveAlias } from './legacySave.ts'
import type {
  DeviceData,
  ExhibitMount,
  Fact,
  MuseumContent,
  ProgressCondition,
  RoomData,
  UnlockEffect,
} from './schema'
import { simulateProgress } from './simulate.ts'
import { validateText } from './textLint.ts'

export type ValidationIssue = {
  /**
   * `debt` is an error the table in `knownDebt.ts` has written down with the
   * lot that pays it: the gate prints it on every run and does not fail on it
   * until that lot arrives.
   */
  readonly severity: 'error' | 'warning' | 'debt'
  readonly code: string
  readonly message: string
  /**
   * What the issue is about, when it is about one thing. A debt line names an
   * accusation by code and id, so only an issue that carries one can be owed.
   */
  readonly id?: string
  /** With severity `debt`: when it falls due, and why it waits. */
  readonly debt?: { readonly untilLot: number; readonly note: string }
}

/** The player's physical radius; a spawn must leave this much clear floor. */
const SPAWN_CLEARANCE = 0.3

/** Wall thickness in the bake; a room's plaster face is half of it inside the shell line. */
const SHELL_WALL = 0.25

// How a credential is spelt, and which ones a lock asks for, are the runtime's
// own functions (`engine/progressCondition.ts`, `engine/lockRules.ts`): the
// gate must not prove a lock graph spelt differently from the one that is played.

// ---------------------------------------------------------------------------
// Referential integrity
// ---------------------------------------------------------------------------

function validateReferences(content: MuseumContent): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const roomIds = new Set<string>(content.rooms.map((room) => room.id))
  const exhibitIds = new Set(content.exhibits.map((exhibit) => exhibit.id))
  const documentIds = new Set(content.documents.map((doc) => doc.id))
  const lockIds = new Set(content.locks.map((lock) => lock.id))
  const factIds = new Set(content.facts.map((fact) => fact.id))
  const mediaIds = new Set(content.media.map((asset) => asset.id))

  const error = (code: string, message: string) =>
    issues.push({ severity: 'error', code, message })

  for (const room of content.rooms) {
    const wallArtIds = new Set<string>()
    const signIds = new Set<string>()
    for (const portal of room.portals) {
      if (!roomIds.has(portal.toRoom)) {
        error('portal-dangling', `Room "${room.id}" portal "${portal.id}" targets unknown room "${portal.toRoom}".`)
      }
      if (portal.lockId && !lockIds.has(portal.lockId)) {
        error('portal-lock-missing', `Room "${room.id}" portal "${portal.id}" references unknown lock "${portal.lockId}".`)
      }
    }
    for (const id of room.exhibitIds) {
      if (!exhibitIds.has(id)) {
        error('exhibit-missing', `Room "${room.id}" references unknown exhibit "${id}".`)
      }
    }
    for (const id of room.documentIds) {
      if (!documentIds.has(id)) {
        error('document-missing', `Room "${room.id}" references unknown document "${id}".`)
      }
    }
    for (const art of room.wallArt ?? []) {
      if (wallArtIds.has(art.id)) {
        error('wall-art-duplicate', `Room "${room.id}" repeats wall art id "${art.id}".`)
      }
      wallArtIds.add(art.id)
      if (!mediaIds.has(art.mediaId)) {
        error('media-missing', `Wall art "${art.id}" references unknown media "${art.mediaId}".`)
      }
      if (!(art.width > 0 && art.height > 0)) {
        error('wall-art-size', `Wall art "${art.id}" must have positive dimensions.`)
      }
    }
    for (const sign of room.signage ?? []) {
      if (signIds.has(sign.id)) {
        error('sign-duplicate', `Room "${room.id}" repeats sign id "${sign.id}".`)
      }
      signIds.add(sign.id)
      if (
        sign.presentation === 'dedication-plaque' &&
        !((sign.width ?? 0) > 0 && (sign.height ?? 0) > 0)
      ) {
        error(
          'sign-size',
          `Physical sign "${sign.id}" must declare positive width and height.`,
        )
      }
    }
    if (room.powerLockId && !lockIds.has(room.powerLockId)) {
      error('power-lock-missing', `Room "${room.id}" power lock "${room.powerLockId}" does not exist.`)
    }
  }

  for (const exhibit of content.exhibits) {
    if (exhibit.scale !== undefined && (!Number.isFinite(exhibit.scale) || exhibit.scale <= 0)) {
      error('exhibit-scale', `Exhibit "${exhibit.id}" must have a finite positive scale.`)
    }
    if (exhibit.mediaId && !mediaIds.has(exhibit.mediaId)) {
      error('media-missing', `Exhibit "${exhibit.id}" references unknown media "${exhibit.mediaId}".`)
    }
    for (const hotspot of exhibit.hotspots) {
      if (hotspot.revealsFactId && !factIds.has(hotspot.revealsFactId)) {
        error('fact-missing', `Exhibit "${exhibit.id}" hotspot "${hotspot.id}" reveals unknown fact "${hotspot.revealsFactId}".`)
      }
    }
    // What its `unlocks` name is checked with every other effect, wherever it
    // is written (`validateTriggers`: `effect-target-missing`).
    // The "you must turn it over" rule only bites if such a hotspot exists.
    if (!exhibit.hotspots.some((hotspot) => hotspot.requiredForCatalogue)) {
      issues.push({
        severity: 'warning',
        code: 'exhibit-no-required-hotspot',
        message: `Exhibit "${exhibit.id}" can be catalogued without examining anything — it is a passive pickup.`,
      })
    }
  }

  for (const doc of content.documents) {
    if (doc.mediaId && !mediaIds.has(doc.mediaId)) {
      error('media-missing', `Document "${doc.id}" references unknown media "${doc.mediaId}".`)
    }
    if (doc.lockId && !lockIds.has(doc.lockId)) {
      error('document-lock-missing', `Document "${doc.id}" references unknown lock "${doc.lockId}".`)
    }
    if (doc.revealsFactId && !factIds.has(doc.revealsFactId)) {
      error('fact-missing', `Document "${doc.id}" reveals unknown fact "${doc.revealsFactId}".`)
    }
  }

  for (const lock of content.locks) {
    if (lock.kind === 'knowledge') {
      if (!factIds.has(lock.factId)) {
        error('lock-fact-missing', `Knowledge lock "${lock.id}" references unknown fact "${lock.factId}".`)
      }
      if (!exhibitIds.has(lock.sourceExhibitId)) {
        error('lock-source-missing', `Knowledge lock "${lock.id}" names unknown source exhibit "${lock.sourceExhibitId}".`)
      }
    }
  }

  issues.push(...validateLockHosts(content))

  return issues
}

/**
 * Where each lock lives, and whether the runtime can open it there.
 *
 * The simulation (`simulate.ts`) proves a lock CAN be opened; nothing asked
 * whether the player ever meets the lock, or what happens when they do. Each rule
 * here is a way the two disagreed in silence: a lock in the list that no
 * object carries, a keypad that is not as long as its own answer, a code
 * resting on a fact nobody certified as one, a note that claims to be free
 * inside a locked drawer, and a kind of lock the one panel the game has
 * cannot show.
 */
function validateLockHosts(content: MuseumContent): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const error = (code: string, id: string, message: string) =>
    issues.push({ severity: 'error', code, id, message })
  const locksById = new Map(content.locks.map((lock) => [lock.id, lock]))
  const factsById = new Map(content.facts.map((fact) => [fact.id, fact]))
  const hosted = new Set<string>()

  /**
   * The keypad is the only lock panel there is, and only containers and power
   * controls open it. Any other kind of lock on one of them opens a modal
   * with nothing in it.
   */
  const hostsKeypad = (lockId: string | undefined, hostId: string, what: string) => {
    if (!lockId) return
    hosted.add(lockId)
    const lock = locksById.get(lockId)
    if (lock && lock.kind !== 'knowledge') {
      error(
        'lock-host-kind-unsupported',
        hostId,
        `${what} "${hostId}" carries the ${lock.kind} lock "${lock.id}", but the runtime can only open a knowledge lock there: the panel would be empty.`,
      )
    }
  }

  for (const room of content.rooms) {
    for (const container of room.containers ?? []) hostsKeypad(container.lockId, container.id, 'Container')
    // A room's power lock is met at its control; with no control, nowhere.
    if (room.powerControl) hostsKeypad(room.powerLockId, room.powerControl.id, 'Power control')
    for (const portal of room.portals) {
      if (!portal.lockId) continue
      hosted.add(portal.lockId)
      // The solver honours a portal's lock; the door that stands in it never
      // asks for one. Until a door can, the solver would be proving a game
      // nobody can play.
      error(
        'lock-host-kind-unsupported',
        portal.id,
        `Portal "${portal.id}" in room "${room.id}" names lock "${portal.lockId}", but no doorway in the runtime asks for a lock: the door would open, or never open, regardless.`,
      )
    }
  }

  for (const lock of content.locks) {
    if (!hosted.has(lock.id)) {
      error(
        'lock-without-host',
        lock.id,
        `Lock "${lock.id}" is carried by no container, portal or power control, so the player never meets it.`,
      )
    }
    if (lock.kind !== 'knowledge') continue
    const fact = factsById.get(lock.factId)
    if (!fact) continue // lock-fact-missing already reports this
    if (lock.digits !== fact.value.length) {
      error(
        'lock-digits-mismatch',
        lock.id,
        `Knowledge lock "${lock.id}" has ${lock.digits} digit(s) but its answer "${fact.value}" has ${fact.value.length}: the keypad could never hold it.`,
      )
    }
    if (!fact.usedAsCode) {
      error(
        'knowledge-lock-fact-not-code',
        lock.id,
        `Knowledge lock "${lock.id}" opens with fact "${fact.id}", which is not marked \`usedAsCode\`: nothing has held it to two captured publishers.`,
      )
    }
  }

  const containersById = new Map(
    content.rooms.flatMap((room) => (room.containers ?? []).map((container) => [container.id, container] as const)),
  )
  for (const doc of content.documents) {
    const container = containersById.get(doc.containerId)
    if (!container) continue
    if (doc.lockId !== container.lockId) {
      const says = (lockId: string | undefined) => (lockId ? `lock "${lockId}"` : 'no lock')
      error(
        'document-lock-disagrees-with-container',
        doc.id,
        `Document "${doc.id}" declares ${says(doc.lockId)} but its container "${container.id}" declares ${says(container.lockId)}. The solver reads the document's, the player meets the container's.`,
      )
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// Power progression
// ---------------------------------------------------------------------------

/**
 * An unpowered room needs a physical, uniquely addressable way to recover.
 *
 * Keeping this in the content gate is important: a missing control still
 * compiles and the lighting code correctly leaves the room dark, producing a
 * perfectly functional soft-lock that no type checker can distinguish from
 * intentional darkness.
 */
export function validatePower(content: MuseumContent): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const controlIds = new Set<string>()

  for (const room of content.rooms) {
    const control = room.powerControl
    if (!room.startsPowered && !control) {
      issues.push({
        severity: 'error',
        code: 'unpowered-room-no-control',
        message: `Room "${room.id}" starts unpowered but declares no physical power control.`,
      })
      continue
    }
    if (!control) continue

    if (controlIds.has(control.id)) {
      issues.push({
        severity: 'error',
        code: 'power-control-duplicate',
        message: `Power control id "${control.id}" is used by more than one room.`,
      })
    }
    controlIds.add(control.id)

    const [x, y, z] = control.position
    const inside =
      Math.abs(x) <= room.shell.width / 2 + 0.15 &&
      Math.abs(z) <= room.shell.depth / 2 + 0.15 &&
      y >= 0 &&
      y <= room.shell.height
    if (!inside) {
      issues.push({
        severity: 'error',
        code: 'power-control-outside-room',
        message: `Power control "${control.id}" is outside room "${room.id}" at [${control.position.join(', ')}].`,
      })
    }

    /**
     * A control fixed to a wall touches the wall.
     *
     * A wall recipe is authored from its back plane, so the placement IS the
     * back of the fixture. Both breakers hung in the air: one 15 mm out, with
     * the dado rail passing behind it, the other a hand's width proud of the
     * plaster over the wainscot. Neither shows in a head-on screenshot; both
     * show the moment the player walks along the wall. A control on a desk is
     * nowhere near a wall and is left alone.
     */
    const wall = nearestWallFace(room, control.position)
    if (wall.gap <= WALL_REACH && Math.abs(wall.gap) > WALL_FIXTURE_TOLERANCE) {
      issues.push({
        severity: 'error',
        code: 'wall-fixture-off-the-wall',
        id: control.id,
        message:
          `Power control "${control.id}" is fixed ${(wall.gap * 1000).toFixed(1)} mm ` +
          `${wall.gap > 0 ? 'out from' : 'into'} the plaster of room "${room.id}" ` +
          `(${wall.axis === 0 ? 'x' : 'z'} = ${wall.at.toFixed(3)}). A wall fixture's placement is its back plane: ` +
          `put it on the face.`,
      })
    }
  }

  return issues
}

/** How far a wall fixture's back may stand from the plaster: a coat of paint. */
const WALL_FIXTURE_TOLERANCE = 0.006

export type WallFace = {
  /** The axis the wall is normal to: 0 for an east or west wall, 2 for north or south. */
  readonly axis: 0 | 2
  /** The plaster face along that axis, room-local. */
  readonly at: number
  /** Unit normal of the face, pointing into the room: [x, z]. */
  readonly inward: readonly [number, number]
  /** Distance from the point to the face, positive into the room. */
  readonly gap: number
}

/**
 * The plaster face a room-local point is nearest to.
 *
 * `shell.width` runs between wall centre lines, so the face is half a wall
 * inside it: 8.875 m in the eighteen-metre atrium, not 9.
 */
export function nearestWallFace(
  room: Pick<RoomData, 'shell'>,
  position: readonly number[],
): WallFace {
  const faces = ([0, 2] as const).flatMap((axis) => {
    const half = (axis === 0 ? room.shell.width : room.shell.depth) / 2 - SHELL_WALL / 2
    return ([-1, 1] as const).map((side) => ({
      axis,
      at: side * half,
      inward: (axis === 0 ? [-side, 0] : [0, -side]) as readonly [number, number],
      gap: half - side * position[axis],
    }))
  })
  return faces.reduce((nearest, face) => (Math.abs(face.gap) < Math.abs(nearest.gap) ? face : nearest))
}

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

/**
 * A knowledge lock turns a historical claim into a functional dependency: a
 * wrong year becomes a soft-lock. The adversarial fact-check on the source
 * research returned 109 corrections across 199 milestones, so nothing gets to
 * be a code on one source's say-so.
 */
export function validateFacts(facts: readonly Fact[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const fact of facts) {
    if (!fact.usedAsCode) continue

    if (fact.confidence !== 'high') {
      issues.push({
        severity: 'error',
        code: 'fact-code-low-confidence',
        message: `Fact "${fact.id}" is used as a lock code but its confidence is "${fact.confidence}".`,
      })
    }

    const distinctPublishers = new Set(fact.sources.map((source) => source.publisher.toLowerCase()))
    if (distinctPublishers.size < 2) {
      issues.push({
        severity: 'error',
        code: 'fact-code-single-source',
        message: `Fact "${fact.id}" is used as a lock code but rests on ${distinctPublishers.size} independent publisher(s). Two are required.`,
      })
    }

    // Codes are entered on a numeric dial. A word-based answer cannot survive
    // pt-BR / en translation, and the museum ships in both.
    if (!/^\d+$/.test(fact.value)) {
      issues.push({
        severity: 'error',
        code: 'fact-code-not-numeric',
        message: `Fact "${fact.id}" is used as a lock code but its value "${fact.value}" is not numeric.`,
      })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// Attribution
// ---------------------------------------------------------------------------

/**
 * Every image and document scan renders its credit directly beneath it in
 * world space. An empty TASL field is a licence breach that ships silently, so
 * it is an error, not a warning.
 */
export function validateAttribution(content: MuseumContent): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const asset of content.media) {
    const { credit } = asset
    const error = (message: string) =>
      issues.push({ severity: 'error', code: 'attribution-incomplete', message })

    if (credit.license === 'procedural') {
      if (!credit.generator.trim()) {
        error(`Media "${asset.id}" is procedural but names no generator.`)
      }
      continue
    }

    if (credit.license === 'public-domain') {
      if (!credit.title.trim()) error(`Media "${asset.id}" (public domain) has no title.`)
      if (!credit.sourceUrl.trim()) error(`Media "${asset.id}" (public domain) has no source URL.`)
      if (!credit.reason.trim()) {
        error(`Media "${asset.id}" claims public domain without stating why (e.g. "US work published 1916").`)
      }
      continue
    }

    // Every Creative Commons licence requires Title, Author, Source, Licence.
    if (!credit.title.trim()) error(`Media "${asset.id}" (${credit.license}) has no title.`)
    if (!credit.author.trim()) error(`Media "${asset.id}" (${credit.license}) has no author.`)
    if (!credit.sourceUrl.trim()) error(`Media "${asset.id}" (${credit.license}) has no source URL.`)
    if (!credit.licenseUrl.trim()) error(`Media "${asset.id}" (${credit.license}) has no licence URL.`)
  }

  return issues
}

// ---------------------------------------------------------------------------
// Whether the museum can be played to its end
// ---------------------------------------------------------------------------
//
// This file used to answer that with a walk of its own over the lock graph,
// which shared no rule with the runtime: it took the one-way shortcut for an
// ordinary door and every piece for cataloguable. The answer is now the
// exhaustive player of `simulate.ts`, moved by the functions the game is
// played with, and `validateContent` below reads her issues.

// ---------------------------------------------------------------------------
// The opening: spawn, devices, notebooks and the conditions they ask
// ---------------------------------------------------------------------------

type RadioDeviceData = Extract<DeviceData, { readonly kind: 'radio' }>
type Report = (code: string, message: string) => void

/** Lines in a porter's answer longer than this outlast the player's patience. */
const RADIO_ANSWER_MAX_LINES = 4

/**
 * A porter's temper, checked as the rules in `radioPatience.ts` read it.
 *
 * Each mistake here fails quietly in play: a first tier above 1 leaves the
 * opening calls without a tier, a repeated id makes "never the same joke
 * twice" skip the wrong one, a long hang-up keeps the help away from a stuck
 * player, and a curt tier without curt lines says the polite hint instead.
 */
function validateRadioPatience(device: RadioDeviceData, error: Report, warning: Report) {
  const patience = device.patience
  if (!patience) return
  const where = `Radio "${device.id}"`

  if (patience.tiers.length === 0 || patience.tiers[0].fromCall !== 1) {
    error('radio-patience-first-tier', `${where} patience must start with a tier from call 1.`)
  }
  for (const [index, tier] of patience.tiers.entries()) {
    const previous = patience.tiers[index - 1]
    if (!Number.isInteger(tier.fromCall) || (previous && tier.fromCall <= previous.fromCall)) {
      error(
        'radio-patience-order',
        `${where} patience tier ${index + 1} starts at call ${tier.fromCall}; tiers start at whole, strictly increasing calls.`,
      )
    }
    if (tier.replies.length === 0) {
      error('radio-patience-silent', `${where} patience tier ${index + 1} has no reply, so it could never help.`)
    }
    const chance = tier.outburstChance ?? 0
    if (!(chance >= 0 && chance < 1)) {
      error(
        'radio-outburst-chance',
        `${where} patience tier ${index + 1} loses its temper with chance ${chance}; it must be in [0, 1).`,
      )
    } else if (chance > 0.6) {
      warning(
        'radio-outburst-chance',
        `${where} patience tier ${index + 1} loses its temper ${Math.round(chance * 100)}% of the time.`,
      )
    }
  }

  const variants = [
    ...patience.tiers.flatMap((tier) => [...tier.replies, ...(tier.outbursts ?? [])]),
    ...(patience.praise ?? []),
    ...patience.deadAir,
  ]
  const variantIds = new Set<string>()
  for (const variant of variants) {
    if (variantIds.has(variant.id)) {
      error('radio-reply-duplicate', `${where} uses answer id "${variant.id}" twice.`)
    }
    variantIds.add(variant.id)
    if (variant.lineKeys.length === 0) {
      error('radio-patience-silent', `${where} answer "${variant.id}" has no lines.`)
    }
  }

  if (!(patience.hangUpSeconds >= 3 && patience.hangUpSeconds <= 30)) {
    error(
      'radio-hang-up-time',
      `${where} hangs up for ${patience.hangUpSeconds} s; between 3 and 30 keeps the help within reach.`,
    )
  }
  if (!(patience.calmSecondsPerCall > 0)) {
    error('radio-patience-calm', `${where} must calm down after a positive number of seconds.`)
  }
  if (!Number.isInteger(patience.progressForgives) || patience.progressForgives < 0) {
    error('radio-patience-forgive', `${where} must forgive a whole, non-negative number of calls.`)
  }
  const hangsUp = patience.tiers.some((tier) => (tier.outbursts ?? []).some((outburst) => outburst.hangsUp))
  if (hangsUp && patience.deadAir.length === 0) {
    error('radio-dead-air-missing', `${where} can hang up but has no dead air to answer with meanwhile.`)
  }

  const curtTier = patience.tiers.some((tier) => tier.hint === 'curt')
  if (curtTier) {
    for (const [index, hint] of device.hints.entries()) {
      if (!hint.curtLineKeys || hint.curtLineKeys.length === 0) {
        warning(
          'radio-curt-missing',
          `${where} hint ${index + 1} has no curt lines, so the impatient tiers say it politely.`,
        )
      }
    }
  }

  const longestHint = (curt: boolean) =>
    Math.max(
      0,
      ...device.hints.map((hint) =>
        curt && hint.curtLineKeys && hint.curtLineKeys.length > 0
          ? hint.curtLineKeys.length
          : hint.lineKeys.length,
      ),
    )
  for (const tier of patience.tiers) {
    const openers = [...tier.replies, ...(patience.praise ?? [])]
    for (const opener of openers) {
      const lines =
        opener.lineKeys.length + longestHint(tier.hint === 'curt') + (opener.closingKeys?.length ?? 0)
      if (lines > RADIO_ANSWER_MAX_LINES) {
        warning(
          'radio-answer-long',
          `${where} answer "${opener.id}" can run to ${lines} lines; keep a call to ${RADIO_ANSWER_MAX_LINES}.`,
        )
      }
    }
    for (const outburst of tier.outbursts ?? []) {
      if (outburst.lineKeys.length > RADIO_ANSWER_MAX_LINES) {
        warning(
          'radio-answer-long',
          `${where} outburst "${outburst.id}" runs to ${outburst.lineKeys.length} lines.`,
        )
      }
    }
  }
}

/**
 * Everything the first minutes of the game depend on.
 *
 * Each of these fails silently at runtime: a spawn inside a wall drops the
 * player into the void before the first frame, a condition naming a renamed
 * lock never becomes true and the porter's call never comes, a notebook
 * container with no pages opens an empty reader. None of them is a type error.
 */
export function validateOpening(content: MuseumContent): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const error = (code: string, message: string, id?: string) =>
    issues.push({ severity: 'error', code, message, ...(id === undefined ? {} : { id }) })
  const warning = (code: string, message: string) =>
    issues.push({ severity: 'warning', code, message })
  const roomIds = new Set<string>(content.rooms.map((room) => room.id))
  const lockIds = new Set(content.locks.map((lock) => lock.id))
  const documentIds = new Set(content.documents.map((doc) => doc.id))
  const exhibitIds = new Set(content.exhibits.map((exhibit) => exhibit.id))
  const hotspotKeys = new Set(
    content.exhibits.flatMap((exhibit) => exhibit.hotspots.map((hotspot) => `${exhibit.id}:${hotspot.id}`)),
  )
  const doorIds = doorIdsOf(content)
  const triggers = compileTriggers(content)
  // A credential exists for a condition when something hands it out. One that
  // only a lock asks for is that lock's problem, and never becomes true here.
  const grantedCredentials = new Set(
    triggers.flatMap((trigger) =>
      trigger.effects.flatMap((effect) => (effect.kind === 'grant-credential' ? [credentialKey(effect.credential)] : [])),
    ),
  )
  // Only a device the player can take away is ever "carried": a condition
  // naming any other id would wait for something that cannot happen.
  const carriableIds = new Set(
    content.rooms.flatMap((room) =>
      (room.devices ?? []).flatMap((device) =>
        device.kind === 'radio' && device.carriedOnUse ? [device.id] : [],
      ),
    ),
  )

  // --- spawn ---------------------------------------------------------------
  const spawnRoom = content.rooms.find((room) => room.id === content.spawn.room)
  if (!spawnRoom) {
    error('spawn-room-missing', `The spawn names unknown room "${content.spawn.room}".`)
  } else {
    const [x, y, z] = content.spawn.position
    const inner = (extent: number) => extent / 2 - 0.125 - SPAWN_CLEARANCE
    if (
      Math.abs(x) > inner(spawnRoom.shell.width) ||
      Math.abs(z) > inner(spawnRoom.shell.depth) ||
      Math.abs(y) > 1e-6
    ) {
      error(
        'spawn-outside-room',
        `The spawn [${content.spawn.position.join(', ')}] is not on the floor of room "${spawnRoom.id}" with ${SPAWN_CLEARANCE} m to spare.`,
      )
    }
  }
  if (!Number.isFinite(content.spawn.yaw)) {
    error('spawn-yaw', 'The spawn heading must be a finite number of radians.')
  }

  // --- conditions ------------------------------------------------------------
  const checkCondition = (condition: ProgressCondition, where: string): void => {
    for (const roomId of [
      ...(condition.powered ?? []),
      ...(condition.unpowered ?? []),
      ...(condition.roomsVisited ?? []),
    ]) {
      if (!roomIds.has(roomId)) error('condition-room-missing', `${where} names unknown room "${roomId}".`, roomId)
    }
    for (const lockId of [...(condition.locksOpened ?? []), ...(condition.locksClosed ?? [])]) {
      if (!lockIds.has(lockId)) error('condition-lock-missing', `${where} names unknown lock "${lockId}".`, lockId)
    }
    for (const documentId of [...(condition.documentsRead ?? []), ...(condition.documentsUnread ?? [])]) {
      if (!documentIds.has(documentId)) {
        error('condition-document-missing', `${where} names unknown document "${documentId}".`, documentId)
      }
    }
    for (const deviceId of condition.carried ?? []) {
      if (!carriableIds.has(deviceId)) {
        error(
          'condition-device-missing',
          `${where} waits for device "${deviceId}" to be carried, but no device with \`carriedOnUse\` has that id.`,
          deviceId,
        )
      }
    }
    for (const exhibitId of condition.catalogued ?? []) {
      if (!exhibitIds.has(exhibitId)) {
        error('condition-exhibit-missing', `${where} names unknown exhibit "${exhibitId}".`, exhibitId)
      }
    }
    for (const key of condition.hotspotsSeen ?? []) {
      if (!hotspotKeys.has(key)) {
        error(
          'condition-hotspot-missing',
          `${where} names "${key}", which is no detail of any exhibit (the save spells one \`exhibitId:hotspotId\`).`,
          key,
        )
      }
    }
    for (const doorId of condition.doorsReleased ?? []) {
      if (!doorIds.has(doorId)) {
        error(
          'condition-door-missing',
          `${where} names "${doorId}", which is not a door: a door is named by the portal that declares its \`transitionDoor\`.`,
          doorId,
        )
      }
    }
    for (const key of (condition.credentials ?? []).map(credentialKey)) {
      if (!grantedCredentials.has(key)) {
        error(
          'condition-credential-missing',
          `${where} waits for credential "${key}", which no effect in the content grants.`,
          key,
        )
      }
    }
    // A branch is a condition like any other, and a typo in one is as silent.
    for (const [index, branch] of (condition.anyOf ?? []).entries()) {
      checkCondition(branch, `${where}, branch ${index + 1}`)
    }
  }
  for (const trigger of content.triggers ?? []) checkCondition(trigger.when, `Trigger "${trigger.id}"`)

  // --- notebooks -------------------------------------------------------------
  for (const doc of content.documents) {
    for (const [index, page] of (doc.pages ?? []).entries()) {
      const where = `Document "${doc.id}" page ${index + 1}`
      if (page.style === 'checklist' && !(page.items && page.items.length > 0)) {
        error('notebook-checklist-empty', `${where} is a checklist with no items.`)
      }
      if (page.style !== 'checklist' && !page.bodyKey && !page.headingKey) {
        error('notebook-page-empty', `${where} has neither a heading nor a body.`)
      }
      for (const item of page.items ?? []) {
        if (item.doneWhen) checkCondition(item.doneWhen, `${where} item "${item.labelKey}"`)
      }
    }
  }

  for (const room of content.rooms) {
    for (const container of room.containers ?? []) {
      const inside = content.documents.filter((doc) => doc.containerId === container.id)
      if (container.presentation === 'notebook' && !inside.some((doc) => (doc.pages ?? []).length > 0)) {
        error(
          'notebook-without-pages',
          `Notebook "${container.id}" holds no paged document, so its reader would open empty.`,
        )
      }
      if (container.carriesJournal && inside.length === 0) {
        error(
          'journal-carrier-empty',
          `Container "${container.id}" carries the journal but holds no document, so it can never be picked up.`,
        )
      }
      if (container.carriesJournal && container.lockId) {
        error(
          'journal-carrier-locked',
          `Container "${container.id}" carries the journal behind lock "${container.lockId}": the map would be locked away with it.`,
        )
      }
    }
  }

  // --- devices ---------------------------------------------------------------
  const deviceIds = new Set<string>()
  const callIds = new Set<string>()
  for (const room of content.rooms) {
    for (const device of room.devices ?? []) {
      if (deviceIds.has(device.id)) error('device-duplicate', `Device id "${device.id}" is used twice.`)
      deviceIds.add(device.id)

      const [x, y, z] = device.position
      if (
        Math.abs(x) > room.shell.width / 2 + 0.15 ||
        Math.abs(z) > room.shell.depth / 2 + 0.15 ||
        y < 0 ||
        y > room.shell.height
      ) {
        error('device-outside-room', `Device "${device.id}" is outside room "${room.id}".`)
      }

      const watched =
        device.kind === 'clock'
          ? device.runsWithPowerOf
          : device.kind === 'power-indicator'
            ? device.showsPowerOf
            : device.poweredBy
      if (!roomIds.has(watched)) {
        error('device-room-missing', `Device "${device.id}" watches unknown room "${watched}".`)
      }

      if (device.kind === 'clock') {
        const { hours, minutes } = device.stoppedAt
        if (
          !Number.isInteger(hours) || hours < 0 || hours > 23 ||
          !Number.isInteger(minutes) || minutes < 0 || minutes > 59
        ) {
          error('clock-time', `Clock "${device.id}" stops at an impossible time.`)
        }
      }

      if (device.kind === 'radio') {
        for (const call of device.calls) {
          if (callIds.has(call.id)) error('radio-call-duplicate', `Radio call id "${call.id}" is used twice.`)
          callIds.add(call.id)
          if (call.lineKeys.length === 0) {
            error('radio-call-silent', `Radio call "${call.id}" has no lines.`)
          }
          if (!(call.delaySeconds >= 0)) {
            error('radio-call-delay', `Radio call "${call.id}" needs a non-negative delay.`)
          }
          checkCondition(call.when, `Radio call "${call.id}"`)
        }
        for (const [index, hint] of device.hints.entries()) {
          if (hint.lineKeys.length === 0) {
            error('radio-hint-silent', `Radio "${device.id}" hint ${index + 1} has no lines.`)
          }
          checkCondition(hint.when, `Radio "${device.id}" hint ${index + 1}`)
        }
        // A press on a live radio must always get an answer.
        const last = device.hints[device.hints.length - 1]
        if (!last || Object.keys(last.when).length > 0) {
          issues.push({
            severity: 'warning',
            code: 'radio-hint-no-fallback',
            message: `Radio "${device.id}" has no unconditional last hint, so a call can go unanswered.`,
          })
        }
        if (device.patience) validateRadioPatience(device, error, warning)
      }
    }
  }

  // --- saves from before the opening -----------------------------------------
  // The store migrates those saves by these ids; a renamed one would make the
  // migration silently do nothing and replay the opening at a returning player.
  const journalDocument = content.documents.find(
    (doc) => doc.id === PRE_OPENING_SAVE.journalDocumentId,
  )
  const carriers = content.rooms.flatMap((room) =>
    (room.containers ?? []).filter((container) => container.carriesJournal),
  )
  if (!journalDocument || !carriers.some((container) => container.id === journalDocument.containerId)) {
    error(
      'legacy-save-journal',
      `The pre-opening save migration grants "${PRE_OPENING_SAVE.journalDocumentId}", which is not the document in a journal-carrying container.`,
    )
  }
  if (!callIds.has(PRE_OPENING_SAVE.firstCallId)) {
    error(
      'legacy-save-call',
      `The pre-opening save migration marks unknown radio call "${PRE_OPENING_SAVE.firstCallId}" as heard.`,
    )
  }
  if (!roomIds.has(PRE_OPENING_SAVE.firstCallOverOncePowered)) {
    error(
      'legacy-save-room',
      `The pre-opening save migration watches unknown room "${PRE_OPENING_SAVE.firstCallOverOncePowered}".`,
    )
  }
  issues.push(...validateSaveAliases(content))

  return issues
}

/**
 * Triggers: the consequences of a save, each of which fires once and for good.
 *
 * All of these compile and run. A trigger sharing an id with another never
 * fires, because the save has that id on record from the first. An effect
 * naming a lock, a room or a paper the content does not have writes an id
 * nothing reads. And a guard that asks "is this still shut?" or "is every
 * piece catalogued?" makes a one-shot consequence depend on the order the
 * player did things in, or on how many rooms this lot happens to have.
 *
 * Read off the compiled list, so an exhibit's `unlocks` and a lock's `onOpen`
 * are held to the same rules as an authored trigger.
 */
export function validateTriggers(content: MuseumContent): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const error = (code: string, id: string, message: string) =>
    issues.push({ severity: 'error', code, id, message })
  const roomIds = new Set<string>(content.rooms.map((room) => room.id))
  const lockIds = new Set(content.locks.map((lock) => lock.id))
  const documentIds = new Set(content.documents.map((doc) => doc.id))

  /** What an effect points at in the content; null for one that points at nothing there. */
  const targetOf = (effect: UnlockEffect): { readonly id: string; readonly known: boolean; readonly what: string } | null => {
    switch (effect.kind) {
      case 'open-lock':
        return { id: effect.lockId, known: lockIds.has(effect.lockId), what: 'lock' }
      case 'power-room':
        return { id: effect.roomId, known: roomIds.has(effect.roomId), what: 'room' }
      case 'reveal-document':
        return { id: effect.documentId, known: documentIds.has(effect.documentId), what: 'document' }
      // A flag is made by being set. A credential is a member of the schema's
      // own unions until credentials are data (L3): the compiler holds its id,
      // and whether anything asks for it is the simulation's question.
      case 'set-flag':
      case 'grant-credential':
        return null
    }
  }

  const seen = new Set<string>()
  for (const trigger of compileTriggers(content)) {
    if (seen.has(trigger.id)) {
      error(
        'trigger-duplicate',
        trigger.id,
        `Trigger id "${trigger.id}" is used twice: the save records a trigger by id, so the second would never fire.`,
      )
    }
    seen.add(trigger.id)

    for (const effect of trigger.effects) {
      const target = targetOf(effect)
      if (target && !target.known) {
        error(
          'effect-target-missing',
          target.id,
          `Trigger "${trigger.id}" has a \`${effect.kind}\` effect on unknown ${target.what} "${target.id}".`,
        )
      }
    }

    const classes = conditionClasses(trigger.when)
    if (classes.has('negative')) {
      error(
        'gate-uses-negative-condition',
        trigger.id,
        `Trigger "${trigger.id}" is guarded by something that can stop being true (\`unpowered\`, \`locksClosed\`, \`documentsUnread\`): whether it ever fires would depend on the order the player did things in.`,
      )
    }
    if (classes.has('all')) {
      error(
        'gate-uses-all-condition',
        trigger.id,
        `Trigger "${trigger.id}" is guarded by "all rooms" or "all catalogued": the next lot's room or piece would change what it means. Name the ids.`,
      )
    }
  }
  return issues
}

/**
 * A renamed id has to lead somewhere.
 *
 * An alias whose new id the content does not have carries the player's
 * progress to nothing, and silently: the old id stays in the save, so nothing
 * looks lost until the document that should be read is not.
 */
export function validateSaveAliases(
  content: MuseumContent,
  aliases: readonly SaveAlias[] = SAVE_ALIASES,
): ValidationIssue[] {
  const idsByField = saveIdsByField(content)
  return aliases.flatMap((alias): ValidationIssue[] => {
    const ids = idsByField[alias.field]
    if (ids?.has(alias.to)) return []
    const where = `Save alias "${alias.from}" → "${alias.to}" in \`${alias.field}\` (since L${alias.sinceLot})`
    return [
      {
        severity: 'error',
        code: 'legacy-save-alias',
        id: `${alias.field}:${alias.from}`,
        message: ids
          ? `${where} points at an id the content does not have in that list.`
          : `${where} cannot be checked: the content does not define the ids of that list.`,
      },
    ]
  })
}

// ---------------------------------------------------------------------------
// Pacing
// ---------------------------------------------------------------------------

/**
 * The reading layer alone can eat the entire session budget: 199 researched
 * milestones across six wings is ~33 per gallery, and at 40 words each that is
 * about four minutes of standing still per room. The cap is eight wall labels;
 * everything else lives in the optional archive layer.
 */
export function validatePacing(content: MuseumContent): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const MAX_WALL_LABELS = 8

  for (const room of content.rooms) {
    if (room.exhibitIds.length > MAX_WALL_LABELS) {
      issues.push({
        severity: 'warning',
        code: 'room-over-label-budget',
        message: `Room "${room.id}" has ${room.exhibitIds.length} exhibits (budget ${MAX_WALL_LABELS}). Move the surplus into the archive layer.`,
      })
    }
    if (!room.portals.some((portal) => portal.oneWay) && room.id !== 'atrium' && room.id !== 'office') {
      issues.push({
        severity: 'warning',
        code: 'wing-no-shortcut',
        message: `Room "${room.id}" has no one-way shortcut back. The return trip is the reward of a wing.`,
      })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// Content <-> bake drift
// ---------------------------------------------------------------------------

type BakedBoundsLike = { readonly min: readonly number[]; readonly max: readonly number[] }
type BakedPartLike = {
  readonly name: string
  readonly triangles: number
  readonly bounds?: BakedBoundsLike
}
type BakedBundleLike = { readonly name: string; readonly parts: readonly BakedPartLike[] }

/**
 * The baked part an exhibit on this mount RESTS on, and therefore how high
 * its top surface is: the base the scene draws for the mount
 * (`runtimePlacedParts.ts`), except where that base is not what the object
 * stands on.
 */
function mountBasePart(mount: ExhibitMount): string | null {
  // Tower cases and built-in shelves expose an internal deck, not their top.
  // Those exhibits declare supportY from the procedural recipe's datum.
  if (mount === 'vitrine-tower') return null
  return MOUNT_PARTS[mount]?.part ?? null
}

/** Objects may sit this far off their mount before it reads as a mistake. */
const MOUNT_TOLERANCE = 0.015

/** A thing this close to the plaster, or closer, is on that wall. */
const WALL_REACH = 0.35

/** Thinner than this, a thing lying on the floor is flooring, not an obstacle. */
const FLOORING_HEIGHT = 0.05

/**
 * The room-local box of something placed like a kit part: its own bounds,
 * scaled, turned about the vertical and moved. Axis-aligned, so a part turned
 * to an odd angle gets the box that contains it.
 */
function placedExtent(
  bounds: BakedBoundsLike,
  position: readonly number[],
  rotationY = 0,
  scale = 1,
): BakedBoundsLike {
  const cos = Math.cos(rotationY)
  const sin = Math.sin(rotationY)
  const xs: number[] = []
  const zs: number[] = []
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const z of [bounds.min[2], bounds.max[2]]) {
      // three's rotation about +Y: local +Z turns towards +X.
      xs.push(position[0] + scale * (x * cos + z * sin))
      zs.push(position[2] + scale * (-x * sin + z * cos))
    }
  }
  return {
    min: [Math.min(...xs), position[1] + scale * bounds.min[1], Math.min(...zs)],
    max: [Math.max(...xs), position[1] + scale * bounds.max[1], Math.max(...zs)],
  }
}

/**
 * The content set names geometry recipes; the bake emits parts. Nothing links
 * them at compile time, so an exhibit can quietly reference a recipe nobody
 * generates and the player finds an empty plinth.
 *
 * Multi-part recipes use a `<recipe>__<part>` convention (the net is posts plus
 * cords), so a recipe resolves if there is an exact match OR any prefixed part.
 */
export function validateBake(
  content: MuseumContent,
  bundles: readonly BakedBundleLike[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const partNames = new Set(bundles.flatMap((bundle) => bundle.parts.map((part) => part.name)))
  const exhibitById = new Map(content.exhibits.map((exhibit) => [exhibit.id, exhibit]))
  const bundleByName = new Map(bundles.map((bundle) => [bundle.name, bundle]))

  const resolvesIn = (recipe: string, names: ReadonlySet<string>) =>
    names.has(recipe) || [...names].some((name) => name.startsWith(`${recipe}__`))
  const resolves = (recipe: string) => resolvesIn(recipe, partNames)

  for (const room of content.rooms) {
    if (!bundles.some((bundle) => bundle.name === `room-${room.id}`)) {
      issues.push({
        severity: 'error',
        code: 'room-shell-not-baked',
        message: `Room "${room.id}" has no baked shell bundle ("room-${room.id}").`,
      })
    }

    const exhibitBundleName = `exhibits-${room.id}`
    const exhibitBundle = bundleByName.get(exhibitBundleName)
    if (room.exhibitIds.length > 0 && !exhibitBundle) {
      issues.push({
        severity: 'error',
        code: 'exhibit-bundle-not-baked',
        message: `Room "${room.id}" has exhibits but no baked exhibit bundle ("${exhibitBundleName}").`,
      })
    }

    if (exhibitBundle) {
      const exhibitPartNames = new Set(exhibitBundle.parts.map((part) => part.name))
      for (const exhibitId of room.exhibitIds) {
        const exhibit = exhibitById.get(exhibitId)
        if (!exhibit) continue // validateReferences already reports this
        if (!resolvesIn(exhibit.recipe, exhibitPartNames)) {
          issues.push({
            severity: 'error',
            code: 'recipe-not-baked',
            message:
              `Exhibit "${exhibit.id}" in room "${room.id}" needs recipe ` +
              `"${exhibit.recipe}", which bundle "${exhibitBundleName}" does not produce. ` +
              `Add it to that room's exhibit bake or the plinth ships empty.`,
          })
        }
      }
    }

    /**
     * Kit placements and container furniture name baked parts too, and until
     * this check existed only EXHIBIT recipes were verified. A room could ask
     * for a bench nobody generated and simply render without one — which is
     * exactly how the atrium ended up an empty box for as long as it did.
     */
    for (const placement of room.kit ?? []) {
      if (!resolves(placement.part)) {
        issues.push({
          severity: 'error',
          code: 'kit-part-not-baked',
          message: `Room "${room.id}" places kit recipe "${placement.part}", which the bake does not produce.`,
        })
      }
    }

    if ((room.signage ?? []).some((sign) => sign.presentation === 'dedication-plaque') &&
        !resolves('dedication-plaque')) {
      issues.push({
        severity: 'error',
        code: 'sign-part-not-baked',
        message: `Room "${room.id}" needs the architectural dedication plaque, which the bake does not produce.`,
      })
    }

    if (room.wayfinding) {
      const part = `wayfinding-plaque-${room.wayfinding.plaqueStyle}`
      if (!resolves(part)) {
        issues.push({
          severity: 'error',
          code: 'sign-part-not-baked',
          message: `Room "${room.id}" needs wayfinding recipe "${part}", which the bake does not produce.`,
        })
      }
    }

    if (room.powerControl && !resolves(room.powerControl.part)) {
      issues.push({
        severity: 'error',
        code: 'power-control-part-not-baked',
        message: `Power control "${room.powerControl.id}" uses recipe "${room.powerControl.part}", which the bake does not produce.`,
      })
    } else if (room.powerControl) {
      /**
       * A control shows the state it controls.
       *
       * The breakers were a cast-iron box with a green glass bead, lit red
       * by a point light beside them: restore the power and the box looked
       * exactly as it had. A control says what it did either through a lens
       * the runtime repaints (`<part>__led`, as the door reader has) or
       * through a practical light of its own (the desk lamp). And a control
       * with a lens has the node the hand acts on, `<part>__lever`: the
       * runtime turns that node, so it cannot be a detail of the case.
       */
      const control = room.powerControl
      const hasLens = partNames.has(`${control.part}__led`)
      if (!hasLens && !control.light) {
        issues.push({
          severity: 'error',
          code: 'power-control-without-state',
          id: control.id,
          message:
            `Power control "${control.id}" (recipe "${control.part}") has neither a baked lens ` +
            `("${control.part}__led") nor a practical light: restored, it looks as it did unpowered.`,
        })
      }
      if (hasLens && !partNames.has(`${control.part}__lever`)) {
        issues.push({
          severity: 'error',
          code: 'power-control-node-missing',
          id: control.id,
          message:
            `Power control "${control.id}" shows its state on a lens but recipe "${control.part}" ` +
            `bakes no "${control.part}__lever": there is no node for the hand to throw.`,
        })
      }
    }

    for (const container of room.containers ?? []) {
      if (!resolves(container.part)) {
        issues.push({
          severity: 'error',
          code: 'container-part-not-baked',
          message: `Container "${container.id}" uses recipe "${container.part}", which the bake does not produce.`,
        })
      }
    }

    /**
     * Devices animate or relight named nodes. A missing hand compiles, loads
     * and renders a clock that never moves; a missing lens leaves a door
     * reader that never turns green. Both are checked against the manifest.
     */
    for (const device of room.devices ?? []) {
      if (!resolves(device.part)) {
        issues.push({
          severity: 'error',
          code: 'device-part-not-baked',
          message: `Device "${device.id}" uses recipe "${device.part}", which the bake does not produce.`,
        })
        continue
      }
      // A carried radio leaves its cradle by hiding the handset's own nodes;
      // without them the whole charger would vanish, or nothing would.
      const required =
        device.kind === 'clock'
          ? ['__dial', '__hand-hour', '__hand-minute', '__hand-second']
          : device.kind === 'radio' && device.carriedOnUse
            ? ['__led', '__handset']
            : ['__led']
      for (const suffix of required) {
        if (!partNames.has(`${device.part}${suffix}`)) {
          issues.push({
            severity: 'error',
            code: 'device-node-missing',
            message: `Device "${device.id}" needs baked node "${device.part}${suffix}" for its ${device.kind} behaviour.`,
          })
        }
      }
    }
  }

  /**
   * A hub with nothing in it is a corridor with delusions.
   *
   * The atrium has no exhibits by design — it is the junction, not a gallery —
   * but that made it eighteen metres of bare plaster with two dark holes in the
   * walls, and a player spawning there had no idea a museum was involved. Any
   * room the player can stand in needs SOMETHING to look at.
   */
  for (const room of content.rooms) {
    const things =
      room.exhibitIds.length + (room.kit?.length ?? 0) + (room.containers?.length ?? 0)
    if (things === 0) {
      issues.push({
        severity: 'warning',
        code: 'room-is-empty',
        message: `Room "${room.id}" contains no exhibits, kit or containers — it is an empty box.`,
      })
    }
  }

  /**
   * Does each object actually rest on its mount?
   *
   * `position.y` is authored by hand while the mount's height comes out of the
   * bake, so the two drift the moment a plinth profile changes. The failure is
   * quiet and looks like a rendering problem: a ball hovering four centimetres
   * above its plinth, a book floating over a vitrine, or — the case that
   * prompted this check — a 1.32 m dress form standing inside a 1.23 m plinth,
   * completely swallowed by it.
   */
  const partBounds = new Map<string, BakedBoundsLike>()
  for (const bundle of bundles) {
    for (const part of bundle.parts) {
      if (part.bounds) partBounds.set(part.name, part.bounds)
    }
  }

  const topOf = (partName: string | null) =>
    partName ? (partBounds.get(partName)?.max[1] ?? null) : 0

  for (const exhibit of content.exhibits) {
    if (exhibit.mount === 'wall' || exhibit.mount === 'case-wall') continue

    const basePart = mountBasePart(exhibit.mount)
    const mountTop = exhibit.supportY ?? topOf(basePart)
    if (mountTop === null) continue

    // Recipes can be multi-part; the object's base is the lowest of them.
    const recipeBottoms = [...partBounds.entries()]
      .filter(([name]) => name === exhibit.recipe || name.startsWith(`${exhibit.recipe}__`))
      .map(([, bounds]) => bounds.min[1])
    if (recipeBottoms.length === 0) continue

    const scale = exhibit.scale ?? 1
    const expected = mountTop - Math.min(...recipeBottoms) * scale
    const actual = exhibit.position[1]
    const drift = actual - expected

    if (Math.abs(drift) > MOUNT_TOLERANCE) {
      issues.push({
        severity: 'error',
        code: 'exhibit-not-on-mount',
        message:
          `Exhibit "${exhibit.id}" sits at y=${actual.toFixed(3)} but its ${exhibit.mount} ` +
          `puts its base at y=${expected.toFixed(3)} (${drift > 0 ? 'floating' : 'sunk'} by ` +
          `${Math.abs(drift).toFixed(3)} m).`,
      })
    }

    /**
     * Where does the top of the object end up?
     *
     * A plinth being taller than the object on it is normal and correct — that
     * is what a plinth is for. What is NOT correct is the combined height
     * leaving the viewing band: museum display convention puts an object
     * roughly between waist and eye level, and anything whose crown clears
     * about 2.1 m has to be craned at.
     *
     * This is what catches a floor-standing piece given a plinth by mistake:
     * the 1.32 m dress form on a 1.23 m plinth tops out at 2.55 m, wearing its
     * gymnasium suit somewhere above the visitor's head.
     */
    const recipeTop = Math.max(
      ...[...partBounds.entries()]
        .filter(([name]) => name === exhibit.recipe || name.startsWith(`${exhibit.recipe}__`))
        .map(([, bounds]) => bounds.max[1]),
    )
    const objectHeight = (recipeTop - Math.min(...recipeBottoms)) * scale
    const displayTop = mountTop + objectHeight

    if (basePart && displayTop > 2.1) {
      issues.push({
        severity: 'error',
        code: 'exhibit-above-viewing-band',
        message:
          `Exhibit "${exhibit.id}" tops out at ${displayTop.toFixed(2)} m — a ` +
          `${objectHeight.toFixed(2)} m object on a ${mountTop.toFixed(2)} m "${basePart}". ` +
          `A floor-standing piece belongs on mount: 'floor'.`,
      })
    }
  }

  /**
   * Nothing hangs, stands or is fixed across a doorway.
   *
   * Wall art, signs, power controls, devices and kit are each placed by a
   * centre and a rotation, and a doorway is placed the same way by somebody
   * else: nothing joined the two, so a wainscot panel or a print could run
   * straight across an opening and only a screenshot would say so. A thing
   * is taken to be on a wall when it comes within arm's length of the
   * plaster; what merely lies on the floor (a rug, a brass inlay) may run
   * through a doorway, and what hangs above the door head is a sign.
   */
  const recipeBounds = (recipe: string): BakedBoundsLike | null => {
    let merged: { min: number[]; max: number[] } | null = null
    for (const [name, bounds] of partBounds) {
      if (name !== recipe && !name.startsWith(`${recipe}__`)) continue
      merged = merged
        ? {
            min: merged.min.map((value, axis) => Math.min(value, bounds.min[axis])),
            max: merged.max.map((value, axis) => Math.max(value, bounds.max[axis])),
          }
        : { min: [...bounds.min], max: [...bounds.max] }
    }
    return merged
  }
  for (const room of content.rooms) {
    const openings = room.portals.map((portal) => {
      // As in `validatePortals`: a portal sits on the wall it is nearest to.
      const onEastWest = Math.abs(Math.abs(portal.position[0]) - room.shell.width / 2) < WALL_REACH
      const across = onEastWest ? 0 : 2
      const along = onEastWest ? 2 : 0
      const side = portal.position[across] < 0 ? -1 : 1
      const half = (onEastWest ? room.shell.width : room.shell.depth) / 2
      return {
        portal,
        across,
        along,
        side,
        face: side * (half - SHELL_WALL / 2),
        from: portal.position[along] - portal.width / 2,
        to: portal.position[along] + portal.width / 2,
        sill: portal.position[1],
        head: portal.position[1] + portal.height,
      }
    })
    if (openings.length === 0) continue

    type WallItem = { readonly id: string; readonly what: string; readonly extent: BakedBoundsLike | null }
    const flat = (width: number, height: number): BakedBoundsLike => ({
      min: [-width / 2, -height / 2, 0],
      max: [width / 2, height / 2, 0.02],
    })
    const baked = (recipe: string, position: readonly number[], rotationY?: number, scale?: number) => {
      const bounds = recipeBounds(recipe)
      return bounds ? placedExtent(bounds, position, rotationY, scale) : null
    }
    const items: WallItem[] = [
      ...(room.wallArt ?? []).map((art) => ({
        id: art.id,
        what: 'Wall art',
        extent: placedExtent(flat(art.width, art.height), art.position, art.rotationY),
      })),
      ...(room.signage ?? []).flatMap((sign) =>
        sign.width && sign.height
          ? [{ id: sign.id, what: 'Sign', extent: placedExtent(flat(sign.width, sign.height), sign.position, sign.rotationY) }]
          : [],
      ),
      ...(room.devices ?? []).map((device) => ({
        id: device.id,
        what: 'Device',
        extent: baked(device.part, device.position, device.rotationY),
      })),
      ...(room.kit ?? []).map((placement) => ({
        id: `${room.id}/${placement.part}@${placement.position.join(',')}`,
        what: 'Kit placement',
        extent: baked(placement.part, placement.position, placement.rotationY, placement.scale),
      })),
    ]
    if (room.powerControl) {
      const control = room.powerControl
      items.push({
        id: control.id,
        what: 'Power control',
        extent: baked(control.part, control.position, control.rotationY, control.scale),
      })
    }

    for (const item of items) {
      const extent = item.extent
      if (!extent) continue // an unbaked recipe is reported above
      for (const opening of openings) {
        const gap =
          opening.side > 0 ? opening.face - extent.max[opening.across] : extent.min[opening.across] - opening.face
        if (gap > WALL_REACH) continue
        const run = Math.min(extent.max[opening.along], opening.to) - Math.max(extent.min[opening.along], opening.from)
        const rise = Math.min(extent.max[1], opening.head) - Math.max(extent.min[1], opening.sill)
        if (run > 0.001 && rise > FLOORING_HEIGHT) {
          issues.push({
            severity: 'error',
            code: 'wall-item-over-opening',
            id: item.id,
            message:
              `${item.what} "${item.id}" in room "${room.id}" runs ${run.toFixed(3)} m across the ` +
              `opening of portal "${opening.portal.id}", within its height. Move it clear of the doorway.`,
          })
        }
      }
    }
  }

  /**
   * Every recipe in the kit is used by something.
   *
   * The kit is one file every player downloads before the first room, and a
   * sixth of it was recipes that nothing places: generators written for a
   * layout that changed. The runtime places a few parts with no line of
   * content naming the recipe (door leaves, the plaques over doorways, the
   * support under a mounted exhibit); those count as used through the same
   * rules the runtime follows.
   */
  const kitBundle = bundleByName.get('kit')
  if (kitBundle) {
    const used = new Set<string>()
    const roomsById = new Map<string, RoomData>(content.rooms.map((room) => [room.id, room]))
    for (const room of content.rooms) {
      for (const placement of room.kit ?? []) used.add(placement.part)
      for (const container of room.containers ?? []) used.add(container.part)
      for (const device of room.devices ?? []) used.add(device.part)
      if (room.powerControl) used.add(room.powerControl.part)
      for (const placement of buildRoomSignageLayout(room, roomsById).placements) used.add(placement.part)
      for (const portal of room.portals) {
        // The leaves `TransitionDoors` hangs there: the table it reads itself.
        for (const part of portal.transitionDoor ? transitionDoorPartNames(portal.transitionDoor.style) : []) {
          used.add(part)
        }
      }
    }
    for (const exhibit of content.exhibits) {
      // What the scene draws under it, tower included: this is about what
      // is drawn, where `mountBasePart` is about what gives a height.
      for (const part of mountPartNames(exhibit.mount)) used.add(part)
    }

    const trianglesByRecipe = new Map<string, number>()
    for (const part of kitBundle.parts) {
      const recipe = part.name.split('__')[0]
      trianglesByRecipe.set(recipe, (trianglesByRecipe.get(recipe) ?? 0) + part.triangles)
    }
    for (const [recipe, triangles] of trianglesByRecipe) {
      if (used.has(recipe)) continue
      issues.push({
        severity: 'error',
        code: 'kit-part-unused',
        id: recipe,
        message:
          `Kit recipe "${recipe}" (${triangles} triangles) is baked and downloaded, and no placement, ` +
          `container, device, power control, sign, door or mount uses it.`,
      })
    }
  }

  // Unused geometry is dead weight in a bundle the player downloads. A recipe
  // used in another room does not make this room's duplicate geometry useful.
  for (const bundle of bundles) {
    if (!bundle.name.startsWith('exhibits-')) continue
    const room = content.rooms.find((candidate) => bundle.name === `exhibits-${candidate.id}`)
    const usedRecipes = new Set(
      (room?.exhibitIds ?? [])
        .map((id) => exhibitById.get(id)?.recipe)
        .filter((recipe): recipe is string => recipe !== undefined),
    )
    for (const part of bundle.parts) {
      const base = part.name.split('__')[0]
      if (!usedRecipes.has(base)) {
        issues.push({
          severity: 'warning',
          code: 'baked-part-unused',
          message:
            `Baked part "${part.name}" (${part.triangles} tris) in bundle ` +
            `"${bundle.name}" is not referenced by an exhibit in that room.`,
        })
      }
    }
  }

  return issues
}

/**
 * Wall-mounted exhibits are actually on the wall, and facing into the room.
 *
 * `shell.width` is the room's INSIDE dimension, so the plaster a picture hangs
 * on is at width/2 minus half a wall — 0.125 m, not the 0.30 m the first two
 * wall exhibits were authored against. Both hung 175 mm out in mid-air, and a
 * frame floating a hand's width off the wall is the kind of thing you stop
 * seeing after the tenth screenshot.
 *
 * Facing matters as much as position: a frame's normal is (sin y, 0, cos y),
 * and a picture on the east wall with rotationY 0 renders inside the plaster.
 */
export function validateWallMounts(content: MuseumContent): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const WALL = 0.25
  /** Frames are ~64 mm deep, so their origin sits within this of the face. */
  const TOLERANCE = 0.06

  for (const room of content.rooms) {
    const inset = WALL / 2
    const faces = [
      { axis: 0 as const, at: -(room.shell.width / 2 - inset), facing: Math.PI / 2 },
      { axis: 0 as const, at: room.shell.width / 2 - inset, facing: -Math.PI / 2 },
      { axis: 2 as const, at: -(room.shell.depth / 2 - inset), facing: 0 },
      { axis: 2 as const, at: room.shell.depth / 2 - inset, facing: Math.PI },
    ]

    for (const exhibitId of room.exhibitIds) {
      const exhibit = content.exhibits.find((candidate) => candidate.id === exhibitId)
      if (!exhibit || exhibit.mount !== 'wall') continue

      let best = faces[0]
      let bestGap = Infinity
      for (const face of faces) {
        const gap = Math.abs(exhibit.position[face.axis] - face.at)
        if (gap < bestGap) {
          bestGap = gap
          best = face
        }
      }

      if (bestGap > TOLERANCE) {
        issues.push({
          severity: 'error',
          code: 'wall-exhibit-off-the-wall',
          message:
            `Exhibit "${exhibit.id}" is mounted on a wall but sits ${bestGap.toFixed(3)} m from ` +
            `the nearest plaster face in room "${room.id}". The inner faces of a ` +
            `${room.shell.width} x ${room.shell.depth} shell are at ` +
            `${(room.shell.width / 2 - inset).toFixed(3)} and ` +
            `${(room.shell.depth / 2 - inset).toFixed(3)}.`,
        })
        continue
      }

      const facing = exhibit.rotationY ?? 0
      // Compare direction vectors rather than angles, so PI and -PI agree.
      const drift = Math.hypot(
        Math.sin(facing) - Math.sin(best.facing),
        Math.cos(facing) - Math.cos(best.facing),
      )
      if (drift > 0.1) {
        issues.push({
          severity: 'error',
          code: 'wall-exhibit-faces-the-wall',
          message:
            `Exhibit "${exhibit.id}" hangs on the wall at ` +
            `${best.axis === 0 ? 'x' : 'z'} = ${best.at.toFixed(3)} but its rotationY of ` +
            `${facing.toFixed(3)} points it away from the room. That wall needs ` +
            `${best.facing.toFixed(3)}.`,
        })
      }
    }
  }

  return issues
}

/**
 * Every doorway exists on both sides of its wall, at the same place.
 *
 * A portal is not a link in a graph; it is the thing that punches a hole in a
 * baked wall. Two rooms therefore have to agree, and nothing made them. They
 * did not agree, and the result was a museum with three rooms and no way out
 * of the first one: each room's opening was real and each one faced solid
 * plaster, because the neighbour had put its hole somewhere else — or, for the
 * Holyoke shortcut, had never declared one at all.
 *
 * The rule also checks the wall sandwich, since two rooms whose shells do not
 * touch have a void between them that no floor slab reaches.
 */
export function validatePortals(content: MuseumContent): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const rooms = new Map(content.rooms.map((room) => [room.id, room]))

  /** Wall thickness in the bake. A shared wall is two of these, back to back. */
  const WALL = 0.25
  const TOLERANCE = 1e-6

  const toWorld = (room: RoomData, position: readonly [number, number, number]) => [
    room.origin[0] + position[0],
    room.origin[1] + position[1],
    room.origin[2] + position[2],
  ]

  for (const room of content.rooms) {
    for (const portal of room.portals) {
      const target = rooms.get(portal.toRoom)
      if (!target) continue // validateReferences already reports this

      const here = toWorld(room, portal.position)

      // The opening's own axis: a portal sits on the wall it is nearest to.
      const onEastWest = Math.abs(Math.abs(portal.position[0]) - room.shell.width / 2) < 0.35
      const axis = onEastWest ? 0 : 2
      const along = onEastWest ? 2 : 0

      const match = target.portals.find((candidate) => {
        if (candidate.toRoom !== room.id) return false
        const there = toWorld(target, candidate.position)
        // Same position along the wall, and facing each other across it.
        return (
          Math.abs(there[along] - here[along]) < TOLERANCE &&
          Math.abs(Math.abs(there[axis] - here[axis]) - WALL) < 0.01 &&
          candidate.width === portal.width &&
          candidate.height === portal.height
        )
      })

      if (match) continue

      const facing = target.portals.filter((candidate) => candidate.toRoom === room.id)
      issues.push({
        severity: 'error',
        code: 'portal-not-reciprocal',
        message:
          `Portal "${portal.id}" opens a ${portal.width}x${portal.height} hole in room ` +
          `"${room.id}" at world [${here.map((n) => n.toFixed(3)).join(', ')}], but room ` +
          `"${target.id}" has no matching opening there. ` +
          (facing.length === 0
            ? `"${target.id}" declares no portal back to "${room.id}" at all — the doorway ` +
              `leads into solid wall.`
            : `Its candidates are at ${facing
                .map((candidate) => {
                  const there = toWorld(target, candidate.position)
                  return `"${candidate.id}" [${there.map((n) => n.toFixed(3)).join(', ')}]`
                })
                .join(', ')}. Two facing openings must share the along-wall coordinate and be ` +
              `exactly ${WALL} m apart across it.`),
      })
    }
  }

  /**
   * No two rooms occupy the same ground.
   *
   * A shell's walls straddle its outline, so its footprint reaches half a
   * wall beyond it, and two neighbours stand back to back: their footprints
   * touch and overlap by nothing. An origin typed a metre out puts one room's
   * floor, walls and colliders inside the other's, and every check above
   * still passes for the rooms taken one at a time. Rooms on different
   * storeys may stand over one another, so the heights have to overlap too.
   */
  const footprint = (room: RoomData) => ({
    min: [
      room.origin[0] - room.shell.width / 2 - WALL / 2,
      room.origin[1],
      room.origin[2] - room.shell.depth / 2 - WALL / 2,
    ],
    max: [
      room.origin[0] + room.shell.width / 2 + WALL / 2,
      room.origin[1] + room.shell.height,
      room.origin[2] + room.shell.depth / 2 + WALL / 2,
    ],
  })
  const OVERLAP = 1e-4
  content.rooms.forEach((room, index) => {
    const a = footprint(room)
    for (const other of content.rooms.slice(index + 1)) {
      const b = footprint(other)
      const shared = [0, 1, 2].map((axis) => Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]))
      if (shared.every((length) => length > OVERLAP)) {
        issues.push({
          severity: 'error',
          code: 'room-overlap',
          id: [room.id, other.id].sort().join('+'),
          message:
            `Rooms "${room.id}" and "${other.id}" overlap by ${shared[0].toFixed(3)} x ` +
            `${shared[2].toFixed(3)} m in plan (walls included). Neighbours share a wall: ` +
            `their footprints touch, and overlap by nothing.`,
        })
      }
    }
  })

  return issues
}

/**
 * Every `…Key` in the content set resolves to a real dictionary entry.
 *
 * The schema types these as plain `string` because `schema.ts` cannot import
 * the dictionary without a cycle, which means a typo in `titleKey` compiles
 * cleanly and ships as a blank plaque — the exact failure class as content that
 * is declared and never rendered, and just as invisible from inside the code.
 *
 * pt-BR is the only dictionary checked because `en.ts` is typed against it, so
 * the compiler already guarantees the two have identical key sets.
 */
export function validateTranslations(
  content: MuseumContent,
  keys: ReadonlySet<string>,
  /**
   * The keys the code cites by hand (`t('prompt.examine')`), found by the gate
   * script reading `src/`. With them the rule runs the other way too: a key
   * neither the content nor the code cites is `i18n-key-unused`. Without them
   * only the first direction is checked.
   */
  keysCitedByCode?: ReadonlySet<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const seen = new Set<string>()
  const citedByContent = new Set<string>()

  const require = (key: string | undefined, where: string) => {
    if (!key || seen.has(`${key} ${where}`)) return
    seen.add(`${key} ${where}`)
    citedByContent.add(key)
    if (keys.has(key)) return
    issues.push({
      severity: 'error',
      code: 'missing-translation',
      message: `${where} references translation key "${key}", which is not in pt-BR.`,
    })
  }

  // Walks anything shaped like content and requires every property whose name
  // ends in "Key", and every string in a list whose name ends in "Keys" (a
  // radio call's lines). Structural rather than field-by-field on purpose: a
  // rule that enumerates today's fields silently stops covering tomorrow's.
  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`))
      return
    }
    if (!node || typeof node !== 'object') return
    for (const [field, value] of Object.entries(node as Record<string, unknown>)) {
      if (field.endsWith('Key') && typeof value === 'string') require(value, path)
      else if (field.endsWith('Keys') && Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'string') require(item, `${path}.${field}[${index}]`)
        })
      } else walk(value, `${path}.${field}`)
    }
  }

  // Every collection, not a list of today's: the facts were once missing from
  // that list, so a typo in the office drawer's question passed the gate and
  // would have shown an empty paragraph on its keypad.
  for (const [collection, value] of Object.entries(content)) walk(value, collection)

  // The other direction: copy that is written, translated and shown nowhere.
  // It costs a translation every time the neighbouring line changes, and it
  // reads as a feature the game has (a settings screen, a hint ladder).
  if (keysCitedByCode) {
    for (const key of keys) {
      if (citedByContent.has(key) || keysCitedByCode.has(key)) continue
      issues.push({
        severity: 'error',
        code: 'i18n-key-unused',
        id: key,
        message: `Translation key "${key}" is cited by neither the content nor the code: nothing shows it.`,
      })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// What is said aloud
// ---------------------------------------------------------------------------

type Dictionaries = Readonly<Record<string, Readonly<Record<string, string>>>>

/**
 * Compass words, whole, by language. The player has no compass and the map
 * has no north arrow, so "the west wall" names nothing they can find.
 */
const CARDINAL_WORDS: Record<string, RegExp> = {
  'pt-BR': /(?<![\p{L}\p{N}])(?:norte|sul|leste|oeste|nordeste|noroeste|sudeste|sudoeste)(?![\p{L}\p{N}])/iu,
  en: /(?<![\p{L}\p{N}])(?:north|south|east|west)(?:-?(?:east|west))?(?:ern|wards?)?(?![\p{L}\p{N}])/iu,
}

/** Every dictionary key a radio can say: calls, hints in both tempers, the porter's patience, dead air. */
function spokenKeys(content: MuseumContent): Set<string> {
  const keys = new Set<string>()
  for (const room of content.rooms) {
    for (const device of room.devices ?? []) {
      if (device.kind !== 'radio') continue
      for (const call of device.calls) for (const key of call.lineKeys) keys.add(key)
      for (const hint of device.hints) {
        for (const key of [...hint.lineKeys, ...(hint.curtLineKeys ?? [])]) keys.add(key)
      }
      const patience = device.patience
      if (!patience) continue
      const replies = [...patience.tiers.flatMap((tier) => tier.replies), ...(patience.praise ?? []), ...patience.deadAir]
      for (const reply of replies) {
        for (const key of [...reply.lineKeys, ...(reply.closingKeys ?? [])]) keys.add(key)
      }
      for (const outburst of patience.tiers.flatMap((tier) => tier.outbursts ?? [])) {
        for (const key of outburst.lineKeys) keys.add(key)
      }
    }
  }
  return keys
}

/**
 * Rules about the words themselves, in every language they are said in.
 *
 * `validateTranslations` proves a line exists; this reads it. A direction
 * given over the radio is the one piece of copy the player acts on at once
 * and in the dark, so it has to be relative to something they can see: a
 * door, a light, the side they came in by.
 */
export function validateSpeech(content: MuseumContent, dictionaries: Dictionaries): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const key of spokenKeys(content)) {
    for (const [locale, dictionary] of Object.entries(dictionaries)) {
      const text = dictionary[key]
      if (text === undefined) continue // missing-translation reports this
      // A language with no list of its own is read against every list.
      const lists = CARDINAL_WORDS[locale] ? [CARDINAL_WORDS[locale]] : Object.values(CARDINAL_WORDS)
      const bearing = lists.map((list) => list.exec(text)?.[0]).find((word) => word !== undefined)
      if (bearing === undefined) continue
      issues.push({
        severity: 'error',
        code: 'speech-uses-cardinal',
        id: key,
        message:
          `Radio line "${key}" (${locale}) says "${bearing}". The player has no compass: ` +
          `say it by a door, a light or the side they came in by.`,
      })
    }
  }
  return issues
}

// ---------------------------------------------------------------------------

/** What only the gate script can supply; a test supplies its own. */
export type ContentGateExtras = {
  /**
   * Every dictionary, by locale: what is said and what is printed are read in
   * each language (`validateSpeech`, and `validateText` in `textLint.ts`).
   */
  readonly dictionaries?: Dictionaries
  /**
   * The words drawn in the authored images, by media id: a code lettered on
   * a plan is as printed as one on a label. The gate script reads the files;
   * without it only the dictionaries and the credit lines are read.
   */
  readonly mediaTexts?: Readonly<Record<string, readonly string[]>>
  /** Dictionary keys the code cites by hand; see `validateTranslations`. */
  readonly keysCitedByCode?: ReadonlySet<string>
  /**
   * The dated debts this gate collects and the lot the content stands at.
   * Without it every accusation is an error, which is what a test wants.
   */
  readonly knownDebt?: { readonly lines: readonly KnownDebt[]; readonly lot: number }
  /**
   * The graph the last lot wrote down as it closed (`docs/releases`). With
   * it the content is held to having taken nothing away since
   * (`validateAdditive`); without it nothing is compared.
   */
  readonly previousGraph?: GraphSnapshot
}

export function validateContent(
  content: MuseumContent,
  bundles?: readonly BakedBundleLike[],
  translationKeys?: ReadonlySet<string>,
  /**
   * The fact bank and what was read of it. Passed in, like the bake and the
   * dictionary, so that this module stays free of the capture data: the gate
   * script supplies the committed files, a test supplies its own.
   */
  captures?: FactCaptureSet,
  extras: ContentGateExtras = {},
): ValidationIssue[] {
  const issues = [
    ...validateReferences(content),
    ...validatePower(content),
    ...validateFacts(content.facts),
    ...(captures ? validateFactCaptures(content.facts, captures) : []),
    ...validateAttribution(content),
    ...simulateProgress(content).issues,
    ...validateOpening(content),
    ...validateTriggers(content),
    ...validatePortals(content),
    ...validateWallMounts(content),
    ...validatePacing(content),
    ...(bundles ? validateBake(content, bundles) : []),
    ...(translationKeys ? validateTranslations(content, translationKeys, extras.keysCitedByCode) : []),
    ...(extras.dictionaries ? validateSpeech(content, extras.dictionaries) : []),
    ...(extras.dictionaries
      ? validateText(content, extras.dictionaries, extras.mediaTexts ? { mediaTexts: extras.mediaTexts } : {})
      : []),
    ...(extras.previousGraph ? validateAdditive(extras.previousGraph, content) : []),
  ]
  return extras.knownDebt
    ? settleKnownDebt(issues, extras.knownDebt.lines, extras.knownDebt.lot)
    : issues
}

/** Errors and warnings, one per line; debts are printed apart, by `formatKnownDebt`. */
export function formatIssues(issues: readonly ValidationIssue[]): string {
  const shown = issues.filter((issue) => issue.severity !== 'debt')
  if (shown.length === 0) return 'content OK'
  return shown
    .map((issue) => `  ${issue.severity === 'error' ? 'ERROR' : 'warn '}  [${issue.code}] ${issue.message}`)
    .join('\n')
}

/**
 * The table of what is owed, soonest first. Printed on every run of the gate,
 * so a debt cannot be forgotten by being quiet.
 */
export function formatKnownDebt(issues: readonly ValidationIssue[]): string {
  const owed = issues.flatMap((issue) => (issue.severity === 'debt' && issue.debt ? [{ issue, debt: issue.debt }] : []))
  if (owed.length === 0) return ''
  const sorted = [...owed].sort(
    (a, b) =>
      a.debt.untilLot - b.debt.untilLot ||
      a.issue.code.localeCompare(b.issue.code) ||
      (a.issue.id ?? '').localeCompare(b.issue.id ?? ''),
  )
  const codeWidth = Math.max(...sorted.map(({ issue }) => issue.code.length))
  const idWidth = Math.max(...sorted.map(({ issue }) => (issue.id ?? '').length))
  return sorted
    .map(
      ({ issue, debt }) =>
        `  until L${String(debt.untilLot).padEnd(2)}  ${issue.code.padEnd(codeWidth)}  ` +
        `${(issue.id ?? '').padEnd(idWidth)}  ${debt.note}`,
    )
    .join('\n')
}

export type { RoomData }
