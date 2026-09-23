'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/contexts/locale-context'
import {
   isSpeciesMetadataEmptyBucketKey,
   sortStatEntriesByCountDesc,
} from '@/lib/speciesFieldStats'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export type SpeciesStringMultiselectFilterProps = {
   stats: Record<string, number> | null
   selectedValues: string[]
   onToggleValue: (value: string) => void
   onClearSelection: () => void
   ariaLabel: string
   searchPlaceholder: string
   clearLabel: string
   formatOptionLabel?: (code: string) => string
   loading?: boolean
}

/**
 * Multiselect checkbox list for string stats buckets (institutes / programs).
 * Hides empty / zero-count buckets unless selected (same idea as country + data filters).
 */
export function SpeciesStringMultiselectFilter({
   stats,
   selectedValues,
   onToggleValue,
   onClearSelection,
   ariaLabel,
   searchPlaceholder,
   clearLabel,
   formatOptionLabel,
   loading = false,
}: SpeciesStringMultiselectFilterProps) {
   const { t } = useLocale()
   const [listFilter, setListFilter] = useState('')

   const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues])

   const listEntries = useMemo(() => {
      const raw = Object.entries(stats ?? {}).filter(([code]) => {
         if (isSpeciesMetadataEmptyBucketKey(code)) return false
         return true
      })
      const entries = sortStatEntriesByCountDesc(
         raw
            .map(([code, count]) => [code, count] as [string, number])
            .filter(([code, count]) => count > 0 || selectedSet.has(code)),
      )
      const q = listFilter.trim().toLowerCase()
      if (!q) return entries
      return entries.filter(([code]) => {
         const label = (formatOptionLabel ? formatOptionLabel(code) : code).toLowerCase()
         return code.toLowerCase().includes(q) || label.includes(q)
      })
   }, [stats, listFilter, selectedSet, formatOptionLabel])

   return (
      <div className="space-y-3">
         <div className="flex flex-wrap items-center gap-2">
            <Input
               type="search"
               value={listFilter}
               onChange={(e) => setListFilter(e.target.value)}
               placeholder={searchPlaceholder}
               className="h-9 min-w-[8rem] flex-1"
               aria-label={searchPlaceholder}
            />
            {selectedValues.length > 0 ? (
               <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0" onClick={onClearSelection}>
                  {clearLabel}
               </Button>
            ) : null}
         </div>

         <div
            className="max-h-[min(40vh,16rem)] space-y-0.5 overflow-y-auto overscroll-contain py-1"
            role="listbox"
            aria-label={ariaLabel}
            aria-multiselectable
         >
            {loading && stats == null ? (
               <p className="px-2 py-2 text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : listEntries.length === 0 ? (
               <p className="px-2 py-2 text-sm text-muted-foreground">{t('speciesList.principalFacetEmpty')}</p>
            ) : (
               listEntries.map(([code, count]) => {
                  const sel = selectedSet.has(code)
                  const label = formatOptionLabel ? formatOptionLabel(code) : code
                  return (
                     <button
                        key={code}
                        type="button"
                        role="option"
                        aria-selected={sel}
                        className={cn(
                           'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
                           sel && 'bg-muted',
                        )}
                        onClick={() => onToggleValue(code)}
                     >
                        <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                           {count.toLocaleString()}
                        </span>
                     </button>
                  )
               })
            )}
         </div>
      </div>
   )
}
