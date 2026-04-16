/**
 * Ranks available in the taxonomy tree rank filter (coarse → fine).
 * Species-level detail is shown via “All leaves” (no rank truncation).
 */
export const TREE_RANK_FILTER_OPTIONS = [
   'kingdom',
   'phylum',
   'class',
   'order',
   'family',
   'genus',
] as const

export type TreeRankFilterValue = (typeof TREE_RANK_FILTER_OPTIONS)[number]

export function formatRankFilterLabel(rank: string): string {
   if (!rank.trim()) return ''
   return rank
      .split(/[\s_]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
}
