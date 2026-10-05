/**
 * Headless proof of the rules that read what the museum prints.
 *
 *   npm run test:lints
 *
 * The year that opens the office drawer used to be on five cards of the
 * wing. L1 took it off three of them by hand, and one assertion in
 * `test:opening-flow` held it to the two that were left: an assertion about
 * that year and no other. The rules are general now (`src/content/
 * textLint.ts`), and this suite holds each of them to a case it must accuse
 * and a case it must leave alone:
 *
 *   - the tokeniser: a code is a whole run of digits, an hour is not a
 *     number, a number in words is not a numeral;
 *   - `numeral-exclusivity`, with the copy the wing carried before L1, and
 *     with the two languages saying different things;
 *   - `counted-pattern`, with two facts made for the test, since no counted
 *     lock exists before L18: fourteen founders, a court of eight by sixteen;
 *   - `text-ages`, wording by wording in both languages, and the honest
 *     copy a loose word would accuse;
 *   - `speech-night-state-unconditional`, by who says the line;
 *   - and the museum itself: clean but for what the debt table dates.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { readMediaTexts, svgTextNodes } from './lib/mediaTexts.ts'
import { suite } from './lib/storePage.ts'

import { en } from '../src/content/i18n/en.ts'
import { ptBR } from '../src/content/i18n/pt-BR.ts'
import { CONTENT_LOT, debtOf, settleKnownDebt } from '../src/content/knownDebt.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { DeviceData, Fact, MuseumContent, ProgressCondition } from '../src/content/schema.ts'
import {
  ageingWordings,
  collectionKeys,
  conditionAsks,
  COUNTED_PATTERN_WORDS,
  nightStateWord,
  numeralTokens,
  printedTexts,
  printsNumber,
  validateText,
  wordsOf,
  type Dictionaries,
} from '../src/content/textLint.ts'
import { validateContent, type ValidationIssue } from '../src/content/validate.ts'
import { readText } from './lib/readText.ts'

const { test, done } = suite('Text lint')

const PT: Readonly<Record<string, string>> = ptBR
const EN: Readonly<Record<string, string>> = en
const REAL: Dictionaries = { 'pt-BR': PT, en: EN }
const MEDIA_TEXTS = readMediaTexts(MUSEUM.media, fileURLToPath(new URL('../public', import.meta.url)))

/** The accusations of one code, as `id` strings, sorted. */
const accused = (issues: readonly ValidationIssue[], code: string) =>
  issues
    .filter((issue) => issue.code === code)
    .map((issue) => issue.id ?? '')
    .sort()

/** Both dictionaries with some keys rewritten: `[pt-BR, en]` per key. */
function reworded(changes: Readonly<Record<string, readonly [string, string]>>): Dictionaries {
  const pt = { ...PT }
  const english = { ...EN }
  for (const [key, [inPortuguese, inEnglish]] of Object.entries(changes)) {
    pt[key] = inPortuguese
    english[key] = inEnglish
  }
  return { 'pt-BR': pt, en: english }
}

const THE_CODE = MUSEUM.facts.find((fact) => fact.usedAsCode) as Fact
const PLAQUE = 'hotspot.portrait-morgan.date.label'
const DOCUMENT_TITLE = 'document.halstead.title'

/** The museum with its facts replaced. */
const withFacts = (facts: readonly Fact[]): MuseumContent => ({ ...MUSEUM, facts })
/** The museum's one code with some fields changed. */
const theCodeWith = (changes: Partial<Fact>): MuseumContent =>
  withFacts(MUSEUM.facts.map((fact) => (fact.id === THE_CODE.id ? { ...fact, ...changes } : fact)))

// ---------------------------------------------------------------------------
// The tokeniser
// ---------------------------------------------------------------------------

const numbersOf = (text: string) => numeralTokens(text).flatMap((token) => (token.kind === 'number' ? [token.text] : []))
const clocksOf = (text: string) => numeralTokens(text).flatMap((token) => (token.kind === 'clock' ? [token.text] : []))

await test('a token is a whole run of digits: a range holds two years and no 15', () => {
  assert.deepEqual(numbersOf('Ala 1 · 1895–1915'), ['1', '1895', '1915'])
  assert.equal(printsNumber('1895–1915', '15'), false)
  assert.equal(printsNumber('1895-1915', '1915'), true)
  assert.deepEqual(numbersOf('edição de 1916–17'), ['1916', '17'])
  // A longer number that happens to start with the code is another number.
  assert.deepEqual(numbersOf('lote 18960'), ['18960'])
  assert.equal(printsNumber('lote 18960', '1896'), false)
  assert.equal(printsNumber('a 01896 de distância', '1896'), false)
  // Stuck to letters, it is still that run of digits.
  assert.deepEqual(numbersOf('Mikasa MVL200, 1998.'), ['200', '1998'])
  assert.deepEqual(numbersOf('c. 1900–1925; 25 a 27 polegadas'), ['1900', '1925', '25', '27'])
})

await test('an hour is one token of its own kind, and never a number', () => {
  for (const hour of ['16h47', '8h55', '9h', '16:47', '9 a.m.', '4:47 pm']) {
    assert.deepEqual(clocksOf(`O relógio parou: ${hour}.`), [hour], hour)
    assert.deepEqual(numbersOf(`O relógio parou: ${hour}.`), [], `${hour} read as a number`)
  }
  assert.equal(printsNumber('parou às 16h47', '16'), false)
  assert.equal(printsNumber('parou às 16h47', '47'), false)
  assert.equal(printsNumber('Reabrimos amanhã às 9h.', '9'), false)
  // What only looks like one: a scale has three digits after its colon, and
  // a year followed by a word that starts with "h" is a year.
  assert.deepEqual(numbersOf('ESC. 1:200 · FOLHA 01/06'), ['1', '200', '01', '06'])
  assert.deepEqual(clocksOf('ESC. 1:200'), [])
  assert.deepEqual(numbersOf('em 1896 houve'), ['1896'])
  assert.deepEqual(numbersOf('9 amps'), ['9'])
})

