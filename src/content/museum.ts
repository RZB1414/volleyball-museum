/**
 * The museum, as data.
 *
 * This is the whole point of the rebuild: adding a wing is authoring this file,
 * not writing a component. Nothing here knows about React, three.js or the
 * bake — the generator reads it, the runtime reads the emitted manifest.
 *
 * Vertical slice scope: the atrium hub, one gallery, the curator's office and
 * the one-way shortcut between them. Four spaces, twelve systems.
 *
 * Geometry conventions:
 *   - Positions inside a room are LOCAL to that room's `origin`.
 *   - +X east, +Y up, -Z north. Rooms are axis-aligned boxes.
 *   - Kit module width 3.0 m, door 1.6 x 2.4 m, gallery ceiling 4.2 m.
 */

// Explicit .ts extension: the content set is executed directly by Node's type
// stripper in `npm run validate:content`, and Node's ESM resolver will not
// guess the extension. Type-only imports are erased, so they do not need it.
import { GENERATED_MEDIA } from './media.generated.ts'
import { AUTHORED_MEDIA } from './media.authored.ts'
import { SPAWN } from './spawn.ts'
import type {
  ContainerData,
  DeviceData,
  DirectedSequence,
  DocumentData,
  ExhibitData,
  Fact,
  Lock,
  MuseumContent,
  NightClock,
  ProgressCondition,
  RadioPatience,
  RoomData,
  Term,
} from './schema'

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

/**
 * No source here is typed from memory. Each one is a page of the fact bank
 * (`facts.bank.ts`) that `npm run facts:capture` read and found the value on,
 * and the gate holds these four fields to that reading: the title is the
 * page's own, the publisher is the registered owner of its host, the date is
 * the day it was read (`fact-source-uncaptured`, `fact-source-drift`). The
 * record itself, with hashes and excerpts, stays out of the game's bundle.
 *
 * The three pages cited by more than one fact are named once.
 */
const FIVB_HISTORY = {
  title: 'History – FIVB',
  url: 'https://www.fivb.com/volleyball/the-game/history/',
  publisher: 'FIVB',
  accessedAt: '2026-10-04',
} as const

const IVHF_MORGAN = {
  title:
    'William G. Morgan - Father of Volleyball - International Volleyball Hall of Fame - Holyoke, Massachusetts USA',
  url: 'https://www.volleyhall.org/william-morgan-father-of-volleyball.html',
  publisher: 'International Volleyball Hall of Fame',
  accessedAt: '2026-10-04',
} as const

const WIKIPEDIA_VOLLEYBALL = {
  title: 'Volleyball',
  url: 'https://en.wikipedia.org/wiki/Volleyball',
  publisher: 'Wikipedia',
  accessedAt: '2026-10-04',
} as const

/**
 * Only `springfield-renaming` is wired to a lock in this slice, so only it has
 * to clear the two-independent-publishers bar (`fact-code-uncaptured`). The
 * others are catalogue content and are marked honestly: each rests on one
 * publisher, and none of them may become a code as it stands.
 */
const FACTS = [
  {
    id: 'springfield-renaming',
    claimKey: 'fact.springfield-renaming.claim',
    value: '1896',
    confidence: 'high',
    verifiedAt: '2026-10-04',
    usedAsCode: true,
    // The only two texts allowed to print the year, in either language: the
    // plaque of the portrait and the title of the Springfield document. A
    // code has one home (`numeral-exclusivity`); this one has two because it
    // is the first lock of the game and the drawer teaches how they work.
    printedIn: ['hotspot.portrait-morgan.date.label', 'document.halstead.title'],
    exception: 'tutorial',
    sources: [
      FIVB_HISTORY,
      {
        title:
          'The REAL History of Volleyball - International Volleyball Hall of Fame - Holyoke, Massachusetts USA',
        url: 'https://www.volleyhall.org/history-of-volleyball.html',
        publisher: 'International Volleyball Hall of Fame',
        accessedAt: '2026-10-04',
      },
      // Tells the renaming in the federation's words: the bank counts this
      // page with the federation, not as a second voice of the Hall of Fame.
      IVHF_MORGAN,
      WIKIPEDIA_VOLLEYBALL,
    ],
  },
  {
    id: 'first-rulebook',
    claimKey: 'fact.first-rulebook.claim',
    value: '1897',
    confidence: 'high',
    verifiedAt: '2026-10-04',
    usedAsCode: false,
    // One account on two sites: one publisher, however many addresses.
    sources: [FIVB_HISTORY, IVHF_MORGAN],
  },
  {
    id: 'filipino-spike',
    claimKey: 'fact.filipino-spike.claim',
    value: '1916',
    confidence: 'high',
    verifiedAt: '2026-10-04',
    usedAsCode: false,
    sources: [WIKIPEDIA_VOLLEYBALL],
  },
  {
    id: 'six-a-side',
    claimKey: 'fact.six-a-side.claim',
    value: '1918',
    confidence: 'high',
    verifiedAt: '2026-10-04',
    usedAsCode: false,
    sources: [FIVB_HISTORY],
  },
] as const satisfies readonly Fact[]

// ---------------------------------------------------------------------------
// Locks
// ---------------------------------------------------------------------------

/**
 * The hint ladder is not optional garnish. A knowledge lock with no escape is a
 * quiz that fails the casual visitor, which is the exact anti-pattern this
 * design is built to avoid. It never fails the player; it waits.
 */
const STANDARD_HINTS = {
  highlightAfterMs: 45_000,
  audioAfterMs: 90_000,
  revealAfterAttempts: 3,
} as const

const LOCKS = [
  {
    kind: 'knowledge',
    id: 'office-drawer',
    factId: 'springfield-renaming',
    digits: 4,
    mapLabelKey: 'lock.office-drawer.mapLabel',
    // Said after the drawer's name while it is shut. The name used to be
    // «Gaveta trancada do curador», and stayed that with the drawer open.
    promptKey: 'lock.office-drawer.prompt',
    hints: STANDARD_HINTS,
    // The answer is on the Morgan portrait: its frame plaque gives 1896, and
    // the title of the Springfield document repeats it — both in the Holyoke
    // wing, which the player reaches before ever needing the drawer. Those
    // are the only two places the year is printed: a code that every card in
    // the wing repeats is not one the player found. The porter's drawer hint
    // sends the player to the portrait, and `test-opening-flow` proves the
    // year is on the plaque and on nothing but those two keys.
    sourceExhibitId: 'portrait-morgan',
    // The key is pinned to the sheet in the drawer, and is in the hand as the
    // drawer opens: a consequence of the lock and not a press on a key, so a
    // save in which the drawer was open before there was one is handed it on
    // the next load, by the same trigger (`PRE_POSSE_SAVE.drawer` says how
    // such a save is told).
    onOpen: [{ kind: 'grant-credential', credential: { kind: 'tool', id: 'service-key' } }],
  },
  /**
   * The iron safe in the office, which the key from the drawer opens.
   *
   * A touch by whoever holds the key opens it, and the key stays in the
   * door: it has this one lock, and is spent by its being open. «Cofre de
   * ferro», always with its metal: the Founder's vault under the hall is the
   * «caixa-forte», and a bare «cofre» would be either (D34).
   */
  {
    kind: 'tool',
    id: 'office-safe',
    requires: 'service-key',
    consumesTool: true,
    mapLabelKey: 'lock.office-safe.mapLabel',
    promptKey: 'lock.office-safe.prompt',
  },
] as const satisfies readonly Lock[]

// ---------------------------------------------------------------------------
// Exhibits
// ---------------------------------------------------------------------------

/**
 * The atrium's low console is a four-object timeline of the volleyball itself.
 * These are deliberately unbranded reconstructions: the preserved references
 * teach panel construction, materials and wear without turning protected
 * wordmarks into reusable game assets.
 *
 * A touch table (D13): handling replicas, which is why all four declare no
 * thread. The thread of the ball runs through the pieces of the wings, where
 * the originals are; four copies in the hall that carried it too would make
 * the thread begin in a room that belongs to no era. They are catalogued like
 * any piece, and count for the hall's own medal (the Lineage, L11).
 */
const ATRIUM_EXHIBITS = [
  {
    id: 'atrium-ball-laced',
    era: 'holyoke',
    recipe: 'ball/leather-laced-1900',
    position: [-2.4, 0.821, -8.28],
    // Keep the closure on the visitor-facing quarter, but off the reticle so
    // the crossed rawhide remains visible before examination begins.
    rotationY: -0.34,
    mount: 'floor',
    supportY: 0.716,
    titleKey: 'exhibit.atrium-ball-laced.title',
    labelKey: 'exhibit.atrium-ball-laced.label',
    catalogueKey: 'exhibit.atrium-ball-laced.catalogue',
    threads: [],
    hotspots: [
      {
        id: 'lacing',
        localPosition: [0, 0, 0.106],
        labelKey: 'hotspot.atrium-ball-laced.lacing.label',
        requiredForCatalogue: true,
      },
      {
        id: 'raised-seam',
        localPosition: [0.092, 0.035, 0.035],
        labelKey: 'hotspot.atrium-ball-laced.seam.label',
        requiredForCatalogue: false,
      },
    ],
  },
  {
    id: 'atrium-ball-tokyo-1964',
    era: 'tokyo',
    recipe: 'ball/classic-white-18-panel',
    position: [-1.6, 0.821, -8.28],
    rotationY: 0.24,
    mount: 'floor',
    supportY: 0.716,
    titleKey: 'exhibit.atrium-ball-tokyo-1964.title',
    labelKey: 'exhibit.atrium-ball-tokyo-1964.label',
    catalogueKey: 'exhibit.atrium-ball-tokyo-1964.catalogue',
    threads: [],
    hotspots: [
      {
        id: 'panel-trio',
        localPosition: [0.098, 0.025, 0.020],
        labelKey: 'hotspot.atrium-ball-tokyo-1964.panels.label',
        requiredForCatalogue: false,
      },
      {
        id: 'recessed-seam',
        localPosition: [0.030, -0.025, -0.098],
        labelKey: 'hotspot.atrium-ball-tokyo-1964.seam.label',
        requiredForCatalogue: true,
      },
    ],
  },
  {
    id: 'atrium-ball-colour-1998',
    era: 'rewrite',
    recipe: 'ball/tricolour-1998',
    position: [-0.8, 0.821, -8.28],
    rotationY: -0.32,
    mount: 'floor',
    supportY: 0.716,
    titleKey: 'exhibit.atrium-ball-colour-1998.title',
    labelKey: 'exhibit.atrium-ball-colour-1998.label',
    catalogueKey: 'exhibit.atrium-ball-colour-1998.catalogue',
    threads: [],
    hotspots: [
      {
        id: 'colour-sequence',
        localPosition: [0.088, 0.040, 0.045],
        labelKey: 'hotspot.atrium-ball-colour-1998.sequence.label',
        requiredForCatalogue: false,
      },
      {
        id: 'hand-stitched-channel',
        localPosition: [-0.045, -0.020, -0.093],
        labelKey: 'hotspot.atrium-ball-colour-1998.seam.label',
        requiredForCatalogue: true,
      },
    ],
  },
  {
    id: 'atrium-ball-eight-panel-2008',
    era: 'global',
    recipe: 'ball/eight-panel-2008',
    position: [0, 0.821, -8.28],
    rotationY: 0.38,
    mount: 'floor',
    supportY: 0.716,
    titleKey: 'exhibit.atrium-ball-eight-panel-2008.title',
    labelKey: 'exhibit.atrium-ball-eight-panel-2008.label',
    catalogueKey: 'exhibit.atrium-ball-eight-panel-2008.catalogue',
    threads: [],
    hotspots: [
      {
        id: 'spiral-panels',
        localPosition: [0.010, 0.010, 0.105],
        labelKey: 'hotspot.atrium-ball-eight-panel-2008.panels.label',
        requiredForCatalogue: false,
      },
      {
        id: 'dimpled-surface',
        localPosition: [0.060, -0.010, -0.086],
        labelKey: 'hotspot.atrium-ball-eight-panel-2008.dimples.label',
        requiredForCatalogue: true,
      },
    ],
  },
] as const satisfies readonly ExhibitData[]

