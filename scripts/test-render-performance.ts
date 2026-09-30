import assert from 'node:assert/strict'

import { MUSEUM } from '../src/content/museum.ts'
import {
  createFrameSampleWindow,
  recordFrameTime,
  summariseFrameTimes,
} from '../src/engine/frameMetrics.ts'
import {
  buildGalleryLightRig,
  CURRENT_ROOM_SPOT_SLOTS,
  GALLERY_SPOT_SLOTS,
  RETAINED_ROOM_SPOT_SLOTS,
  type LightingRoom,
} from '../src/engine/galleryLightRig.ts'
import {
  advanceAdaptiveScale,
  isSlowFrame,
  renderDprFor,
} from '../src/engine/renderQuality.ts'
import {
  CAMERA_BASE_VERTICAL_FOV_DEGREES,
  CAMERA_MAX_HORIZONTAL_FOV_DEGREES,
  cameraVerticalFovDegrees,
  horizontalFovDegrees,
} from '../src/engine/cameraProjection.ts'
import {
  buildPowerControlLightRig,
  POWER_CONTROL_POINT_SLOTS,
} from '../src/engine/powerControlLightRig.ts'

let passed = 0
function test(name: string, run: () => void) {
  run()
  passed += 1
  console.log(`  ✓ ${name}`)
}

function room(id: 'atrium' | 'holyoke' | 'office', x: number, fixtureCount: number): LightingRoom {
  return {
    id,
    palette: id === 'holyoke' ? 'holyoke-gaslight' : 'atrium-neutral',
    origin: [x, 0, 0],
    shell: { width: 10, depth: 12, height: 5 },
    kit: Array.from({ length: fixtureCount }, (_, index) => ({
      part: 'ceiling-spot' as const,
      position: [index, 4, index * 0.5] as const,
      lightTarget: [index, 0.8, index] as const,
    })),
  }
}

console.log('\nRender performance')

test('quality tiers cap native DPR and react to R3F performance.current', () => {
  assert.equal(renderDprFor('low', 3, 1), 0.85)
  assert.equal(renderDprFor('medium', 3, 1), 1.2)
  assert.equal(renderDprFor('high', 3, 1), 1.6)
  assert.equal(renderDprFor('medium', 3, 0.65), 0.78)
  assert.equal(renderDprFor('low', 3, 0.5), 0.65)
})

test('adaptive floor never upscales a low-density native display', () => {
  assert.equal(renderDprFor('high', 0.5, 0.5), 0.5)
  assert.equal(renderDprFor('high', 1, 0.5), 0.9)
})

test('mobile medium quality is sharper but stays inside a physical pixel budget', () => {
  const phone = { width: 844, height: 390, mobile: true }
  const tablet = { width: 1366, height: 1024, mobile: true }

  assert.equal(renderDprFor('medium', 3, 1, phone), 1.6)
  assert.equal(renderDprFor('medium', 3, 0.65, phone), 1.04)
  assert.equal(renderDprFor('medium', 2, 0.65, tablet), 1)
  const tabletDpr = renderDprFor('medium', 2, 1, tablet)
  assert.ok(tablet.width * tablet.height * tabletDpr ** 2 <= 1_520_000)
})

test('camera removes fish-eye distortion and caps ultrawide horizontal FOV', () => {
  assert.equal(cameraVerticalFovDegrees(16 / 9), CAMERA_BASE_VERTICAL_FOV_DEGREES)
  assert.ok(horizontalFovDegrees(cameraVerticalFovDegrees(16 / 9), 16 / 9) < 94)

  const phoneAspect = 20 / 9
  const phoneVertical = cameraVerticalFovDegrees(phoneAspect)
  assert.ok(phoneVertical < CAMERA_BASE_VERTICAL_FOV_DEGREES)
  assert.ok(
    Math.abs(
      horizontalFovDegrees(phoneVertical, phoneAspect) -
        CAMERA_MAX_HORIZONTAL_FOV_DEGREES,
    ) < 0.01,
  )
})

test('only rendered slow frames trigger regression', () => {
  assert.equal(isSlowFrame(1 / 60), false)
  assert.equal(isSlowFrame(1 / 30), true)
  assert.equal(isSlowFrame(0.5), true)
})

test('an isolated long foreground frame does not resize the backbuffer', () => {
  const state = { scale: 1, goodSeconds: 0, slowSeconds: 0, adjustmentCooldown: 0 }
  assert.equal(advanceAdaptiveScale(state, 0.5, true), false)
  assert.equal(state.scale, 1)
  assert.equal(advanceAdaptiveScale(state, 1 / 60, false), false)
  assert.equal(state.scale, 1)
})

test('adaptive scale lowers quickly but recovers only after sustained good frames', () => {
  const state = { scale: 1, goodSeconds: 0, slowSeconds: 0, adjustmentCooldown: 0 }
  assert.equal(advanceAdaptiveScale(state, 1 / 30, true), false)
  assert.equal(advanceAdaptiveScale(state, 1 / 30, true), false)
  assert.equal(advanceAdaptiveScale(state, 1 / 30, true), true)
  assert.equal(state.scale, 0.92)

  for (let index = 0; index < 7 * 60; index += 1) {
    advanceAdaptiveScale(state, 1 / 60, false)
  }
  assert.equal(state.scale, 0.92)

  for (let index = 0; index < 61; index += 1) {
    advanceAdaptiveScale(state, 1 / 60, false)
  }
  assert.equal(state.scale, 0.96)
})

