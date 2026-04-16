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

   const [onlyUnassigned, setOnlyUnassigned] = useState(true)
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

   const isCreate = !editName
   // Distinct section from /login (`section-portal-login`) so browsers do not apply login creds here.
   const ac = {
      // Use `nickname` (not `username`) so autofill does not match /login’s `username` token.
      accountName: 'section-portal-cms-user nickname',
      email: 'section-portal-cms-user email',
      newPassword: 'section-portal-cms-user new-password',
   } as const
   const passwordAutoComplete = ac.newPassword

   const nameField = (
      <div className="sm:col-span-2">
         <Label htmlFor="cms-user-name">Username</Label>
         <Input
            id="cms-user-name"
            name="cms_user_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!!editName}
            autoComplete={ac.accountName}
            autoCorrect="off"
            autoCapitalize="off"
         />
      </div>
   )

   const emailField = (
      <div className="sm:col-span-2">
         <Label htmlFor="cms-user-email">Email</Label>
         <Input
            id="cms-user-email"
            name="cms_user_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete={ac.email}
         />
      </div>
   )

   const passwordBlock =
      editName && isAdminEditingDataManager && !showPassword ? (
         <div className="sm:col-span-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p className="mb-2 text-muted-foreground">Password hidden. Change email or assignments without rotating password.</p>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowPassword(true)}>
               Change password
            </Button>
         </div>
      ) : (
         <div className="sm:col-span-2">
            <Label htmlFor="cms-user-password">Password {editName && isAdminEditingDataManager ? '(optional if unchanged)' : ''}</Label>
            <Input
               id="cms-user-password"
               name="cms_user_password"
               type="password"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               autoComplete={passwordAutoComplete}
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
      )

   return (
      <form
         className="space-y-6"
         autoComplete="off"
         data-cms-user-form={isCreate ? 'create' : 'edit'}
         onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
         }}
      >
         <div className="grid gap-3 sm:grid-cols-2">
            {editName ? (
               <>
                  {nameField}
                  {passwordBlock}
                  {emailField}
               </>
            ) : (
               <>
                  {emailField}
                  {nameField}
                  {passwordBlock}
               </>
            )}
            <div className="sm:col-span-2">
               <Label>Role</Label>
               <Select value={role} onValueChange={(v) => setRole(v as 'Admin' | 'DataManager')}>
                  <SelectTrigger className="w-full min-w-0">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                     <SelectItem value="DataManager">DataManager</SelectItem>
                     <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
               </Select>
            </div>
         </div>

         {role === 'DataManager' ? (
            <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
               <div className="flex min-h-0 min-w-0 flex-col gap-2">
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
                     onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault()
                     }}
                     name="cms_user_species_search"
                     autoComplete="off"
                  />
                  <ScrollArea className="h-52 w-full min-w-0 rounded-md border border-border [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden">
                     {searchLoading ? (
                        <div className="flex justify-center py-8">
                           <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                     ) : available.length === 0 ? (
                        <p className="p-3 text-center text-xs text-muted-foreground">No matches.</p>
                     ) : (
                        <ul className="w-full min-w-0 divide-y divide-border px-2 py-0.5">
                           {available.map((org) => (
                              <li
                                 key={String(org.taxid)}
                                 className="flex min-w-0 flex-col gap-2 py-2 text-sm sm:flex-row sm:items-start sm:gap-3"
                              >
                                 <div className="min-w-0 flex-1">
                                    <p className="break-words italic text-pretty [overflow-wrap:anywhere]">
                                       {String(org.scientific_name)}
                                    </p>
                                    <p className="break-all font-mono text-xs text-muted-foreground">{String(org.taxid)}</p>
                                 </div>
                                 {isAssignedTaxid(org.taxid) ? (
                                    <span className="flex shrink-0 items-center gap-1 self-start whitespace-nowrap text-xs text-chart-2 sm:pt-0.5">
                                       <Check className="h-3.5 w-3.5 shrink-0" /> Assigned
                                    </span>
                                 ) : (
                                    <Button
                                       type="button"
                                       size="icon"
                                       variant="outline"
                                       className="h-8 w-8 shrink-0 self-start sm:mt-0.5"
                                       onClick={() => assignOrg(org)}
                                    >
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

               <div className="flex min-h-0 min-w-0 flex-col gap-2">
                  <span className="text-sm font-medium">Assigned ({assigned.length})</span>
                  <Input
                     placeholder="Filter assigned…"
                     value={assignedFilter}
                     onChange={(e) => setAssignedFilter(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault()
                     }}
                     name="cms_user_assigned_filter"
                     autoComplete="off"
                  />
                  <ScrollArea className="h-52 w-full min-w-0 rounded-md border border-border [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden">
                     {filteredAssigned.length === 0 ? (
                        <p className="p-3 text-center text-xs text-muted-foreground">No species.</p>
                     ) : (
                        <ul className="w-full min-w-0 divide-y divide-border px-2 py-0.5">
                           {filteredAssigned.map((org) => (
                              <li
                                 key={String(org.taxid)}
                                 className="flex min-w-0 flex-col gap-2 py-2 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                              >
                                 <div className="min-w-0 flex-1 pr-0 sm:pr-1">
                                    <p className="break-words italic text-pretty [overflow-wrap:anywhere]">
                                       {String(org.scientific_name)}
                                    </p>
                                    <p className="break-all font-mono text-xs text-muted-foreground">{String(org.taxid)}</p>
                                 </div>
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto shrink-0 self-start whitespace-nowrap text-destructive sm:pt-0.5"
                                    onClick={() => unassignOrg(org.taxid)}
                                 >
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
            <Button type="submit" disabled={submitting}>
               {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editName ? 'Save' : 'Create user'}
            </Button>
         </div>
      </form>
   )
}

