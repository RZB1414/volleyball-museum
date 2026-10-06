import assert from 'node:assert/strict'

import { readText } from './lib/readText.ts'

import {
  HOLD_CONFIRM_AFTER_SECONDS,
  HOLD_IDLE,
  HOLD_MAX_STEP_SECONDS,
  HOLD_TAP_SECONDS,
  holdMark,
  holdStep,
  readHoldMark,
  type HoldEvent,
  type HoldGesture,
} from '../src/engine/holdAction.ts'
import {
  actionClick,
  actionPointerDown,
  actionPointerUp,
  beginDirectionalPadSession,
  clickIsThePress,
  createDirectionalPadSession,
  dampTouchLookAxis,
  MOBILE_PAD_DEAD_ZONE,
  NO_ACTION_POINTER,
  ownsDirectionalPadPointer,
  POINTER_CLICK_ECHO_MS,
  pointerLeaveReleases,
  resetDirectionalPadSession,
  sampleDirectionalDrag,
  sampleDirectionalPad,
  type DirectionalPadBounds,
} from '../src/engine/mobileControls.ts'
import {
  cancelPrimaryHold,
  isInteractKey,
  keyMayBeginHold,
  onPrimaryHoldFired,
  pressPrimaryAction,
  primaryHold,
  primaryHoldMark,
  releasePrimaryAction,
  subscribePrimaryAction,
  subscribePrimaryHold,
  tickPrimaryHold,
  triggerPrimaryAction,
} from '../src/engine/primaryAction.ts'
import {
  mobileLandscapeIsBlocked,
  requestMobileImmersiveMode,
  type MobileImmersivePlatform,
  type MobileImmersiveState,
} from '../src/engine/mobileImmersive.ts'
import { doorActionAvailable } from '../src/ui/hudRules.ts'

let passed = 0

async function test(name: string, run: () => void | Promise<void>) {
  await run()
  passed += 1
  console.log(`  pass  ${name}`)
}

const bounds: DirectionalPadBounds = {
  left: 20,
  top: 40,
  width: 100,
  height: 100,
}
const centreX = bounds.left + bounds.width / 2
const centreY = bounds.top + bounds.height / 2
const radius = Math.min(bounds.width, bounds.height) * 0.34

console.log('\nMobile controls')

await test('the centre is neutral', () => {
  assert.deepEqual(sampleDirectionalPad(bounds, centreX, centreY).input, { x: 0, y: 0 })
})

await test('the dead zone filters an accidental thumb tremor', () => {
  const insideDeadZone = radius * (MOBILE_PAD_DEAD_ZONE / 2)
  assert.deepEqual(
    sampleDirectionalPad(bounds, centreX + insideDeadZone, centreY).input,
    { x: 0, y: 0 },
  )
})

await test('right reaches full positive strafe and clamps beyond the ring', () => {
  const edge = sampleDirectionalPad(bounds, centreX + radius, centreY)
  const beyond = sampleDirectionalPad(bounds, centreX + radius * 4, centreY)
  assert.equal(edge.input.x, 1)
  assert.equal(edge.input.y, 0)
  assert.equal(beyond.input.x, 1)
  assert.equal(beyond.visual.x, 1)
})

await test('movement inverts screen-up into forward while look keeps screen-up negative', () => {
  const look = sampleDirectionalPad(bounds, centreX, centreY - radius)
  const move = sampleDirectionalPad(bounds, centreX, centreY - radius, true)
  assert.equal(look.input.y, -1)
  assert.equal(move.input.y, 1)
})

await test('a diagonal remains normalised', () => {
  const diagonal = sampleDirectionalPad(
    bounds,
    centreX + radius,
    centreY + radius,
  )
  assert.ok(Math.hypot(diagonal.input.x, diagonal.input.y) <= 1 + Number.EPSILON)
  assert.ok(Math.hypot(diagonal.visual.x, diagonal.visual.y) <= 1 + Number.EPSILON)
})

await test('a collapsed control cannot emit NaN or movement', () => {
  const collapsed = sampleDirectionalPad(
    { left: 0, top: 0, width: 0, height: 0 },
    20,
    20,
  )
  assert.deepEqual(collapsed.input, { x: 0, y: 0 })
  assert.deepEqual(collapsed.visual, { x: 0, y: 0 })
})

await test('a thumb can land off-centre without moving until it deliberately drags', () => {
  const session = createDirectionalPadSession()
  assert.equal(beginDirectionalPadSession(session, 7, centreX + 20, centreY - 12), true)
  assert.deepEqual(
    sampleDirectionalDrag(bounds, session, centreX + 20, centreY - 12, true).input,
    { x: 0, y: 0 },
  )
  const drag = sampleDirectionalDrag(bounds, session, centreX + 20, centreY - radius, true)
  assert.ok(drag.input.y > 0)
})

