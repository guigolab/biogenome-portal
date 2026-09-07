import { create } from 'zustand'

import type { TaxonRecord } from '@/lib/api/taxon'

type TaxonomyTreeExpansionState = {
   expandedNodes: Set<string>
   childrenData: Map<string, TaxonRecord[]>
   /** In-flight fetches, shared so concurrently mounted tree instances don't double-fetch the same node. */
   fetchingNodes: Set<string>
   expandNode: (taxid: string) => void
   toggleNode: (taxid: string) => void
   setChildren: (taxid: string, children: TaxonRecord[]) => void
   setFetching: (taxid: string, fetching: boolean) => void
}

export const useTaxonomyTreeExpansionStore = create<TaxonomyTreeExpansionState>((set) => ({
   expandedNodes: new Set(),
   childrenData: new Map(),
   fetchingNodes: new Set(),
   expandNode: (taxid) =>
      set((s) => (s.expandedNodes.has(taxid) ? s : { expandedNodes: new Set(s.expandedNodes).add(taxid) })),
   toggleNode: (taxid) =>
      set((s) => {
         const next = new Set(s.expandedNodes)
         if (next.has(taxid)) next.delete(taxid)
         else next.add(taxid)
         return { expandedNodes: next }
      }),
   setChildren: (taxid, children) =>
      set((s) => {
         const next = new Map(s.childrenData)
         next.set(taxid, children)
         return { childrenData: next }
      }),
   setFetching: (taxid, fetching) =>
      set((s) => {
         const next = new Set(s.fetchingNodes)
         if (fetching) next.add(taxid)
         else next.delete(taxid)
         return { fetchingNodes: next }
      }),
}))
