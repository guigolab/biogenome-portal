'use client'

import type { ChangeEvent, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ChevronDown, Search, X } from 'lucide-react'

/** Scrollable column used by species list and catalog explorer sidebars. */
export const filterSidebarScrollColumnClassName =
   'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain'

/**
 * Accordion section shell: rounded card, ghost trigger, chevron, optional clear (×).
 * Pair with your feature’s accordion context — pass `open` / `onOpenChange` from it.
 */
export function FilterSectionCollapsible({
   open,
   onOpenChange,
   title,
   children,
   isActive,
   onReset,
   clearLabel,
}: {
   open: boolean
   onOpenChange: (next: boolean) => void
   title: ReactNode
   children: ReactNode
   isActive?: boolean
   onReset?: () => void
   clearLabel?: string
}) {
   return (
      <Collapsible
         open={open}
         onOpenChange={onOpenChange}
         className={cn(
            'rounded-xl border bg-card',
            isActive ? 'border-primary/40' : 'border-border',
         )}
      >
         <CollapsibleTrigger asChild>
            <Button
               type="button"
               variant="ghost"
               className="group flex h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/60 hover:text-foreground"
            >
               <span
                  className={cn(
                     'min-w-0 flex-1 text-left',
                     typeof title === 'string' ? 'truncate' : 'overflow-hidden',
                     isActive ? 'text-primary group-hover:text-primary' : 'text-foreground',
                  )}
               >
                  {title}
               </span>
               <span className="ml-auto flex shrink-0 items-center gap-1">
                  {isActive && onReset ? (
                     <span
                        role="button"
                        tabIndex={0}
                        aria-label={clearLabel}
                        className="flex h-5 w-5 items-center justify-center rounded-md text-primary opacity-70 hover:bg-primary/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        onClick={(e) => {
                           e.stopPropagation()
                           onReset()
                        }}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation()
                              onReset()
                           }
                        }}
                     >
                        <X className="h-3 w-3" aria-hidden />
                     </span>
                  ) : null}
                  <ChevronDown className="h-4 w-4 opacity-60 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
               </span>
            </Button>
         </CollapsibleTrigger>
         <CollapsibleContent
            className={cn(
               'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden',
            )}
         >
            <div className="border-t border-border/60 px-2 pb-3 pt-1">{children}</div>
         </CollapsibleContent>
      </Collapsible>
   )
}

/** Search field inside a bordered card — shared by species and catalog filter sidebars. */
export function FilterSidebarSearchCard({
   inputId,
   label,
   placeholder,
   value,
   onChange,
   ariaLabel,
   className,
}: {
   inputId: string
   /** Shown as sr-only label; also used as default aria-label when `ariaLabel` omitted. */
   label: string
   placeholder: string
   value: string
   onChange: (value: string) => void
   /** Defaults to `label`. */
   ariaLabel?: string
   className?: string
}) {
   const resolvedAria = ariaLabel ?? label

   function handleChange(e: ChangeEvent<HTMLInputElement>) {
      onChange(e.target.value)
   }

   return (
      <div className={cn('shrink-0 rounded-xl border border-border bg-card p-2', className)}>
         <label htmlFor={inputId} className="sr-only">
            {label}
         </label>
         <div className="relative min-h-10 min-w-0">
            <Search
               className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
               aria-hidden
            />
            <Input
               id={inputId}
               placeholder={placeholder}
               value={value}
               onChange={handleChange}
               className="h-10 pl-9"
               aria-label={resolvedAria}
            />
         </div>
      </div>
   )
}
