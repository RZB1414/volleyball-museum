/**
 * Headless proof that a fact's sources are pages somebody read.
 *
 *   npm run test:facts
 *
 * A knowledge lock turns a year into a key, so a wrong source is a locked
 * drawer. The game shipped with a source that answered 404 and two that did
 * not contain their year, and the old gate could not have known: it compared
 * the names of publishers. `npm run facts:capture` now reads the pages, and
 * this suite is the half of that work the gate can run without a network:
 *
 *   - the reading itself (page to text, text to finding, finding to record),
 *     on pages written for the test;
 *   - the gate's rules (`validateFactCaptures`), on a record small enough to
 *     break one line at a time;
 *   - the committed record: that it is what the script wrote, that the four
 *     codes of the plan each rest on two independent publishers, and that
 *     the three sources the game used to get wrong stay fixed.
 *
 * It never fetches. Whether a page still says today what it said on the day
 * it was read is the capture's question, asked on purpose and outside the
 * gate.
 */

import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  EXCERPT_MAX_WORDS,
  goodCaptures,
  independentGroups,
  publisherOf,
  tokenPattern,
  validateFactCaptures,
  wordCount,
  type CapturedSource,
  type FactBankEntry,
  type FactCaptureSet,
  type ManualCapture,
} from '../src/content/factCapture.ts'
import { FACT_BANK } from '../src/content/facts.bank.ts'
import { CAPTURE_DIGEST, CAPTURED_SOURCES } from '../src/content/facts.generated.ts'
import { MANUAL_CAPTURES } from '../src/content/facts.manual.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { Fact } from '../src/content/schema.ts'
import {
  captureRecord,
  capturesDigest,
  CONTEXT_RADIUS,
  excerptAround,
  htmlPage,
  htmlTitle,
  htmlToText,
  matchNames,
  matchToken,
  mediaWikiPage,
  mediaWikiRequest,
  NAME_LIST_SPAN,
  serialiseCaptures,
  sha256,
} from './lib/factsCapture.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// A Windows checkout may hand these files over with CRLF; the script writes LF.
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8').replace(/\r\n/g, '\n')

let passed = 0
function test(name: string, run: () => void) {
  run()
  passed += 1
  console.log(`  pass  ${name}`)
}

const codesOf = (issues: readonly { code: string }[]) => issues.map((issue) => issue.code)

console.log('\nFact sources')

// ---------------------------------------------------------------------------
// Page to text
// ---------------------------------------------------------------------------

/** Enough words to push two passages further apart than the context radius. */
const FILLER = `<p>${'The gymnasium had a running track above the floor. '.repeat(40)}</p>`

/**
 * A page written for the test, with every trap the real ones set: the year in
 * a script, a stylesheet and a comment; years side by side in a menu; a link
 * right before a full stop; a footnote caller on the sentence that matters;
 * and the same year twice, once beside the claim and once far from it.
 */
const PAGE = `<!doctype html>
<html><head><title>How the game got its name &amp; kept it &ndash; Example</title>
<style>.y1896 { width: 1896px }</style>
<script>var visits = 18961896; var year = 1918</script></head>
<body><!-- reviewed 1918 times -->
<nav><a href="/1895">1895</a><a href="/1897">1897</a></nav>
<p>A catalogue of 1896 listed twelve balls and a rope.</p>
${FILLER}
<p>Early in 1896 the game was shown at <a href="/s">Springfield</a>. Dr. A. T. Halstead watched
and proposed the name <b>Volley Ball</b><sup id="r3" class="reference"><a href="#n3">[3]</a></sup>.
The name stayed.</p>
${FILLER}
<p>The rules were printed again in 1897.</p>
</body></html>`

const PAGE_TEXT = htmlToText(PAGE)

test('the text of a page is what a reader sees, and nothing a request changes', () => {
  // Scripts, stylesheets and comments carry the counters and stamps that differ
  // between two requests, and would otherwise "contain" any year.
  for (const hidden of ['visits', 'width', 'reviewed', '1918', '18961896']) {
    assert.ok(!PAGE_TEXT.includes(hidden), `the text still holds "${hidden}"`)
  }
  // Two links side by side are two tokens, never one.
  assert.match(PAGE_TEXT, /^1895 1897 A catalogue of 1896/)
  // The link before the full stop does not leave a space in front of it…
  assert.ok(PAGE_TEXT.includes('shown at Springfield. Dr. A. T. Halstead'))
  // …and the footnote caller is gone, so the sentence ends where it ends.
  assert.ok(PAGE_TEXT.includes('proposed the name Volley Ball. The name stayed.'))
  assert.ok(!PAGE_TEXT.includes('[3]'))
  assert.ok(!/\s{2,}|\n/.test(PAGE_TEXT), 'the text is not one line of single spaces')
  assert.equal(htmlToText(PAGE), PAGE_TEXT, 'reading the same page twice gives two texts')
})

