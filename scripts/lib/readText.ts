/**
 * A text file as the repository holds it: with Unix line ends.
 *
 * The suites read source files and assert on them, and several of those
 * assertions spell a line end (`indexOf('\n}\n')`, a pattern ending in `\n`).
 * Git for Windows checks text out with CRLF unless told otherwise, with a
 * clean `git status`, and then those assertions found nothing: three suites
 * went red on a fresh clone with no change to anything they prove.
 *
 * `.gitattributes` now tells Git to keep LF, which is the fix. This is the
 * belt to those braces: a tree checked out before the attribute existed, or
 * a file saved by an editor set otherwise, still reads the same. Every text
 * read of a TypeScript script under `scripts/` goes through here, and `npm
 * run test:docs` refuses one that does not. (JSON is read as it comes: it
 * parses the same with either line end.)
 */

import { readFileSync } from 'node:fs'

export function readText(path: string | URL): string {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
}
