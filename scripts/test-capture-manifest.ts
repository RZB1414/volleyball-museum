/**
 * Headless proof that every capture set is what its manifest says.
 *
 *   npm run test:captures
 *
 * The plan cites frames as evidence, and every lot is judged against the
 * baseline taken before it. Both only work while a frame is still the frame
 * that was looked at: the right commit, the right file, not re-shot and not
 * half-synced by the cloud folder the repository lives in. The manifest
 * records that, and this is the gate reading it.
 */

import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { MUSEUM } from '../src/content/museum.ts'
import {
  buildCaptureManifest,
  CAPTURE_ROOT,
  CAPTURE_SETS,
  captureDigest,
  captureDirectories,
  describeCaptureFile,
  jpegSize,
  MANIFEST_FILE,
  readCaptureManifest,
} from './lib/captureManifest.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE = 'baseline-2026-10-03'

let passed = 0
function test(name: string, run: () => void) {
  run()
  passed += 1
  console.log(`  pass  ${name}`)
}

console.log('\nCapture manifest')

test('every directory of captures is a known set with a manifest', () => {
  for (const directory of captureDirectories(ROOT)) {
    assert.ok(
      directory in CAPTURE_SETS,
      `${CAPTURE_ROOT}/${directory} is not in CAPTURE_SETS: a set nobody described is not evidence`,
    )
  }
  for (const setName of Object.keys(CAPTURE_SETS)) {
    assert.ok(
      readCaptureManifest(ROOT, setName),
      `${CAPTURE_ROOT}/${setName}/${MANIFEST_FILE} is missing: run \`npm run captures:manifest\``,
    )
  }
})

test('each manifest is exactly what the frames on disk describe', () => {
  for (const setName of Object.keys(CAPTURE_SETS)) {
    const { manifest, problems } = buildCaptureManifest(ROOT, setName)
    assert.deepEqual(problems, [], `${setName} cannot be described`)
    // Compared whole: a frame added, removed, renamed, re-shot or truncated
    // shows up here as the one line that differs.
    assert.deepEqual(
      readCaptureManifest(ROOT, setName),
      manifest,
      `${setName}: the manifest and the frames disagree (run \`npm run captures:manifest\`, unless the set is frozen)`,
    )
  }
})

test('a frozen set still matches the digest pinned in code', () => {
  for (const [setName, set] of Object.entries(CAPTURE_SETS)) {
    if (!set.frozen) continue
    const committed = readCaptureManifest(ROOT, setName)
    assert.ok(committed)
    assert.match(set.digest, /^[0-9a-f]{64}$/, `${setName} is frozen but pins no digest`)
    // Recomputed from the committed rows too, so editing the manifest and the
    // frames together still has to get past the constant in the code.
    assert.equal(captureDigest(committed.captures), set.digest, `${setName} changed since it was frozen`)
    assert.equal(committed.digest, set.digest)
  }
})

test('every frame names a real room and has the size its set was shot at', () => {
  const rooms = new Set<string>(MUSEUM.rooms.map((room) => room.id))
  for (const [setName, set] of Object.entries(CAPTURE_SETS)) {
    const committed = readCaptureManifest(ROOT, setName)
    assert.ok(committed)
    const ids = new Set<string>()
    for (const capture of committed.captures) {
      assert.ok(rooms.has(capture.room), `${setName}/${capture.file}: unknown room "${capture.room}"`)
      assert.equal(capture.width, set.frame.width, `${setName}/${capture.file}: width`)
      assert.equal(capture.height, set.frame.height, `${setName}/${capture.file}: height`)
      assert.ok(!ids.has(capture.id), `${setName}: id ${capture.id} is used twice`)
      ids.add(capture.id)
    }
  }
})

test('the baseline is the hundred frames of 3 October, from the commit before the plan', () => {
  const baseline = readCaptureManifest(ROOT, BASELINE)
  assert.ok(baseline)
  assert.equal(baseline.count, 100)
  assert.equal(baseline.captures.length, 100)
  assert.equal(baseline.commit, '82756c4')
  assert.equal(baseline.frozen, true)
  const count = (room: string, light: string) =>
    baseline.captures.filter(
      (capture: { room: string; light: string }) => capture.room === room && capture.light === light,
    ).length
  // The four groups of the capture report: lit and dark, atrium and Holyoke.
  assert.equal(count('atrium', 'lit'), 34)
  assert.equal(count('holyoke', 'lit'), 34)
  assert.equal(count('atrium', 'dark') + count('atrium', 'torch'), 18)
  assert.equal(count('holyoke', 'dark') + count('holyoke', 'torch'), 14)
})

test('a file name is read as id, room, light, view and subject, or refused', () => {
  const set = CAPTURE_SETS[BASELINE]
  assert.deepEqual(describeCaptureFile('wf3-h27-examine-spalding-lit.jpg', set), {
    id: 'h27',
    file: 'wf3-h27-examine-spalding-lit.jpg',
    room: 'holyoke',
    light: 'lit',
    view: 'examine',
    subject: 'examine-spalding',
  })
  assert.deepEqual(describeCaptureFile('wf3-d02-breaker-pilot-dark-notorch.jpg', set), {
    id: 'd02',
    file: 'wf3-d02-breaker-pilot-dark-notorch.jpg',
    room: 'atrium',
    light: 'dark',
    view: 'room',
    subject: 'breaker-pilot',
  })
  assert.equal(describeCaptureFile('wf3-e03-holyoke-from-door-torch.jpg', set)?.light, 'torch')
  // Another prefix, an unknown group, no light, and a lit frame filed as dark.
  assert.equal(describeCaptureFile('wf4-a01-atrium-lit.jpg', set), null)
  assert.equal(describeCaptureFile('wf3-z01-atrium-lit.jpg', set), null)
  assert.equal(describeCaptureFile('wf3-a01-atrium.jpg', set), null)
  assert.equal(describeCaptureFile('wf3-d01-atrium-lit.jpg', set), null)
  assert.equal(describeCaptureFile('notes.txt', set), null)
})

test('JPEG dimensions come from the frame header, and junk is refused', () => {
  // SOI, an APP0 segment to skip, then a baseline frame of 864 x 1536.
  const jpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x60, 0x06,
    0x00, 0x03, 0x01, 0x22,
  ])
  assert.deepEqual(jpegSize(jpeg), { width: 1536, height: 864 })
  assert.equal(jpegSize(Buffer.from('not a jpeg at all')), null)
  assert.equal(jpegSize(Buffer.alloc(0)), null)
})

console.log(`\n${passed}/${passed} capture checks passed.\n`)
