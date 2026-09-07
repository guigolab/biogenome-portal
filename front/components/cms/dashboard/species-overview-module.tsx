'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Download, History, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
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
import { OrganismCuratorsCell } from '@/components/cms/dashboard/organism-curators-cell'
import {
   OrganismPrincipalAffiliationsCell,
   OrganismPrincipalNamesCell,
   OrganismPrincipalProgramsCell,
   type OrganismPrincipalRow,
} from '@/components/cms/dashboard/organism-principals-cell'
import { OrganismStatusPatchSelect } from '@/components/cms/dashboard/organism-status-patch-select'
import { OrganismAuditLogHistoryDialog } from '@/components/cms/dashboard/organism-audit-log-history-dialog'
import {
   cmsCreateDeletionRequest,
   cmsDeleteItem,
   cmsGetAllOrganismsWithUsers,
   cmsGetOrganismsWithUsers,
   cmsGetUnassignedOrganisms,
   cmsGetUserSpecies,
   cmsGetUsers,
} from '@/lib/cms/services/auth'
import { cmsGetOrganismPrincipalOptions } from '@/lib/cms/services/organism-principals'
import { usePortalConfig } from '@/contexts/portal-context'
import { useCmsAuthStore } from '@/stores/cms-auth-store'
import { useCmsDrawerStore } from '@/stores/cms-drawer-store'

const LIMIT = 10

const ASSIGNMENT_FILTER_OPTIONS = [
   { value: 'all', label: 'All' },
   { value: 'assigned', label: 'Assigned' },
   { value: 'unassigned', label: 'Unassigned' },
] as const

