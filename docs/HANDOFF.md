# Handoff — Museu do Voleibol

Atualizado em 2026-10-05 (L2, o segundo lote do plano, §11, com a revisão adversarial dele em
§11.12; L1 é §10; a abertura no escritório é §9); o estado técnico das salas é o de 2026-08-12.
Este documento é o ponto de entrada para retomar o projeto sem depender da conversa anterior.
**Próxima tarefa:** publicar L2 (§11.11, item 1) e começar L3.

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

Portão verde em 2026-10-05 (`npm run check`, 33 passos, depois de L2 e da revisão dele, §11; a
lista completa das suítes e o que cada uma ganhou está em §11.4, e a de L1 em §10.4):

- conteúdo: 3 salas válidas, com 38 dívidas datadas impressas (`knownDebt.ts`), o roteiro em
  níveis e a comparação com o instantâneo do grafo (`docs/releases/L2.graph.json`);
- lint de texto: 21/21; catracas: 4/4; fontes: 28; documentação: 25/25;
- capturas: 15/15; saves do corpus: 27/27; save: 39/39;
- energia: 30/30;
- abertura: 33/33; fluxo da abertura: 44/44; rádio: 27/27;
- gatilhos: 30/30; trancas: 15/15; planta: 17/17;
- colisão: 28/28;
- kit e posicionamento: 339/339; vitrine corrida: 12/12;
- materiais: 10; mesa do curador: 9; estantes: 20;
- runtime do kit: 26/26;
- runtime das salas: 19/19;
- LOD de salas: 23/23;
- aquecimento de GPU: verde; prontidão da sala: 6/6;
- performance de render e projeção: 16/16;
- sinalização arquitetônica: 26/26;
- portas de transição: 38/38;
- controles móveis e modo imersivo: 14/14;
- navegação: 108/108; partida (o robô e a simulação): 34/34;
- bundle por caminho: 5/5;
- `npm run build`: verde.

O único aviso é o preexistente `react(only-export-components)` em `src/main.tsx:17`.
Deploy de produção: `https://volleyball-museum.renanbuiatti14.workers.dev`, versão
Cloudflare `1d3a4554-c21a-457a-9bf3-7d5bfc594ae4` (2026-10-04: P0 e L1 do plano, até
`f0fb5a3`; §10). A anterior era `0027afaa` (2026-10-03, a rodada de §9). **L2 está fechado,
revisado e ainda não publicado** (commits locais até o da revisão; §11): o que está no ar é L1.

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

`npm run test:playthrough -- --seed <n>` imprime a noite `n` das quinhentas, aperto a aperto, e
depois joga as quinhentas (§11.12). `npm run graph:snapshot` grava o instantâneo do grafo do
lote em que o conteúdo está e recusa o de um lote que o plano já dá como feito; `-- --reopen`
regrava (e aí o digest de `scripts/lib/graphSnapshots.ts` muda no mesmo commit), `-- --dry-run`
só diz o que faria.

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

**L1 (Correções no ar), estado em 2026-10-04:** implementado em três commits locais (o terceiro
é a revisão adversarial, §10.11) e conferido no navegador de desenvolvimento; falta o revisor,
push, deploy e fumaça, e o que sobrou do passo 12 (§10.10). Tudo em §10.

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
- **O HUD não sai no `/__capture`.** A captura de tela do painel sai, a 800 × 450. Para um
  quadro com a planta, o prompt ou um aviso no tamanho do conjunto, componha o canvas com a
  camada do DOM e mande o resultado ao mesmo endpoint (§11.10 diz como; os conjuntos `l2` e
  `l2-touch` foram feitos assim).

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
`docs/lotes/L1-plano.md`. Saiu em três commits locais na `main`: `ab6625e` (conteúdo: texto
histórico, nome, falas do Jorge, validadores de M0 e a tabela de dívidas), `047f3bb` (geometria
e motor: os dois quadros de energia, a vitrine corrida, a porta que não fica presa, navegação e
catracas) e o da revisão adversarial, que fecha ou data os 27 achados dela (10.11).

**Estado: publicado em 2026-10-04**, até `f0fb5a3`, versão Cloudflare `1d3a4554`. Dos passos de
§9.1 do plano estão feitos o 1 (plano do lote), o 2 (teste primeiro), o 3, o 4 (portão verde), o
5 (revisão adversarial: 10.11), o 6 (rota do lote, com as ressalvas de 10.8), o 8 (revisor: nada
bloqueante; a folga dos tetos de bundle subiu para cerca de meio por cento), o 9 e o 10 (push e
deploy) e o 11 (fumaça em produção: título com o nome novo, nenhum código de desenvolvimento no
bundle, cena montada, console limpo). O 12 ficou feito **em parte** por L1 (este registro e os
manifestos de capturas) e foi completado pela primeira fatia de L2: o corpus tem o save de L1 e
os dois conjuntos de capturas estão congelados (10.10; §11.7). **Falta** o 13 (playtest) e a
medição em aparelho real (P0, item 6, do dono).

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
  pontos cardeais e sem mandar a medalhas e cofre; as doze etiquetas em até 40 palavras. A
  revisão corrigiu oito chaves dele em cada língua (10.11): a última dica dá a luz como feita, a
  dica curta da gaveta diz o gesto («Pega a moldura e inclina»), a etiqueta do guia e a do traje
  dizem só o que têm fonte, «cavalo de salto», «a convite de», «canais amarelados».
- **O crédito sob os dois quadros da vitrine corrida lê-se.** É desenhado em creme sobre o forro
  azul (era um cinza que sumia quando o foco acendia o vão): o do panorama, que não se lia em
  nenhuma das duas línguas, lê-se com o vão aceso, apagado e no escuro.

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
  constantes de `FramedMedia.tsx`, agora compartilhadas com o teste da vitrine. Desde a revisão,
  também a cor do crédito por suporte (`CREDIT_COLOUR`: cinza sobre reboco, creme sobre o forro
  da vitrine), que a cena passa ao quadro. O crédito não recebe luz: sai na tela com um brilho
  só, e a cor tem de valer contra o forro aceso e contra o preto.
- **`runtimePlacedParts.ts`** (revisão): as receitas que o runtime coloca sem linha de conteúdo
  (o suporte sob uma peça montada, as folhas de uma porta) numa tabela só, lida pela cena, pelas
  portas, pelo validador (`kit-part-unused`, `exhibit-not-on-mount`) e pela suíte de navegação.
  Eram quatro cópias com um comentário pedindo que se acompanhassem.
- **Validadores novos** (`validate.ts`): `wall-fixture-off-the-wall` (controle de energia a até
  35 cm de uma parede e a mais de 6 mm do reboco), `power-control-without-state` (sem `__led` e
  sem luz prática) e `power-control-node-missing` (lente sem `__lever`).
- **Bibliotecas de teste**: `scripts/lib/museumWorld.ts` (o mundo de colisão com casca, kit,
  containers **e controles de energia**; a porta de chegada de cada sala; o jogador que anda
  contra um quadro), `scripts/lib/sightline.ts` (linhas de visada contra a caixa de tudo o que
  está na sala; tamanho em pixels), `scripts/lib/ratchets.ts` e `scripts/lib/bundlePaths.mjs`.
  Da revisão: `scripts/lib/runtimeWiring.ts` (as chamadas que os componentes têm de fazer aos
  módulos puros, conferidas na fonte sem comentários nem espaços) e `scripts/lib/creditWrap.ts`
  (a quebra de linha do crédito medida com a fonte do jogo: lê `head`, `hhea`, `hmtx` e `cmap`
  do WOFF, sem dependência nova).
- **Scripts de medição** (`scripts/audit`): `geo.mjs` lê a marcenaria e o recheio da vitrine
  corrida do `layout` do gerador, não de listas digitadas; `atrium-walk.mjs` e
  `breaker-ray.mjs` usam o mundo e o volume de `museumWorld.ts`; `geo2.mjs` segue sem o
  `dist/`. `test:docs` roda os dezesseis a cada portão e exige que terminem bem.

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
que o Vite imprime. Textura residente: 107,08 MiB (112.284.380 bytes), sem mudança. **Depois da
revisão:** documento 63.235 bytes, título 28.353 (+67: os textos corrigidos são mais longos) e
jogo 388.248 (+72: a cor do crédito por suporte e a tabela de `runtimePlacedParts.ts`), ou seja
91,59 kB antes do clique e 479,84 kB no total; os tetos de `title` e `game` subiram 100 bytes
cada, com o motivo escrito em `scripts/lib/ratchets.ts`. A revisão não mudou o que nenhuma sala
desenha (nenhuma geometria, nenhum material, nenhum programa): os dez pontos de referência não
foram medidos de novo e o `BROWSER_RECORD` é o de `047f3bb`.

Teste de farol (`test:opening`): átrio 24,5° do eixo, quadro de 19 × 23 px, 21 de 21 visadas
livres; Holyoke 20,8°, 29 × 36 px, 21 de 21. Em z = 5,0 (a proposta original) o teste acusa a
vitrine-herói, e na parede da porta acusa o quadro atrás do jogador.

Capturas: `docs/contact-sheets/l1/` (17 quadros, conjunto `l1` em `CAPTURE_SETS`, ainda **não
congelado**: a passada de toque pode acrescentar quadros; quem fecha o lote congela com o
digest). O manifesto nomeia `047f3bb`, o commit cuja árvore os quadros mostram; nomeava
`ab6625e`, onde o quadro da Holyoke ainda está na parede da porta. Os quatro quadros da revisão
(o crédito em creme: aceso, no vão apagado, e a três metros no escuro, sem e com lanterna) estão
em `docs/contact-sheets/l1-review/`, conjunto próprio porque foram tirados sobre outra árvore; o
campo `commit` dele é `047f3bb+` («a árvore de trabalho sobre 047f3bb», que o commit da revisão
grava), e quem congelar troca pelo hash. O antes de cada um está no conjunto de P0:

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
- catracas: 4/4; fontes: 28; documentação: 23/23 (eram 21; a revisão somou os scripts de medição
  rodando e `CONTENT_LOT` preso ao plano); capturas: 12/12 (eram 9); saves: 19/19;
- energia: 30/30 (eram 16 antes do lote, 28 antes da revisão); abertura: 31/31 (eram 29); fluxo
  da abertura: 44/44; rádio: 27/27;
- colisão: 28/28; kit e posicionamento: 339/339, mais **vitrine corrida: 12/12** (novo,
  `scripts/test-case-run.ts`, encadeado em `test:kit`; 10 antes da revisão);
- materiais: 10; mesa do curador: 9; estantes: 20;
- runtime do kit: 26; runtime das salas: 19; LOD: 23;
- aquecimento de GPU: verde, mais **prontidão da sala: 6/6** (novo, no mesmo arquivo; 5 antes
  da revisão);
