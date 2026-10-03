# 01 — Cânone, grafo de progressão e conflitos agosto × outubro

Repositório: `C:\Users\rzbui\OneDrive\Documentos\Portfolio\Volleyball Museum` (branch `main`, HEAD `82756c4`, 2026-10-03).
Todos os caminhos abaixo são relativos a essa raiz. Leitura apenas: nada foi editado, assado ou commitado.

**Como foi verificado.** Leitura integral de `AGENTS.md`, `docs/HANDOFF.md`, `docs/PLANO-COMPLETO.md`, `docs/PLANO-DO-ZERO.md`, `docs/ATRIO-BOLAS-HISTORICAS.md`, da era 1895–1929 de `docs/PESQUISA-CONTEUDO.md` (com as correções) e das linhas que o plano de agosto cita; de `src/content/{museum,schema,validate,spawn,legacySave,media.authored}.ts`, `src/content/i18n/pt-BR.ts` (e trechos de `en.ts`), `src/state/store.ts`, e de todo módulo de runtime que toca progressão (`Interaction`, `Containers`, `PowerControls`, `TransitionDoors`/`transitionDoorTopology`, `Devices`/`deviceRules`/`radioCall`/`radioPatience`, `notebook`, `progressCondition`, `interactionTarget`, `LockPanel`, `Journal`, `MuseumMap`, `Notebook`, `Hud`, `MuseumApp`). Três one-liners de Node, só de leitura, importaram `museum.ts`/`validate.ts`/`pt-BR.ts` em memória (validador: zero issues; contagem de numerais; geometria dos hotspots).

**O que NÃO foi verificado no navegador.** Não rodei `dev`. As conclusões de §3.5 (peças impossíveis de catalogar) saem da matemática de `src/engine/Interaction.tsx` e são determinísticas, mas merecem uma confirmação visual de dois minutos antes de virarem tarefa.

**Aviso sobre o repositório.** O enunciado diz "git main, clean". Não está mais: `git status` lista 49 arquivos não rastreados `docs/contact-sheets/wf3-a*.jpg`, criados por outro processo desta mesma rodada (provavelmente o endpoint `/__capture`). Não são meus e não toquei neles; quem fechar a rodada precisa decidir se ficam.

---

## 0. As doze coisas que mudam o plano

1. **O jogo acaba no bilhete do Otávio.** Depois de abrir a gaveta `1896` não existe mais nenhum estado novo alcançável: sem medalhas, sem cofre, sem final, sem fala nova do Jorge (§3.9).
2. **Dá para chegar a esse "fim" em ~30 s sem sair do escritório nem acender a luz**: a gaveta fica na sala do spawn, o teclado aceita o código sem exigir que o fato tenha sido aprendido (`src/ui/LockPanel.tsx:112`) e funciona no escuro (§3.10).
3. **"Catalogar o acervo" é inalcançável hoje.** `net-1897` e `gym-suit` nunca catalogam, `photo-gym` só com 1,5° de tolerância; a regra de hotspot usa o deslocamento do centro como "normal" e segura tudo a 0,42 m (§3.5). O item 2 da lista "Antes das 9h" nunca risca, a Holyoke nunca fica azul no mapa, e o distintivo `indoor` do plano (que pede a rede) nasceria bloqueado.
4. **O item 3 da lista ("Cofre — só o Otávio sabia abrir") não tem `doneWhen`** (`src/content/museum.ts:565`): nunca risca, por construção.
5. **O plinto das três medalhas não existe no átrio.** O centro é `atrium-central-podium`, um pedestal interpretativo de **quatro botões**, cercado por um anel fechado de 1,70 m com colisão. A peça `medallion-socket` está assada e não está colocada em lugar nenhum. O plano de agosto afirma o contrário (§5, C2).
6. **A "maior cena do jogo" já foi gasta.** O quadro do átrio acende a sala inteira no minuto 3; o plano guarda as luzes gerais para o final (C3).
7. **Dois "cofres" em português**: o cofre de ferro do escritório (adereço, sem interação) e o Cofre do Fundador no subsolo. A lista do caderno não diz qual (C9).
8. **O subsolo alagou** (Jorge) e o cofre fica no subsolo (bilhete, planta, Jorge). Conflito aparente que é, na verdade, a melhor trava diegética do terceiro ato (C1).
9. **A planta na parede do escritório diz "PROJETO DE AMPLIAÇÃO"** com as Alas 2–6 tracejadas: em ficção, hoje, essas alas não existem. O plano de agosto trata as seis como galerias abertas desde o primeiro segundo (C11).
10. **O console de bolas do átrio (30/09) antecipa quatro dos seis nós do fio `ball`**, imprime `1998` (um dos sete códigos) e mostra, em ordem, a resposta do ritual das seis bolas (C12).
11. **O bilhete promete "uma medalha de cada era que você catalogar por inteiro"**; o plano dá medalhas por duas trancas e um ritual, e nenhuma na Holyoke (C10).
12. **Texto da Holyoke contraria as correções da pesquisa em seis pontos** (Apêndice A), e três hotspots usam etiqueta emprestada de outra peça (Apêndice B).

---

## 1. Personagens e voz — tudo o que o jogo já diz

Fonte de verdade: `src/content/i18n/pt-BR.ts` (linhas citadas); `en.ts` é tipado contra ele.

### 1.1 O jogador — "o novo curador"

| O que é dito | Chave | Linha |
|---|---|---|
| "Você é o novo curador." | `intro.line1` | pt-BR:119 |
| "É a noite anterior à reabertura. A energia caiu." | `intro.line2` | pt-BR:120 |
| "Seu antecessor deixou alguma coisa no cofre." | `intro.line3` | pt-BR:121 |
| "Olá, novo curador! Bem-vindo ao seu novo trabalho." | `notebook.welcome.letter` | pt-BR:152-155 |
| "Reabertura amanhã. Você é quem termina a montagem." | `sign.atrium.body` (placa física no átrio) | pt-BR:260-262 |
| Jorge o chama de "curador", sempre "você", nunca "o senhor" | comentário de voz | pt-BR:185-186 |

- Sem nome, sem avatar, sem gênero além do masculino gramatical ("novo curador"). Primeira pessoa sem corpo é decisão registrada (`docs/PLANO-DO-ZERO.md:387-415`).
- Começa a sessão **dentro** do escritório, de costas para a porta (`src/content/spawn.ts:12-19`), e recomeça ali em toda sessão, mesmo com save (`src/state/store.ts:877-887`).
- O título é exibido na tela inicial (`src/MuseumApp.tsx:82-86`); é o único lugar onde "o cofre" aparece antes do caderno.
- **Lacuna de motivação:** a premissa de agosto dizia "o acervo está descatalogado" (`docs/PLANO-DO-ZERO.md:71-72`). O jogo nunca diz isso. Helena pede só a energia; "Catalogar o acervo" aparece na lista sem explicação.

### 1.2 Helena — a diretora

| O que é dito | Chave | Linha |
|---|---|---|
| "Bem-vindos ao Museu do Vôlei, onde a história é contada de um jeito interativo." (folha de rosto impressa) | `notebook.welcome.flyleaf` | pt-BR:150-151 |
| "A tempestade desta tarde derrubou a energia do museu inteiro, e você vai ter que religá-la sala por sala. Reabrimos amanhã às 9h. Bom trabalho!" | `notebook.welcome.letter` | pt-BR:152-155 |
| "— Helena, diretora" | `notebook.welcome.signature` | pt-BR:156 |
| "P.S.: O antigo curador deixou as coisas dele por aqui. Ele trancava tudo com datas da história do vôlei." | `notebook.welcome.postscript` | pt-BR:157-158 |
| Lista "Antes das 9h" (presumivelmente letra dela) | `notebook.todo.*` | pt-BR:159-162 |
| Jorge: "a Helena, a diretora, deixou um caderno pra você aí na mesa" | `radio.call.notebook.1`, `radio.hint.notebook` | pt-BR:172-175 |
| Jorge: "…Só pra Helena, talvez." | `radio.patience.t4.dark.close` | pt-BR:219 |

- Tom: informal, caloroso, breve, com exclamação. Não menciona Jorge, rádio, lanterna nem por que catalogar.
- Escreveu a carta **depois** da tempestade ("desta tarde") e foi embora. Nunca aparece nem fala.
- Em toda fala em que é citada ela é apresentada como diretora (travado por teste: `scripts/test-radio.ts:915-916`).

