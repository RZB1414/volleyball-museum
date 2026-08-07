import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'

/**
 * The museum is now the default. `?v1` still reaches the previous build.
 *
 * The old tree is kept rather than deleted because it holds uncommitted work;
 * deleting it is the author's call, not this file's. Keeping it costs the
 * default path nothing, because BOTH trees are lazy and Rolldown gives
 * @react-three/rapier — whose base64-inlined WebAssembly is ~803 KB gzip — its
 * own chunk. Nobody who loads the museum downloads a byte of it.
 *
 * Once the legacy files are gone, this collapses to a single import and
 * `@react-three/rapier` comes out of package.json.
 */
const MuseumApp = lazy(() =>
  import('./MuseumApp.tsx').then((module) => ({ default: module.MuseumApp })),
)
const LegacyApp = lazy(() => import('./App.tsx'))

const useLegacy = new URLSearchParams(window.location.search).has('v1')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>{useLegacy ? <LegacyApp /> : <MuseumApp />}</Suspense>
  </StrictMode>,
)
