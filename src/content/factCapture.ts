/**
 * Captured sources: what it takes for a fact to be believed.
 *
 * A knowledge lock makes a year load-bearing, and until this module the only
 * thing behind a year was a URL somebody typed. Of the four facts the game
 * shipped with, one cited a page that answered 404 and two cited a page that
 * did not contain their year; the gate passed all four, because it compared
 * publisher names and never opened anything.
 *
 * So a source now exists in three places, each with one author:
 *
 *   - `facts.bank.ts`      a person says which pages a fact rests on;
 *   - `facts.generated.ts` `npm run facts:capture` says what each page held
 *                          on the day it was read (the script is the only
 *                          writer);
 *   - `facts.manual.ts`    a person reads the pages the robot cannot open.
 *
 * and the gate (`validateFactCaptures`, run by `npm run validate:content`)
 * reads all three. It needs no network: it judges the committed record, not
 * the web.
 *
 * Independence is decided here and not typed per source. "Wikipedia" and
 * "Wikipédia" used to count as two publishers, and so would two pages of one
 * federation: a publisher is now the registered owner of a host, every host
 * has exactly one, and a page that reprints another publisher's text says so
 * (`copies`) and counts with the publisher it copied.
 *
 * Nothing the game ships imports this module or the three data files: the
 * runtime only needs the four fields of `FactSource`, and those are checked
 * against the captures instead of being derived from them, so the excerpts
 * and hashes stay out of the bundle.
 */

import type { Fact } from './schema'
import type { ValidationIssue } from './validate'

// ---------------------------------------------------------------------------
// Publishers
// ---------------------------------------------------------------------------

/**
 * A dependency group: sources of one group are one publisher, however many
 * pages, sites or languages they come in. A closed list, so that a typo cannot
 * invent an independent voice.
 */
export type PublisherGroup = 'fivb' | 'ivhf' | 'wikipedia' | 'pap' | 'ioc'

export type Publisher = {
  readonly group: PublisherGroup
  /** The name a citation prints. */
  readonly name: string
  readonly hosts?: readonly string[]
  readonly hostSuffix?: string
  /**
   * The host is a wiki: its articles are read through the MediaWiki API as one
   * rendered revision, and recorded by that revision's permalink. The article
   * page itself changes with every banner and cache stamp; a revision does not.
   */
  readonly mediawiki?: boolean
}

/** Who owns which host. A host nobody registered cannot be cited. */
export const PUBLISHERS: readonly Publisher[] = [
  { group: 'fivb', name: 'FIVB', hosts: ['www.fivb.com'] },
  {
    group: 'ivhf',
    name: 'International Volleyball Hall of Fame',
    hosts: ['www.volleyhall.org'],
  },
  // Every language edition is one family: they translate each other.
  { group: 'wikipedia', name: 'Wikipedia', hostSuffix: '.wikipedia.org', mediawiki: true },
  { group: 'pap', name: 'Polska Agencja Prasowa (dzieje.pl)', hosts: ['dzieje.pl'] },
  { group: 'ioc', name: 'International Olympic Committee', hosts: ['www.olympics.com'] },
]

/** The registered owner of a URL's host, or null when nobody registered it. */
export function publisherOf(url: string): Publisher | null {
  let host: string
  try {
    host = new URL(url).host
  } catch {
    return null
  }
  return (
    PUBLISHERS.find(
      (publisher) =>
        publisher.hosts?.includes(host) ||
        (publisher.hostSuffix !== undefined && host.endsWith(publisher.hostSuffix)),
    ) ?? null
  )
}

// ---------------------------------------------------------------------------
// The three records
// ---------------------------------------------------------------------------

/**
 * How a page is known to hold a fact.
 *
 * `token`: the value as a whole number, with one of the `near` words close to
 * it. A year alone proves nothing: a history page prints dozens, and the page
 * the game used to cite for 1896 would have "contained" any of them.
 *
 * `names`: a counted fact. The page has to carry the list itself, every name
 * in one of its spellings and all of them close together; the count is then
 * something the capture found, not something a sentence asserted. This is why
 * the fourteen founding federations are captured as names (plan §7.2).
 */
