# 04 — Inventário de assets e materiais, defeitos medidos e plano de polimento

Escopo: átrio e Holyoke (a régua é a rodada do escritório, `docs/HANDOFF.md` §9.3, §9.4, §9.6).
Repositório lido em `main` (`82756c4`), sem nenhuma escrita. Caminhos relativos a
`C:\Users\rzbui\OneDrive\Documentos\Portfolio\Volleyball Museum`.

## 0. O que mais importa (leia isto primeiro)

1. **Dois livros de regras estão invisíveis e o retrato do código está cortado.** Na vitrine corrida
   da Holyoke, o `guide-1916` está inteiro DENTRO da tábua da prateleira, o `handbook-1897` está
   embaixo de outra prateleira e atravessado por um montante, e o `portrait-morgan` (o do `1896`) é
   cruzado por uma prateleira na altura dos olhos e por um montante (§3.3 H1). São as três peças que
   carregam fatos.
2. **A paleta nunca chegou à casca.** `prepareRoomShells` descarta `palette`, então `buildRoomShell`
   sempre cai no ramo neutro: Holyoke e escritório saem com piso de maple mel, teto creme e marcenaria
   de carvalho. `holyoke-floor` não é usado por nenhuma peça assada (§3.1 S1).
3. **A bola-herói da Holyoke parece uma noz.** Escala 2,65 sobre o couro de móvel: célula de grão de
   66 × 33 mm (§3.3 H2). As bolas de 1998 e 2008 do átrio têm o núcleo furando os gomos (até 2,19 mm),
   visível a olho nu e pior no exame (§3.2 A1).
4. **O "navy" não é azul e a nogueira é preta.** `holyoke-navy` rende sRGB (71, 83, 88) e vira oliva
   sob a luz quente; `walnut-polished` rende sRGB (63, 31, 7), luminância 0,020, com um normal map que
   lê como entalhe ondulado (§3.1 S3, S4).
5. **O apagão não é apagão.** Emissivos (`atrium-glow`, banners a 0,85) não dependem da energia: o
   teto e a escultura aérea já aparecem antes do quadro (§3.1 S6).
6. **O átrio está no teto de lotes (56 de 56).** Qualquer família nova reprova o `test:kit-runtime`.
   A alavanca é fundir o kit estático por material: 56 → 11 draws no átrio (§4.3 L1).
7. **A vitrine corrida é o pior asset do jogo**: escadas de caixas flutuando, documentos atravessando
   prateleiras, camisas de três caixas cortadas por prateleiras (§3.3 H3).

## 1. Método e evidências

Scripts só de leitura, em `scratchpad/wf3/tools/` (importam os geradores, nunca `scripts/bake.mjs`):

| script | o que mede |
|---|---|
| `inv.mjs totals / recipes / rooms / materials` | manifesto `bake.generated.ts` × colocações de `museum.ts` |
| `tex.mjs` | decodifica os WebP entregues e calcula a cor efetiva de cada chave (albedo médio linear × fator) |
| `geo.mjs` | reconstrói a geometria (geradores reais) e mede apoio, flutuação, interpenetração por sala |
| `geo2.mjs` | normais erradas em faces planas, facetas, projeção das molduras, tamanhos gzip/brotli |
| `media.mjs` | dimensões, VRAM e recorte `cover` de cada mídia de parede |
| `lights.mjs` | quais luminárias autoradas recebem slot de luz |

Capturas (feitas por outro agente deste fluxo, 100 arquivos) em `scratchpad/wf3/captures/`:
`wf3-a*` átrio aceso, `wf3-h*` Holyoke acesa, `wf3-d*`/`wf3-e*` escuro e lanterna. Cito pelo nome.

## 2. Inventário

### 2.1 Bundles

| bundle | bytes | gzip | triângulos | nós |
|---|---:|---:|---:|---:|
| `room-atrium.b214394f.glb` | 157.364 | 61.060 | 10.832 | 6 |
| `room-holyoke.aa0b5458.glb` | 95.548 | 38.238 | 5.808 | 5 |
| `room-office.a2144060.glb` | 78.340 | 29.448 | 4.636 | 5 |
| `kit.aeabcf76.glb` | 2.241.880 | 1.047.359 | 105.264 | 195 |
| `exhibits-atrium.6002cd90.glb` | 80.712 | 37.827 | 5.824 | 8 |
| `exhibits-holyoke.61443e51.glb` | 362.412 | 197.613 | 19.612 | 10 |
| **total** | **3.016.256** | 1.411.545 | **151.976** | 229 |

Texturas de material: 33 arquivos, 1.269.562 B no fio, **43,875 MiB de VRAM** (portão: 45).
Mídia de parede: 14 arquivos, 2.519.685 B no fio, **54,7 MiB de VRAM se residente, fora do portão** (§4.1).
JS (dist): `playerPosition` 725 KB (184 KB gzip), `MuseumCanvas` 587 KB (185), `index` 192 KB (60),
`i18n` 56 KB (20); fontes 83 + 87 KB.

### 2.2 Receitas de textura (`scripts/bake/materials.mjs`)

| receita | linhas | albedo / normal / ORM | VRAM MiB | fio KB | albedo médio (sRGB) | traço por tile |
|---|---|---|---:|---:|---|---|
| `maple-floor` | 157-246 | 1024 / 512 / 512 | 8,000 | 115 | 177,125,66 | 20 tábuas × 2 por tile (`:166-167`), junta em tijolo regular |
| `plaster` | 252-303 | 1024 / 512 / 512 | 8,000 | 63 | 198,191,176 | dente freq. 42; nuvens freq. 2-3; desempenadeira 2 por tile |
| `oak-matte` | 308-326 | 512 / 512 / 512 | 4,000 | 85 | 101,67,31 | 11 anéis; fibra freq. 14 × 9; `normalStrength` 2,6 |
| `leather-tan` | 332-372 | 512 / **1024** / 512 | 8,000 | 363 | 171,124,74 | Worley 26 + 52 células |
| `canvas` | 377-412 | 512 / 512 / 512 | 4,000 | 193 | 208,193,160 | 44 fios por tile |
| `ball-1964` | 419-449 | 64 / 512 / 64 | 1,375 | 71 | 226,218,194 | grão esférico (aspecto 0,5, some nos polos) |
| `ball-1998` | 457-484 | 64 / 512 / 64 | 1,375 | 23 | 246,245,238 (constante) | dente fino |
| `ball-2008` | 491-531 | 64 / 512 / 64 | 1,375 | 118 | 246,245,238 (constante) | covinhas 128 × 64 |
| `leather-upholstery` | 539-579 | 512 / 512 / 256 | 3,000 | 114 | 153,153,153 (neutra) | 48 células |
| `upholstery-velvet` | 589-622 | 512 / 512 / 256 | 3,000 | 88 | 202,202,202 (neutra) | fibra freq. 88 |
| `paper` | 632-663 | 512 / 256 / 128 | 1,750 | 8 | 215,216,216 (neutra) | 32 pautas por tile |
| | | | **43,875** | 1.240 | | |

Só as três receitas do escritório são neutras. `oak-matte`, `canvas`, `leather-tan` e `maple-floor`
carregam matiz forte no albedo, e todo o átrio e toda a Holyoke são tingidos sobre elas.

### 2.3 Chaves de material (`scripts/bake/lib/glb.mjs:63-231`, texturas em `scripts/bake.mjs:140-195`)

Cor efetiva = albedo médio linear × fator de runtime (medida por `tex.mjs`). Y = luminância linear.

