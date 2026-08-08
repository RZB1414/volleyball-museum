/** Headless proof of the room-power progression contract. */

import assert from 'node:assert/strict'

import { MUSEUM } from '../src/content/museum.ts'
import { validatePower } from '../src/content/validate.ts'
import { isRoomPowered } from '../src/engine/power.ts'
import { useMuseum } from '../src/state/store.ts'

let checks = 0
const check = (message: string, condition: boolean) => {
  checks += 1
  assert.ok(condition, message)
  console.log(`  pass  ${message}`)
}

console.log('Room power:')

const powerErrors = validatePower(MUSEUM).filter((issue) => issue.severity === 'error')
check('content has no invalid or missing power controls', powerErrors.length === 0)

const controlIds = MUSEUM.rooms.flatMap((room) =>
  room.powerControl ? [room.powerControl.id] : [],
)
check('power control ids are unique', new Set(controlIds).size === controlIds.length)

check(
  'an authored powered default is on without save progress',
  isRoomPowered({ id: 'authored-on', startsPowered: true }, []),
)
check(
  'an authored unpowered default stays off without save progress',
  !isRoomPowered({ id: 'authored-off', startsPowered: false }, []),
)
check(
  'saved restoration overrides an unpowered authored default',
  isRoomPowered({ id: 'authored-off', startsPowered: false }, ['authored-off']),
)

const store = useMuseum.getState()
store.resetProgress()
for (const room of MUSEUM.rooms) {
  check(
    `${room.id} initial runtime power matches startsPowered`,
    isRoomPowered(room, useMuseum.getState().progress.roomsPowered) === room.startsPowered,
  )
}

const unpoweredRoom = MUSEUM.rooms.find((room) => !room.startsPowered)
assert.ok(unpoweredRoom, 'the vertical slice needs one initially unpowered room')
useMuseum.getState().powerRoom(unpoweredRoom.id)
useMuseum.getState().powerRoom(unpoweredRoom.id)
check(
  'powerRoom restores once and remains idempotent',
  useMuseum.getState().progress.roomsPowered.filter((id) => id === unpoweredRoom.id).length === 1,
)

useMuseum.getState().applyUnlockEffect({ kind: 'power-room', roomId: 'effect-room' })
useMuseum.getState().applyUnlockEffect({ kind: 'open-lock', lockId: 'effect-lock' })
useMuseum.getState().applyUnlockEffect({
  kind: 'grant-credential',
  credential: { kind: 'tool', id: 'breaker-handle' },
})
useMuseum.getState().applyUnlockEffect({
  kind: 'reveal-document',
  documentId: 'effect-document',
})
const progress = useMuseum.getState().progress
check('power-room unlock effects are applied', progress.roomsPowered.includes('effect-room'))
check('open-lock unlock effects are applied', progress.locksOpened.includes('effect-lock'))
check(
  'grant-credential unlock effects use the lock graph key format',
  progress.credentials.includes('tool:breaker-handle'),
)
check(
  'reveal-document unlock effects enter the archive progress',
  progress.documentsRead.includes('effect-document'),
)

useMuseum.getState().resetProgress()
console.log(`${checks}/${checks} checks passed`)
