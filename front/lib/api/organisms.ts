import { getApiBase } from '@/lib/api/taxon'

export type OrganismsListResponse = {
   total: number
   data: Record<string, unknown>[]
}

function appendParams(sp: URLSearchParams, params: Record<string, string | number | boolean | undefined | null>) {
   for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      sp.set(key, String(value))
   }
}

/**
 * GET /organisms — same contract as Vue CommonService.getItems('organisms', params).
 */
export async function fetchOrganisms(
   params: Record<string, string | number | boolean | undefined | null>,
): Promise<OrganismsListResponse> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   appendParams(sp, params)
   const url = `${base}/organisms${sp.toString() ? `?${sp.toString()}` : ''}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`organisms: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as OrganismsListResponse
   if (typeof json.total !== 'number' || !Array.isArray(json.data)) {
      throw new Error('organisms: invalid response shape')
   }
   return json
}

/**
 * GET /organisms with ``format=tsv`` — same filters as list; streams full matching set (not paginated).
 */
export async function downloadOrganismsTsv(
   params: Record<string, string | number | boolean | undefined | null>,
   fields: string[],
): Promise<Blob> {
   if (fields.length === 0) {
      throw new Error('At least one field is required for export')
   }
   const base = getApiBase()
   const sp = new URLSearchParams()
   appendParams(sp, { ...params, format: 'tsv', fields: fields.join(',') })
   const url = `${base}/organisms${sp.toString() ? `?${sp.toString()}` : ''}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'text/tab-separated-values,*/*' },
   })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || `organisms export: ${res.status} ${res.statusText}`)
   }
   return res.blob()
}

/**
 * GET /organisms/:taxid — single organism document (MongoEngine JSON).
 */
export async function fetchOrganism(
   taxid: string,
): Promise<Record<string, unknown> | null> {
   const base = getApiBase()
   const url = `${base}/organisms/${encodeURIComponent(taxid)}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
   })
   if (res.status === 404) {
      return null
   }
   if (!res.ok) {
      throw new Error(`organisms/${taxid}: ${res.status} ${res.statusText}`)
   }
   return res.json() as Promise<Record<string, unknown>>
}

export type OrganismRelatedModel = 'assemblies' | 'biosamples' | 'reads'

/**
 * GET /organisms/:taxid/:model — paginated related catalog rows (default limit 200).
 */
export async function fetchOrganismRelated(
   taxid: string,
   model: OrganismRelatedModel,
   params?: { limit?: number; offset?: number },
): Promise<Record<string, unknown>[]> {
   const { data } = await fetchOrganismRelatedWithTotal(taxid, model, params)
   return data
}

/** Related catalog rows plus total count (for species detail tabs / pagination). */
export async function fetchOrganismRelatedWithTotal(
   taxid: string,
   model: OrganismRelatedModel,
   params?: { limit?: number; offset?: number },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
   const base = getApiBase()
   const limit = params?.limit ?? 200
   const offset = params?.offset ?? 0
   const sp = new URLSearchParams()
   sp.set('limit', String(limit))
   sp.set('offset', String(offset))
   const url = `${base}/organisms/${encodeURIComponent(taxid)}/${model}?${sp.toString()}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
   })
   if (!res.ok) {
      throw new Error(`organisms/${taxid}/${model}: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as { total?: number; data?: unknown }
   const data = Array.isArray(json.data) ? (json.data as Record<string, unknown>[]) : []
   const total = typeof json.total === 'number' && Number.isFinite(json.total) ? json.total : data.length
   return { data, total }
}
