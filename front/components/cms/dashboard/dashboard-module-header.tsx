import type { ReactNode } from 'react'

import { CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Compact single-row header shared by all dashboard tab-panel modules. */
export function DashboardModuleHeader({
   description,
   badge,
   action,
   className,
}: {
   description: ReactNode
   badge?: ReactNode
   action?: ReactNode
   className?: string
}) {
   return (
      <CardHeader className={cn('flex flex-row flex-wrap items-center justify-between gap-2 pb-3', className)}>
         <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">{description}</p>
            {badge}
         </div>
         {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
   )
}
