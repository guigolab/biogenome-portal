'use client'

import dynamicImport from 'next/dynamic'
import { Loader2 } from 'lucide-react'

function GenomeBrowserLoadingFallback() {
   return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-20 text-muted-foreground">
         <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
      </div>
   )
}

// JBrowse2 pulls in heavy browser-only modules; never render this on the server (build or
// request time) so it can't block static generation or add SSR cost.
const GenomeBrowserPageClient = dynamicImport(
   () => import('./genome-browser-page-client').then((m) => m.GenomeBrowserPageClient),
   { ssr: false, loading: () => <GenomeBrowserLoadingFallback /> },
)

export function GenomeBrowserClientOnly() {
   return (
      <div className="flex min-h-0 flex-1 flex-col">
         <GenomeBrowserPageClient />
      </div>
   )
}
