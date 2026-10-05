# L2 — Trilhos: plano do lote

Escrito em 2026-10-04, sobre o commit `1725721` (`main`, igual a `origin/main`). É o passo 1 de §9.1
de `docs/PLANO-ATE-O-FINAL.md` para o lote L2: cada tarefa com o arquivo e a linha de hoje, a
mudança exata, o teste que a prova (e por que ele reprova o estado de hoje), as formas de dado em
TypeScript, os casos de migração com o save antes e depois, os textos finais em pt-BR e em inglês,
as dívidas datadas e as fatias de implementação. **Este arquivo não muda código.** As linhas citadas
são as de `1725721`; o plano mestre cita as de `82756c4`.

Os números marcados **[medido]** saíram de uma simulação em Node feita para este plano com o código
real (a matemática do exame, a cápsula e a colisão de `scripts/lib/museumWorld.ts`, os dois
dicionários). Os marcados **[previsto]** são conta; quem os confirma é a fatia que implementa.

## 0. Resumo

O que muda para o jogador:

- **o save não se perde mais.** Um save de produção carrega inteiro; um campo que este build não
  conhece (gravado por um lote mais novo, numa outra aba) fica no save em vez de ser descartado;
  e uma aba que já estava aberta quando a outra gravou lê o disco antes de gravar e junta as duas
  cópias, em vez de pôr a dela por cima (entrou na revisão do lote: §14, «Revisão adversarial»);
- **o atalho da Ala 1 fica aberto.** Depois da primeira saída por ele, abre dos dois lados, para
  sempre, com o aviso «Atalho destrancado». Do saguão, antes disso, o `E` responde com o som de
  porta trancada em vez de silêncio;
- **a planta não entrega o prédio.** Só desenha a sala visitada; a vizinha é um toco com «?»; o
  atalho só aparece depois de aberto; a tranca só é listada depois de tocada; o marcador tem seta e
  a planta tem norte; os três estados de sala diferem por padrão e por cor.

O que não muda: nenhuma história nova, nenhuma sala, nenhuma textura, nenhum modelo, nenhuma
dependência. Nenhuma sala desenha nada diferente: os dez pontos de referência não são medidos de
novo e o `BROWSER_RECORD` continua o de L1 (vale até L3). O jogo continua com o fecho honesto de L1.

O que o lote instala e o jogador não vê: a tabela de campos do save, `progress.contentLot`, os
gatilhos de disparo único, `attemptLock`, a simulação que substitui `validateSolvability`, o robô
de 500 ordens, a navegação por inundação, o lint de numerais e o primeiro instantâneo do grafo.

## 1. Escopo conferido

| Origem | O que pede em L2 | Tarefa | Fatia |
|---|---|---|---|
| M2; S12, S30; EN-A20 | `SAVE_VERSION` em 1; `contentLot`; tabela de campos; campos desconhecidos preservados; migradores; aliases | T1, T2 | F1 |
| HANDOFF §10.10, item 1 | corpus de saves de L1; congelar `l1` e `l1-review` | T3 | F1 |
| M5; S11; EN-A21; CN16 | condições v2; gatilhos de disparo único; `Lock.onOpen`; o store sem conteúdo (registro de regras) | T4, T5 | F2 |
| M6a; S1; EN-A1; EN-A6, H-33 | `lockRules.ts`: `lockStatus`, `attemptLock` como único caminho; `progress.locksSeen` | T6 | F2 |
| ÁT-G1, H-29, CN17, P25; I-15 | `progress.doorsReleased`; som no `E` bloqueado; toast; item 14 da frente 7 (o estado salvo) | T7 | F3 |
| ÁT-I1; ÁT-A5 (planta); EN-A6 | `mapModel(progress)`; seta e norte; três estados por padrão e cor | T8 | F3 |
| HANDOFF §10.10, item 2 | pagar `map.legend`; `CONTENT_LOT` passa a 2 | T8 | F3 |
| M4a | `examineReach` puro; reprova `net-1897`, `gym-suit`, `photo-gym` | T9 | F4 |
| M10; S3; EN-A3 | `simulateProgress` no lugar de `validateSolvability`; roteiro em níveis | T10 | F4 |
| M10 | robô de partida: `test:playthrough` com 500 ordens | T11 | F4 |
| M39; R1 | `validateAdditive`, `graph:snapshot`, primeiro instantâneo | T12 | F4 |
| M15; ÁT-H3 (o que L1 deixou) | alcance por inundação de todo interativo das três salas | T13 | F5 |
| M11 (lint); H-22, CN13, EN-A7; D14 | `numeral-exclusivity`, `counted-pattern`, `text-ages` | T14 | F5 |

Fora de L2, por decisão do plano mestre, e que este lote não toca: `porter-shortcut` (a chamada do
Jorge ao abrir o atalho, L3); a barra antipânico e a placa «SERVIÇO» (H-30, L14; ÁT-F3, L9); o
teclado de N dígitos e a escada de dicas (M6b, L4); `consume-credential` e o cofre (M6b, L3);
soquetes e fios nas condições (L11, L17); a lista do caderno como dado e as listas congeladas (M32,
L3); o Acervo em três estados e o ponto da planta com nome (H-34, L4); a aba Planta pelo folheto
(L9); as travessias derivadas de todo par de portais (M15, L17).

Do Anexo E do plano mestre (o que conferir no navegador antes de virar tarefa), nenhum item é
marcado para L2. O que este plano mediu foi em Node, com o código real: os cones do exame (T9), a
inundação das três salas (T13), os numerais e as palavras dos dois dicionários (T14) e a igualdade
de `src/state` entre a produção e a árvore de hoje (DL2-18).

## 2. Decisões deste plano

| # | Ponto | Decisão | Por quê |
|---|---|---|---|
| DL2-1 | o que entra em `doorsReleased` | o id da **porta física** (`TransitionDoorSpec.id`): `atrium-from-holyoke-shortcut` | é o id que o runtime, a colisão e os testes já usam para a folha; o portal recíproco se chama `holyoke-shortcut` e é o que o plano mestre escreve em I-15 (`door:holyoke-shortcut`). O átomo é o mesmo; o nome no save é o da porta. O validador confere todo id de `doorsReleased` numa condição contra as portas |
| DL2-2 | quando a porta é liberada | no `E` aceito do lado de `opensFrom` (a barra foi empurrada), não na travessia | quem aperta e desiste já destrancou; e um reload no meio da abertura não desfaz. O plano mestre diz «depois da primeira abertura» |
| DL2-3 | a migração de `doorsReleased` | nenhuma inferência: save antigo carrega com a lista vazia | nenhum save de produção prova que o jogador saiu pelo atalho; inventar o átomo calaria o `porter-shortcut` de L3 para quem nunca o achou. Nada se perde: esse jogador nunca teve a porta nos dois sentidos |
| DL2-4 | a migração de `locksSeen` | `locksSeen ⊇ locksOpened`: tranca aberta foi tocada | é a única coisa que o save prova. A gaveta fechada de `production-drawer-closed` some da planta até o primeiro toque |
| DL2-5 | save de outra versão | continua não sendo lido (`store.ts:234` fica); `SAVE_VERSION` fica em 1 e um teste diz por quê | nenhum build escreveu nem escreverá outra versão: o que muda de lote para lote é `contentLot`. Ler campos de um formato que ninguém definiu seria adivinhar. A armadilha que S12 descreve (subir a versão e apagar todo mundo) fica fechada por teste e pelo corpus |
| DL2-6 | o migrador do lote N roda quando | para todo save com `contentLot ≤ N`, e recebe o `contentLot` do save | um lote sai em fatias; a fatia que traz um reparo tem de alcançar o save que a fatia anterior já carimbou. Reparo é idempotente e só acrescenta. O que marca «save anterior a N» olha `savedLot < N` e entra na primeira fatia publicada do lote |
| DL2-7 | de onde sai o carimbo | `contentLot = max(o do save, CONTENT_LOT)`; a constante passa a morar em `src/content/contentLot.ts` | `knownDebt.ts` é só do portão (`test:facts`), e o store precisa do número. `knownDebt.ts` reexporta; quem já importa não muda |
| DL2-8 | aliases de id | dado em `legacySave.ts` (`SAVE_ALIASES`), aplicado em toda carga; o alias **acrescenta** o id novo e mantém o velho | o módulo já guarda os ids da migração de abertura e o validador já o confere; manter o velho é o que deixa o código do lote anterior ler o save sem perder nada. Vazio em L2 |
| DL2-9 | o registro de regras | o store guarda só `settle(progress)`; gatilhos, condições e conteúdo ficam do lado do canvas | é o menor contrato que mantém o caminho do título sem motor nem conteúdo. Aliases não passam por ele (DL2-8) |
| DL2-10 | como um verbo grava | função pura devolve uma **concessão** (`ProgressGrant`); o store tem uma porta, `grant`; a consequência é gatilho | um `set`, uma notificação, um ponto fixo. O jogo, o robô e a simulação chamam a mesma função |
| DL2-11 | trancas sem painel neste lote | `attemptLock` abre por credencial (`badge`, `medallion-plinth`, `tool` sem consumo) e devolve `refused: 'unsupported'` para `tool` com consumo e `ritual` | consumo é a exceção de V3 e chega com o cofre (L3); ritual, com os painéis (L17). O validador `lock-host-kind-unsupported` continua proibindo esses hospedeiros no conteúdo. O que fecha S1 é o runtime: nenhum caminho abre modal para tranca sem painel |
| DL2-12 | a régua de `examineReach` em L2 | a regra de hoje (`HOLD_DISTANCE` 0,42 m, `HOTSPOT_DOT` 0,55), com cone mínimo de 5° de meio-ângulo | separa o que a produção cataloga do que não cataloga (tabela em T9): a Spalding tem 8,5° e está catalogada em save de produção; `photo-gym` tem 1,5° e nenhum save honesto a tem. Os 4% de H-01 valem para o rig novo (L4); com eles, hoje, a Spalding e o retrato reprovariam |
| DL2-13 | a planta e a porta de mão única | não desenha de nenhum dos dois lados antes de liberada; depois, porta comum | é o «atalho depois de aberto» de 8.7. Não há estado de «porta vista» e não vale criar um |
| DL2-14 | a moldura da planta | fixa, sobre todas as salas do build (como hoje) | escala estável; o que a moldura vazia revela é só que há prédio além, e o toco com «?» já diz |
| DL2-15 | texto de acervo para `text-ages`, até L8 | as chaves citadas por `exhibits`, `facts`, `signage` e `documents` (título e corpo); página de caderno e fala de rádio são voz | `claims` e `surface` chegam em L8 e substituem esta regra. O bilhete do Otávio é documento e fica como dívida datada (L3), não como exceção |
| DL2-16 | onde ficam as dívidas de «Caixa-forte» | `checklist-item-untickable` de `notebook.todo.vault` datada para **L3**, não L12 | L3 transforma a linha em promessa datada sem caixa de riscar (M32, `deferredUntilLot`), e aí a acusação some. O Anexo C dizia L12, que é quando a promessa é paga |
| DL2-17 | o instantâneo e os «todos» | `graph:snapshot` grava as condições `allRoomsPowered` e `allCatalogued` **resolvidas** nos ids do lote | L3 congela as listas (M32) sem que `validateAdditive` acuse mudança; e quem deixar um «todos» numa lista quando chegar uma sala é pego por `checklist-condition-changed` |
| DL2-18 | o corpus de L1 | um save tirado do navegador, no servidor de desenvolvimento, **antes da primeira edição** de F1 | `git diff 842750f..1725721 -- src/state` é vazio [medido]: a árvore de hoje escreve o mesmo save que o build publicado (`f0fb5a3`, Cloudflare `1d3a4554`). Depois de F1 o servidor deixa de escrever saves de L1 |

## 3. Formas de dado

### 3.1 O save (`src/state/progressFields.ts`, novo)

```ts
/** Never bumped: a lot changes `contentLot`, and a save of another version is not ours to read. */
export const SAVE_VERSION = 1

export type Progress = {
  version: number
  /** The lot of the build that last wrote this save. It only grows. */
  contentLot: number
  catalogued: string[]
  hotspots: string[]
  documentsRead: string[]
  factsKnown: string[]
  credentials: string[]
  roomsVisited: string[]
  roomsPowered: string[]
  locksOpened: string[]
  /** Locks the player has touched, open or not: what the plan may name. (F2) */
  locksSeen: string[]
  /** One-way doors opened once from their own side; from then on, both. (F3) */
  doorsReleased: string[]
  /** Story flags, set by triggers and by migrations. (F2) */
  flags: string[]
  /** Triggers that have fired; each fires once. (F2) */
  triggersFired: string[]
  radioCalls: string[]
  clockSeconds: Record<string, number>
  hintsShown: string[]
  devicesCarried: string[]
  radioMemory: Record<string, RadioMemory>
  lastRoom: string
}

type FieldSpec<T> = {
  /** A fresh default, so no two saves share a list. */
  readonly fresh: () => T
  /** A valid value out of whatever the save holds; null when it holds none. */
  readonly read: (raw: unknown) => T | null
  /** Whether a non-empty value is something "New game" would erase. */
  readonly counts: boolean
}

export const PROGRESS_FIELDS = { /* one row per field, below */ } satisfies {
  readonly [K in Exclude<keyof Progress, 'version'>]: FieldSpec<Progress[K]>
}

export type ListField = {
  [K in keyof Progress]: Progress[K] extends string[] ? K : never
}[keyof Progress]

/** What a verb of the player adds to the save. Lists only: progress grows. */
export type ProgressGrant = { readonly [K in ListField]?: readonly string[] }

export function emptyProgress(): Progress
/** Field by field from the table; every key the table does not know is carried over untouched. */
export function sanitiseProgress(raw: Readonly<Record<string, unknown>>): Progress
/** The same object when the grant adds nothing. */
export function grantProgress(progress: Progress, grant: ProgressGrant): Progress
/** The `counts` column, plus the rule of the visited rooms. */
export function hasSavedProgress(progress: Progress): boolean
```

O módulo exporta ainda `EMPTY_PROGRESS`, `withValue` (o store e o migrador de abertura usam a mesma),
`stringList`, `sanitiseRadioMemory`, `FRESH_RADIO_MEMORY` e o tipo `RadioMemory`.

A tabela de campos, como fica no fim do lote (um campo novo é uma linha aqui e uma no tipo; a falta
de qualquer das duas é erro de compilação):

| Campo | Tipo | Padrão | Sanitizador | Conta como progresso | Entra em |
|---|---|---|---|---|---|
| `version` | `1` | `1` | não é campo da tabela: lido como porteira (DL2-5), escrito sempre `1` | — | existe |
| `contentLot` | inteiro ≥ 1 | `CONTENT_LOT` em jogo novo; `1` quando o save não traz | inteiro finito ≥ 1, senão `1`; na carga vira `max(save, CONTENT_LOT)` | não | F1 |
| `catalogued`, `hotspots`, `documentsRead`, `factsKnown`, `credentials`, `roomsPowered`, `locksOpened`, `radioCalls`, `devicesCarried` | `string[]` | `[]` | `stringList`: fica o que é string, na ordem; não-lista vira o padrão | sim | existe |
| `roomsVisited` | `string[]` | `[]` | `stringList` | sim, se houver sala além da de partida. É regra própria de `hasSavedProgress`, como hoje: na tabela a coluna fica `false`, com o comentário | existe |
| `locksSeen` | `string[]` | `[]` | `stringList` | sim | F2 |
| `flags` | `string[]` | `[]` | `stringList` | sim | F2 |
| `triggersFired` | `string[]` | `[]` | `stringList` | não | F2 |
| `doorsReleased` | `string[]` | `[]` | `stringList` | sim | F3 |
| `hintsShown` | `string[]` | `[]` | `stringList` | não | existe |
| `clockSeconds` | `Record<string, number>` | `{}` | só valor finito ≥ 0; o resto sai (como `store.ts:239-245`). Uma lista não é registro e vira o padrão (L1 lia `[12]` como `{ '0': 12 }`; nenhum build gravou isso) | não | existe |
| `radioMemory` | `Record<string, RadioMemory>` | `{}` | `sanitiseRadioMemory` (`store.ts:128-149`): entrada com número inválido sai inteira; **subcampo desconhecido de entrada válida fica** | não | existe |
| `lastRoom` | `string` | `SPAWN.room` | string, senão o padrão | não | existe |

Regras do save, cada uma com teste em `test:save`:

1. **Campo desconhecido fica.** Toda chave própria do `progress` salvo que a tabela não conhece é
   copiada como está, por espalhamento (nunca por atribuição: uma chave `__proto__` num save
   adulterado tem de continuar sendo dado). Sobrevive a toda ação, porque toda ação espalha o
   `progress`; some no «Novo jogo».
2. **Campo nunca muda de tipo.** Significado novo é campo novo. É o que deixa o código do lote
   anterior ler o save deste.
3. **Nada encolhe.** Sanitizar, migrar, conceder e disparar gatilho só acrescentam (V1).
4. **`contentLot` nunca baixa.**

### 3.2 Migração (`src/state/saveMigrations.ts`, novo) e aliases (`src/content/legacySave.ts`)

```ts
export type SaveMigration = {
  /** Runs for every save stamped with this lot or an earlier one (DL2-6). */
  readonly lot: number
  /** Pure, idempotent, and it only adds. */
  readonly migrate: (
    progress: Progress,
    save: { readonly raw: Readonly<Record<string, unknown>>; readonly savedLot: number },
  ) => Progress
}

export const SAVE_MIGRATIONS: readonly SaveMigration[] = [
  // The opening scene (2 October): `store.ts:250-279` moved here word for word.
  { lot: 1, migrate: preOpening },
  // F2. A lock that is open was touched.
  { lot: 2, migrate: (progress) => grantProgress(progress, { locksSeen: progress.locksOpened }) },
]

/** version gate → table → migrations → aliases → stamp. Null, a non-object or another version: a new game. */
export function migrateProgress(raw: unknown): Progress
/** The same pipeline with the lists and the lot handed in, so the rules are proved on lists made for the test. */
export function migrateProgressWith(
  raw: unknown,
  rules: { migrations: readonly SaveMigration[]; aliases: readonly SaveAlias[]; contentLot: number },
): Progress

// legacySave.ts
export type SaveAlias = {
  /** The lot that renamed it: a record, not a condition. */
  readonly sinceLot: number
  readonly field: ListField
  readonly from: string
  readonly to: string
}
/** Where a save holds `from`, it also holds `to`. The old id stays (DL2-8). */
export const SAVE_ALIASES: readonly SaveAlias[] = []
```

`migrateProgress` continua exportado por `store.ts` (reexporta), junto de `Progress`,
`EMPTY_PROGRESS`, `SAVE_VERSION`, `hasSavedProgress`, `sanitiseRadioMemory`, `FRESH_RADIO_MEMORY` e
`RadioMemory`: nenhum importador de hoje muda.

Os aliases são aplicados até nada mudar (o renome de um renome assenta numa carga só, qualquer
que seja a ordem da lista), e em toda carga, seja qual for o lote do save: uma aba do build antigo
pode gravar o id velho amanhã.

### 3.3 Condições, efeitos e gatilhos (`src/content/schema.ts`)

```ts
export type ProgressCondition = {
  // as of today: powered, unpowered, locksOpened, locksClosed, documentsRead,
  // documentsUnread, carried, allRoomsPowered, allCatalogued
  readonly catalogued?: readonly string[]
  /** `${exhibitId}:${hotspotId}`, as the save keeps them. */
  readonly hotspotsSeen?: readonly string[]
  readonly credentials?: readonly Credential[]
  readonly flags?: readonly string[]
  readonly roomsVisited?: readonly EraId[]
  /** Ids of physical doors (the portal that declares the leaf). */
  readonly doorsReleased?: readonly string[]
  /** At least one of these holds; every other requirement still must. */
  readonly anyOf?: readonly ProgressCondition[]
}

export type UnlockEffect =
  | /* the four of today */
  | { readonly kind: 'set-flag'; readonly flag: string }

/** A consequence: when the save answers `when`, the effects happen, once. */
export type Trigger = {
  readonly id: string
  readonly when: ProgressCondition
  readonly effects: readonly UnlockEffect[]
}

// every variant of Lock:  + readonly onOpen?: readonly UnlockEffect[]
// MuseumContent:          + readonly triggers?: readonly Trigger[]
```

Classes de condição (R2), usadas por `gate-uses-negative-condition` e `gate-uses-all-condition`:
**positivas** `powered`, `locksOpened`, `documentsRead`, `carried`, `catalogued`, `hotspotsSeen`,
`credentials`, `flags`, `roomsVisited`, `doorsReleased` e `anyOf` de positivas; **negativas**
`unpowered`, `locksClosed`, `documentsUnread`; **«todos»** `allRoomsPowered`, `allCatalogued`.
Guarda (o `when` de um gatilho) só aceita as positivas. `socketsFilled`, `threadsClosed`,
`threadsClosedAtLeast` e `locksSeen` como condição entram com o estado e o consumidor deles (L11,
L17, L3).

### 3.4 O registro de regras (`src/state/progressRules.ts`, novo) e os gatilhos (`src/engine/triggers.ts`, novo)

```ts
// state/progressRules.ts — no runtime import at all.
/**
 * What the content knows and the store must not import. Built from the museum
 * behind the button and handed over once (`engine/contentRegistry.ts`).
 */
export type ProgressRules = {
  /** Every due trigger, run to the fixed point. Its own argument when nothing fired. */
  readonly settle: (progress: Progress) => Progress
}
export function registerProgressRules(rules: ProgressRules): void
export function progressRules(): ProgressRules | null
export function onProgressRulesRegistered(listener: () => void): () => void

// engine/triggers.ts — pure.
export const TRIGGER_PASS_LIMIT = 64
/** `content.triggers`, plus `exhibit:<id>:catalogued` for every `unlocks` and `lock:<id>:opened` for every `onOpen`. */
export function compileTriggers(content: TriggerContent): readonly Trigger[]
/** Not fired yet and `when` holds, in authored order. */
export function dueTriggers(triggers: readonly Trigger[], progress: Progress, content: ConditionContent): readonly Trigger[]
/** One effect, as a grant: list-growing, so applying it twice is applying it once. */
export function effectGrant(effect: UnlockEffect, content: TriggerContent): ProgressGrant
export function settleTriggers(
  progress: Progress,
  triggers: readonly Trigger[],
  content: TriggerContent,
  limit?: number,
): { readonly progress: Progress; readonly fired: readonly string[]; readonly exhausted: boolean }

// engine/contentRegistry.ts — imports the museum; imported for its effect by MuseumCanvas.tsx.
export function progressRulesFor(content: TriggerContent): ProgressRules
registerProgressRules(progressRulesFor(MUSEUM))
```

`TriggerContent` é `Pick<MuseumContent, 'rooms' | 'exhibits' | 'documents' | 'locks' | 'triggers'>`:
o que os gatilhos, as condições e os efeitos leem, e o que uma suíte precisa montar para registrar
uma casa feita para o teste.

`effectGrant`: `grant-credential` → `credentials`; `open-lock` → `locksOpened` e `locksSeen`;
`power-room` → `roomsPowered`; `reveal-document` → `documentsRead` e o `factsKnown` que o documento
revela; `set-flag` → `flags`.

### 3.5 Os verbos (`src/engine/progressGrants.ts`, novo) e as trancas (`src/engine/lockRules.ts`, novo)