- render: 16/16; sinalização: 26; portas: 29/29; controles móveis: 13/13;
- navegação: 68/68 (eram 55; 67 antes da revisão), com a dívida do farol da Holyoke impressa;
  bundle: 5/5 (novo); `npm run build`: verde.

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

Da revisão:

- `scripts/test-opening.ts`: «what the runtime places by itself is what the validator counts as
  used» era um `includes` sobre quatro linhas de fonte; passa a ser o comportamento do validador
  (uma peça posta sobre plinto, mesa ou torre tira as receitas da lista de `kit-part-unused`; sem
  porta declarada, as folhas entram nela).
- `scripts/test-opening-flow.ts`: a regra do traje deixou de **exigir** «1901–1915» e passou a
  proibir «1901»; entraram as regras da etiqueta do guia, do cavalo, do convite de Gulick, das
  três chaves sem «costura», da última dica (a luz como feita) e da dica curta da gaveta (o
  gesto, não a plaqueta), e uma sobre o comentário do gerador da rede.
- `scripts/test-case-run.ts`: a legenda dos quadros deixou de ser medida com «quatro linhas»
  digitado; as linhas saem do texto que o runtime formata e da fonte que ele embarca, nas duas
  línguas. A primeira asserção nova prende a medida à quebra que o navegador desenhou
  (`l1-h02`): se o crédito mudar, olha-se o quadro de novo e reescrevem-se as quatro linhas ali.
- `scripts/test-docs.ts`: além de conferir que os scripts de `scripts/audit` têm entrada e
  cabeçalho, **roda cada um** (cerca de 8 s) e exige saída 0. Eles continuam fora do portão no
  sentido que importava: o portão nunca lê o que imprimem.
- `scripts/test-navigation.ts`: a suíte ganhou a caminhada do farol (da porta, reto para o
  quadro, sem pontos escolhidos) e passou a assentar dívidas de `KNOWN_DEBT` (o portão
  `test:navigation`).

### 10.6 Dívidas datadas (`src/content/knownDebt.ts`, 36 linhas)

O portão imprime as do conteúdo em toda execução e cobra a data; `CONTENT_LOT` é 1.

| Portão | Código | O quê | Fecha em |
|---|---|---|---|
| `validate:content` | `kit-part-unused` | 16 receitas sem uso (17.156 triângulos) | L5 |
| `validate:content` | `i18n-key-unused` | 12 chaves (planta L2; escada de dicas L4; ajustes L16; modo leitura L24) | L2 a L24 |
| `validate:content` | `wall-fixture-off-the-wall` | `atrium-breaker`, a 25,5 cm do reboco | L10 |
| `test:power` | `pilot-reaches-neighbour` | `atrium-breaker`: piloto de 2,4 m a 1,06 m da Holyoke | L10 |
| `test:navigation` | `lighthouse-walk-blocked` | `holyoke-breaker`: quem anda reto da porta para o piloto para no quiosque, 7,6 m antes (revisão) | L14 |
| `test:ratchets` | `ratchet-over-budget` | `kit-glb` (2.182 KiB contra 800), `programs` (35 contra 25), `atrium-draws` (101 contra 100, teto temporário 102), `pair-draws` (125 contra 100) | L6 |
| `test:ratchets` | `ratchet-over-budget` | `resident-texture` (107,08 MiB contra 45) | L7 |

Fechadas por L1: AS-H1, CAP-1 e a parte de L1 de AS-H3; AS-H14 para o quadro da Holyoke; a metade
de posição de ÁT-B4. Sem código, só registradas (texto que outro lote conserta): o bilhete do
Otávio ainda fala em medalhas e cofre (L3); `doc-halstead` é `kind: 'letter'` sem ser carta
(L8); as fichas ainda dizem «Reprodução» e «Fac-símile» (L8); o detalhe `credit` do guia ainda
revela `filipino-spike` (L4). Da revisão: o título do guia («Morgan conta a história») repousa
num publicador só e espera o dono antes de L8 (plano, 7.7, item 21); a data do traje volta à
ficha com um catálogo capturado (7.7, item 20, L14); os focos da vitrine corrida não iluminam
três das quatro peças (H-24, L10; 10.8).

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
- **ÁT-H3 foi entregue em L1 só para os dois quadros.** A linha do plano mestre pede «alcance de
  cada interativo de onde a cápsula para»; o plano do lote estreitou para «cada ponto final
  diante de um quadro» sem registrar a redução. Peças, arquivos e dispositivos ficam com M15, em
  L2, que tem de conferir também o ponto mais próximo em que a cápsula para (olho fora do alvo e
  dentro do `INTERACTION_REACH` do sistema), não só a existência de um ponto de pé; `net-1897`,
  que se atravessa, entra como dívida datada com H-31 (L14) quando essa checagem chegar.
- **A rota provada até o quadro da Holyoke é um desvio escolhido** (`[0,-2.5]`, `[-4.9,-2.5]`,
  `[-4.9,2.2]`: pelo norte da sala e pela parede do fundo), não a reta que o farol convida a
  andar. A reta da chegada ao quadro passa a 4 cm do centro do `history-info-kiosk`, quase
  perpendicular à face comprida dele (2,48 m): a cápsula para ali, a 7,6 m do quadro. Não é
  beco, basta contornar. O conserto é geométrico e mexe na composição da primeira vista da
  sala: pela simulação, o quiosque teria de girar uns 20° (de 2,14 para 2,5 rad) ou sair 1,7 m
  da linha, e ele foi posto de frente para a porta de propósito. Ficou como dívida datada
  (`lighthouse-walk-blocked`, L14), provada em `test:navigation` pela caminhada do farol; a do
  átrio passa (o anel do plinto é redondo e a cápsula escorrega).

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
falas do Jorge ouvidas no jogo (primeira chamada, dica curta da gaveta, última dica); o deploy e
a fumaça em produção. Da revisão, no navegador (servidor reiniciado, painel oculto): o crédito
dos dois quadros nas quatro situações de `l1-review`; e, com `?qaSave=production-drawer-open`,
que uma chamada ao Jorge monta `radio.hint.vault` e que o servidor serve o texto novo dela. A
legenda não foi lida no HUD: com o painel oculto ela fica guardada.

**Visto de passagem, sem conserto neste lote:** de perto e no escuro o piloto estoura o quadro e
lava a lente (`l1-e02`); com o alcance de hoje ele banha de vermelho a ponta sul do mural. Os
dois são de L10. Os vãos de quadro ficam com a prateleira de baixo vazia (L14).

**Os focos da vitrine corrida** (revisão): das três luminárias sobre ela só duas acendem, em
x = −4 e x = +4 (`sampleEvenly` fica com cinco das sete da sala e descarta a do meio de cada
fila). Com as peças nos vãos, o manual de 1897 saiu do cone do foco oeste (19,8° do eixo →
34,1°; fator 0,65 → 0) e esse foco ilumina inteiro o vão −4,08, que não hospeda nada; guia e
retrato já estavam fora de qualquer cone. Só o panorama fica no facho (0,89). Não é «os quatro
vãos acesos»: é a lavagem da sala em três deles. Reapontar é H-24 (chaves K2 e K3 da tabela
4.7), de L10, com teste de iluminância por peça e aceite visual; em L1 só o comentário de
`museum.ts` foi corrigido. **Texto que não recebe luz** (crédito, placas) aparece no escuro com
o brilho de sempre (`l1r-e01`): é o modelo de hoje, das placas também, e é assunto do apagão
de verdade (L10).

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
- **Módulo puro provado não prova que o componente o chama.** A suíte montava o colisor do
  quadro no mundo dela e rodava uma cópia do que o `Room` faz com a espera: tirar a chamada do
  componente deixava tudo verde. Quando a regra só vive no JSX, prende-se a chamada na fonte
  (`runtimeWiring.ts`), e a própria checagem é provada aplicando a ela, em memória, o refactor
  que ela existe para pegar.
- **Ferramenta que ninguém roda apodrece no lote seguinte.** Dois dos dezesseis scripts de
  medição pararam num `TypeError` quando o gerador ganhou `anchors` e `layout`, e outros dois
  continuaram descrevendo o defeito já consertado, porque montavam um mundo próprio.
- **Conferir a rota por pontos escolhidos prova que se chega, não que se chega por onde o jogo
  convida.** Um farol pede a caminhada sem pontos: da porta, reto para a luz.
- **Texto sem luz tem um brilho só.** A cor dele tem de valer contra a superfície acesa e contra
  a mesma superfície apagada; um teste de contraste contra o albedo, sozinho, não diz nada.
- **Número de linhas de um texto de runtime não se digita num teste**: mede-se com a fonte
  embarcada, e prende-se a medida a um quadro que o navegador desenhou.

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

1. Fechar L1: o resto da rota de 10.8, revisor, push, deploy e fumaça; anotar a versão
   Cloudflare aqui. E o que falta do passo 12:
   - **corpus de saves**: depois do deploy, gravar em `src/content/saveFixtures.ts` um save
     escrito pelo build de L1 no fim da rota (`from` com o commit e a versão Cloudflare) e
     cobri-lo em `test:qa-save`, que já aceita entradas que não sejam `production-*`; ou
     registrar aqui que L1 não muda o que um save guarda (`src/state` não foi tocado desde
     `842750f`) e que L2 parte de `production-drawer-open`. Hoje o corpus tem só os cinco
     saves de produção, e o checklist final do plano conta «L1 a L24»;
   - **capturas**: congelar `l1` e `l1-review` com o digest, trocando o `047f3bb+` do segundo
     pelo hash do commit da revisão;
   - `npm run graph:snapshot` não existe ainda: o primeiro instantâneo é o de L2.

   **Os dois primeiros foram pagos pela primeira fatia de L2** (`docs/lotes/L2-plano.md`, §14):
   o corpus tem `l1-route-end`, tirado do navegador sobre a árvore publicada (`f0fb5a3`,
   Cloudflare `1d3a4554`) e coberto em `test:qa-save`; `l1` e `l1-review` estão congelados, o
   segundo em `513ec09`. A mesma fatia tirou o formato do save de `store.ts`
   (`src/state/progressFields.ts`, `saveMigrations.ts`; portão `test:save`) e moveu `CONTENT_LOT`
   para `src/content/contentLot.ts`. O registro completo de L2 é a seção 11.
2. L2 (Trilhos): **feito**, §11. Ele pagou `map.legend` e moveu `CONTENT_LOT` para 2; os
   próximos passos de agora estão em §11.11. O que este item dizia antes do lote:
   Ele paga `map.legend` (`i18n-key-unused`) e move `CONTENT_LOT` para 2 no commit
   que a pagar. Texto novo na tela de título mexe no teto de `title` do bundle, que tem cerca de
   meio por cento de folga (28.500 sobre 28.353 medidos): se passar, sobe no mesmo commit, com o
   motivo em `scripts/lib/ratchets.ts`.
