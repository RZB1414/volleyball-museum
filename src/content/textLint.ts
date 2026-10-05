/**
 * What the museum prints, read as text.
 *
 * `validateTranslations` proves a line exists. Nothing read the lines. The
 * year that opens the office drawer was on five cards of the wing before L1
 * took it off three of them, and the only thing holding it to the two that
 * are left was one assertion in `test:opening-flow`, written for that year
 * and for no other code. These are the rules, for every code the game will
 * ever have (plan, 6.4):
 *
 *   - `numeral-exclusivity`: a typed code is printed where its fact says
 *     (`printedIn`) and nowhere else, in every language, token by token. A
 *     token is a whole run of digits, so `1895–1915` holds no `15` and
 *     `18960` is not `1896`; an hour (`16h47`) is a token of its own kind
 *     and is never a code.
 *   - `counted-pattern`: a counted or measured answer (fourteen founders, a
 *     court of eight by sixteen) cannot be kept off the walls as a digit, so
 *     what is forbidden is the numeral beside its meaning.
 *   - `text-ages`: collection text says nothing that the calendar or the
 *     next championship will make false: time counted from today, running
 *     totals, superlatives.
 *   - `speech-night-state-unconditional`: a radio line that says it is
 *     raining or dark belongs to someone who checks the night first.
 *
 * Text is what a player can read without opening an image: the two
 * dictionaries, the words drawn in the authored SVGs (read by the gate
 * script and handed in), the credit line under every picture, and the line
 * the notebook's Credits tab prints beside it (why a picture is in the
 * public domain, what was changed in it, what generated it).
 *
 * Gate-only, like `validate.ts`: nothing the game ships imports it
 * (`test:facts` checks).
 */

import { formatCreditEntry, formatCreditLine, type CreditLocale } from './credit.ts'
import type { Fact, MuseumContent, ProgressCondition } from './schema'
import type { ValidationIssue } from './validate.ts'

export type Dictionaries = Readonly<Record<string, Readonly<Record<string, string>>>>

export type TextLintExtras = {
  /** The words drawn in each image: media id to the text nodes of its file. */
  readonly mediaTexts?: Readonly<Record<string, readonly string[]>>
}

// ---------------------------------------------------------------------------
// What is printed
// ---------------------------------------------------------------------------

/** One piece of text a player can read. */
export type PrintedText = {
  /**
   * A dictionary key; `credit:<media id>` for the line under a picture;
   * `credits:<media id>` for what the Credits tab adds to it; `media:<media
   * id>` for words drawn in an image.
   */
  readonly where: string
  /** The dictionary's locale; `image` for words drawn in a picture, the same in every language. */
  readonly locale: string
  readonly text: string
}

export const IMAGE_LOCALE = 'image'

const CREDIT_LOCALES: ReadonlySet<string> = new Set<CreditLocale>(['pt-BR', 'en'])

export function printedTexts(
  content: Pick<MuseumContent, 'media'>,
  dictionaries: Dictionaries,
  extras: TextLintExtras = {},
): PrintedText[] {
  const texts: PrintedText[] = []
  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    for (const [key, text] of Object.entries(dictionary)) texts.push({ where: key, locale, text })
    if (!CREDIT_LOCALES.has(locale)) continue
    for (const asset of content.media) {
      texts.push({ where: `credit:${asset.id}`, locale, text: formatCreditLine(asset.credit, locale as CreditLocale) })
      // The Credits tab prints the title, the author and the licence too, and
      // those are the line above: read twice they would be accused twice.
      // What only the tab prints is the detail, and it is where a source is
      // named with its date.
      const { detail } = formatCreditEntry(asset.credit, locale as CreditLocale)
      if (detail) texts.push({ where: `credits:${asset.id}`, locale, text: detail })
    }
  }
  for (const [mediaId, drawn] of Object.entries(extras.mediaTexts ?? {})) {
    for (const text of drawn) texts.push({ where: `media:${mediaId}`, locale: IMAGE_LOCALE, text })
  }
  return texts
}

