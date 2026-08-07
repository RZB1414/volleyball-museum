# Volleyball Museum — Plano de reconstrução do zero

> Documento para análise. Nada foi implementado. Todas as decisões marcadas **[DECIDIDO]** são
> recomendações minhas com justificativa; as marcadas **[SEU AVAL]** mudam o produto e precisam da
> sua palavra antes da Fase 1.

---

## 0. Resumo em uma página

**O que você tem hoje:** um protótipo de *uma* sala com engenharia de primeira linha (controlador em
primeira pessoa, tocha com shader procedural, pointer lock sem stutter) e **zero jogo** — sem
conteúdo, sem progressão, sem áudio, sem mapa, sem save. Geometria e mobília estão soldadas dentro
dos componentes. Os 7 modelos 3D são de escritório vitoriano gerados no Meshy — nada de vôlei.

**O que proponho:** manter ~15% do código atual (o controlador, a tocha, o warmup de shaders, a
lógica de vãos de parede), jogar fora o resto e reconstruir sobre três decisões estruturais:

1. **Sala = dado, não componente.** Um museu vira um arquivo `.json` lido por um gerador genérico.
   Adicionar a sétima ala é escrever JSON, não escrever React.
2. **Assets nascem de código Node em build time e viram `.glb` otimizado.** Eu escrevo os
   geradores (torneamento, extrusão, CSG, ruído para texturas), o `npm run bake` produz os arquivos,
   o runtime só carrega. O gerador é o asset; o GLB é o binário compilado.
3. **A gramática do Resident Evil entra invertida:** as galerias ficam **abertas** desde o começo, o
   **arquivo** é que fica trancado. Progressão libera *profundidade*, nunca o acervo.

**Escopo:** 6 alas (não 13 décadas), ~45 min de percurso completo, ~6 min de primeira impressão.

**Números que mandam no projeto:** hoje o build é **um único chunk de 1.273.720 B gzip**, e
**803.312 B disso (63%) é o WASM do Rapier em base64 inline**, bloqueando o first paint. Meta:
**≤250 KB gzip antes do clique em "Entrar"**.

---

## 1. Diagnóstico do código atual

### 1.1 O que sobrevive

| Arquivo | Por quê |
|---|---|
| `src/player/FirstPersonController.tsx` | `KinematicCharacterController` do Rapier com slide, snap-to-ground e autostep. `requestPointerLock({ unadjustedMovement: true })` com fallback `pointermove`→`mousemove` — isso resolve o stutter de mouse de alto polling e quase ninguém sabe fazer. Migra quase inteiro. |
| `src/effects/TorchFire.tsx` | Chama por FBM noise em GLSL + 48 brasas em `Points` com atributos dinâmicos. É o melhor código do repositório e é *exatamente* o tipo de asset que "eu gero tudo" quer dizer. Vai inteiro. |
| `src/player/HandTorch.tsx` | Raycast anti-parede reaproveitando um `rapier.Ray` por frame, exclusão nativa do collider do jogador. A ideia de "objeto na mão em vez de braço" é a decisão certa (ver §6.4). |
| `src/scenes/SceneWarmup.tsx` | `compileAsync` + `initTexture` escalonados. Vira obrigatório num projeto procedural — materiais construídos em JS compilam preguiçosamente, e "preguiçosamente" significa exatamente quando o jogador atravessa uma porta. |
| `getWallSegments()` em `MuseumRoom.tsx` | Fatiar parede em torno de vãos. Migra para o gerador de build time. |
| `src/game/MobileControls.tsx` | Joysticks com dead zone e drag-to-activate. Migra; precisa ganhar o gesto de examinar (§6.5). |
| `wrangler.jsonc` | Correto. Só falta `_headers` (§7.6). |

### 1.2 O que morre

| Problema | Evidência | Consequência |
|---|---|---|
| Geometria hardcoded | `room = { width: 12, depth: 16, height: 4 }` é constante de módulo em `MuseumRoom.tsx:27`. As 3 salas são a *mesma* sala com flags `hiddenPhysicalWalls`. | Não escala. É a doença que se multiplica por 10. |
| ~140 planos por sala | Cada faixa (papel, rodapé, friso, sanca, pilastra) é um `<planeGeometry>` empilhado com offsets de 0,012 m. O próprio código comenta o z-fighting em `MuseumRoom.tsx:324`. | ~1.400 draw calls só de parede em 10 salas. O teto de mobile é **45**. |
| 7 GLBs do Meshy, ~3 MB | `Meshy_AI_Regal_Carved_Leather__0703163248_texture.glb` etc. | Tema errado, sem controle, sem instancing. |
| `scene.clone(true)` por instância | `GroundedModel.tsx:24` | Duplica geometria em vez de `InstancedMesh`. |
| Collider = AABB do modelo | `GroundedModel.tsx:51` | Você bate no ar perto da mesa. |
| Rapier inline | Medido: 1.569.399 B de WASM em base64 dentro do chunk de entrada = **803.312 B gzip** | Maior defeito de performance do projeto hoje. |
| Tudo montado de uma vez | Um único `<Physics>` em `MuseumRoomScene.tsx` | 10 salas residentes = aba morta no iOS. |
| Ausências | save, áudio, mapa, inventário, narrativa, i18n, testes, code splitting | — |

**Veredito:** engenharia excelente, arquitetura de mundo inexistente. O "do zero" não é desperdício
— é o que preserva o que presta.

---

## 2. O conceito

### 2.1 Premissa narrativa **[DECIDIDO]**

> **Você é o novo curador. É a noite anterior à reabertura. A energia caiu, o acervo está
> descatalogado, e seu antecessor deixou alguma coisa no cofre.**

Uma frase resolve, de graça, tudo o que num museu-jogo normalmente parece arbitrário: por que está
escuro, por que você tem uma lanterna, por que abre gavetas, por que existe um catálogo, por que
existe um escritório com café e uma luminária, e por que existe um final. Sem ela, 199 fatos
históricos são uma enciclopédia com colisão.

### 2.2 Estrutura: 6 alas, não 13 décadas **[DECIDIDO]**

Uma década não é uma unidade narrativa. Os anos 30 e 40 só fazem sentido juntos (o vôlei congela na
guerra e renasce na fundação da FIVB); 2000–2026 é uma história contínua. E 13 salas é um prédio que
nem eu nem você terminamos.

