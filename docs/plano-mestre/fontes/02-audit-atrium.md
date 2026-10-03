# 02 — Auditoria do ÁTRIO (fluxo, interação, estado e UX)

Repositório: `C:\Users\rzbui\OneDrive\Documentos\Portfolio\Volleyball Museum` (main, `82756c4`, somente leitura).
Data: 2026-10-03. Mesmo método da auditoria do escritório (HANDOFF §9.1): ler os caminhos de
código, tentar refutar cada suspeita com simulação headless e só então registrar.

---

## 0. Método, evidências e limites

**Lido por inteiro:** `AGENTS.md`, `docs/HANDOFF.md`, `docs/ATRIO-BOLAS-HISTORICAS.md`,
`docs/concepts/PROMPTS.md`, `src/content/museum.ts`, `schema.ts`, `i18n/pt-BR.ts`, `spawn.ts`,
`legacySave.ts`, `media.authored.ts`, `src/scenes/MuseumScene.tsx`, `MuseumCanvas.tsx`, `MuseumApp.tsx`,
`src/state/store.ts`, `src/engine/` (`PowerControls.tsx`, `powerControlLightRig.ts`, `power.ts`,
`RoomLighting.tsx`, `galleryLightRig.ts`, `Interaction.tsx`, `interactionTarget.ts`, `primaryAction.ts`,
`TransitionDoors.tsx`, `transitionDoorState.ts`, `transitionDoorTopology.ts`, `transitionDoorPassage.ts`,
`transitionDoorCollision.ts`, `transitionDoorReveal.ts`, `portals.ts`, `roomLod.ts`, `RoomSignage.tsx`,
`RoomText.tsx`, `signageLayout.ts`, `RoomWallArt.tsx`, `FramedMedia.tsx`, `RoomFurniture.tsx`,
`roomDetailTargets.ts`, `Flashlight.tsx`, `flashlightRig.ts`, `PlayerController.tsx`, `materials.ts`,
`materialSpec.ts`, `deviceRules.ts`, `radioCall.ts`, `progressCondition.ts`, `Devices.tsx` (alvo e
diretor do rádio), `src/ui/` (`Hud.tsx`, `hudRules.ts`, `MuseumMap.tsx`, `mapGeometry.ts`, `Journal.tsx`,
`MobileControls.tsx`), `src/styles/museum.css` (HUD, exame, mapa, toque). **Lido em parte:**
`docs/PLANO-COMPLETO.md` (§1–3, §10–13), `docs/PLANO-DO-ZERO.md` (§2–4, §9), `docs/PESQUISA-CONTEUDO.md`
(bolas), `src/content/validate.ts` (energia, bake, montagem de parede), `scripts/bake.mjs`,
`scripts/bake/lib/glb.mjs`, `parts/fixtures.mjs` (quadro), `parts/atriumDecor.mjs` (plinto, púlpito,
recepção), `parts/interpretive.mjs` (placas), `parts/openings.mjs` (alizar), `scripts/test-navigation.ts`,
`test-kit-placement.mjs`, `test-kit-runtime.ts`.

**Executado (somente leitura):** `validate:content` (ok: 3 salas · 12 peças · 5 documentos · 1 tranca),
`test:power` 16/16, `test:signage` 26/26, `test:navigation` 55/55, `test:transition-door` 29/29,
`test:room-lod` 23/23, `test:kit-runtime` 26/26. `tsc`/`oxlint`/suíte completa não foram rodados.

**Simulações próprias** (scripts na pasta deste relatório, importam o código real do repositório sem
escrever nele):

| Script | O que prova |
|---|---|
| `atrium-colliders.mjs`, `atrium-shell.mjs` | limites e colisores assados de cada peça do átrio |
| `atrium-walk.mjs` | cápsula real (`movePlayer`) em 25 trajetos do átrio |
| `atrium-gaps.mjs` | vãos entre colisores e até as paredes |
| `breaker-ray.mjs` | raio de interação contra o proxy do quadro, de fora e de dentro |
| `examine-sim.mjs`, `laced-sweep.mjs` | quais hotspots são "vistos" no primeiro quadro do exame; eixo de giro |
| `bays.mjs`, `unused-kit.mjs` | sobreposição dos lambris; receitas do kit que nenhuma sala usa |

**Capturas** (feitas por outra tarefa deste mesmo fluxo, hoje em `wf3/captures/`): `wf3-a01…a34` (átrio
aceso), `wf3-d01…d18` (átrio apagado, com e sem lanterna, e exame). Usei-as para confirmar o que o
código já indicava.

**Marcação de confiança em cada item:** `[C]` confirmado lendo o código · `[S]` confirmado por simulação
· `[V]` confirmado em captura · `[?]` deduzido dos números, falta olhar no motor.

**Limites:** não rodei o jogo. Efeitos puramente visuais marcados `[?]` precisam de uma olhada no dev
server antes de virar tarefa.

---

## 1. Resumo

O caminho crítico **funciona**: sair do escritório, cruzar o átrio no escuro, achar o piloto vermelho,
religar, entrar na Holyoke. Não há travamento de código no átrio (navegação 55/55; a linha reta da porta do
escritório até o quadro chega em 6,1 s contornando o anel do plinto `[S]`).

O que está errado é de outra natureza:

1. **O átrio quase não tem jogo.** São 18 × 18 m com **5 interações** (1 quadro, 4 bolas) e 2 portas úteis.
   Plinto, recepção, púlpito, torre de troféus, parede de orientação, lounge, caixa de doação, gavetas:
   tudo visível, nada responde, nada explica (§4).
2. **O roteiro termina num objeto inerte.** A última dica do Jorge e o bilhete do Otávio mandam o jogador
   para "três medalhas e um cofre embaixo do átrio"; o plinto tem **quatro botões**, nenhuma tranca,
   nenhum acesso ao subsolo (D1). É o único item que classifico como **bloqueador** — não de código, do
   objetivo "100% jogável até o final".
3. **O "apagão" não é um apagão.** Fitas de luz, pendentes, o rebaixo do teto e os banners continuam
   acesos sem energia; o teto, que o plano guarda para o clímax, já se vê do primeiro passo (B1). E o
   quadro do átrio hoje gasta, no minuto 2, a "luz geral" que o plano reserva para o final (B2).
4. **O verbo central (examinar e girar) tem três defeitos** que aparecem já na primeira peça do jogo:
   eixo de inclinação errado (C1), painel por cima do objeto (C2), e a bola de cadarço que se cataloga
   sozinha sem girar (C3).
5. **A única interação obrigatória da sala some quando o jogador encosta nela** (A1).

Contagem: **1 bloqueador (de roteiro) · 9 graves · 16 menores · 11 de acabamento**.

---

## 2. O que um jogador de primeira viagem vive hoje

| Momento | O que acontece | O que ele entende |
|---|---|---|
| Porta do escritório abre | Vê a sala inteira em penumbra: paredes, murais, teto com a moldura de luz acesa, banners vermelhos e azuis brilhando, fita de luz da recepção, halo do plinto, letreiro "HOLYOKE" branco, e um clarão vermelho à direita dele (`wf3-d01`) | "Não está tão escuro." A lanterna é dispensável; o tamanho da sala já está dado |
| Atravessa (≈6 s) | Esbarra no anel de latão do plinto e desliza em volta | Nada |
| Chega ao clarão vermelho | Prompt "E Restaurar energia — Quadro geral do átrio" aparece a 2,7 m. Se continuar andando até a parede, **o prompt some e o quadro desaparece** (A1) | "Quebrou?" Dá um passo atrás e volta |
| Aperta E | Toast + sino. A luz muda de uma vez, quase toda atrás dele. O quadro fica idêntico. O Jorge não diz nada (A4) | "Era isso?" |
| Olha em volta | Plinto cercado com 4 discos; recepção com monitores; púlpito em branco; mapa-múndi sem legenda; torre com troféus; console com 4 bolas | Tenta E em tudo. Só as bolas respondem |
| Examina a bola de cadarço | Em metade das posições ela é catalogada no ato, sem girar (C3) | Não aprende a girar |
| Examina as outras | Precisa girar; se estiver de lado, arrastar para cima **rola** a bola (C1); o painel de texto cobre a metade de baixo dela (C2) | Frustração leve |
| Porta sem placa ao sul | "Abre pelo outro lado" — para sempre, mesmo depois de usá-la por dentro (G1) | Dívida de curiosidade que nunca é paga |
| Depois de abrir a gaveta 1896 | Jorge: "três medalhas e um cofre embaixo do átrio". Volta ao plinto: nada (D1) | Fim sem fim |

---

## 3. Defeitos

Formato: **gravidade** · onde · cenário · correção · teste que deve travar.

### A. Chegada e quadro de energia

#### A1 — O prompt some e a câmera entra no quadro quando o jogador encosta nele — **grave** `[C][S]`
- **Onde:** `src/engine/PowerControls.tsx:131-147` (proxy = limites da peça com mínimo `[0.42, 0.48, 0.34]`),
  `:163-166` (`<meshBasicMaterial />`, face única), `src/content/museum.ts:909`
  (`position: [-8.62, 1.05, -4.4]`), manifesto do bake (`breaker-panel` e `atrium-wall-bay-plain` **sem colisor**).
- **Números:** reboco em x = −8,875; face do lambri em −8,725; fundo do quadro em −8,62; caixa do quadro
  x ∈ [−8,620; −8,453], y ∈ [1,05; 1,69]; proxy x ∈ [−8,666; −8,325]. A cápsula real para em **x = −8,539**
  (`atrium-walk.mjs`), com o olho a 1,62 m: **dentro** da caixa do quadro e dentro do proxy. Raio lançado
  de dentro de uma caixa de face única não acerta nada: `breaker-ray.mjs` dá acerto até x = −8,30 e
  **nenhum acerto de x = −8,33 até a parede**.
- **Cenário:** átrio apagado; andar reto para a luz vermelha segurando W até parar. O prompt aparece a
  2,7 m e some nos últimos 21 cm; a caixa do quadro deixa de ser desenhada (a câmera está dentro dela);
  E não faz nada. Um passo para trás e tudo volta.
- **Correção:** (1) proxies de interação com `side: DoubleSide` (quadro, rádio, caderno, armários), para
  que o olho dentro do volume continue acertando; (2) dar colisor ao `breaker-panel` e montá-lo de fato na
  parede (ver A2); (3) regra geral: nenhum alvo de interação pode conter o ponto mais próximo que a
  cápsula alcança.
- **Teste:** `test:power` — "do ponto onde a cápsula para diante de cada controle (movePlayer no mundo
  real), o raio do centro da tela acerta o proxy"; e "um raio com origem dentro do proxy ainda o acerta".