export type FactMatch =
  | { readonly kind: 'token'; readonly near: readonly string[] }
  | { readonly kind: 'names'; readonly names: readonly (readonly string[])[] }

export type FactBankSource = {
  readonly url: string
  /** This page reprints that publisher's text, and counts with it. */
  readonly copies?: PublisherGroup
}

export type FactBankEntry = {
  /** The `Fact.id` it backs, today or in the lot named by `lot`. */
  readonly id: string
  readonly value: string
  /** The lot whose content needs the fact. A code is captured ahead of it. */
  readonly lot: string
  /** Whether a lock resolves to it: two independent captures, or no lock. */
  readonly usedAsCode: boolean
  readonly match: FactMatch
  readonly sources: readonly FactBankSource[]
}

/**
 * What the robot found.
 *
 *   ok               the page was read and holds the value where it counts
 *   context-missing  the number is on the page, but not beside the claim
 *   value-missing    the page was read and does not hold the value
 *   http-error       the server answered, and not with the page
 *   unreachable      no answer (refused, timed out, blocked)
 *
 * Only `ok` is a capture. Everything else is a page a person has to read, and
 * belongs in `facts.manual.ts`.
 */
export type CaptureStatus = 'ok' | 'context-missing' | 'value-missing' | 'http-error' | 'unreachable'

export type CapturedSource = {
  readonly factId: string
  readonly url: string
  readonly publisher: string
  readonly group: PublisherGroup
  readonly status: CaptureStatus
  readonly httpStatus: number | null
  /** Where the request ended; for a wiki, the permalink of the revision read. */
  readonly resolvedUrl: string | null
  /** The page's own title, as it gave it. */
  readonly title: string | null
  /** The day this exact text was read (see `facts-capture.mjs` on re-runs). */
  readonly accessedAt: string
  /** SHA-256 of the text that was searched, after normalisation. */
  readonly textSha256: string | null
  /** The value, or every name of a counted fact as the page spells it. */
  readonly found: readonly string[]
  /** The `near` words that stood beside the value. */
  readonly context: readonly string[]
  /** The words around the value: enough to find the sentence, no more. */
  readonly excerpt: string | null
}

/**
 * A page the robot cannot open, read by a person.
 *
 * `check: null` is an open request: the entry says which page somebody has to
 * read, and counts for nothing until they have.
 */
export type ManualCapture = {
  readonly factId: string
  readonly url: string
  /** Why the robot cannot read it. */
  readonly why: string
  readonly check: null | {
    readonly accessedAt: string
    readonly title: string
    readonly excerpt: string
    /** SHA-256 of `excerpt`: an excerpt retyped later is a different check. */
    readonly excerptSha256: string
    readonly checkedBy: string
  }
}

export type FactCaptureSet = {
  readonly bank: readonly FactBankEntry[]
  readonly captured: readonly CapturedSource[]
  readonly manual: readonly ManualCapture[]
}

/**
 * The most an excerpt may hold. It is a locator, not a reproduction: the page
 * belongs to its publisher, the hash pins the whole text, and fourteen words
 * are enough for a reader to find the sentence.
 */
export const EXCERPT_MAX_WORDS = 14

// ---------------------------------------------------------------------------
// Reading the record
// ---------------------------------------------------------------------------

/** One source that holds the fact, whoever read it. */
export type GoodCapture = {
  readonly url: string
  readonly title: string
  readonly publisher: string
  /** The group it counts with, after `copies`. */
  readonly group: PublisherGroup
  readonly accessedAt: string
  readonly readBy: 'robot' | 'person'
}

/**
 * The value as a whole token: `1896`, never the 1896 inside `18960`.
 * Letters count as boundaries too, so a token cannot hide inside a word.
 */
export function tokenPattern(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'gu')
}

export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length

/**
 * The sources of one bank entry that count, the robot's reading first and a
 * person's where the robot has none: the gate accepts either per source.
 */
