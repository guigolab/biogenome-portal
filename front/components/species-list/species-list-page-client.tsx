'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react'
import { SpeciesExportSheet } from '@/components/species-export-sheet'
import { SpeciesCard } from '@/components/species-card'
import { SpeciesListResultsBar, type ViewMode } from '@/components/species-list/species-list-results-bar'
import { SpeciesListToolbar } from '@/components/species-list/species-list-toolbar'
import { SpeciesRankFilterTrigger } from '@/components/species-list/species-rank-filter-trigger'
import {
   emptyRankTaxonCache,
   mapTaxonRow,
   type RankTaxonCache,
} from '@/components/species-list/types'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/locale-context'
import { fetchOrganisms } from '@/lib/api/organisms'
import { fetchFieldStats } from '@/lib/api/stats'
import { fetchTaxons } from '@/lib/api/taxons'
import {
   IUCN_LABELS,
   IUCN_STATS_NO_ENTRY,
   iucnFieldStatsOnlyNoEntry,
   sortIucnThreatStatEntries,
} from '@/lib/iucnCategory'
import { speciesSortToApi, type SpeciesSortMode } from '@/lib/speciesListSort'
import {
   normalizeRankStats,
   rankGroupDisplayCount,
   rankGroupHasData,
   SPECIES_RANK_GROUPS,
} from '@/lib/taxonRankFilter'
import { navRouteIcons } from '@/lib/portal'
import { Filter, Loader2 } from 'lucide-react'

const PAGE_SIZE = 21
const TAXON_PAGE_SIZE = 50
const IUCN_STATS_FIELD = 'iucn_redlist.category'