test('adaptive scale rate-limits repeated slow frames and respects its floor', () => {
  const state = { scale: 1, goodSeconds: 0, slowSeconds: 0, adjustmentCooldown: 0 }
  for (let index = 0; index < 900; index += 1) {
    advanceAdaptiveScale(state, 1 / 30, true)
  }
  assert.equal(state.scale, 0.65)
})

test('frame metrics expose tail latency and long frames', () => {
  const metrics = summariseFrameTimes(Array.from({ length: 100 }, (_, index) => index + 1))
  assert.deepEqual(metrics, {
    average: 50.5,
    p95: 95,
    p99: 99,
    maximum: 100,
    longFrames: 67,
    samples: 100,
  })
})

test('frame sample window overwrites in O(1) without growing', () => {
  const samples = createFrameSampleWindow()
  for (let value = 1; value <= 605; value += 1) recordFrameTime(samples, value, 600)
  assert.equal(samples.values.length, 600)
  assert.equal(summariseFrameTimes(samples.values).average, 305.5)
  assert.equal(summariseFrameTimes(samples.values).maximum, 605)
})

test('gallery rig keeps eight permanent spots with idle placeholders', () => {
  const atrium = room('atrium', 0, 3)
  const slots = buildGalleryLightRig(atrium)
  assert.equal(slots.length, GALLERY_SPOT_SLOTS)
  assert.equal(slots.filter((slot) => slot.role === 'detail').length, 4)
  assert.equal(slots.filter((slot) => slot.kind === 'idle').length, 4)
})

test('a moving doorway retains one companion key and one wash', () => {
  const atrium = room('atrium', 0, 7)
  const holyoke = room('holyoke', -12, 5)
  const slots = buildGalleryLightRig(atrium, holyoke)
  assert.equal(slots.length, GALLERY_SPOT_SLOTS)
  assert.equal(slots.filter((slot) => slot.role === 'detail').length, 6)
  assert.equal(
    slots.filter((slot) => slot.role === 'retained').length,
    RETAINED_ROOM_SPOT_SLOTS,
  )
  assert.equal(slots.filter((slot) => slot.kind === 'idle').length, 0)
})

test('portal visibility never moves or replaces the current-room light slots', () => {
  const atrium = room('atrium', 0, 7)
  const holyoke = room('holyoke', -12, 5)
  const withoutPortal = buildGalleryLightRig(atrium)
  const withPortal = buildGalleryLightRig(atrium, holyoke)

  assert.deepEqual(
    withPortal.slice(0, CURRENT_ROOM_SPOT_SLOTS),
    withoutPortal.slice(0, CURRENT_ROOM_SPOT_SLOTS),
  )
})

test('returning restores the room light signature exactly', () => {
  const atrium = room('atrium', 0, 7)
  const holyoke = room('holyoke', -12, 7)
  const before = buildGalleryLightRig(atrium, holyoke)
  const throughDoor = buildGalleryLightRig(holyoke, atrium)
  const afterReturn = buildGalleryLightRig(atrium, holyoke)
  const signature = (slots: ReturnType<typeof buildGalleryLightRig>, roomId: string) =>
    slots
      .filter((slot) => slot.roomId === roomId && slot.kind !== 'idle')
      .map(({ role: _role, ...slot }) => slot)

  assert.equal(signature(throughDoor, 'atrium').length, RETAINED_ROOM_SPOT_SLOTS)
  assert.deepEqual(signature(afterReturn, 'atrium'), signature(before, 'atrium'))
})

test('a latched door idles the retained bank until a specific neighbour is revealed', () => {
  const atrium = room('atrium', 0, 7)
  const office = room('office', 12, 2)
  const closed = buildGalleryLightRig(atrium)
  const revealed = buildGalleryLightRig(atrium, office)

  assert.ok(
    closed.slice(CURRENT_ROOM_SPOT_SLOTS).every((slot) => slot.kind === 'idle'),
  )
  assert.ok(
    revealed
      .slice(CURRENT_ROOM_SPOT_SLOTS)
      .every((slot) => slot.roomId === 'office'),
  )
})

test('power controls keep two permanent point slots across a doorway cycle', () => {
  const atrium = MUSEUM.rooms.find((candidate) => candidate.id === 'atrium')
  const office = MUSEUM.rooms.find((candidate) => candidate.id === 'office')
  assert.ok(atrium)
  assert.ok(office)
  const closed = buildPowerControlLightRig(atrium)
  const revealed = buildPowerControlLightRig(atrium, office)

  assert.equal(closed.length, POWER_CONTROL_POINT_SLOTS)
  assert.equal(closed[1]?.powered.baseIntensity, 0)
  assert.deepEqual(
    revealed.map((slot) => slot.roomId),
    ['atrium', 'office'],
  )
  assert.equal(revealed[1]?.powered.baseIntensity, 5)
  assert.equal(revealed[1]?.unpowered.baseIntensity, 3.2)
})

console.log(`${passed}/${passed} render-performance checks passed.\n`)