test('a page is known by its own title', () => {
  assert.equal(htmlTitle(PAGE), 'How the game got its name & kept it – Example')
  assert.equal(htmlTitle('<body><h1>Only a <em>heading</em></h1></body>'), 'Only a heading')
  assert.equal(htmlTitle('<body><p>Nothing</p></body>'), null)
})

test('an answer that is not the page carries no text', () => {
  const url = 'https://www.volleyhall.org/gone.html'
  assert.deepEqual(htmlPage(404, 'text/html', url, '<title>Not found</title><p>1896</p>'), {
    httpStatus: 404,
    resolvedUrl: url,
    title: null,
    text: null,
  })
  // A PDF answers 200 and is not something this reader can search.
  assert.equal(htmlPage(200, 'application/pdf', url, '%PDF 1896').text, null)
  assert.equal(htmlPage(200, 'text/html; charset=utf-8', url, PAGE).text, PAGE_TEXT)
})

test('a wiki article is read as one rendered revision, and recorded by its permalink', () => {
  const url = 'https://pt.wikipedia.org/wiki/Federa%C3%A7%C3%A3o_Internacional_de_Voleibol'
  const request = new URL(mediaWikiRequest(url))
  assert.equal(request.origin, 'https://pt.wikipedia.org')
  assert.equal(request.pathname, '/w/api.php')
  assert.equal(request.searchParams.get('action'), 'parse')
  assert.equal(request.searchParams.get('page'), 'Federação_Internacional_de_Voleibol')
  assert.equal(request.searchParams.get('prop'), 'text|revid')

  const page = mediaWikiPage(url, 200, {
    parse: {
      title: 'Federação Internacional de Voleibol',
      revid: 71388005,
      text: '<div><p>Fundada em <a href="/wiki/1947">1947</a>.</p></div>',
    },
  })
  assert.deepEqual(page, {
    httpStatus: 200,
    resolvedUrl:
      'https://pt.wikipedia.org/w/index.php?title=Federa%C3%A7%C3%A3o_Internacional_de_Voleibol&oldid=71388005',
    title: 'Federação Internacional de Voleibol',
    text: 'Fundada em 1947.',
  })
  // The API answers 200 with an error object when the article does not exist.
  assert.equal(mediaWikiPage(url, 200, { error: { code: 'missingtitle' } }).httpStatus, 404)
  assert.equal(mediaWikiPage(url, 503, null).text, null)
})

// ---------------------------------------------------------------------------
// Text to finding
// ---------------------------------------------------------------------------

test('a year counts where it stands beside the claim, not where it comes first', () => {
  const finding = matchToken(PAGE_TEXT, '1896', ['Halstead', 'Volley Ball'])
  assert.equal(finding.status, 'ok')
  assert.deepEqual(finding.found, ['1896'])
  assert.deepEqual(finding.context, ['Halstead', 'Volley Ball'])
  // Not the catalogue of 1896, which opens the page and is about balls.
  assert.equal(finding.excerpt, 'Early in 1896 the game was shown at Springfield.')
})

test('between two places beside the claim, the one with more of it wins, then the nearer', () => {
  const far = ' and so on'.repeat(Math.ceil(CONTEXT_RADIUS / 10) + 1)
  const text = `In 1896 Halstead spoke.${far} Printed in July 1896, the rules named Halstead and Volley Ball.`
  const finding = matchToken(text, '1896', ['Halstead', 'Volley Ball'])
  assert.deepEqual(finding.context, ['Halstead', 'Volley Ball'])
  assert.ok(finding.excerpt?.includes('July 1896'), finding.excerpt ?? '')

  const tied = `In 1896 it was played. Much later Halstead wrote of it.${far} forth. Halstead named it in 1896.`
  assert.equal(matchToken(tied, '1896', ['Halstead']).excerpt, 'Halstead named it in 1896.')
})

test('a year that is on the page but not beside the claim is not a capture', () => {
  // This is the page the game cited for 1897: it holds the year, in a menu and
  // in a sentence about a reprint, and says nothing of a handbook.
  const finding = matchToken(PAGE_TEXT, '1897', ['handbook'])
  assert.deepEqual(finding, { status: 'context-missing', found: ['1897'], context: [], excerpt: null })
  // And the claim beside the wrong year is no better.
  assert.ok(PAGE_TEXT.length > 2 * CONTEXT_RADIUS)
  assert.equal(matchToken(PAGE_TEXT, '1897', ['Halstead']).status, 'context-missing')
})

