import type { ConfigFilter } from '@/lib/portal/types'

/** Dot paths as in portal.json; server `create_query` maps `.` → `__`. */
export function apiParamKeyFromFilterKey(key: string): string {
   return key.replace(/\./g, '__')
}

export type DateRange = { from?: string; to?: string }

export type FilterValuesState = {
   text?: string
   select?: string
   checkbox?: boolean
   date?: DateRange
}

/**
 * Flat query params for GET catalog / stats (excluding pagination when building export).
 */
export function buildCatalogQueryParams(options: {
   taxonLineage?: string | null
   filter?: string
   sortColumn?: string | null
   sortOrder?: 'asc' | 'desc'
   filterDefs: ConfigFilter[] | undefined
   filterValues: Record<string, FilterValuesState | undefined>
}): Record<string, string | number | boolean> {
   const out: Record<string, string | number | boolean> = {}

   const { taxonLineage, filter, sortColumn, sortOrder, filterDefs, filterValues } = options

   if (taxonLineage && taxonLineage.trim()) {
      out.taxon_lineage = taxonLineage.trim()
   }
   if (filter && filter.trim()) {
      out.filter = filter.trim()
   }
   if (sortColumn && sortColumn.trim()) {
      out.sort_column = sortColumn.trim()
      out.sort_order = sortOrder ?? 'asc'
   }

   for (const def of filterDefs ?? []) {
      const rawKey = def.key
      const st = filterValues[rawKey]
      if (!st) continue
      const base = apiParamKeyFromFilterKey(rawKey)

      if (def.type === 'input') {
         const v = st.text?.trim()
         if (v) out[base] = v
      } else if (def.type === 'select') {
         const v = st.select?.trim()
         if (v && v !== 'all') out[base] = v
      } else if (def.type === 'checkbox') {
         if (st.checkbox === true) out[base] = 'true'
         else if (st.checkbox === false) out[base] = 'false'
      } else if (def.type === 'date') {
         const from = st.date?.from?.trim()
         const to = st.date?.to?.trim()
         if (from) out[`${base}__gte`] = from
         if (to) out[`${base}__lte`] = to
      }
   }

   return out
}

export function mergeListPagination(
   base: Record<string, string | number | boolean>,
   limit: number,
   offset: number,
): Record<string, string | number | boolean> {
   return { ...base, limit, offset }
}

/** `fetchFieldStats` only accepts string values in query params. */
export function toStatsQueryRecord(
   q: Record<string, string | number | boolean>,
): Record<string, string> {
   const out: Record<string, string> = {}
   for (const [k, v] of Object.entries(q)) {
      if (v === undefined || v === null || v === '') continue
      out[k] = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)
   }
   return out
}

/** MongoEngine `order_by` uses `__` for nested paths (same as `create_query` for filters). */
export function sortColumnForApi(column: string): string {
   return column.replace(/\./g, '__')
}

export function getNestedValue(obj: unknown, path: string): unknown {
   const parts = path.split('.')
   let cur: unknown = obj
   for (const p of parts) {
      if (cur === null || cur === undefined || typeof cur !== 'object') return undefined
      cur = (cur as Record<string, unknown>)[p]
   }
   return cur
}

export function formatCellValue(value: unknown): string {
   if (value === null || value === undefined) return '—'
   if (typeof value === 'boolean') return value ? 'true' : 'false'
   if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—'
   if (typeof value === 'string') return value || '—'
   if (value instanceof Date) return value.toISOString()
   if (Array.isArray(value)) {
      if (value.length === 0) return '—'
      if (typeof value[0] === 'object') return JSON.stringify(value)
      return value.map((x) => String(x)).join(', ')
   }
   if (typeof value === 'object') return JSON.stringify(value)
   return String(value)
}