| # | Ala | Recorte | Gancho |
|---|---|---|---|
| 1 | **Holyoke** | 1895–1929 | Nasce como jogo *fácil de propósito*, para senhores que achavam basquete pesado demais. A YMCA e os navios de tropa da 1ª Guerra espalham pelo mundo. Filipinos inventam o ataque em 1916. |
| 2 | **Paris** | 1930–1949 | Vira esporte governado. URSS transforma em esporte de massa, a guerra congela, e em 20/04/1947 catorze federações fundam a FIVB em Paris. |
| 3 | **Tóquio** | 1950–1969 | Estreia olímpica em 1964. As "Bruxas do Oriente" japonesas e o treinador Daimatsu. Nasce o vôlei de praia na Califórnia. |
| 4 | **Ferro e Areia** | 1970–1989 | Polônia e URSS no topo, a antena entra na rede, os EUA de Karch Kiraly ganham tudo, e a AVP transforma praia em televisão. |
| 5 | **A Reescrita** | 1990–1999 | O vôlei vira produto de TV: World League, Grand Prix, praia olímpica em Atlanta 96 e, em 1998, o líbero + bola tricolor + rally point até 25. |
| 6 | **Global** | 2000–hoje | Dinastia de Bernardinho, bola de 8 gomos com dimples em Pequim 2008, desafio por vídeo, VNL em 2018, e um pódio que hoje se reparte entre Itália, França, Polônia, Türkiye e Brasil. |

### 2.3 Topologia: por que cronologia mata a espiral **[DECIDIDO]**

Cronologia é uma **linha**. A gramática do Resident Evil é uma **espiral**: a chave que você acha em
espaço acessível abre uma porta em espaço **já visitado**. Se a galeria N+1 é a década N+1, toda
credencial só aponta para frente, não existe volta, não existe atalho que importe, e você embarcou
no "colapso linear de final de jogo" logo no primeiro minuto.

Solução — **dois eixos independentes**:

- **Eixo espacial:** um **átrio** central com as 6 alas abertas em qualquer ordem.
- **Eixo temático (o que faz a espiral):** 5 fios que **atravessam** as eras — *a bola*, *a rede*,
  *as regras*, *a praia*, *o vôlei sentado/paralímpico*. Fechar um fio exige visitar 3–4 alas
  diferentes. É isso que dobra o mapa.

A cronologia vira a ordem do **conteúdo**; os fios temáticos viram a ordem do **jogo**.

### 2.4 A inversão da tranca **[DECIDIDO]**

Porta trancada é um bounce num link de portfólio, e é uma contradição institucional num museu.

> **As galerias estão abertas desde o primeiro segundo. O que está trancado é o ARQUIVO.**

O que a progressão libera: as gavetas, os documentos, as fichas de proveniência, o mezanino, o
cofre do fundador, o final. Quem entrar por 4 minutos viu um museu; quem ficar 45 encontrou uma
história por trás dele. Curiosity debt intacta, sem nenhuma porta na cara.

### 2.5 O que a escuridão substitui

Terror não é o zumbi — é o não-resolvido. Três coisas geram tensão sem nenhum inimigo: você não vê o
que vem, você vê o que não pode abrir ainda, e o prédio é maior que seu entendimento dele.

Dois loops substituem combate e chave:

- **Sala escura → restaurar energia → sala permanentemente "limpa".** O bloom de luz quando uma ala
  liga é a satisfação de matar o zumbi, sem violência, repetível 6 vezes.
- **Ler o museu → aprender um fato → o fato É a combinação de um cofre.** A carga educativa vira
  *load-bearing*, não opcional. (Com escada de dicas — §6.3.)

---

## 3. A planta

```
                    ┌──────────────────────────────────────────┐
                    │           MEZANINO (2º piso)             │
                    │   abre na Fase 2 — revê tudo de cima     │
                    └────────────────┬─────────────────────────┘
                                     │ escada
   ┌──────────┐  ┌──────────┐  ┌─────┴──────┐  ┌──────────┐  ┌──────────┐
   │ ALA 1    │  │ ALA 2    │  │            │  │ ALA 4    │  │ ALA 5    │
   │ Holyoke  ├──┤ Paris    ├──┤   ÁTRIO    ├──┤ Ferro e  ├──┤ A        │
   │1895-1929 │  │1930-1949 │  │  (hub)     │  │ Areia    │  │ Reescrita│
   └────┬─────┘  └──────────┘  │            │  └──────────┘  └────┬─────┘
        │ atalho de mão única  │  plinto    │                     │
        └──────────────────────┤  3 medalhas├──────┬──────────────┘
                               └─────┬──────┘      │
                   ┌─────────────────┴───┐  ┌──────┴───────┐  ┌────────────┐
                   │ ESCRITÓRIO DO       │  │  ALA 3       │  │  ALA 6     │
                   │ CURADOR (safe room) │  │  Tóquio      │  │  Global    │
                   └─────────────────────┘  │  1950-1969   │  │ 2000-hoje  │
                                            └──────────────┘  └────────────┘
                               ┌──────────────────────┐
                               │  COFRE DO FUNDADOR   │  ← abre com 3 medalhas
                               │  (subsolo, no átrio) │     e volta pro átrio
                               └──────────────────────┘
```

**Regras de planta** (tiradas direto da gramática do RE, adaptadas):

- **O átrio é pé-direito duplo e a lanterna não alcança o teto.** A escala é ilegível no escuro. Na
  hora em que a luz geral acende (Fase 3), é o maior momento do jogo — e custa uma variável booleana.
- **Toda ala fecha com um atalho de mão única de volta ao átrio.** Uma porta com barra que só abre do
  lado de lá. É o primitivo mais barato e mais forte de compreensão espacial que existe.
- **Nenhuma galeria se revela da porta.** Divisórias em ângulo, vitrines *no eixo* da entrada,
  banners pendurados, entrada em cotovelo. O objeto principal fica **fora** do eixo, então você
  precisa entrar e virar. Isso é o enquadramento de câmera fixa do RE clássico, reconstruído em
  geometria — que é a única forma que sobra em primeira pessoa.
- **Toda sala precisa de apelido.** "A sala da bola de couro rachada", "a das bruxas". Se não dá pra
  apelidar, é corredor — encurta ou dá identidade.
