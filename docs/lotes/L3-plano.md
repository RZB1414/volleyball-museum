# L3 — Posse: plano do lote

Escrito em 2026-10-05, sobre o commit `5f48687` (`main`, igual a `origin/main`). É o passo 1 de §9.1
de `docs/PLANO-ATE-O-FINAL.md` para o lote L3: cada tarefa com o arquivo e a linha de hoje, a
mudança exata, o teste que a prova (e por que ele reprova o estado de hoje), as formas de dado em
TypeScript, os casos de migração com o save antes e depois, os textos finais em pt-BR e em inglês,
a conta de triângulos e de lotes do bake, as dívidas datadas, a rota no navegador e as fatias de
implementação. **Este arquivo não muda código.** As linhas citadas são as de `5f48687`; o plano
mestre cita as de `82756c4`.

Os números marcados **[medido]** saíram, para este plano, do manifesto do bake
(`src/content/bake.generated.ts`), de `npm run test:kit-runtime`, do layout que o gerador da mesa
exporta e de uma conta em Node sobre os dois dicionários. Os marcados **[previsto]** são conta;
quem os confirma é a fatia que implementa. **[a validar]** marca posição ou custo que só o bake, a
inundação da navegação ou o navegador decidem, com o teste que decide escrito ao lado.

## 0. Resumo

O que muda para o jogador:

- **o jogo passa a ter um fim.** A gaveta do Otávio entrega a folha 1 da passagem de acervo, com a
  chave do cofre de ferro presa; o cofre guarda o Livro de Termos e a prova de etiqueta; no púlpito
  do saguão, com luz nas três salas, segurar a Ação assina o **termo de posse**. Um cartão diz que
  foi assinado e o Jorge fecha a noite pelo alto-falante, com ou sem rádio;
- **assina-se também no celular**: segurar o botão de Ação, ou um toque curto e «Assinar»;
- **o Jorge passa a responder a cada marco** (saguão aceso, Ala 1 acesa, primeira peça, atalho,
  gaveta, cofre), diz a dica em três alturas (onde, o quê, como) e não fala mais de escuro com a
  casa acesa;
- **o escritório responde**: a secretária eletrônica toca o recado do Otávio, cortado às 16:47; o
  telefone diz «Linha muda.»; o relógio se acerta e passa a mostrar a hora da noite, que anda por
  marcos e nunca para trás;
- **a lista «Antes das 9h» vira viva**: contador por sala, linhas a lápis que nascem do que o
  jogador fez, e a linha «Caixa-forte» com a anotação «hoje não: o subsolo alagou», sem caixa;
- **o plinto e o púlpito deixam de ser mudos**: «Plinto do Fundador — Interditado: obra do piso.»;
- **os armários mostram um documento por vez**;
- **dois nomes para dois cofres**: cofre de ferro (escritório) e caixa-forte (sob o átrio).

O que não muda: nenhuma sala, nenhuma textura, nenhuma mídia, nenhuma dependência. As três peças
que não catalogam continuam sem catalogar (L4). A caixa-forte continua sendo promessa datada (L12).
`SAVE_VERSION` continua 1.

O que o lote instala e o jogador não vê: termos e mesa de assinatura, o gesto de segurar, a
sequência dirigida, a tranca de ferramenta em container, credencial como dado, aparelho de voz,
`lapsesWhen` e `mentions`, o relógio da noite, a promessa datada, as suítes `test:ending` e
`test:speech-coherence`, dois campos no save (`termsSigned`, `sequencesSeen`) e o primeiro
instantâneo com termos.

## 1. Escopo conferido

| Origem | O que pede em L3 | Tarefa | Fatia |
|---|---|---|---|
| M32; ÁT-I2; S10; P4, P6; falha 57 | lista como dado: mão, `appearsWhen`, `doneWhen` com ids congelados, contador, `deferredUntilLot` | T1 | F1 |
| M35 (`deferred`); ÁT-D1 (parte de L3); R4 | promessa datada com aviso; o pódio com prompt | T2 | F1 |
| D34, CN9; D2; D13, ÁT-C4, CN12 (dado); CN19, furo 3; HANDOFF §11.9 (nome da gaveta) | os dois nomes; `MedallionId`; sai `breaker-handle`; `threads` sai das quatro bolas; a seguradora na carta; «Gaveta do Otávio» | T3 | F1 |
| CN6 (parte de L3); 8.7 | aba «Caderno» com a lista viva e os termos assinados | T4 | F1 |
| M9; ÁT-A4 (chamada); ÁT-A6 (c); H-27; furos 27, 28, 51, 52, 60; HANDOFF §11.11 (`porter-shortcut`) | chamadas de marco com `lapsesWhen` e `mentions`; `porter-hello` sempre devida | T5 | F2 |
| M9; furo 26; S25; B.2 | dica em três alturas com `targetId`; `hint-points-to-nothing`, `radio-hint-coverage` | T6 | F2 |
| M9; falha 66; dívidas `speech-night-state-unconditional` | `RadioReply.when`, `RadioOutburst.when` | T7 | F2 |
| M33; P9; furos 15, 16, 44; CN8; I-05 | relógio da noite por marcos; `flag:clock-set`; ficha `{hora}` | T8 | F2 |
| 6.4; R7; 1.2 (Helena) | `test:speech-coherence`; `speech-mentions-missing`, `speech-line-too-long`, `speech-hour-in-digits` | T9 | F2 |
| M6b (hospedeiro); V3; DL2-11 | container com tranca de ferramenta, consumo, porta e conteúdo por nó | T10 | F3 |
| M7a | credencial como dado e toast genérico | T11 | F3 |
| M9 (aparelho de voz); I-06; furo 13; P28 | `voice`: o telefone, e o motor da gravação | T12 | F3 |
| H-35 | leitor com um documento por vez | T13 | F3 |
| M31; S26; I-14 | termos, mesa de assinatura, `progress.termsSigned`, o mais antigo primeiro | T14 | F4 |
| M41; S18; D11 | gesto de segurar, igual em teclado e toque; toque curto e confirmação | T15 | F4 |
| M42; D27; falha 43 | sequência dirigida; `progress.sequencesSeen` | T16 | F4 |
| 6.4; Anexo C | `test:ending` | T17 | F4 |
| 4.4d; ÁT-K1; Anexo E #5 e #18 | bake: secretária, cofre com porta, Livro e apoio no púlpito | T18 | F5 |
| I-04, I-12, I-13, I-14; H-23; furos 1, 2, 21, 23, 47; P19, P28, P32; ÁT-E1 linha 7; B.1 a B.5, B.10, B.12 | a cadeia da Posse como conteúdo | T19 | F5 |
| Aceite de L3; Anexo A (aliases) | save com a gaveta aberta recebe a chave e ouve `porter-legacy-drawer` | T20 | F5 |
| HANDOFF §11.6, §11.10, §11.11 | `CONTENT_LOT` 3, cinco dívidas pagas, `BROWSER_RECORD` medido, rascunho de `L3.graph.json` | T21 | F5 |

**Decisões do dono que passam a valer aqui** (`docs/plano-mestre/DECISOES.md`, todas pelo padrão):
D1 (a ampliação é literal: a linha 1 da lista nomeia as três salas da casa, e nenhum texto de L3
trata ala futura como aberta), D2 (as uniões de medalha), D3 (o recado e `porter-hello`), D11 (o
gesto, sem nome digitado), D13 (as quatro bolas fora do fio), D27 (a sequência dirigida), D34 (os
dois nomes). D5 já valia. D33 é de L11: L3 só deixa pronta a flag `posse-signed` que os lacres vão
pedir.

**Fora de L3**, por decisão do plano mestre: o verso das peças e o exame v2 (L4: a folha da gaveta
e o recado dizem «o que está escrito nas peças» até lá); `progress.hintRungs`, o teclado de N
dígitos e «Ver a ficha de conferência» (M6b, parte de L4); suspender e retomar uma chamada fora do
alcance e cortar para a fala de reação (ÁT-A6 a e b, L10: a legenda de uma chamada começada no
rádio da mesa continua aparecendo no saguão, como HANDOFF §11.9 registrou); som de alavanca e
rampa de luz (ÁT-A4, L10); a grade do alto-falante na casca (L5: até lá a sequência dirigida só
tem a legenda); a página II do Livro e reler o Livro no púlpito (II-01, L11); a recalibração da
paciência do Jorge e o resumo de retomada (L15); `askAbout` (L8); papel de toda colocação (L9); a
posição nova do púlpito (4.7b, L9).

**Do Anexo E**, os itens de L3 são o #5 e o #18 (a secretária e o cofre como container cabem no
teto de lotes do escritório). Conferidos em Node: §7 dá a conta. O que só o bake decide está
marcado **[a validar]** e é fechado por `test:kit-runtime`, `test:desk-top` e `test:navigation`
na fatia F5.

## 2. Decisões deste plano

| # | Ponto | Decisão | Por quê |
|---|---|---|---|
| DL3-1 | como a chave é «consumida» | não sai do save. `tool:service-key` fica em `credentials`; está **gasta** quando a tranca que a consome está aberta (`toolSpent`). Não existe `consume-credential` | o save só cresce (`progressFields.ts`, regra 3) e duas abas unem listas: uma chave tirada da lista voltaria na junção. V3 continua valendo: um consumidor só, conferido por `consumable-multi-consumer` |
| DL3-2 | os ids das chamadas de abertura | `porter-first-call` **mantém o id** e passa a ser a instrução do quadro (a `porter-atrium-panel` de B.1, que não é criada). `porter-hello` é chamada nova, sem alias, devida a todo save | o id antigo está em todo save, em `PRE_OPENING_SAVE` e no registro de L2; a migração de abertura continua certa palavra por palavra («com o saguão aceso, essa chamada é história»). E quem já conhecia o Jorge ouve uma vez «É o Jorge de novo», com o que L3 pôs no cânone |
| DL3-3 | o que é «save anterior a L3» | **evidência no save**, não o carimbo: quem nunca ouviu `porter-hello` e já passou de um marco tem a chamada desse marco como ouvida; gaveta aberta sem o gatilho `lock:office-drawer:opened` disparado ganha a flag `legacy-pre-L3-drawer` | o lote sai em fatias e `CONTENT_LOT` só anda na última (DL3-15): um save escrito por uma fatia do meio leva carimbo 2 e não é antigo. A evidência não depende de quando o carimbo andou, e vale também para a aba que recebe do disco o que uma aba de L2 gravou. Custo aceito: um jogador novo que saia do escritório sem o rádio, passe de um marco e recarregue antes de ouvir o Jorge perde a chamada desse marco; a dica do rádio cobre |
| DL3-4 | a identidade de uma linha da lista | a chave do texto (`labelKey`), como no registro de L2; sem `id` separado | `validateAdditive` compara por ela. As três linhas de hoje ficam com os mesmos átomos: `allRoomsPowered` e `allCatalogued` viram as listas que o instantâneo de L2 já gravou resolvidas (DL2-17) |
| DL3-5 | linha sem caixa que ganha caixa | o instantâneo grava `deferredUntilLot`; passar de «sem caixa» a uma condição só é aditivo para a linha que era promessa datada | é a promessa sendo paga (L12). Sem a data no registro, qualquer linha muda de sentido calada |
| DL3-6 | o que deixa o `kit`, e onde mora a promessa datada | o pódio, o púlpito e o telefone passam a **dispositivos** (clonados, com estado); o cofre passa a **container**. `DeviceLayer` registra colisor como `ContainerLayer`. A promessa datada de uma coisa do mundo é um tipo de dispositivo (`notice`), não um campo de `KitPlacement` | um aviso, uma lâmpada, um disco e uma porta precisam de mira e de nó próprio, e uma colocação de kit é instanciada, sem id nem mira. O número de draws não sobe: cada nó era um lote instanciado de uma cópia só |
| DL3-7 | a lâmpada e o Livro no púlpito | a lâmpada (`__led`) só é **desenhada** enquanto há termo apresentado e por assinar; o Livro (`__book`) só é desenhado depois da primeira assinatura. Em L3 nunca os dois | o átrio está em 101 draws de 102 em R04 e o par de salas em 125 de 125 [medido, HANDOFF §11.3]. Assim o púlpito desenha no máximo os quatro nós de hoje, e o teto temporário de ÁT-K1 não é gasto |
| DL3-8 | o Livro no cofre | não há malha do Livro dentro do cofre. Abrir o cofre lê os dois documentos (o Livro passa à mão do curador) e deixa à vista a prova de etiqueta na prateleira | a leitura é concedida na mesma tecla que abre (DL3-9): uma malha do Livro ali seria desenhada por zero quadros |
| DL3-9 | quando um documento conta como lido | ao abrir o container, todos, como hoje; o leitor é que mostra um por vez | a ação `container:holyoke-cabinet-a` está no registro de L2 concedendo os dois documentos e o fato; conceder por página seria `grant-removed` (R1) |
| DL3-10 | o gesto de segurar | um redutor puro (`holdStep`) com quatro eventos: pressionar, quadro, soltar, cancelar. Soltar antes de 0,3 s abre «Assinar / Cancelar»; soltar depois, e antes do fim, cancela; 1,2 s assina; perder a mira cancela | D11 e S18. O tempo conta por quadro, com o mesmo teto de passo do relógio (0,25 s), para uma aba congelada não assinar sozinha |
| DL3-11 | o que a assinatura grava | o verbo grava `termsSigned`; a flag do termo (`posse-signed`) é um gatilho compilado do termo (`term:<id>:signed`) | «o verbo grava o que o jogador FEZ; o que segue é gatilho» (`progressGrants.ts`). O gatilho alcança um save que tenha o termo sem a flag |
| DL3-12 | a sequência dirigida | lista própria do conteúdo (`sequences`), tocada pelo HUD; corta o rádio com `stopRadio` (a chamada cortada não conta como ouvida e volta depois); só entra em `sequencesSeen` no último passo | M42. Uma chamada de rádio com `directed: true` dependeria do aparelho; a sequência não tem aparelho |
| DL3-13 | o recado gravado | toca pelo mesmo canal de legenda do rádio; as linhas faladas **são** a transcrição do documento (`DocumentData.lineKeys`), sem texto em dobro; o documento entra em `documentsRead` quando a última linha termina | o dicionário viaja com a tela de título: 1,2 kB de recado duas vezes não |
| DL3-14 | fala presa à chuva | `radio.deadAir.rain` ganha `when: { flagsUnset: ['basement-drained'] }`. A flag só é posta em L12 (a bomba): `flag-never-set` vira dívida datada até L12 | o plano mestre (2.2) diz que a chuva para «depois da bomba». Em L3 chove a noite inteira, e a condição já é a que L12 precisa; um `when` que perguntasse outra coisa seria só para calar o lint |
| DL3-15 | quando `CONTENT_LOT` passa a 3 | na última fatia (F5), junto com a medição dos dez pontos, o rascunho de `L3.graph.json` e a última dívida paga. Cada dívida sai da tabela no commit que a paga (`known-debt-stale` obriga) | F1 a F4 não mudam o que uma sala desenha a ponto de pedir medição, e o registro de L2 continua sendo o juiz delas |
| DL3-16 | a dica em três alturas | `RadioHint.heightKeys` (uma chave por altura) no lugar de `lineKeys`; a altura sobe a cada chamada com a mesma dica e volta a zero quando a dica muda; fica em `RadioMemory.hintHeight` | 8.3. `hintRungs`, por objetivo e partilhado com o painel da tranca, é de L4 |
| DL3-17 | `mentions` em L3 | toda chamada, dica, resposta nova, sequência, linha da lista e documento declara os ids do build a que manda o jogador; `speech-mentions-missing` confere cada um contra os ids de sala, peça, documento, tranca, container, dispositivo, quadro e porta | R7. O que é pano de fundo (o ônibus, a estrada, a porta de enrolar, a seguradora) não é id e não se declara |
| DL3-18 | o caderno abre em que aba | em «Caderno» (a lista), não mais em «Planta» | 8.7 põe a lista na frente, e em L9 a planta passa a depender do folheto |
| DL3-19 | onde o plano mestre dizia outra coisa | (a) o cofre é de `officeDecor.mjs`, não de `officeProps.mjs`; (b) a dica do púlpito diz «entre as duas portas da parede da Ala 1», não «perto do plinto»: o púlpito está em (−7,15; 2,2) até L9; (c) a folha da gaveta não diz «há caminho» nem «a etiqueta no verso» antes de L11 e L4; (d) `porter-hello` não manda pegar o rádio: «me chama no rádio» é verdade com o rádio na mesa e no bolso; (e) a dica da gaveta diz «arquivo de proveniência, perto da entrada da ala» (o arquivo fica a 7 m do retrato, não «ao lado»); (f) o recado diz «desde esta tarde» e a prova «É a linha que eu não sei…», sem «hoje» nem «única» (`text-ages` lê documentos); (g) em inglês, termo é *deed* e o Livro é *the Book of Deeds* | R7 e os portões de texto que já existem |

## 3. Formas de dado

### 3.1 O save (`src/state/progressFields.ts`)

```ts
export type RadioMemory = {
  // as of today, plus:
  /** How far up the hint he last gave he has gone: 0 where, 1 what, 2 how. */
  readonly hintHeight: number
}

export type Progress = {
  // as of today, plus:
  /** Terms the curator signed, by id. A signature is never taken back. (F4) */
  termsSigned: string[]
  /** Directed sequences shown to their last step; each plays once. (F4) */
  sequencesSeen: string[]
}
```

