# 07 — Fatos: verificação dos sete códigos, do texto do átrio e da Holyoke, e banco de curiosidades

Data de acesso de todas as fontes: **2026-10-03**. Repositório lido, nada escrito nele.

**Como ler este relatório**

- "Aberta" = a página foi realmente carregada nesta sessão (WebFetch ou leitura do wikitexto cru). Resultado de busca sem abrir a página **não** conta e está marcado como "só busca".
- **Citações literais foram trocadas por paráfrase fiel + localizador** (seção ou campo da página). A regra de direitos autorais desta sessão permite uma única citação curta; ela está em §2.2 (palavras do próprio Morgan). Para carimbar `usedAsCode: true`, quem implementar reabre a URL e copia a frase — o localizador diz onde ela está.
- Os trechos entre « » são texto do próprio jogo (`src/content/i18n/pt-BR.ts`), em fragmentos curtos.
- "Publicador independente" segue a regra do `PLANO-COMPLETO.md` §4.1(b): duas páginas da FIVB são um publicador; Wikipédias de idiomas diferentes contam como uma família; um site que copia outro não conta.

---

## 0. Resumo executivo

| # | Código | Fato está certo? | Veredito como código | Motivo em uma linha |
|---|---|---|---|---|
| 1 | `1896` | sim (ano) | **seguro** | FIVB + IVHF + Wikipédia concordam no ano; a *ocasião* (visita ou demonstração, início do ano ou 7 de julho) é contestada — a placa não deve amarrar o ano à demonstração de julho |
| 2 | `14` | sim | **seguro** (conta-se) | IVHF (biografia do Libaud) + Wikipédia EN/IT/FR/PT; a Wikipédia polonesa diz 16; "cinco continentes" é falso contra a própria lista |
| 3 | `1962` | sim | **seguro** | Wikipédia EN + RU e IVHF (Daimatsu); número obscuro, sem conflito |
| 4 | `15` | provavelmente | **inseguro hoje** | um só publicador aberto (infobox da Wikipédia, sem nota); os sites que repetem são derivados e um deles erra ao lado; falta uma fonte primária (foto ou relatório oficial) |
| 5 | `1973` | sim | **seguro, mas contestado fora do museu** | PAP/dzieje.pl + Wikipédia PL (biografia, maio de 1973); a biografia do IVHF leva a 1974 por conta de aritmética |
| 6 | `1998` | sim | **contestado como código** (fato sólido) | três publicadores independentes confirmam a bola; mas o numeral é o mais exposto do jogo: **já está impresso no átrio** e é o ano do rally point e (numa das páginas da FIVB) do líbero |
| 7 | `2002` | meio | **contestado** | "testada em 2001, confirmada em 2002": artigo científico e imprensa de 2001 dizem 2001; a cronologia da FIVB põe a confirmação em 2002 |

Achados que mudam o roteiro, não só o texto:

1. **O código da Ala 5 (`1998`) já é entregue no átrio**, na etiqueta e na ficha da bola tricolor (`pt-BR.ts:290` e `:292`). O jogador lê o ano e o significado dele antes de ter energia na Ala 1.
2. **A fonte nº 2 do único código em uso está morta**: `museum.ts:61` aponta para `volleyhall.org/page/show/3821594-history-of-volleyball`, que hoje responde 404. A página viva é `https://www.volleyhall.org/history-of-volleyball.html`.
3. **Duas entradas de `FACTS` citam uma página que não sustenta o fato**: a Wikipédia "Volleyball" não contém hoje nem "1897" nem "1918" (`museum.ts:77` e `:109`). A FIVB sustenta os dois.
4. Na Holyoke há **6 erros** (um deles provável), **11 afirmações duvidosas** e **4 defeitos de dado** (rótulos reaproveitados de outra peça e um fato revelado pelo hotspot errado) — tabela em §2.2.
5. O texto do antecessor diz que o museu «existe há cento e trinta anos» (`pt-BR.ts:102`): envelhece em 2027 e contradiz o próprio plano (§9 "nada que envelhece").

---

## 1. Os sete códigos (`docs/PLANO-COMPLETO.md:114-122`)

### 1.1 `1896` — Mintonette vira Volley Ball (em uso: `museum.ts:46-66`, tranca `office-drawer` em `museum.ts:132-147`)

**Fontes abertas**

| # | URL aberta | Publicador | O que a página afirma (paráfrase) e onde |
|---|---|---|---|
| a | https://www.fivb.com/volleyball/the-game/history/ | FIVB | Seção sobre Morgan: no início de 1896 houve uma conferência dos diretores de educação física da YMCA em Springfield; Morgan levou dois times de cinco; depois da demonstração o professor Alfred T. Halstead propôs trocar "Mintonette" por "Volley Ball", aceito por Morgan e pela conferência. |
| b | https://www.volleyhall.org/history-of-volleyball.html | International Volleyball Hall of Fame (IVHF) | Bloco "Invention of the Game": no início de 1896 Morgan **visitou** Halstead, que sugeriu o nome em duas palavras; a conferência de Springfield é datada de 7 de julho de 1896, com recorte do *Holyoke Daily Transcript* do mesmo dia. |
| c | https://www.volleyhall.org/william-morgan-father-of-volleyball.html | IVHF | Versão igual à da FIVB: conferência "no início de 1896", sugestão de Halstead depois da demonstração. |
| d | https://en.wikipedia.org/wiki/Volleyball (wikitexto) | Wikipédia | Seção de história: Halstead notou o caráter de voleio na primeira partida de exibição, em 1896, na escola de Springfield. |
| e | https://en.wikipedia.org/wiki/William_G._Morgan (wikitexto) | Wikipédia | Confuso: põe a apresentação "em dezembro de 1895" (citando o IVHF) e, em seguida, a sugestão de "Halsted"; noutra linha, primeiro jogo em 7 de julho de 1896. Grafa "Alfred S. Halstead" e "Alfred T. Halsted". |
| f | https://www.volleyhall.org/page/show/3821594-history-of-volleyball | — | **HTTP 404.** É a URL gravada em `museum.ts:61`. |

**Independência.** FIVB e IVHF são dois publicadores de verdade. O texto (c) do IVHF é quase o mesmo da FIVB (origem comum), mas a página (b) é pesquisa própria do IVHF com recorte de jornal. A Wikipédia é o terceiro.

**Conflitos de numeral e de grafia**

- Ano: nenhum conflito sério. Só a Wikipédia do Morgan (e) embaralha 1895 com 1896.
- Ocasião: visita no início de 1896 (b) × depois da demonstração na conferência (a, c, d). Data da conferência: "início de 1896" (a, c) × 7 de julho de 1896 (b, com recorte). A pesquisa já avisava (`PESQUISA-CONTEUDO.md:142-144`).
- Nome: Halstead (FIVB, IVHF) × Halsted (Wikipédia do Morgan); "Alfred T." × "Alfred S.".
- Exclusividade (`PLANO-COMPLETO.md:164-168`): `1896` aparece como algarismo em **cinco** valores de i18n — `pt-BR.ts:335`, `:357`, `:359`, `:365`, `:374`. Para a tranca-tutorial isso ajuda, mas a regra do plano precisa de uma exceção explícita ou o lint futuro reprova a Ala 1.

**Veredito: seguro como código.** Recomendações:

- Trocar a fonte morta: `{ title: 'The REAL History of Volleyball', url: 'https://www.volleyhall.org/history-of-volleyball.html', publisher: 'International Volleyball Hall of Fame', accessedAt: '2026-10-03' }` e acrescentar `{ title: 'History', url: 'https://www.fivb.com/volleyball/the-game/history/', publisher: 'FIVB', accessedAt: '2026-10-03' }`.
- A plaqueta (`pt-BR.ts:358-359`) deve afirmar só o que as três fontes afirmam: "em 1896, em Springfield, o Mintonette passou a se chamar Volley Ball". A palavra «demonstração» amarra o ano a uma versão contestada.

### 1.2 `14` — federações fundadoras da FIVB (Ala 2, conta-se nos marcadores de mesa)