test('a page that does not hold the value says so', () => {
  assert.deepEqual(matchToken(PAGE_TEXT, '1918', ['six']), {
    status: 'value-missing',
    found: [],
    context: [],
    excerpt: null,
  })
  // The value is a whole token: not a longer number, not the tail of a model name.
  assert.equal(matchToken('Ball no. 18960, model X1896a, Halstead', '1896', ['Halstead']).status, 'value-missing')
  assert.equal(matchToken('The 1896–97 season, says Halstead', '1896', ['Halstead']).status, 'ok')
  assert.deepEqual(
    [...'(1896), 1896. 21896'.matchAll(tokenPattern('1896'))].map((match) => match.index),
    [1, 8],
  )
})

test('an excerpt is a locator: fourteen words at most, the value inside, cut at the sentence', () => {
  const long =
    'The first sentence ends here. Then, after many months of trial in the old gymnasium, in 1896 the ' +
    'new name was adopted by the conference and by every director who had come to see it played.'
  const excerpt = excerptAround(long, long.indexOf('1896'), 4)
  assert.equal(wordCount(excerpt), EXCERPT_MAX_WORDS)
  assert.ok(tokenPattern('1896').test(excerpt))
  // Clipped on both sides, and it says so.
  assert.ok(excerpt.startsWith('…') && excerpt.endsWith('…'), excerpt)

  // A sentence shorter than the window is quoted whole and nothing beyond it.
  const short = 'Before. It was renamed in 1896. After that it spread.'
  assert.equal(excerptAround(short, short.indexOf('1896'), 4), 'It was renamed in 1896.')
  // "Dr." and an initial end in a full stop and end no sentence.
  const titled = 'In 1896 Dr. A. T. Halstead named it.'
  assert.equal(excerptAround(titled, titled.indexOf('1896'), 4), titled)
  // A value glued to punctuation keeps its punctuation.
  const glued = 'The conference (1896) accepted the name.'
  assert.equal(excerptAround(glued, glued.indexOf('1896'), 4), glued)

  // Whatever the page, never more than the limit.
  for (const match of PAGE_TEXT.matchAll(tokenPattern('1896'))) {
    assert.ok(wordCount(excerptAround(PAGE_TEXT, match.index, 4)) <= EXCERPT_MAX_WORDS)
  }
})

const THREE_NAMES = [
  ['Belgium', 'Bélgica'],
  ['Brazil', 'Brasil'],
  ['United States', 'USA', 'Estados Unidos'],
] as const

test('a counted fact is captured as its list of names, in the page\'s own spelling', () => {
  const page = 'Em Paris estiveram a Bélgica, o Brasil e os Estados Unidos. O Brasil voltou em 1949.'
  assert.deepEqual(matchNames(page, THREE_NAMES), {
    status: 'ok',
    found: ['Bélgica', 'Brasil', 'Estados Unidos'],
    context: [],
    excerpt: null,
  })
  // One name short is not the list, and the record says which it did find.
  assert.deepEqual(matchNames('Belgium and Brazil sat at the table.', THREE_NAMES), {
    status: 'value-missing',
    found: ['Belgium', 'Brazil'],
    context: [],
    excerpt: null,
  })
  // A name inside another word is not the name.
  assert.equal(matchNames('Belgium, Brazilian teams and the USA', THREE_NAMES).status, 'value-missing')
})

test('names scattered over a page are countries mentioned, not a list', () => {
  const apart = ' and the federation grew'.repeat(Math.ceil(NAME_LIST_SPAN / 24) + 1)
  const scattered = `Belgium joined.${apart} Brazil joined.${apart} The USA joined.`
  assert.equal(matchNames(scattered, THREE_NAMES).status, 'context-missing')
  // The same three, together further down the page, are found there.
  const finding = matchNames(`${scattered}${apart} Belgium, Brazil, United States.`, THREE_NAMES)
  assert.equal(finding.status, 'ok')
  assert.deepEqual(finding.found, ['Belgium', 'Brazil', 'United States'])
})

// ---------------------------------------------------------------------------
// Finding to record
// ---------------------------------------------------------------------------

const FIVB = 'https://www.fivb.com/volleyball/the-game/history/'
const IVHF = 'https://www.volleyhall.org/history-of-volleyball.html'
const IVHF_REPRINT = 'https://www.volleyhall.org/william-morgan-father-of-volleyball.html'
const WIKI_EN = 'https://en.wikipedia.org/wiki/Volleyball'
const WIKI_PT = 'https://pt.wikipedia.org/wiki/Voleibol'

const ENTRY: FactBankEntry = {
  id: 'renaming',
  value: '1896',
  lot: 'L1',
  usedAsCode: true,
  match: { kind: 'token', near: ['Halstead', 'Volley Ball'] },
  sources: [{ url: FIVB }, { url: IVHF }, { url: IVHF_REPRINT, copies: 'fivb' }, { url: WIKI_EN }, { url: WIKI_PT }],
}

/** What the script would record for one source of `ENTRY` on the test page. */
function record(url: string, overrides: Partial<CapturedSource> = {}): CapturedSource {
  const made: CapturedSource = captureRecord({
    entry: ENTRY,
    source: { url },
    publisher: publisherOf(url),
    page: htmlPage(200, 'text/html', url, PAGE),
    date: '2026-10-04',
    previous: undefined,
  })
  return { ...made, ...overrides }
}