| Campo | Tipo | Padrão | Sanitizador | Junção entre abas | Conta como progresso | Fatia |
|---|---|---|---|---|---|---|
| `termsSigned` | `string[]` | `[]` | `stringList` | união (`idList.join`) | sim | F4 |
| `sequencesSeen` | `string[]` | `[]` | `stringList` | união | não: é o registro do que já foi mostrado, como `triggersFired` | F4 |
| `radioMemory[*].hintHeight` | inteiro ≥ 0 | `0` | `wholeAtLeast(valor, 0) ?? 0`: ausente ou lixo vira 0 e **não** derruba a entrada | `laterCall` (a chamada mais recente leva a altura dela; entra em `FRESH_RADIO_MEMORY`, de onde `RADIO_MEMORY_FIELDS` sai) | — | F2 |

Nenhum campo novo tem regra «o da aba»: `withTabsOwn` não muda. `flags` e `credentials` já existem
e passam a ter conteúdo de verdade (a chave, `clock-set`, `posse-signed`, `legacy-pre-L3-drawer`).

### 3.2 Migração e aliases (`src/state/saveMigrations.ts`, `src/content/legacySave.ts`)

```ts
// legacySave.ts
/** What a save from before the Posse needs: the porter's old news, and the drawer that held a key. */
export const PRE_POSSE_SAVE = {
  /** Whoever has not heard this has not met the porter of this lot. */
  helloCallId: 'porter-hello',
  /** A milestone passed before he had a line for it is not news. `id: null` is "any". */
  oldNews: [
    { callId: 'porter-atrium-service', field: 'roomsPowered', id: 'atrium' },
    { callId: 'porter-holyoke-lit', field: 'roomsPowered', id: 'holyoke' },
    { callId: 'porter-shortcut', field: 'doorsReleased', id: 'atrium-from-holyoke-shortcut' },
    { callId: 'porter-first-catalogued', field: 'catalogued', id: null },
  ],
  /** F5. Open, and the trigger that hands over its key never fired: it was opened before there was one. */
  drawer: { lockId: 'office-drawer', triggerId: 'lock:office-drawer:opened', flag: 'legacy-pre-L3-drawer' },
} as const satisfies { /* typed by ListField */ }

export const SAVE_ALIASES: readonly SaveAlias[] = [
  // F5. The note gave way to the handover sheet; a save that read one has read the other.
  { sinceLot: 3, field: 'documentsRead', from: 'doc-predecessor', to: 'doc-otavio-handover' },
]

// saveMigrations.ts
export const SAVE_MIGRATIONS = [
  { lot: 1, migrate: preOpening },
  { lot: 2, migrate: locksSeenFromOpened },
  { lot: 3, migrate: prePosse },   // F2: the old news. F5: the drawer's flag.
]
```

`prePosse` é pura, idempotente e só acrescenta; não lê `savedLot` (DL3-3).

### 3.3 Condições (`src/content/schema.ts`, `src/engine/progressCondition.ts`)

```ts
export type ProgressCondition = {
  // as of today, plus:
  /** None of these flags is set. Presentation only. (F2) */
  readonly flagsUnset?: readonly string[]
  /** The player has not been in any of these rooms. Presentation only. (F2) */
  readonly roomsUnvisited?: readonly EraId[]
  /** All of these terms are signed. (F4) */
  readonly termsSigned?: readonly string[]
  /** All of these locks were touched, open or not. (F5) */
  readonly locksSeen?: readonly string[]
}
```

Classes (`CONDITION_FIELD_CLASS`): `termsSigned` e `locksSeen` positivas; `flagsUnset` e
`roomsUnvisited` negativas (só em apresentação: fala, dica, `appearsWhen`, caducidade).
`ConditionProgress` ganha `termsSigned?` e `locksSeen?`. `CONDITION_ATOMS` (`simulate.ts:387-415`)
ganha as quatro linhas: `term:<id>`, `seen:<id>`, `not(flag:<id>)`, `not(room:<id>)`.

### 3.4 A lista (`schema.ts`; `src/engine/checklist.ts`, novo)

```ts
/** One count shown beside a line: how many of these hold. Lists of positives only. */
export type ChecklistCounter = {
  /** Omitted: the count stands alone («2 de 3»). */
  readonly titleKey?: string
  readonly of: Pick<ProgressCondition, 'powered' | 'catalogued' | 'documentsRead' | 'locksOpened'>
}

export type ChecklistItem = {
  /** The line, and its identity: the graph snapshot knows it by this key. */
  readonly labelKey: string
  /** Ink is the director's; pencil is the curator's own. */
  readonly author: 'helena' | 'curator'
  /** State, never "a call was heard". Omitted: there from the start. */
  readonly appearsWhen?: ProgressCondition
  /** Positive, with frozen ids. Omitted only for a dated promise. */
  readonly doneWhen?: ProgressCondition
  readonly counters?: readonly ChecklistCounter[]
  /** A dated promise: a line with no box to tick until this lot pays it. */
  readonly deferredUntilLot?: number
  /** A pencil note beside the line. */
  readonly noteKey?: string
  readonly mentions?: readonly string[]
}

// engine/checklist.ts — pure.
export type ChecklistRow = {
  readonly labelKey: string
  readonly author: ChecklistItem['author']
  /** `null`: a line with no box. */
  readonly done: boolean | null
  readonly noteKey: string | null
  readonly counters: readonly { readonly titleKey: string | null; readonly done: number; readonly of: number }[]
}
export function conditionTally(of: ChecklistCounter['of'], progress: ConditionProgress, content: ConditionContent): { done: number; of: number }
/** The lines a save shows, in authored order. */
export function checklistRows(items: readonly ChecklistItem[], progress: ConditionProgress, content: ConditionContent): readonly ChecklistRow[]
/** Pencil lines in `after` that `before` did not show: what the toast announces. */
export function checklistNews(items: readonly ChecklistItem[], before: ConditionProgress, after: ConditionProgress, content: ConditionContent): readonly string[]
```

A lista no fim do lote (as três primeiras em F1; as quatro a lápis em F5, com os objetos delas):

| # | `labelKey` | Mão | Aparece | Risca | Contadores |
|---|---|---|---|---|---|
| 1 | `notebook.todo.power` | helena | sempre | `powered: ['office', 'atrium', 'holyoke']` | um, sem título, sobre a mesma lista |
| 2 | `notebook.todo.catalogue` | helena | sempre | `catalogued:` as doze da casa, por extenso (dívida datada até L4) | `room.atrium.title` (as quatro); `room.holyoke.title` (as oito) |
| 3 | `notebook.todo.vault` | helena | sempre | — (`deferredUntilLot: 12`, `noteKey: 'notebook.todo.vault.note'`) | — |
| 5 | `notebook.todo.drawer` | curator | `anyOf: [{ documentsRead: ['doc-otavio-tape'] }, { locksSeen: ['office-drawer'] }]` | `locksOpened: ['office-drawer']` | — |
| 6 | `notebook.todo.safe-key` | curator | `locksOpened: ['office-drawer']` | `locksOpened: ['office-safe']` | — |
| 7 | `notebook.todo.posse` | curator | `documentsRead: ['doc-termos']` | `flags: ['posse-signed']` | — |
| 8 | `notebook.todo.proof` | curator | `documentsRead: ['doc-label-proof-office']` | — (`deferredUntilLot: 12`) | — |

(A linha 4, do plinto, é de L11.)

### 3.5 Promessa datada e dispositivos (`schema.ts`; `src/engine/deviceRules.ts`)

```ts
type DevicePlacement = { /* as of today */ }

export type DeviceData =
  | (DevicePlacement & {
      readonly kind: 'clock'
      readonly stoppedAt: { readonly hours: number; readonly minutes: number }
      readonly runsWithPowerOf: EraId
      /** Named in the prompt once it can be set. (F2) */
      readonly titleKey?: string
      /** E on it, with power, sets this flag: from then on it shows the night's hour. (F2) */
      readonly setFlag?: string
    })
  // 'power-indicator' and 'radio': as of today.
  | (DevicePlacement & {
      /** Something seen and not used yet: it says so, and takes no key. (F1) */
      readonly kind: 'notice'
      readonly titleKey: string
      readonly noticeKey: string
      /** The lot that gives it its use. The gate fails once it has come. */
      readonly deferredUntilLot: number
    })
  | (DevicePlacement & {
      /** A thing that speaks when worked: a dead line, a recorded message. (F3) */
      readonly kind: 'voice'
      readonly titleKey: string
      readonly speakerKey: string
      /** What the prompt says E does; defaults to «Ouvir». */
      readonly promptKey?: string
      /** Mains: silent without this room's power. Omitted: it answers in the dark. */
      readonly poweredBy?: EraId
      /** Needs `<part>__led`: it blinks while a recording waits unheard. */
      readonly messageLamp?: boolean
      /** The first whose `when` holds is what it says. Never empty; the last holds always. */
      readonly utterances: readonly VoiceUtterance[]
    })
  | (DevicePlacement & {
      /** Where terms are signed. Needs `<part>__led` and `<part>__book`. (F4) */
      readonly kind: 'signing-desk'
      readonly titleKey: string
      /** What it says while no term has been brought to it. */
      readonly emptyNoticeKey: string
      /** The terms signed here, oldest first. */
      readonly termIds: readonly string[]
      readonly holdSeconds: number
    })

export type VoiceUtterance = {
  readonly when: ProgressCondition
  /** `call`: lines of its own. */
  readonly lineKeys?: readonly string[]
  /** `play-once`: a recording. Its lines are the document's, and hearing it out files the document. */
  readonly documentId?: string
}
```

```ts
// deviceRules.ts — pure. One answer for the prompt, the key and the touch button.
export type DeviceIntent =
  | { readonly kind: 'none' }                                           // nothing to aim at
  | { readonly kind: 'notice' }                                         // says its notice; never takes the key
  | { readonly kind: 'radio'; readonly intent: DeskRadioIntent }
  | { readonly kind: 'clock'; readonly intent: 'set' }
  | { readonly kind: 'voice'; readonly intent: 'dead' | 'play' | 'again' | 'skip' }
  | { readonly kind: 'desk'; readonly state: SigningDeskState }         // 3.10

export function deviceIntent(device: DeviceData, input: DeviceInput): DeviceIntent
/** Whether E does anything: false for a notice, a dead radio, a dead machine, an empty desk. */
export function deviceLive(intent: DeviceIntent): boolean
/** Every device the crosshair may rest on, with its room. */
export function aimableDevices(content: Pick<MuseumContent, 'rooms'>): readonly { room: RoomData; device: DeviceData }[]
```

`PROXY_MINIMUM` ganha `device: [0.3, 0.2, 0.3]`, o mínimo de todo dispositivo que não é rádio.

### 3.6 Rádio (`schema.ts`)

```ts
export type RadioCall = {
  readonly id: string
  readonly when: ProgressCondition
  /** Once this holds the call is gone for good, heard or not. Positive. */
  readonly lapsesWhen?: ProgressCondition
  readonly delaySeconds: number
  readonly lineKeys: readonly string[]
  /** Ids of the build this call sends the player to. */
  readonly mentions: readonly string[]
}

export type RadioHint = {
  readonly when: ProgressCondition
  /** What the hint points at: an id the player can walk up to. Omitted only by the fallback. */
  readonly targetId?: string
  /** One key per height: where, what, how. One to three; the last is repeated. */
  readonly heightKeys: readonly string[]
  readonly curtLineKeys?: readonly string[]
  readonly mentions: readonly string[]
}

export type RadioReply = {
  // as of today, plus:
  /** Only said while this holds. Omitted: said in any night. */
  readonly when?: ProgressCondition
}
export type RadioOutburst = { /* as of today, plus `when?` */ }
```

`dueRadioCalls` passa a pedir `when` ∧ ¬`lapsesWhen`. `porterAnswer` sorteia só entre as respostas
cujo `when` vale; se nenhuma do nível vale, cai nas sem `when` (o validador exige ao menos uma por
nível: `radio-patience-silent`). `deadAirFor` filtra do mesmo jeito.

### 3.7 O relógio da noite (`schema.ts`; `src/engine/nightClock.ts`, novo)

```ts
export type NightMilestone =
  | { readonly id: string; readonly when: ProgressCondition }                       // positive only
  | { readonly id: string; readonly cataloguedAtLeast: number; readonly of: readonly string[] }

export type NightClock = {
  /** What the first milestone shows. */
  readonly startsAt: { readonly hours: number; readonly minutes: number }
  readonly stepMinutes: number
  /** A closed list: each one met is a point, in any order. */
  readonly milestones: readonly NightMilestone[]
  /** What the porter says at each count of points, from one up: spelt out and rounded. */
  readonly phraseKeys: readonly string[]
}
// MuseumContent: + readonly nightClock?: NightClock

// nightClock.ts — pure.
export function nightPoints(clock: NightClock, progress: ConditionProgress, content: ConditionContent): number
/** Null before the first point: the clock has no power and shows the minute it stopped. */
export function nightTime(clock: NightClock, points: number): { hours: number; minutes: number } | null
export function nightPhraseKey(clock: NightClock, points: number): string | null
/** `{hora}` in a spoken line, filled with the phrase; the line as it is when there is none. */
export function fillHour(line: string, phrase: string | null): string
```

Marcos: `lamp` (`powered: ['office']`), `atrium`, `holyoke`, `drawer` (`locksOpened`), quatro de
catálogo (3, 6, 9 e 12 das doze da casa) em F2; `safe` (`locksOpened: ['office-safe']`) e `posse`
(`flags: ['posse-signed']`) em F5. Dez em L3; os cinco das medalhas e da luz geral entram em L11.
19h10 no primeiro, 30 min por ponto. A Posse nunca é assinada antes do sexto ponto.

### 3.8 Credenciais, tranca de ferramenta e container (`schema.ts`; `lockRules.ts`)

```ts
export type MedallionId = 'curator' | 'founding' | 'lineage'
export type ToolId = 'service-key' | 'crate-dolly' | 'step-ladder'

export type CredentialData = {
  readonly credential: Credential
  readonly titleKey: string
  readonly icon: 'key' | 'medallion' | 'badge' | 'tool'
}
// MuseumContent: + readonly credentials?: readonly CredentialData[]
// LockBase:      + readonly promptKey?: string     what the prompt says while it is shut

export type ContainerData = {
  // as of today, plus:
  /** Nodes `<part>__<prefix>*` swing on a hinge once the lock is open (or at once, with no lock). */
  readonly door?: { readonly nodePrefix: string; readonly hingeAt: Vec2 /* x, z */; readonly openAngle: number }
  /** Nodes drawn only while the container stands open. */
  readonly contents?: readonly { readonly node: string }[]
}
```

```ts
// lockRules.ts
/** Credential keys spent: a consumed tool whose one lock is open. */
export function toolSpent(locks: readonly Lock[], progress: Pick<Progress, 'locksOpened'>): readonly string[]
```

`attemptLock`, na tabela de L2: a linha «`tool` com `consumesTool: true` → `refused: 'unsupported'`»
passa a ser igual à de `tool` sem consumo (a credencial na lista abre; `ritual` continua
`unsupported`). O que muda com o consumo é só `toolSpent`.

### 3.9 Documentos e leitor (`schema.ts`; `src/engine/readingQueue.ts`, novo)

```ts
export type NotebookPage = {
  readonly style: 'printed' | 'handwritten' | 'checklist' | 'term'
  /** `term`: the page is the term's body and its signature line. */
  readonly termId?: string
  // the rest as of today
}

export type DocumentData = {
  // as of today, plus:
  readonly kind: /* today's */ | 'ledger' | 'proof'
  /** A recording's transcript, line by line: what the device says and what the archive prints. */
  readonly lineKeys?: readonly string[]
  /** `containerId` may name the voice device that plays it. */
  readonly mentions?: readonly string[]
}

// readingQueue.ts — pure.
export type ReadingPage =
  | { readonly documentId: string; readonly kind: 'body'; readonly titleKey: string; readonly bodyKey: string }
  | { readonly documentId: string; readonly kind: 'page'; readonly titleKey: string; readonly page: NotebookPage }
  | { readonly documentId: string; readonly kind: 'transcript'; readonly titleKey: string; readonly lineKeys: readonly string[] }
/** Every page a container hands over, one document after another, each in its own page order. */
export function containerReadQueue(content: Pick<MuseumContent, 'documents'>, containerId: string | null): readonly ReadingPage[]
```

O estado da página é o `notebookPage` que o store já tem (zera a cada container aberto); a regra de
avançar é `notebookAdvance`, a mesma do caderno.

### 3.10 Termos, mesa de assinatura e o gesto (`schema.ts`; `src/engine/termRules.ts`, `holdAction.ts`, novos; `primaryAction.ts`)

```ts
export type Term = {
  readonly id: string
  readonly titleKey: string
  readonly bodyKey: string
  /** From here on the desk names it and its lamp is lit. Positive. */
  readonly presentedWhen: ProgressCondition
  /** What signing asks. Positive, frozen ids (R2). Asks everything `presentedWhen` asks. */
  readonly when: ProgressCondition
  /** The flag the signature sets, through the trigger `term:<id>:signed`. */
  readonly grants: string
  readonly mentions: readonly string[]
}
// MuseumContent: + readonly terms?: readonly Term[]      oldest first

// termRules.ts — pure.
export function termGrant(term: Term): ProgressGrant                       // { termsSigned: [term.id] }
/** The oldest unsigned term of this desk that has been presented, or null. One term to a gesture. */
export function pendingTerm(terms: readonly Term[], desk: SigningDesk, progress: ConditionProgress, content: ConditionContent): Term | null
/** What `when` still asks, by kind, in authored order. Empty: it can be signed. */
export function termBlockers(term: Term, progress: ConditionProgress, content: ConditionContent): {
  readonly rooms: readonly string[]
  readonly documents: readonly string[]
  /** Anything else `when` asks and the save lacks. */
  readonly other: boolean
}
export type SigningDeskState =
  | { readonly state: 'empty' }                                             // nothing brought, nothing signed
  | { readonly state: 'blocked'; readonly term: Term; readonly blockers: ReturnType<typeof termBlockers> }
  | { readonly state: 'ready'; readonly term: Term }
  | { readonly state: 'signed' }                                            // every presented term is signed
export function signingDeskState(...): SigningDeskState
```

