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
import type { SpeciesSortMode } from '@/lib/speciesListSort'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Download } from 'lucide-react'

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

export type SpeciesListResultsStatusProps = {
   loading: boolean
   itemsLength: number
   total: number
   filtersActive: boolean
   listRefreshing: boolean
   className?: string
}

export type SpeciesListSortExportControlsProps = {
   sortMode: SpeciesSortMode
   sortModes: SpeciesSortMode[]
   onSortModeChange: (mode: SpeciesSortMode) => void
   onExportClick: () => void
}

function SpeciesListSortExportControls({
   sortMode,
   sortModes,
   onSortModeChange,
   onExportClick,
}: SpeciesListSortExportControlsProps) {
   const { t } = useLocale()
   const sortLabels = (m: SpeciesSortMode): string => {
      switch (m) {
         case 'alpha':
            return t('speciesList.sort.alpha')
         case 'recent':
            return t('speciesList.sort.recent')
         case 'samples':
            return t('speciesList.sort.samples')
         case 'reads':
            return t('speciesList.sort.reads')
         case 'assemblies':
            return t('speciesList.sort.assemblies')
         case 'annotations':
            return t('speciesList.sort.annotations')
      }
   }

   return (
      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 sm:gap-3">
         <Select value={sortMode} onValueChange={(v) => onSortModeChange(v as SpeciesSortMode)}>
            <SelectTrigger
               className="h-9 w-[min(100%,11rem)] sm:min-w-[12rem] sm:w-[min(100%,16rem)]"
               aria-label={t('speciesList.sortSpeciesList')}
            >
               <SelectValue />
            </SelectTrigger>
            <SelectContent>
               {sortModes.map((m) => (
                  <SelectItem key={m} value={m}>
                     {sortLabels(m)}
                  </SelectItem>
               ))}
            </SelectContent>
         </Select>

         <Tip label={t('speciesList.downloadDataTsv')}>
            <Button
               type="button"
               variant="outline"
               size="sm"
               className="h-9 gap-1.5 px-3"
               onClick={onExportClick}
               aria-label={t('speciesList.downloadDataTsv')}
            >
               <Download className="h-4 w-4 shrink-0" aria-hidden />
               <span className="hidden sm:inline">{t('common.exportTsv')}</span>
            </Button>
         </Tip>
      </div>
   )
}

export type SpeciesListResultsSummaryProps = Omit<SpeciesListResultsStatusProps, 'className'> &
   SpeciesListSortExportControlsProps

/** Single row: counts (left) · sort + export (right). */
export function SpeciesListResultsSummary({
   loading,
   itemsLength,
   total,
   filtersActive,
   listRefreshing,
   sortMode,
   sortModes,
   onSortModeChange,
   onExportClick,
}: SpeciesListResultsSummaryProps) {
   return (
      <TooltipPrimitive.Provider delayDuration={200}>
         <div className="flex min-w-0 flex-nowrap items-end justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 basis-0 overflow-hidden">
               <SpeciesListResultsStatus
                  loading={loading}
                  itemsLength={itemsLength}
                  total={total}
                  filtersActive={filtersActive}
                  listRefreshing={listRefreshing}
                  className="truncate"
               />
            </div>
            <SpeciesListSortExportControls
               sortMode={sortMode}
               sortModes={sortModes}
               onSortModeChange={onSortModeChange}
               onExportClick={onExportClick}
            />
         </div>
      </TooltipPrimitive.Provider>
   )
}

/** Showing X of Y — use inside {@link SpeciesListResultsSummary} or standalone. */
export function SpeciesListResultsStatus({
   loading,
   itemsLength,
   total,
   filtersActive,
   listRefreshing,
   className,
}: SpeciesListResultsStatusProps) {
   const { t } = useLocale()
   const statusInitialLoad = loading && itemsLength === 0

   return (
      <p
         className={cn(
            'text-xs leading-relaxed text-muted-foreground tabular-nums sm:text-sm',
            className,
         )}
         role="status"
      >
         {statusInitialLoad ? (
            t('common.loading')
         ) : listRefreshing ? (
            <>
               {t('common.showing')} {itemsLength.toLocaleString()} {t('common.of')}{' '}
               {total.toLocaleString()} {t('speciesList.species')}
               {filtersActive ? <> · {t('speciesList.filtered')}</> : null}
               <span className="whitespace-nowrap text-muted-foreground/90">
                  {' '}
                  · {t('speciesList.updatingResults')}
               </span>
            </>
         ) : (
            <>
               {t('common.showing')} {itemsLength.toLocaleString()} {t('common.of')}{' '}
               {total.toLocaleString()} {t('speciesList.species')}
               {filtersActive ? <> · {t('speciesList.filtered')}</> : null}
            </>
         )}
      </p>
   )
}
