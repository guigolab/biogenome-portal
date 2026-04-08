'use client'

import { useEffect, useState } from 'react'

import { fetchFieldStats } from '@/lib/api/stats'
import type { ConfigFilter, DataModels } from '@/lib/portal/types'

/**
 * Loads distinct option keys for `select` filter fields from field stats API.
 */
export function useCatalogFilterSelectOptions(options: {
   catalogKey: DataModels
   filters: ConfigFilter[] | undefined
   effectiveTaxonLineage: string | null
}) {
   const { catalogKey, filters, effectiveTaxonLineage } = options
   const [selectOptions, setSelectOptions] = useState<Record<string, string[]>>({})

   useEffect(() => {
      const defs = filters?.filter((f) => f.type === 'select') ?? []
      if (defs.length === 0) {
         setSelectOptions({})
         return
      }
      let cancelled = false
      const q: Record<string, string> = {}
      if (effectiveTaxonLineage) q.taxon_lineage = effectiveTaxonLineage

      void Promise.all(
         defs.map(async (def) => {
            try {
               const raw = await fetchFieldStats(catalogKey, def.key, q)
               const keys = Object.keys(raw)
                  .filter((k) => k !== 'message')
                  .sort()
               return [def.key, keys] as const
            } catch {
               return [def.key, [] as string[]] as const
            }
         }),
      ).then((pairs) => {
         if (!cancelled) setSelectOptions(Object.fromEntries(pairs))
      })
      return () => {
         cancelled = true
      }
   }, [catalogKey, filters, effectiveTaxonLineage])

   return selectOptions
}
