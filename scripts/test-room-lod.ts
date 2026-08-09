/** Focused guards for the generic portal detail policy. */

import { roomRenderTier } from '../src/engine/roomLod.ts'

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}`)
    passed += 1
  } else {
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
    failed += 1
  }
}

console.log('Room portal LOD:')

check(
  'the current room renders full detail',
  roomRenderTier('room-a', 'room-a', true) === 'detail',
)
check(
  'current room detail wins over a stale visibility set',
  roomRenderTier('room-a', 'room-a', false) === 'detail',
)
check(
  'a visible adjacent room renders only its shell',
  roomRenderTier('room-b', 'room-a', true) === 'shell',
)
check(
  'a non-visible room remains hidden',
  roomRenderTier('room-c', 'room-a', false) === 'hidden',
)
check(
  'crossing rooms promotes the destination without id-specific rules',
  roomRenderTier('future-wing', 'future-wing', true) === 'detail' &&
    roomRenderTier('room-a', 'future-wing', true) === 'shell',
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