### 1.3 Otávio — o curador anterior

| O que é dito | Chave | Linha |
|---|---|---|
| "O antigo curador deixou as coisas dele por aqui. Ele trancava tudo com datas da história do vôlei." (sem nome) | `notebook.welcome.postscript` | pt-BR:157-158 |
| "Cofre — só o Otávio sabia abrir" (primeira vez que o nome aparece) | `notebook.todo.vault` | pt-BR:162 |
| "Aquela gaveta trancada do escritório? O Otávio usava datas que estão nas placas." | `radio.hint.drawer` | pt-BR:180-181 |
| "O Otávio vivia falando de três medalhas e de um cofre embaixo do átrio." | `radio.hint.vault` | pt-BR:182-183 |
| "O Otávio trabalhou aqui trinta anos e me chamou duas vezes. Uma foi engano." | `radio.patience.t3.otavio` | pt-BR:208-209 |
| "Sabe o que o Otávio fazia quando tinha dúvida? Lia as placas. LIA. AS. PLACAS." | `radio.patience.t5.labels` | pt-BR:232-233 |
| Bilhete (sem assinatura, título "Bilhete do curador anterior") | `document.predecessor.*` | pt-BR:100-102 |
| "3 medalhas?" a lápis vermelho na planta, com o cofre circulado | SVG | `public/textures/media/office-blueprint.svg:54-59` |
| Chapéu de feltro no cabideiro (só o HANDOFF diz de quem é) | modelo | `docs/HANDOFF.md:607-609`; `src/content/museum.ts:1432` |

O bilhete, por inteiro (`pt-BR:101-102`):

> "Se você está lendo isto, achou a combinação — o que significa que leu as placas em vez de passar por elas. Bom. O resto do acervo está no cofre, sob o átrio, e não abre com números: abre com três medalhas. Uma de cada era que você catalogar por inteiro. Não tenha pressa. O museu reabre amanhã, mas ele existe há cento e trinta anos."

- Voz: seca, paciente, professoral; aprova quem lê. É a única voz "literária" do jogo.
- **O que o cânone NÃO diz:** por que ele saiu (aposentou, morreu, sumiu?), há quanto tempo, se o bilhete foi escrito para este sucessor ("o museu reabre amanhã" implica que ele sabia da data da reabertura, ou seja, saiu há pouco), e o que há no cofre. O "3 medalhas?" com interrogação sugere que **nem ele** tinha certeza de como abrir, o que contradiz "só o Otávio sabia abrir".
- O plano de agosto dá ao cofre o nome "Cofre do Fundador" (`docs/PLANO-COMPLETO.md:412`) e põe dentro "o livro de tombo do antecessor e a segunda carta dele" (`:423`). Fundador e antecessor são pessoas diferentes ou a mesma? Indefinido.

### 1.4 Jorge — o porteiro da noite

Voz dele = todas as chaves `radio.*` (`pt-BR:164-252`). Dados em `src/content/museum.ts:645-880`.

| Fato | Chave | Linha |
|---|---|---|
| "Aqui é o Jorge, da portaria. Câmbio." | `radio.call.first.1` | pt-BR:165 |
| Tem um painel que mostra a energia sala a sala: "Vi no painel que a luz do escritório voltou." | `radio.call.first.2` | pt-BR:166-167 |
| "E não desce no subsolo, que alagou." | `radio.call.first.4` | pt-BR:170-171 |
| "Daqui da portaria eu falo com o prédio inteiro." | `radio.call.taken.1` | pt-BR:188-189 |
| "Recepção é aquele balcão vazio no átrio." (portaria ≠ recepção) | `radio.patience.t2.reception` | pt-BR:202-203 |
| 62 anos | `radio.patience.t5.age` | pt-BR:227-228 |
| Café, palavras cruzadas, radinho de pilha com futebol, novela, "ronda mental" | `t2.coffee`, `t3.crossword`, `t4.penalty.*`, `t5.soap.*`, `t4.rounds.*` | pt-BR:201-243 |
| Gravação: "Nosso horário é das nove às seis." | `radio.patience.t5.recording.1` | pt-BR:237-238 |
| Ar morto: "(Nada. Só a chuva batendo nas janelas.)" | `radio.deadAir.rain` | pt-BR:252 |

- Regra de voz, escrita no dicionário: "Jorge teases, he never insults" (`pt-BR:185-186`). Coloquial ("tá", "pra", "hein?"), fecha com "Câmbio" / "Câmbio, desligo".
- Em inglês ele é "front desk"/"night porter" e a piada da recepção virou "I'm the night porter, not customer service" (`en.ts:152,188`; `docs/HANDOFF.md:883-886`).
- Mecânica da paciência: cinco níveis a partir das chamadas 1/3/5/7/10; dica completa ou curta; explosões de 30% e 50%; 300 s de silêncio descontam uma chamada; progresso perdoa uma e rende elogio; 12 s de ar morto ao desligar (`src/content/museum.ts:656-779`; regras em `src/engine/radioPatience.ts`).
- Nunca sai da portaria. **A portaria não existe no prédio construído nem na planta.** O prédio também não tem porta de rua.

### 1.5 O museu

| Fato | Onde |
|---|---|
| Nome na interface: "Museu do Vôlei" | `ui.title` pt-BR:19; folha de rosto pt-BR:151; gravação do Jorge pt-BR:238 |
| Nome na arquitetura: "MUSEU DO VOLEIBOL" | `sign.atrium.heading` pt-BR:259; carimbo da planta, SVG:63 |
| "DESDE 1895 · MEMÓRIA EM MOVIMENTO" | `sign.atrium.eyebrow` pt-BR:258 |
| "ele existe há cento e trinta anos" | bilhete, pt-BR:102 |
| Reabre amanhã às 9h; horário das nove às seis | pt-BR:155, 238 |
| Recepção: balcão vazio no átrio, com folhetos e porta-folhetos já modelados (sem interação) | `src/content/museum.ts:1007`; `scripts/bake/parts/atriumDecor.mjs:331-335,412` |
| Subsolo alagado; cofre sob o átrio | pt-BR:171, 102, 183; SVG:49-52 |
| Planta: "PLANTA GERAL · TÉRREO / PROJETO DE AMPLIAÇÃO / ESC. 1:200 · FOLHA 01/06" | SVG:61-67 |
| Apelidos das salas (nunca exibidos: nenhum runtime lê `nicknameKey`) | pt-BR:127,132,136 |

### 1.6 Lacunas de cânone a fechar antes de escrever qualquer fala nova

1. Destino do Otávio e relação dele com "o Fundador".
2. Quem escreveu a lista "Antes das 9h" e como ela ganha linhas novas.
3. Onde fica a portaria; por onde o público entra às 9h.
4. Por que catalogar hoje à noite.
5. "Desde 1895" é o esporte ou o museu? O bilhete diz que o **museu** existe há 130 anos, ou seja, teria nascido junto com o jogo.
6. "Vôlei" ou "Voleibol" no nome próprio.
7. Que horas são. O único relógio do jogo recomeça de 16h47 (§2, P9).

---

## 2. Promessas plantadas pela abertura — e o que cada uma paga hoje

Legenda: **Pago** = fecha dentro do que está construído. **Parcial** = funciona, mas abre outra promessa sem pagamento. **Não pago** = arma na parede.

