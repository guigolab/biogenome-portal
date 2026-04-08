'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
   Area,
   Bar,
   BarChart,
   CartesianGrid,
   Cell,
   ComposedChart,
   Legend,
   Line,
   Pie,
   PieChart,
   XAxis,
   YAxis,
} from 'recharts'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { fetchFieldStats } from '@/lib/api/stats'
import { downloadChartPng, downloadChartSvg } from '@/lib/catalog-explorer/chartExport'
import { inferAnnotationRowSource } from '@/lib/catalog-explorer/annotationMetadataSource'
import { toStatsQueryRecord } from '@/lib/catalogQueryParams'
import type { ChartType, DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'
import { ImageDown, Info, Loader2 } from 'lucide-react'

/** Theme tokens are oklch in `globals.css`; use `var(--chart-n)` (not `hsl(var(...))`). */
const CHART_COLOR_VARS = [
   'var(--chart-1)',
   'var(--chart-2)',
   'var(--chart-3)',
   'var(--chart-4)',
   'var(--chart-5)',
   'var(--chart-6)',
   'var(--chart-7)',
   'var(--chart-8)',
   'var(--chart-9)',
   'var(--chart-10)',
] as const

/** Rotate palette start per catalog so adjacent dashboards don’t look identical. */
function catalogPaletteOffset(model: DataModels): number {
   switch (model) {
      case 'assemblies':
         return 0
      case 'biosamples':
         return 3
      case 'reads':
         return 5
      case 'annotations':
         return 2
      default:
         return 0
   }
}

function chartColorAt(model: DataModels, index: number): string {
   const n = CHART_COLOR_VARS.length
   return CHART_COLOR_VARS[(index + catalogPaletteOffset(model)) % n]!
}

const MAX_CATEGORICAL_SLICES = 14

type Pair = { name: string; value: number }

function normalizeNoEntryLabel(name: string): string {
   if (name === ' ' || name === 'No Entry') return 'No entry'
   return name
}

function buildPairs(stats: Record<string, number> | null): Pair[] {
   if (!stats) return []
   return Object.entries(stats)
      .filter(([k]) => k !== 'message')
      .map(([name, value]) => ({ name: normalizeNoEntryLabel(name), value }))
      .sort((a, b) => b.value - a.value)
}

/** Keep charts readable: top buckets + one “Other” aggregate. */
function truncatePairs(pairs: Pair[], maxSlices: number, otherLabel: string): Pair[] {
   if (pairs.length <= maxSlices) return pairs
   const head = pairs.slice(0, maxSlices - 1)
   const tailSum = pairs.slice(maxSlices - 1).reduce((s, p) => s + p.value, 0)
   return [...head, { name: otherLabel, value: tailSum }]
}

function parseChartTime(name: string): number {
   const t = Date.parse(name)
   return Number.isFinite(t) ? t : 0
}

export type CatalogChartDef = {
   field: string
   type: ChartType
   size: number
}

type ChartPanelProps = {
   model: DataModels
   chart: CatalogChartDef
   statsQuery: Record<string, string | number | boolean>
   title: string
   otherLabel: string
   annotrieveBuscoHint: string
   exportFilenameBase: string
   t: (key: string) => string
}

function ChartPanel({
   model,
   chart,
   statsQuery,
   title,
   otherLabel,
   annotrieveBuscoHint,
   exportFilenameBase,
   t,
}: ChartPanelProps) {
   const exportRootRef = useRef<HTMLDivElement>(null)
   const gradId = useId().replace(/:/g, '')
   const [stats, setStats] = useState<Record<string, number> | null>(null)
   const [loading, setLoading] = useState(true)
   const [error, setError] = useState<string | null>(null)

   const statsQueryKey = JSON.stringify(statsQuery)

   useEffect(() => {
      let cancelled = false
      setLoading(true)
      setError(null)
      const q = toStatsQueryRecord(statsQuery)
      void fetchFieldStats(model, chart.field, q)
         .then((raw) => {
            if (!cancelled) setStats(raw)
         })
         .catch((e: unknown) => {
            if (!cancelled) {
               setStats(null)
               setError(e instanceof Error ? e.message : String(e))
            }
         })
         .finally(() => {
            if (!cancelled) setLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [model, chart.field, statsQueryKey])

   const pairsFull = useMemo(() => buildPairs(stats), [stats])

   const pairs = useMemo(() => {
      if (chart.type === 'dateline') return pairsFull
      return truncatePairs(pairsFull, MAX_CATEGORICAL_SLICES, otherLabel)
   }, [chart.type, pairsFull, otherLabel])

   const buscoVacuous =
      model === 'annotations' &&
      chart.field === 'metadata.busco.busco_lineage' &&
      pairsFull.length === 1 &&
      pairsFull[0].name === 'No entry'

   const chartConfig: ChartConfig = useMemo(() => {
      const cfg: ChartConfig = {}
      pairs.forEach((p, i) => {
         cfg[`slice_${i}`] = {
            label: p.name,
            color: chartColorAt(model, i),
         }
      })
      return cfg
   }, [pairs, model])

   const pieData = pairs.map((p, i) => ({ ...p, fill: chartColorAt(model, i) }))

   const lineData = [...pairsFull]
      .sort((a, b) => parseChartTime(a.name) - parseChartTime(b.name))
      .map((p) => ({ label: p.name, count: p.value }))

   const lineStroke = chartColorAt(model, 0)

   const canExportImage = Boolean(stats && !loading && !error && pairs.length > 0)
   const [pngBusy, setPngBusy] = useState(false)

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
                  {chart.field}
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
               <div className="flex h-[240px] items-center justify-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
               </div>
            ) : error ? (
               <p className="py-8 text-center text-sm text-destructive">{error}</p>
            ) : pairs.length === 0 ? (
               <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No data</p>
                  {model === 'annotations' && chart.field === 'metadata.busco.busco_lineage' ? (
                     <p className="mt-2 text-xs text-muted-foreground">{annotrieveBuscoHint}</p>
                  ) : null}
               </div>
            ) : (
               <>
                  {chart.type === 'pie' && buscoVacuous ? (
                     <p className="mb-2 flex items-start gap-2 rounded-md border border-border/80 bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span>{annotrieveBuscoHint}</span>
                     </p>
                  ) : null}
                  <div ref={exportRootRef} className="min-w-0 w-full">
                     {chart.type === 'pie' ? (
                        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px] w-full">
                           <PieChart margin={{ top: 4, right: 8, bottom: 8, left: 8 }}>
                              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                              <Pie
                                 data={pieData}
                                 dataKey="value"
                                 nameKey="name"
                                 cx="50%"
                                 cy="46%"
                                 innerRadius={48}
                                 outerRadius={92}
                                 paddingAngle={2}
                                 stroke="var(--border)"
                                 strokeWidth={1}
                              >
                                 {pieData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.fill} />
                                 ))}
                              </Pie>
                              <Legend
                                 verticalAlign="bottom"
                                 height={36}
                                 formatter={(value) => (
                                    <span className="text-[11px] text-muted-foreground">{value}</span>
                                 )}
                              />
                           </PieChart>
                        </ChartContainer>
                     ) : chart.type === 'bar' ? (
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                           <BarChart data={pairs} margin={{ left: 10, right: 10, top: 12, bottom: 48 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                              <XAxis
                                 dataKey="name"
                                 tickLine={false}
                                 axisLine={false}
                                 tick={{ fontSize: 10 }}
                                 interval={0}
                                 angle={-32}
                                 textAnchor="end"
                                 height={72}
                              />
                              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={44} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={48}>
                                 {pairs.map((_, i) => (
                                    <Cell key={i} fill={chartColorAt(model, i)} />
                                 ))}
                              </Bar>
                           </BarChart>
                        </ChartContainer>
                     ) : (
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                           <ComposedChart data={lineData} margin={{ left: 10, right: 10, top: 12, bottom: 8 }}>
                              <defs>
                                 <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={lineStroke} stopOpacity={0.35} />
                                    <stop offset="92%" stopColor={lineStroke} stopOpacity={0.04} />
                                    <stop offset="100%" stopColor={lineStroke} stopOpacity={0} />
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={44} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Area
                                 type="monotone"
                                 dataKey="count"
                                 stroke="transparent"
                                 fill={`url(#${gradId})`}
                                 fillOpacity={1}
                                 isAnimationActive={false}
                              />
                              <Line
                                 type="monotone"
                                 dataKey="count"
                                 stroke={lineStroke}
                                 strokeWidth={2.5}
                                 dot={{ r: 3, fill: lineStroke, strokeWidth: 0 }}
                                 activeDot={{ r: 5 }}
                              />
                           </ComposedChart>
                        </ChartContainer>
                     )}
                  </div>
               </>
            )}
         </CardContent>
      </Card>
   )
}

