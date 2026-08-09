# Plano completo — do átrio ao Cofre do Fundador

Este documento é o desenho do jogo inteiro: as seis alas, os fios temáticos, cada tranca, cada
código, o mezanino, o cofre e o final. Ele continua de onde `docs/PLANO-DO-ZERO.md` parou —
aquele desenhou a arquitetura e a Ala 1; este desenha as cinco alas restantes e o arco.

Escrito em 2026-08-09. Ele foi produzido por cinco projetistas trabalhando em paralelo sobre
`docs/PESQUISA-CONTEUDO.md`, seguidos de dez verificadores adversariais cuja única tarefa era
**refutar** cada código proposto. Os verificadores refutaram **os dez**. A seção 4 explica por
quê, porque essa é a descoberta mais importante aqui e ela muda a mecânica central do jogo.

Leia antes: `docs/HANDOFF.md` (estado do código), `docs/PLANO-DO-ZERO.md` (§2, §4 e §6.3 são a
base), `docs/PESQUISA-CONTEUDO.md` (a pesquisa — e **a seção de correções de cada era vence a
tabela de marcos acima dela**).

---

## 1. O que está construído e o que está desenhado

| | Construído | Desenhado, não construído |
|---|---|---|
| Salas | átrio, Holyoke, escritório | Paris, Tóquio, Ferro e Areia, A Reescrita, Global, mezanino, cofre |
| Trancas | 1 (`office-drawer`, código 1896) | 6 de conhecimento, 5 rituais, 4 distintivos, 3 medalhas, 3 ferramentas |
| Progressão | energia por sala | fios, distintivos, medalhas, cofre, final |

`BadgeId`, `MedallionId`, `ToolId` e `ThreadId` já existem em `src/content/schema.ts` e **nenhum
deles está ligado a conteúdo**. `UnlockEffect` tem quatro variantes e nenhuma é usada. Esse é o vão
que este documento fecha.

---

## 2. A espinha da progressão

Três sistemas independentes se cruzam. Nenhum deles tranca uma galeria — todas as seis abrem desde
o primeiro segundo. O que eles trancam é o **arquivo**.

### 2.1 Quatro distintivos de disciplina — o primitivo do RE

`indoor` · `beach` · `sitting` · `snow`

São as chaves nomeadas do Tier 1, e existem por um motivo específico: **ver o primeiro te informa
que existem mais três**. É o momento "achei a Chave de Espadas, então há Copas, Ouros e Paus".

O que faz deles a espiral: um distintivo **não abre nada na sala onde foi encontrado**. Ele abre a
gaveta correspondente do **armário do registrador**, no escritório do curador — quatro gavetas
rotuladas pelas quatro disciplinas — e, ao mesmo tempo, destrava material espalhado por outras
alas. Achar o distintivo `beach` na Ala 3 acende conteúdo novo nas Alas 4, 5 e 6 de uma vez.

| Distintivo | Onde | Como se ganha | O que abre |
|---|---|---|---|
| `indoor` | Holyoke (Ala 1) | catalogar as duas bolas e a rede de 1897 | gaveta `indoor`; os dossiês de regras nas Alas 2 e 5 |
| `beach` | Tóquio (Ala 3) | achar a tampa de garrafa na areia da quadra californiana | gaveta `beach`; os arquivos de praia nas Alas 4, 5 e 6 |
| `sitting` | Global (Ala 6) | catalogar a quadra rebaixada de vôlei sentado | gaveta `sitting`; o fio paralímpico retroativo nas Alas 4 e 5 |
| `snow` | **mezanino** | está na vitrine que só existe lá em cima | gaveta `snow` — e é a única coisa que a explica |

O `snow` no mezanino é deliberado. O jogo promete quatro disciplinas na primeira vez que você vê
um distintivo, entrega três no térreo e deixa a quarta como a razão de subir. Vôlei de neve é
genuinamente o menos conhecido dos quatro, então a estrutura ensina a mesma coisa que o conteúdo.

### 2.2 Três medalhas — o portão do segundo ato

