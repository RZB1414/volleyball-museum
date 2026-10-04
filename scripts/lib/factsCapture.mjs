/**
 * The reading half of the source capture, with no network in it.
 *
 * `npm run facts:capture` fetches a page; everything that happens to the page
 * afterwards is here: turning it into text, deciding whether the text holds a
 * fact, cutting the excerpt, and writing the record. Kept apart from the
 * fetching so that the gate can run all of it on a page it carries as a
 * fixture (`npm run test:facts`), and so that "the committed file is what the
 * script wrote" means exactly "this module would write the same bytes again".
 *
 * Every function is a pure function of its arguments: no clock, no locale, no
 * ordering that depends on a `Set` of objects. A capture that is re-run on an
 * unchanged page has to produce an unchanged file.
 */

import { createHash } from 'node:crypto'

import { EXCERPT_MAX_WORDS, tokenPattern } from '../../src/content/factCapture.ts'

/**
 * How far from the value one of the bank's words may stand, in characters of
 * normalised text. A year and what happened in it are rarely in one sentence:
 * the federation's page gives 1896 when the conference opens and the new name
 * some 1,200 characters later, after Morgan's whole explanation of the game.
 * Wide enough for that account, and still a paragraph or two of a page, not
 * the page.
 */
export const CONTEXT_RADIUS = 1500

/**
 * The longest stretch of text a list of names may be spread over. A page
 * about a federation names France everywhere; fourteen names inside one
 * paragraph are a list.
 */
export const NAME_LIST_SPAN = 1500

export const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex')

// ---------------------------------------------------------------------------
// Page to text
// ---------------------------------------------------------------------------

/** The named entities these pages actually use; anything else stays as written. */
const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  eacute: 'é',
  egrave: 'è',
  oacute: 'ó',
  aacute: 'á',
  ccedil: 'ç',
  uuml: 'ü',
}

export function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&([a-z]+);/gi, (whole, name) => NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()] ?? whole)
}

/**
 * One line, single spaces, one Unicode form: what gets searched and hashed.
 * (`\s` already covers the no-break space; the zero-width one it does not.)
 */
export function normaliseText(text) {
  return text.normalize('NFC').replace(/[\s\u200b]+/g, ' ').trim()
}

/**
 * Elements whose content is never something a reader sees as the page's text.
 * `title` is named beside `head` for the page that has one without the other.
 */
const UNREAD_ELEMENTS = ['script', 'style', 'noscript', 'template', 'svg', 'head', 'title']

/**
 * The text of an HTML page.
 *
 * Regular expressions, not a parser: these are a dozen known pages, the
 * project takes no new dependency for them, and the result only has to be
 * stable and searchable. What it must not do is keep a script's or a
 * stylesheet's contents, which is where a page hides the numbers that change
 * on every request.
 */
