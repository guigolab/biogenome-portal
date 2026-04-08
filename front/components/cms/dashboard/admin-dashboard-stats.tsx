'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'

import { TILE_META, orderedEntries } from '@/components/cms/dashboard/dashboard-stats-shared'
import { useOrganismFieldStats } from '@/components/cms/dashboard/use-organism-field-stats'

type Props = {
   rawStats: { key: DataModels; count: number }[]
}

function StackedBarLegend({
   field,
   data,
}: {
   field: 'goat_status' | 'insdc_status'
   data: Record<string, number>
}) {
   const entries = orderedEntries(data, field)
   const total = entries.reduce((s, [, c]) => s + c, 0)
   return (
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
   )
}

function TargetChips({ data }: { data: Record<string, number> }) {
   const entries = orderedEntries(data, 'target_list_status')
   if (entries.length === 0) return null
   return (
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
   )
}

export function AdminDashboardStats({ rawStats }: Props) {
   const { data: fieldStats, loading } = useOrganismFieldStats()

   const goat = fieldStats?.goat_status
   const target = fieldStats?.target_list_status
   const insdc = fieldStats?.insdc_status

   return (
      <div className="grid gap-4 lg:grid-cols-3">
         <Card className="overflow-hidden rounded-xl border-border/80 shadow-sm lg:col-span-3">
            <CardHeader className="pb-2">
               <CardTitle className="text-base">Catalog counts</CardTitle>
               <CardDescription>Records indexed for this portal.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
               <div className="flex flex-wrap rounded-lg border border-border">
                  {rawStats.map((stat) => {
                     const meta = TILE_META[stat.key] ?? {
                        label: stat.key,
                        className: 'border-border bg-muted/30',
                     }
                     return (
                        <div
                           key={stat.key}
                           className={cn(
                              'min-w-[120px] flex-1 border-b border-border px-3 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0',
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
            </CardContent>
         </Card>

         <Card className="rounded-xl border-border/80 shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
               <CardTitle className="text-base">GoaT and target list</CardTitle>
               <CardDescription>Pipeline progress and target list assignment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
               {loading ? (
                  <div className="space-y-2">
                     <Skeleton className="h-3 w-full rounded-full" />
                     <Skeleton className="h-3 w-4/5 rounded-full" />
                  </div>
               ) : (
                  <>
                     {goat && Object.keys(goat).length > 0 ? (
                        <div className="space-y-2">
                           <p className="text-sm font-medium">GoaT status</p>
                           <StackedBarLegend field="goat_status" data={goat} />
                        </div>
                     ) : null}
                     {target && Object.keys(target).length > 0 ? (
                        <div className="space-y-2">
                           <p className="text-sm font-medium">Target list</p>
                           <TargetChips data={target} />
                        </div>
                     ) : null}
                     {!loading &&
                     (!goat || Object.keys(goat).length === 0) &&
                     (!target || Object.keys(target).length === 0) ? (
                        <p className="text-sm text-muted-foreground">No GoaT or target list data.</p>
                     ) : null}
                  </>
               )}
            </CardContent>
         </Card>

         <Card className="rounded-xl border-border/80 shadow-sm">
            <CardHeader className="pb-2">
               <CardTitle className="text-base">INSDC submission</CardTitle>
               <CardDescription>Submission pipeline across organisms.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
               {loading ? (
                  <div className="space-y-2">
                     <Skeleton className="h-3 w-full rounded-full" />
                     <Skeleton className="h-3 w-4/5 rounded-full" />
                  </div>
               ) : insdc && Object.keys(insdc).length > 0 ? (
                  <div className="space-y-2">
                     <StackedBarLegend field="insdc_status" data={insdc} />
                  </div>
               ) : (
                  <p className="text-sm text-muted-foreground">No INSDC status data.</p>
               )}
            </CardContent>
         </Card>
      </div>
   )
}