await test('orientation reset releases a stale pointer and accepts the next touch', () => {
  const session = createDirectionalPadSession()
  assert.equal(beginDirectionalPadSession(session, 1, 10, 10), true)
  assert.equal(beginDirectionalPadSession(session, 2, 10, 10), false)
  assert.equal(resetDirectionalPadSession(session), 1)
  assert.equal(beginDirectionalPadSession(session, 2, 12, 14), true)
  assert.equal(ownsDirectionalPadPointer(session, 1), false)
  assert.equal(ownsDirectionalPadPointer(session, 2), true)
})

await test('releasing touch look snaps to zero without post-release camera drift', () => {
  assert.equal(dampTouchLookAxis(0.94, 0, 1 / 60, 8), 0)
  assert.ok(dampTouchLookAxis(0, 1, 1 / 60, 8) > 0)
})

await test('portrait blocks a touch device until landscape is active', () => {
  const state: MobileImmersiveState = {
    touchCapable: true,
    landscape: false,
    standalone: false,
    fullscreen: false,
    fullscreenAvailable: false,
  }
  assert.equal(mobileLandscapeIsBlocked(state), true)
  assert.equal(mobileLandscapeIsBlocked({ ...state, landscape: true }), false)
  assert.equal(mobileLandscapeIsBlocked({ ...state, touchCapable: false }), false)
})

await test('mobile entry requests fullscreen before locking landscape', async () => {
  const calls: string[] = []
  let resolveFullscreen = () => undefined
  const fullscreenReady = new Promise<void>((resolve) => {
    resolveFullscreen = resolve
  })
  const initial: MobileImmersiveState = {
    touchCapable: true,
    landscape: false,
    standalone: false,
    fullscreen: false,
    fullscreenAvailable: true,
  }
  const ready = { ...initial, landscape: true, fullscreen: true }
  let reads = 0
  const platform: MobileImmersivePlatform = {
    read: () => (reads++ === 0 ? initial : ready),
    requestFullscreen: () => {
      calls.push('fullscreen')
      return fullscreenReady
    },
    lockLandscape: () => {
      calls.push('landscape')
      return Promise.resolve()
    },
  }

  const request = requestMobileImmersiveMode(platform)
  assert.deepEqual(calls, ['fullscreen', 'landscape'])
  resolveFullscreen()
  assert.deepEqual(await request, ready)
  assert.deepEqual(calls, ['fullscreen', 'landscape', 'landscape'])
})

await test('the shared action honours target priority and stops after one handler', () => {
  const calls: string[] = []
  const unsubscribePower = subscribePrimaryAction(() => {
    calls.push('power')
    return true
  }, 100)
  const unsubscribeDoor = subscribePrimaryAction(() => {
    calls.push('door')
    return true
  }, 400)

  assert.equal(triggerPrimaryAction(), true)
  assert.deepEqual(calls, ['door'])

  unsubscribeDoor()
  assert.equal(triggerPrimaryAction(), true)
  assert.deepEqual(calls, ['door', 'power'])
  unsubscribePower()
})

await test('an action with no eligible target is harmless', () => {
  const unsubscribe = subscribePrimaryAction(() => false, 500)
  assert.equal(triggerPrimaryAction(), false)
  unsubscribe()
})

await test('the Action button shows before every door that answers a press', () => {
  const door = (status: 'blocked' | 'loading' | 'ready' | 'opening', armed = false, blockedBy?: 'other-side' | 'unpowered') => ({
    id: 'atrium-from-holyoke-shortcut',
    targetRoom: 'holyoke',
    status,
    armed,
    ...(blockedBy ? { blockedBy } : {}),
  })
  // The five things the prompt can say about a door.
  assert.equal(doorActionAvailable(door('ready')), true, '"Abrir porta"')
  assert.equal(doorActionAvailable(door('loading')), true, '"Preparando a próxima sala…": the press arms it')
  assert.equal(doorActionAvailable(door('blocked', false, 'unpowered')), true, '"Fechadura sem energia": the press gets the buzz')
  // The defect: from the wrong side of the shortcut the button was gone, so
  // a touch player had nothing to press and the door had nothing to answer.
  assert.equal(
    doorActionAvailable(door('blocked', false, 'other-side')),
    true,
    '"Abre pelo outro lado": on touch the door has no button to answer with',
  )
  assert.equal(doorActionAvailable(door('opening')), false, '"Abrindo…": nothing left to press')
  // Armed already, whatever it says: a second press would do nothing.
  for (const status of ['loading', 'ready', 'blocked'] as const) {
    assert.equal(doorActionAvailable(door(status, true)), false, `${status}, armed`)
  }
  assert.equal(doorActionAvailable(null), false, 'no door in the sights')
})

