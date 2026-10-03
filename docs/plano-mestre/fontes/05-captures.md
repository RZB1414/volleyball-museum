# 05 — Capturas: o átrio e a Holyoke como o jogador vê

Data: 2026-10-03 · repositório `Volleyball Museum` em `82756c4` (limpo antes e depois).
Capturas (100 arquivos JPEG 1536 × 864, q 0,9):
`C:\Users\rzbui\AppData\Local\Temp\claude\C--Users-rzbui-OneDrive-Documentos-Portfolio-PlayersOn\fbc0bfbf-991b-4788-9a2b-64da085bbad6\scratchpad\wf3\captures\`

Prefixos: `a` = átrio aceso · `d` = átrio escuro/lanterna · `h` = Holyoke acesa (h27–h34 = exame) ·
`e` = Holyoke escura/lanterna.

---

## 0. Método, ambiente e ressalvas

- Dev server `museum-dev` em `http://localhost:5201`, servindo código atual (conferido com
  `fetch('/src/content/museum.ts', {cache:'no-store'})`: contém `carriedOnUse` e
  `holyoke-entry-hands`). Não precisou reiniciar.
- Viewport 1280 × 720 CSS, qualidade `medium`, DPR 1,2 → buffer 1536 × 864, FOV 62° / 93,78°.
  GPU: ANGLE / RTX 4080 Laptop (D3D11).
- Câmera por `__museumTeleport` (coordenadas de MUNDO; Holyoke = local − 15,25 em x), altura do
  olho 1,62 m, `__museumStep(30)` + espera + `__museumStep(20)` + `__museumRender()` e
  `canvas.toDataURL` → `/__capture`. Contadores lidos de `__museumPerf()` logo após o render.
- Aceso = `?qaPower=atrium` e depois `?qaPower=holyoke`. Escuro = save apagado, sem `qaPower`;
  lanterna por `KeyboardEvent('keydown', {code:'KeyF'})` no `window`.
- **Armadilhas do harness que quem repetir vai encontrar:**
  1. O painel estava oculto: `requestAnimationFrame` não dispara. Só `__museumStep` anda o jogo.
  2. As rajadas de `toDataURL` + `fetch` contam como frames lentos e o controlador adaptativo
     (`src/scenes/MuseumCanvas.tsx:66-96`) derrubou o DPR para 0,78 (998 × 561) na primeira
     passada. Refiz tudo com `document.visibilityState` forçado a `'hidden'` (o controlador
     sai cedo na linha 67).
  3. Entre navegações o `devicePixelRatio` do painel caiu de 2 para 1 (canvas 1280 × 720). Fixei
     em 2 e disparei `resize` com um `requestAnimationFrame` provisório para o
     `useRenderEnvironment` reler.
- **O canvas capturado não inclui o HUD (DOM).** O texto do painel de exame foi lido de
  `document.body.innerText` e está transcrito em §7. Um screenshot do painel confirmou o layout
  (painel escuro centrado embaixo, serifado).
- Estado deixado como encontrado: `localStorage` vazio, tela de título, viewport no preset
  desktop, `git status` limpo, as 100 capturas movidas para fora do repositório. Durante a
  sessão o exame do guia de 1916 chegou a catalogá-lo (o hotspot `credit` já nasce virado para a
  câmera); o save foi apagado no fim.
- Capturadas mas **não revisadas uma a uma**: `e06`, `e08`, `e10`, `e12`, `e13`, `e14`. Tudo o
  mais citado abaixo foi visto.
- Não há sombras projetadas em nenhuma sala (decisão de performance, HANDOFF §4.4); vários
  achados de "flutuando" são consequência disso e não de posição errada.

---

## 1. Resumo: o que mais pesa

Severidade: **P0** quebra leitura de peça ou pista · **P1** inacabado/feio bem visível ·
**P2** polimento.