#### A2 — Quadro e arte de parede afastados da parede; a validação só cobre peças do acervo — **menor** `[C][?]`
- **Onde:** `src/content/validate.ts:206-247` (`validatePower` só exige "dentro da sala ±0,15 m"),
  `:1281-1345` (`validateWallMounts` olha apenas `exhibit.mount === 'wall'`); `museum.ts:909` (quadro),
  `:1109` (mural de orientação), `:1120`/`:1131` (murais), `:1095` (dedicatória).
- **Números:** o quadro fica **10,5 cm à frente do lambri** e **25,5 cm à frente do reboco** no trecho acima
  de 1,48 m (o lambri termina ali e o quadro vai de 1,05 a 1,69 m). O mural de orientação (x = −8,68,
  y 0,93–2,17) fica 4,5 cm à frente dos lambris e **19,5 cm solto do reboco** acima de 1,48 m. Murais e
  painel de dedicatória: 3,5 cm de folga atrás (8,84 contra 8,875). De frente não se nota (`wf3-a15`,
  `wf3-d07`); de lado deve aparecer como placa flutuando (`wf3-a31` sugere o bloco solto do quadro).
- **Correção:** assentar no reboco (x = ±8,875) ou no lambri de propósito, e recortar/omitir o lambri atrás
  do quadro; estender `validateWallMounts` a `powerControl`, `wallArt`, `signage` e `devices` de parede
  ("o fundo da peça está a ≤ 6 mm de uma superfície de apoio em toda a sua altura").
- **Teste:** `validate:content` — erro `wall-fixture-off-the-wall` para qualquer peça de parede fora da
  tolerância; reprova a posição atual do quadro.

#### A3 — "Procure a luzinha vermelha": o quadro não tem lente vermelha nem muda de estado — **menor** `[C][V]`
- **Onde:** `scripts/bake.mjs:739-744` (`indicator: 'glass-green'`, vidro verde sem emissão),
  `src/engine/powerControlLightRig.ts:58-67` (o vermelho é só uma point light `#d65a3a`, 3,2, alcance
  2,4 m), `scripts/bake/parts/fixtures.mjs:647-661` (alavanca fixa na pose "desligada").
- **Cenário:** apagado, a lente aparece como ponto verde-oliva/branco no meio do clarão vermelho
  (`wf3-d02`, `wf3-d07`). Depois de religado, nada no objeto muda: mesma alavanca, mesma lente, só o
  clarão some — o quadro vira uma caixa preta num canto sem luz (`wf3-a17`).
- **Correção:** reutilizar o que o escritório já tem: lente `led-red` → `led-green` (`useLensMaterial` em
  `Devices.tsx:247`), alavanca num pivô que desce no E, e manter a point light pequena (0,6–0,8 m) só como
  halo. O quadro passa a ser um `device` com estado, não uma peça morta.
