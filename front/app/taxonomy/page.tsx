import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loader2 } from 'lucide-react'

/** Client uses `useSearchParams` (`taxid` deep-link); keep wrapped in Suspense. */
import TaxonomyClientPage from './taxonomy-client-page'

export const metadata: Metadata = {
   title: 'Taxonomy',
   description: 'Explore the portal taxonomy tree and organisms by taxon.',
}

export default function TaxonomyPage() {
   return (
      <div className="flex min-h-0 flex-1 flex-col">
         <Suspense
            fallback={
               <div className="flex min-h-[50vh] flex-1 items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
               </div>
            }
         >
            <TaxonomyClientPage />
         </Suspense>
      </div>
   )
}
