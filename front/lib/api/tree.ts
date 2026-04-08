import { getApiBase } from '@/lib/api/taxon'
import type { FlattenedTreeResponse } from '@/lib/taxonomy/flattenedTreeToNested'

export type SubtreeLookupResponse = {
   taxid: string
   rank_level: string
   total_nodes: number
   total_leaves: number
}

function parseTreeTableJson(json: unknown): FlattenedTreeResponse {
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

/**
 * Full portal taxonomy table from the root tree (same rows as GET /tree?format=tsv / jsonl).
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
   return parseTreeTableJson(await res.json())
}

/** GET /tree/<taxid>/<rank_level>?format=json — subtree rows truncated at rank_level. */
export async function fetchSubtreeTreeTable(
   taxid: string,
   rankLevel: string,
): Promise<FlattenedTreeResponse> {
   const base = getApiBase()
   const tid = encodeURIComponent(taxid.trim())
   const rank = encodeURIComponent(rankLevel.trim().toLowerCase())
   const url = `${base}/tree/${tid}/${rank}?format=json`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`tree/${tid}/${rank}: ${res.status} ${res.statusText}`)
   }
   return parseTreeTableJson(await res.json())
}

/** GET /tree/<taxid>/<rank_level>/lookup — leaf/node counts for subtree semantics. */
export async function fetchSubtreeLookup(
   taxid: string,
   rankLevel: string,
): Promise<SubtreeLookupResponse> {
   const base = getApiBase()
   const tid = encodeURIComponent(taxid.trim())
   const rank = encodeURIComponent(rankLevel.trim().toLowerCase())
   const url = `${base}/tree/${tid}/${rank}/lookup`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   })
   if (!res.ok) {
      throw new Error(`tree/${tid}/${rank}/lookup: ${res.status} ${res.statusText}`)
   }
   const json = (await res.json()) as Record<string, unknown>
   return {
      taxid: String(json.taxid ?? taxid),
      rank_level: String(json.rank_level ?? rankLevel).toLowerCase(),
      total_nodes: typeof json.total_nodes === 'number' ? json.total_nodes : Number(json.total_nodes) || 0,
      total_leaves:
         typeof json.total_leaves === 'number' ? json.total_leaves : Number(json.total_leaves) || 0,
   }
}
