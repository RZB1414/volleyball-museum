/**
 * Headless proof that the master plan's pointers resolve.
 *
 *   npm run test:docs
 *
 * `docs/PLANO-ATE-O-FINAL.md` is written in ids. A defect is `ÁT-A1` or
 * `H-13`, a measurement is "the capture `a17`" or "`atrium-walk.mjs`", a
 * decision is `D23`, and every one of them is a pointer into another file: a
 * source report, a measurement script, a baseline frame, the decision record.
 * The plan is executed lot by lot by people and agents who were not there when
 * it was written, so a pointer that dangles is an instruction nobody can
 * follow — and nothing else in the gate would ever notice a markdown file
 * that names a script which was left behind in a scratch directory.
 *
 * It also pins the promises the preparation lot made about the tools: the
 * measurement scripts run from any clone (no checkout path inside them, an
 * `npm run audit:*` entry each, none of them judging in the gate) and they
 * still RUN on today's tree; and the August plan says, where it was
 * superseded, that it was.
 *
 * And it holds the one hand-moved number the dated debts hang on,
 * `CONTENT_LOT`, to what the plan says is done.
 *
 * Every check reports all it finds before the suite fails: a documentation
 * test that stops at the first dangling id makes fixing ten of them ten runs.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CONTENT_LOT } from '../src/content/knownDebt.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const inRepo = (...segments: string[]) => resolve(ROOT, ...segments)
// A Windows checkout may hand these files over with CRLF; every pattern below
// is written for LF.
const read = (path: string) => readFileSync(inRepo(path), 'utf8').replace(/\r\n/g, '\n')
const readIfThere = (path: string) => (existsSync(inRepo(path)) ? read(path) : null)

const PLAN_PATH = 'docs/PLANO-ATE-O-FINAL.md'
const SOURCES_DIR = 'docs/plano-mestre/fontes'
const DECISIONS_PATH = 'docs/plano-mestre/DECISOES.md'
const AUGUST_PLAN_PATH = 'docs/PLANO-COMPLETO.md'
const AUDIT_DIR = 'scripts/audit'
const BASELINE_MANIFEST = 'docs/contact-sheets/baseline-2026-10-03/manifest.json'
const P0_RECORD = 'docs/lotes/P0-linha-de-base.md'
const P0_MANIFEST = 'docs/contact-sheets/p0/manifest.json'

const plan = read(PLAN_PATH)
const sourceFiles = readdirSync(inRepo(SOURCES_DIR)).filter((name) => name.endsWith('.md'))
const sources = new Map(sourceFiles.map((name) => [name, read(`${SOURCES_DIR}/${name}`)]))

let passed = 0
let failed = 0
function test(name: string, run: () => void) {
  try {
    run()
    passed += 1
    console.log(`  pass  ${name}`)
  } catch (error) {
    failed += 1
    console.log(`  FAIL  ${name}`)
    const message = error instanceof Error ? error.message : String(error)
    for (const line of message.split('\n')) console.log(`        ${line}`)
  }
}

/** Fails with every problem at once, each on its own line. */
function expectNone(problems: readonly string[], what: string) {
  assert.equal(problems.length, 0, `${what}:\n${problems.map((problem) => `- ${problem}`).join('\n')}`)
}

const unique = <T,>(values: Iterable<T>) => [...new Set(values)]
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The one source report whose file name starts with this two-digit number. */
function sourceByNumber(number: string) {
  const matches = sourceFiles.filter((name) => name.startsWith(`${number}-`))
  return matches.length === 1 ? matches[0] : null
}

console.log('\nDocumentation')

// ---------------------------------------------------------------------------
// Source reports
// ---------------------------------------------------------------------------

