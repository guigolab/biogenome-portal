import { getApiBase } from '@/lib/api/taxon'

export type OrganismsListResponse = {
   total: number
   data: Record<string, unknown>[]
}

/**
 * Max length of comma-separated `taxid__in` on GET /organisms (~8k URL budget; proxies vary).
 * Above this, {@link fetchOrganismsForMapPointSelection} splits into parallel requests and merges.
 */
export const MAX_TAXID_IN_QUERY_CHARS = 7500

function dedupeOrganismRowsByTaxid(rows: Record<string, unknown>[]): Record<string, unknown>[] {
   const byTaxid = new Map<string, Record<string, unknown>>()
   for (const row of rows) {
      const tid = String(row.taxid ?? '').trim()
      if (tid && !byTaxid.has(tid)) byTaxid.set(tid, row)
   }
   return Array.from(byTaxid.values()).sort((a, b) =>
      String(a.taxid ?? '').localeCompare(String(b.taxid ?? '')),
   )
}

/** Split taxid list so each chunk's `join(',')` stays under maxChars (inclusive). */
export function splitTaxidsForUrlBudget(taxids: string[], maxChars: number): string[][] {
   const cleaned = [...new Set(taxids.map((t) => String(t).trim()).filter(Boolean))]
   if (cleaned.length === 0) return []
   const parts: string[][] = []
   let cur: string[] = []
   let curLen = 0
   for (const id of cleaned) {
      const add = cur.length ? 1 + id.length : id.length
      if (cur.length && curLen + add > maxChars) {
         parts.push(cur)
         cur = [id]
         curLen = id.length
      } else {
         cur.push(id)
         curLen += add
      }
   }
   if (cur.length) parts.push(cur)
   return parts
}

export type MapPointOrganismsResult = OrganismsListResponse & {
   /** When set, pagination for this selection is client-side slicing of this array. */
   clientFull?: Record<string, unknown>[]
}

/**
 * Map sidebar: load organisms for a selected frequency point (`taxid__in` from aggregation).
 * Uses a single GET when the list fits the URL; otherwise parallel chunk requests and merge.
 */
export async function fetchOrganismsForMapPointSelection(
   taxids: string[],
   shared: Record<string, string | number | boolean | undefined | null>,
   offset: number,
   pageSize: number,
): Promise<MapPointOrganismsResult> {
   const cleaned = [...new Set(taxids.map((t) => String(t).trim()).filter(Boolean))]
   if (cleaned.length === 0) {
      return { total: 0, data: [] }
   }

   const joined = cleaned.join(',')
   if (joined.length <= MAX_TAXID_IN_QUERY_CHARS) {
      return fetchOrganisms({
         ...shared,
         taxid__in: joined,
         limit: pageSize,
         offset,
      })
   }

   const chunks = splitTaxidsForUrlBudget(cleaned, MAX_TAXID_IN_QUERY_CHARS)
   if (chunks.length === 1) {
      return fetchOrganisms({
         ...shared,
         taxid__in: chunks[0].join(','),
         limit: pageSize,
         offset,
      })
   }

   // Multi-chunk: merge once at offset 0; map sidebar paginates via `clientFull` (see map-client-page).
   if (offset !== 0) {
      return { total: 0, data: [] }
   }

   const responses = await Promise.all(
      chunks.map((chunk) =>
         fetchOrganisms({
            ...shared,
            taxid__in: chunk.join(','),
            offset: 0,
            limit: Math.max(chunk.length, pageSize),
         }),
      ),
   )
   const merged = dedupeOrganismRowsByTaxid(responses.flatMap((r) => r.data))
   return {
      total: merged.length,
      data: merged.slice(0, pageSize),
      clientFull: merged,
   }
}

function appendParams(sp: URLSearchParams, params: Record<string, string | number | boolean | undefined | null>) {
   for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      sp.set(key, String(value))
   }
}

/**
 * GET/POST /coordinates/organisms — same response as GET /organisms but applies
 * ``polygon`` / ``has_sample_locations`` against SampleCoordinates (map sidebar).
 */
export async function fetchOrganismsWithSampleLocationFilters(
   params: Record<string, string | number | boolean | undefined | null>,
): Promise<OrganismsListResponse> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   appendParams(sp, params)
   const url = `${base}/coordinates/organisms${sp.toString() ? `?${sp.toString()}` : ''}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`coordinates/organisms: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as OrganismsListResponse
   if (typeof json.total !== 'number' || !Array.isArray(json.data)) {
      throw new Error('coordinates/organisms: invalid response shape')
   }
   return json
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
