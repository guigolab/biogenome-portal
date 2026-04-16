'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Cell, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'

import type { CatalogChartDef } from '@/components/catalog-explorer/catalog-chart-def'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { fetchCatalogListAll } from '@/lib/api/catalog'
import { catalogCategoricalColor } from '@/lib/catalog-explorer/portalCategoricalChartPalette'
import { downloadChartPng, downloadChartSvg } from '@/lib/catalog-explorer/chartExport'
import type { DataModels } from '@/lib/portal/types'
import { toStatsQueryRecord } from '@/lib/catalogQueryParams'
import { cn } from '@/lib/utils'
import { ImageDown, Loader2 } from 'lucide-react'

function getNested(obj: unknown, path: string): unknown {
   let cur: unknown = obj
   for (const p of path.split('.')) {
      if (cur == null || typeof cur !== 'object') return undefined
      cur = (cur as Record<string, unknown>)[p]
   }
   return cur
}

function asPositiveNumber(v: unknown): number | null {
   if (v == null) return null
   if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
   if (typeof v === 'string') {
      const n = Number(v.replace(/,/g, ''))
      if (Number.isFinite(n) && n > 0) return n
   }
   return null
}

function asLevelLabel(v: unknown): string {
   if (v == null || v === '') return 'No entry'
   const s = String(v).trim()
   return s || 'No entry'
}

export type AssemblyScatterChartPanelProps = {
   model: DataModels
   chart: CatalogChartDef
   statsQuery: Record<string, string | number | boolean>
   title: string
   exportFilenameBase: string
   t: (key: string) => string
   categoricalPalette: readonly string[]
   onAssemblyAccessionClick: (accession: string) => void
}

type ScatterRow = {
   accession: string
   x: number
   y: number
   level: string
   fill: string
}

function ScatterPointTooltip({
   active,
   payload,
}: {
   active?: boolean
   payload?: ReadonlyArray<{ payload?: ScatterRow }>
}) {
   if (!active || !payload?.length) return null
   const p = payload[0]?.payload
   if (!p) return null
   return (
      <div className="border-border/50 bg-background grid min-w-[10rem] gap-1 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
         <div className="font-mono font-medium text-foreground">{p.accession}</div>
         <div className="text-muted-foreground">Contig N50: {p.x.toLocaleString()} bp</div>
         <div className="text-muted-foreground">Scaffold N50: {p.y.toLocaleString()} bp</div>
         <div className="text-muted-foreground">Assembly level: {p.level}</div>
      </div>
   )
}

