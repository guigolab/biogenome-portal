'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
   TARGET_LIST_PIPELINE_STEPS,
   TARGET_LIST_STATUS_LABELS,
} from '@/lib/organismStatusLabels'
import type { GoatTrackerStage } from '@/lib/goatPipelineTracker'
import { useLocale } from '@/contexts/locale-context'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function interpolate(template: string, vars: Record<string, string | number>): string {
   let out = template
   for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v))
   }
   return out
}

/** Fixed English copy for admin / non-locale contexts (matches en.json statusPage). */
const GOAT_PIPELINE_COPY_EN = {
   pipelineTitle: 'GoaT sequencing status',
   pipelineLoading: 'Loading counts…',
   pipelineHelp:
      'Counts by GoaT sequencing stage across this portal (not affected by table filters).',
   pipelineTotal: '{count} species in the portal.',
   targetListHeading: 'Target list',
   pctOfTotal: 'of total',
} as const

const GOAT_PIPELINE_LOCALE_KEYS: Record<keyof typeof GOAT_PIPELINE_COPY_EN, `statusPage.${string}`> =
   {
      pipelineTitle: 'statusPage.pipelineTitle',
      pipelineLoading: 'statusPage.pipelineLoading',
      pipelineHelp: 'statusPage.pipelineHelp',
      pipelineTotal: 'statusPage.pipelineTotal',
      targetListHeading: 'statusPage.targetListHeading',
      pctOfTotal: 'statusPage.pctOfTotal',
   }

export type GoatPipelineTrackerProps = {
   stages: GoatTrackerStage[]
   totalSpecies: number
   loading: boolean
   targetListStats: Record<string, number> | null
   /**
    * `drawer`: single-column status cards.
    * `default`: 7-column grid.
    */
   layout?: 'default' | 'drawer'
   /**
    * When set, UI strings use fixed English (e.g. admin area) instead of portal locale.
    */
   copyMode?: 'locale' | 'en'
   /** Override pipeline help line (e.g. scoped to assigned species). */
   helpText?: string
   /** Override total species line; `{count}` is replaced with formatted total. */
   pipelineTotalText?: string
}

