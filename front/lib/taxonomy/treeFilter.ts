/**
 * Structural tree operations.
 *
 * `findSubtree` lives here; `pruneByRank` is the strict implementation from
 * the central pipeline (re-exported for backward compatibility).
 */
import { pruneByRankStrict } from '@/lib/taxonomy/taxonomyTreePipeline'
import type { NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'

export { findSubtree } from '@/lib/taxonomy/taxonomyTreePipeline'

/**
 * Prune tree to nodes at `rank` only (strict: branches without a matching
 * descendant are dropped entirely).  Re-exported under the legacy name so
 * existing call sites keep working without changes.
 */
export function pruneByRank(
   node: NestedTaxonNode | null,
   rank: string,
): NestedTaxonNode | null {
   return pruneByRankStrict(node, rank)
}
