/** Matches biogenome-client `Tree.vue` RANKS for radial rank filter. */
export const TREE_RANK_FILTER_OPTIONS = [
   'domain',
   'kingdom',
   'phylum',
   'subphylum',
   'class',
   'subclass',
   'order',
   'superorder',
   'family',
   'genus',
   'species',
] as const

export type TreeRankFilterValue = (typeof TREE_RANK_FILTER_OPTIONS)[number]

export function formatRankFilterLabel(rank: string): string {
   if (!rank.trim()) return ''
   return rank
      .split(/[\s_]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
}