// ---------------------------------------------------------------------------
// A press that is held (L3): the gesture a term is signed with
// ---------------------------------------------------------------------------

const DESK = { id: 'hall-desk', seconds: 1.2 } as const
const HOLDING = (held: number): HoldGesture => ({ phase: 'holding', id: DESK.id, seconds: DESK.seconds, held })
/** The question on screen, and for how long it has stood there. */
const CONFIRMING = (asked = 0): HoldGesture => ({ phase: 'confirming', id: DESK.id, asked })
/** The question once it has stood its time: from here on the same input answers it. */
const ASKED = CONFIRMING(HOLD_CONFIRM_AFTER_SECONDS)
const press = (request: { id: string; seconds: number } = DESK): HoldEvent => ({ kind: 'press', request })
const tick = (seconds: number, aimed: string | null = DESK.id): HoldEvent => ({ kind: 'tick', seconds, aimed })
const RELEASE: HoldEvent = { kind: 'release' }
const CANCEL: HoldEvent = { kind: 'cancel' }
/** A run of events from idle: the gesture it ends in, and every id it fired on the way. */
function gesture(...events: HoldEvent[]) {
  const fired: string[] = []
  let current: HoldGesture = HOLD_IDLE
  for (const event of events) {
    const step = holdStep(current, event)
    current = step.gesture
    if (step.fired !== null) fired.push(step.fired)
  }
  return { gesture: current, fired }
}
/** So many seconds of frames at twenty a second, aimed at the desk. */
const frames = (seconds: number, aimed: string | null = DESK.id) =>
  Array.from({ length: Math.round(seconds * 20) }, () => tick(0.05, aimed))
/** The same gesture, with the float of its count rounded off: what is asked is the state, not the last bit. */
const rounded = (current: HoldGesture): HoldGesture =>
  current.phase === 'holding' ? { ...current, held: Math.round(current.held * 1000) / 1000 } : current