await test('a number in words is not a numeral, and thousands apart are one number', () => {
  assert.deepEqual(numeralTokens('mil oitocentos e noventa e seis'), [])
  assert.deepEqual(numeralTokens('eighteen ninety-six'), [])
  assert.deepEqual(numbersOf('cerca de 200.000 praticantes'), ['200000'])
  assert.deepEqual(numbersOf('roughly 200,000 players'), ['200000'])
  // The drawer's year, written as a quantity, is the drawer's year.
  assert.equal(printsNumber('1,896 members', '1896'), true)
  assert.equal(printsNumber('1.896 sócios', '1896'), true)
  // A decimal is not a thousand.
  assert.deepEqual(numbersOf('A rede de 1,98 metro'), ['1', '98'])
  assert.deepEqual(numbersOf('em 1895, 1896 e 1897'), ['1895', '1896', '1897'])
  // Indexes point into the text as written, in order.
  const tokens = numeralTokens('às 9h, 25 de 1.896')
  assert.deepEqual(tokens.map((token) => [token.kind, token.text, token.index]), [
    ['clock', '9h', 3],
    ['number', '25', 7],
    ['number', '1896', 13],
  ])
})

// ---------------------------------------------------------------------------
// A code is printed where its fact says, and nowhere else
// ---------------------------------------------------------------------------

await test("the museum's one code is declared: two keys, by the tutorial exception", () => {
  assert.equal(THE_CODE.id, 'springfield-renaming')
  assert.deepEqual(THE_CODE.printedIn, [PLAQUE, DOCUMENT_TITLE])
  assert.equal(THE_CODE.exception, 'tutorial')
  assert.equal(MUSEUM.facts.filter((fact) => fact.usedAsCode).length, 1, 'a second code needs its own cases here')
  const issues = validateText(MUSEUM, REAL, { mediaTexts: MEDIA_TEXTS })
  for (const code of ['numeral-exclusivity', 'numeral-printed-in-missing', 'fact-code-without-printed-in', 'counted-pattern']) {
    assert.deepEqual(accused(issues, code), [], code)
  }
})

/**
 * The wing as it read before L1 (commit 82756c4): the year of the renaming
 * on the handbook's catalogue card and on the gymnasium's, as well as on the
 * plaque. Kept here because the lint is born green, on a museum L1 had
 * already cleaned by hand: this is the copy it exists to refuse.
 */
const BEFORE_L1: Readonly<Record<string, readonly [string, string]>> = {
  'exhibit.handbook-1897.catalogue': [
    'Official Handbook of the Athletic League of the Y.M.C.A. of North America, 1897. Fac-símile. As dez regras originais haviam saído um ano antes, na edição de julho de 1896 da revista Physical Education. O nome permaneceu grafado em duas palavras — volley ball — até 1952.',
    'Official Handbook of the Athletic League of the Y.M.C.A. of North America, 1897. Facsimile. The original ten rules had appeared a year earlier in the July 1896 issue of Physical Education magazine. The name stayed two words — volley ball — until 1952.',
  ],
  'exhibit.photo-gym.catalogue': [
    'Interior do antigo prédio da YMCA de Holyoke, 1897. O edifício serviu de 1886 a 1943. Em 7 de julho de 1896, Morgan levou dois times de cinco jogadores de Holyoke a Springfield para demonstrar o jogo — foi lá que ele ganhou o nome definitivo.',
    'Interior of the old Holyoke YMCA building, 1897. The building served from 1886 to 1943. On 7 July 1896 Morgan took two five-man teams from Holyoke to Springfield to demonstrate the game — that is where it got its lasting name.',
  ],
}

await test('the copy of before L1 is refused: the year on two more cards of the wing', () => {
  const issues = validateText(MUSEUM, reworded(BEFORE_L1))
  assert.deepEqual(accused(issues, 'numeral-exclusivity'), Object.keys(BEFORE_L1).sort())
  for (const issue of issues.filter((candidate) => candidate.code === 'numeral-exclusivity')) {
    assert.match(issue.message, /pt-BR and en/, 'both languages are named in the one accusation')
    assert.match(issue.message, /springfield-renaming/)
  }
  // And one card at a time, so that neither is carried by the other.
  for (const key of Object.keys(BEFORE_L1)) {
    assert.deepEqual(accused(validateText(MUSEUM, reworded({ [key]: BEFORE_L1[key] })), 'numeral-exclusivity'), [key])
  }
})

await test('the two languages are read each by itself', () => {
  // English alone repeats the year on a card.
  const leak = validateText(MUSEUM, reworded({ 'exhibit.portrait-morgan.label': [PT['exhibit.portrait-morgan.label'], 'Renamed in 1896.'] }))
  assert.deepEqual(accused(leak, 'numeral-exclusivity'), ['exhibit.portrait-morgan.label'])
  assert.match(leak.find((issue) => issue.code === 'numeral-exclusivity')?.message ?? '', /prints 1896 \(en\)/)

  // English alone drops it from the plaque: that player has no code to find.
  const dropped = validateText(MUSEUM, reworded({ [PLAQUE]: [PT[PLAQUE], 'Frame plaque: in Springfield, Mintonette was renamed Volley Ball'] }))
  assert.deepEqual(accused(dropped, 'numeral-printed-in-missing'), [PLAQUE])
  assert.match(dropped.find((issue) => issue.code === 'numeral-printed-in-missing')?.message ?? '', /in en it does not/)
  assert.deepEqual(accused(dropped, 'numeral-exclusivity'), [])

  // In words it is not printed: the keypad takes digits.
  const spelt = validateText(MUSEUM, reworded({ [DOCUMENT_TITLE]: ['Springfield, mil oitocentos e noventa e seis', 'Springfield, 1896'] }))
  assert.deepEqual(accused(spelt, 'numeral-printed-in-missing'), [DOCUMENT_TITLE])
  // And the year inside a longer number, or as an hour, is not the year.
  const lookalikes = validateText(
    MUSEUM,
    reworded({ 'exhibit.net-1897.label': ['Tombo 18960, conferido às 18h96.', 'Accession 18960, checked at 18:96.'] }),
  )
  assert.deepEqual(accused(lookalikes, 'numeral-exclusivity'), [])
})

