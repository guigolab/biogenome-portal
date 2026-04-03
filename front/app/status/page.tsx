'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table'
import {
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger,
} from '@/components/ui/tooltip'
import { downloadGoatReport } from '@/lib/api/goatReport'
import { fetchOrganisms } from '@/lib/api/organisms'
import { fetchFieldStats } from '@/lib/api/stats'
import { iucnCategoryBadgeClass, iucnRedListBadge } from '@/lib/iucnCategory'
import { statusLabels } from '@/lib/mock-data'
import {
   GOAT_PIPELINE_STEPS,
   INSDC_COUNT_FILTER_CODES,
   INSDC_COUNT_FILTER_DESCRIPTIONS,
   INSDC_COUNT_FILTER_LABELS,
   INSDC_PIPELINE_STEPS,
   PIPELINE_SWATCH_CLASSES,
   TARGET_LIST_PIPELINE_STEPS,
   TARGET_LIST_STATUS_LABELS,
   type StatusPipelineStep,
   goatChipState,
   goatStatusRank,
   insdcStepLitFromCounts,
   labelGoatStatus,
   labelTargetListStatus,
   type GoatChipState,
} from '@/lib/organismStatusLabels'
import { usePortalConfig } from '@/contexts/portal-context'
import { cn } from '@/lib/utils'
import { FeatureGate } from '@/components/feature-gate'
import {
   ArrowRight,
   BarChart3,
   BookOpen,
   CheckCircle2,
   ChevronDown,
   Database,
   Download,
   FileSpreadsheet,
   FileText,
   FlaskConical,
   Home,
   Loader2,
   Microscope,
   TrendingUp,
   Upload,
   XCircle,
} from 'lucide-react'

const IUCN_STATS_FIELD = 'iucn_redlist.category'
const IUCN_ROW_KEYS = ['CR', 'EN', 'VU', 'NT', 'LC'] as const
const TABLE_PAGE_SIZE = 50
const GOAT_DONE = 'Publication Available'
const INSDC_DONE = 'Annotation Completed'

type PipelineMode = 'goat' | 'insdc'

function speciesHref(taxid: string): string {
   return `/species/${encodeURIComponent(taxid)}`
}

function sumStats(s: Record<string, number>): number {
   return Object.values(s).reduce((a, b) => a + b, 0)
}

function normalizeStatusValue(raw: unknown, fallback = 'No Entry'): string {
   if (raw == null || raw === '') return fallback
   return String(raw)
}

function pipelineStepIcon(st: StatusPipelineStep, mode: PipelineMode): React.ComponentType<{ className?: string }> {
   const v = st.value
   if (mode === 'goat') {
      if (v === 'No Entry') return XCircle
      if (v === 'Sample Collected') return FlaskConical
      if (v === 'Sample Acquired') return Home
      if (v === 'Data Generation') return Microscope
      if (v === 'In Assembly') return Database
      if (v === 'INSDC Submitted') return Upload
      return BookOpen
   }
   if (v === 'No Entry') return XCircle
   if (v === 'Biosample Submitted') return FlaskConical
   if (v === 'Reads Submitted') return Database
   if (v === 'Assemblies Submitted') return Microscope
   return FileText
}

function toggleInList(list: string[], value: string, checked: boolean): string[] {
   if (checked) return list.includes(value) ? list : [...list, value]
   return list.filter((x) => x !== value)
}

type MultiSelectOption = { value: string; label: string; description?: string; count?: number }

function goatPipelineChipClass(state: GoatChipState): string {
   switch (state) {
      case 'completed':
         return 'border-emerald-600/45 bg-emerald-500/[0.12] text-emerald-950 dark:text-emerald-100'
      case 'current':
         return 'border-primary bg-primary text-primary-foreground shadow-sm'
      default:
         return 'border-border bg-background text-muted-foreground opacity-55'
   }
}

function insdcPipelineChipClass(lit: boolean): string {
   if (lit) return 'border-chart-2/70 bg-chart-2/15 text-foreground'
   return 'border-border bg-background text-muted-foreground opacity-55'
}

