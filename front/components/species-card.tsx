'use client'

import Link from 'next/link'
import { Fragment } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { usePortalConfig } from '@/contexts/portal-context'
import { organismImageUrls } from '@/lib/organismImages'
import { iucnRedListBadge } from '@/lib/iucnCategory'
import { labelGoatStatus, TARGET_LIST_STATUS_LABELS } from '@/lib/organismStatusLabels'
import { organismCustomFieldRows } from '@/lib/organismCustomFieldDisplay'
import type { CmsOrganismFieldWire } from '@/lib/portal/types'
import {
   lineageRankPillsFromOrganism,
   SPECIES_RANK_GROUPS,
   type LineageRankPill,
} from '@/lib/taxonRankFilter'
import { ModelIcon } from '@/lib/modelIcons'
import { Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SpeciesCardProps {
   organism: Record<string, unknown>
   compact?: boolean
   compactVariant?: 'default' | 'comfortable'
   /** Grid: family/genus emphasis or truncated full lineage. Ignored when `compact`. */
   lineageMode?: 'full' | 'summary'
   /** Hide compact lineage rank pills (e.g. taxonomy organism list). */
   hideCompactLineage?: boolean
   /** Show GoaT / target-list chips when portal `general.goat` is enabled. */
   showGoatChips?: boolean
   /**
    * `'store'` — country chip visibility follows `useOrganismCountriesDisplayStore` (species list).
    * `'off'` — never show country chips (default for map/taxonomy/etc.).
    */
   countryChipsSource?: 'off' | 'store'
}

function getTaxid(row: Record<string, unknown>): string {
   const t = row.taxid
   return t != null ? String(t) : ''
}

function getScientificName(row: Record<string, unknown>): string {
   const s = row.scientific_name ?? row.metadata
   if (typeof s === 'string') return s
   if (s && typeof s === 'object' && 'scientific_name' in s) {
      const v = (s as { scientific_name?: unknown }).scientific_name
      if (typeof v === 'string') return v
   }
   return getTaxid(row) || '—'
}

function getCommonName(row: Record<string, unknown>): string {
   const cnVal = row.insdc_common_name
   if (typeof cnVal === 'string' && cnVal.trim()) return cnVal.trim()
   const meta = row.metadata
   if (meta && typeof meta === 'object' && 'common_name' in meta) {
      const v = (meta as { common_name?: unknown }).common_name
      if (typeof v === 'string' && v.trim()) return v.trim()
   }
   return ''
}

function getKingdomLabel(row: Record<string, unknown>): string | null {
   const raw = row.lineage_rank_labels
   if (!raw || typeof raw !== 'object') return null
   const k = (raw as Record<string, unknown>).kingdom
   if (typeof k !== 'string' || !k.trim()) return null
   return k.trim()
}

function lineageRankGroupLabel(styleKey: string): string {
   return SPECIES_RANK_GROUPS.find((g) => g.id === styleKey)?.label ?? styleKey
}

function LineageRankText({
   organism,
   compact = false,
   compactComfortable = false,
   lineageMode = 'full',
}: {
   organism: Record<string, unknown>
   compact?: boolean
   compactComfortable?: boolean
   lineageMode?: 'full' | 'summary'
}) {
   const fullPills = lineageRankPillsFromOrganism(organism)
   if (fullPills.length === 0) return null

   let displayPills: LineageRankPill[]
   let mutedLineage = false
   let lineClampOne = false

   if (!compact && lineageMode === 'summary') {
      const summaryOnly = fullPills.filter((p) => p.apiField === 'family' || p.apiField === 'genus')
      if (summaryOnly.length > 0) {
         displayPills = summaryOnly
         mutedLineage = true
      } else {
         displayPills = fullPills
         mutedLineage = true
         lineClampOne = true
      }
   } else {
      displayPills = fullPills
   }

   const lineageTitle = fullPills
      .map((p) => `${lineageRankGroupLabel(p.styleKey)}: ${p.name}`)
      .join(' · ')

   return (
      <p
         className={cn(
            'min-w-0 text-left leading-snug',
            compact && !compactComfortable && 'mt-1 text-[9px] leading-3',
            compact && compactComfortable && 'mt-1.5 text-[10px] leading-snug',
            !compact && !mutedLineage && 'mt-1.5 text-[10px] leading-snug sm:text-[11px]',
            !compact && mutedLineage && 'mt-1.5 text-[10px] leading-snug sm:text-[11px] text-muted-foreground',
            lineClampOne && 'line-clamp-1',
         )}
         title={lineageTitle}
      >
         {displayPills.map((p, i) => {
            const rankLabel = lineageRankGroupLabel(p.styleKey)
            return (
               <Fragment key={`${p.apiField}-${p.name}`}>
                  {i > 0 ? (
                     <span className="text-muted-foreground/35 select-none" aria-hidden>
                        {' · '}
                     </span>
                  ) : null}
                  <span
                     className={cn(
                        'break-words',
                        mutedLineage ? 'font-normal text-muted-foreground' : 'font-medium text-foreground',
                     )}
                     title={`${rankLabel}: ${p.name}`}
                  >
                     {p.name}
                  </span>
               </Fragment>
            )
         })}
      </p>
   )
}

function num(row: Record<string, unknown>, k: string): number {
   const v = row[k]
   if (typeof v === 'number' && Number.isFinite(v)) return v
   if (typeof v === 'string') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
   }
   return 0
}