export function goodCaptures(entry: FactBankEntry, set: FactCaptureSet): GoodCapture[] {
  const good: GoodCapture[] = []
  for (const source of entry.sources) {
    const publisher = publisherOf(source.url)
    if (!publisher) continue
    const group = source.copies ?? publisher.group
    const robot = set.captured.find(
      (record) => record.factId === entry.id && record.url === source.url && record.status === 'ok',
    )
    if (robot && robot.title !== null) {
      good.push({
        url: source.url,
        title: robot.title,
        publisher: publisher.name,
        group,
        accessedAt: robot.accessedAt,
        readBy: 'robot',
      })
      continue
    }
    const person = set.manual.find(
      (manual) => manual.factId === entry.id && manual.url === source.url,
    )
    if (person?.check) {
      good.push({
        url: source.url,
        title: person.check.title,
        publisher: publisher.name,
        group,
        accessedAt: person.check.accessedAt,
        readBy: 'person',
      })
    }
  }
  return good
}

/** The publishers a fact can count on, each once however many pages it has. */
export function independentGroups(entry: FactBankEntry, set: FactCaptureSet): PublisherGroup[] {
  return [...new Set(goodCaptures(entry, set).map((capture) => capture.group))]
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SHA_256 = /^[0-9a-f]{64}$/

function isDate(text: string): boolean {
  if (!ISO_DATE.test(text)) return false
  const date = new Date(`${text}T00:00:00Z`)
  // `2026-02-31` parses, as the third of March: round-trip it.
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text
}

const sourceKey = (factId: string, url: string) => `${factId} ${url}`

/** The three files agree with each other and each is whole. */
function validateRecord(set: FactCaptureSet): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const malformed = (message: string) =>
    issues.push({ severity: 'error', code: 'fact-capture-malformed', message })

  const bankById = new Map<string, FactBankEntry>()
  const bankSources = new Set<string>()
  const groups = new Set<string>(PUBLISHERS.map((publisher) => publisher.group))

  for (const entry of set.bank) {
    if (bankById.has(entry.id)) malformed(`The fact bank lists "${entry.id}" twice.`)
    bankById.set(entry.id, entry)
    if (!entry.value.trim()) malformed(`Bank fact "${entry.id}" has no value.`)
    if (entry.sources.length === 0) malformed(`Bank fact "${entry.id}" names no source.`)

    if (entry.match.kind === 'token' && entry.match.near.length === 0) {
      malformed(
        `Bank fact "${entry.id}" matches "${entry.value}" anywhere on a page: give it the words that stand beside the claim.`,
      )
    }
    if (entry.match.kind === 'names') {
      // The list is the value: fourteen names, or the fact is not "14".
      if (String(entry.match.names.length) !== entry.value) {
        malformed(
          `Bank fact "${entry.id}" is the count ${entry.value} but lists ${entry.match.names.length} names.`,
        )
      }
      if (entry.match.names.some((spellings) => spellings.length === 0)) {
        malformed(`Bank fact "${entry.id}" has a name with no spelling.`)
      }
    }

    for (const source of entry.sources) {
      const key = sourceKey(entry.id, source.url)
      if (bankSources.has(key)) malformed(`Bank fact "${entry.id}" lists ${source.url} twice.`)
      bankSources.add(key)
      if (!source.url.startsWith('https://')) {
        malformed(`Bank fact "${entry.id}": ${source.url} is not an https address.`)
      }
      const publisher = publisherOf(source.url)
      if (!publisher) {
        malformed(
          `Bank fact "${entry.id}": nobody owns the host of ${source.url}. Register the publisher in PUBLISHERS first.`,
        )
      }
      if (source.copies !== undefined) {
        if (!groups.has(source.copies)) {
          malformed(`Bank fact "${entry.id}": ${source.url} copies unknown publisher "${source.copies}".`)
        } else if (publisher?.group === source.copies) {
          malformed(`Bank fact "${entry.id}": ${source.url} says it copies its own publisher.`)
        }
      }
    }
  }

  const seenCaptures = new Set<string>()
  for (const record of set.captured) {
    const where = `Capture of ${record.url} for "${record.factId}"`
    const key = sourceKey(record.factId, record.url)
    if (seenCaptures.has(key)) malformed(`${where} appears twice.`)
    seenCaptures.add(key)

    const entry = bankById.get(record.factId)
    if (!entry || !bankSources.has(key)) {
      malformed(`${where} matches no source in the bank: run \`npm run facts:capture\`.`)
      continue
    }
    const publisher = publisherOf(record.url)
    if (publisher && (record.publisher !== publisher.name || record.group !== publisher.group)) {
      malformed(`${where} names a publisher the registry does not give that host.`)
    }
    if (!isDate(record.accessedAt)) malformed(`${where} has no valid date ("${record.accessedAt}").`)

    if (record.status !== 'ok') {
      if (record.excerpt !== null) malformed(`${where} is "${record.status}" and still carries an excerpt.`)
      continue
    }
    if (record.httpStatus !== 200) malformed(`${where} is "ok" with HTTP ${record.httpStatus}.`)
    if (!record.title?.trim()) malformed(`${where} is "ok" with no title.`)
    if (!record.textSha256 || !SHA_256.test(record.textSha256)) {
      malformed(`${where} is "ok" with no hash of the text.`)
    }

    if (entry.match.kind === 'token') {
      const near = entry.match.near
      if (record.found.length !== 1 || record.found[0] !== entry.value) {
        malformed(`${where} is "ok" but did not find "${entry.value}".`)
      }
      if (record.context.length === 0 || record.context.some((word) => !near.includes(word))) {
        malformed(`${where} is "ok" without one of the bank's words beside the value.`)
      }
      if (record.excerpt === null || !tokenPattern(entry.value).test(record.excerpt)) {
        malformed(`${where} is "ok" but its excerpt does not hold "${entry.value}".`)
      } else if (wordCount(record.excerpt) > EXCERPT_MAX_WORDS) {
        malformed(`${where} quotes ${wordCount(record.excerpt)} words; an excerpt holds ${EXCERPT_MAX_WORDS} at most.`)
      }
    } else {
      const names = entry.match.names
      const eachFound =
        record.found.length === names.length &&
        names.every((spellings, index) => spellings.includes(record.found[index]))
      if (!eachFound) malformed(`${where} is "ok" but did not find every one of the ${names.length} names.`)
      // A list of names is evidence already; there is no sentence to quote.
      if (record.excerpt !== null) malformed(`${where} is a list of names and still carries an excerpt.`)
    }
  }

  const seenManual = new Set<string>()
  for (const entry of set.manual) {
    const where = `Manual check of ${entry.url} for "${entry.factId}"`
    const key = sourceKey(entry.factId, entry.url)
    if (seenManual.has(key)) malformed(`${where} appears twice.`)
    seenManual.add(key)
    const fact = bankById.get(entry.factId)
    if (!fact || !bankSources.has(key)) {
      malformed(`${where} matches no source in the bank.`)
      continue
    }
    if (!entry.why.trim()) malformed(`${where} does not say why the robot cannot read the page.`)
    if (!entry.check) continue

    const { check } = entry
    if (!isDate(check.accessedAt)) malformed(`${where} has no valid date ("${check.accessedAt}").`)
    if (!check.title.trim()) malformed(`${where} has no title.`)
    if (!check.checkedBy.trim()) malformed(`${where} does not say who read the page.`)
    if (!SHA_256.test(check.excerptSha256)) malformed(`${where} has no hash of its excerpt.`)
    // A counted fact is checked by its list of names, which is as long as it is.
    if (fact.match.kind === 'token' && wordCount(check.excerpt) > EXCERPT_MAX_WORDS) {
      malformed(`${where} quotes ${wordCount(check.excerpt)} words; an excerpt holds ${EXCERPT_MAX_WORDS} at most.`)
    }
    const holdsValue =
      fact.match.kind === 'token'
        ? tokenPattern(fact.value).test(check.excerpt)
        : fact.match.names.every((spellings) =>
            spellings.some((spelling) => check.excerpt.toLowerCase().includes(spelling.toLowerCase())),
          )
    if (!holdsValue) malformed(`${where} is checked, but its excerpt does not hold the value.`)
  }

  // A source nobody has read, by robot or by hand, is a line in the bank that
  // looks like evidence and is not.
  for (const entry of set.bank) {
    for (const source of entry.sources) {
      const key = sourceKey(entry.id, source.url)
      if (!seenCaptures.has(key) && !seenManual.has(key)) {
        malformed(
          `Bank fact "${entry.id}": ${source.url} was never read. Run \`npm run facts:capture\`, or enter it in facts.manual.ts.`,
        )
      }
    }
  }

  return issues
}

