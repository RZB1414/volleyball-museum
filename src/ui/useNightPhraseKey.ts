import { MUSEUM } from '../content/museum'
import { nightPhraseKey, nightPoints } from '../engine/nightClock'
import { useMuseum } from '../state/store'

/**
 * What the porter calls the hour as the save stands: the key of the phrase,
 * or null before the night has one. One reading for the subtitle of the
 * radio, for the toast of the clock and for a line of a directed sequence,
 * so that no two of them can name two hours.
 *
 * In a file of its own since the sequence's overlay began to ask it too: a
 * hook exported beside the HUD's components would break their fast refresh.
 */
export function useNightPhraseKey() {
  return useMuseum((state) =>
    MUSEUM.nightClock ? nightPhraseKey(MUSEUM.nightClock, nightPoints(MUSEUM.nightClock, state.progress, MUSEUM)) : null,
  )
}