test('a record says what the page held, or exactly how the reading failed', () => {
  const ok = record(FIVB)
  assert.deepEqual(ok, {
    factId: 'renaming',
    url: FIVB,
    publisher: 'FIVB',
    group: 'fivb',
    status: 'ok',
    httpStatus: 200,
    resolvedUrl: FIVB,
    title: 'How the game got its name & kept it – Example',
    accessedAt: '2026-10-04',
    textSha256: sha256(PAGE_TEXT),
    found: ['1896'],
    context: ['Halstead', 'Volley Ball'],
    excerpt: 'Early in 1896 the game was shown at Springfield.',
  })

  const base = { entry: ENTRY, source: { url: IVHF }, publisher: publisherOf(IVHF), date: '2026-10-04', previous: undefined }
  const dead = captureRecord({ ...base, page: htmlPage(404, 'text/html', IVHF, '<p>1896 Halstead</p>') })
  assert.equal(dead.status, 'http-error')
  assert.equal(dead.httpStatus, 404)
  assert.deepEqual([dead.title, dead.textSha256, dead.excerpt, dead.found], [null, null, null, []])

  const silent = captureRecord({ ...base, page: null })
  assert.equal(silent.status, 'unreachable')
  assert.equal(silent.httpStatus, null)

  const without = captureRecord({ ...base, page: htmlPage(200, 'text/html', IVHF, '<title>T</title><p>In 1895.</p>') })
  assert.equal(without.status, 'value-missing')
  assert.equal(without.excerpt, null)
  // Read, searched and hashed all the same: the next run can tell if it changed.
  assert.equal(without.textSha256, sha256('In 1895.'))
})

test('reading an unchanged page again changes nothing, date included', () => {
  const first = record(FIVB)
  const again = captureRecord({
    entry: ENTRY,
    source: { url: FIVB },
    publisher: publisherOf(FIVB),
    page: htmlPage(200, 'text/html', FIVB, PAGE),
    date: '2027-01-15',
    previous: first,
  })
  assert.deepEqual(again, first)
  assert.equal(serialiseCaptures([again]), serialiseCaptures([first]))

  // One word of the page changes: new hash, and the day it was read again.
  const edited = captureRecord({
    entry: ENTRY,
    source: { url: FIVB },
    publisher: publisherOf(FIVB),
    page: htmlPage(200, 'text/html', FIVB, PAGE.replace('twelve balls', 'thirteen balls')),
    date: '2027-01-15',
    previous: first,
  })
  assert.equal(edited.accessedAt, '2027-01-15')
  assert.notEqual(edited.textSha256, first.textSha256)
  // A page that stops answering does not keep yesterday's capture.
  const gone = captureRecord({
    entry: ENTRY,
    source: { url: FIVB },
    publisher: publisherOf(FIVB),
    page: null,
    date: '2027-01-15',
    previous: first,
  })
  assert.equal(gone.status, 'unreachable')
  assert.equal(gone.accessedAt, '2027-01-15')
})

test('the generated module is a function of the records alone', () => {
  const records = [record(FIVB), record(IVHF)]
  const text = serialiseCaptures(records)
  assert.equal(serialiseCaptures(records), text)
  // Field order is the file's, whatever order an object was built in.
  const shuffled = records.map((entry) => Object.fromEntries(Object.entries(entry).reverse()))
  assert.equal(serialiseCaptures(shuffled), text)
  assert.ok(text.includes(`export const CAPTURE_DIGEST = '${capturesDigest(records)}'`))
  assert.ok(text.startsWith('/**\n * GENERATED FILE — do not edit.'))
  // One character of one record, and the digest is another.
  assert.notEqual(capturesDigest([record(FIVB, { accessedAt: '2026-10-05' }), record(IVHF)]), capturesDigest(records))
})

// ---------------------------------------------------------------------------
// The gate's rules
// ---------------------------------------------------------------------------

const cite = (capture: CapturedSource) => ({
  title: capture.title ?? '',
  url: capture.url,
  publisher: capture.publisher,
  accessedAt: capture.accessedAt,
})

const FACT: Fact = {
  id: 'renaming',
  claimKey: 'fact.renaming.claim',
  value: '1896',
  confidence: 'high',
  verifiedAt: '2026-10-04',
  usedAsCode: true,
  sources: [cite(record(FIVB)), cite(record(IVHF))],
}

const ALL_READ: FactCaptureSet = {
  bank: [ENTRY],
  captured: ENTRY.sources.map((source) => record(source.url)),
  manual: [],
}

