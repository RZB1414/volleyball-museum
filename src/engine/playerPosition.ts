import { Vector3 } from 'three'

/**
 * The player's world position, published as a mutable singleton.
 *
 * Deliberately NOT in the zustand store. Portal culling, positional audio and
 * the interaction raycast all need this value, and all of them already run
 * inside useFrame — routing a 60 Hz value through React state would re-render
 * the entire tree every frame for no benefit.
 *
 * Its own module so PlayerController.tsx exports only a component and keeps
 * fast refresh working.
 */
export const playerPosition = new Vector3()

/** Shared physical dimensions for movement and transition-door clearance. */
export const PLAYER_CAPSULE = Object.freeze({ radius: 0.3, height: 1.75 })

/**
 * The camera above the capsule's foot. Exported because the headless suites
 * cast the interaction ray and the sight lines from the same eye: a height
 * typed again in a test is a second camera that nobody moves.
 */
export const PLAYER_EYE_HEIGHT = 1.62
