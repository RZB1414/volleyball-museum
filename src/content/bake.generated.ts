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
    "url": "/models/room-atrium.d0746c17.glb",
    "bytes": 105476,
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
            -9.002,
            -0.002,
            -9.002
          ],
          "max": [
            9.002,
            8.402,
            9.002
          ],
          "size": [
            18.004,
            8.404,
            18.004
          ],
          "centre": [
            0,
            4.2,
            0
          ]
        },
        "triangles": 1916,
        "collider": {
          "kind": "box",
          "halfExtents": [
            9.002,
            4.202,
            9.002
          ],
          "centre": [
            0,
            4.2,
            0
          ]
        }
      }
    ]
  },
  {
    "name": "room-holyoke",
    "url": "/models/room-holyoke.883597bb.glb",
    "bytes": 87036,
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
        "triangles": 1688,
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
    "url": "/models/room-office.90429ee2.glb",
    "bytes": 76828,
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
        "triangles": 1460,
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
    "url": "/models/kit.d438275e.glb",
    "bytes": 294432,
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
        "triangles": 2212
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
        "triangles": 1156
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
  }
} as const satisfies Record<string, BakedMaterial>

export const BAKE_TOTALS = {
  bytes: 900628,
  triangles: 46644,
  textureBytes: 855744,
  /** Uncompressed VRAM with mips. The wire size says nothing about this. */
  textureVramBytes: 37748736,
} as const
