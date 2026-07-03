'use client'

import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function OverviewStatTile({
   label,
   Icon,
   value,
   loading,
   highlight = false,
}: {
   label: string
   Icon: LucideIcon
   value: number | null
   loading: boolean
   highlight?: boolean
}) {
   if (loading) {
      return (
         <Card className="gap-0 rounded-lg py-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
               <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
               <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-3 w-full" />
               </div>
            </CardContent>
         </Card>
      )
   }

   return (
      <Card
         className={cn(
            'gap-0 rounded-lg py-0 shadow-sm transition-colors',
            highlight && 'border-primary/30 bg-primary/[0.03]',
         )}
      >
         <CardContent className="flex items-center gap-3 p-4">
            <div
               className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                  highlight ? 'bg-primary/15' : 'bg-muted',
               )}
            >
               <Icon
                  className={cn(
                     'h-4.5 w-4.5',
                     highlight ? 'text-primary' : 'text-muted-foreground',
                  )}
                  aria-hidden
               />
            </div>
            <div className="min-w-0">
               <div
                  className={cn(
                     'text-xl font-bold leading-tight tabular-nums',
                     highlight ? 'text-primary' : 'text-foreground',
                  )}
               >
                  {value === null ? (
                     <span className="text-muted-foreground">—</span>
                  ) : (
                     value.toLocaleString()
                  )}
               </div>
               <div className="truncate text-xs text-muted-foreground" title={label}>
                  {label}
               </div>
            </div>
         </CardContent>
      </Card>
   )
}