await test('the table of the held press: every state against every event', () => {
  assert.equal(HOLD_TAP_SECONDS, 0.3)
  assert.equal(HOLD_MAX_STEP_SECONDS, 0.25)
  // Idle: only a press starts anything.
  assert.deepEqual(holdStep(HOLD_IDLE, press()), { gesture: HOLDING(0), fired: null })
  for (const event of [tick(0.1), RELEASE, CANCEL]) assert.deepEqual(holdStep(HOLD_IDLE, event), { gesture: HOLD_IDLE, fired: null }, event.kind)

  // Holding. The same input does not go down twice.
  assert.deepEqual(holdStep(HOLDING(0.5), press()), { gesture: HOLDING(0.5), fired: null })
  assert.deepEqual(holdStep(HOLDING(0.5), press({ id: 'another-desk', seconds: 9 })), { gesture: HOLDING(0.5), fired: null })
  // A frame adds its time; the frame that completes the hold fires it, and the gesture is over.
  assert.deepEqual(rounded(holdStep(HOLDING(0.5), tick(0.1)).gesture), HOLDING(0.6))
  assert.equal(holdStep(HOLDING(0.5), tick(0.1)).fired, null)
  assert.deepEqual(holdStep(HOLDING(1.15), tick(0.1)), { gesture: HOLD_IDLE, fired: DESK.id })
  // The crosshair on anything else, or on nothing, ends it without a word.
  assert.deepEqual(holdStep(HOLDING(1.19), tick(0.1, 'hall-radio')), { gesture: HOLD_IDLE, fired: null })
  assert.deepEqual(holdStep(HOLDING(1.19), tick(0.1, null)), { gesture: HOLD_IDLE, fired: null })
  // Let go at once: a tap, which asks to confirm. Let go later: nothing.
  assert.deepEqual(holdStep(HOLDING(0.1), RELEASE), { gesture: CONFIRMING(0), fired: null })
  assert.deepEqual(holdStep(HOLDING(0.29), RELEASE), { gesture: CONFIRMING(0), fired: null })
  assert.deepEqual(holdStep(HOLDING(0.3), RELEASE), { gesture: HOLD_IDLE, fired: null })
  assert.deepEqual(holdStep(HOLDING(0.6), RELEASE), { gesture: HOLD_IDLE, fired: null })
  assert.deepEqual(holdStep(HOLDING(0.6), CANCEL), { gesture: HOLD_IDLE, fired: null })

  // Confirming: the same thing pressed again is the answer, once the
  // question has stood long enough to be one; another thing starts its own hold.
  assert.equal(HOLD_CONFIRM_AFTER_SECONDS, 0.5)
  assert.deepEqual(holdStep(ASKED, press()), { gesture: HOLD_IDLE, fired: DESK.id })
  // A press that comes sooner is not heard, and the question starts its time
  // over: it has to stand untouched before the same input may answer it.
  for (const early of [0, 0.2, 0.49]) {
    assert.deepEqual(holdStep(CONFIRMING(early), press()), { gesture: CONFIRMING(0), fired: null }, `a press ${early} s after the question signed`)
  }
  const untouched = CONFIRMING(0)
  assert.equal(holdStep(untouched, press()).gesture, untouched, 'a press on a question that has not counted yet made a new gesture')
  for (const stood of [0, HOLD_CONFIRM_AFTER_SECONDS]) {
    assert.deepEqual(holdStep(CONFIRMING(stood), press({ id: 'another-desk', seconds: 2 })), {
      gesture: { phase: 'holding', id: 'another-desk', seconds: 2, held: 0 },
      fired: null,
    })
  }
  // A frame adds its time to the question, with the limit a frame of a hold
  // has, and no further than the time it has to stand: from then on a frame
  // changes nothing, and hands the same gesture back.
  assert.deepEqual(rounded(holdStep(CONFIRMING(0), tick(0.1)).gesture), CONFIRMING(0.1))
  assert.deepEqual(holdStep(CONFIRMING(0), tick(5)), { gesture: CONFIRMING(HOLD_MAX_STEP_SECONDS), fired: null })
  assert.deepEqual(holdStep(CONFIRMING(0.45), tick(0.1)), { gesture: ASKED, fired: null })
  assert.equal(holdStep(ASKED, tick(0.1)).gesture, ASKED, 'a frame of a question already read made a new gesture')
  for (const junk of [0, -3, Number.NaN]) assert.deepEqual(holdStep(CONFIRMING(0.2), tick(junk)), { gesture: CONFIRMING(0.2), fired: null }, String(junk))
  assert.deepEqual(holdStep(CONFIRMING(0.2), tick(0.1, null)), { gesture: HOLD_IDLE, fired: null })
  assert.deepEqual(holdStep(ASKED, tick(0.1, null)), { gesture: HOLD_IDLE, fired: null })
  assert.deepEqual(holdStep(CONFIRMING(0.2), RELEASE), { gesture: CONFIRMING(0.2), fired: null })
  assert.deepEqual(holdStep(ASKED, CANCEL), { gesture: HOLD_IDLE, fired: null })
  assert.deepEqual(holdStep(CONFIRMING(0), CANCEL), { gesture: HOLD_IDLE, fired: null })

  // The reducer writes into nothing it is handed.
  const frozen = Object.freeze(HOLDING(0.2))
  assert.doesNotThrow(() => holdStep(frozen, tick(0.1)))
  assert.equal(frozen.phase === 'holding' && frozen.held, 0.2)
  const asking = Object.freeze(CONFIRMING(0.2))
  assert.doesNotThrow(() => holdStep(asking, tick(0.1)))
  assert.equal(asking.phase === 'confirming' && asking.asked, 0.2)
})

await test('holding for the whole time signs once; letting go early cancels; a tap asks first', () => {
  // 1.2 s held: one signature, and nothing more however long the key stays down.
  assert.deepEqual(gesture(press(), ...frames(1.25)).fired, [DESK.id])
  assert.deepEqual(gesture(press(), ...frames(4)), { gesture: HOLD_IDLE, fired: [DESK.id] })
  assert.deepEqual(gesture(press(), ...frames(1.1)).fired, [], 'signed before the time was up')
  // Let go at 0.6 s: cancelled, and the rest of the frames sign nothing.
  assert.deepEqual(gesture(press(), ...frames(0.6), RELEASE, ...frames(2)), { gesture: HOLD_IDLE, fired: [] })
  // Let go at 0.1 s: «Assinar / Cancelar». «Assinar» signs, «Cancelar» does not.
  const tapped = gesture(press(), ...frames(0.1), RELEASE)
  assert.deepEqual(tapped, { gesture: CONFIRMING(0), fired: [] })
  assert.deepEqual(gesture(press(), ...frames(0.1), RELEASE, ...frames(0.6), press()), { gesture: HOLD_IDLE, fired: [DESK.id] })
  assert.deepEqual(gesture(press(), ...frames(0.1), RELEASE, CANCEL, ...frames(2)), { gesture: HOLD_IDLE, fired: [] })
  // The question waits as long as the player looks at the desk, and goes when they look away.
  assert.deepEqual(gesture(press(), ...frames(0.1), RELEASE, ...frames(30)).gesture, ASKED)
  assert.deepEqual(gesture(press(), ...frames(0.1), RELEASE, ...frames(1), tick(0.05, null), press()).gesture, HOLDING(0))
  // Losing the desk half way cancels, and looking back does not pick the hold up again.
  assert.deepEqual(gesture(press(), ...frames(0.6), tick(0.05, null), ...frames(2)), { gesture: HOLD_IDLE, fired: [] })
})

