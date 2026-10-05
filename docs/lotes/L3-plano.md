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
| DL3-12 | a sequência dirigida | lista própria do conteúdo (`sequences`), tocada pelo HUD; tira o rádio do ar ao começar (no mesmo `set` do store que a põe na tela, §15.4; a chamada cortada não conta como ouvida e volta depois); só entra em `sequencesSeen` no último passo | M42. Uma chamada de rádio com `directed: true` dependeria do aparelho; a sequência não tem aparelho |
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
| 8 | `notebook.todo.proof` | curator | `documentsRead: ['doc-label-proof-office']` | — (`deferredUntilLot: 12`, `noteKey: 'notebook.todo.proof.note'`: uma promessa datada sem nota é `deferred-without-notice`) | — |

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

/** Lines of its own, or a recording (its lines are the document's, and hearing it out files the document). */
export type VoiceUtterance =
  | { readonly when: ProgressCondition; readonly lineKeys: readonly string[]; readonly documentId?: never }
  | { readonly when: ProgressCondition; readonly documentId: string; readonly lineKeys?: never }
```

(F3 escreveu a fala como união: uma fala que é as duas coisas não compila. Ver §15.3.)

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
/** F4. A press on it has to be held: a desk with a term ready. */
export function deviceHeld(intent: DeviceIntent): boolean
/** F3. The input, read off the save and the air, against the content (a voice asks its conditions of it). */
export type DeviceContent = Pick<MuseumContent, 'rooms' | 'exhibits' | 'terms' | 'sequences'>   // F4: + terms, sequences
export function deviceInputOf(device: DeviceData, world: DeviceWorld, content: DeviceContent): DeviceInput
/** F4. Something speaks or shows on the air: a transmission, or a directed sequence. */
export function airTaken(state: { readonly radio: object | null; readonly sequence?: object | null }): boolean
/** F3. What a voice would say now: the first utterance whose `when` holds. */
export function voiceUtterance(device: Pick<VoiceDevice, 'utterances'>, progress: ConditionProgress, content): VoiceUtterance | null
/** F3. Whether the message lamp shows now: it blinks while a recording waits unheard, with the mains on. */
export function messageLampLit(device: Pick<VoiceDevice, 'messageLamp'>, input: Pick<DeviceInput, 'powered' | 'recording'>, seconds: number): boolean
```

`DeviceInput` (F1: `powered`, `carried`, `speaking`; F2: `set`) ganha em F3 `voicing` (a transmissão
no ar é a deste aparelho) e `recording: 'none' | 'waiting' | 'heard'` (o que ele tocaria agora), e
em F4 `desk: SigningDeskState` (o que a mesa oferece agora; de um dispositivo que não é mesa,
`empty`). `DeviceWorld` ganha `sequence?` (a sequência no ar): com uma sequência devida ou tocando,
`deviceInputOf` pergunta a mesa com `held` (3.10) e ela não oferece o termo seguinte. Uma mesa não
tem sala de energia (`devicePowerRoom` → `null`): o que a segura é o termo, não a luz dela.

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
/** F3. Whether a container stands open: its lock is open, or it has none. What the door and the contents are drawn by. */
export function containerOpen(container: Pick<ContainerData, 'lockId'>, progress: Pick<Progress, 'locksOpened'>): boolean
/** F5. Whether a shut lock still bars the way: E on it neither finds it open nor opens it. What a prompt is worded by. */
export function lockBars(lock: Lock, facts: readonly Fact[], progress: Pick<Progress, 'locksOpened' | 'credentials'>): boolean
```

**O prompt de uma tranca que a mão abre** [não previsto; F5, §15.5]. Com a chave em `credentials`
o cofre fechado abre no próprio `E`, e o prompt não pode continuar dizendo «precisa de chave»:
`containerPrompt(container, lock, barred, gives)` diz «Destrancar · Cofre de ferro»
(`prompt.unlock`) quando a tranca está fechada e `lockBars` responde que não. Uma tranca de
teclado barra até o ano ser digitado, tenha o jogador o que tiver.

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
/** F3. How many pages the reader turns (a notebook its own bound pages), and E on it: the next page, or `close`. */
export function readerPageCount(content, containerId: string | null): number
export function readerAdvance(content, containerId: string | null, page: number): number | 'close'
/** F3. The page an arrow or a page key turns to; null for any other key. They stop at each end. */
export function readerKeyPage(code: string, page: number, lastPage: number): number | null
/** F3. A transcript as it is printed: one paragraph. */
export function transcriptText(lines: readonly string[]): string
```

O estado da página é o `notebookPage` que o store já tem (zera a cada container aberto); a regra de
avançar é `notebookAdvance`, a mesma do caderno (por `readerAdvance`).

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
  | { readonly state: 'signed'; readonly term: Term }                       // every presented term is signed; the last of them
/** `held`: the sequence a signature is followed by is still owed or on screen, and the desk offers nothing further (S26). */
export function signingDeskState(terms, desk, progress, content, held = false): SigningDeskState
/** The terms a desk signs, and the ones the save holds a signature for, in the content's order. */
export function deskTerms(terms: readonly Term[], desk: Pick<SigningDesk, 'termIds'>): readonly Term[]
export function signedTerms(terms: readonly Term[], progress: Pick<ConditionProgress, 'termsSigned'>): readonly Term[]
/** DL3-7, as a rule: the lamp while a term waits (blocked or ready), the Book once one of the desk's own is signed. */
export function deskShows(state: SigningDeskState, desk, progress): { readonly lamp: boolean; readonly book: boolean }

// signingDesk.ts — no React; what E does at a desk, for the game and for a store made for a test.
/** Ready: asks for the press to be held. Blocked: the buzz of a lock, and the press is taken. Otherwise declines. */
export function pressSigningDeskOn(store, content, deviceId: string): boolean | HoldRequest
/** The hold came to its end: asks the desk again, and signs what it offers now (one write, one chime). */
export function signAtDeskOn(store, content, deviceId: string): boolean
```

(F4, §15.4: `signed` leva o termo, porque o prompt o nomeia, «Púlpito — Termo de posse · assinado
✓»; e `held` é como S26 se cumpre sem a mesa conhecer o HUD.)

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
export function isHoldRequest(answer: boolean | HoldRequest): answer is HoldRequest
/** The gesture as one string, for a React selector: it changes with the phase and the target, never with the frames. */
export function holdMark(gesture: HoldGesture): string        // 'idle' | 'holding:<seconds>:<id>' | 'confirming:<id>'
export function readHoldMark(mark: string): HoldView
```

| Estado | `press` | `tick` | `release` | `cancel` |
|---|---|---|---|---|
| `idle` | `holding` em 0 | fica | fica | fica |
| `holding` | ignorado (a mesma entrada não desce duas vezes) | mira em outro alvo → `idle`; senão **soma o passo**, limitado a 0,25 s, e com a soma ≥ `seconds` → `idle` e **dispara**: o quadro que completa o tempo é o que assina (um passo de zero devolve o mesmo gesto) | `held` < 0,3 s → `confirming`; senão `idle` | `idle` |
| `confirming` | mesmo id → `idle` e **dispara**; outro id → `holding` nele | mira em outro alvo → `idle` | fica | `idle` |

```ts
// primaryAction.ts
/** A handler acts (true), declines (false), or asks for the press to be held. */
export type PrimaryActionHandler = () => boolean | HoldRequest
/** The input went down: at most one handler answers. */
export function pressPrimaryAction(): 'none' | 'acted' | 'holding'
/** A press whose handler was already asked (the keyboard asks its own `interact`) goes on through the same gesture. */
export function beginPrimaryHold(request: HoldRequest): 'acted' | 'holding'
/** The input came up. */
export function releasePrimaryAction(): void
export function cancelPrimaryHold(): void
/** One frame of a hold in progress, with what is under the crosshair now. */
export function tickPrimaryHold(seconds: number, aimed: string | null): void
export function primaryHold(): HoldGesture
export function primaryHoldMark(): string
export function subscribePrimaryHold(listener: () => void): () => void
export function onPrimaryHoldFired(listener: (id: string) => void): () => void
/** A press and its release at once: what a click is. Kept for whatever cannot tell down from up. */
export function triggerPrimaryAction(): boolean
export function isInteractKey(event): boolean      // E, claimed or not: its coming up is the release
export function isHoldCancelKey(event): boolean    // Escape

// mobileControls.ts — pure; what the touch buttons remember of a pointer, so that a touch acts once.
export const POINTER_CLICK_ECHO_MS = 700
/** A click is the press itself unless a pointer that already pressed made it (detail > 0, inside the echo window). */
export function clickIsThePress(detail: number, msSincePointer: number): boolean
export type ActionPointer = { readonly pressed: boolean; readonly at: number }
export const NO_ACTION_POINTER: ActionPointer
/** A pointer going down starts over: whatever an earlier one left behind is forgotten. */
export function actionPointerDown(press: boolean, at: number): ActionPointer
export function actionPointerUp(pointer: ActionPointer, at: number): { readonly pointer: ActionPointer; readonly release: boolean }
export function actionClick(pointer: ActionPointer, detail: number, at: number): { readonly pointer: ActionPointer; readonly press: boolean }

// interactionTarget.ts
/** Whether what owns the crosshair asks for its press to be held, and its id (what a hold in progress must stay on). */
export function interactionHeldOf(state: FocusState, content: InteractionContent): boolean
export function interactionHeldIdOf(state: FocusState, content: InteractionContent): string | null
```

Os ouvintes de `subscribePrimaryHold` só são avisados quando a marca muda (`holdMark`): o anel é uma
animação de CSS com a duração do pedido, e nenhum quadro de uma espera acorda o React.

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
//              + startSequence(id: string, steps: number): void   also takes the air from the radio, in the same set
//              + advanceSequence(): void                           the last step grants { sequencesSeen: [id] }, in one write
//              + stopSequence(): void                              records nothing

