# Handoff — Museu do Voleibol

Escrito em 2026-08-03, no fim de uma sessão longa. Este documento existe para outra
pessoa (ou outro agente) pegar o trabalho do zero, sem acesso à conversa anterior.

Leia também, nesta ordem: `docs/PLANO-DO-ZERO.md` (o desenho do jogo),
`docs/REFERENCIA-TECNICA.md` (gramática de Resident Evil + pipeline web-3D),
`docs/PESQUISA-CONTEUDO.md` (199 marcos históricos, 57 objetos, verificação de fatos).

---

## 1. O que é

Museu do voleibol em primeira pessoa, sem avatar, no navegador. Salas no estilo
Resident Evil: um átrio-hub e alas que são décadas. Hoje existem **três salas**:
`atrium` (18×18×8,4), `holyoke` (12×16×4,2, a Ala 1, 1895–1929) e `office`
(6×7×3,2, o escritório do curador / safe room).

Stack: React 19.2 · TypeScript 6 · Vite 8.1.2 (Rolldown) · three r185 ·
@react-three/fiber 9.6 · drei 10.7 · zustand 5 · Cloudflare Workers.

**Duas regras de arquitetura que não podem ser quebradas:**

1. **Conteúdo é dado.** Salas, peças, documentos, fechaduras e fatos vivem em
   `src/content/museum.ts`, tipados por `src/content/schema.ts`. O runtime é
   genérico e não sabe nada sobre nenhuma sala específica. **Acrescentar uma ala
   deve ser editar `museum.ts` e rodar `npm run bake` — nada de React.** Se você
   precisar escrever um componente novo para adicionar conteúdo, a arquitetura
   falhou e o certo é generalizar o runtime, não criar um caso especial.

2. **Geometria é assada em build time, headless, em Node.** Não há Blender, não há
   loja de assets, não há CSG. `scripts/bake.mjs` gera três.js BufferGeometry,
   escreve glTF via `@gltf-transform`, aplica meshopt + `KHR_mesh_quantization`,
   e emite GLB + um manifesto tipado (`src/content/bake.generated.ts`).
   Texturas são procedurais (`scripts/bake/materials.mjs`) e viram
   albedo + normal + ORM empacotado.

Arquivos gerados — **nunca edite à mão**: `src/content/bake.generated.ts`,
`src/content/media.generated.ts`.

---

## 2. Estado atual, honesto

O jogo **funciona e é caminhável de ponta a ponta**. Até esta sessão não era: as
três salas existiam e nenhuma porta funcionava.

Portão verde (`npm run check`): typecheck + oxlint + validação de conteúdo +
21/21 colisão + 39/39 posicionamento + 13/13 navegação.

Orçamentos: 880 KB de assets · 46.644 triângulos assados (teto de 90 k na tela em
mobile) · última medição de frame no build servido foi 1,6 ms mediano / 3,3 ms p95
de CPU, com a ressalva de que a aba estava oculta e isso não mede composição de GPU.

**O que ainda está feio, e por quê** — está tudo na seção 6. O resumo é:
a iluminação é o pior problema restante, as paredes acima do dado continuam vazias,
e 20 peças novas de mobiliário estão construídas mas **não conectadas**.

---

## 3. Comandos

```bash
npm run dev              # servidor de desenvolvimento
npm run bake             # regera toda a geometria e as texturas (~18 s)
npm run check            # o portão completo — rode antes de qualquer commit
npm run validate:content # só as regras de conteúdo
npm run test:navigation  # caminha uma cápsula real por todas as portas
npm run test:kit         # confere que cada peça sobrevive à quantização no lugar
npm run test:collision   # 21 asserções do controlador de jogador
```

O bake era de 15 minutos e agora é de 18 segundos (ver 4.7). Aproveite: itere.

---

## 4. O que esta sessão corrigiu, e o que cada bug ensina

Estes não são detalhes históricos. Cada um é uma armadilha que o formato deste
projeto cria e que vai voltar a morder se não for conhecida.

