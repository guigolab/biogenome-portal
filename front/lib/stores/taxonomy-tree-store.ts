import { create } from 'zustand'

import { fetchTaxon } from '@/lib/api/taxon'
import { fetchRootTreeTsv, type SubtreeLookupResponse } from '@/lib/api/tree'
import { useRootTaxonStore } from '@/stores/root-taxon-store'
import {
   flattenedTreeToNested,
   type FlattenedTreeResponse,
   type NestedTaxonNode,
} from '@/lib/taxonomy/flattenedTreeToNested'
import { pruneByRank } from '@/lib/taxonomy/treeFilter'
import {
   buildTreeSlice,
} from '@/lib/taxonomy/taxonomyTreePipeline'
import type { FlatTreeNode, TreeTableRow } from '@/lib/taxonomy/treeTableTypes'

type Status = 'idle' | 'loading' | 'success' | 'error'

let loadGeneration = 0

let fullTableCache: FlattenedTreeResponse | null = null
let fullNestedCache: NestedTaxonNode | null = null
let fullCachePortalId: string | null = null

function rootDisplayNameFromDoc(doc: Record<string, unknown>): string | null {
   const s = doc.scientific_name
   const n = doc.name
   if (typeof s === 'string' && s.trim()) return s.trim()
   if (typeof n === 'string' && n.trim()) return n.trim()
   return null
}

async function ensureFullPortalTree(
   portalId: string,
   myGen: number,
): Promise<{ table: FlattenedTreeResponse; fullNested: NestedTaxonNode } | null> {
   if (fullTableCache && fullNestedCache && fullCachePortalId === portalId) {
      return { table: fullTableCache, fullNested: fullNestedCache }
   }
   const table = await fetchRootTreeTsv()
   if (myGen !== loadGeneration) return null
   const { tree } = flattenedTreeToNested(table, portalId)
   if (myGen !== loadGeneration) return null
   fullTableCache = table
   fullNestedCache = tree
   fullCachePortalId = portalId
   return { table, fullNested: tree }
}

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
   /**
    * Default truncation rank when the subtree has more than MAX_TREE_LEAVES tip
    * nodes (finest rank under cap).  `null` means default to "all leaves".
    */
   apiRankLevel: string | null
   lookupByRank: Record<string, SubtreeLookupResponse>
   subtreeWarning: boolean
   /** Topology leaf count: tip nodes in the unfiltered slice (not organism count). */
   topologyLeafCount: number

   loadTree: (rootTaxid: string, opts?: { requestedRank?: string | null }) => Promise<void>
}

export const useTaxonomyTreeStore = create<TaxonomyTreeState>((set) => ({
   status: 'idle',
   error: null,
   nestedTree: null,
   byTaxid: new Map(),
   rowByTaxid: new Map(),
   treeRootTaxid: null,
   rootScientificName: null,
   portalRootTaxid: null,
   apiRankLevel: null,
   lookupByRank: {},
   subtreeWarning: false,
   topologyLeafCount: 0,

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
            apiRankLevel: null,
            lookupByRank: {},
            subtreeWarning: false,
            topologyLeafCount: 0,
         })
         return
      }

      const myGen = ++loadGeneration
      set({ status: 'loading', error: null, lookupByRank: {} })

      try {
         await useRootTaxonStore.getState().loadRootTaxon()
         if (myGen !== loadGeneration) return

         const portalDoc = useRootTaxonStore.getState().rootTaxon
         if (!portalDoc) {
            throw new Error('Portal root taxon unavailable')
         }
         const portalId = String(portalDoc.taxid ?? '').trim()
         if (!portalId) {
            throw new Error('Portal root taxon missing taxid')
         }

         const rootDoc = root === portalId ? portalDoc : await fetchTaxon(root)
         if (myGen !== loadGeneration) return

         const rootName = rootDisplayNameFromDoc(rootDoc as Record<string, unknown>)

         const got = await ensureFullPortalTree(portalId, myGen)
         if (myGen !== loadGeneration) return
         if (!got) return

         const { table, fullNested } = got
         const slice = buildTreeSlice(table, fullNested, root, opts)
         if (!slice) {
            throw new Error(
               `Taxon ${root} is not in the loaded portal taxonomy table (wrong root or stale data).`,
            )
         }

         set({
            status: 'success',
            error: null,
            nestedTree: slice.nestedSlice,
            byTaxid: slice.byTaxid,
            rowByTaxid: slice.rowByTaxid,
            treeRootTaxid: root,
            rootScientificName: rootName,
            portalRootTaxid: portalId,
            apiRankLevel: slice.apiRankLevel,
            lookupByRank: slice.lookupByRank,
            subtreeWarning: slice.subtreeWarning,
            topologyLeafCount: slice.topologyLeafCount,
         })
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
            apiRankLevel: null,
            lookupByRank: {},
            subtreeWarning: false,
            topologyLeafCount: 0,
         })
      }
   },
}))

/** Client-side rank filter (`pruneByRank`) on the in-memory slice. */
export function getDisplayNestedRoot(
   nestedTree: NestedTaxonNode | null,
   rankFilter: string | null,
): NestedTaxonNode | null {
   if (!nestedTree) return null
   if (rankFilter?.trim()) {
      const pruned = pruneByRank(nestedTree, rankFilter.trim())
      return pruned ?? nestedTree
   }
   return nestedTree
}