3. Um lote que mudar o que uma sala desenha mede de novo os dez pontos e troca `BROWSER_RECORD`
   (`scripts/lib/ratchets.ts`): o portão reprova um registro com mais de um lote de idade. A
   idade conta a partir de `CONTENT_LOT`, que `test:docs` prende ao «Feito em» do plano: fechar
   um lote no plano sem mover a constante reprova. Os números de draws, triângulos e programas
   continuam sendo o último registro escrito, não uma medição do portão; o estimador é de L5.
4. Lote que mexer num gerador confere que `npm run test:docs` segue verde (ele roda os scripts
   de `scripts/audit`) e lê a saída dos que medem a receita tocada.

### 10.11 Revisão adversarial (passo 5 de §9.1), 2026-10-04

Cinco lentes (fluxo, fatos, bake, testes, visual), 27 achados, 19 distintos; cada um conferido
de forma independente antes de chegar aqui. Um «major», os demais «minor» ou acabamento. Tudo
num commit local, com `npm run check` e `npm run build` verdes.

| Achado | O que foi feito | Onde está provado |
|---|---|---|
| A metade de runtime de T1, T2 e T5 não tinha guarda: revertê-la deixava o portão verde (major) | as chamadas dos componentes presas na fonte: colisor do quadro, lente por estado, proxy de dupla face, a espera contada no `useFrame`, os três chamadores no carregador que não rejeita | `test:power` (2 checagens) e `test:gpu-warmup` (1), via `scripts/lib/runtimeWiring.ts`; contra a árvore de `842750f` acusa 17 problemas |
| `audit:geo` e `audit:geo2` quebravam; `audit:walk` e `audit:breaker-ray` relatavam o estado antigo | os quatro consertados (10.2) | `test:docs` roda os dezesseis |
| Catracas de navegador e dívidas dependiam de `CONTENT_LOT`, que nada ancorava | `CONTENT_LOT` preso ao maior lote com «Feito em» no plano (igual, ou um à frente); cabeçalho de `ratchets.ts` corrigido (`roomDraws` e `frameTriangles` ficam no teto duro, não no medido) | `test:docs` |
| Da porta da Holyoke, andar reto para o piloto para no quiosque (2 achados) | datado, não movido (10.7) | `test:navigation`, caminhada do farol; dívida `lighthouse-walk-blocked` até L14 |
| A dica curta da gaveta mandava a uma plaqueta que o modelo não tem | a fala diz o gesto, nas duas línguas | `test:opening-flow` |
| A última dica oferecia «luz» com as três salas já acesas (2 achados) | as quatro chaves dão a luz como feita | `test:opening-flow`, que também confere que a dica só toca com tudo aceso |
| Etiqueta do guia afirmava em placa um fato de um publicador | a etiqueta diz o que tem dois; o título fica para o dono (10.6) | `test:opening-flow` |
| Etiqueta e ficha do traje afirmavam o que nenhuma fonte diz | sem data; a etiqueta diz o que o museu não sabe | `test:opening-flow` |
| «Cavalo com alças» que a foto não mostra | «cavalo de salto» / “a vaulting horse” | `test:opening-flow` |
| «Convocada por Gulick» | «a convite de» | `test:opening-flow` |
| «Costuras amareladas» na ficha da bola de Tóquio | «canais amarelados» | `test:opening-flow` |
| Comentário de `kit.mjs` ainda dizia «half a foot» (3 achados) | corrigido | `test:opening-flow` |
| Inglês pouco idiomático em três strings | a ficha do traje e a última dica reescritas; a etiqueta do manual fica como está (ver abaixo) | `test:opening-flow` |
| O crédito do panorama era ilegível contra o forro aceso | creme sobre o forro, pela tabela `CREDIT_COLOUR` | `test:kit` (contraste ≥ 3:1 contra o forro a plena luz e contra o preto: o cinza dava 1,14:1); `l1r-h01` |
| A legenda dos quadros era medida com um número de linhas digitado (2 achados) | medida com a fonte do jogo | `test:kit` |
| Três das quatro peças da vitrine fora de qualquer foco (2 achados) | datado em 10.8; comentário corrigido | H-24, L10 |
| ÁT-H3 entregue pela metade | registrado (10.7) | M15, L2 |
| Passo 12 dado como feito sem o corpus de saves | o registro deixou de dizê-lo; o item está em 10.10 | — |
| O conjunto `l1` apontava para um commit em que os quadros não se reproduzem | `047f3bb`; convenção do `+` para conjunto aberto | `test:captures` |
| Teste novo provava a tabela do validador por grep | tabela única e teste de comportamento (10.5) | `test:opening` |

**O que não foi feito, e por quê.**

- **A etiqueta do manual em inglês** não foi trocada por “was the League's first”: muda a
  afirmação (o primeiro manual da Liga, e não o primeiro manual oficial) e a redação de hoje
  liga etiqueta, título e fato. A outra sugestão do mesmo achado (“the first to print the
  rules”) contradiz a ficha, que diz que as regras saíram um ano antes numa revista.
- **O quiosque não foi movido nem girado** e **os focos não foram reapontados**: as duas coisas
  mudam o que o jogador vê ao entrar na ala e pedem o aceite visual do dono, que L1 não tem.

**Vermelho primeiro.** Cada asserção nova reprovou o estado de `047f3bb` antes do conserto: 26
linhas de texto histórico e 12 de fala em `test:opening-flow`, mais a do comentário do gerador;
a caminhada do farol (`holyoke-breaker`: para em −14,52; −1,58, a 7,61 m do quadro); o
contraste do crédito (1,14:1); `audit:geo` e `audit:geo2` com saída 1; o conjunto `l1` nomeando
`ab6625e`; a cena e as portas sem ler a tabela compartilhada. Três nascem verdes, porque
guardam contra uma volta atrás, e são provadas por mutação dentro do próprio teste: as
chamadas dos componentes (cinco e quatro refactors aplicados em memória), `CONTENT_LOT` (planos
feitos para o teste) e a medida da legenda (um crédito mais longo quebra em mais linhas).

---

## 11. L2 — Trilhos (2026-10-05)

O segundo lote do plano (`docs/PLANO-ATE-O-FINAL.md`, L2), executado pelo plano de lote
`docs/lotes/L2-plano.md`, que guarda, fatia por fatia, o vermelho de cada teste, as mutações
aplicadas e o que saiu diferente do planejado (§14 dele). Saiu em commits locais na `main`:

| Commit | O que é |
|---|---|
| `78412ee` | o plano do lote |
| `1ecc2cb` | F1: o save que não se perde (tabela de campos, carimbo do lote, campos desconhecidos preservados) |
| `8a570b4` | F2: uma porta só para o progresso (condições v2, gatilhos de disparo único, `attemptLock`) |
| `6cb861b` | F3: o atalho que fica aberto e a planta sem spoiler; `CONTENT_LOT` passa a 2 |
| `30f2334` | F4: a prova de que se joga (`examineReach`, `simulateProgress`, o robô, o instantâneo) |
| `90dd9a6` | F5: a inundação da navegação e o lint do que o museu imprime |
| `d299df8` | o painel do caderno dentro da tela do telefone (achado da rota de toque do fecho) |
| `02f9992` | o fecho: este registro, os dois saves do lote, os dois conjuntos de capturas, o «Feito em» |
| o da revisão | os 18 achados da revisão adversarial (11.12): a aba que não sobrescreve mais o save de outra, o instantâneo que não se regrava sozinho, a fiação que faltava, `.gitattributes` |

**Estado: fechado e revisado em 2026-10-05, não publicado.** Dos passos de §9.1 do plano estão
feitos o 1 (plano do lote), o 2 (teste primeiro, fatia por fatia, no fecho e na revisão), o 3, o
4 (portão verde), o 5 (revisão adversarial por quem não implementou: 11.12), o 6 (rota do lote:
11.8) e o 12 (este registro, o instantâneo, o corpus e as capturas). O 7 não se aplica (não é
lote de arte: nenhuma sala desenha nada diferente). **Faltam** o 8 ao 11 (revisor, push, deploy
e fumaça em produção) e o 13 (playtest). Quem publicar anota a versão Cloudflare em §2 e aqui, e
troca, na seção L2 do plano, «Feito em 2026-10-05» pela forma que diz que o lote foi publicado:
é essa frase que solta o instantâneo de acompanhar o conteúdo (11.10).

### 11.1 O que mudou para o jogador

- **O save não se perde.** Um save de produção carrega inteiro. Um campo que este build não
  conhece (gravado por um lote mais novo, numa outra aba) fica no save em vez de ser descartado.
- **Duas abas não se atropelam** (da revisão, 11.12). Uma aba que já estava aberta quando outra
  gravou lê o disco antes de gravar e junta as duas cópias: o carimbo do lote fica o maior, o
  campo desconhecido e o progresso da outra aba ficam, o brilho escolhido lá não é desfeito, e a
  aba passa a mostrar o que juntou assim que o navegador avisa. Antes, ela punha o save dela por
  cima; a garantia «aba velha não rebaixa» só valia para a aba que carregava **depois**. «Novo
  jogo» continua apagando tudo, e uma aba que ainda tinha o jogo apagado não o traz de volta.
- **O atalho da Ala 1 fica aberto.** Depois da primeira saída por ele, abre dos dois lados, para
  sempre, com o aviso «Atalho destrancado — Ala 1 · Holyoke» e o som do trinco, uma vez só. Do
  saguão, antes disso, o `E` (e o botão de Ação, no toque) responde com o zumbido em vez de
  silêncio.
- **A planta não entrega o prédio.** Só desenha a sala visitada; a vizinha é um toco com «?»; o
  atalho só aparece depois de aberto; a tranca só é listada depois de tocada, e sai ao abrir; o
  marcador é uma seta que aponta para onde a câmera olha e a planta tem norte; os três estados de
  sala diferem por padrão e por cor, com a legenda titulada («Sem energia», «Acesa, falta
  conferir», «Completa»). Da revisão: enquanto a planta desenha um toco, a legenda o explica
  («Sala ainda não visitada»; era só um `<title>`, que o dedo não vê); a tranca listada leva um
  cadeado, não um segundo «?»; e a lista de trancas cabe na página do telefone, porque a planta
  cede a altura que ela pedir.
- **Uma tranca que recusa responde** com o zumbido. Só a tranca de conhecimento abre painel.
- **No telefone o caderno fica dentro da tela** (`d299df8`): o painel ia de x = 34 a x = 844 numa
  tela de 844, com margem à esquerda e nenhuma à direita; agora vai de 33,8 a 810,2.
