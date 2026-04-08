'use client'

import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/locale-context'
import { Search, X } from 'lucide-react'

export type ActiveFilterChip = {
   id: string
   label: string
   clear: () => void
   removeAriaLabel: string
}

export type SpeciesListToolbarProps = {
   searchInput: string
   onSearchChange: (value: string) => void
   filtersActive: boolean
   onClearAllFilters: () => void
   /** When false, IUCN frequencies are empty or only the “no value” bucket — hide the select. */
   iucnFilterVisible?: boolean
   iucnThreatFilter: string
   onIucnChange: (value: string) => void
   iucnOptions: [string, number][]
   labelIucn: (code: string) => string
   activeFilterChips: ActiveFilterChip[]
   rankFiltersSlot: ReactNode
}

export function SpeciesListToolbar({
   searchInput,
   onSearchChange,
   filtersActive,
   onClearAllFilters,
   iucnFilterVisible = true,
   iucnThreatFilter,
   onIucnChange,
   iucnOptions,
   labelIucn,
   activeFilterChips,
   rankFiltersSlot,
}: SpeciesListToolbarProps) {
   const { t } = useLocale()
   return (
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 mb-6 space-y-4">
         <div className="space-y-1.5">
            <label htmlFor="species-search" className="sr-only">
               {t('speciesList.searchByNameTaxonomyId')}
            </label>
            <div className="relative w-full max-w-xl">
               <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                  aria-hidden
               />
               <Input
                  id="species-search"
                  placeholder={t('speciesList.searchPlaceholder')}
                  value={searchInput}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="h-9 pl-9"
                  aria-label={t('speciesList.searchByNameTaxonomyId')}
               />
            </div>
         </div>

         <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
               {t('speciesList.taxonomy')}
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">{rankFiltersSlot}</div>
         </div>

         <div
            className={cn(
               'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
               iucnFilterVisible ? 'sm:justify-between' : 'sm:justify-end',
            )}
         >
            {iucnFilterVisible ? (
               <div className="w-full min-w-[12rem] sm:w-auto sm:max-w-xs sm:flex-1">
                  <Select value={iucnThreatFilter} onValueChange={onIucnChange}>
                     <SelectTrigger
                        className="h-9 w-full"
                        aria-label={t('speciesList.filterByIucnCategory')}
                     >
                        <SelectValue placeholder={t('speciesList.iucnThreat')} />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="all">{t('speciesList.allIucnCategories')}</SelectItem>
                        {iucnOptions.map(([code, count]) => (
                           <SelectItem key={code} value={code}>
                              <span className="flex w-full min-w-0 items-center justify-between gap-2">
                                 <span className="truncate">{labelIucn(code)}</span>
                                 <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                                    {count.toLocaleString()}
                                 </span>
                              </span>
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
            ) : null}
            <Button
               type="button"
               variant="secondary"
               size="sm"
               className="h-9 w-full shrink-0 sm:w-auto"
               disabled={!filtersActive}
               onClick={onClearAllFilters}
            >
               {t('speciesList.clearAllFilters')}
            </Button>
         </div>

         {activeFilterChips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
               <span className="text-sm text-muted-foreground">{t('speciesList.activeFilters')}</span>
               {activeFilterChips.map((chip) => (
                  <Badge key={chip.id} variant="secondary" className="gap-1.5 py-1 pl-2 pr-1">
                     <span className="max-w-[14rem] truncate">{chip.label}</span>
                     <button
                        type="button"
                        className={cn(
                           'inline-flex rounded-sm p-0.5 text-muted-foreground hover:text-foreground',
                           'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        )}
                        aria-label={chip.removeAriaLabel}
                        onClick={chip.clear}
                     >
                        <X className="h-3.5 w-3.5" aria-hidden />
                     </button>
                  </Badge>
               ))}
            </div>
         ) : null}
      </div>
   )
}
