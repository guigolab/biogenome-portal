import { getApiBase } from '@/lib/api/taxon'

export type ReadExperimentGroup = {
   experiment_accession: string
   experiment_title: string
   count: number
}

export type ReadExperimentsPage = {
   items: ReadExperimentGroup[]
   total: number
   offset: number
   limit: number
}

/** GET /reads/experiments — same query string as catalog reads list. */
export async function fetchReadExperiments(
   query: Record<string, string>,
   offset: number,
   limit: number,
): Promise<ReadExperimentsPage> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') sp.set(k, v)
   }
   sp.set('offset', String(offset))
   sp.set('limit', String(limit))
   const url = `${base}/reads/experiments?${sp.toString()}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`reads/experiments: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as Record<string, unknown>
   const items = Array.isArray(json.items) ? (json.items as ReadExperimentGroup[]) : []
   const total = typeof json.total === 'number' ? json.total : 0
   const off = typeof json.offset === 'number' ? json.offset : offset
   const lim = typeof json.limit === 'number' ? json.limit : limit
   return { items, total, offset: off, limit: lim }
}
