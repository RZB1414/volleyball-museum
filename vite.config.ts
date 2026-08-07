import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// @ts-expect-error -- plain .mjs dev plugin, no types needed
import { capturePlugin } from './scripts/vite-plugin-capture.mjs'

/**
 * Deliberately NO manual chunking.
 *
 * Vite 8 runs on Rolldown 1.1.3, where Rollup's `manualChunks` is gone,
 * `build.rollupOptions` is a deprecated alias, and `output.advancedChunks` —
 * which most 2026 write-ups still name as the replacement — is itself
 * deprecated in favour of `output.codeSplitting`. All of which is true and all
 * of which turned out to be beside the point.
 *
 * Naming a group makes Rolldown treat that chunk as a placement target reachable
 * from the entry, and it emits a `<link rel="modulepreload">` for it. Two
 * attempts at hand-grouping made things strictly worse, and both were only
 * visible by measuring the served build rather than reading the config:
 *
 *   - A dedicated `rapier` group swallowed a further megabyte of shared
 *     runtime, so the ENTRY statically imported it and the title screen pulled
 *     1,050 KB before rendering a single pixel.
 *   - Dropping that rule moved Rapier into the `r3f` group, which the museum
 *     genuinely needs — and index.html preloaded 1,275 KB.
 *
 * Rolldown already splits correctly on the `lazy()` boundaries this app has:
 * the title screen, the 3D canvas and the legacy tree are three separate
 * dynamic imports, which is exactly the shape the splitter wants. Hand-tuning
 * on top of that was fighting it.
 */
export default defineConfig({
  plugins: [react(), capturePlugin()],
  build: {
    target: 'es2023',
    // Every warning here is a real regression against the bundle budget.
    chunkSizeWarningLimit: 700,
  },
})