| chave | mapas | cor efetiva sRGB | Y | onde (nós, triângulos) |
|---|---|---|---:|---|
| `plaster` | plaster | 198,191,176 | 0,526 | 8 nós, 9.388: paredes e tetos das 3 salas |
| `plaster-dark` | plaster | 145,139,126 | 0,259 | 6 nós: tampos do pódio e do atril, campo do teto, manequim |
| `oak-varnished` (clearcoat) | oak | 101,67,31 | 0,069 | 19 nós, 25.256: rodapé, cornija, guarnição, portas, banco, arquivo, molduras |
| `oak-matte` | oak | 94,61,28 | 0,058 | 4 nós: lambri das 3 salas, mastros da rede |
| `walnut-polished` (clearcoat) | oak | **63,31,7** | **0,020** | 27 nós, 18.580: quase todo móvel do átrio e da Holyoke |
| `walnut-matte` | oak | **53,24,5** | **0,014** | 6 nós: fundo dos lambris ripados, ripas do teto, recepção |
| `walnut-satin` | oak | 63,31,7 | 0,020 | 2 nós (estantes do escritório) |
| `holyoke-floor` | maple | 77,39,10 | 0,031 | **nenhuma peça assada** (§3.1 S1) |
| `maple-floor` (clearcoat) | maple | 177,125,66 | 0,244 | piso das 3 salas + disco do átrio |
| `brass` (metal 0,92, clearcoat) | lisa | 230,209,109 | 0,633 | 45 nós, 33.036: a família mais usada do prédio |
| `atrium-glow` (emissivo 2,2) | lisa | 255,184,105 | — | 7 nós, 880 |
| `iron-cast` (metal 0,75) | lisa | 110,108,105 | 0,150 | 12 nós, 5.624: anel escuro do piso, adereços da recepção, rede aérea, trilhos |
| `archive-green` | lisa | 66,91,77 | 0,092 | escritório + placa verde |
| `holyoke-navy` | canvas | **71,83,88** | 0,082 | 8 nós, 3.144: sofá, lounge, biombos, tela de entrada, forros, placa navy |
| `leather-tan` | leather | 171,124,74 | 0,235 | bola Spalding (10.136 triângulos) |
| `leather-worn` | leather | 138,93,48 | 0,135 | câmara de borracha, **traje de ginástica**, bola de treino, artefatos da vitrine |
| `canvas` | canvas | 208,193,160 | 0,543 | **páginas do Handbook e do Guia** |
| `paper-aged` | canvas | 203,179,134 | 0,466 | 8 nós: linhas da quadra, folhas do quiosque, documentos da vitrine, botões do pódio |
| `cord-hemp` | canvas | 193,175,136 | 0,437 | cordas da rede, corda de treino |
| `rope-velvet` | canvas | 147,56,53 | 0,093 | cordão da fila, faixa da vitrine |
| `ball-leather-aged`, `ball-1964`, `ball-1998-*`, `ball-2008-*` | ball-* | conforme alvo (±2%) | | bolas do átrio |
| `glass-vitrine` (BLEND 0,14) | lisa | — | | 9 nós, 3.516 |
| demais (`leather-green/desk/ledger`, `book-*`, `velvet-green`, `felt-brown`, `rug-*`, `paper-writing`, `cork`, `bakelite`, `enamel`, `plastic`, `led-*`, `glass-green`) | | medidas iguais ao alvo (são da rodada §9) | | escritório |

Chaves sem uso por peça assada: `holyoke-floor` (bug), `led-green` (trocada em runtime, correto).

### 2.4 Cascas (`buildRoomShell`, `scripts/bake/kit.mjs:342-511`)

| peça | material assado | m/tile | átrio | Holyoke | escritório |
|---|---|---:|---:|---:|---:|
| `__floor` (laje 0,18 m, topo em y = 0) | `maple-floor` | 2,1 | 300 | 300 | 300 |
| `__ceiling` (0,14 m) | `plaster` | 1,7 | 300 | 300 | 300 |
| `__structure` (paredes 0,25 m, segmentadas nos vãos) | `plaster` | 1,7 | 3.000 | 2.400 | 1.800 |
| `__panelling` (lambri liso 0,16–1,02 m, 14 mm saliente) | `oak-matte` | 0,42 | 756 | 648 | 540 |
| `__trim` (rodapé, roda-meio, trilho de quadros, cornija, guarnições, forro do vão) | `oak-varnished` | 0,6 | 6.296 | 2.160 | 1.696 |
| `__threshold` (soleira de latão, 14 mm) | `brass` | 0,3 | 180 | — | — |
| total | | | 10.832 | 5.808 | 4.636 |

Molduras medidas na parede norte do átrio (`geo2.mjs`): rodapé 30 mm saliente (y −0,002..0,162),
roda-meio 36 mm (1,018..1,084), trilho de quadros 30 mm (2,618..2,664), cornija 40 mm (8,178..8,402).
Perfis em `kit.mjs:120-160`. O trilho de quadros entra em toda sala com pé-direito > 3,12 m
(`kit.mjs:270-274`). **Claraboia: não existe geometria.** O "skylight" é um `Lightformer` no mapa de
ambiente (`src/scenes/MuseumScene.tsx:728-735`); o teto do átrio é uma laje lisa mais o
`atrium-ceiling-coffer`.

Portas: `door-leaf` / `door-leaf-right` (`scripts/bake/parts/openings.mjs:275-501`), 852 + 1.384
triângulos por folha (a ferragem pesa mais que a folha); duas folhas por vão, 4.472 por porta.
Guarnição `buildArchitrave` (`openings.mjs:185-248`), forro `buildDoorReveal` (`:63-119`).

### 2.5 Receitas do kit (triângulos = raiz + famílias; teto de prop 2.500)

**Átrio** (62 colocações → 146 nós → **56 lotes**, 46.272 triângulos instanciados):

| receita | gerador | famílias (material: triângulos) | total | cópias |
|---|---|---|---:|---:|
| `atrium-floor-inlay` | `atriumDecor.mjs:118-165` | maple 384 · iron 384 · brass 2.064 | 2.832 (shell) | 1 |
| `atrium-central-podium` | `:570-663` | walnut-pol 516 · plaster-dark 44 · brass 1.124 · paper-aged 320 · glow 48 | 2.052 | 1 |
| `atrium-barrier-segment` | `atriumFurnishings.mjs:140-179` | brass 220 | 220 | 8 |
| `atrium-reception-desk` | `atriumDecor.mjs:183-455` | walnut-matte 924 · walnut-pol 928 · brass 716 · glow 416 · **iron 1.416** · walnut-matte 108 | 4.508 (hero) | 1 |
| `donation-box` | `interpretive.mjs:609-714` | brass 1.672 · glass 432 | 2.104 | 1 |
| `rope-stanchion` | `kit.mjs:914-937` | brass 512 | 512 | 5 |
| `rope-span` | `kit.mjs:1003-1032` | rope-velvet 528 | 528 | 4 |
| `atrium-lectern` | `atriumDecor.mjs:940-1011` | walnut-pol 624 · plaster-dark 44 · brass 216 · glow 12 | 896 | 1 |
| `atrium-display-console` | `atriumFurnishings.mjs:352-471` | walnut-pol 444 · glass 60 · brass 132 | 636 | 1 |
| `atrium-lounge-set` | `:263-337` | walnut-pol 592 · navy 444 · brass 400 | 1.436 | 1 |
| `atrium-sofa` | `atriumDecor.mjs:855-926` | walnut-pol 1.080 · navy 648 · brass 536 | 2.264 | 1 |
| `atrium-display-tower` | `:678-841` | walnut-pol 1.248 · glass 432 · brass 1.128 · walnut-matte 324 · glow 192 · **brass 1.860 (artefatos)** | 5.184 (hero) | 1 |
| `atrium-divider-screen` | `atriumFurnishings.mjs:56-126` | navy 228 · walnut-pol 48 · brass 192 | 468 | 3 |
| `atrium-wall-bay-plain` | `atriumDecor.mjs:471-555` | walnut-matte 12 · walnut-pol 240 · walnut-pol 24 | 276 | **18** |
| `atrium-banner-hardware` | `interpretive.mjs:299-410` (só `battens`) | walnut-pol 384 | 384 | 4 |
| `atrium-ceiling-coffer` | `atriumDecor.mjs:1026-1096` | plaster-dark 108 · walnut-matte 684 · walnut-pol 432 · glow 48 | 1.272 (shell) | 1 |
| `atrium-aerial-installation` | `:1157-1277` | iron 192 · brass 1.728 + 1.728 + 1.008 · iron 1.788 | 6.444 (hero) | 1 |
| `atrium-pin-pendant` | `:1110-1141` | iron 200 · glow 56 | 256 | 9 |

Lotes por material no átrio: brass 16 · walnut-polished 12 · atrium-glow 6 · iron-cast 5 ·
walnut-matte 5 · plaster-dark 3 · glass 3 · navy 3 · maple 1 · paper-aged 1 · rope-velvet 1 (**11 materiais**).
Fora do `kit`: `breaker-panel` (892: iron 540, brass 304, glass-green 48), placas `wayfinding-plaque-*`
(924 cada) e `dedication-plaque` (2.280), folhas de porta.

**Holyoke** (18 colocações → 42 nós → 28 lotes, 16.868 triângulos instanciados; 10 materiais):

| receita | gerador | famílias | total | cópias |
|---|---|---|---:|---:|
| `holyoke-entry-screen` | `holyokeDecor.mjs:66-163` | navy 516 + 12 · brass 864 · glass 108 | 1.500 | 1 |
| `history-info-kiosk` | `:507-580` | walnut-pol 732 · navy 324 · paper-aged 36 · brass 324 | 1.416 | 1 |
| `history-hero-case` | `:413-493` | walnut-pol 540 · brass 144 · glass 60 · paper-aged 216 | 960 | 1 |
| `history-case-run` | `:179-398` | walnut-pol 816 · rope-velvet 12 · navy 48 · brass 652 · glass 60 · paper-aged 312 · leather-worn 408 | **2.308** | 1 |
| `label-angled` | `interpretive.mjs:92-147` | brass 620 | 620 | 3 |
| `gym-court-lines` | `holyokeDecor.mjs:594-631` | paper-aged 132 | 132 | 1 |
| `bench` | `kit.mjs:1035-1069` | oak-varnished 1.156 | 1.156 | 1 |
| `gym-training-set` | `holyokeDecor.mjs:664-737` | oak-varnished 800 · cord-hemp 1.120 · leather-worn 168 | 2.088 | 1 |
| `ceiling-spot` | `fixtures.mjs:139-216` | iron 268 · brass 424 | 692 | 7 |
| `vent-grille` | `fixtures.mjs:525-593` | iron 604 | 604 | 1 |
| `archive-cabinet` (containers) | `kit.mjs:1079-1123` | oak-varnished 2.212 | 2.212 | 2 |