| # | Sev | Achado | Evidência | Origem |
|---|---|---|---|---|
| 1 | P0 | Vitrine corrida da Holyoke: 4 das 8 peças estão fora da malha de 5 vãos. Retrato do Morgan (a pista do 1896) cortado por montante e por prateleira; panorâmica cortada ao meio por prateleira; os dois impressos quase invisíveis, encostados/atravessando montantes | h11, h13, h14, h15, h16, e07 | `museum.ts:371, 399, 448, 477` × `scripts/bake/parts/holyokeDecor.mjs:240-245, 259-267` |
| 2 | P0 | Exame quebrado para 5 das 8 peças da Holyoke: Spalding enche a tela; retrato e panorâmica mostram só a tábua da moldura (a foto fica na vitrine); a rede some; o uniforme mostra a base do manequim | h27, h28, h30, h31, h33 | `src/engine/Interaction.tsx:166, 300-334` · `src/scenes/MuseumScene.tsx:183-190, 350-355` |
| 3 | P0 | Os dois impressos (regulamento de 1897 e guia de 1916) são blocos de `canvas` em branco, sem capa nem texto | h29, h34, h13, h14 | `scripts/bake.mjs:310-321` |
| 4 | P1 | Nenhuma legenda física tem texto: 3 `label-angled` de latão liso, quiosque com 3 painéis em branco, atril do átrio em branco, console das bolas sem data nem nome | h04, h07, h09, h10, a15, a16, a07 | `scripts/bake/parts/interpretive.mjs:92` · `holyokeDecor.mjs:507` · `atriumDecor.mjs:940` |
| 5 | P1 | Átrio "aceso" continua escuro: só o piso (laranja saturado) recebe luz; lambris, portas, recepção e lounge ficam pretos; teto preto; murais sem luz | a01, a14, a17, a18, a22, a27, a28 | `museum.ts:1067-1078` · `scripts/bake/lib/glb.mjs:72, 83` |
| 6 | P1 | Com a energia CORTADA, todo emissivo do átrio segue ligado (sanca, fitas da recepção, base do plinto, atril, pontos do armário, pendentes, torre, banners a 0,85) | d01, d05, d10, d12 | `glb.mjs:87` · `src/engine/materialSpec.ts:54-56` · `src/engine/RoomWallArt.tsx:154-156` |
| 7 | P1 | Bola Spalding (herói da ala, 2,65×): o normal do couro ampliado vira "noz/cérebro"; cadarço invisível de frente | h03, e05, h27 | `museum.ts:304-312` · `bake.mjs:279-285` |
| 8 | P1 | Bola de 1964 é uma esfera lisa, sem um único painel, ao lado de um texto que fala em "dezoito painéis em seis trios" | a09, d06, d16 | `bake.mjs:368-375` · causa provável: mapas a 64 px (HANDOFF §9.3), a confirmar |
| 9 | P1 | Madeira: veio ondulado enorme com normal forte (parece plástico derretido / moiré) em recepção, console, plinto, lambris, portas e gaveteiros | a04, a05, a07, d04, d08, e11, h19 | `glb.mjs:66-72` |
| 10 | P1 | Gaveteiros de arquivo da Holyoke (3 documentos obrigatórios) no breu com a sala acesa | h18 | `museum.ts:1287-1293` (nenhum spot aponta para eles) |
| 11 | P1 | Plinto central: 4 discos lisos, sem texto; o plano fala em 3 soquetes; pequeno demais para ser o marco do salão | a02, a03, d04, a28 | `atriumDecor.mjs:562-568` · `docs/PLANO-COMPLETO.md:60-65` · `museum.ts:975-989` |
| 12 | P1 | Biombo parado na frente da placa de dedicação | a20, a27, a29, a32 | `museum.ts:1035-1039` × `1089-1103` |
| 13 | P1 | Vinheta do ginásio: 2/3 sem luz; rede lê como cerca (faixas em `oak-matte`); uniforme em `leather-worn` lê como um saco marrom sem braços | h08, h09, e09 | `bake.mjs:297-307, 324-334` |
| 14 | P1 | Verso da tela de entrada: monólito preto de 2,1 × 3,5 m no meio da galeria | h23 | `holyokeDecor.mjs:66` |
| 15 | P2 | Nicho da bola improvisada a 33 cm do chão, tampado pelo próprio tampo de latão | h05, h06 | `museum.ts:281-289` |
| 16 | P2 | Lambri em duas alturas (1,48 e 1,02 m) com frestas de reboco junto às portas e nos cantos | a13, a18, a19, a21 | `museum.ts:1041-1058` |
| 17 | P2 | Performance: vista do canto SE do átrio = 100 draws (teto duro móvel); 34–35 programas acumulados | §2 | — |

---

## 2. Contadores por vista

`draws / triângulos / programas acumulados`. Malhas visíveis: átrio 110, Holyoke 89. Texturas:
46 → 53. Geometrias: 172 → 267 (acumulam com o aquecimento das salas vizinhas).

### Átrio aceso (`visibleRooms = atrium`)

| Captura | Vista | Draws | Triângulos | Prog. |
|---|---|---|---|---|
| a01 | da porta do escritório | 75 | 59.088 | 31 |
| a02 | plinto, aberto | 74 | 57.816 | 31 |
| a03 | plinto, tampo | 69 | 56.240 | 31 |
| a04 | recepção 3/4 | 37 | 39.516 | 31 |
| a05 | recepção, balcão | 32 | 36.050 | 31 |
| a06 | corredor de serviço | 54 | 48.436 | 31 |
| a07 | console das bolas | 28 | 26.510 | 31 |
| a08–a11 | cada bola | 21–24 | 23.120–25.200 | 31–33 |
| a12 / a13 | torre | 43 / 28 | 39.462 / 29.222 | 33 |
| a14 | lounge | 32 | 34.136 | 33 |
| a15 / a16 | atril + parede de orientação | 38 / 26 | 36.882 / 29.814 | 33 |
| a17 / a31 | quadro de energia | 20 / 22 | 26.072 / 24.236 | 34–35 |
| a18 | porta da Holyoke | 28 | 28.284 | 34 |
| a19 | porta do escritório | 22 | 28.680 | 34 |
| a20 / a30 | placa de dedicação | 27 / 29 | 30.874 / 31.386 | 34–35 |
| a21 | porta do atalho | 22 | 26.332 | 35 |
| a22 / a23 | teto | 38 / 32 | 38.982 / 33.380 | 35 |
| a24 / a25 | murais sul / norte | 43 / 41 | 44.188 / 36.282 | 35 |
| a26 | caixa de doação | 30 | 36.008 | 35 |
| a27 | geral, do canto NO | 83 | 66.106 | 35 |
| **a28** | **geral, do canto SE** | **100** | **77.286** | 35 |
| a29 | chegada pela porta da Holyoke | 71 | 63.836 | 35 |
| a32 | piso rasante | 76 | 66.046 | 35 |
| a33 | banners | 42 | 36.936 | 35 |
| a34 | ponta oeste da recepção | 32 | 36.872 | 35 |

