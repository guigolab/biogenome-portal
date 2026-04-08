'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import type { DataModels } from '@/lib/portal/types'
import { ExternalLink } from 'lucide-react'

function enaRunUrl(runAcc: string): string {
   return `https://www.ebi.ac.uk/ena/browser/view/${encodeURIComponent(runAcc)}`
}

function enaBiosampleUrl(acc: string): string {
   return `https://www.ebi.ac.uk/biosamples/samples/${encodeURIComponent(acc)}`
}

export type CatalogRecordActionsProps = {
   catalogKey: DataModels
   row: Record<string, unknown>
   t: (key: string) => string
}

/**
 * Catalog-specific shortcuts (genome browser, INSDC) shown in the table detail panel.
 */
export function CatalogRecordActions({ catalogKey, row, t }: CatalogRecordActionsProps) {
   const taxid = row.taxid != null ? String(row.taxid).trim() : ''

   if (catalogKey === 'assemblies') {
      const acc = typeof row.accession === 'string' ? row.accession.trim() : ''
      if (!acc) return null
      const qs = new URLSearchParams({ assembly: acc })
      if (taxid) qs.set('taxid', taxid)
      return (
         <Button variant="outline" size="sm" asChild>
            <Link href={`/genome-browser?${qs.toString()}`}>{t('catalog.openGenomeBrowser')}</Link>
         </Button>
      )
   }

   if (catalogKey === 'annotations') {
      const name = typeof row.name === 'string' ? row.name.trim() : ''
      const asm =
         typeof row.assembly_accession === 'string' ? row.assembly_accession.trim() : ''
      if (!name || !asm) return null
      const qs = new URLSearchParams({ assembly: asm, annotation: name })
      if (taxid) qs.set('taxid', taxid)
      return (
         <Button variant="outline" size="sm" asChild>
            <Link href={`/genome-browser?${qs.toString()}`}>{t('catalog.openGenomeBrowser')}</Link>
         </Button>
      )
   }

   if (catalogKey === 'reads') {
      const run =
         typeof row.run_accession === 'string'
            ? row.run_accession.trim()
            : typeof (row.metadata as Record<string, unknown> | undefined)?.run_accession === 'string'
              ? String((row.metadata as Record<string, string>).run_accession).trim()
              : ''
      if (!run) return null
      return (
         <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={enaRunUrl(run)} target="_blank" rel="noopener noreferrer">
               {t('catalog.openEnaRecord')}
               <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
         </Button>
      )
   }

   if (catalogKey === 'biosamples') {
      const acc = typeof row.accession === 'string' ? row.accession.trim() : ''
      if (!acc) return null
      return (
         <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={enaBiosampleUrl(acc)} target="_blank" rel="noopener noreferrer">
               {t('catalog.openEnaRecord')}
               <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
         </Button>
      )
   }

   return null
}
