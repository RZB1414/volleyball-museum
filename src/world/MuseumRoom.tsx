import { useTexture } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Suspense, useEffect, useMemo } from 'react'
import { RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { Bookshelf } from './Bookshelf'
import { Chair } from './Chair'
import { Desk } from './Desk'
import { FramedPhoto } from './FramedPhoto'

// Desk pushed further from the wall than the chair so there's a clear gap for the
// player to walk into between them before the "sit" prompt appears.
export const DESK_POSITION: [number, number, number] = [-2.9, 0, 5]
export const CHAIR_POSITION: [number, number, number] = [-4.3, 0, 5]
// Faces +X (toward the desk), opposite the desk's own facing rotation.
export const CHAIR_ROTATION_Y = Math.PI / 2
export const SIT_APPROACH_RADIUS = 1.3

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

type TexturedPlaneProps = {
  texturePath: string
  width: number
  height: number
  position: Vector3Tuple
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

type OrnateWallPlaqueProps = {
  position: Vector3Tuple
  rotation: Vector3Tuple
}

function centeredRepeatOffset(repeat: number) {
  return -((repeat % 1) / 2)
}

function useDecorTexture(texturePath: string, repeat: Vector2Tuple, offset: Vector2Tuple) {
  const sourceTexture = useTexture(texturePath) as Texture
  const texture = useMemo(() => sourceTexture.clone(), [sourceTexture])
  const [repeatX, repeatY] = repeat
  const [offsetX, offsetY] = offset

  useEffect(() => {
    return () => {
      texture.dispose()
    }
  }, [texture])

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.anisotropy = 12
    texture.repeat.set(repeatX, repeatY)
    texture.offset.set(offsetX, offsetY)
    texture.needsUpdate = true
  }, [offsetX, offsetY, repeatX, repeatY, texture])

  return texture
}

function TexturedPlane({
  texturePath,
  width,
  height,
  position,
  repeat,
  offset,
  roughness,
  metalness = 0,
  bumpScale = 0,
}: TexturedPlaneProps) {
  const texture = useDecorTexture(texturePath, repeat, offset ?? [0, 0])

  return (
    <mesh receiveShadow position={position}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        bumpMap={texture}
        bumpScale={bumpScale}
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
  const pilasterPositions =
    pilasterLayout === 'short'
      ? [
          -length / 2 + decor.pilasterWidth / 2,
          -length / 4,
          length / 4,
          length / 2 - decor.pilasterWidth / 2,
        ]
      : [-length / 2 + decor.pilasterWidth / 2, 0, length / 2 - decor.pilasterWidth / 2]

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

function VictorianRoomDecor() {
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
          bumpMap={ceilingTexture}
          bumpScale={0.022}
          roughness={0.7}
          metalness={0.08}
        />
      </mesh>

      <group position={[0, 0, backZ]}>
        <DecoratedWallFace length={interiorWidth} pilasterLayout="short" />
      </group>
      <group position={[0, 0, frontZ]} rotation={[0, Math.PI, 0]}>
        <DecoratedWallFace length={interiorWidth} pilasterLayout="short" />
      </group>
      <group position={[leftX, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <DecoratedWallFace length={interiorDepth} pilasterLayout="long" />
      </group>
      <group position={[rightX, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <DecoratedWallFace length={interiorDepth} pilasterLayout="long" />
      </group>
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
        bumpMap={floorTexture}
        bumpScale={0.018}
        roughness={0.72}
        metalness={0.04}
      />
    </mesh>
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

export function MuseumRoom() {
  const halfWidth = room.width / 2
  const halfDepth = room.depth / 2
  const halfHeight = room.height / 2
  const backWallDisplayZ = -halfDepth + room.wallThickness / 2 + 0.05
  const leftWallDisplayX = -halfWidth + room.wallThickness / 2 + 0.05
  const rightWallDisplayX = halfWidth - room.wallThickness / 2 - 0.05

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <mesh receiveShadow position={[0, -0.05, 0]}>
          <boxGeometry args={[room.width, 0.1, room.depth]} />
          <meshStandardMaterial color="#a9a9a9" roughness={0.9} />
        </mesh>
        <CuboidCollider args={[halfWidth, 0.05, halfDepth]} position={[0, -0.05, 0]} />

        <mesh receiveShadow position={[0, halfHeight, -halfDepth]}>
          <boxGeometry args={[room.width, room.height, room.wallThickness]} />
          <meshStandardMaterial color="#8f9094" roughness={0.85} />
        </mesh>
        <CuboidCollider
          args={[halfWidth, halfHeight, room.wallThickness / 2]}
          position={[0, halfHeight, -halfDepth]}
        />

        <mesh receiveShadow position={[0, halfHeight, halfDepth]}>
          <boxGeometry args={[room.width, room.height, room.wallThickness]} />
          <meshStandardMaterial color="#8c8d91" roughness={0.85} />
        </mesh>
        <CuboidCollider
          args={[halfWidth, halfHeight, room.wallThickness / 2]}
          position={[0, halfHeight, halfDepth]}
        />

        <mesh receiveShadow position={[-halfWidth, halfHeight, 0]}>
          <boxGeometry args={[room.wallThickness, room.height, room.depth]} />
          <meshStandardMaterial color="#96979b" roughness={0.85} />
        </mesh>
        <CuboidCollider
          args={[room.wallThickness / 2, halfHeight, halfDepth]}
          position={[-halfWidth, halfHeight, 0]}
        />

        <mesh receiveShadow position={[halfWidth, halfHeight, 0]}>
          <boxGeometry args={[room.wallThickness, room.height, room.depth]} />
          <meshStandardMaterial color="#939498" roughness={0.85} />
        </mesh>
        <CuboidCollider
          args={[room.wallThickness / 2, halfHeight, halfDepth]}
          position={[halfWidth, halfHeight, 0]}
        />

        <mesh position={[0, room.height + 0.03, 0]}>
          <boxGeometry args={[room.width, 0.08, room.depth]} />
          <meshStandardMaterial color="#b8b8b8" roughness={0.9} />
        </mesh>
      </RigidBody>

      <Suspense fallback={null}>
        <VictorianFloor />
        <VictorianRoomDecor />
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
        <Desk position={DESK_POSITION} rotation={[0, -Math.PI / 2, 0]} />
        <Chair position={CHAIR_POSITION} rotation={[0, CHAIR_ROTATION_Y, 0]} />
        <Bookshelf position={[-5.51, 0, 1.9]} rotation={[0, Math.PI / 2, 0]} />
      </Suspense>
    </group>
  )
}

useTexture.preload(BACK_WALL_PHOTO_PATH)
Object.values(TEXTURES).forEach((texturePath) => useTexture.preload(texturePath))
