# Plano até o final — do átrio e da Holyoke ao último termo

Versão final de 2026-10-03, depois de cinco revisões adversariais (seção "Como este plano foi
verificado", no fim). Base: repositório `Volleyball Museum`, branch `main`, HEAD `82756c4` (produção:
`https://volleyball-museum.renanbuiatti14.workers.dev`, versão Cloudflare `0027afaa`). Para o dono e
para quem implementar, agentes incluídos. Substitui o roteiro de `docs/PLANO-COMPLETO.md` onde os dois
divergem (Anexo D) e mantém dele a pesquisa, as regras de código e o desenho das cinco alas.

## Como ler

- **Lotes** são `L1…L24`, precedidos da preparação `P0`. Cada lote é um incremento publicável. De L3
  em diante todo lote deixa o jogo completável do título até um termo assinado; L1 e L2 consertam o
  que está no ar e instalam os trilhos, e deixam o jogo com um fecho honesto (ninguém manda o jogador
  a algo que não existe).
- **Defeitos** são citados pelo relatório de origem: `ÁT-…` (átrio), `H-…` (Holyoke), `AS-S/A/H/L…`
  (assets: pipeline, átrio, Holyoke, alavancas), `CAP-…` (capturas), `EN-A…` (motor).
- **Pacotes do motor** são `M0…M46` (seção 6.2). **Contradições agosto × outubro** são `CN1…CN26`;
  **promessas da abertura**, `P1…P32`. **Curiosidades** são `F01…F93`. As ações do grafo da Ala 4
  levam o prefixo `FA-` para não colidir com os fatos.
- **[a validar]** marca número, coordenada ou custo proposto aqui e ainda não medido. Texto entre
  « » é rascunho de texto do jogo em pt-BR (a fonte); `en.ts` é escrito no mesmo lote, com revisão de
  voz por personagem.
- **Os relatórios de origem** já estão no repositório: auditorias, inventário, motor, fatos e os três
  desenhos em `docs/plano-mestre/fontes/` (`01` a `07`, `10` a `12`); os scripts de medição em
  `scripts/audit/`; as 100 capturas de referência em `docs/contact-sheets/baseline-2026-10-03/`. É
  para lá que os IDs deste plano apontam.

**O que não foi verificado.** O plano saiu de leitura de código, simulações em Node e 100 capturas.
Ninguém jogou o roteiro novo. Posições novas, custos de draw depois da fusão do kit e tudo o que diz
respeito a aparelho real são proposta até o lote que os mede (Anexo E; `P0`; L6).

---

## 0. Resumo executivo e decisões do dono

### 0.1 O que o plano entrega

1. **As mesmas correções do escritório, no átrio e na Holyoke.** 87 defeitos de fluxo, interação,
   estado e UX (34 no átrio, mais 4 restrições; 53 na Holyoke), cada um com arquivo:linha, cenário,
   correção, teste e lote (seção 3). Os erros que estão no ar hoje saem em L1.
2. **Todos os assets polidos.** Uma bíblia de 26 regras, 10 defeitos de pipeline, 36 defeitos de
   modelo medidos, uma linha por receita com custo em triângulos, VRAM, draws e programas (seção 4),
   e um livro-caixa refeito depois da revisão: a fusão do kit e o estimador de orçamento entram
   **antes** de qualquer acréscimo de draw, e a memória só fecha com KTX2 (D23).
3. **A história até o fim, sem beco.** Hoje o jogo para no bilhete do Otávio. O plano fecha a noite
   em dois finais (a **Posse**, em L3; a **Reabertura**, em L12, que é o final da história), abre as
   cinco alas em sequência, cada uma com o próprio termo, e termina no **Encerramento** (L24), quando
   a porta da rua sobe. O grafo ação → exige → concede → destrava cobre o jogo inteiro, com as listas
   de peças, fios e termos fechadas (seções 2.4 e 5; Anexo F).
4. **Prova mecânica de "100% jogável".** Simulador de progresso, robô de partida com 500 ordens
   embaralhadas (inclusive o jogador que nunca pega o rádio nem acende a lanterna), corpus de saves
   de todos os lotes, navegação por inundação, comparação do grafo de cada lote com o anterior e um
   teste de coerência das falas (nenhuma fala manda fazer o que já foi feito nem diz hora que ande
   para trás). Seção 6.4.
5. **Um jogo bom de explorar.** Travessia no escuro em toda sala, nenhum objeto inerte, placas
   legíveis, dica em degraus que nunca entrega sem pedido, segredos, álbum de figurinhas, retorno em
   três canais (seção 8).
6. **Informação verificada.** 87 curiosidades com fonte, cada uma com lugar no jogo; parede só com
   dois publicadores, conferido por validador; os sete códigos de agosto reavaliados; seis categorias
   de proveniência; e a versão padrão de cada sala é a que **não** depende de fonte ainda não
   encontrada (seção 7).

### 0.2 Os lotes

Esforço em sessões de trabalho (uma sessão é uma rodada de implementação com revisão); é estimativa.

| Lote | Nome | O que muda para o jogador | Final disponível | Sessões |
|---|---|---|---|---:|
| P0 | Preparação | nada (documentos, scripts, linha de base, aparelho real, captura das fontes) | — | 1 |
| L1 | Correções no ar | fatos errados corrigidos; vitrine corrida sem peça atravessada; quadro da Holyoke na parede oposta; o Jorge para de mandar ao que não existe | fecho honesto | 1 |
| L2 | Trilhos | saves que não se perdem; atalho que fica aberto; planta sem spoiler | fecho honesto | 3 |
| L3 | Posse | gaveta → chave → cofre de ferro → Livro de Termos → assinatura no púlpito | **termo de posse** | 3 |
| L4 | O verbo | examinar, virar e catalogar funcionam nas 12 peças; etiqueta do Otávio no verso; dica em degraus | posse | 3 |
| L5 | Pipeline e orçamento | normais, veio, latão e paletas certos; claraboia e forro; estimador de orçamento | posse | 3 |
| L6 | Kit por sala e fusão | nada visível; o átrio sai de ~80 para ~35–40 draws; segunda medição em aparelho real | posse | 3 |
| L7 | Materiais e memória | madeira, tecido e bolas com cor certa; KTX2; memória dentro do alvo móvel | posse | 3 |
| L8 | Ler a casa | placa legível nas 12 peças; quiosque; legendas; "e isso aqui?" | posse | 2 |
| L9 | Planta do saguão | cada objeto do átrio com função; tapumes, entrada, dedicatória, escada do subsolo | posse | 3 |
| L10 | Luz | apagão de verdade, luz de serviço, quadros que respondem, religamento encenado | posse | 3 |
| L11 | Medalhas e luz geral | três medalhas, plinto de três encaixes, chave geral: o teto do átrio aparece | posse | 3 |
| L12 | Caixa-forte do Fundador | plataforma, caixa-forte, livro de tombo, carta, amanhecer, Helena | **termo de reabertura** (final da história) | 4 |
| L13 | Átrio, acabamento | lounge, banners, disco do piso, recepção, sombra de contato | reabertura | 2 |
| L14 | Holyoke, heróis | Spalding, vitrine corrida, traje, rede, impressos | reabertura | 3 |
| L15 | Informação e colecionáveis | figurinhas, bancos de escuta, distintivo da quadra, quadro de cortiça | reabertura | 2 |
| L16 | Som, ajustes e toque | chuva, relés, música, tela de ajustes, acabamento da interface | reabertura | 2 |
| L17 | Molde da ala | nada visível: residência de salas, bundle, fios, painéis de tranca, dispositivos | reabertura | 4 |
| L18 | Ala 2 · Paris | a mesa verde; contar em vez de digitar | + termo da ala | 4 |
| L19 | Ala 3 · Tóquio | a praia dentro da sala; o distintivo que abre outra sala | + termo da ala | 4 |
| L20 | Ala 4 · Ferro e Areia | dois climas de luz; a ferramenta; ler em vez de fazer conta | + termo da ala | 4 |
| L21 | Ala 5 · A Reescrita | os dois placares; sem número | + termo da ala | 3 |
| L22 | Ala 6 · Global | vôlei sentado; a corda de metro; seis bolas, três moldes; os fios fecham | + termo da ala | 4 |
| L23 | Mezanino | a vista de cima; vôlei de neve; créditos | os anteriores | 4 |
| L24 | Encerramento | a porta da rua; a portaria; tiers de qualidade, modo leitura | **termo de encerramento** (100%) | 3 |

Total estimado: cerca de 75 sessões. Parar depois de L4, L12 ou L16 deixa um jogo inteiro.

### 0.3 Decisões do dono

Cada linha tem um padrão. O trabalho segue com o padrão se não houver resposta; as marcadas com (!)
mudam algo que já está no ar, o cânone ou a ordem do trabalho, e merecem um "sim" antes do lote
indicado.

**Decidido em 2026-10-04:** seguir os padrões, nas 36. Registro: `docs/plano-mestre/DECISOES.md`.

**História**

| # | Decisão | Padrão recomendado | Por quê | Antes de |
|---|---|---|---|---|
| D1 (!) | A ampliação é literal ou o prédio já tem seis alas? | Literal: a casa de hoje é escritório, átrio e Ala 1; cada ala nova é inaugurada num lote | é o que a planta da parede já diz | L3 |
| D2 (!) | De onde vêm as três medalhas | Das três partes da casa: Curador (chapéu), Fundação (Ala 1), Linhagem (saguão) | fecha o final com três salas | L3 |
| D3 | O Otávio | Aposentou-se hoje, vivo; gravou o recado no aparelho da própria mesa antes do ônibus das cinco; a queda de energia cortou a gravação às 16h47 | explica o relógio parado e a ausência, sem morto | L3 |
| D4 | O Fundador | Não é o Otávio. Nome proposto: Amadeu Lins (fictício; conferir que não coincide com pessoa real do vôlei) | dá dono ao plinto e ao tema | L9 |
| D5 (!) | Nome próprio | "Museu do Voleibol" em tudo | é o que está na placa e na planta | L1 |
| D6 | A Helena aparece? | Só a voz, uma vez, no epílogo | o jogo não tem figura humana | L12 |
| D7 (!) | O final "o museu se declara" | Sim, **sem enigma de letra**. A ficha do caderno diz a categoria por extenso desde o primeiro carimbo; a reforma da Helena tirou essa linha das placas de parede; depois da Reabertura ela volta a toda placa | não se tira do ar uma declaração já publicada; o conflito fica na parede, não na ficha | L8 |
| D8 | O final exige catálogo completo? | A Reabertura exige as 12 peças da casa (pelos dois lacres); o termo de cada ala, as oito da ala | "conhecer por inteiro" é a regra das medalhas | L11 |
| D27 | O rádio continua opcional? | Sim. Fecho de termo, luz geral e epílogo saem também pelo alto-falante de chamada da sala (legenda própria, não dependem do rádio) | o rádio "ouvido onde está" acabou de ser construído; o final não pode depender de um objeto opcional | L3 |
| D28 | As alas abrem em que ordem? | Em sequência: o termo de uma deslacra a pasta da seguinte, na caixa-forte | vale igual para quem joga lote a lote e para quem joga tudo; "a obra entrega uma parede por vez" | L18 |
| D32 | Aviso de ficção | Sim: «O Museu do Voleibol, seu fundador e seus curadores são ficção. Os fatos do vôlei têm fonte na ficha de cada peça.» (tela "Sobre", parede de créditos, modo leitura) | um museu que declara o que cada coisa é declara também a si mesmo | L8 |
| D33 | Lacres antes da Posse? | Não: «Só o curador empossado rompe.» | impede que a noite ande fora de ordem sem endurecer nada que já exista | L11 |
| D34 (!) | Os dois cofres | **cofre de ferro** (escritório) e **caixa-forte do Fundador** (sob o átrio), nas duas línguas; a lista da Helena passa a dizer «Caixa-forte» | em inglês o texto publicado já diz *vault*; riscar "cofre" ao abrir o cofre errado seria falso | L3 |
| D36 | O Jorge é guia de áudio? | Não. Ele dá caminho, zoeira e «o Otávio dizia…»; as curiosidades vão para figurinhas, bancos de escuta e fitas do Otávio | é a voz publicada dele («isso aqui é portaria») | L15 |

**Mecânica**

| # | Decisão | Padrão recomendado | Por quê | Antes de |
|---|---|---|---|---|
| D9 (!) | O quadro do átrio liga só a luz de serviço | Sim; a luz geral vem do plinto | aprovado em `HANDOFF.md` §7.5 | L10 |
| D10 | Descida à caixa-forte | Plataforma no plinto (some a tela, o jogador reaparece na antecâmara). Plano B: a caixa-forte sobe dentro do anel | dá a sala do silêncio sem escada; o grafo é o mesmo | L12 |
| D11 | Assinatura | Segurar `E` (ou o botão de Ação) no púlpito; um toque curto abre «Assinar / Cancelar»; sem nome digitado | o toque não tem "segurar" hoje; as duas formas existem desde L3 | L3 |
| D12 | "Continuar" renasce onde? | No escritório, com uma fala do Jorge resumindo onde o jogador parou | é o começo do turno | L15 |
| D13 (!) | As quatro bolas do saguão | "Mesa de toque": réplicas de manuseio, fora do fio da bola; contam para a medalha da Linhagem | preserva o trabalho de 30/09 | L3 |
| D14 | Códigos | `1998` e `2002` deixam de ser digitados; `1896` fica em duas chaves (exceção de tutorial); o `15` só entra, no modelo e na tranca, com fonte primária | seção 7.2 | L2, L20 |
| D15 | Último degrau de dica | «Ver a ficha de conferência»: a pedido, o caderno abre o texto-fonte com o trecho sublinhado; o jogador ainda digita | nunca entrega sem pedido, não depende do rádio, não exige envelope nem mostrador que gira sozinho | L4 |
| D16 | `R` mirando um objeto pergunta "e isso aqui?" | Sim, uma fala por objeto | fecha "nenhum objeto inerte" | L8 |
| D17 | Catalogar no escuro | Continua valendo | não endurecer guarda existente | L4 |
| D18 | Álbum de figurinhas e modo Visitante | Sim aos dois; o álbum tem 24 no jogo completo | carregam as curiosidades de uma fonte só | L15, L16 |
| D29 | Atalho de doca na Ala 4 | Sai: a pegada da ala só encosta no átrio pela parede da porta principal. O carrinho ganha dois usos (5.4) | não há onde o atalho existir | L20 |
| D30 | Pool de luz | 6 + 2 fixo (sala atual sempre com seis) | as três exigências do rascunho eram incompatíveis em oito spots; dez spots é recompilar o prédio | L10 |

**Arte, tecnologia e ordem**

| # | Decisão | Padrão recomendado | Por quê | Antes de |
|---|---|---|---|---|
| D26 (!) | Ordem dos lotes | Fundações (L5 a L7) e planta do saguão (L8, L9) **antes** da luz e do final da história (L10 a L12) | senão a luz é afinada duas vezes e o maior momento do jogo revela um forro com defeito. Alternativa: L10–L12 logo depois de L4, aceitando refazer a afinação | L5 |
| D19 | Piso do escritório quando a paleta chegar à casca | Manter o maple (declarado na tabela de paletas) | o escritório foi polido com ele | L5 |
| D20 | Escala da bola Spalding | Exposição a no máximo 1,6× com a nota "modelo ampliado"; no exame, tamanho real | uma bola de 57 cm contradiz a etiqueta | L14 |
| D21 | Vitrine corrida | Carcaça por vão, recheio como dado | é o pior asset do jogo | L14 |
| D22 | Câmara de borracha na altura da canela | Subir o nicho para 0,95–1,25 m | é a primeira peça da ala | L14 |
| D23 (!) | KTX2 | **Obrigatório, em L7** (materiais e mídia) | materiais + mídia + texto no pior trio de salas dão ~75 MiB contra 45 do alvo móvel; é a única alavanca que fecha a conta | L7 |
| D24 | Orçamento de textura | Um número só por trio de salas: 45 MiB, somando materiais, mídia de parede e atlas de texto | hoje são 98,6 MiB residentes, com a mídia fora de qualquer portão | L7 |
| D25 | Mezanino | Elevador de cabine com vista real do átrio; plano B: anexo térreo | a escada é o item mais caro do motor | L23 |
| D31 | Teses sem fonte | Antena datada, "a televisão reescreveu o jogo", número da camisa, movimento da Kaizuka: entram só com fonte capturada; o padrão é a sala sem elas | a pesquisa as marcou como sem lastro | L18–L21 |
| D35 | Pós-processamento | Não (um passe de tela cheia custa memória e bateria no celular). Halo do piloto por sprite aditivo; ACES já existe | o ganho visual vem de material, luz e sombra de contato | L13 |

---

## 1. Estado atual e cânone

### 1.1 O que existe e quanto mede

- Três salas: `office` (6 × 7 × 3,2 m, spawn), `atrium` (18 × 18 × 8,4 m), `holyoke` (12 × 16 × 4,2 m).
  12 peças examináveis (4 no átrio, 8 na Holyoke), 5 documentos, 1 tranca (`office-drawer`, `1896`).
- `npm run check` verde (21 etapas). Nenhum dos defeitos deste plano é visto pelo portão atual.
- Bake: 3,0 MB de GLB, 151.976 triângulos; kit único de 2,2 MB (16% dele em receitas que nenhuma sala
  usa). Texturas de material: 43,875 de 45 MiB. Mídia de parede: 54,7 MiB, fora do portão.
- Frame: átrio 20–83 draws, pico de 100 na diagonal sudeste (teto duro móvel); Holyoke 10–83;
  escritório 58–66. Programas acumulados: 34–35, contra orçamento de 25, sem portão.
- Kit do átrio: **56 de 56 lotes**. Escritório: 53 de 53.

### 1.2 Personagens e voz

| | Quem é | Como aparece | Voz |
|---|---|---|---|
| **Você** | o novo curador; sem nome, sem corpo | primeira pessoa; escreve a lápis no caderno | — |
| **Helena** | diretora; quer gente no museu e reabrir às 9h | carta e lista no caderno; bilhetes nas provas de etiqueta; a voz, uma vez, no fim | calorosa, breve, prática, com exclamação; nunca explica mecânica; apresentada como "a diretora" na primeira menção de cada fala (o teste de `test-radio.ts:915-916` cobre duas chaves e é estendido em L3 a toda chave que a cita); a exigência da seguradora ela só anuncia, quem explica o gesto é o Otávio |
| **Otávio** | curador por trinta anos; aposentou-se hoje | recado cortado na secretária eletrônica; lápis vermelho; cartas; notas «— O.» | seca, paciente, professoral; aprova quem lê; sem exclamação |
| **Jorge** | porteiro da noite, 62 anos, na portaria | só rádio; palavras cruzadas, café, radinho de pilha | coloquial («tá», «pra», «hein?»); zoa sem ofender; fecha com «Câmbio»; "curador", "você"; nunca diz hora em fala fixa: lê a do relógio da noite, por extenso; sabe o que o painel do alarme mostra, e só isso |
| **Amadeu Lins** | o Fundador (D4) | vitrine do Fundador, dedicatória, lintel da caixa-forte | uma frase: «Aqui se diz o que cada coisa é.» |
| **O museu** | as etiquetas | placas, etiquetas, fichas | terceira pessoa, até 40 palavras, sem adjetivo de torcida |

### 1.3 O que a abertura prometeu, e o que paga hoje

| Promessa | Onde | Hoje | Paga em |
|---|---|---|---|
| P2, P11 "Reabrimos amanhã às 9h" | carta da Helena, `pt-BR.ts:152-155` | nunca chega | L12 |
| P3 "ele trancava tudo com datas" | P.S., `pt-BR.ts:157-158` | uma gaveta | L3 (gaveta), L19, L20 |
| P4 lista: religar a energia | `museum.ts:563` | risca; cada sala nova desriscaria em save antigo | L3 (lista congelada) |
| P5 lista: catalogar o acervo | `museum.ts:564` | inalcançável (três peças não catalogam) | L4 |
| P6 lista: "Cofre — só o Otávio sabia abrir" | `museum.ts:565`, sem `doneWhen` | nunca risca | L12 (risca com o livro de tombo lido; até lá leva uma anotação a lápis e é promessa datada) |
| P8 planta com cofre circulado e "3 medalhas?" | `office-blueprint.svg` | sem interação; texto assado no SVG | L9 (redesenho com as portas reais; texto fora do SVG), L11 (leitura) |
| P9 relógio parado às 16h47 | `museum.ts:787-797` | anda, e fica errado para sempre | L3 (acertar o relógio; relógio da noite por contagem de marcos) |
| P10 a tempestade | carta, Jorge, guarda-chuva | só texto | L5 (claraboia), L9 (goteira e balde), L10 e L16 (som) |
| P16 "pode atravessar no escuro" | `pt-BR.ts:178-179` | falso: o quadro fica ao lado da porta | L1 |
| P19 cofre de ferro do escritório | `museum.ts:1431` | adereço mudo | L3 |
| P21–P23 três medalhas, cofre sob o átrio, subsolo alagado | bilhete, Jorge, planta | nada existe | L11, L12 |
| P24 plinto de três soquetes | comentário `museum.ts:975-986` | pedestal de quatro botões | L11 |
| P25 atalho da Holyoke | `museum.ts:946-973` | do átrio, "abre pelo outro lado" para sempre | L2 |
| P27 placa de dedicação | `museum.ts:1089-1104` | fala com o jogador; fica às costas dele; biombo na frente | L9 |
| P28 telefone | `museum.ts:1421` | mudo | L3 (secretária eletrônica) |
| P29 quadro de cortiça, carrinho, arquivo de mapas | `museum.ts:1422-1424` | adereços | L15 |
| P30 torre-vitrine | `museum.ts:1032` | sem função | L11 (vitrine do Fundador) |
| P31 seis medalhões na parede de orientação | `atrium-orientation-wall.svg` | ruído (a meta são três) | L9 (seis selos de ala) |
| P32 chapéu do Otávio | `museum.ts:1432` | sem dono no jogo | L3 (fala), L11 (medalha) |

### 1.4 Onde o jogo para hoje

- **Estado máximo alcançável:** três salas acesas, cinco documentos lidos, a gaveta aberta, 8 a 10
  de 12 peças catalogadas (`net-1897` e `gym-suit` são matematicamente impossíveis; `photo-gym` tem
  cone de 1,5°), nenhuma credencial.
- **Onde para:** no instante em que o bilhete do Otávio fecha. Ele manda a três medalhas e a um
  cofre que não existem. O Jorge repete a mesma frase para sempre. Não há final, tela nem fala.
- **Atalho indevido:** a gaveta fica a 3 m do spawn e o teclado só compara a digitação: chega-se ao
  bilhete em 30 segundos, no escuro, sem sair do escritório.
- **O que funciona e fica:** a arbitragem única de alvo e "um `E`, uma ação"; as portas (aquecimento,
  fechamento, reversão); o piloto vermelho como farol; a lanterna que nunca alcança o teto; o motor
  do rádio e da paciência; o LOD de salas.

### 1.5 Cânone fechado por este plano

1. **A casa.** O Museu do Voleibol é o escritório, o átrio (o Jorge e a Helena dizem "saguão"; uma
   fala do Jorge fixa que é o mesmo lugar) e a Ala 1. As Alas 2 a 6 e o mezanino são o "PROJETO DE
   AMPLIAÇÃO" da planta, em obra. O Otávio deixou a ampliação inteira pronta em caixotes na reserva
   (vitrines, fichários, notas a lápis); a obra só desembala. Por isso há trancas e notas dele em
   salas que não tinham parede quando ele saiu.
2. **A tarde.** O Otávio se aposentou hoje. A passagem do acervo estava marcada para as seis. A
   estrada fecha com chuva e o último ônibus é o das cinco; antes de sair, ele gravou o recado no
   aparelho da própria mesa. Às 16h47 a tempestade derrubou a energia, cortou a gravação, parou o
   relógio elétrico e alagou o subsolo. A linha de fora está muda; o rádio interno funciona a pilha.
3. **A chegada do curador.** A mesma estrada o atrasou até as sete. O Jorge subiu a porta de enrolar
   na manivela, levou-o ao escritório com a lanterna pelo saguão apagado (o jogador não viu nada além
   do chão) e voltou ao posto; o trinco elétrico fechou atrás. O guarda-chuva molhado no cabideiro é
   do jogador. Por isso `porter-hello` começa com «É o Jorge de novo».
4. **O que a Helena precisa antes das 9h:** luz; o inventário conferido pelo curador; e os números
   de tombo, que só existem no livro de tombo do Otávio. A seguradora só libera a reabertura com o
   inventário conferido **contra o livro**. É esse o motivo de descer.
5. **Dois cofres, dois nomes.** O **cofre de ferro** (escritório; *iron safe*) guarda o Livro de
   Termos e a prova de etiqueta que o Otávio escondeu da gráfica. A **caixa-forte do Fundador** (sob
   o átrio; *the Founder's vault*) guarda o livro de tombo. A lista da Helena diz «Caixa-forte».
6. **Dois caminhos para a caixa-forte.** A escada de serviço do subsolo, que o Otávio usava todo dia
   (foi por ela que ele deixou a carta, ontem), e a plataforma do plinto, de cerimônia. A escada
   alagou. A plataforma é o único caminho seco, e só se move com a luz geral.
7. **O plinto.** O Fundador pendurou nele a luz geral do átrio, a bomba do subsolo e o motor da porta
   de enrolar: três medalhas assentadas destravam a tampa, e sob a tampa está a chave geral. As três
   medalhas ficavam no plinto. Na obra do piso o Otávio as tirou: a do Curador anda desde então na
   fita do chapéu; as outras duas estão atrás de lacres de conferência. O "3 medalhas?" a lápis na
   planta é a dúvida dele sobre a plataforma ter sobrevivido ao piso novo: ele nunca a testou.
8. **A água.** Uma régua só: antecâmara alagada até o segundo degrau, soleira da caixa-forte seca. A
   água não sobe mais; não sai sem a bomba; a plataforma não desce em poço alagado. Não há urgência
   com relógio: há impedimento.
9. **A portaria** fica além do vestíbulo, atrás da porta de enrolar de aço da entrada sul. O Jorge
   não entra: a porta está sem motor, ele já a subiu uma vez na manivela, e posto é posto. O que ele
   sabe é o que o **painel do alarme** mostra: um contato em cada vitrine, gaveta, cofre, porta e
   soquete do plinto, a lâmpada do púlpito e a luz de recado do ramal do escritório. O que nenhum
   contato vê, ele pergunta. Nas alas novas ele lê a ficha de entrega da obra ou cita o Otávio.
10. **"Desde 1895" é o jogo**, não o museu. O museu não tem idade impressa.
11. **A hora** avança por marcos cumpridos, nunca por minutos (2.2). Não existe cronômetro de falha.
12. **Depois da Reabertura** há um corte declarado («Semanas depois. Fora do expediente.») e o jogo
    segue em turnos de noite. Ala nova chega com o quadro lacrado: por tradição do Fundador («museu
    não se acende com o dedo»), quem liga pela primeira vez é o curador.
13. **O museu, o Fundador e os curadores são ficção declarada** (D32). Os fatos do vôlei, não.

---

## 2. O roteiro completo

### 2.1 A história em uma página

O Museu do Voleibol reabre amanhã às 9h. Você é o novo curador e chegou atrasado, às sete, debaixo de
chuva. O Otávio, curador por trinta anos, se aposentou hoje e não pôde esperar: deixou um recado
gravado, cortado no meio pela queda de energia das 16h47, e a passagem do acervo trancada numa gaveta
que abre com um ano.

A Helena, diretora, precisa de três coisas antes das 9h: luz, o inventário conferido peça por peça e
os números do livro de tombo, que ficou na caixa-forte do Fundador, sob o átrio. A escada do subsolo
alagou. O outro caminho é a plataforma do plinto, e ela só se move com a luz geral, que o Fundador
prendeu a três medalhas. A cerimônia da reabertura vira trabalho de madrugada, feito por você e pelo
Jorge, o porteiro da noite, do outro lado de uma porta de aço.

Na caixa-forte, o livro dá os números, soma o que o museu tem (quase nada é original, e a ficha de
cada peça sempre disse isso) e guarda uma carta: a reforma da Helena tirou das placas a linha que diz
o que cada coisa é, e o Otávio escondeu a prova no cofre de ferro para a gráfica não imprimir. Ele
pede uma coisa: continue declarando. Você sobe, assina o termo de reabertura, amanhece, a Helena
chega e devolve a linha às placas. O museu abre, e o jogo continua: a ampliação é inaugurada ala por
ala, e a última assinatura sobe a porta da rua para você.

**Três verbos.** *Religar* (o jogador vira eletricista), *conferir* (vira conferente), *declarar*
(vira curador). **Quatro atos, oito termos:** Posse; Reabertura; cinco inaugurações; Encerramento.

### 2.2 A linha do tempo da noite

Sem cronômetro. O relógio do escritório, depois de acertado (`E` nele, opcional, desde L3), mostra a
**hora da noite**, que é dado (`nightClock`, M33) e nunca anda para trás em nenhuma ordem de jogo:

- **Pontos.** Cada marco cumprido de uma lista fechada vale um ponto, em qualquer ordem: luminária;
  átrio; Ala 1; gaveta; cofre de ferro; posse; cada três peças catalogadas (quatro pontos); cada
  medalha achada (três); o plinto completo; a luz geral. São quinze. O ponto *n* mostra
  19h10 + (*n* − 1) × 30 min: a luz geral cai por volta das duas da manhã.
- **Três marcos de ordem forçada têm hora própria:** poço esvaziado («quase cinco», pelo corte de
  tempo da bomba), livro de tombo lido («seis e meia», a claraboia clareia), Reabertura (8h55 → 9h).
- **Tempestade e céu** seguem os pontos: chuva forte (1–5), firme (6–11), fina (12–15), parada
  (depois da bomba), dia (Reabertura).
- **Nenhuma fala fixa diz hora.** O Jorge lê a hora do relógio por uma ficha de substituição, por
  extenso e arredondada («passa das dez»). No dicionário, hora em algarismo só na forma «16h47»,
  «8h55», «9h» (classe `clock` do lint) e no visor da secretária.
- Depois da Reabertura o relógio volta a andar de verdade a partir das dez da noite de cada sessão.

### 2.3 Ato por ato, sala por sala

#### Ato I — Posse (L3) · verbo: religar

| Sala | O que acontece | O que o jogador aprende |
|---|---|---|
| Escritório | Escuro. Lanterna (F), caderno da Helena, luminária. A luminária destrava a porta, dá carga ao rádio e faz a secretária eletrônica piscar. `porter-hello`: é o Jorge de novo; o Otávio se aposentou hoje e saiu antes de a estrada fechar; o subsolo alagou. O recado do Otávio (opcional): a gaveta abre com um ano, que está num retrato da Ala 1; o chapéu «é do cargo» | quem são Helena, Otávio e Jorge; que a passagem do acervo foi interrompida |
| Átrio | Travessia no escuro até o piloto vermelho. O quadro liga a **luz de serviço** (a partir de L10; antes, acende tudo como hoje). O pódio tem prompt desde L3 («Plinto do Fundador. Interditado: obra do piso.») | o prédio é maior do que a luz mostra |
| Ala 1 · Holyoke | Entra no escuro; o piloto está na **parede oposta à entrada**, em diagonal. Cruza a sala, acende. O ano está no retrato do Morgan (plaqueta da frente em L3; etiqueta do Otávio no verso a partir de L4) e no arquivo A. Sai pelo atalho, do outro lado, que fica destrancado para sempre | atravessar, acender, ler, abrir um arquivo |
| Escritório | Gaveta do Otávio (`1896`): a folha 1 da passagem de acervo, com **a chave do cofre de ferro** presa. Cofre de ferro: o **Livro de Termos** e a **prova de etiqueta** (o bilhete da Helena, a resposta do Otávio) | o que a tela de título prometia; que há uma briga sobre a linha de baixo das etiquetas |
| Átrio | Púlpito: com luz nas três salas, segurar `E` assina o **termo de posse**. Sequência dirigida: cartão «Termo de posse assinado» e o fecho do Jorge | o acervo agora é seu |

**Fecho honesto.** Em L1 e L2 não há termo: o Jorge deixa de mandar às medalhas e diz o que dá para
fazer hoje (conferência: a última dica só toca com as três salas acesas, então ela dá a luz como
feita). De L3 a L11, depois da Posse, a única promessa datada no caminho é a
caixa-forte: a linha «Caixa-forte» da lista leva a anotação a lápis «hoje não: o subsolo alagou», o
pódio diz que está interditado e o Jorge adia em vez de apontar.

#### Ato II — Reabertura (L11 e L12) · verbo: conferir, depois declarar

| Passo | O que acontece | Reage |
|---|---|---|
| 1 | A página II do Livro de Termos (no púlpito, ou no Arquivo do caderno), com a letra do Otávio, diz onde estão as três medalhas | linhas novas na lista, a lápis |
| 2 | **Medalha do Curador:** por dentro da fita do chapéu. Examinar o chapéu e virar. Pode ser achada antes de tudo | o Jorge só comenta quando ela assenta no plinto (é o contato que ele vê) |
| 3 | **Medalha da Fundação:** na base da vitrine da bola de cadarço, atrás do lacre de conferência. O lacre mostra oito silhuetas; cada peça catalogada preenche uma. Com as oito e a Posse assinada, o lacre é seu | `porter-seal-holyoke` |
| 4 | **Medalha da Linhagem:** na vitrine do Fundador, atrás do segundo lacre: as quatro réplicas da mesa de toque | `porter-seal-atrium` |
| 5 | **Plinto:** uma medalha por toque. Com a terceira, a tampa gira um quarto de volta e mostra a **chave geral** | clique de latão; soquete aceso |
| 6 | **Chave geral:** segurar `E`. A luz geral sobe em cascata, do piso ao teto: é a primeira vez que se vê o pé-direito de 8,4 m, a claraboia e a instalação aérea. A bomba arma; o motor da porta de enrolar volta | sequência dirigida `seq-house-lights` |
| 7 | **Esperar a bomba:** `E` na plataforma, «A bomba está trabalhando. Esperar?». Corte de tempo declarado: «A bomba trabalhou até quase cinco.» O poço aparece seco | `porter-pump-done` |
| 8 | **Descer.** A tela escurece (com o mesmo contrato de aquecimento das portas); o rádio vira chiado | zona sem rádio |
| 9 | **Caixa-forte do Fundador:** antecâmara molhada, porta redonda entreaberta, o lintel com o lema. Na mesa, o **livro de tombo**; a carta do Otávio é a primeira folha, presa com clipe. Ler até a última folha dá a cada ficha do Acervo o número de tombo e soma as categorias em palitos. A relação das ausências, a reserva com as caixas vazias etiquetadas, a prateleira de quarentena e cinco pastas lacradas | toast «O catálogo ganhou os números de tombo» |
| 10 | **Subida.** A claraboia clareia. O Jorge volta ao ar | `porter-after-vault` |
| 11 | **Termo de reabertura**, no púlpito. Sequência dirigida: a tela escurece, «8h55»; a Helena fala pelo rádio do Jorge; o Jorge sobe a porta de enrolar, agora com motor; a luz do dia entra. «Museu do Voleibol — aberto.» Em seguida o corte: «Semanas depois. Fora do expediente.» O jogador reaparece no escritório, à noite | epílogo; fala de abertura do turno |

**Depois da Reabertura.** Luz geral para sempre; a caixa-forte aberta; toda placa de parede ganha a
linha de proveniência (a decisão do curador vira geometria); a vitrine do Fundador troca o traço por
«Curadoria atual: desde a reabertura»; a secretária eletrônica tem um segundo recado do Otávio (a
linha voltou). A porta de enrolar fica baixada no turno da noite.

#### Ato III — A ampliação (L18 a L22) · verbo: conferir

Na caixa-forte há cinco pastas lacradas: são as guias de remessa dos caixotes de cada ala. Quando a
obra entrega uma parede, o lacre da pasta seguinte cai. **Abrir a pasta é a ação que troca o tapume
por porta.** Cada ala repete o laço (entrar no escuro, cruzar, religar na parede oposta, herói,
gesto, tranca, as oito peças) e fecha com o próprio termo, que acende o selo dela na parede de
orientação e deslacra a pasta seguinte.

| Ala | Tese (versão padrão, sem fonte pendente) | Gesto-assinatura (sempre concede algo) | Tranca principal | Ganha |
|---|---|---|---|---|
| 2 · Paris | o jogo vira instituição | contar os marcadores da mesa | roda de presença (catorze, contado) | termo; a primeira peça cujo original o museu admite nunca ter achado |
| 3 · Tóquio | o ano que todo mundo lembra não é o que explica | abaixar na areia (vista baixa do exame no lugar) | punção de data (`1962`) | termo; distintivo `beach` |
| 4 · Ferro e Areia | o jogo se parte em dois; ler em vez de fazer conta | girar a manivela da rede pelas três alturas | fichário do técnico (`1973`) | termo; ferramenta `crate-dolly` |
| 5 · A Reescrita | a década que reescreveu as regras | dar o replay nos dois placares | casar três mudanças com três efeitos documentados (ou lacre) | termo |
| 6 · Global | o presente envelhece sozinho | sentar na quadra do vôlei sentado; contar as faixas de metro da corda | duas rodas de contagem | termo; distintivo `sitting`; os cinco fios fecham |

#### Ato IV — Encerramento (L23 e L24) · verbo: declarar

Com dois fios fechados, o curador chama a portaria diante da grade do elevador e o Jorge a solta
(recado do Otávio no painel dele). No mezanino: o vôlei de neve e o quarto distintivo, a parede de
créditos com o aviso de ficção, a luneta e a vista do saguão. Com as cinco alas inauguradas, as
quatro gavetas do registrador abertas, os cinco fios fechados e o estojo dos moldes resolvido, o
**termo de encerramento** fecha o inventário. Sequência dirigida: «Fim do turno. Amanhece.»; o Jorge
sobe a porta de enrolar **para o curador**, pela primeira vez, e avisa que vai fazer a ronda da
ampliação, que nunca viu acesa (continua no rádio). Do outro lado: o vestíbulo, a portaria, a
garrafa de café, as palavras cruzadas preenchidas, o radinho de pilha, o painel do alarme com os
recados do Otávio, um bilhete do Jorge e, pelo vidro da porta da rua, o dia. O jogo começa no fundo
do prédio e termina na porta da frente. Roteiro completo no Anexo B.13.

### 2.4 O grafo de dependências

Átomos de estado: `power:<sala>` · `doc:<id>` · `fact:<id>` · `cat:<peça>` · `lock:<id>` (aberta) ·
`cred:<tipo>:<id>` · `socket:<medalha>` · `flag:<id>` · `door:<id>` (liberada) · `thread:<id>`
(fechado, gravado em `progress.threadsClosed`) · `room:<id>` (alcançável, derivado). **C** = caminho
crítico de algum termo; **O** = opcional. "Segurar" é o gesto de M41 (teclado e toque).

#### Ato I

| # | Ação do jogador | Exige | Concede | Destrava | C/O | Lote |
|---|---|---|---|---|---|---|
| I-01 | `E` na luminária `office-lamp-switch` | — | `power:office` | porta do átrio, carga do rádio, secretária, relógio, `porter-hello` | C | existe |
| I-02 | Ler o caderno `office-notebook` até fechar | — | `doc:doc-welcome` | diário (Tab) | O | existe |
| I-03 | `E` no rádio `office-radio` | `power:office` | `carried:office-radio` | `R` em qualquer sala | O | existe |
| I-04 | `E` na secretária `office-answering-machine` | `power:office` | `doc:doc-otavio-tape` | linha 5 da lista | O | L3 |
| I-05 | `E` no relógio `office-clock` | `power:office` | `flag:clock-set` | o relógio mostra a hora da noite | O | L3 |
| I-06 | `E` no disco do telefone | — | — (fala «Linha muda.») | — | O | L3 |
| I-07 | Atravessar `atrium-to-office` | `power:office` | `room:atrium` | — | C | existe |
| I-08 | `E` no quadro de serviço `atrium-breaker` | `room:atrium` | `power:atrium` | `porter-atrium-service` | C | existe; chamada em L3 |
| I-09 | Atravessar `atrium-to-holyoke` | `room:atrium` | `room:holyoke` | — | C | existe |
| I-10 | `E` em `holyoke-breaker`, na parede oposta à entrada | `room:holyoke` | `power:holyoke` | `porter-holyoke-lit` | C | L1 (posição) |
| I-11a | Ler o ano em `portrait-morgan` (L3: plaqueta da frente; L4 em diante: etiqueta no verso) | `room:holyoke` | `fact:springfield-renaming` | o ano | C (ou I-11b) | existe; L4 |
| I-11b | Abrir `holyoke-cabinet-a` | `room:holyoke` | `doc:doc-invention-date`, `doc:doc-halstead`, o mesmo fato | o ano | C (ou I-11a) | existe |
| I-12 | Digitar o ano em `office-cabinet` | nada no estado (o teclado compara a digitação; a simulação exige o fato) | `lock:office-drawer`, `doc:doc-otavio-handover`, `cred:tool:service-key` | cofre de ferro; `porter-drawer-open` | C | L3 |
| I-13 | `E` no cofre de ferro `office-safe` | `cred:tool:service-key` (consumida) | `lock:office-safe`, `doc:doc-termos`, `doc:doc-label-proof-office` | a lâmpada do púlpito acende | C | L3 |
| I-14 | Segurar no púlpito `atrium-lectern`: `termo-posse` | `doc:doc-termos`, `power:office`, `power:atrium`, `power:holyoke` | `flag:posse-signed` | **primeiro final**; fecho do Jorge | C | L3 |
| I-15 | Sair por `holyoke-shortcut` | `room:holyoke` | `door:holyoke-shortcut` | atalho nos dois sentidos; `porter-shortcut` | O | L2 |
| I-16 | Catalogar uma peça (12 na casa) | sala da peça | `cat:<id>` | item 2 da lista; lacres | O no Ato I, C no II | L4 |
| I-17 | Pegar o folheto `reception-leaflets` | `room:atrium` | `flag:floorplan` | aba Planta | O | L9 |

#### Ato II

| # | Ação do jogador | Exige | Concede | Destrava | C/O | Lote |
|---|---|---|---|---|---|---|
| II-01 | Virar para a página II do Livro de Termos | `doc:doc-termos` | `doc:doc-three-medals` | linhas 10–12 da lista | O | L11 |
| II-02 | Examinar o chapéu `office-hat` e virar | — | `cred:medallion:curator` | — | C | L11 |
| II-03 | `E` no lacre da vitrine-herói `holyoke-hero-seal` | as 8 `cat:` da Ala 1 (lista congelada), `flag:posse-signed` | `lock:holyoke-hero-seal`, `cred:medallion:founding` | — | C | L11 |
| II-04 | `E` no lacre da vitrine do Fundador `atrium-founder-seal` | as 4 `cat:` do saguão, `flag:posse-signed` | `lock:atrium-founder-seal`, `cred:medallion:lineage` | — | C | L11 |
| II-05 | `E` no plinto `atrium-plinth`, uma medalha por toque | `power:atrium`, a medalha na mão | `socket:<id>`; com as três, `lock:founders-plinth` | a tampa gira; a chave geral aparece | C | L11 |
| II-06 | Segurar na chave geral `atrium-main-switch` | `lock:founders-plinth`, `power:atrium` | `flag:house-lights` | luz geral, bomba, motor da porta de enrolar | C | L11 |
| II-07 | `E` na plataforma `atrium-plinth-lift`: esperar a bomba | `flag:house-lights` | `flag:basement-drained` (corte de tempo) | descer | C | L12 (em L11, promessa datada) |
| II-08 | `E` na plataforma: descer | `flag:basement-drained` | `room:vault` | antecâmara e caixa-forte | C | L12 |
| II-09 | Ler o livro de tombo `doc-accession-ledger` até a última folha (a carta é a primeira) | `room:vault` | `doc:doc-accession-ledger` | número de tombo em cada ficha; soma por categoria | C | L12 |
| II-10 | Ler `doc-sheet-06-absences`; olhar a quarentena | `room:vault` | o `doc:` | — | O | L12 |
| II-11 | `E` na plataforma: subir | `room:vault` | — | `porter-after-vault` | C | L12 |
| II-12 | Segurar no púlpito: `termo-reabertura` | `flag:posse-signed`, `flag:house-lights`, `doc:doc-accession-ledger` | `flag:reopened` | **final da história**; epílogo; corte; Ato III | C | L12 |
| II-13 | Ouvir o segundo recado na secretária | `flag:reopened` | `doc:doc-otavio-tape-2` | — | O | L12 |
| II-14 | `E` na caixa de conferência do quiosque `holyoke-conference-box` | `cat:ball-improvised`, `cat:ball-spalding`, `cat:net-1897` | `cred:badge:indoor` | gaveta QUADRA; aba Coleção | O (C para o Encerramento) | L15 |
| II-15 | `E` na gaveta QUADRA do `office-flatfile` | `cred:badge:indoor` | `lock:registrar-indoor`, folhas 03 e 04 do projeto | — | O (C para o Encerramento) | L15 |
| II-16 | Arquivos da Ala 1, achados e perdidos, carrinho, quadro de cortiça | sala | documentos | — | O | existe; L9; L15 |

#### Ato III

Molde de cada ala `w`, na ordem Paris → Tóquio → Ferro e Areia → A Reescrita → Global:

| # | Ação do jogador | Exige | Concede | Destrava | C/O |
|---|---|---|---|---|---|
| W-0 | `E` na pasta `vault-folder-<w>`, na caixa-forte | `flag:reopened` e, da segunda em diante, `flag:wing-<anterior>-open` | `doc:doc-folder-<w>`, `flag:wing-<w>-delivered` | o tapume vira porta; `porter-wing-delivered` | C |
| W-1 | Atravessar `atrium-to-<w>` | `flag:wing-<w>-delivered` | `room:<w>` | — | C |
| W-2 | `E` em `<w>-breaker`, na parede oposta à entrada | `room:<w>` | `power:<w>` | `porter-<w>-lit` | C |
| W-3 | Abrir a tranca principal | ver abaixo | `lock:<principal>` | — | C |
| W-4 | Catalogar as oito peças da ala (lista congelada, 5.2 a 5.6) | `room:<w>` | `cat:<id>` | — | C |
| W-fim | Segurar no púlpito: `termo-ala-<w>` | `power:<w>`, as oito `cat:`, `lock:<principal>` | `flag:wing-<w>-open` | selo da ala aceso; a pasta seguinte perde o lacre | C |

| # | Ação do jogador | Exige | Concede | C/O | Lote |
|---|---|---|---|---|---|
| P-01 | Contar os marcadores da mesa e girar a roda de presença de `paris-statutes-box` | `room:paris` | `lock:paris-statutes-box`; `doc-prague-memo`, `doc-sixteen-doubt`, `doc-otavio-note-paris` | C | L18 |
| P-02 | Alfinetar no mapa as quatro delegações de fora da Europa (`paris-beyond-europe`) | `room:paris` | `doc-table-plan` | O | L18 |
| P-03 | `E` em `paris-rules-dossier` | `cred:badge:indoor` | documentos | O | L18 |
| P-04 | `E` em `paris-sand-drawer` | `cred:badge:beach` | documentos de praia | O | L19 |
| T-01 | Ler o ano na etiqueta de `kit-cccp-1962` e girar a punção de `tokyo-trophy-punch` | `room:tokyo` | `lock:tokyo-trophy-punch`; `doc-otavio-note-tokyo` | C | L19 |
| T-02 | Exame no lugar de `beach-court-1960`: ir à vista baixa, onde a luz de mão fica rasante e a tampa de garrafa brilha; `E` nela | `room:tokyo` | `cat:beach-court-1960`, `cred:badge:beach` | C (a peça é uma das oito) | L19 |
| T-03 | `E` na gaveta PRAIA do `office-flatfile` | `cred:badge:beach` | `lock:registrar-beach`, folha 01 do projeto | O (C para o Encerramento) | L19 |
| FA-01 | Ler «maio de 1973» na última folha de `coach-dossier` e digitar em `ironsand-coach-file` | `room:iron-sand` | `lock:ironsand-coach-file`; `doc-otavio-note-ironsand`, `doc-wagner-year-doubt` | C | L20 |
| FA-02 | Girar a manivela pelas três alturas (as três vistas de `net-heights-post`) | `room:iron-sand` | `cat:net-heights-post` | C (a peça) | L20 |
| FA-03 | Pegar o carrinho `crate-dolly`, junto da entrada | `room:iron-sand` | `cred:tool:crate-dolly` | O | L20 |
| FA-04 | Tirar o caixote da frente do armário `ironsand-locker-crate` | `cred:tool:crate-dolly` (não consumida) | `lock:ironsand-locker-crate` | O | L20 |
| FA-05 | Lacre do armário `ironsand-kiraly-locker` | `cat:jersey-kiraly`, `lock:ironsand-locker-crate` | `doc-kiraly-file` | O | L20 |
| FA-06 | Mover o caixote pesado da reserva, na caixa-forte | `cred:tool:crate-dolly` | `doc-otavio-crates` | O | L20 |
| FA-07 | `E` em `ironsand-paralympic-drawer` | `cred:badge:sitting` | `doc-arnhem-1980` (nó do fio `sitting`) | O (C para o fio) | L22 |
| R-01 | Dar o replay até o fim (detalhe obrigatório de `scoreboards-pair`) | `room:rewrite` | `cat:scoreboards-pair` | C (a peça) | L21 |
| R-02 | `rewrite-congress-case`: casar três mudanças com três efeitos (só com fonte para os três pares); sem ela, lacre das oito peças | `room:rewrite` | `lock:rewrite-congress-case`; `doc-three-changes` | C | L21 |
| R-03 | `E` em `rewrite-beach-press-file` | `cred:badge:beach` | `doc-beach-olympic` (nó do fio `beach`) | O (C para o fio) | L21 |
| R-04 | `E` em `rewrite-paralympic-drawer` | `cred:badge:sitting` | `doc-standing-paralympic` (nó do fio `sitting`) | O (C para o fio) | L22 |
| G-01 | Contar as faixas de metro dos dois lances da corda e girar as duas rodas de `global-beach-trunk` | `room:global` | `lock:global-beach-trunk` | C | L22 |
| G-02 | Exame no lugar de `court-sitting-lowered-plane`: a vista sentada | `room:global` | `cat:`, `cred:badge:sitting` | C (a peça) | L22 |
| G-03 | Julgar os três lances em `challenge-console` (detalhe obrigatório) | `room:global` | `cat:challenge-console` | C (a peça) | L22 |
| G-04 | Estojo `global-ball-casts`: casar as seis bolas do fio com os três moldes | os seis nós do fio `ball` catalogados | `lock:global-ball-casts`; `doc-otavio-note-global` | O para a ala, C para o Encerramento | L22 |
| G-05 | `E` na gaveta SENTADO do `office-flatfile` | `cred:badge:sitting` | `lock:registrar-sitting`, folha 02 do projeto | O (C para o Encerramento) | L22 |

Regra de escrita para P-01 e G-01: a quantidade contada não aparece **com o seu significado** em
nenhuma chave de texto fora da tranca aberta (lint de padrões, 6.4).

#### Ato IV

| # | Ação do jogador | Exige | Concede | Destrava | C/O | Lote |
|---|---|---|---|---|---|---|
| Z-01 | Completar um fio (Anexo F.1): todos os nós catalogados ou lidos | as salas dos nós; só a partir do lote em que o fio está completo (L22) | `thread:<id>`, gravado | faixa do fio no Acervo; filete do piso | C | L17 (dado), L22 (fecham) |
| Z-02 | `E` na grade do elevador `mezzanine-lift`: chamar a portaria | dois `thread:` quaisquer | `room:mezzanine` | neve, créditos, luneta | C | L23 |
| Z-03 | Exame no lugar da vitrine de neve | `room:mezzanine` | `cat:snow-case`, `cred:badge:snow` | gaveta NEVE | C | L23 |
| Z-04 | `E` na gaveta NEVE do `office-flatfile` | `cred:badge:snow` | `lock:registrar-snow`, folha 05 do projeto | — | C | L23 |
| Z-05 | Pegar a escada de mão e alcançar a prateleira alta do escritório e os pontos altos | `cred:tool:step-ladder` | `doc-otavio-fieldbooks`; figurinhas | — | O | L23 |
| Z-06 | Olhar pela luneta (exame no lugar) | `room:mezzanine` | os fios fechados acendem no piso do saguão | — | O | L23 |
| Z-07 | Segurar no púlpito: `termo-encerramento` | as cinco `flag:wing-*-open`, as quatro `lock:registrar-*`, os cinco `thread:`, `lock:global-ball-casts` | `flag:inventory-closed` | **final do jogo**; a porta de enrolar sobe | C | L24 |
| Z-08 | Atravessar `atrium-to-lodge` | `flag:inventory-closed` | `room:lodge` | portaria, bilhete, o dia | O | L24 |

**Um termo por gesto.** Com mais de um termo assinável, o púlpito oferece o mais antigo; o prompt o
nomeia («Assinar: Inauguração da Ala 6»); o seguinte só aparece depois de o cartão anterior fechar.

#### O roteiro em níveis (o que `simulateProgress` imprime)

`N0` luminária · `N1` átrio · `N2` luz do átrio, Ala 1 · `N3` luz da Ala 1, o ano, peças · `N4`
gaveta, chave · `N5` cofre de ferro, Livro, prova · `N6` **Posse** · `N7` lacres (pedem `N3` e
`N6`); a medalha do Curador é `N0` · `N8` três medalhas · `N9` plinto · `N10` chave geral · `N11`
bomba, caixa-forte, livro de tombo · `N12` **Reabertura** · `N13`–`N17` uma ala por nível (pasta →
porta → luz → tranca → oito peças → termo) · `N18` fios, mezanino, neve, gavetas · `N19`
**Encerramento**.

### 2.5 Por que não há beco

**Sete regras de entrega** (valem para todo lote):

| # | Regra | Portão |
|---|---|---|
| R1 | **Só acrescenta.** De um lote para o seguinte, toda ação que já existia mantém a guarda ou a enfraquece, e concede o mesmo ou mais. Trocar id exige alias de save. Vale a partir do primeiro instantâneo (L2) | `validateAdditive` |
| R2 | **Guardas positivas, listas congeladas.** O que abre, concede ou assina só pergunta "o jogador tem X?". `allRoomsPowered` e `allCatalogued` saem de toda guarda e viram listas explícitas de ids, congeladas no lote que criou o item. Condição negativa só em apresentação (fala, dica, caducidade de chamada) | `gate-uses-negative-condition`, `gate-uses-all-condition` |
| R3 | **Efeito é gatilho, reavaliado na carga.** Disparo único, executado até o ponto fixo depois de cada mudança e depois de carregar um save. Conjuntos que crescem entre lotes (fios) só fecham por gatilho que grava o fechamento, avaliado com a lista completa | `test:triggers` |
| R4 | **Promessa datada.** O que é visível e ainda não tem uso leva `deferred: true`, um aviso no mundo, uma fala que diz "hoje não", e fica fora do caminho crítico. Item de lista que aponta para ela vira anotação sem caixa de riscar. O último lote tem zero | `deferred-on-critical-path`, `deferred-without-notice`; `--final` |
| R5 | **Todo final é um termo assinado, e nada depois dele desliga nada** | `post-ending-disables-action` |
| R6 | **Todo deploy passa nos mesmos portões**, inclusive as fatias de um lote | `npm run check` |
| R7 | **Nenhum texto fala do que o build não tem nem do que o estado desmente.** Toda fala, documento e item de lista declara `mentions: [ids]`; chamada de marco tem `lapsesWhen` | `speech-mentions-missing`, `test:speech-coherence` |

**Sete invariantes** (por que qualquer ordem de visita chega ao fim):

| # | Invariante | Portão |
|---|---|---|
| V1 | O progresso só cresce: nada é perdido, gasto ou fechado, com uma exceção nomeada (V3) | `test:save`, `test:triggers` |
| V2 | Toda guarda é positiva (R2): uma ação disponível nunca deixa de estar | validador |
| V3 | Consumível tem um único consumidor, com efeito permanente. Só existe um: `service-key` → `office-safe` | `consumable-multi-consumer` |
| V4 | Não há estado de falha: sem cronômetro, sem limite de tentativas, sem item que some; todo documento é relido | revisão de schema |
| V5 | De toda sala alcançável volta-se ao átrio. Não há porta de mão única no jogo além do atalho da Ala 1 (que só acrescenta); a plataforma e o elevador sobem e descem sempre | `no-return-path`, `one-way-trap` |
| V6 | Toda tranca e todo ritual têm um último degrau que resolve, a pedido, sem rádio; todo detalhe obrigatório é alcançável | `test:locks`, `test:examine` |
| V7 | Nenhum termo, fecho de ato ou epílogo depende de um objeto opcional. O rádio, o caderno e a lanterna nunca são exigidos | `test:playthrough` (perfil "pula tudo"), `test:ending` |

Consequências: digitar o ano sem ter lido, abrir a gaveta antes da luz, achar a medalha do chapéu no
primeiro minuto, acender a Ala 1 antes do átrio: tudo isso só adianta átomos, e o relógio e as falas
continuam coerentes (R7). Quem nunca lê o caderno fica sem o diário; quem deixa o rádio na mesa perde
as dicas à distância, mas ouve os fechos pelo alto-falante da sala e tem o último degrau das trancas
no próprio painel. Um save de qualquer lote anterior é um estado válido do jogo novo: a migração não
perde átomo (M2), o conteúdo é aditivo (R1) e os gatilhos disparam na carga (R3).

O que a prova não cobre, e quem cobre: divergência entre regra pura e runtime (o robô joga contra o
store real); espaço físico (navegação por inundação); jogador que não entende o que fazer (cobertura
de dicas e um playtest por lote que muda o percurso); GPU e memória em aparelho real (medições de P0,
L6 e L16, feitas pelo dono).

### 2.6 Falhas de roteiro encontradas e como foram fechadas

#### Furos de história

| # | Falha | Como fecha | Lote |
|---|---|---|---|
| 1 | O jogo acaba no bilhete: três instruções sem objeto no mundo | o bilhete vira a folha 1 de uma passagem de acervo e entrega uma chave; a cadeia segue até uma assinatura | L3 |
| 2 | Chega-se ao "fim" em 30 s, sem sair do escritório | abrir a gaveta cedo só adianta a chave; a posse exige luz nas três salas | L3 |
| 3 | «Catalogar o acervo» sem motivo | a seguradora exige inventário conferido pelo curador (carta da Helena) | L3 |
| 4 | «Catalogar o acervo» inalcançável | exame v2; `test:examine` reprova o estado atual antes do conserto | L4 |
| 5 | «Só o Otávio sabia abrir» × «3 medalhas?» | ele sempre desceu pela escada de serviço; a dúvida era se a plataforma do plinto sobreviveu ao piso novo. A carta abre com a resposta | L11, L12 |
| 6 | «Uma medalha de cada era que você catalogar por inteiro» (seis eras, três medalhas, e a Holyoke não dá nenhuma) | «uma de cada parte desta casa»: escritório, Ala 1, saguão. Literalmente verdadeiro | L3 (texto), L11 |
| 7 | Três medalhas na história, quatro discos no plinto, seis medalhões na parede | três encaixes no plinto; seis selos de ala na parede; quatro distintivos nas gavetas do arquivo de mapas | L11, L9 |
| 8 | «Não desce no subsolo» sem por onde descer | a escada de serviço gradeada, com água no segundo degrau (L9); o poço sob a grade do plinto, com a água no fundo (L11); a plataforma (L12). Em L1 a fala vira «o subsolo alagou; hoje ninguém desce». Ninguém diz «debaixo d'água» | L1, L9, L11, L12 |
| 9 | Subsolo alagado: o livro estaria perdido | uma régua só: antecâmara alagada até o segundo degrau, soleira da caixa-forte seca (folha 03, na gaveta QUADRA). A água não sobe mais; só não sai sem a bomba | L12, L15 |
| 10 | Por que a luz geral dependeria de um plinto | interruptor de cerimônia do Fundador: «museu não se acende com o dedo» (folha 04, gaveta QUADRA; fala do Jorge) | L10, L15 |
| 11 | A luz geral, clímax de agosto, é gasta no minuto três | dois estágios: o quadro liga a luz de serviço; a geral é a chave do plinto | L10, L11 |
| 12 | Por que as medalhas estão espalhadas | o Otávio tirou as três do plinto para a obra do piso: a do Curador foi para a fita do chapéu ("desde a obra"), as outras duas para trás de um lacre que só o curador empossado rompe, com a parte conferida | L11 |
| 13 | Por que ninguém liga para a Helena ou para o Otávio | a linha de fora está muda (`E` no disco do telefone diz isso); só o rádio interno funciona | L3 |
| 14 | Por que o Jorge não vem resolver | entre a portaria e o saguão há uma porta de enrolar de aço, sem motor até a luz geral; ele já a subiu uma vez na manivela, para o curador entrar. Posto é posto, e ele não sabe código | L3 (fala), L9 (porta) |
| 15 | O relógio parado às 16h47 não significava nada | é a hora em que o recado foi cortado (visor da secretária) | L3 |
| 16 | O relógio recomeça de 16h47 e fica errado para sempre | acertar o relógio; `nightClock` | L3 |
| 17 | Tempestade sem janela, sem som, sem água | claraboia com vidro trincado, goteira e balde; água sob a grade; som de sala. «Janelas» vira «claraboia» | L5 (claraboia), L9 (goteira e balde), L11 (água no poço), L16 (som) |
| 18 | «Reabertura amanhã às 9h» nunca chega | epílogo | L12 |
| 19 | A planta diz que as Alas 2 a 6 são projeto, e agosto as tratava como abertas | a planta está certa; quem muda é o plano de agosto. Ala não entregue aparece com tapume | L3 (cânone), L9 (tapumes) |
| 20 | «Ele trancava tudo com datas» e há uma gaveta | três trancas de data dele no jogo completo (gaveta, punção, fichário). O que está nas alas veio dos caixotes que ele deixou prontos na reserva; a obra só desembala | L19, L20 |
| 21 | Cofre de ferro à vista do spawn, mudo | é o fecho do Ato I | L3 |
| 22 | Telefone, quadro de cortiça, carrinho, arquivo de mapas mudos | secretária, fios, provas de etiqueta, gavetas do registrador | L3, L15 |
| 23 | O chapéu sem dono | «não é meu, é do cargo» (recado); a medalha do Curador na fita | L3, L11 |
| 24 | A torre-vitrine com fechadura e sem função | vitrine do Fundador, com o segundo lacre | L11 |
| 25 | O Jorge manda «ler as placas» e não há placa legível | placas com texto em toda peça: é pré-requisito de roteiro, não polimento | L8 (as doze placas), L9 (plaquetas do saguão) |
| 26 | A última dica do Jorge aponta para o que não existe | dica por estado; `hint-points-to-nothing`; sem pendência, uma curiosidade | L1 (texto), L3 (dica por estado) |
| 27 | Nenhum marco tem resposta do mundo | uma chamada do Jorge por marco; retorno em três canais | L3, L10 |
| 28 | Quem religa o átrio antes da primeira chamada nunca conhece o Jorge | `porter-hello` é devida sempre; a instrução do quadro é outra chamada | L3 |
| 29 | A placa de dedicação fala com o jogador e fica às costas dele | dedicatória de verdade, na parede que o jogador encara ao sair do escritório | L9 |
| 30 | O fio da bola fecha no saguão; a resposta do ritual está exposta em ordem | mesa de toque fora do fio; o ritual deixa de ser "ordenar seis" e passa a "casar seis bolas com três moldes" (5.6) | L3 (dado), L22 |
| 31 | O plano chama a bola de 1964 de Mikasa; a ficha diz que não sabe o fabricante | vale a ficha (F38), e isso vira um dos bilhetes Helena × Otávio | L19 |
| 32 | O livro de tombo não revelaria nada, porque as fichas já dizem «reprodução» | não há enigma de letra. O livro dá o que falta: os números de tombo (que a seguradora exige), a soma por categoria (um único original na casa) e a linha que a reforma cortou das placas | L12 |
| 33 | O final não dizia o que é «o resto do acervo» | reserva técnica: poucas caixas com peças frágeis e muitas caixas vazias, etiquetadas, uma para cada coisa que o museu procurou e não achou | L12 |
| 34 | Assinar o quê, e onde | o livro de tombo se lê; o termo se assina no púlpito («Este livro é das peças») | L3, L12 |
| 35 | Depois do fim, nada muda no mundo | a linha de proveniência aparece em toda placa; o traço da vitrine do Fundador é preenchido | L12 |
| 36 | «Dois fios abrem o mezanino» não tinha mecanismo | na grade do elevador o curador chama a portaria; o Jorge segue o recado do Otávio colado no painel («quando o curador disser que fechou dois fios, solte a grade») | L23 |
| 37 | O distintivo `snow` não explicava nada além de si | gaveta NEVE: a folha da cobertura (a claraboia trincada) e o dossiê da quarta disciplina | L23 |
| 38 | A escada de mão não tinha uso | prateleira alta do escritório: os cadernos de campo do Otávio; pontos altos das salas | L23 |
| 39 | «A chuva batendo nas janelas» num prédio sem janela | «claraboia» | L5 (o texto só muda quando a claraboia existe) |
| 40 | `doc-halstead` é marcado como carta e afirma a versão contestada | vira nota; diz só o ano e declara a divergência | L1 |
| 41 | A portaria não existe; o prédio não tem porta de rua | entrada principal na parede sul, com porta de enrolar de aço baixada (L9). O motor volta com a luz geral; ela sobe no epílogo e abre para o jogador em L24 | L9, L24 |
| 42 | Depois da Reabertura às 9h, como há "noite" de novo? | corte declarado: cartão «Semanas depois. Fora do expediente.», o jogador reaparece no escritório e o Jorge abre o turno com uma fala | L12 |

#### Soft-locks e quebras de sequência

| # | Risco | Onde | Como fecha | Lote |
|---|---|---|---|---|
| S1 | Tranca que não é de conhecimento abre um modal invisível e congela o jogador | `LockPanel.tsx:107`; `Containers.tsx:276-280`; `PowerControls.tsx:213-219` | `lockRules.attemptLock` é o único caminho; validador `lock-host-kind-unsupported` | L2 |
| S2 | `Portal.lockId` e `DocumentData.lockId` passam no validador e não existem no runtime | `validate.ts:453, 495` | o runtime lê; `document-lock-disagrees-with-container` | L1 (validador), L17 (porta) |
| S3 | O validador de solvabilidade ignora mão única, rituais, medalhas de tranca, consumo | `validate.ts:418-459, 481-489` | `simulateProgress`, com as funções puras do runtime | L2 |
| S4 | Tranca de conhecimento pode apontar para fato não certificado; `digits` não é comparado | `validate.ts:180-189, 262-263` | `knowledge-lock-fact-not-code`, `lock-digits-mismatch` | L1 |
| S5 | Detalhe obrigatório inalcançável (rede, traje, foto) | `Interaction.tsx:166, 364-383` | `test:examine`; `exhibit-uncataloguable` na simulação | L4 |
| S6 | A única saída do escritório depende de a sala vizinha ficar pronta, sem tempo-limite | `MuseumScene.tsx:557-589`; `TransitionDoors.tsx:457-468` | porta abre em modo degradado depois de N segundos | L1 |
| S7 | O prompt some quando o jogador encosta no quadro | `PowerControls.tsx:131-147, 163-166` | proxy de dupla face; colisor; alcance por inundação | L1 |
| S8 | Escada de dicas que não sobe: quem não inclina a moldura fica com «1···» para sempre | `LockPanel.tsx:136-185` | cinco degraus, estado salvo por objetivo, resposta a pedido | L4 |
| S9 | Código contestado (Wagner 1973 × 1974): quem faz a conta pelo ano do título erra | relatório de fatos §1.5 | a fonte mostra mês e ano; a escada leva ao dossiê; a ficha de dúvida mostra a conta que dá errado | L20 |
| S10 | Item de lista que nunca risca, ou que desrisca quando chega uma sala | `museum.ts:563-565` | todo item tem `doneWhen` com lista congelada; `checklist-item-untickable` | L3 |
| S11 | Efeitos repetem quando um detalhe opcional é achado depois | `Interaction.tsx:386-396` | gatilhos de disparo único no store | L2 |
| S12 | Versão nova de save descarta o progresso | `store.ts:234` | `SAVE_VERSION` fica em 1; `progress.contentLot`; migradores por lote de conteúdo; campos desconhecidos preservados; corpus de saves (M2) | L2 |
| S13 | Mover uma peça entre salas cria ciclo (ex.: a bola de 1964 do saguão para a Ala 3 faria a medalha da Linhagem exigir uma ala que exige a Reabertura) | desenho | R1; `guard-strengthened`, `ending-unreachable` | sempre |
| S14 | Recarregar no meio da drenagem, da assinatura ou de uma chamada | — | o estado é a flag; animação e fala são apresentação | L11, L12 |
| S15 | Ficar preso no cofre (sem rádio, sem dica) | — | a sala não tem tranca; a plataforma sobe sempre; a mesa diz «leia até a última folha», a plataforma avisa «o livro ficou por ler» e o púlpito nomeia o que falta | L12 |
| S16 | Ala com a porta principal trancada e atalho de mão única como única volta | desenho | toda ala tem a porta principal nos dois sentidos; a Ala 4 perdeu o atalho da doca (não há parede comum com o átrio) | L20 |
| S17 | Dica que nomeia um lugar que o build não tem | `museum.ts:855-877` | `hint-points-to-nothing`, `radio-hint-coverage` | L1 |

#### As 26 contradições entre agosto e outubro

| # | Contradição | Resolução | Lote |
|---|---|---|---|
| CN1 | cofre no subsolo × subsolo alagado | o alagamento é a trava do Ato II; a bomba está no barramento geral | L11, L12 |
| CN2 | "plinto de três soquetes já construído" | falso; `atrium-central-podium` dá lugar a `atrium-plinth`; corrigir o comentário de `museum.ts:975-986` | L11 |
| CN3 | luz geral como clímax × quadro do átrio no minuto três | dois estágios de luz; `atrium-breaker` mantém o id e vira "Quadro de serviço" | L10 |
| CN4 | o escritório agora é o spawn | cânone; a primeira vista do átrio é composta a partir da porta leste; música no clique da luminária | L9, L16 |
| CN5 | armário do registrador de quatro gavetas | nenhum móvel novo: o arquivo de mapas recebe as quatro etiquetas de disciplina; o armário alto continua sendo a gaveta do Otávio | L15 |
| CN6 | diário e livro de visitas | abas por etapa (caderno → Caderno, Acervo, Arquivo; folheto → Planta; primeiro item → Coleção); os fios são uma seção do Acervo. A assinatura é no Livro de Termos; o livro de visitas é o resumo | L3, L9, L15 |
| CN7 | o Jorge não existia em agosto | ele é o degrau de áudio da escada de dicas | L3, L4 |
| CN8 | a linha do tempo da noite | marcos, não minutos | L3 |
| CN9 | dois "cofres" em português | **cofre de ferro** (escritório) × **caixa-forte do Fundador** (sob o átrio), nas duas línguas (*iron safe* × *the Founder's vault*). `notebook.todo.vault` e `intro.line3` passam a dizer «caixa-forte» | L3 |
| CN10 | origem das medalhas | três partes da casa original | L11 |
| CN11 | seis alas abertas × "PROJETO DE AMPLIAÇÃO" | a ampliação é literal | L3 |
| CN12 | fio da bola × console do átrio | mesa de toque, sem `threads`; os nós do fio são objetos das alas e fazem par com o saguão | L3, L19+ |
| CN13 | exclusividade de numerais | lint com `Fact.printedIn` e três exceções declaradas | L2 |
| CN14 | escada de dicas e formato das trancas | teclado de N dígitos, roda, punção; fonte por tranca | L4, L17 |
| CN15 | "não cataloga se não virou" × a matemática do exame | exame v2 | L4 |
| CN16 | efeitos de destravamento só em peça | gatilhos; `Lock.onOpen` | L2 |
| CN17 | o atalho que nunca vira atalho | `progress.doorsReleased` | L2 |
| CN18 | "atravessar no escuro" × quadro ao lado da porta | o quadro vai para a parede oposta à entrada (oeste, lado sul); todas as alas repetem | L1 |
| CN19 | por que catalogar | a seguradora | L3 |
| CN20 | placa de dedicação | dedicatória real, na parede oeste | L9 |
| CN21 | nome e idade do museu | Museu do Voleibol; «O JOGO DESDE 1895» | L1 |
| CN22 | a tempestade que não se vê | claraboia, goteira, água, som | L5, L9, L11, L16 |
| CN23 | o final não conhece Helena, Jorge nem as 9h | epílogo | L12 |
| CN24 | mezanino | depois das alas; `EraId` ganha `mezzanine` e `lodge` | L23 |
| CN25 | etiquetas emprestadas e fato trocado | chave própria por detalhe; `filipino-spike` revelado por um documento que fala do ataque | L4 |
| CN26 | texto da Holyoke × correções da pesquisa | as correções vencem; asserções em teste | L1 |

#### Falhas achadas na revisão adversarial do rascunho, já fechadas neste plano

Furos de história e de continuidade:

| # | Falha | Como fecha | Lote |
|---|---|---|---|
| 43 | O epílogo, o fecho da Posse e a luz geral só chegavam pelo rádio, que é opcional: quem o deixa na mesa assina a Reabertura e não ouve nada | fechos de termo, luz geral, bomba e epílogo são **sequência dirigida** (M42): legenda própria, cortam o que estiver no ar, não dependem de rádio nem de alcance, só contam como vistas ao terminar. Na ficção, saem pelo alto-falante de chamada da sala («daqui da portaria eu falo com o prédio inteiro») | L3, L5 (a grade na casca) |
| 44 | As falas de marco tinham hora fixa e supunham a ordem canônica: «passou das dez» depois de amanhecer; «meia-noite» no minuto dois | relógio por contagem de marcos (2.2); nenhuma fala fixa diz hora; cada chamada tem `lapsesWhen`; `test:speech-coherence` nas 500 ordens | L3 |
| 45 | Lacres, plinto e chave geral não pediam a Posse nem a luz do átrio: dava para fechar a geral com o saguão apagado e o quadro vermelho | os lacres pedem `flag:posse-signed`; plinto e chave geral pedem `power:atrium` (ações novas, não fere R1) | L11 |
| 46 | A drenagem era instantânea: o jogador descia durante a fala da luz geral e, na volta, ouvia «a plataforma destrava agora» | "esperar a bomba" é ação do jogador, com corte de tempo declarado; a fala caduca se o poço já secou | L12 |
| 47 | O epílogo citava as provas de etiqueta, opcionais e de um lote posterior; a Helena dizia tê-las achado numa mesa onde não esteve | a prova do escritório está no cofre de ferro, no caminho da Posse; a carta é a primeira folha do livro de tombo; a Helena reage ao termo que o Jorge leu para ela | L3, L12 |
| 48 | "A letra do tombo" era enigma e não era; seis das doze peças não tinham letra; «quase não há original»: na casa eram zero | sem enigma. Seis categorias fechadas (7.8), por extenso na ficha. A bola do Fundador entra no livro como tombo nº 1, o único original da casa; a frase da carta é gerada da contagem real | L8, L12 |
| 49 | O Otávio não teria como pôr a carta numa caixa-forte que só abre com três medalhas que ele mesmo tirou | ele descia pela escada de serviço, que alagou (cânone 6) | L9, L12 |
| 50 | As medalhas tinham três versões («tirei as três» × «sempre andou no chapéu» × «polia as três toda sexta») | uma versão (cânone 7): no chapéu "desde a obra" | L11 |
| 51 | Onde estava o jogador às 16h47, numa sala com trinco elétrico e uma secretária gravando? | chegou às sete, levado pelo Jorge (cânone 3); o Otávio gravou no próprio aparelho antes do ônibus das cinco | L3 |
| 52 | O Jorge reagia ao que nenhum painel de energia mostra (peça conferida, medalha num chapéu, conteúdo de livro) | o painel é o do alarme (cânone 9); o que contato não vê vira pergunta; a medalha do chapéu só é comentada no plinto | L3 |
| 53 | Portaria colada no átrio, com janela acesa: por que ele não entra? | porta de enrolar de aço sem motor (cânone 9); no lugar da janela, uma fresta de lanterna por baixo da porta | L9 |
| 54 | O Encerramento repetia a porta que já tinha subido na Reabertura e mostrava a portaria vazia com o Jorge no rádio | a porta sobe no epílogo e volta a descer no turno da noite; no Encerramento sobe para o curador; o Jorge avisa que foi fazer a ronda da ampliação e segue no rádio | L12, L24 |
| 55 | Trancas, notas e respostas do Otávio em alas que não tinham parede quando ele saiu | os caixotes prontos na reserva (cânone 1); as pastas lacradas são as guias de remessa | L12, L18+ |
| 56 | A água tinha três níveis («debaixo d'água», «segundo degrau», rente à grade) e uma urgência sem consequência | uma régua (cânone 8); a folha 03 perde o imperativo | L1, L11 |
| 57 | O item «Cofre» da lista riscava no cofre errado; em inglês o texto publicado já diz *vault* | D34: a linha diz «Caixa-forte» e só risca com o livro de tombo lido; a Helena ganha uma quarta linha («Plinto: as três medalhas, para a cerimônia») | L3, L11 |
| 58 | Depois do epílogo: dia ou noite? Cinco alas prontas de uma vez? Por que apagadas? | corte declarado; alas em sequência, abertas pela pasta; quadro lacrado por tradição (cânone 12) | L12, L18 |
| 59 | Textos chegavam lotes antes do objeto (claraboia, relógio, mesa de toque, dedicatória, planta) | claraboia na casca em L5, e o texto só muda aí; o gesto do relógio em L3; saguão (L9) antes das medalhas (L11); planta redesenhada em L9; R7 | vários |
| 60 | O destino do Otávio só existia num recado opcional: sem ele, a carta final lê como testamento | `porter-hello` diz que ele se aposentou hoje; há lembrete da secretária; depois da Reabertura, um segundo recado | L3, L12 |
| 61 | A seguradora: o motivo se anulava (os números de tombo estavam no verso das peças) e nunca era pago | os números só existem no livro; a Helena fecha o fio no epílogo («A seguradora já tem os números») | L12 |
| 62 | «Passar por baixo da rede»: a borda de baixo fica a 1,36 m e o olho a 1,62 m; não há agachar | o gesto vira uma vista do exame no lugar: de pé junto à rede, a fita logo acima do olho. Na Ala 4, a manivela mostra três alturas, sem travessia | L4, L20 |
| 63 | Proveniência: «fac-símile» para o que a pesquisa diz não existir; «pela primeira vez no mundo» falso | pasta de Paris: «RECONSTITUIÇÃO. Nenhum exemplar localizado.»; manual e guia são reconstrução tipológica até haver scan | L8, L18 |
| 64 | A tese do `1973` («todo site diz o ano seguinte») era falsa: quase toda fonte aberta diz 1973 | a divergência real é a conta do Hall da Fama; textos refeitos (B.10) | L20 |
| 65 | Gestos-assinatura sem consequência no grafo (manivela, replay, console, luneta) | cada um é o detalhe obrigatório de uma peça da lista da ala, ou marca algo no caderno | L20–L23 |
| 66 | Falas presas ao apagão e à chuva continuavam depois deles | `RadioReply.when` em toda fala de apagão ou chuva; classe "estado da noite" no lint | L3 |

Soft-locks e quebras de sequência:

| # | Risco | Como fecha | Lote |
|---|---|---|---|
| S18 | "Segurar `E`" não existe no toque (`MobileControls.tsx:275` é `onClick`; o teclado descarta `event.repeat`): no celular nenhum termo seria assinável | M41: "segurar" é uma intenção de `primaryAction`, com progresso visível e cancelamento, no mesmo caminho para teclado e toque; toque curto abre «Assinar / Cancelar». Caso em `test:mobile-controls` | L3 |
| S19 | Exame no lugar sem regra de catalogação, com duas dessas peças no caminho crítico | regra completa em 6.4: vistas autorais, a primeira nunca revela, troca igual em teclado e toque, o detalhe marca por permanência; ramo próprio em `test:examine` | L4 |
| S20 | Fios: nós chegando ala a ala reabririam um fio fechado; um save antigo abriria o mezanino sem cruzar o prédio | `completeFromLot`, fechamento gravado, nó pode ser documento; tabela dos cinco fios no Anexo F.1 | L17, L22 |
| S21 | Estojo dos moldes: seis moldes para três relevos; a ordem não se deduz | ritual `match` de muitos para um: seis bolas, três moldes; `ritual-items-indistinguishable` | L22 |
| S22 | Baú da corda: a quadra não cabe na sala e contar nós dá 9 e 17, ou 7 e 15 | a corda fica num cavilheiro de parede, em dois lances rotulados, com faixas alternadas de um metro; `test:locks` conta as faixas na geometria assada | L22 |
| S23 | Ala 4: quadro e carrinho atrás da porta que pede o carrinho; atalho sem parede comum | sala contínua, sem tranca interna; o atalho sai (D29); quadro na parede oposta, carrinho junto da entrada | L20 |
| S24 | Quadro da Holyoke: o "fundo" proposto era a parede da entrada | parede oeste, lado sul; teste de farol com ângulo e oclusão (H-26) | L1 |
| S25 | A dica do caderno, passo opcional, bloqueava todas as outras | vale só enquanto o jogador não saiu do escritório | L3 |
| S26 | Púlpito com mais de um termo assinável | um termo por gesto, o mais antigo primeiro, nomeado no prompt | L3 |
| S27 | `doc-three-medals` concedido sem ser lido | só ao virar para a página II; o cofre concede apenas `doc-termos` e a prova | L3, L11 |
| S28 | Distintivo de praia dependia da lanterna, que o plano dizia não ser exigida | vista baixa autoral; a luz de mão do exame é que fica rasante | L19 |
| S29 | A sala sem portal (caixa-forte) não tinha caminho de aquecimento de GPU | o elevador cumpre o contrato da porta: aquece o destino, segura o escuro até a sala ficar pronta, com tempo-limite | L12 |
| S30 | Save: "migradores por versão" com `SAVE_VERSION` descartando tudo; condições "save anterior a L*n*" indistinguíveis | `contentLot`, flags postas pelo migrador, campos desconhecidos preservados (M2) | L2 |

---

## 3. Correções do átrio e da Holyoke

Mesmo método da rodada do escritório (`HANDOFF.md` §9.1): ler o caminho de código, tentar refutar a
suspeita com simulação e só então registrar. São 34 defeitos e 4 restrições no átrio e 53 na Holyoke,
agrupados em 14 frentes. Gravidade: no átrio, **B** bloqueador, **G** grave, **M** menor, **A**
acabamento; na Holyoke, **S1** bloqueia objetivo, **S2** alto, **S3** médio, **S4** baixo. A coluna
"Teste" é o portão que precisa reprovar o estado atual antes do conserto e passar depois.

### 3.1 Frente 1 — Quadros de energia e chegada

| # | Sev. | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|
| ÁT-A1 | G | `PowerControls.tsx:131-147, 163-166`; `museum.ts:909` | andar reto para a luz vermelha até parar: a cápsula fica em x = −8,539, dentro do proxy e da caixa do quadro; o prompt some nos últimos 21 cm e `E` não faz nada | proxies de interação com `side: DoubleSide`; colisor no `breaker-panel`; regra: nenhum alvo contém o ponto mais próximo que a cápsula alcança | `test:power`: do ponto onde a cápsula para, o raio acerta o proxy; raio com origem dentro do proxy acerta | L1 |
| ÁT-A2 | M | `validate.ts:206-247, 1281-1345`; `museum.ts:909, 1095, 1109, 1120, 1131` | quadro 10,5 cm à frente do lambri e 25,5 cm do reboco; mural de orientação 19,5 cm solto; de lado, placas flutuando | assentar no reboco ou num painel de serviço; recortar o lambri atrás; estender `validateWallMounts` a controle, arte, placa e dispositivo | `validate:content`: `wall-fixture-off-the-wall` | L10 (quadro), L9 (arte) |
| ÁT-A3, H-25 | M, S3 | `bake.mjs:739-744`; `powerControlLightRig.ts:58-67`; `fixtures.mjs:647-661`; `PowerControls.tsx:115-169` | a "luzinha vermelha" é uma point light sobre uma lente verde; depois de religado, o quadro fica idêntico | o quadro vira dispositivo com estado: lente `led-red` → `led-green`, alavanca num pivô que desce, estalo de contator; halo pequeno (0,6–0,8 m) | `validateBake` exige `breaker-panel__led` e `__lever`; `test:power`: material e ângulo nos dois estados | L1 (lente emissiva e nós `__led` e `__lever` nos dois quadros), L10 (estado, alavanca e som) |
| ÁT-A4 | G | `PowerControls.tsx:221`; `RoomLighting.tsx:131-139`; `Hud.tsx:428-459`; `museum.ts:819-852` | `E`: toast e sino; a luz troca num quadro, quase toda atrás do jogador; o Jorge fica mudo | som de alavanca e relés; focos em cascata de longe para perto em 1,2 s (interpolar intensidades, sem programa novo); chamada `porter-atrium-service` | `test:radio`: toca uma vez e não repete em save antigo; `test:power`: `powerRampIntensity(t)` monotônica | L3 (chamada), L10 (rampa e som) |
| ÁT-A5 | M | `pt-BR.ts:169, 177, 193`; `MuseumMap.tsx:189-191` | "parede oeste" num jogo sem bússola | direção relativa nas falas («do outro lado do saguão, em linha reta»); seta de direção e norte na planta | `validateTranslations`: palavras cardeais proibidas em dica; `test:map`: o marcador recebe o yaw | L1 (falas), L2 (planta) |
| ÁT-A6 | M | `Devices.tsx:527-538`; `deviceRules.ts:88-98, 154-162`; `radioCall.ts:103-108` | (a) rádio na mesa continua legendando no átrio; (b) quem religa com a primeira chamada no ar ainda lê "procure a luzinha"; (c) quem religa antes nunca conhece o Jorge | (c) `porter-hello` sempre devida, separada da instrução do quadro; (a) suspender e retomar fora do alcance; (b) cortar para a fala de reação quando a condição cai | `test:radio`: os três cenários pelo caminho real | L3 (c), L10 (a, b) |
| H-26 | S3 | `museum.ts:1230, 1236-1256`; `pt-BR.ts:178-179` | o quadro da ala fica na parede da própria entrada (leste), 2,2 m ao norte da porta, atrás de quem entra; a dica diz só "lá dentro" | quadro na **parede oposta à entrada** (oeste), lado sul: `[-5.86, 1.15, 2.2]` local, `rotationY: +π/2`, **validado em P0** (`docs/lotes/P0-linha-de-base.md`): fica 0,57 m ao sul do mural (que acaba em z = 1,4), a 20,8° do eixo de entrada e com a visada livre; a primeira proposta, z = 5,0, cai atrás da vitrine-herói. Longe da vitrine corrida e do emissor `holyoke-clock`. O jogador cruza a sala em diagonal e sai pelo atalho, na parede leste. Lente `led-red` emissiva já em L1. Dica com direção relativa | `test:opening` (teste de farol): do ponto e da orientação de entrada, o piloto fica a ≤ 35° do eixo, subtende ≥ 6 px (a lente de hoje, de 5,8 cm, dá 3 px a 11,5 m: o teste mede o clarão ou o quadro, ou a lente cresce para 12 cm) e a linha de visão não cruza colisor (vitrine-herói, quiosque); `test:navigation`: rota porta → quadro → atalho | L1 |
| H-27 | S3 | `museum.ts:819-852, 563-566` | acender a ala, catalogar, abrir arquivo, aprender o ano: nada responde | chamadas `porter-holyoke-lit`, `porter-first-catalogued`, `porter-drawer-open`; item de lista «Ala 1: n de 8» | `test:radio`: cada marco tem exatamente uma chamada | L3 |

### 3.2 Frente 2 — Luz apagada e acesa

| # | Sev. | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|
| ÁT-B1, ÁT-F2 | G, M | `glb.mjs:87`; `bake.mjs:961-1060`; `materialSpec.ts:54-57`; `RoomWallArt.tsx:149-157`; `museum.ts:1114, 1125, 1136, 1147-1181`; `RoomText.tsx:122-131` | átrio sem energia e sem lanterna: banners, sanca do teto, fitas, halo do plinto, pendentes e letreiros acesos; o teto já se lê | emissão por estágio de luz da sala: uma vista de materiais por sala para a biblioteca inteira (clone por sala, mesmo programa), com emissão e `envMapIntensity` dirigidos pelo estágio; sai a `ambientLight` global (sua contribuição vai para o ambiente); `selfIllumination` e texto de placa pela mesma escala; lista explícita de emergência (pilotos, placas de porta mais escuras) | `test:materials`: toda família emissiva de `room.kit` vale zero sem energia; `test:room-runtime`: nenhum material com emissão fora da lista de emergência | L10 |
| ÁT-B2 | G | `museum.ts:898-913`; `pt-BR.ts:139` | o "quadro geral" acende no minuto dois a luz que o plano guarda para o final | `RoomData.lightingStages` (`dark`, `service`, `house`); o quadro liga `service` (cinco poças baixas, do lambri para cima no escuro); `house` fica preso à chave do plinto; renomear `power.atrium.title` | `test:power`: `lightingStageFor('atrium', progress)`; contagem de slots invariável entre estágios; irradiância no forro abaixo do limiar em `service` | L10 |
| ÁT-B3 | A | `galleryLightRig.ts:93-141`; `src/scenes/MuseumScene.tsx:849-857` | abrir qualquer porta apaga quatro dos cinco focos do átrio com o jogador ainda nele | pool fixo **6 + 2**: a sala onde o jogador está fica sempre com seis slots; a sala revelada recebe a lavagem e a chave mais próxima da porta; a troca acontece ao cruzar o plano da porta, interpolada em 0,4 s | `test:transition-door`: a assinatura de luz da sala atual não muda entre porta fechada e abrindo; a soma de slots é constante | L10 |
| ÁT-B4 | M | `museum.ts:909, 1230`; `powerControlLightRig.ts:61-66` | os dois quadros ficam costas com costas a 0,77 m; o piloto de um ilumina o piso da outra sala | mover o quadro da Holyoke (H-26); alcance do piloto ≤ 0,8 m | `test:power`: nenhum piloto alcança o interior de outra sala | L1 (posição), L10 (alcance do piloto) |
| ÁT-B5, H-08 | A, S3 | `flashlightRig.ts:44, 56-59`; `Flashlight.tsx:77-86`; `Hud.tsx:709-727` | examinar no escuro mostra um objeto quase preto; no toque não dá para acender a lanterna durante o exame | luz de mão própria do exame, no slot da lanterna (contagem de luzes igual); botão de lanterna visível no exame | `test:materials`: irradiância mínima na peça segurada, sala escura, lanterna apagada | L4 |
| ÁT-B6, H-37 | M, S3 | `store.ts:38-40`; `MuseumApp.tsx:103-114`; `MuseumScene.tsx:726` | brilho, movimento e qualidade existem no store e não têm tela | tela de ajustes (seção 8.6); o ambiente responde ao brilho por uniform | `test:opening-flow`: regra pura dos ajustes | L16 |
| H-24 | S2 | `galleryLightRig.ts:67-74, 93-102`; `museum.ts:1287-1293` | sete focos autorados, cinco slots: `sampleEvenly` descarta o do meio da vitrine e o da rede; a bola-herói não recebe nenhum cone | cinco chaves com alvo declarado (tabela de 4.7): herói; vãos 1–2 da vitrine corrida; vãos 3–4; rede e traje (o traje vai para junto do poste); nicho da câmara e arquivos. O validador reprova foco excedente | `test:render-performance` com as salas reais: todo `ceiling-spot` com alvo recebe slot; **iluminância analítica mínima** (chaves + lavagem) em toda peça examinável | L10 |
| CAP-5, CAP-10 | — | `museum.ts:1067-1078, 1287-1293` | átrio "aceso" continua escuro (lambris, portas, recepção, lounge pretos); arquivos da Holyoke no breu com a sala acesa | luz de serviço legível: cinco chaves re-apontadas (4.7), portas marcadas por placa emissiva (sem luz), a quinta chave da Holyoke nos arquivos; valores de `house` por superfície em 4.7 | `test:power`: luminância analítica mínima em porta, balcão e arquivo, por estágio; capturas de referência por estágio | L10 |

### 3.3 Frente 3 — Examinar e catalogar (o verbo central)

Tudo sai de `src/engine/Interaction.tsx` para um módulo puro, `examineRig.ts`, com suíte própria
(`npm run test:examine`). A suíte tem de reprovar os dados atuais de `net-1897`, `gym-suit` e
`photo-gym` antes de qualquer conserto.

| # | Sev. | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|
| H-01 | S1 | `Interaction.tsx:166, 331-334, 364-383`; `museum.ts:353-364, 435-440, 486-491` | a origem da peça vai a 0,42 m; detalhe a mais de 0,42 m da origem nunca acende: rede e traje impossíveis, foto com cone de 1,5° | pivô no centro do volume; cada detalhe ganha `normal` explícita; teste `normal · direção para a câmera` | todo detalhe obrigatório tem orientação que o revela, em ≥ 4% das orientações e ≤ 300 px de arrasto num eixo | L4 |
| H-02, AS-S8 | S1 | `Interaction.tsx:331-334`; `MuseumScene.tsx:183-190` | a Spalding (2,65×) cobre a tela; a rede some; do manequim vê-se o pé | `examineFit(bounds, fov, aspect)`: a esfera envolvente ocupa cerca de 60% do menor campo; a escala de exposição não entra no exame; zoom por roda e pinça; rede e manequim com `examine: 'in-place'` (vistas autorais; a regra completa está em 6.4, "Exame no lugar") | em 16:9 e 844 × 390 a peça cabe em ≤ 70% do quadro e fica a ≥ 0,2 m da lente | L4 |
| ÁT-C1, H-03 | G, S2 | `Interaction.tsx:339-348` | a inclinação usa o X do mundo: certa olhando para o norte, invertida para o sul, vira rolagem para leste e oeste; o arrasto horizontal é sempre invertido | guinada em torno do "para cima" da câmera, inclinação em torno da direita da câmera, sinais de manipulação direta; `examineDrag` puro | o deslocamento em tela do ponto frontal é o mesmo para as quatro guinadas de câmera e tem o sinal do arrasto | L4 |
| H-04 | S2 | `MuseumScene.tsx:341-382`; `Interaction.tsx:300-318` | examinar o retrato levanta a moldura e deixa a fotografia na vitrine | a impressão e o crédito dentro do grupo `exhibit:<id>`; no exame, some só a linha de crédito | `test:room-runtime`: toda peça com `mediaId` tem a impressão como descendente do grupo | L4 |
| ÁT-C2, H-05, H-10 | G, S2, S4 | `museum.css:273-296`; `Interaction.tsx:166, 235-240, 255-259` | o painel cobre a metade de baixo da peça; rolar o texto gira a peça | em paisagem, painel em coluna lateral (≤ 38% da largura) e peça no centro da área livre; `pointerdown` dentro do painel não gira; só botão primário | `examineLayout(viewport)`: peça e painel não se cruzam em 1280 × 720 e 844 × 390; `startsExamineDrag(target, button)` | L4 |
| ÁT-C3, H-06 | G, S3 | `museum.ts:163-180, 325-332, 408-414`; `Interaction.tsx:364-396` | a bola de cadarço cataloga no ato em 49% das posições; o guia de 1916 cataloga no instante do `E` e grava um fato | detalhe obrigatório no verso; regra do giro mínimo (só conta depois de algum giro acumulado); validador reprova obrigatório visível na pose de repouso | `validate:content`: `hotspot-visible-at-pickup`; `test:examine`: nenhum registro com arrasto zero | L4 |
| H-07 | S3 | `Interaction.tsx:375-382`; `Hud.tsx:351-362` | achar um detalhe não dá retorno; no telefone a lista fica abaixo da dobra | tique, o texto do detalhe por 1,5 s acima do painel, rolagem automática; «Anotado no caderno» ao aprender um fato | `hudRules.hotspotReveal(prev, next)` | L4 |
| ÁT-C5, H-09 | M, S3 | `Interaction.tsx:92-148`; `interactionTarget.ts:38-42` | bola de 21 cm é alvo pequeno no toque; a rede é 93% furo; dá para pegar uma peça através do biombo ou da tela de entrada | volume de mira por peça derivado das bounds (mínimo 0,35 m); oclusão contra os colisores da sala | varredura de doze ângulos: olhar o centro da rede a 1,5 m a foca; mirar por trás da tela não foca a câmara | L4 |
| ÁT-C6 | A | `Interaction.tsx:216`; `Hud.tsx:351-362` | cada exame solta o ponteiro; o `*` não tem legenda; nada indica para onde girar | girar com o ponteiro travado; guia de arrasto no primeiro exame; depois de 8 s, brilho de borda no lado do detalhe; ajuda por tipo de peça em vez de «Vire-a» | regra pura de ajuda por tipo | L4 |

### 3.4 Frente 4 — Peças, suportes e detalhes

| # | Sev. | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|
| H-13, AS-H1, CAP-1 | S2 | `museum.ts:371, 399, 448, 477`; `holyokeDecor.mjs:240-267`; `validate.ts:1181` | as quatro peças da vitrine corrida cruzam um montante; o guia está dentro da tábua; o retrato (fonte do código) é cortado por prateleira e montante | `buildHistoryCaseRun` exporta `layout` (centro de cada vão, topo de cada prateleira, plano do forro); cada peça no centro de um vão, apoiada no topo real; quadros num vão sem prateleira alta | `test:kit`: peça × caixas do `layout`: zero interseção, apoio no topo (±0,5 mm), ≥ 3 cm de montante, quadro a ≤ 5 mm do forro | L1 |
| H-11, CN25 | S2 | `museum.ts:298, 438, 489` | três detalhes usam o texto de outra peça (a câmara "tem cadarço", o traje "tem costura de bola", a foto "tem soquete") | três chaves novas em pt e en; `filipino-spike` revelado por `doc-filipino-bomb` | `hotspot-label-foreign` | L4 |
| H-12 | S2 | `museum.ts:297, 321, 325-332`; `kit.mjs:642-656, 676-677, 1126-1174` | o detalhe não está onde o modelo mostra a coisa: bico em cima, detalhe embaixo; "marca do fabricante" sobre um bico de válvula; a plaqueta do retrato não existe | cada gerador exporta `anchors`; modelar o carimbo oval; tirar o bico da bola de cadarço | `test:kit`: todo detalhe a ≤ 2 cm de um anchor | L4 (etiqueta de conferência no verso, em texto de runtime), L14 (carimbo modelado, sem bico) |
| H-14 | S3 | `FramedMedia.tsx:32, 71-79`; `kit.mjs:1126-1174` | o cartão creme do runtime é maior que a moldura assada | uma fonte só: a moldura assada define a abertura | `test:kit`: impressão ⊂ abertura | L4 |
| H-15 | S3 | `museum.ts:308-311`; `pt-BR.ts:315-316` | bola de 57 cm com etiqueta de 20 cm | D20; validador exige `scaleNoteKey` quando `scale ≠ 1` | validador | L14 |
| H-16, CAP-15 | S3 | `museum.ts:287-289`; `holyokeDecor.mjs:123-155` | a câmara de borracha fica a 33 cm do chão, tapada pelo tampo | D22; bola de basquete ao lado como par não interativo | validador: centro de peça examinável entre 0,8 e 1,9 m, salvo exame no lugar | L14 |
| H-17 | S4 | `bake.mjs:292, 331`; `museum.ts:1332` | borracha e lã em couro; o friso recorta o rosto do Morgan a 134 px/m | materiais certos; recorte por foco ou outra imagem | `test:materials` | L14 |
| ÁT-C4, CN12 | G | `museum.ts:159-270`; `pt-BR.ts:288-292` | o saguão entrega os heróis das Alas 3, 5 e 6 e imprime `1998` | mesa de toque: réplicas de manuseio, sem `threads`; o ano pode ficar (deixou de ser código) | lint de numerais; `thread-single-room` | L3 (dado), L8 (texto) |
| ÁT-C7 | A | captura `a07`, `a10` | placas de latão sem gravação; máscaras de painel com ilhas; «dimples» | placas com texto; gomos tesselados (AS-A1); «covinhas» | `test:signage` | L7 (bolas), L8 (texto), L9 (plaquetas) |

### 3.5 Frente 5 — A cadeia do `1896` e as dicas

| # | Sev. | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|
| H-18 | S2 | `museum.ts:457-468`; `pt-BR.ts:354-359` | a plaqueta só aparece com arrasto vertical para cima; girar de lado nunca a revela; a etiqueta visível mostra 1895 e 1891 | a data vai para o **verso** (normal −Z), como papel colado com `RoomText`: o jogador lê o ano na peça | o detalhe que revela o fato de uma tranca é alcançável só com arrasto horizontal ≤ 250 px e não nasce visto | L4 |
| H-19, EN-A5 | S2 | `LockPanel.tsx:65-77, 136-185`; `pt-BR.ts:104, 108` | o degrau de 90 s repete a pergunta; três erros revelam "1"; fechar e reabrir zera; "Ala 1" fixo para qualquer tranca; quatro células fixas | `lockHintRungs(lock, tempo, tentativas, progresso)` puro, com os cinco degraus de 8.3; estado salvo por objetivo; N dígitos; som de erro e de abertura | `test:locks`: cada degrau acrescenta texto novo; fechar e reabrir não zera; o último degrau só com pedido | L4 |
| H-20 | S3 | `store.ts:64, 800-804` | `factsKnown` é estado morto | aba Caderno: «Minhas anotações» (pergunta, valor, onde foi lido); toast ao aprender | `test:opening-flow` | L4 |
| H-21 | S3 | `pt-BR.ts:195`; `museum.ts:700-704` | a dica curta («A data tá nas placas da Ala 1. Lê.») perde o endereço | «Gaveta do Otávio: uma data. Retrato do Morgan, Ala 1. Vira a moldura.» | `test:radio`: toda dica curta contém o substantivo-alvo da cheia | L1 |
| H-22, CN13, EN-A7 | S3 | `pt-BR.ts:335, 357, 359, 365, 374`; `museum.ts:49` | `1896` em cinco chaves; o texto afirma a versão contestada (a demonstração de julho) | o ano fica em duas chaves (o verso e `doc-halstead`); o texto diz só «em 1896, em Springfield» e declara a divergência | lint `numeral-exclusivity` | L1 (texto), L2 (lint) |
| H-23 | S3 | `pt-BR.ts:101-102` | o bilhete promete o impossível | `doc-otavio-handover` (Anexo B.3) | `validateOpening`: toda credencial citada existe | L3 |
| EN-A6, H-33 | S3 | `MuseumMap.tsx:206-235` | a planta lista toda tranca fechada, mesmo nunca vista | `progress.locksSeen` | `test:map` | L2 |

### 3.6 Frente 6 — Plinto e fim

| # | Sev. | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|
| ÁT-D1, CAP-11 | B | `atriumDecor.mjs:562-663`; `museum.ts:132-147, 876, 975-989`; `pt-BR.ts:102, 162, 183` | a última dica e o bilhete mandam a "três medalhas e um cofre embaixo do átrio"; o plinto tem quatro botões e nenhuma tranca | em L3, o jogo ganha fim (Posse) e o pódio ganha prompt honesto; em L11, `atrium-plinth` com três `medallion-socket`, grade, água, tampa e chave geral | `simulateProgress`: `ending-reachable`; número de soquetes = número de `MedallionId` | L3, L11 |
| ÁT-D2 | M | `pt-BR.ts:170-171` | "não desce no subsolo": não há por onde | L3: a fala muda; L11: grade com água à vista; L12: plataforma | `validateOpening`: todo lugar citado numa fala existe | L1 (fala), L9 (escada de serviço gradeada), L11 (poço), L12 (plataforma) |

### 3.7 Frente 7 — Coisas que se veem e não se usam

Regra: cada objeto visível tem uma interação, uma informação legível ou uma resposta do Jorge; o que
não tiver nenhuma das três sai da sala. Validador `placement-without-role` sobre **toda** colocação de kit (6.4), com zero avisos a partir de L9; `test:signage` cobre as superfícies de texto; até lá, cada linha abaixo é dívida datada (Anexo C).

| O jogador vê (ÁT-E1) | Passa a ser | Lote |
|---|---|---|
| 1. plinto com quatro discos, cercado | `atrium-plinth`: três encaixes sobre grade, anel com uma abertura virada para a porta do escritório | L11 |
| 2. balcão de recepção, monitores, teclado | folheto (aba Planta), livro de visitas (resumo da noite), achados e perdidos; monitores apagados, em material de tela | L9 |
| 3. gaveteiro atrás do balcão | uma gaveta abre (achados e perdidos, letra do Jorge); as outras respondem pelo Jorge | L9, L15 |
| 4. três gavetas no console das bolas | saem do modelo; ou uma abre com «Como ler uma bola» | L9 |
| 5. caixa de doação | placa «O museu é gratuito. A memória, não.»; destino da moeda (segredo) | L9, L15 |
| 6. fila de cordas | colisão e uma entrada clara | L9 |
| 7. púlpito em branco | «COMO LER ESTE MUSEU» e o apoio do Livro de Termos (assinatura) | L3 (função), L9 (texto e acabamento) |
| 8. parede de orientação sem palavra | «SEIS ERAS, SEIS ALAS»: seis selos de ala nomeados, que acendem a cada termo; "você está aqui" | L9 |
| 9. torre com três troféus | vitrine do Fundador: três prateleiras com etiqueta; o lacre da medalha da Linhagem | L11 |
| 10. lounge e sofá | banco de escuta; a revista de palavras cruzadas do Jorge | L9, L15 |
| 11. três biombos | um sai da frente da dedicatória; os outros apoiam avisos de montagem | L9 |
| 12. murais e banners | legenda de até 12 palavras cada, com "ilustração autoral" declarada | L8 (legenda), L13 (pano) |
| 13. instalação aérea | explicada no púlpito e pelo Jorge na luz geral: cada arco é a trajetória de um golpe | L11 (fala), L9 |
| 14. porta sem placa | «SERVIÇO», barra antipânico, estado salvo | L2 (estado), L9 (placa) |
| 15. quadro depois de religado | dispositivo com estado (ÁT-A3) | L10 |
| 16. som | goteira, chuva, relés, zumbido | L16 |
| 17. subsolo, mezanino, portas das alas | poço com água sob a grade do plinto; escada de serviço gradeada; cinco tapumes com aviso; grade do elevador fechada, com placa («Mezanino — só se sobe depois de ter andado embaixo»); entrada principal com porta de enrolar baixada | L9, L11 |

| # | Sev. | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|
| H-49, AS-S9, CAP-4 | S2 | `museum.ts:1270, 1281, 1282`; `holyokeDecor.mjs:279-295, 546-562`; `interpretive.mjs:88-147` | nenhuma etiqueta é legível no mundo: três pedestais, cinco mesas de leitura e três folhas de quiosque em branco | `ExhibitData.labelPlate` (título e uma frase em `RoomText`) nas oito peças; quiosque com a linha do tempo da ala em três folhas | `test:signage`: toda peça tem placa com texto a ≤ 1,5 m; nenhuma superfície de leitura sem conteúdo | L8 |
| H-50 | S4 | `museum.ts:1282` | há pedestal ao lado do conjunto de treino (não examinável); a rede e a câmara não têm | placas onde há peça; o conjunto de treino ganha «peça de apoio» | `test:signage` | L8 |
| H-51 | S4 | `museum.ts:1329-1343`; `RoomWallArt.tsx:160-179` | os créditos do friso ficam atrás da cabeça da vitrine, invisíveis do piso | créditos onde se leiam; legendas de mídia em pt-BR | `test:signage` | L8 |

### 3.8 Frente 8 — Sinalização e arte de parede

| # | Sev. | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|
| ÁT-F1, CAP-12 | M | `museum.ts:1032, 1035-1039, 1080-1104`; `RoomSignage.tsx:34-103` | a dedicatória fica às costas de quem chega do escritório; um biombo tapa o título; «demais.» fica viúva | dedicatória na parede oeste, entre as duas portas; texto novo (Anexo B.9); filete de latão no relevo; corrigir o comentário (leste, não norte) | `test:signage`: linha de visão a 4–8 m; sem linha de uma palavra em pt e en | L9 |
| ÁT-F3 | A | `museum.ts:962-964`; `pt-BR.ts:19, 151, 238, 259`; `media.authored.ts:55, 105` | atalho idêntico às portas públicas; nome do museu em duas versões; dois SVG sem hash sob cache de um ano | placa «SERVIÇO»; D5; hash no nome dos SVG | `validate:content` | L1 (nome), L5 (hash), L9 (placa) |
| ÁT-F4, AS-A4, AS-A5 | A | `museum.ts:1041-1058`; `openings.mjs:129`; `atriumDecor.mjs:471-555` | lambris sobrepostos em 0,30–0,34 m, mordendo guarnições, com fresta de 30 mm sob a capa | lambri ripado gerado pela casca, por segmento de parede (AS-L2) | `test:kit`: sem sobreposição; ≥ 10 cm de qualquer vão | L9 |
| H-47 | S3 | `museum.ts:1309-1319`; `credit.ts:32-35` | o mural "de época" é ilustração gerada e não diz; a rede desenhada contradiz a etiqueta | ligar a legenda; corrigir a rede na ilustração | validador: mídia `procedural` em parede exige legenda visível | L8 (legenda), L14 (ilustração) |

### 3.9 Frente 9 — Portas e atalho

| # | Sev. | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|
| ÁT-G1, H-29, CN17 | G, S3 | `transitionDoorTopology.ts:182-208`; `TransitionDoors.tsx:356-364`; `schema.ts:583-584` | sair pelo atalho e virar-se: «Abre pelo outro lado», para sempre | `progress.doorsReleased` (com migração); depois da primeira abertura a porta funciona dos dois lados e a planta a desenha como porta comum; som de porta trancada no `E` bloqueado; toast «Atalho destrancado» | `test:transition-door`: depois de liberada, o lado do átrio abre; save antigo carrega; `test:navigation`: rota pelo atalho nos dois sentidos | L2 |
| ÁT-G2 | M | `MuseumScene.tsx:557-589`; `TransitionDoors.tsx:457-468` | se uma textura do átrio não chegar, a porta do escritório fica em «Preparando a próxima sala…» sem saída | tempo-limite: abre em modo degradado | `test:gpu-warmup` | L1 |
| H-30 | S4 | `museum.ts:1253-1254` | o atalho não tem barra nem placa por dentro | barra antipânico e «SERVIÇO» | `validateBake`: nó da barra; `test:signage`: placa a ≤ 1,5 m da porta | L14 |

### 3.10 Frente 10 — Colisão e navegação

| # | Sev. | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|
| ÁT-H1 | M | manifesto; `test-navigation.ts:263-265` | a cápsula atravessa cordas e pedestais da fila | colisor fino; uma entrada clara | `test:navigation` | L9 |
| ÁT-H2 | A | manifesto | o colisor do lounge é menor que o estofado; cadeiras da recepção sem colisor | colisor por família | SAT | L9 |
| ÁT-H3 | M | `test-navigation.ts:274-278, 710-735` | as rotas de teste partem do spawn antigo | rota porta do escritório → quadro; alcance de cada interativo de onde a cápsula para | `test:navigation` | L1 (rotas e os dois quadros); L2 (peças, arquivos e dispositivos, com M15) |
| H-31 | S3 | `bake.mjs:240-245`; `src/scenes/MuseumScene.tsx:203-211` | o jogador atravessa a rede, o manequim, a bola de treino e os pedestais | `ExhibitData.collider?: 'bounds' \| 'posts' \| false`; a rede ganha lâmina de colisão na faixa: **não se passa por baixo** (a borda de baixo fica a 1,36 m e o olho a 1,62 m) | `test:navigation`; SAT inclui peças de chão | L14 |
| H-32 | S4 | `holyokeDecor.mjs:129-155` | o nicho da tela sai 24,5 cm além do colisor | colisor do nicho | SAT | L14 |

### 3.11 Frente 11 — Planta, caderno e arquivo

| # | Sev. | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|
| ÁT-I1 | M | `MuseumMap.tsx:113-126, 165-204` | a planta desenha portas e contornos de salas não visitadas, o atalho antes de descoberto; marcador sem direção | `mapModel(progress)` puro: sala e porta só depois de visitadas; vizinha como toco com «?»; trancas só as tocadas; seta e norte; três estados por padrão e cor | `test:map` | L2 |
| ÁT-I2 | M | `museum.ts:560-566, 1190` | um item só para a energia; «catalogar» sem contador; «cofre» nunca risca; o átrio não tem documento | lista como dado (M32): contador por sala, itens a lápis que nascem de marcos, aviso ao riscar | `test:opening`: todo item tem `doneWhen` | L3 |
| H-34 | S3 | `Journal.tsx:31-56`; `MuseumMap.tsx:139-154` | o caderno não diz o que falta | Acervo por sala com três estados (vista, falta virar, catalogada); ponto da planta com nome; ícone de gaveta com documento não lido | `catalogueRows(progress)` | L4 |
| H-35 | S4 | `Containers.tsx:282-286` | abrir o armário despeja todos os documentos de uma vez | um por vez, com «próximo»; documento de duas páginas vira a página no mesmo leitor | `test:opening-flow`: regra pura `containerReadQueue` | L3 |
| H-36, ÁT-K4 | S3 | `store.ts:877-910` | «Continuar» renasce sempre no escritório | D12: fica; uma fala do Jorge resume | `test:radio` | L15 |

### 3.12 Frente 12 — Texto histórico (as correções da pesquisa vencem)

| # | Sev. | Chave | O jogo diz | Passa a dizer | Lote |
|---|---|---|---|---|---|
| H-38 | S2 | `exhibit.portrait-morgan.catalogue` (`pt-BR.ts:357`) | «Deixou a YMCA em 1900» | 1897 | L1 |
| H-39 | S2 | `exhibit.net-1897.label` (`:325`; `en.ts:306`) | «cerca de meio pé acima da cabeça de um homem médio» (o inglês diz outra coisa) | «logo acima da cabeça de um homem médio», nas duas línguas | L1 |
| H-41 | S3 | `exhibit.guide-1916.catalogue`, detalhe `credit` (`:343-344`) | «Dr. Frank Wood» | «Woods» | L1 |
| H-44 | S3 | `exhibit.guide-1916.title` (`:339-341`) | «O guia que registrou a bomba» | «Morgan conta a história»; a bomba filipina ganha documento próprio, com «ficou conhecido como» | L1 (título), L8 (documento) |
| H-40 | S3 | `exhibit.handbook-1897.catalogue` (`:335`) | «em duas palavras… até 1952» | fica na ficha, como «até 1952, quando a associação americana adotou a forma em uma palavra» (uma fonte: não vai para placa) | L1 |
| H-42 | S3 | `exhibit.photo-gym.label`, `.catalogue` (`:363, 365`) | esquina, «treliças de aço rebitado», «serviu de 1886 a 1943», «fotografado em 1897» | «publicada em 1897»; descreve o que a foto mostra (argolas, cavalo de salto, pesos de polia, pista suspensa; o cavalo da foto não tem alças); «o prédio, do começo dos anos 1890, queimou em 1943» só no detalhe (sem 1886 até abrir uma página que o diga) | L1 |
| H-43 | S3 | `exhibit.gym-suit.label`, `.catalogue` (`:349, 351`) | nota de direção de arte na etiqueta; «sola de borracha»; a lã explicando a rede baixa | «O traje de ginásio de catálogo»: malha canelada e calça até o joelho, traje de catálogo feito pelo museu; o museu não achou fotografia dos sócios de 1895 e não sabe o que vestiam (a pesquisa dá as duas variantes como inferência). Sem data até um catálogo ser aberto e capturado (7.7, item 20). Sem sola, sem causalidade inventada | L1 |
| H-45 | S4 | `document.rule-changes.body` (`:380`) | «As três respondem ao mesmo problema»; «de 21 para 15 pontos» | sem a frase; «de vinte e um para quinze»; a divergência 1920 × 1922 dos três toques declarada | L1 |
| H-46 | S4 | `:310, 331, 335, 345` | «leve demais, boiava»; «O primeiro regulamento impresso»; «Censo de 1916» | «leve e lenta demais» (a ordem das palavras do Morgan: a câmara primeiro, a bola inteira depois); «O primeiro manual oficial»; «estimativa de 1916» | L1 |
| H-48 | S4 | `kit.mjs:687-749`; `pt-BR.ts:325, 327` | a rede modelada (4,8 m, fita em cima e embaixo, esticada) não é a descrita | «trecho reconstruído»; sem fita embaixo; barriga na malha | L14 (`test:kit`: sem fita embaixo, flecha da malha > 0) |
| H-53 | S3 | etiquetas da ala | 1.063 palavras na ala; cinco etiquetas acima de 40 | etiqueta ≤ 40 palavras; o excedente desce para a ficha; `validatePacing` conta palavras nas duas línguas | L8 |
| — | — | `museum.ts:61, 77, 109` | fonte nº 2 do `1896` devolve 404; dois fatos citam página que não contém o ano | URLs da seção 7.2 | L1 (feito em P0, com a captura) |
| — | — | átrio: `pt-BR.ts:258, 285-286, 289-290, 295-298` | «DESDE 1895»; «costurados à mão»; «milhares de dimples»; «canal de costura» | «O JOGO DESDE 1895»; sem «costurados à mão»; «oito gomos, superfície com covinhas»; «canal estreito e rebaixado entre os painéis» | L1 |
| — | — | `pt-BR.ts:354-357` | «em 1891»; «27 de dezembro de 1942» | «no início dos anos 1890»; «dezembro de 1942» | L1 |

**Teste de toda a frente 12:** cada linha vira uma asserção por chave em `test:opening-flow` (pt-BR e
inglês), no molde de `test-opening-flow.ts:994-1003`; H-48 também em `test:kit`. Acréscimos que o
relatório de fatos marcou e o rascunho não tinha levado (todos em L1, salvo indicação):

| Chave | O jogo diz | Passa a dizer |
|---|---|---|
| `exhibit.ball-improvised.catalogue` | «O primeiro objeto da história do vôlei»; «mole demais» numa linha e «leve demais» na outra | sem o superlativo; «leve e lenta demais» nas duas |
| `exhibit.ball-spalding.catalogue` | «sobreviveu até os anos 1930 e sumiu quando a bola sem cadarço virou padrão oficial»; «c. 1900–1920» | «foi saindo de cena entre os anos 1920 e 1940»; sem o intervalo |
| `exhibit.guide-1916.catalogue` | «O ataque filipino forçou as mudanças» | sem a causalidade; o ataque fica em `doc-filipino-bomb`, com «ficou conhecido como» |
| `document.invention-date.body` | «situa» (o IVHF infere) | «pela conta do Hall da Fama» |
| `document.rule-changes.body` | «até hoje» | data explícita (`text-ages`) |
| `atrium-ball-laced.label` | catálogos de 1918–1920 e bola de c. 1925, não reabertos | sem as datas até a fonte ser reaberta (7.7) |
| `fact.first-rulebook.claim`, `fact.filipino-spike.claim` (passam a ser texto de jogador em L4, nas anotações) | «Ano do primeiro regulamento oficial impresso»; ano seco | «Ano do primeiro manual oficial»; «Por volta de que ano…» (L4) |
| `radio.patience.t3.crossword` (`en.ts:196-197`) | “pest”, four letters | cinco letras, para a resposta caber |
| `radio.patience.*` que mandam «ler as placas» (`pt-BR.ts:232-240`) | apontam para onde o código nunca está | «virava as peças» (L4) |
| comentário de `kit.mjs:684-685` | repete o "meio pé" | corrigido junto com H-39 |

### 3.13 Frente 13 — Toque

| # | Sev. | Onde | Correção | Teste | Lote |
|---|---|---|---|---|---|
| S18 | B | `MobileControls.tsx:275`; `Devices.tsx:433`; `PowerControls.tsx:228`; `Interaction.tsx:222` | gesto "segurar" (M41) com anel de progresso; toque curto abre confirmação | `test:mobile-controls`: segurar o botão de Ação assina e fecha a chave geral; soltar antes cancela | L3 |
| ÁT-J1, ÁT-J2, H-52 | S3 | exame no telefone: painel de 179 px numa tela de 390, lista abaixo da dobra, sem pinça | resolvidos por ÁT-C2, ÁT-C5, ÁT-B5; pinça para aproximar; botões ‹ › de vista | `examineLayout(844 × 390)`; `test:mobile-controls` | L4, L16 |
| ÁT-J3 | A | `MobileControls.tsx:246-256` | retorno (som e tremor do prompt) ao tocar numa porta bloqueada | regra pura `blockedTapFeedback` | L16 |
| — | — | `HANDOFF.md` §7.1 | Android médio, iPhone e iPad: tela cheia, paisagem, multitoque, memória | roteiro manual do dono, com números no HANDOFF | P0, L6, L16, L24 |

### 3.14 Frente 14 — Restrições que mandam na ordem

| # | Restrição | Consequência | Lote |
|---|---|---|---|
| ÁT-K1 | kit do átrio em 56 de 56 lotes; frame de 80 draws (pico de 100 na diagonal sudeste) | **nada que acrescente draw ao átrio entra antes da fusão (L6)**, com duas exceções declaradas e datadas: o Livro no púlpito (L3) e a lente emissiva do quadro (L1), sob teto temporário de 58 lotes e 102 draws até L6. Placas, plinto, tapumes e lacres vêm depois | L1–L6 |
| ÁT-K2 | o mobiliário ocupa as paredes das alas futuras | a planta do saguão (4.7b) é fixada em L9, antes da luz, com as pegadas das alas, do mezanino e da portaria como salas `deferred` no validador | L9 |
| ÁT-K3 | 17.096 triângulos de kit sem uso (16%) | usar o que serve (`label-plaque`, `interp-panel`); o resto sai do GLB | L5 |
| H-28 | `RoomData.audio` sem leitor; emissor `holyoke-clock` sem relógio modelado | leitor de áudio de sala; o emissor ganha um relógio de parede ou sai | L16 |
| K5 | o verbo (L4) é exigido lotes antes dos modelos polidos (L14) | o detalhe obrigatório de toda peça é a **etiqueta de conferência do Otávio no verso**, em texto de runtime; nenhum catálogo depende de geometria ainda em branco | L4 |
| K6 | orçamentos móveis vêm de documento, não de aparelho | medição em aparelho real em P0 e de novo em L6; os tetos do livro-caixa passam a ser os medidos | P0, L6 |

### 3.15 O que falta em cada sala para ser uma boa sala

**Átrio.** (1) Uma primeira vista composta a partir da porta do escritório, com o piloto como farol e
nada mais aceso. (2) A meta mostrada cedo: o plinto tem prompt e entra na planta. (3) O próximo passo
dito por alguém: a chamada do Jorge ao religar. (4) O mapa entregue como objeto (o folheto). (5) O
verbo ensinado onde errar não custa: a mesa de toque, com guia de arrasto. (6) Progresso lido sem
HUD: medalhas no plinto, selos de ala na parede, lacres nas vitrines. (7) Direção sem bússola. (8)
Cada volta ao saguão traz uma coisa nova: um soquete aceso, um selo, o balde mais cheio, o atalho
aberto.

**Holyoke.** (1) Saber onde está o quadro: piloto visível da porta e dica com direção. (2) Saber o
que fazer depois de acender: a chamada do Jorge e «Ala 1 (0 de 8)». (3) Ler sem apertar `E`: as
placas. (4) Saber que virou certo: retorno de detalhe, carimbo, anotação. (5) Saber o que falta:
«falta virar» no Acervo e pontos com nome na planta. (6) Saber que acabou: a sala azul na planta, a
chamada, o lacre pronto. (7) Um laço: entrar no escuro, atravessar, acender, sair pelo atalho.

---

## 4. Polimento de assets

A régua é a rodada do escritório (`HANDOFF.md` §9.3, §9.4, §9.6): cor medida decodificando a textura
entregue, apoio e folga provados por teste, três capturas por asset. Custos na ordem
**triângulos / VRAM / draws / programas**; "0" quer dizer nenhum.

### 4.1 A bíblia de assets (vale para tudo o que existe e para as salas novas)

1. **Datums.** Chão em y = 0; parede em z = 0 com +Z para a sala; pendurado com o máximo em y = 0;
   objeto de mesa com o mínimo em y = 0; peça examinável com a origem no centro do volume (é o pivô
   do exame).
2. **Nada assado dentro de vitrine sem `layout`.** Toda receita com objetos embutidos exporta
   pegadas e apoios; o que `museum.ts` coloca é testado contra eles. Recheio é dado, como nas estantes.
3. **Apoio e folga.** Apoiado a ±0,5 mm; vizinhos a ≥ 2 mm; inclinado gira na aresta de baixo e
   encosta no apoio. Nada flutua, nada afunda, nada atravessa.
4. **Bisel onde a luz bate**, em toda aresta vista a menos de 1,5 m.
5. **Normais.** Caixas com `crease: null`; torneados e tubos com as normais do gerador; nunca um
   passe de vinco sobre família mista. Face plana tem normal exata.
6. **Redondo é redondo.** Lados ≥ max(8, perímetro ÷ 12 mm), teto 24; tubo de latão ≥ 10; flecha da
   silhueta ≤ 1 mm a distância de leitura.
7. **Só faces que alguém vê**; seção varrida para membros longos.
8. **UV por peça**, veio no eixo longo, deslocamento por peça, `uv: 'keep'`. Esfera: projeção pelo
   próprio centro e receita ciente dos polos.
9. **Escala do traço.** Couro 2–3 mm; pano sem fio visível além de 0,5 m; papel nunca em lona; anel
   de madeira 15–30 mm em membro estreito; tábua de piso 90–120 mm. A tabela de metros por tile vai
   no comentário do gerador.
10. **Cor.** Albedo neutro, matiz só no tint (alvo ÷ média linear medida). Conferir sob branco, sob a
    chave da sala e sob a lanterna, com ACES. Famílias vizinhas separam por valor (ΔE ≥ 15).
    Superfície grande com luminância abaixo de 0,03 lê preto: não usar.
11. **Metal** precisa de algo para refletir: testar em face vertical; latão liso, sem facetas.
12. **Programas.** Chave nova repete uma combinação existente de recursos. Recurso novo pede medição
    depois de reload limpo.
13. **Draws.** Família nova usa material já presente na sala; alvo de até 14 materiais por sala.
14. **Textura.** Ala nova entra com tints sobre receitas neutras; receita nova de até 2 MiB sem compressão;
    mídia conta no orçamento único por trio de salas (45 MiB, D24), a até 300 px/m e 3 MiB comprimidos por sala.
15. **Triângulos.** Prop 2.500; herói 15.000 (gaste pelo menos 4.000 em peça de exame); sala até
    50.000 instanciados; frame até 90.000.
16. **Emissivo obedece à energia.** No apagão, só pilotos.
17. **Luz.** Cada herói declara `lightTarget`; no máximo cinco chaves por sala; luminária sem luz
    parece apagada.
18. **Interpretação.** Toda superfície de texto declara o plano e recebe conteúdo; substrato em
    branco reprova.
19. **Três capturas por asset** em `docs/contact-sheets/`: aceso a distância de leitura, lanterna a
    1 m, exame.
20. **Paleta por sala** numa tabela só (`SHELL_PALETTES`): piso, parede, teto, marcenaria, acento,
    chave e lavagem.

21. **Sombra de contato.** Nada de chão ou de mesa sem escurecimento no apoio: oclusão por vértice,
    assada nas malhas fundidas da sala (M46). Zero textura; uma variante de programa, medida.
22. **Duas malhas por peça** (M45): a de vitrine (até 2.000 triângulos) é a que a sala desenha; a de
    mão (até 15.000) só carrega no exame.
23. **Classe de orçamento declarada na receita** (`prop` 2.500, `hero` 15.000, `shell`). O plano de
    cada lote traz, antes de modelar, a tabela "receita, hoje, depois, teto, classe" de toda receita
    tocada, conferida pelo bake.
24. **Papel declarado em toda colocação:** `interaction`, `text`, `askAbout` ou `scenery` (com
    justificativa). Sem marca, o validador reprova (6.4).
25. **Desgaste e assimetria.** Toda receita de madeira, latão ou couro leva um passe de desgaste em
    cor de vértice (aresta mais clara onde a mão passa) e um defeito autoral. Zero textura.
26. **Piso não cintila.** Anisotropia máxima, rugosidade mínima crescente com a distância e normal
    atenuada em vista rasante; portão no `test:materials` (variância do normal por pixel a 5° do piso).

A regra 19 passa a valer assim: as três vistas de cada asset são compostas em **folhas de contato por
sala e por lote** (`scripts/contact-sheet.mjs`), e um manifesto gerado (asset → célula da folha → hash
da receita) diz ao `check` quais estão vencidas.

### 4.2 Pipeline: dez defeitos que valem para toda sala (L5, L7 e L10)

| # | Defeito medido | Onde | Conserto | Retorno | Custo | Lote |
|---|---|---|---|---|---|---|
| AS-S1 | a paleta nunca chega à casca: `prepareRoomShells` descarta `palette`; as três salas saem com maple, reboco creme e carvalho; `holyoke-floor` não é usado | `kit.mjs:86-112, 344-345, 463-495` | passar `palette`; tabela `SHELL_PALETTES`; reafinar `holyoke-floor` para luminância ≈ 0,06; escritório declara maple (D19) | alto: a Holyoke ganha identidade | 0 / 0 / 0 / 0 | L5 |
| AS-S2 | passe de vinco sobre caixas biseladas entorta as normais em cerca de 20 famílias (até 29°): face plana de latão ou verniz com gradiente de almofada | `geometry.mjs:75-93`; chamadas em `kit.mjs`, `interpretive.mjs`, `fixtures.mjs`, `atriumDecor.mjs` | helper que separa caixas (sem vinco) de torneados em toda família mista | médio-alto | 0 | L5 |
| AS-S3 | veio sempre horizontal: todo membro vertical (ripas, montantes, pernas, mastros, guarnições) tem o veio atravessado | `geometry.mjs:421-476`; `materials.mjs:109-149` | opção de eixo em `boxProjectUVs`; `uv: 'keep'` por peça | alto e barato | 0 | L5 |
| AS-S4 | tints sobre albedo com matiz: `holyoke-navy` rende (71, 83, 88) e vira oliva sob luz quente; `walnut-polished` tem luminância 0,020; o maple rende laranja abóbora | `materials.mjs:319, 402-408`; `glb.mjs:66-94` | madeira e lona neutras; recalcular todos os tints (tint novo = cor efetiva atual ÷ média nova, então nada muda) e só então reafinar navy, nogueira de galeria e maple | alto | 0 | L7 |
| AS-S5 | normal de madeira forte demais (`normalStrength` 2,6 com clearcoat): lê como entalhe em ondas | `materials.mjs:317`; `glb.mjs:66-78` | `normalScale` 0,35–0,45 nas chaves de madeira (uniform); conferir a mesa do escritório | alto | 0 | L5 |
| AS-S6 | emissivos e ambiente ignoram a energia | `glb.mjs:87`; `materialSpec.ts:54-57`; `RoomWallArt.tsx:154-156` | ver ÁT-B1 | alto | 0 (uniforms) | L10 |
| AS-S7 | latão lê preto em face vertical: o ambiente só tem luz no zênite | `MuseumScene.tsx:726-764`; `glb.mjs:84` | duas faixas quentes fracas no horizonte do mapa de ambiente; latão com metal 0,8 | alto | 0 | L5 |
| AS-S8 | o exame segura a peça pela origem, sem enquadrar | `Interaction.tsx:166, 331-334` | ver H-02 | alto | 0 | L4 |
| AS-S9 | superfícies de interpretação em branco | `interpretive.mjs:88-90` | ver H-49 | alto | +1 draw por sala (atlas R8, ver AS-L8) | L8, L9 |
| AS-S10 | esfera com UV projetada da origem da receita, não do próprio centro | `holyokeDecor.mjs:735` | projeção pelo centro da peça; portão no bake | médio | 0 | L5 |

### 4.3 Átrio: defeitos medidos e lista ranqueada (L5 a L13)

**Defeitos de modelo**

| # | Defeito | Medida | Onde |
|---|---|---|---|
| AS-A1 | o núcleo fura os gomos das bolas de 1998 e 2008 | 1,29 e 2,19 mm para fora | `historicalVolleyballs.mjs:36, 87-89, 200-201, 235-236` |
| AS-A2 | quadro de energia flutua à frente do lambri | 255 mm do reboco | `museum.ts:909` |
| AS-A3 | a barra de baixo dos banners atravessa a estampa; a estampa mostra só 58–68% da arte | 106 mm à frente, 14 mm dentro da parede | `interpretive.mjs:308, 402`; `bake.mjs:648`; `museum.ts:1140-1182` |
| AS-A4, AS-A5 | lambris sobrepostos, com vãos, mordendo guarnições; fresta de 30 mm sob a capa | 0,30 m de sobreposição | `museum.ts:1041-1058`; `atriumDecor.mjs:471-555` |
| AS-A6 | guarda-corpo do plinto facetado | corrimão de 5 lados; ponteira 6 × 4 | `atriumFurnishings.mjs:146-172` |
| AS-A7 | o pódio central não é o plinto das medalhas | quatro botões em lona | `atriumDecor.mjs:570-663` |
| AS-A8 | disco do piso com a mesma textura na metade da escala, tábuas retas num disco "radial", filetes como toros de 5 lados | tábuas de 57 mm dentro, 105 fora | `atriumDecor.mjs:118-165` |
| AS-A9 | cadeiras da recepção no ar | 42,5 mm | `atriumDecor.mjs:306-316` |
| AS-A10 | adereços da recepção todos em ferro fundido | monitores, assentos, folhetos, abajur | `bake.mjs:968`; `atriumDecor.mjs:280-336` |
| AS-A11 | torre: medalha flutua, fitas penduradas no nada | 22 mm de ar | `atriumDecor.mjs:741-803` |
| AS-A12 | lounge: tampo no ar, perna atravessa mesa, postes furam almofadas | 15 mm de ar | `atriumFurnishings.mjs:186-303` |
| AS-A13 | lounge e sofá são um buraco preto | navy sobre lona, nogueira a 0,02, nenhuma chave de luz | `museum.ts:1071-1074` |
| AS-A14 | quatro dos nove pendentes pendem do nada | 180 mm de ar | `museum.ts:1067-1078` |
| AS-A15 | painel de orientação e banners a 195 mm do reboco, sem fundo | — | `museum.ts:1109, 1142` |
| AS-A16 | atril em branco | — | `atriumDecor.mjs:940-1011` |
| AS-A17 | portas ilegíveis com a sala acesa; maçaneta em tubo de 8 lados | folha com luminância 0,069 | `openings.mjs:475` |
| AS-A18 | dedicatória com veio de 73 mm atrás do texto | — | `interpretive.mjs:839` |
| AS-A19 | o reboco repete (10,7 × 4,9 vezes por parede) | hachurado diagonal | `kit.mjs:479`; `materials.mjs:254-298` |
| AS-A20 | menores: bola 3 mm acima do elevador; caixotão 10 mm abaixo do teto | — | `museum.ts:164, 1065` |

**Lista ranqueada** (depois das fundações de 4.2)

| Ordem | Receita | O que fazer | Retorno | Custo | Lote |
|---:|---|---|---|---|---|
| 1 | `atrium-central-podium` → `atrium-plinth` (classe **herói**, teto 15.000); `atrium-barrier-segment` | tablado gradeado de 4,4 m de diâmetro e 0,12 m de altura sobre o poço (fosso falso, com a água **no fundo** e os degraus acima dela, sem furar a laje); tambor de 1,2 × 1,1 m com três soquetes leves (`medallion-socket-lite`, ≈ 300 triângulos cada; a receita atual tem 1.432); tampa giratória com a chave geral por baixo; anel de 2,2 m de raio com uma abertura virada para a porta do escritório; corrimão de 10 lados com normais do toro | alto: centro da sala e do jogo; responde a CAP-11 (pequeno demais) | ≈ 6.500 (de 2.052) / 0 / nós próprios para tampa, chave, três medalhas, água e grade: **+7 a +10 draws** / 0 | L11 |
| 2 | bolas do console (1964, 1998, 2008) | tesselar gomos e núcleo; recuo do núcleo de 1,2 para 2,0 mm; painéis visíveis na de 1964; portão "corda do gomo > raio do núcleo + 0,3 mm" | alto: o único acervo examinável do saguão | +~13,5k só na **malha de mão** (exame); a malha de vitrine fica em ≤ 2.000 por bola (M45) / 0 / 0 / 0 | L7 |
| 3 | casca + `atrium-wall-bay-plain` | lambri ripado gerado pela casca, por segmento, morrendo nas guarnições e nos cantos; ripas até dentro da capa | alto: plano de fundo de toda vista | casca +4,5k; kit −4.968; −3 lotes | L9 |
| 4 | `atrium-floor-inlay` | UV polar, filetes como anéis planos, anel escuro em pedra texturizada, junta com deslocamento variável; filete na cor de cada ala do plinto até a porta | alto: maior superfície acesa | −1.340 | L13 |
| 5 | `atrium-reception-desk` | cadeiras no chão com rodízios, estofado em tecido, monitores em `plastic-black`, folhetos em papel, cúpula com espessura, tampo com veio a 0,35 m/tile | alto de perto | 0 (remanejar 1.416); +2 famílias | L9 (posição e função), L13 (acabamento) |
| 6 | `atrium-lounge-set`, `atrium-sofa` | veludo navy e tapete com sheen, almofadas com `quiltedPanel` e `piping`, postes fora da almofada, biséis | alto: a zona de pausa deixa de ser buraco preto | +~1.230; +1 programa no átrio (já compilado para o escritório) | L13 |
| 7 | `atrium-display-tower` → vitrine do Fundador | três objetos montados de verdade (suporte, pino, fita apoiada), pastilha sob cada um, montantes com veio vertical, o lacre | médio | −300 | L11 (função), L13 (acabamento) |
| 8 | banners | pano real (`buildBanner`) com UV 0..1 para a estampa; barras retas (`twist: 0`); estampa no formato da arte | médio-alto: os 5 m de cima | +360 por banner | L5 (barras retas), L13 (pano) |
| 9 | claraboia | lanterna envidraçada no campo do caixotão: montantes, vidro, céu por estado do relógio, um vidro trincado (casca, **L5**); balde e goteira no piso (**L9**) | alto para a história da tempestade e para o amanhecer do final | +1,5–2,5k (casca) / 0 | L5, L9 |
| 10 | `atrium-lectern`, painel de orientação | conteúdo no tampo; fundo ou suportes de latão no painel; seis selos de ala | médio | +100 | L3 (função), L9 |
| 11 | `atrium-divider-screen`, `atrium-display-console` | biséis nos postes, malha em bronze fosco, elevadores com chanfro e feltro; console sem gavetas | médio | +400 | L13 |
| 12 | tapumes das cinco alas, entrada principal | uma receita `wing-hoarding` (madeira fosca, aviso em papel, olho mágico) instanciada cinco vezes; folha dupla com porta de enrolar | médio: o prédio mostra o que vem | +~300 cada; +~1.200 **[a validar]** | L9 |
| 13 | pendentes, quadro, cadeiras, mesa lateral | assentar: pendentes fora do caixotão em y = 8,40; quadro no reboco; cadeiras no chão | médio (somados) | 0 | L5 (pendentes e caixotão), L9 (cadeiras), L10 (quadro) |
| 14 | `atrium-aerial-installation` | manter; tubos com as normais do tubo | baixo | 0 | L5 |

### 4.4 Holyoke: defeitos medidos e lista ranqueada (L1, L4, L5, L14)

**Defeitos de modelo**

| # | Defeito | Medida | Onde |
|---|---|---|---|
| AS-H1 | as quatro peças reais colidem com a vitrine corrida | guia dentro da tábua; manual 63,5 mm abaixo do apoio real; retrato cruzado por 295 mm de prateleira | `museum.ts:371, 399, 448, 477`; `holyokeDecor.mjs:259-267` |
| AS-H2 | bola-herói com grão gigante | 66 × 33 mm (couro real: 1–3 mm); costuras afundam 10 mm no pedestal | `kit.mjs:627-659`; `museum.ts:310-311` |
| AS-H3 | recheio assado da vitrine corrida | rolos a 112, 167 e 222 mm no ar; seis documentos atravessam a prateleira; duas "camisas" cortadas | `holyokeDecor.mjs:311-387` |
| AS-H4 | vitrine-herói sem chave de luz | só a lavagem | `galleryLightRig.ts:67-74` |
| AS-H5 | murais atrás das molduras: cruzados pelo roda-meio e pelo trilho de quadros | 170 mm atrás do lambri | `museum.ts:1310-1328`; `kit.mjs:270-274` |
| AS-H6 | traje de ginástica é um cilindro de couro | sem mangas, gola ou forma | `kit.mjs:834-907`; `bake.mjs:324-334` |
| AS-H7 | conjunto de treino facetado; bola de 0,5 m com UV errada | clavas de 10 lados | `holyokeDecor.mjs:638-737` |
| AS-H8 | rede fora do meio da quadra | 2,15 m | `museum.ts:345, 1278` |
| AS-H9 | o friso recorta o rosto do Morgan | 21% da altura, 134 px/m | `museum.ts:1332` |
| AS-H10 | páginas e documentos em lona | fio de 7–12 mm | `bake.mjs:313, 320, 911, 923, 933` |
| AS-H11 | câmara de borracha em couro granulado | células de 26 × 13 mm | `bake.mjs:292` |
| AS-H12 | vitrine-herói com latão sem bisel; pedestal em lona | 12 barras de caixa | `holyokeDecor.mjs:442-485` |
| AS-H13 | nicho da primeira peça na canela | 0,227–0,515 m | `holyokeDecor.mjs:123-155` |
| AS-H14 | quadro e grelha a 15 mm do reboco; o quadro monta no roda-meio | — | `museum.ts:1230, 1294` |
| AS-H15 | quiosque e rótulos em branco; folhas em trama de 11,8 mm | — | `holyokeDecor.mjs:546-562` |
| AS-H16 | piso, teto e marcenaria fora da paleta; forro navy oliva | — | AS-S1, AS-S4 |

**Lista ranqueada**

| Ordem | Receita | O que fazer | Retorno | Custo | Lote |
|---:|---|---|---|---|---|
| 1 | as quatro peças da vitrine corrida | centro do vão, topo real da prateleira; tirar o recheio que ocupa o mesmo volume | altíssimo: dois fatos e o código voltam a existir | 0 | L1 |
| 2 | `ball/spalding-laced-1900` | material próprio esférico (grão de ~2 mm, fade nos polos), cadarço e carimbo do fabricante modelados, vergões como costura; D20 | altíssimo: o herói da ala | +1,375 MiB | L14 |
| 3 | `history-case-run` | carcaça por vão; recheio como dado (`LAYOUTS`): livros apoiados, documentos em cavalete, camisas em suporte em T, rolos numa bandeja, medalhas em painel; papel de verdade | altíssimo: 10 m de parede | +3–5k | L14 |
| 4 | `paper/handbook-1897`, `paper/spalding-guide-1916` | papel sem pauta, lombada e capa em pano, página composta pelo museu (reconstrução tipológica; reprodução só com scan capturado); berço inclinado | alto no exame | +0,69 MiB | L14 |
| 5 | `apparel/gym-suit-1900` | malha de lã (receita nova), mangas, gola, cós, calça até o joelho; manequim em linho | alto | ≤ 2 MiB (512/256/128); ≤ 2.500 | L14 |
| 6 | `net/ymca-1897` | na linha central da quadra; veio ao longo dos mastros; faixa de lona só em cima; malha com nós e barriga | alto | ≤ 2.500 | L14 |
| 7 | `history-hero-case` | barras de latão com bisel, pedestal em linho fino ou feltro, rodapé; a caixa do lacre na base | alto | +300 | L11 (lacre), L14 |
| 8 | `holyoke-entry-screen` | pintura navy lisa; nicho a 0,95–1,25 m; conteúdo no verso (a frase da ala, para quem sai) | médio | +0,69 MiB (compartilhada) | L14 |
| 9 | `ball/basketball-bladder-1895` | borracha lisa, bico e emenda; a bola de basquete de oito gomos como par | médio | 0 | L14 |
| 10 | `gym-training-set` | clavas de 16–20 lados, bola de 0,32 m com UV pelo centro, corda de 8–10 lados | médio | +~400 | L14 |
| 11 | `history-info-kiosk`, `label-angled` | texto de runtime nas faces; placa fosca em vez de latão espelhado | alto para "dar informação" | dentro do atlas da sala | L8 |
| 12 | murais e friso | trilho de quadros opcional por parede; mural acima do lambri com fundo de 40 mm; friso com recorte por foco | médio | 0 | L14 |
| 13 | `bench`, `archive-cabinet`, molduras | normais, veio, puxadores torneados; perfil das réguas recentrado | médio | 0 | L5, L14 |

### 4.4b Cada defeito de modelo com item, teste e lote

"Apoio" é o portão novo de bake **apoio e folga intra-receita** (toda parte apoiada a ±0,5 mm, nada
no ar, nada atravessado), promovido de `scripts/audit/geo.mjs`. "Colocação" é `test:room-placement`.

| Defeito | Item que o fecha | Teste | Lote |
|---|---|---|---|
| AS-A1 | 4.3 ordem 2 | bake: corda do gomo > raio do núcleo + 0,3 mm | L7 |
| AS-A2, AS-A15, AS-H14 | ÁT-A2; fundo ou suportes no painel e nos banners; grelha encostada | `wall-fixture-off-the-wall` | L1 (quadro da Holyoke), L5 (grelha), L9 (arte e painel), L10 (quadro do átrio) |
| AS-A3 | 4.3 ordem 8 | `media-crop-fraction`: ≥ 95% da arte visível; colocação | L5 (barras), L13 (pano) |
| AS-A4, AS-A5 | 4.3 ordem 3 | `test:kit`: sem sobreposição; ≥ 10 cm de vão | L9 |
| AS-A6, AS-A7, AS-A11 | 4.3 ordens 1 e 7 | bake: lados mínimos; apoio; `test:plinth` | L11 |
| AS-A8 | 4.3 ordem 4 | bake: UV polar no disco; colocação | L13 |
| AS-A9 | 4.3 ordem 5 | apoio | L9 |
| AS-A10, AS-A12, AS-A13 | 4.3 ordens 5 e 6; chave K4 (4.7) | apoio; `test:materials`: famílias e luminância mínima de superfície grande | L13 (material), L10 (luz) |
| AS-A14, AS-A20 | 4.3 ordem 13 | colocação: pendurado toca teto ou caixotão | L5 |
| AS-A16 | 4.3 ordem 10 | `test:signage` | L9 |
| AS-A17 | C4 | `test:power`: luminância mínima em porta; bake: lados da maçaneta | L5, L10 |
| AS-A18 | C5 | `test:materials`: `normalScale` da dedicatória | L9 |
| AS-A19 | C2 | captura de referência; frequência do albedo medida no bake | L5 |
| AS-H1 | 4.4 ordem 1 | `test:kit`: peça × `layout` | L1 |
| AS-H2 | 4.4 ordem 2 | bake: grão medido em mm; apoio da bola no pedestal | L14 |
| AS-H3 | 4.4 ordem 3 | apoio; colocação | L1 (o recheio que ocupa o vão das quatro peças), L14 (o resto) |
| AS-H4 | H-24 | iluminância mínima por peça | L10 |
| AS-H5, AS-H9 | 4.4 ordem 12 | colocação: arte fora das faixas de moldura; `media-crop-fraction`; px/m | L14 |
| AS-H6, AS-H7, AS-H10, AS-H11, AS-H12 | 4.4 ordens 4, 5, 7, 9, 10 | bake: lados mínimos, UV esférica pelo centro; `test:materials`: família certa por peça | L14 |
| AS-H8 | 4.4 ordem 6 | colocação: rede no eixo da quadra; folga contra banco, conjunto de treino e quiosque | L14 |
| AS-H13 | D22 | validador: centro de peça examinável entre 0,8 e 1,9 m | L14 |
| AS-H15 | 4.4 ordem 11 | `test:signage` | L8 |
| AS-H16 | AS-S1, AS-S4 | `test:shell-finishes` | L5, L7 |

### 4.4c Receitas que as listas ranqueadas não citavam (uma linha por receita)

| Receita | O que fazer | Lote |
|---|---|---|
| `gym-court-lines` | tinta lisa no piso, não lona (hoje lê como fita ou corda, fio de 14,8 mm) | L14 |
| `vent-grille` | encostar no reboco; normais de caixa | L5 |
| `ceiling-spot` | manter; lente apagada quando não tem slot de luz | L10 |
| `donation-box` | placa com texto, fenda, destino da moeda | L9 |
| `rope-stanchion`, `rope-span` | colisor fino, ponteira torneada | L9 |
| `atrium-pin-pendant` | assentar (L5); cúpula com espessura (L13) | L5, L13 |
| soleiras | pedra da biblioteca de materiais, no lugar da laje mostarda chapada | L7 |
| molduras de runtime (`#35261c` fixo) | material da biblioteca, com veio | L7 |
| `atrium-ball-laced` | a etiqueta de conferência no verso (texto de runtime) | L4 |
| pontos emissivos do armário da recepção | obedecem ao estágio de luz | L10 |
| placa do escritório (metade de baixo vazia) | texto no atlas da sala | L8 |
| escritório: mata-borrão (branco sobre branco) | papel com valor diferente do tampo | L7 |
| escritório: chapéu | interior modelado (forro, fita), que o exame vai mostrar | L11 |
| escritório: lombadas, estofados, mesa | manter: só pipeline (L5, L7), com as capturas de `HANDOFF.md` §9 como régua | L5, L7 |
| `bench`, `label-angled`, `history-entry` e demais não citadas | manter: só pipeline (normais, veio, tints) | L5, L7 |

### 4.4d Assets novos: ficha mínima

Materiais são sempre famílias que a sala já tem. Triângulos são teto; draws contam depois da fusão.

| Asset | Dimensões | Materiais | Triângulos | Nós próprios (draws) | Lote |
|---|---|---|---:|---|---|
| `office-answering-machine` | 0,22 × 0,16 × 0,07 m | plástico preto, latão | 400 | `__led`, `__play` (+2) | L3 |
| interior do `office-safe`; Livro de Termos; prova de etiqueta | livro de 0,30 × 0,22 × 0,05 m | ferro, buckram, papel | 600 | `__door` (+1) | L3 |
| Livro no púlpito | o mesmo livro | buckram, papel | 250 | +1 (teto temporário de ÁT-K1) | L3 |
| `call-speaker` | grade de 0,30 m na sanca | casca | 120 por sala | 0 | L5 |
| `atrium-skylight` | 6 × 6 m no campo do caixotão | casca; vidro como emissivo por estado do relógio | 2.500 | 0 | L5 |
| `wing-hoarding` (×5) | 2,4 × 2,6 m | madeira fosca, papel | 300 | fundido; `__peephole` é só mira | L9 |
| `atrium-entrance` | porta de enrolar de 3,2 × 2,8 m | ferro | 900 | `__shutter` (+1) | L9 |
| `service-stair-gate` | vão gradeado de 1,2 × 2,2 m, três degraus, água | ferro, pedra, água | 700 | +1 (água) | L9 |
| `mezzanine-lift-gate` | grade pantográfica de 1,6 × 2,4 m, com placa | ferro, latão | 800 | `__gate` (+1) | L9 (fechada), L23 |
| `leak-bucket` | 0,30 m | ferro | 200 | fundido | L9 |
| `atrium-plinth` | ver 4.3 ordem 1 | as cinco famílias do pódio, com água no lugar da lona | 6.500 | +7 a +10 | L11 |
| três medalhas | Ø 9 cm × 6 mm; face em relevo (chapéu; bola de cadarço; quatro bolas), verso liso com «MV» | latão | 500 cada | na mão e no soquete (+3) | L11 |
| lacre de conferência (×2) | papel e cera, 0,18 × 0,10 m; as silhuetas são texto no atlas da sala | papel, cera (tinta lisa) | 150 | `__seal` (+1 cada) | L11 |
| `atrium-main-switch` | chave faca sob a tampa | latão, ferro | 400 | `__lever` (+1) | L11 |
| `vault-*` | 5.8 | reboco molhado, ferro, latão, papel, buckram, nogueira fosca | casca 4.000; kit 8.000 | 5.8 | L12 |
| `sticker-pack` | 6 × 9 cm | papel | 60 | instanciado (+1 por sala) | L15 |
| painéis de tranca (teclado, roda, punção, casar, ordenar) | DOM, desenhados como o objeto de latão; no mundo o objeto só mostra fechado e aberto | — | — | — | L3 (teclado), L17 (os outros), com um esboço por painel no plano do lote |

### 4.5 Escritório (a régua) e o que ainda muda nele

Fica como está. Ganha função em objetos que já existem: cofre de ferro como container (L3),
secretária eletrônica (L3; dentro do teto de 53 lotes porque o cofre sai do kit), relógio que se
acerta (L3), chapéu examinável (L11), LEDs nas quatro gavetas do arquivo de mapas, quadro de cortiça
com miniaturas de papel em posições prontas, carrinho com as provas das alas (L15). Resíduos da
rodada anterior, com lote: mata-borrão (L7), interior do chapéu (L11).

### 4.6 Arquitetura compartilhada, portas e sinalização

| # | Item | Retorno | Custo | Lote |
|---|---|---|---|---|
| C1 | cornija proporcional ao pé-direito (0,22 m some numa parede de 8,4 m); trilho de quadros opcional por parede | médio | +~200 por sala | L5 |
| C2 | reboco: tirar as baixas frequências do albedo (sujeira 0,20 → 0,06; desempenadeira 0,2 → 0,08) | médio: some a repetição | 0 | L5 |
| C3 | lambri liso com almofadas (montante e travessa) | médio | +~380 por segmento | L7 |
| C4 | portas: maçaneta com as normais do tubo, veio vertical nos montantes, uma placa emissiva por porta (sem luz: o pool é fixo); clearcoat das folhas reduzido (disco branco sob a lanterna) | alto para orientação | 0 (a placa entra no atlas da sala) | L5 (maçaneta, veio), L10 (placa emissiva) |
| C5 | placas: navy como tinta; dedicatória em nogueira fosca com `normalScale` baixo | médio | 0 | L7, L9 |
| C7 | piso por ala: três receitas neutras (tábua corrida, mineral, vinil esportivo) tingidas pela paleta | alto para as alas | +2,1 MiB sem compressão (três receitas neutras, mais areia), já no livro-caixa | L7, L18+ |

### 4.7 Clima de luz (L10, com o estágio `house` em L11)

**O pool é fixo:** 8 spots, 2 points, 1 lanterna. Mudar a contagem recompila o prédio. A regra única
(D30): a sala onde o jogador está tem sempre **6 slots** (cinco chaves e uma lavagem); a sala
revelada por uma porta aberta tem **2** (lavagem e a chave mais próxima da porta); a troca acontece
ao cruzar o plano da porta, interpolada em 0,4 s. Ala de dois climas: três chaves por zona e a
lavagem compartilhada. Porta não recebe luz: recebe placa emissiva. Mural não recebe spot: recebe
uma barra emissiva de quadro (`picture-light`), que obedece ao estágio.

**Estágios** (por sala, por dado; aplicados numa vista de materiais por sala, M17):

| Estágio | Chaves | Lavagem | Emissivos | Ambiente da sala (`envMapIntensity`) | O que se lê |
|---|---:|---:|---|---:|---|
| `dark` | 0 | 0 | só a lista de emergência: pilotos dos quadros e placas de porta fotoluminescentes (0,03) | 0 | lanterna e pilotos |
| `service` | 0,7 | 0,5 | filetes baixos e placas de porta | 0,15 | piso, balcões, portas, peças; do lambri para cima, escuro (forro < 0,02) |
| `house` | 1,0 | 1,3 | sanca, fitas, pendentes, banners e barras de quadro a 1,0 | 1,0 | tudo: forro ≥ 0,08, parede acima do lambri ≥ 0,10, murais ≥ 0,15, instalação aérea com ΔL ≥ 0,05 contra o forro, piso ≤ 0,45 |

Valores são luminância relativa analítica (chaves, lavagem e termo de ambiente), conferida em
`test:power`; afinação final por captura. Sai a `ambientLight` global.

**Alvos das chaves** (o validador reprova luminária com alvo e sem slot; toda peça examinável tem
iluminância mínima, somando chaves e lavagem):

| Sala | K1 | K2 | K3 | K4 | K5 | Lavagem |
|---|---|---|---|---|---|---|
| Átrio | plinto (0; 0) | recepção (−2,75; 7,0) | mesa de toque (0; −5,6) | lounge e vitrine do Fundador (6,4; −1,6) | púlpito (0; 3,4) | piso central |
| Holyoke | vitrine-herói (−1; 1,8) | vitrine corrida, vãos 1–2 (manual, guia) | vãos 3–4 (retrato, fotografia) | rede e traje (o traje vai para junto do poste) | nicho da câmara e arquivos (4,4; 2,0) | quadra |
| Escritório | como está | | | | | |

**Consertos de luz que as capturas pediram:** discos duros de luz em reboco vazio (cone mais largo,
penumbra 0,6, e a chave que mirava a parede ao lado do mural vai para a mesa de toque); metade de
cima das paredes e murais sem luz (estágio `house` e barras de quadro); quadro estourado em
rosa-branco com lanterna e piloto (halo de 0,6–0,8 m e emissão limitada); dois reflexos estourados
no piso da Holyoke (rugosidade mínima do piso em 0,35); teto da Holyoke como tampa escura (paleta na
casca, AS-S1, e 0,05 de lavagem no forro em `service`); disco branco nas portas sob a lanterna
(clearcoat das folhas reduzido). Exame: luz de mão presa à câmera, no slot da lanterna;
`examineScale` ≈ 0,7 para peças com luminância abaixo de 0,15.

### 4.7b A planta do saguão (fixada em L9; coordenadas **[a validar]** por `room-overlap`, inundação e `test:signage`)

Átrio de 18 × 18 × 8,4 m, origem no centro; +x é leste (escritório), +z é sul (entrada). Diante de
cada vão fica livre uma faixa de 3 m de largura por 4 m de profundidade.

| Parede | De eixo a eixo | O que fica |
|---|---|---|
| Oeste (x = −9) | z = −6 | mural do ataque, alto (y 2,6 a 7,6), com barra de quadro e legenda à altura do olho; abaixo dele, o quadro de serviço (z ≈ −4,2), assentado no reboco |
| | z = −2 | porta da Ala 1 |
| | z 0,4 a 5,6 | **dedicatória** (y 1,45 a 2,95): é a parede que o jogador encara ao sair do escritório; acima dela, um banner (z = 3,75) |
| | z = 6,4 | porta de serviço (o atalho), com placa «SERVIÇO» |
| Norte (z = −9) | x = −7,6 | cabine do elevador do mezanino (2,2 × 2,2 m), grade fechada com placa |
| | x = −4,5 | tapume → porta da Ala 2 |
| | x −2,9 a 2,9 | **parede de orientação** «SEIS ERAS, SEIS ALAS», com seis selos (y 0,97 a 2,13); acima de 5,4 m, a faixa reservada ao vão do mezanino: sem arte nem lambri contínuo |
| | x = +4,5 | tapume → porta da Ala 3 |
| Leste (x = +9) | z = −5 | tapume → porta da Ala 4 |
| | z = −1 | **vitrine do Fundador** (a torre) e, acima, o mural do mergulho (y 2,6 a 7,6) |
| | z = +3 | porta do escritório |
| | z = 5,25 | banner |
| | z = 7,5 | escada de serviço do subsolo, gradeada, com água no segundo degrau |
| Sul (z = +9) | x = −5,5 | tapume → porta da Ala 5 |
| | x = ±2,75 | dois banners |
| | x = 0 | **entrada principal**, porta de enrolar de aço |
| | x = +5,5 | tapume → porta da Ala 6 |

| No piso | Posição | Observação |
|---|---|---|
| Plinto, tablado e anel | (0; 0), raio do anel 2,2 m | abertura do anel virada para leste |
| Púlpito (mesa de assinatura) | (0; 3,4), virado para o norte | visível em linha reta da porta do escritório; a lâmpada acende quando há termo assinável |
| Mesa de toque (as quatro réplicas) | (0; −5,6), 3,2 m ao longo de x | diante da parede de orientação: cada bola aponta para uma era |
| Recepção (ilha, com o gaveteiro como contra-balcão) | (−2,75; 7,0), ao longo de z | à esquerda de quem entra; folheto, livro de visitas, achados e perdidos |
| Lounge e sofá (o banco de escuta do saguão) | (6,0; −1,8) | o "canto do Fundador", junto da vitrine dele |
| Caixa de doação | (1,9; 7,4) | junto da entrada |
| Fila de cordas | diante da recepção | com colisão e uma entrada clara |
| Balde e goteira | (2,4; −1,6) | sob o vidro trincado da claraboia |
| Dois biombos | (7,8; 6,2) e (7,6; −7,4) | avisos «SUBSOLO INTERDITADO» e «DEPÓSITO DE MONTAGEM»; o terceiro sai |

Da porta do escritório, no escuro: o piloto vermelho a 22° à direita do eixo, visto por cima da
silhueta do plinto; a fresta de lanterna da entrada fica fora do quadro (a mais de 70°).

### 4.8 O livro-caixa (refeito depois da revisão)

Regra: **o estimador por dado (M14, L5) é o único portão automático**; ele conta kit, dispositivos,
containers, pickups, blocos de texto, arte e folhas de porta, por sala e por par de salas ligado por
porta. A medição em frame é manual, registrada no HANDOFF, depois de reload limpo. Até L5 valem
catracas (o número medido hoje não pode crescer).

| Orçamento | Teto | Hoje | Projeção | Quando fecha |
|---|---|---|---|---|
| Textura por trio de salas (materiais + mídia + atlas de texto) | 45 MiB (D24) | 98,6 residentes (43,9 de materiais; 54,7 de mídia, sem portão) | sem KTX2: 39,1 de materiais (31,9 depois de AS-L3, mais 7,2 de receitas novas, pisos, areia e água) + 3 × 12 de mídia + texto ≈ **75–80, não cabe**. Com KTX2: materiais ≈ 9; mídia ≈ 3 por sala; texto ≤ 1,5 por sala; pior trio ≈ **22–27** | L7 |
| Catraca de textura até L7 | 98,6 MiB | 98,6 | nenhum lote antes de L7 acrescenta textura nem mídia (as etiquetas de L4 são texto de runtime) | L1 |
| Receita nova de textura | 2 MiB sem compressão | — | malha de lã a 512/256/128; couro de bola antiga 1,375; pedra 1,75; papel sem pauta 0,69; tinta lisa 0,69; três pisos neutros e areia 2,1 | L7, L14 |
| Draws de kit, átrio | 56 lotes hoje; depois, por material | 56 | ≈ 11–13 fundindo **todo** o kit estático (22 se as receitas repetidas ficassem instanciadas: por isso fundimos tudo) | L6 |
| Draws por frame, átrio | alvo móvel 45; teto 100 (teto temporário de 102 até L6) | 80; pico de 100 na diagonal sudeste | ≈ 35–40 depois da fusão; +1 das placas (atlas), +7 a +10 do plinto, +6 de entrada, escada, grade, lacres e Livro: **≈ 50–57 no estado final** [medir] | L6, depois cada lote |
| Draws, par de salas com porta aberta | 100 | 93 (átrio + Holyoke) | átrio ≈ 55 + ala ≤ 45 = 100: no limite; o tier baixo desenha a vizinha sem as peças (M28) | L6, L17 |
| Programas | catraca no valor medido | 34–35 (o papel dizia 25) | medir depois da fusão; o teto passa a ser o medido; 11 programas ainda sem nome | L1 (catraca), L6 |
| Triângulos por frame, átrio | alvo móvel 90k; teto 150k | 64.256 | casca 17,8k + kit 47,2k (todo desenhado depois da fusão) + peças em malha de vitrine 8k (não 19,3k) + plinto 6,5k + portas e tapumes ≈ 9k = **≈ 88k**: no alvo, sem folga | L6, L11 |
| Folha de porta | 900 triângulos (hoje 2.236) | 4.472 por porta dupla | 11 portas no átrio final: de 49k para ≈ 20k; porta fechada desenhada instanciada, só a porta em uso é clonada (M45) | L6 |
| Triângulos, par com porta aberta | 150k | — | átrio 88k + ala ≤ 45k (casca 8k, kit 20k, peças em vitrine ≤ 17k) = **≈ 133k**: dentro do teto, acima do alvo móvel; no tier baixo a vizinha entra sem peças | L17 |
| Triângulos instanciados (agora fundidos), átrio | 50.000 | 46.272 | ≈ 47.200 (o plinto sai dessa conta: é herói) | L9, L13 |
| Casca do átrio | 30.000 | 10.832 | ≈ 17.800 (lambri, claraboia, alto-falante) | L5, L9 |
| Holyoke, kit | 30.000 (teto novo) | 16.868 | ≈ 22.000 | L14 |
| `kit.glb` | catraca em 2.189 KB até L6; depois, 1,5 MB por sala | 2.189 KB (antes do primeiro frame) | −16% sem as receitas ociosas (L5); por sala em L6 | L1, L5, L6 |
| Buffers da fusão | — | — | 2,3 MiB no átrio (Float32, depois de dequantizar) | L6 |
| Bundle por caminho | 250 KB gzip antes do clique; 600 depois (catraca desde L1) | ≈ 95 KB antes do clique | o store não importa conteúdo (M5); dicionário em camadas em L17; transcoder do KTX2 depois do clique | L1, L17 |

**Linha de base de P0 (2026-10-04, `docs/lotes/P0-linha-de-base.md`).** A medição no navegador
confirma a coluna "Hoje", menos em três linhas. O **par de salas com a porta aberta** chega a
128 draws e 101.310 triângulos (da Holyoke, olhando o átrio pela porta; o papel dizia 93): o teto
de 100 já está estourado, a catraca de L1 para o par é 128, e quem o baixa é L6 e L17. A
**diagonal sudeste do átrio** dá 101 draws, dentro do teto temporário de 102. A **textura
residente** é 107,08 MiB, não 98,6: a soma antiga deixava de fora as duas imagens em SVG
(7,49 MiB) e o atlas de texto (1,00 MiB); a catraca até L7 é o número medido. Os programas são 35.

Se a medição em aparelho real (P0, L6) mostrar que os alvos móveis de papel estão errados, os tetos
desta tabela mudam para os medidos, e a mudança é registrada no HANDOFF.

### 4.9 Alavancas para comprar folga, em ordem de retorno

| # | Alavanca | Ganho | Custo | Lote |
|---|---|---|---|---|
| AS-L1 | fundir **todo** o kit estático por material, por sala, **no bake** (um `Mesh` por material; receitas dinâmicas ficam soltas; posição e normal dequantizadas para Float32 antes da matriz) | átrio 56 → ~11–13 draws de kit; Holyoke 28 → ~10; escritório 53 → ~12; frame do átrio ~80 → ~35–40 **[medir]** | 2,3 MiB de buffers no átrio (57.476 vértices); perde culling por objeto (os 47k do kit entram em todo frame); proxies de mira por colocação; colisores em espaço de sala no manifesto | L6 |
| AS-L2 | lambri ripado dentro da casca do átrio | −3 lotes, −4.968 triângulos instanciados; resolve AS-A4 e AS-A5 | +~4,5k na casca | L9 |
| AS-L3 | realocar VRAM sem KTX2: normal do `leather-tan` 1024 → 512; albedo do `plaster` 1024 → 512; ORM 512 → 256 em reboco, madeira, lona e couro | **−12 MiB** | conferir o reboco a 1 m | L7 |
| AS-L5 | mídia no portão e reduzida | murais 8,0 → 4,5 MiB cada | re-exportar dois arquivos | L7 |
| AS-L6 | tirar do kit as receitas que nenhuma sala usa | −17.156 triângulos, ~165 KB gzip no primeiro download | regra de bundle no bake | L5 |
| AS-L7 | KTX2 (ETC1S em albedo e ORM, UASTC em normal), **obrigatório** (D23) | materiais 43,9 → ~8 MiB; mídia 8× menor | transcoder de ~260 KB gzip, preguiçoso, depois do clique | L7 |
| AS-L8 | texto de placa num atlas de canal único (R8) por sala e idioma, desenhado por uma malha só | doze placas custam +1 draw por sala, não +16 | ≤ 1,5 MiB por sala, dentro do orçamento de textura; a prontidão do atlas entra no aquecimento de GPU | L8 |
| AS-L9 | (abandonada) usar os dois slots retidos com as portas fechadas | — | contradiz "a luz da sala atual não muda ao abrir a porta"; ficou o pool 6 + 2 fixo (D30) | — |

### 4.10 Portões de asset (o equivalente a `test:desk-top` e `test:bookshelf`)

- **`npm run test:room-placement`** (M40), por sala, com a geometria real: peça de parede encostada
  (±1 mm) no reboco ou na superfície declarada; `supportY` igual a uma superfície exportada pela
  receita; peça sem interseção com o kit (SAT, 2 mm); arte de parede fora das faixas de moldura;
  pendurado tocando teto ou caixotão; colocações sem sobreposição coplanar; toda luminária com
  `lightTarget` recebe slot.
- **No bake:** apoio e folga **intra-receita** (o que flutuava dentro de receita: cadeiras a 42,5 mm,
  medalha da torre a 22 mm, rolos a 112–222 mm); normais exatas em faces planas maiores que 20 cm²;
  lados mínimos em famílias metálicas; UV esférica pelo centro da peça; folga gomo × núcleo; paleta
  da casca conferida; classe de orçamento por receita; mídia somada à textura; grão medido em mm.
- **`test:materials`:** neutralidade de toda receita tingida, com tolerância numérica (ΔE médio ≤ 2
  e máximo ≤ 5 por material, sob branco, chave de galeria e lanterna) entre antes e depois do
  recálculo de tints; cintilação do piso; `media-crop-fraction`.
- **Estimador de orçamento (M14)** no `check`: draws e triângulos por sala e por par de porta,
  textura por trio, assinaturas de programa.
- **Manifesto de capturas:** o `check` avisa quais folhas de contato estão vencidas (hash da receita).
- **Aceite visual do dono** (manual, passo do processo 9.1): folha antes/depois e a imagem-alvo da
  sala em `docs/concepts`. "Bonito" não é só ausência de defeito medido.

---

## 5. As salas novas

### 5.1 O que vale para todas

**Pegadas (fixadas em L9 como salas `deferred` no validador `room-overlap`; números [a validar]).**
A planta do saguão e a posição de cada vão estão em 4.7b.

| Sala | Vão no átrio | Pegada (mundo, metros) | Interior |
|---|---|---|---|
| Ala 1 · Holyoke | oeste, z = −2 (existe) | x −21,25…−9,25 · z −8…8 | 12 × 16 × 4,2 |
| Ala 2 · Paris | norte, x = −4,5 | x −13,5…−0,5 · z −23,25…−9,25 | 13 × 14 × 4,2 |
| Ala 3 · Tóquio | norte, x = +4,5 | x 0,5…13,5 · z −23,25…−9,25 | 13 × 14 × 5 |
| Ala 4 · Ferro e Areia | leste, z = −5 | x 9,25…26,25 · z −8,5…−1,5 (encosta em Tóquio por x 9,25…13,5: conferir a espessura das duas paredes) | 17 × 7 × 5 |
| Ala 5 · A Reescrita | sul, x = −5,5 | x −13,5…−2,5 · z 9,25…22,25 | 11 × 13 × 4,2 |
| Ala 6 · Global | sul, x = +5,5 | x 2,5…14 · z 9,25…23,25 | 11,5 × 14 × 4,5 |
| Vestíbulo e portaria | sul, x = 0 | x −2…2 · z 9,25…15,25 | 4 × 6 × 3 |
| Mezanino | elevador no canto noroeste; vão alto na parede norte | por cima das Alas 2 e 3, piso a ≈ 5,4 m | 18 × 4 |
| Caixa-forte do Fundador | plataforma do plinto | fora da planta, origem ≈ `[0, 0, −40]`, no mesmo nível | 5.8 |

- A caixa-forte fica, na ficção, sob o átrio; no mundo é uma sala no mesmo nível, alcançada só pela
  plataforma. O motor não precisa de células em 3D. A planta do caderno a mostra numa aba "Subsolo".
- **Molde do quadro:** em toda ala o quadro fica na parede oposta à entrada, com o piloto a até 35°
  do eixo de quem entra e linha de visão livre (o mesmo teste de farol de H-26).
- **Cada lote de ala tem três fatias:** (0) **desenho**: planta medida com `room-overlap` e
  inundação, folha de alvos de luz, fontes da ala capturadas, tabela de peças e de `claims` fechada,
  textos em pt-BR e inglês; (a) **motor**, se a ala pedir algo que L17 não trouxe, publicado com
  grafo e capturas idênticos; (b) **conteúdo**: nenhum arquivo de `src/` muda fora de `src/content/`
  e dos gerados. O portão da fatia (b) é mecânico (`git diff --stat`).

**A partitura de uma ala (10 a 12 minutos).** Limiar com vitrine-isca (20 s) → travessia no escuro
com três vislumbres autorais (50 s) → religar, na parede oposta, e a chamada do Jorge (20 s) → herói
(90 s) → gesto-assinatura (2 min) → arquivo (90 s) → tranca ou ritual (90 s) → peças restantes
(2 min) → banco de escuta ou segredo (opcional) → fecho: a sala fica azul na planta, o termo no
púlpito, o selo aceso.

**Envelope de orçamento de uma ala.**

| Item | Teto |
|---|---|
| Casca | 8.000 triângulos |
| Kit da sala | 20.000 triângulos, fundidos por material (até 14 materiais); arquivo `kit-<sala>` de até 0,6 MB |
| Peças | 8 examináveis: malha de vitrine até 2.000 cada (um herói até 4.000); malha de mão até 15.000, sob demanda |
| GLB total da sala | 1,5 MB |
| Texturas próprias | tints sobre as receitas neutras; receita nova até 2 MiB sem compressão |
| Mídia de parede | até 3 MiB comprimidos; até 300 px/m |
| Draws e triângulos | sala até 45 draws e 45k triângulos; par com o átrio dentro de 100 draws e 150k |
| Programas | zero novos |
| Luz | cinco chaves e uma lavagem (três por zona, numa ala de dois climas) |
| Texto | 8 placas (título e uma frase), 8 etiquetas de exame (até 320 palavras no total), até 7 documentos, 1 banco de escuta, 2 figurinhas, 1 ficha de dúvida, 1 prova de etiqueta |
| Fontes | placa só afirma fato com dois publicadores, ou só descreve o objeto; fato de uma fonte vai para o verso, a gaveta, o banco ou a figurinha; no máximo **uma** placa sobre o Brasil por ala e até 20% das curiosidades da sala |

Nas tabelas de peças: **Cat.** é a categoria de 7.8 (O original, P peça de época, T reconstrução
tipológica, R reprodução, M réplica de manuseio, C cenografia). "No lugar" é exame no lugar (6.4).
O verso é sempre a etiqueta de conferência do Otávio, em texto de runtime. Fato marcado *(capturar)*
é portão da fatia 0: sem captura de dois grupos, a frase da placa cai para a descrição do objeto.

**Chamadas do Jorge em toda ala** (cada fala em chaves de até 130 caracteres): `porter-wing-delivered`
(ao subir da caixa-forte com a pasta aberta), `porter-<w>-lit`, `porter-<w>-lock` (o contato da
tranca principal no painel do alarme) e o fecho do termo (sequência dirigida). As dicas de cada
tranca seguem a escada de 8.3; a tabela está no Anexo B.2.

### 5.2 Ala 2 · Paris (1930–1949) — «a sala da mesa verde» · L18

- **Premissa.** O jogo deixa de ser recreação e vira esporte governado: em Paris, em abril de 1947,
  federações da Europa, da África e das Américas fundam a federação internacional. É a primeira sala
  em que o museu expõe uma coisa cujo original admite nunca ter achado.
- **Layout.** Entrada pelo sul (a parede do átrio). Cotovelo de entrada com a vitrine de areia
  coberta por um pano («falta o distintivo de praia»). A mesa de 4,6 m no centro, sob uma lâmpada só.
  A leste, **o calendário interrompido**: um corredor de quatro metros com calendários de parede, os
  de 1941 a 1944 marcados. O quadro na parede norte, depois da mesa.

| Peça | Suporte | Placa: manchete e frase (fato) | Verso | Cat. | Fio |
|---|---|---|---|---|---|
| `folder-statutes-1947` | sobre a mesa; na mão | «A mesa de Paris» — Em abril de 1947, federações da Europa, da África e das Américas fundaram aqui a federação internacional (F24) | «RECONSTITUIÇÃO. Nenhum exemplar dos estatutos foi localizado. — O.» | C | — |
| `placecard-bresil` | um dos marcadores da mesa; na mão | «Brésil» — O Brasil estava entre as fundadoras, com Egito, Uruguai e Estados Unidos (F24) | «Marcador composto pelo museu. — O.» | C | — |
| `ball-laced-1935` | mesa-vitrine; na mão; ao lado, sem exame, uma bola de válvula dos anos 1940 | «A bola de cadarço» — Gomos de couro fechados por um cadarço, como em meados dos anos 1930 *(capturar; senão, só a descrição)* | «Em 1940 a regra americana já pedia bola sem cadarço. — O.» | T | `ball` 2 |
| `net-tarred-1940s` | chão; no lugar | «Rede de corda alcatroada» — Reconstrução: corda alcatroada e faixa de lona | segunda vista: «O museu não achou regulamento que date a antena. — O.» | T | `net` 2 |
| `rulebooks-1947` | plinto; na mão | «Quase a mesma quadra» — Em pés ou em metros: a quadra métrica ficou um palmo menor *(capturar as duas medidas)* | «Trinta por sessenta pés, contra dezoito por nove metros. — O.» | T | `rules` 2 |
| `medal-prague-1949` | vitrine de parede; na mão | «Praga, 1949» — O primeiro Mundial masculino foi em Praga, em 1949; o feminino, em 1952 (F27) | «Desenho do museu; nenhuma medalha localizada. — O.» | C | — |
| `calendar-interrupted` | corredor; no lugar | «O calendário interrompido» — De 1941 a 1944 o campeonato soviético não foi disputado *(reabrir a fonte)* | segunda vista: «Em 1937 também não houve. — O.» | C | — |
| `portrait-libaud` | parede; na mão | «O primeiro presidente» — Paul Libaud presidiu a federação por trinta e sete anos (F26) | «A sede só saiu de Paris em 1984. — O.» | R, se a imagem tiver instituição de guarda capturada; senão C | — |

- **Tranca principal: `paris-statutes-box`** · conhecimento, **contado** · roda de presença de dois
  tambores, na borda da mesa. Os catorze marcadores são uma receita instanciada, com o país em
  francês no cartão (Belgique, Brésil, Tchécoslovaquie, Égypte, France, Hongrie, Italie, Pays-Bas,
  Pologne, Portugal, Roumanie, Uruguay, États-Unis, Yougoslavie) e uma linha em pt-BR ou inglês. O
  jogador dá a volta na mesa, conta e gira os tambores; `E` confirma. Evidência declarada: a mesa
  (`test:locks` conta os marcadores assados e compara com `digits`). Abre a caixa-despacho de couro.
  Pergunta: «Quantas federações se sentaram a esta mesa?»
- **Ritual opcional: `paris-beyond-europe`** · `match` · no plano de mesa as dez europeias já estão
  alfinetadas; o jogador leva quatro alfinetes (Brasil, Uruguai, Estados Unidos, Egito) às regiões
  de fora da Europa. A ficha nomeia as regiões e não conta continentes.
- **Gavetas de distintivo.** `paris-rules-dossier` (`indoor`); `paris-sand-drawer` (`beach`, L19).
- **Documentos (7).** `doc-folder-paris`, `doc-prague-memo` (F23), `doc-sixteen-doubt` (F30, ficha
  de dúvida), `doc-otavio-note-paris`, `doc-proof-paris`, `doc-president-note` (F26, F90),
  `doc-table-plan`; F25 entra no memorando.
- **Figurinhas.** F28, F29. **Banco de escuta.** «O café em Praga» (F23).
- **Jorge.** `porter-paris-lit`: «Ala 2 acesa. Na ficha da obra diz "mesa de congresso". O Otávio
  dizia que essa sala se entende dando a volta na mesa. Câmbio.» (Nenhuma fala diz a contagem.)
- **Vista.** Do cotovelo, a mesa verde sob uma lâmpada. Ao religar, as luminárias de mesa acendem
  uma a uma, como chamada.
- **Orçamento.** A baeta usa o veludo neutro; o corredor do calendário não gasta chave de luz.
- **Portões de fonte da fatia 0.** O catorze capturado em dois grupos (lista de nomes); o regulamento
  americano de 1940 e as duas medidas de quadra; o calendário soviético; a antena (sem fonte, vale o
  texto acima, que não data nada).

### 5.3 Ala 3 · Tóquio (1950–1969) — «a sala que tem praia dentro» · L19

- **Premissa.** Em vinte anos o vôlei vira esporte olímpico. A lição do Otávio: o ano que todo mundo
  lembra não é o que explica. Ao mesmo tempo, na Califórnia, o jogo de duplas na areia vira esporte.
- **Layout.** Entrada pelo sul. Metade sul em penumbra de ginásio; metade norte com a quadra de areia
  e um painel de céu no forro. O quadro fica na parede norte, do lado da praia. Duas zonas de luz.

| Peça | Suporte | Placa: manchete e frase (fato) | Verso | Cat. | Fio |
|---|---|---|---|---|---|
| `ball-1964-used` | torre; na mão | «A bola dos Jogos de 1964» — Reconstrução: o museu não sabe qual fabricante fez a bola usada em quadra | «Vários fornecedores foram aprovados em 1964. — O.» (F38, com o PDF lido) | T | `ball` 3 |
| `medal-tokyo-1964` | caixa de laca; na mão | «Tóquio, 1964» — O vôlei entrou nos Jogos Olímpicos em Tóquio, em 1964 *(capturar)* | «Reconstrução; o museu não viu a medalha. — O.» | C | — |
| `uniform-nk-1964` | manequim; no lugar | «As operárias de Kaizuka» — O time japonês jogou com nove de cada lado até 1958 (F33) | segunda vista: «De manhã, a fiação; o treino ia até a madrugada. — O.» (F34) | T | — |
| `kit-cccp-1962` | manequim; no lugar | «Moscou, outubro de 1962» — Em outubro de 1962, jogando em casa, a União Soviética perdeu o Mundial feminino para o Japão. **É a única chave com o numeral** | segunda vista: «Dois anos depois, o mesmo time foi ouro em Tóquio. — O.» | T | — |
| `pennant-ussr-1964` | parede; na mão | «O primeiro ouro masculino» — O primeiro torneio olímpico masculino foi vencido pela União Soviética (F88, *capturar*) | «Flâmula feita pelo museu. — O.» | C | — |
| `scoresheet-brazil-1964` | mesa-vitrine; na mão | «Sétimo em Tóquio» — O Brasil estava no primeiro torneio olímpico e ficou em sétimo (F45) | «O Brasil tinha sediado o Mundial quatro anos antes. — O.» (F44) | C | — |
| `letters-bundle` | mesa-vitrine; na mão | «Depois do Mundial» — O time campeão seguiu junto até os Jogos *(capturar)* | «Cerca de cinco mil cartas pediram que continuassem. — O.» (F35) | C | — |
| `beach-court-1960` | areia; no lugar, com **vista baixa** | «A praia em duplas» — As duplas na areia vêm de Santa Monica, por volta de 1930 (F40). «Olhe a areia com luz de lado.» | na vista baixa, a tampa de garrafa: «Em 1948 o prêmio de um torneio foi um engradado de refrigerante. — O.» (F41) | C | `beach` 1 |

- **Tranca principal: `tokyo-trophy-punch`** · conhecimento · punção de data de quatro rodas com
  alavanca, sob o troféu. Pergunta: «Em que ano a União Soviética perdeu, em casa, o Mundial
  feminino?» (a pergunta exclui o ano-armadilha, o dos Jogos). Fonte única: a placa do uniforme
  soviético.
- **Distintivo `beach`.** No exame no lugar da quadra de areia, a terceira vista é rente ao chão: a
  luz de mão do exame fica rasante e a tampa enterrada brilha; `E` nela cataloga a peça e concede o
  distintivo (por dentro da tampa, com cera). A placa e o Jorge plantam «luz de lado». A lanterna
  não é exigida.
- **Trilho da Kaizuka.** Leitura (quatro quadros de um movimento de treino). Só vira ritual `order`
  com fonte capturada para o movimento.
- **Documentos (6).** `doc-folder-tokyo`, `doc-otavio-note-tokyo`, `doc-ball-1964-maker-doubt` (ficha
  de dúvida, F38), `doc-proof-tokyo`, `doc-beach-chronology` (F42, F43), `doc-sofia-1957` (F31 fica
  na figurinha; aqui, F32 sem o ano).
- **Figurinhas.** F31, F39. **Banco de escuta.** «Ponto do ouro» (F36, «conta-se que»).
- **Jorge.** `porter-tokyo-lit`: «Ala 3. Na ficha da obra diz "praia dentro de sala", não me pergunta
  como. O Otávio dizia: olha a areia com luz de lado. Câmbio.»
- **Vista.** Religar acende o painel de céu: amanhece dentro do prédio, e o primeiro passo na areia
  troca o som do passo.
- **Orçamento.** Areia como peça de kit sobre a laje (receita neutra de areia, 4.8); painel de céu
  emissivo, que obedece ao estágio; superfície de passo `sand` (M18).
- **Portões de fonte.** `1962` em dois grupos; `olympics.com` reaberto para «em Moscou»; o PDF do
  J-STAGE lido (F38); F88.

### 5.4 Ala 4 · Ferro e Areia (1970–1989) — «a da areia» · L20

- **Premissa.** O jogo se parte em dois: ginásio e praia, duas luzes na mesma sala. E a lição mais
  dura do Otávio: **leia o mês e o ano; não faça a conta.**
- **Layout.** Sala comprida e contínua, entrada pelo oeste. Metade oeste: o ginásio frio. Metade
  leste: o pátio de areia aceso como dia, visto por um vão de doca **sempre aberto** (moldura, sem
  tranca). O quadro na parede leste, no fim do pátio. O carrinho fica junto da entrada. Não há atalho
  (D29). Três chaves de luz por zona.

| Peça | Suporte | Placa: manchete e frase (fato) | Verso | Cat. | Fio |
|---|---|---|---|---|---|
| `net-heights-post` | poste com manivela; no lugar, **três vistas = três alturas** | «Três alturas» — A rede feminina, a masculina e, a giz, a de 1897 *(capturar as duas alturas atuais; `asOf`)* | terceira vista: «A giz, a altura do Morgan. — O.» | T | `net` 3 |
| `jersey-skorek` | manequim; no lugar | «O capitão de Montreal» — A Polônia foi campeã olímpica em Montreal, em 1976 *(capturar)* | segunda vista: «Edward Skorek, capitão. Camisa feita pelo museu. — O.» | T | — |
| `coach-dossier` | fichário; na mão | «O dossiê do técnico» — Hubert Wagner assumiu a seleção da Polônia sem nunca ter treinado um time (F46) | a última folha: «Assume em maio de 1973, aos trinta e dois anos.» **É a única chave com o numeral** | C | — |
| `kit-ussr-1980` | manequim; no lugar | «Moscou, 1980» — A União Soviética venceu os dois torneios olímpicos de 1980 (F89, *capturar*) | segunda vista: «Jogos com boicote: nem todos vieram. — O.» | T | — |
| `ball-fivb-white` | na areia; na mão | «A mesma bola» — Bola branca de dezoito gomos, reconstrução | «De 1964 a 1998 a bola quase não mudou de forma. — O.» | T | `ball` 4 |
| `plaque-manhattan` | chão do pátio; no lugar | «Manhattan Beach» — O Aberto de Manhattan Beach é jogado desde 1960 *(capturar)* | segunda vista: «Quem vence ganha uma placa cravada no píer. — O.» (F51, `asOf`) | C | `beach` 2 |
| `jersey-kiraly` | suporte fixo, de frente; no lugar | «Duas arenas» — Karch Kiraly foi ouro na quadra em 1984 e 1988 e na areia em 1996 (F50) | segunda vista (a gola): «Número em pesquisa: falta fonte primária. — O.» | T | — |
| `medal-la-1984-silver` | vitrine; na mão | «Prata antes do ouro» — A primeira medalha olímpica do vôlei brasileiro foi de prata, em 1984 (F55) | «Reconstrução; o museu não viu a medalha. — O.» | C | — |

- **Gesto-assinatura: a manivela da rede.** Dispositivo de estados discretos (`stepper`, M43): três
  posições, cada uma é uma vista do exame no lugar. Na mais baixa, a fita fica logo acima do olho,
  como na Ala 1; na mais alta, aparece a luva do poste. Não há travessia nem troca de colisor.
  Concluir as três cataloga `net-heights-post`.
- **Tranca principal: `ironsand-coach-file`** · conhecimento · teclado de quatro dígitos. Pergunta:
  «Em que ano Hubert Wagner assumiu a seleção da Polônia?» Ano-armadilha: o do título mundial, a que
  se chega fazendo a conta do Hall da Fama. Quem o digita erra; a escada leva à última folha do
  dossiê; `doc-wagner-year-doubt` mostra a conta que dá errado.
- **Ferramenta `crate-dolly`** (não consumida), com dois usos: tirar o caixote «4-B» da frente do
  armário de vestiário (FA-04) e, na caixa-forte, mover o caixote pesado da reserva (FA-06).
- **Armário `ironsand-kiraly-locker`.** Lacre de conferência (a camisa catalogada). Só vira cadeado
  de dois tambores, e a camisa só ganha número e suporte giratório, com fonte primária (D14).
- **Trilho das redes `ironsand-honours-rail`.** Leitura. Só vira ritual, e a antena só ganha data,
  com regulamento capturado (D31).
- **Documentos (7).** `doc-folder-ironsand`, `doc-otavio-note-ironsand`, `doc-proof-ironsand`,
  `doc-wagner-year-doubt` (ficha de dúvida), `doc-kiraly-file` (F48, F49), `doc-ipanema-1987` (F56, F57),
  `doc-china-1980s` (F93, *capturar*); na gaveta do distintivo `sitting`, `doc-arnhem-1980` (F78).
- **Figurinhas.** F47, F52. **Banco de escuta.** «Jornada nas Estrelas» (F54).
- **Jorge.** `porter-ironsand-lit`: «Ala 4. Metade ginásio, metade praia. O Otávio dizia que ali o
  vôlei se separou em dois e nunca mais morou junto. Câmbio.»
- **Vista.** O ginásio frio e, pelo vão da doca, o pátio aceso: dois climas num olhar.
- **Cuidados.** Não imprimir "Técnico do Século" nem "Time do Século". A altura da rede nunca é
  código. Nenhum número modelado em camisa sem fonte (o lint lê os numerais declarados da geometria).
- **Plano B.** Se as duas zonas de luz não fecharem, duas salas unidas por um vão largo.

### 5.5 Ala 5 · A Reescrita (1990–1999) — «a sala dos dois placares» · L21

- **Premissa (padrão).** A década que reescreveu as regras: o ponto por rali, a bola colorida, o
  líbero. É a ala em que o jogador prova entendimento sem número nenhum. A versão «a televisão
  reescreveu o jogo» só entra com fonte que diga transmissão ou televisão para os três pares (D31).
- **Layout.** Entrada pelo norte. A mesa do árbitro no centro, entre os dois placares. A torre das
  duas bolas no eixo da porta. O quadro na parede sul.

| Peça | Suporte | Placa: manchete e frase (fato) | Verso | Cat. | Fio |
|---|---|---|---|---|---|
| `ball-white-last` | torre; na mão | «A última branca» — Bola branca de dezoito gomos, reconstrução | «Dezoito gomos, como a de 1964. — O.» | T | — |
| `ball-tricolour-1998` | a mesma torre, a 40 cm; na mão | «A bola que se lê» — Em 1998 a bola oficial deixou de ser branca (FIVB; Mikasa; Powerhouse) | «Mesma forma, outras cores. Vieram de testes com muitas. — O.» (F61) | T | `ball` 5 |
| `shirt-libero-1998` | manequim; no lugar | «O líbero» — Testado a partir de 1996, regra oficial em 1998 (F59) | segunda vista: «"Líbero" é "livre", em italiano. — O.» (F60) | T | — |
| `scoreboards-pair` | os dois placares; no lugar | «Dois placares, um jogo» — Ratificado em outubro de 1998 e obrigatório em 2000, o ponto por rali faz todo rali valer ponto | o detalhe obrigatório é **ver o replay até o fim** | C | `rules` 3 |
| `referee-table` | centro; no lugar | «A mesa do árbitro» — Súmula, plaquetas de substituição e a alavanca do replay | segunda vista: «Cenografia: nenhuma peça desta mesa é de época. — O.» | C | — |
| `jersey-cuba-1990s` | manequim; no lugar | «Três ouros seguidos» — Cuba venceu três torneios olímpicos femininos seguidos, de 1992 a 2000 (F91, *capturar*) | segunda vista: «Regla Torres foi campeã olímpica aos dezessete. — O.» (F69) | T | — |
| `trophy-italy-1990s` | vitrine; na mão | «Três Mundiais seguidos» — A Itália venceu os Mundiais masculinos de 1990, 1994 e 1998 (F92, *capturar*) | «Troféu feito pelo museu. — O.» | C | — |
| `medal-atlanta-1996-beach` | vitrine; na mão | «Uma final só de brasileiras» — As primeiras campeãs olímpicas do Brasil saíram de uma final brasileira, em 1996 (F67) | «Demonstração em Barcelona, 1992; medalha a partir de Atlanta. — O.» | C | — |

- **Gesto-assinatura: dar o replay.** Uma alavanca na mesa do árbitro repete a mesma sequência de
  oito ralis (`sequence-player`, M43; a sequência é dado). O placar da esquerda só marca quando quem
  sacou venceu; o da direita marca sempre. Ver até o fim cataloga `scoreboards-pair`.
- **Tranca principal: `rewrite-congress-case`.** Com fonte para os três pares: ritual `match` de
  três mudanças (ponto por rali, bola colorida, líbero) com três **efeitos documentados** (placar que
  todos acompanham; bola que se vê girar; o efeito do líbero, a capturar). Sem a terceira fonte: lacre
  de conferência das oito peças. O padrão do plano é o lacre.
- **Gavetas de distintivo.** `rewrite-beach-press-file` (`beach`): `doc-beach-olympic`, nó do fio.
  `rewrite-paralympic-drawer` (`sitting`): `doc-standing-paralympic` (F79), nó do fio.
- **Documentos (6).** `doc-folder-rewrite`, `doc-three-changes` (F63), `doc-libero-two-dates` (ficha
  de dúvida **datada**: «consultado em outubro de 2026», com as duas páginas capturadas),
  `doc-proof-rewrite`, e os dois das gavetas.
- **Figurinhas.** F62, F65. **Banco de escuta.** «Só pontuava quem sacava» (F62, F64).
- **Jorge.** `porter-rewrite-lit`: «Ala 5, a dos dois placares. O Otávio dizia que antes só pontuava
  quem sacava. Jogo que não tinha hora pra acabar. Câmbio.»
- **Vista.** No escuro, o vidro dos dois placares devolve a lanterna. Ao religar: teste de lâmpadas
  e zero a zero.
- **Portões de fonte.** Os três pares; F91, F92; ata do COI para qualquer data de reconhecimento
  olímpico da praia (sem ela, vale a frase do verso da medalha).

### 5.6 Ala 6 · Global (2000 em diante) — «a sala da bola com covinhas» · L22

- **Premissa.** O presente, a única ala que envelhece sozinha. A última regra do Otávio: não escreva
  na parede o que deixa de ser verdade em dois anos. Todo fato de regra vigente leva `asOf`.
- **Layout.** Entrada pelo norte. A quadra do vôlei sentado no centro (10 × 6 m). No fundo, um
  **canto** de quadra de areia em tamanho real, com as duas linhas (a antiga e a nova) a meio metro
  uma da outra, e o cavilheiro da corda na parede. O console de desafio à esquerda; o estojo dos
  moldes junto da saída; o quadro na parede sul.

| Peça | Suporte | Placa: manchete e frase (fato) | Verso | Cat. | Fio |
|---|---|---|---|---|---|
| `ball-eight-panel-2008` | torre; na mão | «Dez gomos a menos» — Em 2008 a bola perdeu dez gomos de uma vez, e perdeu o branco (F70) | «Escolhida para Pequim menos de dois meses antes. — O.» (F71) | P | `ball` 6 |
| `ball-adopted-latest` | a mesma torre; na mão | «A bola de [ano de adoção]» — texto de uma lista datada (M20), com fonte capturada | «Esta etiqueta tem data. Confira. — O.» | P | — |
| `court-sitting-lowered-plane` | centro; no lugar, com **vista sentada** | «Vôlei sentado» — Nasceu nos Países Baixos, em 1956, da mistura com o sitzball (F75) | na vista sentada: «A rede fica acima da cabeça de quem senta. — O.» (F76, `asOf`) | C | `net` 4; `sitting` 1 |
| `beach-rope-rack` | cavilheiro; no lugar, **duas vistas = dois lances** | «A quadra que encolheu» — Um metro mais estreita, dois mais curta (F72) | segunda vista: «Testada em 2001, confirmada em 2002. — O.» | T | `beach` 4 |
| `challenge-console` | à esquerda; no lugar | «O olho erra» — O desafio por vídeo deixa o jogo rever uma marcação *(capturar; `asOf`)* | o detalhe obrigatório é **julgar os três lances** | C | `rules` 4 |
| `podium-dated-list` | painel de tabela; no lugar | «O pódio, com data» — lista datada dos medalhistas olímpicos e mundiais, masculino e feminino, dos dois últimos ciclos; sem a palavra "maior", sem contar títulos | segunda vista: «Esta parede tem data. Troque a lista, não o museu. — O.» | C | — |
| `medal-arnhem-1980` | vitrine; na mão | «Estreia com medalha» — O vôlei sentado estreou nos Jogos Paralímpicos em Arnhem, em 1980; as mulheres entraram em 2004 (F78) | «Reconstrução; o museu não viu a medalha. — O.» | C | — |
| `ball-beach-handling` | bancada; na mão | «A bola de praia» — Réplica de manuseio: pode apertar | «Um pouco maior e bem mais murcha que a de quadra. — O.» (F73, `asOf`) | M | — |

- **Gesto-assinatura: sentar e julgar.** (1) A vista sentada do exame no lugar (olho a 0,75 m): a
  rede de pouco mais de um metro fica acima da cabeça; cataloga a peça e concede o distintivo
  `sitting`. (2) No console, três lances (`sequence-player` no modo `judge`): o jogador avança quadro
  a quadro e decide dentro ou fora. Errar não trava; julgar os três cataloga o console.
- **Tranca principal: `global-beach-trunk`** · conhecimento, **contado** · a corda de demarcação fica
  pendurada num cavilheiro em dois lances rotulados, «LARGURA» e «COMPRIMENTO». Cada metro de corda é
  uma faixa de cor alternada (o que se conta são faixas, não nós: sem erro de poste de cerca). As
  duas rodas do baú levam os mesmos rótulos. `test:locks` conta as faixas de cada lance na geometria
  assada e compara com `digits`. Pergunta: «Quantos metros tem cada lado da quadra de praia de hoje?»
- **Estojo `global-ball-casts`** · ritual `match` de muitos para um · **seis bolas, três moldes.** O
  estojo tem três moldes em negativo: sulco de cadarço; costuras de dezoito gomos; oito gomos com
  covinhas. O jogador leva a ficha de cada uma das seis bolas do fio ao molde em que ela cabe:
  Spalding e a de 1935 no primeiro; 1964, a branca e a tricolor no segundo; 2008 no terceiro. A
  descoberta é o conteúdo: «Três bolas, um molde só: de 1964 a 2008 a bola mudou de cor, não de
  forma.» Exige os seis nós catalogados; o prompt diz qual bola falta. Evidência: a ficha de cada
  bola declara o relevo. É exigido pelo termo de encerramento, não pelo da ala.
- **Documentos (4).** `doc-folder-global`, `doc-proof-global`, `doc-otavio-note-global`,
  `doc-brazil-two-arrivals` (ficha de dúvida, F81).
- **Figurinhas.** F74, F77. **Banco de escuta.** «Duas chegadas» (F81).
- **Jorge.** `porter-global-lit`: «Ala 6. Na ficha da obra tem uma quadra rebaixada no chão: vôlei
  sentado. Eu, sentado, só bloqueio sono. Câmbio.»
- **Vista.** A bola de oito gomos sob luz de lado: as covinhas só aparecem assim (a chave da torre é
  rasante de propósito).
- **Portões de fonte.** As duas rodas em dois grupos; a bola adotada; o console de desafio; o
  critério e as linhas do pódio; F93.

### 5.7 Mezanino — «a varanda do registrador» · L23

- **Premissa.** A segunda travessia, por mudança de ponto de vista: o jogador vê de cima o prédio
  que andou.
- **Como abre.** `E` na grade do elevador (canto noroeste do saguão): o curador chama a portaria.
  Com dois fios fechados, o Jorge solta a grade («O Otávio deixou escrito aqui: dois fios, grade do
  mezanino. Me diz os nomes… Tá. Soltei.»). Antes disso, a placa diz o que falta («Fios fechados:
  n de 2»).
- **Layout.** Galeria de cerca de 18 × 4 m, piso a ≈ 5,4 m, balaustrada colidível, vão aberto para o
  átrio (visível, não atravessável).
- **Só existe aqui.** `snow-case` (no lugar): placa «Vôlei de neve» — Joga-se de chuteira, com roupa
  térmica por baixo (F83, `asOf`); o distintivo `snow`. A **luneta** (no lugar): por ela os filetes
  do piso do saguão acendem na cor de cada fio fechado (emissivo por estado, dado). A **parede de
  créditos**: autor e licença de cada imagem, e o aviso de ficção (D32). A **escada de mão**
  (`step-ladder`): alcança os pontos altos das salas visitadas e a prateleira alta do escritório.
- **Documentos.** `doc-otavio-note-mezzanine`, `doc-snow-doubt` (ficha de dúvida: origem e regras
  têm uma fonte só), folha 05 do projeto (gaveta NEVE).
- **Figurinhas.** F82, F84. F85 no verso da vitrine; F86 e F87 só com segunda fonte.
- **Jorge.** `porter-mezzanine-lit`: «Mezanino. De lá você vê o plinto de cima. E tem vôlei de neve:
  de chuteira, curador. E eu aqui de sapato social. Câmbio.»
- **Vista.** O saguão inteiro e a instalação aérea à altura dos olhos, legível como trajetórias.
- **Orçamento.** Portal com altura e peitoril; tier de detalhe distante para o átrio visto de cima
  (grupo de fusão `far`: plinto, anel, recepção, sofás); par átrio + mezanino dentro de 100 draws.
- **Plano B.** Se o portão vertical reprovar, a neve e os créditos vão para um anexo térreo.

### 5.8 Caixa-forte do Fundador — a sala do silêncio · L12

- **Premissa.** A única sala sem rádio, sem tranca, sem código: uma mesa, um livro, uma carta.
- **Layout.** Uma `RoomData` (`vault`) com duas zonas. **Antecâmara** (≈ 4 × 5 × 2,8 m): piso
  molhado, a marca de água na parede na altura do segundo degrau, lâmpadas de serviço em gaiola, o
  poço da bomba gradeado, a plataforma e, numa parede, a porta da escada de serviço, com os degraus
  ainda molhados (é por onde o Otávio descia). **Caixa-forte** (≈ 5 × 6 × 3 m): porta redonda
  entreaberta, soleira alta, o lintel com «AQUI SE DIZ O QUE CADA COISA É».
- **O que há dentro.**
  - A mesa, com o **livro de tombo** aberto e uma plaqueta: «Leia até a última folha.» A primeira
    folha é a carta do Otávio.
  - As estantes da **reserva técnica**: poucas caixas com peças frágeis, muitas **caixas vazias,
    etiquetadas** (a primeira bola, a rede do primeiro ginásio, os estatutos de Paris) e os caixotes
    da ampliação; um deles pesado demais para mover sem o carrinho.
  - A **prateleira de quarentena**: «NÃO EXPOR — sem segunda fonte» (a lista de dezesseis
    fundadoras, os "cinco continentes", o "censo" de 1916, a antena datada, o número da camisa).
  - Cinco **pastas lacradas**, as guias de remessa das alas; o lacre de cada uma cai na sua vez (W-0).
- **Documentos.** `doc-accession-ledger` (duas partes num leitor só: a carta e a tabela **gerada das
  peças e de `ledgerExtras`**: número de tombo, peça, sala, categoria; peça ainda não conferida
  aparece com «(a conferir)»; as somas por categoria em palitos), `doc-sheet-06-absences`.
- **Jorge.** Ninguém. `radio.deadAir.vault`: «(Chiado. O rádio não pega aqui embaixo.)» Subir com o
  livro por ler mostra, na plataforma, «Subir (o livro de tombo ficou por ler)».
- **Vista.** A porta redonda entreaberta, com a luz da mesa saindo pela fresta.
- **Orçamento.** Casca `service` (concreto, sem lambri nem sanca) de até 4.000 triângulos; kit de
  até 8.000; materiais que já existem; água como plano de rugosidade baixa com `scroll` de UV, **sem
  `transmission`**; mídia zero; até 12 blocos de texto no atlas da sala.
- **Aquecimento.** A sala não tem portal: o elevador pede o aquecimento do destino quando a bomba
  termina, segura o escuro até `isRoomReady` e tem o mesmo tempo-limite das portas (M38).

### 5.9 Portaria — a porta da frente · L24

- **Premissa.** O jogo começa no fundo do prédio e termina na porta da frente.
- **Layout.** `lodge`: vestíbulo (≈ 4 × 3 m) e portaria (≈ 4 × 3 m), atrás da porta de enrolar. A
  porta da rua, de vidro, mostra o dia; não se sai: «A rua. O turno acabou; o museu abre às nove.»
- **O que há.** A garrafa de café (e um café servido, se o álbum estiver completo); a revista de
  palavras cruzadas preenchida (JORGE); o radinho de pilha; a manivela da porta de enrolar; o
  **painel do alarme** (um contato por vitrine, gaveta, cofre, porta e soquete; tudo verde); os
  recados do Otávio colados nele, um para cada coisa que o Jorge fez na noite; o bilhete do Jorge
  (Anexo B.13).
- **Orçamento.** Casca de até 3.000 triângulos; kit de até 6.000; nenhum material novo.

---

## 6. Sistemas a construir no motor

Regra do projeto (`AGENTS.md`, item 3): conteúdo é dado. Se uma sala ou uma peça pede um componente
React novo, generaliza-se o runtime. Regras herdadas da rodada do escritório, que todo sistema novo
respeita: **um modal por vez**; **um `E`, uma ação** (`isUnclaimedInteractKey`); **o alvo mais
próximo vence** (`interactionWinner`); **o pool de luzes é fixo** (8 spots, 2 points, 1 lanterna:
mudar a contagem recompila o prédio); **nunca `visible = false`** em algo que o aquecimento de GPU
precisa ver; **campo novo de `Progress` entra na tabela de campos**, senão é descartado no load.

### 6.1 O que o runtime sustenta hoje

Só o que já existe. Da progressão desenhada (trancas rituais, de distintivo e de ferramenta,
medalhas, fios, plinto, final) há apenas os tipos no schema. Achados que mudam o plano:

| # | Achado | Onde | Pacote |
|---|---|---|---|
| EN-A1 | tranca que não é de conhecimento vira modal invisível | `LockPanel.tsx:107`; `Containers.tsx:276-280` | M0, M6 |
| EN-A2 | `Portal.lockId` e `DocumentData.lockId` só existem no validador | `validate.ts:453, 495` | M0, M6 |
| EN-A3 | `validateSolvability` ignora mão única, rituais, medalhas de tranca, consumo | `validate.ts:418-459, 481-489, 553-555` | M10 |
| EN-A4 | tranca pode apontar para fato não certificado; `digits` não é conferido | `validate.ts:180-189, 262-263` | M0 |
| EN-A5 | teclado preso a quatro dígitos; dica presa à Ala 1 | `LockPanel.tsx:148, 152-155, 183` | M6 |
| EN-A6 | a planta lista toda tranca fechada | `MuseumMap.tsx:216-221` | M6 |
| EN-A7 | três códigos já colidem com texto publicado (`1896` em 5 chaves, `1998` em 2, `15` em 1) | `pt-BR.ts:290, 292, 335, 357, 359, 365, 374, 380` | M11 |
| EN-A9 | emissivos ignoram a energia | `glb.mjs:87`; `materialSpec.ts:54-56` | M17 |
| EN-A12 | a paleta do casco é código morto | `kit.mjs:86-112` | M1 |
| EN-A13 | mídia de parede fora de qualquer orçamento (54,7 MiB) | `bake.mjs:198` | M13, M14 |
| EN-A14 | nada é descarregado; `unloadBundle` não tem quem chame | `bundleCache.ts:26-28`; `roomLod.ts:26-40` | M13 |
| EN-A15 | todos os cascos numa única fronteira de Suspense | `MuseumScene.tsx:998-1021` | M13 |
| EN-A16 | sala vista por vão sem porta aparece vazia | `roomLod.ts:67-74` | M22 |
| EN-A18 | passos sempre "wood"; emissores de áudio sem leitor | `PlayerController.tsx:496`; `schema.ts:810` | M18 |
| EN-A19 | o prédio só tem um piso: casco, células, mapa e teste | `kit.mjs:170`; `portals.ts:86-87`; `test-navigation.ts:45` | M22, M38 |
| EN-A20 | versão nova de save descarta o progresso; campo novo em quatro lugares | `store.ts:57-85, 164-248` | M2 |
| EN-A21 | efeitos podem repetir | `Interaction.tsx:386-396` | M5 |
| EN-A22 | não há tela de ajustes | `store.ts:35-55`; `MuseumApp.tsx:103-115` | M27 |
| EN-A23 | nomes fixos e duplicações que quebram ao acrescentar sala (paletas de luz, porta só `double-panel`, âncoras de teste, tetos por nome de sala, registro do kit à mão) | vários (relatório do motor, A23) | M1, M3, M14, M15 |
| EN-A24 | fontes escritas à mão; SVG sem hash; 29–35 programas sem portão; dois idiomas no caminho do título | `museum.ts:74-113`; `media.authored.ts:55, 105` | M11, M14, M16 |

### 6.2 Os pacotes

Tamanho: **P** até ~150 linhas (runtime e teste) · **M** 150–500 · **G** 500–1.200 · **GG** maior, ou
muda bake, runtime e testes ao mesmo tempo. Regra conferida mecanicamente (`scripts/audit/packages`,
`npm run audit:packages`): **nenhum pacote entra num lote anterior ao de suas dependências**; onde a
dependência era só de uma parte, o pacote foi partido em fatias (a, b). Dois não foram partidos e
saem do script como `staged`: M14 e M35 são entregues ao longo de vários lotes e começam antes de M3
chegar; só a parte de L5 (o estimador) e a de L9 (o papel de toda colocação) dependem dele.

| Pacote | O que constrói | Depende | Validadores e testes | Tam. · risco | Lote |
|---|---|---|---|---|---|
| **M0** | validadores que faltam, sem tocar no runtime | — | `lock-without-host`, `lock-digits-mismatch`, `knowledge-lock-fact-not-code`, `document-lock-disagrees-with-container`, `lock-host-kind-unsupported`, `room-overlap`, `wall-item-over-opening`, `kit-part-unused`, `i18n-key-unused`; tabela `knownDebt` | P/M · baixo | L1 |
| **M1** | acabamentos e paletas lidos pelo bake e pelo runtime: `SHELL_PALETTES`, `shell.style: 'gallery' \| 'service'`, paleta de luz por `PaletteId` | M3 | `test:shell-finishes` (reprova o estado atual) | M · médio | L5 |
| **M2** | save: `SAVE_VERSION` fica em 1; `progress.contentLot` (inteiro que só cresce; ausente = produção de hoje); migradores por `contentLot`; tabela de campos (tipo, padrão, sanitizador); **campos desconhecidos são preservados**, não descartados; aliases de id; condições "save anterior a L*n*" viram flags postas pelo migrador (`legacy-pre-L10`, `legacy-pre-L9`), com fixture | — | `test:save`: ida e volta de todo campo; save do lote N lido pelo sanitizador do lote N−1 não perde termo; aba velha não rebaixa `contentLot` | M · médio | L2 |
| **M3** | registro de receitas no bake: cada arquivo de `parts/` exporta `{ id, build, materials, collider, budgetClass, role, layout?, anchors? }`; `KitPartId` gerado; cache por receita | — | registro ↔ `KitPartId` ↔ colisores numa fonte só | M · médio | L5 |
| **M4a** | `examineReach(peça, detalhe)` puro: diz se um detalhe é alcançável | — | usado por M10; reprova `net-1897`, `gym-suit`, `photo-gym` | P · baixo | L2 |
| **M4b** | examinar v2 (`examineRig.ts`): pivô no centro, `Hotspot.normal`, enquadramento, arrasto por câmera, **exame no lugar** com vistas (6.4) | M4a | `test:examine` (ramos "na mão" e "no lugar") | M · médio | L4 |
| **M5** | condições v2, gatilhos, efeitos executados até o ponto fixo. **O store não importa conteúdo:** um registro de regras (gatilhos, sanitizadores por id, termos) é injetado pelo chunk do canvas na fronteira `lazy()`; a passada "na carga" roda quando o conteúdo se registra | M2 | `test:triggers` (uma vez, independência de ordem, recarga no meio, limite do ponto fixo); `trigger-never-fires`, `flag-never-set`, `flag-never-read`; catraca de bundle do título | M · médio | L2; soquetes em L11; fios em L17 |
| **M6a** | `lockRules.ts`: `lockStatus`, `attemptLock` como único caminho; `progress.locksSeen` | M5 | `test:locks` v1 | M · médio | L2 |
| **M6b** | hospedeiros (container com tranca de ferramenta, gaveta), teclado de N dígitos, escada de dicas com estado salvo (`progress.hintRungs`), «Ver a ficha de conferência» | M6a | `test:locks`: cada degrau acrescenta texto; reabrir não zera; o último só a pedido | M · médio | L3 (hospedeiro), L4 (escada) |
| **M6c** | painéis `wheel`, `punch`, `match` (inclusive muitos para um), `order`; porta e dispositivo como hospedeiros; `evidence` em toda tranca contada e todo ritual | M6b | `ritual-solution-invalid`, `ritual-evidence-behind-lock`, `ritual-items-indistinguishable`, `lock-question-ambiguous` (lista do ano-armadilha por pergunta), `lock-evidence-behind-lock` | G · médio | L17 |
| **M7a** | credencial como dado (`titleKey`, ícone) e toast genérico | M5 | `credential-orphan`, `credential-unobtainable` | P · baixo | L3 |
| **M7b** | objetos pegáveis (`RoomData.pickups`), aba Coleção | M7a | `pickup-part-not-baked`, `tool-consumed-twice` | M · baixo | L11 |
| **M8** | fios: `ThreadData { nodes: [{ kind: 'exhibit' \| 'document', id }], completeFromLot }`; fechamento por gatilho gravado em `progress.threadsClosed`; antes do lote completo o Acervo mostra «n de m — falta ala em montagem» | M5 | `thread-single-room`, `thread-node-missing`, `thread-closes-before-complete`; `validateAdditive` trata nó novo em fio incompleto como aditivo | P/M · baixo | L17; fecham em L22 |
| **M9** | rádio por etapa: chamadas de marco com `when`, `lapsesWhen` e `mentions`; respostas condicionais (`RadioReply.when`); aparelho de voz genérico (`call`, `play-once`); dica em três alturas com `targetId` | M5 | `test:radio`; `radio-hint-coverage`, `hint-points-to-nothing`, `speech-mentions-missing`; chave de fala ≤ 130 caracteres | M · baixo | L3; arestas em L10; retomada em L15 |
| **M10** | `simulateProgress(content)` com as funções puras do runtime; robô de partida | M5, M6a, M4a | `test:playthrough`; `test:speech-coherence` | G · médio | L2, cresce a cada lote |
| **M11** | fatos: banco como dado (`facts.bank.ts`), captura (`facts.generated.ts`, só o script escreve) e captura manual conferida (`facts.manual.ts`: URL, data, trecho citado, hash); lint de numerais em duas regras (6.4); `claims` em toda chave de texto de acervo | — | `numeral-exclusivity`, `counted-pattern`, `text-ages`, `fact-code-uncaptured`, `fact-code-value-not-in-source`, `fact-publishers-dependent`, `wall-claim-single-publisher`, `label-without-claim`, `claim-fact-unknown`, `present-tense-fact-without-asof`, `living-person-single-source`, `provenance-claims-original-without-source`. Entregues em P0: `fact-code-uncaptured` (que já cobre `fact-code-value-not-in-source`, porque página sem o valor não é captura, e `fact-publishers-dependent`, porque o grupo sai do host e de `copies`), mais `fact-source-uncaptured`, `fact-source-drift` e `fact-capture-malformed` | M · baixo | P0 (captura e `fact-code-uncaptured`), L2 (lint), L8 (`claims`) |
| **M12** | kit por sala e resolvedor "receita → bundle": receita de uma sala vai para `kit-<sala>`; de duas ou mais, para `kit-core` | M3 | GLB por sala ≤ 1,5 MB | G · alto | L6 |
| **M13a** | fronteira de Suspense por sala | M12 | `test:room-lod` | M · médio | L6 |
| **M13b** | residência de detalhe (no máximo três salas), texturas por sala, descarte verificado | M13a | textura por trio; `renderer.info.memory` volta à linha de base depois de ida e volta (manual, registrado) | G · alto | L17 |
| **M14** | orçamentos como dado e **estimador**: draws e triângulos por sala e por par de porta, contando kit, dispositivos, containers, pickups, texto, arte e portas; assinaturas de programa; textura por trio | M3 | substitui os tetos por nome de `test-kit-runtime.ts:267-302` | M · baixo | catracas em L1; estimador em L5 |
| **M15** | navegação v2: alcance por inundação (grade de 0,25 m, cápsula real) de todo interativo; rotas do spawn real; travessias derivadas de todo par de portais | — | todo interativo tem um ponto de pé ligado à entrada, dentro do alcance e fora do volume do próprio alvo | M/G · médio | L2 (três salas), L17 (derivado) |
| **M16** | bundle: catraca por caminho; dicionário em duas camadas e um idioma por vez | — | 250 / 600 KB gzip | P/M · baixo | L1 (catraca), L17 |
| **M17** | estágios de luz; **vista de materiais por sala** para a biblioteca inteira (clone por sala, mesmo programa), com emissão e `envMapIntensity` por estágio; sem `ambientLight` global; pool 6 + 2; zonas de luz | M1, M5, M21 | `test:power`: slots constantes; termo de ambiente na conta do forro; nenhuma malha de duas salas com estágios diferentes compartilha material; captura obrigatória "sala acesa olhando sala escura pela porta" | G · médio | L10; `house` em L11; zonas em L17 |
| **M18** | áudio: essenciais sintetizados; leitor de emissores; superfície de passo por zona | — | emissores e superfícies resolvidos por sala | M · baixo | L10 (essenciais), L16, L17 (areia) |
| **M19** | conteúdo condicional (`availableWhen`); gavetas por nó (`ContainerData.drawers`) | M5, M10, M21 | `badge-opens-nothing-elsewhere`, `available-condition-unsatisfiable` | M · médio | L15 |
| **M20** | listas datadas e painel de tabela; `asOf` em fato vigente | M11 | `dated-list-stale`, `dated-list-row-without-source` | P/M · baixo | L17 (motor), L22 (conteúdo) |
| **M21** | fusão estática por material, **direto no bake**, junto com o kit por sala: dequantiza para Float32 antes da matriz; receitas dinâmicas (com nós `__*`) ficam soltas; colisores gravados em espaço de sala no manifesto; **proxies de mira por colocação**; grupos separados para `far` e para colocações condicionais | M12, M14 | bounds fundidos × manifesto; `test:kit`, `test:desk-top`, `test:bookshelf` continuam lendo o manifesto por receita | G · alto | L6 |
| **M22** | vertical sem escada: portal com altura e peitoril, `passable: false`, `RoomData.level`, tier distante, planta por piso | M13b, M15, M38 | rotas com cota; a balaustrada segura a cápsula | G · alto | L23 |
| **M23** | plinto de soquetes: dispositivo `socket-host`; `progress.socketsFilled` | M6a, M7b, M17 | `test:plinth`: ordem, parcial, recarga com duas assentadas | M · médio | L11 |
| **M24a** | `ExhibitData.provenance` (obrigatório, enum de seis; `facsimileOf` só com captura) | M11 | `exhibit-without-provenance` | P · baixo | L8 |
| **M24b** | livro de tombo gerado das peças e de `ledgerExtras`; números de tombo estáveis por peça | M24a, M5 | lint ficha × campo; a soma do livro bate com o conteúdo | P/M · baixo | L12 |
| **M25** | pós-jogo: estado depois do final, corte de sessão, livro de visitas como resumo | M5, M24b, M31, M42 | `test:ending` | M · médio | L12, L13 |
| **M26** | água sem shader próprio: plano com `scroll`, parede molhada sobre os mapas do reboco | M1 | nenhuma chave com `transmission`; o plano de água não segura a cápsula | M · médio | L9 (escada), L11 (poço), L12 |
| **M27** | tela de ajustes, foco preso nos painéis, contraste | — | regras em `hudRules`; lint de contraste | M · baixo | L16 |
| **M28** | tiers de qualidade; no tier baixo a sala vizinha entra sem as peças | M13b | `test:render-performance` com os perfis | M · médio | L17 (vizinha), L24 |
| **M29** | modo leitura gerado do conteúdo, com o aviso de ficção | M16 | toda chave de conteúdo aparece | P/M · baixo | L24 |
| **M30** | KTX2 (materiais e mídia), obrigatório; transcoder preguiçoso depois do clique | M14 | textura por trio ≤ 45 MiB | M/G · médio | L7 |
| **M31** | termos e mesa de assinatura: `MuseumContent.terms`; dispositivo `signing-desk`; `progress.termsSigned`; um termo por gesto, o mais antigo primeiro | M5, M41, M42 | `test:ending`: idempotente; recarga antes e depois; dois e três termos pendentes; `term-unsignable` | P/M · baixo | L3 |
| **M32** | lista do caderno como dado: autor, `appearsWhen` (estado, nunca "chamada ouvida"), `doneWhen` com ids congelados, contador, `deferredUntilLot` | M5 | `checklist-item-untickable`, `checklist-condition-changed` | P · baixo | L3 |
| **M33** | relógio da noite por contagem de marcos (2.2); `flag:clock-set`; ficha `{hora}` nas falas | M5 | monótono nas 500 ordens; nenhuma hora em algarismo fora da classe `clock` | P · baixo | L3; céu da claraboia em L12 |
| **M34** | lacre de conferência: tranca `set: { exhibitIds }` com silhuetas | M6b | `test:locks`; `set-lock-exhibit-uncataloguable` | P · baixo | L11 |
| **M35** | promessa datada (`deferred` com `noticeKey`), "e isso aqui?" (`askAbout`) e papel de toda colocação | M9, M3 | `deferred-on-critical-path`, `deferred-without-notice`, `placement-without-role` | P/M · baixo | L3 (`deferred`), L8 (`askAbout`), L9 (zero avisos) |
| **M36a** | placas de peça (`ExhibitData.labelPlate`) num atlas R8 por sala e idioma; a prontidão entra no aquecimento de GPU | M21 | `test:signage`; `test:gpu-warmup` | M · médio | L8 |
| **M36b** | linha de proveniência em toda placa depois da Reabertura | M36a, M24a | `test:signage` | P · baixo | L12 |
| **M37** | colecionáveis: figurinhas, bancos de escuta, pontos altos | M7b, M9 | álbum conferido contra o banco de fatos | M · baixo | L15; pontos altos em L23 |
| **M38** | plataforma e elevador: dispositivo `lift`; `relocatePlayer` **com o contrato da porta** (aquece o destino, segura o escuro até `isRoomReady`, tempo-limite, troca de slots de luz no escuro); `RoomData.radioDeadZone`; aba de piso na planta | M15, M13a | `entry-outside-room`; `room-without-warm-path`; casos de sala sem portal em `test:gpu-warmup` e `test:room-lod` | M · médio | L12, L23 |
| **M39** | `validateAdditive`, instantâneo do grafo, corpus de saves | M10 | `node-removed`, `guard-strengthened`, `grant-removed`, `id-renamed-without-alias`, `term-condition-changed` | M · baixo | L2 |
| **M40a** | `layout` exportado pela vitrine corrida; peça × `layout` | — | `test:kit` | P · baixo | L1 |
| **M40b** | `test:room-placement` e portões de bake (4.10) | M3 | seção 4.10 | M · baixo | L5 |
| **M41** | gesto "segurar": intenção em `primaryAction` (início, anel de progresso, cancelamento ao perder o alvo), mesmo caminho para teclado e toque; toque curto abre confirmação | — | `test:mobile-controls`; `test:opening-flow` (um `E`, uma ação continua valendo) | P/M · médio | L3 |
| **M42** | sequência dirigida do HUD: cartões de termo, fechos, epílogo, cortes de tempo. Corta o que estiver no ar; não depende de rádio; só conta como vista ao terminar | M9 | `test:ending`: rádio na mesa; chamada no ar; recarga no meio repete | P/M · baixo | L3 |
| **M43** | dispositivos de estado: `stepper` (posições discretas, cada uma ligada a uma vista) e `sequence-player` (modos `replay` e `judge`), com a sequência como dado | M4b | redutores puros | M · baixo | L17 |
| **M44** | harness: `?qaSave=<fixture>`; manifesto de capturas; scripts de auditoria promovidos (`audit:geo`, `audit:tex`, `audit:media`, `audit:lights`, `audit:walk`) | — | o manifesto é lido pelo `check` | P/M · baixo | P0 |
| **M45** | duas malhas por peça (vitrine e mão); portas fechadas instanciadas, só a porta em uso clonada; folha de porta em 900 triângulos | M12 | estimador de triângulos | M · médio | L6 (portas), L7 (peças) |
| **M46** | oclusão de contato por vértice nas malhas fundidas (uma variante de programa, medida) | M21 | contagem de programas igual depois de reload limpo | M · médio | L13 |

### 6.3 Delta de schema (resumo)

```ts
// EraId: + 'mezzanine' | 'lodge'.  MedallionId: 'curator' | 'founding' | 'lineage'.
// ToolId: sai 'breaker-handle'.

type ProgressCondition = { /* os atuais */
  catalogued?: readonly string[]; hotspotsSeen?: readonly string[]
  credentials?: readonly Credential[]; flags?: readonly string[]
  roomsVisited?: readonly EraId[]; socketsFilled?: readonly MedallionId[]
  threadsClosed?: readonly ThreadId[]; threadsClosedAtLeast?: number
  anyOf?: readonly ProgressCondition[]
  // negativas (unpowered, locksClosed, documentsUnread, flagsUnset): só em apresentação (R2)
}
type UnlockEffect = /* os quatro atuais */
  | { kind: 'set-flag'; flag: string } | { kind: 'consume-credential'; credential: Credential }
type Trigger = { id: string; when: ProgressCondition; effects: readonly UnlockEffect[] }
type Term = { id: string; titleKey: string; bodyKey: string; when: ProgressCondition; grants: string /* flag */ }
type RitualPuzzle =
  | { kind: 'order'; items: readonly RitualItem[]; solution: readonly string[] }
  | { kind: 'match'; left: readonly RitualItem[]; right: readonly RitualItem[];
      pairs: readonly (readonly [string, string])[] }
// Lock 'knowledge': + input: 'keypad' | 'wheel' | 'punch'; + hintKeys?
// Lock 'ritual':    puzzle: RitualPuzzle; evidence: { exhibitIds, documentIds }
// Lock 'set' (novo): exhibitIds — o lacre de conferência
// Todo Lock:        + onOpen?: readonly UnlockEffect[]
type CredentialData = { kind; id; titleKey; descriptionKey; icon }
type PickupData = { id; part; position; rotationY?; grants: Credential | { flag: string }; availableWhen? }
type ThreadData = { id: ThreadId; titleKey; summaryKey; nodes: readonly string[] }
type DatedList = { id; asOf: string; titleKey; columns; rows; sources: readonly FactSource[] }
type LightingStage = { id; when: ProgressCondition; keyScale; washScale; emissiveScale;
                       environmentScale; washTarget? }
type ChecklistItem = { id; author: 'helena' | 'curator'; textKey; appearsWhen?; doneWhen;
                       counter?: readonly string[] }
// ExhibitData:  + provenance (obrigatório); + examine; + labelPlate; + collider; + availableWhen;
//               + scaleNoteKey; Hotspot: + normal; + requiresTool?
// ContainerData: + drawers?: [{ id, lockId, titleKey, node }]; + availableWhen
// DeviceData:   + 'socket-host' | 'signing-desk' | 'lift' | 'sequence-player' | voz ('call' | 'play-once')
// Portal:       lockId lido pelo runtime; position[1] honrado; + sill?; + passable?
// RoomData:     + level; + entry; + shell.style; + lightingStages; + lightZones; + pickups;
//               + radioDeadZone; + deferred
// Fact:         + printedIn: readonly string[]; + exception?: 'tutorial' | 'geometry' | 'counted'
// MuseumContent: + triggers, terms, credentials, threads, datedLists, stickers, nightClock, checklist
// Progress:     + flags, triggersFired, termsSigned, locksSeen, hintRungs, doorsReleased,
//               socketsFilled, stickers
```

**Acréscimos da revisão ao delta de schema** (valem sobre o bloco acima onde divergem):

```ts
// Progress:      + contentLot: number; + threadsClosed: ThreadId[]; + sequencesSeen: string[]
//                campos desconhecidos são preservados na carga e na gravação.
type Provenance = 'original' | 'period' | 'typological' | 'reproduction' | 'handling' | 'scenography'
// ExhibitData:   provenance: Provenance; facsimileOf?: FactSourceId (só com captura);
//                heldBy?: string (instituição que guarda o original de uma reprodução);
//                tombo: number (fixo por peça; o nº 1 é reservado); displayMesh / handMesh
//                examine: { mode: 'held' } | { mode: 'in-place'; views: readonly ExamineView[] }
type ExamineView = { id: string; eye: Vec3; target: Vec3; reveals?: string /* hotspot id */ }
// MuseumContent: + ledgerExtras: [{ tombo, titleKey, provenance, roomId }]  (ex.: a bola do Fundador)
// ThreadData:    nodes: readonly { kind: 'exhibit' | 'document'; id: string }[]; completeFromLot: number
// RadioCall:     + lapsesWhen?: ProgressCondition; + mentions: readonly string[]; + directed?: boolean
// Toda chave de texto de acervo (placa, etiqueta, verso, ficha, documento, banco, figurinha):
//   claims: readonly FactId[]; surface: 'wall' | 'verso' | 'record' | 'document' | 'bench' | 'sticker'
// Fact:          + publishers (grupos de dependência); + asOf?: string; + livingPerson?: boolean
//                + forbiddenPatterns?: readonly string[] (códigos contados e de geometria)
//                + exception?: 'tutorial' | 'geometry' | 'counted' | 'clock'
// Lock contada ou ritual: evidence: { exhibitIds; documentIds }
// RitualPuzzle 'match': pairs pode repetir o lado direito (muitos para um);
//                cada item tem distinguishingFeature
// ChecklistItem: + deferredUntilLot?: number
// Colocação de kit: role: 'interaction' | 'text' | 'askAbout' | 'scenery'
// DeviceData:    + 'stepper' | 'sequence-player' ({ mode: 'replay' | 'judge' })
// Trigger de fio: grava threadsClosed; nunca é derivado na leitura.
```

### 6.4 Os portões que provam "100% jogável"

**`simulateProgress(content, from?)`** substitui `validateSolvability`. Jogadora exaustiva que usa as
mesmas funções puras do runtime (`lockRules`, `progressCondition`, `dueTriggers`,
`transitionDoorBlock`, `examineReach`) até o ponto fixo. Modela mão única e `doorsReleased`;
`requiresPower`; tranca em qualquer hospedeiro; credencial nascida de tranca, gatilho, detalhe e
pickup; consumo; soquetes; flags; termos; fios com `completeFromLot`; a plataforma e o elevador.
Tranca contada e ritual abrem quando a evidência declarada está alcançável. Catalogação só conta se
`examineReach` diz que todo detalhe obrigatório é alcançável. Imprime o roteiro em níveis (2.4).

| Erro (reprova o `check`) | O que pega |
|---|---|
| `ending-unreachable`, `term-unsignable` | algum termo fora do ponto fixo |
| `room-unreachable`, `lock-unopenable`, `document-unreadable`, `exhibit-uncataloguable` | conteúdo morto |
| `credential-unobtainable`, `credential-orphan` | chave sem fonte ou sem fechadura |
| `trigger-never-fires`, `flag-never-set`, `flag-never-read` | fiação solta |
| `gate-uses-negative-condition`, `gate-uses-all-condition` | R2 |
| `consumable-multi-consumer` | V3 |
| `no-return-path`, `one-way-trap`, `room-without-warm-path` | V5; sala sem porta nem contrato de aquecimento |
| `lock-evidence-behind-lock`, `ritual-items-indistinguishable`, `lock-question-ambiguous` | a fonte de um código atrás da própria tranca; itens que a evidência não distingue; pergunta com duas respostas verdadeiras |
| `checklist-item-untickable` | item de lista sem `doneWhen`, com condição fora do ponto fixo, ou que aponta para promessa datada sem `deferredUntilLot` |
| `hint-points-to-nothing`, `radio-hint-coverage`, `speech-mentions-missing` | dica ou fala que cita objeto, sala ou documento ausente do build do lote; estado de fronteira sem dica |
| `deferred-on-critical-path`, `deferred-without-notice` | R4; em `--final`, qualquer `deferred` |
| `placement-without-role` | **toda** colocação de kit sem interação, texto a ≤ 1,5 m, `askAbout` ou `scenery` justificado |
| `thread-closes-before-complete` | fio que fecharia antes do lote em que está completo |
| `post-ending-disables-action` | R5 |

**Dívida datada.** Um erro conhecido que um lote ainda não fecha entra em `knownDebt: [{ code, id,
untilLot }]`, impresso em toda execução. Passou do lote, reprova. A tabela completa, por lote, está
no Anexo C: os portões novos de L1 e L2 reprovam conteúdo que só fecha mais tarde, e cada caso está
lá por extenso.

**`validateAdditive`.** `npm run graph:snapshot` grava `docs/releases/L<n>.graph.json` (ações,
guardas, concessões, termos, itens de lista). O `check` compara o conteúdo com o instantâneo do
último lote publicado. O primeiro instantâneo é o de L2.

**`test:playthrough`**, no nível do store, em Node: (1) a rota canônica termina com cada flag de
termo do lote; (2) 500 sementes de ordem embaralhada, inclusive ações inúteis, com salvar, migrar e
recarregar em passos sorteados; (3) o jogador preguiçoso (só o caminho crítico) e o que **pula
tudo** (nunca lê o caderno, nunca pega o rádio, nunca acende a lanterna): este tem de ouvir os fechos
de termo e o epílogo (sequência dirigida); (4) cada save do corpus é migrado e jogado até o ponto
fixo: nenhum termo assinado se perde, nenhum item riscado desrisca.

**`test:speech-coherence`**, sobre as mesmas 500 ordens: nenhuma fala tocada manda fazer o que já
foi feito (`lapsesWhen`); a hora da noite nunca diminui; nenhuma fala afirma um estado que o
`progress` desmente (luz geral, poço, caixa-forte visitada); nenhuma fala presa a apagão ou chuva
toca fora deles.

**Exame no lugar** (a regra que faltava; vale para rede, traje, mesa, quadras, console, luneta):

- A peça declara `views[]`. A **primeira vista nunca revela** o detalhe obrigatório.
- Troca de vista: arrasto horizontal além de 80 px, ou os botões ‹ ›, ou as teclas ← → e Tab. É o
  mesmo código para teclado, mouse e toque.
- O detalhe marca ao **permanecer 800 ms** numa vista que o revela, depois de ao menos uma troca; o
  retorno é o de H-07 (tique, texto por 1,5 s).
- A câmera de cada vista é validada: ponto de olho alcançável pela inundação (ou declarado como
  ponto de vista fixo, fora de colisor), nenhum colisor entre olho e alvo.
- `test:examine`, ramo "no lugar": todo detalhe obrigatório está numa vista que não é a inicial e a
  no máximo duas trocas dela; toda vista enquadra o alvo em 16:9 e em 844 × 390.
- O critério de aceite das peças passa a ser: "só cataloga depois de girar **ou de trocar de vista**".

**Navegação v2.** Alcance por inundação de todo interativo. Rota do spawn real. Caminho de volta de
toda sala. O plinto conferido nos dois estados (tampa fechada; plataforma). Sala sem portal é
alcançada pelo elevador e tem contrato de aquecimento.

**Lint de numerais: duas regras, não uma.**

1. **Código digitado de quatro dígitos** (`1896`, `1962`, `1973`): exclusividade por token, nos dois
   dicionários, no texto das mídias, nas listas datadas e nos numerais que mídia e geometria
   **declaram como dado** (uma página composta ou um número de camisa não são lidos de imagem).
2. **Código contado ou de geometria** (o catorze; o 8 e o 16 do baú; o número da camisa): proíbe o
   numeral **junto do seu significado**, não o token. Cada fato declara `forbiddenPatterns` (por
   exemplo: «catorze» ou «14» perto de federações, fundadoras, delegações, nações, cadeiras; «8 ×
   16», «oito por dezesseis», «8 m» ou «16 m» perto de quadra, areia ou praia), mais a lista de
   chaves da sala da tranca. «Oito gomos» e «16h47» não colidem.
3. Horas formam a classe `clock` (um token só: «16h47», «8h55», «9h»).
4. O último degrau da escada e «Minhas anotações» mostram o **texto-fonte** (a mesma chave
   autorizada) ou um desenho de contagem em palitos, gerados em runtime: não criam chave nova com o
   numeral, e o lint não tem o que ver.
5. `text-ages` reprova contagem corrente, tempo relativo e superlativo («há N anos», «até hoje»,
   «N títulos», «maior», «melhor», «único», «recorde», «hoje») em texto de acervo; e a classe
   "estado da noite" marca fala de apagão ou de chuva sem `when`.

**Captura de fontes.** `npm run facts:capture` (fora do `check`, precisa de rede) grava
`facts.generated.ts` com status, hash, título real, data e se a página contém o valor (em qualquer
das `valueForms`: algarismo, por extenso em cada idioma, ou a lista de nomes, para os contados).
Site que bloqueia robô entra em `facts.manual.ts`, conferido por uma pessoa. O `check` lê os dois
arquivos commitados e aceita qualquer um por grupo de publicadores. As quatro capturas de código
(`1896`, catorze, `1962`, `1973`) são feitas em P0, não no lote da ala.

**Como ficou (P0, 2026-10-04).** O fato declara no banco como é achado numa página: o algarismo
como token inteiro **com uma das palavras da afirmação por perto** (`near`; a página que o jogo
citava para 1897 continha o ano num menu e nada sobre o manual), ou a lista de nomes, todos juntos
num trecho (`names`). Ainda não há forma "por extenso em cada idioma": nenhuma das quatro capturas
precisou; entra no lote que precisar. O grupo de publicadores não é digitado por fonte: sai do
host, por um registro (`PUBLISHERS` em `src/content/factCapture.ts`), e a página que repete o texto
de outro publicador declara `copies` e conta com ele (a página do Morgan no IVHF repete a da FIVB).
A Wikipédia é lida pela API como uma revisão renderizada e fica registrada pelo link permanente
dessa revisão. Rodar de novo sem que a página tenha mudado não altera um byte, nem a data. O que o
jogo cita em `FACTS` (título, publicador, data) é conferido contra a captura; o registro, com
trechos e hashes, não entra no bundle.

**O que é portão automático e o que é conferência manual.** Automático: tudo o que está acima, mais
o estimador de orçamento (M14). Manual, com responsável e roteiro no plano do lote: draws e
programas medidos em frame; memória; aparelho real; "lê couro", "lê roupa" e o aceite visual; o
playtest. Nenhum critério de aceite de lote mistura as duas colunas.

### 6.5 Testes que hoje travam o comportamento antigo (mudam junto, com aviso no HANDOFF)

| Teste | Trava | Muda em |
|---|---|---|
| `scripts/test-opening.ts:198` | o item do cofre sem `doneWhen` | L3 |
| `scripts/test-opening-flow.ts:971-1003` | `1896` na plaqueta; a versão contestada da renomeação | L1 (texto), L4 (verso) |
| `scripts/test-navigation.ts:428` | `reciprocalPairs.size === 3` | L18 (a primeira ala; o cofre não tem portal e não acrescenta par) |
| `scripts/test-navigation.ts:274-278, 710-735` | âncoras e rotas do spawn antigo | L1 |
| `scripts/test-kit-runtime.ts:267-302` | tetos por nome de sala (56 e 53 lotes) | L6 |
| `scripts/test-opening.ts:363` | a lanterna nunca alcança o teto do átrio | **fica** (protege a luz geral) |

### 6.6 O que cortar primeiro, se faltar fôlego

1. A vista real do mezanino (M22) → anexo térreo.
2. Zonas de luz: a Ala 4 como duas salas com um vão largo.
3. A oclusão de contato por vértice (M46), se a variante de programa custar caro no aparelho.
4. O ritual da Kaizuka, o cadeado e o número da camisa, a antena datada e o ritual de três pares da
   Ala 5: já estão fora da versão padrão; só entram com fonte.
5. O console de desafio como minijogo (fica como leitura, e a peça cataloga por vista).

Não cortar: M0, M2, M4, M5, M10, M12, M13, M14, M21, M30, M39, M41, M42. Sem eles, "100% jogável" não
tem prova, a conta de memória não fecha ou o final não chega a quem joga no celular.

---

## 7. Informações ao jogador

### 7.1 Como a informação chega sem parede de texto

| Canal | Onde vive | Limite | Quando aparece | Para quê |
|---|---|---|---|---|
| Placa física | `RoomText` ao lado da peça | título de até 5 palavras e uma frase de até 18 | sempre, a até 5 m | a manchete; é o que o Jorge manda ler |
| Etiqueta | painel de exame | até 40 palavras | ao pegar a peça | o contexto |
| Detalhe do verso | painel e destaque de 1,5 s | até 12 palavras | ao virar | o que só o verso conta |
| Ficha de catálogo | caderno, aba Acervo | até 45 palavras, proveniência e fontes | ao catalogar | profundidade opcional |
| Documento de gaveta | leitor, um por vez | até 70 palavras por página, até 2 páginas | ao abrir | a história por trás |
| Banco de escuta | sentar (`E`) num banco com grade de alto-falante | 3 legendas, até 45 palavras no total | opcional | **leitura do museu**: abre dizendo «Texto do museu; fontes na ficha». Nunca "história oral" |
| Jorge, chamada de marco | rádio (nos fechos de termo, o alto-falante da sala) | falas curtas: cada chave com até 130 caracteres | uma por marco; caduca se o marco já passou | reação e próximo passo |
| Jorge, "e isso aqui?" | `R` mirando um objeto | 1 fala | quando o jogador pergunta | resposta do mundo |
| Jorge, "o Otávio dizia" | `R` sem pendência | 1 fala, uma por visita à sala | quando o jogador liga | ele cita o Otávio ou lê a ficha de entrega da obra; não é guia de áudio (D36) |
| Figurinha | álbum, aba Coleção | até 25 palavras, com a marca ● (uma fonte) ou ●● (duas) | ao achar | curiosidade colecionável |
| Anotação | caderno, gerada | pergunta, valor, onde foi lido | ao aprender um fato | liga ler a abrir |
| Glossário do curador | caderno, uma linha | até 20 palavras | na primeira vez que o termo aparece | vocabulário de museu |

**Regras de redação.**

1. **A manchete é o fato surpreendente**, não a data: «Logo acima da cabeça» antes de «6 pés e 6».
2. **Uma ideia por superfície.** O resto desce para o verso, a ficha ou a gaveta.
3. **Parede só recebe fato com dois publicadores independentes** (30 dos 87 do banco). Fato de uma
   fonte vai para detalhe, gaveta, rádio ou figurinha.
4. **Divergência entre fontes é conteúdo:** a etiqueta mostra as duas datas (líbero, chegada ao
   Brasil, três toques). O jogador aprende o fato e aprende a desconfiar. Cada ala tem pelo menos uma
   **ficha de dúvida**.
5. **Toda peça declara o que é**, numa de seis categorias fechadas (7.8): original, peça de época,
   reconstrução tipológica, reprodução, réplica de manuseio ou cenografia. «Fac-símile» só com scan capturado.
6. **Nada que envelhece:** sem contagem corrente («N títulos»), sem tempo relativo («há N anos»).
7. **Legendas de mídia em pt-BR e em inglês** (hoje há legenda em inglês na interface em português).
8. **Brasil como presença constante, sem ufanismo** (7.6).
9. **O jogo ensina também o vocabulário de museu:** tombo, reserva técnica, fac-símile, réplica de
   manuseio, reconstrução tipológica, proveniência, e por que as galerias são escuras (couro e papel
   pedem pouca luz).

10. **Nomes.** País pelo nome da época do fato (União Soviética, Tchecoslováquia, Iugoslávia,
    Alemanha Oriental), na forma brasileira; hoje, «Países Baixos» e «Turquia» em pt-BR,
    «Netherlands» e «Türkiye» em inglês, numa tabela `countryNames` que as listas datadas usam. Um
    nome por objeto: **púlpito** é a mesa de assinatura; **atril** é só o de entrada das salas;
    **cofre de ferro** e **caixa-forte** nunca se trocam.
11. **Pessoa viva:** fato sobre pessoa viva exige dois publicadores em qualquer canal, e um deles tem
    de ser entrevista ou biografia oficial (`living-person-single-source`).
12. **Regra vigente tem data.** Todo fato de regra em vigor, de objeto "atual" ou de tradição em
    curso leva `asOf` e é escrito com a data («desde 2000…», «em 2026, a rede do vôlei sentado fica
    a…») ou no passado datado. A revisão anual dessas chaves está no HANDOFF final.
13. **Toda afirmação aponta para um fato.** Cada chave de texto de acervo declara `claims` e a
    superfície. O validador reprova: parede com fato de um publicador, etiqueta sem `claims` (salvo
    descrição do objeto), fato inexistente. Placa que só descreve o objeto exposto declara
    `claims: []` e `surface: 'wall'` com a marca `object-description`.
14. **Texto do museu não é depoimento.** O banco de escuta lê texto do museu e o declara.
15. **O Brasil:** no máximo uma placa de parede por ala e até 20% das curiosidades da sala (7.6).

### 7.2 Os sete códigos de agosto: estado, fontes e o que entra no lugar

Fontes abertas em 2026-10-03. "Publicador independente": duas páginas da mesma federação contam como
um; um site que copia outro não conta.

| Código | O fato | Veredito | Fontes abertas | O que o plano faz |
|---|---|---|---|---|
| `1896` | Mintonette vira Volley Ball | **seguro** quanto ao ano; a ocasião (visita ou demonstração; início do ano ou 7 de julho) é contestada | FIVB `https://www.fivb.com/volleyball/the-game/history/`; IVHF `https://www.volleyhall.org/history-of-volleyball.html` e `https://www.volleyhall.org/william-morgan-father-of-volleyball.html`; Wikipédia "Volleyball" | fica como código (teclado). Trocar a fonte morta de `museum.ts:61` (a URL antiga devolve 404). A placa diz só «em 1896, em Springfield». Duas chaves autorizadas. Capturada na preparação (FIVB e IVHF); `fact-code-uncaptured` no `check` desde L1 |
| `14` | federações fundadoras da federação internacional | **seguro**; uma lista dissidente de dezesseis na Wikipédia polonesa | IVHF `https://www.volleyhall.org/paul-libaud.html`; Wikipédias EN, IT, PT e FR da FIVB | fica, **contado** (roda de presença). Ficha de dúvida sobre a lista de dezesseis. Tirar «com 14 nações» do texto de Tóquio |
| `1962` | o Japão vence o Mundial feminino na União Soviética | **seguro** | Wikipédia EN "1962 FIVB Women's Volleyball World Championship" e RU; IVHF `https://www.volleyhall.org/hirofumi-daimatsu.html` | fica (punção de data). Reabrir `olympics.com` para «em Moscou» antes de carimbar |
| `15` | a camisa de Karch Kiraly na seleção | **inseguro hoje**: um publicador (infobox da Wikipédia, sem nota); o único eco tem um erro ao lado | Wikipédia EN "Karch_Kiraly"; IVHF e museu olímpico americano não dão o número | só entra no jogo, **no modelo e na tranca**, com fonte primária (fotografia datada ou súmula oficial). Sem ela, a camisa é exposta de frente, sem número, a ficha diz «número em pesquisa» e o armário abre por lacre de conferência. E «de 21 para 15 pontos» vira «de vinte e um para quinze» |
| `1973` | Hubert Wagner assume a Polônia | **seguro**; contestado fora do museu (a página do IVHF leva a 1974 por aritmética) | PAP `https://dzieje.pl/node/25274`; Wikipédia PL (maio de 1973, citando a biografia); Wikipédia EN | fica (teclado). A divergência real é o Hall da Fama (parou de jogar em 1971, assumiu «três anos depois») contra a biografia e a agência polonesa: quem faz a conta chega ao ano do título e erra. O dossiê mostra mês e ano |
| `1998` | a bola branca sai, entra a tricolor | fato **sólido**, código **ruim**: o ano já está impresso no átrio e é o do ponto por rali e de uma das datas do líbero | FIVB `https://www.fivb.com/volleyball/the-game/`; Mikasa `https://mikasasports.co.jp/e/company/history/`; `https://hiroshimagooddesign.jp/product/1034/`; Powerhouse `https://collection.powerhouse.com.au/object/502721` | **deixa de ser código.** A Ala 5 fica com o replay dos dois placares e o ritual de casar. A etiqueta do saguão pode manter o ano |
| `2002` | a quadra de praia encolhe para 8 × 16 m | **contestado**: testada em 2001, confirmada em 2002 | FIVB `https://www.fivb.com/beach-volleyball/the-game/history/`; Wikipédia "Beach_volleyball"; *Journal of Human Kinetics* `https://pmc.ncbi.nlm.nih.gov/articles/PMC3590823` (leva a 2001) | **deixa de ser digitado.** O baú abre contando as faixas de metro dos dois lances da corda (largura e comprimento). O ano entra na etiqueta como história: «testada em 2001, confirmada em 2002» |

**Consertos em `FACTS` (`museum.ts:44-115`), em L1:** `springfield-renaming` ganha as URLs acima;
`first-rulebook` e `six-a-side` citam hoje uma página que não contém o ano (trocar pela história da
FIVB e pela página do Morgan no IVHF); `filipino-spike` tem um publicador só e nunca vira código.
**Feito em 2026-10-04, com a captura (P0, item 5):** `springfield-renaming` cita as quatro páginas;
`first-rulebook`, a FIVB e a página do Morgan (um publicador só: é o mesmo texto nos dois sites);
`six-a-side`, a FIVB. A página de história do IVHF não traz 1897; traz 1918 na mesma frase da
FIVB, palavra por palavra, e por isso está no banco como cópia (`copies`), não como segundo
publicador.

### 7.3 As trancas de conhecimento do jogo completo

| Tranca | Sala | Valor | Entrada | A pergunta (degrau 0) | Ano-armadilha que a pergunta exclui | Fonte única no museu | Chaves com o numeral | Lote |
|---|---|---|---|---|---|---|---|---|
| `office-drawer` | escritório | 1896 | teclado, 4 dígitos | «Em que ano o Mintonette passou a se chamar Volley Ball?» | 1895 (a invenção) | etiqueta no verso do retrato do Morgan; `doc-halstead` | 2 (exceção `tutorial`) | L3, L4 |
| `paris-statutes-box` | Ala 2 | catorze | roda de dois tambores | «Quantas federações se sentaram a esta mesa?» | dezesseis (a lista dissidente, na ficha de dúvida dentro da caixa) | contar os marcadores | 0 (`counted`) | L18 |
| `tokyo-trophy-punch` | Ala 3 | 1962 | punção de quatro rodas | «Em que ano a União Soviética perdeu, em casa, o Mundial feminino?» | 1964 (os Jogos) | placa do uniforme soviético | 1 | L19 |
| `ironsand-coach-file` | Ala 4 | 1973 | teclado, 4 dígitos | «Em que ano Hubert Wagner assumiu a seleção da Polônia?» | 1974 (o título; a conta do Hall da Fama) | última folha do dossiê | 1 | L20 |
| `global-beach-trunk` | Ala 6 | 8 e 16 | duas rodas rotuladas | «Quantos metros tem cada lado da quadra de praia de hoje?» | 9 e 18 (a antiga) | faixas de metro dos dois lances da corda | 0 (`counted`) | L22 |
| `ironsand-kiraly-locker` | Ala 4 | o número da camisa | dois tambores | — | — | as costas da camisa (geometria) | 0 (`geometry`) | **fora da versão padrão**; só com fonte primária |

Rituais, sem número: `paris-beyond-europe` (casar; opcional), `global-ball-casts` (casar seis com
três; exigido pelo Encerramento), `rewrite-congress-case` (casar três pares; só com fonte; senão,
lacre). `kaizuka-motion-rail` e `ironsand-honours-rail` são leitura na versão padrão. Lacres de
conferência: os dois das medalhas, a caixa do distintivo `indoor`, o armário da Ala 4 e, sem fonte, a
caixa da Ala 5.

O degrau 4 de qualquer tranca («Ver a ficha de conferência») mostra o texto-fonte; numa tranca
contada, mostra a folha de conferência com a contagem em palitos. Nada disso cria chave nova com o
numeral (6.4).

### 7.4 Conflitos de numeral: a regra para o texto

| Assunto | Valores em circulação | O texto do museu diz |
|---|---|---|
| Líbero | teste a partir de 1996 × regra em 1998 (duas páginas da federação citam marcos diferentes) | «testado a partir de 1996, regra oficial em 1998»; nunca código |
| Três toques | 1920 × 1922 | 1920, com a divergência declarada |
| Ponto por rali | 1998 × 1999 × 2000 | «ratificado em outubro de 1998, obrigatório em 2000» |
| Quadra de praia | 2001 × 2002 | «testada em 2001, confirmada em 2002» |
| Wagner | 1973 (agência polonesa, biografia, Wikipédias) × 1974 (a conta do Hall da Fama) | «maio de 1973»; a ficha de dúvida mostra a conta |
| Fundadoras | 14 × 16 | catorze, contadas; ficha de dúvida |
| Fundação da federação | 18–20 × 20 de abril | «abril de 1947» |
| Renomeação | início de 1896 × 7 de julho de 1896 × dezembro de 1895 | só «1896» |
| Morte de Morgan | 27 × 28 de dezembro de 1942 | «dezembro de 1942» |
| Morgan conhece Naismith | 1891 × 1892 | «no início dos anos 1890» |
| Morgan deixa a YMCA | 1897 × 1900 | 1897 |
| Prédio da YMCA de Holyoke | associação de 1886 (só em busca; a página devolveu 404) × prédio de 1892 (aberto) | «o prédio, do começo dos anos 1890, queimou em 1943» |
| Bola Spalding | 1896 × 1900 | sem ano |
| Circunferência | "uns 25" × 25 a 27 polegadas | 25 a 27 |
| Wood × Woods | — | Woods |
| O vôlei chega ao Brasil | 1915 (Pernambuco) × 1916 (São Paulo) | as duas; ficha de dúvida |
| Vôlei sentado em 1976 | demonstração do sentado × do em pé | «estreia com medalha em 1980» |

Acréscimos da revisão à tabela de conflitos:

| Assunto | Valores em circulação | O texto do museu diz |
|---|---|---|
| Reconhecimento olímpico da praia | setembro de 1993 (Mônaco) × 24 de setembro de 1994 (Monte Carlo); nenhuma confirmada | nenhuma das duas; «demonstração em Barcelona, 1992; medalha a partir de Atlanta, 1996» |
| Gomos da bola em 1940 | doze, sem cadarço (cronologia da associação americana) × dezoito, com cadarço | a bola de cadarço fica na metade dos anos 1930 da sala; o verso declara a regra de 1940; nenhum número de gomos em placa até abrir o regulamento |
| Quadra em pés × em metros | 30 × 60 pés (18,28 × 9,14 m) × 18 × 9 m | «quase a mesma: a métrica ficou um palmo menor»; sem datas imperiais |
| Seis por lado | 1912 × 1918 | sem ano em placa; a divergência na ficha |
| Antena | 1968, 1976 e 9,40 → 9,00 m, nenhuma corroborada | nada datado; «o museu não achou regulamento que date a antena» |
| 1º Sul-Americano | 1951 × 1955 | fora do jogo até haver fonte |
| "Continentes" em Paris | três × quatro × cinco, conforme o modelo de continentes | nenhum número: «da Europa, da África e das Américas» (lint: numeral antes de "continente") |

### 7.5 O banco de curiosidades, com o lugar de cada uma

Fontes abreviadas: **FIVB-H** `fivb.com/volleyball/the-game/history/` · **FIVB-G**
`fivb.com/volleyball/the-game/` · **FIVB-R** `…/the-game/basic-rules/` · **FIVB-B**
`fivb.com/beach-volleyball/the-game/history/` · **FIVB-S** `fivb.com/snow-volleyball/the-game/` ·
**IVHF-H** `volleyhall.org/history-of-volleyball.html` · **IVHF-M**
`volleyhall.org/william-morgan-father-of-volleyball.html` · **WP** Wikipédia em inglês. "Pub." é o
número de publicadores independentes. Uso: **P** placa ou etiqueta · **V** detalhe do verso · **D**
documento · **J** Jorge · **B** banco de escuta · **S** figurinha.

**Ala 1 · Holyoke e saguão (L4, L9, L15)**

| # | Curiosidade | Fonte | Pub. | Onde aparece |
|---|---|---|---|---|
| F01 | a primeira ideia de Morgan foi o tênis; ficou só a rede | FIVB-H; IVHF-M | 2 | P: placa da rede |
| F02 | a rede ficava logo acima da cabeça de um homem médio | FIVB-H; IVHF-M | 2 | P: manchete da rede; a vista "de pé junto à rede" do exame no lugar põe a fita logo acima da linha do olho |
| F03 | o jogo é uma colagem: bola do basquete, rede do tênis, mãos do handebol de parede, innings do beisebol | IVHF-H | 1 | V: manual; quiosque, folha 1; S |
| F04 | nove innings; cada um acabava com três "outs" de saque por time | IVHF-H; WP | 2 | P: etiqueta do manual |
| F05 | no começo não havia limite de jogadores nem de toques | IVHF-H; WP | 2 | S |
| F06 | o saque podia ser ajudado por um companheiro | IVHF-H | 1 | S |
| F07 | em 1897 o sacador tinha duas tentativas, e o saque precisava andar dez pés | transcrição secundária (volleyball1on1.com); **conferir contra scan** (7.7) | 1 | S, só depois do scan |
| F08 | bola na rede era falta, menos na primeira tentativa de saque | idem; WP | 2 | V: manual |
| F09 | o manual apresenta o jogo como mistura de tênis com handebol de parede | idem | 1 | S, só depois do scan |
| F10 | os capitães da demonstração eram o prefeito e o chefe dos bombeiros de Holyoke | FIVB-H; IVHF-H | 2 | D: arquivo A; B: «O prefeito e o bombeiro» |
| F11 | a data famosa de 9 de fevereiro de 1895 não tem citação; Morgan só chegou em 30 de agosto | IVHF-H | 1 | D: `doc-invention-date` (já no jogo; passa a ser assinada «— O.») |
| F12 | Morgan, em 1916–17, creditou o Dr. Frank Woods e o chefe dos bombeiros John Lynch | IVHF-H | 1 | V: guia |
| F13 | "volley ball" em duas palavras até 1952 | FIVB-H | 1 | ficha do manual; S |
| F14 | o Canadá foi o primeiro país de fora a adotar o jogo, em 1900 | FIVB-H | 1 | S |
| F15 | na Ásia já se jogou com muito mais gente de cada lado do que hoje | IVHF-H | 1 | S (a quantidade fica fora do texto: colide com o código contado da Ala 6) |
| F16 | em 1919 as forças americanas distribuíram milhares de bolas | WP | 1 | S (sem o número, pelo mesmo motivo) |
| F17 | a conta de 1916 não fecha: 200 mil anunciados, 155 mil somados | FIVB-H | 1 | D: `doc-count-doesnt-close` (ficha de dúvida); V: guia (opcional) |
| F18, F19 | Morgan jogou futebol americano sob Stagg; foi homenageado em 1938; em 1951 o filho recebeu um diploma por ele | IVHF-H; IVHF-M | 1 | D: `doc-morgan-stagg` |
| F20 | o prédio da invenção queimou em 1943 | Commons | 1 | V: foto do ginásio (opcional) |
| F21 | o newcomb rivalizou com o vôlei até os anos 1920 | WP | 1 | S |
| F22 | por volta de 1916, nas Filipinas, surgiu o passe alto seguido de cortada: a "bomba filipina" | WP (dois artigos); Nusbaum | 2 | D: `doc-filipino-bomb`, com «ficou conhecido como»; revela `filipino-spike` |
| F37 | o museu do esporte de Tóquio guarda duas bolas de 1964: uma usada, uma nunca usada | `sdm.jpnsport.go.jp/gallery-1/15.html` | 1 | ficha da réplica de 1964 (saguão) |
| F70 | em 2008 a bola perdeu dez gomos de uma vez, e perdeu o branco | Kuraray `kuraray.com/jp-ja/news/2008/0625/`; WP | 2 | P: réplica de oito gomos (saguão); Ala 6 |
| F80 | uma cortada de elite pode sair de 60 cm acima do aro do basquete | FIVB-R | 1 | S (saguão) |
| F53 | 26 de julho de 1983, Brasil e União Soviética no Maracanã, para 95.887 pessoas | EFDeportes nº 184 | 1 | D: achados e perdidos (um ingresso); nunca em etiqueta |
| F54 | dois saques brasileiros têm nome de seriado: Jornada nas Estrelas e Viagem ao Fundo do Mar | EFDeportes nº 170 | 1 | B na Ala 4 (leitura do museu); na luz geral o Jorge diz só «aquele arco é um saque» |

**Ala 2 · Paris (L18)**

| # | Curiosidade | Fonte | Pub. | Onde aparece |
|---|---|---|---|---|
| F23 | a federação começou a ser combinada num café: o Graf, em Praga | IVHF (Libaud) | 1 | D: `doc-prague-memo`; B: «O café em Praga» |
| F24 | o Brasil estava entre as fundadoras, ao lado de Egito, Uruguai e Estados Unidos | IVHF (Libaud); WP PT e IT | 2 | P: placa do marcador «BRÉSIL» (a única etiqueta de parede sobre o Brasil na ala) |
| F25 | antes, o vôlei internacional era um departamento da federação de handebol | WP | 1 | D |
| F26 | o primeiro presidente ficou 37 anos; a sede só saiu de Paris em 1984 | IVHF; WP | 2 | P: retrato do presidente; V |
| F27 | primeiros Mundiais: 1949 (homens), 1952 (mulheres) | WP; IVHF | 2 | P: medalha de Praga |
| F28 | em 1924, em Paris, o vôlei foi demonstração não oficial nos Jogos | WP | 1 | S |
| F29 | a Mikasa nasceu em 1917 como fábrica de borracha em Hiroshima | Mikasa; WP | 2 | S |
| F30 | circula uma lista de dezesseis fundadoras | WP PL × IVHF | — | D: `doc-sixteen-doubt` (ficha de dúvida); caixa de quarentena no cofre |

**Ala 3 · Tóquio (L19)**

| # | Curiosidade | Fonte | Pub. | Onde aparece |
|---|---|---|---|---|
| F31 | um torneio especial em Sófia, em 1957, para convencer o comitê olímpico | WP | 1 | S |
| F32 | o Mundial de 1964 foi antecipado para não cair em ano olímpico | WP | 1 | V: kit soviético (sem o ano fora da etiqueta-chave) |
| F33 | o time japonês jogava com nove de cada lado até 1958 | WP; IVHF | 2 | P |
| F34 | as jogadoras trabalhavam de manhã na fiação e treinavam do meio da tarde às duas da madrugada | WP | 1 | V: uniforme |
| F35 | depois do título, cerca de 5 mil cartas pediram que o time seguisse até Tóquio | WP | 1 | V: maço de cartas |
| F36 | o ponto do ouro de 1964; o locutor anunciou «ponto do ouro» seis vezes | WP | 1 | B: «Ponto do ouro» (leitura do museu, com «conta-se que») |
| F38 | em 1964 não havia "a" bola oficial: vários fornecedores aprovados | J-STAGE (Ogawa, 2020) | 1 | V: bola de 1964; D: `doc-ball-1964-maker-doubt` (**só com o PDF lido**, 7.7) |
| F39 | o comitê olímpico tentou tirar o vôlei do programa de 1968 | WP | 1 | S |
| F40 | a praia teria começado em Waikiki, em 1915; as duplas são de Santa Monica, em 1930 | FIVB-B; WP | 2 | P: quadra de areia |
| F41 | o primeiro prêmio de um torneio de praia, em 1948, foi um engradado de refrigerante | FIVB-B; WP | 2 | V: tampa de garrafa |
| F42 | a cronologia da federação registra os Beatles batendo bola em Sorrento Beach | FIVB-B | 1 | D («diz a federação») |
| F43 | nos anos 1950, um jornal patrocinou um torneio de praia no Brasil (cronologia da federação) | FIVB-B | 1 | D |
| F44 | o Brasil sediou o Mundial masculino de 1960, em cinco cidades | WP | 1 | D |
| F45 | o Brasil estava no primeiro torneio olímpico: sétimo lugar | WP; EFDeportes nº 170 | 2 | P |

**Ala 4 · Ferro e Areia (L20)**

| # | Curiosidade | Fonte | Pub. | Onde aparece |
|---|---|---|---|---|
| F46 | Wagner assumiu a Polônia aos 32 anos, sem nunca ter treinado; o apelido era "Kat" | PAP; WP PL | 2 | D: dossiê |
| F47 | Wagner virou personagem de gibi; há um torneio anual em memória dele | IVHF | 1 | S (`asOf`) |
| F48 | o pai de Kiraly fugiu da Hungria em 1956; aos 11 anos Karch estreou na praia como dupla dele | WP; IVHF | 2 (pessoa viva: um dos dois tem de ser entrevista ou biografia oficial) | D: armário |
| F49 | Kiraly se formou em bioquímica | WP; IVHF | 2 | D: armário |
| F50 | ouro na quadra em 1984 e 1988 e na areia em 1996 | IVHF; WP | 2 | P |
| F51 | quem vence o Aberto de Manhattan Beach ganha uma placa de bronze cravada no píer | WP | 1 | V: placa (`asOf`) |
| F52 | o primeiro torneio de praia com patrocínio comercial e prêmio em dinheiro, em 1974, teve 250 espectadores | FIVB-B | 1 | S |
| F55 | a primeira medalha olímpica do vôlei brasileiro foi de prata, em 1984 | EFDeportes; WP | 2 | P, sem adjetivo |
| F56 | o primeiro torneio de praia chancelado pela federação foi em Ipanema, em 1987, e quem ganhou foi uma dupla americana | FIVB-B; WP | 2 | D: `doc-ipanema-1987` (a etiqueta de parede sobre o Brasil na ala é a F55) |
| F57 | os brasileiros que a federação cita entre os que levaram a praia ao mundo | FIVB-B | 1 | D |
| F58 | Bernard começou no basquete e trocou de esporte | WP | 1 | **só com segunda fonte** (pessoa viva) |

**Ala 5 · A Reescrita (L21)**

| # | Curiosidade | Fonte | Pub. | Onde aparece |
|---|---|---|---|---|
| F59 | o líbero foi testado a partir de 1996 e virou regra oficial em 1998; as páginas da federação citam ora uma data, ora a outra | FIVB-G × FIVB-R; WP | 2 | P: «Testado a partir de 1996, regra oficial em 1998»; D: `doc-libero-two-dates` (ficha de dúvida datada) |
| F60 | "líbero" é "livre" em italiano | WP | 1 | V: camisa |
| F61 | a bola colorida veio depois de testes com muitas cores | FIVB-G; prêmio de Hiroshima | 1 por afirmação | V: bola tricolor; a placa diz só que em 1998 a bola deixou de ser branca (FIVB, Mikasa, Powerhouse) |
| F62 | no placar antigo só pontuava quem sacava, e os sets iam a quinze | WP | 1 | B: «Só pontuava quem sacava»; S (sem ano: o ano fica na fórmula de 7.4) |
| F63 | o ponto por rali foi pensado para o placar ser fácil de seguir e o jogo mais rápido | FIVB-G | 1 | D: `doc-three-changes`; ritual (só se os três pares tiverem fonte) |
| F64 | desde 2000 o saque pode tocar a rede e seguir | WP; FIVB-G | 2 | B (`asOf`) |
| F65 | vale jogar com qualquer parte do corpo, pé inclusive | WP | 1 | S (`asOf`) |
| F66 | (retirada) data do reconhecimento olímpico da praia: 1993 × 1994, nenhuma confirmada | FIVB-B | — | fora do jogo até haver ata do COI; a etiqueta diz «demonstração em Barcelona, 1992; medalha a partir de Atlanta, 1996» |
| F67 | as primeiras campeãs olímpicas do Brasil saíram de uma final só de brasileiras, em 1996 | JB; WP | 2 | P, sem "único" |
| F68 | Jackie Silva deixou a seleção de quadra e foi jogar na areia dos Estados Unidos | WP | 1 | **só com segunda fonte** (pessoa viva) |
| F69 | Regla Torres foi campeã olímpica aos 17 anos | WP | 1 | V |

**Ala 6 · Global e mezanino (L22, L23)**

| # | Curiosidade | Fonte | Pub. | Onde aparece |
|---|---|---|---|---|
| F71 | a bola de 2008 foi escolhida para Pequim menos de dois meses antes dos Jogos | Kuraray | 1 | V |
| F72 | a quadra de praia ficou um metro mais estreita e dois mais curta | FIVB-B; WP | 2 | P: as duas marcações na areia |
| F73 | a bola de praia é um pouco maior e bem mais murcha | WP | 1 | V |
| F74 | na praia, a dupla combina o bloqueio por sinais de mão atrás das costas | WP | 1 | S (`asOf`) |
| F75 | o vôlei sentado nasceu nos Países Baixos, em 1956, da mistura com o sitzball | paralympic.org; WP | 2 | P |
| F76 | quadra de 10 × 6 m; rede a 1,15 m e 1,05 m | World ParaVolley; WP | 2 | V: vista sentada (`asOf`) |
| F77 | no vôlei sentado pode-se bloquear o saque | World ParaVolley; WP | 2 | S (`asOf`) |
| F78 | estreia paralímpica com medalha em Arnhem, 1980; as mulheres entraram em 2004 | paralympic.org; World ParaVolley | 2 | P |
| F79 | houve vôlei paralímpico em pé | paralympic.org | 1 | D |
| F81 | o Brasil tem duas datas de chegada do vôlei: 1915 ou 1916 | EFDeportes nº 170 | 1 | D: `doc-brazil-two-arrivals` (ficha de dúvida); B: «Duas chegadas» |
| F82 | o vôlei de neve ganhou forma em Wagrain, na Áustria, em 2008 | WP | 1 | V; S |
| F83 | joga-se de chuteira, com roupa térmica por baixo | FIVB-S; WP | 2 | P (`asOf`) |
| F84 | começou em duplas; desde o fim de 2018 são três de cada lado | WP | 1 | V |
| F85 | na neve, o toque no bloqueio não conta como um dos três | WP | 1 | V |
| F86, F87 | a demonstração de 2018; as primeiras medalhas de Brasil e Argentina em esporte de neve | WP | 1 | só com segunda fonte |

**Fatos a acrescentar** (entram no banco só depois de capturados em dois grupos; servem para o museu
não contar a história com um país só no centro, e para a União Soviética não aparecer só perdendo):

| # | Fato | Onde aparece, se capturado |
|---|---|---|
| F88 | o primeiro torneio olímpico masculino, em 1964, foi vencido pela União Soviética | P: flâmula, Ala 3 |
| F89 | a União Soviética venceu os dois torneios olímpicos de 1980 | P: uniforme, Ala 4 |
| F90 | a União Soviética venceu os dois primeiros Mundiais (1949 e 1952) | D: nota do presidente, Ala 2 |
| F91 | Cuba venceu três torneios olímpicos femininos seguidos, de 1992 a 2000 | P: camisa, Ala 5 |
| F92 | a Itália venceu os Mundiais masculinos de 1990, 1994 e 1998 | P: troféu, Ala 5 |
| F93 | a China dominou o vôlei feminino no começo dos anos 1980 (os títulos, com data) | D: Ala 4 |

Sem captura, a placa correspondente cai para a descrição do objeto e a peça continua na lista da ala.

### 7.6 O Brasil, sem ufanismo, e o equilíbrio do banco

O material verificado sustenta o Brasil como **presença constante**, não como herói: fundador em
1947 (F24), sede em 1960 (F44), sétimo em 1964 (F45), o Maracanã (F53), prata antes do ouro (F55),
Ipanema vencida por americanos (F56), primeiras campeãs numa final caseira (F67), duas datas de
chegada (F81). Regras, conferidas na fatia 0 de cada ala:

- no máximo **uma placa de parede** sobre o Brasil por ala (Paris: F24; Tóquio: F45; Ferro e Areia:
  F55; A Reescrita: F67; Global: nenhuma) e até 20% das curiosidades da sala; o resto desce para
  gaveta, banco e figurinha;
- nenhuma frase com "recorde", "único", "maior" ou "hoje" (`text-ages`); o pódio é lista datada com
  critério declarado, sem a palavra "cinco" e sem contar títulos;
- na luz geral, a fala do Jorge é sobre o prédio, não sobre um saque brasileiro de fonte única;
- F88 a F93 entram para que quem vence também seja sujeito de placa.

### 7.7 Pendências de fonte que são portão, não lembrete

| # | Pendência | Sem ela, o que vale | Portão de |
|---|---|---|---|
| 1 | captura do `1896` em dois grupos (FIVB e IVHF) — **feita em 2026-10-04** | o lote não fecha | P0, L1 |
| 2 | scan do manual de 1897 (Springfield College, HathiTrust) e do guia de 1916 | manual e guia ficam como reconstrução tipológica; F07 e F09 fora | L14 |
| 3 | costura ou cola na bola de 1964 e na tricolor | nenhuma menção a costura no saguão | L8 |
| 4 | Digital Commonwealth reaberta (foto do ginásio) | a fonte declarada é o Commons | L8 |
| 5 | capturas do catorze (lista de nomes), do `1962` e do `1973` — **feitas em 2026-10-04**; refazer com `npm run facts:capture` no lote de cada ala | a ala não abre | P0; L18, L19, L20 |
| 6 | `olympics.com` reaberto para «em Moscou» (o robô não abre: pedido em aberto em `facts.manual.ts`) | a placa diz «jogando em casa», sem a cidade | L19 |
| 7 | PDF do J-STAGE lido (F38) | a ficha da bola de 1964 diz só «o museu não sabe o fabricante» | L19 |
| 8 | regulamento americano de 1940 e as duas medidas de quadra | sem número de gomos; a placa dos regulamentos descreve o objeto | L18 |
| 9 | calendário soviético de 1941–1944 (e 1937) reaberto | a peça vira «calendários de parede (cenografia)», sem a frase | L18 |
| 10 | regulamento ou ata que date a antena e a mudança de 1976 | versão padrão: nada datado; trilho como leitura | L18, L20 |
| 11 | fonte primária do número da camisa de Kiraly | versão padrão: camisa de frente, sem número | L20 |
| 12 | fonte com "transmissão" ou "televisão" para os três pares; efeito documentado do líbero | versão padrão: «a década que reescreveu as regras»; lacre | L21 |
| 13 | ata do COI sobre a praia | versão padrão: Barcelona 1992 e Atlanta 1996 | L21 |
| 14 | movimento de treino da Kaizuka | trilho como leitura | L19 |
| 15 | console de desafio; a bola adotada mais recente; critério e linhas do pódio; o banco do técnico (o objeto só entra com fonte, e é pessoa viva) | o console cataloga por vista; a torre fica só com a bola de 2008; sem o banco | L22 |
| 16 | segunda fonte para origem e regras do vôlei de neve; F86, F87 | ficha de dúvida | L23 |
| 17 | segunda fonte (entrevista ou biografia) para F48, F58, F68 | fora do jogo | L20, L21 |
| 18 | F88 a F93 | a placa descreve o objeto | L19 a L21 |
| 19 | `docs/PESQUISA-CONTEUDO.md` recebe as nove atualizações de outubro: 1952 com fonte; o manual de 1897 com reprodução acessível; a morte de Morgan no dia 28 segundo o IVHF; o prédio de 1892; a confirmação da quadra em 2002; a fonte primária da bola de 2008; "Coach of the Century" com fonte e período incoerente (continuar sem imprimir); os endereços novos do IVHF; o líbero como teste e regra | — | L1 |
| 20 | catálogo de artigos esportivos de 1901–1915 (Spalding) aberto e capturado | o traje de ginásio não leva data, na etiqueta nem na ficha | L14 |
| 21 | segunda fonte para F12 (o artigo de Morgan e o crédito a Woods e Lynch no guia de 1916–17): o scan do item 2 serve | a etiqueta do guia diz só o que tem dois publicadores (Woods e Lynch ajudaram a redigir as primeiras regras); o artigo e o crédito ficam na ficha e no detalhe. O título «Morgan conta a história» (H-44, B.11) repousa nessa fonte única: o dono decide antes de L8 se ele fica | L8 |

### 7.8 As seis categorias de proveniência (enum fechado, por extenso na ficha)

| Categoria | Quando se usa | Exige | Na casa original |
|---|---|---|---|
| **original** | o próprio exemplar histórico | fonte de guarda | só a bola do Fundador (tombo nº 1; ficção declarada) |
| **peça de época** | objeto do mesmo tipo e da mesma época, não o exemplar | — | nenhuma |
| **reconstrução tipológica** | feita pelo museu a partir de descrições, catálogos ou fotos | — | câmara, Spalding, rede, manual, guia, traje |
| **reprodução** | cópia fotográfica ou impressa de um original **localizado** | a instituição que o guarda; «fac-símile» só com scan capturado | retrato, fotografia do ginásio |
| **réplica de manuseio** | feita para a mão do visitante | — | as quatro bolas da mesa de toque |
| **cenografia** | evocação sem original conhecido: mesa, medalhas não vistas, marcadores, a pasta de Paris | a frase «o museu não viu» ou «nenhum exemplar localizado» no verso | nenhuma |

O livro de tombo soma por categoria com a contagem real do conteúdo; a frase da carta («quase não há
original») é gerada dessa soma. Validadores: `exhibit-without-provenance`,
`provenance-claims-original-without-source`.

---

## 8. Diversão e exploração

### 8.1 As regras da casa

| # | Regra | Como se mede |
|---|---|---|
| G1 | **Partitura de 45 segundos.** Nunca mais de 45 s andando sem algo legível ou acionável; nunca mais de 60 s lendo sem um gesto. Ordem padrão: olhar (10–15 s) → ler (até 40 palavras) → mexer (20–40 s) → andar (até 15 s) | tabelas de 8.2; playtest cronometrado |
| G2 | **Triplo retorno.** Toda mudança de estado responde em três canais: um som, uma mudança no mundo e uma linha no caderno ou no HUD (até 4 palavras) | tabela de 8.4 |
| G3 | **Uma ideia por superfície** | `validatePacing` conta palavras |
| G4 | **A manchete é o fato surpreendente** | revisão de texto |
| G5 | **Dívida de curiosidade paga em até duas salas.** Tudo o que se vê e não se pode usar ainda ganha nome na planta e é pago na sala seguinte ou na volta ao escritório | roteiro em níveis |
| G6 | **Nada interrompe.** Nenhum pop-up de "você sabia". O Jorge só chama em marco; curiosidade, só quando o jogador liga | `test:radio` |
| G7 | **Nenhum objeto inerte** | `placement-without-role` com zero avisos: toda colocação tem interação, texto a ≤ 1,5 m, `askAbout` ou a marca `cenário` |
| G8 | **O corpo ensina.** Quando um fato é uma medida, o jogador a sente: fica de pé junto à rede de 1897 e vê a fita logo acima do olho, senta na quadra do vôlei sentado, conta as faixas de metro da corda | uma por ala (seção 5) |
| G9 | **O museu se declara desde o saguão** | campo `provenance`; marca de fonte nas figurinhas |
| G10 | **Dica nunca entrega sem consentimento** | `test:locks` |
| G11 | **Sem cronômetro de falha** | regra herdada (`REFERENCIA-TECNICA.md:70`) |
| G12 | **Estado nunca só por cor.** Ícone, padrão ou forma acompanham toda cor de estado (planta, LED, detalhes) | lint de contraste; revisão |

### 8.2 Ritmo: o que o jogador faz a cada 30–60 segundos

**Átrio, primeira passagem (3 a 4 minutos, a partir de L9):**

| Tempo | O jogador | O mundo responde | O que ele aprende |
|---|---|---|---|
| 0:00 | abre a porta do escritório | vista composta: piloto vermelho ao fundo, silhueta do plinto no centro, goteira; um trovão acende o vidro da claraboia, muito acima, sem iluminar a sala | é grande, está escuro, tem uma luz vermelha |
| 0:10 | atravessa com a lanterna | balde, anel aberto do lado dele, o poço sob a grade (a partir de L11) | há algo embaixo |
| 0:25 | mira o plinto | «Plinto do Fundador — três encaixes vazios»; a tranca entra na planta | a meta, vista no minuto um |
| 0:40 | `E` no quadro | alavanca, relés, cinco poças de luz em cascata, lente verde; `porter-atrium-service` | luz de serviço não é luz geral |
| 1:00 | recepção: pega o folheto | aba Planta; livro de visitas fechado | o mapa existe |
| 1:20 | achados e perdidos | álbum e a primeira figurinha | há mais |
| 1:40 | mesa de toque: a primeira réplica | guia de arrasto, etiqueta de conferência no verso, carimbo «Catalogada» | o verbo central |
| 2:30 | as outras três réplicas | cada placa aponta para uma era | "o original está lá" |
| 3:00 | púlpito e vitrine do Fundador | como ler o museu; o lacre com quatro silhuetas | o que conferir |
| 3:20 | espia um tapume (opcional) | uma vinheta da ala em montagem pelo olho mágico | o que vem |
| 3:40 | porta da Ala 1 | — | — |

**Holyoke (8 a 11 minutos, a partir de L8):** entra no escuro (a tela de entrada; o piloto na parede oposta, em diagonal) → atravessa com três vislumbres autorais (o vidro da vitrine-herói, o latão do quiosque, o rosto do Morgan) → `E` no quadro: cascata do fundo para a entrada → a bola de cadarço (a etiqueta do Otávio no verso) → a vitrine corrida, vão a vão (manual, guia, retrato, fotografia) → vira a moldura do Morgan: «Anotado no caderno» → arquivos A e B, um documento por vez → a rede (exame no lugar: de pé junto dela, a fita fica logo acima do olho) → traje e câmara → banco de escuta (opcional) → quiosque e figurinhas (opcional) → última peça: a sala fica azul, o Jorge chama → sai pelo atalho, do outro lado da sala: «Atalho destrancado».

Cada volta ao saguão (20 a 60 s) traz uma coisa nova. As alas seguem a partitura de 5.1.

### 8.3 A escada de dicas que nunca entrega

Um estado só por objetivo, compartilhado entre o painel da tranca e o rádio
(`progress.hintRungs[objetivo]`, salvo; fechar e reabrir o painel não zera).

| Degrau | Sobe quando | O que diz | Exemplo (`office-drawer`) |
|---|---|---|---|
| 0 | sempre | a pergunta | «Em que ano o Mintonette passou a se chamar Volley Ball?» |
| 1 — onde | 45 s no painel, 1 erro, ou a 1ª chamada ao Jorge | a sala | «Isso se aprende na Ala 1.» Se o jogador nunca entrou lá: «Você ainda não esteve onde isto se aprende.» |
| 2 — o quê | 90 s, 2 erros, ou a 2ª chamada | a peça; o ponto dela pulsa na planta | «Retrato de William G. Morgan.» |
| 3 — como | 3 erros ou a 3ª chamada | o gesto | «Vire a moldura. Está escrito atrás.» |
| 4 — a ficha | só se o jogador tocar em **Ver a ficha de conferência** (o botão aparece no degrau 3, no próprio painel; não precisa de rádio) | o caderno abre a ficha de conferência do Otávio para a peça-fonte: o texto do verso, com o trecho sublinhado. Numa tranca contada, a folha de conferência mostra a contagem em palitos. O jogador ainda digita ou gira | a anotação fica marcada «visto na ficha»; ler a fonte na peça troca a marca para «conferido na peça» |

- Se o fato já está nas anotações, o painel avisa («Você anotou isto») e abre a aba. Não preenche
  sozinho: digitar o que se leu é o prazer da tranca.
- Rituais: o degrau 3 fixa um item no lugar; o 4 mostra a folha de conferência com os pares.
- O humor do Jorge (paciência) muda a piada, nunca a altura da dica. A dica curta sempre repete o
  substantivo-alvo da cheia.
- Para objetivos sem tranca (religar, conferir, assentar, esperar, descer, abrir a pasta), a escada
  tem três alturas (onde, o quê, como) e vive no rádio; o **prompt do próprio objeto** sempre nomeia
  o que falta, para quem joga sem rádio. Tabelas no Anexo B.2, para a casa, as alas e o Encerramento.
- A dica do caderno («Primeiro o caderno») só vale enquanto o jogador não saiu do escritório; depois
  cede a vez ao objetivo corrente.

### 8.4 Retorno em três canais

| Ação | Som | Mundo | Caderno ou HUD |
|---|---|---|---|
| religar uma sala | alavanca, relés em sequência, reator | lente vermelha → verde, alavanca desce, luzes em cascata de 1,2–1,6 s | «Energia: Ala 1»; risco na lista |
| achar um detalhe | tique | destaque de borda | o texto do detalhe por 1,5 s |
| catalogar uma peça | carimbo | o ponto da peça some da planta; uma silhueta do lacre se preenche | «Catalogada» (depois do livro de tombo: «tombo nº …») |
| aprender um fato | lápis | — | «Anotado no caderno» |
| errar um código | trinco seco | o mostrador treme | o degrau da escada, se subiu |
| abrir uma tranca | trinco, gaveta correndo | a gaveta aberta de fato | a tranca some da planta |
| romper um lacre | papel rasgando | o lacre cai; a medalha à vista | «Medalha da Fundação» |
| assentar uma medalha | latão pesado, zumbido | o soquete acende | «Plinto: 2 de 3» |
| fechar a chave geral | contator; a bomba | a luz sobe do piso ao teto; a água desce | «Luz geral» |
| assinar um termo | pena no papel | o Livro fica aberto na página assinada; o selo acende | cartão «Termo de … assinado» |
| atalho aberto | barra antipânico | a porta passa a abrir dos dois lados | «Atalho destrancado» |
| item da lista | traço de lápis | — | a linha riscada |
| ganhar um distintivo | sino curto | LED verde na gaveta do arquivo de mapas | «Disciplina: Quadra» |
| achar uma figurinha | papel | o pacotinho some | «Figurinha 5 de 24» |

Sons que ainda não existem em `audio.ts` e entram com M18 (os essenciais, sintetizados, já em L10):
disjuntor, relés, goteira posicional, chuva em três intensidades, trovão, carimbo, lápis, medalha,
chave geral, bomba, passos por superfície (madeira, pedra, tapete, areia, concreto, água).

### 8.5 Segredos e recompensas para o curioso

| Segredo | O que é | Onde começa | Recompensa | Lote |
|---|---|---|---|---|
| **Álbum de figurinhas** | 24 curiosidades no jogo completo: 12 na casa original (2 no escritório, 3 no saguão, 7 na Ala 1), 2 por ala nova e 2 no mezanino (Anexo F.3). O pacotinho no mundo é sempre a mesma malha; a arte só existe no caderno (zero VRAM). Cada uma leva a marca de uma ou duas fontes | o álbum está nos achados e perdidos | álbum completo: um café sobre o balcão da portaria, em L24 | L15 |
| **A medalha no chapéu** | quem vira o chapéu antes de ler o Livro acha a medalha do Curador. Não é marco com hora: soma um ponto ao relógio, como qualquer outro | escritório | a regra do museu («o que conta está no verso») paga cedo | L11 |
| **Olho mágico** | uma vinheta de cada ala em montagem, vista por exame no lugar | tapumes do átrio | isca; vira a vitrine-isca da porta quando a ala abre | L9 |
| **Bancos de escuta** | sentar e ouvir uma **leitura do museu** (texto declarado, com fontes na ficha), com legenda. Um por sala (Anexo F.3) | banco da Holyoke; lounge do átrio | entra no Arquivo; é o ponto de descanso da partitura | L15 |
| **A moeda** | uma moeda antiga na almofada da poltrona de visitas → caixa de doação | escritório | figurinha e fala do Jorge («o primeiro doador da reabertura é o curador») | L15 |
| **Detalhe escondido** | um detalhe opcional por peça, fora do caminho do catálogo | toda peça | linha extra na ficha; contador "olho de curador" | L4 |
| **Pontos altos** | coisas visíveis e altas demais (topo da vitrine corrida, legenda do friso, a prateleira alta do escritório) | visíveis desde L4 | alcançadas com a escada de mão do mezanino: volta às salas antigas com uma capacidade nova | L23 |
| **Quadro de cortiça** | cada documento lido aparece pregado como miniatura; cinco barbantes para os fios | escritório | progresso físico na sala segura, sem HUD | L15, L17 |
| **Provas de etiqueta** | uma por ala: bilhete da Helena, resposta do Otávio a lápis vermelho | carrinho do escritório; arquivos | o conflito da reforma, contado sem cena | L3 (a do escritório, no cofre de ferro), L8 (Holyoke), L18+ |
| **Fichas de dúvida** | o museu dizendo o que não sabe | arquivos | uma por ala; a prateleira de quarentena no cofre | L8, L12, L18+ |
| **A porta de enrolar** | uma fresta de luz de lanterna por baixo da porta de aço da entrada, fora do campo de visão de quem sai do escritório | átrio, lado sul | resposta própria no rádio («Tô ouvindo seu passo daqui. Vai trabalhar.») | L9 |
| **Relógio acertado** | `E` no relógio | escritório | o relógio passa a contar a noite | L3 |
| **Palavras cruzadas** | no lounge, um número antigo que o Jorge deixa para os visitantes: «Falta uma: cinco letras, "chato".» | átrio | a palavra aparece preenchida na revista da portaria, em L24 | L9, L24 |

### 8.6 Dificuldade e acessibilidade

**Tela de ajustes** (L16), acessível do título e do caderno:

| Ajuste | Opções | Por quê |
|---|---|---|
| Brilho | contínuo, com imagem de calibração («ajuste até quase não ver o plinto») | a linguagem do jogo é o escuro |
| Tamanho do texto | 100, 125, 150% (painéis, legendas, caderno) | leitura é o jogo |
| Ler placa | «E: ler» em qualquer placa abre o mesmo texto no painel | o texto no mundo não escala |
| Legendas | sempre ligadas; opção «legendas de ambiente» («[vento numa porta, a sudeste]») | pista sonora não pode ser só som |
| Reduzir clarões | o relâmpago vira só o trovão; a cascata de luz vira subida suave | fotossensibilidade |
| Movimento de câmera | balanço e FOV (desligados por padrão) | vestibular |
| Sensibilidade e velocidade | controles | motor |
| Modo de jogo | **Curador** (padrão) ou **Visitante** | abaixo |
| Idioma | pt-BR, inglês | já existe |

- **Modo Visitante:** a escada sobe na metade do tempo, o Jorge começa no degrau 2, rituais já vêm
  com um item fixo e o painel preenche o código quando o fato está anotado (numa tranca contada, a
  contagem vira anotação ao abrir, não antes). Pode ser trocado a qualquer hora. Não há modo "difícil": a dificuldade do jogo é ler.
- **Cor:** planta com padrão além de cor; LED com forma além de vermelho e verde; contraste AA nas
  etiquetas, com lint.
- **Teclado:** girar com as setas, aproximar com + e −, trocar de vista com ← → ou Tab; foco
  preso nos painéis.
- **Toque:** alvo mínimo de mira de 0,35 m, pinça para aproximar, lanterna visível no exame, botões ‹ › para trocar de vista,
  **segurar o botão de Ação** para assinar e para a chave geral (M41, desde L3; um toque curto abre «Assinar / Cancelar»), retorno ao tocar numa porta bloqueada.
- **Modo leitura** (L24): página estática com todo o texto do museu, que serve também de revisão de
  roteiro.

### 8.7 O caderno e a planta

**Cinco abas** (cabem no toque):

| Aba | Conteúdo | Libera com |
|---|---|---|
| **Caderno** | carta da Helena; a lista "Antes das 9h", viva; «Minhas anotações» (fatos, metas, glossário); os termos assinados | ler o caderno |
| **Planta** | o mapa | o folheto da recepção (L9). O migrador de L9 dá a aba a todo save anterior e marca `legacy-pre-L9`; jogo novo precisa do folheto |
| **Acervo** | catálogo por sala, em três estados (vista, falta virar, catalogada), com a categoria por extenso; os fios, como seção, a partir de L17 | caderno |
| **Arquivo** | documentos, fitas ouvidas, leituras dos bancos | caderno |
| **Coleção** | medalhas (3), disciplinas (4), ferramentas, figurinhas, créditos | o primeiro item coletado |

**A lista "Antes das 9h"** (M32). Tinta é a Helena; lápis é você. Cada linha nasce de **estado**
(nunca de "chamada ouvida"), avisa com um toast («Anotado no caderno») e risca sozinha.

| # | Mão | Linha | Aparece quando | Risca quando |
|---|---|---|---|---|
| 1 | Helena | «Religar a energia: escritório, átrio e Ala 1», com contador | início | as três salas com energia (lista congelada) |
| 2 | Helena | «Catalogar o acervo: conferir peça por peça», com contador por sala | início | as 12 peças da casa (dívida datada até L4) |
| 3 | Helena | «Caixa-forte — só o Otávio sabia abrir» | início | o livro de tombo lido. Até L12 é promessa datada: leva a anotação a lápis «hoje não: o subsolo alagou» e não tem caixa de riscar |
| 4 | Helena | «Plinto: as três medalhas, para a cerimônia das nove» | a partir de L11 (em save antigo, com o toast «A lista da Helena tinha mais uma linha») | as três assentadas |
| 5 | você | «Gaveta do Otávio: "o ano em que o jogo deixou de se chamar Mintonette".» | recado ouvido, ou a gaveta tocada | gaveta aberta |
| 6 | você | «Chave do cofre de ferro.» | gaveta aberta | cofre de ferro aberto |
| 7 | você | «Assinar o termo de posse, no púlpito.» | Livro em mãos | posse assinada |
| 8 | você | «A reforma tirou das placas a linha que diz o que cada coisa é. O Otávio guardou a prova no cofre.» | prova de etiqueta lida | reabertura assinada |
| 9 | você | «O livro de tombo está na caixa-forte. A escada alagou; o outro caminho é o plinto.» | posse assinada (a partir de L11) | livro de tombo lido |
| 10–12 | você | «Medalha do Curador — a fita do chapéu.» · «Medalha da Fundação — Ala 1, o lacre da vitrine.» · «Medalha da Linhagem — saguão, a vitrine do Fundador.» | página II lida, ou a medalha achada | cada medalha na mão |
| 13 | você | «A bomba só liga com a luz geral. A luz geral só fecha com as três medalhas.» | posse assinada (a partir de L11) | luz geral |
| 14 | você | «Assinar o termo de reabertura.» | livro de tombo lido | assinado |
| 15 | você | «Continuar declarando.» | reabertura assinada | nunca: é a última linha do caderno |

Depois da Reabertura a Helena acrescenta **uma página**: «Ampliação: uma ala por vez, conforme a obra
entrega. Inauguração no dia seguinte a cada termo.», com uma linha por ala, que nasce quando a pasta
é aberta e risca com o termo. Uma segunda página, «Do Otávio», reúne distintivos, gavetas, fios e a
prateleira alta.

**A planta.** Sala só aparece depois de visitada; porta só de sala visitada; a vizinha entra como um
toco com «?». Três estados por padrão e cor: tracejado cinza (sem luz), hachura âmbar (acesa, falta
algo), cheio azul (completa). Marcador com seta e rosa dos ventos. Ícones: quadro de força enquanto
a sala está apagada; tranca tocada, com o nome do que falta («Plinto — 1 de 3 medalhas»); peça vista
e não catalogada; gaveta com documento não lido; atalho depois de aberto. Aba "Subsolo" a partir de
L12. A planta de parede do escritório é redesenhada em L9 com as portas reais (hoje ela põe a Ala 5
onde ficará a entrada e o mezanino ao sul), e o texto sai do SVG para o dicionário.

### 8.8 O Jorge

- **O que ele sabe:** o que o painel do alarme mostra (cânone 9). Fala declarada em `porter-hello`:
  «Aqui eu tenho o painel do alarme: toda vitrine, gaveta e porta desse prédio acende uma luzinha
  pra mim.» O que contato não vê, ele pergunta («Tinha o quê aí dentro?»).
- **Uma chamada por marco** (tabela no Anexo B.1), com `when`, `lapsesWhen` e `mentions`. Tocam na
  ordem do conteúdo, uma por vez; cada fala em chaves de até 130 caracteres (menos de 9 s). Se
  várias vencerem com o rádio longe, a mais recente toca quando o rádio voltar e as que caducaram
  não tocam.
- **Fechos de ato e epílogo não são chamadas:** são sequência dirigida (M42), pelo alto-falante de
  chamada da sala, com ou sem rádio.
- **Dica em três alturas** por objetivo, a primeira que vale vence (Anexo B.2).
- **"E isso aqui?"** — `R` com a mira num objeto que tem `askAbout`: uma fala, uma vez por objeto.
  Exemplos: o poço do plinto («Eu falei que alagou.»), a caixa de doação («Já olhei: um botão e uma
  moeda.»), o chapéu («É do cargo. Ele deixou.»), um tapume («Tem olho mágico. A Helena jura que não
  é pra espiar.»).
- **«O Otávio dizia…»** — sem nada pendente, uma fala por visita à sala, em que ele cita o Otávio ou
  lê a ficha de entrega da obra. Ele não é guia de áudio (D36): o banco de curiosidades mora nas
  figurinhas, nos bancos de escuta e nas fitas do Otávio.
- **Resumo de retomada** — ao "Continuar", uma fala: onde o jogador parou e o que faltava.
- **O que ele faz:** lê os recados do Otávio colados no painel; solta a grade do elevador quando o
  curador pede; sobe a porta de enrolar às nove (com motor) e, no Encerramento, para o curador.
- **Repertório por estado.** Toda fala presa a apagão ou a chuva tem `when` (não toca depois da luz
  geral nem depois que a chuva para); o ar morto muda com o céu; o telefone diz «Linha muda.» até a
  Reabertura e «Linha de volta. Um recado novo.» depois.
- **Paciência**, recalibrada por dado para uma noite longa: cada sala acesa, cada medalha e cada
  termo contam como progresso; a virada de ato baixa um nível inteiro. Uma simulação de partida de
  60 minutos com relógio e dado fixos entra em `test:radio`.
- **Zona sem rádio:** a caixa-forte do Fundador.

### 8.9 Depois do final

1. **O museu aceso e aberto.** Luz geral, a lista da Helena inteira riscada e uma lista nova,
   opcional: figurinhas que faltam, pontos altos, fios.
2. **A linha de baixo.** Toda placa do mundo ganha a linha de proveniência.
3. **Curadoria** (L15, depois da Reabertura): em cada sala, um atril de entrada mostra o "destaque do
   curador": o jogador escolhe uma entre as figurinhas que achou ali. A escolha fica no save. É a
   carta do Otávio («continue declarando») virada em verbo.
4. **Livro de visitas.** No balcão, o resumo da noite: peças, fatos conferidos na peça × contados
   pelo Jorge, detalhes escondidos. Sem dado pessoal.
5. **Fitas do Otávio.** Com tudo feito numa sala, o banco de escuta dela ganha uma segunda fita. O Jorge não vira guia de áudio.
6. **Segunda visita.** O modo Visitante e o modo leitura servem a quem volta só para mostrar o museu.

### 8.10 Critérios de aceite com uma pessoa nova

| Marco | A pessoa |
|---|---|
| L3 | chega à Posse sem ajuda; diz, sem ser perguntada, o que falta |
| L4 | acha o quadro do átrio em até 3 min; termina a Ala 1 em 8 a 12 min; repete dois fatos verdadeiros; chama o Jorge no máximo três vezes no caminho crítico; não aperta `E` em mais de dois objetos sem resposta |
| L12 | diz algo sobre o tamanho do átrio quando a luz geral acende; sabe dizer o que a carta pede |
| L18 | conta os marcadores sem dica do degrau 3 |
| L22 | fecha um fio cruzando o prédio e sabe dizer qual |
| L23 | usa a luneta para decidir aonde ir |
| L24 | joga no celular, em paisagem, sem pedir ajuda para girar uma peça |

---

## 9. Lotes de execução até o final

### 9.1 O processo de todo lote

Cada lote é uma rodada como a do escritório. A ordem é fixa; nenhum passo é pulado. Um lote pode ser
publicado em **fatias**; cada fatia passa pelos passos 2 a 11, e nenhuma fatia concede credencial,
cita objeto ou acrescenta item de lista sem consumidor no mesmo deploy.

| Passo | O que se faz | Saída |
|---|---|---|
| 0. Sincronizar | `git fetch && git pull --ff-only` na `main`, no checkout principal. Sem worktree, sem branch paralela, sem `git stash` (o OneDrive corrompe), `git add` sempre por caminho explícito | árvore em dia |
| 1. Auditar | reler os defeitos do lote e o código que eles tocam; conferir no navegador os itens [a validar] (Anexo E); escrever o **plano do lote** em `docs/lotes/L<n>-plano.md`: tarefas com arquivo:linha; textos novos em pt-BR **e em inglês**, com `claims` e `mentions`; ids; tabela "receita, hoje, depois, teto, classe"; delta de draws e triângulos previsto por sala; dívidas datadas que o lote fecha e abre; o que cada teste vai provar | plano do lote |
| 2. Teste primeiro | a suíte nova (ou o caso novo) **reprova o estado atual** antes de qualquer conserto. Teste que hoje trava o comportamento antigo muda junto, e a mudança é anotada (6.5) | vermelho pelo motivo certo |
| 3. Implementar | conteúdo é dado; `npm run bake` se mudou gerador, material ou colisor; nunca editar arquivo gerado | — |
| 4. Portão | `npm run check` verde, com as suítes novas do lote já dentro dele; `knownDebt` impresso | verde |
| 5. Revisão adversarial | um agente sem o contexto da implementação tenta refutar cada conserto: joga a rota canônica e duas ordens estranhas, **sem rádio numa delas**, carrega os saves do corpus, procura objeto sem resposta, texto que aponta para o que não existe e fala que o estado desmente | achados, todos fechados ou datados |
| 6. Navegador | dev server (`museum-dev`, porta 5201; **reiniciar depois de editar**). A **rota do lote**, partindo do save do lote anterior (`?qaSave=<fixture>`), mais a fumaça do início; percurso completo do título ao último termo só em L3, L12, L16 e L24. Em pt-BR e em inglês; em desktop e em viewport de toque (844 × 390) **usando os botões de toque**, não o teclado. Folhas de contato das receitas tocadas. Contadores de `__museumPerf()` nos pontos de referência, depois de reload limpo. Console sem erro nem aviso novo | folhas, medições |
| 7. Aceite visual | o dono vê a folha antes/depois e a imagem-alvo da sala (`docs/concepts`) nos lotes de arte (L5, L7, L9, L10, L11, L13, L14 e toda ala) | "sim", ou lista de retoques |
| 8. Revisor | uma revisão por push, só código de runtime | aprovado |
| 9. Publicar | commit com mensagem clara e só os arquivos do lote; push para `main` | — |
| 10. Deploy | `npm run deploy` (build e `wrangler deploy`). Se o Wrangler falhar por IPv6: `NODE_OPTIONS=--dns-result-order=ipv4first` | versão Cloudflare anotada |
| 11. Fumaça | em produção: novo jogo até o primeiro marco; "Continuar" com um save do lote anterior; console sem erro | ok |
| 12. Fechar | `npm run graph:snapshot`; corpus de saves ampliado; manifesto de capturas; `docs/HANDOFF.md` atualizado (estado, medições, lições, testes que mudaram, promessas e dívidas datadas, o que a medição manual mostrou); `docs/PESQUISA-CONTEUDO.md` se alguma fonte mudou | passagem |
| 13. Playtest | uma pessoa nova, quando o lote muda o percurso (critérios em 8.10) | observações viram tarefas |

**Armadilhas do harness de captura:** com o painel oculto, só `__museumStep(n)` anda o jogo; rajadas
de captura derrubam o DPR adaptativo (forçar `document.visibilityState` a `hidden`); o
`devicePixelRatio` pode cair entre navegações (fixar e emitir `resize`); o canvas capturado não
inclui o HUD.

**Pronto é:** portão verde, rota feita no navegador com toque, revisão fechada, deploy no ar, fumaça
feita, HANDOFF escrito. Se algum passo falhar, não se força: registra-se o bloqueio e a próxima ação.

### P0 — Preparação (um commit de documentos e ferramentas; nada muda no jogo)

1. **Feito em 2026-10-03, junto com este plano:** os relatórios `01` a `07` e `10` a `12` estão em
   `docs/plano-mestre/fontes/`; os scripts de medição (`geo.mjs`, `geo2.mjs`, `tex.mjs`, `media.mjs`,
   `lights.mjs`, `inv.mjs`, `atrium-walk.mjs`, `breaker-ray.mjs`, `examine-sim.mjs`,
   `laced-sweep.mjs`, `bays.mjs` e os demais) em `scripts/audit/`; as 100 capturas em
   `docs/contact-sheets/baseline-2026-10-03/`. **Feito em 2026-10-04:** o caminho absoluto saiu dos
   scripts (todos resolvem a raiz por `scripts/audit/lib/repo.mjs`), cada um abre dizendo o que mede
   e tem a sua entrada `npm run audit:*`, fora do `check`; `scripts/audit/packages.mjs`, que a
   seção 6.2 citava, foi escrito.
2. Registrar as decisões D1–D36 (as marcadas com (!) com resposta do dono; as outras, pelo padrão).
   **Feito em 2026-10-04:** `docs/plano-mestre/DECISOES.md` (o dono mandou seguir os padrões).
3. Apontar para este plano em `AGENTS.md` e no HANDOFF; marcar em `docs/PLANO-COMPLETO.md` o que foi
   substituído (Anexo D). Um teste de documentação confere que todo ID citado aqui resolve num
   arquivo do repositório. **Feito em 2026-10-04:** `npm run test:docs`.
4. M44: `?qaSave=<fixture>`; manifesto de capturas; os saves de produção de hoje escritos à mão no
   formato de `legacySave.ts` (gaveta aberta e fechada; `guide-1916` e `atrium-ball-laced`
   catalogadas sem girar; sem `radioCalls`; rádio na mesa com o jogador na Holyoke).
   **Feito em 2026-10-04:** os cinco saves em `src/content/saveFixtures.ts`, carregados pelo caminho
   real de carga em `npm run test:qa-save`; `?qaSave=<nome>` só no servidor de desenvolvimento
   (`src/dev/qaSave.ts`); o manifesto em `docs/contact-sheets/baseline-2026-10-03/manifest.json`,
   gerado por `npm run captures:manifest` e lido por `npm run test:captures`.
5. `npm run facts:capture` (M11): capturar em dois grupos o `1896`, o catorze (lista de nomes), o
   `1962` e o `1973`; o que o robô não abrir vai para `facts.manual.ts`, conferido à mão.
   **Feito em 2026-10-04:** o banco (`src/content/facts.bank.ts`) diz em que páginas cada fato se
   apoia; o script lê cada uma e grava em `src/content/facts.generated.ts` o status, o título real,
   o hash do texto, a data e um trecho de até catorze palavras em volta do valor; `facts.manual.ts`
   guarda o que o robô não abre. Capturados, cada um em dois grupos de publicadores: `1896` (FIVB,
   IVHF e Wikipédia), o catorze como lista de nomes (IVHF; Wikipédias IT e PT), `1962` (Wikipédias
   EN e RU; IVHF) e `1973` (PAP; Wikipédias PL e EN). Uma página não abriu para o robô e espera uma
   pessoa: `olympics.com` (item 6 de 7.7). No `check`: `fact-code-uncaptured` e os códigos novos
   `fact-source-uncaptured`, `fact-source-drift` e `fact-capture-malformed` (em
   `validate:content`), e `npm run test:facts`. Os consertos de `FACTS` previstos para L1 (a URL
   morta e as duas páginas sem o ano, 3.12 e 7.2) entraram junto, porque o portão novo reprovava os
   três.
6. **Aparelho real nº 1** (dono, 30 minutos, com o build de hoje): Android médio e iPhone; memória
   depois das três salas, draws e fps no átrio, tempo até o primeiro frame. Os números entram no
   livro-caixa como teto medido.
7. Conferir no navegador os itens do Anexo E; gravar a linha de base (dez pontos de referência,
   draws, triângulos e programas depois de reload limpo).
   **Feito em 2026-10-04:** `docs/lotes/P0-linha-de-base.md`, com as 20 capturas em
   `docs/contact-sheets/p0/`. Os quatro itens do Anexo E que L1 usa estão conferidos: o #2 e o #3
   se confirmam; no #4 a parede está livre, mas a posição proposta (z = 5,0) fica atrás da
   vitrine-herói para quem entra, e a validada é `[-5.86, 1.15, 2.2]`; no #8 a porta fica presa
   como previsto, e uma imagem que **falha** (em vez de não chegar) desmonta o jogo inteiro. A
   linha de base tem dez pontos com câmera registrada, os programas, os bytes por caminho e a
   textura residente; ela corrige três números do livro-caixa (nota em 4.8). Os outros itens do
   Anexo E ficam com os lotes que os usam.

**Estado de P0 em 2026-10-04:** itens 1 a 5 e 7 feitos; o item 6 (aparelho real nº 1) é tarefa do
dono e continua pendente. Não trava L1; trava o livro-caixa de L6.

### L1 — Correções no ar

- **Objetivo.** Tirar do ar o que está errado hoje, sem motor novo, e ligar as catracas.
- **Escopo.** M0, M40a, M11 (`fact-code-uncaptured`), catracas de M14 e M16. Arquivos:
  `src/content/museum.ts`, `validate.ts`, `i18n/pt-BR.ts`, `i18n/en.ts`; `src/engine/PowerControls.tsx`
  (proxy de dupla face), `TransitionDoors.tsx` e `src/scenes/MuseumScene.tsx` (tempo-limite);
  `scripts/bake/parts/holyokeDecor.mjs` (`layout`), `fixtures.mjs` (nós `__led`, `__lever`),
  `bake.mjs` (colisor do quadro); `scripts/test-navigation.ts`, `test-kit-placement.mjs`,
  `test-opening-flow.ts`, `test-power.ts`.
- **Conteúdo.** Toda a frente 12 (texto histórico, com os acréscimos de 3.12); D5; fontes de `FACTS`
  e a URL morta; as quatro peças da vitrine corrida no centro dos vãos; o quadro da Holyoke na parede
  oeste, com lente emissiva (H-26); ÁT-A1, ÁT-G2, ÁT-H3, ÁT-B4; falas sem pontos cardeais; H-21; a
  última dica do Jorge e a fala do subsolo deixam de apontar para medalhas e cofre («O subsolo
  alagou; hoje ninguém desce. A luz tá feita; fora isso, hoje é só conferência.»: a dica só toca com
  as três salas acesas, e a revisão do lote tirou dela a luz como coisa a fazer); a pista de cinco
  letras em inglês; `PESQUISA-CONTEUDO.md` atualizada.
- **Aceite (automático).** Asserções históricas verdes nas duas línguas; peça × `layout` sem
  interseção; teste de farol do piloto da Holyoke; do ponto onde a cápsula para, `E` alcança o
  quadro; a porta do escritório abre em modo degradado depois do tempo-limite; `knownDebt` listado
  (Anexo C). **Manual:** o piloto visto da porta, no escuro; os quatro vãos.
- **Portões novos.** Validadores de M0; `test:kit` (peça × `layout`); catracas: tamanho do `kit.glb`,
  bytes por caminho, programas, textura residente.
- **Risco.** Baixo. Teto temporário de ÁT-K1 (a lente emissiva).
- **Passagem.** Nenhum final novo; nenhuma instrução aponta para o que não existe.
- **Feito em 2026-10-04, ainda não publicado.** Plano do lote em `docs/lotes/L1-plano.md`; dois
  commits locais na `main` (conteúdo, depois geometria e motor); `npm run check` e
  `npm run build` verdes; rota conferida no navegador de desenvolvimento, com o piloto da Holyoke
  visto da porta no escuro e os quatro vãos; medições, dívidas e o que saiu diferente do plano em
  `docs/HANDOFF.md` §10. **O teto temporário de 58 lotes não foi gasto:** a lente e a alavanca
  renomeiam nós que já existiam, o kit do átrio continua em 56 de 56 e fica a folga inteira para
  o Livro de L3.
- **Revisão adversarial (passo 5) feita em 2026-10-04**, num terceiro commit local: 27 achados (19
  distintos) em cinco lentes (fluxo, fatos, bake, testes, visual), todos fechados ou datados; o registro está em
  `docs/HANDOFF.md`, §10.11. Faltam os passos 8 a 11 de 9.1 (revisor, push, deploy, fumaça), o
  resto da rota de toque e em inglês, e o passo 12 está feito só em parte: o registro existe, o
  corpus de saves de L1 e o congelamento das capturas ficam para quem fechar o lote (HANDOFF,
  §10.10).

### L2 — Trilhos

- **Objetivo.** Os portões de "sempre completável" e o estado que os lotes seguintes usam.
- **Escopo.** M2, M5, M6a, M4a, M10, M39, M15, M11 (lint em duas regras). Arquivos:
  `src/state/store.ts`, `src/content/schema.ts`, `legacySave.ts`, `validate.ts`; novos
  `src/engine/lockRules.ts`, `triggers.ts`, `examineReach.ts`, `contentRegistry.ts`;
  `progressCondition.ts`, `transitionDoorTopology.ts`, `TransitionDoors.tsx`, `Containers.tsx`,
  `PowerControls.tsx`; `src/ui/LockPanel.tsx`, `MuseumMap.tsx` com `mapModel.ts`; suítes novas.
- **Conteúdo.** `progress.doorsReleased` (o atalho fica aberto dos dois lados; `porter-shortcut`
  entra em L3); `progress.locksSeen` e a planta sem spoiler, com seta e norte (ÁT-I1); `attemptLock`
  como único caminho (S1); gatilhos de disparo único (S11); `1896` reduzido às chaves autorizadas.
- **Aceite (automático).** Saves de produção carregam sem perder átomo; um save gravado por este lote
  e lido pelo código de L1 não perde o que L1 conhece (campos desconhecidos preservados daqui em
  diante); o caminho do título continua sem importar conteúdo (catraca de bundle); `simulateProgress`
  imprime o roteiro e acusa as três peças como dívida; o robô termina as 500 ordens no estado máximo
  de hoje; o atalho abre do átrio depois da primeira saída e continua aberto depois de recarregar.
- **Portões novos.** `test:save`, `test:triggers`, `test:locks` (v1), `test:playthrough`, `test:map`,
  `validateAdditive` (primeiro instantâneo), lints `numeral-exclusivity`, `counted-pattern`,
  `text-ages`; casos em `test:transition-door` e `test:navigation` (inundação).
- **Risco.** Médio: o store passa a executar gatilhos no caminho de todo `E`; a migração muda. Um
  rollback para antes de L2 perde campos novos (registrado no HANDOFF).
- **Passagem.** Trilhos prontos; nada de história nova.

### L3 — Posse

- **Objetivo.** O jogo passa a ter um fim honesto, assinável também no celular e sem rádio.
- **Escopo.** M31, M32, M33, M41, M42, M6b (cofre com tranca de ferramenta), M7a, M9, M35 (`deferred`).
  Arquivos: `museum.ts`, dicionários, `schema.ts`; `src/engine/primaryAction.ts`, `Devices.tsx`,
  `deviceRules.ts`, `radioCall.ts`, `Containers.tsx`; `src/ui/MobileControls.tsx`, `Hud.tsx`,
  `Journal.tsx`, `Notebook.tsx`; `scripts/bake/parts/officeProps.mjs` (secretária; nós do cofre; o
  Livro), `atriumDecor.mjs` (apoio do Livro no púlpito).
- **Conteúdo.** O cofre de ferro vira container (chave consumida); a gaveta concede a chave; dentro
  do cofre, o Livro de Termos e a prova de etiqueta; o púlpito como mesa de assinatura (`termo-posse`,
  segurar ou tocar e confirmar); a secretária eletrônica; o relógio que se acerta; o telefone («Linha
  muda.»); `doc-otavio-handover` (alias de `doc-predecessor`); a lista (linhas 1 a 3 e 5 a 8); as
  chamadas e dicas do Ato I (Anexos B.1, B.2), com `lapsesWhen`; documentos um por vez (H-35); D34
  (os dois nomes, nas duas línguas); `threads` sai das quatro bolas; `MedallionId` vira `curator`,
  `founding`, `lineage`; sai `breaker-handle`; o pódio ganha prompt e `deferred`.
- **Aceite (automático).** Rota canônica chega à Posse; não se assina sem luz nas três salas; o
  perfil "pula tudo" assina e vê o fecho; segurar o botão de toque assina, soltar antes cancela; um
  save de produção com a gaveta aberta recebe a chave na carga e ouve `porter-legacy-drawer`; a linha
  3 da lista não risca e leva a anotação; `test:speech-coherence` verde. **Manual:** percurso
  completo, com e sem rádio, em desktop e toque; uma pessoa nova chega à Posse (8.10).
- **Portões novos.** `test:ending`, `test:speech-coherence`; casos em `test:mobile-controls`,
  `test:radio`, `test:opening`, `test:opening-flow`.
- **Risco.** Médio (o gesto novo toca o caminho de todo `E`). Teto temporário de ÁT-K1 (o Livro).
- **Passagem.** Dívida: catalogar ainda falha em três peças (L4). Promessa datada: a caixa-forte.

### L4 — O verbo: examinar, virar, catalogar

- **Objetivo.** O verbo central funciona nas 12 peças, sem depender de modelo ainda em branco.
- **Escopo.** M4b, M6b (teclado de N dígitos; escada; «Ver a ficha»). Arquivos: novo
  `src/engine/examineRig.ts`; `Interaction.tsx`; `src/scenes/MuseumScene.tsx` (a impressão dentro do
  grupo da peça); `FramedMedia.tsx`; `interactionTarget.ts`; `flashlightRig.ts`; `LockPanel.tsx`,
  `Hud.tsx`, `hudRules.ts`, `Journal.tsx`; `styles/museum.css`; `scripts/bake/kit.mjs` e
  `historicalVolleyballs.mjs` (`anchors`).
- **Conteúdo.** `normal` em todo detalhe; **etiqueta de conferência do Otávio no verso das 12 peças**
  (texto de runtime, Anexo B.11), como detalhe obrigatório; rede e traje com exame no lugar (duas
  vistas cada); a data do retrato passa da plaqueta para o verso; as três chaves dos detalhes
  emprestados; «Minhas anotações»; Acervo em três estados, com contador por sala; guia de arrasto,
  ajuda por tipo de peça, luz de mão, volume de mira e oclusão; o recado e as falas trocam «placas»
  por «verso».
- **Aceite (automático).** `test:examine` reprova primeiro os dados atuais das três peças e passa
  depois; nenhuma peça cataloga ao pegar; as 12 catalogam, e só depois de girar ou de trocar de
  vista; a peça não fica sob o painel em 1280 × 720 nem em 844 × 390; a escada sobe um degrau de cada
  vez e a ficha só abre a pedido; o item 2 da lista risca. **Manual:** as doze no navegador, acesas e
  no escuro, com mouse e com toque.
- **Portões novos.** `test:examine`; `hotspot-label-foreign`, `hotspot-visible-at-pickup`;
  `test:room-runtime` (impressão dentro do grupo); `test:locks` (escada).
- **Risco.** Médio. Sem textura nem mídia nova (catraca de textura); o texto do verso só é desenhado
  durante o exame. Saves com peças catalogadas sem girar ficam como estão.
- **Passagem.** Os modelos ainda não polidos só carregam detalhes opcionais.

### L5 — Pipeline e orçamento

- **Objetivo.** As fundações de custo zero e o estimador, antes de qualquer afinação de luz.
- **Escopo.** M3, M14, M40b, M1; AS-S1, S2, S3, S5, S7, S10; AS-L6; C1, C2, C4 (maçaneta e veio).
  Arquivos: `scripts/bake.mjs`, `scripts/bake/kit.mjs`, `lib/geometry.mjs`, `lib/glb.mjs`,
  `materials.mjs`, `parts/*.mjs`; `src/scenes/MuseumScene.tsx` (horizonte do ambiente);
  `scripts/test-kit-runtime.ts`; novos `test-room-placement.ts`, `test-shell-finishes.ts`.
- **Conteúdo.** Registro de receitas com classe e papel; paletas na casca (a Holyoke ganha piso
  tabaco e forro escuro; o escritório declara maple); caixas sem vinco; veio no eixo longo;
  `normalScale` das madeiras; latão com o que refletir; receitas ociosas fora do GLB; na casca do
  átrio: **claraboia** (com o vidro trincado), grade do alto-falante de chamada, pendentes e
  caixotão assentados, barras dos banners retas; grelha encostada; hash nos dois SVG; o texto
  «janelas» vira «claraboia», só agora.
- **Aceite (automático).** Portões de bake de 4.10; nenhuma face plana com normal torta; o estimador
  reproduz as contagens de hoje dentro de uma margem declarada e passa a ser o portão; `kit.glb`
  menor. **Manual:** as 30 capturas de referência antes e depois; aceite visual; o escritório não
  piorou (ΔE dentro da tolerância de 4.10).
- **Risco.** Alto (muda os GLBs de casco das três salas). Sem mudança de grafo: `validateAdditive`
  idêntico.
- **Passagem.** O forro que a luz geral vai revelar já está certo.

### L6 — Kit por sala e fusão

- **Objetivo.** Comprar a folga de draws e de primeiro frame, uma vez só, no bake.
- **Escopo.** M12, M21, M13a, M45 (portas). Arquivos: `scripts/bake.mjs` (bundles por sala; fusão;
  colisores em espaço de sala), `src/engine/kitPart.ts`, `RoomFurniture.tsx`, `bundleCache.ts`,
  `roomLod.ts`, `interactionTarget.ts` (proxies de mira), `TransitionDoors.tsx`,
  `src/scenes/MuseumScene.tsx` (Suspense por sala); `test-kit-runtime.ts`, `test-kit-placement.mjs`,
  `test-desk-top.ts`, `test-bookshelf.ts`.
- **Conteúdo.** Nenhum. Grafo idêntico; capturas equivalentes.
- **Aceite (automático).** Bounds fundidos × manifesto; colisores idênticos aos de L5; estimador:
  átrio ≤ 45 draws no ponto de referência e ≤ 60 na diagonal sudeste; GLB por sala ≤ 1,5 MB.
  **Manual:** medição em frame depois de reload limpo; programas medidos (o teto passa a ser esse
  número); **aparelho real nº 2**; com os números, confirmar D23.
- **Risco.** Alto (toca todas as camadas do kit). Mitigação: só as três salas atuais, sem conteúdo
  novo; o caminho instanciado só é apagado depois da medição.
- **Passagem.** Acabam os tetos temporários de ÁT-K1. Folga medida no HANDOFF.

### L7 — Materiais e memória

- **Objetivo.** Cor certa e a conta de memória fechada.
- **Escopo.** M30, M45 (duas malhas por peça); AS-S4; AS-L3, AS-L5; C3, C5, C7; regra 26. Arquivos:
  `materials.mjs`, `lib/glb.mjs`, `bake.mjs` (KTX2; mídia no portão), `historicalVolleyballs.mjs`,
  `src/engine/materials.ts`, `materialSpec.ts`, `RoomWallArt.tsx`; `test-materials.ts`.
- **Conteúdo.** Madeira e lona neutras com os tints recalculados (primeiro sem mudar nada, com prova
  por ΔE; depois reafinados: navy azul sob luz quente, nogueira com valor, maple mel); realocação de
  VRAM; KTX2 em materiais e mídia; bolas de 1964, 1998 e 2008 tesseladas na malha de mão; pisos
  neutros; soleiras e molduras na biblioteca; clearcoat das portas; mata-borrão.
- **Aceite (automático).** Textura por trio ≤ 45 MiB pelo estimador; ΔE dentro da tolerância no
  passo de equivalência; nenhuma superfície grande com luminância abaixo de 0,03; folga gomo ×
  núcleo. **Manual:** aceite visual das três salas; memória em aparelho.
- **Risco.** Médio/alto (transcoder; ferramenta de compressão no bake).
- **Passagem.** Daqui em diante, textura e mídia novas têm orçamento.

### L8 — Ler a casa

- **Objetivo.** O jogo dá informação legível sem apertar `E`, e toda afirmação aponta para um fato.
- **Escopo.** M36a, M24a, M11 (`claims`), M35 (`askAbout`). Arquivos: `museum.ts`, dicionários,
  novo `facts.bank.ts`; `RoomText.tsx`, `RoomSignage.tsx` (atlas R8), `gpuWarmup`; `Devices.tsx`
  (`R` com mira); `parts/holyokeDecor.mjs` (quiosque), `interpretive.mjs`.
- **Conteúdo.** Placa (manchete e uma frase) nas 12 peças; etiquetas de até 40 palavras e fichas de
  até 45, escritas da tabela de `claims`; categoria de proveniência nas 12 fichas; o quiosque em três
  folhas; legendas de mídia em pt-BR; mural declarado «ilustração autoral»; créditos do friso
  legíveis; `doc-filipino-bomb`, `doc-count-doesnt-close`, `doc-proof-holyoke`; fatos das quatro
  bolas; `askAbout`; aviso de ficção na tela "Sobre".
- **Aceite (automático).** `test:signage`: toda peça com placa a ≤ 1,5 m, nenhuma superfície de
  leitura em branco na Holyoke; `wall-claim-single-publisher` e `label-without-claim` sem erro;
  `validatePacing` por palavras, nas duas línguas; +1 draw por sala. **Manual:** as placas a 1,2 m.
- **Risco.** Baixo/médio (prontidão do atlas no aquecimento).
- **Passagem.** Dívida de superfícies em branco só no saguão (L9).

### L9 — Planta do saguão

- **Objetivo.** O átrio com cada objeto no lugar e com função, antes de a luz ser afinada.
- **Escopo.** 4.7b; frente 7; ÁT-F1, F3, F4, H1, H2, K2; AS-L2; M7b (folheto), M26 (a água da
  escada). Arquivos: `museum.ts`, `kit.mjs` (lambri na casca), `parts/atriumDecor.mjs`,
  `atriumFurnishings.mjs`, `interpretive.mjs`, `openings.mjs`; `public/textures/media/` (os dois SVG
  redesenhados, texto no dicionário); `validate.ts` (salas `deferred`).
- **Conteúdo.** A planta de 4.7b; cinco tapumes com aviso e olho mágico; a entrada com porta de
  enrolar e a fresta de lanterna; a escada de serviço gradeada; a grade do elevador com placa; a
  dedicatória; a parede de orientação com seis selos; as plaquetas da mesa de toque; o púlpito com
  «Como ler este museu»; recepção (folheto → aba Planta; livro de visitas; achados e perdidos);
  balde e goteira; cordas com colisão; a porta de serviço com placa; a planta de parede do
  escritório redesenhada.
- **Aceite (automático).** `placement-without-role` com zero avisos; `room-overlap` com as pegadas
  de 5.1; dedicatória com linha de visão de 4 a 8 m; nenhum móvel nas faixas dos vãos; a cápsula não
  atravessa cordas; save antigo ganha a aba Planta. **Manual:** a primeira vista da porta do
  escritório; aceite visual.
- **Risco.** Médio (muito objeto movido).
- **Passagem.** Layout congelado: é contra ele que a luz será afinada.

### L10 — Luz

- **Objetivo.** O apagão é apagão, o quadro liga a luz de serviço, e religar uma sala é um momento.
- **Escopo.** M17, M18 (essenciais), M9 (ÁT-A6 a, b); 4.7. Arquivos: `RoomLighting.tsx`,
  `galleryLightRig.ts`, `powerControlLightRig.ts`, `power.ts`, `materials.ts`, `kitPart.ts`,
  `RoomWallArt.tsx`, `RoomText.tsx`, `PowerControls.tsx`, `audio.ts`, `src/scenes/MuseumScene.tsx`
  (pool 6 + 2; sem `ambientLight`).
- **Conteúdo.** Estágios `dark` e `service` nas três salas (`house` declarado, sem gatilho); lista de
  emergência; quadros com lente vermelha → verde, alavanca, estalo e cascata de 1,2 s; alvos de 4.7;
  placas emissivas de porta; quadro do átrio assentado; «Quadro de serviço»; fala única para
  `legacy-pre-L10` («O que acendeu aí foi a luz de serviço. A geral mesmo é a do plinto, e essa não
  acende desde a obra.»).
- **Aceite (automático).** Sem energia: nada emissivo fora da lista; forro abaixo do limiar em
  `service`; slots constantes; a luz da sala atual não muda ao abrir a porta; iluminância mínima em
  toda peça. **Manual:** dez pontos nos dois estágios; o par "sala acesa olhando sala escura pela
  porta"; programas iguais depois de reload limpo; aceite visual.
- **Risco.** Médio; muda o que está no ar (D9).
- **Passagem.** `house` espera a chave do plinto.

### L11 — Medalhas e luz geral

- **Objetivo.** As três medalhas, o plinto de verdade e o maior momento do jogo: o teto do átrio.
- **Escopo.** M7b, M23, M34, M26 (poço), M17 (`house`). Arquivos: `schema.ts`, `museum.ts`,
  `store.ts`; novos `src/engine/Pickups.tsx`, `socketHost` em `Devices.tsx`; `Journal.tsx` (aba
  Coleção); `parts/atriumDecor.mjs` (plinto, vitrine do Fundador), `atriumFurnishings.mjs` (anel),
  `holyokeDecor.mjs` (caixa do lacre), `officeProps.mjs` (chapéu).
- **Conteúdo.** Página II do Livro (`doc-three-medals`, concedida ao virar a página) e
  `porter-livro-page`; a medalha do chapéu; os dois lacres (pedem a Posse); `atrium-plinth`; a chave
  geral (segurar; pede `power:atrium`); a sequência dirigida da luz geral; a plataforma com prompt e
  `deferred` («A bomba está trabalhando. Leva horas.»); a vitrine do Fundador; a linha 4 da Helena.
- **Aceite (automático).** `test:plinth` (ordem, parcial, recarga); lacre só rompe com o conjunto e
  a Posse, e o prompt nomeia o que falta; estimador dentro do teto com o plinto (classe herói);
  `test:speech-coherence` com as medalhas em qualquer ordem. **Manual:** o plinto nos quatro estados;
  a luz geral da porta do escritório e do centro; aceite visual.
- **Risco.** Médio na afinação. Plano B da cascata: subida suave.
- **Passagem.** Única promessa datada no caminho: a plataforma.

### L12 — Caixa-forte do Fundador (a Reabertura)

- **Objetivo.** O final da história: esperar a bomba, descer, ler, subir, assinar, amanhecer.
- **Escopo.** M38, M24b, M25, M36b, M26, M33 (céu). Arquivos: `museum.ts` (sala `vault`), novo
  `src/engine/lift.ts`, `PlayerController.tsx` (`relocatePlayer`), `radioCall.ts` (zona sem rádio),
  `Journal.tsx`, `Notebook.tsx` (leitor do livro), `Hud.tsx`; novo `parts/vaultDecor.mjs`; casca
  `service`.
- **Conteúdo.** "Esperar a bomba" (corte de tempo); a plataforma; a sala de 5.8; o livro de tombo
  gerado, com a carta na primeira folha; números de tombo nas fichas; `termo-reabertura`; o epílogo
  (Anexo B.8) e o corte «Semanas depois»; o segundo recado do Otávio; a linha de proveniência nas
  placas; `porter-pump-done`, `porter-after-vault`.
- **Aceite (automático).** Do título à Reabertura por qualquer ordem, com e sem rádio; recarregar no
  meio da espera, na caixa-forte, antes e depois de assinar retoma certo; da caixa-forte sempre se
  volta; `room-without-warm-path` sem erro; a lista da Helena fica toda riscada; nada se desliga
  depois. **Manual:** percurso completo nas duas línguas e no toque; duas pessoas novas (8.10).
- **Risco.** Médio. Plano B (D10): a caixa-forte sobe dentro do anel, com o mesmo grafo.
- **Passagem.** A história tem fim. Nenhuma promessa datada no caminho de nenhum termo.

### L13 — Átrio, acabamento

- **Objetivo.** O saguão à altura do escritório.
- **Escopo.** 4.3 (ordens 4 a 8 e 11), M46, M25 (livro de visitas), regra 25. Arquivos:
  `parts/atriumDecor.mjs`, `atriumFurnishings.mjs`, `interpretive.mjs`, `bake.mjs` (oclusão).
- **Conteúdo.** Disco do piso com UV polar; recepção com estofado, monitores e folhetos certos;
  lounge e sofá em veludo; banners de pano; vitrine do Fundador montada; biombos e console;
  sombra de contato; desgaste; colisores do lounge; retoque das chaves de luz K2 e K4.
- **Aceite.** Apoio intra-receita; programas iguais depois de reload limpo; aceite visual.
- **Risco.** Médio (a variante de programa da oclusão; cortável, 6.6).
- **Passagem.** O saguão está pronto; a Holyoke é a única sala da casa ainda com modelos de rascunho.

### L14 — Holyoke, heróis

- **Objetivo.** Os heróis da ala à altura do escritório.
- **Escopo.** 4.4 (ordens 2 a 13), 4.4c; H-15, H-16, H-17, H-30, H-31, H-32, H-47, H-48; D20, D21,
  D22. Arquivos: `kit.mjs`, `parts/holyokeDecor.mjs`, `materials.mjs`, `bake.mjs`, `museum.ts`.
- **Conteúdo.** Spalding com couro próprio, carimbo e cadarço; vitrine corrida por vão, recheio como
  dado; traje com forma de roupa, junto do poste; rede no eixo da quadra, com barriga e lâmina de
  colisão; impressos com capa e berço (páginas compostas pelo museu até haver scan); câmara em
  borracha, nicho à altura da mão; linhas da quadra em tinta; murais acima do lambri; friso com
  recorte por foco; atalho com barra e placa.
- **Aceite.** `test:room-placement` da ala; detalhe opcional × `anchors`; `test:examine` de novo;
  kit ≤ 30.000; a cápsula não atravessa rede nem manequim; aceite visual.
- **Risco.** Médio (receitas de textura novas, dentro do orçamento de L7).
- **Passagem.** A bíblia de assets está validada em três salas: é a régua das alas.

### L15 — Informação e colecionáveis

- **Objetivo.** Tudo o que o banco de fatos tem para a casa original ganha lugar.
- **Escopo.** M37, M19, M6b (tranca de distintivo), M9 (retomada). Arquivos: `museum.ts`,
  dicionários, `Devices.tsx`, `Containers.tsx` (gavetas por nó), `Journal.tsx` (álbum),
  `officeProps.mjs` (LEDs; cortiça).
- **Conteúdo.** Álbum e 12 figurinhas; bancos de escuta da Holyoke e do lounge; distintivo `indoor`
  e a gaveta QUADRA (folhas 03 e 04); carrinho e quadro de cortiça; `doc-morgan-stagg`; a moeda; o
  atril do "destaque do curador"; resumo de retomada.
- **Aceite (automático).** Álbum conferido contra o banco; nenhuma curiosidade de uma fonte em placa
  (já garantido por L8); `test:radio` (retomada; `askAbout` uma vez).
- **Risco.** Baixo.
- **Passagem.** A casa original está completa em conteúdo; faltam som, ajustes e toque.

### L16 — Som, ajustes e toque

- **Objetivo.** A tempestade se ouve, o escuro tem controle de brilho, a interface tem acabamento.
- **Escopo.** M18, M27; ÁT-B6, ÁT-J3, H-28, H-37, H-52. Arquivos: `audio.ts`, leitor de
  `RoomData.audio`, `PlayerController.tsx`; novo `ui/Settings.tsx`; `MuseumApp.tsx`;
  `MobileControls.tsx`; `styles/museum.css`.
- **Conteúdo.** Chuva em três intensidades (segue o relógio), goteira, trovão, bomba; música no
  clique da luminária; a tela de ajustes de 8.6 e o modo Visitante; legendas de ambiente; passe de
  arte da interface (caderno, planta, painel de exame, título); limpeza dos avisos de console
  (`THREE.Clock` depreciado; X4122).
- **Aceite.** Regras puras dos ajustes; lint de contraste; **aparelho real nº 3**: o jogo até a
  Reabertura num Android médio e num iPhone, em paisagem.
- **Passagem.** A casa original está pronta.

### L17 — Molde da ala

- **Objetivo.** Tudo o que as alas pedem do motor, de uma vez, sem conteúdo novo.
- **Escopo, em duas fatias.** (a) M13b, M16, M28 (vizinha sem peças no tier baixo), M15 (travessias
  derivadas). (b) M6c, M8, M20, M43, M17 (zonas), M18 (superfície de passo). Arquivos: `roomLod.ts`,
  `bundleCache.ts`, `materials.ts`; novo `ui/RitualPanel.tsx`; `LockPanel.tsx`; `Devices.tsx`;
  `Journal.tsx` (fios); `transitionDoorTopology.ts` (porta com tranca de condição).
- **Conteúdo.** Nenhuma sala. Os cinco fios entram como dado, incompletos («n de m — falta ala em
  montagem»); o quadro de cortiça ganha os cinco barbantes.
- **Aceite (automático).** Grafo idêntico, salvo os fios (aditivo); nunca mais de três salas com
  detalhe residente; redutores puros dos painéis e dispositivos; bundle por caminho. **Manual:**
  memória volta à linha de base depois de uma volta pelo prédio.
- **Risco.** Alto (descartar recursos é a causa clássica de "fica mais lento a cada volta").
- **Passagem.** O molde da ala (dados, receitas, textos, testes) fica documentado no HANDOFF.

### L18 a L22 — As cinco alas

Cada lote segue as três fatias de 5.1 (desenho; motor, se preciso; conteúdo). Comum a todos:
conteúdo da ficha da ala (seção 5); `termo-ala-<w>`; a pasta na caixa-forte; a linha na página da
Helena; o selo na parede de orientação; a prova de etiqueta; os nós dos fios; 2 figurinhas; 1 banco.
Aceite comum: a fatia de conteúdo não toca `src/` fora de `src/content/`; `facts:capture` da ala em
dia; `validateAdditive` contra o lote anterior; o robô assina o termo da ala nas 500 ordens; par
átrio + ala dentro do estimador; teste de farol do quadro; aceite visual; playtest.

| Lote | Ala | O que o lote prova (portão herdado de agosto) | Aceite próprio | Risco |
|---|---|---|---|---|
| L18 | Paris | acrescentar uma sala é editar dado e assar | conta-se a mesa e a caixa abre; nenhuma chave diz a quantidade junto do significado; `reciprocalPairs` passa a 4 | médio |
| L19 | Tóquio | um objeto achado aqui abre conteúdo em outra sala | o distintivo `beach` abre a gaveta PRAIA e a gaveta de areia de Paris; a vista baixa revela a tampa sem lanterna; duas zonas de luz com seis slots | médio |
| L20 | Ferro e Areia | dois climas numa sala; a ferramenta; ler em vez de fazer conta | quem digita o ano do título mundial erra e a escada leva ao dossiê; a manivela cataloga por três vistas; o carrinho tem os dois usos; nenhum número em camisa sem fonte | médio |
| L21 | A Reescrita | entender em vez de lembrar | a mesma sequência de oito ralis dá dois placares; nenhuma tranca digitada; a caixa abre por ritual (com fonte) ou por lacre | baixo/médio |
| L22 | Global | fechar um fio exige cruzar o prédio | os cinco fios fecham e ficam gravados; o estojo aceita só a combinação certa; `test:locks` conta as faixas da corda; o pódio se atualiza editando um array; nenhum fato vigente sem `asOf` | médio |

### L23 — Mezanino

- **Objetivo.** Ver de cima o que se andou; a quarta disciplina.
- **Escopo.** M22, M38 (elevador), M37 (pontos altos). Arquivos: `kit.mjs` (portal com peitoril e
  altura), `portals.ts`, `roomLod.ts` (tier distante), `MuseumMap.tsx` (piso), `validate.ts`,
  `test-navigation.ts`.
- **Conteúdo.** A sala de 5.7; a grade que o Jorge solta; `snow` → gaveta NEVE; escada de mão e
  pontos altos; cadernos de campo; parede de créditos com o aviso de ficção; a luneta.
- **Aceite.** Rotas com cota; a balaustrada segura a cápsula; par átrio + mezanino ≤ 100 draws pelo
  estimador; o elevador sempre volta.
- **Risco.** Alto. Plano B (D25): anexo térreo, com o mesmo grafo.
- **Passagem.** Só falta o termo final.

### L24 — Encerramento

- **Objetivo.** O 100%: a última assinatura sobe a porta da rua para o curador.
- **Escopo.** M28, M29; a sala `lodge`. Arquivos: novo `parts/lodgeDecor.mjs`; `renderQuality.ts`;
  gerador do modo leitura.
- **Conteúdo.** `termo-encerramento` e a sequência do Anexo B.13; a portaria (5.9); tiers de
  qualidade; modo leitura; o livro de visitas com o resumo final; a lista de revisão anual (fatos
  com `asOf`, listas datadas, fontes que mudam de endereço).
- **Aceite.** O checklist da seção 10 inteiro; validador em modo `--final` (zero `deferred`, zero
  `knownDebt`); o robô do título ao termo de encerramento com o corpus de todos os lotes;
  **aparelho real nº 4**; duas pessoas novas, uma no desktop e uma no celular.
- **Passagem.** HANDOFF final: o que é manutenção.

---

## 10. Checklist "100% jogável", riscos e pendências

### 10.1 A definição de pronto do jogo inteiro

Itens marcados **(manual)** não têm portão automático: têm responsável (o dono) e roteiro no plano do
lote, e o resultado fica no HANDOFF.

**Roteiro**
- [ ] `simulateProgress` alcança os oito termos; o roteiro em níveis impresso bate com a seção 2.4.
- [ ] `test:playthrough` termina no termo de encerramento pela rota canônica, por 500 ordens
      embaralhadas, pelo jogador preguiçoso e pelo que pula caderno, rádio e lanterna.
- [ ] O corpus de saves de todos os lotes (L1 a L24, mais a produção de hoje) carrega, e nenhum
      termo assinado se perde nem item riscado desrisca.
- [ ] Zero `deferred`, zero `knownDebt`, zero dica que aponte para algo sem interação.
- [ ] Depois de cada termo, toda ação continua disponível (R5).

**Espaço**
- [ ] Todo interativo (peça, container, gaveta, quadro, pickup, soquete, chave geral, púlpito,
      plataforma, porta) tem um ponto de pé ligado à entrada da sala, dentro do alcance e fora do
      volume do próprio alvo.
- [ ] De toda sala se volta ao átrio; nenhuma porta de mão única é a única saída.
- [ ] Nenhuma peça ou móvel flutua, afunda ou atravessa (`test:room-placement` em todas as salas).

**Verbo**
- [ ] Todo detalhe obrigatório é alcançável (peça na mão: ≥ 4% das orientações, ≤ 300 px num eixo; exame no lugar: até duas trocas de vista, nunca na vista inicial); nenhum nasce
      visto; a peça nunca fica sob o painel, em 1280 × 720 nem em 844 × 390.
- [ ] Toda tranca e todo ritual têm cinco degraus de dica, e o último só sai com pedido.

**Texto e informação**
- [ ] Nenhum objeto visível sem interação, texto ou resposta (`placement-without-role`).
- [ ] Toda peça tem placa legível no mundo, etiqueta de até 40 palavras e proveniência declarada.
- [ ] Nenhum numeral-código fora da chave autorizada; nenhum texto que envelhece.
- [ ] Todo fato usado como código tem captura válida de dois grupos de publicadores; todo fato de
      placa tem dois publicadores.
- [ ] As 87 curiosidades do banco têm lugar no jogo ou estão marcadas "só com segunda fonte".
- [ ] pt-BR e inglês completos, incluídas as legendas de mídia; nenhum texto assado em imagem.

**Estado**
- [ ] Recarregar em qualquer ponto (no meio de uma chamada, da drenagem, de uma assinatura) retoma
      certo; nenhum efeito repete.
- [ ] Nunca mais de três salas com detalhe residente; a memória volta à linha de base depois de
      uma volta pelo prédio.

**Luz e arte**
- [ ] Sem energia, nada emissivo além da lista de emergência; a lanterna nunca alcança o teto do
      átrio; a luz geral só existe depois da chave do plinto.
- [ ] Orçamentos por dado, dentro do teto em toda sala e em todo par de salas ligado por porta:
      draws, triângulos, programas, VRAM por trio, mídia por sala, GLB por sala, bundle por caminho.
- [ ] Três vistas por asset nas folhas de contato, com o manifesto de capturas em dia.

**Plataformas e acesso**
- [ ] Tela de ajustes com brilho, texto, clarões, movimento, legendas de ambiente e modo Visitante.
- [ ] Foco preso nos painéis; exame por teclado; contraste AA.
- [ ] O jogo inteiro jogado num Android médio e num iPhone, em paisagem, sem a aba morrer.
- [ ] Modo leitura com todo o texto do museu.

**Publicação**
- [ ] `npm run check` verde; deploy em produção; fumaça feita; HANDOFF final escrito.

**Gente**
- [ ] Duas pessoas novas terminam o jogo sem ajuda externa, repetem fatos verdadeiros e sabem dizer
      o que o Otávio pediu.

**Acrescentados na revisão**
- [ ] Todo termo e a chave geral se assinam pelo botão de toque (segurar, ou tocar e confirmar).
- [ ] O perfil "pula tudo" (sem caderno, sem rádio, sem lanterna) vê os oito fechos de termo e o
      epílogo; `test:speech-coherence` verde nas 500 ordens.
- [ ] Os cinco fios fecham, ficam gravados e nunca reabrem; o estojo aceita só "seis bolas, três
      moldes".
- [ ] Nenhuma sala sem caminho de aquecimento; nenhum texto cita objeto ausente do build (R7).
- [ ] Toda chave de acervo tem `claims`; nenhuma parede com fato de um publicador; nenhum fato
      vigente sem `asOf`; nenhuma pessoa viva com uma fonte só; as seis categorias de proveniência em
      toda peça, e a soma do livro de tombo bate com o conteúdo.
- [ ] Textura por trio de salas ≤ 45 MiB, e draws e triângulos por sala e por par de porta dentro do
      teto, pelo estimador. **(manual)** Medidos em frame e em aparelho real.
- [ ] O aviso de ficção aparece na tela "Sobre", na parede de créditos e no modo leitura.
- [ ] **(manual)** Aceite visual do dono em cada sala, contra a imagem-alvo.

### 10.2 Riscos

| Risco | Efeito | Resposta |
|---|---|---|
| A ordem com fundações antes do final (D26) adia a Reabertura para o décimo segundo lote | o projeto pode parar antes do fim da história | L3 e L4 já entregam um jogo com final assinável e o verbo funcionando; a alternativa (final primeiro) está em D26, com o custo dito |
| L2 e L3 instalam muita infraestrutura | atraso do primeiro final | L1 sai antes, em um dia; L2 não tem conteúdo; o robô e o corpus pegam regressão cedo |
| Tetos temporários do átrio até L6 (58 lotes, 102 draws) | queda de quadros no celular por três lotes | só duas exceções, declaradas; medição em aparelho real em P0 diz se o teto de 100 é real |
| A fusão do kit não entrega os draws estimados | átrio acima do alvo móvel | medir em L6 antes de apagar o caminho instanciado; o atlas de texto e o lambri na casca reforçam |
| KTX2 (ferramenta no bake, transcoder no runtime) | atraso em L7 | começa pelos materiais (ganho maior); a mídia entra em seguida; sem KTX2 a catraca de textura impede mídia nova |
| Triângulos: o átrio final fica no alvo móvel sem folga (≈ 88k) | queda de quadros com porta aberta | duas malhas por peça, folha de porta em 900 triângulos, vizinha sem peças no tier baixo |
| Residência de salas (M13b) | "fica mais lento a cada volta" | entra sozinha em L17, antes de qualquer ala, com as salas atuais |
| A luz geral e a descida não se validam sem ver | o maior momento sai morno | a flag decide o estado; animação e luz são apresentação com plano B; o forro é consertado em L5, antes |
| `relocatePlayer` e a sala fora da planta | a caixa-forte atrasa a Reabertura | contrato de aquecimento da porta; D10, plano B, mesmo grafo |
| Fontes que não aparecem (antena, televisão, número da camisa, Kaizuka, console, F88–F93) | sala sem a tese prevista | a versão padrão de cada sala já é a sem fonte (7.7) |
| Fonte que bloqueia robô de captura | lote de ala travado | `facts.manual.ts`; as capturas de código são feitas em P0 |
| Carga de leitura somada; doze exames no caminho da Reabertura | cansa | `validatePacing` por palavras; playtest em L4 e L12; não há alternativa "com ressalva" (o grafo não a permite): se cansar, a correção é no ritmo do exame |
| Os scripts de `scripts/audit/` têm o caminho do repositório fixo | só rodam nesta máquina | **fechado em P0 (2026-10-04):** caminho relativo, entradas `npm run audit:*` e o `test:docs` reprovando caminho absoluto; os relatórios e as capturas já estão no repositório |

### 10.3 Pendências honestas

1. Nada deste plano foi jogado. Coordenadas, custos de draw e de memória são estimativa até o lote
   que os mede.
2. As fontes foram abertas em 2026-10-03, com citações trocadas por paráfrase; os quatro códigos são
   recapturados em P0.
3. O nome do Fundador é fictício e precisa ser conferido contra nomes reais do vôlei.
4. Seis capturas da Holyoke escura não foram revisadas uma a uma (`e06`, `e08`, `e10`, `e12`, `e13`,
   `e14`).
5. As plantas das cinco alas, do mezanino e da portaria estão descritas, não medidas: a fatia 0 de
   cada lote as fixa. Os textos de etiqueta (até 40 palavras) e de ficha das alas são escritos nessa
   fatia, a partir das tabelas de peças e de `claims` deste plano.
6. O vôlei de neve continua com a pesquisa mais fina das quatro disciplinas.
7. Onze programas "sem nome" do `__museumPrograms()` não foram identificados.
8. Os alvos móveis (45 draws, 90k triângulos, 45 MiB) vêm de documento; a medição de P0 pode mudá-los.
9. A mídia de parede das alas não tem lista de imagens nem de licenças: cada fatia 0 a produz
   (imagem, autor, licença, instituição), e mídia sem licença conferida não entra.
10. O inglês não tem rascunho neste plano: é escrito no plano de cada lote, com revisão de voz (as
    piadas do Jorge não traduzem direto).

---

## Anexo A — Ids

| Tipo | Ids |
|---|---|
| Salas (`EraId`) | `office`, `atrium`, `holyoke`, `vault`, `paris`, `tokyo`, `iron-sand`, `rewrite`, `global`, `mezzanine` (novo), `lodge` (novo) |
| Termos | `termo-posse`, `termo-reabertura`, `termo-ala-paris`, `termo-ala-tokyo`, `termo-ala-iron-sand`, `termo-ala-rewrite`, `termo-ala-global`, `termo-encerramento` |
| Flags | `posse-signed`, `house-lights`, `basement-drained`, `reopened`, `wing-<sala>-delivered` (5), `wing-<sala>-open` (5), `inventory-closed`, `floorplan`, `clock-set`, `legacy-pre-L9`, `legacy-pre-L10` |
| Medalhas | `curator`, `founding`, `lineage` |
| Distintivos | `indoor`, `beach`, `sitting`, `snow` |
| Ferramentas | `service-key` (consumida), `crate-dolly`, `step-ladder` |
| Fios | `ball`, `net`, `rules`, `beach`, `sitting` (Anexo F.1) |
| Trancas da casa | `office-drawer` (conhecimento), `office-safe` (ferramenta), `holyoke-hero-seal`, `atrium-founder-seal`, `holyoke-conference-box` (lacres), `founders-plinth` (medalhas), `registrar-indoor`, `registrar-beach`, `registrar-sitting`, `registrar-snow` (distintivo) |
| Trancas das alas | `wing-<sala>-door` (condição: pasta aberta), `paris-statutes-box`, `paris-beyond-europe`, `tokyo-trophy-punch`, `ironsand-coach-file`, `ironsand-locker-crate` (ferramenta), `ironsand-kiraly-locker` (lacre), `rewrite-congress-case`, `rewrite-beach-press-file`, `rewrite-paralympic-drawer`, `ironsand-paralympic-drawer`, `paris-rules-dossier`, `paris-sand-drawer`, `global-beach-trunk`, `global-ball-casts`, `mezzanine-lift` |
| Dispositivos novos | `office-answering-machine`, `office-clock`, `atrium-lectern` (mesa de assinatura), `atrium-plinth` (soquetes), `atrium-main-switch`, `atrium-plinth-lift`, `reception-leaflets`, `reception-guest-book`, `reception-lost-found`, `office-hat`, `vault-folder-<sala>` (5), `mezzanine-lift` |
| Sequências dirigidas | `seq-posse`, `seq-house-lights`, `seq-pump`, `seq-reopening`, `seq-night-shift`, `seq-wing-<sala>` (5), `seq-closing` |
| Documentos novos da casa | `doc-otavio-tape`, `doc-otavio-tape-2`, `doc-otavio-handover` (alias de `doc-predecessor`), `doc-termos`, `doc-three-medals`, `doc-label-proof-office`, `doc-accession-ledger`, `doc-sheet-06-absences`, `doc-sheet-03-basement`, `doc-sheet-04-electrical`, `doc-sheet-01-site`, `doc-sheet-02-mezzanine`, `doc-sheet-05-roof`, `doc-proof-holyoke`, `doc-filipino-bomb`, `doc-count-doesnt-close`, `doc-morgan-stagg`, `doc-visitor-leaflet`, `doc-lost-and-found`, `doc-otavio-crates`, `doc-otavio-fieldbooks` |
| Receitas novas ou refeitas | 4.4d |

Aliases de save (M2): `doc-predecessor` → `doc-otavio-handover`. Nenhum outro id existente muda.
Saves anteriores: o migrador de L9 dá `floorplan`; quem tem a gaveta aberta ganha a chave pelo
gatilho; peças catalogadas sem girar continuam catalogadas.

---

## Anexo B — Rascunhos de texto (pt-BR; o inglês é escrito no plano de cada lote)

Regras: nenhuma chave imprime um código fora da chave autorizada; nenhuma fala fixa diz hora
(`{hora}` é a ficha do relógio); cada fala de rádio cabe em 130 caracteres por chave (a barra separa
chaves); toda fala declara `mentions`.

### B.1 Chamadas do Jorge na casa original

| Id | Quando | Caduca quando | Falas |
|---|---|---|---|
| `porter-hello` | `power:office` (sempre devida) | nunca | «Curador? É o Jorge de novo, da portaria. Câmbio.» / «Vi no painel que a luz do escritório voltou. A tempestade desarmou os quadros do prédio inteiro.» / «O Otávio se aposentou hoje. Pegou o ônibus antes de a estrada fechar e deixou tudo com você.» / «Aqui eu tenho o painel do alarme: toda vitrine, gaveta e porta desse prédio acende uma luzinha pra mim.» / «O relógio aí parou com a luz: acerta. O subsolo alagou; hoje ninguém desce. Pega o rádio na mesa. Câmbio, desligo.» |
| `porter-atrium-panel` | `power:office`, átrio sem energia | `power:atrium` | «O quadro do saguão fica do outro lado, em linha reta saindo daí. Procura a luzinha vermelha.» / «Saguão, átrio: é o mesmo lugar. A placa diz átrio; eu digo saguão. Câmbio.» |
| `porter-notebook-reminder`, `porter-radio-taken` | como hoje | como hoje | como hoje |
| `porter-machine-reminder` | recado não ouvido e o jogador já voltou do átrio | `doc-otavio-tape` | «Tem uma luz de recado piscando no ramal do escritório. Deve ser coisa do Otávio. Câmbio.» |
| `porter-atrium-service` | `power:atrium` | `power:holyoke` | L3: «Saguão no painel! A Ala 1 é a porta com placa, perto do quadro. O quadro dela fica na parede do outro lado. Câmbio.» · a partir de L10, antes: «Mas ó: isso aí é luz de serviço. A geral, a de cima, o Fundador pendurou no plinto.» |
| `porter-service-light` | `legacy-pre-L10`, com o átrio aceso | `flag:house-lights` | «O que acendeu aí foi a luz de serviço. A geral mesmo é a do plinto, e essa não acende desde a obra. Câmbio.» |
| `porter-holyoke-lit` | `power:holyoke` | as oito catalogadas | L3: «Ala 1 acesa. Agora é conferir, peça por peça. Câmbio.» · a partir de L4: «Ala 1 acesa. Agora é conferir: pega a peça, vira e lê o que o Otávio colou atrás. Câmbio.» |
| `porter-first-catalogued` | a primeira peça | as doze | «Uma vitrine abriu e fechou aqui no painel. Primeira conferida? Faltam… bom, faltam bastante. Câmbio.» |
| `porter-shortcut` | a porta de serviço aberta por dentro | nunca | «A porta de serviço abriu por dentro. Agora fica destrancada dos dois lados. Tá no meu painel. Câmbio.» |
| `porter-drawer-open` | gaveta aberta | cofre de ferro aberto | «A gaveta do Otávio abriu aqui no painel. Trinta anos e eu nunca vi o que tinha dentro. Tinha o quê?» / «Se for chave, é do cofre de ferro. Ele era assim: chave dentro de gaveta, gaveta dentro de data. Câmbio.» |
| `porter-legacy-drawer` | save antigo com a gaveta aberta | cofre de ferro aberto | «Olha de novo a gaveta do Otávio: o bilhete tinha uma chave presa. Câmbio.» |
| `porter-safe-open` | cofre de ferro aberto | posse assinada | «O cofre de ferro abriu. Esse é o cofre. A caixa-forte é a do Fundador, lá embaixo: não confunde.» / «Se tem livro aí, é o de termos. Termo se assina no púlpito do saguão, com a casa acesa. Câmbio.» |
| `seq-posse` (dirigida) | posse assinada | — | «A lâmpada do púlpito acendeu e apagou: assinou. O acervo é seu, curador. {hora}.» / L3 a L10: «O livro que a seguradora quer tá na caixa-forte, e o subsolo alagou. Hoje não se desce. Câmbio.» · a partir de L11: «A escada do subsolo alagou. O outro caminho é o plinto, e o plinto pede as três medalhas.» / «Era pra ser cerimônia amanhã, com discurso. Vai ser hoje, só nós dois. Câmbio.» |
| `porter-livro-page` | Livro lido, página II não virada (a partir de L11) | `doc-three-medals` | «Abre de novo o Livro de Termos. Aposto que tem página do Otávio que você não virou. Câmbio.» |
| `porter-seal-holyoke` | as oito da Ala 1 e a Posse | lacre rompido | «As oito vitrines da Ala 1 abriram e fecharam. O Otávio deixou escrito aqui: "conferiu tudo, rompe o lacre". Câmbio.» |
| `porter-seal-atrium` | as quatro do saguão e a Posse | lacre rompido | «As quatro bolas da mesa de toque, conferidas. O lacre da vitrine do Fundador é seu. Câmbio.» |
| `porter-first-socket` | um soquete | três soquetes | «Acendeu um soquete do plinto aqui no painel! Antes da obra o Otávio polia as três toda sexta. Câmbio.» |
| `porter-second-socket` | dois | três | «Dois. A água parou no segundo degrau da escada. A soleira da caixa-forte tá seca. Câmbio.» |
| `porter-third-socket` | três | `flag:house-lights` | «Três! A tampa do plinto destravou. Embaixo dela tá a chave geral. Fecha e olha pra cima. Câmbio.» |
| `seq-house-lights` (dirigida) | `flag:house-lights` | — | «ACENDEU! Tá tudo verde no painel! Desde a obra eu não via essa luz.» / «A bomba armou. E o motor da porta de enrolar voltou: mas eu só subo às nove, ordem da Helena.» / «Olha pra cima, curador. Aquele arco no teto é um saque. Câmbio.» (em L11, no fim: «A bomba leva horas. Hoje a plataforma não desce.») |
| `porter-pump-done` (parte de `seq-pump`) | `flag:basement-drained` | o jogador já desceu | «O painel diz que o poço secou. A plataforma do plinto destrava agora. Lá embaixo o rádio não pega. Câmbio.» |
| `porter-after-vault` | livro de tombo lido e sala = átrio | `flag:reopened` | «Voltou o sinal! E aí? …Não precisa contar. Pela demora, era coisa pra ler devagar.» / «Tá clareando na claraboia. A Helena chega cedo. O termo tá no púlpito. Câmbio.» |
| `seq-reopening`, `seq-night-shift` | `flag:reopened` | — | B.8 |
| `porter-wing-delivered` | `flag:wing-<w>-delivered` e sala = átrio | `power:<w>` | «Abriu a pasta? Tirei o tapume do painel: a porta da ala tá liberada.» / «O quadro vem lacrado: quem liga primeiro é o curador. Tradição do Fundador. Câmbio.» |
| `porter-first-badge` | o primeiro distintivo | nunca | «Acendeu uma luz verde numa gaveta do arquivo de mapas, aí no escritório. Eu não mexi em nada. Câmbio.» |
| `porter-roller-door` (`askAbout`) | `R` mirando a porta de enrolar | — | «Tô ouvindo seu passo daqui. Subi essa porta na manivela pra você entrar. Duas vezes na mesma noite, minhas costas não deixam.» |

Ar morto, por estado do céu: chuva, «(Nada. Só a chuva batendo na claraboia.)» (antes de L5: «(Nada.
Só a chuva.)»); depois da bomba, «(Nada. Parou de chover.)»; turno da noite, «(Nada. O prédio estala.)».

### B.2 Dicas em três alturas (rádio) e o que o prompt do objeto diz (sem rádio)

| Enquanto | Onde | O quê | Como | Prompt do objeto |
|---|---|---|---|---|
| caderno não lido **e** o jogador ainda não saiu do escritório | «Primeiro o caderno: a diretora, a Helena, deixou um na mesa.» | «Capa vermelha, do lado da luminária.» | «Aperta E nele e lê até a última página.» | «Caderno da Helena» |
| átrio sem energia | «O quadro fica do outro lado do saguão.» | «Luzinha vermelha, perto da porta com placa.» | «Caixa cinza na parede. Alavanca. Aperta E.» | «Quadro de serviço» |
| Ala 1 sem energia | «A Ala 1 tem quadro próprio, na parede do outro lado da sala.» | «Em frente à entrada, mais para a esquerda de quem entra.» | «Atravessa no escuro até o piloto vermelho. A lanterna dá conta.» | «Quadro de serviço» |
| gaveta fechada | «A gaveta do Otávio abre com um ano. Ele deixou recado na secretária do escritório.» | «O ano tá na Ala 1, no retrato do Morgan.» | L3: «Pega a moldura e inclina: tá na borda de baixo. Ou na gaveta de cima do arquivo ao lado.» (não «plaqueta»: a moldura modelada não tem uma, e o texto ao pé dela é o crédito da foto, com 1897; revisão de L1) · L4 em diante: «Pega o retrato e vira a moldura.» | «Gaveta do Otávio — trancada (um ano)» |
| chave na mão | «Chave do Otávio? É do cofre de ferro.» | «Canto do escritório, do lado das estantes.» | «Encosta e aperta E. A chave fica lá.» | «Cofre de ferro — precisa de chave» |
| Livro na mão, posse por assinar | «O termo se assina no púlpito do saguão.» | «O púlpito com a lâmpada acesa, perto do plinto.» | «Com luz nas três salas, segura o E até a pena parar.» | «Púlpito — Assinar: Posse» ou «falta luz em: [sala]» |
| falta a medalha do Curador | «O Otávio andava com a dele no chapéu, desde a obra.» | «O chapéu ficou no cabideiro, aí no escritório.» | «Pega o chapéu e vira: tá por dentro da fita.» | «Chapéu do cargo» |
| falta a da Fundação ou a da Linhagem | «Tá atrás de um lacre do Otávio.» | «Falta conferir: [as peças que faltam, pelo nome].» | «Com todas conferidas e a posse assinada, aperta E no lacre.» | «Lacre de conferência — falta: [peça]» ou «falta o termo de posse» |
| três medalhas na mão | «Plinto. Meio do saguão.» | «Três encaixes no tambor de latão.» | «Aperta E três vezes. Depois segura a chave, embaixo da tampa.» | «Plinto — n de 3 medalhas» |
| luz geral acesa, poço cheio | «A plataforma do plinto.» | «Dentro do anel.» | «Aperta E e espera a bomba.» | «Plataforma — a bomba está trabalhando. Esperar?» |
| poço seco, livro não lido | «A plataforma destravou. É descer.» | «Na caixa-forte: o livro grande, aberto na mesa.» | «Lê até a última folha.» (dita em cima: lá embaixo o rádio não pega) | «Livro de tombo — leia até a última folha»; ao subir sem ler: «o livro ficou por ler» |
| livro lido, reabertura por assinar | «O termo de reabertura, no púlpito.» | «O mesmo púlpito.» | «Segura o E até a pena parar.» | «Púlpito — Assinar: Reabertura» ou «falta: [o que falta]» |
| ala entregue, pasta fechada | «A obra entregou parede. A guia tá na caixa-forte.» | «Uma pasta do Otávio, sem lacre.» | «Desce pela plataforma e abre a pasta.» | «Pasta da Ala N» ou «lacrada: falta inaugurar a ala anterior» |
| ala sem energia | «O quadro da ala fica na parede do outro lado.» | «Piloto vermelho.» | «Atravessa no escuro.» | «Quadro de serviço» |
| tranca principal da ala fechada | a escada de 8.3 | | | a pergunta da tranca |
| falta peça da ala | «Falta conferir.» | «[a peça, pelo nome]» | «Vira, ou troca de vista.» | Acervo: «falta virar» |
| termo da ala por assinar | «No púlpito do saguão.» | «O mesmo.» | «Segura o E.» | «Púlpito — Assinar: Inauguração da Ala N» |
| fio incompleto | «Falta um nó desse fio.» | «[a peça ou o documento, e a sala]» | «Se for gaveta, pede distintivo.» | Acervo: «n de m» |
| dois fios fechados, mezanino fechado | «A grade do elevador, no canto do saguão.» | «Me chama de lá.» | «Aperta E na grade.» | «Grade do mezanino — fios fechados: n de 2» |
| falta gaveta do registrador | «Arquivo de mapas, no escritório.» | «A gaveta com a luz verde.» | «Aperta E.» | «Gaveta [disciplina] — falta o distintivo» |
| falta o estojo dos moldes | «Ala 6, junto da saída.» | «Seis bolas, três moldes.» | «Leva cada ficha ao molde em que a bola cabe.» | «Estojo — falta catalogar: [bola]» |
| tudo pronto para o Encerramento | «O último termo, no púlpito.» | «O mesmo.» | «Segura o E.» | «Púlpito — Assinar: Encerramento» ou «falta: [o que falta]» |
| nada pendente | «O Otávio dizia…», uma por visita | — | — | — |

A dica curta (Jorge impaciente) repete sempre o substantivo-alvo: «Saguão. Luz vermelha. Alavanca.»,
«Retrato do Morgan. Ala 1. Vira.», «Púlpito. Assina.».

### B.3 Passagem de acervo, folha 1 (`doc-otavio-handover`, na gaveta)

> «PASSAGEM DE ACERVO — FOLHA 1. Se você está lendo isto, achou o ano — o que significa que leu em vez de passar. Bom. A chave presa nesta folha é do cofre de ferro desta sala. Dentro dele está o que eu lhe devia em mãos: o Livro de Termos. Assine a posse quando a casa estiver acesa. O livro de tombo, o que a seguradora quer ver, não está lá: fica na caixa-forte do Fundador, sob o átrio, e para lá não há número nem chave, há caminho. Confira o acervo sem pressa: pegue cada peça, vire, leia a etiqueta que eu colei no verso. — O.»

### B.4 Livro de Termos (`doc-termos`; a página II é `doc-three-medals`, concedida ao virar)

> «TERMO DE PASSAGEM. Entrego o acervo do Museu do Voleibol, conferido até onde a chuva deixou. — Otávio»
>
> «TERMO DE POSSE. Recebo o acervo e a casa, acesa em suas três salas.» (a linha em branco)
>
> Página II, a partir de L11: «AS TRÊS MEDALHAS DO PLINTO. O Fundador mandou cunhar três, uma para cada parte desta casa, e o saguão só acende inteiro com as três no lugar. Tirei-as do plinto para a obra do piso. A do Curador anda desde então por dentro da fita do chapéu: o chapéu é do cargo, e agora o cargo é seu. A da Fundação está na Ala 1, na base da vitrine da bola de cadarço, atrás do meu lacre. A da Linhagem está no saguão, na vitrine do Fundador, atrás do outro lacre. Os lacres só se rompem depois da posse e com a parte conferida: as oito peças da ala; as quatro bolas da mesa de toque. Com as três assentadas, a tampa do plinto gira. Embaixo dela está a chave geral: luz, bomba e a plataforma. Eu sempre desci pela escada. Na planta escrevi "três medalhas?" porque o arquiteto jurou que a plataforma sobreviveria ao piso novo. Não testei. Teste você. — O.»
>
> «TERMO DE REABERTURA. Inventário conferido peça por peça, contra o livro de tombo. Luz geral restabelecida. O museu reabre dizendo o que cada coisa é.»
>
> «TERMO DE INAUGURAÇÃO — ALA [N] · [NOME]. Sala acesa. Oito peças conferidas, cada uma com o que é. Arquivo aberto.»
>
> «TERMO DE ENCERRAMENTO DO INVENTÁRIO. Seis alas, quatro disciplinas, cinco fios, um estojo de moldes. Nada ficou sem dizer o que é.»

### B.5 Secretária eletrônica (`doc-otavio-tape`; depois da Reabertura, `doc-otavio-tape-2`)

> «Aqui é o Otávio, o curador. O antigo, a partir de hoje. Estou gravando no aparelho da sua mesa porque a passagem era às seis, a estrada fecha com chuva e o último ônibus é o das cinco. A passagem de acervo está escrita, na gaveta de cima do armário alto. A gaveta abre com um ano: o ano em que o jogo deixou de se chamar Mintonette. Não vou dizer qual. Está na Ala 1, num retrato, e quem lê o que está escrito nas peças é exatamente quem eu quero que abra. O chapéu no cabideiro fica: não é meu, é do cargo. E uma coisa sobre o plinto do saguão, que é importante, porque com essa chuva o subsolo —»
>
> «[A gravação termina aqui. O visor marca 16:47.]»

A partir de L4, «o que está escrito nas peças» vira «o verso das coisas».

> Segundo recado (linha de volta, depois da Reabertura): «É o Otávio. A linha voltou, então a luz voltou, então você achou as três. Eu sabia que a plataforma aguentava. Não precisa ligar de volta: estou pescando. Só leia os versos. — O.»

### B.6 O livro de tombo (`doc-accession-ledger`): a carta é a primeira folha

> «Então a plataforma sobreviveu ao piso novo. Fico devendo um café ao arquiteto.
> Este é o livro de tombo. O Fundador abriu a primeira folha; eu escrevi as outras. Cada peça do museu tem uma linha: o número, o nome, a sala e o que ela é — original, peça de época, reconstrução, reprodução, réplica de manuseio, cenografia. A seguradora quer os números. Eu quero que você olhe a última coluna e some. [frase gerada da contagem real; na casa: «Há um original: a bola do Fundador. O resto nós fizemos, copiamos ou reconstruímos.»] Não é vergonha: da primeira bola não se conhece exemplar, o prédio de Holyoke queimou. Um museu que só mostrasse o que sobrou mostraria quase nada. Um museu que mostra o resto sem dizer o que é mostra uma mentira bem iluminada.
> A prova que você achou no cofre de ferro é a das placas novas. A Helena quer gente no museu; eu quis verdade nas etiquetas. As duas coisas cabem na mesma parede: são quarenta palavras e uma linha. Guardei a prova para a gráfica não imprimir sem a linha. Decidir agora é com você.
> Não assine aqui. Este livro é das peças. O termo se assina lá em cima, no púlpito, à vista do saguão.
> Nas pastas lacradas estão as guias de remessa da ampliação: deixei cada ala pronta em caixotes, aqui na reserva. O lacre de cada pasta cai quando houver parede.
> Só lhe peço uma coisa: continue declarando. — Otávio»
>
> Depois da carta, a tabela (gerada): tombo nº, peça, sala, categoria; e as somas em palitos.

### B.7 Folhas do projeto e a relação das ausências

| Onde | Documento | Rascunho |
|---|---|---|
| gaveta QUADRA | `doc-sheet-04-electrical` | «FOLHA 04/06 · ELÉTRICA. Cada sala tem o próprio quadro de serviço: luz baixa e tomadas. A chave geral (luz alta do átrio e bomba de recalque do subsolo) fica sob a tampa do plinto, e a tampa só gira com as três medalhas assentadas. Nota do arquiteto: "Manter, por exigência do curador." A lápis vermelho: "Exigência do Fundador. Museu não se acende com o dedo. — O."» |
| gaveta QUADRA (junto com a folha 04) | `doc-sheet-03-basement` | «FOLHA 03/06 · SUBSOLO. Escada de serviço, antecâmara, poço da bomba, plataforma sob o plinto, caixa-forte do Fundador. A soleira da caixa-forte fica bem acima do piso da antecâmara. A lápis vermelho: "Se alagar, alaga a antecâmara até o segundo degrau. A soleira fica seca. — O."» |
| gaveta SENTADO | `doc-sheet-02-mezzanine` | «FOLHA 02/06 · MEZANINO. Galeria alta sobre o átrio: vitrine da quarta disciplina, parede de créditos, depósito de montagem. Grade com trinco elétrico, comandada da portaria. A lápis vermelho: "Só se sobe depois de ter andado embaixo."» |
| gaveta NEVE | `doc-sheet-05-roof` | «FOLHA 05/06 · COBERTURA. Claraboia sobre o átrio. Um vidro trincou na obra; a troca ficou para depois da reabertura. A lápis vermelho: "Balde embaixo. O vidro trincado fica até a reabertura: é a prova de que choveu. — O."» |
| cofre | `doc-sheet-06-absences` | «FOLHA 06/06 · RESERVA TÉCNICA — RELAÇÃO DAS AUSÊNCIAS. A primeira bola. A rede do primeiro ginásio. Os estatutos de Paris. A lápis vermelho: "Caixa vazia com etiqueta certa também é acervo. — O."» |
| prateleira alta | `doc-otavio-fieldbooks` | «CADERNOS DE CAMPO. Trinta volumes, um por ano. No último, a última página: "Hoje entreguei o chapéu ao cabideiro. Amanhã ele é de outra pessoa. Só espero que leia os versos."» |

Acréscimos a B.7: a gaveta **PRAIA** passa a guardar `doc-sheet-01-site` («FOLHA 01/06 · AMPLIAÇÃO.
Cinco alas em volta do saguão, uma por era, entregues uma de cada vez. A lápis vermelho: "A areia de
Tóquio entra por último na obra: pesa. — O."»). A folha 03 (subsolo) fica na gaveta QUADRA, para ser
lida na primeira noite. Na reserva da caixa-forte, sob o caixote pesado, `doc-otavio-crates`:
«RELAÇÃO DOS CAIXOTES. Um por vitrine, numerados por ala. O que não tem original leva a etiqueta
escrita antes de fechar a tampa. — O.»

### B.8 O epílogo (`seq-reopening`) e a abertura do turno (`seq-night-shift`)

Sequência dirigida: não depende do rádio; corta qualquer chamada no ar; só conta como vista ao
terminar (recarregar no meio repete).

> A tela escurece por um segundo e meio. Uma linha: «8h55».
>
> Helena (legenda «Helena, a diretora — pelo rádio do Jorge»): «Curador? É a Helena! O Jorge me emprestou o rádio.» / «Ele disse que você acendeu o saguão sem mim. Era a minha cerimônia! …Tudo bem. Ficou lindo.» / «Ele leu o termo pra mim: "o museu reabre dizendo o que cada coisa é". Então a linha de baixo volta. Em todas as placas.» / «E a seguradora já tem os números de tombo. Liberado!»
>
> Jorge: «Nove horas, curador. Agora com motor: tô subindo a porta. Câmbio. E dessa vez eu não desligo.»
>
> A porta de enrolar sobe; a luz do dia entra pelo vestíbulo. Uma linha, sem créditos rolando: «Museu do Voleibol — aberto.»
>
> Corte. Cartão: «Semanas depois. Fora do expediente.» O jogador reaparece no escritório, à noite; a luz geral do saguão continua acesa; a porta de enrolar está baixada.
>
> Jorge: de L12 a L17, «Boa noite, curador. Turno da noite. A ampliação ainda é tapume: quando a obra entregar parede, eu aviso. Câmbio.» · a partir de L18, «Boa noite, curador. A obra entregou parede. A guia de remessa tá na caixa-forte, numa pasta do Otávio. Câmbio.»

### B.9 Textos do átrio

- **Dedicatória:** «O JOGO DESDE 1895 · MEMÓRIA EM MOVIMENTO» / «MUSEU DO VOLEIBOL» / «Um jogo
  inventado em 1895 para quem achava o basquete pesado demais. Aqui se diz o que cada coisa é. —
  Amadeu Lins, fundador»
- **Púlpito:** «COMO LER ESTE MUSEU. Leia a placa. Na mesa de toque e nas alas, pegue a peça. Vire: o
  que conta está no verso, numa etiqueta a lápis vermelho. O que cada peça é — original, reconstrução,
  réplica — está na ficha do seu caderno.»
- **Mesa de toque:** «A BOLA NA MÃO — PODE PEGAR. Estas quatro são réplicas, feitas para a mão.
  Pegue, gire, procure o verso. As bolas de cada época ficam nas alas.»
- **Vitrine do Fundador** (três etiquetas): «Amadeu Lins, professor de educação física, guardou a
  vida inteira o que o jogo deixava para trás. Abriu este museu com uma regra, que está na parede.»
  · «Peça nº 1 do livro de tombo: a bola com que ele dava aula.» · «O livro de tombo fica na caixa-forte
  do Fundador, sob este piso. Curadoria atual: —» (o traço é preenchido depois da Reabertura).
- **Lacre:** «LACRE DE CONFERÊNCIA. Só rompa depois de conferir todas. — O.»
- **Plinto:** «Plinto do Fundador — faltam três medalhas.»
- **Parede de orientação:** «SEIS ERAS, SEIS ALAS» e os seis nomes; «você está aqui».
- **Tapume:** «ALA 2 · PARIS · EM MONTAGEM».
- **Entrada:** antes da Reabertura, «Entrada principal. Abre às nove.»; depois, no turno da noite, «Fechado. Abre às nove.»; em L24, aberta.
- **Caixa de doação:** «O museu é gratuito. A memória, não.»
- **Folheto** (`doc-visitor-leaflet`): «MUSEU DO VOLEIBOL — FOLHETO DE VISITA. Um átrio, uma ala e
  uma ampliação em obra. Programa da reabertura: às nove, abertura das portas; em seguida, a
  cerimônia das três medalhas no plinto, com a luz geral acesa pela primeira vez desde a obra.»
- **Achados e perdidos** (`doc-lost-and-found`, letra do Jorge): «ACHADOS E PERDIDOS. Uma joelheira
  esquerda. Um apito sem bolinha. Um ingresso do Maracanã de 26 de julho de 1983, Brasil e União
  Soviética. Ninguém nunca voltou pra buscar. A recepção me entrega tudo no fim do dia. — J.»
- **Lounge:** «Palavras cruzadas, número antigo: o Jorge deixa para os visitantes. Falta uma: cinco letras, "chato".» (Em L24, na revista da portaria,
  a palavra aparece preenchida na letra dele: JORGE. Em inglês a pista também tem cinco letras; `en.ts:196-197` diz quatro e é corrigido em L1.)

Acréscimos a B.9:

- **Escada de serviço:** «Subsolo. Alagado até o segundo degrau.»
- **Grade do elevador:** «Mezanino — só se sobe depois de ter andado embaixo.»
- **Lacre** (segunda linha): «Só o curador empossado rompe.»
- **Tela "Sobre" e parede de créditos:** «O Museu do Voleibol, seu fundador e seus curadores são
  ficção. Os fatos do vôlei têm fonte na ficha de cada peça.»
- **Plaquetas da mesa de toque** (manchete e frase; categoria: réplica de manuseio; os fatos das
  quatro entram em `facts.bank.ts` em L8): `atrium-ball-laced` «Cadarço» — Réplica para a mão: gomos
  de couro fechados por um cadarço. · `atrium-ball-tokyo-1964` «Tóquio, 1964» — Réplica da bola dos
  primeiros Jogos com vôlei (F37, de uma fonte só, fica na ficha). · `atrium-ball-colour-1998` «Três cores» — Em 1998 a bola oficial
  deixou de ser branca. · `atrium-ball-eight-panel-2008` «Oito gomos» — Em 2008 a bola perdeu dez gomos de uma
  vez (F70). No verso de cada uma: «Réplica de manuseio. A da ala é a que conta. — O.»

### B.10 As provas de etiqueta (uma por sala)

| Sala | Bilhete da Helena | Resposta do Otávio, a lápis vermelho | Regra que ensina |
|---|---|---|---|
| escritório (**no cofre de ferro**, `doc-label-proof-office`) | «Otávio, ficaram lindas! Quarenta palavras cada, como você pediu. Só cortei a linha de baixo: original, reconstrução, réplica… O visitante não precisa disso para se encantar. Depois da reabertura a gente vê! — H.» | «Precisa, sim. É a única linha que eu não sei escrever de outro jeito. Guardo esta prova até o curador novo decidir. — O.» | o tema |
| Holyoke | «Precisa dizer que o dia é contestado? Confunde! — H.» | «Confunde menos que errar. As placas desta ala dizem só o ano. — O.» | separar o fato firme do disputado |
| Paris | «"Nenhum exemplar localizado" assusta o visitante. Que tal "edição do museu"? — H.» | «Assusta mais descobrir depois. — O.» | declarar o que a coisa é |
| Tóquio | «Podemos escrever a marca na bola dos Jogos? Todo mundo conhece! — H.» | «Havia vários fornecedores aprovados. A ficha não sabe qual fez esta. — O.» | não afirmar o que a fonte não diz |
| Ferro e Areia | «O Hall da Fama diz que ele assumiu três anos depois de parar de jogar. Dá o ano do título. Corrige? — H.» | «Conta de cabeça não é fonte. A biografia dele diz maio do ano anterior. Fica. — O.» | ler a fonte em vez de fazer a conta |
| A Reescrita | «Líbero: escolhe UMA data, pelo amor de Deus! — H.» | «São duas coisas: o teste e a regra. A etiqueta diz as duas, cada uma com o seu nome. — O.» | dois marcos não são uma contradição |
| Global | «Podemos pôr "o maior campeão de todos os tempos"? — H.» | «Ninguém mede isso. Ponha a lista, com a data em cima. — O.» | nada que envelhece, nada sem medida |

### B.11 Holyoke, peça por peça (já com as correções de fatos)

| Peça | Manchete da placa | Uma frase | Etiqueta de conferência do Otávio, no verso (detalhe obrigatório; texto de runtime, desde L4) | Detalhe opcional (modelo; L14) | Categoria (7.8) |
|---|---|---|---|---|---|
| `ball-improvised` | A câmara que não servia | Morgan testou a câmara de uma bola de basquete: leve e lenta demais. A bola inteira era grande e pesada demais. | «Câmara de borracha, amarrada no gargalo. Reconstrução. — O.» | a emenda da borracha | reconstrução tipológica |
| `ball-spalding` | Feita sob encomenda | Sem bola que servisse, Morgan pediu uma à fábrica da Spalding, perto de Chicopee: couro, de 25 a 27 polegadas de volta. | «Nenhum exemplar com carimbo legível foi localizado. — O.» | o carimbo oval do fabricante; o cadarço de couro cru | reconstrução tipológica |
| `net-1897` | Logo acima da cabeça | A primeira ideia era o tênis; ficou só a rede, posta logo acima da cabeça de um homem médio. | segunda vista (de pé junto ao poste): «Trecho reconstruído. A fita fica onde o manual manda. — O.» | o soquete do poste | reconstrução tipológica |
| `handbook-1897` | O primeiro manual oficial | Nove innings, como no beisebol; cada um acabava com três "outs" de saque por time. | «Texto composto pelo museu. Falta conferir contra o original. — O.» (revela `first-rulebook`) | a página das duas tentativas de saque (só depois do scan) | reconstrução tipológica (vira reprodução quando houver scan) |
| `guide-1916` | Morgan conta a história | Vinte anos depois, ele mesmo creditou o Dr. Frank Woods e o chefe dos bombeiros John Lynch. (F12 tem um publicador: até a segunda fonte, a etiqueta diz que os dois ajudaram a redigir as primeiras regras e o crédito fica na ficha; 7.7, item 21.) | «Capa e miolo compostos pelo museu. — O.» | a estimativa de 1916: 200 mil praticantes, mas as parcelas somam 155 mil | reconstrução tipológica (idem) |
| `gym-suit` | O traje de ginásio de catálogo | Malha de lã canelada e calça até o joelho: traje de catálogo, feito pelo museu. O museu não sabe o que os sócios de 1895 vestiam. (A data «c. 1901–1915» só volta com o catálogo capturado: 7.7, item 20.) | segunda vista (as costas): «Feito pelo museu a partir de catálogo. — O.» | a malha canelada | reconstrução tipológica |
| `portrait-morgan` | William G. Morgan, 25 anos | Diretor de educação física da YMCA de Holyoke, tinha 25 anos quando inventou o jogo. Há uma nota no verso. | «Em 1896, em Springfield, o Mintonette passou a se chamar Volley Ball. — O.» (revela `springfield-renaming`; chave autorizada) | o crédito da fotografia | reprodução (instituição que guarda o original: a capturar) |
| `photo-gym` | O ginásio da invenção | Publicada em 1897: argolas, cavalo de salto, pesos de polia e a pista de corrida suspensa. | «Reprodução de fotografia publicada em 1897. — O.» | o prédio, do começo dos anos 1890, queimou em 1943 | reprodução (fonte: Commons; reabrir a Digital Commonwealth, 7.7) |

A folha 2 do quiosque não imprime o ano: «O NOME — Mintonette durou pouco. Quem rebatizou o jogo, e
quando, está no verso de um retrato desta sala.» É o primeiro degrau da escada, escrito na sala.

### B.12 A Helena: o acréscimo à carta (`doc-welcome`, L3) e a página da ampliação (L12)

> «A seguradora só libera a reabertura com o inventário conferido por você, contra o livro de tombo do Otávio, que ficou na caixa-forte. Coragem!»

(A Helena anuncia a exigência; quem explica o gesto de pegar, virar e ler é o Otávio, na folha da
gaveta.)

> Página nova, depois da Reabertura: «Ampliação! Uma ala por vez, conforme a obra entrega. Inauguração no dia seguinte a cada termo. — H.» Linha por ala, quando a pasta é aberta: «Ala [N] · [nome]: inaugurar.»

### B.13 O Encerramento (`seq-closing`) e o bilhete do Jorge

> O jogador assina o termo de encerramento. A tela escurece. Cartão: «Fim do turno. Amanhece.»
>
> Jorge: «Inventário fechado, curador. Trinta anos de portaria e é a primeira vez que alguém fecha esse livro.» / «Tô subindo a porta. Dessa vez é pra você: vai ver a rua.» / «Eu vou fazer a ronda da ampliação. Nunca vi aquilo aceso. Levo o rádio. Câmbio.»
>
> A porta de enrolar sobe com o dia atrás. O vestíbulo e a portaria ficam alcançáveis. O Jorge continua respondendo no rádio (R5: nada se desliga).
>
> Bilhete na mesa da portaria: «Curador: fui fazer a ronda. O café da garrafa é de agora. A palavra que faltava eu achei: cinco letras, "chato". Era eu. — J.»
>
> Recado do Otávio colado no painel, o último: «Jorge: quando o curador fechar o inventário, suba a porta para ele. Ele vai querer ver a rua. — O.»
>
> Porta da rua: «A rua. O turno acabou; o museu abre às nove.»

---

## Anexo C — Acréscimos ao `npm run check` e dívidas datadas, por lote

| Lote | Suítes novas | Suítes que ganham casos |
|---|---|---|
| P0 | manifesto de capturas (`test:captures`); teste de documentação, todo ID resolve (`test:docs`); saves de produção pelo caminho real de carga (`test:qa-save`); fontes lidas e registradas (`test:facts`) | `validate:content` (`fact-code-uncaptured`, `fact-source-uncaptured`, `fact-source-drift`, `fact-capture-malformed`) |
| L1 | catracas (tamanho do `kit.glb`, bytes por caminho, programas, textura residente) | `validate:content` (M0, `fact-code-uncaptured`), `test:kit` (peça × `layout`), `test:power`, `test:navigation`, `test:opening`, `test:opening-flow`, `test:gpu-warmup` |
| L2 | `test:save`, `test:triggers`, `test:locks`, `test:playthrough`, `test:map`, `validateAdditive`; lints de numerais e `text-ages` | `validate:content` (`simulateProgress`), `test:transition-door`, `test:navigation` |
| L3 | `test:ending`, `test:speech-coherence` | `test:mobile-controls` (segurar), `test:radio`, `test:opening`, `test:opening-flow` |
| L4 | `test:examine` | `validate:content` (detalhes), `test:locks` (escada), `test:room-runtime` |
| L5 | `test:shell-finishes`, `test:room-placement`; estimador (M14) | bake (portões de 4.10), `test:materials`, `test:kit-runtime` (tetos por dado) |
| L6 | — | `test:kit-runtime`, `test:room-lod`, `test:kit`, `test:desk-top`, `test:bookshelf` (manifesto fundido) |
| L7 | — | `test:materials` (ΔE, cintilação, textura por trio), bake (KTX2, mídia) |
| L8 | — | `test:signage`, `validate:content` (`claims`, proveniência, palavras), `test:gpu-warmup` (atlas), `test:radio` (`askAbout`) |
| L9 | — | `validate:content` (`placement-without-role`, `room-overlap` com salas `deferred`), `test:signage`, `test:kit`, `test:navigation` |
| L10 | — | `test:power`, `test:materials`, `test:room-runtime`, `test:render-performance`, `test:transition-door`, `test:radio` |
| L11 | `test:plinth` | `test:locks` (lacre), `test:navigation`, `test:power` (`house`), `validateBake`, `test:speech-coherence` |
| L12 | — | `test:ending`, `test:playthrough`, `test:navigation`, `test:gpu-warmup` e `test:room-lod` (sala sem portal), `test:materials` |
| L13, L14 | — | `test:room-placement`, `test:kit`, `test:navigation`, `test:examine` |
| L15 | — | `test:radio`, `validate:content` (figurinhas × banco) |
| L16 | — | `test:mobile-controls`, regras de ajustes, lint de contraste |
| L17 | orçamento de bundle por camada | `test:room-lod` (residência), `test:locks` (roda, punção, casar, ordenar), redutores de `stepper` e `sequence-player` |
| L18–L22 | — | `test:playthrough`, `test:locks`, `test:power` (zonas), `facts.generated.ts` e `facts.manual.ts`, listas datadas |
| L23 | — | `test:navigation` (cota), `test:room-lod` (tier distante), `test:collision` |
| L24 | modo `--final` | modo leitura × dicionário |

**Dívidas datadas (`knownDebt`) abertas em L1 e L2**, com o lote que fecha cada uma:

| Código | O que acusa hoje | Fecha em |
|---|---|---|
| `exhibit-uncataloguable` | `net-1897`, `gym-suit`, `photo-gym` | L4 |
| `checklist-item-untickable` | «Catalogar o acervo» (até L4); «Caixa-forte» (promessa datada, `deferredUntilLot` 12) | L4, L12 |
| `kit-part-unused` | 16% do kit sem uso | L5 |
| catraca de programas | 34–35 medidos contra 25 do papel | L6 (o teto passa a ser o medido) |
| catraca do `kit.glb` | 2.189 KB contra 800 do papel | L6 |
| mídia fora do portão | 54,7 MiB | L7 |
| superfície de leitura em branco | quiosque, três pedestais e cinco mesas de leitura da Holyoke (L8); púlpito, plaquetas do console e atril do saguão (L9) | L8, L9 |
| `wall-fixture-off-the-wall` | mural de orientação, banners e murais (L9); quadro do átrio (L10) | L9, L10 |
| `placement-without-role` | recepção, gaveteiro, gavetas do console, torre, lounge, biombos, caixa de doação, instalação aérea, pódio | L9 (o pódio, L11) |
| detalhe opcional × `anchors` | carimbo da Spalding sobre o bico; plaqueta do retrato | L14 |
| tetos temporários do átrio | 58 lotes, 102 draws | L6 |
| `deferred` (promessas datadas) | pódio (L11); plataforma (L12); tapumes (L18 a L22); grade do mezanino (L23); entrada (L24) | no lote de cada uma |

Um validador novo que acuse algo fora desta tabela reprova o lote: ou o conteúdo é consertado, ou a
linha entra aqui, com data, no plano do lote.

## Anexo D — O que este plano substitui em `docs/PLANO-COMPLETO.md`

| Agosto | Este plano |
|---|---|
| §2: "todas as seis abrem desde o primeiro segundo" | as alas abrem depois da Reabertura, uma por lote e em sequência: o termo de uma deslacra a pasta da seguinte (D28) |
| §2.2: medalhas `founding`, `olympic`, `global` nas Alas 2, 3 e 6; "plinto já construído" | `curator`, `founding`, `lineage`, na casa original; o plinto é construído em L11 |
| §2.4: `service-key` consumida numa gaveta; `breaker-handle` | a chave abre o cofre de ferro; `breaker-handle` sai |
| §3: sete códigos | quatro digitados ou girados (`1896`, `1962`, `1973`, e o `15` só com fonte), dois contados; `1998` vira ritual |
| §5: ritual `paris-seating-plan` (ordenar catorze) | `paris-beyond-europe` (alfinetar as quatro de fora da Europa) |
| §9: medalha `global` pelo ritual das seis bolas | o ritual vira "seis bolas, três moldes", paga o fio e é exigido pelo termo de encerramento |
| §11: a escada desce; assinar o livro de visitas | a plataforma desce; assina-se o termo de reabertura no púlpito; o livro de visitas é o resumo |
| §12: fases A a F | lotes L1 a L24; os portões de fase viram critérios de aceite de L18, L19 e L22 |

O que continua valendo de agosto, sem mudança: §4 (as três armadilhas e as quatro regras), os heróis
e as premissas das cinco alas, a posição sobre o Brasil, as defesas contra envelhecer, o final "o
museu se declara".

---

## Anexo E — A conferir no navegador antes de virar tarefa

| # | O que conferir | Como | Para o lote |
|---|---|---|---|
| 1 | `net-1897` e `gym-suit` nunca catalogam; `photo-gym` quase nunca | examinar as três | L4 |
| 2 | o piloto da Holyoke fica fora do campo de visão de quem entra | `?qaCamera=-10.2,0,-2,1.5708,0`, sem `qaPower`. **Conferido em P0: confirmado** (o piloto fica a 103° do eixo; nenhum pixel muda com ele ligado) | L1 |
| 3 | as quatro peças da vitrine corrida | `?qaCamera=-14.1,0,6.45,3.1416,0.25&qaPower=holyoke` e as outras três URLs da auditoria. **Conferido em P0: confirmado** nas quatro | L1 |
| 4 | a posição nova do quadro da Holyoke (parede oeste, lado sul) fica livre do mural, da vitrine corrida e do emissor `holyoke-clock`, e o piloto se vê da entrada | medir; teste de farol. **Conferido em P0:** livre, mas em z = 5,0 a vitrine-herói tapa o quadro; validada `[-5.86, 1.15, 2.2]` | L1 |
| 5 | a secretária eletrônica cabe no escritório sem lote novo | contar lotes depois do bake | L3 |
| 6 | o quadro do átrio de lado; a faixa tracejada sob a capa do lambri | capturas `a17`, `a31` | L10, L9 |
| 7 | a luz ao abrir uma porta; os pilotos atravessando a parede | abrir a porta da Holyoke com o átrio aceso | L10 |
| 8 | a porta do escritório sem saída quando uma textura do átrio não chega | simular a falha. **Conferido em P0: confirmado**; e a textura que falha (em vez de não chegar) desmonta o jogo, o que o tempo-limite não cobre | L1 |
| 9 | por que a bola de 1964 sai lisa (mapas a 64 px?) | `historicalVolleyballs.mjs:359` | L7 |
| 10 | o ganho real de draws da fusão do kit | medir em frame, depois de reload limpo | L6 |
| 11 | o fosso falso do plinto lê como grade sobre água | captura no escuro, com a lanterna | L11 |
| 12 | `relocatePlayer` com espera de piso | protótipo com o `__museumTeleport` | L12 |
| 13 | as seis capturas da Holyoke escura não revisadas | rever | L10 |
| 14 | os 11 programas "sem nome" | `__museumPrograms()` | L5 |
| 15 | H-14: o cartão creme do runtime é maior que a moldura assada | examinar o retrato e a fotografia | L4 |
| 16 | a rede movida 2,15 m para o eixo da quadra tem folga contra banco, conjunto de treino, quiosque e corredor | medir; inundação | L14 |
| 17 | a planta do saguão de 4.7b: faixas dos vãos, linha de visão da dedicatória, piloto visto por cima do plinto | `room-overlap`, inundação, captura da porta do escritório | L9 |
| 18 | a secretária eletrônica e o cofre como container cabem no teto de lotes do escritório | contar depois do bake | L3 |
| 19 | as pegadas das alas (Tóquio × Ala 4 encostadas; Alas 5 e 6 × vestíbulo) | `room-overlap` com salas `deferred` | L9 |
| 20 | os avisos de console (`THREE.Clock` depreciado; X4122) | console depois de reload limpo | L16 |

---

## Anexo F — Fios, listas congeladas e colecionáveis

### F.1 Os cinco fios (M8)

Nó é peça catalogada ou documento lido. Todo fio fica completo no lote **L22** (`completeFromLot`);
antes disso o Acervo mostra «n de m — falta ala em montagem» e o fio não fecha. O fechamento é
gravado em `progress.threadsClosed` e nunca se desfaz.

| Fio | Nó 1 | Nó 2 | Nó 3 | Nó 4 | Nó 5 | Nó 6 |
|---|---|---|---|---|---|---|
| `ball` (a bola) | `ball-spalding` · Ala 1 · L4 | `ball-laced-1935` · Ala 2 · L18 | `ball-1964-used` · Ala 3 · L19 | `ball-fivb-white` · Ala 4 · L20 | `ball-tricolour-1998` · Ala 5 · L21 | `ball-eight-panel-2008` · Ala 6 · L22 |
| `net` (a rede) | `net-1897` · Ala 1 | `net-tarred-1940s` · Ala 2 | `net-heights-post` · Ala 4 | `court-sitting-lowered-plane` · Ala 6 | — | — |
| `rules` (as regras) | `handbook-1897` · Ala 1 | `rulebooks-1947` · Ala 2 | `scoreboards-pair` · Ala 5 | `challenge-console` · Ala 6 | — | — |
| `beach` (a praia) | `beach-court-1960` · Ala 3 | `plaque-manhattan` · Ala 4 | `doc-beach-olympic` · Ala 5 (documento; gaveta com o distintivo `beach`) | `beach-rope-rack` · Ala 6 | — | — |
| `sitting` (o vôlei sentado) | `court-sitting-lowered-plane` · Ala 6 | `doc-arnhem-1980` · Ala 4 (documento; gaveta com o distintivo `sitting`) | `doc-standing-paralympic` · Ala 5 (documento; idem) | — | — | — |

As quatro bolas da mesa de toque não são nó de nada. Fechar `sitting` e `beach` obriga a voltar a
alas já inauguradas com um distintivo ganho depois: é o "cruzar o prédio" que o portão de L22 pede.

### F.2 Listas congeladas

- **Casa (12):** `ball-improvised`, `ball-spalding`, `net-1897`, `handbook-1897`, `guide-1916`,
  `gym-suit`, `portrait-morgan`, `photo-gym` (lacre da Fundação); `atrium-ball-laced`,
  `atrium-ball-tokyo-1964`, `atrium-ball-colour-1998`, `atrium-ball-eight-panel-2008` (lacre da
  Linhagem).
- **Alas (8 cada):** as tabelas de 5.2 a 5.6 são a lista do termo de cada ala. Trocar uma peça
  depois do lote da ala é mudança de termo (`term-condition-changed`) e não se faz.
- **Encerramento:** cinco `wing-*-open`, quatro `registrar-*`, cinco fios, `global-ball-casts`.

### F.3 Figurinhas (24), bancos de escuta (9) e fichas de dúvida

| Sala | Figurinhas (fato; ● uma fonte, ●● duas) | Banco de escuta (leitura do museu) | Ficha de dúvida |
|---|---|---|---|
| Escritório | F13 ●, F21 ● | — | — |
| Saguão | F05 ●●, F14 ●, F80 ● | «A portaria» (ficção da casa, declarada) | — |
| Ala 1 | F03 ●, F06 ●, F12 ●, F15 ●, F16 ●; F07 ● e F09 ● só depois do scan (até lá, F17 ● e F20 ●) | «O prefeito e o bombeiro» (F10 ●●) | `doc-count-doesnt-close` (F17); `doc-invention-date` (F11) |
| Ala 2 | F28 ●, F29 ●● | «O café em Praga» (F23) | `doc-sixteen-doubt` |
| Ala 3 | F31 ●, F39 ● | «Ponto do ouro» (F36) | `doc-ball-1964-maker-doubt` |
| Ala 4 | F47 ●, F52 ● | «Jornada nas Estrelas» (F54) | `doc-wagner-year-doubt` |
| Ala 5 | F62 ●, F65 ● | «Só pontuava quem sacava» (F62, F64) | `doc-libero-two-dates` |
| Ala 6 | F74 ●, F77 ●● | «Duas chegadas» (F81) | `doc-brazil-two-arrivals` |
| Mezanino | F82 ●, F84 ● | — | `doc-snow-doubt` |

O contador do álbum mostra o total do build do lote (12 em L15; 24 em L23). Cada figurinha tem um
esconderijo fixado no plano do lote (posição, sala e o `role` da colocação).

---

## Anexo G — Rastreio dos achados das capturas (CAP-1 a CAP-17)

| CAP | Achado | Item que o fecha | Lote |
|---|---|---|---|
| 1 | vitrine corrida: quatro peças fora da malha de vãos | H-13; 4.4 ordem 1 | L1 |
| 2 | exame quebrado para cinco das oito peças | frente 3 (H-01, H-02, H-04, ÁT-B5, ÁT-C6) | L4 |
| 3 | os dois impressos são blocos de lona em branco | etiqueta de conferência no verso (L4); 4.4 ordem 4 (capa, miolo, berço) | L4, L14 |
| 4 | nenhuma legenda física tem texto | H-49, H-50, AS-S9, AS-A16, ÁT-C7 | L8, L9 |
| 5 | átrio "aceso" continua escuro | 4.7 (estágios e alvos) | L10, L11 |
| 6 | com a energia cortada, todo emissivo segue ligado | ÁT-B1, AS-S6 | L10 |
| 7 | Spalding: normal do couro ampliado; cadarço invisível | 4.4 ordem 2; D20 | L14 |
| 8 | a bola de 1964 é uma esfera lisa | 4.3 ordem 2; Anexo E, item 9 | L7 |
| 9 | madeira com veio ondulado enorme e normal forte | AS-S3, AS-S5 (L5); AS-S4 (L7) | L5, L7 |
| 10 | arquivos da Holyoke no breu | H-24, chave K5 | L10 |
| 11 | plinto: quatro discos, sem texto, pequeno demais | ÁT-D1; 4.3 ordem 1 | L11 |
| 12 | biombo na frente da placa de dedicação | ÁT-F1; 4.7b | L9 |
| 13 | vinheta do ginásio: sem luz; rede lê como cerca; traje lê como saco | chave K4 (L10); 4.4 ordens 5 e 6; 4.4c (linhas da quadra) | L10, L14 |
| 14 | verso da tela de entrada: monólito preto | 4.4 ordem 8 | L14 |
| 15 | nicho da bola improvisada a 33 cm do chão | D22; H-16 | L14 |
| 16 | lambri em duas alturas, com frestas | ÁT-F4; AS-L2 | L9 |
| 17 | 100 draws na diagonal sudeste; 34–35 programas | ÁT-K1; M14, M21 | L1 (catraca), L5, L6 |

---

## Anexo H — Endereços abertos em 2026-10-03 (extraídos do relatório de fatos)

São a semente de `facts.bank.ts`. As abreviaturas da tabela 7.5 (FIVB-H, IVHF-M, WP…) resolvem aqui.
O relatório completo, com a citação de cada página, é `docs/plano-mestre/fontes/07-facts.md` depois
de P0.

- <https://collection.powerhouse.com.au/object/502721>
- <https://dzieje.pl/node/25274>
- <https://en.wikipedia.org/wiki/1962_FIVB_Women%27s_Volleyball_World_Championship>
- <https://en.wikipedia.org/wiki/Beach_volleyball>
- <https://en.wikipedia.org/wiki/F%C3%A9d%C3%A9ration_Internationale_de_Volleyball>
- <https://en.wikipedia.org/wiki/Hubert_Wagner>
- <https://en.wikipedia.org/wiki/Karch_Kiraly>
- <https://en.wikipedia.org/wiki/Oriental_Witches>
- <https://en.wikipedia.org/wiki/Volleyball>
- <https://en.wikipedia.org/wiki/William_G._Morgan>
- <https://fr.wikipedia.org/wiki/F%C3%A9d%C3%A9ration_internationale_de_volley-ball>
- <https://hiroshimagooddesign.jp/product/1034/>
- <https://it.wikipedia.org/wiki/F%C3%A9d%C3%A9ration_Internationale_de_Volleyball>
- <https://mikasasports.co.jp/e/company/history/>
- <https://olympic-museum-artefacts.zetcom.net/en/collection/item/141207/>
- <https://pl.wikipedia.org/wiki/Hubert_Wagner>
- <https://pl.wikipedia.org/wiki/Mi%C4%99dzynarodowa_Federacja_Pi%C5%82ki_Siatkowej>
- <https://pmc.ncbi.nlm.nih.gov/articles/PMC3590823>
- <https://pt.wikipedia.org/wiki/Federa%C3%A7%C3%A3o_Internacional_de_Voleibol>
- <https://ru.wikipedia.org/>
- <https://sportsstories.substack.com/p/the-filipino-bomb>
- <https://usopm.org/karch-kiraly/>
- <https://volleyball1on1.com/1897-association-athletic-league-handbook-volleyball/>
- <https://www.buffalosportshallfame.com/william-g-morgan/>
- <https://www.fivb.com/beach-volleyball/the-game/history/>
- <https://www.fivb.com/inside-fivb/fivb/about/>
- <https://www.fivb.com/snow-volleyball/the-game/>
- <https://www.fivb.com/volleyball/the-game/>
- <https://www.fivb.com/volleyball/the-game/basic-rules/>
- <https://www.fivb.com/volleyball/the-game/history/>
- <https://www.fivb.com/volleyball/the-game/history/'>
- <https://www.jstage.jst.go.jp/article/gomu/93/2/93_37/_article/-char/en>
- <https://www.kuraray.com/jp-ja/news/2008/0625/>
- <https://www.sdm.jpnsport.go.jp/gallery-1/15.html>
- <https://www.volleyhall.org/first-us-championship-1922.html>
- <https://www.volleyhall.org/hirofumi-daimatsu.html>
- <https://www.volleyhall.org/history-of-volleyball.html>
- <https://www.volleyhall.org/history-of-volleyball.html'>
- <https://www.volleyhall.org/hubert-wagner.html>
- <https://www.volleyhall.org/karch-kiraly.html>
- <https://www.volleyhall.org/page/show/3821594-history-of-volleyball>
- <https://www.volleyhall.org/paul-libaud.html>
- <https://www.volleyhall.org/william-morgan-father-of-volleyball.html>
- <https://xbotgo.com/blogs/knowledge/top-volleyball-jersey-numbers>

---

## Anexo I — Onde os três desenhos de origem divergiam, e a decisão

| Assunto | Completável | Narrativo | Exploração | Decisão | Motivo |
|---|---|---|---|---|---|
| Estrutura das entregas | termo assinado a cada entrega | final só com as seis alas | final a partir da terceira ala | **termo a cada lote, a partir da Posse (L3)** | é a única com final em toda publicação |
| Medalhas | três, da casa original | três, nas Alas 2, 3 e 6 | seis, três quaisquer | **três, da casa original** | o final de história fecha com o que já está construído |
| Como a medalha é liberada | o Jorge solta a trava | atrás de trancas das alas | tubo pneumático | **lacre de conferência** (ideia do narrativo), anunciado pelo Jorge | sem mágica e sem asset novo: o lacre só se rompe com o conjunto conferido |
| Cofre do Fundador | sobe; ninguém desce | descida por escada ou plataforma | descida com água baixando | **plataforma** (plano B: sobe) | a sala sem rádio é a melhor batida; a plataforma não exige física vertical |
| Onde se assina | Livro de Termos, no púlpito | livro de visitas, na recepção | livro de tombo, no cofre | **Livro de Termos, no púlpito** | um gesto só para todos os finais; o livro de visitas vira o resumo da noite |
| Luz geral | alavanca no plinto | fecha sozinha com a terceira medalha | chave sob a tampa | **chave geral que aparece sob a tampa; o jogador a fecha** | o maior momento precisa de um gesto do jogador |
| Catalogar no escuro | (mantém) | (mantém) | só com luz | **mantém** | D17 |
| Última dica de uma tranca | revela | o Jorge nunca diz | só com "Pedir ao Jorge" | **só com pedido, e quem mostra é a ficha de conferência** | nunca falha, nunca entrega sem consentimento, não depende de rádio nem de envelope |
| Proveniência antes do final | carimbo ao ler o tombo | só a letra até o livro | por extenso desde o saguão | **por extenso na ficha desde o primeiro carimbo; a linha volta às placas depois do final** | D7; sem enigma de letra |
| Quem libera o mezanino | elevador com dois fios | botão do Jorge | — | **o Jorge solta a grade quando o curador pede, diante dela** | segue o recado do Otávio no painel dele |
| Ritual de Paris | ordenar 14 delegações | idem | alfinetar quatro delegações num mapa | **alfinetar as quatro de fora da Europa** (`paris-beyond-europe`) | cabe no toque; nomeia as regiões em vez de contar continentes |
| Tranca de Global | marcas de trena | estacas e cursores | nós da corda, duas rodas | **faixas de um metro na corda, dois lances rotulados** | contar nós dá erro de poste de cerca; faixas, não |
| "Continuar" | escritório | decisão do dono | última sala | **escritório + resumo do Jorge** | D12 |
| Nome | Museu do Vôlei | Museu do Voleibol | Museu do Voleibol | **Museu do Voleibol** | D5 |
| Portaria | atrás da porta sul; abre no fim | guarita além do pátio | guarita vista pela grade | **vestíbulo e portaria atrás de uma porta de enrolar de aço; abre em L24** | a porta sem motor explica por que o Jorge não entra |
| Planta (aba) | folheto libera | folheto libera | folheto libera | **folheto libera**; save antigo ganha a aba na migração | aprovado em `HANDOFF.md` §7.5 |

---

## Como este plano foi verificado

O rascunho passou por cinco revisões adversariais independentes. Cada achado foi conferido contra o
rascunho e, quando citava código, contra o repositório (por exemplo: `MobileControls.tsx:275` é
mesmo `onClick`; `radioWithinEarshot` só ouve o rádio da mesa no escritório; a entrada e o atalho da
Holyoke estão na mesma parede; `store.ts:234` descarta o save de outra versão; a rede de 1897 tem a
borda de baixo a 1,36 m e o olho do jogador fica a 1,62 m; `package.json` não tem navegador
headless; a pesquisa diz o que os achados de fatos dizem que ela diz).

| Lente | O que procurava | Achados | Corrigidos no plano | Rejeitados |
|---|---|---:|---:|---:|
| Becos e quebras de sequência | o jogador preso, a ordem que quebra, a tranca sem solução | 22 | 22 | 0 |
| Fatos | afirmação sem fonte, código inseguro, texto que envelhece, viés | 24 | 24 | 0 |
| Continuidade | contradição de história, de personagem e de lugar | 23 | 23 | 0 |
| Viabilidade | orçamento que não fecha, dependência fora de ordem, critério sem portão | 20 | 20 | 0 |
| Completude | o que o dono pediu e faltava; defeito sem teste; lote sem escopo | 20 | 20 | 0 |
| **Total** | | **109** | **109** | **0** |

Nenhum achado foi rejeitado: todos se confirmaram no rascunho ou no repositório. Em seis casos a
correção adotada **não** é a que o revisor sugeriu, e fica dito por quê:

1. **Rádio opcional e epílogo.** Um revisor propôs tornar o rádio obrigatório. Ficou opcional (o
   rádio "ouvido onde está" foi construído na rodada anterior); os fechos saem por sequência
   dirigida, pelo alto-falante da sala (D27).
2. **Lanterna e distintivo de praia.** Em vez de exigir a lanterna, a vista baixa do exame no lugar
   deixa a luz de mão rasante. A lanterna continua não sendo exigida por nada.
3. **Estojo dos moldes.** Em vez de dar a cada molde uma marca arbitrária, o ritual virou "seis
   bolas, três moldes", que é o que a pesquisa sustenta e ensina mais.
4. **Slots de luz.** Em vez de dez spots (recompilar o prédio), o pool 6 + 2 fixo (D30).
5. **Último degrau da dica.** Em vez de o Jorge ler a resposta, o caderno abre a ficha de
   conferência (D15): não precisa de rádio, de envelope nem de mostrador que gira sozinho.
6. **Fatos novos para equilibrar o banco** (F88 a F93) e os textos de etiqueta das alas não puderam
   ser verificados nesta rodada: entram como portão da fatia 0 de cada ala, e a versão padrão de
   cada sala é a que não depende deles.

Depois das correções, o grafo foi percorrido de novo como jogador, do título ao termo de
encerramento, em quatro perfis: rota canônica; sem rádio, sem caderno e sem lanterna; tudo fora de
ordem (o chapéu primeiro, as peças antes da luz, a gaveta antes de sair do escritório); e um save de
cada lote carregado no lote seguinte. O que essa passada ainda achou e fechou: a página II do Livro
sendo concedida sem leitura; o Livro no púlpito e a lente do quadro estourando o teto de draws antes
da fusão (viraram exceções datadas); a linha «Caixa-forte» da lista como promessa datada sem caixa
de riscar; o termo final citando o estojo; a pista das palavras cruzadas em inglês; e a porta de
enrolar, que subia duas vezes.

O que continua sem verificação está em 10.3: ninguém jogou este roteiro, e todo número de espaço,
draw e memória é estimativa até o lote que o mede.
