# Handoff — Museu do Voleibol

Atualizado em 2026-08-09. Este documento é o ponto de entrada para retomar o projeto
sem depender da conversa anterior.

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

Portão verde em 2026-08-08:

- conteúdo: 3 salas válidas;
- energia: 13/13;
- colisão: 21/21;
- kit e posicionamento: 241/241;
- runtime do kit: 19/19;
- runtime das salas: 15/15;
- LOD de salas: 5/5;
- navegação: 22/22;
- `npm run build`: verde.

O único aviso é o preexistente `react(only-export-components)` em `src/main.tsx:17`.

Bake atual:

- **2.427 KB** de GLBs;
- **125.656 triângulos assados**;
- kit `public/models/kit.5071b90c.glb`: 1.774 KB, 84.768 triângulos, 146 nós;
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

---

## 5. Comandos e portões

```bash
npm run dev
npm run bake
npm run check
npm run validate:content
npm run test:power
npm run test:collision
npm run test:kit
npm run test:kit-runtime
npm run test:room-runtime
npm run test:navigation
npm run build
```

Rode `npm run check` antes de qualquer commit. Se mudar geradores, manifesto,
materiais ou colliders, rode `npm run bake` antes do check. Nunca corrija um teste
diminuindo sua cobertura.

O gate de kit soma a receita inteira (`root` + `root__*`) e limita cada prop a
2.500 triângulos. Os casos mais próximos do teto são `coat-stand` (2.344),
`office-flatfile` (2.336), `curator-desk` (2.300) e `door-leaf` (2.236).

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
- `PropertyBinding.sanitizeNodeName` remove `[ ] . : /`; normalize os dois lados
  quando comparar nomes de nós.

---

## 7. Próximas prioridades

1. **Teste num Android médio real.** O frame está sob os tetos móveis, mas 71 draws
   ainda supera o alvo de 45. Se isso for problema no aparelho, implemente portal
   LOD por tier: sala atual completa; adjacente com shell/sinalização, adiando kit,
   exposições, mídia e containers até a travessia.
2. **Playtest com uma pessoa nova.** Meta: concluir a ala em oito minutos e repetir
   ao menos um fato histórico verdadeiro.
3. **Conteúdo de parede.** Criar um canal data-driven de `WallArt`, sem transformar
   toda decoração em `ExhibitData`; duas fotos licenciadas já baixadas ainda não
   são usadas.
4. **Paleta por ala.** Material de piso, temperatura e acabamento ainda têm pouca
   variação real apesar de `PaletteId`.
5. **Áudio e acabamento.** `RoomData.audio` continua sem leitor; pós-processamento,
   desgaste e assimetria seguem ausentes.

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
