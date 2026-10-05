/**
 * The capture manifest: what each frame in a capture set is.
 *
 * A capture set is a directory of frames under `docs/contact-sheets/` taken in
 * one sitting from one commit, and it is evidence: the plan argues from
 * "capture `a17`" the way code argues from a line number. A directory of a
 * hundred JPEGs cannot say which commit it shows, whether a frame was
 * replaced since, or which file `a17` is. The manifest can, and the gate reads
 * it (`npm run test:captures`).
 *
 * Two halves, kept apart on purpose:
 *   - what a person has to say about a set (`CAPTURE_SETS` below): the commit,
 *     the date, the report that reads the frames, how the file names encode
 *     room and light;
 *   - what can be read off the files (`buildCaptureManifest`): id, size,
 *     dimensions and hash of every frame.
 * `manifest.json` is the two together, written by `npm run captures:manifest`
 * and never by hand.
 *
 * Shared by the generator and the test, so "the manifest is current" means
 * exactly "the generator would write the same file again".
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

export const CAPTURE_ROOT = 'docs/contact-sheets'
export const MANIFEST_FILE = 'manifest.json'

/**
 * Every capture set, by directory name.
 *
 * A lot that closes with new frames (plan §9.1, step 12) adds its set here and
 * runs `npm run captures:manifest`.
 *
 * `groups` maps the letter that opens a frame's id to what the whole group
 * shows; the light of one frame is read from its file name, because a dark
 * group mixes frames with and without the torch.
 *
 * `frozen` marks a set that must never change again, and `digest` pins it: the
 * baseline is the "before" of every before/after sheet for the next 24 lots,
 * and a regenerated manifest would otherwise bless a replaced frame.
 *
 * `commit` is the commit whose tree the frames SHOW: check it out, and the
 * same camera gives the same frame. Frames are usually shot on a working
 * tree, before the commit that records it exists, and a manifest cannot name
 * the commit it is part of. So a set shot that way is written `'<base>+'`:
 * the working tree on top of `<base>`, recorded by the commit that adds the
 * set. Whoever freezes the set replaces it with that commit's own hash; a
 * frozen set never carries the plus (`npm run test:captures`).
 */
