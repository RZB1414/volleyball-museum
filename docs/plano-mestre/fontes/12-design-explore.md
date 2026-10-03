# 12 — Desenho de experiência: um jogo bom de explorar e que ensina

Projeto: Volleyball Museum (`main`, `82756c4`). Base: os relatórios `01`–`07` desta pasta e
`docs/PLANO-COMPLETO.md`, `docs/PLANO-DO-ZERO.md`, `docs/HANDOFF.md`, `AGENTS.md`.

**O que este documento é.** O desenho da experiência momento a momento: o que o jogador faz a cada
30–60 segundos, como a informação chega sem parede de texto, que segredos pagam a curiosidade, como o
Jorge, a tempestade e o relógio da noite reagem, e o que falta para o átrio e a Holyoke serem boas
salas já. Para as alas futuras, a interação-assinatura, a vista de impacto e três curiosidades do
banco de `07-facts.md`.

**O que ele não é.** Não rodei o jogo, o bake nem o `check`; não escrevi nada no repositório. Todo
número de geometria, orçamento ou defeito vem dos relatórios `02`–`06` e está citado pelo código do
defeito (A1, H-13, S6…). Posições novas (quadro da Holyoke, relógio de portas do átrio) são propostas
a medir, não medidas. Textos de jogo propostos são rascunhos para revisão, já escritos dentro das
regras de `PLANO-COMPLETO.md` §4.

---

## 0. A proposta em uma página

1. **Toda sala nova começa por uma travessia no escuro.** O quadro de força fica no fundo, com o
   piloto vermelho visível da porta. A primeira passada, com a lanterna, é o trailer; a segunda, com
   luz, é a leitura. Vale para a Holyoke agora (o quadro sai do lado da porta) e para as cinco alas.
2. **"Viu no escuro, tomba com luz."** No escuro dá para examinar e ler; a peça só entra no catálogo
   com a sala acesa. Quem explorou antes de religar é premiado com uma cascata de carimbos no
   instante em que a luz volta. Religar passa a sustentar a progressão sem apagar trabalho de ninguém.
3. **Nenhum objeto inerte.** Cada coisa visível tem uma interação, uma informação legível ou uma
   resposta do Jorge ("R mirando" pergunta *e isso aqui?*). O que não tiver nenhuma das três sai da sala.
4. **Sete canais de informação, todos curtos.** Placa física (uma frase), etiqueta (≤ 40 palavras),
   detalhe do verso (≤ 12), ficha, documento de gaveta, banco de escuta e o rádio. Mais um
   colecionável: o **álbum de figurinhas** do museu, 24 curiosidades de ≤ 25 palavras.
5. **O Jorge é o guia de áudio e a escada de dicas.** Uma chamada por marco, dica em três alturas
   (onde / o quê / como) e, sem nada pendente, uma curiosidade da sala. Nunca diz um código sem o
   jogador pedir.
6. **A noite anda por marcos, nunca por minutos.** Sete marcos, cada um com uma hora dita pelo Jorge,
   um estado da tempestade e um evento do prédio (goteira, vento na porta do atalho, o telefone do
   escritório, a bomba do subsolo, o amanhecer).
7. **Medalhas: uma por ala tombada inteira, entregues pelo Jorge por tubo pneumático; três quaisquer
   abrem a reserva.** O bilhete do Otávio fica literalmente verdadeiro, o final passa a existir com
   três alas e as outras três viram o jogo do completista.
8. **O centro do átrio vira o plinto de verdade** (três soquetes); os quatro discos vão para o
   púlpito, como "mesa das disciplinas"; a torre vira a vitrine dos cinco fios; a parede de orientação
   ganha as seis eras. Tudo o que hoje é cenário passa a mostrar progresso.
9. **As bolas do saguão viram réplicas de manuseio** ("pode pegar"): tutorial do verbo central,
   primeira declaração de proveniência do museu e isca para as alas. Saem do fio da bola.
10. **Seis trancas de conhecimento, duas delas contadas.** `1998` deixa de ser código e vira ritual
    (os dois placares); `2002` vira contagem de nós numa corda de quadra. Nenhum numeral-código
    aparece fora da fonte.
11. **Cada entrega fecha um turno honesto.** Alas ainda não construídas aparecem como "lacre de
    montagem" com olho mágico. Com uma ala, o jogo termina no "fim do primeiro turno"; com três, no
    final verdadeiro.
12. **Depois do final o jogo continua** e o jogador passa a *curar*: escolhe o destaque de cada ala
    entre as curiosidades que encontrou.

---

## 1. Regras da casa (o que faz o jogo ser bom de explorar)

| # | Regra | Como se mede |
|---|---|---|
| E1 | **Partitura de 45 segundos.** Nunca mais de 45 s andando sem algo legível ou acionável; nunca mais de 60 s lendo sem um gesto. A ordem padrão é olhar (10–15 s) → ler (≤ 40 palavras) → mexer (20–40 s) → andar (≤ 15 s) | tabelas de batidas de §6 e §7; playtest cronometrado |
| E2 | **Triplo retorno.** Toda mudança de estado responde em três canais: um som, uma mudança no mundo e uma linha no caderno ou no HUD (≤ 4 palavras) | lista de §5.7; `test:opening-flow` cobre o canal de HUD |
| E3 | **Uma ideia por superfície.** Uma placa diz uma coisa. O resto desce para o verso, a ficha ou a gaveta | `validatePacing` conta palavras (H-53) |
| E4 | **A manchete é o fato surpreendente**, não a data. "Logo acima da cabeça" antes de "6 pés e 6" | revisão de texto |
| E5 | **Dívida de curiosidade paga em até duas salas.** Tudo o que se vê e não se pode usar ainda ganha nome no mapa e é pago na sala seguinte ou na volta ao escritório | roteiro em níveis de `simulateProgress` (M10) |
| E6 | **Nada interrompe.** Nenhum pop-up de "você sabia". O Jorge só chama em marco; curiosidade só quando o jogador liga | `test:radio` |
| E7 | **Nenhum objeto inerte** (item 3 acima) | validador `kit-looks-interactive` com zero avisos (E1 da auditoria do átrio) |
| E8 | **O corpo ensina.** Quando um fato é uma medida, o jogador a sente: passa por baixo da rede de 1897, desce à quadra do vôlei sentado, conta os nós da corda | uma por ala, listada em §10 |
| E9 | **O museu se declara desde o saguão.** Réplica, reconstrução, fac-símile e "uma fonte só" aparecem escritos; o final só soma | campo `provenance` (M24); marca ●/●● nas figurinhas |
| E10 | **Dica nunca entrega sem consentimento.** A escada sobe de "onde" a "como"; o número só sai se o jogador apertar "Pedir ao Jorge" | `test:locks` |
| E11 | **Sem cronômetro de falha.** O tempo é marco de história. Nada se perde por demorar | regra herdada (`docs/REFERENCIA-TECNICA.md:70`) |
| E12 | **Estado nunca só por cor.** Ícone, padrão ou forma acompanham toda cor de estado (mapa, LED, hotspots) | §5.9 |

---

## 2. A espinha que este desenho pressupõe

Resumo curto: o detalhe de roteiro é de outro desenho. Aqui está o mínimo para as batidas de §6–§10
fecharem sem furo.

### 2.1 Atos e marcos da noite

| Ato | Vai de… até | O que o jogador sente |
|---|---|---|
| I — Luz de serviço | escritório → átrio com luz de serviço → primeira ala tombada → primeira medalha no plinto | "aprendi a religar, a virar e a ler" |
| II — Montagem | alas em qualquer ordem; distintivos, fios, segunda e terceira medalhas | "o prédio é meu, escolho a ordem" |
| III — Chave geral | terceira medalha → luz geral → bomba → reserva técnica → livro de tombo → assinatura → amanhecer | o maior momento, uma vez só |
| Epílogo — Reabertura | museu aceso, livre; seis medalhas, mezanino, curadoria | "agora eu cuido disto" |

### 2.2 Medalhas

- **Seis**, uma por ala: `holyoke`, `paris`, `tokyo`, `ironsand`, `rewrite`, `global` (`MedallionId`
  passa de três para seis; os nomes de agosto viram títulos: Medalha da Invenção, da Fundação,
  Olímpica, das Duas Arenas, da Reescrita, Global).
- **Ganha-se** ao tombar a ala por inteiro: todas as peças obrigatórias da sala, incluídas as que
  ficam atrás da tranca ou do ritual dela. A tranca de cada ala fica, assim, no caminho da medalha.
- **Chega** pelo tubo pneumático: gatilho `<ala>-complete` → chamada `porter-<ala>-complete` → o som
  da cápsula corre pelo forro até o átrio → `pickup` no `atrium-tube-terminal` (recepção), com um
  bilhete do Otávio de ≤ 30 palavras por envelope.
- **Três quaisquer** abrem o plinto. As outras três têm lugar: quando a tampa do plinto gira, aparecem
  mais três soquetes na face de baixo. É a resposta ao "3 medalhas?" a lápis na planta: nem o Otávio
  sabia se eram três ou seis.

### 2.3 Distintivos, fios e ferramentas

- **Distintivos** (`indoor`, `beach`, `sitting`, `snow`): regras de `PLANO-COMPLETO.md` §2.1 mantidas.
  Mostrador: os quatro discos do púlpito do átrio (`atrium-disciplines-lectern`). Efeito: destrava a
  gaveta da disciplina no arquivo de mapas do escritório (LED vermelho → verde, o mesmo contrato do
  leitor da porta) e descobre peças "cobertas" em outras alas.
- **Fios** (`ball`, `net`, `rules`, `beach`, `sitting`): mostrador na torre do átrio
  (`atrium-threads-tower`), cinco emblemas de latão em silhueta que se preenchem. Dois fios abrem o
  mezanino (mantido).
- **Ferramentas:** `service-key` (gaveta `indoor` → abre o cofre de ferro do escritório, consumida),
  `crate-dolly` (Ala 4 → porta da doca), `step-ladder` (mezanino → "pontos altos" de salas já
  visitadas, §5.8).

### 2.4 Trancas de conhecimento — seis, conferidas contra §4 do plano

