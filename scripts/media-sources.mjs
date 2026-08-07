/**
 * The curated media list.
 *
 * Every image in the museum comes from one of three routes, in this order:
 *   1. Public domain by age — US works published before 1931.
 *   2. Wikimedia Commons under CC0 / CC-BY / CC-BY-SA, credited beneath the
 *      artwork in world space and again on the credits wall.
 *   3. Procedural abstraction authored by the bake, when nothing licensable
 *      exists for a subject.
 *
 * This file only names the SOURCE. Titles, authors, dates and licence URLs are
 * fetched from the Commons API by `fetch-media.mjs` and written into
 * `src/content/media.generated.ts`. Attribution is never hand-typed, so it
 * cannot drift from the source and cannot be invented.
 */

/**
 * @typedef {object} MediaSource
 * @property {string} id            Stable content id used by exhibits/documents.
 * @property {string} commonsTitle  Exact `File:...` title on Wikimedia Commons.
 * @property {'photograph'|'document-scan'|'diagram'} kind
 * @property {number} targetWidth   Longest edge after resize, in pixels.
 * @property {string} [pdReason]    Required when the file is public domain:
 *                                  the concrete reason, shown on the credits wall.
 * @property {string} [modifications] Required by CC if the work was altered.
 */

/** @type {MediaSource[]} */
export const MEDIA_SOURCES = [
  // -------------------------------------------------------------------------
  // Wing 1 — Holyoke, 1895-1929
  //
  // The only wing with genuinely deep public-domain coverage, which is exactly
  // why it was chosen as the vertical slice: it forces the rights decision
  // immediately instead of deferring it.
  // -------------------------------------------------------------------------
  {
    id: 'photo-morgan-1897',
    commonsTitle: "File:William G Morgan, as physical director of Holyoke's YMCA.jpg",
    kind: 'photograph',
    // Source is only 314x475 — this is a small period portrait, so upscaling
    // would just make the grain mushy. Framed small and lit tight.
    targetWidth: 512,
    pdReason: 'Published in the Holyoke Transcript Industrial Edition, 1897; US work published before 1931.',
  },
  {
    id: 'photo-holyoke-gym-1897',
    commonsTitle: 'File:Interior of the old Holyoke YMCA.jpg',
    kind: 'photograph',
    targetWidth: 1115,
    pdReason: 'Published in the Holyoke Transcript Industrial Edition, 1897; US work published before 1931.',
  },
  {
    id: 'photo-holyoke-building-1902',
    commonsTitle: 'File:Holyoke YMCA building in 1902.jpg',
    kind: 'photograph',
    targetWidth: 1024,
    pdReason: 'Published in the New-York Daily Tribune, 1902; US work published before 1931.',
  },
  {
    id: 'photo-holyoke-building-c1910',
    commonsTitle: 'File:YMCA Building of Holyoke, where Volleyball was first played.jpg',
    kind: 'photograph',
    // A grainy postcard scan: it costs disproportionate bytes at full width
    // because WebP has to encode the grain. 768 is plenty for a framed wall
    // print the player views from a metre away.
    targetWidth: 768,
    modifications: 'Resized and re-encoded to WebP for use as a real-time texture.',
  },
]

/**
 * Commons licence short-codes mapped onto the schema's union. Anything not in
 * this table is rejected by the fetcher rather than guessed at — an unknown
 * licence is a legal question, not a build warning.
 */
export const LICENSE_MAP = {
  pd: 'public-domain',
  cc0: 'cc0',
  'cc-by-2.0': 'cc-by-2.0',
  'cc-by-3.0': 'cc-by-3.0',
  'cc-by-4.0': 'cc-by-4.0',
  'cc-by-sa-3.0': 'cc-by-sa-3.0',
  'cc-by-sa-4.0': 'cc-by-sa-4.0',
}