### 4.1 O museu estava lacrado — nenhuma porta funcionava

O jogador andava até x = −9,07 e parava. Segurando W por 600 frames, não saía do
lugar. **Duas causas independentes:**

- **Vãos espelhados.** `buildWall` monta segmentos ao longo de +X e o chamador gira
  a parede depois. `rotateY(π)` e `rotateY(±π/2)` invertem esse eixo, e o centro do
  vão era copiado direto da coordenada da sala. O buraco oeste do átrio ficava em
  z = −2 e o leste de Holyoke em z = **+2** — reboco maciço um de frente para o outro.
- **0,5 m de vazio entre as salas.** As lajes tinham exatamente `shell.width`, o que
  as faz parar na linha de centro das próprias paredes: buraco no piso debaixo da porta.

Corrigido em `scripts/bake/kit.mjs`: a tabela `walls` agora tem uma convenção única
(**+X corre ao longo da parede, +Z aponta para dentro da sala**), `portalToWall`
compensa os eixos invertidos, e piso e teto transbordam `WALL_THICKNESS` para as
salas se encontrarem borda com borda. `holyoke` e `office` foram movidas para ficarem
costas com costas com o átrio (`origin` −15,25 e 12,25).

**Guarda:** `scripts/test-navigation.ts`. Monta as cascas reais em Node e caminha
uma cápsula real pelo `movePlayer` real. Reintroduzi o bug de propósito para conferir
que o teste pega: 8/13. Corrigido: 13/13.

### 4.2 Duas fontes de verdade para a casca das salas

`scripts/bake.mjs` tinha a própria cópia da lista de salas, com um comentário
prometendo que "o validador cruza os dois conjuntos". **Esse validador nunca foi
escrito.** Elas divergiram: uma porta adicionada ao conteúdo nunca chegou à geometria.

Agora `bake.mjs` importa `MUSEUM` de `src/content/museum.ts` (Node faz o strip de
tipos; o script `bake` usa `--experimental-strip-types`). **Fonte única.**

**Lição geral:** um comentário que promete uma verificação não é uma verificação.

### 4.3 Todo objeto do museu estava enterrado até a metade

`quantize()` compensa a quantização com uma translação **no nó**, e havia **quatro
cópias** do mesmo código de clonagem fazendo `clone.position.set(0, 0, 0)`, jogando
essa translação fora. Vitrines, plintos, armários, bolas, a rede de 1897 — tudo
afundado metade da própria altura.

Passou por toda a verificação visual anterior porque era **uniforme**: nada parecia
errado ao lado de nada.

As quatro cópias viraram `src/engine/kitPart.ts` (`cloneKitPart`, `cloneRecipe`,
`disposeKitPart`). **Leia o comentário no topo desse arquivo antes de mexer em
qualquer coisa que instancie peças do kit.** A regra que decorre dele:

> Coloque o posicionamento de uma peça do kit num **grupo embrulhador**, nunca como
> prop `position`/`rotation`/`scale` no `<primitive>`. Um prop de transformação
> sobrescreve a transformação do nó e reintroduz o bug via JSX.

**Guarda:** `scripts/test-kit-placement.mjs` (39 checagens) — abre os GLBs e confere
que cada peça sobrevive à quantização no lugar onde foi autorada, com tolerância
proporcional ao tamanho. Ressalva honesta: isso trava o **bake**; o bug estava nos
**chamadores**, e é o comentário em `kitPart.ts` que os protege.

### 4.4 Rodapé e sanca estavam do lado de fora de todas as paredes

Medido: a trim ocupava x 9,095–9,127 quando a face interna da parede está em 8,875.
**Nunca foram visíveis desde o primeiro bake.** Mesma raiz que 4.1 — as rotações de
leste/oeste estavam trocadas em relação à norte.

