import assert from 'node:assert/strict'

import {
  beginDirectionalPadSession,
  createDirectionalPadSession,
  dampTouchLookAxis,
  MOBILE_PAD_DEAD_ZONE,
  ownsDirectionalPadPointer,
  resetDirectionalPadSession,
  sampleDirectionalDrag,
  sampleDirectionalPad,
  type DirectionalPadBounds,
} from '../src/engine/mobileControls.ts'
import {
  subscribePrimaryAction,
  triggerPrimaryAction,
} from '../src/engine/primaryAction.ts'
import {
  mobileLandscapeIsBlocked,
  requestMobileImmersiveMode,
  type MobileImmersivePlatform,
  type MobileImmersiveState,
} from '../src/engine/mobileImmersive.ts'

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

console.log(`\n${passed}/${passed} mobile-control checks passed.\n`)
