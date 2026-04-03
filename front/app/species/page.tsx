'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SpeciesExportSheet } from '@/components/species-export-sheet'
import { SpeciesCard } from '@/components/species-card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { fetchOrganisms } from '@/lib/api/organisms'
import { fetchFieldStats } from '@/lib/api/stats'
import { fetchTaxons } from '@/lib/api/taxons'
import {
   labelIucnThreatOption,
   sortIucnThreatStatEntries,
} from '@/lib/iucnCategory'
import { cn } from '@/lib/utils'
import {
   normalizeRankStats,
   rankGroupDisplayCount,
   rankGroupHasData,
   RANK_GROUP_TOGGLE_STYLES,
   SPECIES_RANK_GROUPS,
} from '@/lib/taxonRankFilter'
import { Check, ChevronDown, Download, Filter, Grid3X3, LayoutList, Loader2, Search, X } from 'lucide-react'

const PAGE_SIZE = 21
const TAXON_PAGE_SIZE = 50
/** Stats API aggregation path (Mongo dot path); query params use ``iucn_redlist__category``. */
const IUCN_STATS_FIELD = 'iucn_redlist.category'

type TaxonOption = {
   taxid: string
   name: string
   rank?: string
   /** Organisms in portal under this taxon (API: organisms_count, fallback leaves). */
   organismsCount?: number
}

type RankTaxonCache = {
   items: TaxonOption[]
   total: number
   nextOffset: number
   loading: boolean
   loadingMore: boolean
   initialized: boolean
}

function emptyRankTaxonCache(): RankTaxonCache {
   return {
      items: [],
      total: 0,
      nextOffset: 0,
      loading: false,
      loadingMore: false,
      initialized: false,
   }
}

function mapTaxonRow(row: Record<string, unknown>): TaxonOption {
   const taxid = String(row.taxid ?? '')
   const name = String(row.name ?? row.taxid ?? '')
   const rank = typeof row.rank === 'string' ? row.rank : undefined
   let organismsCount: number | undefined
   if (typeof row.organisms_count === 'number') organismsCount = row.organisms_count
   else if (typeof row.leaves === 'number') organismsCount = row.leaves
   return { taxid, name, rank, organismsCount }
}

type ViewMode = 'grid' | 'list'

