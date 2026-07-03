'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import { DashboardModuleHeader } from '@/components/cms/dashboard/dashboard-module-header'
import { DashboardModulePagination } from '@/components/cms/dashboard/dashboard-module-pagination'
import { cmsDeleteDeletionRequest, cmsDeleteItem, cmsGetItems } from '@/lib/cms/services/auth'

const LIMIT = 7

export function DeleteRequestsModule() {
   const [items, setItems] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(true)
   const [filterDraft, setFilterDraft] = useState('')
   const [filter, setFilter] = useState('')
   const [page, setPage] = useState(1)
   const [processing, setProcessing] = useState<string | null>(null)
   const [approveItem, setApproveItem] = useState<Record<string, unknown> | null>(null)

   useEffect(() => {
      const t = setTimeout(() => {
         setFilter(filterDraft)
         setPage(1)
      }, 350)
      return () => clearTimeout(t)
   }, [filterDraft])

   const fetchData = useCallback(async () => {
      setLoading(true)
      try {
         const { data, total: t } = await cmsGetItems('organisms', {
            pending_deletion: true,
            filter,
            limit: LIMIT,
            offset: (page - 1) * LIMIT,
         })
         if ((data?.length ?? 0) === 0 && page > 1 && (t ?? 0) > 0) {
            setPage((p) => Math.max(1, p - 1))
            return
         }
         setItems(data ?? [])
         setTotal(t ?? 0)
      } catch {
         setItems([])
         setTotal(0)
      } finally {
         setLoading(false)
      }
   }, [filter, page])

   useEffect(() => {
      void fetchData()
   }, [fetchData])

   async function handleDeny(taxid: string) {
      setProcessing(taxid)
      try {
         await cmsDeleteDeletionRequest(taxid)
         toast.success('Request denied.')
         await fetchData()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Failed to deny'))
      } finally {
         setProcessing(null)
      }
   }

   async function confirmApprove() {
      if (!approveItem?.taxid) return
      const taxid = String(approveItem.taxid)
      setProcessing(taxid)
      try {
         await cmsDeleteItem('organisms', taxid)
         toast.success('Organism deleted.')
         setApproveItem(null)
         await fetchData()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Deletion failed'))
      } finally {
         setProcessing(null)
      }
   }

   return (
      <>
         <Card className="gap-3 border-destructive/20 shadow-sm">
            <DashboardModuleHeader
               description="Approve or deny curator deletion requests."
               badge={
                  total > 0 ? (
                     <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
                        {total}
                     </span>
                  ) : null
               }
            />
            <CardContent className="space-y-4">
               <Input
                  placeholder="Filter by name or taxid…"
                  value={filterDraft}
                  onChange={(e) => setFilterDraft(e.target.value)}
                  className="max-w-md"
               />
               {loading ? (
                  <div className="flex justify-center py-10">
                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
               ) : items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No pending requests.</p>
               ) : (
                  <div className="rounded-md border border-border">
                     <Table>
                        <TableHeader>
                           <TableRow>
                              <TableHead>Species</TableHead>
                              <TableHead>Taxid</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {items.map((item) => (
                              <TableRow key={String(item.taxid)}>
                                 <TableCell className="italic">{String(item.scientific_name)}</TableCell>
                                 <TableCell className="font-mono text-sm">{String(item.taxid)}</TableCell>
                                 <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                       <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={!!processing}
                                          onClick={() => void handleDeny(String(item.taxid))}
                                       >
                                          {processing === item.taxid ? (
                                             <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                             'Deny'
                                          )}
                                       </Button>
                                       <Button
                                          variant="destructive"
                                          size="sm"
                                          disabled={!!processing}
                                          onClick={() => setApproveItem(item)}
                                       >
                                          Delete
                                       </Button>
                                    </div>
                                 </TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </div>
               )}
               {total > LIMIT ? (
                  <DashboardModulePagination
                     page={page}
                     totalPages={Math.ceil(total / LIMIT)}
                     onPrevious={() => setPage((p) => p - 1)}
                     onNext={() => setPage((p) => p + 1)}
                  />
               ) : null}
            </CardContent>
         </Card>

         <AlertDialog open={!!approveItem} onOpenChange={() => setApproveItem(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Approve deletion?</AlertDialogTitle>
                  <AlertDialogDescription>
                     Permanently delete <em>{approveItem ? String(approveItem.scientific_name) : ''}</em> and
                     related data.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={!!processing}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                     className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                     disabled={!!processing}
                     onClick={() => void confirmApprove()}
                  >
                     Delete organism
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   )
}
