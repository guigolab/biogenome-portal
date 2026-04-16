'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/contexts/locale-context'
import {
   GOAT_PIPELINE_STEPS,
   TARGET_LIST_STATUS_LABELS,
   goatChipState,
   goatStatusRank,
} from '@/lib/organismStatusLabels'
import { GOAT_PIPELINE_TRACKER_LABELS } from '@/lib/goatPipelineTracker'
import { cn } from '@/lib/utils'

function str(v: unknown): string {
   if (v == null) return ''
   return String(v).trim()
}

export type SpeciesGoatPipelineSectionProps = {
   goatStatusRaw: unknown
   targetListStatusRaw: unknown
   className?: string
}

export function SpeciesGoatPipelineSection({
   goatStatusRaw,
   targetListStatusRaw,
   className,
}: SpeciesGoatPipelineSectionProps) {
   const { t } = useLocale()

   const goat = str(goatStatusRaw) || 'No Entry'
   const currentRank = goatStatusRank(goat)
   const tlsRaw = str(targetListStatusRaw)
   const tlsCode =
      tlsRaw && tlsRaw !== 'No Entry' ? tlsRaw : null

   const hasTargetList = Boolean(tlsCode)
   const hasAny = goat !== 'No Entry' || hasTargetList

   if (!hasAny) {
      return (
         <Card className={cn('mb-6', className)}>
            <CardHeader className="pb-2">
               <CardTitle className="text-lg">{t('statusPage.pipelineTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground">{t('speciesDetail.goatPipelineEmpty')}</p>
            </CardContent>
         </Card>
      )
   }

   return (
      <Card className={cn('mb-6', className)}>
         <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-lg">{t('statusPage.pipelineTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('speciesDetail.goatPipelineHelp')}</p>
         </CardHeader>
         <CardContent className="space-y-5">
            <div className="flex flex-wrap items-baseline gap-2">
               <span className="text-xs font-medium text-muted-foreground">
                  {t('statusPage.targetListHeading')}
               </span>
               {tlsCode ? (
                  <Badge
                     variant="outline"
                     className="px-2 py-0.5 text-[11px] font-normal leading-snug text-foreground"
                  >
                     {TARGET_LIST_STATUS_LABELS[tlsCode as keyof typeof TARGET_LIST_STATUS_LABELS] ??
                        tlsCode.replace(/_/g, ' ')}
                  </Badge>
               ) : (
                  <span className="text-sm text-muted-foreground">—</span>
               )}
            </div>

            <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-gutter:stable]">
               <div
                  className="grid min-w-[min(100%,52.5rem)] gap-2 sm:min-w-0"
                  style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
               >
                  {GOAT_PIPELINE_STEPS.map((st, stepIndex) => {
                     const state = goatChipState(stepIndex, currentRank)
                     const label = GOAT_PIPELINE_TRACKER_LABELS[stepIndex] ?? st.label
                     const isCurrent = state === 'current'
                     return (
                        <div
                           key={st.value}
                           className={cn(
                              'flex min-w-0 flex-col rounded-lg border p-2.5 text-left transition-shadow',
                              isCurrent
                                 ? 'border-primary/35 bg-muted/50 shadow-sm ring-1 ring-border'
                                 : 'border-border bg-card text-foreground',
                           )}
                        >
                           <div className="flex min-w-0 items-start gap-1.5">
                              <span
                                 className={cn(
                                    'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                                    isCurrent ? 'bg-foreground/70' : 'bg-muted-foreground/35',
                                 )}
                                 aria-hidden
                              />
                              <span className="min-w-0 text-[11px] font-medium leading-snug text-foreground">
                                 {label}
                              </span>
                           </div>
                           <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{st.description}</p>
                        </div>
                     )
                  })}
               </div>
            </div>
         </CardContent>
      </Card>
   )
}
