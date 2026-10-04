/**
 * Dev-only bridge for `?qaSave=<fixture>`.
 *
 * The save fixtures and the code that loads them (`src/dev`) must never ship:
 * a production build that could be told by its URL to overwrite a player's
 * save would be a defect, not a harness. Guarding an import with
 * `import.meta.env.DEV` would lean on the bundler dropping a dead branch; this
 * leans on nothing. The production entry never mentions `src/dev` at all, and
 * the dev server adds one module script to the page it serves.
 *
 * The script goes first in `<head>`, ahead of the entry in `<body>`: module
 * scripts run in document order, so the fixture is written before the entry
 * runs, and long before the store behind its `lazy()` import reads the save.
 */

/** Served by Vite straight from the source tree, like the entry itself. */
export const QA_SAVE_BOOT_MODULE = '/src/dev/qaSaveBoot.ts'

export function qaSavePlugin() {
  return {
    name: 'museum-qa-save',
    // The dev server only. `vite build` never loads this plugin, and the
    // preview server serves the built `index.html` without transforming it.
    apply: 'serve',
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'module', src: QA_SAVE_BOOT_MODULE },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}
