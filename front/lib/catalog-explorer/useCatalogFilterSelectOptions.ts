'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { fetchFieldStatsPost } from '@/lib/api/stats'
import { buildFacetStatsQuery, toStatsQueryRecord } from '@/lib/catalogQueryParams'
import type { ConfigFilter, DataModels } from '@/lib/portal/types'

/** Each entry is `[value, count]` sorted by count descending then alphabetically. */
export type SelectOptionWithCount = [string, number]

function sortStatsEntries(raw: Record<string, number>): SelectOptionWithCount[] {
   return Object.entries(raw)
      .filter(([k]) => k !== 'message')
      .sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))
}

/**
 * Loads distinct option keys for `select` filter fields via POST /stats/:model `{ field }`.
 * Options are fetched lazily per field (e.g. when a sidebar collapsible opens the first time).
 */
export function useCatalogFilterSelectOptions(options: {
   catalogKey: DataModels
   filters: ConfigFilter[] | undefined
   /** Same flat params as catalog list (no pagination); facet counts exclude the field being loaded. */
   statsBase: Record<string, string | number | boolean>
}) {
   const { catalogKey, filters, statsBase } = options
   const [selectOptions, setSelectOptions] = useState<Record<string, SelectOptionWithCount[]>>({})
   const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({})

   const statsBaseRef = useRef(statsBase)
   statsBaseRef.current = statsBase
   const filtersRef = useRef(filters)
   filtersRef.current = filters

   const selectKeysSig = useMemo(
      () =>
         (filters ?? [])
            .filter((f) => f.type === 'select')
            .map((f) => f.key)
            .sort()
            .join('|'),
      [filters],
   )

   /** Catalog switch or filter schema change — drop cached facet rows only (not on every filter edit). */
   useEffect(() => {
      setSelectOptions({})
      setLoadingFields({})
   }, [catalogKey, selectKeysSig])

   /**
    * Call when a sidebar select collapsible **opens**. Uses current `statsBase` from refs so we do not
    * refetch on every keystroke — only when the user opens this section (gentle on `/stats`).
    */
   const ensureSelectOptionsLoaded = useCallback((fieldKey: string) => {
      const f = filtersRef.current
      const isSelect = (f ?? []).some((fd) => fd.type === 'select' && fd.key === fieldKey)
      if (!isSelect) return

      setLoadingFields((prev) => ({ ...prev, [fieldKey]: true }))

      const q = toStatsQueryRecord(
         buildFacetStatsQuery(statsBaseRef.current, filtersRef.current, fieldKey),
      )

      void fetchFieldStatsPost(catalogKey, fieldKey, q)
         .then((raw) => {
            const pairs = sortStatsEntries(raw)
            setSelectOptions((prev) => ({ ...prev, [fieldKey]: pairs }))
         })
         .catch(() => {
            setSelectOptions((prev) => ({ ...prev, [fieldKey]: [] }))
         })
         .finally(() => {
            setLoadingFields((prev) => {
               const next = { ...prev }
               delete next[fieldKey]
               return next
            })
         })
   }, [catalogKey])

   return { selectOptions, loadingFields, ensureSelectOptionsLoaded }
}
