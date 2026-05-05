'use client'

import { useEffect, useState } from 'react'
import type { ChromosomeRow } from '@/lib/genome-browser/buildDefaultSession'
import type { GenomeAnnotationRow } from '@/lib/api/assemblies'
import { fetchGenomeBrowserContext } from '@/lib/api/jbrowse'

export type CatalogBrowserContext = {
   loading: boolean
   error: string | null
   chromosomes: ChromosomeRow[]
   annotations: GenomeAnnotationRow[]
}

const EMPTY: CatalogBrowserContext = {
   loading: false,
   error: null,
   chromosomes: [],
   annotations: [],
}

/**
 * Fetches the genome browser context (chromosomes + annotations) for an assembly accession.
 * Pass an empty string to skip fetching; state resets to idle immediately.
 */
export function useCatalogGenomeBrowserContext(assemblyAcc: string): CatalogBrowserContext {
   const [state, setState] = useState<CatalogBrowserContext>(EMPTY)

   useEffect(() => {
      if (!assemblyAcc) {
         setState(EMPTY)
         return
      }
      let cancelled = false
      setState({ loading: true, error: null, chromosomes: [], annotations: [] })
      void fetchGenomeBrowserContext(assemblyAcc)
         .then((c) => {
            if (!cancelled) {
               setState({
                  loading: false,
                  error: null,
                  chromosomes: c.chromosomes,
                  annotations: c.annotations,
               })
            }
         })
         .catch(() => {
            if (!cancelled) {
               setState({ loading: false, error: 'unavailable', chromosomes: [], annotations: [] })
            }
         })
      return () => {
         cancelled = true
      }
   }, [assemblyAcc])

   return state
}