| Tranca | Sala | Valor | Entrada | Fonte única dentro do museu | Chaves com o algarismo | Estado em `07-facts` | Pendência antes de construir |
|---|---|---|---|---|---|---|---|
| `office-drawer` | escritório | 1896 | teclado, 4 dígitos | verso do `portrait-morgan` e `doc-halstead` (as duas na Ala 1: exceção declarada de tutorial) | 2 (hoje 5) | seguro | trocar a URL morta de `museum.ts:61`; tirar o numeral de três fichas |
| `paris-statutes-box` | Ala 2 | catorze | roda de contagem, dois tambores | contar os marcadores da mesa | 0 | seguro | nenhuma etiqueta da sala diz a quantidade; tirar «14 nações» do texto de Tóquio |
| `tokyo-trophy-punch` | Ala 3 | 1962 | punção de quatro rodas | detalhe do kit CCCP | 1 | seguro | reabrir a página do olympics.com |
| `ironsand-kiraly-shirt` | Ala 4 | quinze | dois tambores | as costas da camisa (geometria, não texto) | 0 | **inseguro hoje** | fonte primária datada; sem ela, vira ritual e o jogo fica com cinco |
| `ironsand-coach-file` | Ala 4 | 1973 | teclado, 4 dígitos | verso da prancheta: "maio de 1973" | 1 | seguro, contestado em inglês | escada de dicas obrigatória |
| `global-beach-trunk` | Ala 6 | 8 e 16 | duas rodas de contagem | contar os nós da corda de demarcação | 0 | medidas com dois publicadores (C72) | a etiqueta diz "um metro mais estreita, dois mais curta", sem totais |

- `rewrite-ball-tower` deixa de ser tranca: `1998` é fato sólido e código ruim (já impresso no
  átrio, ano do rally point e do líbero). A Ala 5 fica com o ritual dos dois placares (§10.4).
- **Regra 1 (exclusividade):** `Fact.printedIn` por tranca; o lint de M11 roda no `check`. Consertos
  de texto já devidos: «de 21 para 15 pontos» → "de vinte e um para quinze" (`pt-BR.ts:380`); toda
  menção a horários e placares em algarismo passa pelo lint ("três da tarde", não "15h").
- **Regra 2 (contar):** duas das seis são contadas e uma é lida no objeto.
- **Regra 3 (não envelhecer):** sai «cento e trinta anos» do bilhete; nenhuma figurinha, etiqueta ou
  fala usa contagem corrente.
- **Regra 4 (URL capturada):** nenhuma tranca entra em construção antes de `facts:capture` passar para
  o fato dela; as pendências de `07-facts.md` §5 são portão, não lembrete.

### 2.5 Entregas por turno

| Turno | Prédio | Como o jogo fecha |
|---|---|---|
| T1 | escritório, átrio e Holyoke corrigidos; cinco lacres de montagem | "Fim do primeiro turno": uma medalha no plinto, página carimbada no caderno, chamada do Jorge |
| T2 | + Paris | duas medalhas; mesmo fecho de turno |
| T3 | + Tóquio, chave geral, reserva técnica | **final verdadeiro** (três medalhas) |
| T4–T6 | + Ferro e Areia, A Reescrita, Global | quarta a sexta medalhas; fio da bola fecha em T6 |
| T7 | + mezanino | epílogo completo: seis medalhas, quarto distintivo, curadoria |
| T8 | polimento | modo leitura, cartão de visita, modo "Visitante" |

O final é construído depois da terceira ala, não por último: é o item de maior risco (vertical, luz
geral, bomba) e o que dá sentido às alas restantes.

---

## 3. Contradições de `01-canon.md` — resolução

| # | Resolução adotada neste desenho |
|---|---|
| **C1** cofre no subsolo × subsolo alagado | O alagamento é a trava do terceiro ato. A bomba de drenagem depende da chave geral, que fica sob a tampa do plinto. Desde o primeiro minuto há, dentro do anel, um alçapão gradeado com fita "ALAGADO" e som de água: a fala do Jorge passa a apontar para algo que existe (D2) |
| **C2** "plinto já construído, três soquetes" | Falso hoje. `atrium-central-podium` é refeito como `atrium-plinth` com três soquetes (a geometria de `medallion-socket` já está assada) e tampa giratória. Os quatro discos vão para o púlpito. Um segmento do anel abre, virado para a porta do escritório. Corrigir o comentário de `museum.ts:975-986` |
| **C3** luz geral gasta no minuto 3 | Dois estágios de luz no átrio. O quadro vira "Quadro de serviço do átrio" e acende cinco poças baixas, com forro e paredes altas no escuro. A luz geral só vem da chave do plinto. `allRoomsPowered` = toda sala ao menos em serviço |
| **C4** o escritório é o spawn | Cânone. A placa de dedicação vira dedicatória de verdade; a primeira vista do átrio é composta a partir da porta leste; a música calma começa no clique da luminária (dívida do contrato da sala segura) |
| **C5** armário do registrador | O arquivo de mapas (`museum.ts:1424`) recebe as quatro etiquetas de disciplina, cada gaveta com LED. O armário alto continua sendo a gaveta do Otávio. Nenhum móvel novo no escritório |
| **C6** diário e livro de visitas | Abas por etapas: caderno → Caderno, Acervo, Arquivo, Coleção; folheto da recepção → Planta. A lista avisa quando risca. O livro de visitas fica no balcão, fechado ("abre às 9h"), e depois do final mostra o resumo da noite. A assinatura acontece no livro de tombo, na reserva |
| **C7** Jorge × escada de dicas | Um sistema só: o Jorge é o degrau de áudio (§5.4, §5.5). A dica incondicional some; sem pendência ele conta uma curiosidade da sala |
| **C8** linha do tempo da noite | Marcos, não minutos (§5.6). O relógio do escritório pode ser acertado (gesto opcional) e passa a saltar de marco em marco |
| **C9** dois "cofres" | Nomes fixos: **cofre de ferro** (escritório) e **reserva técnica** (subsolo; "Cofre do Fundador" fica só como título da planta). O cofre de ferro ganha trabalho: abre com a `service-key` e guarda a fita do Otávio e o carimbo de tombo. `notebook.todo.vault` vira "Reserva técnica — três medalhas" |
| **C10** origem das medalhas | Uma por ala tombada inteira, guardadas pelo Jorge em seis envelopes; três bastam (§2.2). Bilhete reescrito (§8) |
| **C11** "projeto de ampliação" × seis alas abertas | Na ficção a ampliação já foi construída; o que falta é a montagem, que é o trabalho do jogador ("você é quem termina a montagem"). Em cada entrega, ala não construída aparece como lacre de montagem com olho mágico, sem tranca. No jogo final as seis abrem desde o primeiro segundo. A planta é redesenhada para bater com o prédio, com o texto fora do SVG (i18n). O átrio recebe um "relógio de portas" (§6.3) antes da Ala 2 |
| **C12** fio da bola × console do átrio | O console vira `atrium-handling-console`: quatro réplicas de manuseio, sem `threads`, declaradas como réplicas e apontando para o original ("o original está na Ala 5"). Cada réplica ganha o selo "original conferido" quando a bola da ala é tombada: é o placar físico do fio. O ritual da linhagem fica na Ala 6, com moldes e sem algarismo |
| **C13** exclusividade de numerais | Lint com `printedIn` e três classes de exceção: tutorial (`1896`, duas chaves), contado, lido em geometria |
| **C14** escada e formato das trancas | `LockPanel` com dígitos variáveis, entrada `keypad` ou `wheel`, fonte por tranca e os cinco degraus de §5.4 |
| **C15** "não cataloga se não virou" | Exame v2 (M4): normal própria por hotspot, pivô no centro, distância pelo tamanho, exame no lugar para peças grandes, giro mínimo antes de contar. `test:examine` reprova o estado atual antes do conserto |
| **C16** efeitos de destravamento | Gatilhos como dado (M5): ao abrir tranca, fechar conjunto, fechar fio, resolver ritual, assentar medalha |
| **C17** atalho | `progress.doorsReleased`: aberto por dentro uma vez, abre dos dois lados para sempre. Placa "SERVIÇO" e barra antipânico |
| **C18** "atravessar no escuro" | O quadro da Holyoke vai para o fundo (parede oeste, lado sul). A fala do Jorge fica verdadeira e a ala vira laço: entrar, atravessar, acender, sair pelo atalho |
| **C19** por que catalogar | Uma frase da Helena no caderno: o seguro só deixa expor peça conferida, com o verso olhado. Uma do Otávio na fita |
| **C20** placa de dedicação | Dedicatória real (§6.5), na parede que o jogador encara ao sair do escritório; o biombo sai da frente |
| **C21** nome e idade | Nome próprio único: **Museu do Voleibol**. A placa diz "O JOGO DESDE 1895". O bilhete perde a idade do museu |
| **C22** tempestade invisível | Leitor de `RoomData.audio` (M18); claraboia de verdade com vidro trincado, goteira e balde; a chuva se vê no vidro da entrada pública. "Janelas" vira "claraboia" na fala do ar morto |
| **C23** final sem Helena, Jorge nem 9h | Mantém o livro de tombo e acrescenta: Jorge reage à chave geral e à reserva, amanhece, a Helena fala pelo interfone às 9h, a lista risca inteira, o jogo segue aberto |
| **C24** mezanino | Só em T7; `EraId` ganha `mezzanine`. Depende do tier de detalhe distante (A16 de `06-engine`) |
| **C25** hotspots emprestados | Chave própria por hotspot, ancorada à geometria; `filipino-spike` passa a ser revelado por um documento que fala do ataque (§7.4) |
| **C26** texto × correções da pesquisa | Os seis erros e os onze duvidosos de `07-facts.md` §2.2 corrigidos antes de qualquer texto novo; as asserções entram em `test:opening-flow` |

**Lacunas de `01-canon.md` §1.6.** (1) O Otávio se aposentou há três semanas, está vivo e só o Jorge
fala com ele; não é o Fundador: o livro de tombo tem três letras, a do fundador, a dele e a página em
branco do jogador. (2) A Helena escreveu a lista; o que o jogador descobre entra abaixo, em "Minhas
anotações", com outra letra. (3) A portaria é uma guarita depois do vestíbulo da entrada pública,
vista pela grade; é por ali que o público entra às 9h. (4) Ver C19. (5) "Desde 1895" é o jogo. (6) Ver
C21. (7) Ver §5.6.