test('every source report the plan numbers is in the repository', () => {
  // "Como ler" names them as two ranges: `01` a `07`, `10` a `12`.
  const ranges = [...plan.matchAll(/`(\d\d)` a `(\d\d)`/g)].slice(0, 2)
  assert.equal(ranges.length, 2, 'the plan no longer states the two ranges of source reports')
  const problems: string[] = []
  for (const [, from, to] of ranges) {
    for (let number = Number(from); number <= Number(to); number += 1) {
      const id = String(number).padStart(2, '0')
      if (!sourceByNumber(id)) problems.push(`source report ${id} is not exactly one file in ${SOURCES_DIR}`)
    }
  }
  expectNone(problems, 'source reports')
})

// ---------------------------------------------------------------------------
// Defect families
// ---------------------------------------------------------------------------

/**
 * How each family's id is written in the plan, and what its report calls the
 * same thing. The plan prefixes; the reports, written before the prefixes
 * existed, number their findings locally (`ÁT-A1` is the atrium audit's "A1").
 */
const DEFECT_FAMILIES: readonly {
  readonly name: string
  readonly report: string
  readonly cited: RegExp
  readonly anchor: (localId: string) => RegExp
}[] = [
  {
    name: 'ÁT',
    report: '02',
    cited: /ÁT-([A-Z]\d+)/g,
    // A heading (`#### A1 —`) or, for touch and constraints, a bullet (`- **K1`).
    anchor: (id) => new RegExp(`^(?:#### |- \\*\\*)${id}\\b`, 'm'),
  },
  {
    name: 'H',
    report: '03',
    cited: /(?<![\wÀ-ÿ-])H-(\d\d)(?!\d)/g,
    anchor: (id) => new RegExp(`^\\*\\*H-${id} ·`, 'm'),
  },
  {
    name: 'AS',
    report: '04',
    cited: /AS-([SAHL]\d+)/g,
    // Pipeline defects are paragraphs (`**S1 —`); the rest are table rows.
    anchor: (id) =>
      id.startsWith('S') ? new RegExp(`^\\*\\*${id} —`, 'm') : new RegExp(`^\\| ${id} \\|`, 'm'),
  },
  {
    name: 'CAP',
    report: '05',
    cited: /CAP-(\d+)/g,
    anchor: (id) => new RegExp(`^\\| ${id} \\| P[0-2] \\|`, 'm'),
  },
  {
    name: 'EN',
    report: '06',
    cited: /EN-(A\d+)/g,
    anchor: (id) => new RegExp(`^\\*\\*${id} ·`, 'm'),
  },
]

for (const family of DEFECT_FAMILIES) {
  test(`every ${family.name}- defect the plan cites is a finding of report ${family.report}`, () => {
    const file = sourceByNumber(family.report)
    assert.ok(file, `source report ${family.report} is missing`)
    const report = sources.get(file) ?? ''
    const cited = unique([...plan.matchAll(family.cited)].map((match) => match[1]))
    assert.ok(cited.length > 0, `the plan cites no ${family.name}- id: the pattern has gone stale`)
    const problems = cited
      .filter((id) => !family.anchor(id).test(report))
      .map((id) => `${family.name}-${id} has no finding in ${SOURCES_DIR}/${file}`)
    expectNone(problems, `${family.name}- ids`)
  })
}

// ---------------------------------------------------------------------------
// Measurement scripts
// ---------------------------------------------------------------------------

const auditScripts = readdirSync(inRepo(AUDIT_DIR))
  .filter((name) => name.endsWith('.mjs'))
  .sort()
const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
const auditEntries = Object.entries(packageJson.scripts).filter(([name]) => name.startsWith('audit:'))
/** The script an `audit:*` entry runs, or null when it runs something else. */
const auditTarget = (command: string) =>
  command.match(/(?:^|\s)scripts\/audit\/([\w-]+\.mjs)(?=\s|$)/)?.[1] ?? null

