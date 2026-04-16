import { getApiBase } from '@/lib/api/taxon'
import type { FlattenedTreeResponse } from '@/lib/taxonomy/flattenedTreeToNested'

/** Shape used for per-rank truncation leaf counts in the taxonomy UI. */
export type SubtreeLookupResponse = {
   taxid: string
   rank_level: string
   total_nodes: number
   total_leaves: number
}

/** Parse one TSV line with optional CSV-style quoted fields (tab-delimited). */
function parseTsvLine(line: string): string[] {
   const result: string[] = []
   let i = 0
   while (i < line.length) {
      if (line[i] === '"') {
         let cell = ''
         i++
         while (i < line.length) {
            if (line[i] === '"') {
               if (line[i + 1] === '"') {
                  cell += '"'
                  i += 2
                  continue
               }
               i++
               break
            }
            cell += line[i]!
            i++
         }
         result.push(cell)
         if (line[i] === '\t') i++
         continue
      }
      const tab = line.indexOf('\t', i)
      if (tab === -1) {
         result.push(line.slice(i))
         break
      }
      result.push(line.slice(i, tab))
      i = tab + 1
   }
   return result
}

/**
 * Parse GET /tree?format=tsv body into the same `{ fields, rows }` shape as JSON.
 */
export function parseTreeTableTsv(text: string): FlattenedTreeResponse {
   const rawLines = text.split(/\r?\n/).filter((l) => l.length > 0)
   if (rawLines.length < 1) {
      throw new Error('tree: empty TSV')
   }
   const fields = parseTsvLine(rawLines[0]!).map((s) => s.trim())
   const rows: (string | number | null)[][] = []
   for (let li = 1; li < rawLines.length; li++) {
      const cells = parseTsvLine(rawLines[li]!)
      const row = fields.map((_, j) => {
         const raw = cells[j]
         if (raw === undefined || raw === '') return null
         const n = Number(raw)
         if (Number.isFinite(n) && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(raw.trim())) {
            return n
         }
         return raw
      })
      rows.push(row)
   }
   return { fields, rows }
}

/**
 * Full portal taxonomy table from the root tree (same rows as GET /tree?format=json / tsv).
 */
export async function fetchRootTreeTsv(): Promise<FlattenedTreeResponse> {
   const base = getApiBase()
   const url = `${base}/tree?format=tsv`
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'text/tab-separated-values' },
   })
   if (!res.ok) {
      throw new Error(`tree: ${res.status} ${res.statusText}`)
   }
   return parseTreeTableTsv(await res.text())
}
