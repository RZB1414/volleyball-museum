import { create } from 'zustand'
import type { GameStoreState } from '../types/game'

type GameStoreActions = {
  startGame: () => void
  setPointerLocked: (pointerLocked: boolean) => void
  setMobileMove: (x: number, y: number) => void
  setMobileLook: (x: number, y: number) => void
  resetMobileControls: () => void
  toggleTorch: () => void
  toggleAmbientLight: () => void
  setCanSit: (canSit: boolean) => void
  toggleSit: () => void
}

export const useGameStore = create<GameStoreState & GameStoreActions>((set) => ({
  gameStarted: false,
  playerStartPosition: [0, 0.9, 4],
  cameraMode: 'firstPerson',
  pointerLocked: false,
  torchEnabled: false,
  ambientLightEnabled: true,
  mobileMove: { x: 0, y: 0 },
  mobileLook: { x: 0, y: 0 },
  sitting: false,
  canSit: false,
  startGame: () => set({ gameStarted: true }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setMobileMove: (x, y) => set({ mobileMove: { x, y } }),
  setMobileLook: (x, y) => set({ mobileLook: { x, y } }),
  resetMobileControls: () =>
    set({
      mobileMove: { x: 0, y: 0 },
      mobileLook: { x: 0, y: 0 },
    }),
  toggleTorch: () => set((state) => ({ torchEnabled: !state.torchEnabled })),
  toggleAmbientLight: () =>
    set((state) => ({ ambientLightEnabled: !state.ambientLightEnabled })),
  setCanSit: (canSit) => set({ canSit }),
  toggleSit: () =>
    set((state) => {
      if (state.sitting) {
        return { sitting: false }
      }

      return state.canSit ? { sitting: true } : state
    }),
}))
