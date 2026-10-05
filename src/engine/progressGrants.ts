/**
 * What each verb of the player records.
 *
 * A verb is a pure function that hands back a grant, and the store has one
 * door for grants (`grant`). The component that hears the key press decides
 * nothing about the save: it calls the verb and passes on what it gets. That
 * is what lets Node play the game. The suites, the playthrough robot and the
 * content gate's simulation call these same functions, not copies of what a
 * `useFrame` used to do.
 *
 * A verb records what the player DID. What follows from it (a catalogued
 * piece that hands over a key) is a trigger (`triggers.ts`), which fires
 * once; a verb that applied the consequence itself would apply it again every
 * time the verb ran.
 *
 * Types only: nothing here runs anything but itself.
 */

import type { ExhibitData, MuseumContent } from '../content/schema'
import type { ProgressGrant } from '../state/progressFields.ts'
import type { TransitionDoorSpec } from './transitionDoorTopology.ts'

/**
 * A detail of a piece, seen: the detail, the fact it reveals and, once every
 * required detail has been seen, the catalogue entry.
 *
 * `hotspotsSeen` is the save's own list, so details seen on another night
 * count. A piece with nothing required is catalogued by its first detail, as
 * it always was. The piece's `unlocks` are not here on purpose (S11): they
 * used to be applied with every detail seen after the required ones.
 */
export function hotspotGrant(exhibit: ExhibitData, hotspotId: string, hotspotsSeen: readonly string[]): ProgressGrant {
  const hotspot = exhibit.hotspots.find((candidate) => candidate.id === hotspotId)
  if (!hotspot) return {}
  const key = (id: string) => `${exhibit.id}:${id}`
  const complete = exhibit.hotspots.every(
    (candidate) => !candidate.requiredForCatalogue || candidate.id === hotspotId || hotspotsSeen.includes(key(candidate.id)),
  )
  return {
    hotspots: [key(hotspotId)],
    ...(hotspot.revealsFactId ? { factsKnown: [hotspot.revealsFactId] } : {}),
    ...(complete ? { catalogued: [exhibit.id] } : {}),
  }
}

/**
 * A container, opened: every document in it, and the facts they reveal.
 *
 * One function for the drawer opened by hand and the drawer the keypad just
 * unlocked. They were two loops, and the keypad's forgot the facts.
 */
export function containerGrant(content: Pick<MuseumContent, 'documents'>, containerId: string): ProgressGrant {
  const inside = content.documents.filter((doc) => doc.containerId === containerId)
  return {
    documentsRead: inside.map((doc) => doc.id),
    factsKnown: inside.flatMap((doc) => (doc.revealsFactId ? [doc.revealsFactId] : [])),
  }
}

/**
 * A one-way door, opened from its own side: it stays unlatched.
 *
 * Granted on the press, not on the crossing: whoever pushes the bar and walks
 * away has unlatched the door all the same, and a reload in the middle of the
 * opening must not put the bar back. Null when there is nothing to record: a
 * door with no side of its own, a press from the wrong side (which the door
 * refuses), or a door released already. Null and not an empty grant, so the
 * caller does not wake the store for nothing.
 */
export function doorGrant(door: TransitionDoorSpec, currentRoom: string, released: readonly string[]): ProgressGrant | null {
  if (door.opensFrom === null || door.opensFrom !== currentRoom || released.includes(door.id)) return null
  return { doorsReleased: [door.id] }
}
