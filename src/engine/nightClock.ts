/**
 * The hour of the night, by what has been done.
 *
 * The clock on the office wall stopped with the storm and used to start
 * again from that minute, counting play time: wrong for good, and a little
 * more wrong for every player who went to make coffee. And the porter could
 * never say the hour, because no two players' nights were the same length.
 *
 * So the night does not run on minutes. It has milestones (`NightClock`, in
 * the content): each one met is a point, in any order, and a point is never
 * taken back, because a milestone only asks what stays true as the save
 * grows. The first point is the hour the content gives, each further point
 * one step later. A clock that has been set shows that hour, and a line that
 * says `{hora}` says it in words, rounded («Quase nove»).
 *
 * Pure: the clock on the wall, the toast and the suites all ask these.
 */

import type { MuseumContent, NightClock } from '../content/schema'
import { progressConditionMet, type ConditionProgress } from './progressCondition.ts'

/** How many of the night's milestones this save has met. */
export function nightPoints(
  clock: NightClock,
  progress: ConditionProgress,
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
): number {
  let points = 0
  for (const milestone of clock.milestones) {
    const met =
      'when' in milestone
        ? progressConditionMet(milestone.when, progress, content)
        : milestone.of.filter((id) => progress.catalogued.includes(id)).length >= milestone.cataloguedAtLeast
    if (met) points += 1
  }
  return points
}

/**
 * The hour a count of points is. Null before the first: nothing has happened
 * yet, and a clock shows the minute it stopped at.
 */
export function nightTime(clock: NightClock, points: number): { readonly hours: number; readonly minutes: number } | null {
  if (!(points >= 1)) return null
  const total = clock.startsAt.hours * 60 + clock.startsAt.minutes + (Math.floor(points) - 1) * clock.stepMinutes
  const day = 24 * 60
  const wrapped = ((total % day) + day) % day
  return { hours: Math.floor(wrapped / 60), minutes: wrapped % 60 }
}

/**
 * The dictionary key of what is said at a count of points, or null before
 * the first. Past the last phrase it is the last: the gate holds a content
 * to one phrase per milestone, and a save can never count more.
 */
export function nightPhraseKey(clock: NightClock, points: number): string | null {
  if (!(points >= 1) || clock.phraseKeys.length === 0) return null
  return clock.phraseKeys[Math.min(Math.floor(points), clock.phraseKeys.length) - 1]
}

/**
 * What a clock that can be set shows, in minutes of the day: the hour of
 * the night once its flag is in the save, null until then (and in a content
 * with no night clock), when it shows what it always did.
 *
 * A number and not an hour and a minute so that a component can select it
 * from the store and be told only when it changes.
 */
export function setClockMinutes(
  clock: NightClock | undefined,
  setFlag: string | undefined,
  progress: ConditionProgress,
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
): number | null {
  if (!clock || setFlag === undefined || !Array.isArray(progress.flags) || !progress.flags.includes(setFlag)) return null
  const time = nightTime(clock, nightPoints(clock, progress, content))
  return time === null ? null : time.hours * 60 + time.minutes
}

/** The token a spoken line carries where the hour goes. */
export const HOUR_TOKEN = '{hora}'

/**
 * A spoken line with the hour in it; a line that names no hour comes back
 * as it is. With no phrase to give (a night with no point yet: nobody is on
 * the air that early) the token goes, with the sentence it stood alone in,
 * and never reaches the screen as written.
 */
export function fillHour(line: string, phrase: string | null): string {
  if (!line.includes(HOUR_TOKEN)) return line
  if (phrase !== null) return line.split(HOUR_TOKEN).join(phrase)
  return line
    .split(HOUR_TOKEN)
    .join('')
    .replace(/\s+([.!?…])/g, '$1')
    .replace(/([.!?…])[.!?]+/g, '$1')
    .trim()
}
