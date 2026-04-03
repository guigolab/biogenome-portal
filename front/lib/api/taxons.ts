import { getApiBase } from '@/lib/api/taxon'

export type TaxonsListResponse = {
   total: number
   data: Record<string, unknown>[]
}

function appendParams(sp: URLSearchParams, params: Record<string, string | number | boolean | undefined | null>) {
   for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      sp.set(key, String(value))
   }
}

/** GET /taxons/root — portal root taxon (server ``ROOT_NODE``); same shape as ``/taxons/:id``. */
export async function fetchRootTaxon(): Promise<Record<string, unknown>> {
   const base = getApiBase()
   const url = `${base}/taxons/root`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`taxons/root: ${res.status} ${res.statusText}`)
   }
   return res.json() as Promise<Record<string, unknown>>
}

/** GET /taxons — catalog list (rank, sort, pagination). */
export async function fetchTaxons(
   params: Record<string, string | number | boolean | undefined | null>,
): Promise<TaxonsListResponse> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   appendParams(sp, params)
   const url = `${base}/taxons${sp.toString() ? `?${sp.toString()}` : ''}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`taxons: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as TaxonsListResponse
   if (typeof json.total !== 'number' || !Array.isArray(json.data)) {
      throw new Error('taxons: invalid response shape')
   }
   return json
}

/** GET /taxons/:id/ancestors — lineage from root toward taxon (excludes NCBI root taxid 1 per server). */
export async function fetchTaxonAncestors(taxid: string): Promise<Record<string, unknown>[]> {
   const base = getApiBase()
   const url = `${base}/taxons/${encodeURIComponent(taxid)}/ancestors`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`taxons/${taxid}/ancestors: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as unknown
   if (!Array.isArray(json)) {
      throw new Error('taxons/ancestors: expected array')
   }
   return json as Record<string, unknown>[]
}
