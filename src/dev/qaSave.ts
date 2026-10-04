/**
 * `?qaSave=<fixture>`: begin the session from a named save.
 *
 * Every lot is checked in the browser from the save the lot before it left
 * behind, and from the saves production already wrote. Playing up to such a
 * state by hand is twenty minutes each time and never quite the same state
 * twice; `?qaPower` cannot stand in for it, because a room lit from outside
 * has no notebook read, no call heard and no drawer opened.
 *
 * The fixture is written under the store's own key BEFORE the store is first
 * evaluated, so it is loaded by the one code path a real player's save takes:
 * parse, migrate, sanitise. Handing the store a ready-made `Progress` would
 * skip exactly the code the fixtures exist to exercise.
 *
 * From then on the session saves as usual. A reload with the parameter starts
 * from the fixture again; a reload without it continues. The save it replaces
 * is whatever this origin held, which on the dev server is nobody's game.
 *
 * Dev server only. Nothing under `src/dev` is reachable from `index.html`:
 * `scripts/vite-plugin-qa-save.mjs` injects the boot module while serving, and
 * a production build never sees either (`npm run test:qa-save` holds both to
 * that). Pure, so the same test can drive it against a stand-in storage.
 */

import { SAVE_FIXTURES, type SaveFixtureId } from '../content/saveFixtures.ts'

export const QA_SAVE_PARAM = 'qaSave'

/**
 * The store's `STORAGE_KEY`, repeated rather than imported: importing the
 * store would evaluate it, and it reads the save as it is evaluated — one
 * line too early. The test pins the two together.
 */
export const QA_SAVE_STORAGE_KEY = 'volleyball-museum:v1'

export type QaSaveOutcome =
  | { readonly status: 'absent' }
  | { readonly status: 'unknown'; readonly name: string; readonly known: readonly string[] }
  | { readonly status: 'loaded'; readonly name: SaveFixtureId; readonly summary: string }

/** The fixture the URL asks for, or null when it asks for none. */
export function qaSaveRequest(search: string): string | null {
  const name = new URLSearchParams(search).get(QA_SAVE_PARAM)?.trim()
  return name ? name : null
}

function isFixtureId(name: string): name is SaveFixtureId {
  return Object.hasOwn(SAVE_FIXTURES, name)
}

/**
 * Puts the requested fixture where the store will look for its save.
 *
 * An unknown name writes nothing: a typo must leave the existing save alone
 * and say which names exist, not quietly start a new game that looks like a
 * migration bug.
 */
export function applyQaSave(search: string, storage: Pick<Storage, 'setItem'>): QaSaveOutcome {
  const name = qaSaveRequest(search)
  if (name === null) return { status: 'absent' }
  if (!isFixtureId(name)) return { status: 'unknown', name, known: Object.keys(SAVE_FIXTURES) }

  const fixture = SAVE_FIXTURES[name]
  storage.setItem(QA_SAVE_STORAGE_KEY, JSON.stringify(fixture.save))
  return { status: 'loaded', name, summary: fixture.summary }
}
