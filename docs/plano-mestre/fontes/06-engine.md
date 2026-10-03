# 06 — Motor: o que o runtime faz hoje × o que terminar o jogo exige

Repositório `Volleyball Museum`, `main` em `82756c4`, lido em modo somente leitura.
Base de desenho: `docs/PLANO-COMPLETO.md` (seis alas, sete códigos, distintivos,
medalhas, fios, mezanino, cofre, final), `docs/PLANO-DO-ZERO.md` (§6, §7.8, §7.9),
`docs/HANDOFF.md` (§2–§9.7) e `AGENTS.md` (regra 3: conteúdo é dado).

## 0. Como ler este relatório

- **Não executei o jogo, o bake nem o `check`.** Só leitura de código e quatro
  one-liners Node que apenas leem: contagem de numerais nos dois dicionários, soma
  do manifesto `bake.generated.ts`, gzip dos chunks já presentes em `dist/` e
  dimensões das imagens em `public/textures/media` (via `sharp.metadata`). Tudo que
  depende de ver a tela está marcado **[por leitura]** e pede confirmação visual.
- Referências são `arquivo:linha` do commit acima.
- **Tamanho:** P ≤ ~150 linhas (runtime + teste) · M 150–500 · G 500–1.200 ·
  GG > 1.200 ou muda o contrato bake + runtime + testes ao mesmo tempo.
- **Risco:** baixo / médio / alto, sempre com o motivo.
- Pacotes de trabalho são `M0…M30`; a ordem e as dependências estão em §5.
- Observação de ambiente: ao fim da leitura o `git status` mostrava cinco arquivos
  não rastreados em `docs/contact-sheets/wf3-a0*.jpg`. Não são meus (não escrevi
  nada no repositório); devem vir de outra frente deste mesmo fluxo.

---

## 1. Quadro geral

| # | Capacidade | Estado hoje | Tam. | Risco | Pacote |
|---|---|---|---|---|---|
| 1 | Trancas de conhecimento (teclado) | existe, presa a 4 dígitos e à Ala 1 | P | baixo | M6 |
| 2 | Trancas rituais (ordenar, casar, roda de contagem) | só o tipo no schema | G | médio | M6 |
| 3 | Trancas de distintivo e de ferramenta | só o tipo; hoje viram modal invisível | M | médio | M6 |
| 4 | `UnlockEffect` e quem executa | 4 variantes, executadas só no `useFrame` do exame, nenhuma em uso | M | médio | M5 |
| 5 | Credenciais no progresso e no diário | lista gravada, nunca lida nem mostrada | M | baixo | M7 |
| 6 | Fios e detecção de fechamento | etiquetas nas peças, zero leitor | P/M | baixo | M8 |
| 7 | Plinto das medalhas e soquetes | não existe (o centro do átrio é um console) | M | médio | M23 |
| 8 | Conteúdo de outras alas aceso por distintivo | não existe | M | médio | M19 |
| 9 | Reetiquetagem de proveniência (livro de tombo) | não existe | P/M | baixo | M24 |
| 10 | Assinar o livro de visitas, final e pós-jogo | não existe | M | médio | M25 |
| 11 | Luz geral do átrio | energia é binária por sala; emissivos ignoram a energia | M/G | médio | M17 |
| 12 | Escada/elevador, portais entre pisos | nada: casco, células, mapa e testes são de um piso só | GG | alto | M22 |
| 13 | LOD e streaming (≤ 3 salas residentes) | LOD existe; nada é descarregado | G | alto | M13 |
| 14 | Dois climas de luz numa sala | um rig e uma paleta por sala | M | médio | M17 |
| 15 | Subsolo alagado | nada (sem água, sem variação de casco, sem áudio de sala) | M | médio | M26 |
| 16 | Cinco salas a mais (bake, GLB, VRAM, bundle, warm-up, save, navegação, solvabilidade) | escala manual em ~10 lugares; vários tetos estouram | GG (soma) | alto | M3, M12–M16, M10 |
| 17 | Lint de exclusividade de numerais | não existe; três códigos já colidem | M | baixo | M11 |
| 18 | Listas datadas de resultados | não existe | P/M | baixo | M20 |
| 19 | Captura de fontes (`usedAsCode`, `accessedAt`) | campos existem; sem captura e com furo no validador | M | baixo | M11 |
| 20 | Rádio por etapa e paciência entre salas | motor pronto e genérico; condições e cobertura insuficientes | M | baixo | M9 |
| 21 | Acessibilidade e tiers de qualidade | ajustes no store sem tela; tier só mexe em DPR | M + M | baixo/médio | M27, M28 |
| 22 | Performance no celular | átrio 80 draws (alvo 45), texturas ~98 MiB após 3 salas | G | alto | M13, M14, M21 |

---

## 2. Achados que mudam o plano

Defeitos e desencontros encontrados durante a análise. Vários só mordem quando o
conteúdo crescer — por isso precisam entrar no plano antes da Ala 2.

**A1 · Tranca que não é de conhecimento vira modal invisível (alto).**
`LockPanel.tsx:107` devolve `null` para qualquer `lock.kind !== 'knowledge'`, mas
`Containers.tsx:276-280` e `PowerControls.tsx:213-219` chamam `setActiveLock` para
qualquer tranca. `isModalOpen` passa a valer (`store.ts:491-500`), o jogador congela
(`PlayerController.tsx:342-343`), mira e prompts somem (`Hud.tsx:717`) e nenhum
painel aparece; só E ou Esc saem (`Containers.tsx:253-256, 298-303`). Hoje não
acontece porque só existe `office-drawer`. A primeira gaveta de distintivo dispara.

**A2 · `Portal.lockId` e `DocumentData.lockId` não existem no runtime (alto).**
O runtime só lê `container.lockId` e `room.powerLockId`. O validador, porém, decide
alcance por `portal.lockId` (`validate.ts:453`) e leitura por `doc.lockId`
(`validate.ts:495`). Uma porta "trancada por três medalhas" passa no validador e
abre normalmente no jogo; um documento num container trancado sem `doc.lockId`
conta como lido pelo validador antes da tranca.

**A3 · `validateSolvability` não modela o que o runtime bloqueia (alto).**
- Ignora `oneWay`/`opensFrom` (`validate.ts:448-459`). O comentário diz que mão
  única é "a ausência do portal recíproco", mas o conteúdo declara os dois lados
  (`museum.ts:955-973` e `1244-1255`) e o runtime bloqueia pelo `opensFrom`
  (`transitionDoorTopology.ts:200-208`). A caminhada entra na Holyoke pelo atalho
  que o jogo mantém fechado; uma ala cujo outro acesso estivesse trancado sairia
  "alcançável".
- Ritual é sempre "aberto" (`validate.ts:418-420`).
- Credencial só nasce de `exhibit.unlocks` (`validate.ts:481-489`); o desenho
  concede medalhas ao abrir trancas e ao resolver um ritual.
- `open-lock`, `power-room` e `reveal-document` não são simulados.
- `lock-source-behind-lock` só olha portais (`validate.ts:553-555`): para a única
  tranca do jogo, que está num container, a regra é vazia.
- Ferramenta consumida (`consumesTool`, `schema.ts:176-177`) nunca sai do chaveiro
  simulado.

**A4 · Tranca de conhecimento pode apontar para fato não certificado (alto).**
`validateFacts` só examina fatos com `usedAsCode: true` (`validate.ts:262-263`) e
`validateReferences` só exige que o `factId` exista (`validate.ts:180-189`). Uma
tranca com `factId: 'first-rulebook'` (uma fonte, `usedAsCode: false`,
`museum.ts:68-82`) passa. Também não se compara `digits` com `fact.value.length`.

**A5 · Teclado preso a 4 dígitos, dica presa à Ala 1 (médio).**
`LockPanel.tsx:148` desenha `[0, 1, 2, 3]`; `lock.prompt` é "Quatro dígitos"
(`pt-BR.ts:104`); `lock.hint.source` é "Você viu isto em algum lugar da Ala 1."
para qualquer tranca (`pt-BR.ts:108`, usado em `LockPanel.tsx:183`); a terceira
dica revela `fact.value[0]` (`LockPanel.tsx:152-155`), que é metade de um código de
dois dígitos (`14`, `15`).

**A6 · O mapa lista todas as trancas fechadas, não as encontradas (médio).**
`MuseumMap.tsx:216-221` filtra só por `locksOpened`; o comentário logo acima
(`206-210`) promete "encontradas". Com 21 trancas, o primeiro Tab entrega a lista
inteira. Falta `progress.locksSeen`.

**A7 · Três dos sete códigos já colidem com texto publicado (alto, roteiro).**
Contagem por token numérico inteiro, idêntica em `pt-BR.ts` e `en.ts`:

| Código | Chaves que já o imprimem |
|---|---|
| `1896` | 5: `exhibit.handbook-1897.catalogue`, `exhibit.portrait-morgan.catalogue`, `hotspot.portrait-morgan.date.label`, `exhibit.photo-gym.catalogue`, `document.halstead.title` (`pt-BR.ts:335, 357, 359, 365, 374`) |
| `1998` | 2: `exhibit.atrium-ball-colour-1998.label` e `.catalogue` (`pt-BR.ts:290, 292`) — no átrio, alcançável no minuto dois |
| `15` | 1: `document.rule-changes.body`, "de 21 para 15 pontos" (`pt-BR.ts:380`) |
| `14`, `1962`, `1973`, `2002` | 0 |

`1896` é redundância deliberada (HANDOFF §9.1), mas viola a regra 1 do
PLANO-COMPLETO §4.2 como escrita. `1998` e `15` são colisões reais.

**A8 · A vitrine de bolas do átrio antecipa e duplica o fio `ball` (alto, roteiro).**
Quatro peças com `threads: ['ball']` no átrio (`museum.ts:173, 200, 227, 254`) mais
três na Holyoke (`293, 317, 406`) = sete nós em duas salas, contra "seis nós, um por
ala" (PLANO-COMPLETO §2.3). Três das quatro do átrio são as bolas-herói das Alas 3,
5 e 6 — a "maior ruptura visual da história do esporte" já está no saguão.