- **Um safe room só.** O Escritório do Curador, colado no átrio. A cadência de "um a cada 20–30 min"
  do RE daria exatamente um em 45 minutos; então em vez de padrão repetido, ele é um **marco**.

**O contrato sensorial do Escritório** (copiado literalmente do RE2R porque funciona): a sala está
escura quando você acha; você acende a luminária de mesa; **a música calma começa no clique do
interruptor**, não ao entrar. Luz tungstênio quente contra o azul frio da lanterna no resto do
prédio. Dentro: a mesa, o **carrinho de arquivo** (o item box — qualquer carrinho é o mesmo
carrinho, com álibi de tubo pneumático), o **livro de visitas** (save), o **quadro de cortiça** onde
todo documento achado aparece pregado como miniatura física, e a **mesa de mapas**. Nunca acontece
nada de ruim ali. Nunca.

---

## 4. Conteúdo — as 6 alas

A pesquisa produziu **199 marcos históricos** e **57 objetos de acervo descritos com detalhe
suficiente para modelar em 3D**, todos passados por uma rodada de fact-check adversarial que
encontrou **109 correções**. Esse número é o ponto mais importante desta seção inteira: **~50% de
taxa de erro antes da verificação**, e no meu desenho os fatos são *funcionais* — um ano errado vira
um soft-lock. Ver §6.3 para o pipeline que trata disso.

### 4.1 Orçamento de conteúdo **[DECIDIDO]**

199 marcos ÷ 6 alas = 33 por sala. A 40 palavras por etiqueta, isso é ~22 min só de leitura em pé.
Não fecha. Corte imposto:

| Camada | Volume | Custo |
|---|---|---|
| **Etiquetas de parede** (sempre visíveis, sem interação) | **≤8 por ala** — manchete + ~40 palavras | ~2 min/ala |
| **Documentos de arquivo** (opcional, dentro de gavetas) | ~12 por ala | opcional |
| **História oral** (toca enquanto você anda) | 2–3 por ala | grátis |
| **Fichas de catálogo** (só após examinar o objeto) | 1 por peça | opcional |

Alvos: **90 segundos de primeira impressão**, **20 min de percurso crítico**, **45 min de
completista**. Um link no WhatsApp tem dwell time de minutos, não de horas — os primeiros 90
segundos *são* o produto.

### 4.2 Peças-herói por ala

Cada uma descrita na pesquisa com contagem de gomos, material, cor e proporção — modelável direto.

| Ala | Herói | Apoio |
|---|---|---|
| Holyoke | **A primeira bola Spalding de couro com cadarço** (c. 1900–1920) + a bola improvisada que Morgan rejeitou (bola de basquete "pesada demais", depois a câmara nua "mole demais") | rede de 1897 a 1,98 m, o Handbook de 1897, uniforme de ginásio, clavas indianas |
| Paris | **A mesa do congresso de Paris, 18–20/04/1947** com os documentos de fundação | bola de 18 gomos com cadarço, rede de corda alcatroada, medalhas de Roma 48 / Praga 49 |
| Tóquio | **A Mikasa de 18 gomos de Tóquio 1964** | uniforme "NK" da Nichibo Kaizuka, kit CCCP, medalha de Tóquio na caixa de laca preta, quadra de praia californiana |
| Ferro e Areia | **A antena de rede pós-1976** (a peça que mudou o bloqueio) | camisa 15 de Kiraly, camisa de capitão de Skorek (Montreal 76), quadra AVP, placa do píer de Manhattan Beach |
| A Reescrita | **A Mikasa tricolor amarelo-azul-branco de 1998**, ao lado da bola toda branca que ela aposentou | primeira camisa de líbero, kit da Itália da "Geração de Fenômenos", kit de Cuba das "Morenas del Caribe" |
| Global | **A Mikasa MVA200 de 8 gomos com dimples** (Pequim 2008) e a V200W atual de 18 gomos | estação de desafio por vídeo, pódio de Paris 2024, quadra da Torre Eiffel, banco do Bernardinho |

### 4.3 Os fios temáticos

O que faz a espiral funcionar. Exemplo, o fio **"A Bola"**: câmara nua improvisada (Ala 1) →
18 gomos com cadarço (Ala 2) → Mikasa de couro de Tóquio (Ala 3) → branca de competição
(Ala 4) → tricolor de 1998 (Ala 5) → MVA200 com dimples (Ala 6). Catalogar as 6 destrava a
vitrine central do átrio e uma medalha. **Você não fecha um fio sem cruzar o prédio inteiro.**

---

## 5. Direção de arte — e o problema que ninguém viu

### 5.1 O buraco jurídico **[SEU AVAL — decide a cara de todas as paredes]**

Um museu de vôlei sem imagens não é museu. E **toda** fotografia histórica de vôlei é protegida:
Tóquio 1964, campeonatos soviéticos, atas da FIVB, Atlanta 96, VNL. Some logos da FIVB e das
federações, escudos de seleções, e imagem/semelhança de atletas. **Eu não posso gerar essas
fotos e você não pode publicá-las.**

Só existem quatro caminhos honestos:

| Rota | O que dá | Custo |
|---|---|---|
| (a) **Domínio público por idade** — obras americanas publicadas antes de 1931 | cobre a Ala 1 e mais nada | grátis |
| (b) **Wikimedia Commons / CC-BY com parede de créditos** | cobre bastante; museu creditar quem emprestou é *diegeticamente perfeito* | exige campo de proveniência por imagem + auditoria |
| (c) **Abstração como direção de arte** — nenhuma foto; toda "imagem" é meia-tinta procedural, reconstrução em contorno, silhueta técnica ou visualização de dados que **eu** desenho | juridicamente limpo, visualmente único, e transforma a limitação na identidade | é a rota mais trabalhosa de acertar, e a mais autoral |
| (d) comprar/licenciar | — | fora de escopo |

**Minha recomendação: (c) + (a).** A Ala 1 usa material real de domínio público — o que dá uma
autoridade documental gostosa logo na abertura — e as outras cinco alas usam representação
autoral. É a única rota que respeita literalmente o "você criando tudo do jogo" e a única em que
você pode publicar sem medo.

### 5.2 A bifurcação estética **[DECIDIDO]**

Duas leituras possíveis de "sala da década de 1930":