- **A dica do Jorge para a Ala 1 não diz mais um lado** (revisão). Dizia «à esquerda de quem
  entra», e desde este lote a ala tem duas entradas: pelo atalho o quadro fica à direita. Agora:
  «na parede de frente para as portas», até a luzinha vermelha.
- **A tela de título cabe num telefone deitado** (revisão; defeito anterior ao lote). Com save
  há dois botões sob a introdução, e em 844 × 390 os de idioma ficavam abaixo da borda de uma
  página que não rolava.
- Nada mais: nenhuma história nova, nenhuma sala, nenhuma textura, nenhum modelo, nenhuma
  dependência. O jogo continua com o fecho honesto de L1.

### 11.2 Como ficou no código

O desenho de cada peça está em `docs/lotes/L2-plano.md` §3; aqui, só o mapa.

- **O save** (`src/state/progressFields.ts`, `src/state/saveMigrations.ts`,
  `src/content/contentLot.ts`): uma tabela diz, campo a campo, o valor de um jogo novo, como
  sanear o que veio do disco e se o campo conta como progresso; o que a tabela não conhece passa
  adiante intocado. `SAVE_VERSION` continua 1. O que muda de lote para lote é
  `progress.contentLot`: o save é carimbado com `max(o dele, CONTENT_LOT)`, e os migradores de um
  lote rodam para todo save com carimbo até o dele. Campos novos de L2: `contentLot`, `locksSeen`,
  `doorsReleased`, `flags` e `triggersFired` (os dois últimos vazios em todo save: o conteúdo de
  L2 não compila gatilho nenhum). Um save sem `locksSeen` ganha as trancas que abriu; nenhuma
  porta é dada como liberada para quem não a liberou.
- **O save entre duas abas** (`src/state/store.ts`, `takeInOtherTabs`; `progressFields.ts`,
  `joinProgress`): a tabela de campos ganhou a coluna `join`, a regra de cada campo para duas
  cópias do mesmo save (lista por união, lote e relógio pelo maior, memória do rádio pela chamada
  mais recente, `lastRoom` da aba). O store lê o disco antes de toda escrita e no evento
  `storage`. Um jogo recomeçado leva uma marca, `game`, gravada **ao lado** de `settings` e
  `progress`: não é campo do save (`PROGRESS_FIELDS` tem os mesmos 19, e o instantâneo não
  mudou), e um save que nunca recomeçou não a tem. O que outro build gravar nesse nível também
  passa adiante.
- **Uma porta só para o progresso** (`src/state/store.ts`, `src/state/progressRules.ts`,
  `src/engine/triggers.ts`, `contentRegistry.ts`, `progressGrants.ts`): todo verbo é uma função
  pura que devolve uma concessão, e o store tem uma entrada, `grant`, que aplica, assenta os
  gatilhos e só então notifica e grava. Concessão que não acrescenta nada não escreve nem acorda
  ninguém. O store não importa conteúdo: as regras chegam por um registro, depois do clique.
- **Trancas** (`src/engine/lockRules.ts`): `attemptLock` é o único caminho, do toque e do teclado;
  só o resultado `ask` abre modal.
- **Portas** (`src/engine/transitionDoorTopology.ts`): as duas regras recebem `doorsReleased`;
  `doorGrant` grava a liberação no aperto, do lado de `opensFrom`, antes de a folha se mover.
- **A planta** (`src/ui/mapModel.ts`, `mapGeometry.ts`, `MuseumMap.tsx`): o que aparece é decidido
  por uma função pura do conteúdo, do save e de onde o jogador está; o componente só desenha.
- **Só do portão** (fora do bundle, conferido em `test:facts`): `src/content/simulate.ts` (a
  jogadora exaustiva que substituiu `validateSolvability`), `additive.ts` (o instantâneo e
  `validateAdditive`), `textLint.ts`, `src/engine/examineReach.ts` como conta.
- **Bibliotecas de teste** (`scripts/lib`): `storePage.ts` (o store carregado como o navegador
  carrega), `storeActions.ts`, `playthrough.ts` (o robô), `flood.ts` (a inundação), `museumWorld.ts`
  (os volumes de interação), `graphSnapshots.ts`, `planLots.ts`, `staticImports.ts`,
  `mediaTexts.ts`, `runtimeWiring.ts` (a fiação de cada regra ao componente, e agora a conta do
  painel do caderno) e `frozen/sanitiseProgress.L1.ts` (o leitor de save que L1 publicou,
  congelado por hash). Da revisão: `readText.ts` (todo arquivo de texto lido por uma suíte chega
  com final de linha Unix; `test:docs` recusa a leitura crua) e, na raiz, `.gitattributes`.
- **O instantâneo do grafo tem três estados** (`scripts/lib/graphSnapshots.ts`, da revisão):
  rascunho de um lote aberto, arquivo de um lote fechado (digest fixado em `FROZEN_SNAPSHOTS`,
  o script recusa regravar sem `--reopen`) e registro, que é com o que o conteúdo é comparado. O
  rascunho do lote em andamento nunca é o juiz dele mesmo.

### 11.3 Medições

**Bundle** (gzip nível 9, arquivo a arquivo, a medida do portão):

| Caminho | L1 (bytes) | L2 (bytes) | Teto |
|---|---|---|---|
| documento | 63.235 | 63.235 | 63.600 |
| tela de título | 28.353 | 29.598 | 29.800 |
| jogo | 388.248 | 390.892 | 392.700 |

São 92,83 kB antes do clique (orçamento 250; eram 91,59) e 483,73 kB no total (orçamento 600;
eram 479,84). O título cresceu 1.245 bytes: 506 nas fatias, com o save (a tabela de campos e a
migração moram no store, que a tela de título importa) e com os textos e as regras de estilo da
planta; e 739 na revisão, quase tudo o store lendo o disco antes de gravar e juntando as duas
cópias, mais a folha de estilos (a página da planta como coluna, o cadeado, a tela de título
deitada). O jogo cresceu 2.644, com o modelo da planta, as concessões e os gatilhos. Cada teto
subiu no commit que precisou, com o motivo em `scripts/lib/ratchets.ts`; o do título foi de
29.000 a 29.800 na revisão. **O título tem 202 bytes de folga**: L3 escreve texto e sobe o teto
no commit dele. Kit, texturas e GLBs não mudaram (`npm run bake` não rodou no lote).

**Pontos de referência.** Nenhuma sala desenha nada diferente, e o `BROWSER_RECORD` continua o
do lote 1, de propósito: com `CONTENT_LOT` em 3 o portão passa a recusá-lo, e L3, que põe coisas
no escritório, tem de medir. Mesmo assim os dez pontos foram medidos de novo no fecho, por
conferência, em 1280 × 720, qualidade `medium`, três passadas iguais cada um:

| Ponto | L1 (§10.3) | Fecho de L2 |
|---|---|---|
| R01 escritório, leitura | 58 · 36.086 | 58 · 36.086 |
| R02 escritório, spawn | 66 · 37.906 | 66 · 37.906 |
| R03 átrio, da porta do escritório | 80 · 63.940 | 80 · 63.940 |
| R04 átrio, diagonal sudeste | 101 · 77.334 | 101 · 77.334 |
| R05 átrio, do canto noroeste | 85 · 67.820 | 85 · 67.820 |
| R06 átrio, da porta da Holyoke | 79 · 70.774 | 79 · 70.774 |
| R07 Holyoke, da porta | 39 · 37.676 | 39 · 37.676 |
| R08 Holyoke, da porta para sudoeste | 70 · 52.036 | 70 · 52.036 |
| R09 Holyoke, do canto noroeste | 81 · 62.374 | 81 · 62.374 |
| R10 par com a porta aberta | 125 · 100.428 | 125 · 100.428 |

(draws · triângulos.) **Programas: 35** com as três salas residentes. R01 e R02 foram medidos
como a linha de base mede: jogo novo, as três salas acesas pelo store, rádio e caderno sobre a
mesa. R03 a R10, com `?qaSave=production-drawer-open`. **Com o rádio no bolso e o caderno pego,
R01 e R02 dão 51 · 34.962 e 59 · 36.782**, sete draws e 1.124 triângulos a menos: são o rádio na
base e o caderno, que saíram da mesa (com o rádio ainda na base, em
`?qaSave=production-radio-on-desk`, 55 · 35.554 e 62 · 37.314). Não é regressão, é o estado; quem
medir o escritório mede no estado da linha de base.

**Portão.** `npm run check` inteiro leva 47 s nesta máquina, com os 33 passos.
`test:playthrough`: as 500 noites em 9 s (19.809 apertos, 2.441 deles à toa, 1.064 abas fechadas
e reabertas; 87 noites acham o detalhe da fotografia do ginásio, que só a sorte acha: 11.12).
`test:navigation`: 108 casos em 3,3 s; a inundação tem 6.618 lugares e julga 26 alvos.
`docs/releases/L2.graph.json`: 42 ações, 3 itens de lista, 54 ids, 19 campos do save (SHA-256
`0eae15c3eaba5a4dc2fca5df72d708c0e7b0a73011616c4fb1be2cb8c310a5b1`, fixado em
`scripts/lib/graphSnapshots.ts`); gerado de novo no fecho e outra vez sobre a árvore da revisão,
com `--reopen`: não mudou um byte.

### 11.4 O portão

`npm run check` verde em 2026-10-05, com 33 passos (eram 27): entraram `test:lints` (depois de
`validate:content`), `test:save` (depois de `test:qa-save`), `test:triggers`, `test:locks` e
`test:map` (depois de `test:radio`) e `test:playthrough` (depois de `test:navigation`).
`test:bundle` continua no fim.

- conteúdo: 3 salas válidas, 38 dívidas datadas impressas (eram 29; 37 no fecho), o roteiro em
  níveis e a comparação com o instantâneo;
- lint de texto: 21/21 (novo); catracas: 4/4; fontes: 28; documentação: 25/25 (23 no fecho);
- capturas: 15/15 (eram 12); saves do corpus: 27/27 (eram 19); save: 39/39 (novo; 30 no fecho);
- energia: 30/30; abertura: 33/33 (eram 31; 32 no fecho); fluxo da abertura: 44/44; rádio: 27/27;
- gatilhos: 30/30 (novo); trancas: 15/15 (novo); planta: 17/17 (novo; 16 no fecho);
- colisão: 28/28; kit e posicionamento: 339/339; vitrine corrida: 12/12;
- materiais: 10; mesa do curador: 9; estantes: 20;
- runtime do kit: 26; runtime das salas: 19; LOD: 23; aquecimento de GPU: verde; prontidão: 6/6;
- render: 16/16; sinalização: 26; portas: 38/38 (eram 29); controles móveis: 14/14 (eram 13);
- navegação: 108/108 (eram 68), com duas dívidas impressas; partida: 34/34 (novo; 30 no fecho);
- bundle: 5/5; `npm run build`: verde.

