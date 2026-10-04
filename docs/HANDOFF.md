# Handoff — Museu do Voleibol

Atualizado em 2026-10-04 (L1, o primeiro lote do plano, §10; a abertura no escritório
é §9); o estado técnico das salas é o de 2026-08-12. Este documento é o ponto de
entrada para retomar o projeto sem depender da conversa anterior.

Leia também, nesta ordem: `docs/PLANO-DO-ZERO.md` (o desenho do jogo),
`docs/REFERENCIA-TECNICA.md` (gramática de Resident Evil + pipeline web-3D) e
`docs/PESQUISA-CONTEUDO.md` (base histórica e fontes).

---

## 1. O que é

Museu do voleibol em primeira pessoa, sem avatar, no navegador. O corte vertical
tem três salas caminháveis:

- `atrium`: hub de 18 × 18 × 8,4 m;
- `holyoke`: Ala 1, 1895–1929, de 12 × 16 × 4,2 m;
- `office`: escritório do curador / safe room, de 6 × 7 × 3,2 m.

Stack: React 19.2 · TypeScript 6 · Vite 8.1.2 (Rolldown) · three r185 ·
@react-three/fiber 9.6 · drei 10.7 · zustand 5 · Cloudflare Workers.

O protótipo antigo (`src/game`, `src/world`, `src/player` e `?v1`) foi removido
intencionalmente no commit `5e51e24`. O museu data-driven é a única aplicação.

---

## 2. Estado atual, honesto

O corte vertical está integrado, assado, caminhável e com progressão de energia.

Portão verde em 2026-10-04 (`npm run check`, depois de L1, §10; a lista completa das
suítes e o que cada uma ganhou está em §10.4):

- conteúdo: 3 salas válidas, com 29 dívidas datadas impressas (`knownDebt.ts`);
- catracas: 4/4; fontes: 28; documentação: 21/21; capturas: 9/9; saves: 19/19;
- energia: 28/28;
- abertura: 31/31; fluxo da abertura: 44/44; rádio: 27/27;
- colisão: 28/28;
- kit e posicionamento: 339/339; vitrine corrida: 10/10;
- materiais: 10; mesa do curador: 9; estantes: 20;
- runtime do kit: 26/26;
- runtime das salas: 19/19;
- LOD de salas: 23/23;
- aquecimento de GPU: verde; prontidão da sala: 5/5;
- performance de render e projeção: 16/16;
- sinalização arquitetônica: 26/26;
- portas de transição: 29/29;
- controles móveis e modo imersivo: 13/13;
- navegação: 67/67;
- bundle por caminho: 5/5;
- `npm run build`: verde.

O único aviso é o preexistente `react(only-export-components)` em `src/main.tsx:17`.
Deploy de produção: `https://volleyball-museum.renanbuiatti14.workers.dev`, versão
Cloudflare `0027afaa-9600-4e0f-a5d3-0a5e699cf735` (2026-10-03: toda a rodada de §9,
até `db4cc70`). **L1 está commitado na `main` local e ainda não foi publicado** (§10).

Bake atual:

- **2.938 KB** de GLBs;
- **151.652 triângulos assados**;
- kit `public/models/kit.6f5f4950.glb`: 2.182 KB, 104.940 triângulos, 195 nós;
- salas: `room-atrium.b214394f.glb`, `room-holyoke.aa0b5458.glb` e
  `room-office.a2144060.glb`;
- texturas: **43,875 MiB** de VRAM (teto duro de 45).

Medição visual local em 1536 × 864 (1280 × 720 CSS a 1,2 DPR), escritório aceso,
depois de reload limpo, em 2026-10-02:

- ponto de leitura (`?qaCamera=11.05,0,2.95,-1.5708,-0.45`, a mesa a ~1,2 m):
  **58 draw calls**, **36.038 triângulos por frame**;
- spawn (`10.3,0,2.95,-1.5708,-0.05`, as quatro estantes à vista): **66 draw
  calls**, **37.858 triângulos**;
- **29 programas** acumulados com o aquecimento assentado (31 depois de ligar a
  lanterna uma vez). O número inclui os programas internos do PMREM e os que o
  aquecimento compila para as salas vizinhas; compare sempre do mesmo jeito.

Isso cumpre o alvo desktop (120 / 350k) e o alvo mobile de triângulos (90k) e fica
abaixo do teto duro mobile de draw calls (100), mas não chega ao alvo mobile de 45
draws: o escritório é a sala mais distante dele. `test:kit-runtime` agora trava o
kit do escritório em 53 lotes e 36 mil triângulos instanciados. O total assado
passou o alvo móvel porque inclui bundles que nunca aparecem todos no mesmo frame.
Não trate FPS do navegador de agente como benchmark de Android.

Medição visual local na Holyoke acesa, vendo também o átrio pelo portal:

- **55 draw calls**;
- **51.478 triângulos por frame**;
- **13 programas de shader**;
- 69 geometrias e 25 texturas.

Holyoke permanece abaixo dos tetos duros de 100 draws e 150k triângulos e ganhou
folga no orçamento global de 25 programas. A captura na altura real do jogador
está em `docs/contact-sheets/holyoke-gallery-implemented-v2.png`.

Medição visual local do novo átrio, na câmera equivalente ao conceito e com a
Holyoke adjacente em portal LOD:

- **80 draw calls**;
- **64.256 triângulos por frame**;
- **15 programas de shader**;
- 93 geometrias, 23 texturas e 84 meshes visíveis;
- 60 fps no navegador de validação.

O frame está dentro dos tetos desktop e do teto duro móvel de 100 draws / 150k
triângulos, mas ainda excede o alvo móvel ideal de 45 draw calls. A captura está em
`docs/contact-sheets/atrium-gallery-implemented.png`.

**Linha de base de 2026-10-04** (`docs/lotes/P0-linha-de-base.md`; é contra ela que os lotes
se comparam, e as câmeras estão registradas lá): escritório 58 e 66 draws nas duas câmeras
acima; átrio 80 da porta do escritório, 101 na diagonal sudeste, 85 do canto noroeste e 79
chegando pela porta da Holyoke; Holyoke 36 da porta, 67 para sudoeste e 83 do canto noroeste.
Com a porta da Holyoke aberta e o jogador dentro da ala olhando o átrio, **128 draws e 101.310
triângulos**: o par passa do teto duro móvel de 100. 35 programas com as três salas
residentes. As medições do átrio e da Holyoke dos dois blocos acima são de uma disposição
anterior e de câmeras que não foram registradas.

---

## 3. Arquitetura que não pode regredir

1. **Conteúdo é dado.** Salas, peças, documentos, energia e fechaduras vivem em
   `src/content/museum.ts`, tipados por `src/content/schema.ts`. Acrescentar conteúdo
   deve ser editar dados e rodar `npm run bake`; generalize o runtime quando faltar
   uma capacidade.

2. **Geometria é procedural e assada em Node.** Geradores vivem em
   `scripts/bake/kit.mjs` e `scripts/bake/parts/*.mjs`, usando os helpers de
   `scripts/bake/lib/geometry.mjs`. Não há Blender, CSG ou assets comprados.

3. **Arquivos gerados não são editados à mão.**
   `src/content/bake.generated.ts` vem de `npm run bake`;
   `src/content/media.generated.ts` vem de `npm run media:fetch`.

4. **Receitas do kit são assemblies.** Um id colocável resolve o nó exato e todos
   os nós `id__*`. `KitPartId` contém raízes de receita, nunca submalhas internas.

5. **Transformação externa sempre fica num grupo embrulhador.** Nunca aplique
   `position`, `rotation` ou `scale` diretamente ao `<primitive>` de uma peça do
   kit: isso apaga a compensação do nó quantizado.

6. **Colisão vem do manifesto assado.** Kit, containers, mounts e controles de
   energia usam a mesma transformação `sala × placement × nó`. Não recrie regras por
   nome no runtime.

7. **Sem chunking manual no Vite/Rolldown.** As tentativas anteriores aumentaram o
   payload. Preserve as fronteiras naturais de `lazy()` documentadas em
   `vite.config.ts`.

---

## 4. O que foi integrado nesta etapa

### 4.1 Kit e arquitetura

Os 20 geradores que estavam desconectados agora estão no bake e no conteúdo:
vitrines, torre, divisórias, moldura vazia, placas, painel interpretativo, banners,
recepção, caixa de doação, portas, soleiras, spots, pendente, arandela, ventilação,
mesa, cadeira e luminária. Também foram concluídos `bookshelf`, `ledger-stack` e
`breaker-panel`. O escritório recebeu ainda sete receitas próprias: `office-rug`,
`office-corkboard`, `office-flatfile`, `archive-trolley`, `office-safe`,
`visitor-chair` e `coat-stand`.

Receitas multi-material são resolvidas de modo genérico por raiz exata ou prefixo
`root__`. `KitLayer` agrupa instâncias compatíveis sem perder a matriz de cada nó e
sem descartar geometrias ou materiais compartilhados pelo cache do GLTF.

O batching reduz o kit estático declarado de **131 para 83 lotes**:

- átrio: 36 → 17;
- Holyoke: 42 → 28;
- escritório: 53 → 38.

### 4.2 Portais e física

Cada face interna recebe seu architrave. Portais recíprocos compartilham um único
reveal e uma única soleira, atribuídos a um dono determinístico. Bake e teste de
navegação usam a mesma preparação de casca.

`partition__foot` continua sendo o id contratual do colisor, mas sua caixa cobre
pé e painel até 2,40 m. Assim o autostep de 0,22 m não sobe no pé nem atravessa a
divisória. O teste de navegação também executa SAT contra kit, containers e mounts,
valida interpenetrações e tenta cruzar a divisória de frente.

### 4.3 Conteúdo e layout

- Átrio: recepção, caixa de doação, segunda bancada, torre, quatro banners, moldura,
  pendente, quatro spots e painel de energia.
- Holyoke: painel navy com halftone próprio e nicho, uma run contínua de cinco
  vitrines com conteúdo não repetido, friso fotográfico, mural reconstruído com
  jogadores em escala de parede, quiosque interpretativo, bola-herói ampliada em
  vitrine dedicada, reconstrução da rede, banco, linhas de quadra, clavas/corda/
  bola de treino, sete trilhos de luz, ventilação e painel de energia.
  Os oito objetos históricos continuam interativos, agora integrados aos nichos e
  prateleiras. A composição segue `docs/concepts/holyoke-gallery-concept.png`; a
  captura validada está em `docs/contact-sheets/holyoke-gallery-implemented-v2.png`.
- Escritório: mesa dupla com blotter e objetos de trabalho, cadeira do curador, duas
  poltronas, quatro estantes altas, livros-caixa, tapete bordô, quadro de pesquisa,
  arquivo de mapas, carrinho, cofre, cabideiro, arandela e luminária verde interativa.
  A composição segue `docs/concepts/curator-office-concept.png`; a captura validada
  está em `docs/contact-sheets/curator-office-implemented.png`.

As placas baixas antigas permanecem apenas junto às vitrines de mesa; as peças-herói
de chão usam `label-angled`, sem duplicação.

A sinalização do átrio agora é arquitetura, não texto flutuante. As entradas
públicas da Holyoke e do Escritório do Curador usam placas procedurais biseladas,
com fixações e filetes no mesmo vocabulário de nogueira, navy, verde de arquivo e
latão do museu. O atalho de serviço não repete a placa da ala. O texto de dedicação
virou um painel físico de 5,2 × 1,5 m, com margem, hierarquia e relevo discreto de
bola. Todo o conteúdo vem do manifesto/i18n e adapta o tamanho do título ao idioma.
`RoomText` usa IBM Plex Sans Condensed Regular/SemiBold em WOFF local, cobre os
glifos pt-BR e inclui fonte e caracteres na assinatura de prontidão. As placas e
atlas entram na barreira de GPU da sala inteira antes de qualquer porta abrir.

