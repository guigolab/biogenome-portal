import { create } from 'zustand'

import { fetchRootTaxon } from '@/lib/api/taxons'
import { fetchRootTreeTable } from '@/lib/api/tree'
import { flattenedTreeToNested, type NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'
import { findSubtree, pruneByRank } from '@/lib/taxonomy/treeFilter'
import {
   parseTreeRow,
   rowToFlatTreeNode,
   type FlatTreeNode,
   type TreeTableRow,
} from '@/lib/taxonomy/treeTableTypes'

type Status = 'idle' | 'loading' | 'success' | 'error'

type TaxonomyTreeState = {
   status: Status
   error: string | null
   /** Full nested tree (may include virtual multi-root). */
   nestedTree: NestedTaxonNode | null
   byTaxid: Map<string, FlatTreeNode>
   /** Raw rows for breadcrumb parent walk */
   rowByTaxid: Map<string, TreeTableRow>
   fetchTree: () => Promise<void>
}

function buildMaps(fields: string[], rows: (string | number | null)[][]) {
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

export const useTaxonomyTreeStore = create<TaxonomyTreeState>((set) => ({
   status: 'idle',
   error: null,
   nestedTree: null,
   byTaxid: new Map(),
   rowByTaxid: new Map(),

   fetchTree: async () => {
      set({ status: 'loading', error: null })
      try {
         const table = await fetchRootTreeTable()
         let preferredRoot: string | null = null
         try {
            const rootDoc = await fetchRootTaxon()
            const t = rootDoc.taxid
            preferredRoot = t != null ? String(t) : null
         } catch {
            preferredRoot = null
         }
         const { tree } = flattenedTreeToNested(table, preferredRoot)
         const { byTaxid, rowByTaxid } = buildMaps(table.fields, table.rows)
         set({
            status: 'success',
            error: null,
            nestedTree: tree,
            byTaxid,
            rowByTaxid,
         })
      } catch (e) {
         const message = e instanceof Error ? e.message : String(e)
         set({
            status: 'error',
            error: message,
            nestedTree: null,
            byTaxid: new Map(),
            rowByTaxid: new Map(),
         })
      }
   },
}))

/**
 * Optional root focus + rank cap on the nested tree.
 * When `rankFilter` is null (“All ranks”), the tree is unchanged: D3 leaves = nodes with no
 * children in this payload (deepest taxa present under each branch), not “stopped at a rank”.
 */
export function getFilteredNestedRoot(
   nestedTree: NestedTaxonNode | null,
   rootTaxid: string | null,
   rankFilter: string | null,
): NestedTaxonNode | null {
   if (!nestedTree) return null
   let t = nestedTree
   if (rootTaxid?.trim()) {
      const sub = findSubtree(t, rootTaxid.trim())
      if (sub) t = sub
   }
   if (rankFilter?.trim()) {
      const pruned = pruneByRank(t, rankFilter.trim())
      if (pruned) t = pruned
   }
   return t
}