**Receitas assadas e não colocadas em sala nenhuma** (16 receitas, 17.156 triângulos, 16,3% do kit):
`plinth-block`, `plinth-tapered`, `medallion-socket` (1.432), `vitrine-table`, `vitrine-glass`,
`label-plaque`, `vitrine-wall`, `vitrine-tower`, `partition`, `frame-empty`, `interp-panel`, `banner`,
`reception-desk`, `pendant`, `atrium-wall-bay` (com placa), `threshold` (cópia do kit). Viajam no
`kit.glb` de todo jogador.

Escritório (régua, fora de escopo): 17 colocações, 53 lotes, 34.230 triângulos, 24 materiais.

### 2.6 Receitas de exhibits (`scripts/bake.mjs:277-404`)

| receita | gerador | material | triângulos | orçamento |
|---|---|---|---:|---:|
| `ball/leather-laced-1900` | `historicalVolleyballs.mjs:250-309` | ball-leather-aged 1.584 · rawhide-lace 640 | 2.224 | 15.000 |
| `ball/classic-white-18-panel` | `:316-321` | ball-1964 | 1.152 | 15.000 |
| `ball/tricolour-1998` | `:324-339` | branco 864 · azul 144 · amarelo 144 | 1.152 | 15.000 |
| `ball/eight-panel-2008` | `:346-354` | azul 1.008 · amarelo 288 | 1.296 | 15.000 |
| `ball/spalding-laced-1900` | `kit.mjs:627-659` | leather-tan | 10.136 | 15.000 |
| `ball/basketball-bladder-1895` | `kit.mjs:662-680` | leather-worn | 1.512 | 15.000 |
| `net/ymca-1897` | `kit.mjs:687-749` | oak-matte 1.480 · cord-hemp 612 | 2.092 | 2.500 |
| `paper/handbook-1897` | `kit.mjs:758-799` | canvas | 1.848 | 2.500 |
| `paper/spalding-guide-1916` | `kit.mjs:802-823` | canvas | 648 | 2.500 |
| `apparel/gym-suit-1900` | `kit.mjs:834-907` | plaster-dark 1.264 · leather-worn 968 | 2.232 | 2.500 |
| `frame/portrait-small`, `frame/panorama-wide` | `kit.mjs:1126-1174` | oak-varnished | 572 cada | 2.500 |

As quatro bolas do átrio gastam 8% a 15% do orçamento de herói. Há muito triângulo livre ali.

### 2.7 Arte de parede e sinalização (runtime, `src/engine/RoomWallArt.tsx`, `RoomSignage.tsx`)

| peça | arquivo (px) | VRAM MiB | tamanho no mundo | mostra do original | px/m |
|---|---|---:|---|---|---:|
| murais do átrio ×2 | 1024×1536 | 8,00 cada | 3,45 × 5,05 m | 100% × 98% | 297 |
| banners do átrio ×4 | 512×1155..1357 | 3,0–3,5 cada | 1,04 × 4,04 m | **58–68% da largura** | 286–336 |
| painel de orientação | SVG 1600×320 | 2,60 | 5,8 × 1,16 m | 100% | 276 |
| mãos da entrada (Holyoke) | 1024×1280 | 6,67 | 2,32 × 2,55 m | 100% × 88% | 441 |
| mural do ginásio | 1536×614 | 4,80 | 6,8 × 2,8 m | 97% × 100% | **219** |
| prédio (leste) | 1024×1266 | 6,59 | 2,25 × 2,65 m | 100% × 95% | 455 |
| friso 01 / 02 / 03 / 04 | 768 / 1024 / **314** / 1115 px de largura | 4,66 / (6,59) / 0,76 / 2,46 | 2,35 × 0,76 m | altura: **21% / 26% / 21%** / 83% | 327 / 436 / **134** / 474 |

Molduras de arte são caixas de runtime com cor fixa `#35261c` (`RoomWallArt.tsx:130-133`), fora da
biblioteca de materiais. Texto: Troika, um draw por bloco (9 no átrio).

### 2.8 Luz (`src/engine/galleryLightRig.ts`, `RoomLighting.tsx:34-66`, `MuseumScene.tsx:721-770`)

Pool fixo de 8 spots (6 da sala + 2 retidos) + 2 points + 1 lanterna. Por sala: até 5 chaves + 1 wash.
Ambiente: `Lightformer` zenital 2,0 + preenchimento frio 0,4 + rebote 0,16; `ambientLight` 0,1.
Nada disso depende da energia da sala; só as intensidades dos spots.

- Átrio: 9 pendentes visíveis, 5 emitem (recepção, painel de orientação, pódio, torre, console das
  bolas). Os 4 sem `lightTarget` são só geometria com lente acesa (`museum.ts:1075-1078`).
- Holyoke: 7 trilhos, `sampleEvenly` (`galleryLightRig.ts:67-74`) fica com os índices 0, 2, 3, 5, 6 e
  **descarta** `[0,4.2,6.3]→[0,1.4,7.25]` (meio da vitrine corrida) e `[0,4.2,-6.3]→[0,1.15,-5.25]`
  (a rede). Nenhuma chave aponta para a vitrine-herói nem para o quiosque.

## 3. Defeitos medidos

### 3.1 Do pipeline (valem para as duas salas e para as cinco alas futuras)

**S1 — A paleta não chega à casca.** `prepareRoomShells` devolve só `{ id, shell, portals }`
(`kit.mjs:86-112`); `buildRoomShell` lê `room.palette` (`:344-345`), que é sempre `undefined`.
Medido: as três salas saem `floor:maple-floor ceiling:plaster panelling:oak-matte trim:oak-varnished`;
com a paleta passada, a Holyoke sairia `holyoke-floor / plaster-dark / walnut-matte / walnut-polished`
e o escritório `walnut-matte / plaster / walnut-matte / walnut-polished`. O ramo existe desde `16aeb6f`
e o manifesto daquele commit já trazia `holyoke__floor: maple-floor`. Os comentários de `kit.mjs:472-474`
e `glb.mjs:79-82` descrevem um resultado que nunca foi assado. Atenção ao consertar: muda também o
escritório, que foi polido com o piso de maple, e o `holyoke-floor` como está (Y 0,031) sai quase preto.

**S2 — Passe de vinco sobre caixas biseladas entorta as normais.** `finalize` com `crease` ≠ `null`
sobre `bevelledBox` reproduz o defeito descrito em `geometry.mjs:75-93`. Medido (`geo2.mjs`: fração da
área de faces planas alinhadas aos eixos com normal a mais de 2° da face; pior desvio):

| família | faces erradas | pior | família | faces erradas | pior |
|---|---:|---:|---|---:|---:|
| `archive-cabinet` | 99% | 20° | tampo do pódio (`__top`) | 100% | 15° |
| `bench` | 99% | 20° | latão do pódio (`__brass`) | 100% | 20° |
| molduras `frame/*` | 100% | 20° | tampo do atril | 100% | 15° |
| `paper/spalding-guide-1916` | 100% | 20° | adereços da recepção | 69% | 19° |
| `net` (faixas de lona) | 100% | 20° | latão e artefatos da torre | 100% | 20° |
| `label-angled` | 100% | 18° | latão do sofá | 100% | 20° |
| `donation-box` (pedestal) | 79% | 20° | alavanca do `breaker-panel` | 100% | 20° |
| trilho do `ceiling-spot` | 46% | 21° | `wall-sconce`, `vent-grille` | 100% / 75% | 20° / 26° |
| `plinth-*`, `vitrine-table`, `vitrine-glass`, `vitrine-tower` (não colocados) | 95–100% | 12–24° | guarnição (`buildArchitrave`) | 47% | 29° |

Efeito: face plana envernizada ou de latão com gradiente de "almofada". Corretas hoje: tudo o que usa
`finishBoxes` (`crease: null`), folhas de porta, placas, corpo do pódio.

**S3 — Veio sempre horizontal.** `boxProjectUVs` (`geometry.mjs:421-476`) põe U em X ou Z do mundo e a
receita de madeira corre o veio em U (`materials.mjs:109-149`). Todo membro vertical (ripas dos
lambris, montantes de vitrine, pernas, mastros da rede, montantes de porta, guarnição) tem veio
atravessado. Visível em `wf3-a12`, `wf3-a13`, `wf3-h09` (mastro listrado como um bastão).