Arte de parede não interativa agora também é dado: `RoomData.wallArt` referencia
ids da mídia histórica gerada e da mídia autoral tipada; `RoomWallArt` fornece
enquadramento `cover`, impressão flush ou moldurada, crédito localizado quando
necessário e cache de textura compartilhado. Expositores
embutidos podem declarar `supportY` e `case-wall`, mantendo a validação de datums sem
inventar mounts React específicos para uma sala.

### 4.4 Energia

`PowerControlData` torna o fluxo completamente data-driven. Toda sala inicialmente
escura tem um controle alcançável:

- átrio e Holyoke usam `breaker-panel`;
- escritório reutiliza a `desk-lamp`, sem duplicar sua geometria no kit; o controle
  também declara sua luz prática quente nos próprios dados.

Focar o controle mostra o prompt; `E` restaura a sala; o estado é idempotente e
persistido em `roomsPowered`. HUD, mapa, traduções e todos os tipos de
`UnlockEffect` reagem ao mesmo estado.

As luminárias visíveis e suas luzes vêm da mesma lista `room.kit`; spots podem
declarar `lightTarget` e usam um alvo real anexado ao scene graph. Luzes locais
ficam montadas com intensidade zero quando desligadas, evitando recompilar shaders
ao acionar o quadro. Points e spots são sem sombra no caminho compartilhado
desktop/mobile; isso removeu cerca de 44 mil triângulos de passes de sombra no frame
aceso e manteve a cena abaixo de 90k.

### 4.5 Fluidez e transições

O runtime mantém um pool global e permanente de oito spots e dois points. Seis
spots preservam a assinatura completa da sala principal; assim que uma porta vai
revelar o destino, essa sala assume os seis slots e a origem fica retida nos dois
restantes. Cruzar o limiar não troca mais o rig nem produz um segundo pop de luz.
Os dois points alternam entre piloto, luz prática e intensidade zero sem mudar a
topologia do shader. A energia continua persistida em `roomsPowered`; mudar de sala
ou acionar um quadro altera parâmetros, não desmonta luzes nem troca a contagem de
fontes. O DPR respeita o tier de qualidade e reduz em degraus quando há pressão
sustentada; a recuperação exige cinco segundos estáveis e usa histerese para não
redimensionar o canvas repetidamente.

Salas visíveis por um portal sem porta são pré-carregadas em fatias ociosas. Uma
porta fechada não transforma o portal em um `load-all`: a proximidade inicia o
download e monta a ala protegida em cache, invisível, para que retornos não recriem
instâncias, colliders ou BVHs.
Antes da primeira travessia, `compileAsync`, `initTexture` e draws 1 × 1 enviam
shaders, texturas e buffers à GPU gradualmente. A barreira agora cobre o root da
sala inteira: shell assado, sinalização, detail, kit, exhibits, arquivos, controles
de energia e arte de parede. Ela espera os três boundaries e o `onSync` real de
todos os textos Troika antes de fazer um scan novo. Texturas são deduplicadas por
identidade e versão, de modo que o atlas SDF atualizado também é enviado; o proxy
de warmup compartilha a geometria viva dos textos. A porta só recebe prontidão
quando shaders, texturas e geometrias ficam settled. Falha no draw privado mantém a
barreira fechada e entra em retry, em vez de publicar prontidão prematura. Recursos
compartilhados do GLTF não são descartados no cleanup e a fila/target privado são
liberados ao desmontar o Canvas.

Os dois acessos às salas frias usam portas duplas data-driven. Aproximar aquece a
sala; `E` ou o botão touch pode ser armado durante o loading; a abertura eased dura
0,8 s e começa somente após a prontidão real da GPU. Um gate procedural síncrono
bloqueia a cápsula antes mesmo do kit GLTF carregar e permanece até o último frame
da abertura. A sala inteira é revelada atrás das folhas ainda fechadas e precisa
renderizar um frame completo no ângulo zero antes que a dobradiça possa avançar.
Invalidar a prontidão nesse intervalo volta ao preload sem mover a porta.

Estacionar uma sala deixa sua geometria visual intacta e desliga apenas o raycast e
a layer de interação. Nunca volte a usar `visible = false` nos roots `exhibit:`,
`container:` ou `power-control:`: isso escondia exatamente esses assets durante a
abertura e os restaurava apenas quando `currentRoom` mudava após a entrada.

O boundary externo de exhibits é o dono único do `Suspense` de GLB e fotografias.
Não capture esses loaders dentro de `ExhibitLayer` ou `FramedMedia`: isso permite ao
marcador externo declarar a sala pronta antes de o acervo chegar à fila de GPU e
reintroduz exatamente o pop de Holyoke que a porta existe para esconder.

Depois que a cápsula cruza completamente e libera uma margem de 1,25 m, a porta
fecha automaticamente em 0,55 s. Durante o fechamento o gate continua ausente; se
o jogador voltar para o vão, as folhas revertem da pose corrente sem atravessar a
câmera. O gate só retorna no trinco. A porta então exige `E` novamente, inclusive
no caminho de volta. Se a porta for aberta e abandonada sem travessia, sair da sua
área de proximidade inicia o mesmo fechamento seguro; assim nunca ficam duas alas
detalhadas retidas por portas esquecidas. Uma porta fechada também interrompe o portal walk: a sala
anterior deixa de desenhar, mas seu detail continua montado em cache, invisível e
não interativo, sem recriar instâncias, colliders ou BVHs na próxima visita. O
atalho da Holyoke segue a mesma máquina, mostra “Abre pelo outro lado” no átrio e
só pode ser acionado de dentro em cada ciclo.

Na validação local a porta principal foi percorrida e fechada nos dois sentidos.
Com o vão já trancado, a Holyoke estabilizou em 32 draws / 32.636 triângulos e o
átrio, após o retorno usando o cache aquecido, em 41 draws / 48.802 triângulos. Os
dois ficaram em 60 fps; no retorno, p95 foi 17,3 ms e p99 17,6 ms. Durante a porta
aberta, o pico observado foi 93 draws / 84.674 triângulos, ainda dentro dos tetos
duros móveis de 100 / 90k.

Os hot paths de interação reutilizam arrays e examinam salas vazias no máximo a
2 Hz. A física faz broadphase AABB antes do BVH, reutiliza buffers/callbacks e usa
três resolves no autostep típico em vez de dez. Picos normais de frame são
consumidos em substeps de 1/30 s, preservando velocidade sem atravessar paredes.
`?perf` e `__museumPerf()` expõem média, p95, p99, máximo, frames acima de 33,3 ms,
DPR e escala adaptativa; média de FPS sozinha não é critério de aceite.

### 4.6 Controles móveis

O runtime atual monta dois direcionais touch: esquerda para movimento e direita
para câmera. `any-pointer: coarse` cobre Android, iPhone e iPad mesmo quando o
tablet também tem mouse/trackpad; o fallback de viewport cobre telefones em
paisagem no navegador de QA. Cada direcional captura seu próprio `pointerId`, então
andar e olhar simultaneamente não disputam o mesmo toque. `pointerup`, cancelamento,
perda de captura, blur, troca de aba, rotação da tela e desmontagem zeram os eixos.

O primeiro toque de cada direcional agora é a origem neutra do gesto; só o arraste
gera entrada. Isso evita arrancadas quando o polegar cai fora do centro pintado. O
reset de rotação/fullscreen libera também o `pointerId`, a captura e a posição visual
privados de cada pad — zerar apenas o Zustand deixava o controle morto no Safari
quando a plataforma não entregava `pointercancel`. Há listeners de janela como
fallback quando `setPointerCapture` não funciona. Soltar o direcional de câmera zera
a suavização no frame seguinte, sem a cauda anterior de quase 0,5 s / 13,6 graus.

No gesto de entrada em um dispositivo touch, o shell solicita fullscreen e depois
`screen.orientation.lock('landscape')`. Em portrait, um gate bloqueia o jogo e pede
que o aparelho seja girado; sair de fullscreen em uma plataforma compatível mostra
um botão explícito para retomá-lo. O manifesto declara `display: fullscreen` e
`orientation: landscape`, com os metadados de web app da Apple. Não mova a chamada
para um effect: a Fullscreen API exige o mesmo gesto do botão. Android/Chromium pode
cumprir as duas solicitações; iPhone Safari não oferece fullscreen de elemento, por
isso tela cheia completa ali exige abrir pela Tela de Início. iPad/Split View pode
exigir rotação manual e o gate permanece como fallback.

Um botão contextual **Ação** passa pela mesma intenção compartilhada de `E`, com
prioridade porta → peça → arquivo → energia. Assim abrir e armar portas durante o
loading, examinar, ler e restaurar energia não duplicam regras entre desktop e
mobile. O prompt esconde o glifo `E` em dispositivos coarse. A rotação de peças usa
deltas de `clientX/clientY`, porque `movementX/Y` é inconsistente para touch no
Safari. O gate `test:mobile-controls` cobre dead zone, clamp, inversão de Y,
normalização, origem relativa, lifecycle de pointer, parada do look, gate portrait,
ordem fullscreen → landscape e prioridade da ação. Em produção, o drag esquerdo
alterou a posição, o direito alterou a rotação e duas leituras posteriores à soltura
ficaram idênticas. Ainda falta o teste físico citado no backlog.

### 4.7 Câmera e resolução mobile

A câmera não usa mais 68° verticais fixos. Em telefone landscape esse valor
ultrapassava 111° horizontais e esticava as bordas como uma lente olho-de-peixe.
O contrato agora parte de 62° verticais e limita a abertura horizontal a 100°,
recalculando o FOV vertical pelo aspect ratio real depois de fullscreen, rotação e
resize. Em 16:9 isso resulta em 62° / 93,78°; em 844 × 390, 57,68° / 100°. O push
opcional ao correr caiu para 2° e continua desligado por padrão.

O tier `medium` deixou de herdar o teto desktop de 1,2 DPR no mobile. Telefones e
tablets agora usam perfis próprios, limitados simultaneamente pelo DPR físico, pelo
tier e por um orçamento total de pixels: `medium` chega a 1,6 DPR, tem piso de 1,0
quando o orçamento permite e não passa de 1,5 milhão de pixels de framebuffer.
Assim a nitidez aumenta sem tentar renderizar os nove pixels físicos por pixel CSS
de um painel 3×. O mesmo fallback de viewport que mostra os controles também ativa
o perfil mobile em WebViews que não anunciam `any-pointer: coarse`.

Existe um único controlador adaptativo. O antigo `performance.regress()` binário
brigava com a histerese própria e fazia o backbuffer oscilar entre resoluções após
um único frame lento. Agora um outlier não muda o DPR; pressão sustentada reduz um
degrau, há dois segundos de cooldown, e a recuperação exige oito segundos estáveis
com aumentos espaçados. O PerfHud expõe FOV vertical/horizontal, aspect, dimensão
CSS, drawing buffer, DPR e escala adaptativa real.

Na validação local em viewport 844 × 390, DPR físico 1,5, o frame estabilizou em
1266 × 585 (1,5 DPR). Durante movimento contínuo registrou 74 fps, p95 17,3 ms,
p99 18,3 ms e nenhum frame acima de 33,3 ms na janela de 600 amostras. O warmup
completo da Holyoke reduziu temporariamente para 1,38 DPR, permaneceu acima de 1× e
recuperou 1,5 DPR depois da estabilização. Esses números validam o algoritmo, mas
não substituem o teste térmico em Android e iPhone reais.

---

## 5. Comandos e portões

```bash
npm run dev
npm run bake
npm run check
npm run validate:content
npm run test:ratchets
npm run test:facts
npm run test:power
npm run test:opening
npm run test:opening-flow
npm run test:radio
npm run test:collision
npm run test:kit
npm run test:materials
npm run test:desk-top
npm run test:bookshelf
npm run test:kit-runtime
npm run test:room-runtime
npm run test:room-lod
npm run test:gpu-warmup
npm run test:render-performance
npm run test:transition-door
npm run test:mobile-controls
npm run test:navigation
npm run test:bundle
npm run build
```

`npm run test:ratchets` e `npm run test:bundle` são as catracas de L1 (§10): o que foi
medido pode descer e não pode subir. Os tetos, de onde veio cada um e como mexer neles
estão em `scripts/lib/ratchets.ts`. `test:bundle` roda `vite build` antes de medir, porque
um `dist/` velho não prova nada.