export function GoatPipelineTracker({
   stages,
   totalSpecies,
   loading,
   targetListStats,
   layout = 'default',
   copyMode = 'locale',
   helpText,
   pipelineTotalText,
}: GoatPipelineTrackerProps) {
   const { t } = useLocale()
   const isDrawer = layout === 'drawer'
   const tooltipContentClassName = cn('max-w-xs text-xs', isDrawer && 'z-[1200]')
   const en = copyMode === 'en'
   function tx(key: keyof typeof GOAT_PIPELINE_COPY_EN): string {
      return en ? GOAT_PIPELINE_COPY_EN[key] : t(GOAT_PIPELINE_LOCALE_KEYS[key])
   }

   return (
      <section className="space-y-5" aria-labelledby="goat-pipeline-heading">
         <header
            className={cn(
               'flex gap-4',
               isDrawer ? 'flex-col' : 'flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6',
            )}
         >
            <div className="min-w-0 flex-1">
               <h2
                  id="goat-pipeline-heading"
                  className="text-lg font-semibold tracking-tight text-foreground"
               >
                  {tx('pipelineTitle')}
               </h2>
               <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {loading ? (
                     <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                        {tx('pipelineLoading')}
                     </span>
                  ) : (
                     <>
                        {helpText ?? tx('pipelineHelp')}{' '}
                        <span className="font-medium text-foreground/90 tabular-nums">
                           {interpolate(pipelineTotalText ?? tx('pipelineTotal'), {
                              count: totalSpecies.toLocaleString(),
                           })}
                        </span>
                     </>
                  )}
               </p>
            </div>
            <div
               className={cn(
                  'flex w-full flex-col gap-2',
                  isDrawer ? 'max-w-none' : 'lg:max-w-[min(100%,28rem)] lg:shrink-0',
               )}
            >
               <span
                  className={cn(
                     'text-xs font-medium text-muted-foreground',
                     !isDrawer && 'lg:text-right',
                  )}
               >
                  {tx('targetListHeading')}
               </span>
               {isDrawer ? (
                  <div
                     className="flex flex-wrap gap-1.5"
                     role="list"
                     aria-label={tx('targetListHeading')}
                  >
                     {TARGET_LIST_PIPELINE_STEPS.filter((st) => st.value !== 'No Entry').map((st) => {
                        const count = targetListStats?.[st.value] ?? 0
                        const label =
                           TARGET_LIST_STATUS_LABELS[st.value as keyof typeof TARGET_LIST_STATUS_LABELS] ??
                           st.label
                        return (
                           <Tooltip key={st.value}>
                              <TooltipTrigger asChild>
                                 <Badge
                                    variant="outline"
                                    role="listitem"
                                    className="max-w-full cursor-help gap-1 px-2 py-0.5 text-[11px] font-normal leading-snug"
                                 >
                                    <span className="min-w-0 truncate">{label}</span>
                                    <span className="shrink-0 tabular-nums text-muted-foreground">
                                       {loading ? '—' : count.toLocaleString()}
                                    </span>
                                 </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className={tooltipContentClassName}>
                                 {st.description}
                              </TooltipContent>
                           </Tooltip>
                        )
                     })}
                  </div>
               ) : (
                  <div
                     className="flex flex-wrap items-center gap-1.5 lg:justify-end"
                     role="list"
                     aria-label={tx('targetListHeading')}
                  >
                     {TARGET_LIST_PIPELINE_STEPS.filter((st) => st.value !== 'No Entry').map((st) => {
                        const count = targetListStats?.[st.value] ?? 0
                        const label =
                           TARGET_LIST_STATUS_LABELS[st.value as keyof typeof TARGET_LIST_STATUS_LABELS] ??
                           st.label
                        return (
                           <Tooltip key={st.value}>
                              <TooltipTrigger asChild>
                                 <div
                                    role="listitem"
                                    className="inline-flex max-w-[10rem] min-h-8 cursor-help items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-left text-[11px] font-medium text-foreground"
                                 >
                                    <span className="truncate">{label}</span>
                                    <span className="tabular-nums text-muted-foreground">
                                       {loading ? '—' : count.toLocaleString()}
                                    </span>
                                 </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className={tooltipContentClassName}>
                                 {st.description}
                              </TooltipContent>
                           </Tooltip>
                        )
                     })}
                  </div>
               )}
            </div>
         </header>

         <div
            className={cn(
               '-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-gutter:stable]',
               isDrawer && 'overflow-x-visible',
            )}
         >
            <div
               className={cn(
                  'w-full gap-2',
                  isDrawer ? 'flex flex-col' : 'grid min-w-[min(100%,52.5rem)] sm:min-w-0',
               )}
               style={
                  isDrawer
                     ? undefined
                     : {
                          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                       }
               }
            >
               {stages.map((s) => (
                  <div
                     key={s.key}
                     className={cn(
                        'flex min-w-0 flex-col rounded-lg border border-border bg-card p-2.5 text-left',
                        isDrawer && 'w-full',
                     )}
                  >
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <div className="flex min-w-0 cursor-help items-start gap-1.5 text-left">
                              <span
                                 className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/35"
                                 aria-hidden
                              />
                              <span className="min-w-0 text-[11px] font-medium leading-snug text-foreground">
                                 {s.label}
                              </span>
                           </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className={tooltipContentClassName}>
                           {s.desc}
                        </TooltipContent>
                     </Tooltip>
                     <span className="mt-1.5 text-xl font-semibold tabular-nums text-foreground sm:text-[22px]">
                        {loading ? '—' : s.count.toLocaleString()}
                     </span>
                     <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{s.pct}%</span> {tx('pctOfTotal')}
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>
   )
}
