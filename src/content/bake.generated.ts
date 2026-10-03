/**
 * GENERATED FILE — do not edit.
 *
 * Produced by `npm run bake`. Describes what the procedural generators
 * actually emitted: node names, bounds, triangle counts and collider
 * primitives. The runtime reads this instead of guessing at GLB structure,
 * which is why this project does not use gltfjsx — the bake authored the file,
 * so the structure is already known.
 */

export type BakedBounds = {
  readonly min: readonly [number, number, number]
  readonly max: readonly [number, number, number]
  readonly size: readonly [number, number, number]
  readonly centre: readonly [number, number, number]
}

export type BakedCollider = {
  readonly kind: 'box'
  readonly halfExtents: readonly [number, number, number]
  readonly centre: readonly [number, number, number]
}

export type BakedPart = {
  readonly name: string
  readonly material: string
  readonly bounds: BakedBounds
  readonly triangles: number
  readonly collider?: BakedCollider
}

export type BakedBundle = {
  readonly name: string
  readonly url: string
  readonly bytes: number
  readonly parts: readonly BakedPart[]
}

export type BakedTextureSet = {
  /** sRGB. */
  readonly albedo: string
  /** Linear data — must NOT be decoded as sRGB. */
  readonly normal: string
  /** Linear data. Occlusion in R, roughness in G, metalness in B. */
  readonly orm: string
}

/**
 * Runtime material definitions. The GLBs carry plain colour placeholders; the
 * runtime looks a part's material up here and builds the real textured
 * material, so shared textures are downloaded and uploaded to the GPU once.
 */
export type BakedMaterial = {
  readonly baseColor: readonly [number, number, number, number]
  readonly roughness: number
  readonly metalness: number
  readonly clearcoat?: number
  readonly clearcoatRoughness?: number
  readonly emissive?: readonly [number, number, number]
  readonly emissiveIntensity?: number
  readonly alphaMode?: string
  /** Fabric lobe. Its presence makes the material physical. */
  readonly sheen?: number
  /** Linear RGB. */
  readonly sheenColor?: readonly [number, number, number]
  readonly sheenRoughness?: number
  /** Scales the normal map: one set of maps, a smoother or deeper grain. */
  readonly normalScale?: number
  /** Scales the ORM roughness channel, which otherwise multiplies 1. */
  readonly roughnessScale?: number
  readonly textures?: BakedTextureSet
}