Rode `npm run check` antes de qualquer commit. Se mudar geradores, manifesto,
materiais ou colliders, rode `npm run bake` antes do check. Nunca corrija um teste
diminuindo sua cobertura.

`npm run facts:capture` fica fora do `check` de propósito (precisa de rede): rode
quando mudar `src/content/facts.bank.ts` e antes do lote de conteúdo de cada ala, e
commite o `facts.generated.ts` que ele gravar. `-- --dry-run` só relata;
`-- --fact=<id>` lê um fato só. Nunca edite o arquivo gerado: o `test:facts`
compara byte a byte com o que o script escreveria.

O gate de kit soma a receita inteira (`root` + `root__*`) e limita cada prop a
2.500 triângulos. Os casos mais próximos do teto são `coat-stand` (2.472, com o
chapéu e o guarda-chuva), `curator-desk` (2.460), `visitor-chair` (2.430),
`bookshelf` (2.396), `office-chair` (2.396), `bookshelf-b` (2.380),
`office-flatfile` (2.336), `door-leaf` e `door-leaf-right` (2.236 cada). Detalhe
novo nessas receitas precisa pagar com triângulos da própria receita; nas
estantes, cada livro com nervos custa ~30 e um de pano ~20 (§9.4).

A VRAM de textura é um portão duro de 45 MiB (`TEXTURE_VRAM_BUDGET` no bake e
`test:materials`); hoje são 43,875 MiB, folga de 1,125 MiB. A tabela no topo de
`scripts/bake/materials.mjs` acompanha cada receita. Toda chave de `MATERIALS`
precisa constar em `MATERIAL_TEXTURES` (`null` para cor lisa): o bake reprova a
chave esquecida, que antes saía sem textura e sem aviso.

Draw calls do kit por sala (`test:kit-runtime`, lotes únicos): átrio até 56,
escritório até 53 (hoje 53, com 34.182 triângulos instanciados, teto 36 mil).
Uma família de material nova numa receita custa um lote para todas as suas
colocações; uma variante nova de receita custa um lote por família.

O aviso do Vite de chunk acima de 700 kB (`playerPosition-*.js`, 725 kB) já existia
em `ca4513c`, com o mesmo hash; não é regressão da abertura.

---

## 6. Lições que continuam valendo

- Paredes usam a convenção local **+X ao longo da parede, +Z para dentro da sala**.
  Copiar coordenadas sem compensar paredes rotacionadas espelha portais.
- A casca nasce de `MUSEUM`; não mantenha uma segunda lista de salas no bake.
- A quantização guarda uma compensação no nó. Zerar a transformação do clone enterra
  toda peça de modo uniforme e visualmente enganoso.
- Depois que o GLTF é anexado ao wrapper da sala, `matrixWorld` já inclui a origem
  desse wrapper. Derive cada nó em relação à raiz carregada e aplique a origem uma
  única vez; o teste procedural de navegação não reproduz sozinho esse ciclo React.
- `crease: null` preserva normais de geometrias feitas só de caixas biseladas;
  lathe/sweep/cylinder precisam de um ângulo real.
- Texturas tileáveis só permanecem tileáveis se qualquer deformação também for
  periódica. Escale o raio do toro em vez da coordenada.
- Materiais texturizados usam `baseColor` como placeholder e `tint` branco por
  padrão; tingir nas duas pontas escurece o albedo duas vezes.
- O tint só escala canais: não muda matiz. Albedo cor de couro cru vezes um tint
  verde deu oliva, e oliva sob a luminária de tungstênio vira marrom. Receita que
  precisa de outra cor nasce neutra (canais iguais) e o tint é alvo ÷ média
  linear do albedo. Confira a cor sob as DUAS luzes da abertura: a luminária é
  quente (`#ffb45f`) e a lanterna é fria (`#dfe7ff`), e um verde com azul demais
  vira azul-petróleo no facho. `test:materials` mede isso decodificando os WebP.
- O hash de 1 cm do `toCreasedNormals` trunca para zero, então a célula em
  volta do eixo tem 2 cm: peças torneadas pequenas (tampas de tinteiro, botões)
  saem facetadas como pedras lapidadas. Finalize-as com `crease: null` (normais
  do próprio lathe) e junte à família com `finalize(merge([...]), { uv: 'none',
  crease: null })`.
- Catmull-Rom centrípeto (o padrão do three) passa dos pontos de controle: o fio
  do telefone afundou 2,4 mm na mesa entre dois pontos apoiados nela. Use
  `'catmullrom'` com tensão baixa e assente a receita pelo mínimo medido de
  todas as famílias juntas.
- O papel tem pautas em v = 0. Peça de papel projetada em torno da própria
  meia-espessura ganha uma pauta em cada borda; projete meia pauta acima
  (`paperPiece` em `office.mjs`).
- Projeção em caixa DEPOIS do merge faz peças vizinhas dividirem uma folha só de
  textura: uma mancha de couro atravessava três lombadas. Projete peça a peça (com
  um deslocamento por peça) e feche com `finalize(..., { uv: 'keep' })`; o
  `finalize` agora reprova um modo de UV desconhecido em vez de tratá-lo como
  'keep' em silêncio.
- A lanterna é fria e forte de perto. Verde com azul acima de ~0,45 do verde vira
  menta no facho (as caixas de arquivo em `archive-green` viravam); a 1,4 m o
  centro do facho leva um vermelho a salmão e um couro claro a creme, então
  famílias que precisam se separar no escuro se separam por VALOR, com cores
  moderadas. Clearcoat afiado (o `walnut-polished`) visto de frente pelo facho
  pinta um disco branco: interiores de móvel usam `walnut-satin`.
- Num móvel, a caixa biselada gasta quase todos os triângulos em arestas
  enterradas (pontas das prateleiras nas laterais, fundo no painel). Uma seção
  varrida com chanfro só onde a luz bate custa 20 em vez de 108.
- Objeto inclinado gira em torno da ARESTA de baixo do lado para onde cai, e o
  ângulo resolve o contato com o apoio (`tan θ = folga / h_apoio` ou
  `sin θ = folga / h`). Girar em torno do centro afunda um canto e deixa o outro no
  ar, encostado em nada.
- `visible = false` também remove objetos do `Raycaster`; proxies de interação usam
  uma layer dedicada.
- Clones de GLTF compartilham geometry/material com o cache. O cleanup de uma
  instância deve liberar apenas buffers próprios, nunca o cache comum.
- `renderer.info.programs` acumula variantes já compiladas. Compare programas após
  reload limpo quando alterar luzes.
- Um point light com sombra custa seis passes. Continua proibido.
- `__museumStep(n)` deve ser chamado uma vez com `n` frames, não `n` vezes com um.
- Portas síncronas podem ser os primeiros colliders. O controller espera contato
  com uma superfície caminhável, não apenas `world.size > 0`, antes de ligar a
  gravidade no spawn. Essa espera procura o piso até 2 cm abaixo do pé
  (`hasWalkableSupportBelow`): o piso do escritório sai da dequantização uma fração
  de milímetro abaixo de y = 0, o toque exato nunca acontecia e o spawn ficava sem
  gravidade e sem WASD. O teleporte pula essa espera, então só o spawn natural (e o
  `test:room-runtime`, que carrega o GLB de verdade) mostra o problema.
- No OneDrive, o watcher do Vite pode perder a segunda de duas edições seguidas no
  mesmo arquivo e continuar servindo a transformação velha, mesmo com reload
  (observado em 02/10/2026 no `PlayerController.tsx`). Se o
  jogo não bate com o código, confira o que o servidor entrega
  (`fetch('/src/...', { cache: 'no-store' })`) e reinicie o dev server.
- `PropertyBinding.sanitizeNodeName` remove `[ ] . : /`; normalize os dois lados
  quando comparar nomes de nós.
- O disco do Windows ignora maiúsculas: `devices.ts` ao lado de `Devices.tsx` faz o
  `tsc` resolver o arquivo errado. Módulos puros levam outro nome (`deviceRules.ts`,
  `flashlightRig.ts`).
- Uma luz nova muda a contagem de luzes de todo programa de shader. A lanterna é um
  spot permanente com intensidade zero quando apagada; desmontá-la ou usar
  `visible = false` recompila o prédio no primeiro clique.
- Para girar um nó do kit (ponteiros do relógio), reparente-o num pivô no centro
  medido; a rotação direta gira em torno da origem de quantização.

---

## 7. Próximas prioridades

**O plano até o fim do jogo está em `docs/PLANO-ATE-O-FINAL.md`** (2026-10-03): correções do
átrio e da Holyoke, polimento de assets, o roteiro completo e 24 lotes de execução, com as
decisões do dono em §0.3. Ele substitui o roteiro de `docs/PLANO-COMPLETO.md` onde divergem
(Anexo D do plano). As fontes dele estão em `docs/plano-mestre/fontes/`, os scripts de medição em
`scripts/audit/` e as capturas de referência em `docs/contact-sheets/baseline-2026-10-03/`. A
lista abaixo é anterior ao plano e vale no que ele não cobrir.

**Decisões.** Em 2026-10-04 o dono mandou seguir os padrões nas 36 decisões de §0.3; o registro é
`docs/plano-mestre/DECISOES.md`.

**L1 (Correções no ar), estado em 2026-10-04:** implementado em dois commits locais e conferido
no navegador de desenvolvimento; falta revisão, push, deploy e fumaça. Tudo em §10.

**Preparação (P0), estado em 2026-10-04.** Nada mudou no jogo; o build de produção é o mesmo.

- Feito (itens 1 a 4):
  - os scripts de `scripts/audit/` rodam de qualquer clone (raiz por `scripts/audit/lib/repo.mjs`),
    cada um abre dizendo o que mede e tem a sua entrada `npm run audit:*`. São ferramentas de
    medição: ficam fora do `check`, e o `audit:geo2` precisa de `npm run build` antes;
  - `npm run test:docs`: todo ID do plano resolve (defeitos nos relatórios de origem, scripts,
    capturas citadas pelo nome, decisões) e o `PLANO-COMPLETO.md` diz o que foi substituído;
  - `npm run test:captures`: o manifesto de `docs/contact-sheets/baseline-2026-10-03/` (gerado por
    `npm run captures:manifest`) bate com os 100 quadros. A linha de base é congelada: um quadro
    trocado reprova, e regerar o manifesto não resolve. Toda pasta nova de capturas entra em
    `CAPTURE_SETS` (`scripts/lib/captureManifest.mjs`);
  - `npm run test:qa-save`: os cinco saves de produção escritos à mão
    (`src/content/saveFixtures.ts`) carregam pelo caminho real de carga sem perder nada. Um save
    desses é registro, não conteúdo: quando um lote renomear um id, o registro fica como está e a
    migração tem de carregá-lo.
- Feito (item 5, captura de fontes):
  - `npm run facts:capture` lê cada página que o banco de fatos (`src/content/facts.bank.ts`)
    nomeia e grava em `src/content/facts.generated.ts` o que ela continha: status, título real, hash
    do texto, data e um trecho de até catorze palavras em volta do valor. **Precisa de rede e fica
    fora do `check`**; o portão lê o arquivo commitado. Rodar de novo sem a página ter mudado não
    altera um byte (a data só anda quando o texto muda);
  - os quatro códigos estão capturados, cada um em dois grupos de publicadores: `1896` (FIVB, IVHF,
    Wikipédia), o catorze como **lista de nomes** (IVHF; Wikipédias IT e PT), `1962` (Wikipédias EN
    e RU; IVHF) e `1973` (PAP/dzieje.pl; Wikipédias PL e EN). Os três das alas (`founding-federations`,
    `japan-world-title`, `wagner-takes-poland`) estão no banco antes de as alas existirem; o lote da
    ala cria o `Fact` com o mesmo id;
  - `validate:content` ganhou `fact-code-uncaptured` (código só com dois publicadores
    independentes lidos), `fact-source-uncaptured` e `fact-source-drift` (o que `FACTS` cita é
    página lida, com o título, o publicador e a data da leitura) e `fact-capture-malformed`;
    `npm run test:facts` (28) prova a leitura em páginas escritas para o teste e confere o registro
    commitado. Os quatro são erro, não aviso: nada entrou em `knownDebt`;
  - `FACTS` em `museum.ts` foi consertado junto (era de L1): saiu a URL do IVHF que devolvia 404, e
    `first-rulebook` e `six-a-side` deixaram de citar a Wikipédia "Volleyball", que não contém 1897
    nem 1918. Mudou só o dado das fontes; nenhum texto do jogo mudou.
