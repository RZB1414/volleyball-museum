/**
 * The content schema.
 *
 * This file is the architectural spine of the project. The previous build's
 * actual disease was geometry, decor and furniture positions living as
 * constants inside 900-line components; at ten rooms that becomes unworkable.
 * Here a room is DATA: a shell, a list of kit placements, portals, exhibits and
 * emitters. The bake script reads it, the runtime reads the emitted manifest,
 * and adding a wing is authoring a data module — not writing a component.
 *
 * Authored as TypeScript rather than JSON on purpose: `satisfies` gives us
 * compile-time validation of the lock graph, the fact references and the
 * attribution records, which is the cheapest QA gate available to an agent that
 * cannot see the result.
 */

export type Vec3 = [x: number, y: number, z: number]
export type Vec2 = [x: number, y: number]

// ---------------------------------------------------------------------------
// Media and attribution
// ---------------------------------------------------------------------------

/**
 * Every image and document scan in the museum carries its licence with it, and
 * the credit renders directly beneath the artwork in world space as well as on
 * the credits wall. This is not decoration: a volleyball museum is built almost
 * entirely on other people's photographs, and an unattributed CC-BY image is a
 * licence breach, not an oversight.
 *
 * The four routes in use, in order of preference:
 *   1. `public-domain` — US works published before 1931 are PD in 2026. This
 *      covers the Holyoke wing and essentially nothing after it.
 *   2. `cc-by` / `cc-by-sa` / `cc0` — Wikimedia Commons and equivalents.
 *   3. `procedural` — authored by the bake script when nothing licensable
 *      exists. Halftone reconstructions, contour diagrams, silhouettes, data
 *      visualisations.
 */
export type MediaCredit =
  | {
      readonly license: 'procedural'
      /** Which bake generator produced it, e.g. 'halftone/court-diagram'. */
      readonly generator: string
    }
  | {
      readonly license: 'public-domain'
      readonly title: string
      readonly author?: string
      readonly year: string
      readonly sourceUrl: string
      /** Why it is PD — shown in the credits wall, e.g. 'US work published 1916'. */
      readonly reason: string
    }
  | {
      readonly license: 'cc0' | 'cc-by-2.0' | 'cc-by-3.0' | 'cc-by-4.0' | 'cc-by-sa-3.0' | 'cc-by-sa-4.0'
      /** TASL: Title. Required by every CC licence's attribution clause. */
      readonly title: string
      /** TASL: Author, exactly as the source names them. */
      readonly author: string
      /** TASL: Source — the canonical page, not the raw file URL. */
      readonly sourceUrl: string
      /** TASL: Licence deed URL. */
      readonly licenseUrl: string
      /** Required by CC if the work was altered (cropped, recoloured, traced). */
      readonly modifications?: string
    }

export type MediaAsset = {
  readonly id: string
  readonly kind: 'photograph' | 'document-scan' | 'diagram'
  /** Path under /textures, content-hashed by the bake. */
  readonly src: string
  /** width / height. Drives the frame geometry so nothing is stretched. */
  readonly aspect: number
  readonly credit: MediaCredit
}

/** Literal id union from fetched archives and project-authored imagery. */
export type GeneratedMediaId =
  | (typeof import('./media.generated.ts').GENERATED_MEDIA)[number]['id']
  | (typeof import('./media.authored.ts').AUTHORED_MEDIA)[number]['id']

// ---------------------------------------------------------------------------
// Facts — the canonical store
// ---------------------------------------------------------------------------

/**
 * What the game prints of a source. None of the four is free text: each is
 * checked against the reading of that page recorded by `npm run facts:capture`
 * (`factCapture.ts`), so a source cannot be typed from memory.
 */
export type FactSource = {
  /** The page's own title. */
  readonly title: string
  readonly url: string
  /** The registered owner of the URL's host. */
  readonly publisher: string
  /** ISO date the source was actually read. */
  readonly accessedAt: string
}

