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
import type {
  ContainerData,
  DocumentData,
  ExhibitData,
  Fact,
  Lock,
  MuseumContent,
  RoomData,
} from './schema'

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

/**
 * Only `springfield-renaming` is wired to a lock in this slice, so only it has
 * to clear the two-independent-publishers bar. The others are catalogue
 * content and are marked honestly.
 */
const FACTS = [
  {
    id: 'springfield-renaming',
    claimKey: 'fact.springfield-renaming.claim',
    value: '1896',
    confidence: 'high',
    verifiedAt: '2026-07-30',
    usedAsCode: true,
    sources: [
      {
        title: 'Volleyball',
        url: 'https://en.wikipedia.org/wiki/Volleyball',
        publisher: 'Wikipedia',
        accessedAt: '2026-07-30',
      },
      {
        title: 'History of Volleyball',
        url: 'https://www.volleyhall.org/page/show/3821594-history-of-volleyball',
        publisher: 'International Volleyball Hall of Fame',
        accessedAt: '2026-07-30',
      },
    ],
  },
  {
    id: 'first-rulebook',
    claimKey: 'fact.first-rulebook.claim',
    value: '1897',
    confidence: 'high',
    verifiedAt: '2026-07-30',
    usedAsCode: false,
    sources: [
      {
        title: 'Official Handbook of the Athletic League of the YMCA of North America',
        url: 'https://en.wikipedia.org/wiki/Volleyball',
        publisher: 'Wikipedia',
        accessedAt: '2026-07-30',
      },
    ],
  },
  {
    id: 'filipino-spike',
    claimKey: 'fact.filipino-spike.claim',
    value: '1916',
    confidence: 'high',
    verifiedAt: '2026-07-30',
    usedAsCode: false,
    sources: [
      {
        title: 'Volleyball — history',
        url: 'https://en.wikipedia.org/wiki/Volleyball',
        publisher: 'Wikipedia',
        accessedAt: '2026-07-30',
      },
    ],
  },
  {
    id: 'six-a-side',
    claimKey: 'fact.six-a-side.claim',
    value: '1918',
    confidence: 'high',
    verifiedAt: '2026-07-30',
    usedAsCode: false,
    sources: [
      {
        title: 'Volleyball rule chronology',
        url: 'https://en.wikipedia.org/wiki/Volleyball',
        publisher: 'Wikipedia',
        accessedAt: '2026-07-30',
      },
    ],
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
    hints: STANDARD_HINTS,
    // The answer is taught by the Morgan portrait's catalogue entry and again
    // by the Springfield document — both in the Holyoke wing, which the player
    // reaches before ever needing the drawer.
    sourceExhibitId: 'portrait-morgan',
  },
] as const satisfies readonly Lock[]

// ---------------------------------------------------------------------------
// Exhibits
// ---------------------------------------------------------------------------

/**
 * Eight wall labels, the hard budget. Everything beyond this lives in the
 * archive layer behind drawers, where it costs the casual visitor nothing.
 *
 * Every exhibit carries at least one `requiredForCatalogue` hotspot: the game
 * does not count an object as catalogued unless the player actually turned it
 * over. That is what converts passive looking into active reading.
 */
