import { getApiBase } from '@/lib/api/taxon'

function parseStatsJson(json: Record<string, unknown>): Record<string, number> {
   const out: Record<string, number> = {}
   for (const [k, v] of Object.entries(json)) {
      if (k === 'message') continue
      const n = typeof v === 'number' ? v : Number(v)
      if (!Number.isNaN(n)) out[k] = n
   }
   return out
}

/** GET /stats/:model/:field — field frequency distribution (e.g. taxons + rank). */
export async function fetchFieldStats(
   model: string,
   field: string,
   query: Record<string, string> = {},
): Promise<Record<string, number>> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') sp.set(k, v)
   }
   const qs = sp.toString()
   const url = `${base}/stats/${encodeURIComponent(model)}/${encodeURIComponent(field)}${qs ? `?${qs}` : ''}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`stats/${model}/${field}: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as Record<string, unknown>
   return parseStatsJson(json)
}

/**
 * POST /stats/:model — body `{ field }` (same query params as GET).
 * Use for field names that are awkward in a URL path (e.g. slashes in metadata keys).
 */
export async function fetchFieldStatsPost(
   model: string,
   field: string,
   query: Record<string, string> = {},
): Promise<Record<string, number>> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') sp.set(k, v)
   }
   const qs = sp.toString()
   const url = `${base}/stats/${encodeURIComponent(model)}${qs ? `?${qs}` : ''}`
   const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ field }),
   })
   if (!res.ok) {
      throw new Error(`stats POST ${model}: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as Record<string, unknown>
   return parseStatsJson(json)
}

export type DateHistogramBucket = { value: string; count: number }

/** POST /stats/:model — `mode: date_histogram` for ordered regex-filtered buckets. */
export async function fetchDateHistogramBuckets(
   model: string,
   field: string,
   query: Record<string, string> = {},
): Promise<DateHistogramBucket[]> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') sp.set(k, v)
   }
   const qs = sp.toString()
   const url = `${base}/stats/${encodeURIComponent(model)}${qs ? `?${qs}` : ''}`
   const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, mode: 'date_histogram' }),
   })
   if (!res.ok) {
      throw new Error(`stats date_histogram ${model}: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as { buckets?: unknown }
   const raw = json.buckets
   if (!Array.isArray(raw)) return []
   const out: DateHistogramBucket[] = []
   for (const row of raw) {
      if (!row || typeof row !== 'object') continue
      const value = (row as { value?: unknown }).value
      const count = (row as { count?: unknown }).count
      if (typeof value !== 'string' || typeof count !== 'number' || !Number.isFinite(count)) continue
      out.push({ value, count: Math.trunc(count) })
   }
   return out
}