### Holyoke acesa (`visibleRooms = holyoke`, porta fechada)

| Captura | Vista | Draws | Triângulos | Prog. |
|---|---|---|---|---|
| h01 | da porta | 36 | 37.108 | 34 |
| h02 | da porta, para SO | 62 | 45.612 | 34 |
| h03 / h04 | vitrine-herói / placa | 26 / 26 | 27.144 / 27.466 | 34 |
| h05 / h06 | tela de entrada / nicho | 50 / 26 | 34.596 / 18.926 | 34–35 |
| h07 | quiosque | 33 | 30.734 | 35 |
| h08 / h09 | rede / uniforme | 14 / 14 | 18.124 / 17.508 | 35 |
| h10 / h26 | clavas, corda, bola | 31 / 40 | 32.340 / 33.556 | 35 |
| h11 | vitrine corrida, aberto | 32 | 17.552 | 35 |
| h12–h16 | cada vão | 18–25 | 13.614–14.974 | 35 |
| h17 | mural oeste | 10 | 12.646 | 35 |
| h18 | gaveteiros | 24 | 27.042 | 35 |
| h19 | quadro de energia | 22 | 23.428 | 35 |
| h20 | foto do prédio | 49 | 39.548 | 35 |
| h21 / h22 | atalho / saída | 27 / 25 | 22.072 / 27.872 | 35 |
| h23 | geral, do canto SO | 64 | 57.074 | 35 |
| **h24** | **geral, do canto NO** | **83** | **63.050** | 35 |
| h25 | teto | 50 | 47.380 | 35 |
| h27–h34 | exame | 11–32 | 13.776–29.960 | 35 |

### Escuro

Átrio: mesmos draws/triângulos das vistas acesas (d01 = 75 / 59.088; d04 = 69 / 56.240…), o
que confirma que acender não muda topologia. **Programas num load limpo: 21** na primeira
vista do átrio escuro, 22 ao ligar a lanterna, 25 depois de andar o átrio, **34 ao entrar na
Holyoke**, 35 depois do primeiro exame. Composição final (`__museumPrograms()`): 11 sem nome
(não identifiquei quais; provavelmente texto e materiais básicos), 4 `brass`, 2 cada de
`archive-green`, `canvas`, `glass-green`, `glass-vitrine`, `plaster`, `plastic-black`,
`rug-burgundy`, `walnut-polished`, 1 `maple-floor`, 1 `oak-varnished`, mais os 2 do PMREM. O
HANDOFF (§2) cita um orçamento global de 25 e já mede 29–31 no escritório, com a ressalva de
que o número inclui PMREM e aquecimento das vizinhas; pelo mesmo critério, átrio + Holyoke
dão 34–35. Qualquer material novo com combinação inédita de recursos soma a esse total.

Leituras: o átrio de dentro fica entre 20 e 83 draws; só a diagonal SE→NO chega a 100. A
Holyoke tem folga grande (10–36 nas vistas de leitura), ou seja, **há orçamento para gastar em
texto de legenda, luz e detalhe na Holyoke; no átrio qualquer família de material nova nas
receitas vistas da diagonal estoura o teto de 100**.

---

## 3. Console

Nenhum erro em nenhuma das cinco cargas. Avisos:

- `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` — a cada load.
- `THREE.WebGLProgram: Program Info Log: … warning X4122: sum of 0.996094 and -2.98545e-017
  cannot be represented accurately in double precision` — uma vez, na primeira carga
  (compilador HLSL do ANGLE; inofensivo, mas é ruído que esconde um aviso real).

---

## 4. Átrio aceso

### 4.1 Da porta do escritório — `a01`, gerais `a27`, `a28`, `a29`

- **Composição:** o olhar cai no piso. Ele é a única superfície realmente iluminada e sai
  laranja saturado (`maple-floor` `[0.71, 0.475, 0.235]` + clearcoat 0,35, `glb.mjs:83`, sob
  luz quente). Tudo abaixo de 1,5 m que não é piso (lambri, portas, recepção, biombos, lounge)
  é uma silhueta preta. O momento "as luzes da casa acendem", que o comentário de
  `museum.ts:898-900` chama de maior recompensa do build, não entrega: a parede acima de 4 m
  some no cinza e o teto fica preto.
- **Plinto:** 0,88 × 1,04 × 1,08 m no centro de um salão de 18 × 18 × 8,4 m. O anel de piso
  (raio 5,66 m) e o corrimão (raio 1,76 m) são maiores que o objeto que deveriam apresentar. Na
  geral (a28) ele lê como um caixote de recepção, não como o marco que `museum.ts:975-986`
  descreve.
- **Poças de luz em parede vazia:** os pendentes com `lightTarget` desenham discos duros no
  reboco (a02, a25, a28). O da linha do tempo (`museum.ts:1074`) joga a poça na parede à direita
  do mural do mergulho, que fica no escuro (a25).
- **Bandas diagonais no reboco:** todas as paredes mostram um hachurado diagonal regular
  (a24, a27, a28, a29; aparece até no escuro, d15). É o padrão do albedo/normal do `plaster`
  repetindo em escala de parede; lê como artefato, não como textura.