function AnnotationSourceSampleNote({
   rows,
   t,
}: {
   rows: Record<string, unknown>[]
   t: (key: string) => string
}) {
   const counts = useMemo(() => {
      let annotrieve = 0
      let portal = 0
      let other = 0
      for (const r of rows) {
         switch (inferAnnotationRowSource(r)) {
            case 'annotrieve':
               annotrieve += 1
               break
            case 'portal_custom':
               portal += 1
               break
            default:
               other += 1
               break
         }
      }
      return { annotrieve, portal, other, n: rows.length }
   }, [rows])

   if (counts.n === 0) return null

   const body = t('catalog.annotationsSourceNoteStats')
      .replace('{n}', String(counts.n))
      .replace('{a}', String(counts.annotrieve))
      .replace('{p}', String(counts.portal))
      .replace('{o}', String(counts.other))

   return (
      <Alert className="border-border/80 bg-muted/20">
         <Info className="h-4 w-4" />
         <AlertTitle className="text-sm">{t('catalog.annotationsSourceNoteTitle')}</AlertTitle>
         <AlertDescription className="text-xs leading-relaxed text-muted-foreground">{body}</AlertDescription>
      </Alert>
   )
}

export type CatalogChartsProps = {
   model: DataModels
   charts: CatalogChartDef[]
   statsQuery: Record<string, string | number | boolean>
   chartTitles: Record<string, string>
   /** First page of list rows — used for annotations source hint only. */
   listSampleRows?: Record<string, unknown>[]
   t: (key: string) => string
}

export function CatalogCharts({
   model,
   charts,
   statsQuery,
   chartTitles,
   listSampleRows,
   t,
}: CatalogChartsProps) {
   if (!charts.length) return null

   const otherLabel = t('catalog.chartOther')
   const annotrieveBuscoHint = t('catalog.chartAnnotrieveBuscoHint')

   return (
      <div className="space-y-4">
         {model === 'annotations' && listSampleRows && listSampleRows.length > 0 ? (
            <AnnotationSourceSampleNote rows={listSampleRows} t={t} />
         ) : null}
         <div className="grid gap-4 md:grid-cols-2">
            {charts.map((ch) => (
               <ChartPanel
                  key={ch.field}
                  model={model}
                  chart={ch}
                  statsQuery={statsQuery}
                  title={chartTitles[ch.field] ?? ch.field}
                  otherLabel={otherLabel}
                  annotrieveBuscoHint={annotrieveBuscoHint}
                  exportFilenameBase={`${model}-${ch.field.replace(/\./g, '_')}`}
                  t={t}
               />
            ))}
         </div>
      </div>
   )
}