export function SpeciesListPageClient() {
   const { t } = useLocale()
   const labelIucnThreatOption = useCallback(
      (key: string): string => {
         if (key === IUCN_STATS_NO_ENTRY) return t('iucn.noAssessment')
         const full = IUCN_LABELS[key]
         return full ? `${key} - ${t(`iucn.labels.${key}`)}` : key
      },
      [t],
   )

   const SpeciesPageIcon = navRouteIcons.species
   const [searchInput, setSearchInput] = useState('')
   const [debouncedSearch, setDebouncedSearch] = useState('')
   const [iucnThreatFilter, setIucnThreatFilter] = useState<string>('all')
   const [iucnThreatStats, setIucnThreatStats] = useState<Record<string, number> | null>(null)
   const [viewMode, setViewMode] = useState<ViewMode>('grid')
   const [sortMode, setSortMode] = useState<SpeciesSortMode>('alpha')
   const [exportSheetOpen, setExportSheetOpen] = useState(false)

   const [items, setItems] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(true)
   const [loadingMore, setLoadingMore] = useState(false)
   const [error, setError] = useState<string | null>(null)

   const [rankStats, setRankStats] = useState<Record<string, number> | null>(null)
   const [rankStatsLoading, setRankStatsLoading] = useState(true)
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

   const iucnFilterVisible = !iucnFieldStatsOnlyNoEntry(iucnThreatStats)

   const effectiveIucnThreatFilter = iucnFilterVisible ? iucnThreatFilter : 'all'

   useEffect(() => {
      if (!iucnFilterVisible && iucnThreatFilter !== 'all') {
         setIucnThreatFilter('all')
      }
   }, [iucnFilterVisible, iucnThreatFilter])

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
      (rankId: string, e: UIEvent<HTMLDivElement>) => {
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

   const sortApi = useMemo(() => speciesSortToApi(sortMode), [sortMode])

   const queryBase = useMemo(() => {
      const q: Record<string, string | number> = {
         limit: PAGE_SIZE,
         offset: 0,
         sort_column: sortApi.sort_column,
         sort_order: sortApi.sort_order,
      }
      if (debouncedSearch) q.filter = debouncedSearch
      if (selectedTaxonTaxid) q.taxon_lineage = selectedTaxonTaxid
      if (effectiveIucnThreatFilter !== 'all') q.iucn_redlist__category = effectiveIucnThreatFilter
      return q
   }, [debouncedSearch, selectedTaxonTaxid, effectiveIucnThreatFilter, sortApi])

   const organismExportParams = useMemo(() => {
      const q: Record<string, string | number> = {
         sort_column: sortApi.sort_column,
         sort_order: sortApi.sort_order,
      }
      if (debouncedSearch) q.filter = debouncedSearch
      if (selectedTaxonTaxid) q.taxon_lineage = selectedTaxonTaxid
      if (effectiveIucnThreatFilter !== 'all') q.iucn_redlist__category = effectiveIucnThreatFilter
      return q
   }, [debouncedSearch, selectedTaxonTaxid, effectiveIucnThreatFilter, sortApi])

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

   const clearFilters = useCallback(() => {
      setSearchInput('')
      setDebouncedSearch('')
      setIucnThreatFilter('all')
      setSelectedTaxonTaxid(null)
      setSelectedTaxonRankId(null)
   }, [])

   const clearLineage = useCallback(() => {
      setSelectedTaxonTaxid(null)
      setSelectedTaxonRankId(null)
   }, [])

   const filtersActive = Boolean(
      debouncedSearch || selectedTaxonTaxid || effectiveIucnThreatFilter !== 'all',
   )

   const activeFilterChips = useMemo(() => {
      const chips: {
         id: string
         label: string
         clear: () => void
         removeAriaLabel: string
      }[] = []
      if (debouncedSearch) {
         chips.push({
            id: 'search',
            label: `${t('speciesList.chipSearch')}: ${debouncedSearch}`,
            removeAriaLabel: t('speciesList.removeSearchFilter'),
            clear: () => {
               setSearchInput('')
               setDebouncedSearch('')
            },
         })
      }
      if (effectiveIucnThreatFilter !== 'all') {
         chips.push({
            id: 'iucn',
            label: `IUCN: ${labelIucnThreatOption(effectiveIucnThreatFilter)}`,
            removeAriaLabel: t('speciesList.removeIucnFilter'),
            clear: () => setIucnThreatFilter('all'),
         })
      }
      if (selectedTaxonTaxid && selectedTaxonRankId) {
         const labelName =
            taxonByRank[selectedTaxonRankId]?.items.find((t) => t.taxid === selectedTaxonTaxid)?.name ??
            selectedTaxonTaxid
         const rg = SPECIES_RANK_GROUPS.find((g) => g.id === selectedTaxonRankId)
         const rankLabel = rg?.label ?? t('speciesList.taxon')
         chips.push({
            id: 'taxon',
            label: `${rankLabel}: ${labelName}`,
            removeAriaLabel: `${t('speciesList.removeFilter')} ${rankLabel}`,
            clear: clearLineage,
         })
      }
      return chips
   }, [
      debouncedSearch,
      effectiveIucnThreatFilter,
      selectedTaxonTaxid,
      selectedTaxonRankId,
      taxonByRank,
      clearLineage,
      t,
   ])

   const rankFiltersSlot = useMemo(
      () =>
         visibleRankGroups.map((g) => {
            const count = rankGroupDisplayCount(g.id, rankStats ?? {})
            const rankSelected = selectedTaxonRankId === g.id && !!selectedTaxonTaxid
            const selectedTaxonName = rankSelected
               ? (taxonByRank[g.id]?.items.find((t) => t.taxid === selectedTaxonTaxid)?.name ??
                    selectedTaxonTaxid ??
                    null)
               : null
            const cache = taxonByRank[g.id] ?? emptyRankTaxonCache()
            return (
               <SpeciesRankFilterTrigger
                  key={g.id}
                  group={g}
                  rankCount={count}
                  rankStatsLoading={rankStatsLoading}
                  rankSelected={rankSelected}
                  selectedTaxonName={selectedTaxonName}
                  cache={cache}
                  selectedTaxonTaxid={selectedTaxonTaxid}
                  selectedTaxonRankId={selectedTaxonRankId}
                  onSelectTaxon={(taxid, rankId) => {
                     setSelectedTaxonTaxid(taxid)
                     setSelectedTaxonRankId(rankId)
                  }}
                  onClearLineage={clearLineage}
                  onMenuOpenChange={(open) => handleRankMenuOpenChange(g.id, open)}
                  onContentScroll={(e) => onRankTaxonScroll(g.id, e)}
               />
            )
         }),
      [
         visibleRankGroups,
         rankStats,
         rankStatsLoading,
         selectedTaxonRankId,
         selectedTaxonTaxid,
         taxonByRank,
         clearLineage,
         handleRankMenuOpenChange,
         onRankTaxonScroll,
      ],
   )

   return (
      <div className="min-h-screen bg-background">
         <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
               <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
                  <SpeciesPageIcon className="h-8 w-8 shrink-0 text-primary" aria-hidden />
                  {t('home.speciesFeature.title')}
               </h1>
               <p className="text-muted-foreground">{t('home.speciesFeature.description')}</p>
            </div>

            <SpeciesListToolbar
               searchInput={searchInput}
               onSearchChange={setSearchInput}
               filtersActive={filtersActive}
               onClearAllFilters={clearFilters}
               iucnFilterVisible={iucnFilterVisible}
               iucnThreatFilter={iucnThreatFilter}
               onIucnChange={setIucnThreatFilter}
               iucnOptions={iucnThreatSelectOptions}
               labelIucn={labelIucnThreatOption}
               activeFilterChips={activeFilterChips}
               rankFiltersSlot={rankFiltersSlot}
            />

            <SpeciesExportSheet
               open={exportSheetOpen}
               onOpenChange={setExportSheetOpen}
               exportParams={organismExportParams}
               totalCount={total}
            />

            {error ? (
               <p className="text-sm text-destructive mb-4" role="alert">
                  {error}
               </p>
            ) : null}

            <SpeciesListResultsBar
               loading={loading}
               itemsLength={items.length}
               total={total}
               filtersActive={filtersActive}
               sortMode={sortMode}
               onSortModeChange={setSortMode}
               viewMode={viewMode}
               onViewModeChange={setViewMode}
               onExportClick={() => setExportSheetOpen(true)}
            />

            {loading && items.length === 0 ? (
               <div className="flex justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-10 w-10 animate-spin" aria-label={t('common.loading')} />
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
                           <SpeciesCard
                              key={id}
                              organism={row}
                              compact={viewMode === 'list'}
                              lineageMode={viewMode === 'list' ? 'full' : 'summary'}
                           />
                        )
                     })}
                  </div>
                  {items.length < total ? (
                     <div className="mt-8 flex justify-center pb-8">
                        <Button type="button" variant="outline" onClick={loadMore} disabled={loadingMore}>
                           {loadingMore ? (
                              <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 {t('common.loading')}
                              </>
                           ) : (
                              t('common.loadMore')
                           )}
                        </Button>
                     </div>
                  ) : null}
               </>
            ) : (
               <div className="text-center py-16 text-muted-foreground">
                  <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" aria-hidden />
                  <h3 className="text-lg font-medium mb-2">{t('speciesList.noSpeciesFound')}</h3>
                  <p className="text-sm">{t('speciesList.tryAdjustingSearch')}</p>
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                     {t('speciesList.clearAllFilters')}
                  </Button>
               </div>
            )}
         </div>
      </div>
   )
}