`founding` · `olympic` · `global`

Encaixam no plinto do átrio, que **já está construído e visível do spawn**, com três soquetes de
bronze vazios. Abrem o Cofre do Fundador.

O mapeamento é semântico, não arbitrário:

| Medalha | Ala | Ganha ao |
|---|---|---|
| `founding` | 2 — Paris | abrir a caixa-despacho do congresso (código `14`) |
| `olympic` | 3 — Tóquio | abrir a gaveta do troféu (código `1962`) |
| `global` | 6 — Global | fechar o ritual das seis bolas |

Três alas ficam sem medalha de propósito: Holyoke é o tutorial, Ferro e Areia dá a ferramenta, e
A Reescrita dá o pagamento do fio da bola. Se toda ala desse uma medalha, a medalha viraria um
carimbo de presença.

### 2.3 Cinco fios temáticos — o que dobra o mapa

`ball` · `net` · `rules` · `beach` · `sitting`

Um fio é uma sequência de objetos catalogados que **atravessa eras**. Fechar um exige cruzar o
prédio. Já existem em `ThreadId` e as peças de Holyoke já declaram `threads`.

**Fio `ball` — seis nós, um por ala, e é a coluna do jogo:**

| Ala | Objeto | O que ensina |
|---|---|---|
| 1 Holyoke | câmara de borracha nua | mole demais |
| 2 Paris | 18 gomos com cadarço | costura afundada, cadarço saliente — por isso ardia |
| 3 Tóquio | Mikasa de couro de 1964 | o couro absorve água e areia |
| 4 Ferro e Areia | branca de competição | indoor e praia ainda usam a mesma bola |
| 5 A Reescrita | tricolor de 1998 | a maior ruptura visual da história do esporte |
| 6 Global | oito gomos com covinhas | a superfície vira aerodinâmica |

Os outros quatro fios são mais curtos (3–4 nós) e existem para que nenhum jogador feche tudo numa
sala só. **Fechar dois fios abre o mezanino.** Fechar os cinco marca o catálogo como completo e
libera o último painel da parede de créditos.

### 2.4 Três ferramentas

`crate-dolly` (Ala 4, abre o atalho da doca de carga) · `service-key` (escritório, consumida numa
gaveta) · `step-ladder` (mezanino). `breaker-handle` já é coberto pelo sistema de energia
implementado — não duplique.

---

## 3. Os sete códigos

Um por ala mais um segundo em Ferro e Areia. Todos numéricos, todos distintos, nenhum
super-exposto, cada um certificado pela seção de correções da pesquisa.

| # | Ala | Código | O que é | Onde se lê | Estado da fonte |
|---|---|---|---|---|---|
| 1 | Holyoke | `1896` | ano em que o jogo foi rebatizado de Mintonette para volley ball | retrato de Morgan | **já no jogo** |
| 2 | Paris | `14` | federações fundadoras da FIVB | contar os marcadores de mesa do congresso | Wikipédia italiana + biografia de Libaud no IVHF, independência **certificada nominalmente** na pesquisa (L379-381) |
| 3 | Tóquio | `1962` | Japão vence o Mundial feminino em solo soviético | vitrine do kit CCCP | marco [high] L474, confirmado literalmente nas correções L517 |
| 4 | Ferro e Areia | `15` | camisa de Karch Kiraly | **virando a camisa** | L608 + correções L732 |
| 5 | Ferro e Areia | `1973` | Hubert Wagner assume a Polônia | dossiê do técnico | correções L710-711 **corrigem a tabela**, que diz 1974 |
| 6 | A Reescrita | `1998` | ano em que a bola branca foi aposentada | as duas bolas lado a lado | FIVB + Mikasa (fabricante), independentes; correções L862 |
| 7 | Global | `2002` | quadra de praia reduzida para 8 × 16 m | baú de equipamento na areia | correções L862 e L1085 resolvem "testada 2001, adotada 2002" |

**Três desses códigos são bons por motivos diferentes, e vale entender qual é qual.**