```ts
// progressGrants.ts — pure; what each verb of the player records.
/** The detail, the fact it reveals and, with every required detail seen, the catalogue entry. */
export function hotspotGrant(exhibit: ExhibitData, hotspotId: string, hotspotsSeen: readonly string[]): ProgressGrant
/** Every document in the container, and the facts they reveal. */
export function containerGrant(content: Pick<MuseumContent, 'documents'>, containerId: string): ProgressGrant
/** A one-way door opened from its own side stays unlatched; null when there is nothing to record. (F3) */
export function doorGrant(door: TransitionDoorSpec, currentRoom: string, released: readonly string[]): ProgressGrant | null

// lockRules.ts — pure.
export type LockPanelKind = 'keypad'
export type LockAttempt = { readonly kind: 'touch' } | { readonly kind: 'code'; readonly entry: string }
export type LockOutcome =
  | { readonly outcome: 'open' }
  | { readonly outcome: 'ask'; readonly panel: LockPanelKind; readonly grant: ProgressGrant }
  | { readonly outcome: 'opened'; readonly grant: ProgressGrant }
  | {
      readonly outcome: 'refused'
      readonly reason: 'wrong-code' | 'missing-credential' | 'unsupported'
      /** Credential keys still missing, `kind:id`. */
      readonly missing?: readonly string[]
      readonly grant: ProgressGrant
    }

export function lockStatus(lockId: string, progress: Pick<Progress, 'locksOpened'>): 'open' | 'closed'
/** The panel this lot has for a kind of lock; null is "no modal, ever". */
export function lockPanel(lock: Lock): LockPanelKind | null
export function attemptLock(
  lock: Lock,
  facts: readonly Fact[],
  progress: Pick<Progress, 'locksOpened' | 'credentials'>,
  attempt: LockAttempt,
): LockOutcome
/** Touched and still shut, in content order: what the plan lists. */
export function pendingLocks(locks: readonly Lock[], progress: Pick<Progress, 'locksOpened' | 'locksSeen'>): readonly Lock[]
```

Tabela de `attemptLock` (toda saída que não é `open` concede `locksSeen: [lock.id]`):

| Tranca | `touch` | `code` |
|---|---|---|
| já aberta | `open` | `open` |
| `knowledge` | `ask`, painel `keypad` | igual a `fact.value` → `opened` (`locksOpened`); senão `refused: 'wrong-code'` |
| `badge`, `medallion-plinth`, `tool` com `consumesTool: false` | todas as credenciais → `opened`; senão `refused: 'missing-credential'` com `missing` | como `touch` |
| `tool` com `consumesTool: true`; `ritual` | `refused: 'unsupported'` (DL2-11) | idem |

### 3.6 Portas (`src/engine/transitionDoorTopology.ts`)

```ts
/** Whether this side may operate the door: its own side always, the other once released. */
export function canOpenTransitionDoor(door: TransitionDoorSpec, currentRoom: string, released: readonly string[]): boolean
export function transitionDoorBlock(
  door: TransitionDoorSpec,
  currentRoom: string,
  isPowered: (roomId: string) => boolean,
  released: readonly string[],
): 'other-side' | 'unpowered' | null
```

O quarto parâmetro é **obrigatório**: um valor padrão devolveria o comportamento antigo a quem
esquecesse de passá-lo, e o compilador não diria nada.

### 3.7 A planta (`src/ui/mapModel.ts`, novo)

```ts
export type MapRoomState = 'unpowered' | 'partial' | 'complete'

/** Pattern AND colour: no two states share either. */
export const MAP_STATE_STYLE: Record<MapRoomState, { readonly pattern: 'dashed' | 'hatched' | 'solid'; readonly colour: string }>

export type MapModel = {
  readonly width: number
  readonly height: number
  /** Visited rooms only. */
  readonly rooms: readonly {
    readonly id: string
    readonly titleKey: string
    readonly x: number; readonly y: number; readonly width: number; readonly height: number
    readonly state: MapRoomState
    readonly current: boolean
    /** Pieces of this room not yet catalogued, where they stand. */
    readonly pips: readonly { readonly id: string; readonly x: number; readonly y: number }[]
  }[]
  /** One per physical opening with a visited side; a one-way door only once released. */
  readonly doors: readonly {
    /** For React only (`door:<n>`): a portal's id would name the room beyond. */
    readonly key: string
    readonly gap: MapSegment
    /** How deep the gap is painted: one wall line, or both rooms'. (F3) */
    readonly depth: number
    readonly jambs: readonly [MapSegment, MapSegment]
    /** The neighbour has not been visited: a short stub outwards, marked "?". */
    readonly stub: { readonly line: MapSegment; readonly x: number; readonly y: number } | null
  }[]
  /** Touched and still shut. */
  readonly locks: readonly { readonly id: string; readonly labelKey: string }[]
  /** Degrees clockwise from north, for an SVG `rotate`. */
  readonly player: { readonly x: number; readonly y: number; readonly headingDegrees: number }
  readonly north: { readonly x: number; readonly y: number }
}

export function mapModel(
  content: Pick<MuseumContent, 'rooms' | 'exhibits' | 'locks'>,
  progress: Pick<Progress, 'roomsVisited' | 'roomsPowered' | 'catalogued' | 'documentsRead' | 'locksOpened' | 'locksSeen' | 'doorsReleased'>,
  player: { readonly x: number; readonly z: number; readonly yaw: number; readonly room: string },
): MapModel
```

Norte é −Z (`museum.ts:13`) e o SVG tem y = z do mundo, então o norte fica para cima. O yaw 0 olha
para −Z; `headingDegrees = -yaw × 180 / π` (yaw π/2 olha para −X, oeste: −90°), trazido para
[−180°, 180°], porque o yaw da câmera nunca é normalizado.

O módulo exporta ainda `mapFrame(rooms)` (a moldura e `toX`/`toY`, que a suíte usa para dizer onde
cada coisa tem de estar), `headingDegrees(yaw)`, `MAP_STATE_LABEL` (a chave de legenda de cada
estado) e `MAP_STATES` (a ordem da legenda).

### 3.8 Fatos e lint (`schema.ts`, F5)

```ts
/** A count or a measure that is a lock's answer, and how it must not be said. */
export type ForbiddenPattern = {
  /** The numeral as it may be written, in any language: '14', 'catorze', 'fourteen'. */
  readonly forms: readonly string[]
  /** Word stems that give it its meaning: 'federaç', 'fundador', 'federation'. */
  readonly near: readonly string[]
}

// Fact:
//   + printedIn?: readonly string[]      keys allowed to print the code; required when usedAsCode
//   + exception?: 'tutorial' | 'counted' | 'geometry'
//   + forbiddenPatterns?: readonly ForbiddenPattern[]   required with 'counted' and 'geometry'
```

Em L2 só `springfield-renaming` usa: `printedIn: ['hotspot.portrait-morgan.date.label',
'document.halstead.title']`, `exception: 'tutorial'`. Nenhum fato contado existe antes de L18; a
regra `counted-pattern` é provada com fatos feitos para o teste.

### 3.9 O instantâneo (`docs/releases/L2.graph.json`, gerado)

```ts
type GraphSnapshot = {
  readonly lot: number
  /** Every action of `simulateProgress`: what it asks and what it gives, as atoms of plan §2.4. */
  readonly actions: readonly { readonly id: string; readonly requires: readonly string[]; readonly grants: readonly string[] }[]
  /** Checklist items, with "all rooms" and "all catalogued" resolved to this lot's ids (DL2-17). */
  readonly checklist: readonly { readonly id: string; readonly doneWhen: readonly string[] | null }[]
  readonly terms: readonly { readonly id: string; readonly when: readonly string[] }[]
  /** Every id a save can hold, by collection. */
  readonly ids: Readonly<Record<'rooms' | 'exhibits' | 'hotspots' | 'documents' | 'locks' | 'doors' | 'facts' | 'radioCalls' | 'devices' | 'triggers', readonly string[]>>
  /** The save's field table: name and kind of every field this lot knows. */
  readonly saveFields: Readonly<Record<string, 'list' | 'number' | 'record' | 'string'>>
}
```

Tudo ordenado; gerar de novo sem mudança não altera um byte.

## 4. Tarefas

Formato: **hoje** (arquivo:linha), **mudança**, **teste** (o que prova) e **vermelho hoje** (como o
teste reprova o estado atual antes do conserto, §9.1 passo 2).

### T1 — A tabela de campos e o campo que este build não conhece (M2; S12, S30; EN-A20) · F1

**Hoje.**

- `src/state/store.ts:57-85` (`Progress`), `:164-180` (`EMPTY_PROGRESS`), `:183-200`
  (`emptyProgress`), `:204-216` (`LIST_FIELDS`), `:231-281` (`migrateProgress`), `:289-302`
  (`hasSavedProgress`): um campo novo é escrito em cinco lugares, e esquecer um deles o apaga na
  carga sem erro nenhum.
- `store.ts:236-248`: o save é **reconstruído** só com os campos que este build conhece. O que
  outro build gravou a mais some na primeira escrita.
- `store.ts:28-33`: o comentário de `SAVE_VERSION` manda subir a versão «quando a forma mudar»; com
  `:234`, isso apaga o save de todo jogador.

**Mudança.**

1. `src/state/progressFields.ts` (novo, 3.1): tipo, tabela, `emptyProgress`, `sanitiseProgress`,
   `grantProgress`, `stringList`, `sanitiseRadioMemory`, `FRESH_RADIO_MEMORY`. Importa só
   `SPAWN` e `CONTENT_LOT`. Em F1 a tabela tem os campos de hoje e `contentLot`.
2. `store.ts`: saem `Progress`, `RadioMemory`, `EMPTY_PROGRESS`, `emptyProgress`, `LIST_FIELDS`,
   `stringList`, `sanitiseRadioMemory` e `migrateProgress`; entram os reexportes (3.2).
   `hasSavedProgress` passa a ler a coluna `counts` (mais a regra de `roomsVisited`). O comentário
   de `SAVE_VERSION` é reescrito: nunca sobe.
3. `sanitiseRadioMemory` mantém os subcampos que não conhece de uma entrada válida.

**Teste.** `npm run test:save` (novo, `scripts/test-save.ts`), sobre o store real carregado como o
navegador carrega (o molde de `scripts/test-qa-save.ts:30-76`):

- «todo campo da tabela faz ida e volta»: um valor de amostra por campo, declarado no teste com
  `satisfies Record<keyof typeof PROGRESS_FIELDS, unknown>` (campo sem amostra não compila);
  serializa, carrega, compara; e o save vazio também;
- «todo sanitizador devolve o padrão para lixo e nunca lança»: `null`, número, string, lista
  mista, objeto aninhado, `NaN`, para cada campo;
- «um campo que este build não conhece atravessa carga, toda ação que grava e escrita»: um save com
  `termsSigned: ['termo-posse']` e `socketsFilled: ['curator']`; depois de cada ação do store que
  toca o `progress`, os dois continuam lá; «Novo jogo» os apaga;
- «uma chave `__proto__` no save é dado, não protótipo»;
- «`hasSavedProgress` é a tabela»: a tabela-verdade de `scripts/test-opening-flow.ts:753-761`
  continua valendo, e todo campo com `counts` basta sozinho;
- «`SAVE_VERSION` é 1», com a razão na mensagem; «um save de outra versão é um jogo novo» (DL2-5);
- «o store e o que ele importa de forma estática não chegam ao conteúdo»: caminhando os `import`
  de `src/state/store.ts` (sem os `import type`), só aparecem `zustand`, `content/legacySave.ts`,
  `content/spawn.ts`, `content/contentLot.ts`, `state/progressFields.ts`,
  `state/saveMigrations.ts` e `state/progressRules.ts` (este entra na lista do teste em F2, junto
  com o arquivo: a lista é exata, e módulo novo no caminho do título entra nela de propósito);
- «um save deste lote lido pelo código de L1 não perde nada que L1 conhece»: cada campo da tabela
  com a sua amostra, gravado pelo store, lido por `scripts/lib/frozen/sanitiseProgress.L1.ts` (a
  cópia literal de `migrateProgress` e dos seus auxiliares em `f0fb5a3`, com as três constantes
  embutidas e o hash do arquivo preso no teste): todo campo que L1 conhece sai igual.

**Vermelho hoje.** O terceiro caso reprova (`termsSigned` some em `store.ts:236`). O primeiro e o
quinto não importam (não há tabela). O último nasce verde, porque prende o futuro; prova-se por
mutação: mudar o tipo de `clockSeconds` na tabela o reprova.

### T2 — `progress.contentLot`, migradores e aliases (M2; S30) · F1

**Hoje.** Não existe. `store.ts:250-279` é a única migração e vive dentro de `migrateProgress`;
`src/content/knownDebt.ts:49` guarda `CONTENT_LOT`, que só o portão pode importar
(`scripts/test-facts.ts:737-748`).

**Mudança.**

1. `src/content/contentLot.ts` (novo, sem importações): `export const CONTENT_LOT = 1` com o
   comentário de `knownDebt.ts:45-48`; `knownDebt.ts` passa a `export { CONTENT_LOT } from
   './contentLot.ts'`. `scripts/test-docs.ts:480` cita o arquivo novo na mensagem.
2. `src/state/saveMigrations.ts` (novo, 3.2): `migrateProgress` na ordem porteira de versão →
   tabela → migradores com `savedLot ≤ lot` → aliases → carimbo. A migração de abertura entra como
   `{ lot: 1 }`, palavra por palavra, recebendo o `raw` (ela pergunta `'radioCalls' in saved` e
   `stringList(saved.hintsShown) === null`, que são perguntas sobre o save cru).
3. `src/content/legacySave.ts`: `SaveAlias` e `SAVE_ALIASES = []`. `validate.ts`
   (`validateOpening`, junto de `:1083-1109`): `legacy-save-alias`, quando o `to` de um alias não
   é id do conteúdo no campo que ele nomeia. A checagem é `validateSaveAliases(content, aliases)`,
   exportada para o teste poder passar uma lista feita para ele; os ids de cada lista do save saem
   de `saveIdsByField`, tipada por `ListField` (lista nova no save sem linha ali não compila).
   `hintsShown` não tem ids no conteúdo (as lições são do HUD): alias nesse campo é recusado.

**Teste.** `test:save`:

- «save sem `contentLot` é produção de hoje»: carrega como lote 1 e sai carimbado com `CONTENT_LOT`;
- «aba velha não rebaixa»: um save com `contentLot: 7` carregado, mexido e regravado continua 7.
  (Isto só prova a aba que **carrega depois** da escrita mais nova. A aba que já estava aberta
  quando a outra gravou não estava coberta, e sobrescrevia: é o achado maior da revisão, com os
  casos de duas abas sobre o mesmo storage em §14, «Revisão adversarial»);
- «`contentLot` com lixo vale como ausente»: `'x'`, `-3`, `2.5`, `null`;
- «o migrador do lote N roda para save com `contentLot ≤ N` e não roda acima», com uma lista feita
  para o teste; «todo migrador é idempotente e só acrescenta»: rodar duas vezes é rodar uma, e
  nenhuma lista encolhe (inclusive os reais, sobre cada fixture);
- «um alias acrescenta o id novo e mantém o velho», com uma lista feita para o teste;
- os casos de 5 (antes e depois), um a um.

`test:qa-save`, `test:opening-flow` e `test:radio` continuam verdes sem mudança: provam que a
migração de abertura não mudou de comportamento ao mudar de arquivo.

**Vermelho hoje.** «Aba velha não rebaixa»: `contentLot` não sobrevive à carga.

### T3 — O que L1 deixou: o corpus de L1 e as capturas congeladas (HANDOFF §10.10) · F1

**Hoje.** `src/content/saveFixtures.ts` tem os cinco saves de produção; nenhum de L1.
`scripts/lib/captureManifest.mjs:113-152`: `l1` e `l1-review` com `frozen: false`, o segundo com
`commit: '047f3bb+'`. `scripts/test-capture-manifest.ts:184` prende `frozen === false`.

**Mudança.**

1. **Antes de editar qualquer arquivo de `src/`** (DL2-18): reiniciar o servidor `museum-dev`,
   abrir `http://localhost:5201/` com o save limpo e jogar a rota de L1 até o fim (luminária,
   caderno, rádio, quadro do saguão, quadro da Ala 1, saída pelo atalho, o retrato do Morgan
   inclinado, a gaveta com o ano); ler `localStorage.getItem('volleyball-museum:v1')` e gravar o
   objeto, como está, em `saveFixtures.ts` sob `'l1-route-end'`, com `from: 'l1-f0fb5a3'` e o
   comentário dizendo a versão Cloudflare (`1d3a4554`) e que foi escrito pelo servidor de
   desenvolvimento sobre a árvore publicada. Se o navegador não puder ser dirigido, **não se
   inventa o save**: registra-se a segunda saída de HANDOFF §10.10 (L1 não muda o que um save
   guarda; L2 parte de `production-drawer-open`) e a fatia devolve o item como não feito.
2. `scripts/test-qa-save.ts:142-161`: a lista de saves que nunca saem ganha `l1-route-end`.
3. `captureManifest.mjs`: `l1` com `frozen: true` e `digest:
   'af2dd6fea65c18c090fd0f7369f2274f6eb8cd7d8ac15807211b2c268067d063'`; `l1-review` com `commit:
   '513ec09'`, `frozen: true` e `digest:
   'f29cbd37e1cd571df6cf99d012daefd12bd428969b7f2e6d1d432116fe170394'` [medido: são os `digest`
   dos dois `manifest.json` de hoje]; os dois comentários deixam de dizer «not frozen yet».
   `npm run captures:manifest` reescreve os dois manifestos (só o cabeçalho muda).
4. `test-capture-manifest.ts:183-185`: o conjunto da revisão é congelado e nomeia `513ec09`.

**Teste.** `test:qa-save` (o save novo passa pelas mesmas checagens dos outros: carrega sem perder
nada, só cita ids que existem, é um estado alcançável) e `test:captures` (conjunto congelado bate
com o digest; conjunto congelado não tem `+`).

**Vermelho hoje.** `test:qa-save`: a lista pede um save que não existe. `test:captures`: com
`frozen: true` e o `+` no commit, reprova «a frozen set never carries the plus».

### T4 — Condições v2 e efeitos (M5) · F2

**Hoje.** `src/content/schema.ts:289-310` (nove campos); `src/engine/progressCondition.ts:14-21`
(`ConditionProgress`) e `:34-83`; `schema.ts:212-216` (quatro efeitos);
`src/content/validate.ts:951-971` (`checkCondition` conhece só os campos de hoje).

**Mudança.** `schema.ts` como em 3.3. `progressCondition.ts`: `ConditionProgress` ganha
`hotspots`, `credentials`, `flags`, `roomsVisited` e `doorsReleased`, todos opcionais como
`devicesCarried` (quem pergunta sem eles recebe «não»); `progressConditionMet` responde aos campos
novos e a `anyOf`; exporta `conditionClass(condition): 'positive' | 'negative' | 'all'` (a pior
classe que aparece, olhando dentro de `anyOf`). `validate.ts`: `checkCondition` confere cada id
novo (`condition-exhibit-missing`, `condition-hotspot-missing`, `condition-door-missing`,
`condition-credential-missing`), desce em `anyOf` e passa a ser chamada também para
`content.triggers`.

**Teste.** `test:triggers` (T5), bloco de condições: cada campo novo, sozinho e combinado; `anyOf`
vazio nunca vale; um campo que o save não tem responde «não»; `conditionClass`. `test:opening`:
conteúdo quebrado de propósito levanta cada código novo.

**Vermelho hoje.** Uma condição `{ catalogued: ['ball-spalding'] }` vale para um save vazio: o
avaliador ignora o campo que não conhece. É o caso do teste.

### T5 — Gatilhos de disparo único e o store sem conteúdo (M5; S11; EN-A21; CN16) · F2

**Hoje.**

- `src/engine/Interaction.tsx:363-397`: a cada detalhe novo, com os obrigatórios completos, grava
  o catálogo e **reaplica** `exhibit.unlocks` (`:395`). Achar depois um detalhe opcional dispara
  tudo outra vez. Hoje é inofensivo (nenhum conteúdo usa `unlocks`, e os efeitos são idempotentes);
  deixa de ser com consumo, toast e chamada.
- O executor vive num `useFrame`: nenhum teste em Node o alcança. `store.ts:851-867`
  (`applyUnlockEffect`) faz um `set` por efeito.
- `store.ts:629-632` (`mutateProgress`), `:636-646` (`endRadio`), `:660-668` (`start`),
  `:673-687` (`setCurrentRoom`) e `:868-873` (`resetProgress`) escrevem o `progress` por cinco
  caminhos.

**Mudança.**

1. `src/state/progressRules.ts`, `src/engine/triggers.ts`, `src/engine/contentRegistry.ts`,
   `src/engine/progressGrants.ts` (3.4, 3.5). `src/scenes/MuseumCanvas.tsx` ganha
   `import '../engine/contentRegistry'`.
2. `store.ts`: um caminho só, `commitProgress(update, session?)`: aplica `update`, passa por
   `settle` (o das regras registradas, ou identidade), e só faz `set` e `persist` se o objeto
   mudou; `session` leva junto o que tem de sair na mesma notificação (`previousRoom` e
   `currentRoom` em `setCurrentRoom`; `radio` e `radioHungUpUntil` em `endRadio`). Os cinco
   caminhos de hoje passam por ele.
3. `store.ts`: ação nova `grant(grant: ProgressGrant)`. `applyUnlockEffect` sai: o efeito tem
   uma implementação só, `effectGrant`, e quem o aplica é `settleTriggers`
   (`scripts/test-power.ts:99-118` passa a provar os quatro efeitos por
   `grant(effectGrant(…))`). As ações `record*`, `powerRoom`, `openLock` e `grantCredential`
   ficam, sobre `commitProgress`, porque as suítes as usam.
4. A passada «na carga»: o store assina `onProgressRulesRegistered` e, quando o conteúdo se
   registra, faz `commitProgress((progress) => progress)`; um store criado **depois** do registro
   (recarga a quente; o robô) assenta o `progress` inicial na criação.
5. `Interaction.tsx:375-397`: no lugar das três gravações e do laço de efeitos, uma chamada:
   `state.grant(hotspotGrant(exhibit, hotspot.id, state.progress.hotspots))`.
6. Tabela: `flags` e `triggersFired`. `validate.ts` (`validateTriggers`, sobre a lista compilada):
   `trigger-duplicate`, `effect-target-missing`, `gate-uses-negative-condition` e
   `gate-uses-all-condition` sobre o `when` de todo gatilho. `effect-target-missing` confere os
   três efeitos que nomeiam conteúdo (`open-lock`, `power-room`, `reveal-document`) e substitui os
   três códigos que `validateReferences` tinha só para `exhibit.unlocks`. `set-flag` não tem alvo.
   **`grant-credential` também não, neste lote**: a credencial é um membro das uniões do schema
   (o compilador confere o id) e só vira dado com registro em L3 (M7a); a chave que ninguém pede é
   `credential-orphan`, e a que ninguém dá é `credential-unobtainable`, os dois de T10.
7. `scripts/lib/runtimeWiring.ts`: `progressWiringProblems(read, components)` — `components` é a
   lista de todo `.tsx` de `src/`, porque duas das regras são sobre o que **nenhum** componente
   pode fazer. `Interaction.tsx` chama `.grant(hotspotGrant(` e não contém `applyUnlockEffect`,
   `recordHotspot(`, `recordCatalogued(` nem `recordFact(`; `MuseumCanvas.tsx` importa
   `contentRegistry`; `state/store.ts` não importa nada de `content/museum` nem de `engine/`, nem
   com `import()`, e sai do registro quando o Vite o troca (`forgetRules()` no `dispose`).

**Teste.** `npm run test:triggers` (novo, `scripts/test-triggers.ts`), com conteúdo feito para o
teste registrado por `progressRulesFor`, sobre o store real:

- «dispara uma vez»: a ação que torna o `when` verdadeiro dispara; a seguinte, não; o id entra uma
  vez em `triggersFired`;
- «um detalhe opcional achado depois não repete o efeito» (S11), por `hotspotGrant` e `grant`;
- «a cadeia fecha num `commit` só»: credencial → tranca → flag, uma notificação do store;
- «a ordem não importa»: 200 ordens sorteadas das mesmas ações chegam ao mesmo conjunto de átomos;
- «recarga no meio»: serializa, carrega num store novo, continua, e o fim é o mesmo;
- «o save que já cumpria a condição dispara quando o conteúdo se registra» (R3): é o trilho da
  chave de L3 (a gaveta já aberta que passa a conceder);
