# 03 — Auditoria da Ala 1 · Holyoke

Auditoria no molde do que foi feito no escritório (HANDOFF §9.1): caça a defeitos concretos e
reproduzíveis de fluxo, interação, estado e UX, lendo os caminhos de código.
Repositório: `C:\Users\rzbui\OneDrive\Documentos\Portfolio\Volleyball Museum` (branch `main`, `82756c4`).

## 0. Método, limites e estado do portão

- **Somente leitura.** Nada foi editado, assado, servido ou commitado. Não rodei `dev`/`bake`.
- **O que rodei:** `npm run check` (saiu com código 0: tudo verde) e `npm run validate:content`
  ("All checks passed"). Ou seja: **nenhum dos defeitos abaixo é visto pelo portão atual.**
- **Simulações determinísticas** (one-liners de Node que só leem `museum.ts`, o manifesto assado e os
  geradores): reproduzi a matemática de `ExamineView` para todo hotspot, a montagem do rig de luz
  (`buildGalleryLightRig`) e a geometria da vitrine corrida (`buildHistoryCaseRun`) contra a posição
  das peças. Os números das tabelas saem daí.
- **Sem navegador.** Itens marcados **[conferir no navegador]** foram deduzidos de geometria e código;
  cada um traz a URL `?qaCamera=` para a captura que confirma.
- **Aviso:** durante a sessão apareceram arquivos não rastreados `docs/contact-sheets/wf3-a*.jpg`
  (capturas do átrio, 03/10 17:43–17:45). Não foram criados por mim; outro processo do fluxo está
  fotografando o átrio.
- Convenções: coordenadas "locais" são da sala Holyoke (origem no mundo `[-15.25, 0, 0]`,
  `museum.ts:1223`). Severidade: **S1** bloqueia objetivo · **S2** alto · **S3** médio · **S4** baixo.

## 1. Veredito em uma página

A sala está bonita de longe e **quebrada de perto**. Os cinco problemas que mandam no resto:

1. **Três das oito peças não podem ser catalogadas.** A rede de 1897 e o traje de ginásio são
   matematicamente impossíveis; a foto do ginásio exige alinhar a moldura de perfil com 1,5° de
   tolerância. Logo `allCatalogued` nunca vale, "Catalogar o acervo" nunca risca, o mapa nunca fica
   azul e o distintivo `indoor` do plano (bolas + rede) nasceria inalcançável. (H-01, H-02)
2. **O verbo central gira errado.** O arrasto vertical gira em torno do X do mundo, não da câmera:
   inverte entre olhar norte e sul e vira rolagem olhando leste/oeste — que é justamente o lado da
   etiqueta da bola-herói. O arrasto horizontal é invertido em qualquer direção. (H-03)
3. **A cadeia do código 1896 funciona no texto e falha na mão.** A plaqueta só é "vista" com um
   arrasto vertical para cima; girar o retrato de lado (o gesto que o jogo ensina) nunca a revela; a
   metade de baixo do objeto fica sob o painel; e a moldura examinada sai **sem a fotografia**. A
   escada de dicas do teclado não escala (o degrau de 90 s repete a pergunta já na tela; o terceiro
   revela "1"). (H-04, H-05, H-18, H-19)
4. **As quatro peças da vitrine corrida estão cravadas na marcenaria.** Todas cruzam um montante; o
   guia de 1916 está dentro da tábua da prateleira; o manual de 1897, debaixo dela; o retrato do
   Morgan e o panorama são cortados por um montante e por uma prateleira. `case-wall` é isento de
   toda validação geométrica. (H-13)
5. **Não há uma única etiqueta legível no mundo.** Três pedestais de latão, cinco mesas de leitura e
   as três folhas do quiosque são superfícies em branco. O Jorge manda "ler as placas"; o plano
   promete etiquetas "sempre visíveis, sem interação". (H-49)

Contagem: **53 defeitos** — S1: 2 · S2: 12 · S3: 28 · S4: 11.

---

## 2. O percurso real do jogador, hoje

1. Átrio → porta `atrium-to-holyoke` (`museum.ts:915-928`): aquece a 5 m, abre com E, fecha sozinha
   1,25 m depois da travessia. Sem trava elétrica: dá para entrar com o átrio ainda escuro.
2. Sala escura. À frente, a tela de entrada azul (`holyoke-entry-screen`, `museum.ts:1267`). O quadro
   de força está **na parede da própria porta, 1,4 m à direita de quem entra, atrás do jogador**
   (`museum.ts:1226-1234`). Piloto: point light vermelho de 2,4 m (`powerControlLightRig.ts:61-66`).
3. E no quadro → `powerRoom('holyoke')` → toast "Energia restaurada" + sino. Cinco spots e um wash
   acendem num frame. Nada mais reage.
4. Oito peças (`HOLYOKE_EXHIBITS`, `museum.ts:280-494`), dois armários de arquivo
   (`museum.ts:583-598`), três documentos.
5. O código 1896 está: (a) no hotspot `date` do retrato; (b) na ficha do retrato (só depois do
   hotspot); (c) no título e no corpo do documento `doc-halstead` do armário A, que grava o fato ao
   abrir (`Containers.tsx:282-286`).
6. Volta ao escritório → teclado → bilhete do antecessor → dica eterna do cofre. Fim do conteúdo.

---

## 3. Defeitos

### A. Examinar e catalogar — `src/engine/Interaction.tsx`

**H-01 · S1 · Hotspot a mais de 0,42 m da origem da peça nunca é descoberto**
- Onde: `Interaction.tsx:166` (`HOLD_DISTANCE = 0.42`), `:331-334` (a ORIGEM da peça vai a 0,42 m da
  câmera), `:364-383` (teste: `outward = hotspot − origem`, `toCamera = câmera − hotspot`,
  `dot > 0.55`). Dados: `museum.ts:353-364` (rede: `tape [0,1.98,0]`, `socket [-2.4,0.04,0]`),
  `:435-440` (traje: `knit [0,1.2,0.12]`), `:486-491` (foto: `apparatus [0.4,-0.1,0.02]`).
- Por quê: com a origem a 0,42 m, um hotspot a distância L da origem fica a `0,42 − L` da câmera no
  melhor caso. Se L ≥ 0,42 ele está sempre atrás da câmera e o produto escalar é sempre negativo.
- Cenário: E na rede → gira-se o quanto quiser → `tape` nunca acende (melhor dot possível −0,98).
  Idem `knit` (−0,94). `apparatus` (L = 0,413) só acende em 0,017% das orientações: é preciso apontar
  a ponta direita da moldura para o olho com erro menor que 1,5° (≈ 3 px de arrasto por eixo).
- Consequência: `net-1897`, `gym-suit` e, na prática, `photo-gym` nunca entram no catálogo →
  `allCatalogued` (`museum.ts:564`, `progressCondition.ts:76-80`) é inalcançável; `stateOf` do mapa
  nunca devolve `complete` para a ala (`MuseumMap.tsx:90-92`); o distintivo `indoor` do
  PLANO-COMPLETO §2.1 ("catalogar as duas bolas e a rede") seria inalcançável.
