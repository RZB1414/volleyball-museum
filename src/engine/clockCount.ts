/**
 * The seconds a mains clock has run, between the save and its hands.
 *
 * A clock runs on play time while its room has power. The save holds the
 * whole seconds it had run when it was last written; the fraction, and the
 * seconds since that write, live here. `Devices.tsx` keeps one of these per
 * clock and only turns the hands by it. It is outside the component so that
 * a suite can run it against the real store, in two tabs (`npm run
 * test:save`): what it must never do only shows there.
 *
 * A count is of one game. The save can be replaced under a running scene, by
 * "New game" in another tab: this tab takes the new game as it is the moment
 * it hears of it, and its scene is told nothing. The count made so far is
 * the erased game's, and every moment at which it is handed over is still to
 * come: when the room goes dark (the new game has no power yet, so React
 * stops the clock), when the tab is next hidden, at the next periodic save.
 * Handed over, it was the first thing the new game held: a clock starting an
 * hour past the minute the storm stopped it at, with nobody having touched
 * the old tab. So a count remembers the game it was made in (`gameInPlay`),
 * is never recorded into another, and is read from the save again as soon as
 * the clock is asked to run in one.
 */

import { advanceClockSeconds, CLOCK_SAVE_INTERVAL_SECONDS, savedClockSeconds } from './deviceRules.ts'

/** What a count asks of the store: the module itself in the game, a tab's own in the suites. */
export type ClockStore = {
  readonly useMuseum: {
    readonly getState: () => {
      readonly progress: { readonly clockSeconds?: Readonly<Record<string, number>> }
      readonly recordClockSeconds: (clockId: string, seconds: number) => void
    }
  }
  readonly contributeToSave: (contribute: () => void) => () => void
  readonly gameInPlay: () => string | undefined
}

export function clockCount(clockId: string, store: ClockStore) {
  // Seconds of play since the power came back, carried across sessions in
  // the save: a reload used to put the hands back to 16h47 in a room that
  // had been lit for an hour. Null while the clock is stopped.
  let elapsed: number | null = null
  let countedIn: string | undefined
  let sinceSave = 0

  const state = () => store.useMuseum.getState()
  const readSave = () => {
    elapsed = savedClockSeconds(state().progress, clockId)
    countedIn = store.gameInPlay()
    sinceSave = 0
  }
  const record = () => {
    if (elapsed !== null && countedIn === store.gameInPlay()) state().recordClockSeconds(clockId, elapsed)
  }

  return {
    /** The room has power: the clock goes on from where the save left it. The result is its way out. */
    run(): () => void {
      readSave()
      // A hidden tab freezes the frame loop before the next periodic write;
      // the forced flush on hide asks for the latest value instead. Recording
      // on the way out too keeps a room that streams back in from finding
      // its clock up to one save interval slow.
      const stopContributing = store.contributeToSave(record)
      return () => {
        stopContributing()
        record()
      }
    },
    /** The room has no power: the hands stay where the storm left them. */
    stop(): void {
      elapsed = null
    },
    /** One frame. The seconds the hands show: none while the clock is stopped. */
    advance(deltaSeconds: number): number {
      if (elapsed === null) return 0
      // Another game, and this room already lit in it: no power was lost,
      // so nothing stopped the clock, and it was still counting the old one.
      if (countedIn !== store.gameInPlay()) readSave()
      elapsed = advanceClockSeconds(elapsed, deltaSeconds)
      sinceSave += deltaSeconds
      if (sinceSave >= CLOCK_SAVE_INTERVAL_SECONDS) {
        sinceSave = 0
        record()
      }
      return elapsed
    },
  }
}