- «limite do ponto fixo»: mais gatilhos encadeados que `TRIGGER_PASS_LIMIT` devolvem
  `exhausted: true`, e o resto dispara no `commit` seguinte;
- «efeito aplicado duas vezes é efeito aplicado uma; nenhuma lista encolhe» (V1), sobre sequências
  sorteadas;
- «toda ação do store que grava assenta»: depois de cada uma (`start`, `setCurrentRoom`, o fim de
  uma chamada de rádio, `grant`, cada `record*`, `powerRoom`, `openLock`, `resetProgress`),
  `dueTriggers` é vazio;
- «sem regras registradas nada quebra» (a tela de título), e «uma concessão que não acrescenta nada
  não notifica ninguém»;
- «um id de gatilho que o conteúdo não conhece fica em `triggersFired`» (save de lote mais novo);
- a fiação (item 7), provada aplicando em memória o refactor que ela existe para pegar.

`test:opening` ganha os códigos novos contra conteúdo quebrado de propósito.

**Vermelho hoje.** Com `hotspotGrant` extraído nos valores de hoje (devolve os efeitos sempre que
os obrigatórios estão completos), «um detalhe opcional achado depois não repete» reprova; a fiação
reprova (`Interaction.tsx:395` chama `applyUnlockEffect`).

### T6 — `attemptLock` como único caminho e `progress.locksSeen` (M6a; S1; EN-A1; EN-A6, H-33) · F2

**Hoje.**

- `src/engine/Containers.tsx:265-269`: container com tranca fechada faz `setActiveLock`, qualquer
  que seja o tipo. `src/engine/PowerControls.tsx:244-250`: o mesmo para `powerLockId`.
  `src/ui/LockPanel.tsx:107`: devolve `null` para o que não é `knowledge`. Resultado: um modal sem
  nada desenhado, com o ponteiro solto e o mundo surdo ao `E`.
- `LockPanel.tsx:112-125` compara a digitação, abre a tranca e grava os documentos, mas **não** os
  fatos que eles revelam; `Containers.tsx:271-275` grava os dois. Dois caminhos, dois resultados.
- `src/ui/MuseumMap.tsx:216-221`: a planta lista toda tranca fechada, tocada ou não.
- `src/ui/Hud.tsx:112`: o prompt decide «Trancado» com uma conta própria.

**Mudança.**

1. `src/engine/lockRules.ts` (3.5). Tabela: `locksSeen`. Migrador `{ lot: 2 }` (3.2).
2. `Containers.tsx:261-281`: tranca fechada → `attemptLock(lock, MUSEUM.facts, state.progress,
   { kind: 'touch' })`; concede o `grant`; `ask` solta o ponteiro e faz `setActiveLock`;
   `refused` toca `museumAudio.lockDenied()` e consome a tecla; `open` e `opened` seguem para o
   conteúdo. O conteúdo é `state.grant(containerGrant(MUSEUM, containerId))` e
   `setOpenedContainer`.
3. `PowerControls.tsx:241-252`: a mesma sequência antes de `powerRoom`.
4. `LockPanel.tsx:109-132`: `submit` chama `attemptLock(…, { kind: 'code', entry })`; `opened`
   concede, fecha o painel e abre o container pelo mesmo `containerGrant`; `refused` conta a
   tentativa como hoje.
5. `MuseumMap.tsx:216-234`: `LockList` lista `pendingLocks(MUSEUM.locks, progress)`. (T8 leva a
   lista para dentro de `mapModel`.)
6. `Hud.tsx:112`: `lockStatus(container.lockId, progress) === 'closed'`.
7. `runtimeWiring.ts` (a mesma `progressWiringProblems`): `Containers.tsx`, `PowerControls.tsx` e
   `LockPanel.tsx` chamam `attemptLock(`; `setActiveLock(` com valor só aparece depois de
   `outcome === 'ask'`; nenhum componente chama `openLock(` nem lê `locksOpened.includes(`;
   `Containers.tsx` e `LockPanel.tsx` gravam por `.grant(containerGrant(`; o ramo `refused` do
   armário e do quadro toca `museumAudio.lockDenied()`; `MuseumMap.tsx` lista `pendingLocks(` e
   `Hud.tsx` pergunta a `lockStatus(`.

**Teste.** `npm run test:locks` (novo, `scripts/test-locks.ts`), v1:

- a tabela de 3.5, linha por linha, com trancas feitas para o teste e a real (`office-drawer`);
- «nenhum tipo de tranca sem painel devolve `ask`» (S1), para todo tipo do schema;
- «tocar grava que foi vista; abrir grava as duas listas»; `locksOpened ⊆ locksSeen` depois de
  qualquer sequência sorteada de tentativas e efeitos;
- «código de tamanho errado ou errado não abre nem custa nada» (V4: sem limite de tentativas);
- «a planta lista a tranca tocada e fechada, e só ela»: `pendingLocks`;
- «abrir pelo teclado grava o mesmo que abrir a gaveta já destrancada»: documentos **e** fatos;
- «`Lock.onOpen` vira gatilho»: dispara ao abrir e, num save que já tinha a tranca aberta, quando
  o conteúdo se registra;
- os saves do corpus: cada um carrega com `locksSeen` igual ao seu `locksOpened`, que é
  `['office-drawer']` em `production-drawer-open` e em `l1-route-end` (o save de L1 termina com a
  gaveta aberta; ele entrou no corpus em F1, depois de este plano ser escrito) e a lista vazia nos
  outros quatro;
- a fiação (item 7), por mutação.

**Vermelho hoje.** Com a regra extraída nos valores de hoje (toda tranca fechada abre modal),
«nenhum tipo sem painel devolve `ask`» reprova para `badge`, `tool`, `medallion-plinth` e
`ritual`; `pendingLocks` com a regra de hoje lista a gaveta nunca tocada.

### T7 — O atalho que fica aberto (ÁT-G1, H-29, CN17, P25; I-15) · F3

**Hoje.**

- `src/engine/transitionDoorTopology.ts:182-190` e `:200-208`: quem pode operar a porta é decisão
  só de topologia. Sair pelo atalho e virar-se: «Abre pelo outro lado», para sempre.
- `src/engine/TransitionDoors.tsx:359-366`: no bloqueio `other-side` o `E` não faz nada, nem som.
  `:371-376`, `:433` e `:593-599` são as três consultas.
- `src/ui/MobileControls.tsx:246-252`: o botão de Ação some diante da porta bloqueada pelo outro
  lado.
- `scripts/test-transition-door.ts:426-447` prende exatamente o defeito («a completed shortcut
  cycle does not make its one-way authorisation permanent»).

**Mudança.**

1. Tabela: `doorsReleased`. `transitionDoorTopology.ts` como em 3.6; `doorGrant` em
   `progressGrants.ts`.
2. `TransitionDoors.tsx`: as três consultas passam `museum.progress.doorsReleased`. No `interact`
   aceito (`:382`, antes de mexer no estado da folha):
   `const release = doorGrant(runtime.spec, museum.currentRoom, museum.progress.doorsReleased)`;
   se houver, `museum.grant(release)`. Em `:359-366`, todo bloqueio responde com
   `museumAudio.lockDenied()` e consome a tecla.
3. `src/ui/hudRules.ts`: `doorActionAvailable(focused)` (porta bloqueada também responde ao
   toque; abrindo ou armada, não); `MobileControls.tsx:246-252` passa a chamá-la.
4. `src/ui/Hud.tsx`: `DoorReleasedToast`, no molde de `PowerToast` (`:428-459`): quando
   `doorsReleased` cresce na sessão (`listGrew`), mostra «Atalho destrancado — <título da sala de
   `opensFrom`>» por 3,2 s e toca `museumAudio.lockRelease()`. Entra na pilha de `:735-740`.
5. `scripts/lib/museumWorld.ts:165-213`: `arrivals` não muda (a primeira chegada continua sendo
   pela porta principal); o comentário diz por quê.
6. `runtimeWiring.ts`: `TransitionDoors.tsx` chama `doorGrant(` e passa
   `museum.progress.doorsReleased` às duas funções em todo uso.

**Teste.**

- `test:transition-door`: «depois de liberada, o lado do saguão abre»; «antes, não»; «porta sem
  `opensFrom` não se libera»; «liberar é do lado certo: `doorGrant` do saguão é `null`»; «a
  máquina de estados da folha não guarda nada; quem guarda é o save» (o caso de `:426-447`
  reescrito); «o save antigo carrega com a lista vazia» e «a liberação sobrevive a serializar e
  carregar»; a fiação.
- `test:opening` (`scripts/test-opening.ts:260-266`): o atalho mantém a própria regra, agora nos
  dois estados.
- `test:mobile-controls`: `doorActionAvailable` nos cinco estados do prompt.
- `test:navigation`: a travessia `atrium → Holyoke (shortcut)` entra em `CROSSINGS`
  (`scripts/test-navigation.ts:325-366`), ao lado da que já existe no outro sentido.
- `test:opening-flow`: `listGrew` já cobre a regra do toast; uma asserção de fonte prende que o
  toast lê `doorsReleased`.

**Vermelho hoje.** `transitionDoorBlock(shortcut, 'atrium', everything,
['atrium-from-holyoke-shortcut'])` devolve `'other-side'` (a função ignora o quarto argumento).
Sobre o save, o que este plano dizia («`doorsReleased` não sobrevive à carga») deixou de ser
verdade com F1: um campo que a tabela não conhece atravessa a carga como veio. O que reprova sem a
linha da tabela é outra coisa, e é pior: o campo não é saneado (`doorsReleased: 'abc'` continua
`'abc'`), o save antigo carrega com `undefined` em vez de lista vazia, e conceder a liberação
lança. A travessia nova de `test:navigation` nasce verde (o vão é o mesmo nos dois sentidos, e o
mundo do teste não tem folha): guarda contra mobiliar a chegada.

### T8 — A planta sem spoiler, com seta e norte (ÁT-I1; ÁT-A5; EN-A6) · F3

**Hoje.** `src/ui/MuseumMap.tsx:103-158` desenha o contorno de toda sala (a não visitada,
tracejada); `:165-187`, toda porta, o atalho inclusive; `:189-191`, um círculo sem direção;
`:194-204`, uma legenda sem título (`map.legend` existe e ninguém a mostra: dívida
`i18n-key-unused`, `src/content/knownDebt.ts:93`). `map.state.partial` diz «Peças por catalogar»
do escritório, que não tem peça. O yaw do jogador não é publicado (`src/engine/playerPosition.ts`
tem só a posição).

**Mudança.**

1. `src/ui/mapModel.ts` (3.7), puro, com `portalOpening` de `mapGeometry.ts`. Regras: sala só
   visitada; porta só com um lado visitado, uma por vão; vizinha não visitada vira toco de 1,2 m
   para fora do vão com «?»; porta com `opensFrom` só depois de liberada, e aí porta comum;
   estados `unpowered` (visitada, sem luz), `partial` (acesa, falta peça ou documento), `complete`;
   trancas por `pendingLocks`; marcador com `headingDegrees`; rosa no canto superior direito.
2. `playerPosition.ts`: `export const playerHeading = { yaw: 0 }`, com o mesmo comentário da
   posição (fora do store de propósito). `src/engine/PlayerController.tsx:533`: grava
   `playerHeading.yaw = camera.rotation.y` junto da posição.
3. `MuseumMap.tsx`: só desenha o modelo. Marcador: triângulo com `rotate(headingDegrees)` e
   `aria-label` «Você está aqui»; rosa: seta e «N»; legenda com o título `map.legend` e os três
   estados por padrão e cor (`<pattern>` de hachura para `partial`, traço para `unpowered`, cheio
   para `complete`); toco com `<title>` «Sala ainda não visitada».
4. `src/styles/museum.css:1096-1200`: saem `.map-portal-oneway`, `.map-portal.is-oneway` e
   `.swatch.is-unvisited`; entram o toco, a seta, a rosa e as três amostras com padrão.
5. Textos de 6. `knownDebt.ts`: sai a linha de `map.legend`. `contentLot.ts`: `CONTENT_LOT = 2`.
6. `runtimeWiring.ts`: `MuseumMap.tsx` chama `mapModel(` e não lê `MUSEUM.locks.filter(` nem
   `portal.oneWay`; `PlayerController.tsx` grava `playerHeading.yaw`.

**Teste.** `npm run test:map` (novo, `scripts/test-map.ts`):

- «jogo novo: uma sala e um toco»; «saguão visitado: duas salas, a porta do escritório sem toco, a
  da Ala 1 com toco, o atalho ausente»; «três salas, atalho fechado: duas portas»; «atalho
  liberado: três portas, nenhuma diferente das outras»;
- «nada de sala não visitada aparece no modelo»: para os oito subconjuntos de salas visitadas, o
  JSON do modelo não contém o id, a chave de título nem a coordenada de canto de sala fora deles;
- os três estados, com o escritório (sem peça, com documento atrás da gaveta) e a Ala 1;
- «tranca: nunca tocada, ausente; tocada, pelo nome; aberta, some»;
- «o marcador recebe o yaw»: 0 → 0°, π/2 → −90°, −π/2 → 90°, π → ±180°; a posição é a de
  `toX`/`toY`; o norte fica acima do centro;
- «nenhum par de estados divide padrão ou cor» (`MAP_STATE_STYLE`);
- a fiação, por mutação.

`validate:content` deixa de acusar `map.legend`; `test:docs` aceita `CONTENT_LOT` um à frente do
plano.

**Vermelho hoje.** Com a regra de hoje posta no modelo (todas as salas, todas as portas, um vão por
portal), reprovam «uma sala e um toco», «o atalho ausente» e «nada de sala não visitada». «Nunca
tocada, ausente» já passa: F2 pagou essa regra quando a planta passou a listar `pendingLocks`.

### T9 — `examineReach` (M4a) · F4

**Hoje.** `src/engine/Interaction.tsx:166-169` (`HOLD_DISTANCE`, `HOTSPOT_DOT`) e `:364-383`: a
origem da peça vai a 0,42 m da câmera, e um detalhe conta quando o vetor origem→detalhe faz mais de
0,55 de cosseno com o vetor detalhe→câmera. Para um detalhe a ρ metros da origem (já com a escala
da peça), o cosseno é `(d·cos θ − ρ) / √(d² + ρ² − 2dρ·cos θ)`, com `d = 0,42`: acima de 0,42 m o
detalhe nunca acende.

[medido] com os dados de hoje:

| Peça | Detalhe | Obrigatório | ρ (m) | Meio-ângulo do cone |
|---|---|---|---:|---:|
| as quatro bolas do saguão | os oito | 4 de 8 | 0,103–0,107 | 44,4°–44,8° |
| `ball-improvised` | `valve` | sim | 0,099 | 45,3° |
| `ball-spalding` (escala 2,65) | `lacing` | sim | 0,375 | 8,5° |
| `ball-spalding` | `maker` | sim | 0,292 | 21,2° |
| `handbook-1897` | `innings` | sim | 0,064 | 49,3° |
| `guide-1916` | `credit` | sim | 0,041 | 51,9° |
| `portrait-morgan` | `date` | sim | 0,282 | 22,6° |
| `photo-gym` | `apparatus` | sim | 0,413 | **1,5°** |
| `gym-suit` | `knit` | sim | 1,206 | **0°** |
| `net-1897` | `tape` | sim | 1,980 | **0°** |

**Mudança.** `src/engine/examineReach.ts` (novo, puro): `EXAMINE_HOLD_DISTANCE = 0.42`,
`EXAMINE_HOTSPOT_DOT = 0.55`, `EXAMINE_MIN_CONE_DEGREES = 5` e
`examineReach(exhibit, hotspot): { reachable: boolean; coneDegrees: number }` (a revisão acrescentou
`shows`, cone maior que zero: é o único critério do componente; `reachable` é o da mão), pela forma
fechada acima. `Interaction.tsx:166-169` passa a importar as duas constantes (uma régua só);
`runtimeWiring.ts` prende a importação. (F4: o módulo exporta também `examineConeDegrees(ρ)`, a
conta sem a peça, que é o que o teste dos limites pergunta; `audit:examine-sim` lê as duas
constantes dali.)

**Teste.** `test:playthrough` (T11), bloco próprio: a tabela acima (cada cone a ±0,1°); «as três
que nenhum save honesto tem são as três que a régua reprova»: `net-1897`, `gym-suit`, `photo-gym`;
«toda peça catalogada num save de produção é alcançável pela régua» (o corpus contra a regra); o
limite: ρ = 0 dá 56,6°, ρ ≥ 0,42 dá 0°.

**Vermelho hoje.** O módulo não existe; o que reprova o conteúdo é T10 (`exhibit-uncataloguable`
nas três peças, que entram como dívida datada).

### T10 — `simulateProgress` no lugar de `validateSolvability` (M10; S3; EN-A3) · F4

**Hoje.** `src/content/validate.ts:538-771`: uma caminhada própria, que não usa nenhuma função do
runtime. Ignora a mão única («expressa pela ausência de portal recíproco», `:632-636`: os dois
lados declaram o portal, então o atalho é tratado como porta comum), dá toda peça como catalogável,
abre ritual ao alcançar a sala, só colhe credencial de `exhibit.unlocks` e só confere a fonte de
um código para tranca de portal (`:730-752`).

**Mudança.** `src/content/simulate.ts` (novo, só do portão; entra na lista de
`scripts/test-facts.ts:737-748`):

```ts
export type PlayerAction =
  | { readonly kind: 'power'; readonly roomId: string }
  | { readonly kind: 'door'; readonly doorId: string; readonly from: string; readonly to: string }
  | { readonly kind: 'hotspot'; readonly exhibitId: string; readonly hotspotId: string }
  | { readonly kind: 'container'; readonly containerId: string }
  | { readonly kind: 'code'; readonly lockId: string; readonly entry: string }
  | { readonly kind: 'take'; readonly deviceId: string }

/** What a player standing in `room` with this save can do that the rules allow. */
export function availableActions(content: MuseumContent, progress: Progress, room: string): readonly PlayerAction[]
/** The action, as the grant the runtime's own verbs give it. */
export function actionGrant(content: MuseumContent, progress: Progress, action: PlayerAction): ProgressGrant

export type SimulationResult = {
  readonly issues: readonly ValidationIssue[]
  /** Everything reachable, at the fixed point. */
  readonly final: Progress
  /** Atoms by the pass on which they first appear: the script in levels. */
  readonly levels: readonly (readonly string[])[]
  /** Every action met on the way, with what it asked and gave (the snapshot's source). */
  readonly actions: readonly { readonly id: string; readonly requires: readonly string[]; readonly grants: readonly string[] }[]
}
export function simulateProgress(content: MuseumContent, from?: Progress): SimulationResult
```

A jogadora exaustiva: em cada passada, de cada sala alcançável, toma toda ação disponível e assenta
os gatilhos, até nada mudar. Usa `transitionDoorBlock` (com `doorsReleased`), `isRoomPowered`,
`attemptLock`, `containerGrant`, `hotspotGrant` (só para detalhe com `examineReach().reachable`),
`doorGrant`, `progressConditionMet` e `settleTriggers`: as funções do jogo, não cópias. Um código
só é digitado com o fato conhecido (I-12).

**Como ficou (F4).** Três coisas que o texto acima não decidia:

- **O que é «disponível».** O que as regras **respondem**. Apertar o `E` numa gaveta trancada
  está na lista: o teclado sobe (ou a tranca zumbe) e a tranca fica vista (`locksSeen`). É daí
  que sai o «vista» do estado máximo, e é o que deixa o código errado do robô ser um aperto que
  não grava nada. O que as regras ignoram não está: porta barrada deste lado, interruptor de
  sala acesa, detalhe já visto, detalhe que mão nenhuma vira, caderno que já saiu da mesa, rádio
  sem carga. O `code` só é oferecido a quem já teve o teclado na frente (`locksSeen`) **e**
  conhece o fato.
- **O que a passada enxerga.** O que se pode fazer é decidido contra o save do começo da passada,
  das salas em que ela já podia estar; o que cada ação concede é perguntado ao save como ele
  está, com os gatilhos assentados depois de cada uma (como o store faz). Por isso uma passada é
  um nível do roteiro.
- **O que fica escrito de cada ação** (`ActionRecord`: id, o que pede, o que dá, em átomos de
  2.4). Além dos apertos (`power:`, `door:<porta>:<de>><para>`, `hotspot:`, `container:`,
  `code:`, `take:`), o aperto no hospedeiro de tranca fechada é `touch:<hospedeiro>` e duas
  consequências têm registro próprio: `catalogue:<peça>` (pede os detalhes obrigatórios e dá a
  ficha; à parte, porque qual detalhe completa a peça depende da ordem em que foram achados, e um
  registro não pode depender) e `trigger:<id>`. `simulateProgress().actions` são as que ela
  **encontrou**; `contentActions(content)` são todas as que o conteúdo **oferece**, alcançadas ou
  não, e é contra estas que o lote seguinte é comparado (T12). Os átomos novos em relação a 2.4:
  `detail:<peça>:<detalhe>`, `seen:<tranca>`, `carried:<aparelho>` e `fired:<gatilho>`; uma
  condição negativa vira `not(…)` e um `anyOf`, um átomo só, `any(a+b|c)`.

`credential-orphan` conta como uso a credencial que uma **condição** pede, não só a de uma
tranca. `flag-never-read` só olha condições: flag lida por código (a luz geral de L11) vai
precisar de uma condição que a nomeie, ou de uma lista aqui. `no-return-path` e `one-way-trap`:
com as regras de porta deste lote, a porta por onde se entra é sempre volta (empurrar libera),
então a primeira só acontece com vão declarado de um lado só; a segunda acusa a sala cujas
voltas são **todas** portas de mão única («uma aresta a mais, nunca a única»), mesmo que se
possa sair dela.

Erros em L2 (os demais códigos de 6.4 entram com a mecânica de cada um: termos, promessas datadas,
dicas, papéis de colocação, fios, consumo):

| Código | Acusa |
|---|---|
| `room-unreachable`, `lock-unopenable`, `document-unreadable`, `exhibit-uncataloguable` | conteúdo fora do ponto fixo |
| `credential-unobtainable`, `credential-orphan` (vira erro) | chave sem fonte, ou sem fechadura |
| `trigger-never-fires`, `flag-never-set`, `flag-never-read` | fiação solta |
| `no-return-path`, `one-way-trap` | V5, no primeiro estado em que cada sala fica alcançável |
| `lock-evidence-behind-lock` | a fonte de um código só alcançável com a tranca aberta, em qualquer hospedeiro (substitui `lock-source-behind-lock`) |
| `checklist-item-untickable` | item sem `doneWhen`, ou com condição fora do ponto fixo |
| `simulation-no-fixpoint` | não convergiu (substitui `solvability-no-fixpoint`) |
| `transition-door-invalid` (F4) | `buildTransitionDoorSpecs` lança para este conteúdo, e o runtime o chama ao subir. Dito uma vez; a simulação segue com todo vão livre, para uma porta ruim não acusar cada sala atrás dela |
| `no-start-room` | fica como era: a sala do spawn não existe |

`validate.ts:2061`: `validateContent` chama `simulateProgress(content).issues`;
`validateSolvability` sai. `scripts/validate-content.ts` imprime o roteiro em níveis depois da
linha do bake.

O roteiro de hoje **[medido em F4]**: `N0` luminária, caderno, a gaveta tocada · `N1` saguão,
rádio · `N2` luz do saguão, Ala 1, **as quatro bolas do saguão** · `N3` luz da Ala 1, o ano (no
retrato e no arquivo A), os outros três fatos, os três papéis dos arquivos, as cinco peças da ala,
o atalho liberado · `N4` gaveta, bilhete. A previsão punha as nove peças em `N3`; as do saguão
catalogam um nível antes, porque catalogar no escuro vale (D17). O estado máximo: três salas
acesas e visitadas, cinco documentos, quatro fatos, 9 de 12 peças, 17 dos 21 detalhes,
`office-drawer` aberta e vista, `atrium-from-holyoke-shortcut` liberada, o rádio levado, nenhuma
credencial.

