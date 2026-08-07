/**
 * Dev-only screenshot sink.
 *
 * The agent building this project cannot see the screen. `renderer.info` proves
 * the frame is cheap and the portal walk proves the right rooms are drawn, but
 * neither says whether the museum LOOKS like anything — whether the floor
 * tiles at a sane scale, whether the plinths are the right height, whether a
 * gallery is lit or pitch black.
 *
 * This accepts a base64 frame from the page and writes it to disk, which turns
 * "render the scene and look at it" into something that can happen without a
 * human at the keyboard. It is also the foundation for the deterministic
 * per-room contact sheets the QA plan calls for: fixed camera rigs, captured on
 * demand, diffable between builds.
 *
 * Dev server only — never part of a production build.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'

const OUT_ROOT = 'docs/contact-sheets'
/** Frames are a megabyte or two of base64; anything larger is a mistake. */
const MAX_BODY_BYTES = 12 * 1024 * 1024

export function capturePlugin() {
  /**
   * Mounted on the dev server AND the preview server. The preview server is
   * what serves the production build, and measuring the shipping bundle is the
   * whole point of having a preview — a capture endpoint that only exists in
   * dev cannot photograph the thing that actually ships.
   */
  const handler = (server) => {
    server.middlewares.use('/__capture', async (request, response) => {
        if (request.method !== 'POST') {
          response.statusCode = 405
          response.end('POST only')
          return
        }

        try {
          const chunks = []
          let total = 0
          for await (const chunk of request) {
            total += chunk.length
            if (total > MAX_BODY_BYTES) {
              response.statusCode = 413
              response.end('too large')
              return
            }
            chunks.push(chunk)
          }

          const { name, data } = JSON.parse(Buffer.concat(chunks).toString('utf8'))

          // Containment: the name is used as a filename and nothing else. No
          // separators, no traversal, no choosing the extension.
          const safe = String(name || 'frame').replace(/[^a-z0-9._-]/gi, '_')
          if (!safe || safe.startsWith('.') || extname(safe) !== '') {
            response.statusCode = 400
            response.end('bad name')
            return
          }

          const outPath = resolve(server.config.root, OUT_ROOT, `${safe}.jpg`)
          await mkdir(dirname(outPath), { recursive: true })
          await writeFile(outPath, Buffer.from(String(data), 'base64'))

          response.setHeader('content-type', 'application/json')
          response.end(JSON.stringify({ ok: true, path: `${OUT_ROOT}/${safe}.jpg` }))
        } catch (error) {
          response.statusCode = 500
          response.end(String(error?.message ?? error))
        }
    })
  }

  return {
    name: 'museum-capture',
    apply: 'serve',
    configureServer: handler,
    configurePreviewServer: handler,
  }
}