/** `ALL_READ` with some sources replaced or removed (`null`). */
function withCaptures(changes: Record<string, Partial<CapturedSource> | null>, manual: readonly ManualCapture[] = []): FactCaptureSet {
  return {
    bank: [ENTRY],
    captured: ALL_READ.captured.flatMap((capture) => {
      if (!(capture.url in changes)) return [capture]
      const change = changes[capture.url]
      return change === null ? [] : [{ ...capture, ...change }]
    }),
    manual,
  }
}

const FAILED = { status: 'http-error', httpStatus: 404, title: null, textSha256: null, found: [], context: [], excerpt: null } as const
const pending = (url: string): ManualCapture => ({ factId: 'renaming', url, why: 'the site turns the script away', check: null })

test('a record in which every source was read passes, and counts publishers, not pages', () => {
  assert.deepEqual(validateFactCaptures([FACT], ALL_READ), [])
  // Five pages, three publishers: the reprint counts with the federation it
  // copies, and two language editions of Wikipedia are one family.
  assert.deepEqual(independentGroups(ENTRY, ALL_READ), ['fivb', 'ivhf', 'wikipedia'])
  assert.equal(goodCaptures(ENTRY, ALL_READ).length, 5)
  assert.equal(publisherOf(WIKI_EN)?.group, publisherOf(WIKI_PT)?.group)
  assert.equal(publisherOf('https://example.org/volleyball'), null)
  assert.equal(publisherOf('not an address'), null)
})

test('fact-code-uncaptured: a code needs two publishers that do not depend on each other', () => {
  // The federation and the page that reprints it: two sites, one account.
  const reprint = withCaptures({ [IVHF]: FAILED, [WIKI_EN]: FAILED, [WIKI_PT]: FAILED })
  const fact = { ...FACT, sources: [cite(record(FIVB)), cite(record(IVHF_REPRINT))] }
  assert.deepEqual(independentGroups(ENTRY, reprint), ['fivb'])
  assert.deepEqual(codesOf(validateFactCaptures([fact], reprint)), ['fact-code-uncaptured'])

  // Two editions of one encyclopaedia.
  const family = withCaptures({ [FIVB]: FAILED, [IVHF]: FAILED, [IVHF_REPRINT]: FAILED })
  const wikiFact = { ...FACT, sources: [cite(record(WIKI_EN)), cite(record(WIKI_PT))] }
  assert.deepEqual(codesOf(validateFactCaptures([wikiFact], family)), ['fact-code-uncaptured'])

  // The same record is fine for a fact that opens nothing.
  const told = { ...wikiFact, usedAsCode: false }
  assert.deepEqual(validateFactCaptures([told], { ...family, bank: [{ ...ENTRY, usedAsCode: false }] }), [])
  // But the content cannot promote it to a code behind the bank's back.
  assert.ok(
    codesOf(validateFactCaptures([wikiFact], { ...ALL_READ, bank: [{ ...ENTRY, usedAsCode: false }] })).includes(
      'fact-code-uncaptured',
    ),
  )
})

test('fact-code-uncaptured covers a code whose wing does not exist yet', () => {
  // The plan captures the wings' codes ahead of the wings: the bank holds
  // them to the rule before any content names them.
  const reprint = withCaptures({ [IVHF]: FAILED, [WIKI_EN]: FAILED, [WIKI_PT]: FAILED })
  assert.deepEqual(codesOf(validateFactCaptures([], reprint)), ['fact-code-uncaptured'])
  assert.deepEqual(validateFactCaptures([], ALL_READ), [])
})

test('a page the robot cannot open counts once a person has read it, and not before', () => {
  const blocked = { [IVHF]: FAILED, [WIKI_EN]: FAILED, [WIKI_PT]: FAILED } as const
  const fact = { ...FACT, sources: [cite(record(FIVB))] }
  // Asked for, and still unread: one publisher.
  const asked = withCaptures(blocked, [pending(IVHF)])
  assert.deepEqual(codesOf(validateFactCaptures([fact], asked)), ['fact-code-uncaptured'])

  const excerpt = 'In early 1896 he suggested the name.'
  const checked: ManualCapture = {
    ...pending(IVHF),
    check: {
      accessedAt: '2026-10-06',
      title: 'The history, read in a browser',
      excerpt,
      excerptSha256: sha256(excerpt),
      checkedBy: 'the owner',
    },
  }
  const readByHand = withCaptures(blocked, [checked])
  assert.deepEqual(validateFactCaptures([fact], readByHand), [])
  assert.deepEqual(independentGroups(ENTRY, readByHand), ['fivb', 'ivhf'])
  assert.equal(goodCaptures(ENTRY, readByHand).find((capture) => capture.url === IVHF)?.readBy, 'person')
  // And the game may then cite it, by the title and the day the person gave.
  const citing = {
    ...FACT,
    verifiedAt: '2026-10-06',
    sources: [cite(record(FIVB)), { title: checked.check!.title, url: IVHF, publisher: 'International Volleyball Hall of Fame', accessedAt: '2026-10-06' }],
  }
  assert.deepEqual(validateFactCaptures([citing], readByHand), [])

  // A check whose excerpt does not hold the value was not a check.
  const empty = { ...checked, check: { ...checked.check!, excerpt: 'He suggested the name.' } }
  assert.ok(codesOf(validateFactCaptures([fact], withCaptures(blocked, [empty]))).includes('fact-capture-malformed'))
})

