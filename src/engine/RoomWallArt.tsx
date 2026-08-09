/**
 * Data-driven wall photography and document scans.
 *
 * This layer is deliberately separate from exhibits. A photograph can make a
 * wall specific and historically grounded without gaining interaction state,
 * collision geometry or a catalogue entry. Assets come from the fetched and
 * project-authored media catalogues, so the schema prevents a room from naming
 * an uncurated file.
 */

import { Text } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  DoubleSide,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three'

import { formatCreditLine } from '../content/credit'
import { AUTHORED_MEDIA } from '../content/media.authored'
import { GENERATED_MEDIA } from '../content/media.generated'
import type { MediaAsset, RoomData, WallArtData } from '../content/schema'
import { useMuseum } from '../state/store'

const CURATED_MEDIA = [...GENERATED_MEDIA, ...AUTHORED_MEDIA] as const
type CuratedMedia = (typeof CURATED_MEDIA)[number]

const mediaById = new Map<CuratedMedia['id'], CuratedMedia>(
  CURATED_MEDIA.map((asset) => [asset.id, asset]),
)

const FRAME_BORDER = 0.065
const MOUNT_BORDER = 0.025
const FRAME_DEPTH = 0.024
const THIN_FRAME_BORDER = 0.042
const CREDIT_GAP = 0.052
const CREDIT_SIZE = 0.03

/**
 * Builds plane UVs for a centred `cover` crop.
 *
 * The authored rectangle is allowed to differ from the source aspect because
 * real museum displays standardise frame sizes. Cropping UVs preserves people,
 * architecture and printed type at their real proportions; scaling the plane's
 * texture would silently stretch the historical record.
 */
function coverGeometry(width: number, height: number, sourceAspect: number) {
  const geometry = new PlaneGeometry(width, height)
  const frameAspect = width / height

  const repeatX = sourceAspect > frameAspect ? frameAspect / sourceAspect : 1
  const repeatY = sourceAspect < frameAspect ? sourceAspect / frameAspect : 1
  const offsetX = (1 - repeatX) / 2
  const offsetY = (1 - repeatY) / 2
  const uv = geometry.attributes.uv

  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(
      index,
      offsetX + uv.getX(index) * repeatX,
      offsetY + uv.getY(index) * repeatY,
    )
  }
  uv.needsUpdate = true

  return geometry
}

function WallArtPanel({ art, asset }: { art: WallArtData; asset: MediaAsset }) {
  const locale = useMuseum((state) => state.settings.locale)
  // useLoader shares its cache with FramedMedia because both use the same
  // TextureLoader + URL key. Adding decorative copies therefore does not fetch
  // or decode a second copy of an exhibit photograph.
  const texture = useLoader(TextureLoader, asset.src) as Texture
  const geometry = useMemo(
    () => coverGeometry(art.width, art.height, asset.aspect),
    [art.height, art.width, asset.aspect],
  )
  const credit = useMemo(
    () => formatCreditLine(asset.credit, locale),
    [asset.credit, locale],
  )

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])

  useEffect(() => () => geometry.dispose(), [geometry])

  const framed = art.presentation !== 'flush'
  const thinFramed = art.presentation === 'thin-framed'
  const border = thinFramed ? THIN_FRAME_BORDER : FRAME_BORDER + MOUNT_BORDER
  const outerWidth = art.width + (framed ? border * 2 : 0)
  const outerHeight = art.height + (framed ? border * 2 : 0)
  const printDepth = framed ? FRAME_DEPTH + 0.003 : 0.003

  return (
    <group
      name={`wall-art:${art.id}`}
      position={art.position as unknown as [number, number, number]}
      rotation={[0, art.rotationY, 0]}
    >
      {/* The group origin is the wall datum; frames grow only into +Z. Large
          murals are declared flush, matching dye-sublimated museum wall film
          without paying two backing draws for every panel in a photo frieze. */}
      {framed ? (
        <>
          <mesh position={[0, 0, FRAME_DEPTH / 2]} castShadow receiveShadow>
            <boxGeometry args={[outerWidth, outerHeight, FRAME_DEPTH]} />
            <meshStandardMaterial color="#35261c" roughness={0.52} />
          </mesh>

          {thinFramed ? null : (
            <mesh position={[0, 0, FRAME_DEPTH + 0.001]} receiveShadow>
              <planeGeometry
                args={[
                  art.width + MOUNT_BORDER * 2,
                  art.height + MOUNT_BORDER * 2,
                ]}
              />
              <meshStandardMaterial color="#ddd3be" roughness={0.94} />
            </mesh>
          )}
        </>
      ) : null}

      <mesh geometry={geometry} position={[0, 0, printDepth]} receiveShadow>
        <meshStandardMaterial
          map={texture}
          color={art.tint ?? '#ffffff'}
          roughness={0.82}
          emissiveMap={art.selfIllumination ? texture : null}
          emissive={art.selfIllumination ? '#ffffff' : '#000000'}
          emissiveIntensity={art.selfIllumination ?? 0}
        />
      </mesh>

      {art.showCredit === false ? null : (
        <Text
          position={[
            -outerWidth / 2,
            -outerHeight / 2 - CREDIT_GAP,
            printDepth + 0.001,
          ]}
          anchorX="left"
          anchorY="top"
          fontSize={CREDIT_SIZE}
          maxWidth={outerWidth}
          lineHeight={1.35}
          color="#6d6455"
          material-side={DoubleSide}
          material-toneMapped={false}
        >
          {credit}
        </Text>
      )}
    </group>
  )
}

/** Renders every wall-art entry declared by a room; no room ids are inspected. */
export function RoomWallArt({ room }: { room: RoomData }) {
  const wallArt = room.wallArt ?? []
  if (wallArt.length === 0) return null

  return (
    <>
      {wallArt.map((art) => {
        const asset = mediaById.get(art.mediaId)
        // TypeScript prevents this for authored content. Keeping the runtime
        // guard makes a stale generated manifest fail locally, not the room.
        if (!asset) return null
        return <WallArtPanel key={art.id} art={art} asset={asset} />
      })}
    </>
  )
}
