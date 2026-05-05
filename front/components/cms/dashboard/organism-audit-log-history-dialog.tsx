'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { OrganismAuditLogChanges } from '@/components/cms/dashboard/organism-audit-log-changes'
import {
   formatAuditTimestamp,
   getAuditLogChangeSections,
} from '@/components/cms/dashboard/organism-audit-log-diff'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
   cmsGetOrganismAuditLogsByTaxid,
   type CmsOrganismAuditLogRow,
} from '@/lib/cms/services/auth'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 5

function HistoryTimelineEntry({ row }: { row: CmsOrganismAuditLogRow }) {
   const [expanded, setExpanded] = useState(false)
   const sections = useMemo(
      () => (expanded ? getAuditLogChangeSections(row) : []),
      [expanded, row],
   )

   return (
      <div className="relative pl-6">
         <span className="absolute left-1.5 top-0 h-full w-px bg-border" aria-hidden />
         <span className="absolute left-0 top-2 h-3 w-3 rounded-full bg-primary" aria-hidden />
         <div className="rounded-md border border-border bg-card p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
               <Badge variant="outline" className="uppercase">
                  {String(row.action ?? '—')}
               </Badge>
               <span className="text-muted-foreground">{formatAuditTimestamp(row.timestamp)}</span>
               <span className="text-muted-foreground">by {String(row.user ?? 'unknown')}</span>
            </div>
            <Accordion
               type="single"
               collapsible
               className="w-full"
               value={expanded ? 'changes' : ''}
               onValueChange={(value) => setExpanded(value === 'changes')}
            >
               <AccordionItem value="changes" className="border-b-0">
                  <AccordionTrigger className="py-2 text-xs">View changed fields</AccordionTrigger>
                  <AccordionContent className="pt-1">
                     <OrganismAuditLogChanges sections={sections} />
                  </AccordionContent>
               </AccordionItem>
            </Accordion>
         </div>
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

   useEffect(() => {
      if (!open || !taxid) {
         setRows([])
         setError(null)
         setTotal(0)
         setLoadingMore(false)
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
               setRows(payload.data ?? [])
               setTotal(typeof payload.total === 'number' ? payload.total : 0)
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

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
            <DialogHeader>
               <DialogTitle>Species history</DialogTitle>
               <DialogDescription>
                  {scientificName ? (
                     <>
                        Ordered organism change history for <em>{scientificName}</em> ({taxid ?? '—'}).
                     </>
                  ) : (
                     'Ordered organism change history.'
                  )}
               </DialogDescription>
            </DialogHeader>

            {loading ? (
               <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
               </div>
            ) : error ? (
               <p className="py-8 text-center text-sm text-destructive">{error}</p>
            ) : rows.length === 0 ? (
               <p className="py-8 text-center text-sm text-muted-foreground">No history entries found.</p>
            ) : (
               <ScrollArea className="h-[65vh] pr-3">
                  <div className="space-y-6">
                     {rows.map((row, idx) => (
                        <HistoryTimelineEntry key={`${String(row._id ?? 'history')}-${idx}`} row={row} />
                     ))}
                     {hasMore ? (
                        <div className="flex justify-center pt-2">
                           <Button
                              type="button"
                              variant="outline"
                              size="sm"
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
               </ScrollArea>
            )}
         </DialogContent>
      </Dialog>
   )
}