/**
 * Eight wall labels, the hard budget. Everything beyond this lives in the
 * archive layer behind drawers, where it costs the casual visitor nothing.
 *
 * Every exhibit carries at least one `requiredForCatalogue` hotspot: the game
 * does not count an object as catalogued unless the player actually turned it
 * over. That is what converts passive looking into active reading.
 *
 * Four of the eight live in the run of wall cases on the south wall
 * (`history-case-run`, placed turned by PI at z = 7.86). Its bays are centred
 * on x = +4.08, +2.04, 0, -2.04 and -4.08, and each of the four pieces sits on
 * the centre line of the bay the generator cleared for it: the two frames on
 * the lining, 2 mm proud of it (z = 7.773), the two books on the top of the
 * bay's lower shelf. `supportY` is that top, not the middle of the board,
 * and the shelves of neighbouring bays stand at different heights. The numbers
 * come from `buildHistoryCaseRun().layout`; `npm run test:kit` checks every
 * piece against it (centre, support, uprights, dressing, caption, glass).
 */
const HOLYOKE_EXHIBITS = [
  {
    id: 'ball-improvised',
    era: 'holyoke',
    recipe: 'ball/basketball-bladder-1895',
    // Centred on the exact datum of the entry screen's glazed niche after its
    // quarter-turn towards the east entrance.
    position: [3.309, 0.335, 3.025],
    mount: 'floor',
    supportY: 0.227,
    titleKey: 'exhibit.ball-improvised.title',
    labelKey: 'exhibit.ball-improvised.label',
    catalogueKey: 'exhibit.ball-improvised.catalogue',
    threads: ['ball'],
    hotspots: [
      {
        id: 'valve',
        localPosition: [0, -0.09, 0.04],
        labelKey: 'hotspot.ball-spalding.lacing.label',
        requiredForCatalogue: true,
      },
    ],
  },
  {
    id: 'ball-spalding',
    era: 'holyoke',
    // The hero object of the wing.
    recipe: 'ball/spalding-laced-1900',
    // The concept treats the founding ball as a deliberately enlarged hero.
    // Scale is presentation-only; examine hotspots inherit the same wrapper.
    position: [-1.0, 1.293, 1.8],
    scale: 2.65,
    mount: 'floor',
    supportY: 1.02,
    titleKey: 'exhibit.ball-spalding.title',
    labelKey: 'exhibit.ball-spalding.label',
    catalogueKey: 'exhibit.ball-spalding.catalogue',
    threads: ['ball'],
    hotspots: [
      {
        id: 'lacing',
        localPosition: [0, 0.1, 0.1],
        labelKey: 'hotspot.ball-spalding.lacing.label',
        requiredForCatalogue: true,
      },
      {
        id: 'maker',
        // Deliberately on the far side: the maker's mark is only found by
        // turning the ball over, which is the lesson the whole museum teaches.
        localPosition: [0, 0, -0.11],
        labelKey: 'hotspot.ball-spalding.maker.label',
        requiredForCatalogue: true,
      },
      {
        id: 'seam',
        localPosition: [0.1, -0.03, 0.03],
        labelKey: 'hotspot.ball-spalding.seam.label',
        requiredForCatalogue: false,
      },
    ],
  },
  {
    id: 'net-1897',
    era: 'holyoke',
    recipe: 'net/ymca-1897',
    position: [1.25, 0, -5.6],
    rotationY: 0,
    mount: 'floor',
    titleKey: 'exhibit.net-1897.title',
    labelKey: 'exhibit.net-1897.label',
    catalogueKey: 'exhibit.net-1897.catalogue',
    threads: ['net', 'rules'],
    hotspots: [
      {
        id: 'tape',
        localPosition: [0, 1.98, 0],
        labelKey: 'hotspot.net-1897.tape.label',
        requiredForCatalogue: true,
      },
      {
        id: 'socket',
        localPosition: [-2.4, 0.04, 0],
        labelKey: 'hotspot.net-1897.socket.label',
        requiredForCatalogue: false,
      },
    ],
  },
  {
    id: 'handbook-1897',
    era: 'holyoke',
    recipe: 'paper/handbook-1897',
    // Fourth bay of the run. The open book's covers dip 4.3 mm below its
    // origin, so it stands that much above the board.
    position: [-2.04, 1.3878, 7.5],
    rotationY: Math.PI,
    mount: 'floor',
    supportY: 1.3835,
    titleKey: 'exhibit.handbook-1897.title',
    labelKey: 'exhibit.handbook-1897.label',
    catalogueKey: 'exhibit.handbook-1897.catalogue',
    threads: ['rules'],
    hotspots: [
      {
        id: 'innings',
        localPosition: [0.06, 0.01, 0.02],
        labelKey: 'hotspot.handbook-1897.innings.label',
        revealsFactId: 'first-rulebook',
        requiredForCatalogue: true,
      },
      {
        id: 'ball-spec',
        localPosition: [-0.06, 0.01, -0.03],
        labelKey: 'hotspot.handbook-1897.ball-spec.label',
        requiredForCatalogue: false,
      },
    ],
  },
  {
    id: 'guide-1916',
    era: 'holyoke',
    recipe: 'paper/spalding-guide-1916',
    // Middle bay of the run, whose lower shelf is 5 cm below its neighbours'.
    position: [0, 1.3335, 7.5],
    rotationY: Math.PI,
    mount: 'floor',
    supportY: 1.3335,
    titleKey: 'exhibit.guide-1916.title',
    labelKey: 'exhibit.guide-1916.label',
    catalogueKey: 'exhibit.guide-1916.catalogue',
    threads: ['rules', 'ball'],
    hotspots: [
      {
        id: 'credit',
        localPosition: [0, 0.01, 0.04],
        labelKey: 'hotspot.guide-1916.credit.label',
        revealsFactId: 'filipino-spike',
        requiredForCatalogue: true,
      },
      {
        id: 'census',
        localPosition: [0.07, 0.01, -0.02],
        labelKey: 'hotspot.guide-1916.census.label',
        requiredForCatalogue: false,
      },
    ],
  },
  {
    id: 'gym-suit',
    era: 'holyoke',
    recipe: 'apparel/gym-suit-1900',
    position: [4.25, 0, -5.25],
    rotationY: 0,
    mount: 'floor',
    titleKey: 'exhibit.gym-suit.title',
    labelKey: 'exhibit.gym-suit.label',
    catalogueKey: 'exhibit.gym-suit.catalogue',
    threads: [],
    hotspots: [
      {
        id: 'knit',
        localPosition: [0, 1.2, 0.12],
        labelKey: 'hotspot.ball-spalding.seam.label',
        requiredForCatalogue: true,
      },
    ],
  },
  {
    id: 'portrait-morgan',
    era: 'holyoke',
    recipe: 'frame/portrait-small',
    // Second bay of the run, on the lining, behind the glazing. The bay has
    // no upper shelf: a board and a brass rail used to cross the face. The
    // credit under the frame wraps to four lines in both languages; at 1.96
    // the last of them clears the lower shelf, which 1.92 did not.
    position: [2.04, 1.96, 7.773],
    rotationY: Math.PI,
    mount: 'case-wall',
    titleKey: 'exhibit.portrait-morgan.title',
    labelKey: 'exhibit.portrait-morgan.label',
    catalogueKey: 'exhibit.portrait-morgan.catalogue',
    mediaId: 'photo-morgan-1897',
    threads: [],
    hotspots: [
      {
        id: 'date',
        // The frame plaque, turned towards the player, states the 1896
        // renaming — the code to the office drawer. Morgan devised the game
        // in Holyoke in 1895; the name "volley ball" came in Springfield in
        // 1896. The plaque says the year and the town and stops there: the
        // sources part on the occasion (a visit early in the year, or the
        // conference demonstration), and the catalogue entry says that they
        // do instead of choosing one.
        localPosition: [0, -0.28, 0.03],
        labelKey: 'hotspot.portrait-morgan.date.label',
        revealsFactId: 'springfield-renaming',
        requiredForCatalogue: true,
      },
    ],
  },
  {
    id: 'photo-gym',
    era: 'holyoke',
    recipe: 'frame/panorama-wide',
    // The catalogue-scale print remains interactive in the first bay of the
    // run, on the lining; the wall mural uses the same licensed source without
    // duplicating interaction.
    position: [4.08, 1.95, 7.773],
    rotationY: Math.PI,
    mount: 'case-wall',
    titleKey: 'exhibit.photo-gym.title',
    labelKey: 'exhibit.photo-gym.label',
    catalogueKey: 'exhibit.photo-gym.catalogue',
    mediaId: 'photo-holyoke-gym-1897',
    threads: [],
    hotspots: [
      {
        id: 'apparatus',
        localPosition: [0.4, -0.1, 0.02],
        labelKey: 'hotspot.net-1897.socket.label',
        requiredForCatalogue: true,
      },
    ],
  },
] as const satisfies readonly ExhibitData[]

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/**
 * The house on the night of the Posse: three rooms and twelve pieces, each
 * written out.
 *
 * The notebook's list used to ask for "every room" and "every piece", which
 * mean whatever the build holds: the wing a later lot opens would untick
 * «Religar a energia» for a player who had lit all there was (D1). Frozen
 * lists are not derived from the rooms and exhibits below, on purpose; a
 * piece added to the hall is not thereby added to what the director asked
 * for that night. These are the ids the record of L2 wrote down when the two
 * lines still said "all of them" (`docs/releases/L2.graph.json`).
 */
const HOUSE_ROOMS = ['office', 'atrium', 'holyoke'] as const
const HALL_PIECES = [
  'atrium-ball-laced',
  'atrium-ball-tokyo-1964',
  'atrium-ball-colour-1998',
  'atrium-ball-eight-panel-2008',
] as const
const WING_PIECES = [
  'ball-improvised',
  'ball-spalding',
  'net-1897',
  'handbook-1897',
  'guide-1916',
  'gym-suit',
  'portrait-morgan',
  'photo-gym',
] as const
const HOUSE_PIECES = [...HALL_PIECES, ...WING_PIECES] as const

