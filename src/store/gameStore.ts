import { create } from 'zustand'
import type { GameStoreState } from '../types/game'

type GameStoreActions = {
  startGame: () => void
  setPointerLocked: (pointerLocked: boolean) => void
  toggleTorch: () => void
  toggleAmbientLight: () => void
}

export const useGameStore = create<GameStoreState & GameStoreActions>((set) => ({
  gameStarted: false,
  playerStartPosition: [0, 0.9, 4],
  cameraMode: 'firstPerson',
  pointerLocked: false,
  torchEnabled: false,
  ambientLightEnabled: true,
  startGame: () => set({ gameStarted: true }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  toggleTorch: () => set((state) => ({ torchEnabled: !state.torchEnabled })),
  toggleAmbientLight: () =>
    set((state) => ({ ambientLightEnabled: !state.ambientLightEnabled })),
}))
