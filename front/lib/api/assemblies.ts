import { getApiBase } from '@/lib/api/taxon'

export type AssemblyListResponse = {
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
 * GET /assemblies/:accession — single assembly document.
 */
export async function fetchAssembly(accession: string): Promise<Record<string, unknown> | null> {
   const base = getApiBase()
   const url = `${base}/assemblies/${encodeURIComponent(accession)}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
   })
   if (res.status === 404) return null
   if (!res.ok) {
      throw new Error(`assemblies/${accession}: ${res.status} ${res.statusText}`)
   }
   return (await res.json()) as Record<string, unknown>
}

/**
 * GET /assemblies/:accession/chromosomes
 */
export async function fetchAssemblyChromosomes(accession: string): Promise<Record<string, unknown>[]> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   sp.set('limit', '2000')
   sp.set('offset', '0')
   const url = `${base}/assemblies/${encodeURIComponent(accession)}/chromosomes?${sp.toString()}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
   })
   if (!res.ok) {
      throw new Error(`assemblies/.../chromosomes: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as AssemblyListResponse
   if (!Array.isArray(json.data)) {
      throw new Error('chromosomes: invalid response shape')
   }
   return json.data
}

export type GenomeAnnotationRow = {
   name: string
   /** Often present on catalog rows; used as JBrowse assembly.name (Annotrieve pattern). */
   assembly_name?: string
   gff_gz_location?: string
   tab_index_location?: string
   metadata?: Record<string, unknown>
}

/**
 * GET /assemblies/:accession/annotations
 */
export async function fetchAssemblyAnnotations(accession: string): Promise<GenomeAnnotationRow[]> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   sp.set('limit', '500')
   sp.set('offset', '0')
   const url = `${base}/assemblies/${encodeURIComponent(accession)}/annotations?${sp.toString()}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
   })
   if (!res.ok) {
      throw new Error(`assemblies/.../annotations: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as { total?: number; data?: GenomeAnnotationRow[] }
   if (!Array.isArray(json.data)) {
      throw new Error('annotations: invalid response shape')
   }
   return json.data
}
