'use client'

import { CatalogRecordDetailContent } from '@/components/catalog-explorer/catalog-record-detail-content'
import {
   cardHeaderDescription,
   cardHeaderTitle,
   useTaxidInDescription,
} from '@/lib/catalog-explorer/catalogRecordHeader'
import { ModelIcon } from '@/lib/modelIcons'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { DataModels } from '@/lib/portal/types'

export type CatalogRecordDetailSheetProps = {
   open: boolean
   onOpenChange: (open: boolean) => void
   catalogKey: DataModels
   detailRow: Record<string, unknown> | null
   rootTaxid: string
   speciesHref: string | null
   t: (key: string) => string
}

export function CatalogRecordDetailSheet({
   open,
   onOpenChange,
   catalogKey,
   detailRow,
   rootTaxid,
   speciesHref,
   t,
}: CatalogRecordDetailSheetProps) {
   const title = detailRow ? cardHeaderTitle(catalogKey, detailRow) : t('catalog.recordDetails')
   const description = detailRow ? cardHeaderDescription(catalogKey, detailRow) : catalogKey

   return (
      <Sheet open={open} onOpenChange={onOpenChange}>
         <SheetContent
            side="right"
            className="flex w-[min(100vw-1rem,28rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl lg:w-[min(100vw-2rem,40rem)] lg:max-w-2xl"
         >
            {/* a11y-only label; visible title is rendered below */}
            <SheetHeader className="sr-only shrink-0">
               <SheetTitle>{title}</SheetTitle>
               <SheetDescription>{description}</SheetDescription>
            </SheetHeader>

            {/* Visible non-scrolling header strip */}
            {detailRow ? (
               <div className="shrink-0 border-b border-border px-4 pb-3 pr-12 pt-4">
                  <div className="flex min-w-0 items-start gap-2.5">
                     <span className="flex shrink-0 pt-0.5 text-primary" aria-hidden>
                        <ModelIcon modelKey={catalogKey} className="h-5 w-5" />
                     </span>
                     <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug">{title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                           {useTaxidInDescription(catalogKey) ? (
                              <>taxid · {description}</>
                           ) : (
                              description
                           )}
                        </p>
                     </div>
                  </div>
               </div>
            ) : null}

            <ScrollArea className="min-h-0 flex-1">
               {detailRow ? (
                  <div className="px-4 pb-8 pt-4">
                     <CatalogRecordDetailContent
                        catalogKey={catalogKey}
                        detailRow={detailRow}
                        rootTaxid={rootTaxid}
                        speciesHref={speciesHref}
                        t={t}
                        hideHeader
                     />
                  </div>
               ) : null}
            </ScrollArea>
         </SheetContent>
      </Sheet>
   )
}