- Correção: tirar a matemática do componente para um módulo puro (`examineRig.ts`, no padrão de
  `flashlightRig.ts`): (1) pivô = centro das bounds da receita (já estão no manifesto), não a origem;
  (2) hotspot ganha `normal: Vec3` explícito e o teste passa a ser `normal · direçãoParaCâmera`;
  (3) ver H-02 para escala. Peças de chão grandes ganham `examine: 'in-place'` (H-02).
- Teste: `test:examine` — para toda peça e todo hotspot obrigatório, existe orientação que o revela,
  a fração de orientações que o revelam é ≥ 4% e ele é alcançável com ≤ 300 px de arrasto num eixo
  só, partindo do lado de visita da peça. O teste deve reprovar os dados atuais da rede, do traje e
  da foto.

**H-02 · S1 · A peça segurada não é enquadrada pelo tamanho**
- Onde: `Interaction.tsx:331-334` (distância fixa), `MuseumScene.tsx:183-190` (a escala de exibição
  vai junto: `ball-spalding` × 2,65, `museum.ts:311`).
- Cenário (FOV vertical 62°, meia-altura visível a 0,42 m = 0,25 m):
  - rede (4,98 × 2,18 m, origem no piso): a faixa da rede fica 1,36–1,98 m acima do centro da tela e
    os postes a 80° do eixo → **tela vazia** com o painel embaixo; ao arrastar, 5 m de rede varrem
    as paredes;
  - manequim (1,32 m, origem na base): vê-se o pé de ferro e a coluna; o traje fica fora do quadro;
  - bola-herói: raio 0,283 m a 0,42 m → raio angular 42° > 31° → **a bola cobre a tela inteira**;
    o ponto mais próximo fica a 13,7 cm da lente (near = 0,08, `MuseumCanvas.tsx:175`);
  - panorama (1,54 m de largura): só os 0,9 m centrais cabem; girado, a ponta atravessa a câmera;
  - retrato (0,48 × 0,56 m): estoura em cima e embaixo (33,8° > 31°).
- Correção: `examineFit(bounds, fov, aspect)` → escala de exame tal que a esfera envolvente ocupe
  ~60% do menor FOV (a escala de exibição não entra no exame) + zoom por roda/pinça com limites.
  Rede e manequim: `examine: 'in-place'` — a câmera percorre 2–3 pontos de vista autorais (fita,
  soquete; gola, malha) e o hotspot é "olhar de perto", sem tirar 5 m de rede do lugar.
- Teste: `test:examine` — em 16:9 e em 844 × 390, toda peça segurada cabe em ≤ 70% do quadro, o ponto
  mais próximo fica a ≥ 0,2 m da lente e a escala de exame ignora `exhibit.scale`.

**H-03 · S2 · Eixos de rotação presos ao mundo; horizontal invertido**
- Onde: `Interaction.tsx:339-348` (`axis.set(1,0,0)` — o comentário diz "camera's right", o código
  usa o X do mundo; guinada com `-drag.x`).
- Medido (ponto da peça voltado para a câmera, arrasto de 100 px):

  | Olhando para | arrasto → direita | arrasto ↓ baixo |
  |---|---|---|
  | norte (console do átrio, rede, traje) | frente vai para a ESQUERDA | frente SOBE |
  | sul (vitrine corrida) | frente vai para a ESQUERDA | frente desce |
  | leste / oeste (lado da etiqueta da bola-herói) | frente vai para a ESQUERDA | **nada: rola em torno do eixo de visão** |

- Cenário: o jogador para diante do pedestal da bola-herói (`label-angled` em `[0,0,1.5]` virado
  para leste, `museum.ts:1270`), olha para oeste, pega a bola: o arrasto vertical só a faz rolar.
  O hotspot `lacing` exige inclinação → inalcançável desse lado (simulado: "UNREACHABLE" de leste e
  de oeste). A mesma peça responde ao contrário conforme a parede em que o jogador está.
- Correção: guinada em torno do "para cima" da câmera, inclinação em torno da direita da câmera
  (coluna 0 de `camera.matrixWorld`), sinais de manipulação direta (a face da frente segue o dedo).
- Teste: `examineDrag(quaternion, dx, dy, cameraQuaternion)` puro — o deslocamento em tela do ponto
  frontal é o mesmo para guinadas de câmera 0, π/2, π e 3π/2, e tem o sinal do arrasto.

**H-04 · S2 · Examinar um quadro levanta a moldura e deixa a fotografia na parede**
- Onde: `MuseumScene.tsx:341-382` — `<FramedMedia>` é irmão de `<Exhibit>`, não filho do grupo
  `exhibit:<id>`; `ExamineView` só re-hospeda o grupo (`Interaction.tsx:300-318`).
- Cenário: E no retrato do Morgan (a peça do código) → nas mãos do jogador, uma moldura de carvalho
  com um cartão liso; o retrato, o cartão creme e o crédito continuam pendurados na vitrine. Idem
  `photo-gym`.
- Correção: renderizar a impressão e o crédito dentro do grupo `exhibit:<id>` (ou num filho dele),
  de modo que tudo viaje junto; no exame, esconder só a linha de crédito.
- Teste: `test:room-runtime` — todo exhibit com `mediaId` tem a malha da impressão como descendente
  de `exhibit:<id>`.

**H-05 · S2 · O painel de exame cobre a metade de baixo da peça; não há zoom**
- Onde: `museum.css:273-296` (`.examine` ancora embaixo; `.examine-panel { max-height: 46vh }`);
  a peça fica no centro da tela (`Interaction.tsx:334`).
- Cenário: em 1080p o painel típico tem 330–480 px → o topo fica em 52–65% da altura; em 844 × 390
  são 179 px → topo em 50%. A parte inferior de qualquer peça (e a régua de baixo da moldura, onde
  estaria a plaqueta de 1896) fica atrás do painel.
- Correção: deslocar o ponto de segurar para o centro da área livre (acima do painel) ou pôr o
  painel em coluna lateral no desktop e recolhível no toque; roda/pinça para aproximar.
- Teste: `hudRules` — `examineViewport(painel, viewport)` devolve a área livre; `test:examine` exige
  a peça inteira dentro dela.

**H-06 · S3 · Hotspots obrigatórios descobertos no ato de pegar (catálogo sem girar)**
- Onde: `museum.ts:408-414` (`guide-1916 · credit`, normal para cima), `:325-332`
  (`ball-spalding · maker`, comentário "deliberately on the far side"), `:176-181`
  (`atrium-ball-laced · lacing`).
- Simulado do ponto de visita real: `credit` dot inicial 1,00 → **o guia é catalogado no instante do
  E** e grava o fato `filipino-spike`; `maker` dot 0,72 para quem chega pelo norte (o lado da
  entrada) → "o lado de trás" é o lado da frente; `atrium-ball-laced · lacing` 0,67 (átrio).
- Viola a regra do próprio projeto (`schema.ts:210-218`, `validate.ts:158-165`).
- Correção: com `normal` explícito (H-01), o validador exige que todo hotspot obrigatório aponte
  para fora do semiespaço do visitante na pose de repouso.
