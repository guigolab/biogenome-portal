import type { Metadata } from 'next'

import { CatalogExplorerClientOnly } from '@/components/catalog-explorer/catalog-explorer-client-only'

/** Assemblies, BioSamples, read runs, organisms, and annotations use catalog layout from `@/lib/catalog-models`. `models.local_samples` / `models.annotations` in portal.json may override card layout, sort/export fields, labels, filters, and charts. */

export const metadata: Metadata = {
   title: 'Catalog',
   description: 'Browse and filter genomic data collections for this project.',
}

export default function CatalogPage() {
   return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
         <CatalogExplorerClientOnly />
      </div>
   )
}
