/**
 * Scene assembly.
 *
 * Reads the content set and the bake manifest and puts them together. Contains
 * no knowledge of any particular room — the atrium, Holyoke and the curator's
 * office all arrive as data.
 */

import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Group, Vector3 } from 'three'
import '../engine/bvhSetup'

import { BAKED_BUNDLES, type BakedBundle } from '../content/bake.generated'
import { MUSEUM } from '../content/museum'
import type { ExhibitData, RoomData } from '../content/schema'
import { BakedRoom } from '../engine/BakedRoom'
import { museumAudio } from '../engine/audio'
import { CollisionWorld } from '../engine/collision'
import { ContainerLayer, ContainerTargeting } from '../engine/Containers'
import { FramedMedia } from '../engine/FramedMedia'
import { ExamineView, InteractionTargeting } from '../engine/Interaction'
import {
  bakedPartHasCollider,
  cloneKitPart,
  cloneRecipe,
  disposeKitPart,
  registerKitColliders,
} from '../engine/kitPart'
import { useMaterialLibrary, type MaterialLibrary } from '../engine/materials'
import { PerfHud } from '../engine/PerfHud'
import { PlayerController } from '../engine/PlayerController'
import { playerPosition } from '../engine/playerPosition'
import { PowerControlLayer, PowerControlTargeting } from '../engine/PowerControls'
import { DoorwaySigns, KitLayer, WallSignage } from '../engine/RoomFurniture'
import { RoomLighting } from '../engine/RoomLighting'
import { roomRenderTier, type RoomRenderTier } from '../engine/roomLod'
import { RoomWallArt } from '../engine/RoomWallArt'
import { buildCells, computeVisibleRooms, roomAt } from '../engine/portals'
import { useMuseum } from '../state/store'

/**
 * Keyed by plain string: the manifest is `as const`, so the inferred key type
 * would be the literal names that happen to be baked today, and looking up
 * `room-${room.id}` for a wing that has not been baked yet would be a type
 * error rather than the runtime `undefined` this code already handles.
 */
const bundleByName = new Map<string, BakedBundle>(
  BAKED_BUNDLES.map((bundle) => [bundle.name, bundle as BakedBundle]),
)

/** The shared prop kit: plinths, vitrines, plaques. Loaded once, used everywhere. */
function requireBundle(name: string): BakedBundle {
  const bundle = bundleByName.get(name)
  if (!bundle) throw new Error(`The bake manifest is missing the ${name} bundle.`)
  return bundle
}

const KIT_BUNDLE = requireBundle('kit')
const KIT_URL = KIT_BUNDLE.url

// ---------------------------------------------------------------------------
// Exhibits
// ---------------------------------------------------------------------------

/**
 * Places one exhibit's geometry at its authored position.
 *
 * A recipe can resolve to several baked parts — the net is posts plus cords,
 * the dress form is the stand plus the garment — so everything named
 * `<recipe>` or `<recipe>__<part>` is gathered under one group.
 */
function Exhibit({
  exhibit,
  source,
  materials,
}: {
  exhibit: ExhibitData
  source: Group
  materials: MaterialLibrary
}) {
  const instance = useMemo(() => {
    const group = new Group()
    for (const part of cloneRecipe(source, exhibit.recipe, materials)) group.add(part)
    return group
  }, [source, exhibit.recipe, materials])

  useEffect(() => () => disposeKitPart(instance), [instance])

  return (
    <group
      name={`exhibit:${exhibit.id}`}
      position={exhibit.position as unknown as [number, number, number]}
      rotation={[0, exhibit.rotationY ?? 0, 0]}
      scale={exhibit.scale ?? 1}
    >
      <primitive object={instance} />
    </group>
  )
}

/**
 * What each mount type puts UNDER an exhibit, and how tall it is.
 *
 * The content declares `mount: 'plinth'` and the bake produces a plinth, but
 * until this table existed nothing joined them: every object sat at its
 * authored height with nothing beneath it, which read as artefacts floating in
 * an empty room. The heights come from the bake and have to agree with the
 * `position.y` values in the content, since the exhibit sits ON the mount.
 */