// ---------------------------------------------------------------------------
// Numerals
// ---------------------------------------------------------------------------

export type NumeralToken = {
  /** `clock` is an hour of the day: one token, never compared with a code. */
  readonly kind: 'number' | 'clock'
  /** The digits of a number, with any thousands separator taken out; a clock as written. */
  readonly text: string
  readonly index: number
}

const NOT_AFTER_WORD = '(?<![\\p{L}\\p{N}])'
const NOT_BEFORE_WORD = '(?![\\p{L}\\p{N}])'

/**
 * `16h47`, `8h55`, `9h`; `16:47`; `9 a.m.`, `4:47 pm`. Longest form first:
 * a clock with a meridiem must not be left half read as a bare number.
 */
const CLOCK_SOURCE = '(?:\\d{1,2}(?::\\d{2})?\\s?(?:[ap]\\.m\\.|[ap]m)|\\d{1,2}h(?:\\d{2})?|\\d{1,2}:\\d{2})'
const CLOCK = new RegExp(`${NOT_AFTER_WORD}${CLOCK_SOURCE}${NOT_BEFORE_WORD}`, 'giu')
/** `200.000`, `1,896`: one number, written with its thousands apart. */
const GROUPED_SOURCE = '\\d{1,3}(?:[.,]\\d{3})+'
const GROUPED = new RegExp(`(?<![\\d.,])${GROUPED_SOURCE}(?![\\d]|[.,]\\d)`, 'gu')

/**
 * Every numeral of a text, as a player would read it off the wall.
 *
 * A token is a maximal run of digits. Two things are read first, because
 * read digit by digit they would say something else: an hour, which is one
 * token of its own class, and a number written with thousands separators,
 * which is one number (`1,896` prints the drawer's year as surely as `1896`).
 */
export function numeralTokens(text: string): NumeralToken[] {
  const tokens: NumeralToken[] = []
  let rest = text
  // Each pass blanks what it took, so the next reads only what is left and
  // every index still points into the original text.
  const take = (pattern: RegExp, kind: NumeralToken['kind'], digitsOnly: boolean) => {
    rest = rest.replace(pattern, (match: string, index: number) => {
      tokens.push({ kind, text: digitsOnly ? match.replace(/\D/g, '') : match, index })
      return ' '.repeat(match.length)
    })
  }
  take(CLOCK, 'clock', false)
  take(GROUPED, 'number', true)
  take(/\d+/g, 'number', true)
  return tokens.sort((a, b) => a.index - b.index)
}

/** Whether a text prints this run of digits as a number of its own. */
export function printsNumber(text: string, digits: string) {
  return numeralTokens(text).some((token) => token.kind === 'number' && token.text === digits)
}

/** "pt-BR and en": the languages one accusation is made in. */
const inLocales = (locales: readonly string[]) => [...new Set(locales)].join(' and ')

/** A code held to its digits: everything but a counted or measured answer. */
const heldToItsDigits = (fact: Fact) => fact.usedAsCode && fact.exception !== 'counted' && fact.exception !== 'geometry'

