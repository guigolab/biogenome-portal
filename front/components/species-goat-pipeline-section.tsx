'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
   ArrowUpRight,
   BookOpen,
   ExternalLink,
   MapPin,
   type LucideIcon,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/contexts/locale-context'
import { modelLucideMap } from '@/lib/modelIcons'
import {
   GOAT_PIPELINE_STEPS,
   TARGET_LIST_STATUS_LABELS,
   goatChipState,
   goatStatusRank,
   goatStepMessageKey,
   type GoatChipState,
} from '@/lib/organismStatusLabels'
import type { DataModels } from '@/lib/portal/types'
import { type ParsedPublication } from '@/lib/publicationLinks'
import { cn } from '@/lib/utils'

function str(v: unknown): string {
   if (v == null) return ''
   return String(v).trim()
}

function catalogHref(modelKey: DataModels, taxid: string): string {
   return `/catalog?cat=${encodeURIComponent(modelKey)}&tid=${encodeURIComponent(taxid)}`
}

type EvidenceChipProps = {
   icon: LucideIcon
   label: string
   value: string
   href: string | null
   active: boolean
   ariaLabel: string
   external?: boolean
}

function GoatStepEvidenceChip({
   icon: Icon,
   label,
   value,
   href,
   active,
   ariaLabel,
   external = false,
}: EvidenceChipProps) {
   const LinkIcon = external ? ExternalLink : ArrowUpRight
   const body = (
      <>
         <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
         <span className="tabular-nums font-semibold">{value}</span>
         <span className="text-muted-foreground">{label}</span>
         {active && href ? <LinkIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden /> : null}
      </>
   )
   const className = cn(
      'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs whitespace-nowrap transition-colors',
      active && href
         ? 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/60'
         : 'border-dashed border-border/70 bg-muted/20 text-muted-foreground',
   )

   if (active && href) {
      if (external) {
         return (
            <a
               href={href}
               target="_blank"
               rel="noopener noreferrer"
               className={className}
               aria-label={ariaLabel}
               title={ariaLabel}
            >
               {body}
            </a>
         )
      }
      return (
         <Link href={href} className={className} aria-label={ariaLabel} title={ariaLabel}>
            {body}
         </Link>
      )
   }

   return (
      <span className={className} aria-label={ariaLabel}>
         {body}
      </span>
   )
}

function StepRail({ state, isLast }: { state: GoatChipState; isLast: boolean }) {
   const isCurrent = state === 'current'
   const isCompleted = state === 'completed'
   return (
      <div className="flex w-4 shrink-0 flex-col items-center self-stretch pt-1.5" aria-hidden>
         <span
            className={cn(
               'h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background',
               isCurrent && 'bg-primary',
               isCompleted && 'bg-foreground/70',
               state === 'todo' && 'bg-muted-foreground/35',
            )}
         />
         {!isLast ? (
            <span
               className={cn(
                  'mt-1 w-px flex-1 min-h-[1.25rem]',
                  isCompleted || isCurrent ? 'bg-border' : 'bg-border/60',
               )}
            />
         ) : null}
      </div>
   )
}

export type SpeciesGoatPipelineSectionProps = {
   taxid: string
   goatStatusRaw: unknown
   targetListStatusRaw: unknown
   assemblyCount: number
   biosampleCount: number
   readsCount: number
   annotationCount: number
   locationsTotal: number
   hasMapCoords: boolean
   genomePublication: ParsedPublication | null
   className?: string
}