await test('a second tap by reflex is not the signature: the question has to stand before the same input answers it', () => {
  // «Segure E — Assinar», and a player who taps E: nothing seems to happen,
  // and the reflex is to tap again. The first tap asks; the second used to
  // answer, some tens of milliseconds later, before a word of the question
  // had been read. Two taps were then the fastest way to sign, with the key
  // the player has pressed all night (D11). On glass the lot had seen to
  // it by putting «Cancelar» under the thumb; a keyboard has one key.
  const tap = (held = 0.05) => [press(), ...frames(held), RELEASE]
  const between = (seconds: number) => frames(seconds)
  // Tap, a frame, tap: thirty milliseconds apart.
  assert.deepEqual(gesture(press(), tick(0.016), RELEASE, tick(0.016), press()).fired, [], 'two quick taps signed the deed')
  // As a hand makes it: down, up at 50 ms, down again at 150 ms.
  assert.deepEqual(gesture(...tap(0.05), ...between(0.1), ...tap(0.05)).fired, [])
  // No frame at all between the three events.
  assert.deepEqual(gesture(press(), RELEASE, press()).fired, [])
  // Three in a burst, inside the half second.
  assert.deepEqual(gesture(...tap(), ...between(0.1), ...tap(), ...between(0.1), ...tap()).fired, [])
  // The question is still there after them, and a press it did not hear
  // starts its time over. Counting from when it went up let a hand that
  // kept tapping sign with its third to sixth tap, 0.6 to 0.75 s in: half
  // the time the hold asks for, and still with nothing read.
  const burst = gesture(...tap(), ...between(0.2), ...tap(), ...between(0.4))
  assert.equal(burst.gesture.phase, 'confirming')
  assert.deepEqual(burst.fired, [])
  assert.deepEqual(gesture(...tap(), ...between(0.2), ...tap(), ...between(0.4), press()).fired, [], 'the tap after a burst signed')
  assert.deepEqual(gesture(...tap(), ...between(0.2), ...tap(), ...between(0.6), press()).fired, [DESK.id])
  // E hammered, at any rate a hand keeps up, for two seconds: never a
  // signature. Then the hand stops, the question stands, and one press signs.
  for (const perSecond of [3, 4, 5, 6, 8]) {
    const gap = 1 / perSecond - 0.06
    const hammered: HoldEvent[] = []
    for (let taps = 0; taps < perSecond * 2; taps += 1) {
      hammered.push(press(), ...Array.from({ length: 3 }, () => tick(0.02)), RELEASE)
      hammered.push(...Array.from({ length: Math.max(1, Math.round(gap / 0.02)) }, () => tick(0.02)))
    }
    assert.deepEqual(gesture(...hammered).fired, [], `${perSecond} taps a second signed the deed`)
    assert.deepEqual(gesture(...hammered, ...between(0.6), press()).fired, [DESK.id], `after ${perSecond} taps a second the question could not be answered`)
  }
  // Read, and answered: «Assinar» on glass and E at a keyboard are this press.
  assert.deepEqual(gesture(...tap(), ...between(0.9), ...tap()).fired, [DESK.id])
  // Escape answers at once, however young the question.
  assert.deepEqual(gesture(...tap(), CANCEL, press(), ...frames(0.1)).fired, [])
  // And a press the question did not hear is not a hold either: kept down, it signs nothing behind the question.
  assert.deepEqual(gesture(...tap(), ...between(0.1), press(), ...frames(0.2), RELEASE).fired, [], 'a press the question did not hear went on as a hold')
})

await test('a hold is never left running with nothing held: no modifier starts one, and an uncaptured thumb that leaves lets go', () => {
  // Cmd+E on a Mac: the key coming up is never reported, and the hold would run its time and sign by itself.
  assert.equal(keyMayBeginHold({ ctrlKey: false, metaKey: false, altKey: false }), true)
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey'] as const) {
    assert.equal(keyMayBeginHold({ ctrlKey: false, metaKey: false, altKey: false, [modifier]: true }), false, modifier)
  }
  // A pointer the button could not capture: its release outside the button is never heard.
  assert.equal(pointerLeaveReleases(false), true)
  assert.equal(pointerLeaveReleases(true), false, 'a captured thumb sliding off the button let the hold go')
  // And the components ask: the key handler before it begins a hold, the buttons that press as a pointer leaves.
  const devices = readText(new URL('../src/engine/Devices.tsx', import.meta.url))
  assert.ok(devices.includes('if (isHoldRequest(answer) && keyMayBeginHold(event)) beginPrimaryHold(answer)'), 'the key handler begins a hold whatever is held with it')
  const controls = readText(new URL('../src/ui/MobileControls.tsx', import.meta.url))
  assert.ok(controls.includes('if (pointerLeaveReleases(capturedRef.current)) pointerUp(event)'), 'a pointer leaving the button is not asked about')
  assert.equal((controls.match(/onPointerLeave=\{pointerLeft\}/g) ?? []).length, 2, 'the Action button and «Assinar»')
})

