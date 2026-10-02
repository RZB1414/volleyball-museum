/**
 * The porter's patience, as plain rules.
 *
 * The radio leaves the desk with the player, and a radio in the pocket gets
 * called. Jorge answers every call with the hint the player needs — the hint
 * is never left out, except when he loses his temper — but how he says it
 * depends on how often he has been called: helpful at first, then dry, then
 * teasing, and in the end short-tempered enough to hang up now and then.
 *
 * Pure so every tier, joke and tantrum can be proved headless with a fixed
 * clock and a fixed dice (`test-radio.ts`); `radioCall.ts` feeds these the
 * store and plays the answer. The tiers, lines and numbers are content
 * (`RadioPatience` in `museum.ts`), not code.
 */

import type { MuseumContent, RadioPatience, RadioReply } from '../content/schema'
import { isModalOpen, type MuseumStore, type RadioMemory } from '../state/store.ts'
import { radioDevices, radioHintIndex, type RadioDevice } from './deviceRules.ts'
import { isTextEntryTarget } from './flashlightRig.ts'
import type { ConditionProgress } from './progressCondition.ts'

/**
 * How many calls he still holds against the player.
 *
 * Every `calmSecondsPerCall` of real silence takes one off, and a hint that
 * changed since the last call — the player got somewhere — forgives
 * `progressForgives` more. A clock that went backwards calms nobody.
 */
export function calmedTemper(
  patience: Pick<RadioPatience, 'calmSecondsPerCall' | 'progressForgives'>,
  memory: Pick<RadioMemory, 'temper' | 'lastCallAt' | 'lastHint'>,
  now: number,
  hintIndex: number,
) {
  const quiet = Math.max(0, now - memory.lastCallAt)
  const calmed = Math.floor(quiet / (patience.calmSecondsPerCall * 1000))
  const progressed = memory.lastHint >= 0 && memory.lastHint !== hintIndex
  return Math.max(0, memory.temper - calmed - (progressed ? patience.progressForgives : 0))
}

/**
 * The most calls he holds against the player: enough to reach the last tier
 * and no more. Without a ceiling, a player who mashed R for a minute would
 * face hours of the worst tier; with it, fifteen quiet minutes always bring
 * him back down a tier.
 */
export function temperCeiling(patience: Pick<RadioPatience, 'tiers'>) {
  return Math.max(0, patience.tiers[patience.tiers.length - 1]?.fromCall ?? 0)
}

/** The tier answering this call: the last whose `fromCall` it has reached. */
export function patienceTierFor(patience: Pick<RadioPatience, 'tiers'>, callNumber: number) {
  let tier = 0
  for (const [index, candidate] of patience.tiers.entries()) {
    if (candidate.fromCall <= callNumber) tier = index
  }
  return tier
}

/** Whether a remembered reply id was one of his outbursts. */
export function isOutburstId(patience: Pick<RadioPatience, 'tiers'>, id: string | null) {
  if (id === null) return false
  return patience.tiers.some((tier) => (tier.outbursts ?? []).some((outburst) => outburst.id === id))
}

/**
 * One draw from a list, never the entry said last time.
 *
 * `floor(random() * n)`, stepping on by one when that repeats `avoid`, so a
 * fixed dice in a test gives a fixed, documented sequence.
 */
function pickFresh<T extends { readonly id: string }>(
  list: readonly T[],
  random: () => number,
  avoid: string | null,
): T {
  const roll = Math.min(Math.max(random(), 0), 0.999999)
  let index = Math.floor(roll * list.length)
  if (list.length > 1 && list[index].id === avoid) index = (index + 1) % list.length
  return list[index]
}

export type PorterAnswer = {
  readonly lineKeys: readonly string[]
  /** The opener or outburst chosen, or null for a bare hint. */
  readonly replyId: string | null
  /** The patience tier that answered, from 0. */
  readonly tier: number
  readonly outburst: boolean
  /** Seconds he stays off the air afterwards; 0 when he does not hang up. */
  readonly hangUpSeconds: number
  /** What he remembers after this call. */
  readonly memory: RadioMemory
}

/**
 * What the porter says to one call, and how he feels about it afterwards.
 *
 * The dice is consumed in a fixed order: first, only when an outburst is
 * possible on this call, one draw decides whether it happens; then one draw
 * picks the outburst, or the opener (praise after progress, a reply
 * otherwise). An outburst replaces the whole answer and is never followed by
 * another; every other answer is opener, hint (curt in the impatient tiers)
 * and an optional closing line.
 */
