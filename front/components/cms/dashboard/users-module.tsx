'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import { cmsDeleteUser, cmsGetUsers } from '@/lib/cms/services/auth'
import { useCmsAuthStore } from '@/stores/cms-auth-store'
import { useCmsDrawerStore } from '@/stores/cms-drawer-store'

const LIMIT = 8

export function UsersModule() {
   const currentName = useCmsAuthStore((s) => s.userName)
   const openDrawer = useCmsDrawerStore((s) => s.open)

   const [users, setUsers] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(true)
   const [filterDraft, setFilterDraft] = useState('')
   const [filter, setFilter] = useState('')
   const [page, setPage] = useState(1)
   const [deleteUser, setDeleteUser] = useState<Record<string, unknown> | null>(null)
   const [deleting, setDeleting] = useState(false)

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
         const { data, total: t } = await cmsGetUsers({
            filter,
            limit: LIMIT,
            offset: (page - 1) * LIMIT,
         })
         setUsers(data ?? [])
         setTotal(t ?? 0)
      } catch {
         setUsers([])
         setTotal(0)
      } finally {
         setLoading(false)
      }
   }, [filter, page])

   useEffect(() => {
      void fetchData()
   }, [fetchData])

   function canEditUser(user: Record<string, unknown>) {
      if (user.role === 'DataManager') return true
      if (user.role === 'Admin' && user.name === currentName) return true
      return false
   }

   function canDeleteUser(user: Record<string, unknown>) {
      if (user.name === currentName) return false
      if (user.role === 'Admin') return false
      return true
   }

   async function confirmDelete() {
      if (!deleteUser?.name) return
      setDeleting(true)
      try {
         await cmsDeleteUser(String(deleteUser.name))
         toast.success('User deleted.')
         setDeleteUser(null)
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
         <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
               <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>Curator accounts — create, edit, or remove.</CardDescription>
               </div>
               <Button size="sm" className="gap-2" onClick={() => openDrawer({ panel: 'user' })}>
                  <UserPlus className="h-4 w-4" />
                  New user
               </Button>
            </CardHeader>
            <CardContent className="space-y-4">
               <Input
                  placeholder="Filter by name or email…"
                  value={filterDraft}
                  onChange={(e) => setFilterDraft(e.target.value)}
                  className="max-w-md"
               />
               {loading ? (
                  <div className="flex justify-center py-10">
                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
               ) : users.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No users found.</p>
               ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                     {users.map((user) => (
                        <li
                           key={String(user.name)}
                           className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap"
                        >
                           <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                              {String(user.name ?? '?')
                                 .charAt(0)
                                 .toUpperCase()}
                           </div>
                           <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{String(user.name)}</p>
                              {user.email ? (
                                 <a
                                    href={`mailto:${user.email}`}
                                    className="truncate text-sm text-muted-foreground hover:text-primary hover:underline"
                                 >
                                    {String(user.email)}
                                 </a>
                              ) : (
                                 <span className="text-sm text-muted-foreground">—</span>
                              )}
                           </div>
                           <Badge
                              variant={user.role === 'Admin' ? 'secondary' : 'outline'}
                              className="shrink-0 capitalize"
                           >
                              {String(user.role ?? '—')}
                           </Badge>
                           <div className="flex shrink-0 gap-1">
                              {canEditUser(user) ? (
                                 <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Edit"
                                    onClick={() => openDrawer({ panel: 'user', userName: String(user.name) })}
                                 >
                                    <Pencil className="h-4 w-4" />
                                 </Button>
                              ) : user.role === 'Admin' ? (
                                 <span className="px-2 text-xs text-muted-foreground" title="Protected">
                                    —
                                 </span>
                              ) : null}
                              {canDeleteUser(user) ? (
                                 <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    title="Delete"
                                    onClick={() => setDeleteUser(user)}
                                 >
                                    <Trash2 className="h-4 w-4" />
                                 </Button>
                              ) : null}
                           </div>
                        </li>
                     ))}
                  </ul>
               )}
               {total > LIMIT ? (
                  <div className="flex justify-between text-sm text-muted-foreground">
                     <span>
                        Page {page} / {Math.ceil(total / LIMIT)}
                     </span>
                     <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                           Prev
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

         <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Delete user?</AlertDialogTitle>
                  <AlertDialogDescription>
                     Permanently remove <strong>{deleteUser ? String(deleteUser.name) : ''}</strong>.
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
