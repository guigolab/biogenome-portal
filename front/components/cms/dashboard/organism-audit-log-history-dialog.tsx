'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowLeft, History, Loader2 } from 'lucide-react'

import { OrganismAuditActionBadge, OrganismAuditActionDot } from '@/components/cms/dashboard/organism-audit-action-badge'
import { OrganismAuditLogChanges } from '@/components/cms/dashboard/organism-audit-log-changes'
import {
   formatAuditTimestamp,
   formatRelativeAuditTimestamp,
   getAuditLogChangeSections,
   parseAuditObjectId,
} from '@/components/cms/dashboard/organism-audit-log-diff'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import {
   cmsGetOrganismAuditLogsByTaxid,
   type CmsOrganismAuditLogRow,
} from '@/lib/cms/services/auth'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 5

function auditRowKey(row: CmsOrganismAuditLogRow, idx: number): string {
   return parseAuditObjectId(row._id) ?? `history-${idx}`
}

function HistoryListSkeleton() {
   return (
      <div className="space-y-2 p-3">
         {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="space-y-2 rounded-md border border-border p-3">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-3 w-32" />
               <Skeleton className="h-3 w-20" />
            </div>
         ))}
      </div>
   )
}

function HistoryEntryRow({
   row,
   selected,
   onSelect,
}: {
   row: CmsOrganismAuditLogRow
   selected: boolean
   onSelect: () => void
}) {
   return (
      <button
         type="button"
         onClick={onSelect}
         className={cn(
            'w-full rounded-md border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-muted/80',
            selected && 'border-primary/25 bg-muted ring-1 ring-primary/20',
         )}
      >
         <div className="mb-1.5 flex items-center gap-2">
            <OrganismAuditActionDot action={String(row.action ?? '')} />
            <OrganismAuditActionBadge action={String(row.action ?? '')} className="text-xs" />
         </div>
         <p className="text-xs font-medium">{formatRelativeAuditTimestamp(row.timestamp)}</p>
         <p className="text-xs text-muted-foreground">{formatAuditTimestamp(row.timestamp)}</p>
         <p className="mt-1 truncate text-xs text-muted-foreground">by {String(row.user ?? 'unknown')}</p>
      </button>
   )
}

function HistoryDetailPane({ row }: { row: CmsOrganismAuditLogRow }) {
   const sections = useMemo(() => getAuditLogChangeSections(row), [row])

   return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-card">
         <div className="shrink-0 border-b border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
               <OrganismAuditActionBadge action={String(row.action ?? '')} />
               <span className="text-sm text-muted-foreground">{formatAuditTimestamp(row.timestamp)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">by {String(row.user ?? 'unknown')}</p>
         </div>
         <ScrollArea className="min-h-0 flex-1 bg-card">
            <div className="bg-card p-4">
               <OrganismAuditLogChanges sections={sections} defaultOpenAll />
            </div>
         </ScrollArea>
      </div>
   )
}

