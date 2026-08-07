import { useTexture } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Suspense, useEffect, useMemo } from 'react'
import { RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { Bookshelf } from './Bookshelf'
import { Chair } from './Chair'
import { Desk } from './Desk'
import { FramedPhoto } from './FramedPhoto'
import { OfficeLamp } from './OfficeLamp'
import { OfficeRug } from './OfficeRug'
import { OfficeTrophy } from './OfficeTrophy'
import { OfficeWallArt } from './OfficeWallArt'

// Desk pushed further from the wall than the chair so there's a clear gap for the
// player to walk into between them before the "sit" prompt appears.
export const DESK_POSITION: [number, number, number] = [-2.9, 0, 5]
export const CHAIR_POSITION: [number, number, number] = [-4.3, 0, 5]
// Faces +X (toward the desk), opposite the desk's own facing rotation.
export const CHAIR_ROTATION_Y = Math.PI / 2
export const SIT_APPROACH_RADIUS = 1.3
const OFFICE_LAMP_POSITION: [number, number, number] = [-2.7, 1.065, 5.55]
const OFFICE_LAMP_ROTATION_Y = Math.PI + Math.PI / 5
const OFFICE_TROPHY_POSITION: [number, number, number] = [-2.76, 1.065, 5.04]
const OFFICE_TROPHY_ROTATION_Y = Math.PI + Math.PI / 8
const OFFICE_TROPHY_LIGHT_TARGET: [number, number, number] = [-2.76, 1.37, 5.04]

const room = {
  width: 12,
  depth: 16,
  height: 4,
  wallThickness: 0.35,
}

const BACK_WALL_PHOTO_PATH = '/images/jogador-tourcoing.jpg'
const BACK_WALL_PHOTO_WIDTH = 1
const TEXTURES = {
  floor: '/textures/chao/chao.jpg',
  ceiling: '/textures/teto/teto.jpg',
  crown: '/textures/sanca/sanca.jpg',
  upperFrieze: '/textures/friso-superior/friso-superior.jpg',
  wallpaper: '/textures/papel-de-parede/pepel-de-parede.jpg',
  pilaster: '/textures/pilastras/pilastra.jpg',
  baseboard: '/textures/rodape/rodape.jpg',
}

const ENABLE_DECOR_BUMP_MAPS = false

const decor = {
  surfaceOffset: 0.014,
  trimLayer: 0.012,
  pilasterLayer: 0.026,
  ceilingLayer: 0.055,
  floorLayer: 0.008,
  floorTileSize: 4.8,
  wallpaperTileSize: 1.9,
  rodapeHeight: 0.5,
  wallpaperBottom: 0.52,
  wallpaperTop: 3.0,
  friezeHeight: 0.36,
  friezeCenterY: 3.19,
  crownHeight: 0.56,
  crownCenterY: 3.7,
  pilasterWidth: 0.94,
}

const wallpaperHeight = decor.wallpaperTop - decor.wallpaperBottom
const wallpaperCenterY = decor.wallpaperBottom + wallpaperHeight / 2
const pilasterBottom = decor.wallpaperBottom
const pilasterTop = decor.crownCenterY - decor.crownHeight / 2
const pilasterHeight = pilasterTop - pilasterBottom
const pilasterCenterY = pilasterBottom + pilasterHeight / 2

type Vector3Tuple = [number, number, number]
type Vector2Tuple = [number, number]
type WallSide = 'back' | 'front' | 'left' | 'right'
type DoorwaySide = 'back' | 'front'

type WallOpening = {
  side: WallSide
  center: number
  width: number
  height: number
}

type TexturedPlaneProps = {
  texturePath: string
  width: number
  height: number
  position: Vector3Tuple
  rotation?: Vector3Tuple
  repeat: Vector2Tuple
  offset?: Vector2Tuple
  roughness: number
  metalness?: number
  bumpScale?: number
}

type DecoratedWallFaceProps = {
  length: number
  pilasterLayout: 'short' | 'long'
}

type DecoratedWallWithOpeningsProps = DecoratedWallFaceProps & {
  openings?: WallOpening[]
}

type OrnateWallPlaqueProps = {
  position: Vector3Tuple
  rotation: Vector3Tuple
}

type WallSegment = {
  key: string
  center: number
  length: number
}

type PhysicalWallProps = {
  side: WallSide
  openings: WallOpening[]
}

type MuseumRoomInstanceProps = {
  position?: Vector3Tuple
  backOpenings?: WallOpening[]
  frontOpenings?: WallOpening[]
  hiddenDecorWalls?: WallSide[]
  hiddenDoorwayRevealSides?: DoorwaySide[]
  hiddenPhysicalWalls?: WallSide[]
  includeFurniture?: boolean
}

const DOUBLE_DOOR_OPENING_WIDTH = 3.0
const DOOR_OPENING_HEIGHT = 2.6
const FLOOR_COLLIDER_OVERLAP = 0.12
const REAR_ROOM_Z = -room.depth
const MAIN_ROOM_BACK_LEFT_OPENING: WallOpening = {
  side: 'back',
  center: -room.width / 4,
  width: DOUBLE_DOOR_OPENING_WIDTH,
  height: DOOR_OPENING_HEIGHT,
}
const MAIN_ROOM_BACK_RIGHT_OPENING: WallOpening = {
  side: 'back',
  center: room.width / 4,
  width: DOUBLE_DOOR_OPENING_WIDTH,
  height: DOOR_OPENING_HEIGHT,
}
const LEFT_REAR_ROOM_FRONT_OPENING: WallOpening = {
  side: 'front',
  center: room.width / 4,
  width: DOUBLE_DOOR_OPENING_WIDTH,
  height: DOOR_OPENING_HEIGHT,
}
const RIGHT_REAR_ROOM_FRONT_OPENING: WallOpening = {
  side: 'front',
  center: -room.width / 4,
  width: DOUBLE_DOOR_OPENING_WIDTH,
  height: DOOR_OPENING_HEIGHT,
}

function centeredRepeatOffset(repeat: number) {
  return -((repeat % 1) / 2)
}

function getWallOpenings(openings: WallOpening[], side: WallSide) {
  return openings.filter((opening) => opening.side === side)
}

function getWallSegments(length: number, openings: WallOpening[]) {
  if (openings.length === 0) {
    return [{ key: 'full', center: 0, length }]
  }

  const halfLength = length / 2
  const sortedOpenings = openings
    .map((opening) => ({
      ...opening,
      start: Math.max(-halfLength, opening.center - opening.width / 2),
      end: Math.min(halfLength, opening.center + opening.width / 2),
    }))
    .filter((opening) => opening.end > opening.start)
    .sort((a, b) => a.start - b.start)

  const segments: WallSegment[] = []
  let cursor = -halfLength

  sortedOpenings.forEach((opening, index) => {
    if (opening.start > cursor) {
      const segmentLength = opening.start - cursor
      segments.push({
        key: `segment-${index}-${cursor}`,
        center: cursor + segmentLength / 2,
        length: segmentLength,
      })
    }

    cursor = Math.max(cursor, opening.end)
  })

  if (cursor < halfLength) {
    const segmentLength = halfLength - cursor
    segments.push({
      key: `segment-end-${cursor}`,
      center: cursor + segmentLength / 2,
      length: segmentLength,
    })
  }

  return segments
}

// Many wall segments across the 3 rooms end up requesting the exact same
// (texturePath, repeat, offset) combination (e.g. both side walls of every
// room share the same interior depth, so the same tiling). Without this
// cache each of those ~140 decorative planes cloned and GPU-uploaded its own
// copy of the same handful of source images. Cloning is still required
// because repeat/offset live on the Texture instance, not the geometry.
const decorTextureCache = new Map<string, { texture: Texture; refCount: number }>()

function getOrCreateCachedTexture(
  sourceTexture: Texture,
  repeatX: number,
  repeatY: number,
  offsetX: number,
  offsetY: number,
) {
  const key = `${sourceTexture.uuid}|${repeatX.toFixed(4)},${repeatY.toFixed(4)}|${offsetX.toFixed(4)},${offsetY.toFixed(4)}`
  const cached = decorTextureCache.get(key)

  if (cached) {
    return { key, texture: cached.texture }
  }

  const texture = sourceTexture.clone()
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.anisotropy = 12
  texture.repeat.set(repeatX, repeatY)
  texture.offset.set(offsetX, offsetY)
  texture.needsUpdate = true
  decorTextureCache.set(key, { texture, refCount: 0 })

  return { key, texture }
}

function retainCachedTexture(key: string) {
  const cached = decorTextureCache.get(key)

  if (cached) {
    cached.refCount += 1
  }
}

function releaseCachedTexture(key: string) {
  const cached = decorTextureCache.get(key)

  if (!cached) {
    return
  }

  cached.refCount -= 1

  if (cached.refCount <= 0) {
    cached.texture.dispose()
    decorTextureCache.delete(key)
  }
}

function useDecorTexture(texturePath: string, repeat: Vector2Tuple, offset: Vector2Tuple) {
  const sourceTexture = useTexture(texturePath) as Texture
  const [repeatX, repeatY] = repeat
  const [offsetX, offsetY] = offset

  const { key, texture } = useMemo(
    () => getOrCreateCachedTexture(sourceTexture, repeatX, repeatY, offsetX, offsetY),
    [sourceTexture, repeatX, repeatY, offsetX, offsetY],
  )

  useEffect(() => {
    retainCachedTexture(key)
    return () => releaseCachedTexture(key)
  }, [key])

  return texture
}

function TexturedPlane({
  texturePath,
  width,
  height,
  position,
  rotation = [0, 0, 0],
  repeat,
  offset,
  roughness,
  metalness = 0,
  bumpScale = 0,
}: TexturedPlaneProps) {
  const texture = useDecorTexture(texturePath, repeat, offset ?? [0, 0])

  return (
    <mesh receiveShadow position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        bumpMap={ENABLE_DECOR_BUMP_MAPS ? texture : undefined}
        bumpScale={ENABLE_DECOR_BUMP_MAPS ? bumpScale : 0}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  )
}

function DecoratedWallFace({ length, pilasterLayout }: DecoratedWallFaceProps) {
  const wallpaperRepeatX = length / decor.wallpaperTileSize
  const wallpaperRepeatY = wallpaperHeight / decor.wallpaperTileSize
  const crownRepeatX = length / (decor.crownHeight * 3)
  const friezeRepeatX = length / (decor.friezeHeight * 4.7)
  const baseboardRepeatX = length / (decor.rodapeHeight * 3)
  // The full layout only fits when neighbouring positions stay at least one
  // pilaster width apart ('short': L/4 - w/2 >= w, 'long': L/2 - w/2 >= w).
  // The narrow wall segments beside the doorways would otherwise stack
  // several coplanar pilaster planes on top of each other, z-fighting as a
  // visible texture flicker whenever the camera moves.
  const minFullLayoutLength = decor.pilasterWidth * (pilasterLayout === 'short' ? 6 : 3)
  const pilasterPositions =
    length >= minFullLayoutLength
      ? pilasterLayout === 'short'
        ? [
            -length / 2 + decor.pilasterWidth / 2,
            -length / 4,
            length / 4,
            length / 2 - decor.pilasterWidth / 2,
          ]
        : [-length / 2 + decor.pilasterWidth / 2, 0, length / 2 - decor.pilasterWidth / 2]
      : length >= decor.pilasterWidth * 1.2
        ? [0]
        : []

  return (
    <>
      <TexturedPlane
        texturePath={TEXTURES.wallpaper}
        width={length}
        height={wallpaperHeight}
        position={[0, wallpaperCenterY, 0]}
        repeat={[wallpaperRepeatX, wallpaperRepeatY]}
        offset={[centeredRepeatOffset(wallpaperRepeatX), 0]}
        roughness={0.86}
        bumpScale={0.012}
      />

      <TexturedPlane
        texturePath={TEXTURES.baseboard}
        width={length}
        height={decor.rodapeHeight}
        position={[0, decor.rodapeHeight / 2, decor.trimLayer]}
        repeat={[baseboardRepeatX, 1]}
        offset={[centeredRepeatOffset(baseboardRepeatX), 0]}
        roughness={0.58}
        metalness={0.12}
        bumpScale={0.028}
      />

      <TexturedPlane
        texturePath={TEXTURES.upperFrieze}
        width={length}
        height={decor.friezeHeight}
        position={[0, decor.friezeCenterY, decor.trimLayer]}
        repeat={[friezeRepeatX, 0.62]}
        offset={[centeredRepeatOffset(friezeRepeatX), 0.19]}
        roughness={0.62}
        metalness={0.1}
        bumpScale={0.025}
      />

      <TexturedPlane
        texturePath={TEXTURES.crown}
        width={length}
        height={decor.crownHeight}
        position={[0, decor.crownCenterY, decor.trimLayer]}
        repeat={[crownRepeatX, 1]}
        offset={[centeredRepeatOffset(crownRepeatX), 0]}
        roughness={0.55}
        metalness={0.16}
        bumpScale={0.032}
      />

      {pilasterPositions.map((xPosition) => (
        <TexturedPlane
          key={xPosition}
          texturePath={TEXTURES.pilaster}
          width={decor.pilasterWidth}
          height={pilasterHeight}
          position={[xPosition, pilasterCenterY, decor.pilasterLayer]}
          repeat={[1, 1]}
          roughness={0.56}
          metalness={0.16}
          bumpScale={0.034}
        />
      ))}
    </>
  )
}

function DecoratedOpeningHeader({ length }: { length: number }) {
  const headerBottom = Math.min(DOOR_OPENING_HEIGHT, decor.wallpaperTop)
  const headerHeight = decor.wallpaperTop - headerBottom
  const wallpaperRepeatX = length / decor.wallpaperTileSize
  const crownRepeatX = length / (decor.crownHeight * 3)
  const friezeRepeatX = length / (decor.friezeHeight * 4.7)

  return (
    <>
      {headerHeight > 0 && (
        <TexturedPlane
          texturePath={TEXTURES.wallpaper}
          width={length}
          height={headerHeight}
          position={[0, headerBottom + headerHeight / 2, 0]}
          repeat={[wallpaperRepeatX, headerHeight / decor.wallpaperTileSize]}
          offset={[centeredRepeatOffset(wallpaperRepeatX), headerBottom / decor.wallpaperTileSize]}
          roughness={0.86}
          bumpScale={0.012}
        />
      )}

      <TexturedPlane
        texturePath={TEXTURES.upperFrieze}
        width={length}
        height={decor.friezeHeight}
        position={[0, decor.friezeCenterY, decor.trimLayer]}
        repeat={[friezeRepeatX, 0.62]}
        offset={[centeredRepeatOffset(friezeRepeatX), 0.19]}
        roughness={0.62}
        metalness={0.1}
        bumpScale={0.025}
      />

      <TexturedPlane
        texturePath={TEXTURES.crown}
        width={length}
        height={decor.crownHeight}
        position={[0, decor.crownCenterY, decor.trimLayer]}
        repeat={[crownRepeatX, 1]}
        offset={[centeredRepeatOffset(crownRepeatX), 0]}
        roughness={0.55}
        metalness={0.16}
        bumpScale={0.032}
      />
    </>
  )
}

function DecoratedWallWithOpenings({
  length,
  pilasterLayout,
  openings = [],
}: DecoratedWallWithOpeningsProps) {
  const wallSegments = getWallSegments(length, openings)

  if (openings.length === 0) {
    return <DecoratedWallFace length={length} pilasterLayout={pilasterLayout} />
  }

  return (
    <>
      {wallSegments.map((segment) => (
        <group key={segment.key} position={[segment.center, 0, 0]}>
          <DecoratedWallFace length={segment.length} pilasterLayout={pilasterLayout} />
        </group>
      ))}

      {openings.map((opening) => (
        <group key={`${opening.side}-${opening.center}-header`} position={[opening.center, 0, 0]}>
          <DecoratedOpeningHeader length={opening.width} />
        </group>
      ))}
    </>
  )
}

function DoorwayReveal({ side, opening }: { side: 'back' | 'front'; opening: WallOpening }) {
  const halfDepth = room.depth / 2
  const zPosition = side === 'back' ? -halfDepth : halfDepth
  const leftEdgeX = opening.center - opening.width / 2
  const rightEdgeX = opening.center + opening.width / 2
  const revealDepth = room.wallThickness + decor.surfaceOffset * 2

  return (
    <>
      <TexturedPlane
        texturePath={TEXTURES.wallpaper}
        width={revealDepth}
        height={opening.height}
        position={[leftEdgeX, opening.height / 2, zPosition]}
        rotation={[0, Math.PI / 2, 0]}
        repeat={[revealDepth / decor.wallpaperTileSize, opening.height / decor.wallpaperTileSize]}
        roughness={0.86}
        bumpScale={0.012}
      />

      <TexturedPlane
        texturePath={TEXTURES.wallpaper}
        width={revealDepth}
        height={opening.height}
        position={[rightEdgeX, opening.height / 2, zPosition]}
        rotation={[0, -Math.PI / 2, 0]}
        repeat={[revealDepth / decor.wallpaperTileSize, opening.height / decor.wallpaperTileSize]}
        roughness={0.86}
        bumpScale={0.012}
      />

      <TexturedPlane
        texturePath={TEXTURES.ceiling}
        width={opening.width}
        height={revealDepth}
        position={[opening.center, opening.height - decor.surfaceOffset, zPosition]}
        rotation={[Math.PI / 2, 0, 0]}
        repeat={[opening.width / 4, revealDepth / 4]}
        roughness={0.7}
        metalness={0.08}
        bumpScale={0.022}
      />
    </>
  )
}

function VictorianRoomDecor({
  backOpenings = [],
  frontOpenings = [],
  hiddenDecorWalls = [],
  hiddenDoorwayRevealSides = [],
}: Pick<
  MuseumRoomInstanceProps,
  'backOpenings' | 'frontOpenings' | 'hiddenDecorWalls' | 'hiddenDoorwayRevealSides'
>) {
  const ceilingTexture = useDecorTexture(TEXTURES.ceiling, [room.width / 4, room.depth / 4], [0, 0])
  const halfWidth = room.width / 2
  const halfDepth = room.depth / 2
  const interiorWidth = room.width - room.wallThickness
  const interiorDepth = room.depth - room.wallThickness
  const interiorBackZ = -halfDepth + room.wallThickness / 2
  const interiorFrontZ = halfDepth - room.wallThickness / 2
  const interiorLeftX = -halfWidth + room.wallThickness / 2
  const interiorRightX = halfWidth - room.wallThickness / 2
  const backZ = interiorBackZ + decor.surfaceOffset
  const frontZ = interiorFrontZ - decor.surfaceOffset
  const leftX = interiorLeftX + decor.surfaceOffset
  const rightX = interiorRightX - decor.surfaceOffset

  return (
    <group>
      <mesh receiveShadow position={[0, room.height - decor.ceilingLayer, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial
          map={ceilingTexture}
          bumpMap={ENABLE_DECOR_BUMP_MAPS ? ceilingTexture : undefined}
          bumpScale={ENABLE_DECOR_BUMP_MAPS ? 0.022 : 0}
          roughness={0.7}
          metalness={0.08}
        />
      </mesh>

      {!hiddenDecorWalls.includes('back') && (
        <group position={[0, 0, backZ]}>
          <DecoratedWallWithOpenings
            length={interiorWidth}
            openings={backOpenings}
            pilasterLayout="short"
          />
        </group>
      )}
      {!hiddenDoorwayRevealSides.includes('back') &&
        backOpenings.map((opening) => (
          <DoorwayReveal key={`back-${opening.center}`} side="back" opening={opening} />
        ))}

      {!hiddenDecorWalls.includes('front') && (
        <group position={[0, 0, frontZ]} rotation={[0, Math.PI, 0]}>
          <DecoratedWallWithOpenings
            length={interiorWidth}
            openings={frontOpenings}
            pilasterLayout="short"
          />
        </group>
      )}
      {!hiddenDoorwayRevealSides.includes('front') &&
        frontOpenings.map((opening) => (
          <DoorwayReveal key={`front-${opening.center}`} side="front" opening={opening} />
        ))}

      {!hiddenDecorWalls.includes('left') && (
        <group position={[leftX, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <DecoratedWallFace length={interiorDepth} pilasterLayout="long" />
        </group>
      )}
      {!hiddenDecorWalls.includes('right') && (
        <group position={[rightX, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <DecoratedWallFace length={interiorDepth} pilasterLayout="long" />
        </group>
      )}
    </group>
  )
}

function VictorianFloor() {
  const floorTexture = useDecorTexture(
    TEXTURES.floor,
    [room.width / decor.floorTileSize, room.depth / decor.floorTileSize],
    [0, 0],
  )

  return (
    <mesh
      receiveShadow
      position={[0, decor.floorLayer, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[room.width, room.depth]} />
      <meshStandardMaterial
        map={floorTexture}
        bumpMap={ENABLE_DECOR_BUMP_MAPS ? floorTexture : undefined}
        bumpScale={ENABLE_DECOR_BUMP_MAPS ? 0.018 : 0}
        roughness={0.72}
        metalness={0.04}
      />
    </mesh>
  )
}

function SharedFloorCollider() {
  const halfWidth = room.width / 2
  const halfDepth = room.depth / 2

  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider
        args={[halfWidth, 0.05, halfDepth + FLOOR_COLLIDER_OVERLAP]}
        position={[0, -0.05, 0]}
      />
      <CuboidCollider
        args={[room.width, 0.05, halfDepth + FLOOR_COLLIDER_OVERLAP]}
        position={[0, -0.05, REAR_ROOM_Z]}
      />
    </RigidBody>
  )
}

function SharedBackWallCollider() {
  const halfHeight = room.height / 2
  const sharedWallLength = room.width * 2
  const openings = [MAIN_ROOM_BACK_LEFT_OPENING, MAIN_ROOM_BACK_RIGHT_OPENING]
  const wallSegments = getWallSegments(sharedWallLength, openings)
  const zPosition = -room.depth / 2

  return (
    <RigidBody type="fixed" colliders={false}>
      {wallSegments.map((segment) => (
        <CuboidCollider
          key={`shared-back-${segment.key}`}
          args={[segment.length / 2, halfHeight, room.wallThickness / 2]}
          position={[segment.center, halfHeight, zPosition]}
        />
      ))}

      {openings.map((opening) => {
        const topHeight = room.height - opening.height

        if (topHeight <= 0) {
          return null
        }

        return (
          <CuboidCollider
            key={`shared-back-${opening.center}-top`}
            args={[opening.width / 2, topHeight / 2, room.wallThickness / 2]}
            position={[opening.center, opening.height + topHeight / 2, zPosition]}
          />
        )
      })}
    </RigidBody>
  )
}

function SharedBackWallRearDecor() {
  const sharedWallLength = room.width * 2 - room.wallThickness
  const rearWallZ = -room.depth / 2 - room.wallThickness / 2 - decor.surfaceOffset
  const rearSideOpenings: WallOpening[] = [
    {
      ...MAIN_ROOM_BACK_LEFT_OPENING,
      side: 'front',
    },
    {
      ...MAIN_ROOM_BACK_RIGHT_OPENING,
      side: 'front',
    },
  ]

  return (
    <group position={[0, 0, rearWallZ]} rotation={[0, Math.PI, 0]}>
      <DecoratedWallWithOpenings
        length={sharedWallLength}
        openings={rearSideOpenings}
        pilasterLayout="short"
      />
    </group>
  )
}

function PhysicalWall({ side, openings }: PhysicalWallProps) {
  const halfWidth = room.width / 2
  const halfDepth = room.depth / 2
  const halfHeight = room.height / 2
  const wallLength = side === 'back' || side === 'front' ? room.width : room.depth
  const wallSegments = getWallSegments(wallLength, openings)

  if (side === 'back' || side === 'front') {
    const zPosition = side === 'back' ? -halfDepth : halfDepth

    return (
      <>
        {wallSegments.map((segment) => (
          <CuboidCollider
            key={`${side}-${segment.key}`}
            args={[segment.length / 2, halfHeight, room.wallThickness / 2]}
            position={[segment.center, halfHeight, zPosition]}
          />
        ))}

        {openings.map((opening) => {
          const topHeight = room.height - opening.height

          if (topHeight <= 0) {
            return null
          }

          return (
            <CuboidCollider
              key={`${side}-${opening.center}-top`}
              args={[opening.width / 2, topHeight / 2, room.wallThickness / 2]}
              position={[opening.center, opening.height + topHeight / 2, zPosition]}
            />
          )
        })}
      </>
    )
  }

  const xPosition = side === 'left' ? -halfWidth : halfWidth

  return (
    <>
      {wallSegments.map((segment) => (
        <CuboidCollider
          key={`${side}-${segment.key}`}
          args={[room.wallThickness / 2, halfHeight, segment.length / 2]}
          position={[xPosition, halfHeight, segment.center]}
        />
      ))}

      {openings.map((opening) => {
        const topHeight = room.height - opening.height

        if (topHeight <= 0) {
          return null
        }

        return (
          <CuboidCollider
            key={`${side}-${opening.center}-top`}
            args={[room.wallThickness / 2, topHeight / 2, opening.width / 2]}
            position={[xPosition, opening.height + topHeight / 2, opening.center]}
          />
        )
      })}
    </>
  )
}

function OrnateWallPlaque({ position, rotation }: OrnateWallPlaqueProps) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.92, 1.16, 0.055]} />
        <meshStandardMaterial color="#9a6a28" roughness={0.48} metalness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.032]} castShadow receiveShadow>
        <boxGeometry args={[1.72, 0.96, 0.035]} />
        <meshStandardMaterial color="#23140f" roughness={0.7} />
      </mesh>
      <TexturedPlane
        texturePath={TEXTURES.wallpaper}
        width={1.52}
        height={0.76}
        position={[0, 0, 0.057]}
        repeat={[1.12, 0.56]}
        offset={[-0.06, 0.04]}
        roughness={0.78}
        bumpScale={0.01}
      />
    </group>
  )
}

function MuseumRoomInstance({
  position = [0, 0, 0],
  backOpenings = [],
  frontOpenings = [],
  hiddenDecorWalls = [],
  hiddenDoorwayRevealSides = [],
  hiddenPhysicalWalls = [],
  includeFurniture = false,
}: MuseumRoomInstanceProps) {
  const halfWidth = room.width / 2
  const halfDepth = room.depth / 2
  const backWallDisplayZ = -halfDepth + room.wallThickness / 2 + 0.05
  const leftWallDisplayX = -halfWidth + room.wallThickness / 2 + 0.05
  const rightWallDisplayX = halfWidth - room.wallThickness / 2 - 0.05
  const wallOpenings = [...backOpenings, ...frontOpenings]

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {!hiddenPhysicalWalls.includes('back') && (
          <PhysicalWall side="back" openings={getWallOpenings(wallOpenings, 'back')} />
        )}
        {!hiddenPhysicalWalls.includes('front') && (
          <PhysicalWall side="front" openings={getWallOpenings(wallOpenings, 'front')} />
        )}
        {!hiddenPhysicalWalls.includes('left') && (
          <PhysicalWall side="left" openings={getWallOpenings(wallOpenings, 'left')} />
        )}
        {!hiddenPhysicalWalls.includes('right') && (
          <PhysicalWall side="right" openings={getWallOpenings(wallOpenings, 'right')} />
        )}

        <CuboidCollider args={[halfWidth, 0.04, halfDepth]} position={[0, room.height + 0.03, 0]} />
      </RigidBody>

      <Suspense fallback={null}>
        <VictorianFloor />
        <VictorianRoomDecor
          backOpenings={backOpenings}
          frontOpenings={frontOpenings}
          hiddenDecorWalls={hiddenDecorWalls}
          hiddenDoorwayRevealSides={hiddenDoorwayRevealSides}
        />
        <FramedPhoto
          imageUrl={BACK_WALL_PHOTO_PATH}
          width={BACK_WALL_PHOTO_WIDTH}
          position={[0, 1.7, backWallDisplayZ]}
        />
        <OrnateWallPlaque
          position={[leftWallDisplayX, 1.55, -2.8]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <OrnateWallPlaque
          position={[rightWallDisplayX, 1.55, 2.4]}
          rotation={[0, -Math.PI / 2, 0]}
        />
        {includeFurniture && (
          <>
            <Desk position={DESK_POSITION} rotation={[0, -Math.PI / 2, 0]} />
            <Chair position={CHAIR_POSITION} rotation={[0, CHAIR_ROTATION_Y, 0]} />
            <Bookshelf position={[-5.51, 0, 1.9]} rotation={[0, Math.PI / 2, 0]} />
            <OfficeRug position={[0, 0.012, 0]} rotation={[0, Math.PI / 2, 0]} />
            <OfficeTrophy
              position={OFFICE_TROPHY_POSITION}
              rotation={[0, OFFICE_TROPHY_ROTATION_Y, 0]}
            />
            <OfficeLamp
              lightTarget={OFFICE_TROPHY_LIGHT_TARGET}
              position={OFFICE_LAMP_POSITION}
              rotation={[0, OFFICE_LAMP_ROTATION_Y, 0]}
            />
            <OfficeWallArt
              position={[leftWallDisplayX, 1.95, DESK_POSITION[2]]}
              rotation={[0, Math.PI / 2, 0]}
            />
          </>
        )}
      </Suspense>
    </group>
  )
}

export function MuseumRoom() {
  return (
    <group>
      <SharedFloorCollider />
      <SharedBackWallCollider />
      <Suspense fallback={null}>
        <SharedBackWallRearDecor />
      </Suspense>
      <MuseumRoomInstance
        backOpenings={[MAIN_ROOM_BACK_LEFT_OPENING, MAIN_ROOM_BACK_RIGHT_OPENING]}
        hiddenPhysicalWalls={['back']}
        includeFurniture
      />
      <MuseumRoomInstance
        position={[-room.width / 2, 0, REAR_ROOM_Z]}
        frontOpenings={[LEFT_REAR_ROOM_FRONT_OPENING]}
        hiddenDecorWalls={['front']}
        hiddenDoorwayRevealSides={['front']}
        hiddenPhysicalWalls={['front', 'right']}
      />
      <MuseumRoomInstance
        position={[room.width / 2, 0, REAR_ROOM_Z]}
        frontOpenings={[RIGHT_REAR_ROOM_FRONT_OPENING]}
        hiddenDecorWalls={['front']}
        hiddenDoorwayRevealSides={['front']}
        hiddenPhysicalWalls={['front']}
      />
    </group>
  )
}

useTexture.preload(BACK_WALL_PHOTO_PATH)
Object.values(TEXTURES).forEach((texturePath) => useTexture.preload(texturePath))