/**
 * Knowledge locks make history FUNCTIONAL: the code to a cabinet is a year the
 * player has to learn. That turns a wrong date from an editorial embarrassment
 * into a soft-lock, so facts get a real pipeline.
 *
 * Enforced by `validateFacts()` at build time:
 *   `usedAsCode` requires `confidence: 'high'` AND at least two independent
 *   sources. The adversarial fact-check pass on the source research found 109
 *   corrections across 199 milestones — roughly a 50% pre-verification error
 *   rate — which is exactly why this gate exists.
 *
 * And by `validateFactCaptures()`: "independent" and "source" are not taken on
 * the content's word. The two publishers have to be pages that were read and
 * hold the value (`fact-code-uncaptured`), and every source any fact cites,
 * code or not, has to be one of those readings (`fact-source-uncaptured`).
 */
export type Fact = {
  readonly id: string
  /** i18n key for the human-readable claim, e.g. 'fact.olympic-debut.claim'. */
  readonly claimKey: string
  /** The answer. Always a string of digits when `usedAsCode` — see below. */
  readonly value: string
  readonly sources: readonly FactSource[]
  readonly confidence: 'high' | 'medium' | 'low'
  readonly verifiedAt: string
  /**
   * Whether a lock resolves to this fact. Codes must be NUMERIC: the museum
   * ships in pt-BR and en, and a word-based answer cannot survive translation.
   */
  readonly usedAsCode: boolean
}

// ---------------------------------------------------------------------------
// Progression
// ---------------------------------------------------------------------------

/** The four Tier-1 named keys. Seeing one tells the player three more exist. */
export type BadgeId = 'indoor' | 'beach' | 'sitting' | 'snow'

/** Tier-2 emblem set: three medallions slot into the atrium plinth. */
export type MedallionId = 'founding' | 'olympic' | 'global'

/** Tier-3 traversal tools. */
export type ToolId = 'service-key' | 'breaker-handle' | 'crate-dolly' | 'step-ladder'

/** The cross-cutting threads that make the map a spiral instead of a line. */
export type ThreadId = 'ball' | 'net' | 'rules' | 'beach' | 'sitting'

export type Credential =
  | { readonly kind: 'badge'; readonly id: BadgeId }
  | { readonly kind: 'medallion'; readonly id: MedallionId }
  | { readonly kind: 'tool'; readonly id: ToolId }

/**
 * A knowledge lock that cannot be escaped is a quiz that fails the casual
 * visitor — the exact anti-pattern the design names as fatal. Every one gets an
 * escalating in-world hint ladder so it reads as "go read that panel", never as
 * "you may not enter". It never fails the player; it waits.
 */
export type HintLadder = {
  /** The relevant line on the source plaque begins to glow. */
  readonly highlightAfterMs: number
  /** The docent recording repeats the answer. */
  readonly audioAfterMs: number
  /** The dial clicks onto the correct digit. */
  readonly revealAfterAttempts: number
}

export type Lock =
  | {
      readonly kind: 'badge'
      readonly id: string
      readonly requires: BadgeId
      /** Auto-annotated on the map the moment the player touches the lock. */
      readonly mapLabelKey: string
    }
  | {
      readonly kind: 'medallion-plinth'
      readonly id: string
      readonly requires: readonly MedallionId[]
      readonly mapLabelKey: string
    }
  | {
      readonly kind: 'tool'
      readonly id: string
      readonly requires: ToolId
      /** Consumed on use, like RE4R's Small Keys. */
      readonly consumesTool: boolean
      readonly mapLabelKey: string
    }
  | {
      readonly kind: 'knowledge'
      readonly id: string
      /** Must resolve to a Fact with usedAsCode: true. */
      readonly factId: string
      readonly digits: number
      readonly mapLabelKey: string
      readonly hints: HintLadder
      /** The exhibit or document where the answer is discoverable in-world. */
      readonly sourceExhibitId: string
    }
  | {
      readonly kind: 'ritual'
      readonly id: string
      /** e.g. 'chronological-order' | 'match-ball-to-decade'. */
      readonly puzzle: string
      readonly mapLabelKey: string
      readonly hints: HintLadder
    }

export type UnlockEffect =
  | { readonly kind: 'grant-credential'; readonly credential: Credential }
  | { readonly kind: 'open-lock'; readonly lockId: string }
  | { readonly kind: 'power-room'; readonly roomId: string }
  | { readonly kind: 'reveal-document'; readonly documentId: string }

// ---------------------------------------------------------------------------
// Exhibits
// ---------------------------------------------------------------------------

