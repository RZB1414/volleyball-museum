/**
 * Which dictionary keys the code cites.
 *
 * The content gate already knows the keys the content names (every `…Key`
 * field). The ones a component asks for by hand, `t('prompt.examine')`, are
 * only in the source, so the gate reads the source: a key that neither side
 * cites is copy somebody translated twice for a screen that does not exist.
 *
 * A citation is the key as one whole quoted literal. Nothing in `src/` builds
 * a key out of pieces today; code that starts doing so will see its keys
 * accused here, which is the moment to give that piece of interface a table
 * of whole keys instead.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

export type SourceFile = { readonly path: string; readonly text: string }

/**
 * Where a key appears without being used, relative to `src/`: the
 * dictionaries define it, and the debt table writes it down precisely
 * because nothing shows it.
 */
export const KEY_NAMED_NOT_USED: readonly string[] = ['content/i18n', 'content/knownDebt.ts']

const QUOTED = /(['"`])([A-Za-z0-9_.-]+)\1/g

/** The keys of `keys` that appear as a quoted literal in any of `files`. */
export function keysCitedIn(keys: ReadonlySet<string>, files: readonly SourceFile[]): Set<string> {
  const cited = new Set<string>()
  for (const file of files) {
    for (const match of file.text.matchAll(QUOTED)) {
      if (keys.has(match[2])) cited.add(match[2])
    }
  }
  return cited
}

/**
 * Every `.ts` and `.tsx` under `root`, except the files and folders in `skip`
 * (given relative to `root`, with forward slashes).
 */
export function readSourceTree(root: string, skip: readonly string[] = []): SourceFile[] {
  const files: SourceFile[] = []
  const visit = (directory: string) => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name)
      const local = relative(root, path).split(sep).join('/')
      if (skip.includes(local)) continue
      if (statSync(path).isDirectory()) visit(path)
      else if (/\.tsx?$/.test(name)) files.push({ path: local, text: readFileSync(path, 'utf8') })
    }
  }
  visit(root)
  return files
}