- **Teste:** `validateBake` exige `breaker-panel__led` e `__lever`; `test:power` prova a troca de material
  e o ângulo da alavanca pelos dois estados.

#### A4 — Religar o átrio não tem resposta do mundo, e o clarão acontece fora do quadro — **grave** `[C]`
- **Onde:** `PowerControls.tsx:221` (`powerRoom` e mais nada), `RoomLighting.tsx:131-139` (intensidade
  troca de 0 para cheio no mesmo quadro), `src/ui/Hud.tsx:428-459` (toast + `chime`),
  `src/engine/audio.ts` (não existe som de disjuntor, relé ou reator), `museum.ts:819-852` (o rádio tem só
  três chamadas; nenhuma reage a energia restaurada).
- **Cenário:** o comentário de `museum.ts:898-900` chama este momento de "o maior pagamento do build". O
  jogador está a ≤ 2,7 m da parede oeste, de frente para ela; quatro dos cinco focos acendem atrás dele.
  Ouve um sino de interface. O Jorge fica mudo — só responde se for chamado.
- **Correção:** encenar: (1) som de alavanca + relés em sequência (`audio.ts`); (2) acender os slots em
  cascata de longe para perto em ~1,2 s (o pool já é fixo, é só interpolar intensidades — não mexe em
  programas de shader); (3) chamada de conteúdo `porter-atrium-lit` (`when: { powered: ['atrium'] }`),
  que também dá o próximo passo; (4) idem para Holyoke e para "todas as salas".
- **Teste:** `test:radio` — a chamada toca uma vez ao religar, em ordem, e não repete em save antigo
  (precisa entrar em `PRE_OPENING_SAVE`/`migrateProgress`); `test:power` — função pura
  `powerRampIntensity(t)` monotônica e que termina no valor atual.

#### A5 — As instruções usam "parede oeste" e o jogo não tem bússola — **menor** `[C]`
- **Onde:** `pt-BR.ts:169`, `:177`, `:193` (e `en.ts:155`, `:178`); `src/ui/MuseumMap.tsx:189-191`
  (marcador é um círculo, sem direção; a planta não tem norte).
- **Cenário:** o jogador sai pela parede leste olhando para oeste, então "oeste" é "em frente" — mas nada
  lhe diz isso. Hoje ele se salva porque o piloto é visível da porta (`wf3-d01`).
- **Correção:** direção relativa na fala ("do outro lado do saguão, à direita da entrada da Ala 1"), rosa
  dos ventos na planta e marcador com seta de direção.
- **Teste:** `validateTranslations` — lista de palavras cardeais proibidas em falas de dica enquanto a
  planta não desenhar o norte; `test:opening-flow` — o marcador recebe o yaw.

#### A6 — Três arestas do rádio na passagem escritório → átrio — **menor** `[C]`
- **Onde:** `src/engine/Devices.tsx:527-538` e `deviceRules.ts:154-162` (o "alcance do ouvido" só é
  checado no **início** da entrega), `Hud.tsx:218-268` (a legenda aparece em qualquer sala),
  `deviceRules.ts:88-98` + `museum.ts:821-832` (a primeira chamada exige `unpowered: ['atrium']`),
  `radioCall.ts:103-108` (uma fala só caduca quando um modal a segurou).
- **Cenários:** (a) com o rádio **deixado na mesa**, uma chamada iniciada no escritório continua
  legendando no átrio — contradiz a regra de §9.7; (b) quem religa o átrio com a primeira chamada ainda no
  ar continua lendo "procure a luzinha vermelha"; (c) quem religa o átrio antes de ouvir a primeira
  chamada nunca é apresentado ao Jorge nem ouve "não desce no subsolo".
- **Correção:** suspender/retomar a transmissão ao sair do alcance; cortar para uma fala de reação quando
  a condição da fala cai; separar a apresentação do Jorge (sempre devida) da instrução do quadro.
- **Teste:** `test:radio` — os três cenários, pelo caminho real de `placeRadioCall`/diretor.

### B. Luz apagada e acesa

#### B1 — Sem energia, as luzes do átrio continuam acesas — **grave** `[C][V]`
- **Onde:** `scripts/bake/lib/glb.mjs:87` (`atrium-glow`, emissivo 2,2 fixo), `scripts/bake.mjs:961-1060`
  (usado na fita da recepção, no halo do plinto, no púlpito, na torre, no rebaixo do teto e na cabeça dos 9
  pendentes), `src/engine/materialSpec.ts:54-57` (emissão copiada uma vez, sem ligação com energia),
  `RoomWallArt.tsx:149-157` + `museum.ts:1114`, `:1125`, `:1136`, `:1147-1181` (banners com
  `selfIllumination: 0.85`, sempre), `RoomText.tsx:122-131` (texto Troika é `MeshBasicMaterial`: não
  depende de luz).
- **Cenário:** `wf3-d01` (porta do escritório, apagado, sem lanterna): banners vivos, moldura do teto
  acesa, quatro luzes do gaveteiro, fita da recepção, halo do plinto, letreiro branco. `wf3-d10`: o teto
  inteiro delineado pela fita. O caderno diz "a tempestade derrubou a energia do museu inteiro".
- **Consequência de roteiro:** `flashlightRig.ts:9-13` e `PLANO-DO-ZERO §3` garantem que a lanterna nunca
  alcança o teto para que ele seja a revelação do final. O teto já está revelado no primeiro passo.
- **Correção:** emissão por estado de energia da sala. A emissão é uniform, não define: basta um material
  por sala (clone de `atrium-glow`) com intensidade 0 sem energia — zero programa novo. Mesma regra para
  `selfIllumination` da arte de parede. Se o dono quiser "luz de emergência a bateria", declarar isso em
  dado (`emergency: true`) só para o que estiver ao nível do piso, nunca para teto e pendentes. Para o
  texto: decidir entre placa fotoluminescente (só as de porta, mais escuras) ou material iluminado.
- **Teste:** `test:materials` — "toda família emissiva usada em `room.kit` tem intensidade 0 quando a sala
  dona está sem energia"; `test:room-runtime` — o grupo da sala apagada não contém material com
  `emissiveIntensity > 0` fora da lista de emergência.

#### B2 — O quadro do átrio acende a "luz geral" no minuto 2 — o plano a guarda para o final — **grave (roteiro)** `[C]`
- **Onde:** `museum.ts:898-913`; `pt-BR.ts:139` ("Quadro **geral** do átrio"; em inglês "main breaker");
  `PLANO-COMPLETO.md §11` passos 1–2 ("as luzes gerais do átrio acendem pela primeira vez… é o maior
  momento do jogo"); `PLANO-DO-ZERO.md §3` e Fase 3; `HANDOFF.md §7.5` (ideia já aprovada pelo dono:
  "quadro do átrio religando só a luz de serviço; o disjuntor GERAL fica para o final").