/**
 * Examine-to-rotate is the core verb and the place the teaching happens. The
 * information is on the BACK: the maker's mark, the panel count, the valve
 * type, the handwriting on the reverse of the photograph.
 *
 * Rule copied verbatim from Resident Evil: the game does not count an object as
 * catalogued unless the player actually turned it over. A hotspot with
 * `requiredForCatalogue` enforces that.
 */
export type ExamineHotspot = {
  readonly id: string
  /** Position on the object in its own local space, metres. */
  readonly localPosition: Vec3
  readonly labelKey: string
  /** Discovering this hotspot reveals a Fact — often a lock code. */
  readonly revealsFactId?: string
  readonly requiredForCatalogue: boolean
}

export type ExhibitMount =
  | 'plinth'
  | 'vitrine-tower'
  | 'vitrine-table'
  | 'wall'
  | 'case-wall'
  | 'floor'

export type ExhibitData = {
  readonly id: string
  readonly era: EraId
  /** Which baked geometry to instance, e.g. 'ball/spalding-laced-1900'. */
  readonly recipe: string
  readonly position: Vec3
  readonly rotationY?: number
  /** Uniform presentation scale; hotspots remain in the recipe's local space. */
  readonly scale?: number
  readonly mount: ExhibitMount
  /**
   * Height of a support surface supplied by surrounding kit rather than by the
   * mount itself (for example a built-in case shelf or glazed wall niche).
   */
  readonly supportY?: number
  /** Wall label: headline. */
  readonly titleKey: string
  /** Wall label body — budget ~40 words, max 8 labels per gallery. */
  readonly labelKey: string
  /** The catalogue entry, unlocked only by a complete examine. */
  readonly catalogueKey: string
  readonly mediaId?: string
  readonly hotspots: readonly ExamineHotspot[]
  readonly threads: readonly ThreadId[]
  readonly unlocks?: readonly UnlockEffect[]
}

// ---------------------------------------------------------------------------
// Progress conditions
// ---------------------------------------------------------------------------

/**
 * A question about the save, asked by content rather than by code.
 *
 * The opening scene needs a radio that speaks when a room comes back, a hint
 * that changes with the player's progress and a checklist that ticks itself.
 * Writing each of those as a runtime branch would put story in components; a
 * condition keeps it in this file, where the validator can check every id it
 * names. Every listed requirement must hold; an empty condition always holds.
 */
export type ProgressCondition = {
  readonly powered?: readonly EraId[]
  readonly unpowered?: readonly EraId[]
  readonly locksOpened?: readonly string[]
  readonly locksClosed?: readonly string[]
  readonly documentsRead?: readonly string[]
  /**
   * None of these has been read yet. The reading layer stays optional, so
   * nothing is locked behind the director's notebook; this is how the porter
   * notices a player who walked past it and tells them to go back.
   */
  readonly documentsUnread?: readonly string[]
  /**
   * The player carries all of these devices (`carriedOnUse`): how the porter
   * notices his radio leaving the desk and tells the player how to call him.
   */
  readonly carried?: readonly string[]
  /** Every room in the museum has its electricity back. */
  readonly allRoomsPowered?: boolean
  /** Every exhibit in the museum is catalogued. */
  readonly allCatalogued?: boolean
}

// ---------------------------------------------------------------------------
// Documents — the reading layer
// ---------------------------------------------------------------------------

/** One line of a notebook checklist; ticked by the game when `doneWhen` holds. */
export type ChecklistItem = {
  readonly labelKey: string
  readonly doneWhen?: ProgressCondition
}

/**
 * One page of a bound notebook.
 *
 * Pages are separate records rather than one long body because a notebook is
 * read by turning pages: the welcome printed on the flyleaf, a handwritten
 * letter, a to-do list. Each one keeps its own typography and the reader never
 * scrolls a letter that was written to fit a page.
 */
export type NotebookPage = {
  readonly style: 'printed' | 'handwritten' | 'checklist'
  readonly headingKey?: string
  readonly bodyKey?: string
  readonly signatureKey?: string
  readonly postscriptKey?: string
  readonly items?: readonly ChecklistItem[]
}