**S4 — Tints sobre albedo com matiz.** Mesma classe do couro oliva de §9.3:

| chave | efetiva (linear) | R:G:B | sob a chave quente `#ffd49a` | intenção |
|---|---|---|---|---|
| `holyoke-navy` | 0,063 / 0,086 / 0,098 | 0,74 : 1 : 1,14 | R ≥ G > B, **oliva-acinzentado** | Prussian navy `#1F2A44` (B/R ≈ 2,2) |
| `walnut-polished` | 0,050 / 0,013 / 0,002 | 3,7 : 1 : 0,16 | marrom-avermelhado quase preto | nogueira (declarado Y 0,11; rende 0,020) |
| `maple-floor` | 0,439 / 0,206 / 0,054 | 2,13 : 1 : 0,26 | laranja abóbora | maple mel |
| `paper-aged` | 0,595 / 0,450 / 0,238 | 1,32 : 1 : 0,53 | cáqui | papel envelhecido |

Nas capturas: forro "navy" verde-acinzentado (`wf3-h13`, `wf3-h16`), piso laranja saturado (`wf3-a01`),
lambri e móveis pretos (`wf3-a14`, `wf3-a18`). O `oak-matte` tem R/B de 9,4: nenhum tint ≤ 1 o
dessatura. Conserto estrutural: receitas neutras para madeira e para tecido de trama.

**S5 — Normal de madeira forte demais.** `normalStrength` 2,6 (`materials.mjs:317`) com clearcoat: a
nogueira lê como entalhe em ondas (`wf3-a07`, `wf3-a10`, `wf3-a03`). No escritório o mesmo mapa passa
porque a luminária dá cor de perto; no átrio escuro só sobra o relevo. `normalScale` já é uniform
(`materialSpec.ts:101-106`), custo zero.

**S6 — Emissivos e ambiente ignoram a energia.** `atrium-glow` (2,2) é material de biblioteca
(`glb.mjs:87`), `selfIllumination` vai direto para `emissiveIntensity` (`RoomWallArt.tsx:154-156`) e o
ambiente é renderizado uma vez (`MuseumScene.tsx:726`). Em `wf3-d01` (átrio sem energia, sem lanterna)
o filete do teto, a fáscia da recepção, o halo do pódio, as lentes dos pendentes e os quatro banners
estão acesos, e a escultura aérea e o caixotão são legíveis. Isso contradiz a premissa de `museum.ts:898-900`
e de `flashlightRig.ts:9-13` (o facho nunca chega ao teto justamente para guardar a revelação).

**S7 — Latão lê preto em face vertical.** Metal 0,92 só reflete; o ambiente tem luz no zênite e quase
nada no horizonte. Postes e mastros saem pretos com base e ponteira douradas (`wf3-a02`, `wf3-a32`),
malha dos biombos preta (`wf3-a12`), elevadores do console como chapas mostarda chapadas (`wf3-a07`).

**S8 — O exame segura a peça pela origem, sem enquadrar.** `ExamineView` leva a ORIGEM do grupo a
0,42 m da câmera (`Interaction.tsx:166, 331-334`) e mantém a escala de apresentação. Resultado: a
Spalding a 2,65× enche a tela inteira (`wf3-h27`), o traje de ginástica é examinado pela base do
manequim (`wf3-h31`), a rede de 4,98 m é segurada pelo meio do chão.

**S9 — Superfícies de interpretação em branco.** Nenhum runtime escreve nas faces documentadas de
`label-angled` (`interpretive.mjs:88-90`), nas folhas do quiosque, no tampo do atril e do pódio
(`grep` por `label-angled` em `src/` só acha o manifesto e `museum.ts`). Em `wf3-h09`, `wf3-h10`,
`wf3-h07`, `wf3-a16` são chapas lisas.

**S10 — Esfera com UV projetada da origem da receita.** `finishMixed(leather, 0.30, 'sphere')`
(`holyokeDecor.mjs:735`) projeta depois de transladar a bola para (0,70; 0,25; −0,19): a bola de 0,5 m
amostra 11% × 21% de um tile, com frente e verso espelhados.

### 3.2 Átrio

| # | defeito | medida | onde |
|---|---|---|---|
| A1 | Núcleo fura os gomos das bolas 1998 e 2008 | núcleo com vértices a r = 103,80 mm; cordas dos gomos descem a 102,51 mm (1998) e 101,61 mm (2008): **1,29 e 2,19 mm para fora** | `historicalVolleyballs.mjs:36, 87-89, 200-201, 235-236`; `wf3-a10`, `wf3-a11`, `wf3-d18` |
| A2 | Quadro de energia flutua na frente do lambri | fundo em x = −8,620; reboco em −8,875 (**255 mm**), ripas em −8,760 (140 mm), capa em −8,725 (105 mm) | `museum.ts:909`; `wf3-a31` |
| A3 | Barra de baixo dos banners atravessa a estampa | barra herda o giro de 0,22 rad do pano que não existe: x −8,889..−8,571, plano da estampa −8,677: **106 mm à frente, 212 atrás, 14 mm dentro da parede**; cruza a estampa 120–172 mm acima da borda; estampa mostra só 58–68% da arte | `interpretive.mjs:308, 402`; `bake.mjs:648, 1046-1050`; `museum.ts:1060-1063, 1140-1182`; `wf3-a33` |
| A4 | Lambris ripados sobrepostos, com vãos e mordendo guarnições | oeste: baias 0/1 **sobrepostas 0,30 m** (fundo coplanar, ripas dobradas), 1ª baia 75 mm dentro da parede norte, vãos de 1,70 e 0,30 m, três mordidas de 68 mm nas guarnições das duas portas; leste: vãos de 0,10 m ×2; norte e sul: capas e rodapés coplanares 40/20 mm em 8 emendas, 0,875 m nus em cada canto | `museum.ts:1041-1058`; `atriumDecor.mjs:471-555` |
| A5 | Fresta de 30 mm sob a capa do lambri | topo das ripas y = 1,395, capa em 1,425: os topos pegam luz e viram uma linha tracejada em volta da sala | `atriumDecor.mjs:504-505, 515-519`; `wf3-a17`, `wf3-a31` |
| A6 | Guarda-corpo do pódio facetado | corrimão com 5 lados (72° entre faces, vinco 36°), postes de 8 lados, ponteira esfera 6×4; 59% da área em sombreamento chapado | `atriumFurnishings.mjs:146, 164, 168, 172`; `wf3-a03` |
| A7 | Pódio central não é o plinto das medalhas | quatro "botões" em `paper-aged` (lona a 0,18 m/tile) em vez de três soquetes; `medallion-socket` assado e não colocado; tampo com normais erradas | `atriumDecor.mjs:570-663`; `kit.mjs:939-993`; `docs/PLANO-COMPLETO.md:64-65` |
| A8 | Disco do piso: mesma textura na metade da escala, sem raio | tábuas de 57 × 575 mm dentro, 105 × 1.050 mm fora; projeção em caixa (tábuas retas num disco "radial"); anel escuro é `iron-cast` metálico liso; filetes de latão são toros de 5 lados em polígono de 64 (flecha 9,6 mm no raio 8,07) | `atriumDecor.mjs:118-165`; `wf3-a32` |
| A9 | Cadeiras da recepção flutuam | menor vértice y = 42,5 mm: bases de cinco pontas e haste no ar | `atriumDecor.mjs:306-316`; `wf3-a06` |
| A10 | Adereços da recepção todos em ferro fundido | monitores, assentos, encostos, folhetos e abajur em `iron-cast`; cúpula do abajur é cilindro aberto de face única | `bake.mjs:968`; `atriumDecor.mjs:280-336` |
| A11 | Torre: medalha flutua, fitas penduradas no nada | disco da medalha a y 1,120, suporte termina em 1,098 (**22 mm de ar**); fitas de 1,22 a 1,36 sem apoio; bola 11 mm dentro da pastilha luminosa e anéis 6,5 mm dentro da prateleira; pastilhas centradas em x = 0 com objetos em ±0,18 | `atriumDecor.mjs:741-743, 768-803` ; `wf3-a12`, `wf3-a13` |
| A12 | Lounge: tampo flutua, perna atravessa mesa, postes furam almofadas | mesa lateral: haste até 0,4575, tampo desde 0,4725 (**15 mm de ar**); perna da mesa grande (x 0,112..0,138, z 0,802..0,828) atravessa o tampo da pequena (y 0,300..0,345); assento de 0,62 m entre postes com 0,545 m de vão | `atriumFurnishings.mjs:186-239, 278-303` |
| A13 | Lounge e sofá são um buraco preto | navy sobre lona (trama de 11–14 mm) + nogueira Y 0,02 + nenhuma chave de luz | `wf3-a14`; `museum.ts:1071-1074` |
| A14 | 4 dos 9 pendentes pendem do nada | rosetas a y = 8,220; fora do caixotão (x ±4,4, z ±6,2) o teto está em 8,400: **180 mm de ar** nos de (−4,8; 4,8), (−5,2; 1,8), (6,1; −4,4), (4,5; 0,9); três deles são fontes de luz | `museum.ts:1067-1078`; `atriumDecor.mjs:1026-1096` |
| A15 | Painel de orientação e banners a 195 mm do reboco | moldura fina de 24 mm sem fundo; de lado vê-se o vão | `museum.ts:1109, 1142` |
| A16 | Atril em branco | tampo `plaster-dark` liso, sem conteúdo | `atriumDecor.mjs:940-1011`; `wf3-a16` |
| A17 | Portas ilegíveis com a sala acesa | folha `oak-varnished` Y 0,069 sem luz dirigida; maçaneta em tubo de 8 lados chapado | `wf3-a18`; `openings.mjs:475` |
| A18 | Placa de dedicatória com veio de 73 mm atrás do texto | `walnut-polished` a 0,8 m/tile | `interpretive.mjs:839`; `wf3-a13` |
| A19 | Reboco repete | 10,7 × 4,9 repetições por parede; nuvens e faixas de baixa frequência viram padrão | `kit.mjs:479`; `materials.mjs:254-298`; `wf3-a01` |
| A20 | Menores | bola de cadarço 3,0 mm acima do elevador; caixotão 10 mm abaixo do teto; armários da recepção 135 mm dentro do lambri (oculto) | `museum.ts:164, 1065` |

