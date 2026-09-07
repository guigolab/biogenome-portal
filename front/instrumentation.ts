/**
 * Startup hook: warm the root layout's ISR cache so the first real visitor does not
 * see build-time default metadata (title / description / favicon from defaultPortal.json).
 *
 * `loadPortalConfig()` short-circuits during `next build`; after boot, one loopback
 * request forces `generateMetadata()` to run at request time against the live backend
 * (or the Phase 3 disk fallback). Failures are ignored — a slow/unreachable backend
 * must not crash the process.
 */
export async function register() {
   if (process.env.NEXT_RUNTIME !== 'nodejs') return

   const port = process.env.PORT ?? '3000'
   const rawBase = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').trim()
   const basePath =
      rawBase === '' || rawBase === '/'
         ? ''
         : rawBase.startsWith('/')
           ? rawBase.replace(/\/$/, '')
           : `/${rawBase.replace(/\/$/, '')}`
   const url = `http://127.0.0.1:${port}${basePath}/`

   setTimeout(() => {
      void fetch(url).catch(() => {})
   }, 500)
}
