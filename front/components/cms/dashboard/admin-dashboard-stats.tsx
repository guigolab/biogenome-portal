'use client'

import { FlaskConical, Layers, Trash2, UserX, Users } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'

import { GoatPipelineTracker } from '@/components/status/goat-pipeline-tracker'
import { Card, CardContent } from '@/components/ui/card'
import { usePortalConfig } from '@/contexts/portal-context'
import { buildGoatTrackerStages } from '@/lib/goatPipelineTracker'
import { cn } from '@/lib/utils'
import { useCmsAuthStore } from '@/stores/cms-auth-store'

import { useAdminDashboardCmsStats } from '@/components/cms/dashboard/use-admin-dashboard-cms-stats'
import { useOrganismFieldStats } from '@/components/cms/dashboard/use-organism-field-stats'

const CMS_OVERVIEW_TITLE = 'CMS overview'
const CMS_OVERVIEW_DESCRIPTION =
   'Assignments, submissions, and pending requests for this portal.'
const GOAT_DISABLED = 'GoaT pipeline overview is disabled for this portal.'

const TILES: {
   key: 'assigned' | 'unassigned' | 'mine' | 'all' | 'deletions'
   label: string
   Icon: typeof Users
}[] = [
   { key: 'assigned', label: 'Species with assigned users', Icon: Users },
   { key: 'unassigned', label: 'Species without assigned user', Icon: UserX },
   { key: 'mine', label: 'Your submitted biosamples', Icon: FlaskConical },
   { key: 'all', label: 'All submitted biosamples', Icon: Layers },
   { key: 'deletions', label: 'Pending organism deletions', Icon: Trash2 },
]

export function AdminDashboardStats() {
   const { config } = usePortalConfig()
   const userName = useCmsAuthStore((s) => s.userName)
   const general = config?.general as Record<string, unknown> | undefined
   const hasGoat = Boolean(general?.goat)

   const cmsStats = useAdminDashboardCmsStats(userName)
   const { data: fieldStats, loading: fieldStatsLoading } = useOrganismFieldStats({ enabled: hasGoat })

   const goatStats = fieldStats?.goat_status
   const targetListStats = fieldStats?.target_list_status ?? null

   const { stages: goatTrackerStages, total: pipelineTotal } = useMemo(
      () => buildGoatTrackerStages(goatStats),
      [goatStats],
   )

   const pipelineLoading = hasGoat && fieldStatsLoading

   const values = useMemo(
      () => ({
         assigned: cmsStats.assignedSpecies,
         unassigned: cmsStats.unassignedSpecies,
         mine: cmsStats.mySubmittedBiosamples,
         all: cmsStats.allSubmittedBiosamples,
         deletions: cmsStats.pendingDeletionRequests,
      }),
      [cmsStats],
   )

   function formatTileValue(
      key: (typeof TILES)[number]['key'],
   ): { node: ReactNode; highlight: boolean } {
      if (key === 'mine' && !userName) {
         return { node: <span className="text-muted-foreground">—</span>, highlight: false }
      }
      const v = values[key]
      if (v === null) {
         return { node: <span className="text-muted-foreground">—</span>, highlight: false }
      }
      return {
         node: <span>{v.toLocaleString()}</span>,
         highlight: key === 'assigned',
      }
   }

   return (
      <div className="space-y-8">
         <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/70 via-muted/45 to-muted/25 dark:from-muted/25 dark:via-muted/15 dark:to-muted/5">
            <div
               className="pointer-events-none absolute inset-0 rounded-[inherit] bg-primary/[0.07] [mask-image:radial-gradient(ellipse_100%_75%_at_50%_-35%,black_40%,transparent_70%)] dark:bg-primary/[0.11]"
               aria-hidden
            />
            <div className="relative px-4 py-10 sm:px-6">
               <h2 className="mb-1 text-center text-lg font-semibold tracking-tight text-foreground">
                  {CMS_OVERVIEW_TITLE}
               </h2>
               <p className="mb-8 text-center text-sm text-muted-foreground">{CMS_OVERVIEW_DESCRIPTION}</p>
               {cmsStats.loading ? (
                  <p className="text-center text-muted-foreground">Loading…</p>
               ) : (
                  <div className="mx-auto grid w-full max-w-5xl justify-items-center gap-6 [grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
                     {TILES.map((tile) => {
                        const { node, highlight } = formatTileValue(tile.key)
                        const Icon = tile.Icon
                        return (
                           <div key={tile.key} className="text-center">
                              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                 <Icon className="h-6 w-6 text-primary" aria-hidden />
                              </div>
                              <div
                                 className={cn(
                                    'mb-1 text-3xl font-bold tabular-nums md:text-4xl',
                                    highlight ? 'text-primary' : 'text-foreground',
                                 )}
                              >
                                 {node}
                              </div>
                              <div className="text-sm text-muted-foreground">{tile.label}</div>
                           </div>
                        )
                     })}
                  </div>
               )}
            </div>
         </section>

         {hasGoat ? (
            <Card className="rounded-xl border-border/80 shadow-sm">
               <CardContent className="pt-6">
                  <GoatPipelineTracker
                     copyMode="en"
                     stages={goatTrackerStages}
                     totalSpecies={pipelineTotal}
                     loading={pipelineLoading}
                     targetListStats={targetListStats}
                  />
               </CardContent>
            </Card>
         ) : (
            <p className="text-sm text-muted-foreground">{GOAT_DISABLED}</p>
         )}
      </div>
   )
}