```ts
// holdAction.ts — pure.
export const HOLD_TAP_SECONDS = 0.3
export const HOLD_MAX_STEP_SECONDS = 0.25
export type HoldRequest = { readonly id: string; readonly seconds: number }
export type HoldGesture =
  | { readonly phase: 'idle' }
  | { readonly phase: 'holding'; readonly id: string; readonly seconds: number; readonly held: number }
  | { readonly phase: 'confirming'; readonly id: string }
export type HoldEvent =
  | { readonly kind: 'press'; readonly request: HoldRequest }
  | { readonly kind: 'tick'; readonly seconds: number; readonly aimed: string | null }
  | { readonly kind: 'release' }
  | { readonly kind: 'cancel' }
export function holdStep(gesture: HoldGesture, event: HoldEvent): { readonly gesture: HoldGesture; readonly fired: string | null }
```

| Estado | `press` | `tick` | `release` | `cancel` |
|---|---|---|---|---|
| `idle` | `holding` em 0 | fica | fica | fica |
| `holding` | ignorado (a mesma entrada não desce duas vezes) | mira em outro alvo → `idle`; `held` ≥ `seconds` → `idle` e **dispara**; senão soma o passo, limitado a 0,25 s | `held` < 0,3 s → `confirming`; senão `idle` | `idle` |
| `confirming` | mesmo id → `idle` e **dispara**; outro id → `holding` nele | mira em outro alvo → `idle` | fica | `idle` |

```ts
// primaryAction.ts
/** A handler acts (true), declines (false), or asks for the press to be held. */
export type PrimaryActionHandler = () => boolean | HoldRequest
/** The input went down: at most one handler answers. */
export function pressPrimaryAction(): 'none' | 'acted' | 'holding'
/** The input came up. */
export function releasePrimaryAction(): void
export function cancelPrimaryHold(): void
/** One frame of a hold in progress, with what is under the crosshair now. */
export function tickPrimaryHold(seconds: number, aimed: string | null): void
export function primaryHold(): HoldGesture
export function subscribePrimaryHold(listener: () => void): () => void
export function onPrimaryHoldFired(listener: (id: string) => void): () => void
/** A press and its release at once: what a click is. Kept for whatever cannot tell down from up. */
export function triggerPrimaryAction(): boolean
```

### 3.11 Sequência dirigida (`schema.ts`; `src/engine/sequenceRules.ts`, novo; `store.ts`)

```ts
export type SequenceStep =
  | { readonly kind: 'card'; readonly titleKey: string; readonly seconds: number }
  | { readonly kind: 'line'; readonly speakerKey: string; readonly lineKey: string }
export type DirectedSequence = {
  readonly id: string
  /** Positive: once owed, owed until it has been seen to its last step. */
  readonly when: ProgressCondition
  readonly steps: readonly SequenceStep[]
  readonly mentions: readonly string[]
}
// MuseumContent: + readonly sequences?: readonly DirectedSequence[]

// sequenceRules.ts — pure.
/** The first sequence owed and not seen, in authored order: one at a time. */
export function dueSequence(sequences: readonly DirectedSequence[], progress: ConditionProgress & Pick<Progress, 'sequencesSeen'>, content: ConditionContent): DirectedSequence | null

// store.ts — session, never saved.
type SequencePlaying = { readonly id: string; readonly index: number; readonly steps: number; readonly serial: number }
// MuseumStore: + sequence: SequencePlaying | null
//              + startSequence(id: string, steps: number): void   also stops the radio
//              + advanceSequence(): void                           the last step grants { sequencesSeen: [id] }
//              + stopSequence(): void                              records nothing
```

`RadioTransmission` ganha `grantOnEnd?: ProgressGrant` (F3): o que o fim da transmissão grava,
ao lado de `callId`. É como o recado entra em `documentsRead`.

### 3.12 Simulação e instantâneo (`src/content/simulate.ts`, `additive.ts`)

```ts
export type PlayerAction =
  | /* the six of today */
  | { readonly kind: 'set-clock'; readonly deviceId: string }                       // F2
  | { readonly kind: 'voice'; readonly deviceId: string }                           // F3
  | { readonly kind: 'sign'; readonly deviceId: string; readonly termId: string }   // F4
```

`ATOM_PREFIX` ganha `termsSigned: 'term'` e `sequencesSeen: null`. `saveIdsByField` ganha as duas
linhas; `ID_COLLECTIONS` ganha `terms: ['termsSigned']` e `sequences: ['sequencesSeen']`.

```ts
export type GraphSnapshot = {
  // as of today, with:
  readonly checklist: readonly { readonly id: string; readonly doneWhen: readonly string[] | null; readonly deferredUntilLot?: number }[]
  readonly terms: readonly { readonly id: string; readonly when: readonly string[] }[]   // filled from content.terms
}
```

`deferredUntilLot` só é escrito quando existe: o arquivo de L2 continua lendo e escrevendo igual,
byte a byte. `validateAdditive` passa a comparar os termos (`term-condition-changed` para termo que
sumiu ou cujo `when` não é o mesmo conjunto de átomos) e aceita «sem caixa → condição» só de linha
que o registro dava como datada (DL3-5).

## 4. Tarefas

Formato: **hoje** (arquivo:linha), **mudança**, **teste** (o que prova) e **vermelho hoje** (como o
teste reprova o estado atual antes do conserto, §9.1 passo 2).

### T1 — A lista como dado (M32; ÁT-I2; S10; P4, P6) · F1

**Hoje.** `schema.ts:381-384` (`ChecklistItem` com `labelKey` e `doneWhen`); `museum.ts:600-607`
(três itens: `allRoomsPowered`, `allCatalogued`, o do cofre sem `doneWhen`); `Notebook.tsx:30-51`
desenha caixa em toda linha; `simulate.ts:970-989` acusa a linha sem `doneWhen`
(`checklist-item-untickable`, datada para L3 em `knownDebt.ts:151-157`); `additive.ts:174-179`
grava a lista só com `id` e `doneWhen`.

**Mudança.**

1. `schema.ts`: `ChecklistItem` e `ChecklistCounter` de 3.4.
2. `src/engine/checklist.ts` (novo): `conditionTally`, `checklistRows`, `checklistNews`.
3. `museum.ts:602-606`: as três linhas de 3.4, com as listas por extenso (uma constante
   `HOUSE_PIECES` com os doze ids, na ordem do conteúdo, e `HOUSE_ROOMS`).
4. `Notebook.tsx:30-51`: desenha de `checklistRows`: tinta ou lápis pela classe `is-helena` /
   `is-curator`; `done === null` não desenha caixa e desenha a nota; contador como
   «{feitos} de {total}» (`notebook.counter`), com o título da sala quando há.
5. `simulate.ts:970-989`: linha com `deferredUntilLot` e sem `doneWhen` não é acusada; com os dois é
   `checklist-deferred-with-box`; `appearsWhen` fora do ponto fixo é `checklist-item-untickable`
   («nunca aparece»). `conditionsOf` (`:791-810`) passa a ler `appearsWhen`.
6. `validate.ts` (novo `validateDeferred(content, lot)`, chamado de `validateContent` quando há
   `extras.knownDebt`): `deferred-overdue` para linha ou aviso cuja data chegou;
   `deferred-without-notice` para linha datada sem `noteKey` e aviso sem `noticeKey`. O portão
   imprime as promessas com as dívidas (`formatKnownDebt` ganha a tabela «promessas datadas»).
7. `additive.ts:174-179, 205-224, 364-379`: `deferredUntilLot` no instantâneo e a regra de DL3-5.
8. `knownDebt.ts:151-157`: sai a linha de `notebook.todo.vault` (paga).

**Teste.** `test:opening` (`scripts/test-opening.ts:210-228`, reescrito): toda linha tem `doneWhen`
ou `deferredUntilLot`; a linha 1 risca com as três salas e mostra «0 de 3 … 3 de 3»; a linha 2
mostra «Átrio 0 de 4» e «Ala 1 · Holyoke 0 de 8»; a linha 3 nunca tem caixa e leva a nota; uma sala
acrescentada a um conteúdo de teste não desrisca a linha 1 (lista congelada). `test:playthrough`
(caso do instantâneo): com um registro feito para o teste, «sem caixa → condição» é acusado sem
data e aceito com ela. `test:opening` («each validator the gate lacked…»): `checklist-deferred-
with-box`, `deferred-overdue`, `deferred-without-notice` em museus quebrados de propósito.

**Vermelho hoje.** `checklistRows` não existe; e, escrito contra o conteúdo de hoje, «uma sala a
mais não desrisca a linha 1» reprova (`allRoomsPowered` olha todas as salas do build).

### T2 — A promessa datada e o pódio que responde (M35; ÁT-D1; R4) · F1

**Hoje.** `museum.ts:1034`: o pódio é uma colocação de `kit`, sem mira nem texto.
`Devices.tsx:67-69, 351-404, 426-428`: só o rádio é mirável (`RADIOS_BY_ID`, `aimableDeviceId`), e
`DeviceLayer` (`:279-341`) não registra colisor. `interactionTarget.ts:148-157` resolve `live` só
para rádio. `Hud.tsx:198-220` (`DevicePrompt`) só conhece rádio.
`scripts/lib/museumWorld.ts:567-580` só dá volume a rádio.

**Mudança.**

1. `schema.ts`: `DeviceData` ganha `notice` (3.5).
2. `deviceRules.ts`: `DeviceIntent`, `deviceIntent`, `deviceLive`, `aimableDevices` (3.5); o rádio
   passa por eles sem mudar de comportamento.
3. `Devices.tsx`: o proxy de `RadioDeviceView` vira `<DeviceProxy>` para todo dispositivo mirável;
   `aimableDeviceId` recebe o mapa de `aimableDevices`; `interact` despacha por `deviceIntent`
   (um aviso devolve `false`: não toma a tecla); `Device` chama `registerKitColliders` como
   `Containers.tsx:112-121`.
4. `interactionTarget.ts:148-157`: `live` vem de `deviceLive(deviceIntent(...))`.
5. `Hud.tsx:198-220`: `DevicePrompt` desenha por intenção; para `notice`: título, travessão, aviso,
   sem a tecla.
6. `museum.ts:1034`: sai do `kit`; entra em `devices` do átrio:
   `{ kind: 'notice', id: 'atrium-podium', part: 'atrium-central-podium', position: [0, 0, 0],
   rotationY: Math.PI / 2, titleKey: 'device.atrium-podium.title', noticeKey:
   'device.atrium-podium.notice', deferredUntilLot: 11 }`.
7. `museumWorld.ts:567-580`: volume para todo dispositivo de `aimableDevices`.
8. `validate.ts:1250-1277`: `notice` não pede nó (`device-node-missing` só para os tipos com
   contrato); `validateOpening:795-830` aceita os tipos novos em `watched`.

**Teste.** `test:opening-flow` (caso novo, com `interactionWinner`): com só o pódio na mira, o
vencedor é o dispositivo com `live: false` (o prompt aparece, a tecla e o botão de Ação não); com o
pódio e um quadro na mira, vence o quadro. `test:navigation` (inundação): o pódio tem ponto de pé
dentro do alcance, fora do próprio volume [a validar: de fora do anel de barreiras, a 2,05 m do
centro, o topo fica a 1,7 m do olho, contra 2,6 de alcance]; a cápsula continua parando no colisor
do pódio (colisão registrada pelo dispositivo). `test:kit-runtime`: caso novo «o que cada sala
desenha por dado» (§7). `runtimeWiring.ts`: `interactionVolumeWiringProblems` cobre `<DeviceProxy>`.

**Vermelho hoje.** O caso do prompt: `deviceIntent` não existe, e com o pódio como único foco o
vencedor de hoje é `null` (ele nem é alvo). Na inundação, a lista de alvos de hoje tem 26 e nenhum
é o pódio: a asserção «todo dispositivo mirável do conteúdo é um alvo julgado» reprova.

### T3 — Os nomes e as uniões (D34, CN9; D2; D13, CN12; CN19; a gaveta) · F1

**Hoje.** `schema.ts:173` (`'founding' | 'olympic' | 'global'`), `:176` (`breaker-handle`);
`museum.ts:194, 221, 248, 275` (`threads: ['ball']` nas quatro bolas do saguão);
`pt-BR.ts:107` («Gaveta trancada do curador»), `:128` («…no cofre.»), `:159-162` (a carta),
`:167-169` (a lista); `en.ts:91, 149-151`; `Hud.tsx:111-136` (o prompt diz «Trancado» e o título).
`scripts/test-locks.ts:60` usa `olympic`; `scripts/test-power.ts:106, 116` usa `breaker-handle`.

**Mudança.** As uniões de 3.8; `threads: []` nas quatro bolas, com o comentário de D13 (mesa de
toque: réplicas de manuseio, fora do fio da bola; contam para a medalha da Linhagem em L11);
`LockBase.promptKey` e `lock.office-drawer.prompt`; `ContainerPrompt` passa a mostrar «título —
o que a tranca diz» enquanto fechada e «Ler — título» depois; os textos de §6.1. Os dois testes
trocam de id (`lineage`, `crate-dolly`), sem mudar de sentido.

**Teste.** `test:opening-flow`, caso novo «dois cofres, dois nomes»: nas duas línguas, a linha da
lista e a terceira linha do título dizem «caixa-forte» / *vault*; nenhuma chave diz «cofre» sem
«de ferro» (pt-BR) nem *safe* sem *iron* (en), fora das falas em que o Jorge explica a diferença
(lista de exceções por chave: em F1 só `document.predecessor.body`, o bilhete que sai em F5; daí em
diante, vazia). Caso novo «a gaveta aberta não se chama trancada»: o
título do container não tem «trancad». `test:playthrough`: nenhuma peça do saguão declara fio
(`thread-single-room` fica para L17; aqui é asserção direta).

**Vermelho hoje.** «…no cofre.» em `intro.line3` e «Cofre — só o Otávio…»; «Gaveta trancada».

### T4 — A aba «Caderno» (CN6; 8.7; DL3-18) · F1

**Hoje.** `store.ts:276` (`JournalTab` sem a aba); `Journal.tsx:169-180, 195-200` e
`Hud.tsx:714-717` abrem em `'map'`.

**Mudança.** `JournalTab` ganha `'notebook'`; `hudRules.ts` ganha `JOURNAL_HOME_TAB = 'notebook'`,
lido nos dois lugares; `Journal.tsx` ganha `NotebookTab`: a página da lista (`NotebookPageView`
sobre o primeiro documento com página `checklist`) e, de F4 em diante, «Termos assinados».

**Teste.** `test:opening-flow`: o caderno abre na aba da lista (asserção sobre a fonte, no molde de
`:343-373`: os dois lugares citam `JOURNAL_HOME_TAB` e nenhum cita `'map'` como destino de abrir);
`test:map`: `journalLayoutProblems` continua verde com cinco abas em 844 × 390. Nenhuma suíte de
hoje prende a aba de abertura: o caso é novo.

**Vermelho hoje.** `JOURNAL_HOME_TAB` não existe; `Journal.tsx:178` e `Hud.tsx:716` citam `'map'`.

### T5 — Chamadas de marco (M9; ÁT-A4; ÁT-A6 c; H-27) · F2

**Hoje.** `schema.ts:713-720` (`RadioCall` sem `lapsesWhen` nem `mentions`); `museum.ts:859-892`
(três chamadas; a primeira com `unpowered: ['atrium']`, de modo que quem acende o saguão antes de
ouvi-la nunca conhece o Jorge); `deviceRules.ts:88-98` (`dueRadioCalls`); `pt-BR.ts:172-181`.

**Mudança.**

1. `schema.ts`: `RadioCall` de 3.6. `deviceRules.ts:88-98`: `when` ∧ ¬`lapsesWhen`;
   `transmissionLapsed` (`:177-193`) passa a perguntar as duas.
2. `museum.ts:859-892`, na ordem em que são ouvidas:

| Id | `when` | `lapsesWhen` | Atraso | Linhas | `mentions` |
|---|---|---|---|---|---|
| `porter-hello` | `powered: ['office']` | — | 2,4 s | `radio.call.hello.1` a `.5` | `office-clock`, `office-radio` |
| `porter-first-call` | `powered: ['office'], unpowered: ['atrium']` (igual a hoje) | `powered: ['atrium']` | 1,2 s | `radio.call.first.1`, `.2` | `atrium-breaker`, `atrium`, `holyoke` |
| `porter-notebook-reminder` | como hoje | `documentsRead: ['doc-welcome']` | 4 s | como hoje | `office-notebook` |
| `porter-radio-taken` | como hoje | — | 0,8 s | como hoje | `office-radio` |
| `porter-atrium-service` | `powered: ['atrium']` | `powered: ['holyoke']` | 1,5 s | `radio.call.atrium.1` | `atrium-to-holyoke`, `holyoke-breaker` |
| `porter-holyoke-lit` | `powered: ['holyoke']` | `catalogued:` as oito da ala | 1,5 s | `radio.call.holyoke.1` | `holyoke` |
| `porter-first-catalogued` | `anyOf:` uma peça qualquer das doze | `catalogued:` as doze | 3 s | `radio.call.catalogued.1` | — |
| `porter-shortcut` | `doorsReleased: ['atrium-from-holyoke-shortcut']` (o id que o save guarda, DL2-1) | — | 2 s | `radio.call.shortcut.1` | `atrium-from-holyoke-shortcut` |

