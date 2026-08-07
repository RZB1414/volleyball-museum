/**
 * Translation lookup.
 *
 * pt-BR is the source of truth and `en.ts` is typed against it, so a missing
 * English key is a compile error rather than a blank plaque a player finds.
 *
 * Its own module so the components that use it stay component-only and keep
 * fast refresh working.
 */

import { en } from './content/i18n/en'
import { ptBR, type TranslationKey } from './content/i18n/pt-BR'
import { useMuseum } from './state/store'

const DICTIONARIES = { 'pt-BR': ptBR, en } as const

export function useTranslate() {
  const locale = useMuseum((state) => state.settings.locale)
  const dictionary = DICTIONARIES[locale]
  return (key: TranslationKey) => dictionary[key]
}

/**
 * Hookless lookup, for the components that render inside the Canvas.
 *
 * `useTranslate` subscribes to the store, and a subscription in the scene graph
 * re-renders the whole room group whenever any unrelated setting changes. These
 * callers already have the locale threaded down as a prop.
 *
 * Content keys are plain strings (the schema cannot import the dictionary
 * without a cycle), so this falls back to the key itself — visible, greppable,
 * and caught before it ships by the `missing-translation` validator rule.
 */
export function lookup(locale: keyof typeof DICTIONARIES, key: string): string {
  const dictionary = DICTIONARIES[locale] as Record<string, string>
  return dictionary[key] ?? key
}

export const TRANSLATION_KEYS: ReadonlySet<string> = new Set(Object.keys(ptBR))

export type { TranslationKey }