**As oito decisões do dono (`01-canon.md` §6) — recomendação.** 1: seis alas na ficção, entrega por
turnos, final a partir de três. 2: uma medalha por ala, três quaisquer. 3: aposentado, vivo, não é o
Fundador. 4: fita e carimbo. 5: sim, luz de serviço. 6: "Continuar" volta ao ponto de chegada da
última sala, com um resumo do Jorge. 7: a Helena só em voz (secretária eletrônica à meia-noite,
interfone às 9h). 8: sim, e com a prateleira de quarentena (§10.7).

---

## 4. Como a informação chega sem parede de texto

### 4.1 Os canais

| Canal | Onde vive | Limite | Quando aparece | Para quê |
|---|---|---|---|---|
| Placa física | `RoomText` ao lado da peça | título ≤ 5 palavras + uma frase ≤ 18 | sempre, a até 5 m | a manchete; é o que o Jorge manda ler |
| Etiqueta | painel de exame | ≤ 40 palavras | ao pegar a peça | o contexto |
| Detalhe (hotspot) | painel + destaque de 1,5 s | ≤ 12 palavras | ao virar | o que só o verso conta |
| Ficha de catálogo | caderno, aba Acervo | ≤ 45 palavras + proveniência + fontes | ao tombar | profundidade opcional |
| Documento de gaveta | leitor, um por vez com "próximo" | ≤ 70 palavras por página, até 2 páginas | ao abrir | história por trás |
| Banco de escuta | sentar (E) num banco com grade de alto-falante | 3 legendas, ≤ 45 palavras no total | opcional | história oral e descanso |
| Jorge, chamada de marco | rádio | ≤ 2 falas de ≤ 22 palavras | uma por marco | reação e próximo passo |
| Jorge, "e isso aqui?" | R mirando um objeto | 1 fala | quando o jogador pergunta | resposta do mundo |
| Jorge, curiosidade | R sem pendência | 1–2 falas | quando o jogador liga | guia de áudio |
| Figurinha | álbum, aba Coleção | ≤ 25 palavras + ● ou ●● | ao achar | curiosidade colecionável |
| Anotação | caderno, gerada | pergunta + valor + onde foi lido | ao aprender um fato | liga ler a abrir |
| Glossário do curador | caderno, uma linha | ≤ 20 palavras | na primeira vez que o termo aparece | vocabulário de museu |

### 4.2 Regras de redação

1. Orçamento por ala: 8 placas, 8 etiquetas (≤ 320 palavras), até 6 documentos, 2 bancos de escuta,
   3 figurinhas. `validatePacing` passa a contar palavras nas duas línguas (hoje conta peças).
2. Parede só recebe fato com dois publicadores (30 dos 87 do banco). Fato de uma fonte vai para
   hotspot, rádio, documento ou figurinha, e a figurinha mostra ●.
3. Divergência entre fontes é conteúdo: a etiqueta mostra as duas datas (líbero, chegada ao Brasil,
   três toques). O jogador aprende o fato e aprende a desconfiar.
4. Toda peça declara o que é: original, reconstrução tipológica, fac-símile ou réplica de manuseio.
5. Texto de mídia e legenda de fotografia em pt-BR e en (hoje há legendas em inglês na interface em
   português: `05-captures` §6.6).
6. Nenhum texto assado em geometria; plaquetas usam `RoomText`. Para não estourar draws, as placas de
   peça de uma sala saem numa textura por sala e idioma (alavanca L8 de `04-assets`), ou só desenham
   a até 5 m.
7. Brasil como presença constante, sem ufanismo (`07-facts` §3.1): fundador em Paris, sede em 1960,
   sétimo em 1964, o Maracanã, a prata antes do ouro, os saques com nome de seriado.

### 4.3 O que o jogo ensina além do vôlei

Vocabulário de museu, uma linha por termo, na aba Caderno: **tombo** (o número de registro de uma
peça), **reserva técnica** (onde fica o que não está exposto), **fac-símile**, **réplica de
manuseio**, **reconstrução tipológica**, **proveniência**, e por que as galerias são escuras (couro e
papel pedem pouca luz). O último explica a penumbra do museu inteiro com um fato de conservação.

Vocabulário: na interface o verbo continua sendo **catalogar**, como hoje; "tombo" entra só como o
nome do número de registro ("Catalogada — tombo nº 0007"). Neste documento uso "tombar" e "tombada"
como atalho de "catalogar por inteiro".

---

## 5. Sistemas transversais

### 5.1 O caderno

Cinco abas (cabem no toque):

| Aba | Conteúdo | Libera com |
|---|---|---|
| **Caderno** | carta da Helena, lista "Antes das 9h" viva, "Minhas anotações" (fatos, metas, glossário), páginas de fim de turno | ler o caderno |
| **Planta** | mapa (§5.2) | folheto da recepção (`reception-leaflet`) |
| **Acervo** | Catálogo por sala (três estados: vista / falta virar / tombada) e Fios (cinco faixas em silhueta) | caderno |
| **Arquivo** | documentos, fitas ouvidas, histórias do Jorge já contadas | caderno |
| **Coleção** | disciplinas (4), medalhas (6), ferramentas (3), álbum de figurinhas (24), créditos | primeiro item coletado |

Lista "Antes das 9h" (T1), com contador e sem item que nunca risca:

1. Religar a energia: escritório ✓ · átrio · Ala 1
2. Catalogar o acervo: Ala 1 (0/8) · réplicas do saguão (0/4)
3. Reserva técnica — três medalhas (0/3)