| # | Promessa | Onde é plantada | Estado hoje |
|---|---|---|---|
| P1 | Página 1 do caderno: folha de rosto do museu | `museum.ts:552`; pt-BR:150 | **Pago** (é só ambientação). |
| P2 | Página 2: carta da Helena — "religar sala por sala", "9h" | `museum.ts:553-558`; pt-BR:152-156 | **Parcial.** Religar é jogável (3 salas). As 9h nunca chegam: não há tempo, amanhecer nem final. |
| P3 | P.S.: "ele trancava tudo com datas" (tutorial das trancas de conhecimento) | pt-BR:157-158 | **Parcial.** "Tudo" é **uma** gaveta (`museum.ts:132-147`). O cofre do escritório, a 2 m, não reage. |
| P4 | Lista, item 1: "Religar a energia: escritório, átrio e alas" → `{ allRoomsPowered: true }` | `museum.ts:563`; pt-BR:160 | **Pago** com as três salas (`src/engine/progressCondition.ts:73-75`). "Alas", no plural, risca com uma ala só; cada sala nova **desrisca** o item em saves antigos. |
| P5 | Lista, item 2: "Catalogar o acervo" → `{ allCatalogued: true }` (12 peças) | `museum.ts:564`; pt-BR:161 | **Não pago: inalcançável** (§3.5). |
| P6 | Lista, item 3: "Cofre — só o Otávio sabia abrir", **sem** `doneWhen` | `museum.ts:565`; pt-BR:162; teste que trava isso: `scripts/test-opening.ts:198` | **Não pago por construção.** |
| P7 | Ler é pegar: o caderno sai da mesa e o diário passa a existir (Tab) | `museum.ts:640-641`; `src/engine/notebook.ts:42-65`; toast pt-BR:52-54 | **Pago.** A lista viva só é relida em Tab → Arquivo → "Boas-vindas da diretora" (`src/ui/Journal.tsx:91-112`); nada avisa quando um item risca. |
| P8 | Planta na parede sul: cofre circulado, seta, "3 medalhas?", Alas 2–6 e mezanino tracejados | `museum.ts:1440-1451`; SVG | **Não pago.** Sem interação e sem texto de jogo; o texto está assado em português dentro do SVG (o jogador em inglês lê "COFRE · SUBSOLO"). |
| P9 | Relógio parado às 16h47; volta a andar com a energia do escritório | `museum.ts:787-797`; `src/engine/deviceRules.ts:18-27` | **Pago** como objeto. Como relógio da noite, não: recomeça de 16h47 e fica horas atrasado para sempre. |
| P10 | A tempestade | carta pt-BR:154; Jorge pt-BR:167; guarda-chuva no cabideiro (`docs/HANDOFF.md:608`) | **Parcial.** Só texto e adereço. Não há janela, claraboia, som de chuva nem goteira; "a chuva batendo nas janelas" (pt-BR:252) descreve janelas que o prédio não tem. `RoomData.audio` não tem leitor (`docs/HANDOFF.md:527-529`). |
| P11 | Reabertura às 9h | pt-BR:155, 159, 262 | **Não pago.** |
| P12 | Leitor da porta: LED vermelho → verde, trava elétrica do escritório | `museum.ts:798-806, 943`; `src/engine/transitionDoorTopology.ts:200-208` | **Pago.** |
| P13 | Primeira chamada do Jorge (4 falas): apresenta-se, explica os quadros, manda ao quadro do átrio, proíbe o subsolo, manda pegar o rádio | `museum.ts:820-833`; pt-BR:165-171 | **Pago** até o quadro; o subsolo **não existe**. |
| P14 | Lembrete do caderno e reação ao rádio pego | `museum.ts:834-851`; pt-BR:172-173, 188-191 | **Pago.** |
| P15 | Dicas em ordem: caderno → átrio → Ala 1 → gaveta → cofre | `museum.ts:855-877`; pt-BR:174-183 | **Parcial.** As quatro primeiras fecham. A quinta (`when: {}`) é o estado final permanente e aponta para algo que não existe. Não há dica para "catalogar". |
| P16 | "Pode atravessar [a Ala 1] no escuro mesmo: a lanterna dá conta." | `radio.hint.holyoke` pt-BR:178-179 | **Furada.** O quadro da Holyoke fica a 2,2 m da porta de entrada, na mesma parede (`museum.ts:1226-1234` contra `:1238-1243`). Não há travessia. |
| P17 | Rádio no bolso (R) e a paciência | `museum.ts:818, 878`; `src/engine/radioCall.ts:47-95` | **Pago.** |
| P18 | Lanterna (F), que nunca alcança o teto do átrio | `src/engine/flashlightRig.ts:16-54`; `scripts/test-opening.ts:363` | **Pago** como ferramenta. O segredo do teto é gasto pelo quadro do átrio (C3). |
| P19 | Cofre de ferro do escritório, com volante | `museum.ts:1431`; `scripts/bake/parts/officeDecor.mjs:363-401` | **Não pago.** É `kit`, sem interação, sem texto. |
| P20 | Gaveta trancada (código 1896) com o bilhete | `museum.ts:132-147, 527-535, 609-624` | **Pago**, e planta P21–P23. |
| P21 | "Três medalhas", "uma de cada era que você catalogar por inteiro" | pt-BR:101-102, 183; SVG:59 | **Não pago.** Nenhuma medalha existe; `credentials` nunca recebe nada. |
| P22 | "O resto do acervo está no cofre, sob o átrio" | pt-BR:101-102 | **Não pago.** |
| P23 | "Não desce no subsolo, que alagou" | pt-BR:171 | **Não pago** (não há por onde descer). |
| P24 | "O saguão do plinto": plinto central com três soquetes | comentário `museum.ts:975-986`; pt-BR:127; peça `scripts/bake/kit.mjs:939-993` | **Não plantado de fato.** O que está no centro é o pedestal de quatro botões (`museum.ts:989`; `scripts/bake/parts/atriumDecor.mjs:562-663`) dentro de um anel fechado (`scripts/bake/parts/atriumFurnishings.mjs:133-139`). |
| P25 | Atalho de mão única da Holyoke | `museum.ts:946-973, 1244-1255` | **Pago** como saída. Do átrio diz "Abre pelo outro lado" **para sempre**: nada persiste que ele foi aberto (`docs/HANDOFF.md:289-290`). |
| P26 | Energia por sala: luminária, quadro do átrio, quadro da Ala 1 | `museum.ts:905-913, 1226-1234, 1375-1393` | **Pago.** Só a luminária tranca alguma coisa. |
| P27 | Placa de dedicação: "Reabertura amanhã. Você é quem termina a montagem." | `museum.ts:1089-1104`; pt-BR:258-262 | **Parcial.** "Montagem" não é um verbo do jogo. A placa fala com o jogador em segunda pessoa (herança de quando o átrio era o spawn). O comentário diz parede norte; a placa está na leste (`position: [8.84, 2.75, -2.4]`). |
| P28 | Telefone de baquelite na mesa | `museum.ts:1421` | **Não pago.** A "secretária eletrônica com o recado do Otávio" é ideia aprovada e não feita (`docs/HANDOFF.md:530-534`). |
| P29 | Quadro de cortiça, carrinho de arquivo, arquivo de mapas | `museum.ts:1422-1424` | **Não pago.** São os objetos do "contrato do escritório" (`docs/PLANO-DO-ZERO.md:176-182`), hoje adereços. |
| P30 | Torre-vitrine do átrio com fechadura de latão e três prateleiras iluminadas | `museum.ts:1032`; `scripts/bake/parts/atriumDecor.mjs:670-770` | **Não pago.** Sem interação; tem uma bola decorativa assada na prateleira do meio. |
| P31 | Painel de orientação com **seis** medalhões de latão | `museum.ts:1107-1116`; `public/textures/media/atrium-orientation-wall.svg:75-99` | **Ruído.** Seis medalhões desenhados num jogo cuja meta são três medalhas. |
| P32 | Chapéu do Otávio no cabideiro | `museum.ts:1432` | **Não plantado para o jogador:** nenhum texto do jogo diz de quem é. |

---

## 3. A progressão implementada, como grafo

### 3.1 Salas e portais

| Sala | Origem (mundo) | Casca | Começa com energia | Portais |
|---|---|---|---|---|
| `office` (spawn) | `[12.25, 0, 3]` | 6 × 7 × 3,2 | não | `office-to-atrium` |
| `atrium` | `[0, 0, 0]` | 18 × 18 × 8,4 | não | `atrium-to-office`, `atrium-to-holyoke`, `atrium-from-holyoke-shortcut` |
| `holyoke` | `[-15.25, 0, 0]` | 12 × 16 × 4,2 | não | `holyoke-to-atrium`, `holyoke-shortcut` |

| Porta física (dono) | Liga | Exige | Concede | Ref. |
|---|---|---|---|---|
| `atrium-to-office` | átrio ↔ escritório | `requiresPower: 'office'`, **nos dois sentidos** | passagem | `museum.ts:929-945`; `scripts/test-opening.ts:216-225` |
| `atrium-to-holyoke` | átrio ↔ Holyoke | nada | passagem | `museum.ts:915-928` |
| `atrium-from-holyoke-shortcut` | Holyoke → átrio | `oneWay`, `opensFrom: 'holyoke'`; do átrio: "Abre pelo outro lado" | passagem só de dentro, em todo ciclo | `museum.ts:946-973`; `transitionDoorTopology.ts:182-208` |