- Aberto na captura: `olympics.com` não responde ao robô (tempo esgotado em toda rodada, como na
  pesquisa de 03/10; a página existe e respondeu 200 a outro User-Agent no mesmo dia). Está em
  `src/content/facts.manual.ts` como pedido (`check: null`): alguém abre a página no navegador e
  preenche data, título, trecho e hash. Não trava nada hoje (o `1962` tem dois publicadores sem
  ela); a Ala 3 precisa dela para «em Moscou» (plano, 7.7, item 6).
- Feito (item 7, Anexo E no navegador e linha de base): `docs/lotes/P0-linha-de-base.md`, com 20
  capturas em `docs/contact-sheets/p0/` (conjunto congelado, como o de 3 de outubro).
  - **Anexo E #2, confirmado:** da entrada da Holyoke o piloto fica a 103° do eixo da câmera e
    não muda um pixel do quadro.
  - **Anexo E #3, confirmado:** as quatro peças da vitrine corrida cruzam um montante e uma
    prateleira. O registro traz o centro de cada vão e o topo real de cada prateleira
    (`supportY: 1.32` é o centro da tábua).
  - **Anexo E #4:** a parede oeste está livre, mas em z = 5,0 (a proposta do plano) a
    vitrine-herói fica na frente do quadro. Validada: `position: [-5.86, 1.15, 2.2]`,
    `rotationY: Math.PI / 2`. O plano (H-26) já diz isso.
  - **Anexo E #8, confirmado, com um desfecho a mais:** com uma imagem do átrio parada, a porta
    do escritório fica em «Preparando a próxima sala…» sem fim; com a imagem **falhando**, o
    `useLoader` lança, não há limite de erro e a página fica em branco. O tempo-limite de L1
    cobre o primeiro caso; o segundo precisa apanhar o erro do carregador.
  - **Linha de base:** dez pontos de referência com câmera registrada (R01 a R10), programas,
    bytes por caminho e textura residente. Três números do livro-caixa mudaram (plano, 4.8):
    o par de salas com a porta aberta dá **128 draws** (era 93; o teto é 100), a diagonal
    sudeste do átrio dá 101 e a textura residente é 107,08 MiB (era 98,6: faltavam os dois SVG
    e o atlas de texto).
  - `npm run test:docs` confere que o registro tem veredito para cada item do Anexo E marcado
    para L1, os dez pontos com câmera e contadores, e que toda captura citada existe;
    `npm run test:captures` confere o conjunto.
- Falta: item 6 (aparelho real nº 1, tarefa do dono).

Lições da captura, para quem acrescentar fonte:

- **Grupo de publicadores sai do host**, pelo registro `PUBLISHERS` em
  `src/content/factCapture.ts`; host novo é registrado antes. Duas páginas de um site são um
  publicador, e toda Wikipédia é uma família. Página que repete o texto de outro publicador declara
  `copies`: a página do Morgan no IVHF conta a renomeação e o manual de 1897 com as palavras da
  FIVB, e a história do IVHF dá 1918 com a mesma frase da FIVB, palavra por palavra. Por isso
  `first-rulebook` e `six-a-side` têm duas páginas e **um** publicador: nenhum dos dois pode virar
  código.
- **O ano sozinho não prova nada.** O banco dá as palavras que têm de estar perto do valor
  (`near`), e palavra solta engana: «Japan» fica ao lado de 1962 em toda lista de sedes (URSS 1962,
  Japão 1967). Use a expressão da afirmação («champions Japan», «limited to six»).
- **A Wikipédia é lida pela API**, como uma revisão renderizada, e o registro guarda o link
  permanente dessa revisão. Não cite o HTML do artigo: muda a cada requisição.
- **O robô se identifica e não se disfarça.** O `olympics.com` deixa o User-Agent do projeto sem
  resposta; a saída é a conferência manual, não trocar o User-Agent. `fivb.com` e `dzieje.pl`
  derrubam a primeira conexão de uma rajada: o script espaça as leituras e tenta três vezes
  (tempo esgotado não se repete: meio minuto de silêncio já é resposta). Em rede com IPv6
  quebrado, `NODE_OPTIONS=--dns-result-order=ipv4first`.
- **Trecho curto de propósito**: catorze palavras localizam a frase; o hash fixa o texto inteiro. A
  página é do publicador.

1. **Teste em dispositivos móveis reais.** Num Android médio, valide fullscreen,
   lock landscape, multitouch, fluidez, temperatura e pressão de memória. Num
   iPhone/iPad, teste Safari e o web app pela Tela de Início, inclusive rotação e
   interrupção dos gestos. O átrio ainda supera o alvo móvel ideal de 45 draws.
2. **Playtest com uma pessoa nova.** Meta: concluir a ala em oito minutos e repetir
   ao menos um fato histórico verdadeiro.
3. **Paleta por ala.** Material de piso, temperatura e acabamento ainda têm pouca
   variação real apesar de `PaletteId`.
4. **Áudio e acabamento.** `RoomData.audio` continua sem leitor; pós-processamento,
   desgaste e assimetria seguem ausentes. A música calma no clique da luminária
   (contrato da sala segura) ainda não existe.
5. **Continuação da abertura** (ideias aprovadas pelo dono, ainda não feitas):
   folheto na recepção liberando a aba Planta, quadro do átrio religando só a luz de
   serviço (o disjuntor GERAL fica para o final), goteira e claraboia trincada no
   átrio, secretária eletrônica com o recado do Otávio, e o relógio marcando o
   avanço da noite até o amanhecer.

---

## 8. Verificação visual

A aba pode ficar oculta em ambientes de agente; dê tamanho explícito à viewport e
emita `resize` antes de concluir que o R3F não montou.

Harness disponível:

- `window.__museumPerf()`;
- `window.__museumRender()`;
- `window.__museumStep(n)`;
- `window.__museumTeleport(x, y, z, yaw, pitch)`;
- `window.__museumScene()`;
- `window.__museumCollision()`;
- endpoint `/__capture` para `docs/contact-sheets/`.

Em desenvolvimento, o mesmo harness também aceita
`?qaCamera=x,y,z,yaw,pitch&qaPower=room-id`. Esse bridge existe porque alguns
navegadores de QA isolam scripts de inspeção dos globais instalados pelo jogo.

`?qaSave=<nome>` (só no servidor de desenvolvimento) começa a sessão de um save
nomeado de `src/content/saveFixtures.ts`: o save é gravado na chave do jogo antes de
o store ser avaliado, e por isso passa pela migração de verdade, ao contrário do
`qaPower`, que só acende a sala. Recarregar com o parâmetro volta ao save; sem ele,
continua. Nome desconhecido não grava nada e lista os nomes no console. O módulo é
injetado por `scripts/vite-plugin-qa-save.mjs` e nada em `src/dev` entra no build
de produção (o `test:qa-save` confere).

Para medir do mesmo jeito que a linha de base de `docs/lotes/P0-linha-de-base.md` (seção 0
dela), e o que a medição de 2026-10-04 ensinou sobre o harness:

- **Reload limpo exige calar o save antes de navegar.** O store grava ao descarregar a página;
  `localStorage.clear()` sozinho devolve o save antigo. Faça
  `Storage.prototype.setItem = function () {}`, depois `clear()`, depois navegue, e confira que
  o botão do título diz «Entrar no museu».
- **Uma chamada de JavaScript que estoura os 45 s continua rodando.** Uma delas gravou, minutos
  depois, um quadro por cima de outro. Divida o trabalho em chamadas curtas e confira o hash dos
  quadros depois de qualquer estouro.
- **`img.decode()` não resolve com o painel oculto.** Leia pixels com `gl.readPixels` logo
  depois do `__museumRender()`.
- **O aquecimento de GPU leva cerca de 70 s com o painel oculto.** Espere programas,
  geometrias e texturas pararem de mudar antes de ler contadores; não é número de desempenho.
- **A cena está ao alcance da página** pelo `_roots` do `@react-three/fiber`, importado pelo
  mesmo endereço que o jogo usa (`performance.getEntriesByType('resource')` diz qual). Serve para
  lançar raios de visada, medir caixas e ligar ou desligar uma luz no mesmo quadro. Mover um
  objeto assim é medição, nunca conserto: devolva-o e diga no registro o que foi movido.
- **O HUD não sai no `/__capture`.** A captura de tela do painel sai, a 800 × 450.

A inspeção visual final desta etapa confirmou no build servido:

- o átrio nasce navegavelmente escuro;
- o piloto vermelho torna o quadro localizável;
- o prompt “Restaurar energia” aparece no alcance;
- `E` acende a sala e remove o prompt;
- a iluminação acesa preserva leitura de madeira, parede e ferragens sem o banho
  branco que existia antes.
- o escritório reproduz a composição diagonal da referência, mantém o trajeto até
  a luminária e o armário trancado, e renderiza sem interpenetrações.
- as três portas aparecem fechadas no datum do reveal, apresentam prompts corretos,
  abrem sem atravessar a câmera, revelam a sala já mobiliada, fecham depois da
  travessia e exigem nova interação no retorno;
- fechar a porta estaciona a sala anterior sem descartá-la; ida e volta não
  recriam seu detail e as luzes retomam o estado de energia anterior;
- teleports de QA aguardam o piso da coordenada alvo registrar antes de mover a
  câmera; átrio, Holyoke e escritório estabilizaram em `y = 1,62`.

---

## 9. A abertura: o escritório à noite (2026-10-02)

É noite, véspera da reabertura; a tempestade da tarde derrubou a energia. A sessão
começa no escritório, de costas para a porta e de frente para a mesa
(`src/content/spawn.ts`, re-exportado como `MUSEUM.spawn`). A ordem desenhada é:
lanterna → caderno → luminária → porta → átrio escuro.

- **Caderno** (`office-notebook`, `presentation: 'notebook'`, `carriesJournal`):
  três páginas (`DocumentData.pages`): folha de rosto impressa, carta manuscrita da
  diretora Helena com P.S. sobre as datas do Otávio, e a lista "Antes das 9h", que
  se risca sozinha por `ProgressCondition`. `E` vira a página e fecha na última.
  Ler é pegar: o caderno some da mesa e só então o diário (Tab, ou o ícone na tela)
  passa a existir. Regras em `src/engine/notebook.ts`, leitor em `src/ui/Notebook.tsx`.
- **Trava elétrica**: `transitionDoor.requiresPower: 'office'` na porta do átrio.
  `transitionDoorBlock` responde `'unpowered'`, o prompt diz "Fechadura sem energia"
  e o `E` dá um zumbido. O aquecimento da sala vizinha continua (só a abertura é
  bloqueada). O portão de solvabilidade trata a trava nos dois sentidos da abertura.
- **Dispositivos** (`RoomData.devices`, `src/engine/Devices.tsx`, regras puras em
  `deviceRules.ts`): relógio elétrico parado às 16h47 que volta a andar com a energia
  (ponteiros em pivôs no centro medido do `__dial`); leitor da porta com lente
  `__led` vermelha → verde e o "clac" do trinco; rádio da portaria, sem carga até a
  luminária, que chama uma vez (`progress.radioCalls`) e responde dicas na ordem do
  que falta (átrio → Ala 1 → gaveta 1896 → cofre). Legendas em `RadioSubtitles`.
  Desde §9.2 o rádio sai da mesa com o jogador no primeiro uso.
- **Lanterna**: um spot permanente (`flashlightRig.ts`, `Flashlight.tsx`), tecla F
  ou o ícone no canto inferior direito, que pulsa enquanto a sala está escura e a
  lanterna nunca foi usada. Alcance de 6,2 m: o teste prova que nunca chega ao teto
  do átrio.