**Teste.** `test:playthrough` (T11), bloco da simulação: o estado máximo acima, átomo por átomo; os
níveis; cada código contra conteúdo quebrado de propósito (a porta alimentada do outro lado de
`scripts/test-opening.ts:268-288` continua dando `room-unreachable`; uma ala cuja única volta é o
atalho dá `one-way-trap`; o fato da gaveta revelado só pelo documento da própria gaveta dá
`lock-evidence-behind-lock`; um gatilho com `when` impossível, `trigger-never-fires`). `test:opening`
troca a importação (`:35`, `:284-288`).

**Vermelho hoje.** Contra o conteúdo de hoje, `simulateProgress` acusa cinco coisas que
`validateSolvability` deixa passar: `exhibit-uncataloguable` em `net-1897`, `gym-suit` e
`photo-gym`, e `checklist-item-untickable` em `notebook.todo.catalogue` e `notebook.todo.vault`.
As cinco entram em `KNOWN_DEBT` no mesmo commit (7).

### T11 — O robô de partida (M10) · F4

**Hoje.** Nenhuma suíte joga o jogo. `test:opening-flow` e `test:radio` dirigem o store ação por
ação, na ordem que quem escreveu o teste escolheu.

**Mudança.** `scripts/test-playthrough.ts` e `scripts/lib/playthrough.ts` (novos): o robô lê
`availableActions` do `progress` do **store real**, sorteia uma (gerador com semente, `mulberry32`)
e a executa pelas ações do store (`grant(actionGrant(…))`, `powerRoom`, `setCurrentRoom`,
`carryDevice`), com o conteúdo registrado como o jogo registra (`contentRegistry.ts`). Entre as
úteis, sorteia inúteis: código errado, reler, religar, ir e voltar, lanterna, abrir e fechar o
caderno. Em passos sorteados serializa `{ settings, progress }`, grava sob a chave do save e
continua num store novo, carregado pelo caminho real (`import('../src/state/store.ts?run=N')`).

**Como ficou (F4).** O robô são duas coisas separadas de propósito. A **cabeça** pergunta à
simulação o que se pode fazer (`availableActions`) e sorteia. As **mãos** (`press`, em
`scripts/lib/playthrough.ts`) fazem no store o que cada componente faz quando o `E` é apertado,
linha por linha, com as regras puras que o componente chama (`attemptLock`, `containerGrant`,
`hotspotGrant`, `doorGrant`, as duas regras de porta, `deskRadioIntent`, `examineReach`), e
**não chamam `actionGrant`**: se chamassem, o item 7 compararia a simulação com ela mesma. Depois
de cada aperto, `pressProblem` confronta as duas: aperto oferecido tem de ter gravado exatamente
o que `actionGrant` disse (com os gatilhos assentados), e aperto não oferecido não pode ter
gravado nada. É isso que dá sentido ao «vermelho hoje»: com as três peças ainda em
`availableActions`, a cabeça manda girar a rede e a mão não acha o detalhe. A recarga é a do
próprio store: `pagehide` (ele grava o que tem), e um store novo lê o texto que ficou na chave
(`openGame`, de `scripts/lib/storePage.ts`).

**Teste.** `npm run test:playthrough`:

1. a rota canônica (a de 2.4: I-01, I-07, I-08, I-09, I-10, I-11a, I-15, I-12) é jogável nessa
   ordem, termina no caminho crítico (as três luzes, o ano, o atalho liberado, a gaveta aberta com
   o bilhete) e, seguida pelo robô, chega ao estado máximo de `simulateProgress(MUSEUM).final`.
   (O plano dizia que a rota **terminava** no estado máximo. Não termina: ela pula o caderno, o
   rádio e oito peças; em L2 não há termo para o fim da rota provar. Corrigido em F4.)
2. **500 sementes** de ordem embaralhada, com recargas, terminam no mesmo estado, comparado como
   conjuntos. A semente que reprovar é impressa; `npm run test:playthrough -- --seed <n>` a repete,
   com o registro da noite, **e depois joga as 500** (era `SEED=<n>` no ambiente e substituía a
   rodada: com a variável esquecida no shell, o `check` jogava uma noite e passava; revisão);
3. o perfil que **pula tudo** (nunca lê o caderno, nunca pega o rádio, nunca acende a lanterna)
   chega ao mesmo estado, menos os átomos que são os próprios passos pulados (`doc-welcome`, o
   rádio): nada do resto depende deles (V7);
4. o perfil que digita o ano sem ter lido (o atalho indevido de 1.4) só adianta a gaveta: o fim é
   o mesmo;
5. cada save do corpus é carregado e jogado até o ponto fixo: nenhum átomo do save se perde e o
   fim contém o estado máximo;
6. «o atalho abre do saguão depois da primeira saída e continua aberto depois de recarregar», como
   passo do robô;
7. o robô e a simulação concordam: nenhuma ação que o store aceitou está fora de
   `availableActions`, e o conjunto final é igual. (Com duas exceções declaradas, as duas
   conferidas contra o que as regras dão: o código certo digitado sem ter sido lido, e, desde a
   revisão, o detalhe de cone estreito que a vista grava e a simulação não oferece. Com ele o fim
   de uma noite é o estado máximo, ou o máximo mais `photo-gym`.)

**Vermelho hoje.** O item 6 (sem `doorsReleased`) e o item 5 com o save de produção de gaveta
aberta (sem `locksSeen`) reprovam contra a árvore de antes de F2 e F3; em F4 o que nasce vermelho é
a concordância com a simulação enquanto as três peças não estiverem fora de `availableActions`
(T9).

### T12 — `validateAdditive` e o primeiro instantâneo (M39; R1) · F4

**Hoje.** Nada compara o conteúdo de um lote com o do anterior. Trocar um id perde o progresso de
quem o tinha, em silêncio; endurecer uma guarda cria beco em save antigo.

**Mudança.**

1. `src/content/additive.ts` (novo, só do portão): `graphSnapshot(content, lot): GraphSnapshot`
   (3.9, a partir de `simulateProgress(content).actions`, do conteúdo e de `PROGRESS_FIELDS`) e
   `validateAdditive(previous: GraphSnapshot, content): ValidationIssue[]`.
2. `scripts/graph-snapshot.ts` e `npm run graph:snapshot`: grava
   `docs/releases/L<CONTENT_LOT>.graph.json`.
3. `scripts/validate-content.ts`: lê o instantâneo mais novo de `docs/releases/` e passa a
   `validateContent` (`extras.previousGraph`); reprova se o mais novo for de um lote anterior a
   `CONTENT_LOT − 1` (a regra de idade do `BROWSER_RECORD`). (Revisão: não é mais «o mais novo».
   É o **registro** mais novo, isto é, o de um lote que o conteúdo já deixou para trás, ou o do
   próprio lote depois de publicado; o rascunho do lote em andamento não segura nada, porque é o
   próprio conteúdo.)
4. Rodar `npm run graph:snapshot` no fim da fatia e commitar `docs/releases/L2.graph.json`. O
   fecho do lote o gera de novo, sobre o que for publicado. (Revisão: com «Feito em» no plano o
   script recusa; regravar pede `--reopen`, e o SHA-256 fixado em `scripts/lib/graphSnapshots.ts`
   muda no mesmo commit.)

| Código | Acusa |
|---|---|
| `node-removed` | uma ação do instantâneo que o conteúdo não tem mais |
| `guard-strengthened` | uma ação que passou a exigir um átomo a mais |
| `grant-removed` | uma ação que deixou de conceder um átomo |
| `id-renamed-without-alias` | um id que um save pode ter (qualquer coleção de `ids`) sumiu sem linha em `SAVE_ALIASES` |
| `term-condition-changed`, `checklist-condition-changed` | condição de termo ou de item de lista diferente da gravada |
| `save-field-changed` | um campo do save mudou de tipo ou saiu da tabela |

**Como ficou (F4).**

- `validateAdditive(previous, content, aliases = SAVE_ALIASES)`. As ações do instantâneo são
  procuradas em **tudo o que o conteúdo oferece** (`contentActions`), não só no que a jogadora
  dele ainda alcança: uma ação antiga atrás de uma exigência nova continua oferecida, e é
  exatamente o que tem de aparecer como `guard-strengthened` (senão viraria `node-removed`).
- **Os aliases valem na comparação.** Um save que tem o id velho tem o novo em toda carga
  (DL2-8); então o que uma ação concedia como `doc:velho` e concede como `doc:novo` não tirou
  nada, e `hotspot:peça-velha:verso` continua existindo sob o nome novo da peça. Sem isso, o
  renome do bilhete em L3 (`doc-predecessor` → `doc-otavio-handover`) acusaria `grant-removed`
  com o alias no lugar. Um id que some pede alias em **cada** lista que o guarda: sala em
  `roomsVisited` e `roomsPowered`, tranca em `locksOpened` e `locksSeen`.
- `ids.devices` tem, além do rádio que se leva, todo aparelho sob o qual o save guarda algo
  (`clockSeconds`, `radioMemory`): renomear o relógio zera a hora de quem volta. Alias não leva
  chave de registro; a mensagem diz que aí é migração.
- O arquivo é JSON com **uma ação por linha**, tudo ordenado; o diff de dois lotes mostra a ação
  que mudou e mais nada. Ler e escrever de novo dá o mesmo texto, e é assim que o teste sabe que
  o arquivo saiu do script.
- A leitura de `docs/releases` é `scripts/lib/graphSnapshots.ts` (`newestSnapshot`,
  `snapshotForGate`; desde a revisão também `snapshotsIn`, `baselineSnapshot`,
  `frozenSnapshotProblems`, `snapshotWriteRefusal` e a tabela `FROZEN_SNAPSHOTS`), com três
  acusações do portão: `graph-snapshot-missing`,
  `graph-snapshot-stale` (mais velho que `CONTENT_LOT − 1`) e `graph-snapshot-invalid` (não é um
  instantâneo, ou o nome do arquivo e o `lot` de dentro discordam).
- `saveIdsByField` e `doorIdsOf` saíram de `validate.ts` para `additive.ts`: «todo id que um save
  pode ter» é lido por `validateSaveAliases` e por `validateAdditive`, as duas metades de uma
  promessa só.

**Teste.** `test:playthrough`, bloco próprio: o conteúdo contra o próprio instantâneo não acusa
nada; acrescentar ação, sala, peça ou concessão não acusa; cada código com um par feito para o
teste; por mutação sobre o conteúdo real: tirar `portrait-morgan:date` dá `node-removed` e
`id-renamed-without-alias`; dar `requiresPower: 'holyoke'` à porta principal da Ala 1 dá
`guard-strengthened`; o arquivo commitado é o que `graphSnapshot` escreveria (byte a byte)
**enquanto o lote do arquivo não tem «Feito em» no plano mestre**. Depois disso o arquivo é
registro: exigir que ele siga o conteúdo faria a primeira fatia de L3 reescrever o instantâneo
de L2, que é justamente o que ela tem de respeitar (corrigido em F4; ver §14). (Revisão: a
fronteira passou do «Feito em» para o **«Feito em … e publicado»**. O «Feito em» é escrito antes
da revisão e do push, e entre os dois um conserto aditivo ia ao ar sem estar no registro. O que
protege o arquivo de L2 das primeiras fatias de L3 deixou de ser a ausência de comparação: é o
digest fixado e a recusa do script.)

**Vermelho hoje.** Não há instantâneo: o portão de T12.3 reprova até o arquivo existir.

### T13 — Navegação por inundação (M15; ÁT-H3) · F5

**Hoje.** `scripts/test-navigation.ts` prova o alcance de três coisas: os dois quadros de parede
(`:468-489`) e a rota do escritório (`:621-636`). As doze peças, os quatro containers, o rádio e as
portas não têm prova de que o jogador chega a um ponto de onde o `E` os alcança. L1 entregou
ÁT-H3 só para os quadros (HANDOFF §10.7).

**Mudança.** `scripts/lib/flood.ts` (novo) e um bloco em `test-navigation.ts`:

- `floodFrom(world, start, cell = 0.25)`: a partir do spawn real, anda a cápsula real
  (`movePlayer`, `PLAYER_CAPSULE`) do centro de uma célula ao da vizinha (quatro vizinhas); a
  célula entra se a cápsula chega a menos de 5 cm do centro sem cair. Devolve os pontos de pé.
- `museumWorld.ts`: o mundo ganha os suportes de peça que têm colisor (`MOUNT_PARTS`); as peças
  continuam fora (não têm colisor: H-31). Exporta o volume de mira de cada interativo como o
  runtime o monta: a caixa da receita para peça (com posição, giro e escala), `DRAWER_PROXY` ou a
  caixa acolchoada para container, a caixa acolchoada para quadro e rádio, a caixa da folha para
  porta, dos dois lados.
- Para cada interativo: (a) existe um ponto de pé, na sala dele, com o olho (`PLAYER_EYE_HEIGHT`)
  fora do volume e a menos de `INTERACTION_REACH` dele; (b) o ponto de pé **mais próximo** do alvo
  também tem o olho fora do volume e dentro do alcance (é o «de onde a cápsula para» que L1 deixou).

[medido] com o conteúdo de hoje: 6.405 células em 0,44 s; os 26 alvos (12 peças, 4 containers, 3
quadros, 1 rádio, 3 portas × 2 lados) passam em (a); em (b) reprova **um**: `net-1897`, que não
tem colisor e deixa o olho entrar na própria caixa. Distâncias do melhor ponto: bolas do saguão
0,88 m; `ball-spalding` 0,64 m; vitrine corrida 1,03 a 1,38 m; arquivos 0,16 m; caderno 1,20 m;
luminária 0,70 m; rádio 0,69 m; quadros 0,25 e 0,30 m; portas 0,22 e 0,43 m.

**[medido em F5, com a suíte]**: 6.618 lugares em 0,56 s (saguão 3.939, Ala 1 2.321, escritório
346, 12 em vãos), os mesmos com um orçamento de passos de 1× a 6×; os 26 alvos passam em (a) e em
(b) reprova só `net-1897`, como previsto. A contagem difere em 3% porque a grade é ancorada no
spawn (o script da medição do plano não ficou no repositório; a fase da grade decide se a última
fileira cabe junto de cada parede). Do lugar mais próximo: bolas do saguão 0,93 a 0,94 m;
`ball-spalding` 0,66 m; `gym-suit` 0,30 m (o olho passa 30 cm acima do manequim, que tem 1,32 m);
vitrine corrida 0,77 a 1,33 m; arquivos 0,08 a 0,23 m; caderno 1,24 m; luminária 0,67 m; rádio
0,73 m; quadros 0,31 e 0,38 m; portas 0,29 a 0,49 m (com a folha fechada: ver «Como ficou»).

`KNOWN_DEBT`: `{ gate: 'test:navigation', code: 'standing-point-inside-target', id: 'net-1897',
untilLot: 14 }` (H-31: a rede ganha lâmina de colisão).

**Teste.** `test:navigation`: «todo interativo tem um ponto de pé ligado ao spawn, dentro do
alcance e fora do próprio volume»; «do ponto de pé mais próximo, idem, fora o que a tabela de
dívidas data»; «a inundação cobre as três salas» (cada sala com pontos, e a volta ao saguão de
toda sala).

**Vermelho hoje.** A acusação de `net-1897` (fora da tabela até a linha entrar). O resto nasce
verde; prova-se por mutação, dentro do próprio teste: sem o colisor de `breaker-panel` no
manifesto, o olho do ponto mais próximo entra no volume do `atrium-breaker` (é ÁT-A1 voltando);
com **duas** `partition` fechando o escritório de parede a parede, logo ao norte do spawn,
`office-cabinet` fica sem ponto de pé. (O plano dizia «uma `partition` atravessada na faixa», e
isso não tira o ponto de pé: corrigido em F5, abaixo.)

**Como ficou (F5).**

- **Alcance é distância, como no jogo.** Cada raio de mira só é lançado contra os alvos do seu
  tipo: o `E` no arquivo atravessa uma cadeira, e uma partition. Por isso uma `partition` na
  faixa do escritório não tira o ponto de pé do arquivo por dois motivos medidos: a cápsula dá a
  volta pela mesa (o lugar mais próximo continua a 0,08 m), e mesmo um muro a um metro do arquivo
  deixa o lado de cá a 1,95 m, dentro dos 2,4 m. (a) pega o que **nenhum** lugar andável alcança;
  o resto do que um jogador encontra é (b). A suíte prova (a) de dois jeitos: o escritório
  murado de parede a parede (o lugar mais próximo fica a 2,69 m) e a Ala 1 com os dois vãos
  murados, em que os dois arquivos continuam a menos de 2,4 m de um lugar do **saguão**, através
  da parede, e é o «na sala dele» que recusa.
- **Códigos:** `no-standing-point` para (a) e `standing-point-inside-target` para (b), um por
  alvo; uma porta tem um alvo por lado, `<porta>@<sala>`. `test:navigation` passou a assentar a
  tabela de dívidas **uma vez**, no fim, com a caminhada do farol e a inundação juntas (assentar
  cada bloco sozinho daria ao outro as linhas dele como «pagas»).
- **Porta fechada é sólida.** O jogador mira uma porta enquanto ela está fechada, e fechada ela
  para a cápsula. O mundo da inundação não tem folhas (é o que deixa cobrir as três salas), então
  cada alvo de porta leva o próprio portão (`registerTransitionDoorGate`, num mundo só dele) e um
  lugar em que a cápsula encostaria no portão não conta. Sem isso o lugar mais próximo ficava
  dentro do vão, a 3 cm da caixa ou com o olho dentro dela.
- **A volta é andada.** A inundação guarda de que célula cada lugar foi alcançado, e `walkBack`
  anda a cápsula de volta por essa cadeia, de onde o jogador chega em cada sala até o spawn.
- **Cair não é chegar.** Uma caminhada que termina mais de um degrau (0,22 m + 2 cm) abaixo de
  onde começou foi queda, medida caminhada a caminhada; e a chegada pergunta ao piso o que o
  spawn pergunta (`hasWalkableSupportBelow`), porque `grounded` também é o que o motor diz de uma
  cápsula que ele acabou de subir num degrau, e uma que afunda na borda de uma laje é «subida»
  contra o lado dela. Nenhum dos dois acontece no museu de hoje; os dois têm caso com lajes
  feitas para o teste.
- **Dois números saíram do componente:** `INTERACTION_REACH.door` (2,6 m, que era
  `INTERACTION_DISTANCE` em `TransitionDoors.tsx`) e `TRANSITION_DOOR_TARGET_DEPTH` (0,1 m, que
  era um literal no `boxGeometry`). `interactionVolumeWiringProblems` (`runtimeWiring.ts`) prende
  cada componente à caixa que a suíte mede, e é provada por treze refactors em memória
  (dezessete desde a revisão: a base de uma peça montada, o gabinete e o mobiliário passaram a
  ter o registro do colisor preso ao componente; o mundo da suíte punha os três sozinho).
- **Os suportes de peça** entram no mundo por `mountPlacements`; nenhuma peça de hoje usa plinto
  ou vitrine de mesa, então a prova traz uma bola num plinto e anda contra ele. A cúpula da
  vitrine de mesa não tem colisor e a suíte prende o manifesto a isso.

### T14 — Lint de numerais e do que envelhece (M11; H-22, CN13, EN-A7; D14) · F5

**Hoje.** Nenhuma regra lê os números do texto. `scripts/test-opening-flow.ts` conta as chaves com
`1896` (a asserção de L1), para esse código só. [medido]: `1896` aparece em duas chaves por
dicionário (`hotspot.portrait-morgan.date.label`, `document.halstead.title`), em nenhum crédito de
mídia e em nenhum dos dois SVG autorais.

**Mudança.** `src/content/textLint.ts` (novo, só do portão) e `schema.ts` (3.8):

- `printedTexts`: todo texto que o jogador lê e que se pode ler sem abrir imagem — os dois
  dicionários, por chave; os `<text>` dos SVG de `media` (lidos pelo script do portão e passados
  em `extras`); a linha de crédito de cada mídia nas duas línguas.
- `numeral-exclusivity`: token é sequência máxima de dígitos (`1895–1915` tem dois, nenhum é
  `15`); hora (`16h47`, `8h55`, `9h`) é um token de classe `clock` e não se compara com código.
  O token igual ao valor de um fato `usedAsCode` só pode estar nas chaves de `printedIn`, nas
  duas línguas; `printedIn` tem uma chave, salvo `exception: 'tutorial'`. Mais
  `fact-code-without-printed-in` e `numeral-printed-in-missing` (chave autorizada que não traz o
  número em alguma língua).
- `counted-pattern`: para fato com `forbiddenPatterns`, reprova uma das `forms` a até seis
  palavras de um dos radicais de `near`, na mesma frase, fora das chaves de `printedIn`.
- `text-ages`, sobre o texto de acervo (DL2-15): em pt-BR «há N anos» (N em algarismo ou por
  extenso), «até hoje», «hoje», «N títulos», «maior», «melhor», «único», «recorde»; em inglês
  “N years ago”, “for N years”, “to this day”, “today”, “N titles”, “biggest”, “largest”,
  “greatest”, “best”, “the only”, “world record”, “record-breaking”, “all-time” (*record* sozinho
  não entra: é a palavra do museu para a ficha).