Vermelho primeiro (§9.1, passo 2): o de cada fatia está em `docs/lotes/L2-plano.md` §14. No
fecho, cada um visto antes do conserto:

- `test:map`: «the notebook's panel asks for 96vw between two margins of 4vw, 104 in all»;
- `test:captures`: «docs/contact-sheets/l2/manifest.json is missing», e depois dezessete linhas
  «is in the set and docs/HANDOFF.md never cites it», até esta seção existir;
- `test:qa-save`: «l2-shortcut-released is gone from the corpus», e depois «the plan no longer
  marks L2 as done», até o «Feito em» entrar no plano;
- com os dois saves novos no corpus, quatro suítes reprovaram onde afirmavam, de todo save, que
  ele vinha de antes de L2 (11.5).

Por mutação, com tudo verde, sobre os registros novos (o arquivo voltava ao original depois de
cada uma): os dois saves dados como de produção; um campo fora da ordem em que o store grava; a
porta liberada tirada do registro; `flags` esquecido. As quatro reprovam `test:qa-save`.

### 11.5 Testes que mudaram de sentido (plano, 6.5)

Das fatias (a tabela inteira, com arquivo e linha, está em `docs/lotes/L2-plano.md` §8.2):

- `scripts/test-capture-manifest.ts`: `l1-review` deixou de ser um conjunto aberto sobre a árvore
  de trabalho e passou a congelado em `513ec09`;
- `scripts/test-qa-save.ts`: o corpus deixou de ser «cinco saves que nunca saem»; ganhou um por
  lote fechado;
- `scripts/test-power.ts`: os quatro efeitos de destranque, que eram aplicados por
  `store.applyUnlockEffect`, passam por `effectGrant` e `grant`;
- `scripts/test-save.ts`: a tabela de toda função do store foi para `scripts/lib/storeActions.ts`
  (lida também por `test:triggers`); saiu `applyUnlockEffect`, entrou `grant`, e `openLock` deixa
  também `locksSeen`. **Função nova no store entra nessa tabela**, senão duas suítes reprovam;
- `scripts/test-transition-door.ts`: o caso que prendia o defeito («o atalho não fica aberto»)
  virou «a folha não guarda nada; o save guarda, e aí o saguão abre»; as duas regras de porta
  recebem a lista de portas liberadas (também em `scripts/test-opening.ts`);
- `scripts/test-navigation.ts`: o atalho é atravessado nos dois sentidos; a suíte assenta a tabela
  de dívidas uma vez, no fim;
- `scripts/test-opening.ts`: `validateSolvability` deu lugar a `simulateProgress`, e «o museu de
  hoje é jogável» assenta as dívidas antes de exigir zero erros;
- `scripts/test-facts.ts`: a lista «só do portão» tem nove módulos (eram seis), e a regra é
  provada com importações feitas para o teste;
- `scripts/test-docs.ts`: `lastLotDone` foi para `scripts/lib/planLots.ts`, sem mudar de sentido.

Do fecho. Quatro suítes percorriam o corpus afirmando, de todo save, o que só vale para os
anteriores a L2. Com os saves do próprio lote no corpus, cada uma passou a perguntar antes quem
escreveu o registro (`fixtureLot`, em `src/content/saveFixtures.ts`), e ganhou a outra metade:

- `scripts/test-save.ts`: «nenhuma porta liberada para ninguém» vale para os saves sem o campo; um
  caso novo confere que um save de L2 sai da carga com a porta que liberou e a tranca que tocou,
  e que as duas sobrevivem a uma sessão. «Save sem `contentLot` é de produção» passou a exigir
  também que todo save de L2 em diante traga o lote que o escreveu;
- `scripts/test-locks.ts`: «save anterior a `locksSeen` viu exatamente as trancas que abriu»
  (DL2-4) vale para os anteriores; caso novo: o save que diz o que tocou é acreditado, e a gaveta
  tocada e fechada está na planta desde o primeiro quadro do «Continuar»;
- `scripts/test-map.ts`: «todo save mostra as salas que visitou, e o atalho de ninguém» virou «…e
  o atalho só de quem o liberou»;
- `scripts/test-transition-door.ts`: «save anterior ao campo carrega sem porta liberada» (DL2-3)
  vale para os anteriores; caso novo com os dois saves do lote.

`scripts/test-qa-save.ts` ganhou três regras que valem daqui em diante: **todo lote que o plano
dá como feito tem um save no corpus**; um save do lote em que a árvore está carrega como ele
mesmo, campo a campo e na mesma ordem; e, para registros de L2 em diante, tranca aberta foi
tocada e porta liberada foi empurrada de uma sala visitada.

Da revisão (11.12):

- `scripts/test-opening-flow.ts`: «a tab that changed nothing never overwrites a newer save»
  usava «Novo jogo» para forçar a gravação (a suíte não tem página para ocultar) e passava
  porque um save vazio recomeçado não tinha nada a gravar. «Novo jogo» agora grava sempre, com a
  marca do jogo novo. O caso virou «"New game" is the one write that goes over a newer save, and
  it marks the game as another»; a regra antiga mora em `scripts/test-save.ts`, com abas que se
  ocultam;
- `scripts/test-playthrough.ts`: o caso do instantâneo em disco passou a ler todos os arquivos, o
  digest dos lotes fechados e a igualdade **até a publicação** (era até o «Feito em»); o portão é
  provado com a lista de instantâneos e o último lote publicado, não com «o mais novo»; as cinco
  acusações viraram seis; o fim de toda noite é comparado sem o que a sorte acrescenta; o caso
  «a simulação oferece e a mão não acha» passou da fotografia (que a vista grava) para a fita da
  rede (que nunca aparece); a noite a repetir vem por `-- --seed <n>`, e as 500 são jogadas de
  todo jeito;
- `scripts/test-opening.ts`: «o museu de hoje é jogável» assenta também a dívida nova,
  `hotspot-unreachable`; `scripts/test-triggers.ts`: uma das mutações do store aponta para a
  linha nova da carga (`const initialText = storedText()`);
- o store: `recordClockSeconds` não aceita mais um tempo menor que o do save. Nenhum caso
  existente pedia isso; o caso novo de duas abas pede o contrário;
- toda suíte lê texto por `scripts/lib/readText.ts` (25 arquivos, sem mudança de sentido).

### 11.6 Dívidas datadas (`src/content/knownDebt.ts`, 46 linhas; eram 36)

**Paga:** `i18n-key-unused` de `map.legend` (a legenda da planta ganhou título, em F3, no commit
que moveu `CONTENT_LOT` para 2).

**Abertas por L2**, cada uma no commit do validador que a acusa:

| Portão | Código | O quê | Fecha em |
|---|---|---|---|
| `validate:content` | `exhibit-uncataloguable` | `net-1897`, `gym-suit`, `photo-gym`: o detalhe obrigatório fica fora do alcance do exame (H-01). Duas nunca; a fotografia, só num cone de 1,5° que a vista grava e nenhum roteiro conta com ele | L4 |
| `validate:content` | `hotspot-unreachable` | `net-1897:socket`: detalhe opcional fora do alcance, que nenhuma outra acusação nomeava (revisão) | L4 |
| `validate:content` | `checklist-item-untickable` | `notebook.todo.catalogue`: pede as doze peças, e três não catalogam | L4 |
| `validate:content` | `checklist-item-untickable` | `notebook.todo.vault`: sem `doneWhen`; vira promessa datada sem caixa de riscar | L3 |
| `validate:content` | `text-ages` | `document.predecessor.body`: «há cento e trinta anos» (H-23); o bilhete dá lugar a `doc-otavio-handover` | L3 |
| `validate:content` | `speech-night-state-unconditional` | `radio.patience.t4.dark`, `radio.patience.t5.soap.2`, `radio.deadAir.rain`: resposta do Jorge sem `when` | L3 |
| `test:navigation` | `standing-point-inside-target` | `net-1897`: sem colisor, o olho entra na caixa da rede (H-31) | L14 |

**L3 herda cinco linhas com a data dele** (a da caixa-forte, a do bilhete e as três falas): com
`CONTENT_LOT` em 3, cada uma que ainda acusar vira `known-debt-overdue`. As demais linhas são as
de §10.6, sem mudança. O Anexo C do plano ganhou as linhas de L2 e os códigos novos que hoje não
acusam nada (`no-standing-point`, `numeral-exclusivity`, `numeral-printed-in-missing`,
`fact-code-without-printed-in`, `fact-exception-without-patterns`, `counted-pattern`). O lint de
numerais passou a ler também a linha que só a aba Créditos imprime (por que a foto é de domínio
público, o que foi modificado, o gerador), sob `credits:<id>`: é onde uma fonte aparece com a
data dela.

Sem código, só registradas (texto que outro lote conserta): a versão inglesa do bilhete («has
been here a hundred and thirty years») escapa da lista inglesa de `text-ages` e vai embora com o
bilhete, em L3; e o que a rota mostrou de passagem (11.9).

### 11.7 O corpus de saves e o que um rollback perde

`src/content/saveFixtures.ts` tem oito saves: os cinco de produção, o de L1 (`l1-route-end`,
tirado do navegador pela primeira fatia de L2 sobre a árvore publicada: o item que §10.10 deixou
aberto) e dois de L2, lidos do `localStorage` no fecho, sobre `90dd9a6`, e conferidos byte a byte
contra o texto que o navegador devolveu:

- **`l2-shortcut-released`**: a rota do lote a partir do save de L1. `Continuar`, porta do
  escritório, `E` no atalho pelo saguão (zumbido, nada gravado), a ala pela porta principal, e a
  saída pelo atalho. É um save de L1 trazido para a frente, e a ordem dos campos mostra: os de L1
  primeiro, depois os cinco de L2, com `doorsReleased: ['atrium-from-holyoke-shortcut']`;
- **`l2-new-game-drawer-touched`**: um jogo novo de L2. Luminária, a primeira chamada ouvida, o
  caderno (pego enquanto o Jorge o pedia: a chamada do lembrete conta como ouvida), o rádio, `E`
  na gaveta e o teclado fechado sem código, o saguão aceso, o atalho tentado pelo lado errado. O
  que nenhum save anterior consegue guardar: **tranca tocada e ainda fechada**
  (`locksSeen` sem `locksOpened`), sob uma planta de duas salas e um toco. É o jogador que L3
  encontra com o teclado já visto e o ano por aprender.

