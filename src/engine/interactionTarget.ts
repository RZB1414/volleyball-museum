/**
 * Which interactable owns the E key — and the prompt — right now.
 *
 * Every system casts its own ray and publishes its own focus, and each listens
 * for E on its own. Deciding the owner in each guard separately is how the
 * office ended up showing "Ler — Caderno do curador" over the lamp the player
 * was looking straight at: the notebook's ray reached past the lamp, both
 * focuses were set, and a fixed priority picked the furniture. One pure answer,
 * asked by every guard AND by the HUD, means the prompt can never name one
 * thing while the key works another.
 *
 * Doors and exhibits keep their absolute precedence. A door is a wall-sized
 * target nothing stands in front of, and an exhibit often rests on furniture
 * whose forgiving chest-high proxy wraps it — by distance alone, the cabinet
 * behind the object would win. The desk-scale targets (containers, devices
 * and power controls) sit side by side, so between them the nearest wins.
 */

import type { MuseumContent, RoomData } from '../content/schema'
import { isModalOpen, type MuseumStore } from '../state/store.ts'
import { radioDevices, type RadioDevice } from './deviceRules.ts'
import { isRoomPowered } from './power.ts'

/** How far each system's ray reaches. Shared with the headless proof. */
export const INTERACTION_REACH = {
  exhibit: 2.6,
  container: 2.4,
  powerControl: 2.7,
  device: 2.6,
  door: 2.6,
} as const

/**
 * The smallest interaction volume, per target, in metres.
 *
 * "Looking at the lamp" rather than threading a crosshair through a 10 mm
 * knob: each proxy is the object's own bounds padded up to this.
 */
export const PROXY_MINIMUM = {
  notebook: [0.3, 0.14, 0.32],
  powerControl: [0.42, 0.48, 0.34],
  radio: [0.3, 0.32, 0.3],
} as const

/**
 * Two hits closer than this are a tie, broken by the old fixed order
 * (container, device, power control). Padded proxies overlap at their edges,
 * and a centimetre of jitter must not flip the prompt every frame.
 */
export const NEAREST_TIE_METRES = 0.03

export type InteractionKind = 'door' | 'exhibit' | 'container' | 'device' | 'power-control'

export type InteractionWinner = {
  readonly kind: InteractionKind
  readonly id: string
  /** False only for a dead radio: it may hold the prompt, never the key. */
  readonly live: boolean
}

type Ranged = { readonly id: string; readonly distance: number }

/** The focuses as plain data, so the arbitration can be proved headless. */
export type FocusSnapshot = {
  readonly door: string | null
  readonly exhibit: string | null
  readonly container: Ranged | null
  readonly device: (Ranged & { readonly live: boolean }) | null
  readonly powerControl: (Ranged & { readonly live: boolean }) | null
}

const DESK_ORDER: readonly InteractionKind[] = ['container', 'device', 'power-control']

export function interactionWinner(focus: FocusSnapshot): InteractionWinner | null {
  if (focus.door) return { kind: 'door', id: focus.door, live: true }
  if (focus.exhibit) return { kind: 'exhibit', id: focus.exhibit, live: true }

  const candidates: (Ranged & { kind: InteractionKind })[] = []
  if (focus.container) candidates.push({ ...focus.container, kind: 'container' })
  if (focus.device?.live) candidates.push({ ...focus.device, kind: 'device' })
  if (focus.powerControl?.live) candidates.push({ ...focus.powerControl, kind: 'power-control' })

  if (candidates.length > 0) {
    const nearest = Math.min(...candidates.map((candidate) => candidate.distance))
    for (const kind of DESK_ORDER) {
      const candidate = candidates.find((entry) => entry.kind === kind)
      if (candidate && candidate.distance <= nearest + NEAREST_TIE_METRES) {
        return { kind, id: candidate.id, live: true }
      }
    }
  }

  // A radio without charge still answers the crosshair ("no charge"), but it
  // never takes the key from anything that works, the lamp above all.
  if (focus.device) return { kind: 'device', id: focus.device.id, live: false }
  return null
}

export type FocusState = Pick<
  MuseumStore,
  | 'examining'
  | 'openedContainer'
  | 'activeLock'
  | 'journalTab'
  | 'focusedTransitionDoor'
  | 'focusedExhibit'
  | 'focusedContainer'
  | 'focusedContainerDistance'
  | 'focusedDevice'
  | 'focusedDeviceDistance'
  | 'focusedPowerControl'
  | 'focusedPowerControlDistance'
