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

import { validateFactCaptures, type FactCaptureSet } from './factCapture.ts'
import { PRE_OPENING_SAVE } from './legacySave.ts'
import type {
  Credential,
  DeviceData,
  Fact,
  Lock,
  MuseumContent,
  ProgressCondition,
  RoomData,
} from './schema'

export type ValidationIssue = {
  readonly severity: 'error' | 'warning'
  readonly code: string
  readonly message: string
}

/** The player's physical radius; a spawn must leave this much clear floor. */
const SPAWN_CLEARANCE = 0.3

function credentialKey(credential: Credential): string {
  return `${credential.kind}:${credential.id}`
}

/**
 * A lock's requirements expressed as the credential keys that satisfy it.
 * Knowledge and ritual locks are satisfied by information, not inventory, so
 * they resolve through the fact set instead.
 */
function lockCredentialKeys(lock: Lock): readonly string[] {
  switch (lock.kind) {
    case 'badge':
      return [`badge:${lock.requires}`]
    case 'medallion-plinth':
      return lock.requires.map((id) => `medallion:${id}`)
    case 'tool':
      return [`tool:${lock.requires}`]
    case 'knowledge':
    case 'ritual':
      return []
  }
}

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
    for (const effect of exhibit.unlocks ?? []) {
      if (effect.kind === 'power-room' && !roomIds.has(effect.roomId)) {
        error(
          'power-effect-room-missing',
          `Exhibit "${exhibit.id}" powers unknown room "${effect.roomId}".`,
        )
      }
      if (effect.kind === 'open-lock' && !lockIds.has(effect.lockId)) {
        error(
          'open-effect-lock-missing',
          `Exhibit "${exhibit.id}" opens unknown lock "${effect.lockId}".`,
        )
      }
      if (effect.kind === 'reveal-document' && !documentIds.has(effect.documentId)) {
        error(
          'reveal-effect-document-missing',
          `Exhibit "${exhibit.id}" reveals unknown document "${effect.documentId}".`,
        )
      }
    }
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
  }

  return issues
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
// Lock-graph solvability
// ---------------------------------------------------------------------------

/**
 * The check worth more than every other test in the project.
 *
 * Simulates a maximally thorough player: repeatedly walk everything currently
 * reachable, collect every credential and every fact it yields, then walk again
 * with the larger keyring. If the fixpoint does not cover the whole museum,
 * something is gated behind itself.
 *
 * Also enforces the design rule that makes knowledge locks fair: the exhibit
 * that teaches a code must be reachable strictly BEFORE the lock that demands
 * it, never behind it.
 */