`14` é o melhor do conjunto porque não se digita: **conta-se**. Há catorze marcadores de mesa
dobrados na mesa do congresso. O jogador que percebe isso não decorou uma data, leu uma sala.

`15` é o único que exige o verbo central do jogo. O número está atrás da camisa. Sem virar o
objeto não existe.

`1973` é o único que só se acerta lendo o museu **em vez de** lembrar do que se sabe: quase toda
cronologia secundária diz 1974, e a seção de correções é explícita — Wagner assumiu em 1973. Um
jogador que "já sabe" erra. Isso é exatamente o que uma tranca de conhecimento deveria fazer.

---

## 4. O problema das trancas de conhecimento — leia antes de implementar qualquer uma

**Dez códigos foram propostos por cinco projetistas. Dez foram refutados.** Nenhum deles por
inventar história. O padrão é consistente e é um defeito da mecânica como especificada, não dos
projetistas.

### 4.1 As três armadilhas

**(a) O fato famoso está impresso em toda parte.** A regra do projeto diz que todo código tem
**exatamente uma** fonte descobrível dentro do museu. Mas os números memoráveis — 1964 da estreia
olímpica, 2,43 m da altura da rede — aparecem naturalmente em cinco alas. A altura da rede está
descrita nos objetos de rede de cinco eras diferentes na própria pesquisa (L217, 409, 596, 799,
945). Não existe posicionamento que satisfaça a regra. **Quanto melhor o fato, pior o código.**

**(b) O fato obscuro tem um publicador só.** Os números que ninguém sabe quase sempre remontam a
um único corpus — normalmente a Wikipédia — e a regra exige dois independentes. Duas páginas da
FIVB são um publicador. Uma federação e um site que a copia são um publicador.

**(c) Alguns fatos famosos são simplesmente contestados.** O caso mais perigoso encontrado: **o
líbero**. A pesquisa registra (L862) que *as próprias páginas da FIVB dizem 1996 enquanto a
Wikipédia diz 1998*. Um jogador que leia a fonte "errada" trava. **1996 e 1998 para o líbero
nunca podem ser código.** Note que `1998` aparece na tabela acima — mas para a **bola tricolor**,
que não tem conflito nenhum.

### 4.2 As quatro regras que resolvem

1. **Orçamento de exclusividade de numerais.** Um número usado como código pode aparecer como
   algarismo em **exatamente uma** chave de i18n em todo o museu. As outras menções descrevem em
   prosa sem o numeral ("inalterada desde a unificação de 1947" em vez de "2,43 m"). Isto precisa
   de um lint sobre o bundle de i18n, porque o validador de conteúdo não enxerga texto de etiqueta
   e alguém vai violar isso em seis meses.

2. **Prefira contar a digitar.** `14` marcadores de mesa, seis bolas em ordem, três redes casadas
   com suas eras. Um código que se obtém observando a sala é imune às três armadilhas de uma vez,
   porque não depende de um numeral impresso em lugar nenhum.

3. **Nenhum fato que envelhece.** Um verificador propôs `185` (membros do Hall da Fama) com duas
   fontes independentes legítimas — e o rejeitou sozinho: a 40ª turma é empossada em 17 de outubro
   de 2026 e o número fica errado dez semanas depois. Um código de museu precisa estar certo para
   sempre.

4. **URLs são capturadas, não escritas.** Todos os agentes se recusaram a inventar URLs de fonte, e
   estavam certos. `usedAsCode: true` só depois de a página ser realmente aberta e `accessedAt`
   carimbado. A pesquisa nomeia "a página 'The Game' da FIVB" sem registrar a URL, e os PDFs do
   regulamento não abriram (L1074).

### 4.3 A consequência de desenho

**Seis trancas de conhecimento no jogo inteiro, não uma por sala.** O resto vira ritual (Tier 5),
que não tem nenhum desses problemas porque não depende de um número verificável — depende de
ordenar, casar ou girar. Cinco rituais estão especificados abaixo.

Isto é uma redução em relação ao `PLANO-DO-ZERO.md`, e é a coisa certa a fazer. Uma tranca de
conhecimento com fonte frágil é um soft-lock que a CI não enxerga.

