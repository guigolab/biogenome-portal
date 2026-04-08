'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { getRootTaxid } from '@/lib/api/taxon'
import { fetchRootTaxon } from '@/lib/api/taxons'

export type TaxonomyQueryPatch = {
   taxid?: string | null
   root?: string | null
}

/**
 * Single place for taxonomy URL state: `taxid` (selection) and `root` (tree root).
 * Paths from `usePathname()` — no duplicate basePath (see front-portal-runtime).
 */
export function useTaxonomyPageQuery() {
   const router = useRouter()
   const pathname = usePathname()
   const searchParams = useSearchParams()

   const selectedTaxid = useMemo(() => searchParams.get('taxid')?.trim() || null, [searchParams])

   const rootFromUrl = useMemo(() => searchParams.get('root')?.trim() || null, [searchParams])

   /** ``GET /taxons/root`` taxid — canonical ``ROOT_NODE`` (preferred over static portal.json). */
   const [serverPortalRootTaxid, setServerPortalRootTaxid] = useState<string | null>(null)
   useEffect(() => {
      let cancelled = false
      void fetchRootTaxon()
         .then((d) => {
            const t = d.taxid != null ? String(d.taxid).trim() : ''
            if (!cancelled && t) setServerPortalRootTaxid(t)
         })
         .catch(() => {
            if (!cancelled) setServerPortalRootTaxid(null)
         })
      return () => {
         cancelled = true
      }
   }, [])

   const portalDefaultRoot = serverPortalRootTaxid ?? getRootTaxid()
   const effectiveTreeRoot = rootFromUrl || portalDefaultRoot

   const replaceTaxonomyQuery = useCallback(
      (patch: TaxonomyQueryPatch) => {
         const p = new URLSearchParams(searchParams.toString())
         if (patch.taxid !== undefined) {
            if (patch.taxid && patch.taxid.trim()) p.set('taxid', patch.taxid.trim())
            else p.delete('taxid')
         }
         if (patch.root !== undefined) {
            if (patch.root && patch.root.trim()) p.set('root', patch.root.trim())
            else p.delete('root')
         }
         const qs = p.toString()
         router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      },
      [pathname, router, searchParams],
   )

   const selectTaxon = useCallback(
      (taxid: string | null) => {
         replaceTaxonomyQuery({ taxid })
      },
      [replaceTaxonomyQuery],
   )

   const setTreeRoot = useCallback(
      (taxid: string | null) => {
         replaceTaxonomyQuery({ root: taxid, taxid: null })
      },
      [replaceTaxonomyQuery],
   )

   const resetTreeRoot = useCallback(() => {
      replaceTaxonomyQuery({ root: null, taxid: null })
   }, [replaceTaxonomyQuery])

   return {
      selectedTaxid,
      rootFromUrl,
      portalDefaultRoot,
      effectiveTreeRoot,
      replaceTaxonomyQuery,
      selectTaxon,
      setTreeRoot,
      resetTreeRoot,
   }
}
