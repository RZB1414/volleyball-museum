# Instruções do projeto

**Leia `docs/HANDOFF.md` antes de qualquer coisa.** Ele tem o estado atual, a
próxima tarefa, o backlog priorizado e as armadilhas cujas lições ainda se aplicam.

**O que construir, e em que ordem, está em `docs/PLANO-ATE-O-FINAL.md`:** a
preparação (P0) e os lotes L1 a L24, cada um com escopo, aceite e portões, e o
processo que todo lote segue (§9.1). As decisões do dono, D1 a D36, estão
registradas em `docs/plano-mestre/DECISOES.md`.

Museu do voleibol em primeira pessoa. React 19 · TypeScript 6 · Vite 8 (Rolldown) ·
three r185 · @react-three/fiber · zustand · Cloudflare Workers.

## Não negociável

1. **`npm run check` antes de qualquer commit.** Roda typecheck, oxlint, validação de
   conteúdo e cinco suítes headless (energia, colisão, posicionamento, runtime do
   kit e navegação).
   Se algo ficar vermelho, conserte — não contorne o teste.

2. **Nunca edite arquivos gerados.** `src/content/bake.generated.ts` e
   `src/content/media.generated.ts` saem de `npm run bake` e de
   `npm run media:fetch`. Edite a origem e regere.

3. **Conteúdo é dado.** Salas, peças, documentos e fechaduras vivem em
   `src/content/museum.ts`, tipados em `src/content/schema.ts`. Adicionar conteúdo
   deve ser editar dados e rodar `npm run bake`. Se você precisar de um componente
   React novo para acrescentar uma sala ou uma peça, generalize o runtime — não crie
   um caso especial.

4. **Geometria é procedural e assada em Node.** Não há Blender, não há CSG, não há
   assets comprados. Geradores em `scripts/bake/kit.mjs` e `scripts/bake/parts/*.mjs`,
   usando só os helpers de `scripts/bake/lib/geometry.mjs`.

5. **Posicione peças do kit num grupo embrulhador, nunca com prop de transformação
   no `<primitive>`.** Um prop `position`/`rotation`/`scale` sobrescreve a translação
   de nó que desfaz a quantização e afunda a peça metade da própria altura. Leia o
   comentário no topo de `src/engine/kitPart.ts` — esse bug já enterrou todo objeto
   do museu uma vez, de forma invisível porque era uniforme.

6. **Não reintroduza a árvore antiga.** O protótipo em `src/game/`, `src/world/` e
   `src/player/`, junto do seletor `?v1`, foi removido intencionalmente no commit
   `5e51e24`. O museu data-driven é agora a única aplicação; consulte o histórico
   apenas como referência.

7. **Sem chunking manual no Vite/Rolldown.** Duas tentativas pioraram o payload;
   `vite.config.ts` explica por quê num comentário longo. Deixe o split cair nas
   fronteiras de `lazy()`.

## Comandos

```bash
npm run dev              # servidor de desenvolvimento
npm run bake             # regera geometria e texturas (~18 s)
npm run check            # o portão completo
npm run test:navigation  # caminha uma cápsula real por todas as portas
```

## Estilo

Comentários explicam **por quê**, não o quê — especialmente onde a escolha ingênua
seria errada. Grafia britânica no código. A interface do jogo é em pt-BR: `pt-BR.ts`
é a fonte de verdade e `en.ts` é tipado contra ele, então uma chave faltando em
inglês é erro de compilação. Acentuação correta em qualquer texto em português.

## Verificação visual

A aba do navegador pode estar oculta em ambientes de agente, e aí o R3F não monta
até você dar um tamanho explícito à viewport e emitir `resize`. Existe um harness
para isso: `__museumPerf()`, `__museumStep(n)`, `__museumTeleport(x,y,z,yaw)`,
`__museumScene()` (reporta bounds, material e mapas por malha), `__museumCollision()`,
e um endpoint `/__capture` que grava frames em `docs/contact-sheets/`.
Chame `__museumStep(n)` uma vez com n frames, não n vezes com 1.
