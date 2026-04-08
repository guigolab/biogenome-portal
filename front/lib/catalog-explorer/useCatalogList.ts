'use client'

import { useCallback, useEffect, useState } from 'react'

import { fetchCatalogList } from '@/lib/api/catalog'
import { mergeListPagination } from '@/lib/catalogQueryParams'
import type { DataModels } from '@/lib/portal/types'

const PAGE_SIZE = 50

/**
 * Paginated catalog list fetch + infinite scroll append.
 */
export function useCatalogList(options: {
   catalogKey: DataModels
   baseQuery: Record<string, string | number | boolean>
   canFetchList: boolean
}) {
   const { catalogKey, baseQuery, canFetchList } = options

   const [items, setItems] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(true)
   const [loadingMore, setLoadingMore] = useState(false)
   const [listError, setListError] = useState<string | null>(null)

   useEffect(() => {
      if (!canFetchList) {
         setItems([])
         setTotal(0)
         setLoading(false)
         return
      }
      let cancelled = false
      setLoading(true)
      setListError(null)
      const params = mergeListPagination(baseQuery, PAGE_SIZE, 0)
      void fetchCatalogList(catalogKey, params)
         .then((res) => {
            if (cancelled) return
            setItems(res.data)
            setTotal(res.total)
         })
         .catch((e: unknown) => {
            if (cancelled) return
            setListError(e instanceof Error ? e.message : String(e))
            setItems([])
            setTotal(0)
         })
         .finally(() => {
            if (!cancelled) setLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [catalogKey, baseQuery, canFetchList])

   const loadMore = useCallback(() => {
      if (!canFetchList || items.length >= total || loadingMore || loading) return
      setLoadingMore(true)
      setListError(null)
      const params = mergeListPagination(baseQuery, PAGE_SIZE, items.length)
      void fetchCatalogList(catalogKey, params)
         .then((res) => {
            setItems((prev) => [...prev, ...res.data])
            setTotal(res.total)
         })
         .catch((e: unknown) => {
            setListError(e instanceof Error ? e.message : String(e))
         })
         .finally(() => setLoadingMore(false))
   }, [catalogKey, baseQuery, items.length, total, loadingMore, loading, canFetchList])

   return {
      items,
      total,
      loading,
      loadingMore,
      listError,
      loadMore,
   }
}