- `Portal.lockId` existe no schema (`schema.ts:594`) e no validador (`validate.ts:453`), mas **nenhum runtime o lê**: uma porta com `lockId` seria atravessável no jogo e trancada na prova de solvabilidade.
- Toda porta fecha sozinha depois da travessia e pede `E` de novo (`docs/HANDOFF.md:280-290`).

### 3.2 Energia

| Controle | Sala | Peça | Exige | Concede | Ref. |
|---|---|---|---|---|---|
| `office-lamp-switch` | office | `desk-lamp` | nada | `roomsPowered += office` → destrava a porta, anda o relógio, dá carga ao rádio, LED verde | `museum.ts:1375-1393` |
| `atrium-breaker` | atrium | `breaker-panel`, parede oeste, 2,4 m ao norte da porta da Ala 1 | nada | `roomsPowered += atrium` (luz completa) | `museum.ts:905-913` |
| `holyoke-breaker` | holyoke | `breaker-panel`, parede leste, 2,2 m ao norte da própria entrada | nada (`powerLockId: undefined`, `museum.ts:1235`) | `roomsPowered += holyoke` | `museum.ts:1226-1234` |

- `powerLockId` é honrado pelo runtime (`src/engine/PowerControls.tsx:213-218`), mas só serve para tranca de conhecimento, porque `LockPanel` não desenha nenhuma outra.
- A ordem é livre: dá para acender a Holyoke antes do átrio. Nada além da porta do escritório depende de energia: peças são examinadas e gavetas lidas no escuro.

### 3.3 Trancas e fatos

| Tranca | Tipo | Fato | Fonte declarada | Onde está | Abre |
|---|---|---|---|---|---|
| `office-drawer` | `knowledge`, 4 dígitos | `springfield-renaming` = `1896` | `portrait-morgan` | container `office-cabinet` | `doc-predecessor` |

| Fato | Valor | `usedAsCode` | Fontes | Revelado por |
|---|---|---|---|---|
| `springfield-renaming` | 1896 | sim | Wikipedia + IVHF | hotspot `portrait-morgan:date` (`museum.ts:457-468`) e documento `doc-halstead` (`:510-517`) |
| `first-rulebook` | 1897 | não | 1 | hotspot `handbook-1897:innings` |
| `filipino-spike` | 1916 | não | 1 | hotspot `guide-1916:credit`, cuja etiqueta fala de Frank Wood e John Lynch, não das Filipinas |
| `six-a-side` | 1918 | não | 1 | documento `doc-rule-changes` |

- **`factsKnown` é só escrita.** O teclado compara a digitação com `fact.value` (`src/ui/LockPanel.tsx:112`); nada confere se o jogador aprendeu o fato.
- Escada de dicas real (`LockPanel.tsx:136-185`): aos 45 s, "Você viu isto em algum lugar da Ala 1." (`lock.hint.source`, texto fixo, sem sala por tranca); aos 90 s, repete a pergunta do fato, **que já está no topo do painel desde o início** (`:145` e `:184`), ou seja, o segundo degrau não acrescenta nada; na terceira tentativa errada, mostra o primeiro dígito. O mostrador tem quatro células fixas (`:148`).
- O `1896` aparece como algarismo em **cinco** chaves: `exhibit.handbook-1897.catalogue`, `exhibit.portrait-morgan.catalogue`, `hotspot.portrait-morgan.date.label`, `exhibit.photo-gym.catalogue`, `document.halstead.title`. O `1895`, que é a resposta errada óbvia, aparece em nove, inclusive na parede do átrio.
- O mapa lista toda tranca ainda fechada, **mesmo nunca vista** (`src/ui/MuseumMap.tsx:216-235`), ao contrário do que o comentário em `:206-210` promete. `Progress` não tem campo de "trancas tocadas".

### 3.4 Containers e documentos

| Container | Sala | Tranca | Documentos | Efeito de abrir |
|---|---|---|---|---|
| `office-notebook` (`presentation: 'notebook'`, `carriesJournal`) | office | nenhuma | `doc-welcome` (3 páginas) | lê; some da mesa; libera o diário |
| `office-cabinet` | office | `office-drawer` | `doc-predecessor` | teclado → ao acertar, grava a tranca e o documento e já abre o leitor (`LockPanel.tsx:112-126`) |
| `holyoke-cabinet-a` | holyoke | nenhuma | `doc-invention-date`, `doc-halstead` | lê os dois de uma vez; revela `springfield-renaming` (`Containers.tsx:282-286`) |
| `holyoke-cabinet-b` | holyoke | nenhuma | `doc-rule-changes` | lê; revela `six-a-side` |

- Um container com tranca que não seja de conhecimento abriria um modal **invisível** (`Containers.tsx:276-280` chama `setActiveLock`; `LockPanel.tsx:107` devolve `null`). Só o Esc sai.
- O `archive-cabinet` é modelado com **quatro gavetas** (`scripts/bake/kit.mjs:1079`), mas é um container único com uma tranca só.

### 3.5 Peças, hotspots e a regra de catálogo

Regra (`src/engine/Interaction.tsx:166-169, 354-397`): a peça vai para 0,42 m à frente da câmera; um hotspot conta como visto quando `dot(normalize(hotspot − origem da peça), normalize(câmera − hotspot)) > 0,55`; a peça entra no catálogo quando todos os `requiredForCatalogue` foram vistos; aí rodam os `unlocks` (nenhuma peça tem).

Consequência geométrica: com a origem presa a 0,42 m, um hotspot a uma distância `r ≥ 0,42 m` da origem (já com a escala) **nunca** satisfaz a condição; e quanto mais perto de 0,42, mais estreito o cone. Calculado sobre o conteúdo real:

| Sala | Peça | Hotspot | Obrig. | r (m) | Cone | Ângulo em repouso | Situação |
|---|---|---|---|---|---|---|---|
| atrium | `atrium-ball-laced` | `lacing` | sim | 0,106 | 44,5° | 0° | **cataloga ao pegar, sem girar** |
| atrium | `atrium-ball-tokyo-1964` | `recessed-seam` | sim | 0,105 | 44,5° | 158° | ok, exige virar |
| atrium | `atrium-ball-colour-1998` | `hand-stitched-channel` | sim | 0,105 | 44,6° | 152° | ok |
| atrium | `atrium-ball-eight-panel-2008` | `dimpled-surface` | sim | 0,105 | 44,5° | 145° | ok |
| holyoke | `ball-improvised` | `valve` | sim | 0,098 | 45,3° | 66° | ok (etiqueta emprestada do cadarço da Spalding) |
| holyoke | `ball-spalding` (escala 2,65) | `lacing` | sim | 0,375 | **8,5°** | 45° | difícil: o ponto flutua 10 cm fora da bola |
| holyoke | `ball-spalding` | `maker` | sim | 0,291 | 21,2° | 180° | ok, exige virar |
| holyoke | `net-1897` | `tape` | sim | **1,980** | **0°** | — | **impossível** |
| holyoke | `handbook-1897` | `innings` | sim | 0,064 | 49,3° | 72° | ok; revela `first-rulebook` |
| holyoke | `guide-1916` | `credit` | sim | 0,041 | 51,9° | 14° | **cataloga ao pegar**; revela `filipino-spike` |
| holyoke | `gym-suit` | `knit` | sim | **1,206** | **0°** | — | **impossível** |
| holyoke | `portrait-morgan` | `date` | sim | 0,282 | 22,6° | 84° | só com a moldura quase de perfil, a borda de baixo apontada para a câmera; é a fonte do código |
| holyoke | `photo-gym` | `apparatus` | sim | 0,413 | **1,5°** | 87° | **na prática impossível** |

- A tabela lista só os hotspots obrigatórios. "Cone" é o desvio máximo entre a direção do hotspot e a linha até a câmera; "ângulo em repouso" supõe o jogador de frente para a peça.
- Resultado: no máximo **10 de 12** peças; na prática 9 (sem a `photo-gym`), ou 8 se o cadarço da Spalding não for acertado. `allCatalogued` nunca vale.
- Duas peças violam a regra-mãe do jogo ("não conta se você não virou", `docs/PLANO-DO-ZERO.md:384-385`): catalogam no instante em que são pegas.
- A rede (4,8 m de vão) e o manequim (1,3 m) são levados inteiros para 0,42 m do rosto. Além de não catalogar, a câmera fica dentro do objeto.
- Três hotspots usam a etiqueta de outra peça (Apêndice B).
- Nenhum teste cobre isso: `test:opening-flow` prova que o `1896` está **escrito** na plaqueta (`scripts/test-opening-flow.ts:971-992`), não que ela pode ser vista.

