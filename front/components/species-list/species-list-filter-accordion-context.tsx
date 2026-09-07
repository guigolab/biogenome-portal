'use client'

import {
   createContext,
   useCallback,
   useContext,
   useEffect,
   useMemo,
   useState,
   type ReactNode,
} from 'react'

export const TAXONOMY_SECTION_ID = 'taxonomy'
/** @deprecated Use TAXONOMY_SECTION_ID */
export const TREE_SECTION_ID = TAXONOMY_SECTION_ID
export const IUCN_SECTION_ID = 'iucn'
export const SUB_PROJECT_SECTION_ID = 'sub_project'
export const COUNTRIES_SECTION_ID = 'countries'
export const GOAT_STATUS_SECTION_ID = 'goat_status'

type SpeciesListFilterAccordionContextValue = {
   openSection: string | undefined
   setOpenSection: (id: string | undefined) => void
}

const SpeciesListFilterAccordionContext = createContext<SpeciesListFilterAccordionContextValue | null>(
   null,
)

export function useSpeciesListFilterAccordion(): SpeciesListFilterAccordionContextValue {
   const ctx = useContext(SpeciesListFilterAccordionContext)
   if (!ctx) {
      throw new Error('useSpeciesListFilterAccordion must be used within SpeciesListFilterAccordionProvider')
   }
   return ctx
}

export function SpeciesListFilterAccordionProvider({
   children,
   onTaxonomySectionOpen,
}: {
   children: ReactNode
   /** Prefetch rank taxa when the taxonomy panel is opened. */
   onTaxonomySectionOpen: () => void
}) {
   /** Taxonomy starts open so the tree stays discoverable; prefetch runs while it is open. */
   const [openSection, setOpenState] = useState<string | undefined>(TAXONOMY_SECTION_ID)

   useEffect(() => {
      if (openSection === TAXONOMY_SECTION_ID) {
         onTaxonomySectionOpen()
      }
   }, [openSection, onTaxonomySectionOpen])

   const setOpenSection = useCallback((id: string | undefined) => {
      setOpenState(id)
   }, [])

   const value = useMemo(
      () => ({ openSection, setOpenSection }),
      [openSection, setOpenSection],
   )

   return (
      <SpeciesListFilterAccordionContext.Provider value={value}>
         {children}
      </SpeciesListFilterAccordionContext.Provider>
   )
}