3. `legacySave.ts`, `saveMigrations.ts`: `PRE_POSSE_SAVE` (sem `drawer`) e `prePosse` (3.2).
   `validateOpening` (`validate.ts:864-891`): `legacy-save-call` para cada `callId` de
   `oldNews` e para `helloCallId`.
4. Textos de §6.2. Saem `radio.call.first.3` e `.4`.

**Teste.** `test:radio`:

- «cada marco tem exatamente uma chamada»: saguão aceso, Ala 1 acesa, primeira peça e atalho têm
  cada um uma chamada cujo `when` passa a valer com o marco, e nenhuma outra;
- os três cenários de ÁT-A6 pelo caminho real (o store e `placeRadioCall`); o (c): acender o
  saguão antes de qualquer chamada e voltar ao escritório ainda ouve `porter-hello`, e não ouve a
  instrução do quadro;
- «uma chamada que caducou não toca»: `porter-atrium-service` com a Ala 1 já acesa;
- ÁT-A4, «toca uma vez e não repete em save antigo»: cada save do corpus carregado; os que já
  tinham o saguão aceso não ouvem `porter-atrium-service`, e ninguém ouve duas vezes nada.

`test:save`: `prePosse` em cada save do corpus (antes e depois em §5), idempotente, só acrescenta;
e com abas vivas (`scripts/lib/liveTabs.ts`): uma aba de L2 simulada grava um save sem
`porter-hello`; a aba deste build o toma, marca as notícias velhas, e as duas se calam.
`test:opening`: `legacy-save-call` com um id trocado.

**Vermelho hoje.** O cenário (c): com o saguão aceso antes da chamada, `dueRadioCalls` devolve
vazio e o Jorge nunca se apresenta. «Cada marco tem uma chamada»: três marcos não têm nenhuma.

### T6 — A dica em três alturas (M9; furo 26; S25; B.2) · F2

**Hoje.** `schema.ts:723-728`; `museum.ts:895-922` (cinco dicas; a do caderno vale enquanto não foi
lido, em qualquer sala: bloqueia as outras, S25); `deviceRules.ts:201-216`;
`radioPatience.ts:112-190` (`porterAnswer` junta `hint.lineKeys` inteiro); `progressFields.ts:49-71`.

**Mudança.**

1. `schema.ts`: `RadioHint` de 3.6; `ProgressCondition` ganha `roomsUnvisited` e `flagsUnset`
   (3.3), com as duas linhas em `CONDITION_FIELD_CLASS`, em `CONDITION_ATOMS` e em
   `checkCondition` (`validate.ts:690-751`: `condition-room-missing` para a sala). Em
   `simulate.ts:950-957`, `flag-never-set` passa a ler também `flagsUnset`: esperar pela ausência
   de uma flag que nada põe é fiação solta, ou dívida datada (DL3-14).
2. `progressFields.ts`: `hintHeight` (3.1). `radioPatience.ts`: `porterAnswer` calcula
   `height = hintIndex === memory.lastHint ? min(memory.hintHeight + 1, top) : 0`, diz
   `hint.heightKeys[height]` (ou a dica curta, que não tem altura) e guarda a altura.
3. `museum.ts:895-922`, em F2 (a tabela inteira de L3 está em T19):

| Dica | `when` | `targetId` |
|---|---|---|
| caderno | `documentsUnread: ['doc-welcome'], roomsUnvisited: ['atrium']` | `office-notebook` |
| saguão | `unpowered: ['atrium']` | `atrium-breaker` |
| Ala 1 | `unpowered: ['holyoke']` | `holyoke-breaker` |
| gaveta | `locksClosed: ['office-drawer']` | `portrait-morgan` |
| resto | `{}` | — |

4. `simulate.ts`: `radio-hint-coverage`: em todo passo da jogadora exaustiva em que algum termo do
   build está por assinar e ainda é assinável, a dica que vale não é a última. (Em F2 não há termo:
   a regra é provada com uma casa feita para o teste, e vale no museu de verdade em F5.)
   `hint-points-to-nothing`: `targetId` que não é peça, container, dispositivo, quadro nem porta do
   build, ou dica sem `targetId` que não é a última.
5. Textos de §6.2; `radio.hint.vault` e `.curt` passam a se chamar `radio.hint.rest` e `.curt`.

**Teste.** `test:radio`: três chamadas seguidas com a mesma dica dizem onde, o quê e como, e a
quarta repete o como; a dica muda e a altura volta a zero; a dica curta contém o substantivo-alvo
da altura «o quê» (`HINT_TARGETS`, `:928-945`, refeito por altura); quem saiu do escritório sem ler
o caderno ouve a dica do saguão, não a do caderno (S25). `test:save`: `hintHeight` faz ida e volta,
lixo vira 0 sem derrubar a entrada, e entre duas abas vence a da chamada mais recente (abas vivas).
`test:opening`: os dois códigos novos em museus quebrados.

**Vermelho hoje.** S25: no saguão escuro, sem o caderno, o Jorge responde «Primeiro o caderno».

### T7 — Respostas que olham a noite antes de falar (M9; falha 66) · F2

**Hoje.** `schema.ts:735-748`; `museum.ts:749-753` (`porter-t4-dark`), `:796-800`
(`porter-t5-soap`), `:817` (`porter-air-rain`); `textLint.ts:490-502` dá toda resposta como
incondicional; `knownDebt.ts:174-188` (três linhas até L3); `radioPatience.ts:171-176, 192-198`.

**Mudança.** `when` em `RadioReply` e em `RadioOutburst`; `porterAnswer` e `deadAirFor` filtram
(3.6); `textLint.ts:490-502` lê `conditionAsks(answer.when)`. Conteúdo:

- `porter-t4-dark` e `porter-t5-soap`:
  `when: { anyOf: [{ unpowered: ['atrium'] }, { unpowered: ['holyoke'] }] }`;
- `porter-air-rain`: `when: { flagsUnset: ['basement-drained'] }` e o texto novo (§6.2);
- `porter-t3-torch` ganha `closingKeys: ['radio.patience.t3.torch.close']` (furo 14: por que o
  Jorge não vem);
- `radio.patience.t4.dark.close` passa a apresentar a Helena (1.2).

`knownDebt.ts`: saem as três linhas; entra `flag-never-set` de `basement-drained`, até L12 (§8).

**Teste.** `test:radio`: com as três salas acesas e o dado viciado para sortear cada uma, nem a
resposta do escuro nem a da novela saem em mil chamadas; com uma sala apagada, saem. `test:lints`:
as três chaves deixam de ser acusadas, e uma resposta nova com «chuva» e sem `when` é acusada.

**Vermelho hoje.** Com tudo aceso, `porter-t4-dark` sai («É medo do escuro, é?»).

### T8 — O relógio da noite (M33; P9; I-05) · F2

**Hoje.** `museum.ts:828-837` (o relógio, sem título nem gesto); `Devices.tsx:166-195`: anda de
16h47 pelo tempo de jogo e fica errado para sempre; nenhum `nightClock`.

**Mudança.**

1. `schema.ts`: `NightClock`, `NightMilestone` (3.7); `setFlag` e `titleKey` no relógio.
2. `src/engine/nightClock.ts` (novo). `deviceRules.ts`: `deviceIntent` do relógio é `set` com
   energia e sem a flag, `none` depois; `clockGrant(device)` em `progressGrants.ts`:
   `{ flags: [device.setFlag] }`.
3. `Devices.tsx:166-195`: com a flag, ponteiros de hora e minuto mostram `nightTime`; o de segundos
   continua correndo pelo `clockCount`. Sem a flag, como hoje. `interact`: `E` grava `clockGrant`.
4. `Hud.tsx`: `ClockToast` («Relógio acertado — {frase}»), pela regra `listGrew` sobre `flags`.
5. `museum.ts`: `nightClock` com os oito marcos de F2; `office-clock` com
   `setFlag: 'clock-set'` e `titleKey: 'device.office-clock.title'`.
6. `simulate.ts`: ação `set-clock`; uma flag posta por verbo de dispositivo conta em `flagsSet`, e
   a do relógio conta como lida pelo próprio relógio. `validateOpening`: `night-clock-phrases`
   (frases ≠ marcos), `night-milestone-not-positive`, ids das condições por `checkCondition`.
7. `scripts/lib/playthrough.ts`: a mão `set-clock`; `storeActions.ts` não muda (não há função nova).

**Teste.** `test:opening` (junto de `:389-420`): antes de acertar, o relógio anda de 16h47; depois,
mostra 19h10 com um ponto e 30 min a mais por ponto; sem energia não se acerta. `test:speech-
coherence` (T9): a contagem de pontos nunca diminui em 500 ordens. `test:playthrough`: `flag:clock-
set` entra em `MAXIMUM` e no nível `N0` (`:391-467`).

**Vermelho hoje.** `nightTime` não existe; o caso «acertado mostra 19h10» não tem o que chamar.

### T9 — Coerência das falas (6.4; R7) · F2

**Hoje.** `validate.ts:1864-1917` (`spokenKeys`, só o cardeal); `scripts/test-opening-flow.ts:
1284-1330` confere 130 caracteres numa suíte; `scripts/test-radio.ts:914-917` confere a
apresentação da Helena em duas chaves. Nenhuma suíte ouve o que toca.

**Mudança.**

1. `validate.ts`: `spokenKeys` passa a incluir, conforme forem chegando, falas de aparelho de voz
   (F3) e linhas de sequência (F4). `validateSpeech` ganha: `speech-line-too-long` (> 130
   caracteres; > 110 em resposta de paciência e dica curta), `speech-hour-in-digits` (ficha de
   classe `clock` de `numeralTokens` numa fala), `speech-token-unknown` (`{…}` que não é `{hora}`,
   ou `{hora}` sem `nightClock`), `speech-mentions-missing` (DL3-17),
   `speech-director-unintroduced` (chave que diz «Helena» sem «diretora» / *director*).
2. `scripts/lib/playthrough.ts`: `playToEnd` aceita um **ouvinte**: depois de cada tecla, pergunta
   a `nextRadioCall` e a `dueSequence` o que tocaria, anota (chamada, linhas, o save no instante) e
   marca como ouvido pelo store, como o diretor faz; a cada tantas teclas chama o Jorge
   (`placeRadioCall` com relógio e dado fixos) e anota a resposta.
3. `scripts/test-speech-coherence.ts` (novo; `test:speech-coherence` no `package.json` e no
   `check`, depois de `test:playthrough`), sobre as mesmas 500 sementes:
   - nenhuma chamada tocada tinha `lapsesWhen` valendo;
   - nenhuma linha com palavra de escuro tocou com as três salas acesas; nenhuma com palavra de
     chuva tocou com `basement-drained` (nenhuma, em L3);
   - a contagem de pontos da noite e o índice da frase nunca diminuem ao longo de uma ordem;
   - toda dica dada tinha o `when` valendo, e o alvo dela não estava «feito» (a condição negativa
     da própria dica);
   - cada chamada toca no máximo uma vez por noite; no perfil que leva o rádio desde o começo,
     cada marco alcançado tocou a sua;
   - o perfil «sem rádio» (o rádio fica na mesa) não ouve nada fora do escritório, e (de F4 em
     diante) vê toda sequência devida até o fim.

**Teste.** A própria suíte, mais mutações: tirar o `lapsesWhen` de `porter-atrium-service`, tirar
o `when` de `porter-t4-dark`, trocar a ordem de dois marcos por uma condição negativa. As três
reprovam.

**Vermelho hoje.** Rodada contra o conteúdo de hoje (antes de T5 a T7), a suíte reprova em
«palavra de escuro com tudo aceso»: `radio.patience.t4.dark`, em qualquer semente em que o robô
chama o Jorge sete vezes depois de acender a casa.

### T10 — A tranca de ferramenta num container (M6b; V3) · F3

**Hoje.** `lockRules.ts:91-94, 105-110` (`tool` com consumo → `unsupported`); `validate.ts:207-218`
(`lock-host-kind-unsupported` para toda tranca que não é de conhecimento num container);
`Containers.tsx:86-178` (sem porta nem conteúdo); `Containers.tsx:270-290` já trata `opened` e
`refused` sem painel.

**Mudança.**

1. `lockRules.ts`: sai o ramo `consumesTool` de `:110`; entra `toolSpent` (3.8).
2. `validate.ts:207-218`: container aceita `knowledge` e `tool`; quadro de sala continua só
   `knowledge`. Novos: `consumable-multi-consumer` (ferramenta consumida que mais de uma tranca
   pede), `container-node-missing` (porta ou conteúdo sem nó no bake).
3. `schema.ts`: `ContainerData.door`, `.contents` (3.8). `Containers.tsx`: um pivô na dobradiça,
   como `prepareClockHands` (`Devices.tsx:135-164`), reúne os nós `<part>__<prefixo>*` e gira até
   `openAngle` quando o container está aberto; os nós de `contents` ficam num grupo com
   `visible` igual a «aberto» (a mira rejeita o que tem ancestral oculto, como hoje).
   `src/engine/containerNodes.ts` (novo, puro sobre objetos three, no molde de `deviceNodes.ts`)
   para a suíte rodar em Node.
4. `simulate.ts`: nada além do que `attemptLock` já decide (`lockGuard`, `:437-451`, passa a ver a
   tranca de ferramenta como aberta pelo toque de quem tem a chave).

**Teste.** `test:locks`: a tabela de `attemptLock` com a linha nova (sem a chave: `refused:
'missing-credential'`, com `missing`; com a chave: `opened`; aberta: `open`); `toolSpent` antes e
depois; a chave continua em `credentials` depois de gasta, e duas abas vivas (uma abre o cofre de
um conteúdo de teste, a outra só tem a chave) ficam com a chave, a tranca aberta e a chave gasta
nas duas. `test:opening`: `consumable-multi-consumer` e `container-node-missing` em museus
quebrados. `test:opening-flow`: `containerNodes` gira a porta de um objeto feito para o teste sem
mover nó nenhum de lugar (a soma dos mundos antes e depois, como o caso do monofone em
`test-radio.ts:214-277`).

**Vermelho hoje.** `attemptLock` devolve `unsupported` para a chave que se gasta.

### T11 — Credencial como dado (M7a) · F3

**Hoje.** `validate.ts:926-931` («A credential is a member of the schema's own unions until
credentials are data (L3)»); nenhum toast.

**Mudança.** `MuseumContent.credentials` (3.8); `validate.ts`: `credential-undeclared` (uma
credencial que um efeito dá ou uma tranca pede e que não está na lista) e `credential-unused`
(declarada, e nada dá nem pede); `Hud.tsx`: `CredentialToast` («Você pegou — {título}») pela
regra `listGrew` sobre `credentials`, com o título vindo do dado. Em F3 a lista do museu é vazia.

**Teste.** `test:opening`: os dois códigos; `test:opening-flow`: o toast só anuncia crescimento
(uma credencial que já vinha no save, ou dada pelo gatilho na carga, não é anunciada).

**Vermelho hoje.** `credential-undeclared` não existe: um museu de teste que dá `tool:service-key`
sem declará-la passa no portão.

### T12 — O aparelho de voz e o telefone (M9; I-06; furo 13) · F3

**Hoje.** `museum.ts:1481`: o telefone é `kit`, mudo. `store.ts:278-299, 744-750`: uma transmissão
só grava `callId`.

**Mudança.**

1. `schema.ts`: `voice`, `VoiceUtterance`, `DocumentData.lineKeys` (3.5, 3.9).
   `store.ts`: `grantOnEnd` em `RadioTransmission`; `endRadio` (`:744-750`) junta as duas concessões
   num `commitProgress` só.
2. `deviceRules.ts`: `voiceUtterance(device, progress, content)` (a primeira que vale);
   `deviceIntent` para `voice`: `dead` sem a energia que pede, `skip` com a própria fala no ar,
   `again` quando o documento da gravação já foi lido, `play` no resto.
   `src/engine/voiceDevice.ts` (novo, sem React, no molde de `radioCall.ts`): `operateVoice(id)`
   chama `startRadio` com as linhas (as do documento, numa gravação) e `grantOnEnd`.
3. `Devices.tsx`: `interact` despacha `voice`; `VoiceDeviceView` pisca o `__led` (entre `led-red`
   e `led-off`, por `paintLenses`) enquanto há gravação por ouvir e energia.
4. `validate.ts`: `voice-silent` (sem fala incondicional no fim), `voice-recording-missing`
   (`documentId` que não é documento com `lineKeys`, ou cujo `containerId` não é este aparelho),
   `device-node-missing` pede `__led` quando `messageLamp`. `spokenKeys` inclui as falas próprias.
5. `simulate.ts`: ação `voice` (concede o documento da gravação que vale; nada, numa fala).
   `Hud.tsx:285-318` e `Journal.tsx:91-112`: documento com `lineKeys` é impresso como um parágrafo.
6. `museum.ts:1481`: o telefone sai do `kit` e entra em `OFFICE_DEVICES`:
   `{ kind: 'voice', id: 'office-telephone', part: 'desk-telephone', position: [0.52, 0.747, 0.34],
   rotationY: -1.75, titleKey: 'device.office-telephone.title', speakerKey:
   'device.office-telephone.title', promptKey: 'device.office-telephone.prompt',
   utterances: [{ when: {}, lineKeys: ['device.office-telephone.dead'] }] }`.

