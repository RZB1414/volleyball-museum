/**
 * Kit placements and doorway signs.
 *
 * Two gaps this closes, both found by walking into the museum and having no
 * idea what to do:
 *
 *   1. `RoomData.kit` existed in the schema from the first commit and nothing
 *      ever rendered it. Every room was its bare shell plus exhibits, which is
 *      why the atrium — a room with no exhibits — was a completely empty
 *      eighteen-metre box.
 *   2. Nothing named the rooms. A doorway with no sign over it is a dark hole
 *      in a wall; the same doorway with "Ala 1 · Holyoke — 1895–1929" above it
 *      is an invitation. This is the cheapest possible fix for "where do I go",
 *      and a museum would have the sign anyway.
 */

import { Text } from '@react-three/drei'
import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { DoubleSide, type Group } from 'three'

import { MUSEUM } from '../content/museum'
import type { RoomData } from '../content/schema'
import { lookup } from '../i18n'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import { cloneKitPart, disposeKitPart } from './kitPart'
import type { MaterialLibrary } from './materials'

const roomsById = new Map(MUSEUM.rooms.map((room) => [room.id, room]))

/** Places every `kit` entry a room declares. */
export function KitLayer({
  room,
  kitUrl,
  materials,
}: {
  room: RoomData
  kitUrl: string
  materials: MaterialLibrary
}) {
  const { scene } = useGLTF(kitUrl, USE_DRACO, USE_MESHOPT)
  const placements = room.kit ?? []

  if (placements.length === 0) return null

  return (
    <>
      {placements.map((placement, index) => (
        <KitPiece
          key={`${placement.part}-${index}`}
          part={placement.part}
          position={placement.position}
          rotationY={placement.rotationY}
          scale={placement.scale}
          kit={scene as Group}
          materials={materials}
        />
      ))}
    </>
  )
}

function KitPiece({
  part,
  position,
  rotationY = 0,
  scale = 1,
  kit,
  materials,
}: {
  part: string
  position: readonly [number, number, number]
  rotationY?: number
  scale?: number
  kit: Group
  materials: MaterialLibrary
}) {
  const instance = useMemo(
    () => cloneKitPart(kit, part, materials),
    [kit, part, materials],
  )

  useEffect(() => () => disposeKitPart(instance), [instance])

  if (!instance) return null

  return (
    <group
      position={position as unknown as [number, number, number]}
      rotation={[0, rotationY, 0]}
      scale={scale}
    >
      <primitive object={instance} />
    </group>
  )
}

/**
 * A sign over every doorway, naming what is on the other side.
 *
 * Rendered on both faces so it reads walking in and walking out — the return
 * trip needs the name at least as much as the outbound one does.
 */
export function DoorwaySigns({ room, locale }: { room: RoomData; locale: 'pt-BR' | 'en' }) {
  return (
    <>
      {room.portals.map((portal) => {
        const target = roomsById.get(portal.toRoom)
        if (!target) return null

        const title = TITLES[locale][target.id] ?? target.id
        const subtitle = SUBTITLES[locale][target.id] ?? ''

        // Sit the sign just above the door head, pushed a few centimetres off
        // the wall so it never z-fights with the plaster.
        const [x, , z] = portal.position
        const spansZ = Math.abs(Math.cos(portal.rotationY)) < 0.5
        const nudge = 0.14
        const towardRoom = spansZ ? Math.sign(-x) : Math.sign(-z)

        return (
          <group
            key={`sign-${portal.id}`}
            position={[
              x + (spansZ ? nudge * towardRoom : 0),
              portal.height + 0.34,
              z + (spansZ ? 0 : nudge * towardRoom),
            ]}
            rotation={[0, spansZ ? (towardRoom > 0 ? Math.PI / 2 : -Math.PI / 2) : towardRoom > 0 ? 0 : Math.PI, 0]}
          >
            <Text
              fontSize={0.17}
              anchorX="center"
              anchorY="bottom"
              color="#e9dcc0"
              maxWidth={3}
              material-side={DoubleSide}
              material-toneMapped={false}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                position={[0, -0.06, 0]}
                fontSize={0.1}
                anchorX="center"
                anchorY="top"
                color="#9b8f78"
                material-side={DoubleSide}
                material-toneMapped={false}
              >
                {subtitle}
              </Text>
            ) : null}
          </group>
        )
      })}
    </>
  )
}

/**
 * Vinyl lettering on a wall, from `room.signage`.
 *
 * Single-sided on purpose — the back of applied vinyl is the wall, and a
 * double-sided title bleeding through into the next room is the giveaway that
 * text is floating rather than applied.
 */
export function WallSignage({ room, locale }: { room: RoomData; locale: 'pt-BR' | 'en' }) {
  const signs = room.signage ?? []
  if (signs.length === 0) return null

  return (
    <>
      {signs.map((sign) => {
        const size = sign.size ?? 0.5
        const heading = lookup(locale, sign.headingKey)
        const body = sign.bodyKey ? lookup(locale, sign.bodyKey) : ''

        return (
          <group
            key={sign.id}
            position={sign.position as unknown as [number, number, number]}
            rotation={[0, sign.rotationY, 0]}
          >
            <Text
              fontSize={size}
              anchorX={sign.align ?? 'center'}
              anchorY="bottom"
              // Applied vinyl is much darker than the plaster under it. A tone
              // close to the wall reads as a stain; the contrast is what makes
              // it read as lettering from across an eighteen-metre room.
              color="#3c352c"
              letterSpacing={0.08}
              maxWidth={sign.maxWidth ?? 10}
              textAlign={sign.align ?? 'center'}
            >
              {heading}
            </Text>
            {body ? (
              <Text
                position={[0, -size * 0.5, 0]}
                fontSize={size * 0.36}
                anchorX={sign.align ?? 'center'}
                anchorY="top"
                color="#57503f"
                lineHeight={1.5}
                // Body copy wraps tighter than the heading measures: a single
                // line as wide as the title is unreadable at gallery distance.
                maxWidth={(sign.maxWidth ?? 10) * 0.62}
                textAlign={sign.align ?? 'center'}
              >
                {body}
              </Text>
            ) : null}
          </group>
        )
      })}
    </>
  )
}

/**
 * Sign copy, kept here rather than pulled through `useTranslate`.
 *
 * These render inside the Canvas, where a hook that subscribes to the store
 * would re-render the whole room group on every unrelated settings change.
 * Two short lookups are cheaper than that, and the strings are the same ones
 * the journal uses.
 */
const TITLES: Record<'pt-BR' | 'en', Record<string, string>> = {
  'pt-BR': {
    atrium: 'Átrio',
    holyoke: 'Ala 1 · Holyoke',
    office: 'Escritório do curador',
  },
  en: {
    atrium: 'Atrium',
    holyoke: 'Wing 1 · Holyoke',
    office: "Curator's office",
  },
}

const SUBTITLES: Record<'pt-BR' | 'en', Record<string, string>> = {
  'pt-BR': { holyoke: '1895 – 1929' },
  en: { holyoke: '1895 – 1929' },
}