### 3.6 Dispositivos

**Rádio `office-radio`** (`museum.ts:807-879`): sem carga até `office` ter energia; o primeiro `E` o leva (`carriedOnUse`); depois, `R` de qualquer sala.

| Chamada | Quando | Atraso | Falas |
|---|---|---|---|
| `porter-first-call` | `powered: [office]`, `unpowered: [atrium]` | 2,4 s | `radio.call.first.1–4` |
| `porter-notebook-reminder` | `powered: [office]`, `documentsUnread: [doc-welcome]` | 4 s | `radio.call.notebook.1` |
| `porter-radio-taken` | `carried: [office-radio]` | 0,8 s | `radio.call.taken.1–2` |

Tocam na ordem do conteúdo, uma por vez, só gravadas ao fim da última fala; caem se a condição deixa de valer (`src/engine/deviceRules.ts:88-144`; `src/engine/Devices.tsx:511-560`). **Não há mais nenhuma chamada no jogo**: acender o átrio, acender a Holyoke, abrir a gaveta ou catalogar não geram reação.

| Dica (primeira que vale) | Condição | Fala |
|---|---|---|
| 1 | `documentsUnread: [doc-welcome]` | `radio.hint.notebook` |
| 2 | `unpowered: [atrium]` | `radio.hint.atrium` |
| 3 | `unpowered: [holyoke]` | `radio.hint.holyoke` |
| 4 | `locksClosed: [office-drawer]` | `radio.hint.drawer` (nomeia o retrato do Morgan logo na primeira vez) |
| 5 | `{}` | `radio.hint.vault` |

**Relógio `office-clock`**: parado em 16:47, soma tempo de jogo depois da energia (`deviceRules.ts:18-52`). **Leitor `office-door-reader`**: vermelho → verde.

### 3.7 Ferramentas do jogador

| Ferramenta | Como se obtém | Tecla | Persistência |
|---|---|---|---|
| Lanterna | desde o início | F | sessão (toda visita começa apagada) |
| Caderno/diário (Planta, Catálogo, Arquivo, Créditos) | ler `office-notebook` até fechar | Tab | `documentsRead` |
| Rádio | `E` no rádio com a luminária acesa | R | `devicesCarried` |

Não existe inventário: `credentials` é gravado e migrado (`store.ts:65, 204-216`) e nenhuma tela o mostra.

### 3.8 O grafo

```
[título] ──Entrar──▶ ESCRITÓRIO (escuro, porta travada)
   │
   ├─ F lanterna ........................... (opcional)
   ├─ E caderno → doc-welcome → diário (Tab) (opcional; Jorge cobra)
   ├─ E gaveta → teclado 1896 → doc-predecessor   ◀── alcançável já aqui, no escuro
   └─ E luminária ─▶ energia(office)
          ├─ relógio anda · LED verde · rádio com carga
          ├─ chamada porter-first-call (2,4 s) [· porter-notebook-reminder]
          ├─ E rádio → no bolso → chamada porter-radio-taken → R em qualquer sala
          └─ porta atrium-to-office destrava
                 │
                 ▼
              ÁTRIO (escuro)
                 ├─ E quadro oeste ─▶ energia(atrium)            (opcional)
                 ├─ 4 bolas do console (3 exigem virar, 1 cataloga sozinha)
                 ├─ atalho: "Abre pelo outro lado" (sempre)
                 └─ porta atrium-to-holyoke (livre)
                        │
                        ▼
                     HOLYOKE (escura)
                        ├─ E quadro ao lado da porta ─▶ energia(holyoke)   (opcional)
                        ├─ retrato do Morgan: plaqueta → fato 1896 (moldura de perfil)
                        ├─ arquivo A: doc-invention-date + doc-halstead → fato 1896
                        ├─ arquivo B: doc-rule-changes → fato 1918
                        ├─ 8 peças: 5 catalogáveis, 1 difícil, 2 impossíveis
                        └─ atalho holyoke-shortcut ─▶ ÁTRIO (canto sudoeste, junto da recepção)

energia(office) ∧ energia(atrium) ∧ energia(holyoke) ─▶ ☑ item 1 da lista
catalogadas as 12 ─▶ ☑ item 2          (inalcançável)
item 3 ─▶ nunca
```

### 3.9 Até onde se chega, e onde o jogo para

**Estado máximo alcançável**

```
roomsPowered:   [office, atrium, holyoke]
roomsVisited:   [office, atrium, holyoke]
documentsRead:  [doc-welcome, doc-invention-date, doc-halstead, doc-rule-changes, doc-predecessor]   (5/5)
factsKnown:     [springfield-renaming, first-rulebook, filipino-spike, six-a-side]                   (ninguém lê)
locksOpened:    [office-drawer]                                                                      (1/1)
catalogued:     8 a 10 de 12    (faltam sempre net-1897 e gym-suit; photo-gym na prática; ball-spalding é difícil)
credentials:    []
radioCalls:     [porter-first-call, (porter-notebook-reminder), porter-radio-taken]
devicesCarried: [office-radio]
```

- Lista "Antes das 9h": ☑ energia · ☐ catalogar · ☐ cofre.
- Mapa: átrio e escritório azuis; Holyoke âmbar para sempre; lista de trancas vazia.
- Jorge, para sempre: "Agora é com você, curador. O Otávio vivia falando de três medalhas e de um cofre embaixo do átrio. Câmbio."

**Onde para.** No instante em que o bilhete do Otávio fecha. Ele entrega três instruções (medalhas, cofre sob o átrio, catalogar eras inteiras) e nenhuma tem objeto no mundo: não há medalha, não há soquete, não há escada, não há subsolo, não há reação ao catálogo. Nenhum evento marca o fim: sem chamada, sem toast, sem créditos, sem tela. O jogador fica num prédio aceso com um porteiro que repete a mesma frase.

### 3.10 Quebras de sequência e pontas soltas mecânicas

1. **Gaveta antes de tudo.** `office-cabinet` está a 3 m do spawn, é mirável no escuro, e o teclado só confere a digitação. Quem sabe (ou chuta com a ajuda do primeiro dígito) lê o bilhete antes da carta da Helena, antes do Jorge, antes de ver uma peça. A dica 4 do rádio é então pulada.
2. **Luz opcional.** Só a luminária tranca algo. O "loop sala escura → restaurar → sala limpa" (`docs/PLANO-DO-ZERO.md:127-128`) não é exigido por nada.
3. **Código com cinco fontes e uma armadilha.** `1896` em cinco chaves; `1895` em nove.
4. **Dois sistemas de dica sobrepostos.** O Jorge nomeia a peça exata de graça; a escada da tranca, aos 45 s, diz só "Ala 1".
5. **Atalho que nunca vira atalho.** Não encurta nenhuma ida: do átrio ele nunca abre.
6. **Efeitos só em peça.** `applyUnlockEffect` roda ao catalogar (`Interaction.tsx:395`). Abrir tranca, ler documento, fechar conjunto ou resolver ritual não disparam nada.
7. **Condições curtas.** `ProgressCondition` (`schema.ts:277-298`) não sabe perguntar por credencial, peça específica, fio, fato ou sala visitada: o rádio e a lista não conseguem acompanhar um segundo ato.
8. **Modal invisível** para qualquer tranca que não seja de conhecimento (§3.4).
9. **Sem painel de ajustes.** `brightness`, `headBob`, `fovPush`, `quality` existem no store e são lidos pela cena; as chaves `ui.settings`, `ui.brightness`, `ui.motion*`, `ui.quality`, `ui.readingMode` não são usadas por nenhum componente. O brilho, que o plano chama de inegociável (`docs/PLANO-DO-ZERO.md:453-454`), não tem controle.

---

## 4. O que agosto desenhou e não existe — schema contra runtime

### 4.1 Conteúdo desenhado e não construído (`docs/PLANO-COMPLETO.md`)

