/**
 * Whether a detail of a piece can be turned towards the camera at all.
 *
 * The examine view holds the piece's ORIGIN at a fixed distance and counts a
 * detail as seen when the direction from the origin out to the detail points
 * back at the camera (`Interaction.tsx`). That is right for a ball, whose
 * details sit a hand's width from its centre, and it quietly breaks for
 * anything large: the tape of a net is two metres from the origin, so it is
 * always behind the camera, and no amount of turning shows it. Three pieces
 * could never be catalogued and nothing said so.
 *
 * This is the ruler, as arithmetic, so that Node can ask it of every piece
 * (`content/simulate.ts`, `npm run test:playthrough`). With the origin `d`
 * metres from the camera and the detail `ρ` metres from the origin, turned
 * `θ` away from the line to the camera, the cosine the view tests is
 *
 *     (d·cos θ − ρ) / √(d² + ρ² − 2dρ·cos θ)
 *
 * and the detail shows while that is above `EXAMINE_HOTSPOT_DOT`. The set of
 * directions in which it shows is a cone about that line; its half-angle is
 * what this hands back.
 *
 * The view imports its two constants from here: one ruler, not a copy of it.
 * Pure, and types are all it imports.
 */

import type { ExamineHotspot, ExhibitData } from '../content/schema'

/** Metres from the camera to the origin of the piece being held. */
export const EXAMINE_HOLD_DISTANCE = 0.42

/** How squarely a detail must face the camera to count as seen: the cosine. */
export const EXAMINE_HOTSPOT_DOT = 0.55

/**
 * The narrowest cone a hand finds, as a half-angle in degrees.
 *
 * It separates what players of the published game have catalogued from what
 * none has: the lacing of the enlarged Spalding shows inside 8.5° and is in
 * production saves, the apparatus of the gymnasium photograph inside 1.5° and
 * is in none. A detail that exists only for a player who already knows where
 * it is does not count as reachable.
 */
export const EXAMINE_MIN_CONE_DEGREES = 5

/**
 * Half-angle, in degrees, of the cone of directions in which a detail `rho`
 * metres from the origin shows. 0 when it never does.
 */
export function examineConeDegrees(rho: number): number {
  const d = EXAMINE_HOLD_DISTANCE
  const k = EXAMINE_HOTSPOT_DOT
  // At the hold distance or beyond, the detail is level with the camera or
  // behind it: the direction out to it can never point back.
  if (!(rho >= 0) || rho >= d) return 0
  // The largest θ at which the cosine above still equals k, from squaring
  // d·cos θ − ρ = k·√(…) and keeping the root on which d·cos θ ≥ ρ.
  const lean = 1 - k * k
  const cosine = (rho * lean + k * Math.sqrt(d * d - rho * rho * lean)) / d
  return cosine >= 1 ? 0 : (Math.acos(cosine) * 180) / Math.PI
}

/** Whether a hand can turn this detail of this piece to the camera, and how wide the cone is. */
export function examineReach(
  exhibit: Pick<ExhibitData, 'scale'>,
  hotspot: Pick<ExamineHotspot, 'localPosition'>,
): { readonly reachable: boolean; readonly coneDegrees: number } {
  // The piece is scaled as a whole, so its details move out with it.
  const rho = Math.hypot(...hotspot.localPosition) * (exhibit.scale ?? 1)
  const coneDegrees = examineConeDegrees(rho)
  return { reachable: coneDegrees >= EXAMINE_MIN_CONE_DEGREES, coneDegrees }
}
