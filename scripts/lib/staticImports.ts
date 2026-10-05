/**
 * What evaluating a module pulls in: its own imports, and theirs.
 *
 * `test:bundle` proves from `dist/` that the title screen carries no content,
 * and when it fails it can only say that a megabyte moved. This reads the
 * source instead and names the import that did it: the modules a file reaches
 * without a single `import()`, which is exactly what ships in its chunk.
 *
 * Type-only forms (`import type`, `export type … from`) are erased before
 * anything runs and do not count. `import { type A } from './x'` does: under
 * `verbatimModuleSyntax` it stays in the output as `import {} from './x'`,
 * and `x` is evaluated.
 */

import { existsSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { readText } from './readText.ts'

// A statement is only looked for at the start of a line: a line of a block
// comment starts with its star and a commented-out import with its slashes,
// so neither can be read as code, and `import.meta` has no space to match.
const STATIC_FORMS = [
  // import a, { b } from './x' — but not `import type … from`.
  /^[ \t]*import\s+(?!type[\s{])[^'"`;()]*?\bfrom\s*['"]([^'"]+)['"]/gm,
  // import './x'
  /^[ \t]*import\s*['"]([^'"]+)['"]/gm,
  // export { a } from './x' and export * from './x' — but not `export type`.
  /^[ \t]*export\s*(?:\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/gm,
] as const

const DYNAMIC_FORM = /\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g

/** The specifiers a source evaluates as it loads, in the order written. */
export function staticSpecifiers(source: string): string[] {
  return STATIC_FORMS.flatMap((form) => [...source.matchAll(form)].map((match) => match[1]))
}

/** The specifiers a source may ask for later, with `import()`. */
export function dynamicSpecifiers(source: string): string[] {
  return [...source.matchAll(DYNAMIC_FORM)].map((match) => match[1])
}

const CODE = /\.(?:ts|tsx|mjs|js)$/

/** The source file a relative specifier names, 'asset' for a stylesheet or an image, null for nothing. */
function resolveModule(from: string, specifier: string): string | 'asset' | null {
  const base = resolve(dirname(from), specifier)
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts')]) {
    if (existsSync(candidate) && CODE.test(candidate)) return candidate
  }
  return existsSync(base) ? 'asset' : null
}

export type StaticImportGraph = {
  /** Every source file reached, the entry included, relative to the root, with forward slashes. */
  readonly modules: readonly string[]
  /** Every package named along the way. */
  readonly packages: readonly string[]
  /** Relative imports that point at no file: the walk would be a lie past them. */
  readonly unresolved: readonly string[]
}

/** Everything `entry` reaches through static imports alone. */
export function staticImportGraph(root: string, entry: string): StaticImportGraph {
  const modules = new Set<string>()
  const packages = new Set<string>()
  const unresolved: string[] = []
  const name = (path: string) => relative(root, path).replaceAll('\\', '/')

  const visit = (path: string) => {
    if (modules.has(name(path))) return
    modules.add(name(path))
    for (const specifier of staticSpecifiers(readText(path))) {
      if (!specifier.startsWith('.')) {
        const [scope, pack] = specifier.split('/')
        packages.add(scope.startsWith('@') ? `${scope}/${pack}` : scope)
        continue
      }
      const target = resolveModule(path, specifier)
      if (target === null) unresolved.push(`${name(path)} → ${specifier}`)
      // A stylesheet is evaluated by the bundler, not by the module graph.
      else if (target !== 'asset') visit(target)
    }
  }
  visit(resolve(root, entry))

  return { modules: [...modules].sort(), packages: [...packages].sort(), unresolved }
}