| # | URL aberta | Publicador | O que afirma |
|---|---|---|---|
| a | https://www.volleyhall.org/paul-libaud.html | IVHF | Biografia: o congresso de Paris, em 1947, teve as federações de Bélgica, Brasil, Tchecoslováquia, Egito, França, Países Baixos, Hungria, Itália, Polônia, Portugal, Romênia, Uruguai, Estados Unidos e Iugoslávia; mais adiante fala nos catorze membros originais; Libaud presidiu por 37 anos, até 1984; o primeiro encontro com poloneses e tchecos foi no Graf Coffee House, em Praga. |
| b | https://en.wikipedia.org/wiki/F%C3%A9d%C3%A9ration_Internationale_de_Volleyball (wikitexto) | Wikipédia EN | Catorze federações, que a página diz virem de cinco continentes, reunidas de 18 a 20 de abril; infobox dá 20 de abril de 1947, Paris. |
| c | https://it.wikipedia.org/wiki/F%C3%A9d%C3%A9ration_Internationale_de_Volleyball (wikitexto) | Wikipédia IT | Mesma lista de catorze; série de membros: 14 em 1947, 45 em 1955, 89 em 1964. |
| d | https://pt.wikipedia.org/wiki/Federa%C3%A7%C3%A3o_Internacional_de_Voleibol (wikitexto) | Wikipédia PT | Mesma lista de 14 países. |
| e | https://fr.wikipedia.org/wiki/F%C3%A9d%C3%A9ration_internationale_de_volley-ball (wikitexto) | Wikipédia FR | 14 nações na criação; data 20 de abril de 1947. |
| f | https://pl.wikipedia.org/wiki/Mi%C4%99dzynarodowa_Federacja_Pi%C5%82ki_Siatkowej (wikitexto) | Wikipédia PL | **Diz 16 federações fundadoras.** |
| g | https://www.fivb.com/inside-fivb/fivb/about/ | FIVB | Só informa o ano de fundação, 1947; **o site atual da FIVB não informa o número** (nem Paris, nem os nomes). |

**Conflitos.** 14 × 16 (só a Wikipédia polonesa). "Cinco continentes" (b, c) não bate com a lista: Europa, África e Américas (`PESQUISA-CONTEUDO.md:334-336`). 18–20 de abril × 20 de abril: escolher uma forma.

**Colisão de numeral dentro do próprio plano:** o texto da tranca de Tóquio imprime «com 14 nações» (`PLANO-COMPLETO.md:264-265`). O Mundial feminino de 1962 teve mesmo 14 seleções (Wikipédia EN e RU, §1.3) e o masculino de 1960, no Brasil, também. Se esse número for para uma etiqueta, quebra a exclusividade do `14`. Escrever por extenso ou cortar.

**Veredito: seguro.** É o melhor código do conjunto, como o plano diz: não se digita, conta-se. Dois publicadores independentes (IVHF + família Wikipédia). Deixar uma ficha de arquivo dizendo que circula uma lista de dezesseis e que o museu segue a de catorze.

### 1.3 `1962` — o Japão vence o Mundial feminino na União Soviética (Ala 3)

| # | URL aberta | Publicador | O que afirma |
|---|---|---|---|
| a | https://en.wikipedia.org/wiki/1962_FIVB_Women%27s_Volleyball_World_Championship (wikitexto) | Wikipédia EN | Infobox: sede União Soviética, 13–25 de outubro, 14 seleções, 4 cidades, campeão Japão. O texto explica que a edição de 1964 foi antecipada para 1962 porque o vôlei entrou nos Jogos. |
| b | https://ru.wikipedia.org/ (artigo "Чемпионат мира по волейболу среди женщин 1962", wikitexto) | Wikipédia RU | Moscou, Kiev, Leningrado e Riga; 14 seleções; Japão campeão pela primeira vez, URSS em segundo, Polônia em terceiro; Índia e Turquia desistiram. |
| c | https://www.volleyhall.org/hirofumi-daimatsu.html | IVHF | Daimatsu levou o Japão à prata no Mundial de 1960 e ao ouro em 1962; 175 vitórias seguidas; assumiu o time da Nichibo Kaizuka em 1953. |
| d | https://en.wikipedia.org/wiki/Oriental_Witches (wikitexto) | Wikipédia EN | Em 1962 a seleção era o time da Nichibo, com exceção de duas jogadoras; depois do título o time pensava em se aposentar e recebeu cerca de 5.000 cartas pedindo que continuasse. |

Não abriram: `olympics.com/en/news/tokyo-1964-women-volleyball-japan-gold` (timeout) e `apjjf.org/?p=6868` (403). O trecho de busca do olympics.com fala em vitória por 3–1 sobre a URSS em Moscou — **só busca**.

**Conflitos.** Nenhum no ano. O Mundial masculino de 1962 também foi na URSS (não confundir na etiqueta). A CBVA aparece com 1962 na Wikipédia e 1965 no IVHF (`PESQUISA-CONTEUDO.md:504`) — manter esse ano fora de qualquer etiqueta de praia.

**Veredito: seguro.** Ano com dois publicadores (Wikipédia e IVHF); o "em solo soviético" só tem a família Wikipédia aberta hoje — reabrir o olympics.com antes de carimbar.

### 1.4 `15` — a camisa de Karch Kiraly (Ala 4, lê-se virando a camisa)

| # | URL aberta | Publicador | O que afirma |
|---|---|---|---|
| a | https://en.wikipedia.org/wiki/Karch_Kiraly (wikitexto) | Wikipédia EN | Infobox: `teamnumber = 15`, seleção 1981–1989. **Sem nota de rodapé.** |
| b | https://xbotgo.com/blogs/knowledge/top-volleyball-jersey-numbers | blog comercial | Diz que Kiraly usou o 15 na seleção e que a UCLA teria aposentado esse mesmo número em 1993. Sem fontes; derivado. |
| c | https://www.volleyhall.org/karch-kiraly.html | IVHF | Biografia completa; **não menciona número**. |
| d | https://usopm.org/karch-kiraly/ | US Olympic & Paralympic Museum | **Não menciona número.** |
| e | Wikipédia: elencos olímpicos de 1984 e 1988 (wikitexto) | Wikipédia EN | Listam os nomes **sem numeração**. |

Não abriu: `vault.si.com/vault/1986/06/02/a-tiger-on-beach-and-court` (404).

**Conflitos.** O blog (b) atribui o 15 também à UCLA; os resultados de busca falam em 31 na UCLA (não aberto). Ou seja, o único eco fora da Wikipédia tem um erro ao lado do dado. E `15` é o numeral mais comum do vôlei antes de 1999: todo set ia a 15 (a final de 1984 foi 15–6, 15–6, 15–7), o tie-break vai a 15, e o jogo já imprime «de 21 para 15 pontos» em `pt-BR.ts:380`.

**Veredito: inseguro hoje** (um publicador, sem citação). Acho o dado correto — a ordem do elenco de 1984 na pesquisa (`PESQUISA-CONTEUDO.md:663`) é a ordem dos números, com Kiraly por último, e a correção L732 o confirma —, mas "acho" não carimba. Antes de construir:

1. Capturar **uma fonte primária**: fotografia datada de Seul 1988 ou Los Angeles 1984 com o número visível (Getty, LA84 Digital Library, Olympics.com) ou o relatório oficial com a súmula.
2. Como o número fica na geometria e não no i18n, a tranca funciona mesmo com `15` impresso em placares. Ainda assim, a etiqueta da tranca deve dizer "o número às costas", e os placares da sala devem ser de sets que não terminem em 15 para o adversário errado (evitar leitura cruzada).

### 1.5 `1973` — Hubert Wagner assume a Polônia (Ala 4, dossiê do técnico)

| # | URL aberta | Publicador | O que afirma |
|---|---|---|---|
| a | https://dzieje.pl/node/25274 | PAP / dzieje.pl (matéria de 27/10/2014, "40. rocznica triumfu drużyny Wagnera") | O "Kat" assumiu o cargo em 1973, aos 32 anos, sem nenhuma experiência como treinador. |
| b | https://pl.wikipedia.org/wiki/Hubert_Wagner (wikitexto) | Wikipédia PL | Tornou-se técnico da seleção **em maio de 1973**, com nota para a biografia *Kat* (Wagner e Mecner, 2014, p. 64). Em 1973, prata na Copa da Amizade. |
| c | https://en.wikipedia.org/wiki/Hubert_Wagner (wikitexto) | Wikipédia EN | Técnico da Polônia em 1973–1976, 1983–1986 (caixa de sucessão) e 1996–1998; assumiu em 1973, aos 32. |
| d | https://www.volleyhall.org/hubert-wagner.html | IVHF | Jogou pela seleção de 1963 a 1971; a página conta que ele assumiu a seleção três anos depois de parar de jogar e ganhou logo em seguida o Mundial de 1974 (o que, pela conta, dá 1974). Diz também que em 2000 a FIVB o indicou como "Coach of the Century" e o time de 1974–1979 como "Team of the Century". |

