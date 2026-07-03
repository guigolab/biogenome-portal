'use client'

import { FlaskConical, LayoutGrid } from 'lucide-react'
import { useMemo } from 'react'

import { DashboardModuleHeader } from '@/components/cms/dashboard/dashboard-module-header'
import { OverviewStatTile } from '@/components/cms/dashboard/overview-stat-tile'
import { useActiveTabOverviewStats } from '@/components/cms/dashboard/use-active-tab-overview-stats'
import { GoatPipelineTracker } from '@/components/status/goat-pipeline-tracker'
import { Card, CardContent } from '@/components/ui/card'
import { usePortalConfig } from '@/contexts/portal-context'
import { buildGoatTrackerStages } from '@/lib/goatPipelineTracker'
import { cmsGetDataManagerOverviewStats } from '@/lib/cms/services/auth'

const GOAT_DISABLED = 'GoaT pipeline overview is disabled for this portal.'

const TILES = [
   { key: 'assigned' as const, label: 'Your assigned species', Icon: LayoutGrid },
   { key: 'biosamples' as const, label: 'Your submitted biosamples', Icon: FlaskConical },
]

export function DataManagerOverviewStatsModule({ active }: { active: boolean }) {
   const { config } = usePortalConfig()
   const general = config?.general as Record<string, unknown> | undefined
   const hasGoat = Boolean(general?.goat)

   const { data, loading } = useActiveTabOverviewStats(active, cmsGetDataManagerOverviewStats)

   const goatStats = data?.goat_status
   const targetListStats = data?.target_list_status ?? null

   const { stages: goatTrackerStages, total: pipelineTotal } = useMemo(
      () => buildGoatTrackerStages(goatStats),
      [goatStats],
   )

   const pipelineLoading = hasGoat && loading

   const assignedSpeciesCount = data?.assigned_species ?? null
   const values = useMemo(
      () => ({
         assigned: assignedSpeciesCount,
         biosamples: data?.submitted_biosamples ?? null,
      }),
      [assignedSpeciesCount, data],
   )

   return (
      <Card className="gap-3 border-border/80 shadow-sm">
         <DashboardModuleHeader description="Your assigned species, submissions, and GoaT pipeline summary." />
         <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
               {TILES.map((tile) => (
                  <OverviewStatTile
                     key={tile.key}
                     label={tile.label}
                     Icon={tile.Icon}
                     value={values[tile.key]}
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
                        totalSpecies={assignedSpeciesCount ?? pipelineTotal}
                        loading={pipelineLoading}
                        targetListStats={targetListStats}
                        helpText="Counts by GoaT sequencing stage for your assigned species."
                        pipelineTotalText="{count} assigned species."
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