export function htmlToText(html) {
  let body = html.replace(/<!--[\s\S]*?-->/g, ' ')
  for (const tag of UNREAD_ELEMENTS) {
    body = body.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}\\s*>`, 'gi'), ' ')
  }
  // A footnote caller ("[5]") is not part of the sentence it hangs on.
  body = body.replace(/<sup\b[^>]*\bclass="[^"]*\breference\b[^"]*"[^>]*>[\s\S]*?<\/sup\s*>/gi, ' ')
  // Every tag becomes a space, so that two cells or two links never fuse into
  // one token ("1960" and "1962" must not read "19601962"). The price is a
  // space before the punctuation that follows a link, taken back here.
  return normaliseText(decodeEntities(body.replace(/<[^>]*>/g, ' ')))
    .replace(/ ([,.;:!?])(?= |$)/g, '$1')
    .replace(/([([]) /g, '$1')
    .replace(/ ([)\]])/g, '$1')
}

/** The page's own title: `<title>`, or the first heading when it has none. */
export function htmlTitle(html) {
  const raw =
    html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ??
    html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1] ??
    ''
  const title = normaliseText(decodeEntities(raw.replace(/<[^>]*>/g, ' ')))
  return title || null
}

/** What a fetched HTML page is, as the record wants it; `text` null when it is not the page. */
export function htmlPage(httpStatus, contentType, resolvedUrl, html) {
  if (httpStatus !== 200 || !/html/i.test(contentType ?? '')) {
    return { httpStatus, resolvedUrl, title: null, text: null }
  }
  return { httpStatus, resolvedUrl, title: htmlTitle(html), text: htmlToText(html) }
}

/**
 * The MediaWiki API call that reads one article.
 *
 * It asks for the current revision as rendered, not for `/wiki/Title`: the
 * article page wraps the same text in banners, menus and a cache stamp that
 * change between two requests, and its address says nothing about which
 * revision was read. The parsed revision is the text a reader sees, footnote
 * marks and infobox included, and it comes with its revision number.
 */
export function mediaWikiRequest(url) {
  const { origin, pathname } = new URL(url)
  const api = new URL('/w/api.php', origin)
  api.search = new URLSearchParams({
    action: 'parse',
    page: decodeURIComponent(pathname.replace(/^\/wiki\//, '')),
    prop: 'text|revid',
    redirects: '1',
    disableeditsection: '1',
    disabletoc: '1',
    disablelimitreport: '1',
    format: 'json',
    formatversion: '2',
  }).toString()
  return api.href
}

/**
 * What the API's answer is, as the record wants it. `resolvedUrl` is the
 * permalink of the revision that was read: the article moves on, that
 * address does not.
 */
export function mediaWikiPage(url, httpStatus, body) {
  if (httpStatus !== 200) return { httpStatus, resolvedUrl: null, title: null, text: null }
  const parsed = body?.parse
  if (!parsed || typeof parsed.text !== 'string' || !Number.isInteger(parsed.revid)) {
    // The API answers 200 with an `error` object for an article that is not there.
    return { httpStatus: 404, resolvedUrl: null, title: null, text: null }
  }
  const permalink = new URL('/w/index.php', new URL(url).origin)
  permalink.search = new URLSearchParams({
    title: String(parsed.title).replaceAll(' ', '_'),
    oldid: String(parsed.revid),
  }).toString()
  return {
    httpStatus: 200,
    resolvedUrl: permalink.href,
    title: String(parsed.title),
    text: htmlToText(parsed.text),
  }
}

// ---------------------------------------------------------------------------
// Text to finding
// ---------------------------------------------------------------------------

/**
 * A word that ends a sentence. `Dr.`, `T.` and `St.` end in a full stop and
 * end nothing, so a short word does not count; a year does.
 */
function endsSentence(word) {
  const match = word.match(/^(.*?)[.!?]["'’”)\]]*$/)
  if (!match) return false
  const stem = match[1].replace(/[^\p{L}\p{N}]/gu, '')
  return stem.length >= 4 || /^\d+$/.test(stem)
}

/**
 * The words around the value at `index`: at most `EXCERPT_MAX_WORDS`, the
 * value near the middle, cut at a sentence boundary where one falls inside
 * the window and marked with an ellipsis where it does not.
 */
export function excerptAround(text, index, length) {
  const before = text.slice(0, index).split(' ').filter(Boolean)
  const after = text.slice(index + length).split(' ')
  // The value may be glued to punctuation ("1896," or "(1896)"): rebuild the
  // word it sits in from both sides.
  const gluedBefore = index > 0 && text[index - 1] !== ' ' ? (before.pop() ?? '') : ''
  const gluedAfter = after.shift() ?? ''
  const centre = `${gluedBefore}${text.slice(index, index + length)}${gluedAfter}`
  const following = after.filter(Boolean)

  const lookBehind = Math.floor((EXCERPT_MAX_WORDS - 1) / 2)
  let head = before.slice(-lookBehind)
  let clippedHead = before.length > head.length
  const lastStop = head.findLastIndex(endsSentence)
  if (lastStop >= 0) {
    head = head.slice(lastStop + 1)
    clippedHead = false
  }

  let tail = []
  let clippedTail = false
  if (!endsSentence(centre)) {
    tail = following.slice(0, EXCERPT_MAX_WORDS - 1 - head.length)
    clippedTail = following.length > tail.length
    const firstStop = tail.findIndex(endsSentence)
    if (firstStop >= 0) {
      tail = tail.slice(0, firstStop + 1)
      clippedTail = false
    }
  }

  // The ellipsis is punctuation on the word it touches, not a word of its own.
  const words = [...head, centre, ...tail]
  if (clippedHead) words[0] = `…${words[0]}`
  if (clippedTail) words[words.length - 1] = `${words[words.length - 1]}…`
  return words.join(' ')
}

/**
 * A year or a number, where it stands beside the bank's words.
 *
 * A history page prints the same year several times: once in a caption, once
 * in a newspaper's dateline, once where the thing happened. The place that
 * counts is the one with the most of the bank's words around it and, between
 * equals, the one that stands closest to one of them; the first on the page
 * breaks what is left. Returns which words were there, so the record shows
 * why that place was chosen.
 */
export function matchToken(text, value, near) {
  const occurrences = [...text.matchAll(tokenPattern(value))].map((match) => match.index)
  if (occurrences.length === 0) return { status: 'value-missing', found: [], context: [], excerpt: null }

  const folded = text.toLowerCase()
  // Lower-casing can change a string's length in a few scripts; if it did, the
  // positions below would not be positions in `text`.
  const searchable = folded.length === text.length ? folded : text
  let best = null
  for (const index of occurrences) {
    const from = Math.max(0, index - CONTEXT_RADIUS)
    const to = Math.min(text.length, index + value.length + CONTEXT_RADIUS)
    const context = []
    let nearest = Infinity
    for (const word of near) {
      const needle = searchable === folded ? word.toLowerCase() : word
      // The closest occurrence of this word on either side of the value.
      const left = searchable.lastIndexOf(needle, index)
      const right = searchable.indexOf(needle, index)
      const distances = [
        left >= from ? index - left : Infinity,
        right >= 0 && right + needle.length <= to ? right - index : Infinity,
      ]
      const distance = Math.min(...distances)
      if (distance === Infinity) continue
      context.push(word)
      nearest = Math.min(nearest, distance)
    }
    if (context.length === 0) continue
    const better =
      best === null ||
      context.length > best.context.length ||
      (context.length === best.context.length && nearest < best.nearest)
    if (better) best = { index, context, nearest }
  }

  if (best === null) return { status: 'context-missing', found: [value], context: [], excerpt: null }
  return {
    status: 'ok',
    found: [value],
    context: best.context,
    excerpt: excerptAround(text, best.index, value.length),
  }
}

/**
 * A counted fact: every name, in one of its spellings, inside one stretch of
 * `NAME_LIST_SPAN` characters. Reports each name as the page spells it, in
 * the bank's order.
 */
export function matchNames(text, names) {
  // Every occurrence of every spelling, as (position, which name).
  const hits = []
  names.forEach((spellings, nameIndex) => {
    for (const spelling of spellings) {
      for (const match of text.matchAll(tokenPattern(spelling))) {
        hits.push({ index: match.index, nameIndex, spelling })
      }
    }
  })
  hits.sort((a, b) => a.index - b.index || a.nameIndex - b.nameIndex)

  const seenAnywhere = names.map((_, nameIndex) => hits.find((hit) => hit.nameIndex === nameIndex)?.spelling)
  if (seenAnywhere.some((spelling) => spelling === undefined)) {
    return {
      status: 'value-missing',
      found: seenAnywhere.filter((spelling) => spelling !== undefined),
      context: [],
      excerpt: null,
    }
  }

  // The first window, left to right, that holds all of them.
  for (let start = 0; start < hits.length; start += 1) {
    const inWindow = new Map()
    for (let end = start; end < hits.length; end += 1) {
      if (hits[end].index - hits[start].index > NAME_LIST_SPAN) break
      if (!inWindow.has(hits[end].nameIndex)) inWindow.set(hits[end].nameIndex, hits[end].spelling)
      if (inWindow.size === names.length) {
        return {
          status: 'ok',
          found: names.map((_, nameIndex) => inWindow.get(nameIndex)),
          context: [],
          excerpt: null,
        }
      }
    }
  }
  // All the names, scattered: the page mentions the countries, not the list.
  return { status: 'context-missing', found: seenAnywhere, context: [], excerpt: null }
}

export function matchFact(text, entry) {
  return entry.match.kind === 'token'
    ? matchToken(text, entry.value, entry.match.near)
    : matchNames(text, entry.match.names)
}

// ---------------------------------------------------------------------------
// Finding to record
// ---------------------------------------------------------------------------

/**
 * One record of `facts.generated.ts`.
 *
 * `page` is what the fetch brought back: `{ httpStatus, resolvedUrl, title,
 * text }` for an answer, `null` for none. `text` is already normalised.
 *
 * `previous` is the committed record of the same source, if there is one. A
 * page that reads exactly as it did keeps its record, date included: the
 * date says when this text was first read, the hash says it is still the
 * text, and a run that learnt nothing new changes no byte of the file.
 */
export function captureRecord({ entry, source, publisher, page, date, previous }) {
  const base = {
    factId: entry.id,
    url: source.url,
    publisher: publisher.name,
    group: publisher.group,
  }
  const blank = { title: null, textSha256: null, found: [], context: [], excerpt: null }

  let record
  if (page === null) {
    record = { ...base, status: 'unreachable', httpStatus: null, resolvedUrl: null, accessedAt: date, ...blank }
  } else if (page.httpStatus !== 200 || page.text === null) {
    record = {
      ...base,
      status: 'http-error',
      httpStatus: page.httpStatus,
      resolvedUrl: page.resolvedUrl,
      accessedAt: date,
      ...blank,
    }
  } else {
    const finding = matchFact(page.text, entry)
    record = {
      ...base,
      status: finding.status,
      httpStatus: page.httpStatus,
      resolvedUrl: page.resolvedUrl,
      title: page.title,
      accessedAt: date,
      textSha256: sha256(page.text),
      found: finding.found,
      context: finding.context,
      excerpt: finding.excerpt,
    }
  }

  const ordered = orderRecord(record)
  if (previous && sameReading(orderRecord(previous), ordered)) return orderRecord(previous)
  return ordered
}

const RECORD_FIELDS = [
  'factId',
  'url',
  'publisher',
  'group',
  'status',
  'httpStatus',
  'resolvedUrl',
  'title',
  'accessedAt',
  'textSha256',
  'found',
  'context',
  'excerpt',
]

/** The fields in the order the file prints them, whatever order they came in. */
function orderRecord(record) {
  return Object.fromEntries(RECORD_FIELDS.map((field) => [field, record[field]]))
}

/** Whether two records differ in nothing but the day. */
function sameReading(a, b) {
  return JSON.stringify({ ...a, accessedAt: '' }) === JSON.stringify({ ...b, accessedAt: '' })
}

/** The digest the generated module carries: a hand-edited record breaks it. */
export function capturesDigest(records) {
  return sha256(JSON.stringify(records.map(orderRecord)))
}

/** `src/content/facts.generated.ts`, byte for byte. */
export function serialiseCaptures(records) {
  const ordered = records.map(orderRecord)
  const body = JSON.stringify(ordered, null, 2)
  return `/**
 * GENERATED FILE — do not edit.
 *
 * Produced by \`npm run facts:capture\` from the sources listed in
 * src/content/facts.bank.ts. Every record is what one page held on the day
 * the script read it: status, title, the hash of its text, and the few words
 * around the value. The gate judges facts against this file, so a line typed
 * here by hand would be a source nobody read; the digest at the foot is
 * there to make that fail (\`npm run test:facts\`).
 *
 * Regenerate rather than patch. A page the script cannot open belongs in
 * src/content/facts.manual.ts.
 */

import type { CapturedSource } from './factCapture'

export const CAPTURED_SOURCES: readonly CapturedSource[] = ${body}

/** SHA-256 of the records above, as the script serialised them. */
export const CAPTURE_DIGEST = '${capturesDigest(records)}'
`
}