- **Pastiche de época:** a sala *parece* 1930. Seis linguagens visuais diferentes, seis vezes o
  custo de arte, risco alto de virar colcha de retalhos.
- **Museu contemporâneo sobre 1930:** uma linguagem institucional coerente; a era aparece no
  conteúdo, na temperatura de luz, no piso e na peça-herói.

**Escolho a segunda.** Mais barata, mais coerente, mais crível e muito mais alcançável
proceduralmente. **Uma ala quebra a regra de propósito** — a de praia (dentro de Ferro e Areia),
que é ao ar livre, clara e desenhada para o contraste doer.

### 5.3 O kit **[DECIDIDO]**

Um kit só, para o prédio inteiro. Cada era varia **apenas** paleta, temperatura de luz, material de
piso e peça-herói.

```
módulo de parede 3,0 m  ·  pé-direito 4,2 m (átrio 8,4 m)  ·  vão de porta 1,6 × 2,4 m
família de vitrines: 3 (torre, mesa, parede)  ·  família de plintos: 2 (bloco, cônico)
família de etiquetas: 2 (parede, inclinada)  ·  perfil de chanfro: 4 mm, 3 segmentos
biblioteca de materiais: ≤12 no prédio todo
```

O chanfro é o item mais importante dessa lista. **Aresta viva de 90° é a assinatura número um de
geometria feita por código.** `bevelSegments: 2–3` com `bevelThickness` de 4–10 mm põe um brilho
especular em cada canto e é a diferença entre "modelo 3D" e "objeto".

Paletas por era (extraídas da pesquisa, já em hex):

- **Holyoke:** âmbar a gás e couro curtido — mel `#B5793C`, couro `#C9A06A`, tijolo `#8E3B2F`,
  azul-marinho `#1F2A44`, vermelho YMCA `#C8102E`. Nada de branco plástico, nada saturado.
- **Paris:** art déco tardio virando austeridade — creme `#E8DFCB`, carvalho `#B07C3F`, oxblood
  `#6E1F2A`, latão `#C9A227`, e um vermelho soviético duro `#C0272D` reservado *só* para a vitrine
  da URSS. A metade dos anos 40 perde saturação: cáqui, kraft `#B9A17E`, cinza jornal.
- **Tóquio:** concreto aparente `#9A9A94`, vermelho soviético `#CE1126`, escarlate hinomaru
  `#BC002D`, tungstênio 2800 K, poeira nos feixes de luz.
- **Ferro e Areia:** vermelho polonês `#D4213D`, ocre de piso `#C56A2A`, vapor de mercúrio com
  dominante verde-ciano — depois estoura no "federalismo festivo" de LA 84 na parte da praia.
- **A Reescrita:** amarelo `#F6C324` + azul `#143C9C` da bola tricolor, azzurro `#0F52A0`, e o
  hipercolor de sportswear dos anos 90 em zigue-zague.
- **Global:** cross-fade dentro da própria sala — metal-halide plano e quente de 2000–2012 virando
  o preto com LED e haze de 2016 em diante.

---

## 6. Sistemas de jogo

### 6.1 Sala como dado **[DECIDIDO — a decisão mais importante do projeto]**

A doença real do código atual é conteúdo hardcoded dentro de componentes de 923 linhas. Ela se
reproduz em escala 10× se eu não matar agora.

```
content/
  rooms/atrium.json          ← casco, colocação de peças do kit, portais, emissores de áudio
  rooms/wing-01-holyoke.json
  exhibits/ball-spalding-1900.json  ← receita de geometria, hotspots de exame, chaves de texto,
                                       ficha de catálogo, efeito de unlock
  documents/*.json
  locks/*.json
  facts.json                 ← a fonte canônica (§6.3)
  i18n/pt-BR.json, en.json
```

O `bake` lê isso e emite GLB + manifesto. O runtime lê o manifesto. **Adicionar a sétima ala é
escrever JSON.**

### 6.2 O mapa — portar o do RE2R quase literalmente

É o sistema mais transferível da série inteira e resolve sozinho metade dos anti-padrões. Três
estados em vez de dois:

- **cinza** = não visitado / sem luz
- **âmbar** = iluminado, mas com peça não catalogada ou documento não lido
- **azul** = completo

Peças não catalogadas aparecem como ícones em miniatura **no lugar**. Cofres e quebra-cabeças
aparecem como `?` com tooltip nomeando o tipo ("Gaveta com combinação — 4 dígitos"). E o que mais
importa: **toda tranca que você encostou é auto-anotada com o nome da credencial**, então você vê
a forma inteira de um destravamento pendente numa tela só. Container diegético: o folheto de visita.

**Regra de ouro:** se o mapa omite algo que o jogador viu com os próprios olhos, ele para de
confiar no mapa e começa a anotar no papel. Isso não é dedicação, é falha de design.

### 6.3 As trancas — e o pipeline de fatos

Taxonomia em 5 níveis, transposta do RE:

| Nível | No RE | Aqui |
|---|---|---|
| 1 | Chaves nomeadas (Espada/Escudo) | **4 Distintivos de disciplina** (Quadra, Praia, Sentado, Neve). Ver o primeiro te diz que existem três. |
| 2 | Emblemas no receptáculo | **3 Medalhas comemorativas** no plinto do átrio → abre o Cofre do Fundador. É o gate do segundo ato e um museu *teria* um plinto de medalhas. |
| 3 | Ferramentas de travessia | **Chave de serviço** (abre uma gaveta qualquer, consumida), **alavanca do quadro de força** (liga uma ala inteira), **carrinho de carga** (abre atalho permanente) |
| 4 | **Trancas de conhecimento** | **O coração da adaptação.** Ajuste o disco para o ano da estreia olímpica. Ajuste a manivela da rede para a altura regulamentar da era. Digite o número da camisa. |
| 5 | Trancas com sabor de ficção | Ordene seis fotografias cronologicamente. Gire o troféu até a data gravada ficar de frente. Case três bolas com suas décadas pelo padrão de costura. |

**O pipeline de fatos — obrigatório, não opcional.** Com nível 4 no jogo, um ano errado é um bug de
progressão. `content/facts.json`:

```ts
type Fact = {
  id: string
  claim: string          // "Estreia olímpica do vôlei"
  value: string          // "1964"
  sources: string[]      // ≥2 independentes para poder virar código de tranca
  confidence: 'high' | 'medium' | 'low'
  verifiedAt: string
  usedAsCode: boolean
}
```

Regras validadas no build: **nenhum fato abaixo de duas fontes independentes pode ser código de
tranca**; toda tranca resolve para um `fact.id` existente; todo código tem exatamente uma fonte
descobrível dentro do museu.

**Escada de dicas (inegociável).** Uma tranca de conhecimento sem saída é um quiz que reprova o
visitante casual — e o próprio anti-padrão que o design nomeia como fatal. Escalada: aos 45 s, a
linha relevante da etiqueta acende; aos 90 s, a gravação do docente repete o ano; na terceira
tentativa, o disco dá um clique no dígito certo. **Nunca falha, só espera.** A tranca precisa ler
como *"vá ler aquele painel"*, jamais como *"você não pode entrar"*.

### 6.4 Examinar-e-girar — o verbo central **[DECIDIDO]**

Toda peça é um objeto 3D que você gira na mão. **A informação está atrás.** A marca do fabricante, a
assinatura, o carimbo de data, a contagem de gomos, o tipo de válvula, a letra manuscrita no verso
da fotografia.

**Regra copiada literalmente do RE: o jogo não conta a peça como catalogada se você não virou.**
Isso converte olhar passivo em leitura ativa e é o equivalente não-violento de um encontro.

### 6.5 O personagem — a resposta honesta **[SEU AVAL]**

Você pediu "do personagem até os assets". Preciso ser direto:

**Nenhuma biblioteca do ecossistema three.js em 2026 gera um humano crível a partir de código.** O
resultado mais óbvio de busca, `mannequin-js`, é **GPL-3.0** — linkar obriga a publicar o site
inteiro sob GPL-3.0. Descartado. Escrever um boneco articulado de cápsulas e esferas é viável em
~300 linhas e parece um manequim de madeira de ateliê — o que é ótimo *como escolha estilística
declarada*, e péssimo como tentativa de pessoa.

**Minha recomendação: primeira pessoa sem avatar.** Zero geometria orgânica. A presença física se
vende com movimento, não com braços:

- head-bob de 2 Hz, ±3 cm, acoplado à velocidade
- roll de 0,5–1° ao andar de lado
- impulso de câmera sincronizado com o passo
- FOV de 70→75 ao correr
- 60–80 ms de suavização na rotação

Mais um **objeto na mão** para dar corpo: a lanterna que você já tem, uma prancheta de curador, o
folheto. Renderizado numa câmera de near-clip própria, então nunca atravessa parede. Seu
`HandTorch.tsx` já é exatamente esse instinto — **mantenha, não coloque um braço nele.**

Um museu vazio de madrugada é uma estética mais forte que um museu com três bonecos CC0 em T-pose
no canto. E por acaso é a opção barata.

*Se você quiser figuras humanas mesmo assim,* a rota limpa é Quaternius/Kenney (CC0, uso comercial,
sem atribuição) declarados como exceção no README. Aí o "eu criei tudo" ganha uma nota de rodapé —
sua decisão.

### 6.6 Áudio — sintetizado, não sampleado **[DECIDIDO]**

Encaixa perfeitamente no brief e custa 0 bytes de download.

- **Passos sintetizados:** rajada de ruído de 25–45 ms num bandpass, com ±12% de variação aleatória
  de pitch e ganho, alternando dois pés, disparada pela **fase do head-bob** (é isso que faz parecer
  andar em vez de flutuar). Mármore: 2–4 kHz, Q alto, decay curto. Carpete: 300–800 Hz, Q baixo.
  Madeira: corpo de 400 Hz + clique de 1,5 kHz. A superfície vem de um raycast no piso. ~40 linhas.
- **Reverb:** um `ConvolverNode` com IR sintetizada (ruído estéreo em decaimento exponencial,
  1,2–2,5 s numa galeria de pedra). Send por sala.
- **Áudio posicional:** o zumbido da luz de uma vitrine, um relógio, um projetor ainda rodando numa
  galeria vazia, murmúrio vazando da sala ao lado. Isso vende transição entre salas melhor que
  qualquer coisa visual.
- **Armadilha clássica:** destrave o `AudioContext` **no mesmo gesto** que pede pointer lock, ou
  funciona no desktop e fica mudo no iOS.

### 6.7 Save, i18n, acessibilidade

**Save [DECIDIDO]:** `localStorage`, sem conta, sem backend, LGPD trivial. **Schema versionado com
caminho de migração/descarte** — ids de conteúdo *vão* mudar, e um save apontando para uma peça
deletada precisa degradar, não quebrar. Autosave silencioso ao trocar de sala + "Continuar" na tela
de título. O livro de visitas é uma *visualização* desse estado, não o mecanismo.

**i18n PT/EN [DECIDIDO] — e tem uma consequência técnica que quase passou batido:** seu
`index.html` é `lang="pt-BR"`, o README é português, o destino é o site Players On — mas português
é o público e inglês é o alcance de portfólio. **Você não pode assar texto em geometria se existem
dois idiomas.** Portanto: todo texto é SDF em runtime via troika (o `<Text>` do drei), o atlas
precisa da faixa completa de diacríticos latinos, PT roda 15–25% mais longo que EN e vai estourar
placas de tamanho físico se o layout não auto-ajustar, e **nenhuma tranca de conhecimento pode ter
palavra como resposta** — só número. Decidir agora, não depois de 200 etiquetas.

**Acessibilidade [DECIDIDO]:** um passeio escuro, em primeira pessoa, com pointer lock e head-bob é
o pior ponto de partida possível. Inegociáveis:

- head-bob e FOV-push **desligados por padrão** (são os dois maiores gatilhos vestibulares)
- slider de velocidade e de suavização de giro
- **controle global de brilho/gama** — a linguagem inteira de progressão é "sem luz", e isso é
  ilegível num celular na rua
- contraste WCAG AA em toda etiqueta; **nada de vermelho/verde como canal de estado no mapa**
- operabilidade total por teclado, inclusive examinar-e-girar
- legendas em toda história oral
- **"modo leitura": uma página HTML estática com todo o texto do museu, numa URL real.** Resolve de
  uma vez acessibilidade, indexação no Google, o caso "recrutador em notebook corporativo travado"
  e o fallback de quem não tem WebGL.

