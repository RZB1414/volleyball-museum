/**
 * Saves as production wrote them, kept so that no later lot loses a player.
 *
 * Every lot from here on changes what a save means: new fields, renamed ids,
 * a drawer that starts granting a key. The players who matter most to that
 * work are the ones who already played, and their saves cannot be asked for.
 * So the states production can be in today are written down here by hand,
 * exactly as they sit in `localStorage`, and every one of them has to keep
 * loading (`npm run test:qa-save`). In the browser, the dev server starts a
 * session from any of them with `?qaSave=<name>` (`src/dev/qaSave.ts`).
 *
 * These are records, not content. A fixture is frozen at the build that
 * wrote it: when a lot renames an id, the fixture keeps the old one and the
 * migration has to carry it, which is the whole point of keeping it. That is
 * also why the `progress` of a fixture is not typed as today's `Progress`:
 * typing it would force the record to follow the type.
 *
 * Its own module with no runtime imports, like `legacySave.ts`, and imported
 * by nothing the game ships: only the dev harness and the tests read it.
 *
 * Production here is the build of 2026-10-03 (`db4cc70`, Cloudflare version
 * `0027afaa`), except where a fixture says it is older.
 */

export type SaveFixture = {
  /** The build that wrote it; later lots add their own corpus beside this. */
  readonly from: string
  /** What the player did, in one line, for the harness to print. */
  readonly summary: string
  /** What sits under the save key, before any migration. */
  readonly save: {
    readonly settings: Readonly<Record<string, unknown>>
    readonly progress: Readonly<Record<string, unknown>>
  }
}

const PRODUCTION = 'production-2026-10-03'

/** The settings of a player who never opened them, as the store writes them. */
const UNTOUCHED_SETTINGS = {
  locale: 'pt-BR',
  quality: 'medium',
  brightness: 1,
  headBob: false,
  fovPush: false,
  moveSpeed: 1,
  lookSensitivity: 1,
  touchLookSensitivity: 1,
  touchMoveSensitivity: 1,
  subtitles: true,
} as const