**Teste.** `test:radio`: `E` no telefone, no escuro, diz «Linha muda.» e não grava nada; uma
gravação de teste só entra em `documentsRead` quando a última linha termina (pular linha a linha
conta; cortar no meio com `stopRadio` não conta e deixa ouvir de novo); a intenção e o prompt
concordam nos quatro estados. `test:desk-top`: o telefone como dispositivo continua apoiado e sem
encostar nos vizinhos (a suíte já lê dispositivos). `test:navigation`: o telefone tem ponto de pé.
`test:kit-runtime`: escritório com 51 lotes de kit [previsto].

**Vermelho hoje.** O telefone não é alvo: o caso «`E` no telefone responde» não tem dispositivo.

### T13 — Um documento por vez (H-35) · F3

**Hoje.** `Hud.tsx:285-318`: `DocumentPanel` despeja todos os documentos do container numa coluna.
`Containers.tsx:230-244`: `E` só vira página de caderno.

**Mudança.** `src/engine/readingQueue.ts` (3.9). `Containers.tsx:230-244`: `E` avança por
`notebookAdvance` sobre o tamanho da fila, para todo container. `Hud.tsx:285-318`: uma página por
vez, com «← Voltar», fólio «n / m» e «Próximo →» / «Fechar» (as teclas ← → de `Notebook.tsx:74-89`
passam a valer para os dois leitores). `containerGrant` não muda (DL3-9).

**Teste.** `test:opening-flow`, regra pura `containerReadQueue`: o arquivo A da Ala 1 dá duas
páginas, na ordem do conteúdo; um documento de duas páginas dá duas; um container vazio, nenhuma;
`E` na última fecha. E a asserção de que abrir concede os dois documentos de uma vez (o que o
registro de L2 diz).

**Vermelho hoje.** `containerReadQueue` não existe.

### T14 — Termos e mesa de assinatura (M31; S26) · F4

**Hoje.** Nada. `additive.ts:192` grava `terms: []`; `:380-383` acusa qualquer termo de um registro.

**Mudança.**

1. `schema.ts`: `Term`, `signing-desk`, página `term` (3.9, 3.10); `ProgressCondition.termsSigned`.
2. `progressFields.ts`: `termsSigned`, `sequencesSeen` (3.1). `triggers.ts:48-62`: `compileTriggers`
   acrescenta `term:<id>:signed` (`when: { termsSigned: [id] }`, `set-flag`).
3. `src/engine/termRules.ts` (novo). `deviceRules.ts`: `deviceIntent` de `signing-desk`.
4. `Devices.tsx`: `SigningDeskView` (o `__led` num grupo visível só em `blocked` e `ready`; o
   `__book` num grupo visível só quando `termsSigned` tem algum termo desta mesa; DL3-7); `interact`
   devolve um `HoldRequest` em `ready`, o zumbido em `blocked`, `false` em `empty` e `signed`.
5. `Hud.tsx`: `DevicePrompt` para a mesa: `empty` → «Púlpito — {aviso}»; `blocked` → «Púlpito —
   Assinar: {termo} · falta luz em: {salas}» (e «falta: {documentos}»); `ready` → «Segure E —
   Assinar: {termo}»; `signed` → «Púlpito — {termo} · assinado ✓». `Journal.tsx`: «Termos
   assinados» na aba Caderno. `Notebook.tsx`: página `term`.
6. `simulate.ts`: ação `sign`; `term-unsignable` (o `when` nunca vale), `ending-unreachable`
   (nenhuma mesa alcançável assina o termo), `term-presented-late` (`presentedWhen` pede algo que
   `when` não pede), `post-ending-disables-action` (depois de cada termo, toda ação que estava
   disponível continua). `gate-uses-negative-condition` e `gate-uses-all-condition` passam a ler
   `Term.when` e `presentedWhen`. `additive.ts`: termos no instantâneo (3.12).
7. `validate.ts`: `device-node-missing` pede `__led` e `__book` à mesa; `term-desk-missing`.

**Teste.** Em `test:ending` (T17), `test:save` e `test:triggers`:

- os dois campos fazem ida e volta, com amostra em `SAMPLES` (`scripts/test-save.ts:199-229`; o
  `UNKNOWN` de `:233-238` troca `termsSigned` por outro nome, porque o campo passou a ser
  conhecido); um save deste lote lido pelo código congelado de L1 não perde nada que L1 conhece;
- **abas vivas** (`liveTabs.ts`): uma aba assina e a outra, em outra sala, ouve; as duas ficam com
  `termsSigned`, a flag e o gatilho, e se calam; uma aba sem regras (a tela de título) que grava
  não apaga o termo nem a flag; o caso das três abas que diferem em todo campo continua fechando;
- `test:triggers`: o gatilho do termo dispara uma vez, em qualquer ordem, e alcança um save que
  chega com `termsSigned` e sem a flag.

**Vermelho hoje.** «Um campo que este build não conhece…» é o caso que hoje carrega `termsSigned`
como desconhecido; o caso novo «`termsSigned` é campo da tabela, com junção por união» reprova.

### T15 — Segurar (M41; S18; D11) · F4

**Hoje.** `primaryAction.ts:1-55` (um toque, uma ação); `MobileControls.tsx:266-280` (`onClick`);
todo `keydown` descarta `event.repeat` (`Devices.tsx:392`, e os outros quatro).

**Mudança.**

1. `src/engine/holdAction.ts` (novo) e `primaryAction.ts` (3.10). Um manipulador que devolve
   `HoldRequest` também reivindica a tecla.
2. `Devices.tsx`: `keydown` de `E` (não repetido, não reivindicado) → `interact()`; se veio um
   pedido, `pressPrimaryAction` segue com ele; `keyup` de `E` → `releasePrimaryAction()`; `Escape`,
   `blur` e `visibilitychange` → `cancelPrimaryHold()`; `useFrame` → `tickPrimaryHold(delta,
   mesa na mira ou null)`; `onPrimaryHoldFired` → `state.grant(termGrant(termo))` e o som.
3. `MobileControls.tsx:266-280`: `onPointerDown` → `pressPrimaryAction()` (e marca que o ponteiro
   já agiu); `onPointerUp`, `onPointerCancel`, `onLostPointerCapture` → `releasePrimaryAction()`;
   `onClick` só age quando nenhum ponteiro desceu antes (ativação por teclado). Em `confirming` o
   botão de Ação dá lugar a «Assinar» e «Cancelar».
4. `Hud.tsx`: `HoldPrompt` (`useSyncExternalStore` sobre `primaryHold`): anel em volta da tecla e
   do botão enquanto `holding` (animação de CSS com a duração do pedido, sem escrita por quadro no
   store); em `confirming`, «E Assinar · Esc Cancelar». `styles/museum.css`: `.prompt-key.is-
   holding`, `.mobile-action-button.is-holding`, `.hold-confirm`.
5. `scripts/lib/runtimeWiring.ts`: `holdWiringProblems` (a fiação acima, linha por linha).

**Teste.** `test:mobile-controls`: a tabela de `holdStep` inteira; segurar 1,2 s dispara uma vez;
soltar a 0,6 s cancela e não dispara; soltar a 0,1 s abre a confirmação, «Assinar» dispara,
«Cancelar» não; perder a mira no meio cancela; um quadro de 5 s conta como 0,25 s; com dois
manipuladores registrados, um pedido de segurar impede o de prioridade menor de agir (um `E`, uma
ação). `test:opening-flow` (`:343-373`): todo arquivo com `E` continua pedindo a guarda comum, e a
fiação do gesto está nos dois caminhos.

**Vermelho hoje.** `pressPrimaryAction` não existe; e a regra que S18 nomeia: com
`triggerPrimaryAction` só, um manipulador que pede 1,2 s nunca dispara.

### T16 — A sequência dirigida (M42; D27) · F4

**Hoje.** Nada. `Devices.tsx:470-519` (`RadioDirector`) só toca com rádio ao alcance.

**Mudança.** `schema.ts` e `sequenceRules.ts` (3.11); `store.ts`: `sequence`, `startSequence`,
`advanceSequence`, `stopSequence`, com linha em `sessionDefaults` e em
`scripts/lib/storeActions.ts`; `src/ui/SequenceOverlay.tsx` (novo, no HUD): diretor (quando
`dueSequence` devolve uma e nada toca: `startSequence`, que cala o rádio), cartão centrado e
legenda com quem fala, botão «Pular» por passo; fica retida sob modal e com a aba oculta, pela
regra `radioHeld`. `Devices.tsx:486-491`: `onAir` passa a contar a sequência. `radioCallBlocked`
(`radioPatience.ts:232`): `R` durante uma sequência avança o passo e não chama. `Hud.tsx:232-282`:
as legendas preenchem `{hora}` por `fillHour`. `validate.ts`: `sequence-not-positive`,
`sequence-empty`; `simulate.ts`: `sequence-never-plays`.

**Teste.** `test:ending` (T17).

**Vermelho hoje.** Não há o que chamar.

### T17 — `test:ending` (6.4) · F4, cresce em F5

`scripts/test-ending.ts` (novo; `test:ending` no `package.json` e no `check`, depois de
`test:locks`). Em F4, sobre uma casa feita para o teste (três salas, uma mesa, três termos):

- assinar é idempotente: duas vezes é uma, o gatilho dispara uma vez, a sequência toca uma vez;
- recarregar antes e depois: o termo fica; a sequência interrompida por um reload toca de novo do
  começo; terminada, nunca mais;
- dois e três termos pendentes: a mesa oferece o mais antigo, o prompt o nomeia, e o seguinte só é
  oferecido depois de o cartão do anterior fechar (S26);
- não se assina com uma sala apagada, e `termBlockers` nomeia cada uma que falta;
- o rádio na mesa: a sequência toca; uma chamada no ar é cortada, não conta como ouvida e volta
  depois;
- `term-unsignable`, `ending-unreachable`, `term-presented-late`, `post-ending-disables-action`,
  `sequence-never-plays` em casas quebradas de propósito;
- o instantâneo de uma casa com termos os grava, e mudar o `when` de um deles é
  `term-condition-changed`.

Em F5, sobre o museu: a rota canônica chega a `flag:posse-signed`; o cartão e as duas falas tocam;
o save de produção com a gaveta aberta (T20).

**Vermelho hoje.** A suíte inteira: não há termo.

### T18 — Bake: a secretária, o cofre, o Livro (4.4d; ÁT-K1) · F5

Tabela e conta em §7. Arquivos: `scripts/bake/parts/officeProps.mjs` (receita nova, no fim do
arquivo, com as convenções de apoio do cabeçalho dele), `scripts/bake/parts/officeDecor.mjs:364-438`
(o cofre; cada gerador que ganha nó exporta `layout`: a dobradiça, a prateleira, a régua), `scripts/bake/parts/
atriumDecor.mjs:930-1010` (o púlpito), `scripts/bake.mjs:832-837, 1061-1066` e o registro da
receita nova junto de `:854-880`, `schema.ts:450-521` (`KitPartId` ganha
`'office-answering-machine'`). `npm run bake`; nada gerado é editado à mão.

**Teste.** `validateBake` (`device-node-missing`, `container-node-missing`); `test:kit` (peça ×
`layout`: a dobradiça declarada em `museum.ts` cai sobre o eixo dos dois cilindros que o gerador
exporta em `layout.hinge`; o Livro assenta na régua de latão do púlpito, ±1 mm; a prova assenta na
prateleira); `test:desk-top` (a secretária apoiada na nogueira e a 2 mm ou mais de tudo);
`test:kit-runtime` (§7); `test:ratchets` (`kitGlb` com o teto novo, medido).

**Vermelho hoje.** Com o conteúdo de F5 e sem o bake, `device-part-not-baked` e
`container-node-missing`.

### T19 — A Posse como conteúdo (I-04, I-12 a I-14; H-23) · F5

**Hoje.** `museum.ts:151-168` (uma tranca), `:567-575` (`doc-predecessor`), `:648-664` (a gaveta),
`:1069` (o púlpito no `kit`), `:1491` (o cofre no `kit`), `:1513`.

**Mudança** (só dado; o motor é de F1 a F4):

1. **Credencial.** `credentials: [{ credential: { kind: 'tool', id: 'service-key' }, titleKey:
   'credential.service-key.title', icon: 'key' }]`.
2. **Trancas.** `office-drawer` ganha `onOpen: [{ kind: 'grant-credential', credential: { kind:
   'tool', id: 'service-key' } }]`. Nova: `{ kind: 'tool', id: 'office-safe', requires:
   'service-key', consumesTool: true, mapLabelKey: 'lock.office-safe.mapLabel', promptKey:
   'lock.office-safe.prompt' }`.
3. **Documentos.** `doc-predecessor` dá lugar a `doc-otavio-handover` (mesmo container, mesma
   tranca; alias em 3.2). Novos: `doc-termos` (`kind: 'ledger'`, `containerId: 'office-safe'`,
   `lockId: 'office-safe'`, duas páginas: `handwritten` com `document.termos.handover` e
   assinatura, e `term` com `termId: 'termo-posse'`), `doc-label-proof-office` (`kind: 'proof'`, no
   cofre), `doc-otavio-tape` (`kind: 'oral-history'`, `containerId: 'office-answering-machine'`,
   `lineKeys: tape.otavio.1` a `.9`). `documentIds` do escritório lista os cinco. Cada um com
   `mentions` (a folha: `office-safe`, `doc-termos`, `atrium-lectern`; o recado: `office-cabinet`,
   `portrait-morgan`, `atrium-podium`).
4. **Containers.** O cofre sai do `kit` (`:1491`) e entra em `OFFICE_CONTAINERS`:
   `{ id: 'office-safe', part: 'office-safe', position: [2.55, 0, 2.45], rotationY: -Math.PI / 2,
   titleKey: 'container.office-safe.title', lockId: 'office-safe', door: { nodePrefix: 'door',
   hingeAt: [...], openAngle: -1.75 }, contents: [{ node: 'papers' }] }` (a dobradiça vem do
   `layout` do gerador; `test:kit` confere).
5. **Dispositivos.** `office-answering-machine` (`voice`, `poweredBy: 'office'`,
   `messageLamp: true`, `utterances: [{ when: {}, documentId: 'doc-otavio-tape' }]`), em
   `[0.615, 0.74, 0.642]`,
   `rotationY: -Math.PI / 2` [a validar, §7]. O púlpito sai do `kit` (`:1069`) e entra em `devices`
   do átrio: `{ kind: 'signing-desk', id: 'atrium-lectern', part: 'atrium-lectern', position:
   [-7.15, 0, 2.2], rotationY: Math.PI / 2, titleKey: 'device.atrium-lectern.title',
   emptyNoticeKey: 'device.atrium-lectern.empty', termIds: ['termo-posse'], holdSeconds: 1.2 }`.
6. **Termo.** `{ id: 'termo-posse', titleKey: 'term.posse.title', bodyKey: 'term.posse.body',
   presentedWhen: { documentsRead: ['doc-termos'] }, when: { documentsRead: ['doc-termos'],
   powered: ['office', 'atrium', 'holyoke'] }, grants: 'posse-signed', mentions:
   ['atrium-lectern'] }`.
7. **Sequência.** `seq-posse`: `when: { flags: ['posse-signed'] }`; um cartão
   (`sequence.posse.card`, 3,5 s) e duas falas com `sequence.speaker.porter`.
8. **Chamadas**, depois de `porter-shortcut`:

| Id | `when` | `lapsesWhen` | Linhas | `mentions` |
|---|---|---|---|---|
| `porter-machine-reminder` | `powered: ['office', 'atrium']` | `documentsRead: ['doc-otavio-tape']` | `radio.call.machine.1` | `office-answering-machine` |
| `porter-drawer-open` | `locksOpened: ['office-drawer'], flagsUnset: ['legacy-pre-L3-drawer']` | `locksOpened: ['office-safe']` | `radio.call.drawer.1`, `.2` | `office-cabinet`, `office-safe` |
| `porter-legacy-drawer` | `flags: ['legacy-pre-L3-drawer']` | `locksOpened: ['office-safe']` | `radio.call.legacy-drawer.1` | `office-cabinet` |
| `porter-safe-open` | `locksOpened: ['office-safe']` | `flags: ['posse-signed']` | `radio.call.safe.1`, `.2` | `office-safe`, `atrium-lectern` |

   `PRE_POSSE_SAVE.oldNews` não ganha nenhuma: as quatro dependem de objetos que nenhum save
   anterior tem, menos a gaveta, que tem regra própria (T20).
9. **Dicas**, entre a da gaveta e o resto:

| Dica | `when` | `targetId` |
|---|---|---|
| chave | `credentials: [service-key], locksClosed: ['office-safe']` | `office-safe` |
| posse | `documentsRead: ['doc-termos'], flagsUnset: ['posse-signed']` | `atrium-lectern` |

   A altura «onde» da gaveta passa a citar o recado, e o resto vira o fecho honesto (§6.5).
10. **Lista.** As linhas 5 a 8 de 3.4. `Hud.tsx`: `ChecklistToast` («Anotado no caderno») por
    `checklistNews`, só para quem tem o caderno.
11. **Relógio.** Os marcos `safe` e `posse`, com as frases 9 e 10.
12. Saem `document.predecessor.title` e `.body` e a linha de dívida `text-ages`
    (`knownDebt.ts:167-173`).

