import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
   sample_acquired: 'default',
   in_progress: 'secondary',
   published: 'default',
   insdc_open: 'outline',
   open: 'outline',
   submitted: 'secondary',
   in_assembly: 'secondary',
   pending_deletion: 'destructive',
}

export function CmsStatusPill({
   value,
   type = 'goat',
}: {
   value?: string | null
   type?: 'goat' | 'insdc' | 'target'
}) {
   if (!value) return <span className="text-muted-foreground">—</span>
   const variant = VARIANT_MAP[value] ?? (type === 'target' ? 'outline' : 'secondary')
   const label = value.replace(/_/g, ' ')
   return (
      <Badge variant={variant} className={cn('text-xs font-medium capitalize')}>
         {label}
      </Badge>
   )
}