test('every measurement script the plan names is in scripts/audit', () => {
  const problems: string[] = []

  // Path citations anywhere in the plan, with or without the extension.
  for (const [, name] of plan.matchAll(/`scripts\/audit\/([\w.-]+)`/g)) {
    const found = existsSync(inRepo(AUDIT_DIR, name)) || existsSync(inRepo(AUDIT_DIR, `${name}.mjs`))
    if (!found) problems.push(`\`scripts/audit/${name}\` does not exist`)
  }

  // The preparation lot lists the scripts by bare name.
  const preparation = plan.slice(plan.indexOf('### P0 —'), plan.indexOf('### L1 —'))
  const listed = unique([...preparation.matchAll(/`([\w-]+\.mjs)`/g)].map((match) => match[1]))
  assert.ok(listed.length >= 10, 'the preparation lot no longer lists the measurement scripts')
  for (const name of listed) {
    if (!auditScripts.includes(name)) problems.push(`\`${name}\` (P0, item 1) is not in ${AUDIT_DIR}`)
  }

  // The scripts were written in a scratch `tools/` directory; that is not a
  // place in this repository, so a citation of it points nowhere.
  for (const [citation] of plan.matchAll(/`tools\/[\w./-]+`/g)) {
    problems.push(`${citation} names the scratch directory the scripts were promoted from`)
  }
  expectNone(problems, 'measurement scripts')
})

test('every measurement script has an npm entry, and the plan\'s entries exist', () => {
  const problems: string[] = []
  const targets = auditEntries.map(([name, command]) => ({ name, target: auditTarget(command) }))

  for (const { name, target } of targets) {
    if (!target) problems.push(`npm run ${name} does not run a script of ${AUDIT_DIR}`)
    else if (!auditScripts.includes(target)) problems.push(`npm run ${name} runs missing ${target}`)
  }
  for (const script of auditScripts) {
    const entries = targets.filter((entry) => entry.target === script)
    if (entries.length !== 1) {
      problems.push(`${AUDIT_DIR}/${script} has ${entries.length} audit:* entries (wants exactly one)`)
    }
  }
  for (const [, entry] of plan.matchAll(/`(audit:[a-z0-9-]+)`/g)) {
    if (!(entry in packageJson.scripts)) problems.push(`the plan names \`npm run ${entry}\`, which does not exist`)
  }
  expectNone(problems, 'audit entries')
})

test('the measurement scripts stay out of the gate', () => {
  // They measure; they do not judge. A script that prints a table has no
  // pass or fail, and one that needs `dist/` would make the gate order-dependent.
  // The gate never reads what they print; it only checks, below, that they run.
  assert.ok(!/audit:/.test(packageJson.scripts.check), '`npm run check` runs an audit:* entry')
})

test('every measurement script still runs on this tree', () => {
  // "Tools that travel" was promised of scripts nothing ever ran again. The
  // next lot renamed two families of the breaker and gave the wall case a
  // `layout`, and two of the sixteen stopped on a TypeError in their first
  // section, with the gate green. Each entry is run as `npm run` would run
  // it, and has to end well and say something. None of them needs a build:
  // the one that reads `dist/` says so when it is missing and goes on.
  const problems: string[] = []
  for (const [name, command] of auditEntries) {
    const [runner, ...args] = command.split(/\s+/)
    if (runner !== 'node') {
      problems.push(`npm run ${name} is not a node script: "${command}"`)
      continue
    }
    const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 120_000 })
    if (result.status !== 0) {
      const last = (result.stderr || result.error?.message || '').trim().split('\n').filter((line) => /Error/.test(line))[0]
      problems.push(`npm run ${name} exits ${result.status ?? result.signal}${last ? `: ${last.trim()}` : ''}`)
    } else if (result.stdout.trim().length === 0) {
      problems.push(`npm run ${name} prints nothing`)
    }
  }
  assert.ok(auditEntries.length >= 16, 'the audit entries are still listed in package.json')
  expectNone(problems, 'measurement scripts that no longer run')
})