**A9 · Emissivos ignoram a energia (alto, átrio) [por leitura].**
`atrium-glow` tem `emissiveIntensity: 2.2` fixo (`scripts/bake/lib/glb.mjs:87`) e
nenhum código liga emissivo a `isRoomPowered` (as únicas ocorrências de `emissive`
no runtime são `materialSpec.ts:54-56` e `RoomWallArt.tsx:154-156`). Sancas do
forro, cabeças dos nove pendentes, recepção, pódio, torre e púlpito brilham com o
átrio "sem energia". Os quatro banners idem (`selfIllumination: 0.85`,
`museum.ts:1147, 1158, 1169, 1180`). Um forro que brilha a 8,39 m denuncia o
pé-direito que o final quer revelar "pela primeira vez".

**A10 · O plinto das três medalhas não existe (médio).**
O centro do átrio é `atrium-central-podium` (`museum.ts:989`), um console de
0,88 × 0,72 × 1,08 m com tampo inclinado (`atriumDecor.mjs:570`). A receita
`medallion-socket` é assada (`bake.mjs:658`) e não é colocada em lugar nenhum.
PLANO-COMPLETO §2.2 e o comentário em `museum.ts:975-986` dizem que "já está
construído". O anel de barreiras fecha o pódio (raio 1,70 m, oito segmentos de 45°,
`atriumFurnishings.mjs:140`, colisor em `bake.mjs:1123`): o jogador fica a ~2,0 m do
centro e a câmera a ~2,07 m do tampo, contra 2,6 m de alcance
(`interactionTarget.ts:25-30`) — passa, com folga pequena e só de frente.

**A11 · 12 receitas do kit são baixadas e nunca colocadas (médio).**
11.220 triângulos, 10,7% do kit: `plinth-tapered`, `medallion-socket`,
`label-plaque`, `vitrine-wall`, `partition`, `frame-empty`, `interp-panel`, `banner`,
`reception-desk`, `threshold`, `pendant`, `atrium-wall-bay`. Além disso, só os
mounts `floor` e `case-wall` estão em uso, então `plinth-block`, `vitrine-table`,
`vitrine-glass` e `vitrine-tower` também não aparecem. `validateBake` só avisa peça
ociosa em bundles `exhibits-*` (`validate.ts:1244-1263`).

**A12 · A paleta do casco é código morto (alto).**
`prepareRoomShells` devolve só `{ id, shell, portals }` (`kit.mjs:86-112`) e
`buildRoomShell` lê `room.palette` (`kit.mjs:344-345`), que chega `undefined`. O
manifesto confirma: `office__floor` e `holyoke__floor` são `maple-floor`,
`holyoke__ceiling` é `plaster`, os três lambris são `oak-matte`. O piso escuro da
Holyoke, o forro escuro e o walnut do escritório descritos em `kit.mjs:463-494` e
`RoomLighting.tsx:38-40` nunca chegaram ao GLB. O item "Paleta por ala" do HANDOFF
§7.3 não é falta de variação: é um bug.

**A13 · Texturas de mídia estão fora de qualquer orçamento (alto, celular).**
12 imagens = **54,7 MiB** de VRAM (RGBA8 + mips): murais do átrio 1024 × 1536 =
8,0 MiB cada; banners 512 × ~1.200 = 3,0–3,5 MiB cada; fotos da Holyoke até
6,7 MiB. O teto de 45 MiB (`bake.mjs:198`) só cobre os materiais (43,875 MiB).
Depois de visitar as três salas há ~98,6 MiB de textura residente. Orçamento
móvel: 45 MiB de textura, 110 MiB de VRAM total (PLANO-DO-ZERO §7.8).

**A14 · Nada é descarregado (alto).**
`unloadBundle` existe (`bundleCache.ts:26-28`) e ninguém chama. Toda sala visitada
fica montada "for the rest of the session" (`roomLod.ts:26-40`,
`MuseumScene.tsx:781-795`). A biblioteca de materiais carrega todas as texturas de
todas as alas antes do primeiro frame (`materials.ts:32-43, 55`).

**A15 · Todos os cascos numa única fronteira de Suspense (médio).**
`MuseumScene.tsx:998-1021`: o primeiro frame espera o GLB de casco de todas as
salas. O próprio código reconhece o risco em `MuseumScene.tsx:477-479`.

**A16 · Sala vista por portal sem porta aparece vazia (médio).**
`shouldRenderRoomDetail` só desenha o detalhe do vizinho atrás de uma porta aberta
(`roomLod.ts:67-74`, `MuseumScene.tsx:1000-1015`). Do mezanino, o átrio seria um
casco sem pódio nem móveis — o oposto de "ver o térreo inteiro de cima".

**A17 · Examinar segura qualquer peça a 0,42 m (médio, Holyoke).**
`Interaction.tsx:166, 331-334`. A rede de 4,8 m (`museum.ts:341-366`) e o manequim
de 1,3 m (`423-442`) são peças examináveis. Não há ajuste por tamanho nem rotação
por teclado (só arrasto, `Interaction.tsx:235-253`).

**A18 · Passos sempre "wood"; emissores de áudio sem leitor (médio).**
`PlayerController.tsx:496`; `RoomData.audio` (`schema.ts:810`) não é lido por
nenhum arquivo. Areia, concreto e água não têm como soar.

**A19 · O prédio só tem um piso (médio).**
`EraId` não tem mezanino (`schema.ts:357-366`). A altura do portal é ignorada em
`portalToWall` (`kit.mjs:170`), `portalCorners` (`portals.ts:86-87`),
`validatePortals` (`validate.ts:1382-1395`) e `portalWorld` do teste
(`test-navigation.ts:290-294`). Piso e forro são lajes inteiras
(`kit.mjs:385-399`). O mapa é um plano (`MuseumMap.tsx:56-76`). O teste reprova
qualquer descida abaixo de −0,35 m (`test-navigation.ts:45`).

**A20 · Save: versão nova descarta o progresso; campo novo em quatro lugares (médio).**
`store.ts:234`; `Progress` (`57-85`), `EMPTY_PROGRESS` (`164-180`), `emptyProgress`
(`183-200`), `LIST_FIELDS` + `migrateProgress` (`204-248`). Um jogo de 60–90 min
construído por fases não pode apagar o save a cada fase.

**A21 · Efeitos podem repetir (médio).**
`Interaction.tsx:386-396` reaplica `exhibit.unlocks` sempre que um hotspot novo é
visto com os obrigatórios completos — achar depois um hotspot opcional dispara tudo
de novo. Inofensivo hoje (efeitos idempotentes, nenhum em uso); deixa de ser com
consumo, toasts e chamadas de rádio.

**A22 · Não há tela de ajustes (médio).**
`Settings` guarda brilho, qualidade, velocidade, sensibilidades, head-bob, FOV e
legendas (`store.ts:35-55`); a única UI troca o idioma (`MuseumApp.tsx:103-115`).
`settings.subtitles` não é lido por ninguém. O brilho é "inegociável" no
PLANO-DO-ZERO §6.7.

**A23 · Duplicações e nomes fixos que quebram ao acrescentar sala (médio, soma).**
`MOUNTS` (`MuseumScene.tsx:203-211`) × `MOUNT_BASE_PART` (`validate.ts:981-989`);
altura 0,94 do vidro (`MuseumScene.tsx:257, 276`); largura da foto por
`aspect >= 1.6 ? 1.4 : 0.34` (`MuseumScene.tsx:358`); luminárias reconhecidas por
nome e a constante `1.2985` (`galleryLightRig.ts:28-29, 58-63`); só 3 dos 9
`PaletteId` têm paleta de luz, o resto cai na do átrio em silêncio
(`RoomLighting.tsx:34-68`); porta só `double-panel` de 1,6 m
(`transitionDoorTopology.ts:59-63`); `ROOM_ANCHORS`, `CROSSINGS` e
`reciprocalPairs.size === 3` (`test-navigation.ts:274-278, 368-409, 428`); tetos por
nome de sala (`test-kit-runtime.ts:267-302`); registro do kit à mão em
`bake.mjs:652-1086`, colisores em `1089-1126`, orçamentos em `1158-1166`, exhibits
em `277-404`, união `KitPartId` em `schema.ts:374-445`.

**A24 · Menores.**
- Fontes escritas à mão: três fatos apontam para
  `https://en.wikipedia.org/wiki/Volleyball` com títulos que não são dessa página
  (`museum.ts:74-113`) — contra a regra 4 do §4.2.
- SVG sem hash sob cache imutável de um ano: `office-blueprint.svg` e
  `atrium-orientation-wall.svg` (`media.authored.ts:55, 105`; `public/_headers`).
  Redesenhar a planta (mezanino, cofre) não chega a quem já visitou.
- 29 programas de shader medidos (HANDOFF §2) contra orçamento de 25
  (PLANO-DO-ZERO §7.8); não há portão.
- Os dois idiomas entram inteiros no caminho da tela de título (`i18n.ts:11-14`).
- `LockPanel` registra os documentos da gaveta aberta mas não os fatos
  (`LockPanel.tsx:121-123` × `Containers.tsx:283-286`).
- Nenhum validador de sobreposição de salas nem de item de parede sobre um vão.
- O terceiro item da lista do caderno nunca risca: `notebook.todo.vault` não tem
  `doneWhen` (`museum.ts:565`).

---

## 3. Capacidades, uma a uma

### 3.1 Tipos de tranca

**Hoje.** Cinco tipos no schema (`schema.ts:158-198`). Só `knowledge` tem runtime:
teclado em `ui/LockPanel.tsx`, aberto a partir de container
(`Containers.tsx:276-280`) ou do quadro de força (`PowerControls.tsx:213-219`). O
sucesso tem um caso especial que procura o container da tranca
(`LockPanel.tsx:112-126`). A escada de dicas existe (45 s, 90 s, 3 tentativas:
`LockPanel.tsx:136-139`) com os defeitos de A5. `ritual` carrega só
`puzzle: string` (`schema.ts:191-198`), sem dado nenhum. Portas só conhecem dois
bloqueios, `'other-side' | 'unpowered'` (`store.ts:330`,
`transitionDoorTopology.ts:200-208`, `Hud.tsx:151-160`). Conteúdo: uma tranca
(`museum.ts:132-147`).

