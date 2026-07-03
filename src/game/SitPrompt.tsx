import { useGameStore } from '../store/gameStore'

export function SitPrompt() {
  const canSit = useGameStore((state) => state.canSit)
  const sitting = useGameStore((state) => state.sitting)

  if (!canSit && !sitting) {
    return null
  }

  return (
    <div className="sit-prompt">{sitting ? 'Pressione Q para levantar' : 'Pressione Q para sentar'}</div>
  )
}