test('no measurement script carries the path of one checkout', () => {
  const problems: string[] = []
  const files = [
    ...auditScripts.map((name) => `${AUDIT_DIR}/${name}`),
    ...(existsSync(inRepo(AUDIT_DIR, 'lib'))
      ? readdirSync(inRepo(AUDIT_DIR, 'lib')).map((name) => `${AUDIT_DIR}/lib/${name}`)
      : []),
  ]
  for (const file of files) {
    read(file)
      .split('\n')
      .forEach((line, index) => {
        // A drive letter (but not the scheme of a URL), or a home directory.
        if (/(?<![A-Za-z])[A-Za-z]:[\\/](?![\\/])|\/(?:Users|home)\/|OneDrive/.test(line)) {
          problems.push(`${file}:${index + 1} holds an absolute path`)
        }
      })
  }
  expectNone(problems, 'absolute paths')
})

test('every measurement script opens by saying what it measures and how to run it', () => {
  const problems: string[] = []
  for (const script of auditScripts) {
    const text = read(`${AUDIT_DIR}/${script}`)
    const header = text.startsWith('/**') ? text.slice(0, text.indexOf('*/')) : ''
    const entry = auditEntries.find(([, command]) => auditTarget(command) === script)?.[0]
    if (!header) problems.push(`${script} does not start with a header comment`)
    else if (!entry || !header.includes(`npm run ${entry}`)) {
      problems.push(`${script}: the header does not give its own \`npm run audit:*\` line`)
    }
  }
  expectNone(problems, 'headers')
})

// ---------------------------------------------------------------------------
// Baseline captures
// ---------------------------------------------------------------------------

test('every baseline capture cited by name is a frame of the baseline set', () => {
  const manifestText = readIfThere(BASELINE_MANIFEST)
  assert.ok(manifestText, `${BASELINE_MANIFEST} is missing: run \`npm run captures:manifest\``)
  const manifest = JSON.parse(manifestText) as { captures: { id: string; file: string }[] }
  const byId = new Map(manifest.captures.map((capture) => [capture.id, capture.file]))

  const problems: string[] = []
  const check = (where: string, id: string, slug: string | null) => {
    const file = byId.get(id)
    if (!file) problems.push(`${where}: capture \`${id}\` is not in the baseline set`)
    // A longer name (`wf3-a16-lectern-top`) has to be that frame, not just that number.
    else if (slug && !file.startsWith(slug)) problems.push(`${where}: \`${slug}\` is not ${file}`)
  }
  const scan = (where: string, text: string, bareIds: boolean) => {
    for (const [slug, id] of text.matchAll(/wf3-([a-z]\d\d)(?:-[a-z0-9]+)*/g)) check(where, id, slug)
    for (const [, id] of text.matchAll(/`([adeh]\d\d)`/g)) check(where, id, null)
    if (bareIds) {
      for (const [, id] of text.matchAll(/(?<![\w-])([adeh]\d\d)(?![\w.])/g)) check(where, id, null)
    }
  }

  scan(PLAN_PATH, plan, false)
  // Only the capture report writes the ids bare (in its tables); anywhere else
  // a bare `e10` could as well be a number, so there they must be in backticks.
  for (const [name, text] of sources) scan(`${SOURCES_DIR}/${name}`, text, name.startsWith('05-'))
  expectNone(unique(problems), 'capture citations')
})

// ---------------------------------------------------------------------------
// The preparation lot's baseline record
// ---------------------------------------------------------------------------

/**
 * `docs/lotes/P0-linha-de-base.md` is what the plan's last preparation item
 * leaves behind: the verdict on the browser checks L1 depends on, and the
 * counters every later lot is compared with. It is a record of one day, so
 * nothing here compares its numbers with the build of today; what is pinned
 * is that the record is whole: every check has a verdict, every reference
 * point has its camera and its counters, and every frame it argues from is a
 * frame of its own capture set.
 */
type CaptureRow = { id: string; file: string; room: string }

const p0Record = readIfThere(P0_RECORD)
const p0Captures = (() => {
  const text = readIfThere(P0_MANIFEST)
  return text ? (JSON.parse(text) as { captures: CaptureRow[] }).captures : null
})()
/** The cells of a markdown table row, without the outer pipes. */
const tableCells = (line: string) =>
  line
    .replace(/^\||\|\s*$/g, '')
    .split('|')
    .map((cell) => cell.trim())

