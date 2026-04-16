import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Placeholder grid while the first page of organisms is loading. */
export function SpeciesListGridSkeleton({ className }: { className?: string }) {
   return (
      <div
         className={cn('grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3', className)}
         aria-hidden
      >
         {Array.from({ length: 6 }).map((_, i) => (
            <div
               key={i}
               className="flex min-h-[240px] flex-col overflow-hidden rounded-xl border border-border bg-card"
            >
               <Skeleton className="aspect-[4/3] w-full shrink-0 rounded-none rounded-t-xl" />
               <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                  <Skeleton className="h-5 w-4/5 sm:h-6" />
                  <Skeleton className="h-4 w-3/5" />
                  <div className="mt-auto space-y-2 pt-2">
                     <Skeleton className="h-3 w-full" />
                     <Skeleton className="h-8 w-full" />
                  </div>
               </div>
            </div>
         ))}
      </div>
   )
}
