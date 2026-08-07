import { useGameStore } from '../store/gameStore'

export function DrawerPrompt() {
  const deskDrawerFocused = useGameStore((state) => state.deskDrawerFocused)

  if (!deskDrawerFocused) {
    return null
  }

  return (
    <div className="drawer-prompt" aria-label="Gaveta interativa">
      ?
    </div>
  )
}