test('the baseline record gives a verdict on every Anexo E item that L1 depends on', () => {
  assert.ok(p0Record, `${P0_RECORD} is missing`)

  // The list is read from the plan, so an item moved to L1 later is not
  // silently left without a verdict.
  const annex = plan.slice(plan.indexOf('## Anexo E'), plan.indexOf('## Anexo F'))
  const forL1 = annex
    .split('\n')
    .filter((line) => /^\| \d+ \|/.test(line))
    .map(tableCells)
    .filter((cells) => cells[cells.length - 1].split(',').some((lot) => lot.trim() === 'L1'))
    .map((cells) => cells[0])
  assert.deepEqual(forL1, ['2', '3', '4', '8'], 'the Anexo E items marked for L1 changed: the record has to follow')

  const problems: string[] = []
  for (const item of forL1) {
    const start = p0Record.search(new RegExp(`^### Anexo E #${item} `, 'm'))
    if (start < 0) {
      problems.push(`Anexo E #${item} has no section`)
      continue
    }
    const next = p0Record.indexOf('\n### ', start + 1)
    const section = p0Record.slice(start, next < 0 ? undefined : next)
    if (!/^\*\*Veredito:\*\* \S/m.test(section)) problems.push(`Anexo E #${item} has no "**Veredito:**" line`)
    // A verdict with nothing to look at is an opinion.
    if (!/`p0-[a-z]\d\d-/.test(section)) problems.push(`Anexo E #${item} cites no capture of its own`)
  }
  expectNone(problems, 'Anexo E verdicts')
})

test('the baseline record measures ten reference points, each with its camera and counters', () => {
  assert.ok(p0Record, `${P0_RECORD} is missing`)
  const rows = p0Record
    .split('\n')
    .filter((line) => /^\| R\d\d \|/.test(line))
    .map(tableCells)
  assert.deepEqual(
    rows.map((cells) => cells[0]),
    Array.from({ length: 10 }, (_, index) => `R${String(index + 1).padStart(2, '0')}`),
    'the reference points are not R01 to R10, once each and in order',
  )

  const problems: string[] = []
  const rooms = new Set<string>()
  for (const [id, room, , camera, draws, triangles, programs, capture] of rows) {
    rooms.add(room)
    // The camera is what makes the point repeatable: x,y,z,yaw,pitch, as `?qaCamera=` takes it.
    if (!/^`-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?){4}`$/.test(camera ?? '')) problems.push(`${id}: no x,y,z,yaw,pitch camera`)
    for (const [name, cell] of [['draw calls', draws], ['triangles', triangles], ['programmes', programs]] as const) {
      if (!/^\d{1,3}(?:\.\d{3})*$/.test(cell ?? '')) problems.push(`${id}: ${name} is not a count ("${cell}")`)
    }
    if (!/^`p0-[a-z]\d\d-[a-z0-9-]+`$/.test(capture ?? '')) problems.push(`${id}: no capture`)
  }
  for (const room of ['office', 'atrium', 'holyoke']) {
    if (!rooms.has(room)) problems.push(`no reference point in "${room}"`)
  }
  // The other figures L1 turns into ratchets, each as a row of its own.
  for (const [what, pattern] of [
    ['the kit bundle in bytes', /^\| `kit\.[0-9a-f]{8}\.glb` \| \d/m],
    ['the bytes before the click', /^\| \*\*Antes do clique\*\* \| \d/m],
    ['the bytes after the click', /^\| \*\*Depois do clique\*\* \| \d/m],
    ['the resident texture memory', /^\| \*\*Textura residente\*\* \| \d/m],
  ] as const) {
    if (!pattern.test(p0Record)) problems.push(`the record has no row for ${what}`)
  }
  expectNone(problems, 'baseline table')
})

test('every frame of the P0 set is cited by the record, and every P0 frame cited is in the set', () => {
  assert.ok(p0Record, `${P0_RECORD} is missing`)
  assert.ok(p0Captures, `${P0_MANIFEST} is missing: run \`npm run captures:manifest\``)
  const byId = new Map(p0Captures.map((capture) => [capture.id, capture.file]))

  const problems: string[] = []
  // The set holds evidence, not leftovers: a frame nobody argues from goes.
  for (const capture of p0Captures) {
    const name = capture.file.replace(/\.jpg$/, '')
    if (!p0Record.includes(`\`${name}\``)) problems.push(`${capture.file} is in the set and the record never cites it`)
  }
  // Cited by its whole name everywhere: `a01` alone is a frame of the 3 October baseline.
  const documents = [P0_RECORD, PLAN_PATH, 'docs/HANDOFF.md']
  for (const path of documents) {
    for (const [slug, id] of read(path).matchAll(/(?<![\w-])p0-([a-z]\d\d)(?:-[a-z0-9]+)*/g)) {
      const file = byId.get(id)
      if (!file) problems.push(`${path}: \`${slug}\` is not a frame of the P0 set`)
      else if (file.replace(/\.jpg$/, '') !== slug) problems.push(`${path}: \`${slug}\` is not ${file}`)
    }
  }
  expectNone(unique(problems), 'P0 capture citations')
})

test('the preparation lot points to its baseline record', () => {
  const preparation = plan.slice(plan.indexOf('### P0 —'), plan.indexOf('### L1 —'))
  assert.ok(preparation.includes(P0_RECORD), `P0 in the plan does not point to ${P0_RECORD}`)
  assert.ok(read('docs/HANDOFF.md').includes(P0_RECORD), `docs/HANDOFF.md does not point to ${P0_RECORD}`)
})

// ---------------------------------------------------------------------------
// The lot the content stands at
// ---------------------------------------------------------------------------

/**
 * The highest lot whose section of the plan carries a dated «Feito em», or 0.
 *
 * A heading may cover a range (`### L18 a L22 —`); the range counts as done,
 * up to its last lot, when its section says so.
 */
function lastLotDone(planText: string): number {
  const headings = [...planText.matchAll(/^### L(\d+)(?: a L(\d+))? — /gm)]
  let done = 0
  headings.forEach((heading, index) => {
    const start = heading.index ?? 0
    const next = planText.indexOf('\n### ', start + 1)
    const end = index + 1 < headings.length ? (headings[index + 1].index ?? planText.length) : planText.length
    const section = planText.slice(start, next < 0 ? end : Math.min(end, next))
    if (/Feito em \d{4}-\d{2}-\d{2}/.test(section)) done = Math.max(done, Number(heading[2] ?? heading[1]))
  })
  return done
}

/** Why `CONTENT_LOT` and the plan disagree, or null when they do not. */
function contentLotProblem(planText: string, contentLot: number): string | null {
  const done = lastLotDone(planText)
  if (contentLot < done) {
    return (
      `the plan says L${done} is done and CONTENT_LOT is ${contentLot}: no debt dated for L${contentLot + 1} to L${done} ` +
      `has fallen due. Move CONTENT_LOT in src/content/knownDebt.ts and pay what it accuses.`
    )
  }
  // One ahead is the lot in progress: the constant moves in the commit that
  // pays the debt, before the lot is written up as done.
  if (contentLot > done + 1) {
    return `CONTENT_LOT is ${contentLot} and the last lot the plan says is done is L${done}: the plan was not written up.`
  }
  return null
}

test('the lot the dated debts are judged at is the lot the plan says is done', () => {
  // Every dated debt, and the age of the browser record, is judged against
  // `CONTENT_LOT`, a constant somebody moves by hand. A lot closed in the
  // plan with the constant left behind would keep every debt it was to pay
  // "not yet due", and the gate green, for as long as nobody noticed.
  assert.equal(contentLotProblem(plan, CONTENT_LOT), null)
  assert.ok(lastLotDone(plan) >= 1, 'the plan no longer marks L1 as done: the pattern has gone stale')

  // The rule itself, on plans made for the purpose.
  const made = (...done: readonly number[]) =>
    Array.from({ length: 4 }, (_, index) => index + 1)
      .map((lot) => `### L${lot} — Um lote\n\n- **Objetivo.** …\n${done.includes(lot) ? '- **Feito em 2026-11-02, publicado.**\n' : ''}`)
      .join('\n')
  assert.equal(lastLotDone(made()), 0)
  assert.equal(lastLotDone(made(1, 2)), 2)
  assert.equal(lastLotDone('### L18 a L22 — As cinco alas\n\n- **Feito em 2027-03-01.**\n'), 22)
  assert.equal(contentLotProblem(made(1), 1), null, 'the lot that is done')
  assert.equal(contentLotProblem(made(1), 2), null, 'the next lot, in progress')
  assert.match(contentLotProblem(made(1, 2), 1) ?? '', /L2 is done and CONTENT_LOT is 1/, 'a lot closed with the constant left behind')
  assert.match(contentLotProblem(made(1), 3) ?? '', /was not written up/, 'a constant two lots ahead of the plan')
})

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

type DecisionRow = { readonly id: string; readonly flagged: boolean; readonly cells: readonly string[] }

/** Table rows whose first cell is a decision id, with or without its (!). */
function decisionRows(markdown: string): DecisionRow[] {
  return markdown
    .split('\n')
    .map((line) => line.match(/^\| (D\d+)( \(!\))? \|(.*)\|\s*$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      id: match[1],
      flagged: Boolean(match[2]),
      // No decision row holds an escaped pipe, so a plain split is exact.
      cells: match[3].split('|').map((cell) => cell.trim()),
    }))
}

test('every decision of the plan is recorded, with the default the plan recommends', () => {
  const decisionsText = readIfThere(DECISIONS_PATH)
  assert.ok(decisionsText, `${DECISIONS_PATH} is missing`)
  const planned = decisionRows(plan.slice(plan.indexOf('### 0.3'), plan.indexOf('## 1. ')))
  const recorded = new Map(decisionRows(decisionsText).map((row) => [row.id, row]))
  // D1 to Dn with no gap: the tables group them by subject, not by number.
  const numbers = planned.map((row) => Number(row.id.slice(1))).sort((a, b) => a - b)
  assert.ok(numbers.length >= 36, 'the plan no longer lists D1 to D36')
  assert.deepEqual(numbers, numbers.map((_, index) => index + 1), 'the plan skips or repeats a decision number')

  const problems: string[] = []
  for (const row of planned) {
    const record = recorded.get(row.id)
    if (!record) {
      problems.push(`${row.id} is not recorded`)
      continue
    }
    if (record.flagged !== row.flagged) problems.push(`${row.id}: the (!) mark differs from the plan`)
    // Plan: decision, default, why, before. Record: decision, default adopted, …
    if (record.cells[0] !== row.cells[0]) problems.push(`${row.id}: the question differs from the plan`)
    if (record.cells[1] !== row.cells[1]) problems.push(`${row.id}: the adopted default differs from the plan`)
  }
  for (const id of recorded.keys()) {
    if (!planned.some((row) => row.id === id)) problems.push(`${id} is recorded but is not in the plan`)
  }
  for (const id of unique([...plan.matchAll(/(?<![\w-])D\d+(?![\w-])/g)].map((match) => match[0]))) {
    if (!recorded.has(id)) problems.push(`the plan cites ${id}, which is not recorded`)
  }
  expectNone(problems, 'decisions')

  assert.match(decisionsText, /decidido pelo dono em 2026-10-04: seguir os padrões/)
  // The owner's own task (a real device) is not a decision the default covers.
  assert.match(decisionsText, /[Aa]parelho real[^\n]*\n?[^\n]*pendente/, 'the real-device measurement is not recorded as pending')
})

// ---------------------------------------------------------------------------
// Pointers
// ---------------------------------------------------------------------------

test('the entry documents point to the plan, and the plan to its decision record', () => {
  for (const path of ['AGENTS.md', 'docs/HANDOFF.md']) {
    assert.ok(read(path).includes(PLAN_PATH), `${path} does not point to ${PLAN_PATH}`)
  }
  const decisionsSection = plan.slice(plan.indexOf('### 0.3'), plan.indexOf('## 1. '))
  assert.ok(decisionsSection.includes(DECISIONS_PATH), `§0.3 does not point to ${DECISIONS_PATH}`)
})

test('every repository path the entry documents give for the plan exists', () => {
  const problems: string[] = []
  const documents = [PLAN_PATH, 'AGENTS.md', 'docs/HANDOFF.md', DECISIONS_PATH, AUGUST_PLAN_PATH]
  for (const path of documents) {
    const text = readIfThere(path)
    if (text === null) continue
    for (const [, cited] of text.matchAll(/`((?:docs\/plano-mestre|docs\/lotes|docs\/contact-sheets\/(?:baseline|p0)|scripts\/audit)[\w./-]*)`/g)) {
      const target = cited.replace(/\/$/, '')
      const found = existsSync(inRepo(target)) || existsSync(inRepo(`${target}.mjs`))
      if (!found) problems.push(`${path} cites \`${cited}\`, which does not exist`)
    }
  }
  expectNone(unique(problems), 'paths')
})

// ---------------------------------------------------------------------------
// The August plan
// ---------------------------------------------------------------------------

test('the August plan says what the new plan supersedes, where it applies', () => {
  const august = read(AUGUST_PLAN_PATH)
  const lines = august.split('\n')
  const firstSection = lines.findIndex((line) => line.startsWith('## '))
  const banner = lines.slice(0, firstSection).join('\n')
  assert.ok(
    banner.includes(PLAN_PATH) && banner.includes('Anexo D'),
    `${AUGUST_PLAN_PATH} has no banner above its first section pointing to ${PLAN_PATH}, Anexo D`,
  )

  // Anexo D is the list of what was superseded; each row opens with the
  // August section it replaces (`§2.2: …`).
  const annex = plan.slice(plan.indexOf('## Anexo D'), plan.indexOf('## Anexo E'))
  const sections = unique([...annex.matchAll(/^\| §(\d+(?:\.\d+)?)[:\s]/gm)].map((match) => match[1]))
  assert.ok(sections.length >= 8, 'Anexo D no longer lists the superseded sections')

  const problems: string[] = []
  for (const section of sections) {
    const heading = section.includes('.')
      ? new RegExp(`^### ${escapeRegExp(section)} `)
      : new RegExp(`^## ${section}\\. `)
    const start = lines.findIndex((line) => heading.test(line))
    if (start < 0) {
      problems.push(`§${section} is not a section of ${AUGUST_PLAN_PATH}`)
      continue
    }
    // The note sits between the heading and the next heading of any level, so
    // a reader who lands on the section sees it before the superseded text.
    const next = lines.findIndex((line, index) => index > start && /^#{2,4} /.test(line))
    const body = lines.slice(start + 1, next < 0 ? undefined : next).join('\n')
    const noted = /^> \*\*Substituído/m.test(body) && body.includes(PLAN_PATH)
    if (!noted) problems.push(`§${section} carries no "Substituído" note pointing to ${PLAN_PATH}`)
  }
  expectNone(problems, 'superseded sections')
})

// ---------------------------------------------------------------------------

test('the documents this suite reads are where it expects them', () => {
  // A moved file would turn every check above into a vacuous pass or a crash.
  for (const path of [PLAN_PATH, SOURCES_DIR, AUDIT_DIR, AUGUST_PLAN_PATH]) {
    assert.ok(existsSync(inRepo(path)), `${path} is missing`)
  }
  assert.ok(statSync(inRepo(SOURCES_DIR)).isDirectory())
})

console.log(`\n${passed}/${passed + failed} documentation checks passed.\n`)
if (failed > 0) process.exitCode = 1
