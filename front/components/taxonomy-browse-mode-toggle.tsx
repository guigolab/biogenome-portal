'use client'

import { useLocale } from '@/contexts/locale-context'
import type { TaxonomyBrowseMode } from '@/lib/citizenTaxonomy'
import { cn } from '@/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function TaxonomyBrowseModeToggle({
   mode,
   onModeChange,
   className,
}: {
   mode: TaxonomyBrowseMode
   onModeChange: (mode: TaxonomyBrowseMode) => void
   className?: string
}) {
   const { t } = useLocale()
   return (
      <ToggleGroup
         type="single"
         value={mode}
         onValueChange={(v) => {
            if (v === 'citizen' || v === 'full') onModeChange(v)
         }}
         variant="outline"
         size="sm"
         className={cn('w-full justify-stretch', className)}
         aria-label={t('taxonomy.browseModeAria')}
      >
         <ToggleGroupItem value="citizen" className="min-w-0 flex-1 px-2 text-xs">
            {t('taxonomy.browseCitizen')}
         </ToggleGroupItem>
         <ToggleGroupItem value="full" className="min-w-0 flex-1 px-2 text-xs">
            {t('taxonomy.browseFull')}
         </ToggleGroupItem>
      </ToggleGroup>
   )
}
