'use client'

import { useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import { extractApiMessage } from '@/lib/cms/extract-api-message'
import {
   goatStatusFromSelectValue,
   goatStatusToSelectValue,
   goatStatusValuesEqual,
   isGoatStatusEditable,
   isGoatStatusLocked,
   isGoatStatusUnset,
   labelGoatStatusForSelect,
   labelTargetListStatusForSelect,
   normalizeGoatStatusStored,
   normalizeTargetListStatusForSelect,
   SELECTABLE_GOAT_STATUSES,
   TARGET_LIST_OPTIONS,
   type TargetListStatusKey,
} from '@/lib/cms/organism-status-options'
import { labelGoatStatus, labelTargetListStatus } from '@/lib/organismStatusLabels'
import { cmsPatchOrganism } from '@/lib/cms/services/auth'
import { cn } from '@/lib/utils'

type OrganismStatusField = 'goat_status' | 'target_list_status'

type Props = {
   taxid: string
   scientificName: string
   field: OrganismStatusField
   value: unknown
   disabled?: boolean
   readOnly?: boolean
   onUpdated: () => void
}

function StatusReadOnlyBadge({
   label,
   locked,
}: {
   label: string
   locked?: boolean
}) {
   return (
      <div className="flex items-center gap-1.5">
         <Badge variant="secondary" className="text-xs font-medium">
            {label}
         </Badge>
         {locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
      </div>
   )
}

export function OrganismStatusPatchSelect({
   taxid,
   scientificName,
   field,
   value,
   disabled = false,
   readOnly = false,
   onUpdated,
}: Props) {
   const [busy, setBusy] = useState(false)

   const isGoat = field === 'goat_status'
   const storedGoat = normalizeGoatStatusStored(value)
   const goatLocked = isGoat && isGoatStatusLocked(storedGoat)
   const goatEditable = isGoat && isGoatStatusEditable(storedGoat)
   const showReadOnly = disabled || readOnly || goatLocked || (isGoat && !goatEditable && !isGoatStatusUnset(value))

   const targetValue = normalizeTargetListStatusForSelect(value)

   async function patchField(patchValue: string | null) {
      if (busy || disabled || readOnly) return

      if (isGoat) {
         if (goatLocked || patchValue === null) return
         if (goatStatusValuesEqual(value, patchValue)) return
      } else if (patchValue === targetValue) {
         return
      }

      setBusy(true)
      try {
         await cmsPatchOrganism(taxid, field, patchValue)
         const label = isGoat
            ? labelGoatStatus(patchValue)
            : labelTargetListStatus(patchValue)
         toast.success(`${scientificName}: ${label} saved.`)
         onUpdated()
      } catch (e) {
         toast.error(extractApiMessage(e, 'Could not update status'))
      } finally {
         setBusy(false)
      }
   }

   if (showReadOnly) {
      const label = isGoat
         ? storedGoat
            ? labelGoatStatus(storedGoat)
            : 'No status'
         : labelTargetListStatus(targetValue)
      return <StatusReadOnlyBadge label={label} locked={goatLocked} />
   }

   if (isGoat) {
      const selectValue = goatStatusToSelectValue(value)
      const unset = isGoatStatusUnset(value)

      return (
         <Select
            value={unset ? undefined : selectValue}
            disabled={busy}
            onValueChange={(next) => {
               const patchValue = goatStatusFromSelectValue(next)
               if (patchValue === null) return
               void patchField(patchValue)
            }}
         >
            <SelectTrigger
               className={cn('h-8 min-w-[10rem] text-xs', busy && 'opacity-70')}
               aria-label={`GoaT status for ${scientificName}`}
            >
               {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
               ) : (
                  <SelectValue placeholder="No status" />
               )}
            </SelectTrigger>
            <SelectContent>
               {SELECTABLE_GOAT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status} className="text-xs">
                     {labelGoatStatusForSelect(status)}
                  </SelectItem>
               ))}
            </SelectContent>
         </Select>
      )
   }

   return (
      <Select
         value={targetValue}
         disabled={busy}
         onValueChange={(next) => {
            void patchField(next as TargetListStatusKey)
         }}
      >
         <SelectTrigger
            className={cn('h-8 min-w-[10rem] text-xs', busy && 'opacity-70')}
            aria-label={`Target list for ${scientificName}`}
         >
            {busy ? (
               <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
               <SelectValue />
            )}
         </SelectTrigger>
         <SelectContent>
            {TARGET_LIST_OPTIONS.map((option) => (
               <SelectItem key={option.key} value={option.key} className="text-xs">
                  {labelTargetListStatusForSelect(option.key)}
               </SelectItem>
            ))}
         </SelectContent>
      </Select>
   )
}