**O desenho pede** (PLANO-COMPLETO §1, §5–§9): 6 de conhecimento (duas de dois
dígitos; `14` entra por uma roda de contagem, não por teclado), 5 rituais
(`order-delegations` com 14 itens, `kaizuka-motion-rail`, `ironsand-honours-rail`
de casar 3 × 3, `three-changes-1998` de casar 3 × 3, `order-ball-lineage` com 6),
4 de distintivo, 1 plinto de 3 medalhas, 3 de ferramenta.

**Generalizar** separando *interface* de *hospedeiro*:

- `src/engine/lockRules.ts` (puro): `lockStatus(lock, progress, content)` →
  `'open' | 'needs-input' | 'needs-credential' | 'credential-ready'`, e
  `attemptLock(lockId)` como **único** caminho de entrada para container, porta,
  quadro de força e plinto. Some o caso especial de `LockPanel.tsx:117-125`.
- Interfaces, todas DOM, operáveis por teclado e por toque:
  `keypad` (N dígitos, vindo de `digits`), `wheel` (roda de contagem; mesma regra
  do teclado, outra pele), `order` (lista reordenável), `match` (dois grupos,
  pares). Um `RitualPanel` genérico cobre `order` e `match`.
- Dado do ritual, no lugar de `puzzle: string`:
  `{ kind: 'order', items, solution }` · `{ kind: 'match', left, right, pairs }`,
  mais `evidence: { exhibitIds, documentIds }` — onde a resposta se aprende — para
  o validador provar que a evidência vem antes da tranca.
- `badge` e `tool` não abrem painel: E no hospedeiro abre se a credencial está na
  mão; senão o prompt nomeia o que falta e a tranca entra em `locksSeen`.
  `consumesTool` exige `consumeCredential` no store (hoje só há `grantCredential`,
  `store.ts:805-809`).
- Porta como hospedeiro: terceiro bloqueio `'locked'` com o id da tranca
  (`store.ts:330`), `Portal.lockId` lido em `buildTransitionDoorSpecs`, prompt em
  `Hud.tsx:142-171`, som em `TransitionDoors.tsx:359`.
- Escada de dicas por tranca: `hintKeys` próprios ou texto derivado de
  `sourceExhibitId` (sala + título da peça); para ritual, a última dica fixa um
  item no lugar. `t()` não interpola (`i18n.ts:17-21`): acrescentar um
  `format(texto, { n })` mínimo.
- `Lock.onOpen?: UnlockEffect[]` (ver 3.2).
- O ritual `three-changes-1998`, que o PLANO-COMPLETO §13.4 deixa "sem forma de
  interação", cabe em `match` sem código novo.

**Tamanho G · risco médio** (três interfaces novas sob a regra "um modal por vez" e
"um E, uma ação" de HANDOFF §9.1 e §9.7; a porta da doca do `crate-dolly` pede um
estilo novo de folha — recomendo reusar a porta dupla com barra e deixar a porta de
enrolar para polimento).

**Testes e validadores.** `test:locks` (máquina de estados de cada tipo, 2 e 4
dígitos, consumo, escada de dicas com relógio fixo, redutores de `order`/`match`).
Validador: `lock-without-host`, `lock-host-kind-unsupported`,
`lock-digits-mismatch`, `knowledge-lock-fact-not-code` (A4),
`ritual-solution-invalid`, `ritual-evidence-behind-lock`,
`document-lock-disagrees-with-container` (A2). Até M6 existir, o validador deve
**reprovar** qualquer tranca que não seja `knowledge` (fecha A1).

### 3.2 `UnlockEffect`: variantes e quem executa

**Hoje.** Quatro variantes (`schema.ts:200-204`), aplicadas por
`store.applyUnlockEffect` (`store.ts:851-867`) e chamadas num único lugar: o
`useFrame` do `ExamineView`, ao catalogar (`Interaction.tsx:386-396`). Nenhum
conteúdo usa `unlocks`. Como o executor vive no laço de render, nenhum teste
headless o alcança; e ele repete (A21).

**O desenho pede efeitos disparados por:** tranca aberta (medalhas `founding` e
`olympic`), ritual resolvido (`global`), peça catalogada (`sitting`), hotspot
achado (tampa de garrafa → `beach`), conjunto de peças catalogado (`indoor`: as
duas bolas e a rede), fio fechado, dois fios fechados (mezanino), três medalhas
assentadas (plinto gira, luz geral, escada), documento lido (livro de tombo),
livro assinado (final).

**Generalizar.**

- `MuseumContent.triggers: readonly Trigger[]`, com
  `Trigger = { id, when: ProgressCondition, effects: readonly UnlockEffect[] }`,
  disparado **uma vez** (`progress.triggersFired`).
- Executor único e puro: `dueTriggers(content, progress)` chamado dentro de
  `mutateProgress` (`store.ts:629-632`) até ponto fixo, com limite de passos. O
  mesmo código roda no jogo, nos testes e no validador. `ExamineView` deixa de
  aplicar efeitos; `exhibit.unlocks` e `Lock.onOpen` viram açúcar compilado em
  gatilhos.
- `ProgressCondition` v2 (`schema.ts:277-298`, `progressCondition.ts:14-83`):
  `catalogued`, `hotspotsSeen`, `credentials`, `credentialsMissing`,
  `threadsClosed`, `threadsClosedAtLeast`, `flags`, `flagsUnset`, `roomsVisited`,
  `socketsFilled`, `anyOf`. `ConditionProgress` ganha os campos correspondentes.
- Variantes novas: `set-flag` (bandeiras de história: `atrium-general-lights`,
  `vault-open`, `ledger-read`, `ending-signed`), `consume-credential`. As quatro
  atuais ficam.

**Tamanho M · risco médio** (ponto fixo e ordem; migração do save).

**Testes e validadores.** `test:triggers` (uma vez só, independência de ordem,
recarregar no meio, limite do ponto fixo). Validador: `checkCondition`
(`validate.ts:768-788`) estendido a todo campo novo; `trigger-never-fires` e
`flag-never-set` / `flag-never-read` saem da simulação de M10;
`effect-target-missing` para cada variante.

### 3.3 Credenciais no progresso e no diário

**Hoje.** `Progress.credentials: string[]` com chaves `kind:id`
(`store.ts:65, 805-809, 855`). Só é lido por `hasSavedProgress` e pela migração.
Sem toast, sem HUD, sem aba: o diário tem `map | catalogue | archive | credits`
(`store.ts:339`, `Journal.tsx:195-200`). Os quatro toasts existentes são
componentes sob medida (`Hud.tsx:391-559`).

**Generalizar.**

- `MuseumContent.credentials: CredentialData[]` — `{ kind, id, titleKey,
  descriptionKey, icon }`. Nome, descrição e ícone são dado.
- Objeto físico: `RoomData.pickups: PickupData[]` —
  `{ id, part, position, grants: Credential, when? }` — numa `PickupLayer` com a
  mira dos dispositivos. O objeto sai da cena ao ser pego, pelo mesmo padrão do
  caderno (`Containers.tsx:140-157`) e do rádio (`deviceNodes.ts`). Entra em
  `interactionWinner` como alvo de mesa (`interactionTarget.ts:71-96`).
- Aba **Coleção** no diário: quatro espaços de distintivo que aparecem todos ao
  pegar o primeiro ("ver o primeiro te informa que existem mais três"), três
  medalhas (na mão / assentada), ferramentas. Regras puras em `hudRules.ts`.
- Um `AcquisitionToast` dirigido por dado substitui os quatro sob medida.

**Tamanho M · risco baixo.**

**Testes e validadores.** Regras em `test:opening-flow` ou `test:inventory`
novo; ida e volta do save. Validador: `credential-orphan` vira erro
(`validate.ts:572-585` é aviso), `credential-unobtainable`, `credential-untitled`,
`pickup-part-not-baked`, `tool-consumed-twice` (uma ferramenta consumível tem
exatamente um consumidor, ou tantas concessões quantos consumidores).

### 3.4 Fios e fechamento

**Hoje.** `ThreadId` (`schema.ts:136`) e `ExhibitData.threads` (`schema.ts:260`);
nenhum leitor no runtime.

**Generalizar.** `MuseumContent.threads: ThreadData[]` —
`{ id, titleKey, summaryKey, nodes: readonly string[] }`, lista explícita e
ordenada de peças (a etiqueta solta `threads` na peça sai, ou passa a ser
conferida contra a lista). `threadProgress(thread, progress)` puro em
`src/engine/threads.ts`. Fechamento é condição (`threadsClosed`,
`threadsClosedAtLeast: 2` abre o mezanino). Aba **Fios** no diário: uma faixa por
fio, nós em silhueta até catalogados.

Decisão de conteúdo que o motor não resolve: A8. Ou a vitrine do átrio sai do fio,
ou vira o lugar do ritual `order-ball-lineage` e se enche conforme cada ala é
catalogada (precisa de 3.6).

**Tamanho P/M · risco baixo.**

