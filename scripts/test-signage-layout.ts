import { MUSEUM } from '../src/content/museum.ts'
import { en } from '../src/content/i18n/en.ts'
import { ptBR } from '../src/content/i18n/pt-BR.ts'
import type { RoomData } from '../src/content/schema.ts'
import {
  buildRoomSignageLayout,
  doorwayTitleFontSize,
  WAYFINDING_PLAQUE_HEIGHT,
} from '../src/engine/signageLayout.ts'

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

console.log('Architectural signage:')

const dictionaries = { 'pt-BR': ptBR, en } as const
const lookup = (locale: keyof typeof dictionaries, key: string) =>
  (dictionaries[locale] as Record<string, string>)[key] ?? key

const roomsById = new Map<string, RoomData>(MUSEUM.rooms.map((room) => [room.id, room]))
const layouts = new Map(
  MUSEUM.rooms.map((room) => [room.id, buildRoomSignageLayout(room, roomsById)]),
)

check(
  'the public atrium face names only the two lateral rooms',
  layouts.get('atrium')?.doorways.length === 2,
)
check(
  'the Holyoke service shortcut is not disguised as a second public entrance',
  !layouts.get('atrium')?.doorways.some((sign) => sign.id.includes('shortcut')) &&
    !layouts.get('holyoke')?.doorways.some((sign) => sign.id.includes('shortcut')),
)
check(
  'Holyoke uses the navy architectural plaque',
  layouts
    .get('atrium')
    ?.doorways.some((sign) => sign.titleKey === 'room.holyoke.sign.title' && sign.plaquePart === 'wayfinding-plaque-navy') === true,
)
check(
  'the curator office uses the archive-green architectural plaque',
  layouts
    .get('atrium')
    ?.doorways.some((sign) => sign.titleKey === 'room.office.sign.title' && sign.plaquePart === 'wayfinding-plaque-green') === true,
)

for (const room of MUSEUM.rooms) {
  const layout = layouts.get(room.id)
  if (!layout) continue

  for (const sign of layout.doorways) {
    const portalId = sign.id.slice(room.id.length + 1)
    const portal = room.portals.find((candidate) => candidate.id === portalId)
    if (!portal) continue
    const bottom = sign.position[1] - WAYFINDING_PLAQUE_HEIGHT / 2
    const top = sign.position[1] + WAYFINDING_PLAQUE_HEIGHT / 2
    check(
      `${sign.id} clears the door head`,
      bottom >= portal.height + 0.04,
      `bottom ${bottom.toFixed(3)}, head ${portal.height.toFixed(3)}`,
    )
    check(
      `${sign.id} clears the room ceiling`,
      top <= room.shell.height - 0.075,
      `top ${top.toFixed(3)}, ceiling ${room.shell.height.toFixed(3)}`,
    )

    const inwardX = -sign.position[0]
    const inwardZ = -sign.position[2]
    const facingX = Math.sin(sign.rotationY)
    const facingZ = Math.cos(sign.rotationY)
    check(
      `${sign.id} faces into its room`,
      inwardX * facingX + inwardZ * facingZ > 0,
    )

    for (const locale of ['pt-BR', 'en'] as const) {
      const title = lookup(locale, sign.titleKey)
      const size = doorwayTitleFontSize(title)
      check(
        `${sign.id} ${locale} title stays in the legible fitted range`,
        title !== sign.titleKey && size >= 0.155 && size <= 0.285,
        `${title} at ${size.toFixed(3)} m`,
      )
    }
  }
}

const atrium = roomsById.get('atrium')
const dedication = atrium?.signage?.find((sign) => sign.id === 'atrium-dedication')
check(
  'the atrium wall copy is mounted on a physical dedication panel',
  dedication?.presentation === 'dedication-plaque' &&
    dedication.width === 5.2 &&
    dedication.height === 1.5,
)
check(
  'the dedication panel is part of the batched signage substrate',
  layouts
    .get('atrium')
    ?.placements.some((placement) => placement.part === 'dedication-plaque') === true,
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exitCode = 1
