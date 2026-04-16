import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

import { CatalogExplorerPageClient } from '@/components/catalog-explorer/catalog-explorer-page-client'

/** Assemblies, BioSamples, read runs, organisms, and annotations use catalog layout from `lib/portal/catalogModelsDefaults.ts`. `models.local_samples` / `models.annotations` in portal.json may override card layout, sort/export fields, labels, filters, and charts. */

export const metadata: Metadata = {
   title: 'Catalog',
   description:
      'Portal INSDC catalogs (assemblies, BioSamples, reads, annotations): filter, browse records or dashboard charts, TSV/JSONL export.',
}

export default function CatalogPage() {
   return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
         <Suspense
            fallback={
               <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
                  <Loader2 className="h-10 w-10 animate-spin" aria-label="Loading" />
               </div>
            }
         >
            <CatalogExplorerPageClient />
         </Suspense>
      </div>
   )
}
