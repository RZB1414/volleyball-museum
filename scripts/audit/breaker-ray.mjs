/**
 * Casts the interaction ray at the atrium breaker's aiming proxy from eight
 * distances, both aimed at the panel and looking straight ahead.
 *
 * The proxy is rebuilt here as `PowerControls.tsx` builds it. A ray cast from
 * inside a single-sided box hits nothing, which is why the prompt vanishes
 * when the player walks up to the panel (ÁT-A1, S7): the table shows the
 * distance at which the hit is lost. Read-only; it loads nothing but three.
 *
 *   npm run audit:breaker-ray
 */

const THREE = await import('three')
const { BoxGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3, Group } = THREE
// Breaker proxy as PowerControls.tsx builds it: instance bounds x±0.23, y0..0.64, z0..0.249; minimum [0.42,0.48,0.34]
const size = [0.46, 0.64, Math.max(0.249, 0.34)]
const centre = [0, 0.32, 0.1245]
const group = new Group()
group.position.set(-8.62, 1.05, -4.4)
group.rotation.y = Math.PI / 2
const proxy = new Mesh(new BoxGeometry(...size), new MeshBasicMaterial())
proxy.position.set(...centre)
group.add(proxy)
group.updateMatrixWorld(true)
const ray = new Raycaster()
ray.far = 2.7
for (const x of [-7.0, -7.9, -8.2, -8.3, -8.33, -8.4, -8.5, -8.539]) {
  for (const [label, target] of [['aim at panel centre', new Vector3(-8.5, 1.37, -4.4)], ['look straight west', null]]) {
    const origin = new Vector3(x, 1.62, -4.4)
    const dir = target ? target.clone().sub(origin).normalize() : new Vector3(-1, 0, 0)
    if (target && target.x > x) dir.set(-1, -0.3, 0).normalize()
    ray.set(origin, dir)
    const hits = ray.intersectObject(group, true)
    console.log(`eye x=${x.toFixed(3)} ${label}: ${hits.length ? 'HIT d=' + hits[0].distance.toFixed(2) : 'no hit'}`)
  }
}
const box = new THREE.Box3().setFromObject(proxy)
console.log('proxy world box', box.min.toArray().map(n=>n.toFixed(3)), box.max.toArray().map(n=>n.toFixed(3)))
