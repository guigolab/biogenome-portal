'use client'

import { getAuditActionMeta } from '@/components/cms/dashboard/organism-audit-log-diff'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function OrganismAuditActionBadge({
   action,
   className,
   showIcon = true,
}: {
   action: string
   className?: string
   showIcon?: boolean
}) {
   const meta = getAuditActionMeta(action)
   const Icon = meta.Icon

   return (
      <Badge variant="outline" className={cn('gap-1 font-medium', meta.badgeClassName, className)}>
         {showIcon ? <Icon className="h-3 w-3 shrink-0" aria-hidden /> : null}
         <span>{meta.label}</span>
      </Badge>
   )
}

export function OrganismAuditActionDot({
   action,
   className,
}: {
   action: string
   className?: string
}) {
   const meta = getAuditActionMeta(action)

   return (
      <span
         className={cn('h-2.5 w-2.5 shrink-0 rounded-full', meta.dotClassName, className)}
         aria-hidden
      />
   )
}