- **Correção:** dois níveis de energia em dado (`service` e `house`). O quadro de hoje vira "quadro de
  serviço" (os cinco focos baixos, sem lavagem de teto); a luz geral (rebaixo, pendentes, instalação aérea,
  lavagem alta) fica presa ao plinto. Renomear a chave `power.atrium.title`.
- **Teste:** `test:power` — `roomLightTier('atrium', progress)` devolve `service` após o quadro e `house`
  só com a condição final; `validateOpening` — nenhuma sala declara `house` sem um gatilho.

#### B3 — Abrir qualquer porta apaga quatro dos cinco focos do átrio — **acabamento** `[C][?]`
- **Onde:** `galleryLightRig.ts:93-141` (a sala de origem fica com 2 slots: 1 foco + lavagem),
  `MuseumScene.tsx:849-857` (a sala revelada vira "primária" no instante em que a porta começa a abrir).
- **Cenário:** átrio aceso; E na porta da Holyoke; recepção, parede de orientação, torre e console perdem
  o foco enquanto o jogador ainda está no átrio. Se ele desistir e voltar, vê a sala mais escura até a
  porta fechar. De frente para a porta o efeito deve ser discreto.
- **Correção:** transferir os slots só quando a cápsula cruza o plano da porta, ou interpolar.
- **Teste:** `test:room-lod`/novo caso em `test:transition-door` — a assinatura de luz da sala onde o
  jogador está não muda entre "porta fechada" e "porta abrindo".

#### B4 — Luzes sem sombra atravessam a parede entre os dois quadros — **menor** `[C][?]`
- **Onde:** `museum.ts:909` (quadro do átrio em x = −8,62, z = −4,4) e `:1230` (quadro da Holyoke, no
  mundo em x = −9,39, z = −4,2): estão **costas com costas, a 0,77 m**. Pilotos com alcance de 2,4 m
  (`powerControlLightRig.ts:61-66`).
- **Cenário:** átrio aceso, Holyoke apagada, E na porta: o piloto da Holyoke passa a existir e ilumina o
  **piso do átrio** junto ao quadro já religado (estimativa: ~0,5 contra ~0,9 da luz normal). O foco da
  parede de orientação também atravessa e põe uma poça quente no piso da Holyoke escura (~0,7).
- **Correção:** afastar os quadros ao longo da parede (≥ 2,5 m) ou reduzir o alcance do piloto a ≤ 0,8 m e
  deixar a lente emissiva fazer o trabalho (A3).
- **Teste:** `test:power` — "nenhum piloto alcança o interior de outra sala": distância do piloto ao plano
  da parede vizinha ≥ alcance.

#### B5 — Examinar no escuro: a peça quase não se vê; a lanterna fica acesa depois do religamento — **acabamento** `[V][C]`
- **Onde:** `flashlightRig.ts:44` (`examineScale: 0.4`), `Hud.tsx:709-727` (no toque, as ferramentas somem
  durante o exame: não dá para acender a lanterna sem fechar).
- **Cenário:** `wf3-d17` — a bola de cadarço examinada no átrio apagado é uma esfera quase preta.
- **Correção:** luz de mão própria do exame (fraca, quente, independente da lanterna); botão de lanterna
  visível durante o exame no toque; ao religar a sala, sugerir apagar a lanterna.
- **Teste:** `test:materials` — luminância mínima da face voltada à câmera no exame, sala apagada.

