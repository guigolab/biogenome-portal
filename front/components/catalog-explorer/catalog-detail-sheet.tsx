'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CatalogMetadataPanel } from '@/components/catalog-explorer/catalog-metadata-panel'
import { isInsdcCatalogMetadataModel } from '@/lib/catalog-metadata'
import type { DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

function formatJson(row: Record<string, unknown>): string {
   try {
      return JSON.stringify(row, null, 2)
   } catch {
      return String(row)
   }
}

export type CatalogDetailSheetProps = {
   open: boolean
   onOpenChange: (open: boolean) => void
   model: DataModels
   row: Record<string, unknown> | null
   speciesHref?: string | null
}

export function CatalogDetailSheet({
   open,
   onOpenChange,
   model,
   row,
   speciesHref,
}: CatalogDetailSheetProps) {
   const title =
      row && typeof row.name === 'string'
         ? row.name
         : row && typeof row.scientific_name === 'string'
           ? row.scientific_name
           : row && typeof row.assembly_name === 'string'
             ? row.assembly_name
             : row && typeof row.accession === 'string'
               ? row.accession
               : row && typeof row.run_accession === 'string'
                 ? row.run_accession
                 : row && typeof row.local_id === 'string'
                   ? row.local_id
                   : 'Record'

   return (
      <Sheet open={open} onOpenChange={onOpenChange}>
         <SheetContent className="flex w-[min(100vw-2rem,28rem)] flex-col sm:max-w-lg">
            <SheetHeader className="shrink-0 text-left">
               <SheetTitle className="line-clamp-2 pr-8">{title}</SheetTitle>
               <SheetDescription>
                  {model} ·{' '}
                  {row?.taxid != null ? String(row.taxid) : '—'}
               </SheetDescription>
            </SheetHeader>
            {speciesHref ? (
               <Button variant="outline" size="sm" className="mt-2 shrink-0 gap-1.5 self-start" asChild>
                  <Link href={speciesHref}>
                     <ExternalLink className="h-3.5 w-3.5" />
                     Open species page
                  </Link>
               </Button>
            ) : null}
            <ScrollArea className={cn('mt-4 min-h-0 flex-1 rounded-md border border-border')}>
               <div className="p-3">
                  {row && isInsdcCatalogMetadataModel(model) ? (
                     <CatalogMetadataPanel className="mb-4" model={model} metadata={row.metadata} />
                  ) : null}
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                     Raw record
                  </p>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap break-words font-mono">
                     {row ? formatJson(row) : '—'}
                  </pre>
               </div>
            </ScrollArea>
         </SheetContent>
      </Sheet>
   )
}
