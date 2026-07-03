'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { FlaskConical, Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DashboardModuleHeader } from '@/components/cms/dashboard/dashboard-module-header'
import { DashboardModulePagination } from '@/components/cms/dashboard/dashboard-module-pagination'
import { SubmittedBiosampleDetailDialog } from '@/components/cms/dashboard/submitted-biosample-detail-dialog'
import { cmsGetSubmittedBioSamples } from '@/lib/cms/services/auth'
import { cn } from '@/lib/utils'
import { useCmsAuthStore } from '@/stores/cms-auth-store'

const LIMIT = 6

export function SubmittedBiosamplesModule({ hasEnaTemplate }: { hasEnaTemplate: boolean }) {
   const userName = useCmsAuthStore((s) => s.userName)
   const isAdmin = useCmsAuthStore((s) => s.userRole === 'Admin')

   const [items, setItems] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(true)
   const [filterDraft, setFilterDraft] = useState('')
   const [filter, setFilter] = useState('')
   const [page, setPage] = useState(1)
   const [viewMode, setViewMode] = useState<'filtered' | 'all'>(isAdmin ? 'all' : 'filtered')
   const [detailAccession, setDetailAccession] = useState<string | null>(null)

   useEffect(() => {
      const t = setTimeout(() => {
         setFilter(filterDraft)
         setPage(1)
      }, 350)
      return () => clearTimeout(t)
   }, [filterDraft])

   const fetchData = useCallback(async () => {
      setLoading(true)
      try {
         const query: Record<string, string | number> = {
            filter,
            limit: LIMIT,
            offset: (page - 1) * LIMIT,
         }
         if (!isAdmin || viewMode === 'filtered') query.user = userName
         const { data, total: t } = await cmsGetSubmittedBioSamples(query)
         setItems(data ?? [])
         setTotal(t ?? 0)
      } catch {
         setItems([])
         setTotal(0)
      } finally {
         setLoading(false)
      }
   }, [isAdmin, userName, filter, page, viewMode])

   useEffect(() => {
      void fetchData()
   }, [fetchData])

   return (
      <Card className="gap-3 border-border/80 shadow-sm">
         <DashboardModuleHeader
            description={
               isAdmin
                  ? 'All biosamples submitted to EBI across curators. Use Mine / All to change scope.'
                  : 'Biosamples you have submitted to EBI BioSamples.'
            }
            action={
               hasEnaTemplate ? (
                  <Button size="sm" asChild className="gap-2">
                     <Link href="/admin/publish-biosample">
                        <Plus className="h-4 w-4" />
                        Submit
                     </Link>
                  </Button>
               ) : null
            }
         />
         <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
               <Input
                  placeholder="Filter by name or accession…"
                  value={filterDraft}
                  onChange={(e) => setFilterDraft(e.target.value)}
                  className="max-w-md"
               />
               {isAdmin ? (
                  <ToggleGroup
                     type="single"
                     value={viewMode}
                     onValueChange={(v) => {
                        if (v === 'filtered' || v === 'all') {
                           setViewMode(v)
                           setPage(1)
                        }
                     }}
                  >
                     <ToggleGroupItem value="filtered">Mine</ToggleGroupItem>
                     <ToggleGroupItem value="all">All</ToggleGroupItem>
                  </ToggleGroup>
               ) : null}
            </div>
            {loading ? (
               <div className="flex justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
               </div>
            ) : items.length === 0 ? (
               <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                  <FlaskConical className="h-10 w-10 opacity-40" />
                  <p className="text-sm">No biosamples found.</p>
                  {hasEnaTemplate ? (
                     <Button size="sm" asChild>
                        <Link href="/admin/publish-biosample">Submit biosample</Link>
                     </Button>
                  ) : null}
               </div>
            ) : (
               <div className="rounded-md border border-border">
                  <Table>
                     <TableHeader>
                        <TableRow>
                           <TableHead>Species</TableHead>
                           <TableHead>Sample</TableHead>
                           <TableHead>Accession</TableHead>
                           {isAdmin ? <TableHead>Submitted by</TableHead> : null}
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {items.map((item) => {
                           const acc = item.accession != null ? String(item.accession) : ''
                           return (
                              <TableRow
                                 key={String(item.accession ?? item.name)}
                                 className={cn(acc && 'cursor-pointer hover:bg-muted/50')}
                                 tabIndex={acc ? 0 : undefined}
                                 aria-label={acc ? `View details for biosample ${acc}` : undefined}
                                 onClick={() => {
                                    if (acc) setDetailAccession(acc)
                                 }}
                                 onKeyDown={(e) => {
                                    if (!acc) return
                                    if (e.key === 'Enter' || e.key === ' ') {
                                       e.preventDefault()
                                       setDetailAccession(acc)
                                    }
                                 }}
                              >
                              <TableCell className="italic">
                                 {String(item.scientific_name ?? '—')}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                 {String(item.name ?? '—')}
                              </TableCell>
                              <TableCell>
                                 {item.accession ? (
                                    <a
                                       href={`https://www.ebi.ac.uk/biosamples/samples/${item.accession}`}
                                       target="_blank"
                                       rel="noreferrer"
                                       className="text-primary underline-offset-4 hover:underline"
                                       onClick={(e) => e.stopPropagation()}
                                    >
                                       {String(item.accession)}
                                    </a>
                                 ) : (
                                    '—'
                                 )}
                              </TableCell>
                              {isAdmin ? (
                                 <TableCell className="text-muted-foreground">
                                    {String(item.user ?? '—')}
                                 </TableCell>
                              ) : null}
                           </TableRow>
                           )
                        })}
                     </TableBody>
                  </Table>
               </div>
            )}
            {total > LIMIT ? (
               <DashboardModulePagination
                  page={page}
                  totalPages={Math.ceil(total / LIMIT)}
                  onPrevious={() => setPage((p) => p - 1)}
                  onNext={() => setPage((p) => p + 1)}
               />
            ) : null}
         </CardContent>
         <SubmittedBiosampleDetailDialog
            accession={detailAccession}
            open={detailAccession != null}
            onOpenChange={(o) => {
               if (!o) setDetailAccession(null)
            }}
         />
      </Card>
   )
}