#### B6 — Não existe tela de ajustes (brilho) — **menor, transversal** `[C]`
- **Onde:** `store.ts:38-40` (o brilho existe "porque a linguagem do escuro é ilegível num celular à luz
  do dia"), mas só `locale` tem controle (`MuseumApp.tsx:103-114`). O ambiente PMREM é assado uma vez
  (`MuseumScene.tsx:726`), então mudar o brilho depois não o refaz.
- **Teste:** `test:opening-flow` — regra pura dos ajustes; ambiente re-renderiza ao mudar o brilho.

### C. Vitrine das bolas e modo examinar

#### C1 — O eixo de inclinação é o X do mundo, não a direita da câmera — **grave** `[C][S]`
- **Onde:** `src/engine/Interaction.tsx:339-348` (`axis.set(1, 0, 0)` com `premultiply`; o comentário diz
  "pitch about the camera's right").
- **Números** (`examine-sim.mjs`): olhando para o norte, X do mundo = direita da câmera (certo); para o
  sul = −direita (**inclinação invertida**); para leste/oeste = eixo de visão (**arrastar para cima rola**
  o objeto como um volante).
- **Cenário no átrio:** parar na ponta leste do console (x ≈ 0,95, z ≈ −8,2; a cápsula chega lá `[S]`),
  olhar para oeste, examinar a bola de 2008, arrastar na vertical. Na Holyoke é pior: a vitrine sul
  inverte e as peças das paredes leste/oeste rolam.
- **Correção:** girar em torno de `right = (1,0,0).applyQuaternion(camera.quaternion)` (ou da direita
  horizontal). Extrair `examineRotation(drag, cameraQuaternion)` como função pura.
- **Teste:** novo `test:examine` — para os quatro rumos, arrastar para cima traz o polo de cima do objeto
  para a câmera.

#### C2 — O painel de texto cobre a metade de baixo do objeto, e arrastar sobre ele gira o objeto — **grave (pior no celular)** `[C]`
- **Onde:** `src/styles/museum.css:273-296` (`.examine-panel`: ancorado embaixo, `max-height: 46vh`,
  `overflow-y: auto`, sem regra para toque), `Interaction.tsx:166` (objeto a 0,42 m, sempre no centro),
  `:235-240` e `:255-259` (`pointerdown`/`pointermove` no `window`, sem olhar o alvo).
- **Números:** bola de 21 cm a 0,42 m com FOV de 62° ocupa 42% da altura, centrada em 50%. Em 844 × 390 o
  painel sobe até ~195 px: exatamente o centro. No desktop a 720p, com etiqueta + ficha + hotspots, o
  painel também bate nos 46vh.
- **Cenário:** examinar qualquer bola; rolar o texto do painel (toque ou mouse) gira a bola; tocar em
  "Fechar" dá um tranco na rotação.
- **Correção:** em paisagem, painel em coluna lateral (≤ 38% da largura) e objeto deslocado para o centro
  da área livre; filtrar `pointerdown` cujo alvo esteja dentro de `.examine-panel`; distância de exame
  proporcional ao raio da peça.
- **Teste:** `test:examine` — `examineLayout(viewport)` garante que o retângulo do objeto e o do painel
  não se cruzam em 1280×720 e 844×390; `shouldStartExamineDrag(target)` falso para alvos do painel.

#### C3 — A bola de cadarço é catalogada no primeiro quadro, sem girar — **grave** `[C][S]`
- **Onde:** `museum.ts:163-180` (o único hotspot obrigatório, `lacing`, fica em `[0, 0, 0.106]`, e o
  comentário pede o fecho "na face voltada ao visitante"), `Interaction.tsx:364-396` (basta
  `outward · toCamera > 0,55`, sem exigir arrasto).
- **Números** (`laced-sweep.mjs`): de 510 posições ao alcance, **250 (49%)** catalogam no ato. As outras
  três bolas: 0%.
- **Cenário:** é a primeira peça do jogo que a maioria vai tocar (a mais próxima do quadro). Toast
  "Catálogo — Couro, costura e cadarço" antes de qualquer gesto: ensina o contrário da regra central
  ("o que conta está no verso").
- **Correção:** hotspot obrigatório no verso (a marca/painel oposto) e o cadarço como opcional; e regra de
  motor: um hotspot só conta depois de o jogador ter girado ≥ N graus neste exame.
- **Teste:** `validate:content` — erro `hotspot-visible-at-pickup` se um obrigatório estiver a menos de
  ~75° da face de exposição; `test:examine` — nenhum registro com arrasto acumulado zero.

#### C4 — A vitrine do átrio entrega as peças-herói das Alas 3, 5 e 6 e revela o código 1998 — **grave (roteiro)** `[C]`
- **Onde:** `museum.ts:159-270`; `pt-BR.ts:288-292` ("No Mundial de **1998**, a bola oficial passou a usar
  branco, amarelo e azul…").
- **Conflitos com o plano:** `PLANO-COMPLETO §3` código nº 6 (Ala 5: `1998`, "ano em que a bola branca foi
  aposentada", lido "nas duas bolas lado a lado") e a regra de fonte única (§13.2); `§2.3` (fio `ball`:
  seis nós, **um por ala**; Tóquio 1964 é o herói da Ala 3, a tricolor o da Ala 5, a MVA200 o da Ala 6);
  `PLANO-DO-ZERO §4.3` ("catalogar as 6 destrava a vitrine central do átrio").
- **Hoje:** quatro nós do fio `ball` estão no hub, catalogáveis no minuto 3, com `era: 'tokyo' |
  'rewrite' | 'global'` (`museum.ts:191`, `:218`, `:245`) apontando para alas que não existem.
- **Correção (duas saídas, precisa de decisão):** (a) a vitrine do átrio começa **vazia**, com quatro (ou
  seis) berços e plaquetas de data, e cada bola aparece nela quando o jogador cataloga a original na ala —
  vira o placar físico do fio e a recompensa prometida; ou (b) mantém as bolas como "linha do tempo de
  boas-vindas", sem `threads`, sem ano que seja código, e as alas usam peças diferentes. Em qualquer
  caso, tirar "1998" da etiqueta do átrio.
- **Teste:** lint de exclusividade de numerais no `validate:content` (o próprio plano pede em §13.2):
  nenhum valor de `Fact.usedAsCode` aparece em texto fora da peça-fonte.

#### C5 — Bolas são alvos pequenos, e o raio de exame atravessa móveis — **menor** `[C]`
- **Onde:** `Interaction.tsx:131-148` (o raio testa a malha de 21 cm; controles e rádio têm volume mínimo
  em `interactionTarget.ts:38-42`, peças não), `:92-120` (a lista de alvos ignora o que está no caminho).
- **Cenário:** no toque, mirar uma esfera de 21 cm com o direcional é difícil; do outro lado do biombo
  (a 2,5 m) dá para "pegar" a bola através dele.
- **Correção:** proxy mínimo (~0,35 m) por peça pequena; oclusão por colisores entre olho e peça.
- **Teste:** `test:examine` — cada peça tem volume de mira ≥ mínimo; uma peça atrás de um colisor não é focada.

#### C6 — Atritos do exame — **acabamento** `[C]`
- `Interaction.tsx:216` solta o ponteiro a cada exame; ao fechar, "Clique para olhar" de novo (quatro
  vezes só nesta vitrine). Girar com o ponteiro travado (`movementX/Y`) elimina o clique.
- `Hud.tsx:351-362`: o `*` dos hotspots obrigatórios não tem legenda; nada indica **para onde** girar
  (só "0 / 1" e "— — —"). Sugestão: depois de ~8 s, um brilho na borda do lado certo.
- A ficha de catálogo só existe no painel; não há texto no mundo (ver E1, placas de latão em branco).

#### C7 — Acabamento da vitrine — **acabamento** `[V]`
- `wf3-a07`: as quatro placas de latão à frente das bolas não têm gravação nenhuma.
- `wf3-a10`: a tricolor de 1998 mostra polígonos brancos dentro do gomo amarelo e a de 2008 uma serrilha
  de pontos azuis na borda dos gomos — máscara de painéis com ilhas. (Para a frente de assets.)
- Texto: a etiqueta usa "dimples" três vezes; o plano escreve "covinhas".
- O console tem três gavetas com puxadores que não abrem (ver E1).

### D. Plinto central

#### D1 — O fim do jogo aponta para um objeto inerte — **bloqueador (de roteiro)** `[C][V]`
- **Onde:** `scripts/bake/parts/atriumDecor.mjs:562-663` (o plinto é "a raked **four-button**
  interpretation surface"; o campo de 0,72 × 0,34 m para um painel de runtime nunca foi usado),
  `museum.ts:975-989` (comentário: "three medallions slot into it… nothing does yet"), `:132-147`
  (`LOCKS` tem só `office-drawer`; não existe tranca `medallion-plinth`), `:876` + `pt-BR.ts:183`
  (última dica: "três medalhas e um cofre embaixo do átrio"), `pt-BR.ts:102` (bilhete do Otávio),
  `:162` (item do caderno "Cofre — só o Otávio sabia abrir", sem `doneWhen`),
  `public/textures/media/atrium-orientation-wall.svg` ("seis medalhões"), `docs/concepts/PROMPTS.md`
  ("plinto com três encaixes de medalha"), `PLANO-COMPLETO §2.2` ("três soquetes de bronze vazios").
- **Três números para a mesma coisa:** 3 medalhas na história, **4** discos no plinto (`wf3-a03`), **6**
  medalhões na parede de orientação (`wf3-a15`). A receita `medallion-socket` está assada (1.432
  triângulos) e nenhuma sala a usa.
- **Cenário:** abrir a gaveta 1896, ler o bilhete, chamar o Jorge, voltar ao átrio: nenhum prompt no
  plinto, nenhuma escada, nenhuma medalha no mundo, nenhuma tela de fim. O terceiro item do caderno nunca
  se risca.
- **Correção mínima para a fatia atual ter fim:** plinto com 3 soquetes reais + tranca `medallion-plinth`
  nos dados + prompt ("Faltam três medalhas") + anotação na planta; e um final provisório honesto. A
  correção completa é o roteiro das alas (fora do escopo desta auditoria).
- **Teste:** `validateSolvability` — existe um estado final alcançável e todo `hint` cujo `when` é `{}`
  aponta para algo que tem interação; `validate:content` — número de soquetes = número de `MedallionId`.

#### D2 — "Não desce no subsolo, que alagou": não há por onde descer — **menor (roteiro)** `[C]`
- **Onde:** `pt-BR.ts:170-171`; `PLANO-COMPLETO §11` (a escada só aparece quando o plinto gira).
- **Problema:** a fala pressupõe um acesso conhecido; o átrio não tem porta, alçapão nem escada. Ou existe
  uma escada de serviço visível e interditada (e a goteira/claraboia de `HANDOFF §7.5` a justifica), ou a
  fala muda. Como está, o jogador procura uma descida que não existe.
- **Teste:** `validateOpening` — todo lugar citado numa fala existe como sala, porta ou peça nomeada.

### E. Coisas que se veem e não se usam

#### E1 — Inventário (cada linha é um "tentei E e nada") — **menor, em conjunto grave para "bom de explorar"** `[C][V]`

| # | O que o jogador vê | Captura | Estado |
|---|---|---|---|
| 1 | Plinto com 4 discos, halo aceso, cercado por anel de latão | `a02`, `a03` | sem prompt (D1) |
| 2 | Balcão de recepção: 2 monitores, teclado, luminária, 2 cadeiras, fita de luz | `a04`–`a06` | sem prompt; o teste fala em "future computer positions" (`test-navigation.ts:700`); `atriumDecor.mjs:180` reserva lugar para um letreiro que não existe |
| 3 | Gaveteiro de parede atrás do balcão (dezenas de gavetas, 4 luzes) | `a04`, `a06` | não abre — e "abrir gaveta e ler" é o verbo da camada de arquivo |
| 4 | Três gavetas com puxador no console das bolas | `a07` | não abrem |
| 5 | Caixa de doação com vidro e fenda | `a26` | sem prompt |
| 6 | Fila de cordas (5 pedestais, 4 cordas) | `a04` | atravessável (H1) |
| 7 | Púlpito com tampo **em branco** e fita de luz, com um pendente só para ele | `a16` | o gerador previa um painel de 0,72 × 0,34 m (`atriumDecor.mjs:933-938`) |
| 8 | Parede de orientação: mapa-múndi abstrato + 6 medalhões, sem uma palavra | `a15` | não orienta nada; a placa da sala diz "ORIENTAÇÃO" |
| 9 | Torre-vitrine com 3 troféus e cartelas em branco, com pendente dedicado | `a13` | sem prompt, sem etiqueta |
| 10 | Lounge (2 poltronas, mesas), sofá | `a14` | cenário |
| 11 | Três biombos de malha de latão | `a28` | cenário; um deles tapa a dedicatória (F1) |
| 12 | Dois murais de 3,45 × 5 m e quatro banners | `a24`, `a25`, `a33` | sem legenda |
| 13 | Instalação aérea (rede e trajetórias) | `a22` | sem explicação |
| 14 | Porta sem placa na parede oeste | `a21` | "Abre pelo outro lado" (G1) |
| 15 | Quadro depois de religado | `a17` | objeto morto (A3) |
| 16 | Som | — | nenhum: `museum.ts:1191-1199` declara `ambience/atrium-drip`, mas `RoomData.audio` não tem leitor |
| 17 | Subsolo, mezanino, portas das Alas 2–6 | — | não existem; a planta do escritório mostra todos |

- **Correção:** cada objeto precisa de uma destas três coisas: uma interação, uma informação, ou sair da
  sala. Já existem receitas assadas e sem uso para isso: `interp-panel` (1.164 tri), `label-plaque` (588),
  `atrium-wall-bay` com placa de informação (924), `medallion-socket` (1.432) — ver K3.
- **Teste:** `validate:content` — aviso `kit-looks-interactive` para receita marcada `affordance: drawer |
  screen | case | lectern` sem conteúdo ligado.

### F. Sinalização, placas e arte de parede

#### F1 — Painel de dedicatória: parede errada no comentário, tapado pelo biombo, linha viúva — **menor** `[C][V]`
- **Onde:** `museum.ts:1080-1104` (o comentário fala da "north face"; a placa está em `[8.84, 2.75, -2.4]`,
  parede **leste**, a mesma da porta do escritório), `:1035-1039` (biombo em `[6.8, 0, -3.8]`, 2,4 m de
  altura, 2 m à frente da placa), `:1032` (torre), `RoomSignage.tsx:34-103`.
- **Cenário:** quem chega do escritório tem a placa **às costas**; só a vê voltando da Holyoke
  (`wf3-a29`), e de qualquer ponto do meio da sala o biombo cobre o começo das três linhas (`wf3-a20`).
  Em pt-BR o corpo quebra deixando "demais." sozinho (`wf3-a30`); o terço direito da placa (relevo de bola
  em nogueira sobre nogueira) parece vazio.
- **Correção:** levar a dedicatória para a parede que o jogador encara ao entrar (oeste, entre as duas
  portas) ou afastar biombo e torre; `maxWidth` 3,75 ou texto mais curto; dar ao relevo um filete de latão.
- **Teste:** `test:signage` — nenhum colisor mais alto que a borda inferior da placa entre ela e os pontos
  de leitura a 4–8 m; o corpo em pt-BR e en não deixa linha com uma palavra.

#### F2 — Texto de placa não é iluminado — **menor** `[C][V]`
- **Onde:** `RoomText.tsx:122-131`. Ver B1: no apagão as letras flutuam acesas (`wf3-d01`, `wf3-d02`).

#### F3 — Atalho sem placa; nome do museu em duas versões — **acabamento** `[C]`
- `museum.ts:962-964` (`sign: false`): a porta de serviço é idêntica às outras e não diz o que é
  (`wf3-a21`). Uma plaqueta "SERVIÇO" e a barra antipânico visível dariam sentido ao "abre pelo outro lado".
- "Museu do Vôlei" (`pt-BR.ts:19`, `:151`, `:238`) contra "MUSEU DO VOLEIBOL" (`:259`, e a planta do
  escritório). Escolher um.
- `atrium-orientation-wall.svg` é o único asset de mídia sem hash no nome (`media.authored.ts:55`).

#### F4 — Lambris sobrepostos e por cima do alizar — **acabamento** `[S][?]`
- **Onde:** `museum.ts:1041-1058`. `bays.mjs`: parede oeste, os lambris em z = −7,35 e −4,45 se sobrepõem
  **0,34 m** (ripas coplanares fora de fase), e o primeiro entra 9 cm no canto; norte e sul, 4 cm de
  sobreposição entre vizinhos; os lambris ao lado das portas ficam a **3 cm** do vão, cobrindo 6 dos 9 cm
  do alizar (`openings.mjs:129`) até 1,48 m.
- **Teste:** `test:kit` — peças de parede da mesma receita não se sobrepõem ao longo da parede e guardam
  ≥ 10 cm de qualquer vão.

### G. Portas

#### G1 — O atalho de mão única nunca destrava pelo átrio — **grave (desenho)** `[C]`
- **Onde:** `transitionDoorTopology.ts:182-190` e `:200-208` (bloqueio só olha `opensFrom` e a sala
  atual; não existe estado "já aberto"), `TransitionDoors.tsx:356-364` (E num atalho bloqueado devolve
  `false` e não toca nada), `schema.ts:583` ("may release a one-way shortcut **for the first time**"),
  `museum.ts:956-973`; `HANDOFF §4.5` confirma: "só pode ser acionado de dentro em cada ciclo".
- **Cenário:** sair da Holyoke pelo atalho, virar-se: "Abre pelo outro lado". Para sempre.
- **Por que importa:** o atalho só rende quando fica aberto; e aqui as duas portas estão na mesma parede,
  a 8,4 m uma da outra, então ele não encurta nada nem na saída.
- **Correção:** `progress.shortcutsOpened` (com `migrateProgress`); depois da primeira abertura a porta
  funciona dos dois lados, o prompt muda e a planta a desenha como porta comum; som de porta trancada no E
  bloqueado; reposicionar o atalho quando a ala ganhar profundidade.
- **Teste:** `test:transition-door` — após `openShortcut(id)`, `transitionDoorBlock(door, 'atrium')` é
  `null`; `test:opening-flow` — o campo sobrevive ao ciclo salvar/carregar.

#### G2 — Risco não verificado: a única saída do escritório depende de todo o átrio ficar pronto — **menor** `[?]`
- **Onde:** `MuseumScene.tsx:557-589` (a prontidão exige os três limites de Suspense, todos os textos
  Troika e o aquecimento de GPU), `TransitionDoors.tsx:457-468`. Não achei tempo-limite: se uma textura ou
  fonte do átrio não chegar, a porta fica em "Preparando a próxima sala…" sem saída.
- **Teste:** `test:gpu-warmup` — após N segundos sem prontidão, a porta abre em modo degradado.

### H. Colisão e passagens

Medido (`atrium-gaps.mjs`): nenhum vão "parece aberto mas não passa". Os mais apertados são lounge ↔
biombo 3 (0,71 m), torre ↔ biombo 3 (0,81 m), torre ↔ parede leste (0,88 m); a cápsula precisa de 0,60 m.
O anel do plinto é fechado (para em raio 2,03 m). As três portas têm 1,5 m livres.

#### H1 — Cordas e pedestais da fila não têm colisão — **menor** `[S]`
- **Onde:** manifesto (`rope-stanchion`, `rope-span` sem colisor); `test-navigation.ts:263-265` admite.
  `atrium-walk.mjs`: a cápsula atravessa a corda em z = 4,9 e o pedestal em (−4,55; 4,9).
- **Correção:** colisor fino nos pedestais (e nas cordas, ou abrir uma passagem clara na fila).
- **Teste:** `test:navigation` — uma caminhada frontal não cruza a corda; a fila tem uma entrada.

#### H2 — Colisores que não batem com o que se vê — **acabamento** `[S]`
- Lounge: uma caixa só de 3,44 × 1,79 m, menor que o estofado (±2,05 × ±1,30): a cápsula para com o
  centro na borda externa da poltrona (0,3 m dentro dela) e não passa entre poltronas e mesa.
- Cadeiras da recepção (família `props`) sem colisor, 20 cm para dentro do corredor de serviço.
- Lambris sem colisor (15 cm); aceitável, a câmera fica a 15 cm da face.

#### H3 — Os testes de navegação ainda partem do spawn antigo — **menor (lacuna de teste)** `[C]`
- **Onde:** `test-navigation.ts:274-278` (âncora do átrio em `[2.5, 1]`), `:710-735` (as seis rotas saem
  dali). Nenhuma sai da porta do escritório; nenhuma chega a menos de 1 m do quadro; nenhuma prova que um
  alvo é alcançável de onde a cápsula para.
- **Teste novo:** rota "porta do escritório → quadro" em linha reta; "de cada ponto final, cada alvo
  interativo está dentro do alcance e fora do volume do próprio alvo" (pega A1).

### I. Diário: planta, catálogo e arquivo

#### I1 — A planta mostra o que não deveria e esconde o que ajudaria — **menor** `[C]`
- **Onde:** `MuseumMap.tsx:165-187` (desenha as portas de **todas** as salas, visitadas ou não, inclusive o
  atalho em verde antes de ser descoberto), `:113-126` (contorno tracejado das salas não visitadas —
  contra o item 1 do cabeçalho do arquivo), `:216-235` (`LockList` lista toda tranca não aberta; o
  comentário logo acima diz que mostrar uma tranca nunca vista é spoiler), `:189-204` (marcador sem
  direção, sem norte; legenda sem "não visitada" nem explicação das bolinhas; `.swatch.is-unvisited`
  existe no CSS e não é usada).
- **Falta para o átrio:** ícone do quadro enquanto a sala está sem energia; o plinto e seus soquetes
  (a "anotação automática" que o cabeçalho promete).
- **Correção:** extrair `mapModel(progress)` puro; portas só de salas visitadas; trancas só as tocadas
  (precisa de `progress.locksSeen`); seta de direção; norte; ícones.
- **Teste:** `test:opening-flow` (ou novo `test:map`) — com save novo, a planta não contém porta, sala
  nem tranca que o jogador não viu.

#### I2 — O caderno não acompanha o átrio — **menor** `[C]`
- **Onde:** `museum.ts:560-566`. "Religar a energia: escritório, átrio e alas" é um item só (sem
  parcial); "Catalogar o acervo" não diz quanto falta; "Cofre" nunca se cumpre. O átrio não tem nenhum
  documento (`documentIds: []`, `museum.ts:1190`): a aba Arquivo não ganha nada aqui.
- **Correção:** itens por sala (ou contador "2 de 3"), e pelo menos um documento no átrio (o folheto da
  recepção de `HANDOFF §7.5` é o candidato natural).
- **Teste:** `test:opening` — cada item tem `doneWhen` ou está marcado como objetivo de longo prazo.

### J. Celular e toque

- **J1** — ver **C2** (painel por cima do objeto; rolar gira): é o defeito de toque mais sério.
- **J2** — ver **C5** (alvo de 21 cm sem volume de mira) e **B5** (sem lanterna durante o exame).
- **J3 — acabamento:** o botão "Ação" não aparece para o atalho bloqueado (correto), mas também não há
  retorno nenhum ao tocar na porta (`MobileControls.tsx:246-256`).
- O resto do toque no átrio está coerente: o prompt esconde a tecla (`museum.css:262-269`), o botão Ação
  usa a mesma arbitragem (`MobileControls.tsx:203-205`), os direcionais zeram ao abrir um modal (`:240-243`).

### K. Restrições que o plano precisa respeitar

- **K1 — Orçamento no teto.** `test-kit-runtime.ts:269-277`: o kit do átrio usa **56 de 56** lotes e
  46.272 de 50.000 triângulos; o quadro medido tem 80 draws (alvo móvel: 45). Qualquer família de material
  nova no átrio custa um lote que não existe: polir aqui é trocar, não somar.
- **K2 — O mobiliário ocupa as paredes das alas futuras.** A planta do escritório
  (`public/textures/media/office-blueprint.svg`) põe a Ala 3 ao norte do átrio, a Ala 5 ao sul e a Ala 4 a
  nordeste. Hoje a parede norte tem o console das bolas, um mural e o sofá; a sul, a recepção e o
  gaveteiro; a leste, a dedicatória e a torre. O átrio precisa ser redesenhado antes da Ala 2 — e a mesma
  planta põe as Alas 2 e 6 coladas na Holyoke, não no átrio, o que contradiz "seis alas abertas em qualquer
  ordem" (`PLANO-DO-ZERO §2.3`).
- **K3 — 17.096 triângulos de kit sem uso** (16% do kit; `unused-kit.mjs`): `medallion-socket`,
  `interp-panel`, `label-plaque`, `atrium-wall-bay` (com placa), `banner`, `pendant`, `reception-desk`
  (a antiga), `partition`, `frame-empty`, `plinth-block`, `plinth-tapered`, `vitrine-table`,
  `vitrine-glass`, `vitrine-wall`, `vitrine-tower`. Parte resolve E1 sem modelar nada; o resto é peso morto
  no GLB.
- **K4 — Toda sessão recomeça no escritório** (`store.ts:877-884`). Com seis alas, "Continuar" vai
  significar atravessar o prédio toda vez; o plano precisa decidir se o escritório continua sendo o único
  ponto de retomada.

---

## 4. Lista consolidada por gravidade

| Gravidade | Itens |
|---|---|
| **Bloqueador (roteiro)** | D1 |
| **Grave** | A1, A4, B1, B2, C1, C2, C3, C4, G1 |
| **Menor** | A2, A3, A5, A6, B4, B6, C5, D2, E1, F1, F2, G2, H1, H3, I1, I2 |
| **Acabamento** | B3, B5, C6, C7, F3, F4, H2, J3, K1–K4 (restrições) |

**Ordem sugerida de ataque no átrio** (cada passo destrava o seguinte):

1. A1 + A2 + A3 (o quadro: colisor, montagem, proxy, lente e alavanca) — uma peça, uma rodada.
2. C1 + C2 + C3 (o exame) — antes de qualquer conteúdo novo, porque todo conteúdo passa por ele.
3. B1 + B2 (energia em dois níveis e emissão por sala) — decide como o resto do prédio acende.
4. A4 + A6 (o religamento encenado e as chamadas do Jorge).
5. D1 + C4 + G1 (plinto com soquetes, vitrine como placar do fio da bola, atalho persistente) — é aqui
   que o roteiro precisa de decisão do dono.
6. E1 + F1 + I1 + I2 (dar função ou texto a cada objeto, planta e caderno).
7. K2 (redesenho do átrio para as portas das alas), antes de construir a Ala 2.

---

## 5. Testes a criar ou estender

| Suíte | Checagens novas |
|---|---|
| `test:power` | alvo alcançável de onde a cápsula para (A1) · raio de dentro do proxy (A1) · lente e alavanca nos dois estados (A3) · rampa de luz (A4) · dois níveis de energia (B2) · piloto não alcança sala vizinha (B4) |
| `validate:content` | peças de parede no apoio: controle, arte, placa, dispositivo (A2) · `hotspot-visible-at-pickup` (C3) · exclusividade de numerais-código (C4) · soquetes = medalhas e estado final alcançável (D1) · lugares citados em falas existem (D2) · `kit-looks-interactive` (E1) |
| `test:examine` (nova) | eixo de inclinação nos quatro rumos (C1) · objeto e painel não se cruzam em 1280×720 e 844×390 (C2) · arrasto que começa no painel não gira (C2) · nenhum hotspot sem rotação acumulada (C3) · volume mínimo de mira e oclusão (C5) |
| `test:materials` / `test:room-runtime` | emissão zero em sala sem energia, com lista explícita de emergência (B1) · luminância mínima no exame em sala apagada (B5) |
| `test:radio` | chamada ao religar o átrio, uma vez e migrada (A4) · transmissão suspensa fora do alcance, fala cortada quando a condição cai, apresentação do Jorge nunca perdida (A6) |
| `test:transition-door` | atalho persistente dos dois lados depois de aberto (G1) · assinatura de luz estável enquanto a porta abre (B3) |
| `test:navigation` | rota porta do escritório → quadro (H3) · corda e pedestal sólidos, fila com entrada (H1) |
| `test:signage` | linha de visão até a dedicatória; sem linha viúva em pt-BR e en (F1) |
| `test:kit` | lambris sem sobreposição e a ≥ 10 cm dos vãos (F4) |
| `test:map` (nova, função pura) | nada não visitado na planta; trancas só as tocadas; seta e norte (I1, A5) |
| `test:opening` | todo item do caderno tem `doneWhen` ou é objetivo declarado (I2) |

---

## 6. O que está certo e deve ser preservado

- O piloto vermelho é um bom farol: visível da porta do escritório, linha de visão livre por cima do
  plinto (`wf3-d01`).
- A arbitragem única de alvo (`interactionTarget.ts`) e o "um E, uma ação" valem para o átrio sem ajuste.
- Portas: aquecimento por proximidade, E armado durante a carga, fechamento automático e reversão segura
  funcionam como descrito; as três têm 1,5 m livres.
- A lanterna nunca alcança o teto (o defeito é o teto se iluminar sozinho, não a lanterna).
- Três das quatro bolas exigem mesmo girar para catalogar.
- Vãos de circulação: todos ≥ 0,71 m; anel do plinto fechado e contornável dos dois lados.
