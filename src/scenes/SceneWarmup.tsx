import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { Material, Object3D, Scene, Texture, WebGLRenderer } from 'three'

const MATERIAL_TEXTURE_KEYS = [
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'lightMap',
  'map',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
] as const

type TextureMaterial = Material & Partial<Record<(typeof MATERIAL_TEXTURE_KEYS)[number], Texture>>

function warmTextures(gl: WebGLRenderer, scene: Scene) {
  const warmedTextures = new Set<Texture>()

  scene.traverse((object: Object3D) => {
    const material = (object as { material?: TextureMaterial | TextureMaterial[] }).material

    if (!material) {
      return
    }

    const materials = Array.isArray(material) ? material : [material]

    materials.forEach((currentMaterial) => {
      MATERIAL_TEXTURE_KEYS.forEach((key) => {
        const texture = currentMaterial[key]

        if (texture && !warmedTextures.has(texture)) {
          gl.initTexture(texture)
          warmedTextures.add(texture)
        }
      })
    })
  })
}

export function SceneWarmup() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    let cancelled = false
    const timers = [250, 1200, 2600].map((delay) =>
      window.setTimeout(() => {
        if (cancelled) {
          return
        }

        warmTextures(gl, scene)
        void gl.compileAsync(scene, camera).catch(() => {
          gl.compile(scene, camera)
        })
      }, delay),
    )

    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [camera, gl, scene])

  return null
}