function validateNumerals(facts: readonly Fact[], texts: readonly PrintedText[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const byWhere = new Map<string, PrintedText[]>()
  for (const text of texts) byWhere.set(text.where, [...(byWhere.get(text.where) ?? []), text])

  for (const fact of facts) {
    if (!fact.usedAsCode) continue
    const allowed = fact.printedIn ?? []
    if (allowed.length === 0) {
      issues.push({
        severity: 'error',
        code: 'fact-code-without-printed-in',
        id: fact.id,
        message:
          `Fact "${fact.id}" is a lock's code and declares no \`printedIn\`: the gate cannot tell where ` +
          `"${fact.value}" is meant to be read from where it leaked.`,
      })
    }
    if ((fact.exception === 'counted' || fact.exception === 'geometry') && !fact.forbiddenPatterns?.length) {
      issues.push({
        severity: 'error',
        code: 'fact-exception-without-patterns',
        id: fact.id,
        message:
          `Fact "${fact.id}" is a ${fact.exception} answer and declares no \`forbiddenPatterns\`: nothing ` +
          `keeps the numeral away from its meaning.`,
      })
    }

    // Every authorised key is a text the museum prints.
    for (const where of allowed) {
      const printed = byWhere.get(where) ?? []
      if (printed.length === 0) {
        issues.push({
          severity: 'error',
          code: 'numeral-printed-in-missing',
          id: where,
          message: `Fact "${fact.id}" may be printed in "${where}", and the museum prints no such text.`,
        })
      }
      if (!heldToItsDigits(fact)) continue
      const silent = printed.filter((text) => !printsNumber(text.text, fact.value)).map((text) => text.locale)
      if (silent.length === 0) continue
      issues.push({
        severity: 'error',
        code: 'numeral-printed-in-missing',
        id: where,
        message:
          `"${where}" is where fact "${fact.id}" is to be read, and in ${inLocales(silent)} it does not ` +
          `print ${fact.value}: a player in that language has nowhere to find the code.`,
      })
    }

    if (!heldToItsDigits(fact)) continue
    if (allowed.length > 1 && fact.exception !== 'tutorial') {
      issues.push({
        severity: 'error',
        code: 'numeral-exclusivity',
        id: fact.id,
        message:
          `Fact "${fact.id}" is printed in ${allowed.length} keys (${allowed.join(', ')}). A code has one ` +
          `home; only the tutorial lock declares the exception.`,
      })
    }
    // One accusation per text: a debt line dates a key, not a key in a language.
    for (const [where, printed] of byWhere) {
      if (allowed.includes(where)) continue
      const leaking = printed.filter((text) => printsNumber(text.text, fact.value)).map((text) => text.locale)
      if (leaking.length === 0) continue
      issues.push({
        severity: 'error',
        code: 'numeral-exclusivity',
        id: where,
        message:
          `"${where}" prints ${fact.value} (${inLocales(leaking)}), the code of fact "${fact.id}", which is ` +
          `to be found only in ${allowed.length > 0 ? allowed.join(' and ') : 'the keys the fact names (it names none)'}.`,
      })
    }
  }
  return issues
}

// ---------------------------------------------------------------------------
// A counted answer, beside its meaning
// ---------------------------------------------------------------------------

/** How many words may stand between a numeral and the word that gives it its meaning. */
export const COUNTED_PATTERN_WORDS = 6

/** A text as sentences: the numeral and its meaning have to share one. */
function sentencesOf(text: string) {
  return text.split(/(?<=[.!?…])\s+|\n+/).filter((sentence) => sentence.trim() !== '')
}

const WORD = new RegExp(`${NOT_AFTER_WORD}${CLOCK_SOURCE}${NOT_BEFORE_WORD}|(?<![\\d.,])${GROUPED_SOURCE}(?![\\d]|[.,]\\d)|\\p{L}+|\\d+|×`, 'giu')
/** What an hour is as a word: nothing a form can be written as. */
const CLOCK_WORD = '\u0000clock'

/**
 * The words of a sentence, lower-cased: runs of letters, numbers, and the
 * multiplication sign of `8 × 16`. An hour is one word that matches nothing,
 * so the `16` of `16h47` is never the sixteen of a court.
 */
export function wordsOf(sentence: string): string[] {
  const clock = new RegExp(`^${CLOCK_SOURCE}$`, 'iu')
  return [...sentence.normalize('NFC').matchAll(WORD)].map(([word]) => {
    if (/^\d/.test(word) && /\D/.test(word)) return clock.test(word) ? CLOCK_WORD : word.replace(/\D/g, '')
    return word.toLocaleLowerCase()
  })
}

function validateCounted(facts: readonly Fact[], texts: readonly PrintedText[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const fact of facts) {
    const patterns = (fact.forbiddenPatterns ?? []).map((pattern) => ({
      forms: pattern.forms.map((form) => ({ written: form, words: wordsOf(form) })).filter((form) => form.words.length > 0),
      near: pattern.near.map((stem) => stem.normalize('NFC').toLocaleLowerCase()).filter((stem) => stem !== ''),
    }))
    if (patterns.length === 0) continue

    const accused = new Set<string>()
    for (const text of texts) {
      if (fact.printedIn?.includes(text.where) || accused.has(text.where)) continue
      const found = firstCounted(text.text, patterns)
      if (!found) continue
      // The first language that says it is enough to name the text.
      accused.add(text.where)
      issues.push({
        severity: 'error',
        code: 'counted-pattern',
        id: text.where,
        message:
          `"${text.where}" (${text.locale}) says "${found.form}" within ${COUNTED_PATTERN_WORDS} words of ` +
          `"${found.near}": that is the answer of fact "${fact.id}", which the player is meant to count.`,
      })
    }
  }
  return issues
}

function firstCounted(
  text: string,
  patterns: readonly { readonly forms: readonly { readonly written: string; readonly words: readonly string[] }[]; readonly near: readonly string[] }[],
) {
  for (const sentence of sentencesOf(text)) {
    const words = wordsOf(sentence)
    for (const pattern of patterns) {
      for (const form of pattern.forms) {
        const length = form.words.length
        for (let start = 0; start + length <= words.length; start += 1) {
          if (!form.words.every((word, offset) => words[start + offset] === word)) continue
          // The nearest edge of the form counts: "8 × 16 metres of sand" is
          // two words from "sand", not four.
          const near = words.find((word, index) => {
            if (index >= start && index < start + length) return false
            const apart = index < start ? start - index : index - (start + length - 1)
            return apart <= COUNTED_PATTERN_WORDS && pattern.near.some((stem) => word.startsWith(stem))
          })
          if (near) return { form: form.written, near }
        }
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Text that ages
// ---------------------------------------------------------------------------

type Wording = { readonly says: string; readonly pattern: RegExp }

const phrase = (source: string) => new RegExp(`${NOT_AFTER_WORD}${source}${NOT_BEFORE_WORD}`, 'iu')

const PT_NUMBER =
  '(?:\\d+|uma?|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|mil)'
/** «cento e trinta», «dois mil», «130». */
const PT_COUNT = `${PT_NUMBER}(?:\\s+(?:e\\s+)?${PT_NUMBER})*`
const PT_ABOUT = '(?:(?:pouco\\s+mais\\s+de|mais\\s+de|menos\\s+de|cerca\\s+de|quase|uns|umas)\\s+)?'

const EN_NUMBER =
  '(?:\\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)'
/** “a hundred and thirty”, “twenty-five”, “130”. */
const EN_COUNT = `${EN_NUMBER}(?:[\\s-]+(?:and\\s+)?${EN_NUMBER})*`
const EN_ABOUT = '(?:(?:more\\s+than|at\\s+least|over|nearly|almost|about|some)\\s+)?'

/**
 * What ages, by language (plan, 6.4): time counted from today, a running
 * total, a superlative. Phrases, not loose words wherever a loose word would
 * accuse honest copy: in English *record* alone is the museum's own word for
 * a catalogue card, so only “world record” and “record-breaking” are here.
 * Each word is read with its plain inflections («únicas», «maiores»).
 */
const AGEING: Readonly<Record<string, readonly Wording[]>> = {
  'pt-BR': [
    { says: 'há N anos', pattern: phrase(`há\\s+${PT_ABOUT}${PT_COUNT}\\s+anos?`) },
    { says: 'até hoje', pattern: phrase('até\\s+hoje') },
    { says: 'hoje', pattern: phrase('(?<!até\\s+)hoje') },
    { says: 'N títulos', pattern: phrase(`${PT_COUNT}\\s+títulos`) },
    { says: 'maior', pattern: phrase('maior(?:es)?') },
    { says: 'melhor', pattern: phrase('melhor(?:es)?') },
    { says: 'único', pattern: phrase('únic[oa]s?') },
    { says: 'recorde', pattern: phrase('recordes?') },
  ],
  en: [
    { says: 'N years ago', pattern: phrase(`${EN_COUNT}\\s+years?\\s+ago`) },
    { says: 'for N years', pattern: phrase(`for\\s+${EN_ABOUT}${EN_COUNT}\\s+years`) },
    { says: 'to this day', pattern: phrase('to\\s+this\\s+day') },
    { says: 'today', pattern: phrase('today') },
    { says: 'N titles', pattern: phrase(`${EN_COUNT}\\s+titles`) },
    { says: 'biggest', pattern: phrase('biggest') },
    { says: 'largest', pattern: phrase('largest') },
    { says: 'greatest', pattern: phrase('greatest') },
    { says: 'best', pattern: phrase('best') },
    { says: 'the only', pattern: phrase('the\\s+only') },
    { says: 'world record', pattern: phrase('world\\s+records?') },
    { says: 'record-breaking', pattern: phrase('record[\\s-]breaking') },
    { says: 'all-time', pattern: phrase('all[\\s-]time') },
  ],
}

/** The lists a locale is read against: its own, or every list for a language that has none. */
const listsFor = <T>(lists: Readonly<Record<string, T>>, locale: string): readonly T[] =>
  lists[locale] !== undefined ? [lists[locale]] : Object.values(lists)

/** The wordings of `text-ages` a text uses, as the rule names them. */
export function ageingWordings(text: string, locale: string): string[] {
  return listsFor(AGEING, locale)
    .flat()
    .filter((wording) => wording.pattern.test(text))
    .map((wording) => wording.says)
}

/**
 * Collection text, until `claims` and `surface` arrive in L8 and say it by
 * field: every key an exhibit, a fact or a wall sign cites, and the title
 * and body of every document. A notebook page and a radio line are
 * somebody's voice, and a voice may say «hoje».
 */
export function collectionKeys(content: Pick<MuseumContent, 'exhibits' | 'facts' | 'rooms' | 'documents'>): Set<string> {
  const keys = new Set<string>()
  // Structural, as `validateTranslations` is: a field named `…Key` is a key,
  // whichever field it is, so a new one is covered the day it is added.
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!node || typeof node !== 'object') return
    for (const [field, value] of Object.entries(node as Record<string, unknown>)) {
      if (field.endsWith('Key') && typeof value === 'string') keys.add(value)
      else if (field.endsWith('Keys') && Array.isArray(value)) {
        for (const item of value) if (typeof item === 'string') keys.add(item)
      } else walk(value)
    }
  }
  walk(content.exhibits)
  walk(content.facts)
  for (const room of content.rooms) walk(room.signage ?? [])
  for (const document of content.documents) {
    keys.add(document.titleKey)
    keys.add(document.bodyKey)
  }
  return keys
}

function validateAgeing(content: MuseumContent, dictionaries: Dictionaries): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const key of collectionKeys(content)) {
    const said: string[] = []
    for (const [locale, dictionary] of Object.entries(dictionaries)) {
      const text = dictionary[key]
      if (text === undefined) continue // missing-translation reports this
      for (const says of ageingWordings(text, locale)) said.push(`«${says}» (${locale})`)
    }
    if (said.length === 0) continue
    // One accusation per key, naming every wording in every language.
    issues.push({
      severity: 'error',
      code: 'text-ages',
      id: key,
      message:
        `Collection text "${key}" says ${said.join(', ')}: true the day it was written and false some day ` +
        `after. Give the date, or the count as of a date.`,
    })
  }
  return issues
}

// ---------------------------------------------------------------------------
// What is said of the night, by someone who has not looked
// ---------------------------------------------------------------------------

/** Rain, storm, blackout, dark: what stops being true as the night goes on. */
const NIGHT_STATE: Readonly<Record<string, RegExp>> = {
  'pt-BR': phrase('(?:chuvas?|chovendo|tempestades?|tempor(?:al|ais)|apag(?:ão|ões)|acabou\\s+a\\s+luz|sem\\s+luz|escuro)'),
  en: phrase("(?:rain|storms?|blackouts?|power(?:'s|\\s+is)\\s+out|the\\s+dark)"),
}

/** The word of the night's state a line says, if it says one. */
export function nightStateWord(text: string, locale: string): string | null {
  const straight = text.replace(/[’‘]/g, "'")
  for (const list of listsFor(NIGHT_STATE, locale)) {
    const said = list.exec(straight)?.[0]
    if (said !== undefined) return said
  }
  return null
}

/**
 * Whether a condition asks anything of the save. `{}` holds always; so does
 * a list of nothing, and so does "one of these" when one of them is empty.
 */
export function conditionAsks(when: ProgressCondition | undefined): boolean {
  if (!when) return false
  return Object.entries(when).some(([field, value]) => {
    if (field === 'anyOf') return (value as readonly ProgressCondition[]).every(conditionAsks)
    return Array.isArray(value) ? value.length > 0 : value === true
  })
}

type SpokenLine = { readonly key: string; readonly by: string; readonly conditional: boolean }

/** Every line a radio can say, with who says it and whether they look first. */
function spokenLines(content: Pick<MuseumContent, 'rooms'>): SpokenLine[] {
  const lines: SpokenLine[] = []
  for (const room of content.rooms) {
    for (const device of room.devices ?? []) {
      if (device.kind !== 'radio') continue
      for (const call of device.calls) {
        for (const key of call.lineKeys) lines.push({ key, by: `call "${call.id}"`, conditional: conditionAsks(call.when) })
      }
      device.hints.forEach((hint, index) => {
        for (const key of [...hint.heightKeys, ...(hint.curtLineKeys ?? [])]) {
          lines.push({ key, by: `hint ${index + 1} of "${device.id}"`, conditional: conditionAsks(hint.when) })
        }
      })
      // An answer of the porter's patience looks at the night when it has a
      // `when` that asks something; without one it is said in any night.
      const patience = device.patience
      if (!patience) continue
      const answers = [
        ...patience.tiers.flatMap((tier) => [...tier.replies, ...(tier.outbursts ?? [])]),
        ...(patience.praise ?? []),
        ...patience.deadAir,
      ]
      for (const answer of answers) {
        const keys = [...answer.lineKeys, ...('closingKeys' in answer ? (answer.closingKeys ?? []) : [])]
        for (const key of keys) lines.push({ key, by: `answer "${answer.id}"`, conditional: conditionAsks(answer.when) })
      }
    }
  }
  return lines
}

function validateNightState(content: MuseumContent, dictionaries: Dictionaries): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const reported = new Set<string>()
  for (const line of spokenLines(content)) {
    // One accusation for a line, whoever else says it too.
    if (line.conditional || reported.has(line.key)) continue
    const said: string[] = []
    for (const [locale, dictionary] of Object.entries(dictionaries)) {
      const text = dictionary[line.key]
      if (text === undefined) continue // missing-translation reports this
      const word = nightStateWord(text, locale)
      if (word !== null) said.push(`"${word}" (${locale})`)
    }
    if (said.length === 0) continue
    reported.add(line.key)
    issues.push({
      severity: 'error',
      code: 'speech-night-state-unconditional',
      id: line.key,
      message:
        `Radio line "${line.key}" says ${said.join(', ')}, and ${line.by} says it whatever the night is ` +
        `doing: it needs a \`when\` that asks.`,
    })
  }
  return issues
}

// ---------------------------------------------------------------------------

/** Every rule of this module, over one content set in every language it is printed in. */
export function validateText(
  content: MuseumContent,
  dictionaries: Dictionaries,
  extras: TextLintExtras = {},
): ValidationIssue[] {
  const texts = printedTexts(content, dictionaries, extras)
  return [
    ...validateNumerals(content.facts, texts),
    ...validateCounted(content.facts, texts),
    ...validateAgeing(content, dictionaries),
    ...validateNightState(content, dictionaries),
  ]
}