export function validateSolvability(content: MuseumContent): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  // Keyed by plain string: the traversal works with ids pulled off portals and
  // out of the queue, and narrowing every one of those back to EraId buys
  // nothing here — the referential-integrity pass already proved they resolve.
  const roomsById = new Map<string, RoomData>(content.rooms.map((room) => [room.id, room]))
  const locksById = new Map(content.locks.map((lock) => [lock.id, lock]))
  const exhibitsById = new Map(content.exhibits.map((exhibit) => [exhibit.id, exhibit]))
  const START_ROOM: string = content.spawn.room

  if (!roomsById.has(START_ROOM)) {
    return [{
      severity: 'error',
      code: 'no-start-room',
      message: `The museum has no "${START_ROOM}" room to start from.`,
    }]
  }

  /**
   * Electric locks, keyed by both portal endpoints of the one opening. A door
   * is authored on one side only, so the requirement has to bind the
   * reciprocal portal too — otherwise the walk would simply leave by it — but
   * only that one: a second doorway between the same two rooms stays free.
   * The reciprocal is matched exactly as the runtime topology matches it.
   */
  const endpointKey = (roomId: string, portalId: string) => `${roomId}:${portalId}`
  const powerLockedPortals = new Map<string, string>()
  for (const room of content.rooms) {
    for (const portal of room.portals) {
      const required = portal.transitionDoor?.requiresPower
      if (!required) continue
      powerLockedPortals.set(endpointKey(room.id, portal.id), required)

      const target = roomsById.get(portal.toRoom)
      const reciprocal = target?.portals.find(
        (candidate) =>
          candidate.toRoom === room.id &&
          Math.abs(candidate.width - portal.width) < 1e-6 &&
          Math.abs(candidate.height - portal.height) < 1e-6 &&
          Math.hypot(
            target.origin[0] + candidate.position[0] - (room.origin[0] + portal.position[0]),
            target.origin[1] + candidate.position[1] - (room.origin[1] + portal.position[1]),
            target.origin[2] + candidate.position[2] - (room.origin[2] + portal.position[2]),
          ) < 0.35,
      )
      if (target && reciprocal) {
        powerLockedPortals.set(endpointKey(target.id, reciprocal.id), required)
      }
    }
  }

  const heldCredentials = new Set<string>()
  const knownFacts = new Set<string>()
  const reachableRooms = new Set<string>()
  /** roomId -> the pass number on which it first became reachable. */
  const roomDiscoveredOn = new Map<string, number>()

  const lockIsOpen = (lockId: string | undefined): boolean => {
    if (!lockId) return true
    const lock = locksById.get(lockId)
    if (!lock) return false

    if (lock.kind === 'knowledge') return knownFacts.has(lock.factId)
    // Ritual locks are solved by in-room manipulation, so reaching the room is
    // sufficient for a reachability proof.
    if (lock.kind === 'ritual') return true

    return lockCredentialKeys(lock).every((key) => heldCredentials.has(key))
  }

  const walk = (pass: number) => {
    const queue: string[] = [START_ROOM]
    const seen = new Set<string>([START_ROOM])

    // A room has power once the player can stand at its control: reached, and
    // with any lock on that control opened.
    const hasPower = (roomId: string) => {
      const room = roomsById.get(roomId)
      if (!room) return false
      if (room.startsPowered) return true
      return (seen.has(roomId) || reachableRooms.has(roomId)) && lockIsOpen(room.powerLockId)
    }

    while (queue.length > 0) {
      const roomId = queue.shift() as string
      if (!reachableRooms.has(roomId)) {
        reachableRooms.add(roomId)
        roomDiscoveredOn.set(roomId, pass)
      }

      const room = roomsById.get(roomId)
      if (!room) continue

      for (const portal of room.portals) {
        // One-way-ness is expressed by the ABSENCE of a reciprocal portal in
        // the target room, not by blocking this direction: the shortcut is
        // barred from the hub side and opens from inside the wing, which is
        // the direction declared here.
        if (!lockIsOpen(portal.lockId)) continue
        const required = powerLockedPortals.get(endpointKey(roomId, portal.id))
        if (required && !hasPower(required)) continue
        if (seen.has(portal.toRoom)) continue
        seen.add(portal.toRoom)
        queue.push(portal.toRoom)
      }
    }
  }

  const harvest = (): number => {
    let gained = 0

    for (const roomId of reachableRooms) {
      const room = roomsById.get(roomId)
      if (!room) continue

      for (const exhibitId of room.exhibitIds) {
        const exhibit = exhibitsById.get(exhibitId)
        if (!exhibit) continue

        for (const hotspot of exhibit.hotspots) {
          if (hotspot.revealsFactId && !knownFacts.has(hotspot.revealsFactId)) {
            knownFacts.add(hotspot.revealsFactId)
            gained += 1
          }
        }

        for (const effect of exhibit.unlocks ?? []) {
          if (effect.kind === 'grant-credential') {
            const key = credentialKey(effect.credential)
            if (!heldCredentials.has(key)) {
              heldCredentials.add(key)
              gained += 1
            }
          }
        }
      }

      for (const documentId of room.documentIds) {
        const doc = content.documents.find((candidate) => candidate.id === documentId)
        if (!doc) continue
        if (!lockIsOpen(doc.lockId)) continue
        if (doc.revealsFactId && !knownFacts.has(doc.revealsFactId)) {
          knownFacts.add(doc.revealsFactId)
          gained += 1
        }
      }
    }

    return gained
  }

  // Fixpoint: walk, harvest, repeat until a pass yields nothing new.
  const MAX_PASSES = 32
  let pass = 0
  for (; pass < MAX_PASSES; pass += 1) {
    const before = reachableRooms.size
    walk(pass)
    const gained = harvest()
    if (reachableRooms.size === before && gained === 0) break
  }

  if (pass >= MAX_PASSES) {
    issues.push({
      severity: 'error',
      code: 'solvability-no-fixpoint',
      message: `Lock graph did not converge in ${MAX_PASSES} passes — likely a dependency cycle.`,
    })
  }

  for (const room of content.rooms) {
    if (!reachableRooms.has(room.id)) {
      issues.push({
        severity: 'error',
        code: 'room-unreachable',
        message: `Room "${room.id}" is never reachable, even by a player who examines everything.`,
      })
    }
  }

  for (const lock of content.locks) {
    if (!lockIsOpen(lock.id)) {
      issues.push({
        severity: 'error',
        code: 'lock-unopenable',
        message: `Lock "${lock.id}" can never be opened — its credential or fact is unobtainable.`,
      })
    }
  }

  // Show the lock long before the key: the exhibit teaching a code must be
  // reachable no later than the room the lock gates. Reverse foreshadowing
  // turns exploration into a brute-force sweep.
  for (const lock of content.locks) {
    if (lock.kind !== 'knowledge') continue
    const source = exhibitsById.get(lock.sourceExhibitId)
    if (!source) continue

    const sourceRoom = content.rooms.find((room) => room.exhibitIds.includes(source.id))
    const gatedRooms = content.rooms.filter((room) =>
      room.portals.some((portal) => portal.lockId === lock.id),
    )
    if (!sourceRoom) continue

    const sourcePass = roomDiscoveredOn.get(sourceRoom.id) ?? Number.POSITIVE_INFINITY
    for (const gated of gatedRooms) {
      const gatedPass = roomDiscoveredOn.get(gated.id) ?? Number.POSITIVE_INFINITY
      if (sourcePass > gatedPass) {
        issues.push({
          severity: 'error',
          code: 'lock-source-behind-lock',
          message: `Knowledge lock "${lock.id}" is taught by exhibit "${source.id}" in room "${sourceRoom.id}", which is only reachable after the room it gates.`,
        })
      }
    }
  }

  // An unmatched credential is bookkeeping the player will never resolve.
  const consumedCredentials = new Set(content.locks.flatMap(lockCredentialKeys))
  for (const exhibit of content.exhibits) {
    for (const effect of exhibit.unlocks ?? []) {
      if (effect.kind !== 'grant-credential') continue
      const key = credentialKey(effect.credential)
      if (!consumedCredentials.has(key)) {
        issues.push({
          severity: 'warning',
          code: 'credential-orphan',
          message: `Exhibit "${exhibit.id}" grants "${key}" but no lock requires it.`,
        })
      }
    }
  }

  return issues
}

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
  const error = (code: string, message: string) =>
    issues.push({ severity: 'error', code, message })
  const warning = (code: string, message: string) =>
    issues.push({ severity: 'warning', code, message })
  const roomIds = new Set<string>(content.rooms.map((room) => room.id))
  const lockIds = new Set(content.locks.map((lock) => lock.id))
  const documentIds = new Set(content.documents.map((doc) => doc.id))
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
  const checkCondition = (condition: ProgressCondition, where: string) => {
    for (const roomId of [...(condition.powered ?? []), ...(condition.unpowered ?? [])]) {
      if (!roomIds.has(roomId)) error('condition-room-missing', `${where} names unknown room "${roomId}".`)
    }
    for (const lockId of [...(condition.locksOpened ?? []), ...(condition.locksClosed ?? [])]) {
      if (!lockIds.has(lockId)) error('condition-lock-missing', `${where} names unknown lock "${lockId}".`)
    }
    for (const documentId of [...(condition.documentsRead ?? []), ...(condition.documentsUnread ?? [])]) {
      if (!documentIds.has(documentId)) {
        error('condition-document-missing', `${where} names unknown document "${documentId}".`)
      }
    }
    for (const deviceId of condition.carried ?? []) {
      if (!carriableIds.has(deviceId)) {
        error(
          'condition-device-missing',
          `${where} waits for device "${deviceId}" to be carried, but no device with \`carriedOnUse\` has that id.`,
        )
      }
    }
  }

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

  return issues
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
 * Which baked part sits under each mount type, and therefore how high its top
 * surface is. Must mirror the MOUNTS table the scene uses.
 */