### 3.3 Holyoke

| # | defeito | medida | onde |
|---|---|---|---|
| H1 | **Peças reais colidem com a vitrine corrida** | `guide-1916`: y 1,320..1,331 dentro da tábua do vão 2 (1,306..1,334) e 27 mm dentro do montante; sobra uma lasca visível. `handbook-1897`: embaixo da prateleira do vão 3 (15 mm dentro dela), 65 mm dentro do montante, `supportY` 1,32 contra superfície real 1,3835 (−63,5 mm). `portrait-morgan`: cruzado pela prateleira de 1,856..1,883 em 295 mm e pelo montante em 65 mm. `photo-gym`: prateleira de 1,896..1,923 por 1,285 m, montante, e divide volume com a "camisa" e o número assados | `museum.ts:371, 399, 448, 477`; `holyokeDecor.mjs:259-267`; `wf3-h13`, `wf3-h14`, `wf3-h15`, `wf3-h16`, `wf3-h29` |
| H2 | Bola-herói com grão gigante | UV esférica sobre o couro de móvel: 26 células na volta de 1,715 m (escala 2,65) = **66 mm no equador × 33 mm**, esticadas 2:1 e beliscadas nos polos; costuras afundam 10 mm no pedestal | `kit.mjs:627-659`; `materials.mjs:340-341`; `museum.ts:310-311`; `wf3-h03`, `wf3-e05`, `wf3-h27` |
| H3 | Recheio assado da vitrine corrida | catálogos: 17–20 mm no ar ou 11 mm afundados; rolos: **112, 167 e 222 mm no ar**, interpenetrando; caixas em escada com 15 mm de ar entre degraus (32,5 mm o primeiro); livros-caixa: 17,5 mm e depois 5 mm; bola de couro 46,5 mm no ar; bola pequena 20 mm; seis documentos atravessam a prateleira 75–111 mm; duas "camisas" (três caixas cada) cortadas pela prateleira de cima; quatro medalhas soltas a 0,35 m do fundo | `holyokeDecor.mjs:311-387`; `wf3-h11` |
| H4 | Vitrine-herói sem chave de luz | nenhum slot aponta para (−1; 1,29; 1,8); só o wash de 14 | `galleryLightRig.ts:67-74`; `museum.ts:1287-1293` |
| H5 | Murais atrás das molduras | `holyoke-gym-mural` a 3 mm do reboco: 170 mm de baixo atrás do lambri, cruzado pelo roda-meio e **pelo trilho de quadros a 2,62 m**; `holyoke-building-east` idem | `museum.ts:1310-1328`; `kit.mjs:270-274`; `wf3-h17` |
| H6 | Traje de ginástica é um cilindro de couro | malha de lã em `leather-worn` com células de 13,5 mm; sem mangas, gola ou forma de roupa | `kit.mjs:834-907`; `bake.mjs:324-334`; `wf3-h09` |
| H7 | Conjunto de treino | clavas de 10 lados, bola de 0,5 m com 12×8 e UV errada (S10), corda de 6 lados, rótulo a 30 mm da bola | `holyokeDecor.mjs:638-737`; `wf3-h10` |
| H8 | Rede fora do meio da quadra | linha central em z = −3,45; rede em z = −5,60: **2,15 m fora** | `museum.ts:345, 1278` |
| H9 | Friso recorta o rosto do Morgan | mostra 21% da altura do retrato (nariz e boca), a 134 px/m | `museum.ts:1332`; `RoomWallArt.tsx:69-89`; `wf3-h11` |
| H10 | Páginas de livro e documentos em lona | `canvas` e `paper-aged` com fio de 7–12 mm (mesmo defeito do papel do escritório antes de §9.3) | `bake.mjs:313, 320, 911, 923, 933`; `wf3-h29`, `wf3-h07` |
| H11 | Câmara de borracha em couro granulado | `leather-worn` com células de 26 × 13 mm numa peça cuja lição é ser borracha lisa | `bake.mjs:292` |
| H12 | Vitrine-herói com latão sem bisel | 12 barras `BoxGeometry` de 25 mm; pedestal em lona de 7,7 mm | `holyokeDecor.mjs:467-485, 442-447` |
| H13 | Nicho da primeira peça na canela | prateleira a 0,227 m, topo a 0,515 m; bola 5,4 mm no ar | `holyokeDecor.mjs:123-155`; `museum.ts:287-289` |
| H14 | Quadro e grelha a 15 mm do reboco | fundo em x = 5,860, parede em 5,875; a base do quadro (1,05) monta no roda-meio (1,018..1,084) | `museum.ts:1230, 1294` |
| H15 | Quiosque e rótulos em branco (S9); folhas em trama de 11,8 mm | | `holyokeDecor.mjs:546-562`; `wf3-h07` |
| H16 | Piso, teto e marcenaria fora da paleta (S1); forro navy oliva (S4) | | `wf3-h01` |

### 3.4 Escala de grão (m/tile → tamanho do traço)

| superfície | material | m/tile | traço | veredito |
|---|---|---:|---|---|
| piso das salas | maple | 2,1 | tábua 105 mm × 1,05 m, juntas alinhadas a cada 2 fiadas | aceitável; junta regular lê tijolo |
| disco do átrio | maple | 1,15 | tábua 57 × 575 mm | errado: metade da escala do piso ao lado |
| bola Spalding (2,65×) | leather-tan | esfera | 66 × 33 mm | **errado** (couro real 1–3 mm) |
| câmara de borracha | leather-tan | esfera | 26 × 13 mm | errado (deveria ser liso) |
| traje de ginástica | leather-tan | 0,35 | 13,5 mm | errado (material e escala) |
| artefatos da vitrine | leather-tan | 0,28 | 10,8 mm | errado |
| tela de entrada, forros, placa navy | canvas | 0,72 | fio de 16,4 mm | errado (deveria ser pintura) |
| tapete e poltronas do lounge | canvas | 0,62 | 14,1 mm | errado |
| sofá | canvas | 0,48 | 10,9 mm | errado |
| folhas do quiosque | canvas | 0,52 | 11,8 mm | errado |
| linhas da quadra | canvas | 0,65 | 14,8 mm (2,6 fios numa linha de 38 mm) | errado |
| páginas do Handbook / Guia | canvas | 0,35 / 0,30 | 8,0 / 6,8 mm | errado |
| documentos e pedestal | canvas | 0,34 | 7,7 mm | errado |
| cordão da fila | canvas | 0,25 | 5,7 mm | tolerável (corda) |
| tampo da recepção | oak | 0,95 | banda de anel 86 mm | errado ("mapa topográfico", `wf3-a06`) |
| placa de dedicatória | oak | 0,8 | 73 mm | errado |
| ripas dos lambris | oak | 0,34 | 31 mm numa ripa de 65 mm, atravessado | errado |
| reboco | plaster | 1,7 | nuvens de 0,6–0,85 m repetindo 10× | repetição visível |

Régua do escritório para comparar: couro 0,08–0,13 m/tile (2,7–3 mm), pano 0,06, tapete 0,4.

### 3.5 Outras leituras de "arte de programador"

- **Caixas sem bisel a distância de leitura**: postes e portas do console, postes dos biombos (58 × 60 mm,
  2,4 m), todas as peças das poltronas, pernas de mesa, barras e portas da vitrine-herói, montantes,
  prateleiras e réguas da vitrine corrida, elevadores de latão do console.
- **Silhueta poligonal**: bola de treino 12×8 (0,5 m), bola da vitrine 12×8 (0,34 m), clavas de 10 lados,
  tampo da mesa lateral de 16 lados, rolos de papel de 8 lados, puxadores de 6 lados, medalhas de 10.
