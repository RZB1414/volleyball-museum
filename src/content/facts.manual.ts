/**
 * Sources a person has to read, because the robot cannot.
 *
 * `npm run facts:capture` ends by listing the pages it could not open. Each
 * of those gets an entry here, by hand; the script never writes this file.
 *
 * An entry starts as a request: `check: null` names the page and says why
 * the robot fails on it. It counts for nothing in that state. When somebody
 * has opened the page in a browser and found the value, they fill `check`:
 *
 *   accessedAt     the day they read it
 *   title          the page's own title
 *   excerpt        the words around the value, fourteen at most, copied and
 *                  not paraphrased (for a counted fact, the list of names)
 *   excerptSha256  SHA-256 of `excerpt`; `npm run test:facts` prints the
 *                  value to paste when it does not match
 *   checkedBy      who read it
 *
 * From then on the gate takes the entry as that publisher's capture.
 */

import type { ManualCapture } from './factCapture'

export const MANUAL_CAPTURES: readonly ManualCapture[] = [
  {
    // Open: nobody has read this page for the museum yet. The Tokyo wing
    // needs it for "in Moscow" (plan §7.7, item 6); the year itself already
    // has its two publishers without it.
    factId: 'japan-world-title',
    url: 'https://www.olympics.com/en/news/tokyo-1964-women-volleyball-japan-gold',
    why:
      'olympics.com leaves the capture script without an answer until the request times out ' +
      '(2026-10-04, on every run; the fact report met the same timeout on 2026-10-03). ' +
      'The page exists: the same day it answered 200 to a request under another User-Agent. ' +
      'The script keeps the one that says who it is, so this page is for a browser.',
    check: null,
  },
]
