/**
 * Reads every source the fact bank names and records what each page holds.
 *
 *   npm run facts:capture                      every fact in the bank
 *   npm run facts:capture -- --fact=<id>       only that fact (repeatable)
 *   npm run facts:capture -- --dry-run         report, write nothing
 *   npm run facts:capture -- --date=2026-10-04 stamp new readings with this day
 *
 * The point of this script is that A SOURCE IS READ, NEVER TYPED. Whether a
 * page answers, what it calls itself and whether it holds the year all come
 * from fetching it, so the record the gate judges facts against is by
 * construction what the page said. It is the `media:fetch` of facts.
 *
 * It needs the network, so it is NOT part of `npm run check`: the gate reads
 * the committed result (`npm run validate:content`, `npm run test:facts`) and
 * must give the same verdict on a train. Run it when the bank changes and
 * before a wing's content lot (plan §9, "`facts:capture` da ala em dia").
 *
 * Re-running is safe and quiet. A page whose text reads exactly as it did
 * keeps its record, date included, so a run that learnt nothing changes no
 * byte; a page that changed gets a new hash and today's date, and the diff
 * shows which source moved. Wikipedia is read through its API as one rendered
 * revision and recorded with that revision's permalink, because the article
 * page itself differs on every request.
 *
 * What the script cannot open it says so (`http-error`, `unreachable`) and
 * lists at the end. Those pages are for a person: enter them in
 * `src/content/facts.manual.ts`. The script never writes that file, and it
 * does not dress up as a browser to get past a publisher that turns robots
 * away: it says who it is, and a refusal is an answer.
 *
 * On a network that resets IPv6 connections (the same fault that breaks
 * Wrangler, plan §9.1), run it with NODE_OPTIONS=--dns-result-order=ipv4first.
 *
 * Output: src/content/facts.generated.ts
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { goodCaptures, independentGroups, publisherOf } from '../src/content/factCapture.ts'
import { FACT_BANK } from '../src/content/facts.bank.ts'
import { MANUAL_CAPTURES } from '../src/content/facts.manual.ts'
import {
  captureRecord,
  htmlPage,
  mediaWikiPage,
  mediaWikiRequest,
  serialiseCaptures,
} from './lib/factsCapture.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_MODULE = resolve(ROOT, 'src/content/facts.generated.ts')

// Wikimedia asks for a User-Agent that identifies the project; the other
// publishers get the same one, so that a server log shows who read the page.
const USER_AGENT =
  'VolleyballMuseum/0.1 (portfolio project; https://github.com/RZB1414) facts-capture'

const TIMEOUT_MS = 30_000
// The federation's site cuts readings that come in a burst; every publisher
// gets the same manners.
const PAUSE_BETWEEN_REQUESTS_MS = 1_500

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const onlyFacts = args.filter((arg) => arg.startsWith('--fact=')).map((arg) => arg.slice('--fact='.length))
const dateArg = args.find((arg) => arg.startsWith('--date='))?.slice('--date='.length)
const unknownArgs = args.filter(
  (arg) => arg !== '--dry-run' && !arg.startsWith('--fact=') && !arg.startsWith('--date='),
)
if (unknownArgs.length > 0) {
  console.error(`Unknown argument(s): ${unknownArgs.join(' ')}`)
  process.exit(2)
}
if (dateArg !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
  console.error(`--date wants YYYY-MM-DD, got "${dateArg}"`)
  process.exit(2)
}
for (const id of onlyFacts) {
  if (!FACT_BANK.some((entry) => entry.id === id)) {
    console.error(`--fact=${id}: no such fact in the bank`)
    process.exit(2)
  }
}
// UTC, so that two machines reading on the same evening stamp the same day.
const today = dateArg ?? new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

/** How long to wait before each attempt at one address. */
const ATTEMPT_DELAYS_MS = [0, 2_000, 6_000]

async function request(url, accept) {
  // A reset connection is weather (two of these hosts reset the first request
  // of a burst and answer the next); three in a row is an answer.
  for (const delay of ATTEMPT_DELAYS_MS) {
    if (delay > 0) await sleep(delay)
    try {
      return await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: accept },
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch (error) {
      // Half a minute of silence is already an answer: a host that holds a
      // robot's request open will hold the next one too.
      if (error?.name === 'TimeoutError') return null
      // Anything else is tried again; `null` once the attempts run out.
    }
  }
  return null
}

/** An HTML page: its title, its text, and where the request ended. */
async function readHtml(url) {
  const response = await request(url, 'text/html,application/xhtml+xml')
  if (!response) return null
  try {
    const html = await response.text()
    return htmlPage(response.status, response.headers.get('content-type'), response.url, html)
  } catch {
    // The headers came and the body did not: as good as no answer.
    return null
  }
}

