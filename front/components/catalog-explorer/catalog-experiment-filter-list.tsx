'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { fetchReadExperiments, type ReadExperimentGroup } from '@/lib/api/readExperiments'
import { toStatsQueryRecord } from '@/lib/catalogQueryParams'
import { cn } from '@/lib/utils'
import { Check, Loader2 } from 'lucide-react'

const PAGE = 40

export function CatalogExperimentFilterList(options: {
   statsQuery: Record<string, string | number | boolean>
   /** When true (sidebar accordion), load experiments once on mount; ignore filter changes until remount. */
   deferFacetFetch?: boolean
   selectedAccession: string | undefined
   onSelect: (accession: string | undefined) => void
   title: string
}) {
   const { statsQuery, deferFacetFetch = false, selectedAccession, onSelect, title } = options
   const { t } = useLocale()
   const statsQueryRef = useRef(statsQuery)
   statsQueryRef.current = statsQuery

   const qLive = useMemo(() => toStatsQueryRecord(statsQuery), [statsQuery])

   const [rows, setRows] = useState<ReadExperimentGroup[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(false)
   const sentinelRef = useRef<HTMLDivElement | null>(null)

   const fetchAt = useCallback(
      async (start: number, append: boolean) => {
         setLoading(true)
         try {
            const queryStr = deferFacetFetch
               ? toStatsQueryRecord(statsQueryRef.current)
               : qLive
            const page = await fetchReadExperiments(queryStr, start, PAGE)
            setTotal(page.total)
            if (append) {
               setRows((prev) => [...prev, ...page.items])
            } else {
               setRows(page.items)
            }
         } catch {
            if (!append) setRows([])
         } finally {
            setLoading(false)
         }
      },
      deferFacetFetch ? [deferFacetFetch] : [deferFacetFetch, qLive],
   )

   useEffect(() => {
      setRows([])
      setTotal(0)
      void fetchAt(0, false)
   }, [fetchAt])

   const loadMore = useCallback(() => {
      if (loading) return
      if (rows.length >= total) return
      void fetchAt(rows.length, true)
   }, [fetchAt, loading, rows.length, total])

   useEffect(() => {
      const el = sentinelRef.current
      if (!el) return
      const obs = new IntersectionObserver(
         (entries) => {
            if (entries.some((e) => e.isIntersecting)) loadMore()
         },
         { root: null, rootMargin: '80px', threshold: 0 },
      )
      obs.observe(el)
      return () => obs.disconnect()
   }, [loadMore])

   return (
      <div
         className="max-h-[min(50vh,22rem)] space-y-0.5 overflow-y-auto overscroll-contain py-1"
         role="listbox"
         aria-label={title}
      >
         <button
            type="button"
            role="option"
            aria-selected={!selectedAccession}
            className={cn(
               'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
               !selectedAccession && 'bg-muted',
            )}
            onClick={() => onSelect(undefined)}
         >
            <Check className={cn('h-4 w-4 shrink-0', !selectedAccession ? 'opacity-100' : 'opacity-0')} />
            <span className="min-w-0 flex-1 font-medium">{t('common.all')}</span>
         </button>
         {rows.map((row) => {
            const acc = row.experiment_accession
            const label = row.experiment_title?.trim() || acc
            const sel = selectedAccession === acc
            return (
               <button
                  key={acc}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  className={cn(
                     'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
                     sel && 'bg-muted',
                  )}
                  title={label}
                  onClick={() => onSelect(acc)}
               >
                  <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {row.count > 0 ? (
                     <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {row.count.toLocaleString()}
                     </span>
                  ) : null}
               </button>
            )
         })}
         <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
         {loading ? (
            <div className="flex justify-center py-2 text-muted-foreground">
               <Loader2 className="h-5 w-5 animate-spin" aria-label={t('common.loading')} />
            </div>
         ) : null}
      </div>
   )
}
