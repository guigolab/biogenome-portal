import { getApiBase } from '@/lib/api/taxon'
import type { FlattenedTreeResponse } from '@/lib/taxonomy/flattenedTreeToNested'

/**
 * Full portal taxonomy table from the root tree (same rows as GET /tree?format=tsv / jsonl).
 * Not the subtree API: GET /tree/<taxid>/<rank_level> truncates at a rank — we never call that here.
 */
export async function fetchRootTreeTable(): Promise<FlattenedTreeResponse> {
   const base = getApiBase()
   const url = `${base}/tree?format=json`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`tree: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as unknown
   if (!json || typeof json !== 'object') {
      throw new Error('tree: invalid response')
   }
   const o = json as Record<string, unknown>
   if (!Array.isArray(o.fields) || !Array.isArray(o.rows)) {
      throw new Error('tree: expected { fields, rows }')
   }
   return {
      fields: o.fields.map((f) => String(f)),
      rows: o.rows as (string | number | null)[][],
   }
}
