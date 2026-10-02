/**
 * Scene assembly.
 *
 * Reads the content set and the bake manifest and puts them together. Contains
 * no knowledge of any particular room — the atrium, Holyoke and the curator's
 * office all arrive as data.
 */

import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import {
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Group, Vector3 } from 'three'
import '../engine/bvhSetup'

import { BAKED_BUNDLES, type BakedBundle } from '../content/bake.generated'
import { AUTHORED_MEDIA } from '../content/media.authored'
import { GENERATED_MEDIA } from '../content/media.generated'
import { MUSEUM } from '../content/museum'
import type { ExhibitData, RoomData } from '../content/schema'
import { BakedRoom } from '../engine/BakedRoom'
import { museumAudio } from '../engine/audio'
import { preloadBundle, preloadTexture } from '../engine/bundleCache'
import { CollisionWorld } from '../engine/collision'
import { ContainerLayer, ContainerTargeting } from '../engine/Containers'
import { DeviceLayer, DeviceTargeting, RadioDirector, RadioHandset } from '../engine/Devices'
import { Flashlight } from '../engine/Flashlight'
import { FramedMedia } from '../engine/FramedMedia'
import {
  beginGpuWarmupDiscovery,
  cancelGpuWarmupRoot,
  createGpuWarmupScanState,
  disposeGpuWarmup,
  markGpuWarmupDiscoveryComplete,
  queueGpuWarmup,
  scanGpuWarmupResources,
  scanNeedsShaderCompile,
  subscribeGpuWarmupReady,
} from '../engine/gpuWarmup'
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
import {
  PowerControlLayer,
  PowerControlLights,
  PowerControlTargeting,
} from '../engine/PowerControls'
import { KitLayer } from '../engine/RoomFurniture'
import { RoomLighting } from '../engine/RoomLighting'
import { RoomSignage } from '../engine/RoomSignage'
import { syncRoomDetailTargets } from '../engine/roomDetailTargets'
import { RoomTextReadinessProvider } from '../engine/RoomText'
import {
  openDoorNeighbourRooms,
  roomRenderTier,
  shouldMountRoomDetail,
  shouldRenderRoomDetail,
  type RoomRenderTier,
} from '../engine/roomLod'
import { RoomWallArt } from '../engine/RoomWallArt'
import { TransitionDoorLayer } from '../engine/TransitionDoors'
import {
  buildTransitionDoorSpecs,
  transitionDoorEndpointMap,
} from '../engine/transitionDoorTopology'
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
const roomsById = new Map<string, RoomData>(MUSEUM.rooms.map((room) => [room.id, room]))
const exhibitsById = new Map(MUSEUM.exhibits.map((exhibit) => [exhibit.id, exhibit]))
const mediaById = new Map(MUSEUM.media.map((asset) => [asset.id, asset]))
const wallArtMediaById = new Map(
  [...GENERATED_MEDIA, ...AUTHORED_MEDIA].map((asset) => [asset.id, asset] as const),
)
const transitionDoorSpecs = buildTransitionDoorSpecs(MUSEUM.rooms)
const transitionDoorEndpoints = transitionDoorEndpointMap(transitionDoorSpecs)
const transitionDoorConnections = transitionDoorSpecs.map((door) => ({
  id: door.id,
  firstRoom: door.ownerRoomId,
  secondRoom: door.otherRoomId,
}))

function hasTransitionDoorBetween(firstRoom: string, secondRoom: string) {
  return transitionDoorSpecs.some(
    (door) =>
      (door.ownerRoomId === firstRoom && door.otherRoomId === secondRoom) ||
      (door.ownerRoomId === secondRoom && door.otherRoomId === firstRoom),
  )
}

/**
 * Starts the asynchronous half of a detail promotion while the destination is
 * still only a portal shell. The loader caches are the same ones consumed by
 * the mounted components, so crossing the threshold reuses decoded assets
 * rather than issuing a parallel request or a second image decode.
 */
