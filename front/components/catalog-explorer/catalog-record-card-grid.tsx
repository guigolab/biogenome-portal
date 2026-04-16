'use client'

import { Button } from '@/components/ui/button'
import { CatalogRecordCard } from '@/components/catalog-explorer/catalog-record-card'
import { catalogIdentifierField } from '@/lib/catalog-explorer/catalogRecordCardLayout'
import type { DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export type CatalogRecordCardGridProps = {
   model: DataModels
   rows: Record<string, unknown>[]
   loading: boolean
   loadingMore: boolean
   total: number
   onRowClick: (row: Record<string, unknown>) => void
   onLoadMore: () => void
   emptyMessage: string
   activeRow?: Record<string, unknown> | null
}

function stableRowKey(model: DataModels, row: Record<string, unknown>, index: number): string {
   const idKey = catalogIdentifierField(model)
   const v = row[idKey]
   if (v != null && String(v).trim() !== '') return `${model}:${String(v)}`
   const t = row.taxid
   if (t != null) return `${model}:taxid:${String(t)}:${index}`
   return `${model}:row:${index}`
}

export function CatalogRecordCardGrid({
   model,
   rows,
   loading,
   loadingMore,
   total,
   onRowClick,
   onLoadMore,
   emptyMessage,
   activeRow,
}: CatalogRecordCardGridProps) {
   return (
      <div className="space-y-3">
         {loading && rows.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
            </div>
         ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</p>
         ) : (
            <div
               className={cn(
                  'grid gap-4',
                  'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
               )}
            >
               {rows.map((row, idx) => (
                  <CatalogRecordCard
                     key={stableRowKey(model, row, idx)}
                     model={model}
                     row={row}
                     active={activeRow != null && activeRow === row}
                     onClick={() => onRowClick(row)}
                  />
               ))}
            </div>
         )}
         <div className="flex items-center justify-end">
            {rows.length < total ? (
               <Button type="button" variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>
                  {loadingMore ? (
                     <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading…
                     </>
                  ) : (
                     'Load more'
                  )}
               </Button>
            ) : null}
         </div>
      </div>
   )
}
