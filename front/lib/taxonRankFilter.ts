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

/**
 * Rank toggle chrome: rotate portal `primary` / `secondary` / `accent`, with a second
 * “soft” intensity (lighter border/background) so six ranks stay distinct without fixed hues.
 */
export const RANK_GROUP_TOGGLE_STYLES: Record<
   string,
   { ring: string; active: string; inactive: string; badge: string }
> = {
   domain_kingdom: {
      ring: 'ring-primary/80',
      active: 'border-primary bg-primary/15 text-primary',
      inactive:
         'border-primary/40 bg-primary/[0.06] text-foreground hover:bg-primary/10 dark:border-primary/35',
      badge: 'bg-primary/20 text-primary',
   },
   phylum: {
      ring: 'ring-secondary/80',
      active: 'border-secondary bg-secondary/15 text-secondary',
      inactive:
         'border-secondary/40 bg-secondary/[0.06] text-foreground hover:bg-secondary/10 dark:border-secondary/35',
      badge: 'bg-secondary/20 text-secondary',
   },
   class: {
      ring: 'ring-accent/80',
      active: 'border-accent bg-accent/15 text-accent',
      inactive:
         'border-accent/40 bg-accent/[0.06] text-foreground hover:bg-accent/10 dark:border-accent/35',
      badge: 'bg-accent/20 text-accent',
   },
   order: {
      ring: 'ring-primary/55',
      active: 'border-primary/90 bg-primary/10 text-primary',
      inactive:
         'border-primary/30 bg-primary/[0.04] text-foreground/95 hover:bg-primary/[0.08] dark:border-primary/25',
      badge: 'bg-primary/15 text-primary',
   },
   family: {
      ring: 'ring-secondary/55',
      active: 'border-secondary/90 bg-secondary/10 text-secondary',
      inactive:
         'border-secondary/30 bg-secondary/[0.04] text-foreground/95 hover:bg-secondary/[0.08] dark:border-secondary/25',
      badge: 'bg-secondary/15 text-secondary',
   },
   genus: {
      ring: 'ring-accent/55',
      active: 'border-accent/90 bg-accent/10 text-accent',
      inactive:
         'border-accent/30 bg-accent/[0.04] text-foreground/95 hover:bg-accent/[0.08] dark:border-accent/25',
      badge: 'bg-accent/15 text-accent',
   },
}

/**
 * Plain text colors for lineage on species cards (no chip chrome).
 * ``label`` = rank name; ``name`` = scientific name at that rank.
 */
export const RANK_GROUP_LINEAGE_TEXT: Record<string, { label: string; name: string }> = {
   domain_kingdom: {
      label: 'text-primary/70',
      name: 'text-primary',
   },
   phylum: {
      label: 'text-secondary/70',
      name: 'text-secondary',
   },
   class: {
      label: 'text-accent/70',
      name: 'text-accent',
   },
   order: {
      label: 'text-primary/60',
      name: 'text-primary/90',
   },
   family: {
      label: 'text-secondary/60',
      name: 'text-secondary/90',
   },
   genus: {
      label: 'text-accent/60',
      name: 'text-accent/90',
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
