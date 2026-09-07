'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
   ChevronDown,
   FlaskConical,
   History,
   IdCard,
   LayoutDashboard,
   LayoutGrid,
   Plus,
   Trash2,
   User,
   Users,
} from 'lucide-react'

import { AdminOverviewStatsModule } from '@/components/cms/dashboard/admin-overview-stats-module'
import { DataManagerOverviewStatsModule } from '@/components/cms/dashboard/data-manager-overview-stats-module'
import { DeleteRequestsModule } from '@/components/cms/dashboard/delete-requests-module'
import { OrganismAuditLogsModule } from '@/components/cms/dashboard/organism-audit-logs-module'
import { OrganismPrincipalsModule } from '@/components/cms/dashboard/organism-principals-module'
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
import { useCmsAuthStore } from '@/stores/cms-auth-store'
import { useCmsDrawerStore } from '@/stores/cms-drawer-store'

/** Keeps tab panels from collapsing when switching tabs (avoids jarring scroll jumps). */
const DASHBOARD_TAB_PANEL_CLASS = 'mt-0 min-h-[min(72vh,52rem)] outline-none'

export function AdminDashboardClient() {
   const { config } = usePortalConfig()
   const userRole = useCmsAuthStore((s) => s.userRole)
   const isAdmin = userRole === 'Admin'
   const openDrawer = useCmsDrawerStore((s) => s.open)
   const [tab, setTab] = useState('overview')

   const general = config?.general as Record<string, unknown> | undefined
   const enaTemplate = Boolean(general?.enaTemplate)

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
               {isAdmin ? (
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button type="button" size="sm" className="gap-2">
                           Actions
                           <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem asChild>
                           <Link href="/admin/create-organism" className="gap-2">
                              <Plus className="h-4 w-4" />
                              Create species
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link href="/admin/publish-biosample" className="gap-2">
                              <FlaskConical className="h-4 w-4" />
                              Submit biosample
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           className="gap-2"
                           onClick={() => openDrawer({ panel: 'user' })}
                        >
                           <User className="h-4 w-4" />
                           Create user
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           className="gap-2"
                           onClick={() => openDrawer({ panel: 'principal' })}
                        >
                           <IdCard className="h-4 w-4" />
                           Create principal
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               ) : (
                  <>
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
                  </>
               )}
            </div>
         </div>

         {isAdmin ? (
            <Tabs value={tab} onValueChange={setTab} className="gap-4">
               <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/80 p-1 sm:w-auto">
                  <TabsTrigger value="overview" className="gap-1.5 rounded-lg px-3 py-2">
                     <LayoutDashboard className="h-4 w-4" />
                     Overview
                  </TabsTrigger>
                  <TabsTrigger value="species" className="gap-1.5 rounded-lg px-3 py-2">
                     <LayoutGrid className="h-4 w-4" />
                     Species
                  </TabsTrigger>
                  <TabsTrigger value="biosamples" className="gap-1.5 rounded-lg px-3 py-2">
                     <FlaskConical className="h-4 w-4" />
                     Submitted biosamples
                  </TabsTrigger>
                  <TabsTrigger value="users" className="gap-1.5 rounded-lg px-3 py-2">
                     <Users className="h-4 w-4" />
                     Users
                  </TabsTrigger>
                  <TabsTrigger value="principals" className="gap-1.5 rounded-lg px-3 py-2">
                     <IdCard className="h-4 w-4" />
                     Principals
                  </TabsTrigger>
                  <TabsTrigger value="deletions" className="gap-1.5 rounded-lg px-3 py-2">
                     <Trash2 className="h-4 w-4" />
                     Pending deletions
                  </TabsTrigger>
                  <TabsTrigger value="audit-logs" className="gap-1.5 rounded-lg px-3 py-2">
                     <History className="h-4 w-4" />
                     Audit logs
                  </TabsTrigger>
               </TabsList>
               <TabsContent value="overview" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <AdminOverviewStatsModule active={tab === 'overview'} />
               </TabsContent>
               <TabsContent value="species" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <SpeciesOverviewModule />
               </TabsContent>
               <TabsContent value="biosamples" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <SubmittedBiosamplesModule hasEnaTemplate={enaTemplate} />
               </TabsContent>
               <TabsContent value="users" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <UsersModule />
               </TabsContent>
               <TabsContent value="principals" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <OrganismPrincipalsModule />
               </TabsContent>
               <TabsContent value="deletions" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <DeleteRequestsModule />
               </TabsContent>
               <TabsContent value="audit-logs" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <OrganismAuditLogsModule />
               </TabsContent>
            </Tabs>
         ) : (
            <Tabs value={tab} onValueChange={setTab} className="gap-4">
               <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/80 p-1 sm:w-auto">
                  <TabsTrigger value="overview" className="gap-1.5 rounded-lg px-3 py-2">
                     <LayoutDashboard className="h-4 w-4" />
                     Overview
                  </TabsTrigger>
                  <TabsTrigger value="species" className="gap-1.5 rounded-lg px-3 py-2">
                     <LayoutGrid className="h-4 w-4" />
                     Species
                  </TabsTrigger>
                  <TabsTrigger value="biosamples" className="gap-1.5 rounded-lg px-3 py-2">
                     <FlaskConical className="h-4 w-4" />
                     Submitted biosamples
                  </TabsTrigger>
               </TabsList>
               <TabsContent value="overview" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <DataManagerOverviewStatsModule active={tab === 'overview'} />
               </TabsContent>
               <TabsContent value="species" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <SpeciesOverviewModule />
               </TabsContent>
               <TabsContent value="biosamples" className={DASHBOARD_TAB_PANEL_CLASS}>
                  <SubmittedBiosamplesModule hasEnaTemplate={enaTemplate} />
               </TabsContent>
            </Tabs>
         )}
      </div>
   )
}