/**
 * The gate on sources.
 *
 * `fact-code-uncaptured` is the rule the locks rest on: a fact becomes a code
 * only when two publishers that do not depend on each other were actually
 * read and hold the value. It covers the bank's codes whose wing does not
 * exist yet, because those captures are made ahead of the wing (plan, P0):
 * a wing must not be designed around a year that turns out to have one
 * source.
 *
 * `fact-source-uncaptured` and `fact-source-drift` cover every fact, code or
 * not: what the game cites has to be a page that was read and holds the
 * value, under the title, publisher and date the reading recorded.
 */
export function validateFactCaptures(
  facts: readonly Fact[],
  set: FactCaptureSet,
): ValidationIssue[] {
  const issues = validateRecord(set)
  const error = (code: string, message: string) => issues.push({ severity: 'error', code, message })
  const bankById = new Map(set.bank.map((entry) => [entry.id, entry]))
  const factsById = new Map(facts.map((fact) => [fact.id, fact]))

  const requireTwoGroups = (entry: FactBankEntry) => {
    const groups = independentGroups(entry, set)
    if (groups.length >= 2) return
    error(
      'fact-code-uncaptured',
      `Fact "${entry.id}" is a lock code but only ${groups.length} independent publisher(s) were read and hold "${entry.value}"` +
        `${groups.length > 0 ? ` (${groups.join(', ')})` : ''}. Two are required: run \`npm run facts:capture\`, or check the page by hand in facts.manual.ts.`,
    )
  }

  for (const entry of set.bank) {
    // A code of today's content is judged below, with the fact itself.
    if (entry.usedAsCode && !factsById.has(entry.id)) requireTwoGroups(entry)
  }

  for (const fact of facts) {
    const entry = bankById.get(fact.id)
    if (!entry) {
      if (fact.usedAsCode) {
        error(
          'fact-code-uncaptured',
          `Fact "${fact.id}" is a lock code and is not in the fact bank: nothing it cites was ever read.`,
        )
      } else {
        error(
          'fact-source-uncaptured',
          `Fact "${fact.id}" is not in the fact bank (src/content/facts.bank.ts): nothing it cites was ever read.`,
        )
      }
      continue
    }

    if (entry.value !== fact.value) {
      error(
        'fact-capture-malformed',
        `Fact "${fact.id}" is "${fact.value}" in the content and "${entry.value}" in the bank.`,
      )
    }
    if (fact.usedAsCode) {
      if (!entry.usedAsCode) {
        error(
          'fact-code-uncaptured',
          `Fact "${fact.id}" is a lock code, but the bank does not hold it to a code's standard (usedAsCode).`,
        )
      }
      requireTwoGroups(entry)
    }

    const good = new Map(goodCaptures(entry, set).map((capture) => [capture.url, capture]))
    for (const source of fact.sources) {
      const capture = good.get(source.url)
      if (!capture) {
        error(
          'fact-source-uncaptured',
          `Fact "${fact.id}" cites ${source.url}, and no reading of that page holds "${fact.value}".`,
        )
        continue
      }
      const drift = [
        source.title !== capture.title && `title "${source.title}" (the page says "${capture.title}")`,
        source.publisher !== capture.publisher &&
          `publisher "${source.publisher}" (registered as "${capture.publisher}")`,
        source.accessedAt !== capture.accessedAt &&
          `accessedAt ${source.accessedAt} (read on ${capture.accessedAt})`,
      ].filter((problem): problem is string => typeof problem === 'string')
      if (drift.length > 0) {
        error(
          'fact-source-drift',
          `Fact "${fact.id}" cites ${source.url} with ${drift.join(', ')}.`,
        )
      }
      // "Verified" before the day its source was read is the claim the old
      // record made for all four facts.
      if (fact.verifiedAt < capture.accessedAt) {
        error(
          'fact-source-drift',
          `Fact "${fact.id}" says it was verified on ${fact.verifiedAt}, before ${source.url} was read (${capture.accessedAt}).`,
        )
      }
    }
  }

  return issues
}
