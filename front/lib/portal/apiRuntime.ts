let runtimeRootTaxid: string | null = null

/**
 * Apply the backend-derived root taxid (``GET /taxons/root``), fetched once per request in the
 * root layout (see `lib/portal/portalServer.ts` / `contexts/portal-context.tsx`), so
 * `getRootTaxid()` in `lib/api/taxon.ts` can read it synchronously downstream.
 * Safe for single-tenant deployments (one backend per process — the value never varies
 * across requests within the same deployment).
 */
export function applyRuntimeRootTaxid(taxid: string | null | undefined): void {
   runtimeRootTaxid =
      typeof taxid === 'string' && taxid.trim().length > 0 ? taxid.trim() : null
}

export function getRuntimeRootTaxidRaw(): string | null {
   return runtimeRootTaxid
}

/**
 * Resolve a path-only API base (e.g. `/api`, `/bgp/api`) to an absolute URL for `fetch`.
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