- **Banners** (autoiluminação 0,85, `museum.ts:1147-1181`): parecem telas retroiluminadas numa
  parede apagada. Bonitos como arte, incoerentes como tecido.
- **Friso/rodameio** a ~3,1 m: linha preta fina que cruza as quatro paredes e encosta nas
  placas das portas (a18, a19).

### 4.2 Plinto — `a02`, `a03`

- Tampo em `plaster-dark` com **quatro** discos de latão lisos com miolo creme
  (`atriumDecor.mjs:562-568`: "raked four-button interpretation surface"). `PLANO-COMPLETO.md:
  60-65` e `museum.ts:983` falam em **três** soquetes de medalha. Falha de roteiro visível: o
  objeto que guarda o portão do segundo ato tem o número errado de encaixes.
- Sem relevo, sem gravação, sem texto (o gerador reserva um campo de 0,72 × 0,34 m para um
  painel de runtime que não existe).
- Corpo em `walnut-polished` com veio ondulado de 20–40 cm (ver §9.1).
- Remates dos postes facetados (hexágono visível) e corrimão em segmentos retos visíveis.

### 4.3 Recepção — `a04`, `a05`, `a06`, `a34`, `a24`

- O tampo é o pior caso do veio: ondas largas com normal forte, brilho de clearcoat; parece
  água/plástico derretido (a05).
- Monitores: caixas cinza `iron-cast` sem tela, sem moldura; teclado é uma placa; microfone
  genérico. Nenhum papel, folheto, carimbo ou campainha. O HANDOFF §7.5 prevê o folheto da
  recepção que libera a aba Planta: **não há folheto modelado**.
- Armário de fundo: quatro "pontos" emissivos quadrados arredondados sem função legível.
- Fita de luz sob o balcão com dentículos pretos: boa ideia, mas acesa com a energia cortada.
- Ponta oeste (balcão rebaixado, a34): limpa, é o melhor trecho do móvel.
- Cadeiras de serviço: finas, pretas, legíveis (a06).

### 4.4 Console das bolas (única coleção examinável do átrio) — `a07`–`a11`

- **Nenhuma legenda no mundo.** Quatro bolas sobre quatro placas mostarda lisas; nada diz ano,
  nome ou "examine". A informação só existe no HUD depois de mirar.
- **1964** (`ball-1964`): esfera creme lisa. Nenhuma costura, nenhum painel. Causa provável,
  a confirmar no gerador (`scripts/bake/parts/historicalVolleyballs.mjs:359`): albedo e ORM de
  três bolas foram para 64 px (HANDOFF §9.3) e o normal que sobrou não desenha os canais.
- **1998**: faixas amarelas com "furos" brancos triangulares/redondos de borda serrilhada; lê
  como máscara errada, não como painéis.
- **2008**: gomos azul/amarelo com bolinhas que leem como pele de onça.
- **Couro com cadarço**: a melhor das quatro; o cadarço aparece.
- Placas de base em `brass` sem textura: mostarda fosca chapada (a08).
- Vidro sem reflexo algum; bolas sem sombra de contato → parecem coladas.
- Lambri atrás: ripas com o mesmo veio ondulado, muito ruidoso atrás das peças (a07).

### 4.5 Torre e lounge — `a12`, `a13`, `a14`

- Torre: três "artefatos" no mesmo latão genérico (taça, esfera com cintas, disco em pé). Sem
  legenda, não interativos. São marcadores de posição.
- Atrás da torre, o lambri troca de altura e deixa um vão (a13): módulos `atrium-wall-bay-plain`
  de 1,48 m não cobrem o canto, onde aparece o lambri da casca de 1,02 m.
- **Lounge (a14): preto.** Poltronas, sofá, mesas e tapete são silhuetas com a sala acesa.
  Com a lanterna (d13) o estofado aparece azul-marinho e a cena fica melhor que acesa.

### 4.6 Atril e parede de orientação — `a15`, `a16`

- Parede de orientação: gráfico bonito (mapa em ouro + seis bolas), **sem uma palavra**. Os
  "continentes" são manchas genéricas que não correspondem a continente nenhum.