Os dois, lidos pelo código congelado de L1, não perdem nada do que L1 conhece (`test:save`), e
jogados até o fim pelo robô, em três ordens cada, chegam ao estado máximo sem perder átomo
(`test:playthrough`). L3 começa a rota dele pelos dois.

**O que um rollback perde.** Publicar de novo um build anterior a L2 (o de L1 é `f0fb5a3`,
Cloudflare `1d3a4554`) não apaga o save de ninguém, mas o leitor de L1 só copia os campos que
conhece, e na primeira gravação o save sai sem os cinco campos de L2. Tudo o que L1 conhece volta
igual: peças, detalhes, documentos, fatos, salas visitadas e acesas, trancas abertas, chamadas,
relógio, lições, rádio no bolso e a memória do Jorge. Ao voltar para L2 (ou seguir para L3), o
save sem `contentLot` é tratado como de produção:

- `locksSeen` é refeito a partir de `locksOpened`: a gaveta **tocada e ainda fechada** some da
  planta até o próximo toque;
- `doorsReleased` não volta: o atalho tranca de novo pelo lado do saguão, e pede mais uma saída
  pela ala (o aviso «Atalho destrancado» toca outra vez);
- `flags` e `triggersFired` estão vazios em L2, então hoje nada se perde ali. **De L3 em diante
  não estarão**: um rollback para antes de L2 esquece quais gatilhos já dispararam, e cada um
  dispara de novo na primeira ação. Um gatilho de L3 só pode conceder o que é seguro conceder duas
  vezes (as listas do save não repetem item, mas uma fala ou um aviso preso a ele repete);
- enquanto o build antigo estiver no ar, a planta volta a desenhar o prédio inteiro e o atalho
  volta a não ficar aberto: é o código de L1.

**Duas abas, e o que a marca do jogo não cobre.** Desde a revisão uma aba junta o que acha no
disco com o que tem (11.12), e isso vale também contra um build antigo aberto em outra aba: o
que o leitor de L1 derruba (os cinco campos de L2) a aba de L2 repõe na escrita seguinte. Um
limite fica registrado: «Novo jogo» feito numa aba de **build anterior à marca** (o de L1, o que
está no ar hoje) não se distingue do save de uma aba que ainda não jogou, então a aba de L2 que
ainda tinha o jogo antigo o junta de volta. Entre duas abas deste build em diante, não: a marca
(`game`, ao lado de `settings` e `progress`) diz que é outro jogo, e o disco vence. A aba que
adota o jogo novo continua de pé onde estava até recarregar; o save é o do jogo novo, inteiro.

**Um rollback para dentro de L2 não perde nada**: de `1ecc2cb` em diante todo build preserva o
campo que não conhece. Se for preciso voltar atrás, volte para um commit a partir dele; para
antes, só sabendo o que está escrito acima. O caso está em `docs/lotes/L2-plano.md` §5 (caso E) e
preso em `test:save` («a save of this lot read by the code of L1 loses nothing L1 knows», «case
E»).

### 11.8 O que o navegador mostrou

Servidor `museum-dev` reiniciado antes da rota e de novo depois da edição da folha de estilos;
painel visível, o jogo em tempo real. Tudo pelo `E`, pelo `Tab`, pelas teclas e pelos botões do
próprio jogo; o teleporte do harness só pôs a câmera diante de cada alvo dentro da sala em que o
jogador já estava, e toda travessia de porta foi andada. O que se lê aqui saiu do DOM, do save e
de dois espiões postos na página: um conta o que o jogo pede ao áudio, o outro anota cada mudança
do save.

**Desktop, 1280 × 720.**

- **`?qaSave=production-drawer-open`, pt-BR.** Planta: três salas, duas portas, nenhuma tranca,
  legenda com título, «N» no alto, marcador a 90° (o olhar de partida) e a −90° diante do atalho.
  No saguão o atalho diz «Abre pelo outro lado»; dois apertos de `E`, dois zumbidos, nenhuma
  escrita. Da ala, um `E`: uma escrita (`doorsReleased`), um som de trinco, um aviso. De volta ao
  saguão: «Abrir porta», abre, sem aviso; planta com três portas. **Recarregado sem o parâmetro:**
  nenhum aviso ao continuar, o atalho abre pelo saguão e se atravessa.
- **`?qaSave=production-drawer-closed`, pt-BR e inglês.** Nenhuma tranca na planta. `E` na gaveta:
  o teclado abre e `locksSeen` ganha a gaveta, numa escrita; `Esc`; a planta lista «Gaveta com
  segredo — 4 dígitos» (“Combination drawer — 4 digits”); um segundo `E` não escreve nada. `1895`
  nos botões e «Abrir»: «Não abre.», nada gravado. `1896` no teclado e `Enter`: a gaveta abre, o
  bilhete aparece, duas escritas (a tranca, depois o documento), `triggersFired` vazio, a tranca
  sai da planta e o escritório passa a «Completa». Reler a gaveta não escreve.
- **A rota do atalho em inglês:** “Opens from the other side”, “Shortcut unlocked — Wing 1 ·
  Holyoke”, “Open door”, “Legend / No power / Lit, something left to check / Complete”, “North”,
  “You are here”.
- **Jogo novo, pt-BR** («Novo jogo» e a confirmação). Luminária: uma escrita. A primeira chamada
  do Jorge: três falas, cada uma uma vez, gravada ao fim. Caderno: três páginas pelo `E`; planta
  com **uma sala e um toco** («Sala ainda não visitada»). Rádio: pego, e a chamada dele ouvida.
  Gaveta tocada: a planta a lista. No saguão ainda escuro: duas salas, o saguão tracejado, o toco
  na porta da Ala 1, nada no lugar do atalho. Quadro do saguão: uma escrita; um segundo `E` no
  quadro já ligado não faz nada. Atalho pelo saguão: zumbido. Na ala escura: três salas, duas
  portas. Quadro da ala; saída pelo atalho: uma escrita, um aviso, e um segundo `E` com a porta
  abrindo não grava nem soa. Planta com três portas. **Recarregado:** o atalho abre pelo saguão.
- **`?qaSave=production-pre-opening`, em inglês:** carrega com tudo o que tinha, mais o carimbo e
  as listas novas vazias; planta em inglês com o escritório tracejado; nenhum aviso ao continuar.
- **`?qaSave=l1-route-end`:** carrega sem escrever nada no disco; a rota do atalho se repete a
  partir dele, e é dela que saiu `l2-shortcut-released`.

**Toque, 844 × 390**, com eventos de ponteiro de tipo `touch` nos dois direcionais e toques nos
botões do jogo.

- O direcional de olhar girou a câmera de −90° a +89° e nivelou o olhar; o de andar levou o
  jogador à porta e através dela; **Ação** abriu.
- `l1-route-end`, pt-BR: o caderno abre pelo botão; a planta e a legenda cabem numa página, sem
  rolagem (211 px de planta, legenda terminando em 340 de 390), os três nomes de sala dentro do
  desenho. Diante do atalho bloqueado o botão de Ação **aparece** e dá o zumbido, duas vezes, sem
  gravar. Da ala, Ação libera: o aviso fica no alto (y de 12 a 51) e o prompt embaixo (237 a 267),
  sem tocar um no outro, nos direcionais nem nas ferramentas. Do saguão, Ação abre; planta com
  três portas.
- `production-drawer-closed`, em inglês: Ação abre o teclado; os dígitos e «Open» pelos botões
  (depois de rolar o painel: ver 11.9); a gaveta abre; «Close» fecha.
- Jogo novo, em inglês: luminária e caderno pelo botão de Ação, páginas pelos botões do caderno,
  planta com uma sala e “A room not visited yet”; no saguão, duas salas e o toco na porta da ala.

**Nada disparou duas vezes.** Cada aviso apareceu uma vez; cada liberação, cada sala acesa e
cada tranca tocada foi uma escrita; `E` repetido numa porta bloqueada, numa porta abrindo, num
quadro ligado e numa gaveta já lida não gravou nada; recarregar não repete aviso.
`triggersFired` e `flags` ficaram vazios em todas as sessões. Console sem erro; o único aviso é o
`THREE.Clock` de sempre.

**Da revisão (11.12)**, com o servidor reiniciado depois das edições:

- **Duas abas de verdade**, no mesmo navegador, sobre `l2-new-game-drawer-touched`. A segunda aba
  acende a Ala 1, cataloga o retrato e sobe o brilho: a primeira, sem ser tocada, passa a ter os
  três (o evento `storage` chegou). A segunda grava como um build seguinte gravaria (`contentLot`
  3, um campo `termsSigned`, um gatilho, a gaveta aberta); a primeira anota uma lição e desliga a
  legenda: no disco ficam o lote 3, o campo, o gatilho, a gaveta, a lição, a legenda desligada e
  o brilho da outra. «Novo jogo» pelos dois cliques na segunda: save vazio, com a marca; a
  primeira fica com o jogo novo, e a escrita seguinte dela entra nele, sem nada do antigo.
- **A planta em 844 × 390 com a gaveta tocada**, pt-BR e inglês: sem rolagem (página de 297 px);
  a planta com 200 px (y de 82 a 282), a legenda numa linha com os quatro itens (292 a 313), a
  tranca com o cadeado (332 a 353), tudo acima do fim da página (366). Com sete trancas a mais,
  postas à mão no DOM para medir, a planta cede até 26 px e nada passa da página. Em 1366 × 650 a
  linha da tranca termina em 588 de 610 (ficava cortada em 2 px); em 1280 × 720 a planta mantém
  os 416 px.
- **A tela de título em 844 × 390, com save**: o painel vai de y = 39 a 351; «Continuar», «Novo
  jogo» e os dois idiomas na tela, sem rolagem (antes o painel ia de 23 a 429, com os idiomas em
  401).
- Não conferido no navegador: a fala nova do Jorge (só nas suítes); nenhum quadro de captura novo
  foi feito, e os dois conjuntos congelados mostram a planta como era no fecho (com o «?» na
  lista de trancas e sem o toco na legenda).

**Capturas.** Dez quadros em `docs/contact-sheets/l2/` (1536 × 864, sobre `90dd9a6`) e sete em
`docs/contact-sheets/l2-touch/` (1688 × 780, sobre `d299df8`), os dois conjuntos congelados com
digest. **Não são capturas do canvas**, que não tem HUD: cada quadro é o canvas com a camada do
DOM desenhada por cima (11.10 diz como).

