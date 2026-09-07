'use client'

import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'

const SIZE_CLASSES = {
   md: {
      mark: 'h-7 w-7',
      star: 'h-3.5 w-3.5',
   },
   sm: {
      mark: 'h-5 w-5',
      star: 'h-3 w-3',
   },
} as const

/** Amber filled star badge used for RefSeq reference genomes (cards + filter title). */
export function ReferenceGenomeStarMark({
   className,
   size = 'md',
   title,
   'aria-label': ariaLabel,
}: {
   className?: string
   /** `md` = assembly cards; `sm` = filter collapse header. */
   size?: keyof typeof SIZE_CLASSES
   title?: string
   'aria-label'?: string
}) {
   const sizes = SIZE_CLASSES[size]
   return (
      <span
         title={title}
         aria-label={ariaLabel}
         className={cn(
            'flex shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-50 text-amber-500 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400',
            sizes.mark,
            className,
         )}
      >
         <Star className={cn('fill-current', sizes.star)} aria-hidden />
      </span>
   )
}