- Atril (`atrium-lectern`, descrito em `museum.ts:1022` como "orientation and reading
  station"): tampo de pedra **em branco**, só um filete de latão. Nada para ler.

### 4.7 Quadro de energia — `a17`, `a31`

- Com a sala acesa é um retângulo preto num lambri preto; só a alavanca de latão aparece.
- A caixa (y 1,05–1,69) cavalga a tampa do lambri de 1,48 m: metade de baixo na frente da
  ripa, metade de cima solta da parede (a31). Lê como apoiada, não como instalada.
- Sem etiqueta ("ÁTRIO", "GERAL"…). O HANDOFF §7.5 quer distinguir luz de serviço e disjuntor
  geral: hoje não há como dizer qual é este.
- A tampa do lambri mostra um realce tracejado (a17, a31, a19): aliasing de um chanfro fino.

### 4.8 Portas — `a18`, `a19`, `a21`

- As três portas são lajes pretas; só as placas e duas maçanetas minúsculas dizem "porta".
  Nenhuma almofada lê.
- Soleiras: laje mostarda chapada avançando no piso.
- Entre arquitrave e lambri sobra uma lasca clara de reboco de cada lado (a18, a19).
- Placa do escritório (`archive-green`): "ACERVO · PESQUISA / ESCRITÓRIO DO CURADOR" e a
  metade de baixo vazia (a de Holyoke tem a linha de datas). Desequilibrada.
- Atalho (a21): porta dupla idêntica às públicas, espremida no canto de 1,6 m entre a recepção
  e a parede, com arquitrave pesada. Nada sugere "porta de serviço trancada por dentro".

### 4.9 Placa de dedicação — `a20`, `a30`, `a29`

- **O biombo de `museum.ts:1035-1039` fica 2 m à frente da placa** e tampa o canto esquerdo
  do título de quase todo o salão (a27, a29, a32); de perto corta o texto (a20).
- Texto legível, mas ocupa 55% da placa; a direita é vazia (o relevo de bola citado no HANDOFF
  §4.3 não aparece nessa luz). "demais." fica órfã numa linha.
- A poça de luz pega só o terço esquerdo.

### 4.10 Teto — `a22`, `a23`

- Não há claraboia. É um caixotão ripado preto contornado por uma linha emissiva fina, com
  pontinhos (pendentes). A instalação aérea (trajetórias em latão + rede) quase não lê contra
  o preto. A ideia de "goteira e claraboia trincada" (HANDOFF §7.5) não tem geometria onde
  morar.

### 4.11 Murais, caixa de doação, piso — `a24`, `a25`, `a26`, `a32`

- Murais (5 m de altura): boa arte em sépia, sem luz dedicada, sem legenda.
- Caixa de doação: pedestal de latão com cubo de vidro, correta, vazia.
- Piso rasante (a32): cintilação densa a meia distância (normal/roughness subfiltrados; vai
  tremer em movimento). O anel escuro em `iron-cast` lê como tinta fosca cinza-marrom. Os
  setores do embutido trocam a direção das tábuas sem filete entre eles (emenda em serrilha,
  visível em a16 embaixo à esquerda).

---

## 5. Átrio escuro e lanterna

- **`d01` (sem lanterna) e `d03` (com lanterna) são praticamente a mesma imagem.** Da porta do
  escritório, olhando em frente, o facho (alcance 6,2 m) não encontra nada. E o "escuro" não é
  escuro: o ambiente deixa ler o salão inteiro.
- **Tudo que é emissivo está aceso sem energia** (d01): contorno do teto, fita da recepção e do
  balcão rebaixado, luz da base do plinto, do atril, pontos do armário, discos da torre (d12),
  banners. Contradiz "a energia caiu".
- O piloto vermelho do quadro (d02) é o melhor momento da sala: farol legível do outro lado do
  salão, banho quente no reboco.
- `d07`: lanterna a 1,2 m do quadro + piloto → a caixa estoura em rosa-branco chapado, sem
  nenhum detalhe; o indicador vira um disco branco.
- `d04`: sob a lanterna fria a pedra do plinto fica cinza-clara e o veio do nogueira fica ainda
  mais ondulado.
- `d06`: cone estreito pega duas bolas; a de 1964 é uma esfera branca lisa.
- `d08`, `d09`: portas sob lanterna = laje com veio marmorizado, quatro riscos verticais e um
  **disco branco de reflexo** no centro (clearcoat 0,55 / 0,12 do `oak-varnished`,
  `glb.mjs:66`; a mesma lição que o HANDOFF §6 registra para o `walnut-polished`).
- `d05`: a 4,5 m a lanterna não revela a recepção.
- `d10`: teto fora do alcance, como projetado.
- `d16`–`d18` (exame no escuro): **a peça segurada fica quase preta**, com um fio de luz só na
  borda inferior. O primeiro exame do jogo acontece aqui, antes de religar a energia.

---

## 6. Holyoke acesa

### 6.1 Da porta — `h01`, `h02`, gerais `h23`, `h24`

- É a melhor composição do jogo: mural ao fundo, vitrine-herói à esquerda, quiosque em
  primeiro plano, rede e banco à direita. A tela de entrada com o meio-tom das mãos (h02, h05)
  é a peça mais bonita das duas salas.
- Problemas do quadro: as clavas entram por baixo e tampam o centro (h01); a rede à direita é
  uma silhueta preta; o teto é uma tampa escura sem desenho (h25).
- **Geral do SO (h23): o verso da tela de entrada é um retângulo preto de 2,1 × 3,5 m** no
  meio da sala. Dois reflexos especulares brancos estourados no piso.
- `holyoke-navy` lê verde-oliva sob a luz quente (h05, h06) e azul só sob a lanterna (e07):
  a "revelação navy" do conceito não existe com a sala acesa.

### 6.2 Vitrine-herói e placa — `h03`, `h04`

- Bola Spalding a 2,65×: o normal do couro foi ampliado junto e virou rugas grossas. Parece
  uma noz. Do ponto de leitura não se vê cadarço nem marca do fabricante.
- Base em degraus com trama de lona grossa: aceitável.
- `label-angled` na frente: **chapa de latão lisa, sem texto** (h04). Idem as outras duas
  (h09, h10; `museum.ts:1270, 1281, 1282`). A do uniforme fica entre o leitor e a peça.

### 6.3 Tela de entrada e nicho — `h05`, `h06`

- Nicho com a bola improvisada a y = 0,335 (`museum.ts:287`): bola de 22 cm na altura da
  canela, sob um tampo de latão que cobre a metade de cima dela vista de pé (h06). É uma das
  oito peças obrigatórias e o jogador precisa olhar para o rodapé para achá-la.
- Trama do tecido da tela grossa (~2 cm): lê como tapete de borracha.

### 6.4 Quiosque — `h07`

- Três painéis de leitura **em branco** (lona bege com moldura escura). É a "sequência
  central de interpretação" de `museum.ts:1258-1262` e não interpreta nada.

### 6.5 Ginásio — `h08`, `h09`, `h10`, `h26`

- O spot ilumina só o poste direito e o manequim; os outros 2/3 (rede, poste esquerdo, banco)
  ficam no escuro com a sala acesa.
- Rede: fita de cima e faixa de baixo em `oak-matte` (`bake.mjs:303`) → duas ripas escuras com
  tela no meio; lê como cerca. Os cordões só aparecem dentro do facho (e09). Altura 1,98 m
  correta.
- Poste: textura de madeira listrada que lê como corda enrolada.
- Uniforme (`bake.mjs:324-334`): vestimenta em **`leather-worn`**; cilindro bojudo sem braços,
  sem ombros, sem sapatilha. O texto do exame descreve "lã penteada canelada, calça até o
  joelho, sapatilha de lona com sola de borracha": nada disso está no modelo.
- Clavas: três em pé + uma deitada, facetadas, escuras; bola pesada e corda em espiral chata.
  Passam, mas ficam fora da luz (h10, h26).
- Linhas de quadra têm trama de lona e leem como fita/corda estendida.

### 6.6 Vitrine corrida — `h11`–`h16`

Geometria: 10,20 m, 5 vãos de 2,04 m, montantes de 6,5 cm em x = ±1,02, ±3,06, ±5,10;
prateleiras em 1,32 / 1,37 (vão par / ímpar) e 1,91 / 1,87 / 1,83 (`holyokeDecor.mjs:179-267`).
As peças foram posicionadas em x = −2,95, −0,95, 1,15 e 3,65 (`museum.ts:371, 399, 448, 477`),
ou seja, a 5–15 cm de um montante. Limites medidos por `__museumScene()`:

| Peça | Limites (local) | O que acontece | Captura |
|---|---|---|---|
| `handbook-1897` | x −3,09…−2,81 · y 1,32…1,37 | atravessa o montante de −3,06; a metade leste cai num vão cuja prateleira está em 1,37, então o livro fica embutido/abaixo dela; sobra uma lasca creme | h13 |
| `guide-1916` | x −1,01…−0,89 · y 1,32…1,33 | folheto de 12 × 20 cm e 1 cm de espessura, deitado, 2 cm dentro do montante de −1,02 | h14 |
| `portrait-morgan` | x 0,91…1,39 · y 1,64…2,20 | moldura atravessa o montante de 1,02; a prateleira de 1,87 corta o rosto na altura do queixo; a legenda é cortada pelo montante | h15, e07, h11 |
| `photo-gym` | x 2,88…4,42 · y 1,65…2,25 | a prateleira de 1,91 corta a panorâmica ao meio; uma folha em branco aparece por trás; legenda cinza sobre o forro, ilegível | h16 |

O retrato é a origem do código 1896 (`museum.ts:140-146`). É a peça mais importante do corte
vertical e a mais maltratada.

Além disso:

- Recheio de cenário: folhas `paper-aged` em branco, "degraus" expositores com textura de couro
  laranja (`history-case-run__artefacts` em `leather-worn`), três discos de latão soltos num vão
  escuro (h11–h14). Lê como vitrine de loja vazia.
- Só os vãos das pontas recebem luz; os três do meio ficam escuros (h11, h24).
- Legendas de mídia em **inglês** numa interface pt-BR e em corpo minúsculo: "William G Morgan,
  as physical director of Holyoke's YMCA · Holyoke YMCA for the Transcript · 1897 · Domínio
  público"; "Interior of the old Holyoke YMCA…"; "Holyoke YMCA building in 1902…" (h15, h16,
  h18).
