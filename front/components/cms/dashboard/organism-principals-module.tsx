'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Pencil, Trash2, UserPlus } from 'lucide-react'
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
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import { DashboardModuleHeader } from '@/components/cms/dashboard/dashboard-module-header'
import { DashboardModulePagination } from '@/components/cms/dashboard/dashboard-module-pagination'
import {
   cmsDeleteOrganismPrincipal,
   cmsGetOrganismPrincipals,
   type CmsOrganismPrincipal,
} from '@/lib/cms/services/organism-principals'
import { useCmsDrawerStore } from '@/stores/cms-drawer-store'

const LIMIT = 8

export function OrganismPrincipalsModule() {
   const openDrawer = useCmsDrawerStore((s) => s.open)
   const principalSavedAt = useCmsDrawerStore((s) => s.principalSavedAt)

   const [principals, setPrincipals] = useState<CmsOrganismPrincipal[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(true)
   const [filterDraft, setFilterDraft] = useState('')
   const [filter, setFilter] = useState('')
   const [page, setPage] = useState(1)
   const [deletePrincipal, setDeletePrincipal] = useState<CmsOrganismPrincipal | null>(null)
   const [deleting, setDeleting] = useState(false)

   useEffect(() => {
      const t = setTimeout(() => {
         setFilter(filterDraft)
         setPage(1)
      }, 350)
      return () => clearTimeout(t)
   }, [filterDraft])

   const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true)
      try {
         const { data, total: t } = await cmsGetOrganismPrincipals({
            filter,
            limit: LIMIT,
            offset: (page - 1) * LIMIT,
         })
         setPrincipals(data ?? [])
         setTotal(t ?? 0)
      } catch {
         setPrincipals([])
         setTotal(0)
      } finally {
         if (!opts?.silent) setLoading(false)
      }
   }, [filter, page])

   const fetchDataRef = useRef(fetchData)
   fetchDataRef.current = fetchData

   useEffect(() => {
      void fetchData()
   }, [fetchData])

   useEffect(() => {
      if (principalSavedAt === 0) return
      void fetchDataRef.current({ silent: true })
   }, [principalSavedAt])

   async function confirmDelete() {
      if (!deletePrincipal?.slug) return
      setDeleting(true)
      try {
         await cmsDeleteOrganismPrincipal(deletePrincipal.slug)
         toast.success('Principal deleted.')
         setDeletePrincipal(null)
         setPage(1)
         await fetchData()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Deletion failed'))
      } finally {
         setDeleting(false)
      }
   }

   return (
      <>
         <Card className="gap-3 border-border/80 shadow-sm">
            <DashboardModuleHeader
               description="PI / institute / program catalog — link curator accounts to these to group species by PI."
               action={
                  <Button size="sm" className="gap-2" onClick={() => openDrawer({ panel: 'principal' })}>
                     <UserPlus className="h-4 w-4" />
                     New principal
                  </Button>
               }
            />
            <CardContent className="space-y-4">
               <Input
                  placeholder="Filter by name…"
                  value={filterDraft}
                  onChange={(e) => setFilterDraft(e.target.value)}
                  className="max-w-md"
               />
               {loading ? (
                  <div className="flex justify-center py-10">
                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
               ) : principals.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No principals found.</p>
               ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                     {principals.map((principal) => (
                        <li
                           key={principal.slug}
                           className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap"
                        >
                           <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                              {String(principal.name ?? '?')
                                 .charAt(0)
                                 .toUpperCase()}
                           </div>
                           <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{principal.name}</p>
                              <p className="truncate text-sm text-muted-foreground">
                                 {[...(principal.affiliations ?? []), ...(principal.programs ?? [])].join(', ') ||
                                    '—'}
                              </p>
                           </div>
                           <div className="flex shrink-0 gap-1">
                              <Button
                                 variant="outline"
                                 size="icon"
                                 className="h-8 w-8"
                                 title="Edit"
                                 onClick={() => openDrawer({ panel: 'principal', principalSlug: principal.slug })}
                              >
                                 <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                 variant="outline"
                                 size="icon"
                                 className="h-8 w-8 text-destructive"
                                 title="Delete"
                                 onClick={() => setDeletePrincipal(principal)}
                              >
                                 <Trash2 className="h-4 w-4" />
                              </Button>
                           </div>
                        </li>
                     ))}
                  </ul>
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

         <AlertDialog open={!!deletePrincipal} onOpenChange={() => setDeletePrincipal(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Delete principal?</AlertDialogTitle>
                  <AlertDialogDescription>
                     Permanently remove <strong>{deletePrincipal?.name ?? ''}</strong>. Any curator accounts
                     linked to this principal will be unlinked.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                     className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                     disabled={deleting}
                     onClick={() => void confirmDelete()}
                  >
                     Delete
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   )
}
