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

// ---------------------------------------------------------------------------
// Facts — the canonical store
// ---------------------------------------------------------------------------

export type FactSource = {
  readonly title: string
  readonly url: string
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
  | 'floor'

export type ExhibitData = {
  readonly id: string
  readonly era: EraId
  /** Which baked geometry to instance, e.g. 'ball/spalding-laced-1900'. */
  readonly recipe: string
  readonly position: Vec3
  readonly rotationY?: number
  readonly mount: ExhibitMount
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
// Documents — the reading layer
// ---------------------------------------------------------------------------

export type DocumentData = {
  readonly id: string
  readonly era: EraId
  readonly kind: 'letter' | 'minutes' | 'clipping' | 'telegram' | 'scorecard' | 'oral-history'
  readonly titleKey: string
  readonly bodyKey: string
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
  | 'ledger-stack'

/**
 * Wall lettering.
 *
 * Real galleries carry their curatorial voice as vinyl on plaster, and it is
 * the cheapest thing in the building: no geometry, no texture, no draw call
 * worth counting. It is also the only way an eighteen-metre blank wall stops
 * being a blank wall without inventing an exhibit to hang on it.
 *
 * `rotationY` is the wall's facing — the direction the text reads towards.
 */
export type WallSign = {
  readonly id: string
  readonly headingKey: string
  readonly bodyKey?: string
  readonly position: Vec3
  readonly rotationY: number
  /** Cap height of the heading, in metres. Body copy is derived from it. */
  readonly size?: number
  /** Wrap width in metres. Long dedications need a measure; titles do not. */
  readonly maxWidth?: number
  readonly align?: 'left' | 'center'
}

export type KitPlacement = {
  readonly part: KitPartId
  readonly position: Vec3
  readonly rotationY?: number
  /** Uniform scale only — non-uniform breaks the shared bevel profile. */
  readonly scale?: number
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
}

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
  /** Vinyl lettering applied to a wall. Text, not geometry — see `WallSignage`. */
  readonly signage?: readonly WallSign[]
  readonly exhibitIds: readonly string[]
  readonly documentIds: readonly string[]
  readonly containers?: readonly ContainerData[]
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

export type MuseumContent = {
  readonly rooms: readonly RoomData[]
  readonly exhibits: readonly ExhibitData[]
  readonly documents: readonly DocumentData[]
  readonly locks: readonly Lock[]
  readonly facts: readonly Fact[]
  readonly media: readonly MediaAsset[]
}
