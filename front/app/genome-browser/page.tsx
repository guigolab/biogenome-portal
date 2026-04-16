import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loader2 } from 'lucide-react'

import { GenomeBrowserPageClient } from '@/components/genome-browser/genome-browser-page-client'

export const metadata: Metadata = {
   title: 'Genome',
   description:
      'Browse chromosome-level and complete genome assemblies with JBrowse 2. Sessions listed here are assemblies with per-chromosome sequence data suitable for the linear genome view.',
}

export default function GenomeBrowserPage() {
   return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
         <Suspense
            fallback={
               <div className="flex min-h-0 flex-1 items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
               </div>
            }
         >
            <div className="flex min-h-0 flex-1 flex-col">
               <GenomeBrowserPageClient />
            </div>
         </Suspense>
      </div>
   )
}