await test('a frozen tab does not sign by itself: one frame counts a quarter of a second at the most', () => {
  // The first frame after a hidden tab carries the whole absence.
  assert.deepEqual(holdStep(HOLDING(0), tick(5)), { gesture: HOLDING(0.25), fired: null })
  assert.deepEqual(gesture(press(), tick(5), tick(5), tick(5), tick(5)).fired, [], 'four frames of five seconds signed')
  assert.deepEqual(gesture(press(), tick(5), tick(5), tick(5), tick(5), tick(5)).fired, [DESK.id])
  // And a frame that is no time at all, or no number, counts nothing.
  for (const junk of [0, -3, Number.NaN, Number.NEGATIVE_INFINITY]) {
    assert.deepEqual(holdStep(HOLDING(0.5), tick(junk)), { gesture: HOLDING(0.5), fired: null }, String(junk))
  }
})

await test('what the HUD is told of a hold is one string, and changes only when the gesture does', () => {
  assert.equal(holdMark(HOLD_IDLE), 'idle')
  assert.equal(holdMark(HOLDING(0)), holdMark(HOLDING(0.9)), 'a frame of holding re-rendered the HUD')
  assert.notEqual(holdMark(HOLDING(0)), holdMark(CONFIRMING(0)))
  assert.equal(holdMark(CONFIRMING(0)), holdMark(ASKED), 'a frame of the question re-rendered the HUD')
  assert.deepEqual(readHoldMark(holdMark(HOLD_IDLE)), { phase: 'idle' })
  assert.deepEqual(readHoldMark(holdMark(HOLDING(0.4))), { phase: 'holding', id: DESK.id, seconds: 1.2 })
  assert.deepEqual(readHoldMark(holdMark(CONFIRMING(0.3))), { phase: 'confirming', id: DESK.id })
  // Ids may carry colons themselves.
  const odd: HoldGesture = { phase: 'holding', id: 'desk:of:the:hall', seconds: 0.5, held: 0 }
  assert.deepEqual(readHoldMark(holdMark(odd)), { phase: 'holding', id: 'desk:of:the:hall', seconds: 0.5 })
  assert.deepEqual(readHoldMark('nonsense'), { phase: 'idle' })
})

await test('the shared action carries the hold: down, frames, up, and whoever listens is told once', () => {
  const fired: string[] = []
  let told = 0
  const stopFired = onPrimaryHoldFired((id) => fired.push(id))
  const stopTold = subscribePrimaryHold(() => {
    told += 1
  })
  const unsubscribe = subscribePrimaryAction(() => DESK, 150)
  try {
    assert.equal(primaryHoldMark(), 'idle')
    // Down: the handler asks for a hold, and nothing is done yet.
    assert.equal(pressPrimaryAction(), 'holding')
    assert.deepEqual(primaryHold(), HOLDING(0))
    assert.equal(told, 1)
    for (let frame = 0; frame < 4; frame += 1) tickPrimaryHold(0.25, DESK.id)
    assert.deepEqual(fired, [])
    assert.equal(told, 1, 'the frames of a hold were told to the HUD one by one')
    tickPrimaryHold(0.25, DESK.id)
    assert.deepEqual(fired, [DESK.id])
    assert.equal(primaryHoldMark(), 'idle')
    assert.equal(told, 2)
    // The key is still down, and comes up: nothing more.
    for (let frame = 0; frame < 8; frame += 1) tickPrimaryHold(0.25, DESK.id)
    releasePrimaryAction()
    assert.deepEqual(fired, [DESK.id])

    // A tap: down and up. The question is on screen, and the same press
    // again answers it once it has stood its time; sooner, it is not heard,
    // and whoever draws the hold is told nothing (the question is as it was).
    assert.equal(pressPrimaryAction(), 'holding')
    tickPrimaryHold(0.1, DESK.id)
    releasePrimaryAction()
    assert.deepEqual(primaryHold(), CONFIRMING(0))
    const asked = told
    assert.equal(pressPrimaryAction(), 'holding', 'a press on a question just asked was taken for its answer')
    releasePrimaryAction()
    assert.deepEqual(fired, [DESK.id])
    tickPrimaryHold(0.25, DESK.id)
    tickPrimaryHold(0.25, DESK.id)
    assert.equal(told, asked, 'the frames of a question were told to the HUD')
    assert.equal(pressPrimaryAction(), 'acted')
    assert.deepEqual(fired, [DESK.id, DESK.id])
    releasePrimaryAction()
    assert.equal(primaryHoldMark(), 'idle')
    // «Cancelar», Escape, the window losing focus: the question goes, unanswered.
    assert.equal(pressPrimaryAction(), 'holding')
    releasePrimaryAction()
    assert.deepEqual(primaryHold(), CONFIRMING(0))
    cancelPrimaryHold()
    assert.equal(primaryHoldMark(), 'idle')
    // Half way and let go; half way and looked away.
    pressPrimaryAction()
    tickPrimaryHold(0.25, DESK.id)
    tickPrimaryHold(0.25, DESK.id)
    releasePrimaryAction()
    pressPrimaryAction()
    tickPrimaryHold(0.25, DESK.id)
    tickPrimaryHold(0.25, null)
    for (let frame = 0; frame < 8; frame += 1) tickPrimaryHold(0.25, DESK.id)
    assert.deepEqual(fired, [DESK.id, DESK.id])
    assert.equal(primaryHoldMark(), 'idle')
    // A click cannot tell down from up: on something held it is a tap, and asks first.
    assert.equal(triggerPrimaryAction(), true)
    assert.deepEqual(primaryHold(), CONFIRMING(0))
    assert.deepEqual(fired, [DESK.id, DESK.id])
    cancelPrimaryHold()
    // With nothing held, the frames and the release do nothing and tell nobody.
    const quiet = told
    tickPrimaryHold(0.25, DESK.id)
    releasePrimaryAction()
    cancelPrimaryHold()
    assert.equal(told, quiet)
  } finally {
    unsubscribe()
    stopFired()
    stopTold()
    cancelPrimaryHold()
  }
})