export const CAPTURE_SETS = {
  'baseline-2026-10-03': {
    capturedAt: '2026-10-03',
    commit: '82756c4',
    report: 'docs/plano-mestre/fontes/05-captures.md',
    filePrefix: 'wf3',
    viewport: { cssWidth: 1280, cssHeight: 720, pixelRatio: 1.2, quality: 'medium' },
    frame: { width: 1536, height: 864 },
    groups: {
      a: { room: 'atrium', powered: true },
      d: { room: 'atrium', powered: false },
      h: { room: 'holyoke', powered: true },
      e: { room: 'holyoke', powered: false },
    },
    frozen: true,
    digest: '7b9d2872dd46453f8386285a798261d59aa7dfdbfab463113808f7c86e8ed5bc',
  },
  /**
   * The browser checks of the preparation lot (plan, P0 item 7): the four
   * Anexo E items L1 depends on and the ten reference points of the counter
   * baseline. Frozen for the same reason as the hundred frames above: these
   * are what "before L1" looked like, and L1 moves the very things they show.
   *
   * One frame, `o01`, is not a canvas capture: the canvas has no HUD, and the
   * prompt on the stuck door is the whole point of that frame. It is a
   * screenshot of the pane resampled to the set's size; the record says so.
   */
  p0: {
    capturedAt: '2026-10-04',
    commit: '0061eb2',
    report: 'docs/lotes/P0-linha-de-base.md',
    filePrefix: 'p0',
    viewport: { cssWidth: 1280, cssHeight: 720, pixelRatio: 1.2, quality: 'medium' },
    frame: { width: 1536, height: 864 },
    groups: {
      a: { room: 'atrium', powered: true },
      h: { room: 'holyoke', powered: true },
      e: { room: 'holyoke', powered: false },
      o: { room: 'office', powered: true },
    },
    frozen: true,
    digest: '0c5ea7527c922267af446a3e3cfce2025611f142f4bdcaec4a315a99a0d5000e',
  },
  /**
   * The browser route of L1 (docs/HANDOFF.md, §10): the Holyoke pilot seen
   * from its door in the dark, both breakers from where the capsule stops and
   * after E, the four pieces of the wall case in their bays, the office door
   * opening on an atrium whose wall image never arrived or failed, and the
   * reference frames whose counters moved. The "after" of the P0 frames
   * above: `e01` answers `p0-e01`, `h02` to `h05` answer `p0-h01` to `p0-h04`.
   *
   * `commit` is the lot's geometry and engine commit, whose tree these frames
   * show: the Holyoke breaker on the far wall and the collection in its bays
   * exist from 047f3bb on. The set used to name ab6625e, the commit the
   * working tree stood on when they were shot, where the breaker still hangs
   * beside the door and no frame can be shot again.
   *
   * Frozen by L2, with the lot published (Cloudflare `1d3a4554`): the touch
   * pass it was held open for added no frame. These seventeen are the
   * "before" of every lot that moves the same walls again.
   */
  l1: {
    capturedAt: '2026-10-04',
    commit: '047f3bb',
    report: 'docs/HANDOFF.md',
    filePrefix: 'l1',
    viewport: { cssWidth: 1280, cssHeight: 720, pixelRatio: 1.2, quality: 'medium' },
    frame: { width: 1536, height: 864 },
    groups: {
      a: { room: 'atrium', powered: true },
      d: { room: 'atrium', powered: false },
      h: { room: 'holyoke', powered: true },
      e: { room: 'holyoke', powered: false },
    },
    frozen: true,
    digest: 'af2dd6fea65c18c090fd0f7369f2274f6eb8cd7d8ac15807211b2c268067d063',
  },
  /**
   * The review of L1 (docs/HANDOFF.md, §10.11): the credit under the two
   * frames of the wall case, in the cream it is drawn in since the review.
   * `h01` answers `l1-h03`, where the panorama's credit could not be read
   * against the lit lining; `h02` answers `l1-h02`; `e01` and `e02` are the
   * same two credits from three metres with the wing dark, without the torch
   * and with it.
   *
   * A set of its own because these four were shot on another tree than the
   * seventeen of `l1`: the working tree of the review, on top of 047f3bb,
   * which is the tree 513ec09 recorded. The set read `047f3bb+` while it was
   * open; L2 froze it under that commit's own hash.
   */
  'l1-review': {
    capturedAt: '2026-10-04',
    commit: '513ec09',
    report: 'docs/HANDOFF.md',
    filePrefix: 'l1r',
    viewport: { cssWidth: 1280, cssHeight: 720, pixelRatio: 1.2, quality: 'medium' },
    frame: { width: 1536, height: 864 },
    groups: {
      h: { room: 'holyoke', powered: true },
      e: { room: 'holyoke', powered: false },
    },
    frozen: true,
    digest: 'f29cbd37e1cd571df6cf99d012daefd12bd428969b7f2e6d1d432116fe170394',
  },
  /**
   * The browser route of L2 (docs/HANDOFF.md, §11): what the lot changed for
   * the player, which is the plan in the notebook and one door. A new game
   * from its first plan (one room and a stub) to the last (three rooms, three
   * doors), the drawer's lock named once touched, and the service shortcut
   * from both sides, latched and released.
   *
   * None of the ten is a canvas capture: the canvas has no HUD, and the plan,
   * the prompt and the toast are all HUD. Each is the WebGL frame with the
   * DOM layer drawn over it, the second through an SVG `foreignObject` that
   * carries the page's own style sheets with their fonts inlined, composed at
   * the set's size and posted to `/__capture`. What the DOM layer shows was
   * checked against the live page's geometry before any frame was kept; the
   * scroll bar of the keypad in `o02` is the embedding browser's, a phone
   * draws its own.
   *
   * `commit` is the lot's last slice, the tree the frames were shot on. The
   * commit after it (the notebook's panel on a phone) moves nothing a window
   * of this size shows.
   */
  l2: {
    capturedAt: '2026-10-05',
    commit: '90dd9a6',
    report: 'docs/HANDOFF.md',
    filePrefix: 'l2',
    viewport: { cssWidth: 1280, cssHeight: 720, pixelRatio: 1.2, quality: 'medium' },
    frame: { width: 1536, height: 864 },
    groups: {
      o: { room: 'office', powered: true },
      d: { room: 'atrium', powered: false },
      a: { room: 'atrium', powered: true },
      e: { room: 'holyoke', powered: false },
      h: { room: 'holyoke', powered: true },
    },
    frozen: true,
    digest: '9c733330ebcef9e9f728cf0c7254380d4c17c62ffdb9a823bdc8a95778460433',
  },
  /**
   * The same route in the touch viewport every lot is checked in, 844 x 390,
   * driven by the sticks and the Action button: the plan on one page of the
   * notebook, the Action button in front of a shortcut that will not open,
   * the toast clear of the prompt, and the keypad, of which a phone shows the
   * question and the four digits and none of the keys (ÁT-J1; the keypad is
   * redone with the examine panel in L4).
   *
   * Composed like the frames of `l2` above, at two device pixels. A set of
   * its own because a set has one frame size. `o02`, `o03` and `d01` are of
   * the game in English.
   *
   * Shot on d299df8, which brought the notebook's panel back inside the
   * screen: on the tree before it the four frames of the plan show the panel
   * running off the right edge.
   */
  'l2-touch': {
    capturedAt: '2026-10-05',
    commit: 'd299df8',
    report: 'docs/HANDOFF.md',
    filePrefix: 'l2t',
    viewport: { cssWidth: 844, cssHeight: 390, pixelRatio: 2, quality: 'medium' },
    frame: { width: 1688, height: 780 },
    groups: {
      o: { room: 'office', powered: true },
      d: { room: 'atrium', powered: false },
      a: { room: 'atrium', powered: true },
      h: { room: 'holyoke', powered: true },
    },
    frozen: true,
    digest: '9afc6c6c1dfa8dd22420142b62d6caa4eecb651f2929d34edeb091be59f3cdb7',
  },
}