---

## 5. Ala 2 — Paris, 1930–1949

**Apelido:** *a sala da mesa verde*. Segunda opção com a mesma força: *a das catorze cadeiras*.

**Premissa.** O voleibol deixa de ser recreação da YMCA e vira esporte governado. A URSS o
transforma em prática de massa — primeiro campeonato nacional em 4 de abril de 1933, em
Dnepropetrovsk. A guerra para o calendário por quatro anos. Em Paris, de 18 a 20 de abril de 1947,
catorze federações fundam a FIVB, e pela primeira vez existe um regulamento só para o mundo.

**Heróis.**

| Peça | Mount | O que está atrás (o exame) |
|---|---|---|
| `table-congress-1947` — a mesa do congresso, 4,6 m, baeta verde, catorze marcadores dobrados em francês | floor | A mesa não se gira. O objeto examinável é a **pasta de estatutos** sobre ela: ordem do dia com `CONGRÈS CONSTITUTIF — PARIS, 18–20 AVRIL 1947`, catorze assinaturas em tinta ferrogálica, e colada na contracapa a ficha do próprio museu: *"FAC-SÍMILE. Nenhum exemplar dos estatutos de 1947 foi localizado. Texto reconstituído."* |
| `ball-laced-1935` — 18 gomos com cadarço | vitrine-table | Carimbo oval `OFFICIAL VOLLEY BALL / SPALDING`, meia folha dourada já saída. E o que ensina: as costuras são **sulcos afundados**, não vergões — os gomos foram costurados do avesso e a bola virada depois. O cadarço fica saliente. É literalmente o que ardia no antebraço. |
| `net-tarred-1940s` — corda alcatroada, faixa de lona, mastros escorados | floor | O achado é **negativo** e o texto precisa dizer em voz alta: não há bainha, presilha ou bolso onde uma antena pudesse ser presa. Não é que a rede não tenha antena — é que ainda não havia onde pôr uma. |
| `rulebooks-1947` — guia da USVBA e caderno da FIVB, lado a lado | plinth | Um cotado em pés e polegadas, outro em metros. Dois versos, duas unidades, mesma quadra. Explica a unificação sem uma palavra de legenda. |

**Trancas.**

- **`paris-statutes-box`** · conhecimento · código **`14`** · abre a caixa-despacho de couro sobre
  a baeta. Dentro: o fac-símile dos estatutos, o memorando de Praga do fim de agosto de 1946 (o
  primeiro documento oficial da futura FIVB), a nota de eleição de Paul Libaud e a ficha que admite
  que o endereço em Paris é desconhecido. **Concede a medalha `founding`.**
  Diegese: uma roda de contagem de latão embutida na borda da mesa, do tipo que um secretário de
  congresso usaria para registrar presença. Não é teclado.
- **`paris-seating-plan`** · ritual · `order-delegations` · a gaveta do plano de mesa. O jogador
  ordena as catorze delegações; "resolvido" é a ordem impressa na ata. Sem número.
- **`paris-sand-case`** · distintivo · a vitrine da areia na cotovelada de entrada. Começa o fio
  `beach` mas **não dá o distintivo** — ele fica na Ala 3. Aqui só planta a existência dele.

**Etiquetas** (8, ~40 palavras cada — as duas mais importantes):

> **Paris, 18 a 20 de abril de 1947** — Catorze federações da Europa, da África e das Américas se
> reuniram por três dias e fundaram a Federação Internacional de Voleibol. A própria FIVB data sua
> fundação em 20 de abril de 1947. Nenhuma fonte que alcançamos nomeia o endereço da reunião.

> **1941–1944: o calendário para** — O campeonato soviético não foi disputado por quatro anos — e
> também não houve edição em 1937. Em 27 de dezembro de 1942, em Lockport, Nova York, morre
> William G. Morgan, aos 72 anos. Muitas cronologias repetem "1940, aos 68". Está errado.