export function OrganismAuditLogHistoryDialog({
   taxid,
   scientificName,
   open,
   onOpenChange,
}: {
   taxid: string | null
   scientificName: string | null
   open: boolean
   onOpenChange: (open: boolean) => void
}) {
   const [loading, setLoading] = useState(false)
   const [loadingMore, setLoadingMore] = useState(false)
   const [error, setError] = useState<string | null>(null)
   const [rows, setRows] = useState<CmsOrganismAuditLogRow[]>([])
   const [total, setTotal] = useState(0)
   const [selectedKey, setSelectedKey] = useState<string | null>(null)
   const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

   useEffect(() => {
      if (!open || !taxid) {
         setRows([])
         setError(null)
         setTotal(0)
         setLoadingMore(false)
         setSelectedKey(null)
         setMobileDetailOpen(false)
         return
      }
      let cancelled = false
      setLoading(true)
      setError(null)
      void cmsGetOrganismAuditLogsByTaxid(taxid, {
         limit: PAGE_SIZE,
         offset: 0,
         sort_column: 'timestamp',
         sort_order: 'desc',
      })
         .then((payload) => {
            if (!cancelled) {
               const nextRows = payload.data ?? []
               setRows(nextRows)
               setTotal(typeof payload.total === 'number' ? payload.total : 0)
               setSelectedKey(nextRows.length > 0 ? auditRowKey(nextRows[0], 0) : null)
               setMobileDetailOpen(false)
            }
         })
         .catch((e) => {
            if (!cancelled) setError(extractApiMessage(e, 'Could not load species history.'))
         })
         .finally(() => {
            if (!cancelled) setLoading(false)
         })

      return () => {
         cancelled = true
      }
   }, [open, taxid])

   const hasMore = rows.length < total
   const selectedRow = useMemo(() => {
      if (!selectedKey) return null
      const idx = rows.findIndex((row, i) => auditRowKey(row, i) === selectedKey)
      return idx >= 0 ? rows[idx] : rows[0] ?? null
   }, [rows, selectedKey])

   useEffect(() => {
      if (rows.length === 0) {
         setSelectedKey(null)
         return
      }
      if (!selectedKey || !rows.some((row, idx) => auditRowKey(row, idx) === selectedKey)) {
         setSelectedKey(auditRowKey(rows[0], 0))
      }
   }, [rows, selectedKey])

   async function loadMore() {
      if (!taxid || loadingMore || !hasMore) return
      setLoadingMore(true)
      try {
         const payload = await cmsGetOrganismAuditLogsByTaxid(taxid, {
            limit: PAGE_SIZE,
            offset: rows.length,
            sort_column: 'timestamp',
            sort_order: 'desc',
         })
         const nextRows = payload.data ?? []
         setRows((prev) => [...prev, ...nextRows])
         setTotal(typeof payload.total === 'number' ? payload.total : total)
      } catch (e) {
         setError(extractApiMessage(e, 'Could not load more history entries.'))
      } finally {
         setLoadingMore(false)
      }
   }

   function selectRow(row: CmsOrganismAuditLogRow, idx: number) {
      setSelectedKey(auditRowKey(row, idx))
      setMobileDetailOpen(true)
   }

   return (
      <Sheet open={open} onOpenChange={onOpenChange}>
         <SheetContent
            side="right"
            className="flex h-full min-h-0 w-full flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-5xl"
         >
            <SheetHeader className="shrink-0 space-y-2 border-b border-border bg-card px-6 py-4 text-left">
               <SheetTitle>Species history</SheetTitle>
               <SheetDescription>
                  {scientificName ? (
                     <>
                        Ordered organism change history for <em>{scientificName}</em> ({taxid ?? '—'}).
                     </>
                  ) : (
                     'Ordered organism change history.'
                  )}
               </SheetDescription>
            </SheetHeader>

            {loading ? (
               <div className="flex min-h-0 flex-1 flex-col bg-card sm:flex-row">
                  <div className="w-full border-b border-border bg-card sm:w-72 sm:shrink-0 sm:border-b-0 sm:border-r">
                     <HistoryListSkeleton />
                  </div>
                  <div className="hidden flex-1 bg-card p-4 sm:block">
                     <Skeleton className="mb-3 h-6 w-40" />
                     <Skeleton className="mb-2 h-4 w-56" />
                     <Skeleton className="h-40 w-full" />
                  </div>
               </div>
            ) : error ? (
               <Empty className="min-h-[40vh] flex-1 border-0">
                  <EmptyHeader>
                     <EmptyMedia variant="icon">
                        <AlertCircle />
                     </EmptyMedia>
                     <EmptyTitle>Could not load history</EmptyTitle>
                     <EmptyDescription>{error}</EmptyDescription>
                  </EmptyHeader>
               </Empty>
            ) : rows.length === 0 ? (
               <Empty className="min-h-[40vh] flex-1 border-0">
                  <EmptyHeader>
                     <EmptyMedia variant="icon">
                        <History />
                     </EmptyMedia>
                     <EmptyTitle>No history entries</EmptyTitle>
                     <EmptyDescription>No changes have been recorded for this species yet.</EmptyDescription>
                  </EmptyHeader>
               </Empty>
            ) : (
               <div className="flex min-h-0 flex-1 flex-col bg-card sm:flex-row">
                  <div
                     className={cn(
                        'relative z-10 flex min-h-0 w-full flex-col overflow-hidden border-b border-border bg-card sm:w-72 sm:shrink-0 sm:border-b-0 sm:border-r',
                        mobileDetailOpen && 'hidden sm:flex',
                     )}
                  >
                     <ScrollArea className="min-h-0 flex-1 bg-card">
                        <div className="space-y-1 p-2">
                           {rows.map((row, idx) => (
                              <HistoryEntryRow
                                 key={auditRowKey(row, idx)}
                                 row={row}
                                 selected={auditRowKey(row, idx) === selectedKey}
                                 onSelect={() => selectRow(row, idx)}
                              />
                           ))}
                        </div>
                     </ScrollArea>
                     {hasMore ? (
                        <div className="shrink-0 border-t border-border p-3">
                           <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              disabled={loadingMore}
                              onClick={() => void loadMore()}
                           >
                              {loadingMore ? (
                                 <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                 </>
                              ) : (
                                 'Load more'
                              )}
                           </Button>
                        </div>
                     ) : null}
                  </div>

                  <div
                     className={cn(
                        'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card',
                        !mobileDetailOpen && 'hidden sm:flex',
                     )}
                  >
                     <div className="border-b border-border px-3 py-2 sm:hidden">
                        <Button
                           type="button"
                           variant="ghost"
                           size="sm"
                           className="gap-1.5"
                           onClick={() => setMobileDetailOpen(false)}
                        >
                           <ArrowLeft className="h-4 w-4" />
                           Back to list
                        </Button>
                     </div>
                     {selectedRow ? <HistoryDetailPane key={selectedKey} row={selectedRow} /> : null}
                  </div>
               </div>
            )}
         </SheetContent>
      </Sheet>
   )
}
