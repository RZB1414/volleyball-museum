/**
 * Sweeps every standing point within reach of the atrium's four balls and
 * counts from how many of them each ball is catalogued the instant it is
 * picked up.
 *
 * The number behind ÁT-C3: the laced ball needs no turning from about half
 * the places a player can stand. Read-only.
 *
 *   npm run audit:laced-sweep
 */

import { load } from './lib/repo.mjs'

const THREE = await import('three')
const { Vector3, Quaternion, Matrix4, Euler } = THREE
const { MUSEUM } = await load('src/content/museum.ts')
const HOLD = 0.42, DOT = 0.55, EYE = 1.62, REACH = 2.6
for (const id of ['atrium-ball-laced','atrium-ball-tokyo-1964','atrium-ball-colour-1998','atrium-ball-eight-panel-2008']) {
  const ex = MUSEUM.exhibits.find((e) => e.id === id)
  const centre = new Vector3(...ex.position)
  const q = new Quaternion().setFromEuler(new Euler(0, ex.rotationY ?? 0, 0))
  let total = 0; const seen = Object.fromEntries(ex.hotspots.map((h) => [h.id, 0])); let catalogued = 0
  for (let x = -3.4; x <= 1.4; x += 0.1) for (let z = -7.605; z <= -5.6; z += 0.1) {
    const cam = new Vector3(x, EYE, z)
    if (cam.distanceTo(centre) > REACH) continue
    total += 1
    const dir = centre.clone().sub(cam).normalize()
    const held = cam.clone().addScaledVector(dir, HOLD)
    const m = new Matrix4().compose(held, q, new Vector3(1, 1, 1))
    let all = true
    for (const h of ex.hotspots) {
      const hw = new Vector3(...h.localPosition).applyMatrix4(m)
      const d = hw.clone().sub(held).normalize().dot(cam.clone().sub(hw).normalize())
      if (d > DOT) seen[h.id] += 1
      else if (h.requiredForCatalogue) all = false
    }
    if (all) catalogued += 1
  }
  console.log(id, 'stances in reach:', total, 'instant catalogue:', catalogued, `(${(100*catalogued/total).toFixed(0)}%)`, JSON.stringify(seen))
}