> & { readonly progress: { readonly roomsPowered: readonly string[] } }

type InteractionContent = Pick<MuseumContent, 'rooms'>

type Lookups = {
  readonly rooms: ReadonlyMap<string, RoomData>
  readonly radios: ReadonlyMap<string, RadioDevice>
  readonly powerControls: ReadonlyMap<string, RoomData>
}

// The HUD asks this on every store write, touch input included, so the
// content walks happen once per content set rather than once per question.
const lookupsByContent = new WeakMap<InteractionContent, Lookups>()

function lookupsFor(content: InteractionContent): Lookups {
  const cached = lookupsByContent.get(content)
  if (cached) return cached
  const lookups: Lookups = {
    rooms: new Map(content.rooms.map((room) => [room.id as string, room])),
    radios: new Map(radioDevices(content).map((entry) => [entry.device.id, entry.device])),
    powerControls: new Map(
      content.rooms.flatMap((room) =>
        room.powerControl ? [[room.powerControl.id, room] as const] : [],
      ),
    ),
  }
  lookupsByContent.set(content, lookups)
  return lookups
}

/** The store's focuses, with liveness resolved against the content and save. */
export function focusSnapshotOf(state: FocusState, content: InteractionContent): FocusSnapshot {
  const lookups = lookupsFor(content)
  const restored = state.progress.roomsPowered

  let device: FocusSnapshot['device'] = null
  if (state.focusedDevice) {
    const radio = lookups.radios.get(state.focusedDevice)
    const charger = radio ? lookups.rooms.get(radio.poweredBy) : undefined
    device = {
      id: state.focusedDevice,
      distance: state.focusedDeviceDistance,
      live: charger ? isRoomPowered(charger, restored) : false,
    }
  }

  let powerControl: FocusSnapshot['powerControl'] = null
  if (state.focusedPowerControl) {
    const room = lookups.powerControls.get(state.focusedPowerControl)
    powerControl = {
      id: state.focusedPowerControl,
      distance: state.focusedPowerControlDistance,
      // A switch whose room already has power has nothing left to do.
      live: room ? !isRoomPowered(room, restored) : false,
    }
  }

  return {
    door: state.focusedTransitionDoor?.id ?? null,
    exhibit: state.focusedExhibit,
    container: state.focusedContainer
      ? { id: state.focusedContainer, distance: state.focusedContainerDistance }
      : null,
    device,
    powerControl,
  }
}

/** Nothing in the world answers while a modal is open. */
export function interactionWinnerOf(
  state: FocusState,
  content: InteractionContent,
): InteractionWinner | null {
  if (isModalOpen(state)) return null
  return interactionWinner(focusSnapshotOf(state, content))
}

/**
 * The winner as one string, for a React selector.
 *
 * A selector must return something comparable by identity, and the focus
 * distances change every frame the player moves: a string re-renders the
 * prompts only when the answer itself changes.
 */
export function interactionWinnerKey(state: FocusState, content: InteractionContent) {
  const winner = interactionWinnerOf(state, content)
  return winner ? `${winner.kind}:${winner.live ? 'live' : 'dead'}:${winner.id}` : null
}

const KINDS: ReadonlySet<string> = new Set<InteractionKind>([
  'door',
  'exhibit',
  'container',
  'device',
  'power-control',
])

export function parseInteractionWinnerKey(key: string | null): InteractionWinner | null {
  if (!key) return null
  const first = key.indexOf(':')
  const second = key.indexOf(':', first + 1)
  if (first < 0 || second < 0) return null
  const kind = key.slice(0, first)
  if (!KINDS.has(kind)) return null
  return {
    kind: kind as InteractionKind,
    live: key.slice(first + 1, second) === 'live',
    // Ids may contain colons themselves; everything after the second is id.
    id: key.slice(second + 1),
  }
}

/**
 * Whether a press on the canvas should capture the mouse for looking.
 *
 * Never under a modal: a click beside the keypad used to fall through the
 * transparent overlay to the canvas and lock the pointer, hiding the cursor
 * the keypad needs.
 */
export function shouldCapturePointer(input: {
  readonly button: number
  readonly locked: boolean
  readonly modal: boolean
}) {
  return input.button === 0 && !input.locked && !input.modal
}
