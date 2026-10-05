/**
 * Headless proof that what is said to the player agrees with the night it is
 * said in.
 *
 *   npm run test:speech-coherence
 *
 * The content gate reads every line (`validateSpeech`, `textLint.ts`) and the
 * radio suite proves each rule of the porter one at a time. Neither hears a
 * night. A line can exist, fit, be translated and belong to somebody who asks
 * the save before speaking, and still be said at the wrong moment: the porter
 * asking about the dark with every light on, sending the player to a breaker
 * already thrown, introducing a room the player lit an hour ago.
 *
 * So the robot of `test:playthrough` plays its five hundred nights again, on
 * the real store, with somebody listening (`radioEar`): every call the
 * director would deliver and every answer the porter gives when called, each
 * written down with the save as it stood. What was heard is then held to the
 * rules below, which are about the night and not about any one line.
 *
 * And the rules are shown to bite: three museums changed for the purpose
 * (a call that no longer lapses, an answer that no longer looks first, a
 * milestone of the night that can be un-met) each fail.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { ORDINARY, playToEnd, radioEar, type EarOptions, type Heard, type RobotProfile } from './lib/playthrough.ts'
import { openGame, seeded, suite } from './lib/storePage.ts'

import { en } from '../src/content/i18n/en.ts'
import { ptBR } from '../src/content/i18n/pt-BR.ts'
import { MUSEUM } from '../src/content/museum.ts'
import type { DeviceData, MuseumContent, NightClock } from '../src/content/schema.ts'
import { nightStateWord } from '../src/content/textLint.ts'
import { radioDevices } from '../src/engine/deviceRules.ts'
import { nightPhraseKey, nightPoints } from '../src/engine/nightClock.ts'
import { isRoomPowered } from '../src/engine/power.ts'
import { progressConditionMet } from '../src/engine/progressCondition.ts'
import type { Progress } from '../src/state/progressFields.ts'

// The museum hands the store its rules as the canvas chunk arrives. Here, now:
// every store this suite opens is created with them in place.
await import('../src/engine/contentRegistry.ts')

const { test, done } = suite('Speech coherence: what is said, held to the night it is said in')

type Radio = Extract<DeviceData, { readonly kind: 'radio' }>
const DICTIONARIES = [
  ['pt-BR', ptBR as Readonly<Record<string, string>>],
  ['en', en as Readonly<Record<string, string>>],
] as const

// ---------------------------------------------------------------------------
// The words of the night, by what would have to be true for them to be said
// ---------------------------------------------------------------------------

const whole = (source: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, 'iu')

/**
 * The lint's own list (`textLint.ts`, `NIGHT_STATE`), split by what each word
 * asks of the night: a word of the dark is false once every room is lit, a
 * word of the rain once the pump has drained the basement.
 */
const NIGHT_WORDS: Readonly<Record<'dark' | 'rain', Readonly<Record<string, RegExp>>>> = {
  dark: {
    'pt-BR': whole('apag(?:ão|ões)|acabou\\s+a\\s+luz|sem\\s+luz|escuro'),
    en: whole("blackouts?|power(?:'s|\\s+is)\\s+out|the\\s+dark"),
  },
  rain: {
    'pt-BR': whole('chuvas?|chovendo|tempestades?|tempor(?:al|ais)'),
    en: whole('rain|storms?'),
  },
}
const wordOf = (kind: 'dark' | 'rain', text: string, locale: string) =>
  NIGHT_WORDS[kind][locale].exec(text.replace(/[’‘]/g, "'"))?.[0] ?? null

/** The flag the pump sets when the basement is dry (L12): from then on it has stopped raining. */
const RAIN_OVER = 'basement-drained'

// ---------------------------------------------------------------------------
// One night, heard
// ---------------------------------------------------------------------------

const radiosOf = (content: MuseumContent) => radioDevices(content).map((entry) => entry.device as Radio)

