'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { getRootTaxid } from '@/lib/api/taxon'
import { useRootTaxonStore } from '@/stores/root-taxon-store'

export type TaxonomyQueryPatch = {
   taxid?: string | null
   root?: string | null
}

/**
 * Single place for taxonomy URL state: `taxid` (selection) and `root` (tree root).
 *
 * `selectedTaxid` and `rootFromUrl` are **local React state** that update immediately
 * on user interaction, so the UI is always responsive regardless of when
 * `router.replace` commits.
 *
 * The URL is rebuilt deterministically from **local state refs** (not from
 * `window.location.search`) to eliminate race conditions on rapid sequential
 * calls before the router has committed the previous navigation.
 *
 * External URL changes (browser back/forward) are synced back via `useEffect`.
 */
export function useTaxonomyPageQuery() {
   const router = useRouter()
   const pathname = usePathname()
   const searchParams = useSearchParams()

   const rootTaxon = useRootTaxonStore((s) => s.rootTaxon)

   const urlTaxid = searchParams?.get('taxid')?.trim() || null
   const urlRoot = searchParams?.get('root')?.trim() || null

   const [selectedTaxid, setSelectedTaxid] = useState<string | null>(urlTaxid)
   const [rootFromUrl, setRootFromUrl] = useState<string | null>(urlRoot)

   // Sync state when the URL changes externally (back/forward navigation).
   useEffect(() => {
      setSelectedTaxid(urlTaxid)
   }, [urlTaxid])
   useEffect(() => {
      setRootFromUrl(urlRoot)
   }, [urlRoot])

   const portalDefaultRoot =
      (rootTaxon?.taxid != null ? String(rootTaxon.taxid).trim() : '') || getRootTaxid()
   const effectiveTreeRoot = rootFromUrl || portalDefaultRoot

   /**
    * Refs updated every render so the stable `replaceTaxonomyQuery` callback
    * always reads live values without needing them in its dependency array.
    */
   const routerRef = useRef(router)
   routerRef.current = router
   const pathnameRef = useRef(pathname)
   pathnameRef.current = pathname

   /** Tracks the latest committed local state for deterministic URL reconstruction. */
   const selectedTaxidRef = useRef(selectedTaxid)
   selectedTaxidRef.current = selectedTaxid
   const rootFromUrlRef = useRef(rootFromUrl)
   rootFromUrlRef.current = rootFromUrl

   // eslint-disable-next-line react-hooks/exhaustive-deps
   const replaceTaxonomyQuery = useCallback((patch: TaxonomyQueryPatch) => {
      // 1. Update local state immediately so the UI responds right away.
      if (patch.taxid !== undefined) {
         setSelectedTaxid(patch.taxid?.trim() || null)
      }
      if (patch.root !== undefined) {
         setRootFromUrl(patch.root?.trim() || null)
      }

      // 2. Reconstruct the URL from canonical local values, not from
      //    window.location.search which may not reflect rapid sequential calls.
      const nextTaxid =
         patch.taxid !== undefined
            ? (patch.taxid?.trim() || null)
            : selectedTaxidRef.current
      const nextRoot =
         patch.root !== undefined
            ? (patch.root?.trim() || null)
            : rootFromUrlRef.current

      const p = new URLSearchParams()
      if (nextTaxid) p.set('taxid', nextTaxid)
      if (nextRoot) p.set('root', nextRoot)

      const qs = p.toString()
      const routePath = pathnameRef.current || '/taxonomy'
      routerRef.current.replace(qs ? `${routePath}?${qs}` : routePath, { scroll: false })
   }, []) // stable — reads live values via refs at call time

   const selectTaxon = useCallback(
      (taxid: string | null) => {
         replaceTaxonomyQuery({ taxid })
      },
      [replaceTaxonomyQuery],
   )

   /**
    * Set URL `root` (reloads tree). Clears `taxid` by default so selection
    * doesn't point outside the new subtree.
    * Pass `{ preserveTaxid: true }` from "Explore lineage".
    */
   const setTreeRoot = useCallback(
      (taxid: string | null, options?: { preserveTaxid?: boolean }) => {
         if (!taxid?.trim()) {
            replaceTaxonomyQuery({ root: null, taxid: null })
            return
         }
         const root = taxid.trim()
         if (options?.preserveTaxid) {
            replaceTaxonomyQuery({ root })
         } else {
            replaceTaxonomyQuery({ root, taxid: null })
         }
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
