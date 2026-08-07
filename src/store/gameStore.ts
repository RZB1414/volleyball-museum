import { create } from 'zustand'
import type { GameStoreState } from '../types/game'

const MIN_JOYSTICK_SENSITIVITY = 0.5
const MAX_JOYSTICK_SENSITIVITY = 1.8
const DEFAULT_JOYSTICK_SENSITIVITY = 1

function clampJoystickSensitivity(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_JOYSTICK_SENSITIVITY
  }

  return Math.min(Math.max(value, MIN_JOYSTICK_SENSITIVITY), MAX_JOYSTICK_SENSITIVITY)
}

type GameStoreActions = {
  startGame: () => void
  setPointerLocked: (pointerLocked: boolean) => void
  setMobileMove: (x: number, y: number) => void
  setMobileLook: (x: number, y: number) => void
  setMobileMoveSensitivity: (mobileMoveSensitivity: number) => void
  setMobileLookSensitivity: (mobileLookSensitivity: number) => void
  resetMobileControls: () => void
  toggleTorch: () => void
  toggleAmbientLight: () => void
  setCanSit: (canSit: boolean) => void
  toggleSit: () => void
  setDeskDrawerFocused: (deskDrawerFocused: boolean) => void
  toggleDeskDrawer: () => void
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
  mobileMoveSensitivity: 1,
  mobileLookSensitivity: 1,
  sitting: false,
  canSit: false,
  deskDrawerFocused: false,
  deskDrawerOpen: false,
  startGame: () => set({ gameStarted: true }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setMobileMove: (x, y) => set({ mobileMove: { x, y } }),
  setMobileLook: (x, y) => set({ mobileLook: { x, y } }),
  setMobileMoveSensitivity: (mobileMoveSensitivity) =>
    set({
      mobileMove: { x: 0, y: 0 },
      mobileMoveSensitivity: clampJoystickSensitivity(mobileMoveSensitivity),
    }),
  setMobileLookSensitivity: (mobileLookSensitivity) =>
    set({
      mobileLook: { x: 0, y: 0 },
      mobileLookSensitivity: clampJoystickSensitivity(mobileLookSensitivity),
    }),
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
  setDeskDrawerFocused: (deskDrawerFocused) => set({ deskDrawerFocused }),
  toggleDeskDrawer: () => set((state) => ({ deskDrawerOpen: !state.deskDrawerOpen })),
}))
