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

import type {
  Credential,
  Fact,
  Lock,
  MuseumContent,
  RoomData,
} from './schema'

export type ValidationIssue = {
  readonly severity: 'error' | 'warning'
  readonly code: string
  readonly message: string
}

const START_ROOM = 'atrium'

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
  const roomIds = new Set(content.rooms.map((room) => room.id))
  const exhibitIds = new Set(content.exhibits.map((exhibit) => exhibit.id))
  const documentIds = new Set(content.documents.map((doc) => doc.id))
  const lockIds = new Set(content.locks.map((lock) => lock.id))
  const factIds = new Set(content.facts.map((fact) => fact.id))
  const mediaIds = new Set(content.media.map((asset) => asset.id))

  const error = (code: string, message: string) =>
    issues.push({ severity: 'error', code, message })

  for (const room of content.rooms) {
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
    if (room.powerLockId && !lockIds.has(room.powerLockId)) {
      error('power-lock-missing', `Room "${room.id}" power lock "${room.powerLockId}" does not exist.`)
    }
  }

  for (const exhibit of content.exhibits) {
    if (exhibit.mediaId && !mediaIds.has(exhibit.mediaId)) {
      error('media-missing', `Exhibit "${exhibit.id}" references unknown media "${exhibit.mediaId}".`)
    }
    for (const hotspot of exhibit.hotspots) {
      if (hotspot.revealsFactId && !factIds.has(hotspot.revealsFactId)) {
        error('fact-missing', `Exhibit "${exhibit.id}" hotspot "${hotspot.id}" reveals unknown fact "${hotspot.revealsFactId}".`)
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

  if (!roomsById.has(START_ROOM)) {
    return [{
      severity: 'error',
      code: 'no-start-room',
      message: `The museum has no "${START_ROOM}" room to start from.`,
    }]
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
  'vitrine-tower': 'plinth-tapered',
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

  const resolves = (recipe: string) =>
    partNames.has(recipe) || [...partNames].some((name) => name.startsWith(`${recipe}__`))

  for (const exhibit of content.exhibits) {
    if (!resolves(exhibit.recipe)) {
      issues.push({
        severity: 'error',
        code: 'recipe-not-baked',
        message: `Exhibit "${exhibit.id}" needs recipe "${exhibit.recipe}", which the bake does not produce. Add it to scripts/bake.mjs or the plinth ships empty.`,
      })
    }
  }

  for (const room of content.rooms) {
    if (!bundles.some((bundle) => bundle.name === `room-${room.id}`)) {
      issues.push({
        severity: 'error',
        code: 'room-shell-not-baked',
        message: `Room "${room.id}" has no baked shell bundle ("room-${room.id}").`,
      })
    }

    /**
     * Kit placements and container furniture name baked parts too, and until
     * this check existed only EXHIBIT recipes were verified. A room could ask
     * for a bench nobody generated and simply render without one — which is
     * exactly how the atrium ended up an empty box for as long as it did.
     */
    for (const placement of room.kit ?? []) {
      if (!partNames.has(placement.part)) {
        issues.push({
          severity: 'error',
          code: 'kit-part-not-baked',
          message: `Room "${room.id}" places kit part "${placement.part}", which the bake does not produce.`,
        })
      }
    }

    for (const container of room.containers ?? []) {
      if (!partNames.has(container.part)) {
        issues.push({
          severity: 'error',
          code: 'container-part-not-baked',
          message: `Container "${container.id}" uses part "${container.part}", which the bake does not produce.`,
        })
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
    if (exhibit.mount === 'wall') continue

    const basePart = MOUNT_BASE_PART[exhibit.mount] ?? null
    const mountTop = topOf(basePart)
    if (mountTop === null) continue

    // Recipes can be multi-part; the object's base is the lowest of them.
    const recipeBottoms = [...partBounds.entries()]
      .filter(([name]) => name === exhibit.recipe || name.startsWith(`${exhibit.recipe}__`))
      .map(([, bounds]) => bounds.min[1])
    if (recipeBottoms.length === 0) continue

    const expected = mountTop - Math.min(...recipeBottoms)
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
    const objectHeight = recipeTop - Math.min(...recipeBottoms)
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

  // Unused geometry is dead weight in a bundle the player downloads.
  const usedRecipes = new Set(content.exhibits.map((exhibit) => exhibit.recipe))
  for (const bundle of bundles) {
    if (!bundle.name.startsWith('exhibits-')) continue
    for (const part of bundle.parts) {
      const base = part.name.split('__')[0]
      if (!usedRecipes.has(base)) {
        issues.push({
          severity: 'warning',
          code: 'baked-part-unused',
          message: `Baked part "${part.name}" (${part.triangles} tris) is not referenced by any exhibit.`,
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
  // ends in "Key". Structural rather than field-by-field on purpose: a rule
  // that enumerates today's fields silently stops covering tomorrow's.
  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`))
      return
    }
    if (!node || typeof node !== 'object') return
    for (const [field, value] of Object.entries(node as Record<string, unknown>)) {
      if (field.endsWith('Key') && typeof value === 'string') require(value, path)
      else walk(value, `${path}.${field}`)
    }
  }

  walk(content.rooms, 'rooms')
  walk(content.exhibits, 'exhibits')
  walk(content.documents, 'documents')
  walk(content.locks, 'locks')

  return issues
}

// ---------------------------------------------------------------------------

export function validateContent(
  content: MuseumContent,
  bundles?: readonly BakedBundleLike[],
  translationKeys?: ReadonlySet<string>,
): ValidationIssue[] {
  return [
    ...validateReferences(content),
    ...validateFacts(content.facts),
    ...validateAttribution(content),
    ...validateSolvability(content),
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