function StatusMultiSelect({
   label,
   options,
   selected,
   onChange,
   emptyLabel,
   disabled,
}: {
   label: string
   options: MultiSelectOption[]
   selected: string[]
   onChange: (next: string[]) => void
   emptyLabel: string
   disabled?: boolean
}) {
   const [open, setOpen] = useState(false)
   const summary =
      selected.length === 0
         ? emptyLabel
         : selected.length === 1
           ? options.find((o) => o.value === selected[0])?.label ?? `${selected.length} selected`
           : `${selected.length} selected`

   return (
      <div className="space-y-2">
         <span className="text-sm font-medium leading-none">{label}</span>
         <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
               <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={disabled}
                  className="w-full justify-between font-normal h-10 px-3"
               >
                  <span className="truncate text-left">{summary}</span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
               </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
               <div className="max-h-[min(60vh,20rem)] overflow-y-auto p-2">
                  {options.map((opt) => {
                     const isChecked = selected.includes(opt.value)
                     return (
                        <label
                           key={opt.value}
                           className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-accent/80',
                           )}
                        >
                           <Checkbox
                              checked={isChecked}
                              onCheckedChange={(c) =>
                                 onChange(toggleInList(selected, opt.value, c === true))
                              }
                              className="mt-0.5"
                           />
                           <span className="min-w-0 flex-1">
                              <span className="font-medium leading-tight block">{opt.label}</span>
                              {opt.description ? (
                                 <span className="text-xs text-muted-foreground leading-snug block mt-0.5">
                                    {opt.description}
                                 </span>
                              ) : null}
                              {typeof opt.count === 'number' ? (
                                 <Badge variant="secondary" className="mt-1 tabular-nums text-[10px]">
                                    {opt.count.toLocaleString()}
                                 </Badge>
                              ) : null}
                           </span>
                        </label>
                     )
                  })}
               </div>
               <Separator />
               <div className="flex gap-2 p-2">
                  <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     className="flex-1"
                     onClick={() => onChange(options.map((o) => o.value))}
                  >
                     Select all
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => onChange([])}>
                     Clear
                  </Button>
               </div>
            </PopoverContent>
         </Popover>
         <p className="text-xs text-muted-foreground">
            Leave empty for no restriction. Multiple selections match any chosen value (OR).
         </p>
      </div>
   )
}

