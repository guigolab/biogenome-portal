import type { Metadata } from 'next'

import { SpeciesListPageClient } from '@/components/species-list/species-list-page-client'

export const metadata: Metadata = {
   title: 'Species',
}

export default function SpeciesListPage() {
   return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
         <SpeciesListPageClient />
      </div>
   )
}