export default function SpeciesListPage() {
   const [searchInput, setSearchInput] = useState('')
   const [debouncedSearch, setDebouncedSearch] = useState('')
   const [iucnThreatFilter, setIucnThreatFilter] = useState<string>('all')
   const [iucnThreatStats, setIucnThreatStats] = useState<Record<string, number> | null>(null)
   const [viewMode, setViewMode] = useState<ViewMode>('grid')
   const [exportSheetOpen, setExportSheetOpen] = useState(false)

   const [items, setItems] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(true)
   const [loadingMore, setLoadingMore] = useState(false)
   const [error, setError] = useState<string | null>(null)

   const [rankStats, setRankStats] = useState<Record<string, number> | null>(null)
   const [rankStatsLoading, setRankStatsLoading] = useState(true)
   /** Rank group id for the currently selected lineage taxon (for chips / highlight). */
   const [selectedTaxonRankId, setSelectedTaxonRankId] = useState<string | null>(null)
   const [selectedTaxonTaxid, setSelectedTaxonTaxid] = useState<string | null>(null)
   const [taxonByRank, setTaxonByRank] = useState<Record<string, RankTaxonCache>>({})
   const taxonByRankRef = useRef<Record<string, RankTaxonCache>>({})
   taxonByRankRef.current = taxonByRank
   const fetchSeqByRankRef = useRef<Record<string, number>>({})

   useEffect(() => {
      let cancelled = false
      setRankStatsLoading(true)
      void fetchFieldStats('taxons', 'rank', {})
         .then((raw) => {
            if (!cancelled) setRankStats(normalizeRankStats(raw))
         })
         .catch(() => {
            if (!cancelled) setRankStats({})
         })
         .finally(() => {
            if (!cancelled) setRankStatsLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [])

   const prevTaxonForIucnRef = useRef<string | null>(null)
   useEffect(() => {
      if (prevTaxonForIucnRef.current !== selectedTaxonTaxid) {
         prevTaxonForIucnRef.current = selectedTaxonTaxid
         setIucnThreatFilter('all')
      }
   }, [selectedTaxonTaxid])

   useEffect(() => {
      let cancelled = false
      const statsQuery: Record<string, string> = {}
      if (selectedTaxonTaxid) statsQuery.taxon_lineage = selectedTaxonTaxid
      void fetchFieldStats('organisms', IUCN_STATS_FIELD, statsQuery)
         .then((raw) => {
            if (!cancelled) setIucnThreatStats(raw)
         })
         .catch(() => {
            if (!cancelled) setIucnThreatStats({})
         })
      return () => {
         cancelled = true
      }
   }, [selectedTaxonTaxid])

   const iucnThreatSelectOptions = useMemo(
      () => sortIucnThreatStatEntries(Object.entries(iucnThreatStats ?? {})),
      [iucnThreatStats],
   )

   const visibleRankGroups = useMemo(() => {
      const stats = rankStats ?? {}
      return SPECIES_RANK_GROUPS.filter((g) => rankGroupHasData(g.id, stats))
   }, [rankStats])

   const fetchRankTaxonsFirstPage = useCallback((rankId: string) => {
      const def = SPECIES_RANK_GROUPS.find((g) => g.id === rankId)
      if (!def) return

      fetchSeqByRankRef.current[rankId] = (fetchSeqByRankRef.current[rankId] ?? 0) + 1
      const seq = fetchSeqByRankRef.current[rankId]

      setTaxonByRank((prev) => ({
         ...prev,
         [rankId]: {
            ...(prev[rankId] ?? emptyRankTaxonCache()),
            loading: true,
            loadingMore: false,
         },
      }))

      const params: Record<string, string | number> = {
         limit: TAXON_PAGE_SIZE,
         offset: 0,
         sort_column: 'organisms_count',
         sort_order: 'desc',
         [def.apiRankParam.key]: def.apiRankParam.value,
      }

      void fetchTaxons(params)
         .then((res) => {
            if (fetchSeqByRankRef.current[rankId] !== seq) return
            const rows = res.data.map((row) => mapTaxonRow(row as Record<string, unknown>))
            setTaxonByRank((prev) => ({
               ...prev,
               [rankId]: {
                  items: rows,
                  total: res.total,
                  nextOffset: rows.length,
                  loading: false,
                  loadingMore: false,
                  initialized: true,
               },
            }))
         })
         .catch(() => {
            if (fetchSeqByRankRef.current[rankId] !== seq) return
            setTaxonByRank((prev) => ({
               ...prev,
               [rankId]: {
                  ...(prev[rankId] ?? emptyRankTaxonCache()),
                  loading: false,
                  loadingMore: false,
                  initialized: true,
               },
            }))
         })
   }, [])

   const loadMoreRankTaxons = useCallback(async (rankId: string) => {
      const def = SPECIES_RANK_GROUPS.find((g) => g.id === rankId)
      if (!def) return

      const cache = taxonByRankRef.current[rankId] ?? emptyRankTaxonCache()
      if (cache.loading || cache.loadingMore || cache.items.length >= cache.total) return

      const offset = cache.nextOffset

      setTaxonByRank((prev) => ({
         ...prev,
         [rankId]: { ...(prev[rankId] ?? emptyRankTaxonCache()), loadingMore: true },
      }))

      try {
         const res = await fetchTaxons({
            limit: TAXON_PAGE_SIZE,
            offset,
            sort_column: 'organisms_count',
            sort_order: 'desc',
            [def.apiRankParam.key]: def.apiRankParam.value,
         })
         const rows = res.data.map((row) => mapTaxonRow(row as Record<string, unknown>))
         setTaxonByRank((prev) => {
            const cur = prev[rankId] ?? emptyRankTaxonCache()
            const seen = new Set(cur.items.map((t) => t.taxid))
            const merged = [...cur.items]
            for (const t of rows) {
               if (!seen.has(t.taxid)) {
                  seen.add(t.taxid)
                  merged.push(t)
               }
            }
            return {
               ...prev,
               [rankId]: {
                  ...cur,
                  items: merged,
                  total: res.total,
                  nextOffset: offset + rows.length,
                  loadingMore: false,
               },
            }
         })
      } catch {
         setTaxonByRank((prev) => ({
            ...prev,
            [rankId]: { ...(prev[rankId] ?? emptyRankTaxonCache()), loadingMore: false },
         }))
      }
   }, [])

   const onRankTaxonScroll = useCallback(
      (rankId: string, e: React.UIEvent<HTMLDivElement>) => {
         const el = e.currentTarget
         const threshold = 72
         if (el.scrollTop + el.clientHeight < el.scrollHeight - threshold) return
         void loadMoreRankTaxons(rankId)
      },
      [loadMoreRankTaxons],
   )

   const handleRankMenuOpenChange = useCallback(
      (rankId: string, open: boolean) => {
         if (!open) return
         const cur = taxonByRankRef.current[rankId] ?? emptyRankTaxonCache()
         if (!cur.initialized && !cur.loading) {
            fetchRankTaxonsFirstPage(rankId)
         }
      },
      [fetchRankTaxonsFirstPage],
   )

   useEffect(() => {
      const t = window.setTimeout(() => {
         setDebouncedSearch(searchInput.trim())
      }, 250)
      return () => window.clearTimeout(t)
   }, [searchInput])

   const queryBase = useMemo(() => {
      const q: Record<string, string | number> = {
         limit: PAGE_SIZE,
         offset: 0,
         sort_column: 'scientific_name',
         sort_order: 'asc',
      }
      if (debouncedSearch) q.filter = debouncedSearch
      if (selectedTaxonTaxid) q.taxon_lineage = selectedTaxonTaxid
      if (iucnThreatFilter !== 'all') q.iucn_redlist__category = iucnThreatFilter
      return q
   }, [debouncedSearch, selectedTaxonTaxid, iucnThreatFilter])

   /** Filters + sort for TSV export (no pagination). */
   const organismExportParams = useMemo(() => {
      const q: Record<string, string | number> = {
         sort_column: 'scientific_name',
         sort_order: 'asc',
      }
      if (debouncedSearch) q.filter = debouncedSearch
      if (selectedTaxonTaxid) q.taxon_lineage = selectedTaxonTaxid
      if (iucnThreatFilter !== 'all') q.iucn_redlist__category = iucnThreatFilter
      return q
   }, [debouncedSearch, selectedTaxonTaxid, iucnThreatFilter])

   useEffect(() => {
      let cancelled = false
      setLoading(true)
      setError(null)
      void fetchOrganisms(queryBase)
         .then((res) => {
            if (cancelled) return
            setItems(res.data)
            setTotal(res.total)
         })
         .catch((e: unknown) => {
            if (cancelled) return
            setError(e instanceof Error ? e.message : String(e))
            setItems([])
            setTotal(0)
         })
         .finally(() => {
            if (!cancelled) setLoading(false)
         })
      return () => {
         cancelled = true
      }
   }, [queryBase])

   const loadMore = useCallback(() => {
      if (items.length >= total || loadingMore || loading) return
      setLoadingMore(true)
      setError(null)
      void fetchOrganisms({ ...queryBase, offset: items.length })
         .then((res) => {
            setItems((prev) => [...prev, ...res.data])
            setTotal(res.total)
         })
         .catch((e: unknown) => {
            setError(e instanceof Error ? e.message : String(e))
         })
         .finally(() => setLoadingMore(false))
   }, [queryBase, items.length, total, loadingMore, loading])

   const clearFilters = () => {
      setSearchInput('')
      setDebouncedSearch('')
      setIucnThreatFilter('all')
      setSelectedTaxonTaxid(null)
      setSelectedTaxonRankId(null)
   }

   const activeFilterLabels: { id: string; label: string; clear: () => void }[] = []
   if (debouncedSearch) {
      activeFilterLabels.push({
         id: 'search',
         label: `Search: ${debouncedSearch}`,
         clear: () => {
            setSearchInput('')
            setDebouncedSearch('')
         },
      })
   }
   if (iucnThreatFilter !== 'all') {
      activeFilterLabels.push({
         id: 'iucn',
         label: `IUCN: ${labelIucnThreatOption(iucnThreatFilter)}`,
         clear: () => setIucnThreatFilter('all'),
      })
   }
   if (selectedTaxonTaxid && selectedTaxonRankId) {
      const labelName =
         taxonByRank[selectedTaxonRankId]?.items.find((t) => t.taxid === selectedTaxonTaxid)?.name ??
         selectedTaxonTaxid
      const rg = SPECIES_RANK_GROUPS.find((g) => g.id === selectedTaxonRankId)
      const rankLabel = rg?.label ?? 'Taxon'
      activeFilterLabels.push({
         id: 'taxon',
         label: `${rankLabel}: ${labelName}`,
         clear: () => {
            setSelectedTaxonTaxid(null)
            setSelectedTaxonRankId(null)
         },
      })
   }

   return (
      <div className="min-h-screen bg-background">
         <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
               <h1 className="text-3xl font-bold mb-2">Species Database</h1>
               <p className="text-muted-foreground">
                  Browse and search our comprehensive species database with detailed genomic data
               </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-3 sm:p-4 mb-6 space-y-4">
               <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
                  <div className="relative w-full lg:w-[min(100%,18rem)] lg:shrink-0">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                     <Input
                        placeholder="Search name, taxid, common name…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="h-9 pl-9"
                     />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                     {visibleRankGroups.map((g) => {
                        const count = rankGroupDisplayCount(g.id, rankStats ?? {})
                        const styles =
                           RANK_GROUP_TOGGLE_STYLES[g.id] ?? RANK_GROUP_TOGGLE_STYLES.phylum
                        const rankSelected = selectedTaxonRankId === g.id && !!selectedTaxonTaxid
                        const cache = taxonByRank[g.id] ?? emptyRankTaxonCache()
                        const taxonHasMore = cache.items.length < cache.total

                        return (
                           <DropdownMenu
                              key={g.id}
                              onOpenChange={(open) => handleRankMenuOpenChange(g.id, open)}
                           >
                              <DropdownMenuTrigger asChild>
                                 <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={rankStatsLoading}
                                    className={cn(
                                       'h-9 rounded-full border px-2.5 py-0 font-normal gap-1 max-w-full',
                                       rankSelected
                                          ? cn(
                                               'ring-2 ring-offset-2 ring-offset-background',
                                               styles.ring,
                                               styles.active,
                                            )
                                          : styles.inactive,
                                    )}
                                 >
                                    <span className="truncate text-xs sm:text-sm">{g.label}</span>
                                    <span
                                       className={cn(
                                          'tabular-nums rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs font-medium shrink-0',
                                          styles.badge,
                                       )}
                                    >
                                       {count.toLocaleString()}
                                    </span>
                                    <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                 align="start"
                                 className="w-[min(22rem,calc(100vw-2rem))] max-h-[min(70vh,22rem)] overflow-y-auto overscroll-contain p-1"
                                 onScroll={(e) => onRankTaxonScroll(g.id, e)}
                                 onCloseAutoFocus={(e) => e.preventDefault()}
                              >
                                 <DropdownMenuItem
                                    className="text-muted-foreground"
                                    onSelect={() => {
                                       setSelectedTaxonTaxid(null)
                                       setSelectedTaxonRankId(null)
                                    }}
                                 >
                                    Clear lineage filter
                                 </DropdownMenuItem>
                                 {cache.loading && cache.items.length === 0 ? (
                                    <div className="flex justify-center py-8 text-muted-foreground pointer-events-none">
                                       <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading taxa" />
                                    </div>
                                 ) : null}
                                 {!cache.loading && cache.initialized && cache.items.length === 0 ? (
                                    <p className="px-2 py-4 text-center text-sm text-muted-foreground pointer-events-none">
                                       No taxa in this rank
                                    </p>
                                 ) : null}
                                 {cache.items.map((t) => {
                                    const sel =
                                       selectedTaxonTaxid === t.taxid && selectedTaxonRankId === g.id
                                    return (
                                       <DropdownMenuItem
                                          key={t.taxid}
                                          className="cursor-pointer gap-2"
                                          onSelect={() => {
                                             setSelectedTaxonTaxid(t.taxid)
                                             setSelectedTaxonRankId(g.id)
                                          }}
                                       >
                                          <Check
                                             className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')}
                                          />
                                          <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                                          <span
                                             className="shrink-0 tabular-nums text-xs text-muted-foreground"
                                             title="Organisms in portal"
                                          >
                                             {t.organismsCount != null && t.organismsCount > 0
                                                ? t.organismsCount.toLocaleString()
                                                : '—'}
                                          </span>
                                       </DropdownMenuItem>
                                    )
                                 })}
                                 {cache.loadingMore ? (
                                    <div className="flex justify-center py-2 pointer-events-none">
                                       <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                 ) : null}
                                 {!taxonHasMore &&
                                    cache.items.length > 0 &&
                                    !cache.loading &&
                                    !cache.loadingMore ? (
                                    <p className="px-2 py-1.5 text-center text-[11px] text-muted-foreground pointer-events-none">
                                       End of list
                                    </p>
                                 ) : null}
                              </DropdownMenuContent>
                           </DropdownMenu>
                        )
                     })}
                  </div>

                  <div className="w-full sm:w-auto sm:min-w-[12rem] lg:shrink-0">
                     <Select value={iucnThreatFilter} onValueChange={setIucnThreatFilter}>
                        <SelectTrigger className="h-9 w-full">
                           <SelectValue placeholder="IUCN threat" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="all">All IUCN categories</SelectItem>
                           {iucnThreatSelectOptions.map(([code, count]) => (
                              <SelectItem key={code} value={code}>
                                 <span className="flex w-full min-w-0 items-center justify-between gap-2">
                                    <span className="truncate">{labelIucnThreatOption(code)}</span>
                                    <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                                       {count.toLocaleString()}
                                    </span>
                                 </span>
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>

                  <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     className="h-9 shrink-0 gap-1.5 self-start lg:self-center"
                     onClick={() => setExportSheetOpen(true)}
                  >
                     <Download className="h-4 w-4" />
                     Export TSV
                  </Button>
               </div>

               <SpeciesExportSheet
                  open={exportSheetOpen}
                  onOpenChange={setExportSheetOpen}
                  exportParams={organismExportParams}
                  totalCount={total}
               />

               {activeFilterLabels.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
                     <span className="text-sm text-muted-foreground">Active filters:</span>
                     {activeFilterLabels.map((chip) => (
                        <Badge key={chip.id} variant="secondary" className="gap-1">
                           {chip.label}
                           <X className="h-3 w-3 cursor-pointer" onClick={chip.clear} />
                        </Badge>
                     ))}
                     <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear all
                     </Button>
                  </div>
               )}
            </div>

            {error && (
               <p className="text-sm text-destructive mb-4" role="alert">
                  {error}
               </p>
            )}

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
               <p className="text-sm text-muted-foreground">
                  {loading ? (
                     'Loading…'
                  ) : (
                     <>
                        Showing {items.length.toLocaleString()} of {total.toLocaleString()} species
                     </>
                  )}
               </p>
               <div className="flex h-9 w-fit shrink-0 rounded-md border border-input shadow-xs">
                  <Button
                     type="button"
                     variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                     size="icon"
                     onClick={() => setViewMode('grid')}
                     className="h-9 w-9 rounded-r-none border-0 shadow-none"
                     aria-pressed={viewMode === 'grid'}
                     aria-label="Grid view"
                  >
                     <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                     type="button"
                     variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                     size="icon"
                     onClick={() => setViewMode('list')}
                     className="h-9 w-9 rounded-l-none border-0 border-l border-border shadow-none"
                     aria-pressed={viewMode === 'list'}
                     aria-label="List view"
                  >
                     <LayoutList className="h-4 w-4" />
                  </Button>
               </div>
            </div>

            {loading && items.length === 0 ? (
               <div className="flex justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-10 w-10 animate-spin" aria-label="Loading" />
               </div>
            ) : items.length > 0 ? (
               <>
                  <div
                     className={
                        viewMode === 'grid'
                           ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'
                           : 'space-y-3'
                     }
                  >
                     {items.map((row, idx) => {
                        const id = row.taxid != null ? String(row.taxid) : `row-${idx}`
                        return (
                           <SpeciesCard key={id} organism={row} compact={viewMode === 'list'} />
                        )
                     })}
                  </div>
                  {items.length < total && (
                     <div className="mt-8 flex justify-center pb-8">
                        <Button type="button" variant="outline" onClick={loadMore} disabled={loadingMore}>
                           {loadingMore ? (
                              <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 Loading…
                              </>
                           ) : (
                              'Load more'
                           )}
                        </Button>
                     </div>
                  )}
               </>
            ) : (
               <div className="text-center py-16 text-muted-foreground">
                  <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No species found</h3>
                  <p className="text-sm">Try adjusting your search or filters</p>
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                     Clear all filters
                  </Button>
               </div>
            )}
         </div>
      </div>
   )
}
