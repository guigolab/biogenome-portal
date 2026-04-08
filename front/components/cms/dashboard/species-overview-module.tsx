'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Download, Loader2, Plus } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import type { DashboardModuleVariant } from '@/components/cms/dashboard/dashboard-module-variant'
import { OrganismCuratorsCell } from '@/components/cms/dashboard/organism-curators-cell'
import {
   cmsCreateDeletionRequest,
   cmsDeleteItem,
   cmsGetOrganismsWithUsers,
   cmsGetUnassignedOrganisms,
   cmsGetUserSpecies,
   cmsGetUsers,
} from '@/lib/cms/services/auth'
import { cn } from '@/lib/utils'
import { useCmsAuthStore } from '@/stores/cms-auth-store'
import { useCmsDrawerStore } from '@/stores/cms-drawer-store'

import { CmsStatusPill } from './status-pill'

const LIMIT = 10

export function SpeciesOverviewModule({ variant = 'standalone' }: { variant?: DashboardModuleVariant }) {
   const userName = useCmsAuthStore((s) => s.userName)
   const isAdmin = useCmsAuthStore((s) => s.userRole === 'Admin')
   const openDrawer = useCmsDrawerStore((s) => s.open)

   const [organisms, setOrganisms] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(true)
   const [filterDraft, setFilterDraft] = useState('')
   const [filter, setFilter] = useState('')
   const [page, setPage] = useState(1)
   const [toggle, setToggle] = useState<'assigned' | 'unassigned'>('assigned')
   const [users, setUsers] = useState<Record<string, unknown>[]>([])
   const [selectedUsers, setSelectedUsers] = useState<string[]>([])
   const [downloading, setDownloading] = useState(false)

   const [deleteReqOrg, setDeleteReqOrg] = useState<Record<string, unknown> | null>(null)
   const [adminDeleteOrg, setAdminDeleteOrg] = useState<Record<string, unknown> | null>(null)
   const [deleteBusy, setDeleteBusy] = useState(false)

   const fetchData = useCallback(async () => {
      setLoading(true)
      try {
         const params: Record<string, string | number> = {
            filter,
            limit: LIMIT,
            offset: (page - 1) * LIMIT,
         }
         if (isAdmin) {
            if (toggle === 'assigned') {
               if (selectedUsers.length) params.name__in = selectedUsers.join(',')
               const { data, total: t } = await cmsGetOrganismsWithUsers(params)
               setOrganisms(data ?? [])
               setTotal(t ?? 0)
            } else {
               const { data, total: t } = await cmsGetUnassignedOrganisms(params)
               setOrganisms(data ?? [])
               setTotal(t ?? 0)
            }
         } else {
            const { data, total: t } = await cmsGetUserSpecies(userName, params)
            setOrganisms(data ?? [])
            setTotal(t ?? 0)
         }
      } catch {
         setOrganisms([])
         setTotal(0)
      } finally {
         setLoading(false)
      }
   }, [isAdmin, userName, filter, page, toggle, selectedUsers])

   useEffect(() => {
      void fetchData()
   }, [fetchData])

   useEffect(() => {
      const t = setTimeout(() => {
         setFilter(filterDraft)
         setPage(1)
      }, 350)
      return () => clearTimeout(t)
   }, [filterDraft])

   useEffect(() => {
      if (!isAdmin) return
      ;(async () => {
         try {
            const { data } = await cmsGetUsers({ limit: 10000 })
            const list = (data ?? []).filter((u: Record<string, unknown>) => u.role !== 'Admin')
            setUsers(list)
         } catch {
            setUsers([])
         }
      })()
   }, [isAdmin])

   async function downloadTsv() {
      setDownloading(true)
      try {
         const params: Record<string, string | number | boolean> = { format: 'tsv', filter }
         if (toggle === 'assigned' && selectedUsers.length) params.name__in = selectedUsers.join(',')
         const blob = (await (toggle === 'assigned'
            ? cmsGetOrganismsWithUsers(params, true)
            : cmsGetUnassignedOrganisms(params, true))) as Blob
         const href = URL.createObjectURL(blob)
         const a = document.createElement('a')
         a.href = href
         a.download = `${toggle}_species.tsv`
         a.click()
         URL.revokeObjectURL(href)
      } catch {
         toast.error('Download failed')
      } finally {
         setDownloading(false)
      }
   }

   async function confirmDeletionRequest() {
      if (!deleteReqOrg?.taxid) return
      setDeleteBusy(true)
      try {
         await cmsCreateDeletionRequest(String(deleteReqOrg.taxid))
         toast.success('Deletion request sent.')
         setDeleteReqOrg(null)
         await fetchData()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Failed to send request'))
      } finally {
         setDeleteBusy(false)
      }
   }

   async function confirmAdminDelete() {
      if (!adminDeleteOrg?.taxid) return
      setDeleteBusy(true)
      try {
         await cmsDeleteItem('organisms', String(adminDeleteOrg.taxid))
         toast.success('Organism deleted.')
         setAdminDeleteOrg(null)
         await fetchData()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Deletion failed'))
      } finally {
         setDeleteBusy(false)
      }
   }

   const embedded = variant === 'tabPanel'

   return (
      <>
         <Card className={cn('border-border/80 shadow-sm', embedded && 'rounded-xl border bg-card')}>
            <CardHeader
               className={cn(
                  'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
                  embedded && 'pb-2',
               )}
            >
               {embedded ? (
                  <p className="text-sm text-muted-foreground">
                     {isAdmin
                        ? 'All portal species and curator assignments.'
                        : 'Species assigned to you and their statuses.'}
                  </p>
               ) : (
                  <div>
                     <CardTitle>{isAdmin ? 'Species overview' : 'My species'}</CardTitle>
                     <CardDescription>
                        {isAdmin
                           ? 'All portal species and curator assignments.'
                           : 'Species assigned to you and their statuses.'}
                     </CardDescription>
                  </div>
               )}
               <Button size="sm" asChild className="shrink-0 gap-2">
                  <Link href="/admin/create-organism">
                     <Plus className="h-4 w-4" />
                     Add species
                  </Link>
               </Button>
            </CardHeader>
            <CardContent className="space-y-4">
               <div
                  className={cn(
                     'flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center',
                     embedded &&
                        'rounded-xl border border-border bg-card p-3 sm:p-4 dark:bg-card/60',
                  )}
               >
                  <Input
                     placeholder="Filter by name or taxid…"
                     value={filterDraft}
                     onChange={(e) => setFilterDraft(e.target.value)}
                     className="max-w-md"
                  />
                  {isAdmin ? (
                     <>
                        <ToggleGroup
                           type="single"
                           value={toggle}
                           onValueChange={(v) => {
                              if (v === 'assigned' || v === 'unassigned') {
                                 setToggle(v)
                                 setPage(1)
                                 setFilterDraft('')
                                 setFilter('')
                                 setSelectedUsers([])
                              }
                           }}
                           className="justify-start"
                        >
                           <ToggleGroupItem value="assigned">Assigned</ToggleGroupItem>
                           <ToggleGroupItem value="unassigned">Unassigned</ToggleGroupItem>
                        </ToggleGroup>
                        {toggle === 'assigned' ? (
                           <Popover>
                              <PopoverTrigger asChild>
                                 <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="min-w-[10.5rem] justify-between gap-2"
                                 >
                                    <span>Curators</span>
                                    {selectedUsers.length > 0 ? (
                                       <Badge variant="secondary" className="font-mono text-xs font-normal">
                                          {selectedUsers.length}
                                       </Badge>
                                    ) : null}
                                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                                 </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0" align="start">
                                 <div className="border-b border-border px-3 py-2">
                                    <p className="text-xs font-medium text-muted-foreground">
                                       Filter by assigned curator
                                    </p>
                                 </div>
                                 <div className="max-h-56 space-y-1 overflow-y-auto p-2">
                                    {users.length === 0 ? (
                                       <p className="px-2 py-2 text-sm text-muted-foreground">No curators.</p>
                                    ) : (
                                       users.map((u) => {
                                          const name = String(u.name)
                                          const checked = selectedUsers.includes(name)
                                          return (
                                             <label
                                                key={name}
                                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/80"
                                             >
                                                <Checkbox
                                                   checked={checked}
                                                   onCheckedChange={() => {
                                                      setSelectedUsers((prev) =>
                                                         prev.includes(name)
                                                            ? prev.filter((x) => x !== name)
                                                            : [...prev, name],
                                                      )
                                                      setPage(1)
                                                   }}
                                                />
                                                <span>{name}</span>
                                             </label>
                                          )
                                       })
                                    )}
                                 </div>
                                 <div className="flex justify-end border-t border-border p-2">
                                    <Button
                                       type="button"
                                       variant="ghost"
                                       size="sm"
                                       disabled={selectedUsers.length === 0}
                                       onClick={() => {
                                          setSelectedUsers([])
                                          setPage(1)
                                       }}
                                    >
                                       Clear
                                    </Button>
                                 </div>
                              </PopoverContent>
                           </Popover>
                        ) : null}
                        <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           className="gap-2"
                           disabled={downloading}
                           onClick={() => void downloadTsv()}
                        >
                           {downloading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                           ) : (
                              <Download className="h-4 w-4" />
                           )}
                           {toggle === 'assigned' ? 'Export assigned' : 'Export unassigned'}
                        </Button>
                     </>
                  ) : null}
               </div>

               {loading ? (
                  <div className="flex justify-center py-12 text-muted-foreground">
                     <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
               ) : organisms.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No species found.</p>
               ) : (
                  <div className="rounded-md border border-border">
                     <Table>
                        <TableHeader>
                           <TableRow>
                              <TableHead>Species</TableHead>
                              <TableHead>GoaT</TableHead>
                              <TableHead>INSDC</TableHead>
                              <TableHead>Target</TableHead>
                              {isAdmin && toggle === 'assigned' ? <TableHead>Curators</TableHead> : null}
                              <TableHead className="text-right">Actions</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {organisms.map((org) => (
                              <TableRow
                                 key={String(org.taxid)}
                                 className={cn(Boolean(org.pending_deletion) && 'opacity-60')}
                              >
                                 <TableCell>
                                    <span className="block font-medium italic">{String(org.scientific_name)}</span>
                                    <span className="text-xs text-muted-foreground">{String(org.taxid)}</span>
                                 </TableCell>
                                 <TableCell>
                                    <CmsStatusPill value={org.goat_status as string} type="goat" />
                                 </TableCell>
                                 <TableCell>
                                    <CmsStatusPill value={org.insdc_status as string} type="insdc" />
                                 </TableCell>
                                 <TableCell>
                                    <CmsStatusPill value={org.target_list_status as string} type="target" />
                                 </TableCell>
                                 {isAdmin && toggle === 'assigned' ? (
                                    <TableCell className="align-top">
                                       <OrganismCuratorsCell
                                          taxid={String(org.taxid)}
                                          scientificName={String(org.scientific_name ?? '')}
                                          assignedUsers={(org.assigned_users as string[] | undefined) ?? []}
                                          curatorOptions={users
                                             .filter((u) => String(u.name ?? '').trim())
                                             .map((u) => ({ name: String(u.name) }))}
                                          onUpdated={() => void fetchData()}
                                          onOpenUser={(userName) =>
                                             openDrawer({ panel: 'user', userName })
                                          }
                                       />
                                    </TableCell>
                                 ) : null}
                                 <TableCell className="text-right">
                                    <div className="flex flex-wrap justify-end gap-1">
                                       {org.pending_deletion && !isAdmin ? (
                                          <span className="text-xs text-amber-600">Pending deletion</span>
                                       ) : (
                                          <>
                                             <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/update-organism/${org.taxid}`}>Edit</Link>
                                             </Button>
                                             {isAdmin ? (
                                                <Button
                                                   variant="destructive"
                                                   size="sm"
                                                   onClick={() => setAdminDeleteOrg(org)}
                                                >
                                                   Delete
                                                </Button>
                                             ) : (
                                                <Button
                                                   variant="destructive"
                                                   size="sm"
                                                   onClick={() => setDeleteReqOrg(org)}
                                                >
                                                   Delete
                                                </Button>
                                             )}
                                          </>
                                       )}
                                    </div>
                                 </TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </div>
               )}

               {total > LIMIT ? (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                     <span>
                        Page {page} of {Math.ceil(total / LIMIT)}
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
                           disabled={page >= Math.ceil(total / LIMIT)}
                           onClick={() => setPage((p) => p + 1)}
                        >
                           Next
                        </Button>
                     </div>
                  </div>
               ) : null}
            </CardContent>
         </Card>

         <AlertDialog open={!!deleteReqOrg} onOpenChange={() => setDeleteReqOrg(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Request organism deletion?</AlertDialogTitle>
                  <AlertDialogDescription>
                     An admin will review deletion of{' '}
                     <em>{deleteReqOrg ? String(deleteReqOrg.scientific_name) : ''}</em>.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
                  <AlertDialogAction disabled={deleteBusy} onClick={() => void confirmDeletionRequest()}>
                     Send request
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>

         <AlertDialog open={!!adminDeleteOrg} onOpenChange={() => setAdminDeleteOrg(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Delete organism permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                     This removes <em>{adminDeleteOrg ? String(adminDeleteOrg.scientific_name) : ''}</em> and
                     related data. This cannot be undone.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                     className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                     disabled={deleteBusy}
                     onClick={() => void confirmAdminDelete()}
                  >
                     Delete
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   )
}
