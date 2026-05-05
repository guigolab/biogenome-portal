'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import type { DashboardModuleVariant } from '@/components/cms/dashboard/dashboard-module-variant'
import {
   formatAuditTimestamp,
   getAuditLogChangeSections,
} from '@/components/cms/dashboard/organism-audit-log-diff'
import { OrganismAuditLogChanges } from '@/components/cms/dashboard/organism-audit-log-changes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
   cmsGetOrganismAuditLogs,
   type CmsOrganismAuditLogRow,
} from '@/lib/cms/services/auth'

const LIMIT = 15

export function OrganismAuditLogsModule({ variant = 'standalone' }: { variant?: DashboardModuleVariant }) {
   const embedded = variant === 'tabPanel'
   const [rows, setRows] = useState<CmsOrganismAuditLogRow[]>([])
   const [loading, setLoading] = useState(true)
   const [total, setTotal] = useState(0)
   const [page, setPage] = useState(1)
   const [query, setQuery] = useState('')
   const [queryDraft, setQueryDraft] = useState('')
   const [selected, setSelected] = useState<CmsOrganismAuditLogRow | null>(null)

   const fetchLogs = useCallback(async () => {
      setLoading(true)
      try {
         const payload = await cmsGetOrganismAuditLogs({
            limit: LIMIT,
            offset: (page - 1) * LIMIT,
            q: query || undefined,
            sort_column: 'timestamp',
            sort_order: 'desc',
         })
         setRows(payload.data ?? [])
         setTotal(typeof payload.total === 'number' ? payload.total : 0)
      } catch {
         setRows([])
         setTotal(0)
      } finally {
         setLoading(false)
      }
   }, [page, query])

   useEffect(() => {
      void fetchLogs()
   }, [fetchLogs])

   useEffect(() => {
      const t = setTimeout(() => {
         setQuery(queryDraft.trim())
         setPage(1)
      }, 350)
      return () => clearTimeout(t)
   }, [queryDraft])

   const selectedSections = useMemo(
      () => (selected ? getAuditLogChangeSections(selected) : []),
      [selected],
   )
   const maxPage = Math.max(1, Math.ceil(total / LIMIT))

   return (
      <>
         <Card className={cn('border-border/80 shadow-sm', embedded && 'rounded-xl border bg-card')}>
            <CardHeader className={cn(embedded && 'pb-2')}>
               {embedded ? (
                  <p className="text-sm text-muted-foreground">
                     Audit trail for species create, update, patch, and delete operations.
                  </p>
               ) : (
                  <div>
                     <CardTitle>Organism audit logs</CardTitle>
                     <CardDescription>
                        Audit trail for species create, update, patch, and delete operations.
                     </CardDescription>
                  </div>
               )}
            </CardHeader>
            <CardContent className="space-y-4">
               <Input
                  placeholder="Filter by user, species name, taxid, or action…"
                  value={queryDraft}
                  onChange={(e) => setQueryDraft(e.target.value)}
                  className="max-w-xl"
               />
               {loading ? (
                  <div className="flex justify-center py-12 text-muted-foreground">
                     <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
               ) : rows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No audit logs found.</p>
               ) : (
                  <div className="rounded-md border border-border">
                     <Table>
                        <TableHeader>
                           <TableRow>
                              <TableHead>Timestamp</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Species</TableHead>
                              <TableHead>Taxid</TableHead>
                              <TableHead>User</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {rows.map((row, idx) => (
                              <TableRow
                                 key={`${String(row._id ?? 'log')}-${idx}`}
                                 className="cursor-pointer"
                                 onClick={() => setSelected(row)}
                              >
                                 <TableCell>{formatAuditTimestamp(row.timestamp)}</TableCell>
                                 <TableCell className="uppercase">{String(row.action ?? '—')}</TableCell>
                                 <TableCell className="italic">{String(row.scientific_name ?? '—')}</TableCell>
                                 <TableCell>{String(row.taxid ?? '—')}</TableCell>
                                 <TableCell>{String(row.user ?? '—')}</TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </div>
               )}
               {total > LIMIT ? (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                     <span>
                        Page {page} of {maxPage}
                     </span>
                     <div className="flex gap-2">
                        <Button
                           variant="outline"
                           size="sm"
                           disabled={page <= 1}
                           onClick={() => setPage((p) => p - 1)}
                        >
                           Previous
                        </Button>
                        <Button
                           variant="outline"
                           size="sm"
                           disabled={page >= maxPage}
                           onClick={() => setPage((p) => p + 1)}
                        >
                           Next
                        </Button>
                     </div>
                  </div>
               ) : null}
            </CardContent>
         </Card>

         <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
            <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-4xl">
               <DialogHeader>
                  <DialogTitle>Audit log details</DialogTitle>
                  <DialogDescription>
                     {selected ? (
                        <>
                           {String(selected.scientific_name)} ({String(selected.taxid)}) ·{' '}
                           {formatAuditTimestamp(selected.timestamp)}
                        </>
                     ) : null}
                  </DialogDescription>
               </DialogHeader>
               {selected ? (
                  <div className="space-y-4 overflow-y-auto pr-1">
                     <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 text-sm md:grid-cols-3">
                        <div>
                           <p className="text-xs text-muted-foreground">Action</p>
                           <p className="font-medium uppercase">{String(selected.action ?? '—')}</p>
                        </div>
                        <div>
                           <p className="text-xs text-muted-foreground">User</p>
                           <p className="font-medium">{String(selected.user ?? '—')}</p>
                        </div>
                        <div>
                           <p className="text-xs text-muted-foreground">Timestamp</p>
                           <p className="font-medium">{formatAuditTimestamp(selected.timestamp)}</p>
                        </div>
                     </div>
                     <OrganismAuditLogChanges
                        sections={selectedSections}
                        emptyLabel="No field-level differences were detected for this entry."
                     />
                  </div>
               ) : null}
            </DialogContent>
         </Dialog>
      </>
   )
}
