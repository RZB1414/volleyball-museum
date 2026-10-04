/**
 * Casts the interaction ray at every wall breaker's aiming volume, from the
 * distance where the capsule stops and from seven others along the breaker's
 * own normal, both aimed at the panel and looking straight at the wall.
 *
 * This is the script that showed why the prompt went out when the player
 * walked up to the atrium panel (ÁT-A1): the capsule stopped with the eye
 * inside the volume, and a ray cast from inside a single-sided box hits
 * nothing. Since L1 the breaker is solid and its volume is double-sided, so
 * what the table shows now is that fix holding: a hit at every distance,
 * the row where the eye would be inside the volume, and how far short of it
 * the capsule really stops.
 *
 * Nothing is rebuilt by hand here. The volume is the one the game mounts
 * (`powerControlProxy`, with `PROXY_MATERIAL_PROPS`), the positions come from
 * the content and the stand-off from the same walk `test:power` makes.
 * Read-only.
 *
 *   npm run audit:breaker-ray
 */

import { load } from './lib/repo.mjs'

const { Box3, Vector3 } = await import('three')
const { MUSEUM } = await load('src/content/museum.ts')
const { INTERACTION_REACH } = await load('src/engine/interactionTarget.ts')
const world = await load('scripts/lib/museumWorld.ts')

const f = (value, digits = 3) => value.toFixed(digits)
const collision = world.buildMuseumWorld()

for (const room of MUSEUM.rooms) {
  const control = room.powerControl
  if (!control || !world.isWallControl(room, control)) continue

  const { mesh, proxy } = world.powerControlProxy(room, control)
  const normal = world.controlNormal(control)
  const back = world.controlPoint(room, control, [0, 0, 0])
  const centre = mesh.getWorldPosition(new Vector3())
  const reach = world.reachFromWhereTheCapsuleStops(collision, room, control)
  const box = new Box3().setFromObject(mesh)

  console.log(`\n=== ${control.id} (${room.id}) ===`)
  console.log(`  aiming volume ${proxy.size.map((n) => f(n, 2)).join(' x ')} m, world box [${box.min.toArray().map((n) => f(n))}] .. [${box.max.toArray().map((n) => f(n))}]`)
  console.log(
    `  the capsule stops ${f(reach.standOff)} m from the wall plane; E ${reach.hitDistance === null ? 'does NOT reach' : `reaches at ${f(reach.hitDistance)} m`}` +
      ` (limit ${INTERACTION_REACH.powerControl} m); eye ${reach.eyeInsideProxy ? 'INSIDE' : 'outside'} the volume`,
  )

  const distances = [...new Set([1.6, 1.2, 0.9, 0.7, reach.standOff, 0.4, 0.2, 0.08])].sort((a, b) => b - a)
  for (const distance of distances) {
    const eye = back.clone().addScaledVector(normal, distance).setY(room.origin[1] + world.EYE_HEIGHT)
    const inside = world.proxyContains(mesh, eye)
    const cast = (direction) => {
      const hit = world.centreRayHit(mesh, eye, direction)
      return hit ? `HIT d=${f(hit.distance, 2)}` : 'no hit'
    }
    const where = Math.abs(distance - reach.standOff) < 1e-9 ? '  <- where the capsule stops' : distance < reach.standOff ? '  (the collider keeps the capsule out of here)' : ''
    console.log(
      `  eye ${f(distance, 2)} m from the wall${inside ? ', INSIDE the volume' : ''}: aimed at the panel ${cast(centre.clone().sub(eye))}; ` +
        `looking straight at the wall ${cast(normal.clone().negate())}${where}`,
    )
  }
}