const HOLYOKE_EXHIBITS = [
  {
    id: 'ball-improvised',
    era: 'holyoke',
    recipe: 'ball/basketball-bladder-1895',
    // Sits on the vitrine deck (top 0.94) — its own base is at -0.103.
    position: [-3.6, 1.043, -5.2],
    mount: 'vitrine-table',
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
    // Rests on the plinth-block, whose top the bake puts at 1.08.
    position: [0, 1.187, -5.6],
    mount: 'plinth',
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
    position: [3.8, 0, -3.0],
    rotationY: Math.PI / 2,
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
    position: [-3.6, 0.944, 0.4],
    mount: 'vitrine-table',
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
    position: [-3.6, 0.94, 2.6],
    mount: 'vitrine-table',
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
    position: [3.9, 0, 3.4],
    rotationY: -Math.PI / 2,
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
    /**
     * On the plaster, not 175 mm in front of it.
     *
     * The west wall's inner face is at local x = -5.875 (half the 12 m width,
     * less half the 0.25 m wall). This was authored at -5.7, which assumes a
     * 0.30 m inset the building does not have, so the frame hung in mid-air.
     * -5.843 puts the back of the frame against the wall.
     */
    position: [-5.843, 1.75, -2.0],
    rotationY: Math.PI / 2,
    mount: 'wall',
    titleKey: 'exhibit.portrait-morgan.title',
    labelKey: 'exhibit.portrait-morgan.label',
    catalogueKey: 'exhibit.portrait-morgan.catalogue',
    mediaId: 'photo-morgan-1897',
    threads: [],
    hotspots: [
      {
        id: 'date',
        // Reading the catalogue entry is what teaches the 1896 renaming, which
        // is the code to the office drawer.
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
    // North wall inner face is at local z = -7.875; same 175 mm float as the
    // Morgan portrait, same cause.
    position: [0, 1.85, -7.843],
    rotationY: 0,
    mount: 'wall',
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
  {
    id: 'doc-predecessor',
    era: 'office',
    kind: 'letter',
    titleKey: 'document.predecessor.title',
    bodyKey: 'document.predecessor.body',
    containerId: 'office-cabinet',
    lockId: 'office-drawer',
  },
] as const satisfies readonly DocumentData[]


// ---------------------------------------------------------------------------
// Containers
// ---------------------------------------------------------------------------

/**
 * Where the reading layer physically lives.
 *
 * Placed on the south wall, behind the player's back as they enter, so the
 * documents are somewhere the curious walk TO. Putting them on the route
 * through the gallery would make the optional layer feel compulsory.
 */
const HOLYOKE_CONTAINERS = [
  {
    id: 'holyoke-cabinet-a',
    part: 'archive-cabinet',
    position: [-2.2, 0, 7.4],
    rotationY: Math.PI,
    titleKey: 'container.holyoke-a.title',
  },
  {
    id: 'holyoke-cabinet-b',
    part: 'archive-cabinet',
    position: [-1.1, 0, 7.4],
    rotationY: Math.PI,
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
    position: [2.0, 0, -3.06],
    rotationY: 0,
    titleKey: 'container.office.title',
    lockId: 'office-drawer',
  },
] as const satisfies readonly ContainerData[]

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

const DOOR = { width: 1.6, height: 2.4 } as const

const ROOMS = [
  {
    id: 'atrium',
    titleKey: 'room.atrium.title',
    nicknameKey: 'room.atrium.nickname',
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
      position: [-8.86, 1.05, -4.4],
      rotationY: Math.PI / 2,
      titleKey: 'power.atrium.title',
    },
    portals: [
      {
        id: 'atrium-to-holyoke',
        toRoom: 'holyoke',
        position: [-9, 0, -2],
        ...DOOR,
        rotationY: Math.PI / 2,
      },
      {
        id: 'atrium-to-office',
        toRoom: 'office',
        position: [9, 0, 3],
        ...DOOR,
        rotationY: -Math.PI / 2,
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
      },
    ],
    /**
     * The medallion plinth, dead centre.
     *
     * The hub needs one strong landmark you orient by and pass repeatedly —
     * the direct analogue of the Goddess Statue in the RPD main hall. Without
     * it the atrium is an empty eighteen-metre box, which is exactly how it
     * read the first time anyone walked into it.
     *
     * Three medallions slot into it to open the vault. Nothing does yet; the
     * object exists first so the space has a centre and the later gate has
     * somewhere to live.
     */
    kit: [
      { part: 'plinth-tapered', position: [0, 0, 0] },
      { part: 'rope-stanchion', position: [-1.3, 0, -1.3] },
      { part: 'rope-stanchion', position: [1.3, 0, -1.3] },
      { part: 'rope-stanchion', position: [-1.3, 0, 1.3] },
      { part: 'rope-stanchion', position: [1.3, 0, 1.3] },
      // The 2.6 m spans between them. Four posts with nothing strung between
      // read as scaffolding; the rope is what says "do not touch".
      { part: 'rope-span', position: [0, 0, -1.3] },
      { part: 'rope-span', position: [0, 0, 1.3] },
      { part: 'rope-span', position: [-1.3, 0, 0], rotationY: Math.PI / 2 },
      { part: 'rope-span', position: [1.3, 0, 0], rotationY: Math.PI / 2 },
      { part: 'medallion-socket', position: [0, 0.98, 0] },
      { part: 'bench', position: [0, 0, 6.2], rotationY: Math.PI },
      { part: 'bench', position: [-4.8, 0, -5.8] },

      // Visitor services occupy the south half without cutting across any of
      // the three lines from the spawn to a portal.
      { part: 'reception-desk', position: [-4.2, 0, 5.0], rotationY: 0.35 },
      { part: 'donation-box', position: [3.6, 0, 5.4] },
      { part: 'vitrine-tower', position: [6.2, 0, -5.7], rotationY: -0.3 },

      // The atrium is double height. Fixtures and banners make that volume
      // legible instead of leaving five metres of blank wall over the dado.
      // The dedication occupies the centre of the north wall. Keeping its
      // banner off-axis preserves that primary wayfinding landmark.
      { part: 'banner', position: [-6.2, 5.6, -8.68] },
      { part: 'banner', position: [0, 5.6, 8.68], rotationY: Math.PI },
      { part: 'banner', position: [-8.68, 5.6, 0], rotationY: Math.PI / 2 },
      { part: 'banner', position: [8.68, 5.6, 0], rotationY: -Math.PI / 2 },
      { part: 'frame-empty', position: [8.84, 2.1, -4.5], rotationY: -Math.PI / 2 },
      { part: 'pendant', position: [0, 8.4, 0] },
      { part: 'ceiling-spot', position: [-4, 8.4, -4] },
      { part: 'ceiling-spot', position: [4, 8.4, -4] },
      { part: 'ceiling-spot', position: [-4, 8.4, 4] },
      { part: 'ceiling-spot', position: [4, 8.4, 4] },
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
        headingKey: 'sign.atrium.heading',
        bodyKey: 'sign.atrium.body',
        position: [0, 3.5, -8.85],
        rotationY: 0,
        size: 0.62,
        maxWidth: 11,
        align: 'center',
      },
    ],
    exhibitIds: [],
    documentIds: [],
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
      // Close to the entrance, but around the corner from the atrium control.
      position: [5.86, 1.05, -4.2],
      rotationY: -Math.PI / 2,
      titleKey: 'power.holyoke.title',
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
      },
    ],
    /**
     * Furniture for the wing.
     *
     * This array was empty, which is why a room holding eight objects still
     * read as a corridor with things against the walls: there was nothing
     * between them, nowhere to stand and nothing telling you where to look.
     *
     * A reading plaque goes beside every exhibit — the bake has produced
     * `label-plaque` since the first commit and no room had ever placed one, so
     * the museum had eight artefacts and zero labels. Each sits on the approach
     * side, angled towards the visitor.
     */
    kit: [
      // Vitrine run down the west wall: a plaque at the corner of each case.
      { part: 'label-plaque', position: [-2.75, 0, -5.2], rotationY: -Math.PI / 2 },
      { part: 'label-plaque', position: [-2.75, 0, 0.4], rotationY: -Math.PI / 2 },
      { part: 'label-plaque', position: [-2.75, 0, 2.6], rotationY: -Math.PI / 2 },
      // The 1897 net is the wing's centrepiece and the one thing a visitor
      // would instinctively touch, so it gets the same rope treatment as the
      // atrium plinth.
      { part: 'rope-stanchion', position: [2.2, 0, -4.4] },
      { part: 'rope-stanchion', position: [2.2, 0, -1.8] },
      { part: 'rope-span', position: [2.2, 0, -3.1], rotationY: Math.PI / 2 },

      // Somewhere to sit and look, facing the vitrine wall. A gallery without
      // a bench tells the visitor not to linger.
      { part: 'bench', position: [-0.4, 0, 0.4], rotationY: -Math.PI / 2 },
      { part: 'bench', position: [-0.4, 0, 2.8], rotationY: -Math.PI / 2 },

      // Cases now articulate the west wall. Their geometry is authored from
      // y=0, so 0.75 is the explicit sill datum rather than a hidden offset.
      { part: 'vitrine-wall', position: [-5.86, 0.75, -4.0], rotationY: Math.PI / 2 },
      { part: 'vitrine-wall', position: [-5.86, 0.75, 1.2], rotationY: Math.PI / 2 },
      { part: 'vitrine-tower', position: [4.7, 0, -6.5], rotationY: -0.2 },

      // The two freestanding partitions prevent the whole wing being read in
      // one glance while leaving a generous route around both ends.
      { part: 'partition', position: [1.8, 0, -0.6], rotationY: 0.52 },
      { part: 'partition', position: [-2.2, 0, 1.8], rotationY: -0.44 },
      { part: 'interp-panel', position: [1.4, 0, -6.2], rotationY: 0.2 },

      // Angled labels belong to the floor-standing hero objects; the existing
      // low plaques continue to serve the table cases.
      { part: 'label-angled', position: [1.0, 0, -5.35], rotationY: -0.35 },
      { part: 'label-angled', position: [2.75, 0, -4.55], rotationY: -0.8 },
      { part: 'label-angled', position: [3.0, 0, 4.45], rotationY: Math.PI },

      { part: 'ceiling-spot', position: [0, 4.2, -4] },
      { part: 'ceiling-spot', position: [0, 4.2, 4] },
      { part: 'vent-grille', position: [5.86, 3.4, -6], rotationY: -Math.PI / 2 },
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
      position: [1.0, 0.74, -1.55],
      rotationY: Math.PI,
      titleKey: 'power.office.title',
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
    /** Purpose-built furniture makes this the safe room, not another gallery. */
    kit: [
      { part: 'curator-desk', position: [0.4, 0, -1.4], rotationY: Math.PI },
      { part: 'office-chair', position: [0.4, 0, -0.5] },
      { part: 'ledger-stack', position: [0.1, 0.74, -1.38], rotationY: -0.1 },
      { part: 'bookshelf', position: [2.68, 0, 1.7], rotationY: -Math.PI / 2 },
      { part: 'ceiling-spot', position: [0, 3.2, 0] },
      { part: 'wall-sconce', position: [-1.5, 1.65, -3.34] },
    ],
    exhibitIds: [],
    documentIds: ['doc-predecessor'],
    containers: OFFICE_CONTAINERS,
    audio: [],
  },
] as const satisfies readonly RoomData[]

// ---------------------------------------------------------------------------

export const MUSEUM: MuseumContent = {
  rooms: ROOMS,
  exhibits: HOLYOKE_EXHIBITS,
  documents: DOCUMENTS,
  locks: LOCKS,
  facts: FACTS,
  media: GENERATED_MEDIA,
}
