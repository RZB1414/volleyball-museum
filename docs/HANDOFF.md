# Handoff — Museu do Voleibol

Atualizado em 2026-10-02 (a abertura no escritório, §9); o estado técnico das salas é
o de 2026-08-12. Este documento é o ponto de entrada para retomar o projeto sem
depender da conversa anterior.

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

Portão verde em 2026-08-12:

- conteúdo: 3 salas válidas;
- energia: 16/16;
- colisão: 24/24;
- kit e posicionamento: 253/253;
- runtime do kit: 19/19;
- runtime das salas: 15/15;
- LOD de salas: 20/20;
- aquecimento de GPU: verde;
- performance de render e projeção: 16/16;
- sinalização arquitetônica: 26/26;
- portas de transição: 29/29;
- controles móveis e modo imersivo: 13/13;
- navegação: 22/22;
- `npm run build`: verde.

O único aviso é o preexistente `react(only-export-components)` em `src/main.tsx:17`.
Deploy de produção: `https://volleyball-museum.renanbuiatti14.workers.dev`, versão
Cloudflare `a2cd24b2-f045-4644-b798-e7c74575aae7`.

Bake atual:

- **2.516 KB** de GLBs;
- **132.944 triângulos assados**;
- kit `public/models/kit.ed8bca0f.glb`: 1.864 KB, 92.056 triângulos, 152 nós;
- salas: `room-atrium.b214394f.glb`, `room-holyoke.aa0b5458.glb` e
  `room-office.a2144060.glb`.

Medição visual local em 1536 × 864, dentro do escritório aceso e vendo também o
átrio pelo portal:

- **55 draw calls**;
- **52.462 triângulos por frame**;
- **12 programas de shader**;
- 69 geometrias e 20 texturas.

Isso cumpre o alvo desktop (120 / 350k), o alvo mobile de triângulos (90k), o
orçamento global de shaders (25) e fica abaixo do teto duro mobile de draw calls
(100), mas ainda não chega ao alvo mobile de 45 draws. O total assado passou o alvo
móvel porque inclui bundles que nunca aparecem todos no mesmo frame. Não trate FPS
do navegador de agente como benchmark de Android.

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

6. **Colisão vem do manifesto assado.** Kit, containers e mounts usam a mesma
   transformação `sala × placement × nó`. Não recrie regras por nome no runtime.

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
npm run test:power
npm run test:opening
npm run test:collision
npm run test:kit
npm run test:kit-runtime
npm run test:room-runtime
npm run test:room-lod
npm run test:gpu-warmup
npm run test:render-performance
npm run test:transition-door
npm run test:mobile-controls
npm run test:navigation
npm run build
```

Rode `npm run check` antes de qualquer commit. Se mudar geradores, manifesto,
materiais ou colliders, rode `npm run bake` antes do check. Nunca corrija um teste
diminuindo sua cobertura.

O gate de kit soma a receita inteira (`root` + `root__*`) e limita cada prop a
2.500 triângulos. Os casos mais próximos do teto são `coat-stand` (2.440, com o
chapéu e o guarda-chuva), `office-flatfile` (2.336), `curator-desk` (2.300),
`door-leaf` e `door-leaf-right` (2.236 cada).

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
  gravidade no spawn.
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
