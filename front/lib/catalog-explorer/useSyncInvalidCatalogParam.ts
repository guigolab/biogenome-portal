'use client'

import { useEffect } from 'react'

import type { DataModels } from '@/lib/portal/types'

/**
 * Keeps locally selected catalog valid for the current taxon scope.
 */
export function useSyncInvalidCatalogParam(options: {
   countsReady: boolean
   visibleCatalogKeys: DataModels[]
   selectedCatalog: DataModels
   setSelectedCatalog: (k: DataModels) => void
}) {
   const { countsReady, visibleCatalogKeys, selectedCatalog, setSelectedCatalog } = options

   useEffect(() => {
      if (!countsReady || visibleCatalogKeys.length === 0) return
      if (!visibleCatalogKeys.includes(selectedCatalog)) {
         setSelectedCatalog(visibleCatalogKeys[0])
      }
   }, [countsReady, visibleCatalogKeys, selectedCatalog, setSelectedCatalog])
}
