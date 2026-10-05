/**
 * How the prompt under the crosshair is worded, as plain functions.
 *
 * A prompt names a thing and says what E does to it, and each of the two
 * used to be decided in the component that drew it: the drawer was named
 * «Gaveta trancada do curador» whether or not it was still locked, and only
 * a radio could be a device. Here the wording is a function of what the
 * rules say (the lock's status, the device's intent), so a suite can ask it
 * without a DOM and a prompt cannot say one thing while E does another.
 *
 * Apart from `hudRules.ts` on purpose: the title screen imports that one,
 * and these are rules of the game's HUD only. Nothing here would be reached
 * before the click.
 */

import type { TranslationKey } from '../content/i18n/pt-BR'
import type { ContainerData, DeviceData, Lock } from '../content/schema'
import type { DeskRadioIntent, DeviceIntent } from '../engine/deviceRules'

/** How a container's prompt is worded: as a shut lock, or as something to read. */
export type ContainerPromptView =
  /** «title — what the lock says», while its lock is shut and has words of its own. */
  | { readonly form: 'locked'; readonly titleKey: string; readonly sayingKey: string }
  /** «label title»: «Ler — Gaveta do Otávio». */
  | { readonly form: 'read'; readonly labelKey: TranslationKey; readonly titleKey: string }

/**
 * What the prompt of a container says.
 *
 * A name says what a thing is; that it is locked is the lock's to say, for
 * as long as it is true. A lock with no words of its own keeps the plain
 * «Trancado» before the name.
 */
export function containerPrompt(
  container: Pick<ContainerData, 'titleKey'>,
  lock: Pick<Lock, 'promptKey'> | undefined,
  locked: boolean,
): ContainerPromptView {
  if (locked && lock?.promptKey) return { form: 'locked', titleKey: container.titleKey, sayingKey: lock.promptKey }
  return { form: 'read', labelKey: locked ? 'prompt.locked' : 'prompt.read', titleKey: container.titleKey }
}

const DESK_RADIO_LABEL = {
  dead: 'prompt.radio.dead',
  take: 'prompt.radio.take',
  skip: 'radio.skip',
  call: 'prompt.radio.call',
} as const satisfies Record<DeskRadioIntent, TranslationKey>

/** How a device's prompt is worded. */
export type DevicePromptView =
  /** «[E] label title»: a thing E works, or (with no key) one that says why it will not. */
  | { readonly form: 'action'; readonly key: boolean; readonly labelKey: TranslationKey; readonly titleKey: string }
  /** «title — notice»: a thing that only says something. Never a key. */
  | { readonly form: 'notice'; readonly titleKey: string; readonly noticeKey: string }

/**
 * What the prompt of a device says, from the intent E acts on
 * (`engine/deviceRules.ts`): the two can no more disagree than the radio's
 * label and the radio's key could. Null for a device that answers nothing,
 * and for an intent that is not this kind of device's.
 */
export function devicePrompt(device: DeviceData, intent: DeviceIntent): DevicePromptView | null {
  switch (intent.kind) {
    case 'none':
      return null
    case 'notice':
      return device.kind === 'notice'
        ? { form: 'notice', titleKey: device.titleKey, noticeKey: device.noticeKey }
        : null
    case 'radio':
      return device.kind === 'radio'
        ? {
            form: 'action',
            // Drawn exactly when E does something: `deviceLive` says the same.
            key: intent.intent !== 'dead',
            labelKey: DESK_RADIO_LABEL[intent.intent],
            titleKey: device.titleKey,
          }
        : null
  }
}
