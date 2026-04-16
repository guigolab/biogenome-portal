'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/contexts/locale-context'
import { sortStatEntriesByCountDesc } from '@/lib/speciesFieldStats'
import { COUNTRY_STATS_NO_ENTRY, countryStatRealCodes } from '@/lib/speciesCountryStats'
import { countryLabelForLocale } from '@/lib/countryLabels'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export type SpeciesCountryListFilterProps = {
   countryStats: Record<string, number>
   selectedCodes: string[]
   onToggleCode: (alpha2: string) => void
   onClearSelection: () => void
}

export function SpeciesCountryListFilter({
   countryStats,
   selectedCodes,
   onToggleCode,
   onClearSelection,
}: SpeciesCountryListFilterProps) {
   const { t, locale } = useLocale()
   const [listFilter, setListFilter] = useState('')

   const selectedSet = useMemo(() => new Set(selectedCodes.map((c) => c.toUpperCase())), [selectedCodes])

   const listEntries = useMemo(() => {
      const entries = sortStatEntriesByCountDesc(
         countryStatRealCodes(countryStats).map((code) => [code, countryStats[code] ?? 0] as [string, number]),
      )
      const q = listFilter.trim().toLowerCase()
      if (!q) return entries
      return entries.filter(([code]) => {
         const label = countryLabelForLocale(code, locale).toLowerCase()
         return code.toLowerCase().includes(q) || label.includes(q)
      })
   }, [countryStats, listFilter, locale])

   return (
      <div className="space-y-3">
         <div className="flex flex-wrap items-center gap-2">
            <Input
               type="search"
               value={listFilter}
               onChange={(e) => setListFilter(e.target.value)}
               placeholder={t('speciesList.countryListSearchPlaceholder')}
               className="h-9 min-w-[8rem] flex-1"
               aria-label={t('speciesList.countryListSearchPlaceholder')}
            />
            {selectedCodes.length > 0 ? (
               <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0" onClick={onClearSelection}>
                  {t('speciesList.countryClearSelection')}
               </Button>
            ) : null}
         </div>

         <div
            className="max-h-[min(40vh,16rem)] space-y-0.5 overflow-y-auto overscroll-contain py-1"
            role="listbox"
            aria-label={t('speciesList.filterByCountry')}
            aria-multiselectable
         >
            {listEntries.map(([code, count]) => {
               const sel = selectedSet.has(code.toUpperCase())
               const upper = code.toUpperCase()
               const displayName = countryLabelForLocale(code, locale)
               return (
                  <button
                     key={code}
                     type="button"
                     role="option"
                     aria-selected={sel}
                     aria-label={`${t('speciesList.filterByCountry')}: ${displayName} (${upper})`}
                     className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
                        sel && 'bg-muted',
                     )}
                     onClick={() => onToggleCode(code)}
                  >
                     <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} aria-hidden />
                     <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{displayName}</span>
                        <span className="shrink-0 font-mono text-[10px] font-medium tabular-nums tracking-wide text-muted-foreground">
                           {upper}
                        </span>
                     </span>
                     <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {count.toLocaleString()}
                     </span>
                  </button>
               )
            })}
         </div>

         {typeof countryStats[COUNTRY_STATS_NO_ENTRY] === 'number' ? (
            <p className="text-xs text-muted-foreground">{t('speciesList.countryNoEntryHint')}</p>
         ) : null}
      </div>
   )
}
