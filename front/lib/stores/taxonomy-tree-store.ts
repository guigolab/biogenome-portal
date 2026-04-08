import { create } from 'zustand'

import { fetchTaxon } from '@/lib/api/taxon'
import {
   fetchRootTreeTable,
   fetchSubtreeLookup,
   fetchSubtreeTreeTable,
   type SubtreeLookupResponse,
} from '@/lib/api/tree'
import { fetchRootTaxon } from '@/lib/api/taxons'
import { flattenedTreeToNested, type NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'
import { pruneByRank } from '@/lib/taxonomy/treeFilter'
import { TREE_RANK_FILTER_OPTIONS } from '@/lib/taxonomy/treeRankOptions'
import {
   countNestedTreeLeaves,
   pickSubtreeApiRank,
} from '@/lib/taxonomy/taxonomyTreeLoad'
import { MAX_TREE_LEAVES } from '@/lib/taxonomy/taxonomyTreeLimits'
import {
   parseTreeRow,
   rowToFlatTreeNode,
   type FlatTreeNode,
   type TreeTableRow,
} from '@/lib/taxonomy/treeTableTypes'

type Status = 'idle' | 'loading' | 'success' | 'error'

export type TaxonomyLoadMode = 'full' | 'subtree'

type TaxonomyTreeState = {
   status: Status
   error: string | null
   nestedTree: NestedTaxonNode | null
   byTaxid: Map<string, FlatTreeNode>
   rowByTaxid: Map<string, TreeTableRow>

   /** Root taxid used for the current payload (URL `root` or portal root). */
   treeRootTaxid: string | null
   /** Display name for `treeRootTaxid` (from taxon document). */
   rootScientificName: string | null
   /** Portal root from API (``ROOT_NODE`` / ``GET /taxons/root``). */
   portalRootTaxid: string | null
   loadMode: TaxonomyLoadMode
   /** Subtree truncation rank when `loadMode === 'subtree'`. */
   apiRankLevel: string | null
   lookupByRank: Record<string, SubtreeLookupResponse>
   subtreeWarning: boolean

   loadTree: (rootTaxid: string, opts?: { requestedRank?: string | null }) => Promise<void>
}

async function fetchAllRankLookups(
   rootTaxid: string,
   myGen: number,
): Promise<Record<string, SubtreeLookupResponse>> {
   const lookupByRank: Record<string, SubtreeLookupResponse> = {}
   await Promise.all(
      TREE_RANK_FILTER_OPTIONS.map(async (rank) => {
         try {
            const L = await fetchSubtreeLookup(rootTaxid, rank)
            if (myGen !== loadGeneration) return
            lookupByRank[rank] = L
         } catch {
            /* skip */
         }
      }),
   )
   return lookupByRank
}

function rootDisplayNameFromDoc(doc: Record<string, unknown>): string | null {
   const s = doc.scientific_name
   const n = doc.name
   if (typeof s === 'string' && s.trim()) return s.trim()
   if (typeof n === 'string' && n.trim()) return n.trim()
   return null
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

let loadGeneration = 0

export const useTaxonomyTreeStore = create<TaxonomyTreeState>((set) => ({
   status: 'idle',
   error: null,
   nestedTree: null,
   byTaxid: new Map(),
   rowByTaxid: new Map(),
   treeRootTaxid: null,
   rootScientificName: null,
   portalRootTaxid: null,
   loadMode: 'full',
   apiRankLevel: null,
   lookupByRank: {},
   subtreeWarning: false,

   loadTree: async (rootTaxid: string, opts?: { requestedRank?: string | null }) => {
      const root = rootTaxid.trim()
      if (!root) {
         set({
            status: 'error',
            error: 'Missing tree root taxid',
            nestedTree: null,
            byTaxid: new Map(),
            rowByTaxid: new Map(),
            treeRootTaxid: null,
            rootScientificName: null,
            portalRootTaxid: null,
            loadMode: 'full',
            apiRankLevel: null,
            lookupByRank: {},
            subtreeWarning: false,
         })
         return
      }

      const myGen = ++loadGeneration
      set({ status: 'loading', error: null })

      try {
         const portalDoc = await fetchRootTaxon()
         if (myGen !== loadGeneration) return
         const portalId = String(portalDoc.taxid ?? '').trim()
         if (!portalId) {
            throw new Error('Portal root taxon missing taxid')
         }

         const rootDoc = root === portalId ? portalDoc : await fetchTaxon(root)
         if (myGen !== loadGeneration) return

         const orgCount =
            typeof rootDoc.organisms_count === 'number'
               ? rootDoc.organisms_count
               : Number(rootDoc.organisms_count) || 0

         const isPortalRoot = root === portalId

         const rootName = rootDisplayNameFromDoc(rootDoc)

         const runSubtree = async () => {
            const lookupByRank = await fetchAllRankLookups(root, myGen)
            if (myGen !== loadGeneration) return

            const { rank, usedFallback } = pickSubtreeApiRank(lookupByRank, opts?.requestedRank ?? null)
            const table = await fetchSubtreeTreeTable(root, rank)
            if (myGen !== loadGeneration) return

            const { tree } = flattenedTreeToNested(table, root)
            const maps = buildMaps(table.fields, table.rows)
            set({
               status: 'success',
               error: null,
               nestedTree: tree,
               ...maps,
               treeRootTaxid: root,
               rootScientificName: rootName,
               portalRootTaxid: portalId,
               loadMode: 'subtree',
               apiRankLevel: rank,
               lookupByRank,
               subtreeWarning: usedFallback,
            })
         }

         if (isPortalRoot && orgCount <= MAX_TREE_LEAVES) {
            const table = await fetchRootTreeTable()
            if (myGen !== loadGeneration) return
            const { tree } = flattenedTreeToNested(table, portalId)
            const leaves = countNestedTreeLeaves(tree)
            if (leaves <= MAX_TREE_LEAVES) {
               const maps = buildMaps(table.fields, table.rows)
               set({
                  status: 'success',
                  error: null,
                  nestedTree: tree,
                  ...maps,
                  treeRootTaxid: root,
                  rootScientificName: rootName,
                  portalRootTaxid: portalId,
                  loadMode: 'full',
                  apiRankLevel: null,
                  lookupByRank: {},
                  subtreeWarning: false,
               })
               void fetchAllRankLookups(root, myGen).then((lookups) => {
                  if (myGen !== loadGeneration) return
                  set((prev) => ({ ...prev, lookupByRank: lookups }))
               })
               return
            }
         }

         await runSubtree()
      } catch (e) {
         if (myGen !== loadGeneration) return
         const message = e instanceof Error ? e.message : String(e)
         set({
            status: 'error',
            error: message,
            nestedTree: null,
            byTaxid: new Map(),
            rowByTaxid: new Map(),
            treeRootTaxid: root,
            rootScientificName: null,
            portalRootTaxid: null,
            loadMode: 'full',
            apiRankLevel: null,
            lookupByRank: {},
            subtreeWarning: false,
         })
      }
   },
}))

/**
 * Rank filter applies only in `full` mode (client prune). Subtree mode is already truncated server-side.
 */
export function getDisplayNestedRoot(
   nestedTree: NestedTaxonNode | null,
   rankFilter: string | null,
   loadMode: TaxonomyLoadMode,
): NestedTaxonNode | null {
   if (!nestedTree) return null
   if (loadMode === 'subtree') return nestedTree
   if (rankFilter?.trim()) {
      const pruned = pruneByRank(nestedTree, rankFilter.trim())
      return pruned ?? nestedTree
   }
   return nestedTree
}