await test('a code names where it is printed: one key, or two by the tutorial exception', () => {
  const undeclared = validateText(theCodeWith({ printedIn: undefined, exception: undefined }), REAL)
  assert.deepEqual(accused(undeclared, 'fact-code-without-printed-in'), [THE_CODE.id])
  // With nowhere allowed, everywhere it is printed is a leak.
  assert.deepEqual(accused(undeclared, 'numeral-exclusivity'), [DOCUMENT_TITLE, PLAQUE].sort())
  assert.deepEqual(accused(validateText(theCodeWith({ printedIn: [] }), REAL), 'fact-code-without-printed-in'), [THE_CODE.id])

  // Two keys and no exception: the fact itself is accused.
  assert.deepEqual(accused(validateText(theCodeWith({ exception: undefined }), REAL), 'numeral-exclusivity'), [THE_CODE.id])
  // One key: the other print becomes the leak.
  assert.deepEqual(
    accused(validateText(theCodeWith({ printedIn: [PLAQUE], exception: undefined }), REAL), 'numeral-exclusivity'),
    [DOCUMENT_TITLE],
  )
  // A key that is not a text of the museum.
  const nowhere = validateText(theCodeWith({ printedIn: [PLAQUE, DOCUMENT_TITLE, 'hotspot.portrait-morgan.back.label'] }), REAL)
  assert.deepEqual(accused(nowhere, 'numeral-printed-in-missing'), ['hotspot.portrait-morgan.back.label'])
  // A fact that is no lock's code is held to nothing: 1897 is on five cards.
  assert.ok(Object.values(PT).filter((text) => printsNumber(text, '1897')).length >= 4)
  assert.equal(MUSEUM.facts.find((fact) => fact.value === '1897')?.usedAsCode, false)
})

await test('a credit line and the lettering of an image are printed text too', () => {
  const texts = printedTexts(MUSEUM, REAL, { mediaTexts: MEDIA_TEXTS })
  const where = new Set(texts.map((text) => text.where))
  for (const asset of MUSEUM.media) assert.ok(where.has(`credit:${asset.id}`), `the credit of ${asset.id} is not read`)
  assert.ok(where.has('media:graphic-office-blueprint') && where.has(PLAQUE))
  // Each credit in each language, as the frame prints it.
  assert.ok(texts.some((text) => text.where === 'credit:photo-morgan-1897' && text.locale === 'pt-BR' && text.text.includes('Domínio público')))
  assert.ok(texts.some((text) => text.where === 'credit:photo-morgan-1897' && text.locale === 'en' && text.text.includes('Public domain')))

  // A photograph credited to the code's year.
  const dated: MuseumContent = {
    ...MUSEUM,
    media: MUSEUM.media.map((asset) =>
      asset.id === 'photo-morgan-1897' && asset.credit.license === 'public-domain'
        ? { ...asset, credit: { ...asset.credit, year: '1896' } }
        : asset,
    ),
  }
  assert.deepEqual(accused(validateText(dated, REAL), 'numeral-exclusivity'), ['credit:photo-morgan-1897'])

  // The Credits tab of the notebook prints one more line per picture than
  // the frame does: why it is in the public domain, what was changed in it,
  // or what generated it. The source L1 took off a wall by hand is the kind
  // of thing that line says («Published in Physical Education, July 1896»).
  for (const asset of MUSEUM.media) assert.ok(where.has(`credits:${asset.id}`), `the Credits tab's line for ${asset.id} is not read`)
  assert.ok(texts.some((text) => text.where === 'credits:photo-morgan-1897' && text.text.includes('Holyoke Transcript')))
  const withDetail = (id: string, patch: (credit: MuseumContent['media'][number]['credit']) => MuseumContent['media'][number]['credit']): MuseumContent => {
    assert.ok(MUSEUM.media.some((asset) => asset.id === id), id)
    return { ...MUSEUM, media: MUSEUM.media.map((asset) => (asset.id === id ? { ...asset, credit: patch(asset.credit) } : asset)) }
  }
  const inTheReason = withDetail('photo-morgan-1897', (credit) =>
    credit.license === 'public-domain' ? { ...credit, reason: 'Published in Physical Education, July 1896; US work published before 1931.' } : credit,
  )
  assert.deepEqual(accused(validateText(inTheReason, REAL), 'numeral-exclusivity'), ['credits:photo-morgan-1897'])
  const inTheChanges = withDetail('photo-holyoke-building-c1910', (credit) =>
    credit.license !== 'public-domain' && credit.license !== 'procedural' ? { ...credit, modifications: 'Cropped to the 1896 wing and re-encoded to WebP.' } : credit,
  )
  assert.deepEqual(accused(validateText(inTheChanges, REAL), 'numeral-exclusivity'), ['credits:photo-holyoke-building-c1910'])
  const inTheGenerator = withDetail('graphic-office-blueprint', (credit) =>
    credit.license === 'procedural' ? { ...credit, generator: 'svg/office-blueprint-1896' } : credit,
  )
  assert.deepEqual(accused(validateText(inTheGenerator, REAL), 'numeral-exclusivity'), ['credits:graphic-office-blueprint'])
  // The three kinds of credit were all patched: a case that changed nothing would have passed on nothing.
  for (const patched of [inTheReason, inTheChanges, inTheGenerator]) assert.notDeepEqual(patched.media, MUSEUM.media)
  // A picture with nothing to say there adds no empty line to read.
  const silent = withDetail('photo-holyoke-building-c1910', (credit) =>
    credit.license !== 'public-domain' && credit.license !== 'procedural' ? { ...credit, modifications: undefined } : credit,
  )
  assert.ok(!printedTexts(silent, REAL).some((text) => text.where === 'credits:photo-holyoke-building-c1910'))

  // The year lettered on the plan in the office.
  const lettered = { mediaTexts: { ...MEDIA_TEXTS, 'graphic-office-blueprint': [...MEDIA_TEXTS['graphic-office-blueprint'], 'FUNDADO EM 1896'] } }
  assert.deepEqual(accused(validateText(MUSEUM, REAL, lettered), 'numeral-exclusivity'), ['media:graphic-office-blueprint'])
  // Unless that is where the fact says it is to be read.
  const there = theCodeWith({ printedIn: [PLAQUE, DOCUMENT_TITLE, 'media:graphic-office-blueprint'] })
  assert.deepEqual(accused(validateText(there, REAL, lettered), 'numeral-exclusivity'), [])
  // In which case every text under that name has to carry it, and the plan's other labels do not.
  assert.deepEqual(accused(validateText(there, REAL, lettered), 'numeral-printed-in-missing'), ['media:graphic-office-blueprint'])
})

