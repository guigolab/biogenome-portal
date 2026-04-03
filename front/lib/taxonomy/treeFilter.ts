import type { NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'

export function findSubtree(node: NestedTaxonNode | null, taxid: string): NestedTaxonNode | null {
   if (!node) return null
   if (node.taxid === taxid) return node
   for (const child of node.children ?? []) {
      const found = findSubtree(child, taxid)
      if (found) return found
   }
   return null
}

function normalizeRank(rank: string): string {
   return rank.trim().toLowerCase().replace(/\s+/g, '_')
}

/** Prune tree so that at each level we prefer stopping at nodes matching `rank` (Vue parity). */
export function pruneByRank(node: NestedTaxonNode | null, rank: string): NestedTaxonNode | null {
   if (!node) return node
   const want = normalizeRank(rank)
   const cloned: NestedTaxonNode = {
      ...node,
      children: [],
   }
   for (const child of node.children ?? []) {
      if (normalizeRank(child.rank) === want) {
         cloned.children!.push({ ...child, children: [] })
      } else {
         const pruned = pruneByRank(child, rank)
         if (pruned && ((pruned.children?.length ?? 0) > 0 || normalizeRank(pruned.rank) === want)) {
            cloned.children!.push(pruned)
         } else {
            cloned.children!.push({ ...child, children: [] })
         }
      }
   }
   return cloned
}
