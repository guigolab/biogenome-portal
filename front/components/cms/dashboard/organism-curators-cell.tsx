'use client'

import { useState } from 'react'
import { Loader2, UserPlus, X } from 'lucide-react'
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
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from '@/components/ui/popover'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import { cmsAssignSpeciesToUser, cmsUnassignSpeciesFromUser } from '@/lib/cms/services/auth'
import { cn } from '@/lib/utils'

type CuratorOption = { name: string }

type Props = {
   taxid: string
   scientificName: string
   assignedUsers: string[]
   /** Data Manager accounts (e.g. from cmsGetUsers, admins excluded). */
   curatorOptions: CuratorOption[]
   onUpdated: () => void
   /** Optional: open CMS user editor (e.g. drawer). */
   onOpenUser?: (userName: string) => void
}

export function OrganismCuratorsCell({
   taxid,
   scientificName,
   assignedUsers,
   curatorOptions,
   onUpdated,
   onOpenUser,
}: Props) {
   const [busy, setBusy] = useState<'add' | `remove:${string}` | null>(null)
   const [removeUser, setRemoveUser] = useState<string | null>(null)
   const [addOpen, setAddOpen] = useState(false)

   const assignedSet = new Set(assignedUsers)
   const canAdd = curatorOptions.filter((u) => !assignedSet.has(u.name))

   async function handleAdd(userName: string) {
      if (!userName) return
      setBusy('add')
      try {
         await cmsAssignSpeciesToUser(userName, taxid)
         toast.success(`${userName} assigned to ${scientificName}.`)
         setAddOpen(false)
         onUpdated()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Could not assign curator'))
      } finally {
         setBusy(null)
      }
   }

   async function confirmRemove() {
      if (!removeUser) return
      setBusy(`remove:${removeUser}`)
      try {
         await cmsUnassignSpeciesFromUser(removeUser, taxid)
         toast.success(`${removeUser} unassigned from ${scientificName}.`)
         setRemoveUser(null)
         onUpdated()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Could not remove curator'))
      } finally {
         setBusy(null)
      }
   }

   return (
      <>
         <div className="flex min-w-[12rem] max-w-[22rem] flex-wrap items-center gap-1.5">
            {assignedUsers.length === 0 ? (
               <span className="text-xs text-muted-foreground">None</span>
            ) : (
               assignedUsers.map((u) => (
                  <span
                     key={u}
                     className={cn(
                        'inline-flex max-w-full items-center gap-0.5 rounded-full border border-border bg-muted/60 pl-2 text-xs font-medium text-foreground',
                        busy === `remove:${u}` && 'opacity-60',
                     )}
                  >
                     {onOpenUser ? (
                        <button
                           type="button"
                           className="truncate py-0.5 pr-0.5 text-left hover:underline"
                           title="Edit user"
                           onClick={() => onOpenUser(u)}
                        >
                           {u}
                        </button>
                     ) : (
                        <span className="truncate py-0.5 pr-0.5">{u}</span>
                     )}
                     <button
                        type="button"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                        title={`Remove ${u}`}
                        disabled={!!busy}
                        onClick={() => setRemoveUser(u)}
                        aria-label={`Remove ${u} from this species`}
                     >
                        {busy === `remove:${u}` ? (
                           <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                           <X className="h-3.5 w-3.5" />
                        )}
                     </button>
                  </span>
               ))
            )}

            <Popover open={addOpen} onOpenChange={setAddOpen}>
               <PopoverTrigger asChild>
                  <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     className="h-7 gap-1 px-2 text-xs"
                     disabled={!!busy || canAdd.length === 0}
                     title={canAdd.length === 0 ? 'No curators available to add' : 'Assign curator'}
                  >
                     {busy === 'add' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                     ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                     )}
                     Add
                  </Button>
               </PopoverTrigger>
               <PopoverContent className="w-72 p-3" align="start">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Assign Data Manager</p>
                  {canAdd.length === 0 ? (
                     <p className="text-sm text-muted-foreground">All eligible curators are already assigned.</p>
                  ) : (
                     <Select
                        key={assignedUsers.join(',')}
                        onValueChange={(v) => void handleAdd(v)}
                     >
                        <SelectTrigger className="w-full">
                           <SelectValue placeholder="Choose user…" />
                        </SelectTrigger>
                        <SelectContent>
                           {canAdd.map((u) => (
                              <SelectItem key={u.name} value={u.name}>
                                 {u.name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  )}
               </PopoverContent>
            </Popover>
         </div>

         <AlertDialog open={!!removeUser} onOpenChange={() => setRemoveUser(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Remove curator?</AlertDialogTitle>
                  <AlertDialogDescription>
                     Remove <strong>{removeUser}</strong> from <em>{scientificName}</em>? They will lose access
                     to this species until assigned again.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={!!busy}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void confirmRemove()} disabled={!!busy}>
                     Remove
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   )
}