**Teste.** `validate:content` verde sem dívida nova além das de §8. `test:playthrough`
(`:391-467`, reescrito): `MAXIMUM` ganha a chave, o cofre, os quatro documentos, o termo, as três
flags e os gatilhos; os níveis são os do plano mestre (`N0` luminária e o relógio · `N1` átrio ·
`N2` luz do átrio, Ala 1 · `N3` luz da Ala 1, o ano, peças · `N4` gaveta, chave · `N5` cofre,
Livro, prova · `N6` Posse); a rota canônica termina com `flag:posse-signed`; as 500 ordens chegam
ao mesmo fim; o perfil **«pula tudo»** (nunca lê o caderno, nunca pega o rádio, nunca acende a
lanterna, nunca ouve o recado, nunca acerta o relógio) assina e tem `seq-posse` em
`sequencesSeen`; quem digita o ano sem ter lido só adianta a chave. `test:ending`: os casos de F5.
`test:speech-coherence`: com as chamadas e a sequência de verdade. `test:opening` (H-23): tudo o
que a folha da gaveta cita existe no build (`mentions` do documento: a chave como credencial
declarada, o cofre, o Livro, o púlpito), e tirar qualquer um deles de um museu de teste é
`speech-mentions-missing`. `test:opening-flow`: «o Jorge
não manda ninguém ao que não existe» (`:1284-1330`) passa a exigir que nenhuma fala de L3 diga
«medalha», «lacre», «chave geral», «bomba» nem «plataforma», e que, das falas que dizem
«caixa-forte», só `radio.call.safe.1` (a que distingue os dois cofres) não diga também o
impedimento («alagou», «hoje não»).
`test:radio`: a apresentação da Helena em toda chave que a cita. `test:qa-save`: um id que tem
alias conta como id que o conteúdo ainda tem.

**Vermelho hoje.** A rota canônica: `flag:posse-signed` não existe, e `ending-unreachable` (a
asserção que ÁT-D1 pede) é verdadeira para o museu de hoje.

### T20 — O save que já tinha a gaveta aberta (aceite de L3) · F5

**Hoje.** `production-drawer-open`, `l1-route-end` e `l2-shortcut-released` têm
`locksOpened: ['office-drawer']`, `documentsRead` com `doc-predecessor` e nenhum gatilho disparado.

**Mudança.** `PRE_POSSE_SAVE.drawer` e a segunda metade de `prePosse` (3.2). A chave vem do
gatilho `lock:office-drawer:opened`, que dispara na carga quando o conteúdo se registra (R3), e a
folha nova vem do alias. `simulate.ts:950-957`: uma flag que uma migração põe
(`PRE_POSSE_SAVE.drawer.flag`) conta como posta, senão `flag-never-set` acusaria a condição de
`porter-legacy-drawer`; `validateOpening` (`validate.ts:864-891`) confere a tranca e o gatilho de
`PRE_POSSE_SAVE.drawer` contra o conteúdo (`legacy-save-drawer`).

**Teste.** `test:ending` e `test:save`, com o store carregado como o navegador carrega: o save de
produção com a gaveta aberta, carregado, tem `tool:service-key`, a flag, `doc-otavio-handover`
**e** `doc-predecessor`, e nenhum toast de credencial; a chamada que o diretor escolhe é
`porter-legacy-drawer`, nunca `porter-drawer-open`; o save com a gaveta fechada que a abre agora
ouve `porter-drawer-open` e não ganha a flag; os dois chegam à Posse. **Abas vivas:** uma aba de
L2 (regras de mentira sem o gatilho) abre a gaveta; a aba deste build, já aberta, toma o save,
ganha a flag e a chave, e as duas se calam; uma aba na tela de título (sem regras) grava por cima
sem perder a chave nem a flag. E o rollback: o save de L3 lido pelo leitor congelado de L1 não
perde nada que L1 conhece.

**Vermelho hoje.** O save carregado não tem a chave.

### T21 — O fecho da fatia: lote 3 (HANDOFF §11.6, §11.10, §11.11) · F5

1. `src/content/contentLot.ts:13`: `CONTENT_LOT = 3`. Nenhuma linha de `KNOWN_DEBT` com data 3
   sobra (as cinco saíram em F1, F2 e nesta fatia).
2. `scripts/lib/ratchets.ts`: `BROWSER_RECORD` medido de novo (lote 3; §10), `kitGlb.ceiling` no
   valor do bake, com o motivo; os três tetos de bundle no medido mais meio por cento.
3. `npm run graph:snapshot`: escreve `docs/releases/L3.graph.json` (rascunho: o lote não está
   feito, então não há digest a fixar ainda). `test:playthrough` exige o arquivo igual ao conteúdo.
4. `scripts/test-kit-runtime.ts:267-302`: os dois tetos por nome continuam (56 e 53); a conta por
   dado, que F1 instalou com os números de hoje (59, 33, 74), passa aos de §7 (59, 33, 79).

**Teste.** `test:docs` (`CONTENT_LOT` um à frente do último lote feito), `test:ratchets` (a idade
do registro), `test:playthrough` (o rascunho; o conteúdo contra o registro de L2 sem acusação).

**Vermelho hoje.** Com `CONTENT_LOT` em 3 e o registro do lote 1, `test:ratchets` reprova: é o que
obriga a medir.

## 5. Migração: o save antes e depois

Só os campos que mudam. «Depois» é o que o store tem com o conteúdo registrado (migração, alias e
gatilhos assentados), no fim do lote.

| # | Save | Antes | Depois |
|---|---|---|---|
| A | `production-drawer-open`, `l1-route-end` | gaveta aberta; `doc-predecessor` lido; três salas acesas; peças catalogadas; sem `porter-hello` | `contentLot: 3`; `documentsRead` + `doc-otavio-handover` (o antigo fica); `flags: ['legacy-pre-L3-drawer']`; `credentials: ['tool:service-key']`; `triggersFired: ['lock:office-drawer:opened']`; `radioCalls` + `porter-atrium-service`, `porter-holyoke-lit`, `porter-first-catalogued`; `termsSigned: []`, `sequencesSeen: []`. Ouve `porter-hello` e depois `porter-legacy-drawer` |
| B | `l2-shortcut-released` | como A, e `doorsReleased` com o atalho | como A, e `radioCalls` + `porter-shortcut` |
| C | `production-drawer-closed`, `production-radio-on-desk`, `l2-new-game-drawer-touched` | gaveta fechada | sem flag, sem chave; as notícias velhas do que cada um já passou; ao abrir a gaveta: chave, gatilho, `porter-drawer-open` |
| D | `production-catalogued-unturned` | duas peças catalogadas | `radioCalls` + `porter-first-catalogued` e as das salas que tiver acesas |
| E | `production-pre-opening` | sem `radioCalls` | a migração de abertura como hoje; depois `prePosse` sobre o resultado |
| F | jogo novo de L3, gaveta aberta em L3 | — | chave e gatilho na mesma escrita; **sem** a flag; `porter-hello` já ouvida |
| G | de L3, lido pelo código de L1 (`sanitiseProgress.L1.ts`) | `termsSigned`, `sequencesSeen`, `flags`, `credentials` com a chave | tudo o que L1 conhece, igual (`credentials` entre eles); os campos de L2 e de L3 somem (é o código de L1). Voltando a L3: sem `triggersFired`, o gatilho da gaveta dispara de novo e concede a mesma chave; a flag de legado é posta; `termsSigned` perdido é a **perda de um rollback para antes de L2** e vai para o HANDOFF |
| H | de L3, lido por L2 e regravado | idem | nada se perde: L2 preserva o que não conhece |
| I | lixo: `termsSigned: 'x'`, `sequencesSeen: [1, 'seq-posse']`, `radioMemory.x.hintHeight: -2` | — | `[]`, `['seq-posse']`, `0` |
| J | jogo novo | — | `emptyProgress()` com os dois campos vazios, `contentLot: 3` |

## 6. Textos finais (pt-BR é a fonte; `en.ts` é tipado contra ele)

Regras conferidas em Node sobre estas tabelas [medido]: nenhuma fala passa de 130 caracteres
(nenhuma resposta de paciência nem dica curta passa de 110); nenhuma imprime `1896`; nenhuma diz
ponto cardeal; hora em algarismo só no visor da secretária (`16:47`) e em «às 9h»; nenhum
documento usa palavra de `text-ages`. Vozes: a Helena com exclamação e sem explicar mecânica; o
Otávio seco, sem exclamação; o Jorge com «tá», «pra», «Câmbio», dizendo «saguão» (*the hall*) e
«portaria» (*the front desk*).

### 6.1 F1

| Chave | pt-BR | inglês |
|---|---|---|
| `intro.line3` (muda) | Seu antecessor deixou alguma coisa na caixa-forte. | (não muda) Your predecessor left something in the vault. |
| `notebook.welcome.letter` (muda) | Olá, novo curador! Bem-vindo ao seu novo trabalho.⏎⏎A tempestade desta tarde derrubou a energia do museu inteiro, e você vai ter que religá-la sala por sala.⏎⏎A seguradora só libera a reabertura com o inventário conferido por você, contra o livro de tombo do Otávio, o antigo curador, que ficou na caixa-forte. Coragem!⏎⏎Reabrimos amanhã às 9h. Bom trabalho! | Hello, new curator! Welcome to your new job.⏎⏎This afternoon's storm knocked out the power across the whole museum, and you will have to bring it back room by room.⏎⏎The insurer will only clear the reopening once you have checked the inventory yourself, against the accession ledger of Otávio, the previous curator, which was left in the vault. Chin up!⏎⏎We reopen tomorrow at 9. Good luck! |
| `notebook.todo.power` (muda) | Religar a energia: escritório, átrio e Ala 1 | Restore the power: office, atrium and Wing 1 |
| `notebook.todo.catalogue` (muda) | Catalogar o acervo: conferir peça por peça | Catalogue the collection: check it piece by piece |
| `notebook.todo.vault` (muda) | Caixa-forte — só o Otávio sabia abrir | (não muda) The vault — only Otávio knew how to open it |
| `notebook.todo.vault.note` | hoje não: o subsolo alagou | not tonight: the basement flooded |
| `notebook.counter` | {done} de {total} | {done} of {total} |
| `journal.tab.notebook` | Caderno | Notebook |
| `container.office.title` (muda) | Gaveta do Otávio | Otávio's drawer |
| `lock.office-drawer.prompt` | trancada (um ano) | locked (a year) |
| `device.atrium-podium.title` | Plinto do Fundador | The Founder's plinth |
| `device.atrium-podium.notice` | Interditado: obra do piso. | Closed off: the floor is being relaid. |

(⏎⏎ é a quebra de parágrafo `\n\n` que a carta já usa.)

### 6.2 F2

| Chave | pt-BR | inglês |
|---|---|---|
| `radio.call.hello.1` | Curador? É o Jorge de novo, da portaria. Câmbio. | Curator? It's Jorge again, at the front desk. Over. |
| `radio.call.hello.2` | Vi no painel que a luz do escritório voltou. A tempestade desarmou os quadros do prédio inteiro. | The panel here says the office lights are back. The storm tripped every breaker in the building. |
| `radio.call.hello.3` | O Otávio se aposentou hoje. Pegou o ônibus antes de a estrada fechar e deixou tudo com você. | Otávio retired today. He caught the bus before the road closed and left it all to you. |
| `radio.call.hello.4` | Aqui eu tenho o painel do alarme: toda vitrine, gaveta e porta desse prédio acende uma luzinha pra mim. | I've got the alarm panel here: every case, drawer and door in this building lights a little lamp for me. |
| `radio.call.hello.5` | O relógio aí parou com a luz: acerta. O subsolo alagou; hoje ninguém desce. Qualquer coisa, me chama no rádio. Câmbio, desligo. | The clock there stopped with the power: set it. Basement flooded; nobody goes down tonight. Call me on the radio. Over and out. |
| `radio.call.first.1` (muda) | O quadro do saguão fica do outro lado, um pouco à direita de quem sai daí, junto da entrada da Ala 1. Procura a luzinha vermelha. | The hall breaker is across from you, a little to your right as you leave, by the Wing 1 entrance. Look for the little red light. |
| `radio.call.first.2` (muda) | Saguão, átrio: é o mesmo lugar. A placa diz átrio; eu digo saguão. Câmbio. | The hall, the atrium: same place. The sign says atrium; I say the hall. Over. |
| `radio.call.atrium.1` | Saguão no painel! A Ala 1 é a porta com placa, perto do quadro. O quadro dela fica na parede de frente pras portas. Câmbio. | The hall's on my panel! Wing 1 is the door with the sign, by the breaker. Its own breaker is on the wall facing its doors. Over. |
| `radio.call.holyoke.1` | Ala 1 acesa. Agora é conferir, peça por peça. Câmbio. | Wing 1 is lit. Now it gets checked, piece by piece. Over. |
| `radio.call.catalogued.1` | Uma vitrine abriu e fechou aqui no painel. Primeira conferida? Faltam… bom, faltam bastante. Câmbio. | A case just opened and shut on my panel. First one checked? That leaves… well, plenty. Over. |
| `radio.call.shortcut.1` | A porta de serviço abriu por dentro. Agora fica destrancada dos dois lados. Tá no meu painel. Câmbio. | The service door opened from the inside. It stays unlocked both ways now. It's on my panel. Over. |
| `radio.hint.notebook.where` | Primeiro o caderno: a diretora, a Helena, deixou um na mesa. | Notebook first: the director, Helena, left one on the desk. |
| `radio.hint.notebook.what` | Capa vermelha, do lado da luminária. | Red cover, next to the lamp. |
| `radio.hint.notebook.how` | Pega e lê até a última página. | Pick it up and read it to the last page. |
| `radio.hint.notebook.curt` (não muda) | Caderno. Na mesa. Pega e lê. Câmbio. | Notebook. On the desk. Pick it up and read it. Over. |
| `radio.hint.atrium.where` | O quadro fica do outro lado do saguão. | The breaker's on the far side of the hall. |
| `radio.hint.atrium.what` | Luzinha vermelha, perto da porta com placa. | A little red light, by the door with the sign. |
| `radio.hint.atrium.how` | Caixa cinza na parede, com alavanca. É só acionar. | A grey box on the wall, with a lever. Just throw it. |
| `radio.hint.atrium.curt` (muda) | Saguão. Do lado da porta da Ala 1. Luzinha vermelha. Câmbio. | The hall. Beside the Wing 1 door. Little red light. Over. |
| `radio.hint.holyoke.where` | A Ala 1 tem quadro próprio, na parede de frente pras portas. | Wing 1 has its own breaker, on the wall facing the doors. |
| `radio.hint.holyoke.what` | Luzinha vermelha, do outro lado da sala. | A little red light, across the room. |
| `radio.hint.holyoke.how` | Atravessa no escuro até a luzinha vermelha. A lanterna dá conta. | Cross in the dark to the little red light. The torch will do. |
| `radio.hint.holyoke.curt` (não muda) | Ala 1. Quadro na parede do fundo. Luzinha vermelha. Vai. | Wing 1. Breaker on the far wall. Little red light. Go. |
| `radio.hint.drawer.where` (em F2) | A gaveta do Otávio abre com um ano. O ano tá na Ala 1. | Otávio's drawer opens with a year. The year is in Wing 1. |
| `radio.hint.drawer.what` | O ano tá na Ala 1, no retrato do Morgan. | The year is in Wing 1, on Morgan's portrait. |
| `radio.hint.drawer.how` | Pega a moldura e inclina: tá na borda de baixo. Ou no arquivo de proveniência, perto da entrada da ala. | Pick the frame up and tilt it: it's on the bottom edge. Or in the provenance archive, by the wing entrance. |
| `radio.hint.drawer.curt` (não muda) | Gaveta do Otávio: uma data. Retrato do Morgan, Ala 1. Pega a moldura e inclina: tá na borda de baixo. | Otávio's drawer: a date. Morgan's portrait, Wing 1. Pick the frame up and tilt it: it's on the bottom edge. |
| `radio.hint.rest`, `.curt` (em F2: os textos de hoje de `radio.hint.vault` e `.curt`, só com a chave renomeada) | O subsolo alagou; hoje ninguém desce. A luz tá feita; fora isso, hoje é só conferência. Câmbio. | (o de hoje) |
| `radio.patience.t3.torch.close` | Brincadeira. A porta de enrolar tá sem motor, e posto é posto. | Kidding. The roller door has no motor, and a post is a post. |
| `radio.patience.t4.dark.close` (muda) | …Só pra Helena, a diretora, talvez. | …Except Helena, the director, maybe. |
| `radio.deadAir.rain` (muda) | (Nada. Só a chuva.) | (Nothing. Only the rain.) |
| `device.office-clock.title` | Relógio do escritório | Office clock |
| `prompt.clock.set` | Acertar o relógio | Set the clock |
| `clock.set` | Relógio acertado | Clock set |
| `night.hour.1` a `.8` | Passa das sete · Quase oito · Passa das oito · Quase nove · Passa das nove · Quase dez · Passa das dez · Quase onze | Gone seven · Nearly eight · Gone eight · Nearly nine · Gone nine · Nearly ten · Gone ten · Nearly eleven |

Saem: `radio.call.first.3`, `.4`, `radio.hint.notebook`, `.atrium`, `.holyoke`, `.drawer` (as
quatro dicas cheias de hoje), `radio.hint.vault`, `.vault.curt` (renomeadas).

### 6.3 F3

| Chave | pt-BR | inglês |
|---|---|---|
| `device.office-telephone.title` | Telefone | Telephone |
| `device.office-telephone.prompt` | Discar | Dial |
| `device.office-telephone.dead` | Linha muda. | The line is dead. |
| `prompt.voice.play` | Ouvir | Listen |
| `prompt.voice.again` | Ouvir de novo | Listen again |
| `prompt.voice.dead` | Sem energia | No power |
| `reader.next` | Próximo | Next |
| `credential.taken` | Você pegou | You took |