// sequenceDirector.ts — no React; what the HUD and the R key ask, for the game and for a store made for a test.
/** Starts what is owed, unless it is held (a modal, a hidden tab, the scene not ready), the game has not started, or one plays. */
export function startDueSequenceOn(store, content, held: boolean): boolean
/** Moves the one on screen a step on. Not under a modal. False when none plays. */
export function skipSequenceStepOn(store): boolean
/** A card stays its own seconds; a line stays as long as a line of the radio of that length (`radioLineSeconds`). */
export function sequenceStepSeconds(step: SequenceStep, text: string): number
```

A sequência é da sessão e do jogo: `takeInOtherTabs` a encerra quando outra aba começa um jogo novo
(o que tocava era da noite que acabou), e um reload a perde sem gravar nada, de modo que ela toca
de novo do começo.

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

(F4, §15.4.) O registro de uma assinatura é `sign:<mesa>:<termo>`. A jogadora exaustiva **assiste**
o que o jogo mostra sozinho: a cada assentamento, toda sequência devida entra em `sequencesSeen`,
uma por vez, como o HUD a toca para quem espera; assim um cartão nunca segura dela a mesa. E há
uma segunda jogadora, a **apressada** (`play(…, eager)`), que assina cada termo no primeiro
instante em que a mesa o oferece, antes de qualquer outra coisa ao alcance: é por ela que o portão
sabe o que uma assinatura tira da mesa (`post-ending-disables-action`), porque a primeira faz todo
o resto antes e nunca notaria.

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
6. `validate.ts` (novo `validateDeferred(content, lot?)`, chamado de `validateContent` sempre, com
   o lote de `extras.knownDebt` quando há): `deferred-overdue` para linha ou aviso cuja data chegou
   (só é perguntado quando o portão sabe em que lote o conteúdo está);
   `deferred-without-notice` para linha datada sem `noteKey` e aviso sem `noticeKey` (perguntado
   sempre, também pelos museus quebrados das suítes). O portão imprime as promessas com as dívidas
   (`datedPromises`; `formatKnownDebt` ganha a tabela «promessas datadas»).
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

**Vermelho hoje.** O caso do prompt: `deviceIntent` e `aimableDevices` não existem, e o pódio não
está em `devices` (a cena nunca o põe em foco). O plano dizia que, com o pódio como único foco, o
vencedor de hoje é `null`: não é. `interactionWinner` responde `{ kind: 'device', live: false }`
para **qualquer** id em `focusedDevice`, exista ou não o dispositivo; o que falta hoje é o alvo, não
a resposta (corrigido em F1, ver §15). Na inundação, a lista de alvos de hoje tem 26 e nenhum é o
pódio: a asserção «todo dispositivo mirável do conteúdo é um alvo julgado» reprova.

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
   `oldNews` e para `helloCallId`; `legacy-save-milestone` para cada `id` de `oldNews` que não
   é id daquela lista do save; `radio-lapse-not-positive` para um `lapsesWhen` que pode deixar de
   valer (caducar é para sempre).
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
   a regra é provada com uma casa feita para o teste, e vale no museu de verdade em F5. Para a
   regra ter o que ler, o tipo `Term` de 3.10 e `MuseumContent.terms?` entram no `schema.ts` já
   em F2; «assinado», até F4 trazer `termsSigned`, é a flag `grants` do termo no save.)
   `validateOpening` (em `validate.ts`: é uma pergunta sobre ids, que não precisa jogar):
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
   (frases ≠ marcos), `night-milestone-not-positive`, `night-milestone-duplicate` (um marco
   listado duas vezes valeria dois pontos), `night-milestone-count` (`cataloguedAtLeast` fora de 1
   a n da própria lista), `clock-without-title` (relógio com `setFlag` e sem `titleKey`: o prompt
   não teria como chamá-lo), ids das condições por `checkCondition`.
7. `scripts/lib/playthrough.ts`: a mão `set-clock`; `storeActions.ts` não muda (não há função nova).

**Teste.** `test:opening` (junto de `:389-420`): antes de acertar, o relógio anda de 16h47; depois,
mostra 19h10 com um ponto e 30 min a mais por ponto; sem energia não se acerta. `test:speech-
coherence` (T9): a contagem de pontos nunca diminui em 500 ordens. `test:playthrough`: `flag:clock-
set` entra em `MAXIMUM` e no nível `N1` (`:391-467`): o relógio pede a luz do escritório, que é
de N0, e uma passada da simulação não vê o que ela mesma acabou de fazer.

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
   (`placeRadioCallOn(store, content, …)`: a função de `placeRadioCall`, com o store e o conteúdo
   dados por quem chama, relógio e dado fixos) e anota a resposta. O ouvinte é `radioEar`, em
   `playthrough.ts`.
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
   `knowledge`; portal continua recusado. Novos: `consumable-multi-consumer` (ferramenta consumida
   que mais de uma tranca pede; em `validateLockHosts`), `container-node-missing` (porta ou
   conteúdo sem nó no bake; em `validateBake`, que é quem tem o manifesto).
3. `schema.ts`: `ContainerData.door`, `.contents` (3.8). `Containers.tsx`: um pivô na dobradiça,
   como `prepareClockHands` (`Devices.tsx:135-164`), reúne os nós `<part>__<prefixo>*` e gira até
   `openAngle` quando o container está aberto (`containerOpen`: a tranca aberta, ou sem tranca);
   os nós de `contents` ficam num grupo com `visible` igual a «aberto» (a mira rejeita o que tem
   ancestral oculto, como hoje). No primeiro quadro a porta está onde o save a tem (um cofre
   aberto noutra noite é encontrado aberto); só a que abre agora é vista girar, em 0,7 s
   (`doorAngleAfter`). `src/engine/containerNodes.ts` (novo, puro sobre objetos three, no molde
   de `deviceNodes.ts`) para a suíte rodar em Node.
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

**Mudança.** `MuseumContent.credentials` (3.8); `validate.ts` (`validateOpening`, que já sabe o
que os efeitos dão e passa por toda condição): `credential-undeclared` (uma credencial que um
efeito dá, ou que uma tranca ou uma condição pede, e que não está na lista) e `credential-unused`
(declarada, e nada dá nem pede); `Hud.tsx`: `CredentialToast` («Você pegou — {título}») pela
regra `credentialsTaken` (`promptRules.ts`: `listGrew` sobre `credentials`, com o título vindo do
dado; credencial que este build não declara não tem nome e não é anunciada). Em F3 a lista do
museu é vazia. **«Dada pelo gatilho na carga não é anunciada» é uma ordem, não uma regra do
toast:** o HUD é um chunk à parte e pode chegar antes do canvas, que é quem registrava as regras
do conteúdo; `Hud.tsx` passou a importar `engine/contentRegistry` pelo efeito, de modo que o save
que o HUD vê no primeiro render já foi assentado.

**Teste.** `test:opening`: os dois códigos; `test:opening-flow`: o toast só anuncia crescimento
(a tabela de `credentialsTaken`) e a fiação (o import do registro, com mutação); `test:locks`: o
save com a gaveta aberta recebe a chave quando o conteúdo se registra, numa escrita, e a regra
perguntada com o que o HUD vê ao montar não anuncia nada; a chave pega em jogo é anunciada uma vez.

**Vermelho hoje.** `credential-undeclared` não existe: um museu de teste que dá `tool:service-key`
sem declará-la passa no portão.

### T12 — O aparelho de voz e o telefone (M9; I-06; furo 13) · F3

**Hoje.** `museum.ts:1481`: o telefone é `kit`, mudo. `store.ts:278-299, 744-750`: uma transmissão
só grava `callId`.

**Mudança.**

1. `schema.ts`: `voice`, `VoiceUtterance`, `DocumentData.lineKeys` (3.5, 3.9).
   `store.ts`: `grantOnEnd` em `RadioTransmission`; `endRadio` (`:744-750`) junta as duas concessões
   num `commitProgress` só, e só arquiva o que foi ouvido até a última linha (`dropRadio`, que
   encerra uma transmissão com linhas por dizer, continua marcando a chamada e não arquiva).
2. `deviceRules.ts`: `voiceUtterance(device, progress, content)` (a primeira que vale);
   `deviceIntent` para `voice`: `dead` sem a energia que pede, `skip` com a própria fala no ar,
   `again` quando o documento da gravação já foi lido, `play` no resto. Para perguntar as
   condições, `deviceInputOf` passa a receber o conteúdo (era um `roomById`).
   `src/engine/voiceDevice.ts` (novo, sem React, no molde de `radioCall.ts`): `operateVoice(id)`
   (e `operateVoiceOn(store, content, id)`, a mesma com o store e o conteúdo dados) chama
   `startRadio` com as linhas (as do documento, numa gravação) e `grantOnEnd`
   (`recordingGrant`, em `progressGrants.ts`: o documento e o fato que ele revela). **Começar a
   falar toma o ar de quem estava nele:** uma chamada do Jorge cortada assim não foi ouvida, não
   é gravada como ouvida e continua devida.
3. `Devices.tsx`: `interact` despacha `voice`; `VoiceDeviceView` pisca o `__led` (entre `led-red`
   e `led-off`, por `paintLenses`) enquanto há gravação por ouvir e energia (`messageLampLit`).
   `RadioDirector` passa a perguntar o que é devido também quando o ar se cala (`onAir` nas
   dependências do efeito): até F3 nada tirava uma transmissão do ar, e uma chamada cortada não
   escreve nada no save que acordasse o diretor.
4. `validate.ts`: `voice-silent` (sem fala incondicional no fim, ou com fala que não é nem linha
   nem gravação), `voice-recording-missing` (`documentId` que não é documento com `lineKeys`, ou
   cujo `containerId` não é este aparelho), `device-node-missing` pede `__led` quando
   `messageLamp`. `spokenKeys` inclui as falas próprias; as linhas de uma gravação são só
   medidas contra os 130 caracteres de uma legenda (`recordedKeys`: a transcrição é documento,
   feita noutro dia, e o visor da secretária diz `16:47`). `textLint.ts` lê as falas próprias
   em `speech-night-state-unconditional`.
5. `simulate.ts`: ação `voice` (concede o documento da gravação que vale; nada, numa fala),
   oferecida sempre que o aparelho responderia. O registro é por gravação
   (`voice:<aparelho>:<documento>`); uma fala própria não tem registro, porque não concede nada.
   `Hud.tsx:285-318` e `Journal.tsx:91-112`: documento com `lineKeys` é impresso como um parágrafo
   (`transcriptText`).
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
`notebookAdvance` sobre o tamanho da fila, para todo container (`readerAdvance`). `Hud.tsx:285-318`:
uma página por vez, com «← Voltar», fólio «n / m» e «Próximo →» / «Fechar» (as teclas ← → de
`Notebook.tsx:74-89` passam a valer para os dois leitores: `src/ui/useReaderKeys.ts`, sobre a
regra `readerKeyPage`). Um armário com um papel só continua com um botão só. `containerGrant`
não muda (DL3-9). **No leitor o papel rola e os botões não** (`.examine-panel.is-reader`, em
`museum.css`): o painel rolava inteiro, e em 844 × 390 «Próximo» ficava 98 px abaixo da dobra.

**Teste.** `test:opening-flow`, regra pura `containerReadQueue`: o arquivo A da Ala 1 dá duas
páginas, na ordem do conteúdo; um documento de duas páginas dá duas; um container vazio, nenhuma;
`E` na última fecha. E a asserção de que abrir concede os dois documentos de uma vez (o que o
registro de L2 diz). `test:map` (`readerLayoutProblems`): a forma do leitor na folha de estilos,
e a soma da altura dele com a margem numa tela baixa.

**Vermelho hoje.** `containerReadQueue` não existe.

### T14 — Termos e mesa de assinatura (M31; S26) · F4

**Hoje.** Nada. `additive.ts:192` grava `terms: []`; `:380-383` acusa qualquer termo de um registro.

**Mudança.**

1. `schema.ts`: `Term`, `signing-desk`, página `term` (3.9, 3.10); `ProgressCondition.termsSigned`.
2. `progressFields.ts`: `termsSigned`, `sequencesSeen` (3.1). `triggers.ts:48-62`: `compileTriggers`
   acrescenta `term:<id>:signed` (`when: { termsSigned: [id] }`, `set-flag`).
3. `src/engine/termRules.ts` (novo). `deviceRules.ts`: `deviceIntent` de `signing-desk`;
   `deviceLive` em `ready` e em `blocked` (o que não pode ser assinado ainda responde com o
   zumbido, como uma porta trancada); `deviceHeld` só em `ready`.
4. `Devices.tsx`: `SigningDeskView` (o `__led` num grupo visível só em `blocked` e `ready`; o
   `__book` num grupo visível só quando `termsSigned` tem algum termo desta mesa; DL3-7, pela regra
   `deskShows`; os dois grupos são de `deviceNodes.ts`, `prepareDeskNodes` e `showDeskNodes`, que
   não movem nó nenhum). **A lâmpada é verde em `ready` e vermelha em `blocked`** (`led-green`,
   `led-red`, os materiais que o quadro de força já usa): o plano não dava a cor. `interact`
   devolve um `HoldRequest` em `ready`, o zumbido em `blocked`, `false` em `empty` e `signed`
   (`src/engine/signingDesk.ts`, novo e sem React: `pressSigningDeskOn`, `signAtDeskOn`; a mão do
   robô chama as mesmas duas).
5. `promptRules.ts` e `Hud.tsx`: `DevicePrompt` para a mesa: `empty` → «Púlpito — {aviso}» (a
   forma `notice`, sem tecla nem botão); `blocked` → «Púlpito — Assinar: {termo} · falta luz em:
   {salas}» (e «falta: {documentos}»; `deskMissingText`); `ready` → «Segure E — Assinar: {termo}»
   (no toque, «Segure Ação — …»); `signed` → «Púlpito — {termo} · assinado ✓». `Journal.tsx`:
   «Termos assinados» na aba Caderno. `Notebook.tsx`: página `term`, com a linha da assinatura
   preenchida quando o termo está assinado.
6. `simulate.ts`: ação `sign`; `term-unsignable` (o `when` nunca vale), `ending-unreachable`
   (nenhuma mesa alcançável assina o termo, ou um termo mais antigo espera para sempre na frente
   dele), `term-presented-late` (`presentedWhen` pede algo que `when` não pede),
   **`term-blocker-unnamed`** (o `when` pede, além do que o `presentedWhen` pede, algo que não é
   sala acesa nem papel lido: a mesa recusaria sem dizer por quê), `post-ending-disables-action`
   (pela jogadora apressada de 3.12: toda ação oferecida antes de uma assinatura continua depois,
   ou o que ela dava está no save, ou o resto da noite dá por outro caminho). `radio-hint-coverage`
   passa a ler `termsSigned` (um termo assinável e por assinar é objetivo aberto: sem dica acima
   dele, acusa). `additive.ts`: termos no instantâneo (3.12).
7. `validate.ts`: `device-node-missing` pede `__led` e `__book` à mesa; `condition-term-missing`
   (uma condição cita um termo que não existe); `notebook-term-missing` (a página de um termo que
   não existe); e `validateEnding` (nova, chamada por `validateContent`): `term-duplicate`,
   `term-desk-missing`, `gate-uses-negative-condition` e `gate-uses-all-condition` para
   `Term.when` e `presentedWhen` (são do portão estático, não da simulação), `desk-hold-seconds`
   (um tempo de segurar que não é maior que o toque de 0,3 s, ou não é número: a mesa nunca
   assinaria, ou assinaria num toque).

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
   pedido, `beginPrimaryHold(pedido)` segue com ele pelo mesmo gesto que o botão de toque conduz;
   `keyup` de `E` → `releasePrimaryAction()`; `Escape`, `blur` e `visibilitychange` (aba oculta)
   → `cancelPrimaryHold()`; `useFrame` → `tickPrimaryHold(delta, interactionHeldIdOf(state,
   MUSEUM))`, **antes** do teste de modal (sob um modal nada tem a mira, e é isso que encerra a
   espera); `onPrimaryHoldFired(signAtDesk)`, que pergunta a mesa de novo e grava
   `termGrant(termo)` com o som.
3. `MobileControls.tsx`: **só a pressão que tem de ser segurada desce no ponteiro.** O botão de
   Ação tem `onPointerDown` → `pressPrimaryAction()` apenas quando o que está na mira pede para
   ser segurado (`interactionHeldOf`); `onPointerUp`, `onPointerCancel`, `onLostPointerCapture` →
   `releasePrimaryAction()` só do ponteiro que pressionou; e **toda ação comum continua no
   `onClick`**, como sempre foi. O `onClick` é julgado por `actionClick` (`mobileControls.ts`,
   3.10): age, a não ser que seja o eco de um ponteiro que já pressionou. Em `confirming` o botão
   de Ação dá lugar a «Assinar» (à esquerda) e «Cancelar» (onde a Ação estava: o clique que sobra
   do toque cai no que não assina). [O plano mandava agir no ponteiro para tudo; ver §15.4, 1.]
4. `Hud.tsx`: `HoldPrompt` (`useSyncExternalStore` sobre `primaryHoldMark`): anel em volta da
   tecla e do botão enquanto `holding` (animação de CSS com a duração do pedido, `--hold-seconds`,
   sem escrita por quadro no store nem no React); em `confirming`, «E Assinar: {termo} · Esc
   Cancelar». `styles/museum.css`: `.prompt-key.is-holding`, `.mobile-action-button.is-holding`,
   `.hold-cancel`, `.hold-confirm-buttons`.
5. `scripts/lib/runtimeWiring.ts`: `holdWiringProblems` (a fiação acima, linha por linha).

**Teste.** `test:mobile-controls`: a tabela de `holdStep` inteira; segurar 1,2 s dispara uma vez;
soltar a 0,6 s cancela e não dispara; soltar a 0,1 s abre a confirmação, «Assinar» dispara,
«Cancelar» não; perder a mira no meio cancela; um quadro de 5 s conta como 0,25 s; com dois
manipuladores registrados, um pedido de segurar impede o de prioridade menor de agir (um `E`, uma
ação); e, evento por evento, o que o botão lembra de um ponteiro: um toque comum age uma vez (no
clique), o clique que segue uma pressão segurada é eco e não age, um clique de teclado age, e um
ponteiro que desce começa do zero (o caso do toque engolido depois de uma assinatura segurada).
`test:opening-flow` (`:343-373`): todo arquivo com `E` continua pedindo a guarda comum, e a
fiação do gesto está nos dois caminhos.

**Vermelho hoje.** `pressPrimaryAction` não existe; e a regra que S18 nomeia: com
`triggerPrimaryAction` só, um manipulador que pede 1,2 s nunca dispara.

### T16 — A sequência dirigida (M42; D27) · F4

**Hoje.** Nada. `Devices.tsx:470-519` (`RadioDirector`) só toca com rádio ao alcance.

**Mudança.** `schema.ts` e `sequenceRules.ts` (3.11); `store.ts`: `sequence`, `startSequence`,
`advanceSequence`, `stopSequence`, com linha em `sessionDefaults` e em
`scripts/lib/storeActions.ts`; `src/engine/sequenceDirector.ts` (novo, sem React: começar o que
é devido e avançar um passo, para o jogo e para um store de teste) e `src/ui/SequenceOverlay.tsx`
(novo, no HUD): diretor (quando `dueSequence` devolve uma e nada toca: `startSequence`, que tira
o ar do rádio), cartão centrado e legenda com quem fala, botão «Pular» por passo; fica retida sob
modal e com a aba oculta, pela regra `radioHeld`, e até a cena estar pronta. `Devices.tsx`:
`onAir` passa a contar a sequência (`airTaken`, 3.5). **`R` durante uma sequência avança o passo e
não chama, com ou sem rádio no bolso:** `placeRadioCallOn` (`radioCall.ts`) começa por
`skipSequenceStepOn`, e o `keydown` de `R` em `Devices.tsx` pergunta `skipSequenceStep()` antes de
olhar se há rádio [o plano punha isso em `radioCallBlocked`, que só é perguntado com rádio]. A
legenda preenche `{hora}` por `fillHour`, como a do rádio já faz desde F2; o gancho
`useNightPhraseKey` passou a ter arquivo próprio (`src/ui/useNightPhraseKey.ts`), porque dois
componentes o usam. No toque a legenda da sequência fica na faixa de cima: embaixo ela cobria o
prompt (§15.4). `validate.ts` (`validateEnding`): `sequence-not-positive`, `sequence-empty`,
`sequence-duplicate`; as linhas de uma sequência são falas (`spokenKeys`) e os `mentions` dela são
conferidos; `simulate.ts`: `sequence-never-plays`.

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
  `sequence-never-plays` em casas quebradas de propósito (e, com eles, os códigos que a fatia
  acrescentou: `term-blocker-unnamed`, `term-duplicate`, `term-desk-missing`,
  `desk-hold-seconds`, `gate-uses-negative-condition`, `gate-uses-all-condition`,
  `condition-term-missing`, `notebook-term-missing`, `sequence-empty`, `sequence-duplicate`,
  `sequence-not-positive`, `device-node-missing` da mesa);
- o instantâneo de uma casa com termos os grava, e mudar o `when` de um deles é
  `term-condition-changed`;
- [§15.4] a jogadora exaustiva assina os três, na ordem em que a mesa os oferece, e a casa não é
  acusada de nada; duas abas vivas (uma assina e assiste, a outra ouve; nenhuma repete o que foi
  visto, e as duas se calam); os dois grupos de nós da mesa (`prepareDeskNodes`,
  `showDeskNodes`) sobre três objetos de verdade; e `endingWiringProblems`
  (`runtimeWiring.ts`): cada componente pergunta essas regras, com uma mutação em memória por
  linha de fiação.

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
   `mentions` (a folha: `tool:service-key`, `office-safe`, `doc-termos`, `atrium-lectern`; o Livro:
   `atrium-lectern`; o recado: `office-cabinet`, `portrait-morgan`, `atrium-podium`). Uma
   credencial declarada é citável pela chave com que o save a escreve.
4. **Containers.** O cofre sai do `kit` (`:1491`) e entra em `OFFICE_CONTAINERS`:
   `{ id: 'office-safe', part: 'office-safe', position: [2.55, 0, 2.45], rotationY: -Math.PI / 2,
   titleKey: 'container.office-safe.title', lockId: 'office-safe', door: { nodePrefix: 'door',
   hingeAt: [...], openAngle: -1.75 }, contents: [{ node: 'papers' }] }` (a dobradiça vem do
   `layout` do gerador; `test:kit` confere).
5. **Dispositivos.** `office-answering-machine` (`voice`, `poweredBy: 'office'`,
   `messageLamp: true`, `utterances: [{ when: {}, documentId: 'doc-otavio-tape' }]`), em
   `[0.615, 0.74, 0.642]`,
   `rotationY: -Math.PI / 2` [validado em F5: §7 e §15.5]. O púlpito sai do `kit` (`:1069`) e entra em `devices`
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
(`:391-467`, reescrito): `MAXIMUM` ganha a chave, o cofre, os quatro documentos, o termo, as duas
flags (`clock-set` e `posse-signed`: a de legado só a migração põe, e um jogo novo nunca a tem) e
os gatilhos; os níveis são os do plano mestre (`N0` luminária e o relógio · `N1` átrio ·
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
| A | `production-drawer-open`, `l1-route-end` | gaveta aberta; `doc-predecessor` lido; três salas acesas; peças catalogadas; sem `porter-hello` | `contentLot: 3`; `documentsRead` + `doc-otavio-handover` (o antigo fica); `flags: ['legacy-pre-L3-drawer']`; `credentials: ['tool:service-key']`; `triggersFired: ['lock:office-drawer:opened']`; `radioCalls` + `porter-atrium-service`, `porter-holyoke-lit`, `porter-first-catalogued`; `termsSigned: []`, `sequencesSeen: []`. Ouve `porter-hello`, depois `porter-machine-reminder` (o recado é de L3: nenhum save antigo o ouviu) e depois `porter-legacy-drawer` |
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
| `notebook.todo.proof.note` [não previsto: o portão pede a nota de toda promessa datada] | hoje não: fica para a reabertura | not tonight: it waits for the reopening |
| `prompt.unlock` [não previsto: 3.8] | Destrancar | Unlock |
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
| `office-answering-machine` (nova, `officeProps.mjs`) | — | 3 nós: corpo (`plastic-black`), `__led` (`led-off`; o runtime pinta), `__play` (`brass`, a fileira de teclas) · até 400; **[medido em F5: 264 + 32 + 60 = 356]** | 400 | dispositivo |
| `office-safe` (`officeDecor.mjs:364-438`) | 2 nós · 1.084 | 4 nós: corpo (`archive-green`: carcaça em cinco chapas e moldura, com cavidade e uma prateleira, no lugar da caixa maciça), `__door` (`archive-green`), `__door-hardware` (`brass`: friso, roda, espelho da chave **e as duas dobradiças**, que ficam no eixo), `__papers` (`paper-writing`: a prova na prateleira) · até 1.434; **[medido em F5: 384 + 108 + 676 + 24 = 1.192, 108 a mais. A carcaça não saiu em cinco chapas: é a casca chanfrada de antes sem a face da frente, com moldura em meia-esquadria, o rebaixo e o forro por dentro; cada dobradiça ganhou a aba de latão que a prende à porta e, na família do corpo, o olhal de ferro atrás dela]** | +350 | container |
| `atrium-lectern` (`atriumDecor.mjs:930-1010`) | 4 nós · 896 | 5 nós: os três de hoje, `__led` (a família `light` renomeada; `atrium-glow`), `__book` (`paper-aged`: o Livro aberto, 0,40 × 0,28 m, com lombo e curvatura de página; um material só) · régua de apoio na família `brass` (+24) · até 1.170; **[medido em F5: 624 + 44 + 216 + 12 + 72 = 968, 72 a mais. Não houve régua nova: a régua de latão que o tampo já tinha (`topRule`) é o apoio do Livro, e o `layout` a exporta]** | +274 | dispositivo |
| `desk-telephone` | 2 nós · 1.508 | igual; passa de `kit` a dispositivo | — | dispositivo |
| `atrium-central-podium` | 5 nós · 2.052 | igual; passa de `kit` a dispositivo (`notice`) | — | dispositivo |

Materiais: todos já são desenhados na sala de cada receita [medido no manifesto]: nenhum programa
novo [previsto; medir], nenhuma textura. Colisores: `office-safe` e `atrium-lectern` continuam com
o do nó raiz (o do cofre fica 8 cm mais raso: a porta deixou o corpo); a secretária não tem.
`kit.glb` cresce cerca de 15 a 25 kB [previsto]: `RATCHETS.kitGlb.ceiling` sobe para o medido, no
commit do bake, com o motivo escrito (a secretária, a porta e a cavidade do cofre, o Livro).
**[Medido em F5: 2.255.668 bytes, 21.416 a mais; 536 triângulos a mais sobre 104.940; nenhum
programa novo (35) e nenhuma textura.]**

**Lotes [previsto, conferido em Node contra o manifesto de hoje].**

| Sala | Kit hoje | Kit depois | Desenhado por dado hoje (kit + containers + dispositivos + quadro) | Depois |
|---|---|---|---|---|
| átrio | 56 | 47 (saem os 4 do púlpito e os 5 do pódio) | 59 | no máximo **59**: 47 + 3 do quadro + 5 do pódio + 3 fixos do púlpito + a lâmpada **ou** o Livro (DL3-7); 58 enquanto não há termo apresentado nem assinado |
| Holyoke | 28 | 28 | 33 | 33 |
| escritório | 53 | 49 (saem os 2 do cofre e os 2 do telefone) | 74 | **79**: 49 + 21 de hoje + telefone 2 + secretária 3 + cofre 3, mais 1 com o cofre aberto |

`scripts/test-kit-runtime.ts` ganha a conta «por dado» com esses tetos (59, 33, 79). O teto
temporário de ÁT-K1 (58 lotes, 102 draws) **não é gasto**: o átrio não desenha um nó a mais do que
hoje em nenhum estado de L3. Triângulos de kit instanciados: átrio 43.324, escritório 31.638.

**A secretária na mesa [validado em F5 por `test:desk-top` e pela rota: a posição A serve, com
12 mm até o mata-borrão, 8 mm até a borda e 114 mm até o rádio; ela saiu com 46 mm de altura, não
60; o plano B não foi preciso].** A mesa, em coordenadas da
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
igual. Programas: 35. **[Medido: R01 62, um a mais que o previsto (a porta do cofre, que virou nó
próprio, está no quadro de R01 também); R02 70; R03, R04, R05 e R10 em 80, 101, 85 e 125 com o
Livro à vista, e 79, 100, 84 e 124 antes de o Livro ser lido; R06 não vê o púlpito e não muda; a
Ala 1 igual; 35 programas. A tabela está em §15.5.]**

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
| `test:save` | ganha casos (abas vivas) | T5, T6, T12, T14, T20 | F2, F3, F4, F5 |
| `test:triggers`, `test:locks` | ganham casos | T14, T19 (`locksSeen` como condição); T10, T19 (`lockBars`) | F4, F5; F3, F5 |
| `test:playthrough` | ganha casos e mãos novas | T1, T8, T12, T14, T19, T21 | F1 a F5 |
| `test:navigation`, `test:desk-top`, `test:kit` (ganha um terceiro script, `scripts/test-kit-layout.ts`: peça × `layout`), `test:kit-runtime` | ganham casos | T2, T12, T18 | F1, F3, F5 |
| `test:lints`, `test:qa-save`, `test:ratchets`, `test:docs`, `test:map` | ganham casos | T7; T19; T21; T21; T4 e T13 | — |

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
| `scripts/test-radio.ts:928-960` (`HINT_TARGETS`) | a dica curta com os substantivos da cheia | com os das duas primeiras alturas («onde» e «o quê») | F2 |
| `scripts/test-playthrough.ts:391-467` | o fim de hoje, átomo por átomo, e cinco níveis | o fim de cada fatia; sete níveis em F5 | F2, F5 |
| `scripts/test-save.ts:233-238` (`UNKNOWN`) | `termsSigned` como campo que este build não conhece | outro nome; `termsSigned` vira amostra de `SAMPLES` | F4 |
| `scripts/test-qa-save.ts:289-331` | todo id de um fixture é id do conteúdo | ou tem alias para um | F5 |
| `scripts/test-kit-runtime.ts:267-302` | 56 e 53 lotes de kit | os mesmos, e ao lado a conta por dado (59, 33, 79) | F1, F5 |
| `scripts/test-save.ts` («this build reads a save of production exactly as L1 read it») | o build lê um save de produção igual a L1, campo por campo | igual a L1 **mais** as notícias velhas que `prePosse` marca; `hintHeight` fica fora da comparação (L1 não conhece) | F2 |
| `scripts/test-save.ts` (`agreed()`, nas corridas entre abas) | aba e disco iguais ao fim | iguais «como uma carga os lê»: os dois lados passam pela migração antes de comparar, porque a aba que lê marca notícias velhas que o disco ainda não tem | F2 |
| `scripts/test-qa-save.ts` («a save the lot in the tree wrote loads as itself») | um fixture carimbado com o lote da árvore carrega idêntico | idêntico mais as notícias velhas, enquanto houver migração de lote maior que `CONTENT_LOT`; volta a ser «idêntico» quando `CONTENT_LOT` virar 3 | F2, F5 |
| `scripts/test-triggers.ts` (a recarga da casa de teste) | recarregar não muda nada do que a primeira sessão deixou | não muda nada além das chamadas que são notícia velha (`PRE_POSSE_SAVE`) | F2 |
| `scripts/test-opening-flow.ts` («a player who skipped the notebook is sent back for it first») | a dica do caderno vale em qualquer sala | só enquanto o jogador não saiu do escritório (S25) | F2 |
| `scripts/test-playthrough.ts` («she accuses the museum of five things…») | cinco acusações datadas | seis: entra `flag-never-set` de `basement-drained`, até L12 | F2 |
| `scripts/test-locks.ts` («a key that would be spent, and a ritual, refuse as unsupported until their lots») | a chave que se gasta e o ritual recusam como `unsupported` | só o ritual (e o teclado sem resposta); a chave que se gasta abre pelo toque de quem a tem, como qualquer ferramenta | F3 |
| `scripts/test-opening.ts` («each validator the gate lacked…», `lock-host-kind-unsupported`) | uma tranca de ferramenta num armário é recusada | recusados são um crachá num armário e uma tranca de ferramenta num quadro de sala; a de ferramenta no armário passa, e é acusada só de `credential-unobtainable` (nada dá a chave) | F3 |
| `scripts/test-opening-flow.ts` («a thing that only says something…») e `scripts/test-radio.ts` (a varredura) | três dispositivos miráveis: pódio, relógio, rádio | quatro: entra o telefone | F3 |
| `scripts/test-playthrough.ts` («what the rules answer is offered…») | no escuro o escritório oferece a luminária, a gaveta e o caderno | e o telefone (`hear office-telephone`), em toda lista, aceso ou não; é oferecido e não concede nada | F3 |
| `scripts/test-desk-top.ts` («every object on the desk is found») | o telefone é `kit:desk-telephone` | é `device:office-telephone`, no mesmo apoio e com a mesma folga | F3 |
| `scripts/test-opening.ts`, `scripts/test-opening-flow.ts`, `scripts/lib/runtimeWiring.ts` (toda chamada de `deviceInputOf`) | o terceiro argumento é uma função `roomById` | é o conteúdo; as três asserções de fiação de F1 citam `MUSEUM` e `content` | F3 |
| `scripts/test-save.ts` («an alias that points at an id the content does not have…») | quatro listas sem alias conferido: `credentials`, `flags`, `hintsShown`, `triggersFired` | seis: entram `sequencesSeen` e `termsSigned`; um alias para qualquer uma das duas é acusado no museu de verdade (não há termo nem sequência até F5) e passa num museu que os tem | F4 |
| `scripts/test-save.ts` (`laterWrite`, «a tab that was open before another tab wrote…», caso D, as três abas que diferem em todo campo) | `termsSigned` é o campo que a aba velha não conhece e não pode apagar | esse campo é `ribbonsCut`; a escrita mais tardia leva, além dele, um termo assinado e uma sequência vista, como campos da tabela | F4 |
| `scripts/test-save.ts` (casos A e B, C e E) | o save trazido para a frente é o de L2 mais as notícias velhas e as alturas | mais os dois campos, vazios; e o caso E registra a perda de um rollback: um save que passou por L1 não assinou nem viu nada, e a mesa pede o termo de novo | F4 |
| `scripts/test-playthrough.ts` (o campo do save que muda de dono, `save-field-changed`) | o caso usava `termsSigned` como campo que o registro não conhece | usa `ribbonsCut`; `termsSigned` passou a ser campo com ids (`NOW.ids.terms`, `NOW.ids.sequences`) | F4 |
| `scripts/test-qa-save.ts` («the new game L2 left…»; «a save the lot in the tree wrote loads as itself») | as chaves de um jogo novo de L2 são as da tabela deste build; a carga é idêntica mais as notícias velhas | são as da tabela **menos** as duas que L3 acrescentou (`ADDED_BY_L3`), que a carga dá vazias, depois de todo campo que o registro tem | F4 |
| `scripts/test-triggers.ts` («every action of the store either leaves the save alone or leaves it settled») | as ações de F3 | entram `advanceSequence` (assenta: o último passo grava `sequencesSeen`), `startSequence` e `stopSequence` (são da sessão) | F4 |
| `scripts/test-opening.ts` (`radio-hint-coverage`, a casa «signed») | assinada era a flag do termo, que um gatilho do teste punha sozinho | assinada é a assinatura no save (`termsSigned`), feita numa mesa (o púlpito, feito mesa para o caso); **uma flag que se põe sozinha não é assinatura**, e uma mesa com o termo e sem dica acima dele é acusada | F4 |
| `scripts/test-opening-flow.ts` e `scripts/lib/runtimeWiring.ts` (a fiação do toque e do diretor) | o botão de Ação age em `onClick={() => triggerPrimaryAction()}`; `onAir` é `state.radio !== null`; o gancho da hora mora em `Hud.tsx` | o clique é julgado por `actionClick` e a pressão segurada desce no ponteiro; `onAir` é `airTaken`; o gancho mora em `ui/useNightPhraseKey.ts`; o mundo de um dispositivo é `{ progress, radio, sequence }` | F4 |

`scripts/test-opening.ts:422` (a lanterna nunca alcança o teto do átrio) e
`scripts/test-navigation.ts` (`reciprocalPairs.size === 3`) não mudam.

## 10. Bundle e catracas

Hoje (HANDOFF §11.3): documento 63.234 bytes de gzip (teto 63.600), título 29.913 (teto 30.050),
jogo 390.995 (teto 392.700). **A folga do título é de 137 bytes**, e os dicionários viajam com o
título: toda fatia que escreve texto sobe esse teto.

| Caminho | O que entra | Previsto | Fatia |
|---|---|---|---|
| título | 12 chaves e a carta maior | +0,4 kB | F1 |
| título | cerca de 45 chaves de fala; `hintHeight`; `prePosse` | +1,6 kB; **[medido em F2: 35 chaves novas, 8 a menos, 5 reescritas; +1.165 bytes, 31.478; teto 31.630]** | F2 |
| título | 8 chaves | +0,2 kB; **[medido em F3: 8 chaves novas, as regras do leitor na folha de estilos e `grantOnEnd` no store; +249 bytes, 31.727; teto 31.880]** | F3 |
| título | 9 chaves; `termsSigned`, `sequencesSeen` | +0,3 kB; **[medido em F4: +1.025 bytes, 32.752; teto 32.910. A previsão não contava a folha de estilos, que viaja com o título e é sete décimos disso (de 4.676 para 5.404, arquivo por arquivo contra um build do commit anterior: o anel, as duas respostas, o cartão e a legenda da sequência, a página do termo, a lista de termos); o resto é o pedaço que os dicionários e o store dividem (de 22.466 para 22.764: as 9 chaves em cada língua, os dois campos e a sequência no store)]** | F4 |
| título | cerca de 60 chaves (dois documentos longos, o recado, falas) ; o alias | +2,4 kB; **[medido em F5: 56 chaves novas, 2 a menos, 3 reescritas; +3.127 bytes, 35.879; teto 36.050. Tudo menos 41 bytes está no pedaço que os dicionários e o store dividem (de 22.764 para 25.850): os textos saíram mais longos do que a previsão contava, nas duas línguas]** | F5 |
| jogo | `checklist.ts`, dispositivos miráveis, `nightClock.ts`, `readingQueue.ts`, `voiceDevice.ts`, `containerNodes.ts`, `termRules.ts`, `holdAction.ts`, `sequenceRules.ts`, `SequenceOverlay.tsx`, o conteúdo novo | +6 a +9 kB no lote; **[medido: F1 +1.151 (392.146), F2 +1.649 (393.795), F3 +1.632 (395.427), F4 +3.478 (398.905); teto 395.760 desde F2 e 400.890 desde F4: 7.910 bytes no lote até aqui, e F5 ainda traz o conteúdo; F5 +1.463 (400.368), dentro do teto de F4 com 522 de folga: 9.373 bytes no lote]** | F1 a F5 |

Tudo [previsto]. Cada teto sobe **no commit da fatia que precisa**, para o medido mais meio por
cento, com o motivo em `BUNDLE_PATH_CEILINGS`. Os dois orçamentos do papel ficam longe: 93 kB antes
do clique (250) e 484 kB no total (600); o lote termina perto de 98 e 500 **[medido em F5: 99,11 e 499,48]**. O store continua sem
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
nenhum toast; `porter-hello`, `porter-machine-reminder` e depois `porter-legacy-drawer`; o Arquivo mostra a folha nova; o
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

**[Fecho, 2026-10-05:** a rota, o instantâneo com o digest, o corpus, as capturas, o HANDOFF
§12, o Anexo C e o «Feito em» estão feitos, e §16 diz o que saiu diferente. Ficam a revisão
adversarial e os passos 8 a 11 e 13.**]**

## 15. Execução, fatia por fatia

A preencher por cada fatia: o vermelho visto antes do conserto, as mutações, o que saiu diferente
do que está acima.

### 15.1 F1 — A lista como dado, a promessa datada e os nomes (2026-10-05)

T1 a T4 feitas. `npm run check` (33 passos) e `npm run build` verdes. `CONTENT_LOT` continua 2;
`docs/releases/L2.graph.json` não foi tocado e `validateAdditive` contra ele não acusa nada (as três
linhas da lista com os mesmos átomos; a do cofre ganhou só a data).

**Vermelho visto antes do conserto** (as suítes escritas primeiro, rodadas contra a fonte de
`6cd9b7d`):

| Suíte | Como reprovou |
|---|---|
| `test:opening` | `ERR_MODULE_NOT_FOUND`: `src/engine/checklist.ts` não existe. Perguntado à fonte de então por um script à parte: a linha 1 com as três salas acesas risca, e com uma quarta sala no build **desrisca** (`allRoomsPowered`) |
| `test:opening-flow` | `JOURNAL_HOME_TAB` é `undefined` (esperado `'notebook'`); `Journal.tsx` e `Hud.tsx` abrem em `'map'` |
| `test:radio`, `test:navigation` | `deviceRules.ts` não exporta `aimableDevices`. À parte: a inundação julga 26 alvos e nenhum é o pódio |
| `test:locks` | a união da fonte é `founding, olympic, global`, e `ToolId` tem `breaker-handle` |
| `test:kit-runtime` | «the plinth of the hall is drawn once, as a device»: kit 56, dispositivos 0 |
| `test:playthrough` | sete casos: a acusação de `notebook.todo.vault` ainda existe; `checklist-deferred-with-box` não é levantado; o instantâneo não grava a data; uma peça e uma sala a mais mudam a lista (`checklist-condition-changed`); as quatro bolas do saguão declaram `ball` |
| `test:map` (caso novo, ver abaixo) | «the letter (pt-BR) needs 662 px of a page of 588 at 720 px of window» |
| textos | `intro.line3` «…no cofre.», `notebook.todo.vault` «Cofre — só o Otávio…», `container.office.title` «Gaveta trancada do curador» |

`test:power` não reprova antes: trocar `breaker-handle` por `crate-dolly` é renomear um id de teste
(as suítes rodam em Node com os tipos apagados; `tsc` só confere `src/`). Por isso as uniões de D2
são lidas da fonte de `schema.ts` por `test:locks`, e não por um erro de compilação. O caso «por
dado» de `test:kit-runtime` com tetos 59 / 33 / 74 também não reprova antes (é um teto igual ao
medido); o que reprova é a asserção ao lado dele («kit 51, dispositivos 5») e a mutação «a peça
deixada no kit e nos dispositivos estoura o teto por dado e não o do kit».

**Mutações que provam que as asserções mordem.** `deviceWiringProblems` (nova, em
`runtimeWiring.ts`, chamada por `test:opening-flow`): oito refatorações em memória, todas pegas
(varredura só de rádios; caixa de mira só para o rádio; `E` sem perguntar a intenção; `E` sem a
arbitragem; dispositivo vivo por estar na mira; prompt redigido no componente; aviso desenhado com
tecla; botão de toque para o que estiver na mira). `interactionVolumeWiringProblems` ganhou quatro
(o mínimo do rádio para todo dispositivo; dispositivo pendurado fora da colocação; dispositivo sem
colisor; `DeviceLayer` sem o mundo de colisão) e trocou uma (o mínimo de mira de número próprio,
que era do rádio e é de todo dispositivo). `notebookLetterLayoutProblems`: oito.

**O que saiu diferente do plano.**

1. **O vermelho do caso do prompt** (T2) estava descrito errado, e o texto acima foi corrigido: o
   vencedor de hoje não é `null`.
2. **`validateDeferred` roda sempre** (T1.6, corrigido acima): sem lote só pergunta
   `deferred-without-notice`. Assim os museus quebrados das suítes, que chamam o portão sem a
   tabela de dívidas, também são conferidos.
3. **A redação dos prompts mora em `src/ui/promptRules.ts`** (módulo novo: `containerPrompt`,
   `devicePrompt`), e não em `hudRules.ts`. A tela de título importa `hudRules.ts`: escritas lá,
   as duas regras custavam 178 bytes antes do clique para algo que só o HUD do jogo pergunta.
   `JOURNAL_HOME_TAB` ficou em `hudRules.ts`, como o plano pede.
4. **Formas que o plano deixou em aberto** (3.5): `DeviceInput = { powered, carried, speaking }`;
   `deviceInputOf(device, store, roomById)` lê as três do save e do ar; `devicePowerRoom(device)` é
   a sala que alimenta cada tipo (um `switch` sobre todos os tipos, usado também por
   `validateOpening`); `deviceProxyMinimum(device)` (em `interactionTarget.ts`) é o mínimo de mira
   do tipo, lido pelo componente e pela inundação. `aimableDevices` pergunta à própria
   `deviceIntent`. `DeviceLayer` passou a receber `kitBundle` e `collision` (era `kitUrl`).
   `checklistPageOf` (em `notebook.ts`) dá a página que a aba Caderno mostra; `counterText` (em
   `checklist.ts`) preenche «{done} de {total}».
5. **O mundo das suítes** ganhou os dispositivos em três lugares, não em um: `buildMuseumWorld`
   (colisor), `interactionVolumes` (mira), `collectSolidFootprints` de `test:navigation`
   (sobreposição de sólidos) e `roomObstacles` de `sightline.ts` (linha de visão). O pódio era
   obstáculo e sólido como mobília e continua sendo como dispositivo; a prova é o caso «the plinth
   of the hall is solid as a device» (a cápsula para na face dele a partir de dentro do anel, e num
   mundo sem o dispositivo atravessa).
6. **A carta da Helena não cabia mais na página** [não previsto]. Com o parágrafo da seguradora,
   em 1280 × 720 a página tinha 662 px de carta em 589 de folha (em inglês, 630), com barra de
   rolagem e o P.S., que é a única lição do jogo sobre trancas, abaixo da dobra; em 1366 × 768
   também rolava. O texto de §6.1 ficou como está; mudou a pauta da página manuscrita, de 2rem
   para 1,7rem (linha, pauta e vão entre parágrafos, que são uma medida só). Medido no navegador
   depois: 544 px numa folha de 604, com teto de 648, nas duas línguas, sem rolagem. Caso novo em
   `test:map` (`notebookLetterLayoutProblems`): soma a folha e a margem do fundo, confere que a
   escrita fica na pauta (também na regra de celular deitado) e conta as linhas da carta em cada
   língua contra a altura da folha a 720 px, com 46 glifos por linha contados no navegador
   (`LETTER_PAGE`); reprova a pauta de 2rem com a carta de hoje, aprova-a com a carta de L2, e
   reprova a pauta de hoje com um parágrafo a mais. **B.12 dá à carta outra página em L12: quem
   mexer nela roda `test:map`.**
7. **`mentions`** entrou no tipo e já vem preenchido nas linhas 1 (as três salas) e 2 (as doze
   peças); quem confere é `speech-mentions-missing`, de F2.
8. **`test:playthrough` mudou de sentido em três casos** (para a tabela de 9.2 e para o HANDOFF):
   `NAMED_LISTS` virou `ALL_OF_THEM` (o museu de teste agora é o que diz «todas», para mostrar que
   essa lista se mexe; o de verdade tem os ids por extenso e não se mexe); «she accuses the museum
   of six things» virou cinco (a linha do cofre não é mais acusação); «a museum with its debts
   paid» não dá mais caixa à linha do cofre, e passou a conferir que no fim as duas linhas com
   caixa estão riscadas e a terceira continua sem caixa. Uma peça renomeada no museu e esquecida na
   lista é acusada mesmo com os aliases (caso novo).

**Medido.**

- Bundle (gzip, pelo próprio portão): documento 63.237 (teto 63.600), título 30.313 (era 29.913;
  teto de 30.050 para 30.460, o medido mais meio por cento, com o motivo em
  `BUNDLE_PATH_CEILINGS`), jogo 392.146 (era 390.995; **o teto de 392.700 não subiu**, sobram 554
  bytes: F2 vai precisar subir). Antes do clique 93,55 kB; no jogo 485,70 kB.
- Lotes por dado (`test:kit-runtime`): átrio 59 (kit 51, dispositivos 5, quadro 3), Holyoke 33,
  escritório 74. O kit do átrio saiu do teto: 51 de 56.
- Navegador, 1280 × 720, qualidade `medium`, save `l2-shortcut-released`: R03 80 · 63.940, R04
  101 · 77.334, R05 85 · 67.820, R06 79 · 70.774, R07 39 · 37.676, R08 70 · 52.036, R09 81 ·
  62.374 (draws · triângulos), todos **iguais** ao `BROWSER_RECORD`. Programas: 34 com as três
  salas residentes (teto 35): o pódio clonado em vez de instanciado não compilou programa novo.
  R01, R02 e R10 não foram medidos (pedem o estado de linha de base e a porta aberta); a medição
  dos dez pontos continua sendo de F5 (DL3-15).
- Inundação: 27 alvos (eram 26). Do melhor lugar de pé, o olho fica a 1,44 m do volume do pódio
  (alcance 2,6); no navegador, de (2,05; 0), a mira dá 1,70 m, como o plano previa.

**Navegador** (servidor reiniciado; aba oculta, jogo andado por `__museumStep`; pt-BR e inglês).
Título: «…alguma coisa na caixa-forte.» Jogo novo: prompt «Ler — Caderno do curador»; a carta
com a seguradora, cabendo na página; a lista com «0 de 3», «Átrio 0 de 4», «Ala 1 · Holyoke 0 de
8» e a linha da caixa-forte sem caixa, com «hoje não: o subsolo alagou». `Tab` abre o caderno na
aba «Caderno», com a lista viva («3 de 3» riscada, «Ala 1 · Holyoke 1 de 8» no save de L2). Gaveta
fechada: «E · Gaveta do Otávio — trancada (um ano)», e `E` abre o teclado; aberta: «E · Ler ·
Gaveta do Otávio ✓». Pódio: «Plinto do Fundador — Interditado: obra do piso.», sem tecla; `E` não
é tomado e nada muda no save; o colisor do pódio está no mundo de colisão vivo, uma vez. Em inglês:
*Notebook*, *3 of 3*, *Otávio's drawer — locked (a year)*, *The Founder's plinth — Closed off: the
floor is being relaid.* Em 844 × 390, pelos botões: o ícone do caderno abre em «Caderno», as cinco
abas e «Fechar» cabem (597 de 775 px); diante do pódio **não há botão de Ação**; diante da gaveta
há, e ele abre o teclado. Console sem erro nem aviso novo.

**Visto de passagem, sem conserto nesta fatia.**

- Em 844 × 390 a página da lista, dentro da aba Caderno, pede 25 px de rolagem (322 de 297 px do
  corpo do caderno, que rola). Com as quatro linhas a lápis de F5 vai rolar de qualquer jeito.
- O aviso «Você pegou o caderno — Tab abre a planta, o catálogo e o arquivo.» não cita a lista,
  que agora é a primeira aba. É verdade (as três estão lá), e §6.1 não muda essa chave.
- `interactionWinner` responde «dispositivo, morto» para um id de foco que o conteúdo não tem. Não
  acontece no jogo (a varredura só mira o que `aimableDevices` lista), e ficou como estava.

### 15.2 F2 — O Jorge por marco e a hora da noite (2026-10-05)

T5 a T9 feitas. `npm run check` (34 passos: entrou `test:speech-coherence`, depois de
`test:playthrough`) e `npm run build` verdes. `CONTENT_LOT` continua 2; `docs/releases/L2.graph.json`
não foi tocado e `validateAdditive` contra ele não acusa nada («graph: held to L2's snapshot»).
`porter-first-call` e `PRE_OPENING_SAVE` continuam com os ids de sempre. Nenhuma fala de F2 cita
secretária, chave, cofre de ferro, Livro, púlpito ou Posse: quem confere é a lista `notYet` de
`test:opening-flow`, sobre toda linha falada nas duas línguas (**F5 tira dela as palavras que
passar a dizer**).

**Vermelho visto antes do conserto** (as suítes escritas primeiro, rodadas contra a fonte de
`e9f9803`):

| Suíte | Como reprovou |
|---|---|
| `test:speech-coherence` | «`radio.patience.t5.soap.2` (pt-BR) says "acabou a luz" with every room lit» (semente 7); «`radio.patience.t4.dark` (pt-BR) says "escuro" with every room lit» (semente 11); `porter-hello` nunca é ouvida |
| `test:radio` | das oito chamadas faltam cinco; saguão aceso: `[]` contra `['porter-atrium-service']`; ÁT-A6 (c): `undefined` contra `porter-hello` (o Jorge nunca se apresenta); os saves do corpus ouvem `[]` em vez de `['porter-hello']`; S25: no saguão escuro, sem o caderno, «Primeiro o caderno, curador: a diretora, a Helena, deixou um pra você na mesa do escritório…»; em mil sorteios com tudo aceso sai «medo do escuro»; `heightKeys` é `undefined`; um nível de paciência só com respostas condicionais passa pelo portão |
| `test:opening`, `test:save` | erro de importação: `src/engine/nightClock.ts` e `PRE_POSSE_SAVE` não existem |
| `test:opening-flow` | (o caso da legenda, escrito antes do conserto dela) «`ui/Hud.tsx` no longer has `fillHour(…)`: a line of the radio that says the hour would show the token as it was typed» |

**Mutações que provam que as asserções mordem.**

- `test:speech-coherence`, sobre o museu de verdade com uma coisa trocada: `porter-atrium-service`
  sem `lapsesWhen` («sends the player to "holyoke-breaker" with holyoke already lit»);
  `porter-t4-dark` sem `when` («says "escuro" with every room lit»); um marco da noite por condição
  negativa («the night went back from N milestone(s) to M»). As três reprovam.
- `deviceWiringProblems` ganhou sete refatorações do relógio em memória, todas pegas: `E` que toma
  a tecla e não grava; ponteiros que continuam no minuto da tempestade; relógio que lê a hora de
  um save próprio; aviso para qualquer flag; hora própria do HUD; aviso que não diz para que hora;
  legenda que imprime a ficha `{hora}`.
- `test:opening`, um museu quebrado para cada código do portão de F2: `hint-points-to-nothing`,
  `radio-hint-coverage` (com um termo de teste), `radio-lapse-not-positive`, `legacy-save-call`,
  `legacy-save-milestone`, `clock-without-title`, `night-clock-phrases`,
  `night-milestone-duplicate`, `night-milestone-not-positive`, `night-milestone-count`,
  `speech-line-too-long`, `speech-hour-in-digits`, `speech-token-unknown`,
  `speech-director-unintroduced`, `speech-mentions-missing`; e `radio-patience-silent` e
  `radio-dead-air-missing` para um nível, ou um silêncio, em que toda resposta é condicional.

**O que saiu diferente do plano** (o texto acima já está corrigido onde se diz).

1. **`flag:clock-set` cai no nível N1, não no N0** (T8, corrigido): o relógio pede a luz do
   escritório, e uma passada não vê o que ela mesma fez.
2. **`hint-points-to-nothing` mora em `validateOpening`**, e **o tipo `Term` já está no
   `schema.ts`** (T6, corrigido), com `MuseumContent.terms?`: `radio-hint-coverage` precisa dele
   para ser provada. Até F4, «assinado» é a flag `grants` do termo no save; **F4 decide se a regra
   passa a ler `termsSigned`**.
3. **Códigos a mais no portão** (T5 e T8, corrigidos): `radio-lapse-not-positive`,
   `legacy-save-milestone`, `night-milestone-duplicate`, `night-milestone-count`,
   `clock-without-title`.
4. **A altura da dica.** `radioHintHeight(hint, hintIndex, memory)` é a conta de T6; a explosão de
   raiva não sobe a altura (ele não deu dica), e a dica curta conta como um degrau (ele disse
   tudo). `radioHintFor(device, progress, content, height = 0)`.
5. **`prePosse` roda em toda leitura do disco**, a da carga e a da junção entre abas. A aba que lê
   pode ter notícias velhas que o disco não tem, e não grava por causa disso; por isso `agreed()`,
   em `test:save`, compara os dois lados «como uma carga os lê» (9.2). O caso com abas vivas (uma
   aba que grava como L2 e a deste build) prova que as duas se calam.
6. **A legenda do rádio já preenche `{hora}`** (T16 dava isso a F4, corrigido). O portão de F2
   deixa uma fala levar a ficha onde há relógio da noite; sem o preenchimento, uma fala assim
   passaria e sairia crua na tela. `RadioSubtitles` e o aviso do relógio leem a mesma frase
   (`useNightPhraseKey`). Nenhuma fala de F2 usa a ficha: a primeira é `sequence.posse.1`.
7. **`test:speech-coherence` ganhou uma regra que o plano não listava**: nenhuma chamada tocada
   manda o jogador a um quadro cuja sala já está acesa (pelos `mentions`). É ela que pega a
   mutação do `lapsesWhen`.
8. **Formas que o plano deixou em aberto.** `DeviceInput.set` e `deviceSetFlag(device)`;
   `deviceLive` responde pelo relógio; `aimableDevices` pergunta com `set: false`;
   `clockFaceAngles(stoppedAt, elapsedSeconds, night)`; `setClockMinutes(clock, setFlag, progress,
   content)`; `clockJustSet` em `promptRules.ts`; `placeRadioCallOn(store, content, deviceId, now,
   random)` (a `placeRadioCall` do jogo é ela com `useMuseum` e `MUSEUM`); `deadAirFor(patience,
   progress, content, random, lastId)`; `play()` devolve `steps`; `RobotProfile.prefers`; o
   ouvinte `radioEar(content, { random, promptness, callChance })`. Os limites de comprimento são
   `SPEECH_LINE_MAX = 130` e `SPEECH_SHORT_LINE_MAX = 110`. `saveIdsByField.flags`
   (`additive.ts`) passou a incluir a flag posta por dispositivo.
9. **`test()` de `test:radio` anota a falha e segue** (o código de saída continua 1): com oito
   casos novos, um vermelho escondia os outros sete.
10. **O dicionário cresceu 27 chaves, não 45**: 35 novas, 8 a menos, 5 reescritas (259 para 286).
11. **Mais testes mudaram de sentido do que 9.2 previa**: as seis linhas novas da tabela.

**Medido.**

- Bundle (gzip, pelo próprio portão): documento 63.232 (teto 63.600), título 31.478 (era 30.313;
  teto de 30.460 para 31.630), jogo 393.795 (era 392.146; teto de 392.700 para 395.760, a primeira
  subida dele em L3). Os dois tetos são o medido mais meio por cento, com o motivo em
  `BUNDLE_PATH_CEILINGS`. Antes do clique 94,71 kB; no jogo 488,50 kB.
- Suítes: `test:radio` 35 (eram 27), `test:opening` 37 (35), `test:save` 60 (57),
  `test:speech-coherence` 6 (nova, 500 noites), `test:opening-flow` 48, `test:playthrough` 36,
  `test:qa-save` 27, `test:triggers` 30, `test:lints` 21.
- A dívida `flag-never-set` de `basement-drained` aparece na tabela do portão até L12; as três de
  `speech-night-state-unconditional` saíram. `text-ages` de `document.predecessor.body` continua
  até L3: **F5 paga**.

**Navegador** (servidor reiniciado; aba oculta, jogo andado por `__museumStep`, legendas lidas do
DOM e do store; pt-BR e inglês, 1280 × 720).

- Jogo novo, pt-BR. Relógio no escuro: sem prompt, `E` não faz nada. Luminária: `porter-hello` com
  as cinco linhas de §6.2, depois `porter-first-call` e `porter-notebook-reminder`. Relógio:
  «E · Acertar o relógio · Relógio do escritório»; `E` grava `clock-set`, aviso «✓ Relógio
  acertado — Passa das sete», ponteiros em 19h10; o segundo `E` não faz nada. Rádio no bolso:
  `porter-radio-taken`. `R` quatro vezes: o caderno em onde, o quê, como, como. No saguão escuro,
  sem o caderno: «O quadro fica do outro lado do saguão.» e depois «Luzinha vermelha, perto da
  porta com placa.» (S25). Saguão, Ala 1, primeira peça e atalho: cada chamada uma vez, com o
  texto de §6.2. Com três pontos o relógio mostra 20h10. Gaveta, com tudo aceso: onde, o quê e a
  curta. Recarregar: nada toca de novo; a altura (2) e a hora ficam.
- Inglês, jogo novo: *Set the clock — Office clock*; *Clock set — Gone seven*; a apresentação e as
  três alturas do caderno em inglês.
- 844 × 390, pelos botões: relógio no escuro **sem botão de Ação**; aceso, «Ação» com «Acertar o
  relógio»; o toque grava a flag e o botão some. A legenda fica entre os dois direcionais, sem
  rolagem horizontal.
- `?qaSave=l2-shortcut-released` e `?qaSave=production-drawer-open`: só `porter-hello` é devida, e
  nenhum aviso aparece. No segundo, acertar o relógio diz «Passa das dez» (sete pontos, 22h10 na
  parede), e `R` responde `radio.hint.rest`.
- Console sem erro nem aviso novo (só o `THREE.Clock` de sempre).

**Visto de passagem, sem conserto nesta fatia.**

- Num jogo novo a primeira coisa que o Jorge diz é «É o Jorge **de novo**». O texto é o de §6.2
  (DL3-2 o justifica para quem já o conhecia de L2); fica para o dono dizer se a noite começa com
  um encontro na portaria que o jogador não viu.
- Acertar o relógio enquanto o Jorge se apresenta mostra o aviso e a legenda juntos. Não se
  cobrem (um no topo, a outra embaixo), em 1280 × 720 e em 844 × 390.

### 15.3 F3 — O escritório responde: tranca de ferramenta, credencial, voz e leitor (2026-10-05)

T10 a T13 feitas. `npm run check` (34 passos) e `npm run build` verdes. `CONTENT_LOT` continua 2;
`docs/releases/L2.graph.json` não foi tocado e `validateAdditive` contra ele não acusa nada
(«graph: held to L2's snapshot · 42 actions it gave»); a ação `container:holyoke-cabinet-a` é,
palavra por palavra, a que L2 gravou (`test:opening-flow` compara as duas). `SAVE_VERSION` 1, e
**nenhum campo novo no save**. No conteúdo de verdade não há tranca de ferramenta, credencial nem
gravação (`credentials: []`; entram em F5 com os consumidores delas): o único conteúdo novo é o
telefone. O motor das três é provado com museus feitos para o teste.

**Vermelho visto antes do conserto** (as suítes escritas primeiro, rodadas contra a fonte de
`637adb4`):

| Suíte | Como reprovou |
|---|---|
| `test:locks` | «safe, empty-handed»: `reason: 'unsupported'` onde se espera `missing-credential` com `missing`; a única espécie sem entrada devia ser `ritual` e eram `tool` e `ritual`; nas abas vivas, `toolSpent is not a function` |
| `test:opening` | `lock-host-kind-unsupported accuses a cabinet that takes a key`; e a lista do caso novo: o jogador exaustivo não abre o cofre com a chave da gaveta; `credential-undeclared` não acusa `tool:service-key` (com a lista vazia e sem lista) nem `badge:indoor`; `credential-unused`, `consumable-multi-consumer` e `container-node-missing` não acusam nada; «the office has a telephone that speaks» |
| `test:radio`, `test:opening-flow`, `test:playthrough` | erro de importação (`voiceDevice.ts`, `containerNodes.ts`, `toolSpent`). Perguntado à fonte de então por um script à parte: o telefone é mobília (`kit`), e os miráveis são o pódio, o relógio e o rádio; uma transmissão com `grantOnEnd` ouvida até o fim deixa `documentsRead` vazio; um museu que dá `tool:service-key` sem declarar passa pelo portão com `credential-orphan` e nada mais |
| `test:kit-runtime` | «kit 53, by data 74, 0 telephone(s) among the devices» |
| `test:navigation` | «the telephone is not a target the flood judged» |
| `officeAnswersWiringProblems` (nova), contra a fonte de então | 26 fragmentos em falta, um por linha de fiação |
| navegador, 844 × 390 (o leitor com uma página por vez, antes das regras `is-reader`) | painel de 179 px; «Próximo» 98 px abaixo da dobra na primeira página e 148 na segunda |

**Mutações que provam que as asserções mordem.**

- `officeAnswersWiringProblems` (`runtimeWiring.ts`, chamada por `test:opening-flow`): trinta
  refatorações em memória, todas pegas. A voz: `E` tomado sem dizer nada; o que `E` faz decidido
  fora da intenção; recomeçar em vez de avançar; gravação tocada e nunca arquivada; arquivada sem
  ter sido ouvida até o fim; o fim que não arquiva; a lâmpada por regra própria, verde, ou sem
  quem a pinte. O diretor: sem olhar o ar, só quando o save muda, ou reagendando a chamada que
  está no ar. O leitor: `E` que fecha no primeiro papel; fila própria; todos os papéis de uma
  vez; setas só no caderno, decididas no gancho ou no caderno; sem botão de próximo; o resumo no
  lugar da transcrição, no leitor e no arquivo. A dobradiça: aberto por regra própria; porta
  nunca posta no pivô; porta que gira com a tranca fechada; pivô que não gira; conteúdo desenhado
  através da porta. O aviso: anunciar o que veio no save; nome inventado no componente; aviso
  que ninguém monta; HUD que pode ver o save antes de o conteúdo assentá-lo.
- `readerLayoutProblems` (`test:map`): oito mudanças na folha de estilos e uma no componente.
- `test:opening`: um museu quebrado para cada código do portão desta fatia
  (`lock-host-kind-unsupported` nas duas formas novas, `consumable-multi-consumer`,
  `container-node-missing`, `credential-undeclared`, `credential-unused`, `voice-silent`,
  `voice-recording-missing`, `device-node-missing` com `messageLamp`), e um museu são para cada
  um (a cadeia gaveta, chave, cofre; um telefone que toca uma gravação própria).
- `test:locks`, abas vivas: uma abre o cofre, outra só tinha a chave, uma terceira está no
  título, sem regras. As três e o disco ficam com a chave em `credentials`, o cofre aberto, a
  flag do cofre e a chave gasta (`toolSpent`); a aba sem regras grava um ajuste e não apaga nada;
  esconder e mostrar todas não gera escrita.
- `test:save`, abas vivas: uma gravação ouvida até o fim numa aba é arquivada nas duas, numa
  escrita só, e a outra não responde; cortada no meio, não é arquivada em nenhuma e nada é
  escrito; ouvida de novo, não escreve. (`grantOnEnd` não é campo do save: grava em
  `documentsRead` e `factsKnown`, que já tinham junção por união.)

**O que saiu diferente do plano** (o texto acima já está corrigido onde se diz).

1. **`VoiceUtterance` é uma união** (3.5, corrigido): fala própria ou gravação, com `never` do
   outro lado. Uma fala que é as duas coisas não compila; o portão ainda acusa a que não é
   nenhuma (`voice-silent`), para o conteúdo que não passa pelo compilador.
2. **`deviceInputOf(device, world, content)`** (T12, corrigido): o terceiro argumento era uma
   função `roomById`. Uma voz pergunta as condições das falas dela ao save, e condição se
   pergunta contra o conteúdo. `DeviceInput` ganhou `voicing` e `recording`; `DeviceWorld` aceita
   o save inteiro ou em parte.
3. **Uma voz toma o ar, e o diretor passou a olhar o ar** [não previsto]. Até F3 nada tirava uma
   transmissão do ar (`placeRadioCall` avança a que está tocando; o diretor espera). Discar por
   cima do Jorge corta a chamada, que não é gravada como ouvida; mas o diretor só reagendava
   quando o save mudava, e uma chamada cortada não muda o save. `RadioDirector` ganhou `onAir`
   nas dependências do efeito e não reagenda a chamada que está no ar. Visto no navegador: a
   apresentação cortada pelo telefone volta, da primeira linha, depois de «Linha muda.». **F4
   herda isso para a sequência dirigida (DL3-12), que corta o rádio do mesmo jeito.**
4. **`dropRadio` não arquiva** (T12, corrigido): `endRadio(radio, heardOut)`. Uma chamada largada
   sob um modal continua contando como ouvida, como sempre; uma gravação largada não foi ouvida.
5. **O registro da simulação é por gravação** (`voice:<aparelho>:<documento>`); uma fala própria
   (o telefone) é oferecida, não concede nada e não tem registro. `availableActions` oferece a
   voz sempre que o aparelho responderia (`deviceLive`), também para ouvir de novo.
6. **A mão do robô é o próprio handler:** `press` chama `operateVoiceOn`, a função que `E`
   chama, e depois deixa a transmissão ir até a última linha. O que a mão não prova é o `case`
   que chega a ela em `Devices.tsx`: é a primeira linha de `officeAnswersWiringProblems`.
7. **As credenciais são conferidas em `validateOpening`** (T11, corrigido), e uma condição que
   espera uma credencial conta como quem pede. **O aviso depende de uma ordem** que o plano não
   via: ver T11.
8. **`lock-host-kind-unsupported` é por portador** (T10, corrigido): container aceita
   `knowledge` e `tool`; quadro de sala, só `knowledge`; portal, nenhuma.
9. **`container-node-missing` mora em `validateBake`**, e `device-node-missing` ganhou o `id` do
   dispositivo (não tinha: não podia ser datado nem perguntado por id).
10. **As linhas de uma gravação não entram em `spokenKeys`** (T12, corrigido): são medidas só
    contra os 130 caracteres (`recordedKeys`). As regras de quem fala da noite de agora (hora em
    algarismo, ponto cardeal, Helena apresentada, estado da noite) são das falas próprias.
11. **O leitor em tela baixa** [não previsto]: ver T13. O painel é uma coluna que não rola
    (`is-reader`), o papel rola, os botões ficam; em tela de até 420 px de altura o leitor pode
    ir a 84vh (nada é segurado atrás de um papel). Medido depois, em 844 × 390: painel de 271 e
    322 px nas duas páginas do arquivo A, sem rolagem, botões dentro do painel.
12. **`useReaderKeys` tem arquivo próprio** (`src/ui/useReaderKeys.ts`): exportado de
    `Notebook.tsx`, um gancho ao lado de um componente quebra o Fast Refresh (aviso do oxlint).
13. **O som de uma voz é `museumAudio.radioStatic()`** (meio segundo de chiado sem bipe: uma
    linha sem ninguém, ou a fita antes da voz). Som próprio é de L16.
14. **Formas que o plano deixou em aberto.** `containerOpen` e `toolSpent` (`lockRules.ts`);
    `prepareContainerDoor`, `prepareContainerContents`, `swingContainerDoor`,
    `showContainerContents`, `doorAngleAfter`, `CONTAINER_DOOR_SECONDS = 0.7`, `isDoorNode`,
    `contentsNodeName` (`containerNodes.ts`); `recordingGrant` (`progressGrants.ts`);
    `voiceLineKeys`, `operateVoice`, `operateVoiceOn` (`voiceDevice.ts`); `messageLampLit`,
    `MESSAGE_LAMP_PERIOD_SECONDS = 1.2`; `credentialsTaken` (`promptRules.ts`);
    `documentReadPages`, `readerPageCount`, `readerAdvance`, `readerKeyPage`, `transcriptText`
    (`readingQueue.ts`). A porta gira em passo constante; `hingeAt` é x e z no espaço da receita.
15. **Um caso a mais em `test:playthrough`**: a cadeia da Posse sobre o museu com ela
    acrescentada (a gaveta dá a chave, o cofre vira container com tranca de ferramenta, uma
    máquina toca uma gravação), jogada pela simulação e pelo robô até o mesmo fim. Os níveis
    que saíram: gravação em N1, chave em N4 com a gaveta, cofre em N5. **F5 parte daí** (o plano
    dá N4 gaveta e chave, N5 cofre).
16. **Mais testes mudaram de sentido do que 9.2 previa**: as seis linhas novas da tabela.

**Medido.**

- Bundle (gzip, pelo próprio portão): documento 63.235 (teto 63.600), título 31.727 (era 31.478;
  teto de 31.630 para 31.880, o medido mais meio por cento, com o motivo em
  `BUNDLE_PATH_CEILINGS`), jogo 395.427 (era 393.795; **o teto de 395.760 não subiu**, sobram
  333 bytes: F4 vai precisar subir). Antes do clique 94,96 kB; no jogo 490,39 kB.
- Lotes (`test:kit-runtime`): escritório com 51 lotes de kit (eram 53; teto 53), 74 nós por dado
  (kit 51, containers 5, dispositivos 16, controle 2), como antes. Átrio e Holyoke iguais.
- Navegador, 1280 × 720, qualidade `medium`, linha de base: R01 58 · 36.086 e R02 66 · 37.906
  (draws · triângulos), **iguais** ao `BROWSER_RECORD`: o telefone clonado em vez de instanciado
  não custou nada.
- Inundação: 29 alvos (eram 28); o telefone é julgado, com lugar de pé no escritório.
- Suítes: `test:locks` 19 (eram 16), `test:opening` 39 (37), `test:opening-flow` 52 (48),
  `test:radio` 40 (35), `test:save` 61 (60), `test:map` 19 (18), `test:playthrough` 37 (36),
  `test:kit-runtime` 32 (31), `test:navigation` 114 (113). As 500 noites: 20.531 teclas, 2.610
  delas para nada.

**Navegador** (servidor reiniciado depois da última edição; aba oculta, jogo andado por
`__museumStep`, a visibilidade do documento forçada para a legenda aparecer; pt-BR e inglês).

- Jogo novo, pt-BR, 1280 × 720, no escuro: «E · Discar · Telefone». `E`: legenda «TELEFONE ·
  Linha muda.», o prompt vira «E · Pular · Telefone»; `E` de novo encerra; deixada, a linha some
  sozinha em 3,2 s. O save é o mesmo objeto antes e depois: nada foi gravado.
- Luminária acesa: a apresentação do Jorge começa; `E` no telefone corta, toca «Linha muda.»,
  `radioCalls` continua vazio, e a apresentação volta da primeira linha depois do silêncio.
- Arquivo A da Ala 1: `E` abre na primeira nota («← Voltar» apagado, «1 / 2», «Próximo →»); os
  dois documentos e o fato já estão no save; `E` ou «Próximo» mostra «Springfield, 1896» («2 / 2»,
  «Fechar · Esc»); ← e → viram e param nas pontas; `E` na última fecha; `Esc` fecha de qualquer
  uma. Arquivo B (um papel): só «Fechar · Esc», sem fólio.
- Inglês: *E · Dial · Telephone*, *TELEPHONE · The line is dead.*, *← Back*, *Next →*,
  *Close · Esc*.
- 844 × 390, pelos botões: diante do telefone há o botão «AÇÃO» e o prompt sem a tecla; o toque
  disca, a legenda cabe entre os direcionais, «Pular» encerra. O leitor: «← Voltar», «1 / 2»,
  «Próximo →» dentro do painel, sem rolagem; na última, «Fechar» (sem «· Esc»).
- `?qaSave=l2-shortcut-released` (toque) e `?qaSave=production-drawer-open` (inglês): «Continuar»
  sem aviso nenhum, `credentials` vazio, a gaveta aberta lê «E · Read · Otávio's drawer ✓» e abre
  num papel só.
- Console sem erro nem aviso novo (só o `THREE.Clock` de sempre).
- **Não exercitado no navegador, porque o conteúdo de verdade ainda não tem:** a porta que gira,
  o conteúdo atrás dela, a lâmpada de recado, uma gravação e o aviso de credencial. São de F5.

**Visto de passagem, sem conserto nesta fatia.**

- Com o rádio no bolso, o ícone do rádio fica verde («Pular») enquanto o telefone fala: é o
  mesmo ar, e `R` avança a linha do telefone. Dura uma linha.
- No leitor com mais de um papel, só a última página tem «Fechar»; no toque, sair no meio pede
  passar pelas outras. É a regra que o caderno já tinha.
- A nota «Será arquivado no caderno do curador…» passa a duas linhas em 1280 × 720 quando há
  paginação ao lado (418 px de 683). Cabe; não rola.

### 15.4 F4 — Assinar: termos, o gesto de segurar e a sequência dirigida (2026-10-05)

T14 a T17 feitas. `npm run check` (35 passos: entra `test:ending`) e `npm run build` verdes.
`CONTENT_LOT` continua 2; `docs/releases/L2.graph.json` não foi tocado e `validateAdditive` contra
ele não acusa nada («graph: held to L2's snapshot · 42 actions it gave»). `SAVE_VERSION` 1. **O
save ganha dois campos**, `termsSigned` e `sequencesSeen` (3.1): listas, com `stringList` e junção
por união; todo save do corpus e de produção carrega com as duas vazias e sem perder nada do que
tinha (casos A a E de `test:save`). **Nenhum conteúdo de história:** `MUSEUM.terms` e
`MUSEUM.sequences` não existem, o púlpito continua no `kit` e nenhum dispositivo é `signing-desk`
(`test:ending` afirma as três coisas sobre o museu de verdade; F5 muda essas linhas). O jogo de
verdade não muda para o jogador: o que muda por baixo é que o clique de um botão de ação do toque
passa por `actionClick` antes de agir (e age uma vez, como antes), e que o save leva duas listas
vazias. O motor é provado com uma casa feita para o teste (`scripts/test-ending.ts`: saguão, porão
e sótão; uma mesa e um rádio no saguão; três termos e duas sequências).

**Vermelho visto antes do conserto** (as suítes escritas primeiro, rodadas contra a fonte de
`3adc4fd`):

| Suíte | Como reprovou |
|---|---|
| `test:ending` | erro de importação: `runtimeWiring.ts` não exporta `endingWiringProblems`, e os módulos que a suíte pergunta (`termRules.ts`, `sequenceRules.ts`, `signingDesk.ts`, `sequenceDirector.ts`) não existem. A suíte inteira, como T17 dizia |
| `test:mobile-controls` | `ERR_MODULE_NOT_FOUND`: `src/engine/holdAction.ts` (e `pressPrimaryAction` não existe) |
| `test:save` | 56 de 63. As amostras e a tabela não batem (`termsSigned` e `sequencesSeen` têm amostra e não têm linha); «termsSigned has no line in the table of the save»; a lista do que conta para «Novo jogo»; nas abas vivas, a assinatura não põe flag nem gatilho; casos A e B, C e E (`undefined !== []`) |
| `test:triggers` | 27 de 31. Um campo do schema sem caso; «a list the asker does not hold answers no» (`true !== false`: o avaliador ignorava `termsSigned`, e a condição valia para quem não assinou); a tabela de classes; `compileTriggers` não dá `term:<id>:signed` |
| `endingWiringProblems` e `holdWiringProblems` (novas), contra a fonte de então | 38 e 32 fragmentos em falta, um por linha de fiação |
| navegador, 844 × 390, a fatia já verde | ver «o toque engolido», abaixo: um erro que nenhuma suíte via, e que ganhou a regra e o caso dele |

**Mutações que provam que as asserções mordem.**

- `endingWiringProblems` (`runtimeWiring.ts`, chamada por `test:ending`): 37 refatorações em
  memória, todas pegas. A mesa: `E` tomado sem pedir para segurar; o que `E` faz decidido fora do
  prompt; a recusa em silêncio; a espera que termina e não assina; a assinatura que põe a flag à
  mão; ninguém ouvindo a espera terminar; o termo seguinte oferecido debaixo do cartão; a lâmpada
  por regra própria, nunca escondida, ou sem saber do cartão; o tempo de segurar inventado no
  componente; um termo sem gatilho; os nós nunca juntados; a mesa que ninguém desenha. As
  palavras: o que falta escrito no componente; o Caderno sem a lista; a página que nunca fica
  assinada. A sequência: diretor com regra própria, por cima de um modal, na tela de título; o
  rádio que não se cala; vista no primeiro passo; nunca gravada; `{hora}` impresso cru; um passo
  avançado pelo temporizador de outro; tempo próprio; o ar que é só do rádio; ninguém montando;
  o Jorge falando por cima; o diretor do rádio que não ouve o fim; `R` chamando por cima; `R` sem
  efeito para quem não tem rádio; o cartão do jogo velho sobre um jogo novo.
- `holdWiringProblems` (chamada por `test:opening-flow`): 41. O teclado: `E` que não começa a
  espera; que reivindica o que recusou; soltar que não solta; `Escape`, perda de foco e aba
  oculta que deixam a espera correr; nenhum quadro contando; a espera que segue qualquer coisa na
  mira, que segue sem mira, ou numa mesa que deixou de oferecer; o pedido tomado por ação feita.
  O toque: o botão que pressiona ao pousar o dedo sobre qualquer coisa, ou nunca; o ponteiro
  inacabado de uma assinatura guardado; o dedo levantado que não solta, ou que sempre solta; o
  toque comum tomado por eco; o clique que age venha de onde vier; o botão de volta ao clique
  cru; sem pergunta no vidro; «Cancelar» que não cancela; o menu do navegador num toque longo. O
  HUD e a folha de estilos: prompt que não segue o gesto; tecla e botão sem anel; anel com tempo
  próprio. E as três interações que já existiam (a luminária, a porta, a peça): cada uma continua
  reivindicando a própria tecla pela guarda comum.
- `test:ending`: uma casa quebrada para cada código do portão desta fatia (a lista está em T17), e
  a casa sã não é acusada de nada.
- `test:save`, abas vivas, com duas e com três abas: uma assina (a assinatura, a flag e o gatilho
  são um aviso e uma escrita); a outra, noutra sala, ouve e não é levada à mesa; assinar o mesmo
  termo de novo não escreve; uma aba sem regras que grava um ajuste não apaga termo nem flag; um
  build que conhece a assinatura e não a consequência grava um segundo termo, e a flag é
  assentada aqui, numa escrita, por uma aba que tem a regra; uma sequência vista até o fim numa
  aba está vista em todas (uma escrita, e nenhuma antes do último passo).
- `test:triggers`: o gatilho do termo dispara uma vez; sessenta ordens das duas assinaturas entre
  tudo o mais que a casa oferece terminam no mesmo save; um save que chega assinado e sem a flag
  a ganha no registro do conteúdo e na carga; a assinatura de um termo que este build não tem
  fica, e não põe nada.
- `test:mobile-controls`: a tabela de `holdStep`, célula por célula, e o ponteiro do botão,
  evento por evento.

**O que saiu diferente do plano** (o texto acima já está corrigido onde se diz).

1. **No toque, só a pressão que tem de ser segurada desce no ponteiro** (T15, corrigido). O plano
   mandava o botão de Ação agir em `onPointerDown` para tudo e deixar o `onClick` para o teclado.
   Agindo quando o dedo pousa, uma ação que abre um painel (o caderno, um armário, o painel de
   uma tranca) o abriria debaixo do dedo, e o clique do mesmo toque cairia no painel. Então toda
   ação comum continua no clique, como sempre foi, e o ponteiro só é tomado quando o que está na
   mira pede para ser segurado (`interactionHeldOf`). O clique que sobra de uma pressão segurada
   é eco e não age (`clickIsThePress`: `detail` 0 é teclado e age; dentro de 700 ms de um
   ponteiro que pressionou, não). **O toque engolido:** depois de uma assinatura segurada a mesa
   deixa de oferecer, o botão some debaixo do dedo antes de o dedo subir, e não chega nem o
   `pointerup` nem o clique; o «ponteiro pressionado» ficava guardado e o toque seguinte, em
   qualquer coisa, era tomado por eco e não fazia nada. Visto no navegador (o toque no telefone
   depois de assinar). O que o botão lembra de um ponteiro virou três regras puras
   (`actionPointerDown`, `actionPointerUp`, `actionClick`): um ponteiro que desce começa do zero.
2. **`holdStep` soma o passo e depois confere** (3.10, corrigido): o quadro que completa o tempo
   é o que assina. Como estava escrito (confere, depois soma), a assinatura sairia um quadro
   depois do anel fechar.
3. **`signed` leva o termo, e a mesa tem `held`** (3.10, corrigido). O prompt nomeia o termo
   assinado. `held` é S26: enquanto a sequência que segue uma assinatura é devida ou está na
   tela, `deviceInputOf` pergunta a mesa com `held` e ela não oferece o termo seguinte; o cartão
   fecha, e só então o prompt muda. A lâmpada e o prompt saem da mesma pergunta.
4. **A espera só segue o que ainda pede para ser segurado.** O quadro pergunta
   `interactionHeldIdOf`, não «o que está na mira»: uma mesa que deixou de oferecer no meio da
   espera (outra aba assinou; uma sala apagou) a encerra, como perder a mira.
5. **Dois módulos sem React** que o plano não nomeava: `signingDesk.ts` (o que `E` faz numa mesa
   e o que o fim da espera grava) e `sequenceDirector.ts` (começar o que é devido, avançar um
   passo). A mão do robô (`scripts/lib/playthrough.ts`) chama as mesmas funções que a tecla
   chama, passa os quadros pelo próprio `holdStep` e assiste a sequência pelo diretor; o que ela
   não prova, o `case` e o ouvinte em `Devices.tsx`, é de `endingWiringProblems`.
6. **`R` avança a sequência com ou sem rádio** (T16, corrigido): a sequência não tem aparelho.
7. **A sequência tira o ar do rádio no mesmo `set`** que a põe na tela (DL3-12 dizia
   `stopRadio`: seriam dois avisos). A chamada cortada não é gravada como ouvida e volta quando a
   sequência acaba, pelo que F3 deixou: o diretor do rádio olha o ar, e o ar agora é `airTaken`.
8. **A sequência é da sessão e do jogo:** um reload a perde sem gravar (toca de novo do cartão), e
   `takeInOtherTabs` a encerra quando outra aba começa um jogo novo.
9. **A simulação assiste e tem uma segunda jogadora** (3.12, corrigido). Sem assistir, uma casa
   com dois termos na mesma mesa pararia no primeiro: a mesa fica retida enquanto a sequência é
   devida. E `post-ending-disables-action` só pode ser perguntado a quem assina cedo.
10. **Códigos a mais no portão** (T14 e T16, corrigidos): `term-blocker-unnamed`,
    `term-duplicate`, `desk-hold-seconds`, `condition-term-missing`, `notebook-term-missing`,
    `sequence-duplicate`. As duas regras de condição de um termo (`gate-uses-negative-condition`,
    `gate-uses-all-condition`) são do portão estático (`validateEnding`), não da simulação.
11. **`radio-hint-coverage` lê a assinatura, não a flag** (9.2). Uma flag que um gatilho põe
    sozinho não é assinatura; e um termo assinável, por assinar e sem dica acima dele é o Jorge
    dizendo que não há mais nada a fazer. **F5 precisa de uma dica para o termo.**
12. **A lâmpada tem cor** (T14, corrigido): vermelha enquanto o termo espera por algo, verde
    quando segurar assina.
13. **No toque a legenda da sequência fica na faixa de cima** [não previsto]. Embaixo, em
    844 × 390, ela cobria o prompt da mesa. Medido depois: legenda de 54 a 135 px, prompt de 237
    a 271, a legenda do rádio de 329 a 376. Em 1280 × 720 fica logo acima da legenda do rádio.
14. **`sequencesSeen` não conta como progresso** (3.1 já dizia) e **`useNightPhraseKey` tem
    arquivo próprio** (`src/ui/useNightPhraseKey.ts`): o HUD e a sequência o usam.
15. **O título cresceu três vezes o previsto** (§10, corrigido): a folha de estilos viaja com
    ele.
16. **Mais testes mudaram de sentido do que 9.2 previa**: as oito linhas novas da tabela.
17. **Formas que o plano deixou em aberto.** `deskTerms`, `signedTerms`, `deskShows`,
    `TermBlockers` (`termRules.ts`); `SequenceProgress` (`sequenceRules.ts`); `HOLD_IDLE`,
    `isHoldRequest`, `holdMark`, `readHoldMark` (`holdAction.ts`); `beginPrimaryHold`,
    `primaryHoldMark`, `isInteractKey`, `isHoldCancelKey` (`primaryAction.ts`);
    `POINTER_CLICK_ECHO_MS = 700`, `clickIsThePress`, `ActionPointer`, `NO_ACTION_POINTER`,
    `actionPointerDown`, `actionPointerUp`, `actionClick` (`mobileControls.ts`); `deviceHeld`,
    `airTaken`, `DeviceContent` (`deviceRules.ts`); `interactionHeldOf`, `interactionHeldIdOf`
    (`interactionTarget.ts`); `DeskNodes`, `prepareDeskNodes`, `showDeskNodes`
    (`deviceNodes.ts`); `deskMissingText` e as formas `desk`, `hold` e `signed` do prompt
    (`promptRules.ts`); `validateEnding` (`validate.ts`); `startDueSequenceOn`,
    `skipSequenceStepOn`, `sequencePlaying`, `sequenceStepSeconds` (`sequenceDirector.ts`);
    `pressSigningDeskOn`, `signAtDeskOn` (`signingDesk.ts`).

**Medido.**

- Bundle (gzip, pelo próprio portão; as partes, arquivo por arquivo contra um build de
  `3adc4fd` feito à parte, que deu os 31.727 e 395.427 de F3): documento 63.239 (teto 63.600);
  título 32.752 (era 31.727; teto de 31.880 para 32.910); jogo 398.905 (era 395.427; teto de
  395.760 para 400.890). Os dois tetos são o medido mais meio por cento, com o motivo em
  `BUNDLE_PATH_CEILINGS`. Antes do clique 95,99 kB de 250; no jogo 494,90 kB de 600: o «perto
  de 98 e 500» de §10 para o fim do lote fica apertado, porque F5 ainda traz 2,4 kB de texto e
  o conteúdo.
- Suítes: `test:ending` 19 (nova), `test:mobile-controls` 22 (eram 14), `test:save` 63 (61),
  `test:triggers` 31 (30), `test:playthrough` 38 (37), `test:opening-flow` 53 (52); `test:opening`
  39 e `test:qa-save` 27, os mesmos, com asserções a mais. As 500 noites: 20.531 teclas, 2.610
  delas para nada, **iguais** às de F3 (o museu de verdade não ganhou ação nenhuma).
- Lotes, draws e triângulos: nada mudou (nenhum conteúdo, nenhum bake).
- `test:playthrough`, o caso novo: sobre a cadeia de F3 (a chave, o cofre) com o púlpito feito
  mesa, um termo e uma sequência, a simulação e o robô chegam ao mesmo fim. O Livro em N5, o
  termo, a flag e o gatilho em N6: **sete níveis, como o plano dá para F5.** Quem nunca assina
  termina um nível antes e não deve nada; quem assina no primeiro instante termina onde todos
  terminam.

**Navegador** (servidor reiniciado depois da última edição; pt-BR e inglês; 1280 × 720 pelo
teclado e 844 × 390 pelos botões). O museu de verdade não tem mesa, então a parte da assinatura foi
exercitada com um **remendo temporário do conteúdo, que não está no commit**: o púlpito feito
mesa, dois termos e uma sequência (cartão e duas falas, uma com `{hora}`), com chaves de texto
provisórias. Desfeito ao fim; `museum.ts` e os dois dicionários conferidos contra o que a fatia
grava.

- Jogo de verdade (de novo ao fim, com o conteúdo do commit e o servidor reiniciado), pt-BR: o
  save de um jogo novo tem `termsSigned: []` e `sequencesSeen: []`. `E` na luminária, uma
  escrita, e um segundo `E` nenhuma; `E` no telefone corta o Jorge, «TELEFONE · Linha muda.», e
  `porter-hello` volta depois do silêncio (o diretor do rádio continua ouvindo o ar, agora por
  `airTaken`). Em inglês: *E · Dial · Telephone*, *TELEPHONE · The line is dead.*. Em
  844 × 390, um toque de verdade no botão de Ação (`pointerdown`, `pointerup`, `click` com
  `detail` 1) disca uma vez; sobre o caderno, abre-o uma vez e ele fica na página «1 / 3»: o
  clique do toque não cai no «Turn the page →» que aparece debaixo do dedo.
- Um save que traz um termo e uma sequência que este build não tem (o que o remendo deixou no
  navegador): «Continuar» carrega, as duas listas ficam como vieram, nada toca. E «Novo jogo»
  pede confirmação por causa dele: uma assinatura conta como progresso.
- A mesa vazia: «Púlpito — falta o Livro de Termos», sem tecla nem botão; `E` não faz nada.
- Bloqueada: «Púlpito — Assinar: Termo de posse · falta luz em: Átrio, Ala 1 · Holyoke»; `E`
  zumbe e nada é gravado.
- Pronta: «E Segure E — Assinar: Termo de posse». Segurando: a tecla ganha `is-holding`, o anel
  fecha em 1,2 s (o primeiro quadro, depois de uma aba parada, contou 0,25 s). Soltar a 0,77 s
  cancela. Um toque na tecla: «E Assinar: Termo de posse · Esc Cancelar»; `Escape`, olhar para
  fora e a janela perder o foco cancelam; `E` de novo assina. Segurar até o fim assina: uma
  escrita (o termo, a flag e o gatilho juntos).
- A sequência: o cartão «Termo de posse assinado · Pular ›» por 4,0 s, depois as falas (5,1 s e
  3,2 s, pelo comprimento), com a hora por extenso no lugar de `{hora}`. Enquanto ela está na
  tela a mesa diz «Púlpito — Termo de posse · assinado ✓» e não oferece o segundo termo; fechado
  o cartão, oferece. `R` sem rádio avança um passo; sob o caderno a sequência fica retida e `R`
  não a move. No Caderno: «TERMOS ASSINADOS · Termo de posse · Assinado pelo curador.».
- Aba oculta: a sequência devida não começa; mostrada a aba, começa, e corta `porter-hello` que
  estava no ar (`radioCalls` continua vazio); terminada a sequência, `porter-hello` volta.
  Recarregar no terceiro passo: ao continuar, ela toca de novo do cartão.
- Inglês: *Lectern — Sign: Deed of office · no light yet in: Wing 1 · Holyoke*; *E Hold E —
  Sign: Deed of office*; *E Sign: Deed of office · Esc Cancel*; *Lectern — Deed of office ·
  signed ✓*; *Deed of office signed · Skip ›*.
- 844 × 390: «Segure Ação — Assinar: …»; o botão segurado mostra o anel e assina (uma escrita);
  meio caminho cancela; um toque troca o botão por «ASSINAR» e «CANCELAR», com «Cancelar» onde a
  Ação estava, e o clique que sobra do toque não assina; «Cancelar» cancela, «Assinar» assina
  (uma escrita). Depois de uma assinatura segurada, o toque seguinte no telefone age. Sem
  rolagem horizontal.
- Console sem erro nem aviso novo (só o `THREE.Clock` de sempre).
- **Não visto no navegador:** a lâmpada e o Livro. O púlpito do bake não tem `__led` nem
  `__book` (T18, F5); os dois grupos são provados sobre três objetos de verdade em `test:ending`.

**F5 herda.**

- A mesa pede `<part>__led` e `<part>__book` no bake (`device-node-missing`), e a lente da
  lâmpada é pintada com `led-green` e `led-red`.
- O `when` de um termo só pode pedir, além do que o `presentedWhen` pede, sala acesa ou papel
  lido (`term-blocker-unnamed`); e o termo precisa de uma dica do rádio acima da última.
- As frases da hora começam por maiúscula («Passa das oito»): uma fala de sequência tem de pôr
  `{hora}` no começo de uma frase.
- Três suítes afirmam o museu de verdade como esta fatia o deixa, e são as linhas que F5 muda
  ao trazer `termo-posse` e `seq-posse`: `test:ending` (sem termo, sem sequência, sem mesa),
  `test:save` (um alias para `termsSigned` ou `sequencesSeen` é acusado: o conteúdo não tem os
  ids) e `test:playthrough` (`NOW.terms`, `NOW.ids.terms` e `NOW.ids.sequences` vazios). E o
  púlpito, ao virar dispositivo, entra na conta dos miráveis de `test:opening-flow` e
  `test:radio` (hoje quatro).

**Visto de passagem, sem conserto nesta fatia.**

- O título de uma sala pode ter « · » («Ala 1 · Holyoke»), o mesmo sinal que separa as partes do
  prompt da mesa: «… · falta luz em: Átrio, Ala 1 · Holyoke». Lê-se; as salas são separadas por
  vírgula.
- `resetProgress()` chamado com a cena montada deixa o `currentRoom` do store fora de passo com
  o jogador. Só o console chega a isso; o jogo começa um jogo novo pela tela de título.

### 15.5 F5 — Posse: a cadeia inteira, o bake, o save antigo e o lote 3 (2026-10-05)

T18 a T21 feitas. `npm run check` (35 passos) e `npm run build` verdes. `CONTENT_LOT` é 3.
`docs/releases/L3.graph.json` foi escrito pela primeira vez, como **rascunho** (49 ações, 7 linhas
da lista, 71 ids, 21 campos do save; nenhum digest em `FROZEN_SNAPSHOTS`, que é do fecho);
`docs/releases/L2.graph.json` não foi tocado e `validateAdditive` contra ele não acusa nada
(«graph: held to L2's snapshot · 42 actions it gave»). `validate:content` não tem dívida nova: 34
linhas datadas, nenhuma com data 3, e três promessas datadas, cada uma dita no jogo pela chave ao
lado (o pódio, a caixa-forte, a prova). `SAVE_VERSION` 1 e **nenhum campo novo no save**: o que
muda na carga é a marca da gaveta (`PRE_POSSE_SAVE.drawer`, em `prePosse`) e o alias da folha
(`SAVE_ALIASES`). O corpus (`saveFixtures.ts`) não ganhou save: os dois de L3 são do fecho (§14).

O roteiro do jogador exaustivo tem os sete níveis do plano: N0 a luminária · N1 o átrio, o recado,
o relógio, o rádio · N2 a luz do átrio e a Ala 1 · N3 a luz da Ala 1, o atalho, o ano · N4 a
gaveta, a folha, a chave · N5 o cofre, o Livro, a prova · N6 a Posse.

**Vermelho visto antes do conserto** (as suítes escritas primeiro, rodadas contra a fonte de
`645b2ca`):

| Suíte | Como reprovou |
|---|---|
| `test:playthrough` (reescrita antes do conteúdo) | 19 de 38. «"open office-safe" is not offered in office»; «the museum has one term to sign in this lot» com `[]`; as 500 noites; «production-drawer-open: short of the end»; `id-renamed-without-alias documents:doc-otavio-handover` |
| `test:ending` | 18 de 22. O púlpito não é mesa; o museu não tem termo; `PRE_POSSE_SAVE.drawer` não existe; «the drawer was open in a write that did not carry its key» |
| os três saves com a gaveta aberta (`production-drawer-open`, `l1-route-end`, `l2-shortcut-released`), carregados pelo store | `credentials: []`, sem flag, sem gatilho, sem a folha: o save carregado não tem a chave (T20) |
| `test:save` | 63 de 66. A marca da gaveta save por save; a aba de L2 que abre a gaveta («the museum compiles no trigger for the drawer: nothing would hand the key over»); os casos F e G |
| `validate:content`, com o conteúdo de F5 e sem o bake | `device-node-missing` duas vezes (`atrium-lectern__led`, `atrium-lectern__book`), `container-node-missing` duas vezes (`office-safe__door*`, `office-safe__papers`) e `device-part-not-baked` (`office-answering-machine`) |
| `test:ratchets`, com `CONTENT_LOT` em 3 | 2 de 4. «the reference points were last measured in L1 and the content is at L3: measure again», e o kit acima do teto (2.201,6 de 2.181,9 KiB) |
| `test:opening-flow`, para o prompt do cofre (item 1 de «diferente») | `lockBars is not a function`; antes da suíte, visto no navegador: «E · Cofre de ferro — precisa de chave» com a chave na mão, sobre um `E` que abria o cofre |
| **escritos depois da regra**, e por isso provados ao contrário (a regra desligada na fonte, a suíte rodada, a fonte devolvida byte a byte): os casos de `legacy-save-drawer` em `test:opening` e o do corte do cofre em `test:kit` | 38 de 39: «legacy-save-drawer does not accuse "office-drawer"» e, duas vezes, «…"lock:office-drawer:opened"»; 6 de 7: «Missing expected exception» com a guarda de `withoutFlatFace` desligada (e, com metade da face deixada no lugar, o próprio gerador do cofre para o bake) |

**Mutações que provam que as asserções mordem.**

- `progressWiringProblems` (chamada por `test:locks` e `test:triggers`), três refatorações novas
  do prompt de um armário, todas pegas: toda tranca fechada chamada de trancada, tenha a mão o que
  tiver (era o que estava no jogo); o prompt decidindo pelo tipo da tranca e não pela resposta de
  `attemptLock`; a tranca que cede dita como gaveta para ler. E `lockBars` contra a tabela de
  `attemptLock`, tranca por tranca, chaveiro por chaveiro: barra exatamente quando o toque nem a
  acha aberta nem a abre.
- `officeAnswersWiringProblems` (chamada por `test:opening-flow`), seis do aviso «Anotado no
  caderno»: o aviso de uma linha que veio com o save; o aviso para quem não tem caderno; uma lista
  própria do componente; sem o save anterior para comparar; a mesma linha anunciada a cada
  escrita; o aviso que ninguém monta.
- `test:speech-coherence`, dois museus a mais reprovam: a chamada do save antigo
  (`porter-legacy-drawer`) dita a quem acabou de abrir a gaveta («a new game was told to look
  again in a drawer of another night»), e o cartão da Posse devido desde a leitura do Livro («the
  card that says the deed was signed was shown with the deed unsigned»).
- `test:kit` (`scripts/test-kit-layout.ts`, novo): a dobradiça declarada com 3 cm de erro reprova;
  a porta girada pelo ângulo do conteúdo livra a frente do cofre, e girada em torno de um eixo
  dez centímetros para dentro da folha, ou recuado oito na moldura, atravessa-a. O corte
  (`withoutFlatFace`): a face sai inteira e sozinha, as arestas ficam, o plano que erra por 4 mm
  é recusado, e nenhum triângulo da carcaça gravada no kit cobre o vão no plano da frente (um
  teste por vértices não veria a face deixada no lugar: os cantos dela ficam fora do vão).
- `test:opening`: um museu sem o bake de F5 é acusado dos cinco erros da tabela acima, pelo id de
  cada objeto; H-23, sobre o museu de verdade: tirar a chave das credenciais, o cofre, o Livro ou
  o púlpito faz da folha da gaveta `speech-mentions-missing`; uma promessa datada sem nota é
  `deferred-without-notice`; `legacy-save-drawer` acusa a tranca renomeada (com ela vai o
  gatilho, que é escrito a partir do id) e a gaveta que não entrega nada ao abrir.
- `test:save`, abas vivas: a aba que grava como L2 abre a gaveta nas três ordens possíveis de
  aviso e de leitura, e este build, aberto ao lado, marca a gaveta e entrega a chave em **uma**
  escrita; uma aba sem regras grava por cima sem perder chave nem flag; uma segunda carga não
  acrescenta nada. O alias: dezesseis aliases bons passam e cada um dos ruins é acusado.
- `test:ending`, no museu de verdade: o púlpito nomeia o termo quando o Livro é lido, não assina
  com sala apagada, assina com a casa acesa; o save que abriu a gaveta antes de ela guardar chave
  recebe a chave na carga, ouve a chamada dele uma vez e chega à Posse; a gaveta aberta agora
  entrega a chave na mesma escrita e não ganha a marca.
- `test:playthrough`: a rota canônica na ordem dela; as 500 noites (23.423 teclas, 3.188 delas
  para nada, 1.244 abas fechadas); quem pula tudo o que é opcional assina e vê a noite fechada;
  quem digita o ano sem ter lido só adianta a chave; todo save do corpus, carregado e jogado até
  o fim, não perde nada e chega lá.

**O que saiu diferente do plano** (o texto acima já está corrigido onde se diz).

1. **O prompt do cofre com a chave na mão** [não previsto; 3.8 e §6.5, corrigidos]. Achado na rota
   A: com `tool:service-key` em `credentials` o prompt continuava «Cofre de ferro — precisa de
   chave», e `E` abria o cofre. É uma linha que o estado desmente. A regra nova é `lockBars`
   (`lockRules.ts`): uma tranca barra quando o toque nem a acha aberta nem a abre, que é a
   resposta de `attemptLock` e de mais nada. `containerPrompt` ganhou o quarto argumento e a chave
   `prompt.unlock`: «E · Destrancar · Cofre de ferro» / *Unlock · Iron safe*; sem a chave continua
   «precisa de chave»; aberto, «Ler · Cofre de ferro ✓». O mapa não mudou: a lista de trancas
   pendentes da planta continua dizendo «Cofre de ferro — precisa de chave» enquanto o cofre
   estiver fechado, como ponteiro do que falta abrir e com quê.
2. **A linha da prova tem nota** (3.4, §6.5, corrigidos). `notebook.todo.proof` é promessa datada,
   e o portão pede a nota de toda promessa (`deferred-without-notice`):
   `notebook.todo.proof.note`, «hoje não: fica para a reabertura».
3. **Saves antigos ouvem três chamadas, não duas** (§5 A e B, §11 E, corrigidos): `porter-hello`,
   depois `porter-machine-reminder` (o recado é de L3; nenhum save antigo o ouviu, e o átrio deles
   está aceso), depois `porter-legacy-drawer`. Pela mesma razão **o saguão aceso começa duas
   chamadas** num jogo novo: a dele e a da secretária, que caduca quando o recado é ouvido.
4. **`MAXIMUM` tem duas flags** (T19, corrigido): `clock-set` e `posse-signed`. A de legado só a
   migração põe; `simulate.ts` a trata como posta para não acusar `flag-never-set` na condição de
   `porter-legacy-drawer`, e nenhum jogo novo a tem.
5. **A última dica só é ouvida com a Posse assinada, e diz isso.** Com a dica da chave e a da
   Posse acima dela, o resto da escada deixou de ser «a luz está feita»: «Posse assinada. Agora é
   conferir o acervo, peça por peça. A caixa-forte fica pra depois: o subsolo alagou.» (o texto
   de §6.5 já era este; o que mudou foi o que `test:radio` afirma dela).
6. **A folha cita a chave, e uma credencial declarada é citável** (T19, corrigido): `mentions` de
   `doc-otavio-handover` leva `tool:service-key`, escrito como o save o escreve, e
   `validateSpeech` aceita como id citável toda credencial de `MUSEUM.credentials`. O Livro cita
   o púlpito. `DocumentData.mentions` é o campo novo do schema.
7. **A carcaça do cofre não é de cinco chapas** (§7, corrigido). É a casca chanfrada de antes sem
   a face da frente (`withoutFlatFace`, novo em `geometry.mjs`: tira os triângulos deitados num
   plano e reprova se a conta não for a esperada), com moldura em meia-esquadria, rebaixo e forro
   por dentro, a prateleira a 0,90 m, o rodapé e a cimalha. Cada dobradiça ganhou a aba de latão
   que a prende à porta e, na família do corpo, o olhal de ferro atrás dela: sem os dois a porta
   girava num cilindro solto no ar. 1.192 triângulos (teto 1.434). O gerador exporta `layout`
   (a frente, o eixo e os dois nós da dobradiça, a porta, o vão, a cavidade, a prateleira, os
   papéis) e `test:kit` confere o conteúdo contra ele.
8. **O púlpito não ganhou régua** (§7, corrigido): a régua de latão que o tampo já tinha é o
   apoio do Livro. O Livro é um perfil só, varrido (72 triângulos, um material), deitado no plano
   de leitura com o pé na régua. 968 triângulos (teto 1.170). A família `light` chama-se `led`.
9. **A secretária** ficou na posição A (`[0.615, 0.74, 0.642]`, `rotationY: -π/2`), com 46 mm de
   altura e 356 triângulos; o plano B não foi preciso. **Do ponto de leitura, o rádio no berço
   ganha a mira**: a secretária mira-se do lado da porta e da ponta sul da mesa, e do ponto de
   leitura assim que o rádio vai para o bolso (`test:navigation` acha o lugar de onde ela é
   alcançada). A chamada `porter-machine-reminder` diz onde ela está («no ramal do escritório»).
10. **R01 mede 62, não 61** (§7, corrigido): a porta do cofre, nó próprio, está no quadro de R01
    também.
11. **O título cresceu 3,1 kB, não 2,4** (§10, corrigido), e só o teto dele subiu: os outros dois
    caminhos couberam nos tetos de F4. Antes do clique 99,11 kB de 250; no jogo 499,48 kB de 600.
12. **Atrasos das chamadas** (o plano não os dava): 4 s a da secretária; 2,5 s as da gaveta, do
    save antigo e do cofre.
13. **`device-part-not-baked` passou a levar o id do dispositivo**, para o portão de teste poder
    dizer quem foi acusado.
14. **`locksSeen` é condição** (3.3 já a previa; entrou nesta fatia, com a linha da tabela de
    classes e o átomo da simulação): a linha 5 aparece para quem tocou a gaveta sem ter ouvido o
    recado.
15. **`test:kit` tem três scripts** (§9.1, corrigido), e `test:triggers` e `test:locks` também
    ganharam casos nesta fatia.
16. **Formas que o plano deixou em aberto.** `lockBars` (`lockRules.ts`); `checklistToastStep` e
    o quarto argumento de `containerPrompt` (`promptRules.ts`); `ChecklistToast` (`Hud.tsx`);
    `withoutFlatFace` (`geometry.mjs`); `buildAnsweringMachine` (`officeProps.mjs`); `layout` nos
    três geradores; `flagsOfOlderSaves` (`simulate.ts`); `PRE_POSSE_SAVE.drawer`
    (`legacySave.ts`).

**Medido.**

- Bake: `kit.143787a7.glb`, 2.255.668 bytes (eram 2.234.252; +21.416, dentro dos 15 a 25 kB
  previstos), 105.476 triângulos em 201 nós (536 a mais); o teto da catraca é o medido, com o
  motivo. Secretária 264 + 32 + 60; cofre 384 + 108 + 676 + 24; púlpito 624 + 44 + 216 + 12 + 72.
  Seis pacotes, 2.959 KB, 152.188 triângulos. Nenhuma textura nova.
- Lotes de kit: átrio 47, Holyoke 28, escritório 49. Desenhado por dado: 59, 33 e 79, os tetos de
  §7. Triângulos de kit instanciados: átrio 43.324, escritório 31.638.
- Bundle (gzip, pelo próprio portão): documento 63.234 (teto 63.600); título 35.879 (era 32.752;
  teto de 32.910 para 36.050); jogo 400.368 (era 398.905; teto 400.890, sem subir). Do título,
  3.086 dos 3.127 bytes estão no pedaço dos dicionários e do store (22.764 para 25.850): 56
  chaves novas em cada língua, 2 a menos, 3 reescritas.
- Suítes: `test:ending` 22 (eram 19), `test:save` 66 (63), `test:locks` 20 (19),
  `test:opening-flow` 54 (53), `test:speech-coherence` 7 (6), `test:desk-top` 10 (9), a nova
  `test-kit-layout.ts` 7; `test:playthrough` 38, `test:opening` 39, `test:radio` 40,
  `test:triggers` 31, `test:qa-save` 27 e `test:map` 19, os mesmos, reescritos ou com asserções
  a mais. As 500 noites: 23.423 teclas (eram 20.531), 3.188 para nada. As 500 noites ouvidas:
  11.357 coisas, 6.481 delas o Jorge respondendo; 396 chegaram aos degraus impacientes.
- **`BROWSER_RECORD`, lote 3.** Servidor `museum-dev` reiniciado depois da última edição, 1280 ×
  720, qualidade `medium`, campo de 62° por 93,78°, três salas acesas, portas fechadas menos em
  R10; cada ponto como em `P0-linha-de-base.md` §0, depois de programas, geometrias e texturas
  iguais por 20 rodadas. Três sessões, três passadas iguais em cada uma (a terceira da sessão do
  fim da rota refeita depois de reiniciar o servidor, com os mesmos dez números):

  | Ponto | Jogo novo, três salas pelo store, rádio e caderno na mesa | `?qaSave=production-drawer-open`, como carrega | Fim da rota A (o Livro no púlpito, o cofre aberto) | L1 | Gravado |
  |---|---|---|---|---|---|
  | R01 | **62 · 36.526** | 55 · 35.402 | 56 · 35.426 | 58 · 36.086 | 62 · 36.526 |
  | R02 | **70 · 38.346** | 63 · 37.222 | 64 · 37.246 | 66 · 37.906 | 70 · 38.346 |
  | R03 | 79 · 63.928 | 79 · 63.928 | **80 · 64.000** | 80 · 63.940 | 80 · 64.000 |
  | R04 | 100 · 77.322 | 100 · 77.322 | **101 · 77.394** | 101 · 77.334 | 101 · 77.394 |
  | R05 | 84 · 67.808 | 84 · 67.808 | **85 · 67.880** | 85 · 67.820 | 85 · 67.880 |
  | R06 | 79 · 70.774 | 79 · 70.774 | 79 · 70.774 | 79 · 70.774 | 79 · 70.774 |
  | R07 | 39 · 37.676 | 39 · 37.676 | 39 · 37.676 | 39 · 37.676 | 39 · 37.676 |
  | R08 | 70 · 52.036 | 70 · 52.036 | 70 · 52.036 | 70 · 52.036 | 70 · 52.036 |
  | R09 | 81 · 62.374 | 81 · 62.374 | 81 · 62.374 | 81 · 62.374 | 81 · 62.374 |
  | R10 | 124 · 100.416 | 124 · 100.416 | **125 · 100.488** | 125 · 100.428 | 125 · 100.488 |

  Programas: 35 nas três sessões, depois de a casa ser percorrida (33 parado no escritório).
  O átrio não desenha um nó a mais do que em L1 em nenhum estado: 101 em R04 (teto 102) e 125 em
  R10 (teto 125) com o Livro à vista, que são os números de L1 com 60 triângulos a mais (o Livro
  no lugar da lente); um draw a menos enquanto o Livro não foi lido (o púlpito vazio não acende a
  lâmpada). No escritório são quatro draws e 440 triângulos a mais do que em L1 no estado de base
  (os três nós da secretária e a porta do cofre); o estado mais cheio do escritório, que a tabela
  não mede, é esse mais a prova na prateleira (um draw, 24 triângulos), para quem abre o cofre
  sem ter tirado o rádio nem o caderno da mesa. A Ala 1 não mudou.
  O painel do navegador fica oculto, e a escala adaptativa de resolução cai sozinha com os
  quadros lentos (de 0,92 a 0,65 nas sessões): o buffer não ficou em 1536 × 864. Draws e
  triângulos não dependem dele; não é medida de desempenho.

**Navegador** (servidor reiniciado depois da última edição de código; depois dele só mudaram
testes, este documento e um comentário de `museum.ts`. Ao fim, o viewport de volta ao `desktop`,
o save apagado pelo `localStorage` e a tela de título em «Entrar no museu»; nenhuma captura
gravada). Com o painel oculto o jogo anda por `__museumStep`, e o que é dito e mostrado
foi lido do DOM e do store.

- **A, jogo novo, pt-BR, 1280 × 720.** No escuro: «Sem energia · Secretária eletrônica», sem
  tecla; «E · Cofre de ferro — precisa de chave», e o toque grava `locksSeen`. Luminária:
  `porter-hello` (cinco falas), a instrução do quadro, o lembrete do caderno. Caderno: a lista
  conta («1 de 3» com o escritório aceso, «3 de 3» ao fim; «Átrio 0 de 4 · Ala 1 · Holyoke 1 de
  8»), e a caixa-forte está sem caixa e com a nota. Relógio
  acertado: «Passa das sete». Telefone: «Linha muda.». Secretária: «E · Ouvir · Secretária
  eletrônica», a lente pisca (`led-off`, `led-red`), «OTÁVIO · RECADO GRAVADO», nove falas até
  «[A gravação termina aqui. O visor marca 16:47.]», `doc-otavio-tape` no Arquivo, a lente apaga,
  «Ouvir de novo»; a linha 5 a lápis e «✓ Anotado no caderno». Saguão: o aviso do pódio; «Púlpito
  — mesa de assinatura: falta o Livro de Termos», sem tecla, sem lâmpada, sem Livro; o quadro,
  `porter-atrium-service` e **nenhuma** chamada da secretária (caducou). Ala 1: `porter-holyoke-lit`;
  o retrato, `porter-first-catalogued`; o atalho, `porter-shortcut`. Gaveta, 1896: uma escrita com
  a tranca, a chave e o gatilho; «✓ Você pegou — Chave do cofre de ferro» e «✓ Anotado no
  caderno»; a folha 1; `porter-drawer-open`, duas falas. Cofre: «E · Destrancar · Cofre de
  ferro»; um `E` grava a tranca aberta e depois os dois papéis; a porta gira no eixo das
  dobradiças (de x 14,41–14,48 para 13,68–14,40, sem atravessar nada) e a prova aparece na
  prateleira, a 0,90 m; o leitor em «1 / 3», «2 / 3» (o termo) e «3 / 3» (a prova);
  `porter-safe-open`, duas falas; «E · Ler · Cofre de ferro ✓». A lista: gaveta e chave riscadas,
  «Assinar o termo de posse, no púlpito.» por riscar, a prova sem caixa com «hoje não: fica para
  a reabertura». Púlpito: lente `led-green`, «E · Segure E — Assinar: Termo de posse»; a tecla
  ganha `is-holding` com `--hold-seconds: 1.2s`; soltar a 0,6 s não assina e não grava; um toque
  curto pergunta «E · Assinar: Termo de posse · Esc · Cancelar», e `Esc` cancela; segurar assina
  a 1,198 s, numa escrita (`termsSigned`, a flag e o gatilho). O cartão «Termo de posse assinado»
  por 3,5 s, depois «JORGE · ALTO-FALANTE A lâmpada do púlpito acendeu e apagou: assinou. O
  acervo é seu, curador. Quase dez.» e «O livro que a seguradora quer tá na caixa-forte, e o
  subsolo alagou. Hoje não se desce. Câmbio.»; `sequencesSeen` gravado no fim. O Livro no púlpito,
  a lente apagada, «Púlpito — Termo de posse · assinado ✓»; a linha 7 riscada; «TERMOS ASSINADOS
  · Termo de posse · Assinado pelo curador.». Chamar o Jorge: «Posse assinada. Agora é conferir o
  acervo, peça por peça. A caixa-forte fica pra depois: o subsolo alagou.». Recarregar e
  continuar: 12 s sem fala, sem aviso e sem escrita; a porta do cofre desenhada aberta.
- **B, em inglês, sem rádio, sem caderno, sem lanterna.** *No power · Answering machine*; *Not
  charging · Porter's radio*; *E · Iron safe — needs a key*. As chamadas tocam só no escritório,
  pelo rádio da mesa (`porter-hello`, a do quadro, a do caderno, depois `porter-drawer-open` e
  `porter-safe-open`, e `porter-holyoke-lit` quando o jogador volta a ele); no saguão e na Ala 1,
  só os avisos de energia. *OTÁVIO · RECORDED
  MESSAGE*, as nove falas; nenhum aviso de lista (não há caderno), e o leitor diz *It will be
  filed in the curator's notebook, still on the office desk.* O ano digitado sem o retrato: *✓
  You took — Key to the iron safe*; *E · Unlock · Iron safe*. No saguão escuro: *Lectern — Sign:
  Deed of office · no light yet in: Atrium, Wing 1 · Holyoke*, lente vermelha, e segurar `E` não
  grava nada; aceso o saguão, *… no light yet in: Wing 1 · Holyoke*; acesa a Ala 1, lente verde e
  *E · Hold E — Sign: Deed of office*. Assinado a 1,2 s: *Deed of office signed*, *JORGE ·
  LOUDSPEAKER The lectern lamp came on and went out: you signed. The collection's yours, curator.
  Nearly ten.* Recarregado no meio da primeira fala (`termsSigned` no disco, `sequencesSeen`
  vazio): ao continuar, a sequência toca de novo do cartão até o fim e só então é gravada.
- **D, toque, 844 × 390, pelos direcionais e pelo botão de Ação.** Os dois direcionais andam e
  viram o jogador; o botão abre a porta do escritório e o leitor do cofre («Ler · Cofre de ferro
  ✓», sem a tecla). O leitor cabe nas três páginas (painel de 844 × 390, nada rola, «Voltar»,
  «Próximo» e «Fechar» à vista). A aba Caderno cabe (as cinco abas e «Fechar»), e **a lista rola
  dentro dela**: 560 de 297 px em pt-BR e 659 em inglês, com as sete linhas e os termos
  assinados (F1 já previa). No púlpito: «Segure Ação — Assinar: Termo de posse»; o botão segurado
  ganha `is-holding` com o anel de 1,2 s; meio caminho cancela; um toque troca o botão por
  «ASSINAR» e «CANCELAR», com «Cancelar» onde a Ação estava, e «Cancelar» cancela; segurar e
  arrastar o olhar para fora (1 rad em 0,6 s) cancela, e continuar segurando não assina; segurar
  até o fim assina, uma escrita. O cartão fica de 54 a 131 px e a legenda de 54 a 155, o prompt
  de 237 a 271: nada se cobre. Em inglês: *Lectern — Deed of office · signed ✓*, *DEEDS SIGNED ·
  Deed of office · Signed by the curator.*
- **E, saves.** `?qaSave=production-drawer-open` (no disco: sem lote, sem chave): ao continuar,
  **nenhum aviso**; o save carregado tem `tool:service-key`, `legacy-pre-L3-drawer`, o gatilho,
  `doc-predecessor` **e** `doc-otavio-handover`, lote 3. Ouve `porter-hello` (cinco falas), «Tem
  uma luz de recado piscando no ramal do escritório. Deve ser coisa do Otávio. Câmbio.» e «Olha
  de novo a gaveta do Otávio: o bilhete tinha uma chave presa. Câmbio.». O Arquivo mostra
  «Passagem de acervo — folha 1» uma vez, entre os papéis que o save já tinha. O recado é ouvido;
  «Destrancar · Cofre de ferro»; o cofre abre numa escrita; `porter-safe-open`; a Posse é
  assinada, e a primeira fala termina em «Passa das onze.» (nove marcos nesse save).
  `?qaSave=l2-shortcut-released` (no disco: lote 2, sem chave): ao continuar, nenhum aviso; a
  chave e a marca; as mesmas três chamadas na mesma ordem. Com `R` apertado a 1,2 s de cada
  fala, cada toque avança uma fala e nenhuma chamada de duas falas perde a segunda.
- Console: nenhum erro do jogo e nenhum aviso novo (só o `THREE.Clock` de sempre e as linhas do
  `[qaSave]`). Os erros no histórico são do Vite trocando módulos no meio de uma edição, antes
  do servidor ser reiniciado.
- **Não visto no navegador nesta fatia:** as rotas C (o cofre aberto no escuro; a Ala 1 acesa
  antes do saguão) e F (duas abas de verdade), que §14 deixa para o fecho; a Posse é provada nas
  duas situações por `test:playthrough` e `test:ending`, e as abas por `test:save`. O detalhe do
  retrato foi concedido pela função do próprio visor (`hotspotGrant`), não por um arrasto do
  ponteiro.

**O fecho herda.**

- As rotas C e F de §11, os dois saves do corpus, as capturas, o digest de `L3.graph.json` (o
  rascunho tem de ser refeito se qualquer conteúdo mudar na revisão), o HANDOFF §12 e o «Feito
  em».
- A lista do mapa continua dizendo «Cofre de ferro — precisa de chave» para quem já tem a chave
  e ainda não abriu o cofre. Lê-se como ponteiro; se a revisão achar que desmente o estado, a
  regra é a mesma do prompt (`lockBars`) e o lugar é `mapModel.ts`.
- Em 844 × 390 a lista do Caderno rola por quase duas telas. Cabe na regra de hoje (o corpo do
  caderno rola); se a revisão quiser a lista inteira à vista, é desenho da página, não dado.
- O estado mais cheio do escritório (63 e 71 draws) não está no registro, só descrito acima.
- `docs/HANDOFF.md` §2 («Bake atual») ainda cita `kit.6f5f4950.glb`, 2.938 KB e 151.652
  triângulos, e as contas de suítes de L2: o bake de hoje é `kit.143787a7.glb`, 2.959 KB e
  152.188. As fatias não escrevem o HANDOFF; é do §12 do fecho.

**Visto de passagem, sem conserto nesta fatia.**

- Uns nove segundos depois de a porta da Ala 1 ser aberta, R01 mede um draw e 60 triângulos a
  mais por menos de um segundo, do escritório, com só o escritório visível (63 por 62; 57 por
  56); R02, medido logo depois, não. Repetiu-se nas três sessões e some sozinho; o número
  gravado é o assentado. A causa não foi procurada: parece a folha de uma porta a fechar, que
  seria de L1. **[fecho: não é porta. É o ponteiro de segundos do relógio da parede, que entra
  no quadro de R01 por treze segundos de cada minuto; §16, item 7.]**
- R03 mede 88 · 70.776 enquanto a porta da Ala 1, do outro lado do saguão, ainda está aberta: é
  um par de salas, como R10, e não o ponto de porta fechada que a tabela pede.
- Com o painel oculto, entre duas chamadas do harness o jogo fica sem quadros, e o primeiro
  quadro depois da pausa conta até 0,25 s da espera de segurar (F4 já tinha visto): um ensaio que
  não aquece os quadros antes assina com um segundo de tecla. Num navegador de verdade os quadros
  são contínuos; as medidas de tempo acima são com os quadros aquecidos.

## 16. O fecho do lote (2026-10-05; passos 6 e 12 de §9.1)

Feito sobre `4c97f47`, num commit local só de testes, corpus, capturas e documentos. `npm run
check` (35 passos) e `npm run build` verdes. O registro para quem retoma está em
`docs/HANDOFF.md` §12; aqui fica o que saiu diferente do que §11 e §14 previam.

**Feito, na ordem de HANDOFF §11.10:** `npm run graph:snapshot` (o rascunho de F5 não mudou um
byte: 49 ações, 7 linhas, 71 ids, 21 campos; SHA-256 `ff85b1a9…29ed`, fixado em
`FROZEN_SNAPSHOTS` no mesmo commit do «Feito em»); os dois saves do lote no corpus; os dois
conjuntos de capturas, congelados com digest e citados quadro a quadro no HANDOFF; o «Feito em
2026-10-05» na seção L3 do plano mestre, **sem** a palavra «publicado»; o Anexo C com
`flag-never-set` e as três promessas datadas.

**O que saiu diferente.**

1. **Nenhum conserto de código.** O percurso completo (rotas A a F de §11, do título ao termo,
   mais os saves do corpus um a um) não mostrou defeito de runtime. `src/` só mudou em
   `src/content/saveFixtures.ts`, que não vai para o build.
2. **Os dois saves** são os que §14 previa, com um detalhe: `l3-new-game-safe-open` foi jogado
   **no toque** (844 × 390, pelos direcionais e pelo botão de Ação), com o caderno pego e o
   rádio na mesa. Faltam nele duas chamadas (`porter-atrium-service`,
   `porter-machine-reminder`) cujo momento passou fora do alcance do rádio da mesa: têm de
   continuar não ditas, e `test:qa-save` prende isso.
3. **Cinco casos de três suítes reprovaram quando os saves entraram** (`test:save` 63 de 66,
   `test:locks` 19 de 20, `test:triggers` 30 de 31): cada um afirmava, de todo save do corpus, o
   que só vale para os anteriores a L3 (os dois campos ausentes, a apresentação do Jorge devida,
   a marca da gaveta posta na carga, a chave por receber). É a lição de HANDOFF §11.10, que as
   fatias repetiram com as regras novas. Cada caso passou a perguntar `fixtureLot` e ganhou a
   outra metade (HANDOFF §12.5).
4. **`test:qa-save` ganhou uma regra que §9 não previa:** um save do lote é um estado a que o
   jogo chega. Para registros de L3 em diante, gatilho disparado, flag, relógio acertado, chave
   gasta, termo assinado, sequência vista e altura da dica são conferidos contra o conteúdo.
   Vermelho antes dos registros: «l3-posse-signed is gone from the corpus». Cinco mutações dos
   registros, todas pegas (HANDOFF §12.4).
5. **`test:ending` ganhou um caso** (23): os dois saves em abas vivas. O de por assinar, em três
   abas, é assinado numa e está nas outras depois de **uma** escrita; o assinado não deve nem
   grava nada ao continuar, e o púlpito recusa a pressão.
6. **Capturas: vinte e quatro, não doze.** §11 pedia oito no desktop e quatro no toque. Entraram
   também a lista em inglês, o pedido e a hora em inglês (de quem nunca pegou o rádio), o que o
   Jorge diz ao save de produção com a gaveta aberta, a lâmpada vermelha com a sala que falta, a
   lista depois da assinatura e, no toque, o leitor, as duas metades da lista e a segunda fala
   do fecho. Três coisas nos quadros são do harness e estão ditas no manifesto: o anel (animação
   de CSS, desenhado na meia volta), a lista rolada (o deslocamento aplicado à cópia do DOM) e o
   quadro da lâmpada vermelha, que é de outra noite (`l2-new-game-drawer-touched`).
7. **O draw a mais em R01 é o relógio.** O que F5 viu de passagem (§15.5) não é uma folha de
   porta: é o ponteiro de segundos do relógio da parede, na borda de cima do quadro de R01. Com
   o ponteiro entre 143° e 218° a malha entra no quadro: um draw e 60 triângulos, por 13,3 s de
   cada minuto. R02 vê o relógio inteiro e não oscila. Existe desde a rodada da abertura; P0, L1
   e L2 mediram com o ponteiro fora, sem saber. O `BROWSER_RECORD` não mudou de número e ganhou
   a nota.
8. **O estado mais cheio do escritório foi medido** (o item que §15.5 deixou descrito): jogo
   novo, três salas pelo store, rádio e caderno na mesa, gaveta e cofre abertos: 63 · 36.550 em
   R01 (64 · 36.610 com o ponteiro) e 71 · 38.370 em R02.
9. **Os dez pontos, medidos de novo, deram os números de F5**, em duas sessões de três passadas
   (jogo novo e `?qaSave=l3-posse-signed`), com 35 programas.
10. **A lâmpada do púlpito não se vê de onde se assina**: fica sob a aba do tampo, e a 1,25 m,
    de frente, o tampo a cobre. De dois metros ela aparece. O prompt diz o mesmo que ela; fica
    registrado para quem mexer no púlpito (L9).
11. **A lista rola também em 1280 × 720 depois da assinatura** (652 px em 587): «Termos
    assinados» entra embaixo dela. No toque já rolava (§15.5).
12. **Rotas C e F, que F5 não tinha visto.** C: o ano digitado antes de sair do escritório e o
    cofre aberto antes de qualquer quadro; no saguão escuro o púlpito nomeia as duas salas, e
    com a Ala 1 acesa antes do saguão nomeia só o saguão. F: duas abas de verdade; a que não
    assinou, oculta, recebe o termo, a flag, o gatilho e a sequência e não grava nada.
13. **Segurar leva mais de 1,2 s de relógio com quadros longos**, e é o desenho (DL3-10): cada
    quadro conta no máximo 0,25 s. Com o painel oculto e a GPU aquecendo, 2,3 a 2,6 s; com
    quadros aquecidos, 1,20 a 1,21 s.

**O que o fecho não fez:** os passos 5 (revisão adversarial), 8 a 11 (revisor, push, deploy,
fumaça) e 13 (playtest). Se a revisão mudar o grafo, `npm run graph:snapshot -- --reopen` e o
digest novo no mesmo commit; se mudar o que uma sala desenha, medir de novo.
