# 10 — Desenho "sempre completável": do apagão ao último termo

Ângulo deste desenho: **em toda entrega, o jogo publicado vai da tela de título a um final de verdade, sem beco.**
Repositório `Volleyball Museum` em `main` / `82756c4`, lido sem escrever nada nele.

**Base lida.** Os sete relatórios de `wf3` (01 a 07) por inteiro; `AGENTS.md`; `docs/PLANO-COMPLETO.md` por
inteiro; `docs/HANDOFF.md` §1–§4, §7–§9.7; e, para conferir o que proponho mudar, `src/content/schema.ts:80-310,
355-366`, `src/content/validate.ts:395-588`, `src/state/store.ts:50-260` e `src/content/museum.ts:520-650, 884-1458`.
**Não rodei o jogo, o bake nem o `check`.** Coordenadas novas e números de custo são proposta a validar pelos
portões de §7; onde isso pesa, está marcado **[a validar]**.

**Nomes.** "Entrega" é `E0…E8` (o que vai ao ar). "Pacote" é `M0…M30`, do relatório 06 (o que o motor precisa).
Defeitos são citados pelo relatório de origem: `ÁT-` (02, átrio), `H-` (03, Holyoke), `AS-` (04, assets),
`C1…C26` e `P1…P32` (01, cânone).

---

## 0. A tese em uma página

1. **O final deixa de ser um lugar e vira um gesto que se repete: assinar um termo.** O Otávio deixou no cofre do
   escritório o *Livro de Termos*. Cada entrega acrescenta uma página; assinar a página é o final daquela
   entrega. A última página fecha o jogo.
2. **A ampliação é literal** (C11, opção A). O museu de hoje é escritório + átrio + Ala 1. As Alas 2–6 são a
   "PROJETO DE AMPLIAÇÃO" que a planta do escritório já mostra. Cada ala nova é uma inauguração, com termo próprio.
3. **Ninguém desce ao subsolo. A caixa-forte sobe.** O plinto do átrio é a tampa da caixa-forte do Fundador; três
   medalhas soltam a alavanca da força geral, a bomba esvazia o poço e o monta-cargas ergue o cofre dentro do anel.
   A fala do Jorge ("não desce no subsolo, que alagou") fica verdadeira para sempre, e o item mais caro do motor
   (escada, piso inferior, sala alagada: pacotes M22 e M26) sai do caminho do primeiro final.
4. **Só se acrescenta.** Uma entrega nunca endurece a exigência de uma ação que já existia nem tira o que ela
   concedia (regra R1). Com isso, todo save antigo continua sendo um estado válido do jogo novo, e a prova é
   mecânica (§6 e §7).

| Entrega | Final (o que o jogador assina) | Salas | Tamanho |
|---|---|---|---|
| **E0 — Posse** | `termo-posse`: luz nas três salas + o Livro tirado do cofre do escritório | escritório, átrio, Holyoke | M |
| **E1 — Reabertura** | `termo-reabertura`: três medalhas, força geral, caixa-forte, livro de tombo lido → amanhece | as mesmas, polidas | GG (sete fatias publicáveis) |
| **E2 — Paris** | `termo-ala-paris` | + Ala 2 | G |
| **E3 — Tóquio** | `termo-ala-tokyo` | + Ala 3 | G |
| **E4 — Ferro e Areia** | `termo-ala-iron-sand` | + Ala 4 | G |
| **E5 — A Reescrita** | `termo-ala-rewrite` | + Ala 5 | M/G |
| **E6 — Global** | `termo-ala-global` | + Ala 6 | G |
| **E7 — Mezanino** | os anteriores (acrescenta conteúdo, não final) | + mezanino | GG (com plano B) |
| **E8 — Encerramento** | `termo-encerramento`: a porta da rua abre | + portaria | M |

O final de história é o de **E1** (a noite fecha, a Helena chega). E0 é o primeiro ato com cerimônia própria; E2–E6
são inaugurações; E8 é o 100%.

---

## 1. Seis regras de entrega

**R1 — Só acrescenta.** De uma entrega para a seguinte, toda ação que já existia mantém a mesma guarda ou uma
mais fraca, e concede o mesmo ou mais. Nó novo pode exigir o que quiser, desde que a simulação prove que é
alcançável. Trocar o id de qualquer coisa exige alias de save.

**R2 — Guardas positivas e listas congeladas.** O que abre, concede ou assina só pergunta "o jogador tem X?".
Condições negativas (`unpowered`, `locksClosed`, `documentsUnread`, `flagsUnset`) ficam para apresentação: fala do
Jorge, dica, legenda. `allRoomsPowered` e `allCatalogued` saem de qualquer guarda e de qualquer item de lista:
viram listas explícitas de ids, congeladas na entrega que criou o item (hoje cada sala nova desrisca o item 1 em
saves antigos — P4).

**R3 — Efeito é gatilho, reavaliado na carga.** Nada acontece "na hora do E" e só nela. Abrir tranca, catalogar
conjunto e assinar termo viram `Trigger { when, effects }` de disparo único, executados no store até ponto fixo
depois de cada mudança **e depois de carregar um save**. É o que entrega a um save de hoje (gaveta `1896` já
aberta) a chave que a gaveta passa a conceder em E0.

**R4 — Promessa datada.** Tudo o que é visível e ainda não tem uso nesta entrega leva `deferred: true` no dado,
um aviso no mundo (tapume, lacre, etiqueta a lápis), uma fala do Jorge que diz "hoje não" e fica fora de toda
lista de "o que falta". Nunca está no caminho de um final. A entrega final tem zero promessas datadas.

**R5 — Todo final é um termo assinado, e nada depois dele desliga nada.** Depois de assinar, o jogo continua
aberto, sem créditos rolando (PLANO-COMPLETO §11, passo 6). Nenhuma guarda usa "ainda não assinou".

**R6 — Todo deploy passa nos mesmos portões.** Não só o fim de entrega: cada fatia de E1 vai ao ar com
`ending-reachable`, o robô de partida e o corpus de saves verdes (§7).

---

## 2. A história inteira

### 2.1 Cânone fechado (propostas; as que dependem do dono estão em §9.3)

| Lacuna (01 §1.6) | Proposta |
|---|---|
| Destino do Otávio | Aposentou-se no mês passado, depois de trinta anos. Está vivo e longe. Fala por bilhete, pelo Livro e por um recado na secretária eletrônica. Não é o Fundador. |
| "O Fundador" | Quem começou o acervo. Sem nome e sem data (nada que envelheça). A caixa-forte é dele; o Otávio foi o último guardião. |
| Quem escreve a lista | A Helena. Listas novas são páginas novas dela no caderno; item antigo nunca muda de condição. |
| Portaria e porta da rua | Atrás da porta grande da parede sul do átrio ("ENTRADA"). Fechada até E8. O Jorge está do outro lado dela. |
| Por que catalogar hoje | Helena: "o inventário da reabertura precisa da assinatura do curador". Otávio: cada medalha exige uma parte da casa conhecida por inteiro. |
| "Desde 1895" | É o jogo, não o museu: "O JOGO DESDE 1895". Sai "existe há cento e trinta anos" (envelhece). |
| Nome | "Museu do Vôlei" em tudo (interface, placa, planta, gravação do Jorge). |
| Hora | A noite avança por marcos, nunca por minutos (C8). O relógio continua sendo a relíquia das 16h47. |

