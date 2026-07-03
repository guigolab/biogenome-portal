'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { History } from 'lucide-react'

import { DashboardModuleHeader } from '@/components/cms/dashboard/dashboard-module-header'
import { DashboardModulePagination } from '@/components/cms/dashboard/dashboard-module-pagination'
import { OrganismAuditActionBadge } from '@/components/cms/dashboard/organism-audit-action-badge'
import {
   formatAuditTimestamp,
   getAuditActionMeta,
   getAuditLogChangeSections,
   ORGANISM_AUDIT_ACTIONS,
} from '@/components/cms/dashboard/organism-audit-log-diff'
import { OrganismAuditLogChanges } from '@/components/cms/dashboard/organism-audit-log-changes'
import { Card, CardContent } from '@/components/ui/card'
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table'
import {
   cmsGetOrganismAuditLogs,
   type CmsOrganismAuditLogRow,
} from '@/lib/cms/services/auth'

const LIMIT = 15
const ALL_ACTIONS = 'all'

function AuditLogsTableSkeleton() {
   return (
      <>
         {Array.from({ length: 6 }).map((_, idx) => (
            <TableRow key={idx}>
               <TableCell>
                  <Skeleton className="h-4 w-36" />
               </TableCell>
               <TableCell>
                  <Skeleton className="h-5 w-24" />
               </TableCell>
               <TableCell>
                  <Skeleton className="h-4 w-40" />
               </TableCell>
               <TableCell>
                  <Skeleton className="h-4 w-20" />
               </TableCell>
               <TableCell>
                  <Skeleton className="h-4 w-24" />
               </TableCell>
            </TableRow>
         ))}
      </>
   )
}

export function OrganismAuditLogsModule() {
   const [rows, setRows] = useState<CmsOrganismAuditLogRow[]>([])
   const [loading, setLoading] = useState(true)
   const [total, setTotal] = useState(0)
   const [page, setPage] = useState(1)
   const [query, setQuery] = useState('')
   const [queryDraft, setQueryDraft] = useState('')
   const [actionFilter, setActionFilter] = useState(ALL_ACTIONS)
   const [dateFrom, setDateFrom] = useState('')
   const [dateTo, setDateTo] = useState('')
   const [selected, setSelected] = useState<CmsOrganismAuditLogRow | null>(null)

   const fetchLogs = useCallback(async () => {
      setLoading(true)
      try {
         const payload = await cmsGetOrganismAuditLogs({
            limit: LIMIT,
            offset: (page - 1) * LIMIT,
            q: query || undefined,
            action: actionFilter === ALL_ACTIONS ? undefined : actionFilter,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
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
   }, [page, query, actionFilter, dateFrom, dateTo])

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
         <Card className="gap-3 border-border/80 shadow-sm">
            <DashboardModuleHeader description="Audit trail for species create, update, patch, delete, and deletion request operations." />
            <CardContent className="space-y-4">
               <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Input
                     placeholder="Search by species name or user…"
                     value={queryDraft}
                     onChange={(e) => setQueryDraft(e.target.value)}
                     className="max-w-md"
                  />
                  <Select
                     value={actionFilter}
                     onValueChange={(value) => {
                        setActionFilter(value)
                        setPage(1)
                     }}
                  >
                     <SelectTrigger className="w-full sm:w-[12rem]" aria-label="Filter by action">
                        <SelectValue placeholder="All actions" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value={ALL_ACTIONS}>All actions</SelectItem>
                        {ORGANISM_AUDIT_ACTIONS.map((action) => (
                           <SelectItem key={action} value={action}>
                              {getAuditActionMeta(action).label}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
                  <Input
                     type="date"
                     className="h-9 w-full max-w-[11rem] sm:w-[11rem]"
                     aria-label="From date"
                     value={dateFrom}
                     onChange={(e) => {
                        setDateFrom(e.target.value)
                        setPage(1)
                     }}
                  />
                  <span className="hidden text-sm text-muted-foreground sm:inline">–</span>
                  <Input
                     type="date"
                     className="h-9 w-full max-w-[11rem] sm:w-[11rem]"
                     aria-label="To date"
                     value={dateTo}
                     onChange={(e) => {
                        setDateTo(e.target.value)
                        setPage(1)
                     }}
                  />
               </div>
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
                        {loading ? (
                           <AuditLogsTableSkeleton />
                        ) : rows.length === 0 ? (
                           <TableRow>
                              <TableCell colSpan={5} className="p-0">
                                 <Empty className="border-0 py-10">
                                    <EmptyHeader>
                                       <EmptyMedia variant="icon">
                                          <History />
                                       </EmptyMedia>
                                       <EmptyTitle>No audit logs found</EmptyTitle>
                                       <EmptyDescription>
                                          Try adjusting your search, action, or date filters, or check back after changes are made.
                                       </EmptyDescription>
                                    </EmptyHeader>
                                 </Empty>
                              </TableCell>
                           </TableRow>
                        ) : (
                           rows.map((row, idx) => (
                              <TableRow
                                 key={`${String(row._id ?? 'log')}-${idx}`}
                                 className="cursor-pointer"
                                 onClick={() => setSelected(row)}
                              >
                                 <TableCell>{formatAuditTimestamp(row.timestamp)}</TableCell>
                                 <TableCell>
                                    <OrganismAuditActionBadge action={String(row.action ?? '')} />
                                 </TableCell>
                                 <TableCell className="italic">{String(row.scientific_name ?? '—')}</TableCell>
                                 <TableCell>{String(row.taxid ?? '—')}</TableCell>
                                 <TableCell>{String(row.user ?? '—')}</TableCell>
                              </TableRow>
                           ))
                        )}
                     </TableBody>
                  </Table>
               </div>
               {total > LIMIT ? (
                  <DashboardModulePagination
                     page={page}
                     totalPages={maxPage}
                     onPrevious={() => setPage((p) => p - 1)}
                     onNext={() => setPage((p) => p + 1)}
                  />
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
                           <div className="mt-1">
                              <OrganismAuditActionBadge action={String(selected.action ?? '')} />
                           </div>
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
                        defaultOpenAll
                        emptyLabel="No field-level differences were detected for this entry."
                     />
                  </div>
               ) : null}
            </DialogContent>
         </Dialog>
      </>
   )
}
