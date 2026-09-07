'use client'

import { useState } from 'react'
import { IdCard, Loader2, X } from 'lucide-react'
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
import {
   cmsAssignPrincipalToUser,
   cmsUnassignPrincipalFromUser,
} from '@/lib/cms/services/auth'
import type { CmsOrganismPrincipalOption } from '@/lib/cms/services/organism-principals'
import { cn } from '@/lib/utils'

type Props = {
   userName: string
   assignedPrincipalIds: string[]
   principalOptions: CmsOrganismPrincipalOption[]
   onUpdated: () => void
   disabled?: boolean
}

export function UserPrincipalsCell({
   userName,
   assignedPrincipalIds,
   principalOptions,
   onUpdated,
   disabled = false,
}: Props) {
   const [busy, setBusy] = useState<'add' | `remove:${string}` | null>(null)
   const [removeSlug, setRemoveSlug] = useState<string | null>(null)
   const [addOpen, setAddOpen] = useState(false)

   const assignedSet = new Set(assignedPrincipalIds)
   const canAdd = principalOptions.filter((p) => !assignedSet.has(p.slug))
   const nameBySlug = new Map(principalOptions.map((p) => [p.slug, p.name]))

   function labelFor(slug: string) {
      return nameBySlug.get(slug) ?? slug
   }

   async function handleAdd(slug: string) {
      if (!slug) return
      setBusy('add')
      try {
         await cmsAssignPrincipalToUser(userName, slug, assignedPrincipalIds)
         toast.success(`${labelFor(slug)} linked to ${userName}.`)
         setAddOpen(false)
         onUpdated()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Could not link principal'))
      } finally {
         setBusy(null)
      }
   }

   async function confirmRemove() {
      if (!removeSlug) return
      setBusy(`remove:${removeSlug}`)
      try {
         await cmsUnassignPrincipalFromUser(userName, removeSlug, assignedPrincipalIds)
         toast.success(`${labelFor(removeSlug)} unlinked from ${userName}.`)
         setRemoveSlug(null)
         onUpdated()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Could not unlink principal'))
      } finally {
         setBusy(null)
      }
   }

   return (
      <>
         <div className="flex min-w-[10rem] max-w-[18rem] flex-wrap items-center gap-1.5">
            {assignedPrincipalIds.length > 0
               ? assignedPrincipalIds.map((slug) => {
                    const label = labelFor(slug)
                    return (
                       <span
                          key={slug}
                          className={cn(
                             'inline-flex max-w-full items-center gap-0.5 rounded-full border border-border bg-muted/60 pl-2 text-xs font-medium text-foreground',
                             busy === `remove:${slug}` && 'opacity-60',
                          )}
                       >
                          <span className="truncate py-0.5 pr-0.5">{label}</span>
                          <button
                             type="button"
                             className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                             title={`Unlink ${label}`}
                             disabled={!!busy || disabled}
                             onClick={() => setRemoveSlug(slug)}
                             aria-label={`Unlink ${label} from ${userName}`}
                          >
                             {busy === `remove:${slug}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                             ) : (
                                <X className="h-3.5 w-3.5" />
                             )}
                          </button>
                       </span>
                    )
                 })
               : null}

            <Popover open={addOpen} onOpenChange={setAddOpen}>
               <PopoverTrigger asChild>
                  <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     className="h-7 gap-1 px-2 text-xs"
                     disabled={!!busy || disabled || canAdd.length === 0}
                     title={
                        canAdd.length === 0
                           ? 'No principals available to link'
                           : 'Link principal'
                     }
                  >
                     {busy === 'add' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                     ) : (
                        <IdCard className="h-3.5 w-3.5" />
                     )}
                     Add
                  </Button>
               </PopoverTrigger>
               <PopoverContent className="w-72 p-3" align="start">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Link principal (PI)</p>
                  {canAdd.length === 0 ? (
                     <p className="text-sm text-muted-foreground">
                        All principals are already linked.
                     </p>
                  ) : (
                     <Select
                        key={assignedPrincipalIds.join(',')}
                        onValueChange={(v) => void handleAdd(v)}
                     >
                        <SelectTrigger className="w-full">
                           <SelectValue placeholder="Choose principal…" />
                        </SelectTrigger>
                        <SelectContent>
                           {canAdd.map((p) => (
                              <SelectItem key={p.slug} value={p.slug}>
                                 {p.name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  )}
               </PopoverContent>
            </Popover>
         </div>

         <AlertDialog open={!!removeSlug} onOpenChange={() => setRemoveSlug(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Unlink principal?</AlertDialogTitle>
                  <AlertDialogDescription>
                     Remove <strong>{removeSlug ? labelFor(removeSlug) : ''}</strong> from{' '}
                     <em>{userName}</em>? Species assigned to this curator will no longer show that
                     PI until linked again.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={!!busy}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void confirmRemove()} disabled={!!busy}>
                     Unlink
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   )
}
