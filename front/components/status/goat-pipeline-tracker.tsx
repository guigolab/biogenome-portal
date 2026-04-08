'use client'

import { useMemo } from 'react'
import {
   TARGET_LIST_PIPELINE_STEPS,
   TARGET_LIST_STATUS_LABELS,
} from '@/lib/organismStatusLabels'
import type { GoatTrackerStage } from '@/lib/goatPipelineTracker'
import { useLocale } from '@/contexts/locale-context'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CircleHelp, Loader2 } from 'lucide-react'

function interpolate(template: string, vars: Record<string, string | number>): string {
   let out = template
   for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v))
   }
   return out
}

type GoatPipelineTrackerProps = {
   stages: GoatTrackerStage[]
   totalSpecies: number
   loading: boolean
   selectedGoatStatuses: string[]
   onToggleGoatStatus: (stageKey: string) => void
   targetListFilter: string
   onToggleTargetList: (value: string) => void
   targetListStats: Record<string, number> | null
}

export function GoatPipelineTracker({
   stages,
   totalSpecies,
   loading,
   selectedGoatStatuses,
   onToggleGoatStatus,
   targetListFilter,
   onToggleTargetList,
   targetListStats,
}: GoatPipelineTrackerProps) {
   const { t } = useLocale()

   const selectedStageDetails = useMemo(() => {
      return stages.filter((s) => selectedGoatStatuses.includes(s.key))
   }, [stages, selectedGoatStatuses])

   const targetListSelection = useMemo(() => {
      if (!targetListFilter || targetListFilter === 'No Entry') return null
      const step = TARGET_LIST_PIPELINE_STEPS.find((st) => st.value === targetListFilter)
      if (!step) return null
      const label =
         TARGET_LIST_STATUS_LABELS[targetListFilter as keyof typeof TARGET_LIST_STATUS_LABELS] ?? step.label
      return { step, label }
   }, [targetListFilter])

   const hasSelection =
      selectedStageDetails.length > 0 || targetListSelection !== null

   const barSegments = stages.filter((s) => s.pct > 0)

   return (
      <section className="space-y-5" aria-labelledby="goat-pipeline-heading">
         <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1">
               <h2
                  id="goat-pipeline-heading"
                  className="text-lg font-semibold tracking-tight text-foreground"
               >
                  {t('statusPage.pipelineTitle')}
               </h2>
               <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {loading ? (
                     <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                        {t('statusPage.pipelineLoading')}
                     </span>
                  ) : (
                     <>
                        {t('statusPage.pipelineHelp')}{' '}
                        <span className="text-foreground/90 tabular-nums font-medium">
                           {interpolate(t('statusPage.pipelineTotal'), { count: totalSpecies.toLocaleString() })}
                        </span>
                     </>
                  )}
               </p>
            </div>
            <div className="flex w-full flex-col gap-2 lg:max-w-[min(100%,28rem)] lg:shrink-0">
               <span className="text-xs font-medium text-muted-foreground lg:text-right">
                  {t('statusPage.targetListHeading')}
               </span>
               <div
                  className="flex flex-wrap items-center gap-1.5 lg:justify-end"
                  role="group"
                  aria-label={t('statusPage.targetListHeading')}
               >
                  {TARGET_LIST_PIPELINE_STEPS.filter((st) => st.value !== 'No Entry').map((st) => {
                     const count = targetListStats?.[st.value] ?? 0
                     const selected = targetListFilter === st.value
                     const label =
                        TARGET_LIST_STATUS_LABELS[st.value as keyof typeof TARGET_LIST_STATUS_LABELS] ?? st.label
                     return (
                        <button
                           key={st.value}
                           type="button"
                           aria-pressed={selected}
                           aria-label={`${label}, ${count.toLocaleString()} species`}
                           className={cn(
                              'inline-flex max-w-[10rem] min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-left text-[11px] font-medium transition-[background-color,box-shadow,opacity] duration-150',
                              'border-border bg-background text-foreground',
                              selected
                                 ? 'bg-muted shadow-sm ring-2 ring-ring/40'
                                 : 'opacity-90 hover:opacity-100',
                           )}
                           onClick={() => onToggleTargetList(st.value)}
                        >
                           <span className="truncate">{label}</span>
                           <span className="tabular-nums text-muted-foreground">
                              {loading ? '—' : count.toLocaleString()}
                           </span>
                        </button>
                     )
                  })}
               </div>
            </div>
         </header>

         {/* Proportional bar */}
         <div
            className="flex h-1.5 gap-0.5 overflow-hidden rounded-md bg-muted"
            role="presentation"
            aria-hidden={loading}
         >
            {loading ? (
               <div className="h-full w-full animate-pulse rounded-md bg-muted-foreground/15" />
            ) : barSegments.length === 0 ? (
               <div className="h-full w-full rounded-md bg-muted-foreground/15" />
            ) : (
               barSegments.map((s) => {
                  const isActive = selectedGoatStatuses.includes(s.key)
                  return (
                     <button
                        key={s.key}
                        type="button"
                        title={s.label}
                        aria-label={`${s.label}, ${s.pct}%`}
                        aria-pressed={isActive}
                        className={cn(
                           'min-w-0 cursor-pointer border-0 p-0 transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                           isActive ? 'opacity-100' : 'opacity-100 hover:opacity-80',
                        )}
                        style={{
                           flexGrow: s.pct,
                           flexBasis: 0,
                           backgroundColor: s.color,
                           boxShadow: isActive ? `0 0 0 2px ${s.color}, 0 0 0 4px hsl(var(--background))` : undefined,
                        }}
                        onClick={() => onToggleGoatStatus(s.key)}
                     />
                  )
               })
            )}
         </div>

         {/* Stage cards */}
         <div className="overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-gutter:stable]">
            <div
               className="grid min-w-[min(100%,52.5rem)] w-full gap-2 sm:min-w-0"
               style={{
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
               }}
            >
               {stages.map((s) => {
                  const isActive = selectedGoatStatuses.includes(s.key)
                  const dimmed = selectedGoatStatuses.length > 0 && !isActive
                  return (
                     <button
                        key={s.key}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => onToggleGoatStatus(s.key)}
                        className={cn(
                           'flex min-w-0 flex-col rounded-lg border bg-card p-2 text-left transition-[border-color,opacity,box-shadow] duration-150',
                           'border-border hover:border-muted-foreground/40',
                           isActive && 'border-primary ring-2 ring-primary/20 shadow-sm',
                           dimmed && 'opacity-40',
                        )}
                     >
                        <div className="flex min-w-0 items-start gap-1.5">
                           <span
                              className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: s.color }}
                              aria-hidden
                           />
                           <span className="min-w-0 text-[11px] font-normal leading-snug text-muted-foreground">
                              {s.label}
                           </span>
                        </div>
                        <span className="mt-1.5 tabular-nums text-xl font-semibold text-foreground sm:text-[22px]">
                           {loading ? '—' : s.count.toLocaleString()}
                        </span>
                        <div className="mt-1 text-xs text-muted-foreground">
                           <span className="font-medium text-foreground">{s.pct}%</span> {t('statusPage.pctOfTotal')}
                        </div>
                        <div className="mt-2 h-0.5 w-full overflow-hidden rounded-sm bg-muted" aria-hidden>
                           <div className="h-full rounded-sm" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                        </div>
                     </button>
                  )
               })}
            </div>
         </div>

         {/* Selection summary: badges (GoaT colors match stage cards); descriptions in tooltips */}
         <div className="rounded-lg border border-border bg-muted/30 px-4 py-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
               {t('statusPage.selectionSummaryHeading')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
                  {selectedStageDetails.map((s, i) => (
                     <Tooltip key={s.key}>
                        <TooltipTrigger asChild>
                           <button
                              type="button"
                              className={cn(
                                 'inline-flex max-w-full min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-left text-xs font-medium text-white shadow-sm',
                                 'transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                              )}
                              style={{
                                 backgroundColor: s.color,
                                 borderColor: s.color,
                              }}
                              aria-label={`${s.label}: ${s.desc}`}
                           >
                              <span
                                 className="h-2 w-2 shrink-0 rounded-full bg-white/90"
                                 aria-hidden
                              />
                              <span className="min-w-0 truncate">{s.label}</span>
                              <span className="tabular-nums text-white/90">
                                 {loading ? '—' : `${s.count.toLocaleString()} · ${s.pct}%`}
                              </span>
                           </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm text-left">
                           <p className="font-medium">{s.label}</p>
                           <p className="mt-1.5 text-xs leading-relaxed text-background/85">{s.desc}</p>
                           {selectedStageDetails.length === 1 ? (
                              <p className="mt-2 border-t border-background/20 pt-2 text-xs text-background/75">
                                 {t('statusPage.detailFilteredHint')}
                              </p>
                           ) : null}
                           {selectedStageDetails.length > 1 && i === 0 ? (
                              <p className="mt-2 border-t border-background/20 pt-2 text-xs text-background/75">
                                 {t('statusPage.detailMultiBody')}
                              </p>
                           ) : null}
                        </TooltipContent>
                     </Tooltip>
                  ))}

                  {targetListSelection ? (
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <button
                              type="button"
                              className="inline-flex max-w-full min-h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-left text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              aria-label={`${targetListSelection.label}: ${targetListSelection.step.description}`}
                           >
                              <span className="min-w-0 truncate">{targetListSelection.label}</span>
                              <span className="tabular-nums text-muted-foreground">
                                 {loading ? '—' : (targetListStats?.[targetListFilter] ?? 0).toLocaleString()}
                              </span>
                           </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm text-left">
                           <p className="font-medium">{targetListSelection.label}</p>
                           <p className="mt-1.5 text-xs leading-relaxed text-background/85">
                              {targetListSelection.step.description}
                           </p>
                        </TooltipContent>
                     </Tooltip>
                  ) : null}

                  {!hasSelection ? (
                     <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span
                           className="h-2 w-2 shrink-0 rounded-full border border-dashed border-muted-foreground/50"
                           aria-hidden
                        />
                        <span>{t('statusPage.detailPickTitle')}</span>
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <button
                                 type="button"
                                 className="inline-flex shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                 aria-label={t('statusPage.detailPickBody')}
                              >
                                 <CircleHelp className="h-4 w-4" aria-hidden />
                              </button>
                           </TooltipTrigger>
                           <TooltipContent side="top" className="max-w-sm text-left">
                              <p className="text-xs leading-relaxed text-background/90">
                                 {t('statusPage.detailPickBody')}
                              </p>
                           </TooltipContent>
                        </Tooltip>
                     </div>
                  ) : null}
            </div>
         </div>
      </section>
   )
}
