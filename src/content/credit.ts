/**
 * Credit rendering.
 *
 * Every image and document scan prints its credit directly beneath itself in
 * world space, exactly as a real museum labels a lender. The same records also
 * populate the credits wall, where the full URLs live.
 *
 * Two forms:
 *   - `formatCreditLine`   one compact line, set small under the frame.
 *   - `formatCreditEntry`  the full TASL record for the credits wall.
 */

import type { MediaCredit } from './schema'

/** Human-readable licence names. Keys match the schema's licence union. */
const LICENSE_LABEL: Record<Exclude<MediaCredit['license'], 'procedural' | 'public-domain'>, string> = {
  'cc0': 'CC0 1.0',
  'cc-by-2.0': 'CC BY 2.0',
  'cc-by-3.0': 'CC BY 3.0',
  'cc-by-4.0': 'CC BY 4.0',
  'cc-by-sa-3.0': 'CC BY-SA 3.0',
  'cc-by-sa-4.0': 'CC BY-SA 4.0',
}

export type CreditLocale = 'pt-BR' | 'en'

const PUBLIC_DOMAIN_LABEL: Record<CreditLocale, string> = {
  'pt-BR': 'Domínio público',
  en: 'Public domain',
}

const PROCEDURAL_LABEL: Record<CreditLocale, string> = {
  'pt-BR': 'Ilustração autoral gerada para este museu',
  en: 'Original illustration generated for this museum',
}

const UNKNOWN_AUTHOR_LABEL: Record<CreditLocale, string> = {
  'pt-BR': 'Autoria desconhecida',
  en: 'Unknown author',
}

function localiseAuthor(author: string | undefined, locale: CreditLocale): string | undefined {
  if (!author) return undefined
  if (/^unknown author$/i.test(author)) return UNKNOWN_AUTHOR_LABEL[locale]
  return author
}

/**
 * The one-line form set beneath the artwork. Deliberately terse — this is
 * museum caption type, roughly 9 pt against a 40-word label, and it must not
 * compete with the exhibit.
 */
export function formatCreditLine(credit: MediaCredit, locale: CreditLocale): string {
  if (credit.license === 'procedural') {
    return PROCEDURAL_LABEL[locale]
  }

  if (credit.license === 'public-domain') {
    const parts = [credit.title]
    const author = localiseAuthor(credit.author, locale)
    if (author) parts.push(author)
    if (credit.year) parts.push(credit.year)
    parts.push(PUBLIC_DOMAIN_LABEL[locale])
    return parts.join(' · ')
  }

  return [credit.title, localiseAuthor(credit.author, locale), LICENSE_LABEL[credit.license]]
    .filter(Boolean)
    .join(' · ')
}

export type CreditEntry = {
  readonly title: string
  readonly author?: string
  readonly detail: string
  readonly sourceUrl?: string
  readonly licenseUrl?: string
  readonly licenseLabel: string
}

/** The full record for the credits wall, where links are clickable. */
export function formatCreditEntry(credit: MediaCredit, locale: CreditLocale): CreditEntry {
  if (credit.license === 'procedural') {
    return {
      title: PROCEDURAL_LABEL[locale],
      detail: credit.generator,
      licenseLabel: PROCEDURAL_LABEL[locale],
    }
  }

  if (credit.license === 'public-domain') {
    return {
      title: credit.title,
      author: localiseAuthor(credit.author, locale),
      detail: credit.reason,
      sourceUrl: credit.sourceUrl,
      licenseLabel: PUBLIC_DOMAIN_LABEL[locale],
    }
  }

  return {
    title: credit.title,
    author: localiseAuthor(credit.author, locale),
    detail: credit.modifications ?? '',
    sourceUrl: credit.sourceUrl,
    licenseUrl: credit.licenseUrl,
    licenseLabel: LICENSE_LABEL[credit.license],
  }
}