const DOCUMENTS = [
  {
    id: 'doc-invention-date',
    era: 'holyoke',
    kind: 'minutes',
    titleKey: 'document.invention-date.title',
    bodyKey: 'document.invention-date.body',
    containerId: 'holyoke-cabinet-a',
  },
  {
    id: 'doc-halstead',
    era: 'holyoke',
    kind: 'letter',
    titleKey: 'document.halstead.title',
    bodyKey: 'document.halstead.body',
    containerId: 'holyoke-cabinet-a',
    revealsFactId: 'springfield-renaming',
  },
  {
    id: 'doc-rule-changes',
    era: 'holyoke',
    kind: 'clipping',
    titleKey: 'document.rule-changes.title',
    bodyKey: 'document.rule-changes.body',
    containerId: 'holyoke-cabinet-b',
    revealsFactId: 'six-a-side',
  },
  /**
   * The first sheet of the handover, in the drawer the year opens.
   *
   * It took the place of the predecessor's note (`doc-predecessor`: a save
   * that read the one has read the other, `SAVE_ALIASES`), which sent the
   * player to three medals and a vault this build does not have. This one
   * gives a direction that can be followed tonight: the key pinned to it,
   * the iron safe, the Book, the lectern. The vault is named once, as where
   * the accession ledger is and as somewhere no number and no key leads.
   * Everything it sends the player to is listed, and the gate holds each to
   * something the build has (H-23).
   */
  {
    id: 'doc-otavio-handover',
    era: 'office',
    kind: 'letter',
    titleKey: 'document.otavio-handover.title',
    bodyKey: 'document.otavio-handover.body',
    containerId: 'office-cabinet',
    lockId: 'office-drawer',
    mentions: ['tool:service-key', 'office-safe', 'doc-termos', 'atrium-lectern'],
  },
  /**
   * The Book of Deeds, in the iron safe: what each curator signs for.
   *
   * Two pages. The outgoing curator's deed of handover, in his hand and
   * signed; and the deed of office, which is the term itself as it stands in
   * the book: blank at its signature line until the save holds the
   * signature. Reading it is what brings the deed to the lectern.
   */
  {
    id: 'doc-termos',
    era: 'office',
    kind: 'ledger',
    titleKey: 'document.termos.title',
    bodyKey: 'document.termos.summary',
    containerId: 'office-safe',
    lockId: 'office-safe',
    pages: [
      {
        style: 'handwritten',
        bodyKey: 'document.termos.handover',
        signatureKey: 'document.termos.handover.signature',
      },
      { style: 'term', termId: 'termo-posse' },
    ],
    mentions: ['atrium-lectern'],
  },
  /**
   * The printer's proof of the new plaques, kept in the safe beside the Book.
   *
   * The first paper of the thread that runs under the whole collection: the
   * refit cut from every plaque the line that says what a thing is (an
   * original, a reconstruction, a replica), and the old curator would not
   * let it go. It asks nothing tonight; the list notes it and says so.
   */
  {
    id: 'doc-label-proof-office',
    era: 'office',
    kind: 'proof',
    titleKey: 'document.label-proof-office.title',
    bodyKey: 'document.label-proof-office.body',
    containerId: 'office-safe',
    lockId: 'office-safe',
  },
  /**
   * The message on the answering machine: a recording, heard line by line
   * and filed once it has been heard to the last.
   *
   * It is how the player who never calls the porter learns what the drawer
   * asks and where the answer is: the question of the lock, and the wing and
   * the portrait, never the year. It is cut off by the power going, in the
   * middle of the one thing this build cannot yet answer (the plinth of the
   * hall), and the last line says so in the machine's own voice. A document
   * and not a line of the night: it was recorded this afternoon, and says
   * nothing of how the night stands now.
   */
  {
    id: 'doc-otavio-tape',
    era: 'office',
    kind: 'oral-history',
    titleKey: 'document.otavio-tape.title',
    bodyKey: 'document.otavio-tape.summary',
    containerId: 'office-answering-machine',
    lineKeys: [
      'tape.otavio.1',
      'tape.otavio.2',
      'tape.otavio.3',
      'tape.otavio.4',
      'tape.otavio.5',
      'tape.otavio.6',
      'tape.otavio.7',
      'tape.otavio.8',
      'tape.otavio.9',
    ],
    mentions: ['office-cabinet', 'portrait-morgan', 'atrium-podium'],
  },
  /**
   * The first thing the player reads, on the desk they spawn facing.
   *
   * Three pages and three jobs: the flyleaf names the museum, the director's
   * letter gives the night its one rule (power, room by room) and its deadline,
   * and the checklist is the quest log that ticks itself. The postscript is
   * the tutorial for knowledge locks, delivered before the first one exists.
   *
   * The list is in the director's ink. Its first two lines name what they
   * wait for and count it, room by room; the third is about the vault under
   * the hall, which this build shows on the office plan and has not built.
   * It is a promise with a date: no box, and a pencil note that says why not
   * tonight, once the lamp is lit and the curator can know why. (The gate
   * held it as a box nothing ticks until L3.)
   *
   * Under the ink the curator adds lines of their own, in pencil, as the
   * night gives them something to write down: the drawer and its question
   * (once the message is heard or the keypad touched), the key (once the
   * drawer is open), the deed (once the Book is read), and what the proof
   * in the safe says of the plaques. Each appears by what the save holds,
   * never by a call having been heard; the last is a promise like the
   * vault's, for the lot that puts the cut line back on a plaque.
   */
  {
    id: 'doc-welcome',
    era: 'office',
    kind: 'notebook',
    titleKey: 'document.welcome.title',
    bodyKey: 'document.welcome.summary',
    containerId: 'office-notebook',
    pages: [
      { style: 'printed', bodyKey: 'notebook.welcome.flyleaf' },
      {
        style: 'handwritten',
        bodyKey: 'notebook.welcome.letter',
        signatureKey: 'notebook.welcome.signature',
        postscriptKey: 'notebook.welcome.postscript',
      },
      {
        style: 'checklist',
        headingKey: 'notebook.todo.heading',
        items: [
          {
            labelKey: 'notebook.todo.power',
            author: 'helena',
            doneWhen: { powered: HOUSE_ROOMS },
            counters: [{ of: { powered: HOUSE_ROOMS } }],
            mentions: HOUSE_ROOMS,
          },
          {
            labelKey: 'notebook.todo.catalogue',
            author: 'helena',
            doneWhen: { catalogued: HOUSE_PIECES },
            counters: [
              { titleKey: 'room.atrium.title', of: { catalogued: HALL_PIECES } },
              { titleKey: 'room.holyoke.title', of: { catalogued: WING_PIECES } },
            ],
            mentions: HOUSE_PIECES,
          },
          {
            labelKey: 'notebook.todo.vault',
            author: 'helena',
            // The Founder's vault is L12's room; until then nothing ticks this.
            deferredUntilLot: 12,
            noteKey: 'notebook.todo.vault.note',
            // The note says the basement flooded, in the curator's pencil,
            // and the notebook is read in the dark before anything else:
            // neither the letter nor the title says so. It is the porter who
            // does, in his introduction, owed from the lamp on; the note is
            // on the page from that same state (never «the call was heard»).
            noteWhen: { powered: ['office'] },
          },
          {
            labelKey: 'notebook.todo.drawer',
            author: 'curator',
            // Whichever comes first: the message that asks the question, or
            // the keypad that asks for four digits.
            appearsWhen: { anyOf: [{ documentsRead: ['doc-otavio-tape'] }, { locksSeen: ['office-drawer'] }] },
            doneWhen: { locksOpened: ['office-drawer'] },
            mentions: ['office-cabinet'],
          },
          {
            labelKey: 'notebook.todo.safe-key',
            author: 'curator',
            appearsWhen: { locksOpened: ['office-drawer'] },
            doneWhen: { locksOpened: ['office-safe'] },
            mentions: ['office-safe'],
          },
          {
            labelKey: 'notebook.todo.posse',
            author: 'curator',
            appearsWhen: { documentsRead: ['doc-termos'] },
            doneWhen: { flags: ['posse-signed'] },
            mentions: ['atrium-lectern'],
          },
          {
            labelKey: 'notebook.todo.proof',
            author: 'curator',
            appearsWhen: { documentsRead: ['doc-label-proof-office'] },
            // The line the refit cut goes back on a plaque when the curator
            // can decide it, which is the reopening's lot; until then this
            // is a thing noted, with no box.
            deferredUntilLot: 12,
            noteKey: 'notebook.todo.proof.note',
            mentions: ['doc-label-proof-office', 'office-safe'],
          },
        ],
      },
    ],
  },
] as const satisfies readonly DocumentData[]


// ---------------------------------------------------------------------------
// Containers
// ---------------------------------------------------------------------------

/**
 * Where the reading layer physically lives.
 *
 * Placed on the east wall between the entrance and the navy reveal. The cases
 * remain discoverable without occupying either doorway or the central route.
 */
const HOLYOKE_CONTAINERS = [
  {
    id: 'holyoke-cabinet-a',
    part: 'archive-cabinet',
    position: [5.55, 0, 0.2],
    rotationY: -Math.PI / 2,
    titleKey: 'container.holyoke-a.title',
  },
  {
    id: 'holyoke-cabinet-b',
    part: 'archive-cabinet',
    position: [5.55, 0, 1.0],
    rotationY: -Math.PI / 2,
    titleKey: 'container.holyoke-b.title',
  },
] as const satisfies readonly ContainerData[]

/**
 * The locked cabinet in the curator's office.
 *
 * Its combination is a FACT — the year Mintonette was renamed — which the
 * player can only have learned by reading the museum. That is the whole
 * adaptation in one object: the educational payload is load-bearing rather
 * than optional, and the lock never fails anyone, it just waits.
 */
const OFFICE_CONTAINERS = [
  {
    id: 'office-cabinet',
    part: 'archive-cabinet',
    /**
     * Off the wall, drawers facing the room.
     *
     * It was at z = -3.2 with rotationY: PI. The north wall's inner face is at
     * z = -3.375 and the cabinet is 0.567 m deep about its origin, so it stood
     * 0.1 m inside the plaster with its drawer fronts pointing into the wall —
     * the one interactive object in the room, aimed away from the player.
     */
    position: [0.35, 0, -3.08],
    rotationY: 0,
    titleKey: 'container.office.title',
    lockId: 'office-drawer',
  },
  /**
   * The curator's notebook, on the visitor half of the blotter.
   *
   * Between the lamp and the ledgers, so the torch finds it, the lamp and the
   * notebook are both within reach of the one standing point past the visitor
   * chairs, and neither interaction volume swallows the other.
   */
  {
    id: 'office-notebook',
    part: 'curator-notebook',
    // Wholly on the leather: a centimetre further west, its lower board hung
    // 2 mm over the blotter's edge.
    position: [0.39, 0.747, -0.22],
    rotationY: 0.12,
    titleKey: 'container.office-notebook.title',
    presentation: 'notebook',
    carriesJournal: true,
  },
  /**
   * The iron safe in the corner past the last bookcase, door to the room.
   *
   * It was furniture: a green box with a wheel on it, which answered the
   * crosshair with nothing. It is where the Book of Deeds is kept, behind
   * the key from the drawer; the touch that opens it reads what is inside,
   * as with any cabinet, and from then on its door stands open on the hinge
   * the recipe is baked with (`layout.hinge` of the generator, which
   * `test:kit` holds this to) and the proof is seen on its shelf. The Book
   * is not drawn there: it is in the curator's hands from the same press,
   * and lies open on the lectern once it has been signed.
   */
  {
    id: 'office-safe',
    part: 'office-safe',
    position: [2.55, 0, 2.45],
    rotationY: -Math.PI / 2,
    titleKey: 'container.office-safe.title',
    lockId: 'office-safe',
    door: { nodePrefix: 'door', hingeAt: [-0.405, 0.373], openAngle: -1.75 },
    contents: [{ node: 'papers' }],
  },
] as const satisfies readonly ContainerData[]