function normalizeGoatStatusValue(raw: unknown, fallback = 'No Entry'): string {
   if (raw == null || raw === '') return fallback
   return String(raw)
}

function OrganismGoatChips({ organism }: { organism: Record<string, unknown> }) {
   const goatPrimary = normalizeGoatStatusValue(organism.goat_status)
   const tlsRaw = organism.target_list_status
   const recordedLabel = labelGoatStatus(goatPrimary)
   const showGoat =
      typeof organism.goat_status === 'string' &&
      organism.goat_status.trim() &&
      organism.goat_status !== 'No Entry'
   const tlsCode =
      typeof tlsRaw === 'string' && tlsRaw.trim() && tlsRaw !== 'No Entry' ? tlsRaw.trim() : null
   const tlsStr = tlsCode
      ? (TARGET_LIST_STATUS_LABELS[tlsCode] ?? tlsCode.replace(/_/g, ' '))
      : null
   if (!showGoat && !tlsStr) return null
   return (
      <div className="mt-1 flex flex-wrap gap-1">
         {showGoat ? (
            <Badge
               variant="outline"
               className="max-w-[11rem] truncate px-1.5 py-0 text-[10px] font-normal leading-snug text-foreground"
            >
               {recordedLabel}
            </Badge>
         ) : null}
         {tlsStr && tlsCode ? (
            <Badge
               variant="outline"
               className="max-w-[11rem] truncate px-1.5 py-0 text-[10px] font-normal leading-snug text-foreground"
            >
               {tlsStr}
            </Badge>
         ) : null}
      </div>
   )
}

function SubProjectLine({
   organism,
   className,
}: {
   organism: Record<string, unknown>
   className?: string
}) {
   const sp =
      typeof organism.sub_project === 'string' && organism.sub_project.trim()
         ? organism.sub_project.trim()
         : null
   if (!sp) return null
   return (
      <p className={cn('text-[11px] text-muted-foreground line-clamp-2', className)}>
         <span>{sp}</span>
      </p>
   )
}

function OrganismCustomFieldsLine({
   organism,
   customFields,
   className,
}: {
   organism: Record<string, unknown>
   customFields: CmsOrganismFieldWire[]
   className?: string
}) {
   const rows = organismCustomFieldRows(organism, customFields)
   if (rows.length === 0) return null
   return (
      <p className={cn('text-[11px] text-muted-foreground line-clamp-2', className)}>
         {rows.map((row, i) => (
            <Fragment key={row.key}>
               {i > 0 ? <span className="text-muted-foreground/50"> · </span> : null}
               <span>
                  {row.label}: {row.values.join(', ')}
               </span>
            </Fragment>
         ))}
      </p>
   )
}