- **Risco de z-fight**: sobreposição coplanar das baias (A4); anéis do piso a 1,0 e 1,5 mm do disco
  (seguro em depth de 24 bits com `near` 0,08, falha em 16 bits); o resto tem ≥ 3 mm.

## 4. Orçamentos hoje, folga e alavancas

### 4.1 Onde cada orçamento está

| orçamento | alvo / teto | hoje | folga | quem cobra |
|---|---|---|---|---|
| VRAM de texturas de material | 45 MiB | 43,875 | **1,125 MiB** | `bake.mjs:198, 559-564`; `test-materials.ts:166-171` |
| VRAM de mídia de parede | (não existe) | 31,4 MiB no átrio, 25,9 na Holyoke | — | ninguém |
| triângulos por receita | prop 2.500 · herói 15.000 · casca 30.000 | `history-case-run` 2.308, `atrium-sofa` 2.264, `archive-cabinet` 2.212, `donation-box` 2.104, `gym-training-set` 2.088, `atrium-central-podium` 2.052 | 192 a 448 | `bake.mjs:217-234, 1158-1175` |
| lotes do kit no átrio | ≤ 56 | **56** | **0** | `test-kit-runtime.ts:267-274` |
| triângulos instanciados no átrio | ≤ 50.000 | 46.272 | 3.728 | `test-kit-runtime.ts:275-281` |
| lotes / triângulos do escritório | ≤ 53 / ≤ 36.000 | 53 / 34.230 | 0 / 1.770 | `test-kit-runtime.ts:289-303` |
| Holyoke | sem teto em teste | 28 lotes, 16.868 | — | — |
| draw calls no frame | desktop 120 (teto 250); mobile 45 (teto 100) | átrio 80, Holyoke 55, escritório 58–66, pico de porta 93 | átrio a 20 do teto móvel | só PerfHud (`docs/HANDOFF.md` §2) |
| triângulos no frame | mobile 90k (teto 150k) | átrio 64.256, Holyoke 51.478 | 25k | só PerfHud |
| programas de shader | 25 | átrio 15, Holyoke 13, escritório 29–31 | +10 / +12 / −6 | nenhum teste |
| `kit.glb` | ≤ 800 KB (`docs/REFERENCIA-TECNICA.md:268`) | 2.189 KB (1.047 gzip) | 2,7× acima | ninguém |

Famílias de programa (derivado de `materialSpec.ts`, não medido): texturizado padrão; texturizado com
clearcoat; texturizado com sheen; liso padrão; liso com clearcoat; liso transparente. Cada uma dobra
quando existe em versão instanciada (kit) e não instanciada (casca, exhibits, portas, dispositivos).
Chave nova que repete uma combinação custa zero.

### 4.2 Para onde vai o draw call do átrio (80 no frame de referência)

Casca 6 · kit 56 lotes · exhibits 8 · arte de parede 10 (3 emolduradas × 2 + 4) · placas 3 · textos 9 ·
quadro 3 · portas até 12. O kit é 70% do frame.

### 4.3 Alavancas, em ordem de retorno

| # | alavanca | ganho | custo | onde |
|---|---|---|---|---|
| L1 | **Fundir o kit estático por material, por sala** (geometria fundida com a matriz de cada colocação; um `Mesh` por material) | átrio 56 → 11 draws, Holyoke 28 → 10, escritório 53 → 24; frame do átrio ~80 → ~35 (abaixo do alvo móvel de 45); some a variante instanciada de cada programa | ~1,3 MB de buffers no átrio; perde culling por objeto (a sala já é a unidade de portal); colliders não mudam (vêm do manifesto) | `src/engine/kitPart.ts:102-153`; tetos em `test-kit-runtime.ts:267-303` |
| L2 | Lambri ripado dentro da casca do átrio | −3 lotes, −4.968 triângulos instanciados, e resolve A4/A5 de uma vez (a casca conhece vãos e cantos) | +~4,5k triângulos na casca (10,8k → 15,3k de 30k) | `kit.mjs:252-266` |
| L3 | Realocar VRAM sem KTX2 | **−12 MiB**: normal do `leather-tan` 1024 → 512 (−4,0), albedo do `plaster` 1024 → 512 (−4,0), ORM 512 → 256 em plaster, oak, canvas, leather-tan (−4,0) | regravar a tabela de `materials.mjs:14-26`; conferir o reboco a 1 m | `materials.mjs:269-271, 314-316, 355-357, 397-399` |
| L4 | Agrupar por geometria + material | 1–2 lotes no escritório (carcaças A/B), 0 no átrio | pequeno; fica obsoleto com L1 | `kitPart.ts:113-131` |
| L5 | Mídia no portão e reduzida | murais 8,0 → 4,5 MiB cada a 768×1152; friso do Morgan trocado | re-exportar 2 arquivos | `scripts/fetch-media.mjs`, `media.authored.ts` |
| L6 | Kit por sala (ou "kit futuro" preguiçoso) | −17.156 triângulos (~16%, ~165 KB gzip) no primeiro download | regra de bundle no bake | `bake.mjs:652-1087` |
| L7 | KTX2/Basis (ETC1S em albedo/ORM, UASTC em normal) | 43,9 → ~7,7 MiB; mídia 8× | transcoder ~260 KB gzip (preguiçoso), codificador no build | `materials.ts`, `texture.mjs:301-304` |
| L8 | Texto de placa numa textura por placa | −6 a −8 draws por sala | canvas por idioma no runtime | `RoomSignage.tsx` |
| L9 | Usar os 2 slots retidos enquanto toda porta está trancada | +2 chaves de luz por sala sem mudar a contagem de luzes | lógica de fade na abertura | `galleryLightRig.ts:127-141` |

Com L3, cabem sem KTX2: madeira e lona neutras (0, substituem no lugar), tinta lisa neutra 256/256/64
(0,69), malha de lã 512/512/128 (2,75), couro de bola antiga esférico 64/512/64 (1,375), pedra/terrazzo
256/512/128 (1,75), papel sem pauta 256/256/64 (0,69): 31,9 + 7,3 = 39,1 MiB, folga de 5,9. **KTX2 passa a ser
obrigatório antes da terceira ala nova**, ou as alas só entram com tint sobre receitas neutras.

## 5. Plano de polimento ranqueado

Custo: Δtriângulos / ΔVRAM / Δdraws / Δprogramas. "0" = nenhum.

### 5.1 Onda 0 — consertos que não custam nada e mudam tudo (fazer primeiro)

| # | item | retorno | custo | funções |
|---|---|---|---|---|
| 0.1 | Reposicionar as 4 peças reais da vitrine corrida em apoios reais (centro do vão, topo da prateleira) e tirar o recheio assado que ocupa o mesmo volume | altíssimo: dois fatos e o código voltam a existir | 0 / 0 / 0 / 0 | `museum.ts:371-374, 399-402, 448, 477`; `holyokeDecor.mjs:336-387`; exportar `layout` com os topos das prateleiras |
| 0.2 | `normalScale` 0,35–0,45 nas chaves de madeira | alto: some o "entalhe ondulado" das duas salas | 0 | `glb.mjs:66, 67, 71, 72, 78` (conferir a mesa do escritório) |
| 0.3 | Passar `palette` para a casca e trocar os dois booleanos por uma tabela `SHELL_PALETTES` | alto: Holyoke ganha identidade (piso tabaco, teto escuro, nogueira) | 0 | `kit.mjs:86-112, 344-345, 463-495`; reafinar `holyoke-floor` (`glb.mjs:82`) para Y ≈ 0,06; decidir o piso do escritório |
| 0.4 | Tesselar gomos e núcleo das bolas 1964/1998/2008; recuo do núcleo 1,2 → 2,0 mm; portão "corda do gomo > raio do núcleo + 0,3 mm" | alto: o único acervo examinável do átrio | +~13,5k no bundle de exhibits (gomos 12×6 e 8×24, núcleo 48×32: cada bola ≤ 6,1k de 15k) | `historicalVolleyballs.mjs:36, 87-89, 200-201, 235-236` |
| 0.5 | Emissivos e `selfIllumination` multiplicados pela energia da sala (pilotos ficam) | alto: devolve o escuro e a revelação do teto | 0 (uniforms) | `materials.ts:87-104`, `materialSpec.ts:54-57`, `RoomWallArt.tsx:154-156`, `kitPart.ts:80-86` |
| 0.6 | Separar caixas (sem vinco) de peças torneadas em toda família com `finishMixed`/`crease` | médio-alto: latão e verniz param de "almofadar" | 0 | helper novo em `geometry.mjs`; chamadas em `kit.mjs` (543, 572, 595, 609, 1068, 1122, 1173), `interpretive.mjs:146, 711`, `fixtures.mjs:210-214, 472, 592, 665`, `atriumDecor.mjs:452, 658-660, 836-839, 924, 1007` |
| 0.7 | Chave de luz na vitrine-herói; prioridade explícita em vez de `sampleEvenly`; 5 trilhos autorados em vez de 7 | alto | 0 | `galleryLightRig.ts:54-74`; `museum.ts:1287-1293` |
| 0.8 | Quadro do átrio no reboco (ou num painel de serviço), base acima do roda-meio; quadro e grelha da Holyoke encostados | médio | 0 | `museum.ts:909, 1230, 1294` |
| 0.9 | Barras dos banners retas (`twist: 0`) e estampa no formato da arte | médio | 0 | `interpretive.mjs:299-410`; `bake.mjs:648`; `museum.ts:1140-1182` |
| 0.10 | Pendentes fora do caixotão em y = 8,40; mesa lateral, perna da mesa e cadeiras da recepção assentadas; medalha da torre num suporte | médio (somados) | 0 | `museum.ts:1067-1078`; `atriumFurnishings.mjs:278-303`; `atriumDecor.mjs:306-316, 789-803` |
| 0.11 | Rede na linha central da quadra | médio (autenticidade) | 0 | `museum.ts:345, 1278` |