/**
 * Jorge, the night porter, on the radio the player carries.
 *
 * Every call gets the help the player needs; what changes is the tone. The
 * first two calls are pure service, then he gets dry, then he teases, and
 * from the seventh call in a row he starts cutting the hint short and now
 * and then loses it — hangs up, or breaks into song. Silence calms him (five
 * real minutes per call), progress forgives one call and earns a word of
 * praise instead, and the call after a tantrum always helps. The numbers are
 * playtest dials, not rules: the rules live in `radioPatience.ts`.
 *
 * An answer that speaks of the night looks at it first (`when`): the joke
 * about the dark and the soap opera lost to the blackout are for a night
 * that still has a dark room in it, and the rain is heard in the dead air
 * for as long as it rains. They used to be said whatever the night was
 * doing, with every light on.
 */
const SOME_ROOM_STILL_DARK = {
  anyOf: [{ unpowered: ['atrium'] }, { unpowered: ['holyoke'] }],
} as const satisfies ProgressCondition

const PORTER_PATIENCE = {
  calmSecondsPerCall: 300,
  progressForgives: 1,
  hangUpSeconds: 12,
  deadAirSpeakerKey: 'radio.speaker.static',
  tiers: [
    {
      // Helpful.
      fromCall: 1,
      hint: 'full',
      replies: [
        { id: 'porter-t1-ready', lineKeys: ['radio.patience.t1.ready'] },
        { id: 'porter-t1-listening', lineKeys: ['radio.patience.t1.listening'] },
        { id: 'porter-t1-jorge', lineKeys: ['radio.patience.t1.jorge'] },
      ],
    },
    {
      // Dry.
      fromCall: 3,
      hint: 'full',
      replies: [
        { id: 'porter-t2-again', lineKeys: ['radio.patience.t2.again'] },
        { id: 'porter-t2-coffee', lineKeys: ['radio.patience.t2.coffee'] },
        { id: 'porter-t2-reception', lineKeys: ['radio.patience.t2.reception'] },
        { id: 'porter-t2-repeat', lineKeys: ['radio.patience.t2.repeat'] },
        { id: 'porter-t2-chat', lineKeys: ['radio.patience.t2.chat'] },
      ],
    },
    {
      // Teasing.
      fromCall: 5,
      hint: 'full',
      replies: [
        {
          id: 'porter-t3-hotline',
          lineKeys: ['radio.patience.t3.hotline'],
          closingKeys: ['radio.patience.t3.hotline.close'],
        },
        { id: 'porter-t3-otavio', lineKeys: ['radio.patience.t3.otavio'] },
        {
          id: 'porter-t3-torch',
          lineKeys: ['radio.patience.t3.torch'],
          // Why he does not come: said after the hint, as the joke's own end.
          closingKeys: ['radio.patience.t3.torch.close'],
        },
        { id: 'porter-t3-crossword', lineKeys: ['radio.patience.t3.crossword'] },
        { id: 'porter-t3-announcer', lineKeys: ['radio.patience.t3.announcer'] },
      ],
    },
    {
      // Impatient: the hint comes curt, and now and then he loses it.
      fromCall: 7,
      hint: 'curt',
      outburstChance: 0.3,
      replies: [
        { id: 'porter-t4-please', lineKeys: ['radio.patience.t4.please'] },
        { id: 'porter-t4-meter', lineKeys: ['radio.patience.t4.meter'] },
        { id: 'porter-t4-slow', lineKeys: ['radio.patience.t4.slow'] },
        {
          id: 'porter-t4-dark',
          lineKeys: ['radio.patience.t4.dark'],
          closingKeys: ['radio.patience.t4.dark.close'],
          when: SOME_ROOM_STILL_DARK,
        },
      ],
      outbursts: [
        {
          id: 'porter-t4-static',
          lineKeys: ['radio.patience.t4.static.1', 'radio.patience.t4.static.2'],
          hangsUp: true,
        },
        {
          id: 'porter-t4-penalty',
          lineKeys: ['radio.patience.t4.penalty.1', 'radio.patience.t4.penalty.2'],
          hangsUp: true,
        },
        {
          id: 'porter-t4-rounds',
          lineKeys: ['radio.patience.t4.rounds.1', 'radio.patience.t4.rounds.2'],
          hangsUp: false,
        },
      ],
    },
    {
      // Out of patience.
      fromCall: 10,
      hint: 'curt',
      outburstChance: 0.5,
      replies: [
        { id: 'porter-t5-age', lineKeys: ['radio.patience.t5.age'] },
        { id: 'porter-t5-last', lineKeys: ['radio.patience.t5.last'] },
        { id: 'porter-t5-collection', lineKeys: ['radio.patience.t5.collection'] },
        { id: 'porter-t5-labels', lineKeys: ['radio.patience.t5.labels'] },
        { id: 'porter-t5-babysitter', lineKeys: ['radio.patience.t5.babysitter'] },
      ],
      outbursts: [
        {
          id: 'porter-t5-no',
          lineKeys: ['radio.patience.t5.no.1', 'radio.patience.t5.no.2'],
          hangsUp: true,
        },
        {
          id: 'porter-t5-recording',
          lineKeys: ['radio.patience.t5.recording.1', 'radio.patience.t5.recording.2'],
          hangsUp: true,
        },
        {
          id: 'porter-t5-soap',
          lineKeys: ['radio.patience.t5.soap.1', 'radio.patience.t5.soap.2'],
          hangsUp: true,
          when: SOME_ROOM_STILL_DARK,
        },
        {
          id: 'porter-t5-song',
          lineKeys: ['radio.patience.t5.song.1', 'radio.patience.t5.song.2'],
          hangsUp: false,
        },
      ],
    },
  ],
  praise: [
    { id: 'porter-praise-went', lineKeys: ['radio.patience.praise.went'] },
    { id: 'porter-praise-knack', lineKeys: ['radio.patience.praise.knack'] },
    { id: 'porter-praise-needless', lineKeys: ['radio.patience.praise.needless'] },
  ],
  deadAir: [
    { id: 'porter-air-no-answer', lineKeys: ['radio.deadAir.noAnswer'] },
    { id: 'porter-air-really-off', lineKeys: ['radio.deadAir.reallyOff'] },
    // It rains until the pump has dried the basement, which is the lot of
    // the vault (L12): nothing sets the flag before then, and the gate
    // carries that as a dated debt rather than let the line go unasked.
    { id: 'porter-air-rain', lineKeys: ['radio.deadAir.rain'], when: { flagsUnset: ['basement-drained'] } },
  ],
} as const satisfies RadioPatience

/**
 * The hour of the night, which goes forward by what has been done.
 *
 * Ten milestones in this slice of the house: the three rooms lit, the
 * drawer opened, the collection checked by threes, the iron safe opened and
 * the deed of office signed. Each is a point, in any order; the first is ten
 * past seven, each one after it half an hour later, and a point is never
 * taken back: a night with everything done ends at twenty to midnight. The
 * phrases are what the porter says of each count, rounded and spelt out: he
 * never says an hour in a line of his own, he reads this. (The last two
 * were written after the first eight and stay at the end of the list: a
 * milestone is a point whatever its place, and the order is only the order
 * they were written in.)
 */
const NIGHT_CLOCK = {
  startsAt: { hours: 19, minutes: 10 },
  stepMinutes: 30,
  milestones: [
    { id: 'lamp', when: { powered: ['office'] } },
    { id: 'atrium', when: { powered: ['atrium'] } },
    { id: 'holyoke', when: { powered: ['holyoke'] } },
    { id: 'drawer', when: { locksOpened: ['office-drawer'] } },
    { id: 'catalogue-3', cataloguedAtLeast: 3, of: HOUSE_PIECES },
    { id: 'catalogue-6', cataloguedAtLeast: 6, of: HOUSE_PIECES },
    { id: 'catalogue-9', cataloguedAtLeast: 9, of: HOUSE_PIECES },
    { id: 'catalogue-12', cataloguedAtLeast: 12, of: HOUSE_PIECES },
    { id: 'safe', when: { locksOpened: ['office-safe'] } },
    { id: 'posse', when: { flags: ['posse-signed'] } },
  ],
  phraseKeys: [
    'night.hour.1',
    'night.hour.2',
    'night.hour.3',
    'night.hour.4',
    'night.hour.5',
    'night.hour.6',
    'night.hour.7',
    'night.hour.8',
    'night.hour.9',
    'night.hour.10',
  ],
} as const satisfies NightClock

/**
 * The office's working objects: what the room says before the player has read
 * a word. The stopped clock dates the storm, the reader by the door explains
 * why it will not open, and the porter's radio is the building's one voice.
 */