function preloadRoomDetail(room: RoomData) {
  preloadBundle(KIT_URL)

  const shellBundle = bundleByName.get(`room-${room.id}`)
  if (shellBundle) preloadBundle(shellBundle.url)

  const exhibitBundle = bundleByName.get(`exhibits-${room.id}`)
  if (exhibitBundle) preloadBundle(exhibitBundle.url)

  for (const art of room.wallArt ?? []) {
    const asset = wallArtMediaById.get(art.mediaId)
    if (asset) preloadTexture(asset.src)
  }
  for (const exhibitId of room.exhibitIds) {
    const exhibit = exhibitsById.get(exhibitId)
    if (!exhibit?.mediaId || (exhibit.mount !== 'wall' && exhibit.mount !== 'case-wall')) continue
    const asset = mediaById.get(exhibit.mediaId)
    if (asset) preloadTexture(asset.src)
  }
}

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

  // Do not catch Suspense below CachedRoomDetail's exhibit boundary. Its
  // commit marker is the readiness barrier for the door: swallowing either
  // this GLB or a FramedMedia texture here would let the leaves open before
  // Holyoke's collection had actually reached the GPU warm-up queue.
  return (
    <ExhibitBundle
      bundle={bundle.url}
      exhibits={exhibits}
      materials={materials}
      collision={collision}
      roomOrigin={room.origin}
    />
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
              <FramedMedia
                readinessId={`exhibit-credit:${exhibit.id}`}
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

const ALL_DETAIL_BOUNDARIES_COMMITTED = 0b111

type DetailBoundary = 0b001 | 0b010 | 0b100

function clearFocusedTargetsForRoom(room: RoomData) {
  const state = useMuseum.getState()
  if (state.focusedExhibit && room.exhibitIds.includes(state.focusedExhibit)) {
    state.setFocusedExhibit(null)
  }
  if (
    state.focusedContainer &&
    (room.containers ?? []).some((container) => container.id === state.focusedContainer)
  ) {
    state.setFocusedContainer(null)
  }
  if (state.focusedPowerControl === room.powerControl?.id) {
    state.setFocusedPowerControl(null)
  }
  if (
    state.focusedDevice &&
    (room.devices ?? []).some((device) => device.id === state.focusedDevice)
  ) {
    state.setFocusedDevice(null)
  }
}

/** Reports the real commit of a Suspense subtree, including cached loads. */
function DetailBoundaryCommit({
  boundary,
  onCommit,
}: {
  boundary: DetailBoundary
  onCommit: (boundary: DetailBoundary) => void
}) {
  useEffect(() => onCommit(boundary), [boundary, onCommit])
  return null
}

function CachedRoomDetail({
  room,
  materials,
  collision,
  visible,
  interactive,
  onBoundaryCommitted,
}: {
  room: RoomData
  materials: MaterialLibrary
  collision: CollisionWorld | null
  visible: boolean
  interactive: boolean
  onBoundaryCommitted: (boundary: DetailBoundary) => void
}) {
  const rootRef = useRef<Group>(null)
  const retryRef = useRef(0)
  const targetCountRef = useRef(0)
  const expectedTargets =
    room.exhibitIds.length +
    (room.containers?.length ?? 0) +
    (room.devices?.length ?? 0) +
    (room.powerControl ? 1 : 0)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    targetCountRef.current = syncRoomDetailTargets(root, interactive)
    retryRef.current = 0
    if (!interactive) clearFocusedTargetsForRoom(room)
  }, [interactive, room])

  // A visitor can cross a doorway before an asynchronously preloaded detail
  // subtree commits. Retry only while an inactive room is still missing named
  // targets; once complete, warm rooms add no per-frame traversal of their own.
  useFrame((_, delta) => {
    if (interactive || targetCountRef.current >= expectedTargets || !rootRef.current) return
    retryRef.current -= delta
    if (retryRef.current > 0) return
    retryRef.current = 0.25
    targetCountRef.current = syncRoomDetailTargets(rootRef.current, false)
  })

  return (
    <group ref={rootRef} visible={visible}>
      {/* Background warming must never suspend the shared room list: on a slow
          connection that would replace even the current room with the outer
          null fallback while an adjacent exhibit bundle downloads. */}
      <Suspense fallback={null}>
        <ExhibitLayer room={room} materials={materials} collision={collision} />
        <DetailBoundaryCommit boundary={0b001} onCommit={onBoundaryCommitted} />
      </Suspense>
      <Suspense fallback={null}>
        <ContainerLayer
          room={room}
          kitBundle={KIT_BUNDLE}
          materials={materials}
          collision={collision}
        />
        <PowerControlLayer room={room} kitUrl={KIT_URL} materials={materials} />
        <DeviceLayer room={room} kitUrl={KIT_URL} materials={materials} />
        <KitLayer
          room={room}
          kitBundle={KIT_BUNDLE}
          materials={materials}
          collision={collision}
        />
        <DetailBoundaryCommit boundary={0b010} onCommit={onBoundaryCommitted} />
      </Suspense>
      <Suspense fallback={null}>
        <RoomWallArt room={room} />
        <DetailBoundaryCommit boundary={0b100} onCommit={onBoundaryCommitted} />
      </Suspense>
    </group>
  )
}