Junto com a correção, `buildWall` ganhou a articulação que faltava:
**dado em carvalho até 1,02 m, friso de cadeira, trilho de quadros a 2,62 m.**
Custa ~380 triângulos por segmento e é a coisa mais barata do prédio: tira a parede
de "laje". A casca virou 4 partes por sala (`__floor`, `__structure`, `__panelling`,
`__trim`) em vez de 3.

### 4.5 Tinta dupla nos materiais texturizados

`MATERIALS` em `scripts/bake/lib/glb.mjs` servia a dois propósitos conflitantes: o
fator de cor do glTF (para materiais sem textura) e a multiplicação sobre o albedo
(para os com textura). Carvalho marrom × fator marrom = quase preto.

Agora `baseColor` é o placeholder do glTF e `tint` é o que o runtime multiplica no
mapa — **branco por padrão**, declarado só onde dois materiais compartilham uma
textura e precisam se distinguir.

### 4.6 O reboco não fechava o ladrilho, e as normais planas estavam destruídas

Isto é o "só cinza com os blocos aparecendo" que você viu. Três causas medidas:

- **Reboco não-tileável.** Três termos culpados: um gradiente em `v` (não pode
  fechar por construção), um `v * 0.35` (percorre 35% da volta do toro), e um seno
  com coeficientes 2,3/0,7 (não-inteiros, então não é periódico em nenhum eixo).
  Degrau de 8,23/255 numa textura cuja faixa inteira era 19/255. **Agora 1,10, e a
  faixa é 36.** `tileableNoise` e `fbm` ganharam um parâmetro `aspect` que estica
  o padrão **escalando o raio do toro** em vez da coordenada, que é o jeito de
  esticar sem abrir a costura.
- **`toCreasedNormals` destruía a normal de toda parede plana.** Ele agrupa vértices
  numa grade de 1 cm e o bisel tem 6 mm, então a face plana herdava a média das
  facetas do bisel — ~36° fora. A diagonal do quad era a faixa horizontal na metade
  da parede. `finalize()` agora aceita **`crease: null`**, que preserva as normais
  do gerador. Use `null` para qualquer coisa feita só de `bevelledBox`; use um
  ângulo real (π/5, ou π/4 para molduras) para lathe/sweep/cylinder/sphere/torus.
- **`metresPerTile` era 3,0 — exatamente o módulo de parede do plano.** Cada
  repetição caía em cima da arquitetura e lia como junta de construção. Agora 1,7,
  primo com o módulo, a largura da porta e as dimensões das salas.
- O carvalho também não fechava em U (costura 13,83 contra controle 1,35). Mesma
  correção via `aspect`, mais tornar o `dy` do anel periódico com um seno.
  **Agora 3,09.**

### 4.7 O bake era de 15 minutos por causa de um Worley ingênuo

`makeWorley` varria **todos** os pontos por pixel. Com 52 células isso é 2.704
testes de distância por texel, 2,8 bilhões para um canal. Como há exatamente um
ponto por célula, basta a vizinhança 5×5.

**Verificado bit-a-bit idêntico em 40 mil amostras, 147× mais rápido.**
Bake completo: **15 min → 18 s.**

### 4.8 Quadros de parede

Dois bugs: os dois expositores de parede flutuavam 175 mm à frente do reboco (o autor
assumiu um recuo de 0,30 m; a face interna está a 0,125 m), e `FramedMedia` deslocava
a impressão ao longo de +X ou +Z conforme houvesse rotação — certo em duas das quatro
paredes e dentro do reboco nas outras duas. Agora o deslocamento é ao longo da normal
do próprio quadro, `(sin y, 0, cos y)`.

Também: as travessas laterais de `buildFrame` levavam `rotateZ` sem o `rotateY` que
as horizontais têm, e `rotateZ` não mexe no eixo Z — as molduras saíam meio metro
para dentro da parede. O quadro era um cubo de 52 cm de profundidade; agora 6 cm.

### 4.9 Regras de validação novas

Em `src/content/validate.ts`, todas ligadas em `validateContent`:

