import { useCallback, useEffect, useMemo, useState } from 'react'
import { downloadGoatReport } from '@/lib/api/goatReport'
import { fetchOrganisms } from '@/lib/api/organisms'
import { fetchFieldStats } from '@/lib/api/stats'
import type { AppConfig } from '@/lib/portal/types'

export const STATUS_TABLE_PAGE_SIZE = 50

type TableFilterParams = Record<string, string | number>

export function useGoatStatusPageQuery({ config }: { config: AppConfig | null }) {
   const [goatStatusFilters, setGoatStatusFilters] = useState<string[]>([])
   const [targetListFilter, setTargetListFilter] = useState('')
   const [listSearchInput, setListSearchInput] = useState('')
   const [debouncedListSearch, setDebouncedListSearch] = useState('')

   const [goatStats, setGoatStats] = useState<Record<string, number> | null>(null)
   const [targetListStats, setTargetListStats] = useState<Record<string, number> | null>(null)
   const [statsLoading, setStatsLoading] = useState(true)
   const [statsError, setStatsError] = useState<string | null>(null)

   const [rows, setRows] = useState<Record<string, unknown>[]>([])
   const [tableTotal, setTableTotal] = useState(0)
   const [tableLoading, setTableLoading] = useState(false)
   const [tableLoadingMore, setTableLoadingMore] = useState(false)
   const [tableError, setTableError] = useState<string | null>(null)

   const [goatReportLoading, setGoatReportLoading] = useState(false)
   const [goatReportError, setGoatReportError] = useState<string | null>(null)

   useEffect(() => {
      if (!config) return
      let cancelled = false
      setStatsLoading(true)
      setStatsError(null)
      void Promise.all([
         fetchFieldStats('organisms', 'goat_status', {}),
         fetchFieldStats('organisms', 'target_list_status', {}),
      ])
         .then(([g, tls]) => {
            if (!cancelled) {
               setGoatStats(g)
               setTargetListStats(tls)
            }
         })
         .catch((e) => {
            if (!cancelled) {
               setStatsError(e instanceof Error ? e.message : String(e))
               setGoatStats(null)
               setTargetListStats(null)
            }
         })
         .finally(() => {
            if (!cancelled) setStatsLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [config])

   useEffect(() => {
      const t = window.setTimeout(() => {
         setDebouncedListSearch(listSearchInput.trim())
      }, 250)
      return () => window.clearTimeout(t)
   }, [listSearchInput])

   const tableFilters = useMemo((): TableFilterParams => {
      const q: TableFilterParams = {}
      if (goatStatusFilters.length > 0) q.goat_status__in = goatStatusFilters.join(',')
      if (targetListFilter) q.target_list_status__in = targetListFilter
      if (debouncedListSearch) q.filter = debouncedListSearch
      return q
   }, [goatStatusFilters, targetListFilter, debouncedListSearch])

   /** Same filters + sort as the table list, without pagination — for `SpeciesExportSheet` / TSV. */
   const organismExportParams = useMemo((): Record<string, string | number> => {
      return {
         ...tableFilters,
         sort_column: 'scientific_name',
         sort_order: 'asc',
      }
   }, [tableFilters])

   const tableQuery = useMemo(() => {
      return {
         ...tableFilters,
         limit: STATUS_TABLE_PAGE_SIZE,
         offset: 0,
         sort_column: 'scientific_name',
         sort_order: 'asc',
      } as Record<string, string | number>
   }, [tableFilters])

   useEffect(() => {
      if (!config) return
      let cancelled = false
      setTableLoading(true)
      setTableError(null)
      void fetchOrganisms(tableQuery)
         .then((res) => {
            if (cancelled) return
            setRows(res.data)
            setTableTotal(res.total)
         })
         .catch((e) => {
            if (cancelled) return
            setTableError(e instanceof Error ? e.message : String(e))
            setRows([])
            setTableTotal(0)
         })
         .finally(() => {
            if (!cancelled) setTableLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [config, tableQuery])

   const loadMore = useCallback(() => {
      if (rows.length >= tableTotal || tableLoadingMore || tableLoading) return
      setTableLoadingMore(true)
      setTableError(null)
      void fetchOrganisms({ ...tableQuery, offset: rows.length })
         .then((res) => {
            setRows((prev) => [...prev, ...res.data])
            setTableTotal(res.total)
         })
         .catch((e) => {
            setTableError(e instanceof Error ? e.message : String(e))
         })
         .finally(() => setTableLoadingMore(false))
   }, [tableQuery, rows.length, tableTotal, tableLoadingMore, tableLoading])

   const onDownloadGoat = useCallback(async () => {
      setGoatReportError(null)
      setGoatReportLoading(true)
      try {
         const { blob, filename } = await downloadGoatReport()
         const href = URL.createObjectURL(blob)
         const a = document.createElement('a')
         a.href = href
         a.download = filename
         document.body.appendChild(a)
         a.click()
         a.remove()
         URL.revokeObjectURL(href)
      } catch (e) {
         setGoatReportError(e instanceof Error ? e.message : String(e))
      } finally {
         setGoatReportLoading(false)
      }
   }, [])

   const resetTableFilters = useCallback(() => {
      setGoatStatusFilters([])
      setTargetListFilter('')
      setListSearchInput('')
      setDebouncedListSearch('')
   }, [])

   const hasActiveTableFilters = useMemo(
      () =>
         goatStatusFilters.length > 0 ||
         Boolean(targetListFilter) ||
         Boolean(debouncedListSearch),
      [goatStatusFilters, targetListFilter, debouncedListSearch],
   )

   return {
      goatStatusFilters,
      setGoatStatusFilters,
      targetListFilter,
      setTargetListFilter,
      listSearchInput,
      setListSearchInput,
      resetTableFilters,
      hasActiveTableFilters,
      goatStats,
      targetListStats,
      statsLoading,
      statsError,
      rows,
      tableTotal,
      tableLoading,
      tableLoadingMore,
      tableError,
      loadMore,
      organismExportParams,
      goatReportLoading,
      goatReportError,
      onDownloadGoat,
   }
}


/** @deprecated Use useGoatStatusPageQuery */
export const useStatusTrackerQueries = useGoatStatusPageQuery