function Room({
  room,
  materials,
  collision,
  tier,
  detailMounted,
  detailReady,
  transitionDoorVisible,
  onDetailGpuReady,
  locale,
}: {
  room: RoomData
  materials: MaterialLibrary
  collision: CollisionWorld | null
  tier: RoomRenderTier
  detailMounted: boolean
  detailReady: boolean
  transitionDoorVisible: boolean
  onDetailGpuReady: (roomId: string, ready: boolean) => void
  locale: 'pt-BR' | 'en'
}) {
  const bundle = requireBundle(`room-${room.id}`)
  const rootRef = useRef<Group>(null)
  const warmupQueuedRef = useRef(false)
  const [boundaryMask, setBoundaryMask] = useState(0)
  const [textReady, setTextReady] = useState(false)
  const renderer = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const targetScene = useThree((state) => state.scene)

  const markBoundaryCommitted = useCallback((boundary: DetailBoundary) => {
    setBoundaryMask((current) => current | boundary)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    warmupQueuedRef.current = false
    const unsubscribe = subscribeGpuWarmupReady(renderer, root, (ready) => {
      onDetailGpuReady(room.id, ready)
    })
    return () => {
      unsubscribe()
      cancelGpuWarmupRoot(renderer, root)
      warmupQueuedRef.current = false
    }
  }, [onDetailGpuReady, renderer, room.id])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const complete =
      detailMounted &&
      boundaryMask === ALL_DETAIL_BOUNDARIES_COMMITTED &&
      textReady

    if (!complete) {
      warmupQueuedRef.current = false
      beginGpuWarmupDiscovery(renderer, root)
      return
    }
    if (warmupQueuedRef.current) return
    warmupQueuedRef.current = true

    // This is deliberately the first scan for the generation. Waiting for all
    // Suspense boundaries and every Troika onSync avoids remembering empty text
    // geometry, while rooting it at Room includes shell and signage as well as
    // the cached exhibits/furniture subtree.
    beginGpuWarmupDiscovery(renderer, root)
    const scan = scanGpuWarmupResources(root, createGpuWarmupScanState())
    const compileShaders = scanNeedsShaderCompile(scan)
    const uploadGeometry = scan.renderablesAdded > 0
    queueGpuWarmup(
      renderer,
      compileShaders || uploadGeometry
        ? { root, camera, targetScene, compileShaders, uploadGeometry }
        : null,
      scan.textures,
    )
    markGpuWarmupDiscoveryComplete(renderer, root)
  }, [boundaryMask, camera, detailMounted, renderer, targetScene, textReady])

  const visible = tier !== 'hidden'
  const detailed = tier === 'detail'
  const renderDetail = shouldRenderRoomDetail(tier, detailReady, transitionDoorVisible)

  return (
    <RoomTextReadinessProvider
      enabled={detailMounted && boundaryMask === ALL_DETAIL_BOUNDARIES_COMMITTED}
      onReadyChange={setTextReady}
    >
    <group ref={rootRef} name={`room-root:${room.id}`} visible={visible}>
      <BakedRoom
        bundle={bundle}
        materials={materials}
        origin={room.origin}
        collision={collision}
        // Collision is authored by the bake manifest. In particular, ceiling,
        // decorative panelling and glass stay non-solid without name guesses.
        noCollide={(name) => !bakedPartHasCollider(bundle, name)}
      />
      <group position={room.origin as unknown as [number, number, number]}>
        {/* A portal view needs the destination architecture, light and wayfinding.
            Adjacent detail warms at idle priority, then crossing or returning to
            the room reveals the parked subtree without rebuilding it. */}
        {detailMounted ? (
          <CachedRoomDetail
            room={room}
            materials={materials}
            collision={collision}
            // Once the closed door has masked a complete GPU warm-up, reveal
            // the furnished destination before the first hinge movement. The
            // opaque leaf hides this preparatory frame; opening onto an empty
            // shell and popping props at the threshold would defeat the door.
            visible={renderDetail}
            interactive={detailed}
            onBoundaryCommitted={markBoundaryCommitted}
          />
        ) : null}
        <RoomSignage
          room={room}
          locale={locale}
          kitBundle={KIT_BUNDLE}
          materials={materials}
        />
      </group>
    </group>
    </RoomTextReadinessProvider>
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
function VisibilityDriver({
  visibleTransitionDoors,
}: {
  visibleTransitionDoors: ReadonlySet<string>
}) {
  const camera = useThree((state) => state.camera)
  const cells = useMemo(() => buildCells(MUSEUM.rooms), [])
  const lastRoomRef = useRef<string | null>(null)
  const visibilityDelayRef = useRef(0)
  const probe = useRef(new Vector3())

  useEffect(() => {
    visibilityDelayRef.current = 0
  }, [visibleTransitionDoors])

  useFrame((_, delta) => {
    probe.current.copy(playerPosition)
    probe.current.y += 1.0

    const current = roomAt(cells, probe.current) ?? lastRoomRef.current
    let roomChanged = false
    if (current && current !== lastRoomRef.current) {
      lastRoomRef.current = current
      roomChanged = true
      useMuseum.getState().setCurrentRoom(current)
    }

    // Camera/portal visibility does not need a 60 Hz graph walk. At 20 Hz the
    // maximum reveal delay is 50 ms, while room crossings remain immediate and
    // the hot render loop avoids allocating a Set, queue and result array on
    // every frame.
    visibilityDelayRef.current -= delta
    if (!roomChanged && visibilityDelayRef.current > 0) return
    visibilityDelayRef.current = 0.05
    useMuseum
      .getState()
      .setVisibleRooms(
        computeVisibleRooms(
          cells,
          camera,
          probe.current,
          current,
          2,
          (roomId, portalId) => {
            const doorId = transitionDoorEndpoints.get(`${roomId}:${portalId}`)
            return !doorId || visibleTransitionDoors.has(doorId)
          },
        ),
      )
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
  const renderer = useThree((state) => state.gl)
  const materials = useMaterialLibrary()
  const currentRoom = useMuseum((state) => state.currentRoom)
  const previousRoom = useMuseum((state) => state.previousRoom)
  const visibleRooms = useMuseum((state) => state.visibleRooms)
  const locale = useMuseum((state) => state.settings.locale)
  const warmedRoomsRef = useRef(new Set<string>())
  const requestedWarmRoomsRef = useRef(new Set<string>())
  const [warmRevision, setWarmRevision] = useState(0)
  const [readyRooms, setReadyRooms] = useState<ReadonlySet<string>>(() => new Set())
  const readyRoomsRef = useRef(new Set<string>())
  const [visibleTransitionDoors, setVisibleTransitionDoors] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [revealedDoorTargets, setRevealedDoorTargets] = useState<
    ReadonlyMap<string, string>
  >(() => new Map())
  // The current-room store update already causes this render, so recording the
  // warm entry in a ref mounts the destination without a second React pass.
  warmedRoomsRef.current.add(currentRoom)
  requestedWarmRoomsRef.current.delete(currentRoom)

  const handleRoomGpuReady = useCallback((roomId: string, ready: boolean) => {
    if (ready) readyRoomsRef.current.add(roomId)
    else readyRoomsRef.current.delete(roomId)
    setReadyRooms((current) => {
      const hasRoom = current.has(roomId)
      if (hasRoom === ready) return current
      const next = new Set(current)
      if (ready) next.add(roomId)
      else next.delete(roomId)
      return next
    })
  }, [])
  const isRoomReady = useCallback(
    (roomId: string) => readyRoomsRef.current.has(roomId),
    [],
  )

  const handleTransitionDoorVisibility = useCallback((
    doorId: string,
    visible: boolean,
    destinationRoomId?: string,
  ) => {
    setVisibleTransitionDoors((current) => {
      if (current.has(doorId) === visible) return current
      const next = new Set(current)
      if (visible) next.add(doorId)
      else next.delete(doorId)
      return next
    })
    setRevealedDoorTargets((current) => {
      const next = new Map(current)
      if (visible && destinationRoomId) next.set(doorId, destinationRoomId)
      else next.delete(doorId)
      if (
        next.size === current.size &&
        [...next].every(([id, target]) => current.get(id) === target)
      ) {
        return current
      }
      return next
    })
  }, [])

  const visibleDoorNeighbours = useMemo(
    () =>
      openDoorNeighbourRooms(
        currentRoom,
        visibleTransitionDoors,
        transitionDoorConnections,
      ),
    [currentRoom, visibleTransitionDoors],
  )
  const revealedLightingRoom = revealedDoorTargets.values().next().value ?? null
  const primaryLightingRoom = revealedLightingRoom ?? currentRoom
  const retainedLightingRoom = revealedLightingRoom
    ? currentRoom === revealedLightingRoom
      ? visibleDoorNeighbours.values().next().value ?? previousRoom ?? null
      : currentRoom
    : previousRoom && visibleDoorNeighbours.has(previousRoom)
      ? previousRoom
      : visibleDoorNeighbours.values().next().value ?? null

  const requestWarmRoom = useCallback((roomId: string) => {
    if (
      !roomsById.has(roomId) ||
      warmedRoomsRef.current.has(roomId) ||
      requestedWarmRoomsRef.current.has(roomId)
    ) {
      return
    }
    requestedWarmRoomsRef.current.add(roomId)
    const room = roomsById.get(roomId)
    if (room) preloadRoomDetail(room)
    startTransition(() => setWarmRevision((revision) => revision + 1))
  }, [])

  /**
   * The collision world is rebuilt whenever the material library changes, which
   * in practice means once. It deliberately holds EVERY room, not just the
   * visible ones: culling decides what to draw, never what is solid. Making
   * them the same thing is how players walk through walls they cannot see.
   */
  const collision = useMemo(() => new CollisionWorld(), [])

  useEffect(
    () => () => {
      disposeGpuWarmup(renderer)
    },
    [renderer],
  )

  /**
   * Spawn from the content set: the curator's office, back to the door.
   *
   * The default camera looks down -Z, whatever is there; the authored heading
   * is what makes the first frame the desk, the notebook and the stopped clock
   * instead of a wall.
   */
  const spawn = useMemo<[number, number, number]>(() => {
    const room = roomsById.get(MUSEUM.spawn.room)
    const origin = room?.origin ?? [0, 0, 0]
    return [
      origin[0] + MUSEUM.spawn.position[0],
      origin[1] + MUSEUM.spawn.position[1],
      origin[2] + MUSEUM.spawn.position[2],
    ]
  }, [])
  const spawnYaw = MUSEUM.spawn.yaw

  useEffect(() => {
    const candidates = new Set(requestedWarmRoomsRef.current)
    for (const roomId of visibleRooms) {
      // A closed physical door deliberately masks a cold gallery. Let its
      // proximity trigger request the detail rather than treating the portal
      // rectangle as transparent and rebuilding the old load-all-at-spawn
      // behaviour behind an opaque leaf.
      if (!hasTransitionDoorBetween(currentRoom, roomId)) candidates.add(roomId)
    }
    const pending = [...candidates].filter(
      (roomId) => roomId !== currentRoom && !warmedRoomsRef.current.has(roomId),
    )
    for (const roomId of pending) {
      const room = roomsById.get(roomId)
      if (room) preloadRoomDetail(room)
    }

    let cancelled = false
    let handle: number | null = null
    let usesIdleCallback = false
    let index = 0

    const scheduleNext = () => {
      if (cancelled || index >= pending.length) return
      const warm = (deadline?: IdleDeadline) => {
        handle = null
        if (cancelled) return
        // Building a cached detail tree creates instance buffers and static
        // BVHs. Yield a non-expired idle slice that no longer has enough room;
        // the timeout still guarantees progress behind the closed leaf.
        if (deadline && !deadline.didTimeout && deadline.timeRemaining() < 6) {
          scheduleNext()
          return
        }
        const roomId = pending[index]
        index += 1
        if (!warmedRoomsRef.current.has(roomId)) {
          warmedRoomsRef.current.add(roomId)
          requestedWarmRoomsRef.current.delete(roomId)
          startTransition(() => setWarmRevision((revision) => revision + 1))
        }
        // One room per idle slice prevents two detail trees from constructing
        // instances and BVHs in the same frame on a wide atrium view.
        scheduleNext()
      }

      if (typeof window.requestIdleCallback === 'function') {
        usesIdleCallback = true
        handle = window.requestIdleCallback(warm, { timeout: 280 })
      } else {
        usesIdleCallback = false
        handle = window.setTimeout(() => warm(), 80)
      }
    }

    scheduleNext()
    return () => {
      cancelled = true
      if (handle === null) return
      if (usesIdleCallback) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
  }, [currentRoom, visibleRooms, warmRevision])

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
      {/* One permanent pool preserves both sides of the most recent doorway;
          nesting it under a room would remount every light at the threshold. */}
      <RoomLighting
        primaryRoomId={primaryLightingRoom}
        retainedRoomId={retainedLightingRoom}
      />
      <PowerControlLights
        primaryRoomId={primaryLightingRoom}
        retainedRoomId={retainedLightingRoom}
      />

      <Suspense fallback={null}>
        {MUSEUM.rooms.map((room) => {
          const visible =
            visibleRooms.includes(room.id) || visibleDoorNeighbours.has(room.id)
          return (
            <Room
              key={room.id}
              room={room}
              materials={materials}
              collision={collision}
              tier={roomRenderTier(room.id, currentRoom, visible)}
              detailMounted={shouldMountRoomDetail(
                room.id,
                currentRoom,
                warmedRoomsRef.current,
              )}
              detailReady={readyRooms.has(room.id)}
              transitionDoorVisible={visibleDoorNeighbours.has(room.id)}
              onDetailGpuReady={handleRoomGpuReady}
              locale={locale}
            />
          )
        })}
      </Suspense>

      <Suspense fallback={null}>
        <TransitionDoorLayer
          kitBundle={KIT_BUNDLE}
          materials={materials}
          collision={collision}
          isRoomReady={isRoomReady}
          requestWarmRoom={requestWarmRoom}
          onDoorVisibilityChanged={handleTransitionDoorVisibility}
          visibleDoorIds={visibleTransitionDoors}
        />
      </Suspense>

      <PlayerController
        world={collision}
        spawn={spawn}
        spawnYaw={spawnYaw}
        onFootstep={(surface, intensity) =>
          museumAudio.footstep(surface as 'wood' | 'stone' | 'carpet', intensity)
        }
      />
      {/* After the controller, so the beam follows this frame's camera. */}
      <Flashlight />
      <VisibilityDriver visibleTransitionDoors={visibleTransitionDoors} />
      <InteractionTargeting />
      <ContainerTargeting />
      <PowerControlTargeting />
      <DeviceTargeting />
      <RadioDirector />
      <RadioHandset />
      <ExamineView />
      <PerfHud />
    </>
  )
}
