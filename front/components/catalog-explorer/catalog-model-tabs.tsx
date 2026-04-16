'use client'

import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/contexts/locale-context'
import { ModelIcon } from '@/lib/modelIcons'
import type { DataModels } from '@/lib/portal/types'
import { taxonNodeToPortalStats } from '@/lib/portal/taxonNodeStats'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export type CatalogModelTabsProps = {
   scopeTaxon: Record<string, unknown> | null
   catalogKey: DataModels
   catalogKeys: DataModels[]
   countsReady: boolean
   onSelectCatalog: (k: DataModels) => void
   className?: string
}

/**
 * Primary catalog collection switcher — visual match to admin dashboard `TabsList` / `TabsTrigger`
 * (`rounded-xl bg-muted/80 p-1`, `rounded-lg` triggers), with count badges.
 */
export function CatalogModelTabs({
   scopeTaxon,
   catalogKey,
   catalogKeys,
   countsReady,
   onSelectCatalog,
   className,
}: CatalogModelTabsProps) {
   const { t } = useLocale()

   const countFor = (k: DataModels) =>
      taxonNodeToPortalStats(scopeTaxon).find((r) => r.key === k)?.count ?? 0

   return (
      <div className={cn('flex w-full min-w-0 items-center', className)}>
         {!countsReady ? (
            <span className="text-muted-foreground inline-flex min-h-10 items-center gap-2 text-sm">
               <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
               {t('catalog.countsLoading')}
            </span>
         ) : catalogKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('catalog.noCatalogsWithData')}</p>
         ) : (
            <div
               className="w-full min-w-0 overflow-x-auto"
               role="tablist"
               aria-label={t('catalog.collectionTablist')}
            >
               <div className="flex h-10 w-max min-w-full items-center gap-1 rounded-xl bg-muted/80 p-1 dark:bg-muted/60">
                  {catalogKeys.map((k) => {
                     const n = countFor(k)
                     const active = k === catalogKey
                     return (
                        <button
                           key={k}
                           type="button"
                           role="tab"
                           aria-selected={active}
                           className={cn(
                              'flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm transition-all sm:px-3',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                              active
                                 ? cn(
                                      'bg-background font-semibold text-foreground shadow-sm ring-1 ring-border/80',
                                      'dark:bg-card dark:text-foreground dark:shadow-md dark:ring-2 dark:ring-primary/55',
                                   )
                                 : 'font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground dark:hover:bg-muted/40',
                           )}
                           onClick={() => onSelectCatalog(k)}
                        >
                           <ModelIcon
                              modelKey={k}
                              className={cn(
                                 'h-4 w-4 shrink-0',
                                 active ? 'text-primary' : 'text-muted-foreground',
                              )}
                           />
                           <span className="whitespace-nowrap capitalize">{t(`models.${k}`) || k.replace(/_/g, ' ')}</span>
                           <Badge
                              variant={active ? 'default' : 'secondary'}
                              className="shrink-0 tabular-nums px-1.5 py-0 text-[10px]"
                           >
                              {n.toLocaleString()}
                           </Badge>
                        </button>
                     )
                  })}
               </div>
            </div>
         )}
      </div>
   )
}