test('fact-source-uncaptured: the game cites only pages that were read and hold the value', () => {
  // The address that answers 404 (the game's old second source for 1896).
  const dead = withCaptures({ [IVHF]: FAILED })
  assert.deepEqual(codesOf(validateFactCaptures([FACT], dead)), ['fact-source-uncaptured'])

  // The page that answers and does not contain the year (the old 1897 and 1918).
  const yearless = withCaptures({
    [IVHF]: { status: 'value-missing', found: [], context: [], excerpt: null },
  })
  assert.deepEqual(codesOf(validateFactCaptures([FACT], yearless)), ['fact-source-uncaptured'])

  // An address that is not in the bank at all.
  const stray = { ...FACT, sources: [...FACT.sources, { ...cite(record(FIVB)), url: 'https://www.fivb.com/elsewhere/' }] }
  assert.deepEqual(codesOf(validateFactCaptures([stray], ALL_READ)), ['fact-source-uncaptured'])

  // A fact the bank has never heard of: told or code, nothing behind it was read.
  const orphan = { ...FACT, id: 'orphan', usedAsCode: false }
  assert.deepEqual(codesOf(validateFactCaptures([FACT, orphan], ALL_READ)), ['fact-source-uncaptured'])
  assert.deepEqual(codesOf(validateFactCaptures([FACT, { ...orphan, usedAsCode: true }], ALL_READ)), ['fact-code-uncaptured'])
})

test('fact-source-drift: what the game prints of a source is what the reading recorded', () => {
  const [fivb, ivhf] = FACT.sources
  const drifted = (source: typeof fivb, verifiedAt = FACT.verifiedAt) =>
    codesOf(validateFactCaptures([{ ...FACT, verifiedAt, sources: [source, ivhf] }], ALL_READ))

  // A title somebody typed (the old record named a handbook on a Wikipedia page).
  assert.deepEqual(drifted({ ...fivb, title: 'Official Handbook of the Athletic League' }), ['fact-source-drift'])
  // "Wikipedia" and "Wikipédia" used to count as two publishers.
  assert.deepEqual(drifted({ ...fivb, publisher: 'Fédération Internationale' }), ['fact-source-drift'])
  // A date that is not the day the page was read.
  assert.deepEqual(drifted({ ...fivb, accessedAt: '2026-07-30' }), ['fact-source-drift'])
  // "Verified" before its sources were read: the claim the old record made.
  assert.deepEqual(drifted(fivb, '2026-07-30'), ['fact-source-drift', 'fact-source-drift'])
  assert.deepEqual(drifted(fivb), [])
})