await test('the lettering is read out of the SVG files, element by element', () => {
  assert.deepEqual(
    svgTextNodes(
      '<svg><!-- <text>not this</text> --><text x="1" y="2">ALA 1</text><g><text font-size="16">FERRO &amp; AREIA</text></g>' +
        '<text><tspan x="0">MUSEU DO</tspan><tspan x="0" dy="20">VOLEIBOL &#49;896</tspan></text><text>  </text><title>ignored</title></svg>',
    ),
    ['ALA 1', 'FERRO & AREIA', 'MUSEU DO VOLEIBOL 1896'],
  )
  const svgs = MUSEUM.media.filter((asset) => asset.src.endsWith('.svg')).map((asset) => asset.id).sort()
  assert.deepEqual(Object.keys(MEDIA_TEXTS).sort(), svgs)
  assert.ok(svgs.length >= 2, 'the plan in the office and the orientation wall')
  assert.ok(MEDIA_TEXTS['graphic-office-blueprint'].includes('MUSEU DO VOLEIBOL'))
  // The gate reads them: without this line the plan's lettering is never linted.
  const gate = readText(new URL('./validate-content.ts', import.meta.url))
  assert.match(gate, /const mediaTexts = readMediaTexts\(MUSEUM\.media,/)
  assert.match(gate, /dictionaries: \{ 'pt-BR': ptBR, en \},\s*mediaTexts,/)
  // A file that is gone is not an image with nothing written on it.
  assert.throws(() => readMediaTexts([{ ...MUSEUM.media[0], src: '/textures/media/nowhere.svg' }], fileURLToPath(new URL('../public', import.meta.url))))
})

// ---------------------------------------------------------------------------
// A counted answer, beside its meaning
// ---------------------------------------------------------------------------

/** Two facts made for the test: no counted or measured lock exists before L18. */
const FOURTEEN: Fact = {
  id: 'founding-federations',
  claimKey: 'fact.first-rulebook.claim',
  value: '14',
  sources: [],
  confidence: 'high',
  verifiedAt: '2026-10-05',
  usedAsCode: true,
  printedIn: ['sign.atrium.body'],
  exception: 'counted',
  forbiddenPatterns: [
    {
      forms: ['14', 'catorze', 'quatorze', 'fourteen'],
      near: ['federaç', 'fundador', 'delegaç', 'naç', 'cadeira', 'federation', 'found', 'delegation', 'nation', 'chair'],
    },
  ],
}
const CHEST: Fact = {
  id: 'beach-court',
  claimKey: 'fact.first-rulebook.claim',
  value: '816',
  sources: [],
  confidence: 'high',
  verifiedAt: '2026-10-05',
  usedAsCode: true,
  printedIn: ['sign.atrium.body'],
  exception: 'geometry',
  forbiddenPatterns: [
    {
      forms: ['8 × 16', '8 x 16', 'oito por dezesseis', 'eight by sixteen', '8 m', '16 m'],
      near: ['quadra', 'areia', 'praia', 'court', 'sand', 'beach'],
    },
  ],
}
const COUNTED = withFacts([FOURTEEN, CHEST])
const CARD = 'exhibit.net-1897.label'
/** Whether a card saying this is accused of the pattern. */
const countedIn = (portuguese: string, english = 'Nothing.') =>
  accused(validateText(COUNTED, reworded({ [CARD]: [portuguese, english] })), 'counted-pattern')

await test('counted-pattern: the numeral beside its meaning is refused, in any language', () => {
  for (const text of [
    'A federação nasceu em Paris, com 14 nações.',
    'Catorze federações fundaram a entidade.',
    'As delegações eram quatorze.',
    'Havia cadeiras para os 14.',
  ]) {
    assert.deepEqual(countedIn(text), [CARD], text)
  }
  assert.deepEqual(countedIn('Nada.', 'Fourteen nations met in Paris.'), [CARD])
  assert.deepEqual(countedIn('Nada.', 'The founding federations numbered 14.'), [CARD])
  // The court, in its three spellings.
  for (const text of ['Uma quadra de areia de 8 × 16.', 'Quadra de praia: 8×16 metros.', 'Oito por dezesseis: a quadra da praia.', 'São 16 m de areia.']) {
    assert.deepEqual(countedIn(text), [CARD], text)
  }
  assert.deepEqual(countedIn('Nada.', 'A sand court, eight by sixteen.'), [CARD])
  const message = validateText(COUNTED, reworded({ [CARD]: ['Com 14 nações.', 'Nothing.'] })).find((issue) => issue.code === 'counted-pattern')?.message ?? ''
  assert.match(message, /says "14" within 6 words of "nações"/)
  assert.match(message, /founding-federations/)
})

await test('counted-pattern: the same numeral about something else is left alone', () => {
  for (const text of [
    // The title of the eight-panel ball, as the museum prints it.
    PT['exhibit.atrium-ball-eight-panel-2008.title'],
    'Oito gomos, superfície com covinhas',
    'Catorze gomos largos formam a esfera.',
    // An hour is not a count, even on the beach.
    'Na praia, o relógio parou às 16h47.',
    'A quadra fechou às 16h47, com 8h55 de jogo.',
    // A year that ends in the numeral is another token.
    'Em 1914, as nações ainda não tinham federação.',
    // The meaning in another sentence.
    'Eram catorze. As federações vieram depois.',
    // "8" and "16" apart are not the court.
    'A quadra recebeu 8 times e 16 árbitros.',
    // A stem is how a word begins: «combinação» holds «naç» and is no nation.
    'Catorze dígitos na combinação.',
  ]) {
    assert.deepEqual(countedIn(text), [], text)
  }
  assert.deepEqual(countedIn('Nada.', 'Fourteen panels. The nations came later.'), [])
  assert.equal(COUNTED_PATTERN_WORDS, 6)
  // Six words away is beside it; seven is not.
  assert.deepEqual(countedIn('Catorze anos e um mês depois, federações inteiras voltaram.'), [CARD])
  assert.deepEqual(countedIn('Catorze anos e um mês depois, as federações voltaram.'), [])
  assert.deepEqual(countedIn('As federações voltaram um ano e sete meses depois, catorze.'), [])
  // The key the fact names may say it.
  const allowed = validateText(COUNTED, reworded({ 'sign.atrium.body': ['Catorze federações.', 'Fourteen federations.'] }))
  assert.deepEqual(accused(allowed, 'counted-pattern'), [])
})

await test('counted-pattern: the hour and the sixteen, on the same beach', () => {
  // A fact wide enough to take a bare "16": only the clock class saves the hour.
  const wide = withFacts([{ ...CHEST, forbiddenPatterns: [{ forms: ['16', '8', 'oito'], near: ['praia', 'quadra'] }] }])
  const says = (text: string) => accused(validateText(wide, reworded({ [CARD]: [text, 'Nothing.'] })), 'counted-pattern')
  assert.deepEqual(says('Na praia, o relógio parou às 16h47.'), [])
  assert.deepEqual(says('Na praia, eram 16 de cada lado.'), [CARD])
  assert.deepEqual(says('Oito gomos, superfície com covinhas'), [])
  assert.deepEqual(says('Oito gomos, costurados na praia.'), [CARD])
  // The words of a form are not its own meaning: «dezesseis» begins with
  // «dez», and "eight by sixteen" alone says nothing about ten players.
  const tens = withFacts([{ ...CHEST, forbiddenPatterns: [{ forms: ['oito por dezesseis'], near: ['dez'] }] }])
  const tensIn = (text: string) => accused(validateText(tens, reworded({ [CARD]: [text, 'Nothing.'] })), 'counted-pattern')
  assert.deepEqual(tensIn('Oito por dezesseis.'), [])
  assert.deepEqual(tensIn('Oito por dezesseis, para dez de cada lado.'), [CARD])
  assert.deepEqual(wordsOf('Na praia, às 16h47, 8 × 16!'), ['na', 'praia', 'às', '\u0000clock', '8', '×', '16'])
  assert.deepEqual(wordsOf('1.896 Sócios'), ['1896', 'sócios'])
})

await test('a counted answer is not held to its digits, and has to say how it is forbidden', () => {
  // "14" is on half the labels of a museum; only beside its meaning is it the answer.
  const issues = validateText(COUNTED, reworded({ [CARD]: ['Sala 14, vitrine 816.', 'Room 14, case 816.'] }))
  assert.deepEqual(accused(issues, 'numeral-exclusivity'), [])
  assert.deepEqual(accused(issues, 'numeral-printed-in-missing'), [], 'the key a count is found in need not print it')
  const bare = validateText(withFacts([{ ...FOURTEEN, forbiddenPatterns: undefined }, { ...CHEST, forbiddenPatterns: [] }]), REAL)
  assert.deepEqual(accused(bare, 'fact-exception-without-patterns'), [CHEST.id, FOURTEEN.id].sort())
  assert.deepEqual(accused(validateText(COUNTED, REAL), 'fact-exception-without-patterns'), [])
  // A counted code still names where it is found.
  assert.deepEqual(accused(validateText(withFacts([{ ...FOURTEEN, printedIn: undefined }]), REAL), 'fact-code-without-printed-in'), [FOURTEEN.id])
  assert.deepEqual(
    accused(validateText(withFacts([{ ...FOURTEEN, printedIn: ['sign.atrium.missing'] }]), REAL), 'numeral-printed-in-missing'),
    ['sign.atrium.missing'],
  )
})

// ---------------------------------------------------------------------------
// Text that ages
// ---------------------------------------------------------------------------

/** Every wording of the rule, in a sentence a label could carry. */
const AGES: readonly (readonly [locale: string, text: string, says: string])[] = [
  ['pt-BR', 'O museu reabre amanhã, mas ele existe há cento e trinta anos.', 'há N anos'],
  ['pt-BR', 'A regra vale há 130 anos.', 'há N anos'],
  ['pt-BR', 'Foi adotada há quase dois anos.', 'há N anos'],
  ['pt-BR', 'Chegou há um ano.', 'há N anos'],
  ['pt-BR', 'A regra vale até hoje.', 'até hoje'],
  ['pt-BR', 'Hoje a bola pesa menos.', 'hoje'],
  ['pt-BR', 'O Brasil soma 12 títulos.', 'N títulos'],
  ['pt-BR', 'São três títulos olímpicos.', 'N títulos'],
  ['pt-BR', 'A maior partida da história.', 'maior'],
  ['pt-BR', 'As maiores plateias do torneio.', 'maior'],
  ['pt-BR', 'O melhor sacador do país.', 'melhor'],
  ['pt-BR', 'O único exemplar conhecido.', 'único'],
  ['pt-BR', 'A ÚNICA bola que restou.', 'único'],
  ['pt-BR', 'Um recorde de público.', 'recorde'],
  ['en', 'The rule was written 130 years ago.', 'N years ago'],
  ['en', 'It arrived a hundred and thirty years ago.', 'N years ago'],
  ['en', 'It has stood for a hundred and thirty years.', 'for N years'],
  ['en', 'In use for over 25 years.', 'for N years'],
  ['en', 'The rule holds to this day.', 'to this day'],
  ['en', 'Today the ball weighs less.', 'today'],
  ['en', 'Brazil holds 12 titles.', 'N titles'],
  ['en', 'Three titles in a row.', 'N titles'],
  ['en', 'The biggest crowd of the tournament.', 'biggest'],
  ['en', 'The largest hall in the city.', 'largest'],
  ['en', 'The greatest server of the era.', 'greatest'],
  ['en', 'The best-known photograph of him.', 'best'],
  ['en', 'The only surviving example.', 'the only'],
  ['en', 'A world record for attendance.', 'world record'],
  ['en', 'A record-breaking crowd.', 'record-breaking'],
  ['en', 'The all-time leading scorer.', 'all-time'],
]

/** Honest copy a loose word would accuse; most of it is on the walls today. */
const DOES_NOT_AGE: readonly (readonly [locale: string, text: string])[] = [
  // *Record* alone is the museum's word for a catalogue card.
  ['en', EN['exhibit.atrium-ball-tokyo-1964.label']],
  ['en', 'The collection record does not identify a maker for this reconstruction.'],
  ['en', 'For the record, the ball was recorded in the accession book.'],
  ['en', EN['document.invention-date.body']],
  ['en', 'The plaques in this wing therefore say only 1895.'],
  ['en', 'A ball of 25 to 27 inches, in use for a season.'],
  ['en', 'He was bestowed the title.'],
  ['en', 'Two years later, in 1897, the handbook appeared.'],
  ['pt-BR', PT['document.rule-changes.body']],
  ['pt-BR', PT['exhibit.portrait-morgan.label']],
  ['pt-BR', 'A maioria dos sócios era de meia-idade.'],
  ['pt-BR', 'Um melhoramento da bola de 1900.'],
  ['pt-BR', 'Vale recordar o manual de 1897.'],
  ['pt-BR', 'Há três toques por equipe.'],
  ['pt-BR', 'Dois anos depois, em 1897, saiu o manual.'],
  ['pt-BR', 'O título do documento.'],
]

await test('text-ages: every wording of the rule, in both languages', () => {
  for (const [locale, text, says] of AGES) {
    assert.ok(ageingWordings(text, locale).includes(says), `${locale}: "${text}" should say «${says}»`)
  }
  const named = (locale: string) => [...new Set(AGES.filter(([language]) => language === locale).map(([, , says]) => says))]
  assert.deepEqual(named('pt-BR'), ['há N anos', 'até hoje', 'hoje', 'N títulos', 'maior', 'melhor', 'único', 'recorde'])
  assert.deepEqual(named('en'), [
    'N years ago',
    'for N years',
    'to this day',
    'today',
    'N titles',
    'biggest',
    'largest',
    'greatest',
    'best',
    'the only',
    'world record',
    'record-breaking',
    'all-time',
  ])
  // «até hoje» is one wording, not two.
  assert.deepEqual(ageingWordings('A regra vale até hoje.', 'pt-BR'), ['até hoje'])
  // Each language by its own list; one with no list of its own by both.
  assert.deepEqual(ageingWordings('Today the ball weighs less.', 'pt-BR'), [])
  assert.deepEqual(ageingWordings('Hoje a bola pesa menos.', 'en'), [])
  assert.deepEqual(ageingWordings('Hoy: today, hoje.', 'es'), ['hoje', 'today'])
})

await test('text-ages: honest copy is left alone', () => {
  for (const [locale, text] of DOES_NOT_AGE) {
    assert.deepEqual(ageingWordings(text, locale), [], `${locale}: "${text}"`)
  }
})

await test('text-ages reads collection text, and leaves a voice its «hoje»', () => {
  const keys = collectionKeys(MUSEUM)
  for (const key of [
    'exhibit.net-1897.title',
    'exhibit.net-1897.label',
    'exhibit.net-1897.catalogue',
    'hotspot.net-1897.tape.label',
    'fact.six-a-side.claim',
    'sign.atrium.eyebrow',
    'sign.atrium.heading',
    'sign.atrium.body',
    'document.otavio-handover.title',
    'document.otavio-handover.body',
    'document.label-proof-office.body',
    // What the archive lists of a bound book and of a recording.
    'document.termos.title',
    'document.termos.summary',
    'document.otavio-tape.summary',
    'document.welcome.title',
    'document.welcome.summary',
  ]) {
    assert.ok(keys.has(key), `${key} is collection text`)
  }
  for (const key of [
    // A page of the notebook and a line of the radio are somebody's voice.
    'notebook.welcome.letter',
    'notebook.todo.heading',
    'radio.call.hello.5',
    'radio.hint.rest',
    // So are a page of the Book of Deeds, a term, what a recording says and
    // what the loudspeaker says: «esta tarde» is Otávio's to say on a tape.
    'document.termos.handover',
    'term.posse.body',
    'tape.otavio.1',
    'sequence.posse.2',
    'notebook.todo.proof',
    // Chrome and wayfinding are not what the collection says.
    'room.atrium.title',
    'container.office.title',
    'map.legend',
  ]) {
    assert.ok(!keys.has(key), `${key} is not collection text`)
  }
  // The porter says «hoje ninguém desce» today, and nobody accuses him.
  assert.ok(ageingWordings(PT['radio.call.hello.5'], 'pt-BR').includes('hoje'))
  assert.ok(!accused(validateText(MUSEUM, REAL), 'text-ages').includes('radio.call.hello.5'))

  // On a label, in either language, it is accused once, by key.
  const label = validateText(MUSEUM, reworded({ [CARD]: ['A maior rede que o museu tem até hoje.', 'The only net to this day.'] }))
  assert.deepEqual(accused(label, 'text-ages').filter((id) => id === CARD), [CARD])
  const message = label.find((issue) => issue.code === 'text-ages' && issue.id === CARD)?.message ?? ''
  for (const part of ['«até hoje» (pt-BR)', '«maior» (pt-BR)', '«to this day» (en)', '«the only» (en)']) {
    assert.ok(message.includes(part), `the accusation does not name ${part}: ${message}`)
  }
  // And in a document's title as in its body, a wall sign, a fact's claim.
  for (const key of ['document.halstead.title', 'document.halstead.body', 'sign.atrium.body', 'fact.six-a-side.claim', 'hotspot.net-1897.tape.label']) {
    const issues = validateText(MUSEUM, reworded({ [key]: [`${PT[key]} Hoje.`, EN[key]] }))
    assert.ok(accused(issues, 'text-ages').includes(key), `${key} may say «hoje»`)
  }
})

// ---------------------------------------------------------------------------
// The night, said by someone who has not looked
// ---------------------------------------------------------------------------

await test('the words of the night, in both languages, and their neighbours', () => {
  const said: readonly (readonly [string, string, string])[] = [
    ['pt-BR', 'Só a chuva batendo nas janelas.', 'chuva'],
    ['pt-BR', 'Tá chovendo aí?', 'chovendo'],
    ['pt-BR', 'A tempestade desarmou os quadros.', 'tempestade'],
    ['pt-BR', 'Que temporal, hein?', 'temporal'],
    ['pt-BR', 'Com esse apagão não dá.', 'apagão'],
    ['pt-BR', 'Não tem novela, porque acabou a luz.', 'acabou a luz'],
    ['pt-BR', 'Tô sem luz na portaria.', 'sem luz'],
    ['pt-BR', 'É medo do escuro, é?', 'escuro'],
    ['en', 'Only the rain against the windows.', 'rain'],
    ['en', 'The storm tripped every breaker.', 'storm'],
    ['en', 'In a blackout, nobody answers.', 'blackout'],
    ['en', "…because the power's out.", "power's out"],
    ['en', '…because the power’s out.', "power's out"],
    ['en', 'The power is out.', 'power is out'],
    ['en', 'Scared of the dark, is that it?', 'the dark'],
  ]
  for (const [locale, text, word] of said) {
    assert.equal(nightStateWord(text, locale)?.toLowerCase(), word, `${locale}: "${text}"`)
  }
  for (const [locale, text] of [
    ['en', 'He was training the trainees.'],
    ['en', 'A brainstorm about the darkness of the varnish.'],
    ['en', 'The leather darkens along the seams.'],
    ['en', 'Power restored.'],
    ['pt-BR', 'O couro escurece nas costuras.'],
    ['pt-BR', 'Um dia chuvoso e temporário.'],
    ['pt-BR', 'A luz tá feita.'],
    ['pt-BR', 'Apagar a lanterna'],
  ] as const) {
    assert.equal(nightStateWord(text, locale), null, `${locale}: "${text}"`)
  }
  // A language with no list of its own is read against both.
  assert.equal(nightStateWord('la chuva', 'es'), 'chuva')
  assert.equal(nightStateWord('the rain', 'es'), 'rain')
})

await test('a condition that asks nothing is no condition', () => {
  const asks: readonly ProgressCondition[] = [
    { powered: ['office'] },
    { unpowered: ['atrium'], documentsUnread: [] },
    { allRoomsPowered: true },
    { anyOf: [{ powered: ['office'] }, { catalogued: ['net-1897'] }] },
    // "One of nothing" never holds: it asks the impossible, which is asking.
    { anyOf: [] },
  ]
  const idle: readonly (ProgressCondition | undefined)[] = [
    undefined,
    {},
    { powered: [] },
    { allRoomsPowered: false },
    { powered: [], documentsRead: [], allCatalogued: false },
    // One of the ways through is always open.
    { anyOf: [{ powered: ['office'] }, {}] },
  ]
  for (const when of asks) assert.equal(conditionAsks(when), true, JSON.stringify(when))
  for (const when of idle) assert.equal(conditionAsks(when), false, JSON.stringify(when))
})

type Radio = Extract<DeviceData, { readonly kind: 'radio' }>

/** The museum with its radio changed. */
function withRadio(change: (radio: Radio) => Radio): MuseumContent {
  return {
    ...MUSEUM,
    rooms: MUSEUM.rooms.map((room) => ({
      ...room,
      devices: room.devices?.map((device) => (device.kind === 'radio' ? change(device) : device)),
    })),
  }
}

/** The radio with one answer of the porter's patience changed, wherever in his temper it sits. */
function withAnswer(id: string, change: (answer: Record<string, unknown>) => Record<string, unknown>): MuseumContent {
  const changed = <T extends { readonly id: string }>(answers: readonly T[]) =>
    answers.map((answer) => (answer.id === id ? (change(answer as unknown as Record<string, unknown>) as unknown as T) : answer))
  return withRadio((radio) => {
    const patience = radio.patience
    if (!patience) return radio
    return {
      ...radio,
      patience: {
        ...patience,
        tiers: patience.tiers.map((tier) => ({ ...tier, replies: changed(tier.replies), outbursts: tier.outbursts && changed(tier.outbursts) })),
        praise: patience.praise && changed(patience.praise),
        deadAir: changed(patience.deadAir),
      },
    }
  })
}

await test('a line about the night belongs to someone who checks the night first', () => {
  const NIGHT = 'speech-night-state-unconditional'
  const real = accused(validateText(MUSEUM, REAL), NIGHT)
  // Three answers of the porter's spoke of the dark, the blackout and the
  // rain whatever the night was doing, and were dated until L3. Since L3 an
  // answer has a `when`, each of the three looks first, and nothing is owed.
  assert.deepEqual(real, [])
  const LOOKS: Readonly<Record<string, readonly [string, string]>> = {
    'porter-t4-dark': ['radio.patience.t4.dark', 'escuro'],
    'porter-t5-soap': ['radio.patience.t5.soap.2', 'acabou a luz'],
    'porter-air-rain': ['radio.deadAir.rain', 'chuva'],
  }
  for (const [answerId, [key, word]] of Object.entries(LOOKS)) {
    assert.equal(nightStateWord(PT[key], 'pt-BR'), word, key)
    // Without its `when`, or with one that asks nothing, it is accused again.
    for (const when of [undefined, {}, { unpowered: [] }] as const) {
      const blind = withAnswer(answerId, ({ when: _, ...answer }) => (when === undefined ? answer : { ...answer, when }))
      assert.deepEqual(accused(validateText(blind, REAL), NIGHT), [key], `${answerId} with ${JSON.stringify(when)}`)
    }
  }
  // An answer written tomorrow that speaks of the rain and does not look.
  const tomorrow = withAnswer('porter-t1-ready', (answer) => ({ ...answer, id: 'porter-t1-rain', lineKeys: ['radio.deadAir.rain'] }))
  assert.match(
    validateText(tomorrow, REAL).find((issue) => issue.code === NIGHT)?.message ?? '',
    /"radio\.deadAir\.rain" says "chuva" \(pt-BR\), "rain" \(en\), and answer "porter-t1-rain" says it whatever the night is doing/,
  )

  // His introduction says "the storm" and asks whether the office has power.
  assert.ok(nightStateWord(PT['radio.call.hello.2'], 'pt-BR') && nightStateWord(EN['radio.call.hello.2'], 'en'))
  // With a `when` that asks nothing, it is accused; so with a list of nothing.
  for (const when of [{}, { powered: [] }] as const) {
    const idle = withRadio((radio) => ({
      ...radio,
      calls: radio.calls.map((call) => (call.id === 'porter-hello' ? { ...call, when } : call)),
    }))
    assert.ok(accused(validateText(idle, REAL), NIGHT).includes('radio.call.hello.2'), JSON.stringify(when))
  }

  // The Holyoke hint says «no escuro» at its third height, and asks whether the wing is unlit.
  assert.ok(nightStateWord(PT['radio.hint.holyoke.how'], 'pt-BR'))
  // Moved to the fallback, which asks nothing, the same line is accused: said
  // at a height, or said curtly.
  const fallbackSaying = (lines: { readonly heightKeys?: readonly string[]; readonly curtLineKeys?: readonly string[] }) =>
    accused(
      validateText(
        withRadio((radio) => ({
          ...radio,
          hints: radio.hints.map((hint, index) => (index === radio.hints.length - 1 ? { ...hint, ...lines } : hint)),
        })),
        REAL,
      ),
      NIGHT,
    )
  assert.ok(fallbackSaying({ heightKeys: ['radio.hint.rest', 'radio.hint.holyoke.how'] }).includes('radio.hint.holyoke.how'))
  assert.ok(fallbackSaying({ curtLineKeys: ['radio.hint.holyoke.how'] }).includes('radio.hint.holyoke.how'))
  assert.ok(!fallbackSaying({}).includes('radio.hint.holyoke.how'))
  // One accusation for a line, however many say it: said by the fallback,
  // which does not look, the joke about the dark is accused once.
  const twice = fallbackSaying({ heightKeys: ['radio.patience.t4.dark'], curtLineKeys: ['radio.patience.t4.dark'] })
  assert.equal(twice.filter((id) => id === 'radio.patience.t4.dark').length, 1)

  // In one language only, it is still the line that is accused, and the message says which.
  const english = validateText(MUSEUM, reworded({ 'radio.patience.t1.ready': [PT['radio.patience.t1.ready'], 'Front desk. Mind the dark.'] }))
  const accusation = english.find((issue) => issue.code === NIGHT && issue.id === 'radio.patience.t1.ready')
  assert.match(accusation?.message ?? '', /says "the dark" \(en\), and answer "porter-t1-ready"/)
  // A closing line, an outburst, praise and dead air are answers too.
  for (const key of ['radio.patience.t3.hotline.close', 'radio.patience.t4.static.1', 'radio.patience.praise.went', 'radio.deadAir.noAnswer']) {
    const issues = validateText(MUSEUM, reworded({ [key]: ['Que tempestade.', 'What a storm.'] }))
    assert.ok(accused(issues, NIGHT).includes(key), key)
  }
  // The same words on a wall are not speech.
  assert.ok(!accused(validateText(MUSEUM, reworded({ [CARD]: ['No escuro, a rede.', 'The net, in the dark.'] })), NIGHT).includes(CARD))
})

// ---------------------------------------------------------------------------
// The museum, and the gate
// ---------------------------------------------------------------------------

await test('the museum is clean but for what the debt table dates', () => {
  const issues = validateText(MUSEUM, REAL, { mediaTexts: MEDIA_TEXTS })
  // There were four, and L3 paid all four. The three lines about the night,
  // by the slice that gave an answer its `when`; the predecessor's note,
  // which counted the museum's age from today, by the sheet that took its
  // place in the drawer.
  assert.deepEqual(issues.map((issue) => `${issue.code} ${issue.id}`).sort(), [])
  // So the table keeps no line of these codes: one would be stale, and the gate would say so.
  const lines = debtOf('validate:content').filter((line) => line.code === 'text-ages' || line.code === 'speech-night-state-unconditional')
  assert.deepEqual(lines, [])
  assert.deepEqual(settleKnownDebt(issues, lines, CONTENT_LOT), [])
  // The rule still reads the paper that replaced the note: given the count
  // of years the note carried, the sheet is accused, by its key, for it.
  const SHEET = 'document.otavio-handover.body'
  const aged = validateText(MUSEUM, reworded({ [SHEET]: [`${PT[SHEET]} O museu existe há cento e trinta anos.`, EN[SHEET]] }), { mediaTexts: MEDIA_TEXTS })
  assert.deepEqual(aged.map((issue) => `${issue.code} ${issue.id}`), [`text-ages ${SHEET}`])
  assert.match(aged[0].message, /«há N anos» \(pt-BR\)/)
  // And a line for it would be a debt again, in good standing until its lot.
  const dated = settleKnownDebt(aged, [{ gate: 'validate:content', code: 'text-ages', id: SHEET, untilLot: CONTENT_LOT + 1, note: 'made for the test' }], CONTENT_LOT)
  assert.deepEqual(dated.map((issue) => issue.severity), ['debt'])
})

await test('the content gate runs the lint, and runs it where the plan says', () => {
  const NIGHT = 'speech-night-state-unconditional'
  const withWords = validateContent(MUSEUM, undefined, undefined, undefined, { dictionaries: REAL })
  assert.deepEqual(accused(withWords, 'text-ages'), [])
  assert.deepEqual(accused(withWords, NIGHT), [])
  // The gate runs the rule about the night too: an answer that stops looking is accused there.
  const blind = withAnswer('porter-t4-dark', ({ when: _, ...answer }) => answer)
  assert.deepEqual(accused(validateContent(blind, undefined, undefined, undefined, { dictionaries: REAL }), NIGHT), ['radio.patience.t4.dark'])
  // The lettering of the images reaches the lint through the gate's extras.
  const lettered = validateContent(MUSEUM, undefined, undefined, undefined, {
    dictionaries: REAL,
    mediaTexts: { 'graphic-office-blueprint': ['1896'] },
  })
  assert.deepEqual(accused(lettered, 'numeral-exclusivity'), ['media:graphic-office-blueprint'])
  // Without the dictionaries there is nothing to read.
  assert.deepEqual(accused(validateContent(MUSEUM), 'text-ages'), [])
  // And the debt table settles what it dates.
  const settled = validateContent(MUSEUM, undefined, undefined, undefined, {
    dictionaries: REAL,
    knownDebt: { lines: debtOf('validate:content').filter((line) => line.code === 'text-ages' || line.code === NIGHT), lot: CONTENT_LOT },
  })
  assert.deepEqual(
    settled.filter((issue) => issue.severity === 'error' && (issue.code === 'text-ages' || issue.code === NIGHT)),
    [],
  )

  const scripts = (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> }).scripts
  assert.equal(scripts['test:lints'], 'node --experimental-strip-types scripts/test-text-lint.ts')
  assert.ok(scripts.check.includes('npm run validate:content && npm run test:lints &&'), '`npm run check` runs the lint suite after the content gate')
})

done('text lint checks')