**Fios:** `ball` (nó 2), `net` (nó 2), `rules` (nó 2), planta `beach`.

**Fraqueza declarada:** as medalhas de Roma 1948 e Praga 1949 são reconstrução não documentada.
A etiqueta precisa dizer isso. Nenhuma peça original foi localizada.

---

## 6. Ala 3 — Tóquio, 1950–1969

**Apelido:** *a sala que tem praia dentro*.

**Premissa.** Em vinte anos o voleibol sai de campeonato do bloco oriental para modalidade
olímpica, e o primeiro ouro feminino em esporte coletivo da história olímpica é de um time japonês
formado por dez operárias de fiação que treinavam do fim do turno até por volta das duas da manhã.
Ao mesmo tempo, na Califórnia, um jogo de dois contra dois na areia vira esporte.

**Heróis:** `ball-mikasa-1964` (vitrine-tower) · `medal-tokyo-1964` na caixa de laca preta
(vitrine-table) · `uniform-nk-1964` da Nichibo Kaizuka (plinth) · `beach-court-1960` (floor).

O melhor detalhe de desenho desta ala: a Mikasa de 1964 na torre tem uma **gêmea encharcada de
areia** como hotspot na quadra de praia, cinco metros ao sul, alinhada no mesmo eixo x para que
cada etiqueta argumente com a outra. Mesmo objeto, duas vidas — o couro que absorveu água e areia,
escureceu nos sulcos e ficou mais pesado.

**Trancas.**

- **`tokyo-trophy-punch`** · conhecimento · código **`1962`** · abre a gaveta sob o punção de data.
  **Concede a medalha `olympic`.**
  O fato: o Japão vence o Mundial feminino **na União Soviética**, 13–25 de outubro de 1962, em
  quatro cidades, com 14 nações, interrompendo três títulos soviéticos seguidos. Lê-se na vitrine
  do kit CCCP — o que dá àquele uniforme uma razão de existir além de figurino.
  Por que 1962 e não 1964: a estreia olímpica está impressa em quatro alas e falha a regra da
  fonte única. E 1962 conta a tese da sala melhor — **o ouro de 1964 não foi milagre, foi o
  segundo ato.**
- **`beach-badge-pepsi-cap`** · distintivo `beach` · uma tampa de garrafa enterrada na areia da
  quadra californiana. Não abre nada nesta ala, de propósito: abre a gaveta `beach` do armário do
  registrador, no escritório, e o material de praia nas Alas 4, 5 e 6.
- **`kaizuka-motion-rail`** · ritual · revela os dois documentos da Kaizuka direto via
  `reveal-document`, sem inventar um trinco.

**Fraqueza declarada:** a pesquisa (L553-555) demole a maior parte da especificação "de 1964" da
rede como extrapolação do regulamento moderno. Só a quadra de 18 × 9 m, as alturas de rede e o
formato melhor-de-cinco-até-15 com side-out podem ser afirmados como corretos para a época sem
ressalva.

---

## 7. Ala 4 — Ferro e Areia, 1970–1989

**Apelido:** *a sala com uma praia no fundo* — os jogadores vão encurtar para *a da areia*.

**Estrutura incomum, e é o ponto:** uma `RoomData`, **dois climas de iluminação**. Ginásio de
bloco oriental de um lado, pátio de areia iluminado como dia do outro. A ala inteira é sobre a
divergência entre as duas modalidades, e a sala executa isso em luz.

**Heróis:** `antenna-1976` (vitrine-tower) · `jersey-skorek`, camisa de capitão de Montreal 76
(floor) · `ball-fivb-white` (vitrine-table, **na areia**, não no ginásio) · `plaque-manhattan`
(floor).

Pôr a bola branca na areia e não no ginásio é uma decisão de curadoria: mostra que indoor e praia
ainda usavam a mesma bola, e que só divergiram depois.

**Trancas.**

- **`ironsand-kiraly-shirt`** · conhecimento · código **`15`** · a camisa de Kiraly.
  O número está **atrás**. É o único código do museu que exige o verbo central — examinar e girar.
  O plano nomeia "digite o número da camisa" como arquétipo de Tier 4, e este é ele.
