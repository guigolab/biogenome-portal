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

/** GET /taxons/:taxid/children — JSON array of TaxonNode documents. */
export async function fetchTaxonChildren(taxid: string): Promise<Record<string, unknown>[]> {
   const base = getApiBase()
   const url = `${base}/taxons/${encodeURIComponent(taxid)}/children`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`taxons/${taxid}/children: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as unknown
   return Array.isArray(json) ? (json as Record<string, unknown>[]) : []
}

/** Minimal taxon shape for compact tree / UI (from TaxonNode JSON). */
export type TaxonRecord = {
   taxid: string
   scientific_name?: string
   name?: string
   rank?: string
   organisms_count: number
   assemblies_count: number
   annotations_count: number
}

export function taxonRecordFromApi(doc: Record<string, unknown>): TaxonRecord {
   const taxid = String(doc.taxid ?? '')
   const scientific_name =
      typeof doc.scientific_name === 'string'
         ? doc.scientific_name
         : typeof doc.name === 'string'
           ? doc.name
           : undefined
   return {
      taxid,
      scientific_name,
      name: typeof doc.name === 'string' ? doc.name : undefined,
      rank: typeof doc.rank === 'string' ? doc.rank : undefined,
      organisms_count: typeof doc.organisms_count === 'number' ? doc.organisms_count : 0,
      assemblies_count: typeof doc.assemblies_count === 'number' ? doc.assemblies_count : 0,
      annotations_count: typeof doc.annotations_count === 'number' ? doc.annotations_count : 0,
   }
}

/** GET /taxons/:taxid/ancestors — root-to-tip lineage (TaxonNode JSON array). */
export async function fetchTaxonAncestors(
   taxid: string,
): Promise<Record<string, unknown>[]> {
   const base = getApiBase()
   const url = `${base}/taxons/${encodeURIComponent(taxid)}/ancestors`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
   })
   if (!res.ok) {
      return []
   }
   const json = (await res.json()) as unknown
   return Array.isArray(json) ? (json as Record<string, unknown>[]) : []
}