- Teste: `test:examine` — nenhum hotspot obrigatório nasce visto a partir do lado de visita.

**H-07 · S3 · Descobrir um hotspot não dá retorno**
- Onde: `Interaction.tsx:375-382` (só grava); `Hud.tsx:351-362` (a lista troca "— — —" pelo texto).
- Cenário: no telefone a lista fica abaixo da dobra do painel (título + 4–5 linhas de etiqueta já
  ocupam os 179 px). O jogador descobre a plaqueta de 1896 e não percebe.
- Correção: tique sonoro + destaque de 1,5 s com o texto do hotspot acima do painel + rolagem
  automática do item para a vista. Fato revelado ganha o próprio toast ("Anotado no caderno").
- Teste: `hudRules.hotspotReveal(prev, next)` devolve o item novo; `test:opening-flow` cobre.

**H-08 · S3 · Examinar no escuro, com a lanterna apagada, mostra um objeto preto**
- Onde: `Flashlight.tsx:77-86`, `flashlightRig.ts:56-59` (lanterna apagada = intensidade 0 também no
  exame); a sala sem energia tem só ambiente 0,1 (`MuseumScene.tsx:766`).
- Correção: durante o exame, o spot da lanterna vale `examineScale` mesmo "apagado" (a contagem de
  luzes não muda), ou um preenchimento dedicado no mesmo slot.
- Teste: `test:materials`/`test:opening` — irradiância na peça segurada ≥ limiar com sala escura e
  lanterna apagada.

**H-09 · S3 · Mira: peça vazada quase não tem alvo, e parede não bloqueia**
- Onde: `Interaction.tsx:117-134` (o raio testa só a malha das peças; sem volume de mira, ao
  contrário de armários e quadros de força — `interactionTarget.ts:38-42`).
- Cenário (a): a rede tem cordas de 3,5 mm a cada 10 cm (`kit.mjs:728-743`): 93% de furos. Olhando
  para o meio da rede o prompt não aparece; só na fita de cima, na de baixo ou num poste.
  Cenário (b): por trás da tela de entrada dá para "examinar" a câmara de borracha através de 46 cm
  de monólito; da frente do quiosque, a bola-herói através do quiosque.
- Correção: volume de mira por peça derivado das bounds (com mínimo), e oclusão simples contra os
  colisores da sala.
- Teste: varredura de mira no estilo do armário ("doze ângulos"): olhar o centro da rede a 1,5 m
  foca `net-1897`; mirar pela face de trás da tela de entrada não foca `ball-improvised`.

**H-10 · S4 · Arrastar sobre o painel também gira a peça**
- Onde: `Interaction.tsx:235-240, 255-259` (ouvintes no `window`, sem filtrar alvo nem botão).
- Cenário: selecionar texto da etiqueta ou arrastar a barra de rolagem gira o objeto.
- Correção: ignorar `pointerdown` cujo alvo esteja dentro de `.examine-panel`; só botão primário.
- Teste: regra pura `startsExamineDrag(target, button)`.

### B. Peças, suportes e modelos

**H-11 · S2 · Três hotspots reaproveitam o texto de outra peça**
- Onde: `museum.ts:298` (câmara · `valve` → `hotspot.ball-spalding.lacing.label`: "Cadarço de couro
  cru sobre a abertura de inflagem" — a câmara não tem cadarço); `:438` (traje · `knit` →
  `hotspot.ball-spalding.seam.label`: "Costura externa erguida, feita à mão"); `:489` (foto ·
  `apparatus` → `hotspot.net-1897.socket.label`: "Soquete de ferro fundido embutido no piso").
- Correção: três chaves novas (pt e en) com o texto da própria peça; ver H-42/H-43 para o conteúdo.
- Teste: validador `hotspot-label-foreign` — o `labelKey` de um hotspot começa por
  `hotspot.<id da peça>.` e nenhuma chave é usada por duas peças.

**H-12 · S2 · O hotspot não está onde o modelo mostra a coisa**
- Câmara: bico modelado em cima (`kit.mjs:676-677`), hotspot `valve` embaixo (`museum.ts:297`,
  `[0,-0.09,0.04]`) → só acende com o FUNDO virado para o olho (≈ 300–350 px de arrasto vertical).
- Bola Spalding: cadarço modelado em +Z (`kit.mjs:642-650`), hotspot `lacing` em `[0,0.1,0.1]`
  (`museum.ts:321`) → 45° acima do cadarço; com a escala 2,65 o cone de acerto encolhe para ~8,5°
  (0,55% das orientações). Olhar de frente para o cadarço não conta.