- **`ironsand-coach-file`** · conhecimento · código **`1973`** · o dossiê do técnico.
  Hubert Wagner assume a Polônia em 1973 e ganha o Mundial de 1974 no segundo ano, depois o ouro
  olímpico de 1976. **A tabela de marcos diz 1974 e está errada** — a correção L710 é explícita.
  Ponha essa observação no comentário do código, senão alguém vai "consertar" para 1974.
  Não imprima "Técnico do Século" nem "Time do Século": L711 marca ambos como sem fonte.
- **`ironsand-freight-shutter`** · ferramenta `crate-dolly` · o atalho de mão única. Uma porta de
  doca de carga com barra, e um carrinho de carga é uma coisa que existe numa doca de 1980.
- **`ironsand-honours-rail`** · ritual · casar três redes com suas eras pelos **encaixes** —
  sem bainha de antena / com bainha / moderna. Sem número, e ensina o que a antena de 1976 mudou.

**Fraqueza declarada:** a altura de rede (2,43 / 2,24) é o número mais bem atestado de toda a
pesquisa e mesmo assim **não pode ser código** — está descrita em cinco alas. Use a manivela como
gesto, não como fechadura.

---

## 8. Ala 5 — A Reescrita, 1990–1999

**Apelido:** *a sala dos dois placares*. Escolhido de propósito em vez de "a sala da bola
colorida": a Ala 1 já é "a da bola de couro com cadarço", e duas alas apelidadas por bola no mesmo
prédio é uma falha de nomeação.

**Premissa.** O voleibol vira produto de televisão. World League, Grand Prix, praia olímpica em
Atlanta 96 e, em 1998, três regras mudam de uma vez: líbero, bola tricolor e rally point até 25.

**Heróis:** `ball-mikasa-tricolour-1998` e `ball-white-pre-1998` na **mesma torre, com 40 cm entre
elas** — o único ponto do fio da bola onde dois estados consecutivos se veem juntos ·
`shirt-libero-1998` · `scoreboards-1998-pair`, os dois placares que dão nome à sala.

**Trancas.**

- **`rewrite-ball-tower`** · conhecimento · código **`1998`** · o ano em que a bola branca foi
  aposentada. Duas fontes genuinamente independentes: a FIVB (entidade) e a Mikasa (fabricante).
  As correções L862 nomeiam "a bola tricolor de 1998 (a própria redação da FIVB confirma)".
  **Cuidado:** este é o *mesmo ano* do líbero, que é contestado. A etiqueta desta tranca fala
  **só da bola**. O líbero é assunto de outra etiqueta e nunca de um código.
- **`rewrite-congress-case`** · ritual · `three-changes-1998` · a Congress Case ao pé da mesa do
  árbitro. O jogador demonstra entendimento em vez de recordar número: associar cada uma das três
  mudanças de 1998 ao problema de transmissão que ela resolveu. Um jogo sem duração previsível não
  cabe numa grade de TV — rally point resolve isso. Este é o melhor ritual do museu porque a
  resposta *é* a tese da ala.
- **`rewrite-beach-press-file`** · consome o distintivo `beach` ganho na Ala 3. É aqui que o
  jogador sente a espiral: um objeto achado duas salas atrás abre uma gaveta que ele já tinha
  visto fechada.

**Pagamento do fio:** A Reescrita não dá medalha. Dá o penúltimo nó do fio `ball`, e o desenho
prefere isso — se toda ala desse medalha, medalha viraria carimbo.

---

## 9. Ala 6 — Global, 2000 até hoje

**Apelido:** *a sala da bola com covinhas*.

**Premissa.** Em vinte e cinco anos a bola foi redesenhada duas vezes, o árbitro passou a receber
veredito eletrônico diante do público, e o calendário virou produto de uma empresa. O que mudou não
foi o jogo: foi quem assiste, como é iluminado e quem sobe no pódio.