| regra | o que pega |
|---|---|
| `portal-not-reciprocal` | porta declarada de um lado só, ou desalinhada do vizinho |
| `wall-exhibit-off-the-wall` | peça de parede longe do reboco |
| `wall-exhibit-faces-the-wall` | `rotationY` apontando para fora da sala |
| `missing-translation` | qualquer campo `…Key` que não resolve no dicionário |
| `kit-part-not-baked` / `container-part-not-baked` | peça referenciada que não existe no bake |
| `room-is-empty` | sala sem nada dentro (aviso) |

O `missing-translation` percorre a estrutura procurando propriedades terminadas em
`Key` — de propósito, para continuar cobrindo campos que ainda não existem.

---

## 5. A TAREFA IMEDIATA: conectar as 20 peças novas

Este é o trabalho que ficou pela metade e é por onde continuar.

### 5.1 O que existe

Cinco módulos novos em `scripts/bake/parts/`, com **20 geradores**, **26.732
triângulos** no total. Todos importam limpo e todos foram medidos: bounds corretos,
todos dentro do orçamento de 2.500 triângulos por prop.

| módulo | geradores | confiança |
|---|---|---|
| `cases.mjs` | `buildWallVitrine`, `buildVitrineTower`, `buildPartition`, `buildPictureFrameEmpty` | **alta** — auditado por um segundo agente, que achou e corrigiu 2 bugs |
| `interpretive.mjs` | `buildLabelAngled`, `buildInterpPanel`, `buildBanner`, `buildReceptionDesk`, `buildDonationBox` | **média** — auto-verificado pelo autor; a auditoria independente morreu no limite de sessão |
| `openings.mjs` | `buildDoorReveal`, `buildArchitrave`, `buildDoorLeaf`, `buildThreshold` | **baixa** — o agente caiu por erro de conexão antes de reportar; nunca auditado |
| `fixtures.mjs` | `buildCeilingSpot`, `buildPendant`, `buildWallSconce`, `buildVentGrille` | **baixa** — idem |
| `office.mjs` | `buildCuratorDesk`, `buildOfficeChair`, `buildDeskLamp` | **baixa** — idem, e **incompleto**: faltam `buildBookshelf` e `buildLedgerStack` |

**NADA FOI RENDERIZADO.** Nem um pixel de nenhuma dessas 20 peças. Bounds e contagem
de triângulos estão conferidos; proporção e sombreamento não. Espere ter que ajustar.

Para medir tudo de novo a qualquer momento:

```bash
node --experimental-strip-types -e "
const mods=['openings','cases','fixtures','office','interpretive'];
(async()=>{for(const n of mods){const m=await import('./scripts/bake/parts/'+n+'.mjs');
for(const[fn,g]of Object.entries(m)){if(typeof g!=='function')continue;const r=g();
const gs=r.attributes?{_:r}:r;for(const[k,x]of Object.entries(gs)){x.computeBoundingBox();
const b=x.boundingBox,t=(x.index?x.index.count:x.attributes.position.count)/3;
console.log((n+'.'+fn+(k==='_'?'':'.'+k)).padEnd(40),String(t).padStart(5),
'y',b.min.y.toFixed(3),b.max.y.toFixed(3));}}}})();"
```

### 5.2 Como conectar (a ordem importa)

**Passo 1 — registrar no bake.** Em `scripts/bake.mjs`, importe os módulos e some as
peças ao array `kitParts` (perto da linha 307). Cada entrada é
`{ name, geometry, material }`. Materiais sugeridos pelos autores:

```
vitrine-wall          buildWallVitrine().carcass    oak-varnished
vitrine-wall__glass   buildWallVitrine().glass      glass-vitrine
vitrine-tower         buildVitrineTower().carcass   oak-varnished
vitrine-tower__glass  buildVitrineTower().glass     glass-vitrine
partition             buildPartition().face         plaster
partition__foot       buildPartition().foot         oak-varnished
frame-empty           buildPictureFrameEmpty()      oak-varnished
label-angled          buildLabelAngled()            brass
interp-panel          buildInterpPanel()            plaster-dark
banner__cloth         buildBanner().cloth           canvas
banner__battens       buildBanner().battens         oak-varnished
reception-desk        buildReceptionDesk()          oak-varnished
donation-box          buildDonationBox().pedestal   brass
donation-box__glass   buildDonationBox().glass      glass-vitrine
door-leaf             buildDoorLeaf().leaf          oak-varnished
door-leaf__furniture  buildDoorLeaf().furniture     brass
threshold             buildThreshold()              brass
ceiling-spot__track   buildCeilingSpot().track      iron-cast
ceiling-spot__head    buildCeilingSpot().head       brass
pendant / shade, sconce, vent-grille, curator-desk, office-chair, desk-lamp — idem
```

`buildDoorReveal` e `buildArchitrave` **não são peças colocáveis**: devem ser
chamadas de dentro de `buildWall` no ramo `else` (o header de porta) e fundidas nas
malhas `__structure` / `__trim` da sala, custo zero de draw call.

**Passo 2 — declarar os ids.** Acrescente cada id novo à união `KitPartId` em
`src/content/schema.ts`. A auditoria recomendou também **remover** da união quatro
ids que nunca vão existir como peças colocáveis (`wall-module`, `wall-module-door`,
`floor-tile`, `ceiling-panel`) e acrescentar `vitrine-glass` e `archive-cabinet`,
que são assados mas não declarados.

**Passo 3 — atualizar `FLOOR_STANDING`** em `scripts/test-kit-placement.mjs` com as
peças novas que ficam no chão, para o teste cobrir de verdade.

**Passo 4 — colocar no conteúdo.** `kit` em `src/content/museum.ts`. Coordenadas são
**locais à sala**; o `origin` é aplicado por um grupo embrulhador. Dimensões:
átrio 18×18×8,4 (origem no centro), Holyoke 12×16×4,2, escritório 6×7×3,2.
Faces internas de reboco em `±(largura/2 − 0,125)`.

A auditoria de densidade propôs este conjunto como ponto de partida:

- **Átrio:** 4 banners a y = 5,6 nas quatro paredes (o volume dos cinco metros
  superiores está completamente vazio), `reception-desk` em [−4,2, 0, 5,0] rot 0,35,
  `donation-box` em [3,6, 0, 5,4], um segundo banco.
- **Holyoke:** `vitrine-wall` em [−5,86, 0, −4,0] e [−5,86, 0, 1,2] rot π/2 (levantadas
  ao peitoril de 0,75), duas `partition` em [2,2, 0, −0,6] rot 0,52 e [−1,8, 0, 2,4]
  rot −0,44 (o plano tem uma regra explícita de que nenhuma ala pode ser legível de
  uma olhada só, e hoje Holyoke é uma caixa aberta), `interp-panel` em [1,4, 0, −6,2]
  rot 0,2, uma `label-angled` ao lado de cada peça de chão, `ceiling-spot` em
  [0, 4,2, −4] e [0, 4,2, 4], `vent-grille` em [5,86, 3,4, −6] rot −π/2.
- **Escritório:** `curator-desk` em [0,4, 0, −1,4] rot π, `office-chair` em
  [0,4, 0, −0,5], `desk-lamp` em [1,0, 0,80, −1,55], `ceiling-spot` em [0, 3,2, 0].

**Passo 5 — religar a iluminação aos lustres.** `src/engine/RoomLighting.tsx`
sintetiza hoje uma grade de luzes. Troque por uma iteração sobre
`room.kit.filter(p => p.part === 'ceiling-spot')`, montando uma `pointLight` por
colocação, deslocada 0,14 m abaixo do trilho. Assim luminária e luz saem de **uma**
declaração e não podem divergir. (Hoje há até seis point lights invisíveis por sala.)

