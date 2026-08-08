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
  readonly alphaMode?: string
  readonly textures?: BakedTextureSet
}

export const BAKED_BUNDLES = [
  {
    "name": "room-atrium",
    "url": "/models/room-atrium.6156c6d4.glb",
    "bytes": 157820,
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
            8.54,
            9.125
          ],
          "size": [
            18.25,
            8.54,
            18.25
          ],
          "centre": [
            0,
            4.27,
            0
          ]
        },
        "triangles": 3300,
        "collider": {
          "kind": "box",
          "halfExtents": [
            9.125,
            4.27,
            9.125
          ],
          "centre": [
            0,
            4.27,
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
    "url": "/models/room-holyoke.691932bd.glb",
    "bytes": 96232,
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
            4.34,
            8.125
          ],
          "size": [
            12.25,
            4.34,
            16.25
          ],
          "centre": [
            0,
            2.17,
            0
          ]
        },
        "triangles": 2700,
        "collider": {
          "kind": "box",
          "halfExtents": [
            6.125,
            2.17,
            8.125
          ],
          "centre": [
            0,
            2.17,
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
    "url": "/models/room-office.f1dba37e.glb",
    "bytes": 78980,
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
            3.34,
            3.625
          ],
          "size": [
            6.25,
            3.34,
            7.25
          ],
          "centre": [
            0,
            1.67,
            0
          ]
        },
        "triangles": 2100,
        "collider": {
          "kind": "box",
          "halfExtents": [
            3.125,
            1.67,
            3.625
          ],
          "centre": [
            0,
            1.67,
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
    "url": "/models/kit.7346f044.glb",
    "bytes": 873096,
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
            -1.3124,
            0.6734,
            -0.028
          ],
          "max": [
            1.3124,
            0.8763,
            0.028
          ],
          "size": [
            2.6247,
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
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.75,
            0,
            -0.39
          ],
          "max": [
            0.75,
            0.74,
            0.39
          ],
          "size": [
            1.5,
            0.74,
            0.78
          ],
          "centre": [
            0,
            0.37,
            0
          ]
        },
        "triangles": 2184,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.75,
            0.37,
            0.39
          ],
          "centre": [
            0,
            0.37,
            0
          ]
        }
      },
      {
        "name": "office-chair__frame",
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.2166,
            0.408,
            -0.2942
          ],
          "max": [
            0.2166,
            0.9481,
            0.2041
          ],
          "size": [
            0.4332,
            0.5401,
            0.4983
          ],
          "centre": [
            0,
            0.678,
            -0.0451
          ]
        },
        "triangles": 1392
      },
      {
        "name": "office-chair__base",
        "material": "iron-cast",
        "bounds": {
          "min": [
            -0.2082,
            0,
            -0.2082
          ],
          "max": [
            0.2082,
            0.41,
            0.2082
          ],
          "size": [
            0.4165,
            0.41,
            0.4165
          ],
          "centre": [
            0,
            0.205,
            0
          ]
        },
        "triangles": 1088,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.2082,
            0.205,
            0.2082
          ],
          "centre": [
            0,
            0.205,
            0
          ]
        }
      },
      {
        "name": "desk-lamp__base",
        "material": "brass",
        "bounds": {
          "min": [
            -0.1088,
            0,
            -0.085
          ],
          "max": [
            0.1088,
            0.322,
            0.085
          ],
          "size": [
            0.2176,
            0.322,
            0.17
          ],
          "centre": [
            0,
            0.161,
            0
          ]
        },
        "triangles": 700
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
        "material": "oak-varnished",
        "bounds": {
          "min": [
            -0.63,
            0,
            -0.1835
          ],
          "max": [
            0.63,
            2.02,
            0.1915
          ],
          "size": [
            1.26,
            2.02,
            0.375
          ],
          "centre": [
            0,
            1.01,
            0.004
          ]
        },
        "triangles": 1080,
        "collider": {
          "kind": "box",
          "halfExtents": [
            0.63,
            1.01,
            0.1875
          ],
          "centre": [
            0,
            1.01,
            0.004
          ]
        }
      },
      {
        "name": "bookshelf__books",
        "material": "leather-worn",
        "bounds": {
          "min": [
            -0.46,
            0.1255,
            -0.0875
          ],
          "max": [
            -0.096,
            1.751,
            0.1575
          ],
          "size": [
            0.364,
            1.6255,
            0.245
          ],
          "centre": [
            -0.278,
            0.9383,
            0.035
          ]
        },
        "triangles": 1296
      },
      {
        "name": "ledger-stack",
        "material": "leather-worn",
        "bounds": {
          "min": [
            -0.1741,
            0,
            -0.1345
          ],
          "max": [
            0.1852,
            0.208,
            0.1463
          ],
          "size": [
            0.3593,
            0.208,
            0.2808
          ],
          "centre": [
            0.0055,
            0.104,
            0.0059
          ]
        },
        "triangles": 1296
      },
      {
        "name": "ledger-stack__pages",
        "material": "canvas",
        "bounds": {
          "min": [
            -0.1586,
            0.006,
            -0.1262
          ],
          "max": [
            0.1819,
            0.202,
            0.1378
          ],
          "size": [
            0.3405,
            0.196,
            0.264
          ],
          "centre": [
            0.0117,
            0.104,
            0.0058
          ]
        },
        "triangles": 432
      }
    ]
  },
  {
    "name": "exhibits-holyoke",
    "url": "/models/exhibits-holyoke.73ea28b9.glb",
    "bytes": 336856,
    "parts": [
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
      "albedo": "/textures/materials/leather-tan-albedo.e8cc6805.webp",
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
      "albedo": "/textures/materials/leather-tan-albedo.e8cc6805.webp",
      "normal": "/textures/materials/leather-tan-normal.e2bac2d0.webp",
      "orm": "/textures/materials/leather-tan-orm.2b2c18fc.webp"
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
      "albedo": "/textures/materials/canvas-albedo.98cc316f.webp",
      "normal": "/textures/materials/canvas-normal.1433bde5.webp",
      "orm": "/textures/materials/canvas-orm.217982cf.webp"
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
      "albedo": "/textures/materials/canvas-albedo.98cc316f.webp",
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
      "albedo": "/textures/materials/canvas-albedo.98cc316f.webp",
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
  }
} as const satisfies Record<string, BakedMaterial>

export const BAKE_TOTALS = {
  bytes: 1542984,
  triangles: 79792,
  textureBytes: 855744,
  /** Uncompressed VRAM with mips. The wire size says nothing about this. */
  textureVramBytes: 37748736,
} as const