function OrganismProjectLine({
   organism,
   customFields,
   className,
}: {
   organism: Record<string, unknown>
   customFields: CmsOrganismFieldWire[]
   className?: string
}) {
   if (customFields.length > 0) {
      return <OrganismCustomFieldsLine organism={organism} customFields={customFields} className={className} />
   }
   return <SubProjectLine organism={organism} className={className} />
}

function OrganismStatsRow({
   organism,
   className,
}: {
   organism: Record<string, unknown>
   className?: string
}) {
   const assemblies = num(organism, 'assemblies_count')
   const biosamples = num(organism, 'biosamples_count')
   const reads = num(organism, 'reads_count')
   const annotations = num(organism, 'genome_annotations_count')
   if (assemblies === 0 && biosamples === 0 && reads === 0 && annotations === 0) return null
   return (
      <div
         className={cn(
            'flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-border pt-2 text-[11px] text-muted-foreground',
            className,
         )}
      >
         {assemblies > 0 ? (
            <span className="flex items-center gap-1">
               <ModelIcon modelKey="assemblies" className="h-3 w-3 shrink-0" />
               {assemblies} genomes
            </span>
         ) : null}
         {biosamples > 0 ? (
            <span className="flex items-center gap-1">
               <ModelIcon modelKey="biosamples" className="h-3 w-3 shrink-0" />
               {biosamples} samples
            </span>
         ) : null}
         {reads > 0 ? (
            <span className="flex items-center gap-1">
               <ModelIcon modelKey="reads" className="h-3 w-3 shrink-0" />
               {reads} runs
            </span>
         ) : null}
         {annotations > 0 ? (
            <span className="flex items-center gap-1">
               <ModelIcon modelKey="annotations" className="h-3 w-3 shrink-0" />
               {annotations} annotations
            </span>
         ) : null}
      </div>
   )
}

