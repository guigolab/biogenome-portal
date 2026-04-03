'use client'

import Link from 'next/link'
import { FlaskConical, Plus, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'

import { DashboardStatStrip } from '@/components/cms/dashboard/dashboard-stat-strip'
import { DeleteRequestsModule } from '@/components/cms/dashboard/delete-requests-module'
import { RecordModelsModule } from '@/components/cms/dashboard/record-models-module'
import { SpeciesBiosampleSankeyModule } from '@/components/cms/dashboard/species-biosample-sankey-module'
import { SpeciesOverviewModule } from '@/components/cms/dashboard/species-overview-module'
import { SubmittedBiosamplesModule } from '@/components/cms/dashboard/submitted-biosamples-module'
import { UsersModule } from '@/components/cms/dashboard/users-module'
import { Button } from '@/components/ui/button'
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePortalConfig } from '@/contexts/portal-context'
import { fetchTaxon, getRootTaxid } from '@/lib/api/taxon'
import { cmsGetUserRelatedData } from '@/lib/cms/services/auth'
import type { DataModels } from '@/lib/portal/types'
import type { PortalStatRow } from '@/lib/portal/taxonNodeStats'
import { taxonNodeToPortalStats } from '@/lib/portal/taxonNodeStats'
import { useCmsAuthStore } from '@/stores/cms-auth-store'
import { useCmsDrawerStore } from '@/stores/cms-drawer-store'

export function AdminDashboardClient() {
   const { config } = usePortalConfig()
   const userRole = useCmsAuthStore((s) => s.userRole)
   const userName = useCmsAuthStore((s) => s.userName)
   const isAdmin = userRole === 'Admin'
   const openDrawer = useCmsDrawerStore((s) => s.open)

   const general = config?.general as Record<string, unknown> | undefined
   const enaTemplate = Boolean(general?.enaTemplate)
   const hasGoat = Boolean(general?.goat)

   const [rawStats, setRawStats] = useState<PortalStatRow[]>([])
   const [statsLoading, setStatsLoading] = useState(true)

   useEffect(() => {
      let cancelled = false
      ;(async () => {
         setStatsLoading(true)
         try {
            if (isAdmin) {
               const node = await fetchTaxon(getRootTaxid())
               if (!cancelled) setRawStats(taxonNodeToPortalStats(node))
            } else if (userName) {
               const data = await cmsGetUserRelatedData(userName)
               if (!cancelled) {
                  setRawStats(
                     Object.entries(data)
                        .filter(([, v]) => Boolean(v))
                        .map(([k, v]) => ({ key: k as DataModels, count: Number(v) })),
                  )
               }
            } else if (!cancelled) {
               setRawStats([])
            }
         } catch {
            if (!cancelled) setRawStats([])
         } finally {
            if (!cancelled) setStatsLoading(false)
         }
      })()
      return () => {
         cancelled = true
      }
   }, [isAdmin, userName])

   const title = isAdmin ? 'Dashboard' : 'My data'
   const description = isAdmin
      ? 'Portal overview: species, curators, imports, and requests.'
      : 'Your assigned species and submitted data.'

   return (
      <div className="space-y-8">
         <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
               <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
               <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
               <Button asChild size="sm" className="gap-2">
                  <Link href="/admin/create-organism">
                     <Plus className="h-4 w-4" />
                     Create species
                  </Link>
               </Button>
               {enaTemplate ? (
                  <Button asChild size="sm" variant="secondary" className="gap-2">
                     <Link href="/admin/publish-biosample">
                        <FlaskConical className="h-4 w-4" />
                        Submit biosample
                     </Link>
                  </Button>
               ) : null}
               {isAdmin ? (
                  <>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button size="sm" variant="outline" className="gap-2">
                              <Upload className="h-4 w-4" />
                              Import
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                           <DropdownMenuItem className="gap-2" onSelect={() => openDrawer({ panel: 'insdc' })}>
                              Import from INSDC
                           </DropdownMenuItem>
                           {hasGoat ? (
                              <DropdownMenuItem className="gap-2" onSelect={() => openDrawer({ panel: 'goat' })}>
                                 Import GoaT report
                              </DropdownMenuItem>
                           ) : null}
                           <DropdownMenuItem className="gap-2" onSelect={() => openDrawer({ panel: 'spreadsheet' })}>
                              Import spreadsheet
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button size="sm" variant="outline" className="gap-2">
                              <Plus className="h-4 w-4" />
                              Create
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                           <DropdownMenuItem className="gap-2" onSelect={() => openDrawer({ panel: 'annotation' })}>
                              Annotation
                           </DropdownMenuItem>
                           <DropdownMenuItem className="gap-2" onSelect={() => openDrawer({ panel: 'user' })}>
                              User
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </>
               ) : null}
            </div>
         </div>

         {isAdmin && !statsLoading ? <DashboardStatStrip rawStats={rawStats} /> : null}
         {isAdmin && statsLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-muted/60" aria-hidden />
         ) : null}

         {!isAdmin && enaTemplate ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
               <div className="space-y-6">
                  <SpeciesOverviewModule />
                  <SubmittedBiosamplesModule hasEnaTemplate={enaTemplate} />
               </div>
               <div className="flex min-h-[420px] flex-col lg:min-h-0">
                  <SpeciesBiosampleSankeyModule hasEnaTemplate={enaTemplate} />
               </div>
            </div>
         ) : !isAdmin ? (
            <div className="space-y-6">
               <SpeciesOverviewModule />
               {enaTemplate ? <SubmittedBiosamplesModule hasEnaTemplate={enaTemplate} /> : null}
            </div>
         ) : (
            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
               <div className="space-y-6">
                  <SpeciesOverviewModule />
                  <SubmittedBiosamplesModule hasEnaTemplate={enaTemplate} />
                  <RecordModelsModule stats={rawStats} />
               </div>
               <div className="space-y-6">
                  <UsersModule />
                  <DeleteRequestsModule />
               </div>
            </div>
         )}
      </div>
   )
}