export function SpeciesGoatPipelineSection({
   taxid,
   goatStatusRaw,
   targetListStatusRaw,
   assemblyCount,
   biosampleCount,
   readsCount,
   annotationCount,
   locationsTotal,
   hasMapCoords,
   genomePublication,
   className,
}: SpeciesGoatPipelineSectionProps) {
   const { locale, t } = useLocale()
   const fmt = locale === 'cat' ? 'ca' : 'en'

   const goat = str(goatStatusRaw) || 'No Entry'
   const currentRank = goatStatusRank(goat)
   const tlsRaw = str(targetListStatusRaw)
   const tlsCode = tlsRaw && tlsRaw !== 'No Entry' ? tlsRaw : null

   const hasTargetList = Boolean(tlsCode)
   const hasGoatStatus = goat !== 'No Entry'
   const locationCount = hasMapCoords ? locationsTotal : 0
   const hasEvidence =
      locationCount > 0 ||
      biosampleCount > 0 ||
      readsCount > 0 ||
      assemblyCount > 0 ||
      annotationCount > 0 ||
      Boolean(genomePublication)
   const showEmptyOnly = !hasGoatStatus && !hasTargetList && !hasEvidence

   const AssembliesIcon = modelLucideMap.assemblies!
   const BiosamplesIcon = modelLucideMap.biosamples!
   const ReadsIcon = modelLucideMap.reads!
   const AnnotationsIcon = modelLucideMap.annotations!

   function stepEvidence(stepValue: string): ReactNode {
      switch (stepValue) {
         case 'Sample Collected': {
            if (locationCount <= 0) return null
            return (
               <GoatStepEvidenceChip
                  icon={MapPin}
                  label={t('map.legend.sampleLocations')}
                  value={locationCount.toLocaleString(fmt)}
                  href="#sample-locations"
                  active
                  ariaLabel={t('speciesDetail.goatOpenLocations')}
               />
            )
         }
         case 'Sample Acquired': {
            if (biosampleCount <= 0) return null
            return (
               <GoatStepEvidenceChip
                  icon={BiosamplesIcon}
                  label={t('home.hero.stats.biosamples')}
                  value={biosampleCount.toLocaleString(fmt)}
                  href={catalogHref('biosamples', taxid)}
                  active
                  ariaLabel={t('speciesDetail.goatOpenCatalog').replace(
                     '{label}',
                     t('home.hero.stats.biosamples'),
                  )}
               />
            )
         }
         case 'In Assembly': {
            if (readsCount <= 0) return null
            return (
               <GoatStepEvidenceChip
                  icon={ReadsIcon}
                  label={t('home.hero.stats.sequencingRuns')}
                  value={readsCount.toLocaleString(fmt)}
                  href={catalogHref('reads', taxid)}
                  active
                  ariaLabel={t('speciesDetail.goatOpenCatalog').replace(
                     '{label}',
                     t('home.hero.stats.sequencingRuns'),
                  )}
               />
            )
         }
         case 'INSDC Submitted': {
            const asmActive = assemblyCount > 0
            const annActive = annotationCount > 0
            if (!asmActive && !annActive) return null
            return (
               <div className="flex flex-nowrap items-center gap-1.5">
                  {asmActive ? (
                     <GoatStepEvidenceChip
                        icon={AssembliesIcon}
                        label={t('home.hero.stats.genomesAvailable')}
                        value={assemblyCount.toLocaleString(fmt)}
                        href={catalogHref('assemblies', taxid)}
                        active
                        ariaLabel={t('speciesDetail.goatOpenCatalog').replace(
                           '{label}',
                           t('home.hero.stats.genomesAvailable'),
                        )}
                     />
                  ) : null}
                  {annActive ? (
                     <GoatStepEvidenceChip
                        icon={AnnotationsIcon}
                        label={t('home.hero.stats.annotations')}
                        value={annotationCount.toLocaleString(fmt)}
                        href={catalogHref('annotations', taxid)}
                        active
                        ariaLabel={t('speciesDetail.goatOpenCatalog').replace(
                           '{label}',
                           t('home.hero.stats.annotations'),
                        )}
                     />
                  ) : null}
               </div>
            )
         }
         case 'Publication Available': {
            if (!genomePublication) return null
            const value = `${genomePublication.source}: ${genomePublication.id}`
            return (
               <GoatStepEvidenceChip
                  icon={BookOpen}
                  label={t('speciesDetail.goatGenomePublication')}
                  value={value}
                  href="#publications"
                  active
                  ariaLabel={t('speciesDetail.goatOpenPublication')}
               />
            )
         }
         default:
            return null
      }
   }

   return (
      <Card className={cn('mb-6', className)}>
         <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-lg">{t('statusPage.pipelineTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">
               {showEmptyOnly
                  ? t('speciesDetail.goatPipelineEmpty')
                  : t('speciesDetail.goatPipelineHelp')}
            </p>
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

            {!showEmptyOnly ? (
               <ol className="space-y-0" aria-label={t('statusPage.pipelineTitle')}>
                  {GOAT_PIPELINE_STEPS.map((st, stepIndex) => {
                     const state = goatChipState(stepIndex, currentRank)
                     const msgKey = goatStepMessageKey(st.value)
                     const label = msgKey
                        ? t(`goat.steps.${msgKey}.title`)
                        : st.label
                     const description = msgKey
                        ? t(`goat.steps.${msgKey}.description`)
                        : st.description
                     const isCurrent = state === 'current'
                     const evidence = stepEvidence(st.value)
                     const isLast = stepIndex === GOAT_PIPELINE_STEPS.length - 1
                     return (
                        <li
                           key={st.value}
                           className={cn(
                              'flex gap-3 rounded-lg px-1 py-2.5 sm:px-2',
                              isCurrent && 'bg-muted/50 ring-1 ring-border',
                           )}
                        >
                           <StepRail state={state} isLast={isLast} />
                           <div className="min-w-0 flex-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                              <div className="min-w-0">
                                 <div className="text-sm font-medium leading-snug text-foreground">
                                    {label}
                                    {isCurrent ? (
                                       <span className="sr-only"> ({t('speciesDetail.goatCurrentStep')})</span>
                                    ) : null}
                                 </div>
                                 <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                                    {description}
                                 </p>
                              </div>
                              {evidence ? (
                                 <div className="flex flex-nowrap items-center gap-1.5 sm:justify-end shrink-0">
                                    {evidence}
                                 </div>
                              ) : null}
                           </div>
                        </li>
                     )
                  })}
               </ol>
            ) : null}
         </CardContent>
      </Card>
   )
}