**Heróis:** `ball-mikasa-mva200-2008` e `ball-mikasa-v200w-current` (vitrine-tower) ·
`challenge-console-2016` (vitrine-table) · `court-sitting-lowered-plane` (floor).

É a única ala que toca **os cinco fios**, o que é apropriado para a última — três terminam aqui.

**Trancas.**

- **`global-beach-trunk`** · conhecimento · código **`2002`** · a quadra de praia reduzida de
  9 × 18 m para 8 × 16 m, testada em 2001 e adotada oficialmente em 2002. As correções resolvem a
  ambiguidade em duas passagens independentes (L862 e L1085).
- **`global-ball-casts`** · ritual · `order-ball-lineage` · **o pagamento do fio `ball`** e o que
  **concede a medalha `global`**. Seis moldes das seis bolas, ordenar.
  **Regra crítica:** ordene por **sala**, não por data. As etiquetas dos carretéis não levam
  nenhum algarismo. A sequência relativa é documentada; várias das datas não são. Isso evita
  imprimir na superfície do quebra-cabeça exatamente os fatos que a pesquisa se recusa a
  certificar.
- **`global-sitting-court`** · distintivo `sitting` · catalogar a quadra rebaixada.

**Sobre envelhecer.** Esta é a única ala que fica errada sozinha. Duas defesas:

1. Nada de contagens correntes. Sem "N títulos", sem "N membros do Hall da Fama". Um verificador
   rejeitou `185` exatamente por isso.
2. Resultados recentes vivem numa lista de dados datada, não em geometria. Atualizar o pódio de
   2028 deve ser editar um array, nunca reconstruir uma sala.

**Sobre o Brasil.** O dono é brasileiro e esta é a era do domínio brasileiro. O risco editorial
existe nas duas direções: um museu que exalta é propaganda, um museu que desvia é desonesto. A
posição: **o Brasil aparece como um dos cinco no pódio contemporâneo, com Itália, França, Polônia
e Türkiye, e a era Bernardinho recebe uma etiqueta pelo que ela mudou tecnicamente** — não pelo
número de medalhas. O banco do Bernardinho é objeto de acervo; a narrativa de "melhor do mundo"
não é.

---

## 10. O mezanino

Abre ao fechar **dois fios quaisquer**. É a re-travessia dos 60% do RE, feita por **mudança de
perspectiva** em vez de por ameaça: você olha o térreo inteiro de cima e vê a planta que estava
andando sem enxergar.

O que existe lá e em lugar nenhum mais:

- A vitrine do **vôlei de neve** e o distintivo `snow` — a quarta disciplina, que o jogo prometeu
  na primeira vez que você viu um distintivo e nunca explicou.
- A **parede de créditos** completa (TASL de cada imagem), que já existe como aba no diário mas
  merece existir como lugar.
- A vista do plinto das medalhas de cima, que mostra quantos soquetes ainda estão vazios sem
  precisar de HUD.

---

## 11. O Cofre do Fundador e o final

Três medalhas no plinto. O cofre fica **no subsolo, com acesso pelo átrio**.

**A sequência, em ordem, e cada beat custa quase nada:**

1. A terceira medalha assenta. O plinto gira.
2. **As luzes gerais do átrio acendem pela primeira vez.** O átrio tem pé-direito duplo e 8,4 m; a
   lanterna nunca alcançou o teto. O jogador jogou o jogo inteiro sem saber o tamanho da sala em
   que estava. Isso custa uma variável booleana e é o maior momento do jogo.
3. A escada desce.
4. Dentro: o **livro de tombo do antecessor** e a segunda carta dele.

**O que o livro de tombo faz** — e esta é a proposta que precisa do seu aval, porque é a decisão
narrativa do jogo:

Ele lista cada objeto do museu com o estado de proveniência: **original**, **reconstrução de
época** ou **fac-símile**. Ao ler, todas as fichas de catálogo que você coletou são reetiquetadas.
Você descobre quantas peças do museu que acabou de percorrer não são o objeto original — e que o
museu **sempre soube**, e registrou.

