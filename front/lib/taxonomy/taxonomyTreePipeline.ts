/**
 * Centralized taxonomy tree processing pipeline.
 *
 * Single source of truth for all TSV-derived tree operations:
 * - Canonical rank normalization (domain/superkingdom → kingdom)
 * - Strict rank pruning (branches without the target rank are dropped entirely)
 * - Leaf counting, truncation lookup tables, rank presence discovery
 * - Tree map construction (byTaxid / rowByTaxid)
 * - Composite slice builder consumed by the Zustand store
 */
import type { SubtreeLookupResponse } from '@/lib/api/tree'
import type { FlattenedTreeResponse, NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'
import { MAX_TREE_LEAVES } from '@/lib/taxonomy/taxonomyTreeLimits'
import { TREE_RANK_FILTER_OPTIONS } from '@/lib/taxonomy/treeRankOptions'
import {
   parseTreeRow,
   rowToFlatTreeNode,
   type FlatTreeNode,
   type TreeTableRow,
} from '@/lib/taxonomy/treeTableTypes'

// ---------------------------------------------------------------------------
// Tree structural operations
// ---------------------------------------------------------------------------

/** Depth-first search for a node by taxid in the nested tree. */
export function findSubtree(
   node: NestedTaxonNode | null,
   taxid: string,
): NestedTaxonNode | null {
   if (!node) return null
   if (node.taxid === taxid) return node
   for (const child of node.children ?? []) {
      const found = findSubtree(child, taxid)
      if (found) return found
   }
   return null
}

/**
 * Strict rank pruning: keep only nodes whose rank matches `rank` (as leaves),
 * retaining the path from the root to those nodes. Branches that contain no
 * node at the target rank are dropped entirely — no fallback leaf insertion.
 *
 * Returns `null` when no matching nodes exist under `node`.
 */
export function pruneByRankStrict(
   node: NestedTaxonNode | null,
   rank: string,
): NestedTaxonNode | null {
   if (!node) return null

   if (node.rank === rank) {
      return { ...node, children: [] }
   }

   const keptChildren: NestedTaxonNode[] = []
   for (const child of node.children ?? []) {
      const pruned = pruneByRankStrict(child, rank)
      if (pruned !== null) keptChildren.push(pruned)
   }
   if (keptChildren.length === 0) return null
   return { ...node, children: keptChildren }
}

/** Count leaf (tip) nodes in the nested tree — topology-based, not organism count. */
export function countNestedTreeLeaves(node: NestedTaxonNode | null): number {
   if (!node) return 0
   const kids = node.children
   if (!kids?.length) return 1
   return kids.reduce((sum, c) => sum + countNestedTreeLeaves(c), 0)
}

/** Collect all taxids in the subtree rooted at `node` (single DFS pass). */
export function collectTaxidsUnder(node: NestedTaxonNode): Set<string> {
   const out = new Set<string>()
   const walk = (n: NestedTaxonNode) => {
      out.add(n.taxid)
      for (const c of n.children ?? []) walk(c)
   }
   walk(node)
   return out
}

/** Every distinct rank value present in the subtree (including root). */
export function collectRanksPresentInSubtree(root: NestedTaxonNode | null): Set<string> {
   const out = new Set<string>()
   const walk = (n: NestedTaxonNode) => {
      if (n.rank) out.add(n.rank)
      for (const c of n.children ?? []) walk(c)
   }
   if (root) walk(root)
   return out
}

// ---------------------------------------------------------------------------
// Row / map helpers
// ---------------------------------------------------------------------------

/**
 * Filter raw TSV rows to only those taxids present in `taxids`.
 * Uses a direct index lookup instead of a field-scan on every row.
 */
export function filterRowsForTaxids(
   fields: string[],
   rows: (string | number | null)[][],
   taxids: Set<string>,
): (string | number | null)[][] {
   const ti = fields.indexOf('taxid')
   if (ti < 0) return []
   return rows.filter((r) => {
      const id = String(r[ti] ?? '').trim()
      return Boolean(id && taxids.has(id))
   })
}

/** Build `byTaxid` and `rowByTaxid` lookup maps from parsed rows in a single pass. */
export function buildTreeMaps(
   fields: string[],
   rows: (string | number | null)[][],
): { byTaxid: Map<string, FlatTreeNode>; rowByTaxid: Map<string, TreeTableRow> } {
   const byTaxid = new Map<string, FlatTreeNode>()
   const rowByTaxid = new Map<string, TreeTableRow>()
   for (const row of rows) {
      const parsed = parseTreeRow(fields, row)
      if (!parsed) continue
      rowByTaxid.set(parsed.taxid, parsed)
      byTaxid.set(parsed.taxid, rowToFlatTreeNode(parsed))
   }
   return { byTaxid, rowByTaxid }
}

// ---------------------------------------------------------------------------
// Rank truncation lookups
// ---------------------------------------------------------------------------

/**
 * Per-rank leaf counts for the subtree rooted at `root`.
 * Computed using strict pruning so counts reflect only genuine rank-matching nodes.
 */
export function buildTruncationLookups(
   root: NestedTaxonNode,
): Record<string, SubtreeLookupResponse> {
   const taxid = root.taxid
   const out: Record<string, SubtreeLookupResponse> = {}
   for (const rank of TREE_RANK_FILTER_OPTIONS) {
      const pruned = pruneByRankStrict(root, rank)
      out[rank] = {
         taxid,
         rank_level: rank,
         total_nodes: 0,
         total_leaves: countNestedTreeLeaves(pruned),
      }
   }
   return out
}

/** Ranks with at least one leaf after pruning (not capped by MAX_TREE_LEAVES). */
export function ranksWithPositiveLeaves(
   lookups: Record<string, SubtreeLookupResponse | undefined>,
): string[] {
   return TREE_RANK_FILTER_OPTIONS.filter((r) => (lookups[r]?.total_leaves ?? 0) > 0)
}

/** Ranks with at least one leaf AND within the MAX_TREE_LEAVES cap. */
export function allowedRanksFromLookups(
   lookups: Record<string, SubtreeLookupResponse | undefined>,
): string[] {
   return TREE_RANK_FILTER_OPTIONS.filter((r) => {
      const L = lookups[r]?.total_leaves
      return L != null && L > 0 && L <= MAX_TREE_LEAVES
   })
}

/** Rank filter options to show in the UI: present in subtree AND have a positive leaf count. */
export function rankFilterOptionsForSubtree(
   lookups: Record<string, SubtreeLookupResponse | undefined>,
   presentRanks: Set<string>,
): string[] {
   return TREE_RANK_FILTER_OPTIONS.filter(
      (r) => presentRanks.has(r) && (lookups[r]?.total_leaves ?? 0) > 0,
   )
}

/**
 * Pick the best auto-selected rank for display when the tree exceeds MAX_TREE_LEAVES:
 * 1. User-requested rank if valid and within cap.
 * 2. Finest allowed rank (genus → kingdom direction) within cap.
 * 3. Coarsest rank as fallback (signals `usedFallback = true`).
 */
export function pickSubtreeApiRank(
   lookups: Record<string, SubtreeLookupResponse | undefined>,
   requestedRank: string | null | undefined,
): { rank: string; usedFallback: boolean } {
   const allowed = allowedRanksFromLookups(lookups)
   if (requestedRank && lookups[requestedRank]) {
      const L = lookups[requestedRank]!.total_leaves
      if (L > 0 && L <= MAX_TREE_LEAVES) {
         return { rank: requestedRank, usedFallback: false }
      }
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

// ---------------------------------------------------------------------------
// Composite slice builder
// ---------------------------------------------------------------------------

export type TreeSliceResult = {
   nestedSlice: NestedTaxonNode
   byTaxid: Map<string, FlatTreeNode>
   rowByTaxid: Map<string, TreeTableRow>
   lookupByRank: Record<string, SubtreeLookupResponse>
   /** Topology leaf count (tip nodes in unfiltered slice — not organism count). */
   topologyLeafCount: number
   /** Auto-selected rank when slice exceeds MAX_TREE_LEAVES; null means show all leaves. */
   apiRankLevel: string | null
   /** True when the auto-selected rank was a last-resort fallback (warning to show in UI). */
   subtreeWarning: boolean
}

/**
 * Build all derived state for a tree root in a single pass.
 *
 * Returns `null` when `rootTaxid` is not found in `fullNested`.
 */
export function buildTreeSlice(
   table: FlattenedTreeResponse,
   fullNested: NestedTaxonNode,
   rootTaxid: string,
   opts?: { requestedRank?: string | null },
): TreeSliceResult | null {
   const nestedSlice = findSubtree(fullNested, rootTaxid)
   if (!nestedSlice) return null

   const taxids = collectTaxidsUnder(nestedSlice)
   const sliceRows = filterRowsForTaxids(table.fields, table.rows, taxids)
   const { byTaxid, rowByTaxid } = buildTreeMaps(table.fields, sliceRows)

   const lookupByRank = buildTruncationLookups(nestedSlice)
   const topologyLeafCount = countNestedTreeLeaves(nestedSlice)

   let apiRankLevel: string | null = null
   let subtreeWarning = false
   if (topologyLeafCount > MAX_TREE_LEAVES) {
      const picked = pickSubtreeApiRank(lookupByRank, opts?.requestedRank ?? null)
      apiRankLevel = picked.rank
      subtreeWarning = picked.usedFallback
   }

   return {
      nestedSlice,
      byTaxid,
      rowByTaxid,
      lookupByRank,
      topologyLeafCount,
      apiRankLevel,
      subtreeWarning,
   }
}