- `speech-night-state-unconditional`: fala de rádio que diz chuva, tempestade, apagão ou escuro
  (pt-BR: «chuva», «chovendo», «tempestade», «temporal», «apagão», «acabou a luz», «sem luz»,
  «escuro»; inglês: “rain”, “storm”, “blackout”, “power's out”, “power is out”, “the dark”) sem um
  `when` não vazio em quem a diz (chamada ou dica).
- `museum.ts:77-99`: `springfield-renaming` ganha `printedIn` e `exception: 'tutorial'`.

**Teste.** `npm run test:lints` (novo, `scripts/test-text-lint.ts`): o tokenizador (intervalo com
travessão, `18960`, hora, número por extenso); as duas línguas divergindo; `counted-pattern` com o
catorze e com o baú («com 14 nações» e «8 × 16» reprovam; «oito gomos» e «16h47» não); cada
palavra de `text-ages` nas duas línguas e os falsos positivos conhecidos (*the collection record*);
o conteúdo real limpo fora o que a tabela de dívidas data. `test:opening-flow` mantém a asserção de
L1 e passa a ler as duas chaves de `printedIn`.

**Vermelho hoje.** O lint de exclusividade nasce verde (L1 já limpou o texto, DL1-7): prova-se com
o texto de antes de L1, guardado no teste (`exhibit.handbook-1897.catalogue` e
`exhibit.photo-gym.catalogue` com o ano). `text-ages` acusa `document.predecessor.body` («existe
há cento e trinta anos») e `speech-night-state-unconditional` acusa `radio.patience.t4.dark`,
`radio.patience.t5.soap.2` e `radio.deadAir.rain` [previsto, pela varredura feita para este
plano]: entram em `KNOWN_DEBT` no mesmo commit. **[confirmado em F5: as quatro, e só elas.]**

**Como ficou (F5).**

- **Uma acusação por chave**, nomeando as línguas e as palavras: uma linha de dívida data uma
  chave, e a tabela impressa tem uma linha por dívida (37 com as quatro novas).
- **Onde o texto mora:** uma chave de dicionário; `credit:<id da mídia>` para a linha de crédito
  (nas duas línguas); `media:<id da mídia>` para o que está escrito num SVG, que não tem língua.
  Quem lê os arquivos é `scripts/lib/mediaTexts.ts` (o `<text>` de cada SVG de `media`, com os
  `<tspan>` juntos e as entidades decodificadas; um arquivo que sumiu lança erro), e
  `validate-content.ts` passa o resultado em `extras.mediaTexts`. `printedIn` aceita qualquer um
  dos três.
- **O tokenizador lê duas coisas antes dos dígitos soltos:** a hora (`16h47`, `8h55`, `9h`, e
  também `16:47` e `9 a.m.`, que é como o inglês escreve) e o número com separador de milhar
  (`1,896`, `200.000`: um número só, com os dígitos juntos). `1:200`, a escala da planta, não é
  hora; `1,98`, a altura da rede, não é milhar.
- **Código contado não é preso aos dígitos:** com `exception: 'counted'` ou `'geometry'` o fato
  fica fora de `numeral-exclusivity` (um `14` solto está em metade das placas) e dentro de
  `counted-pattern`; a chave de `printedIn` dele só precisa existir. **Código novo:**
  `fact-exception-without-patterns` (o esquema dizia «required with», e nada conferia).
- **`counted-pattern`:** palavras são sequências de letras, números e o `×`; a hora é uma palavra
  que não casa com nada; a distância é contada da borda mais próxima da forma; as palavras da
  própria forma não contam como o significado dela («dezesseis» começa com «dez»); radical é
  começo de palavra («combinação» contém «naç» e não é nação).
- **`text-ages`** lê cada palavra da lista com as flexões simples («únicas», «maiores»,
  «recordes»; *world records*) e nada além da lista. Em inglês `for N years` pede o plural.
  **O que escapa:** a versão inglesa do bilhete do Otávio diz *it has been here a hundred and
  thirty years*, sem *for*, e não casa com nenhuma das treze formas; a chave é acusada pelo
  português e a dívida a data nas duas línguas. Se a lista inglesa ganhar o perfeito sem
  preposição, é em L3 ou L8, com caso.
- **Estado da noite:** quem não tem `when` é a resposta da paciência (`RadioReply`,
  `RadioOutburst`, elogio e chiado); chamada e dica têm, e `conditionAsks` diz se ele pergunta
  alguma coisa (`{}`, lista vazia e `anyOf` com um ramo vazio não perguntam). A última dica, que
  tem `when: {}`, seria acusada se falasse de chuva.
- **`test:opening-flow`** deixou de derivar as duas chaves: lê `printedIn` e confere que são a
  plaqueta que ensina o fato e o título do documento que o revela, com a exceção `tutorial`.

## 5. Migração: o save antes e depois

Só os campos que mudam; todo o resto sai idêntico ao que entrou. «Antes» é o `progress` sob a
chave `volleyball-museum:v1`; «depois» é o que `migrateProgress` devolve no fim do lote.

| # | Save | Antes | Depois |
|---|---|---|---|
| A | `production-drawer-open`, `l1-route-end` | sem `contentLot`, `locksSeen`, `doorsReleased`, `flags`, `triggersFired`; `locksOpened: ['office-drawer']` | `contentLot: 2`, `locksSeen: ['office-drawer']`, `doorsReleased: []`, `flags: []`, `triggersFired: []` |
| B | `production-drawer-closed`, `production-catalogued-unturned`, `production-radio-on-desk` | idem, `locksOpened: []` | `contentLot: 2` e as quatro listas vazias. A gaveta sai da planta até ser tocada (DL2-4); o atalho pede mais uma saída (DL2-3) |
| C | `production-pre-opening` | sem `radioCalls`, `clockSeconds`, `hintsShown`, `devicesCarried`, `radioMemory` | como hoje (`doc-welcome` concedido, `porter-first-call` ouvida, `journal-taken` em `hintsShown`), mais `contentLot: 2` e as quatro listas vazias |
| D | de um lote futuro: `{ version: 1, contentLot: 7, termsSigned: ['termo-posse'], socketsFilled: ['curator'], locksSeen: ['office-drawer', 'holyoke-hero-seal'], … }` | — | `contentLot: 7`; `termsSigned` e `socketsFilled` como vieram; `locksSeen` com os dois ids, mesmo o que este build não conhece. Igual depois de qualquer ação e de regravar |
| E | de L2, lido pelo código de L1 (`sanitiseProgress.L1.ts`) | `contentLot: 2`, `locksSeen: ['office-drawer']`, `doorsReleased: ['atrium-from-holyoke-shortcut']` | todo campo que L1 conhece, igual; os cinco campos novos somem (é o código de L1 que não os copia). Voltando a L2: `contentLot` ausente → 1 → o migrador refaz `locksSeen` a partir de `locksOpened`; `doorsReleased` não volta. **É a perda de um rollback, registrada no HANDOFF** |
| F | lixo: `contentLot: 'x'`, `doorsReleased: 'abc'`, `locksSeen: [1, 'office-drawer', null]` | — | `contentLot: 2`, `doorsReleased: []`, `locksSeen: ['office-drawer']` |
| G | `{ version: 99, catalogued: ['x'] }`, `null`, `'texto'` | — | jogo novo (DL2-5) |
| H | jogo novo | — | `emptyProgress()`: `contentLot: 2`, tudo vazio, `lastRoom: 'office'` |

## 6. Textos (pt-BR é a fonte; `en.ts` é tipado contra ele)

| Chave | pt-BR | inglês | Onde aparece |
|---|---|---|---|
| `door.released` (nova) | «Atalho destrancado» | “Shortcut unlocked” | toast, seguido de « — » e do título da sala (`room.holyoke.title`) |
| `map.legend` (existe; passa a ser usada) | «Legenda» | “Legend” | título da legenda da planta |
| `map.state.unlit` (não muda) | «Sem energia» | “No power” | legenda, amostra tracejada |
| `map.state.partial` (muda) | «Acesa, falta conferir» | “Lit, something left to check” | legenda, amostra hachurada. Dizia «Peças por catalogar», falso para o escritório |
| `map.state.complete` (muda) | «Completa» | “Complete” | legenda, amostra cheia. Dizia «Catalogada» |
| `map.unknown` (nova) | «Sala ainda não visitada» | “A room not visited yet” | `<title>` do toco; o sinal desenhado é «?». Desde a revisão, também uma linha da legenda enquanto a planta desenha um toco: no toque não há `<title>` que apareça |
| `map.north` (nova) | «Norte» | “North” | `aria-label` da rosa; a letra desenhada é «N» nas duas línguas |
| `map.you` (nova) | «Você está aqui» | “You are here” | `aria-label` do marcador |

Nenhuma traz algarismo, hora nem palavra de `text-ages`. «Norte» não é fala de rádio
(`speech-uses-cardinal` só lê falas). Nenhuma fala do Jorge muda: `porter-shortcut` é de L3.
`claims` e `mentions` (campos de L8 e L3): nenhuma destas chaves afirma fato; `door.released`
menciona `atrium-from-holyoke-shortcut`.

## 7. Dívidas datadas

### 7.1 Fecha em L2

| Portão | Código | Id | Como |
|---|---|---|---|
| `validate:content` | `i18n-key-unused` | `map.legend` | a legenda ganha título (T8); a linha sai de `KNOWN_DEBT` no commit que move `CONTENT_LOT` para 2 |

### 7.2 Abre em L2 (cada validador novo entra com as suas linhas, no mesmo commit)

| Portão | Código | Id | Até | Por quê | Fatia |
|---|---|---|---|---|---|
| `validate:content` | `exhibit-uncataloguable` | `net-1897`, `gym-suit`, `photo-gym` | L4 | H-01: o detalhe obrigatório fica a mais de 0,42 m da origem, ou num cone de 1,5° | F4 |
| `validate:content` | `checklist-item-untickable` | `notebook.todo.catalogue` | L4 | a condição pede as doze; três não catalogam | F4 |
| `validate:content` | `checklist-item-untickable` | `notebook.todo.vault` | L3 | sem `doneWhen`; em L3 vira promessa datada sem caixa de riscar (DL2-16) | F4 |
| `test:navigation` | `standing-point-inside-target` | `net-1897` | L14 | H-31: sem colisor, o olho entra na caixa da rede | F5 |
| `validate:content` | `text-ages` | `document.predecessor.body` | L3 | H-23: «há cento e trinta anos»; o bilhete dá lugar a `doc-otavio-handover` | F5 |
| `validate:content` | `speech-night-state-unconditional` | `radio.patience.t4.dark`, `radio.patience.t5.soap.2`, `radio.deadAir.rain` | L3 | falha 66 do plano: resposta do Jorge não tem `when` até M9 (`RadioReply.when`) | F5 |
| `validate:content` | `hotspot-unreachable` | `net-1897:socket` | L4 | H-01: detalhe opcional a 2,4 m da origem; sem código próprio sumia do grafo sem acusação, e a dívida da rede só fala da fita | revisão |

Do Anexo C, as linhas de L2 ficam assim: `exhibit-uncataloguable` e `checklist-item-untickable`
abrem aqui, como previsto; as quatro de texto são novas e entram no Anexo C pelo fecho do lote. Um
validador de L2 que acuse algo fora desta tabela reprova a fatia: ou o conteúdo é consertado, ou a
linha entra aqui com data.

## 8. Testes

### 8.1 Suítes

| Suíte | Estado | Entra | Fatia |
|---|---|---|---|
| `test:save` | nova | T1, T2 | F1 (cresce em F2 e F3 com os campos) |
| `test:qa-save`, `test:captures` | ganham casos | T3 | F1 |
| `test:triggers` | nova | T4, T5 | F2 |
| `test:locks` | nova | T6 | F2 |
| `test:opening` | ganha casos | códigos novos contra conteúdo quebrado (T4, T5); o atalho nos dois estados (T7); `simulateProgress` (T10) | F2, F3, F4 |
| `test:transition-door`, `test:mobile-controls`, `test:navigation` (travessia) | ganham casos | T7 | F3 |
| `test:map` | nova | T8 | F3 |
| `test:playthrough` | nova | T9 a T12 | F4 |
| `test:navigation` (inundação) | ganha casos | T13 | F5 |
| `test:lints` | nova | T14 | F5 |
| `test:facts` | ganha itens | a lista de módulos só do portão: `simulate.ts`, `additive.ts`, `textLint.ts` | F4, F5 |
| `test:bundle` | — | os tetos de 9 | F1, F2, F3 |

`package.json`: `test:save`, `test:triggers`, `test:locks`, `test:map`, `test:playthrough`,
`test:lints` e `graph:snapshot`. No `check`: `test:lints` depois de `validate:content`; `test:save`
depois de `test:qa-save`; `test:triggers`, `test:locks` e `test:map` depois de `test:radio`;
`test:playthrough` depois de `test:navigation`; `test:bundle` continua no fim. Sem dependência
nova: tudo é `node --experimental-strip-types`.

### 8.2 Testes que mudam de sentido (plano, 6.5; aviso no HANDOFF)

| Teste | Prendia | Passa a prender | Fatia |
|---|---|---|---|
| `scripts/test-capture-manifest.ts:183-185` | `l1-review` aberto, sobre árvore de trabalho | congelado, em `513ec09` | F1 |
| `scripts/test-qa-save.ts:142-161` | cinco saves que nunca saem | seis, com `l1-route-end` | F1 |
| `scripts/test-opening-flow.ts:218-220`, `scripts/test-radio.ts:811` | save de outra versão vira jogo novo | **igual** (DL2-5); só a razão muda de «descartar é mais barato» para «ninguém escreveu esse formato» | — |
| `scripts/test-power.ts:99-118` | os quatro efeitos aplicados por `store.applyUnlockEffect` | os mesmos quatro, no mesmo formato de chave, por `effectGrant` e `grant` | F2 |
| `scripts/test-save.ts` (a tabela `ACTIONS`) | toda função do store roda contra um save de um build posterior; a tabela morava na suíte | a mesma tabela, em `scripts/lib/storeActions.ts`, lida também por `test:triggers`; sai `applyUnlockEffect`, entra `grant`; `openLock` deixa também `locksSeen` | F2 |
| `scripts/test-transition-door.ts:426-447` | o atalho não fica aberto: nada grava a liberação | a folha não grava nada; o save grava, e aí o saguão abre | F3 |
| `scripts/test-transition-door.ts:419-423`, `scripts/test-opening.ts:253-265` | as duas regras com dois e três argumentos | com a lista de portas liberadas | F3 |
| `scripts/test-navigation.ts:325-366` | o atalho num sentido | nos dois | F3 |
| `scripts/test-opening.ts:284-288` | `validateSolvability` | `simulateProgress` | F4 |
| `scripts/test-facts.ts:737-748` | seis módulos só do portão | nove (oito depois de F4: `simulate.ts` e `additive.ts`), e a regra provada com importações feitas para o teste | F4, F5 |
| `scripts/test-docs.ts:461-472` | `lastLotDone` morava na suíte | a mesma função, em `scripts/lib/planLots.ts`, lida também por `test:playthrough` | F4 |

`scripts/test-navigation.ts:385` (`reciprocalPairs.size === 3`) não muda: L2 não acrescenta vão.

## 9. Bundle e catracas

Hoje (HANDOFF §10.3): documento 63.235 bytes de gzip (teto 63.600), título 28.353 (teto 28.500),
jogo 388.248 (teto 390.200). **A folga do título é de 147 bytes.**

| Caminho | O que entra | Previsto | Fatia |
|---|---|---|---|
| título | `progressFields.ts`, `saveMigrations.ts`, `contentLot.ts`, `SAVE_ALIASES` (o store é importado pela tela de título) | +0,5 a +0,8 kB; **[medido em F1: +293 bytes, 28.646; teto 28.800]** | F1 |
| título | `progressRules.ts` e `commitProgress`; três linhas da tabela | +0,2 kB; **[medido em F2: +0 bytes, 28.646; o teto fica em 28.800]** (o que entrou coube no que saiu: `applyUnlockEffect` e os dez verbos escritos por extenso) | F2 |
| título | as quatro chaves novas e as duas mudadas de 6, nas duas línguas (os dicionários viajam com o título) | +0,2 kB; **[medido em F3: +217 bytes, 28.863; teto 29.000]** (a folha de estilos também viaja com o título, e as regras da planta cresceram) | F3 |
| jogo | `triggers.ts`, `contentRegistry.ts`, `progressGrants.ts`, `lockRules.ts` | +1,5 a +2 kB; **[medido em F2: +1.250 bytes, 389.477; o teto fica em 390.200, com 723 bytes de folga]** | F2 |
| jogo | `mapModel.ts`, o toast, `doorGrant` | +1 kB; **[medido em F3: +1.237 bytes, 390.714; teto 392.700]** | F3 |
| jogo | `examineReach.ts` | +0,2 kB; **[medido em F4: −6 bytes, 390.708; os tetos ficam]** (a vista só importa as duas constantes; a conta do cone não entra no bundle) | F4 |
| jogo | `printedIn` e `exception` no fato do ano; os dois números da porta, importados | não previsto; **[medido em F5: +0,06 kB, 390,77 kB; os tetos ficam]** (`textLint.ts`, `flood.ts` e `mediaTexts.ts` não entram no bundle) | F5 |

Tudo [previsto]. Cada teto sobe **no commit da fatia que precisa**, para o medido mais meio por
cento, com o motivo escrito em `BUNDLE_PATH_CEILINGS` (`scripts/lib/ratchets.ts:237-241`), como a
revisão de L1 fez. Os dois orçamentos do papel (250 kB antes do clique, 600 kB no total) ficam
longe: 91,6 e 479,8 kB hoje. `simulate.ts`, `additive.ts`, `textLint.ts` e tudo em `scripts/` não
entram no bundle. `CONTENT_SENTINELS` continua provando que o título não carrega conteúdo; T1
acrescenta a prova pela fonte, que diz **qual** importação quebrou a regra.

**Receitas tocadas: nenhuma.** Nenhum gerador, material ou colisor muda, `npm run bake` não roda
neste lote, e o delta de draws e de triângulos por sala é zero nas três.

Nenhuma outra catraca se move: `kit.glb`, textura residente, programas e draws não mudam, e o
`BROWSER_RECORD` (lote 1) tem a idade que `test:ratchets` aceita com `CONTENT_LOT` em 2.

## 10. Rota do L2 no navegador (passo 6)

Servidor `museum-dev` (porta 5201), **reiniciado** depois da última edição. 1280 × 720 e depois
844 × 390 com os botões de toque; em pt-BR e em inglês. Console sem erro nem aviso novo.

**A. `?qaSave=production-drawer-open`.** Continuar. Planta: três salas, nenhuma tranca listada (a
gaveta está aberta), duas portas (o atalho não aparece), legenda com título e três padrões, seta
do marcador acompanhando a câmera (girar 90° e reabrir), «N» no alto. No saguão, mirar o atalho:
«Abre pelo outro lado»; `E` dá o som de trinco e nada mais. Ir à Ala 1, sair pelo atalho: toast
«Atalho destrancado — Ala 1 · Holyoke». Virar-se: «Abrir porta», e abre. Planta: três portas.
Recarregar **sem** o parâmetro: do saguão o atalho abre.

**B. `?qaSave=production-drawer-closed`.** Planta: nenhuma tranca. Tocar a gaveta (o teclado
abre), `Esc`. Planta: «Gaveta com segredo — 4 dígitos». Digitar o ano: a gaveta abre, o bilhete
aparece, a tranca sai da planta.

**C. Jogo novo.** Luminária, caderno. Planta: só o escritório e um toco com «?» na porta. Entrar
no saguão: duas salas, o toco passa para a porta da Ala 1.

**D. `?qaSave=production-pre-opening`** (em inglês): carrega, nada se perde, a planta em inglês.

**E. `?qaSave=l1-route-end`:** o save de L1 carrega e a rota A se repete a partir dele.

**F. Toque (844 × 390).** O botão de Ação aparece diante do atalho bloqueado e dá o som; a planta
cabe e a legenda se lê; o toast não cobre o prompt.

**Aceite manual do plano mestre:** nenhum item visual neste lote. O que só o navegador mostra e os
testes não: a seta acompanhando a câmera e a hachura legível no telefone.

## 11. Fatias

Cada fatia passa pelos passos 2 a 4 de §9.1 e termina com `npm run check` e `npm run build` verdes
e um commit local só com os arquivos dela. Nenhuma concede, cita ou lista algo cujo consumidor não
esteja nela: o campo do save entra com quem o escreve e com quem o lê.

| Fatia | Tarefas | O jogador vê | Depende de |
|---|---|---|---|
| **F1 — O save que não se perde** | T1, T2, T3 | nada | — |
| **F2 — Uma porta só para o progresso** | T4, T5, T6 | a planta só lista a tranca tocada | F1 |
| **F3 — O atalho aberto e a planta sem spoiler** | T7, T8 (com `map.legend` e `CONTENT_LOT = 2`) | o atalho, o toast, a planta | F2 |
| **F4 — A prova de que se joga** | T9, T10, T11, T12 | nada | F2, F3 |
| **F5 — O espaço e os números** | T13, T14 | nada | nenhuma; vem por último para não disputar `validate.ts`, `knownDebt.ts` e `museumWorld.ts` com F2 a F4 |

Por que esta ordem: M5 pede M2 (o gatilho grava em campo da tabela); M6a pede M5 (`Lock.onOpen`);
M10 pede M5, M6a e M4a e modela `doorsReleased`, que é de F3; M39 pede M10. `CONTENT_LOT` passa a 2
na fatia que paga a única dívida que vence em L2, e todos os migradores de lote 2 já estão na
árvore nesse commit (DL2-6 cobre o save carimbado antes).

## 12. Riscos

| Risco | Como aparece | Resposta |
|---|---|---|
| o store executa gatilhos no caminho de todo `E` | uma regra errada grava no save de todo mundo | em L2 o conteúdo real compila **zero** gatilhos; o limite do ponto fixo; `test:triggers`; o robô com 500 ordens e recargas |
| a migração muda de arquivo | um save de produção perde átomo | os cinco fixtures passam por `test:qa-save` sem mudança no teste; os casos de 5; a migração de abertura copiada palavra por palavra |
| rollback para antes de L2 | `doorsReleased` some; a planta volta a listar tudo | registrado (caso E); nada do que L1 conhece se perde, e `locksSeen` se refaz |
| o teto do título estoura | `test:bundle` vermelho em F1 | previsto em 9; sobe no commit, com o motivo |
| a régua de 5° de `examineReach` | uma peça de cone estreito vira «incatalogável» sem ser | a régua é a de hoje e o corpus a confere; L4 troca as duas |
| a planta esconde demais | o jogador vê uma porta no saguão que a planta não desenha | é a decisão de 8.7 (DL2-13); o toco com «?» cobre a porta principal. Conferir na rota A e levar ao dono se incomodar |
| o som no `E` bloqueado soa como defeito | «Abre pelo outro lado» com zumbido de fechadura elétrica | é o som que existe (`lockDenied`); o som próprio de trinco é de L16 |
| o instantâneo gravado antes do fecho | a revisão muda o conteúdo depois | ~~mudança aditiva passa; o fecho gera de novo~~ o «Feito em» foi escrito antes da revisão e desligava a comparação. Desde a revisão: até o plano dizer «e publicado», o arquivo tem de ser o grafo do conteúdo, byte a byte; regravar pede `--reopen` e o digest novo |
| o save de L1 não pôde ser tirado do navegador | corpus sem L1 | a segunda saída de HANDOFF §10.10, declarada; nunca um save inventado |
| falso positivo do lint em inglês | *record*, *only*, *best* em sentido comum | listas por frase, não por palavra solta; cada falso positivo conhecido tem caso no teste |

## 13. O que fica para o fecho do lote (passos 5 a 12 de §9.1)

- revisão adversarial (passo 5) e a rota de 10 no navegador (passo 6);
- `npm run graph:snapshot` de novo, sobre o que for publicado;
- corpus: um save de L2 tirado do navegador no fim da rota A (`l2-shortcut-released`), coberto em
  `test:qa-save`;
- `docs/HANDOFF.md`, seção nova: o que mudou, as medições de bundle, os testes de 8.2, as dívidas de
  7.2, **a perda do rollback (caso E)** e as lições; o Anexo C do plano mestre ganha as quatro
  linhas de texto; a seção L2 do plano ganha o «Feito em»;
- revisor, push, deploy e fumaça (passos 8 a 11), que este plano não autoriza por si.

**Como ficou (2026-10-05).** Feitos: a rota no navegador, o instantâneo (gerado de novo, sem
mudar um byte), o corpus (dois saves, não um), o registro em `docs/HANDOFF.md` §11 com a perda do
rollback, o Anexo C e o «Feito em». A revisão adversarial (passo 5) veio depois, num commit
próprio (§14, «Revisão adversarial»). Não feitos: os passos 8 a 11. O que saiu diferente desta
lista está em §14, «Fecho do lote».

## 14. Execução, fatia por fatia

O que cada fatia fez de diferente do que está acima, para a fatia seguinte não redescobrir. O
registro completo do lote vai para o `docs/HANDOFF.md` no fecho.

### F1 — O save que não se perde (2026-10-04; commit local, sem push)

T1, T2 e T3 inteiros. Nada muda para o jogador.

**O save de L1 foi tirado do navegador** (T3, item 1), antes de qualquer edição em `src/`:
servidor `museum-dev` reiniciado sobre `78412ee` (`src/` idêntico ao de `f0fb5a3`), 1280 × 720,
`localStorage` vazio, painel visível (o jogo rodou em tempo real). Tudo pelo `E`, pelas teclas e
pelos botões do próprio jogo; o teleporte do harness só pôs a câmera diante de cada alvo, dentro da
sala em que o jogador já estava, e as seis travessias de porta foram andadas com `W`. A rota:
luminária; a primeira chamada do Jorge ouvida até a última fala; caderno, as três páginas; rádio,
com `porter-radio-taken` até o fim; quadro do saguão; quadro da Ala 1; saída pelo atalho; de volta
pela porta principal; retrato do Morgan arrastado 112 px até a data aparecer; saída pelo atalho de
novo; gaveta, `1896` nos botões do teclado, bilhete lido. O Jorge não foi chamado, então
`radioMemory` está vazio. O que está em `saveFixtures.ts` sob `l1-route-end` é, byte a byte, o texto
lido da chave. O save tem os mesmos campos dos de produção: L1 não mudou o que um save guarda.

**Vermelho primeiro** (§9.1, passo 2), sobre a árvore sem o conserto:

- `test:save`: «um campo que este build não conhece…» reprovou com «the load dropped what it did not
  know» e «aba velha não rebaixa `contentLot`» com «the load lowered it»; o que a aba regravava já
  não tinha `contentLot`, `termsSigned` nem `socketsFilled`. A suíte inteira nem carregava
  (`contentLot.ts` não existia);
- `test:qa-save`: «l1-route-end is gone from the corpus»;
- `test:captures`: com o teste novo e a biblioteca intocada, `frozen` era `false`; com `frozen: true`
  e o `+` ainda no commit, «l1-review is frozen on a working tree nobody can check out»;
- «save deste lote lido pelo código de L1» nasce verde. Por mutação: com `clockSeconds` virando lista
  de pares na tabela, reprova, e com ele boa parte da suíte; e o próprio caso prova os dentes a cada
  execução, lendo com o código de L1 um save em que um campo mudou de tipo. Outras treze mutações
  foram aplicadas uma a uma, e cada uma reprovou pelo menos o caso que a nomeia: descartar o campo
  desconhecido; copiá-lo por
  atribuição (só o caso do `__proto__` pega); carimbar o lote do build por cima do save; o migrador
  pular o save do próprio lote; o alias trocar o id em vez de acrescentar; uma ação reconstruir o
  save; `hintsShown` contar como progresso; o store importar o museu; a memória do rádio refeita só
  com os campos conhecidos; ler save de outra versão; subir `SAVE_VERSION`; o migrador escrever no
  que recebeu; a abertura deixar de dar o caderno.

**Onde a execução se afastou do plano.**

- `hasSavedProgress`, `EMPTY_PROGRESS` e `withValue` moram em `progressFields.ts` (o store reexporta
  os dois primeiros e importa o terceiro); `roomsVisited` tem `counts: false` e a regra própria.
- O sanitizador de `clockSeconds` recusa lista, e ele e o de `radioMemory` montam o registro com
  `Object.fromEntries`: um id `__proto__` vindo do save continua sendo dado também ali.
- `migrateProgressWith(raw, regras)` existe para os testes; `migrateProgress` é ele com as listas
  reais. O contexto do migrador é o tipo `SavedAs` (`raw`, `savedLot`).
- A leitura de `contentLot` devolve `1` para ausente ou lixo, **nunca** `CONTENT_LOT`: no dia em que
  a constante for 2, o save de produção tem de continuar mais velho que o migrador do lote 1. O
  teste prende o `1` por valor; em F1 as duas coisas coincidem, então só F3 o veria reprovar.
- `validateSaveAliases` e `saveIdsByField` (ver T2). `hintsShown` não é «aliasável».
- A migração de abertura está em `saveMigrations.ts` como `preOpening`, e o corpo dela é, linha a
  linha, `store.ts:250-280` de `f0fb5a3` (conferido por `diff`). Um caso novo de `test:save` compara,
  campo a campo, a carga deste build com a do código congelado de L1 para todo o corpus e nove saves
  feitos para o teste.
- `scripts/lib/staticImports.ts` (novo) é quem caminha os `import`; serve às listas «só do portão»
  de F4 e F5. A lista de módulos do store é exata e ainda não tem `state/progressRules.ts`.
- `test:save` não para no primeiro caso reprovado: imprime todos. E cada ação do store roda contra
  um save com campos desconhecidos; a tabela `ACTIONS` é conferida contra as funções do store, então
  **ação nova em F2 (`grant`) ou removida entra ou sai dessa tabela**, senão a suíte reprova.
- `test:docs` passou a conferir que o arquivo citado na mensagem de `CONTENT_LOT` define a constante.
- O congelado de L1 tem as linhas 57-107, 118-149, 164-200, 204-281 e 481-484 de `store.ts` em
  `f0fb5a3`: do intervalo 118-281 ficaram de fora as configurações e o tipo `Persisted`, que nenhuma
  dessas linhas lê.

**Medições.** Título 28.646 bytes de gzip (era 28.353; +293), teto 28.800; documento 63.230 e jogo
388.227, sem crescer. `npm run check` e `npm run build` verdes; `test:opening-flow` e `test:radio`
verdes sem nenhuma edição.

**No navegador, depois do verde** (servidor reiniciado; o painel ficou oculto no meio da sessão, e
daí em diante o jogo andou por `__museumStep`): `?qaSave=l1-route-end` oferece «Continuar» e carrega
com `contentLot: 1` e nada perdido; a primeira escrita de verdade leva o carimbo para o disco (carregar
sem mudar nada não escreve, como já era com a migração de abertura); um save com `contentLot: 7`,
`termsSigned`, `socketsFilled` e `locksSeen` posto sob a chave, recarregado, continuado e jogado (uma
chamada ao Jorge) volta ao disco com tudo isso; `?qaSave=production-pre-opening` abre em inglês,
trazido para a frente como antes; «New game», nos dois cliques, grava o save vazio com o carimbo e
mantém o idioma. Console sem erro nem aviso novo.

**Para F2.** `PROGRESS_FIELDS` ganha `locksSeen`, `flags` e `triggersFired`, e com isso: uma linha em
`SAMPLES` e outra em `ADDED_BY_THE_LOT` (`test:save`), uma em `saveIdsByField` (`validate.ts`, senão
não compila) e a lista de campos que contam. O caso D já carrega um `locksSeen` com um id que o
conteúdo não tem.

### F2 — Uma porta só para o progresso (2026-10-04; commit local, sem push)

T4, T5 e T6 inteiros. O que o jogador vê: a planta só lista a tranca que ele já tocou (a gaveta
fechada de um save antigo some da lista até o primeiro `E`), e uma tranca que recusa responde com o
zumbido em vez de silêncio. O conteúdo real não compila gatilho nenhum: `triggersFired` e `flags`
ficam vazios em todo save.

**Vermelho primeiro** (§9.1, passo 2), em dois tempos.

Com as suítes escritas e a árvore de F1: `test:triggers` e `test:locks` nem carregavam
(`progressGrants.ts` e `contentRegistry.ts` não existiam), e `test:save` reprovava 8 de 29 (sem
`grant`, sem `progressRules.ts` na lista de módulos do store, sem `locksSeen`).

Depois, com a infraestrutura nova no lugar (o slot, os gatilhos, `commitProgress`) e **as três
regras extraídas nos valores de hoje** (o avaliador de condições intocado; `hotspotGrant`
devolvendo os efeitos da peça sempre que os obrigatórios estão completos; `attemptLock` abrindo o
modal para toda tranca fechada e `pendingLocks` listando toda tranca fechada; os componentes
intocados):

- `test:triggers`, 11 de 30. «an empty save has "ball-spalding" catalogued: the evaluator ignores
  the field»; e por causa disso «half a condition fired the trigger»: com o avaliador de hoje,
  **todo** gatilho que pergunta por um campo novo dispara num save vazio. «An optional detail found
  later does not repeat the piece's effect (S11)»: «a detail wrote what only the piece's effect may
  write: `credentials`». A fiação acusou 22 problemas, o segundo deles «engine/Interaction.tsx calls
  `applyUnlockEffect`»;
- `test:locks`, 6 de 14. «No kind of lock without a panel ever answers "ask" (S1)»: abriram modal
  `badge`, `medallion-plinth`, `ritual` e `tool`. «A lock nobody touched is on the plan», e o save
  `production-drawer-closed` listava a gaveta nunca tocada;
- `test:opening`: os oito códigos novos, todos com «does not accuse».

Com tudo verde, 38 mutações foram aplicadas uma a uma (o arquivo voltava ao original depois de
cada uma) e cada uma reprovou pelo menos o caso que a nomeia: o commit sem assentar; o commit que
sempre escreve; o store que não escuta o registro, que não assenta na criação, ou que assenta e não
agenda a escrita; gatilho disparado e não anotado; ponto fixo sem limite; `open-lock` e `openLock`
sem `locksSeen`; `anyOf` valendo como «todos»; o avaliador ignorando `flags`; o detalhe esquecendo
o que foi visto antes; a chave gasta abrindo de graça; um código mais longo abrindo; a planta
listando toda tranca fechada; sem o migrador do lote 2; `onOpen` não compilado; o rádio, a entrada e
a troca de sala em duas escritas; «Novo jogo» por fora da porta; a classe de uma condição ignorando
os ramos; o validador sem olhar o `when` dos gatilhos nem os ramos; qualquer portal contando como
porta; o museu sem se registrar; um save de build posterior fazendo o avaliador lançar.

**Onde a execução se afastou do plano.**

- **`commitProgress(update, session?)`**: sem mudança no save, não há `set` do `progress` nem
  `persist`; mas o `session` sai mesmo assim (o fim de uma transmissão que não é chamada tem de
  tirar o rádio do ar). Para «sem mudança» valer, quem atualiza tem de devolver o próprio objeto:
  os verbos `record*`, `powerRoom`, `openLock`, `grantCredential`, `carryDevice` e `recordHint`
  viraram `grant` com a lista nomeada (antes, regravar um documento já lido notificava todo
  mundo). `start` passou a ser uma notificação só (eram duas), e entrar de novo na mesma sala não
  faz um save novo.
- **`openLock` do store concede `locksSeen` junto.** É o que mantém `locksOpened ⊆ locksSeen` por
  qualquer porta, inclusive a das suítes.
- **`conditionClasses`** (o conjunto) existe ao lado de `conditionClass` (a pior): o validador diz
  as duas acusações de uma vez. A classe de cada campo é a tabela `CONDITION_FIELD_CLASS`, tipada
  contra `keyof ProgressCondition`: campo novo no schema sem classe não compila. Pior é
  `negative`, depois `all`.
- **Campo que o save não tem responde «não» sem lançar**: o avaliador confere `Array.isArray`. Um
  save de build posterior traz, num campo que este build não sanitiza, o que aquele build gravou.
- **`credentialKey` mora em `progressCondition.ts` e `lockCredentialKeys` em `lockRules.ts`**;
  `validate.ts` importa as duas em vez de ter cópias. O grafo que o portão prova é escrito pelas
  funções que o jogo usa.
- **Os códigos de condição levam `id`** (o id que falta), inclusive os quatro que já existiam.
  `condition-credential-missing` acusa a credencial que nenhum efeito do conteúdo concede.
  `roomsVisited` com sala desconhecida é `condition-room-missing`. Não há código para `flags`
  (`flag-never-set` é de T10).
- **`effect-target-missing` e as credenciais**: ver T5, item 6, reescrito. Os três códigos antigos
  de `validateReferences` (`power-effect-room-missing`, `open-effect-lock-missing`,
  `reveal-effect-document-missing`) saíram; nenhuma suíte nem dívida os citava.
- **`Lock`** virou `LockBase & { … }` por variante: `id`, `mapLabelKey` e `onOpen` num lugar só.
- **`attemptLock`**: tranca de conhecimento cujo fato não existe devolve `refused: 'unsupported'`
  (um teclado sem resposta nunca fecharia pelo código certo). E o componente que encontra um
  `lockId` que o conteúdo não tem recusa com o som, sem chamar a regra.
- **`settleTriggers`** pula, dentro da passada, o gatilho cujo id já está anotado: dois gatilhos
  com o mesmo id são um só para o save (o validador acusa o segundo).
- **`saveIdsByField`**: `locksSeen` são as trancas; `flags`, as que algum efeito põe;
  `triggersFired`, os ids compilados. Com o conteúdo de hoje as duas últimas são vazias, e um alias
  para elas é recusado.
- **`progressWiringProblems(read, components)`** (ver T5 e T6, item 7).
- **Bibliotecas de teste novas**: `scripts/lib/storeActions.ts` (a tabela de toda função do store,
  que morava em `test-save.ts`) e `scripts/lib/storePage.ts` (o store carregado como o navegador
  carrega, com `slip` para pôr algo no save por fora das ações, `notifications`, `timersAsked` e
  `idleAfterBirth`). **Função nova no store entra em `STORE_ACTIONS`**, senão `test:save` e
  `test:triggers` reprovam; e entra, por nome, numa das duas listas de `test:triggers` («assenta»
  ou «não toca no save»).
- **`?qaPower`** (`PlayerController.tsx`, só em DEV) continua escrevendo o `progress` por
  `setState`, por fora de `commitProgress`: é a ponte do harness, não um verbo do jogo. Nada o
  assenta até a ação seguinte.

**Medições.** Título 28.646 bytes de gzip (igual a F1), documento 63.236, jogo 389.477 (+1.250).
Nenhum teto mudou; a folga do jogo é de 723 bytes. `npm run check` e `npm run build` verdes;
`test:qa-save` (21), `test:opening-flow` (44) e `test:radio` (27) verdes sem nenhuma edição.
`test:triggers` tem 30 casos e `test:locks`, 14.

**No navegador, depois do verde** (servidor `museum-dev` reiniciado; 1280 × 720, painel visível):

- `?qaSave=production-drawer-closed`, «Continuar»: o registro de regras está preenchido depois do
  clique (o chunk do canvas o importa); a planta **não lista tranca nenhuma**. Diante da gaveta o
  prompt diz «Trancado»; o `E` abre o teclado e `locksSeen` ganha `office-drawer`; `Esc`; a planta
  lista «Gaveta com segredo — 4 dígitos» (em inglês, “Combination drawer — 4 digits”). `1895` nos
  botões do teclado: «errado», nada abre, nada mais é escrito. `1896`: a gaveta abre, o bilhete
  aparece, a tranca sai da planta, e o disco tem `locksOpened` e `locksSeen` com a gaveta e
  `triggersFired` vazio. Tocada e deixada fechada, a tranca continua na planta depois de recarregar
  sem o parâmetro;
- `?qaSave=production-drawer-open`: carrega com `locksSeen: ['office-drawer']`, a planta sem
  tranca, o prompt «Ler», e reler a gaveta não faz um save novo (o mesmo objeto);
- `?qaSave=production-catalogued-unturned`, no saguão: pegar a bola de oito gomos grava o detalhe
  opcional numa escrita; girá-la grava o detalhe obrigatório **e** a ficha na mesma escrita;
- 844 × 390, pelos botões de toque: «Ação» diante da gaveta abre o teclado, «Fechar» fecha, o
  caderno abre pelo botão e a planta lista a tranca (abaixo da dobra, dentro da rolagem do
  caderno, onde a lista já ficava);
- jogo novo (com o servidor reiniciado outra vez, depois da última edição do store): «Entrar no
  museu» grava `roomsVisited: ['office']`; a luminária acende pelo `E`; a porta abre pelo `E` e a
  travessia, andada com `W`, chega ao saguão numa notificação só (sala, sala anterior, visitadas e
  `lastRoom` juntas); a primeira chamada do Jorge, ouvida até o fim em tempo real, entra em
  `radioCalls` na mesma notificação que tira o rádio do ar;
- console sem erro, e sem aviso novo. Viewport de volta ao preset desktop, `localStorage` da
  origem de desenvolvimento vazio.

**Para F3.**

- `PROGRESS_FIELDS` ganha `doorsReleased`: linha em `SAMPLES` e em `addedByTheLot` (`test:save`),
  em `saveIdsByField` (as portas: o portal que declara a folha, como em `condition-door-missing`) e
  na lista de campos que contam. `ConditionProgress.doorsReleased` e o caso de `test:triggers` já
  existem; `doorGrant` entra em `progressGrants.ts`.
- T8 leva `pendingLocks` para dentro de `mapModel`: a linha de `progressWiringProblems` que pede
  `pendingLocks(MUSEUM.locks, progress)` em `MuseumMap.tsx`, e a mutação «the plan listing every
  shut lock» de `test:locks`, mudam junto.
- O teto `game` tem 723 bytes de folga e `mapModel.ts` mais o toast pesam mais que isso: sobe no
  commit de F3, com o motivo.
- `CONTENT_LOT` passa a 2 em F3. O migrador do lote 2 já está na árvore e roda para o save
  carimbado com 2 (DL2-6), e `test:save` prende isso.

### F3 — O atalho que fica aberto e a planta sem spoiler (2026-10-05; commit local, sem push)

T7 e T8 inteiros, com `map.legend` paga e `CONTENT_LOT = 2`. É a fatia que o jogador vê: o atalho
da Ala 1 abre dos dois lados depois da primeira saída, com o aviso «Atalho destrancado — Ala 1 ·
Holyoke» e o som do trinco; do saguão, antes disso, o `E` (e o botão de Ação, no toque) responde
com o zumbido; e a planta só mostra o que o jogador já viu.

**Vermelho primeiro** (§9.1, passo 2). Com as suítes escritas e **as regras desta fatia extraídas
nos valores de hoje** (as duas regras de porta recebendo a lista e ignorando-a; a tabela sem a
linha de `doorsReleased`; `doorActionAvailable` com a regra que morava em `MobileControls.tsx`;
`mapModel` desenhando toda sala, um vão por portal, nenhum toco e o marcador sem direção; os
componentes e os dicionários intocados):

- `test:transition-door` parou em «once released, the atrium side opens it too»: «the rule ignores
  what the save says was released», `'other-side'` no lugar de `null`;
- `test:opening`, 31 de 32: «the one-way shortcut keeps its own rule, latched and released»;
- `test:mobile-controls`: «"Abre pelo outro lado": on touch the door has no button to answer with»;
- `test:save`, 20 de 29. O campo sem linha na tabela não tem amostra nem coluna; `doorsReleased:
  'abc'` continuava `'abc'` (caso F); o save antigo carregava com `undefined` (casos A, B, C e E); e
  toda ação que concede a liberação lançava «Cannot read properties of undefined (reading
  'includes')», o que derrubava também os casos do `__proto__` e da aba velha;
- `test:map`, 4 de 15. «A new game: one room, and one stub where its door leads»: «the plan shows
  rooms nobody has walked into»; «the atrium walked into…» e «three rooms and the shortcut still
  latched…» (o atalho desenhado); «nothing of a room that was not visited is in the model» já no
  primeiro subconjunto; «the marker…»: «the model does not hand on the yaw it was given»; a fiação
  com dezesseis problemas, o primeiro deles «ui/MuseumMap.tsx no longer draws mapModel(MUSEUM,
  progress, …)»; e os textos de §6. Passaram os três estados, «no two states share a pattern or a
  colour», o norte e **«a lock: never touched, absent…»**, que F2 já tinha pago;
- a travessia `atrium → Holyoke (shortcut)` de `test:navigation` nasceu verde, como previsto.

Com tudo verde, 43 mutações foram aplicadas uma a uma (o arquivo voltava ao original depois de
cada uma). Quarenta e duas reprovaram pelo menos o caso que as nomeia, entre elas: toda sala na
planta; o atalho desenhado antes de liberado, ou liberado pelo id do portal de frente; nenhum toco; o toco
apontando para dentro; o yaw com o sinal trocado ou sem normalizar; o sul para cima; o vão com a
profundidade de uma parede só; um vão por portal; a porta com o id do portal na chave; a sala
escura com estado de acesa; «completa» com papel por ler; ponto para peça já catalogada; dois
estados com a mesma cor, ou com o mesmo padrão; a rosa embaixo; a moldura crescendo com a visita;
a regra de porta ignorando o save, aceitando qualquer liberação ou o id do portal de frente; «sem
energia» dito antes de «outro lado»; a liberação abrindo fechadura elétrica; `doorGrant` do lado
errado, repetido, com o id errado ou para porta de dois lados; um migrador inferindo a liberação
pela visita (pego por três suítes); o campo fora da tabela ou sem contar como progresso; alias para
o portal de frente; e as três regras do botão de Ação. A que escapou era um `+ 0` em
`headingDegrees` que não fazia nada (a subtração já devolve `0`, não `-0`): saiu do código.

**Onde a execução se afastou do plano.**

- **Um vão por abertura, cortado nas duas paredes.** Cada abertura é declarada por dois portais,
  um em cada linha de parede, a 0,25 m um do outro. O modelo junta os dois (pelo critério de
  `buildTransitionDoorSpecs`: a menos de 0,35 m e apontando de volta); com as duas salas na planta
  o vão fica a meio caminho e `depth` diz a largura do corte (as duas linhas); com uma só, fica na
  parede dessa sala. `portalOpening` ganhou o quinto parâmetro (`between`) e devolve `depth`. São
  seis portais e três aberturas (o plano não dizia quantos).
- **A chave de uma porta é `door:<n>`**, não o id do portal: `atrium-to-holyoke` escreveria o nome
  da Ala 1 na planta de quem ainda não entrou nela. O caso «nada de sala não visitada» procura o
  id, a chave de título, a de apelido, os ids de peça, de documento e de portal de cada sala fora
  do conjunto, e os quatro cantos dela entre todos os pontos do modelo, com o resto do save vazio,
  cheio e com toda porta liberada. A lista de trancas fica fora dessa busca: tranca tocada é do
  jogador, não de uma sala.
- **«Jogo novo» é o que o botão do título faz**: o caso carrega o store e chama `start()`, que
  grava `roomsVisited: ['office']`. Com a lista vazia o modelo não tem sala nenhuma, e é isso que
  ele deve dizer.
- **`headingDegrees` normaliza para [−180°, 180°]**: `camera.rotation.y` só soma e subtrai.
- **A regra de porta de mão única ficou num lugar só** (`latchedAgainst`), lida pelas duas funções.
  Uma liberação tira a barra e mais nada: a fechadura elétrica continua pedindo a energia, e «outro
  lado» é dito antes de «sem energia».
- **`doorActionAvailable(focused)`** some só com a folha em movimento ou com o toque já armado.
- **O toast lê a sala de `opensFrom` direto do conteúdo** (`doorSides`, em `Hud.tsx`), não de
  `buildTransitionDoorSpecs`: importá-la no chunk do HUD tirava a topologia do chunk do canvas para
  um chunk próprio.
- **O `svg` da planta é `role="group"`**, não `role="img"`: dentro de uma imagem nada tem nome, e
  o marcador, a rosa e o toco têm os seus.
- **A planta inteira numa página do caderno.** Em 844 × 390 o `svg` tinha 410 px de altura numa
  página de 252: a planta já não cabia antes desta fatia, e a legenda ficava abaixo da dobra. O
  teto de altura passou a `min(26rem, calc(88vh - 8.25rem))`; no desktop nada muda (416 px), e no
  telefone a planta e a legenda cabem sem rolagem (211 px). (Revisão: a conta valia para a legenda
  e para mais nada; a linha da tranca tocada ficava abaixo da dobra. A página virou uma coluna em
  que a planta é quem cede; no telefone, com a gaveta listada, a planta tem 200 px.) Com isso o nome do escritório, que no
  telefone saía pela borda direita do `svg`, deixa de ser cortado.
- **O nome de sala ganhou um contorno escuro** (`paint-order: stroke`) e os pontos, uma borda: têm
  de ler sobre hachura e sobre cheio como liam sobre o fundo.
- **`__museumTeleport` também publica o yaw** (é a ponte do harness); a fiação pede a linha do
  laço de quadros, não essa.
- **Fiação:** `doorReleaseWiringProblems` (provada por onze refactors em memória, em
  `test:transition-door`) e `planWiringProblems` (onze, em `test:map`). A linha de
  `progressWiringProblems` sobre `pendingLocks` aponta para `ui/mapModel.ts`.
- **`saveIdsByField.doorsReleased`** e `condition-door-missing` leem a mesma `doorIdsOf`.
- **`test:save` não prende `CONTENT_LOT` por valor**: quem obriga a constante a andar é a dívida
  (`map.legend` vencia em L2, e a linha paga some ou vira `known-debt-stale`).

**Medições.** Título 28.863 bytes de gzip (+217; teto 29.000), jogo 390.714 (+1.237; teto
392.700), documento 63.234. `npm run check` e `npm run build` verdes. `test:map` tem 15 casos;
`test:transition-door`, 37 (eram 29); `test:mobile-controls`, 14; `test:navigation`, 70;
`test:save` continua com 29, com `doorsReleased` na amostra, nos aliases e nos casos A a F.
`test:qa-save` (21),
`test:radio` (27), `test:triggers` (30) e `test:ratchets` verdes sem nenhuma edição: o
`BROWSER_RECORD` é o do lote 1 e os dez pontos não foram medidos de novo, porque nenhuma sala
desenha nada diferente.

**No navegador, depois do verde** (servidor `museum-dev` reiniciado; o painel é estreito e a
página aparece reduzida nas capturas, então o que se lê aqui saiu do DOM, e as imagens serviram
para o desenho). Tudo pelo `E`, pelo `Tab` e pelos botões do jogo; o teleporte do harness só pôs a
câmera diante de cada alvo dentro da sala em que o jogador já estava, e toda travessia foi andada.

- **A, pt-BR, 1280 × 720** (`production-drawer-open`): planta com três salas, duas portas, nenhuma
  tranca, legenda «Legenda: Sem energia / Acesa, falta conferir / Completa», «N» no alto, marcador
  a 90° no escritório (o yaw de partida) e a −90° diante do atalho. No saguão, o atalho diz «Abre
  pelo outro lado», e o `E` toca os dois zumbidos de 148 Hz e não grava nada. Da Ala 1, o `E`
  mostra «Atalho destrancado — Ala 1 · Holyoke» com o som do trinco; o save tem
  `doorsReleased: ['atrium-from-holyoke-shortcut']`. De volta ao saguão: «Abrir porta», e abre, sem
  aviso. Planta: três portas. Recarregado **sem** o parâmetro: nenhum aviso ao continuar, e do
  saguão o atalho abre e se atravessa.
- **A, inglês:** “Opens from the other side”, “Shortcut unlocked — Wing 1 · Holyoke”, “Legend: No
  power / Lit, something left to check / Complete”, “North”, “You are here”.
- **B, pt-BR e inglês** (`production-drawer-closed`): nenhuma tranca; gaveta tocada e `Esc`:
  «Gaveta com segredo — 4 dígitos» (“Combination drawer — 4 digits”); `1896` nas teclas: o bilhete
  aparece, a tranca sai, e o escritório passa de hachura a cheio.
- **C, pt-BR** (jogo novo pelo «Novo jogo» do título): luminária, caderno até a última página.
  Planta: só o escritório, hachurado, e um toco com «?» («Sala ainda não visitada»). No saguão:
  duas salas, o saguão tracejado com os quatro pontos, a porta do escritório sem toco, o toco na
  porta da Ala 1, e nada no lugar do atalho. **Em inglês**, sobre o mesmo save: “A room not
  visited yet”.
- **D, inglês** (`production-pre-opening`): carrega com tudo o que tinha, mais o carimbo 2 e as
  listas novas vazias; planta em inglês, sem aviso ao continuar.
- **E e F, 844 × 390, pelos botões de toque** (`l1-route-end`): o caderno abre pelo botão, a planta
  e a legenda cabem sem rolagem e a hachura se lê; duas portas (o save de L1 saiu pelo atalho duas
  vezes, e nada se infere). «Ação» abre a porta do escritório, e o saguão é alcançado pelo
  direcional. Diante do atalho o botão de Ação **aparece** e dá o zumbido. Da Ala 1, «Ação»
  libera: o aviso fica no alto (y de 12 a 51) e o prompt embaixo (237 a 267), sem se tocarem nem
  cobrirem os botões. Do saguão, «Ação» abre; planta com três portas.
- Console sem erro; o único aviso é o `THREE.Clock` que já havia. Viewport de volta ao preset
  desktop e `localStorage` da origem de desenvolvimento vazio.

**O que não deu para conferir.** O giro pelo mouse (o painel não dá `pointer lock`): a seta foi
vista em quatro rumos (90°, −90°, 76° e 180°), postos pelo yaw do harness e publicados pelo laço
de quadros. O toque de
verdade (o painel manda cliques de mouse; o direcional foi segurado por eventos de ponteiro
sintéticos). O som foi conferido pelos osciladores criados, não ouvido. E a legibilidade da
hachura num aparelho real, no sol, que é o que a regra do padrão existe para resolver.

**Para F4.**

- `simulateProgress` modela `doorsReleased` com `doorGrant` e as duas regras de porta, que agora
  pedem a lista; `validateSolvability` (`validate.ts`) ainda decide por topologia.
- O corpus do fecho (`l2-shortcut-released`, §13) sai do fim da rota A: é o primeiro save com
  `doorsReleased` preenchido.
- O teto `game` tem 1.986 bytes de folga e o `title`, 137.

### F4 — A prova de que se joga (2026-10-05; commit local, sem push)

T9, T10, T11 e T12 inteiros. Nada muda para o jogador: a única linha de runtime tocada é a
importação, em `Interaction.tsx`, dos dois números que ele já usava. O que entra é o portão: a
régua do exame como conta, a jogadora exaustiva no lugar de `validateSolvability`, o robô sobre o
store de verdade e o primeiro instantâneo do grafo.

**Vermelho primeiro** (§9.1, passo 2), cada um visto antes do conserto:

- **As cinco acusações.** Com `simulateProgress` ligado em `validateContent` e a tabela de dívidas
  intocada, `npm run validate:content` saiu com 5 erros que `validateSolvability` deixava passar:
  `exhibit-uncataloguable` em `net-1897` («a cone of 0.0°»), `gym-suit` (0,0°) e `photo-gym`
  (1,5°), e `checklist-item-untickable` em `notebook.todo.catalogue` e `notebook.todo.vault`. As
  cinco linhas de §7.2 entraram depois disso, no mesmo commit.
- **O instantâneo.** Sem `docs/releases/L2.graph.json`: `ERROR [graph-snapshot-missing] There is
  no graph snapshot in docs/releases…`, saída 1. E, na suíte, «docs/releases holds no snapshot».
- **Robô × simulação.** Com o filtro de `examineReach` tirado de `availableActions` (as três peças
  oferecidas): 11 de 28 casos passavam. As 500 noites reprovaram todas, a primeira com «seed 1:
  the simulation offers "detail net-1897:socket" in holyoke … and the store did something else:
  it did not write detail:net-1897:socket»; o estado máximo tinha 12 peças em vez de 9; os níveis
  mudavam; e as três acusações de `exhibit-uncataloguable` sumiam (a dívida viraria
  `known-debt-stale`).
- **A régua na vista.** `examineWiringProblems` contra o `Interaction.tsx` de antes acusou seis
  problemas (as duas constantes não importadas, a distância e o limiar usados com nomes próprios,
  `const HOLD_DISTANCE = 0.42` e `const HOTSPOT_DOT = 0.55` declarados ali).
- O resto da suíte nem carregava: `examineReach.ts`, `simulate.ts` e `additive.ts` não existiam.

Com tudo verde, **92 mutações** foram aplicadas uma a uma (o arquivo voltava ao original depois de
cada uma), em `examineReach.ts`, `simulate.ts`, `additive.ts`, `graphSnapshots.ts`, `validate.ts`,
`knownDebt.ts`, `validate-content.ts`, nas mãos do robô e, para provar que ele morde no que é do
jogo, em `store.ts`, `progressFields.ts`, `progressGrants.ts`, `transitionDoorTopology.ts`,
`lockRules.ts`, `Interaction.tsx` e `Hud.tsx`. Na primeira rodada, de 84, três escaparam e duas
reprovaram pelo motivo errado (a mutação não era TypeScript válido, ou fazia a suíte lançar); as
cinco voltaram, com mais oito, depois de três testes novos, e todas reprovam:

- «a passada que enxerga o que acabou de fazer» escapava porque no museu de hoje nenhuma sala
  depende, na mesma passada, de outra visitada antes. Virou o caso da casa de duas salas: um
  interruptor atrás de um teclado e, na sala ao lado, um rádio que espera a luz da primeira
  (toque e ano em `N0`, código em `N1`, luz em `N2`, rádio em `N3`). É também o único caso com
  tranca num controle de energia;
- «a recarga que não procura perdas» escapava porque nada se perde. Virou o caso do disco que
  esquece a porta: `reload` tem de parar ali («the save lost something on its way through the
  disk»), porque no fim da noite o robô teria dado a volta e empurrado a porta de novo;
- «a ficha no primeiro detalhe» (`hotspotGrant` catalogando sempre) escapava desta suíte, e só
  `test:triggers` a pegava: robô e simulação usam a mesma função. O caso dos registros passou a
  perguntar o «não antes» (um detalhe obrigatório de dois não cataloga a Spalding).

**Onde a execução se afastou do plano.** O que muda o sentido de uma tarefa está escrito na
própria tarefa (T10, T11 e T12, «Como ficou»). Em resumo:

- **A rota canônica não termina no estado máximo** (T11, item 1): termina nos treze átomos do
  caminho crítico, e o robô segue dali até o fim.
- **As mãos do robô não usam `actionGrant`**; espelham os componentes. `pressProblem` confronta as
  duas coisas a cada aperto, e é o item 7.
- **`container` e `power` são oferecidos mesmo com a tranca fechada** (o aperto grava
  `locksSeen`); `code` pede a tranca vista e o fato.
- **Os níveis medidos** põem as quatro bolas do saguão em `N2`, não em `N3`.
- **`transition-door-invalid`** é código novo; `no-start-room` ficou.
- **O «byte a byte» do instantâneo só vale com o lote aberto** (sem «Feito em» no plano mestre).
  Quem escreve o «Feito em» o faz num commit que não muda conteúdo, ou roda `npm run
  graph:snapshot` antes: a partir dali o arquivo não é mais conferido contra o conteúdo, só o
  conteúdo contra ele. (Mudou na revisão: vale até o plano dizer «e publicado»; ver «Revisão
  adversarial», abaixo.)
- **`validateAdditive` compara com o que o conteúdo oferece e segue os aliases**; `ids.devices`
  inclui relógio e rádio.
- **`saveIdsByField` e `doorIdsOf`** moram em `additive.ts`; **`lastLotDone`** saiu de
  `scripts/test-docs.ts` para `scripts/lib/planLots.ts`, sem mudar de sentido (as duas suítes o
  leem).
- **`ATOM_PREFIX`** (em `simulate.ts`) é tipado contra as listas do save: lista nova sem linha ali
  não compila. `radioCalls` e `hintsShown` ficam de fora (ninguém as joga).
- **A lista «só do portão» de `test:facts` tem oito módulos** (o nono, `textLint.ts`, é de F5), e
  a regra passou a ser provada com importações feitas para o teste.
- **`scripts/test-opening.ts`**: o caso da porta alimentada do outro lado pede as duas salas
  inalcançáveis por id, e «o museu de hoje é jogável» passou a assentar as cinco dívidas antes de
  exigir zero erros (como `test:power` já fazia).

**Medições.** `test:playthrough`: 30 casos em 10 s de relógio; as 500 noites levam 8 s (19.809
apertos, 2.528 deles para nada, 1.064 abas fechadas e reabertas). Bem abaixo dos 30 s. Bundle:
título 28.865 bytes de gzip (28.863 em F3), jogo 390.708 (390.714), documento 63.235 (63.234);
nenhum teto mudou (o jogo só importa duas constantes de `examineReach.ts`, e os nomes dos chunks
mudam de hash). `npm run check` e `npm run build`
verdes. O portão imprime agora o roteiro em níveis e 33 dívidas datadas (eram 28).
`docs/releases/L2.graph.json`: 42 ações, 3 itens de lista, 54 ids, 19 campos do save; gerar de
novo não muda um byte.

**No navegador, depois do verde** (servidor `museum-dev` reiniciado depois da última edição;
1280 × 720; o que se lê aqui saiu do store e do `__museumScene()`). A fatia não tem nada para o
jogador ver; o que se conferiu é que a vista de exame continua a mesma com os números vindos de
`examineReach.ts`. `?qaSave=production-radio-on-desk`, «Continuar», diante da bola de cadarço do
saguão (o teleporte do harness pôs a câmera a um metro dela): o `E` a pega e ela fica a 0,42 m da
câmera (a malha em −2,40; 1,37; −7,54 com a câmera em −2,40; 1,62; −7,20, inclinada 0,64 rad); o
cadarço conta ao pegar, a ficha aparece («Catálogo — Couro, costura e cadarço») e o save tem o
detalhe e a peça. Na segunda pegada, 10 px de arrasto (4,6°) mostram a costura em relevo, que
estava a uns 46° da linha da câmera: o cone que a régua dá para ela é 44,6°. `E` e `Esc` devolvem
a peça ao lugar. Console sem erro; o único aviso é o `THREE.Clock` de sempre. Viewport de volta ao
preset desktop e `localStorage` da origem de desenvolvimento vazio.

**O que não deu para conferir.** O robô joga o store, não os componentes: as mãos são uma cópia,
à mão, do que cada `interact` faz, presa às mesmas funções puras; quem prende o componente a essas
funções continua sendo `runtimeWiring.ts`. As três peças grandes não foram tentadas no navegador
(nada mudou nelas: continuam sem catalogar, e é L4 quem as resolve).

**Para F5.**

- `validate.ts` ganhou `ContentGateExtras.previousGraph`; o lint de numerais entra ao lado.
- `KNOWN_DEBT` tem cinco linhas novas (três até L4, uma até L4, uma até L3); as de F5 entram
  depois delas.
- Se F5 mudar algo que o instantâneo registra (um id, uma ação, um item de lista), `test:playthrough`
  reprova até `npm run graph:snapshot` rodar de novo: o lote ainda está aberto.
- `scripts/lib/playthrough.ts` exporta `press`, `everyPress`, `playToEnd` e `pressProblem`; a
  inundação de T13 pode usar `everyPress` para saber o que cada sala oferece.

### F5 — O espaço e os números (2026-10-05; commit local, sem push)

T13 e T14 inteiros. Nada muda para o jogador: nenhum texto de jogo mudou (os dois dicionários
estão intocados), e o que mudou em runtime são dois números que `TransitionDoors.tsx` passou a
importar em vez de digitar. O que entra é o portão: a inundação que anda até cada interativo, e
as regras que leem o que o museu imprime.

**Vermelho primeiro** (§9.1, passo 2), cada um visto antes do conserto:

- **A rede.** Com o bloco da inundação escrito e a tabela de dívidas intocada, `test:navigation`
  saiu com 93 de 94: «and from the place nearest to it too, beyond what the debt table dates —
  [standing-point-inside-target] Walking up to "net-1897" in "holyoke", the capsule stands at
  -11.70, -5.53 with the eye inside the interaction volume». A linha de §7.2 entrou depois.
- **O texto.** Com o lint ligado em `validateContent`, sem `printedIn` no fato e sem as linhas de
  dívida, `validate:content` saiu com 12 erros: `fact-code-without-printed-in`
  (`springfield-renaming`), quatro `numeral-exclusivity` (as duas chaves, nas duas línguas: com
  nada autorizado, todo lugar em que o ano está é vazamento), `text-ages` em
  `document.predecessor.body` e seis `speech-night-state-unconditional` (as três falas, nas duas
  línguas). Com `printedIn` e `exception: 'tutorial'` no fato, ficaram 7: exatamente as quatro
  chaves previstas em §7.2. As quatro linhas entraram depois disso, no mesmo commit.
- **`test:opening-flow`**: lendo `fact.printedIn` antes de o fato tê-lo, «printedIn names the
  plaque and the document title, and nothing else» (lista vazia contra as duas chaves).
- **A inundação numa laje sem paredes**, na primeira versão: «nothing stands where there is no
  floor — 78 place(s) off the slab». A cápsula que afundava na borda era «subida» pelo motor
  contra o lado da laje e contava como apoiada. Foi daí que saiu a pergunta ao piso na chegada.
- O lint de exclusividade nasce verde, como previsto: prova-se com o texto de antes de L1
  (`82756c4`), guardado na suíte, que acusa `exhibit.handbook-1897.catalogue` e
  `exhibit.photo-gym.catalogue` juntas e uma de cada vez.

Com tudo verde, **84 mutações** foram aplicadas uma a uma (o arquivo voltava ao original depois
de cada uma), em `flood.ts`, `museumWorld.ts`, `textLint.ts`, `mediaTexts.ts`, `validate.ts`,
`validate-content.ts`, `knownDebt.ts`, `museum.ts`, nos dois dicionários, em `runtimeWiring.ts`,
`test-facts.ts`, `TransitionDoors.tsx`, `Containers.tsx` e `notebook.ts`. Na primeira rodada
quatro escaparam, e viraram quatro casos novos; no fim todas reprovam:

- «cair é chegar» (a regra da queda tirada) escapava porque, na grade de 25 cm, a cápsula fica
  sem passos no ar antes de pousar: a queda era recusada pelo motivo errado. Virou o caso do
  degrau de 45 cm com células de meio metro, em que a caminhada tem tempo de pousar (com a regra
  tirada, 54 lugares no piso de baixo);
- «o radical em qualquer parte da palavra»: virou «Catorze dígitos na combinação»;
- «a forma é o próprio significado»: virou «Oito por dezesseis», com o radical «dez»;
- «a fala curta não é de ninguém» escapava porque a fala usada no caso já era acusada por outro
  dono: o caso passou a pôr na dica final uma fala que só ela diz, inteira e curta.

**Onde a execução se afastou do plano.** O que muda o sentido de uma tarefa está escrito na
própria tarefa (T13 e T14, «Como ficou»). Em resumo:

- **Uma `partition` na faixa do escritório não tira o ponto de pé do arquivo** (T13). Alcance é
  distância; são duas, de parede a parede, e há uma segunda prova com a Ala 1 murada.
- **A inundação tem 6.618 lugares, não 6.405**, pela âncora da grade; os veredictos são os do
  plano (26 alvos, (a) inteira, (b) só a rede).
- **Porta fechada conta como sólida** para o alvo de porta; **a volta é andada** (`walkBack`);
  **cair não é chegar**, por caminhada.
- **`INTERACTION_REACH.door` e `TRANSITION_DOOR_TARGET_DEPTH`** saíram de `TransitionDoors.tsx`,
  e `interactionVolumeWiringProblems` prende os cinco componentes às caixas medidas.
- **Uma acusação por chave**; `credit:` e `media:` como lugares de texto; hora com `:` e
  `a.m.`; milhar com separador; `fact-exception-without-patterns`.
- **`test:navigation` assenta a tabela de dívidas uma vez**, no fim.

**Medições.** `test:navigation`: 108 casos em 3,3 s de relógio (eram 70 em 1,0 s); cada
inundação do museu leva 0,5 a 0,6 s e a suíte faz quatro (o museu, sem o colisor do quadro, o
escritório murado, a Ala 1 murada). `test:lints`: 21 casos em menos de um segundo. Bundle: título
28,86 kB de gzip (igual), jogo 390,77 kB (390,71 em F4: os dois campos do fato e a importação),
documento 63,23 kB; nenhum teto mudou. `npm run check` e `npm run build` verdes; o portão imprime
37 dívidas datadas em `validate:content` (eram 33) e duas em `test:navigation` (era uma).
`docs/releases/L2.graph.json` não mudou: o instantâneo não registra `printedIn`.

**No navegador, depois do verde** (servidor `museum-dev` reiniciado depois da última edição de
`src/`; 1280 × 720, painel visível; o que se lê aqui saiu do DOM, do save e do
`__museumScene()`). A fatia não tem nada para o jogador ver; o que se conferiu é que as portas
continuam as mesmas com os dois números vindos de fora do componente.
`?qaSave=production-drawer-open`, «Continuar». As três caixas de mira das portas, na cena, são as
que a suíte constrói: 0,1 m de fundo no plano das folhas (x de 9,30 a 9,40 na do escritório, de
−9,40 a −9,30 nas duas da Ala 1), da soleira a 2,41 m. O alcance é o de antes: com o olho a
2,57 m da caixa o prompt diz «Abrir porta — Átrio»; a 2,71 m, nada. De dentro do escritório o `E`
abre a porta e a travessia, andada com `W`, chega ao saguão (`lastRoom: 'atrium'`, nada perdido
no save). No saguão, andando com `W` contra o atalho trancado, a câmera para em x = −9,00, a
0,30 m da caixa, com «Abre pelo outro lado — Ala 1 · Holyoke» ainda na tela: é o lugar que a
inundação dá para a porta fechada (0,29 m no mínimo), com o olho fora da caixa. Console sem erro;
o único aviso é o `THREE.Clock` de sempre. Viewport de volta ao preset desktop e `localStorage`
da origem de desenvolvimento vazio.

**O que não deu para conferir.** A inundação anda o mundo dos colisores, não a cena: quem prende
um ao outro continua sendo `test:room-runtime` e as fiações de `runtimeWiring.ts`. Os volumes de
peça são a caixa da receita, não as malhas (o raio do jogo acerta a malha): para a rede a caixa é
quase toda ar, e é por ela que a dívida de H-31 é medida. E ninguém leu os dois dicionários de
ponta a ponta atrás de palavra que envelhece fora das listas: o lint só conhece as listas.

**Para o fecho do lote.**

- O Anexo C do plano mestre ganha as quatro linhas de texto e a da rede (§7.2), e os códigos
  novos: `no-standing-point`, `standing-point-inside-target`, `numeral-exclusivity`,
  `numeral-printed-in-missing`, `fact-code-without-printed-in`,
  `fact-exception-without-patterns`, `counted-pattern`, `text-ages`,
  `speech-night-state-unconditional`.
- Todo fato `usedAsCode` novo declara `printedIn` no mesmo commit, e todo SVG novo de `media` é
  lido sozinho pelo portão. Peça nova num plinto ou numa vitrine de mesa já entra sólida no mundo
  das suítes.
- L3 paga as quatro dívidas de texto: o bilhete dá lugar a `doc-otavio-handover`, e
  `RadioReply.when` (M9) deixa as três respostas perguntarem pela noite.
- A versão inglesa do bilhete («has been here a hundred and thirty years») escapa da lista
  inglesa de `text-ages`; vai embora com o bilhete, e a forma fica anotada em T14.

### Fecho do lote (2026-10-05; dois commits locais, sem push)

Os passos 6 e 12 de §9.1. O registro completo é `docs/HANDOFF.md` §11; aqui fica o que saiu
diferente de §10 e de §13 deste plano.

**A rota de §10 foi feita inteira**, em pt-BR e em inglês, em 1280 × 720 e em 844 × 390 pelos
direcionais e pelo botão de Ação, a partir de `production-drawer-open`, `production-drawer-closed`,
`production-pre-opening`, `l1-route-end` e de dois jogos novos (HANDOFF §11.8). Nada do que a rota
pedia falhou: o atalho abre pelo saguão depois da primeira saída e continua aberto depois de
recarregar; a planta não mostra sala não visitada, tranca não tocada nem o atalho antes de aberto;
a gaveta abre com o ano pelo teclado, por `attemptLock`; nenhum aviso, som ou escrita se repetiu.

**Onde o fecho se afastou do plano.**

- **Um conserto que §0 não previa** (`d299df8`). §0 dizia que o lote não muda textura, modelo nem
  sala, e isso se manteve; mas a rota F achou o painel do caderno saindo pela borda direita em
  844 × 390 (de x = 34 a x = 844: `4vw + 96vw + 4vw`). Não é de L2, está na folha desde agosto,
  e é a página em que a planta de L2 mora. Uma regra de estilo mudou (`92vw`), com um teste que
  soma as duas regras (`journalLayoutProblems`, em `test:map`). A planta e a legenda continuam
  cabendo numa página (211 px; legenda até 340 de 390); em 1280 × 720 nada se move.
- **Dois saves no corpus, não um, e o primeiro não saiu da rota A.** §13 pedia
  `l2-shortcut-released` «no fim da rota A» (a partir de `production-drawer-open`, um registro
  escrito à mão). Saiu do fim da rota E, a partir de `l1-route-end`: o lote começa do save do lote
  anterior, e o resultado é um save de L1 trazido para a frente por L2, com os campos de L1
  primeiro. O segundo, `l2-new-game-drawer-touched`, é um jogo novo com a gaveta tocada e fechada:
  o estado que só L2 grava (DL2-4 ao contrário) e que L3 vai encontrar.
- **Quatro suítes mudaram por causa do corpus.** Os laços «todo save do corpus» de `test:save`,
  `test:locks`, `test:map` e `test:transition-door` afirmavam DL2-3 e DL2-4 de todo save; com
  saves de L2 no corpus passaram a valer para os anteriores (`fixtureLot`, novo em
  `saveFixtures.ts`), e cada suíte ganhou o caso do save que diz o que tocou e o que liberou. A
  tabela de 8.2 não tinha essas linhas; estão em HANDOFF §11.5.
- **`test:qa-save` ganhou três regras** que §8.1 não listava: todo lote com «Feito em» no plano
  tem um save no corpus; um save do lote da árvore carrega como ele mesmo, na mesma ordem de
  campos; e, de L2 em diante, tranca aberta foi tocada e porta liberada foi empurrada de uma sala
  visitada.
- **Capturas, que §10 não pedia** («nenhum item visual neste lote»). O que o lote mudou para o
  jogador é HUD (a planta, um prompt, um aviso), e o `/__capture` só fotografa o canvas. Foram
  feitos dezessete quadros compostos (canvas mais a camada do DOM), em dois conjuntos congelados:
  `l2` (dez, 1536 × 864, sobre `90dd9a6`) e `l2-touch` (sete, 1688 × 780, sobre `d299df8`).
  `test:captures` passou a exigir que o registro cite cada quadro pelo nome inteiro.
- **Os dez pontos de referência foram medidos**, embora §0 e §9 dissessem que não seriam: deram
  exatamente os números de L1 e 35 programas. O `BROWSER_RECORD` continua o do lote 1, como §9
  previa, para que L3 seja obrigado a medir.
- **O «Aceite manual» de §10** (a seta acompanhando a câmera, a hachura legível no telefone): a
  seta foi vista em seis rumos pelo harness e girada pelo direcional de olhar no toque; a hachura
  foi vista nos quadros, não num aparelho.

**Vermelho primeiro**, cada um visto antes do conserto: `test:map` («96vw between two margins of
4vw, 104 in all»); `test:captures` (o manifesto de `l2` ausente, depois os dezessete quadros sem
citação); `test:qa-save` («l2-shortcut-released is gone from the corpus», depois «the plan no
longer marks L2 as done»); e as quatro suítes do corpus, que reprovaram com os saves novos antes
de mudarem. Quatro mutações dos registros novos reprovam `test:qa-save` (HANDOFF §11.4).

**Medições.** `test:map` 16 casos (eram 15), `test:captures` 15 (12), `test:qa-save` 27 (21),
`test:save` 30 (29), `test:locks` 15 (14), `test:transition-door` 38 (37). Bundle: documento
63.235 bytes de gzip, título 28.859, jogo 390.761; nenhum teto mudou. `docs/releases/L2.graph.json`
gerado de novo antes do «Feito em»: sem mudança.

**O que não foi feito.** A revisão adversarial (passo 5), o revisor, o push, o deploy e a fumaça
(8 a 11) e o playtest (13). O giro pelo mouse, o toque num aparelho, o som ouvido e a hachura ao
sol continuam sem conferência (HANDOFF §11.8).

**Para L3.** A rota começa por `l2-shortcut-released` e `l2-new-game-drawer-touched`. Cinco
dívidas vencem nele (HANDOFF §11.6). O fecho segue a ordem de HANDOFF §11.10: instantâneo, save
no corpus, capturas citadas, e só então o «Feito em». O teclado da gaveta não cabe no painel em
720 px nem no telefone (HANDOFF §11.9): quem refizer o teclado em L4 (M6b) parte daí.

### Revisão adversarial (2026-10-05; um commit local, sem push)

O passo 5 de §9.1, por quem não implementou: 18 achados em cinco lentes (saves, fluxo, provas,
testes, visual), 17 distintos (a semente lida do ambiente apareceu em duas lentes), cada um
conferido de forma independente antes de chegar aqui. Seis «major», nove «minor», dois de
acabamento. Todos fechados no commit da revisão; nenhum foi datado e nenhum foi recusado. A
tabela achado por achado está em `docs/HANDOFF.md` §11.12; aqui fica o que muda o que este plano
dizia.

**O save entre duas abas (o achado maior).** §3.1 e T2 provavam «aba velha não rebaixa» com uma
aba que carrega **depois** da escrita mais nova. A aba que já estava aberta não estava coberta:
o store lia o disco uma vez, na carga, e gravava tudo o que tinha por cima do que achasse. Em
produção, uma página de build antigo só existe se foi aberta antes do deploy, então esse era o
único jeito de aba velha e save novo se encontrarem, e o único sem proteção.

- **A regra.** Antes de gravar (e quando o navegador avisa, pelo evento `storage`), a aba lê a
  chave. Se o texto não é o que ela viu por último, outra aba gravou, e as duas cópias são
  juntadas por `joinProgress` (`src/state/progressFields.ts`), campo a campo, pela regra que a
  tabela de campos passou a carregar (coluna `join`): lista por união, na ordem do disco;
  `contentLot` pelo maior; `clockSeconds` pelo maior, relógio a relógio; `radioMemory` pela
  chamada mais recente, rádio a rádio; `lastRoom` é o da aba. Campo que este build não conhece é
  o do disco (esta aba nunca o altera, então a cópia dela nunca é a mais nova), e o da aba só
  onde o disco não tem nenhum. Os gatilhos assentam sobre o resultado, num `set` só.
- **Os ajustes** são os do disco, mais as chaves que esta aba mudou desde a última vez que olhou:
  o brilho escolhido na outra aba não é desfeito.
- **«Novo jogo» continua sendo o único apagamento**, e é a única escrita que não lê o disco
  antes. O caso inverso precisou de uma decisão: a união de um jogo apagado com um jogo novo é o
  jogo apagado, então juntar faria a aba velha devolver à aba que recomeçou o jogo que ela
  apagou. Um jogo recomeçado ganha uma **marca** (`game`, um identificador opaco gravado ao lado
  de `settings` e `progress`); a aba que acha no disco a marca de outro jogo fica com o disco
  como está, sem juntar.
- **A marca não é campo do save.** `SAVE_VERSION` continua 1, `PROGRESS_FIELDS` tem os mesmos 19
  campos, o instantâneo do grafo não mudou um byte e os registros do corpus continuam carregando
  como eles mesmos. Um save que nunca foi recomeçado não tem marca e é gravado, byte a byte, como
  sempre foi. O que outro build gravar ao lado de `settings` e `progress` passa adiante intocado,
  pelo mesmo motivo do campo desconhecido.
- **O limite, registrado e preso num caso:** um build de antes da marca (o de L1, o de produção
  hoje) não consegue dizer que recomeçou. O save vazio dele é igual ao de uma aba que ainda não
  jogou, então é juntado, e o jogo que a aba de L2 tinha continua. Jogar fora a noite de alguém
  por essa evidência seria o erro pior.
- **O relógio não anda para trás.** `recordClockSeconds` deixou de aceitar um tempo menor que o
  do save: a aba cujo relógio ficou atrás do que veio do disco não o rebaixa no quadro seguinte.
- **A aba que adota o jogo novo continua de pé onde estava.** A cena dela é a do jogo antigo até
  recarregar; o save no disco é o do jogo novo, inteiro. Recarregar a põe no escritório.

**O subcampo da memória do rádio.** `rememberRadioCall` trocava a entrada inteira; passa a gravar
por cima dela. É a regra 1 de §3.1 um nível abaixo, e vale para todo chamador.

**O instantâneo tem três estados, e o portão lê cada um de um jeito** (substitui o que T12 e
§14/F4 diziam do «byte a byte»):

| Estado | Como se reconhece | O que o portão faz |
|---|---|---|
| rascunho | lote sem «Feito em» | tem de ser o grafo do conteúdo, byte a byte; não segura o conteúdo a nada |
| fechado | «Feito em», sem «e publicado» | o mesmo, e mais: o SHA-256 está fixado em `FROZEN_SNAPSHOTS` e o script recusa regravar sem `--reopen` |
| registro | lote que o conteúdo já deixou para trás, ou o próprio depois de «e publicado» | é com ele que `validateAdditive` compara; o digest não muda mais |

Três furos fechados com isso: `npm run graph:snapshot` reescrevia o arquivo de um lote fechado
sem perguntar (as primeiras fatias de L3 rodam com `CONTENT_LOT` em 2); o portão comparava com o
arquivo **mais novo**, que no lote em andamento é o próprio conteúdo; e o «Feito em», escrito
antes da revisão e do push, desligava a única comparação do arquivo com o conteúdo.
`lastLotPublished` é novo em `scripts/lib/planLots.ts`, ao lado de `lastLotDone`.

**A fiação que faltava** (T6, item 7, e T13). A lista de T6 prendia a presença de `attemptLock` e
não a linha que leva a concessão ao save; quatro refactors de uma linha passavam por todas as
suítes, porque as mãos do robô são uma cópia dos handlers, não os handlers. Presos agora: a
sequência «pergunta, grava, e só então abre o painel» nos dois componentes, a gravação no
teclado, a lista de detalhes do save como terceiro argumento de `hotspotGrant`, e o registro do
colisor da base de uma peça, do gabinete e do mobiliário. A alternativa mais forte (extrair o
corpo dos handlers para funções puras que o componente e o robô chamem) fica para quem refizer
os handlers: mexe em código com cobertura e pede aviso ao dono.

**A mão do robô.** Decidia que um detalhe foi achado pela régua de 5° da simulação, critério que
o componente não tem: a vista grava com qualquer cone maior que zero. `examineReach` passou a
responder as duas perguntas (`shows` e `reachable`), a mão usa a da vista, e o aperto no detalhe
de cone estreito virou a segunda exceção declarada (a primeira é o código adivinhado), conferida
contra o que as regras dão. `photo-gym:apparatus` é gravável no jogo real: 87 das 500 noites
terminam com dez peças. O estado máximo de T10 continua sendo o que se planeja; o que a sorte
acrescenta está nomeado (`LUCK`).

**`hotspot-unreachable`** é código novo de `simulateProgress`, para o detalhe opcional que
nenhuma mão alcança (hoje, `net-1897:socket`): ele não é oferecido, não entra em ação nenhuma
nem no instantâneo, e a acusação da peça só nomeia os detalhes obrigatórios. Linha nova em 7.2.

**O que saiu do texto e da tela.** A dica do Jorge para a Ala 1 dizia «à esquerda de quem
entra», e a ala passou a ter duas entradas neste lote: pelo atalho o quadro fica 21° à direita.
A fala deixou de dizer um lado, e `test:opening` mede toda dica que diga um. No telefone a tranca
tocada era listada abaixo da dobra da planta; a página virou uma coluna em que a planta cede. O
«?» da lista de trancas virou um cadeado, e o do toco ganhou uma linha na legenda. A tela de
título, com save, escondia os botões de idioma em 844 × 390 (defeito anterior ao lote, achado
na rota de toque dele): rola, e cabe sem rolar.

**Final de linha.** `.gitattributes` (`* text=auto eol=lf`) e `scripts/lib/readText.ts`: num
checkout com o Git padrão do Windows três suítes deste lote reprovavam sem nada ter mudado.
Conferido com a árvore inteira convertida para CRLF: as trinta suítes passam.

**Testes que mudaram de sentido** (plano, 6.5; a lista com arquivo está em HANDOFF §11.5):
`test:opening-flow` («a tab that changed nothing never overwrites a newer save» usava «Novo
jogo» para forçar a gravação, e «Novo jogo» agora grava sempre: o caso virou «"New game" is the
one write that goes over a newer save, and it marks the game as another», e a regra antiga mora
em `test:save`, com abas que podem ser ocultadas); `test:playthrough` (o caso do instantâneo em
disco, as cinco acusações que viraram seis, o fim da noite comparado sem a sorte, o caso
«offered and no hand finds it» que passou da fotografia para a fita da rede, e a semente por
argumento); `test:triggers` e `test:opening` (uma linha cada).

**Vermelho primeiro.** Cada caso novo reprovou a árvore de `02f9992` antes do conserto: os oito
de duas abas em `test:save` («the old tab stamped the save down: 2 !== 3»), o do subcampo do
rádio («a field inside the porter's memory is gone»), o da dica com lado (quatro linhas, as
quatro pelo atalho), o de `.gitattributes`, os sete refactors de fiação e os quatro de colisor
(«a refactor this check exists to catch went through»), o da aba Créditos, o da página da planta
(sete problemas de forma) e os dois do componente da planta. Os que só existem com função nova
(`baselineSnapshot`, `snapshotWriteRefusal`, `luckyDetail`, `seedAsked`, `lastLotPublished`)
reprovaram por falta dela e foram provados por mutação depois: o portão voltando a ler o mais
novo, a recusa desligada, e um detalhe acrescentado ao conteúdo sem regravar o instantâneo, que
em `02f9992` deixava o `check` verde. `condition-room-missing` nasce verde, porque a linha do
validador já existia; com ela tirada os dois casos novos reprovam.

**Medições.** `test:save` 39 casos (eram 30), `test:playthrough` 34 (30), `test:map` 17 (16),
`test:docs` 25 (23), `test:opening` 33 (32); as outras, o mesmo número, com casos mais largos.
`KNOWN_DEBT` tem 46 linhas (eram 45). Bundle: documento 63.235 bytes de gzip, título 29.598
(eram 28.859; teto de 29.000 para 29.800, com o motivo em `scripts/lib/ratchets.ts`), jogo
390.892 (eram 390.761). `docs/releases/L2.graph.json` gerado de novo com `--reopen` sobre a
árvore da revisão: sem mudança, SHA-256 `0eae15c3eaba…`, agora fixado.

**O que não foi feito.** Nenhum quadro novo de captura (as medidas do DOM estão em HANDOFF
§11.8); a fala nova do Jorge não foi ouvida nem lida na tela, só nas suítes; nenhum aparelho
real. O revisor, o push, o deploy e a fumaça (passos 8 a 11) e o playtest (13) continuam por
fazer.

### Revisão antes do push (2026-10-05; um commit local, sem push)

O passo 8 de §9.1. O revisor rodou o store de verdade em várias abas sobre um `localStorage` em
memória, entregando os eventos `storage` e disparando os temporizadores, e devolveu um bloqueio,
dois defeitos, um defeito anterior ao lote e quatro notas. A tabela achado por achado, o vermelho
de cada caso, as dezesseis mutações e o que o navegador mostrou estão em `docs/HANDOFF.md`
§11.13; aqui fica o que muda o que este plano e a seção acima diziam.

**«`lastRoom` é o da aba» tinha uma consequência que a seção acima não viu.** É a única regra da
coluna `join` que não leva duas abas ao mesmo valor: cada uma fica com a sua sala, e o disco, com
a de quem gravou por último. A aba decidia se tinha algo a gravar comparando o que tinha com o
save do disco **como ele estava**; duas abas em salas diferentes sempre tinham, e cada escrita
de uma acordava a outra para gravar de volta, enquanto as duas ficassem abertas. Bastava
«Continuar» numa de duas abas, com um save que parou fora do escritório.

- **A regra.** Ao ler o disco, a aba passa a guardar, como base da comparação, o save do disco
  como **ela** o teria sem nada a acrescentar: na sala dela. `withTabsOwn`, em
  `src/state/progressFields.ts`, ao lado da regra de `lastRoom`. É a regra que o revisor propôs
  e testou; a regra «a sala é da aba» não mudou, nem `joinProgress`.
- **Quando o jogo no disco é outro** (a marca), nada disso vale: o save do disco é tomado como
  está, sala inclusive, e a base é ele.
- **O que custa, registrado e preso num caso:** a aba que acha no disco a escrita de outra no
  mesmo instante em que tem uma porta para contar não toma a própria sala por novidade; a sala
  vai para o disco com a próxima coisa que ela gravar. Nada lê `lastRoom` de volta.
- **Para os próximos lotes:** campo novo cuja regra entre abas seja «o da aba» entra em
  `withTabsOwn`. O caso de três abas que diferem em todo campo da tabela reprova quem esquecer.

**Os ajustes passam a ser lidos com o cuidado do progresso** (substitui «os ajustes são os do
disco, mais as chaves que esta aba mudou», da seção acima):

- cada ajuste conhecido é conferido a cada leitura do disco, na carga e ao ouvir outra aba
  (`USABLE_SETTING`, em `src/state/store.ts`): idioma e qualidade contra a lista deste build,
  brilho em 0,5 a 1,8, os quatro multiplicadores em 0,25 a 4, as três chaves como booleano. O
  que não serve não é usado: vale o padrão ao carregar, e o que a aba já tinha ao ouvir outra;
- **o que o disco dizia volta para ele.** A aba guarda os ajustes nas palavras do disco (`said`)
  e os regrava como achou, a menos que o jogador mude o ajuste nela. Um valor que este build não
  sabe usar é a escolha feita num build seguinte, não lixo deste;
- «mudou nesta aba» é perguntado por valor, não por identidade: um ajuste que seja um objeto
  (hoje nenhum; um build seguinte pode ter) era dado como mudado aqui desde a primeira leitura
  do disco, e a cópia antiga da aba ia por cima da mudança seguinte;
- chave que este build não conhece passa adiante, como campo desconhecido do save; `settings`
  que não é um registro não é ajuste nenhum;
- ajuste que o disco **não tem** deixou de voltar ao padrão quando a aba lê o disco de novo.

**O storage.** Todo acesso passa por `saveStorage`, que nomeia o `localStorage` dentro de um
`try`: num perfil que bloqueia dados do site, ler o nome já lança, e o módulo do store é avaliado
na tela de título. Defeito anterior ao lote.

**Uma biblioteca de teste nova:** `scripts/lib/liveTabs.ts`, um navegador com várias abas do
store real sobre um storage só. Os temporizadores que o store pede disparam, e cada escrita é
avisada às outras abas (só quando o texto muda, como num navegador), em rodadas, até o silêncio
e com teto. É a página para toda pergunta do tipo «até quando», e `test:save` (8.1) é a suíte
que a usa; as páginas de temporizador parado continuam sendo as de perguntar o que uma escrita
forçada deixa no disco.

**Testes que mudaram de sentido** (plano, 6.5): em `test:save`, a última asserção do caso «two
tabs of this build…» dizia «two tabs with the same save go on writing it at each other» e não
provava isso (as duas abas estão na mesma sala, e o temporizador delas nunca dispara). Passou a
dizer o que prova; a pergunta mora nos casos de abas vivas.

**Vermelho primeiro.** Os nove casos novos reprovaram a árvore de `3af1f0e`: os cinco de abas
vivas («the tabs were still writing the save at each other after 12 rounds»), os dois dos
ajustes («locale = "es"», e a aba rodando em `es`, `ultra`, brilho 2,5 e velocidade 0), o da
tecla remapeada (a aba gravou a cópia antiga por cima) e o do storage («the store could not be
evaluated, which is a blank page: SecurityError»).

**Medições.** `test:save` 48 casos (eram 39), em 2,8 s (eram 0,9). Nas 48 noites sorteadas do
portão, e em 800 rodadas uma vez à mão, três abas se calam em no máximo duas rodadas e três
escritas. Bundle: título 29.884 bytes de gzip (eram 29.598; teto de 29.800 para 30.050, com o
motivo em `scripts/lib/ratchets.ts`), jogo 390.891, documento 63.235.
`docs/releases/L2.graph.json` não mudou (o conserto não toca o conteúdo nem os campos do save).

**O que não foi feito.** As quatro notas do revisor não ganharam código e estão em HANDOFF §11.7
e §11.9: «Novo jogo» desfeito por uma aba de L1 ainda aberta; a aba que adota um jogo recomeçado
e fica na cena antiga até recarregar; carga e junção quadráticas em saves adulterados; e o que
um rollback para L1 deixa de regravar. O push, o deploy e a fumaça (passos 9 a 11) e o playtest
(13) continuam por fazer, e o conserto ainda não foi lido pelo revisor.

### Reconferência do conserto (2026-10-05; um commit local, sem push)

Dois verificadores releram o commit acima com o store de verdade em abas vivas e devolveram um
defeito e três notas; os quatro são reais e estão fechados, e a conferência do primeiro achou um
quinto da mesma família. A tabela, o vermelho de cada caso, as dezesseis mutações e o que o
navegador mostrou estão em `docs/HANDOFF.md` §11.14; aqui fica o que muda o que este plano e as
seções acima diziam.

**«A aba que adota um jogo recomeçado fica na cena antiga» tinha duas consequências que gravam
sozinhas.** A seção acima registrou o limite como de interface (a aba não joga o jogo novo até
recarregar, L16). Duas coisas dessa cena terminavam, sem gesto do jogador, algo **começado no
jogo apagado**, e o gravavam no novo:

- **O relógio do escritório.** Contava os segundos em que andou e os entregava ao save quando a
  sala apagava, quando a aba era ocultada e a cada 15 s. A sala apaga justamente ao adotar o jogo
  novo. A contagem agora é um módulo fora do componente (`src/engine/clockCount.ts`) e é de um
  jogo: guarda em que jogo foi feita, não se grava em outro, e é relida do save quando o relógio
  anda num jogo que não é o dela. Para isso o store diz em que jogo está: `gameInPlay` devolve a
  marca do jogo desta aba, ou nada para um save que nunca recomeçou. Não é estado do store nem
  campo do save. A guarda proposta (gravar só com a sala acesa) foi recusada: não cobre a aba que
  ouve tarde e acha o jogo novo já com o escritório aceso, nem a que um dia for levada à tela de
  título com o relógio andando.
- **A chamada do rádio no ar.** É gravada como ouvida quando a última fala termina, e as falas
  andam por temporizador. Ao tomar um jogo que é outro, o store solta a chamada (`radio`, estado
  de sessão) sem gravar nada. Uma escrita do mesmo jogo não a corta.

O que o jogador **fizer** na aba antiga continua indo para o jogo novo, e a cena continua a do
antigo: isso é L16. **Para os próximos lotes:** o que a cena passar a contar por conta própria
para gravar depois pergunta `gameInPlay` antes de gravar, e o que o store guardar na sessão e
gravar ao terminar é solto junto com a chamada.

**Os ajustes ganharam o limite que faltava** (HANDOFF §11.7): um ajuste trocado numa aba deste
build volta atrás enquanto uma aba de L1 estiver aberta e gravando. Sem código; preso como
registro. E «ajuste que o disco não tem fica como a aba o tinha», da seção acima, ganhou o caso
que o prende.

**As abas vivas têm as regras de cada uma** (`scripts/lib/liveTabs.ts`). O registro de regras
(`src/state/progressRules.ts`) é um módulo, o Node avalia um módulo uma vez por URL, e todas as
abas da suíte recebiam o mesmo: regras dadas a uma eram dadas a todas, e a todo store que o
processo já tinha criado. Um gancho de resolução (`registerHooks`, de `node:module`; Node 22.15
em diante) leva a marca da aba do URL do store ao do registro, e `registerRules` entrega as
regras a uma aba só. Com isso `test:save` roda o que L3 põe em produção: uma aba com gatilhos e
outra sem. O teto de «duas rodadas e três escritas» vale com as mesmas regras em toda aba; com
regras só em algumas são três e quatro, medido e preso.

**Vermelho primeiro.** O relógio, com a contagem extraída do componente linha por linha e sem o
conserto: três casos reprovam («the game that was started over begins with the time the clock
ran in the erased one», com 2207 s num jogo novo; o mesmo ao ocultar a aba, com 2200 onde havia
30; e na aba que recomeça ela mesma, com 2205). A chamada: «a call placed in the erased game was
recorded as heard in the new one». As regras por aba, com as abas vivas como estavam: «the rules
of one tab reached the store of another». Os dois casos dos ajustes nascem verdes (um
comportamento que já estava certo, provado por mutação, e um registro).

**Medições.** `test:save` 57 casos (eram 48), em cerca de 4 s (eram 2,8). Bundle: título 29.913
bytes de gzip (eram 29.884; nenhum teto subiu), jogo 390.995 (eram 390.891), documento 63.234.
`docs/releases/L2.graph.json` não mudou.

**O que não foi feito.** A aba que adota um jogo recomeçado continua na cena antiga (L16). O
push, o deploy e a fumaça (passos 9 a 11) e o playtest (13) continuam por fazer.
