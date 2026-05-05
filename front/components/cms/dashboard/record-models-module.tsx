'use client'

import { ArrowRight, Dna, FlaskConical, FolderOpen, ListOrdered, Loader2, Plus, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DataModels } from '@/lib/portal/types'
import type { PortalStatRow } from '@/lib/portal/taxonNodeStats'
import { cmsGetItems, cmsGetUserSamples } from '@/lib/cms/services/auth'
import { useCmsAuthStore } from '@/stores/cms-auth-store'
import { useCmsDrawerStore } from '@/stores/cms-drawer-store'

const LIMIT = 5

type TabMeta = {
   label: string
   icon: LucideIcon
   columns: string[]
   createLabel?: string
}

const TAB_META: Record<string, Omit<TabMeta, never>> = {
   biosamples: {
      label: 'Biosamples',
      icon: FlaskConical,
      columns: ['accession', 'scientific_name'],
      createLabel: 'Import biosample',
   },
   reads: {
      label: 'Reads',
      icon: FolderOpen,
      columns: ['run_accession', 'scientific_name'],
      createLabel: 'Import reads',
   },
   assemblies: {
      label: 'Assemblies',
      icon: Dna,
      columns: ['accession', 'assembly_name', 'scientific_name'],
      createLabel: 'Import assembly',
   },
   local_samples: {
      label: 'Local samples',
      icon: FlaskConical,
      columns: ['sample_id', 'scientific_name'],
   },
   annotations: {
      label: 'Annotations',
      icon: ListOrdered,
      columns: ['name', 'scientific_name'],
      createLabel: 'Create annotation',
   },
}

function cellValue(row: Record<string, unknown>, col: string): string {
   const val = row[col] ?? (row.metadata as Record<string, unknown> | undefined)?.[col]
   if (val === undefined || val === null) return '—'
   if (Array.isArray(val)) return val.join(', ')
   return String(val)
}

export function RecordModelsModule({ stats }: { stats: PortalStatRow[] }) {
   const userName = useCmsAuthStore((s) => s.userName)
   const isAdmin = useCmsAuthStore((s) => s.userRole === 'Admin')
   const openDrawer = useCmsDrawerStore((s) => s.open)

   const tabs = useMemo(() => {
      return stats
         .filter(({ key }) => key in TAB_META && key !== 'organisms')
         .map(({ key, count }) => ({
            key,
            count,
            ...TAB_META[key],
         }))
   }, [stats])

   const [activeTab, setActiveTab] = useState<DataModels | ''>('')
   const [items, setItems] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(false)
   const [page, setPage] = useState(1)

   useEffect(() => {
      const first = tabs[0]?.key
      if (first && (!activeTab || !tabs.some((t) => t.key === activeTab))) {
         setActiveTab(first)
         setPage(1)
      }
   }, [tabs, activeTab])

   const fetchTabData = useCallback(async () => {
      if (!activeTab) return
      setLoading(true)
      try {
         const params = { limit: LIMIT, offset: (page - 1) * LIMIT }
         if (activeTab === 'local_samples' && !isAdmin && userName) {
            const body = await cmsGetUserSamples(userName, params)
            setItems(body.data ?? [])
            setTotal(body.total ?? 0)
         } else {
            const body = await cmsGetItems(activeTab as DataModels, params)
            setItems(body.data ?? [])
            setTotal(body.total ?? 0)
         }
      } catch {
         setItems([])
         setTotal(0)
      } finally {
         setLoading(false)
      }
   }, [activeTab, isAdmin, userName, page])

   useEffect(() => {
      void fetchTabData()
   }, [fetchTabData])

   function openCreateForTab(key: DataModels) {
      if (key === 'biosamples') openDrawer({ panel: 'insdc', insdcImportModel: 'biosamples' })
      else if (key === 'reads') openDrawer({ panel: 'insdc', insdcImportModel: 'reads' })
      else if (key === 'assemblies') openDrawer({ panel: 'insdc', insdcImportModel: 'assemblies' })
      else if (key === 'annotations') openDrawer({ panel: 'annotation' })
   }

   if (tabs.length === 0) return null

   return (
      <Card className="border-border/80 shadow-sm">
         <CardHeader>
            <CardTitle>{isAdmin ? 'Data records' : 'My data records'}</CardTitle>
            <CardDescription>Browse records by type. Use a tab to switch models.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
            <Tabs
               value={activeTab || tabs[0].key}
               onValueChange={(v) => {
                  setActiveTab(v as DataModels)
                  setPage(1)
               }}
            >
               <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
                  {tabs.map((tab) => {
                     const Icon = tab.icon
                     return (
                        <TabsTrigger
                           key={tab.key}
                           value={tab.key}
                           className="gap-1.5 px-2 py-1.5 text-xs sm:text-sm"
                        >
                           <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                           <span className="hidden sm:inline">{tab.label}</span>
                           <span className="rounded-full bg-background/80 px-1.5 py-0 text-[10px] font-semibold tabular-nums sm:text-xs">
                              {tab.count}
                           </span>
                        </TabsTrigger>
                     )
                  })}
               </TabsList>

               {tabs.map((tab) => (
                  <TabsContent key={tab.key} value={tab.key} className="mt-4 space-y-4">
                     {loading && activeTab === tab.key ? (
                        <div className="flex justify-center py-12 text-muted-foreground">
                           <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                     ) : items.length === 0 && activeTab === tab.key ? (
                        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
                           <tab.icon className="h-10 w-10 text-muted-foreground/50" />
                           <p className="text-sm text-muted-foreground">No {tab.label.toLowerCase()} yet.</p>
                           {tab.createLabel ? (
                              <Button size="sm" className="gap-2" onClick={() => openCreateForTab(tab.key)}>
                                 <Plus className="h-4 w-4" />
                                 {tab.createLabel}
                              </Button>
                           ) : null}
                        </div>
                     ) : activeTab === tab.key ? (
                        <>
                           <div className="rounded-md border border-border">
                              <Table>
                                 <TableHeader>
                                    <TableRow>
                                       {tab.columns.map((col) => (
                                          <TableHead key={col} className="capitalize">
                                             {col.split('_').join(' ')}
                                          </TableHead>
                                       ))}
                                       <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                    {items.map((row, i) => (
                                       <TableRow key={i}>
                                          {tab.columns.map((col) => (
                                             <TableCell key={col} className="max-w-[200px] truncate font-mono text-sm">
                                                {cellValue(row, col)}
                                             </TableCell>
                                          ))}
                                          <TableCell className="text-right">
                                             <Button variant="ghost" size="sm" className="gap-1" asChild>
                                                <Link href="/admin">
                                                   Open dashboard
                                                   <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>
                                             </Button>
                                          </TableCell>
                                       </TableRow>
                                    ))}
                                 </TableBody>
                              </Table>
                           </div>
                           {total > LIMIT ? (
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                 <span>
                                    Page {page} / {Math.ceil(total / LIMIT)}
                                 </span>
                                 <div className="flex gap-2">
                                    <Button
                                       variant="outline"
                                       size="sm"
                                       disabled={page <= 1}
                                       onClick={() => setPage((p) => p - 1)}
                                    >
                                       Previous
                                    </Button>
                                    <Button
                                       variant="outline"
                                       size="sm"
                                       disabled={page >= Math.ceil(total / LIMIT)}
                                       onClick={() => setPage((p) => p + 1)}
                                    >
                                       Next
                                    </Button>
                                 </div>
                              </div>
                           ) : null}
                        </>
                     ) : null}
                  </TabsContent>
               ))}
            </Tabs>
         </CardContent>
      </Card>
   )
}
