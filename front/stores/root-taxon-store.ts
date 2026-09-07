import { create } from 'zustand'

import { fetchRootTaxon } from '@/lib/api/taxons'

export type RootTaxonCounts = {
   assemblies_count: number
   biosamples_count: number
   reads_count: number
}

function countField(node: Record<string, unknown> | null, key: string): number {
   if (!node) return 0
   const raw = node[key]
   const n = typeof raw === 'number' ? raw : Number(raw)
   return Number.isFinite(n) ? n : 0
}

export function taxonNodeCatalogCounts(node: Record<string, unknown> | null): RootTaxonCounts {
   return {
      assemblies_count: countField(node, 'assemblies_count'),
      biosamples_count: countField(node, 'biosamples_count'),
      reads_count: countField(node, 'reads_count'),
   }
}

type RootTaxonState = {
   rootTaxon: Record<string, unknown> | null
   status: 'idle' | 'loading' | 'success' | 'error'
   error: string | null
   loadRootTaxon: () => Promise<void>
}

export const useRootTaxonStore = create<RootTaxonState>((set, get) => ({
   rootTaxon: null,
   status: 'idle',
   error: null,
   loadRootTaxon: async () => {
      if (get().status === 'loading' || get().status === 'success') return
      set({ status: 'loading', error: null })
      try {
         const rootTaxon = await fetchRootTaxon()
         set({ rootTaxon, status: 'success', error: null })
      } catch (e: unknown) {
         const message = e instanceof Error ? e.message : String(e)
         set({ rootTaxon: null, status: 'error', error: message })
      }
   },
}))
