/**
 * The notebook's list, as rules over content and the save.
 *
 * The list is the game's quest log, and it used to be drawn by the component
 * that knew two things about it: a line is ticked when its condition holds,
 * and has a box either way. A line about something the build does not have
 * was therefore a box nothing would ever tick, and "light every room" was
 * unticked for a player who had finished by the next lot's new wing.
 *
 * A line is data now (`ChecklistItem`): it says who wrote it, when it is on
 * the page, what ticks it, what it counts, and whether it is a promise with a
 * date instead of a task. This module turns that and a save into the rows the
 * page draws, and nothing here knows a room or a piece by name.
 *
 * Pure, so the suites read the list a save shows without a DOM.
 */

import type { ChecklistCounter, ChecklistItem, MuseumContent, ProgressCondition } from '../content/schema'
import { progressConditionMet, type ConditionProgress } from './progressCondition.ts'

type ConditionContent = Pick<MuseumContent, 'rooms' | 'exhibits'>

export type ChecklistRow = {
  readonly labelKey: string
  readonly author: ChecklistItem['author']
  /** Whether the box is ticked; `null` for a line with no box. */
  readonly done: boolean | null
  readonly noteKey: string | null
  readonly counters: readonly {
    readonly titleKey: string | null
    readonly done: number
    readonly of: number
  }[]
}

type Counted = keyof ChecklistCounter['of']

/**
 * The question "does this one hold?", for each list a counter may name.
 * Typed by the schema: a list added to `ChecklistCounter` does not compile
 * until it is counted here.
 */
const ONE_OF: {
  readonly [K in Counted]-?: (id: NonNullable<ChecklistCounter['of'][K]>[number]) => ProgressCondition
} = {
  powered: (id) => ({ powered: [id] }),
  catalogued: (id) => ({ catalogued: [id] }),
  documentsRead: (id) => ({ documentsRead: [id] }),
  locksOpened: (id) => ({ locksOpened: [id] }),
}

/**
 * How many of the things a counter names hold, and how many it names.
 *
 * Each id is asked of the rule that ticks a line (`progressConditionMet`),
 * one at a time, so a count can never disagree with its own tick: a room
 * that never lost its power counts as lit here because it does there.
 */
export function conditionTally(
  of: ChecklistCounter['of'],
  progress: ConditionProgress,
  content: ConditionContent,
): { done: number; of: number } {
  let done = 0
  let total = 0
  for (const field of Object.keys(ONE_OF) as Counted[]) {
    const asks = ONE_OF[field] as (id: string) => ProgressCondition
    for (const id of of[field] ?? []) {
      total += 1
      if (progressConditionMet(asks(id), progress, content)) done += 1
    }
  }
  return { done, of: total }
}

const onThePage = (item: ChecklistItem, progress: ConditionProgress, content: ConditionContent) =>
  item.appearsWhen === undefined || progressConditionMet(item.appearsWhen, progress, content)

/**
 * The lines a save shows, in the order they were written.
 *
 * A line with no `doneWhen` has no box: it is a promise with a date, and the
 * content gate refuses any other line without one.
 */
export function checklistRows(
  items: readonly ChecklistItem[],
  progress: ConditionProgress,
  content: ConditionContent,
): readonly ChecklistRow[] {
  return items
    .filter((item) => onThePage(item, progress, content))
    .map((item) => ({
      labelKey: item.labelKey,
      author: item.author,
      done: item.doneWhen ? progressConditionMet(item.doneWhen, progress, content) : null,
      noteKey: item.noteKey ?? null,
      counters: (item.counters ?? []).map((counter) => ({
        titleKey: counter.titleKey ?? null,
        ...conditionTally(counter.of, progress, content),
      })),
    }))
}

/**
 * The curator's own lines that `after` shows and `before` did not: what the
 * player has just noted down, for the HUD to say so. The director's lines
 * were written before the night began and are never news.
 */
export function checklistNews(
  items: readonly ChecklistItem[],
  before: ConditionProgress,
  after: ConditionProgress,
  content: ConditionContent,
): readonly string[] {
  return items
    .filter((item) => item.author === 'curator' && onThePage(item, after, content) && !onThePage(item, before, content))
    .map((item) => item.labelKey)
}

/**
 * A count as it is printed: `{done}` and `{total}` filled into the
 * dictionary's own sentence, so each language orders them as it likes.
 */
export function counterText(template: string, done: number, total: number) {
  return template.replace('{done}', String(done)).replace('{total}', String(total))
}
