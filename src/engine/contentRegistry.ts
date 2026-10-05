/**
 * Where the museum hands the store its rules.
 *
 * Imported for its effect by the canvas chunk (`scenes/MuseumCanvas.tsx`), so
 * the registration happens as the content arrives, behind the title button,
 * and the store never imports the museum to get it (`state/progressRules.ts`
 * says why). `scripts/lib/runtimeWiring.ts` holds the canvas to that import:
 * without it every trigger in the game is silently dead.
 *
 * A save loaded before this ran is settled by the store when this runs; a
 * store created after it settles what it loaded as it is created.
 */

import { MUSEUM } from '../content/museum.ts'
import { registerProgressRules, type ProgressRules } from '../state/progressRules.ts'
import { compileTriggers, settleTriggers, type TriggerContent } from './triggers.ts'

/**
 * The rules of a content: its triggers, compiled once, behind one function.
 *
 * A function of the content and not of `MUSEUM`, so that the suites and the
 * playthrough robot register a house made for the purpose through the same
 * door the game uses.
 */
export function progressRulesFor(content: TriggerContent): ProgressRules {
  const triggers = compileTriggers(content)
  return { settle: (progress) => settleTriggers(progress, triggers, content).progress }
}

registerProgressRules(progressRulesFor(MUSEUM))