| Categoria | Desenhado | Ref. |
|---|---|---|
| Salas | Paris, Tóquio, Ferro e Areia, A Reescrita, Global, mezanino, cofre | `:20-24`, §5–§11 |
| Trancas de conhecimento (6 novas) | `paris-statutes-box` (14), `tokyo-trophy-punch` (1962), `ironsand-kiraly-shirt` (15), `ironsand-coach-file` (1973), `rewrite-ball-tower` (1998), `global-beach-trunk` (2002) | `:109-134` |
| Rituais (5) | `paris-seating-plan`, `kaizuka-motion-rail`, `ironsand-honours-rail`, `rewrite-congress-case` (sem forma de interação, `:492-493`), `global-ball-casts` | §5–§9 |
| Distintivos (4) | `indoor` (Holyoke: duas bolas + rede), `beach` (Tóquio: tampa de garrafa), `sitting` (Global), `snow` (mezanino) → gavetas do armário do registrador, no escritório | `:37-58` |
| Medalhas (3) | `founding` (Paris, código 14), `olympic` (Tóquio, código 1962), `global` (ritual das seis bolas) → plinto do átrio | `:60-77` |
| Ferramentas (3) | `crate-dolly` (Ala 4), `service-key` (escritório, consumida), `step-ladder` (mezanino); `breaker-handle` "não duplique" | `:101-105` |
| Fios (5) | `ball` (6 nós, um por ala), `net`, `rules`, `beach`, `sitting`; dois fios fechados abrem o mezanino | `:79-99` |
| Mezanino | vitrine de neve, parede de créditos, vista do plinto | `:395-408` |
| Cofre e final | plinto gira → luzes gerais → escada desce → livro de tombo + segunda carta → reetiquetar o catálogo (original / reconstrução / fac-símile) → assinar o livro de visitas → cofre reabre no átrio, sem créditos | `:412-445` |
| Pendências declaradas | URLs não capturadas; lint de numerais inexistente; ritual sem forma; neve pouco pesquisada; carga de leitura não somada | `:475-501` |

### 4.2 Tipo por tipo

| Tipo no schema | Linha | Conteúdo o usa? | Validador | Runtime |
|---|---|---|---|---|
| `BadgeId` (4) | `schema.ts:127` | não | via `lockCredentialKeys` | nada |
| `MedallionId` (3) | `:130` | não | idem | nada; peça `medallion-socket` assada e sem uso |
| `ToolId` (4, inclui `breaker-handle`) | `:133` | não | idem | nada; `consumesTool` não é lido |
| `ThreadId` (5) | `:136` | sim: 10 peças declaram `threads` | não | **nada lê `threads`** |
| `Credential` | `:138-141` | não | sim | `grantCredential` grava `"tipo:id"` (`store.ts:805-809`); ninguém consome nem mostra |
| `Lock` `knowledge` | `:180-190` | 1 | sim | completo, com as limitações de §3.3 |
| `Lock` `badge` / `medallion-plinth` / `tool` / `ritual` | `:158-198` | não | sim (`ritual` conta como aberto ao alcançar a sala, `validate.ts:418-420`) | **sem interface nenhuma** |
| `HintLadder` | `:149-156` | 1 | não | parcial: texto fixo, sem brilho na placa, sem áudio |
| `UnlockEffect` (4 variantes) | `:200-204` | **nenhuma peça declara `unlocks`** | `grant-credential` na solvabilidade; referências das outras | as quatro implementadas (`store.ts:851-867`), disparadas só ao catalogar |
| `Portal.lockId` | `:594` | não | sim | **não** |
| `RoomData.powerLockId` | `:816` | não | sim | sim, só conhecimento |
| `DocumentData.audioId`, tipos `telegram`/`scorecard`/`oral-history` | `:327-351` | não | não | sem leitor de áudio |
| `RoomData.audio` | `:810` | 2 emissores | não | **sem leitor** |
| `EraId` | `:357-366` | 3 de 9 | sim | genérico; **falta `mezzanine`** |
| `PaletteId` (9) | `:770-779` | 3 | não | pouca variação real (`docs/HANDOFF.md:525-526`) |
| `ExhibitMount` `plinth`/`vitrine-*`/`wall` | `:229-235` | não (tudo `floor`/`case-wall`) | sim | sim (`MuseumScene.tsx:203-211`) |
| `nicknameKey` | `:789` | 3 | traduções | não exibido |

### 4.3 Capacidades que o plano exige e o schema ainda não expressa

1. Efeito ao **abrir tranca/container** (a medalha `founding` sai da caixa-despacho).
2. Efeito ao **fechar conjunto ou fio** (`indoor` = três peças; mezanino = dois fios).
3. Tranca **por contagem** e códigos de **dois dígitos** (`14`, `15`).
4. **Ritual**: estado, interface, solução como dado.
5. **Soquete de medalhas** como interação, com efeito composto (luz geral, abrir portal).
6. **Energia em níveis** (luz de serviço × luz geral).
7. `ProgressCondition` com credenciais, peças, fios, fatos, salas visitadas.
8. **Trancas tocadas** e **onde o fato foi visto**, para o mapa.
9. **Proveniência por peça** (original / reconstrução / fac-símile) para o livro de tombo. Hoje vive em prosa nas fichas ("Reprodução", "Fac-símile", "Reconstrução tipológica").
10. **Evento de fim** e estado pós-final.
11. Hotspot com **normal própria** e exame com **distância/escala por peça** (§3.5).
12. Porta que **lembra** que foi destrancada.

---

## 5. Contradições e lacunas entre agosto e outubro — com resolução proposta

Formato: o que agosto diz · o que está construído/escrito · proposta.

### C1 — Cofre no subsolo com acesso pelo átrio × "o subsolo alagou"
- **Agosto:** "O cofre fica no subsolo, com acesso pelo átrio"; "A escada desce" (`PLANO-COMPLETO.md:414-422`).
- **Outubro:** Jorge proíbe o subsolo porque alagou (pt-BR:171); bilhete, dica e planta confirmam "sob o átrio". Não há escada, alçapão nem subsolo no código; o centro do piso é um disco de 16,4 m (`atriumDecor.mjs:109-117`).
- **Proposta:** tratar o alagamento como **a trava diegética do terceiro ato**, não como erro. A bomba de drenagem depende do disjuntor geral; religá-lo é o mesmo gesto que acende as luzes gerais (C3). A fala do Jorge vira prenúncio, e ele ganha chamadas de acompanhamento. A descida fica **dentro do anel de 1,70 m** que já cerca o pedestal: o anel deixa de ser decoração e vira guarda-corpo do poço.

### C2 — "Plinto já construído, visível do spawn, com três soquetes"
- **Agosto:** `PLANO-COMPLETO.md:64-65`. O comentário em `museum.ts:975-986` repete.
- **Outubro:** pedestal de quatro botões cercado; `medallion-socket` assado e não colocado; spawn no escritório. Já era falso em 09/08 (`git show 2132ecf:src/content/museum.ts`, linha 539).
- **Proposta:** escolher um receptáculo que já existe: (a) colocar `medallion-socket` (uma malha de latão, um lote) sobre o pedestal; ou (b) usar as **três prateleiras iluminadas da torre-vitrine**, que já tem fechadura. Os **quatro botões** do pedestal casam com os **quatro distintivos**. Corrigir o comentário e o apelido "saguão do plinto".

### C3 — Luzes gerais como clímax × quadro do átrio no minuto 3
- **Agosto:** "As luzes gerais do átrio acendem pela primeira vez. […] É o maior momento do jogo." (`PLANO-COMPLETO.md:419-421`; `PLANO-DO-ZERO.md:163-164`).
- **Outubro:** `atrium-breaker`, chamado "Quadro **geral** do átrio" (pt-BR:139), acende a sala inteira. O HANDOFF registra a correção aprovada e não feita: "quadro do átrio religando só a luz de serviço (o disjuntor GERAL fica para o final)" (`:530-534`).
- **Proposta:** energia em dois níveis no átrio. O quadro atual liga só a luz de serviço (baixa, rasante, teto ainda preto) e muda de nome; o disjuntor geral é o gesto final. Decidir o que `allRoomsPowered` significa. O teste da lanterna (`test-opening.ts:363`) já protege o teto.

### C4 — O escritório agora é o spawn
- **Agosto:** começa-se no átrio; o escritório é o safe room **encontrado** escuro, com a música começando no clique da luminária (`PLANO-DO-ZERO.md:176-182`).
- **Outubro:** spawn no escritório; toda sessão recomeça ali; a placa de dedicação ainda fala como se o átrio fosse a primeira imagem.
- **Proposta:** assumir como cânone. Consequências: (1) reescrever a placa como dedicação de verdade; (2) compor a primeira vista do átrio a partir da **porta leste**; (3) num museu de seis alas, renascer no escritório é uma caminhada longa: decidir se "Continuar" volta à última sala; (4) a música da luminária continua devida.

