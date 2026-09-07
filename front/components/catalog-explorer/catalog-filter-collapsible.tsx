'use client'

import type { ReactNode } from 'react'

import { useCatalogFilterAccordion } from '@/components/catalog-explorer/catalog-filter-accordion-context'
import { FilterSectionCollapsible } from '@/components/filters/filter-sidebar-template'

export function CatalogFilterCollapsible({
   sectionId,
   title,
   children,
   onPanelOpen,
   isActive,
   onReset,
   clearLabel,
}: {
   sectionId: string
   title: ReactNode
   children: ReactNode
   /** Called when the panel opens (lazy options load, etc.). */
   onPanelOpen?: () => void
   /** True when this field has an active filter value; shows a reset button. */
   isActive?: boolean
   /** Called when the reset (×) button is clicked. */
   onReset?: () => void
   /** Aria label for the reset button. */
   clearLabel?: string
}) {
   const { openSection, setOpenSection } = useCatalogFilterAccordion()

   return (
      <FilterSectionCollapsible
         open={openSection === sectionId}
         onOpenChange={(next) => {
            setOpenSection(next ? sectionId : undefined)
            if (next && onPanelOpen) onPanelOpen()
         }}
         title={title}
         isActive={isActive}
         onReset={onReset}
         clearLabel={clearLabel}
      >
         {children}
      </FilterSectionCollapsible>
   )
}
