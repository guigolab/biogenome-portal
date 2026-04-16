'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis } from 'recharts'

import { Label } from '@/components/ui/label'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Slider } from '@/components/ui/slider'
import { fetchDateHistogramBuckets, type DateHistogramBucket } from '@/lib/api/stats'
import type { FilterValuesState } from '@/lib/catalogQueryParams'
import { buildFacetStatsQuery, toStatsQueryRecord } from '@/lib/catalogQueryParams'
import {
   buildHistogramClusters,
   clusterIndicesForFilter,
   type HistogramCluster,
} from '@/lib/catalog-explorer/dateHistogramClusters'
import type { ConfigFilter, DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

/** Symmetric margins so the plot + slider read centered; slider row uses the same horizontal inset. */
const HISTOGRAM_MARGIN = { left: 12, right: 12, top: 8, bottom: 0 } as const

/**
 * Filter targets metadata paths (e.g. `metadata.collection date`). Card display may also
 * use top-level `collection_date` — this control only filters the metadata field.
 * Histogram uses **ISO calendar dates** only (see server regex); bars cluster by day / month / year.
 */
export function CatalogDateHistogramSlider(options: {
   catalogModel: DataModels
   field: string
   /** Full list/stats params (active filters); histogram distribution excludes `field`. */
   statsQuery: Record<string, string | number | boolean>
   filterDefs: ConfigFilter[] | undefined
   flabel: string
   sidebarField: boolean
   /**
    * Sidebar accordion: fetch date buckets **once when this control mounts** (section expanded),
    * using latest query params from refs — do not refetch when the user edits filters while
    * this section stays open. Grid layout uses live `statsQuery` updates instead.
    */
   deferFacetFetch?: boolean
   st: FilterValuesState
   onChange: (next: FilterValuesState | undefined) => void
}) {
   const {
      catalogModel,
      field,
      statsQuery,
      filterDefs,
      flabel,
      sidebarField,
      deferFacetFetch = false,
      st,
      onChange,
   } = options
   const [rawBuckets, setRawBuckets] = useState<DateHistogramBucket[] | null>(null)
   const [loadError, setLoadError] = useState<string | null>(null)
   const histFillId = `catdh-${useId().replace(/:/g, '')}`

   const statsQueryRef = useRef(statsQuery)
   statsQueryRef.current = statsQuery
   const filterDefsRef = useRef(filterDefs)
   filterDefsRef.current = filterDefs

   const q = useMemo(
      () => toStatsQueryRecord(buildFacetStatsQuery(statsQuery, filterDefs, field)),
      [statsQuery, filterDefs, field],
   )

   useEffect(() => {
      let cancelled = false
      setLoadError(null)
      setRawBuckets(null)
      const qStr = deferFacetFetch
         ? toStatsQueryRecord(
              buildFacetStatsQuery(statsQueryRef.current, filterDefsRef.current, field),
           )
         : q
      void fetchDateHistogramBuckets(catalogModel, field, qStr)
         .then((b) => {
            if (!cancelled) setRawBuckets(b)
         })
         .catch(() => {
            if (!cancelled) {
               setLoadError('failed')
               setRawBuckets([])
            }
         })
      return () => {
         cancelled = true
      }
   }, deferFacetFetch ? [catalogModel, field] : [catalogModel, field, q])

   const clusters: HistogramCluster[] = useMemo(
      () => buildHistogramClusters(rawBuckets ?? []),
      [rawBuckets],
   )

   const maxIdx = Math.max(0, clusters.length - 1)

   const chartRows = useMemo(
      () =>
         clusters.map((c) => ({
            i: c.i,
            c: c.count,
            rangeLabel: c.from === c.to ? c.from : `${c.from} → ${c.to}`,
         })),
      [clusters],
   )

   const [rangeIdx, setRangeIdx] = useState<[number, number]>([0, 0])

   useEffect(() => {
      if (clusters.length === 0) return
      const [lo, hi] = clusterIndicesForFilter(clusters, st.date?.from, st.date?.to)
      setRangeIdx([lo, hi])
   }, [clusters, st.date?.from, st.date?.to])

   const chartConfig: ChartConfig = {
      c: { label: 'Count', color: 'var(--chart-1)' },
   }

   const labelClass = sidebarField ? 'sr-only' : 'text-xs text-muted-foreground'

   if (loadError || (rawBuckets && clusters.length === 0)) {
      return (
         <div className="space-y-1.5">
            <Label className={labelClass}>{flabel}</Label>
            <p className="text-sm text-muted-foreground">
               {loadError ? 'Could not load date distribution.' : 'No ISO date values in current scope.'}
            </p>
         </div>
      )
   }

   if (!rawBuckets) {
      return (
         <div className="flex min-h-[6rem] items-center justify-center gap-2 text-muted-foreground" aria-busy>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="sr-only">Loading histogram</span>
         </div>
      )
   }

   const applyRange = (lo: number, hi: number) => {
      const a = Math.max(0, Math.min(lo, maxIdx))
      const b = Math.max(0, Math.min(hi, maxIdx))
      const L = Math.min(a, b)
      const R = Math.max(a, b)
      const from = clusters[L]?.from
      const to = clusters[R]?.to
      onChange({
         ...st,
         date: { from, to },
      })
   }

   const loC = clusters[rangeIdx[0]!]
   const hiC = clusters[rangeIdx[1]!]

   return (
      <div className={cn('space-y-2', sidebarField && 'space-y-3')}>
         <Label className={labelClass}>{flabel}</Label>
         <div className="mx-auto w-full min-w-0 max-w-lg">
            <div className="w-full min-w-0">
               <ChartContainer
                  config={chartConfig}
                  className="h-[7.5rem] w-full min-w-0 [&_.recharts-responsive-container]:!aspect-auto [&_.recharts-responsive-container]:!h-full"
               >
                  <AreaChart data={chartRows} margin={HISTOGRAM_MARGIN}>
                     <defs>
                        <linearGradient id={histFillId} x1="0" y1="0" x2="0" y2="1">
                           <stop offset="0%" stopColor="var(--color-c)" stopOpacity={0.45} />
                           <stop offset="100%" stopColor="var(--color-c)" stopOpacity={0.06} />
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                     <XAxis dataKey="i" type="category" tick={false} axisLine={false} height={0} />
                     <Tooltip
                        cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        content={({ active, payload }) => {
                           if (!active || !payload?.[0]) return null
                           const row = payload[0].payload as {
                              rangeLabel?: string
                              c?: number
                           }
                           return (
                              <div className="border-border/60 bg-background rounded-md border px-2 py-1.5 text-xs shadow-md">
                                 <div className="font-medium tabular-nums">{row.rangeLabel}</div>
                                 <div className="text-muted-foreground">
                                    {typeof row.c === 'number' ? row.c.toLocaleString() : '—'} records
                                 </div>
                              </div>
                           )
                        }}
                     />
                     <Area
                        type="monotone"
                        dataKey="c"
                        stroke="var(--color-c)"
                        strokeWidth={1.25}
                        fill={`url(#${histFillId})`}
                        isAnimationActive={false}
                        dot={false}
                        activeDot={{ r: 3 }}
                     />
                  </AreaChart>
               </ChartContainer>
            </div>
            <div
               className="w-full pt-2"
               style={{
                  paddingLeft: HISTOGRAM_MARGIN.left,
                  paddingRight: HISTOGRAM_MARGIN.right,
               }}
            >
               <Slider
                  min={0}
                  max={maxIdx}
                  step={1}
                  value={[rangeIdx[0], rangeIdx[1]]}
                  onValueChange={(v) => {
                     const pair = v as number[]
                     if (pair.length < 2) return
                     setRangeIdx([pair[0]!, pair[1]!])
                  }}
                  onValueCommit={(v) => {
                     const pair = v as number[]
                     if (pair.length < 2) return
                     applyRange(pair[0]!, pair[1]!)
                  }}
                  aria-label={flabel}
               />
            </div>
            <p className="pt-1 text-xs text-muted-foreground text-center" aria-live="polite">
               {loC && hiC ? (
                  <>
                     {loC.from === hiC.to || loC.from === hiC.from ? loC.from : `${loC.from} – ${hiC.to}`}
                  </>
               ) : (
                  '—'
               )}
            </p>
         </div>
      </div>
   )
}