export const BAKED_BUNDLES = [
  {
    "name": "room-atrium",
    "url": "/models/room-atrium.b214394f.glb",
    "bytes": 157364,
    "parts": [
      {
        "name": "atrium__floor",
        "material": "maple-floor",
        "bounds": {
          "min": [
            -9.125,
            -0.18,
            -9.125
          ],
          "max": [
            9.125,
            0,
            9.125
          ],
          "size": [
            18.25,
            0.18,
            18.25
          ],
          "centre": [
            0,
            -0.09,
            0
          ]
        },
        "triangles": 300,
        "collider": {
          "kind": "box",
          "halfExtents": [
            9.125,
            0.09,
            9.125
          ],
          "centre": [
            0,
            -0.09,
            0
          ]
        }
      },
      {
        "name": "atrium__ceiling",
        "material": "plaster",
        "bounds": {
          "min": [
            -9.125,
            8.4,
            -9.125
          ],
          "max": [
            9.125,
            8.54,
            9.125
          ],
          "size": [
            18.25,
            0.14,
            18.25
          ],
          "centre": [
            0,
            8.47,
            0
          ]
        },
        "triangles": 300,
        "collider": {
          "kind": "box",
          "halfExtents": [
            9.125,
            0.07,
            9.125
          ],
          "centre": [
            0,
            8.47,
            0
          ]
        }
      },
      {
        "name": "atrium__structure",
        "material": "plaster",
        "bounds": {
          "min": [
            -9.125,
            0,
            -9.125
          ],
          "max": [
            9.125,
            8.4,
            9.125
          ],
          "size": [
            18.25,
            8.4,
            18.25
          ],
          "centre": [
            0,
            4.2,
            0
          ]
        },
        "triangles": 3000,
        "collider": {
          "kind": "box",
          "halfExtents": [
            9.125,
            4.2,
            9.125
          ],
          "centre": [
            0,
            4.2,
            0
          ]
        }
      },
      {
        "name": "atrium__panelling",
        "material": "oak-matte",
        "bounds": {
          "min": [
            -9,
            0.16,
            -9
          ],
          "max": [
            9,
            1.02,
            9
          ],
          "size": [
            18,
            0.86,
            18
          ],
          "centre": [
            0,
            0.59,
            0
          ]
        },
        "triangles": 756,
        "collider": {
          "kind": "box",
          "halfExtents": [
            9,
            0.43,
            9
          ],
          "centre": [
            0,
            0.59,
            0
          ]
        }
      },
      {
        "name": "atrium__trim",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -9.375,
            -0.002,
            -9.002
          ],
          "max": [
            9.375,
            8.402,
            9.002
          ],
          "size": [
            18.75,
            8.404,
            18.004
          ],
          "centre": [
            0,
            4.2,
            0
          ]
        },
        "triangles": 6296,
        "collider": {
          "kind": "box",
          "halfExtents": [
            9.375,
            4.202,
            9.002
          ],
          "centre": [
            0,
            4.2,
            0
          ]
        }
      },
      {
        "name": "atrium__threshold",
        "material": "brass",
        "bounds": {
          "min": [
            -9.375,
            0,
            -2.81
          ],
          "max": [
            9.375,
            0.014,
            7.21
          ],
          "size": [
            18.75,
            0.014,
            10.02
          ],
          "centre": [
            0,
            0.007,
            2.2
          ]
        },
        "triangles": 180,
        "collider": {
          "kind": "box",
          "halfExtents": [
            9.375,
            0.007,
            5.01
          ],
          "centre": [
            0,
            0.007,
            2.2
          ]
        }
      }
    ]
  },
  {
    "name": "room-holyoke",
    "url": "/models/room-holyoke.aa0b5458.glb",
    "bytes": 95548,
    "parts": [
      {
        "name": "holyoke__floor",
        "material": "maple-floor",
        "bounds": {
          "min": [
            -6.125,
            -0.18,
            -8.125
          ],
          "max": [
            6.125,
            0,
            8.125
          ],
          "size": [
            12.25,
            0.18,
            16.25
          ],
          "centre": [
            0,
            -0.09,
            0
          ]
        },
        "triangles": 300,
        "collider": {
          "kind": "box",
          "halfExtents": [
            6.125,
            0.09,
            8.125
          ],
          "centre": [
            0,
            -0.09,
            0
          ]
        }
      },
      {
        "name": "holyoke__ceiling",
        "material": "plaster",
        "bounds": {
          "min": [
            -6.125,
            4.2,
            -8.125
          ],
          "max": [
            6.125,
            4.34,
            8.125
          ],
          "size": [
            12.25,
            0.14,
            16.25
          ],
          "centre": [
            0,
            4.27,
            0
          ]
        },
        "triangles": 300,
        "collider": {
          "kind": "box",
          "halfExtents": [
            6.125,
            0.07,
            8.125
          ],
          "centre": [
            0,
            4.27,
            0
          ]
        }
      },
      {
        "name": "holyoke__structure",
        "material": "plaster",
        "bounds": {
          "min": [
            -6.125,
            0,
            -8.125
          ],
          "max": [
            6.125,
            4.2,
            8.125
          ],
          "size": [
            12.25,
            4.2,
            16.25
          ],
          "centre": [
            0,
            2.1,
            0
          ]
        },
        "triangles": 2400,
        "collider": {
          "kind": "box",
          "halfExtents": [
            6.125,
            2.1,
            8.125
          ],
          "centre": [
            0,
            2.1,
            0
          ]
        }
      },
      {
        "name": "holyoke__panelling",
        "material": "oak-matte",
        "bounds": {
          "min": [
            -6,
            0.16,
            -8
          ],
          "max": [
            6,
            1.02,
            8
          ],
          "size": [
            12,
            0.86,
            16
          ],
          "centre": [
            0,
            0.59,
            0
          ]
        },
        "triangles": 648,
        "collider": {
          "kind": "box",
          "halfExtents": [
            6,
            0.43,
            8
          ],
          "centre": [
            0,
            0.59,
            0
          ]
        }
      },
      {
        "name": "holyoke__trim",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -6.002,
            -0.002,
            -8.002
          ],
          "max": [
            6.002,
            4.202,
            8.002
          ],
          "size": [
            12.004,
            4.204,
            16.004
          ],
          "centre": [
            0,
            2.1,
            0
          ]
        },
        "triangles": 2160,
        "collider": {
          "kind": "box",
          "halfExtents": [
            6.002,
            2.102,
            8.002
          ],
          "centre": [
            0,
            2.1,
            0
          ]
        }
      }
    ]
  },
  {
    "name": "room-office",
    "url": "/models/room-office.a2144060.glb",
    "bytes": 78340,
    "parts": [
      {
        "name": "office__floor",
        "material": "maple-floor",
        "bounds": {
          "min": [
            -3.125,
            -0.18,
            -3.625
          ],
          "max": [
            3.125,
            0,
            3.625
          ],
          "size": [
            6.25,
            0.18,
            7.25
          ],
          "centre": [
            0,
            -0.09,
            0
          ]
        },
        "triangles": 300,
        "collider": {
          "kind": "box",
          "halfExtents": [
            3.125,
            0.09,
            3.625
          ],
          "centre": [
            0,
            -0.09,
            0
          ]
        }
      },
      {
        "name": "office__ceiling",
        "material": "plaster",
        "bounds": {
          "min": [
            -3.125,
            3.2,
            -3.625
          ],
          "max": [
            3.125,
            3.34,
            3.625
          ],
          "size": [
            6.25,
            0.14,
            7.25
          ],
          "centre": [
            0,
            3.27,
            0
          ]
        },
        "triangles": 300,
        "collider": {
          "kind": "box",
          "halfExtents": [
            3.125,
            0.07,
            3.625
          ],
          "centre": [
            0,
            3.27,
            0
          ]
        }
      },
      {
        "name": "office__structure",
        "material": "plaster",
        "bounds": {
          "min": [
            -3.125,
            0,
            -3.625
          ],
          "max": [
            3.125,
            3.2,
            3.625
          ],
          "size": [
            6.25,
            3.2,
            7.25
          ],
          "centre": [
            0,
            1.6,
            0
          ]
        },
        "triangles": 1800,
        "collider": {
          "kind": "box",
          "halfExtents": [
            3.125,
            1.6,
            3.625
          ],
          "centre": [
            0,
            1.6,
            0
          ]
        }
      },
      {
        "name": "office__panelling",
        "material": "oak-matte",
        "bounds": {
          "min": [
            -3,
            0.16,
            -3.5
          ],
          "max": [
            3,
            1.02,
            3.5
          ],
          "size": [
            6,
            0.86,
            7
          ],
          "centre": [
            0,
            0.59,
            0
          ]
        },
        "triangles": 540,
        "collider": {
          "kind": "box",
          "halfExtents": [
            3,
            0.43,
            3.5
          ],
          "centre": [
            0,
            0.59,
            0
          ]
        }
      },
      {
        "name": "office__trim",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -3.002,
            -0.002,
            -3.502
          ],
          "max": [
            3.002,
            3.202,
            3.502
          ],
          "size": [
            6.004,
            3.204,
            7.004
          ],
          "centre": [
            0,
            1.6,
            0
          ]
        },
        "triangles": 1696,
        "collider": {
          "kind": "box",
          "halfExtents": [
            3.002,
            1.602,
            3.502
          ],
          "centre": [
            0,
            1.6,
            0
          ]
        }
      }
    ]
  },
  {
    "name": "kit",
    "url": "/models/kit.fcca7c6c.glb",
    "bytes": 2157260,
    "parts": [
      {
        "name": "plinth-block",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.24,
            0,
            -0.24
          ],
          "max": [
            0.24,
            1.08,
            0.24
          ],
          "size": [
            0.48,
            1.08,
            0.48
          ],
          "centre": [
            0,
            0.54,
            0
          ]
        },
        "triangles": 648,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.24,
            0.54,
            0.24
          ],
          "centre": [
            0,
            0.54,
            0
          ]
        }
      },
      {
        "name": "plinth-tapered",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.45,
            0,
            -0.45
          ],
          "max": [
            0.45,
            1.06,
            0.45
          ],
          "size": [
            0.9,
            1.06,
            0.9
          ],
          "centre": [
            0,
            0.53,
            0
          ]
        },
        "triangles": 648,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.45,
            0.53,
            0.45
          ],
          "centre": [
            0,
            0.53,
            0
          ]
        }
      },
      {
        "name": "medallion-socket",
        "material": "brass",
        "bounds": {
          "min": [
            -0.3,
            0,
            -0.3
          ],
          "max": [
            0.3,
            0.042,
            0.3
          ],
          "size": [
            0.6,
            0.042,
            0.6
          ],
          "centre": [
            0,
            0.021,
            0
          ]
        },
        "triangles": 1432
      },
      {
        "name": "vitrine-table",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.55,
            0,
            -0.35
          ],
          "max": [
            0.55,
            0.94,
            0.35
          ],
          "size": [
            1.1,
            0.94,
            0.7
          ],
          "centre": [
            0,
            0.47,
            0
          ]
        },
        "triangles": 1800,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.55,
            0.47,
            0.35
          ],
          "centre": [
            0,
            0.47,
            0
          ]
        }
      },
      {
        "name": "vitrine-glass",
        "material": "glass-vitrine",
        "bounds": {
          "min": [
            -0.534,
            0,
            -0.334
          ],
          "max": [
            0.534,
            0.504,
            0.334
          ],
          "size": [
            1.068,
            0.504,
            0.668
          ],
          "centre": [
            0,
            0.252,
            0
          ]
        },
        "triangles": 1500
      },
      {
        "name": "label-plaque",
        "material": "brass",
        "bounds": {
          "min": [
            -0.17,
            0,
            -0.1019
          ],
          "max": [
            0.17,
            1.0505,
            0.1019
          ],
          "size": [
            0.34,
            1.0505,
            0.2039
          ],
          "centre": [
            0,
            0.5252,
            0
          ]
        },
        "triangles": 588
      },
      {
        "name": "wayfinding-plaque-navy",
        "material": "holyoke-navy",
        "bounds": {
          "min": [
            -1.32,
            -0.33,
            0
          ],
          "max": [
            1.32,
            0.33,
            0.078
          ],
          "size": [
            2.64,
            0.66,
            0.078
          ],
          "centre": [
            0,
            0,
            0.039
          ]
        },
        "triangles": 924
      },
      {
        "name": "wayfinding-plaque-green",
        "material": "archive-green",
        "bounds": {
          "min": [
            -1.32,
            -0.33,
            0
          ],
          "max": [
            1.32,
            0.33,
            0.078
          ],
          "size": [
            2.64,
            0.66,
            0.078
          ],
          "centre": [
            0,
            0,
            0.039
          ]
        },
        "triangles": 924
      },
      {
        "name": "wayfinding-plaque-walnut",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -1.32,
            -0.33,
            0
          ],
          "max": [
            1.32,
            0.33,
            0.078
          ],
          "size": [
            2.64,
            0.66,
            0.078
          ],
          "centre": [
            0,
            0,
            0.039
          ]
        },
        "triangles": 924
      },
      {
        "name": "dedication-plaque",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -2.6,
            -0.75,
            0
          ],
          "max": [
            2.6,
            0.75,
            0.0965
          ],
          "size": [
            5.2,
            1.5,
            0.0965
          ],
          "centre": [
            0,
            0,
            0.0483
          ]
        },
        "triangles": 2280
      },
      {
        "name": "archive-cabinet",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.325,
            0,
            -0.275
          ],
          "max": [
            0.325,
            1.28,
            0.292
          ],
          "size": [
            0.65,
            1.28,
            0.567
          ],
          "centre": [
            0,
            0.64,
            0.0085
          ]
        },
        "triangles": 2212,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.325,
            0.64,
            0.2835
          ],
          "centre": [
            0,
            0.64,
            0.0085
          ]
        }
      },
      {
        "name": "rope-stanchion",
        "material": "brass",
        "bounds": {
          "min": [
            -0.17,
            0,
            -0.17
          ],
          "max": [
            0.17,
            0.985,
            0.17
          ],
          "size": [
            0.34,
            0.985,
            0.34
          ],
          "centre": [
            0,
            0.4925,
            0
          ]
        },
        "triangles": 512
      },
      {
        "name": "rope-span",
        "material": "rope-velvet",
        "bounds": {
          "min": [
            -0.8374,
            0.6734,
            -0.028
          ],
          "max": [
            0.8374,
            0.8763,
            0.028
          ],
          "size": [
            1.6747,
            0.2029,
            0.056
          ],
          "centre": [
            0,
            0.7749,
            0
          ]
        },
        "triangles": 528
      },
      {
        "name": "bench",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.8,
            0,
            -0.21
          ],
          "max": [
            0.8,
            0.44,
            0.21
          ],
          "size": [
            1.6,
            0.44,
            0.42
          ],
          "centre": [
            0,
            0.22,
            0
          ]
        },
        "triangles": 1156,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.8,
            0.22,
            0.21
          ],
          "centre": [
            0,
            0.22,
            0
          ]
        }
      },
      {
        "name": "vitrine-wall",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.8,
            0,
            0
          ],
          "max": [
            0.8,
            1.1,
            0.42
          ],
          "size": [
            1.6,
            1.1,
            0.42
          ],
          "centre": [
            0,
            0.55,
            0.21
          ]
        },
        "triangles": 1000,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.8,
            0.55,
            0.21
          ],
          "centre": [
            0,
            0.55,
            0.21
          ]
        }
      },
      {
        "name": "vitrine-wall__glass",
        "material": "glass-vitrine",
        "bounds": {
          "min": [
            -0.759,
            0.094,
            0.018
          ],
          "max": [
            0.759,
            1.016,
            0.382
          ],
          "size": [
            1.518,
            0.922,
            0.364
          ],
          "centre": [
            0,
            0.555,
            0.2
          ]
        },
        "triangles": 324
      },
      {
        "name": "vitrine-tower",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.35,
            0,
            -0.35
          ],
          "max": [
            0.35,
            1.9,
            0.35
          ],
          "size": [
            0.7,
            1.9,
            0.7
          ],
          "centre": [
            0,
            0.95,
            0
          ]
        },
        "triangles": 1448,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.35,
            0.95,
            0.35
          ],
          "centre": [
            0,
            0.95,
            0
          ]
        }
      },
      {
        "name": "vitrine-tower__glass",
        "material": "glass-vitrine",
        "bounds": {
          "min": [
            -0.313,
            1.023,
            -0.313
          ],
          "max": [
            0.313,
            1.828,
            0.313
          ],
          "size": [
            0.626,
            0.805,
            0.626
          ],
          "centre": [
            0,
            1.4255,
            0
          ]
        },
        "triangles": 540
      },
      {
        "name": "partition",
        "material": "plaster",
        "bounds": {
          "min": [
            -1.574,
            0,
            -0.06
          ],
          "max": [
            1.574,
            2.4,
            0.654
          ],
          "size": [
            3.148,
            2.4,
            0.714
          ],
          "centre": [
            0,
            1.2,
            0.297
          ]
        },
        "triangles": 648
      },
      {
        "name": "partition__foot",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -1.6,
            0,
            -0.086
          ],
          "max": [
            1.6,
            0.16,
            0.68
          ],
          "size": [
            3.2,
            0.16,
            0.766
          ],
          "centre": [
            0,
            1.2,
            0.297
          ]
        },
        "triangles": 144,
        "collider": {
          "kind": "box",
          "halfExtents": [
            1.6,
            1.2,
            0.383
          ],
          "centre": [
            0,
            1.2,
            0.297
          ]
        }
      },
      {
        "name": "frame-empty",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.5121,
            -0.6871,
            0
          ],
          "max": [
            0.5121,
            0.6871,
            0.0522
          ],
          "size": [
            1.0242,
            1.3742,
            0.0522
          ],
          "centre": [
            0,
            0,
            0.0261
          ]
        },
        "triangles": 284
      },
      {
        "name": "label-angled",
        "material": "brass",
        "bounds": {
          "min": [
            -0.212,
            0,
            -0.1401
          ],
          "max": [
            0.212,
            0.902,
            0.1404
          ],
          "size": [
            0.424,
            0.902,
            0.2805
          ],
          "centre": [
            0,
            0.451,
            0.0002
          ]
        },
        "triangles": 620
      },
      {
        "name": "interp-panel",
        "material": "plaster-dark",
        "bounds": {
          "min": [
            -0.6,
            0,
            -0.28
          ],
          "max": [
            0.6,
            1.9988,
            0.16
          ],
          "size": [
            1.2,
            1.9988,
            0.44
          ],
          "centre": [
            0,
            0.9994,
            -0.06
          ]
        },
        "triangles": 1164,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.6,
            0.9994,
            0.22
          ],
          "centre": [
            0,
            0.9994,
            -0.06
          ]
        }
      },
      {
        "name": "banner__cloth",
        "material": "canvas",
        "bounds": {
          "min": [
            -0.55,
            -3.97,
            -0.122
          ],
          "max": [
            0.55,
            -0.03,
            0.122
          ],
          "size": [
            1.1,
            3.94,
            0.244
          ],
          "centre": [
            0,
            -2,
            0
          ]
        },
        "triangles": 360
      },
      {
        "name": "banner__battens",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.672,
            -4,
            -0.1594
          ],
          "max": [
            0.672,
            0,
            0.1594
          ],
          "size": [
            1.344,
            4,
            0.3187
          ],
          "centre": [
            0,
            -2,
            0
          ]
        },
        "triangles": 384
      },
      {
        "name": "reception-desk",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -1.2242,
            0,
            -1.0984
          ],
          "max": [
            1.2242,
            1.05,
            0.43
          ],
          "size": [
            2.4484,
            1.05,
            1.5284
          ],
          "centre": [
            0,
            0.525,
            -0.3342
          ]
        },
        "triangles": 1732,
        "collider": {
          "kind": "box",
          "halfExtents": [
            1.2242,
            0.525,
            0.7642
          ],
          "centre": [
            0,
            0.525,
            -0.3342
          ]
        }
      },
      {
        "name": "donation-box",
        "material": "brass",
        "bounds": {
          "min": [
            -0.185,
            0,
            -0.185
          ],
          "max": [
            0.185,
            1.148,
            0.185
          ],
          "size": [
            0.37,
            1.148,
            0.37
          ],
          "centre": [
            0,
            0.574,
            0
          ]
        },
        "triangles": 1672,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.185,
            0.574,
            0.185
          ],
          "centre": [
            0,
            0.574,
            0
          ]
        }
      },
      {
        "name": "donation-box__glass",
        "material": "glass-vitrine",
        "bounds": {
          "min": [
            -0.1433,
            0.8603,
            -0.1433
          ],
          "max": [
            0.1433,
            1.1297,
            0.1433
          ],
          "size": [
            0.2866,
            0.2695,
            0.2866
          ],
          "centre": [
            0,
            0.995,
            0
          ]
        },
        "triangles": 432
      },
      {
        "name": "door-leaf",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            0,
            0,
            -0.0225
          ],
          "max": [
            0.8,
            2.34,
            0.0225
          ],
          "size": [
            0.8,
            2.34,
            0.045
          ],
          "centre": [
            0.4,
            1.17,
            0
          ]
        },
        "triangles": 852,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.4,
            1.17,
            0.0225
          ],
          "centre": [
            0.4,
            1.17,
            0
          ]
        }
      },
      {
        "name": "door-leaf__furniture",
        "material": "brass",
        "bounds": {
          "min": [
            -0.007,
            0.251,
            -0.063
          ],
          "max": [
            0.756,
            2.089,
            0.063
          ],
          "size": [
            0.763,
            1.838,
            0.126
          ],
          "centre": [
            0.3745,
            1.17,
            0
          ]
        },
        "triangles": 1384
      },
      {
        "name": "door-leaf-right",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.8,
            0,
            -0.0225
          ],
          "max": [
            0,
            2.34,
            0.0225
          ],
          "size": [
            0.8,
            2.34,
            0.045
          ],
          "centre": [
            -0.4,
            1.17,
            0
          ]
        },
        "triangles": 852,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.4,
            1.17,
            0.0225
          ],
          "centre": [
            -0.4,
            1.17,
            0
          ]
        }
      },
      {
        "name": "door-leaf-right__furniture",
        "material": "brass",
        "bounds": {
          "min": [
            -0.756,
            0.251,
            -0.063
          ],
          "max": [
            0.007,
            2.089,
            0.063
          ],
          "size": [
            0.763,
            1.838,
            0.126
          ],
          "centre": [
            -0.3745,
            1.17,
            0
          ]
        },
        "triangles": 1384
      },
      {
        "name": "threshold",
        "material": "brass",
        "bounds": {
          "min": [
            -0.81,
            0,
            -0.25
          ],
          "max": [
            0.81,
            0.014,
            0.25
          ],
          "size": [
            1.62,
            0.014,
            0.5
          ],
          "centre": [
            0,
            0.007,
            0
          ]
        },
        "triangles": 60
      },
      {
        "name": "ceiling-spot__track",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -1.2,
            -0.052,
            -0.03
          ],
          "max": [
            1.2,
            0,
            0.03
          ],
          "size": [
            2.4,
            0.052,
            0.06
          ],
          "centre": [
            0,
            -0.026,
            0
          ]
        },
        "triangles": 268
      },
      {
        "name": "ceiling-spot__head",
        "material": "brass",
        "bounds": {
          "min": [
            -0.056,
            -0.2613,
            -0.0338
          ],
          "max": [
            0.056,
            0,
            0.065
          ],
          "size": [
            0.112,
            0.2613,
            0.0989
          ],
          "centre": [
            0,
            -0.1307,
            0.0156
          ]
        },
        "triangles": 424
      },
      {
        "name": "pendant__fitting",
        "material": "brass",
        "bounds": {
          "min": [
            -0.064,
            -0.978,
            -0.064
          ],
          "max": [
            0.064,
            0,
            0.064
          ],
          "size": [
            0.128,
            0.978,
            0.128
          ],
          "centre": [
            0,
            -0.489,
            0
          ]
        },
        "triangles": 888
      },
      {
        "name": "pendant__shade",
        "material": "plaster",
        "bounds": {
          "min": [
            -0.177,
            -0.992,
            -0.177
          ],
          "max": [
            0.177,
            -0.9,
            0.177
          ],
          "size": [
            0.354,
            0.092,
            0.354
          ],
          "centre": [
            0,
            -0.946,
            0
          ]
        },
        "triangles": 640
      },
      {
        "name": "wall-sconce",
        "material": "brass",
        "bounds": {
          "min": [
            -0.122,
            0,
            0
          ],
          "max": [
            0.122,
            0.361,
            0.272
          ],
          "size": [
            0.244,
            0.361,
            0.272
          ],
          "centre": [
            0,
            0.1805,
            0.136
          ]
        },
        "triangles": 1516
      },
      {
        "name": "vent-grille",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -0.25,
            0,
            0
          ],
          "max": [
            0.25,
            0.3,
            0.0315
          ],
          "size": [
            0.5,
            0.3,
            0.0315
          ],
          "centre": [
            0,
            0.15,
            0.0158
          ]
        },
        "triangles": 604
      },
      {
        "name": "breaker-panel",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -0.23,
            0,
            0
          ],
          "max": [
            0.23,
            0.64,
            0.167
          ],
          "size": [
            0.46,
            0.64,
            0.167
          ],
          "centre": [
            0,
            0.32,
            0.0835
          ]
        },
        "triangles": 540
      },
      {
        "name": "breaker-panel__handle",
        "material": "brass",
        "bounds": {
          "min": [
            -0.055,
            0.25,
            0.148
          ],
          "max": [
            0.0751,
            0.5068,
            0.2495
          ],
          "size": [
            0.1301,
            0.2568,
            0.1015
          ],
          "centre": [
            0.0101,
            0.3784,
            0.1988
          ]
        },
        "triangles": 304
      },
      {
        "name": "breaker-panel__indicator",
        "material": "glass-green",
        "bounds": {
          "min": [
            0.096,
            0.476,
            0.153
          ],
          "max": [
            0.154,
            0.534,
            0.171
          ],
          "size": [
            0.058,
            0.058,
            0.018
          ],
          "centre": [
            0.125,
            0.505,
            0.162
          ]
        },
        "triangles": 48
      },
      {
        "name": "curator-desk",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.875,
            0,
            -0.45
          ],
          "max": [
            0.875,
            0.74,
            0.45
          ],
          "size": [
            1.75,
            0.74,
            0.9
          ],
          "centre": [
            0,
            0.37,
            0
          ]
        },
        "triangles": 924,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.875,
            0.37,
            0.45
          ],
          "centre": [
            0,
            0.37,
            0
          ]
        }
      },
      {
        "name": "curator-desk__brass",
        "material": "brass",
        "bounds": {
          "min": [
            -0.7021,
            0.167,
            -0.3045
          ],
          "max": [
            0.7021,
            0.896,
            0.441
          ],
          "size": [
            1.4042,
            0.729,
            0.7455
          ],
          "centre": [
            0,
            0.5315,
            0.0683
          ]
        },
        "triangles": 1084
      },
      {
        "name": "curator-desk__leather",
        "material": "leather-desk",
        "bounds": {
          "min": [
            -0.705,
            0.74,
            -0.325
          ],
          "max": [
            0.705,
            0.7502,
            0.355
          ],
          "size": [
            1.41,
            0.0102,
            0.68
          ],
          "centre": [
            0,
            0.7451,
            0.015
          ]
        },
        "triangles": 140
      },
      {
        "name": "curator-desk__paper",
        "material": "paper-writing",
        "bounds": {
          "min": [
            -0.2355,
            0.747,
            -0.2845
          ],
          "max": [
            0.0355,
            0.7545,
            0.0445
          ],
          "size": [
            0.271,
            0.0075,
            0.3289
          ],
          "centre": [
            -0.1,
            0.7507,
            -0.12
          ]
        },
        "triangles": 60
      },
      {
        "name": "curator-desk__props",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.5575,
            0.747,
            -0.2682
          ],
          "max": [
            0.2627,
            0.912,
            -0.0175
          ],
          "size": [
            0.8202,
            0.165,
            0.2507
          ],
          "centre": [
            -0.1474,
            0.8295,
            -0.1428
          ]
        },
        "triangles": 252
      },
      {
        "name": "desk-telephone",
        "material": "bakelite-black",
        "bounds": {
          "min": [
            -0.13,
            0,
            -0.1227
          ],
          "max": [
            0.13,
            0.1376,
            0.1038
          ],
          "size": [
            0.26,
            0.1376,
            0.2266
          ],
          "centre": [
            0,
            0.0688,
            -0.0094
          ]
        },
        "triangles": 1476
      },
      {
        "name": "desk-telephone__card",
        "material": "enamel-cream",
        "bounds": {
          "min": [
            -0.0272,
            0.0371,
            0.0395
          ],
          "max": [
            0.0272,
            0.0687,
            0.0838
          ],
          "size": [
            0.0544,
            0.0316,
            0.0443
          ],
          "centre": [
            0,
            0.0529,
            0.0617
          ]
        },
        "triangles": 32
      },
      {
        "name": "office-chair__frame",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.2166,
            0.425,
            -0.2942
          ],
          "max": [
            0.2166,
            0.9481,
            0.0961
          ],
          "size": [
            0.4332,
            0.5231,
            0.3903
          ],
          "centre": [
            0,
            0.6865,
            -0.099
          ]
        },
        "triangles": 944
      },
      {
        "name": "office-chair__base",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.229,
            0,
            -0.199
          ],
          "max": [
            0.229,
            0.408,
            0.199
          ],
          "size": [
            0.458,
            0.408,
            0.398
          ],
          "centre": [
            0,
            0.204,
            0
          ]
        },
        "triangles": 96,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.229,
            0.204,
            0.199
          ],
          "centre": [
            0,
            0.204,
            0
          ]
        }
      },
      {
        "name": "office-chair__leather",
        "material": "leather-green",
        "bounds": {
          "min": [
            -0.2121,
            0.408,
            -0.2625
          ],
          "max": [
            0.2121,
            0.9023,
            0.2046
          ],
          "size": [
            0.4242,
            0.4943,
            0.4671
          ],
          "centre": [
            0,
            0.6552,
            -0.029
          ]
        },
        "triangles": 1012
      },
      {
        "name": "office-chair__brass",
        "material": "brass",
        "bounds": {
          "min": [
            -0.232,
            0,
            -0.2295
          ],
          "max": [
            0.232,
            0.8576,
            0.202
          ],
          "size": [
            0.464,
            0.8576,
            0.4315
          ],
          "centre": [
            0,
            0.4288,
            -0.0137
          ]
        },
        "triangles": 344
      },
      {
        "name": "desk-lamp__base",
        "material": "brass",
        "bounds": {
          "min": [
            -0.134,
            0,
            -0.097
          ],
          "max": [
            0.134,
            0.322,
            0.097
          ],
          "size": [
            0.268,
            0.322,
            0.194
          ],
          "centre": [
            0,
            0.161,
            0
          ]
        },
        "triangles": 892
      },
      {
        "name": "desk-lamp__shade",
        "material": "glass-green",
        "bounds": {
          "min": [
            -0.13,
            0.298,
            -0.092
          ],
          "max": [
            0.13,
            0.366,
            0.092
          ],
          "size": [
            0.26,
            0.068,
            0.184
          ],
          "centre": [
            0,
            0.332,
            0
          ]
        },
        "triangles": 132
      },
      {
        "name": "bookshelf",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.63,
            0,
            -0.1835
          ],
          "max": [
            0.63,
            2.72,
            0.1915
          ],
          "size": [
            1.26,
            2.72,
            0.375
          ],
          "centre": [
            0,
            1.36,
            0.004
          ]
        },
        "triangles": 1080,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.63,
            1.36,
            0.1875
          ],
          "centre": [
            0,
            1.36,
            0.004
          ]
        }
      },
      {
        "name": "bookshelf__books",
        "material": "leather-worn",
        "bounds": {
          "min": [
            -0.505,
            0.128,
            -0.0875
          ],
          "max": [
            0.297,
            2.624,
            0.1575
          ],
          "size": [
            0.802,
            2.496,
            0.245
          ],
          "centre": [
            -0.104,
            1.376,
            0.035
          ]
        },
        "triangles": 288
      },
      {
        "name": "bookshelf__booksGreen",
        "material": "leather-green",
        "bounds": {
          "min": [
            -0.465,
            0.1263,
            -0.0875
          ],
          "max": [
            0.471,
            2.624,
            0.1575
          ],
          "size": [
            0.936,
            2.4977,
            0.245
          ],
          "centre": [
            0.003,
            1.3751,
            0.035
          ]
        },
        "triangles": 120
      },
      {
        "name": "bookshelf__booksRed",
        "material": "rope-velvet",
        "bounds": {
          "min": [
            -0.485,
            0.128,
            -0.0875
          ],
          "max": [
            0.096,
            2.576,
            0.1575
          ],
          "size": [
            0.581,
            2.448,
            0.245
          ],
          "centre": [
            -0.1945,
            1.352,
            0.035
          ]
        },
        "triangles": 96
      },
      {
        "name": "bookshelf__boxes",
        "material": "archive-green",
        "bounds": {
          "min": [
            0.0915,
            0.638,
            -0.111
          ],
          "max": [
            0.5185,
            1.833,
            0.161
          ],
          "size": [
            0.427,
            1.195,
            0.272
          ],
          "centre": [
            0.305,
            1.2355,
            0.025
          ]
        },
        "triangles": 96
      },
      {
        "name": "bookshelf__brass",
        "material": "brass",
        "bounds": {
          "min": [
            0.163,
            0.7119,
            0.1575
          ],
          "max": [
            0.447,
            1.7713,
            0.1645
          ],
          "size": [
            0.284,
            1.0594,
            0.007
          ],
          "centre": [
            0.305,
            1.2416,
            0.161
          ]
        },
        "triangles": 48
      },
      {
        "name": "ledger-stack",
        "material": "leather-ledger",
        "bounds": {
          "min": [
            -0.174,
            0,
            -0.1345
          ],
          "max": [
            0.1852,
            0.1915,
            0.1463
          ],
          "size": [
            0.3592,
            0.1915,
            0.2808
          ],
          "centre": [
            0.0056,
            0.0957,
            0.0059
          ]
        },
        "triangles": 1392
      },
      {
        "name": "ledger-stack__pages",
        "material": "paper-writing",
        "bounds": {
          "min": [
            -0.1751,
            0.006,
            -0.1264
          ],
          "max": [
            0.1819,
            0.1855,
            0.1381
          ],
          "size": [
            0.357,
            0.1795,
            0.2645
          ],
          "centre": [
            0.0034,
            0.0957,
            0.0059
          ]
        },
        "triangles": 480
      },
      {
        "name": "ledger-stack__brass",
        "material": "brass",
        "bounds": {
          "min": [
            -0.1745,
            0.0158,
            -0.0468
          ],
          "max": [
            -0.1377,
            0.1789,
            0.0489
          ],
          "size": [
            0.0367,
            0.1631,
            0.0957
          ],
          "centre": [
            -0.1561,
            0.0974,
            0.001
          ]
        },
        "triangles": 48
      },
      {
        "name": "office-rug",
        "material": "rug-burgundy",
        "bounds": {
          "min": [
            -1.625,
            0,
            -2.075
          ],
          "max": [
            1.625,
            0.018,
            2.075
          ],
          "size": [
            3.25,
            0.018,
            4.15
          ],
          "centre": [
            0,
            0.009,
            0
          ]
        },
        "triangles": 168
      },
      {
        "name": "office-rug__border",
        "material": "rug-ivory",
        "bounds": {
          "min": [
            -1.57,
            0.012,
            -2.02
          ],
          "max": [
            1.57,
            0.016,
            2.02
          ],
          "size": [
            3.14,
            0.004,
            4.04
          ],
          "centre": [
            0,
            0.014,
            0
          ]
        },
        "triangles": 204
      },
      {
        "name": "office-rug__fringe",
        "material": "canvas",
        "bounds": {
          "min": [
            -1.5627,
            0.001,
            -2.1585
          ],
          "max": [
            1.5627,
            0.003,
            2.1585
          ],
          "size": [
            3.1253,
            0.002,
            4.3171
          ],
          "centre": [
            0,
            0.002,
            0
          ]
        },
        "triangles": 1008
      },
      {
        "name": "office-corkboard",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -1.125,
            0,
            0
          ],
          "max": [
            1.125,
            1.32,
            0.052
          ],
          "size": [
            2.25,
            1.32,
            0.052
          ],
          "centre": [
            0,
            0.66,
            0.026
          ]
        },
        "triangles": 432
      },
      {
        "name": "office-corkboard__cork",
        "material": "cork",
        "bounds": {
          "min": [
            -1.05,
            0.075,
            0.009
          ],
          "max": [
            1.05,
            1.245,
            0.027
          ],
          "size": [
            2.1,
            1.17,
            0.018
          ],
          "centre": [
            0,
            0.66,
            0.018
          ]
        },
        "triangles": 12
      },
      {
        "name": "office-corkboard__papers",
        "material": "paper-writing",
        "bounds": {
          "min": [
            -0.9655,
            0.2638,
            0.0295
          ],
          "max": [
            0.9286,
            1.0798,
            0.0325
          ],
          "size": [
            1.8941,
            0.816,
            0.003
          ],
          "centre": [
            -0.0184,
            0.6718,
            0.031
          ]
        },
        "triangles": 84
      },
      {
        "name": "office-corkboard__pins",
        "material": "brass",
        "bounds": {
          "min": [
            -0.799,
            0.5082,
            0.0335
          ],
          "max": [
            0.779,
            1.035,
            0.0425
          ],
          "size": [
            1.578,
            0.5268,
            0.009
          ],
          "centre": [
            -0.01,
            0.7716,
            0.038
          ]
        },
        "triangles": 224
      },
      {
        "name": "office-flatfile",
        "material": "archive-green",
        "bounds": {
          "min": [
            -0.5775,
            0,
            -0.3275
          ],
          "max": [
            0.5775,
            1.03,
            0.3275
          ],
          "size": [
            1.155,
            1.03,
            0.655
          ],
          "centre": [
            0,
            0.515,
            0
          ]
        },
        "triangles": 1404,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.5775,
            0.515,
            0.3275
          ],
          "centre": [
            0,
            0.515,
            0
          ]
        }
      },
      {
        "name": "office-flatfile__hardware",
        "material": "brass",
        "bounds": {
          "min": [
            -0.08,
            0.0612,
            0.326
          ],
          "max": [
            0.08,
            0.9649,
            0.341
          ],
          "size": [
            0.16,
            0.9037,
            0.015
          ],
          "centre": [
            0,
            0.5131,
            0.3335
          ]
        },
        "triangles": 920
      },
      {
        "name": "office-flatfile__map",
        "material": "paper-aged",
        "bounds": {
          "min": [
            -0.4814,
            1.03,
            -0.2306
          ],
          "max": [
            0.4114,
            1.034,
            0.2546
          ],
          "size": [
            0.8928,
            0.004,
            0.4852
          ],
          "centre": [
            -0.035,
            1.032,
            0.012
          ]
        },
        "triangles": 12
      },
      {
        "name": "archive-trolley",
        "material": "archive-green",
        "bounds": {
          "min": [
            -0.42,
            0,
            -0.215
          ],
          "max": [
            0.42,
            1.17,
            0.237
          ],
          "size": [
            0.84,
            1.17,
            0.452
          ],
          "centre": [
            0,
            0.585,
            0.011
          ]
        },
        "triangles": 1400,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.42,
            0.585,
            0.226
          ],
          "centre": [
            0,
            0.585,
            0.011
          ]
        }
      },
      {
        "name": "archive-trolley__boxes",
        "material": "canvas",
        "bounds": {
          "min": [
            -0.3675,
            0.1875,
            -0.1825
          ],
          "max": [
            0.3525,
            1.0875,
            0.1825
          ],
          "size": [
            0.72,
            0.9,
            0.365
          ],
          "centre": [
            -0.0075,
            0.6375,
            0
          ]
        },
        "triangles": 720
      },
      {
        "name": "archive-trolley__labels",
        "material": "paper-aged",
        "bounds": {
          "min": [
            -0.2844,
            0.2984,
            0.138
          ],
          "max": [
            0.2667,
            1.026,
            0.182
          ],
          "size": [
            0.5511,
            0.7276,
            0.044
          ],
          "centre": [
            -0.0089,
            0.6622,
            0.16
          ]
        },
        "triangles": 72
      },
      {
        "name": "office-safe",
        "material": "archive-green",
        "bounds": {
          "min": [
            -0.4525,
            0,
            -0.3375
          ],
          "max": [
            0.4525,
            1.62,
            0.3945
          ],
          "size": [
            0.905,
            1.62,
            0.732
          ],
          "centre": [
            0,
            0.81,
            0.0285
          ]
        },
        "triangles": 432,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.4525,
            0.81,
            0.366
          ],
          "centre": [
            0,
            0.81,
            0.0285
          ]
        }
      },
      {
        "name": "office-safe__hardware",
        "material": "brass",
        "bounds": {
          "min": [
            -0.4288,
            0.204,
            0.348
          ],
          "max": [
            0.329,
            1.466,
            0.4675
          ],
          "size": [
            0.7578,
            1.262,
            0.1195
          ],
          "centre": [
            -0.0499,
            0.835,
            0.4077
          ]
        },
        "triangles": 652
      },
      {
        "name": "visitor-chair",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.317,
            0,
            -0.3124
          ],
          "max": [
            0.317,
            0.9552,
            0.265
          ],
          "size": [
            0.634,
            0.9552,
            0.5774
          ],
          "centre": [
            0,
            0.4776,
            -0.0237
          ]
        },
        "triangles": 1324,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.317,
            0.4776,
            0.2887
          ],
          "centre": [
            0,
            0.4776,
            -0.0237
          ]
        }
      },
      {
        "name": "visitor-chair__upholstery",
        "material": "velvet-green",
        "bounds": {
          "min": [
            -0.275,
            0.3925,
            -0.3131
          ],
          "max": [
            0.275,
            0.9694,
            0.257
          ],
          "size": [
            0.55,
            0.5769,
            0.5701
          ],
          "centre": [
            0,
            0.6809,
            -0.028
          ]
        },
        "triangles": 818
      },
      {
        "name": "visitor-chair__studs",
        "material": "brass",
        "bounds": {
          "min": [
            -0.2225,
            0.5299,
            -0.3167
          ],
          "max": [
            0.2225,
            0.9286,
            -0.2722
          ],
          "size": [
            0.445,
            0.3987,
            0.0444
          ],
          "centre": [
            0,
            0.7293,
            -0.2944
          ]
        },
        "triangles": 288
      },
      {
        "name": "coat-stand",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.2337,
            0,
            -0.2337
          ],
          "max": [
            0.2337,
            1.86,
            0.2337
          ],
          "size": [
            0.4674,
            1.86,
            0.4674
          ],
          "centre": [
            0,
            0.93,
            0
          ]
        },
        "triangles": 1656
      },
      {
        "name": "coat-stand__hardware",
        "material": "brass",
        "bounds": {
          "min": [
            -0.165,
            1.635,
            -0.1617
          ],
          "max": [
            0.165,
            1.765,
            0.1617
          ],
          "size": [
            0.33,
            0.13,
            0.3233
          ],
          "centre": [
            0,
            1.7,
            0
          ]
        },
        "triangles": 288
      },
      {
        "name": "coat-stand__hat",
        "material": "felt-brown",
        "bounds": {
          "min": [
            0.1115,
            1.5087,
            -0.1531
          ],
          "max": [
            0.2811,
            1.8392,
            0.1531
          ],
          "size": [
            0.1696,
            0.3306,
            0.3062
          ],
          "centre": [
            0.1963,
            1.6739,
            0
          ]
        },
        "triangles": 320
      },
      {
        "name": "coat-stand__umbrella",
        "material": "plastic-black",
        "bounds": {
          "min": [
            -0.038,
            0.79,
            -0.22
          ],
          "max": [
            0.2187,
            1.7728,
            0.0869
          ],
          "size": [
            0.2567,
            0.9828,
            0.3069
          ],
          "centre": [
            0.0903,
            1.2814,
            -0.0665
          ]
        },
        "triangles": 208
      },
      {
        "name": "curator-notebook",
        "material": "rope-velvet",
        "bounds": {
          "min": [
            -0.075,
            0,
            -0.106
          ],
          "max": [
            0.075,
            0.026,
            0.106
          ],
          "size": [
            0.15,
            0.026,
            0.212
          ],
          "centre": [
            0,
            0.013,
            0
          ]
        },
        "triangles": 228
      },
      {
        "name": "curator-notebook__pages",
        "material": "paper-writing",
        "bounds": {
          "min": [
            -0.072,
            0.0035,
            -0.103
          ],
          "max": [
            0.068,
            0.0225,
            0.103
          ],
          "size": [
            0.14,
            0.019,
            0.206
          ],
          "centre": [
            -0.002,
            0.013,
            0
          ]
        },
        "triangles": 108
      },
      {
        "name": "curator-notebook__band",
        "material": "plastic-black",
        "bounds": {
          "min": [
            -0.066,
            0,
            -0.1072
          ],
          "max": [
            0.1157,
            0.0272,
            0.1596
          ],
          "size": [
            0.1817,
            0.0272,
            0.2668
          ],
          "centre": [
            0.0248,
            0.0136,
            0.0262
          ]
        },
        "triangles": 168
      },
      {
        "name": "curator-notebook__pen",
        "material": "brass",
        "bounds": {
          "min": [
            -0.029,
            0,
            -0.0821
          ],
          "max": [
            0.1157,
            0.0264,
            0.0771
          ],
          "size": [
            0.1447,
            0.0264,
            0.1593
          ],
          "centre": [
            0.0433,
            0.0132,
            -0.0025
          ]
        },
        "triangles": 88
      },
      {
        "name": "desk-radio",
        "material": "plastic-black",
        "bounds": {
          "min": [
            -0.045,
            0,
            -0.036
          ],
          "max": [
            0.045,
            0.042,
            0.036
          ],
          "size": [
            0.09,
            0.042,
            0.072
          ],
          "centre": [
            0,
            0.021,
            0
          ]
        },
        "triangles": 540
      },
      {
        "name": "desk-radio__led",
        "material": "led-off",
        "bounds": {
          "min": [
            0.0265,
            0.013,
            0.0355
          ],
          "max": [
            0.0355,
            0.017,
            0.0375
          ],
          "size": [
            0.009,
            0.004,
            0.002
          ],
          "centre": [
            0.031,
            0.015,
            0.0365
          ]
        },
        "triangles": 12
      },
      {
        "name": "desk-radio__handset",
        "material": "plastic-black",
        "bounds": {
          "min": [
            -0.0345,
            0.0211,
            -0.0329
          ],
          "max": [
            0.031,
            0.2419,
            0.0121
          ],
          "size": [
            0.0655,
            0.2208,
            0.045
          ],
          "centre": [
            -0.0017,
            0.1315,
            -0.0104
          ]
        },
        "triangles": 396
      },
      {
        "name": "desk-radio__handset-metal",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -0.025,
            0.0481,
            0.0005
          ],
          "max": [
            0.025,
            0.1423,
            0.012
          ],
          "size": [
            0.05,
            0.0941,
            0.0114
          ],
          "centre": [
            0,
            0.0952,
            0.0062
          ]
        },
        "triangles": 84
      },
      {
        "name": "desk-radio__handset-led",
        "material": "led-off",
        "bounds": {
          "min": [
            -0.017,
            0.1172,
            -0.0154
          ],
          "max": [
            0.017,
            0.1647,
            0.0053
          ],
          "size": [
            0.034,
            0.0475,
            0.0208
          ],
          "centre": [
            0,
            0.141,
            -0.0051
          ]
        },
        "triangles": 52
      },
      {
        "name": "office-wall-clock",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.189,
            0,
            0
          ],
          "max": [
            0.189,
            0.378,
            0.042
          ],
          "size": [
            0.378,
            0.378,
            0.042
          ],
          "centre": [
            0,
            0.189,
            0.021
          ]
        },
        "triangles": 560
      },
      {
        "name": "office-wall-clock__bezel",
        "material": "brass",
        "bounds": {
          "min": [
            -0.1765,
            0.0125,
            0.0382
          ],
          "max": [
            0.1765,
            0.3655,
            0.0498
          ],
          "size": [
            0.353,
            0.353,
            0.0116
          ],
          "centre": [
            0,
            0.189,
            0.044
          ]
        },
        "triangles": 824
      },
      {
        "name": "office-wall-clock__dial",
        "material": "enamel-cream",
        "bounds": {
          "min": [
            -0.165,
            0.024,
            0.036
          ],
          "max": [
            0.165,
            0.354,
            0.039
          ],
          "size": [
            0.33,
            0.33,
            0.003
          ],
          "centre": [
            0,
            0.189,
            0.0375
          ]
        },
        "triangles": 192
      },
      {
        "name": "office-wall-clock__hand-hour",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -0.0065,
            0.173,
            0.0396
          ],
          "max": [
            0.0065,
            0.277,
            0.0414
          ],
          "size": [
            0.013,
            0.104,
            0.0018
          ],
          "centre": [
            0,
            0.225,
            0.0405
          ]
        },
        "triangles": 28
      },
      {
        "name": "office-wall-clock__hand-minute",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -0.0036,
            0.169,
            0.0416
          ],
          "max": [
            0.0036,
            0.321,
            0.0434
          ],
          "size": [
            0.0072,
            0.152,
            0.0018
          ],
          "centre": [
            0,
            0.245,
            0.0425
          ]
        },
        "triangles": 12
      },
      {
        "name": "office-wall-clock__hand-second",
        "material": "rope-velvet",
        "bounds": {
          "min": [
            -0.0055,
            0.155,
            0.0438
          ],
          "max": [
            0.0055,
            0.331,
            0.0452
          ],
          "size": [
            0.011,
            0.176,
            0.0014
          ],
          "centre": [
            0,
            0.243,
            0.0445
          ]
        },
        "triangles": 60
      },
      {
        "name": "door-access-panel",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -0.043,
            0,
            0
          ],
          "max": [
            0.043,
            0.142,
            0.022
          ],
          "size": [
            0.086,
            0.142,
            0.022
          ],
          "centre": [
            0,
            0.071,
            0.011
          ]
        },
        "triangles": 108
      },
      {
        "name": "door-access-panel__trim",
        "material": "brass",
        "bounds": {
          "min": [
            -0.03,
            0.0178,
            0.022
          ],
          "max": [
            0.03,
            0.0914,
            0.026
          ],
          "size": [
            0.06,
            0.0736,
            0.004
          ],
          "centre": [
            0,
            0.0546,
            0.024
          ]
        },
        "triangles": 168
      },
      {
        "name": "door-access-panel__led",
        "material": "led-red",
        "bounds": {
          "min": [
            -0.0066,
            0.1142,
            0.022
          ],
          "max": [
            0.0066,
            0.1278,
            0.026
          ],
          "size": [
            0.0133,
            0.0136,
            0.004
          ],
          "centre": [
            0,
            0.121,
            0.024
          ]
        },
        "triangles": 56
      },
      {
        "name": "holyoke-entry-screen",
        "material": "holyoke-navy",
        "bounds": {
          "min": [
            -1.4,
            0,
            -0.275
          ],
          "max": [
            1.4,
            3.48,
            0.305
          ],
          "size": [
            2.8,
            3.48,
            0.58
          ],
          "centre": [
            0,
            1.74,
            0.015
          ]
        },
        "triangles": 516,
        "collider": {
          "kind": "box",
          "halfExtents": [
            1.4,
            1.74,
            0.29
          ],
          "centre": [
            0,
            1.74,
            0.015
          ]
        }
      },
      {
        "name": "holyoke-entry-screen__art",
        "material": "holyoke-navy",
        "bounds": {
          "min": [
            -1.105,
            0.805,
            0.243
          ],
          "max": [
            1.215,
            3.355,
            0.251
          ],
          "size": [
            2.32,
            2.55,
            0.008
          ],
          "centre": [
            0.055,
            2.08,
            0.247
          ]
        },
        "triangles": 12
      },
      {
        "name": "holyoke-entry-screen__trim",
        "material": "brass",
        "bounds": {
          "min": [
            -1.13,
            0.192,
            0.23
          ],
          "max": [
            1.24,
            3.38,
            0.55
          ],
          "size": [
            2.37,
            3.188,
            0.32
          ],
          "centre": [
            0.055,
            1.786,
            0.39
          ]
        },
        "triangles": 864
      },
      {
        "name": "holyoke-entry-screen__glass",
        "material": "glass-vitrine",
        "bounds": {
          "min": [
            -0.32,
            0.227,
            0.508
          ],
          "max": [
            0.68,
            0.515,
            0.52
          ],
          "size": [
            1,
            0.288,
            0.012
          ],
          "centre": [
            0.18,
            0.371,
            0.514
          ]
        },
        "triangles": 108
      },
      {
        "name": "history-case-run",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -5.1325,
            0,
            0
          ],
          "max": [
            5.1325,
            2.64,
            1.028
          ],
          "size": [
            10.265,
            2.64,
            1.028
          ],
          "centre": [
            0,
            1.32,
            0.514
          ]
        },
        "triangles": 816,
        "collider": {
          "kind": "box",
          "halfExtents": [
            5.1325,
            1.32,
            0.514
          ],
          "centre": [
            0,
            1.32,
            0.514
          ]
        }
      },
      {
        "name": "history-case-run__accent",
        "material": "rope-velvet",
        "bounds": {
          "min": [
            -5.1,
            2.4725,
            0.643
          ],
          "max": [
            5.1,
            2.5175,
            0.661
          ],
          "size": [
            10.2,
            0.045,
            0.018
          ],
          "centre": [
            0,
            2.495,
            0.652
          ]
        },
        "triangles": 12
      },
      {
        "name": "history-case-run__lining",
        "material": "holyoke-navy",
        "bounds": {
          "min": [
            -5.04,
            0.785,
            0.026
          ],
          "max": [
            5.04,
            2.51,
            0.3775
          ],
          "size": [
            10.08,
            1.725,
            0.3515
          ],
          "centre": [
            0,
            1.6475,
            0.2017
          ]
        },
        "triangles": 48
      },
      {
        "name": "history-case-run__trim",
        "material": "brass",
        "bounds": {
          "min": [
            -5.113,
            0.37,
            0.384
          ],
          "max": [
            5.113,
            2.5,
            1.0425
          ],
          "size": [
            10.226,
            2.13,
            0.6585
          ],
          "centre": [
            0,
            1.435,
            0.7133
          ]
        },
        "triangles": 652
      },
      {
        "name": "history-case-run__glass",
        "material": "glass-vitrine",
        "bounds": {
          "min": [
            -5.0575,
            0.805,
            0.64
          ],
          "max": [
            5.0575,
            2.49,
            0.648
          ],
          "size": [
            10.115,
            1.685,
            0.008
          ],
          "centre": [
            0,
            1.6475,
            0.644
          ]
        },
        "triangles": 60
      },
      {
        "name": "history-case-run__paper",
        "material": "paper-aged",
        "bounds": {
          "min": [
            -4.93,
            0.7925,
            0.145
          ],
          "max": [
            4.93,
            2.21,
            0.9599
          ],
          "size": [
            9.86,
            1.4175,
            0.8149
          ],
          "centre": [
            0,
            1.5013,
            0.5524
          ]
        },
        "triangles": 312
      },
      {
        "name": "history-case-run__artefacts",
        "material": "leather-worn",
        "bounds": {
          "min": [
            -4.8484,
            0.7486,
            0.1283
          ],
          "max": [
            4.8267,
            1.995,
            0.51
          ],
          "size": [
            9.6752,
            1.2464,
            0.3817
          ],
          "centre": [
            -0.0108,
            1.3718,
            0.3191
          ]
        },
        "triangles": 408
      },
      {
        "name": "history-hero-case",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.7275,
            0,
            -0.6275
          ],
          "max": [
            0.7275,
            0.78,
            0.6275
          ],
          "size": [
            1.455,
            0.78,
            1.255
          ],
          "centre": [
            0,
            0.39,
            0
          ]
        },
        "triangles": 540,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.7275,
            0.39,
            0.6275
          ],
          "centre": [
            0,
            0.39,
            0
          ]
        }
      },
      {
        "name": "history-hero-case__trim",
        "material": "brass",
        "bounds": {
          "min": [
            -0.67,
            0.7875,
            -0.5575
          ],
          "max": [
            0.67,
            2.1325,
            0.5575
          ],
          "size": [
            1.34,
            1.345,
            1.115
          ],
          "centre": [
            0,
            1.46,
            0
          ]
        },
        "triangles": 144
      },
      {
        "name": "history-hero-case__glass",
        "material": "glass-vitrine",
        "bounds": {
          "min": [
            -0.65,
            0.85,
            -0.55
          ],
          "max": [
            0.65,
            2.125,
            0.55
          ],
          "size": [
            1.3,
            1.275,
            1.1
          ],
          "centre": [
            0,
            1.4875,
            0
          ]
        },
        "triangles": 60
      },
      {
        "name": "history-hero-case__display",
        "material": "paper-aged",
        "bounds": {
          "min": [
            -0.31,
            0.78,
            -0.31
          ],
          "max": [
            0.31,
            1.02,
            0.31
          ],
          "size": [
            0.62,
            0.24,
            0.62
          ],
          "centre": [
            0,
            0.9,
            0
          ]
        },
        "triangles": 216
      },
      {
        "name": "history-info-kiosk",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -1.24,
            0,
            -0.55
          ],
          "max": [
            1.24,
            0.965,
            0.55
          ],
          "size": [
            2.48,
            0.965,
            1.1
          ],
          "centre": [
            0,
            0.4825,
            0
          ]
        },
        "triangles": 732,
        "collider": {
          "kind": "box",
          "halfExtents": [
            1.24,
            0.4825,
            0.55
          ],
          "centre": [
            0,
            0.4825,
            0
          ]
        }
      },
      {
        "name": "history-info-kiosk__lining",
        "material": "holyoke-navy",
        "bounds": {
          "min": [
            -1.14,
            0.8357,
            -0.268
          ],
          "max": [
            1.14,
            1.1243,
            0.348
          ],
          "size": [
            2.28,
            0.2886,
            0.6161
          ],
          "centre": [
            0,
            0.98,
            0.04
          ]
        },
        "triangles": 324
      },
      {
        "name": "history-info-kiosk__graphics",
        "material": "paper-aged",
        "bounds": {
          "min": [
            -1.11,
            0.8691,
            -0.2385
          ],
          "max": [
            1.085,
            1.1269,
            0.3225
          ],
          "size": [
            2.195,
            0.2579,
            0.5611
          ],
          "centre": [
            -0.0125,
            0.998,
            0.042
          ]
        },
        "triangles": 36
      },
      {
        "name": "history-info-kiosk__trim",
        "material": "brass",
        "bounds": {
          "min": [
            -1.17,
            0.115,
            0.465
          ],
          "max": [
            1.17,
            0.794,
            0.5025
          ],
          "size": [
            2.34,
            0.679,
            0.0375
          ],
          "centre": [
            0,
            0.4545,
            0.4838
          ]
        },
        "triangles": 324
      },
      {
        "name": "gym-court-lines",
        "material": "paper-aged",
        "bounds": {
          "min": [
            -2.4,
            0,
            -3.5
          ],
          "max": [
            2.4,
            0.0065,
            3.5
          ],
          "size": [
            4.8,
            0.0065,
            7
          ],
          "centre": [
            0,
            0.0033,
            0
          ]
        },
        "triangles": 132
      },
      {
        "name": "gym-training-set",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.6043,
            0,
            -0.6701
          ],
          "max": [
            0.2013,
            0.8823,
            -0.035
          ],
          "size": [
            0.8057,
            0.8823,
            0.6351
          ],
          "centre": [
            -0.2015,
            0.4412,
            -0.3525
          ]
        },
        "triangles": 800,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.4028,
            0.4411,
            0.3175
          ],
          "centre": [
            -0.2015,
            0.4412,
            -0.3525
          ]
        }
      },
      {
        "name": "gym-training-set__rope",
        "material": "cord-hemp",
        "bounds": {
          "min": [
            -0.2081,
            0,
            -0.441
          ],
          "max": [
            0.951,
            0.502,
            0.6277
          ],
          "size": [
            1.1591,
            0.502,
            1.0687
          ],
          "centre": [
            0.3715,
            0.251,
            0.0933
          ]
        },
        "triangles": 1120
      },
      {
        "name": "gym-training-set__leather",
        "material": "leather-worn",
        "bounds": {
          "min": [
            0.45,
            0.001,
            -0.44
          ],
          "max": [
            0.95,
            0.501,
            0.06
          ],
          "size": [
            0.5,
            0.5,
            0.5
          ],
          "centre": [
            0.7,
            0.251,
            -0.19
          ]
        },
        "triangles": 168
      },
      {
        "name": "atrium-floor-inlay",
        "material": "maple-floor",
        "bounds": {
          "min": [
            -8.2,
            0,
            -8.2
          ],
          "max": [
            8.2,
            0.004,
            8.2
          ],
          "size": [
            16.4,
            0.004,
            16.4
          ],
          "centre": [
            0,
            0.002,
            0
          ]
        },
        "triangles": 384
      },
      {
        "name": "atrium-floor-inlay__dark",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -5.658,
            0.005,
            -5.658
          ],
          "max": [
            5.658,
            0.0055,
            5.658
          ],
          "size": [
            11.316,
            0.0005,
            11.316
          ],
          "centre": [
            0,
            0.0052,
            0
          ]
        },
        "triangles": 384
      },
      {
        "name": "atrium-floor-inlay__brass",
        "material": "brass",
        "bounds": {
          "min": [
            -8.12,
            0.004,
            -8.12
          ],
          "max": [
            8.12,
            0.0274,
            8.12
          ],
          "size": [
            16.24,
            0.0234,
            16.24
          ],
          "centre": [
            0,
            0.0157,
            0
          ]
        },
        "triangles": 2064
      },
      {
        "name": "atrium-reception-desk",
        "material": "walnut-matte",
        "bounds": {
          "min": [
            -3.19,
            0,
            -0.7432
          ],
          "max": [
            3.1675,
            1.3388,
            0.7175
          ],
          "size": [
            6.3575,
            1.3388,
            1.4607
          ],
          "centre": [
            -0.0113,
            0.6694,
            -0.0128
          ]
        },
        "triangles": 924,
        "collider": {
          "kind": "box",
          "halfExtents": [
            3.1787,
            0.6694,
            0.7304
          ],
          "centre": [
            -0.0113,
            0.6694,
            -0.0128
          ]
        }
      },
      {
        "name": "atrium-reception-desk__timber",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -3.16,
            0.125,
            -2.078
          ],
          "max": [
            3.17,
            1.54,
            0.75
          ],
          "size": [
            6.33,
            1.415,
            2.828
          ],
          "centre": [
            0.005,
            0.8325,
            -0.664
          ]
        },
        "triangles": 928
      },
      {
        "name": "atrium-reception-desk__brass",
        "material": "brass",
        "bounds": {
          "min": [
            -3.16,
            0.3775,
            -2.048
          ],
          "max": [
            3.15,
            1.354,
            0.734
          ],
          "size": [
            6.31,
            0.9765,
            2.782
          ],
          "centre": [
            -0.005,
            0.8657,
            -0.657
          ]
        },
        "triangles": 716
      },
      {
        "name": "atrium-reception-desk__light",
        "material": "atrium-glow",
        "bounds": {
          "min": [
            -2.2794,
            0.68,
            -2.0625
          ],
          "max": [
            3.1,
            1.475,
            0.736
          ],
          "size": [
            5.3794,
            0.795,
            2.7985
          ],
          "centre": [
            0.4103,
            1.0775,
            -0.6632
          ]
        },
        "triangles": 416
      },
      {
        "name": "atrium-reception-desk__props",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -1.5824,
            0.0425,
            -0.9388
          ],
          "max": [
            1.06,
            1.4226,
            0.1366
          ],
          "size": [
            2.6424,
            1.3801,
            1.0754
          ],
          "centre": [
            -0.2612,
            0.7326,
            -0.4011
          ]
        },
        "triangles": 1416
      },
      {
        "name": "atrium-reception-desk__storage",
        "material": "walnut-matte",
        "bounds": {
          "min": [
            -2.19,
            0,
            -2.36
          ],
          "max": [
            0.09,
            1.5,
            -2.08
          ],
          "size": [
            2.28,
            1.5,
            0.28
          ],
          "centre": [
            -1.05,
            0.75,
            -2.22
          ]
        },
        "triangles": 108,
        "collider": {
          "kind": "box",
          "halfExtents": [
            1.14,
            0.75,
            0.14
          ],
          "centre": [
            -1.05,
            0.75,
            -2.22
          ]
        }
      },
      {
        "name": "atrium-wall-bay",
        "material": "walnut-matte",
        "bounds": {
          "min": [
            -1.6,
            0,
            0
          ],
          "max": [
            1.6,
            1.48,
            0.07
          ],
          "size": [
            3.2,
            1.48,
            0.07
          ],
          "centre": [
            0,
            0.74,
            0.035
          ]
        },
        "triangles": 108
      },
      {
        "name": "atrium-wall-bay__slats",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -1.577,
            0.085,
            0.07
          ],
          "max": [
            1.577,
            1.395,
            0.115
          ],
          "size": [
            3.154,
            1.31,
            0.045
          ],
          "centre": [
            0,
            0.74,
            0.0925
          ]
        },
        "triangles": 216
      },
      {
        "name": "atrium-wall-bay__trim",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -1.62,
            0,
            0
          ],
          "max": [
            1.62,
            1.48,
            0.16
          ],
          "size": [
            3.24,
            1.48,
            0.16
          ],
          "centre": [
            0,
            0.74,
            0.08
          ]
        },
        "triangles": 324
      },
      {
        "name": "atrium-wall-bay__plaque",
        "material": "plaster-dark",
        "bounds": {
          "min": [
            -0.54,
            0.44,
            0.114
          ],
          "max": [
            0.54,
            1.14,
            0.142
          ],
          "size": [
            1.08,
            0.7,
            0.028
          ],
          "centre": [
            0,
            0.79,
            0.128
          ]
        },
        "triangles": 108
      },
      {
        "name": "atrium-wall-bay__graphics",
        "material": "paper-aged",
        "bounds": {
          "min": [
            -0.46,
            0.625,
            0.142
          ],
          "max": [
            0.32,
            1.02,
            0.148
          ],
          "size": [
            0.78,
            0.395,
            0.006
          ],
          "centre": [
            -0.07,
            0.8225,
            0.145
          ]
        },
        "triangles": 60
      },
      {
        "name": "atrium-wall-bay__light",
        "material": "atrium-glow",
        "bounds": {
          "min": [
            -0.13,
            1.236,
            0.092
          ],
          "max": [
            0.13,
            1.254,
            0.17
          ],
          "size": [
            0.26,
            0.018,
            0.078
          ],
          "centre": [
            0,
            1.245,
            0.131
          ]
        },
        "triangles": 108
      },
      {
        "name": "atrium-wall-bay-plain",
        "material": "walnut-matte",
        "bounds": {
          "min": [
            -1.6,
            0,
            0
          ],
          "max": [
            1.6,
            1.48,
            0.07
          ],
          "size": [
            3.2,
            1.48,
            0.07
          ],
          "centre": [
            0,
            0.74,
            0.035
          ]
        },
        "triangles": 12
      },
      {
        "name": "atrium-wall-bay-plain__slats",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -1.5825,
            0.085,
            0.07
          ],
          "max": [
            1.5825,
            1.395,
            0.115
          ],
          "size": [
            3.165,
            1.31,
            0.045
          ],
          "centre": [
            0,
            0.74,
            0.0925
          ]
        },
        "triangles": 240
      },
      {
        "name": "atrium-wall-bay-plain__trim",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -1.62,
            0,
            0
          ],
          "max": [
            1.62,
            1.48,
            0.15
          ],
          "size": [
            3.24,
            1.48,
            0.15
          ],
          "centre": [
            0,
            0.74,
            0.075
          ]
        },
        "triangles": 24
      },
      {
        "name": "atrium-central-podium",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.52,
            0,
            -0.44
          ],
          "max": [
            0.52,
            0.84,
            0.44
          ],
          "size": [
            1.04,
            0.84,
            0.88
          ],
          "centre": [
            0,
            0.42,
            0
          ]
        },
        "triangles": 516,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.52,
            0.42,
            0.44
          ],
          "centre": [
            0,
            0.42,
            0
          ]
        }
      },
      {
        "name": "atrium-central-podium__top",
        "material": "plaster-dark",
        "bounds": {
          "min": [
            -0.444,
            0.836,
            -0.364
          ],
          "max": [
            0.444,
            1.0844,
            0.364
          ],
          "size": [
            0.888,
            0.2484,
            0.728
          ],
          "centre": [
            0,
            0.9602,
            0
          ]
        },
        "triangles": 44
      },
      {
        "name": "atrium-central-podium__brass",
        "material": "brass",
        "bounds": {
          "min": [
            -0.54,
            0.075,
            -0.46
          ],
          "max": [
            0.54,
            1.046,
            0.46
          ],
          "size": [
            1.08,
            0.971,
            0.92
          ],
          "centre": [
            0,
            0.5605,
            0
          ]
        },
        "triangles": 1124
      },
      {
        "name": "atrium-central-podium__controls",
        "material": "paper-aged",
        "bounds": {
          "min": [
            -0.358,
            1.0004,
            -0.038
          ],
          "max": [
            0.358,
            1.042,
            0.108
          ],
          "size": [
            0.716,
            0.0416,
            0.146
          ],
          "centre": [
            0,
            1.0212,
            0.035
          ]
        },
        "triangles": 320
      },
      {
        "name": "atrium-central-podium__light",
        "material": "atrium-glow",
        "bounds": {
          "min": [
            -0.532,
            0.004,
            -0.452
          ],
          "max": [
            0.532,
            0.016,
            0.452
          ],
          "size": [
            1.064,
            0.012,
            0.904
          ],
          "centre": [
            0,
            0.01,
            0
          ]
        },
        "triangles": 48
      },
      {
        "name": "atrium-display-tower",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.41,
            0,
            -0.41
          ],
          "max": [
            0.41,
            2.34,
            0.41
          ],
          "size": [
            0.82,
            2.34,
            0.82
          ],
          "centre": [
            0,
            1.17,
            0
          ]
        },
        "triangles": 1248,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.41,
            1.17,
            0.41
          ],
          "centre": [
            0,
            1.17,
            0
          ]
        }
      },
      {
        "name": "atrium-display-tower__glass",
        "material": "glass-vitrine",
        "bounds": {
          "min": [
            -0.363,
            0.905,
            -0.363
          ],
          "max": [
            0.363,
            2.225,
            0.363
          ],
          "size": [
            0.726,
            1.32,
            0.726
          ],
          "centre": [
            0,
            1.565,
            0
          ]
        },
        "triangles": 432
      },
      {
        "name": "atrium-display-tower__brass",
        "material": "brass",
        "bounds": {
          "min": [
            -0.355,
            0.896,
            -0.376
          ],
          "max": [
            0.355,
            2.239,
            0.382
          ],
          "size": [
            0.71,
            1.343,
            0.758
          ],
          "centre": [
            0,
            1.5675,
            0.003
          ]
        },
        "triangles": 1128
      },
      {
        "name": "atrium-display-tower__shelves",
        "material": "walnut-matte",
        "bounds": {
          "min": [
            -0.33,
            1.054,
            -0.33
          ],
          "max": [
            0.33,
            1.84,
            0.33
          ],
          "size": [
            0.66,
            0.786,
            0.66
          ],
          "centre": [
            0,
            1.447,
            0
          ]
        },
        "triangles": 324
      },
      {
        "name": "atrium-display-tower__light",
        "material": "atrium-glow",
        "bounds": {
          "min": [
            -0.075,
            1.081,
            -0.075
          ],
          "max": [
            0.075,
            1.851,
            0.075
          ],
          "size": [
            0.15,
            0.77,
            0.15
          ],
          "centre": [
            0,
            1.466,
            0
          ]
        },
        "triangles": 192
      },
      {
        "name": "atrium-display-tower__artefacts",
        "material": "brass",
        "bounds": {
          "min": [
            -0.2726,
            1.08,
            -0.1185
          ],
          "max": [
            0.2789,
            2.043,
            0.1185
          ],
          "size": [
            0.5515,
            0.963,
            0.237
          ],
          "centre": [
            0.0031,
            1.5615,
            0
          ]
        },
        "triangles": 1860
      },
      {
        "name": "atrium-ceiling-coffer",
        "material": "plaster-dark",
        "bounds": {
          "min": [
            -5.98,
            -0.14,
            -4.18
          ],
          "max": [
            5.98,
            -0.045,
            4.18
          ],
          "size": [
            11.96,
            0.095,
            8.36
          ],
          "centre": [
            0,
            -0.0925,
            0
          ]
        },
        "triangles": 108
      },
      {
        "name": "atrium-ceiling-coffer__slats",
        "material": "walnut-matte",
        "bounds": {
          "min": [
            -5.9075,
            -0.192,
            -4.14
          ],
          "max": [
            5.9075,
            -0.142,
            4.14
          ],
          "size": [
            11.815,
            0.05,
            8.28
          ],
          "centre": [
            0,
            -0.167,
            0
          ]
        },
        "triangles": 684
      },
      {
        "name": "atrium-ceiling-coffer__trim",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -6.2,
            -0.18,
            -4.4
          ],
          "max": [
            6.2,
            0,
            4.4
          ],
          "size": [
            12.4,
            0.18,
            8.8
          ],
          "centre": [
            0,
            -0.09,
            0
          ]
        },
        "triangles": 432
      },
      {
        "name": "atrium-ceiling-coffer__light",
        "material": "atrium-glow",
        "bounds": {
          "min": [
            -5.9425,
            -0.205,
            -4.1425
          ],
          "max": [
            5.9425,
            -0.187,
            4.1425
          ],
          "size": [
            11.885,
            0.018,
            8.285
          ],
          "centre": [
            0,
            -0.196,
            0
          ]
        },
        "triangles": 48
      },
      {
        "name": "atrium-pin-pendant",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -0.052,
            -1.294,
            -0.052
          ],
          "max": [
            0.052,
            0,
            0.052
          ],
          "size": [
            0.104,
            1.294,
            0.104
          ],
          "centre": [
            0,
            -0.647,
            0
          ]
        },
        "triangles": 200
      },
      {
        "name": "atrium-pin-pendant__head",
        "material": "atrium-glow",
        "bounds": {
          "min": [
            -0.0185,
            -1.303,
            -0.019
          ],
          "max": [
            0.0185,
            -1.294,
            0.019
          ],
          "size": [
            0.037,
            0.009,
            0.038
          ],
          "centre": [
            0,
            -1.2985,
            0
          ]
        },
        "triangles": 56
      },
      {
        "name": "atrium-aerial-installation__cables",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -3.8035,
            -1.8,
            -2.204
          ],
          "max": [
            3.8035,
            0,
            2.204
          ],
          "size": [
            7.6069,
            1.8,
            4.408
          ],
          "centre": [
            0,
            -0.9,
            0
          ]
        },
        "triangles": 192
      },
      {
        "name": "atrium-aerial-installation",
        "material": "brass",
        "bounds": {
          "min": [
            -3.8069,
            -1.5024,
            -1.6654
          ],
          "max": [
            3.8064,
            -0.4473,
            1.8667
          ],
          "size": [
            7.6133,
            1.0551,
            3.5321
          ],
          "centre": [
            -0.0002,
            -0.9748,
            0.1007
          ]
        },
        "triangles": 1728
      },
      {
        "name": "atrium-aerial-installation__brassB",
        "material": "brass",
        "bounds": {
          "min": [
            -3.456,
            -1.7922,
            -2.2072
          ],
          "max": [
            3.657,
            -0.5707,
            2.2105
          ],
          "size": [
            7.113,
            1.2214,
            4.4177
          ],
          "centre": [
            0.1005,
            -1.1814,
            0.0016
          ]
        },
        "triangles": 1728
      },
      {
        "name": "atrium-aerial-installation__finials",
        "material": "brass",
        "bounds": {
          "min": [
            -3.875,
            -1.855,
            -2.275
          ],
          "max": [
            3.875,
            -0.845,
            2.275
          ],
          "size": [
            7.75,
            1.01,
            4.55
          ],
          "centre": [
            0,
            -1.35,
            0
          ]
        },
        "triangles": 1008
      },
      {
        "name": "atrium-aerial-installation__net",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -2.583,
            -2.195,
            -0.9185
          ],
          "max": [
            2.585,
            -1.19,
            0.5585
          ],
          "size": [
            5.168,
            1.005,
            1.477
          ],
          "centre": [
            0.001,
            -1.6925,
            -0.18
          ]
        },
        "triangles": 1788
      },
      {
        "name": "atrium-banner-hardware",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.672,
            -4,
            -0.1594
          ],
          "max": [
            0.672,
            0,
            0.1594
          ],
          "size": [
            1.344,
            4,
            0.3187
          ],
          "centre": [
            0,
            -2,
            0
          ]
        },
        "triangles": 384
      },
      {
        "name": "atrium-sofa",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -1.26,
            0,
            -0.3375
          ],
          "max": [
            1.26,
            0.6325,
            0.2825
          ],
          "size": [
            2.52,
            0.6325,
            0.62
          ],
          "centre": [
            0,
            0.3162,
            -0.0275
          ]
        },
        "triangles": 1080,
        "collider": {
          "kind": "box",
          "halfExtents": [
            1.26,
            0.3162,
            0.31
          ],
          "centre": [
            0,
            0.3162,
            -0.0275
          ]
        }
      },
      {
        "name": "atrium-sofa__upholstery",
        "material": "holyoke-navy",
        "bounds": {
          "min": [
            -1.25,
            0.315,
            -0.3677
          ],
          "max": [
            1.25,
            0.8734,
            0.34
          ],
          "size": [
            2.5,
            0.5584,
            0.7077
          ],
          "centre": [
            0,
            0.5942,
            -0.0138
          ]
        },
        "triangles": 648
      },
      {
        "name": "atrium-sofa__brass",
        "material": "brass",
        "bounds": {
          "min": [
            -1.28,
            0,
            -0.31
          ],
          "max": [
            1.28,
            0.4625,
            0.34
          ],
          "size": [
            2.56,
            0.4625,
            0.65
          ],
          "centre": [
            0,
            0.2313,
            0.015
          ]
        },
        "triangles": 536
      },
      {
        "name": "atrium-lectern",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.45,
            0,
            -0.325
          ],
          "max": [
            0.45,
            0.82,
            0.325
          ],
          "size": [
            0.9,
            0.82,
            0.65
          ],
          "centre": [
            0,
            0.41,
            0
          ]
        },
        "triangles": 624,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.45,
            0.41,
            0.325
          ],
          "centre": [
            0,
            0.41,
            0
          ]
        }
      },
      {
        "name": "atrium-lectern__top",
        "material": "plaster-dark",
        "bounds": {
          "min": [
            -0.454,
            0.816,
            -0.329
          ],
          "max": [
            0.454,
            1.0544,
            0.329
          ],
          "size": [
            0.908,
            0.2384,
            0.658
          ],
          "centre": [
            0,
            0.9352,
            0
          ]
        },
        "triangles": 44
      },
      {
        "name": "atrium-lectern__brass",
        "material": "brass",
        "bounds": {
          "min": [
            -0.4625,
            0.07,
            -0.3375
          ],
          "max": [
            0.4625,
            0.9445,
            0.3375
          ],
          "size": [
            0.925,
            0.8745,
            0.675
          ],
          "centre": [
            0,
            0.5072,
            0
          ]
        },
        "triangles": 216
      },
      {
        "name": "atrium-lectern__light",
        "material": "atrium-glow",
        "bounds": {
          "min": [
            -0.34,
            0.774,
            0.258
          ],
          "max": [
            0.34,
            0.796,
            0.276
          ],
          "size": [
            0.68,
            0.022,
            0.018
          ],
          "centre": [
            0,
            0.785,
            0.267
          ]
        },
        "triangles": 12
      },
      {
        "name": "atrium-divider-screen",
        "material": "holyoke-navy",
        "bounds": {
          "min": [
            -0.805,
            0,
            -0.17
          ],
          "max": [
            0.805,
            0.48,
            0.17
          ],
          "size": [
            1.61,
            0.48,
            0.34
          ],
          "centre": [
            0,
            1.2,
            0
          ]
        },
        "triangles": 228,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.805,
            1.2,
            0.17
          ],
          "centre": [
            0,
            1.2,
            0
          ]
        }
      },
      {
        "name": "atrium-divider-screen__frame",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -0.775,
            0,
            -0.036
          ],
          "max": [
            0.775,
            2.4,
            0.036
          ],
          "size": [
            1.55,
            2.4,
            0.072
          ],
          "centre": [
            0,
            1.2,
            0
          ]
        },
        "triangles": 48
      },
      {
        "name": "atrium-divider-screen__mesh",
        "material": "brass",
        "bounds": {
          "min": [
            -0.692,
            0.565,
            0.009
          ],
          "max": [
            0.692,
            2.305,
            0.027
          ],
          "size": [
            1.384,
            1.74,
            0.018
          ],
          "centre": [
            0,
            1.435,
            0.018
          ]
        },
        "triangles": 192
      },
      {
        "name": "atrium-barrier-segment",
        "material": "brass",
        "bounds": {
          "min": [
            1.466,
            0,
            -0.7606
          ],
          "max": [
            1.725,
            0.834,
            0.6601
          ],
          "size": [
            0.259,
            0.834,
            1.4207
          ],
          "centre": [
            1.5955,
            0.417,
            -0.0502
          ]
        },
        "triangles": 220,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.1295,
            0.417,
            0.7104
          ],
          "centre": [
            1.5955,
            0.417,
            -0.0502
          ]
        }
      },
      {
        "name": "atrium-lounge-set",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -1.4656,
            0,
            -0.794
          ],
          "max": [
            1.97,
            0.97,
            1
          ],
          "size": [
            3.4356,
            0.97,
            1.794
          ],
          "centre": [
            0.2522,
            0.485,
            0.103
          ]
        },
        "triangles": 592,
        "collider": {
          "kind": "box",
          "halfExtents": [
            1.7178,
            0.485,
            0.897
          ],
          "centre": [
            0.2522,
            0.485,
            0.103
          ]
        }
      },
      {
        "name": "atrium-lounge-set__upholstery",
        "material": "holyoke-navy",
        "bounds": {
          "min": [
            -2.05,
            0,
            -1.3
          ],
          "max": [
            2.05,
            0.9917,
            1.3
          ],
          "size": [
            4.1,
            0.9917,
            2.6
          ],
          "centre": [
            0,
            0.4959,
            0
          ]
        },
        "triangles": 444
      },
      {
        "name": "atrium-lounge-set__brass",
        "material": "brass",
        "bounds": {
          "min": [
            -0.818,
            0,
            -0.4
          ],
          "max": [
            1.88,
            0.6825,
            0.938
          ],
          "size": [
            2.698,
            0.6825,
            1.338
          ],
          "centre": [
            0.531,
            0.3412,
            0.269
          ]
        },
        "triangles": 400
      },
      {
        "name": "atrium-display-console",
        "material": "walnut-polished",
        "bounds": {
          "min": [
            -1.62,
            0,
            -0.375
          ],
          "max": [
            1.62,
            1.05,
            0.375
          ],
          "size": [
            3.24,
            1.05,
            0.75
          ],
          "centre": [
            0,
            0.525,
            0
          ]
        },
        "triangles": 444,
        "collider": {
          "kind": "box",
          "halfExtents": [
            1.62,
            0.525,
            0.375
          ],
          "centre": [
            0,
            0.525,
            0
          ]
        }
      },
      {
        "name": "atrium-display-console__glass",
        "material": "glass-vitrine",
        "bounds": {
          "min": [
            -1.553,
            0.715,
            -0.328
          ],
          "max": [
            1.553,
            1.002,
            0.328
          ],
          "size": [
            3.106,
            0.287,
            0.656
          ],
          "centre": [
            0,
            0.8585,
            0
          ]
        },
        "triangles": 60
      },
      {
        "name": "atrium-display-console__brass",
        "material": "brass",
        "bounds": {
          "min": [
            -1.55,
            0.3175,
            -0.19
          ],
          "max": [
            1.55,
            0.716,
            0.392
          ],
          "size": [
            3.1,
            0.3985,
            0.582
          ],
          "centre": [
            0,
            0.5168,
            0.101
          ]
        },
        "triangles": 132
      }
    ]
  },
  {
    "name": "exhibits-atrium",
    "url": "/models/exhibits-atrium.6002cd90.glb",
    "bytes": 80712,
    "parts": [
      {
        "name": "ball/leather-laced-1900__leather",
        "material": "ball-leather-aged",
        "bounds": {
          "min": [
            -0.1068,
            -0.102,
            -0.1052
          ],
          "max": [
            0.1068,
            0.102,
            0.1052
          ],
          "size": [
            0.2136,
            0.2041,
            0.2104
          ],
          "centre": [
            0,
            0,
            0
          ]
        },
        "triangles": 1584
      },
      {
        "name": "ball/leather-laced-1900__fastenings",
        "material": "rawhide-lace",
        "bounds": {
          "min": [
            -0.0159,
            -0.0312,
            0.0987
          ],
          "max": [
            0.0159,
            0.0312,
            0.1078
          ],
          "size": [
            0.0319,
            0.0625,
            0.0091
          ],
          "centre": [
            0,
            0,
            0.1032
          ]
        },
        "triangles": 640
      },
      {
        "name": "ball/classic-white-18-panel",
        "material": "ball-1964",
        "bounds": {
          "min": [
            -0.105,
            -0.105,
            -0.105
          ],
          "max": [
            0.105,
            0.105,
            0.105
          ],
          "size": [
            0.21,
            0.21,
            0.21
          ],
          "centre": [
            0,
            0,
            0
          ]
        },
        "triangles": 1152
      },
      {
        "name": "ball/tricolour-1998",
        "material": "ball-1998-white",
        "bounds": {
          "min": [
            -0.1038,
            -0.1038,
            -0.1038
          ],
          "max": [
            0.1038,
            0.1038,
            0.1038
          ],
          "size": [
            0.2076,
            0.2076,
            0.2076
          ],
          "centre": [
            0,
            0,
            0
          ]
        },
        "triangles": 864
      },
      {
        "name": "ball/tricolour-1998__blue",
        "material": "ball-1998-blue",
        "bounds": {
          "min": [
            -0.0991,
            -0.0991,
            -0.0991
          ],
          "max": [
            0.0736,
            0.0705,
            0.0736
          ],
          "size": [
            0.1726,
            0.1695,
            0.1726
          ],
          "centre": [
            -0.0127,
            -0.0143,
            -0.0127
          ]
        },
        "triangles": 144
      },
      {
        "name": "ball/tricolour-1998__yellow",
        "material": "ball-1998-yellow",
        "bounds": {
          "min": [
            -0.105,
            -0.105,
            -0.105
          ],
          "max": [
            0.105,
            0.105,
            0.105
          ],
          "size": [
            0.21,
            0.21,
            0.21
          ],
          "centre": [
            0,
            0,
            0
          ]
        },
        "triangles": 144
      },
      {
        "name": "ball/eight-panel-2008",
        "material": "ball-2008-blue",
        "bounds": {
          "min": [
            -0.1038,
            -0.105,
            -0.1038
          ],
          "max": [
            0.1038,
            0.105,
            0.1038
          ],
          "size": [
            0.2076,
            0.21,
            0.2076
          ],
          "centre": [
            0,
            0,
            0
          ]
        },
        "triangles": 1008
      },
      {
        "name": "ball/eight-panel-2008__yellow",
        "material": "ball-2008-yellow",
        "bounds": {
          "min": [
            -0.1041,
            -0.105,
            -0.1041
          ],
          "max": [
            0.1041,
            0.105,
            0.1041
          ],
          "size": [
            0.2083,
            0.21,
            0.2083
          ],
          "centre": [
            0,
            0,
            0
          ]
        },
        "triangles": 288
      }
    ]
  },
  {
    "name": "exhibits-holyoke",
    "url": "/models/exhibits-holyoke.61443e51.glb",
    "bytes": 362412,
    "parts": [
      {
        "name": "ball/basketball-bladder-1895",
        "material": "leather-worn",
        "bounds": {
          "min": [
            -0.1123,
            -0.1026,
            -0.1112
          ],
          "max": [
            0.1123,
            0.1069,
            0.1112
          ],
          "size": [
            0.2246,
            0.2095,
            0.2225
          ],
          "centre": [
            0,
            0.0021,
            0
          ]
        },
        "triangles": 1512
      },
      {
        "name": "ball/spalding-laced-1900",
        "material": "leather-tan",
        "bounds": {
          "min": [
            -0.1068,
            -0.1068,
            -0.108
          ],
          "max": [
            0.1068,
            0.1068,
            0.1068
          ],
          "size": [
            0.2136,
            0.2136,
            0.2148
          ],
          "centre": [
            0,
            0,
            -0.0006
          ]
        },
        "triangles": 10136
      },
      {
        "name": "net/ymca-1897__structure",
        "material": "oak-matte",
        "bounds": {
          "min": [
            -2.49,
            0,
            -0.09
          ],
          "max": [
            2.49,
            2.18,
            0.09
          ],
          "size": [
            4.98,
            2.18,
            0.18
          ],
          "centre": [
            0,
            1.09,
            0
          ]
        },
        "triangles": 1480
      },
      {
        "name": "net/ymca-1897__cords",
        "material": "cord-hemp",
        "bounds": {
          "min": [
            -2.4,
            1.36,
            -0.0018
          ],
          "max": [
            2.4,
            1.98,
            0.0018
          ],
          "size": [
            4.8,
            0.62,
            0.0035
          ],
          "centre": [
            0,
            1.67,
            0
          ]
        },
        "triangles": 612
      },
      {
        "name": "paper/handbook-1897",
        "material": "canvas",
        "bounds": {
          "min": [
            -0.1449,
            -0.0043,
            -0.115
          ],
          "max": [
            0.1449,
            0.0478,
            0.115
          ],
          "size": [
            0.2898,
            0.052,
            0.23
          ],
          "centre": [
            0,
            0.0218,
            0
          ]
        },
        "triangles": 1848
      },
      {
        "name": "paper/spalding-guide-1916",
        "material": "canvas",
        "bounds": {
          "min": [
            -0.064,
            0,
            -0.0965
          ],
          "max": [
            0.064,
            0.0112,
            0.0965
          ],
          "size": [
            0.128,
            0.0112,
            0.193
          ],
          "centre": [
            0,
            0.0056,
            0
          ]
        },
        "triangles": 648
      },
      {
        "name": "apparel/gym-suit-1900__form",
        "material": "plaster-dark",
        "bounds": {
          "min": [
            -0.19,
            0,
            -0.19
          ],
          "max": [
            0.19,
            1.322,
            0.19
          ],
          "size": [
            0.38,
            1.322,
            0.38
          ],
          "centre": [
            0,
            0.661,
            0
          ]
        },
        "triangles": 1264
      },
      {
        "name": "apparel/gym-suit-1900__garment",
        "material": "leather-worn",
        "bounds": {
          "min": [
            -0.157,
            0.24,
            -0.157
          ],
          "max": [
            0.157,
            1.306,
            0.157
          ],
          "size": [
            0.314,
            1.066,
            0.314
          ],
          "centre": [
            0,
            0.773,
            0
          ]
        },
        "triangles": 968
      },
      {
        "name": "frame/portrait-small",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.2395,
            -0.2816,
            -0.047
          ],
          "max": [
            0.2395,
            0.2816,
            0.0165
          ],
          "size": [
            0.479,
            0.5633,
            0.0635
          ],
          "centre": [
            0,
            0,
            -0.0152
          ]
        },
        "triangles": 572
      },
      {
        "name": "frame/panorama-wide",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.7695,
            -0.2963,
            -0.047
          ],
          "max": [
            0.7695,
            0.2963,
            0.0165
          ],
          "size": [
            1.539,
            0.5927,
            0.0635
          ],
          "centre": [
            0,
            0,
            -0.0152
          ]
        },
        "triangles": 572
      }
    ]
  }
] as const satisfies readonly BakedBundle[]