- "Marca do fabricante" (`museum.ts:325-332`): o modelo tem ali um **bico de válvula**
  (`kit.mjs:652-656`, "valve boss, opposite the lace"). Bola de cadarço não tem válvula — a própria
  etiqueta do átrio diz isso (`pt-BR.ts:270`) e a pesquisa também ("Pre-1920s balls have NO valve
  button"). Não há carimbo Spalding modelado.
- Retrato: "Plaqueta da moldura" (`pt-BR.ts:358-359`) não existe em `buildFrame` (`kit.mjs:1126-1174`).
- Correção: derivar cada hotspot da geometria (o gerador exporta `anchors: { lacing, stamp, nozzle }`,
  como `buildCuratorDesk().layout`), modelar o carimbo oval e a plaqueta, remover o bico da bola.
- Teste: `test:kit` — todo hotspot está a ≤ 2 cm de um anchor exportado pela receita.

**H-13 · S2 · As quatro peças da vitrine corrida atravessam a marcenaria** [conferir no navegador]
- Onde: `museum.ts:371, 399, 448, 477` (x = −2,95 / −0,95 / 1,15 / 3,65; z = 7,5) contra
  `holyokeDecor.mjs:240-245` (montantes de 6,5 cm em x = ±1,02, ±3,06, ±5,10, da frente ao fundo) e
  `:259-267` (prateleiras de 2,7 cm; y = 1,32 nos vãos pares e 1,37 nos ímpares; 1,91/1,87/1,83).
  `supportY: 1.32` foi lido como o TOPO da prateleira, mas 1,32 é o CENTRO (topo = 1,3335).
- Calculado (coordenadas locais da vitrine):

  | Peça | Cruza o montante | Cruza a prateleira | Efeito |
  |---|---|---|---|
  | `handbook-1897` | x = −3,06: 6,5 cm | vão ímpar, y = 1,37: 1,5 cm de altura em 18 cm | livro pendurado SOB a tábua; sobra uma fresta de 4 cm no fim da prateleira |
  | `guide-1916` | x = −1,02: 2,6 cm | y = 1,32: os 1,1 cm inteiros | **enterrado dentro da tábua** (o topo fica 2,3 mm abaixo do tampo) |
  | `portrait-morgan` | x = 1,02: 6,5 cm × 56 cm | y = 1,87: 29,5 cm de largura | montante cobre 6,5 cm da borda esquerda da foto; a prateleira (13 cm à frente) corta o retrato ~5 cm abaixo do centro |
  | `photo-gym` | x = 3,06: 6,5 cm × 59 cm | y = 1,91: 128 cm de largura | prateleira atravessa quase toda a panorâmica; e a moldura ocupa o mesmo lugar da camisa assada do vão 1 (46 × 56 cm de sobreposição; o número da camisa fica a 1 mm da impressão → z-fighting) |

- Evidência visual coerente: em `docs/contact-sheets/holyoke-gallery-implemented-v2.png` o único
  rastro do manual é um traço claro no fim da prateleira do vão do meio; o guia não aparece.
  Recorte ampliado dessa região: `wf3/tmp03/v2-case-run.png` (nesta pasta de trabalho).
- Por que passou: `validate.ts:1181` pula `case-wall`; para `floor` + `supportY` o validador compara
  a peça com o número que o próprio autor digitou (`:1184`), não com a tábua real.
- Correção: `buildHistoryCaseRun` exporta `layout` (centro de cada vão, topo de cada prateleira,
  plano do forro); as quatro peças vão para o centro de um vão cada, apoiadas no topo real; os
  quadros encostam no forro azul, num vão sem prateleira alta (ou o vão perde a prateleira).
- Captura: `?qaCamera=-14.1,0,6.45,3.1416,0.25&qaPower=holyoke` (retrato);
  `-16.2,0,6.45,3.1416,-0.25` (guia); `-18.2,0,6.45,3.1416,-0.25` (manual);
  `-11.6,0,6.3,3.1416,0.25` (panorama).
- Teste: `test:kit` — AABB de cada peça × caixas do `layout` da vitrine: zero interseção, apoio no
  topo de uma prateleira (±0,5 mm), ≥ 3 cm de qualquer montante, quadro a ≤ 5 mm do forro.

**H-14 · S3 · O cartão creme do runtime é maior que a moldura assada** [conferir no navegador]
- Onde: `FramedMedia.tsx:32, 71-79` (cartão = impressão + 6 cm por lado, a +2,8 cm) contra
  `kit.mjs:1126-1174` (régua de 4,5 cm; o perfil varrido não é centrado: as travessas invadem 2,45 cm
  da foto e os montantes ficam a 2 cm dela; o "mount" assado fica 1,4 cm À FRENTE da face da
  moldura, apesar do comentário "recessed").
- Medido: retrato — moldura 0,479 × 0,563 m, cartão 0,46 × 0,634 m → o cartão sobra 3,5 cm em cima e
  embaixo e esconde quase toda a madeira. Panorama — moldura 1,539 × 0,593, cartão 1,52 × 0,664.
- Correção: uma só fonte de verdade — a moldura assada define a abertura; a impressão vai nela, sem
  segundo cartão; recentrar o perfil das réguas.
- Teste: `test:kit` — impressão ⊂ abertura da moldura; nenhuma malha de runtime ultrapassa o
  contorno externo da moldura.

**H-15 · S3 · A bola-herói é exibida 2,65× maior e a etiqueta dá o tamanho real**
- Onde: `museum.ts:308-311`; `pt-BR.ts:315-316` ("Cerca de 25 polegadas de circunferência").
- Uma bola de 57 cm com legenda de 20 cm, num museu cuja tese é declarar o que é reconstrução.
- Correção: exibir no tamanho real num suporte que a valorize, ou dizer "modelo ampliado" na
  etiqueta. No exame, sempre tamanho real (H-02).
- Teste: validador — peça com `scale ≠ 1` exige um campo `scaleNoteKey` traduzido.

**H-16 · S3 · A câmara de borracha fica na altura da canela**
- Onde: `museum.ts:287-289` (y = 0,335; nicho de 0,227 a 0,515 m, `holyokeDecor.mjs:123-155`).
- É o nó 1 do fio `ball` (PLANO-COMPLETO §2.3) e a peça menos visível da sala: exige olhar 45° para
  baixo; no escuro passa despercebida. A pesquisa pede dois objetos lado a lado (a bola de basquete
  "pesada demais" e a câmara "mole demais"); só a câmara existe.
- Correção: subir o nicho para 0,95–1,25 m (ou trocar por um pedestal ao lado da tela) e modelar a
  bola de basquete de 8 gomos como par não interativo.
- Teste: validador — centro de toda peça examinável entre 0,8 e 1,9 m, salvo `examine: 'in-place'`.

**H-17 · S4 · Materiais e imagens trocados**
- Câmara de BORRACHA e traje de LÃ usam `leather-worn` (`bake.mjs:292, 331`).
- `holyoke-frieze-03` estica o retrato do Morgan de 314 × 475 px numa faixa de 2,35 × 0,76 m com
  corte `cover` (`museum.ts:1332`, `RoomWallArt.tsx:69-89`): uma tira borrada do rosto, 134 px/m.
- Quatro fotografias cobrem sete usos (prédio de 1902 duas vezes, ginásio duas, Morgan duas).

### C. A cadeia retrato → fato → teclado (1896)

O texto fecha nas duas línguas: a pergunta do teclado (`pt-BR.ts:385`, `en.ts:366`) e a plaqueta
(`pt-BR.ts:358-359`, `en.ts:339-340`) usam a mesma frase e o mesmo ano, e `test-opening-flow.ts:971-992`
prova isso. O que não fecha:

**H-18 · S2 · A plaqueta só aparece com um gesto que ninguém faz**
- Onde: `museum.ts:457-468` (`localPosition [0,-0.28,0.03]` → a "normal" calculada aponta para BAIXO).
- Simulado do ponto de visita (1,14 m, olhando 15° para cima): dot inicial −0,31; **arrasto vertical
  de ~100 px para cima** revela; arrasto horizontal de qualquer tamanho nunca revela (melhor dot
  −0,31); para baixo, só depois de ~590 px (três quartos de volta). Somado a H-04 (moldura sem foto)
  e H-05 (régua de baixo sob o painel).
- A etiqueta sempre visível do retrato mostra 1895 e 1891 (`pt-BR.ts:354-355`): quem não inclina a
  moldura tenta esses dois e erra.
- Correção: pôr a data no **verso** — é o que o plano manda ("a letra manuscrita no verso da
  fotografia", PLANO-DO-ZERO §6.4): hotspot com normal −Z, descoberto ao virar a moldura de lado, e
  texto real no objeto (etiqueta de papel colada no fundo, com `RoomText`), para o jogador LER 1896
  na peça e não só na lista do painel.
- Teste: `test:examine` — o hotspot que revela o fato de uma tranca é alcançável só com arrasto
  horizontal ≤ 250 px a partir do lado de visita, e não nasce visto.

**H-19 · S2 · A escada de dicas do teclado não sobe**
- Onde: `LockPanel.tsx:137-139, 145, 147-158, 182-185, 65-77`.
- (a) A pergunta (`fact.claimKey`) já está no topo desde o primeiro segundo (`:145`); o degrau de
  90 s imprime a mesma frase de novo (`:184`). Informação nova: zero.
- (b) Três erros revelam o primeiro dígito: "1". Todo ano do museu começa com 1 ou 2.
- (c) Tempo e tentativas zeram a cada abertura (`:65-77`): quem erra duas vezes, sai para procurar e
  volta, recomeça.
- (d) "Você viu isto em algum lugar da Ala 1" (`pt-BR.ts:108`) é falso para quem ainda não foi lá.
- (e) Sem som de erro nem de abertura (`museumAudio.lockDenied/lockRelease` existem e não são
  chamados); `lock.opened`, `lock.hint.highlight`, `lock.hint.audio`, `lock.hint.reveal` são chaves
  mortas (`pt-BR.ts:107, 395-397`). O contrato do schema (`schema.ts:149-156`: a linha da placa
  acende, o docente repete o ano) não existe no runtime.
- Um jogador que não inclina a moldura e não abre o armário A fica com "1···" para sempre: a tranca
  que "nunca falha, só espera" falha.
- Correção: regra pura `lockHintRungs(lock, tempo, tentativas, progresso)`: 45 s → nome da peça e da
  sala (`sourceExhibitId` → "Retrato de William G. Morgan, Ala 1"); 90 s → "a resposta está no verso
  da moldura"; 3 erros → dois dígitos; 5 erros → três. Contadores por tranca na sessão. Se o fato já
  está em `factsKnown`, o painel diz "Você anotou isto no caderno" e abre a aba certa.
- Teste: `test:opening-flow` — cada degrau acrescenta texto que não estava na tela; o último degrau
  nunca é um dígito comum a todos os anos; fechar e reabrir não zera.

**H-20 · S3 · `factsKnown` é estado morto**
- Onde: `store.ts:64, 800-804` (grava); nenhum leitor em `src/` (só `hasSavedProgress`).
- Três dos quatro fatos (`first-rulebook`, `filipino-spike`, `six-a-side`, `museum.ts:67-114`) não
  abrem nada nem aparecem em lugar nenhum. Não há toast de "fato aprendido" nem aba de anotações.
- Correção: aba "Anotações" no caderno (pergunta + valor + onde foi lido), toast ao aprender, e uso
  em H-19. É o que liga "ler" a "abrir" de forma visível.
- Teste: `test:opening-flow` — aprender um fato faz crescer a lista da aba e dispara um toast.

**H-21 · S3 · A dica curta do Jorge perde o endereço**
- Onde: `pt-BR.ts:195` ("A data tá nas placas da Ala 1. Lê.") contra a cheia `:180-181` (cita o
  retrato). A partir da 7ª chamada só a curta toca (`museum.ts:700-704`), e não há placas legíveis
  (H-49).
- Correção: "Gaveta do Otávio: uma data. Retrato do Morgan, Ala 1. Vira a moldura."
- Teste: `test:radio` — toda dica curta contém o mesmo substantivo-alvo da cheia (lista por dica).

**H-22 · S3 · O texto em volta do código afirma a versão contestada; 1896 está em cinco chaves**
- PESQUISA-CONTEUDO, correções da era 1 (L142-144): data e local do rebatismo são disputados (IVHF:
  "início de 1896, numa visita a Halstead"; Wikipedia/Morgan: dezembro de 1895); mandam separar os
  dois fatos e baixar a confiança. O jogo afirma "numa demonstração em Springfield" (`pt-BR.ts:359`),
  "Em julho de 1896, ao demonstrar o jogo…" (`:357`), "foi lá que ele ganhou o nome" (`:365`) e
  "Halstead, assistindo… propôs" (`:376`). O fato está como `confidence: 'high'` (`museum.ts:49`).
- PLANO-COMPLETO §4.2 regra 1: o número-código aparece como algarismo em exatamente UMA chave. "1896"
  está em cinco (`exhibit.handbook-1897.catalogue`, `exhibit.portrait-morgan.catalogue`,
  `hotspot.portrait-morgan.date.label`, `exhibit.photo-gym.catalogue`, `document.halstead.title`). O
  lint prometido (§13.2) não existe.
- Correção: redigir "Em 1896 o nome Volley Ball substituiu Mintonette, por sugestão de Alfred T.
  Halstead; se foi na demonstração de 7 de julho em Springfield ou numa visita anterior, as fontes
  divergem". Decidir e documentar: na ala-tutorial a redundância é deliberada (lista de exceções do
  lint) ou o ano fica só na moldura e no documento do arquivo.
- Teste: lint `numeral-exclusivity` no `npm run check`, com lista de exceções por tranca.

**H-23 · S3 · O prêmio da cadeia contradiz o plano e promete o impossível**
- Onde: `pt-BR.ts:101-102` ("três medalhas. Uma de cada era que você catalogar por inteiro").
- PLANO-COMPLETO §2.2: as medalhas vêm de duas trancas e um ritual (Paris, Tóquio, Global), não de
  catalogar; e são seis eras, não três. Hoje nem a Ala 1 pode ser catalogada por inteiro (H-01).
- Correção: reescrever o bilhete com o desenho real (e sem prometer mecânica que não existe ainda).
- Teste: revisão de roteiro; `validateOpening` pode exigir que toda credencial citada exista em `LOCKS`.

### D. Entrada no escuro, energia e luz

**H-24 · S2 · Dois dos sete spots autorais nunca acendem**
- Onde: `galleryLightRig.ts:67-74, 93-102` (`sampleEvenly(fixtures, 5)`), `museum.ts:1287-1293`.
- Com sete `ceiling-spot`, ficam os índices 0, 2, 3, 5, 6. Apagados para sempre: o do **centro da
  vitrine** (`[0,4.2,6.3] → [0,1.4,7.25]`) e o **da rede** (`[0,4.2,-6.3] → [0,1.15,-5.25]`). O
  comentário promete que "cada alvo é autoral".
- Cobertura calculada com a sala acesa: `portrait-morgan` e `guide-1916` — nenhum cone principal;
  `ball-spalding` (o herói) — nenhum, só o wash a 5,4 m; `net-1897` — nenhum cone e fora do wash.
- Correção: ou a sala declara no máximo 5 focos e os re-aponta (herói, vão do retrato, vão do
  manual, rede, tela de entrada), ou o pool passa a 7 + wash. O validador reprova foco excedente.
- Teste: `test:render-performance` com as salas REAIS — todo `ceiling-spot` com `lightTarget` recebe
  um slot; toda peça examinável cai em ≥ 1 cone principal.

**H-25 · S3 · O quadro de força não responde**
- Onde: `PowerControls.tsx:115-169` (malha estática), manifesto (`breaker-panel__indicator` em
  `glass-green`, `__handle` fixo), `powerControlLightRig.ts:61-66`, `RoomLighting.tsx:134-139`.
- A "luzinha vermelha" do Jorge é um point light sem fonte visível sobre uma lente VERDE; a alavanca
  não se move; o som é o sino genérico; as luzes sobem num frame (o plano chama isso de "o bloom de
  luz… a satisfação de matar o zumbi").
- Correção: reutilizar o contrato dos dispositivos (`__led` vermelho → verde, `Devices.tsx`); girar
  `__handle` num pivô; estalo de contator; rampa de 1,2 s com os focos em cascata.
- Teste: `test:power` — `powerControlVisual(powered)` devolve material do LED e ângulo da alavanca;
  rampa parametrizada e pura.

**H-26 · S3 · O quadro fica atrás de quem entra e a dica não diz onde**
- Onde: `museum.ts:1230` (`[5.86, 1.05, -4.2]`, parede leste; a porta está em z = −2);
  `pt-BR.ts:178-179` ("…só dela, lá dentro"). No átrio a mesma dica dá parede e vizinhança.
- Pelo cálculo, o clarão do piloto (alcance de 2,4 m) fica fora do campo de visão de quem cruza a
  porta olhando para oeste [conferir no navegador: `?qaCamera=-10.2,0,-2,1.5708,0`, sem `qaPower`].
- Correção: "na mesma parede da porta, à direita de quem entra"; piloto visível (H-25); ou mover o
  quadro para o campo de visão da entrada.
- Teste: `test:opening` — do ponto de entrada, com a orientação de entrada, o piloto ou seu clarão
  cai dentro do frustum.

**H-27 · S3 · Nada acontece depois que a ala acende**
- Onde: `museum.ts:819-852` (três chamadas, todas da abertura), `:563-566` (lista).
- Ligar a Ala 1, catalogar uma peça, abrir um armário, aprender 1896, abrir a gaveta: nenhuma dessas
  ações dispara fala, risco de lista ou próximo passo. A ala termina em silêncio.
- Correção (dado, não código): chamadas `porter-holyoke-lit`, `porter-first-catalogued`,
  `porter-drawer-open`; item de lista "Ala 1: n/8 catalogadas" com `ProgressCondition` nova
  (`roomCatalogued`).
- Teste: `test:radio` — cada marco da ala tem exatamente uma chamada que o segue.

**H-28 · S4 · Som da sala sem leitor**
- `museum.ts:1348-1356` declara `holyoke-clock` ("ambience/wall-clock") em `[-5.5, 2.6, 4]`; não há
  leitor de `room.audio` (HANDOFF §7.4) e não há relógio modelado nesse ponto.

### E. Portas e o atalho de mão única

**H-29 · S3 · O atalho nunca passa a abrir dos dois lados**
- Onde: `transitionDoorTopology.ts:182-208` (bloqueia sempre que `opensFrom ≠ sala atual`);
  `schema.ts:583-584` ("for the first time") e o comentário de `canOpenTransitionDoor` ("that has
  not opened before") prometem um desbloqueio que não existe; `Progress` (`store.ts:57-85`) não tem
  campo para portas.
- Cenário: abrir por dentro, atravessar, a porta fecha (0,55 s) e do átrio volta a dizer "Abre pelo
  outro lado" — para sempre. Como as duas portas da ala estão na mesma parede, o ganho é ~9 m.
- Correção: `progress.doorsReleased` (com entrada em `migrateProgress` e em `LIST_FIELDS`);
  `transitionDoorBlock` recebe o conjunto liberado; toast "Atalho destrancado" na primeira abertura.
- Teste: `test:transition-door` — depois de aberto por dentro, o lado do átrio abre; um save antigo
  sem o campo carrega; `test:navigation` ganha a rota átrio → Holyoke pelo atalho.

**H-30 · S4 · O atalho não tem cara de atalho**
- Mesma folha dupla da entrada, sem barra (o plano fala em "porta com barra") e sem placa do lado de
  dentro (`museum.ts:1253-1254`). No escuro, as duas portas da parede leste são indistinguíveis.

### F. Colisão

**H-31 · S3 · O jogador atravessa a rede, o manequim, a bola de treino e os pedestais**
- Onde: `bake.mjs:240-245` (peças não ganham colisor, por decisão), `MuseumScene.tsx:203-211`
  (`floor` e `case-wall` → sem suporte, sem colisor); manifesto: `gym-training-set` só tem colisor nas
  clavas (a bola de 50 cm e a corda não), `label-angled` não tem.
- Cenário: andar por dentro dos postes de 2,18 m e da malha; atravessar o manequim (a câmera entra
  na forma e a vê por dentro); atravessar a bola de couro de 50 cm.
- Correção: `ExhibitData.collider?: 'bounds' | 'posts' | false`; para a rede, duas caixas nos postes
  e uma lâmina na faixa; para o manequim, cilindro; colisor por família em receitas compostas.
- Teste: `test:navigation` — caminhada frontal não cruza poste, manequim nem a bola de treino; SAT de
  interpenetração passa a incluir peças de chão.

**H-32 · S4 · O nicho da tela de entrada sai 24,5 cm além do colisor**
- `holyokeDecor.mjs:129-155` (nicho até z = 0,55) contra o colisor do corpo (até 0,305).

### G. Documentos, arquivo, mapa e caderno

**H-33 · S3 · O mapa lista trancas que o jogador nunca viu**
- Onde: `MuseumMap.tsx:216-221` filtra só por "não aberta"; o comentário logo acima (`:206-210`) diz
  que mostrar tranca não vista é spoiler.
- Correção: `progress.locksSeen` (gravado ao abrir o teclado ou focar o móvel trancado).
- Teste: `test:opening-flow` — jogo novo: lista vazia; depois do primeiro E na gaveta: um item.

**H-34 · S3 · O caderno não diz o que falta**
- Onde: `Journal.tsx:31-56` (só peças já catalogadas; `catalogue.incomplete` só existe no painel de
  exame); `MuseumMap.tsx:139-154` (pontos sem nome); armário com documento não lido não tem marca,
  embora pese no estado da sala (`:91`).
- Correção: catálogo com as vistas-mas-não-viradas ("falta virar"), agrupado por sala; ponto do mapa
  com título ao tocar; ícone de gaveta para arquivo não lido.
- Teste: regra pura `catalogueRows(progress)` com os três estados.

**H-35 · S4 · Abrir é ler**
- `Containers.tsx:282-286` marca todos os documentos do armário como lidos no E. O armário A despeja
  138 palavras num painel de 46vh. Aceitável; vale separar por documento com "próximo".

**H-36 · S3 · "Continuar" renasce sempre no escritório**
- Onde: `store.ts:885-910` (`currentRoom: SPAWN.room`); `lastRoom` é gravado e nunca usado.
- Quem salvou na Ala 1 refaz ~30 m e duas portas a cada sessão. Com seis alas isso vira atrito real.
- Correção: renascer num ponto de chegada autoral por sala (`RoomData.arrival`), testado pela
  navegação.
- Teste: `test:room-runtime` — todo `arrival` tem piso e fica fora de colisores.

**H-37 · S3 · Não existe painel de ajustes** (transversal)
- `ui.settings`, `ui.brightness`, `ui.motion*`, `ui.quality`, `ui.readingMode` não são usados em
  nenhum componente; só o idioma, e só na tela de título (`MuseumApp.tsx:103-115`). O próprio store
  diz que sem brilho o escuro é ilegível num telefone (`store.ts:38-40`).

### H. História — o que as correções da pesquisa derrubam

(`docs/PESQUISA-CONTEUDO.md:114-195`; a seção de correções vence a tabela de marcos.)

**H-38 · S2 · "Deixou a YMCA em 1900"** → foi em **1897**, para a General Electric e depois a
Westinghouse (correção 3, L139-141). `pt-BR.ts:357`, `en.ts:338`. Está na ficha do retrato, a mesma
que carrega o código. Teste: asserção de conteúdo no molde de `test-opening-flow.ts:994-1003`.

**H-39 · S2 · "cerca de meio pé acima da cabeça de um homem médio"** → "**logo acima** da cabeça"
(L154-156: "meio pé" implica homens de 1,83 m em 1895). `pt-BR.ts:325`; o inglês diz outra coisa
("above the average man", `en.ts:306`); o comentário do gerador repete o erro (`kit.mjs:684-685`).
Teste: asserção — nenhuma das duas línguas contém "meio pé"/"half a foot".

**H-40 · S3 · "em duas palavras… até 1952"** → sem fonte localizada (L160-162). `pt-BR.ts:335`,
`en.ts:316`. Trocar por "ao longo das primeiras décadas; a forma em uma palavra se firmou em meados
do século XX".

**H-41 · S3 · "Dr. Frank Wood"** → **Woods**, grafia do IVHF citando o guia de 1916–17 (L157-159).
`pt-BR.ts:343-344`, `en.ts:324-325`.

**H-42 · S3 · O ginásio: endereço e datas dados como fato; a descrição não bate com a foto**
- "na esquina das ruas High e Appleton" e "serviu de 1886 a 1943" (`pt-BR.ts:363, 365`): a correção
  8 (L172-174) manda tirar do texto afirmativo.
- A etiqueta descreve "treliças de aço rebitado" (`pt-BR.ts:363`); a fotografia real
  (`photo-holyoke-gym-1897`) mostra argolas, escada, cavalo com alças, colchões, pesos de polia,
  clavas na parede e a **pista de corrida suspensa** — não treliças. A frase veio da tipologia da
  pesquisa, não da imagem.
- Correção: descrever o que a foto mostra; o hotspot `apparatus` ganha texto próprio (H-11).

**H-43 · S3 · A etiqueta do traje tem nota de direção de arte**
- "Nada de tecido sintético, nada de branco plástico: tudo é pigmento, tintura ou óxido"
  (`pt-BR.ts:349`, `en.ts:330`) é a paleta da pesquisa (L16) colada numa etiqueta de visitante.
- "sapatilha de lona com sola de borracha": a pesquisa dá sola de COURO para 1895 e a correção tira
  a data da sola de borracha (L190-192); e o modelo não tem sapato (`kit.mjs:834-…`: base, coluna,
  torso, malha, calça).
- A ficha (`pt-BR.ts:351`) explica a rede baixa pelo suor da lã: glosa causal sem fonte, o padrão
  que a auditoria da pesquisa condena.

**H-44 · S3 · "O guia que registrou a bomba"**
- Título e etiqueta (`pt-BR.ts:339-341`) atribuem ao guia Spalding de 1916–17 o registro do ataque
  filipino; a pesquisa só lhe atribui a estimativa de Cubbon e o crédito a Woods e Lynch (L44-48).
- O hotspot `credit` ("Morgan credita…") é o que grava o fato `filipino-spike`
  (`museum.ts:409-413`): o fato aprendido não está no texto lido.
- Correção: separar — a etiqueta do guia fala do guia; a bomba ganha documento de arquivo próprio.

**H-45 · S4 · "As três respondem ao mesmo problema"** (`pt-BR.ts:380`, `en.ts:361`): o parágrafo
lista quatro mudanças; e a divergência da FIVB (1922 para os três toques, L88) não é declarada.

**H-46 · S4 · Miúdos:** título "O primeiro regulamento impresso" contra a própria ficha ("as dez
regras haviam saído um ano antes", `pt-BR.ts:331, 335`); "Censo de 1916" é a estimativa de um
autor (`pt-BR.ts:345`); etiqueta da câmara diz "leve demais, boiava" (`pt-BR.ts:310`) onde a
pesquisa e o plano dizem "mole demais".

**H-47 · S3 · O mural "de época" é ilustração gerada e não diz**
- `museum.ts:1309-1319` (`showCredit: false`); a legenda já existe ("Ilustração autoral gerada para
  este museu", `credit.ts:32-35`). A imagem imita fotografia de 1890, com rede alta e funda — o
  oposto da etiqueta ao lado (1,98 m, 61 cm de largura). O final do jogo é "continue declarando".
- Correção: ligar a legenda; corrigir a rede na ilustração.
- Teste: validador — mídia `procedural` exibida em parede exige legenda visível.

**H-48 · S4 · A rede modelada não é a rede descrita**
- `kit.mjs:687-749`: vão de 4,8 m, fita de lona em cima E embaixo, malha esticada, postes torneados.
  A pesquisa (L32-36) dá 8,23 m, fita só em cima (embaixo, bainha de corda), barriga visível no meio
  e nenhum poste em muitos ginásios (rede amarrada aos espaldares). A etiqueta cita os 27 pés
  (`pt-BR.ts:325`) diante de uma rede de 4,8 m; a ficha diz "fita de lona nas bordas" (`:327`).
- Correção: dizer "trecho reconstruído" na ficha; tirar a fita de baixo; dar barriga à malha.
- Teste: `test:kit` — a borda inferior da rede não usa a família da fita; flecha central > 0.

### I. Sinalização e painéis

**H-49 · S2 · Nenhuma etiqueta de peça é legível no mundo**
- `RoomText` só é usado por `RoomSignage`, `FramedMedia` e `RoomWallArt`. Em branco: 3
  `label-angled` (`museum.ts:1270, 1281, 1282`), 5 mesas de leitura da vitrine
  (`holyokeDecor.mjs:279-295`) e 3 folhas do quiosque (`:546-562`, o comentário admite "three blank
  beige tablets").
- PLANO-DO-ZERO §4.1: etiquetas de parede "sempre visíveis, sem interação". Jorge: "LIA. AS. PLACAS."
  (`pt-BR.ts:232-233`). Hoje ler exige E em cada peça.
- Correção: título + primeira frase em `RoomText` nas 8 placas (dado: `ExhibitData.labelPlate`);
  quiosque com a linha do tempo da ala em três folhas (1895 · 1896 · 1916–1920).
- Teste: `test:signage` — toda peça tem uma placa com texto a ≤ 1,5 m; altura de letra legível a
  1,2 m; nenhuma superfície `graphics`/`paper` de leitura fica sem conteúdo.

**H-50 · S4 · Placas no lugar errado:** há pedestal ao lado do conjunto de treino, que não é
examinável (`museum.ts:1282`); a rede e a câmara não têm nenhum.

**H-51 · S4 · Créditos do friso escondidos:** as legendas ficam em y ≈ 2,60–2,65, atrás da cabeça
da vitrine (topo 2,64, 66 cm de projeção): invisíveis de qualquer ponto do piso
(`museum.ts:1329-1343`, `RoomWallArt.tsx:160-179`). A do friso 01 é CC BY-SA.

### J. Toque

**H-52 · S3 · Exame no telefone:** painel de 179 px numa tela de 390 px (H-05); lista de hotspots
abaixo da dobra (H-07); sem pinça para aproximar; a peça na canela (H-16) exige o direcional de
câmera até −45°. Segue pendente o teste em aparelho real (HANDOFF §7.1).

### K. Carga de leitura

**H-53 · S3 · A ala tem 1.063 palavras; cinco etiquetas passam do orçamento**

| Camada | pt-BR | en |
|---|---|---|
| 8 etiquetas | 342 | 318 |
| 8 fichas de catálogo | 369 | 331 |
| 13 hotspots | 113 | 95 |
| 3 documentos | 203 | 194 |
| 8 títulos | 36 | 36 |
| **Total** | **1.063 (≈ 5,9 min a 180 ppm)** | **974** |

- Acima de ~40 palavras: manual 51, rede 50, Spalding 43, guia 42, traje 41. A ficha do Morgan tem
  65; os documentos, 65–72.
- Meta do plano: uma pessoa nova termina a ala em 8 min. Só ler tudo consome 6; o visitante casual
  (etiquetas) gasta ~2 min, dentro do previsto.
- `validatePacing` (`validate.ts:941-962`) conta peças, não palavras.
- Correção: etiqueta ≤ 40 palavras em pt-BR; o excedente desce para a ficha.
- Teste: `validatePacing` — palavras por etiqueta, por ficha e por documento, nas duas línguas.

---

## 4. Tabela dos hotspots

`*` = obrigatório para o catálogo. "Alcance" é do ponto de visita real, um eixo de arrasto por vez.

| Peça | Hotspot | Texto mostrado | Revela fato | Alcance hoje |
|---|---|---|---|---|
| ball-improvised | valve* | **errado** (cadarço da Spalding) | — | ~300–350 px vertical; aponta o fundo, o bico está em cima |
| ball-spalding | lacing* | certo | — | cone de 8,5°; impossível de leste/oeste; 244 px do norte |
| ball-spalding | maker* | certo, mas o modelo é um bico de válvula | — | **imediato** vindo do norte |
| ball-spalding | seam | certo | — | impossível por um eixo só |
| net-1897 | tape* | certo | — | **impossível** |
| net-1897 | socket | certo | — | **impossível** |
| handbook-1897 | innings* | certo | first-rulebook (o texto não diz 1897) | 48 px horizontal |
| handbook-1897 | ball-spec | certo | — | 148 px horizontal |
| guide-1916 | credit* | certo | filipino-spike (**o texto fala de outra coisa**) | **imediato** |
| guide-1916 | census | "censo" é estimativa | — | 126 px horizontal |
| gym-suit | knit* | **errado** (costura da bola) | — | **impossível** |
| portrait-morgan | date* | certo (1896) | springfield-renaming | 102 px vertical para cima; nunca na horizontal |
| photo-gym | apparatus* | **errado** (soquete da rede) | — | tolerância de 1,5°: impossível na prática |

---

## 5. Prometido para esta ala e não implementado

Do PLANO-COMPLETO:
- **Distintivo `indoor`** (§2.1): "catalogar as duas bolas e a rede de 1897" → abre a gaveta `indoor`
  do armário do registrador e os dossiês de regras das Alas 2 e 5. Não existe: nenhuma peça declara
  `unlocks`, `UnlockEffect` não é usado por conteúdo, não há tranca de distintivo nem armário do
  registrador. E a rede não é catalogável (H-01).
- **Fios** (§2.3): `ball` nó 1 (câmara nua), `net` nó 1 (rede), `rules` nó 1 (manual/guia). As peças
  declaram `threads`, mas nenhum código lê o campo: sem progresso de fio, sem interface, sem o
  gatilho "dois fios abrem o mezanino".
- **Lint de exclusividade de numerais** (§4.2, §13.2): não existe (H-22).
- **Estado de proveniência por peça** (§11: original / reconstrução de época / fac-símile, para o
  livro de tombo do final): o schema não tem o campo; hoje a informação vive solta na prosa das
  fichas ("Reprodução", "Fac-símile").

Do PLANO-DO-ZERO (fatia vertical, §9 Fase 0 e §4.1, §6.3):
- etiquetas de parede sempre visíveis (H-49); ~12 documentos de arquivo por ala (há 3); 2–3
  histórias orais; 1 fonte de áudio posicional (H-28); 1 porta com credencial; escada de dicas como
  especificada (H-19); auto-anotação só de trancas tocadas (H-33); painel de ajustes (H-37); passos
  com troca de superfície (`PlayerController.tsx:496` passa sempre `'wood'`).

---

## 6. Suíte proposta

Nova: **`npm run test:examine`** (módulo puro `src/engine/examineRig.ts` + `scripts/test-examine.ts`):
alcance de todo hotspot obrigatório; nenhum nasce visto; enquadramento em 16:9 e 844 × 390; eixos
relativos à câmera; peça inteira fora do painel; fato de tranca alcançável só na horizontal.

Ampliar:
- `validate:content` — `hotspot-label-foreign`; `scaleNoteKey`; altura de exibição; legenda de mídia
  gerada; palavras por texto; foco de luz excedente; lint de numerais.
- `test:kit` — peças × `layout` da vitrine; hotspot × anchors da receita; impressão × moldura.
- `test:render-performance` — rig com as salas reais: todo foco autoral aceso, toda peça num cone.
- `test:navigation` — colisores de rede, manequim e bola de treino; rota pelo atalho nos dois sentidos.
- `test:transition-door` — atalho liberado e persistido; migração de save.
- `test:opening-flow` — escada de dicas; aba de anotações; trancas vistas; asserções históricas
  (1897 da saída da YMCA, sem "meio pé", sem "1952", "Woods").
- `test:radio` — dica curta com alvo; uma chamada por marco da ala.
- `test:power` — estado visual do quadro; rampa de luz.
- `test:signage` — placa com texto por peça.
- `test:room-runtime` — impressão dentro do grupo da peça; ponto de chegada por sala.

---

## 7. Ordem sugerida

1. **Motor de exame** (H-01, H-02, H-03, H-04, H-05, H-06, H-07, H-10) com `test:examine` primeiro:
   a suíte tem de reprovar o estado atual antes de qualquer correção.
2. **Vitrine e hotspots de conteúdo** (H-11, H-12, H-13, H-14, H-18) — depende do item 1 para o
   formato novo de hotspot (`normal`, anchors).
3. **Cadeia do código** (H-19, H-20, H-21, H-22, H-23) e **texto histórico** (H-38 a H-47).
4. **Luz e energia** (H-24, H-25, H-26, H-27) — o momento de acender a ala.
5. **Etiquetas no mundo** (H-49, H-50, H-53) — a maior mudança de percepção por menor custo.
6. **Atalho, colisão, mapa e caderno** (H-29, H-31, H-33, H-34, H-36).
7. Miúdos e polimento (H-08, H-09, H-15, H-16, H-17, H-28, H-30, H-32, H-35, H-37, H-48, H-51, H-52).

Depois disso a ala fica pronta para receber o que o plano promete (distintivo `indoor`, nós dos
três fios, campo de proveniência), que hoje não teria onde se apoiar.