const OFFICE_DEVICES = [
  {
    kind: 'clock',
    id: 'office-clock',
    part: 'office-wall-clock',
    // The east wall between the last bookcase and the safe, in view from the
    // spawn just above the desk.
    position: [2.875, 1.93, 1.48],
    rotationY: -Math.PI / 2,
    stoppedAt: { hours: 16, minutes: 47 },
    runsWithPowerOf: 'office',
    // It stopped with the storm, and the porter says so. E on it, with the
    // lamp on, puts it right: from then on it shows the hour of the night.
    titleKey: 'device.office-clock.title',
    setFlag: 'clock-set',
  },
  {
    kind: 'power-indicator',
    id: 'office-door-reader',
    part: 'door-access-panel',
    // Beside the door on its latch side, at hand height.
    position: [-2.875, 1.16, 1.12],
    rotationY: Math.PI / 2,
    showsPowerOf: 'office',
  },
  {
    kind: 'radio',
    id: 'office-radio',
    part: 'desk-radio',
    // On the walnut border past the telephone, clear of the blotter's step.
    position: [0.36, 0.74, 0.64],
    rotationY: -Math.PI / 2,
    titleKey: 'device.office-radio.title',
    speakerKey: 'radio.speaker.porter',
    poweredBy: 'office',
    // Like the notebook: the first E takes the handset, the charger stays.
    carriedOnUse: true,
    // Heard in this list's order, one at a time, each once. A call is owed
    // from the moment its `when` holds until it is heard out or its
    // `lapsesWhen` holds: what it had to say is then old news, and it is
    // gone for good. `mentions` are the things of the house each one sends
    // the player to; the gate holds every one to something that is there.
    calls: [
      {
        // Who he is, why the building is dark, what he can see from the
        // front desk. Owed to every save from the lamp on, and it never
        // lapses: a player who lit the hall before he had spoken used to
        // go the whole night without meeting him (the first call below only
        // held while the hall was dark). A save from before this call hears
        // it once too, and is told nothing it has already done
        // (`PRE_POSSE_SAVE`). Nor is anybody: it says the clock stopped
        // and does not order it set, since the clock answers E while he
        // talks and this call is heard at any hour of the night.
        id: 'porter-hello',
        when: { powered: ['office'] },
        delaySeconds: 2.4,
        lineKeys: [
          'radio.call.hello.1',
          'radio.call.hello.2',
          'radio.call.hello.3',
          'radio.call.hello.4',
          'radio.call.hello.5',
        ],
        mentions: ['office-clock', 'office-radio'],
      },
      {
        // The id every save knows, and what it always was for: where the
        // hall's breaker is. It keeps the id and the moment, and lost the
        // introduction to the call above. Only said while the hall is dark.
        id: 'porter-first-call',
        when: { powered: ['office'], unpowered: ['atrium'] },
        lapsesWhen: { powered: ['atrium'] },
        delaySeconds: 1.2,
        lineKeys: ['radio.call.first.1', 'radio.call.first.2'],
        mentions: ['atrium-breaker', 'atrium', 'holyoke'],
      },
      {
        // Reading stays optional, so nothing locks the lamp behind the
        // notebook; the porter just notices the player skipped it. Calls are
        // heard in this list's order, so it always follows his introduction,
        // and it is dropped if the notebook is taken while it waits. With
        // the handset in the pocket it is heard wherever the player has got
        // to by then (the hall, the wing), so it names the desk by its room:
        // optional, and reminded all the same.
        id: 'porter-notebook-reminder',
        when: { powered: ['office'], documentsUnread: ['doc-welcome'] },
        lapsesWhen: { documentsRead: ['doc-welcome'] },
        delaySeconds: 4,
        lineKeys: ['radio.call.notebook.1'],
        mentions: ['office-notebook', 'office'],
      },
      {
        // He hears his radio leave the charger. After his introduction in
        // the list, so it waits for it even when the player grabs the radio
        // mid-call.
        id: 'porter-radio-taken',
        when: { carried: ['office-radio'] },
        delaySeconds: 0.8,
        lineKeys: ['radio.call.taken.1', 'radio.call.taken.2'],
        mentions: ['office-radio'],
      },
      {
        // The hall lit: the next room, and where its own breaker is. Old
        // news once Wing 1 is lit too.
        id: 'porter-atrium-service',
        when: { powered: ['atrium'] },
        lapsesWhen: { powered: ['holyoke'] },
        delaySeconds: 1.5,
        lineKeys: ['radio.call.atrium.1'],
        mentions: ['atrium-to-holyoke', 'holyoke-breaker'],
      },
      {
        id: 'porter-holyoke-lit',
        when: { powered: ['holyoke'] },
        lapsesWhen: { catalogued: WING_PIECES },
        delaySeconds: 1.5,
        lineKeys: ['radio.call.holyoke.1'],
        mentions: ['holyoke'],
      },
      {
        // A piece checked, whichever of the twelve: cases open and shut on
        // his panel. Owed from the first, and said once, of however many are
        // done by the time it is heard (with the radio on its desk, that is
        // when the player comes back to the office): it asks, and counts
        // nothing. It lapses with the twelve, which this build cannot reach
        // before the lot that makes the last three checkable (L4).
        id: 'porter-first-catalogued',
        when: { anyOf: HOUSE_PIECES.map((id) => ({ catalogued: [id] })) },
        lapsesWhen: { catalogued: HOUSE_PIECES },
        delaySeconds: 3,
        lineKeys: ['radio.call.catalogued.1'],
        mentions: [],
      },
      {
        // The id the save records is the door's own, the portal that
        // declares the leaf, and not the one facing it from the wing.
        id: 'porter-shortcut',
        when: { doorsReleased: ['atrium-from-holyoke-shortcut'] },
        delaySeconds: 2,
        lineKeys: ['radio.call.shortcut.1'],
        mentions: ['atrium-from-holyoke-shortcut'],
      },
      {
        // The message light on the office extension shows on his panel. He
        // says so once the hall is lit, when the player is out of the
        // office and may have walked past it; old news once it is heard.
        id: 'porter-machine-reminder',
        when: { powered: ['office', 'atrium'] },
        lapsesWhen: { documentsRead: ['doc-otavio-tape'] },
        delaySeconds: 4,
        lineKeys: ['radio.call.machine.1'],
        mentions: ['office-answering-machine'],
      },
      {
        // The drawer opens on his panel: thirty years and he never saw
        // inside it. Said to the player who opens it tonight; a save that
        // opened it before it held a key is told by the call below instead
        // (`PRE_POSSE_SAVE.drawer`), and never by this one. Old news, both,
        // once the safe is open.
        id: 'porter-drawer-open',
        when: { locksOpened: ['office-drawer'], flagsUnset: ['legacy-pre-L3-drawer'] },
        lapsesWhen: { locksOpened: ['office-safe'] },
        delaySeconds: 2.5,
        lineKeys: ['radio.call.drawer.1', 'radio.call.drawer.2'],
        mentions: ['office-cabinet', 'office-safe'],
      },
      {
        // For the save that opened the drawer on another night, and read a
        // note that mentioned no key: it holds one now, handed over as it
        // loaded, and nothing on the screen said so. He sends the player
        // back to look and says what a key would be for; what is in the
        // drawer he has never seen, tonight or any night.
        id: 'porter-legacy-drawer',
        when: { flags: ['legacy-pre-L3-drawer'] },
        lapsesWhen: { locksOpened: ['office-safe'] },
        delaySeconds: 2.5,
        lineKeys: ['radio.call.legacy-drawer.1'],
        mentions: ['office-cabinet', 'office-safe'],
      },
      {
        // The one line of the night that sets the two safes side by side:
        // this one is the iron safe, the vault is the Founder's (D34). And
        // where a deed is signed. Old news once it has been.
        id: 'porter-safe-open',
        when: { locksOpened: ['office-safe'] },
        lapsesWhen: { flags: ['posse-signed'] },
        delaySeconds: 2.5,
        lineKeys: ['radio.call.safe.1', 'radio.call.safe.2'],
        mentions: ['office-safe', 'atrium-lectern'],
      },
    ],
    // Ordered: the porter answers with the first thing the player still
    // needs, and says it one height to a call (where, what, how). The curt
    // lines are the same help, from a porter called once too often. Each
    // hint but the last points at something the player can walk up to.
    hints: [
      {
        // For a player still in the office. The notebook is optional: out
        // in the dark hall without it, what is needed is the breaker, and
        // this hint used to stand in front of every other.
        when: { documentsUnread: ['doc-welcome'], roomsUnvisited: ['atrium'] },
        targetId: 'office-notebook',
        heightKeys: ['radio.hint.notebook.where', 'radio.hint.notebook.what', 'radio.hint.notebook.how'],
        curtLineKeys: ['radio.hint.notebook.curt'],
        mentions: ['office-notebook'],
      },
      {
        // Asked from the office, from the hall or from the wing (which
        // lights with the hall still dark): where the breaker is, by the
        // wall and the door it stands beside, which hold from all three.
        when: { unpowered: ['atrium'] },
        targetId: 'atrium-breaker',
        heightKeys: ['radio.hint.atrium.where', 'radio.hint.atrium.what', 'radio.hint.atrium.how'],
        curtLineKeys: ['radio.hint.atrium.curt'],
        mentions: ['atrium-breaker', 'atrium', 'holyoke'],
      },
      {
        when: { unpowered: ['holyoke'] },
        targetId: 'holyoke-breaker',
        heightKeys: ['radio.hint.holyoke.where', 'radio.hint.holyoke.what', 'radio.hint.holyoke.how'],
        curtLineKeys: ['radio.hint.holyoke.curt'],
        mentions: ['holyoke-breaker', 'holyoke'],
      },
      {
        // Where the year is, and how it shows; never the year: the wing,
        // the portrait, the gesture. The message Otávio left asks the
        // question in his own words, and is the reminder's to send the
        // player to (`porter-machine-reminder`, which lapses once it is
        // heard): this hint asks only whether the drawer is shut, and sent
        // players back to a recording they had heard to its end.
        when: { locksClosed: ['office-drawer'] },
        targetId: 'portrait-morgan',
        heightKeys: ['radio.hint.drawer.where', 'radio.hint.drawer.what', 'radio.hint.drawer.how'],
        curtLineKeys: ['radio.hint.drawer.curt'],
        mentions: ['office-cabinet', 'portrait-morgan', 'holyoke-cabinet-a', 'holyoke'],
      },
      {
        // The key in the hand and the safe still shut.
        when: { credentials: [{ kind: 'tool', id: 'service-key' }], locksClosed: ['office-safe'] },
        targetId: 'office-safe',
        heightKeys: ['radio.hint.key.where', 'radio.hint.key.what', 'radio.hint.key.how'],
        curtLineKeys: ['radio.hint.key.curt'],
        mentions: ['office-safe'],
      },
      {
        // The Book read and the deed not signed: the lectern, and what the
        // signature asks. While a term can be signed and is not, he has
        // something to point at (`radio-hint-coverage` holds him to it).
        when: { documentsRead: ['doc-termos'], flagsUnset: ['posse-signed'] },
        targetId: 'atrium-lectern',
        heightKeys: ['radio.hint.posse.where', 'radio.hint.posse.what', 'radio.hint.posse.how'],
        curtLineKeys: ['radio.hint.posse.curt'],
        mentions: ['atrium-lectern', 'atrium', 'holyoke'],
      },
      // The fallback, once nothing is left to point at: the honest close.
      // Every hint above it is spent only with the deed signed, so it is
      // said to a curator in office, and says what is left of the night
      // (the collection, piece by piece) and what is not for tonight (the
      // vault, and why).
      { when: {}, heightKeys: ['radio.hint.rest'], curtLineKeys: ['radio.hint.rest.curt'], mentions: [] },
    ],
    patience: PORTER_PATIENCE,
  },
  /**
   * The telephone on the blotter, dial turned towards the visitors' side,
   * where the player stands.
   *
   * It was furniture, and answered the crosshair with nothing: the one
   * object in the office that promises a way to reach somebody. It answers
   * now, in the dark as well (a line needs no mains of the room), and what
   * it says closes that door honestly: the storm took the line. A device
   * rather than a kit placement for the reason the plinth of the hall is
   * one: furniture is instanced, with no id and nothing to aim at. Its two
   * nodes are drawn once either way.
   */
  {
    kind: 'voice',
    id: 'office-telephone',
    part: 'desk-telephone',
    position: [0.52, 0.747, 0.34],
    rotationY: -1.75,
    titleKey: 'device.office-telephone.title',
    // The telephone itself is who speaks: there is nobody on the other end.
    speakerKey: 'device.office-telephone.title',
    promptKey: 'device.office-telephone.prompt',
    utterances: [{ when: {}, lineKeys: ['device.office-telephone.dead'] }],
  },
  /**
   * The answering machine, on the walnut border of the desk beside the
   * radio's charger: keys and front towards whoever walks in.
   *
   * What it plays is a recording (`doc-otavio-tape`), and it is how the
   * night's one knowledge lock is asked aloud to a player who has no radio
   * and reads nothing: the lamp on its lid blinks from the moment the room
   * has power until the message has been heard to its last line. On the
   * mains, unlike the telephone: with the lamp off it is dead and says so.
   */
  {
    kind: 'voice',
    id: 'office-answering-machine',
    part: 'office-answering-machine',
    position: [0.615, 0.74, 0.642],
    rotationY: -Math.PI / 2,
    titleKey: 'device.office-answering-machine.title',
    speakerKey: 'device.office-answering-machine.speaker',
    poweredBy: 'office',
    messageLamp: true,
    utterances: [{ when: {}, documentId: 'doc-otavio-tape' }],
  },
] as const satisfies readonly DeviceData[]