export function porterAnswer(
  device: Pick<RadioDevice, 'hints' | 'patience'>,
  progress: ConditionProgress,
  memory: RadioMemory,
  now: number,
  random: () => number,
  content: Pick<MuseumContent, 'rooms' | 'exhibits'>,
): PorterAnswer {
  const hintIndex = radioHintIndex(device, progress, content)
  const hint = hintIndex >= 0 ? device.hints[hintIndex] : undefined
  const patience = device.patience

  if (!patience || patience.tiers.length === 0) {
    return {
      lineKeys: hint?.lineKeys ?? [],
      replyId: null,
      tier: 0,
      outburst: false,
      hangUpSeconds: 0,
      memory: { ...memory, calls: memory.calls + 1, lastCallAt: now, lastHint: hintIndex },
    }
  }

  const temper = calmedTemper(patience, memory, now, hintIndex)
  const progressed = memory.lastHint >= 0 && memory.lastHint !== hintIndex
  const tierIndex = patienceTierFor(patience, temper + 1)
  const tier = patience.tiers[tierIndex]
  const remember = (replyId: string | null, outburstId: string | null): RadioMemory => ({
    calls: memory.calls + 1,
    temper: Math.min(temper + 1, temperCeiling(patience)),
    lastCallAt: now,
    lastHint: hintIndex,
    lastReplyId: replyId,
    lastOutburstId: outburstId ?? memory.lastOutburstId,
  })

  const outbursts = tier.outbursts ?? []
  const mayLoseIt =
    !progressed &&
    outbursts.length > 0 &&
    (tier.outburstChance ?? 0) > 0 &&
    // The call after a tantrum always helps.
    !isOutburstId(patience, memory.lastReplyId)
  if (mayLoseIt && random() < (tier.outburstChance ?? 0)) {
    const outburst = pickFresh(outbursts, random, memory.lastOutburstId)
    return {
      lineKeys: outburst.lineKeys,
      replyId: outburst.id,
      tier: tierIndex,
      outburst: true,
      hangUpSeconds: outburst.hangsUp ? patience.hangUpSeconds : 0,
      memory: remember(outburst.id, outburst.id),
    }
  }

  const praise = patience.praise ?? []
  const opener: RadioReply =
    progressed && praise.length > 0
      ? pickFresh(praise, random, memory.lastReplyId)
      : pickFresh(tier.replies, random, memory.lastReplyId)
  const help =
    tier.hint === 'curt' && hint?.curtLineKeys && hint.curtLineKeys.length > 0
      ? hint.curtLineKeys
      : (hint?.lineKeys ?? [])
  return {
    lineKeys: [...opener.lineKeys, ...help, ...(opener.closingKeys ?? [])],
    replyId: opener.id,
    tier: tierIndex,
    outburst: false,
    hangUpSeconds: 0,
    memory: remember(opener.id, null),
  }
}

/** The static that answers while he is off the air, never the same twice running. */
export function deadAirFor(
  patience: Pick<RadioPatience, 'deadAir'>,
  random: () => number,
  lastId: string | null,
): RadioReply | null {
  return patience.deadAir.length > 0 ? pickFresh(patience.deadAir, random, lastId) : null
}

/**
 * R calls the porter. Not Ctrl/Cmd/Alt+R, which reload the page or belong to
 * the browser, not a held key, and never while typing.
 */
export function isRadioCallKey(
  event: Pick<KeyboardEvent, 'code' | 'repeat' | 'ctrlKey' | 'metaKey' | 'altKey' | 'target'>,
) {
  return (
    event.code === 'KeyR' &&
    !event.repeat &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !isTextEntryTarget(event.target)
  )
}

/** No calls from the title screen, and none under a modal: nothing in the world answers then. */
export function radioCallBlocked(
  state: Pick<MuseumStore, 'started' | 'examining' | 'openedContainer' | 'activeLock' | 'journalTab'>,
) {
  return !state.started || isModalOpen(state)
}

type HandsetContent = Pick<MuseumContent, 'rooms'>
const carriableByContent = new WeakMap<HandsetContent, readonly string[]>()

/**
 * The radio in the player's hand, if any.
 *
 * The HUD asks this on every store write, so the content walk happens once
 * per content set.
 */
export function heldRadioId(devicesCarried: readonly string[], content: HandsetContent) {
  let carriable = carriableByContent.get(content)
  if (!carriable) {
    carriable = radioDevices(content)
      .filter((entry) => entry.device.carriedOnUse)
      .map((entry) => entry.device.id)
    carriableByContent.set(content, carriable)
  }
  return carriable.find((id) => devicesCarried.includes(id)) ?? null
}