/** Every dictionary key a radio of this content can say. */
function spokenKeysOf(content: MuseumContent): string[] {
  return radiosOf(content).flatMap((radio) => {
    const patience = radio.patience
    const answers = patience
      ? [...patience.tiers.flatMap((tier) => [...tier.replies, ...(tier.outbursts ?? [])]), ...(patience.praise ?? []), ...patience.deadAir]
      : []
    return [
      ...radio.calls.flatMap((call) => call.lineKeys),
      ...radio.hints.flatMap((hint) => [...hint.heightKeys, ...(hint.curtLineKeys ?? [])]),
      ...answers.flatMap((answer) => [...answer.lineKeys, ...('closingKeys' in answer ? (answer.closingKeys ?? []) : [])]),
    ]
  })
}

/** What one thing heard gets wrong about the save it was said to. */
function heardProblems(content: MuseumContent, entry: Heard): string[] {
  const problems: string[] = []
  const save = entry.progress
  const met = (condition: Parameters<typeof progressConditionMet>[0]) => progressConditionMet(condition, save, content)
  const lit = content.rooms.every((room) => isRoomPowered(room, save.roomsPowered))
  const switches = new Map(content.rooms.flatMap((room) => (room.powerControl ? [[room.powerControl.id, room] as const] : [])))
  /** Nobody is sent to a switch already thrown. */
  const sentToDone = (mentions: readonly string[], who: string) => {
    for (const id of mentions) {
      const room = switches.get(id)
      if (room && isRoomPowered(room, save.roomsPowered)) problems.push(`${who} sends the player to "${id}" with ${room.id} already lit`)
    }
  }

  // The words: said of a night that is still like that.
  for (const key of entry.lineKeys) {
    for (const [locale, dictionary] of DICTIONARIES) {
      const text = dictionary[key] ?? ''
      const dark = wordOf('dark', text, locale)
      if (dark && lit) problems.push(`${key} (${locale}) says "${dark}" with every room lit`)
      const rain = wordOf('rain', text, locale)
      if (rain && save.flags.includes(RAIN_OVER)) problems.push(`${key} (${locale}) says "${rain}" after the rain has stopped`)
    }
  }

  for (const radio of radiosOf(content)) {
    if (entry.kind === 'call') {
      const call = radio.calls.find((candidate) => candidate.id === entry.callId)
      if (!call) continue
      if (!met(call.when)) problems.push(`call "${call.id}" was heard while its \`when\` did not hold`)
      if (call.lapsesWhen && met(call.lapsesWhen)) problems.push(`call "${call.id}" was heard after it had lapsed`)
      sentToDone(call.mentions, `call "${call.id}"`)
    }
    if (entry.kind === 'answer') {
      // The hint in an answer is known by its lines: whichever hint owns one
      // of them was the one given, and it has to be one that still applies.
      for (const [index, hint] of radio.hints.entries()) {
        const lines = [...hint.heightKeys, ...(hint.curtLineKeys ?? [])]
        if (!entry.lineKeys.some((key) => lines.includes(key))) continue
        if (!met(hint.when)) problems.push(`hint ${index + 1} of "${radio.id}" (${lines[0]}) was given while its \`when\` did not hold`)
        sentToDone(hint.mentions, `hint ${index + 1} of "${radio.id}"`)
      }
    }
  }
  return problems
}

type Night = {
  readonly heard: readonly Heard[]
  /** The save as the night ended. */
  readonly end: Progress
  /** The count of the night's milestones met, after every press. */
  readonly points: readonly number[]
}

const LAZY: Omit<EarOptions, 'random'> = { promptness: 0.5, callChance: 0.4 }
const PROMPT: Omit<EarOptions, 'random'> = { promptness: 1, callChance: 0.4 }