### 6.4 F4

| Chave | pt-BR | inglês |
|---|---|---|
| `desk.sign` | Assinar | Sign |
| `desk.hold.keyboard` | Segure E | Hold E |
| `desk.hold.touch` | Segure Ação | Hold Action |
| `desk.cancel` | Cancelar | Cancel |
| `desk.missing.power` | falta luz em | no light yet in |
| `desk.missing.document` | falta | missing |
| `desk.signed` | assinado | signed |
| `term.signed` | Assinado pelo curador. | Signed by the curator. |
| `journal.terms.heading` | Termos assinados | Deeds signed |

### 6.5 F5

| Chave | pt-BR | inglês |
|---|---|---|
| `credential.service-key.title` | Chave do cofre de ferro | Key to the iron safe |
| `container.office-safe.title` | Cofre de ferro | Iron safe |
| `lock.office-safe.mapLabel` | Cofre de ferro — precisa de chave | Iron safe — needs a key |
| `lock.office-safe.prompt` | precisa de chave | needs a key |
| `device.office-answering-machine.title` | Secretária eletrônica | Answering machine |
| `device.office-answering-machine.speaker` | Otávio · recado gravado | Otávio · recorded message |
| `device.atrium-lectern.title` | Púlpito | Lectern |
| `device.atrium-lectern.empty` | mesa de assinatura: falta o Livro de Termos | signing desk: the Book of Deeds is missing |
| `document.otavio-handover.title` | Passagem de acervo — folha 1 | Handover of the collection — sheet 1 |
| `document.otavio-handover.body` | PASSAGEM DE ACERVO — FOLHA 1. Se você está lendo isto, achou o ano — o que significa que leu em vez de passar. Bom. A chave presa nesta folha é do cofre de ferro desta sala. Dentro dele está o que eu lhe devia em mãos: o Livro de Termos. Assine a posse quando a casa estiver acesa. O livro de tombo, o que a seguradora quer ver, não está lá: fica na caixa-forte do Fundador, sob o átrio, e para lá não há número nem chave. Confira o acervo sem pressa: pegue cada peça, vire, leia o que está escrito nela. — O. | HANDOVER OF THE COLLECTION — SHEET 1. If you are reading this you found the year, which means you read instead of walking past. Good. The key pinned to this sheet is for the iron safe in this room. Inside it is what I owed you in person: the Book of Deeds. Sign the deed of office once the house is lit. The accession ledger, the one the insurer wants to see, is not in there: it is kept in the Founder's vault, beneath the atrium, and no number and no key will take you to it. Check the collection without hurry: pick each piece up, turn it over, read what is written on it. — O. |
| `document.termos.title` | Livro de Termos | Book of Deeds |
| `document.termos.summary` | O livro em que cada curador assina o que recebe. | The book in which each curator signs for what is handed over. |
| `document.termos.handover` | TERMO DE PASSAGEM. Entrego o acervo do Museu do Voleibol, conferido até onde a chuva deixou. | DEED OF HANDOVER. I hand over the collection of the Volleyball Museum, checked as far as the rain allowed. |
| `document.termos.handover.signature` | — Otávio | — Otávio |
| `term.posse.title` | Termo de posse | Deed of office |
| `term.posse.body` | TERMO DE POSSE. Recebo o acervo e a casa, acesa em suas três salas. | DEED OF OFFICE. I receive the collection and the house, lit in its three rooms. |
| `document.label-proof-office.title` | Prova de etiqueta — placas novas | Label proof — the new plaques |
| `document.label-proof-office.body` | PROVA DE GRÁFICA — PLACAS NOVAS. Presa com clipe, a letra da diretora: “Otávio, ficaram lindas! Quarenta palavras cada, como você pediu. Só cortei a linha de baixo: original, reconstrução, réplica… O visitante não precisa disso para se encantar. Depois da reabertura a gente vê! — H.” Por baixo, a lápis vermelho: “Precisa, sim. É a linha que eu não sei escrever de outro jeito. Guardo esta prova até o curador novo decidir. — O.” | PRINTER'S PROOF — THE NEW PLAQUES. Clipped to it, in the director's hand: “Otávio, they look lovely! Forty words each, as you asked. I only cut the bottom line: original, reconstruction, replica… Visitors don't need that to be charmed. We'll see about it after the reopening! — H.” Underneath, in red pencil: “They do. It is the one line I cannot write any other way. I am keeping this proof until the new curator decides. — O.” |
| `document.otavio-tape.title` | Recado do Otávio (secretária eletrônica) | Otávio's message (answering machine) |
| `document.otavio-tape.summary` | O recado que o Otávio gravou antes do ônibus, cortado pela queda de energia. | The message Otávio recorded before his bus, cut off when the power went. |
| `tape.otavio.1` | Aqui é o Otávio, o curador. O antigo, desde esta tarde. | This is Otávio, the curator. The former one, as of this afternoon. |
| `tape.otavio.2` | Gravo no aparelho da sua mesa porque a passagem era às seis e a estrada fecha com chuva. | I am recording on the machine on your desk because the handover was set for six and the road closes when it rains. |
| `tape.otavio.3` | O último ônibus é o das cinco. | The last bus is the five o'clock. |
| `tape.otavio.4` | A passagem de acervo está escrita, na gaveta de cima do armário alto. | The handover of the collection is written down, in the top drawer of the tall cabinet. |
| `tape.otavio.5` | A gaveta abre com um ano: o ano em que o jogo deixou de se chamar Mintonette. Não vou dizer qual. | The drawer opens with a year: the year the game stopped being called Mintonette. I will not say which. |
| `tape.otavio.6` | Está na Ala 1, num retrato. Quem lê o que está escrito nas peças é exatamente quem eu quero que abra. | It is in Wing 1, on a portrait. Whoever reads what is written on the pieces is exactly who I want opening it. |
| `tape.otavio.7` | O chapéu no cabideiro fica: não é meu, é do cargo. | The hat on the coat stand stays: it is not mine, it belongs to the post. |
| `tape.otavio.8` | E uma coisa sobre o plinto do saguão, que é importante, porque com essa chuva o subsolo — | And one thing about the plinth in the hall, which matters, because with this rain the basement — |
| `tape.otavio.9` | [A gravação termina aqui. O visor marca 16:47.] | [The recording ends here. The display reads 16:47.] |
| `radio.call.machine.1` | Tem uma luz de recado piscando no ramal do escritório. Deve ser coisa do Otávio. Câmbio. | There's a message light blinking on the office extension. Must be Otávio's doing. Over. |
| `radio.call.drawer.1` | A gaveta do Otávio abriu aqui no painel. Trinta anos e eu nunca vi o que tinha dentro. Tinha o quê? | Otávio's drawer just opened on my panel. Thirty years and I never saw what was in it. What was in it? |
| `radio.call.drawer.2` | Se for chave, é do cofre de ferro. Ele era assim: chave dentro de gaveta, gaveta dentro de data. Câmbio. | If it's a key, it's for the iron safe. That was him: a key inside a drawer, a drawer inside a date. Over. |
| `radio.call.legacy-drawer.1` | Olha de novo a gaveta do Otávio: o bilhete tinha uma chave presa. Câmbio. | Have another look in Otávio's drawer: there was a key pinned to the note. Over. |
| `radio.call.safe.1` | O cofre de ferro abriu. Esse é o cofre. A caixa-forte é a do Fundador, lá embaixo: não confunde. | The iron safe's open. That one is the safe. The vault is the Founder's, down below: don't mix them up. |
| `radio.call.safe.2` | Se tem livro aí, é o de termos. Termo se assina no púlpito do saguão, com a casa acesa. Câmbio. | If there's a book in there, it's the Book of Deeds. A deed gets signed at the lectern in the hall, with the house lit. Over. |
| `sequence.speaker.porter` | Jorge · alto-falante | Jorge · loudspeaker |
| `sequence.posse.card` | Termo de posse assinado | Deed of office signed |
| `sequence.posse.1` | A lâmpada do púlpito acendeu e apagou: assinou. O acervo é seu, curador. {hora}. | The lectern lamp came on and went out: you signed. The collection's yours, curator. {hora}. |
| `sequence.posse.2` | O livro que a seguradora quer tá na caixa-forte, e o subsolo alagou. Hoje não se desce. Câmbio. | The ledger the insurer wants is in the vault, and the basement flooded. Nobody goes down tonight. Over. |
| `radio.hint.drawer.where` (muda) | A gaveta do Otávio abre com um ano. Ele deixou recado na secretária do escritório. | Otávio's drawer opens with a year. He left a message on the office answering machine. |
| `radio.hint.key.where` | Chave do Otávio? É do cofre de ferro. | Otávio's key? It's for the iron safe. |
| `radio.hint.key.what` | Canto do escritório, do lado das estantes. | In the corner of the office, beside the bookcases. |
| `radio.hint.key.how` | Chega perto e abre. A chave fica lá. | Walk up and open it. The key stays in it. |
| `radio.hint.key.curt` | Cofre de ferro. Canto do escritório. A chave abre. Câmbio. | Iron safe. Corner of the office. The key opens it. Over. |
| `radio.hint.posse.where` | O termo se assina no púlpito do saguão. | A deed gets signed at the lectern in the hall. |
| `radio.hint.posse.what` | O púlpito com a lâmpada acesa, entre as duas portas da parede da Ala 1. | The lectern with its lamp lit, between the two doors on the Wing 1 wall. |
| `radio.hint.posse.how` | Com luz nas três salas, segura a ação até a pena parar. | With all three rooms lit, hold the action down until the pen stops. |
| `radio.hint.posse.curt` | Púlpito. Saguão. Assina. Câmbio. | Lectern. The hall. Sign. Over. |
| `radio.hint.rest` (muda) | Posse assinada. Agora é conferir o acervo, peça por peça. A caixa-forte fica pra depois: o subsolo alagou. | The post is yours, signed. Now it's checking the collection, piece by piece. The vault can wait: the basement flooded. |
| `radio.hint.rest.curt` (muda) | Posse assinada. Falta conferir. Caixa-forte: hoje não. | Signed. Checking is what's left. The vault: not tonight. |
| `notebook.todo.drawer` | Gaveta do Otávio: “o ano em que o jogo deixou de se chamar Mintonette”. | Otávio's drawer: “the year the game stopped being called Mintonette”. |
| `notebook.todo.safe-key` | Chave do cofre de ferro. | Key to the iron safe. |
| `notebook.todo.posse` | Assinar o termo de posse, no púlpito. | Sign the deed of office, at the lectern. |
| `notebook.todo.proof` | A reforma tirou das placas a linha que diz o que cada coisa é. O Otávio guardou a prova no cofre de ferro. | The refit took off the plaques the line that says what each thing is. Otávio kept the proof in the iron safe. |
| `checklist.noted` | Anotado no caderno | Noted in your notebook |
| `night.hour.9`, `.10` | Passa das onze · Quase meia-noite | Gone eleven · Nearly midnight |

Saem: `document.predecessor.title`, `document.predecessor.body`.

**`claims`.** Nenhuma chave nova afirma fato de vôlei que não esteja no banco: o recado e a lista
repetem a pergunta da tranca («o ano em que o jogo deixou de se chamar Mintonette») sem o ano;
`claims` e `surface` chegam em L8. **O que só existe a partir de L11/L12** é dito uma vez, como
promessa datada e com o «hoje não»: a caixa-forte (lista, folha, `porter-safe-open`, `seq-posse`,
`radio.hint.rest`) e o plinto (aviso do pódio; o recado, que se corta nele). Nenhuma chave de L3
fala em medalha, lacre, chave geral, bomba, plataforma ou livro aberto.

## 7. Bake: receitas, lotes, triângulos

**Hoje [medido].** `kit.glb`: 2.234.252 bytes, **igual ao teto** da catraca. Lotes de kit (nós
únicos das colocações de `kit`): átrio 56 de 56, Holyoke 28, escritório 53 de 53. Triângulos
instanciados: 46.272, 16.544, 34.230.

| Receita | Hoje (nós · triângulos) | Depois | Teto | Classe |
|---|---|---|---|---|
| `office-answering-machine` (nova, `officeProps.mjs`) | — | 3 nós: corpo (`plastic-black`), `__led` (`led-off`; o runtime pinta), `__play` (`brass`, a fileira de teclas) · até 400 | 400 | dispositivo |
| `office-safe` (`officeDecor.mjs:364-438`) | 2 nós · 1.084 | 4 nós: corpo (`archive-green`: carcaça em cinco chapas e moldura, com cavidade e uma prateleira, no lugar da caixa maciça), `__door` (`archive-green`), `__door-hardware` (`brass`: friso, roda, espelho da chave **e as duas dobradiças**, que ficam no eixo), `__papers` (`paper-writing`: a prova na prateleira) · até 1.434 | +350 | container |
| `atrium-lectern` (`atriumDecor.mjs:930-1010`) | 4 nós · 896 | 5 nós: os três de hoje, `__led` (a família `light` renomeada; `atrium-glow`), `__book` (`paper-aged`: o Livro aberto, 0,40 × 0,28 m, com lombo e curvatura de página; um material só) · régua de apoio na família `brass` (+24) · até 1.170 | +274 | dispositivo |
| `desk-telephone` | 2 nós · 1.508 | igual; passa de `kit` a dispositivo | — | dispositivo |
| `atrium-central-podium` | 5 nós · 2.052 | igual; passa de `kit` a dispositivo (`notice`) | — | dispositivo |

Materiais: todos já são desenhados na sala de cada receita [medido no manifesto]: nenhum programa
novo [previsto; medir], nenhuma textura. Colisores: `office-safe` e `atrium-lectern` continuam com
o do nó raiz (o do cofre fica 8 cm mais raso: a porta deixou o corpo); a secretária não tem.
`kit.glb` cresce cerca de 15 a 25 kB [previsto]: `RATCHETS.kitGlb.ceiling` sobe para o medido, no
commit do bake, com o motivo escrito (a secretária, a porta e a cavidade do cofre, o Livro).

**Lotes [previsto, conferido em Node contra o manifesto de hoje].**

| Sala | Kit hoje | Kit depois | Desenhado por dado hoje (kit + containers + dispositivos + quadro) | Depois |
|---|---|---|---|---|
| átrio | 56 | 47 (saem os 4 do púlpito e os 5 do pódio) | 59 | no máximo **59**: 47 + 3 do quadro + 5 do pódio + 3 fixos do púlpito + a lâmpada **ou** o Livro (DL3-7); 58 enquanto não há termo apresentado nem assinado |
| Holyoke | 28 | 28 | 33 | 33 |
| escritório | 53 | 49 (saem os 2 do cofre e os 2 do telefone) | 74 | **79**: 49 + 21 de hoje + telefone 2 + secretária 3 + cofre 3, mais 1 com o cofre aberto |

`scripts/test-kit-runtime.ts` ganha a conta «por dado» com esses tetos (59, 33, 79). O teto
temporário de ÁT-K1 (58 lotes, 102 draws) **não é gasto**: o átrio não desenha um nó a mais do que
hoje em nenhum estado de L3. Triângulos de kit instanciados: átrio 43.324, escritório 31.638.

**A secretária na mesa [a validar por `test:desk-top` e pela rota].** A mesa, em coordenadas da
sala [medido]: tampo de x 0,200 a 1,100 e z −1,025 a 0,725; mata-borrão (0,747) de x 0,295 a 0,975
e z −0,855 a 0,555; na faixa de nogueira do lado do telefone (z 0,555 a 0,725, a 0,74) está o
rádio, de x 0,323 a 0,396. A secretária fica nessa faixa, com o lado comprido ao longo de x:
0,21 m de fundo por 0,15 m de largura por 0,06 m de altura, centro em (0,615; 0,642), de x 0,51 a
0,72 e z 0,567 a 0,717, com 12 mm até o mata-borrão e 8 mm até a borda. Frente e teclas viradas
para quem chega (−x); a luz de recado no tampo, para ser vista de qualquer lado. Plano B, se a
mira ou o apoio reprovarem: no mata-borrão, entre o caderno e o telefone, centro em (0,42; 0,07),
0,15 de fundo por 0,20 de largura.

**Frame [previsto; medido em F5].** R01 de 58 para 61 e R02 de 66 para 70 (teto 100); R03 a R06 e
R10 iguais aos de hoje com o Livro à vista, e um a menos antes de o Livro ser achado; Holyoke
igual. Programas: 35.

## 8. Dívidas datadas

### 8.1 Fecha em L3

| Portão | Código | Id | Como | Fatia |
|---|---|---|---|---|
| `validate:content` | `checklist-item-untickable` | `notebook.todo.vault` | vira promessa datada sem caixa (`deferredUntilLot: 12`) | F1 |
| `validate:content` | `speech-night-state-unconditional` | `radio.patience.t4.dark`, `radio.patience.t5.soap.2`, `radio.deadAir.rain` | `RadioReply.when` e `RadioOutburst.when` | F2 |
| `validate:content` | `text-ages` | `document.predecessor.body` | o bilhete dá lugar a `doc-otavio-handover` | F5 |

### 8.2 Abre em L3

| Portão | Código | Id | Até | Por quê | Fatia |
|---|---|---|---|---|---|
| `validate:content` | `flag-never-set` | `basement-drained` | L12 | a fala da chuva pergunta se a bomba já secou o poço (DL3-14); nada põe a flag antes da bomba | F2 |

