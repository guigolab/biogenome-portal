'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLocale } from '@/contexts/locale-context'
import { X } from 'lucide-react'

export type ActiveFilterChip = {
   id: string
   label: string
   clear: () => void
   removeAriaLabel: string
}

export type SpeciesListActiveFiltersProps = {
   activeFilterChips: ActiveFilterChip[]
   filtersActive: boolean
   onClearAllFilters: () => void
   /** Defaults to `speciesList.activeFilters`. */
   activeFiltersHeading?: string
   /** Defaults to `speciesList.clearAllFilters`. */
   clearAllFiltersLabel?: string
   /** Continuation inside a parent card (no second bordered panel). */
   embedded?: boolean
   /**
    * Toolbar: chips under search — no top border (parent uses gap).
    * When false/undefined and embedded, uses border-t for card-style continuation.
    */
   embeddedBelowSearch?: boolean
}

export function SpeciesListActiveFilters({
   activeFilterChips,
   filtersActive,
   onClearAllFilters,
   activeFiltersHeading,
   clearAllFiltersLabel,
   embedded = false,
   embeddedBelowSearch = false,
}: SpeciesListActiveFiltersProps) {
   const { t } = useLocale()
   const heading = activeFiltersHeading ?? t('speciesList.activeFilters')
   const clearLabel = clearAllFiltersLabel ?? t('speciesList.clearAllFilters')
   if (activeFilterChips.length === 0 && !filtersActive) {
      return null
   }

   return (
      <div
         className={cn(
            'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between',
            embedded && embeddedBelowSearch
               ? ''
               : embedded
                 ? 'border-t border-border pt-3'
                 : 'mb-4 rounded-xl border border-border bg-card/80 p-3',
            activeFilterChips.length === 0 && 'sm:justify-end',
         )}
      >
         {activeFilterChips.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
               <span className="text-sm text-muted-foreground">{heading}</span>
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
         ) : (
            <div className="min-w-0 flex-1" />
         )}
         <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 w-full shrink-0 sm:w-auto"
            disabled={!filtersActive}
            onClick={onClearAllFilters}
         >
            {clearLabel}
         </Button>
      </div>
   )
}
