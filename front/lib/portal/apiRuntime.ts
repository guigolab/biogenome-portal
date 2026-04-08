import type { GeneralConfig } from './types'

let runtimeApiBase: string | null = null
let runtimeRootTaxid: string | null = null

/**
 * Apply `general.apiBase` and `general.rootTaxid` from portal.json (disk or fetched).
 * Safe for single-tenant deployments (one portal.json per process).
 */
export function applyPortalGeneralRuntime(general: GeneralConfig | undefined | null): void {
   if (!general) return
   const ab = general.apiBase
   runtimeApiBase =
      typeof ab === 'string' && ab.trim().length > 0 ? ab.trim().replace(/\/$/, '') : null

   const rt = general.rootTaxid
   runtimeRootTaxid =
      typeof rt === 'string' && rt.trim().length > 0 ? rt.trim() : null
}

export function getRuntimeApiBaseRaw(): string | null {
   return runtimeApiBase
}

export function getRuntimeRootTaxidRaw(): string | null {
   return runtimeRootTaxid
}

/**
 * Path or absolute URL from portal.
 * Browser: origin + path.
 * Server: Node `fetch` needs an absolute URL — use `INTERNAL_FETCH_ORIGIN` (e.g. `http://bgp_server:5000`)
 * so `/bgp/api` becomes `http://bgp_server:5000/api` (strip `NEXT_PUBLIC_BASE_PATH` when it prefixes the path).
 */
export function resolveApiBaseForFetch(raw: string): string {
   const trimmed = raw.replace(/\/$/, '')
   if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
   }
   const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
   if (typeof window !== 'undefined') {
      return `${window.location.origin}${path}`.replace(/\/$/, '')
   }
   const internalOrigin = (
      process.env.INTERNAL_FETCH_ORIGIN ?? process.env.INTERNAL_API_ORIGIN ?? ''
   ).trim()
   if (internalOrigin) {
      let suffix = path
      const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
      if (bp && suffix.startsWith(`${bp}/`)) {
         suffix = suffix.slice(bp.length)
      }
      return `${internalOrigin.replace(/\/$/, '')}${suffix}`.replace(/\/$/, '')
   }
   return path
}

/**
 * Resolve `general.apiBase` to an absolute origin for Edge / middleware `fetch`, where `window` is undefined.
 * Prefer `INTERNAL_FETCH_ORIGIN` (Docker service URL) so the probe reaches Flask; otherwise use the request origin.
 */
export function resolveApiBaseForMiddleware(raw: string, requestOrigin: string): string {
   const trimmed = raw.replace(/\/$/, '')
   if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
   }
   const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
   const internalOrigin = (
      process.env.INTERNAL_FETCH_ORIGIN ?? process.env.INTERNAL_API_ORIGIN ?? ''
   ).trim()
   if (internalOrigin) {
      let suffix = path
      const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
      if (bp && suffix.startsWith(`${bp}/`)) {
         suffix = suffix.slice(bp.length)
      }
      return `${internalOrigin.replace(/\/$/, '')}${suffix}`.replace(/\/$/, '')
   }
   return new URL(path, requestOrigin).href.replace(/\/$/, '')
}
