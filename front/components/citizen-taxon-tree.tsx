'use client'

import { useCallback, useMemo, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import {
   citizenNodeLabel,
   citizenNodesToHierarchy,
   type CitizenHierarchyNode,
} from '@/lib/citizenTaxonomy'
import type { CitizenTaxonomyNode } from '@/lib/portal/types'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'

function CitizenNodeRow({
   node,
   depth,
   selectedId,
   expanded,
   onToggleExpand,
   onSelect,
}: {
   node: CitizenHierarchyNode
   depth: number
   selectedId: string | null
   expanded: Set<string>
   onToggleExpand: (id: string) => void
   onSelect: (node: CitizenTaxonomyNode) => void
}) {
   const { locale } = useLocale()
   const hasChildren = node.children.length > 0
   const isOpen = expanded.has(node.taxid)
   const sel = selectedId === node.taxid
   const label = citizenNodeLabel(node, locale)

   return (
      <div>
         <div
            className={cn(
               'flex w-full items-center gap-1 rounded-md py-1.5 pr-2 text-sm hover:bg-muted/80',
               sel && 'bg-muted',
            )}
            style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
         >
            {hasChildren ? (
               <button
                  type="button"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted"
                  onClick={() => onToggleExpand(node.taxid)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
               >
                  {isOpen ? (
                     <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  ) : (
                     <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  )}
               </button>
            ) : (
               <span className="inline-block h-5 w-5 shrink-0" aria-hidden />
            )}
            <button
               type="button"
               role="option"
               aria-selected={sel}
               className="flex min-w-0 flex-1 items-center gap-1 text-left"
               onClick={() => onSelect(node)}
            >
               <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
               <span className="min-w-0 flex-1 truncate">{label}</span>
            </button>
         </div>
         {hasChildren && isOpen
            ? node.children.map((child) => (
                 <CitizenNodeRow
                    key={child.taxid}
                    node={child}
                    depth={depth + 1}
                    selectedId={selectedId}
                    expanded={expanded}
                    onToggleExpand={onToggleExpand}
                    onSelect={onSelect}
                 />
              ))
            : null}
      </div>
   )
}

export function CitizenTaxonTree({
   nodes,
   selectedId,
   onSelect,
   className,
}: {
   nodes: CitizenTaxonomyNode[]
   selectedId: string | null
   onSelect: (node: CitizenTaxonomyNode) => void
   className?: string
}) {
   const { t } = useLocale()
   const roots = useMemo(() => citizenNodesToHierarchy(nodes), [nodes])

   const initialExpanded = useMemo(() => {
      const s = new Set<string>()
      for (const r of roots) s.add(r.taxid)
      return s
   }, [roots])

   const [expanded, setExpanded] = useState<Set<string>>(initialExpanded)

   const onToggleExpand = useCallback((id: string) => {
      setExpanded((prev) => {
         const next = new Set(prev)
         if (next.has(id)) next.delete(id)
         else next.add(id)
         return next
      })
   }, [])

   return (
      <div
         className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain py-1',
            className,
         )}
         role="listbox"
         aria-label={t('taxonomy.browseCitizen')}
         aria-multiselectable={false}
      >
         {roots.map((node) => (
            <CitizenNodeRow
               key={node.taxid}
               node={node}
               depth={0}
               selectedId={selectedId}
               expanded={expanded}
               onToggleExpand={onToggleExpand}
               onSelect={onSelect}
            />
         ))}
      </div>
   )
}