/** One night of the robot, with somebody listening. The same seed is the same night of `test:playthrough`. */
async function night(content: MuseumContent, seed: number, profile: RobotProfile, ear: Omit<EarOptions, 'random'>): Promise<Night> {
  // Another dice for the ear, from the same seed: who listens does not change the night.
  const listening = radioEar(content, { ...ear, random: seeded(seed + 100_003) })
  const points: number[] = []
  const clock = content.nightClock
  const played = await playToEnd(await openGame(), content, seeded(seed), profile, content, (page) => {
    listening.listen(page)
    if (clock) points.push(nightPoints(clock, page.progress(), content))
  })
  return { heard: listening.heard, end: played.page.progress(), points }
}

/** What a whole night gets wrong: each thing heard, and what only shows across the night. */
function nightProblems(content: MuseumContent, heard: Night): string[] {
  const problems = heard.heard.flatMap((entry) => heardProblems(content, entry))

  // Each call is heard once, however often the tab was closed.
  const calls = heard.heard.flatMap((entry) => (entry.kind === 'call' && entry.callId ? [entry.callId] : []))
  for (const id of new Set(calls)) {
    const times = calls.filter((candidate) => candidate === id).length
    if (times > 1) problems.push(`call "${id}" was heard ${times} times in one night`)
  }

  // The night's hour goes forward: a milestone met stays met.
  for (let index = 1; index < heard.points.length; index += 1) {
    if (heard.points[index] < heard.points[index - 1]) {
      problems.push(`the night went back from ${heard.points[index - 1]} milestone(s) to ${heard.points[index]}`)
      break
    }
  }
  const clock = content.nightClock
  if (clock) {
    const phrases = heard.points.map((count) => {
      const key = nightPhraseKey(clock, count)
      return key === null ? -1 : clock.phraseKeys.indexOf(key)
    })
    if (phrases.some((phrase, index) => index > 0 && phrase < phrases[index - 1])) problems.push('the hour the porter reads went back')
  }
  return problems
}

const NIGHTS = 500
const seeds = (count: number) => Array.from({ length: count }, (_, index) => index + 1)
const taken = (action: Parameters<NonNullable<RobotProfile['skips']>>[0]) => action.kind === 'take'
/** The radio taken off its charger before she leaves the office. */
const RADIO_FIRST: RobotProfile = { ...ORDINARY, prefers: taken }
/** The radio left on the desk all night. */
const RADIO_ON_DESK: RobotProfile = { ...ORDINARY, skips: taken }

/** The problems of many nights, each named by its seed; no more than a few of any one kind. */
async function problemsOf(
  content: MuseumContent,
  count: number,
  profile: RobotProfile,
  ear: Omit<EarOptions, 'random'>,
  also: (heard: Night, seed: number) => readonly string[] = () => [],
) {
  const problems = new Map<string, number>()
  let heardInAll = 0
  let answers = 0
  let lastTier = 0
  for (const seed of seeds(count)) {
    const heard = await night(content, seed, profile, ear)
    heardInAll += heard.heard.length
    answers += heard.heard.filter((entry) => entry.kind === 'answer').length
    lastTier += heard.heard.some((entry) => entry.lineKeys.some((key) => /^radio\.patience\.t[45]\./.test(key))) ? 1 : 0
    for (const problem of [...nightProblems(content, heard), ...also(heard, seed)]) {
      problems.set(problem, problems.get(problem) ?? seed)
    }
  }
  return {
    problems: [...problems].map(([problem, seed]) => `${problem} (first on seed ${seed})`),
    heard: heardInAll,
    answers,
    /** Nights in which the porter got as far as his impatient tiers. */
    impatient: lastTier,
  }
}

// ---------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------