**Conflitos.** 1973 (a, b, c) × 1974 implícito (d: 1971 + 3) × tabela de marcos da pesquisa (`PESQUISA-CONTEUDO.md:647`, corrigida em `:709-711`). O IVHF ainda dá 62 anos na morte; pelas datas da própria página (4/3/1941 – 13/3/2002) eram 61. Segundo mandato: 1983–85 (IVHF) × 1983–86 (Wikipédia).

**Atualização à pesquisa:** `PESQUISA-CONTEUDO.md:711` marca "Coach/Team of the Century" como sem fonte. Agora há fonte (IVHF), mas o período "1974–1979" que ela dá não corresponde a nenhum mandato do Wagner. Continuar sem imprimir.

**Veredito: seguro quanto ao fato** (PAP e a biografia citada pela Wikipédia polonesa são independentes), **contestado em inglês**. É o comportamento que o plano quer ("quem já sabe erra"), com duas condições: o dossiê mostra **mês e ano** ("maio de 1973"), e a escada de dicas existe, porque o jogador que conferir no IVHF vai chegar a 1974.

### 1.6 `1998` — a bola branca sai, entra a tricolor (Ala 5)

| # | URL aberta | Publicador | O que afirma |
|---|---|---|---|
| a | https://www.fivb.com/volleyball/the-game/ | FIVB | Seção "The Ball": depois de testar muitas cores, a FIVB introduziu uma bola de gomos amarelos, azuis e brancos no Mundial do Japão, em 1998, no lugar da bola toda branca. |
| b | https://mikasasports.co.jp/e/company/history/ | Mikasa (fabricante) | Entrada de 1998: as bolas coloridas da Mikasa foram adotadas como bola oficial do Campeonato Mundial. Entrada de 1970: contrato com a FIVB. |
| c | https://hiroshimagooddesign.jp/product/1034/ | Prêmio Hiroshima Good Design | "Color Volleyball MVL200", grande prêmio da 5ª edição; descrita como a primeira bola oficial de jogo colorida do mundo; azul e amarelo, cores complementares, para melhorar a leitura de atletas e público. |
| d | https://collection.powerhouse.com.au/object/502721 | Powerhouse Museum | Objeto 2001/84/329. A inscrição transcrita na ficha diz, em resumo: feita de couro, pressão de quadra, bola oficial do Mundial de 1998 e dos Jogos de 2000; painéis branco–amarelo–branco e azul–amarelo–azul. |

Não abriu: a antiga página da FIVB via Web Archive (a ferramenta bloqueia `web.archive.org`).

**Conflitos e exposição do numeral**

- **Líbero, confirmado hoje no próprio site da FIVB:** `https://www.fivb.com/volleyball/the-game/` diz que o líbero foi introduzido em **1996**; `https://www.fivb.com/volleyball/the-game/basic-rules/` diz **1998**; a Wikipédia "Volleyball" diz 1998 (NCAA em 2002). O alerta de `PLANO-COMPLETO.md:156-160` continua valendo.
- **Rally point:** a mesma página (a) diz que o Congresso de outubro de 1998 ratificou o sistema; a Wikipédia diz "mudou em 1999, obrigatório em 2000". Três anos para a mesma regra.
- **O numeral já está no átrio:** `pt-BR.ts:290` («No Mundial de 1998, a bola oficial passou a usar branco, amarelo e azul») e `:292`. A regra de "exatamente uma chave de i18n" é violada antes de a Ala 5 existir, e a etiqueta entrega também o *significado* do código.
- Dentro da própria Ala 5 o ano aparece em tudo (`PLANO-COMPLETO.md:326`: três regras mudam em 1998; o ritual se chama `three-changes-1998`).

**Veredito: fato seguro (FIVB, Mikasa e prêmio de design são independentes); código contestado.** É a armadilha (a) do §4.1 do plano: quanto melhor o fato, pior o código. Saídas, em ordem de preferência:

1. Transformar a torre das duas bolas em **ritual** (qual das duas saiu de cena; ordenar branca → tricolor) e ficar com seis códigos.
2. Manter o código e reescrever o átrio sem o algarismo ("no Mundial do Japão, no fim dos anos 1990"), aceitando que a sala inteira fala de 1998 por extenso.
3. Trocar o número: a bola traz gravada a pressão e o modelo; um código lido **no objeto** (como o `15`) não depende de data nenhuma.

### 1.7 `2002` — a quadra de praia encolhe para 8 × 16 m (Ala 6)

| # | URL aberta | Publicador | O que afirma |
|---|---|---|---|
| a | https://www.fivb.com/beach-volleyball/the-game/history/ | FIVB | Sob o título **2002**: o Conselho Mundial de Vôlei de Praia confirma que o rally point e a quadra menor, de 16 × 8 m, serão adotados no Circuito Mundial (uma das duas leituras da página acrescenta os Jogos de Atenas 2004). O título do ano foi conferido nas duas leituras. |
| b | https://en.wikipedia.org/wiki/Beach_volleyball (wikitexto, seção de regras) | Wikipédia EN | Na temporada de 2001 a FIVB começou a testar a quadra de 8 × 16 m e o rally point; a AVP adotou no mesmo ano; as regras novas foram oficializadas em 2002. Notas: página antiga da FIVB, *Sports Illustrated* de 3/9/2001 e *Easy Reader* de 31/5/2001. |
| c | https://pmc.ncbi.nlm.nih.gov/articles/PMC3590823 | *Journal of Human Kinetics*, 2012 (Palao, Valades, Ortega) | Depois dos Jogos de 2000 a FIVB trocou a pontuação, o formato e o tamanho da quadra ao mesmo tempo; o Circuito de 2000 foi em vantagem e o de 2001 já em rally point. Leva a **2001**. |

**Conflito.** 2001 (c; imprensa da época; adoção pela AVP) × 2002 (a; "oficializado" em b). As duas respostas são defensáveis conforme a palavra — testada, usada, confirmada, oficializada.

**Veredito: contestado.** Só serve como código digitado se a única placa disser, sem ambiguidade, "oficializada em". Melhor: tirar o ano e usar a medida. A sala pode ter as duas quadras marcadas na areia, e o baú abre **medindo** (uma trena com dois encaixes, ou contar as estacas da linha de fundo), o que segue a regra 2 do plano ("prefira contar a digitar"). O ano entra na etiqueta como história: "testada em 2001, confirmada em 2002".

### 1.8 Quadro de conflitos de numeral (para o lint e para as etiquetas)

| Assunto | Valores em circulação | Quem diz o quê (aberto hoje) | Regra para o texto |
|---|---|---|---|
| Líbero | 1996 × 1998 | FIVB "The Game" × FIVB "Basic Rules" e Wikipédia | nunca código; etiqueta mostra as duas datas |
| Três toques | 1920 × 1922 | Wikipédia × FIVB (história) | o jogo imprime 1920 (`pt-BR.ts:380`); citar a divergência |
| Rally point | 1998 × 1999 × 2000 | ratificado × mudou × obrigatório | "ratificado em outubro de 1998, obrigatório em 2000" |
| Quadra de praia | 2001 × 2002 | JHK e imprensa × FIVB | "testada em 2001, confirmada em 2002" |
| Wagner | 1973 × 1974 | PAP e Wikipédia × IVHF (por aritmética) | "maio de 1973" |
| Fundadoras da FIVB | 14 × 16 | IVHF e Wikipédias × Wikipédia PL | 14 |
| Fundação da FIVB | 18–20 × 20 de abril | congresso × data oficial | uma forma só |
| Renomeação | início de 1896 × 7/7/1896 × dez. 1895 | FIVB e IVHF × IVHF × Wikipédia do Morgan | só "1896" |
| Morte de Morgan | 27 × 28 de dezembro de 1942 | Wikipédia × página do Morgan no IVHF | "dezembro de 1942" |
| Morgan conhece Naismith | 1891 (Mt. Hermon) × 1892 (Springfield) | IVHF × Wikipédia | "no início dos anos 1890" |
| Morgan deixa a YMCA | 1897 × 1900 | Wikipédia e Buffalo Sports HoF × o jogo | 1897 |
| Prédio da YMCA de Holyoke | 1886 × 1892 | fundação da associação × construção do prédio (Commons) | ver §2.2 |
| Bola Spalding | 1896 × 1900 | a Wikipédia registra a disputa | sem ano |
| Circunferência | "uns 25" × 25–27 pol. | IVHF × FIVB e manual de 1897 | 25 a 27 |
| Frank Wood × Woods | — | FIVB × IVHF (guia de 1916–17 e jornal de 1896) | Woods |
| Vôlei chega ao Brasil | 1915 (Recife) × 1916 (São Paulo) | EFDeportes registra a divergência | mostrar as duas |
| 1º Sul-Americano | 1951 × 1955 | Wikipédia × EFDeportes | 1951 (verificar na CSV) |
| Vôlei sentado em 1976 | demonstração do sentado × do em pé | Wikipédia × IPC | "estreia com medalha em 1980" |