test('fact-capture-malformed: the three files are whole and agree with each other', () => {
  const broken = (set: FactCaptureSet, expected: RegExp) => {
    const issues = validateFactCaptures([FACT], set).filter((issue) => issue.code === 'fact-capture-malformed')
    assert.ok(issues.some((issue) => expected.test(issue.message)), `no issue matches ${expected}:\n${issues.map((issue) => issue.message).join('\n')}`)
  }
  const bank = (changes: Partial<FactBankEntry>): FactCaptureSet => ({ ...ALL_READ, bank: [{ ...ENTRY, ...changes }] })

  // The bank.
  broken({ ...ALL_READ, bank: [ENTRY, ENTRY] }, /lists "renaming" twice/)
  broken(bank({ sources: [...ENTRY.sources, { url: 'https://example.org/history' }] }), /nobody owns the host/)
  broken(bank({ sources: [...ENTRY.sources, { url: 'http://www.fivb.com/old/' }] }), /not an https address/)
  broken(bank({ sources: [{ url: FIVB, copies: 'fivb' }, ...ENTRY.sources.slice(1)] }), /copies its own publisher/)
  broken(bank({ match: { kind: 'token', near: [] } }), /anywhere on a page/)
  broken(bank({ value: '1897' }), /"1896" in the content and "1897" in the bank/)
  // A count is its list: fourteen names, or it is not fourteen.
  broken(bank({ value: '14', match: { kind: 'names', names: THREE_NAMES } }), /count 14 but lists 3 names/)
  // A source added to the bank and never read.
  broken(withCaptures({ [WIKI_PT]: null }), /was never read/)

  // The captures.
  broken({ ...ALL_READ, captured: [...ALL_READ.captured, record(FIVB)] }, /appears twice/)
  broken({ ...ALL_READ, captured: [...ALL_READ.captured, record('https://www.fivb.com/other/')] }, /matches no source in the bank/)
  broken(withCaptures({ [FIVB]: { publisher: 'Somebody Else' } }), /publisher the registry does not give/)
  broken(withCaptures({ [FIVB]: { accessedAt: '2026-02-31' } }), /no valid date/)
  broken(withCaptures({ [FIVB]: { textSha256: 'abc' } }), /no hash of the text/)
  broken(withCaptures({ [FIVB]: { title: ' ' } }), /no title/)
  broken(withCaptures({ [FIVB]: { found: [] } }), /did not find "1896"/)
  broken(withCaptures({ [FIVB]: { context: ['Springfield'] } }), /without one of the bank's words/)
  broken(withCaptures({ [FIVB]: { excerpt: 'Early in 1895 the game was shown.' } }), /excerpt does not hold "1896"/)
  broken(withCaptures({ [FIVB]: { excerpt: `In 1896 ${'word '.repeat(EXCERPT_MAX_WORDS)}`.trim() } }), /an excerpt holds 14 at most/)
  broken(withCaptures({ [FIVB]: { ...FAILED, excerpt: 'In 1896.' } }), /still carries an excerpt/)
  broken(withCaptures({ [FIVB]: { httpStatus: 404 } }), /"ok" with HTTP 404/)

  // The manual checks.
  broken({ ...ALL_READ, manual: [pending('https://www.fivb.com/other/')] }, /Manual check .* matches no source/)
  broken({ ...ALL_READ, manual: [{ ...pending(IVHF), why: '' }] }, /does not say why/)
  const half = { accessedAt: 'yesterday', title: 'T', excerpt: 'In 1896.', excerptSha256: 'abc', checkedBy: '' }
  broken({ ...ALL_READ, manual: [{ ...pending(IVHF), check: half }] }, /does not say who read the page/)
  broken({ ...ALL_READ, manual: [{ ...pending(IVHF), check: half }] }, /no hash of its excerpt/)
  broken({ ...ALL_READ, manual: [{ ...pending(IVHF), check: half }] }, /no valid date \("yesterday"\)/)
})

// ---------------------------------------------------------------------------
// The committed record
// ---------------------------------------------------------------------------

const COMMITTED: FactCaptureSet = { bank: FACT_BANK, captured: CAPTURED_SOURCES, manual: MANUAL_CAPTURES }
const bankEntry = (id: string) => {
  const entry = FACT_BANK.find((candidate) => candidate.id === id)
  assert.ok(entry, `the bank has no "${id}"`)
  return entry
}

test('facts.generated.ts is exactly what the script wrote', () => {
  // Byte for byte: a record patched by hand, a reordered field or a stale
  // digest all fail here, and regenerating is the only way to pass.
  assert.equal(
    read('src/content/facts.generated.ts'),
    serialiseCaptures(CAPTURED_SOURCES),
    'src/content/facts.generated.ts was edited by hand or by an older script: run `npm run facts:capture`',
  )
  assert.equal(CAPTURE_DIGEST, capturesDigest(CAPTURED_SOURCES))
})

test('the committed record passes the gate, for the content and for the bank', () => {
  const issues = validateFactCaptures(MUSEUM.facts, COMMITTED)
  assert.deepEqual(issues.map((issue) => `[${issue.code}] ${issue.message}`), [])
  // Every fact the game states is in the bank: nothing is cited on trust.
  for (const fact of MUSEUM.facts) {
    assert.equal(bankEntry(fact.id).value, fact.value)
    assert.ok(fact.sources.length > 0, `${fact.id} cites nothing`)
  }
})

test('the four codes captured ahead of their lots each rest on two independent publishers', () => {
  // Plan, P0 item 5 and §7.7 items 1 and 5.
  const codes = { 'springfield-renaming': '1896', 'founding-federations': '14', 'japan-world-title': '1962', 'wagner-takes-poland': '1973' }
  for (const [id, value] of Object.entries(codes)) {
    const entry = bankEntry(id)
    assert.equal(entry.value, value)
    assert.equal(entry.usedAsCode, true, `${id} is not held to a code's standard`)
    const groups = independentGroups(entry, COMMITTED)
    assert.ok(groups.length >= 2, `${id} (${value}) rests on ${groups.length} publisher(s): ${groups.join(', ')}`)
  }
  // The one code in use is captured in the two groups the plan names.
  const renaming = independentGroups(bankEntry('springfield-renaming'), COMMITTED)
  assert.ok(renaming.includes('fivb') && renaming.includes('ivhf'), renaming.join(', '))
  // The fourteen are counted: captured as fourteen names, never as a numeral.
  const founders = bankEntry('founding-federations')
  assert.equal(founders.match.kind, 'names')
  for (const capture of CAPTURED_SOURCES.filter((entry) => entry.factId === founders.id && entry.status === 'ok')) {
    assert.equal(capture.found.length, 14, `${capture.url} holds ${capture.found.length} names`)
    assert.equal(new Set(capture.found).size, 14)
  }
})

test('the three sources the game had wrong stay fixed', () => {
  const sourcesOf = (id: string) => {
    const fact = MUSEUM.facts.find((candidate) => candidate.id === id)
    assert.ok(fact, `no fact "${id}"`)
    return fact.sources.map((source) => source.url)
  }
  // The address that answers 404.
  for (const fact of MUSEUM.facts) {
    for (const source of fact.sources) {
      assert.ok(!source.url.includes('/page/show/'), `${fact.id} cites the dead address ${source.url}`)
    }
  }
  // The page that holds neither 1897 nor 1918.
  for (const id of ['first-rulebook', 'six-a-side']) {
    assert.ok(!sourcesOf(id).includes('https://en.wikipedia.org/wiki/Volleyball'), `${id} cites the page without its year`)
    assert.ok(sourcesOf(id).includes('https://www.fivb.com/volleyball/the-game/history/'))
  }
  // A fact with one publisher is told, never typed.
  for (const fact of MUSEUM.facts) {
    if (independentGroups(bankEntry(fact.id), COMMITTED).length < 2) {
      assert.equal(fact.usedAsCode, false, `${fact.id} is a code on one publisher`)
    }
  }
})

test('every page the robot could not read is waiting for a person, by name', () => {
  for (const capture of CAPTURED_SOURCES) {
    if (capture.status === 'ok') continue
    assert.ok(
      MANUAL_CAPTURES.some((entry) => entry.factId === capture.factId && entry.url === capture.url),
      `${capture.url} (${capture.status}) is not in src/content/facts.manual.ts`,
    )
  }
  for (const entry of MANUAL_CAPTURES) {
    if (!entry.check) continue
    assert.equal(
      entry.check.excerptSha256,
      sha256(entry.check.excerpt),
      `${entry.url}: excerptSha256 should be ${sha256(entry.check.excerpt)}`,
    )
  }
})

// ---------------------------------------------------------------------------
// Where it runs
// ---------------------------------------------------------------------------

function sourceFiles(directory: string, extensions: RegExp): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name)
    if (statSync(path).isDirectory()) return sourceFiles(path, extensions)
    return extensions.test(name) ? [path] : []
  })
}

