import { getApiBase } from '@/lib/api/taxon'
import type { DataModels } from '@/lib/portal/types'

export type CatalogListResponse = {
   total: number
   data: Record<string, unknown>[]
}

function appendParams(
   sp: URLSearchParams,
   params: Record<string, string | number | boolean | undefined | null>,
) {
   for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      sp.set(key, String(value))
   }
}

/**
 * GET /api/<model> — same contract as other catalog list endpoints.
 */
export async function fetchCatalogList(
   model: DataModels,
   params: Record<string, string | number | boolean | undefined | null>,
): Promise<CatalogListResponse> {
   const base = getApiBase()
   const sp = new URLSearchParams()
   appendParams(sp, params)
   const url = `${base}/${encodeURIComponent(model)}${sp.toString() ? `?${sp.toString()}` : ''}`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`${model}: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as CatalogListResponse
   if (typeof json.total !== 'number' || !Array.isArray(json.data)) {
      throw new Error(`${model}: invalid response shape`)
   }
   return json
}

export type CatalogExportFormat = 'tsv' | 'jsonl'

/**
 * GET /api/<model>?format=tsv|jsonl — full matching set (streamed).
 */
export async function downloadCatalogExport(
   model: DataModels,
   format: CatalogExportFormat,
   params: Record<string, string | number | boolean | undefined | null>,
   fields: string[],
): Promise<Blob> {
   if (fields.length === 0) {
      throw new Error('At least one field is required for export')
   }
   const base = getApiBase()
   const sp = new URLSearchParams()
   appendParams(sp, {
      ...params,
      format,
      fields: fields.join(','),
   })
   const url = `${base}/${encodeURIComponent(model)}?${sp.toString()}`
   const accept =
      format === 'tsv' ? 'text/tab-separated-values,*/*' : 'application/jsonlines,*/*'
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: accept },
   })
   if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text.trim() || `${model} export: ${res.status} ${res.statusText}`)
   }
   return res.blob()
}