export function AssemblyScatterChartPanel({
   model,
   chart,
   statsQuery,
   title,
   exportFilenameBase,
   t,
   categoricalPalette,
   onAssemblyAccessionClick,
}: AssemblyScatterChartPanelProps) {
   const exportRootRef = useRef<HTMLDivElement>(null)
   const [rows, setRows] = useState<ScatterRow[]>([])
   const [loading, setLoading] = useState(true)
   const [error, setError] = useState<string | null>(null)

   const xField = chart.xField ?? 'metadata.assembly_stats.contig_n50'
   const yField = chart.yField ?? 'metadata.assembly_stats.scaffold_n50'
   const colorField = chart.colorField ?? 'metadata.assembly_info.assembly_level'

   const statsQueryKey = JSON.stringify(statsQuery)

   useEffect(() => {
      if (model !== 'assemblies') {
         setRows([])
         setLoading(false)
         return
      }
      let cancelled = false
      setLoading(true)
      setError(null)
      const q = toStatsQueryRecord(statsQuery)
      void fetchCatalogListAll(
         'assemblies',
         q,
         /** DictField: load accession + metadata so nested stats / assembly_info are available. */
         { fields: ['accession', 'metadata'] },
      )
         .then(({ data }) => {
            if (cancelled) return
            const raw: ScatterRow[] = []
            const levelSet = new Set<string>()
            for (const doc of data) {
               const acc = typeof doc.accession === 'string' ? doc.accession.trim() : ''
               if (!acc) continue
               const x = asPositiveNumber(getNested(doc, xField))
               const y = asPositiveNumber(getNested(doc, yField))
               if (x == null || y == null) continue
               const level = asLevelLabel(getNested(doc, colorField))
               levelSet.add(level)
               raw.push({ accession: acc, x, y, level, fill: '#888' })
            }
            const levels = [...levelSet].sort((a, b) => a.localeCompare(b))
            const levelToIndex = new Map(levels.map((lv, i) => [lv, i]))
            for (const r of raw) {
               const idx = levelToIndex.get(r.level) ?? 0
               r.fill = catalogCategoricalColor(model, idx, categoricalPalette)
            }
            setRows(raw)
         })
         .catch((e: unknown) => {
            if (!cancelled) {
               setRows([])
               setError(e instanceof Error ? e.message : String(e))
            }
         })
         .finally(() => {
            if (!cancelled) setLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [model, statsQueryKey, xField, yField, colorField, categoricalPalette])

   const levels = useMemo(() => {
      const s = new Set(rows.map((r) => r.level))
      return [...s].sort((a, b) => a.localeCompare(b))
   }, [rows])

   const chartConfig: ChartConfig = useMemo(() => {
      const cfg: ChartConfig = {}
      levels.forEach((lv, i) => {
         cfg[`lvl_${i}`] = {
            label: lv,
            color: catalogCategoricalColor(model, i, categoricalPalette),
         }
      })
      return cfg
   }, [levels, model, categoricalPalette])

   const canExportImage = Boolean(rows.length > 0 && !loading && !error)
   const [pngBusy, setPngBusy] = useState(false)

   const desc = `${xField} · ${yField} · ${colorField}`

   return (
      <Card
         className={cn(
            'border-border/80 shadow-sm transition-shadow hover:shadow-md',
            chart.size >= 4 ? 'md:col-span-2' : '',
         )}
      >
         <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
            <div className="min-w-0 space-y-1">
               <CardTitle className="text-base font-semibold leading-tight">{title}</CardTitle>
               <CardDescription className="font-mono text-[11px] leading-snug text-muted-foreground">
                  {desc}
               </CardDescription>
            </div>
            {canExportImage ? (
               <div className="flex shrink-0 gap-1">
                  <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     className="h-8 gap-1"
                     title={t('catalog.chartDownloadSvgTitle')}
                     onClick={() => downloadChartSvg(exportRootRef.current, exportFilenameBase)}
                  >
                     <ImageDown className="h-3.5 w-3.5" aria-hidden />
                     {t('catalog.chartDownloadSvg')}
                  </Button>
                  <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     className="h-8 gap-1"
                     disabled={pngBusy}
                     title={t('catalog.chartDownloadPngTitle')}
                     onClick={() => {
                        setPngBusy(true)
                        void downloadChartPng(exportRootRef.current, exportFilenameBase, { scale: 2 }).finally(
                           () => setPngBusy(false),
                        )
                     }}
                  >
                     {pngBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                     ) : (
                        <ImageDown className="h-3.5 w-3.5" aria-hidden />
                     )}
                     {t('catalog.chartDownloadPng')}
                  </Button>
               </div>
            ) : null}
         </CardHeader>
         <CardContent className="pt-0">
            {loading ? (
               <div className="flex h-[320px] items-center justify-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
               </div>
            ) : error ? (
               <p className="py-8 text-center text-sm text-destructive">{error}</p>
            ) : rows.length === 0 ? (
               <div className="py-8 text-center text-sm text-muted-foreground">
                  {t('catalog.scatterNoPoints')}
               </div>
            ) : (
               <div ref={exportRootRef} className="min-w-0 w-full">
                  <div className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                     {levels.map((lv, i) => (
                        <span key={lv} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                           <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: catalogCategoricalColor(model, i, categoricalPalette) }}
                              aria-hidden
                           />
                           {lv}
                        </span>
                     ))}
                  </div>
                  <ChartContainer config={chartConfig} className="h-[340px] w-full">
                     <ScatterChart margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                        <XAxis
                           type="number"
                           dataKey="x"
                           name="x"
                           scale="log"
                           domain={['auto', 'auto']}
                           tickLine={false}
                           axisLine={false}
                           tick={{ fontSize: 10 }}
                           label={{ value: 'Contig N50 (bp)', position: 'insideBottom', offset: -4, fontSize: 11 }}
                        />
                        <YAxis
                           type="number"
                           dataKey="y"
                           name="y"
                           scale="log"
                           domain={['auto', 'auto']}
                           tickLine={false}
                           axisLine={false}
                           tick={{ fontSize: 10 }}
                           width={56}
                           label={{
                              value: 'Scaffold N50 (bp)',
                              angle: -90,
                              position: 'insideLeft',
                              style: { fontSize: 11 },
                           }}
                        />
                        <Tooltip content={ScatterPointTooltip} cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter
                           name="assemblies"
                           data={rows}
                           fill="var(--primary)"
                           onClick={(dot: { payload?: ScatterRow }) => {
                              const acc = dot?.payload?.accession
                              if (typeof acc === 'string' && acc.trim()) onAssemblyAccessionClick(acc.trim())
                           }}
                           style={{ cursor: 'pointer' }}
                        >
                           {rows.map((r) => (
                              <Cell key={r.accession} fill={r.fill} stroke="var(--border)" strokeWidth={0.5} />
                           ))}
                        </Scatter>
                     </ScatterChart>
                  </ChartContainer>
               </div>
            )}
         </CardContent>
      </Card>
   )
}