/**
 * The medallion plinth, dead centre of the hall.
 *
 * The hub needs one strong landmark you orient by and pass repeatedly — the
 * direct analogue of the Goddess Statue in the RPD main hall. Without it the
 * atrium is an empty eighteen-metre box, which is exactly how it read the
 * first time anyone walked into it.
 *
 * Three medallions slot into it to open the vault. Nothing does yet, and
 * until L3 nothing said so: the largest object in the building answered the
 * crosshair with silence. It is a notice now, a promise with a date. It says
 * what it is and why it is roped off, takes no key, and the gate fails in
 * the lot that was to give it its sockets if it is still only this.
 *
 * A device rather than a kit placement because furniture is instanced: it
 * has no id and nothing to aim at. Its five nodes are drawn once either way,
 * and it is solid by the collider of its recipe, as it was in the kit.
 */
const ATRIUM_DEVICES = [
  {
    kind: 'notice',
    id: 'atrium-podium',
    part: 'atrium-central-podium',
    position: [0, 0, 0],
    rotationY: Math.PI / 2,
    titleKey: 'device.atrium-podium.title',
    noticeKey: 'device.atrium-podium.notice',
    // Medals and the house lights (L11) are what it is for.
    deferredUntilLot: 11,
  },
  /**
   * The lectern against the wall of Wing 1, between its two doors: where
   * the curator signs.
   *
   * It was furniture too, and is where the night ends: the deed of office
   * is signed here, by a press that is held. Until the Book of Deeds has
   * been read it says what it is and what it lacks; from then on the lamp
   * under the edge of its top is lit (red while the deed waits for
   * something, green when a held press signs it) and it names the deed and
   * whatever the deed still waits for; signed, the lamp is out and the Book
   * lies open on it. The lamp and the Book are two nodes of its recipe that
   * are never drawn together while it has one term, which is what keeps the
   * hall inside its count of draws (ÁT-K1).
   */
  {
    kind: 'signing-desk',
    id: 'atrium-lectern',
    part: 'atrium-lectern',
    position: [-7.15, 0, 2.2],
    rotationY: Math.PI / 2,
    titleKey: 'device.atrium-lectern.title',
    emptyNoticeKey: 'device.atrium-lectern.empty',
    termIds: ['termo-posse'],
    holdSeconds: 1.2,
  },
] as const satisfies readonly DeviceData[]

/**
 * What the curator signs.
 *
 * One term in this slice of the house: the deed of office, the Posse. Its
 * words are in the Book of Deeds, and reading the Book is what brings it to
 * the lectern; signing it asks for the Book and for light in the three rooms
 * of the house, each named, so that a wing a later lot opens changes nothing
 * in what was signed for. The flag it sets is the night's first ending, and
 * what every seal of a later lot will ask for.
 */
const TERMS = [
  {
    id: 'termo-posse',
    titleKey: 'term.posse.title',
    bodyKey: 'term.posse.body',
    presentedWhen: { documentsRead: ['doc-termos'] },
    when: { documentsRead: ['doc-termos'], powered: HOUSE_ROOMS },
    grants: 'posse-signed',
    mentions: ['atrium-lectern'],
  },
] as const satisfies readonly Term[]

/**
 * What the game shows by itself once the deed is signed: a card, and two
 * lines from the porter over the building's loudspeaker.
 *
 * Not a call of his radio: a player may reach the lectern having left the
 * radio on its charger, and what closes the night is owed to that player
 * too. The first line says the hour of this night as it stands; the second
 * says, once and with its reason, what the night cannot give: the ledger is
 * in the vault, and nobody goes down there tonight.
 */
const SEQUENCES = [
  {
    id: 'seq-posse',
    when: { flags: ['posse-signed'] },
    steps: [
      { kind: 'card', titleKey: 'sequence.posse.card', seconds: 3.5 },
      { kind: 'line', speakerKey: 'sequence.speaker.porter', lineKey: 'sequence.posse.1' },
      { kind: 'line', speakerKey: 'sequence.speaker.porter', lineKey: 'sequence.posse.2' },
    ],
    mentions: ['atrium-lectern'],
  },
] as const satisfies readonly DirectedSequence[]

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

const DOOR = { width: 1.6, height: 2.4 } as const

