'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import type {
   OrganismAuditChangeSection,
   OrganismAuditFieldChange,
} from '@/components/cms/dashboard/organism-audit-log-diff'
import { formatAuditValue } from '@/components/cms/dashboard/organism-audit-log-diff'

function ChangeTypeBadge({ type }: { type: OrganismAuditFieldChange['type'] }) {
   const labels: Record<OrganismAuditFieldChange['type'], string> = {
      added: 'Added',
      removed: 'Removed',
      updated: 'Updated',
   }
   const variants: Record<OrganismAuditFieldChange['type'], 'default' | 'secondary' | 'outline'> = {
      added: 'default',
      removed: 'secondary',
      updated: 'outline',
   }
   return <Badge variant={variants[type]}>{labels[type]}</Badge>
}

export function OrganismAuditLogChanges({
   sections,
   emptyLabel = 'No changed fields.',
}: {
   sections: OrganismAuditChangeSection[]
   emptyLabel?: string
}) {
   if (sections.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
   }

   return (
      <Accordion type="multiple" className="w-full">
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
                        <div
                           key={`${section.id}-${change.path}-${idx}`}
                           className="grid gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs md:grid-cols-[minmax(11rem,14rem)_auto_1fr_1fr]"
                        >
                           <code className="truncate rounded bg-muted px-1 py-0.5">
                              {change.path.replace(`${section.id}.`, '')}
                           </code>
                           <ChangeTypeBadge type={change.type} />
                           <span className="truncate text-muted-foreground">
                              {formatAuditValue(change.before)}
                           </span>
                           <span className="truncate font-medium">{formatAuditValue(change.after)}</span>
                        </div>
                     ))}
                  </div>
               </AccordionContent>
            </AccordionItem>
         ))}
      </Accordion>
   )
}
