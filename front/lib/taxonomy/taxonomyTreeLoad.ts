import type { SubtreeLookupResponse } from '@/lib/api/tree'
import { MAX_TREE_LEAVES } from '@/lib/taxonomy/taxonomyTreeLimits'
import { TREE_RANK_FILTER_OPTIONS } from '@/lib/taxonomy/treeRankOptions'
import type { NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'

/** Count leaf nodes (no children) in nested taxonomy tree. */
export function countNestedTreeLeaves(node: NestedTaxonNode | null): number {
   if (!node) return 0
   const kids = node.children
   if (!kids?.length) return 1
   return kids.reduce((sum, c) => sum + countNestedTreeLeaves(c), 0)
}

export function allowedRanksFromLookups(
   lookups: Record<string, SubtreeLookupResponse | undefined>,
): string[] {
   return TREE_RANK_FILTER_OPTIONS.filter((r) => {
      const L = lookups[r]?.total_leaves
      return L != null && L <= MAX_TREE_LEAVES
   })
}

/**
 * Pick API rank: user override if valid; else finest rank (species → domain) under leaf cap;
 * else coarsest fallback (domain).
 */
export function pickSubtreeApiRank(
   lookups: Record<string, SubtreeLookupResponse | undefined>,
   requestedRank: string | null | undefined,
): { rank: string; usedFallback: boolean } {
   const allowed = allowedRanksFromLookups(lookups)
   const norm = requestedRank?.trim().toLowerCase()
   if (norm && lookups[norm] && lookups[norm]!.total_leaves <= MAX_TREE_LEAVES) {
      return { rank: norm, usedFallback: false }
   }
   for (let i = TREE_RANK_FILTER_OPTIONS.length - 1; i >= 0; i--) {
      const r = TREE_RANK_FILTER_OPTIONS[i]
      if (allowed.includes(r)) {
         return { rank: r, usedFallback: false }
      }
   }
   const coarsest = TREE_RANK_FILTER_OPTIONS[0]
   return { rank: coarsest, usedFallback: true }
}