| Quadro | O que mostra |
|---|---|
| `l2-o01-plan-new-game-one-room-and-a-stub-lit` | jogo novo: uma sala, um toco com «?», seta, norte, legenda |
| `l2-o02-drawer-keypad-open-lit` | o teclado da gaveta em 720 px de altura: «Abrir» e «Fechar» abaixo da dobra do painel |
| `l2-o03-plan-lock-touched-and-listed-lit` | a gaveta tocada, listada pelo nome |
| `l2-d01-plan-atrium-entered-stub-at-the-wing-door-dark-notorch` | saguão escuro: duas salas, o toco na porta da ala, nada no atalho |
| `l2-a01-shortcut-from-the-atrium-opens-from-the-other-side-lit` | o atalho pelo saguão: «Abre pelo outro lado» |
| `l2-a02-plan-atrium-lit-shortcut-not-drawn-lit` | o marcador encostado no atalho, que a planta não desenha |
| `l2-e01-plan-wing-entered-dark-two-doors-dark-notorch` | três salas, a ala tracejada, duas portas |
| `l2-h01-shortcut-pushed-from-the-wing-toast-unlocked-lit` | a porta abrindo e o aviso «Atalho destrancado — Ala 1 · Holyoke» |
| `l2-a03-shortcut-from-the-atrium-after-release-open-door-lit` | o mesmo lugar de `a01`, agora «Abrir porta» |
| `l2-a04-plan-three-rooms-three-doors-after-release-lit` | a planta com as três portas |
| `l2t-o01-plan-on-a-phone-three-rooms-two-doors-lit` | a planta no telefone, numa página, com a legenda |
| `l2t-a01-blocked-shortcut-has-an-action-button-lit` | o botão de Ação diante do atalho bloqueado |
| `l2t-h01-shortcut-released-toast-clear-of-the-prompt-lit` | aviso no alto, prompt embaixo, direcionais e ferramentas livres |
| `l2t-a02-plan-on-a-phone-three-doors-after-release-lit` | três portas, o painel com margem dos dois lados |
| `l2t-o02-keypad-on-a-phone-lit` | o teclado no telefone: a pergunta e os quatro dígitos, nenhuma tecla (em inglês) |
| `l2t-o03-plan-on-a-phone-new-game-one-room-and-a-stub-lit` | jogo novo no telefone (em inglês) |
| `l2t-d01-plan-on-a-phone-atrium-entered-stub-at-the-wing-door-dark-notorch` | saguão escuro no telefone (em inglês) |

**O que não deu para conferir.**

- **O giro pelo mouse:** o painel não dá `pointer lock`. A seta da planta foi vista em seis rumos
  (90°, 83°, 126°, 0°, −34°, −137°), postos pelo harness e, no toque, pelo direcional de olhar.
- **Toque de verdade:** foram eventos de ponteiro sintéticos, um dedo por vez, num painel de
  desktop. Nenhum aparelho real, nenhuma área segura, nenhum multitoque, nenhuma tela cheia.
- **O som:** contaram-se os pedidos ao áudio (`lockDenied`, `lockRelease`, `chime`, `doorOpen`,
  `radioCrackle`); ninguém ouviu.
- **A hachura num telefone ao sol**, que é o que a regra do padrão existe para resolver.
- **O build publicado:** nada foi enviado nem publicado; a fumaça em produção é do passo 11.
- As três peças que não catalogam não foram tentadas (nada mudou nelas; é L4), e a espera de
  30 s da porta de L1 não foi repetida.

### 11.9 Visto de passagem, sem conserto neste lote

Nada disto é de L2, e nada ganhou código de dívida; cada item já tem lote no plano.

- **O teclado da gaveta não cabe no painel.** O painel é o do exame, com teto de 46% da altura
  da tela. Em 1280 × 720 são 330 px para 384 de conteúdo: «Abrir» e «Fechar» ficam abaixo da
  dobra do próprio painel (`Enter` e `Esc` funcionam). Em 844 × 390 são 178 px para 359: o
  telefone mostra a pergunta e os quatro dígitos e **nenhuma tecla**; uma rolagem põe as dez
  teclas e «Abrir» na tela e esconde o visor. Dá para abrir, e foi aberto assim. É o painel de
  179 px que o plano já conhece (ÁT-J1, ÁT-J2, H-52), e o teclado é refeito com o exame em L4
  (M6b). Quadros `l2-o02-drawer-keypad-open-lit` e `l2t-o02-keypad-on-a-phone-lit`.
- **Na planta, o marcador passa por cima do nome da sala** quando o jogador está sob ele (o
  escritório em `l2-o03-plan-lock-touched-and-listed-lit`), e o nome do escritório é mais largo
  que o retângulo da sala. Fica para quem mexer na planta (H-34, em L4; a planta do saguão, L9).
- **A gaveta aberta ainda se chama «Gaveta trancada do curador»** no prompt («Ler — Gaveta
  trancada do curador ✓»). L3 refaz a gaveta.
- **Uma chamada começada no rádio da mesa continua na legenda depois que o jogador sai do
  escritório sem o rádio.** «Dentro do alcance» só é perguntado para começar a chamada: com a
  primeira chamada presa atrás do caderno e do teclado, a segunda fala apareceu no saguão. É
  assunto de L3 (M9; D27, o alto-falante da sala).

### 11.10 Lições

- **Quem percorre «todo save do corpus» está afirmando a idade do corpus.** Quatro suítes diziam
  «nenhum save tem o campo» com um laço sobre todos, e reprovaram no dia em que o lote guardou o
  próprio save. Pergunte antes quem escreveu o registro (`fixtureLot`), e escreva as duas metades:
  o que se infere para quem não tinha o campo, e o que se respeita de quem tem.
- **O «Feito em» do plano é portão, e a ordem do fecho segue disso:** `npm run graph:snapshot`,
  os saves do lote no corpus (`test:qa-save` reprova um lote «feito» sem save), as capturas
  citadas no registro (`test:captures`), e só então a linha no plano, **junto com o SHA-256 do
  instantâneo em `FROZEN_SNAPSHOTS`** (`test:playthrough` reprova lote feito sem digest).
  `CONTENT_LOT` já tem de estar no lote (`test:docs`).
- **«Feito» não é «publicado», e o instantâneo sabe a diferença** (corrigido na revisão). O
  «Feito em» é escrito antes da revisão e do push. Até a seção do lote dizer que ele foi
  publicado (a forma exata está em `scripts/lib/planLots.ts`, e é a da seção de L1), o
  instantâneo tem de ser o grafo do conteúdo, byte a byte: um conserto que mude o grafo entre o
  fecho e o push pede `npm run graph:snapshot -- --reopen` e o digest novo, no mesmo commit.
  Antes, o «Feito em» desligava a comparação, e o conserto ia ao ar sem estar no registro.
- **Quem começa o lote seguinte com `CONTENT_LOT` ainda no anterior não regrava o instantâneo.**
  O script recusa, e a mensagem diz as duas saídas. Se o lote anterior não foi publicado, a
  primeira mudança de grafo do seguinte reprova a igualdade: ou se publica o anterior, ou
  `CONTENT_LOT` sobe antes (e aí o arquivo anterior vira registro, com o digest que já tem).
- **Mão de robô copiada do handler não prova o handler.** O robô joga o store com uma cópia de
  cada `interact`; tirar do componente a linha que grava deixava as 500 noites verdes. Onde a
  regra é pura e o componente só a chama, uma asserção sobre a fonte prende a chamada inteira,
  com o que vem antes e depois dela, e uma mutação em memória prova que a asserção morde.
- **Uma garantia de save se prova com duas páginas sobre o mesmo storage.** «Aba velha não
  rebaixa» era provado com uma aba que carregava depois, que é o caso fácil; a aba que já estava
  aberta é a que existe em produção depois de um deploy.
- **Heredoc do shell come barra invertida** nesta máquina: script com regex ou `\n` literal se
  escreve em arquivo, não em heredoc.
- **Save tirado do navegador se copia do texto, não da memória.** O texto lido da chave foi
  guardado e o registro digitado foi comparado com ele byte a byte; e o portão passou a exigir que
  um save do lote da árvore carregue como ele mesmo. Um save trazido de um lote anterior tem os
  campos na ordem em que foram chegando, não na da tabela.
- **Dívida de estilo também se soma.** `4vw + 96vw + 4vw` passou anos na folha porque nenhuma
  tela de desenvolvimento tinha menos de 60rem. Onde duas regras têm de fechar uma conta, uma
  suíte lê as duas e soma (`journalLayoutProblems`); não há motor de layout em Node, e não
  precisa.
- **Medir no estado da linha de base.** Um save com o rádio no bolso tira sete draws do
  escritório; parece melhora e é só a mesa mais vazia.

Do harness, para quem repetir a rota:

- **HUD em captura: componha.** `/__capture` recebe o que a página mandar. Para um quadro com a
  planta, o prompt ou o aviso: clone o `#root` sem o `canvas`, ponha-o num `foreignObject` de um
  SVG do tamanho da viewport junto com o texto de todas as folhas de estilo (as fontes trocadas
  por `data:`), deixe `.museum` com fundo transparente, desenhe num canvas 2D o canvas do jogo
  logo depois de `__museumRender()` e, por cima, o SVG carregado como `data:` (como `blob:` o
  canvas fica contaminado). As regras de mídia valem para o tamanho do SVG, então o layout de
  toque sai certo em 844 × 390. Confira a geometria do DOM vivo antes de confiar no quadro.
- **Teleporte para dentro de um móvel não avisa.** Em (−6,5; 6,4) do saguão há um móvel com
  colisor (de x = −7,2 a −0,9, z = 5,8 a 7,2, com 1,3 m de altura): a câmera subiu para 1,81 m e
  o `W` parou em 40 cm. Leia o `y` depois de teleportar; o piso dá 1,62. Diante do atalho, pelo
  saguão, fique em x = −7,45 ou menos.
- **O botão de Ação está no DOM também no desktop**, escondido pela folha de estilos:
  `innerText` devolve «Ação». Visibilidade se lê da caixa e do estilo computado.
- **O painel reduz a página, e clique por coordenada erra.** Os botões do jogo foram acionados por
  eventos no próprio elemento; os direcionais, por `PointerEvent` com `pointerType: 'touch'` no
  elemento: `pointerdown` no centro, `pointermove` até a borda do anel, espera, `pointerup` (o
  direcional mede o arrasto a partir do primeiro contato, não do centro pintado).
- **Deixe a origem limpa pelo título.** O store grava ao descarregar a página do jogo; para
  terminar com o `localStorage` vazio, navegue até o título, espere e limpe ali.

### 11.11 Próximos passos

1. Fechar L2 de verdade: revisão adversarial (passo 5), revisor, push, deploy e fumaça (8 a 11).
   Na fumaça, além do novo jogo até o primeiro marco, «Continuar» com um save do lote anterior:
   `l1-route-end` posto sob a chave `volleyball-museum:v1` na origem de produção, e conferir que
   nada some e que a planta abre sem tranca listada. Vale abrir a produção em **duas abas** e
   repetir o que 11.8 fez no servidor local. Anotar a versão Cloudflare em §2 e no topo desta
   seção, e trocar o «Feito em» da seção L2 do plano pela forma publicada. A revisão adversarial
   (passo 5) está feita e não mudou o grafo; **se o revisor mudar, regravar o instantâneo**
   (`npm run graph:snapshot -- --reopen`) e fixar o digest novo no mesmo commit: até a
   publicação o portão exige o arquivo igual ao conteúdo.
