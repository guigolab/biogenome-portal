'use client'

import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { BarChart3, LayoutList } from 'lucide-react'

export type CatalogViewModeTabsProps = {
   t: (key: string) => string
   className?: string
}

/** Table / dashboard switcher — must render inside parent {@link Tabs} (Radix). */
export function CatalogViewModeTabs({ t, className }: CatalogViewModeTabsProps) {
   return (
      <TabsList
         className={cn(
            'inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-muted/80 p-1',
            className,
         )}
      >
         <TabsTrigger value="table" className="h-8 gap-1.5 rounded-lg px-3 py-1.5 text-sm">
            <LayoutList className="h-4 w-4 shrink-0" aria-hidden />
            {t('catalog.viewTable')}
         </TabsTrigger>
         <TabsTrigger value="dashboard" className="h-8 gap-1.5 rounded-lg px-3 py-1.5 text-sm">
            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
            {t('catalog.viewDashboard')}
         </TabsTrigger>
      </TabsList>
   )
}