---

## 7. Arquitetura técnica

### 7.1 Stack **[DECIDIDO]** — versões verificadas no npm em 30/07/2026

```
three 0.185.1 (WebGLRenderer — não WebGPU, ver 7.2)
@react-three/fiber 9.6.1  ·  @react-three/drei 10.7.7
three-mesh-bvh 0.9.13     (raycast acelerado + colisão do jogador)
three-bvh-csg 0.0.18      (SÓ em build time, no script Node)
@gltf-transform/cli 4.4.2 ·  meshoptimizer 1.2.0
simplex-noise 4.0.3       (geração de textura em build time)
zustand 5.0.14            (mantém)
vite 8.1.2 (Rolldown 1.1.3) · wrangler 4.106.0
```

**FORA:** `@react-three/rapier` (§7.5) · `mannequin-js` (GPL-3.0) · `gltfjsx` (parado desde 11/2024
e desnecessário para GLBs que eu mesmo autorei — o bake emite um manifesto tipado em vez disso).

### 7.2 WebGPU/TSL: ainda não **[DECIDIDO]**

Medido no tarball do three 0.185.1: `three.module.min.js` = **86.854 B gzip**;
`three.webgpu.min.js` = **185.168 B gzip**. Trocar custa **+98 KB gzip** antes de uma linha de
código. Cobertura de WebGPU está em ~83%, e **Firefox no Android ainda não entregou**. Nada que um
museu precisa justifica isso hoje.

A exceção real é iluminação: `ClusteredLighting` (Forward+) é WebGPU-only. Se o conceito crescer
para "cada peça tem sua própria luz", a migração é uma troca de renderer, não um rewrite. Fica no
roadmap, não na Fase 1.

### 7.3 Como eu crio os assets **[DECIDIDO]**

**Geometria nasce em Node no build, vira GLB, o runtime só carrega.**

O toolkit que funciona: primitivas + `LatheGeometry` (troféus, taças, colunas) + `ExtrudeGeometry`
com bisel (molduras, sancas, rodapés — perfil desenhado como `Shape` e extrudado ao longo de um
retângulo) + `LoftGeometry` (novo no r185 — varre uma seção que muda ao longo de um caminho; é o que
destrava vitrines curvas, alças de troféu e banners numa primitiva só) + `RoundedBoxGeometry` +
CSG para recortes. Depois: `mergeVertices` → `toCreasedNormals` → `computeMikkTSpaceTangents`.

**Verde (sai profissional):** arquitetura, vitrines, plintos, troféus, bolas, redes, banners,
molduras, bancos, guarda-corpos, luminárias, parquet.
**Vermelho (não tento):** rostos, mãos, cabelo, anatomia, tecido simulado. A falha aqui é
*uncanny*, não *estilizada* — e o museu foi desenhado para que a única coisa orgânica seja imagem
em plano.

**Texturas:** função de altura `h(x,y)` com 3–4 oitavas de simplex + worley → albedo rasterizado →
normal derivada por Sobel → roughness remapeada → AO+rough+metal empacotados num único ORM. Tudo em
Node, tudo passando por KTX2.

**Por que build time e não runtime** (a pergunta que o brief manda escolher um lado):

| | runtime | build time |
|---|---|---|
| CSG + mergeVertices de uma sala | centenas de ms de travada na main thread, sem poder ceder | 0 |
| compressão | impossível | meshopt + quantização + KTX2 |
| 100k triângulos | ~2,40 MB de Float32 construídos a cada page load | ~200–400 KB no fio, cacheado pra sempre |
| inspecionável / diffável / testável | não | sim |

**O código procedural continua no repositório — ele *é* o asset.** O GLB é o binário compilado,
exatamente como um `.js` compilado. O "a IA fez tudo" fica intacto.

### 7.4 Compressão

**meshopt, não Draco.** Medido: decoder meshopt = **7.719 B gzip**; Draco = wasm 63.493 +
wrapper 11.605 = **~75 KB gzip**. Dez vezes o peso por um ganho de compressão modestamente melhor e
decodificação mais lenta. O `gltf-transform optimize` já usa meshopt por padrão.

```bash
gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress ktx2 --texture-size 2048 --simplify false
```

**`--simplify false` é crítico aqui:** o padrão é ligado, e rodar o decimador em cima de biséis
ajustados à mão apaga exatamente os loops de aresta que fazem a geometria não parecer feita por
código.

**KTX2:** ETC1S para albedo/ORM/emissive, **UASTC só para normal map** (ETC1S produz banding
visível em normais). Ganho de VRAM: um 2048² sai de 21,33 MB (RGBA8) para 2,67 MB (ETC1S) — **8×**.
Custo fixo: o transcoder Basis é ~260 KB gzip, então só compensa depois de ~4 texturas. Num museu de
6 alas você passa disso com folga. Carregue-o preguiçosamente, num Worker.

### 7.5 O problema do Rapier **[DECIDIDO]**

Rodei `npx vite build` no seu projeto e decompus o chunk byte a byte:

```
chunk único            3.697.098 B cru  /  1.273.720 B gzip
├─ blob base64 do WASM 1.569.399 B      /    803.312 B gzip   ← 63%, Rapier
└─ todo o resto        1.604.564 B      /    463.053 B gzip   ← React + three + drei + seu código
```

O three inteiro é só 86.854 B gzip disso. **A física é 63% do payload comprimido, está inline no
chunk de entrada, bloqueia o first paint e comprime mal** (base64 já custa +33% antes de qualquer
compressão) — e não pode ser stream-compiled, coisa que um `.wasm` de verdade pode.

Um museu precisa de cápsula contra AABB estático. Isso é `shapecast()` do three-mesh-bvh, ~150
linhas. **Mas isso é uma afirmação não validada** que precisa carregar degrau, rampa, escada e a
animação de sentar que você já tem. Então:

> **Provo na fatia vertical. Se não fechar, o Rapier volta — mas em chunk lazy, nunca inline.**

### 7.6 Cloudflare

Limites: script do Worker 3 MB gzip (free), 20.000 arquivos estáticos (free), **25 MiB por arquivo**,
1 s de startup. Servir asset estático é **grátis e não medido**.

