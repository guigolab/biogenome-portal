'use client'

import { useLocale } from '@/contexts/locale-context'
import {
   SPECIES_DATA_FILTER_CODES,
   type SpeciesDataFilterCode,
} from '@/lib/speciesDataFilter'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const LABEL_KEY: Record<SpeciesDataFilterCode, string> = {
   bio: 'speciesList.hasBiosamples',
   asm: 'speciesList.hasAssemblies',
   reads: 'speciesList.hasReads',
   ann: 'speciesList.hasAnnotations',
}

export function SpeciesDataFilterList({
   selectedKeys,
   onToggleKey,
   counts,
   loading,
}: {
   selectedKeys: SpeciesDataFilterCode[]
   onToggleKey: (key: SpeciesDataFilterCode) => void
   counts: Record<string, number> | null
   loading: boolean
}) {
   const { t } = useLocale()
   const visibleCodes =
      loading || counts == null
         ? SPECIES_DATA_FILTER_CODES
         : SPECIES_DATA_FILTER_CODES.filter(
              (code) => (counts[code] ?? 0) > 0 || selectedKeys.includes(code),
           )
   return (
      <div
         className="max-h-[min(50vh,24rem)] space-y-0.5 overflow-y-auto overscroll-contain py-1"
         role="listbox"
         aria-label={t('speciesList.filterByDataAria')}
         aria-multiselectable
      >
         {visibleCodes.map((code) => {
            const sel = selectedKeys.includes(code)
            const count = counts?.[code]
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
                  onClick={() => onToggleKey(code)}
               >
                  <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1 truncate">{t(LABEL_KEY[code])}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                     {loading || count == null ? '—' : count.toLocaleString()}
                  </span>
               </button>
            )
         })}
      </div>
   )
}