test('the capture stays out of the gate, and the gate reads what it wrote', () => {
  const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts
  assert.equal(scripts['facts:capture'], 'node --experimental-strip-types scripts/facts-capture.mjs')
  // The network is not a dependency of a green gate.
  assert.ok(!scripts.check.includes('facts:capture'), '`npm run check` runs the capture')
  assert.ok(scripts.check.includes('npm run test:facts'))
  assert.ok(scripts.check.includes('npm run validate:content'))
  const gate = read('scripts/validate-content.ts')
  assert.match(gate, /validateContent\(MUSEUM, .*, captures\)/, 'the content gate does not pass the record in')
  assert.match(gate, /captured: CAPTURED_SOURCES/, 'the content gate does not read the committed captures')

  // Importing the capture script runs it, so nothing else may import it.
  const importers = sourceFiles(resolve(ROOT, 'scripts'), /\.(?:ts|mjs)$/)
    .filter((path) => !path.endsWith('facts-capture.mjs'))
    .filter((path) => /(?:from|import)\s*\(?\s*['"][^'"]*facts-capture\.mjs['"]/.test(readFileSync(path, 'utf8')))
    .map((path) => relative(ROOT, path))
  assert.deepEqual(importers, [])
  // And everything it does to a page after fetching it lives where this suite ran it.
  assert.ok(!/fetch\(/.test(read('scripts/lib/factsCapture.mjs')), 'the reading library fetches')
})

test('nothing the game ships carries the capture record', () => {
  // The runtime needs four fields of a source, and has them in museum.ts. The
  // bank, the excerpts and the hashes are the gate's; a shipped module that
  // imported them would put every page's excerpt in the bundle.
  const gateOnly = ['factCapture.ts', 'facts.bank.ts', 'facts.generated.ts', 'facts.manual.ts', 'validate.ts']
  const offenders = sourceFiles(resolve(ROOT, 'src'), /\.(?:ts|tsx)$/)
    .filter((path) => !gateOnly.some((name) => path.endsWith(`content${path.includes('\\') ? '\\' : '/'}${name}`)))
    .filter((path) =>
      /(?:from|import)\s*\(?\s*['"][^'"]*(?:factCapture|facts\.bank|facts\.generated|facts\.manual|content\/validate|\.\/validate)[^'"]*['"]/.test(
        readFileSync(path, 'utf8'),
      ),
    )
    .map((path) => relative(ROOT, path))
  assert.deepEqual(offenders, [], 'a shipped module imports the capture record or the gate')
})

console.log(`\n${passed} fact source checks passed.\n`)