export function SpeciesCard({
   organism,
   compact = false,
   compactVariant = 'default',
   lineageMode = 'full',
   hideCompactLineage = false,
   showGoatChips = false,
}: SpeciesCardProps) {
   const { config } = usePortalConfig()
   const customFields = config?.organismCustomFields ?? []
   const comfy = compact && compactVariant === 'comfortable'
   const taxid = getTaxid(organism)
   const href = taxid ? `/species/${encodeURIComponent(taxid)}` : '#'
   const scientificName = getScientificName(organism)
   const commonName = getCommonName(organism)
   const kingdomLabel = getKingdomLabel(organism)
   const primaryImage = organismImageUrls(organism)[0] ?? null

   const iucnBadge = iucnRedListBadge(organism)

   const media = (
      <div
         className={cn(
            'relative shrink-0 overflow-hidden bg-muted ring-1 ring-inset ring-border/30 dark:ring-border/50',
            compact && !comfy && 'h-12 w-12 rounded-md',
            comfy && 'h-[4.25rem] w-[4.25rem] rounded-lg',
            !compact && 'aspect-[5/3] w-full rounded-t-xl',
         )}
      >
         {primaryImage ? (
            <>
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img
                  src={primaryImage}
                  alt=""
                  className={cn(
                     'h-full w-full object-cover object-center',
                     'transition-[filter] duration-300 ease-out',
                     'dark:brightness-[0.9] dark:saturate-[0.94]',
                     'group-hover:dark:brightness-[0.96] group-hover:dark:saturate-[0.98]',
                  )}
               />
               <div
                  className="pointer-events-none absolute inset-0 hidden bg-black/15 dark:block"
                  aria-hidden
               />
            </>
         ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
               <Leaf
                  className={cn(comfy ? 'h-6 w-6' : compact ? 'h-5 w-5' : 'h-10 w-10 opacity-60')}
                  aria-hidden
               />
            </div>
         )}
      </div>
   )

   if (compact) {
      return (
         <Link href={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <Card className="group h-full cursor-pointer p-0 gap-0 py-0 transition-shadow hover:border-primary/50 hover:shadow-sm">
               <CardContent className={cn(comfy ? 'p-3.5' : 'p-3')}>
                  <div className={cn('flex items-start', comfy ? 'gap-3' : 'gap-2.5')}>
                     {media}
                     <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                           <div className="min-w-0">
                              <h3
                                 className={cn(
                                    'font-medium truncate group-hover:text-primary transition-colors',
                                    comfy ? 'text-[15px] leading-snug' : 'text-sm',
                                 )}
                              >
                                 {scientificName}
                              </h3>
                              {commonName ? (
                                 <p
                                    className={cn(
                                       'text-muted-foreground truncate',
                                       comfy ? 'mt-0.5 text-[13px]' : 'text-xs',
                                    )}
                                 >
                                    {commonName}
                                 </p>
                              ) : null}
                           </div>
                           <div className="flex shrink-0 flex-wrap justify-end gap-1">
                              {iucnBadge ? (
                                 <span
                                    className={cn(
                                       'inline-flex max-w-[9rem] truncate rounded-md font-semibold border',
                                       comfy ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-0.5 text-[10px]',
                                       iucnBadge.className,
                                    )}
                                    title={iucnBadge.title}
                                 >
                                    IUCN {iucnBadge.code}
                                 </span>
                              ) : null}
                           </div>
                        </div>
                        {hideCompactLineage ? null : (
                           <LineageRankText organism={organism} compact compactComfortable={comfy} />
                        )}
                        {showGoatChips ? <OrganismGoatChips organism={organism} /> : null}
                     </div>
                  </div>
                  <OrganismProjectLine organism={organism} customFields={customFields} className="mt-2" />
                  <OrganismStatsRow organism={organism} className="mt-2" />
               </CardContent>
            </Card>
         </Link>
      )
   }

   return (
      <Link
         href={href}
         className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
         <Card className="group flex h-full min-h-[280px] cursor-pointer flex-col overflow-hidden p-0 gap-0 py-0 shadow-sm transition-[box-shadow,border-color] hover:border-primary/50 hover:shadow-md">
            {media}
            <CardContent className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
               <div className="flex min-h-[5rem] flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                     <div className="min-w-0 flex-1 space-y-0.5">
                        <h3 className="text-base font-bold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors sm:text-lg">
                           {scientificName}
                        </h3>
                        {commonName ? (
                           <p className="text-sm text-muted-foreground line-clamp-2">{commonName}</p>
                        ) : null}
                        {kingdomLabel ? (
                           <Badge variant="secondary" className="mt-1 max-w-full truncate text-[10px] font-normal">
                              {kingdomLabel}
                           </Badge>
                        ) : null}
                        {showGoatChips ? <OrganismGoatChips organism={organism} /> : null}
                     </div>
                     <div className="flex shrink-0 flex-col items-end gap-1">
                        {iucnBadge ? (
                           <span
                              className={cn(
                                 'inline-flex max-w-[10rem] truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold border',
                                 iucnBadge.className,
                              )}
                              title={iucnBadge.title}
                           >
                              IUCN {iucnBadge.code}
                           </span>
                        ) : null}
                     </div>
                  </div>

                  <div className="min-h-[2.5rem] flex-1">
                     <LineageRankText organism={organism} lineageMode={lineageMode} />
                  </div>
                  <OrganismProjectLine organism={organism} customFields={customFields} className="mt-1" />
               </div>

               <OrganismStatsRow organism={organism} className="mt-auto" />
            </CardContent>
         </Card>
      </Link>
   )
}
