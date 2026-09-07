import { getRuntimeRootTaxidRaw, resolveApiBaseForFetch } from '@/lib/portal/apiRuntime'

/**
 * REST API base for fetch URLs. Resolution order:
 * 1. `NEXT_PUBLIC_API_BASE` if set (local dev / emergency override, unrelated to portal.json)
 * 2. Browser: `origin` + `NEXT_PUBLIC_BASE_PATH` + `/api`
 * 3. Server: path-only bases need `INTERNAL_FETCH_ORIGIN` (see `resolveApiBaseForFetch`) — Node cannot fetch relative URLs.
 */
export function getApiBase(): string {
   const envOverride = process.env.NEXT_PUBLIC_API_BASE
   if (envOverride && envOverride.length > 0) {
      return envOverride.replace(/\/$/, '')
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
 * Root taxid for UI. Backend-derived via `GET /taxons/root` (`fetchRootTaxid` below), fetched
 * once per request server-side in the root layout and threaded through the portal context
 * (see `applyRuntimeRootTaxid` in `lib/portal/apiRuntime.ts`). Falls back to the hardcoded
 * cellular-life default when the backend is unreachable.
 */
export function getRootTaxid(): string {
   return getRuntimeRootTaxidRaw() || '131567'
}

/** GET /taxons/root — portal root taxon (server `ROOT_NODE`); returns just the taxid. */
export async function fetchRootTaxid(): Promise<string> {
   const base = getApiBase()
   const url = `${base}/taxons/root`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`taxons/root: ${res.status} ${res.statusText}`)
   }
   const doc = (await res.json()) as Record<string, unknown>
   const taxid = String(doc.taxid ?? '').trim()
   if (!taxid) {
      throw new Error('taxons/root: response missing taxid')
   }
   return taxid
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
