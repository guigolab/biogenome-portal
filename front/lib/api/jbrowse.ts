import type { GenomeAnnotationRow } from '@/lib/api/assemblies'
import { getApiBase } from '@/lib/api/taxon'
import type { ChromosomeRow } from '@/lib/genome-browser/buildDefaultSession'

export type JBrowseSessionAnnotation = {
   name: string
   gff_gz_location: string
   tab_index_location: string
}

export type JBrowseSessionRow = {
   accession: string
   assembly_name?: string
   scientific_name?: string
   taxid?: string
   annotations: JBrowseSessionAnnotation[]
}

export type JBrowseSessionsResponse = {
   total: number
   data: JBrowseSessionRow[]
}

function appendParams(sp: URLSearchParams, params: Record<string, string | number | boolean | undefined | null>) {
   for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      sp.set(key, String(value))
   }
}

/**
 * GET /jbrowse/sessions — assemblies with chromosomes and annotations, paginated.
 */
export async function fetchJBrowseSessions(
   params: Record<string, string | number | boolean | undefined | null>,
): Promise<JBrowseSessionsResponse> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   appendParams(sp, params)
   const url = `${base}/jbrowse/sessions${sp.toString() ? `?${sp.toString()}` : ''}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`jbrowse/sessions: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as JBrowseSessionsResponse
   if (typeof json.total !== 'number' || !Array.isArray(json.data)) {
      throw new Error('jbrowse/sessions: invalid response shape')
   }
   return json
}

export type GenomeBrowserContextResponse = {
   assembly: Record<string, unknown>
   chromosomes: ChromosomeRow[]
   annotations: GenomeAnnotationRow[]
}

function parseContextChromosomes(raw: unknown): ChromosomeRow[] {
   if (!Array.isArray(raw)) return []
   return raw.map((item) => {
      const o = item as Record<string, unknown>
      const metadata = o.metadata
      const meta =
         metadata && typeof metadata === 'object' && !Array.isArray(metadata)
            ? ({ ...metadata } as Record<string, unknown>)
            : undefined
      return {
         accession_version: String(o.accession_version ?? ''),
         metadata: meta,
         jbrowse_ref_name: String(o.jbrowse_ref_name ?? '').trim() || String(o.accession_version ?? ''),
         length_bp: typeof o.length_bp === 'number' && Number.isFinite(o.length_bp) && o.length_bp > 0 ? o.length_bp : 0,
      }
   })
}

/**
 * GET /jbrowse/assemblies/:accession/context — assembly + sorted browser chromosomes + annotations.
 */
export async function fetchGenomeBrowserContext(accession: string): Promise<GenomeBrowserContextResponse> {
   const base = getApiBase()
   const url = `${base}/jbrowse/assemblies/${encodeURIComponent(accession)}/context`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
   })
   if (res.status === 404) {
      throw new Error(`jbrowse context: assembly not found`)
   }
   if (!res.ok) {
      throw new Error(`jbrowse/context: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as Record<string, unknown>
   const assembly = json.assembly
   if (!assembly || typeof assembly !== 'object' || Array.isArray(assembly)) {
      throw new Error('jbrowse/context: invalid assembly')
   }
   if (!Array.isArray(json.annotations)) {
      throw new Error('jbrowse/context: invalid annotations')
   }
   return {
      assembly: assembly as Record<string, unknown>,
      chromosomes: parseContextChromosomes(json.chromosomes),
      annotations: json.annotations as GenomeAnnotationRow[],
   }
}