- Friso fotográfico acima: funciona (h11).

### 6.7 Mural, gaveteiros, quadro, portas — `h17`–`h22`

- Mural oeste (h17): bom, mas o rodameio da casca passa na frente dele na altura das cabeças,
  e a luz pega só o canto superior direito.
- **Gaveteiros (h18): quase invisíveis.** Carvalho escuro sobre lambri escuro, puxadores
  ilegíveis, nenhum spot. São os contêineres dos três documentos da ala. Sob a lanterna (e11)
  aparecem, com o veio marmorizado e dois pontos brancos de clearcoat.
- Quadro (h19): com a energia restaurada o indicador `glass-green` continua apagado
  (`glb.mjs:211`, sem emissivo). O lambri atrás mostra anéis de moiré.
- Foto do prédio (h20): grande, escura, atrás dos gaveteiros; legenda minúscula.
- Atalho por dentro (h21): porta dupla comum. `museum.ts:1245-1247` fala em "barred service
  door"; não há barra, trinco nem placa. Nada conta ao jogador que aquela é a recompensa.
- Saída (h22): placa "ÁTRIO CENTRAL" legível, porta preta.

---

## 7. Exame (`E`) — `h27`–`h34`, `d16`–`d18`

Mecânica observada: o grupo `exhibit:<id>` é levado para **0,42 m fixos** à frente da câmera,
mantendo escala e orientação (`Interaction.tsx:166, 300-334`).