### 5.2 Onda 1 — fundações de material e de orçamento

| # | item | retorno | custo | funções |
|---|---|---|---|---|
| 1.1 | L1: fundir o kit por material | destrava todo o resto do átrio | −45 draws no átrio; programas caem | `kitPart.ts:102-153`; `RoomFurniture.tsx`; `test-kit-runtime.ts` |
| 1.2 | Madeira neutra e lona neutra; todos os tints recalculados (tint novo = cor efetiva atual ÷ média nova, então nada muda) e só então reafinar navy, nogueira de galeria e maple | alto: navy azul sob luz quente, nogueira com valor | 0 / 0 / 0 / 0 | `materials.mjs:319, 402-408`; `glb.mjs:66-94, 152-206`; estender `test-materials.ts:173-185` a essas receitas e checar o navy sob `#ffd49a` e sob a lanterna |
| 1.3 | Veio pelo eixo longo de cada membro (`uv: 'keep'` por peça, como nas estantes) | alto e barato | 0 | `geometry.mjs:421-476` (opção de eixo); ripas `atriumDecor.mjs:496-507`, montantes, pernas, `openings.mjs:316-334, 222-231`, mastros `kit.mjs:691-705` |
| 1.4 | L3: realocar VRAM | folga de 1,1 → ~13 MiB | −12 MiB | `materials.mjs` (tamanhos) |
| 1.5 | Horizonte no mapa de ambiente (duas faixas quentes fracas) e latão com metal 0,8 | alto: todo latão vertical ganha leitura | 0 | `MuseumScene.tsx:726-764`; `glb.mjs:84` |
| 1.6 | Exame enquadrado: pivô no centro do volume, distância pelo raio, escala de apresentação desfeita na mão | alto no verbo central do jogo | 0 | `Interaction.tsx:166, 298-334` |
| 1.7 | Portão de colocação por sala (§5.7) | protege tudo acima | 0 | `scripts/test-room-placement.ts` (novo) |

### 5.3 Átrio — primeira vista (depois das ondas 0 e 1)

| ordem | receita | o que fazer | retorno | custo | funções |
|---:|---|---|---|---|---|
| 1 | casca + `atrium-wall-bay-plain` | lambri ripado gerado pela casca, por segmento de parede, morrendo nas guarnições e nos cantos; ripas até dentro da capa | alto: é o plano de fundo de toda vista | casca +4,5k; kit −4.968; −3 lotes | `kit.mjs:252-266`; remover `museum.ts:1041-1058` |
| 2 | `atrium-floor-inlay` | UV polar no disco (tábuas radiais ou em espinha), filetes como anéis planos, anel escuro em pedra texturizada, junta de tábua com deslocamento variável | alto: maior superfície acesa | −1.340 (toros → anéis) | `atriumDecor.mjs:118-165`; `materials.mjs:172-188` |
| 3 | `atrium-central-podium` + `atrium-barrier-segment` | tampo com os três soquetes de `buildMedallionSocket` (ou decisão de cânone: quatro distintivos); corrimão de 10 lados com normais do toro, postes torneados, ponteira torneada | alto: centro da sala e do jogo | +~1.700 no total das 8 cópias | `atriumDecor.mjs:570-663`; `kit.mjs:950-993`; `atriumFurnishings.mjs:140-179` |
| 4 | `atrium-reception-desk` | cadeiras no chão com rodízios, estofado em tecido, monitores em `plastic-black`, folhetos em papel, cúpula com espessura, tampo com veio a 0,35 m/tile | alto de perto | 0 (remanejar 1.416); +2 famílias (só depois de 1.1) | `atriumDecor.mjs:280-336, 441-454`; `bake.mjs:960-972` |
| 5 | `atrium-lounge-set` + `atrium-sofa` | veludo navy e tapete com sheen (mapas `upholstery-velvet`), almofadas com `quiltedPanel` e `piping`, postes fora da almofada, biséis nas armações | alto: zona de pausa deixa de ser buraco preto | +~1.000 e +~230; +1 programa no átrio (já compilado para o escritório) | `atriumFurnishings.mjs:186-337`; `atriumDecor.mjs:855-926`; chaves novas em `glb.mjs` |
| 6 | `atrium-display-tower` | três objetos montados de verdade (suporte, pino, fita apoiada), pastilha sob cada objeto, montantes com veio vertical | médio | −300 | `atriumDecor.mjs:736-831` |
| 7 | banners | pano real do `buildBanner` com UV 0..1 para receber a estampa, em vez de cartão plano emissivo | médio-alto: ocupa os 5 m de cima | +360 por banner; 0 draws com 1.1 | `interpretive.mjs:322-367`; `RoomWallArt.tsx` |
| 8 | `atrium-lectern`, painel de orientação | conteúdo no tampo; fundo ou suportes de latão para o painel não flutuar | médio | +100 | `atriumDecor.mjs:940-1011`; `museum.ts:1107-1116` |
| 9 | `atrium-divider-screen`, `atrium-display-console` | biséis nos postes, malha em bronze fosco, elevadores com chanfro e feltro | médio | +400 | `atriumFurnishings.mjs:56-126, 352-471` |
| 10 | claraboia | lanterna envidraçada no campo do caixotão (montantes, vidro, céu noturno; vidro trincado e goteira são da história) | alto para a narrativa da tempestade | +1,5–2,5k (casca); 0 VRAM | `atriumDecor.mjs:1026-1096` |
| 11 | `atrium-aerial-installation` | manter; só tubos com normais do tubo | baixo | 0 | `:1218-1219, 1271-1275` |

### 5.4 Holyoke — heróis

| ordem | receita | o que fazer | retorno | custo | funções |
|---:|---|---|---|---|---|
| 1 | `ball/spalding-laced-1900` | material próprio esférico (grão de ~2 mm com aspecto 0,5 e fade nos polos, como `ball-1964`), cadarço e marca do fabricante modelados, vergões como costura; escala de apresentação ≤ 1,6 ou UV repetida | altíssimo: é o herói da ala | +1,375 MiB (pago por L3); triângulos iguais | `kit.mjs:627-659`; receita nova em `materials.mjs`; `bake.mjs:279-286`; `museum.ts:310-311` |
| 2 | `history-case-run` | carcaça como receita; recheio como DADO (`LAYOUTS` por vão, igual às estantes): livros apoiados, documentos em cavalete, camisas em suporte em T, rolos numa bandeja, medalhas em painel; UV por peça; papel de verdade | altíssimo: 10 m de parede | reclassificar como herói ou dividir em `history-bay-*`; +3–5k | `holyokeDecor.mjs:179-398`; `bake.mjs:902-915, 1162-1166` |
| 3 | `history-hero-case` | barras de latão com bisel, pedestal em linho fino ou feltro (sheen), rodapé | alto | +300; 0 programas se usar veludo | `holyokeDecor.mjs:413-493` |
| 4 | `apparel/gym-suit-1900` | malha de lã (receita nova), mangas, gola, cós, calça até o joelho; manequim em linho | alto | +2,75 MiB (ou 1,75); ≤ 2.500 | `kit.mjs:834-907`; `bake.mjs:324-334` |
| 5 | `net/ymca-1897` | veio ao longo dos mastros, faixa de lona com costura, corda em malha de verdade (nós nas cruzes), no meio da quadra | alto | ≤ 2.500 | `kit.mjs:687-749` |
| 6 | `gym-training-set` | clavas de 16–20 lados com normais do torno, bola de 0,32 m com UV pelo próprio centro, corda de 8–10 lados | médio | +~400 (cabe em 2.500 trocando a bola) | `holyokeDecor.mjs:638-737` |
| 7 | `paper/handbook-1897`, `paper/spalding-guide-1916`, documentos | papel sem pauta, lombada e capa em pano, página impressa como mídia | alto no exame | +0,69 MiB | `kit.mjs:758-823`; `bake.mjs:309-322` |
| 8 | `ball/basketball-bladder-1895` | borracha lisa (chave lisa, programa existente), bico e emenda | médio | 0 | `kit.mjs:662-680`; `bake.mjs:288-294` |
| 9 | `holyoke-entry-screen` | pintura navy lisa (receita de tinta), nicho à altura da mão (0,9–1,2 m) | médio | 0,69 MiB (compartilhada) | `holyokeDecor.mjs:66-163` |
| 10 | `history-info-kiosk`, `label-angled` | texto de runtime nas faces documentadas; placa fosca em vez de latão espelhado | alto para "dar informação" | +3 a +6 draws de texto (ver L8) | `holyokeDecor.mjs:538-562`; `interpretive.mjs:88-147` |
| 11 | murais e friso | trilho de quadros opcional por parede; mural acima do lambri com fundo de 40 mm; friso com recorte por foco ou outra imagem | médio | 0 | `kit.mjs:270-274`; `museum.ts:1310-1343`; `RoomWallArt.tsx:69-89` |
| 12 | `bench`, `archive-cabinet`, molduras | normais (0.6), veio, puxadores torneados | médio | 0 | `kit.mjs:1035-1174` |

