import { pathToFileURL } from 'node:url'
const repo = 'C:/Users/rzbui/OneDrive/Documentos/Portfolio/Volleyball Museum'
const { MUSEUM } = await import(pathToFileURL(repo + '/src/content/museum.ts').href)
const atrium = MUSEUM.rooms.find((r) => r.id === 'atrium')
const bays = atrium.kit.filter((k) => k.part === 'atrium-wall-bay-plain')
const HALF = 1.62 // trim half-width; backing 1.60
const walls = { west: [], east: [], north: [], south: [] }
for (const b of bays) {
  const [x, , z] = b.position
  if (x < -8) walls.west.push(z); else if (x > 8) walls.east.push(z); else if (z < -8) walls.north.push(x); else walls.south.push(x)
}
const doors = { west: [[-2, 'holyoke door'], [6.4, 'shortcut door']], east: [[3, 'office door']], north: [], south: [] }
for (const [wall, cs] of Object.entries(walls)) {
  cs.sort((a, b) => a - b)
  console.log(wall, cs.map((c) => `[${(c - HALF).toFixed(2)}..${(c + HALF).toFixed(2)}]`).join(' '))
  for (let i = 1; i < cs.length; i++) {
    const gap = (cs[i] - HALF) - (cs[i - 1] + HALF)
    console.log(`   between ${cs[i - 1]} and ${cs[i]}: ${gap >= 0 ? 'gap ' + gap.toFixed(2) : 'OVERLAP ' + (-gap).toFixed(2)} m`)
  }
  for (const [d, name] of doors[wall]) for (const c of cs) {
    const lo = c - HALF, hi = c + HALF
    const dl = d - 0.8, dh = d + 0.8
    const clear = lo > dh ? lo - dh : hi < dl ? dl - hi : -1
    if (clear < 0.4) console.log(`   ${name} opening [${dl}..${dh}] vs bay ${c}: ${clear < 0 ? 'OVERLAPS OPENING' : 'clearance ' + clear.toFixed(2) + ' m'}`)
  }
  console.log(`   corners: first starts ${(cs[0] - HALF + 8.875).toFixed(2)} m from corner, last ends ${(8.875 - cs[cs.length - 1] - HALF).toFixed(2)} m from corner`)
}
