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
 *
 * From L1 on, each lot that closes adds its own: the save at the end of the
 * lot's route, read out of the browser's storage rather than written by hand,
 * and named after the lot that wrote it (`l1-…`, `l2-…`), with a second one
 * where the lot can write a state no route from the older saves reaches. The
 * lot after starts its own route from them. `npm run test:qa-save` refuses a
 * lot the plan calls done whose save is not here.
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

/**
 * The lot whose build wrote a fixture, or 0 for a save of production from
 * before the plan had lots. Read off `from`, which is `l<lot>-<commit>` for
 * every save taken as a lot closed.
 *
 * What a save may be asked depends on who wrote it: a record from before L2
 * says nothing of the locks it touched or the doors it released, and one
 * from L2 on does. The suites that walk the corpus ask this before they ask
 * anything else.
 */
export function fixtureLot(fixture: Pick<SaveFixture, 'from'>): number {
  const match = /^l(\d+)-[0-9a-f]{7,40}$/.exec(fixture.from)
  return match ? Number(match[1]) : 0
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

  /**
   * The end of L1's route, as the build of L1 wrote it.
   *
   * Not written by hand: read out of `localStorage` on 2026-10-04 after
   * playing a new game on the dev server, whose `src/` was the published
   * tree (`f0fb5a3`, Cloudflare version `1d3a4554`; the checkout stood one
   * documents-only commit ahead of it). The route: the lamp, the porter's
   * first call heard out, the notebook, the radio, the atrium's breaker,
   * Holyoke's, out by the shortcut, back for Morgan's portrait and tilting
   * it until the date showed, then the drawer opened with the year. The
   * porter was never called, so he remembers nothing.
   *
   * The same fields as production's saves: L1 changed nothing in what a
   * save holds. In particular it does not say the shortcut was used, which
   * is why L2 cannot open that door for a returning player.
   */
  'l1-route-end': {
    from: 'l1-f0fb5a3',
    summary: 'Fim da rota de L1: tudo aceso, retrato do Morgan catalogado pela data, gaveta aberta com o ano.',
    save: {
      settings: UNTOUCHED_SETTINGS,
      progress: {
        version: 1,
        catalogued: ['portrait-morgan'],
        hotspots: ['portrait-morgan:date'],
        documentsRead: ['doc-welcome', 'doc-predecessor'],
        factsKnown: ['springfield-renaming'],
        credentials: [],
        roomsVisited: ['office', 'atrium', 'holyoke'],
        roomsPowered: ['office', 'atrium', 'holyoke'],
        locksOpened: ['office-drawer'],
        radioCalls: ['porter-first-call', 'porter-radio-taken'],
        clockSeconds: { 'office-clock': 180 },
        hintsShown: ['journal-taken', 'radio-taken'],
        devicesCarried: ['office-radio'],
        radioMemory: {},
        lastRoom: 'office',
      },
    },
  },

  /**
   * The end of L2's route, begun from the save L1 left.
   *
   * Read out of `localStorage` on 2026-10-05, on the dev server over the
   * lot's last slice (`90dd9a6`; the commits that close the lot change no
   * line of `src/state`, nor anything else a save is written by).
   * `?qaSave=l1-route-end`, Continue, the office door, E on the service
   * shortcut from the atrium (it answers with the buzz and writes nothing),
   * the wing by its main door, and out by the shortcut: the bar pushed from
   * inside is what `doorsReleased` records. The player stopped in the atrium.
   *
   * A save of L1 carried forward, and the order of its fields shows it:
   * L1's own first, as L1 wrote them, then what this lot adds. `locksSeen`
   * was not played for. The drawer was open in the save the route began
   * from, and the lot's migration takes an open lock as a touched one.
   */
  'l2-shortcut-released': {
    from: 'l2-90dd9a6',
    summary: 'Fim da rota de L2 a partir do save de L1: atalho da Ala 1 liberado, o jogador parou no átrio.',
    save: {
      settings: UNTOUCHED_SETTINGS,
      progress: {
        version: 1,
        catalogued: ['portrait-morgan'],
        hotspots: ['portrait-morgan:date'],
        documentsRead: ['doc-welcome', 'doc-predecessor'],
        factsKnown: ['springfield-renaming'],
        credentials: [],
        roomsVisited: ['office', 'atrium', 'holyoke'],
        roomsPowered: ['office', 'atrium', 'holyoke'],
        locksOpened: ['office-drawer'],
        radioCalls: ['porter-first-call', 'porter-radio-taken'],
        clockSeconds: { 'office-clock': 194 },
        hintsShown: ['journal-taken', 'radio-taken'],
        devicesCarried: ['office-radio'],
        radioMemory: {},
        lastRoom: 'atrium',
        contentLot: 2,
        locksSeen: ['office-drawer'],
        doorsReleased: ['atrium-from-holyoke-shortcut'],
        flags: [],
        triggersFired: [],
      },
    },
  },

  /**
   * A new game of L2, stopped in the atrium with the wing not yet walked.
   *
   * Read out of `localStorage` on 2026-10-05, same build. "Novo jogo" on the
   * title; the lamp; the porter's first call heard out; the notebook, taken
   * while he was asking for it (the runtime counts a call answered mid-line
   * as heard, which is the reminder among the calls below); the radio, and
   * his call about it; E on the drawer and the keypad closed with no code
   * tried; the office door; the atrium's breaker; E on the service shortcut
   * from its wrong side, which records nothing.
   *
   * What no save before this lot can hold: a lock touched and still shut
   * (`locksSeen` without `locksOpened`: the plan lists it by name), under a
   * plan of two rooms and a stub. `production-drawer-closed` is the same
   * drawer without the touch. The lot that makes the drawer give a key meets
   * this player with the keypad already seen and the year not yet learnt.
   */
  'l2-new-game-drawer-touched': {
    from: 'l2-90dd9a6',
    summary: 'Jogo novo de L2: escritório e átrio acesos, rádio no bolso, gaveta tocada e ainda fechada, Ala 1 por visitar.',
    save: {
      settings: UNTOUCHED_SETTINGS,
      progress: {
        version: 1,
        contentLot: 2,
        catalogued: [],
        hotspots: [],
        documentsRead: ['doc-welcome'],
        factsKnown: [],
        credentials: [],
        roomsVisited: ['office', 'atrium'],
        roomsPowered: ['office', 'atrium'],
        locksOpened: [],
        locksSeen: ['office-drawer'],
        doorsReleased: [],
        flags: [],
        triggersFired: [],
        radioCalls: ['porter-first-call', 'porter-notebook-reminder', 'porter-radio-taken'],
        clockSeconds: { 'office-clock': 225 },
        hintsShown: ['journal-taken', 'radio-taken'],
        devicesCarried: ['office-radio'],
        radioMemory: {},
        lastRoom: 'atrium',
      },
    },
  },
} as const satisfies Readonly<Record<string, SaveFixture>>

export type SaveFixtureId = keyof typeof SAVE_FIXTURES