/** A wiki article: its current revision as rendered, and that revision's permalink. */
async function readMediaWiki(url) {
  const response = await request(mediaWikiRequest(url), 'application/json')
  if (!response) return null
  try {
    const body = response.status === 200 ? await response.json() : null
    return mediaWikiPage(url, response.status, body)
  } catch {
    return null
  }
}

/** Each address is read once per run, however many facts cite it. */
const pages = new Map()
let requests = 0
async function readPage(url, publisher) {
  if (pages.has(url)) return pages.get(url)
  if (requests > 0) await sleep(PAUSE_BETWEEN_REQUESTS_MS)
  requests += 1
  const page = publisher.mediawiki ? await readMediaWiki(url) : await readHtml(url)
  pages.set(url, page)
  return page
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

/** The committed records, or none on a first run. */
async function previousRecords() {
  try {
    await readFile(OUT_MODULE)
  } catch {
    return []
  }
  try {
    const module = await import(pathToFileURL(OUT_MODULE).href)
    return module.CAPTURED_SOURCES ?? []
  } catch (error) {
    // A file somebody broke by hand must not stop the one tool that mends it;
    // every reading is then new, and stamped with today's date.
    console.warn(`src/content/facts.generated.ts does not load (${error.message}); starting from nothing.`)
    return []
  }
}

const previous = await previousRecords()
const previousOf = (factId, url) =>
  previous.find((record) => record.factId === factId && record.url === url)

const records = []
for (const entry of FACT_BANK) {
  const selected = onlyFacts.length === 0 || onlyFacts.includes(entry.id)
  console.log(`\n${entry.id} = ${entry.value}${selected ? '' : '  (kept as committed)'}`)

  for (const source of entry.sources) {
    const before = previousOf(entry.id, source.url)
    if (!selected) {
      // A partial run must not drop what it did not read.
      if (before) records.push(before)
      continue
    }
    const publisher = publisherOf(source.url)
    if (!publisher) {
      // The gate reports this too; a source without an owner is not fetched,
      // because nobody could say whose word it would be.
      console.log(`  skipped        ${source.url}  (host not in PUBLISHERS)`)
      continue
    }
    const page = await readPage(source.url, publisher)
    const record = captureRecord({ entry, source, publisher, page, date: today, previous: before })
    records.push(record)

    const changed = !before
      ? 'new'
      : JSON.stringify(before) === JSON.stringify(record)
        ? 'same'
        : 'CHANGED'
    // The publisher it counts with, which for a reprint is not its host's.
    const countsWith = source.copies ? `=${source.copies}` : publisher.group
    console.log(`  ${record.status.padEnd(16)}${changed.padEnd(9)}${countsWith.padEnd(11)}${source.url}`)
    if (record.status === 'ok') {
      const detail = record.excerpt ?? `${record.found.length} names: ${record.found.join(', ')}`
      console.log(`${' '.repeat(18)}${detail}`)
    }
  }
}

const output = serialiseCaptures(records)
let committed = ''
try {
  // A Windows checkout may hand the file over with CRLF; the script writes LF.
  committed = (await readFile(OUT_MODULE, 'utf8')).replace(/\r\n/g, '\n')
} catch {
  // First run: there is nothing to compare with.
}

const set = { bank: FACT_BANK, captured: records, manual: MANUAL_CAPTURES }
console.log('\nIndependent publishers that hold each fact:')
for (const entry of FACT_BANK) {
  const groups = independentGroups(entry, set)
  const verdict = !entry.usedAsCode ? '' : groups.length >= 2 ? '  code: ok' : '  code: NOT ENOUGH (two required)'
  console.log(`  ${entry.id.padEnd(28)}${String(groups.length).padEnd(3)}${groups.join(', ')}${verdict}`)
}

const unread = FACT_BANK.flatMap((entry) => {
  const good = new Set(goodCaptures(entry, set).map((capture) => capture.url))
  return entry.sources
    .filter((source) => !good.has(source.url))
    .map((source) => {
      const record = records.find((r) => r.factId === entry.id && r.url === source.url)
      const listed = MANUAL_CAPTURES.some((m) => m.factId === entry.id && m.url === source.url)
      return `  ${entry.id}: ${source.url}  (${record?.status ?? 'not read'}${listed ? '; awaiting a person in facts.manual.ts' : '; NOT in facts.manual.ts'})`
    })
})
if (unread.length > 0) {
  console.log('\nFor a person to read (src/content/facts.manual.ts):')
  for (const line of unread) console.log(line)
}

if (output === committed) {
  console.log('\nsrc/content/facts.generated.ts is unchanged.')
} else if (dryRun) {
  console.log('\n--dry-run: src/content/facts.generated.ts WOULD change; nothing written.')
  process.exitCode = 1
} else {
  await writeFile(OUT_MODULE, output)
  console.log(`\nWrote src/content/facts.generated.ts (${records.length} records).`)
}