const MOUNTS: Record<string, { part: string; extra?: string } | null> = {
  plinth: { part: 'plinth-block' },
  'vitrine-table': { part: 'vitrine-table', extra: 'vitrine-glass' },
  // The new tower is one authored assembly: carcass plus its namespaced glass.
  'vitrine-tower': { part: 'vitrine-tower' },
  wall: null,
  'case-wall': null,
  floor: null,
}

/** Clones a named part out of the shared kit and re-materialises it. */
function useKitPart(source: Group | null, partName: string | undefined, materials: MaterialLibrary) {
  return useMemo(
    () => cloneKitPart(source, partName, materials),
    [source, partName, materials],
  )
}

function ExhibitMount({
  exhibit,
  kit,
  materials,
  collision,
  roomOrigin,
}: {
  exhibit: ExhibitData
  kit: Group | null
  materials: MaterialLibrary
  collision: CollisionWorld | null
  roomOrigin: readonly [number, number, number]
}) {
  const spec = MOUNTS[exhibit.mount] ?? null
  const base = useKitPart(kit, spec?.part, materials)
  const glass = useKitPart(kit, spec?.extra, materials)

  useEffect(() => {
    return () => {
      for (const node of [base, glass]) disposeKitPart(node)
    }
  }, [base, glass])

  useEffect(
    () =>
      registerKitColliders(kit, spec?.part, KIT_BUNDLE, collision, {
        roomOrigin,
        position: [exhibit.position[0], 0, exhibit.position[2]],
        rotationY: exhibit.rotationY,
      }),
    [collision, exhibit.position, exhibit.rotationY, kit, roomOrigin, spec?.part],
  )
  useEffect(
    () =>
      registerKitColliders(kit, spec?.extra, KIT_BUNDLE, collision, {
        roomOrigin,
        position: [exhibit.position[0], 0.94, exhibit.position[2]],
        rotationY: exhibit.rotationY,
      }),
    [collision, exhibit.position, exhibit.rotationY, kit, roomOrigin, spec?.extra],
  )

  if (!base) return null

  return (
    <group
      position={[exhibit.position[0], 0, exhibit.position[2]]}
      rotation={[0, exhibit.rotationY ?? 0, 0]}
    >
      <primitive object={base} />
      {/* The hood rides on a wrapper group, never on the primitive itself: a
          transform prop on a kit part overwrites the node translation that
          undoes quantisation, which is the same defect `cloneKitPart` exists
          to prevent — it just arrives through JSX instead of through code. */}
      {glass ? (
        <group position={[0, 0.94, 0]}>
          <primitive object={glass} />
        </group>
      ) : null}
    </group>
  )
}

function ExhibitLayer({
  room,
  materials,
  collision,
}: {
  room: RoomData
  materials: MaterialLibrary
  collision: CollisionWorld | null
}) {
  const bundle = bundleByName.get(`exhibits-${room.id}`)
  const exhibits = useMemo(
    () => MUSEUM.exhibits.filter((exhibit) => room.exhibitIds.includes(exhibit.id)),
    [room],
  )

  if (!bundle || exhibits.length === 0) return null

  return (
    <Suspense fallback={null}>
      <ExhibitBundle
        bundle={bundle.url}
        exhibits={exhibits}
        materials={materials}
        collision={collision}
        roomOrigin={room.origin}
      />
    </Suspense>
  )
}

