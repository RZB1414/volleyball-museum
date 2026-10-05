/**
 * From what the storage held to a save this build can play.
 *
 * One pipeline, in a fixed order: the version gate, the table of fields
 * (`progressFields.ts`), the migrations of every lot the save has not seen,
 * the renamed ids, and the stamp of this build's lot.
 *
 * What a lot changes about a save is carried by `contentLot` and a migration
 * here, never by `SAVE_VERSION`: a save of another version is read as a new
 * game, so a version bump would be the same as deleting every playthrough.
 *
 * Imports the ids of old saves and the lot, and nothing of the content: the
 * store is on the title screen (`npm run test:save` walks the imports).
 */

import { CONTENT_LOT } from '../content/contentLot.ts'
import { PRE_OPENING_SAVE, SAVE_ALIASES, type SaveAlias } from '../content/legacySave.ts'
import {
  emptyProgress,
  grantProgress,
  sanitiseProgress,
  SAVE_VERSION,
  stringList,
  withValue,
  type Progress,
} from './progressFields.ts'

/** The save a migration is repairing, as it was before the table read it. */
export type SavedAs = {
  /** What the storage held. Some questions are about what a save lacks, and the table has already filled that in. */
  readonly raw: Readonly<Record<string, unknown>>
  /** The lot the save was stamped with; 1 for a save that says none. */
  readonly savedLot: number
}

export type SaveMigration = {
  /**
   * Runs for every save stamped with this lot or an earlier one. This lot
   * included, because a lot ships in slices: the slice that brings a repair
   * has to reach the save the slice before it already stamped. A repair that
   * must only touch saves from before the lot asks `savedLot < lot` itself.
   */
  readonly lot: number
  /** Pure, idempotent, and it only adds: it will run again on the same save. */
  readonly migrate: (progress: Progress, save: SavedAs) => Progress
}

/**
 * The opening scene (2 October): a save written before it existed has no
 * `radioCalls`, and is brought forward instead of being replayed against a
 * story it predates.
 */
function preOpening(loaded: Progress, { raw: saved }: SavedAs): Progress {
  const progress = { ...loaded }
  if (!('radioCalls' in saved)) {
    // The porter's first call names the atrium's breaker as the next step;
    // with the atrium already lit, that call is history, not news.
    if (progress.roomsPowered.includes(PRE_OPENING_SAVE.firstCallOverOncePowered)) {
      progress.radioCalls = withValue(progress.radioCalls, PRE_OPENING_SAVE.firstCallId)
    }
    // A returning player already used the journal: keep it, rather than lock
    // their catalogue away behind a notebook they never saw on the desk.
    const played =
      progress.catalogued.length > 0 ||
      progress.hotspots.length > 0 ||
      progress.documentsRead.length > 0 ||
      progress.factsKnown.length > 0 ||
      progress.credentials.length > 0 ||
      progress.roomsPowered.length > 0 ||
      progress.locksOpened.length > 0
    if (played) {
      progress.documentsRead = withValue(progress.documentsRead, PRE_OPENING_SAVE.journalDocumentId)
    }
  }
  // A save without the flag list predates it, so its notebook — taken in an
  // earlier session, or just granted above — was never announced through it.
  // Announcing it on this Continue would tell the player they took something
  // just now, before they have touched anything.
  if (
    stringList(saved.hintsShown) === null &&
    progress.documentsRead.includes(PRE_OPENING_SAVE.journalDocumentId)
  ) {
    progress.hintsShown = withValue(progress.hintsShown, PRE_OPENING_SAVE.journalHintId)
  }
  return progress
}

/** In the order of the lots, which is the order they run in. */
export const SAVE_MIGRATIONS: readonly SaveMigration[] = [{ lot: 1, migrate: preOpening }]

/** What a build brings to a load. A parameter so that the rules can be proved on lists made for the purpose. */
export type SaveRules = {
  readonly migrations: readonly SaveMigration[]
  readonly aliases: readonly SaveAlias[]
  readonly contentLot: number
}

/**
 * Every renamed id the save holds, joined by its new name.
 *
 * Until nothing changes: a rename of a rename has to settle in one load
 * whichever of the two was written first, and each pass can only add.
 */
function withAliases(progress: Progress, aliases: readonly SaveAlias[]): Progress {
  let settled = progress
  for (;;) {
    const before = settled
    for (const alias of aliases) {
      if (settled[alias.field].includes(alias.from)) {
        settled = grantProgress(settled, { [alias.field]: [alias.to] })
      }
    }
    if (settled === before) return settled
  }
}

export function migrateProgressWith(raw: unknown, rules: SaveRules): Progress {
  if (!raw || typeof raw !== 'object') return emptyProgress()
  const saved = raw as Readonly<Record<string, unknown>>
  // Not ours to read: no build wrote another version, so there is no format
  // to migrate from, and reading its fields anyway would be guessing.
  if (saved.version !== SAVE_VERSION) return emptyProgress()

  let progress = sanitiseProgress(saved)
  const savedLot = progress.contentLot
  for (const migration of rules.migrations) {
    if (savedLot <= migration.lot) progress = migration.migrate(progress, { raw: saved, savedLot })
  }
  progress = withAliases(progress, rules.aliases)
  // Never down: a save a later lot wrote keeps that lot's stamp in this tab,
  // or going back to the newer build would run its migrations a second time.
  return { ...progress, contentLot: Math.max(savedLot, rules.contentLot) }
}

/**
 * Turns whatever the save holds into a valid Progress.
 *
 * Nothing, something that is not a save, or a save of another version is a
 * new game. Within the version every field is checked rather than trusted,
 * and nothing the save holds is dropped for being unknown.
 */
export function migrateProgress(raw: unknown): Progress {
  return migrateProgressWith(raw, { migrations: SAVE_MIGRATIONS, aliases: SAVE_ALIASES, contentLot: CONTENT_LOT })
}
