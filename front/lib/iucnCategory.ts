import { cn } from '@/lib/utils'

/** Matches server ``stats.NO_VALUE_KEY`` for missing IUCN category in field stats. */
export const IUCN_STATS_NO_ENTRY = 'No Entry'

/** True when field stats only bucket missing IUCN (no real categories to filter by). */
export function iucnFieldStatsOnlyNoEntry(stats: Record<string, number> | null): boolean {
   if (stats == null) return false
   const keys = Object.keys(stats)
   if (keys.length === 0) return true
   return keys.length === 1 && keys[0] === IUCN_STATS_NO_ENTRY
}

const IUCN_LABELS: Record<string, string> = {
   EX: 'Extinct',
   EW: 'Extinct in the Wild',
   CR: 'Critically Endangered',
   EN: 'Endangered',
   VU: 'Vulnerable',
   NT: 'Near Threatened',
   LC: 'Least Concern',
   DD: 'Data Deficient',
   NE: 'Not Evaluated',
}

/** Sort order for threat dropdowns (unknown codes sort after these). */
export const IUCN_CATEGORY_SORT_ORDER = [
   'EX',
   'EW',
   'CR',
   'EN',
   'VU',
   'NT',
   'LC',
   'DD',
   'NE',
   IUCN_STATS_NO_ENTRY,
] as const

function normalizeCategory(raw: string): string {
   const u = raw.trim().toUpperCase()
   if (IUCN_LABELS[u]) return u
   const alnum = u.replace(/[^A-Z]/g, '')
   if (IUCN_LABELS[alnum]) return alnum
   return u
}

/** Tailwind classes for IUCN threat badge (readable on light + dark). */
export function iucnCategoryBadgeClass(category: string): string {
   const c = normalizeCategory(category)
   switch (c) {
      case 'EX':
      case 'EW':
         return 'border-zinc-800 bg-zinc-900 text-zinc-50 dark:bg-zinc-950'
      case 'CR':
         return 'border-red-700 bg-red-700 text-white dark:bg-red-800'
      case 'EN':
         return 'border-orange-600 bg-orange-600 text-white dark:bg-orange-700'
      case 'VU':
         return 'border-amber-500 bg-amber-500 text-amber-950 dark:bg-amber-600 dark:text-amber-950'
      case 'NT':
         return 'border-lime-600 bg-lime-500/90 text-lime-950 dark:bg-lime-600'
      case 'LC':
         return 'border-emerald-600 bg-emerald-600 text-white dark:bg-emerald-700'
      case 'DD':
      case 'NE':
      default:
         return 'border-muted-foreground/40 bg-muted text-muted-foreground'
   }
}

export type IucnBadgeInfo = { code: string; title: string; className: string }

/**
 * Build IUCN badge from ``organism.iucn_redlist`` (API / Mongo shape).
 */
export function iucnRedListBadge(organism: Record<string, unknown>): IucnBadgeInfo | null {
   const rl = organism.iucn_redlist
   if (!rl || typeof rl !== 'object') return null
   const o = rl as Record<string, unknown>
   if (o.not_found === true) {
      return null
   }
   const cat = o.category
   if (typeof cat !== 'string' || !cat.trim()) return null
   const code = normalizeCategory(cat)
   const title = IUCN_LABELS[code] ? `${code} — ${IUCN_LABELS[code]}` : code
   return {
      code,
      title,
      className: cn('border', iucnCategoryBadgeClass(code)),
   }
}

export { IUCN_LABELS }

export function sortIucnThreatStatEntries(entries: [string, number][]): [string, number][] {
   const order = IUCN_CATEGORY_SORT_ORDER as readonly string[]
   const idx = new Map(order.map((k, i) => [k, i]))
   const tail = order.length
   return [...entries].sort(([a], [b]) => {
      const oa = idx.has(a) ? idx.get(a)! : tail
      const ob = idx.has(b) ? idx.get(b)! : tail
      if (oa !== ob) return oa - ob
      return a.localeCompare(b)
   })
}

/** Label for stats keys / filter chips (includes "No assessment" for missing category). */
export function labelIucnThreatOption(key: string): string {
   if (key === IUCN_STATS_NO_ENTRY) return 'No assessment'
   const full = IUCN_LABELS[key]
   return full ? `${key} — ${full}` : key
}