const MOUNT_BASE_PART: Record<string, string | null> = {
  plinth: 'plinth-block',
  'vitrine-table': 'vitrine-table',
  // Tower cases and built-in shelves expose an internal deck, not their top.
  // Those exhibits declare supportY from the procedural recipe's datum.
  'vitrine-tower': null,
  wall: null,
  floor: null,
}

/** Objects may sit this far off their mount before it reads as a mistake. */
const MOUNT_TOLERANCE = 0.015

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

    const basePart = MOUNT_BASE_PART[exhibit.mount] ?? null
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
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const seen = new Set<string>()

  const require = (key: string | undefined, where: string) => {
    if (!key || seen.has(`${key} ${where}`)) return
    seen.add(`${key} ${where}`)
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

  return issues
}

// ---------------------------------------------------------------------------

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
): ValidationIssue[] {
  return [
    ...validateReferences(content),
    ...validatePower(content),
    ...validateFacts(content.facts),
    ...(captures ? validateFactCaptures(content.facts, captures) : []),
    ...validateAttribution(content),
    ...validateSolvability(content),
    ...validateOpening(content),
    ...validatePortals(content),
    ...validateWallMounts(content),
    ...validatePacing(content),
    ...(bundles ? validateBake(content, bundles) : []),
    ...(translationKeys ? validateTranslations(content, translationKeys) : []),
  ]
}

export function formatIssues(issues: readonly ValidationIssue[]): string {
  if (issues.length === 0) return 'content OK'
  return issues
    .map((issue) => `  ${issue.severity === 'error' ? 'ERROR' : 'warn '}  [${issue.code}] ${issue.message}`)
    .join('\n')
}

export type { RoomData }
