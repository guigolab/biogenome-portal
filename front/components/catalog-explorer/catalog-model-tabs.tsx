'use client'

import { useLocale } from '@/contexts/locale-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
   /** When false, show label prefix (default true). */
   showLabel?: boolean
   className?: string
}

export function CatalogModelTabs({
   scopeTaxon,
   catalogKey,
   catalogKeys,
   countsReady,
   onSelectCatalog,
   showLabel = true,
   className,
}: CatalogModelTabsProps) {
   const { t } = useLocale()

   const countFor = (k: DataModels) =>
      taxonNodeToPortalStats(scopeTaxon).find((r) => r.key === k)?.count ?? 0

   return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
         {showLabel ? (
            <span className="text-muted-foreground shrink-0 text-sm">{t('catalog.scopeCatalog')}</span>
         ) : null}
         {!countsReady ? (
            <span className="text-muted-foreground inline-flex items-center gap-2 text-sm">
               <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
               {t('catalog.countsLoading')}
            </span>
         ) : catalogKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('catalog.noCatalogsWithData')}</p>
         ) : (
            <div className="flex flex-wrap gap-1.5">
               {catalogKeys.map((k) => {
                  const n = countFor(k)
                  const active = k === catalogKey
                  return (
                     <Button
                        key={k}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                           'h-8 gap-1.5 rounded-full px-2.5 font-normal transition-colors',
                           active && 'bg-primary text-primary-foreground hover:bg-primary/90',
                        )}
                        onClick={() => onSelectCatalog(k)}
                     >
                        <span className="max-w-[10rem] truncate capitalize">{k.replace(/_/g, ' ')}</span>
                        <Badge variant="secondary" className="tabular-nums px-1.5 py-0 text-[10px]">
                           {n.toLocaleString()}
                        </Badge>
                     </Button>
                  )
               })}
            </div>
         )}
      </div>
   )
}
