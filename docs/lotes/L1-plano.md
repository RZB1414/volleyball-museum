# L1 — Correções no ar: plano do lote

Escrito em 2026-10-04, sobre o commit `98c24b3` (`main`). É o passo 1 de §9.1 de
`docs/PLANO-ATE-O-FINAL.md` para o lote L1: cada tarefa com o arquivo e a linha de hoje, a mudança
exata, o teste que a prova (e por que ele reprova o estado de hoje), os textos finais em pt-BR e em
inglês, as receitas tocadas, o delta previsto por sala, as dívidas datadas e a rota de verificação
no navegador. **Este arquivo não muda código.** As linhas citadas são as de `98c24b3`; o plano
mestre cita as de `82756c4`, e a preparação deslocou algumas.

**Executado em 2026-10-04.** Este plano fica como foi escrito. O que saiu, as medições do passo 6
e os pontos em que a execução se afastou dele (uma quinta linha de catraca, o teto do par em 125,
duas checagens a mais na vitrine corrida, o jogador do teste de alcance que mantém o quadro no
centro da tela) estão em `docs/HANDOFF.md`, §10.

Os números marcados **[medido]** saíram de `docs/lotes/P0-linha-de-base.md` ou de uma simulação em
Node feita para este plano com o código real (colisão, manifesto do bake, fonte do texto 3D). Os
marcados **[previsto]** são conta; quem os confirma é o passo 6.

## 0. Resumo

O que muda para o jogador:

- o nome é «Museu do Voleibol» em todo lugar (D5);
- o Jorge deixa de dizer «parede oeste», de proibir uma descida que não existe e de mandar a
  «três medalhas e um cofre»; a dica curta da gaveta volta a dizer onde está a data;
- os fatos errados ou sem lastro saem das etiquetas, fichas e documentos da Ala 1 e do saguão, e
  as doze etiquetas passam a caber em 40 palavras nas duas línguas;
- o quadro da Holyoke vai para a parede oposta à entrada, com lente vermelha acesa: vê-se da porta;
- o quadro do saguão deixa de sumir quando o jogador encosta nele;
- as quatro peças da vitrine corrida ficam no centro de um vão, apoiadas ou penduradas de verdade,
  e o retrato do Morgan (a fonte do código) deixa de ser cortado;
- a porta do escritório abre mesmo que uma imagem do saguão não chegue, e uma imagem que falha não
  derruba mais a página.

O que não muda: nenhum final novo, nenhum motor novo, nenhuma textura nova, nenhuma dependência.
O kit do átrio continua em 56 de 56 lotes e o quadro continua custando três draws.

## 1. Escopo conferido

Cada linha do plano mestre marcada para L1, e a tarefa deste plano que a fecha.

| Origem | O que pede em L1 | Tarefa |
|---|---|---|
| ÁT-A1 | proxy de dupla face, colisor no quadro, alvo fora do ponto onde a cápsula para | T1 |
| ÁT-A3, H-25 (parte de L1) | lente emissiva; nós `__led` e `__lever` nos dois quadros | T2 |
| H-26, ÁT-B4 (posição), AS-H14 | quadro da Holyoke na parede oeste; teste de farol; dica com direção | T3, T7 |
| H-13, AS-H1, AS-H3 (o recheio dos vãos das quatro peças), CAP-1, M40a | `layout` da vitrine corrida; peça × `layout` | T4 |
| ÁT-G2, Anexo E #8 | tempo-limite da porta e captura da falha de imagem | T5 |
| ÁT-H3, §6.5 (`test-navigation.ts`) | rotas a partir de onde o jogador chega; alcance de onde a cápsula para | T6 |
| ÁT-A5 (falas), ÁT-D2 (fala), H-21, «a última dica e a fala do subsolo» | falas do Jorge | T7 |
| ÁT-F3 (nome), D5 | «Museu do Voleibol» | T8 |
| Frente 12 e a tabela de acréscimos de 3.12; H-22 (texto) | texto histórico | T9 |
| M0 | nove validadores e a tabela `knownDebt` | T10 |
| M14, M16 (catracas), CAP-17 | `kit.glb`, bytes por caminho, programas, textura residente | T11 |
| M11 (`fact-code-uncaptured`); fontes de `FACTS` e a URL morta | **feito em P0** (item 5): nada a fazer | — |
| Conteúdo de L1: `PESQUISA-CONTEUDO.md` | registro das correções | T12 |

Fora de L1, por decisão do plano mestre, e que este lote não toca: o bilhete do Otávio
(`document.predecessor.body`, H-23, L3), o `kind: 'letter'` de `doc-halstead` (L8), o alcance do
piloto (ÁT-B4, L10), a alavanca que desce e o som (ÁT-A3, L10), a data no verso do retrato (H-18,
L4), os três rótulos de detalhe emprestados de outra peça (H-11, L4), «virava as peças» nas falas
de paciência (L4), a rede modelada (H-48, L14).

## 2. Decisões deste plano

Pontos que o plano mestre deixava [a validar] ou em que duas passagens dele divergiam.