await test('the suite knows every word of the night the lint knows, and which night each one needs', () => {
  const unclassified: string[] = []
  const examples: Record<string, number> = { dark: 0, rain: 0 }
  for (const key of new Set(spokenKeysOf(MUSEUM))) {
    for (const [locale, dictionary] of DICTIONARIES) {
      const text = dictionary[key]
      assert.ok(text !== undefined, `${key} (${locale}) is in the dictionary`)
      const dark = wordOf('dark', text, locale)
      const rain = wordOf('rain', text, locale)
      if (dark) examples.dark += 1
      if (rain) examples.rain += 1
      // Whatever the lint calls a word of the night, this suite holds to a night.
      if (nightStateWord(text, locale) !== null && !dark && !rain) unclassified.push(`${key} (${locale}): ${nightStateWord(text, locale)}`)
      if ((dark || rain) && nightStateWord(text, locale) === null) unclassified.push(`${key} (${locale}): a word the lint does not know`)
    }
  }
  assert.deepEqual(unclassified, [])
  assert.ok(examples.dark >= 4 && examples.rain >= 4, `the porter speaks of the dark ${examples.dark} times and of the rain ${examples.rain}`)
  assert.equal(wordOf('dark', 'É medo do escuro, é?', 'pt-BR'), 'escuro')
  assert.equal(wordOf('dark', 'O couro escurece nas costuras.', 'pt-BR'), null)
  assert.equal(wordOf('rain', '(Nothing. Only the rain.)', 'en'), 'rain')
  assert.equal(wordOf('rain', 'He was training the trainees.', 'en'), null)
  assert.equal(wordOf('dark', '…because the power’s out.', 'en'), "power's out")
})

await test('five hundred nights, heard: nothing said contradicts the save it was said to', async () => {
  const began = performance.now()
  const result = await problemsOf(MUSEUM, NIGHTS, ORDINARY, LAZY)
  const seconds = (performance.now() - began) / 1000
  console.log(
    `        ${NIGHTS} nights · ${result.heard} things heard, ${result.answers} of them the porter answering · ` +
      `${result.impatient} nights reached his impatient tiers · ${seconds.toFixed(1)} s`,
  )
  assert.deepEqual(result.problems.slice(0, 12), [], `${result.problems.length} kind(s) of problem`)
  // The ear is not deaf: the porter was called, often enough to lose his patience.
  assert.ok(result.answers > 3000, `only ${result.answers} answers in ${NIGHTS} nights`)
  assert.ok(result.impatient > 100, `only ${result.impatient} nights reached the tiers that tease about the dark`)
})

await test('with the radio taken first, every milestone reached had its call, once', async () => {
  const calls = radiosOf(MUSEUM).flatMap((radio) => radio.calls)
  const result = await problemsOf(MUSEUM, 120, RADIO_FIRST, PROMPT, (heard) => {
    const missed: string[] = []
    for (const call of calls) {
      // A call whose moment is still there at the end of the night was owed
      // all along; with the handset in hand from the lamp on, it was heard.
      const owed = progressConditionMet(call.when, heard.end, MUSEUM) && !(call.lapsesWhen && progressConditionMet(call.lapsesWhen, heard.end, MUSEUM))
      if (owed && !heard.end.radioCalls.includes(call.id)) missed.push(`call "${call.id}" was owed at the end of the night and never heard`)
    }
    // And the two that only the first minutes can hear.
    for (const id of ['porter-hello', 'porter-first-call']) {
      if (!heard.heard.some((entry) => entry.callId === id)) missed.push(`call "${id}" was not heard by a player who took the radio at once`)
    }
    return missed
  })
  assert.deepEqual(result.problems.slice(0, 12), [])
  // The milestones of this lot, by the call each one has.
  for (const id of ['porter-atrium-service', 'porter-holyoke-lit', 'porter-first-catalogued', 'porter-shortcut']) {
    assert.ok(calls.some((call) => call.id === id), `the content has no call "${id}"`)
  }
})

