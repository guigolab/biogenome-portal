'use client'

import { useLocale } from '@/contexts/locale-context'
import type { GoatTrackerStage } from '@/lib/goatPipelineTracker'
import { TARGET_LIST_PIPELINE_STEPS, TARGET_LIST_STATUS_LABELS } from '@/lib/organismStatusLabels'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export function GoatStatusFilterList({
   stages,
   selectedKeys,
   onToggleKey,
   loading,
}: {
   stages: GoatTrackerStage[]
   selectedKeys: string[]
   onToggleKey: (key: string) => void
   loading: boolean
}) {
   const { t } = useLocale()
   return (
      <div
         className="max-h-[min(50vh,24rem)] space-y-0.5 overflow-y-auto overscroll-contain py-1"
         role="listbox"
         aria-label={t('statusPage.filterByGoatStatus')}
         aria-multiselectable
      >
         {stages.map((s) => {
            const sel = selectedKeys.includes(s.key)
            return (
               <button
                  key={s.key}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  className={cn(
                     'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
                     sel && 'bg-muted',
                  )}
                  onClick={() => onToggleKey(s.key)}
               >
                  <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
                  <span
                     className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/35"
                     aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                     {loading ? '—' : s.count.toLocaleString()}
                  </span>
               </button>
            )
         })}
      </div>
   )
}

export function TargetListFilterList({
   value,
   onChange,
   targetListStats,
   loading,
}: {
   value: string
   onChange: (next: string) => void
   targetListStats: Record<string, number> | null
   loading: boolean
}) {
   const { t } = useLocale()
   const options = TARGET_LIST_PIPELINE_STEPS
   return (
      <div
         className="max-h-[min(50vh,20rem)] space-y-0.5 overflow-y-auto overscroll-contain py-1"
         role="listbox"
         aria-label={t('statusPage.filterByTargetList')}
      >
         <button
            type="button"
            role="option"
            aria-selected={value === 'all'}
            className={cn(
               'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
               value === 'all' && 'bg-muted',
            )}
            onClick={() => onChange('all')}
         >
            <Check className={cn('h-4 w-4 shrink-0', value === 'all' ? 'opacity-100' : 'opacity-0')} />
            <span className="min-w-0 flex-1 font-medium">{t('statusPage.allTargetListStatuses')}</span>
         </button>
         {options.map((st) => {
            const sel = value === st.value
            const count = targetListStats?.[st.value] ?? 0
            const label =
               TARGET_LIST_STATUS_LABELS[st.value as keyof typeof TARGET_LIST_STATUS_LABELS] ?? st.label
            return (
               <button
                  key={st.value}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  className={cn(
                     'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
                     sel && 'bg-muted',
                  )}
                  onClick={() => onChange(st.value)}
               >
                  <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                     {loading ? '—' : count.toLocaleString()}
                  </span>
               </button>
            )
         })}
      </div>
   )
}
