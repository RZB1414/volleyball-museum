/**
 * The map.
 *
 * Ported almost verbatim from RE2R, because it is the single most transferable
 * system in that series and it eliminates most of the genre's anti-patterns on
 * one screen. Three things make it work, and all three are here:
 *
 *   1. Rooms draw themselves as you enter. You never see the shape of a wing
 *      you have not walked.
 *   2. Colour encodes UNFINISHED BUSINESS, not just "visited". Amber means
 *      there is still something in there; blue means done. A player can see at
 *      a glance where to go back to.
 *   3. Every lock you have touched is annotated BY NAME. The word "Gaveta com
 *      segredo" appearing on the map is what turns a locked drawer from
 *      confusion into mystery — you know exactly what you cannot do yet.
 *
 * Anything the player personally saw and the map omits teaches them to stop
 * trusting the map and start taking notes on paper. That is a design failure,
 * not admirable dedication.
 */

import { useMemo } from 'react'

import { MUSEUM } from '../content/museum'
import { useTranslate } from '../i18n'
import { playerPosition } from '../engine/playerPosition'
import { isRoomPowered } from '../engine/power'
import { useMuseum } from '../state/store'
import { portalOpening } from './mapGeometry'

/** Metres to SVG units. The whole museum is ~40 m across. */
const SCALE = 10
const PADDING = 24

type RoomState = 'unvisited' | 'unpowered' | 'partial' | 'complete'

const STATE_FILL: Record<RoomState, string> = {
  unvisited: '#1b1c20',
  unpowered: '#1b1c20',
  partial: '#4a3a1e',
  complete: '#1e3040',
}

const STATE_STROKE: Record<RoomState, string> = {
  unvisited: '#2a2c32',
  unpowered: '#6f5742',
  partial: '#a98a52',
  complete: '#5d87a8',
}

export function MuseumMap() {
  const progress = useMuseum((state) => state.progress)
  const currentRoom = useMuseum((state) => state.currentRoom)
  const t = useTranslate()

  const bounds = useMemo(() => {
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity

    for (const room of MUSEUM.rooms) {
      const [ox, , oz] = room.origin
      minX = Math.min(minX, ox - room.shell.width / 2)
      maxX = Math.max(maxX, ox + room.shell.width / 2)
      minZ = Math.min(minZ, oz - room.shell.depth / 2)
      maxZ = Math.max(maxZ, oz + room.shell.depth / 2)
    }

    return { minX, maxX, minZ, maxZ }
  }, [])

  const toX = (worldX: number) => (worldX - bounds.minX) * SCALE + PADDING
  const toY = (worldZ: number) => (worldZ - bounds.minZ) * SCALE + PADDING
  const width = (bounds.maxX - bounds.minX) * SCALE + PADDING * 2
  const height = (bounds.maxZ - bounds.minZ) * SCALE + PADDING * 2

  /**
   * A room is COMPLETE when everything in it has been dealt with: every exhibit
   * catalogued and every reachable document read. Anything less is amber, which
   * is the state that actually drives the player back.
   */
  const stateOf = (roomId: string): RoomState => {
    if (!progress.roomsVisited.includes(roomId)) return 'unvisited'

    const room = MUSEUM.rooms.find((candidate) => candidate.id === roomId)
    if (!room) return 'unvisited'
    if (!isRoomPowered(room, progress.roomsPowered)) return 'unpowered'

    const exhibitsDone = room.exhibitIds.every((id) => progress.catalogued.includes(id))
    const documentsDone = room.documentIds.every((id) => progress.documentsRead.includes(id))
    return exhibitsDone && documentsDone ? 'complete' : 'partial'
  }

  // The player marker. Sampled rather than subscribed: the map is a static
  // screen, and driving it from a 60 Hz value would re-render it every frame.
  const playerX = toX(playerPosition.x)
  const playerY = toY(playerPosition.z)

  return (
    <div className="map">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('map.title')}>
        {MUSEUM.rooms.map((room) => {
          const state = stateOf(room.id)
          const [ox, , oz] = room.origin
          const x = toX(ox - room.shell.width / 2)
          const y = toY(oz - room.shell.depth / 2)
          const w = room.shell.width * SCALE
          const h = room.shell.depth * SCALE
          const isCurrent = room.id === currentRoom
          const known = state !== 'unvisited'

          return (
            <g key={room.id}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={STATE_FILL[state]}
                stroke={isCurrent ? '#e9d9b8' : STATE_STROKE[state]}
                strokeWidth={isCurrent ? 2 : 1.2}
                // A room you have not entered is a rumour: outline only, and
                // dashed, so the shape reads as provisional.
                strokeDasharray={known ? undefined : '4 4'}
              />

              {known ? (
                <text x={x + 8} y={y + 18} className="map-room-name">
                  {t(room.titleKey as never)}
                </text>
              ) : null}

              {/*
                Uncatalogued exhibits render as pips where they actually stand.
                This is the detail that makes the map answer "what did I leave
                behind" without the player having to remember.
              */}
              {known
                ? room.exhibitIds.map((id) => {
                    if (progress.catalogued.includes(id)) return null
                    const exhibit = MUSEUM.exhibits.find((candidate) => candidate.id === id)
                    if (!exhibit) return null
                    return (
                      <circle
                        key={id}
                        cx={toX(ox + exhibit.position[0])}
                        cy={toY(oz + exhibit.position[2])}
                        r={3}
                        className="map-pip"
                      />
                    )
                  })
                : null}

            </g>
          )
        })}

        {/*
          Doorways, cut into the walls after every room is drawn: two rooms
          share each wall, and a neighbour drawn later would paint its outline
          straight over an opening drawn with the first.
        */}
        {MUSEUM.rooms.flatMap((room) => {
          const [ox, , oz] = room.origin
          return room.portals.map((portal) => {
            const opening = portalOpening(
              toX(ox + portal.position[0]),
              toY(oz + portal.position[2]),
              portal.width * SCALE,
              portal.rotationY,
            )
            return (
              <g
                key={`${room.id}:${portal.id}`}
                className={portal.oneWay ? 'map-portal is-oneway' : 'map-portal'}
              >
                <line className="map-portal-gap" {...opening.gap} />
                {portal.oneWay ? <line className="map-portal-oneway" {...opening.gap} /> : null}
                {opening.jambs.map((jamb, index) => (
                  <line key={index} className="map-portal-jamb" {...jamb} />
                ))}
              </g>
            )
          })
        })}

        <g className="map-player" transform={`translate(${playerX} ${playerY})`}>
          <circle r={4} />
        </g>
      </svg>

      <ul className="map-legend">
        <li>
          <span className="swatch is-unpowered" /> {t('map.state.unlit')}
        </li>
        <li>
          <span className="swatch is-partial" /> {t('map.state.partial')}
        </li>
        <li>
          <span className="swatch is-complete" /> {t('map.state.complete')}
        </li>
      </ul>

      {/*
        Locks the player has encountered, named. Showing a lock they have never
        seen would be a spoiler; hiding one they HAVE seen is the confusion the
        whole system exists to prevent.
      */}
      <LockList />
    </div>
  )
}

function LockList() {
  const progress = useMuseum((state) => state.progress)
  const t = useTranslate()

  const pending = MUSEUM.locks.filter((lock) => !progress.locksOpened.includes(lock.id))
  if (pending.length === 0) return null

  return (
    <ul className="map-locks">
      {pending.map((lock) => (
        <li key={lock.id}>
          <span className="map-lock-mark" aria-hidden="true">
            ?
          </span>
          {t(lock.mapLabelKey as never)}
        </li>
      ))}
    </ul>
  )
}