- **Modelos novos** (`scripts/bake/parts/officeProps.mjs`): caderno de capa vermelha
  com elástico e caneta, rádio no carregador, relógio de parede e leitor da porta.
  **Melhorados:** estante com encadernações em três cores, cabideiro com o chapéu do
  antigo curador e o guarda-chuva da tempestade, e a planta do museu
  (`public/textures/media/office-blueprint.svg`) na parede sul, com o cofre circulado
  a lápis vermelho. Materiais novos sem textura: `plastic-black`, `led-off`,
  `led-red` e `led-green`.
- **Testes**: `npm run test:opening` (23 checagens: spawn, caderno, lista, trava,
  rádio, relógio, lanterna e validador). `validateOpening` cobre spawn, páginas,
  dispositivos e condições; `validateBake` exige os nós `__hand-*`, `__dial` e `__led`.

### 9.1 O fluxo da abertura, depois da auditoria

Regras que valem para qualquer sistema novo que responda ao `E`:

- **Um modal por vez.** `isModalOpen` (`src/state/store.ts`: examinar, container
  aberto, teclado ou diário) bloqueia todo `interact`, limpa todo foco nos
  `useFrame` de mira e esconde mira, ferramentas e prompts. Abrir teclado, leitor ou
  exame fecha o diário. Clique fora de um painel nunca captura o ponteiro
  (`shouldCapturePointer`), e todo container aberto solta o ponteiro.
- **O alvo mais próximo vence.** Cada mira publica a distância do acerto junto com
  o foco; `interactionWinner` (`src/engine/interactionTarget.ts`) decide o dono do
  `E` (porta e peça têm precedência; entre container, rádio e luminária vence o mais
  perto, empate de 3 cm na ordem antiga; rádio sem carga nunca vence). Guardas,
  prompts do HUD e o botão Ação móvel perguntam a mesma função.
- **Caderno opcional, mas lembrado.** `ProgressCondition.documentsUnread`; a primeira
  dica do rádio e a chamada `porter-notebook-reminder` mandam pegar o caderno. As
  chamadas tocam na ordem do conteúdo e caem se a condição deixar de valer
  (`radioCallReady`). O painel de documento só diz "Tab para reler" com o diário
  liberado (variante de toque sem tecla; `hudRules.ts`).
- **Save.** `migrateProgress` sanitiza todo campo e traz saves anteriores à abertura
  (sem `radioCalls`) sem subir `SAVE_VERSION`: átrio aceso marca a primeira chamada
  como ouvida, qualquer progresso concede `doc-welcome` (ids em
  `src/content/legacySave.ts`, checados pelo validador). Campo novo em `Progress`
  precisa entrar em `migrateProgress`, senão é descartado no load. O save é forçado
  no `visibilitychange` → hidden e no `pagehide`; `contributeToSave` deixa o relógio
  gravar o tempo decorrido (`progress.clockSeconds`, tempo de jogo, nunca relógio
  real) antes desse flush. `hintsShown` guarda os avisos de uma vez só.
- **Título.** "Novo jogo" aparece só com progresso real (`hasSavedProgress`), pede
  dois cliques e zera progresso e sessão com gravação imediata.
- **Outros.** "Clique para olhar" no desktop sem ponteiro travado; o toast de
  catálogo só anuncia crescimento; o `AudioContext` volta depois de interrupções
  (gestos, visibilidade, `onstatechange`) e nenhum som é agendado num contexto
  parado; a planta desenha as portas ao longo da parede; o validador de traduções
  percorre todas as coleções. O código da gaveta (1896) está na plaqueta da moldura
  do retrato do Morgan e no título do documento «Springfield, 1896», e em nenhum
  outro lugar (desde L1, §10; antes estava também na ficha do retrato).
- **Testes**: `npm run test:opening-flow` (38 checagens, com o save do navegador
  simulado para provar a migração pelo caminho real de carga).

### 9.2 O rádio no bolso e a paciência do Jorge

- **Pegar.** `carriedOnUse` no rádio da mesa: o primeiro `E` (ou Ação), com a
  luminária acesa, leva o rádio (`progress.devicesCarried`), como o caderno. Pegar
  nunca pula fala. No bake, o rádio de mão tem famílias próprias
  (`desk-radio__handset`, `__handset-metal`, `__handset-led`); o runtime as junta num
  `Group` (`prepareHandset`, `src/engine/deviceNodes.ts`) e esconde o grupo — nunca
  as malhas, que a varredura da mira religa. O berço fica com o LED verde e um
  encaixe vazio. `validateBake` exige `__handset` em rádio levável.
- **Chamar.** `R` (sem Ctrl/Cmd/Alt, sem repetição, fora de campo de texto;
  `isRadioCallKey` é o único lugar com `'KeyR'`) ou o ícone do rádio no HUD, de
  qualquer sala, nunca com modal. Tudo passa por `placeRadioCall`
  (`src/engine/radioCall.ts`, imperativo e sem React, para o HUD lazy não puxar
  three): Jorge falando → pula uma fala; chamada de conteúdo devida → toca antes de
  qualquer dica (a corrida dos 2,4 s acabou); desligou na cara → só chiado
  (`radioHungUpUntil`, sessão); senão a resposta da paciência.
- **Paciência** (`RadioPatience` em `museum.ts`, regras puras em
  `src/engine/radioPatience.ts`): níveis a partir das chamadas 1, 3, 5, 7 e 10
  (prestativo, seco, zoeira, impaciente com dica curta e 30% de explosão, sem
  paciência com 50%). A dica nunca falta, exceto numa explosão; nunca duas explosões
  seguidas; nada se repete em seguida. 300 s de silêncio descontam uma chamada, o
  progresso perdoa uma e rende elogio, e o temperamento tem teto no último nível (15
  minutos de silêncio sempre baixam um nível). `progress.radioMemory` guarda o
  temperamento por rádio, sanitizado no `migrateProgress`. Desligar = 12 s de ar
  morto, com o estalo `radioHangUp`.
- **Chamadas e legendas.** Uma chamada de conteúdo leva `callId` e só entra em
  `radioCalls` quando a última fala termina (recarregar no meio a repete). O
  `RadioDirector` agenda só a primeira devida e espera qualquer modal, exame incluso.
  A legenda some e congela sob qualquer modal e o chiado toca uma vez por fala. Na
  tela de toque a coluna é rádio, caderno, lanterna, com a lanterna junto do polegar.
- **Testes**: `npm run test:radio` (22 checagens com relógio e dado fixos, pelo
  caminho real de chamada).

### 9.3 Tecidos, couro e a mesa do curador

Capturas: `docs/contact-sheets/office-fabrics-desk-lit.jpg` (ponto de leitura,
escritório aceso) e `office-fabrics-desk-torch.jpg` (spawn, só a lanterna).

- **VRAM.** 45,000 → 43,875 MiB. Albedo e ORM das três bolas foram para 64 px
  (eram constantes: desvio < 1,5/255), o albedo do `leather-tan` para 512 (a
  normal fica em 1024 pela Spalding). Com isso entraram três receitas neutras:
  `leather-upholstery` (granulado arredondado de ~2,7 mm a 0,13 m/tile, vincos
  finos, polimento de uso), `upholstery-velvet` (pelo, tufos e manchas de pelo
  amassado) e `paper` (fibra, ondulação e 32 pautas por tile). A pátina do couro
  e as manchas da lona agora são periódicas (sem costura no tile).
- **Chaves novas** (`glb.mjs`): `leather-desk` (mesmos mapas do couro com
  `normalScale` 0,6 e `roughnessScale` 0,8), `leather-ledger`, `velvet-green`,
  `felt-brown`, `rug-ivory`, `paper-writing`, `bakelite-black` e `enamel-cream`.
  `leather-green` saiu dos mapas tan e ganhou tint de verde-garrafa real
  (quase sem vermelho) e clearcoat 0,1; `rug-burgundy` foi para os mapas de
  veludo. Os tints valem alvo ÷ média linear medida do albedo.
- **Runtime.** `src/engine/materialSpec.ts` monta o material a partir do spec
  (puro, testado): `sheen`/`sheenColor`/`sheenRoughness` (veludo, feltro e tapete),
  `normalScale` e `roughnessScale` (uniforms, zero programa). Toda chave com
  sheen é texturizada e sem clearcoat, então custa **um** programa por
  configuração de luz; no ponto de leitura a contagem acumulada foi de 27 para
  29 e `__museumPrograms()` (novo no PerfHud) mostra o programa do sheen
  compartilhado por quatro materiais. Draw calls no ponto de leitura: 47 → 48
  (a cartela do disco do telefone). Triângulos: 31.032 → 33.644.
- **Geometria** (helpers novos em `geometry.mjs`: `quiltedPanel`,
  `quiltedGridPoint`, `quiltedHeight`, `piping`, `roundedSlab`,
  `roundedRectPoints`, `domeStud`):
  - poltronas de visita: veludo verde, assento e encosto com coroa, vivo no
    assento e 16 tachas em cúpula na face de TRÁS do encosto, que é o que o
    spawn vê;
  - cadeira do curador: assento abaulado com vivo, encosto com capitonê em
    diamante (8 botões em covas de 18 mm) e vivo, tachas nas laterais, latões
    lisos;
  - mesa: blotter `leather-desk` com dois filetes dourados; mata-borrão com
    cantoneiras de couro e quatro folhas de 1 mm em retrato por cima; puxadores no
    fichário; tinteiro de nogueira com dois poços e caneta de molhar; abridor de
    cartas. O telefone virou a receita `desk-telephone` (baquelite com disco
    perfurado, garfos, fone, fio e a cartela `__card` em esmalte);
  - livros-caixa autorados no próprio quadro (a lombada não escorrega mais),
    0,5 mm entre volumes, nervuras e etiquetas na lombada; luminária e livros a
    0,747 (em cima do couro), livros em `[0.81, 0.747, 0.32]`, caderno 1 cm para
    dentro do couro;
  - caderno com cantos arredondados, cabeceados, painel dourado e caneta preta
    com pena e anel de latão;
  - chapéu de feltro com 20 lados, vinco central e fita; remates do cabideiro
    lisos; tapete de pelo a 0,4 m/tile; mostrador do relógio em esmalte; papéis do
    quadro de cortiça pautados.
- **`buildCuratorDesk().layout`** registra a pegada de cada objeto embutido da
  mesa e o blotter; `npm run test:desk-top` junta isso a tudo o que o conteúdo
  põe em cima da mesa (kit, container, dispositivo ou controle de energia) e
  prova que cada um está inteiro no couro ou inteiro na nogueira, apoiado na
  altura certa (±0,5 mm), e a 2 mm ou mais do vizinho (SAT em OBB). O teste
  reprova a posição antiga dos livros-caixa e da luminária, e pegou o fio do
  telefone afundado.
- **Testes**: `test:materials` (7: VRAM, neutralidade, verde sob as duas luzes,
  cores do tapete/feltro/papel, sheen num programa só, montagem do material) e
  `test:desk-top` (6); `test:kit` passou de 324 para 327.
- As estantes ficaram para a etapa seguinte (§9.4), que deixou de usar
  `leather-green`, `leather-worn` e `rope-velvet` nos livros: têm chaves próprias.

### 9.4 Os livros das estantes

Capturas: `docs/contact-sheets/office-books-torch.jpg` (meio da sala, só a
lanterna, as estantes A e B da parede leste) e `office-books-lit.jpg` (spawn a
4,5 m, escritório aceso, as quatro estantes).

- **Módulo próprio**, `scripts/bake/parts/bookshelf.mjs` (saiu de `office.mjs`).
  A arrumação é DADO (`LAYOUTS`, fileira por fileira): coleção (`set`) de uma
  altura, com um volume faltando (`missing`); livro inclinado (`lean`, para a
  esquerda no item anterior ou para a direita na lateral); pilha deitada
  (`stack`); livros deitados sobre as cabeças de uma coleção (`over`); caixas
  (`boxes`, lado a lado ou empilhadas); suporte (`bookend`); vão (`gap`). Um motor
  pequeno espaça as lombadas de 0,6 a 3 mm (PRNG `mulberry32` com semente fixa por
  variante, agora exportado de `texture.mjs`), alinha as frentes 2 cm atrás da
  borda com ±2 mm e alguns volumes puxados, e resolve o ângulo do inclinado para
  tocar o apoio, girando na aresta de baixo.