| Captura | Peça | O que o jogador vê |
|---|---|---|
| h27 | Spalding (2,65×) | a bola enche a tela inteira: só rugas marrons borradas e duas costuras |
| h28 | retrato do Morgan | **tábua de madeira**: a moldura vem, a fotografia fica na vitrine (`FramedMedia` é irmão do grupo, `MuseumScene.tsx:350-355`) |
| h33 | panorâmica do ginásio | idem, zebrado de madeira borrado enchendo a tela |
| h30 | rede de 1897 | **nada**: sala vazia. A origem da rede está no piso; a 0,42 m a tela fica 1,4–2 m acima do quadro e os postes a ±2,4 m fora do campo |
| h31 | uniforme | a base redonda do manequim na altura dos olhos; a roupa fica acima do quadro |
| h29 | regulamento de 1897 | livro aberto com trama de waffle, sem texto |
| h34 | guia de 1916 | plaquinha de lona em branco; catalogado na hora (o hotspot já nasce de frente) |
| h32 | bola improvisada | bola marrom com um bico; enquadramento correto, textura pobre |
| d16–d18 | bolas do átrio, no escuro | enquadramento correto, peça quase preta |

Texto do painel (DOM), igual para todas: título, parágrafo, **"Peça vista, mas não catalogada.
Vire-a."**, lista de hotspots como `○ — — — *`, contador `0 / N`, "Arraste para girar",
"Fechar · Esc". "Vire-a" aparece para rede, retrato e fotografia, onde não faz sentido.

Risco de conteúdo visto no dado (não chegou a aparecer na tela): três hotspots reaproveitam
rótulos de outra peça — válvula da bola improvisada usa `hotspot.ball-spalding.lacing.label`
(`museum.ts:298`), malha do uniforme usa `hotspot.ball-spalding.seam.label` (`:438`), aparelhos
da fotografia usam `hotspot.net-1897.socket.label` (`:489`).

---

## 8. Holyoke escura e lanterna — `e01`–`e14`

- `e01` ≈ `e03`: da porta, a lanterna acrescenta só uma mancha tênue no piso. O ambiente basta
  para ler a sala; o clima é bom e não há emissivo ligado (melhor que o átrio).
- `e02`: piloto vermelho do quadro, montado acima do lambri de 1,02 m: funciona e está bem
  assentado (melhor que o do átrio).
- `e05`: a lanterna fria deixa claro o defeito da Spalding (padrão "cérebro"); vê-se o cadarço
  de perfil à esquerda.
- `e07`: é a prova mais limpa do retrato cortado em dois por prateleira e montante. Aqui o
  forro aparece azul.
- `e09`: só dentro do cone se vê que aquilo é uma rede.
- `e11`: gaveteiros finalmente visíveis; veio exagerado; fresta clara de parede entre os dois.

---

## 9. Achados transversais

### 9.1 Materiais

- **Madeiras** (`glb.mjs:66-72`): `walnut-matte` tem tint `[0.27, 0.16, 0.10]` sobre um albedo
  já escuro → preto em qualquer luz que não seja a lanterna. O veio (albedo + normal) tem
  figura grande e ondulada que domina toda peça; em superfícies afastadas vira moiré (h19,
  d08). Vale para `oak-varnished`, `oak-matte`, `walnut-polished`.
- **Latão** sem textura: lê mostarda fosca chapada em planos grandes (bases das bolas, soleiras,
  placas, nicho). Em peças torneadas pequenas funciona.
- **`iron-cast`** sem textura usado para monitores, anel do piso e quadro: três leituras
  diferentes, nenhuma boa.
- **Couro em lugar errado:** uniforme e expositores da vitrine em `leather-worn`.
- **Papel/lona em branco** em tudo que deveria ter impressão.
- **Reboco:** padrão diagonal repetido em todas as paredes do átrio.

### 9.2 Luz

- Átrio: 9 pendentes (`museum.ts:1067-1078`), 5 com alvo. Alvos acertam recepção, parede de
  orientação, plinto, torre e console. Ficam sem luz: lounge, os dois murais, as três portas,
  o quadro de energia, a placa de dedicação (só 1/3), o teto e a metade superior das paredes.
- Holyoke: 7 spots (`museum.ts:1287-1293`). Ficam sem luz: gaveteiros, 3 vãos centrais da
  vitrine, rede e banco, metade esquerda do mural, verso da tela.
- Emissivos independentes da energia (átrio).
- Sem sombra de contato em nada.

### 9.3 Texto no mundo

Legível e bom: placas das portas e placa de dedicação (`RoomText`). Todo o resto que um museu
teria (legenda de peça, painel, atril, mapa) está em branco. Legendas de mídia em inglês.

### 9.4 Escala e posição

- Plinto pequeno; nicho baixo; Spalding grande demais para o exame; impressos pequenos e
  deitados; quadro do átrio a cavalo no lambri; biombo na frente da placa; atalho no canto.
- Não vi z-fighting. Não vi objeto afundado no piso. As interpenetrações reais são as da
  vitrine corrida (§6.6).

---

## 10. O que isto pede do plano (em ordem)

1. **Vitrine corrida:** reposicionar as 4 peças no centro dos vãos (ou tirar prateleiras do
   vão do retrato e da panorâmica), pôr os impressos em pé/num berço inclinado, e criar um
   teste como o `test:desk-top`/`test:bookshelf` que prove peça × montante × prateleira.
