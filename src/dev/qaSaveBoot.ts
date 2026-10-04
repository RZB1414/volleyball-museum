/**
 * The dev server's first module: applies `?qaSave` before the game loads.
 *
 * Injected ahead of `main.tsx` by `scripts/vite-plugin-qa-save.mjs`. Module
 * scripts run in document order, and the store is only evaluated later still,
 * behind the entry's `lazy()` import, so the fixture is in place by the time
 * anything reads the save. See `qaSave.ts` for what it does and why.
 */

import { applyQaSave } from './qaSave.ts'

try {
  const outcome = applyQaSave(window.location.search, window.localStorage)
  if (outcome.status === 'loaded') {
    console.info(`[qaSave] ${outcome.name}: ${outcome.summary}`)
  } else if (outcome.status === 'unknown') {
    console.warn(
      `[qaSave] "${outcome.name}" is not a save fixture; the save was left as it was. ` +
        `Known: ${outcome.known.join(', ')}`,
    )
  }
} catch (error) {
  // Storage can refuse (private browsing, a locked-down profile). The game
  // must still start; it just starts from whatever it would have anyway.
  console.warn('[qaSave] the fixture could not be written to localStorage', error)
}
