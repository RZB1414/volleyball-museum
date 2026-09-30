/** Physical, localised signage shared by portals and curatorial wall copy. */

import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { FrontSide, type Group } from 'three'

import type { BakedBundle } from '../content/bake.generated'
import { MUSEUM } from '../content/museum'
import type { RoomData, WallSign } from '../content/schema'
import { lookup } from '../i18n'
import { USE_DRACO, USE_MESHOPT } from './bundleCache'
import {
  createKitInstanceGroup,
  disposeKitInstanceGroup,
} from './kitPart'
import type { MaterialLibrary } from './materials'
import {
  MUSEUM_FONT_SEMIBOLD,
  RoomText,
} from './RoomText'
import {
  buildRoomSignageLayout,
  DEDICATION_TEXT_FACE_Z,
  doorwayTitleFontSize,
  WAYFINDING_TEXT_FACE_Z,
} from './signageLayout'

const roomsById = new Map<string, RoomData>(MUSEUM.rooms.map((room) => [room.id, room]))

const IVORY = '#eadcbc'
const WARM_BRASS = '#c7ab72'
const MUTED_BRASS = '#aa9876'

function DedicationCopy({
  room,
  sign,
  locale,
}: {
  room: RoomData
  sign: WallSign
  locale: 'pt-BR' | 'en'
}) {
  const width = sign.width ?? 5.2
  const eyebrow = sign.eyebrowKey ? lookup(locale, sign.eyebrowKey) : ''
  const heading = lookup(locale, sign.headingKey)
  const body = sign.bodyKey ? lookup(locale, sign.bodyKey) : ''
  const left = -width / 2 + 0.34

  return (
    <group
      name={`wall-sign:${room.id}:${sign.id}`}
      position={sign.position as unknown as [number, number, number]}
      rotation={[0, sign.rotationY, 0]}
    >
      {eyebrow ? (
        <RoomText
          readinessId={`wall-sign-eyebrow:${room.id}:${sign.id}`}
          font={MUSEUM_FONT_SEMIBOLD}
          position={[left, 0.49, DEDICATION_TEXT_FACE_Z]}
          fontSize={0.105}
          anchorX="left"
          anchorY="middle"
          color={WARM_BRASS}
          letterSpacing={0.12}
          maxWidth={3.55}
          material-side={FrontSide}
        >
          {eyebrow}
        </RoomText>
      ) : null}
      <RoomText
        readinessId={`wall-sign-heading:${room.id}:${sign.id}`}
        font={MUSEUM_FONT_SEMIBOLD}
        position={[left, 0.16, DEDICATION_TEXT_FACE_Z]}
        fontSize={sign.size ?? 0.33}
        anchorX="left"
        anchorY="middle"
        color={IVORY}
        letterSpacing={0.045}
        maxWidth={sign.maxWidth ?? 3.55}
        material-side={FrontSide}
      >
        {heading}
      </RoomText>
      {body ? (
        <RoomText
          readinessId={`wall-sign-body:${room.id}:${sign.id}`}
          position={[left, -0.14, DEDICATION_TEXT_FACE_Z]}
          fontSize={0.125}
          anchorX="left"
          anchorY="top"
          color="#cbbb9e"
          lineHeight={1.38}
          maxWidth={sign.maxWidth ?? 3.55}
          textAlign="left"
          material-side={FrontSide}
        >
          {body}
        </RoomText>
      ) : null}
    </group>
  )
}

