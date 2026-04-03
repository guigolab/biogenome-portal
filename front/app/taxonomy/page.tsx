'use client'

import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { D3RadialTree } from '@/components/d3-radial-tree'
import { SpeciesCard } from '@/components/species-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import { downloadOrganismsTsv, fetchOrganisms } from '@/lib/api/organisms'
import { getFilteredNestedRoot, useTaxonomyTreeStore } from '@/lib/stores/taxonomy-tree-store'
import { findSubtree } from '@/lib/taxonomy/treeFilter'
import { branchLegendFromHierarchy } from '@/lib/taxonomy/treeBranchLegend'
import { buildHierarchyFromNested } from '@/lib/taxonomy/treeHierarchy'
import type { NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'
import { formatRankFilterLabel, TREE_RANK_FILTER_OPTIONS } from '@/lib/taxonomy/treeRankOptions'
import type { TreeTableRow } from '@/lib/taxonomy/treeTableTypes'
import { cn } from '@/lib/utils'
import { ArrowLeft, ChevronRight, Download, Hash, Layers, Loader2, TreePine } from 'lucide-react'

const PAGE_SIZE = 21

const SPECIES_EXPORT_FIELDS = ['scientific_name', 'taxid', 'insdc_common_name'] as const

function pathFromRowMap(rowByTaxid: Map<string, TreeTableRow>, taxid: string): TreeTableRow[] {
   const path: TreeTableRow[] = []
   let cur: string | null = taxid
   const seen = new Set<string>()
   while (cur && !seen.has(cur)) {
      seen.add(cur)
      const row = rowByTaxid.get(cur)
      if (!row) break
      path.unshift(row)
      cur = row.parent_taxid
   }
   return path
}

function rankBadgeClass(rank: string, rankColors: Record<string, string>): string {
   const key = Object.keys(rankColors).find((k) => k.toLowerCase() === rank.trim().toLowerCase())
   return (key && rankColors[key]) || 'bg-secondary'
}

function formatRankLabel(rank: string): string {
   const r = rank.trim().toLowerCase().replace(/_/g, ' ')
   if (!r) return ''
   return r
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
}

const RANK_FILTER_ALL = 'all'

export default function TaxonomyPage() {
   const { resolvedTheme } = useTheme()
   const isDark = resolvedTheme === 'dark'

   const status = useTaxonomyTreeStore((s) => s.status)
   const error = useTaxonomyTreeStore((s) => s.error)
   const nestedTree = useTaxonomyTreeStore((s) => s.nestedTree)
   const byTaxid = useTaxonomyTreeStore((s) => s.byTaxid)
   const rowByTaxid = useTaxonomyTreeStore((s) => s.rowByTaxid)
   const fetchTree = useTaxonomyTreeStore((s) => s.fetchTree)

   const [rankFilter, setRankFilter] = useState<string>(RANK_FILTER_ALL)
   const [showLabels, setShowLabels] = useState(false)
   const [selectedTaxid, setSelectedTaxid] = useState<string | null>(null)
   const [organismItems, setOrganismItems] = useState<Record<string, unknown>[]>([])
   const [organismTotal, setOrganismTotal] = useState(0)
   const [organismLoading, setOrganismLoading] = useState(false)
   const [organismLoadingMore, setOrganismLoadingMore] = useState(false)
   const [organismError, setOrganismError] = useState<string | null>(null)
   const [downloadLoading, setDownloadLoading] = useState(false)

   const loadMoreInFlightRef = useRef(false)
   const listScrollRef = useRef<HTMLDivElement>(null)
   const loadMoreSentinelRef = useRef<HTMLDivElement>(null)

   useEffect(() => {
      void fetchTree()
   }, [fetchTree])

   const rankForPrune = rankFilter === RANK_FILTER_ALL ? null : rankFilter

   const hierarchy = useMemo(() => {
      if (!nestedTree) return null
      const filtered = getFilteredNestedRoot(nestedTree, null, rankForPrune)
      if (!filtered) return null
      return buildHierarchyFromNested(filtered, byTaxid)
   }, [nestedTree, byTaxid, rankForPrune])

   const branchLegend = useMemo(() => {
      if (!hierarchy) return []
      return branchLegendFromHierarchy(hierarchy, Boolean(isDark))
   }, [hierarchy, isDark])

   useEffect(() => {
      setSelectedTaxid(null)
   }, [rankFilter])

   const selectedRow = selectedTaxid ? byTaxid.get(selectedTaxid) : null
   const selectedNested = useMemo((): NestedTaxonNode | null => {
      if (!selectedTaxid || !nestedTree) return null
      return findSubtree(nestedTree, selectedTaxid)
   }, [nestedTree, selectedTaxid])

   const breadcrumbRows = useMemo(() => {
      if (!selectedTaxid) return []
      return pathFromRowMap(rowByTaxid, selectedTaxid)
   }, [rowByTaxid, selectedTaxid])

   const loadOrganisms = useCallback(
      async (offset: number, append: boolean) => {
         if (!selectedTaxid) return
         if (append) setOrganismLoadingMore(true)
         else setOrganismLoading(true)
         setOrganismError(null)
         try {
            const { data, total: t } = await fetchOrganisms({
               taxon_lineage: selectedTaxid,
               limit: PAGE_SIZE,
               offset,
            })
            if (append) {
               setOrganismItems((prev) => [...prev, ...data])
               setOrganismTotal(t)
            } else {
               setOrganismItems(data)
               setOrganismTotal(t)
            }
         } catch (e) {
            if (!append) {
               setOrganismItems([])
               setOrganismTotal(0)
            }
            setOrganismError(e instanceof Error ? e.message : 'Failed to load organisms')
         } finally {
            if (append) setOrganismLoadingMore(false)
            else setOrganismLoading(false)
         }
      },
      [selectedTaxid],
   )

   useEffect(() => {
      if (!selectedTaxid) {
         setOrganismItems([])
         setOrganismTotal(0)
         setOrganismError(null)
         return
      }
      void loadOrganisms(0, false)
   }, [selectedTaxid, loadOrganisms])

   const loadMoreOrganisms = useCallback(async () => {
      if (organismLoadingMore || organismLoading || loadMoreInFlightRef.current) return
      const offset = organismItems.length
      if (offset >= organismTotal) return
      loadMoreInFlightRef.current = true
      try {
         await loadOrganisms(offset, true)
      } finally {
         loadMoreInFlightRef.current = false
      }
   }, [
      loadOrganisms,
      organismItems.length,
      organismLoading,
      organismLoadingMore,
      organismTotal,
   ])

   const loadMoreOrganismsRef = useRef(loadMoreOrganisms)
   loadMoreOrganismsRef.current = loadMoreOrganisms

   useEffect(() => {
      const root = listScrollRef.current
      const target = loadMoreSentinelRef.current
      if (!root || !target) return

      const obs = new IntersectionObserver(
         (entries) => {
            if (!entries[0]?.isIntersecting) return
            void loadMoreOrganismsRef.current()
         },
         { root, rootMargin: '120px', threshold: 0 },
      )
      obs.observe(target)
      return () => obs.disconnect()
   }, [selectedTaxid, organismItems.length, organismTotal])

   const buildOrganismExportQuery = useCallback((): Record<string, string | number | undefined> => {
      if (!selectedTaxid) return {}
      return { taxon_lineage: selectedTaxid }
   }, [selectedTaxid])

   const onDownloadSpeciesTsv = useCallback(async () => {
      if (!selectedTaxid) return
      setDownloadLoading(true)
      try {
         const blob = await downloadOrganismsTsv(buildOrganismExportQuery(), [...SPECIES_EXPORT_FIELDS])
         const href = URL.createObjectURL(blob)
         const link = document.createElement('a')
         link.href = href
         const safeName = (selectedRow?.scientific_name || selectedTaxid).replace(/[^\w.-]+/g, '_')
         link.setAttribute('download', `${safeName}_organisms.tsv`)
         document.body.appendChild(link)
         link.click()
         document.body.removeChild(link)
         URL.revokeObjectURL(href)
      } catch (e) {
         setOrganismError(e instanceof Error ? e.message : 'Download failed')
      } finally {
         setDownloadLoading(false)
      }
   }, [buildOrganismExportQuery, selectedTaxid, selectedRow?.scientific_name])

   const rankColors: Record<string, string> = {
      Domain: 'bg-chart-1/20 text-chart-1',
      Kingdom: 'bg-chart-2/20 text-chart-2',
      Phylum: 'bg-chart-3/20 text-chart-3',
      Class: 'bg-chart-4/20 text-chart-4',
      Order: 'bg-chart-5/20 text-chart-5',
      Family: 'bg-primary/20 text-primary',
   }

   const loadingTree = status === 'loading' || status === 'idle'
   const treeError = status === 'error' ? error : null

   return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
         <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(240px,min(42vh,520px))_minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch">
            {/* Tree canvas — fills cell; controls/legend are HTML overlays (not part of canvas zoom). */}
            <div className="border-border relative flex min-h-0 flex-col border-b bg-card/50 lg:col-start-1 lg:row-start-1 lg:h-full lg:max-h-full lg:border-b-0 lg:border-r">
               <div className="relative w-full min-h-[240px] flex-1 lg:min-h-0">
                  <D3RadialTree
                     hierarchy={hierarchy}
                     loading={loadingTree}
                     error={treeError}
                     highlightTaxid={selectedTaxid}
                     showCanvasDomainLegend={false}
                     controlledShowLabels={showLabels}
                     layoutTransitionKey={rankFilter}
                     onNodeClick={({ taxid }) => setSelectedTaxid(taxid)}
                  />

                  <div className="pointer-events-none absolute inset-0 z-[1000]">
                     <div className="pointer-events-auto absolute top-4 left-4 max-w-[min(100%,24rem)]">
                        <div className="bg-card/95 border-border rounded-lg border p-3 shadow-sm backdrop-blur">
                           <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                              <TreePine className="text-primary h-4 w-4 shrink-0" />
                              Taxonomy Tree
                           </div>
                           <p className="text-muted-foreground mb-3 text-xs">
                              Click nodes to explore. Pinch or scroll to zoom the tree.
                           </p>
                           <div className="flex flex-col gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                 <span className="text-muted-foreground w-14 shrink-0 text-xs font-medium">
                                    Rank
                                 </span>
                                 <Select value={rankFilter} onValueChange={setRankFilter}>
                                    <SelectTrigger
                                       size="sm"
                                       className="h-8 w-[min(100%,200px)]"
                                       aria-label="Filter tree by rank"
                                    >
                                       <SelectValue placeholder="Rank" />
                                    </SelectTrigger>
                                    <SelectContent className="z-[1100]" position="popper">
                                       <SelectItem value={RANK_FILTER_ALL}>All ranks</SelectItem>
                                       {TREE_RANK_FILTER_OPTIONS.map((r) => (
                                          <SelectItem key={r} value={r}>
                                             {formatRankFilterLabel(r)}
                                          </SelectItem>
                                       ))}
                                    </SelectContent>
                                 </Select>
                              </div>
                              <div className="flex items-center gap-2">
                                 <Checkbox
                                    id="taxonomy-show-labels"
                                    checked={showLabels}
                                    onCheckedChange={(v) => setShowLabels(v === true)}
                                 />
                                 <Label
                                    htmlFor="taxonomy-show-labels"
                                    className="text-muted-foreground cursor-pointer text-xs font-normal leading-snug"
                                 >
                                    Show leaf labels
                                 </Label>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="pointer-events-auto absolute bottom-4 left-4 max-h-[min(40vh,320px)] w-[min(calc(100vw-2rem),280px)] overflow-y-auto rounded-lg border border-border bg-card/95 p-3 text-xs shadow-sm backdrop-blur lg:w-[min(320px,40%)]">
                        <div className="text-muted-foreground mb-2 text-[0.65rem] font-bold tracking-wide uppercase">
                           Branch colors
                        </div>
                        {branchLegend.length > 0 ? (
                           <div className="space-y-1.5">
                              {branchLegend.map((item) => (
                                 <div key={item.taxid} className="flex min-w-0 items-center gap-2">
                                    <span
                                       className="h-3 w-3 shrink-0 rounded-full shadow-inner ring-1 ring-black/10 dark:ring-white/15"
                                       style={{ backgroundColor: item.color }}
                                       aria-hidden
                                    />
                                    <span className="text-foreground truncate" title={item.name}>
                                       {item.name}
                                    </span>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <p className="text-muted-foreground">No branches to show</p>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            <aside className="bg-card flex min-h-0 flex-col overflow-hidden border-t border-border lg:col-start-2 lg:row-start-1 lg:h-full lg:max-h-full lg:min-h-0 lg:border-l lg:border-t-0">
               {selectedTaxid && selectedRow ? (
                  <>
                     <div className="border-border shrink-0 border-b p-4">
                        <div className="mb-3 flex items-center justify-between">
                           <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTaxid(null)}
                              className="text-muted-foreground"
                           >
                              <ArrowLeft className="mr-1 h-4 w-4" />
                              Clear selection
                           </Button>
                        </div>

                        <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-1 text-xs">
                           {breadcrumbRows.map((row, index) => (
                              <span key={row.taxid} className="flex items-center">
                                 {index > 0 && <ChevronRight className="mx-1 h-3 w-3" />}
                                 <button
                                    type="button"
                                    onClick={() => setSelectedTaxid(row.taxid)}
                                    className={cn(
                                       'hover:text-primary transition-colors',
                                       row.taxid === selectedTaxid && 'text-primary font-medium',
                                    )}
                                 >
                                    {row.name || row.taxid}
                                 </button>
                              </span>
                           ))}
                        </div>

                        <div className="flex items-start justify-between gap-3">
                           <div>
                              <h2 className="text-2xl font-bold">
                                 {(selectedRow.scientific_name || selectedTaxid).replace(/_/g, ' ')}
                              </h2>
                              <Badge
                                 className={cn('mt-2', rankBadgeClass(selectedRow.rank, rankColors))}
                              >
                                 {formatRankLabel(selectedRow.rank)}
                              </Badge>
                           </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                           <Card>
                              <CardContent className="flex items-center gap-3 p-3">
                                 <div className="bg-primary/10 rounded-md p-2">
                                    <Hash className="text-primary h-4 w-4" />
                                 </div>
                                 <div>
                                    <div className="text-lg font-semibold">
                                       {(selectedRow.organisms_count ?? 0).toLocaleString()}
                                    </div>
                                    <div className="text-muted-foreground text-xs">Organisms</div>
                                 </div>
                              </CardContent>
                           </Card>
                           <Card>
                              <CardContent className="flex items-center gap-3 p-3">
                                 <div className="bg-chart-2/10 rounded-md p-2">
                                    <Layers className="text-chart-2 h-4 w-4" />
                                 </div>
                                 <div>
                                    <div className="text-lg font-semibold">
                                       {selectedNested?.children?.length ?? 0}
                                    </div>
                                    <div className="text-muted-foreground text-xs">Sub-taxa</div>
                                 </div>
                              </CardContent>
                           </Card>
                        </div>

                        {selectedNested?.children && selectedNested.children.length > 0 ? (
                           <div className="mt-4">
                              <div className="mb-2 text-sm font-medium">Sub-taxa</div>
                              <div className="flex flex-wrap gap-1.5">
                                 {selectedNested.children.map((child) => {
                                    const cflat = byTaxid.get(child.taxid)
                                    const count = cflat?.organisms_count ?? child.leaves
                                    return (
                                       <Badge
                                          key={child.taxid}
                                          variant="outline"
                                          className="hover:bg-secondary cursor-pointer transition-colors"
                                          onClick={() => setSelectedTaxid(child.taxid)}
                                       >
                                          {child.name || child.taxid}
                                          <span className="text-muted-foreground ml-1">
                                             ({count.toLocaleString()})
                                          </span>
                                       </Badge>
                                    )
                                 })}
                              </div>
                           </div>
                        ) : null}
                     </div>

                     <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="border-border shrink-0 border-b px-4 pt-4 pb-3">
                           <div className="flex items-center justify-between gap-2">
                              <h3 className="text-sm font-medium">
                                 Organisms in{' '}
                                 {(selectedRow.scientific_name || selectedTaxid).replace(/_/g, ' ')}
                              </h3>
                              <Badge variant="secondary">{organismTotal.toLocaleString()}</Badge>
                           </div>
                        </div>

                        <div
                           ref={listScrollRef}
                           className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
                        >
                           {organismError ? (
                              <p className="text-destructive text-sm">{organismError}</p>
                           ) : organismLoading && organismItems.length === 0 ? (
                              <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                                 <Loader2 className="h-4 w-4 animate-spin" />
                                 Loading organisms…
                              </div>
                           ) : organismItems.length > 0 ? (
                              <>
                                 <div className="space-y-2">
                                    {organismItems.map((row, idx) => (
                                       <SpeciesCard
                                          key={String(row.taxid ?? row._id ?? idx)}
                                          organism={row}
                                          compact
                                       />
                                    ))}
                                 </div>
                                 {organismItems.length < organismTotal ? (
                                    <div
                                       ref={loadMoreSentinelRef}
                                       className="flex min-h-10 w-full flex-col items-center justify-center py-2"
                                       aria-hidden
                                    >
                                       {organismLoadingMore ? (
                                          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                                       ) : (
                                          <span className="text-muted-foreground/70 text-[10px]">
                                             Scroll for more
                                          </span>
                                       )}
                                    </div>
                                 ) : null}
                              </>
                           ) : (
                              <div className="text-muted-foreground py-8 text-center text-sm">
                                 <TreePine className="mx-auto mb-2 h-8 w-8 opacity-50" />
                                 <p>No organisms in this taxon in the catalog.</p>
                              </div>
                           )}
                        </div>

                        <div className="border-border bg-card shrink-0 space-y-1 border-t px-4 py-3">
                           <Button
                              variant="outline"
                              size="sm"
                              className="h-9 w-full gap-2"
                              disabled={
                                 !selectedTaxid ||
                                 organismLoading ||
                                 organismTotal === 0 ||
                                 downloadLoading
                              }
                              onClick={() => void onDownloadSpeciesTsv()}
                           >
                              {downloadLoading ? (
                                 <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                 <Download className="h-4 w-4" />
                              )}
                              Export species list (TSV)
                           </Button>
                           {organismItems.length > 0 && organismTotal > 0 ? (
                              <p className="text-muted-foreground text-center text-[10px]">
                                 Showing {organismItems.length.toLocaleString()} of{' '}
                                 {organismTotal.toLocaleString()}
                                 {organismItems.length < organismTotal
                                    ? ' · scroll the list to load more'
                                    : null}
                              </p>
                           ) : null}
                        </div>
                     </div>
                  </>
               ) : (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
                     <div className="bg-primary/10 mb-4 rounded-full p-4">
                        <TreePine className="text-primary h-8 w-8" />
                     </div>
                     <h3 className="mb-2 text-lg font-semibold">Select a Taxon</h3>
                     <p className="text-muted-foreground max-w-xs text-sm">
                        Click on any node in the radial tree to view details about that taxonomic group and
                        its organisms.
                     </p>
                  </div>
               )}
            </aside>
         </div>
      </div>
   )
}
