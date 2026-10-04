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
 * It also pins the two promises the preparation lot made about the tools: the
 * measurement scripts run from any clone (no checkout path inside them, an
 * `npm run audit:*` entry each, none of them in the gate), and the August plan
 * says, where it was superseded, that it was.
 *
 * Every check reports all it finds before the suite fails: a documentation
 * test that stops at the first dangling id makes fixing ten of them ten runs.
 */

import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
  assert.ok(!/audit:/.test(packageJson.scripts.check), '`npm run check` runs an audit:* entry')
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
    for (const [, cited] of text.matchAll(/`((?:docs\/plano-mestre|docs\/contact-sheets\/baseline|scripts\/audit)[\w./-]*)`/g)) {
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
