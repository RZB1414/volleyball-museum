import { pathToFileURL } from 'node:url'
const repo = 'C:/Users/rzbui/OneDrive/Documentos/Portfolio/Volleyball Museum'
const u = (p) => pathToFileURL(repo + p).href
const THREE = await import(u('/node_modules/three/build/three.module.js'))
const { Vector3, Quaternion, Matrix4, Euler } = THREE
const { MUSEUM } = await import(u('/src/content/museum.ts'))
const HOLD = 0.42, DOT = 0.55, EYE = 1.62
function seenAtPickup(exhibit, room, camPos) {
  const centre = new Vector3(room.origin[0] + exhibit.position[0], exhibit.position[1], room.origin[2] + exhibit.position[2])
  const dir = centre.clone().sub(camPos).normalize()
  const held = camPos.clone().addScaledVector(dir, HOLD)
  const q = new Quaternion().setFromEuler(new Euler(0, exhibit.rotationY ?? 0, 0))
  const s = exhibit.scale ?? 1
  const m = new Matrix4().compose(held, q, new Vector3(s, s, s))
  return exhibit.hotspots.map((h) => {
    const hw = new Vector3(...h.localPosition).applyMatrix4(m)
    const toCam = camPos.clone().sub(hw).normalize()
    const out = hw.clone().sub(held).normalize()
    return `${h.id}${h.requiredForCatalogue ? '*' : ''}=${out.dot(toCam).toFixed(2)}${out.dot(toCam) > DOT ? ' SEEN' : ''}`
  })
}
for (const room of MUSEUM.rooms) {
  for (const id of room.exhibitIds) {
    const ex = MUSEUM.exhibits.find((e) => e.id === id)
    const wx = room.origin[0] + ex.position[0], wz = room.origin[2] + ex.position[2]
    // stances: 1.0 m away on each of the four sides
    const out = []
    for (const [name, dx, dz] of [['from +Z(south)', 0, 1], ['from -Z(north)', 0, -1], ['from +X(east)', 1, 0], ['from -X(west)', -1, 0]]) {
      const cam = new Vector3(wx + dx * 1.0, EYE, wz + dz * 1.0)
      out.push(`   ${name}: ${seenAtPickup(ex, room, cam).join('  ')}`)
    }
    console.log(`${room.id} / ${id} (rotY=${(ex.rotationY ?? 0).toFixed(2)}, scale=${ex.scale ?? 1})\n${out.join('\n')}`)
  }
}
// pitch axis check: yaw of camera facing west; vertical drag rotation axis in camera space
for (const [label, yaw] of [['facing north (-Z)', 0], ['facing west (-X)', Math.PI / 2], ['facing south (+Z)', Math.PI], ['facing east (+X)', -Math.PI / 2]]) {
  const camQ = new Quaternion().setFromEuler(new Euler(0, yaw, 0, 'YXZ'))
  const right = new Vector3(1, 0, 0).applyQuaternion(camQ)
  const fwd = new Vector3(0, 0, -1).applyQuaternion(camQ)
  const worldX = new Vector3(1, 0, 0)
  console.log(`${label}: world X·camRight=${worldX.dot(right).toFixed(2)}  world X·camForward=${worldX.dot(fwd).toFixed(2)}`)
}