await test('one press, one action: a handler that asks for a hold keeps the press from the ones below it', () => {
  const calls: string[] = []
  const unsubscribeLamp = subscribePrimaryAction(() => {
    calls.push('lamp')
    return true
  }, 100)
  const unsubscribeDesk = subscribePrimaryAction(() => {
    calls.push('desk')
    return DESK
  }, 150)
  const unsubscribeDoor = subscribePrimaryAction(() => {
    calls.push('door')
    return false
  }, 400)
  try {
    // The door declines, the desk asks to be held, and the lamp behind it is never asked.
    assert.equal(pressPrimaryAction(), 'holding')
    assert.deepEqual(calls, ['door', 'desk'])
    releasePrimaryAction()
    cancelPrimaryHold()
    // With the desk gone the same press reaches the lamp, and acts at once: no hold is left over.
    unsubscribeDesk()
    calls.length = 0
    assert.equal(pressPrimaryAction(), 'acted')
    assert.deepEqual(calls, ['door', 'lamp'])
    assert.equal(primaryHoldMark(), 'idle')
    releasePrimaryAction()
    // And an ordinary action still acts once for a press and its release together.
    calls.length = 0
    assert.equal(triggerPrimaryAction(), true)
    assert.deepEqual(calls, ['door', 'lamp'])
  } finally {
    unsubscribeLamp()
    unsubscribeDesk()
    unsubscribeDoor()
    cancelPrimaryHold()
  }
  assert.equal(pressPrimaryAction(), 'none')
  releasePrimaryAction()
})

await test('on glass the press is the pointer going down, and the click that echoes it does nothing', () => {
  // A click made by a keyboard (or a switch) has no pointer behind it: it is the press.
  assert.equal(clickIsThePress(0, Number.POSITIVE_INFINITY), true)
  assert.equal(clickIsThePress(0, 12), true)
  // A click that follows a pointer is that pointer's echo: the action was taken as it went down.
  assert.equal(clickIsThePress(1, 0), false, 'an ordinary action acted twice on touch: at the pointer and at its click')
  assert.equal(clickIsThePress(1, 180), false)
  assert.equal(clickIsThePress(2, POINTER_CLICK_ECHO_MS), false)
  // The button that replaces Action under the same finger («Assinar») gets
  // the echo of the tap that asked the question: it must not answer it.
  assert.equal(clickIsThePress(1, 40), false)
  // A click with nothing before it, from whatever cannot send a pointer: taken.
  assert.equal(clickIsThePress(1, POINTER_CLICK_ECHO_MS + 1), true)
  assert.equal(clickIsThePress(1, Number.POSITIVE_INFINITY), true)
  assert.ok(POINTER_CLICK_ECHO_MS >= 500 && POINTER_CLICK_ECHO_MS <= 1500)

  // E is told apart from every other key in one place, going down or coming up.
  assert.equal(isInteractKey({ code: 'KeyE' }), true)
  assert.equal(isInteractKey({ code: 'KeyR' }), false)
})

