/**
 * The fact bank: which pages each fact rests on.
 *
 * This is the half of a source a person writes. It says where to look and
 * what finding the fact there means; it does not say what the page holds.
 * `npm run facts:capture` reads every address below and writes that into
 * `facts.generated.ts`, and the gate believes the reading, not this file
 * (see `factCapture.ts`).
 *
 * Every address here comes from the fact report of 2026-10-03
 * (`docs/plano-mestre/fontes/07-facts.md`) and was read again on 2026-10-04,
 * when the bank was written; the one that would not open then either is an
 * open request in `facts.manual.ts`. An address goes in only after somebody
 * has tried to open it: a source typed from memory is how the game came to
 * cite a page that answered 404.
 *
 * To add a fact: add the entry, run `npm run facts:capture`, read the
 * report it prints, and cite in `museum.ts` only the pages it found the
 * value on. A publisher that is not in `PUBLISHERS` has to be registered
 * first, with the host it owns.
 *
 * The three codes of the wings (`founding-federations`, `japan-world-title`,
 * `wagner-takes-poland`) are captured here before their wings exist, on
 * purpose: a room is not designed around a number that turns out to have one
 * source (plan §7.2 and §7.7). The wing's lot gives its `Fact` the same id.
 */

import type { FactBankEntry } from './factCapture'

const FIVB_HISTORY = 'https://www.fivb.com/volleyball/the-game/history/'
const IVHF_HISTORY = 'https://www.volleyhall.org/history-of-volleyball.html'
const IVHF_MORGAN = 'https://www.volleyhall.org/william-morgan-father-of-volleyball.html'
const WIKIPEDIA_VOLLEYBALL = 'https://en.wikipedia.org/wiki/Volleyball'

export const FACT_BANK: readonly FactBankEntry[] = [
  {
    id: 'springfield-renaming',
    value: '1896',
    lot: 'L1',
    usedAsCode: true,
    // Every account has the year; they differ on the occasion (a visit or a
    // demonstration, early in the year or on 7 July), so the match asks for
    // the man, the name and the town, not for the conference. The town is
    // what tells the renaming apart from the rules printed that July.
    match: { kind: 'token', near: ['Halstead', 'Volley Ball', 'Springfield'] },
    sources: [
      { url: FIVB_HISTORY },
      // The Hall of Fame's own research, with the newspaper of the day.
      { url: IVHF_HISTORY },
      // The Hall of Fame's page on Morgan tells it in the federation's words:
      // one account on two sites is one publisher.
      { url: IVHF_MORGAN, copies: 'fivb' },
      { url: WIKIPEDIA_VOLLEYBALL },
    ],
  },
  {
    id: 'first-rulebook',
    value: '1897',
    lot: 'L1',
    usedAsCode: false,
    match: { kind: 'token', near: ['handbook'] },
    sources: [{ url: FIVB_HISTORY }, { url: IVHF_MORGAN, copies: 'fivb' }],
  },
  {
    id: 'filipino-spike',
    value: '1916',
    lot: 'L1',
    usedAsCode: false,
    match: { kind: 'token', near: ['Philippines'] },
    // One publisher, and it stays that way until somebody finds a second:
    // this fact can be told, and can never be a code.
    sources: [{ url: WIKIPEDIA_VOLLEYBALL }],
  },
  {
    id: 'six-a-side',
    value: '1918',
    lot: 'L1',
    usedAsCode: false,
    match: { kind: 'token', near: ['limited to six'] },
    sources: [
      { url: FIVB_HISTORY },
      // The Hall of Fame's history gives the year in the federation's own
      // sentence, word for word. Listed so that nobody finds it later and
      // takes it for a second publisher.
      { url: IVHF_HISTORY, copies: 'fivb' },
    ],
  },
  {
    id: 'founding-federations',
    value: '14',
    lot: 'L18',
    usedAsCode: true,
    // Counted, not typed: the page has to carry the list. The English and
    // French Wikipedia articles give the number and no names, so they are not
    // sources of this fact; the Polish one says sixteen, which the wing
    // tells as a doubt (plan §7.2), not as a source.
    match: {
      kind: 'names',
      names: [
        ['Belgium', 'Belgio', 'Bélgica'],
        ['Brazil', 'Brasile', 'Brasil'],
        ['Czechoslovakia', 'Cecoslovacchia', 'Tchecoslováquia'],
        ['Egypt', 'Egitto', 'Egito'],
        ['France', 'Francia', 'França'],
        ['Netherlands', 'Paesi Bassi', 'Países Baixos'],
        ['Hungary', 'Ungheria', 'Hungria'],
        ['Italy', 'Italia', 'Itália'],
        ['Poland', 'Polonia', 'Polônia'],
        ['Portugal', 'Portogallo'],
        ['Romania', 'Romênia'],
        ['Uruguay', 'Uruguai'],
        ['United States', 'USA', 'Estados Unidos'],
        ['Yugoslavia', 'Jugoslavia', 'Iugoslávia'],
      ],
    },
    sources: [
      { url: 'https://www.volleyhall.org/paul-libaud.html' },
      { url: 'https://it.wikipedia.org/wiki/F%C3%A9d%C3%A9ration_Internationale_de_Volleyball' },
      { url: 'https://pt.wikipedia.org/wiki/Federa%C3%A7%C3%A3o_Internacional_de_Voleibol' },
    ],
  },
  {
    id: 'japan-world-title',
    value: '1962',
    lot: 'L19',
    usedAsCode: true,
    // Whole phrases, because the year stands beside "Japan" in every list of
    // hosts too (Soviet Union 1962, Japan 1967), and that neighbour says
    // nothing about who won.
    match: { kind: 'token', near: ['champions Japan', 'gold medal', 'Чемпион Япония'] },
    sources: [
      { url: 'https://en.wikipedia.org/wiki/1962_FIVB_Women%27s_Volleyball_World_Championship' },
      {
        url: 'https://ru.wikipedia.org/wiki/%D0%A7%D0%B5%D0%BC%D0%BF%D0%B8%D0%BE%D0%BD%D0%B0%D1%82_%D0%BC%D0%B8%D1%80%D0%B0_%D0%BF%D0%BE_%D0%B2%D0%BE%D0%BB%D0%B5%D0%B9%D0%B1%D0%BE%D0%BB%D1%83_%D1%81%D1%80%D0%B5%D0%B4%D0%B8_%D0%B6%D0%B5%D0%BD%D1%89%D0%B8%D0%BD_1962',
      },
      { url: 'https://www.volleyhall.org/hirofumi-daimatsu.html' },
      // The page the wing needs for "in Moscow" (plan §7.7, item 6).
      { url: 'https://www.olympics.com/en/news/tokyo-1964-women-volleyball-japan-gold' },
    ],
  },
  {
    id: 'wagner-takes-poland',
    value: '1973',
    lot: 'L20',
    usedAsCode: true,
    // The Hall of Fame's page is deliberately absent: by its arithmetic he
    // took over in 1974, and that is the wrong answer the wing is built on.
    match: { kind: 'token', near: ['trener', 'head coach'] },
    sources: [
      { url: 'https://dzieje.pl/node/25274' },
      { url: 'https://pl.wikipedia.org/wiki/Hubert_Wagner' },
      { url: 'https://en.wikipedia.org/wiki/Hubert_Wagner' },
    ],
  },
]