await test('with the radio left on the desk, nothing is heard outside the office', async () => {
  const office = radioDevices(MUSEUM).map((entry) => entry.room.id)
  assert.deepEqual(office, ['office'])
  let inTheOffice = 0
  const result = await problemsOf(MUSEUM, 120, RADIO_ON_DESK, LAZY, (heard) => {
    inTheOffice += heard.heard.length
    return [
      ...heard.heard.filter((entry) => entry.room !== 'office').map((entry) => `"${entry.lineKeys[0]}" was heard in ${entry.room} with the radio on the desk`),
      ...heard.heard.filter((entry) => entry.kind !== 'call').map((entry) => `the porter answered a call (${entry.lineKeys[0]}) placed with no handset`),
      ...(heard.end.devicesCarried.length > 0 ? ['the radio left the desk'] : []),
    ]
  })
  assert.deepEqual(result.problems.slice(0, 12), [])
  assert.ok(inTheOffice > 240, `only ${inTheOffice} calls heard at the desk in 120 nights`)
})

// --- museums changed for the purpose -----------------------------------------

const withRadio = (change: (radio: Radio) => Radio): MuseumContent => ({
  ...MUSEUM,
  rooms: MUSEUM.rooms.map((room) => ({
    ...room,
    devices: room.devices?.map((device) => (device.kind === 'radio' ? change(device) : device)),
  })),
})

await test('the rules bite: a call that no longer lapses, an answer that no longer looks, a milestone that can be un-met', async () => {
  // 1. The call for the hall lit keeps waiting once Wing 1 is lit too: a
  //    player who lit both away from the desk comes back to be sent to a
  //    breaker already thrown.
  const neverLapses = withRadio((radio) => ({
    ...radio,
    calls: radio.calls.map((call) => {
      if (call.id !== 'porter-atrium-service') return call
      const { lapsesWhen: _, ...rest } = call
      return rest
    }),
  }))
  const lapse = await problemsOf(neverLapses, 60, RADIO_ON_DESK, LAZY)
  assert.ok(
    lapse.problems.some((problem) => /call "porter-atrium-service" sends the player to "holyoke-breaker" with holyoke already lit/.test(problem)),
    `a call with no \`lapsesWhen\` went through: ${lapse.problems.join('; ') || 'no problem found'}`,
  )

  // 2. The answer that teases about the dark says it in any night.
  const blind = withRadio((radio) => ({
    ...radio,
    patience: radio.patience && {
      ...radio.patience,
      tiers: radio.patience.tiers.map((tier) => ({
        ...tier,
        replies: tier.replies.map((reply) => {
          if (reply.id !== 'porter-t4-dark') return reply
          const { when: _, ...rest } = reply as typeof reply & { when?: unknown }
          return rest
        }),
      })),
    },
  }))
  const dark = await problemsOf(blind, 120, ORDINARY, LAZY)
  assert.ok(
    dark.problems.some((problem) => /radio\.patience\.t4\.dark \(pt-BR\) says "escuro" with every room lit/.test(problem)),
    `an answer about the dark with no \`when\` went through: ${dark.problems.join('; ') || 'no problem found'}`,
  )

  // 3. A milestone of the night that holds until something happens: the
  //    count goes down the moment it does, and the hour with it.
  const clock = MUSEUM.nightClock as NightClock
  const unmet: MuseumContent = {
    ...MUSEUM,
    nightClock: {
      ...clock,
      milestones: clock.milestones.map((milestone) =>
        milestone.id === 'atrium' ? { id: milestone.id, when: { unpowered: ['atrium'] } } : milestone,
      ),
    },
  }
  const back = await problemsOf(unmet, 20, ORDINARY, LAZY)
  assert.ok(
    back.problems.some((problem) => /the night went back from \d+ milestone\(s\) to \d+/.test(problem)),
    `a milestone that can be un-met went through: ${back.problems.join('; ') || 'no problem found'}`,
  )
})

await test('the suite is in the gate, after the playthrough it listens to', () => {
  const scripts = (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> }).scripts
  assert.equal(scripts['test:speech-coherence'], 'node --experimental-strip-types scripts/test-speech-coherence.ts')
  assert.match(scripts.check, /npm run test:playthrough && npm run test:speech-coherence && /)
})

done('speech coherence checks')
