# Players On Volleyball Museum

Primeira base jogavel de um museu 3D em primeira pessoa para futura integracao ao site Players On.

## Stack

- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
- @react-three/drei
- @react-three/rapier
- Zustand

## Instalar

```bash
npm install
```

## Rodar em desenvolvimento

```bash
npm run dev
```

Depois abra o endereco mostrado pelo Vite, normalmente:

```bash
http://localhost:5173
```

## Build de producao

```bash
npm run build
```

## Controles

- WASD ou setas: mover
- Mouse: olhar
- Clique no canvas: capturar o mouse com pointer lock
- ESC: liberar o mouse

## Arquivos principais

- `src/App.tsx`: tela inicial e entrada do jogo.
- `src/game/GameCanvas.tsx`: configura o Canvas 3D.
- `src/scenes/MuseumRoomScene.tsx`: cena principal, luzes e fisica.
- `src/world/MuseumRoom.tsx`: sala simples do museu com piso, paredes e colisores.
- `src/player/FirstPersonController.tsx`: movimento em primeira pessoa com teclado, mouse e corpo fisico.
- `src/store/gameStore.ts`: estado global basico com Zustand.
- `src/types/game.ts`: tipos compartilhados do jogo.
- `src/styles/global.css`: estilos globais e tela cheia.

## Proximos passos recomendados

1. Adicionar paredes/corredores modulares para criar um layout estilo Louvre.
2. Criar componentes leves para quadros de exibicao e placas de texto.
3. Separar sistemas futuros: inventario, interacao, audio posicional e save game.
4. Adicionar assets otimizados quando a direcao visual estiver definida.
5. Preparar uma camada de integracao para embed dentro do site Players On.
