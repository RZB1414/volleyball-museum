/**
 * Where the repository is, for the measurement scripts.
 *
 * These scripts were written in a scratch directory outside the repository,
 * and each carried the absolute path of the one checkout it was pointed at, so
 * they ran on one machine only. Resolving the root from this file's own
 * location is what lets them run from any clone and from any working
 * directory.
 */

import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** The repository root: this file lives in `scripts/audit/lib`. */
export const REPO = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..')

/** An absolute path inside the repository. */
export const inRepo = (...segments) => resolve(REPO, ...segments)

/**
 * Imports a module by its path from the repository root.
 *
 * Through a file URL rather than a relative specifier, so a script reads the
 * same whether it sits in `scripts/audit` or one level down.
 */
export const load = (relative) => import(pathToFileURL(inRepo(relative)).href)
