import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'

/**
 * The museum, and nothing else.
 *
 * This used to branch on `?v1` to reach the previous build, which was kept
 * around because it held uncommitted work. That work is in the history now and
 * the old tree is gone, so the branch, the second lazy chunk and
 * @react-three/rapier — 803 KB gzip of base64-inlined WebAssembly that only the
 * old player controller ever touched — all go with it.
 *
 * Still lazy. The title screen renders before three.js is fetched, which is the
 * whole reason the first paint is under 80 KB.
 */
const MuseumApp = lazy(() =>
  import('./MuseumApp.tsx').then((module) => ({ default: module.MuseumApp })),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <MuseumApp />
    </Suspense>
  </StrictMode>,
)