Isso não é uma reviravolta de "o museu é falso". É o oposto: é o museu se declarando. Duas coisas
o justificam. Primeira, é verdade — a pesquisa é explícita sobre quantas peças de 1895–1949 não
têm exemplar localizado, e o projetista da Ala 2 chegou nisso sozinho, escrevendo *"FAC-SÍMILE.
Texto reconstituído"* no verso da pasta do congresso antes de eu pedir. Segunda, é o que museus de
verdade fazem, e é a única forma honesta de terminar um jogo construído sobre um acervo que em boa
parte não existe mais.

A carta do antecessor pede uma coisa ao novo curador: **continue declarando.**

5. O ato final é **assinar o livro de visitas** como curador. É o mesmo objeto que serve de save.
6. **O cofre reabre no átrio.** Não há créditos rolando. O jogo volta para o hub e você pode
   continuar catalogando. O "colapso linear de fim de jogo" é a crítica mais consistente que a
   série inteira recebe e não vale a pena herdá-la.

---

## 12. Ordem de construção

Cada fase tem um portão. Se o portão não passar, o problema é de arquitetura e se conserta ali,
não duas fases depois.

**Fase A — Ala 2 (Paris).** *Portão: acrescentar uma ala foi editar `museum.ts` e rodar
`npm run bake`, sem escrever React.* Se precisar de componente novo, generalize o runtime primeiro.
Entra a primeira medalha e a primeira tranca de conhecimento pós-Holyoke.

**Fase B — Ala 3 (Tóquio) + o primeiro distintivo.** *Portão: o distintivo `beach` ganho na Ala 3
abre visivelmente conteúdo em outra ala.* É a primeira vez que a espiral existe de fato. Entra
também o streaming de salas a sério — no máximo três residentes.

**Fase C — Alas 4, 5, 6.** Escala. A Ala 4 é a mais cara (dois climas de luz numa sala). A Ala 6 é
a que precisa da estrutura de dados datada.

**Fase D — Fios e mezanino.** *Portão: fechar um fio exige mesmo cruzar o prédio.* Se der para
fechar um fio numa sala, o fio está mal distribuído.

**Fase E — Cofre e final.** As luzes gerais, o livro de tombo, a assinatura, o loop de volta.

**Fase F — Polimento.** Acessibilidade, tiers de qualidade por `DetectGPU`, embed, modo leitura
indexável.

---

## 13. O que eu não consegui resolver

Honestidade sobre os buracos, para ninguém descobrir tarde:

1. **Nenhuma URL de fonte foi capturada.** Os sete códigos estão ancorados na pesquisa, não em
   páginas verificadas nesta sessão. `usedAsCode: true` exige abrir as páginas e carimbar
   `accessedAt`. A pesquisa nomeia a página "The Game" da FIVB sem registrar a URL.

2. **O lint de exclusividade de numerais não existe.** É a única coisa que impede a regra de fonte
   única de ser violada por uma etiqueta escrita daqui a seis meses. Deveria rodar no `npm run
   check`.

3. **Os verificadores discordam entre si** sobre a altura da rede: um propôs `243` para a Ala 6,
   outro refutou `243` na Ala 4 pelo mesmo motivo. Resolvi tirando a altura de rede do conjunto de
   códigos por completo. Se alguém quiser reintroduzi-la, precisa primeiro resolver a
   super-exposição em cinco alas.

4. **O ritual `three-changes-1998` não tem forma de interação especificada.** Sei o que ele ensina
   e não sei ainda o que a mão do jogador faz. É o item de desenho mais aberto do documento.

5. **Vôlei de neve tem a pesquisa mais fina** de todas as quatro disciplinas. O distintivo `snow`
   está desenhado como recompensa estrutural; o conteúdo dele ainda não está pesquisado no mesmo
   padrão do resto.

6. **A carga total de leitura não foi somada.** Seis alas × 8 etiquetas × ~40 palavras é o
   orçamento; o texto real das Alas 2–6 ainda não foi escrito por inteiro, então o alvo de
   20 minutos de percurso crítico continua sendo estimativa.
