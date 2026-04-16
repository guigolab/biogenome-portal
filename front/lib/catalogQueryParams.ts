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
   /** Scoped taxon: matches records whose `taxon_lineage` contains this taxid (`taxon_lineage__in`). */
   speciesTaxid?: string | null
   filter?: string
   sortColumn?: string | null
   sortOrder?: 'asc' | 'desc'
   filterDefs: ConfigFilter[] | undefined
   filterValues: Record<string, FilterValuesState | undefined>
}): Record<string, string | number | boolean> {
   const out: Record<string, string | number | boolean> = {}

   const { taxonLineage, speciesTaxid, filter, sortColumn, sortOrder, filterDefs, filterValues } =
      options

   if (taxonLineage && taxonLineage.trim()) {
      out.taxon_lineage = taxonLineage.trim()
   }
   if (speciesTaxid && String(speciesTaxid).trim()) {
      out.taxon_lineage__in = String(speciesTaxid).trim()
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

      if (def.type === 'thresholdPair' && def.thresholdPair?.length) {
         for (const p of def.thresholdPair) {
            const stPair = filterValues[p.key]
            if (stPair?.checkbox === true) {
               const base = apiParamKeyFromFilterKey(p.key)
               out[`${base}__gte`] = p.threshold
            }
         }
         continue
      }

      const st = filterValues[rawKey]
      if (!st) continue
      const base = apiParamKeyFromFilterKey(rawKey)

      if (def.type === 'input') {
         const v = st.text?.trim()
         if (v) out[base] = v
      } else if (def.type === 'select' || def.type === 'experimentList') {
         const v = st.select?.trim()
         if (v && v !== 'all') out[base] = v
      } else if (def.type === 'checkbox') {
         if (st.checkbox === true) out[base] = 'true'
         else if (st.checkbox === false) out[base] = 'false'
      } else if (def.type === 'date' || def.type === 'histogramDate') {
         const from = st.date?.from?.trim()
         const to = st.date?.to?.trim()
         if (from) out[`${base}__gte`] = from
         if (to) out[`${base}__lte`] = to
      } else if (def.type === 'thresholdToggle') {
         if (st.checkbox === true) {
            const thr = def.threshold ?? 0
            out[`${base}__gte`] = thr
         }
      } else if (def.type === 'referenceGenome') {
         if (st.checkbox === true) {
            out[base] = 'reference_genome'
         }
      }
   }

   return out
}

/** Query param keys contributed by a filter (for facet stats: drop the field being aggregated). */
export function queryParamKeysForFilterDef(def: ConfigFilter): string[] {
   if (def.type === 'thresholdPair' && def.thresholdPair?.length) {
      return def.thresholdPair.map((p) => `${apiParamKeyFromFilterKey(p.key)}__gte`)
   }
   const base = apiParamKeyFromFilterKey(def.key)
   switch (def.type) {
      case 'histogramDate':
      case 'date':
         return [`${base}__gte`, `${base}__lte`]
      case 'thresholdToggle':
         return [`${base}__gte`]
      case 'referenceGenome':
         return [base]
      case 'input':
      case 'select':
      case 'experimentList':
      case 'checkbox':
         return [base]
      default:
         return [base]
   }
}

function fallbackParamKeysForExcludeField(excludeFilterKey: string): string[] {
   const base = apiParamKeyFromFilterKey(excludeFilterKey)
   return [base, `${base}__gte`, `${base}__lte`]
}

/**
 * Same flat params as the list query, minus keys for `excludeFilterKey` (the filter def `key`
 * or field path used with POST /stats), so facet distributions are not conditioned on self.
 */
export function buildFacetStatsQuery(
   fullParams: Record<string, string | number | boolean>,
   filterDefs: ConfigFilter[] | undefined,
   excludeFilterKey: string,
): Record<string, string | number | boolean> {
   const def = filterDefs?.find((d) => d.key === excludeFilterKey)
   const keysToRemove = def ? queryParamKeysForFilterDef(def) : fallbackParamKeysForExcludeField(excludeFilterKey)
   const out = { ...fullParams }
   for (const k of keysToRemove) {
      delete out[k]
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

/** Default max items when rendering arrays on catalog record cards (e.g. biotypes). */
export const CATALOG_CARD_LIST_MAX_ITEMS = 5

/**
 * Like {@link formatCellValue} but truncates arrays to the first `maxListItems` entries
 * for card UI (comma-separated, with a “(+N more)” suffix). Non-arrays delegate to `formatCellValue`.
 */
export function formatCatalogCardCellValue(
   value: unknown,
   maxListItems: number = CATALOG_CARD_LIST_MAX_ITEMS,
): string {
   if (value === null || value === undefined) return '—'
   if (!Array.isArray(value)) return formatCellValue(value)
   if (value.length === 0) return '—'
   const rest = value.length - maxListItems
   const slice = rest > 0 ? value.slice(0, maxListItems) : value
   const parts = slice.map((item) => {
      if (item === null || item === undefined) return '—'
      if (typeof item === 'object' && !(item instanceof Date)) {
         try {
            return JSON.stringify(item)
         } catch {
            return String(item)
         }
      }
      if (item instanceof Date) return item.toISOString()
      return String(item)
   })
   const joined = parts.join(', ')
   if (rest > 0) return `${joined} … (+${rest} more)`
   return joined
}
