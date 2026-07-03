'use client'

import { useState } from 'react'

import {
   AUDIT_CHANGE_TYPE_META,
   formatAuditValue,
   type OrganismAuditChangeSection,
   type OrganismAuditFieldChange,
} from '@/components/cms/dashboard/organism-audit-log-diff'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

const LONG_VALUE_THRESHOLD = 240

function ChangeTypeBadge({ type }: { type: OrganismAuditFieldChange['type'] }) {
   const meta = AUDIT_CHANGE_TYPE_META[type]
   const Icon = meta.Icon

   return (
      <Badge variant="outline" className={cn('gap-1 font-medium', meta.badgeClassName)}>
         <Icon className="h-3 w-3 shrink-0" aria-hidden />
         {meta.label}
      </Badge>
   )
}

function DiffValueBlock({
   prefix,
   value,
   className,
}: {
   prefix: '+' | '-'
   value: unknown
   className: string
}) {
   const [open, setOpen] = useState(false)
   const formatted = formatAuditValue(value)
   const isLong = formatted.length > LONG_VALUE_THRESHOLD

   const content = (
      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{formatted}</pre>
   )

   if (!isLong) {
      return (
         <div className={cn('rounded-md border px-2.5 py-2', className)}>
            <div className="flex gap-2">
               <span className="shrink-0 font-mono text-xs font-semibold opacity-70">{prefix}</span>
               <div className="min-w-0 flex-1">{content}</div>
            </div>
         </div>
      )
   }

   return (
      <Collapsible open={open} onOpenChange={setOpen}>
         <div className={cn('rounded-md border px-2.5 py-2', className)}>
            <div className="flex gap-2">
               <span className="shrink-0 font-mono text-xs font-semibold opacity-70">{prefix}</span>
               <div className="min-w-0 flex-1">
                  <CollapsibleContent
                     forceMount
                     className={cn(
                        !open && 'line-clamp-3 overflow-hidden',
                        open && 'max-h-48 overflow-y-auto overscroll-y-contain',
                     )}
                  >
                     {content}
                  </CollapsibleContent>
                  <CollapsibleTrigger asChild>
                     <Button type="button" variant="link" size="sm" className="h-auto px-0 py-1 text-xs">
                        {open ? 'Show less' : 'Show more'}
                     </Button>
                  </CollapsibleTrigger>
               </div>
            </div>
         </div>
      </Collapsible>
   )
}

function FieldChangeRow({
   change,
   sectionId,
}: {
   change: OrganismAuditFieldChange
   sectionId: string
}) {
   const meta = AUDIT_CHANGE_TYPE_META[change.type]
   const fieldPath = change.path.replace(`${sectionId}.`, '')

   return (
      <div className="space-y-2 rounded-md border border-border bg-muted/40 p-2.5">
         <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{fieldPath}</code>
            <ChangeTypeBadge type={change.type} />
         </div>
         <div className="space-y-1.5">
            {change.type === 'added' ? (
               <DiffValueBlock prefix="+" value={change.after} className={meta.addedBlockClassName} />
            ) : null}
            {change.type === 'removed' ? (
               <DiffValueBlock prefix="-" value={change.before} className={meta.removedBlockClassName} />
            ) : null}
            {change.type === 'updated' ? (
               <>
                  <DiffValueBlock prefix="-" value={change.before} className={meta.removedBlockClassName} />
                  <DiffValueBlock prefix="+" value={change.after} className={meta.addedBlockClassName} />
               </>
            ) : null}
         </div>
      </div>
   )
}

export function OrganismAuditLogChanges({
   sections,
   emptyLabel = 'No changed fields.',
   defaultOpenAll = false,
   className,
}: {
   sections: OrganismAuditChangeSection[]
   emptyLabel?: string
   defaultOpenAll?: boolean
   className?: string
}) {
   if (sections.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
   }

   const defaultOpenSections = defaultOpenAll ? sections.map((section) => section.id) : undefined

   return (
      <div
         className={cn(
            'max-h-[min(28rem,50vh)] overflow-y-auto overscroll-y-contain pr-1',
            className,
         )}
      >
         <Accordion type="multiple" className="w-full" defaultValue={defaultOpenSections}>
            {sections.map((section) => (
               <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="py-3">
                     <span className="flex items-center gap-2">
                        <span className="text-sm font-medium">{section.label}</span>
                        <Badge variant="secondary">{section.changes.length}</Badge>
                     </span>
                  </AccordionTrigger>
                  <AccordionContent>
                     <div className="space-y-2">
                        {section.changes.map((change, idx) => (
                           <FieldChangeRow
                              key={`${section.id}-${change.path}-${idx}`}
                              change={change}
                              sectionId={section.id}
                           />
                        ))}
                     </div>
                  </AccordionContent>
               </AccordionItem>
            ))}
         </Accordion>
      </div>
   )
}