export default function StatusTrackerPage() {
   const { config } = usePortalConfig()
   const general = config?.general as { goat?: boolean; insdcStatus?: boolean } | undefined
   const hasGoat = general?.goat === true
   const hasInsdc = general?.insdcStatus === true

   const [mode, setMode] = useState<PipelineMode>('goat')
   useEffect(() => {
      if (hasGoat) setMode('goat')
      else if (hasInsdc) setMode('insdc')
      else setMode('goat')
   }, [hasGoat, hasInsdc])

   const [primarySelection, setPrimarySelection] = useState<string[]>([])
   const [targetListSelection, setTargetListSelection] = useState<string[]>([])

   useEffect(() => {
      setPrimarySelection([])
      setTargetListSelection([])
   }, [mode])

   const [goatStats, setGoatStats] = useState<Record<string, number> | null>(null)
   const [insdcStats, setInsdcStats] = useState<Record<string, number> | null>(null)
   const [insdcCountTotals, setInsdcCountTotals] = useState<Record<string, number> | null>(null)
   const [insdcCountLoading, setInsdcCountLoading] = useState(false)
   const [insdcCountError, setInsdcCountError] = useState<string | null>(null)
   const [targetListStats, setTargetListStats] = useState<Record<string, number> | null>(null)
   const [statsLoading, setStatsLoading] = useState(true)
   const [statsError, setStatsError] = useState<string | null>(null)

   const [iucnTotals, setIucnTotals] = useState<Record<string, number> | null>(null)
   const [iucnGoatByCategory, setIucnGoatByCategory] = useState<Record<string, Record<string, number>> | null>(null)
   const [iucnLoading, setIucnLoading] = useState(true)
   const [iucnError, setIucnError] = useState<string | null>(null)

   const [rows, setRows] = useState<Record<string, unknown>[]>([])
   const [tableTotal, setTableTotal] = useState(0)
   const [tableLoading, setTableLoading] = useState(false)
   const [tableLoadingMore, setTableLoadingMore] = useState(false)
   const [tableError, setTableError] = useState<string | null>(null)

   const [goatReportLoading, setGoatReportLoading] = useState(false)
   const [goatReportError, setGoatReportError] = useState<string | null>(null)

   useEffect(() => {
      if (!config || (!hasGoat && !hasInsdc)) return
      let cancelled = false
      setStatsLoading(true)
      setStatsError(null)
      ;(async () => {
         try {
            const tasks: Promise<void>[] = []
            if (hasInsdc) {
               tasks.push(
                  fetchFieldStats('organisms', 'insdc_status', {}).then((s) => {
                     if (!cancelled) setInsdcStats(s)
                  }),
               )
            }
            if (hasGoat) {
               tasks.push(
                  Promise.all([
                     fetchFieldStats('organisms', 'goat_status', {}),
                     fetchFieldStats('organisms', 'target_list_status', {}),
                  ]).then(([g, tls]) => {
                     if (!cancelled) {
                        setGoatStats(g)
                        setTargetListStats(tls)
                     }
                  }),
               )
            }
            await Promise.all(tasks)
         } catch (e) {
            if (!cancelled) {
               setStatsError(e instanceof Error ? e.message : String(e))
               setGoatStats(null)
               setInsdcStats(null)
               setTargetListStats(null)
            }
         } finally {
            if (!cancelled) setStatsLoading(false)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [config, hasGoat, hasInsdc])

   useEffect(() => {
      if (!config || (!hasGoat && !hasInsdc)) return
      let cancelled = false
      setIucnLoading(true)
      setIucnError(null)
      ;(async () => {
         try {
            const totals = await fetchFieldStats('organisms', IUCN_STATS_FIELD, {})
            if (cancelled) return
            setIucnTotals(totals)
            const byCat: Record<string, Record<string, number>> = {}
            await Promise.all(
               IUCN_ROW_KEYS.map(async (code) => {
                  const g = await fetchFieldStats('organisms', 'goat_status', {
                     iucn_redlist__category: code,
                  })
                  if (!cancelled) byCat[code] = g
               }),
            )
            if (!cancelled) setIucnGoatByCategory(byCat)
         } catch (e) {
            if (!cancelled) {
               setIucnError(e instanceof Error ? e.message : String(e))
               setIucnTotals(null)
               setIucnGoatByCategory(null)
            }
         } finally {
            if (!cancelled) setIucnLoading(false)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [config, hasGoat, hasInsdc])

   useEffect(() => {
      if (!config || !hasInsdc) return
      let cancelled = false
      setInsdcCountLoading(true)
      setInsdcCountError(null)
      void Promise.all(
         INSDC_COUNT_FILTER_CODES.map((code) =>
            fetchOrganisms({ limit: 1, offset: 0, insdc_counts_any: code }),
         ),
      )
         .then((results) => {
            if (cancelled) return
            const next: Record<string, number> = {}
            INSDC_COUNT_FILTER_CODES.forEach((code, i) => {
               next[code] = results[i]?.total ?? 0
            })
            setInsdcCountTotals(next)
         })
         .catch((e) => {
            if (!cancelled) {
               setInsdcCountError(e instanceof Error ? e.message : String(e))
               setInsdcCountTotals(null)
            }
         })
         .finally(() => {
            if (!cancelled) setInsdcCountLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [config, hasInsdc])

   const activeSteps = useMemo((): StatusPipelineStep[] => {
      return mode === 'goat' ? GOAT_PIPELINE_STEPS : INSDC_PIPELINE_STEPS
   }, [mode])

   const activeStats = useMemo(() => {
      return mode === 'goat' ? goatStats ?? {} : insdcStats ?? {}
   }, [mode, goatStats, insdcStats])

   const totalSpecies = useMemo(() => sumStats(activeStats), [activeStats])
   const noEntryCount = activeStats['No Entry'] ?? 0

   const completedCount = useMemo(() => {
      return mode === 'goat' ? (activeStats[GOAT_DONE] ?? 0) : (activeStats[INSDC_DONE] ?? 0)
   }, [mode, activeStats])

   const inProgressCount = useMemo(() => {
      const done = mode === 'goat' ? (activeStats[GOAT_DONE] ?? 0) : (activeStats[INSDC_DONE] ?? 0)
      return Math.max(0, totalSpecies - noEntryCount - done)
   }, [mode, activeStats, totalSpecies, noEntryCount])

   const completionRate = useMemo(() => {
      if (totalSpecies <= 0) return 0
      const done = mode === 'goat' ? (activeStats[GOAT_DONE] ?? 0) : (activeStats[INSDC_DONE] ?? 0)
      return Math.round((done / totalSpecies) * 100)
   }, [mode, activeStats, totalSpecies])

   const primaryFilterOptions = useMemo((): MultiSelectOption[] => {
      if (mode === 'goat') {
         return GOAT_PIPELINE_STEPS.map((st) => ({
            value: st.value,
            label: st.label,
            description: st.description,
            count: goatStats?.[st.value],
         }))
      }
      return INSDC_COUNT_FILTER_CODES.map((code) => ({
         value: code,
         label: INSDC_COUNT_FILTER_LABELS[code],
         description: INSDC_COUNT_FILTER_DESCRIPTIONS[code],
         count: insdcCountTotals?.[code],
      }))
   }, [mode, goatStats, insdcCountTotals])

   const targetListFilterOptions = useMemo((): MultiSelectOption[] => {
      const stats = targetListStats ?? {}
      return TARGET_LIST_PIPELINE_STEPS.map((st) => ({
         value: st.value,
         label: TARGET_LIST_STATUS_LABELS[st.value] ?? st.label,
         description: st.description,
         count: stats[st.value],
      }))
   }, [targetListStats])

   const tableQuery = useMemo(() => {
      const q: Record<string, string | number> = {
         limit: TABLE_PAGE_SIZE,
         offset: 0,
         sort_column: 'scientific_name',
         sort_order: 'asc',
      }
      if (mode === 'goat') {
         if (primarySelection.length > 0) q.goat_status__in = primarySelection.join(',')
         if (targetListSelection.length > 0) q.target_list_status__in = targetListSelection.join(',')
      } else {
         if (primarySelection.length > 0) q.insdc_counts_any = primarySelection.join(',')
      }
      return q
   }, [mode, primarySelection, targetListSelection])

   useEffect(() => {
      if (!config || (!hasGoat && !hasInsdc)) return
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
   }, [config, hasGoat, hasInsdc, tableQuery])

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

   const showModeToggle = hasGoat && hasInsdc

   const conservationCard = (
      <Card className="mb-8">
         <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
               <CardTitle>Sequencing by conservation status</CardTitle>
               <CardDescription>
                  Share of each IUCN band with GoaT “publication available” (genome described in literature).
               </CardDescription>
            </div>
            {iucnLoading ? (
               <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
            ) : null}
         </CardHeader>
         <CardContent>
            {iucnError ? (
               <p className="text-sm text-destructive">{iucnError}</p>
            ) : (
               <div className="space-y-4">
                  {IUCN_ROW_KEYS.map((code) => {
                     const total = iucnTotals?.[code] ?? 0
                     const goatFor = iucnGoatByCategory?.[code] ?? {}
                     const completed = goatFor[GOAT_DONE] ?? 0
                     const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
                     return (
                        <div key={code} className="space-y-2">
                           <div className="flex items-center justify-between text-sm gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                 <Badge
                                    className={cn('w-12 justify-center shrink-0', iucnCategoryBadgeClass(code))}
                                 >
                                    {code}
                                 </Badge>
                                 <span className="text-muted-foreground truncate">
                                    {statusLabels[code] ?? code}
                                 </span>
                              </div>
                              <span className="shrink-0 tabular-nums text-xs sm:text-sm">
                                 {completed.toLocaleString()} / {total.toLocaleString()} with publication ({percentage}
                                 %)
                              </span>
                           </div>
                           <Progress value={percentage} className="h-2" />
                        </div>
                     )
                  })}
               </div>
            )}
         </CardContent>
      </Card>
   )

   return (
      <FeatureGate feature="progress">
         <TooltipProvider delayDuration={300}>
            <div className="min-h-screen bg-background">
               <div className="container mx-auto px-4 py-8">
                  <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                     <div className="min-w-0">
                        <h1 className="text-3xl font-bold mb-2">Sequencing Status Tracker</h1>
                        <p className="text-muted-foreground">
                           Browse species by GoaT or INSDC pipeline stage (as enabled for this portal).
                        </p>
                     </div>
                     {showModeToggle ? (
                        <div
                           className="inline-flex rounded-lg border border-border bg-muted/40 p-1 shrink-0"
                           role="group"
                           aria-label="Pipeline type"
                        >
                           {hasGoat ? (
                              <Button
                                 type="button"
                                 size="sm"
                                 variant={mode === 'goat' ? 'default' : 'ghost'}
                                 className="rounded-md px-4"
                                 onClick={() => setMode('goat')}
                              >
                                 GoaT status
                              </Button>
                           ) : null}
                           {hasInsdc ? (
                              <Button
                                 type="button"
                                 size="sm"
                                 variant={mode === 'insdc' ? 'default' : 'ghost'}
                                 className="rounded-md px-4"
                                 onClick={() => setMode('insdc')}
                              >
                                 INSDC status
                              </Button>
                           ) : null}
                        </div>
                     ) : null}
                  </div>

                  {statsError ? (
                     <p className="mb-6 text-sm text-destructive" role="alert">
                        {statsError}
                     </p>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                     <Card>
                        <CardContent className="p-6">
                           <div className="flex items-center justify-between">
                              <div>
                                 <p className="text-sm text-muted-foreground">Total species</p>
                                 <p className="text-3xl font-bold mt-1">
                                    {statsLoading ? '—' : totalSpecies.toLocaleString()}
                                 </p>
                              </div>
                              <div className="p-3 rounded-lg bg-primary/10">
                                 <BarChart3 className="h-6 w-6 text-primary" />
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                     <Card>
                        <CardContent className="p-6">
                           <div className="flex items-center justify-between">
                              <div>
                                 <p className="text-sm text-muted-foreground">Completed</p>
                                 <p className="text-3xl font-bold mt-1 text-chart-1">
                                    {statsLoading ? '—' : completedCount.toLocaleString()}
                                 </p>
                              </div>
                              <div className="p-3 rounded-lg bg-chart-1/10">
                                 <CheckCircle2 className="h-6 w-6 text-chart-1" />
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                     <Card>
                        <CardContent className="p-6">
                           <div className="flex items-center justify-between">
                              <div>
                                 <p className="text-sm text-muted-foreground">In progress</p>
                                 <p className="text-3xl font-bold mt-1 text-chart-2">
                                    {statsLoading ? '—' : inProgressCount.toLocaleString()}
                                 </p>
                              </div>
                              <div className="p-3 rounded-lg bg-chart-2/10">
                                 <Microscope className="h-6 w-6 text-chart-2" />
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                     <Card>
                        <CardContent className="p-6">
                           <div className="flex items-center justify-between">
                              <div>
                                 <p className="text-sm text-muted-foreground">Completion rate</p>
                                 <p className="text-3xl font-bold mt-1">
                                    {statsLoading ? '—' : `${completionRate}%`}
                                 </p>
                              </div>
                              <div className="p-3 rounded-lg bg-chart-4/10">
                                 <TrendingUp className="h-6 w-6 text-chart-4" />
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  </div>

                  {hasGoat && mode === 'goat' ? (
                     <Card className="mb-8 border-primary/25 bg-primary/5 shadow-sm">
                        <CardHeader className="pb-2">
                           <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex gap-3">
                                 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                                    <FileSpreadsheet className="h-5 w-5" />
                                 </div>
                                 <div>
                                    <CardTitle className="text-lg">GoaT species report (TSV)</CardTitle>
                                    <CardDescription className="mt-1.5 max-w-2xl text-pretty">
                                       Download a tab-separated file of <strong>all species</strong> in this portal in
                                       the standard GoaT report schema (project metadata headers, taxon id, species
                                       names, target list status, sequencing status mapped for GoaT, publications,
                                       etc.). Use this file for GoaT registry updates or offline review.
                                    </CardDescription>
                                 </div>
                              </div>
                              <Button
                                 type="button"
                                 className="shrink-0 gap-2"
                                 disabled={goatReportLoading}
                                 onClick={() => void onDownloadGoat()}
                              >
                                 {goatReportLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                 ) : (
                                    <Download className="h-4 w-4" />
                                 )}
                                 Download TSV
                              </Button>
                           </div>
                           {goatReportError ? (
                              <p className="text-sm text-destructive mt-2">{goatReportError}</p>
                           ) : null}
                        </CardHeader>
                     </Card>
                  ) : null}

                  {/* Pipeline reference: steps, counts, descriptions */}
                  <Card className="mb-8 overflow-hidden">
                     <CardHeader className="pb-2">
                        <CardTitle className="text-lg">
                           {mode === 'goat' ? 'GoaT pipeline' : 'INSDC submission ladder'}
                        </CardTitle>
                        <CardDescription>
                           {mode === 'goat'
                              ? 'Distribution by recorded GoaT sequencing stage (same definitions as the home progress widget).'
                              : 'Distribution by derived INSDC submission stage. Table filters use catalog counts (OR when several are selected).'}
                        </CardDescription>
                     </CardHeader>
                     <CardContent className="pt-2">
                        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
                           {activeSteps.map((st, index) => {
                              const Icon = pipelineStepIcon(st, mode)
                              const count = activeStats[st.value] ?? 0
                              const pct = totalSpecies > 0 ? Math.round((count / totalSpecies) * 100) : 0
                              const swatch =
                                 PIPELINE_SWATCH_CLASSES[st.swatchIndex % PIPELINE_SWATCH_CLASSES.length]
                              return (
                                 <div key={st.value} className="flex items-stretch shrink-0 snap-start">
                                    <Tooltip>
                                       <TooltipTrigger asChild>
                                          <div
                                             className={cn(
                                                'flex w-[min(11rem,calc(100vw-4rem))] flex-col rounded-xl border bg-card p-3 text-left shadow-sm transition-colors',
                                                count > 0 ? 'border-border' : 'border-transparent bg-muted/30',
                                             )}
                                          >
                                             <div className="flex items-center gap-2 mb-2">
                                                <div
                                                   className={cn(
                                                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                                                      swatch,
                                                   )}
                                                >
                                                   <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                   <p className="text-sm font-semibold leading-tight line-clamp-2">
                                                      {st.label}
                                                   </p>
                                                   <p className="text-lg font-bold tabular-nums leading-none mt-0.5">
                                                      {statsLoading ? '—' : count.toLocaleString()}
                                                   </p>
                                                </div>
                                             </div>
                                             <p className="text-[11px] text-muted-foreground leading-snug line-clamp-4">
                                                {st.description}
                                             </p>
                                             <p className="text-[10px] text-muted-foreground/80 mt-1.5 tabular-nums">
                                                {pct}% of portal
                                             </p>
                                          </div>
                                       </TooltipTrigger>
                                       <TooltipContent side="top" className="max-w-xs">
                                          <p className="font-medium">{st.label}</p>
                                          <p className="text-xs text-muted-foreground mt-1">{st.description}</p>
                                       </TooltipContent>
                                    </Tooltip>
                                    {index < activeSteps.length - 1 ? (
                                       <div className="flex items-center px-0.5 text-muted-foreground/40">
                                          <ArrowRight className="h-4 w-4 hidden sm:block" aria-hidden />
                                       </div>
                                    ) : null}
                                 </div>
                              )
                           })}
                        </div>
                        <div className="mt-4">
                           <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Overall completion ({mode === 'goat' ? 'publication' : 'annotation'} stage)</span>
                              <span className="font-medium">{completionRate}%</span>
                           </div>
                           <Progress value={completionRate} className="h-2" />
                        </div>
                     </CardContent>
                  </Card>

                  {conservationCard}

                  {/* Multi-select filters — directly above the species table */}
                  <Card className="mb-8">
                     <CardHeader>
                        <CardTitle className="text-base">Table filters</CardTitle>
                        <CardDescription>
                           {mode === 'goat'
                              ? 'Narrow the list by GoaT stage and optionally target-list tier. Empty = all stages. Multiple GoaT stages match any selected value.'
                              : 'Narrow the list by catalog counts (BioSamples, reads, assemblies, annotations, or none). Multiple choices match any selected bucket (OR).'}
                        </CardDescription>
                        {mode === 'insdc' && insdcCountError ? (
                           <p className="text-sm text-destructive mt-2" role="alert">
                              {insdcCountError}
                           </p>
                        ) : null}
                     </CardHeader>
                     <CardContent className="grid gap-6 sm:grid-cols-2">
                        <StatusMultiSelect
                           label={mode === 'goat' ? 'GoaT status' : 'INSDC catalog counts'}
                           options={primaryFilterOptions}
                           selected={primarySelection}
                           onChange={setPrimarySelection}
                           emptyLabel={mode === 'goat' ? 'All GoaT stages' : 'All INSDC buckets'}
                           disabled={mode === 'goat' ? statsLoading : insdcCountLoading}
                        />
                        {mode === 'goat' ? (
                           <StatusMultiSelect
                              label="Target list tier"
                              options={targetListFilterOptions}
                              selected={targetListSelection}
                              onChange={setTargetListSelection}
                              emptyLabel="All target list tiers"
                           />
                        ) : (
                           <div className="hidden sm:block" aria-hidden />
                        )}
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                        <CardTitle className="text-base">Species</CardTitle>
                        {tableLoading ? (
                           <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                           <span className="text-sm text-muted-foreground tabular-nums">
                              {tableTotal.toLocaleString()} total
                           </span>
                        )}
                     </CardHeader>
                     <CardContent>
                        {tableError ? (
                           <p className="text-sm text-destructive mb-4">{tableError}</p>
                        ) : null}
                        {tableLoading && rows.length === 0 ? (
                           <div className="flex justify-center py-16 text-muted-foreground">
                              <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
                           </div>
                        ) : rows.length === 0 ? (
                           <p className="py-8 text-center text-sm text-muted-foreground">
                              No species match these filters.
                           </p>
                        ) : (
                           <>
                              <Table>
                                 <TableHeader>
                                    <TableRow>
                                       <TableHead className="min-w-[10rem]">Scientific name</TableHead>
                                       <TableHead className="min-w-[8rem]">Common name</TableHead>
                                       <TableHead>Taxid</TableHead>
                                       {mode === 'goat' ? (
                                          <TableHead className="min-w-[8rem]">Target list</TableHead>
                                       ) : null}
                                       <TableHead className="min-w-[12rem]">
                                          {mode === 'goat' ? 'GoaT pipeline' : 'INSDC pipeline'}
                                       </TableHead>
                                       <TableHead>IUCN</TableHead>
                                       <TableHead className="text-right">Genomes</TableHead>
                                    </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                    {rows.map((row, idx) => {
                                       const taxid = row.taxid != null ? String(row.taxid) : ''
                                       const sci =
                                          typeof row.scientific_name === 'string'
                                             ? row.scientific_name
                                             : taxid || '—'
                                       const common =
                                          typeof row.insdc_common_name === 'string'
                                             ? row.insdc_common_name
                                             : ''
                                       const assemblies =
                                          typeof row.assemblies_count === 'number' ? row.assemblies_count : 0
                                       const iucn = iucnRedListBadge(row)
                                       const goatPrimary = normalizeStatusValue(row.goat_status)
                                       const goatRank = goatStatusRank(goatPrimary)
                                       const tls = labelTargetListStatus(row.target_list_status)
                                       const insdcLitLabels = INSDC_PIPELINE_STEPS.filter((st) =>
                                          insdcStepLitFromCounts(row as Record<string, unknown>, st.value),
                                       ).map((st) => st.label)

                                       return (
                                          <TableRow key={taxid || `row-${idx}`}>
                                             <TableCell className="font-medium">
                                                <Link
                                                   href={speciesHref(taxid)}
                                                   className="text-primary hover:underline underline-offset-2"
                                                >
                                                   {sci}
                                                </Link>
                                             </TableCell>
                                             <TableCell className="text-muted-foreground max-w-[14rem] truncate">
                                                {common || '—'}
                                             </TableCell>
                                             <TableCell className="font-mono text-xs tabular-nums">
                                                {taxid || '—'}
                                             </TableCell>
                                             {mode === 'goat' ? (
                                                <TableCell className="text-muted-foreground text-xs">
                                                   {tls || '—'}
                                                </TableCell>
                                             ) : null}
                                             <TableCell>
                                                <div
                                                   className="flex flex-wrap gap-1 max-w-[28rem]"
                                                   role="list"
                                                   aria-label={
                                                      mode === 'goat'
                                                         ? `GoaT pipeline; recorded stage: ${labelGoatStatus(goatPrimary)}`
                                                         : `INSDC catalog counts; active: ${insdcLitLabels.length ? insdcLitLabels.join(', ') : 'none'}`
                                                   }
                                                >
                                                   {activeSteps.map((st, stepIdx) => {
                                                      const goatState =
                                                         mode === 'goat'
                                                            ? goatChipState(stepIdx, goatRank)
                                                            : 'todo'
                                                      const insdcLit =
                                                         mode === 'insdc'
                                                            ? insdcStepLitFromCounts(row as Record<string, unknown>, st.value)
                                                            : false
                                                      const chipClass =
                                                         mode === 'goat'
                                                            ? goatPipelineChipClass(goatState)
                                                            : insdcPipelineChipClass(insdcLit)
                                                      return (
                                                         <Tooltip key={st.value}>
                                                            <TooltipTrigger asChild>
                                                               <span
                                                                  role="listitem"
                                                                  className={cn(
                                                                     'inline-flex max-w-[9rem] cursor-default items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none transition-colors',
                                                                     chipClass,
                                                                  )}
                                                               >
                                                                  {mode === 'goat' && goatState === 'completed' ? (
                                                                     <CheckCircle2
                                                                        className="h-3 w-3 shrink-0 opacity-90"
                                                                        aria-hidden
                                                                     />
                                                                  ) : null}
                                                                  <span className="truncate">{st.label}</span>
                                                               </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="max-w-xs">
                                                               <p className="font-medium">{st.label}</p>
                                                               <p className="text-xs text-muted-foreground mt-1">
                                                                  {st.description}
                                                               </p>
                                                            </TooltipContent>
                                                         </Tooltip>
                                                      )
                                                   })}
                                                </div>
                                             </TableCell>
                                             <TableCell>
                                                {iucn ? (
                                                   <Badge
                                                      className={cn('text-xs', iucn.className)}
                                                      title={iucn.title}
                                                   >
                                                      {iucn.code}
                                                   </Badge>
                                                ) : (
                                                   <span className="text-muted-foreground">—</span>
                                                )}
                                             </TableCell>
                                             <TableCell className="text-right tabular-nums">{assemblies}</TableCell>
                                          </TableRow>
                                       )
                                    })}
                                 </TableBody>
                              </Table>
                              {rows.length < tableTotal ? (
                                 <div className="mt-6 flex justify-center">
                                    <Button
                                       type="button"
                                       variant="outline"
                                       onClick={() => void loadMore()}
                                       disabled={tableLoadingMore}
                                    >
                                       {tableLoadingMore ? (
                                          <>
                                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                             Loading…
                                          </>
                                       ) : (
                                          `Load more (${(tableTotal - rows.length).toLocaleString()} left)`
                                       )}
                                    </Button>
                                 </div>
                              ) : null}
                           </>
                        )}
                     </CardContent>
                  </Card>
               </div>
            </div>
         </TooltipProvider>
      </FeatureGate>
   )
}
