'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { CmsStatusPill } from '@/components/cms/dashboard/status-pill'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import {
   cmsCreateUser,
   cmsGetItems,
   cmsGetUnassignedOrganisms,
   cmsGetUser,
   cmsGetUserSpecies,
   cmsUpdateUser,
} from '@/lib/cms/services/auth'
import { useCmsAuthStore } from '@/stores/cms-auth-store'
import { useCmsDrawerStore } from '@/stores/cms-drawer-store'

const SEARCH_LIMIT = 8

export function UserFormPanel({ editName }: { editName?: string | null }) {
   const close = useCmsDrawerStore((s) => s.close)
   const isAdmin = useCmsAuthStore((s) => s.userRole === 'Admin')

   const [loading, setLoading] = useState(!!editName)
   const [submitting, setSubmitting] = useState(false)
   const [showPassword, setShowPassword] = useState(!editName)

   const [name, setName] = useState('')
   const [password, setPassword] = useState('')
   const [email, setEmail] = useState('')
   const [role, setRole] = useState<'Admin' | 'DataManager'>('DataManager')

   const [onlyUnassigned, setOnlyUnassigned] = useState(false)
   const [searchFilter, setSearchFilter] = useState('')
   const [debouncedSearch, setDebouncedSearch] = useState('')
   const [searchPage, setSearchPage] = useState(1)
   const [searchLoading, setSearchLoading] = useState(false)
   const [available, setAvailable] = useState<Record<string, unknown>[]>([])
   const [searchTotal, setSearchTotal] = useState(0)

   const [assignedFilter, setAssignedFilter] = useState('')
   const [assigned, setAssigned] = useState<Record<string, unknown>[]>([])

   useEffect(() => {
      const t = setTimeout(() => {
         setDebouncedSearch(searchFilter)
         setSearchPage(1)
      }, 350)
      return () => clearTimeout(t)
   }, [searchFilter])

   const fetchAvailable = useCallback(async () => {
      setSearchLoading(true)
      try {
         const params = {
            filter: debouncedSearch,
            limit: SEARCH_LIMIT,
            offset: (searchPage - 1) * SEARCH_LIMIT,
         }
         if (onlyUnassigned) {
            const body = await cmsGetUnassignedOrganisms(params)
            setAvailable(body.data ?? [])
            setSearchTotal(body.total ?? 0)
         } else {
            const body = await cmsGetItems('organisms', params)
            setAvailable(body.data ?? [])
            setSearchTotal(body.total ?? 0)
         }
      } catch {
         setAvailable([])
         setSearchTotal(0)
      } finally {
         setSearchLoading(false)
      }
   }, [debouncedSearch, onlyUnassigned, searchPage])

   useEffect(() => {
      void fetchAvailable()
   }, [fetchAvailable])

   useEffect(() => {
      if (role !== 'DataManager' || !editName) return
      void cmsGetUserSpecies(editName, { limit: 500 }).then((sp) => setAssigned(sp.data ?? []))
   }, [role, editName])

   useEffect(() => {
      if (!editName) return
      let cancelled = false
      ;(async () => {
         setLoading(true)
         try {
            const u = await cmsGetUser(editName)
            if (cancelled) return
            setName(String(u.name ?? editName))
            setEmail(String(u.email ?? ''))
            setRole((u.role === 'Admin' ? 'Admin' : 'DataManager') as 'Admin' | 'DataManager')
         } catch (e) {
            if (!cancelled) {
               toast.error(extractApiMessage(e, 'Failed to load user'))
               close()
            }
         } finally {
            if (!cancelled) setLoading(false)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [editName, close])

   const filteredAssigned = assigned.filter((o) => {
      const q = assignedFilter.trim().toLowerCase()
      if (!q) return true
      return (
         String(o.scientific_name ?? '')
            .toLowerCase()
            .includes(q) || String(o.taxid ?? '').includes(q)
      )
   })

   function isAssignedTaxid(taxid: unknown) {
      return assigned.some((o) => String(o.taxid) === String(taxid))
   }

   function assignOrg(org: Record<string, unknown>) {
      if (!isAssignedTaxid(org.taxid)) setAssigned((a) => [...a, org])
   }

   function unassignOrg(taxid: unknown) {
      setAssigned((a) => a.filter((o) => String(o.taxid) !== String(taxid)))
   }

   async function handleSubmit() {
      if (!name.trim() || !email.trim()) {
         toast.warning('Username and email are required.')
         return
      }
      if (!editName && !password.trim()) {
         toast.warning('Password is required for new users.')
         return
      }
      if (editName && showPassword && !password.trim()) {
         toast.warning('Enter a new password or keep existing.')
         return
      }

      const species = role === 'DataManager' ? assigned.map((o) => String(o.taxid)) : []
      const payload: Record<string, unknown> = {
         name: name.trim(),
         role,
         email: email.trim(),
         species,
      }
      if (!editName || showPassword) {
         payload.password = password
      }

      setSubmitting(true)
      try {
         if (editName) {
            await cmsUpdateUser(editName, payload)
            toast.success(`${name} updated.`)
         } else {
            await cmsCreateUser(payload)
            toast.success(`${name} created.`)
         }
         close()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Save failed'))
      } finally {
         setSubmitting(false)
      }
   }

   const isAdminEditingDataManager = isAdmin && editName && role === 'DataManager'

   if (loading) {
      return (
         <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      )
   }

   return (
      <div className="space-y-6">
         <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
               <Label htmlFor="u-name">Username</Label>
               <Input
                  id="u-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!!editName}
                  autoComplete="off"
               />
            </div>
            {editName && isAdminEditingDataManager && !showPassword ? (
               <div className="sm:col-span-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <p className="mb-2 text-muted-foreground">Password hidden. Change email or assignments without rotating password.</p>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setShowPassword(true)}>
                     Change password
                  </Button>
               </div>
            ) : (
               <div className="sm:col-span-2">
                  <Label htmlFor="u-pass">Password {editName && isAdminEditingDataManager ? '(optional if unchanged)' : ''}</Label>
                  <Input
                     id="u-pass"
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     autoComplete="new-password"
                  />
                  {editName && isAdminEditingDataManager && showPassword ? (
                     <Button
                        type="button"
                        variant="link"
                        className="mt-1 h-auto p-0 text-xs"
                        onClick={() => {
                           setShowPassword(false)
                           setPassword('')
                        }}
                     >
                        Keep existing password
                     </Button>
                  ) : null}
               </div>
            )}
            <div className="sm:col-span-2">
               <Label htmlFor="u-email">Email</Label>
               <Input
                  id="u-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
               />
            </div>
            <div className="sm:col-span-2">
               <Label>Role</Label>
               <Select value={role} onValueChange={(v) => setRole(v as 'Admin' | 'DataManager')}>
                  <SelectTrigger>
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="DataManager">DataManager</SelectItem>
                     <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
               </Select>
            </div>
         </div>

         {role === 'DataManager' ? (
            <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
               <div className="flex min-h-0 flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                     <span className="text-sm font-medium">Available</span>
                     <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox checked={onlyUnassigned} onCheckedChange={(c) => setOnlyUnassigned(c === true)} />
                        Unassigned only
                     </label>
                  </div>
                  <Input
                     placeholder="Search name or taxid…"
                     value={searchFilter}
                     onChange={(e) => setSearchFilter(e.target.value)}
                  />
                  <ScrollArea className="h-48 rounded-md border border-border">
                     {searchLoading ? (
                        <div className="flex justify-center py-8">
                           <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                     ) : available.length === 0 ? (
                        <p className="p-3 text-center text-xs text-muted-foreground">No matches.</p>
                     ) : (
                        <ul className="divide-y divide-border p-1">
                           {available.map((org) => (
                              <li key={String(org.taxid)} className="flex items-center gap-2 py-2 text-sm">
                                 <div className="min-w-0 flex-1">
                                    <p className="truncate italic">{String(org.scientific_name)}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{String(org.taxid)}</p>
                                 </div>
                                 {org.goat_status ? <CmsStatusPill value={String(org.goat_status)} type="goat" /> : null}
                                 {isAssignedTaxid(org.taxid) ? (
                                    <span className="flex items-center gap-1 text-xs text-chart-2">
                                       <Check className="h-3.5 w-3.5" /> Assigned
                                    </span>
                                 ) : (
                                    <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => assignOrg(org)}>
                                       <Plus className="h-4 w-4" />
                                    </Button>
                                 )}
                              </li>
                           ))}
                        </ul>
                     )}
                  </ScrollArea>
                  {searchTotal > SEARCH_LIMIT ? (
                     <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                           Page {searchPage} / {Math.ceil(searchTotal / SEARCH_LIMIT)}
                        </span>
                        <div className="flex gap-1">
                           <Button variant="outline" size="sm" className="h-7 text-xs" disabled={searchPage <= 1} onClick={() => setSearchPage((p) => p - 1)}>
                              Prev
                           </Button>
                           <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={searchPage >= Math.ceil(searchTotal / SEARCH_LIMIT)}
                              onClick={() => setSearchPage((p) => p + 1)}
                           >
                              Next
                           </Button>
                        </div>
                     </div>
                  ) : null}
               </div>

               <div className="flex min-h-0 flex-col gap-2">
                  <span className="text-sm font-medium">Assigned ({assigned.length})</span>
                  <Input placeholder="Filter assigned…" value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} />
                  <ScrollArea className="h-48 rounded-md border border-border">
                     {filteredAssigned.length === 0 ? (
                        <p className="p-3 text-center text-xs text-muted-foreground">No species.</p>
                     ) : (
                        <ul className="divide-y divide-border p-1">
                           {filteredAssigned.map((org) => (
                              <li key={String(org.taxid)} className="flex items-center justify-between gap-2 py-2 text-sm">
                                 <div className="min-w-0">
                                    <p className="truncate italic">{String(org.scientific_name)}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{String(org.taxid)}</p>
                                 </div>
                                 <Button type="button" variant="ghost" size="sm" className="shrink-0 text-destructive" onClick={() => unassignOrg(org.taxid)}>
                                    Remove
                                 </Button>
                              </li>
                           ))}
                        </ul>
                     )}
                  </ScrollArea>
               </div>
            </div>
         ) : null}

         <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={close}>
               Cancel
            </Button>
            <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
               {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editName ? 'Save' : 'Create user'}
            </Button>
         </div>
      </div>
   )
}
