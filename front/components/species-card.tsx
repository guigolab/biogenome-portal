import Link from 'next/link'
import { Fragment } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { organismImageUrls } from '@/lib/organismImages'
import { iucnRedListBadge } from '@/lib/iucnCategory'
import {
   lineageRankPillsFromOrganism,
   RANK_GROUP_LINEAGE_TEXT,
   SPECIES_RANK_GROUPS,
} from '@/lib/taxonRankFilter'
import { Database, Dna, FlaskConical, Leaf, PlayCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SpeciesCardProps {
   organism: Record<string, unknown>
   compact?: boolean
   /** Slightly larger compact layout (e.g. map sidebar). */
   compactVariant?: 'default' | 'comfortable'
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

function lineageRankGroupLabel(styleKey: string): string {
   return SPECIES_RANK_GROUPS.find((g) => g.id === styleKey)?.label ?? styleKey
}

function LineageRankText({
   organism,
   compact = false,
   compactComfortable = false,
}: {
   organism: Record<string, unknown>
   compact?: boolean
   compactComfortable?: boolean
}) {
   const pills = lineageRankPillsFromOrganism(organism)
   if (pills.length === 0) return null

   const lineageTitle = pills
      .map((p) => `${lineageRankGroupLabel(p.styleKey)}: ${p.name}`)
      .join(' · ')

   return (
      <p
         className={cn(
            'min-w-0 text-left leading-snug',
            compact && !compactComfortable && 'mt-1 text-[9px] leading-3',
            compact && compactComfortable && 'mt-1.5 text-[10px] leading-snug',
            !compact && 'mt-1.5 text-[10px] leading-snug sm:text-[11px]',
         )}
         title={lineageTitle}
      >
         {pills.map((p, i) => {
            const colors = RANK_GROUP_LINEAGE_TEXT[p.styleKey] ?? RANK_GROUP_LINEAGE_TEXT.phylum
            const rankLabel = lineageRankGroupLabel(p.styleKey)
            return (
               <Fragment key={`${p.apiField}-${p.name}`}>
                  {i > 0 ? (
                     <span className="text-muted-foreground/35 select-none" aria-hidden>
                        {' · '}
                     </span>
                  ) : null}
                  <span className={cn('font-medium break-words', colors.name)} title={`${rankLabel}: ${p.name}`}>
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

export function SpeciesCard({
   organism,
   compact = false,
   compactVariant = 'default',
}: SpeciesCardProps) {
   const comfy = compact && compactVariant === 'comfortable'
   const taxid = getTaxid(organism)
   const href = taxid ? `/species/${encodeURIComponent(taxid)}` : '#'
   const scientificName = getScientificName(organism)
   const commonName = getCommonName(organism)
   const primaryImage = organismImageUrls(organism)[0] ?? null

   const assemblies = num(organism, 'assemblies_count')
   const biosamples = num(organism, 'biosamples_count')
   const reads = num(organism, 'reads_count')
   const annotations = num(organism, 'genome_annotations_count')

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
               {/* Uniform scrim in dark mode so bright photos don’t glare against the shell */}
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
         <Link href={href}>
            <Card className="group hover:border-primary/50 transition-colors cursor-pointer p-0 gap-0 py-0">
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
                              {commonName && (
                                 <p
                                    className={cn(
                                       'text-muted-foreground truncate',
                                       comfy ? 'mt-0.5 text-[13px]' : 'text-xs',
                                    )}
                                 >
                                    {commonName}
                                 </p>
                              )}
                           </div>
                           <div className="flex shrink-0 flex-wrap justify-end gap-1">
                              {iucnBadge && (
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
                              )}
                           </div>
                        </div>
                        <LineageRankText organism={organism} compact compactComfortable={comfy} />
                     </div>
                  </div>
               </CardContent>
            </Card>
         </Link>
      )
   }

   return (
      <Link href={href}>
         <Card className="group hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col overflow-hidden p-0 gap-0 py-0 shadow-sm">
            {media}
            <CardContent className="flex flex-col flex-1 p-3 sm:p-4">
               <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                     <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {scientificName}
                     </h3>
                     {commonName && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{commonName}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                     {iucnBadge && (
                        <span
                           className={cn(
                              'inline-flex max-w-[10rem] truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold border',
                              iucnBadge.className,
                           )}
                           title={iucnBadge.title}
                        >
                           IUCN {iucnBadge.code}
                        </span>
                     )}
                  </div>
               </div>

               <LineageRankText organism={organism} />

               <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-2 mt-auto border-t border-border text-[11px] text-muted-foreground">
                  {assemblies > 0 && (
                     <span className="flex items-center gap-1">
                        <Dna className="h-3 w-3 shrink-0" />
                        {assemblies} genomes
                     </span>
                  )}
                  {biosamples > 0 && (
                     <span className="flex items-center gap-1">
                        <FlaskConical className="h-3 w-3 shrink-0" />
                        {biosamples} samples
                     </span>
                  )}
                  {reads > 0 && (
                     <span className="flex items-center gap-1">
                        <PlayCircle className="h-3 w-3 shrink-0" />
                        {reads} runs
                     </span>
                  )}
                  {annotations > 0 && (
                     <span className="flex items-center gap-1">
                        <Database className="h-3 w-3 shrink-0" />
                        {annotations} annotations
                     </span>
                  )}
               </div>
            </CardContent>
         </Card>
      </Link>
   )
}