### C5 — Armário do registrador com quatro gavetas no escritório
- **Agosto:** quatro gavetas rotuladas pelas disciplinas (`PLANO-COMPLETO.md:44-47`).
- **Outubro:** um `archive-cabinet` (modelado com quatro gavetas) inteiro sob a tranca `1896`; mais um arquivo de mapas de dez gavetas; o escritório está no teto de 53 lotes e 36 mil triângulos (`docs/HANDOFF.md:79-82, 422-425`).
- **Proposta:** não acrescentar móvel. O armário alto não serve sozinho: são quatro gavetas para cinco usos (a do Otávio mais as quatro disciplinas). Recomendo que o **arquivo de mapas** (dez gavetas, já no cômodo, `museum.ts:1424`) receba as quatro etiquetas de disciplina e que o armário alto continue sendo a gaveta do Otávio. Exige que o schema aceite vários containers, cada um com a própria tranca, sobre uma peça só.

### C6 — Diário e livro de visitas
- **Agosto:** diário sempre disponível; mapa no "folheto de visita"; livro de visitas é o save e a assinatura final (`PLANO-DO-ZERO.md:336, 438`; `PLANO-COMPLETO.md:442`).
- **Outubro:** o diário é o caderno da Helena; o toast promete "Tab abre a planta, o catálogo e o arquivo" (pt-BR:53); ideia aprovada: folheto na recepção liberando a aba Planta.
- **Proposta:** abas por etapas (caderno → Catálogo, Arquivo e a lista; folheto da recepção → Planta), com o toast reescrito e migração de save. A lista ganha aba ou lugar próprio e avisa quando risca. A assinatura final acontece no livro de tombo do Otávio, e é ela que risca a linha "Cofre".

### C7 — O rádio e o Jorge não existiam em agosto
- **Agosto:** museu vazio; a única "voz" era a gravação do docente no segundo degrau da escada (`PLANO-DO-ZERO.md:372-376`).
- **Outubro:** Jorge com cinco dicas, a última terminal; escada da tranca com um degrau morto; dois sistemas que não conversam.
- **Proposta:** o Jorge **é** o degrau de áudio. Dicas em três alturas por objetivo (onde / o quê / exatamente), a mais explícita só depois de insistir. Uma chamada de conteúdo por marco. Para isso, ampliar `ProgressCondition` (§4.3, item 7). Nunca mais uma dica final que aponte para algo inexistente.

### C8 — A linha do tempo da noite
- **Agosto:** "noite anterior à reabertura", sem relógio; final em loop, sem tempo.
- **Outubro:** 16h47, 9h, chuva, porteiro de plantão; ideia aprovada: "o relógio marcando o avanço da noite até o amanhecer", que contradiz o relógio síncrono que recomeça de onde parou.
- **Regra herdada:** sem cronômetro de falha (`docs/REFERENCIA-TECNICA.md:70`, item 11).
- **Proposta:** a noite avança **por marcos, nunca por minutos**. Cada ato tem uma hora dita pelo Jorge e uma luz (claraboia, quando existir). O relógio de parede continua sendo a relíquia das 16h47, ou ganha a interação "acertar o relógio" como primeiro gesto de curador. O final é o amanhecer, com a Helena chegando às 9h.

### C9 — Cofre do escritório × Cofre do Fundador
- **Agosto:** um cofre só, o do subsolo.
- **Outubro:** cofre de ferro no escritório, à vista do spawn, mudo; a lista diz só "Cofre". Em inglês há *safe* e *vault*; em português, a língua-fonte, é tudo "cofre".
- **Proposta:** nomes distintos e fixos ("o cofre do escritório" × "a caixa-forte" ou sempre "o Cofre do Fundador"). Dar um trabalho ao cofre do escritório: é o lugar natural da `service-key` (que o plano já põe no escritório) e/ou da alavanca do disjuntor geral (`breaker-handle` e a chave `lock.holyoke-power.mapLabel`, "Quadro de força — alavanca", já existem sem uso). Reescrever `notebook.todo.vault`.

### C10 — De onde vêm as medalhas
- **Agosto (PLANO-COMPLETO):** `founding` e `olympic` de duas trancas, `global` de um ritual; Holyoke sem medalha, de propósito (`:67-77`).
- **Agosto (PLANO-DO-ZERO):** fechar o fio da bola "destrava a vitrine central do átrio e uma medalha" (`:227-228`).
- **Outubro:** "Uma de cada era que você catalogar por inteiro" (pt-BR:102). Seis eras, três medalhas; e quem cataloga a Holyoke inteira espera uma.
- **Proposta:** escolher uma regra e reescrever o bilhete para ser literalmente verdadeiro. A interrogação do "3 medalhas?" permite que o Otávio estivesse **incerto**: o bilhete pode dizer o que ele sabia, e o livro de tombo, a verdade.

### C11 — Seis alas abertas desde o primeiro segundo × "PROJETO DE AMPLIAÇÃO"
- **Agosto:** hub com seis alas em qualquer ordem (`PLANO-DO-ZERO.md:103-106, 114`; `PLANO-COMPLETO.md:34-35`). Três plantas diferentes já existem: o diagrama de `PLANO-DO-ZERO.md:136-159` (Holyoke–Paris–Átrio em fila), a planta do escritório (Paris ao norte da Holyoke, Global ao sul dela, sem parede comum com o átrio) e o prédio real.
- **Outubro:** a planta chama as Alas 2–6 e o mezanino de projeto. As paredes do átrio estão todas ocupadas: norte (console de bolas, sofá, mural), sul (recepção, mural), leste (placa de 5,2 m, porta do escritório, torre), oeste (duas portas, quadro, painel de 5,8 m). Não há vão livre para cinco portas, uma escada e um poço.
- **Proposta:** decidir a ficção antes de desenhar sala. **(A) A ampliação é literal:** o museu de hoje é átrio + Ala 1 + escritório + cofre, e esse jogo curto precisa **fechar** (três medalhas dentro do que existe, cofre, amanhecer). Cada ala nova é uma "ampliação inaugurada" com a mesma espinha. **(B) O prédio tem seis alas:** a planta troca de carimbo, e o jogo só fecha com tudo construído. A opção A é a única que atende "ao terminar, 100% jogável" em cada entrega. Em qualquer das duas, a planta precisa bater com o prédio e ter o texto fora do SVG.

### C12 — O fio da bola × o console de bolas do átrio
- **Agosto:** seis nós, um por ala; "você não fecha um fio sem cruzar o prédio inteiro"; ritual final: ordenar seis moldes, "por sala, não por data", sem algarismo (`PLANO-COMPLETO.md:86-99, 371-376`).
- **Outubro:** quatro bolas no átrio, todas `threads: ['ball']`, eras `holyoke`/`tokyo`/`rewrite`/`global`, lado a lado **em ordem cronológica** (`museum.ts:159-270`). Somadas às duas da Holyoke, o fio já tem sete peças em duas salas. Os heróis das Alas 3, 5 e 6 já estão no saguão; a de 1964 diz que "a ficha não identifica o fabricante" (pt-BR:280), e o plano a chama de Mikasa.
- **Proposta:** o console vira **o placar do fio** (a "vitrine central do átrio" do plano original): berços vazios com silhueta, preenchidos quando a bola de cada ala é catalogada. Na opção A de C11, o console é o fio inteiro do jogo curto e o ritual da ordem acontece ali. Em qualquer caso, o ritual não pode ter a resposta exposta.

### C13 — Exclusividade de numerais e fonte única
- **Agosto:** um código aparece como algarismo em **exatamente uma** chave (`PLANO-COMPLETO.md:164-168`); "todo código tem exatamente uma fonte descobrível" (`PLANO-DO-ZERO.md:368-370`). O lint não existe (`:483-485`).
- **Outubro:** `1896` em cinco chaves; `1998` em duas do átrio; `15` em `document.rule-changes.body`.
- **Proposta:** escrever o lint com a regra que o jogo consegue cumprir: uma fonte **de ensino** marcada por tranca, e as outras ocorrências restritas à sala da fonte ou a material atrás da própria tranca. Depois, reescrever as etiquetas do átrio sem o algarismo ou trocar o código 6.

