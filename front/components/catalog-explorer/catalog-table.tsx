'use client'

import { Button } from '@/components/ui/button'
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table'
import { formatCellValue, getNestedValue, sortColumnForApi } from '@/lib/catalogQueryParams'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react'

export type CatalogTableProps = {
   columns: string[]
   /** Optional header text per column key (e.g. localized labels). */
   columnLabels?: Record<string, string>
   rows: Record<string, unknown>[]
   loading: boolean
   loadingMore: boolean
   total: number
   sortColumn: string
   sortOrder: 'asc' | 'desc'
   onSort: (column: string) => void
   onRowClick: (row: Record<string, unknown>) => void
   onLoadMore: () => void
   emptyMessage: string
}

function headerLabel(key: string): string {
   return key.replace(/\./g, ' · ')
}

export function CatalogTable({
   columns,
   columnLabels,
   rows,
   loading,
   loadingMore,
   total,
   sortColumn,
   sortOrder,
   onSort,
   onRowClick,
   onLoadMore,
   emptyMessage,
}: CatalogTableProps) {
   const activeSortApi = sortColumnForApi(sortColumn)

   return (
      <div className="space-y-3">
         <div className="rounded-xl border border-border overflow-x-auto">
            <Table>
               <TableHeader>
                  <TableRow>
                     {columns.map((col) => {
                        const isActive = sortColumnForApi(col) === activeSortApi
                        return (
                           <TableHead key={col} className="whitespace-nowrap">
                              <button
                                 type="button"
                                 className={cn(
                                    'inline-flex items-center gap-1 font-medium hover:text-foreground',
                                    isActive ? 'text-foreground' : 'text-muted-foreground',
                                 )}
                                 onClick={() => onSort(col)}
                              >
                                 {columnLabels?.[col] ?? headerLabel(col)}
                                 {isActive ? (
                                    sortOrder === 'asc' ? (
                                       <ArrowUp className="h-3.5 w-3.5" />
                                    ) : (
                                       <ArrowDown className="h-3.5 w-3.5" />
                                    )
                                 ) : null}
                              </button>
                           </TableHead>
                        )
                     })}
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {loading && rows.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={Math.max(columns.length, 1)} className="h-32 text-center">
                           <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                        </TableCell>
                     </TableRow>
                  ) : rows.length === 0 ? (
                     <TableRow>
                        <TableCell
                           colSpan={Math.max(columns.length, 1)}
                           className="h-24 text-center text-muted-foreground"
                        >
                           {emptyMessage}
                        </TableCell>
                     </TableRow>
                  ) : (
                     rows.map((row, idx) => (
                        <TableRow
                           key={idx}
                           className="cursor-pointer"
                           onClick={() => onRowClick(row)}
                        >
                           {columns.map((col) => (
                              <TableCell key={col} className="max-w-[min(24rem,40vw)] truncate font-mono text-xs">
                                 {formatCellValue(getNestedValue(row, col))}
                              </TableCell>
                           ))}
                        </TableRow>
                     ))
                  )}
               </TableBody>
            </Table>
         </div>
         <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
               {loading && rows.length === 0
                  ? '…'
                  : `Showing ${rows.length.toLocaleString()} of ${total.toLocaleString()}`}
            </p>
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