**Validadores.** `thread-single-room` como **erro** (é o portão da Fase D: "se der
para fechar um fio numa sala, o fio está mal distribuído"), `thread-node-missing`,
`thread-too-short`, `ball-thread-one-node-per-wing`.

### 3.5 Plinto das medalhas e soquetes

**Hoje.** Não existe (A10). `Lock.kind: 'medallion-plinth'` (`schema.ts:166-171`)
não tem runtime.

**Generalizar.** Dispositivo novo em `DeviceData` (`schema.ts:731-760`):
`kind: 'socket-host'` com `lockId` e `sockets: [{ medallion, node }]`. Contrato
por nome de nó, como relógio e rádio: `<part>__socket-<id>` e
`<part>__medallion-<id>`, exigidos em `validateBake` (`validate.ts:1122-1136`).
E no plinto assenta uma medalha por toque, com som; o prompt diz o que falta e
alimenta `locksSeen`. `progress.socketsFilled`. Com as três, a tranca abre e os
gatilhos fazem o resto (girar: animação de um nó `__turntable`; luz geral; porta
da escada). As medalhas ainda não assentadas ficam montadas fora de vista, nunca
com `visible = false` (lição do HANDOFF §4.5: o aquecimento de GPU não vê o que
está invisível).

A geometria é trabalho de asset (o console atual não tem onde encaixar nada); o
anel de barreiras precisa de um teste de alcance.

**Tamanho M · risco médio** (é o maior momento do jogo; animação e som não se
validam sem ver).

**Testes.** `test:plinth` (ordem, parcial, recarregar com duas assentadas,
idempotência); alcance do plinto de fora do anel em M15; nós em `validateBake`.

### 3.6 Conteúdo de outras alas aceso por distintivo

**Hoje.** Nada. Toda peça, container e placa existe desde o primeiro frame.

**O desenho pede.** O distintivo abre uma gaveta do armário do registrador no
escritório e "acende conteúdo novo" em outras alas (PLANO-COMPLETO §2.1); o portão
da Fase B é isso ser visível.

**Generalizar.**

- Gavetas trancadas por distintivo: é só `Lock.kind: 'badge'` num container (M6).
- **Armário de quatro gavetas:** hoje um container é um móvel e um volume de mira
  fixo à altura do peito (`Containers.tsx:178-181`). Quatro gavetas pedem
  `ContainerData.drawers: [{ id, lockId, titleKey, node }]` com volume de mira por
  nó assado. O escritório está no teto de lotes e triângulos (53 e 36 mil,
  `test-kit-runtime.ts:289-302`): o armário novo precisa pagar com algo.
- **Conteúdo condicional:** `availableWhen?: ProgressCondition` em peça,
  container, pickup, arte de parede e placa, com apresentação "coberta" enquanto
  indisponível (pano, vitrine apagada). Peças e containers já são clones
  individuais; o kit estático instanciado não entra nisso.
- Efeitos colaterais a definir de uma vez: `allCatalogued`
  (`progressCondition.ts:76-81`) conta peça indisponível? Os pontos do mapa
  (`MuseumMap.tsx:139-154`) escondem? O teto de 8 etiquetas por sala
  (`validate.ts:943-952`) conta?

**Tamanho M · risco médio** (toca mira, mapa, catálogo e solvabilidade).

**Validadores.** `badge-opens-nothing-elsewhere` (cada distintivo libera ao menos
um conteúdo numa sala diferente de onde foi ganho — o portão da Fase B em forma de
regra), `available-condition-unsatisfiable`, peça condicional com peça coberta
assada.

### 3.7 Reetiquetagem de proveniência (o livro de tombo)

**Hoje.** Nada. A proveniência vive em prosa nas fichas ("Reprodução",
"Fac-símile", "Reconstrução tipológica": `pt-BR.ts:272, 312, 335, 351`).

**Generalizar.** `ExhibitData.provenance: 'original' | 'period-reconstruction' |
'facsimile' | 'typological-reconstruction'`, obrigatório. O livro é um documento
com página de estilo `ledger`, cuja tabela é **gerada das peças**, não escrita no
dicionário. A aba Catálogo (`Journal.tsx:31-56`) mostra carimbo e contagem só
depois da condição `documentsRead: ['doc-accession-ledger']`.

Nota de roteiro: como as fichas já declaram a proveniência peça por peça, o final
não revela informação nova — soma e carimba. É coerente com "o museu sempre
soube", mas o plano de história precisa saber.

**Tamanho P/M · risco baixo.**

**Validadores.** `exhibit-without-provenance`; lint opcional que confere a prosa
da ficha contra o campo (uma ficha que diz "fac-símile" numa peça marcada
`original`).

### 3.8 Livro de visitas, final e pós-jogo

**Hoje.** Nada. O store já antecipa o livro como *vista* do save
(`store.ts:556-559`).

**Generalizar.** Container com `presentation: 'guest-book'`: mostra um resumo
derivado do progresso e um botão **Assinar**. Assinar dispara `set-flag
ending-signed`. O "cofre reabre no átrio" é um gatilho; o jogo continua (sem
créditos rolando).

**Recomendo assinar sem texto livre.** Todo handler de E escuta no `window` e não
olha o alvo do evento (`primaryAction.ts:52-54`); E fecha o painel aberto
(`Containers.tsx:238-251`), Tab é capturado (`Journal.tsx:169-178`), R chama o
rádio. Digitar um nome com "e" fecharia o livro. Corrigir isso é possível
(`isTextEntryTarget` já existe em `flashlightRig.ts:72`, usado só pelo R), mas
texto livre também traz teclado virtual no celular e dado pessoal no save. Um
gesto ("segure E para assinar") entrega o mesmo momento.

Para o pós-jogo falta um comando de engine que hoje só existe em desenvolvimento:
`__museumTeleport` (`PlayerController.tsx:264-276`). Promover a
`relocatePlayer(posição, direção)` com espera de piso, mais `RoomData.entry`
(ponto de entrada testado por sala). Serve ao final, à queda (hoje a recuperação
manda para o escritório: `PlayerController.tsx:469-473`) e a um "Continuar" na
última sala (hoje toda sessão começa no escritório: `store.ts:877-884`).

**Tamanho M · risco médio.**

**Testes.** `test:ending` (assinar é idempotente; recarregar antes e depois; os
três itens da lista do caderno riscam); validador `entry-outside-room`, como o de
spawn (`validate.ts:746-762`).

### 3.9 Luz geral do átrio

**Hoje.** Energia binária por sala (`power.ts:10-15`, `progress.roomsPowered`). O
rig do átrio são 5 pendentes com alvo (`museum.ts:1067-1074`) + 1 lavagem a 8,0 m
com intensidade 54 (`galleryLightRig.ts:76-91`, `RoomLighting.tsx:47-56`). Ou
seja: hoje o quadro do átrio já acende tudo. O pool é fixo — 8 spots, 2 points, 1
lanterna — exatamente para não recompilar shaders
(`galleryLightRig.ts:3-5`, HANDOFF §4.5).

**Generalizar.** `RoomData.lightingStages: LightingStage[]`, cada uma com
`when: ProgressCondition` e escalas (`keyScale`, `washScale`, `emissiveScale`,
`environmentScale`, alvo da lavagem); vale a última que casa.
`lightingStageFor(room, progress)` puro. No átrio: *serviço* (`powered:
['atrium']`: pendentes a meia força, lavagem curta apontada ao piso, emissivos
baixos) e *geral* (`flags: ['atrium-general-lights']`: tudo, mais uma lavagem
reapontada para o forro). **O número de luzes não muda entre etapas** — só
parâmetros — então é de fato "uma variável booleana" em custo de GPU.

**Emissivo ciente de energia** (fecha A9): materiais emissivos da biblioteca são
instâncias únicas compartilhadas por todas as salas (`materials.ts:87-103`,
`kitPart.ts:80-86`). Criar uma vista por sala (`materialsForRoom`) que clona só os
emissivos e dirige `emissiveIntensity` pela etapa; o clone compartilha o programa.
`RoomWallArt.tsx:154-156` multiplica `selfIllumination` pela mesma escala.

Isto muda o comportamento atual do átrio (quadro = luz de serviço). É a ideia já
aprovada no HANDOFF §7.5; vale confirmar.

**Tamanho M · risco médio** (afinação só se julga em captura).

**Testes.** `test:power` estendido: resolução de etapa; **contagem de slots
invariável entre etapas**; irradiância analítica no forro abaixo de um limiar na
etapa de serviço e acima na geral (a partir de cone, alvo, alcance e decaimento —
o mesmo tipo de conta de `flashlightReaches`, `flashlightRig.ts:51-54`);
emissivo zero em sala sem energia. Duas capturas de referência.

### 3.10 Escada ou elevador, portais entre pisos, mapa

**Hoje.** Um piso só (A19). Física: cápsula contra BVH, degrau automático de
0,22 m (`collision.ts:61`), rampa andável até ~48° (`collision.ts:59`), e uma
velocidade de aderência de 1 m/s (`collision.ts:85`). `test-collision.ts:53-63`
tem uma rampa de 20°, só de subida.

**O que quebra numa descida [por leitura].** A 3,4 m/s (`PlayerController.tsx:36`),
uma escada de 32° exige 2,1 m/s de queda; com 1 m/s de aderência a cápsula perde o
apoio, a gravidade a alcança alguns frames depois e a câmera desce aos solavancos.
Subir degraus reais de 0,17 m deve funcionar pelo degrau automático, mas cada
degrau custa três resoluções e dá um tranco de 0,17 m na câmera. Nenhum dos dois
casos tem teste hoje.

**Recomendo a sala-escada, com elevador como plano B.**

1. A escada é uma **sala** própria (célula) ligada ao átrio por uma porta comum no
   térreo e ao cofre (ou ao mezanino) por outra porta no outro nível. A porta
   esconde o carregamento, como já faz hoje.
2. O casco dessa sala tem piso em degraus **visuais** e um colisor de **rampa**
   invisível por baixo; os degraus não colidem.
3. `movePlayer` ganha "grudar no chão": se estava apoiado e há piso até um degrau
   abaixo, desce junto.
4. Se a escada reprovar no portão, troca-se o piso da sala por uma cabine com
   botão (dispositivo `lift` que usa `relocatePlayer` com as portas fechadas). O
   conteúdo em volta não muda.

**Pontos de código.**

- `schema.ts`: `EraId` com mezanino e salas-escada; `RoomData.level`;
  `shell.floor: { kind: 'flat' } | { kind: 'stair', … }`; `Portal.position[1]`
  honrado; `Portal.sill` e `Portal.passable: false` para o vão do mezanino sobre o
  átrio (visível, não atravessável, com balaustrada colidível).
- Bake: `portalToWall` (`kit.mjs:167-194`), `buildWall` (`kit.mjs:203-331`, hoje só
  verga acima do vão) e `wallSegments` (`geometry.mjs:325`) para vão com peitoril
  e em qualquer altura; gerador de casco de escada; parte "só colisão" no
  manifesto (hoje todo colisor do kit é caixa: `bake.mjs:246-252, 1253-1257`).
- Células: `portalCorners` (`portals.ts:76-104`) com a altura do portal; `roomAt`
  (`portals.ts:110-115`) escolhe, entre as células que contêm o ponto, a de piso
  mais próximo abaixo. Profundidade 2 do passeio de portais
  (`MuseumScene.tsx:693`) basta para átrio → escada → cofre.
- **Vizinho sem porta com detalhe** (A16): tier novo "detalhe distante" para a sala
  vista por um vão aberto — só as colocações marcadas `lod: 'far'` (pódio, anel,
  recepção, sofás). Sem isso o átrio visto de cima é um casco vazio; com detalhe
  completo, átrio (80 draws) + mezanino estouram o teto móvel de 100.
- Mapa: `RoomData.level` e seletor de piso em `MuseumMap.tsx:56-76`.
- Validadores: `validatePortals` em 3D (`validate.ts:1360-1423`); `room-overlap`
  por nível.
- Teste: `walk` e `FALL_LIMIT` por rota (`test-navigation.ts:45, 331-356`).
- `FALL_LIMIT` do jogo é −8 (`PlayerController.tsx:51`): o cofre precisa ficar
  acima disso ou o limite vira dado da sala.

**Tamanho GG · risco alto.** É o item mais caro do motor e o menos verificável sem
ver: geometria de casco nova, física nova, células em 3D, mapa, testes. O elevador
sozinho seria M/médio.

**Testes.** `test:collision`: subir e descer rampa de 30–35° com erro vertical por
passo abaixo de um limiar e `grounded` contínuo. `test:navigation`: átrio → escada
→ cofre → átrio e átrio → mezanino, com a cota final conferida; a cápsula **não**
atravessa a balaustrada do mezanino. `test:room-lod`: tier distante.
`validateBake`: nó de rampa presente em toda sala-escada.

### 3.11 LOD e streaming com no máximo três salas residentes

**Hoje.** O LOD funciona e é bem testado (`roomLod.ts`, `test-room-lod.ts`, 23
checagens): célula atual com detalhe, vizinho por portal como casco, vizinho por
porta aberta com detalhe, aquecimento de GPU antes de abrir (`gpuWarmup.ts`). O
que falta é a outra metade: descarregar (A14), não bloquear o primeiro frame no
prédio inteiro (A15) e orçar texturas por sala (A13).

**Generalizar.**

- **Cascos:** uma fronteira de Suspense por sala e prioridade por distância no
  grafo (sala do spawn, depois vizinhas, depois o resto em ociosidade). Manter
  todos os cascos residentes é barato (4,6–10,8 mil triângulos, 78–157 KB cada) e
  preserva "colisão segura tudo" (`MuseumScene.tsx:873-879`).
- **Detalhe:** política pura `residentDetailRooms(atual, anterior, vizinhasDePorta,
  ordemDeVisita, máximo = 3)`; despejar = desmontar `CachedRoomDetail`, liberar
  buffers de instância (`kitPart.ts:156-160`), texturas de parede da sala e o
  bundle de exhibits (`unloadBundle`). A volta é mascarada pela porta, que já
  espera a prontidão.
- **Texturas de material por sala:** o bake sabe que materiais cada sala usa.
  Núcleo sempre residente (hoje `maple-floor`, `plaster`, `oak-matte`, `canvas` =
  24 MiB) e o resto por sala, com o aquecimento de GPU cobrindo a carga. O teto
  deixa de ser "45 MiB no prédio" e passa a "X MiB para qualquer trio de salas
  conectadas".
- **Mídia:** teto por sala e por imagem no bake/`media:fetch`.
- Histerese no aquecimento por proximidade (`warmDistance` 3,5–5 m,
  `museum.ts:921-972`): com oito portas no átrio e teto de três salas, aquecer e
  despejar pode entrar em gangorra.

**Tamanho G · risco alto** (o descarte é a causa clássica de "fica mais lento a
cada volta"; mexer nos donos de recursos já custou caro — ver as lições do HANDOFF
§6 sobre clones de GLTF).

**Testes.** `test:room-lod` com a política de residência (nunca mais de três;
nunca despeja a atual nem a vizinha de porta aberta; sem gangorra numa volta pelo
átrio). `test:materials`: VRAM por trio de salas. Medida manual obrigatória:
`renderer.info.memory` volta à linha de base depois de ida e volta (PLANO-DO-ZERO
§7.9) — expor no `__museumPerf()`.

### 3.12 Dois climas de luz numa sala (Ala 4)

**Hoje.** Uma paleta e um rig por sala: até 5 chaves escolhidas por amostragem
uniforme + 1 lavagem central (`galleryLightRig.ts:67-102`). Piso é uma laje de um
material (`kit.mjs:385-391`). Ambiente (PMREM) e névoa são globais
(`MuseumScene.tsx:721-770, 984`).

**Generalizar.** `RoomData.lightZones: [{ id, palette, bounds, wash }]`. O rig
reparte os seis slots por zona (por exemplo 2 chaves + 1 lavagem cada), em vez de
amostrar a sala inteira. Total de luzes inalterado. O piso de areia entra como
peça de kit sobre a laje (como `gym-court-lines` e `atrium-floor-inlay` já
fazem). "Iluminado como dia" sem sombras pede um painel de céu emissivo no forro
da metade da praia.

Alternativa mais barata, se a divisão da sala for uma parede com vão largo: duas
`RoomData` unidas por um portal sem porta, cada uma com sua paleta. Aí o custo é o
de A16 (o vizinho sem porta precisa de detalhe) e o pool reserva só 2 slots para
a sala retida (`galleryLightRig.ts:4-5`) — precisaria de divisão 4 + 4 por dado.

**Tamanho M · risco médio** (afinação visual; cabe em M17).

**Testes.** `test:power` ou `test:lighting`: toda zona tem ao menos uma chave e
uma lavagem; soma de slots = 6; nenhum alvo fora da zona. Captura de referência
dos dois lados.

### 3.13 Subsolo alagado

**Hoje.** Nada: o casco só sabe fazer sala nobre (rodapé, lambri, sanca), não há
material de água, áudio de sala não é lido, passos são sempre madeira.

**Generalizar, sem shader próprio.**

- `shell.style: 'gallery' | 'service'` — concreto, sem lambri nem sanca; dado que
  o bake lê (junto com M1).
- Água: plano como peça de kit **sem colisor**, material padrão transparente de
  rugosidade baixa, com `scroll: [u, v]` no spec (animação por `texture.offset`,
  só uniform). O reflexo do facho da lanterna é o efeito, e é de graça. **Proibir
  `transmission`**: custa um passe extra da cena.
- Paredes molhadas: chave nova nos mapas de `plaster`, com `roughnessScale` baixo
  e tint escuro — zero VRAM, mesmo programa.
- Superfície de passo `water` e emissor de goteira (M18). Névoa por sala.

**Tamanho M · risco médio** (mais um ou dois programas num orçamento já estourado
— A24).

**Testes.** `test:materials`: nenhuma chave com `transmission`; contagem de
assinaturas de programa (3.14). Navegação: o plano de água não segura a cápsula.

### 3.14 Cinco salas a mais (na prática, oito: 5 alas, mezanino, cofre, escadas)

#### (a) O que um autor toca hoje para acrescentar uma ala

O portão da Fase A ("editar `museum.ts` e rodar `npm run bake`, sem escrever
React") é cumprido para React e não para o resto:

1. `schema.ts`: `KitPartId` a cada receita nova (`374-445`).
2. `museum.ts` e os dois dicionários.
3. `bake.mjs`: imports (`29-126`), `kitParts` (`652-1086`), `kitColliderParts`
   (`1089-1126`), conjuntos de orçamento (`1158-1166`), `MATERIAL_TEXTURES`
   (`140-195`), `EXHIBIT_RECIPES` (`277-404`).
4. `glb.mjs` (`MATERIALS`) e `materials.mjs` (receitas e a tabela de VRAM).
5. `RoomLighting.tsx:34-66` (paleta de luz) — um componente React.
6. `kit.mjs:344-345, 463-494` (materiais do casco, mortos: A12).
7. Testes: `test-navigation.ts:274-278, 368-409, 428`;
   `test-kit-placement.mjs:189`; `test-kit-runtime.ts:267-302`; e dezenas de ids
   de sala literais nas outras suítes.
8. Átrio: tirar `atrium-wall-bay-plain` de onde a porta nova abre
   (`museum.ts:1041-1058`), sem validador que acuse a sobreposição.

**Generalizar (M1 + M3):** paletas e acabamentos num módulo de dado lido pelo bake
e pelo runtime; cada arquivo de `scripts/bake/parts/` exporta um registro de
receitas (`{ id, build, materials, primary, collider, budget, floorStanding }`) e o
`bake.mjs` só itera; `KitPartId` sai do manifesto gerado. Tamanho M + M, risco
médio (muda os GLBs de casco — as três salas precisam de captura nova).

#### (b) Bake, GLB e triângulos

| | Hoje (medido) | Projeção sem mudar nada | Com M3 + M12 |
|---|---|---|---|
| GLB total | 3.016 KB, 152 mil triângulos | ~8,4 MB, ~430 mil triângulos | igual |
| Kit | um arquivo, 2.242 KB, 105 mil triângulos, baixado antes do 1º frame | ~4,9 MB antes do 1º frame | núcleo ~0,8 MB + ≤ ~0,6 MB por sala |
| Casco por sala | 78–157 KB | idem | idem |
| Exhibits por sala | Holyoke 362 KB / 8 peças | ~370 KB por ala | idem |
| Tempo de bake | ~18 s (AGENTS.md) | ~45–60 s | ~10 s incremental com cache por receita |

Hipóteses da projeção: por ala nova, casco de 6 mil triângulos, 20 mil de kit
próprio e 8 peças de 2,5 mil; densidades medidas de 21,3 B/triângulo no kit, 18,5
nos exhibits, 15,6 nos cascos. O kit hoje divide-se em escritório 30,2 mil, átrio
30,1 mil, Holyoke 8,4 mil e compartilhado 36,6 mil (dos quais 11,2 mil ociosos).
O teto do plano é "GLB por sala ≤ 1,5 MB" (PLANO-DO-ZERO §7.8): o kit monolítico
o estoura na Ala 2.

**M12 — kit por sala.** O bake decide sozinho: receita usada por uma sala vai
para `kit-<sala>`, por duas ou mais para `kit-core`. No runtime some a suposição
de um único `KIT_BUNDLE` (`MuseumScene.tsx:103-104`, passado a `ContainerLayer`,
`PowerControlLayer`, `DeviceLayer`, `KitLayer`, `RoomSignage`,
`TransitionDoorLayer`) em favor de um resolvedor "receita → bundle". Tamanho G,
risco alto (toca todas as camadas, o aquecimento de GPU e três suítes).

**Cache de bake por receita** (hash do arquivo-fonte + lib): previsto em
PLANO-DO-ZERO §8, não implementado — `bakeBundle` só evita regravar bytes iguais
(`bake.mjs:424-446`). Tamanho M, risco baixo; vale pelo ciclo de polimento visual.

#### (c) VRAM de textura

| | Hoje | Sem gestão, jogo inteiro | Com residência + teto de mídia |
|---|---|---|---|
| Materiais | 43,875 MiB, tudo residente | ~95 MiB | núcleo 24 + ≤ 8 por sala |
| Mídia de parede | 54,7 MiB após 3 salas, sem teto | ~190 MiB | ≤ 12 por sala |
| Total residente | ~98,6 MiB | ~275 MiB (a aba morre no iOS) | ~84 MiB no pior trio |

KTX2 (ETC1S + UASTC para normal) cortaria tudo de 4 a 8 vezes e está adiado por
custar ~260 KB de transcoder (`materials.mjs:35-37`). Recomendo residência e teto
de mídia primeiro (obrigatórios de qualquer jeito) e KTX2 só se o pior trio não
couber em 45 MiB (M30).

#### (d) Bundle

Medido em `dist/assets` (gzip nível 9):

| Caminho | Hoje | Projeção |
|---|---|---|
| Antes do clique | ~90–95 KB (`index` 59,9 + `i18n` 19,6 + restos) | ~185 KB — o dicionário sextuplica (252 chaves, 2.802 palavras hoje) e os dois idiomas vêm juntos |
| Depois do clique | ~385 KB (`playerPosition` 182,9 + `MuseumCanvas` 184,5 + restos) + 170 KB de fontes | ~465–580 KB (manifesto 147 KB → ~450 KB brutos; `museum.ts` 53 KB → ~300 KB) |
| Orçamento | 250 / 600 KB | — |

**M16:** dicionário em duas camadas (interface, carregada com o título; conteúdo,
com o canvas) e um idioma por vez, mantendo `en` tipado contra `pt-BR`; manifesto
de runtime enxuto (nome, colisor, material), com o manifesto completo só para os
portões em Node. Tamanho P/M, risco baixo. Sem chunking manual (regra 7 do
AGENTS.md): só fronteiras de `lazy()`/`import()`.

#### (e) Aquecimento de GPU e programas

A barreira por sala já cobre casco, kit, exhibits, placas, texto e arte de parede
(`MuseumScene.tsx:557-589`). Com texturas por sala, o primeiro acesso a cada ala
envia mais dados atrás da porta fechada: medir o tempo de "Preparando a próxima
sala…" num celular. Programas: 29 medidos contra 25. Cada combinação nova de
recursos de material (transparente, emissivo, sheen, clearcoat) custa um programa,
dobrado se também aparece instanciada. **Portão novo (M14):** contar assinaturas
de programa a partir de `BAKED_MATERIALS` × uso instanciado ou não, e travar o
número.

#### (f) Save

Tamanho não é problema: ~1–2 KB hoje, ~12–15 KB no jogo inteiro (56 peças, ~170
hotspots, ~80 documentos, gatilhos, bandeiras). O problema é a política (A20).
**M2:** uma tabela de campos (tipo, padrão, sanitizador) da qual saem `Progress`
vazio, `LIST_FIELDS` e a migração; migradores por versão em vez de descarte;
`SAVE_ALIASES` para ids renomeados (o cabeçalho do store promete sobreviver a
renomeações, `store.ts:11-12`, mas um id renomeado simplesmente perde o
progresso). Tamanho P/M, risco médio.

#### (g) Teste de navegação

Hoje: cinco travessias escritas à mão com pontos de passagem
(`test-navigation.ts:368-409`), âncoras por sala (`274-278`), e uma única rota de
alcance, a do escritório (`614-621`). **M15:**

- travessias derivadas de todo par de portais (âncora → 1,5 m antes do vão →
  1,5 m depois → âncora), com âncora por dado (`RoomData.entry`) ou achada por
  busca;
- **alcance por inundação:** grade de ~0,25 m no piso de cada sala, expansão com a
  cápsula real, e a prova de que **todo interativo** (peça, container, gaveta,
  dispositivo, quadro, pickup, plinto, porta) tem um ponto de pé conectado à
  entrada da sala e dentro do alcance do seu raio (`INTERACTION_REACH`). É a
  prova mecânica de "100% jogável" no espaço;
- a folga de 1,5 m diante de cada porta, hoje só para o átrio
  (`test-navigation.ts:501-514`), para toda sala.

Tamanho M/G, risco médio (tempo de execução e falsos positivos em cantos).

#### (h) Solvabilidade do grafo inteiro

**M10:** reescrever `validateSolvability` como `simulateProgress(content)`, uma
jogadora exaustiva que usa **as mesmas funções puras do runtime** (M5, M6, M8,
bloqueio de portas, etapas de energia) até o ponto fixo, registrando em que passo
cada sala, tranca, credencial, fio, gatilho e chamada de rádio fica disponível.
Saídas:

- erros: sala, tranca, peça, documento ou final inalcançável; credencial órfã ou
  inobtenível; ferramenta consumida que deixa outra tranca sem chave; evidência de
  uma tranca só alcançável depois dela — para **todo** hospedeiro, não só portais
  (A3); gatilho que nunca dispara; bandeira nunca lida;
- o **roteiro em níveis de dependência**, impresso: é a checagem mecânica de "uma
  ação se conecta na outra";
- **cobertura de dicas:** para cada estado da fronteira há uma dica do rádio cujo
  `when` vale enquanto aquela ação está pendente.

E um **bot de partida** no nível do store (`test:playthrough`), no molde de
`test-opening-flow.ts`: executa o roteiro contra o store real em Node, termina com
`ending-signed`, e repete com a ordem das ações embaralhada (algumas centenas de
sementes) para achar defeito dependente de ordem — ler o livro de tombo antes de
catalogar, assentar medalhas antes dos distintivos, chamadas de rádio na fila.

Tamanho G, risco médio.

### 3.15 Lint de exclusividade de numerais

**Hoje.** Não existe. `validateTranslations` só confere que as chaves existem
(`validate.ts:1436-1480`). Três códigos já colidem (A7).

**Generalizar.** `Fact.printedIn: readonly string[]` — as chaves autorizadas a
imprimir o numeral. O lint tokeniza sequências máximas de dígitos em **todo**
texto que o jogador lê e reprova o token igual a um código fora da lista
autorizada, nos dois idiomas. A regra "exatamente uma" vira `printedIn.length
=== 1` por padrão, com exceção declarada (o `1896`).

"Todo texto" precisa incluir o que não está no dicionário: listas datadas (um
"2002" numa tabela de pódios da Ala 6 colide com o código do baú), SVGs autorais
(a planta do escritório), números modelados em geometria (o `15` da camisa) e os
rótulos dos rituais (`order-ball-lineage` exige zero algarismo). Tokenizar por
palavra, não por substring: "1895–1915" não contém `15`.

**Tamanho M · risco baixo.** Roda no `validate:content`.

**Testes.** O próprio lint tem teste com casos sintéticos (substring, intervalo
com travessão, número por extenso, idioma divergente).

### 3.16 Listas datadas de resultados

**Hoje.** Nada. Todo texto de parede é chave de i18n.

**Generalizar.** `MuseumContent.datedLists: [{ id, asOf, titleKey, columns, rows,
sources }]`. Países por código ISO, localizados com `Intl.DisplayNames`.
Apresentação: `WallSign.presentation: 'table'` com `dataId` (reaproveita
`RoomSignage`/`RoomText`) e a mesma tabela no diário. "Atualizar o pódio de 2028
deve ser editar um array."

**Tamanho P/M · risco baixo.**

**Validadores.** `dated-list-stale` (aviso quando `asOf` passa de N meses na data
do build), `dated-list-row-without-source`, e os numerais das linhas entram no
lint de 3.15. Nada de contagens correntes ("N títulos") — regra de conteúdo.

### 3.17 Captura de fontes

**Hoje.** `Fact.usedAsCode`, `Fact.verifiedAt` e `FactSource.accessedAt` existem
(`schema.ts:87-120`). `validateFacts` exige confiança alta, dois "publishers" e
valor numérico (`validate.ts:259-294`), mas: independência é comparação de string
(`validate.ts:273`: "Wikipedia" e "Wikipédia" contam como dois; duas páginas da
FIVB com nomes diferentes também); datas e URLs não são validadas; nada confere
que a página foi aberta; e há o furo de A4. A mídia já tem o modelo certo:
atribuição buscada por script, nunca digitada (`scripts/media-sources.mjs:1-14`).

**Generalizar.** `npm run facts:capture`, no molde do `media:fetch`: para cada
fonte de fato usado como código, busca a URL e grava em
`src/content/facts.generated.ts` o status, o hash do corpo, o título real da
página, a data e — a checagem que importa — **se o texto capturado contém o
numeral**. Registro de publishers com grupos de dependência (FIVB e sites que a
copiam são um). `usedAsCode: true` só passa com captura válida de dois grupos.

**Tamanho M · risco baixo** (sites que bloqueiam busca automática: aceitar captura
manual com hash).

**Validadores.** `fact-code-uncaptured`, `fact-code-value-not-in-source`,
`fact-publishers-dependent`, `fact-date-invalid`, `fact-code-unused` /
`knowledge-lock-fact-not-code`.

### 3.18 Rádio por etapa e a paciência do Jorge entre salas

**Hoje — a parte mais pronta do motor.** Chamadas com condição e atraso, ouvidas
na ordem do conteúdo, uma por vez (`deviceRules.ts:88-144`); dicas em lista
ordenada, a primeira que casa vence (`deviceRules.ts:201-216`); paciência em
cinco níveis com perdão por progresso, calma por silêncio e teto
(`radioPatience.ts:29-187`, dados em `museum.ts:656-779`); diretor montado na raiz
da cena, então funciona em qualquer sala (`Devices.tsx:511-601`); memória por
aparelho no save. 22 checagens em `test:radio`.

**Falta.**

- **Condições:** hoje só energia, trancas, documentos, carregado e os dois "tudo"
  (`schema.ts:277-298`). Dicas por etapa precisam de credenciais, fios, bandeiras
  e soquetes — vêm com M5.
- **Cobertura:** nada garante que cada passo do caminho crítico tenha dica. Hoje
  são cinco dicas para três salas (`museum.ts:855-877`), e a última, incondicional,
  já fala de "três medalhas, um cofre". Sai de M10 como regra.
- **Repertório:** ~22 aberturas e 7 explosões para um jogo de 8 minutos; em 60–90
  minutos repetem. `RadioReply.when?: ProgressCondition` deixa a conversa mudar
  com o jogo (depois da luz geral, depois do cofre) sem código.
- **Calibragem:** níveis a partir das chamadas 1, 3, 5, 7 e 10, com 300 s de calma
  por chamada (`museum.ts:656-779`), foram ajustados para a abertura. Numa partida
  longa, quem liga uma vez por ala chega ao nível "zoeira" na terceira. É dado, não
  código — mas precisa de um teste de simulação de partida longa.
- **Outras vozes:** a secretária eletrônica com o recado do Otávio (HANDOFF §7.5)
  é um dispositivo de fala que não é rádio. Generalizar `radio` para "aparelho de
  voz" (`kind: 'voice'`, com `interaction: 'call' | 'play-once'`).
- **Linhas longas:** o limite de quatro linhas por resposta é aviso
  (`validate.ts:598, 695-715`); manter.

**Tamanho M · risco baixo.**

**Testes.** `test:radio` + simulação de partida de 60 min com relógio e dado fixos
(distribuição de níveis, nenhuma piada duas vezes em N chamadas, dica nunca
falta); `radio-hint-coverage` e `radio-hint-unreachable` no validador.

### 3.19 Acessibilidade e tiers de qualidade

**Hoje.** Padrões bons no store (head-bob e FOV desligados, `store.ts:151-162`);
`prefers-reduced-motion` em três blocos de CSS (`museum.css:188, 529, 576`);
legenda do rádio sempre visível; alvos de mira generosos; prompts sem depender de
cor. Faltam, contra a lista "inegociável" do PLANO-DO-ZERO §6.7:

- tela de ajustes (A22): brilho, velocidade, sensibilidades, movimento de câmera,
  qualidade;
- girar a peça por teclado (`Interaction.tsx:235-253` só aceita arrasto);
- foco: os painéis têm `role="dialog"` mas não movem nem prendem o foco
  (`LockPanel.tsx:142`, `Journal.tsx:203`);
- modo leitura: página estática com todo o texto do museu, numa URL real — gerada
  do conteúdo no build, e que serve também de revisão de roteiro;
- contraste AA nas etiquetas: sem portão.

**Tiers.** `quality` só mexe em DPR (`renderQuality.ts:30-46`), não tem UI nem
detecção. Antialias sempre ligado e anisotropia 8 fixa
(`MuseumCanvas.tsx:179`, `materials.ts:78`). Alavancas para um tier `low` de
verdade: sem MSAA, anisotropia 2, mídia em meia resolução, colocações marcadas
`detail: 'high'` omitidas, névoa mais curta. O pool de luzes deve continuar
fixo dentro de uma sessão. Detecção: começar em `medium`, rebaixar pelo próprio
controlador adaptativo quando ele encosta no piso (`renderQuality.ts:84-129`), em
vez de trazer uma tabela de GPUs.

**Tamanho M (ajustes + a11y) · baixo; M (tiers) · médio.**

**Testes.** Regras em `hudRules.ts`; `test:render-performance` com os perfis
novos; lint de contraste sobre as cores de `museum.css`; o modo leitura conferido
contra o dicionário (toda chave de conteúdo aparece).

### 3.20 Performance no celular

**Hoje (medido no HANDOFF §2, desktop):** átrio 80 draws / 64 mil triângulos;
escritório 58–66 / 36–38 mil; Holyoke 55 / 51 mil; pico com porta aberta 93 /
84,7 mil. Alvo móvel 45 draws e 90 mil triângulos; teto duro 100 e 150 mil.
Nenhum teste em aparelho real (HANDOFF §7.1).

**Riscos, em ordem.**

1. **Memória** (A13, A14): é o que mata a aba no iOS. M13.
2. **Pico de porta aberta:** 93 de 100 com as salas atuais; uma ala mais densa
   estoura. **M14:** estimador de draws por sala a partir do dado e do manifesto
   (lotes únicos do kit + peças + containers + dispositivos + arte + placas +
   casco + folhas) com teto por sala e por **par de salas ligado por porta**,
   para todas as salas, no lugar dos dois tetos por nome de
   `test-kit-runtime.ts:267-302`.
3. **Alvo de 45 draws:** inalcançável com um lote por família de material por
   receita — o escritório gasta 53 lotes em ~20 colocações quase todas únicas,
   onde instanciar não ajuda. **M21:** no bake, fundir por material as colocações
   estáticas *únicas* de cada sala num só mesh (as repetidas três vezes ou mais
   continuam instanciadas: nichos do átrio, barreiras, pendentes). O escritório
   cairia para ~15 draws de kit. Depende do kit por sala. Tamanho G, risco
   médio/alto.
4. **Preenchimento:** bem resolvido (DPR adaptativo com histerese,
   `renderQuality.ts`).
5. **Vizinho sem porta com detalhe** (mezanino): só com o tier distante de 3.10.

---

## 4. Delta de schema proposto (resumo)

```ts
// EraId: + 'mezzanine' + salas-escada.

type ProgressCondition = {
  /* os atuais */
  catalogued?: readonly string[]; hotspotsSeen?: readonly string[]
  credentials?: readonly Credential[]; credentialsMissing?: readonly Credential[]
  threadsClosed?: readonly ThreadId[]; threadsClosedAtLeast?: number
  flags?: readonly string[]; flagsUnset?: readonly string[]
  roomsVisited?: readonly EraId[]; socketsFilled?: readonly MedallionId[]
  anyOf?: readonly ProgressCondition[]
}

type UnlockEffect = /* os quatro atuais */
  | { kind: 'set-flag'; flag: string }
  | { kind: 'consume-credential'; credential: Credential }

type Trigger = { id: string; when: ProgressCondition; effects: readonly UnlockEffect[] }

type RitualPuzzle =
  | { kind: 'order'; items: readonly RitualItem[]; solution: readonly string[] }
  | { kind: 'match'; left: readonly RitualItem[]; right: readonly RitualItem[];
      pairs: readonly (readonly [string, string])[] }
// Lock 'knowledge': + input: 'keypad' | 'wheel'; + hintKeys?
// Lock 'ritual':    puzzle: RitualPuzzle; evidence: { exhibitIds, documentIds }
// Todo Lock:        + onOpen?: readonly UnlockEffect[]

type CredentialData = { kind; id; titleKey; descriptionKey; icon }
type PickupData = { id; part; position; rotationY?; grants: Credential; availableWhen? }
type ThreadData = { id: ThreadId; titleKey; summaryKey; nodes: readonly string[] }
type DatedList = { id; asOf: string; titleKey; columns; rows; sources: readonly FactSource[] }
type LightingStage = { id; when: ProgressCondition; keyScale; washScale; emissiveScale;
                       environmentScale; washTarget? }
type LightZone = { id; palette: PaletteId; bounds: [minX, minZ, maxX, maxZ]; wash }

// ExhibitData: + provenance (obrigatório); + availableWhen?; + examine?: { fit, mode }
// ContainerData: + drawers?; + availableWhen?; presentation += 'guest-book'
// DeviceData: + { kind: 'socket-host', lockId, sockets }; radio → voz
// Portal: position[1] honrado; + sill?; + passable?; lockId lido pelo runtime
// RoomData: + level; + entry: SpawnData; + finishes/shell.style; + shell.floor
//           + lightingStages; + lightZones; + pickups
// Fact: + printedIn: readonly string[]
// MuseumContent: + triggers, credentials, threads, datedLists
// Progress: + flags, triggersFired, locksSeen, socketsFilled
```

---

## 5. Ordem de construção recomendada

Caminhos críticos: **M2 → M5 → M6 → M10** (progressão) e **M3 → M12 → M13 → M22**
(escala e vertical). M0, M1, M4, M15 e M16 não dependem de nada e podem começar
junto com a auditoria do átrio e da Holyoke.

### Bloco 0 — Saneamento, antes de qualquer sala nova

| Pacote | Conteúdo | Tam. | Risco | Depende |
|---|---|---|---|---|
| **M0** | Validadores que faltam, sem tocar no runtime: A2, A4, mão única em A3, kit ocioso (A11), `room-overlap`, `wall-item-over-opening`, chave de i18n sem uso; e a proibição temporária de tranca não-`knowledge` (A1) | P/M | baixo | — |
| **M1** | Acabamentos e paletas como dado, lidos por bake e runtime (A12, paletas de A23); `shell.style` | M | médio — muda os três GLBs de casco | — |
| **M2** | Save: tabela de campos, migradores por versão, aliases (A20) | P/M | médio | — |
| **M3** | Registro de receitas no bake, `KitPartId` gerado, limpeza das ociosas, cache por receita | M | médio | — |
| **M4** | Examinar v2: distância pelo tamanho da peça (limites no manifesto), rotação por teclado, inspeção no lugar para peças grandes (A17) | M | médio | — |

M4 está aqui porque é correção da Holyoke, não recurso novo.

### Bloco 1 — Progressão como dado → portão da Fase A (Paris é só dado)

| Pacote | Conteúdo | Tam. | Risco | Depende |
|---|---|---|---|---|
| **M5** | Condições v2, gatilhos, efeitos executados no store (3.2) | M | médio | M2 |
| **M6** | Trancas: regras, hospedeiros, painéis, `locksSeen` no mapa (3.1; A1, A5, A6) | G | médio | M5 |
| **M7** | Credenciais como dado, pickups, abas Coleção e Fios, toast genérico (3.3) | M | baixo | M5 |
| **M8** | Fios (3.4) | P/M | baixo | M5, M7 |
| **M9** | Rádio por etapa, voz genérica, repertório condicional (3.18) | M | baixo | M5 |
| **M10** | Solvabilidade v2 + bot de partida com ordem embaralhada (3.14 h) | G | médio | M5, M6, M8 |
| **M11** | Lint de numerais + captura de fontes (3.15, 3.17) | M | baixo | M6 |

### Bloco 2 — Escala → portão da Fase B (Tóquio; nunca mais de três residentes)

| Pacote | Conteúdo | Tam. | Risco | Depende |
|---|---|---|---|---|
| **M12** | Kit por sala e resolvedor de receita (3.14 b) | G | alto | M3 |
| **M13** | Streaming: Suspense por sala, residência de detalhe, texturas por sala, teto de mídia, descarte verificado (3.11) | G | alto | M12 |
| **M14** | Orçamentos como dado: draws por sala e por par de porta, assinaturas de programa, VRAM por trio (3.14 e, 3.20) | M | baixo | M12 |
| **M15** | Navegação v2: travessias derivadas e alcance por inundação (3.14 g) | M/G | médio | — |
| **M16** | Bundle: dicionário em camadas e por idioma, manifesto enxuto (3.14 d) | P/M | baixo | — |

### Bloco 3 — Recursos de sala → portão da Fase C (Alas 4 a 6)

| Pacote | Conteúdo | Tam. | Risco | Depende |
|---|---|---|---|---|
| **M17** | Etapas de luz, emissivo ciente de energia, zonas de luz (3.9, 3.12; A9) | M/G | médio | M1, M5 |
| **M18** | Áudio: leitor de emissores, superfície de passo por zona, reverb por sala (A18) | M | baixo | M1 |
| **M19** | Conteúdo condicional e armário de gavetas (3.6) | M | médio | M5, M10 |
| **M20** | Listas datadas e painel de tabela (3.16) | P/M | baixo | M11 |
| **M21** | Fusão estática por sala (3.20) | G | médio/alto | M12, M14 |

Só a parte de A9 em M17 (emissivo apagado sem energia) é correção do átrio e pode
ser antecipada para o Bloco 0 se a auditoria visual confirmar o defeito.

### Bloco 4 — Vertical e final → portões das Fases D e E

| Pacote | Conteúdo | Tam. | Risco | Depende |
|---|---|---|---|---|
| **M22** | Vertical: portal com altura e peitoril, sala-escada com rampa, grudar no chão, células 3D, mapa por piso, `relocatePlayer` + `RoomData.entry`, tier distante (3.10) | GG | alto | M13, M15 |
| **M23** | Plinto de soquetes (3.5) | M | médio | M6, M7, M17 |
| **M24** | Proveniência e livro de tombo (3.7) | P/M | baixo | M5, M7 |
| **M25** | Livro de visitas, final, pós-jogo (3.8) | M | médio | M5, M24 |
| **M26** | Subsolo alagado (3.13) | M | médio | M17, M18, M22 |

### Bloco 5 — Polimento → Fase F

| Pacote | Conteúdo | Tam. | Risco | Depende |
|---|---|---|---|---|
| **M27** | Tela de ajustes, foco, contraste (3.19) | M | baixo | — |
| **M28** | Tiers de qualidade (3.19) | M | médio | M13 |
| **M29** | Modo leitura gerado do conteúdo | P/M | baixo | M16 |
| **M30** | KTX2, só se o pior trio de salas não couber | M/G | médio | M13 |

### O que cortar primeiro, se faltar fôlego

1. Escada → elevador (M22 cai de GG para M + as partes de mapa e células).
2. M21 (fusão estática): aceitar ficar acima do alvo de 45 draws, dentro do teto
   de 100, com M14 vigiando.
3. M30 (KTX2) e a porta de enrolar da doca.
4. Zonas de luz: fazer a Ala 4 como duas salas com um vão largo.

Não cortar: M0, M2, M5, M6, M10, M13. Sem eles, "100% jogável" não tem prova.

---

## 6. Testes e validadores a criar

| Nome | Prova | Pacote |
|---|---|---|
| `lock-without-host`, `lock-digits-mismatch`, `knowledge-lock-fact-not-code`, `document-lock-disagrees-with-container` | trancas coerentes com o runtime | M0 |
| `non-knowledge-lock-unsupported` (temporário) | fecha A1 até M6 | M0 |
| `room-overlap`, `wall-item-over-opening`, `kit-part-unused`, `i18n-key-unused` | geometria e peso mortos | M0 |
| `test:shell-finishes` | cada sala recebe os materiais da sua paleta (reprova A12) | M1 |
| `test:save` | todo campo de `Progress` sobrevive a ida e volta; migração de cada versão; aliases | M2 |
| registro de receitas ↔ `KitPartId` ↔ colisores | uma fonte só | M3 |
| `test:examine` | a peça cabe no campo de visão; todo hotspot é alcançável por rotação; teclado | M4 |
| `test:triggers` | uma vez, ordem, recarga, ponto fixo | M5 |
| `test:locks` | cada tipo, 2 e 4 dígitos, consumo, dicas, redutores de ritual | M6 |
| `ritual-solution-invalid`, `ritual-evidence-behind-lock` | rituais resolvíveis | M6 |
| `credential-orphan` (erro), `credential-unobtainable`, `tool-consumed-twice` | chaveiro fechado | M7 |
| `thread-single-room`, `thread-node-missing`, `ball-thread-one-node-per-wing` | portão da Fase D | M8 |
| `radio-hint-coverage`, simulação de 60 min | toda etapa tem dica; paciência calibrada | M9, M10 |
| `simulateProgress` + roteiro em níveis | grafo inteiro, incluindo rituais, distintivos, ferramentas, final | M10 |
| `test:playthrough` com ordem embaralhada | o jogo termina por qualquer ordem válida | M10 |
| `numeral-exclusivity` | regra 1 do §4.2 em dicionários, listas, SVGs e rótulos | M11 |
| `fact-code-uncaptured`, `fact-code-value-not-in-source`, `fact-publishers-dependent` | regra 4 do §4.2 | M11 |
| GLB por sala ≤ 1,5 MB; receita → bundle | orçamento do PLANO-DO-ZERO §7.8 | M12 |
| política de residência; VRAM por trio; teto de mídia por sala e por imagem | nunca mais de três; memória | M13 |
| draws por sala e por par de porta; assinaturas de programa | tetos móveis | M14 |
| travessias derivadas; alcance de todo interativo; folga de toda porta | "100% jogável" no espaço | M15 |
| orçamento de bundle por caminho (gzip) | 250 / 600 KB | M16 |
| etapas de luz: slots invariáveis; irradiância no forro; emissivo zero sem energia | luz geral sem recompilar | M17 |
| emissores e superfícies resolvidos por sala | áudio como dado | M18 |
| `badge-opens-nothing-elsewhere`, `available-condition-unsatisfiable` | portão da Fase B | M19 |
| `dated-list-stale`, `dated-list-row-without-source` | a Ala 6 não envelhece calada | M20 |
| rampa de 30–35° subindo e descendo; rotas com cota; balaustrada segura a cápsula | vertical | M22 |
| `test:plinth`; nós de soquete no bake | medalhas | M23 |
| `exhibit-without-provenance` | livro de tombo completo | M24 |
| `test:ending`; `entry-outside-room` | final e pós-jogo | M25 |
| nenhuma chave com `transmission` | água barata | M26 |

Toda suíte nova entra no `npm run check` (regra 1 do AGENTS.md).

---

## 7. Decisões que precisam do dono

1. **Escada ou elevador para o cofre e o mezanino?** A escada é o desenho ("a
   escada desce") e o item mais caro e arriscado do motor. O elevador entrega o
   mesmo roteiro por uma fração.
2. **A vitrine de bolas do átrio** (A7, A8): sai, vira prévia sem fio, ou vira o
   lugar do ritual das seis bolas? Enquanto ficar como está, o código `1998` e o
   fio `ball` não fecham.
3. **`1896` em cinco lugares:** manter como exceção declarada ou reduzir a um? E
   o `15` de "21 para 15 pontos" precisa virar prosa.
4. **O quadro do átrio passa a ligar só a luz de serviço?** Muda o que já está no
   ar; é o que dá sentido à luz geral no final.
5. **Assinatura com nome digitado ou só um gesto?** Recomendo o gesto.
6. **"Continuar" volta ao escritório ou à última sala?** Hoje sempre o escritório.
7. **Teto de resolução da arte de parede** no celular (murais de 1024 × 1536 custam
   8 MiB cada): aceitar meia resolução num tier baixo?
8. **O plinto:** refazer o console central como plinto de três soquetes, ou pôr o
   plinto em outro ponto do átrio?