function VinylCopy({
  room,
  sign,
  locale,
}: {
  room: RoomData
  sign: WallSign
  locale: 'pt-BR' | 'en'
}) {
  const size = sign.size ?? 0.5
  const heading = lookup(locale, sign.headingKey)
  const body = sign.bodyKey ? lookup(locale, sign.bodyKey) : ''

  return (
    <group
      name={`wall-sign:${room.id}:${sign.id}`}
      position={sign.position as unknown as [number, number, number]}
      rotation={[0, sign.rotationY, 0]}
    >
      <RoomText
        readinessId={`wall-sign-heading:${room.id}:${sign.id}`}
        font={MUSEUM_FONT_SEMIBOLD}
        fontSize={size}
        anchorX={sign.align ?? 'center'}
        anchorY="bottom"
        color="#3c352c"
        letterSpacing={0.075}
        maxWidth={sign.maxWidth ?? 10}
        textAlign={sign.align ?? 'center'}
        material-side={FrontSide}
      >
        {heading}
      </RoomText>
      {body ? (
        <RoomText
          readinessId={`wall-sign-body:${room.id}:${sign.id}`}
          position={[0, -size * 0.5, 0]}
          fontSize={size * 0.36}
          anchorX={sign.align ?? 'center'}
          anchorY="top"
          color="#57503f"
          lineHeight={1.5}
          maxWidth={(sign.maxWidth ?? 10) * 0.62}
          textAlign={sign.align ?? 'center'}
          material-side={FrontSide}
        >
          {body}
        </RoomText>
      ) : null}
    </group>
  )
}

export function RoomSignage({
  room,
  locale,
  kitBundle,
  materials,
}: {
  room: RoomData
  locale: 'pt-BR' | 'en'
  kitBundle: BakedBundle
  materials: MaterialLibrary
}) {
  const { scene } = useGLTF(kitBundle.url, USE_DRACO, USE_MESHOPT)
  const kit = scene as Group
  const layout = useMemo(() => buildRoomSignageLayout(room, roomsById), [room])
  const substrates = useMemo(
    () => createKitInstanceGroup(kit, layout.placements, materials),
    [kit, layout.placements, materials],
  )

  useEffect(() => () => disposeKitInstanceGroup(substrates), [substrates])

  return (
    <group name={`room-signage:${room.id}`}>
      <primitive object={substrates} dispose={null} />
      {layout.doorways.map((sign) => {
        const eyebrow = sign.eyebrowKey ? lookup(locale, sign.eyebrowKey) : ''
        const title = lookup(locale, sign.titleKey)
        const subtitle = sign.subtitleKey ? lookup(locale, sign.subtitleKey) : ''

        return (
          <group
            key={sign.id}
            name={`doorway-sign:${sign.id}`}
            position={sign.position as [number, number, number]}
            rotation={[0, sign.rotationY, 0]}
          >
            {eyebrow ? (
              <RoomText
                readinessId={`doorway-eyebrow:${sign.id}`}
                font={MUSEUM_FONT_SEMIBOLD}
                position={[0, 0.205, WAYFINDING_TEXT_FACE_Z]}
                fontSize={0.09}
                anchorX="center"
                anchorY="middle"
                color={WARM_BRASS}
                letterSpacing={0.105}
                maxWidth={2.14}
                textAlign="center"
                material-side={FrontSide}
              >
                {eyebrow}
              </RoomText>
            ) : null}
            <RoomText
              readinessId={`doorway-title:${sign.id}`}
              font={MUSEUM_FONT_SEMIBOLD}
              position={[0, eyebrow ? 0.015 : 0.07, WAYFINDING_TEXT_FACE_Z]}
              fontSize={doorwayTitleFontSize(title)}
              anchorX="center"
              anchorY="middle"
              color={IVORY}
              letterSpacing={0.035}
              maxWidth={2.18}
              textAlign="center"
              whiteSpace="nowrap"
              material-side={FrontSide}
            >
              {title}
            </RoomText>
            {subtitle ? (
              <RoomText
                readinessId={`doorway-subtitle:${sign.id}`}
                position={[0, -0.215, WAYFINDING_TEXT_FACE_Z]}
                fontSize={0.102}
                anchorX="center"
                anchorY="middle"
                color={MUTED_BRASS}
                letterSpacing={0.09}
                maxWidth={2.14}
                textAlign="center"
                material-side={FrontSide}
              >
                {subtitle}
              </RoomText>
            ) : null}
          </group>
        )
      })}
      {layout.walls.map((sign) =>
        sign.presentation === 'dedication-plaque' ? (
          <DedicationCopy key={sign.id} room={room} sign={sign} locale={locale} />
        ) : (
          <VinylCopy key={sign.id} room={room} sign={sign} locale={locale} />
        ),
      )}
    </group>
  )
}