---

## 2. O que o jogo já afirma — átrio e Holyoke

Legenda: **OK** = sustentado por fonte aberta hoje · **ERRO** = contradito · **DUVIDOSO** = sem fonte, ou fontes divergem · **DADO** = defeito de dados, não de história.

### 2.1 Átrio

| Chave (`pt-BR.ts`) | Linha | Veredito | Observação e fonte |
|---|---|---|---|
| `sign.atrium.eyebrow` «DESDE 1895» | 258 | DUVIDOSO | Ambíguo: o esporte é de 1895; um museu "desde 1895" teria nascido com o jogo. Sugestão: "O JOGO DESDE 1895". |
| `sign.atrium.body` | 260-262 | OK | Inventado em 1895 para quem achava o basquete pesado: FIVB (história) e IVHF. |
| `document.predecessor.body` «existe há cento e trinta anos» | 101-102 | ERRO (envelhece) | Contagem corrente; só vale em 2025–26. Também diz «Uma de cada era que você catalogar por inteiro», o que não bate com `PLANO-COMPLETO.md:67-73` (as medalhas vêm de duas trancas e de um ritual, em três alas de seis). |
| `exhibit.atrium-ball-laced.label` | 269-270 | OK com ressalva | "Catálogos de 1918–1920" e "bola de cerca de 1925" têm fonte registrada em `docs/ATRIO-BOLAS-HISTORICAS.md:10-12`; **não reabertas hoje**. |
| `exhibit.atrium-ball-laced.catalogue` «Doze gomos» | 271-272 | OK (declarado) | A contagem de gomos da bola original é disputada (8, 12, 18: `PESQUISA-CONTEUDO.md:100`); a ficha já diz "reconstrução tipológica". Manter essa frase. |
| `exhibit.atrium-ball-tokyo-1964.label` | 279-280 | OK | Primeiro torneio olímpico: Wikipédia e a página do museu do Japan Sport Council (https://www.sdm.jpnsport.go.jp/gallery-1/15.html), que não nomeia fabricante. O artigo da Mikasa no J-STAGE (https://www.jstage.jst.go.jp/article/gomu/93/2/93_37/_article/-char/en) diz que a Mikasa foi **um de vários** fornecedores aprovados — a cautela da etiqueta está certa. A contagem "dezoito painéis em seis trios" vem de olhar a foto, não do texto da página. |
| `exhibit.atrium-ball-tokyo-1964.catalogue` | 281-282 | OK | A página do JSC diz que das duas bolas a da direita não foi usada e a da esquerda foi. Cores e manchas são leitura da fotografia. |
| `hotspot.atrium-ball-tokyo-1964.seam.label` «Canal de costura […] sem fio exposto» | 285-286 | DUVIDOSO | Pressupõe costura. Bolas de quadra de competição são, em regra, coladas sobre a carcaça; não achei fonte para a de 1964. Trocar por "canal estreito e rebaixado entre os painéis". |
| `exhibit.atrium-ball-colour-1998.label` | 289-290 | OK + DUVIDOSO + roteiro | Ano, cores e modelo MVL200: FIVB, Mikasa, Hiroshima Good Design, Powerhouse. «costurados à mão»: a única fonte é a nota de produção do Powerhouse, que chama o objeto de bola de **praia** enquanto a inscrição transcrita na mesma ficha traz pressão de quadra e a indicação de que é de couro — ficha incoerente. Conferir com a Mikasa (o PDF do J-STAGE baixa, mas não foi possível extrair texto aqui). **E imprime `1998`**, código da Ala 5 (§1.6). |
| `exhibit.atrium-ball-colour-1998.catalogue` | 291-292 | OK | Sequência de cores confere com a descrição física do Powerhouse. Imprime `1998` de novo. |
| `hotspot.atrium-ball-colour-1998.seam.label` | 295-296 | DUVIDOSO | Mesma questão do «costurados à mão». |
| `exhibit.atrium-ball-eight-panel-2008.title` «milhares de dimples» | 298 | DUVIDOSO | Nenhuma fonte dá a quantidade. "Oito gomos, superfície com dimples". |
| `exhibit.atrium-ball-eight-panel-2008.label` e `.catalogue` | 299-302 | OK | Comunicado Kuraray/Mikasa de 25/6/2008 (https://www.kuraray.com/jp-ja/news/2008/0625/): MVA200, oito painéis em pétala no lugar de dezoito, dimples mais textura fina, couro sintético de microfibra com película de poliuretano, azul e amarelo (o branco saiu), escolhida para Pequim no Congresso da FIVB de 16–17/6/2008. Museu Olímpico, ref. 201691 (https://olympic-museum-artefacts.zetcom.net/en/collection/item/141207/), confirma "MVA 200". |

**Faltam fontes no dado.** As quatro bolas do átrio não têm `Fact` nem fonte em `museum.ts`; as URLs vivem só em `docs/ATRIO-BOLAS-HISTORICAS.md`. Se o livro de tombo do final (`PLANO-COMPLETO.md:425-440`) vai reetiquetar cada peça como original, reconstrução ou fac-símile, cada peça precisa da fonte no dado, não num documento à parte.

### 2.2 Holyoke

| Chave | Linha | Veredito | Observação e fonte |
|---|---|---|---|
| `exhibit.ball-improvised.label` | 309-310 | DUVIDOSO (ordem) | Nas palavras do próprio Morgan (FIVB, história; IVHF, página do Morgan), a **câmara veio primeiro** — leve e lenta demais — e **depois** a bola de basquete — grande e pesada demais. A página de história do IVHF conta na ordem inversa e diz "mole demais". A etiqueta segue a ordem inversa. Sugestão: "Entre as bolas testadas, a câmara de uma bola de basquete era leve e lenta demais; a bola inteira, grande e pesada demais." |
| `exhibit.ball-improvised.catalogue` «O primeiro objeto da história do vôlei» | 311-312 | DUVIDOSO | Retórica sem fonte; e «mole demais» é a versão do IVHF, enquanto a etiqueta ao lado usa «leve demais». Unificar. |
| hotspot `valve` de `ball-improvised` | `museum.ts:295-299` | DADO | Usa `hotspot.ball-spalding.lacing.label` («Cadarço de couro cru…»). Uma câmara nua não tem cadarço. Falta rótulo próprio ("gargalo amarrado da câmara"). |
| `exhibit.ball-spalding.label` | 315-316 | OK com 2 ressalvas | Fábrica da Spalding perto de Chicopee: FIVB. «Cerca de 25 polegadas»: o IVHF diz "uns 25", a FIVB e o manual dizem 25 a 27 — a vitrine vizinha (`pt-BR.ts:337`) já diz 25 a 27; alinhar. Couro costurado à mão e cadarço de couro cru são reconstrução: a etiqueta deve dizer. |
| `exhibit.ball-spalding.catalogue` «sobreviveu até os anos 1930 e sumiu quando a bola sem cadarço virou padrão oficial» | 317-318 | DUVIDOSO | A única data que a pesquisa achou é 1940, na cronologia da NCVA (`PESQUISA-CONTEUDO.md:322-327`), sem regulamento de arquivo. A Wikipédia registra a disputa 1896 × 1900 para a primeira bola. "Foi saindo de cena entre os anos 1920 e 1940." |
| `exhibit.net-1897.label` «cerca de meio pé acima da cabeça de um homem médio» | 324-325 | **ERRO** | Morgan, via FIVB e IVHF: a rede ficava "just above the head of an average man". Não meio pé. A pesquisa já corrigiu (`PESQUISA-CONTEUDO.md:154-156`). **O inglês diz outra coisa** (`en.ts:306`: acima "do homem médio", sem "cabeça") — as duas línguas se contradizem. |
| idem, quadra de 25 × 50 pés; rede de 2 × 27 pés | 324-325 | OK | Reprodução do manual de 1897 em https://volleyball1on1.com/1897-association-athletic-league-handbook-volleyball/ (secundária, sem fac-símile); IVHF para a quadra. |
| `exhibit.net-1897.catalogue` | 326-327 | OK com ressalva | Material da rede e soquetes são reconstrução. O manual fala em rede suspensa de postes a pelo menos um pé das laterais. |
| `exhibit.handbook-1897.label` | 332-333 | OK | Nove innings, 25 × 50, 6 pés e 6, bola de 25–27 pol. e 9–12 onças: reprodução do manual + FIVB. «primeiras especificações publicadas» briga com a ficha logo abaixo (regras saíram em julho de 1896): dizer "o primeiro manual oficial". |
| `exhibit.handbook-1897.catalogue` | 334-335 | OK | Relato na *Physical Education* de julho de 1896 e manual de 1897: FIVB e IVHF. **1952 agora tem fonte** (FIVB, história: a USVBA votou a grafia em uma palavra) — a pesquisa dava como não verificado (`PESQUISA-CONTEUDO.md:160-162`). Um publicador só; dizer "até 1952, quando a USVBA adotou…". |
| `hotspot.handbook-1897.innings.label` | 336 | OK | "Do beisebol veio a ideia dos innings": IVHF. |
| `exhibit.guide-1916.title` «O guia que registrou a bomba» | 339 | **ERRO** | Nenhuma fonte liga o guia Spalding de 1916–17 ao ataque filipino. O guia traz o artigo do Morgan e a estimativa do Cubbon. O título solda dois fatos de 1916. |
| `exhibit.guide-1916.label` | 340-341 | DUVIDOSO | Levantada e cortada nas Filipinas por volta de 1916: Wikipédia. Quem chamou de quê varia: Wikipédia ("Filipino bomb" é nome dado por americanos) × Eric Nusbaum (https://sportsstories.substack.com/p/the-filipino-bomb: estrangeiros diziam "bomba" e "Filipino bomb"). "Bomberino" não apareceu em nenhuma página aberta hoje. Usar "ficou conhecido como". |
| `exhibit.guide-1916.catalogue` «Dr. Frank Wood» e «forçou as mudanças» | 342-343 | ERRO de grafia + DUVIDOSO | O IVHF, com a página 11 do guia e o jornal de 7/7/1896, grafa **Woods**; a FIVB grafa Wood. Preferir Woods. A causalidade "o ataque forçou as regras" é contestada: a Wikipédia "Volleyball in the Philippines" conta que o limite de três toques veio **antes** e o ataque depois. |
| `hotspot.guide-1916.credit.label` | 344 | ERRO de grafia | "Woods". |
| `hotspot.guide-1916.census.label` «Censo de 1916» | 345 | **ERRO** | Não é censo: é estimativa de Robert C. Cubbon num artigo do guia (FIVB). E a conta não fecha: as parcelas somam 155 mil (`PESQUISA-CONTEUDO.md:151-153`). "Estimativa de 1916: cerca de 200 mil". |
| hotspot `credit` → `revealsFactId: 'filipino-spike'` | `museum.ts:412` | DADO | O rótulo fala do crédito a Woods e Lynch e revela o fato do ataque filipino. |
| `exhibit.gym-suit.label` | 348-349 | DUVIDOSO | «tudo é pigmento, tintura ou óxido» é nota de direção de arte (`PESQUISA-CONTEUDO.md:16`), não informação ao visitante. «sola de borracha»: a pesquisa descreve sola de couro em 1895 e borracha depois, sem fonte para a data (`:190-192`). «vitoriano» para os EUA de 1895–1915 é impreciso. |
| `exhibit.gym-suit.catalogue` «ajuda a explicar por que…» | 350-351 | DUVIDOSO | Causalidade inventada. Morgan explica o jogo pela idade e pelo fôlego dos sócios, não pela lã. |
| hotspot `knit` de `gym-suit` | `museum.ts:435-439` | DADO | Usa `hotspot.ball-spalding.seam.label` («Costura externa erguida, feita à mão»). |
| `exhibit.portrait-morgan.label` | 354-355 | OK com ressalva | 25 anos em 1895 (nasceu em 23/1/1870): certo. «em 1891»: é a versão do IVHF (Mt. Hermon); a Wikipédia diz 1892, em Springfield. |
| `exhibit.portrait-morgan.catalogue` «Deixou a YMCA em 1900» | 356-357 | **ERRO** | 1897: Wikipédia do Morgan (citando Springfield College) e Buffalo Sports Hall of Fame (https://www.buffalosportshallfame.com/william-g-morgan/). Já corrigido na pesquisa (`:139-141`). |
| idem «27 de dezembro de 1942» | 356-357 | DUVIDOSO | A página do Morgan no IVHF dá **28** de dezembro; a Wikipédia, 27. A pesquisa dizia que as duas concordavam (`:282`); hoje não. |
| idem «Em julho de 1896, ao demonstrar o jogo […] aceitou trocar o nome» | 356-357 | DUVIDOSO | Ver §1.1: o ano é firme, o mês não. |
| idem, formatura em 1894 e Holyoke em 30/8/1895 | 356-357 | OK | IVHF. |
| `hotspot.portrait-morgan.date.label` | 358-359 | OK (ano) | Tirar «numa demonstração». |
| `exhibit.photo-gym.label` «fotografado em 1897» | 362-363 | DUVIDOSO | O Commons diz **publicada** em 1897 na *Transcript Industrial Edition* (`media.generated.ts:29-41`). "Publicada em 1897". A esquina (noroeste de Appleton com High) vem da descrição do cartão-postal no Commons. «treliças de aço rebitado» precisa ser conferido olhando a foto. |
| `exhibit.photo-gym.catalogue` «O edifício serviu de 1886 a 1943» | 364-365 | **ERRO provável** | Descrição do Commons (`File:YMCA_Building_of_Holyoke,_where_Volleyball_was_first_played.jpg`, com base no Digital Commonwealth): prédio **construído em 1892**, destruído por incêndio em 1943. 1886 é o ano da associação (o resultado de busca do site da YMCA de Holyoke fala em servir a cidade desde 1886 — só busca). A pesquisa já mandava tirar as datas (`:172-174`). "A associação é de 1886; o prédio, do começo dos anos 1890, queimou em 1943." |
| hotspot `apparatus` de `photo-gym` | `museum.ts:486-490` | DADO | Usa `hotspot.net-1897.socket.label` («Soquete de ferro fundido…»). |
| `document.invention-date.body` | 371-372 | OK | Confere com o IVHF ponto a ponto. Ajuste fino: o IVHF **infere** dezembro ("provavelmente"); o texto diz «situa». |
| `document.halstead.title` e `.body` | 374-376 | OK com ressalva | Ginásio leste, Gulick, prefeito Curran e chefe Lynch, Halstead: FIVB e IVHF. A data de 7 de julho é do IVHF; a FIVB diz "início de 1896". No dado, `kind: 'letter'` (`museum.ts:512`) descreve mal: não é uma carta. |
| `document.rule-changes.body` | 379-380 | OK + DUVIDOSO | 1917 (21 → 15): Wikipédia. 1918 (seis): FIVB. 1920 (três toques e ataque de fundo): Wikipédia; a FIVB diz 1922. «As três respondem ao mesmo problema»: sem fonte, e a redução para 15 pontos não tem relação documentada com o ataque. Imprime `15` (colide com o código da Ala 4). |
| `fact.*.claim` | 385-388 | OK | — |

### 2.3 `FACTS` em `museum.ts:44-115`

| Fato | Problema | Conserto |
|---|---|---|
| `springfield-renaming` | fonte 2 devolve 404 (`:61`) | URLs de §1.1 |
| `first-rulebook` (1897) | a URL citada (`:77`, Wikipédia "Volleyball") **não contém "1897"** hoje; o título do registro nomeia o manual, mas a página não fala dele | FIVB (história) + IVHF (página do Morgan) |
| `filipino-spike` (1916) | um publicador (Wikipédia), e ela diz "em 1916 … havia sido introduzido" | tudo bem enquanto não for código |
| `six-a-side` (1918) | a URL citada (`:109`) **não contém "1918"** hoje | FIVB (história) |
| todos | `verifiedAt: '2026-07-30'` com fonte que não sustenta o valor | o validador (`src/content/validate.ts:262-280`) só exige confiança `high` e dois nomes de publicador diferentes; não confere `accessedAt` nem se a URL responde. Um script `facts:check` fora do portão (precisa de rede) resolveria |

### 2.4 O que esta rodada muda em `docs/PESQUISA-CONTEUDO.md`

1. `:160-162` — "1952" deixa de ser "sem fonte": FIVB (história). Um publicador.
2. `:163-165` — o texto do manual de 1897 tem reprodução acessível (volleyball1on1.com), com as duas tentativas de saque, os 10 pés e a exceção do primeiro saque na rede. Continua sem fac-símile.
3. `:282` — o IVHF não dá mais 27 de dezembro de 1942 na página do Morgan; dá 28.
4. `:172-174` — o prédio tem data de construção com fonte (1892, Commons/Digital Commonwealth).
5. `:711` — "Coach of the Century" tem fonte (IVHF), com período incoerente.
6. `:116` e `:128` — as páginas do IVHF mudaram de endereço; existe agora `https://www.volleyhall.org/first-us-championship-1922.html` (link visto, página não aberta), que pode resolver "23 × 27 times".
7. `:848` — a contradição do líbero continua no ar nas duas páginas atuais da FIVB.
8. `:891-893` — a cronologia de praia da FIVB põe a confirmação da quadra em 2002.
9. `:1102-1104` — a MVA200 tem fonte primária (Kuraray, 25/6/2008).

---

## 3. Banco de curiosidades verificadas

Todas saíram de páginas abertas hoje. "Pub." = número de publicadores independentes abertos. Nenhuma contagem corrente. Usos: **E** etiqueta · **H** hotspot · **D** documento de gaveta · **J** fala do Jorge no rádio · **C** nota do caderno.

URLs abreviadas:
FIVB-H = https://www.fivb.com/volleyball/the-game/history/ ·
FIVB-G = https://www.fivb.com/volleyball/the-game/ ·
FIVB-R = https://www.fivb.com/volleyball/the-game/basic-rules/ ·
FIVB-B = https://www.fivb.com/beach-volleyball/the-game/history/ ·
FIVB-S = https://www.fivb.com/snow-volleyball/the-game/ ·
IVHF-H = https://www.volleyhall.org/history-of-volleyball.html ·
IVHF-M = https://www.volleyhall.org/william-morgan-father-of-volleyball.html ·
WP = en.wikipedia.org/wiki/…

### Ala 1 — Holyoke (1895–1929)

| # | Curiosidade | Fonte | Pub. | Uso |
|---|---|---|---|---|
| C01 | A primeira ideia de Morgan foi o tênis; ele desistiu por causa das raquetes e ficou só com a rede. | FIVB-H; IVHF-M | 2 | E (rede) |
| C02 | A rede ficava logo acima da cabeça de um homem médio — nada de meio pé. | FIVB-H; IVHF-M | 2 | E (correção) |
| C03 | O jogo é uma colagem: bola do basquete, rede do tênis, uso das mãos do handebol de parede, innings do beisebol. | IVHF-H | 1 | H (manual) |
| C04 | A partida tinha nove innings, e cada inning acabava com três "outs" de saque por time. | IVHF-H; WP Volleyball | 2 | H |
| C05 | No começo não havia limite de jogadores nem de toques; o IVHF comenta que a quadra ficava apertada. | IVHF-H; WP Volleyball | 2 | J |
| C06 | O saque podia ser ajudado: um companheiro empurrava a bola por cima da rede. | IVHF-H | 1 | J |
| C07 | Em 1897 o sacador tinha duas tentativas, e o saque precisava andar pelo menos dez pés. | volleyball1on1.com (reprodução do manual) | 1 | H |
| C08 | Bola na rede era falta — menos na primeira tentativa de saque. | volleyball1on1.com; WP Volleyball | 2 | H |
| C09 | O manual de 1897 apresenta o jogo como mistura de tênis com handebol de parede. | volleyball1on1.com | 1 | D |
| C10 | Os dois times da demonstração tinham como capitães o prefeito e o chefe dos bombeiros de Holyoke. | FIVB-H; IVHF-H | 2 | E (já no arquivo) |
| C11 | A data famosa de 9 de fevereiro de 1895 não tem citação; Morgan só chegou a Holyoke em 30 de agosto. | IVHF-H | 1 | D (já no jogo) |
| C12 | O próprio Morgan, em 1916–17, creditou o Dr. Frank Woods e o chefe dos bombeiros John Lynch. | IVHF-H (página 11 do guia) | 1 | H |
| C13 | "Volley ball" foi escrito em duas palavras até 1952, quando a associação americana votou juntar. | FIVB-H | 1 | E |
| C14 | O Canadá foi o primeiro país de fora a adotar o jogo, em 1900. | FIVB-H; FIVB-B | 1 | C |
| C15 | Na Ásia, pelas "regras de Brown", jogava-se com dezesseis de cada lado, para caber mais gente. | IVHF-H | 1 | J |
| C16 | Em 1919 as forças americanas distribuíram cerca de 16 mil bolas de vôlei a tropas e aliados. | WP Volleyball | 1 | E (fim da ala) |
| C17 | A conta de 1916 não fecha: Cubbon falou em 200 mil praticantes, e as parcelas somam 155 mil. | FIVB-H | 1 | C (o museu que se declara) |
| C18 | Morgan jogou futebol americano em Springfield sob Amos Alonzo Stagg. | IVHF-H; IVHF-M | 1 | D |
| C19 | Morgan viu nascer a associação americana (1928) e foi homenageado em 1938; em 1951 o filho recebeu um diploma em nome dele. | IVHF-M | 1 | D |
| C20 | O prédio da invenção não existe mais: queimou em 1943. | Commons (`File:YMCA_Building_of_Holyoke,_where_Volleyball_was_first_played.jpg`) | 1 | E (foto do ginásio) |
| C21 | O newcomb, em que a bola é agarrada e arremessada, rivalizou com o vôlei em popularidade até os anos 1920. | WP Volleyball (variações) | 1 | J |
| C22 | Por volta de 1916, nas Filipinas, surgiu o passe alto seguido de cortada; os americanos deram ao golpe o nome de "bomba filipina". | WP Volleyball; WP Volleyball_in_the_Philippines; Nusbaum | 2 | E (com "ficou conhecido") |

### Ala 2 — Paris (1930–1949)

| # | Curiosidade | Fonte | Pub. | Uso |
|---|---|---|---|---|
| C23 | A FIVB começou a ser combinada num café: o Graf, em Praga, com franceses, poloneses e tchecos. | https://www.volleyhall.org/paul-libaud.html | 1 | D (memorando de Praga) |
| C24 | O Brasil estava entre as catorze federações de Paris, ao lado de Egito, Uruguai e Estados Unidos. | IVHF Libaud; WP PT e IT | 2 | H (marcador de mesa) |
| C25 | Antes da FIVB, o vôlei internacional era um departamento da federação de handebol. | WP FIVB | 1 | E |
| C26 | O primeiro presidente ficou 37 anos no cargo; a sede só saiu de Paris para Lausanne em 1984. | IVHF Libaud; WP FIVB | 2 | D |
| C27 | Os primeiros Mundiais: 1949 para os homens, 1952 para as mulheres. | WP Volleyball; IVHF Libaud | 2 | E |
| C28 | Em 1924, em Paris, o vôlei apareceu nos Jogos como demonstração não oficial. | WP Volleyball_at_the_Summer_Olympics | 1 | C |
| C29 | A Mikasa nasceu em 1917 como fábrica de borracha em Hiroshima; a marca "Mikasa" para bolas é de 1935. | mikasasports.co.jp/e/company/history/; WP Mikasa_Sports | 2 | H (bola) |
| C30 | Circula uma lista de dezesseis fundadoras; o museu segue a de catorze e explica por quê. | WP PL × IVHF | — | D (ficha de dúvida) |

### Ala 3 — Tóquio (1950–1969)

| # | Curiosidade | Fonte | Pub. | Uso |
|---|---|---|---|---|
| C31 | Para convencer o COI, organizou-se um torneio especial durante a sessão de Sófia, em 1957. | WP Volleyball_at_the_Summer_Olympics | 1 | E |
| C32 | O Mundial de 1964 foi antecipado para 1962 para não cair em ano olímpico. | WP 1962 Women's World Championship | 1 | H (kit CCCP) |
| C33 | O time japonês jogava com nove de cada lado; só mudou para seis em 1958. | WP Oriental_Witches; IVHF Daimatsu | 2 | E |
| C34 | As jogadoras trabalhavam de manhã na fiação e treinavam das 15h às 2h da madrugada. | WP Oriental_Witches | 1 | H |
| C35 | Depois do título de 1962 o time pensava em parar; cerca de 5 mil cartas pediram que seguisse até Tóquio. | WP Oriental_Witches | 1 | D |
| C36 | O ponto do ouro de 1964 foi uma invasão soviética por cima da rede; o locutor anunciou "ponto do ouro" seis vezes. | WP Oriental_Witches | 1 | J |
| C37 | O museu do esporte de Tóquio guarda duas bolas oficiais de 1964, uma usada e uma nunca usada. | sdm.jpnsport.go.jp/gallery-1/15.html | 1 | E (átrio) |
| C38 | Em 1964 não havia "a" bola oficial: a Mikasa era um de vários fornecedores aprovados. | J-STAGE (Ogawa, 2020) | 1 | H |
| C39 | O COI tentou tirar o vôlei do programa de 1968; houve protesto e ele ficou. | WP Volleyball_at_the_Summer_Olympics | 1 | C |
| C40 | O vôlei de praia teria começado em Waikiki, em 1915; o jogo de duplas é de Santa Monica, em 1930. | FIVB-B; WP Beach_volleyball | 2 | E (quadra de areia) |
| C41 | O primeiro prêmio de um torneio de praia, em 1948, foi um engradado de Pepsi. | FIVB-B; WP Beach_volleyball | 2 | H (tampa de garrafa) |
| C42 | A cronologia da FIVB registra os Beatles batendo bola em Sorrento Beach e o presidente Kennedy assistindo a um torneio. | FIVB-B | 1 | J (como "a FIVB conta que") |
| C43 | Nos anos 1950 o Brasil teve o primeiro torneio de praia patrocinado por um jornal. | FIVB-B | 1 | E |
| C44 | O Brasil sediou o Mundial masculino de 1960, em cinco cidades. (Que foi o primeiro fora da Europa está em `PESQUISA-CONTEUDO.md:471`; não reaberto hoje.) | WP 1960 Men's World Championship | 1 | E |
| C45 | O Brasil estava no primeiro torneio olímpico: sétimo lugar, três vitórias. | WP 1964 men's tournament; EFDeportes nº 170 | 2 | H |

### Ala 4 — Ferro e Areia (1970–1989)

| # | Curiosidade | Fonte | Pub. | Uso |
|---|---|---|---|---|
| C46 | Wagner assumiu a Polônia aos 32 anos, sem nunca ter treinado um time; o apelido era "Kat", o carrasco. | dzieje.pl/node/25274; WP PL | 2 | D (dossiê) |
| C47 | Wagner virou personagem de gibi numa série sobre olímpicos poloneses, e há um torneio anual em memória dele. | https://www.volleyhall.org/hubert-wagner.html | 1 | J |
| C48 | O pai de Kiraly jogou pela seleção juvenil da Hungria e fugiu do país em 1956; aos 11 anos, Karch estreou na praia como dupla do pai. | WP Karch_Kiraly; IVHF Kiraly | 2 | E (camisa) |
| C49 | Kiraly se formou em bioquímica e queria ser bioquímico como o pai. | WP Karch_Kiraly; IVHF Kiraly | 2 | H |
| C50 | Ouro na quadra em 1984 e 1988 e na areia em 1996: medalhas em duas arenas do mesmo esporte. | IVHF Kiraly; WP | 2 | E |
| C51 | Quem vence o Aberto de Manhattan Beach ganha uma placa de bronze em forma de bola, cravada no píer. | WP Manhattan_Beach_Open | 1 | H (placa) |
| C52 | O primeiro torneio de praia com patrocínio, em 1974, teve 250 espectadores e 1.500 dólares; dois anos depois, 30 mil pessoas viram a final em State Beach. | FIVB-B | 1 | E |
| C53 | Em 26 de julho de 1983, Brasil e União Soviética jogaram no Maracanã para 95.887 pessoas; o Brasil venceu por 3 a 1. | efdeportes.com/efd184/30-anos-de-voleibol-brasileiro-1982-a-2012.htm | 1 | E (só o número, sem "recorde") |
| C54 | Dois saques brasileiros têm nome de seriado de TV: Jornada nas Estrelas, do Bernard, e Viagem ao Fundo do Mar, batizado pelo auxiliar Brunoro. | efdeportes.com/efd170/historia-do-voleibol-no-brasil.htm | 1 | J |
| C55 | A primeira medalha olímpica do vôlei brasileiro foi de prata: derrota para os Estados Unidos em 11 de agosto de 1984. | EFDeportes nº 170; WP | 2 | E (sem adjetivo) |
| C56 | O primeiro torneio de praia chancelado pela FIVB foi em Ipanema, em 1987 — e quem ganhou foi uma dupla americana. | FIVB-B; WP Beach_volleyball | 2 | E |
| C57 | A FIVB cita Renan, Badá, Montanaro, William, Jackie Silva, Isabel, Vera Mossa e Regina Uchoa entre os que levaram a praia ao mundo. | FIVB-B | 1 | D |
| C58 | Bernard começou no basquete do Fluminense e trocou de esporte por ser baixo demais. | WP Bernard_Rajzman | 1 | J |

### Ala 5 — A Reescrita (1990–1999)

| # | Curiosidade | Fonte | Pub. | Uso |
|---|---|---|---|---|
| C59 | Nem a FIVB decide quando o líbero nasceu: uma página dela diz 1996, outra diz 1998. | FIVB-G × FIVB-R | 1 (contra si) | E — a etiqueta mostra as duas |
| C60 | "Líbero" é "livre" em italiano. | WP Volleyball | 1 | H |
| C61 | A bola colorida veio depois de testes com muitas cores (FIVB); o prêmio de design de Hiroshima a registra como a primeira bola oficial colorida. | FIVB-G; hiroshimagooddesign.jp/product/1034/ | 1 por afirmação | E |
| C62 | Até 1999 só pontuava quem sacava, e os sets iam a 15. | WP Volleyball | 1 | H (placar antigo) |
| C63 | O rally point foi pensado para deixar o placar fácil de seguir e o jogo mais rápido. | FIVB-G | 1 | ritual das três mudanças |
| C64 | Desde 2000 o saque pode tocar a rede e seguir; antes, tocou, perdeu. | WP Volleyball; FIVB-G | 2 | J |
| C65 | Vale jogar com qualquer parte do corpo, pé inclusive; antes, chutar era falta. | WP Volleyball (nota: 1993) | 1 | J |
| C66 | Em 24 de setembro de 1994, em Monte Carlo, a praia foi reconhecida como disciplina olímpica. | FIVB-B | 1 | D (sem cravar a data na parede) |
| C67 | As primeiras campeãs olímpicas do Brasil saíram de uma final só de brasileiras: Jackie e Sandra contra Mônica e Adriana, em 27 de julho de 1996. | jb.com.br (8/3/2012); WP Jackie_Silva | 2 | E |
| C68 | Jackie Silva foi cortada da seleção de quadra e, em 1988, foi jogar na areia dos Estados Unidos. | WP Jackie_Silva | 1 | D |
| C69 | Regla Torres foi campeã olímpica aos 17 anos. | WP Regla_Torres | 1 | H |

### Ala 6 — Global (2000 em diante)

| # | Curiosidade | Fonte | Pub. | Uso |
|---|---|---|---|---|
| C70 | Em 2008 a bola perdeu dez gomos de uma vez: de dezoito para oito, em forma de pétala. E perdeu o branco. | kuraray.com/jp-ja/news/2008/0625/; WP Volleyball_(ball) | 2 | E |
| C71 | A bola de 2008 foi escolhida para Pequim num congresso da FIVB menos de dois meses antes dos Jogos. | Kuraray | 1 | H |
| C72 | A quadra de praia era do tamanho da de quadra; ficou um metro mais estreita e dois mais curta. | FIVB-B; WP Beach_volleyball | 2 | E (as duas marcações na areia) |
| C73 | A bola de praia é um pouco maior e bem mais murcha que a de quadra. | WP Beach_volleyball | 1 | H |
| C74 | Na praia, a dupla combina o bloqueio por sinais de mão escondidos atrás das costas. | WP Beach_volleyball | 1 | J |
| C75 | O vôlei sentado nasceu na Holanda, em 1956, da mistura do vôlei com o sitzball alemão. | paralympic.org/news/sport-week-history-sitting-volleyball; WP | 2 | E (quadra rebaixada) |
| C76 | Quadra de 10 × 6 m, rede a 1,15 m (homens) e 1,05 m (mulheres). | worldparavolley.org/disciplines/sitting-volleyball/; WP | 2 | H |
| C77 | No vôlei sentado pode-se bloquear o saque. | World ParaVolley; WP | 2 | J |
| C78 | Estreia paralímpica com medalha em Arnhem, 1980 (ouro da Holanda); as mulheres entraram em Atenas, 2004. | paralympic.org; World ParaVolley | 2 | E |
| C79 | Houve vôlei paralímpico em pé; a modalidade masculina saiu do programa quando as mulheres do sentado entraram. | paralympic.org | 1 | D |
| C80 | Uma cortada de elite pode sair de 60 cm acima do aro do basquete. | FIVB-R | 1 | J |
| C81 | O Brasil tem duas datas de chegada do vôlei: 1915, num colégio marista de Pernambuco, ou 1916, na ACM de São Paulo. Os estudiosos divergem. | EFDeportes nº 170 | 1 | D (ficha de dúvida) |

### Mezanino — vôlei de neve

| # | Curiosidade | Fonte | Pub. | Uso |
|---|---|---|---|---|
| C82 | O vôlei de neve ganhou forma em Wagrain, na Áustria, em 2008; no ano seguinte já tinha um circuito. | WP Snow_volleyball | 1 | E |
| C83 | Joga-se de chuteira: a trava segura na neve. E com roupa térmica por baixo do uniforme. | FIVB-S; WP | 2 | H |
| C84 | Começou em duplas, como a praia; desde o fim de 2018 são três de cada lado, e os sets vão a 15. | WP Snow_volleyball | 1 | E |
| C85 | Na neve, o toque no bloqueio não conta como um dos três toques — ao contrário da praia. | WP Snow_volleyball | 1 | H |
| C86 | Houve uma demonstração nos Jogos de Inverno de 2018, com ex-olímpicos da praia. | WP Snow_volleyball | 1 | D |
| C87 | Pelo vôlei de neve, Brasil e Argentina ganharam suas primeiras medalhas internacionais em esporte de neve ou gelo. | WP Snow_volleyball | 1 | J (precisa de 2ª fonte) |

**87 entradas.** Com dois publicadores independentes: C01, C02, C04, C05, C08, C10, C22, C24, C26, C27, C29, C33, C40, C41, C45, C46, C48, C49, C50, C55, C56, C64, C67, C70, C72, C75, C76, C77, C78, C83 (30). As demais valem para rádio, caderno e hotspot; para etiqueta de parede, pedir a segunda fonte.

### 3.1 Sobre o Brasil sem ufanismo (`PLANO-COMPLETO.md:386-391`)

O material verificado sustenta o Brasil como **presença constante**, não como herói: fundador em 1947 (C24), sede em 1960 (C44), sétimo em 1964 (C45), jornal patrocinando praia nos anos 1950 (C43), Maracanã em 1983 (C53), prata antes do ouro (C55), saques com nome de seriado (C54), Ipanema vencida por americanos (C56), primeiras campeãs numa final caseira (C67), duas datas de chegada (C81). Nenhuma dessas depende de contar títulos. Evitar "recorde" em C53 e "único" em C67 — a matéria do JB erra ao chamar o ouro de 1996 de "único ouro feminino" já em 2012.

### 3.2 Exemplos de fala do Jorge (redação nova; voz de `pt-BR.ts:185-246`: "curador", "você", zoa sem ofender)

- C05: "Sabia que no começo podia jogar quantos quisessem? Imagina a fila pra sacar. Câmbio."
- C06: "No tempo do Morgan, se o saque não passava, o colega dava uma mãozinha. Literalmente."
- C15: "Na Ásia já jogaram com dezesseis de cada lado. Dezesseis! Eu não consigo juntar seis pro churrasco."
- C36: "O locutor japonês falou 'ponto do ouro' seis vezes em 64. Eu só te falei do quadro do átrio duas."
- C42: "Diz a federação que os Beatles já bateram bola na praia. Eu não vi. Mas tá escrito."
- C54: "Jornada nas Estrelas era saque, curador. A bola subia tanto que dava tempo de pegar um café."
- C64: "Antes de 2000, saque que roçava a rede era ponto do outro. Hoje passa. O mundo amoleceu."
- C74: "Na praia eles combinam o bloqueio com o dedo nas costas. Eu combino a ronda com o rádio. Cada um com o seu."
- C83: "Vôlei na neve se joga de chuteira. De chuteira! E eu aqui de sapato social."

---

## 4. O que não abriu (para a próxima rodada não repetir)

| URL | Resultado |
|---|---|
| `volleyhall.org/page/show/3821594-history-of-volleyball` | 404 (URL do `museum.ts:61`) |
| `volleyhall.org/masae-kasai.html` | 404 |
| `olympics.com/en/news/tokyo-1964-women-volleyball-japan-gold` | timeout |
| `apjjf.org/?p=6868` | 403 |
| `britannica.com/sports/volleyball` | 403 |
| `digitalcommonwealth.org` (carta de Morgan a George Draper; cartão-postal do prédio) | conexão recusada |
| `dp.la/item/2b67653b99a00e3fa41bdd7c46e9f23a` | 403 |
| `web.archive.org` | bloqueado pela ferramenta |
| `newenglandhistoricalsociety.com/1895-william-morgan-invents-mintonette/` | conexão reiniciada |
| `vault.si.com/vault/1986/06/02/a-tiger-on-beach-and-court` | 404 |
| `holyokeymca.org/About-the-Y-History` | 404 |
| `paralympic.org/sitting-volleyball/about` | 404 |
| `fivb.com/snow-volleyball/the-game/history/` | 404 |
| `volleyballworld.com` (entrevista de Martin Kaswurm, 2019) | 404 depois do redirecionamento |
| PDF do J-STAGE (Ogawa, 2020) | baixa, mas não há extrator de PDF nesta máquina |
| `fivb.com` | responde ao navegador; corta leituras em sequência — espaçar as chamadas |

## 5. Pendências que bloqueiam `usedAsCode: true`

1. `15`: fonte primária do número (foto datada ou relatório oficial).
2. `1962`: reabrir o olympics.com para "em Moscou, 3–1 sobre a URSS".
3. `1998` e `2002`: decisão de desenho (ritual, medida ou numeral reescrito) antes de qualquer texto.
4. `1998`: tirar o algarismo de `pt-BR.ts:290` e `:292` se o código ficar.
5. `14`: tirar «14 nações» do texto da tranca de Tóquio (`PLANO-COMPLETO.md:264-265`).
6. Átrio: confirmar com a Mikasa se a MVL200 e a bola de 1964 eram coladas ou costuradas antes de manter «costurados à mão».
7. Vôlei de neve: segunda fonte para origem e regras (hoje só a Wikipédia e uma página curta da FIVB) — o buraco nº 5 de `PLANO-COMPLETO.md:495-497` continua aberto.
8. O lint de exclusividade de numerais (`PLANO-COMPLETO.md:483-485`) precisa de três exceções declaradas: a tranca-tutorial (`1896`), números lidos em geometria (`15`) e números contados (`14`).
