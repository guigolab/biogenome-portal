'use client'

import { FlaskConical, Layers, Trash2, UserX, Users } from 'lucide-react'
import { useMemo } from 'react'

import { DashboardModuleHeader } from '@/components/cms/dashboard/dashboard-module-header'
import { OverviewStatTile } from '@/components/cms/dashboard/overview-stat-tile'
import { useActiveTabOverviewStats } from '@/components/cms/dashboard/use-active-tab-overview-stats'
import { GoatPipelineTracker } from '@/components/status/goat-pipeline-tracker'
import { Card, CardContent } from '@/components/ui/card'
import { usePortalConfig } from '@/contexts/portal-context'
import { buildGoatTrackerStages } from '@/lib/goatPipelineTracker'
import { cmsGetAdminOverviewStats } from '@/lib/cms/services/auth'
import { useCmsAuthStore } from '@/stores/cms-auth-store'

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

export function AdminOverviewStatsModule({ active }: { active: boolean }) {
   const { config } = usePortalConfig()
   const userName = useCmsAuthStore((s) => s.userName)
   const general = config?.general as Record<string, unknown> | undefined
   const hasGoat = Boolean(general?.goat)

   const { data, loading } = useActiveTabOverviewStats(active, cmsGetAdminOverviewStats)

   const goatStats = data?.goat_status
   const targetListStats = data?.target_list_status ?? null

   const { stages: goatTrackerStages, total: pipelineTotal } = useMemo(
      () => buildGoatTrackerStages(goatStats),
      [goatStats],
   )

   const pipelineLoading = hasGoat && loading

   const values = useMemo(
      () => ({
         assigned: data?.assigned_species ?? null,
         unassigned: data?.unassigned_species ?? null,
         mine: data?.my_submitted_biosamples ?? null,
         all: data?.all_submitted_biosamples ?? null,
         deletions: data?.pending_deletion_requests ?? null,
      }),
      [data],
   )

   return (
      <Card className="gap-3 border-border/80 shadow-sm">
         <DashboardModuleHeader description="Portal-wide counts and GoaT pipeline summary." />
         <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
               {TILES.map((tile) => (
                  <OverviewStatTile
                     key={tile.key}
                     label={tile.label}
                     Icon={tile.Icon}
                     value={tile.key === 'mine' && !userName ? null : values[tile.key]}
                     loading={loading}
                     highlight={tile.key === 'assigned'}
                  />
               ))}
            </div>

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
         </CardContent>
      </Card>
   )
}
