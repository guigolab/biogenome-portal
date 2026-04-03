import {
   getRuntimeApiBaseRaw,
   getRuntimeRootTaxidRaw,
   resolveApiBaseForFetch,
} from '@/lib/portal/apiRuntime'

/**
 * REST API base for fetch URLs. Resolution order:
 * 1. `NEXT_PUBLIC_API_BASE` if set (local dev / emergency override)
 * 2. `portal.json` → `general.apiBase` (see `applyPortalGeneralRuntime` / root layout)
 * 3. Browser: `origin` + `NEXT_PUBLIC_BASE_PATH` + `/api`
 * 4. Server: path-only bases need `INTERNAL_FETCH_ORIGIN` (see `resolveApiBaseForFetch`) — Node cannot fetch relative URLs.
 */
export function getApiBase(): string {
   const envOverride = process.env.NEXT_PUBLIC_API_BASE
   if (envOverride && envOverride.length > 0) {
      return envOverride.replace(/\/$/, '')
   }
   const fromPortal = getRuntimeApiBaseRaw()
   if (fromPortal) {
      return resolveApiBaseForFetch(fromPortal)
   }
   if (typeof window !== 'undefined') {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const origin = window.location.origin
      const prefix = basePath ? (basePath.endsWith('/') ? basePath.slice(0, -1) : basePath) : ''
      return `${origin}${prefix}/api`.replace(/\/$/, '')
   }
   const bp = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '')
   const pathOnly = bp ? `${bp}/api` : '/api'
   return resolveApiBaseForFetch(pathOnly)
}

/**
 * Root taxid fallback for UI. Prefer ``GET /taxons/root``. Order: `NEXT_PUBLIC_ROOT_TAXID` if set,
 * then portal.json `general.rootTaxid`, then cellular life default.
 */
export function getRootTaxid(): string {
   const env = process.env.NEXT_PUBLIC_ROOT_TAXID?.trim()
   if (env) return env
   return getRuntimeRootTaxidRaw() || '131567'
}

export async function fetchTaxon(taxid: string): Promise<Record<string, unknown>> {
   const base = getApiBase()
   const url = `${base}/taxons/${encodeURIComponent(taxid)}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`taxons/${taxid}: ${res.status} ${res.statusText}`)
   }
   return res.json() as Promise<Record<string, unknown>>
}
