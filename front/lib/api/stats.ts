import { getApiBase } from '@/lib/api/taxon'

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
   const out: Record<string, number> = {}
   for (const [k, v] of Object.entries(json)) {
      if (k === 'message') continue
      const n = typeof v === 'number' ? v : Number(v)
      if (!Number.isNaN(n)) out[k] = n
   }
   return out
}