/** How a file name ends, and the light it says the frame was taken in. */
const LIGHT_SUFFIXES = [
  ['-dark-notorch', 'dark'],
  ['-torch', 'torch'],
  ['-lit', 'lit'],
]

/**
 * Width and height of a JPEG, read from its frame header.
 *
 * Twenty lines instead of `sharp`: the gate hashes these files on every run
 * and should not load an image library to learn two integers.
 */
export function jpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null
  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null
    const marker = buffer[offset + 1]
    // Start-of-frame markers, except the three in that range that are not.
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isFrame) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) }
    }
    offset += 2 + buffer.readUInt16BE(offset + 2)
  }
  return null
}

/**
 * What a frame's file name says about it, or null when the name does not
 * follow the set's grammar: `<prefix>-<id>-<subject>-<light>.jpg`.
 */
export function describeCaptureFile(fileName, set) {
  const match = fileName.match(/^([a-z0-9]+)-(([a-z])\d\d)-([a-z0-9-]+)\.jpg$/)
  if (!match) return null
  const [, prefix, id, letter, rest] = match
  const group = set.groups[letter]
  if (prefix !== set.filePrefix || !group) return null
  const suffix = LIGHT_SUFFIXES.find(([ending]) => rest.endsWith(ending))
  if (!suffix) return null
  const subject = rest.slice(0, -suffix[0].length)
  // A lit frame of a dark group, or the reverse, is a misfiled frame.
  if ((suffix[1] === 'lit') !== group.powered) return null
  return {
    id,
    file: fileName,
    room: group.room,
    light: suffix[1],
    // An examine frame shows the held object, not the room behind it.
    view: subject.startsWith('examine-') ? 'examine' : 'room',
    subject,
  }
}

/** One hash for a whole set: the frames' own hashes, in file order. */
export function captureDigest(captures) {
  const hash = createHash('sha256')
  for (const capture of captures) hash.update(`${capture.file}:${capture.sha256}\n`)
  return hash.digest('hex')
}

/**
 * The manifest the files on disk describe.
 *
 * `problems` lists what a person has to fix first (a file the grammar cannot
 * read, an id used twice); the manifest is still returned so the caller can
 * show how far it got.
 */
export function buildCaptureManifest(root, setName) {
  const set = CAPTURE_SETS[setName]
  const directory = resolve(root, CAPTURE_ROOT, setName)
  const problems = []
  const captures = []
  const seen = new Set()

  for (const fileName of readdirSync(directory).sort()) {
    if (fileName === MANIFEST_FILE) continue
    const path = resolve(directory, fileName)
    if (!statSync(path).isFile()) {
      problems.push(`${fileName} is not a file`)
      continue
    }
    const described = describeCaptureFile(fileName, set)
    if (!described) {
      problems.push(`${fileName} does not follow "${set.filePrefix}-<id>-<subject>-<lit|torch|dark-notorch>.jpg"`)
      continue
    }
    if (seen.has(described.id)) problems.push(`capture id ${described.id} is used twice`)
    seen.add(described.id)

    const bytes = readFileSync(path)
    const size = jpegSize(bytes)
    if (!size) problems.push(`${fileName} is not a readable JPEG`)
    captures.push({
      ...described,
      width: size?.width ?? 0,
      height: size?.height ?? 0,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
  }

  const { digest: pinned, ...header } = set
  const manifest = {
    set: setName,
    ...header,
    count: captures.length,
    digest: captureDigest(captures),
    captures,
  }
  if (set.frozen && pinned !== manifest.digest) {
    problems.push(
      pinned
        ? `the frames no longer match the digest pinned for this frozen set (${pinned.slice(0, 12)}…): restore them, do not regenerate`
        : `this frozen set has no pinned digest yet: put ${manifest.digest} in CAPTURE_SETS`,
    )
  }
  return { manifest, problems }
}

/** The manifest as the generator writes it: stable, diffable, one frame per line. */
export function serialiseCaptureManifest(manifest) {
  const { captures, ...header } = manifest
  const head = JSON.stringify(header, null, 2).replace(/\n}$/, ',\n  "captures": [\n')
  const rows = captures.map((capture) => `    ${JSON.stringify(capture)}`).join(',\n')
  return `${head}${rows}\n  ]\n}\n`
}

/** The manifest committed for a set, or null when there is none. */
export function readCaptureManifest(root, setName) {
  const path = resolve(root, CAPTURE_ROOT, setName, MANIFEST_FILE)
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null
}

/** Directories under the capture root: each one has to be a known set. */
export function captureDirectories(root) {
  const base = resolve(root, CAPTURE_ROOT)
  return readdirSync(base)
    .filter((name) => statSync(resolve(base, name)).isDirectory())
    .sort()
}