export const SAVE_FIXTURES = {
  /**
   * The furthest the published game goes.
   *
   * Three rooms lit, the drawer open, the predecessor's letter read, and nine
   * of the twelve pieces catalogued: the net, the gym suit and the gymnasium
   * photograph cannot be catalogued in this build, so no honest save has
   * them. This is the player the Posse lot owes a key to on load, because
   * the drawer that will grant it is already open.
   */
  'production-drawer-open': {
    from: PRODUCTION,
    summary: 'Tudo aceso, gaveta aberta, bilhete do Otávio lido, 9 de 12 peças catalogadas.',
    save: {
      settings: UNTOUCHED_SETTINGS,
      progress: {
        version: 1,
        catalogued: [
          'atrium-ball-laced',
          'atrium-ball-tokyo-1964',
          'atrium-ball-colour-1998',
          'atrium-ball-eight-panel-2008',
          'ball-improvised',
          'ball-spalding',
          'portrait-morgan',
          'handbook-1897',
          'guide-1916',
        ],
        hotspots: [
          'atrium-ball-laced:lacing',
          'atrium-ball-laced:raised-seam',
          'atrium-ball-tokyo-1964:panel-trio',
          'atrium-ball-tokyo-1964:recessed-seam',
          'atrium-ball-colour-1998:colour-sequence',
          'atrium-ball-colour-1998:hand-stitched-channel',
          'atrium-ball-eight-panel-2008:spiral-panels',
          'atrium-ball-eight-panel-2008:dimpled-surface',
          'ball-improvised:valve',
          'ball-spalding:maker',
          'ball-spalding:lacing',
          'ball-spalding:seam',
          'portrait-morgan:date',
          'handbook-1897:innings',
          'handbook-1897:ball-spec',
          'guide-1916:credit',
        ],
        documentsRead: [
          'doc-welcome',
          'doc-invention-date',
          'doc-halstead',
          'doc-rule-changes',
          'doc-predecessor',
        ],
        factsKnown: ['springfield-renaming', 'six-a-side', 'first-rulebook', 'filipino-spike'],
        credentials: [],
        roomsVisited: ['office', 'atrium', 'holyoke'],
        roomsPowered: ['office', 'atrium', 'holyoke'],
        locksOpened: ['office-drawer'],
        radioCalls: ['porter-first-call', 'porter-radio-taken'],
        clockSeconds: { 'office-clock': 2140 },
        hintsShown: ['journal-taken', 'radio-taken'],
        devicesCarried: ['office-radio'],
        radioMemory: {
          'office-radio': {
            calls: 4,
            temper: 1,
            // 2026-10-03 22:05, Brasília: a wall-clock instant, as the porter keeps it.
            lastCallAt: 1791075900000,
            lastHint: 4,
            lastReplyId: 'porter-praise-knack',
            lastOutburstId: null,
          },
        },
        lastRoom: 'office',
      },
    },
  },

  /**
   * The same night one step earlier: the year is known, the drawer is shut.
   *
   * The pair exists because the two players meet the Posse lot differently.
   * This one opens the drawer after the lot ships and is handed the key by
   * the drawer; the one above has to be handed it by the migration.
   */
  'production-drawer-closed': {
    from: PRODUCTION,
    summary: 'Tudo aceso, o ano lido no retrato do Morgan, gaveta ainda fechada.',
    save: {
      settings: UNTOUCHED_SETTINGS,
      progress: {
        version: 1,
        catalogued: ['atrium-ball-laced', 'portrait-morgan'],
        hotspots: ['atrium-ball-laced:lacing', 'portrait-morgan:date'],
        documentsRead: ['doc-welcome', 'doc-invention-date', 'doc-halstead'],
        factsKnown: ['springfield-renaming'],
        credentials: [],
        roomsVisited: ['office', 'atrium', 'holyoke'],
        roomsPowered: ['office', 'atrium', 'holyoke'],
        locksOpened: [],
        radioCalls: ['porter-first-call', 'porter-radio-taken'],
        clockSeconds: { 'office-clock': 612 },
        hintsShown: ['journal-taken', 'radio-taken'],
        devicesCarried: ['office-radio'],
        radioMemory: {
          'office-radio': {
            calls: 2,
            temper: 2,
            // 2026-10-03 21:42, Brasília. The last thing he said was the drawer hint.
            lastCallAt: 1791074520000,
            lastHint: 3,
            lastReplyId: 'porter-t1-listening',
            lastOutburstId: null,
          },
        },
        lastRoom: 'office',
      },
    },
  },

  /**
   * Two pieces catalogued on the first frame of the examine view.
   *
   * Today a required detail that already faces the camera counts at once, so
   * the laced ball (from the visitor's side of the console) and the 1916
   * guide (from the only side its case can be reached) are catalogued by
   * picking them up, with no optional detail ever seen. The examine lot will
   * ask for a turn first; a piece this build catalogued stays catalogued.
   */
  'production-catalogued-unturned': {
    from: PRODUCTION,
    summary: 'guide-1916 e atrium-ball-laced catalogadas ao pegar, sem girar.',
    save: {
      settings: UNTOUCHED_SETTINGS,
      progress: {
        version: 1,
        catalogued: ['atrium-ball-laced', 'guide-1916'],
        hotspots: ['atrium-ball-laced:lacing', 'guide-1916:credit'],
        documentsRead: ['doc-welcome'],
        factsKnown: ['filipino-spike'],
        credentials: [],
        roomsVisited: ['office', 'atrium', 'holyoke'],
        roomsPowered: ['office', 'atrium', 'holyoke'],
        locksOpened: [],
        radioCalls: ['porter-first-call', 'porter-radio-taken'],
        clockSeconds: { 'office-clock': 388 },
        hintsShown: ['journal-taken', 'radio-taken'],
        devicesCarried: ['office-radio'],
        // Carried but never called: he has nothing to remember yet.
        radioMemory: {},
        lastRoom: 'holyoke',
      },
    },
  },

  /**
   * A save from before the opening scene existed, never loaded since.
   *
   * Written by a build older than 2 October (the last was `ca4513c`): the game
   * began in the atrium and had no radio, no running clock, no notebook and
   * no list of lessons, so `radioCalls`, `clockSeconds`, `hintsShown`,
   * `devicesCarried` and `radioMemory` are absent, not empty. The office was
   * never lit. On load the migration hands this player the notebook and
   * counts the porter's first call as heard; they still wake in a dark office.
   */
  'production-pre-opening': {
    from: 'production-before-2026-10-02',
    summary: 'Save anterior à abertura: sem radioCalls; átrio e Holyoke acesos, escritório apagado.',
    save: {
      settings: {
        ...UNTOUCHED_SETTINGS,
        locale: 'en',
        quality: 'high',
        brightness: 1.2,
      },
      progress: {
        version: 1,
        catalogued: ['ball-spalding'],
        hotspots: ['ball-spalding:lacing', 'ball-spalding:maker'],
        documentsRead: ['doc-invention-date', 'doc-halstead'],
        factsKnown: ['springfield-renaming'],
        credentials: [],
        roomsVisited: ['atrium', 'holyoke'],
        roomsPowered: ['atrium', 'holyoke'],
        locksOpened: [],
        lastRoom: 'holyoke',
      },
    },
  },

  /**
   * The radio left on its charger, the player two rooms away.
   *
   * Taking the radio is optional and must stay so: this player heard the
   * first call out, walked off without the handset, lit the atrium and
   * stopped inside a Holyoke that is still dark. Whatever a later lot has to
   * tell them cannot be said only through a radio that is on the desk.
   */
  'production-radio-on-desk': {
    from: PRODUCTION,
    summary: 'Rádio na mesa do escritório; o jogador parou na Holyoke, ainda apagada.',
    save: {
      settings: UNTOUCHED_SETTINGS,
      progress: {
        version: 1,
        catalogued: [],
        hotspots: [],
        documentsRead: ['doc-welcome'],
        factsKnown: [],
        credentials: [],
        roomsVisited: ['office', 'atrium', 'holyoke'],
        roomsPowered: ['office', 'atrium'],
        locksOpened: [],
        radioCalls: ['porter-first-call'],
        clockSeconds: { 'office-clock': 204 },
        hintsShown: ['journal-taken'],
        devicesCarried: [],
        radioMemory: {},
        lastRoom: 'holyoke',
      },
    },
  },
} as const satisfies Readonly<Record<string, SaveFixture>>

export type SaveFixtureId = keyof typeof SAVE_FIXTURES