- **Alturas por fileira**: fólios embaixo (0,38 a 0,44 m), quartos no meio (0,26 a
  0,34) e oitavos e folhetos em cima (0,19 a 0,25). Antes a fileira de cima tinha
  os maiores e os mais numerosos.
- **Lombadas**:
  - couro: nervos (meio cilindro de dois segmentos, 4 triângulos, normais suaves),
    filetes dourados na cabeça e no pé, e peça de título de outra família no
    segundo painel com a barra de título dourada;
  - pano: filetes duplos e título dourado direto no pano;
  - etiquetas de papel (um cartão menor que o painel) nas atas do museu;
  - as duas coleções finas levam cabeça dourada e nervos dourados (os mesmos
    triângulos, na família `brass`);
  - cabeças de página (família `pages`) nas fileiras abaixo do olho, tiras de
    papel saindo de três livros e suportes de latão.
- **Faces só onde alguém vê**: lombada, laterais e cabeça (só abaixo do olho), sem
  miolo de trás nem pé: 6 a 8 triângulos por livro em vez de 12. A carcaça caiu de
  1.080 para 534 triângulos: as prateleiras viraram uma seção varrida com chanfro
  na frente e o painel de fundo, um quad.
- **UV por livro**: cada peça projeta as próprias UVs com um deslocamento da
  sequência R2, e as famílias fecham com `uv: 'keep'` (documentado no
  `finalize`). Couro a 0,08 m/tile (grão de ~3 mm; era 9), verde a 0,1, pano a 0,06.
- **Materiais**, com chaves próprias e sem VRAM nem programa novos:
  - `book-brown` (marroquim chocolate, Y ~0,058), `book-calf` (bezerro claro,
    ~0,185), `book-green` (verde-garrafa nos mapas neutros, ~0,054) e `book-cloth`
    (o carmesim da corda, um tom mais fundo, ~0,078);
  - `book-pages` (papel empoeirado, mais cinza que qualquer encadernação);
  - `archive-buckram`: as caixas em buckram verde, porque o esmalte `archive-green`
    virava menta na lanterna;
  - `walnut-satin` na carcaça: o clearcoat afiado pintava um disco branco no fundo
    de cada fileira.

  `test:materials` prova ΔE ≥ 15 entre as quatro famílias sob luz branca,
  luminária e lanterna, o bezerro com o dobro do valor de qualquer escura e as
  caixas verdes no facho.
- **`bookshelf-b`**, a segunda arrumação (caixas empilhadas na fileira 0, pilhas e
  coleções em outros lugares), fica na estante norte e no meio da parede leste, que
  lê A, B, A. Registrada em `schema.ts` (`KitPartId`), `museum.ts`,
  `kitColliderParts`, `FLOOR_STANDING` e na lista de montagens do `test:kit`. As
  carcaças são idênticas e o `dedup()` as junta no GLB.
- **Custos**: A tem 2.396 triângulos e B 2.380 (teto 2.500; eram 1.728). São oito
  famílias por variante, contra seis: os lotes do kit no escritório foram de 43
  para 53; no ponto de leitura, de 48 para 58 draws e de 33.644 para 36.038
  triângulos; os programas não mudaram (29).
- **Livros-caixa** (o resto do §5 do mapa dos livros): o miolo de cada volume virou
  três cadernos fora de esquadro (36 triângulos em vez de 108), com cantoneiras de
  latão nas quinas da capa de cima e etiqueta de papel na capa do volume de cima.
  A receita foi de 1.920 para 1.674 triângulos.
- **Testes**:
  - `npm run test:bookshelf` (20). O assado bate com o gerador e cabe no orçamento,
    e a parede lê A, B, A. Em cada variante, tudo fica dentro da estante e 1 cm
    abaixo da prateleira de cima, apoiado na prateleira ou no que está embaixo
    (±0,5 mm), sem interpenetração (SAT no contorno frontal). Os inclinados
    encostam no apoio entre 4,6° e 17°; 85% ou mais das lombadas vizinhas ficam a
    0,6–3 mm, e o resto são vãos deliberados de 1 cm ou mais. As alturas caem de
    fileira em fileira, cada família tem entre 12% e 45% dos livros e vizinhos não
    dividem couro. As duas variantes diferem em todas as fileiras, e as regras
    reprovam o livro girado no centro e a cerca de 13 mm;
  - `test:desk-top` (7) ganhou as cantoneiras e os cadernos;
  - `test:kit-runtime` (26) trava o escritório em 53 lotes e 36 mil triângulos;
  - o bake reprova chave de material sem entrada em `MATERIAL_TEXTURES`.
- **Fica para depois**:
  - a 1,4 m, o centro do facho ainda leva o pano vermelho a salmão e o bezerro a
    creme (é a intensidade da lanterna, não o material);
  - o atlas de lombadas com texto (P9/P10 do mapa) segue bloqueado pela VRAM e pela
    regra de que palavras são dado de runtime;
  - não foi feito o agrupamento de lotes por geometria em `kitPart.ts`, que
    juntaria as duas carcaças num draw.

### 9.5 Balanço da rodada (`4bd4f09..`, 2026-10-02)

Commits `17113fa` (fluxo da abertura, §9.1), `e6010b4` (rádio, §9.2), `a9ab7b7`
(tecidos e mesa, §9.3), `e7a208f` (estantes, §9.4), `6b39e91` (revisão, §9.6) e o
da revisão antes do push (§9.7).

| | antes | depois |
|---|---|---|
| GLBs | 2.801 KB | 2.946 KB |
| triângulos assados | 146.376 | 151.976 |
| kit | 2.045 KB, 99.664 triângulos, 182 nós | 2.189 KB, 105.264 triângulos, 195 nós |
| VRAM de textura | 45,000 MiB (folga zero) | 43,875 MiB |
| ponto de leitura (medido desde o início de §9.3) | 47 draws, 31.032 triângulos | 58 draws, 36.038 triângulos |

Suítes novas: `test:opening-flow` (38), `test:radio` (22), `test:materials` (8),
`test:desk-top` (7) e `test:bookshelf` (20); `test:kit` chegou a 339 checagens.

### 9.6 Correções da revisão (2026-10-02)

- **Saves antigos**: um save sem a lista `hintsShown` que já tem o caderno (de
  `4bd4f09`, ou porque a migração o concedeu) volta com `journal-taken` marcado
  (`PRE_OPENING_SAVE.journalHintId`, o mesmo id que o toast lê). O primeiro
  Continuar não anuncia mais "Você pegou o caderno".
- **Rádio segurado**: quando o modal fecha ou a aba volta, `releaseHeldRadio`
  descarta a fala cuja condição caducou (`transmissionLapsed`: o `when` da
  chamada, ou o `validWhile` da dica, que agora viaja com a resposta). A chamada
  conta como ouvida e a dica não grava nada. O lembrete do caderno não se repete
  para quem acabou de pegá-lo.
- **Aba oculta**: segura a fala como um modal (`radioHeld`, `useDocumentHidden`) e
  o diretor espera a aba voltar (`radioDeliveryStep`). A primeira chamada não se
  perde mais numa aba em segundo plano.
- **Testes de comportamento** no lugar das buscas por texto: entrega do diretor,
  varredura de alvos (`aimableDeviceId`, `hiddenInScene`), o fone escondido
  (`placeHandset`) e o fim do "desligou" (`hangUpStarted`, `hangUpDelayMs`).
- **Áudio no HMR**: o módulo descarta a instância antiga e recarrega a página.
- **Cadeira do curador**: a placa recua 12 mm atrás do capitonê, e uma faixa de couro
  na borda fecha o degrau. Os oito botões e os furos ficam à frente da placa
  (`test:desk-top`). O couro verde ficou mais claro, mais fosco
  (`roughnessScale` 1,3) e com um verniz mais fraco, e o veludo ficou com menos
  vermelho. `test:materials` agora soma o lóbulo especular no pico da luminária, e
  o encosto medido no ponto de leitura dá G/R linear 2,7 (antes, 0,99).
- **Lanterna**: decaimento 1,4 e intensidade 7,8. A 4 m ilumina como antes; a
  1 m, recebe menos da metade. `examineScale` passou a 0,4, o que mantém a luz da
  peça examinada. O facho a 1 m já não deixa o pano vermelho salmão (medido:
  183,76,86, saturação de 58%). `test:materials` passa o facho pelo ACES.
  Resolve o primeiro item de "Fica para depois" de §9.4.
- **Mata-borrão**: as cantoneiras viraram latão, dobradas sobre a borda. Couro
  de outra cor custaria um draw a mais, e o escritório está no teto de 53. As
  folhas soltas ficaram fora de esquadro. **Resíduo**: branco sobre branco, as
  folhas ainda quase não se distinguem do bloco. Um papel de outra cor custaria
  o mesmo draw.
- **Textos**: em inglês, o Jorge é "front desk", então a piada da recepção virou
  "I'm the night porter, not customer service". A Helena agora é apresentada como
  diretora nas falas do caderno, e foram corrigidos "(singing softly)" e "Just not
  every five minutes".
- Capturas: `docs/contact-sheets/office-review-reading-lit.jpg`,
  `office-review-shelves-torch-1m.jpg` e `office-review-spawn-torch.jpg`.

### 9.7 Revisão antes do push (2026-10-03)

- **Um E, uma ação.** Cada sistema ouve o E no `window`, e todos rodam no mesmo
  evento relendo o store que o anterior acabou de mudar: um E na luminária, com o
  rádio sem carga na mesma mira, acendia a sala e em seguida deixava o rádio, agora
  com carga, pegar a mesma tecla. Todo handler de E passa por
  `isUnclaimedInteractKey` (`primaryAction.ts`): quem age chama `preventDefault`,
  os outros desistem — o que o `triggerPrimaryAction` já garantia no toque.
- **Aba velha não sobrescreve o save.** O flush em todo `visibilitychange` gravava
  o retrato da memória mesmo sem mudança; uma aba parada desde o título apagava o
  que outra aba tinha jogado. `writePersisted` só grava quando o retrato difere do
  último que esta aba gravou (ou carregou).
- **Rádio na mesa só fala na própria sala.** Uma chamada de conteúdo espera
  (`radioWithinEarshot`) enquanto o jogador está longe de um rádio que ficou no
  carregador; na mão, ele é ouvido em qualquer sala.

---

## 10. L1 — Correções no ar (2026-10-04)

O primeiro lote do plano (`docs/PLANO-ATE-O-FINAL.md`, L1), executado pelo plano de lote
`docs/lotes/L1-plano.md`. Saiu em dois commits locais na `main`: `ab6625e` (conteúdo: texto
histórico, nome, falas do Jorge, validadores de M0 e a tabela de dívidas) e o seguinte
(geometria e motor: os dois quadros de energia, a vitrine corrida, a porta que não fica presa,
navegação e catracas).

**Estado: implementado e conferido no navegador de desenvolvimento; não publicado.** Dos passos
de §9.1 do plano estão feitos o 1 (plano do lote), o 2 (teste primeiro), o 3, o 4 (portão verde),
o 6 (rota do lote, com as ressalvas de 10.8) e o 12 (este registro). **Faltam** o 5 (revisão
adversarial), o 8 (revisor), o 9 e o 10 (push e deploy), o 11 (fumaça em produção) e o 13
(playtest). A produção continua na versão Cloudflare `0027afaa`, de 3 de outubro.

### 10.1 O que mudou para o jogador

- **Quadro da Holyoke na parede oposta à entrada.** `position: [-5.875, 1.15, 2.2]`,
  `rotationY: Math.PI / 2`: da porta, a lente fica 20,8° à esquerda do eixo de quem entra, no vão
  entre a vitrine-herói e o mural, e o quadro encosta no reboco, acima do roda-meio. Antes ficava
  na parede da própria porta, a 103° do eixo, e não mudava um pixel do primeiro quadro.
