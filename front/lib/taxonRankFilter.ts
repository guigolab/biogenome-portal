/** Ordered rank groups for species explorer (aligned with TaxonRanks / NCBI-style ranks). */
export type RankGroupDef = {
   id: string
   label: string
   /** API `rank` or `rank__in` values (comma-separated for __in). */
   apiRankParam: { key: 'rank' | 'rank__in'; value: string }
}

export const SPECIES_RANK_GROUPS: RankGroupDef[] = [
   {
      id: 'domain_kingdom',
      label: 'Kingdom',
      apiRankParam: { key: 'rank', value: 'kingdom' },
   },
   { id: 'phylum', label: 'Phylum', apiRankParam: { key: 'rank', value: 'phylum' } },
   { id: 'class', label: 'Class', apiRankParam: { key: 'rank', value: 'class' } },
   { id: 'order', label: 'Order', apiRankParam: { key: 'rank', value: 'order' } },
   { id: 'family', label: 'Family', apiRankParam: { key: 'rank', value: 'family' } },
   { id: 'genus', label: 'Genus', apiRankParam: { key: 'rank', value: 'genus' } },
]

/** Tailwind classes for rank toggle buttons: inactive vs selected. */
export const RANK_GROUP_TOGGLE_STYLES: Record<
   string,
   { ring: string; active: string; inactive: string; badge: string }
> = {
   domain_kingdom: {
      ring: 'ring-violet-500/80',
      active: 'border-violet-500 bg-violet-500/15 text-violet-950 dark:text-violet-100',
      inactive:
         'border-violet-200/80 bg-violet-500/5 text-violet-900 hover:bg-violet-500/10 dark:border-violet-500/30 dark:text-violet-100',
      badge: 'bg-violet-600/20 text-violet-900 dark:text-violet-100',
   },
   phylum: {
      ring: 'ring-cyan-500/80',
      active: 'border-cyan-500 bg-cyan-500/15 text-cyan-950 dark:text-cyan-100',
      inactive:
         'border-cyan-200/80 bg-cyan-500/5 text-cyan-900 hover:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-100',
      badge: 'bg-cyan-600/20 text-cyan-900 dark:text-cyan-100',
   },
   class: {
      ring: 'ring-blue-500/80',
      active: 'border-blue-500 bg-blue-500/15 text-blue-950 dark:text-blue-100',
      inactive:
         'border-blue-200/80 bg-blue-500/5 text-blue-900 hover:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-100',
      badge: 'bg-blue-600/20 text-blue-900 dark:text-blue-100',
   },
   order: {
      ring: 'ring-amber-500/80',
      active: 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-100',
      inactive:
         'border-amber-200/80 bg-amber-500/5 text-amber-900 hover:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-100',
      badge: 'bg-amber-600/20 text-amber-900 dark:text-amber-100',
   },
   family: {
      ring: 'ring-rose-500/80',
      active: 'border-rose-500 bg-rose-500/15 text-rose-950 dark:text-rose-100',
      inactive:
         'border-rose-200/80 bg-rose-500/5 text-rose-900 hover:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-100',
      badge: 'bg-rose-600/20 text-rose-900 dark:text-rose-100',
   },
   genus: {
      ring: 'ring-emerald-500/80',
      active: 'border-emerald-500 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100',
      inactive:
         'border-emerald-200/80 bg-emerald-500/5 text-emerald-900 hover:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-100',
      badge: 'bg-emerald-600/20 text-emerald-900 dark:text-emerald-100',
   },
}

/**
 * Plain text colors for lineage on species cards (no chip chrome).
 * ``label`` = rank name; ``name`` = scientific name at that rank.
 */