### C14 — Escada de dicas e formato das trancas
- **Agosto:** linha da etiqueta acende, gravação repete, disco clica; `14` conta-se numa roda de latão, "não é teclado"; `15` tem dois dígitos.
- **Outubro:** §3.3.
- **Proposta:** generalizar `LockPanel` (dígitos variáveis, chave de fonte por tranca, estilo de entrada) antes da segunda tranca.

### C15 — "Não cataloga se não virou" × a matemática do exame
- **Agosto:** `PLANO-DO-ZERO.md:378-385`.
- **Outubro:** §3.5.
- **Proposta:** hotspot com normal explícita; exame com distância, escala e pivô por peça; validador que reprove hotspot obrigatório inalcançável ou já visível em repouso; teste headless que gire cada peça. **É o conserto de maior retorno do plano inteiro**: destrava o item 2 da lista, o mapa e o primeiro distintivo.

### C16 — Efeitos de destravamento
- **Agosto:** medalha ao abrir caixa, distintivo ao catalogar três peças, mezanino ao fechar dois fios, documento por ritual.
- **Outubro:** efeito só em peça; `Portal.lockId` sem runtime.
- **Proposta:** §4.3, itens 1, 2, 4, 5, 12, com o validador de solvabilidade acompanhando cada um.

### C17 — O atalho
- **Agosto:** "atalho permanente"; no mezanino, "os atalhos que você abriu, visíveis lá embaixo".
- **Outubro:** só abre de dentro, sempre.
- **Proposta:** persistir a liberação: a primeira saída destranca nos dois sentidos. É o que dá sentido à palavra, e encurta a volta à Holyoke para catalogar.

### C18 — "Atravessar no escuro" × quadro ao lado da porta
- **Proposta:** levar o quadro da Holyoke para o fundo, perto do atalho. Aí a fala do Jorge fica verdadeira e a ala vira um laço completo: entrar no escuro, atravessar, acender, voltar pelo atalho.

### C19 — Por que catalogar
- **Proposta:** uma frase da Helena (o inventário da reabertura precisa da assinatura do curador) e uma do Otávio. Sem isso o item 2 da lista é tarefa sem motivo.

### C20 — Placa de dedicação
- **Proposta:** dedicação real do museu; a premissa já é dita pelo título e pelo caderno. Corrigir o comentário (parede leste, não norte).

### C21 — Nome e idade do museu
- **Proposta:** um nome próprio só. Decidir se "desde 1895" é do esporte (e a placa diz isso) ou se o museu é mais novo (e o bilhete muda).

### C22 — A tempestade que não se vê nem se ouve
- **Proposta:** leitor para `RoomData.audio`; a goteira e a claraboia trincada aprovadas; trocar "janelas" por algo que o prédio tenha até lá. O emissor do átrio já se chama `ambience/atrium-drip` (`museum.ts:1194`).

### C23 — O final não conhece Helena, Jorge nem as 9h
- **Agosto:** livro de tombo, carta, assinatura, cofre reabre, sem créditos.
- **Proposta:** manter a espinha (é a melhor ideia do plano: o museu se declarando) e acrescentar os três pagamentos novos: o Jorge reage ao disjuntor geral e ao cofre; amanhece; a Helena chega. O jogo continua aberto depois, com a lista toda riscada.

### C24 — Mezanino
- **Outubro:** `EraId` não tem `mezzanine`; o átrio já roda a 80 draws contra o alvo móvel de 45 (`docs/HANDOFF.md:99-107`).
- **Proposta:** só entra depois de C11 decidido; na opção A, fica fora do jogo curto.

### C25 — Hotspots com etiqueta emprestada e fato trocado
- Ver Apêndice B. **Proposta:** etiqueta própria para cada um; `filipino-spike` revelado por um hotspot que fale da bomba.

### C26 — Texto da Holyoke × correções da pesquisa
- Ver Apêndice A. **Proposta:** corrigir antes de traduzir qualquer coisa nova; a regra do projeto é que as correções vencem a tabela.

---

## 6. Decisões que só o dono pode tomar

1. **C11:** a ampliação é literal (jogo curto que fecha agora, alas depois) ou o prédio tem seis alas?
2. **C10:** de onde vêm as três medalhas.
3. **Otávio:** o que aconteceu com ele, e se ele é "o Fundador".
4. **C9:** o que há no cofre do escritório.
5. **C3:** aceitar que o quadro do átrio passe a ligar só a luz de serviço.
6. **C4:** "Continuar" renasce no escritório ou na última sala?
7. **C23:** a Helena aparece no final (voz, bilhete, presença) ou só é anunciada?
8. O final "o museu se declara" (livro de tombo) segue valendo? `PLANO-COMPLETO.md:425-427` pede o aval e não há registro de resposta.

---

## Apêndice A — Holyoke: texto do jogo × correções da pesquisa

Regra do projeto: a seção de correções de cada era vence a tabela de marcos (`docs/PLANO-COMPLETO.md:13-14`). Correções em `docs/PESQUISA-CONTEUDO.md:114-195`.

| Chave (pt-BR) | O jogo diz | A correção diz | Linha da pesquisa |
|---|---|---|---|
| `exhibit.net-1897.label` (:325) | "cerca de meio pé acima da cabeça de um homem médio" | "just above the average man's head"; apagar "half a foot" | 154-156 |
| `exhibit.handbook-1897.catalogue` (:335) | "duas palavras — volley ball — até 1952" | 1952 não tem fonte; não pôr em placa | 160-162 |
| `exhibit.guide-1916.catalogue` e hotspot (:343-344) | "Dr. Frank Wood" | "Dr. Frank Woods" (grafia do IVHF) | 157-159 |
| `exhibit.portrait-morgan.catalogue` (:357) | "Deixou a YMCA em 1900" | saiu em **1897** | 139-141 |
| `exhibit.photo-gym.label` / `.catalogue` (:363, 365) | esquina High e Appleton; "serviu de 1886 a 1943" | endereço, 1886 e 1943 não verificados | 172-174 |
| `document.halstead.body`, `exhibit.portrait-morgan.catalogue`, `exhibit.photo-gym.catalogue` (:376, 357, 365) | o nome foi trocado **na demonstração de 7 de julho de 1896** | data e local da troca são disputados (IVHF: visita no início de 1896; Wikipedia/Morgan: dezembro de 1895); separar os dois fatos | 142-144 |
| `exhibit.ball-spalding.label` (:316) | encomenda a Spalding, "cerca de 25 polegadas" | data da bola disputada (1896–1900); a especificação é 25–27 | 184-186 |

O ano `1896` continua defensável como código (o IVHF dá 1896 nas duas versões), mas a história que o jogo conta em torno dele é exatamente a versão que a correção manda rebaixar. O teste `the renaming is dated where history dates it` (`scripts/test-opening-flow.ts:994-1003`) trava a versão disputada.

## Apêndice B — Etiquetas emprestadas, fato trocado e chaves sem uso

| Peça / hotspot | Etiqueta usada | Problema | Ref. |
|---|---|---|---|
| `ball-improvised` / `valve` | `hotspot.ball-spalding.lacing.label` ("Cadarço de couro cru…") | a câmara nua não tem cadarço | `museum.ts:296-299` |
| `gym-suit` / `knit` | `hotspot.ball-spalding.seam.label` ("Costura externa erguida…") | fala de bola num traje | `museum.ts:436-439` |
| `photo-gym` / `apparatus` | `hotspot.net-1897.socket.label` ("Soquete de ferro fundido…") | fala de soquete numa fotografia | `museum.ts:487-490` |
| `guide-1916` / `credit` | "Morgan credita Frank Wood e John Lynch" | revela o fato `filipino-spike` | `museum.ts:409-414` |

Chaves de `pt-BR.ts` que nenhum componente usa (cada uma é um sistema prometido): `lock.hint.highlight`, `lock.hint.audio`, `lock.hint.reveal` (:395-397); `lock.opened` (:107); `lock.holyoke-power.mapLabel` (:394); `prompt.open` (:63); `prompt.journal` (:113); `map.legend` (:86); `ui.settings`, `ui.brightness`, `ui.motion`, `ui.motion.headbob`, `ui.motion.fov`, `ui.quality`, `ui.readingMode` (:27-34); os três `room.*.nickname`.