Marcos da noite, ditos pelo Jorge: apagão (16h47) → luz do escritório → Posse ("passou da meia-noite") → força
geral ("quase cinco") → Reabertura (amanhece; a Helena chega). Depois da Reabertura o jogo vive "fora do
expediente": cada sessão começa no escritório, como já é hoje, e isso passa a ser o turno do curador.

### 2.2 Ato I — Posse (E0)

1. Escritório no escuro. Lanterna (F), caderno da Helena, luminária. A luminária destrava a porta e dá carga ao rádio.
2. Jorge se apresenta e manda ao quadro do átrio. O jogador cruza o átrio e religa a luz.
3. Ala 1: entra no escuro, atravessa até o quadro no fundo (C18), acende, e pode sair pelo atalho, que fica
   destrancado para sempre.
4. O P.S. da Helena ("trancava tudo com datas") leva ao retrato do Morgan. A data está no **verso** da moldura.
5. Gaveta `1896` no escritório: o bilhete do Otávio com **a chave do cofre do escritório** presa na folha.
6. Cofre de ferro: dentro, o **Livro de Termos**. É o que a tela de título prometia ("Seu antecessor deixou alguma
   coisa no cofre") e o que risca o item 3 da lista.
7. Púlpito do átrio (hoje em branco): o jogador pousa o Livro e **assina o termo de posse**. Jorge fecha a noite.

### 2.3 Ato II — Reabertura (E1)

1. A página seguinte do Livro, com a letra do Otávio, explica a caixa-forte: três medalhas, uma de cada parte da
   casa conhecida por inteiro.
2. **Medalha do Curador**: na fita do chapéu do Otávio, no cabideiro (P32 passa a ter dono).
3. **Medalha da Fundação**: dentro da vitrine-herói da Ala 1, à vista desde a primeira visita. O Jorge solta a
   trava do painel dele quando as oito peças da ala estão catalogadas.
4. **Medalha da Linhagem**: é o disco que já está modelado na torre-vitrine do átrio (AS-A11). Solta quando as
   quatro bolas do console estão catalogadas.
5. Plinto: três soquetes. Assentadas as três, a alavanca da **força geral** solta.
6. Alavanca: as luzes gerais sobem em cascata do plinto para o teto — a primeira vez que se vê o pé-direito. A
   bomba liga, o poço esvazia, o monta-cargas ergue a caixa-forte dentro do anel.
7. Dentro: o **livro de tombo** e a segunda carta do Otávio. Ler o tombo carimba cada ficha do catálogo com a
   proveniência (original, reconstrução de época, fac-símile). O pedido da carta: *continue declarando*.
8. Púlpito: **termo de reabertura**. Amanhece. A Helena fala pelo rádio do Jorge. O jogo continua aberto.

### 2.4 Ato III — A ampliação (E2–E6)

Depois da Reabertura, cada tapume do átrio vira porta quando a ala é publicada. Dentro da caixa-forte há cinco
pastas lacradas ("abrir quando houver parede"); a pasta de cada ala é o documento de abertura dela. As cinco alas
abrem em qualquer ordem, como o plano de agosto queria — mas só depois do Ato II. Cada ala repete o laço (escuro →
quadro → peças → tranca → arquivo) e fecha com o próprio termo, que acende o medalhão dela na parede de orientação.

### 2.5 Ato IV — Encerramento (E7–E8)

Dois fios fechados abrem o mezanino (vôlei de neve, parede de créditos, a vista do saguão). Com as seis alas
inauguradas, as quatro gavetas do registrador abertas e os cinco fios fechados, o **termo de encerramento** abre a
porta da rua. Do outro lado, a portaria: a garrafa de café, as palavras cruzadas, o radinho de pilha e o painel
que mostrava a energia sala a sala. O jogo começa no fundo do prédio e termina na porta da frente.

### 2.6 Textos que mudam (rascunho pt-BR; `en.ts` acompanha)

- `document.predecessor.body` (E0): "Se você está lendo isto, achou a combinação — o que significa que leu as
  placas em vez de passar por elas. Bom. A chave presa nesta folha é do cofre desta sala. O que deixei para você
  está lá dentro: o Livro de Termos. Assine quando a casa estiver de pé. Não tenha pressa: o museu reabre amanhã,
  mas sabe esperar."
- `notebook.todo.power`: "Religar a energia: escritório, átrio e Ala 1". `notebook.todo.vault`: "Cofre do
  escritório — só o Otávio sabia abrir".
- Livro, página II (E1): "A caixa-forte do Fundador fica sob o saguão; o plinto é a tampa dela. Não abre com
  números: abre com três medalhas, uma de cada parte desta casa que você conhecer por inteiro. A do curador sempre
  andou na fita do meu chapéu. As outras duas o Jorge libera quando o inventário fechar. Com as três assentadas, a
  alavanca solta: é a força geral. A bomba faz o resto."
- Segunda carta (E1): o livro de tombo, o pedido de continuar declarando e as pastas lacradas das alas.
- Planta do escritório: o texto sai do SVG e vai para o i18n; o lápis vermelho "3 medalhas?" fica (é a dúvida do
  Otávio quando desenhou o mecanismo; a página II responde).

### 2.7 A escada do Jorge na espinha (o degrau mais explícito de cada fronteira)

Cada linha é um estado em que o jogador pode estar parado. A dica só vale enquanto a ação está pendente e sempre
nomeia um alvo que existe e responde ao `E`.

| Ação pendente | O que o Jorge diz no último degrau |
|---|---|
| I-05 | "Quadro de serviço do saguão: sai do escritório e segue reto; é a luzinha vermelha do outro lado." |
| I-07 | "O quadro da Ala 1 fica lá no fundo, do lado da porta de serviço. Atravessa no escuro mesmo: a lanterna dá conta." |
| I-09 | "Gaveta do Otávio: uma data. Retrato do Morgan, Ala 1. Vira a moldura: tá escrito atrás." |
| I-10 | "A chave que tava no bilhete é do cofre de ferro aí do escritório, do lado da estante." |
| I-11 | "Leva o Livro pro púlpito do saguão e assina. Só assina com luz nas três salas." |
| II-02 | "O Otávio nunca tirava a medalha do chapéu. O chapéu ficou no cabideiro." |
| II-03 / II-05 | "Falta virar a rede e o traje" — a dica lista as peças que faltam, pelo nome. |
| II-07 | "Três medalhas, três encaixes no plinto. Uma de cada vez." |
| II-08 | "Soltou a alavanca? Então puxa. E olha pra cima." |
| II-11 | "Leu o tombo? Agora é o púlpito. A Helena tá pra chegar." |
| depois do último termo da entrega | "Tá tudo aberto, curador. As alas novas só quando a obra chegar: as pastas tão lacradas na caixa-forte." |

A última linha é a única dica terminal do jogo, e ela adia em vez de apontar (R4).

---

## 3. As 26 contradições, resolvidas

| # | Resolução neste desenho | Entrega |
|---|---|---|
| C1 | O alagamento é a trava do Ato II. A bomba depende da força geral. Ninguém desce: a caixa-forte sobe pelo poço sob o plinto, e o anel de 1,70 m é o guarda-corpo do poço. | E1 |
| C2 | `atrium-central-podium` (quatro botões) dá lugar a `atrium-plinth`, com três `medallion-socket` e a alavanca. Comentário de `museum.ts:975-986` e PLANO-COMPLETO §2.2 corrigidos. Os quatro distintivos vão para o arquivo de mapas do escritório. | E1 |
| C3 | Duas etapas de luz no átrio. `atrium-breaker` mantém o id (save) e vira "Quadro de serviço"; a força geral é a alavanca do plinto. | E1 |
| C4 | O escritório é o spawn e o começo de todo turno. A primeira vista do átrio passa a ser composta da porta leste: dedicatória e medalhões das alas na parede oeste. Música no clique da luminária em E1. | E1 |
| C5 | Nenhum móvel novo. O arquivo de mapas (`office-flatfile`) recebe quatro gavetas de disciplina; o armário alto continua sendo a gaveta do Otávio. | E1 |
| C6 | Abas por etapa: caderno → Catálogo, Arquivo, Lista; folheto da recepção → Planta; Livro → Termos; primeira credencial → Coleção; E7 → Fios. A assinatura é no Livro, sobre o púlpito. Save antigo que já tem o diário ganha `floorplan` na migração (não se tira aba de ninguém). | E0/E1 |
| C7 | O Jorge é o degrau de áudio. Três alturas de dica por objetivo, uma chamada por marco, e nunca mais uma dica final apontando para o que não existe (`hint-points-to-nothing`). | E0 |
| C8 | Marcos, não minutos (§2.1). | E0/E1 |
| C9 | Nomes fixos: "o cofre do escritório" (*office safe*) e "a caixa-forte do Fundador" (*the Founder's vault*). O cofre do escritório ganha trabalho: guarda o Livro. | E0 |
| C10 | Três medalhas = as três partes da casa original: `curator` (escritório), `founding` (Ala 1), `lineage` (átrio). O bilhete e a página II são literalmente verdadeiros. As alas não dão medalha: dão termo e medalhão na parede. O mapeamento de agosto (Paris, Tóquio, Global) sai. | E1 |
| C11 | Opção A. A planta está certa; quem muda é o plano de agosto. | E0 |
| C12 | As quatro bolas do console ficam no átrio para sempre (R1 proíbe movê-las: a medalha `lineage` depende delas). Perdem `threads`. Os nós do fio `ball` são objetos **das alas** e fazem par com o saguão: em Tóquio, a bola de 1964 *usada* (a do saguão é a que nunca entrou em quadra — fonte C37); na Reescrita, a última branca (a sucessora está no saguão). | E0 (dado), E3+ |
| C13 | Lint `numeral-exclusivity` com `Fact.printedIn` e exceções declaradas (§7.3). `1896` cai de cinco para três chaves, todas na Ala 1. | E0 |
| C14 | Teclado de N dígitos, dica com sala e peça da fonte, último degrau que resolve. Roda de contagem e painéis de ritual chegam com E2. | E0/E2 |
| C15 | Examinar v2 (pacote M4) é a primeira coisa de E0. | E0 |
| C16 | `Trigger` no store; `Lock.onOpen`; `Portal.lockId` lido pelo runtime (R3). | E0/E1 |
| C17 | `progress.doorsReleased`: a primeira saída destranca nos dois sentidos. | E0 |
| C18 | `holyoke-breaker` vai para o fundo da ala, parede leste, entre a foto do prédio e o atalho (≈ `[5.86, 1.15, 5.2]` local **[a validar]**). Resolve também ÁT-B4 (pilotos costas com costas). | E0 |
| C19 | Uma frase da Helena e a regra das medalhas. | E0/E1 |
| C20 | Dedicatória de verdade, na parede oeste, sem biombo na frente; comentário corrigido. | E1 |
| C21 | §2.1. | E0 |
| C22 | Leitor de `RoomData.audio` (M18): chuva na claraboia, goteira, bomba. "Janelas" vira "claraboia". | E1 |
| C23 | Jorge reage à força geral e à caixa-forte; amanhece; a Helena fala pelo rádio dele. | E1 |
| C24 | Mezanino só em E7, por elevador de cabine; `EraId` ganha `mezzanine` e `lodge`. | E7 |
| C25 | Etiqueta própria por hotspot; `filipino-spike` passa a ser revelado por um documento que fala da bomba. | E0 |
| C26 | Apêndice A de 01 e §2.2 de 07 corrigidos antes de qualquer texto novo ser traduzido. | E0/E1 |

Promessas da abertura (01 §2) que hoje não pagam e onde pagam: P3 e P19 (cofre do escritório) em E0; P5 (catalogar)
em E0; P6 (item "Cofre") em E0; P16 (atravessar no escuro) em E0; P25 (atalho) em E0; P2, P11, P21–P24 (9h,
medalhas, caixa-forte, subsolo, plinto) em E1; P8 (planta) em E1; P10 (tempestade) em E1; P27 (dedicatória) em E1;
P28 (telefone) em E1; P29 (arquivo de mapas) em E1; P30 (torre) em E1; P31 (seis medalhões) em E1 e E2–E6; P32
(chapéu) em E1.

---

## 4. As entregas

Cada entrega termina com: `npm run check` verde, instantâneo do grafo (§7.2), corpus de saves ampliado, percurso
de título a final feito no navegador em pt-BR e em inglês (desktop e viewport de toque), três capturas por asset
tocado, commit, push, deploy e fumaça em produção.

Aviso para quem implementar: quatro testes travam de propósito o comportamento que este plano muda —
`scripts/test-opening.ts:198` (item do cofre sem `doneWhen`), `test-opening-flow.ts:971-1003` (1896 na plaqueta e
a versão contestada da renomeação), `test-navigation.ts:428` (`reciprocalPairs.size === 3`) e
`test-kit-runtime.ts:267-302` (tetos por nome de sala). Mudam junto, com aviso ao dono.

### E0 — Posse ("o verbo funciona e a noite tem fecho")

**Final:** `termo-posse` assinado no púlpito. Cartão "Termo de posse assinado" e chamada `porter-posse`.

**Grafo novo:** I-09 a I-12 de §5.1.

**Correções das auditorias que entram (tudo o que quebra o verbo ou o fecho):**
- Exame: H-01, H-02, H-03, H-04, H-05, H-06, H-07, H-10; ÁT-C1, C2, C3. Peças grandes (`net-1897`, `gym-suit`)
  passam a `examine: 'in-place'`.
- Vitrine corrida: H-13 / AS-H1 (as quatro peças em apoio real; onda 0.1 de 04).
- Cadeia do 1896: H-18 (data no verso, virar de lado), H-19 (escada de dicas), H-21, H-22; H-11, H-12 (etiquetas e
  âncoras próprias).
- Texto histórico com erro factual: H-38, H-39, H-41, H-44; fontes mortas de `FACTS` (07 §2.3).
- Quadro do átrio: ÁT-A1 (proxy de face dupla, colisor). Atalho: ÁT-G1 / H-29. Porta sem saída: ÁT-G2 (se a sala
  vizinha não fica pronta em N segundos, a porta abre em modo degradado — é a única saída do escritório).
- Roteiro: ÁT-D1 na forma mínima (o jogo passa a ter fim), H-23, H-33 (`locksSeen`), ÁT-H3 (rotas do spawn real).
- C12: `threads` sai das quatro bolas do átrio.

**Motor:** M0 (validadores sem tocar no runtime), M2 (save por tabela de campos, sem subir `SAVE_VERSION`), M4,
núcleo de M5 (`flags`, `Trigger`, condições `flags`/`credentials`/`catalogued`/`anyOf`), fatia de M6
(`lockRules.attemptLock`; tranca `tool` em container abre sem painel ou diz o que falta — fecha o modal invisível
A1 de 06), fatia de M25 (`MuseumContent.terms`, dispositivo `signing-desk`, segurar `E` para assinar, sem texto
livre), fatia de M9 (chamadas por marco, dica com `targetId`), M10 v1, M11 v1, e a parte de M15 que prova o alcance
de cada interativo das três salas.

**Dados novos:** `office-safe` sai do `kit` e vira container (tranca `tool`, `service-key`, consumida);
`doc-termos`; `termo-posse`; `Lock.onOpen` em `office-drawer` (concede `tool:service-key`).

**O que fica pendente e honesto em E0:** o item 2 da lista ("Catalogar o acervo") continua aberto e alcançável —
não é condição da posse, é o trabalho do Ato II. A única promessa datada é a caixa-forte: o lápis vermelho da
planta continua na parede, e o Jorge, se perguntado depois da posse, adia ("isso fica pra quando o subsolo secar").

**Saves de hoje:** quem já abriu a gaveta recebe a chave na carga (R3) e ouve `porter-legacy-drawer` ("Olha de novo
a gaveta do Otávio: o bilhete tinha uma chave presa"). `catalogued` e `hotspots` são mantidos como estão, mesmo
para as duas peças que hoje catalogam sozinhas.

### E1 — Reabertura (o pedido do dono: as mesmas correções, tudo polido, e a história fecha)

Sete fatias, cada uma publicável. O final disponível é o de E0 até E1.2; daí em diante, o de E1.

| Fatia | Conteúdo | Defeitos e itens | Motor |
|---|---|---|---|
| **E1.1 Luz e energia** | Etapas `dark` / `service` / `house` no átrio; emissivo e `selfIllumination` obedecem à energia; quadro como dispositivo (lente vermelha → verde, alavanca que desce, estalo, rampa de 1,2 s em cascata); cinco focos autorados na Holyoke em vez de sete amostrados; luz de mão no exame | ÁT-A3, A4, A6, B1–B5; H-08, H-24–H-27; AS-S6; 04 ondas 0.5, 0.7 e §5.6 | M17 |
| **E1.2 A espinha** | Medalhas, plinto, alavanca, monta-cargas, caixa-forte, tombo, termo, amanhecer, Helena; aba Coleção; aba Anotações (`factsKnown` deixa de ser estado morto) | ÁT-D1, D2, I2; H-20, H-23; AS-A6, A7 | M7, M23, M24, resto de M25, M9 |
| **E1.3 Pipeline e materiais** | Paleta chega à casca; madeira e lona neutras; veio no eixo longo; `normalScale`; passe de vinco; horizonte no ambiente; bolas tesseladas; realocação de VRAM; fusão do kit por material (o átrio está em 56 de 56 lotes) | AS-S1–S5, S7, S10; 04 ondas 0.2–0.4, 0.6, 1.1–1.5, 1.7; AS-L1, L3, L5 | M1, M3, M21, M14 |
| **E1.4 Átrio, primeira vista** | Lambri na casca, disco do piso, recepção, lounge e sofá, torre, banners, púlpito, parede de orientação com seis medalhões e legenda, biombos, claraboia; dedicatória na parede oeste; tapumes das cinco alas e a porta "ENTRADA"; atalho com placa "SERVIÇO"; cordas com colisão | ÁT-A2, E1 (os 17 itens), F1–F4, H1, H2, K1–K3; AS-A1–A20; 04 §5.3 | M19 (gavetas) |
| **E1.5 Holyoke, heróis** | Spalding com material próprio; vitrine corrida com recheio como dado; vitrine-herói; traje em lã com forma de roupa; rede no meio da quadra, com barriga; conjunto de treino; impressos com capa e página; câmara em borracha lisa e nicho à altura da mão; verso da tela de entrada; colisores de rede e manequim | H-14–H-17, H-31, H-32, H-47, H-48, H-51; AS-H1–H16; 04 §5.4 e §5.5 | — |
| **E1.6 Texto no mundo** | Etiqueta legível em toda peça (`ExhibitData.labelPlate`); quiosque com a linha do tempo da ala; placas do console; legenda da planta, seta e norte; catálogo com "falta virar"; correções de 07 §2.1–§2.2; carga de leitura por texto | ÁT-A5, C5–C7, I1; H-09, H-34, H-35, H-40, H-42–H-46, H-49, H-50, H-53; AS-S9 | M15 completo |
| **E1.7 Som, ajustes e toque** | Chuva, goteira, relés, bomba, trancas; música da luminária; tela de ajustes com brilho; foco nos painéis; exame no telefone | ÁT-B6, J; H-28, H-30, H-37, H-52; C22 | M18, M27 |

**Promessas datadas de E1** (R4), com aviso no mundo: cinco tapumes de ala; a porta "ENTRADA"; três gavetas do
registrador com etiqueta a lápis ("quando houver ala"); cinco pastas lacradas na caixa-forte; cinco medalhões
apagados na parede de orientação.

**Saves de E0 em E1:** a posse assinada já libera a medalha do chapéu; quem já catalogou a Ala 1 ou o console
encontra a vitrine ou a torre soltas na carga (R3). O átrio fica mais escuro para quem volta, porque o quadro passa
a ligar só a luz de serviço: uma chamada única do Jorge explica ("a geral caiu de novo com a chuva; o quadro de
serviço segura").

### E2 — Paris

Primeira tarefa: a **planta da ampliação** (origem das cinco alas, vãos no átrio, validador `room-overlap`), que
redesenha `office-blueprint.svg`. Proposta inicial de vãos **[a validar]**: norte, Alas 2 e 3; leste, Ala 4 (onde
hoje estão a dedicatória e a torre); sul, "ENTRADA" e Alas 5 e 6. Portão de agosto mantido: acrescentar a ala foi
editar `museum.ts` e rodar o bake, sem React novo. Motor: M6 completo (roda de contagem, painel `order`), M11
completo (captura de fontes), M12, M16.

### E3 — Tóquio

Primeiro distintivo que abre conteúdo em outra sala (`beach` → gaveta do registrador e gaveta da vitrine de areia
de Paris, acrescentada agora). Motor: M13 (nunca mais de três salas residentes), M19 completo, M8 (fios como dado).

### E4 — Ferro e Areia

Zonas de luz (M17), porta de doca com tranca de ferramenta. Pré-requisito de conteúdo: a fonte primária do `15`
(07 §5, item 1). Sem ela, a camisa não vira tranca: o número às costas fica como hotspot obrigatório do catálogo.

### E5 — A Reescrita

Painel `match`. Sem código digitado: `1998` deixa de ser código (07 §1.6, saída 1), então a etiqueta do átrio pode
continuar dizendo o ano.

### E6 — Global

Listas datadas (M20). `2002` deixa de ser código: o baú abre contando (§5.3).

### E7 — Mezanino

Elevador de cabine como plano A (M22 reduzido). Se o portão vertical não passar, a vitrine de neve e a parede de
créditos vão para um anexo térreo: o grafo não muda, a prova não muda.

### E8 — Encerramento

Termo final, portaria, tiers de qualidade (M28), modo leitura (M29), KTX2 se o pior trio de salas não couber (M30).
Validador em modo `--final`: zero promessas datadas.

---

## 5. Grafo de dependências do jogo terminado

Átomos de estado: `power:<sala>` · `doc:<id>` · `fact:<id>` · `cat:<peça>` · `lock:<id>` (aberta) ·
`cred:<tipo>:<id>` · `socket:<medalha>` · `flag:<id>` · `door:<id>` (liberada) · `thread:<id>` (fechado) ·
`room:<id>` (alcançável, derivado). Coluna **C/O**: caminho crítico de algum final, ou opcional.

### 5.1 Ato I — Posse (E0)

| # | Ação do jogador | Exige | Concede | Destrava | C/O |
|---|---|---|---|---|---|
| I-01 | `E` na luminária `office-lamp-switch` | — | `power:office` | porta do átrio, carga do rádio, relógio, `porter-first-call` | C |
| I-02 | Ler o caderno `office-notebook` até fechar | — | `doc:doc-welcome` | diário (Tab) | O |
| I-03 | `E` no rádio `office-radio` | `power:office` | `carried:office-radio` | `R` em qualquer sala | O |
| I-04 | Atravessar `atrium-to-office` | `power:office` | `room:atrium` | — | C |
| I-05 | `E` em `atrium-breaker` (quadro de serviço) | `room:atrium` | `power:atrium` | `porter-atrium-lit` | C |
| I-06 | Atravessar `atrium-to-holyoke` | `room:atrium` | `room:holyoke` | — | C |
| I-07 | `E` em `holyoke-breaker`, no fundo da ala | `room:holyoke` | `power:holyoke` | `porter-holyoke-lit` | C |
| I-08 | Examinar `portrait-morgan` e virar de lado: hotspot `date`, no verso | `room:holyoke` | `fact:springfield-renaming`, `cat:portrait-morgan` | o `1896` | C (ou I-08b) |
| I-08b | Abrir `holyoke-cabinet-a` | `room:holyoke` | `doc:doc-invention-date`, `doc:doc-halstead`, `fact:springfield-renaming` | o `1896` | C (ou I-08) |
| I-09 | Digitar `1896` em `office-cabinet` | nada no estado (o teclado compara a digitação; a simulação exige o fato) | `lock:office-drawer`, `doc:doc-predecessor`, `cred:tool:service-key` | cofre do escritório | C |
| I-10 | `E` no cofre `office-safe` | `cred:tool:service-key` (consumida) | `lock:office-safe`, `doc:doc-termos` | púlpito; item 3 da lista | C |
| I-11 | Segurar `E` no púlpito `atrium-lectern`: `termo-posse` | `doc:doc-termos`, `power:office`, `power:atrium`, `power:holyoke` | `flag:posse-signed` | **final E0**; Ato II | C |
| I-12 | Sair por `holyoke-shortcut` | `room:holyoke` | `door:holyoke-shortcut` | atalho nos dois sentidos | O |
| I-13 | Catalogar uma peça (12 no total) | sala da peça | `cat:<id>` | item 2 da lista, com as 12 | O em E0, C em E1 |

O "fim em 30 segundos" de hoje acaba: quem digita `1896` no escuro ainda precisa religar as três salas para assinar.

### 5.2 Ato II — Reabertura (E1)

| # | Ação do jogador | Exige | Concede | Destrava | C/O |
|---|---|---|---|---|---|
| II-01 | Ler a página II do Livro | `flag:posse-signed` | `doc:termos-p2` | diz onde estão as medalhas | O |
| II-02 | `E` no chapéu do cabideiro: `office-hat-medal` | `flag:posse-signed` | `cred:medallion:curator` | — | C |
| II-03 | Catalogar as 8 peças da Ala 1 (`ball-improvised`, `ball-spalding`, `net-1897`, `handbook-1897`, `guide-1916`, `gym-suit`, `portrait-morgan`, `photo-gym`) | `room:holyoke` | gatilho abre `lock:holyoke-hero-case`; `porter-case-released` | medalha da Fundação | C |
| II-04 | `E` na vitrine-herói: `holyoke-founding-medal` | `lock:holyoke-hero-case` | `cred:medallion:founding` | — | C |
| II-05 | Catalogar as 4 bolas do console (`atrium-ball-laced`, `-tokyo-1964`, `-colour-1998`, `-eight-panel-2008`) | `room:atrium` | gatilho abre `lock:atrium-tower`; `porter-tower-released` | medalha da Linhagem | C |
| II-06 | `E` na torre: `atrium-lineage-medal` | `lock:atrium-tower` | `cred:medallion:lineage` | — | C |
| II-07 | `E` no plinto `atrium-plinth`, uma medalha por toque | a medalha na mão | `socket:<id>`; com as três, `lock:atrium-plinth` | alavanca | C |
| II-08 | `E` na alavanca `atrium-house-lever` | `lock:atrium-plinth` | `flag:house-lights`; gatilho `flag:vault-raised` | luz geral, bomba, monta-cargas | C |
| II-09 | `E` no volante da caixa-forte `founders-vault` | `flag:vault-raised` | `lock:founders-vault` | tombo, carta, pastas lacradas | C |
| II-10 | Ler `doc-tombo` e `doc-otavio-letter` | `lock:founders-vault` | `doc:doc-tombo`, `doc:doc-otavio-letter` | carimbos de proveniência no Catálogo | C (o tombo) |
| II-11 | Segurar `E` no púlpito: `termo-reabertura` | `flag:posse-signed`, `doc:doc-tombo`, `lock:founders-vault`, as 12 `cat:` | `flag:reopened` | **final E1**: amanhecer, `helena-dawn`; Ato III | C |
| II-12 | Pegar o folheto na recepção: `atrium-reception-leaflet` | `room:atrium` | `flag:floorplan` | aba Planta | O |
| II-13 | `E` no telefone `office-phone` (recado do Otávio) | `power:office` | `doc:doc-otavio-message` | história; reforça II-02 | O |
| II-14 | Catalogar `ball-improvised`, `ball-spalding` e `net-1897` | `room:holyoke` | `cred:badge:indoor` | gaveta do registrador | O |
| II-15 | `E` na gaveta "quadra" do `office-flatfile`: `registrar-indoor` | `cred:badge:indoor` | `lock:registrar-indoor`, dossiê de regras de 1897 | exigido só pelo termo final | O |
| II-16 | Abrir os arquivos da recepção (`atrium-archive-a`, `-b`) e os da Ala 1 | sala | documentos | história do museu e da ampliação | O |

### 5.3 Ato III — A ampliação (E2–E6)

Molde de cada ala `w`: atravessar `atrium-to-<w>` exige `flag:reopened` (tranca de condição `wing-<w>-door`);
`<w>-breaker` concede `power:<w>`; o termo `termo-ala-<w>` exige `power:<w>`, as peças da ala catalogadas (lista
congelada na entrega) e a tranca principal aberta, e concede `flag:wing-<w>-open`.

| # | Ação do jogador | Exige | Concede | Destrava | C/O |
|---|---|---|---|---|---|
| P-01 | Contar os 14 marcadores da mesa `table-congress-1947` e girar a roda de `paris-statutes-box` | `room:paris` | `lock:paris-statutes-box`; estatutos em fac-símile, memorando de Praga, nota do Libaud, ficha da lista dissidente | termo da ala | C |
| P-02 | Ordenar as delegações: `paris-seating-plan` (a ata está na caixa de P-01) | `lock:paris-statutes-box` | documento do plano de mesa | — | O |
| P-03 | `E` no dossiê de regras `paris-rules-dossier` | `cred:badge:indoor` | documentos | — | O |
| P-04 | `E` na gaveta da vitrine de areia `paris-sand-drawer` (nó acrescentado em E3) | `cred:badge:beach` | documentos de praia | — | O |
| T-01 | Ler o ano na vitrine `kit-cccp-1962` e digitar `1962` em `tokyo-trophy-punch` | `room:tokyo` | `lock:tokyo-trophy-punch`, documentos | termo da ala | C |
| T-02 | Examinar `beach-court-1960`: hotspot da tampa de garrafa | `room:tokyo` | `cred:badge:beach` | gaveta "praia" do registrador; arquivos de praia nas Alas 2, 4, 5 e 6 | O |
| T-03 | Resolver `kaizuka-motion-rail` | `room:tokyo` | dois documentos da Kaizuka | — | O |
| F-01 | Ler "maio de 1973" no recorte `clipping-wagner` e digitar `1973` em `ironsand-coach-file` | `room:iron-sand` | `lock:ironsand-coach-file`, dossiê | termo da ala | C |
| F-02 | Virar `jersey-kiraly` (número às costas) | `room:iron-sand` | `cat:jersey-kiraly`; tranca `ironsand-kiraly-shirt` só se a fonte do `15` for capturada | — | O |
| F-03 | Pegar o carrinho `crate-dolly` no pátio de areia | `room:iron-sand` | `cred:tool:crate-dolly` | porta de doca | O |
| F-04 | Abrir `ironsand-freight-shutter` por dentro | `cred:tool:crate-dolly` (não consumida) | `door:ironsand-freight-shutter` | atalho ao átrio, depois nos dois sentidos | O |
| F-05 | Casar três redes com as eras pelos encaixes: `ironsand-honours-rail` | `room:iron-sand` | documentos | — | O |
| R-01 | Casar as três mudanças com o problema de transmissão: `rewrite-congress-case` | `room:rewrite` | `lock:rewrite-congress-case`, documentos | termo da ala | C |
| R-02 | `E` em `rewrite-beach-press-file` | `cred:badge:beach` | documentos | — | O |
| G-01 | Contar as marcas da trena nas duas quadras de areia e ajustar as duas rodas de `global-beach-trunk` | `room:global` | `lock:global-beach-trunk` | termo da ala | C |
| G-02 | Ordenar os seis moldes por sala: `global-ball-casts` | `room:global` | `lock:global-ball-casts` | termo da ala | C |
| G-03 | Catalogar `court-sitting-lowered-plane` | `room:global` | `cred:badge:sitting` | gaveta "sentado"; fio paralímpico nas Alas 4 e 5 | O |
| W-end | Segurar `E` no púlpito: `termo-ala-<w>` | ver molde | `flag:wing-<w>-open` | medalhão da ala na parede; **final da entrega** | C |

Regra de escrita para P-01 e G-01: o número contado não aparece em algarismo **nem por extenso** fora da própria
tranca aberta. A etiqueta de Paris de agosto ("Catorze federações…") vai para dentro da caixa.

### 5.4 Ato IV — Encerramento (E7–E8)

| # | Ação do jogador | Exige | Concede | Destrava | C/O |
|---|---|---|---|---|---|
| Z-01 | Catalogar todos os nós de um fio | salas dos nós | `thread:<id>` | — | C para Z-06 |
| Z-02 | Chamar o elevador `mezzanine-lift` | dois `thread:` quaisquer | `room:mezzanine` | vitrine de neve, parede de créditos, vista do plinto | C |
| Z-03 | Pegar o distintivo na vitrine de neve | `room:mezzanine` | `cred:badge:snow` | gaveta "neve" | C |
| Z-04 | Abrir as gavetas `registrar-beach`, `-sitting`, `-snow` | o distintivo de cada uma | `lock:registrar-*` | termo final | C |
| Z-05 | Ler a parede de créditos | `room:mezzanine` | — | último painel com os cinco fios fechados | O |
| Z-06 | Segurar `E` no púlpito: `termo-encerramento` | as cinco `flag:wing-*-open`, as quatro `lock:registrar-*`, os cinco `thread:` | `flag:inventory-closed` | porta `atrium-to-lodge`; **final do jogo** | C |
| Z-07 | Atravessar a porta da rua | `flag:inventory-closed` | `room:lodge` | o bilhete do Jorge, a luz do dia | O |

### 5.5 O roteiro em níveis (o que a simulação imprime)

`N0` luminária · `N1` átrio · `N2` luz do átrio, Ala 1 · `N3` luz da Ala 1, fato 1896, peças · `N4` gaveta, chave ·
`N5` cofre, Livro · `N6` **Posse** · `N7` medalha do curador; vitrine e torre soltas (dependem só de `N3`) ·
`N8` três medalhas · `N9` plinto · `N10` força geral, caixa-forte erguida · `N11` tombo · `N12` **Reabertura** ·
`N13` cinco alas, em qualquer ordem · `N14` cinco termos, fios · `N15` mezanino, neve · `N16` **Encerramento**.

---

## 6. Por que não existe soft-lock

### 6.1 O modelo

O progresso é um conjunto de átomos. Uma ação tem uma guarda (átomos exigidos, mais a sala onde ela acontece
estar alcançável) e um efeito (átomos concedidos). Seis invariantes, cada um cobrado por um portão de §7:

| # | Invariante | Portão |
|---|---|---|
| V1 | O progresso só cresce. Nada é perdido, gasto ou fechado — com uma exceção nomeada, V3. | `test:save`, `test:triggers` |
| V2 | Toda guarda é positiva (R2). | `gate-uses-negative-condition`, `gate-uses-all-condition` |
| V3 | Consumível tem um único consumidor, e o efeito dele é permanente. Hoje só `service-key` → `office-safe`. | `consumable-multi-consumer` |
| V4 | Não há estado de falha: sem cronômetro, sem limite de tentativas, sem item que some sem ser pego; todo documento é relido. | `no-fail-state` (revisão de schema: nenhum tipo tem contador de tentativas com efeito) |
| V5 | De toda sala alcançável volta-se ao átrio com as portas abertas naquele estado. Porta de mão única é sempre uma aresta a mais. | `no-return-path`, `one-way-trap` |
| V6 | Toda tranca de conhecimento e todo ritual têm um último degrau de dica que resolve; todo hotspot obrigatório é alcançável e se revela sozinho depois de um tempo de exame. | `test:locks`, `test:examine` |

### 6.2 O argumento

- **Qualquer ordem de visita.** Por V1 e V2, uma ação disponível nunca deixa de estar: o conjunto de ações só
  cresce. Duas sequências quaisquer podem ser completadas até o mesmo conjunto final de átomos (o ponto fixo). Se
  o final pertence ao ponto fixo, ele é alcançável de qualquer estado alcançável. `simulateProgress` calcula o
  ponto fixo e reprova a entrega se algum termo ficar de fora.
- **Passos opcionais pulados.** Opcional é o que não está no fecho de exigências de nenhum termo. Quem nunca lê o
  caderno fica sem o diário, mas o Livro de Termos e o púlpito não dependem dele. Quem deixa o rádio na mesa perde
  as dicas à distância, e nenhuma guarda pede o rádio. A lanterna não é exigida por nada. E como nada desliga, o
  que foi pulado continua lá.
- **Consumível.** A chave do cofre é gasta pela única tranca que a pede; depois disso a tranca está aberta para
  sempre e nenhuma outra guarda cita a chave (V3).
- **Portas de mão única.** As duas alas com atalho têm a porta principal nos dois sentidos: a da Ala 1 não tem
  tranca; a da Ala 4 pede só `flag:reopened`, que já vale para quem está dentro. O atalho só acrescenta um
  caminho; depois da primeira abertura fica nos dois sentidos. A porta do escritório exige `power:office` nos dois sentidos, e ninguém está do
  lado de fora sem tê-lo (V5).
- **Sequência quebrada de propósito.** Digitar `1896` sem ter lido, abrir a gaveta antes da luz, acender a Ala 1
  antes do átrio: tudo isso só adianta átomos. Não há guarda que piore por ter algo antes da hora.
- **Conhecimento errado.** Quem conferir o IVHF vai chegar a 1974 e errar o dossiê do Wagner (07 §1.5). Por V6, a
  escada de dicas termina revelando. A tranca espera; não falha.
- **Fim de jogo.** Por R5, depois de qualquer termo todas as ações continuam disponíveis.

### 6.3 Saves de entregas anteriores

Seja `S` um save gravado numa entrega antiga e `S'` o que a migração devolve.

1. **A migração não perde átomo.** Campos por tabela (M2), aliases para ids renomeados, sem subir `SAVE_VERSION`.
   `test:save` faz ida e volta de cada campo e carrega os corpora de todas as entregas.
2. **O conteúdo é aditivo (R1).** Toda ação antiga continua com guarda igual ou mais fraca.
3. **Os efeitos são reavaliados na carga (R3).** Átomo que ganhou consequência depois (gaveta que passa a
   conceder chave; inventário já completo que passa a soltar a vitrine) dispara o gatilho no primeiro quadro.
4. Logo `S'` só tem átomos a mais em relação ao começo, as guardas são positivas, e o ponto fixo a partir de `S'`
   contém o ponto fixo do jogo novo. Todo final continua alcançável.

O que R1 evita, com o caso que apareceu enquanto eu desenhava: mover a bola de 1964 do átrio para a Ala 3 em E3
faria a medalha `lineage` exigir a Ala 3, que exige a Reabertura, que exige a medalha. Um ciclo, criado por uma
mudança de posição. `validateAdditive` reprova por `guard-strengthened`; `simulateProgress` reprovaria por
`ending-unreachable`.

Classes de save no corpus: produção de hoje (gaveta aberta ou não; `guide-1916` e `atrium-ball-laced` catalogadas
sem girar; sem `radioCalls`); E0 antes e depois da Posse; E1 com zero, uma, duas e três medalhas assentadas, com a
alavanca puxada e a caixa-forte fechada, e depois da Reabertura; cada ala antes e depois do termo.

### 6.4 O que a prova não cobre

- Divergência entre as regras puras e o runtime: o robô de partida joga contra o store real (§7.4).
- Espaço físico: a prova é a navegação por inundação (§7.5).
- Jogador que não entende o que fazer: cobertura de dicas (§7.1) e um playtest por entrega com uma pessoa nova.
- GPU e memória em aparelho real: fora de qualquer portão em Node (HANDOFF §7.1).

---

## 7. Portões mecânicos

### 7.1 `validateSolvability` → `simulateProgress(content, from?)`

Reescrita como jogadora exaustiva que usa as mesmas funções puras do runtime (`lockRules`, `progressCondition`,
`dueTriggers`, `transitionDoorBlock`). O que passa a modelar e hoje não modela (`validate.ts:412-459`):

- `oneWay` / `opensFrom` e `doorsReleased`; `requiresPower`;
- tranca em **qualquer** hospedeiro: container, porta, controle de energia, plinto, gaveta;
- credencial nascida de tranca aberta, de gatilho, de hotspot e de pickup — não só de `exhibit.unlocks`;
- consumo de ferramenta; soquetes; flags; termos; fios;
- ritual deixa de ser "aberto ao alcançar a sala": abre quando a evidência declarada está alcançável;
- catalogação só conta se `examine.generated.ts` (saída do `test:examine`) diz que todo hotspot obrigatório da
  peça é alcançável.

Erros (reprovam o `check`):

| Código | O que pega |
|---|---|
| `ending-unreachable`, `term-unsignable` | algum termo fora do ponto fixo |
| `room-unreachable`, `lock-unopenable`, `document-unreadable`, `exhibit-uncataloguable` | conteúdo morto |
| `credential-unobtainable`, `credential-orphan` | chave sem fonte ou sem fechadura (vira erro; hoje é aviso) |
| `trigger-never-fires`, `flag-never-set`, `flag-never-read` | fiação solta |
| `gate-uses-negative-condition`, `gate-uses-all-condition` | R2 |
| `consumable-multi-consumer` | V3 |
| `no-return-path`, `one-way-trap` | V5, conferido no primeiro estado em que cada sala fica alcançável |
| `lock-evidence-behind-lock` | a fonte de um código só alcançável depois da tranca, para todo hospedeiro |
| `lock-host-kind-unsupported` | tranca cujo tipo ainda não tem interface (fecha o modal invisível) |
| `checklist-item-untickable` | item de lista sem `doneWhen` ou com condição fora do ponto fixo |
| `hint-points-to-nothing` | dica cujo `targetId` não existe ou não está habilitado quando o `when` dela vale |
| `radio-hint-coverage` | estado de fronteira sem dica que nomeie uma ação disponível |
| `deferred-on-critical-path`, `deferred-without-notice` | R4; em `--final`, qualquer `deferred` |
| `affordance-without-use` | receita marcada como gaveta, tela, vitrine ou púlpito sem conteúdo ligado nem `deferred` |
| `post-ending-disables-action` | R5 |

Saída impressa: o roteiro em níveis de §5.5. É a leitura humana de "uma ação se conecta na outra".

### 7.2 `validateAdditive(instantâneo anterior, content)`

`npm run graph:snapshot` grava `docs/releases/E<n>.graph.json` (ações, guardas, concessões, termos, itens de
lista). O `check` compara o conteúdo com o instantâneo da última entrega publicada.

Erros: `node-removed`, `guard-strengthened`, `grant-removed`, `id-renamed-without-alias`,
`term-condition-changed`, `checklist-condition-changed`.

### 7.3 Lint `numeral-exclusivity` e a regra do que envelhece

- `Fact.printedIn: string[]` lista as chaves autorizadas a imprimir o código. O lint tokeniza sequências inteiras
  de dígitos (`1895–1915` não contém `15`) em: os dois dicionários, o texto das mídias autorais (por isso o texto
  da planta sai do SVG), as listas datadas, os números modelados em geometria (pseudo-chave `geometry:<receita>`)
  e os rótulos de ritual (zero algarismo).
- Três exceções declaradas no próprio fato: `tutorial` (o `1896`, três chaves, todas na Ala 1: o verso do
  retrato, a ficha dele e o documento do Halstead), `geometry` (o `15`), `counted` (`14` e as duas rodas do baú:
  `printedIn` vazio, mais `spelledOut` para pegar "catorze" e "fourteen" fora da tranca aberta).
- O que ele precisa reprovar hoje, para provar que funciona: `1896` em `exhibit.handbook-1897.catalogue` e em
  `exhibit.photo-gym.catalogue`; "com 14 nações" no texto de Tóquio de PLANO-COMPLETO §6; "de 21 para 15 pontos"
  em `document.rule-changes.body` no dia em que o `15` virar código.
- `text-ages`: reprova contagem corrente e tempo relativo em texto de acervo ("há N anos", "até hoje", "atual",
  "N títulos"). Fala de personagem entra por lista de permissão.
- Fontes: `npm run facts:capture` (fora do `check`, precisa de rede) grava `facts.generated.ts` com status, hash,
  título real, data e se a página contém o numeral. O `check` lê o arquivo commitado: `fact-code-uncaptured`,
  `fact-code-value-not-in-source`, `fact-publishers-dependent`, `knowledge-lock-fact-not-code`,
  `lock-digits-mismatch`.

### 7.4 Robô de partida: `test:playthrough`

No nível do store, em Node, no molde de `test-opening-flow.ts`:

1. **Rota canônica:** o roteiro de §5.5 termina com cada flag de termo da entrega.
2. **Ordem embaralhada, 500 sementes:** a cada passo escolhe ao acaso entre as ações disponíveis, inclusive as
   inúteis (código errado, abrir e fechar, religar). Em passos sorteados, serializa, migra e recarrega. Termina no
   ponto fixo com todos os termos assinados.
3. **Jogador preguiçoso:** só o caminho crítico. **Jogador que pula:** nunca lê o caderno, nunca pega o rádio,
   nunca acende a lanterna.
4. **Corpus de saves:** cada arquivo de `scripts/fixtures/saves/<entrega>/` é migrado e jogado até o ponto fixo.
   Nenhum termo assinado se perde, nenhum item riscado desrisca. Os saves de produção de hoje são escritos à mão
   no formato de `legacySave.ts`.

### 7.5 Navegação: `test:navigation` v2

- Travessias derivadas de todo par de portais, com a mão única tentada dos dois lados, antes e depois de liberada.
- **Alcance por inundação:** grade de 0,25 m, cápsula real. Todo interativo (peça, container, gaveta, quadro,
  pickup, soquete, alavanca, púlpito, porta) tem um ponto de pé ligado à entrada da sala, dentro do alcance e
  **fora do volume do próprio alvo** (pega ÁT-A1).
- Rota do spawn real: porta do escritório → quadro do átrio em linha reta.
- Caminho de volta de toda sala ao átrio.
- O plinto é conferido nos dois estados: tampa baixa (soquetes e alavanca) e caixa-forte erguida (volante).

### 7.6 Os demais

| Suíte | Prova | Entrega |
|---|---|---|
| `test:examine` | todo hotspot obrigatório alcançável (≥ 4% das orientações, ≤ 300 px num eixo), nenhum nasce visto, eixos relativos à câmera, peça fora do painel em 1280 × 720 e 844 × 390. Tem de reprovar os dados atuais de `net-1897`, `gym-suit` e `photo-gym` antes de qualquer conserto | E0 |
| `test:save` | ida e volta de todo campo; migração por entrega; aliases | E0 |
| `test:triggers` | disparo único, independência de ordem, recarga no meio, ponto fixo com limite | E0 |
| `test:locks` | cada tipo de tranca; 2 e 4 dígitos; consumo; último degrau resolve; fechar e reabrir não zera a escada | E0, E2 |
| `test:ending` | cada termo é idempotente; recarregar antes e depois; cartão uma vez só | E0 |
| `test:plinth` | ordem das medalhas, parcial, recarga com duas assentadas | E1 |
| `test:power` | etapas de luz com contagem de slots invariável; emissivo zero sem energia; forro abaixo do limiar em `service` e acima em `house` | E1 |
| `test:room-placement` | peça de parede encostada; `supportY` igual a uma superfície exportada pela receita; peça × marcenaria sem interseção | E1 |
| `test:radio` | uma chamada por marco; dica curta com o mesmo alvo da cheia; simulação de partida longa | E0, E3 |

Todas entram no `npm run check` (regra 1 do `AGENTS.md`).

---

## 8. Informação ao jogador

Regra: cada objeto visível tem uma interação, uma informação, ou sai da sala. Etiqueta de parede com até 40
palavras e fato com dois publicadores; o que tem um publicador só vai para hotspot, gaveta ou rádio (07 §3).

| Onde | O que o jogador fica sabendo | Fonte (07) |
|---|---|---|
| Etiqueta da rede | A rede ficava logo acima da cabeça de um homem médio — não "meio pé" | C02 |
| Etiqueta ao lado da rede | A primeira ideia do Morgan foi o tênis; ficou só a rede | C01 |
| Quiosque, três folhas | 1895, 1896 e 1916–1920: o jogo como colagem de basquete, tênis, handebol e beisebol | C03, C04 |
| Hotspots do manual | Duas tentativas de saque; bola na rede era falta, menos na primeira tentativa | C07, C08 |
| Arquivo A | A data famosa de fevereiro de 1895 não tem citação; os capitães da demonstração eram o prefeito e o chefe dos bombeiros | C11, C10 |
| Arquivo B | A conta de 1916 não fecha: 200 mil anunciados, 155 mil somados — o museu se declarando antes do tombo | C17 |
| Foto do ginásio | O prédio queimou em 1943 | C20 |
| Jorge, na Ala 1 | Jogava quem quisesse, sem limite; o colega podia ajudar o saque a passar | C05, C06 |
| Console do átrio | Em 1964 não havia "a" bola oficial; a de 2008 perdeu dez gomos de uma vez | C38, C70 |
| Púlpito | Como ler este museu: original, reconstrução de época, fac-símile (prepara o tombo) | — |
| Gaveta "quadra" | O manual de 1897 descrevia o jogo como mistura de tênis com handebol de parede | C09 |

As alas seguem a mesma regra com as entradas C23–C87 do banco.

---

## 9. Riscos, cortes e decisões

### 9.1 Riscos

| Risco | Efeito | Resposta |
|---|---|---|
| E1 é grande | o final de história demora | fatias publicáveis; a espinha é a segunda (E1.2), antes do polimento pesado |
| Átrio em 56 de 56 lotes | o plinto novo não cabe | o plinto usa as famílias do pódio que substitui; a fusão por material (AS-L1) vem em E1.3 |
| Animação do monta-cargas | o maior momento não se valida sem ver | a flag decide o estado; a animação é só apresentação. Plano B: troca de estado coberta pela rampa de luz |
| Trava que "sabe" do inventário | mágica sem explicação | quem solta é o Jorge, do painel da portaria, com fala própria; sem rádio, o prompt da vitrine muda sozinho |
| Fonte do `15` | código sem lastro | a camisa não vira tranca (E4) |
| Vertical | mezanino atrasa E7 | anexo térreo; mesmo grafo |

### 9.2 O que cortar primeiro

Escada (já cortada: elevador); subsolo como sala (já cortado: a caixa-forte sobe); `step-ladder` e
`breaker-handle` (sem uso neste desenho; saem de `ToolId`); o ritual `paris-seating-plan` (opcional, 14 itens).
Não cortar: M2, M4, M5, M10, o instantâneo do grafo e o corpus de saves.

### 9.3 Decisões do dono (com a escolha que este desenho assume)

1. A ampliação é literal? **Sim** (sem isso não há final a cada entrega).
2. De onde vêm as três medalhas? **Das três partes da casa original.**
3. O Otávio: **aposentado, vivo, ausente; não é o Fundador.**
4. O quadro do átrio passa a ligar só a luz de serviço? **Sim.**
5. A caixa-forte sobe em vez de o jogador descer? **Sim** (muda o desenho de agosto).
6. "Continuar" renasce onde? **No escritório**, como hoje.
7. A Helena aparece? **Só a voz, pelo rádio do Jorge.**
8. O final "o museu se declara" continua valendo? **Sim**, na Reabertura.
9. Assinatura: **gesto de segurar `E`**, sem nome digitado.
10. Piso do escritório ao consertar a paleta, escala da Spalding, vitrine corrida como herói: decisões de 04 §7,
    sem efeito no grafo.

### 9.4 Não verificado

- Nada aqui foi jogado nem assado. Coordenadas e folgas (quadro da Holyoke, alcance do plinto de fora do anel,
  vãos das alas) dependem dos portões de §7.5 e do `test:room-placement`.
- Os custos de draw do plinto novo e dos tapumes são por contagem de materiais, não por frame medido.
- O candidato a nó do fio `ball` na Ala 6 e a frase da Kuraray sobre a bola de 2008 precisam de captura de fonte.
- A escolha de exigir o catálogo inteiro para duas medalhas põe 12 exames no caminho crítico: precisa de playtest.