### 5.5 Arquitetura compartilhada, portas e sinalização

| # | item | retorno | custo | funções |
|---|---|---|---|---|
| C1 | Cornija proporcional ao pé-direito (0,22 m some numa parede de 8,4 m) e trilho de quadros por parede | médio | +~200 por sala | `kit.mjs:152-160, 270-274, 328` |
| C2 | Reboco: tirar as baixas frequências do albedo (sujeira 0,20 → 0,06; desempenadeira 0,2 → 0,08) | médio: some a repetição | 0 | `materials.mjs:254-298` |
| C3 | Lambri liso com almofadas (montante e travessa) em vez de tábua única | médio | +~380 por segmento | `kit.mjs:252-264` |
| C4 | Portas: maçaneta com normais do tubo, veio vertical nos montantes, um ponto de luz por porta (decalque de luz ou slot retido, L9) | alto para orientação | 0–+1 draw por sala | `openings.mjs:275-501` |
| C5 | Placas: `holyoke-navy` como tinta; dedicatória em nogueira fosca com `normalScale` baixo | médio | 0 | `interpretive.mjs:733-840`; `bake.mjs:665-668` |
| C6 | Soleira e forro: manter | — | — | `openings.mjs:520-565` |
| C7 | Piso por ala: três receitas neutras (tábua corrida, mineral, vinil esportivo) tingidas pela paleta | alto para as alas novas | 0 hoje | `materials.mjs`; `SHELL_PALETTES` |

### 5.6 Clima de luz

1. Três estados por sala, todos legíveis: apagão (só lanterna e pilotos), luz de serviço (o que o
   quadro liga hoje, sem revelar teto) e luz geral (o final de `docs/PLANO-COMPLETO.md:419-421`).
   Emissivos pertencem ao estado geral; no de serviço, só filetes baixos.
2. Toda peça examinável e toda porta têm uma chave ou um decalque de luz; luminária sem slot tem lente
   apagada (hoje 4 pendentes do átrio e 2 trilhos da Holyoke brilham sem iluminar).
3. Lanterna no exame: `examineScale` 0,4 deixa o couro escuro quase preto (`wf3-d17`); subir para ~0,7
   nas peças com Y < 0,15 ou dar preenchimento preso à câmera no slot da própria lanterna
   (`flashlightRig.ts:39-44`), custo zero.
4. Lounge do átrio: uma das cinco chaves ou os slots retidos (L9).

### 5.7 Portões novos (o equivalente a `test:desk-top` e `test:bookshelf`)

- `test:room-placement`: por sala, com a geometria real: peça de parede encostada (±1 mm) no reboco ou
  na superfície declarada; `supportY` igual a uma superfície exportada pela receita (`layout`);
  exhibit sem interseção com o kit (SAT, 2 mm); arte de parede fora das faixas de moldura; peça
  pendurada tocando teto ou caixotão; colocações do kit sem sobreposição coplanar; toda luminária com
  `lightTarget` recebe slot.
- No bake: normais exatas em faces planas > 20 cm²; lados mínimos em famílias metálicas; UV esférica
  pelo centro da peça; folga gomo/núcleo; paleta da casca conferida; mídia somada à VRAM.
- `test:materials`: neutralidade de toda receita tingida; matiz sob branco, chave de galeria e lanterna.
- Teto de programas (25) e de draws por sala lidos do PerfHud num teste de fumaça.

## 6. Bíblia de assets (regra para todo asset das cinco alas)

1. **Datums.** Chão y = 0; parede z = 0 com +Z para a sala; pendurado com máximo y = 0; objeto de mesa
   com mínimo y = 0; exhibit com a origem no centro do volume (é o pivô do exame).
2. **Nada assado dentro de vitrine sem `layout`.** Toda receita com objetos embutidos exporta pegadas e
   apoios; o conteúdo colocado por `museum.ts` é testado contra eles. Recheio é dado, como nas estantes.
3. **Apoio e folga.** Apoiado a ±0,5 mm; vizinhos a ≥ 2 mm; inclinado gira na aresta de baixo e encosta
   no apoio. Nada flutua, nada afunda, nada atravessa.
4. **Bisel onde a luz bate**, em toda aresta vista a menos de 1,5 m; caixa sem bisel só encostada ou
   abaixo de 10 mm.
5. **Normais.** Caixas com `crease: null`; torneados e tubos com as normais do gerador; nunca um passe
   de vinco sobre família mista. Face plana tem normal exata.
6. **Redondo é redondo.** Lados ≥ max(8, perímetro ÷ 12 mm), teto 24; tubo de latão ≥ 10; flecha da
   silhueta ≤ 1 mm a distância de leitura.
7. **Só faces que alguém vê**; seção varrida para membros longos (lição das estantes).
8. **UV por peça**, veio no eixo longo, deslocamento por peça, `uv: 'keep'`. Esfera: projeção pelo
   próprio centro e receita ciente dos polos.
9. **Escala do traço.** Couro 2–3 mm; pano sem fio visível além de 0,5 m; papel nunca em lona; anel de
   madeira 15–30 mm em membro estreito; tábua de piso 90–120 mm. A tabela de `metresPerTile` da receita
   vai no comentário do gerador.
10. **Cor.** Albedo neutro, matiz só no tint (alvo ÷ média medida). Conferir sob branco, chave da ala e
    lanterna, com ACES. Famílias vizinhas separam por valor (ΔE ≥ 15). Superfície grande com Y < 0,03
    lê preto: não usar.
11. **Metal** precisa de algo para refletir: testar em face vertical; latão liso, sem facetas.
12. **Programas.** Chave nova repete combinação existente. Recurso novo pede medição após reload limpo.
13. **Draws.** Família nova usa material já presente na sala; alvo ≤ 14 materiais por sala.
14. **VRAM.** Ala nova entra com tints sobre receitas neutras; receita nova ≤ 2 MiB até o KTX2; mídia
    conta no portão, ≤ 300 px/m.
15. **Triângulos.** Prop 2.500, herói 15.000 (gaste pelo menos 4.000 em peça de exame), sala ≤ 50.000
    instanciados, frame ≤ 90.000.
16. **Emissivo obedece à energia.** No apagão só pilotos.
17. **Luz.** Cada herói declara `lightTarget`; no máximo cinco chaves por sala; luminária sem luz parece apagada.
18. **Interpretação.** Toda superfície de texto declara o plano e recebe conteúdo; substrato em branco reprova.
19. **Três capturas por asset** em `docs/contact-sheets/`: aceso a distância de leitura, lanterna a 1 m, exame.
20. **Paleta por ala** numa tabela só (`SHELL_PALETTES`): piso, parede, teto, marcenaria, acento, chave e wash.

## 7. Decisões que dependem do dono

1. Piso do escritório ao consertar S1: manter o maple que foi polido ou assumir a nogueira do código.
2. Pódio central: três soquetes de medalha (plano de agosto) ou quatro distintivos (o que está modelado).
3. Escala da Spalding: herói ampliado (2,65×) ou tamanho real com vitrine menor.
4. Vitrine corrida: reclassificar como herói (15.000) ou dividir em cinco receitas de vão.
5. KTX2 agora ou antes da terceira ala.
6. Nicho da câmara de borracha na altura da canela: intenção ou acidente.

## 8. Não verificado

- Contagem de programas por família é derivada do código; os números por sala são os do `docs/HANDOFF.md`.
- Ganhos de L1 em draw calls são contagem de materiais, não medição de frame.
- Faixa tracejada sob a capa do lambri (A5): a geometria confirma a fresta; a causa do brilho foi inferida das capturas.
- Tamanho em bytes das receitas não colocadas é estimativa proporcional a triângulos.