- **O quadro não some mais quando o jogador encosta nele.** Os dois quadros têm colisor (a
  receita inteira, alavanca incluída): a cápsula para a 0,55 m do plano da parede, com o olho
  25 cm fora do volume de interação. Antes parava a 8 cm, com o olho dentro dele, e o aviso
  «Restaurar energia» sumia nos últimos 21 cm.
- **A lente do quadro acende.** Vermelha (`led-red`) com a sala sem energia, verde (`led-green`)
  depois de religada: são os dois materiais do leitor da porta do escritório. A alavanca que
  desce, o estalo e o piloto de alcance curto são de L10.
- **As quatro peças da vitrine corrida estão nos vãos.** O retrato do Morgan e o panorama pendem
  no forro de um vão sem prateleira de cima; o guia de 1916 e o manual de 1897 apoiam no topo
  real da prateleira de baixo. A legenda do retrato (quatro linhas) aparece inteira.
- **A porta do escritório abre mesmo que uma imagem do saguão não chegue**, depois de 30 s de
  jogo, sem a arte de parede. E uma imagem que falha vira um cartão cinza em vez de derrubar a
  página.
- O texto (nome, falas, etiquetas, fichas, documentos) é o do commit `ab6625e`: `1896` só na
  plaqueta do retrato e no título «Springfield, 1896»; «Museu do Voleibol» em tudo; o Jorge sem
  pontos cardeais e sem mandar a medalhas e cofre; as doze etiquetas em até 40 palavras.

### 10.2 Como ficou no código

- **`breaker-panel`** (`scripts/bake/parts/fixtures.mjs`): as mesmas geometrias, com os nomes que
  o runtime endereça: `breaker-panel` (carcaça), `__lever` (aro, eixo, alavanca e punho num nó
  só; o aro e o eixo são cilindros no eixo do pivô, então L10 gira o nó inteiro em torno de
  `anchors.leverPivot`) e `__led`. Continuam três nós e 892 triângulos: o kit do átrio segue em
  56 de 56 lotes e a exceção de ÁT-K1 **não foi gasta**. O colisor é a união das três famílias
  (`scripts/bake.mjs`).
- **`history-case-run`** (`scripts/bake/parts/holyokeDecor.mjs`): o que cada vão hospeda é dado
  (`HISTORY_CASE_BAYS`: quadro, quadro, livro, livro, nada, pelo índice do gerador; o vão 0 fica
  em x = +4,08 da sala). O vão de quadro perde a prateleira e a régua de cima; saíram a camisa,
  a túnica, os dois documentos em cavalete e a bola de couro do centro (2.308 → 1.984
  triângulos). A função devolve `layout`: montantes, prateleiras (topo, base, fundo, frente),
  réguas, mesas de leitura e cada peça do recheio como caixa, escritos das mesmas variáveis que
  geram a geometria.
- **Proxies de interação** (`src/engine/interactionProxy.ts`): a conta do volume acolchoado e o
  material (`side: DoubleSide`) saíram de três componentes para um módulo. A regra: nenhum alvo
  contém o ponto mais próximo que a cápsula alcança (isso é trabalho do colisor); a dupla face é
  a rede de segurança.
- **`PowerControls.tsx`**: registra o colisor do controle (`registerKitColliders`), pinta a
  lente pelo estado da sala (`paintLenses`, em `deviceNodes.ts`; `powerControlLensMaterial`, em
  `power.ts`). Controle sem colisor ou sem lente (a luminária) não muda.
- **Espera da sala** (`src/engine/roomReadiness.ts`): `advanceRoomDetailWait` conta tempo de
  jogo enquanto a sala está montada e incompleta, em passos de no máximo 0,1 s; aos 30 s a sala
  fica `degraded`, aquece com o que tem e a porta abre pelo caminho de sempre. O que chega depois
  aparece sem aquecimento e não reabre a descoberta. Em desenvolvimento o console diz o que
  faltou («Room "atrium" opens without its wall art»).
- **`MediaTextureLoader`** (`src/engine/mediaTexture.ts`): o carregador da arte de parede e das
  fotografias (`RoomWallArt`, `FramedMedia`, `preloadTexture`: a mesma classe nos três, senão o
  cache do `useLoader` se parte). Falha de imagem resolve numa textura cinza de 1 × 1 com
  `userData.mediaMissing`, com um aviso por URL. As texturas de material continuam no
  `TextureLoader` comum: sem elas não há jogo.
- **`framedMediaLayout.ts`**: as medidas do cartão e da legenda de um quadro, que eram
  constantes de `FramedMedia.tsx`, agora compartilhadas com o teste da vitrine.
- **Validadores novos** (`validate.ts`): `wall-fixture-off-the-wall` (controle de energia a até
  35 cm de uma parede e a mais de 6 mm do reboco), `power-control-without-state` (sem `__led` e
  sem luz prática) e `power-control-node-missing` (lente sem `__lever`).
- **Bibliotecas de teste**: `scripts/lib/museumWorld.ts` (o mundo de colisão com casca, kit,
  containers **e controles de energia**; a porta de chegada de cada sala; o jogador que anda
  contra um quadro), `scripts/lib/sightline.ts` (linhas de visada contra a caixa de tudo o que
  está na sala; tamanho em pixels), `scripts/lib/ratchets.ts` e `scripts/lib/bundlePaths.mjs`.

### 10.3 Medições

Bake: **2.938 KB** de GLBs, **151.652 triângulos** (eram 2.946 KB e 151.976). Kit
`public/models/kit.6f5f4950.glb`: 2.234.252 bytes (2.182 KiB), 104.940 triângulos, 195 nós. As
três cascas e os dois GLBs de peças não mudaram de hash; nenhuma textura mudou (43,875 MiB).
Kit instanciado por sala: átrio 56 lotes e 46.272 triângulos, Holyoke 28 e 16.544 (eram 16.868),
escritório 53 e 34.230.

Pontos de referência, medidos como a linha de base (`docs/lotes/P0-linha-de-base.md`, seção 0):
reload limpo, 1280 × 720 a DPR 1,2, qualidade `medium`, três salas acesas, duas passadas com o
mesmo resultado.

| Ponto | Linha de base | Depois de L1 | Previsto no plano do lote |
|---|---|---|---|
| R01 escritório, leitura | 58 · 36.086 | 58 · 36.086 | sem mudança |
| R02 escritório, spawn | 66 · 37.906 | 66 · 37.906 | sem mudança |
| R03 átrio, da porta do escritório | 80 · 63.940 | 80 · 63.940 | sem mudança |
| R04 átrio, diagonal sudeste | 101 · 77.324 | 101 · 77.334 | sem mudança |
| R05 átrio, do canto noroeste | 85 · 67.810 | 85 · 67.820 | sem mudança |
| R06 átrio, da porta da Holyoke | 79 · 70.764 | 79 · 70.774 | sem mudança |
| R07 Holyoke, da porta | 36 · 37.108 | **39 · 37.676** | 39 · 37.676 |
| R08 Holyoke, da porta para sudoeste | 67 · 51.468 | **70 · 52.036** | 70 · 52.036 |
| R09 Holyoke, do canto noroeste | 83 · 63.050 | **81 · 62.374** | 80 a 83 |
| R10 par com a porta aberta | 128 · 101.310 | **125 · 100.428** | 125 · 100.418 |

(draws · triângulos.) Os dez triângulos a mais em R04, R05, R06 e R10 são os cinco glifos de
«O JOGO» na sobrelinha da dedicatória, do commit de texto. As subidas de R07 e R08 são o quadro
entrando no quadro de quem está na porta: é o que o lote pedia. **Programas: 35**, com os mesmos
nomes da linha de base; geometrias 267 e texturas 53 com as três salas residentes. Console sem
erro; o único aviso é o `THREE.Clock`, que já existia.

Bundle, pela medida do portão novo (gzip nível 9, arquivo a arquivo): documento 63,24 kB, tela de
título 28,29 kB, jogo 388,18 kB; **91,52 kB antes do clique** (orçamento 250) e **479,70 kB** no
total (orçamento 600). Não se compara com os 92,85 e 484,58 kB da linha de base, que eram a conta
que o Vite imprime. Textura residente: 107,08 MiB (112.284.380 bytes), sem mudança.

Teste de farol (`test:opening`): átrio 24,5° do eixo, quadro de 19 × 23 px, 21 de 21 visadas
livres; Holyoke 20,8°, 29 × 36 px, 21 de 21. Em z = 5,0 (a proposta original) o teste acusa a
vitrine-herói, e na parede da porta acusa o quadro atrás do jogador.

Capturas: `docs/contact-sheets/l1/` (17 quadros, conjunto `l1` em `CAPTURE_SETS`, ainda **não
congelado**: a revisão e a passada de toque podem acrescentar quadros; quem fecha o lote congela
com o digest). O antes de cada um está no conjunto de P0:

| Depois (L1) | Antes (P0) |
|---|---|
| `l1-e01-holyoke-entry-pilot-from-door-dark-notorch` | `p0-e01-holyoke-entry-pilot-out-of-view-dark-notorch` |
| `l1-h02-case-run-portrait-morgan-lit` | `p0-h01-case-run-portrait-morgan-lit` |
| `l1-h04-case-run-guide-1916-lit` | `p0-h02-case-run-guide-1916-lit` |
| `l1-h05-case-run-handbook-1897-lit` | `p0-h03-case-run-handbook-1897-lit` |
| `l1-h03-case-run-photo-gym-lit` | `p0-h04-case-run-photo-gym-lit` |
| `l1-h07-ref-holyoke-door-lit` | `p0-h06-ref-holyoke-door-lit` |
| `l1-h06-ref-pair-door-open-lit` | `p0-h09-ref-pair-door-open-lit` |
| `l1-a02-ref-atrium-from-office-door-lit` | `p0-a01-ref-atrium-from-office-door-lit` |

### 10.4 O portão

`npm run check` verde em 2026-10-04, agora com 27 passos (entraram `test:ratchets`, depois de
`validate:content`, e `test:bundle`, no fim, que roda `vite build` antes de medir):

- conteúdo: 3 salas válidas, 29 dívidas datadas impressas;
- catracas: 4/4; fontes: 28; documentação: 21/21; capturas: 9/9; saves: 19/19;
- energia: 28/28 (eram 16); abertura: 31/31 (eram 29); fluxo da abertura: 44/44; rádio: 27/27;
- colisão: 28/28; kit e posicionamento: 339/339, mais **vitrine corrida: 10/10** (novo,
  `scripts/test-case-run.ts`, encadeado em `test:kit`);
- materiais: 10; mesa do curador: 9; estantes: 20;
- runtime do kit: 26; runtime das salas: 19; LOD: 23;
- aquecimento de GPU: verde, mais **prontidão da sala: 5/5** (novo, no mesmo arquivo);
- render: 16/16; sinalização: 26; portas: 29/29; controles móveis: 13/13;
- navegação: 67/67 (eram 55); bundle: 5/5 (novo); `npm run build`: verde.

Vermelho primeiro (§9.1, passo 2), conferido rodando cada suíte nova contra o estado anterior:

- `test:power`: 6 de 26 reprovavam (a cápsula a 0,081 m da parede do quadro do átrio, sem acerto
  e com o olho dentro do volume; o raio de dentro do proxy; `__handle`, `__indicator` e
  `glass-green` no manifesto; o piloto da Holyoke a 0,82 m do átrio; o quadro da Holyoke a 15 mm
  do reboco);
- `test:opening`: farol (Holyoke a 106,3° e atrás do jogador; nenhuma lente), validadores novos e
  a tabela de dívidas (três acusações fora dela);
- `test:navigation`: 5 de 67 (nenhum controle de parede sólido; `E` não alcança o quadro do
  átrio no fim das duas rotas; a rota da Holyoke acaba diante de uma parede sem quadro);