export type DocumentData = {
  readonly id: string
  readonly era: EraId
  readonly kind:
    | 'letter'
    | 'minutes'
    | 'clipping'
    | 'telegram'
    | 'scorecard'
    | 'oral-history'
    | 'notebook'
  readonly titleKey: string
  /** The body, or for a paged notebook the one-line summary the archive lists. */
  readonly bodyKey: string
  /** A paged document opens on its first page in the notebook reader. */
  readonly pages?: readonly NotebookPage[]
  /** Oral history plays while the player keeps walking — depth never stops the game. */
  readonly audioId?: string
  readonly mediaId?: string
  /** The physical furniture holding it: a drawer, a filing cabinet, a desk. */
  readonly containerId: string
  /** Set when the container is locked. Gates the DEPTH layer, never a gallery. */
  readonly lockId?: string
  readonly revealsFactId?: string
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export type EraId =
  | 'atrium'
  | 'holyoke'      // 1895-1929
  | 'paris'        // 1930-1949
  | 'tokyo'        // 1950-1969
  | 'iron-sand'    // 1970-1989
  | 'rewrite'      // 1990-1999
  | 'global'       // 2000-today
  | 'office'       // the curator's office, the one safe room
  | 'vault'

/**
 * Kit parts are baked once and instanced everywhere. One kit for the whole
 * building; each era varies ONLY palette, light temperature, floor material and
 * hero prop. Period pastiche across six eras would cost roughly four times the
 * art and drift badly — this is a contemporary museum ABOUT each era.
 */
export type KitPartId =
  | 'plinth-block'
  | 'plinth-tapered'
  | 'medallion-socket'
  | 'vitrine-table'
  | 'vitrine-glass'
  | 'vitrine-wall'
  | 'vitrine-tower'
  | 'label-plaque'
  | 'wayfinding-plaque-navy'
  | 'wayfinding-plaque-green'
  | 'wayfinding-plaque-walnut'
  | 'dedication-plaque'
  | 'label-angled'
  | 'interp-panel'
  | 'banner'
  | 'bench'
  | 'partition'
  | 'rope-stanchion'
  | 'rope-span'
  | 'frame-empty'
  | 'reception-desk'
  | 'donation-box'
  | 'archive-cabinet'
  | 'door-leaf'
  | 'door-leaf-right'
  | 'threshold'
  | 'ceiling-spot'
  | 'pendant'
  | 'wall-sconce'
  | 'vent-grille'
  | 'breaker-panel'
  | 'curator-desk'
  | 'office-chair'
  | 'desk-lamp'
  | 'bookshelf'
  | 'bookshelf-b'
  | 'ledger-stack'
  | 'office-rug'
  | 'office-corkboard'
  | 'office-flatfile'
  | 'archive-trolley'
  | 'office-safe'
  | 'visitor-chair'
  | 'coat-stand'
  | 'holyoke-entry-screen'
  | 'history-case-run'
  | 'history-hero-case'
  | 'history-info-kiosk'
  | 'gym-court-lines'
  | 'gym-training-set'
  | 'atrium-floor-inlay'
  | 'atrium-reception-desk'
  | 'atrium-wall-bay'
  | 'atrium-wall-bay-plain'
  | 'atrium-central-podium'
  | 'atrium-display-tower'
  | 'atrium-ceiling-coffer'
  | 'atrium-pin-pendant'
  | 'atrium-aerial-installation'
  | 'atrium-banner-hardware'
  | 'atrium-sofa'
  | 'atrium-lectern'
  | 'atrium-divider-screen'
  | 'atrium-barrier-segment'
  | 'atrium-lounge-set'
  | 'atrium-display-console'
  | 'curator-notebook'
  | 'desk-radio'
  | 'desk-telephone'
  | 'office-wall-clock'
  | 'door-access-panel'

/**
 * Architectural wall copy.
 *
 * Minor copy may remain vinyl on plaster; major copy uses a baked substrate.
 * The words stay runtime data either way, so localisation never has to be
 * baked into geometry.
 *
 * `rotationY` is the wall's facing — the direction the text reads towards.
 */
export type WayfindingPlaqueStyle = 'navy' | 'green' | 'walnut'

/** Art-directed hierarchy for the sign that names a room at its entrances. */
export type RoomWayfinding = {
  readonly eyebrowKey?: string
  /** Defaults to RoomData.titleKey when omitted. */
  readonly titleKey?: string
  readonly subtitleKey?: string
  readonly plaqueStyle: WayfindingPlaqueStyle
}

/** A portal may suppress or override the destination's default wayfinding. */
export type PortalSign = false | {
  readonly eyebrowKey?: string
  readonly titleKey?: string
  readonly subtitleKey?: string
  readonly plaqueStyle?: WayfindingPlaqueStyle
}

export type WallSign = {
  readonly id: string
  readonly eyebrowKey?: string
  readonly headingKey: string
  readonly bodyKey?: string
  readonly position: Vec3
  readonly rotationY: number
  /** Applied vinyl remains available; major copy belongs on a physical panel. */
  readonly presentation?: 'vinyl' | 'dedication-plaque'
  readonly width?: number
  readonly height?: number
  /** Cap height of the heading, in metres. Body copy is derived from it. */
  readonly size?: number
  /** Wrap width in metres. Long dedications need a measure; titles do not. */
  readonly maxWidth?: number
  readonly align?: 'left' | 'center'
}

/**
 * A non-interactive photograph or document mounted directly on a room wall.
 *
 * `position` is the centre of the mount's BACK face. `rotationY` turns local
 * +Z towards the room, following the same convention as FramedMedia and wall
 * signage. Width and height describe the visible image, not its outer frame.
 */
export type WallArtData = {
  readonly id: string
  readonly mediaId: GeneratedMediaId
  readonly position: Vec3
  readonly rotationY: number
  readonly width: number
  readonly height: number
  /** Large photographic murals and friezes are printed flush to the wall. */
  readonly presentation?: 'framed' | 'thin-framed' | 'flush'
  /** Multiplied into the print material for restrained room-specific grading. */
  readonly tint?: string
  /** Subtle self-illumination for internally lit or very dimly spotlit graphics. */
  readonly selfIllumination?: number
  /** Procedural/project-authored graphics need no legal credit beneath them. */
  readonly showCredit?: boolean
}

export type KitPlacement = {
  readonly part: KitPartId
  readonly position: Vec3
  readonly rotationY?: number
  /** Uniform scale only — non-uniform breaks the shared bevel profile. */
  readonly scale?: number
  /** Optional local-space aim point for a practical ceiling fixture. */
  readonly lightTarget?: Vec3
}

/**
 * A physical control that restores one room's electricity.
 *
 * The control belongs to the room it powers, so adding a wing does not require
 * a second graph of target ids. It is a kit recipe with the same placement
 * convention as furniture, but lives separately because it also carries the
 * interaction identity and copy the runtime needs.
 */
export type PowerControlData = {
  readonly id: string
  readonly part: KitPartId
  readonly position: Vec3
  readonly rotationY?: number
  readonly scale?: number
  readonly titleKey: string
  /** Local position of the always-mounted red locator while power is off. */
  readonly pilotPosition: Vec3
  /** Optional practical light emitted by the control itself when powered. */
  readonly light?: {
    readonly position: Vec3
    readonly color: string
    readonly intensity: number
    readonly distance: number
  }
}

/**
 * Portals drive three things at once: cell-and-portal culling (~80 lines, and
 * it reduces a six-wing museum to 1-3 visible rooms), the door beat, and room
 * streaming prefetch.
 */
export type Portal = {
  readonly id: string
  readonly toRoom: EraId
  /** Centre of the opening, in the room's local space. */
  readonly position: Vec3
  readonly width: number
  readonly height: number
  readonly rotationY: number
  /** Omit for the destination room's default sign; false hides this face. */
  readonly sign?: PortalSign
  /**
   * Optional physical transition door owned by this portal declaration.
   * Reciprocal portals share the same opening, so exactly one side authors the
   * leaf; the runtime keeps its state available from either connected room.
   */
  readonly transitionDoor?: {
    readonly style: 'double-panel'
    /** Seconds from the first hinge movement until the opening is clear. */
    readonly openDuration: number
    /** Seconds from the first closing movement until the latch is seated. */
    readonly closeDuration: number
    /** Metres beyond the swept leaves before automatic closing may start. */
    readonly closeDistance: number
    /** Distance at which the destination starts warming, before interaction. */
    readonly warmDistance: number
    /** Optional side that may release a one-way shortcut for the first time. */
    readonly opensFrom?: EraId
    /**
     * An electric lock: the leaves stay latched until this room has power.
     *
     * It must name one of the door's two rooms, and that room's own control
     * must be reachable without passing through this door — the solvability
     * gate proves both.
     */
    readonly requiresPower?: EraId
  }
  readonly lockId?: string
  /** A one-way shortcut: openable only from `toRoom`. The cheapest and
   *  strongest primitive of spatial comprehension a level designer has. */
  readonly oneWay?: boolean
}

/**
 * A piece of furniture that holds documents.
 *
 * The reading layer is the museum's optional depth, and putting it in drawers
 * rather than on the wall is what lets a four-minute visit skip it without
 * feeling like it missed the point. Documents name a container; the container
 * says where it physically stands.
 */
export type ContainerData = {
  readonly id: string
  /** Kit part to instance, e.g. 'archive-cabinet'. */
  readonly part: string
  readonly position: Vec3
  readonly rotationY?: number
  readonly titleKey: string
  /** Set when the container itself is locked. */
  readonly lockId?: string
  /**
   * `drawer` (the default) reads every document at once and is targeted by a
   * chest-high volume, which is right for a cabinet. `notebook` turns pages
   * and is targeted by its own small bounds: a chest-high box around a book
   * on a desk would swallow the lamp and everything else beside it.
   */
  readonly presentation?: 'drawer' | 'notebook'
  /**
   * Reading it puts the curator's notebook in the visitor's hands: the object
   * leaves the desk and the journal (map, catalogue, archive) opens from then
   * on. Until one such container is read, there is no journal to open.
   */
  readonly carriesJournal?: boolean
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

/** One message on the porter's radio. Lines are shown one after another. */
export type RadioCall = {
  readonly id: string
  /** Fires once, the first time this holds while the radio has power. */
  readonly when: ProgressCondition
  /** Seconds between the condition becoming true and the call arriving. */
  readonly delaySeconds: number
  readonly lineKeys: readonly string[]
}

/** What the porter says when called; the first entry whose condition holds wins. */
export type RadioHint = {
  readonly when: ProgressCondition
  readonly lineKeys: readonly string[]
  /** The same help, said by someone who has run out of patience. */
  readonly curtLineKeys?: readonly string[]
}

/**
 * One whole answer from the porter: an opener said before the hint, with an
 * optional closing line after it. Every variant is an object rather than a
 * bare list of lists, so the translation gate's walk reaches its keys.
 */
export type RadioReply = {
  /** Unique per radio: the save remembers the last one to avoid repeating it. */
  readonly id: string
  readonly lineKeys: readonly string[]
  readonly closingKeys?: readonly string[]
}

/** He loses his temper: the whole answer, with no hint in it. */
export type RadioOutburst = {
  readonly id: string
  readonly lineKeys: readonly string[]
  /** He hangs up: the radio gives only static for `hangUpSeconds`. */
  readonly hangsUp: boolean
}

export type RadioPatienceTier = {
  /**
   * The call, counted since he last calmed down and starting at 1, from which
   * this tier answers. The first tier starts at 1.
   */
  readonly fromCall: number
  /** Whether the hint is said in full or curtly. It is always said. */
  readonly hint: 'full' | 'curt'
  /** Never empty: there is always an answer that helps. */
  readonly replies: readonly RadioReply[]
  readonly outbursts?: readonly RadioOutburst[]
  /**
   * 0 to 1. Never two outbursts in a row, and never on a call that follows
   * real progress: the player who did something deserves the answer.
   */
  readonly outburstChance?: number
}

/**
 * How a radio's voice runs out of patience with a player who keeps calling.
 *
 * The count follows the player's own pace: each call adds one to his temper,
 * real minutes of silence take it away again, and progress since the last
 * call forgives one more — and earns a word of praise instead of a dig.
 */
export type RadioPatience = {
  readonly tiers: readonly RadioPatienceTier[]
  /** Real seconds of silence that take one call off his temper. */
  readonly calmSecondsPerCall: number
  /** Calls forgiven when the hint he would give has changed since last time. */
  readonly progressForgives: number
  /** Said before the hint when there has been progress since the last call. */
  readonly praise?: readonly RadioReply[]
  readonly hangUpSeconds: number
  /** Who "speaks" the static after he hangs up: the radio, not him. */
  readonly deadAirSpeakerKey: string
  readonly deadAir: readonly RadioReply[]
}

type DevicePlacement = {
  readonly id: string
  readonly part: KitPartId
  /** Room-local, on the support or wall datum like any kit placement. */
  readonly position: Vec3
  readonly rotationY?: number
}

/**
 * Small working objects with state: they read power and progress, and change
 * how they look. They are not interaction-free furniture (`kit`), not reading
 * containers and not the room's own power control, so they get their own list.
 *
 * Each kind's runtime contract lives on node names checked by the validator:
 * a clock needs `<part>__hand-hour|minute|second` and `<part>__dial`, every
 * lit device needs `<part>__led`, and a radio the player carries away needs
 * `<part>__handset` (with its `__handset-*` families) to leave its cradle.
 */
export type DeviceData =
  | (DevicePlacement & {
      readonly kind: 'clock'
      /** The time the hands show while stopped, 24-hour. */
      readonly stoppedAt: { readonly hours: number; readonly minutes: number }
      /** A mains clock: it starts running, from where it stopped, with this room. */
      readonly runsWithPowerOf: EraId
    })
  | (DevicePlacement & {
      readonly kind: 'power-indicator'
      /** Red until this room has electricity, then green with an audible latch. */
      readonly showsPowerOf: EraId
    })
  | (DevicePlacement & {
      readonly kind: 'radio'
      readonly titleKey: string
      readonly speakerKey: string
      /** The charger: no power, no reception and no way to call out. */
      readonly poweredBy: EraId
      readonly calls: readonly RadioCall[]
      readonly hints: readonly RadioHint[]
      /**
       * Like a journal-carrying notebook: the first use takes the handset off
       * its charger, and from then on the player calls from anywhere. Needs a
       * baked `<part>__handset` node, which leaves while the cradle stays.
       */
      readonly carriedOnUse?: boolean
      /** Without it, every call is answered with the bare hint. */
      readonly patience?: RadioPatience
    })

export type AudioEmitter = {
  readonly id: string
  readonly soundId: string
  readonly position: Vec3
  readonly refDistance: number
  readonly loop: boolean
}

export type PaletteId =
  | 'holyoke-gaslight'
  | 'paris-deco'
  | 'tokyo-concrete'
  | 'iron-curtain'
  | 'california-sand'
  | 'nineties-broadcast'
  | 'global-led'
  | 'office-tungsten'
  | 'atrium-neutral'

export type RoomData = {
  readonly id: EraId
  readonly titleKey: string
  /**
   * Players navigate by phrases like "the room with the cracked leather ball",
   * not by cardinal directions. If a space cannot be nicknamed, it is a
   * corridor — shorten it or give it an identity.
  */
  readonly nicknameKey: string
  /** Physical wayfinding shown over portals that lead to this room. */
  readonly wayfinding?: RoomWayfinding
  readonly shell: {
    readonly width: number
    readonly depth: number
    readonly height: number
  }
  /** World-space origin of this room's local space. */
  readonly origin: Vec3
  readonly palette: PaletteId
  readonly portals: readonly Portal[]
  readonly kit: readonly KitPlacement[]
  /** Localised architectural copy — see `RoomSignage`. */
  readonly signage?: readonly WallSign[]
  /** Licensed imagery mounted on walls, independent of interactive exhibits. */
  readonly wallArt?: readonly WallArtData[]
  readonly exhibitIds: readonly string[]
  readonly documentIds: readonly string[]
  readonly containers?: readonly ContainerData[]
  readonly devices?: readonly DeviceData[]
  readonly audio: readonly AudioEmitter[]
  /** Unlit rooms are the progression language: unlit === unexplored. */
  readonly startsPowered: boolean
  /** The physical switch rendered and targeted when this room is unpowered. */
  readonly powerControl?: PowerControlData
  /** Restoring power is the reward beat — which lock does it. */
  readonly powerLockId?: string
}

// ---------------------------------------------------------------------------
// The assembled museum
// ---------------------------------------------------------------------------

/**
 * Where a session begins: a room, a room-local point on its floor and the
 * initial heading (radians, three's convention: 0 faces -Z, PI/2 faces -X).
 */
export type SpawnData = {
  readonly room: EraId
  readonly position: Vec3
  readonly yaw: number
}

export type MuseumContent = {
  readonly spawn: SpawnData
  readonly rooms: readonly RoomData[]
  readonly exhibits: readonly ExhibitData[]
  readonly documents: readonly DocumentData[]
  readonly locks: readonly Lock[]
  readonly facts: readonly Fact[]
  readonly media: readonly MediaAsset[]
}