export function SpeciesOverviewModule() {
   const { config } = usePortalConfig()
   const general = config?.general as Record<string, unknown> | undefined
   const hasGoat = Boolean(general?.goat)

   const userName = useCmsAuthStore((s) => s.userName)
   const isAdmin = useCmsAuthStore((s) => s.userRole === 'Admin')
   const openDrawer = useCmsDrawerStore((s) => s.open)

   const [organisms, setOrganisms] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(true)
   const [filterDraft, setFilterDraft] = useState('')
   const [filter, setFilter] = useState('')
   const [page, setPage] = useState(1)
   const [toggle, setToggle] = useState<'all' | 'assigned' | 'unassigned'>('all')
   const [users, setUsers] = useState<Record<string, unknown>[]>([])
   const [selectedUsers, setSelectedUsers] = useState<string[]>([])
   const [principalOptions, setPrincipalOptions] = useState<{ slug: string; name: string }[]>([])
   const [selectedPrincipals, setSelectedPrincipals] = useState<string[]>([])
   const [downloading, setDownloading] = useState(false)

   const [deleteReqOrg, setDeleteReqOrg] = useState<Record<string, unknown> | null>(null)
   const [adminDeleteOrg, setAdminDeleteOrg] = useState<Record<string, unknown> | null>(null)
   const [historyOrg, setHistoryOrg] = useState<Record<string, unknown> | null>(null)
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
            if (toggle === 'all' || toggle === 'assigned') {
               if (selectedUsers.length) params.name__in = selectedUsers.join(',')
               if (selectedPrincipals.length) params.principal__in = selectedPrincipals.join(',')
            }
            if (toggle === 'all') {
               const { data, total: t } = await cmsGetAllOrganismsWithUsers(params)
               setOrganisms(data ?? [])
               setTotal(t ?? 0)
            } else if (toggle === 'assigned') {
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
   }, [isAdmin, userName, filter, page, toggle, selectedUsers, selectedPrincipals])

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
         try {
            const options = await cmsGetOrganismPrincipalOptions()
            setPrincipalOptions(Array.isArray(options) ? options : [])
         } catch {
            setPrincipalOptions([])
         }
      })()
   }, [isAdmin])

   async function downloadTsv() {
      setDownloading(true)
      try {
         const params: Record<string, string | number | boolean> = { format: 'tsv', filter }
         if (toggle === 'assigned' || toggle === 'all') {
            if (selectedUsers.length) params.name__in = selectedUsers.join(',')
            if (selectedPrincipals.length) params.principal__in = selectedPrincipals.join(',')
         }
         const blob = (await (toggle === 'unassigned'
            ? cmsGetUnassignedOrganisms(params, true)
            : toggle === 'assigned'
              ? cmsGetOrganismsWithUsers(params, true)
              : cmsGetAllOrganismsWithUsers(params, true))) as Blob
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

   return (
      <>
         <Card className="gap-3 border-border/80 shadow-sm">
            <DashboardModuleHeader
               description={
                  isAdmin
                     ? 'All portal species and curator assignments.'
                     : 'Species assigned to you and their statuses.'
               }
               action={
                  <Button size="sm" asChild className="gap-2">
                     <Link href="/admin/create-organism">
                        <Plus className="h-4 w-4" />
                        Add species
                     </Link>
                  </Button>
               }
            />
            <CardContent className="space-y-4">
               <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                  <Input
                     placeholder="Filter by name or taxid…"
                     value={filterDraft}
                     onChange={(e) => setFilterDraft(e.target.value)}
                     className="max-w-md"
                  />
                  {isAdmin ? (
                     <>
                        <Select
                           value={toggle}
                           onValueChange={(v) => {
                              if (v === 'all' || v === 'assigned' || v === 'unassigned') {
                                 setToggle(v)
                                 setPage(1)
                                 setFilterDraft('')
                                 setFilter('')
                                 setSelectedUsers([])
                                 setSelectedPrincipals([])
                              }
                           }}
                        >
                           <SelectTrigger className="w-full sm:w-[11rem]" aria-label="Assignment filter">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                              {ASSIGNMENT_FILTER_OPTIONS.map((option) => (
                                 <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                        {toggle === 'assigned' || toggle === 'all' ? (
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
                        {toggle === 'assigned' || toggle === 'all' ? (
                           <Popover>
                              <PopoverTrigger asChild>
                                 <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="min-w-[10.5rem] justify-between gap-2"
                                 >
                                    <span>Principals</span>
                                    {selectedPrincipals.length > 0 ? (
                                       <Badge variant="secondary" className="font-mono text-xs font-normal">
                                          {selectedPrincipals.length}
                                       </Badge>
                                    ) : null}
                                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                                 </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0" align="start">
                                 <div className="border-b border-border px-3 py-2">
                                    <p className="text-xs font-medium text-muted-foreground">
                                       Filter by principal (PI)
                                    </p>
                                 </div>
                                 <div className="max-h-56 space-y-1 overflow-y-auto p-2">
                                    {principalOptions.length === 0 ? (
                                       <p className="px-2 py-2 text-sm text-muted-foreground">No principals.</p>
                                    ) : (
                                       principalOptions.map((p) => {
                                          const slug = p.slug
                                          const checked = selectedPrincipals.includes(slug)
                                          return (
                                             <label
                                                key={slug}
                                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/80"
                                             >
                                                <Checkbox
                                                   checked={checked}
                                                   onCheckedChange={() => {
                                                      setSelectedPrincipals((prev) =>
                                                         prev.includes(slug)
                                                            ? prev.filter((x) => x !== slug)
                                                            : [...prev, slug],
                                                      )
                                                      setPage(1)
                                                   }}
                                                />
                                                <span className="truncate">{p.name}</span>
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
                                       disabled={selectedPrincipals.length === 0}
                                       onClick={() => {
                                          setSelectedPrincipals([])
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
                           {toggle === 'assigned'
                              ? 'Export assigned'
                              : toggle === 'unassigned'
                                ? 'Export unassigned'
                                : 'Export all'}
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
                              {isAdmin ? <TableHead>Curators</TableHead> : null}
                              <TableHead>PI</TableHead>
                              <TableHead>Institute</TableHead>
                              <TableHead>Project</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {organisms.map((org) => (
                              <TableRow key={String(org.taxid)}>
                                 <TableCell>
                                    <div className="flex flex-wrap items-center gap-2">
                                       <span className="font-medium italic">
                                          {String(org.scientific_name)}
                                       </span>
                                       {org.pending_deletion ? (
                                          <Badge
                                             variant="destructive"
                                             className="text-[0.65rem] font-medium uppercase tracking-wide"
                                          >
                                             Pending deletion
                                          </Badge>
                                       ) : null}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                       {String(org.taxid)}
                                    </span>
                                 </TableCell>
                                 <TableCell>
                                    <OrganismStatusPatchSelect
                                       taxid={String(org.taxid)}
                                       scientificName={String(org.scientific_name ?? '')}
                                       field="goat_status"
                                       value={org.goat_status}
                                       disabled={Boolean(org.pending_deletion) && !isAdmin}
                                       readOnly={!hasGoat}
                                       onUpdated={() => void fetchData()}
                                    />
                                 </TableCell>
                                 {isAdmin ? (
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
                                 <TableCell className="align-top">
                                    <OrganismPrincipalNamesCell
                                       principals={org.principals as OrganismPrincipalRow[] | undefined}
                                    />
                                 </TableCell>
                                 <TableCell className="align-top">
                                    <OrganismPrincipalAffiliationsCell
                                       principals={org.principals as OrganismPrincipalRow[] | undefined}
                                    />
                                 </TableCell>
                                 <TableCell className="align-top">
                                    <OrganismPrincipalProgramsCell
                                       principals={org.principals as OrganismPrincipalRow[] | undefined}
                                    />
                                 </TableCell>
                                 <TableCell className="text-right">
                                    {org.pending_deletion && !isAdmin ? (
                                       <span className="text-xs text-amber-600">Pending deletion</span>
                                    ) : (
                                       <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                             <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5"
                                             >
                                                Actions
                                                <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
                                             </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-44">
                                             <DropdownMenuItem
                                                className="gap-2"
                                                onClick={() => setHistoryOrg(org)}
                                             >
                                                <History className="h-4 w-4" />
                                                History
                                             </DropdownMenuItem>
                                             <DropdownMenuItem asChild>
                                                <Link
                                                   href={`/admin/update-organism/${org.taxid}`}
                                                   className="gap-2"
                                                >
                                                   <Pencil className="h-4 w-4" />
                                                   Edit
                                                </Link>
                                             </DropdownMenuItem>
                                             <DropdownMenuItem
                                                variant="destructive"
                                                className="gap-2"
                                                onClick={() =>
                                                   isAdmin
                                                      ? setAdminDeleteOrg(org)
                                                      : setDeleteReqOrg(org)
                                                }
                                             >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                             </DropdownMenuItem>
                                          </DropdownMenuContent>
                                       </DropdownMenu>
                                    )}
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

         <OrganismAuditLogHistoryDialog
            open={Boolean(historyOrg)}
            onOpenChange={(open) => {
               if (!open) setHistoryOrg(null)
            }}
            taxid={historyOrg ? String(historyOrg.taxid ?? '') : null}
            scientificName={historyOrg ? String(historyOrg.scientific_name ?? '') : null}
         />

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
