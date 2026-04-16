'use client'

import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { catalogColumnHeaderLabel } from '@/lib/catalog-explorer/catalogColumnLabels'
import {
   catalogIdentifierField,
   getCatalogCardFieldsForModel,
   resolveCatalogCardValue,
   resolveCatalogHeaderBadge,
} from '@/lib/catalog-explorer/catalogRecordCardLayout'
import {
   cardHeaderDescription,
   cardHeaderTitle,
   useTaxidInDescription,
} from '@/lib/catalog-explorer/catalogRecordHeader'
import { formatCatalogCardCellValue, formatCellValue } from '@/lib/catalogQueryParams'
import { ModelIcon } from '@/lib/modelIcons'
import type { DataModels } from '@/lib/portal/types'
import {
   Binary,
   Building2,
   Calendar,
   Circle,
   Cloud,
   Database,
   Dna,
   FlaskConical,
   FolderKanban,
   Gauge,
   Globe,
   Hash,
   Image,
   LayoutGrid,
   Landmark,
   Leaf,
   Library,
   Link,
   ListTree,
   MapPin,
   Percent,
   Star,
   Tag,
   TestTube,
   ToggleLeft,
   Trees,
   User,
   Layers,
   type LucideIcon,
} from 'lucide-react'

const CATALOG_CARD_ICONS: Record<string, LucideIcon> = {
   Tag,
   Layers,
   Calendar,
   Dna,
   Percent,
   Hash,
   FolderKanban,
   Building2,
   Globe,
   MapPin,
   Trees,
   FlaskConical,
   TestTube,
   Library,
   Database,
   LayoutGrid,
   Link,
   Gauge,
   Cloud,
   Binary,
   ListTree,
   ToggleLeft,
   Leaf,
   Landmark,
   Image,
   Star,
   User,
}

export function CatalogCardFieldIcon({ name }: { name?: string }) {
   if (!name) return null
   const Icon = CATALOG_CARD_ICONS[name] ?? Circle
   return <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
}

export function showCatalogIdentifierBadgeRow(model: DataModels): boolean {
   return (
      model !== 'biosamples' &&
      model !== 'assemblies' &&
      model !== 'reads' &&
      model !== 'annotations'
   )
}

/** Body fields duplicated by the new header — omit to avoid repeating. */
export function shouldOmitCatalogCardBodyField(model: DataModels, fieldKey: string): boolean {
   if (model === 'assemblies' && fieldKey === 'assembly_name') return true
   if (model === 'annotations' && fieldKey === 'metadata.assembly_name') return true
   return false
}

function headerIdentifier(model: DataModels, row: Record<string, unknown>): string {
   const key = catalogIdentifierField(model)
   const v = resolveCatalogCardValue(model, key, row)
   return formatCellValue(v)
}

export type CatalogRecordCardHeaderProps = {
   model: DataModels
   row: Record<string, unknown>
   locale: string
   /** Extra controls next to the title (e.g. copy). */
   titleActions?: ReactNode
   /** Use a heading in sheets / dialogs for a11y. */
   titleAs?: 'p' | 'h3'
}

export function CatalogRecordCardHeader({
   model,
   row,
   locale,
   titleActions,
   titleAs = 'p',
}: CatalogRecordCardHeaderProps) {
   const headerBadge = resolveCatalogHeaderBadge(model, row, locale)
   const TitleTag = titleAs

   return (
      <div className="flex items-start justify-between gap-3">
         <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
               className="flex shrink-0 pt-0.5 text-primary"
               title={model.replace(/_/g, ' ')}
               aria-hidden
            >
               <ModelIcon modelKey={model} className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
               <p className="sr-only">{model.replace(/_/g, ' ')}</p>
               <div className="flex min-w-0 items-start gap-1.5">
                  <TitleTag className="line-clamp-2 min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight">
                     {cardHeaderTitle(model, row)}
                  </TitleTag>
                  {titleActions}
               </div>
               <p className="text-xs text-muted-foreground">
                  {useTaxidInDescription(model) ? (
                     <>taxid · {cardHeaderDescription(model, row)}</>
                  ) : (
                     cardHeaderDescription(model, row)
                  )}
               </p>
            </div>
         </div>
         {headerBadge ? (
            headerBadge.variant === 'icon-only' ? (
               <span
                  title={headerBadge.label}
                  aria-label={headerBadge.label}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-50 text-amber-500 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400"
               >
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
               </span>
            ) : (
               <Badge
                  variant="outline"
                  className="max-w-[min(100%,14rem)] shrink-0 gap-1.5 border-primary/30 bg-primary/5 px-2 py-1.5 text-left font-normal"
               >
                  <span className="flex min-w-0 items-start gap-1.5">
                     <CatalogCardFieldIcon name={headerBadge.icon} />
                     <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="line-clamp-2 text-[10px] font-medium leading-tight text-muted-foreground">
                           {headerBadge.label}
                        </span>
                        <span className="line-clamp-3 break-words text-xs font-semibold leading-snug text-foreground">
                           {headerBadge.value}
                        </span>
                     </span>
                  </span>
               </Badge>
            )
         ) : null}
      </div>
   )
}

export type CatalogRecordIdentifierRowProps = {
   model: DataModels
   row: Record<string, unknown>
}

export function CatalogRecordIdentifierRow({ model, row }: CatalogRecordIdentifierRowProps) {
   if (!showCatalogIdentifierBadgeRow(model)) return null
   return (
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
         <Badge variant="secondary" className="max-w-full truncate font-mono text-xs font-normal">
            {headerIdentifier(model, row)}
         </Badge>
      </div>
   )
}

export type CatalogRecordCardFieldsProps = {
   model: DataModels
   row: Record<string, unknown>
   locale: string
}

export function CatalogRecordCardFields({ model, row, locale }: CatalogRecordCardFieldsProps) {
   const defsRaw = getCatalogCardFieldsForModel(model, row, locale)
   const defs = defsRaw.filter((d) => !shouldOmitCatalogCardBodyField(model, d.key))
   if (defs.length === 0) return null

   return (
      <dl className="space-y-2 border-t border-border pt-3 text-sm">
         {defs.map((def) => {
            const raw = resolveCatalogCardValue(model, def.key, row)
            const text = formatCatalogCardCellValue(raw)
            const label =
               (def.label && (def.label[locale] ?? def.label.en)) ??
               catalogColumnHeaderLabel(model, def.key, locale)
            return (
               <div key={def.key} className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                  <dt className="flex min-w-0 items-start gap-1.5 text-xs font-medium text-muted-foreground">
                     <CatalogCardFieldIcon name={def.icon} />
                     <span className="line-clamp-2">{label}</span>
                  </dt>
                  <dd className="min-w-0 break-words font-mono text-xs text-foreground">{text}</dd>
               </div>
            )
         })}
      </dl>
   )
}
