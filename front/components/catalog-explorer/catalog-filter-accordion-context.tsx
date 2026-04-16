'use client'

import {
   createContext,
   useCallback,
   useContext,
   useMemo,
   useState,
   type ReactNode,
} from 'react'

export type CatalogFilterAccordionContextValue = {
   openSection: string | undefined
   setOpenSection: (id: string | undefined) => void
}

const CatalogFilterAccordionContext = createContext<CatalogFilterAccordionContextValue | null>(null)

export function useCatalogFilterAccordion(): CatalogFilterAccordionContextValue {
   const ctx = useContext(CatalogFilterAccordionContext)
   if (!ctx) {
      throw new Error('useCatalogFilterAccordion must be used within CatalogFilterAccordionProvider')
   }
   return ctx
}

/** Stable id for accordion section (filter key may contain dots). */
export function catalogFilterSectionId(filterKey: string): string {
   return `cf-${filterKey.replace(/[^\w.-]+/g, '_')}`
}

export function CatalogFilterAccordionProvider({
   children,
   defaultOpenSectionId,
}: {
   children: ReactNode
   /** First filter open by default, matching species taxonomy section behavior. */
   defaultOpenSectionId?: string
}) {
   const [openSection, setOpenState] = useState<string | undefined>(defaultOpenSectionId)

   const setOpenSection = useCallback((id: string | undefined) => {
      setOpenState(id)
   }, [])

   const value = useMemo(
      () => ({ openSection, setOpenSection }),
      [openSection, setOpenSection],
   )

   return (
      <CatalogFilterAccordionContext.Provider value={value}>{children}</CatalogFilterAccordionContext.Provider>
   )
}
