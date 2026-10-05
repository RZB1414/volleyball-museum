/**
 * The map.
 *
 * Ported almost verbatim from RE2R, because it is the single most transferable
 * system in that series and it eliminates most of the genre's anti-patterns on
 * one screen. Three things make it work, and all three are here:
 *
 *   1. Rooms draw themselves as you enter. You never see the shape of a wing
 *      you have not walked.
 *   2. The fill encodes UNFINISHED BUSINESS, not just "visited". Amber
 *      hatching means there is still something in there; solid blue means
 *      done. A player can see at a glance where to go back to.
 *   3. Every lock you have touched is annotated BY NAME. The word "Gaveta com
 *      segredo" appearing on the map is what turns a locked drawer from
 *      confusion into mystery — you know exactly what you cannot do yet.
 *
 * Anything the player personally saw and the map omits teaches them to stop
 * trusting the map and start taking notes on paper. That is a design failure,
 * not admirable dedication.
 *
 * What is on the plan is not decided here. `mapModel` decides it, where the
 * suite can ask (`npm run test:map`), and this component draws what it is
 * handed: it reads neither the museum nor the save by itself. It used to do
 * both, and drew every room and every door of the building.
 */

import { MUSEUM } from '../content/museum'
import { playerHeading, playerPosition } from '../engine/playerPosition'
import { useTranslate } from '../i18n'
import { useMuseum } from '../state/store'
import { MAP_STATE_LABEL, MAP_STATE_STYLE, MAP_STATES, mapModel, type MapModel, type MapRoomState } from './mapModel'

/** The journal's own ground, under a room with no light and between the lines of a hatch. */
const GROUND = '#1b1c20'
const hatchId = (state: MapRoomState) => `map-hatch-${state}`

/**
 * How a state is painted, from its pattern and its colour: the one function
 * both a room and its sample in the legend go through, so the legend cannot
 * show a pattern the plan does not draw.
 */
function statePaint(state: MapRoomState) {
  const { pattern, colour } = MAP_STATE_STYLE[state]
  if (pattern === 'dashed') return { fill: GROUND, stroke: colour, strokeDasharray: '5 3' }
  if (pattern === 'hatched') return { fill: `url(#${hatchId(state)})`, stroke: colour }
  return { fill: colour, fillOpacity: 0.45, stroke: colour }
}

export function MuseumMap() {
  const progress = useMuseum((state) => state.progress)
  const currentRoom = useMuseum((state) => state.currentRoom)
  const t = useTranslate()

  // The player's marker is sampled rather than subscribed: the map is a
  // static screen, and driving it from a 60 Hz value would re-render it every
  // frame. The player cannot move or turn while the notebook is open.
  const model = mapModel(MUSEUM, progress, {
    x: playerPosition.x,
    z: playerPosition.z,
    yaw: playerHeading.yaw,
    room: currentRoom,
  })

  return (
    <div className="map">
      {/* A group and not one image: the marker, the rose and the stubs carry
          names of their own, and inside an image nothing has a name. */}
      <svg viewBox={`0 0 ${model.width} ${model.height}`} role="group" aria-label={t('map.title')}>
        <defs>
          {MAP_STATES.filter((state) => MAP_STATE_STYLE[state].pattern === 'hatched').map((state) => (
            <pattern
              key={state}
              id={hatchId(state)}
              width="5"
              height="5"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="5" height="5" fill={GROUND} />
              <rect width="1.7" height="5" fill={MAP_STATE_STYLE[state].colour} fillOpacity="0.6" />
            </pattern>
          ))}
        </defs>

        {model.rooms.map((room) => (
          <g key={room.id}>
            <rect
              className={room.current ? 'map-room is-current' : 'map-room'}
              x={room.x}
              y={room.y}
              width={room.width}
              height={room.height}
              {...statePaint(room.state)}
            />
            <text x={room.x + 8} y={room.y + 18} className="map-room-name">
              {t(room.titleKey as never)}
            </text>
            {room.pips.map((pip) => (
              <circle key={pip.id} cx={pip.x} cy={pip.y} r={3} className="map-pip" />
            ))}
          </g>
        ))}

        {/*
          Doorways, cut into the walls after every room is drawn: two rooms
          share each wall, and a neighbour drawn later would paint its outline
          straight over an opening drawn with the first.
        */}
        {model.doors.map((door) => (
          <g key={door.key} className="map-door">
            <line className="map-door-gap" {...door.gap} strokeWidth={door.depth} />
            {door.jambs.map((jamb, index) => (
              <line key={index} className="map-door-jamb" {...jamb} />
            ))}
            {door.stub ? (
              <g className="map-stub">
                <title>{t('map.unknown')}</title>
                <line {...door.stub.line} />
                <text x={door.stub.x} y={door.stub.y}>
                  ?
                </text>
              </g>
            ) : null}
          </g>
        ))}

        <g
          className="map-north"
          role="img"
          aria-label={t('map.north')}
          transform={`translate(${model.north.x} ${model.north.y})`}
        >
          <path d="M0 -9 L4.2 4 L0 1 L-4.2 4 Z" />
          {/* The letter is the same in both languages. */}
          <text y={-12}>N</text>
        </g>

        <g
          className="map-player"
          role="img"
          aria-label={t('map.you')}
          transform={`translate(${model.player.x} ${model.player.y}) rotate(${model.player.headingDegrees})`}
        >
          {/* Drawn pointing up the page, which is north; the model turns it. */}
          <path d="M0 -7 L5 5.5 L0 2.6 L-5 5.5 Z" />
        </g>
      </svg>

      <div className="map-legend">
        <h3>{t('map.legend')}</h3>
        <ul>
          {MAP_STATES.map((state) => (
            <li key={state}>
              <svg className="map-swatch" viewBox="0 0 22 14" aria-hidden="true">
                <rect className="map-room" x="1" y="1" width="20" height="12" {...statePaint(state)} />
              </svg>
              {t(MAP_STATE_LABEL[state])}
            </li>
          ))}
        </ul>
      </div>

      {/*
        Locks the player has encountered, named. Showing a lock they have never
        seen would be a spoiler; hiding one they HAVE seen is the confusion the
        whole system exists to prevent.
      */}
      <LockList locks={model.locks} />
    </div>
  )
}

function LockList({ locks }: { readonly locks: MapModel['locks'] }) {
  const t = useTranslate()
  if (locks.length === 0) return null

  return (
    <ul className="map-locks">
      {locks.map((lock) => (
        <li key={lock.id}>
          <span className="map-lock-mark" aria-hidden="true">
            ?
          </span>
          {t(lock.labelKey as never)}
        </li>
      ))}
    </ul>
  )
}
