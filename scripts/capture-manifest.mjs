/**
 * Writes the manifest of every capture set.
 *
 *   npm run captures:manifest
 *
 * Run after adding a capture set to `CAPTURE_SETS` (`scripts/lib/
 * captureManifest.mjs`) or after re-shooting one that is not frozen. It reads
 * the frames, never writes one, and refuses to write a manifest for a set it
 * cannot describe in full: a manifest that silently skipped a misnamed frame
 * would be worse than none.
 *
 * `npm run test:captures` is the reading side, inside the gate.
 */

import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildCaptureManifest,
  CAPTURE_ROOT,
  CAPTURE_SETS,
  MANIFEST_FILE,
  serialiseCaptureManifest,
} from './lib/captureManifest.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

let failed = false
for (const setName of Object.keys(CAPTURE_SETS)) {
  const { manifest, problems } = buildCaptureManifest(ROOT, setName)
  if (problems.length > 0) {
    failed = true
    console.error(`${setName}: not written`)
    for (const problem of problems) console.error(`  - ${problem}`)
    continue
  }
  const path = resolve(ROOT, CAPTURE_ROOT, setName, MANIFEST_FILE)
  writeFileSync(path, serialiseCaptureManifest(manifest))
  console.log(`${setName}: ${manifest.count} frames, digest ${manifest.digest}`)
  console.log(`  wrote ${CAPTURE_ROOT}/${setName}/${MANIFEST_FILE}`)
}

if (failed) process.exitCode = 1