2. **L3 (Posse).** Começa a rota por `l2-shortcut-released` e `l2-new-game-drawer-touched`. Paga
   as cinco dívidas com data dele (11.6). É o primeiro lote com gatilho de verdade: `flags` e
   `triggersFired` deixam de ser vazios, e o aviso de rollback de 11.7 passa a valer para eles.
   Muda o que o escritório desenha: mede os dez pontos e troca o `BROWSER_RECORD`. Escreve texto
   na tela de título e no jogo: o teto de `title` tem 202 bytes. Fecha na ordem de 11.10, com
   `docs/releases/L3.graph.json`, o digest dele fixado e um save próprio no corpus. Campo novo
   no save entra na tabela com a coluna `join` (a regra dele entre duas abas). Se `rememberRadioCall`
   ganhar subcampos (M9), o que a entrada já tinha continua nela. As falas do rádio com `when`
   por porta liberada podem voltar a dizer um lado; `test:opening` mede.
3. Do dono, ainda: o aparelho real (P0, item 6), que trava o livro-caixa de L6.

### 11.12 Revisão adversarial (passo 5 de §9.1), 2026-10-05

Cinco lentes (saves, fluxo, provas, testes, visual), 18 achados, 17 distintos (a semente lida do
ambiente apareceu em duas); cada um conferido de forma independente antes de chegar aqui. Seis
«major», nove «minor», dois de acabamento. Todos fechados num commit local, com `npm run check`
e `npm run build` verdes; nenhum datado, nenhum recusado. O que muda o desenho do lote está
escrito em `docs/lotes/L2-plano.md` §14, «Revisão adversarial».

| Achado | O que foi feito | Onde está provado |
|---|---|---|
| Uma aba que já estava aberta sobrescrevia o save que outra gravou depois: rebaixava `contentLot`, apagava campo desconhecido e progresso (major) | a aba lê o disco antes de toda escrita e no evento `storage`, e junta as duas cópias campo a campo (`joinProgress`; coluna `join` na tabela de campos); ajustes: os do disco mais os que esta aba mudou; «Novo jogo» não junta, e marca o jogo (`game`, ao lado do save) para que a aba com o jogo apagado fique com o disco; o relógio não anda para trás | `test:save`, oito casos com duas páginas sobre o mesmo storage (a aba que joga, a que só muda um ajuste, a que só tem o relógio e é ocultada, duas do mesmo build, a memória do rádio, «Novo jogo» nos dois sentidos, o que há ao lado do save, a junção campo a campo); `test:opening-flow`; duas abas reais no navegador (11.8) |
| Subcampo desconhecido da memória do rádio sumia na primeira chamada ao Jorge | `rememberRadioCall` grava por cima da entrada; `remember()` espalha a memória, como o outro ramo já fazia | `test:save`: pela ação do store e por um `placeRadioCall` de verdade, no estado e no disco |
| A dica do Jorge para a Ala 1 apontava o lado errado para quem entra pelo atalho | a fala não diz mais um lado, nas duas línguas e nas duas alturas; a linha de B.2 do plano também | `test:opening`: toda dica de sala escura que diga um lado é medida de toda porta por onde se entra com a sala escura (as quatro linhas antigas, acusadas pelo atalho a 21° à direita); `test:radio` e `test:opening-flow` (alvo e tamanho da fala) |
| `npm run graph:snapshot` reescrevia o instantâneo de um lote fechado, e nenhum portão percebia (major) | o script recusa com «Feito em» no plano, salvo `--reopen`; `--dry-run`; o SHA-256 de cada lote fechado fixado em `FROZEN_SNAPSHOTS` | `test:playthrough`: digest de todo lote feito, a recusa como função e pelo próprio script em modo de ensaio; mutação: recusa desligada |
| O portão comparava o conteúdo com o instantâneo mais novo, que no lote em andamento é o próprio conteúdo (major) | compara com o registro mais novo (`baselineSnapshot`): lote que o conteúdo deixou para trás, ou o próprio depois de publicado; só o rascunho, de L3 em diante, é `graph-snapshot-stale` | `test:playthrough`: L2 e o rascunho de L3 num diretório de teste, com o retrato sem a data acusado contra L2 e limpo contra o rascunho; mutação: voltar a ler o mais novo |
| O «Feito em», escrito antes da revisão e do push, desligava a comparação do instantâneo com o conteúdo (major) | `lastLotPublished`; a igualdade byte a byte vale até o plano dizer «e publicado»; textos corrigidos (11.10, 11.11, §9.1 e §6.4 do plano) | `test:docs` (o que conta e o que não conta como publicado); `test:playthrough`; mutação: um detalhe acrescentado ao conteúdo, que em `02f9992` deixava o `check` verde |
| O lint de numerais não lia a linha que só a aba Créditos imprime | `printedTexts` lê o `detail` de cada crédito, sob `credits:<id>` | `test:lints`: o ano num `reason`, num `modifications` e num `generator` |
| A mão do robô decidia pela régua de 5° da simulação, que o componente não tem | `examineReach` responde `shows` e `reachable`; a mão usa a da vista; o detalhe de cone estreito é exceção declarada e conferida (`luckyDetail`); textos de `simulate.ts`, `examineReach.ts` e da acusação corrigidos | `test:playthrough`: a fotografia gravada pelo store no museu real, 87 de 500 noites com ela, o fim comparado sem a sorte |
| Com `SEED` no ambiente o `check` jogava uma noite e passava (2 achados) | `-- --seed <n>`, validado de 1 a 500; a noite pedida é impressa (com o registro, mesmo quando para no meio) e as 500 são jogadas depois | `test:playthrough`: os argumentos, e nenhuma leitura do ambiente na suíte nem no robô |
| Detalhe opcional fora do alcance era pulado em silêncio | código `hotspot-unreachable`; `net-1897:socket` datado para L4 | `test:playthrough`: seis acusações e seis linhas; museu quebrado de propósito; a fita paga com o soquete ainda acusado |
| O colisor da base de peça que a inundação ganhou era uma cópia sem amarra ao componente (acabamento) | o registro do colisor preso em `MuseumScene.tsx`, `Containers.tsx` e `RoomFurniture.tsx` | `test:navigation`: quatro refactors a mais (dezessete) |
| Sem `.gitattributes`, num checkout com o Git padrão do Windows três suítes do lote reprovavam por CRLF (major) | `.gitattributes` (`* text=auto eol=lf`, binários nomeados); `scripts/lib/readText.ts` em toda leitura de texto das suítes | `test:docs` (a regra e nenhuma leitura crua em `scripts/`); a árvore inteira convertida para CRLF: trinta suítes verdes |
| A fiação não prendia os componentes a gravar o que `attemptLock` decide nem a lista de detalhes do save (major) | a sequência «pergunta, grava, abre o painel» nos dois componentes, a gravação no teclado e o terceiro argumento de `hotspotGrant` presos em `progressWiringProblems` | `test:locks` (cinco refactors a mais) e `test:triggers` (dois) |
| `condition-room-missing` para `roomsVisited` entrou sem caso | dois casos (num gatilho; numa chamada e numa dica do rádio) | `test:opening`; com a linha do validador tirada, os dois reprovam |
| No telefone a tranca tocada era listada abaixo da dobra do caderno | a página da planta é uma coluna e a planta cede; menos respiro em telas baixas | `test:map` (a forma das regras, com oito mutações); medido no navegador (11.8) |
| O «?» da planta tinha dois sentidos, e o do toco só era explicado num tooltip (acabamento) | cadeado na lista de trancas; o toco entra na legenda enquanto a planta desenha um | `test:map` (três refactors a mais); visto no navegador |
| Em 844 × 390, com save, os botões de idioma da tela de título ficavam fora da tela (anterior ao lote) | a tela rola e o painel é centrado por margem automática; menos respiro em telas baixas: cabe sem rolar | `test:map` (a forma das regras, com três mutações); medido no navegador (11.8) |

**O que não foi feito, e por quê.**

- **Os handlers não foram extraídos para funções puras** que o componente e o robô chamassem,
  que é a alternativa mais forte do achado da fiação. Mexe em três componentes com cobertura e
  muda de quem é o `interact`; fica para quem refizer o teclado e o exame (L4), com aviso ao dono.
  O que entrou é a amarra da linha, com a vizinhança dela.
- **O leitor de SVG não mudou** para juntar `<tspan>`: o verificador do achado não sustentou essa
  metade (nenhum SVG do museu parte um número), e ler as duas formas quando um exportador entrar
  é mais seguro que trocar uma pela outra agora.
- **A aba que adota um jogo recomeçado em outra aba não volta à tela de título.** O save fica
  certo; a cena dela é a do jogo antigo até recarregar. Levá-la ao título é trabalho de interface
  (L16).
- **Nenhuma captura nova.** As medidas estão em 11.8; os conjuntos `l2` e `l2-touch` continuam
  congelados no que mostravam.

**Vermelho primeiro.** Cada caso novo reprovou `02f9992` antes do conserto, pelo motivo certo:
«the old tab stamped the save down … 2 !== 3» e os outros sete de duas abas; «a field inside the
porter's memory is gone»; as quatro linhas da dica («says "esquerda", and for a player who walks
into holyoke by "holyoke-shortcut" holyoke-breaker is 21.0° to the right»); «.gitattributes is
missing», e depois as leituras cruas de vinte e cinco arquivos; «a refactor this check exists to catch went through», com
cinco nomes em `test:locks`, dois em `test:triggers` e quatro em `test:navigation`; «the Credits
tab's line for photo-morgan-1897 is not read»; sete problemas de forma na folha de estilos e dois
no componente da planta. Os casos que pedem função nova (`baselineSnapshot`,
`snapshotWriteRefusal`, `luckyDetail`, `seedAsked`, `lastLotPublished`) reprovaram por falta
dela e foram provados por mutação depois de verdes. `condition-room-missing` nasce verde, e é
provado tirando a linha do validador.

**O que os verificadores mediram e esta rodada repetiu.** A direção do quadro pelo atalho (21°
à direita); o digest do instantâneo (`0eae15c3eaba…`, o mesmo do fecho); `SEED=7` com uma noite
só e `pass` sob o nome das quinhentas (agora: 500 noites, com ou sem a variável); a linha da
tranca fora da página em 844 × 390 (agora dentro, com 13 px de sobra).
