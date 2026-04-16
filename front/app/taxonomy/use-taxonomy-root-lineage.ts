'use client'

import { useEffect, useState } from 'react'

import { fetchTaxonAncestors } from '@/lib/api/taxon'

export type LineageEntry = { taxid: string; name: string }

function parseTaxonDoc(doc: Record<string, unknown>): LineageEntry | null {
   const taxid = String(doc.taxid ?? '').trim()
   if (!taxid) return null
   const name =
      typeof doc.scientific_name === 'string' && doc.scientific_name.trim()
         ? doc.scientific_name.trim()
         : typeof doc.name === 'string' && doc.name.trim()
           ? doc.name.trim()
           : taxid
   return { taxid, name }
}

/**
 * Ancestors from portal root through the current tree root
 * (``GET /taxons/:id/ancestors``, root-to-tip order).
 *
 * Always resolves `loadingLineage` to `false` — network errors produce an
 * empty lineage rather than leaving the spinner stuck.
 */
export function useTaxonomyRootLineage(
   treeRootTaxid: string | null,
   portalRootTaxid: string | null,
): { lineage: LineageEntry[]; loadingLineage: boolean } {
   const [lineage, setLineage] = useState<LineageEntry[]>([])
   const [loadingLineage, setLoadingLineage] = useState(false)

   useEffect(() => {
      if (!treeRootTaxid?.trim()) {
         setLineage([])
         setLoadingLineage(false)
         return
      }

      let cancelled = false
      setLoadingLineage(true)

      const load = async () => {
         try {
            const docs = await fetchTaxonAncestors(treeRootTaxid.trim())
            if (cancelled) return

            const parsed = docs
               .map((d) => parseTaxonDoc(d))
               .filter((x): x is LineageEntry => x !== null)

            let segment = parsed
            if (portalRootTaxid?.trim()) {
               const pi = parsed.findIndex((x) => x.taxid === portalRootTaxid.trim())
               if (pi >= 0) segment = parsed.slice(pi)
            }

            setLineage(segment)
         } catch {
            if (cancelled) return
            setLineage([])
         } finally {
            if (!cancelled) setLoadingLineage(false)
         }
      }

      void load()

      return () => {
         cancelled = true
      }
   }, [treeRootTaxid, portalRootTaxid])

   return { lineage, loadingLineage }
}
