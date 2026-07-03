import { Button } from '@/components/ui/button'

/** Compact pagination footer shared by all dashboard tab-panel modules. */
export function DashboardModulePagination({
   page,
   totalPages,
   onPrevious,
   onNext,
}: {
   page: number
   totalPages: number
   onPrevious: () => void
   onNext: () => void
}) {
   return (
      <div className="flex items-center justify-between text-sm text-muted-foreground">
         <span>
            Page {page} of {totalPages}
         </span>
         <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrevious}>
               Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNext}>
               Next
            </Button>
         </div>
      </div>
   )
}