const ROOMS = [
  {
    id: 'atrium',
    titleKey: 'room.atrium.title',
    nicknameKey: 'room.atrium.nickname',
    wayfinding: {
      eyebrowKey: 'room.atrium.sign.eyebrow',
      titleKey: 'room.atrium.sign.title',
      plaqueStyle: 'walnut',
    },
    // Double height, and the torch cannot reach the ceiling on first entry.
    // The scale is deliberately unreadable in the dark; the moment the house
    // lights come up is the biggest payoff in the build.
    shell: { width: 18, depth: 18, height: 8.4 },
    origin: [0, 0, 0],
    palette: 'atrium-neutral',
    startsPowered: false,
    powerControl: {
      id: 'atrium-breaker',
      part: 'breaker-panel',
      // Beside the first wing entrance, on the west wall and facing inward.
      position: [-8.62, 1.05, -4.4],
      rotationY: Math.PI / 2,
      titleKey: 'power.atrium.title',
      pilotPosition: [0, 0.32, 0.3],
    },
    portals: [
      {
        id: 'atrium-to-holyoke',
        toRoom: 'holyoke',
        position: [-9, 0, -2],
        ...DOOR,
        rotationY: Math.PI / 2,
        transitionDoor: {
          style: 'double-panel',
          openDuration: 0.8,
          closeDuration: 0.55,
          closeDistance: 1.25,
          warmDistance: 5,
        },
      },
      {
        id: 'atrium-to-office',
        toRoom: 'office',
        position: [9, 0, 3],
        ...DOOR,
        rotationY: -Math.PI / 2,
        transitionDoor: {
          style: 'double-panel',
          openDuration: 0.8,
          closeDuration: 0.55,
          closeDistance: 1.25,
          warmDistance: 5,
          // The night begins inside: the office's electric lock holds the
          // door until its own lamp brings the room's power back.
          requiresPower: 'office',
        },
      },
      {
        /**
         * The atrium end of Holyoke's one-way shortcut.
         *
         * A portal is what punches the hole in the wall, so a shortcut
         * declared on only one side is a doorway on one face and solid
         * plaster on the other. Both rooms have to declare it; which
         * direction it can be TRAVERSED is `oneWay`, which is a gameplay
         * property and not a geometric one.
         */
        id: 'atrium-from-holyoke-shortcut',
        toRoom: 'holyoke',
        position: [-9, 0, 6.4],
        ...DOOR,
        rotationY: Math.PI / 2,
        oneWay: true,
        // This is a service shortcut, not a second public entrance to the wing.
        // Repeating the Holyoke plaque here made both openings look equivalent.
        sign: false,
        transitionDoor: {
          style: 'double-panel',
          openDuration: 0.8,
          closeDuration: 0.55,
          closeDistance: 1.25,
          warmDistance: 3.5,
          opensFrom: 'holyoke',
        },
      },
    ],
    /**
     * Dead centre stands the medallion plinth, which is a device now and not
     * furniture (`ATRIUM_DEVICES`): what the kit keeps of it is the inlay
     * under it and the ring of barriers round it.
     */
    kit: [
      { part: 'atrium-floor-inlay', position: [0, 0, 0] },

      // The low, repeated segments describe one circular object without closing
      // the floor into a square pen. The open visual rhythm keeps every route
      // around the landmark equally legible from the initial spawn.
      { part: 'atrium-barrier-segment', position: [0, 0, 0] },
      { part: 'atrium-barrier-segment', position: [0, 0, 0], rotationY: Math.PI / 4 },
      { part: 'atrium-barrier-segment', position: [0, 0, 0], rotationY: Math.PI / 2 },
      { part: 'atrium-barrier-segment', position: [0, 0, 0], rotationY: (3 * Math.PI) / 4 },
      { part: 'atrium-barrier-segment', position: [0, 0, 0], rotationY: Math.PI },
      { part: 'atrium-barrier-segment', position: [0, 0, 0], rotationY: (5 * Math.PI) / 4 },
      { part: 'atrium-barrier-segment', position: [0, 0, 0], rotationY: (3 * Math.PI) / 2 },
      { part: 'atrium-barrier-segment', position: [0, 0, 0], rotationY: (7 * Math.PI) / 4 },

      // Pull the counter 1.2 m into the room while its separately colliding
      // storage bank remains against the rear wall. This creates a genuine
      // staff aisle in front of both computers; the donation box moves east so
      // the second entrance is also wider than the player's capsule.
      { part: 'atrium-reception-desk', position: [-4.05, 0, 6.5], rotationY: Math.PI },
      { part: 'donation-box', position: [0.65, 0, 7.55], rotationY: Math.PI },

      // A compact switchback gives the desk a believable arrival sequence but
      // stops well short of both the shortcut fan and the central circulation.
      { part: 'rope-stanchion', position: [-6.2, 0, 4.9] },
      { part: 'rope-stanchion', position: [-4.55, 0, 4.9] },
      { part: 'rope-stanchion', position: [-2.9, 0, 4.9] },
      { part: 'rope-stanchion', position: [-2.9, 0, 3.25] },
      { part: 'rope-stanchion', position: [-4.55, 0, 3.25] },
      { part: 'rope-span', position: [-5.375, 0, 4.9] },
      { part: 'rope-span', position: [-3.725, 0, 4.9] },
      { part: 'rope-span', position: [-2.9, 0, 4.075], rotationY: Math.PI / 2 },
      { part: 'rope-span', position: [-3.725, 0, 3.25] },

      // The lectern between the two west doors is no longer furniture
      // (`ATRIUM_DEVICES`): it is the desk the deed of office is signed at.
      // Where it stands also leaves the first-room breaker unobstructed.

      // The north-east quarter now works as one furnished pause-and-display
      // zone. Its southern edge remains more than two metres from the podium,
      // while the office route on the east stays completely clear.
      { part: 'atrium-display-console', position: [-1.2, 0, -8.28] },
      { part: 'atrium-lounge-set', position: [4.1, 0, -6.15] },
      { part: 'atrium-sofa', position: [4.8, 0, -8.34] },
      { part: 'atrium-display-tower', position: [7.55, 0, -5.75], rotationY: -Math.PI / 2 },
      { part: 'atrium-divider-screen', position: [-1.95, 0, -6.25], rotationY: Math.PI / 12 },
      { part: 'atrium-divider-screen', position: [0.45, 0, -4.85], rotationY: -Math.PI / 14 },
      {
        part: 'atrium-divider-screen',
        position: [6.8, 0, -3.8],
        rotationY: -Math.PI / 2 + Math.PI / 12,
      },

      { part: 'atrium-wall-bay-plain', position: [-8.875, 0, -7.35], rotationY: Math.PI / 2 },
      { part: 'atrium-wall-bay-plain', position: [-8.875, 0, -4.45], rotationY: Math.PI / 2 },
      { part: 'atrium-wall-bay-plain', position: [-8.875, 0, 0.45], rotationY: Math.PI / 2 },
      { part: 'atrium-wall-bay-plain', position: [-8.875, 0, 3.95], rotationY: Math.PI / 2 },
      { part: 'atrium-wall-bay-plain', position: [-6.4, 0, -8.875] },
      { part: 'atrium-wall-bay-plain', position: [-3.2, 0, -8.875] },
      { part: 'atrium-wall-bay-plain', position: [0, 0, -8.875] },
      { part: 'atrium-wall-bay-plain', position: [3.2, 0, -8.875] },
      { part: 'atrium-wall-bay-plain', position: [6.4, 0, -8.875] },
      { part: 'atrium-wall-bay-plain', position: [-6.4, 0, 8.875], rotationY: Math.PI },
      { part: 'atrium-wall-bay-plain', position: [-3.2, 0, 8.875], rotationY: Math.PI },
      { part: 'atrium-wall-bay-plain', position: [0, 0, 8.875], rotationY: Math.PI },
      { part: 'atrium-wall-bay-plain', position: [3.2, 0, 8.875], rotationY: Math.PI },
      { part: 'atrium-wall-bay-plain', position: [6.4, 0, 8.875], rotationY: Math.PI },
      { part: 'atrium-wall-bay-plain', position: [8.875, 0, -7.2], rotationY: -Math.PI / 2 },
      { part: 'atrium-wall-bay-plain', position: [8.875, 0, -3.9], rotationY: -Math.PI / 2 },
      { part: 'atrium-wall-bay-plain', position: [8.875, 0, -0.6], rotationY: -Math.PI / 2 },
      { part: 'atrium-wall-bay-plain', position: [8.875, 0, 5.6], rotationY: -Math.PI / 2 },

      { part: 'atrium-banner-hardware', position: [-8.73, 7.08, 8.05], rotationY: Math.PI / 2 },
      { part: 'atrium-banner-hardware', position: [-8.73, 7.08, 3.75], rotationY: Math.PI / 2 },
      { part: 'atrium-banner-hardware', position: [-8.73, 7.08, -4.25], rotationY: Math.PI / 2 },
      { part: 'atrium-banner-hardware', position: [-8.73, 7.08, -7.15], rotationY: Math.PI / 2 },

      { part: 'atrium-ceiling-coffer', position: [0, 8.39, 0], rotationY: Math.PI / 2 },
      { part: 'atrium-aerial-installation', position: [-1.8, 8.12, 0], rotationY: Math.PI / 2, scale: 1.32 },
      { part: 'atrium-pin-pendant', position: [-4.8, 8.22, 4.8], lightTarget: [-4.05, 0.8, 6.2] },
      { part: 'atrium-pin-pendant', position: [-5.2, 8.22, 1.8], lightTarget: [-8.55, 1.55, 2.2] },
      { part: 'atrium-pin-pendant', position: [1.8, 8.22, 3.6], lightTarget: [0, 0.9, 0] },
      { part: 'atrium-pin-pendant', position: [6.1, 8.22, -4.4], lightTarget: [7.55, 1.25, -5.75] },
      // The ball timeline is the only examineable collection in the hub, so it
      // takes the fifth focused key; the adjacent lounge remains legible in the
      // broad atrium wash.
      { part: 'atrium-pin-pendant', position: [-1.2, 8.22, -5.55], lightTarget: [-1.2, 0.82, -8.28] },
      { part: 'atrium-pin-pendant', position: [-0.9, 8.22, -3.4] },
      { part: 'atrium-pin-pendant', position: [4.5, 8.22, 0.9] },
      { part: 'atrium-pin-pendant', position: [0.6, 8.22, 5.6], scale: 0.82 },
      { part: 'atrium-pin-pendant', position: [2.7, 8.22, -1.7], scale: 1.12 },
    ],
    /**
     * The dedication wall.
     *
     * The atrium's north face is eighteen metres of blank plaster with no
     * doorway in it. Vinyl lettering is what a real museum puts there, and it
     * does three jobs at once: it names the building, it gives the eye
     * somewhere to land on entry, and it states the premise — you are the
     * curator and the museum opens tomorrow — without a cutscene.
     */
    signage: [
      {
        id: 'atrium-dedication',
        eyebrowKey: 'sign.atrium.eyebrow',
        headingKey: 'sign.atrium.heading',
        bodyKey: 'sign.atrium.body',
        position: [8.84, 2.75, -2.4],
        rotationY: -Math.PI / 2,
        presentation: 'dedication-plaque',
        width: 5.2,
        height: 1.5,
        size: 0.33,
        maxWidth: 3.55,
        align: 'left',
      },
    ],
    wallArt: [
      {
        id: 'atrium-orientation-wall',
        mediaId: 'graphic-atrium-orientation-wall',
        position: [-8.68, 1.55, 2.2],
        rotationY: Math.PI / 2,
        width: 5.8,
        height: 1.16,
        presentation: 'thin-framed',
        selfIllumination: 0.12,
        showCredit: false,
      },
      {
        id: 'atrium-mural-attack',
        mediaId: 'graphic-atrium-mural-attack',
        position: [-4.6, 4.5, 8.84],
        rotationY: Math.PI,
        width: 3.45,
        height: 5.05,
        presentation: 'thin-framed',
        selfIllumination: 0.14,
        showCredit: false,
      },
      {
        id: 'atrium-mural-dive',
        mediaId: 'graphic-atrium-mural-dive',
        position: [-4.6, 4.5, -8.84],
        rotationY: 0,
        width: 3.45,
        height: 5.05,
        presentation: 'thin-framed',
        selfIllumination: 0.14,
        showCredit: false,
      },
      {
        id: 'atrium-banner-burgundy-block',
        mediaId: 'graphic-atrium-banner-burgundy-block',
        position: [-8.68, 4.98, 8.05],
        rotationY: Math.PI / 2,
        width: 1.04,
        height: 4.04,
        presentation: 'flush',
        selfIllumination: 0.85,
        showCredit: false,
      },
      {
        id: 'atrium-banner-navy-flight',
        mediaId: 'graphic-atrium-banner-navy-flight',
        position: [-8.68, 4.98, 3.75],
        rotationY: Math.PI / 2,
        width: 1.04,
        height: 4.04,
        presentation: 'flush',
        selfIllumination: 0.85,
        showCredit: false,
      },
      {
        id: 'atrium-banner-navy-serve',
        mediaId: 'graphic-atrium-banner-navy-serve',
        position: [-8.68, 4.98, -4.25],
        rotationY: Math.PI / 2,
        width: 1.04,
        height: 4.04,
        presentation: 'flush',
        selfIllumination: 0.85,
        showCredit: false,
      },
      {
        id: 'atrium-banner-burgundy-ribbon',
        mediaId: 'graphic-atrium-banner-burgundy-ribbon',
        position: [-8.68, 4.98, -7.15],
        rotationY: Math.PI / 2,
        width: 1.04,
        height: 4.04,
        presentation: 'flush',
        selfIllumination: 0.85,
        showCredit: false,
      },
    ],
    exhibitIds: [
      'atrium-ball-laced',
      'atrium-ball-tokyo-1964',
      'atrium-ball-colour-1998',
      'atrium-ball-eight-panel-2008',
    ],
    documentIds: [],
    devices: ATRIUM_DEVICES,
    audio: [
      {
        id: 'atrium-hum',
        soundId: 'ambience/atrium-drip',
        position: [0, 3, 0],
        refDistance: 8,
        loop: true,
      },
    ],
  },
  {
    id: 'holyoke',
    titleKey: 'room.holyoke.title',
    nicknameKey: 'room.holyoke.nickname',
    wayfinding: {
      eyebrowKey: 'room.holyoke.sign.eyebrow',
      titleKey: 'room.holyoke.sign.title',
      subtitleKey: 'room.holyoke.subtitle',
      plaqueStyle: 'navy',
    },
    shell: { width: 12, depth: 16, height: 4.2 },
    /**
     * West of the atrium, back to back.
     *
     * `shell.width` is the inside dimension, so a room's wall centre line sits
     * at origin ± width/2 and the wall itself extends WALL_THICKNESS/2 (0.125 m)
     * beyond that. Placing this room's east centre line at -9.25 puts its wall
     * at -9.375..-9.125 and the atrium's west wall at -9.125..-8.875: two
     * leaves touching, a 0.5 m door reveal, and no void between the shells.
     * It used to sit at -15.5, which left a 0.25 m gap of nothing that the
     * floor slabs could not span.
     */
    origin: [-15.25, 0, 0],
    palette: 'holyoke-gaslight',
    startsPowered: false,
    powerControl: {
      id: 'holyoke-breaker',
      part: 'breaker-panel',
      // On the wall OPPOSITE the entrance, so that it is a lighthouse: from
      // the doorway its lens is 20.8 degrees left of straight ahead, in the
      // gap between the hero case (which hides the wall from 25 to 40
      // degrees) and the mural, whose south edge is 0.57 m to its north. It
      // used to hang on the entrance wall, behind the shoulder of whoever
      // walked in, and no pixel of the first frame showed it. z = 2.2 is the
      // position checked in the browser (docs/lotes/P0-linha-de-base.md); at
      // 1.15 m the case clears the dado rail, so it sits on the plaster.
      // `test:opening` proves the bearing and the sight lines from the door.
      // Left for L10: with today's 2.4 m reach the pilot washes the south end
      // of the mural red in the dark.
      position: [-5.875, 1.15, 2.2],
      rotationY: Math.PI / 2,
      titleKey: 'power.holyoke.title',
      pilotPosition: [0, 0.32, 0.3],
    },
    powerLockId: undefined,
    portals: [
      {
        id: 'holyoke-to-atrium',
        toRoom: 'atrium',
        position: [6, 0, -2],
        ...DOOR,
        rotationY: -Math.PI / 2,
      },
      {
        // The reward of the wing: a barred service door at the far end that
        // opens only from inside. The player recognises, from behind, the door
        // they could not open on the way in.
        id: 'holyoke-shortcut',
        toRoom: 'atrium',
        position: [6, 0, 6.4],
        ...DOOR,
        rotationY: -Math.PI / 2,
        oneWay: true,
        sign: false,
      },
    ],
    /**
     * One continuous historical exhibition, composed like the approved image:
     * a navy reveal, built-in archive cases, a central interpretation sequence
     * and a reconstructed gymnasium vignette. The east edge deliberately stays
     * open so both portals remain legible as one route through the room.
     */
    kit: [
      // The reference's depth order starts at the door: navy reveal first,
      // interpretation second, then the hero case. This keeps the first frame
      // layered instead of exposing the whole floor at once.
      { part: 'holyoke-entry-screen', position: [3.1, 0, 3.4], rotationY: 2.2 },
      { part: 'history-info-kiosk', position: [0.6, 0, -0.2], rotationY: 2.14 },
      { part: 'history-hero-case', position: [-1.0, 0, 1.8] },
      { part: 'label-angled', position: [0.0, 0, 1.5], rotationY: Math.PI / 2 },

      // One ten-metre authored run replaces five visibly cloned cabinets. It
      // faces north from the south wall, leaving the shortcut corner clear.
      { part: 'history-case-run', position: [0, 0, 7.86], rotationY: Math.PI },

      // The right side of the entrance view is a partial YMCA gymnasium:
      // court, net, bench, dress form and training equipment.
      { part: 'gym-court-lines', position: [1.25, 0.002, -3.45] },
      { part: 'bench', position: [1.15, 0, -4.1] },
      { part: 'gym-training-set', position: [3.0, 0, -1.0] },
      { part: 'label-angled', position: [4.15, 0, -4.15], rotationY: 0 },
      { part: 'label-angled', position: [3.8, 0, -0.7], rotationY: -Math.PI / 2 },

      // Three heads hang over the archival run and three over the gym and the
      // mural, each authored with its target. Only FIVE of the seven are ever
      // lit: the light rig samples that many evenly and drops the middle head
      // of each row, so over the run the lit ones are x = -4 and x = +4. Since
      // the collection moved into its bays the west one lights the bay that
      // hosts nothing and the handbook, the guide and the portrait have only
      // the room's wash: left as it is for the lot that re-aims the room
      // (H-24, L10), which owns the key lights and their acceptance.
      { part: 'ceiling-spot', position: [-4.0, 4.2, 6.3], lightTarget: [-4.0, 1.4, 7.25] },
      { part: 'ceiling-spot', position: [0, 4.2, 6.3], lightTarget: [0, 1.4, 7.25] },
      { part: 'ceiling-spot', position: [4.0, 4.2, 6.3], lightTarget: [4.0, 1.4, 7.25] },
      { part: 'ceiling-spot', position: [-4.0, 4.2, -6.3], lightTarget: [-5.55, 2.1, -2.0] },
      { part: 'ceiling-spot', position: [0, 4.2, -6.3], lightTarget: [0, 1.15, -5.25] },
      { part: 'ceiling-spot', position: [4.0, 4.2, -6.3], lightTarget: [4.1, 1.15, -4.8] },
      { part: 'ceiling-spot', position: [4.6, 4.2, 2.1], lightTarget: [3.65, 2.0, 3.15] },
      { part: 'vent-grille', position: [5.86, 3.4, -6], rotationY: -Math.PI / 2 },
    ],
    wallArt: [
      {
        id: 'holyoke-entry-hands',
        mediaId: 'graphic-holyoke-entry-hands',
        // Exact face datum of the rotated entry screen. The baked brass frame
        // remains in front while this flat print replaces the old vector icon.
        position: [3.274, 2.08, 3.206],
        rotationY: 2.2,
        width: 2.32,
        height: 2.55,
        presentation: 'flush',
        showCredit: false,
      },
      {
        id: 'holyoke-gym-mural',
        mediaId: 'graphic-holyoke-volleyball-demonstration',
        // The west wall is the visual terminus behind the reconstructed net.
        position: [-5.872, 2.25, -2.0],
        rotationY: Math.PI / 2,
        width: 6.8,
        height: 2.8,
        presentation: 'flush',
        showCredit: false,
      },
      {
        id: 'holyoke-building-east',
        mediaId: 'photo-holyoke-building-1902',
        position: [5.872, 2.35, 3.6],
        rotationY: -Math.PI / 2,
        width: 2.25,
        height: 2.65,
        tint: '#d8bb8c',
      },
      ...([
        ['holyoke-frieze-01', 'photo-holyoke-building-c1910', -3.82],
        ['holyoke-frieze-02', 'photo-holyoke-building-1902', -1.28],
        ['holyoke-frieze-03', 'photo-morgan-1897', 1.28],
        ['holyoke-frieze-04', 'photo-holyoke-gym-1897', 3.82],
      ] as const).map(([id, mediaId, x]) => ({
        id,
        mediaId,
        position: [x, 3.08, 7.872] as [number, number, number],
        rotationY: Math.PI,
        width: 2.35,
        height: 0.76,
        presentation: 'flush' as const,
        tint: '#c9a675',
      })),
    ],
    exhibitIds: HOLYOKE_EXHIBITS.map((exhibit) => exhibit.id),
    documentIds: ['doc-invention-date', 'doc-halstead', 'doc-rule-changes'],
    containers: HOLYOKE_CONTAINERS,
    audio: [
      {
        id: 'holyoke-clock',
        soundId: 'ambience/wall-clock',
        position: [-5.5, 2.6, 4],
        refDistance: 4,
        loop: true,
      },
    ],
  },
  {
    id: 'office',
    titleKey: 'room.office.title',
    nicknameKey: 'room.office.nickname',
    wayfinding: {
      eyebrowKey: 'room.office.sign.eyebrow',
      titleKey: 'room.office.sign.title',
      plaqueStyle: 'green',
    },
    // Small, cluttered, cosy. The one safe room, at the mouth of the hub
    // rather than at the dead end of a spoke.
    shell: { width: 6, depth: 7, height: 3.2 },
    // Back to back with the atrium's east wall, on the same reasoning as
    // Holyoke's origin above.
    origin: [12.25, 0, 3],
    palette: 'office-tungsten',
    startsPowered: false,
    powerControl: {
      id: 'office-lamp-switch',
      // The banker's lamp already carries a modelled switch on its base. It is
      // rendered here instead of in `kit` so geometry and interaction cannot
      // drift into two copies of the same object.
      part: 'desk-lamp',
      // On the leather, which stands 7 mm proud of the walnut: at 0.74 the
      // foot's 8 mm rim was buried to the brim.
      position: [0.46, 0.747, -0.62],
      rotationY: -Math.PI / 2,
      titleKey: 'power.office.title',
      pilotPosition: [0, 0.18, 0.18],
      light: {
        position: [0, 0.31, 0],
        color: '#ffb45f',
        intensity: 5,
        distance: 2.8,
      },
    },
    portals: [
      {
        id: 'office-to-atrium',
        toRoom: 'atrium',
        position: [-3, 0, 0],
        ...DOOR,
        rotationY: Math.PI / 2,
      },
    ],
    /**
     * A dense working office seen from the west doorway: desk and visitors in
     * the middle, research wall to the north, library and safe to the east.
     * The western lane remains open from the portal to the interactive lamp
     * and then turns north to the locked archive cabinet.
     */
    kit: [
      { part: 'office-rug', position: [0.65, 0, -0.15] },
      { part: 'curator-desk', position: [0.65, 0, -0.15], rotationY: -Math.PI / 2 },
      { part: 'office-chair', position: [1.55, 0, -0.15], rotationY: -Math.PI / 2 },
      { part: 'visitor-chair', position: [-0.35, 0, -0.55], rotationY: Math.PI / 2 },
      { part: 'visitor-chair', position: [-0.35, 0, 0.45], rotationY: Math.PI / 2 },
      // The ledgers and the telephone both stand on the blotter (0.747), side
      // by side: the stack used to sit 7 mm into the leather and straight
      // through the telephone. `npm run test:desk-top` keeps every desk-top
      // object on its support and out of its neighbours. (The telephone is
      // one of the room's devices since it has a dead line to say.)
      { part: 'ledger-stack', position: [0.81, 0.747, 0.32], rotationY: -1.67 },
      { part: 'office-corkboard', position: [-0.9, 1.35, -3.34] },
      { part: 'archive-trolley', position: [-0.55, 0, -2.96] },
      { part: 'office-flatfile', position: [-2.55, 0, -2.05], rotationY: Math.PI / 2 },
      // Two arrangements of books, A and B: the east wall reads A, B, A from
      // the spawn, so no two neighbours repeat; the north case is a B.
      { part: 'bookshelf-b', position: [1.55, 0, -3.18] },
      { part: 'bookshelf', position: [2.68, 0, -2.28], rotationY: -Math.PI / 2 },
      { part: 'bookshelf-b', position: [2.68, 0, -0.96], rotationY: -Math.PI / 2 },
      { part: 'bookshelf', position: [2.68, 0, 0.36], rotationY: -Math.PI / 2 },
      // The iron safe past the last bookcase is a container now
      // (`OFFICE_CONTAINERS`), with a door that swings.
      { part: 'coat-stand', position: [-2.55, 0, -1.2] },
      { part: 'wall-sconce', position: [-2.84, 1.58, -1.12], rotationY: Math.PI / 2 },
    ],
    /**
     * The south wall was the one bare plane in a room otherwise dense with
     * use. The building's plan, with the predecessor's red pencil round the
     * vault, fills it and states the long goal before any letter does.
     */
    wallArt: [
      {
        id: 'office-blueprint',
        mediaId: 'graphic-office-blueprint',
        position: [0.35, 1.62, 3.375],
        rotationY: Math.PI,
        width: 1.08,
        height: 0.72,
        presentation: 'framed',
        showCredit: false,
      },
    ],
    exhibitIds: [],
    documentIds: ['doc-welcome', 'doc-otavio-tape', 'doc-otavio-handover', 'doc-termos', 'doc-label-proof-office'],
    containers: OFFICE_CONTAINERS,
    devices: OFFICE_DEVICES,
    audio: [],
  },
] as const satisfies readonly RoomData[]

// ---------------------------------------------------------------------------

export const MUSEUM: MuseumContent = {
  spawn: SPAWN,
  rooms: ROOMS,
  exhibits: [...ATRIUM_EXHIBITS, ...HOLYOKE_EXHIBITS],
  documents: DOCUMENTS,
  locks: LOCKS,
  facts: FACTS,
  media: [...GENERATED_MEDIA, ...AUTHORED_MEDIA],
  nightClock: NIGHT_CLOCK,
  terms: TERMS,
  sequences: SEQUENCES,
  // What the house hands out or asks for, by name: the key pinned to the
  // sheet in the drawer, which opens the iron safe and stays in it.
  credentials: [
    { credential: { kind: 'tool', id: 'service-key' }, titleKey: 'credential.service-key.title', icon: 'key' },
  ],
}