**Passo 6 — `npm run bake && npm run check`**, depois abra e **olhe**. Este é o passo
que não foi feito.

### 5.3 Armadilhas que os autores deixaram registradas

- **`buildPictureFrameEmpty` projeta ao contrário de `buildFrame`.** O novo ocupa
  z 0 → +0,052; o `buildFrame` de `kit.mjs` ocupa z 0 → −0,045. O novo é que segue
  a convenção; o antigo é que está errado. Se você reutilizar código de colocação,
  o quadro vai entrar na parede.
- **Duas convenções de Y para peças de parede.** `frame-empty` é centrado em Y
  (±0,687); `vitrine-wall` é apoiado em Y (0 → 1,100) e o chamador levanta ao
  peitoril. Escolha uma e anote no ponto de uso.
- **O colisor da `partition` tem que vir do `foot`, não do `face`.** O pé é maior:
  ±1,600 contra ±1,574 em x, 0,766 de profundidade contra 0,714.
- **`width` e `depth` são pegadas totais, não vãos livres.** O interior da vitrine de
  parede tem só 0,372 m de profundidade no padrão de 0,42.
- **Tensão de sombreamento não resolvida, e é do projeto todo.** Geometrias que
  misturam `bevelledBox` com `sweepProfile` numa mesma malha sofrem o mesmo dano de
  normal descrito em 4.6: o auditor mediu **69% dos triângulos planos da carcaça da
  vitrine de parede com desvio de até 30°**. `kit.mjs` tem o mesmo problema em
  `buildPlinth`, `buildBench` e `buildArchiveCabinet`. A cura é separar cada peça em
  uma geometria só-de-caixas (`crease: null`) e outra só-de-perfis (com ângulo) —
  custa um draw call por peça. **Decida isso olhando o render, não no papel.**
- `sweepProfile` tem um bisel de extrusão de 2 mm por padrão que empurra molduras
  para baixo de y = 0 e encurta cada corrida nas pontas. Os módulos novos passam
  `{ bevel: 0 }` e levam o chanfro no próprio perfil.
- `office.mjs` está **incompleto**: faltam `buildBookshelf` e `buildLedgerStack`.

---

## 6. Backlog, por impacto

Vem de uma auditoria de seis frentes que mediu o código em vez de opinar. As
descobertas críticas foram confirmadas por agentes adversariais independentes,
exceto onde marcado.

### Prioridade 1 — iluminação (o pior problema restante)

- **Point lights nus a 0,6 m do teto.** Por isso o teto de Holyoke estoura branco e o
  do átrio some no preto. Precisa de luminárias visíveis (já construídas, ver 5.1) e
  de spots direcionados.
- **`hemisphereLight` usa a posição normalizada como direção** — Holyoke e o escritório
  recebem um céu de lado. Bug simples, `RoomLighting.tsx`.
- **`Environment` é um rig de céu aberto a `envMapIntensity` 1 dentro de caixas
  fechadas.** É a origem do degradê lavado nas paredes.
- `decay` 1,6/1,4 em vez de 2,0, com corte de distância maior que a sala.
- `lights.slice(0, 6)` apaga silenciosamente a terceira coluna da grade do átrio.
- A contagem de luzes muda com o conjunto de salas visíveis, o que força recompilação
  de shader em cada porta. Pior caso atual: 25 luzes dinâmicas, ~6× o que um Android
  mediano aguenta.
- O `Canvas` nunca configura `toneMapping`, então pega ACES Filmic do R3F por padrão —
  uma curva dessaturante sobre uma paleta já dessaturada.

### Prioridade 2 — a mecânica central que não existe

**`startsPowered`, `roomsPowered` e `UnlockEffect{kind:'power-room'}` não têm nenhum
leitor.** A premissa inteira do plano — escuridão, tocha, restaurar a energia,
*sem luz = inexplorado* — está no schema e não existe em código. Toda sala nasce
totalmente iluminada. Isto é a espinha da progressão, não um detalhe.

