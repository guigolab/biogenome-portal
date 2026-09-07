import type { Metadata } from 'next'

import { GenomeBrowserClientOnly } from '@/components/genome-browser/genome-browser-client-only'

export const metadata: Metadata = {
   title: 'Genome browser',
   description: 'Browse genome assemblies and annotations.',
}

export default function GenomeBrowserPage() {
   return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
         <GenomeBrowserClientOnly />
      </div>
   )
}