await test('a touch on the Action button, event by event: an ordinary thing acts once, on its click; a held one never on it', () => {
  // What the three buttons do with a pointer, as the component does it: the
  // rules are these three functions, and it only keeps what they hand back.
  type Touch = readonly ['down', boolean, number] | readonly ['up', number] | readonly ['click', number, number]
  /** What a run of events did: every press taken, release sent and click acted on, in order. */
  const run = (...events: Touch[]) => {
    const did: string[] = []
    let pointer = NO_ACTION_POINTER
    for (const event of events) {
      if (event[0] === 'down') {
        pointer = actionPointerDown(event[1], event[2])
        if (event[1]) did.push('press')
      } else if (event[0] === 'up') {
        const up = actionPointerUp(pointer, event[1])
        pointer = up.pointer
        if (up.release) did.push('release')
      } else {
        const click = actionClick(pointer, event[1], event[2])
        pointer = click.pointer
        if (click.press) did.push('click acts')
      }
    }
    return did
  }
  const ORDINARY = false
  const HELD = true

  // A lamp, a door, a drawer: the finger lands and lifts, and the click is the press. Once.
  assert.deepEqual(run(['down', ORDINARY, 1000], ['up', 1080], ['click', 1, 1085]), ['click acts'])
  // Twice in a row, as fast as a thumb goes: twice.
  assert.deepEqual(
    run(['down', ORDINARY, 1000], ['up', 1080], ['click', 1, 1085], ['down', ORDINARY, 1300], ['up', 1380], ['click', 1, 1385]),
    ['click acts', 'click acts'],
  )
  // A desk with a term ready: the pointer is the press and its lifting the release; the click of that tap is its echo.
  assert.deepEqual(run(['down', HELD, 1000], ['up', 1100], ['click', 1, 1105]), ['press', 'release'])
  // Held to the end (1.2 s) and lifted: still no click taken, however late the browser sends it.
  assert.deepEqual(run(['down', HELD, 1000], ['up', 2400], ['click', 1, 2405]), ['press', 'release'])

  // The defect this is here for. A hold that signs takes its button away
  // before the finger lifts: no release and no click are heard. The next
  // tap, on anything, has to act.
  assert.deepEqual(
    run(['down', HELD, 1000], /* signed at 2200; the button is gone */ ['down', ORDINARY, 9000], ['up', 9080], ['click', 1, 9085]),
    ['press', 'click acts'],
    'the tap after a signature did nothing: the pointer that signed was never heard to lift',
  )
  // Even at once, with no time for anything to wear off.
  assert.deepEqual(run(['down', HELD, 1000], ['down', ORDINARY, 2300], ['up', 2310], ['click', 1, 2315]), ['press', 'click acts'])
  // The tap that asks («Assinar / Cancelar») and the answer, each with its echo
  // landing on whatever is under the finger by then: two presses, no click.
  assert.deepEqual(
    run(['down', HELD, 1000], ['up', 1100], ['click', 1, 1105], ['down', HELD, 1600], ['up', 1700], ['click', 1, 1705]),
    ['press', 'release', 'press', 'release'],
  )
  // Then a lamp, straight after the answer: its own click, taken.
  assert.deepEqual(
    run(['down', HELD, 1600], ['up', 1700], ['click', 1, 1705], ['down', ORDINARY, 1900], ['up', 1980], ['click', 1, 1985]),
    ['press', 'release', 'click acts'],
  )
  // A hold cancelled by looking away, the finger lifted over something else:
  // the click of that long press is still the echo of a press, and does not
  // work whatever the crosshair has drifted onto.
  assert.deepEqual(run(['down', HELD, 1000], ['up', 1500], ['click', 1, 1505]), ['press', 'release'])
  // A keyboard on the button, any time: a press of its own.
  assert.deepEqual(run(['click', 0, 500]), ['click acts'])
  assert.deepEqual(run(['down', HELD, 1000], ['up', 1100], ['click', 0, 1105]), ['press', 'release', 'click acts'])
  // A pointer that lifts without having pressed is nobody's release.
  assert.deepEqual(run(['up', 100]), [])
  assert.deepEqual(actionPointerUp(NO_ACTION_POINTER, 100), { pointer: NO_ACTION_POINTER, release: false })
  // One echo to a pointer: a second click after the same press is a press of its own.
  assert.deepEqual(run(['down', HELD, 1000], ['up', 1100], ['click', 1, 1105], ['click', 1, 1200]), ['press', 'release', 'click acts'])
})

console.log(`\n${passed}/${passed} mobile-control checks passed.\n`)