### Prioridade 3 — conteúdo de parede

904 m² de parede carregando 0,936 m² de imagem emoldurada (0,10%) e uma linha de
vinil. **Não existe canal de dados para arte de parede que não seja uma `ExhibitData`
completa** — então no máximo oito quadros no museu inteiro. Precisa de um tipo
`WallArt` no schema, irmão do `WallSign` que já existe.

Duas das quatro fotografias licenciadas que o pipeline de mídia já baixou nunca são
usadas.

### Prioridade 4 — paleta

`PaletteId` é decorativo: seu único consumidor é uma tabela de três brancos-quentes
quase idênticos em `RoomLighting.tsx`. O plano diz que cada ala varia **só** paleta,
temperatura de luz, material de piso e peça-herói — e nada disso é implementável
hoje. Só existe um material de piso e `buildRoomShell` o fixa no código.
`MaterialLibrary` é um `Map` único de processo, então tingir por sala é
arquiteturalmente impossível sem mudança.

Além disso: as cores dos materiais são autoradas como sRGB e consumidas como linear
nas duas pontas, o que deixa toda superfície sem textura pálida.

### Prioridade 5 — o resto

- Sem pós-processamento (`@react-three/postprocessing` nem é dependência). Sem
  vinheta, sem gradação, sem grão.
- A névoa está configurada de um jeito que nunca pode ser vista.
- **O museu é mudo.** `RoomData.audio` é autorado em duas salas e lido por ninguém.
- A tela de título é um documento de texto.
- Tudo é alinhado aos eixos, instanciado único, com o mesmo acabamento e sem desgaste
  nem assimetria.

---

## 7. Coisas que só se descobrem apanhando

- **A aba do navegador fica oculta neste ambiente**, então rAF e ResizeObserver não
  disparam e o R3F não monta até você dar um tamanho explícito à viewport
  (`resize_window`) e emitir `resize`.
- Existe um harness de QA para agentes que não enxergam a tela:
  `window.__museumPerf()`, `__museumStep(n)` (dirige o `advance()` do R3F, não só
  `gl.render`), `__museumTeleport(x, y, z, yaw)`, `__museumScene()` (agora reporta
  **bounds, material e mapas** de cada malha, não só posição — foi só isso que tornou
  o bug 4.3 visível), `__museumCollision()`, e um plugin do Vite que recebe frames
  em `/__capture` e grava em `docs/contact-sheets/`.
- `__museumStep(n)` precisa ser chamado **uma vez com n frames**, não n vezes com 1:
  cada chamada relê `performance.now()`, então em laço apertado o delta é ~0 e nada
  se move.
- `GLTFLoader` passa nomes de nó por `PropertyBinding.sanitizeNodeName`, que **apaga**
  `[ ] . : /`. `ball/spalding-laced-1900` vira `ballspalding-laced-1900`. Sempre
  compare os dois lados passando pela mesma função.
- A câmera padrão do R3F **não está no grafo de cena**, então `camera.add(obj)` põe o
  objeto fora da travessia de render.
- `visible = false` não esconde de um `Raycaster` — ele pula invisíveis. Para uma
  proxy de interação, use uma layer dedicada.
- Não faça chunking manual no Vite/Rolldown aqui. Duas tentativas pioraram o payload;
  `vite.config.ts` tem um comentário longo explicando por quê. Deixe o split cair nas
  fronteiras de `lazy()`.
- Há uma árvore antiga do jogo (`src/game/`, `src/world/`, `src/player/`) com
  modificações não commitadas do dono. **Não apague.** A v2 é o padrão; `?v1` na URL
  serve a antiga. Deletar a antiga é decisão do dono.

---

## 8. O teste que ninguém fez ainda

Do plano: *uma pessoa que nunca viu o jogo termina a ala em 8 minutos e consegue
dizer uma coisa verdadeira sobre a história do voleibol.* Só o dono pode rodar esse.
Também falta rodar num Android mediano de verdade.