function ExhibitBundle({
  bundle,
  exhibits,
  materials,
  collision,
  roomOrigin,
}: {
  bundle: string
  exhibits: readonly ExhibitData[]
  materials: MaterialLibrary
  collision: CollisionWorld | null
  roomOrigin: readonly [number, number, number]
}) {
  // Draco off for the same reason as BakedRoom: drei's default would pull a
  // decoder from gstatic.com that this project never uses.
  const { scene } = useGLTF(bundle, false, true)
  const kit = useGLTF(KIT_URL, false, true)

  return (
    <>
      {exhibits.map((exhibit) => {
        const asset = exhibit.mediaId
          ? MUSEUM.media.find((candidate) => candidate.id === exhibit.mediaId)
          : undefined

        return (
          <group key={exhibit.id}>
            <ExhibitMount
              exhibit={exhibit}
              kit={kit.scene as Group}
              materials={materials}
              collision={collision}
              roomOrigin={roomOrigin}
            />
            <Exhibit exhibit={exhibit} source={scene as Group} materials={materials} />
            {/* Wall-mounted exhibits carry a photograph; the frame geometry is
                baked, the print and its credit are runtime so they can follow
                the chosen language. */}
            {asset && (exhibit.mount === 'wall' || exhibit.mount === 'case-wall') ? (
              <Suspense fallback={null}>
                <FramedMedia
                  asset={asset}
                  width={asset.aspect >= 1.6 ? 1.4 : 0.34}
                  /**
                   * Offset along the frame's OWN normal.
                   *
                   * The print has to sit a few millimetres in front of the
                   * frame's mount board or it z-fights with it. The old code
                   * pushed it along +X when the exhibit was rotated and along
                   * +Z when it was not — which is right for exactly two of the
                   * four walls and puts the photograph inside the plaster on
                   * the other two. A frame at rotationY faces
                   * (sin y, 0, cos y); nudging along that vector is correct on
                   * any wall, including one at an angle.
                   */
                  position={(() => {
                    const facing = exhibit.rotationY ?? 0
                    const nudge = 0.032
                    return [
                      exhibit.position[0] + Math.sin(facing) * nudge,
                      exhibit.position[1],
                      exhibit.position[2] + Math.cos(facing) * nudge,
                    ] as [number, number, number]
                  })()}
                  rotationY={exhibit.rotationY ?? 0}
                />
              </Suspense>
            ) : null}
          </group>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

function Room({
  room,
  materials,
  collision,
  tier,
  locale,
}: {
  room: RoomData
  materials: MaterialLibrary
  collision: CollisionWorld | null
  tier: RoomRenderTier
  locale: 'pt-BR' | 'en'
}) {
  const bundle = bundleByName.get(`room-${room.id}`)
  if (!bundle) return null

  const visible = tier !== 'hidden'
  const detailed = tier === 'detail'

  return (
    <group visible={visible}>
      <BakedRoom
        bundle={bundle}
        materials={materials}
        origin={room.origin}
        collision={collision}
        // Collision is authored by the bake manifest. In particular, ceiling,
        // decorative panelling and glass stay non-solid without name guesses.
        noCollide={(name) => !bakedPartHasCollider(bundle, name)}
      />
      {/* Lights only exist for rooms the portal walk can see, so the per-frame
          light count follows what is on screen, not the size of the museum. */}
      {visible ? <RoomLighting room={room} /> : null}
      <group position={room.origin as unknown as [number, number, number]}>
        {/* A portal view needs the destination architecture, light and wayfinding,
            not a second room's full prop budget. Detail is promoted on crossing;
            BakedRoom stays mounted above so shell collision never follows LOD. */}
        {detailed ? (
          <>
            <ExhibitLayer room={room} materials={materials} collision={collision} />
            <Suspense fallback={null}>
              <ContainerLayer
                room={room}
                kitBundle={KIT_BUNDLE}
                materials={materials}
                collision={collision}
              />
              <PowerControlLayer room={room} kitUrl={KIT_URL} materials={materials} />
              <KitLayer
                room={room}
                kitBundle={KIT_BUNDLE}
                materials={materials}
                collision={collision}
              />
            </Suspense>
          </>
        ) : null}
        <DoorwaySigns room={room} locale={locale} />
        <WallSignage room={room} locale={locale} />
        <Suspense fallback={null}>
          {detailed ? <RoomWallArt room={room} /> : null}
        </Suspense>
      </group>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Visibility driver
// ---------------------------------------------------------------------------

/**
 * Runs the portal walk every frame and publishes the result.
 *
 * Deliberately not a React effect: this depends on the camera, which changes
 * continuously. The store write is guarded so it only fires when the visible
 * set actually changes, rather than re-rendering the tree at 60 Hz.
 */
function VisibilityDriver() {
  const camera = useThree((state) => state.camera)
  const cells = useMemo(() => buildCells(MUSEUM.rooms), [])
  const lastRoomRef = useRef<string | null>(null)
  const probe = useRef(new Vector3())

  useFrame(() => {
    probe.current.copy(playerPosition)
    probe.current.y += 1.0

    const current = roomAt(cells, probe.current) ?? lastRoomRef.current
    if (current && current !== lastRoomRef.current) {
      lastRoomRef.current = current
      useMuseum.getState().setCurrentRoom(current)
    }

    useMuseum
      .getState()
      .setVisibleRooms(computeVisibleRooms(cells, camera, probe.current, current))
  })

  return null
}

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------

/**
 * The environment is authored in JSX rather than loaded as an HDRI.
 *
 * `<Environment frames={1}>` renders its children to a cube target once and
 * runs PMREM over it, so the "HDRI" is about thirty lines of code instead of a
 * 2-8 MB download. For an interior lit by skylights and wall-washers that is
 * both cheaper and easier to art-direct.
 *
 * Exactly one shadow-casting light. Point lights with shadows are banned
 * outright: three renders SIX shadow passes per frame for each one, because a
 * cube shadow map has six faces.
 */
function MuseumLighting() {
  const brightness = useMuseum((state) => state.settings.brightness)

  return (
    <>
      <Environment frames={1} resolution={256}>
        {/* Skylight over the atrium — the dominant source. */}
        <Lightformer
          form="rect"
          intensity={2 * brightness}
          color="#fff0d6"
          position={[0, 12, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[14, 14, 1]}
        />
        {/* Cool fill from the opposite side so shadows are not dead black. */}
        <Lightformer
          form="rect"
          intensity={0.4 * brightness}
          color="#9fb4d6"
          position={[-14, 6, 6]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[10, 8, 1]}
        />
        {/*
          Warm bounce off the maple floor.

          Kept deliberately weak and desaturated. The first attempt used the
          floor's own #c08a4a at 0.7 across an 18 m plane, which is a huge
          saturated orange source sitting at ankle height — it tinted every
          surface in the building, and the light plaster walls (#D8D2C4) came
          out looking like dark brown panelling. Real bounce off a varnished
          floor is a fraction of the incident light and much less saturated
          than the surface it leaves.
        */}
        <Lightformer
          form="rect"
          intensity={0.16 * brightness}
          color="#b09a80"
          position={[0, 0.2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[18, 18, 1]}
        />
      </Environment>

      <ambientLight intensity={0.1 * brightness} color="#c9d2e0" />

    </>
  )
}

// ---------------------------------------------------------------------------

export function MuseumScene() {
  const materials = useMaterialLibrary()
  const currentRoom = useMuseum((state) => state.currentRoom)
  const visibleRooms = useMuseum((state) => state.visibleRooms)
  const locale = useMuseum((state) => state.settings.locale)

  /**
   * The collision world is rebuilt whenever the material library changes, which
   * in practice means once. It deliberately holds EVERY room, not just the
   * visible ones: culling decides what to draw, never what is solid. Making
   * them the same thing is how players walk through walls they cannot see.
   */
  const collision = useMemo(() => new CollisionWorld(), [])

  /**
   * Spawn looking WEST, at the Holyoke doorway.
   *
   * The default camera looks down -Z, which from the middle of the atrium is a
   * blank eighteen-metre wall. The first frame of a museum should show a way
   * in, not plaster.
   */
  const spawn = useMemo<[number, number, number]>(() => [2.5, 0, 1], [])
  const spawnYaw = Math.PI / 2

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    window.__museumCollision = (probeAt?: [number, number, number]) =>
      probeAt
        ? { colliders: collision.size, probe: collision.probe(new Vector3(...probeAt), { radius: 0.3, height: 1.75 }) }
        : { colliders: collision.size, bounds: collision.describe() }
    return () => {
      delete window.__museumCollision
    }
  }, [collision])

  return (
    <>
      <color attach="background" args={['#0a0b0d']} />
      <fog attach="fog" args={['#0a0b0d', 18, 60]} />

      <MuseumLighting />

      <Suspense fallback={null}>
        {MUSEUM.rooms.map((room) => (
          <Room
            key={room.id}
            room={room}
            materials={materials}
            collision={collision}
            tier={roomRenderTier(room.id, currentRoom, visibleRooms.includes(room.id))}
            locale={locale}
          />
        ))}
      </Suspense>

      <PlayerController
        world={collision}
        spawn={spawn}
        spawnYaw={spawnYaw}
        onFootstep={(surface, intensity) =>
          museumAudio.footstep(surface as 'wood' | 'stone' | 'carpet', intensity)
        }
      />
      <VisibilityDriver />
      <InteractionTargeting />
      <ContainerTargeting />
      <PowerControlTargeting />
      <ExamineView />
      <PerfHud />
    </>
  )
}