**Promessas datadas** (`deferred`, impressas pelo portão; `deferred-overdue` quando a data chega):
o pódio (`atrium-podium`, L11); `notebook.todo.vault` (L12); `notebook.todo.proof` (L12).

**Texto que outro lote muda**, sem código de dívida (vai para o HANDOFF): a folha da gaveta e o
recado ganham «o verso» em L4; a folha ganha «há caminho» em L11; `radio.hint.posse.what` e a
posição do púlpito mudam com a planta do saguão (L9); `radio.patience.t3.torch.close` ganha `when`
em L11 (o motor da porta volta com a luz geral); a sequência ganha a grade do alto-falante em L5;
ÁT-A6 (a) e (b) em L10.

Continuam como estão, com a data delas: `exhibit-uncataloguable` (três peças), `hotspot-
unreachable`, `checklist-item-untickable` de `notebook.todo.catalogue` (L4) e as demais de
HANDOFF §11.6. Um validador de L3 que acuse algo fora destas tabelas reprova a fatia.

## 9. Testes

### 9.1 Suítes

| Suíte | Estado | Entra | Fatia |
|---|---|---|---|
| `test:ending` | **nova** (`scripts/test-ending.ts`) | T14 a T17; T19, T20 | F4, F5 |
| `test:speech-coherence` | **nova** (`scripts/test-speech-coherence.ts`) | T9; T19 | F2, F5 |
| `test:opening` | ganha casos | T1, T2, T5, T6, T8, T10, T11 | F1 a F3 |
| `test:opening-flow` | ganha casos | T2, T3, T4, T10, T11, T13, T15, T19 | F1, F3, F4, F5 |
| `test:radio` | ganha casos | T5, T6, T7, T12, T19 | F2, F3, F5 |
| `test:mobile-controls` | ganha casos | T15 | F4 |
| `test:save` | ganha casos (abas vivas) | T5, T6, T14, T20 | F2, F4, F5 |
| `test:triggers`, `test:locks` | ganham casos | T14; T10 | F4; F3 |
| `test:playthrough` | ganha casos e mãos novas | T1, T8, T12, T14, T19, T21 | F1 a F5 |
| `test:navigation`, `test:desk-top`, `test:kit`, `test:kit-runtime` | ganham casos | T2, T12, T18 | F1, F3, F5 |
| `test:lints`, `test:qa-save`, `test:ratchets`, `test:docs`, `test:map` | ganham casos | T7; T19; T21; T21; T4 | — |

`package.json`: `test:ending` e `test:speech-coherence`. No `check`: `test:ending` depois de
`test:locks`; `test:speech-coherence` depois de `test:playthrough`; `test:bundle` continua no fim.
Sem dependência nova: tudo é `node --experimental-strip-types`.

**Três regras de L2 que valem para toda tarefa acima** (HANDOFF §11.10):

- **mão de robô copiada do handler não prova o handler.** Cada verbo novo (acertar o relógio,
  ouvir, assinar, girar a porta) ganha em `scripts/lib/runtimeWiring.ts` a asserção de que o
  componente chama a função pura, com uma mutação em memória que prova que a asserção morde;
- **persistência se prova com abas vivas.** Todo campo, subcampo, migração e gatilho novo tem um
  caso em `scripts/lib/liveTabs.ts` (os temporizadores disparam, cada escrita é avisada às outras
  abas, até o silêncio e com teto): duas abas deste build, uma aba sem regras, e uma aba que grava
  como L2 gravaria;
- **função nova no store entra em `scripts/lib/storeActions.ts`**, e campo novo em `SAMPLES`, em
  `ATOM_PREFIX`, em `saveIdsByField` e no instantâneo: quatro tabelas tipadas pela do save, que não
  compilam sem a linha.

### 9.2 Testes que mudam de sentido (plano mestre, 6.5; aviso no HANDOFF)

| Teste | Prendia | Passa a prender | Fatia |
|---|---|---|---|
| `scripts/test-opening.ts:210-228` | três linhas; a do cofre sem `doneWhen` («the vault stays open until the vault exists») | toda linha com `doneWhen` ou data; contadores; a linha 3 sem caixa e com nota | F1 |
| `scripts/test-locks.ts:60`, `scripts/test-power.ts:106, 116` | ids `olympic` e `breaker-handle` | `lineage` e `crate-dolly`; o sentido não muda | F1 |
| `scripts/test-opening-flow.ts:1284-1330` | a última dica e a quarta linha da primeira chamada sem «medalha», «cofre», «não desce» | nenhuma fala antes da Posse promete o que L11 e L12 trazem; a primeira chamada tem duas linhas; o limite de 130 passa ao validador | F2, F5 |
| `scripts/test-radio.ts:879-926` | «`radio.call.first.4` manda pegar o rádio»; a Helena apresentada em duas chaves | `porter-hello` não manda pegar o que talvez já esteja no bolso; a Helena apresentada em **toda** chave que a cita | F2 |
| `scripts/test-radio.ts:928-960` (`HINT_TARGETS`) | a dica curta com os substantivos da cheia | com os da altura «o quê» | F2 |
| `scripts/test-playthrough.ts:391-467` | o fim de hoje, átomo por átomo, e cinco níveis | o fim de cada fatia; sete níveis em F5 | F2, F5 |
| `scripts/test-save.ts:233-238` (`UNKNOWN`) | `termsSigned` como campo que este build não conhece | outro nome; `termsSigned` vira amostra de `SAMPLES` | F4 |
| `scripts/test-qa-save.ts:289-331` | todo id de um fixture é id do conteúdo | ou tem alias para um | F5 |
| `scripts/test-kit-runtime.ts:267-302` | 56 e 53 lotes de kit | os mesmos, e ao lado a conta por dado (59, 33, 79) | F1, F5 |

`scripts/test-opening.ts:422` (a lanterna nunca alcança o teto do átrio) e
`scripts/test-navigation.ts` (`reciprocalPairs.size === 3`) não mudam.

## 10. Bundle e catracas

Hoje (HANDOFF §11.3): documento 63.234 bytes de gzip (teto 63.600), título 29.913 (teto 30.050),
jogo 390.995 (teto 392.700). **A folga do título é de 137 bytes**, e os dicionários viajam com o
título: toda fatia que escreve texto sobe esse teto.

| Caminho | O que entra | Previsto | Fatia |
|---|---|---|---|
| título | 12 chaves e a carta maior | +0,4 kB | F1 |
| título | cerca de 45 chaves de fala; `hintHeight`; `prePosse` | +1,6 kB | F2 |
| título | 8 chaves | +0,2 kB | F3 |
| título | 9 chaves; `termsSigned`, `sequencesSeen` | +0,3 kB | F4 |
| título | cerca de 60 chaves (dois documentos longos, o recado, falas) ; o alias | +2,4 kB | F5 |
| jogo | `checklist.ts`, dispositivos miráveis, `nightClock.ts`, `readingQueue.ts`, `voiceDevice.ts`, `containerNodes.ts`, `termRules.ts`, `holdAction.ts`, `sequenceRules.ts`, `SequenceOverlay.tsx`, o conteúdo novo | +6 a +9 kB no lote | F1 a F5 |

Tudo [previsto]. Cada teto sobe **no commit da fatia que precisa**, para o medido mais meio por
cento, com o motivo em `BUNDLE_PATH_CEILINGS`. Os dois orçamentos do papel ficam longe: 93 kB antes
do clique (250) e 484 kB no total (600); o lote termina perto de 98 e 500. O store continua sem
importar conteúdo: os termos, as sequências e os marcos chegam a ele só como ids em listas, e o
gatilho do termo é compilado do lado do canvas (`contentRegistry.ts`); `test:save` caminha os
`import` como hoje. Dicionário em duas camadas é de L17.

`BROWSER_RECORD` (T21): os dez pontos, depois de reload limpo, 1280 × 720, qualidade `medium`,
três passadas iguais. R01 e R02 no estado da linha de base (jogo novo, três salas acesas pelo
store, rádio e caderno na mesa); R03 a R10 com o save do fim da rota de L3 (o Livro à vista), e
de novo com `?qaSave=production-drawer-open`: grava-se o maior. Programas depois das três salas.

## 11. Rota do L3 no navegador (passo 6; F5 faz a parte dela, o fecho faz a rota inteira)

Servidor `museum-dev` (porta 5201), **reiniciado** depois da última edição. 1280 × 720 e depois
844 × 390 **pelos direcionais e pelo botão de Ação**; em pt-BR e em inglês. Console sem erro nem
aviso novo. L3 é um dos quatro lotes em que o percurso completo, do título ao termo, é obrigatório.

**A. Jogo novo, canônico (pt-BR, desktop).** Luminária: `porter-hello` (cinco falas), depois a
instrução do quadro. Caderno: a lista com «0 de 3», «Átrio 0 de 4 · Ala 1 0 de 8», a linha da
caixa-forte sem caixa e com a nota. Rádio. Telefone: «Linha muda.». Relógio: «Acertar o relógio»,
o toast com «Passa das sete», os ponteiros em 19h10. Secretária piscando: o recado inteiro,
«[…16:47.]», o documento no Arquivo; a linha 5 a lápis e «Anotado no caderno». Saguão: o pódio
(«Plinto do Fundador — Interditado: obra do piso.»), o púlpito («…falta o Livro de Termos»), o
quadro, `porter-atrium-service`. Ala 1: quadro, `porter-holyoke-lit`; primeira peça,
`porter-first-catalogued`; arquivo A, um documento por vez; o retrato; saída pelo atalho,
`porter-shortcut`. Gaveta: o ano; a folha 1; toast «Você pegou — Chave do cofre de ferro»;
`porter-drawer-open`. Cofre: a porta gira, o Livro (duas páginas) e a prova, a prova fica na
prateleira; `porter-safe-open`; a lâmpada do púlpito acesa. Púlpito: «Segure E — Assinar: Termo de
posse»; soltar a meio não assina; segurar assina; o cartão, as duas falas com a hora por extenso;
o Livro aberto no púlpito, a lâmpada apagada; a linha 7 riscada; «Termos assinados» no Caderno.
Chamar o Jorge: o fecho honesto. Recarregar: nada toca de novo.

**B. Sem rádio (em inglês, desktop).** O mesmo caminho crítico sem pegar o rádio, o caderno nem a
lanterna: as chamadas só tocam no escritório; no saguão, com uma sala apagada, o púlpito diz o que
falta (*no light yet in: …*); a Posse é assinada e o cartão e as falas tocam do mesmo jeito.
Recarregar no meio da sequência: ela toca de novo do começo.

**C. Ordem estranha.** Digitar o ano antes de sair do escritório (a chave vem cedo; o cofre abre no
escuro; a Posse continua pedindo as três salas). Acender a Ala 1 antes do saguão.

**D. Toque (844 × 390).** A rota A pelos botões: o botão de Ação segurado assina, com o anel;
um toque curto abre «Assinar / Cancelar»; arrastar o olhar para fora cancela; o leitor de um
documento por vez cabe na tela; a aba Caderno cabe.

**E. Saves.** `?qaSave=l2-shortcut-released` e `?qaSave=production-drawer-open`: ao continuar,
nenhum toast; `porter-hello` e depois `porter-legacy-drawer`; o Arquivo mostra a folha nova; o
cofre abre; Posse. `?qaSave=l2-new-game-drawer-touched`: a linha 5 já está na lista (a gaveta foi
tocada); a rota segue. `?qaSave=production-pre-opening` em inglês: carrega, nada some.

**F. Duas abas de verdade**, sobre o save do fim da rota A menos a assinatura: uma assina; a outra,
sem ser tocada, passa a ter o termo e não grava nada.

**Medições:** `__museumPerf()` nos dez pontos (§10). **Capturas** (HUD composto sobre o canvas,
HANDOFF §11.10): a lista com a nota; o prompt do pódio; o recado na legenda; o cofre aberto; o
púlpito com a lâmpada; o anel a meio; o cartão; o Livro no púlpito; e quatro no toque.
**Aceite manual do plano mestre:** percurso completo com e sem rádio, em desktop e toque; uma
pessoa nova chega à Posse (8.10) fica com o dono.

## 12. Fatias

Cada fatia passa pelos passos 2 a 4 de §9.1 e termina com `npm run check` e `npm run build` verdes
e um commit local só com os arquivos dela. Nenhuma concede, cita ou lista algo cujo consumidor não
esteja nela.

| Fatia | Tarefas | O jogador vê | Depende de |
|---|---|---|---|
| **F1 — A lista, a promessa datada e os nomes** | T1, T2, T3, T4 | a lista com contadores e a nota; o pódio com aviso; a aba Caderno; «caixa-forte»; «Gaveta do Otávio» | — |
| **F2 — O Jorge por marco e a hora da noite** | T5, T6, T7, T8, T9 | chamadas novas; dica em três alturas; o relógio que se acerta | F1 (dispositivos miráveis) |
| **F3 — O escritório responde** | T10, T11, T12, T13 | o telefone; um documento por vez | F1 |
| **F4 — Assinar** | T14, T15, T16, T17 | nada (o motor do púlpito, provado em casa de teste) | F1, F2 (`{hora}`), F3 (página do leitor) |
| **F5 — Posse** | T18, T19, T20, T21 | a cadeia inteira, do recado à assinatura | F1 a F4 |

Por que esta ordem: a cadeia gaveta → chave → cofre → Livro → púlpito → fecho não se parte sem que
alguma fatia conceda uma chave sem fechadura ou cite um livro sem púlpito, então ela é uma fatia
só (F5), e o motor dela é entregue antes, provado com casas feitas para o teste, como L2 fez com os
gatilhos. F1 a F3 têm conteúdo de verdade que se fecha em si; F4 não tem nenhum.

## 13. Riscos

| Risco | Como aparece | Resposta |
|---|---|---|
| o gesto toca o caminho de todo `E` | uma interação comum passa a agir duas vezes no toque (no `pointerdown` e no `click`), ou deixa de agir | `onClick` só age sem ponteiro antes; `test:mobile-controls` e `holdWiringProblems`; a rota D inteira pelos botões |
| segurar com a aba congelada, ou `keyup` que nunca chega | assina sozinho, ou fica preso em `holding` | passo limitado a 0,25 s; `blur` e `visibilitychange` cancelam; perder a mira cancela |
| o save com gatilhos de verdade, entre abas e builds | chave ou flag perdida; duas abas gravando sem parar | tudo é lista com união; casos de abas vivas em T5, T6, T14 e T20, com uma aba sem regras e uma aba de L2 simulada |
| rollback para antes de L2 | `termsSigned` some; a Posse pede nova assinatura | registrado (caso G); o gatilho da gaveta só concede o que é seguro conceder duas vezes |
| o pódio, o púlpito e o telefone fora do `kit` | perdem colisão; a cápsula atravessa | `DeviceLayer` registra colisor; `test:navigation` e `test:collision` |
| a secretária não cabe ou não se mira atrás do rádio | `test:desk-top` ou a inundação reprovam; o prompt disputa com o rádio | plano B de posição em §7; o vencedor é o mais próximo, com empate de 3 cm |
| o teto do `kit.glb`, que está em zero de folga | `test:ratchets` vermelho no bake | sobe no commit do bake, com o motivo; os tetos de draws não sobem |
| draws do átrio | a lâmpada e o Livro juntos (um termo pendente depois de outro assinado) | não acontece em L3 (um termo só); L12 herda a conta, já depois da fusão de L6 |
| o índice de `lastHint` muda com as dicas novas | um elogio ou uma altura errada, uma vez, em save antigo | aceito e registrado; `hintHeight` começa em 0 |
| a legenda de uma chamada do rádio da mesa continua no saguão | o jogador lê o Jorge sem ter o rádio | é ÁT-A6 (a), de L10; a sequência dirigida não depende disso |
| «alto-falante» sem alto-falante até L5 | o jogador procura de onde vem a voz | só a legenda o nomeia; a grade chega em L5 |
| texto demais na tela de título | o caminho do título cresce 5 kB | dentro do orçamento de 250; camadas em L17 |
| um falso positivo de `text-ages` ou de estado da noite | um documento honesto acusado | os textos de §6 foram conferidos contra as duas listas; a gravação é documento e não fala da noite de agora (DL3-13) |

## 14. O que fica para o fecho do lote (passos 5 a 12 de §9.1)

- revisão adversarial (passo 5): a rota canônica e duas ordens estranhas, uma sem rádio; os saves
  do corpus; objeto sem resposta; texto que aponta para o que não existe; fala que o estado
  desmente;
- a rota inteira de §11 (F5 faz A, D e E no mínimo necessário para medir);
- `npm run graph:snapshot` de novo sobre o que for publicado, e o SHA-256 em `FROZEN_SNAPSHOTS`
  quando o plano disser «Feito em»;
- corpus: dois saves tirados do navegador, copiados do texto da chave: `l3-posse-signed` (a rota A
  a partir de `l2-shortcut-released`, com a flag de legado) e `l3-new-game-safe-open` (jogo novo,
  cofre aberto, Posse por assinar, sem rádio);
- capturas: conjuntos `l3` e `l3-touch`, congelados com digest;
- `docs/HANDOFF.md`, §12: o que mudou, as medições, os testes de 9.2, as dívidas de §8, **a perda
  do rollback (caso G)**, os textos que outros lotes mudam, as lições; o Anexo C do plano mestre
  ganha `flag-never-set` e as promessas datadas; a seção L3 do plano ganha o «Feito em»;
- revisor, push, deploy e fumaça (passos 8 a 11), que este plano não autoriza por si; playtest
  (passo 13).

## 15. Execução, fatia por fatia

A preencher por cada fatia: o vermelho visto antes do conserto, as mutações, o que saiu diferente
do que está acima.
