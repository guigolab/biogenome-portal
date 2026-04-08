import type { Metadata } from 'next'

import { CatalogExplorerPageClient } from '@/components/catalog-explorer/catalog-explorer-page-client'

/** Assemblies, BioSamples, read runs, organisms, and annotations use catalog layout from `lib/portal/catalogModelsDefaults.ts`. Only `models.local_samples` in portal.json may override labels/filters/columns/charts. */

export const metadata: Metadata = {
   title: 'Catalog',
   description:
      'INSDC catalog explorer: assemblies (NCBI metadata, BlobToolKit), BioSamples (ENA checklist fields), read runs (ENA filereport), and genome annotations. Per-model columns, filters, themed dashboard charts (palette by collection), TSV/JSONL export, and shortcuts to the genome browser or ENA. Annotation dashboard calls out Annotrieve-style vs portal-upload rows on the loaded page.',
}

export default function CatalogPage() {
   return (
      <div className="flex min-h-0 flex-1 flex-col">
         <CatalogExplorerPageClient />
      </div>
   )
}
