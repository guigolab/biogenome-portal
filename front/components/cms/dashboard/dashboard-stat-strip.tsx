'use client'

import { useEffect, useState } from 'react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cmsGetModelFieldStats } from '@/lib/cms/services/auth'
import type { DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'

const NO_ENTRY = 'No Entry'

const TILE_META: Record<string, { label: string; className: string }> = {
   organisms: { label: 'Species', className: 'border-primary/30 bg-primary/5' },
   assemblies: { label: 'Assemblies', className: 'border-chart-2/40 bg-chart-2/10' },
   reads: { label: 'Reads', className: 'border-muted-foreground/25 bg-muted/50' },
   biosamples: { label: 'Biosamples', className: 'border-chart-3/40 bg-chart-3/10' },
   local_samples: { label: 'Local samples', className: 'border-chart-4/40 bg-chart-4/10' },
   annotations: { label: 'Annotations', className: 'border-chart-5/40 bg-chart-5/10' },
}

const GOAT_PIPELINE = [
   'sample_collected',
   'sample_acquired',
   'data_generation',
   'in_assembly',
   'insdc_submitted',
   'publication_available',
]
const INSDC_PIPELINE = [
   'biosample_submitted',
   'reads_submitted',
   'assemblies_submitted',
   'annotation_completed',
]

function normKey(k: string) {
   return k.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

type StatusRow = { field: string; label: string; data: Record<string, number> }

export function DashboardStatStrip({
   rawStats,
}: {
   rawStats: { key: DataModels; count: number }[]
}) {
   const [statusRows, setStatusRows] = useState<StatusRow[]>([])
   const [loading, setLoading] = useState(true)

   useEffect(() => {
      let cancelled = false
      ;(async () => {
         try {
            const fields = [
               { field: 'goat_status', label: 'GoaT' },
               { field: 'insdc_status', label: 'INSDC' },
               { field: 'target_list_status', label: 'Target list' },
            ] as const
            const results = await Promise.all(
               fields.map(async (f) => {
                  const res = await cmsGetModelFieldStats('organisms', f.field, {})
                  const data = Object.fromEntries(
                     Object.entries(res).filter(([k]) => k !== NO_ENTRY),
                  )
                  return { field: f.field, label: f.label, data }
               }),
            )
            if (!cancelled) setStatusRows(results.filter((r) => Object.keys(r.data).length > 0))
         } catch {
            if (!cancelled) setStatusRows([])
         } finally {
            if (!cancelled) setLoading(false)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [])

   function orderedEntries(data: Record<string, number>, field: string): [string, number][] {
      const entries = Object.entries(data)
      const order = field === 'goat_status' ? GOAT_PIPELINE : field === 'insdc_status' ? INSDC_PIPELINE : []
      const sortIdx = (k: string) => {
         const n = normKey(k)
         const i = order.indexOf(n)
         return i === -1 ? 1000 : i
      }
      return entries.sort((a, b) => sortIdx(a[0]) - sortIdx(b[0]) || a[0].localeCompare(b[0]))
   }

   return (
      <Card className="overflow-hidden border-border/80 shadow-sm">
         <div className="flex flex-wrap border-b border-border">
            {rawStats.map((stat) => {
               const meta = TILE_META[stat.key] ?? {
                  label: stat.key,
                  className: 'border-border bg-muted/30',
               }
               return (
                  <div
                     key={stat.key}
                     className={cn(
                        'min-w-[140px] flex-1 border-r border-border px-4 py-3 last:border-r-0',
                        meta.className,
                     )}
                  >
                     <p className="font-mono text-xl font-semibold tracking-tight">
                        {stat.key === 'organisms' ? (
                           <span className="text-primary">{stat.count.toLocaleString()}</span>
                        ) : (
                           stat.count.toLocaleString()
                        )}
                     </p>
                     <p className="text-xs font-medium text-muted-foreground">{meta.label}</p>
                  </div>
               )
            })}
         </div>
         <div className="space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
               Organism statuses
            </p>
            {loading ? (
               <div className="space-y-2">
                  <Skeleton className="h-3 w-full rounded-full" />
                  <Skeleton className="h-3 w-4/5 rounded-full" />
               </div>
            ) : (
               statusRows.map((row) => {
                  const entries = orderedEntries(row.data, row.field)
                  const total = entries.reduce((s, [, c]) => s + c, 0)
                  const stacked = row.field === 'goat_status' || row.field === 'insdc_status'
                  return (
                     <div key={row.field} className="space-y-1.5">
                        <p className="text-sm font-medium">{row.label}</p>
                        {stacked ? (
                           <>
                              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                                 {entries.map(([k, count], i) => {
                                    const pct = total ? (count / total) * 100 : 0
                                    return (
                                       <div
                                          key={k}
                                          className={cn(
                                             'min-w-0 transition-all',
                                             i % 4 === 0 && 'bg-primary/80',
                                             i % 4 === 1 && 'bg-chart-2/80',
                                             i % 4 === 2 && 'bg-chart-3/80',
                                             i % 4 === 3 && 'bg-chart-4/80',
                                          )}
                                          style={{ width: `${pct}%` }}
                                          title={`${k}: ${count}`}
                                       />
                                    )
                                 })}
                              </div>
                              <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                 {entries.map(([k, count]) => (
                                    <li key={k} className="flex justify-between gap-2">
                                       <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                                       <span>
                                          {count.toLocaleString()}
                                          {total ? ` (${((count / total) * 100).toFixed(1)}%)` : ''}
                                       </span>
                                    </li>
                                 ))}
                              </ul>
                           </>
                        ) : (
                           <div className="flex flex-wrap gap-1.5">
                              {entries.map(([k, count]) => (
                                 <span
                                    key={k}
                                    className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs capitalize"
                                 >
                                    {k.replace(/_/g, ' ')}{' '}
                                    <span className="font-mono font-medium text-foreground">{count}</span>
                                 </span>
                              ))}
                           </div>
                        )}
                     </div>
                  )
               })
            )}
         </div>
      </Card>
   )
}