- `test:kit` (vitrine corrida): com o `layout` exportado, o bake refeito e o conteúdo antigo, 5
  de 8 reprovavam nas quatro peças (910, 950, 890 e 430 mm fora do centro do vão; o manual 63,8 mm
  dentro da tábua; o retrato a 275 mm do forro);
- `test:gpu-warmup`: com a espera escrita como o jogo era (nunca degrada) e o carregador comum,
  5 de 5 (a porta simulada não abria em 40 s; o erro 404 subia).

Catraca nasce verde; a prova de que morde é por mutação, refeita neste lote: baixar o teto do
kit em um byte, somar uma imagem a `MUSEUM.media` (113,75 MiB), apagar a linha de dívida de
`programs`, deixar o registro do navegador dois lotes velho, importar `museum.ts` em
`MuseumApp.tsx` (98,11 kB antes do clique) e mover uma prateleira no gerador sem assar: as seis
reprovam, cada uma com a mensagem certa.

### 10.5 Testes que mudaram de sentido (plano, 6.5)

- `scripts/test-navigation.ts`: as âncoras (`ROOM_ANCHORS`) são pontos de reunião no piso livre,
  não pontos de partida. Toda rota do átrio (as seis de `ATRIUM_WALK_ROUTES` e a do balcão) sai
  de `arrivalPoint('atrium')`, 0,95 m para dentro da porta do escritório, e passa pelo ponto
  antigo. Rotas novas: porta do escritório → quadro em linha reta (a cápsula contorna o anel do
  plinto) e porta da Holyoke → quadro → atalho. O mundo do teste veio para
  `scripts/lib/museumWorld.ts` e ganhou os controles de energia.
- `scripts/test-power.ts`: «content has no invalid or missing power controls» passa a assentar
  as dívidas de `wall-fixture-off-the-wall` antes de exigir zero erros. O `check` da suíte deixou
  de parar na primeira falha.
- `scripts/test-opening.ts`: o `test()` deixou de parar na primeira falha (imprime `FAIL` e
  segue; o código de saída continua 1).
- `scripts/test-opening-flow.ts` (commit `ab6625e`): a checagem do código da gaveta exige o ano
  na plaqueta e em exatamente duas chaves por dicionário, e proíbe o ano na ficha; «the renaming
  is dated where history dates it» virou linhas da tabela de asserções por chave.
- `test:kit` agora são dois arquivos; `test:kit-runtime` não mudou (56 e 53 lotes).

### 10.6 Dívidas datadas (`src/content/knownDebt.ts`, 35 linhas)

O portão imprime as do conteúdo em toda execução e cobra a data; `CONTENT_LOT` é 1.

| Portão | Código | O quê | Fecha em |
|---|---|---|---|
| `validate:content` | `kit-part-unused` | 16 receitas sem uso (17.156 triângulos) | L5 |
| `validate:content` | `i18n-key-unused` | 12 chaves (planta L2; escada de dicas L4; ajustes L16; modo leitura L24) | L2 a L24 |
| `validate:content` | `wall-fixture-off-the-wall` | `atrium-breaker`, a 25,5 cm do reboco | L10 |
| `test:power` | `pilot-reaches-neighbour` | `atrium-breaker`: piloto de 2,4 m a 1,06 m da Holyoke | L10 |
| `test:ratchets` | `ratchet-over-budget` | `kit-glb` (2.182 KiB contra 800), `programs` (35 contra 25), `atrium-draws` (101 contra 100, teto temporário 102), `pair-draws` (125 contra 100) | L6 |
| `test:ratchets` | `ratchet-over-budget` | `resident-texture` (107,08 MiB contra 45) | L7 |

Fechadas por L1: AS-H1, CAP-1 e a parte de L1 de AS-H3; AS-H14 para o quadro da Holyoke; a metade
de posição de ÁT-B4. Sem código, só registradas (texto que outro lote conserta): o bilhete do
Otávio ainda fala em medalhas e cofre (L3); `doc-halstead` é `kind: 'letter'` sem ser carta
(L8); as fichas ainda dizem «Reprodução» e «Fac-símile» (L8); o detalhe `credit` do guia ainda
revela `filipino-spike` (L4).

### 10.7 Onde a execução se afastou do plano do lote

- **Uma quinta linha de catraca, `atrium-draws`.** O plano listava quatro e dizia que o teto de
  102 draws ficava só registrado em `ratchets.ts`. A regra do próprio T11 («toda catraca acima do
  orçamento de papel tem linha em `KNOWN_DEBT`») pede a linha: R04 mede 101 contra 100. O Anexo C
  do plano mestre já a listava.
- **O teto do par desceu para 125** (o medido), não ficou nos 128 da linha de base: catraca
  aperta quando a medida desce. O do `kit.glb` desceu para 2.234.252.
- **O teste de farol mede o quadro com as oito quinas da caixa**, não só a face: dá 19 × 23 px no
  átrio e 29 × 36 na Holyoke (o plano dizia 15 × 21 e 24 × 33). O limite de 6 px vale igual.
- **O jogador do teste de alcance mantém o quadro no centro da tela enquanto anda.** Com rumo
  fixo, quem chega alguns graus de lado escorrega pela face de uma caixa de 46 cm e sai pela
  outra borda em quatro segundos: é verdade para qualquer coisa pequena numa parede, e não é o
  que o teste pergunta. Vale em `test:power` e no fim das rotas de `test:navigation`.
- **Mais duas checagens em `test:kit`** além das sete do plano: os limites das famílias não
  distinguem uma prateleira de outra um centímetro acima, então o `layout` é conferido contra os
  vértices do próprio GLB (as oito quinas de cada montante, prateleira e régua estão no arquivo;
  nada assado dentro do vidro fica fora do `layout`). Por isso as mesas de leitura inclinadas,
  cuja borda de trás entra 5 cm sob o vidro, também estão no `layout`.
- **Mais uma checagem em `test:power`**: o volume de interação fica dentro do colisor acrescido
  do raio da cápsula (a regra de ÁT-A1 sem caminhada, para todas as direções).
- **Os tetos de bundle são três** (documento, título, jogo), arredondados para cima em 100
  bytes, além dos dois orçamentos do papel.
- `PLAYER_EYE_HEIGHT` saiu de `PlayerController.tsx` para `playerPosition.ts`, para os testes
  lançarem o raio do mesmo olho que o jogo.

### 10.8 O que o navegador mostrou, e o que não foi feito

Servidor `museum-dev` reiniciado depois da última edição; painel oculto, como em P0.

- **Piloto da Holyoke, da porta, no escuro, sem lanterna** (`l1-e01`): o quadro aceso de
  vermelho na parede do fundo, à esquerda de quem entra, entre a vitrine-herói e o mural.
- **Os dois quadros.** Andando reto com `W` a partir de 1,3 m, a cápsula para a 0,55 m do plano
  da parede e o aviso «E · Restaurar energia» fica na tela o caminho todo (lido do DOM a cada
  20 quadros); `E` religa e a lente passa a `led-green` (`l1-d02`, `l1-a01`, `l1-e03`, `l1-h01`).
- **Os quatro vãos, acesos** (`l1-h02` a `l1-h05`, e o conjunto em `l1-h08`): nenhuma peça
  cortada; a legenda do retrato em quatro linhas, acima da tábua.
- **A porta sem saída (P0 #8).** Com o pedido da imagem `atrium-mural-attack` engolido, a porta
  do escritório ficou em «Preparando a próxima sala…», o console avisou «Room "atrium" opens
  without its wall art: not ready after 30 s» e a porta passou a «Abrir porta» dez segundos
  depois (`l1-d03`: o saguão sem a arte de parede). Com o pedido desviado para um arquivo que não
  existe, a página não ficou em branco, o console avisou uma vez, o mural saiu em cinza (`l1-d04`)
  e a porta ficou pronta em seis segundos, com as 199 geometrias.
- **Toque e inglês**, só uma fumaça: em 844 × 390, em inglês, o título é «Volleyball Museum», os
  três controles de toque montam, o aviso diz «ACTION · Restore power · Atrium main breaker» e o
  botão **Action** religa o saguão.

**Não foi feito, e fica para quem fechar o lote:** a rota inteira em inglês; a rota inteira com
os botões de toque (andar e olhar pelos direcionais); a leitura das oito etiquetas e das fichas
na tela; o exame das quatro peças (a plaqueta do retrato ainda pede inclinar a moldura); as
falas do Jorge ouvidas no jogo (primeira chamada, dica curta da gaveta, última dica); a revisão
adversarial; o deploy e a fumaça em produção.

**Visto de passagem, sem conserto neste lote:** de perto e no escuro o piloto estoura o quadro e
lava a lente (`l1-e02`); com o alcance de hoje ele banha de vermelho a ponta sul do mural. Os
dois são de L10. Os vãos de quadro ficam com a prateleira de baixo vazia (L14).

### 10.9 Lições

- **Um colisor pequeno numa parede não segura quem chega de lado.** A resolução empurra a cápsula
  pela normal da face; com um rumo oblíquo ela desliza e sai pela borda. A garantia que vale para
  todas as direções é geométrica: o volume de interação cabe no colisor acrescido do raio da
  cápsula.
- **Limites não provam que o assado é o do gerador.** Uma prateleira movida um centímetro fica
  dentro da mesma caixa. Quem exporta `layout` confere as quinas contra os vértices do GLB.
- **A caixa inteira de uma receita é um obstáculo honesto para linha de visada**, e mais dura
  que as malhas: posição que passa por ela passa no navegador.
- **`side: DoubleSide` num proxy invisível não custa nada**, e é o que deixa o raio acertar um
  volume que contém a câmera. Mas o conserto de verdade é a câmera não entrar.
- **Uma falha de `useLoader` desmonta o jogo inteiro.** Carregador de coisa opcional (uma
  fotografia) nunca rejeita: resolve num substituto. Um GLB de peças que falha ainda derruba a
  página; a fronteira de erro por sala é de L6 (M13a).
- **Regra nova que acusa o conteúdo de hoje entra com a dívida datada no mesmo commit**, e o
  teste que chama o validador direto assenta a dívida antes de exigir zero erros.

Do harness, para quem repetir a rota:

- **`__museumStep(n)` anda quadros, não o relógio.** O `delta` do `useFrame` é o tempo real entre
  dois quadros, então 1.800 passos seguidos somam décimos de segundo, não 30 s. A espera de 30 s
  da sala conta esse `delta` (até 0,1 s por quadro): no painel oculto são 300 passos de um quadro
  com 101 ms de espera ocupada entre eles (`while (performance.now() < fim) {}`); `setTimeout`
  não serve, porque o navegador o estrangula na aba oculta.
- **O HUD é React: leia o DOM depois de ceder a vez** (`await` de um temporizador). Lido na mesma
  tarefa do `__museumStep`, o aviso ainda não foi desenhado e parece que sumiu.
- **O store está ao alcance da página**: `(await import('/src/state/store.ts')).useMuseum` é a
  mesma instância do jogo. Serve para acender as três salas como a linha de base fez.
- **Teclas**: `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))` seguido de
  `__museumStep` anda o controlador de verdade, sem ponteiro travado. O botão de toque responde a
  `PointerEvent` com `pointerType: 'touch'`.
- **A primeira leitura depois de um teleporte vindo de outra sala pode trazer um draw a mais**
  (59 em R01, depois 58). Meça duas passadas.

### 10.10 Próximos passos

1. Fechar L1: revisão adversarial (passo 5), o resto da rota de 10.8, revisor, push, deploy e
   fumaça; congelar o conjunto `l1` de capturas; anotar a versão Cloudflare aqui.
2. L2 (Trilhos). Ele paga `map.legend` (`i18n-key-unused`) e move `CONTENT_LOT` para 2 no commit
   que a pagar. Texto novo na tela de título mexe no teto de `title` do bundle, que tem 14 bytes
   de folga: sobe no mesmo commit, com o motivo em `scripts/lib/ratchets.ts`.
3. Um lote que mudar o que uma sala desenha mede de novo os dez pontos e troca `BROWSER_RECORD`
   (`scripts/lib/ratchets.ts`): o portão reprova um registro com mais de um lote de idade.