2. **Exame:** distância por tamanho da peça (caixa delimitadora), escala de exame separada da
   de exposição, pivô no centro da peça (rede, uniforme), fotografia dentro do grupo
   examinado, luz própria no exame, e texto de ajuda por tipo de peça em vez de "Vire-a".
3. **Impressos com capa e página** (regulamento de 1897 e guia de 1916).
4. **Legendas físicas com texto** (`label-angled`, quiosque, atril, console das bolas, torre)
   pelo mesmo caminho do `RoomText`; legendas de mídia traduzidas.
5. **Luz do átrio** que faça o "acender" valer: paredes, teto, murais, lounge, portas, quadro;
   e emissivos amarrados a `roomsPowered`.
6. **Madeiras:** escala e amplitude do veio, valor do `walnut-matte`, clearcoat das portas.
7. **Bolas:** painéis da 1964, máscaras da 1998/2008, normal da Spalding na escala 2,65.
8. **Plinto:** três soquetes, presença de marco, texto.
9. **Ginásio:** fita da rede em lona clara, uniforme em lã com forma de roupa, luz na vinheta.
10. **Arrumação:** biombo fora da frente da placa, verso da tela de entrada, nicho mais alto,
    lambri numa altura só, porta do atalho com cara de porta de serviço, quadros com etiqueta
    e indicador que acende.
11. **Folga de draws no átrio** antes de acrescentar famílias (a28 já está em 100).

---

## 11. Índice das capturas

- Átrio aceso: `wf3-a01-atrium-from-office-door-lit` · `a02-plinth-wide` · `a03-plinth-top` ·
  `a04-reception-threequarter` · `a05-reception-counter` · `a06-reception-staff-aisle` ·
  `a07-ball-console` · `a08-ball-laced` · `a09-ball-1964` · `a10-ball-1998` · `a11-ball-2008` ·
  `a12-display-tower` · `a13-display-tower-front` · `a14-lounge` ·
  `a15-lectern-orientation-wall` · `a16-lectern-top` · `a17-breaker` · `a18-holyoke-door` ·
  `a19-office-door` · `a20-dedication-plaque` · `a21-shortcut-door` · `a22-ceiling-coffer` ·
  `a23-ceiling-straight-up` · `a24-mural-attack-south` · `a25-mural-dive-north` ·
  `a26-donation-box` · `a27-overview-from-nw` · `a28-overview-from-se` ·
  `a29-arrival-from-holyoke-door` · `a30-dedication-plaque-clear` · `a31-breaker-oblique` ·
  `a32-floor-grazing` · `a33-banners-west-wall` · `a34-reception-west-end` (todas `-lit.jpg`).
- Átrio escuro: `d01-…-dark-notorch` · `d02-breaker-pilot-dark-notorch` ·
  `d03-atrium-from-office-door-torch` · `d04-plinth-torch` · `d05-reception-torch` ·
  `d06-ball-console-torch` · `d07-breaker-torch` · `d08-holyoke-door-torch` ·
  `d09-office-door-torch` · `d10-ceiling-torch` · `d11-lectern-orientation-wall-torch` ·
  `d12-display-tower-torch` · `d13-lounge-torch` · `d14-dedication-plaque-torch` ·
  `d15-mural-attack-torch` · `d16-examine-ball-1964-torch` · `d17-examine-ball-laced-torch` ·
  `d18-examine-ball-1998-torch`.
- Holyoke acesa: `h01-holyoke-from-door` · `h02-holyoke-from-door-sw` ·
  `h03-hero-case-spalding` · `h04-hero-label-angled` · `h05-entry-screen` ·
  `h06-niche-ball-improvised` · `h07-kiosk` · `h08-net-gym` · `h09-gym-suit` ·
  `h10-training-set` · `h11-case-run-wide` · `h12-case-bay1-west` · `h13-handbook-1897` ·
  `h14-guide-1916` · `h15-portrait-morgan` · `h16-photo-gym` · `h17-mural-west` ·
  `h18-archive-cabinets` · `h19-breaker` · `h20-building-photo-east` ·
  `h21-shortcut-door-inside` · `h22-exit-door-inside` · `h23-overview-from-sw` ·
  `h24-overview-from-nw` · `h25-ceiling` · `h26-training-set-low` · `h27-examine-spalding` ·
  `h28-examine-portrait-morgan` · `h29-examine-handbook-1897` · `h30-examine-net-1897` ·
  `h31-examine-gym-suit` · `h32-examine-ball-improvised` · `h33-examine-photo-gym` ·
  `h34-examine-guide-1916` (todas `-lit.jpg`).
- Holyoke escura: `e01-holyoke-from-door-dark-notorch` ·
  `e02-holyoke-breaker-pilot-dark-notorch` · `e03-holyoke-from-door-torch` ·
  `e04-holyoke-from-door-sw-torch` · `e05-hero-case-torch` · `e06-entry-screen-torch` ·
  `e07-portrait-morgan-torch` · `e08-case-run-wide-torch` · `e09-net-gym-torch` ·
  `e10-gym-suit-torch` · `e11-archive-cabinets-torch` · `e12-mural-west-torch` ·
  `e13-breaker-torch` · `e14-kiosk-torch`.
