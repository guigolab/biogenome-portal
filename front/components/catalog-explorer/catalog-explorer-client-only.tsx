'use client'

import dynamicImport from 'next/dynamic'
import { Loader2 } from 'lucide-react'

function CatalogLoadingFallback() {
   return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
         <Loader2 className="h-10 w-10 animate-spin" aria-label="Loading" />
      </div>
   )
}

// Entirely client-driven (portal context, search params, stores) — never render on the server
// (build or request time) so it can't block static generation or add SSR cost.
const CatalogExplorerPageClient = dynamicImport(
   () => import('./catalog-explorer-page-client').then((m) => m.CatalogExplorerPageClient),
   { ssr: false, loading: () => <CatalogLoadingFallback /> },
)

export function CatalogExplorerClientOnly() {
   return <CatalogExplorerPageClient />
}