| # | Ponto | Decisão | Por quê |
|---|---|---|---|
| DL1-1 | posição do quadro da Holyoke | `position: [-5.875, 1.15, 2.2]`, `rotationY: Math.PI / 2` | z = 2,2 é a posição validada em P0 (Anexo E #4): 20,8° do eixo de entrada, sete raios livres de três pontos do vão. P0 mantinha x = −5,86 (15 mm do reboco) para os dois quadros ficarem iguais; 4.4b do plano fecha AS-H14 em L1 para este quadro, e a 1,15 m ele já passa por cima do roda-meio: encosta no reboco (x = −5,875). O do átrio continua solto até L10 |
| DL1-2 | o que o teste de farol mede (H-26: «≥ 6 px») | o **quadro** (0,46 × 0,64 m) subtende ≥ 6 px nas duas dimensões, a lente é emissiva e o piloto fica dentro do próprio alcance da face do quadro; a lente **não** cresce para 12 cm | a 11,49 m a lente de 5,8 cm dá 3,0 px [medido]; o quadro dá 24 × 33 px [medido em Node; P0 mediu 22 × 33 na tela]. Engordar a lente muda a proporção do quadro nas duas salas, e L10 o redesenha como dispositivo |
| DL1-3 | a lente fica vermelha depois de religar? | não: `led-red` sem energia, `led-green` com energia, já em L1 (só troca de material) | o leitor da porta do escritório já ensina vermelho → verde. Uma lente que fica vermelha para sempre seria um estado que o jogo desmente. A alavanca que desce, o estalo e o halo curto continuam em L10 |
| DL1-4 | a exceção de ÁT-K1 (a lente pode somar um lote) | não é gasta | `handle` vira `lever` e `indicator` vira `led`: três nós antes, três depois. O teto do kit do átrio continua 56 em `test:kit-runtime`; o teto temporário de 58 lotes fica inteiro para o Livro de L3 |
| DL1-5 | em que vão fica cada peça da vitrine corrida | vão mais próximo de onde cada uma está hoje (tabela em T4); os dois vãos de quadro perdem a prateleira de cima e a régua de cima | menor deslocamento (0,43 a 0,95 m), a ordem na parede não muda e os gêmeos do friso continuam por cima |
| DL1-6 | tempo-limite da porta | 30 s **de jogo** contados enquanto a sala vizinha está montada e a descoberta (três limites de `Suspense` e texto) não fecha; passa disso, a sala aquece e abre com o que tem | o que trava hoje é a descoberta (P0, #8: «o aquecimento do átrio nem começa»); a fila de GPU já assenta sozinha em falha (`test:gpu-warmup`). O saguão começa a aquecer no spawn (a porta fica a 1 m), então os 30 s correm enquanto o jogador lê o caderno e acende a luminária; e sobra folga para rede lenta, que em menos tempo abriria a sala pela metade sem precisar |
| DL1-7 | `1896` em quantas chaves | duas, já em L1: `hotspot.portrait-morgan.date.label` e `document.halstead.title` | H-22 pede o texto em L1 e o lint em L2; a asserção de L1 conta as chaves, e o lint de L2 nasce verde |
| DL1-8 | nome em inglês | «Volleyball Museum» | é o que já dizem o título, a folha de rosto e a gravação da portaria (três de quatro usos), e é o nome do produto; «MUSEUM OF VOLLEYBALL», na dedicatória, tem 3,87 m contra 3,55 de medida e hoje quebra em duas linhas [medido com a fonte] |
| DL1-9 | título novo do guia sem mexer na etiqueta? | a etiqueta é reescrita junto | «Morgan conta a história» sobre um texto que só fala da bomba filipina seria incoerente, e «bomberino» não apareceu em nenhuma fonte aberta. O ataque fica na ficha, com «ficou conhecido como», até `doc-filipino-bomb` (L8) |
| DL1-10 | dica curta da gaveta (H-21: «Vira a moldura.») | «Plaqueta de baixo da moldura.» até L4 | em L1 a data ainda está na plaqueta, que só aparece inclinando a moldura; girar de lado nunca a revela (H-18). L4 leva a data ao verso e troca a fala |
| DL1-11 | `wall-fixture-off-the-wall` em L1 | só para controle de energia montado em parede | 4.4b e o Anexo C contam com o quadro da Holyoke fechado em L1 e o do átrio como dívida até L10; arte, placa e dispositivo entram em L9 (ÁT-A2) |
| DL1-12 | catraca de bundle dentro do `check` | `npm run test:bundle` constrói (`vite build`, 3,6 s) e mede | uma catraca que lê um `dist/` velho não prova nada; assim o `check` não depende de ordem |
| DL1-13 | chaves do dicionário sem uso (15) | três saem (`prompt.open`, `prompt.journal`, `lock.holyoke-power.mapLabel`); doze viram dívida datada | as três não têm consumidor previsto (a terceira nomeia uma tranca que não existe); as doze têm lote: ajustes (L16), modo leitura (L24), planta (L2), escada de dicas (L4) |
| DL1-14 | etiquetas de até 40 palavras | as doze, nas duas línguas, por teste, já em L1 | cinco das que L1 reescreve passavam de 40; depois de L1 nenhuma passa. L8 leva a regra para `validatePacing` e acrescenta fichas e documentos (H-53) |
| DL1-15 | textos vizinhos da mesma correção, fora das linhas de 3.12 | entram, declarados em T9: `ball-spalding.label` (25 a 27; «reconstrução»), `atrium-ball-tokyo-1964.label` e `atrium-ball-colour-1998.catalogue` (canal, não costura), «covinhas» nas três chaves que ainda diziam «dimples» | deixar a etiqueta ao lado dizendo o contrário da ficha corrigida seria corrigir pela metade |

## 3. Tarefas

Formato: **hoje** (arquivo:linha), **mudança**, **teste** (o que prova) e **vermelho hoje** (como o
teste reprova o estado atual antes do conserto, §9.1 passo 2).

### T1 — O quadro que some quando o jogador encosta (ÁT-A1)

**Hoje.**

- `src/engine/PowerControls.tsx:131-147`: o proxy é a caixa da peça com mínimo
  `PROXY_MINIMUM.powerControl`; `:163-166`: `<meshBasicMaterial />`, face única.
- `src/engine/Devices.tsx:290-302, 308-311` e `src/engine/Containers.tsx:123-135, 172-182`: o mesmo
  desenho, repetido.
- `scripts/bake.mjs:1089-1126`: `kitColliderParts` não tem `breaker-panel`; o manifesto sai sem
  colisor para o quadro.
- `src/scenes/MuseumScene.tsx:491`: `PowerControlLayer` não recebe `collision`.
- Medido: a cápsula para a 8,1 cm do plano da parede do quadro (x = −8,539), com o olho **dentro**
  do proxy (que avança 29,5 cm); o raio lançado de dentro de uma caixa de face única não acerta nada.

**Mudança.**

1. Novo `src/engine/interactionProxy.ts` (puro, só `three`): `PROXY_MATERIAL_PROPS = { side:
   DoubleSide }`, `paddedProxy(bounds, minimum)` (a conta que hoje está copiada em três arquivos) e
   `DRAWER_PROXY` (`[0, 0.85, 0.12]`, `[0.78, 1.7, 0.8]`). Os três componentes passam a usá-lo:
   `<meshBasicMaterial {...PROXY_MATERIAL_PROPS} />`. Sem mudança de comportamento além da face.
2. `scripts/bake.mjs`: `'breaker-panel'` entra em `kitColliderParts`, e o laço de `:1132-1156`
   ganha o caso do quadro, no molde de `partition__foot`: a caixa do colisor é a **união** dos
   limites de `breaker-panel` e `breaker-panel__*` (x ±0,23; y 0 a 0,64; z 0 a 0,2495), para a
   alavanca ficar dentro dele.
3. `src/engine/PowerControls.tsx`: `PowerControlLayer` recebe `kitBundle` e `collision` e registra
   o colisor com `registerKitColliders` (origem da sala, posição, rotação e escala do controle),
   como `Containers.tsx:108-117` faz. A luminária do escritório não tem colisor no manifesto e
   continua sem.
4. `src/scenes/MuseumScene.tsx:491`: passa `kitBundle={KIT_BUNDLE}` e `collision={collision}`.

Resultado medido com o conserto simulado: a cápsula para a 0,55 m do plano da parede, o olho fica
25,5 cm **fora** do proxy e o raio reto acerta a 0,255 m, nos dois quadros.

**Teste.** `npm run test:power`, três checagens novas, sobre um mundo de colisão montado em
`scripts/lib/museumWorld.ts` (casca real, kit, containers e controles de energia; é o
`buildWorld` de `scripts/test-navigation.ts:122-147` promovido e ampliado, T6):

- «do ponto onde a cápsula para diante de cada controle de parede, o raio do centro da tela acerta
  o proxy, dentro de `INTERACTION_REACH.powerControl`»: `movePlayer` real, andando reto contra o
  quadro a partir de 1,3 m, 4 s; proxy e material vindos de `interactionProxy.ts`;
- «nesse ponto o olho está fora do volume do proxy» (a regra: nenhum alvo contém o ponto mais
  próximo que a cápsula alcança);
- «um raio com origem dentro do proxy ainda o acerta» (a rede de segurança da dupla face).

**Vermelho hoje.** Com o módulo extraído nos valores de hoje (face única) e o manifesto sem
colisor, a primeira e a segunda reprovam no átrio (olho dentro, nenhum acerto) e a terceira
reprova em todos. Depois: dupla face e colisor, verde.

### T2 — Lente emissiva e os nós `__led` e `__lever` (ÁT-A3, H-25: a parte de L1)

**Hoje.**

- `scripts/bake/parts/fixtures.mjs:608-668`: `buildBreakerPanel` devolve `{ case, handle,
  indicator }`; a lente é um cilindro de 5,8 cm (`:659-661`).
- `scripts/bake.mjs:740-745`: `{ case: 'iron-cast', handle: 'brass', indicator: 'glass-green' }`.
  Manifesto: `breaker-panel` (540 triângulos), `breaker-panel__handle` (304),
  `breaker-panel__indicator` (48).
- `src/engine/PowerControls.tsx:115-169`: malha estática; depois de religado o quadro fica igual.

**Mudança.**

1. `fixtures.mjs`: as mesmas geometrias, com outros nomes: `{ case, lever, led }`, mais
   `anchors: { lens: [0.125, 0.505, depth + 0.061], leverPivot: [0, 0.305, depth + 0.047] }`.
   `lever` é a família inteira de hoje (aro, eixo, alavanca e punho): o aro e o eixo são cilindros
   no eixo do pivô, então L10 pode girar o nó em torno de `leverPivot` sem que eles se movam.
   O comentário do gerador explica isso.
2. `bake.mjs:740-745`: `{ case: 'iron-cast', lever: 'brass', led: 'led-red' }`. Três nós, como hoje.
3. `src/content/validate.ts`, em `validateBake` (`:1089-1095`): todo controle de energia mostra o
   próprio estado, por uma lente assada (`<part>__led`) ou por uma luz prática declarada
   (`light`): senão, `power-control-without-state`; e quem tem lente tem `<part>__lever`, o nó em
   que a mão age: senão, `power-control-node-missing`. Nenhum nome de receita no validador.
4. `src/engine/deviceNodes.ts`: `paintLenses(instance, part, material)`, o miolo de
   `useLensMaterial` (`Devices.tsx:88-104`) sem React; `Devices.tsx` passa a chamá-lo.
5. `src/engine/power.ts`: `powerControlLensMaterial(powered)` devolve `'led-green'` ou `'led-red'`.
6. `PowerControls.tsx`: `PowerControl` lê se a sala dona tem energia e pinta as lentes
   (`paintLenses`) num efeito. Controle sem lente (a luminária) não muda. `led-green` e `led-red`
   já são materiais da biblioteca, usados pelo leitor da porta: nenhum programa novo.

**Teste.**

- `validate:content`: os dois códigos novos (T10 traz os casos quebrados de propósito).
- `test:power`: «o quadro assado tem `__led` em `led-red` e `__lever`»; «a lente é `led-red` sem
  energia e `led-green` com energia, e os dois materiais emitem»; «`paintLenses` troca só o
  material dos nós de lente» (num grupo de `three` montado no teste).

**Vermelho hoje.** `power-control-without-state` acusa os dois quadros (não há `__led` nem
`light`); a checagem do manifesto reprova (`__handle`, `__indicator`, `glass-green`).

### T3 — O quadro da Holyoke na parede oposta à entrada (H-26, ÁT-B4, AS-H14)

**Hoje.** `src/content/museum.ts:1239-1247`: `position: [5.86, 1.05, -4.2]`, `rotationY:
-Math.PI / 2`: parede leste, a mesma da porta, 2,2 m ao norte dela. Da entrada o piloto fica a
103° do eixo e não muda um pixel (P0, #2, `p0-e01-holyoke-entry-pilot-out-of-view-dark-notorch`).
A base, a 1,05 m, monta no roda-meio; o fundo fica a 15 mm do reboco. Costas com costas com o
quadro do átrio, a 0,77 m.

**Mudança.** `position: [-5.875, 1.15, 2.2]`, `rotationY: Math.PI / 2`; `pilotPosition` igual. O
comentário passa a dizer por quê: farol para quem entra, ao sul do mural (0,57 m), fora da faixa
que a vitrine-herói tapa (azimutes de 25,1° a 39,8°). Fica o registro do que L10 herda: com o
alcance de hoje (2,4 m) o piloto banha de vermelho a ponta sul do mural (P0, ressalva 2).

**Teste.**

- `npm run test:opening`, checagem nova, «da porta por onde se chega a cada sala que nasce escura,
  o piloto é um farol». A porta de chegada sai de uma busca em largura a partir do spawn (respeita
  `opensFrom`): átrio pela porta do escritório, Holyoke pela porta principal. O olho fica 0,95 m
  para dentro do vão, a 1,62 m, virado para dentro (é a câmera `-10.2,0,-2,1.5708,0` de P0). Exige:
  a lente a ≤ 35° do eixo; o quadro subtendendo ≥ 6 px em largura e altura a 1280 × 720 (campo de
  `cameraProjection.ts`); a lente com material emissivo; o piloto a menos do próprio alcance da
  face do quadro; e 21 raios livres (três olhos, no eixo e a ±0,5 m, contra lente, piloto, centro e
  quatro cantos), tendo por obstáculo a caixa inteira de cada receita de kit, container e peça da
  sala (`scripts/lib/sightline.ts`). Conferido em Node com os dados de hoje: átrio 24,5°, quadro de
  15 × 21 px, 21 raios livres; Holyoke na posição nova 20,8°, 24 × 33 px, 21 raios livres; na
  posição que o plano propunha (z = 5,0) os 21 batem na vitrine-herói, como P0 viu no navegador.
- `validate:content`: `wall-fixture-off-the-wall` (T10) passa para o quadro da Holyoke e acusa o
  do átrio, que entra em `knownDebt` até L10.
- `test:power`: «nenhum piloto alcança o interior de outra sala», com o piloto e o alcance de
  `buildPowerControlLightRig`. Depois de L1 só o do átrio alcança (1,06 m da face interna da
  Holyoke, alcance 2,4): dívida `pilot-reaches-neighbour` / `atrium-breaker` até L10.
- `test:navigation`: a rota porta → quadro → atalho (T6).

**Vermelho hoje.** Farol: na Holyoke a lente fica a 107° do eixo (P0 mediu 103° até o piloto), e
o limite é 35°. `wall-fixture-off-the-wall`: 15 mm contra 6 de tolerância. Pilotos: o da Holyoke fica a 0,82 m do interior do átrio e não está na tabela de
dívidas.

### T4 — As quatro peças da vitrine corrida (H-13, AS-H1, AS-H3, CAP-1, M40a)

**Hoje.**

- `src/content/museum.ts:384, 412, 461, 490`: x = −2,95, −0,95, 1,15 e 3,65, todas em z = 7,5;
  `supportY: 1.32` (`:387, :415`) é o **centro** da tábua.
- `scripts/bake/parts/holyokeDecor.mjs:240-245` (montantes), `:259-267` (prateleiras), `:271-277`
  (réguas de latão), `:310-387` (recheio assado). O gerador não exporta nada além das famílias.
- Medido (simulação com a aritmética do gerador, igual à tabela de P0 #3): cada peça cruza um
  montante e uma prateleira; os dois quadros flutuam a 27,5 cm do forro, no meio da vitrine; o
  panorama divide volume com a camisa assada.

**Mudança no gerador** (`buildHistoryCaseRun`). O que cada vão hospeda vira dado no topo da função,
`HISTORY_CASE_BAYS`, pelo índice do gerador (0 a 4; o vão 0 fica em x = +4,08 da sala, porque a
vitrine é colocada girada de π):

| Vão (índice) | Centro em x (sala) | Hospeda | Prateleira de cima e régua de cima | Recheio que sai |
|---:|---:|---|---|---|
| 0 | +4,08 | quadro (`photo-gym`) | saem | a camisa clara e o número (`:337`) |
| 1 | +2,04 | quadro (`portrait-morgan`) | saem | os dois documentos em cavalete (`:346-347`) |
| 2 | 0 | livro (`guide-1916`) | ficam | a bola de couro que flutuava no centro (`:356-358`) |
| 3 | −2,04 | livro (`handbook-1897`) | ficam | a túnica escura, pendurada 5 cm acima do livro (`:368`) |
| 4 | −4,08 | nada | ficam | nada |

O recheio sob a prateleira de baixo (catálogos, rolos, caixas, medalhas, livros-caixa, bola de
treino) e os dois cartões do vão 2 e as duas folhas do vão 4 ficam: são o resto de AS-H3, de L14.
`addGarment` deixa de ter quem chame e sai.

A função passa a devolver também `layout` (como `buildCuratorDesk().layout`), montado com as
mesmas variáveis que geram a geometria:

```js
layout: {
  width, height, depth,
  liningFront: 0.038,        // face do forro azul: onde um quadro encosta
  glassBack: depth,          // face de dentro do vidro
  headBottom: height - 0.105,
  stiles: [{ x, halfWidth }],                       // seis
  bays: [{ index, centreX, hosts,                    // 'frame' | 'book' | null
           shelves: [{ id, top, bottom, back, front, halfWidth }],
           rails:   [{ id, min, max }] }],
  filler: [{ id, bay, min, max }],                   // o que ficou, por caixa
}
```

**Mudança no conteúdo** (`museum.ts`). O livro apoia no **topo** da prateleira de baixo do vão; o
quadro encosta no forro, 2 mm à frente dele:

| Peça | Hoje | Depois | `supportY` |
|---|---|---|---|
| `handbook-1897` (`:384, :387`) | `[-2.95, 1.324, 7.5]` | `[-2.04, 1.3878, 7.5]` | 1,32 → `1.3835` |
| `guide-1916` (`:412, :415`) | `[-0.95, 1.32, 7.5]` | `[0, 1.3335, 7.5]` | 1,32 → `1.3335` |
| `portrait-morgan` (`:461`) | `[1.15, 1.92, 7.5]` | `[2.04, 1.96, 7.773]` | — |
| `photo-gym` (`:490`) | `[3.65, 1.95, 7.5]` | `[4.08, 1.95, 7.773]` | — |

O retrato sobe 4 cm porque a legenda dele quebra em quatro linhas nas duas línguas [medido com a
fonte] e, a 1,92, encostaria na prateleira de baixo do vão 1 (topo em 1,3835): a 1,96 o bloco
vai de 2,277 a 1,415 m. O comentário de `:460` («Inside the fourth bay») e o de `:472-476` (que
afirma a versão contestada da renomeação) são corrigidos.

**Extração pura.** `src/engine/framedMediaLayout.ts` recebe as constantes de
`FramedMedia.tsx:32-34` (`MOUNT_BORDER`, `CREDIT_SIZE`, `CREDIT_GAP`, entrelinha 1,35), a regra de
largura de `MuseumScene.tsx:358` (`framedPrintWidth(aspect)`) e `framedMediaBlock(aspect,
captionLines)` (meia-largura, topo e base do cartão com a legenda). `FramedMedia.tsx` e
`MuseumScene.tsx` importam dali; nada muda na tela.

**Teste.** `npm run test:kit` passa a encadear `scripts/test-case-run.ts` (precisa do conteúdo
tipado, que o `.mjs` de hoje não importa). Checagens:

1. o assado é o do gerador: os limites de cada uma das sete famílias recalculados do gerador batem
   com o manifesto, e a receita cabe no teto de 2.500 triângulos;
2. todo vão que hospeda tem exatamente uma peça do tipo certo, e nenhuma peça da vitrine fica num
   vão que não hospeda;
3. cada peça está no centro do vão (±1 mm) e a ≥ 3 cm de qualquer montante;
4. zero interseção entre a caixa da peça e montantes, prateleiras, réguas e recheio (0,5 mm);
5. livro: a base apoia no topo da prateleira de baixo do vão (±0,5 mm), a pegada cabe na tábua, o
   `supportY` do conteúdo é esse topo, e os 25 cm acima do livro estão livres;
6. quadro: o fundo fica entre 0 e 5 mm do forro; o vão não tem prateleira de cima; o bloco de
   tempo de execução (cartão e quatro linhas de legenda) cabe entre o topo da prateleira de baixo
   (mais 1 cm) e a base da cabeça, a ≥ 3 cm dos montantes;
7. nada fica entre a peça (ou o bloco) e o vidro; a peça fica aquém do vidro.

**Vermelho hoje.** Com o `layout` exportado e nada mais mudado, 2 a 6 reprovam nas quatro peças
(as medidas de P0 #3). A checagem 1 nasce verde e é provada por mutação (mexer num número do
gerador sem assar reprova).

### T5 — A porta que não fica presa (ÁT-G2, Anexo E #8)

**Hoje.**

- `src/scenes/MuseumScene.tsx:557-589`: a sala só entra na fila de aquecimento quando os três
  limites de `Suspense` confirmam e o texto sincroniza. Sem tempo-limite.
- `src/engine/RoomWallArt.tsx:96` e `src/engine/FramedMedia.tsx:57`: `useLoader(TextureLoader, …)`.
  Imagem que não chega: a promessa nunca resolve. Imagem que falha: `useLoader` lança, não há
  limite de erro, a página fica em branco (P0, #8 b).
- `src/engine/bundleCache.ts:35-37`: `useLoader.preload(TextureLoader, url)`.

**Mudança.**

1. Novo `src/engine/roomReadiness.ts` (puro):
   `ROOM_DETAIL_TIMEOUT_SECONDS = 30`, `ROOM_DETAIL_MAX_STEP_SECONDS = 0.1`,
   `advanceRoomDetailWait(wait, { mounted, complete, deltaSeconds })` e
   `roomDetailWarmable({ mounted, boundaryMask, textReady, degraded })`. A espera só conta com a
   sala montada e incompleta, em passos de no máximo 0,1 s (uma aba que volta do fundo não gasta o
   prazo num quadro); completar zera; estourar marca `degraded`, que não volta atrás enquanto a
   sala estiver montada.
2. `MuseumScene.tsx`, componente `Room`: um `useFrame` avança a espera; o efeito de `:557-589`
   troca a condição `complete` por `roomDetailWarmable(...)`. Em modo degradado ele varre o que
   já confirmou, enfileira o aquecimento e fecha a descoberta: a prontidão chega pelo caminho de
   sempre e a porta abre. O que confirmar depois aparece sem aquecimento (um engasgo) e **não**
   reabre a descoberta, para a sala não sumir atrás de uma porta aberta. Em desenvolvimento, um
   `console.warn` diz qual limite faltou. `TransitionDoors.tsx` não muda.
3. Novo `src/engine/mediaTexture.ts`: `MediaTextureLoader extends TextureLoader`; `load` entrega
   uma textura de reserva de 1 × 1 (cinza de cartão, sRGB, `userData.mediaMissing = true`) quando a
   imagem falha, e avisa uma vez por URL. `RoomWallArt.tsx:96`, `FramedMedia.tsx:57` e
   `bundleCache.ts:36` passam a usar essa classe (a mesma nos três, senão o cache se parte em
   dois). As texturas de material (`materials.ts:55`) ficam como estão: sem elas não há jogo.

**Teste.** `npm run test:gpu-warmup`, seção nova:

- a espera nunca conta sem a sala montada; completar antes do prazo nunca degrada e zera;
- um limite que nunca confirma degrada exatamente aos 30 s; um passo de 60 s conta 0,1 s;
- `roomDetailWarmable` é falso enquanto espera, verdadeiro completo e verdadeiro degradado com um
  limite faltando;
- a porta real: `transitionDoor` armada (`interact`) diante de uma sala que nunca completa fica em
  `preloading` até os 30 s e chega a `opening` depois deles;
- o carregador: com `ImageLoader.prototype.load` trocado por um que falha, `onLoad` recebe a
  textura de reserva e o erro nunca sobe; com um que carrega, recebe a imagem.

**Vermelho hoje.** Com `advanceRoomDetailWait` escrito primeiro como o jogo é hoje (nunca degrada)
e `MediaTextureLoader` sem a troca, a segunda, a terceira, a quarta e a quinta reprovam: a porta
simulada fica em `preloading` para sempre e o erro sobe.

Fica de fora, anotado: um GLB de peças que falha ainda derruba a página. É a mesma classe de falha
de um kit que falha; a fronteira de `Suspense` por sala é de L6 (M13a).

### T6 — Navegação a partir de onde o jogador chega (ÁT-H3)

**Hoje.** `scripts/test-navigation.ts:274-278`: a âncora do átrio é `[2.5, 1]`, o spawn antigo;
`:710-735`: as seis rotas do átrio saem dali. Nenhuma sai da porta do escritório, nenhuma chega ao
quadro, o mundo do teste não tem o quadro (`:122-147`), e não há rota até o quadro da Holyoke.

**Mudança.**

1. `scripts/lib/museumWorld.ts`: `buildMuseumWorld()` (casca, kit, containers **e controles de
   energia**), `walkUntilStopped(world, from, direction)` e `arrivalPoint(roomId)` (0,95 m para
   dentro da porta de chegada; no escritório, o spawn). `test-navigation.ts` e `test-power.ts` o
   usam; a prova de interpenetração (`collectSolidFootprints`, `:203-237`) ganha os controles.
2. As seis rotas de `ATRIUM_WALK_ROUTES` passam a começar em `arrivalPoint('atrium')` (`[8.05, 3]`
   local), com o ponto antigo como primeira parada.
3. Rotas novas:
   - «porta do escritório → quadro do átrio, em linha reta»: de `[8.05, 3]` ao ponto de pé diante
     do quadro (`[-7.5, -4.4]`), sem parada no meio: a cápsula contorna o anel do plinto e chega;
   - «porta da Holyoke → quadro → atalho»: `[5.05, -2]` → `[0, -2.5]` → `[-4.9, -2.5]` →
     `[-4.9, 2.2]` (diante do quadro) → `[-3.5, 5.4]` → `[4.6, 5.4]` → vão do atalho. Os pontos
     são proposta; quem decide é o teste.
4. Em cada ponto final diante de um quadro, a checagem de T1 (parar, raio, olho fora) roda de
   novo dali, andando contra a parede.

**Teste.** As rotas acima, com chegada e piso sob os pés o caminho todo, mais «os controles de
energia não interpenetram mobília». **Vermelho hoje:** a rota da Holyoke para no ponto diante de
uma parede sem quadro e a checagem de alcance não acha proxy; a do átrio chega, e a checagem de
alcance reprova como em T1. Aviso para o HANDOFF (§6.5): as âncoras de `:274-278` mudam de
significado.

### T7 — Falas do Jorge (ÁT-A5, ÁT-D2, H-21, H-26)

**Hoje.** `src/content/i18n/pt-BR.ts:169, 171, 177, 179, 183, 193-196` e `en.ts:156, 158, 164, 166,
170, 178-181`: «parede oeste» em três chaves de cada língua; «não desce no subsolo»; «lá dentro»;
«três medalhas e um cofre embaixo do átrio»; dica curta sem o retrato.

**Mudança.** Os textos de 4.1. Além deles:

- `src/content/validate.ts`: `validateSpeech(content, dictionaries)`, chamado pelo portão com os
  dois dicionários: nenhuma fala de rádio (linhas de chamada, de dica, curtas, de paciência, de ar
  morto) contém ponto cardeal, por palavra inteira, nas duas línguas: `speech-uses-cardinal`.
- `museum.ts:889`: a chave continua `radio.hint.vault` (é um id que os testes citam; L3 refaz as
  dicas), com comentário dizendo que ela não fala mais do cofre.

**Teste.**

- `validate:content`: `speech-uses-cardinal`.
- `npm run test:radio`: «toda dica curta diz o mesmo alvo da dica cheia», por uma tabela de
  substantivos-alvo por dica, nas duas línguas (caderno; Ala 1 e luzinha vermelha; Ala 1 e quadro;
  Morgan; subsolo).
- `npm run test:opening-flow`: a última dica e a quarta linha da primeira chamada não contêm
  «medalha», «cofre» nem «não desce» (e os equivalentes em inglês); toda fala tem até 130
  caracteres nas duas línguas (a regra de M9, adiantada só como asserção).

**Vermelho hoje.** Três chaves por língua com «oeste» / «west»; a dica curta da gaveta sem
«Morgan»; a última dica com «medalhas» e «cofre».

### T8 — «Museu do Voleibol» (D5, ÁT-F3)

**Hoje.** «Museu do Vôlei» em `pt-BR.ts:19, 151, 238`, em `index.html:9` e em
`public/manifest.webmanifest:3`; «MUSEUM OF VOLLEYBALL» em `en.ts:240`.

**Mudança.** Os textos de 4.2; `index.html:9` (`apple-mobile-web-app-title`) e
`manifest.webmanifest:3` (`short_name`) passam a «Museu do Voleibol». O `<title>` e o `name` do
manifesto («Players On Volleyball Museum») são o nome do produto e ficam. Nota para o aparelho
real (P0 item 6, L6): 17 caracteres podem ser cortados sob o ícone.

**Teste.** `test:opening-flow`: nenhum valor em pt-BR contém «Museu do Vôlei»; nenhum valor em
inglês contém «Museum of Volleyball» (sem diferenciar caixa); `index.html` e o manifesto não
contêm «Museu do Vôlei»; `ui.title` é o nome exato nas duas línguas. **Vermelho hoje:** cinco
ocorrências em português e uma em inglês.

### T9 — Texto histórico (frente 12, acréscimos de 3.12, H-22)

**Mudança.** Os textos de 4.3 a 4.5. No código: o comentário de `scripts/bake/kit.mjs:683-686`
(«roughly half a foot») passa a «just above the head of an average man» (comentário não muda o
assado); o de `museum.ts:153-157` deixa de dizer que a ficha repete o ano.

**Teste.** `test:opening-flow`: uma asserção por chave, nas duas línguas, no molde de
`:994-1003` (a tabela está em 8.2). As duas checagens existentes mudam e a mudança vai para o
HANDOFF (§6.5):

- `:971-992` exigia o ano na plaqueta **e na ficha**; passa a exigir o ano na plaqueta, o retrato
  citado na dica, e que `1896` apareça em exatamente duas chaves de cada dicionário;
- `:994-1003` ganha: a plaqueta não diz «demonstração», a ficha não diz «julho» nem «1900».

Mais uma, nova: «as doze etiquetas cabem em 40 palavras, em pt-BR e em inglês» (palavra é o que
tem letra ou algarismo entre espaços).

**Vermelho hoje.** As 26 linhas da tabela de 8.2 reprovam (134 asserções, contando chave e
língua); cinco etiquetas em português e três em inglês passam de 40 palavras; `1896` está em cinco
chaves. Conferido para este plano: com os textos da seção 4 aplicados sobre os dicionários de
hoje, a tabela inteira e as regras gerais (nome, código em duas chaves, 40 palavras, 130
caracteres, pontos cardeais) passam.

### T10 — Validadores de M0 e a tabela de dívidas

**Hoje.** `src/content/validate.ts:62-193` só confere que ids existem; `ValidationIssue` (`:26-30`)
não diz a quem a acusação se refere; não há dívida datada.

**Mudança.**

1. `ValidationIssue` ganha `id?: string` (o sujeito da acusação).
2. Novo `src/content/knownDebt.ts` (só do portão, como `validate.ts`; entra na lista de
   `scripts/test-facts.ts:735`): `CONTENT_LOT = 1`, `KNOWN_DEBT: { code, id, untilLot, note }[]` e
   `settleKnownDebt(issues, debt, lot)`. Regras: acusação com dívida em dia sai da lista de erros e
   vai para a tabela impressa; dívida com `untilLot ≤ lot` cuja acusação ainda existe é
   `known-debt-overdue`; dívida sem acusação é `known-debt-stale` (pagou, tira a linha).
   `validateContent` recebe a tabela por parâmetro, como recebe as capturas. A mesma tabela e a
   mesma regra servem aos testes: `pilot-reaches-neighbour` (T3) e `ratchet-over-budget` (T11) são
   códigos de teste. Quem chama um validador direto e exige zero erros (`test-power.ts:19-20`)
   passa a assentar as dívidas antes.
3. `scripts/validate-content.ts` passa a tabela, os dois dicionários e o uso das chaves no código, e
   imprime as dívidas em toda execução.
4. Os validadores (todos erro; os marcados com * só passam por dívida):

| Código | O que acusa | Onde entra | Hoje |
|---|---|---|---|
| `lock-without-host` | tranca que nenhum container, portal ou controle de energia hospeda | `validateReferences` | limpo |
| `lock-digits-mismatch` | `digits` diferente do tamanho do valor do fato (EN-A4) | idem | limpo |
| `knowledge-lock-fact-not-code` | tranca de conhecimento sobre fato sem `usedAsCode` (EN-A4) | idem | limpo |
| `document-lock-disagrees-with-container` | `doc.lockId` diferente do `lockId` do container (EN-A2) | idem | limpo |
| `lock-host-kind-unsupported` | tranca que não é de conhecimento em container ou controle; qualquer `portal.lockId` (EN-A1, EN-A2: o runtime não os abre) | idem | limpo |
| `room-overlap` | duas cascas (com meia parede) que se sobrepõem em planta | `validatePortals` | limpo (as três se tocam em 0) |
| `wall-item-over-opening` | arte, placa, controle, dispositivo ou kit de parede cujo vão ao longo da parede cruza uma porta | `validateBake` (usa os limites assados) | limpo (três lambris a 3 cm de um vão: ÁT-F4, L9) |
| `kit-part-unused` * | receita assada que nenhuma colocação, container, dispositivo, controle, placa, porta ou suporte usa | `validateBake` | 16 receitas, 17.156 triângulos |
| `i18n-key-unused` * | chave do dicionário que nem o conteúdo nem o código citam | `validateTranslations` (o portão varre `src/`, fora `i18n/`) | 15 chaves |
| `wall-fixture-off-the-wall` * | controle de energia a menos de 35 cm de uma parede e a mais de 6 mm do reboco | `validatePower` | os dois quadros |
| `power-control-without-state`, `power-control-node-missing` | T2 | `validateBake` | os dois quadros |
| `speech-uses-cardinal` | T7 | `validateSpeech` | seis chaves |

**Teste.** `npm run test:opening` ganha «cada validador de M0 reprova um conteúdo quebrado de
propósito»: um clone do museu com a tranca sem hospedeiro, `digits: 3`, o fato sem `usedAsCode`, o
documento sem a tranca do container, uma tranca de ferramenta num container, uma sala deslocada
1 m para cima da outra, uma arte sobre a porta. E «a tabela de dívidas é honesta»: dívida vencida
reprova, dívida paga reprova, acusação fora da tabela reprova (com `CONTENT_LOT` e a tabela
passados à mão).

**Vermelho hoje.** Os validadores que acusam o conteúdo de hoje (`kit-part-unused`,
`i18n-key-unused`, `wall-fixture-off-the-wall`) reprovam o portão até a tabela existir e os
consertos de T2, T3 e DL1-13 entrarem. Os que nascem limpos são provados pelos clones quebrados:
é a prova de que acusam.

### T11 — Catracas (M14, M16)

**Hoje.** Só o kit por sala tem teto (`scripts/test-kit-runtime.ts:267-303`). O `kit.glb`, o
bundle, os programas e a textura residente não têm portão.

**Mudança.**

1. `scripts/lib/ratchets.ts`: os tetos como dado, com a origem de cada um.
2. `npm run test:ratchets` (`scripts/test-ratchets.ts`), no `check`:
   - `kit.glb`: os bytes do manifesto ≤ o teto (2.241.880 da linha de base; o lote grava o número
     novo, menor);
   - textura residente, recalculada em Node: `BAKE_TOTALS.textureVramBytes`, mais cada imagem de
     `MUSEUM.media` lida do disco (`sharp` para WebP, `width`/`height` do SVG; RGBA com mips), mais
     o atlas de texto declarado (2048 × 128): reproduz os 107,08 MiB de P0 e não pode passar deles;
   - os números que só o navegador dá (programas e draws e triângulos de R01 a R10): o registro
     medido mais recente tem de ser deste lote ou do anterior e de estar dentro do teto;
   - toda catraca acima do orçamento de papel tem linha em `KNOWN_DEBT`.
3. `npm run test:bundle` (`vite build` e `scripts/test-bundle-paths.ts`), no fim do `check`:
   classifica cada arquivo de `dist/` pela profundidade do `import()` dinâmico que o alcança
   (`scripts/lib/bundlePaths.mjs`: 0 documento, 1 tela de título, 2 depois do clique) e mede bytes
   e gzip. Exige: antes do clique ≤ 250 kB gzip e total ≤ 600 kB (os orçamentos); cada caminho ≤ o
   número gravado pelo lote (a catraca: crescer exige editar o número no mesmo commit); nenhum
   arquivo de antes do clique contém o manifesto do bake nem conteúdo (sentinelas `/models/kit.` e
   `ball/leather-laced-1900`).

Os tetos de L1 (os da linha de base, na unidade de cada teste):

| Catraca | Orçamento de papel | Teto em L1 | Depois de L1 [previsto] |
|---|---:|---:|---:|
| `kit.glb` | 800 KB | 2.241.880 bytes | menor (−324 triângulos) |
| Programas, três salas residentes (manual) | 25 | 35 | 35 |
| Textura residente | 45 MiB | 107,08 MiB | 107,08 MiB |
| Antes do clique, gzip | 250 kB | 91,99 kB (medida do teste; 92,85 na conta do Vite) | ≈ 92,3 kB (texto) |
| Total com o clique, gzip | 600 kB | 480,76 kB (484,58 na conta do Vite) | ≈ 482 kB (módulos novos pequenos) |
| Kit do átrio, lotes | 56 | 56 (continua em `test:kit-runtime`) | 56 |
| Draws no quadro, átrio (manual) | 100 | 102, temporário (ÁT-K1) | 80 em R03, 101 em R04 |
| Draws, par com a porta aberta (manual) | 100 | 128 (R10) | 125 |

**Teste e vermelho.** Catraca nasce verde: é a fotografia de hoje. A prova de que morde é por
mutação, registrada no relatório do lote: baixar o teto do kit para menos que o medido, importar
`museum.ts` em `MuseumApp.tsx`, somar uma imagem a `MUSEUM.media`, apagar uma linha de dívida: cada
uma reprova. O classificador de caminhos tem teste próprio sobre um `dist/` sintético em memória.

### T12 — Documentos (passo 12 de §9.1)

- `docs/PESQUISA-CONTEUDO.md`, era 1: seção datada com o que o relatório `07` e este lote
  mudaram: o `1952` tem fonte (a federação internacional; um publicador); a morte de Morgan diverge
  (27 × 28 de dezembro); o prédio é do começo dos anos 1890 e 1886 é o ano da associação (só
  busca); a ordem dos testes de bola nas palavras do Morgan (a câmara primeiro); «Woods»;
  «bomberino» sem fonte aberta; a estimativa de Cubbon não é censo e as parcelas somam 155 mil; a
  renomeação só como «1896»; «costurados à mão» da MVL200 sem fonte coerente.
- `docs/HANDOFF.md`: estado, contagens das suítes, medições do passo 6, os testes que mudaram
  (§6.5: `test-opening-flow.ts:971-1003`, `test-navigation.ts:274-278, 710-735`), as dívidas
  abertas, as lições.
- `docs/PLANO-ATE-O-FINAL.md`: «Feito em» no item L1, e a nota de que o teto de 58 lotes não foi
  gasto.
- `AGENTS.md`: o `check` passa a incluir `test:ratchets` e `test:bundle`.
- Conjunto de capturas do lote em `CAPTURE_SETS` e `npm run captures:manifest`.

## 4. Textos finais

pt-BR é a fonte; o inglês é escrito aqui e revisado na voz de cada personagem. `claims` é o fato
que o texto afirma e de onde vem; `mentions` é o que uma fala cita e tem de existir no jogo. Os
dois campos ainda não existem no schema (M9 em L3, M11 em L8): aqui são o registro que esses lotes
vão transcrever.

### 4.1 Falas do Jorge (T7)

| Chave | pt-BR | inglês | `mentions` |
|---|---|---|---|
| `radio.call.first.3` | «O quadro do átrio fica do outro lado, um pouco à direita de quem sai daí, junto da entrada da Ala 1. Procure a luzinha vermelha.» | “The atrium breaker is across the hall, a little to your right as you leave, by the Wing 1 entrance. Look for the little red light.” | `atrium-breaker`, `atrium-to-holyoke` |
| `radio.call.first.4` | «O subsolo alagou; hoje ninguém desce. Qualquer coisa, pega o rádio aí na mesa e me chama. Câmbio, desligo.» | “The basement flooded; nobody goes down there tonight. Anything at all, take the radio off the desk and call me. Over and out.” | `office-radio` (o subsolo não é lugar do jogo: a fala diz que ninguém vai) |
| `radio.hint.atrium` | «O quadro do átrio fica na mesma parede da entrada da Ala 1, do lado da porta. A luzinha vermelha mostra onde.» | “The atrium breaker is on the same wall as the Wing 1 entrance, right beside the door. The little red light shows you where.” | `atrium-breaker`, `atrium-to-holyoke` |
| `radio.hint.atrium.curt` | «Átrio. Do lado da porta da Ala 1. Luzinha vermelha. Câmbio.» | “Atrium. Beside the Wing 1 door. Little red light. Over.” | idem |
| `radio.hint.holyoke` | «A Ala 1 tem quadro próprio, na parede do outro lado da sala, à esquerda de quem entra. Atravessa no escuro: a lanterna dá conta.» | “Wing 1 has its own breaker, on the far wall, to your left as you walk in. Cross it in the dark — the torch will do.” | `holyoke-breaker` |
| `radio.hint.holyoke.curt` | «Ala 1. Quadro na parede do fundo, à esquerda. Luzinha vermelha. Vai.» | “Wing 1. Breaker on the far wall, to the left. Little red light. Go.” | idem |
| `radio.hint.drawer.curt` | «Gaveta do Otávio: uma data. Retrato do Morgan, Ala 1. Plaqueta de baixo da moldura.» | “Otávio's drawer: a date. Morgan's portrait, Wing 1. The plaque at the foot of the frame.” | `office-cabinet`, `portrait-morgan` |
| `radio.hint.vault` | «O subsolo alagou; hoje ninguém desce. O que dá pra fazer hoje é luz e conferência. Câmbio.» | “The basement flooded; nobody goes down there tonight. What can be done tonight is the lights and the checking. Over.” | nenhum objeto |
| `radio.hint.vault.curt` | «Subsolo alagado: hoje ninguém desce. Hoje é luz e conferência.» | “Basement's flooded: nobody goes down tonight. Tonight it's lights and checking.” | nenhum objeto |
| `radio.patience.t3.crossword` | (não muda: «…Faltava “chato”, cinco letras. Fala.») | “I'd nearly finished the crossword. Just missing “pest”, five letters. Go on.” | — |

As direções foram conferidas na planta: quem sai do escritório anda para oeste e tem o quadro do
átrio 22° à direita; quem entra na Holyoke anda para oeste e tem o quadro 20,8° à esquerda. A fala
mais longa tem 130 caracteres (inglês de `radio.call.first.3`); em português, 128.

### 4.2 Nome (T8)

| Chave | pt-BR | inglês |
|---|---|---|
| `ui.title` | «Museu do Voleibol» | (não muda) “Volleyball Museum” |
| `notebook.welcome.flyleaf` | «Bem-vindos ao Museu do Voleibol, onde a história é contada de um jeito interativo.» | (não muda) |
| `radio.patience.t5.recording.1` | «Você ligou para a portaria do Museu do Voleibol. Nosso horário é das nove às seis.» | (não muda) |
| `sign.atrium.heading` | (não muda) «MUSEU DO VOLEIBOL» | “VOLLEYBALL MUSEUM” |

### 4.3 Saguão (T9)

| Chave | pt-BR | inglês | `claims` |
|---|---|---|---|
| `sign.atrium.eyebrow` | «O JOGO DESDE 1895 · MEMÓRIA EM MOVIMENTO» | “THE GAME SINCE 1895 · MEMORY IN MOTION” | o jogo é de 1895 (a federação e o Hall da Fama); cabe numa linha: 2,70 m e 2,51 m em 3,55 [medido] |
| `exhibit.atrium-ball-laced.label` | «Antes da válvula embutida, era preciso abrir a cobertura para alcançar a câmara. Esta reconstrução reúne a forma vista em catálogos de época e em uma bola preservada: couro, costuras salientes e cadarço cruzado.» | “Before the recessed valve, the cover had to open to reach the bladder. This reconstruction combines the form shown in period catalogues with a surviving ball: leather, raised seams and crossed lacing.” | sem as datas até a fonte ser reaberta (7.7) |
| `exhibit.atrium-ball-tokyo-1964.label` | «Tóquio 1964 recebeu o primeiro torneio olímpico de voleibol. As bolas oficiais preservadas mostram dezoito painéis em seis trios, couro branco-marfim e canais estreitos entre os painéis. A ficha do acervo não identifica o fabricante desta reconstrução.» | “Tokyo 1964 hosted the first Olympic volleyball tournament. Surviving official balls show eighteen panels in six groups of three, ivory-white leather and narrow channels between the panels. The collection record does not identify a maker for this reconstruction.” | não pressupõe costura (07, 2.1) |
| `hotspot.atrium-ball-tokyo-1964.seam.label` | «Canal estreito e rebaixado entre os painéis» | “Narrow recessed channel between the panels” | idem |
| `exhibit.atrium-ball-colour-1998.label` | «No Mundial de 1998, a bola oficial passou a usar branco, amarelo e azul para ganhar leitura em quadra e na transmissão. A MVL200 manteve a construção clássica: dezoito painéis, agora organizados em grandes faixas contrastantes.» | “At the 1998 World Championship, the official ball adopted white, yellow and blue for clearer reading on court and on television. The MVL200 retained the classic construction: eighteen panels, now arranged as broad contrasting bands.” | ano, cores e modelo: a federação, o fabricante, o prêmio de design; sem «costurados à mão» |
| `exhibit.atrium-ball-colour-1998.catalogue` | «Mikasa MVL200, desenho adotado no Campeonato Mundial de 1998. Reconstrução sem logotipos. Os seis trios alternam branco–amarelo–branco e azul–amarelo–azul; a cobertura tem grão fino, brilho acetinado e canais rebaixados, sem as covinhas da geração seguinte.» | “Mikasa MVL200, the design adopted for the 1998 World Championship. Reconstructed without logos. Its six trios alternate white–yellow–white and blue–yellow–blue; the cover has fine grain, a satin sheen and recessed channels, without the dimples of the next generation.” | idem |
| `hotspot.atrium-ball-colour-1998.seam.label` | «Canal estreito e rebaixado entre os painéis coloridos» | “Narrow recessed channel between the coloured panels” | idem |
| `exhibit.atrium-ball-eight-panel-2008.title` | «Oito gomos, superfície com covinhas» | “Eight panels, a dimpled surface” | nenhuma fonte dá a quantidade |
| `exhibit.atrium-ball-eight-panel-2008.label` | «Apresentada em 2008, a MVA200 trocou os dezoito painéis por oito pétalas curvas. Azul-violeta e amarelo formam uma espiral; covinhas rasas e microtextura cobrem toda a superfície. A mudança alterou tanto a leitura visual quanto o contato com o ar.» | (não muda) | só a palavra |
| `hotspot.atrium-ball-eight-panel-2008.dimples.label` | «Covinhas rasas sobre uma segunda camada de microtextura» | (não muda) | só a palavra |

### 4.4 Ala 1 (T9)

| Chave | pt-BR | inglês | `claims` |
|---|---|---|---|
| `exhibit.ball-improvised.label` | «Morgan testou primeiro a câmara de uma bola de basquete: leve e lenta demais. Depois a bola inteira: grande e pesada demais. Sem uma bola adequada, o jogo recém-inventado não funcionava. A solução veio de uma encomenda.» | “Morgan first tried the bladder of a basketball: too light and too slow. Then the whole ball: too big and too heavy. Without a proper ball, the newly invented game did not work. The answer came from a commission.” | a ordem e as palavras são do próprio Morgan (a federação; a página do Morgan no Hall da Fama) |
| `exhibit.ball-improvised.catalogue` | «Câmara de borracha de bola de basquete, c. 1895. Reprodução. Nas palavras de Morgan, leve e lenta demais; a bola de basquete inteira, grande e pesada demais. Foi essa insuficiência que levou à encomenda à Spalding.» | “Basketball rubber bladder, c. 1895. Reproduction. In Morgan's words, too light and too slow; the whole basketball, too big and too heavy. That inadequacy is what led to the Spalding commission.” | idem; sem o superlativo |
| `exhibit.ball-spalding.label` | «A A.G. Spalding & Bros. tinha fábrica em Chicopee, perto de Holyoke. Morgan pediu a ela uma bola sob medida: câmara de borracha em capa de couro, com 25 a 27 polegadas de circunferência. Esta é uma reconstrução.» | “A.G. Spalding & Bros. had a factory in Chicopee, near Holyoke. Morgan asked it for a purpose-built ball: a rubber bladder in a leather cover, 25 to 27 inches in circumference. This one is a reconstruction.” | fábrica perto de Chicopee (a federação); 25 a 27 (a federação e o manual de 1897; 7.4); sem ano |
| `exhibit.ball-spalding.catalogue` | «Bola de vôlei Spalding, couro curtido com costura externa em linha encerada e fechamento por cadarço. O cadarço é o detalhe que situa a peça no tempo: a bola de cadarço foi saindo de cena entre os anos 1920 e 1940.» | “Spalding volleyball, tanned leather with raised waxed-thread outseams and a lace closure. The lace is what places the object in time: the laced ball went out of use gradually between the 1920s and the 1940s.” | sem o intervalo de datas; a única data achada é 1940, numa cronologia |
| `exhibit.net-1897.label` | «A primeira rede ficava a 6 pés e 6 polegadas, logo acima da cabeça de um homem médio. Pelo manual de 1897, tinha ao menos 2 pés de largura por 27 de comprimento, em quadra de 25 por 50 pés.» | “The first net stood 6 feet 6 inches high, just above the head of an average man. By the 1897 handbook it was at least 2 feet wide and 27 feet long, on a court of 25 by 50 feet.” | «logo acima da cabeça»: Morgan, pela federação e pelo Hall da Fama; medidas: o manual |
| `exhibit.handbook-1897.title` | «O primeiro manual oficial» | “The first official handbook” | `first-rulebook` |
| `exhibit.handbook-1897.label` | «O Official Handbook da Liga Atlética da YMCA, de 1897, é o primeiro manual oficial: quadra de 25 por 50 pés, rede a 6 pés e 6 polegadas, bola de 25 a 27 polegadas. A partida tinha nove innings.» | “The 1897 Official Handbook of the YMCA Athletic League is the first official handbook: a 25 by 50 foot court, a net at 6 feet 6 inches and a ball of 25 to 27 inches. A game ran nine innings.” | `first-rulebook`; medidas do manual |
| `exhibit.handbook-1897.catalogue` | «Official Handbook of the Athletic League of the Y.M.C.A. of North America, 1897. Fac-símile. As dez regras originais haviam saído um ano antes, em julho, na revista Physical Education. O nome foi grafado em duas palavras — volley ball — até 1952, quando a associação americana adotou a forma em uma palavra.» | “Official Handbook of the Athletic League of the Y.M.C.A. of North America, 1897. Facsimile. The original ten rules had appeared a year earlier, in July, in Physical Education magazine. The name was written as two words — volley ball — until 1952, when the American association adopted the one-word form.” | 1952: a federação (um publicador: fica na ficha, não em placa); o ano da tranca sai desta chave |
| `exhibit.guide-1916.title` | «Morgan conta a história» | “Morgan tells the story” | — |
| `exhibit.guide-1916.label` | «Duas décadas depois de inventar o jogo, Morgan contou a história no guia de vôlei da Spalding. Nele deu crédito ao Dr. Frank Woods e ao chefe dos bombeiros John Lynch pelas contribuições às primeiras regras.» | “Two decades after inventing the game, Morgan told its story in Spalding's volleyball guide. In it he credited Dr. Frank Woods and fire chief John Lynch for their contributions to the first rules.” | o artigo e o crédito: a federação e o Hall da Fama (que cita a página 11 do guia); «Woods» |
| `exhibit.guide-1916.catalogue` | «Spalding Athletic Library — Volley Ball Guide, edição de 1916–17. Foi nele que Morgan creditou o Dr. Frank Woods e o chefe dos bombeiros John Lynch pelas contribuições às primeiras regras. Da mesma década é o ataque que ficou conhecido como bomba filipina: um passe alto e, em seguida, um golpe para baixo.» | “Spalding Athletic Library — Volley Ball Guide, 1916–17 edition. It is here that Morgan credited Dr. Frank Woods and fire chief John Lynch for their contributions to the first rules. From the same decade comes the attack that became known as the Filipino bomb: a high pass, then a downward strike.” | `filipino-spike` (um publicador: ficha); sem a causalidade, sem «bomberino» |
| `hotspot.guide-1916.credit.label` | «Morgan credita Frank Woods e John Lynch» | “Morgan credits Frank Woods and John Lynch” | idem |
| `hotspot.guide-1916.census.label` | «Estimativa de 1916: cerca de 200 mil praticantes nos Estados Unidos» | “An estimate from 1916: roughly 200,000 players in the United States” | é a estimativa de um autor do guia, não um censo |
| `exhibit.gym-suit.title` | «O traje de ginásio de catálogo» | “The catalogue gymnasium suit” | — |
| `exhibit.gym-suit.label` | «Malha de lã canelada e calça até o joelho, como nos catálogos de artigos esportivos de c. 1901–1915. Os sócios de 1895, pelo que se sabe, jogavam de camisa e calça comprida.» | “Ribbed wool jersey and knee-length trousers, as in sporting-goods catalogues of c. 1901–1915. The members of 1895, as far as is known, played in shirts and long trousers.” | a pesquisa dá as duas variantes como inferência (não há fotografia dos sócios de 1895): daí «pelo que se sabe» |
| `exhibit.gym-suit.catalogue` | «Traje de ginásio como os dos catálogos de c. 1901–1915. Reprodução. Morgan explicou o jogo pela idade e pelo fôlego dos sócios, não pela roupa: era recreação para homens de meia-idade que achavam o basquete pesado demais.» | “A gymnasium suit like those in catalogues of c. 1901–1915. Reproduction. Morgan explained the game by the age and the wind of his members, not by their clothes: it was recreation for middle-aged men who found basketball too strenuous.” | sem a causalidade da lã; sem sola de borracha |
| `exhibit.portrait-morgan.label` | «Diretor de educação física da YMCA de Holyoke. Em 1895, aos 25 anos, criou um jogo sem contato para sócios mais velhos e sedentários. Chamou-o de Mintonette. Havia conhecido James Naismith, o inventor do basquete, no início dos anos 1890.» | “Physical director of the Holyoke YMCA. In 1895, aged 25, he devised a non-contact game for older, sedentary members. He called it Mintonette. He had met James Naismith, the inventor of basketball, in the early 1890s.” | 1891 × 1892 (7.4) |
| `exhibit.portrait-morgan.catalogue` | «William George Morgan (Lockport, Nova York, 23 de janeiro de 1870 — dezembro de 1942). Formou-se pela International YMCA Training School em 1894 e assumiu Holyoke em 30 de agosto de 1895. No ano seguinte, em Springfield, aceitou trocar o nome Mintonette por Volley Ball; se foi numa visita ou na demonstração da conferência da YMCA, as fontes divergem. Deixou a YMCA em 1897 para trabalhar na indústria.» | “William George Morgan (Lockport, New York, 23 January 1870 — December 1942). He graduated from the International YMCA Training School in 1894 and took up the Holyoke post on 30 August 1895. The following year, in Springfield, he agreed to rename Mintonette Volley Ball; whether on a visit or at the YMCA conference demonstration, the sources disagree. He left the YMCA in 1897 for industry.” | 1897 (H-38); morte sem o dia (27 × 28); a divergência da ocasião declarada; o ano da tranca sai desta chave |
| `hotspot.portrait-morgan.date.label` | «Plaqueta da moldura: em 1896, em Springfield, o Mintonette passou a se chamar Volley Ball» | “Frame plaque: in 1896, in Springfield, Mintonette was renamed Volley Ball” | `springfield-renaming` (chave autorizada 1 de 2) |
| `exhibit.photo-gym.label` | «O ginásio da YMCA de Holyoke, em fotografia publicada em 1897: argolas, cavalo com alças, pesos de polia e, no alto, a pista de corrida suspensa. Foi neste espaço que a primeira partida foi jogada.» | “The Holyoke YMCA gymnasium, in a photograph published in 1897: rings, a pommel horse, pulley weights and, overhead, the suspended running track. This is the space the first match was played in.” | «publicada», não «fotografado» (o crédito da imagem); descreve o que a foto mostra; sem esquina, sem treliças |
| `exhibit.photo-gym.catalogue` | «Interior do antigo prédio da YMCA de Holyoke. Reprodução de fotografia publicada em 1897 na Transcript Industrial Edition. O prédio, do começo dos anos 1890, queimou em 1943. Daqui saíram os dois times de cinco jogadores que Morgan levou a Springfield para demonstrar o jogo.» | “Interior of the old Holyoke YMCA building. Reproduction of a photograph published in 1897 in the Transcript Industrial Edition. The building, from the early 1890s, burned down in 1943. From here came the two five-man teams Morgan took to Springfield to demonstrate the game.” | o prédio e o incêndio: a descrição do arquivo de imagens (um publicador: ficha); sem 1886; o ano da tranca sai desta chave |

### 4.5 Documentos e fatos (T9)

| Chave | pt-BR | inglês | `claims` |
|---|---|---|---|
| `document.invention-date.body` | «A data de 9 de fevereiro de 1895, repetida em quase toda parte, não resiste ao arquivo. O International Volleyball Hall of Fame não encontrou citação verificável para ela e estabeleceu que o posto de Morgan em Auburn, no Maine, só terminou em agosto de 1895, e que ele assumiu Holyoke em 30 de agosto. Pela conta do Hall da Fama, a invenção cai provavelmente em dezembro de 1895. Nesta ala, portanto, as placas dizem apenas 1895.» | “The date of 9 February 1895, repeated almost everywhere, does not survive the archive. The International Volleyball Hall of Fame found no verifiable citation for it and established that Morgan's posting in Auburn, Maine only ended in August 1895, and that he took up Holyoke on 30 August. By the Hall of Fame's reckoning, the invention probably falls in December 1895. The plaques in this wing therefore say only 1895.” | o Hall da Fama infere, não afirma |
| `document.halstead.title` | «Springfield, 1896» | “Springfield, 1896” | `springfield-renaming` (chave autorizada 2 de 2) |
| `document.halstead.body` | «Morgan demonstrou o jogo no ginásio leste da International YMCA Training School, na conferência de diretores de educação física convocada por Luther Halsey Gulick. Levou dois times de cinco homens de Holyoke, capitaneados pelo prefeito James J. Curran e pelo chefe dos bombeiros John Lynch. Foi o professor Alfred T. Halstead quem propôs trocar Mintonette por Volley Ball, e Morgan aceitou. As fontes divergem sobre a ocasião: o Hall da Fama fala de uma visita no início do ano e data a conferência de 7 de julho; a federação internacional põe a sugestão depois da demonstração.» | “Morgan demonstrated the game in the east gymnasium of the International YMCA Training School, at the physical directors' conference convened by Luther Halsey Gulick. He brought two five-man teams from Holyoke, captained by mayor James J. Curran and fire chief John Lynch. It was Professor Alfred T. Halstead who proposed replacing Mintonette with Volley Ball, and Morgan agreed. The sources disagree on the occasion: the Hall of Fame speaks of a visit early in the year and dates the conference to 7 July; the international federation places the suggestion after the demonstration.” | a divergência declarada (07, 1.1); o corpo não repete o ano |
| `document.rule-changes.body` | «Em 1917 a partida encurtou de vinte e um para quinze pontos. Em 1918 o número de jogadores foi fixado em seis por lado. Em 1920 vieram duas regras: no máximo três toques por equipe e restrição ao ataque vindo do fundo da quadra. Sobre os três toques as fontes divergem: a federação internacional diz 1922.» | “In 1917 a game was shortened from twenty-one points to fifteen. In 1918 the number of players was fixed at six per side. In 1920 came two rules: a maximum of three contacts per team, and a restriction on attacking from the back row. On the three contacts the sources disagree: the international federation says 1922.” | `six-a-side`; sem «as três respondem ao mesmo problema», sem «até hoje», sem os algarismos 21 e 15 |
| `fact.first-rulebook.claim` | «Ano do primeiro manual oficial» | “The year of the first official handbook” | `first-rulebook` |

Saem dos dois dicionários (DL1-13): `prompt.open`, `prompt.journal`, `lock.holyoke-power.mapLabel`.
No total mudam 48 chaves em pt-BR e 45 em inglês.

Contagem de palavras das doze etiquetas, depois de L1 (pt-BR / inglês): cadarço 34 / 32; Tóquio
37 / 38; três cores 36 / 35; oito gomos 40 / 39; câmara 37 / 39; Spalding 37 / 35; rede 40 / 40;
manual 39 / 40; guia 36 / 33; traje 32 / 28; retrato 40 / 36; ginásio 35 / 32. Hoje: rede 49 / 44,
manual 51 / 51, guia 42 / 41, traje 41, Spalding 42.

## 5. Receitas tocadas

| Receita | Hoje | Depois | Teto | Classe |
|---|---|---|---:|---|
| `breaker-panel` | 892 triângulos em três nós: `breaker-panel` (540, `iron-cast`), `__handle` (304, `brass`), `__indicator` (48, `glass-green`); sem colisor | 892 em três nós: `breaker-panel`, `__lever` (`brass`), `__led` (`led-red`); colisor da receita inteira; `anchors` | 2.500 | prop |
| `history-case-run` | 2.308 em sete nós (carcaça 816, faixa 12, forro 48, latão 652, vidro 60, papel 312, artefatos 408) | 1.984 (−324): carcaça 792, faixa 12, forro 12, latão 628, vidro 60, papel 252, artefatos 228; exporta `layout` | 2.500 | prop |

Nenhuma receita de peça muda. Nenhuma textura muda. O `kit.glb` muda de hash; os três GLBs de
casca e os dois de peças não.

## 6. Delta previsto por sala

Linha de base: `docs/lotes/P0-linha-de-base.md`, 2.1. Tudo aqui é **[previsto]** e é medido de
novo no passo 6, do mesmo jeito (seção 0 daquele registro).

| Sala | Lotes de kit | Triângulos de kit instanciados | Draws no quadro | Triângulos no quadro |
|---|---|---|---|---|
| Escritório | 53 → 53 | 34.230 → 34.230 | R01 58, R02 66: sem mudança | sem mudança |
| Átrio | 56 → 56 | 46.272 → 46.272 | R03 80, R04 101, R05 85, R06 79: sem mudança (o quadro tinha três malhas e continua com três) | sem mudança |
| Holyoke | 28 → 28 | 16.868 → 16.544 | R07 36 → 39 e R08 67 → 70 (o quadro entra no quadro de quem está na porta: é o que H-26 pede); R09 83 → 80 a 83 (o quadro fica na borda do campo) | R07 37.108 → 37.676; R08 51.468 → 52.036; R09 63.050 → 61.834 a 62.726 |
| Par com a porta aberta (R10) | — | — | 128 → 125 (o quadro da Holyoke sai de trás da porta) | 101.310 → 100.418 |

- Programas: 35 → 35. `led-red` e `led-green` já são desenhados no escritório; `glass-green`
  continua na cúpula da luminária.
- Total assado: 151.976 → 151.652 triângulos; kit 105.264 → 104.940.
- Textura residente: 107,08 MiB, sem mudança.
- As duas subidas (R07 e R08, +3 draws cada) ficam declaradas aqui: o teto da sala é 100 e a
  Holyoke vista da porta continua a 39.

## 7. Dívidas datadas

### 7.1 Abertas em L1, na tabela `KNOWN_DEBT` (o portão as imprime e cobra a data)

| Código | Id | Fecha em | Por quê |
|---|---|---|---|
| `kit-part-unused` | `plinth-block`, `plinth-tapered`, `medallion-socket`, `vitrine-table`, `vitrine-glass`, `label-plaque`, `vitrine-wall`, `vitrine-tower`, `partition`, `frame-empty`, `interp-panel`, `banner`, `reception-desk`, `threshold`, `pendant`, `atrium-wall-bay` (16 linhas; 17.156 triângulos) | L5 | AS-L6: saem do GLB ou ganham uso |
| `i18n-key-unused` | `ui.settings`, `ui.brightness`, `ui.motion`, `ui.motion.headbob`, `ui.motion.fov`, `ui.quality` | L16 | tela de ajustes (M27) |
| `i18n-key-unused` | `ui.readingMode` | L24 | modo leitura (M29) |
| `i18n-key-unused` | `map.legend` | L2 | planta (`mapModel`) |
| `i18n-key-unused` | `lock.opened`, `lock.hint.highlight`, `lock.hint.audio`, `lock.hint.reveal` | L4 | escada de dicas (H-19): usa ou apaga |
| `wall-fixture-off-the-wall` | `atrium-breaker` | L10 | ÁT-A2: 25,5 cm do reboco acima do lambri |
| `pilot-reaches-neighbour` | `atrium-breaker` | L10 | ÁT-B4: alcance de 2,4 m a 1,06 m da Holyoke |
| `ratchet-over-budget` | `kit-glb` | L6 | 2.189 KB contra 800 do papel |
| `ratchet-over-budget` | `programs` | L6 | 35 contra 25 |
| `ratchet-over-budget` | `resident-texture` | L7 | 107,08 MiB contra 45 (a mídia fora do portão está aqui dentro) |
| `ratchet-over-budget` | `pair-draws` | L6 | 128 contra 100 (L17 baixa o resto) |

### 7.2 Do Anexo C, que L1 **não** abre no portão (o validador chega no lote indicado)

| Linha do Anexo C | Abre quando |
|---|---|
| `exhibit-uncataloguable` (`net-1897`, `gym-suit`, `photo-gym`) | L2 (`examineReach`, `simulateProgress`) |
| `checklist-item-untickable` | L2 |
| superfície de leitura em branco | L8 (`test:signage`) |
| `wall-fixture-off-the-wall` para mural, banners e murais | L9 (o validador passa a olhar arte e placa) |
| `placement-without-role` | L9 (M35) |
| detalhe opcional × `anchors` | L4 |
| `deferred` | L3 (M35) |
| tetos temporários do átrio (58 lotes, 102 draws) | o de draws fica registrado em `ratchets.ts`; o de lotes não é usado em L1 (DL1-4) |

### 7.3 Registradas sem código (texto que só outro lote conserta)

- O bilhete do Otávio ainda fala em três medalhas, num cofre sob o átrio e em «cento e trinta
  anos» (H-23): L3 o troca por `doc-otavio-handover`. Com a última dica nova, o jogo não manda
  mais o jogador até lá: o bilhete promete, o Jorge diz que hoje não se desce.
- `document.halstead` é `kind: 'letter'` sem ser carta (07, 2.2): L8.
- As fichas ainda dizem «Reprodução» e «Fac-símile» onde B.11 diz reconstrução: L8 (proveniência).
- O detalhe `credit` do guia ainda revela `filipino-spike` (H-11, H-44): L4.

### 7.4 Fechadas por L1

AS-H1, CAP-1 e a parte de L1 de AS-H3; AS-H14 para o quadro da Holyoke; a metade de posição de
ÁT-B4; `fact-code-uncaptured` e as três fontes de `FACTS` já tinham fechado em P0.

## 8. Testes

### 8.1 Suítes

| Suíte | Entra | Prova |
|---|---|---|
| `validate:content` | os nove códigos de M0, mais quatro (T2, T3, T7), os dois da tabela de dívidas, e a tabela impressa | M0; quadro com estado; falas sem ponto cardeal |
| `test:power` | 8 checagens (T1, T2, T3) | alcance de onde a cápsula para; lente por estado; pilotos e salas vizinhas |
| `test:opening` | farol (T3); validadores e dívidas contra conteúdo quebrado (T10) | H-26; M0 |
| `test:opening-flow` | tabela de 8.2; nome; código em duas chaves; etiquetas em 40 palavras; falas | frente 12; D5; H-22; H-53 (etiquetas) |
| `test:radio` | dica curta com o alvo da cheia | H-21 |
| `test:kit` | `scripts/test-case-run.ts`, 7 checagens (T4) | peça × `layout` |
| `test:gpu-warmup` | 5 checagens (T5) | tempo-limite; textura de reserva |
| `test:navigation` | rotas da chegada real; controles no mundo (T6) | ÁT-H3; H-26 |
| `test:ratchets` (nova) | T11 | `kit.glb`, textura residente, registro manual, dívidas |
| `test:bundle` (nova) | T11 | bytes por caminho; título sem conteúdo |

`package.json`: `test:kit` encadeia o segundo arquivo; `check` ganha `npm run test:ratchets`
(depois de `validate:content`) e `npm run test:bundle` (no fim).

### 8.2 Asserções de texto, por chave (pt-BR / inglês)

| Chave | Tem de conter | Não pode conter |
|---|---|---|
| `exhibit.portrait-morgan.catalogue` | 1897; Springfield | 1900; 1896; julho / July; «27 de dezembro» / “27 December” |
| `exhibit.portrait-morgan.label` | 1895 | 1891 |
| `hotspot.portrait-morgan.date.label` | 1896; Springfield | demonstra / demonstration; 1895 |
| `exhibit.net-1897.label` | «logo acima da cabeça» / “just above the head” | «meio pé» / “half a foot” |
| `exhibit.guide-1916.title` | Morgan | bomba / bomb |
| `exhibit.guide-1916.label`, `.catalogue`, `hotspot….credit.label` | Woods | «Wood» sem o s; bomberino; forçou / forced |
| `hotspot.guide-1916.census.label` | Estimativa / estimate | Censo / census |
| `exhibit.handbook-1897.title`, `fact.first-rulebook.claim` | «manual oficial» / “official handbook” | regulamento / rulebook |
| `exhibit.handbook-1897.catalogue` | 1952; «associação americana» / “American association” | 1896 |
| `exhibit.photo-gym.label` | «publicada em 1897» / “published in 1897” | treliças / trusses; High; Appleton; fotografado / photographed |
| `exhibit.photo-gym.catalogue` | 1943 | 1886; 1896 |
| `exhibit.gym-suit.label`, `.catalogue` | 1901–1915 | sola / sole; óxido / oxide; vitoriano / Victorian; suor / sweat |
| `exhibit.ball-improvised.label`, `.catalogue` | «leve e lenta demais» / “too light and too slow” | boiava / floated; «mole demais» / “too soft”; «primeiro objeto» / “first object” |
| `exhibit.ball-spalding.label` | «25 a 27» / “25 to 27” | «Cerca de 25» / “Roughly 25” |
| `exhibit.ball-spalding.catalogue` | «anos 1920» / “1920s” | «anos 1930» / “1930s”; «c. 1900–1920» |
| `document.rule-changes.body` | 1922 | os algarismos 21 e 15; «até hoje» / “to this day”; «As três» / “All three” |
| `document.invention-date.body` | «Hall da Fama» / “Hall of Fame's reckoning” | situa / “places the invention” |
| `document.halstead.title` | igual a «Springfield, 1896» | — |
| `document.halstead.body` | divergem / disagree | 1896 |
| `sign.atrium.eyebrow` | «O JOGO DESDE 1895» / “THE GAME SINCE 1895” | — |
| `exhibit.atrium-ball-colour-1998.label`, `hotspot….seam.label` | — | «costurados à mão» / “hand-stitched” |
| `exhibit.atrium-ball-eight-panel-2008.title` | covinhas / dimpled | milhares / thousands |
| qualquer valor em pt-BR | — | dimples |
| `hotspot.atrium-ball-tokyo-1964.seam.label` | Canal / channel | costura / seam |
| `exhibit.atrium-ball-laced.label` | — | 1918; 1925 |
| `radio.patience.t3.crossword` | «cinco letras» / “five letters” | “four letters” |

## 9. Rota do L1 no navegador (passo 6)

Servidor `museum-dev` (porta 5201), **reiniciado** depois da última edição; conferir o que ele
serve com `fetch('/src/…', { cache: 'no-store' })`. Viewport 1280 × 720, qualidade `medium`, DPR
1,2; depois, 844 × 390 com os botões de toque. Em pt-BR e em inglês. Reload limpo como em P0
(calar `setItem`, limpar, navegar).

**A. Fumaça do início, save vazio.** Título «Museu do Voleibol» (em inglês, “Volleyball Museum”).
Entrar; caderno (folha de rosto com o nome novo); luminária; primeira chamada do Jorge: conferir as
linhas 3 e 4. Porta do escritório: da soleira, no escuro e sem lanterna, o piloto do saguão à
direita, com a lente vermelha. Andar reto, segurando para a frente, até parar no quadro: o prompt
continua, o quadro continua desenhado, `E` religa, a lente fica verde. Dedicatória: sobrelinha
«O JOGO DESDE 1895» numa linha; em inglês, o título numa linha só.

**B. `?qaSave=production-radio-on-desk`** (escritório e átrio acesos, Holyoke escura, rádio na
mesa: é a volta sem rádio). Entrar na Holyoke: **o piloto visto da porta, no escuro** (comparar com
`p0-e01-holyoke-entry-pilot-out-of-view-dark-notorch` e
`p0-e04-breaker-site-recommended-z22-from-entry-dark-notorch`). Atravessar em diagonal, encostar no
quadro, religar, sair pelo atalho.

**C. `?qaSave=production-drawer-closed`** (três salas acesas). **Os quatro vãos**, com as câmeras
de P0 #3 levadas ao centro de cada vão: retrato `-13.21,0,6.45,3.1416,0.25`, panorama
`-11.17,0,6.3,3.1416,0.25`, guia `-15.25,0,6.45,3.1416,-0.25`, manual
`-17.29,0,6.45,3.1416,-0.25`. Conferir: nenhuma peça cortada, legenda do retrato inteira e acima
da tábua, livros apoiados. Examinar as quatro (a plaqueta do retrato ainda pede inclinar). Ler as
oito etiquetas e as fichas da Ala 1 e as quatro do saguão. Pegar o rádio e chamar o Jorge até a
dica curta da gaveta.

**D. `?qaSave=production-drawer-open`.** Chamar o Jorge: a última dica, cheia e curta.

**E. A porta sem saída (P0 #8).** Na tela de título, interceptar `HTMLImageElement.src` para
`/textures/media/atrium-mural-attack.cfe8e9d4.webp`: (a) engolir o pedido: a porta do escritório
fica em «Preparando a próxima sala…» e abre depois de 30 s de jogo (`__museumStep(1800)`), sem o
mural; (b) desviar para um caminho que não existe: a página não fica em branco, o mural sai em
cinza, o console avisa uma vez, a porta abre no tempo normal.

**Medições.** Os dez pontos de R01 a R10 com as câmeras de P0, depois de reload limpo, três salas
acesas: draws, triângulos, programas; comparar com a seção 6. Console sem erro nem aviso novo (o de
`THREE.Clock` já existia). Folhas de contato: `breaker-panel` (apagado e religado, nas duas salas) e
`history-case-run` (os cinco vãos), antes e depois.

**Aceite manual do plano mestre:** o piloto visto da porta, no escuro; os quatro vãos.

## 10. Ordem de implementação

O lote pode sair em fatias, cada uma com os passos 2 a 11; nenhuma deixa o `check` vermelho.

1. **Portões** (T10, T11): validadores, dívidas, catracas. Nada muda no jogo.
2. **Texto** (T7, T8, T9): os dois dicionários, `index.html`, manifesto, asserções.
3. **Bake e conteúdo** (T2 no gerador, T3, T4): `npm run bake`; posições; `layout`.
4. **Runtime** (T1, T2 no componente, T5, T6): proxy, colisor, lente, espera, carregador, rotas.
5. **Fecho** (T12), depois da rota e das medições.

Nunca editar `bake.generated.ts`, `public/models/*` ou `public/textures/materials/*` à mão.

## 11. Riscos

| Risco | Como aparece | Resposta |
|---|---|---|
| o colisor do quadro prende a cápsula num canto | `test:navigation` e a rota A | o colisor é a caixa da receita, a 1,4 m da porta; se prender, a caixa encolhe para a carcaça |
| a dupla face deixa o prompt aparecer de costas | só de dentro do proxy, onde o colisor já não deixa chegar | a checagem «olho fora do proxy» é a guarda |
| a sala degradada aparece sem peças | o jogador vê a ala sem o que não chegou, e o resto entra com um engasgo | é o modo degradado; o aviso no console diz o que faltou |
| o piloto banha o mural de vermelho no escuro | P0, ressalva 2 | aceito até L10 (alcance ≤ 0,8 m) |
| o retrato 4 cm mais alto | centro a 1,96 m, 34 cm acima do olho | a folha de contato decide; a faixa que passa no teste vai de 1,94 a 2,21 m |
| vãos de quadro com a prateleira de baixo vazia | os vãos 0 e 1 ficam só com o quadro em cima | é o estado honesto até L14 (carcaça por vão, recheio como dado) |
| `short_name` de 17 caracteres | cortado sob o ícone | conferir no aparelho real (L6); se cortar, o dono decide |
