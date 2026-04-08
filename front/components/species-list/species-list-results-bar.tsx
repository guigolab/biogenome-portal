'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import { useLocale } from '@/contexts/locale-context'
import { cn } from '@/lib/utils'
import { SPECIES_SORT_MODES, type SpeciesSortMode } from '@/lib/speciesListSort'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Download, Grid3X3, LayoutList } from 'lucide-react'

const SORT_MODES = SPECIES_SORT_MODES

function Tip({
   children,
   label,
}: {
   children: ReactNode
   label: string
}) {
   return (
      <TooltipPrimitive.Root>
         <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
         <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
               sideOffset={6}
               className={cn(
                  'z-50 w-fit rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background',
                  'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
               )}
            >
               {label}
               <TooltipPrimitive.Arrow className="fill-foreground" />
            </TooltipPrimitive.Content>
         </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
   )
}

export type ViewMode = 'grid' | 'list'

export type SpeciesListResultsBarProps = {
   loading: boolean
   itemsLength: number
   total: number
   filtersActive: boolean
   sortMode: SpeciesSortMode
   onSortModeChange: (mode: SpeciesSortMode) => void
   viewMode: ViewMode
   onViewModeChange: (mode: ViewMode) => void
   onExportClick: () => void
}

export function SpeciesListResultsBar({
   loading,
   itemsLength,
   total,
   filtersActive,
   sortMode,
   onSortModeChange,
   viewMode,
   onViewModeChange,
   onExportClick,
}: SpeciesListResultsBarProps) {
   const { t } = useLocale()
   const sortLabels: Record<SpeciesSortMode, string> = {
      alpha: t('speciesList.sort.alpha'),
      recent: t('speciesList.sort.recent'),
      samples: t('speciesList.sort.samples'),
   }
   return (
      <TooltipPrimitive.Provider delayDuration={200}>
         <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
               {loading ? (
                  t('common.loading')
               ) : (
                  <>
                     {t('common.showing')} {itemsLength.toLocaleString()} {t('common.of')}{' '}
                     {total.toLocaleString()} {t('speciesList.species')}
                     {filtersActive ? <> ({t('speciesList.filtered')})</> : null}
                  </>
               )}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
               <Select
                  value={sortMode}
                  onValueChange={(v) => onSortModeChange(v as SpeciesSortMode)}
               >
                  <SelectTrigger
                     className="h-9 w-[min(100%,11rem)] sm:w-52"
                     aria-label={t('speciesList.sortSpeciesList')}
                  >
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     {SORT_MODES.map((m) => (
                        <SelectItem key={m} value={m}>
                           {sortLabels[m]}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>

               <div className="flex h-9 w-fit shrink-0 rounded-md border border-input shadow-xs">
                  <Tip label={t('speciesList.gridView')}>
                     <Button
                        type="button"
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => onViewModeChange('grid')}
                        className="h-9 w-9 rounded-r-none border-0 shadow-none"
                        aria-pressed={viewMode === 'grid'}
                        aria-label={t('speciesList.gridView')}
                     >
                        <Grid3X3 className="h-4 w-4" />
                     </Button>
                  </Tip>
                  <Tip label={t('speciesList.listView')}>
                     <Button
                        type="button"
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => onViewModeChange('list')}
                        className="h-9 w-9 rounded-l-none border-0 border-l border-border shadow-none"
                        aria-pressed={viewMode === 'list'}
                        aria-label={t('speciesList.listView')}
                     >
                        <LayoutList className="h-4 w-4" />
                     </Button>
                  </Tip>
               </div>

               <Tip label={t('speciesList.downloadDataTsv')}>
                  <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     className="h-9 gap-1.5"
                     onClick={onExportClick}
                     aria-label={t('speciesList.downloadDataTsv')}
                  >
                     <Download className="h-4 w-4 shrink-0" aria-hidden />
                     <span className="hidden sm:inline">{t('common.exportTsv')}</span>
                  </Button>
               </Tip>
            </div>
         </div>
      </TooltipPrimitive.Provider>
   )
}