**A armadilha:** o header padrão de asset é `Cache-Control: public, max-age=0, must-revalidate`.
Parece que o cache funciona (o edge cacheia), mas o browser dispara uma requisição condicional por
GLB e por KTX2 **a cada navegação**. Num museu de 6 alas isso é dezenas de RTTs antes de qualquer
pixel. Correção — `dist/_headers`:

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/models/*
  Cache-Control: public, max-age=31536000, immutable
/basis/*
  Cache-Control: public, max-age=31536000, immutable
/
  Cache-Control: public, max-age=0, must-revalidate
```

**Embed no Players On** — isso quebra silenciosamente se descoberto tarde: o `<iframe>` do site pai
precisa de `allow="pointer-lock; fullscreen"`, o `AudioContext` precisa de gesto **dentro** do
frame, e o CSP do pai precisa liberar `frame-src` para a origem do worker. Cinco minutos de
trabalho, semanas de confusão se esquecido.

### 7.7 Code splitting

**Vite 8 roda em Rolldown 1.1.3: `manualChunks` do Rollup não existe mais** e `build.rollupOptions`
é alias depreciado. Qualquer snippet pré-2026 não faz nada silenciosamente. A API atual é
`build.rolldownOptions.output.advancedChunks.groups`.

Plano: `three` num chunk longevo, `@react-three/*` em outro, cada ala num chunk lazy, e a landing
page em HTML/CSS puro que só faz `import()` da árvore `<Canvas>` no clique de "Entrar".

### 7.8 Orçamentos — os números que governam tudo

| | Desktop | Android médio |
|---|---|---|
| FPS | 60 @1440p, dpr [1,2] | 30 piso / 45 alvo, dpr 1.0 |
| Draw calls | ≤120 (teto 250) | ≤45 (teto 100) |
| Triângulos em tela | 350k (teto 600k) | 90k (teto 150k) |
| VRAM total | ≤250 MB | ≤110 MB (aba morre acima de ~150) |
| Texturas | ≤120 MB | ≤45 MB |
| Programas de shader | ≤25 no total, todos pré-compilados na tela de loading |
| Luzes por sala visível | 1 direcional com sombra (2048²) + ≤2 spots com sombra (1024²) + ≤8 sem sombra | 1 direcional 1024² |

**Zero point lights com sombra, em qualquer plataforma.** Verificado no fonte
(`WebGLShadowMap.js`): uma point light com sombra custa **6 passes completos de shadow map por
frame** — `const faceCount = shadow.map.isWebGLCubeRenderTarget ? 6 : 1`. Três delas = 18 travessias
de cena extras por frame. Isso muda o design: o museu tem *wall washers* e claraboias, não lustres.

Bundle: **≤250 KB gzip antes do clique**, ≤600 KB depois de entrar. Hoje: 1.273.720 B num chunk só.
Tempo até o primeiro frame interativo: ≤2,5 s no desktop, ≤5 s em 4G.
GLB por sala: ≤1,5 MB (teto 2,5 MB). Nunca mais de 3 salas residentes.

### 7.9 Culling e streaming

Um museu é o caso de livro-texto de **cell-and-portal**: salas quase convexas ligadas por vãos
pequenos. Cada sala ganha um AABB e uma lista de portais; BFS a partir da sala da câmera, recortando
o frustum através de cada quad de portal, e `group.visible = false` no que não for alcançado. **~80
linhas** e reduz 6 alas para 1–3 salas visíveis quase sempre — 3 a 10× menos draw calls e triângulos.
O three não tem occlusion culling embutido e nenhuma solução genérica bate essa.

**Descarregamento é obrigatório e o R3F não faz sozinho.** Ele só libera o que criou via props de
JSX; geometria construída imperativamente num `useMemo` **vaza a cada troca de sala** — é a causa
número um de "fica mais lento cada vez que eu ando". Então: percorrer o grupo chamando
`geometry.dispose()`, `material.dispose()`, `texture.dispose()`, depois `useGLTF.clear(url)`, depois
`renderer.renderLists.dispose()`. E **verificar**: `renderer.info.memory.{geometries,textures}` tem
que voltar à linha de base depois de uma ida-e-volta. Seu `PerfDiagnostics.tsx` vira esse HUD.

---

## 8. QA — como eu me testo sem enxergar

Esse é o maior buraco de um projeto 3D construído por um agente, e é o que separa isso de um
protótipo bonito que quebra na sétima sala.

| Gate | O que faz | Por que |
|---|---|---|
| **Validador do grafo de trancas** | Checagem topológica: toda chave/fato precede sua tranca em algum caminho alcançável, sem ciclos, sem credencial órfã. ~100 linhas. | Pega a classe de bug que arruína a experiência inteira e é invisível em teste manual. |
| **Validador de geometria no bake** | Checagem de manifold após cada op de CSG, triângulos degenerados/NaN, bounding box sã, contagem de triângulos vs. orçamento por asset. | O README do three-bvh-csg avisa: resultados "podem não ser corretamente two-manifold". A degradação é **silenciosa** — buracos e artefatos de sombreamento que eu não consigo ver. |
| **Contact sheets determinísticos** | Rigs de câmera fixos por sala, renderizados headless no CI e diffados por imagem. | **É a única forma de um agente perceber a própria arte.** |
| **Bot de playthrough headless** | Percorre o caminho crítico e afirma conclusão. | Regressão de progressão. |
| **Gate de performance no CI** | Lê `renderer.info` (draw calls, triângulos, programas, memória antes/depois de ida-e-volta) e **falha o build** na regressão. | Sem isso, o orçamento de §7.8 é decoração. |
| **Bake determinístico** | Todo gerador com seed; cache por hash do fonte. | Sem seed, cada bake mexe em todo GLB e o diff do CI vira ruído. |

**Analytics:** Cloudflare Web Analytics — grátis, sem cookie, LGPD-limpo. Instrumentar: entrada,
primeiro movimento, entrada/saída por sala, peças examinadas, trancas tentadas vs. resolvidas, ponto
de abandono. **"Onde eles desistem" é a única pergunta que importa** numa peça dessas.

---

## 9. Roadmap

### Fase 0 — Fatia vertical (a fase que decide se o resto existe)

**Não é uma sala.** É **um hub + uma ala com todos os sistemas de ponta a ponta e os gates de CI de
pé** — porque o risco nunca é a geometria, são os doze sistemas que precisam coexistir.

Quatro espaços: **átrio** (hub, 4 portas visíveis, o plinto, o teto irresolvível no escuro, e o
momento em que a luz acende) + **uma galeria** + **Escritório do Curador** + **um corredor com
atalho de mão única**.

A galeria escolhida é a **Ala 1 (Holyoke)** — de propósito, porque é a única com material de domínio
público, o que força a decisão de direitos de §5.1 imediatamente em vez de adiar.

Dentro dela: 3 peças com examinar-e-girar (uma só cataloga se você realmente virar); 1 porta com
credencial; 1 tranca de conhecimento com a escada de dicas completa; 1 gaveta trancada; o mapa com
os 3 estados e auto-anotação; o catálogo; save/resume com campo de versão; painel de configurações
com idioma, movimento, brilho e qualidade; passos sintetizados com troca de superfície; 1 fonte de
áudio posicional; o beat de porta; a página estática de modo leitura. **Todo conteúdo em PT e EN
vindo de um arquivo de dados.** Bake emitindo 2 GLBs + manifesto por meshopt + KTX2, `_headers`
publicado, Rapier removido ou em chunk lazy, HUD de dev estendido.

**Gates de saída — medidos, não sentidos:**

- ≤250 KB gzip antes do clique
- ≤2,5 s até primeiro frame interativo no desktop / ≤8 s em 4G
- 60 fps no desktop e **≥30 fps num Android médio real** (não perfil de throttle — throttle simula
  CPU, não teto de VRAM)
- `renderer.info.memory` voltando à linha de base após ida-e-volta de sala
- grafo de trancas validando, contact sheet renderizando
- **e o único teste que importa: uma pessoa que nunca viu termina a ala em menos de 8 minutos e
  consegue dizer uma coisa verdadeira que aprendeu sobre vôlei.**

> **Se a Fase 0 custar mais de ~20% do orçamento total, o museu de 6 alas não vai acontecer** e o
> plano deve dizer isso com antecedência: corta para 3 alas e faz as 3 excelentes.

### Fase 1 — Alas 2 e 3 (Paris, Tóquio)
Prova que "adicionar ala é escrever JSON". Se eu precisar escrever React aqui, a arquitetura de
dados falhou e a gente conserta agora, não na sexta ala. Entra o primeiro fio temático completo
(A Bola). Entra o streaming de salas de verdade (3 residentes no máximo).

### Fase 2 — Alas 4, 5, 6 + mezanino
Escala. O mezanino abre e re-contextualiza o térreo inteiro visto de cima — a re-travessia dos 60%,
por mudança de perspectiva em vez de por ameaça. A ala de praia quebra a linguagem visual de
propósito.

### Fase 3 — O Cofre do Fundador e o final
As 3 medalhas entram no plinto. A luz geral acende no átrio pela primeira vez. O cofre **reabre no
átrio como loop**, nunca corre para os créditos — o "colapso linear de final de jogo" é a crítica
mais consistente que a série inteira recebe.

### Fase 4 — Polimento e embed
Passe de acessibilidade, tiers de qualidade por `DetectGPU`, embed no Players On com as permissões
de iframe, analytics, e o modo leitura completo indexável.

---

## 10. Decisões que preciso de você

| # | Decisão | Minha recomendação | Impacto se mudar depois |
|---|---|---|---|
| 1 | **Imagens: abstração autoral, CC-BY creditado, ou só domínio público?** | **Abstração + DP na Ala 1.** Limpo juridicamente, visualmente autoral, 100% "feito pela IA". | **Altíssimo.** Define a cara de toda parede. Decidir antes da Fase 0. |
| 2 | **Personagem: sem avatar, ou humanos CC0 declarados?** | **Sem avatar.** Nada em 2026 gera humano crível por código; `mannequin-js` é GPL-3.0. | Médio. Reversível, mas muda o orçamento de triângulos e a estética. |
| 3 | **6 alas ou 3?** | **Começar com 6 no papel, decidir de verdade no gate da Fase 0.** | Baixo se decidido no gate; alto se decidido na Ala 5. |
| 4 | **Rapier fora ou lazy?** | **Provar `shapecast` na Fase 0.** Se não carregar degrau + sentar, volta em chunk lazy. | Baixo. É um experimento contido. |
| 5 | **Sessão de 45 min ou de 6 min?** | **Ambos, por camadas.** 90 s de impressão, 20 min de crítico, 45 min de completista. | Médio. Define o volume de texto por sala. |
| 6 | **Pastiche de época ou museu contemporâneo sobre a época?** | **Museu contemporâneo.** Uma linguagem, seis paletas. Praia é a exceção. | Alto. Multiplica o custo de arte por ~4 se invertido depois. |

---

## Apêndice — riscos que já sei que existem

1. **Envenenamento de resultado de busca.** Vários artigos de 2026 bem ranqueados sobre three.js e
   WebGPU contêm fatos inventados (um afirmava "three.js r160 lançado em 28/02/2026" — r160 é de
   2023). Um sumarizador de docs durante esta pesquisa inventou um método `BatchedMesh.addGeometryLOD()`
   que não existe. **Toda API é verificada contra o tarball do npm antes de virar código.**
2. **Geometria procedural cai em programmer art por padrão.** Aresta viva, material perfeitamente
   uniforme, zero imperfeição. Isso é trabalho de ofício, não uma biblioteca que se instala.
3. **CSG degrada em silêncio.** Máximo 3 ops encadeadas, `mergeVertices` depois de cada uma, e
   validador no bake. Além disso: saída de CSG usa `drawRange`, o que **quebra o GLTFExporter** se
   não for convertido — um bake ingênuo emite geometria vazia sem avisar.
4. **dpr no mobile é o assassino número um.** `<Canvas>` sem cap explícito de dpr numa tela 3× é uma
   conta de fill rate 9× maior. Todos os orçamentos de Android desta página são inalcançáveis sem
   isso, por melhor que seja o resto.
5. **iOS Safari mata a aba em vez de degradar.** Testar o caminho de streaming em device real.
6. **Hitch de compilação de shader é pior em cena procedural** do que em GLB carregado, porque
   materiais construídos em JS compilam na primeira renderização — ou seja, exatamente quando o
   jogador atravessa a porta. Pré-compilar na tela de loading é obrigatório.