export const RANK_GROUP_LINEAGE_TEXT: Record<string, { label: string; name: string }> = {
   domain_kingdom: {
      label: 'text-violet-600 dark:text-violet-400',
      name: 'text-violet-950 dark:text-violet-100',
   },
   phylum: {
      label: 'text-cyan-600 dark:text-cyan-400',
      name: 'text-cyan-950 dark:text-cyan-100',
   },
   class: {
      label: 'text-blue-600 dark:text-blue-400',
      name: 'text-blue-950 dark:text-blue-100',
   },
   order: {
      label: 'text-amber-700 dark:text-amber-400',
      name: 'text-amber-950 dark:text-amber-100',
   },
   family: {
      label: 'text-rose-600 dark:text-rose-400',
      name: 'text-rose-950 dark:text-rose-100',
   },
   genus: {
      label: 'text-emerald-600 dark:text-emerald-400',
      name: 'text-emerald-950 dark:text-emerald-100',
   },
}

/** Merge stats keys case-insensitively into lowercase keys. */
export function normalizeRankStats(raw: Record<string, number>): Record<string, number> {
   const out: Record<string, number> = {}
   for (const [k, v] of Object.entries(raw)) {
      const key = k.toLowerCase()
      out[key] = (out[key] ?? 0) + v
   }
   return out
}

/** Whether a rank group has any taxa according to /stats/taxons/rank. */
export function rankGroupHasData(groupId: string, stats: Record<string, number>): boolean {
   switch (groupId) {
      case 'domain_kingdom':
         return (stats.kingdom ?? 0) > 0
      case 'phylum':
         return (stats.phylum ?? 0) > 0
      case 'class':
         return (stats.class ?? 0) > 0
      case 'order':
         return (stats.order ?? 0) > 0
      case 'family':
         return (stats.family ?? 0) > 0
      case 'genus':
         return (stats.genus ?? 0) > 0
      default:
         return false
   }
}

/**
 * Ordered lineage segments for cards: API field on ``lineage_rank_labels`` → filter rank color key.
 * Order is coarse → fine (kingdom … genus); matches taxonomy display convention.
 */
export const LINEAGE_RANK_CARD_SEGMENTS: readonly {
   apiField: 'kingdom' | 'phylum' | 'class_name' | 'order' | 'family' | 'genus'
   styleKey: keyof typeof RANK_GROUP_TOGGLE_STYLES
}[] = [
   { apiField: 'kingdom', styleKey: 'domain_kingdom' },
   { apiField: 'phylum', styleKey: 'phylum' },
   { apiField: 'class_name', styleKey: 'class' },
   { apiField: 'order', styleKey: 'order' },
   { apiField: 'family', styleKey: 'family' },
   { apiField: 'genus', styleKey: 'genus' },
] as const

export type LineageRankPill = {
   apiField: (typeof LINEAGE_RANK_CARD_SEGMENTS)[number]['apiField']
   styleKey: (typeof LINEAGE_RANK_CARD_SEGMENTS)[number]['styleKey']
   name: string
}

/** Non-empty lineage pills in display order from ``organism.lineage_rank_labels``. */
export function lineageRankPillsFromOrganism(organism: Record<string, unknown>): LineageRankPill[] {
   const raw = organism.lineage_rank_labels
   if (!raw || typeof raw !== 'object') return []
   const labels = raw as Record<string, unknown>
   const out: LineageRankPill[] = []
   for (const { apiField, styleKey } of LINEAGE_RANK_CARD_SEGMENTS) {
      const v = labels[apiField]
      if (typeof v !== 'string') continue
      const name = v.trim()
      if (!name) continue
      out.push({ apiField, styleKey, name })
   }
   return out
}

/** Count of taxon nodes at this rank (domain/kingdom merged). */
export function rankGroupDisplayCount(groupId: string, stats: Record<string, number>): number {
   switch (groupId) {
      case 'domain_kingdom':
         return stats.kingdom ?? 0
      case 'phylum':
         return stats.phylum ?? 0
      case 'class':
         return stats.class ?? 0
      case 'order':
         return stats.order ?? 0
      case 'family':
         return stats.family ?? 0
      case 'genus':
         return stats.genus ?? 0
      default:
         return 0
   }
}
