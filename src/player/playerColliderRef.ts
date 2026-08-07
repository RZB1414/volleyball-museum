import type { RapierCollider } from '@react-three/rapier'

// Shared outside React state/props so any system that needs to exclude the
// player's own collider from a physics query (e.g. HandTorch's wall-avoidance
// raycast) can do so without prop drilling or re-render churn.
export const playerColliderRef: { current: RapierCollider | null } = { current: null }