export const BAKED_MATERIALS = {
  "plaster": {
    "baseColor": [
      1,
      1,
      1,
      1
    ],
    "roughness": 0.92,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/plaster-albedo.5d1b28c9.webp",
      "normal": "/textures/materials/plaster-normal.47bc31ba.webp",
      "orm": "/textures/materials/plaster-orm.6103090c.webp"
    }
  },
  "plaster-dark": {
    "baseColor": [
      0.5,
      0.49,
      0.48,
      1
    ],
    "roughness": 0.94,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/plaster-albedo.5d1b28c9.webp",
      "normal": "/textures/materials/plaster-normal.47bc31ba.webp",
      "orm": "/textures/materials/plaster-orm.6103090c.webp"
    }
  },
  "oak-varnished": {
    "baseColor": [
      1,
      1,
      1,
      1
    ],
    "roughness": 0.42,
    "metalness": 0,
    "clearcoat": 0.55,
    "clearcoatRoughness": 0.12,
    "textures": {
      "albedo": "/textures/materials/oak-matte-albedo.734d8354.webp",
      "normal": "/textures/materials/oak-matte-normal.ee263070.webp",
      "orm": "/textures/materials/oak-matte-orm.5b7d5fc7.webp"
    }
  },
  "oak-matte": {
    "baseColor": [
      0.86,
      0.84,
      0.82,
      1
    ],
    "roughness": 0.78,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/oak-matte-albedo.734d8354.webp",
      "normal": "/textures/materials/oak-matte-normal.ee263070.webp",
      "orm": "/textures/materials/oak-matte-orm.5b7d5fc7.webp"
    }
  },
  "walnut-polished": {
    "baseColor": [
      0.38,
      0.24,
      0.15,
      1
    ],
    "roughness": 0.38,
    "metalness": 0,
    "clearcoat": 0.62,
    "clearcoatRoughness": 0.1,
    "textures": {
      "albedo": "/textures/materials/oak-matte-albedo.734d8354.webp",
      "normal": "/textures/materials/oak-matte-normal.ee263070.webp",
      "orm": "/textures/materials/oak-matte-orm.5b7d5fc7.webp"
    }
  },
  "walnut-matte": {
    "baseColor": [
      0.27,
      0.16,
      0.1,
      1
    ],
    "roughness": 0.74,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/oak-matte-albedo.734d8354.webp",
      "normal": "/textures/materials/oak-matte-normal.ee263070.webp",
      "orm": "/textures/materials/oak-matte-orm.5b7d5fc7.webp"
    }
  },
  "holyoke-floor": {
    "baseColor": [
      0.17,
      0.1,
      0.055,
      1
    ],
    "roughness": 0.8,
    "metalness": 0,
    "clearcoat": 0.06,
    "clearcoatRoughness": 0.48,
    "textures": {
      "albedo": "/textures/materials/maple-floor-albedo.ec515f6d.webp",
      "normal": "/textures/materials/maple-floor-normal.fb88fb48.webp",
      "orm": "/textures/materials/maple-floor-orm.375a0219.webp"
    }
  },
  "maple-floor": {
    "baseColor": [
      1,
      1,
      1,
      1
    ],
    "roughness": 0.55,
    "metalness": 0,
    "clearcoat": 0.35,
    "clearcoatRoughness": 0.2,
    "textures": {
      "albedo": "/textures/materials/maple-floor-albedo.ec515f6d.webp",
      "normal": "/textures/materials/maple-floor-normal.fb88fb48.webp",
      "orm": "/textures/materials/maple-floor-orm.375a0219.webp"
    }
  },
  "brass": {
    "baseColor": [
      0.788,
      0.635,
      0.153,
      1
    ],
    "roughness": 0.28,
    "metalness": 0.92,
    "clearcoat": 0.4,
    "clearcoatRoughness": 0.08
  },
  "atrium-glow": {
    "baseColor": [
      1,
      0.48,
      0.14,
      1
    ],
    "roughness": 0.34,
    "metalness": 0,
    "emissive": [
      1,
      0.22,
      0.035
    ],
    "emissiveIntensity": 2.2
  },
  "iron-cast": {
    "baseColor": [
      0.157,
      0.149,
      0.141,
      1
    ],
    "roughness": 0.62,
    "metalness": 0.75
  },
  "archive-green": {
    "baseColor": [
      0.055,
      0.105,
      0.075,
      1
    ],
    "roughness": 0.46,
    "metalness": 0
  },
  "holyoke-navy": {
    "baseColor": [
      0.1,
      0.16,
      0.28,
      1
    ],
    "roughness": 0.78,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/canvas-albedo.60a42fce.webp",
      "normal": "/textures/materials/canvas-normal.1433bde5.webp",
      "orm": "/textures/materials/canvas-orm.217982cf.webp"
    }
  },
  "leather-tan": {
    "baseColor": [
      1,
      1,
      1,
      1
    ],
    "roughness": 0.58,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/leather-tan-albedo.345bf9b6.webp",
      "normal": "/textures/materials/leather-tan-normal.e2bac2d0.webp",
      "orm": "/textures/materials/leather-tan-orm.2b2c18fc.webp"
    }
  },
  "leather-worn": {
    "baseColor": [
      0.62,
      0.55,
      0.44,
      1
    ],
    "roughness": 0.68,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/leather-tan-albedo.345bf9b6.webp",
      "normal": "/textures/materials/leather-tan-normal.e2bac2d0.webp",
      "orm": "/textures/materials/leather-tan-orm.2b2c18fc.webp"
    }
  },
  "leather-green": {
    "baseColor": [
      0.038,
      0.246,
      0.098,
      1
    ],
    "roughness": 0.52,
    "metalness": 0,
    "clearcoat": 0.1,
    "clearcoatRoughness": 0.45,
    "textures": {
      "albedo": "/textures/materials/leather-upholstery-albedo.589a125f.webp",
      "normal": "/textures/materials/leather-upholstery-normal.f4f82bb0.webp",
      "orm": "/textures/materials/leather-upholstery-orm.7fb9dfd6.webp"
    }
  },
  "leather-desk": {
    "baseColor": [
      0.0315,
      0.208,
      0.082,
      1
    ],
    "roughness": 0.5,
    "metalness": 0,
    "clearcoat": 0.26,
    "clearcoatRoughness": 0.3,
    "normalScale": 0.6,
    "roughnessScale": 0.8,
    "textures": {
      "albedo": "/textures/materials/leather-upholstery-albedo.589a125f.webp",
      "normal": "/textures/materials/leather-upholstery-normal.f4f82bb0.webp",
      "orm": "/textures/materials/leather-upholstery-orm.7fb9dfd6.webp"
    }
  },
  "leather-ledger": {
    "baseColor": [
      0.232,
      0.19,
      0.294,
      1
    ],
    "roughness": 0.62,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/leather-tan-albedo.345bf9b6.webp",
      "normal": "/textures/materials/leather-tan-normal.e2bac2d0.webp",
      "orm": "/textures/materials/leather-tan-orm.2b2c18fc.webp"
    }
  },
  "velvet-green": {
    "baseColor": [
      0.0135,
      0.101,
      0.042,
      1
    ],
    "roughness": 0.9,
    "metalness": 0,
    "sheen": 1,
    "sheenColor": [
      0.08,
      0.3,
      0.15
    ],
    "sheenRoughness": 0.36,
    "textures": {
      "albedo": "/textures/materials/upholstery-velvet-albedo.e45bd932.webp",
      "normal": "/textures/materials/upholstery-velvet-normal.da9d86d7.webp",
      "orm": "/textures/materials/upholstery-velvet-orm.5eee1687.webp"
    }
  },
  "felt-brown": {
    "baseColor": [
      0.09,
      0.053,
      0.03,
      1
    ],
    "roughness": 0.92,
    "metalness": 0,
    "sheen": 0.6,
    "sheenColor": [
      0.26,
      0.17,
      0.11
    ],
    "sheenRoughness": 0.75,
    "textures": {
      "albedo": "/textures/materials/upholstery-velvet-albedo.e45bd932.webp",
      "normal": "/textures/materials/upholstery-velvet-normal.da9d86d7.webp",
      "orm": "/textures/materials/upholstery-velvet-orm.5eee1687.webp"
    }
  },
  "rawhide-lace": {
    "baseColor": [
      0.43,
      0.2,
      0.075,
      1
    ],
    "roughness": 0.82,
    "metalness": 0
  },
  "ball-leather-aged": {
    "baseColor": [
      0.34,
      0.15,
      0.05,
      1
    ],
    "roughness": 0.72,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/ball-1964-albedo.5d6fdcb0.webp",
      "normal": "/textures/materials/ball-1964-normal.d866d017.webp",
      "orm": "/textures/materials/ball-1964-orm.6ee90a56.webp"
    }
  },
  "ball-1964": {
    "baseColor": [
      1,
      1,
      1,
      1
    ],
    "roughness": 0.66,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/ball-1964-albedo.5d6fdcb0.webp",
      "normal": "/textures/materials/ball-1964-normal.d866d017.webp",
      "orm": "/textures/materials/ball-1964-orm.6ee90a56.webp"
    }
  },
  "ball-1998-white": {
    "baseColor": [
      0.88,
      0.88,
      0.86,
      1
    ],
    "roughness": 0.52,
    "metalness": 0,
    "clearcoat": 0.1,
    "clearcoatRoughness": 0.3,
    "textures": {
      "albedo": "/textures/materials/ball-1998-albedo.60ae2c1e.webp",
      "normal": "/textures/materials/ball-1998-normal.e79ca535.webp",
      "orm": "/textures/materials/ball-1998-orm.e96827c3.webp"
    }
  },
  "ball-1998-yellow": {
    "baseColor": [
      0.96,
      0.56,
      0.003,
      1
    ],
    "roughness": 0.52,
    "metalness": 0,
    "clearcoat": 0.1,
    "clearcoatRoughness": 0.3,
    "textures": {
      "albedo": "/textures/materials/ball-1998-albedo.60ae2c1e.webp",
      "normal": "/textures/materials/ball-1998-normal.e79ca535.webp",
      "orm": "/textures/materials/ball-1998-orm.e96827c3.webp"
    }
  },
  "ball-1998-blue": {
    "baseColor": [
      0.01,
      0.027,
      0.29,
      1
    ],
    "roughness": 0.52,
    "metalness": 0,
    "clearcoat": 0.1,
    "clearcoatRoughness": 0.3,
    "textures": {
      "albedo": "/textures/materials/ball-1998-albedo.60ae2c1e.webp",
      "normal": "/textures/materials/ball-1998-normal.e79ca535.webp",
      "orm": "/textures/materials/ball-1998-orm.e96827c3.webp"
    }
  },
  "ball-2008-yellow": {
    "baseColor": [
      0.98,
      0.56,
      0.002,
      1
    ],
    "roughness": 0.58,
    "metalness": 0,
    "clearcoat": 0.06,
    "clearcoatRoughness": 0.38,
    "textures": {
      "albedo": "/textures/materials/ball-2008-albedo.60ae2c1e.webp",
      "normal": "/textures/materials/ball-2008-normal.58bf2f0a.webp",
      "orm": "/textures/materials/ball-2008-orm.378fbcc4.webp"
    }
  },
  "ball-2008-blue": {
    "baseColor": [
      0.011,
      0.027,
      0.265,
      1
    ],
    "roughness": 0.58,
    "metalness": 0,
    "clearcoat": 0.06,
    "clearcoatRoughness": 0.38,
    "textures": {
      "albedo": "/textures/materials/ball-2008-albedo.60ae2c1e.webp",
      "normal": "/textures/materials/ball-2008-normal.58bf2f0a.webp",
      "orm": "/textures/materials/ball-2008-orm.378fbcc4.webp"
    }
  },
  "canvas": {
    "baseColor": [
      1,
      1,
      1,
      1
    ],
    "roughness": 0.88,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/canvas-albedo.60a42fce.webp",
      "normal": "/textures/materials/canvas-normal.1433bde5.webp",
      "orm": "/textures/materials/canvas-orm.217982cf.webp"
    }
  },
  "paper-aged": {
    "baseColor": [
      0.94,
      0.84,
      0.68,
      1
    ],
    "roughness": 0.92,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/canvas-albedo.60a42fce.webp",
      "normal": "/textures/materials/canvas-normal.1433bde5.webp",
      "orm": "/textures/materials/canvas-orm.217982cf.webp"
    }
  },
  "paper-writing": {
    "baseColor": [
      0.92,
      0.85,
      0.7,
      1
    ],
    "roughness": 0.9,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/paper-albedo.2f718b8d.webp",
      "normal": "/textures/materials/paper-normal.b583df75.webp",
      "orm": "/textures/materials/paper-orm.056d3252.webp"
    }
  },
  "cork": {
    "baseColor": [
      0.56,
      0.38,
      0.23,
      1
    ],
    "roughness": 0.96,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/canvas-albedo.60a42fce.webp",
      "normal": "/textures/materials/canvas-normal.1433bde5.webp",
      "orm": "/textures/materials/canvas-orm.217982cf.webp"
    }
  },
  "rug-burgundy": {
    "baseColor": [
      0.155,
      0.018,
      0.032,
      1
    ],
    "roughness": 0.96,
    "metalness": 0,
    "sheen": 0.45,
    "sheenColor": [
      0.26,
      0.06,
      0.08
    ],
    "sheenRoughness": 0.7,
    "textures": {
      "albedo": "/textures/materials/upholstery-velvet-albedo.e45bd932.webp",
      "normal": "/textures/materials/upholstery-velvet-normal.da9d86d7.webp",
      "orm": "/textures/materials/upholstery-velvet-orm.5eee1687.webp"
    }
  },
  "rug-ivory": {
    "baseColor": [
      0.746,
      0.59,
      0.334,
      1
    ],
    "roughness": 0.96,
    "metalness": 0,
    "sheen": 0.45,
    "sheenColor": [
      0.4,
      0.34,
      0.24
    ],
    "sheenRoughness": 0.7,
    "textures": {
      "albedo": "/textures/materials/upholstery-velvet-albedo.e45bd932.webp",
      "normal": "/textures/materials/upholstery-velvet-normal.da9d86d7.webp",
      "orm": "/textures/materials/upholstery-velvet-orm.5eee1687.webp"
    }
  },
  "cord-hemp": {
    "baseColor": [
      0.84,
      0.8,
      0.7,
      1
    ],
    "roughness": 0.9,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/canvas-albedo.60a42fce.webp",
      "normal": "/textures/materials/canvas-normal.1433bde5.webp",
      "orm": "/textures/materials/canvas-orm.217982cf.webp"
    }
  },
  "rope-velvet": {
    "baseColor": [
      0.46,
      0.075,
      0.1,
      1
    ],
    "roughness": 0.86,
    "metalness": 0,
    "textures": {
      "albedo": "/textures/materials/canvas-albedo.60a42fce.webp",
      "normal": "/textures/materials/canvas-normal.1433bde5.webp",
      "orm": "/textures/materials/canvas-orm.217982cf.webp"
    }
  },
  "glass-vitrine": {
    "baseColor": [
      0.86,
      0.9,
      0.9,
      0.14
    ],
    "roughness": 0.03,
    "metalness": 0,
    "alphaMode": "BLEND"
  },
  "glass-green": {
    "baseColor": [
      0.035,
      0.19,
      0.085,
      0.68
    ],
    "roughness": 0.16,
    "metalness": 0,
    "alphaMode": "BLEND"
  },
  "plastic-black": {
    "baseColor": [
      0.026,
      0.026,
      0.03,
      1
    ],
    "roughness": 0.52,
    "metalness": 0
  },
  "bakelite-black": {
    "baseColor": [
      0.012,
      0.01,
      0.009,
      1
    ],
    "roughness": 0.3,
    "metalness": 0,
    "clearcoat": 0.85,
    "clearcoatRoughness": 0.08
  },
  "enamel-cream": {
    "baseColor": [
      0.8,
      0.74,
      0.6,
      1
    ],
    "roughness": 0.35,
    "metalness": 0,
    "clearcoat": 0.3,
    "clearcoatRoughness": 0.1
  },
  "led-off": {
    "baseColor": [
      0.07,
      0.06,
      0.06,
      1
    ],
    "roughness": 0.3,
    "metalness": 0
  },
  "led-red": {
    "baseColor": [
      0.42,
      0.04,
      0.03,
      1
    ],
    "roughness": 0.3,
    "metalness": 0,
    "emissive": [
      1,
      0.07,
      0.035
    ],
    "emissiveIntensity": 1.5
  },
  "led-green": {
    "baseColor": [
      0.04,
      0.32,
      0.1,
      1
    ],
    "roughness": 0.3,
    "metalness": 0,
    "emissive": [
      0.1,
      1,
      0.28
    ],
    "emissiveIntensity": 1.2
  }
} as const satisfies Record<string, BakedMaterial>

export const BAKE_TOTALS = {
  bytes: 2931636,
  triangles: 149126,
  textureBytes: 1269562,
  /** Uncompressed VRAM with mips. The wire size says nothing about this. */
  textureVramBytes: 46006272,
} as const
