'use client'

import Link from 'next/link'
import { FlaskConical, LayoutGrid, Plus, Trash2, Upload, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AdminDashboardStats } from '@/components/cms/dashboard/admin-dashboard-stats'
import { DeleteRequestsModule } from '@/components/cms/dashboard/delete-requests-module'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePortalConfig } from '@/contexts/portal-context'
import { fetchTaxon, getRootTaxid } from '@/lib/api/taxon'
import { cmsGetUserRelatedData } from '@/lib/cms/services/auth'
import type { DataModels } from '@/lib/portal/types'
import type { PortalStatRow } from '@/lib/portal/taxonNodeStats'
import { taxonNodeToPortalStats } from '@/lib/portal/taxonNodeStats'
import { useCmsAuthStore } from '@/stores/cms-auth-store'
import { useCmsDrawerStore } from '@/stores/cms-drawer-store'

/** Keeps tab panels from collapsing when switching tabs (avoids jarring scroll jumps). */
const DASHBOARD_TAB_PANEL_CLASS = 'mt-0 min-h-[min(72vh,52rem)] outline-none'

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
               <Button asChild size="sm" variant="secondary" className="gap-2">
                  <Link href="/admin/publish-biosample">
                     <FlaskConical className="h-4 w-4" />
                     Submit biosample
                  </Link>
               </Button>
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

         {isAdmin && !statsLoading ? <AdminDashboardStats rawStats={rawStats} /> : null}
         {isAdmin && statsLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-muted/60" aria-hidden />
         ) : null}

         {isAdmin ? (
            <Tabs defaultValue="species" className="gap-4">
               <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/80 p-1 sm:w-auto">
                  <TabsTrigger value="species" className="gap-1.5 rounded-lg px-3 py-2">
                     <LayoutGrid className="h-4 w-4" />
                     Species
                  </TabsTrigger>
                  <TabsTrigger value="biosamples" className="gap-1.5 rounded-lg px-3 py-2">
                     <FlaskConical className="h-4 w-4" />
                     Biosamples
                  </TabsTrigger>
                  <TabsTrigger value="users" className="gap-1.5 rounded-lg px-3 py-2">
                     <Users className="h-4 w-4" />
                     Users
                  </TabsTrigger>
                  <TabsTrigger value="deletions" className="gap-1.5 rounded-lg px-3 py-2">
                     <Trash2 className="h-4 w-4" />
                     Pending deletions
                  </TabsTrigger>
               </TabsList>
               <TabsContent value="species" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <SpeciesOverviewModule variant="tabPanel" />
               </TabsContent>
               <TabsContent value="biosamples" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <SubmittedBiosamplesModule hasEnaTemplate={enaTemplate} variant="tabPanel" />
               </TabsContent>
               <TabsContent value="users" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <UsersModule variant="tabPanel" />
               </TabsContent>
               <TabsContent value="deletions" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <DeleteRequestsModule variant="tabPanel" />
               </TabsContent>
            </Tabs>
         ) : (
            <Tabs defaultValue="species" className="gap-4">
               <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/80 p-1 sm:w-auto">
                  <TabsTrigger value="species" className="gap-1.5 rounded-lg px-3 py-2">
                     Species
                  </TabsTrigger>
                  <TabsTrigger value="biosamples" className="gap-1.5 rounded-lg px-3 py-2">
                     Biosamples
                  </TabsTrigger>
                  <TabsTrigger value="sankey" className="gap-1.5 rounded-lg px-3 py-2">
                     Species ↔ biosamples
                  </TabsTrigger>
               </TabsList>
               <TabsContent value="species" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <SpeciesOverviewModule variant="tabPanel" />
               </TabsContent>
               <TabsContent value="biosamples" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <SubmittedBiosamplesModule hasEnaTemplate={enaTemplate} variant="tabPanel" />
               </TabsContent>
               <TabsContent value="sankey" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <SpeciesBiosampleSankeyModule hasEnaTemplate={enaTemplate} variant="tabPanel" />
               </TabsContent>
            </Tabs>
         )}
      </div>
   )
}