Cada item que risca toca um traço de lápis e mostra um toast de duas palavras. A linha 3 só risca na
assinatura final; até lá mostra o contador, e em T1–T2 o caderno diz por quê ("as outras alas estão
lacradas até a obra entregar").

### 5.2 A planta

- Sala só aparece depois de visitada; porta só de sala visitada; a sala vizinha entra como um toco
  com "?" (corrige I1 e H-33).
- Três estados por **padrão e cor**: tracejado cinza (sem luz), hachura âmbar (acesa, falta algo),
  cheio azul (completa).
- Marcador com seta de direção e rosa dos ventos (A5).
- Ícones: quadro de força enquanto a sala está apagada; tranca **tocada**, com o nome do que falta
  ("Plinto — 1 de 3 medalhas", "Gaveta — um ano"); peça vista e não tombada (toque mostra o título e
  "falta virar"); gaveta com documento não lido; cápsula esperando no tubo; atalho depois de aberto.
- Figurinhas por sala só depois da primeira achada ali ("1 de 3"), para não entregar o que o jogador
  ainda não sabe que existe.

### 5.3 Examinar: ensinar o verbo e responder a cada gesto

Depende do exame v2 (M4; defeitos C1–C3, C5, C6, H-01 a H-10).

- **Primeiro exame do jogo** (quase sempre uma réplica do saguão): depois de 4 s sem gesto, um arco
  com seta e "Arraste para girar" (no teclado, "ou use as setas"). Some no primeiro arrasto e nunca
  volta.
- **O que falta:** bolinhas ○/● com contagem. Depois de 8 s sem achar, um brilho de borda no lado em
  que está o detalhe obrigatório mais próximo (C6).
- **Achou um detalhe:** tique sonoro, o texto do detalhe aparece 1,5 s acima do painel, vibração curta
  no celular (H-07).
- **Catalogou:** som de carimbo, "Catalogada — tombo nº 0007" e o glossário de "tombo" na primeira
  vez. O número cresce a noite inteira: é o placar pessoal do jogador.
- **Aprendeu um fato:** som de lápis e "Anotado no caderno" (H-20).
- **Ajuda por tipo de peça**, no lugar de "Vire-a" para tudo: moldura ("o que importa está no
  verso"), impresso ("folheie"), peça grande ("olhe de perto: 2 detalhes").
- **Exame no lugar** para rede, manequim e mesa do congresso: a câmera vai a dois ou três pontos de
  vista autorais; o jogador olha em volta e passa ao próximo. O mesmo recurso serve ao olho mágico dos
  lacres e à luneta do mezanino, sem sistema novo.
- **Painel** em coluna lateral (≤ 38% da largura) em paisagem, com a peça no centro da área livre;
  arrasto que começa no painel não gira (C2, H-05, H-10).
- **Luz de mão** própria no exame, para a peça nunca ficar preta no escuro (B5, H-08).
- **Regra do giro mínimo:** detalhe obrigatório só conta depois de algum giro acumulado; o validador
  reprova obrigatório visível na pose de repouso (C3, H-06).

### 5.4 A escada de dicas que nunca entrega

Um estado só, por objetivo, compartilhado entre o painel da tranca e o rádio
(`progress.hintRungs[objetivo]`, salvo; fechar e reabrir o painel não zera — H-19).

| Degrau | Sobe quando | O que diz | Exemplo (`office-drawer`) |
|---|---|---|---|
| 0 | sempre | a pergunta | "Em que ano o Mintonette passou a se chamar Volley Ball?" |
| 1 — onde | 45 s no painel, 1 erro, ou 1ª chamada ao Jorge | a sala | "Isso se aprende na Ala 1." Se o jogador nunca entrou lá: "Você ainda não esteve onde isto se aprende." |
| 2 — o quê | 90 s, 2 erros, ou 2ª chamada | a peça, e o ponto dela pulsa na planta | "Retrato de William G. Morgan." |
| 3 — como | 3 erros ou 3ª chamada | o gesto | "Vire a moldura. Está escrito atrás." |
| 4 — a resposta | só se o jogador tocar em **Pedir ao Jorge** (o botão aparece no degrau 3) | o Jorge diz o número no rádio e o mostrador gira sozinho | a anotação fica marcada "contado pelo Jorge"; ler a fonte depois troca a marca para "conferido na peça" |

- Se o fato já está nas anotações, o painel avisa ("Você anotou isto") e abre a aba; não preenche
  sozinho, porque digitar o que se leu é o prazer da tranca.
- Rituais: o degrau 3 fixa um item no lugar; o 4 resolve.
- O tom do Jorge (paciência) muda a piada, nunca a altura da dica. A dica curta sempre repete o
  substantivo-alvo da cheia (H-21).
- Validador `radio-hint-coverage` (M10): todo estado pendente do caminho crítico tem os três degraus;
  nenhuma dica aponta para algo sem interação.

### 5.5 O Jorge

**Uma chamada por marco** (dado, `RadioCall` com `ProgressCondition` v2). No T1:

| Chamada | Quando | Falas (rascunho, na voz dele) |
|---|---|---|
| `porter-atrium-service` | átrio com luz de serviço | "Luz de serviço no átrio. É pouca, mas é honesta." / "A geral eu não religo daqui: a chave fica embaixo do plinto, invenção do Otávio. A Ala 1 é a porta ao lado do quadro. Câmbio." |
| `porter-holyoke-lit` | Holyoke acesa | "Ala 1 acesa, vi no painel. Agora é peça por peça: pega, vira, olha atrás." / "O Otávio dizia que museu que não olha o verso não sabe o que tem. Câmbio." |
| `porter-first-catalogued` | primeira peça tombada | "Primeira peça conferida. Faltam… bom, faltam bastante. Câmbio." |
| `porter-badge-indoor` | distintivo `indoor` | "Acendeu uma luz verde no arquivo de mapas do escritório. Gaveta 'Quadra'. Eu não mexi em nada. Câmbio." |
| `porter-holyoke-complete` | Ala 1 tombada inteira | "Ala 1 inteira? Então o envelope número um é seu. Vai pelo tubo: sai aí na recepção. Câmbio." |
| `porter-first-medal` | primeira medalha assentada | "Uma no plinto. Faltam duas. O Otávio levou trinta anos; você tem até as nove. Câmbio." |
| `porter-drawer-open` | gaveta do Otávio aberta | "Abriu a gaveta dele? Então você leu. Ele ia gostar de você. Não conta que eu falei. Câmbio." |
| `porter-shift-one` | fim do primeiro turno (T1) | "Por hoje é o que tem pra montar: as outras alas estão lacradas até a obra entregar. Espia pelo olho mágico. Câmbio, desligo." |

**"E isso aqui?"** — R com a mira num objeto que tem `askAbout` responde sobre ele (uma fala, uma vez
por objeto; depois volta à regra normal). É o que fecha E7 por quase nada: uma linha de texto por
objeto. Exemplos: o alçapão ("Eu falei que alagou. Não desce."), a caixa de doação ("Já olhei: um botão
e uma moeda de mil novecentos e oitenta e seis."), o chapéu ("É do Otávio. Esqueceu. Ou deixou."), o
lacre de uma ala ("Tem olho mágico. A Helena jura que não é pra espiar."), a guarita vista pela grade
("Tô te vendo. Para de olhar e vai trabalhar.").

**Curiosidade da sala** — sem nada pendente, ou a pedido depois da dica, ele conta uma do banco (uso
"J"), sem repetir. Holyoke: C05, C06, C15, C21. Átrio: C80. Cada uma ouvida entra no Arquivo, em
"Histórias do Jorge".

**Resumo de retomada** — ao "Continuar", uma fala: onde o jogador parou e o que faltava ("Você parou
na Ala 1; faltava virar duas peças").

**Arestas a fechar junto** (A6): transmissão suspensa fora do alcance do rádio deixado na mesa; fala
cortada quando a condição cai; a apresentação do Jorge nunca se perde, mesmo para quem religa o átrio
antes da primeira chamada.

### 5.6 A noite: relógio por marcos e tempestade

| Marco | Gatilho | Hora que o Jorge diz | Tempestade (som) | Prédio |
|---|---|---|---|---|
| N0 | começo | "passa das dez" | chuva forte no telhado, abafada no escritório | relógio parado às 16h47 |
| N1 | primeira entrada no átrio | — | um trovão; o vidro da claraboia acende por um instante, alto e distante, sem iluminar a sala | goteira num balde junto ao anel do plinto |
| N2 | luz de serviço | "dez e meia" | chuva firme | o vento bate a porta do atalho (som vindo do canto sudoeste: pista para quem explora) |
| N3 | primeira medalha | "meia-noite" | trovoada longe | o telefone do escritório toca uma vez; a secretária fica piscando: recado da Helena |
| N4 | segunda medalha | "duas da manhã" | a chuva afina | o balde está pela metade; as luzes de serviço piscam quando outra ala religa |
| N5 | chave geral | "quatro e meia" | a chuva para; só a goteira | luz geral, bomba do subsolo, alçapão destrava quando a água baixa |
| N6 | assinatura | "seis" | pássaros | a claraboia vai do preto ao azul e ao dourado; o vidro da entrada clareia |
| N7 | epílogo | "nove" | — | a grade da entrada sobe (som); a Helena fala pelo interfone |

- Nenhum marco tem prazo. A espera da bomba é diegética e curta (cerca de 25 s, com uma história
  longa do Jorge e o átrio recém-aceso para olhar); não há como falhar.
- **Acertar o relógio** (opcional): E no relógio do escritório com o rádio no bolso → o Jorge dá a
  hora → os ponteiros passam a saltar de marco em marco, com uma varrida rápida quando o jogador
  olha. Sem isso ele segue correndo a partir das 16h47, como hoje.
- O relâmpago é um evento único, autoral, no vidro da claraboia: dá a altura sem revelar o forro, que
  continua guardado para a luz geral. Com "Reduzir clarões" ligado, vira só o trovão.
- No apagão, o que brilha é pouco e tem motivo: pilotos dos quadros, placas fotoluminescentes das
  portas (mais escuras que hoje) e o LED do terminal do tubo. Todo o resto obedece à energia (B1, S6).

### 5.7 Retorno em três canais

| Ação | Som (sintetizado) | Mundo | Caderno / HUD |
|---|---|---|---|
| religar uma sala | alavanca, relés em sequência, reator | lente vermelha → verde, alavanca desce, luzes em cascata de 1,2–1,6 s do quadro para longe | "Energia: Ala 1", risco na lista |
| achar detalhe | tique | destaque de borda | texto do detalhe por 1,5 s |
| catalogar peça | carimbo | ponto da peça some da planta | "Catalogada — tombo nº …" |
| aprender fato | lápis | — | "Anotado no caderno" |
| errar código | trinco seco | o mostrador treme | degrau da escada, se subiu |
| abrir tranca | trinco, gaveta correndo | gaveta aberta de fato | tranca some da planta |
| ganhar distintivo | sino curto | disco do púlpito acende; LED da gaveta no escritório | "Disciplina: Quadra" |
| completar ala | acorde | a sala fica azul na planta | chamada do Jorge |
| cápsula no tubo | sopro correndo pelo forro, baque | bandeirola de latão levanta no terminal | ícone na planta |
| assentar medalha | latão pesado, zumbido | soquete acende; medalhão da era acende na parede de orientação | "Plinto: 2 de 3" |
| atalho aberto | barra antipânico | porta passa a abrir dos dois lados | "Atalho destrancado" |
| item da lista | traço de lápis | — | linha riscada |
| achar figurinha | papel | o pacotinho some | "Figurinha 5 de 24" |

Sons que ainda não existem em `audio.ts` e entram com M18: disjuntor, relés, goteira posicional,
chuva em três intensidades, trovão, tubo, carimbo, lápis, medalha, chave geral, bomba, passos por
superfície (madeira, pedra, tapete, areia, concreto, água).

### 5.8 Segredos e recompensas para o curioso

| Segredo | O que é | Onde começa | Recompensa |
|---|---|---|---|
| **Álbum de figurinhas** | 24 curiosidades ilustradas; o pacotinho no mundo é sempre a mesma malha, a arte só existe no caderno (custo de VRAM zero) | o álbum está nos achados e perdidos da recepção | 2 no escritório, 3 no átrio, 3 por ala, 1 no mezanino; álbum completo → o Jorge manda um café pelo tubo |
| **Olho mágico** | diorama minúsculo de cada ala em montagem, visto por exame no lugar | lacres do átrio | isca; vira a "vitrine-isca" da porta quando a ala é construída |
| **Bancos de escuta** | sentar e ouvir uma fita de história oral (legendas com chiado) | banco da Holyoke; lounge do átrio | entra no Arquivo; é o ponto de descanso da partitura |
| **A moeda** | moeda antiga na almofada da poltrona de visitas → caixa de doação | escritório | figurinha + fala do Jorge ("o primeiro doador da reabertura é o curador") |
| **Detalhe escondido** | um hotspot opcional por peça, fora do caminho do catálogo | toda peça | linha extra na ficha e o contador "olho de curador" |
| **Pontos altos** | coisas visíveis e altas demais (topo da vitrine corrida, legenda do friso, caixa no alto da estante) | visíveis desde T1 | alcançadas com a `step-ladder` do mezanino: volta às salas antigas com uma capacidade nova |
| **Quadro de cortiça** | cada documento lido aparece pregado como miniatura | escritório | progresso físico na sala segura, sem HUD |
| **Fita do Otávio** | cassete no cofre de ferro, tocada na secretária eletrônica | cadeia `indoor` → `service-key` → cofre | a voz dele uma única vez; explica os envelopes |
| **Guarita** | a janela acesa do Jorge, do outro lado da grade da entrada | átrio, lado sul | resposta própria do rádio |
| **Relógio acertado** | §5.6 | escritório | o relógio passa a contar a noite |

Exemplos de figurinha do T1 (● uma fonte, ●● duas): "O jogo é uma colagem: bola do basquete, rede do
tênis, mãos do handebol de parede, innings do beisebol." ● (C03) · "No começo não havia limite de
jogadores nem de toques." ●● (C05) · "Uma cortada de elite pode sair de 60 cm acima do aro do
basquete." ● (C80) · "O Canadá foi o primeiro país de fora a adotar o jogo, em 1900." ● (C14) · "O
saque podia ser ajudado: um colega empurrava a bola por cima da rede." ● (C06) · "Na Ásia já se jogou
com dezesseis de cada lado." ● (C15).

### 5.9 Dificuldade e acessibilidade

**Tela de ajustes** (não existe hoje: B6, H-37; pacote M27), acessível do título e do caderno:

| Ajuste | Opções | Por quê |
|---|---|---|
| Brilho | controle contínuo, com imagem de calibração ("ajuste até quase não ver o plinto") | a linguagem do jogo é o escuro |
| Tamanho do texto | 100 / 125 / 150% (painéis, legendas, caderno) | leitura é o jogo |
| Ler placa | "E: ler" em qualquer placa abre o mesmo texto no painel | o texto no mundo não escala |
| Legendas | sempre ligadas; opção "legendas de ambiente" ("[vento numa porta, a sudeste]") | pistas sonoras de exploração não podem ser só som |
| Reduzir clarões | relâmpago vira só trovão; cascata de luz vira subida suave | fotossensibilidade |
| Movimento de câmera | balanço e FOV (desligados por padrão) | vestibular |
| Sensibilidade e velocidade | controles | motor |
| Modo de jogo | **Curador** (padrão) ou **Visitante** | abaixo |
| Idioma | pt-BR / en | já existe |

- **Modo Visitante:** a escada sobe na metade do tempo, o Jorge começa no degrau 2, rituais já vêm
  com um item fixo e o painel preenche o código quando o fato está anotado. Tudo o mais é igual; pode
  ser trocado a qualquer hora. Não há modo "difícil": a dificuldade do jogo é ler.
- **Cor:** planta com padrão além de cor; LED com forma (traço apagado / tique aceso) além de
  vermelho e verde; detalhes ○/●; contraste AA nas etiquetas com portão de lint.
- **Teclado:** girar com as setas, aproximar com + e −, percorrer pontos de vista com Tab; foco preso
  nos painéis (`role="dialog"` já existe, falta mover o foco).
- **Toque:** alvo mínimo de mira de 0,35 m para peça pequena (C5), pinça para aproximar, botão de
  lanterna visível no exame, "segurar Ação" como gesto de assinar e de virar a chave geral, retorno
  ao tocar numa porta bloqueada (J3).
- **Modo leitura:** página estática com todo o texto do museu (M29), que serve também de revisão de
  roteiro.

---

## 6. O átrio agora

### 6.1 O que o jogador faz a cada 30–60 segundos

**Primeira passagem (escuro → luz de serviço), 3 a 4 minutos:**

| Tempo | O jogador | O mundo responde | O que ele aprende |
|---|---|---|---|
| 0:00 | abre a porta do escritório | vista composta: piloto vermelho ao fundo à esquerda, silhueta do plinto no centro, goteira; um trovão acende o vidro da claraboia, muito acima | "é grande, está escuro, tem uma luz vermelha" |
| 0:10 | atravessa com a lanterna | balde, anel aberto do lado dele, alçapão com fita | há algo embaixo |
| 0:25 | mira o plinto | prompt "Plinto — três encaixes vazios"; a tranca entra na planta | a meta do jogo, vista no minuto um |
| 0:40 | E no quadro | alavanca, relés, cinco poças de luz em cascata, lente verde; chamada `porter-atrium-service` | luz de serviço ≠ luz geral; próximo passo |
| 1:00 | recepção: pega o folheto | aba Planta; terminal do tubo com a bandeirola baixa; livro de visitas fechado | o mapa existe; algo vai chegar por ali |
| 1:20 | abre os achados e perdidos | álbum + primeira figurinha | há 24 |
| 1:40 | console "PODE PEGAR": primeira réplica | guia de arrasto, detalhe do verso, carimbo nº 0001 | o verbo central |
| 2:30 | outras três réplicas | cada placa aponta para uma ala | as eras; "o original está lá" |
| 3:00 | púlpito e torre | quatro discos e cinco emblemas apagados, com legenda | existem quatro disciplinas e cinco fios |
| 3:20 | espia um lacre (opcional) | diorama pelo olho mágico | o que vem |
| 3:40 | porta da Ala 1 | — | — |

**Cada volta ao saguão (20 a 60 s) traz uma coisa nova:** a cápsula no tubo, um soquete que acende,
um medalhão na parede de orientação, um disco no púlpito, o balde mais cheio, o atalho aberto, um selo
"original conferido" numa réplica. O átrio é o placar do jogo, lido sem HUD.

### 6.2 Objeto por objeto: de cenário a função

| Hoje | Passa a ser | Interação ou informação |
|---|---|---|
| `atrium-central-podium` (4 discos) | `atrium-plinth`: três soquetes, tampa giratória, chave geral por baixo | E assenta uma medalha por toque; prompt diz o que falta |
| anel fechado | guarda-corpo com uma abertura; corrimão e postes redondos (A6) | entra-se no anel para assentar: tem cerimônia |
| (nada) | alçapão gradeado com fita e som de água | "e isso aqui?"; abre no Ato III |
| `atrium-lectern` em branco | `atrium-disciplines-lectern`: quatro discos (quadra, praia, sentado, neve) e a legenda | discos acendem com os distintivos |
| `atrium-display-tower` (troféus genéricos) | `atrium-threads-tower`: cinco emblemas dos fios, com cartelas | emblemas se preenchem; cartela diz o fio em 12 palavras |
| parede de orientação sem palavra | "SEIS ERAS, SEIS ALAS": seis medalhões nomeados, mapa com continentes reconhecíveis, "você está aqui" | o medalhão da era acende quando a ala é tombada |
| console das bolas | `atrium-handling-console`: réplicas de manuseio com quatro plaquetas | exame; uma gaveta abre com o documento "Como ler uma bola" (costura, gomos, válvula, superfície) |
| balcão de recepção | folheto, terminal do tubo, livro de visitas, achados e perdidos | quatro interações; monitores apagados e em material de tela, não ferro (A10) |
| gaveteiro atrás do balcão | uma gaveta entreaberta (achados e perdidos); as outras respondem pelo Jorge | "fichas de sócio; a Helena digitalizou tudo" |
| caixa de doação | destino da moeda | figurinha |
| fila de cordas | fila com colisão e uma entrada clara (H1) | — |
| lounge | banco de escuta do átrio, com luz própria e colisor certo (A13, H2) | fita "A portaria"; figurinha sob a mesa lateral |
| três biombos | um sai da frente da dedicatória; os outros apoiam avisos de montagem | — |
| murais, banners, instalação aérea | legenda de ≤ 12 palavras cada, com "ilustração autoral" declarada; a instalação é explicada no púlpito (cada arco é a trajetória de um golpe) | leitura |
| porta do atalho | placa "SERVIÇO", barra, estado salvo | abre dos dois lados depois da primeira saída |
| quadro de força | "Quadro de serviço do átrio": no reboco, com colisor, lente e alavanca que mudam | E; nunca some de perto (A1–A3) |
| paredes norte, sul e leste | cinco lacres de montagem com olho mágico, já nos lugares das portas futuras | exame no lugar; E no tapume dá uma batida oca |
| forro | claraboia com vidro trincado (asset 10 de `04-assets` §5.3) | goteira, relâmpago, amanhecer |
| parede sul, centro | entrada pública envidraçada com grade e a guarita ao fundo (opcional, prioridade 2) | chuva no vidro, amanhecer, a voz da Helena |

### 6.3 Lista de melhorias, em ordem

Entre parênteses, o defeito de origem (`02`, `04`, `05`).

1. **Quadro**: montado no reboco, com colisor, proxy de dupla face, lente vermelha → verde, alavanca
   que desce; afastado do quadro da ala vizinha (A1, A2, A3, B4).
2. **Apagão de verdade**: emissivos, banners e texto de placa obedecem à energia (B1, F2, S6).
3. **Dois estágios de luz**: serviço agora, geral no final; renomear `power.atrium.title` (B2, C3).
4. **Religamento encenado**: som, cascata, chamada do Jorge (A4).
5. **Exame**: eixo pela câmera, painel lateral, giro mínimo, mira mínima, oclusão, luz de mão (C1,
   C2, C3, C5, C6, B5).
6. **Réplicas de manuseio**: plaquetas com texto; sem `threads`; texto corrigido (sem "costurados à
   mão", sem "milhares de dimples", "covinhas" no lugar de "dimples", "canal estreito e rebaixado" na
   de 1964); gomos e núcleo consertados (A1 de `04`), painéis visíveis na de 1964 (C4, C7).
7. **Plinto de três soquetes** com prompt, anel aberto e alçapão (D1, D2, A7).
8. **Função para cada objeto** da tabela de §6.2 (E1, dezessete itens).
9. **Dedicatória** reescrita, na parede oeste entre as duas portas ou com biombo e torre afastados;
   sem linha viúva em pt-BR e en (F1).
10. **Atalho persistente** com cara de porta de serviço (G1, F3).
11. **Planta e caderno**: §5.1 e §5.2 (I1, I2); direções relativas nas falas (A5).
12. **Relógio de portas**: decidir agora onde cada ala abre e pôr o lacre ali. Proposta a medir:
    oeste, Ala 1; norte, Alas 2 e 3; leste, Ala 4 ao norte do escritório; sul, Alas 5 e 6 dos dois
    lados da entrada pública. Do plinto a cada porta, um filete do embutido do piso na cor da ala.
    Exige redesenhar a planta do escritório e realocar console, sofá, recepção e torre (K2).
13. **Som**: goteira, chuva, relés, zumbido dos pendentes (item 16 de E1).
14. **Colisão**: cordas e pedestais, lounge, cadeiras (H1, H2); rota de teste a partir da porta do
    escritório (H3).
15. **Acabamento visível**: veio e valor das madeiras, lambri numa altura só e fora dos alizares,
    pendentes presos ao forro, banners retos, latão com o que refletir (S2–S5, S7, A3–A5, A14, F4).
16. **Portas seguras**: tempo-limite para a prontidão da sala vizinha (G2); luz estável enquanto a
    porta abre (B3).
17. **Ajustes**: brilho e texto (B6).

**Restrição que manda na ordem:** o kit do átrio está em 56 de 56 lotes (K1). Nada desta lista que
acrescente família de material entra antes da fusão do kit por material (L1 de `04-assets`: 56 → 11
draws por contagem, ainda não medido em frame).

### 6.4 Onboarding do átrio (o que falta hoje)

1. Uma primeira vista composta, com o piloto como farol e nada mais aceso.
2. A meta mostrada cedo: o plinto vazio tem prompt e entra na planta.
3. O próximo passo dito por alguém: a chamada do Jorge ao religar.
4. O mapa entregue como objeto (o folheto), não como aba que já estava lá.
5. O verbo ensinado onde errar não custa: as réplicas, com o guia de arrasto.
6. As três famílias de progresso apresentadas num giro pela sala: medalhas no plinto, disciplinas no
   púlpito, fios na torre.
7. Direção sem bússola: "a porta ao lado do quadro", seta na planta.

### 6.5 Textos do átrio (rascunho)

- Dedicatória: "MUSEU DO VOLEIBOL · O JOGO DESDE 1895 — Dedicado a quem joga, apita, anota e guarda.
  Aqui a história se pega na mão e se vira do avesso."
- Console: "RÉPLICAS DE MANUSEIO — PODE PEGAR. Os originais estão nas alas."
- Púlpito: "QUATRO DISCIPLINAS, UM JOGO: quadra, praia, sentado, neve. Cada disco acende quando o
  curador reconhece a disciplina no acervo."
- Torre: "CINCO FIOS ATRAVESSAM O PRÉDIO: a bola, a rede, as regras, a praia, o vôlei sentado. Siga
  um deles de ala em ala."
- Lacre: "ALA 2 · PARIS · EM MONTAGEM".
- Réplica tricolor: fala só da bola e manda à Ala 5; o ano pode ficar, porque deixou de ser código.

---

## 7. A Holyoke agora

### 7.1 O que o jogador faz a cada 30–60 segundos (8 a 11 minutos)

| Tempo | O jogador | O mundo responde | Informação entregue |
|---|---|---|---|
| 0:00 | entra no escuro | tela de entrada com as mãos; piloto vermelho no fundo, em diagonal; a porta do atalho bate com o vento | — |
| 0:10 | atravessa com a lanterna | três vislumbres autorais: o vidro da vitrine-herói, o latão do quiosque, o rosto do Morgan atrás do vidro | "tem coisa aqui" |
| 0:50 | E no quadro (parede oeste, lado sul) | cascata do fundo para a entrada: vãos da vitrine um a um, herói, ginásio, tela; peças já viradas no escuro são carimbadas em sequência; chamada `porter-holyoke-lit` | o que fazer: virar tudo |
| 1:10 | vitrine-herói: Spalding | cadarço na frente, carimbo no verso; tombada | "feita sob encomenda" |
| 2:10 | vitrine corrida, vão a vão: manual, guia, retrato, fotografia | cada peça no centro do seu vão, com foco de luz | innings; o crédito de Morgan; a conta que não fecha |
| 3:40 | vira a moldura do Morgan | etiqueta manuscrita no verso; "Anotado no caderno" | 1896 |
| 4:10 | arquivos A e B | um documento por vez; miniaturas no quadro de cortiça, depois | a data famosa sem citação; a bomba filipina; seis de cada lado |
| 5:30 | ginásio: rede (exame no lugar) | ponto de vista da fita; passar por baixo; soquete | "logo acima da cabeça" |
| 6:30 | traje e câmara de borracha | distintivo `indoor` ao fechar bolas + rede: disco no púlpito, LED no escritório, chamada | para quem o jogo foi pensado |
| 7:30 | banco de escuta (opcional) | fita "O prefeito e o bombeiro" | C10, C12 |
| 8:00 | quiosque, friso, figurinhas (opcional) | linha do tempo em três folhas | 1895, o nome, as regras |
| 9:00 | última peça | sala azul na planta; `porter-holyoke-complete` | — |
| 9:20 | sai pelo atalho | barra antipânico; "Atalho destrancado"; cai ao lado da recepção, onde a cápsula espera | o prédio dobra sobre si |

### 7.2 Lista de melhorias, em ordem

Códigos de `03-audit-holyoke`, `04-assets` e `05-captures`.

1. **Exame v2** nas oito peças; a suíte `test:examine` reprova o estado atual primeiro (H-01 a H-10).
2. **Vitrine corrida**: as quatro peças no centro de um vão cada, apoiadas no topo real da
   prateleira; a receita exporta `layout`; impressos num berço inclinado, com capa e página; recheio
   assado vira dado ou sai (H-13, H1 e H3 de `04`).
3. **Retrato e fotografia**: a impressão viaja com a moldura; a data vai para o verso, como etiqueta
   manuscrita em `RoomText`; cartão e moldura numa fonte só (H-04, H-14, H-18).
4. **Hotspots próprios**, ancorados na geometria; carimbo do fabricante modelado; sem bico de válvula
   na bola de cadarço (H-11, H-12).
5. **Rede e traje**: exame no lugar; rede na linha central da quadra, com barriga e sem fita embaixo,
   declarada "trecho reconstruído"; traje em malha, com forma de roupa; colisores (H-01, H-02, H-31,
   H-48, H6 e H8 de `04`).
6. **Câmara de borracha** à altura da mão (0,95–1,25 m), em borracha lisa, com a bola de basquete ao
   lado como par não interativo (H-16, H11).
7. **Spalding**: couro próprio com grão de couro; escala no máximo 1,6 com a nota "modelo ampliado",
   ou tamanho real (H-15, H2). No exame, sempre tamanho real.
8. **Luz**: cinco focos autorais (herói, vão do retrato, vão dos impressos, rede, arquivos) em vez de
   sete amostrados; cascata ao religar (H-24, H4; arquivos no breu em `05`).
9. **Quadro** na parede oeste, lado sul, com LED, alavanca, som e rampa (H-25, H-26, C18).
10. **Placas com texto** nas oito peças; quiosque com três folhas; legendas de mídia em pt-BR;
    créditos do friso onde se leiam (H-49, H-50, H-51).
11. **Texto histórico**: os seis erros e os onze duvidosos; etiquetas ≤ 40 palavras (H-38 a H-47,
    H-53).
12. **Cadeia do 1896**: escada de §5.4, aba de anotações, dica curta com alvo (H-19 a H-22).
13. **Chamadas por marco** (H-27) e distintivo `indoor` com retorno.
14. **Atalho** persistente e com cara de serviço (H-29, H-30).
15. **Arquivos**: um documento por vez; dois documentos novos (§7.4) (H-35).
16. **Banco de escuta** no banco que já existe; conjunto de treino com placa "peça de apoio".
17. **Mural**: legenda "ilustração autoral gerada para este museu" e rede corrigida (H-47).
18. **Paleta da ala**: piso tabaco, forro escuro, azul que continua azul sob luz quente (S1, S4).
19. **Verso da tela de entrada** com conteúdo: a frase da ala voltada para quem sai (item 14 de `05`).
20. **Som**: o emissor `holyoke-clock` ganha um relógio modelado ou sai (H-28).
21. **Planta e caderno**: "falta virar", pontos com nome (H-33, H-34); ponto de chegada da sala para
    o "Continuar" (H-36).
22. **Segredos**: três figurinhas (sob o banco; atrás dos documentos do arquivo B; no topo da vitrine
    corrida, que é ponto alto).

### 7.3 Peça por peça (texto de rascunho, já com as correções de `07-facts`)

| Peça | Manchete da placa | Uma frase | Detalhe obrigatório (verso) | Detalhe opcional | Proveniência |
|---|---|---|---|---|---|
| `ball-improvised` | A câmara que não servia | Morgan testou a câmara de uma bola de basquete: leve e lenta demais. A bola inteira era grande e pesada demais. | gargalo amarrado da câmara | emenda da borracha | reconstrução tipológica |
| `ball-spalding` | Feita sob encomenda | Sem bola que servisse, Morgan pediu uma à fábrica da Spalding, perto de Chicopee: couro, de 25 a 27 polegadas de volta. | carimbo do fabricante, no lado oposto ao cadarço | cadarço de couro cru | reconstrução tipológica |
| `net-1897` | Logo acima da cabeça | A primeira ideia era o tênis; ficou só a rede, posta logo acima da cabeça de um homem médio. | fita superior, vista de baixo | soquete do poste | trecho reconstruído |
| `handbook-1897` | O primeiro manual oficial | Nove innings, como no beisebol; cada um acabava com três "outs" de saque por time. | folha de rosto do manual (revela `first-rulebook`) | duas tentativas de saque; a bola tinha de andar dez pés | fac-símile |
| `guide-1916` | Morgan conta a história | Vinte anos depois, ele mesmo creditou o Dr. Frank Woods e o chefe dos bombeiros John Lynch. | página do crédito | a estimativa de Cubbon: 200 mil praticantes, mas as parcelas somam 155 mil | fac-símile |
| `gym-suit` | Para quem o jogo foi feito | Malha de lã e calça até o joelho: a roupa dos sócios mais velhos, com menos fôlego para o basquete. | as costas do traje (texto a escrever a partir da pesquisa, sem inventar marca nem etiqueta) | malha canelada | reconstrução tipológica |
| `portrait-morgan` | William G. Morgan, 25 anos | Diretor de educação física da YMCA de Holyoke, tinha 25 anos quando inventou o jogo. | **verso: "Springfield, 1896 — o Mintonette passa a se chamar Volley Ball"** (revela `springfield-renaming`) | crédito da fotografia, como registrado no Commons | reprodução de fotografia em domínio público |
| `photo-gym` | O ginásio da invenção | Publicada em 1897: argolas, cavalo com alças, pesos de polia e a pista de corrida suspensa. | verso: nota de publicação no jornal | o prédio queimou em 1943 (uma fonte: fica no detalhe, não na placa) | reprodução |

Notas: frase de placa só usa fato com dois publicadores; o que tem uma fonte desce para detalhe ou
documento (a chegada de Morgan em 30 de agosto já está em `doc-invention-date`). A ficha do Morgan
corrige a saída da YMCA para 1897 e diz "dezembro de 1942"; o verso não usa
a palavra "demonstração" (a ocasião é contestada); o `1896` fica em duas chaves (o verso e
`doc-halstead`) e sai das fichas do manual, do retrato e da fotografia. A folha 2 do quiosque não
imprime o ano: "O NOME — Mintonette durou pouco. Quem rebatizou o jogo, e quando, está no verso de um
retrato desta sala." É o degrau 1 da escada, escrito na sala.

### 7.4 Arquivo e banco de escuta

- `holyoke-cabinet-a`: `doc-invention-date` (ajuste: o IVHF "infere", não "situa"), `doc-halstead`
  (sem afirmar que a troca foi na demonstração de julho).
- `holyoke-cabinet-b`: `doc-rule-changes` ("de vinte e um para quinze"; a divergência 1920 × 1922
  dos três toques declarada) e, novo, `doc-filipino-bomb` (C22, com "ficou conhecido como"; revela
  `filipino-spike`), `doc-morgan-stagg` (C18, C19).
- Banco de escuta, fita 1, "O prefeito e o bombeiro": "Na demonstração de Springfield, os dois times
  de Holyoke tinham capitães ilustres: o prefeito e o chefe dos bombeiros. O chefe, John Lynch, ainda
  seria lembrado por Morgan vinte anos depois."

### 7.5 Onboarding da Holyoke (o que falta hoje)

1. Saber onde está o quadro: piloto visível da porta e dica com direção.
2. Saber o que fazer depois de acender: a chamada do Jorge e a linha "Ala 1 (0/8)".
3. Ler sem apertar E: as placas.
4. Saber que virou certo: retorno de detalhe, carimbo, anotação.
5. Saber o que falta: "falta virar" no catálogo e pontos com nome na planta.
6. Saber que acabou: a sala azul, a chamada, a cápsula.

---

## 8. O escritório: o que muda a cada volta

| Volta | O que há de novo | Ação |
|---|---|---|
| começo | caderno, luminária (a música calma começa no clique), rádio | abertura atual |
| opcional | relógio, planta na parede, chapéu, moeda na poltrona, figurinha presa no quadro de cortiça | acertar o relógio; examinar a planta (anota "reserva sob o átrio; 3 medalhas?"); "e isso aqui?"; pegar a moeda |
| com o `1896` | gaveta do Otávio | bilhete reescrito, abaixo |
| com o `indoor` | gaveta "Quadra" do arquivo de mapas, LED verde | dois documentos e a `service-key` |
| com a chave | cofre de ferro | fita do Otávio, carimbo de tombo, uma figurinha |
| com a fita | secretária eletrônica ao lado do telefone | a voz do Otávio (quatro legendas): os seis envelopes, "três bastam", a chave geral sob o plinto, "o seguro e eu queremos a mesma coisa: que alguém olhe o verso" |
| depois de N3 | a secretária pisca | recado da Helena, à meia-noite |
| sempre | quadro de cortiça | uma miniatura por documento lido |

Bilhete do Otávio, reescrito (verdadeiro palavra por palavra neste desenho): "Se você está lendo
isto, achou a combinação: leu em vez de passar. Bom. O resto do acervo está na reserva técnica, sob o
átrio, e ela não abre com números: abre com três medalhas. Deixei uma para cada ala com o Jorge. Ele
entrega quando a ala estiver catalogada por inteiro. Sem pressa: o jogo esperou mais de um século."

Frase nova da Helena, no P.S.: "O seguro só deixa expor peça conferida: cada uma precisa da ficha,
com o verso olhado. É por isso que a lista diz 'catalogar'."

Restrição: o escritório está no teto de 53 lotes. A secretária eletrônica e os LEDs das gavetas usam
materiais que já estão na sala e o contrato de dispositivo que já existe; as miniaturas do quadro de
cortiça usam o papel já assado, em posições prontas.

---

## 9. A cadeia do primeiro turno (T1), ação por ação

| # | Ação do jogador | Exige | Concede | Dica cobre? |
|---|---|---|---|---|
| 1 | E no `office-notebook` | — | caderno; lista viva | `notebook` |
| 2 | E na `office-lamp-switch` | — | energia do escritório; rádio com carga; porta destrava; música | — |
| 3 | E no `office-radio` | 2 | rádio no bolso (R) | chamada |
| 4 | porta para o átrio | 2 | átrio | — |
| 5 | E no `atrium-breaker` | — | luz de serviço; `porter-atrium-service` | `atrium-service` |
| 6 | E no `reception-leaflet` | — | aba Planta | opcional |
| 7 | E em `reception-lost-found` | — | álbum, figurinha | opcional |
| 8 | mirar o `atrium-plinth` | — | tranca vista, anotada na planta | — |
| 9 | examinar as quatro réplicas | 5 para tombar | 4 peças tombadas; item da lista | `replicas` |
| 10 | porta da Ala 1 | — | Holyoke | — |
| 11 | E no `holyoke-breaker` | — | energia; cascata; `porter-holyoke-lit` | `holyoke-power` |
| 12 | virar o `portrait-morgan` | — (tomba com 11) | fato `1896` anotado | `drawer`, degraus 1–3 |
| 13 | tombar `ball-improvised`, `ball-spalding`, `net-1897` | 11 | distintivo `indoor`; disco no púlpito; LED no escritório; `porter-badge-indoor` | `tombar-holyoke` |
| 14 | tombar as oito | 11 | ala azul; `porter-holyoke-complete`; cápsula no tubo | `tombar-holyoke` (o degrau 3 nomeia a peça que falta) |
| 15 | E no `holyoke-shortcut` | — | atalho liberado para sempre | — |
| 16 | E no `atrium-tube-terminal` | 14 | medalha `holyoke`; bilhete do envelope um | `medal-pickup` |
| 17 | E no `atrium-plinth` | 16 | soquete 1 de 3; medalhão da era aceso; `porter-first-medal`; marco N3 | `plinth` |
| 18 | teclado da `office-drawer`: 1896 | — (12 ensina) | `doc-predecessor`; `porter-drawer-open` | `drawer` |
| 19 | gaveta "Quadra" do arquivo de mapas | 13 | dois documentos; `service-key` | `registrar-drawer` |
| 20 | E no `office-safe` | 19 | fita, carimbo, figurinha; chave consumida | `safe` |
| 21 | E na secretária eletrônica | 20 | a voz do Otávio; anotação | `tape` |
| 22 | gatilho `shift-one-complete` | 9, 17, 18, 21 | página "Fim do primeiro turno" (peças, fatos, figurinhas, consultas ao Jorge); `porter-shift-one` | — |

**Furos fechados em relação a hoje.** O jogo deixa de acabar num objeto inerte (D1); a última dica
deixa de apontar para o que não existe; "catalogar" passa a ser alcançável (H-01) e a ter motivo
(C19); o item da reserva tem contador e explicação; a fala "atravessa no escuro" fica verdadeira; o
subsolo proibido existe como alçapão; o atalho encurta de fato a volta; `factsKnown` passa a ter
leitor; o cofre de ferro, o telefone, a planta e o chapéu deixam de ser promessas soltas (P19, P28,
P8, P32).

**Quebras de sequência toleradas, de propósito.** Digitar `1896` sem ter ido à Ala 1 continua
possível: quem sabe de cor merece. O que muda é que a escada não entrega dígito, então não há como
adivinhar com ajuda. Ler o bilhete cedo não quebra nada: ele só promete o que o Jorge entrega depois.

---

## 10. As alas futuras

Partitura-padrão de uma ala (10 a 12 minutos): limiar com vitrine-isca (20 s) → travessia no escuro
com três vislumbres (50 s) → religar e chamada (20 s) → herói (90 s) → **interação-assinatura** (2
min) → arquivo (90 s) → tranca ou ritual (90 s) → peças restantes (2 min) → banco de escuta ou segredo
(opcional) → fecho: ala azul, atalho, cápsula, volta ao átrio.

### 10.1 Ala 2 — Paris (1930–1949), "a sala da mesa verde"

- **Assinatura: contar.** Dar a volta na mesa de 4,6 m lendo os marcadores em francês (exame no
  lugar: cada marcador diz o país e uma linha) e levar a conta à roda de latão da borda. Nenhuma
  placa da sala diz quantos são.
- **Segundo gesto, "três continentes":** no plano de mesa, as delegações europeias já estão
  alfinetadas; o jogador alfineta as quatro restantes num mapa. Resultado: Europa, África e Américas.
  A ficha diz que a conta de "cinco continentes" que circula não bate com a própria lista. Quatro
  movimentos, cabe no toque. Substitui a ordenação de catorze itens de agosto, pesada demais para
  celular e sem fonte para a ordem.
- **Vista de impacto:** do cotovelo de entrada, a mesa verde sob uma lâmpada só. Ao religar, as
  luminárias de mesa acendem uma a uma, como chamada. E o **corredor da guerra**: quatro metros em que
  a luz não volta nunca, com quatro calendários em branco e uma só placa acesa: "1941–1944: o
  campeonato soviético não foi disputado. Este trecho fica no escuro de propósito."
- **Curiosidades:** C24 (o Brasil entre as fundadoras, ao lado de Egito, Uruguai e Estados Unidos;
  ●●, no marcador) · C23 (a federação começou a ser combinada num café de Praga; ●, documento da
  caixa) · C26 (o primeiro presidente ficou 37 anos; a sede só saiu de Paris em 1984; ●●, documento).
- **Segredo:** a ficha colada por dentro da tampa da caixa-despacho, "FAC-SÍMILE. Texto
  reconstituído." Figurinha no corredor escuro, para quem o atravessa devagar. Na entrada, a vitrine
  da areia coberta por um pano: "falta o distintivo de praia".
- **Banco de escuta:** "O café Graf".

### 10.2 Ala 3 — Tóquio (1950–1969), "a sala que tem praia dentro"

- **Assinatura: procurar com a lanterna.** A tampa de garrafa enterrada na areia só brilha sob o
  facho rasante, mesmo com a sala acesa. A lanterna ganha um segundo uso depois que a luz voltou.
  Achar dá o distintivo `beach`. Pegadas na areia levam para perto dela.
- **Segundo gesto, comparar gêmeas:** a bola de 1964 na torre e a irmã encharcada de areia na quadra,
  no mesmo eixo. Examinar as duas fecha o nó do fio.
- **Tranca:** `tokyo-trophy-punch`, punção de quatro rodas com alavanca; fonte no kit CCCP.
- **Vista de impacto:** o quadro fica do lado da praia. Religar acende o painel de céu: amanhece
  dentro do prédio, e o primeiro passo na areia troca o som do passo.
- **Curiosidades:** C33 (o time japonês jogava com nove de cada lado até 1958; ●●, placa) · C41 (o
  primeiro prêmio de um torneio de praia, em 1948, foi um engradado de refrigerante; ●●, detalhe da
  tampa) · C45 (o Brasil estava no primeiro torneio olímpico: sétimo lugar; ●●, detalhe).
- **Cuidados de numeral:** o treino das operárias vai "do meio da tarde às duas da madrugada"; a
  quantidade de seleções do Mundial não aparece.
- **Banco de escuta:** "Ponto do ouro" (C36, como "conta-se que").

### 10.3 Ala 4 — Ferro e Areia (1970–1989), "a da areia"

- **Assinatura: girar a manivela.** Três marcas no poste: a altura feminina, a masculina e, a giz,
  "Morgan". Baixar até a marca de giz e passar por baixo repete o gesto da Ala 1 com o corpo; subir
  até a masculina mostra a luva da antena, que só aparece com a rede no alto. A altura é gesto, nunca
  fechadura.
- **Segundo gesto, virar a camisa:** frente sem número, costas com ele; dois tambores.
- **Ferramenta:** levar o `crate-dolly` até a porta da doca abre o atalho.
- **Vista de impacto:** o ginásio frio do bloco oriental e, pela porta da doca entreaberta, o pátio
  de areia aceso como dia. Dois climas num olhar.
- **Curiosidades:** C48 (o pai de Kiraly fugiu da Hungria em 1956; aos onze anos Karch estreou na
  praia como dupla dele; ●●, placa da camisa) · C50 (ouro na quadra duas vezes e na areia uma:
  medalhas em duas arenas; ●●) · C46 (Wagner assumiu a Polônia aos 32 anos sem nunca ter treinado um
  time; o apelido era "Kat", o carrasco; ●●, dossiê).
- **Banco de escuta:** "Jornada nas Estrelas" (C54).
- **Segredo:** figurinha dentro do caixote do carrinho.

### 10.4 Ala 5 — A Reescrita (1990–1999), "a sala dos dois placares"

- **Assinatura: dar o replay.** Na mesa do árbitro, uma alavanca repete a mesma sequência de oito
  ralis. O placar da esquerda só marca quando quem sacou venceu; o da direita marca sempre. O jogador
  vê o mesmo jogo andar em duas velocidades. Sem número a digitar.
- **Ritual `three-changes-1998`** (casar três com três): cada mudança com o problema que resolveu.
  Só entra com fonte para os três pares; hoje o banco sustenta o rally point (C63) e a bola colorida
  (C61); o motivo do líbero precisa de fonte antes de virar par.
- **A torre das duas bolas** vira evidência do ritual: a branca e a tricolor a 40 cm uma da outra.
- **Vista de impacto:** dois placares acesos numa sala escura; ao religar, teste de lâmpadas e 0 a 0.
  No apagão, só os LEDs de espera dos monitores.
- **Curiosidades:** C59 (nem a federação decide quando o líbero nasceu: uma página dela diz 1996,
  outra diz 1998; a placa mostra as duas) · C64 (desde 2000 o saque pode tocar a rede e seguir; ●●,
  Jorge) · C67 (as primeiras campeãs olímpicas do Brasil saíram de uma final só de brasileiras; ●●,
  sem "único").
- **Espiral:** o arquivo de imprensa de praia abre com o distintivo achado duas salas atrás.

### 10.5 Ala 6 — Global (2000 em diante), "a sala da bola com covinhas"

- **Assinatura: descer e julgar.** (1) Descer à quadra rebaixada do vôlei sentado: de pé no plano
  baixo, a rede fica na altura do queixo. Tombar a quadra dá o distintivo `sitting`. (2) No console
  de desafio, três lances: o jogador avança quadro a quadro e decide dentro ou fora. Errar não trava;
  a marca aparece e a placa diz "o desafio existe porque o olho erra".
- **Tranca contada:** a corda de demarcação tem um nó por metro; as duas rodas pedem largura e
  comprimento. As estacas da quadra antiga continuam fincadas por fora, e a placa diz "um metro mais
  estreita, dois mais curta".
- **Ritual da linhagem:** seis moldes em negativo (sulco de cadarço, costuras de dezoito gomos,
  covinhas…) casados com as seis eras pelo relevo, sem algarismo. É o pagamento do fio da bola e
  **não entra na conta da medalha da ala**: como pede as seis bolas do prédio, amarrá-lo à medalha
  quebraria o "três quaisquer". O prêmio é o emblema da bola na torre do átrio e o selo nas réplicas.
- **Vista de impacto:** a bola de oito gomos sob o facho rasante: as covinhas só aparecem com luz de
  lado. Terceiro uso da lanterna.
- **Curiosidades:** C70 (em 2008 a bola perdeu dez gomos de uma vez e perdeu o branco; ●●) · C75 (o
  vôlei sentado nasceu na Holanda, em 1956, da mistura com o sitzball; ●●) · C77 (no vôlei sentado
  pode-se bloquear o saque; ●●, Jorge).
- **Para não envelhecer:** pódios em lista datada; nenhuma contagem de títulos; o banco do
  Bernardinho é peça, a etiqueta fala do que ele mudou tecnicamente.

### 10.6 Mezanino

- **Assinatura: olhar de cima.** Uma luneta de mirante apontada para o átrio. Por ela, os filetes do
  piso acendem na cor de cada fio fechado, ligando as portas das alas: o jogador vê a forma do que já
  fez e do que falta, sem HUD.
- **Vista de impacto:** o saguão inteiro, o plinto com os soquetes e a instalação aérea à altura dos
  olhos, finalmente legível como trajetórias.
- **Só existe aqui:** a vitrine do vôlei de neve e o distintivo `snow`; a `step-ladder`; a parede de
  créditos.
- **Curiosidades:** C83 (joga-se de chuteira, com roupa térmica por baixo; ●●) · C85 (na neve, o
  toque no bloqueio não conta como um dos três; ●) · C82 (ganhou forma em Wagrain, na Áustria, em
  2008; ●). A neve segue com fonte fina: sem segunda fonte, fica em hotspot e figurinha.

### 10.7 Reserva técnica

- **Assinatura: assinar.** Segurar E sobre a página em branco do livro de tombo. Sem nome digitado:
  evita teclado virtual, dado pessoal no save e o conflito do E com campo de texto.
- **Chegada:** descer com a água ainda baixando; passos na água; a marca da enchente na parede.
- **O livro:** três letras (o fundador, o Otávio, a página do jogador). Ao ler, as fichas do Acervo
  recebem o carimbo de proveniência e o caderno soma: quantas das peças tombadas são originais.
- **Prateleira de quarentena:** caixas etiquetadas "NÃO EXPOR — sem segunda fonte", com as afirmações
  que a pesquisa derrubou ou não conseguiu sustentar: a lista de dezesseis fundadoras (C30), os
  "cinco continentes", o "censo" de 1916, a morte de Morgan "em 1940". É o pipeline de fatos do
  projeto transformado em acervo, e a prova de que o museu sabe o que não sabe.
- **Fecho:** o Jorge avisa que ligou para o Otávio ("Ele disse 'eu sabia'. E desligou."); amanhece;
  a Helena pelo interfone.

---

## 11. Depois do final

1. **O museu aceso e aberto.** Luz geral, sol na claraboia, a lista da Helena inteira riscada e uma
   lista nova, opcional: figurinhas que faltam, pontos altos, fios, as três medalhas restantes.
2. **Curadoria.** Em cada ala, um atril de entrada mostra o "destaque do curador": o jogador escolhe
   uma entre as figurinhas que achou naquela ala. A escolha fica no save. É a carta do Otávio
   ("continue declarando") virada em verbo.
3. **Seis de seis.** As três medalhas extras assentam nos soquetes de baixo: luz de gala nos banners
   e na instalação aérea, o sétimo envelope do Otávio e o último painel dos créditos.
4. **Livro de visitas.** No balcão, o resumo da noite: peças, fatos conferidos na peça × contados
   pelo Jorge, detalhes escondidos, tempo. Gera um cartão de imagem para compartilhar, sem dado
   pessoal.
5. **Guia de áudio.** Com tudo feito, R passa a contar as curiosidades ainda não ouvidas da sala.
6. **Segunda visita.** O modo Visitante e o modo leitura servem a quem volta só para mostrar o museu
   a outra pessoa.

---

## 12. Critérios de aceite da experiência

| Portão | Automático | Com uma pessoa nova |
|---|---|---|
| T1 | `test:examine` (toda peça obrigatória alcançável, nenhuma nasce vista); `validatePacing` por palavras; `radio-hint-coverage`; `kit-looks-interactive` sem avisos; `test:playthrough` chega a `shift-one-complete` por qualquer ordem válida; lint de numerais; asserções históricas da Holyoke | acha o quadro do átrio em até 3 min; termina a Ala 1 em 8 a 12 min; fecha o turno em até 25 min; repete dois fatos verdadeiros sem ajuda; chama o Jorge no máximo três vezes no caminho crítico; não aperta E em mais de dois objetos sem resposta |
| T2 | fato do `14` capturado; nenhuma chave imprime a contagem | conta os marcadores sem dica de degrau 3 |
| T3 | `test:ending`; emissivo zero sem energia; forro abaixo do limiar na luz de serviço e acima na geral | diz, sem ser perguntado, algo sobre o tamanho do átrio quando a luz geral acende |
| T4–T6 | `thread-single-room` como erro; listas datadas | fecha um fio cruzando o prédio e sabe dizer qual |
| T7 | detalhe distante do átrio visto do mezanino dentro do teto de draws | usa a luneta para decidir aonde ir |
| T8 | modo leitura contém toda chave de conteúdo; contraste AA | joga no celular, em paisagem, sem pedir ajuda para girar uma peça |

O que cada item pede do motor, para o T1: M0, M2, M4, M5, M6 (teclado, ferramenta e distintivo), M7
(pickups e aba Coleção), M9, a parte de emissivos e estágios de M17, o mínimo de M18 e de M27. A
fusão do kit por material (L1) vem antes de qualquer objeto novo no átrio.

---

## 13. Decisões que este desenho acrescenta para o dono

1. **"Viu no escuro, tomba com luz"**: catalogar passa a exigir a sala acesa. Muda um comportamento
   que hoje existe (peças tombam no escuro).
2. **Tubo pneumático e seis envelopes com o Jorge** como forma de entregar as medalhas.
3. **Álbum de figurinhas** como colecionável do jogo (24), com marca de uma ou duas fontes.
4. **Réplicas de manuseio** no saguão, em vez de peças do fio da bola.
5. **`1998` e `2002` deixam de ser códigos** (ritual dos placares; contagem dos nós).
6. **"Pedir ao Jorge"**: a resposta de uma tranca só sai com consentimento, e fica marcada.
7. **R mirando pergunta "e isso aqui?"**: muda o que o R faz quando há um objeto na mira.
8. **Entrada pública com grade e guarita** no átrio (prioridade 2; custa geometria nova).
9. **Modo Visitante** como segunda dificuldade.
10. **Fim de turno** como fecho honesto das entregas T1 e T2, antes de o final existir.
11. **Quadro da Holyoke no fundo da sala** e relógio de portas do átrio definido já em T1.
